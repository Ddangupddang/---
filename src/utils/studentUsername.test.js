import { describe, it, expect } from 'vitest'
import { last4, studentLast4, uniqueUsername, planStudentAccounts } from './studentUsername'

describe('last4', () => {
  it('전화번호 숫자 뒤 4자리를 반환', () => {
    expect(last4('010-1234-5678')).toBe('5678')
  })
  it('전화번호가 없으면 빈 문자열', () => {
    expect(last4('')).toBe('')
    expect(last4(null)).toBe('')
  })
})

describe('studentLast4', () => {
  it('본인 전화를 우선 사용', () => {
    expect(studentLast4({ phone: '010-1111-2222', parentPhone: '010-3333-4444' })).toBe('2222')
  })
  it('본인 전화가 없으면 학부모 전화 사용', () => {
    expect(studentLast4({ phone: '', parentPhone: '010-3333-4444' })).toBe('4444')
  })
  it('둘 다 없으면 빈 문자열', () => {
    expect(studentLast4({ phone: '', parentPhone: '' })).toBe('')
  })
})

describe('uniqueUsername', () => {
  it('충돌 없으면 그대로', () => {
    expect(uniqueUsername('홍길동5678', new Set())).toBe('홍길동5678')
  })
  it('충돌 시 -2, -3 접미사', () => {
    const taken = new Set(['홍길동5678', '홍길동5678-2'])
    expect(uniqueUsername('홍길동5678', taken)).toBe('홍길동5678-3')
  })
})

describe('planStudentAccounts', () => {
  it('이름+전화뒤4자리로 아이디를 만든다', () => {
    const plan = planStudentAccounts(
      [{ id: 1, name: '홍길동', classId: 1, phone: '010-1234-5678', parentPhone: '' }], [])
    expect(plan[0]).toMatchObject({ studentId: 1, username: '홍길동5678', skip: false })
  })
  it('전화 없는 학생은 건너뛴다', () => {
    const plan = planStudentAccounts(
      [{ id: 2, name: '김철수', classId: 1, phone: '', parentPhone: '' }], [])
    expect(plan[0]).toMatchObject({ studentId: 2, skip: true, reason: '전화번호 없음', username: null })
  })
  it('배치 내부 동명이인+같은4자리는 접미사로 유일화', () => {
    const plan = planStudentAccounts([
      { id: 1, name: '홍길동', classId: 1, phone: '010-0000-5678', parentPhone: '' },
      { id: 2, name: '홍길동', classId: 2, phone: '010-9999-5678', parentPhone: '' },
    ], [])
    expect(plan.map((p) => p.username)).toEqual(['홍길동5678', '홍길동5678-2'])
  })
})
