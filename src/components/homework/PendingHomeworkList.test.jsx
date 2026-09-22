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

// 학생은 처음에 접혀 있다 — 열어주기 버튼을 보려면 펼쳐야 한다
function expand(name) {
  fireEvent.click(screen.getByRole('button', { name: new RegExp(name) }))
}
function expandAll() {
  STUDENTS.forEach((s) => {
    const btn = screen.queryByRole('button', { name: new RegExp(s.name) })
    if (btn) fireEvent.click(btn)
  })
}
// 학생 줄에 붙은 요일 칩들 — [요일, 상태] 목록으로 읽는다
function chipsOf(name) {
  const btn = screen.getByRole('button', { name: new RegExp(name) })
  return [...btn.querySelectorAll('[data-chip]')].map((c) => [c.textContent, c.dataset.chip])
}

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

  it('기한이 지난 요일만 보여준다', () => {
    render(<PendingHomeworkList />)
    expandAll()
    // 월요일은 기한이 지났고, 수요일(오늘)은 내일까지 낼 수 있어 빠진다
    expect(screen.getAllByText(/월요일/).length).toBe(2)
    expect(screen.queryByText(/수요일/)).not.toBeInTheDocument()
  })

  it('아직 낼 수 있는 과제만 남은 학생은 목록에 없다', () => {
    // 김가나는 월요일을 냈다 — 수요일은 아직 낼 수 있다
    data.homeworkSubmissions = [{ dayId: 110, studentId: 1 }]
    render(<PendingHomeworkList />)
    expect(screen.queryByText('김가나')).not.toBeInTheDocument()
    expect(screen.getByText('이다라')).toBeInTheDocument()
  })

  it('기한이 지난 요일에만 열어주기가 보인다', () => {
    render(<PendingHomeworkList />)
    expandAll()
    // 월(기한 지남) 2명 → 열어주기 2개
    expect(screen.getAllByRole('button', { name: '열어주기' })).toHaveLength(2)
  })

  it('열어주기를 누르면 그 학생·그 요일로 연다', async () => {
    render(<PendingHomeworkList />)
    expand('김가나')
    fireEvent.click(screen.getAllByRole('button', { name: '열어주기' })[0])
    await waitFor(() => expect(openHomeworkDay).toHaveBeenCalledWith(
      expect.objectContaining({ dayId: 110, studentId: 1, openedBy: 'u1' })
    ))
  })

  it('이미 열어준 요일은 닫기로 바뀐다', () => {
    data.homeworkReopens = [{ dayId: 110, studentId: 1 }]
    render(<PendingHomeworkList />)
    expandAll()
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

  it('처음에는 학생이 모두 접혀 있다', () => {
    render(<PendingHomeworkList />)
    expect(screen.getByRole('button', { name: /김가나/ })).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('button', { name: '열어주기' })).not.toBeInTheDocument()
  })

  it('접힌 줄에 빠뜨린 요일과 개수가 보인다', () => {
    render(<PendingHomeworkList />)
    expect(chipsOf('김가나')).toEqual([['월', 'late']])
    expect(screen.getByRole('button', { name: /김가나/ })).toHaveTextContent('1건')
  })

  it('열어준 요일은 칩이 열어줌으로 바뀐다', () => {
    data.homeworkReopens = [{ dayId: 110, studentId: 1 }]
    render(<PendingHomeworkList />)
    expect(chipsOf('김가나')).toEqual([['월', 'reopened']])
    expect(chipsOf('이다라')).toEqual([['월', 'late']])
  })

  it('기한 지난 요일이 있는 학생이 위로 온다', () => {
    // 김가나는 월요일을 열어줬다 → 급하지 않다. 이다라는 그대로 기한 지남.
    data.homeworkReopens = [{ dayId: 110, studentId: 1 }]
    render(<PendingHomeworkList />)
    const names = screen.getAllByRole('button', { name: /김가나|이다라/ })
      .map((b) => (b.textContent.includes('김가나') ? '김가나' : '이다라'))
    expect(names).toEqual(['이다라', '김가나'])
  })

  it('누르면 펼쳐지고 다시 누르면 접힌다', () => {
    render(<PendingHomeworkList />)
    expand('김가나')
    expect(screen.getByRole('button', { name: /김가나/ })).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getAllByRole('button', { name: '열어주기' })).toHaveLength(1)
    expand('김가나')
    expect(screen.queryByRole('button', { name: '열어주기' })).not.toBeInTheDocument()
  })

  it('같은 요일에 과제가 둘이면 칩은 하나, 더 급한 상태를 따른다', () => {
    // 월요일에 정시과제가 하나 더 있다. 내신 월요일은 열어줬고 정시 월요일은 그대로다.
    data.students = [{ ...STUDENTS[0], jeongsiLevel: 2 }]
    data.homeworkSets = [...SETS, { id: 21, category: 'jeongsi', target: 2, weekStart: '2026-08-17' }]
    data.homeworkDays = [...DAYS, { id: 210, setId: 21, weekday: 1, date: '2026-08-17' }]
    data.homeworkReopens = [{ dayId: 110, studentId: 1 }]
    render(<PendingHomeworkList />)
    // 열어줌보다 기한 지남이 급하다 — 불러야 할 일이 남아 있다
    expect(chipsOf('김가나')).toEqual([['월', 'late']])
    // 개수는 칩 수가 아니라 빠뜨린 건수다
    expect(screen.getByRole('button', { name: /김가나/ })).toHaveTextContent('2건')
  })

  it('어제 과제는 오늘 마감으로 보이고 열어주기 대신 안내가 나온다', () => {
    // 화요일(어제) 과제 — 오늘(수)까지 낼 수 있다
    data.homeworkDays = [...DAYS, { id: 111, setId: 11, weekday: 2, date: '2026-08-18' }]
    data.homeworkSubmissions = [{ dayId: 110, studentId: 1 }, { dayId: 110, studentId: 2 }]
    render(<PendingHomeworkList />)
    expect(chipsOf('김가나')).toEqual([['화', 'dueToday']])
    expand('김가나')
    expect(screen.queryByRole('button', { name: '열어주기' })).not.toBeInTheDocument()
    expect(screen.getByText('오늘까지 낼 수 있음')).toBeInTheDocument()
  })

  it('기한 지난 학생이 오늘 마감만 있는 학생보다 위에 온다', () => {
    data.homeworkDays = [...DAYS, { id: 111, setId: 11, weekday: 2, date: '2026-08-18' }]
    // 김가나는 월요일을 냈다 → 화요일(오늘 마감)만 남는다. 이다라는 월요일 기한 지남.
    data.homeworkSubmissions = [{ dayId: 110, studentId: 1 }]
    render(<PendingHomeworkList />)
    const names = screen.getAllByRole('button', { name: /김가나|이다라/ })
      .map((b) => (b.textContent.includes('김가나') ? '김가나' : '이다라'))
    expect(names).toEqual(['이다라', '김가나'])
  })
})
