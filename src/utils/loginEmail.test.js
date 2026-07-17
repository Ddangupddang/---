import { describe, it, expect } from 'vitest'
import { loginEmail } from './loginEmail'

describe('loginEmail', () => {
  it('ASCII 아이디는 그대로 이메일 로컬파트가 된다 (하위호환)', () => {
    expect(loginEmail('admin')).toBe('admin@soomoonjae.com')
    expect(loginEmail('student1')).toBe('student1@soomoonjae.com')
  })

  it('한글 아이디는 hex로 인코딩된다 (ASCII만 남김)', () => {
    const email = loginEmail('홍길동5678')
    expect(email.endsWith('@soomoonjae.com')).toBe(true)
    expect(email).toMatch(/^[a-f0-9]+@soomoonjae\.com$/) // 로컬파트가 전부 hex
  })

  it('결정적이다 — 같은 아이디는 항상 같은 이메일', () => {
    expect(loginEmail('홍길동5678')).toBe(loginEmail('홍길동5678'))
  })

  it('접미사가 붙은 한글 아이디도 처리된다', () => {
    expect(loginEmail('홍길동5678-2')).toMatch(/^[a-f0-9]+@soomoonjae\.com$/)
  })
})
