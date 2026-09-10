import { describe, it, expect } from 'vitest'
import { resetRefusal } from './passwordReset'

const admin   = { role: 'admin' }
const teacher = { role: 'teacher' }
const student = { role: 'student' }

describe('resetRefusal', () => {
  it('관리자가 학생 것을 되돌리는 것만 통과한다', () => {
    expect(resetRefusal(admin, student)).toBeNull()
  })

  it('교사는 되돌릴 수 없다', () => {
    expect(resetRefusal(teacher, student)).toMatch(/관리자만/)
  })

  it('학생은 되돌릴 수 없다', () => {
    expect(resetRefusal(student, student)).toMatch(/관리자만/)
  })

  it('요청자를 못 찾으면 막는다', () => {
    expect(resetRefusal(null, student)).toMatch(/관리자만/)
  })

  it('교사 계정은 대상이 될 수 없다 — 이 통로로 교직원을 잠그면 안 된다', () => {
    expect(resetRefusal(admin, teacher)).toMatch(/학생 계정만/)
  })

  it('다른 관리자 계정도 대상이 될 수 없다', () => {
    expect(resetRefusal(admin, admin)).toMatch(/학생 계정만/)
  })

  it('대상을 못 찾으면 막는다', () => {
    expect(resetRefusal(admin, null)).toMatch(/학생 계정만/)
  })
})
