// src/components/homework/DaySubmissionList.jsx
// 교사: 한 요일의 학생별 제출 현황.
// 미제출 학생을 위에 두어 "누가 안 냈는지"가 먼저 보이게 한다.
// 제출한 학생의 이름을 누르면 그 학생의 문항별 정답/오답으로 들어간다.
import { useState } from 'react'
import ChoiceGrid from '../ChoiceGrid'
import { gradeHomework } from '../../utils/homework'

const byName = (a, b) => a.student.name.localeCompare(b.student.name, 'ko')

export default function DaySubmissionList({ students, questions, submissions }) {
  const [openStudentId, setOpenStudentId] = useState(null)

  const rows = students.map((student) => {
    const submission = submissions.find((s) => s.studentId === student.id) ?? null
    return {
      student,
      submission,
      score: submission ? gradeHomework(questions, submission.answers) : null,
    }
  })
  const missing = rows.filter((r) => !r.submission).sort(byName)
  const done = rows.filter((r) => r.submission).sort(byName)

  // 한 학생의 문항별 결과
  const open = done.find((r) => r.student.id === openStudentId)
  if (open) {
    const values = Object.fromEntries(open.submission.answers.map((a) => [a.number, a.answer]))
    const answerKey = Object.fromEntries(questions.map((q) => [q.number, q.answer]))
    return (
      <div className="border-t border-gray-100 mt-3 pt-3">
        <button onClick={() => setOpenStudentId(null)} className="text-sm text-gray-500 mb-2">← 학생 목록</button>
        <p className="text-sm font-semibold text-[#2B2B2B] mb-2">
          {open.student.name}
          <span className="ml-2 font-normal text-gray-500">{open.score.correctCount}/{open.score.total}</span>
        </p>
        <ChoiceGrid count={questions.length} mode="result" values={values} answerKey={answerKey} onChange={() => {}} />
      </div>
    )
  }

  if (rows.length === 0) {
    return <p className="border-t border-gray-100 mt-3 pt-3 text-sm text-gray-400">이 그룹에 학생이 없습니다.</p>
  }

  return (
    <div className="border-t border-gray-100 mt-3 pt-3 flex flex-col gap-1">
      {missing.map(({ student }) => (
        <div key={student.id} className="flex justify-between items-center px-1 py-1.5 text-sm">
          <span className="text-gray-500">{student.name}</span>
          <span className="text-xs text-[#C0392B]">미제출</span>
        </div>
      ))}
      {missing.length > 0 && done.length > 0 && <div className="border-t border-gray-100 my-1" />}
      {done.map(({ student, score }) => (
        <button key={student.id} onClick={() => setOpenStudentId(student.id)}
          className="flex justify-between items-center px-1 py-1.5 text-sm rounded-lg hover:bg-gray-50 text-left">
          <span className="text-[#2B2B2B]">{student.name}</span>
          <span className="text-xs text-gray-500">{score.correctCount}/{score.total} ›</span>
        </button>
      ))}
    </div>
  )
}
