// src/pages/Tests.test.jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AuthContext } from '../context/AuthContext'
import Tests from './Tests'

// DataContext(useData)를 Mock 데이터로 대체 — 실제 Supabase 연결 없이 UI 로직만 검증
// (DataContext는 createContext 객체를 export하지 않으므로 Provider 대신 useData를 모킹)
vi.mock('../context/DataContext', async () => {
  const { classes }     = await import('../data/classes')
  const { students }    = await import('../data/students')
  const { tests }       = await import('../data/tests')
  const { submissions } = await import('../data/submissions')
  return {
    useData: () => ({
      classes, students, tests, submissions,
      addTest: () => {},
      updateTestStatus: () => {},
      deleteTest: () => {},
      addSubmission: () => {},
      updateSubmissionScores: () => {},
    }),
  }
})

function renderWithAuth(user) {
  return render(
    <AuthContext.Provider value={{ user, login: () => {}, logout: () => {} }}>
      <MemoryRouter>
        <Tests />
      </MemoryRouter>
    </AuthContext.Provider>
  )
}

describe('Tests — 교사 역할', () => {
  const teacher = { id: 2, name: '김선생', role: 'teacher' }

  it('"테스트 만들기" 버튼이 표시', () => {
    renderWithAuth(teacher)
    expect(screen.getByText('+ 테스트 만들기')).toBeInTheDocument()
  })

  it('테스트 목록이 표시 (Mock 데이터)', () => {
    renderWithAuth(teacher)
    expect(screen.getByText('4월 2주차 독서 테스트')).toBeInTheDocument()
  })

  it('"테스트 만들기" 클릭 시 생성 폼으로 전환', () => {
    renderWithAuth(teacher)
    fireEvent.click(screen.getByText('+ 테스트 만들기'))
    expect(screen.getByPlaceholderText('예: 4월 2주차 독서 테스트')).toBeInTheDocument()
  })

  it('테스트 제목 클릭 시 제출 목록으로 전환', () => {
    renderWithAuth(teacher)
    fireEvent.click(screen.getByText('4월 2주차 독서 테스트'))
    expect(screen.getByText('제출 목록')).toBeInTheDocument()
  })
})

describe('Tests — 학생 역할', () => {
  const student = { id: 4, name: '홍길동', role: 'student', classId: 1, studentId: 1 }

  it('"테스트 만들기" 버튼이 없음', () => {
    renderWithAuth(student)
    expect(screen.queryByText('+ 테스트 만들기')).toBeNull()
  })

  it('본인 반(classId:1) 테스트만 표시', () => {
    renderWithAuth(student)
    expect(screen.getByText('4월 2주차 독서 테스트')).toBeInTheDocument()
    expect(screen.queryByText('4월 2주차 문학 테스트')).toBeNull()
  })
})
