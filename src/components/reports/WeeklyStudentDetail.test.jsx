// src/components/reports/WeeklyStudentDetail.test.jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import WeeklyStudentDetail from './WeeklyStudentDetail'

const DATES = ['2026-08-10', '2026-08-11', '2026-08-12', '2026-08-13', '2026-08-14', '2026-08-15']

const ROW = {
  student: { id: 2, name: '박지후' },
  attendance: { present: 3, late: 1, absent: 1, counted: 5, rate: 80 },
  tests: [
    { test: { id: 100, title: '문학' }, score: 72, total: 100, state: 'graded' },
    { test: { id: 101, title: '독서' }, score: null, total: 100, state: 'absent' },
  ],
  testSummary: { average: 72, count: 2 },
  naesin: { submitted: 3, total: 5, submitRate: 60, correctRate: 80 },
  jeongsi: null,
  flags: ['absence', 'lowHomework'],
}

const ATT_RECORDS = [
  { studentId: 2, date: '2026-08-10', status: 'present' },
  { studentId: 2, date: '2026-08-11', status: 'late'    },
  { studentId: 2, date: '2026-08-12', status: 'absent'  },
]

function renderDetail(overrides = {}) {
  const props = {
    row: ROW, dates: DATES, weekStart: '2026-08-10',
    attendanceRecords: ATT_RECORDS, note: null,
    onSaveNote: vi.fn().mockResolvedValue({ id: 1, content: '저장됨' }),
    onBack: vi.fn(),
    ...overrides,
  }
  render(<WeeklyStudentDetail {...props} />)
  return props
}

describe('WeeklyStudentDetail', () => {
  it('세 영역을 모두 보여준다', () => {
    renderDetail()
    expect(screen.getByText('박지후')).toBeInTheDocument()
    expect(screen.getByText(/문학/)).toBeInTheDocument()
    expect(screen.getByText(/72/)).toBeInTheDocument()
    expect(screen.getByText(/미응시/)).toBeInTheDocument()
    expect(screen.getByText(/내신/)).toBeInTheDocument()
  })

  it('정시 과제 배정이 없으면 배정 없음으로 알린다', () => {
    renderDetail()
    expect(screen.getByText(/정시.*배정 없음/)).toBeInTheDocument()
  })

  it('요일별 출결을 보여준다', () => {
    renderDetail()
    expect(screen.getByTestId('att-2026-08-11')).toHaveTextContent('지각')
    expect(screen.getByTestId('att-2026-08-12')).toHaveTextContent('결석')
    // 기록이 없는 날은 빈칸으로 둔다 — 결석으로 단정하면 안 된다
    expect(screen.getByTestId('att-2026-08-15')).toHaveTextContent('-')
  })

  it('기존 코멘트를 입력창에 채워서 연다', () => {
    renderDetail({ note: { id: 5, content: '이번 주 집중력 좋았음' } })
    expect(screen.getByRole('textbox')).toHaveValue('이번 주 집중력 좋았음')
  })

  it('코멘트를 저장하면 onSaveNote가 내용과 함께 불린다', async () => {
    const user = userEvent.setup()
    const props = renderDetail()

    await user.type(screen.getByRole('textbox'), '과제 독려 필요')
    await user.click(screen.getByRole('button', { name: '저장' }))

    expect(props.onSaveNote).toHaveBeenCalledWith('과제 독려 필요')
    expect(await screen.findByText(/저장했습니다/)).toBeInTheDocument()
  })

  it('저장에 실패하면 입력 내용을 남기고 에러를 보여준다', async () => {
    const user = userEvent.setup()
    renderDetail({ onSaveNote: vi.fn().mockResolvedValue(null) })

    await user.type(screen.getByRole('textbox'), '지워지면 안 되는 메모')
    await user.click(screen.getByRole('button', { name: '저장' }))

    expect(await screen.findByText(/저장에 실패했습니다/)).toBeInTheDocument()
    expect(screen.getByRole('textbox')).toHaveValue('지워지면 안 되는 메모')
  })

  it('목록으로 버튼이 onBack을 부른다', async () => {
    const user = userEvent.setup()
    const props = renderDetail()
    await user.click(screen.getByRole('button', { name: /목록/ }))
    expect(props.onBack).toHaveBeenCalled()
  })
})
