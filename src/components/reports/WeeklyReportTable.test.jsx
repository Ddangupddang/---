// src/components/reports/WeeklyReportTable.test.jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import WeeklyReportTable from './WeeklyReportTable'

const ROWS = [
  {
    student: { id: 2, name: '박지후' },
    attendance: { present: 3, late: 1, absent: 1, counted: 5, rate: 80 },
    tests: [], testSummary: { average: 72, count: 1 },
    naesin: { submitted: 3, total: 5, submitRate: 60, correctRate: 80 },
    jeongsi: null,
    flags: ['absence', 'lowHomework'],
  },
  {
    student: { id: 1, name: '김민서' },
    attendance: { present: 5, late: 0, absent: 0, counted: 5, rate: 100 },
    tests: [], testSummary: { average: null, count: 2 },
    naesin: { submitted: 5, total: 5, submitRate: 100, correctRate: 92 },
    jeongsi: { submitted: 4, total: 5, submitRate: 80, correctRate: 75 },
    flags: [],
  },
]

// 셀 값은 숫자 안에 보조 span이 섞여 있고 같은 값이 여러 열에 나올 수 있다.
// getByText로 잡으면 깨지기 쉬워서 셀마다 testid로 찍어 확인한다.
// DataTable이 만드는 셀 testid 형식: cell-{학생id}-{열key}
const cell = (studentId, key) => screen.getByTestId(`cell-${studentId}-${key}`).textContent

describe('WeeklyReportTable', () => {
  it('학생별 출석·테스트·내신·정시를 보여준다', () => {
    render(<WeeklyReportTable rows={ROWS} noteStudentIds={new Set()} onSelect={vi.fn()} />)

    expect(screen.getByText('박지후')).toBeInTheDocument()
    expect(cell(2, 'att')).toContain('4/5')      // 출석+지각 / 전체
    expect(cell(2, 'att')).toContain('지1')
    expect(cell(2, 'att')).toContain('결1')
    expect(cell(2, 'test')).toContain('72점')
    expect(cell(2, 'naesin')).toContain('3/5')
    expect(cell(2, 'naesin')).toContain('80%')
  })

  it('배정이 없는 칸은 -로 표시한다', () => {
    render(<WeeklyReportTable rows={ROWS} noteStudentIds={new Set()} onSelect={vi.fn()} />)
    // 박지후는 정시과제 배정이 없다 — 0/0이 아니라 "기록 없음"이어야 한다
    expect(cell(2, 'jeongsi')).toBe('-')
    expect(cell(1, 'jeongsi')).toContain('4/5')
  })

  it('채점된 시험이 없으면 0점이 아니라 채점중으로 보여준다', () => {
    render(<WeeklyReportTable rows={ROWS} noteStudentIds={new Set()} onSelect={vi.fn()} />)
    // 김민서는 2건 다 채점 전
    expect(cell(1, 'test')).toContain('채점중')
    expect(cell(1, 'test')).toContain('(2건)')
  })

  it('코멘트가 있는 학생에 표시를 남긴다', () => {
    render(<WeeklyReportTable rows={ROWS} noteStudentIds={new Set([2])} onSelect={vi.fn()} />)
    expect(screen.getByTestId('note-mark-2')).toBeInTheDocument()
    expect(screen.queryByTestId('note-mark-1')).not.toBeInTheDocument()
  })

  it('이름을 누르면 그 학생으로 onSelect가 불린다', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(<WeeklyReportTable rows={ROWS} noteStudentIds={new Set()} onSelect={onSelect} />)

    await user.click(screen.getByText('김민서'))
    expect(onSelect).toHaveBeenCalledWith(ROWS[1].student)
  })

  it('학생이 없으면 안내 문구를 보여준다', () => {
    render(<WeeklyReportTable rows={[]} noteStudentIds={new Set()} onSelect={vi.fn()} />)
    expect(screen.getByText(/등록된 학생이 없습니다/)).toBeInTheDocument()
  })
})
