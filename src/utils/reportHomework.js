// src/utils/reportHomework.js
// 진도 리포트의 "과제 수행 현황"을 과제 제출 기록으로 자동 판정한다.
//
// 왜 필요한가: 교사가 학생 이름을 하나씩 눌러 체크하고 있었는데,
// 이제 시스템이 누가 냈는지 이미 안다. 같은 정보를 두 번 관리하지 않게 한다.
//
// 다만 교사가 고칠 수 있어야 한다. 종이로 받았거나 사정을 아는 경우가 있기 때문이다.
// 그래서 자동값을 기본으로 쓰되, 교사가 손대면 그 값이 이긴다.
import { matchesStudent } from './homeworkSelect'

// 그 학생이 그날 내야 했던 과제와 실제 제출을 센다.
// 그날 배정된 과제가 없으면 판정할 수 없으므로 null을 돌려준다.
export function autoHomeworkStatus({ student, date, sets, days, submissions }) {
  const mySetIds = new Set(
    sets.filter((s) => matchesStudent(s, student)).map((s) => s.id)
  )
  const dayIds = days
    .filter((d) => d.date === date && mySetIds.has(d.setId))
    .map((d) => d.id)

  if (dayIds.length === 0) return null

  const submitted = dayIds.filter((id) =>
    submissions.some((s) => s.dayId === id && s.studentId === student.id)
  ).length

  // 내신·정시가 겹치는 날은 둘 다 내야 수행으로 본다
  return { total: dayIds.length, submitted, done: submitted === dayIds.length }
}

// 화면에 보일 값 하나를 정한다.
//   manual : 교사가 직접 고침 — 언제나 이긴다
//   auto   : 제출 기록으로 판정
//   stored : 판정할 과제가 없음 → 저장된 값 (과제 기능 이전 리포트가 여기 해당)
export function resolveCheck(entry, auto) {
  if (entry?.manual) return { value: entry.done, source: 'manual' }
  if (auto) return { value: auto.done, source: 'auto' }
  return { value: entry?.done ?? false, source: 'stored' }
}
