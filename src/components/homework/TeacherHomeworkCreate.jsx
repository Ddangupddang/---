// src/components/homework/TeacherHomeworkCreate.jsx
// 교사: 한 종류(내신/정시) 주간 세트(월~토)를 한 번에 출제.
// editSet을 받으면 그 세트를 불러와 수정하는 화면이 된다(입력 항목이 출제와 같아 화면을 공유한다).
// copySet을 받으면 그 세트의 문항·정답·해설을 그대로 가져와 다른 반에 새로 내는 화면이 된다.
// 수정과 다른 점은 저장할 때 원본을 건드리지 않고 새 세트를 만든다는 것뿐이다.
import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import ChoiceGrid from '../ChoiceGrid'
import PageTitle from '../ui/PageTitle'
import Card from '../ui/Card'
import Alert from '../ui/Alert'
import Button from '../ui/Button'
import { mondayOf } from '../../utils/homeworkWeek'
import { homeworkEditImpact } from '../../utils/homeworkEdit'
import { solutionFileName } from '../../utils/homework'
import { homeworkGroups, setInGroup } from '../../utils/homeworkGroup'
import { defaultCopyGroupKey, findConflictingSet, urlsSafeToDelete } from '../../utils/homeworkCopy'
import { mergePendingDays, firstPendingWeekday } from '../../utils/homeworkMerge'
import { visibleClasses } from '../../utils/classAccess'
import { parseAnswerList, distributeAnswers } from '../../utils/answerPaste'
import { HOMEWORK_ANSWER_PROMPT } from '../../constants/homeworkPrompt'
import {
  HW_CATEGORY, CATEGORY_LABELS, WEEKDAYS, WEEKDAY_LABELS,
} from '../../constants/homework'
import { todayKST } from '../../utils/datetime'

// 요일 하나의 편집 상태 초기값
// start: 이 요일 첫 문항 번호. 시험지 한 장을 나눠 내면 화요일이 8번부터 시작하는 식이다.
// answers는 실제 문항 번호를 키로 쓴다 ({8: '③', 9: '①', …}).
const emptyDay = () => ({ enabled: false, start: 1, count: 0, answers: {}, videoUrl: '', fileUrl: '', file: null })

// 요일의 문항 번호 목록 — start부터 count개
// (예전 모양의 요일 상태 — "이어서 넣기"로 넘어온 것 등 — 에는 start가 없을 수 있어 1로 본다)
const startOf = (dd) => dd.start ?? 1
const dayNumbers = (dd) => Array.from({ length: dd.count }, (_, i) => startOf(dd) + i)

// 선지를 다 끄면 값이 빈 문자열로 남는다 — 키가 있다고 입력된 것으로 세면 안 된다
const answeredCount = (answers) => Object.values(answers).filter(Boolean).length

// 수정 모드일 때 기존 세트의 요일·문항을 편집 상태로 되돌린다
function daysFromSet(editSet, allDays, allQuestions) {
  const state = Object.fromEntries(WEEKDAYS.map((wd) => [wd, emptyDay()]))
  if (!editSet) return state
  for (const day of allDays.filter((d) => d.setId === editSet.id)) {
    const answers = {}
    const qs = allQuestions.filter((q) => q.dayId === day.id)
    for (const q of qs) answers[q.number] = q.answer
    // 시작 번호는 따로 저장하지 않는다 — 문항 번호 중 가장 작은 것이다
    const start = qs.length ? Math.min(...qs.map((q) => q.number)) : 1
    state[day.weekday] = {
      enabled: true, start, count: day.questionCount, answers,
      videoUrl: day.daySolutionVideoUrl ?? '', fileUrl: day.daySolutionFileUrl ?? '', file: null,
    }
  }
  return state
}

