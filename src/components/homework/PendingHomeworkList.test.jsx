// src/components/homework/PendingHomeworkList.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import PendingHomeworkList from './PendingHomeworkList'

// 오늘을 수요일로 고정한다 — 마감이 지난 요일이 있어야 볼 것이 생긴다
vi.mock('../../utils/datetime', async (orig) => ({
  ...(await orig()),
  todayKST: () => '2026-08-19',
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
const SETS = [{ id: 11, category: 'naesin', target: 5, weekStart: '2026-08-17', title: '8월 3주' }]
const DAYS = [
  { id: 110, setId: 11, weekday: 1, date: '2026-08-17' }, // 월 — 기한 지남
  { id: 112, setId: 11, weekday: 3, date: '2026-08-19' }, // 수 — 오늘, 아직 낼 수 있다
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

describe('PendingHomeworkList', () => {
  it('안 낸 학생의 이름과 반을 보여준다', () => {
    render(<PendingHomeworkList />)
    expect(screen.getByText('김가나')).toBeInTheDocument()
    expect(screen.getByText('이다라')).toBeInTheDocument()
    expect(screen.getAllByText(/고2 A반/).length).toBeGreaterThan(0)
  })

  it('낸 학생은 목록에 없다', () => {
    data.homeworkSubmissions = [
      { dayId: 110, studentId: 2 }, { dayId: 112, studentId: 2 },
    ]
    render(<PendingHomeworkList />)
    expect(screen.getByText('김가나')).toBeInTheDocument()
    expect(screen.queryByText('이다라')).not.toBeInTheDocument()
  })

  it('빠뜨린 요일을 보여준다', () => {
    data.homeworkSubmissions = [{ dayId: 110, studentId: 1 }, { dayId: 110, studentId: 2 }]
    render(<PendingHomeworkList />)
    // 월요일은 둘 다 냈으니 수요일만 남는다
    expect(screen.getAllByText(/수요일/).length).toBe(2)
    expect(screen.queryByText(/월요일/)).not.toBeInTheDocument()
  })

  it('기한이 지난 요일에만 열어주기가 보인다', () => {
    render(<PendingHomeworkList />)
    // 월(기한 지남) 2명 → 열어주기 2개. 수(오늘)는 아직 낼 수 있어 버튼이 없다.
    expect(screen.getAllByRole('button', { name: '열어주기' })).toHaveLength(2)
  })

  it('열어주기를 누르면 그 학생·그 요일로 연다', async () => {
    render(<PendingHomeworkList />)
    fireEvent.click(screen.getAllByRole('button', { name: '열어주기' })[0])
    await waitFor(() => expect(openHomeworkDay).toHaveBeenCalledWith(
      expect.objectContaining({ dayId: 110, studentId: 1, openedBy: 'u1' })
    ))
  })

  it('이미 열어준 요일은 닫기로 바뀐다', () => {
    data.homeworkReopens = [{ dayId: 110, studentId: 1 }]
    render(<PendingHomeworkList />)
    expect(screen.getAllByRole('button', { name: '닫기' })).toHaveLength(1)
    // 2번 학생 것은 아직 열어주기
    expect(screen.getAllByRole('button', { name: '열어주기' })).toHaveLength(1)
  })

  it('모두 냈으면 빈 안내를 보여준다', () => {
    data.homeworkSubmissions = [
      { dayId: 110, studentId: 1 }, { dayId: 112, studentId: 1 },
      { dayId: 110, studentId: 2 }, { dayId: 112, studentId: 2 },
    ]
    render(<PendingHomeworkList />)
    expect(screen.getByText(/안 낸 학생이 없습니다/)).toBeInTheDocument()
  })

  it('담당 반이 아닌 학생은 보이지 않는다', () => {
    data.students = [...STUDENTS, { id: 9, name: '남의반', classId: 99, grade: 5, jeongsiLevel: null }]
    render(<PendingHomeworkList />)
    expect(screen.queryByText('남의반')).not.toBeInTheDocument()
  })
})
