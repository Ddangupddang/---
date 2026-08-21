// src/utils/qnaAccess.js
// 누가 어떤 질문을 볼 수 있는가.
//
// 예전에는 "질문이 달린 테스트를 볼 수 있는가"로 판단했다. 말머리 방식으로 바꾸면서
// 테스트 연결이 없어졌으므로, 이제 "질문한 학생을 볼 수 있는가"로 판단한다.

import { visibleStudents } from './classAccess'

export function visibleQuestions(qnaList = [], students = [], classes = [], user) {
  if (!user) return []
  // 학생 계정은 같은 반 친구의 students 행을 아예 받지 못한다(서버 RLS).
  // 그래서 작성자로 거를 수가 없다 — 학생 화면의 범위는 서버가 정해서 내려준다.
  if (user.role === 'student') return qnaList

  const ids = new Set(visibleStudents(students, classes, user).map((s) => s.id))
  return qnaList.filter((q) => ids.has(q.studentId))
}

// 교사 화면·대시보드에 띄우는 "지금 답해야 할" 건수
export function unansweredCount(qnaList = [], students = [], classes = [], user) {
  return visibleQuestions(qnaList, students, classes, user).filter((q) => !q.answer).length
}
