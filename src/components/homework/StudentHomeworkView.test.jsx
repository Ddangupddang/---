// src/components/homework/StudentHomeworkView.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import StudentHomeworkView from './StudentHomeworkView'
import { mondayOf } from '../../utils/homeworkWeek'

// 이번 주 월요일(테스트 실행 시점 기준)
const WEEK = mondayOf(new Date().toISOString().slice(0, 10))

const state = {}
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ user: { studentId: 7, role: 'student' } }) }))
vi.mock('../../context/DataContext', () => ({ useData: () => state.data }))

beforeEach(() => {
  state.data = {
    students: [{ id: 7, name: '홍길동', grade: 5, jeongsiLevel: null, classId: 3 }],
    homeworkSets: [
      { id: 1, category: 'naesin', classId: 3, target: null, weekStart: WEEK, title: '내신 세트' },
      { id: 2, category: 'naesin', classId: 4, target: null, weekStart: WEEK, title: '다른반 세트' },
    ],
    homeworkDays: [
      { id: 10, setId: 1, weekday: 1, date: WEEK, questionCount: 2, daySolutionVideoUrl: '', daySolutionFileUrl: '' },
    ],
    homeworkQuestions: [
      { id: 100, dayId: 10, number: 1, answer: '①', solutionVideoUrl: '', solutionFileUrl: '' },
      { id: 101, dayId: 10, number: 2, answer: '②', solutionVideoUrl: '', solutionFileUrl: '' },
    ],
    homeworkSubmissions: [],
    // 실제 upsertHomeworkSubmission은 성공 시 제출 레코드를, 실패 시 null을 반환한다
    upsertHomeworkSubmission: vi.fn().mockResolvedValue({ id: 900, dayId: 10, studentId: 7 }),
  }
})

describe('StudentHomeworkView (내신)', () => {
  it('자기 반 세트의 요일만 보인다', () => {
    render(<StudentHomeworkView category="naesin" />)
    expect(screen.getByText('내신 세트')).toBeInTheDocument()
    expect(screen.getByText('월요일 과제')).toBeInTheDocument()
    expect(screen.queryByText('다른학년 세트')).not.toBeInTheDocument()
  })

  it('제출 없으면 미제출 뱃지', () => {
    render(<StudentHomeworkView category="naesin" />)
    expect(screen.getByText('미제출')).toBeInTheDocument()
  })
})

describe('StudentHomeworkView (정시, 레벨 미배정)', () => {
  it('정시 레벨 없으면 안내 문구', () => {
    render(<StudentHomeworkView category="jeongsi" />)
    expect(screen.getByText(/정시 레벨이 배정되지 않았습니다/)).toBeInTheDocument()
  })
})

describe('StudentHomeworkView (제출)', () => {
  it('모든 문항에 답해야 제출 버튼이 활성화되고, 제출 시 답안이 전달된다', async () => {
    const user = userEvent.setup()
    render(<StudentHomeworkView category="naesin" />)

    // 요일 카드 클릭 → 답안 입력 화면
    await user.click(screen.getByText('월요일 과제'))
    const submitBtn = screen.getByRole('button', { name: '제출하기' })
    expect(submitBtn).toBeDisabled()

    // 1번만 입력 — 2문항 중 1개라 아직 비활성
    await user.click(screen.getByTestId('cell-1-①'))
    expect(submitBtn).toBeDisabled()

    await user.click(screen.getByTestId('cell-2-⑤'))
    expect(submitBtn).toBeEnabled()
    await user.click(submitBtn)

    await waitFor(() => expect(state.data.upsertHomeworkSubmission).toHaveBeenCalledWith({
      dayId: 10,
      studentId: 7,
      answers: [
        { number: 1, answer: '①' },
        { number: 2, answer: '⑤' },
      ],
    }))
  })

  it('제출 전에 한 번만 낼 수 있다고 알려준다', async () => {
    const user = userEvent.setup()
    render(<StudentHomeworkView category="naesin" />)

    await user.click(screen.getByText('월요일 과제'))
    expect(screen.getByText(/제출한 뒤에는 답을 수정할 수 없습니다/)).toBeInTheDocument()
  })

  it('제출하는 동안에는 버튼이 잠겨 두 번 제출되지 않는다', async () => {
    const user = userEvent.setup()
    let finish
    state.data.upsertHomeworkSubmission = vi.fn(
      () => new Promise((resolve) => { finish = resolve })
    )
    render(<StudentHomeworkView category="naesin" />)

    await user.click(screen.getByText('월요일 과제'))
    await user.click(screen.getByTestId('cell-1-①'))
    await user.click(screen.getByTestId('cell-2-⑤'))
    await user.click(screen.getByRole('button', { name: '제출하기' }))

    // 제출이 끝나기 전에 다시 눌러도 요청이 한 번만 나가야 한다
    const btn = screen.getByRole('button', { name: '제출 중...' })
    expect(btn).toBeDisabled()
    await user.click(btn)
    expect(state.data.upsertHomeworkSubmission).toHaveBeenCalledTimes(1)

    finish({ id: 900, dayId: 10, studentId: 7 })
  })

  it('제출에 실패하면 에러를 보여주고 입력한 답을 유지한다', async () => {
    const user = userEvent.setup()
    // DB 오류로 upsert가 null을 반환하는 상황
    state.data.upsertHomeworkSubmission = vi.fn().mockResolvedValue(null)
    render(<StudentHomeworkView category="naesin" />)

    await user.click(screen.getByText('월요일 과제'))
    await user.click(screen.getByTestId('cell-1-①'))
    await user.click(screen.getByTestId('cell-2-⑤'))
    await user.click(screen.getByRole('button', { name: '제출하기' }))

    expect(await screen.findByText(/제출에 실패했습니다/)).toBeInTheDocument()
    // 입력한 답이 날아가면 다시 처음부터 풀어야 한다
    expect(screen.getByText('2/2 입력됨')).toBeInTheDocument()
  })
})

