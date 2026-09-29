// src/utils/homeworkBacklog.js
// 주를 넘겨서도 안 낸 과제를 주차별로 모은다.
//
// 목표가 "그 주 학생 전원이 과제를 다 하는 것"이라 주가 주인공이다.
// 학생별로만 줄 세우면 누가 밀렸는지는 보여도 그 주가 끝났는지는 안 보인다.
// 그래서 주마다 완료율과 남은 학생을 함께 담고, 100%가 되면 그 주는 닫힌다.
//
// 이번 주는 담지 않는다 — 미제출 목록(pendingHomeworkStudents)이 이미 맡고 있고,
// 두 곳에 같은 학생이 나오면 어디를 봐야 할지 헷갈린다.

import { mondayOf } from './homeworkWeek'
import { matchesStudent } from './homeworkSelect'

// 지난 주들의 미제출 현황. 최근 주가 앞이다.
//
//   [{ weekStart, total, done, rate, students: [{ student, days: [{ day, set }] }] }]
//
// total은 (배정된 학생 × 회차) 수, done은 그중 제출된 수, rate는 백분율(정수)이다.
// students는 안 낸 학생만, 밀린 건수가 많은 순이다.
//
// students 인자는 이미 "볼 수 있는 학생"으로 걸러진 목록을 받는다(담당 반 판단은 classAccess 담당).
export function backlogWeeks({ students = [], sets = [], days = [], submissions = [], today }) {
  const thisWeek = mondayOf(today)
  const submitted = new Set(submissions.map((s) => `${s.dayId}:${s.studentId}`))

  // 주차별로 세트를 모은다. 지난 주만 본다.
  const setsByWeek = new Map()
  for (const set of sets) {
    if (set.weekStart >= thisWeek) continue
    if (!setsByWeek.has(set.weekStart)) setsByWeek.set(set.weekStart, [])
    setsByWeek.get(set.weekStart).push(set)
  }

  const weeks = []
  for (const [weekStart, weekSets] of setsByWeek) {
    const setById = new Map(weekSets.map((s) => [s.id, s]))
    const weekDays = days
      .filter((d) => setById.has(d.setId))
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.id - b.id))

    let total = 0
    let done  = 0
    const rows = []

    for (const student of students) {
      const missed = []
      for (const day of weekDays) {
        const set = setById.get(day.setId)
        if (!matchesStudent(set, student)) continue
        total += 1
        if (submitted.has(`${day.id}:${student.id}`)) done += 1
        else missed.push({ day, set })
      }
      if (missed.length > 0) rows.push({ student, days: missed })
    }

    // 아무에게도 배정되지 않은 주는 보여줄 것이 없다(남의 반 과제만 있는 주)
    if (total === 0) continue

    // 밀린 건수가 많은 학생부터 — 먼저 불러야 할 사람이 위에 있어야 한다
    rows.sort((a, b) => b.days.length - a.days.length)

    weeks.push({
      weekStart,
      total,
      done,
      rate: Math.round((done / total) * 100),
      students: rows,
    })
  }

  return weeks.sort((a, b) => (a.weekStart < b.weekStart ? 1 : -1))
}
