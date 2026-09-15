// src/utils/homeworkOpenPast.js
// 학생 화면에 "선생님이 열어준 지난 과제"로 띄울 요일을 고른다.
//
// 학생 화면은 이번 주 세트만 보여준다. 그래서 교사가 지난 주 요일을 열어 줘도
// 학생에게는 그 요일이 아예 나타나지 않았다 — 교사 화면에는 '열림'이라고
// 떠 있는데 학생은 낼 방법이 없는 상태였다.
//
// 신입생에게 입학 전 과제를 받는 것도 이 목록으로 한다.
import { matchesStudent } from './homeworkSelect.js'

// 돌려주는 것: [{ day, set }] — 날짜가 이른 것부터.
// weekStart(이번 주)에 속한 요일은 뺀다. 그건 원래 목록에 이미 있다.
export function reopenedPastDays({
  sets = [], days = [], reopens = [], student, category, weekStart,
}) {
  if (!student) return []

  // 내게 열린 요일 번호만 추린다
  const openedDayIds = new Set(
    reopens.filter((r) => r.studentId === student.id).map((r) => r.dayId)
  )
  if (openedDayIds.size === 0) return []

  // 내가 받는 세트 중 이번 주가 아닌 것
  const pastSets = new Map(
    sets
      .filter((s) => s.category === category && s.weekStart !== weekStart && matchesStudent(s, student))
      .map((s) => [s.id, s])
  )
  if (pastSets.size === 0) return []

  return days
    .filter((d) => openedDayIds.has(d.id) && pastSets.has(d.setId))
    .map((d) => ({ day: d, set: pastSets.get(d.setId) }))
    .sort((a, b) => a.day.date.localeCompare(b.day.date))
}
