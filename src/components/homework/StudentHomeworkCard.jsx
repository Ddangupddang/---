// src/components/homework/StudentHomeworkCard.jsx
// 학생 대시보드: 이번 주 과제 요약.
// 과제 탭에 들어가야만 과제를 알 수 있던 문제를 없애는 것이 목적이라,
// 남은 과제와 마감 지난 과제를 로그인 직후 화면에서 바로 보여준다.
import { useNavigate } from 'react-router-dom'
import { useData } from '../../context/DataContext'
import { weekHomeworkSummary } from '../../utils/homeworkSummary'
import { mondayOf } from '../../utils/homeworkWeek'
import { WEEKDAY_LABELS, CATEGORY_LABELS } from '../../constants/homework'

export default function StudentHomeworkCard({ studentId }) {
  const navigate = useNavigate()
  const {
    students = [], homeworkSets = [], homeworkDays = [], homeworkSubmissions = [],
  } = useData()

  const me = students.find((s) => s.id === studentId)
  if (!me) return null

  const today = new Date().toISOString().slice(0, 10)
  const { total, submitted, pending } = weekHomeworkSummary({
    sets: homeworkSets,
    days: homeworkDays,
    submissions: homeworkSubmissions,
    student: me,
    weekStart: mondayOf(today),
    today,
  })

  const overdue = pending.filter((p) => p.overdue).length
  const allDone = total > 0 && pending.length === 0

  return (
    <button
      data-testid="student-homework-card"
      onClick={() => navigate('/homework')}
      className="bg-surface border border-line rounded p-4 text-left"
    >
      <div className="flex justify-between items-center">
        <h3 className="font-bold text-ink">이번 주 과제</h3>
        {total > 0 && (
          <span className={`text-2xl font-bold ${overdue > 0 ? 'text-danger' : 'text-navy'}`}>
            {submitted}
            <span className="text-base text-ink-faint"> / {total}</span>
          </span>
        )}
      </div>

      {total === 0 ? (
        <p className="text-sm text-ink-faint text-center py-1 mt-2">이번 주 과제가 없습니다.</p>
      ) : allDone ? (
        <p className="text-sm text-navy mt-2">이번 주 과제를 모두 제출했습니다.</p>
      ) : (
        <div className="flex flex-col gap-1 mt-3">
          {pending.map((p) => (
            <div key={p.dayId} className="flex justify-between items-center text-sm">
              <span className={p.overdue ? 'text-danger font-medium' : 'text-ink-soft'}>
                {WEEKDAY_LABELS[p.weekday]}요일
                <span className="text-xs text-ink-faint ml-2">{CATEGORY_LABELS[p.category]}</span>
              </span>
              <span className={`text-xs ${p.overdue ? 'text-danger' : 'text-ink-faint'}`}>
                {p.overdue ? `마감 지남 · ${p.date}` : `마감 ${p.date}`}
              </span>
            </div>
          ))}
        </div>
      )}
    </button>
  )
}
