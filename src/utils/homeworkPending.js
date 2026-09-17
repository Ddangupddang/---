// src/utils/homeworkPending.js
// 대시보드용 — "지금 챙겨야 할 과제 미제출"을 세는 곳.
//
// 마감이 지난 회차만 센다. 아직 마감 전인 과제까지 세면 주 초반에는
// 담당 반 전원이 미제출로 잡혀서, 정작 챙겨야 할 학생이 묻힌다.
//
// 세는 단위는 "학생 수"다. 한 학생이 여러 날 빼먹어도 1명으로 센다 —
// 대시보드에서 알고 싶은 건 "몇 명을 불러야 하는가"이기 때문이다.

import { mondayOf } from './homeworkWeek'
import { HW_CATEGORY } from '../constants/homework'

// 이 과제 세트가 이 학생에게 배정되는가.
// 내신은 학년, 정시는 정시 레벨로 배정된다(반이 아니다).
function assignedTo(set, student) {
  if (set.category === HW_CATEGORY.NAESIN) return set.target === student.grade
  // 정시 레벨이 없는 학생에게는 정시과제가 배정되지 않는다.
  // null === null 로 엉뚱하게 걸리지 않게 값이 있는지 먼저 본다.
  return student.jeongsiLevel != null && set.target === student.jeongsiLevel
}

// 마감이 지난 과제를 안 낸 학생들과, 각자 빠뜨린 요일.
//
//   [{ student, days: [{ day, set }] }]  — 날짜순, 안 낸 학생만
//
// 대시보드 숫자를 누르면 "누가 무엇을 안 냈는지"를 봐야 하는데, 세는 코드와
// 목록 코드를 따로 두면 숫자와 화면이 어긋난다. 그래서 세는 쪽이 이 목록을
// 쓰게 했다 — 한쪽만 고쳐서 어긋나는 일이 생기지 않는다.
//
// students는 이미 "볼 수 있는 학생"으로 걸러진 목록을 받는다(담당 반 판단은 classAccess 담당).
export function pendingHomeworkStudents({ students = [], sets = [], days = [], submissions = [], today }) {
  const weekStart = mondayOf(today)
  // 이번 주 세트만 — set.id로 요일을 찾을 수 있게 표로 만든다
  const setById = new Map(
    sets.filter((s) => s.weekStart === weekStart).map((s) => [s.id, s])
  )
  // 마감이 지난(오늘 포함) 요일만, 날짜순으로.
  // 화면이 "월·수를 빼먹었다"처럼 읽히려면 순서가 정해져 있어야 한다.
  const dueDays = days
    .filter((d) => setById.has(d.setId) && d.date <= today)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.id - b.id))
  if (dueDays.length === 0) return []

  // 제출 여부를 빠르게 보려고 '요일id:학생id'로 모아둔다
  const submitted = new Set(submissions.map((s) => `${s.dayId}:${s.studentId}`))

  return students
    .map((student) => ({
      student,
      days: dueDays
        .filter((day) =>
          assignedTo(setById.get(day.setId), student) && !submitted.has(`${day.id}:${student.id}`)
        )
        .map((day) => ({ day, set: setById.get(day.setId) })),
    }))
    .filter((row) => row.days.length > 0)
}

// 마감이 지난 과제를 안 낸 학생 수.
//
// 세는 단위는 "학생 수"다. 한 학생이 여러 날 빼먹어도 1명으로 센다 —
// 대시보드에서 알고 싶은 건 "몇 명을 불러야 하는가"이기 때문이다.
export function pendingHomeworkCount(args) {
  return pendingHomeworkStudents(args).length
}
