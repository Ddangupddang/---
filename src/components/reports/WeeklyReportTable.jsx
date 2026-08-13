// src/components/reports/WeeklyReportTable.jsx
// 주간 리포트 — 한 반의 한 주를 표 하나로. 표시만 하고 데이터는 받아 쓴다.
import { StickyNote } from 'lucide-react'
import DataTable from '../ui/DataTable'
import Badge from '../ui/Badge'
import MiniBar from '../ui/MiniBar'

// 출석: (출석+지각)/전체. 지각·결석은 뒤에 별기해 감춰지지 않게 한다.
function AttendanceCell({ att }) {
  if (!att) return <span className="text-ink-faint">-</span>
  const notes = []
  if (att.late > 0)   notes.push(`지${att.late}`)
  if (att.absent > 0) notes.push(`결${att.absent}`)
  const attended = att.present + att.late
  return (
    <span>
      <span className={att.absent > 0 ? 'text-danger font-bold' : 'font-semibold'}>
        {attended}/{att.counted}
      </span>
      {notes.length > 0 && <span className="ml-1 text-[13px] text-ink-mute">{notes.join(' ')}</span>}
      <MiniBar value={attended} max={att.counted} tone={att.absent > 0 ? 'danger' : 'navy'} />
    </span>
  )
}

// 테스트: 채점된 게 없으면 0점처럼 보이지 않게 상태만 보여준다.
function TestCell({ summary }) {
  if (!summary) return <span className="text-ink-faint">-</span>
  const suffix = summary.count > 1 ? ` (${summary.count}건)` : ''
  if (summary.average == null) {
    return <Badge tone="warn">채점중{suffix}</Badge>
  }
  const tone = summary.average < 60 ? 'text-danger font-bold'
    : summary.average < 80 ? 'text-warn font-bold' : 'font-semibold'
  return <span className={tone}>{summary.average}점{suffix}</span>
}

// 과제: 제출 회차 / 배정 회차 + 정답률
function HomeworkCell({ hw }) {
  if (!hw) return <span className="text-ink-faint">-</span>
  const low = hw.submitRate < 70
  return (
    <span>
      <span className={low ? 'text-danger font-bold' : 'font-semibold'}>
        {hw.submitted}/{hw.total}
      </span>
      {hw.correctRate != null && (
        <span className="ml-1 text-[13px] text-ink-mute">{hw.correctRate}%</span>
      )}
      <MiniBar value={hw.submitted} max={hw.total} tone={low ? 'danger' : 'navy'} />
    </span>
  )
}

const COLUMNS = [
  { key: 'name',    label: '이름' },
  { key: 'att',     label: '출석',     align: 'right' },
  { key: 'test',    label: '테스트',   align: 'right' },
  { key: 'naesin',  label: '내신과제', align: 'right' },
  { key: 'jeongsi', label: '정시과제', align: 'right' },
]

export default function WeeklyReportTable({ rows, noteStudentIds, onSelect }) {
  return (
    <DataTable
      columns={COLUMNS}
      rows={rows}
      rowKey={(row) => row.student.id}
      isAlert={(row) => row.flags.length > 0}
      onRowClick={onSelect ? (row) => onSelect(row.student) : undefined}
      empty="이 반에 등록된 학생이 없습니다."
      renderCell={(row, col) => {
        if (col.key === 'name') return (
          <span>
            <span className="font-bold text-[16.5px] text-ink">{row.student.name}</span>
            {noteStudentIds.has(row.student.id) && (
              <StickyNote className="inline-block ml-1.5 w-3.5 h-3.5 text-navy"
                data-testid={`note-mark-${row.student.id}`} />
            )}
          </span>
        )
        if (col.key === 'att')     return <AttendanceCell att={row.attendance} />
        if (col.key === 'test')    return <TestCell summary={row.testSummary} />
        if (col.key === 'naesin')  return <HomeworkCell hw={row.naesin} />
        return <HomeworkCell hw={row.jeongsi} />
      }}
    />
  )
}
