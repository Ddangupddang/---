import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { AuthContext } from '../context/AuthContext'
import ProtectedRoute from './ProtectedRoute'

function renderWithAuth(user, element) {
  return render(
    <AuthContext.Provider value={{ user, login: () => {}, logout: () => {} }}>
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route path="/login" element={<div>로그인 페이지</div>} />
          <Route path="/dashboard" element={<div>대시보드</div>} />
          <Route
            path="/protected"
            element={
              <ProtectedRoute allowedRoles={['admin', 'teacher']}>
                <div>보호된 페이지</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>
  )
}

describe('ProtectedRoute', () => {
  it('비로그인 상태에서 /login으로 리다이렉트', () => {
    renderWithAuth(null, null)
    expect(screen.getByText('로그인 페이지')).toBeInTheDocument()
  })

  it('권한 있는 역할(admin)은 페이지 접근 허용', () => {
    renderWithAuth({ role: 'admin' }, null)
    expect(screen.getByText('보호된 페이지')).toBeInTheDocument()
  })

  it('권한 없는 역할(student)은 /dashboard로 리다이렉트', () => {
    renderWithAuth({ role: 'student' }, null)
    expect(screen.getByText('대시보드')).toBeInTheDocument()
  })
})
