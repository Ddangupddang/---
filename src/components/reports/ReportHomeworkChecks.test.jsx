// src/components/reports/ReportHomeworkChecks.test.jsx
// 진도 리포트 과제 수행 현황 — 제출 기록 자동 반영 + 교사 수정.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ReportHomeworkChecks from './ReportHomeworkChecks'

const DATE = '2026-08-12'

const STUDENTS = [
  { id: 1, name: '낸학생', grade: 5, jeongsiLevel: null },
  { id: 2, name: '안낸학생', grade: 5, jeongsiLevel: null },
]

const state = {}
vi.mock('../../context/DataContext', () => ({ useData: () => state.data }))

beforeEach(() => {
  state.data = {
    homeworkSets: [{ id: 11, category: 'naesin', target: 5, weekStart: '2026-08-10' }],
    homeworkDays: [{ id: 110, setId: 11, weekday: 3, date: DATE }],
    homeworkSubmissions: [{ dayId: 110, studentId: 1 }], // 1번만 제출
  }
})

// 리포트 생성 시 만들어지는 초기 상태(전원 done:false)
const freshChecks = () => STUDENTS.map((s) => ({ studentId: s.id, done: false }))

function setup(checks = freshChecks()) {
  const onChange = vi.fn()
  render(<ReportHomeworkChecks date={DATE} students={STUDENTS} checks={checks} onChange={onChange} />)
  return onChange
}

describe('ReportHomeworkChecks — 자동 반영', () => {
  it('저장된 값이 전부 false여도 제출 기록대로 표시한다', () => {
    setup()
    // 교사가 아무것도 누르지 않았지만 1번은 제출했으므로 수행으로 잡힌다
    expect(screen.getByTestId('check-1')).toHaveTextContent('✓')
    expect(screen.getByTestId('check-2')).not.toHaveTextContent('✓')
  })

  it('제출 상태를 글로도 알려준다', () => {
    setup()
    expect(screen.getByTestId('check-1')).toHaveTextContent('1/1 제출')
    expect(screen.getByTestId('check-2')).toHaveTextContent('미제출')
  })

  it('인원 수를 자동값 기준으로 센다', () => {
    setup()
    expect(screen.getByText('1 / 2명')).toBeInTheDocument()
  })

  it('자동 표시 중임을 안내한다', () => {
    setup()
    expect(screen.getByText(/자동으로 표시|자동 표시/)).toBeInTheDocument()
  })
})

describe('ReportHomeworkChecks — 교사 수정', () => {
  it('누르면 manual 표시와 함께 저장한다', async () => {
    const user = userEvent.setup()
    const onChange = setup()

    // 미제출 학생을 교사가 수행으로 바꾼다 (종이로 받은 경우)
    await user.click(screen.getByTestId('check-2'))

    expect(onChange).toHaveBeenCalledTimes(1)
    const saved = onChange.mock.calls[0][0]
    expect(saved.find((c) => c.studentId === 2)).toEqual({ studentId: 2, done: true, manual: true })
    // 건드리지 않은 학생은 수정 표시가 붙지 않는다 (계속 제출 기록을 따른다)
    expect(saved.find((c) => c.studentId === 1)).not.toHaveProperty('manual')
  })

  it('교사가 고친 값이 제출 기록을 이긴다', () => {
    // 제출했지만 교사가 미수행으로 표시한 상태
    setup([{ studentId: 1, done: false, manual: true }, { studentId: 2, done: false }])
    expect(screen.getByTestId('check-1')).not.toHaveTextContent('✓')
    expect(screen.getByTestId('check-1')).toHaveTextContent('수정됨')
  })

  it('되돌리기를 누르면 다시 제출 기록을 따른다', async () => {
    const user = userEvent.setup()
    const onChange = setup([{ studentId: 1, done: false, manual: true }, { studentId: 2, done: false }])

    await user.click(screen.getByRole('button', { name: '되돌리기' }))

    const saved = onChange.mock.calls[0][0]
    expect(saved.find((c) => c.studentId === 1)).toEqual({ studentId: 1, done: true, manual: false })
  })

  it('수정하지 않은 학생에는 수정됨 표시가 없다', () => {
    setup()
    expect(screen.getByTestId('check-1')).not.toHaveTextContent('수정됨')
  })
})

describe('ReportHomeworkChecks — 온라인 과제가 없는 날', () => {
  beforeEach(() => {
    state.data.homeworkDays = []   // 그날 과제 없음 (과제 기능 이전 리포트 포함)
  })

  it('저장된 체크를 그대로 보여준다', () => {
    setup([{ studentId: 1, done: true }, { studentId: 2, done: false }])
    expect(screen.getByTestId('check-1')).toHaveTextContent('✓')
    expect(screen.getByTestId('check-2')).not.toHaveTextContent('✓')
  })

  it('직접 체크해야 한다고 안내한다', () => {
    setup()
    expect(screen.getByText(/등록된 온라인 과제가 없어/)).toBeInTheDocument()
  })

  it('여전히 손으로 체크할 수 있다', async () => {
    const user = userEvent.setup()
    const onChange = setup()
    await user.click(screen.getByTestId('check-1'))
    expect(onChange.mock.calls[0][0].find((c) => c.studentId === 1)).toEqual({
      studentId: 1, done: true, manual: true,
    })
  })
})
