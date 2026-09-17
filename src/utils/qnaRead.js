// src/utils/qnaRead.js
// 교사가 단 답을 학생이 봤는지 판정하는 곳.
//
// 읽은 기록은 질문 하나당 한 줄이다(qna_reads). 학생이 그 질문을 열 때마다
// 읽은 시각을 새로 적는다. 그래서 "이 글을 읽었나"는 글이 올라온 시각과
// 마지막으로 읽은 시각을 견주면 된다.
//
// 글자끼리 비교하지 않고 시각으로 비교한다 — 같은 순간도 `+09:00`과 `Z`로
// 적히면 글자 순서가 뒤집힌다.

// 이 질문을 읽은 시각 (학생 본인의 기록만 본다). 없으면 null.
function readTimeOf(question, reads = []) {
  const mine = reads.find(
    (r) => r.qnaId === question.id && r.studentId === question.studentId
  )
  return mine?.readAt ? new Date(mine.readAt).getTime() : null
}

// 이 글(교사 답변)을 학생이 봤는가.
export function isMessageRead(message, question, reads = []) {
  const readAt = readTimeOf(question, reads)
  if (readAt === null) return false
  return readAt >= new Date(message.createdAt).getTime()
}

// 이 질문의 읽음 상태.
//
//   'none'   — 아직 교사 답변이 없다. 보여줄 것이 없다.
//   'read'   — 마지막 답변까지 학생이 봤다.
//   'unread' — 아직 못 본 답변이 있다.
//
// 마지막 답변을 기준으로 삼는 이유: 학생이 읽은 뒤 교사가 또 답하면 그건 다시
// 안 읽은 상태다. 처음 답변만 보면 영영 '읽음'으로 남는다.
export function qnaReadState(question, messages = [], reads = []) {
  const answers = messages.filter(
    (m) => m.qnaId === question.id && m.authorRole === 'teacher'
  )
  if (answers.length === 0) return 'none'

  const last = answers.reduce((a, b) =>
    new Date(a.createdAt).getTime() > new Date(b.createdAt).getTime() ? a : b
  )
  return isMessageRead(last, question, reads) ? 'read' : 'unread'
}
