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

// 이 질문이 답을 기다리는 중인가.
//
// 예전에는 "답변 칸이 비었나"로 판정했다. 이제 대화가 오가므로
// "마지막 글을 누가 썼나"로 본다 — 교사가 답한 뒤 학생이 되물으면
// 그건 다시 답을 기다리는 상태다. 완료로 두면 교사가 놓친다.
export function qnaStatus(question, messages = []) {
  const mine = messages.filter((m) => m.qnaId === question.id)
  if (mine.length === 0) return 'waiting'

  // 목록이 어떤 순서로 들어오든 시각으로 마지막을 고른다
  const last = mine.reduce((a, b) => (a.createdAt > b.createdAt ? a : b))
  return last.authorRole === 'teacher' ? 'answered' : 'waiting'
}

// 교사 화면·대시보드에 띄우는 "지금 답해야 할" 건수
export function unansweredCount(qnaList = [], students = [], classes = [], user, messages = []) {
  return visibleQuestions(qnaList, students, classes, user)
    .filter((q) => qnaStatus(q, messages) === 'waiting')
    .length
}

// 이 글을 지울 수 있는가.
//
//   학생   — 본인이 쓴 글만
//   교사   — 담당 반 학생의 스레드에 달린 모든 글 (학생 글 포함)
//   관리자 — 전체
//
// 교사가 학생 글도 지울 수 있어야 하는 이유: 부적절한 사진을 지울 사람이
// 필요하다. 질문 전체를 지우면 대화가 통째로 사라진다.
export function canDeleteMessage(message, question, students = [], classes = [], user) {
  if (!user || !message || !question) return false

  if (user.role === 'student') {
    if (!user.studentId) return false
    return message.authorRole === 'student' && message.authorId === user.id
  }

  const ids = new Set(visibleStudents(students, classes, user).map((s) => s.id))
  return ids.has(question.studentId)
}

// 이 글을 고칠 수 있는가 — 본인 글만.
//
// 삭제와 규칙이 다르다. 부적절한 글을 치우려면 교사가 남의 글도 지울 수 있어야
// 하지만, 남이 한 말을 고쳐 쓰면 학생이 하지 않은 말이 학생 이름으로 남는다.
// 문제가 있는 글은 지우면 된다.
export function canEditMessage(message, user) {
  if (!user || !message) return false
  return message.authorId === user.id
}
