import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { AuthProvider, useAuth } from './AuthContext'

function TestComponent() {
  const { user, login, logout } = useAuth()
  return (
    <div>
      <span data-testid="role">{user?.role ?? 'none'}</span>
      <button onClick={() => login('admin', '1234')}>관리자 로그인</button>
      <button onClick={() => login('student1', '1234')}>학생 로그인</button>
      <button onClick={() => login('wrong', 'wrong')}>잘못된 로그인</button>
      <button onClick={logout}>로그아웃</button>
    </div>
  )
}

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('초기 상태는 로그인 안 된 상태', () => {
    render(<AuthProvider><TestComponent /></AuthProvider>)
    expect(screen.getByTestId('role').textContent).toBe('none')
  })

  it('admin 로그인 성공 시 role이 admin', async () => {
    render(<AuthProvider><TestComponent /></AuthProvider>)
    await act(async () => {
      screen.getByText('관리자 로그인').click()
    })
    expect(screen.getByTestId('role').textContent).toBe('admin')
  })

  it('student1 로그인 성공 시 role이 student', async () => {
    render(<AuthProvider><TestComponent /></AuthProvider>)
    await act(async () => {
      screen.getByText('학생 로그인').click()
    })
    expect(screen.getByTestId('role').textContent).toBe('student')
  })

  it('잘못된 계정으로 로그인 시 user는 null 유지', async () => {
    render(<AuthProvider><TestComponent /></AuthProvider>)
    await act(async () => {
      screen.getByText('잘못된 로그인').click()
    })
    expect(screen.getByTestId('role').textContent).toBe('none')
  })

  it('로그아웃 시 user가 null', async () => {
    render(<AuthProvider><TestComponent /></AuthProvider>)
    await act(async () => {
      screen.getByText('관리자 로그인').click()
    })
    await act(async () => {
      screen.getByText('로그아웃').click()
    })
    expect(screen.getByTestId('role').textContent).toBe('none')
  })

  it('로그인 상태가 localStorage에 저장됨', async () => {
    render(<AuthProvider><TestComponent /></AuthProvider>)
    await act(async () => {
      screen.getByText('관리자 로그인').click()
    })
    const saved = JSON.parse(localStorage.getItem('soomoonjae_user'))
    expect(saved?.role).toBe('admin')
  })
})
