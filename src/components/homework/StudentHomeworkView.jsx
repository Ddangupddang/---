// src/components/homework/StudentHomeworkView.jsx
// 학생: 한 종류(내신/정시) 이번 주(월~토) 요일별 과제 제출·결과.
import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import ChoiceGrid from '../ChoiceGrid'
import SolutionViewer from './SolutionViewer'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import Alert from '../ui/Alert'
import { gradeHomework } from '../../utils/homework'
import { checkSummary } from '../../utils/homeworkCheck'
import { matchesStudent, dayStatus } from '../../utils/homeworkSelect'
import { mondayOf } from '../../utils/homeworkWeek'
import { WEEKDAY_LABELS, CATEGORY_LABELS } from '../../constants/homework'

const BADGE = {
  none: { label: '미제출', tone: 'neutral' },
  done: { label: '제출완료', tone: 'navy' },
  late: { label: '지각제출', tone: 'danger' },
}

export default function StudentHomeworkView({ category }) {
  const { user } = useAuth()
  const {
    students, homeworkSets, homeworkDays, homeworkQuestions,
    homeworkSubmissions, upsertHomeworkSubmission,
    homeworkChecks = [], addHomeworkCheck,
  } = useData()
  const [openDayId, setOpenDayId] = useState(null)
  const [answers, setAnswers] = useState({})
  const [submitting, setSubmitting] = useState(false)  // 제출 요청이 오가는 중
  const [submitError, setSubmitError] = useState('')
  // 확인 결과 — 눌렀을 때만 채워진다. 요일을 닫으면 지운다.
  const [checkResult, setCheckResult] = useState(null)  // { correctCount, total, wrongNumbers }
  const [checking, setChecking] = useState(false)

  const me = students.find((s) => s.id === user.studentId)
  const today = new Date().toISOString().slice(0, 10)
  const thisWeek = mondayOf(today)

  // 정시 레벨 미배정 안내
  if (category === 'jeongsi' && (!me || me.jeongsiLevel == null)) {
    return <p className="text-center text-ink-faint py-12">정시 레벨이 배정되지 않았습니다. 선생님께 문의하세요.</p>
  }
  // 내신 과제는 반 단위로 나간다 — 반이 없으면 받을 과제가 없다.
  // 빈 화면만 보이면 과제가 없는 건지 내 계정 문제인지 알 수 없다.
  if (category === 'naesin' && me && me.classId == null) {
    return <p className="text-center text-ink-faint py-12">반이 배정되지 않았습니다. 선생님께 문의하세요.</p>
  }
  if (!me) return <p className="text-center text-ink-faint py-12">학생 정보를 찾을 수 없습니다.</p>

  // 이번 주 + 종류 + 내 그룹에 맞는 세트 → 요일들
  const mySet = homeworkSets.find(
    (s) => s.category === category && s.weekStart === thisWeek && matchesStudent(s, me)
  )
  const days = mySet
    ? homeworkDays.filter((d) => d.setId === mySet.id).sort((a, b) => a.weekday - b.weekday)
    : []

  const subOf = (dayId) => homeworkSubmissions.find((s) => s.dayId === dayId && s.studentId === me.id)
  // 같은 번호가 두 번 들어오면(불러오는 중 겹침) 문항 수가 부풀어 점수가 낮아진다.
  // 번호 하나당 하나만 남긴다.
  const questionsOf = (dayId) => {
    const byNumber = new Map()
    for (const q of homeworkQuestions) {
      if (q.dayId === dayId && !byNumber.has(q.number)) byNumber.set(q.number, q)
    }
    return [...byNumber.values()].sort((a, b) => a.number - b.number)
  }

  // ── 특정 요일 열기(제출/결과) ──
  if (openDayId != null) {
    const day = days.find((d) => d.id === openDayId)
    if (!day) { setOpenDayId(null); return null }
    const qs = questionsOf(day.id)
    const sub = subOf(day.id)
    const beforeDue = today <= day.date
    // 출제할 때 정해둔 문항 수와 지금 불러온 문항 수가 다르면 자료가 덜 온 것이다.
    // 이대로 제출하면 못 받은 문항이 통째로 오답이 되어 점수가 폭락한다.
    // 조용히 넘어가는 대신 제출을 막고 새로고침을 안내한다.
    const loadedAll = qs.length === day.questionCount

    // 결과 보기 — 한 번 제출하면 수정 없이 결과·해설만 본다
    if (sub) {
      const valueMap = Object.fromEntries(sub.answers.map((a) => [a.number, a.answer]))
      const answerKey = Object.fromEntries(qs.map((q) => [q.number, q.answer]))
      const { correctCount, total } = gradeHomework(qs, sub.answers)
      return (
        <div>
          <button onClick={() => setOpenDayId(null)} className="text-sm text-ink-mute mb-3">← 요일 목록</button>
          <h2 className="text-lg font-bold text-ink mb-1">{WEEKDAY_LABELS[day.weekday]}요일 과제 — 결과</h2>
          <div className="bg-ink text-white rounded p-6 text-center my-3">
            <p className="text-sm text-white/60 mb-1">정답</p>
            <p className="text-4xl font-bold">{correctCount}<span className="text-2xl text-white/50"> / {total}</span></p>
          </div>
          <ChoiceGrid numbers={qs.map((q) => q.number)} mode="result" values={valueMap} answerKey={answerKey} onChange={() => {}} />
          <SolutionViewer videoUrl={day.daySolutionVideoUrl} fileUrl={day.daySolutionFileUrl} label="요일 해설" />
          {qs.filter((q) => q.solutionVideoUrl || q.solutionFileUrl).map((q) => (
            <SolutionViewer key={q.id} videoUrl={q.solutionVideoUrl} fileUrl={q.solutionFileUrl} label={`${q.number}번 해설`} />
          ))}
        </div>
      )
    }

    // 답 입력(신규 제출 또는 수정)
    // 선지를 다 끄면 값이 빈 문자열로 남는다 — 키가 있다고 입력된 것으로 세면 안 된다
    const answeredNum = Object.values(answers).filter(Boolean).length
    const allAnswered = answeredNum === qs.length && qs.length > 0
    // 이 요일을 이미 확인했나 — 확인은 요일당 한 번뿐이다
    const checkedAlready = homeworkChecks.some((c) => c.dayId === day.id && c.studentId === me.id)
    const canCheck = allAnswered && !checkedAlready && !checking && loadedAll

    async function handleCheck() {
      if (!canCheck) return
      setChecking(true)
      setSubmitError('')
      const payload = qs.map((q) => ({ number: q.number, answer: answers[q.number] }))
      const saved = await addHomeworkCheck({ dayId: day.id, studentId: me.id, answers: payload })
      setChecking(false)
      // 기록에 실패하면 확인 결과도 보여주지 않는다.
      // 보여주고 기록이 없으면 새로고침으로 몇 번이든 다시 확인할 수 있다.
      if (!saved) {
        setSubmitError('확인에 실패했습니다. 잠시 후 다시 시도해 주세요.')
        return
      }
      setCheckResult(checkSummary(qs, payload))
    }

    async function handleSubmit() {
      // 제출은 한 번뿐이라 중복 클릭도 막아야 한다
      if (!allAnswered || submitting || !loadedAll) return
      setSubmitting(true)
      setSubmitError('')
      const payload = qs.map((q) => ({ number: q.number, answer: answers[q.number] }))
      const saved = await upsertHomeworkSubmission({ dayId: day.id, studentId: me.id, answers: payload })
      setSubmitting(false)
      // 실패했는데 답을 지우면 처음부터 다시 풀어야 한다 → 답을 남기고 알린다
      if (!saved) {
        setSubmitError('제출에 실패했습니다. 입력한 답은 그대로 두었으니 다시 시도해 주세요.')
        return
      }
      setAnswers({})
      setCheckResult(null)
    }
    return (
      <div>
        <button onClick={() => { setOpenDayId(null); setAnswers({}); setCheckResult(null) }} className="text-sm text-ink-mute mb-3">← 요일 목록</button>
        <h2 className="text-lg font-bold text-ink mb-1">{WEEKDAY_LABELS[day.weekday]}요일 과제</h2>
        <p className="text-sm text-ink-mute mb-1">{qs.length}문항 · 마감 {day.date}</p>
        {!beforeDue && <p className="text-xs text-danger mb-3">마감이 지났습니다. 지금 제출하면 지각으로 표시됩니다.</p>}
        <div className="flex justify-between items-center my-2">
          <span className="text-sm font-medium text-ink-soft">답안 입력</span>
          <span className="text-xs text-ink-faint">{answeredNum}/{qs.length} 입력됨</span>
        </div>
        {checkResult && (
          <div className="bg-ink text-white rounded p-4 text-center my-3">
            <p className="text-sm text-white/60 mb-1">확인 결과</p>
            <p data-testid="check-score" className="text-3xl font-bold">
              {checkResult.correctCount}<span className="text-xl text-white/50"> / {checkResult.total}</span>
            </p>
            {checkResult.wrongNumbers.length > 0 && (
              <p className="text-xs text-white/70 mt-2">
                {checkResult.wrongNumbers.join(', ')}번을 다시 보세요. 정답은 제출한 뒤에 공개됩니다.
              </p>
            )}
          </div>
        )}

        <ChoiceGrid
          numbers={qs.map((q) => q.number)}
          values={answers}
          mode={checkResult ? 'check' : 'input'}
          wrong={checkResult?.wrongNumbers ?? []}
          onChange={(number, choice) => setAnswers((prev) => ({ ...prev, [number]: choice }))}
        />
        {!loadedAll && (
          <Alert tone="danger" className="mt-3">
            과제를 다 불러오지 못했습니다 ({qs.length}/{day.questionCount}문항).
            새로고침한 뒤 다시 열어 주세요. 이대로 내면 점수가 잘못 나옵니다.
          </Alert>
        )}
        {submitError && (
          <Alert tone="danger" className="mt-3">{submitError}</Alert>
        )}
        <Alert tone={checkResult ? 'info' : 'danger'} className="mt-3">
          {checkResult
            ? '틀린 문항을 고쳐 제출하세요. 확인은 한 번뿐이라 다시 눌러도 채점되지 않습니다.'
            : '확인은 한 번만 할 수 있습니다. 제출한 뒤에는 답을 수정할 수 없습니다.'}
        </Alert>
        <div className="flex gap-2 mt-3">
          {!checkedAlready && (
            <Button variant="ghost" onClick={handleCheck} disabled={!canCheck} className="flex-1">
              {checking ? '확인 중...' : '확인하기'}
            </Button>
          )}
          <Button variant="primary" onClick={handleSubmit}
            disabled={!allAnswered || submitting || !loadedAll} className="flex-1">
            {submitting ? '제출 중...' : '제출하기'}
          </Button>
        </div>
      </div>
    )
  }

  // ── 요일 목록 ──
  if (!mySet || days.length === 0) {
    return <p className="text-center text-ink-faint py-12">이번 주 {CATEGORY_LABELS[category]}가 없습니다.</p>
  }
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-ink-mute">{mySet.title}</p>
      {days.map((day) => {
        const st = dayStatus(day, subOf(day.id), today)
        const badge = BADGE[st]
        return (
          <div key={day.id}
            onClick={() => { setAnswers({}); setSubmitError(''); setCheckResult(null); setOpenDayId(day.id) }}
            className="bg-surface border border-line rounded p-4 cursor-pointer flex justify-between items-center">
            <div>
              <p className="font-semibold text-ink">{WEEKDAY_LABELS[day.weekday]}요일 과제</p>
              <p className="text-xs text-ink-faint mt-1">{day.questionCount}문항 · 마감 {day.date}</p>
            </div>
            <Badge tone={badge.tone}>{badge.label}</Badge>
          </div>
        )
      })}
    </div>
  )
}
