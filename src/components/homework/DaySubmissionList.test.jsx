// src/components/homework/DaySubmissionList.test.jsx
// 교사가 보는 학생별 정오답 격자 — 문항 번호가 1..N이 아니어도 제 번호에 붙어야 한다.
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DaySubmissionList from './DaySubmissionList'

const students = [
  { id: 1, name: '가학생' },
  { id: 2, name: '나학생' },
]

describe('DaySubmissionList', () => {
  it('미제출 학생과 제출 학생의 점수를 보여준다', () => {
    render(
      <DaySubmissionList
        students={students}
        questions={[{ number: 1, answer: '①' }, { number: 2, answer: '②' }]}
        submissions={[
          { id: 900, studentId: 1, answers: [{ number: 1, answer: '①' }, { number: 2, answer: '⑤' }] },
        ]}
      />
    )
    expect(screen.getByText('미제출')).toBeInTheDocument()
    expect(screen.getByText('1/2 ›')).toBeInTheDocument()
  })

  // 격자를 문항 수로만 그리면 언제나 1번부터 센다. 답은 실제 번호로 찾으므로
  // 번호가 1..N이 아니면 교사 화면에서 정오답이 엉뚱한 번호에 붙는다.
  it('문항 번호가 1번부터가 아니어도 제 번호에 정오답이 붙는다', async () => {
    const user = userEvent.setup()
    render(
      <DaySubmissionList
        students={students}
        questions={[{ number: 5, answer: '①' }, { number: 6, answer: '②' }]}
        submissions={[
          { id: 900, studentId: 1, answers: [{ number: 5, answer: '①' }, { number: 6, answer: '⑤' }] },
        ]}
      />
    )
    await user.click(screen.getByRole('button', { name: /가학생/ }))

    // 칸은 5번·6번으로 그려진다 — 1번·2번으로 그리면 답이 통째로 어긋난다
    expect(screen.getByText('5번')).toBeInTheDocument()
    expect(screen.getByText('6번')).toBeInTheDocument()
    expect(screen.queryByTestId('cell-1')).not.toBeInTheDocument()

    expect(screen.getByTestId('cell-5-①')).toHaveAttribute('data-result', 'correct')
    expect(screen.getByTestId('cell-6-⑤')).toHaveAttribute('data-result', 'wrong')
    expect(screen.getByTestId('cell-6-②')).toHaveAttribute('data-result', 'answer')
  })
})
