// src/components/homework/TeacherHomeworkCreate.jsx
// 교사: 한 종류(내신/정시) 주간 세트(월~토)를 한 번에 출제.
import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import ChoiceGrid from '../ChoiceGrid'
import { mondayOf } from '../../utils/homeworkWeek'
import {
  HW_CATEGORY, CATEGORY_LABELS, GRADES, GRADE_LABELS,
  JEONGSI_LEVELS, JEONGSI_LEVEL_LABELS, WEEKDAYS, WEEKDAY_LABELS,
} from '../../constants/homework'

// 요일 하나의 편집 상태 초기값
const emptyDay = () => ({ enabled: false, count: 0, answers: {}, videoUrl: '', fileUrl: '', file: null })

export default function TeacherHomeworkCreate({ category, onDone }) {
  const { user } = useAuth()
  const { addHomeworkSet, uploadSolutionFile } = useData()

  const isNaesin = category === HW_CATEGORY.NAESIN
  const targets = isNaesin ? GRADES : JEONGSI_LEVELS
  const targetLabels = isNaesin ? GRADE_LABELS : JEONGSI_LEVEL_LABELS

  const [target, setTarget]   = useState(String(targets[0]))
  const [title, setTitle]     = useState('')
  const [weekStart, setWeekStart] = useState(mondayOf(new Date().toISOString().slice(0, 10)))
  const [activeWd, setActiveWd] = useState(1)
  const [days, setDays] = useState(() => Object.fromEntries(WEEKDAYS.map((wd) => [wd, emptyDay()])))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

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
    if (url) setDay({ fileUrl: url })
  }

  const enabledDays = WEEKDAYS.filter((wd) => days[wd].enabled)
  const canSave =
    title.trim() && enabledDays.length > 0 &&
    enabledDays.every((wd) => {
      const dd = days[wd]
      return dd.count > 0 && Object.keys(dd.answers).length === dd.count
    })

  async function handleSave() {
    if (!canSave || saving) return
    setSaving(true)
    setError('')
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
    const created = await addHomeworkSet({
      category, target: Number(target), weekStart, title: title.trim(),
      teacherId: user.id, days: payloadDays,
    })
    setSaving(false)
    // 저장이 실패했는데 목록으로 넘어가면 성공한 것처럼 보인다 → 입력값 유지하고 알린다
    if (!created) {
      setError('저장에 실패했습니다. 입력한 내용은 그대로 두었으니 잠시 후 다시 시도해 주세요.')
      return
    }
    onDone()
  }

  return (
    <div>
      <button onClick={onDone} className="text-sm text-gray-500 mb-4">← 목록</button>
      <h1 className="text-xl font-bold text-[#2B2B2B] mb-4">{CATEGORY_LABELS[category]} 만들기</h1>

      <div className="flex flex-col gap-4">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="세트 제목 (예: 8월 2주차)"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5B8FD4]" />

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">{isNaesin ? '학년' : '정시 레벨'}</label>
            <select value={target} onChange={(e) => setTarget(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
              {targets.map((t) => <option key={t} value={t}>{targetLabels[t]}</option>)}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">주 시작(월요일)</label>
            <input type="date" value={weekStart} onChange={(e) => setWeekStart(mondayOf(e.target.value))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>

        {/* 요일 탭 */}
        <div className="flex gap-2 overflow-x-auto">
          {WEEKDAYS.map((wd) => (
            <button key={wd} onClick={() => setActiveWd(wd)}
              className={`px-3 py-2 rounded-lg text-sm whitespace-nowrap ${
                activeWd === wd ? 'bg-[#2B2B2B] text-white' : 'bg-gray-100 text-gray-600'
              } ${days[wd].enabled ? 'ring-2 ring-[#5B8FD4]' : ''}`}>
              {WEEKDAY_LABELS[wd]}
            </button>
          ))}
        </div>

        {/* 선택 요일 편집 */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <label className="flex items-center gap-2 mb-3 text-sm font-medium text-gray-700">
            <input type="checkbox" checked={d.enabled} onChange={(e) => setDay({ enabled: e.target.checked })} />
            {WEEKDAY_LABELS[activeWd]}요일 과제 사용
          </label>
          {d.enabled && (
            <>
              <div className="flex items-center gap-2 mb-3">
                <label className="text-sm text-gray-700">문항 수</label>
                <input type="number" min="0" max="300" value={d.count || ''} onChange={(e) => changeCount(e.target.value)}
                  className="w-24 border border-gray-200 rounded-lg px-2 py-1 text-sm" />
              </div>
              {d.count > 0 && (
                <div className="mb-3">
                  <p className="text-xs text-gray-400 mb-2">정답 입력 ({Object.keys(d.answers).length}/{d.count})</p>
                  <ChoiceGrid count={d.count} values={d.answers} mode="input"
                    onChange={(number, choice) => setDay({ answers: { ...d.answers, [number]: choice } })} />
                </div>
              )}
              <input value={d.videoUrl} onChange={(e) => setDay({ videoUrl: e.target.value })}
                placeholder="해설 영상 YouTube 링크(선택)"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-2" />
              <div className="flex items-center gap-2">
                <input type="file" onChange={handleFile} className="text-sm" />
                {d.fileUrl && <span className="text-xs text-green-600">파일 업로드됨</span>}
              </div>
            </>
          )}
        </div>

        {error && (
          <p className="text-sm text-[#C0392B] bg-[#C0392B]/10 rounded-lg px-3 py-2">{error}</p>
        )}

        <button onClick={handleSave} disabled={!canSave || saving}
          className="w-full py-3 bg-[#2B2B2B] text-white rounded-xl font-medium disabled:opacity-40">
          {saving ? '저장 중...' : '주간 과제 저장'}
        </button>
      </div>
    </div>
  )
}
