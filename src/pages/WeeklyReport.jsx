// src/pages/WeeklyReport.jsx
// 주간 리포트 — 반 하나의 한 주(출석·주간테스트·주간과제)를 한 표로. 교사/관리자 전용.
import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import Layout from '../components/Layout'
import WeeklyReportTable from '../components/reports/WeeklyReportTable'
import WeeklyStudentDetail from '../components/reports/WeeklyStudentDetail'
import { weeklyClassReport } from '../utils/weeklyReport'
import { mondayOf, dateForWeekday } from '../utils/homeworkWeek'

// 주 시작에서 n주 이동한 월요일
function shiftWeek(weekStart, weeks) {
  return mondayOf(dateForWeekday(weekStart, 1 + weeks * 7))
}

export default function WeeklyReport() {
  const { user } = useAuth()
  const {
    classes, students, attendance, tests, submissions,
    homeworkSets, homeworkDays, homeworkQuestions, homeworkSubmissions,
    weeklyNotes, upsertWeeklyNote,
  } = useData()

  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date().toISOString().slice(0, 10)))
  const [classId, setClassId]     = useState(() => classes[0]?.id ?? null)
  const [selected, setSelected]   = useState(null)

  // 학생은 이 페이지에 접근 불가
  if (user.role === 'student') {
    return (
      <Layout>
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg">접근 권한이 없습니다.</p>
        </div>
      </Layout>
    )
  }

  const report = weeklyClassReport({
    students, attendance, tests, testSubmissions: submissions,
    homeworkSets, homeworkDays, homeworkQuestions, homeworkSubmissions,
    classId: Number(classId), weekStart,
  })

  const noteOf = (studentId) =>
    weeklyNotes.find((n) => n.studentId === studentId && n.weekStart === weekStart) ?? null
  const noteStudentIds = new Set(
    weeklyNotes.filter((n) => n.weekStart === weekStart && n.content.trim()).map((n) => n.studentId)
  )

  const selectedRow = selected && report.rows.find((r) => r.student.id === selected.id)

  return (
    <Layout>
      <div>
        <h1 className="text-xl font-bold text-[#2B2B2B] mb-4">주간 리포트</h1>

        {/* 주 이동 + 반 선택 */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <button aria-label="이전 주" onClick={() => setWeekStart(shiftWeek(weekStart, -1))}
            className="p-1.5 rounded-lg bg-white shadow-sm"><ChevronLeft className="w-4 h-4" /></button>
          <span data-testid="week-label" className="text-sm font-medium text-[#2B2B2B]">
            {weekStart} ~ {dateForWeekday(weekStart, 6)}
          </span>
          <button aria-label="다음 주" onClick={() => setWeekStart(shiftWeek(weekStart, 1))}
            className="p-1.5 rounded-lg bg-white shadow-sm"><ChevronRight className="w-4 h-4" /></button>

          <select value={classId ?? ''} onChange={(e) => { setClassId(e.target.value); setSelected(null) }}
            className="ml-auto border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white">
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {selectedRow ? (
          <WeeklyStudentDetail
            row={selectedRow}
            dates={report.dates}
            weekStart={weekStart}
            attendanceRecords={attendance}
            note={noteOf(selectedRow.student.id)}
            onSaveNote={(content) =>
              upsertWeeklyNote({ studentId: selectedRow.student.id, weekStart, content })}
            onBack={() => setSelected(null)}
          />
        ) : (
          <WeeklyReportTable
            rows={report.rows}
            noteStudentIds={noteStudentIds}
            onSelect={setSelected}
          />
        )}
      </div>
    </Layout>
  )
}
