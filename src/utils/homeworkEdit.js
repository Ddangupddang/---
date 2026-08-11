// src/utils/homeworkEdit.js
// 이미 출제된 과제를 수정할 때, 그 수정이 "이미 제출한 학생"에게 어떤 영향을 주는지
// 계산하는 순수 함수. 교사가 저장 전에 결과를 알고 결정할 수 있게 하는 것이 목적이다.
//
// 학생 점수는 DB에 저장돼 있지 않고 채점 함수가 그때그때 계산한다.
// 그래서 정답을 고치면 결과가 저절로 다시 계산된다 — 데이터가 사라지지는 않는다.
// 유일하게 되돌릴 수 없는 것은 요일을 통째로 사용 해제하는 경우다(제출이 함께 지워진다).

import { WEEKDAY_LABELS } from '../constants/homework'

export function homeworkEditImpact({ days, questions, submissions, nextDays }) {
  const nextByWeekday = new Map(nextDays.map((d) => [d.weekday, d]))
  const removed = []
  const changed = []

  for (const day of days) {
    // 제출이 0건이면 무엇을 바꾸든 영향받는 학생이 없다 → 조용히 넘어간다
    const students = submissions.filter((s) => s.dayId === day.id).length
    if (students === 0) continue

    const label = WEEKDAY_LABELS[day.weekday]
    const next = nextByWeekday.get(day.weekday)

    if (!next) {
      removed.push({
        type: 'dayRemoved', weekday: day.weekday, students,
        message: `${label}요일 과제를 사용 해제하면 제출 ${students}건이 영구 삭제됩니다. 되돌릴 수 없습니다.`,
      })
      continue
    }

    // 문항 수가 바뀌면 만점 자체가 바뀌므로 정답 비교보다 먼저 알린다
    if (next.questionCount > day.questionCount) {
      changed.push({
        type: 'countIncreased', weekday: day.weekday, students,
        from: day.questionCount, to: next.questionCount,
        message: `${label}요일 문항이 ${day.questionCount}개에서 ${next.questionCount}개로 늘어, 이미 제출한 ${students}명은 늘어난 문항이 오답 처리됩니다.`,
      })
      continue
    }
    if (next.questionCount < day.questionCount) {
      changed.push({
        type: 'countDecreased', weekday: day.weekday, students,
        from: day.questionCount, to: next.questionCount,
        message: `${label}요일 문항이 ${day.questionCount}개에서 ${next.questionCount}개로 줄어, 제출한 ${students}명의 만점이 ${next.questionCount}점으로 바뀝니다.`,
      })
      continue
    }

    const before = new Map(
      questions.filter((q) => q.dayId === day.id).map((q) => [q.number, q.answer])
    )
    const diff = next.questions.filter((q) => before.get(q.number) !== q.answer).length
    if (diff > 0) {
      changed.push({
        type: 'answerChanged', weekday: day.weekday, students, questions: diff,
        message: `${label}요일 ${diff}개 문항의 정답이 바뀌어, 이미 제출한 ${students}명의 채점 결과가 다시 계산됩니다.`,
      })
    }
  }

  // 되돌릴 수 없는 삭제를 먼저 읽게 한다
  return { warnings: [...removed, ...changed], destructive: removed.length > 0 }
}
