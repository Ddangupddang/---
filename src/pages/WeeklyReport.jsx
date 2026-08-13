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

  const [weekStart, setWeekStart]       = useState(() => mondayOf(new Date().toISOString().slice(0, 10)))
  const [selectedClass, setSelectedClass] = useState(null)
  const [selected, setSelected]         = useState(null)

  // 반 목록은 목업으로 먼저 그려졌다가 Supabase 로드 후 교체된다.
  // 첫 렌더의 목업 id를 붙잡아 두면 실제 반과 어긋나 빈 표가 열린다 → 매 렌더 파생값으로 고른다
  const activeClass = selectedClass ?? classes[0]?.id ?? null

  // 주를 바꿀 때 상세를 닫지 않으면, 열려 있던 코멘트 입력창이 지난 주 내용을 쥔 채
  // 새 주에 저장돼 남의 주 코멘트를 덮어쓴다 (반 변경과 같은 처리)
  const goWeek = (weeks) => { setWeekStart(shiftWeek(weekStart, weeks)); setSelected(null) }

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
    classId: Number(activeClass), weekStart,
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
          <button aria-label="이전 주" onClick={() => goWeek(-1)}
            className="p-1.5 rounded-lg bg-white shadow-sm"><ChevronLeft className="w-4 h-4" /></button>
          <span data-testid="week-label" className="text-sm font-medium text-[#2B2B2B]">
            {weekStart} ~ {dateForWeekday(weekStart, 6)}
          </span>
          <button aria-label="다음 주" onClick={() => goWeek(1)}
            className="p-1.5 rounded-lg bg-white shadow-sm"><ChevronRight className="w-4 h-4" /></button>

          <select value={activeClass ?? ''} onChange={(e) => { setSelectedClass(e.target.value); setSelected(null) }}
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
