// src/components/homework/StudentHomeworkCard.test.jsx
// 학생 대시보드의 이번 주 과제 카드.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import StudentHomeworkCard from './StudentHomeworkCard'
import { mondayOf } from '../../utils/homeworkWeek'
import { dateForWeekday } from '../../utils/homeworkWeek'

const TODAY = new Date().toISOString().slice(0, 10)
const WEEK = mondayOf(TODAY)

const navigate = vi.fn()
vi.mock('react-router-dom', () => ({ useNavigate: () => navigate }))

const state = {}
vi.mock('../../context/DataContext', () => ({ useData: () => state.data }))

beforeEach(() => {
  navigate.mockClear()
  state.data = {
    students: [{ id: 1, name: '고2-A', grade: 5, jeongsiLevel: 2 }],
    homeworkSets: [{ id: 11, category: 'naesin', target: 5, weekStart: WEEK }],
    homeworkDays: [
      { id: 110, setId: 11, weekday: 1, date: dateForWeekday(WEEK, 1) },
      { id: 111, setId: 11, weekday: 6, date: dateForWeekday(WEEK, 6) },
    ],
    homeworkSubmissions: [],
  }
})

describe('StudentHomeworkCard', () => {
  it('이번 주 과제가 없으면 그렇게 알려준다', () => {
    state.data.homeworkSets = []
    render(<StudentHomeworkCard studentId={1} />)
    expect(screen.getByText('이번 주 과제가 없습니다.')).toBeInTheDocument()
  })

  it('제출 수와 전체 수를 보여준다', () => {
    state.data.homeworkSubmissions = [{ dayId: 110, studentId: 1 }]
    render(<StudentHomeworkCard studentId={1} />)

    const card = screen.getByTestId('student-homework-card')
    expect(card).toHaveTextContent('1')
    expect(card).toHaveTextContent('/ 2')
  })

  it('미제출 요일을 마감일과 함께 나열한다', () => {
    render(<StudentHomeworkCard studentId={1} />)
    // 월요일(과거일 수 있음)과 토요일 모두 미제출
    expect(screen.getByText(/월요일/)).toBeInTheDocument()
    expect(screen.getByText(/토요일/)).toBeInTheDocument()
  })

  it('전부 제출하면 미제출 목록 대신 완료 문구를 보여준다', () => {
    state.data.homeworkSubmissions = [
      { dayId: 110, studentId: 1 }, { dayId: 111, studentId: 1 },
    ]
    render(<StudentHomeworkCard studentId={1} />)
    expect(screen.getByText('이번 주 과제를 모두 제출했습니다.')).toBeInTheDocument()
    expect(screen.queryByText(/월요일/)).not.toBeInTheDocument()
  })

  it('다른 학년 과제는 세지 않는다', () => {
    state.data.homeworkSets = [{ id: 12, category: 'naesin', target: 1, weekStart: WEEK }]
    state.data.homeworkDays = [{ id: 120, setId: 12, weekday: 1, date: dateForWeekday(WEEK, 1) }]
    render(<StudentHomeworkCard studentId={1} />)
    expect(screen.getByText('이번 주 과제가 없습니다.')).toBeInTheDocument()
  })

  it('카드를 누르면 과제 페이지로 이동한다', async () => {
    const user = userEvent.setup()
    render(<StudentHomeworkCard studentId={1} />)
    await user.click(screen.getByTestId('student-homework-card'))
    expect(navigate).toHaveBeenCalledWith('/homework')
  })

  it('학생 정보를 찾을 수 없으면 아무것도 그리지 않는다', () => {
    const { container } = render(<StudentHomeworkCard studentId={999} />)
    expect(container).toBeEmptyDOMElement()
  })
})
