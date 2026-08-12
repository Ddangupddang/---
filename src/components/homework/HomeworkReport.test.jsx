// src/components/homework/HomeworkReport.test.jsx
// 과제 리포트 — 학년/레벨별 한 달 누적 수행.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import HomeworkReport from './HomeworkReport'

const MONTH = new Date().toISOString().slice(0, 7)
const D1 = `${MONTH}-03`
const D2 = `${MONTH}-05`

const state = {}
vi.mock('../../context/DataContext', () => ({ useData: () => state.data }))

beforeEach(() => {
  state.data = {
    students: [
      { id: 1, name: '성실이', grade: 5, jeongsiLevel: null },
      { id: 2, name: '가끔이', grade: 5, jeongsiLevel: null },
      { id: 3, name: '중1학생', grade: 1, jeongsiLevel: null },
    ],
    homeworkSets: [{ id: 11, category: 'naesin', target: 5, weekStart: D1 }],
    homeworkDays: [
      { id: 110, setId: 11, weekday: 1, date: D1 },
      { id: 111, setId: 11, weekday: 3, date: D2 },
    ],
    homeworkQuestions: [
      { dayId: 110, number: 1, answer: '①' },
      { dayId: 111, number: 1, answer: '②' },
    ],
    // 성실이 2회 전부 제출(전부 정답), 가끔이 1회만 제출(오답)
    homeworkSubmissions: [
      { dayId: 110, studentId: 1, answers: [{ number: 1, answer: '①' }] },
      { dayId: 111, studentId: 1, answers: [{ number: 1, answer: '②' }] },
      { dayId: 110, studentId: 2, answers: [{ number: 1, answer: '⑤' }] },
    ],
  }
})

// 기본 그룹은 중1이므로 고2 탭으로 옮긴다
async function openGo2(user) {
  await user.click(screen.getByRole('button', { name: '고2' }))
}

describe('HomeworkReport', () => {
  it('그 달의 과제 횟수를 보여준다', async () => {
    const user = userEvent.setup()
    render(<HomeworkReport category="naesin" />)
    await openGo2(user)
    expect(screen.getByText('과제 2회')).toBeInTheDocument()
  })

  it('학생별 제출 횟수와 정답률을 보여준다', async () => {
    const user = userEvent.setup()
    render(<HomeworkReport category="naesin" />)
    await openGo2(user)

    expect(screen.getByTestId('report-row-1')).toHaveTextContent('2/2')
    expect(screen.getByTestId('report-row-1')).toHaveTextContent('100%')
    expect(screen.getByTestId('report-row-2')).toHaveTextContent('1/2')
    expect(screen.getByTestId('report-row-2')).toHaveTextContent('0%')
  })

  it('제출률이 낮은 학생을 주의로 표시하고 상단에 알린다', async () => {
    const user = userEvent.setup()
    render(<HomeworkReport category="naesin" />)
    await openGo2(user)

    expect(screen.getByTestId('report-row-2')).toHaveTextContent('주의')
    expect(screen.getByTestId('report-row-1')).not.toHaveTextContent('주의')
    expect(screen.getByText(/제출률 70% 미만 1명/)).toBeInTheDocument()
  })

  it('다른 학년 학생은 섞이지 않는다', async () => {
    const user = userEvent.setup()
    render(<HomeworkReport category="naesin" />)
    await openGo2(user)
    expect(screen.queryByText('중1학생')).not.toBeInTheDocument()
  })

  it('과제가 없는 달에는 안내를 보여준다', async () => {
    const user = userEvent.setup()
    state.data.homeworkDays = []
    render(<HomeworkReport category="naesin" />)
    await openGo2(user)
    expect(screen.getByText('이 달에 출제된 과제가 없습니다.')).toBeInTheDocument()
  })

  it('한 번도 제출하지 않은 학생의 정답률은 —로 둔다', async () => {
    const user = userEvent.setup()
    state.data.homeworkSubmissions = []
    render(<HomeworkReport category="naesin" />)
    await openGo2(user)
    expect(screen.getByTestId('report-row-1')).toHaveTextContent('0/2')
    expect(screen.getByTestId('report-row-1')).toHaveTextContent('—')
  })
})
