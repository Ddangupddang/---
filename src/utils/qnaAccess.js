// src/utils/qnaAccess.js
// 누가 어떤 질문을 볼 수 있는가.
//
// 예전에는 "질문이 달린 테스트를 볼 수 있는가"로 판단했다. 말머리 방식으로 바꾸면서
// 테스트 연결이 없어졌으므로, 이제 "질문한 학생을 볼 수 있는가"로 판단한다.
//
//   관리자 — 전체
//   교사   — 담당 반 학생의 질문
//   학생   — 본인이 쓴 질문만
//
// 학생 범위를 "같은 반"에서 "본인"으로 좁혔다. Q&A는 1:1 상담이고,
// 질문에 답안지 사진이 붙기 때문에 반 친구에게 보이면 안 된다.

import { visibleStudents } from './classAccess'

export function visibleQuestions(qnaList = [], students = [], classes = [], user) {
  if (!user) return []
  // 서버(RLS)도 같은 규칙으로 막지만 여기서 한 번 더 거른다.
  // 정책이 꺼지는 사고가 나도 화면에는 남의 질문이 안 뜨게 하는 이중 방어다.
  if (user.role === 'student') {
    if (!user.studentId) return []
    return qnaList.filter((q) => q.studentId === user.studentId)
  }

  const ids = new Set(visibleStudents(students, classes, user).map((s) => s.id))
  return qnaList.filter((q) => ids.has(q.studentId))
}

// 이 질문을 지울 수 있는가.
//
//   학생   — 본인이 쓴 질문만. 답안지를 잘못 찍어 올렸을 때 선생님께 부탁하지
//            않고 직접 지울 수 있어야 한다.
//   교사   — 담당 반 학생의 질문
//   관리자 — 전체
export function canDeleteQuestion(question, students = [], classes = [], user) {
  if (!user || !question) return false

  if (user.role === 'student') {
    // studentId가 없는 계정을 통과시키면 studentId가 빈 질문을 아무나 지운다
    if (!user.studentId) return false
    return question.studentId === user.studentId
  }

  const ids = new Set(visibleStudents(students, classes, user).map((s) => s.id))
  return ids.has(question.studentId)
}

// 교사 화면·대시보드에 띄우는 "지금 답해야 할" 건수
export function unansweredCount(qnaList = [], students = [], classes = [], user) {
  return visibleQuestions(qnaList, students, classes, user).filter((q) => !q.answer).length
}
