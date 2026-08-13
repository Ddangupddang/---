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

  it('이전 주/다음 주 버튼을 누르면 정확히 7일 이동한다', async () => {
    const user = userEvent.setup()
    render(<WeeklyReport />)

    // 라벨에서 주 시작 날짜만 뽑는다. 구현 함수(shiftWeek 등)를 다시 호출해 비교하면
    // 구현이 틀려도 테스트가 같은 실수로 통과하는 순환 논증이 되므로 문자열만 파싱한다.
    const weekStartFromLabel = () =>
      Date.parse(screen.getByTestId('week-label').textContent.trim().slice(0, 10))
    const DAY = 24 * 60 * 60 * 1000

    const base = weekStartFromLabel()

    // 이전 주: 정확히 7일 전으로 이동해야 한다
    await user.click(screen.getByRole('button', { name: '이전 주' }))
    const afterPrev = weekStartFromLabel()
    expect(base - afterPrev).toBe(7 * DAY)

    // 다음 주: afterPrev에서 다시 7일 후(=base)로 이동해야 한다
    await user.click(screen.getByRole('button', { name: '다음 주' }))
    const afterNext = weekStartFromLabel()
    expect(afterNext - afterPrev).toBe(7 * DAY)
    expect(afterNext).toBe(base)
  })

  it('학생을 누르면 개인 상세로 들어가고 목록으로 돌아온다', async () => {
    const user = userEvent.setup()
    render(<WeeklyReport />)

    await user.click(screen.getByText('김민서'))
    expect(screen.getByText('교사 코멘트')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /목록/ }))
    expect(screen.queryByText('교사 코멘트')).not.toBeInTheDocument()
  })

  it('상세를 연 채 주를 이동하면 상세가 닫힌다 — 써 둔 코멘트가 다른 주에 저장되면 안 된다', async () => {
    const user = userEvent.setup()
    render(<WeeklyReport />)

    await user.click(screen.getByText('김민서'))
    await user.type(screen.getByRole('textbox'), '과제 독려 필요')

    await user.click(screen.getByRole('button', { name: '이전 주' }))

    // 상세가 열린 채 남으면 '과제 독려 필요'가 지난주 코멘트를 덮어쓴다
    expect(screen.queryByText('교사 코멘트')).not.toBeInTheDocument()

    // 지난주 상세를 다시 열면 지난주 기준(코멘트 없음)으로 시작해야 한다
    await user.click(screen.getByText('김민서'))
    expect(screen.getByRole('textbox')).toHaveValue('')
  })

  it('주를 이동하면 코멘트 입력창이 그 주의 코멘트를 보여준다', async () => {
    const user = userEvent.setup()

    // 기본 주가 며칠인지는 라벨에서 읽는다. 구현의 mondayOf를 다시 부르면
    // 구현이 틀려도 테스트가 같은 실수로 통과하는 순환 논증이 된다.
    const probe = render(<WeeklyReport />)
    const thisWeek = screen.getByTestId('week-label').textContent.trim().slice(0, 10)
    probe.unmount()

    state.data = {
      ...state.data,
      weeklyNotes: [{ id: 1, studentId: 1, weekStart: thisWeek, content: '이번 주 집중력 좋았음' }],
    }

    render(<WeeklyReport />)
    await user.click(screen.getByText('김민서'))
    expect(screen.getByRole('textbox')).toHaveValue('이번 주 집중력 좋았음')

    await user.click(screen.getByRole('button', { name: '이전 주' }))
    await user.click(screen.getByText('김민서'))
    // 지난주에는 코멘트가 없다. 이번 주 내용이 남아 있으면 저장 시 지난주를 덮어쓴다.
    expect(screen.getByRole('textbox')).toHaveValue('')
  })

  it('목업 반 목록이 실제 반으로 교체돼도 빈 표로 열리지 않는다', () => {
    // DataProvider는 목업 반(id 1·2·3)으로 먼저 그리고 Supabase 로드가 끝나야 실제 반으로 바꾼다
    state.data = { ...state.data, classes: [{ id: 1, name: '목업반' }], students: [] }
    const { rerender } = render(<WeeklyReport />)

    state.data = {
      ...state.data,
      classes: [{ id: 77, name: '실제반' }],
      students: [{ id: 5, name: '이서준', classId: 77, grade: 5, jeongsiLevel: null }],
    }
    rerender(<WeeklyReport />)

    // 첫 렌더의 목업 id를 붙잡고 있으면 드롭다운이 빈칸이 되고 표에는 학생이 없다
    expect(screen.getByRole('combobox')).toHaveValue('77')
    expect(screen.getByText('이서준')).toBeInTheDocument()
  })
})
