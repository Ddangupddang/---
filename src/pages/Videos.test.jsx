// src/pages/Videos.test.jsx
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AuthContext } from '../context/AuthContext'
import Videos from './Videos'

function renderWithAuth(user) {
  return render(
    <AuthContext.Provider value={{ user, login: () => {}, logout: () => {} }}>
      <MemoryRouter>
        <Videos />
      </MemoryRouter>
    </AuthContext.Provider>
  )
}

describe('Videos — 교사 역할', () => {
  const teacher = { id: 2, name: '김선생', role: 'teacher' }

  it('"영상 등록" 버튼이 표시', () => {
    renderWithAuth(teacher)
    expect(screen.getByText('+ 영상 등록')).toBeInTheDocument()
  })

  it('전체 영상 카드가 표시 (Mock 데이터 3개)', () => {
    renderWithAuth(teacher)
    expect(screen.getByText('1강. 화법과 작문 기초')).toBeInTheDocument()
    expect(screen.getByText('2강. 독서 비문학 전략')).toBeInTheDocument()
    expect(screen.getByText('1강. 현대시 분석 기초')).toBeInTheDocument()
  })

  it('"영상 등록" 클릭 시 등록 폼이 열림', () => {
    renderWithAuth(teacher)
    fireEvent.click(screen.getByText('+ 영상 등록'))
    expect(screen.getByText('영상 등록')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('https://youtu.be/...')).toBeInTheDocument()
  })

  it('영상 카드 클릭 시 플레이어 화면으로 전환', () => {
    renderWithAuth(teacher)
    fireEvent.click(screen.getByText('1강. 화법과 작문 기초'))
    expect(screen.getByText('← 목록으로')).toBeInTheDocument()
  })
})

describe('Videos — 학생 역할', () => {
  // classId: 1인 학생 (수능국어A반)
  const student = { id: 3, name: '홍길동', role: 'student', classId: 1 }

  it('"영상 등록" 버튼이 표시되지 않음', () => {
    renderWithAuth(student)
    expect(screen.queryByText('+ 영상 등록')).toBeNull()
  })

  it('본인 반(classId:1) 영상만 표시', () => {
    renderWithAuth(student)
    expect(screen.getByText('1강. 화법과 작문 기초')).toBeInTheDocument()
    // classId:2 영상은 표시 안 됨
    expect(screen.queryByText('1강. 현대시 분석 기초')).toBeNull()
  })
})
