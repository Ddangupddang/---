// src/components/homework/StudentHomeworkView.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import StudentHomeworkView from './StudentHomeworkView'
import { mondayOf } from '../../utils/homeworkWeek'

// 이번 주 월요일(테스트 실행 시점 기준)
const WEEK = mondayOf(new Date().toISOString().slice(0, 10))

const state = {}
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ user: { studentId: 7, role: 'student' } }) }))
vi.mock('../../context/DataContext', () => ({ useData: () => state.data }))

beforeEach(() => {
  state.data = {
    students: [{ id: 7, name: '홍길동', grade: 5, jeongsiLevel: null }],
    homeworkSets: [
      { id: 1, category: 'naesin',  target: 5, weekStart: WEEK, title: '내신 세트' },
      { id: 2, category: 'naesin',  target: 4, weekStart: WEEK, title: '다른학년 세트' },
    ],
    homeworkDays: [
      { id: 10, setId: 1, weekday: 1, date: WEEK, questionCount: 2, daySolutionVideoUrl: '', daySolutionFileUrl: '' },
    ],
    homeworkQuestions: [
      { id: 100, dayId: 10, number: 1, answer: '①', solutionVideoUrl: '', solutionFileUrl: '' },
      { id: 101, dayId: 10, number: 2, answer: '②', solutionVideoUrl: '', solutionFileUrl: '' },
    ],
    homeworkSubmissions: [],
    upsertHomeworkSubmission: vi.fn(),
  }
})

describe('StudentHomeworkView (내신)', () => {
  it('자기 학년(5=고2) 세트의 요일만 보인다', () => {
    render(<StudentHomeworkView category="naesin" />)
    expect(screen.getByText('내신 세트')).toBeInTheDocument()
    expect(screen.getByText('월요일 과제')).toBeInTheDocument()
    expect(screen.queryByText('다른학년 세트')).not.toBeInTheDocument()
  })

  it('제출 없으면 미제출 뱃지', () => {
    render(<StudentHomeworkView category="naesin" />)
    expect(screen.getByText('미제출')).toBeInTheDocument()
  })
})

describe('StudentHomeworkView (정시, 레벨 미배정)', () => {
  it('정시 레벨 없으면 안내 문구', () => {
    render(<StudentHomeworkView category="jeongsi" />)
    expect(screen.getByText(/정시 레벨이 배정되지 않았습니다/)).toBeInTheDocument()
  })
})
