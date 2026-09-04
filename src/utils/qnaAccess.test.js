// src/utils/qnaAccess.test.js
import { describe, it, expect } from 'vitest'
import { visibleQuestions, unansweredCount, canDeleteQuestion } from './qnaAccess'

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

describe('unansweredCount', () => {
  it('답변이 없는 것만, 볼 수 있는 범위에서 센다', () => {
    // t1은 A반(가)만 본다 → 미답변 1건
    expect(unansweredCount(QNA, STUDENTS, CLASSES, { id: 't1', role: 'teacher' })).toBe(1)
    // t2는 B반(나)만 보는데 그건 이미 답변됨 → 0건
    expect(unansweredCount(QNA, STUDENTS, CLASSES, { id: 't2', role: 'teacher' })).toBe(0)
    // 관리자는 100, 300 두 건
    expect(unansweredCount(QNA, STUDENTS, CLASSES, { id: 'a', role: 'admin' })).toBe(2)
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
