import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import HomeworkBacklogList from './HomeworkBacklogList'

// 오늘은 2026-08-24(월). 지난 주는 08-17 주다.
vi.mock('../../utils/datetime', async (orig) => ({
  ...(await orig()),
  todayKST: () => '2026-08-24',
}))

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1', role: 'teacher' } }),
}))

const openHomeworkDay  = vi.fn(() => Promise.resolve({ id: 1 }))
const closeHomeworkDay = vi.fn(() => Promise.resolve(true))

let data
vi.mock('../../context/DataContext', () => ({
  useData: () => data,
}))

const CLASSES  = [{ id: 7, name: '고2 A반', teacherId: 'u1' }]
const STUDENTS = [
  { id: 1, name: '김가나', classId: 7, grade: 5, jeongsiLevel: null },
  { id: 2, name: '이다라', classId: 7, grade: 5, jeongsiLevel: null },
]
const SETS = [{ id: 11, category: 'naesin', classId: 7, target: null, weekStart: '2026-08-17', title: '8월 3주' }]
const DAYS = [
  { id: 110, setId: 11, weekday: 1, date: '2026-08-17' },
  { id: 112, setId: 11, weekday: 3, date: '2026-08-19' },
]

beforeEach(() => {
  openHomeworkDay.mockClear()
  closeHomeworkDay.mockClear()
  data = {
    students: STUDENTS, classes: CLASSES,
    homeworkSets: SETS, homeworkDays: DAYS,
    homeworkSubmissions: [], homeworkReopens: [],
    openHomeworkDay, closeHomeworkDay,
  }
})

const week = () => screen.getByRole('button', { name: /2026-08-17/ })

describe('HomeworkBacklogList', () => {
  it('주차와 완료율, 남은 인원을 보여준다', () => {
    data.homeworkSubmissions = [{ dayId: 110, studentId: 1 }]
    render(<HomeworkBacklogList />)
    // 4건 중 1건 제출 = 25%
    expect(week()).toHaveTextContent('25%')
    expect(week()).toHaveTextContent('남은 2명')
  })

  it('전원이 낸 주는 완료로 표시한다', () => {
    data.homeworkSubmissions = [
      { dayId: 110, studentId: 1 }, { dayId: 112, studentId: 1 },
      { dayId: 110, studentId: 2 }, { dayId: 112, studentId: 2 },
    ]
    render(<HomeworkBacklogList />)
    expect(week()).toHaveTextContent('완료')
    expect(week()).not.toHaveTextContent('남은')
  })

  it('처음에는 주가 접혀 있다', () => {
    render(<HomeworkBacklogList />)
    expect(week()).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText('김가나')).not.toBeInTheDocument()
  })

  it('펼치면 안 낸 학생과 요일이 나온다', () => {
    data.homeworkSubmissions = [{ dayId: 110, studentId: 1 }]
    render(<HomeworkBacklogList />)
    fireEvent.click(week())
    expect(screen.getByText('김가나')).toBeInTheDocument()
    expect(screen.getByText('이다라')).toBeInTheDocument()
    // 김가나는 수요일만 남았다
    expect(screen.getAllByText(/수요일/).length).toBe(2)
    expect(screen.getAllByText(/월요일/).length).toBe(1)
  })

  it('지난 주 과제도 열어줄 수 있다', async () => {
    render(<HomeworkBacklogList />)
    fireEvent.click(week())
    fireEvent.click(screen.getAllByRole('button', { name: '열어주기' })[0])
    await waitFor(() => expect(openHomeworkDay).toHaveBeenCalledWith(
      expect.objectContaining({ dayId: 110, openedBy: 'u1' })
    ))
  })

  it('열어준 요일은 닫기로 바뀐다', () => {
    data.homeworkReopens = [{ dayId: 110, studentId: 1 }]
    render(<HomeworkBacklogList />)
    fireEvent.click(week())
    expect(screen.getAllByRole('button', { name: '닫기' })).toHaveLength(1)
  })

  it('이번 주 과제는 여기 없다', () => {
    data.homeworkSets = [...SETS, { id: 21, category: 'naesin', classId: 7, target: null, weekStart: '2026-08-24' }]
    data.homeworkDays = [...DAYS, { id: 210, setId: 21, weekday: 1, date: '2026-08-24' }]
    render(<HomeworkBacklogList />)
    expect(screen.queryByRole('button', { name: /2026-08-24/ })).not.toBeInTheDocument()
  })

  it('지난 주 과제가 없으면 안내를 보여준다', () => {
    data.homeworkSets = []
    data.homeworkDays = []
    render(<HomeworkBacklogList />)
    expect(screen.getByText(/밀린 과제가 없습니다/)).toBeInTheDocument()
  })

  it('담당 반이 아닌 학생은 보이지 않는다', () => {
    data.students = [...STUDENTS, { id: 9, name: '남의반', classId: 99, grade: 5, jeongsiLevel: null }]
    render(<HomeworkBacklogList />)
    fireEvent.click(week())
    expect(screen.queryByText('남의반')).not.toBeInTheDocument()
  })
})
