// src/components/homework/DaySubmissionList.jsx
// 교사: 한 요일의 학생별 제출 현황.
// 미제출 학생을 위에 두어 "누가 안 냈는지"가 먼저 보이게 한다.
// 제출한 학생의 이름을 누르면 그 학생의 문항별 정답/오답으로 들어간다.
import { useState } from 'react'
import ChoiceGrid from '../ChoiceGrid'
import Alert from '../ui/Alert'
import { gradeHomework } from '../../utils/homework'

const byName = (a, b) => a.student.name.localeCompare(b.student.name, 'ko')

// onCancel을 받으면 제출 취소 버튼이 생긴다. 권한 판단은 부르는 쪽이 한다.
export default function DaySubmissionList({ students, questions, submissions, onCancel = null }) {
  const [openStudentId, setOpenStudentId] = useState(null)
  const [cancelError, setCancelError] = useState('')

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

  // 되돌릴 수 없는 삭제라 반드시 확인을 받는다
  async function handleCancel(student) {
    setCancelError('')
    const ok = window.confirm(
      `${student.name} 학생의 제출을 취소합니다.\n` +
      '답안이 완전히 삭제되며 되돌릴 수 없습니다.\n\n계속하시겠습니까?'
    )
    if (!ok) return
    // 실패했는데 목록으로 돌아가면 지워진 것처럼 보인다 — 상세에 머무르며 알린다
    if (await onCancel(student.id)) setOpenStudentId(null)
    else setCancelError('제출 취소에 실패했습니다. 잠시 후 다시 시도해 주세요.')
  }

  // 한 학생의 문항별 결과
  const open = done.find((r) => r.student.id === openStudentId)
  if (open) {
    const values = Object.fromEntries(open.submission.answers.map((a) => [a.number, a.answer]))
    const answerKey = Object.fromEntries(questions.map((q) => [q.number, q.answer]))
    return (
      <div className="border-t border-line mt-3 pt-3">
        <button onClick={() => setOpenStudentId(null)} className="text-sm text-ink-mute mb-2">← 학생 목록</button>
        <p className="text-sm font-semibold text-ink mb-2">
          {open.student.name}
          <span className="ml-2 font-normal text-ink-mute">{open.score.correctCount}/{open.score.total}</span>
        </p>
        <ChoiceGrid count={questions.length} mode="result" values={values} answerKey={answerKey} onChange={() => {}} />
        {cancelError && <Alert tone="danger" className="mt-3">{cancelError}</Alert>}
        {/* 이 화면의 본론은 정오답 확인이다. 취소는 가끔 쓰는 곁가지라
            해설 파일 삭제와 같은 작은 스타일을 쓴다 — 큰 danger 버튼은
            확인 모달의 확정 버튼 자리다(Staff/Students). */}
        {onCancel && (
          <div className="mt-4 pt-3 border-t border-line-soft">
            <button type="button" onClick={() => handleCancel(open.student)}
              className="text-xs px-2 py-1 rounded bg-danger-soft text-danger font-medium">
              제출 취소
            </button>
            <p className="text-xs text-ink-mute mt-1">
              취소하면 답안이 지워지고 {open.student.name} 학생이 다시 풀어 낼 수 있습니다.
            </p>
          </div>
        )}
      </div>
    )
  }

  if (rows.length === 0) {
    return <p className="border-t border-line mt-3 pt-3 text-sm text-ink-faint">이 그룹에 학생이 없습니다.</p>
  }

  return (
    <div className="border-t border-line mt-3 pt-3 flex flex-col gap-1">
      {missing.map(({ student }) => (
        <div key={student.id} className="flex justify-between items-center px-1 py-1.5 text-sm">
          <span className="text-ink-mute">{student.name}</span>
          <span className="text-xs text-danger">미제출</span>
        </div>
      ))}
      {missing.length > 0 && done.length > 0 && <div className="border-t border-line my-1" />}
      {done.map(({ student, score }) => (
        <button key={student.id} onClick={() => setOpenStudentId(student.id)}
          className="flex justify-between items-center px-1 py-1.5 text-sm rounded hover:bg-surface-alt text-left">
          <span className="text-ink">{student.name}</span>
          <span className="text-xs text-ink-mute">{score.correctCount}/{score.total} ›</span>
        </button>
      ))}
    </div>
  )
}
