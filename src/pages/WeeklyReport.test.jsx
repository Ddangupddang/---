// src/pages/WeeklyReport.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import WeeklyReport from './WeeklyReport'

const state = {}
vi.mock('../context/AuthContext', () => ({ useAuth: () => state.auth }))
vi.mock('../context/DataContext', () => ({ useData: () => state.data }))
vi.mock('../components/Layout', () => ({ default: ({ children }) => <div>{children}</div> }))

beforeEach(() => {
  state.auth = { user: { id: 'teacher-1', role: 'teacher' } }
  state.data = {
    classes: [{ id: 10, name: '수능국어A반' }],
    students: [{ id: 1, name: '김민서', classId: 10, grade: 5, jeongsiLevel: null }],
    attendance: [], tests: [], submissions: [],
    homeworkSets: [], homeworkDays: [], homeworkQuestions: [], homeworkSubmissions: [],
    weeklyNotes: [],
    upsertWeeklyNote: vi.fn().mockResolvedValue({ id: 1, content: 'ok' }),
  }
})

describe('WeeklyReport', () => {
  it('학생은 접근할 수 없다', () => {
    state.auth = { user: { id: 's1', role: 'student', studentId: 1 } }
    render(<WeeklyReport />)
    expect(screen.getByText(/접근 권한이 없습니다/)).toBeInTheDocument()
  })

  it('교사는 반의 주간 표를 본다', () => {
    render(<WeeklyReport />)
    expect(screen.getByText('주간 리포트')).toBeInTheDocument()
    expect(screen.getByText('김민서')).toBeInTheDocument()
  })

  it('이전 주 버튼을 누르면 표시되는 주가 바뀐다', async () => {
    const user = userEvent.setup()
    render(<WeeklyReport />)
    const before = screen.getByTestId('week-label').textContent
    await user.click(screen.getByRole('button', { name: '이전 주' }))
    expect(screen.getByTestId('week-label').textContent).not.toBe(before)
  })

  it('학생을 누르면 개인 상세로 들어가고 목록으로 돌아온다', async () => {
    const user = userEvent.setup()
    render(<WeeklyReport />)

    await user.click(screen.getByText('김민서'))
    expect(screen.getByText('교사 코멘트')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /목록/ }))
    expect(screen.queryByText('교사 코멘트')).not.toBeInTheDocument()
  })
})
