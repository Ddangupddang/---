// src/components/reports/ReportHomeworkChecks.jsx
// 진도 리포트의 과제 수행 현황.
// 과제 제출 기록으로 자동 채우되, 교사가 눌러서 고칠 수 있다.
// (종이로 받았거나 사정을 아는 경우가 있어 자동값만 믿으면 안 된다)
import { useData } from '../../context/DataContext'
import { autoHomeworkStatus, resolveCheck } from '../../utils/reportHomework'

export default function ReportHomeworkChecks({ date, students, checks, onChange }) {
  const { homeworkSets = [], homeworkDays = [], homeworkSubmissions = [] } = useData()

  const rows = students.map((student) => {
    const auto = autoHomeworkStatus({
      student, date,
      sets: homeworkSets, days: homeworkDays, submissions: homeworkSubmissions,
    })
    const entry = checks.find((c) => c.studentId === student.id)
    return { student, auto, ...resolveCheck(entry, auto) }
  })

  const doneCount = rows.filter((r) => r.value).length
  const hasAuto = rows.some((r) => r.auto)

  // 교사가 고친 값은 manual로 남겨 자동값보다 우선하게 한다
  function write(studentId, patch) {
    const next = students.map((s) => {
      const prev = checks.find((c) => c.studentId === s.id) ?? { studentId: s.id, done: false }
      return s.id === studentId ? { ...prev, ...patch } : prev
    })
    onChange(next)
  }

  const toggle = (row) => write(row.student.id, { done: !row.value, manual: true })
  // 되돌리면 다시 제출 기록을 따른다
  const revert = (row) => write(row.student.id, { done: row.auto?.done ?? false, manual: false })

  return (
    <div className="bg-surface border border-line rounded p-5">
      <div className="flex justify-between items-center mb-1">
        <p className="text-sm font-semibold text-ink-soft">과제 수행 현황</p>
        <span className="text-sm font-bold text-ink">{doneCount} / {students.length}명</span>
      </div>
      <p className="text-xs text-ink-faint mb-4">
        {hasAuto
          ? '과제 제출 기록으로 자동 표시됩니다. 이름을 누르면 직접 고칠 수 있습니다.'
          : '이 날짜에 등록된 온라인 과제가 없어 직접 체크합니다.'}
      </p>

      <div className="flex flex-col gap-2">
        {rows.map((row) => (
          <div
            key={row.student.id}
            data-testid={`check-${row.student.id}`}
            onClick={() => toggle(row)}
            className={`flex items-center justify-between p-3 rounded cursor-pointer transition-colors ${
              row.value ? 'bg-navy-soft' : 'bg-surface-alt hover:bg-line-soft'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm font-medium text-ink">{row.student.name}</span>
              {row.auto && (
                <span className="text-xs text-ink-faint shrink-0">
                  {row.auto.submitted === 0
                    ? '미제출'
                    : `${row.auto.submitted}/${row.auto.total} 제출`}
                </span>
              )}
              {row.source === 'manual' && (
                <>
                  <span className="text-xs bg-navy-soft text-navy px-1.5 py-0.5 rounded shrink-0">수정됨</span>
                  {/* 클릭 가능한 컨트롤이라 남색 배경(bg-navy-soft) 위에서도 읽히도록
                      가장 옅은 회색(ink-faint) 대신 ink-soft를 쓴다 */}
                  {row.auto && (
                    <button
                      onClick={(e) => { e.stopPropagation(); revert(row) }}
                      className="text-xs text-ink-soft hover:text-ink underline shrink-0"
                    >되돌리기</button>
                  )}
                </>
              )}
            </div>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors shrink-0 ${
              row.value ? 'bg-navy text-white' : 'bg-line text-ink-faint'
            }`}>
              {row.value ? '✓' : ''}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
