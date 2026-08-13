// src/components/homework/TeacherHomeworkCreate.jsx
// 교사: 한 종류(내신/정시) 주간 세트(월~토)를 한 번에 출제.
// editSet을 받으면 그 세트를 불러와 수정하는 화면이 된다(입력 항목이 출제와 같아 화면을 공유한다).
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
import {
  HW_CATEGORY, CATEGORY_LABELS, GRADES, GRADE_LABELS,
  JEONGSI_LEVELS, JEONGSI_LEVEL_LABELS, WEEKDAYS, WEEKDAY_LABELS,
} from '../../constants/homework'

// 요일 하나의 편집 상태 초기값
const emptyDay = () => ({ enabled: false, count: 0, answers: {}, videoUrl: '', fileUrl: '', file: null })

// 수정 모드일 때 기존 세트의 요일·문항을 편집 상태로 되돌린다
function daysFromSet(editSet, allDays, allQuestions) {
  const state = Object.fromEntries(WEEKDAYS.map((wd) => [wd, emptyDay()]))
  if (!editSet) return state
  for (const day of allDays.filter((d) => d.setId === editSet.id)) {
    const answers = {}
    for (const q of allQuestions.filter((q) => q.dayId === day.id)) answers[q.number] = q.answer
    state[day.weekday] = {
      enabled: true, count: day.questionCount, answers,
      videoUrl: day.daySolutionVideoUrl ?? '', fileUrl: day.daySolutionFileUrl ?? '', file: null,
    }
  }
  return state
}

