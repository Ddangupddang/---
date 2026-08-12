// src/utils/homeworkSummary.js
// 학생 대시보드용 "이번 주 과제" 한 줄 요약.
// 학생이 과제 탭에 들어가지 않아도 남은 과제를 알 수 있게 하는 것이 목적이다.
// 내신·정시를 가리지 않고 이번 주 내게 배정된 요일 과제를 모두 합쳐서 센다.
import { matchesStudent } from './homeworkSelect'

export function weekHomeworkSummary({ sets, days, submissions, student, weekStart, today }) {
  const mySets = sets.filter((s) => s.weekStart === weekStart && matchesStudent(s, student))
  const categoryOf = new Map(mySets.map((s) => [s.id, s.category]))

  const myDays = days
    .filter((d) => categoryOf.has(d.setId))
    .sort((a, b) => a.date.localeCompare(b.date))

  let submitted = 0
  const pending = []
  for (const day of myDays) {
    const mine = submissions.some((s) => s.dayId === day.id && s.studentId === student.id)
    if (mine) { submitted++; continue }
    pending.push({
      dayId: day.id,
      category: categoryOf.get(day.setId),
      weekday: day.weekday,
      date: day.date,
      // 마감 당일은 아직 낼 수 있으므로 지난 것으로 보지 않는다
      overdue: day.date < today,
    })
  }

  return { total: myDays.length, submitted, pending }
}
