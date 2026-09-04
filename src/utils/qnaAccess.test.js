// src/utils/qnaAccess.test.js
import { describe, it, expect } from 'vitest'
import {
  visibleQuestions, unansweredCount, canDeleteQuestion,
  qnaStatus, canDeleteMessage, canEditMessage,
} from './qnaAccess'

const CLASSES = [
  { id: 10, name: 'A반', teacherId: 't1' },
  { id: 20, name: 'B반', teacherId: 't2' },
]
const STUDENTS = [
  { id: 1, name: '가', classId: 10 },
  { id: 2, name: '나', classId: 20 },
  { id: 3, name: '다', classId: null }, // 반 미배정
]
const QNA = [
  { id: 100, studentId: 1, content: 'A반 질문', answer: null },
  { id: 200, studentId: 2, content: 'B반 질문', answer: '답' },
  { id: 300, studentId: 3, content: '반 없는 학생 질문', answer: null },
]

const see = (user) => visibleQuestions(QNA, STUDENTS, CLASSES, user).map((q) => q.id)

describe('visibleQuestions', () => {
  it('관리자는 전부 본다', () => {
    expect(see({ id: 'a', role: 'admin' })).toEqual([100, 200, 300])
  })

  it('교사는 담당 반 학생의 질문만 본다', () => {
    expect(see({ id: 't1', role: 'teacher' })).toEqual([100])
    expect(see({ id: 't2', role: 'teacher' })).toEqual([200])
  })

  it('반이 없는 학생의 질문은 교사에게 안 보인다 (관리자만 본다)', () => {
    expect(see({ id: 't1', role: 'teacher' })).not.toContain(300)
    expect(see({ id: 't2', role: 'teacher' })).not.toContain(300)
    expect(see({ id: 'a', role: 'admin' })).toContain(300)
  })

  it('담당 반이 없는 교사는 아무것도 못 본다', () => {
    expect(see({ id: 't9', role: 'teacher' })).toEqual([])
  })

  it('학생은 본인이 쓴 질문만 본다', () => {
    // Q&A는 1:1 상담이다. 같은 반이라도 남의 질문은 안 보인다 —
    // 질문에 붙은 답안지 사진이 반 전체로 새는 걸 막는다.
    expect(see({ id: 's1', role: 'student', studentId: 1, classId: 10 })).toEqual([100])
    expect(see({ id: 's2', role: 'student', studentId: 2, classId: 20 })).toEqual([200])
  })

  it('학생 계정에 학생 정보가 안 붙어 있으면 아무것도 안 준다', () => {
    // studentId가 없는데 통과시키면 남의 질문이 통째로 보인다
    expect(see({ id: 's9', role: 'student', studentId: null, classId: 10 })).toEqual([])
  })

  it('로그인 정보가 없으면 아무것도 안 준다', () => {
    expect(visibleQuestions(QNA, STUDENTS, CLASSES, null)).toEqual([])
  })
})


describe('canDeleteQuestion', () => {
  const q = (studentId) => ({ id: 1, studentId })
  const can = (question, user) => canDeleteQuestion(question, STUDENTS, CLASSES, user)

  it('학생은 본인이 쓴 질문을 지울 수 있다', () => {
    // 답안지를 잘못 찍어 올렸을 때 선생님께 부탁하지 않고 직접 지울 수 있어야 한다
    expect(can(q(1), { id: 's1', role: 'student', studentId: 1 })).toBe(true)
  })

  it('학생은 남의 질문을 지울 수 없다', () => {
    expect(can(q(2), { id: 's1', role: 'student', studentId: 1 })).toBe(false)
  })

  it('계정에 학생 정보가 없으면 지울 수 없다', () => {
    // studentId가 없는데 통과시키면 studentId 없는 질문을 아무나 지운다
    expect(can(q(1), { id: 's9', role: 'student', studentId: null })).toBe(false)
  })

  it('교사는 담당 반 학생의 질문을 지울 수 있다', () => {
    expect(can(q(1), { id: 't1', role: 'teacher' })).toBe(true)
  })

  it('교사는 다른 반 학생의 질문을 지울 수 없다', () => {
    expect(can(q(2), { id: 't1', role: 'teacher' })).toBe(false)
  })

  it('관리자는 반이 없는 학생의 질문까지 지울 수 있다', () => {
    expect(can(q(3), { id: 'a', role: 'admin' })).toBe(true)
  })

  it('로그인 정보나 질문이 없으면 지울 수 없다', () => {
    expect(can(q(1), null)).toBe(false)
    expect(canDeleteQuestion(null, STUDENTS, CLASSES, { id: 'a', role: 'admin' })).toBe(false)
  })
})

