// src/components/reports/WeeklyReportTable.jsx
// 주간 리포트 — 한 반의 한 주를 표 하나로. 표시만 하고 데이터는 받아 쓴다.
import { AlertTriangle, StickyNote } from 'lucide-react'

// 출석: (출석+지각)/전체. 지각·결석은 뒤에 별기해 감춰지지 않게 한다.
function AttendanceCell({ att }) {
  if (!att) return <span className="text-gray-300">-</span>
  const notes = []
  if (att.late > 0)   notes.push(`지${att.late}`)
  if (att.absent > 0) notes.push(`결${att.absent}`)
  return (
    <span>
      {att.present + att.late}/{att.counted}
      {notes.length > 0 && (
        <span className="ml-1 text-xs text-[#C0392B]">{notes.join(' ')}</span>
      )}
    </span>
  )
}

// 테스트: 채점된 게 없으면 0점처럼 보이지 않게 상태만 보여준다.
function TestCell({ summary }) {
  if (!summary) return <span className="text-gray-300">-</span>
  const suffix = summary.count > 1 ? ` (${summary.count}건)` : ''
  if (summary.average == null) {
    return <span className="text-gray-500">채점중{suffix}</span>
  }
  return <span>{summary.average}점{suffix}</span>
}

// 과제: 제출 회차 / 배정 회차 + 정답률
function HomeworkCell({ hw }) {
  if (!hw) return <span className="text-gray-300">-</span>
  return (
    <span>
      {hw.submitted}/{hw.total}
      {hw.correctRate != null && (
        <span className="ml-1 text-xs text-gray-400">{hw.correctRate}%</span>
      )}
    </span>
  )
}

export default function WeeklyReportTable({ rows, noteStudentIds, onSelect }) {
  if (rows.length === 0) {
    return <p className="text-center text-gray-400 py-12">이 반에 등록된 학생이 없습니다.</p>
  }

  return (
    <div className="overflow-x-auto bg-white rounded-xl shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 text-gray-500 text-xs">
            <th className="text-left  px-4 py-3 font-medium">이름</th>
            <th className="text-right px-3 py-3 font-medium">출석</th>
            <th className="text-right px-3 py-3 font-medium">테스트</th>
            <th className="text-right px-3 py-3 font-medium">내신과제</th>
            <th className="text-right px-3 py-3 font-medium whitespace-nowrap">정시과제</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.student.id}
              className="border-b border-gray-50 last:border-0 hover:bg-[#F4F3EE] cursor-pointer"
              onClick={() => onSelect(row.student)}>
              <td className="px-4 py-3">
                <span className="font-medium text-[#2B2B2B]">{row.student.name}</span>
                {row.flags.length > 0 && (
                  <AlertTriangle className="inline-block ml-1.5 w-3.5 h-3.5 text-[#C0392B]"
                    data-testid={`flag-${row.student.id}`} />
                )}
                {noteStudentIds.has(row.student.id) && (
                  <StickyNote className="inline-block ml-1 w-3.5 h-3.5 text-[#5B8FD4]"
                    data-testid={`note-mark-${row.student.id}`} />
                )}
              </td>
              <td className="text-right px-3 py-3" data-testid={`att-${row.student.id}`}>
                <AttendanceCell att={row.attendance} />
              </td>
              <td className="text-right px-3 py-3" data-testid={`test-${row.student.id}`}>
                <TestCell summary={row.testSummary} />
              </td>
              <td className="text-right px-3 py-3" data-testid={`naesin-${row.student.id}`}>
                <HomeworkCell hw={row.naesin} />
              </td>
              <td className="text-right px-3 py-3" data-testid={`jeongsi-${row.student.id}`}>
                <HomeworkCell hw={row.jeongsi} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