export default function TeacherHomeworkCreate({ category, editSet = null, onDone }) {
  const { user } = useAuth()
  const {
    addHomeworkSet, updateHomeworkSet, uploadSolutionFile, deleteSolutionFile,
    homeworkDays = [], homeworkQuestions = [], homeworkSubmissions = [],
  } = useData()

  const isNaesin = category === HW_CATEGORY.NAESIN
  const targets = isNaesin ? GRADES : JEONGSI_LEVELS
  const targetLabels = isNaesin ? GRADE_LABELS : JEONGSI_LEVEL_LABELS

  const [target, setTarget]   = useState(String(editSet?.target ?? targets[0]))
  const [title, setTitle]     = useState(editSet?.title ?? '')
  const [weekStart, setWeekStart] = useState(
    editSet?.weekStart ?? mondayOf(new Date().toISOString().slice(0, 10))
  )
  const [days, setDays] = useState(() => daysFromSet(editSet, homeworkDays, homeworkQuestions))
  // 수정 화면은 실제로 과제가 있는 첫 요일부터 보여준다
  const [activeWd, setActiveWd] = useState(
    () => WEEKDAYS.find((wd) => daysFromSet(editSet, homeworkDays, homeworkQuestions)[wd].enabled) ?? 1
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  // 삭제·교체로 더 이상 쓰지 않게 된 해설 파일 URL. 저장이 성공한 뒤에 스토리지에서 지운다.
  // (저장 전에 지우면, 교사가 저장을 안 하고 나갔을 때 학생 화면의 링크만 깨진다)
  const [staleFileUrls, setStaleFileUrls] = useState([])
  // 파일 선택창을 비우기 위한 값 — 삭제할 때마다 올려서 input을 새로 그린다
  const [fileInputKey, setFileInputKey] = useState(0)

  const d = days[activeWd]
  const setDay = (patch) => setDays((prev) => ({ ...prev, [activeWd]: { ...prev[activeWd], ...patch } }))

  function changeCount(val) {
    const n = Math.max(0, Math.min(300, Number(val) || 0))
    const next = {}
    for (let i = 1; i <= n; i++) if (d.answers[i]) next[i] = d.answers[i]
    setDay({ count: n, answers: next })
  }

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const url = await uploadSolutionFile(file, `${category}-${target}-${weekStart}`)
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
  const canSave =
    title.trim() && enabledDays.length > 0 &&
    enabledDays.every((wd) => {
      const dd = days[wd]
      return dd.count > 0 && Object.keys(dd.answers).length === dd.count
    })

  // 저장에 보낼 요일 목록 — 경고 계산과 저장이 같은 값을 보게 한다
  const payloadDays = enabledDays.map((wd) => {
    const dd = days[wd]
    return {
      weekday: wd,
      questionCount: dd.count,
      daySolutionVideoUrl: dd.videoUrl,
      daySolutionFileUrl: dd.fileUrl,
      questions: Array.from({ length: dd.count }, (_, i) => ({
        number: i + 1,
        answer: dd.answers[i + 1],
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
          target: Number(target), weekStart, title: title.trim(), days: payloadDays,
        })
      : await addHomeworkSet({
          category, target: Number(target), weekStart, title: title.trim(),
          teacherId: user.id, days: payloadDays,
        })
    setSaving(false)
    // 저장이 실패했는데 목록으로 넘어가면 성공한 것처럼 보인다 → 입력값 유지하고 알린다
    if (!saved) {
      setError('저장에 실패했습니다. 입력한 내용은 그대로 두었으니 잠시 후 다시 시도해 주세요.')
      return
    }
    // 저장이 끝난 뒤에야 안 쓰는 해설 파일을 스토리지에서 지운다.
    // 정리에 실패해도 저장은 이미 끝났으므로 화면을 막지 않는다.
    await Promise.all(staleFileUrls.map((url) => deleteSolutionFile(url)))
    onDone()
  }

  return (
    <div>
      <button onClick={onDone} className="text-sm text-ink-mute mb-4">← 목록</button>
      <PageTitle title={`${CATEGORY_LABELS[category]} ${editSet ? '수정' : '만들기'}`} />

      <div className="flex flex-col gap-4">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="세트 제목 (예: 8월 2주차)"
          className="w-full border border-line rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy" />

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-sm font-medium text-ink-soft mb-1">{isNaesin ? '학년' : '정시 레벨'}</label>
            <select value={target} onChange={(e) => setTarget(e.target.value)}
              className="w-full border border-line rounded px-3 py-2 text-sm">
              {targets.map((t) => <option key={t} value={t}>{targetLabels[t]}</option>)}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-ink-soft mb-1">주 시작(월요일)</label>
            <input type="date" value={weekStart} onChange={(e) => setWeekStart(mondayOf(e.target.value))}
              className="w-full border border-line rounded px-3 py-2 text-sm" />
          </div>
        </div>

        {/* 요일 탭 */}
        <div className="flex gap-2 overflow-x-auto">
          {WEEKDAYS.map((wd) => (
            <button key={wd} onClick={() => setActiveWd(wd)}
              className={`px-3 py-2 rounded text-sm whitespace-nowrap ${
                activeWd === wd ? 'bg-ink text-white' : 'bg-surface-alt text-ink-soft'
              } ${days[wd].enabled ? 'ring-2 ring-navy' : ''}`}>
              {WEEKDAY_LABELS[wd]}
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
              <div className="flex items-center gap-2 mb-3">
                <label className="text-sm text-ink-soft">문항 수</label>
                <input type="number" min="0" max="300" value={d.count || ''} onChange={(e) => changeCount(e.target.value)}
                  className="w-24 border border-line rounded px-2 py-1 text-sm" />
              </div>
              {d.count > 0 && (
                <div className="mb-3">
                  <p className="text-xs text-ink-faint mb-2">정답 입력 ({Object.keys(d.answers).length}/{d.count})</p>
                  <ChoiceGrid count={d.count} values={d.answers} mode="input"
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

        {error && <Alert tone="danger">{error}</Alert>}

        <Button variant="primary" onClick={handleSave} disabled={!canSave || saving} className="w-full">
          {saving ? '저장 중...' : editSet ? '수정 저장' : '주간 과제 저장'}
        </Button>
      </div>
    </div>
  )
}