describe('qnaStatus', () => {
  const q = { id: 100, studentId: 1 }
  const msg = (id, role, at) => ({ id, qnaId: 100, authorRole: role, createdAt: at })

  it('글이 없으면 답변 대기다', () => {
    expect(qnaStatus(q, [])).toBe('waiting')
  })

  it('마지막 글이 교사면 답변 완료다', () => {
    expect(qnaStatus(q, [
      msg(1, 'student', '2026-09-04T01:00:00Z'),
      msg(2, 'teacher', '2026-09-04T02:00:00Z'),
    ])).toBe('answered')
  })

  it('교사가 답한 뒤 학생이 되물으면 다시 답변 대기다', () => {
    // 추가 질문도 답을 기다리는 것이다. 이걸 완료로 두면 교사가 놓친다.
    expect(qnaStatus(q, [
      msg(1, 'teacher', '2026-09-04T02:00:00Z'),
      msg(2, 'student', '2026-09-04T03:00:00Z'),
    ])).toBe('waiting')
  })

  it('순서가 뒤섞여 들어와도 시각으로 마지막을 고른다', () => {
    expect(qnaStatus(q, [
      msg(2, 'student', '2026-09-04T03:00:00Z'),
      msg(1, 'teacher', '2026-09-04T02:00:00Z'),
    ])).toBe('waiting')
  })

  it('다른 질문의 글은 보지 않는다', () => {
    expect(qnaStatus(q, [
      { id: 9, qnaId: 999, authorRole: 'teacher', createdAt: '2026-09-04T05:00:00Z' },
    ])).toBe('waiting')
  })
})

describe('unansweredCount (대화 기준)', () => {
  const messages = [
    // 100번(가)은 교사가 답했다 → 완료
    { id: 1, qnaId: 100, authorRole: 'teacher', createdAt: '2026-09-04T02:00:00Z' },
    // 200번(나)은 교사가 답한 뒤 학생이 되물었다 → 대기
    { id: 2, qnaId: 200, authorRole: 'teacher', createdAt: '2026-09-04T02:00:00Z' },
    { id: 3, qnaId: 200, authorRole: 'student', createdAt: '2026-09-04T03:00:00Z' },
  ]

  it('마지막 글이 학생인 질문을 미답변으로 센다', () => {
    // t1은 A반(가)만 본다 → 100번은 완료이므로 0건
    expect(unansweredCount(QNA, STUDENTS, CLASSES, { id: 't1', role: 'teacher' }, messages)).toBe(0)
    // t2는 B반(나)만 본다 → 200번은 되물음 상태이므로 1건
    expect(unansweredCount(QNA, STUDENTS, CLASSES, { id: 't2', role: 'teacher' }, messages)).toBe(1)
  })

  it('글이 하나도 없으면 전부 미답변이다', () => {
    expect(unansweredCount(QNA, STUDENTS, CLASSES, { id: 'a', role: 'admin' }, [])).toBe(3)
  })
})

describe('canDeleteMessage', () => {
  const question = { id: 100, studentId: 1 }
  const msg = (authorId, role) => ({ id: 1, qnaId: 100, authorId, authorRole: role })
  const can = (m, user) => canDeleteMessage(m, question, STUDENTS, CLASSES, user)

  it('학생은 본인이 쓴 글을 지울 수 있다', () => {
    expect(can(msg('s1', 'student'), { id: 's1', role: 'student', studentId: 1 })).toBe(true)
  })

  it('학생은 선생님 글을 지울 수 없다', () => {
    expect(can(msg('t1', 'teacher'), { id: 's1', role: 'student', studentId: 1 })).toBe(false)
  })

  it('교사는 그 스레드의 학생 글도 지울 수 있다', () => {
    // 부적절한 사진을 지울 사람이 필요하다. 질문 전체를 지우면 대화가 통째로 사라진다.
    expect(can(msg('s1', 'student'), { id: 't1', role: 'teacher' })).toBe(true)
  })

  it('담당 반이 아닌 교사는 지울 수 없다', () => {
    expect(can(msg('s1', 'student'), { id: 't2', role: 'teacher' })).toBe(false)
  })

  it('로그인 정보나 글이 없으면 지울 수 없다', () => {
    expect(can(msg('s1', 'student'), null)).toBe(false)
    expect(canDeleteMessage(null, question, STUDENTS, CLASSES, { id: 'a', role: 'admin' })).toBe(false)
  })
})

describe('canEditMessage', () => {
  const msg = (authorId) => ({ id: 1, qnaId: 100, authorId, authorRole: 'student' })

  it('본인이 쓴 글은 고칠 수 있다', () => {
    expect(canEditMessage(msg('s1'), { id: 's1', role: 'student', studentId: 1 })).toBe(true)
  })

  it('교사여도 남의 글은 고칠 수 없다', () => {
    // 지우는 건 관리를 위해 필요하지만, 남의 말을 고쳐 쓰는 건 다른 얘기다.
    // 학생이 하지 않은 말이 학생 이름으로 남는다.
    expect(canEditMessage(msg('s1'), { id: 't1', role: 'teacher' })).toBe(false)
    expect(canEditMessage(msg('s1'), { id: 'a', role: 'admin' })).toBe(false)
  })

  it('로그인 정보나 글이 없으면 고칠 수 없다', () => {
    expect(canEditMessage(msg('s1'), null)).toBe(false)
    expect(canEditMessage(null, { id: 's1', role: 'student' })).toBe(false)
  })
})