export default function TeacherHomeworkCreate({
  category, editSet = null, copySet = null, pendingDays = null, onContinueInto, onDone,
}) {
  const { user } = useAuth()
  const {
    addHomeworkSet, updateHomeworkSet, uploadSolutionFile, deleteSolutionFile, notifyNewHomework,
    classes = [], homeworkSets = [], homeworkDays = [], homeworkQuestions = [], homeworkSubmissions = [],
  } = useData()

  const isNaesin = category === HW_CATEGORY.NAESIN
  // 내용을 가져올 원본. 수정이든 복제든 화면을 채우는 방법은 같다.
  const source = editSet ?? copySet
  // 내신은 반, 정시는 레벨이 대상이다. 교사에게는 담당 반만 고를 수 있게 한다.
  const groups = homeworkGroups(category, visibleClasses(classes, user))

  const [groupKey, setGroupKey] = useState(() => {
    // 복제는 "다른 반에도 낸다"는 뜻이라 원본과 다른 반을 먼저 보여준다
    if (copySet) return defaultCopyGroupKey(groups, copySet)
    return groups.find((g) => setInGroup(editSet, g))?.key ?? groups[0]?.key ?? ''
  })
  const group = groups.find((g) => g.key === groupKey) ?? null
  const [title, setTitle]     = useState(source?.title ?? '')
  const [weekStart, setWeekStart] = useState(
    source?.weekStart ?? mondayOf(todayKST())
  )
  // 다른 세트를 만들다 "이 과제에 이어서 넣기"로 넘어온 경우, 그때까지 입력한
  // 요일을 기존 세트 위에 얹는다. 안 그러면 15문항 정답을 다시 찍어야 한다.
  const [days, setDays] = useState(
    () => mergePendingDays(daysFromSet(source, homeworkDays, homeworkQuestions), pendingDays ?? {})
  )
  // 수정·복제 화면은 실제로 과제가 있는 첫 요일부터 보여준다
  const [activeWd, setActiveWd] = useState(() => {
    // 옮겨온 요일부터 보여준다. 기존 세트의 첫 요일을 보여주면
    // 넣던 것이 사라진 줄 안다.
    const moved = firstPendingWeekday(pendingDays ?? {})
    if (moved) return moved
    return WEEKDAYS.find((wd) => daysFromSet(source, homeworkDays, homeworkQuestions)[wd].enabled) ?? 1
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  // 삭제·교체로 더 이상 쓰지 않게 된 해설 파일 URL. 저장이 성공한 뒤에 스토리지에서 지운다.
  // (저장 전에 지우면, 교사가 저장을 안 하고 나갔을 때 학생 화면의 링크만 깨진다)
  const [staleFileUrls, setStaleFileUrls] = useState([])
  // 파일 선택창을 비우기 위한 값 — 삭제할 때마다 올려서 input을 새로 그린다
  const [fileInputKey, setFileInputKey] = useState(0)

  // 정답표 한 번에 넣기 — 붙여넣은 글과, 그걸 읽은 결과(입력할 때마다 다시 계산)
  const [pasteText, setPasteText] = useState('')
  // AI 프롬프트 복사 결과 — 'done' | 'fail' | ''
  const [promptCopied, setPromptCopied] = useState('')
  const pasted = parseAnswerList(pasteText)
  const pastedDays = pasted.answers.length > 0 ? distributeAnswers(pasted.answers) : null

  const d = days[activeWd]
  const setDay = (patch) => setDays((prev) => ({ ...prev, [activeWd]: { ...prev[activeWd], ...patch } }))

  function changeCount(val) {
    const n = Math.max(0, Math.min(300, Number(val) || 0))
    const next = {}
    for (const num of dayNumbers({ start: startOf(d), count: n })) if (d.answers[num]) next[num] = d.answers[num]
    setDay({ count: n, answers: next })
  }

  // 시작 번호를 바꾸면 입력한 정답은 자리를 지킨 채 번호만 바뀐다
  // (1~7번에 넣던 정답이 8~14번이 된다 — 다시 찍지 않아도 된다)
  // 입력칸을 비우는 중에도 1로 되돌아가면 "8"을 치려다 "18"이 된다 → 친 글자(startDraft)를 따로 들고 있는다
  function changeStart(val) {
    const draft = String(val).replace(/\D/g, '').slice(0, 3)
    const start = Math.max(1, Number(draft) || startOf(d))
    const next = {}
    dayNumbers(d).forEach((num, i) => { if (d.answers[num]) next[start + i] = d.answers[num] })
    setDay({ start, startDraft: draft, answers: next })
  }

  // 시험지를 AI에게 맡길 때 쓰는 프롬프트를 복사한다. 쌤이 따로 파일을 갖고 있지 않아도 된다.
  // 복사가 막힌 브라우저(권한 거부 등)에서는 실패를 알려 아래 펼친 글을 직접 복사하게 한다.
  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(HOMEWORK_ANSWER_PROMPT)
      setPromptCopied('done')
    } catch {
      setPromptCopied('fail')
    }
  }

  // 붙여넣은 정답을 월~토에 나눠 채운다. 해설 영상·파일은 요일에 그대로 둔다.
  function applyPasted() {
    if (!pastedDays) return
    // 이미 정답을 넣어 둔 요일이 있으면 덮어쓰기 전에 묻는다 — 되돌리기가 없다
    const filled = WEEKDAYS.some((wd) => days[wd].enabled && answeredCount(days[wd].answers) > 0)
    if (filled && !window.confirm('이미 입력한 문항 수와 정답을 지우고 붙여넣은 정답으로 바꿉니다. 계속할까요?')) return
    setDays((prev) => Object.fromEntries(WEEKDAYS.map((wd) => {
      const { count, answers, from } = pastedDays[wd]
      return [wd, { ...prev[wd], enabled: count > 0, start: count > 0 ? from : 1, count, answers }]
    })))
    setActiveWd(1)
    setPasteText('')
  }

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const url = await uploadSolutionFile(file, `${category}-${groupKey}-${weekStart}`)
    if (!url) { setError('해설 파일 업로드에 실패했습니다. 다시 시도해 주세요.'); return }
    setDay({ fileUrl: url })
  }

  // 올린 해설 파일 빼기 — 실제 삭제는 "저장"을 눌러야 반영된다
  function handleRemoveFile() {
    if (!d.fileUrl) return
    setStaleFileUrls((prev) => [...prev, d.fileUrl])
    setDay({ fileUrl: '' })
    setFileInputKey((k) => k + 1)
  }

  const enabledDays = WEEKDAYS.filter((wd) => days[wd].enabled)
  // 저장 조건은 "사용" 체크한 모든 요일을 보는데, 정답 입력표는 지금 고른 요일 하나만 보여준다.
  // 그래서 월요일을 다 채워 놓고도 (비어 있는 화요일 때문에) 버튼이 죽어 있을 수 있다.
  // 어느 요일이 남았는지 이름으로 들고 있다가 탭과 버튼 옆에 알려준다.
  const incompleteDays = enabledDays.filter((wd) => {
    const dd = days[wd]
    return !(dd.count > 0 && answeredCount(dd.answers) === dd.count)
  })
  // 한 대상에 그 주 세트는 하나뿐이다(DB 제약).
  // 저장을 눌러서야 알면 입력한 걸 다시 손봐야 하니 미리 막고 이유를 말해 준다.
  const conflict = findConflictingSet(homeworkSets, {
    category, group, weekStart, exceptId: editSet?.id ?? null,
  })

  const canSave = Boolean(group) && Boolean(title.trim())
    && enabledDays.length > 0 && incompleteDays.length === 0 && !conflict

  // 버튼이 꺼져 있는 이유 — 교사가 화면만 보고 알 수 있어야 한다
  const blockedReasons = []
  if (!group) blockedReasons.push(isNaesin ? '담당 반이 있어야 내신 과제를 낼 수 있습니다.' : '대상을 골라 주세요.')
  if (!title.trim()) blockedReasons.push('세트 제목을 입력해 주세요.')
  if (enabledDays.length === 0) blockedReasons.push('과제를 낼 요일을 하나 이상 골라 주세요.')
  if (incompleteDays.length > 0) {
    const names = incompleteDays.map((wd) => WEEKDAY_LABELS[wd]).join(', ')
    blockedReasons.push(`${names}요일의 문항 수와 정답을 마저 채워 주세요.`)
  }
  if (conflict) {
    // 한 반의 한 주에는 세트가 하나다. 요일을 더하려면 그 세트를 고쳐야 하는데,
    // 예전에는 "대상이나 주를 바꿔 주세요"라고만 해서 엉뚱한 곳을 가리켰다.
    blockedReasons.push(`${group?.label}의 ${weekStart} 주에는 이미 "${conflict.title}"가 있습니다. 아래 버튼으로 그 과제에 이어서 넣으세요.`)
  }

  // 저장에 보낼 요일 목록 — 경고 계산과 저장이 같은 값을 보게 한다
  const payloadDays = enabledDays.map((wd) => {
    const dd = days[wd]
    return {
      weekday: wd,
      questionCount: dd.count,
      daySolutionVideoUrl: dd.videoUrl,
      daySolutionFileUrl: dd.fileUrl,
      questions: dayNumbers(dd).map((num) => ({
        number: num,
        answer: dd.answers[num],
        solutionVideoUrl: '',   // 문항별 해설은 후속 UI(열린 항목). MVP는 요일 해설 사용.
        solutionFileUrl: '',
      })),
    }
  })

  // 수정이 이미 제출한 학생에게 어떤 영향을 주는지 (출제 모드에서는 영향이 없다)
  const setDayIds = editSet ? homeworkDays.filter((d) => d.setId === editSet.id).map((d) => d.id) : []
  const impact = editSet
    ? homeworkEditImpact({
        days: homeworkDays.filter((d) => d.setId === editSet.id),
        questions: homeworkQuestions.filter((q) => setDayIds.includes(q.dayId)),
        submissions: homeworkSubmissions.filter((s) => setDayIds.includes(s.dayId)),
        nextDays: payloadDays,
      })
    : { warnings: [], destructive: false }

  async function handleSave() {
    if (!canSave || saving) return
    // 학생에게 영향이 가는 수정은 교사가 알고 결정해야 한다
    if (impact.warnings.length > 0) {
      const lines = impact.warnings.map((w) => `· ${w.message}`).join('\n')
      if (!window.confirm(`${lines}\n\n계속하시겠습니까?`)) return
    }
    setSaving(true)
    setError('')
    const saved = editSet
      ? await updateHomeworkSet(editSet.id, {
          target: group?.target ?? null, classId: group?.classId ?? null,
          weekStart, title: title.trim(), days: payloadDays,
        })
      : await addHomeworkSet({
          category, target: group?.target ?? null, classId: group?.classId ?? null,
          weekStart, title: title.trim(),
          teacherId: user.id, days: payloadDays,
        })
    setSaving(false)
    // 저장이 실패했는데 목록으로 넘어가면 성공한 것처럼 보인다 → 입력값 유지하고 알린다
    if (!saved) {
      setError('저장에 실패했습니다. 입력한 내용은 그대로 두었으니 잠시 후 다시 시도해 주세요.')
      return
    }
    // 새로 낸 과제(복제 포함)만 학생에게 알린다. 수정은 이미 아는 과제라 알리지 않는다.
    // 알림이 실패해도 과제는 저장됐으므로, 되돌리지 않고 교사에게만 알린다 —
    // 학생이 못 받은 걸 모르면 "왜 아무도 안 내지?"로 이어진다.
    if (!editSet && notifyNewHomework) {
      const notified = await notifyNewHomework(saved.id)
      if (!notified) {
        window.alert('과제는 저장되었습니다.\n다만 학생 알림을 보내지 못했습니다 — 직접 알려 주세요.')
      } else if (notified.deferredTo) {
        // 다음 주 과제는 학생 화면에 그 주 월요일부터 보인다. 알림도 그때 간다.
        // 교사가 "알림이 왜 안 갔지?" 하지 않도록 언제 가는지 알려 둔다.
        window.alert(`과제는 저장되었습니다.\n학생 화면에는 ${notified.deferredTo}(월)부터 보이고, 알림도 그날 아침 7시쯤 갑니다.`)
      }
    }

    // 저장이 끝난 뒤에야 안 쓰는 해설 파일을 스토리지에서 지운다.
    // 복제본은 원본과 같은 파일 주소를 가리키므로, 다른 요일이 아직 쓰고 있으면
    // 남겨 둔다 — 지우면 그쪽 화면의 링크가 소리 없이 깨진다.
    // 정리에 실패해도 저장은 이미 끝났으므로 화면을 막지 않는다.
    const removable = urlsSafeToDelete(staleFileUrls, homeworkDays, setDayIds)
    await Promise.all(removable.map((url) => deleteSolutionFile(url)))
    onDone()
  }

  return (
    <div>
      <button onClick={onDone} className="text-sm text-ink-mute mb-4">← 목록</button>
      <PageTitle title={`${CATEGORY_LABELS[category]} ${editSet ? '수정' : copySet ? '복제' : '만들기'}`} />

      {copySet && (
        <Alert tone="info" className="mb-4">
          <p className="font-medium mb-1">&quot;{copySet.title}&quot;을 그대로 가져왔습니다</p>
          <p className="font-normal">
            문항·정답·해설이 모두 복사되어 있습니다. 대상만 바꿔 저장하면 새 과제가 됩니다.
            원본은 그대로 남습니다.
          </p>
        </Alert>
      )}

      <div className="flex flex-col gap-4">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="세트 제목 (예: 8월 2주차)"
          className="w-full border border-line rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy" />

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-sm font-medium text-ink-soft mb-1">{isNaesin ? '반' : '정시 레벨'}</label>
            <select value={groupKey} onChange={(e) => setGroupKey(e.target.value)}
              className="w-full border border-line rounded px-3 py-2 text-sm">
              {groups.map((g) => <option key={g.key} value={g.key}>{g.label}</option>)}
            </select>
            {isNaesin && groups.length === 0 && (
              <p className="text-xs text-danger mt-1">담당 반이 없어 내신 과제를 낼 수 없습니다.</p>
            )}
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-ink-soft mb-1">주 시작(월요일)</label>
            <input type="date" value={weekStart} onChange={(e) => setWeekStart(mondayOf(e.target.value))}
              className="w-full border border-line rounded px-3 py-2 text-sm" />
          </div>
        </div>

        {/* 정답표 한 번에 넣기 — 시험지 한 장을 월~토로 나눠 낼 때 */}
        <details className="border border-line rounded bg-surface p-3" data-testid="answer-paste">
          <summary className="text-sm font-medium text-ink-soft cursor-pointer">정답표 한 번에 넣기 (월~토 자동 분배)</summary>
          <p className="text-xs text-ink-faint mt-2 mb-2">
            시험지 정답을 순서대로 붙여넣으면 문항 수를 세서 월~토에 고르게 나눕니다.
            남는 문항은 월요일부터 하나씩 더 갑니다. 예) <span className="whitespace-nowrap">1. ③ 2. ① …</span> 또는 <span className="whitespace-nowrap">3 1 5 2 …</span> · 복수 정답은 2+4
          </p>
          {/* 시험지 PDF를 AI에게 주고 정답표를 뽑게 하는 프롬프트 */}
          <div className="border border-line rounded p-2 mb-2 bg-surface-alt">
            <p className="text-xs text-ink-soft mb-2">
              시험지 PDF를 Claude나 ChatGPT에 올리고 이 프롬프트를 붙여넣으면, 아래에 붙여넣을 정답표와
              문제·정답 검토 결과가 나옵니다. 한글 파일은 먼저 PDF로 저장해 주세요.
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="ghost" onClick={copyPrompt} className="bg-surface">AI 프롬프트 복사</Button>
              {promptCopied === 'done' && <span className="text-xs text-navy">복사했습니다</span>}
            </div>
            {promptCopied === 'fail' && (
              <>
                <p className="text-xs text-danger mt-2">복사가 막혀 있습니다. 아래 글을 길게 눌러 직접 복사해 주세요.</p>
                <textarea readOnly value={HOMEWORK_ANSWER_PROMPT} rows={6} aria-label="AI 프롬프트"
                  className="w-full border border-line rounded px-2 py-1 text-xs mt-1" />
              </>
            )}
            <p className="text-xs text-ink-faint mt-2">AI가 &quot;정답이 다르다&quot;고 해도 정답을 자동으로 고치지 않습니다. 검토 목록은 직접 확인해 주세요.</p>
          </div>
          <textarea value={pasteText} onChange={(e) => setPasteText(e.target.value)}
            rows={4} placeholder="정답표 붙여넣기"
            className="w-full border border-line rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy" />
          {pasted.error && <p className="text-xs text-danger mt-1">{pasted.error}</p>}
          {pastedDays && (
            <div className="mt-2">
              <p className="text-sm text-ink-soft mb-1">총 {pasted.answers.length}문항</p>
              <ul className="grid grid-cols-2 sm:grid-cols-3 gap-1 text-xs text-ink-soft mb-2" data-testid="paste-preview">
                {WEEKDAYS.map((wd) => {
                  const pd = pastedDays[wd]
                  return (
                    <li key={wd} className="border border-line rounded px-2 py-1 whitespace-nowrap">
                      <span className="font-medium">{WEEKDAY_LABELS[wd]}</span>{' '}
                      {pd.count > 0 ? `${pd.count}문항 · ${pd.from}~${pd.to}번` : '없음'}
                    </li>
                  )
                })}
              </ul>
              <Button variant="primary" onClick={applyPasted} className="w-full">월~토에 나누어 채우기</Button>
              <p className="text-xs text-ink-faint mt-1">시험지 번호 그대로 나갑니다. 학생 화면에도 화요일은 8번부터 보입니다.</p>
            </div>
          )}
        </details>

        {/* 요일 탭 */}
        {/* py-1 — 가로 스크롤 영역이라 세로 여백이 없으면 탭 테두리(ring)가 위아래로 잘린다 */}
        <div className="flex gap-2 overflow-x-auto py-1">
          {WEEKDAYS.map((wd) => (
            <button key={wd} onClick={() => setActiveWd(wd)}
              data-incomplete={incompleteDays.includes(wd)}
              className={`px-3 py-2 rounded text-sm whitespace-nowrap ${
                activeWd === wd ? 'bg-ink text-white' : 'bg-surface-alt text-ink-soft'
              } ${days[wd].enabled ? (incompleteDays.includes(wd) ? 'ring-2 ring-danger' : 'ring-2 ring-navy') : ''}`}>
              {WEEKDAY_LABELS[wd]}
              {/* 덜 채운 요일은 탭에서 바로 보이게 한다 — 다른 요일을 보고 있어도 알아챈다.
                  버튼 이름("화")까지 바뀌면 안 되므로 표식은 읽어주기에서 뺀다.
                  덜 채웠다는 사실은 저장 버튼 위 문장이 글로 말해 준다. */}
              {incompleteDays.includes(wd) && (
                <span aria-hidden="true" className="text-danger font-bold"> !</span>
              )}
            </button>
          ))}
        </div>

        {/* 선택 요일 편집 */}
        <Card className="p-4">
          <label className="flex items-center gap-2 mb-3 text-sm font-medium text-ink-soft">
            <input type="checkbox" checked={d.enabled} onChange={(e) => setDay({ enabled: e.target.checked })} />
            {WEEKDAY_LABELS[activeWd]}요일 과제 사용
          </label>
          {d.enabled && (
            <>
              <div className="flex items-center gap-x-4 gap-y-2 mb-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <label className="text-sm text-ink-soft">문항 수</label>
                  <input type="number" min="0" max="300" value={d.count || ''} onChange={(e) => changeCount(e.target.value)}
                    className="w-20 border border-line rounded px-2 py-1 text-sm" />
                </div>
                {/* 시험지 한 장을 나눠 낼 때 화요일은 8번부터 — 학생 화면에도 그 번호로 보인다 */}
                <div className="flex items-center gap-2">
                  <label htmlFor="hw-start" className="text-sm text-ink-soft">시작 번호</label>
                  <input id="hw-start" type="text" inputMode="numeric"
                    value={d.startDraft ?? startOf(d)}
                    onChange={(e) => changeStart(e.target.value)}
                    onBlur={() => setDay({ startDraft: undefined })}
                    className="w-16 border border-line rounded px-2 py-1 text-sm" />
                  {d.count > 1 && <span className="text-xs text-ink-faint whitespace-nowrap">{startOf(d)}~{startOf(d) + d.count - 1}번</span>}
                </div>
              </div>
              {d.count > 0 && (
                <div className="mb-3">
                  <p className="text-xs text-ink-faint mb-2">정답 입력 ({answeredCount(d.answers)}/{d.count})</p>
                  <ChoiceGrid numbers={dayNumbers(d)} values={d.answers} mode="input"
                    onChange={(number, choice) => setDay({ answers: { ...d.answers, [number]: choice } })} />
                </div>
              )}
              <input value={d.videoUrl} onChange={(e) => setDay({ videoUrl: e.target.value })}
                placeholder="해설 영상 YouTube 링크(선택)"
                className="w-full border border-line rounded px-3 py-2 text-sm mb-2" />
              {d.fileUrl ? (
                <div className="flex items-center gap-2 flex-wrap">
                  <a href={d.fileUrl} target="_blank" rel="noreferrer"
                    className="text-sm text-navy underline break-all">
                    {solutionFileName(d.fileUrl)}
                  </a>
                  <button type="button" onClick={handleRemoveFile}
                    className="text-xs px-2 py-1 rounded bg-danger-soft text-danger font-medium">
                    삭제
                  </button>
                  <span className="text-xs text-ink-faint w-full">저장을 눌러야 삭제가 반영됩니다.</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <input key={fileInputKey} type="file" onChange={handleFile} className="text-sm" />
                </div>
              )}
            </>
          )}
        </Card>

        {/* 저장을 누르기 전에 학생에게 무슨 일이 생기는지 미리 보여준다 */}
        {impact.warnings.length > 0 && (
          // Alert는 임의 props를 전달하지 않으므로, 테스트가 찾는 data-testid는 감싸는 div에 둔다
          <div data-testid="edit-impact">
            <Alert tone={impact.destructive ? 'danger' : 'info'}>
              <p className="font-medium mb-1">{impact.destructive ? '되돌릴 수 없는 변경입니다' : '이미 제출한 학생에게 영향이 갑니다'}</p>
              <ul className="list-disc pl-4 flex flex-col gap-0.5">
                {impact.warnings.map((w) => <li key={`${w.type}-${w.weekday}`}>{w.message}</li>)}
              </ul>
            </Alert>
          </div>
        )}

        {/* 한 반의 한 주에는 세트가 하나뿐이라, 새로 만드는 대신 그 세트에 요일을
            더해야 한다. 입력한 것을 버리지 않고 그대로 옮겨 준다. */}
        {conflict && onContinueInto && (
          <Alert tone="info">
            <p className="font-medium mb-1">이 주에는 이미 &quot;{conflict.title}&quot;가 있습니다</p>
            <p className="font-normal mb-2">
              한 반의 한 주에는 과제 하나만 둘 수 있습니다. 새로 만드는 대신 그 과제에
              지금 입력한 요일을 더하세요. <strong>입력한 문항과 정답은 그대로 옮겨집니다.</strong>
            </p>
            <Button variant="primary" onClick={() => onContinueInto(conflict, days)}>
              &quot;{conflict.title}&quot;에 이어서 넣기
            </Button>
          </Alert>
        )}

        {error && <Alert tone="danger">{error}</Alert>}

        {!canSave && !saving && (
          <p data-testid="save-blocked" className="text-sm text-ink-soft">
            {blockedReasons.join(' ')}
          </p>
        )}

        <Button variant="primary" onClick={handleSave} disabled={!canSave || saving} className="w-full">
          {saving ? '저장 중...' : editSet ? '수정 저장' : copySet ? '복제해서 저장' : '주간 과제 저장'}
        </Button>
      </div>
    </div>
  )
}