describe('StudentHomeworkView (결과·해설)', () => {
  beforeEach(() => {
    // 요일 해설이 달린 과제 + 1번만 맞힌 제출
    state.data.homeworkDays = [
      { id: 10, setId: 1, weekday: 1, date: WEEK, questionCount: 2,
        daySolutionVideoUrl: 'https://youtu.be/dQw4w9WgXcQ', daySolutionFileUrl: 'https://example.com/sol.pdf' },
    ]
    state.data.homeworkSubmissions = [
      { id: 900, dayId: 10, studentId: 7, submittedAt: `${WEEK}T10:00:00Z`,
        answers: [{ number: 1, answer: '①' }, { number: 2, answer: '⑤' }] },
    ]
  })

  it('제출한 요일은 제출완료 뱃지로 표시된다', () => {
    render(<StudentHomeworkView category="naesin" />)
    expect(screen.getByText('제출완료')).toBeInTheDocument()
    expect(screen.queryByText('미제출')).not.toBeInTheDocument()
  })

  it('마감 전이라도 이미 제출했으면 답을 수정할 수 없다', async () => {
    const user = userEvent.setup()
    // 마감이 한참 남은 상태로 만들어, 수정 버튼이 없는 이유가 "마감"이 아님을 분명히 한다
    state.data.homeworkDays[0].date = '2999-12-31'
    render(<StudentHomeworkView category="naesin" />)

    await user.click(screen.getByText('월요일 과제'))

    expect(screen.getByText('월요일 과제 — 결과')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /답 수정하기/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '제출하기' })).not.toBeInTheDocument()
  })

  it('제출한 요일을 열면 채점 결과와 해설이 보인다', async () => {
    const user = userEvent.setup()
    render(<StudentHomeworkView category="naesin" />)

    await user.click(screen.getByText('월요일 과제'))

    // 정답 ①/② 중 1번만 맞음 → 1 / 2
    expect(screen.getByText('월요일 과제 — 결과')).toBeInTheDocument()
    expect(screen.getByText('/ 2').parentElement).toHaveTextContent('1 / 2')

    // 해설(영상 + 파일)
    expect(screen.getByText('요일 해설')).toBeInTheDocument()
    expect(screen.getByTitle('해설 영상')).toBeInTheDocument()
    expect(screen.getByText('해설 파일 열기')).toHaveAttribute('href', 'https://example.com/sol.pdf')
  })
})

describe('StudentHomeworkView — 반 미배정', () => {
  it('내신 과제는 반이 없으면 이유를 알려준다', () => {
    state.data = {
      ...state.data,
      students: [{ id: 7, name: '홍길동', grade: 5, jeongsiLevel: 2, classId: null }],
    }
    render(<StudentHomeworkView category="naesin" />)
    expect(screen.getByText(/반이 배정되지 않았습니다/)).toBeInTheDocument()
  })
})
