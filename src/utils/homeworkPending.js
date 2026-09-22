// src/utils/homeworkPending.js
// 대시보드용 — "지금 챙겨야 할 과제 미제출"을 세는 곳.
//
// 제출 기한이 지난 회차만 센다. 기한은 다음날까지다("월요일 과제는 화요일까지").
// 아직 낼 수 있는 과제까지 세면 매일 오후마다 반 전원이 미제출로 잡혀서,
// 정작 불러야 할 학생이 묻힌다.
//
// 세는 단위는 "학생 수"다. 한 학생이 여러 날 빼먹어도 1명으로 센다 —
// 대시보드에서 알고 싶은 건 "몇 명을 불러야 하는가"이기 때문이다.

import { mondayOf } from './homeworkWeek'
import { matchesStudent, canSubmitOn } from './homeworkSelect'

// 이 과제 세트가 이 학생에게 배정되는가 — 학생 화면·리포트와 같은 규칙을 쓴다.
// 예전엔 여기에 따로 "내신은 학년으로" 규칙을 두었는데, 내신이 반 단위로 바뀐
// 뒤에도 이곳만 학년으로 맞춰서, 고1 학생에게 고1 모든 반의 과제가 붙었다.
// 규칙을 한 곳(matchesStudent)에만 두어 다시 갈라지지 않게 한다.
const assignedTo = matchesStudent

// 기한이 지난 과제를 안 낸 학생들과, 각자 빠뜨린 요일.
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
  // 제출 기한이 지난 요일만, 날짜순으로.
  // 열어준 요일도 남긴다 — 열어줬어도 아직 안 낸 건 안 낸 것이다(그래서 reopened는 넘기지 않는다).
  // 화면이 "월·수를 빼먹었다"처럼 읽히려면 순서가 정해져 있어야 한다.
  const dueDays = days
    .filter((d) => setById.has(d.setId) && !canSubmitOn(d, today))
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

// 기한이 지난 과제를 안 낸 학생 수.
//
// 세는 단위는 "학생 수"다. 한 학생이 여러 날 빼먹어도 1명으로 센다 —
// 대시보드에서 알고 싶은 건 "몇 명을 불러야 하는가"이기 때문이다.
export function pendingHomeworkCount(args) {
  return pendingHomeworkStudents(args).length
}
