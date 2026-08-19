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
  } = useData()
  const [openDayId, setOpenDayId] = useState(null)
  const [answers, setAnswers] = useState({})
  const [submitting, setSubmitting] = useState(false)  // 제출 요청이 오가는 중
  const [submitError, setSubmitError] = useState('')

  const me = students.find((s) => s.id === user.studentId)
  const today = new Date().toISOString().slice(0, 10)
  const thisWeek = mondayOf(today)

  // 정시 레벨 미배정 안내
  if (category === 'jeongsi' && (!me || me.jeongsiLevel == null)) {
    return <p className="text-center text-ink-faint py-12">정시 레벨이 배정되지 않았습니다. 선생님께 문의하세요.</p>
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
  const questionsOf = (dayId) =>
    homeworkQuestions.filter((q) => q.dayId === dayId).sort((a, b) => a.number - b.number)

  // ── 특정 요일 열기(제출/결과) ──
  if (openDayId != null) {
    const day = days.find((d) => d.id === openDayId)
    if (!day) { setOpenDayId(null); return null }
    const qs = questionsOf(day.id)
    const sub = subOf(day.id)
    const beforeDue = today <= day.date

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
          <ChoiceGrid count={qs.length} mode="result" values={valueMap} answerKey={answerKey} onChange={() => {}} />
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
    async function handleSubmit() {
      // 제출은 한 번뿐이라 중복 클릭도 막아야 한다
      if (!allAnswered || submitting) return
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
    }
    return (
      <div>
        <button onClick={() => { setOpenDayId(null); setAnswers({}) }} className="text-sm text-ink-mute mb-3">← 요일 목록</button>
        <h2 className="text-lg font-bold text-ink mb-1">{WEEKDAY_LABELS[day.weekday]}요일 과제</h2>
        <p className="text-sm text-ink-mute mb-1">{qs.length}문항 · 마감 {day.date}</p>
        {!beforeDue && <p className="text-xs text-danger mb-3">마감이 지났습니다. 지금 제출하면 지각으로 표시됩니다.</p>}
        <div className="flex justify-between items-center my-2">
          <span className="text-sm font-medium text-ink-soft">답안 입력</span>
          <span className="text-xs text-ink-faint">{answeredNum}/{qs.length} 입력됨</span>
        </div>
        <ChoiceGrid count={qs.length} values={answers} mode="input"
          onChange={(number, choice) => setAnswers((prev) => ({ ...prev, [number]: choice }))} />
        {submitError && (
          <Alert tone="danger" className="mt-3">{submitError}</Alert>
        )}
        <Alert tone="danger" className="mt-3">
          제출한 뒤에는 답을 수정할 수 없습니다. 답을 다시 확인하고 제출하세요.
        </Alert>
        <Button variant="primary" onClick={handleSubmit} disabled={!allAnswered || submitting} className="w-full mt-3">
          {submitting ? '제출 중...' : '제출하기'}
        </Button>
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
            onClick={() => { setAnswers({}); setSubmitError(''); setOpenDayId(day.id) }}
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
