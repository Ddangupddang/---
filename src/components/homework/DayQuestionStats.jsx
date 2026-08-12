// src/components/homework/DayQuestionStats.jsx
// 교사: 한 요일의 문항별 오답률.
// 개인 점수가 아니라 "반 전체가 틀린 문항"을 찾아 다음 수업에 반영하기 위한 화면이다.
import { questionStats } from '../../utils/homeworkStats'

// 절반 넘게 틀린 문항은 수업에서 다시 다뤄야 한다고 보고 따로 표시한다
const NEEDS_REVIEW = 50

export default function DayQuestionStats({ questions, submissions }) {
  if (questions.length === 0) {
    return <p className="border-t border-gray-100 mt-3 pt-3 text-sm text-gray-400">등록된 문항이 없습니다.</p>
  }
  if (submissions.length === 0) {
    return <p className="border-t border-gray-100 mt-3 pt-3 text-sm text-gray-400">아직 제출한 학생이 없습니다.</p>
  }

  const stats = questionStats(questions, submissions)
  const review = stats.filter((s) => s.wrongRate != null && s.wrongRate >= NEEDS_REVIEW)

  return (
    <div data-testid="day-question-stats" className="border-t border-gray-100 mt-3 pt-3">
      <div className="flex justify-between items-center mb-2">
        <p className="text-sm font-semibold text-gray-700">문항별 오답률</p>
        <p className="text-xs text-gray-400">제출 {submissions.length}명</p>
      </div>

      {review.length > 0 && (
        <p className="text-xs text-[#C0392B] bg-[#C0392B]/10 rounded-lg px-2 py-1.5 mb-2">
          절반 이상이 틀린 문항: {review.map((s) => `${s.number}번`).join(', ')}
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        {stats.map((s) => (
          <div key={s.number} data-testid={`qstat-${s.number}`}>
            <div className="flex items-center gap-2">
              <span className="w-8 shrink-0 text-xs font-semibold text-gray-500">{s.number}번</span>
              <span className="w-5 shrink-0 text-sm text-gray-700">{s.answer}</span>
              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${s.wrongRate >= NEEDS_REVIEW ? 'bg-[#C0392B]' : 'bg-[#f39c12]'}`}
                  style={{ width: `${s.wrongRate ?? 0}%` }}
                />
              </div>
              <span className={`w-10 shrink-0 text-right text-xs ${
                s.wrongRate >= NEEDS_REVIEW ? 'text-[#C0392B] font-semibold' : 'text-gray-500'
              }`}>
                {s.wrongRate == null ? '—' : `${s.wrongRate}%`}
              </span>
            </div>
            {s.topWrong && (
              <p className="pl-[3.25rem] text-xs text-gray-400">
                {s.topWrong.choice} 고른 학생 {s.topWrong.count}명
                {s.blank > 0 && ` · 무응답 ${s.blank}명`}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
