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

// 마감이 지난 과제를 안 낸 학생 수.
// students는 이미 "볼 수 있는 학생"으로 걸러진 목록을 받는다(담당 반 판단은 classAccess 담당).
export function pendingHomeworkCount({ students = [], sets = [], days = [], submissions = [], today }) {
  const weekStart = mondayOf(today)
  // 이번 주 세트만 — set.id로 요일을 찾을 수 있게 표로 만든다
  const setById = new Map(
    sets.filter((s) => s.weekStart === weekStart).map((s) => [s.id, s])
  )
  // 마감이 지난(오늘 포함) 요일만 남긴다
  const dueDays = days.filter((d) => setById.has(d.setId) && d.date <= today)
  if (dueDays.length === 0) return 0

  // 제출 여부를 빠르게 보려고 '요일id:학생id'로 모아둔다
  const submitted = new Set(submissions.map((s) => `${s.dayId}:${s.studentId}`))

  return students.filter((student) =>
    dueDays.some((day) =>
      assignedTo(setById.get(day.setId), student) && !submitted.has(`${day.id}:${student.id}`)
    )
  ).length
}
