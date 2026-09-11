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
    homeworkChecks: [],
    // 실제 addHomeworkCheck는 방금 저장한 answers를 그대로 되돌려준다.
    // 화면은 이 saved.answers로 채점하므로, 목도 입력값을 그대로 echo해야
    // "확인하면 맞은 개수가 나온다" 같은 테스트가 진짜 동작을 반영한다.
    addHomeworkCheck: vi.fn().mockImplementation(({ dayId, studentId, answers }) =>
      Promise.resolve({ id: 800, dayId, studentId, answers, checkedAt: '2026-09-11T01:00:00Z' })
    ),
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

// ── 문항 번호가 1..N이 아닐 때 ──────────────────────────────
// 화면은 1번부터 세어 칸을 그리는데 제출은 실제 문항 번호로 답을 찾는다.
// 둘이 어긋나면 학생이 다 채워도 답이 밀리거나 사라진다.
describe('StudentHomeworkView (문항 번호에 구멍이 있을 때)', () => {
  beforeEach(() => {
    // 5번·6번 두 문항 (1번·2번이 아니다 — 불러오다 앞부분이 빠진 상태)
    state.data.homeworkQuestions = [
      { id: 100, dayId: 10, number: 5, answer: '①', solutionVideoUrl: '', solutionFileUrl: '' },
      { id: 101, dayId: 10, number: 6, answer: '②', solutionVideoUrl: '', solutionFileUrl: '' },
    ]
  })

  it('학생이 고른 답이 그대로 제출된다', async () => {
    const user = userEvent.setup()
    render(<StudentHomeworkView category="naesin" />)
    await user.click(screen.getByText('월요일 과제'))

    // 칸은 실제 문항 번호(5·6)로 그려져야 한다 — 1·2로 그리면 답이 어긋난다
    expect(screen.getByText('5번')).toBeInTheDocument()
    expect(screen.getByText('6번')).toBeInTheDocument()

    await user.click(screen.getByTestId('cell-5-①'))
    await user.click(screen.getByTestId('cell-6-②'))
    await user.click(screen.getByRole('button', { name: '제출하기' }))

    expect(state.data.upsertHomeworkSubmission).toHaveBeenCalledWith(
      expect.objectContaining({
        answers: [
          { number: 5, answer: '①' },
          { number: 6, answer: '②' },
        ],
      })
    )
  })
})

// ── 문항을 덜 불러온 상태 ────────────────────────────────
// 출제한 문항 수보다 적게 들어오면 그대로 내는 순간 못 받은 문항이 오답이 된다.
describe('StudentHomeworkView (문항을 덜 불러왔을 때)', () => {
  beforeEach(() => {
    // 5문항짜리 과제인데 2개만 도착했다
    state.data.homeworkDays = [
      { id: 10, setId: 1, weekday: 1, date: WEEK, questionCount: 5, daySolutionVideoUrl: '', daySolutionFileUrl: '' },
    ]
  })

  it('다 채워도 제출을 막고 새로고침을 안내한다', async () => {
    const user = userEvent.setup()
    render(<StudentHomeworkView category="naesin" />)
    await user.click(screen.getByText('월요일 과제'))

    await user.click(screen.getByTestId('cell-1-①'))
    await user.click(screen.getByTestId('cell-2-②'))

    expect(screen.getByText(/과제를 다 불러오지 못했습니다/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '제출하기' })).toBeDisabled()
    expect(state.data.upsertHomeworkSubmission).not.toHaveBeenCalled()
  })
})

// ── 제출 전 확인 (1단계) ─────────────────────────────────────
describe('StudentHomeworkView (제출 전 확인)', () => {
  it('다 채우면 확인하기와 제출하기가 함께 보인다', async () => {
    const user = userEvent.setup()
    render(<StudentHomeworkView category="naesin" />)
    await user.click(screen.getByText('월요일 과제'))

    expect(screen.getByRole('button', { name: '확인하기' })).toBeDisabled()

    await user.click(screen.getByTestId('cell-1-①'))
    await user.click(screen.getByTestId('cell-2-⑤'))

    expect(screen.getByRole('button', { name: '확인하기' })).toBeEnabled()
    expect(screen.getByRole('button', { name: '제출하기' })).toBeEnabled()
  })

  it('확인하면 틀린 문항을 알려주고 정답은 감춘다', async () => {
    const user = userEvent.setup()
    render(<StudentHomeworkView category="naesin" />)
    await user.click(screen.getByText('월요일 과제'))

    // 1번은 정답(①), 2번은 오답(정답 ②인데 ⑤를 고름)
    await user.click(screen.getByTestId('cell-1-①'))
    await user.click(screen.getByTestId('cell-2-⑤'))
    await user.click(screen.getByRole('button', { name: '확인하기' }))

    await waitFor(() => expect(state.data.addHomeworkCheck).toHaveBeenCalled())
    expect(screen.getByTestId('check-score')).toHaveTextContent('1')
    expect(screen.getByTestId('cell-1')).toHaveAttribute('data-wrong', 'false')
    expect(screen.getByTestId('cell-2')).toHaveAttribute('data-wrong', 'true')

    // 정답(②)이 화면에 드러나면 안 된다
    expect(document.querySelectorAll('[data-result="answer"]').length).toBe(0)
  })

  it('확인한 답안이 그대로 기록된다', async () => {
    const user = userEvent.setup()
    render(<StudentHomeworkView category="naesin" />)
    await user.click(screen.getByText('월요일 과제'))
    await user.click(screen.getByTestId('cell-1-①'))
    await user.click(screen.getByTestId('cell-2-⑤'))
    await user.click(screen.getByRole('button', { name: '확인하기' }))

    await waitFor(() => expect(state.data.addHomeworkCheck).toHaveBeenCalledWith({
      dayId: 10,
      studentId: 7,
      answers: [
        { number: 1, answer: '①' },
        { number: 2, answer: '⑤' },
      ],
    }))
  })

  it('확인 뒤에 틀린 답을 고쳐 제출할 수 있다', async () => {
    const user = userEvent.setup()
    render(<StudentHomeworkView category="naesin" />)
    await user.click(screen.getByText('월요일 과제'))
    await user.click(screen.getByTestId('cell-1-①'))
    await user.click(screen.getByTestId('cell-2-⑤'))
    await user.click(screen.getByRole('button', { name: '확인하기' }))
    await waitFor(() => expect(state.data.addHomeworkCheck).toHaveBeenCalled())

    // ⑤를 끄고 ②로 고친다
    await user.click(screen.getByTestId('cell-2-⑤'))
    await user.click(screen.getByTestId('cell-2-②'))
    await user.click(screen.getByRole('button', { name: '제출하기' }))

    await waitFor(() => expect(state.data.upsertHomeworkSubmission).toHaveBeenCalledWith({
      dayId: 10,
      studentId: 7,
      answers: [
        { number: 1, answer: '①' },
        { number: 2, answer: '②' },
      ],
    }))
  })

  it('이미 확인한 요일이면 확인하기가 아예 안 보인다', async () => {
    const user = userEvent.setup()
    state.data.homeworkChecks = [
      { id: 800, dayId: 10, studentId: 7, answers: [], checkedAt: '2026-09-11T01:00:00Z' },
    ]
    render(<StudentHomeworkView category="naesin" />)
    await user.click(screen.getByText('월요일 과제'))
    await user.click(screen.getByTestId('cell-1-①'))
    await user.click(screen.getByTestId('cell-2-⑤'))

    expect(screen.queryByRole('button', { name: '확인하기' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '제출하기' })).toBeEnabled()
  })

  it('확인을 건너뛰고 바로 제출할 수 있다', async () => {
    const user = userEvent.setup()
    render(<StudentHomeworkView category="naesin" />)
    await user.click(screen.getByText('월요일 과제'))
    await user.click(screen.getByTestId('cell-1-①'))
    await user.click(screen.getByTestId('cell-2-⑤'))
    await user.click(screen.getByRole('button', { name: '제출하기' }))

    await waitFor(() => expect(state.data.upsertHomeworkSubmission).toHaveBeenCalled())
    expect(state.data.addHomeworkCheck).not.toHaveBeenCalled()
  })

  it('확인 기록에 실패하면 결과를 보여주지 않고 에러를 띄운다', async () => {
    const user = userEvent.setup()
    // DB 오류로 addHomeworkCheck가 null을 반환하는 상황 —
    // 이때 결과를 보여주면 기록 없이 새로고침해 몇 번이든 다시 확인할 수 있다
    state.data.addHomeworkCheck = vi.fn().mockResolvedValue(null)
    render(<StudentHomeworkView category="naesin" />)
    await user.click(screen.getByText('월요일 과제'))
    await user.click(screen.getByTestId('cell-1-①'))
    await user.click(screen.getByTestId('cell-2-⑤'))
    await user.click(screen.getByRole('button', { name: '확인하기' }))

    expect(await screen.findByText(/확인에 실패했습니다/)).toBeInTheDocument()
    expect(screen.queryByTestId('check-score')).not.toBeInTheDocument()
  })

  it('확인에 성공하면 확인하기 버튼이 사라진다', async () => {
    const user = userEvent.setup()
    // 실제 DataContext처럼 확인에 성공하면 homeworkChecks에 기록이 쌓인다.
    // 여기서도 그렇게 해야 "요일당 한 번" 게이트가 화면에서 실제로 작동하는지가
    // 이 테스트로 검증된다(안 그러면 회귀가 나도 계속 통과한다).
    state.data.addHomeworkCheck = vi.fn().mockImplementation(({ dayId, studentId, answers }) => {
      const record = { id: 800, dayId, studentId, answers, checkedAt: '2026-09-11T01:00:00Z' }
      state.data.homeworkChecks.push(record)
      return Promise.resolve(record)
    })
    render(<StudentHomeworkView category="naesin" />)
    await user.click(screen.getByText('월요일 과제'))
    await user.click(screen.getByTestId('cell-1-①'))
    await user.click(screen.getByTestId('cell-2-⑤'))
    await user.click(screen.getByRole('button', { name: '확인하기' }))

    await waitFor(() =>
      expect(screen.queryByRole('button', { name: '확인하기' })).not.toBeInTheDocument()
    )
  })

  // 화면이 지금 입력한 답(payload)이 아니라 addHomeworkCheck가 돌려준 saved.answers로
  // 채점해야 한다. 저장된 답 대신 입력값으로 채점하면, 답을 바꿔가며 확인 버튼을
  // 몇 번이든 눌러(또는 탭을 새로 열어) 정답표 전체를 알아낼 수 있게 된다.
  it('확인 결과는 지금 입력한 답이 아니라 저장된 답 기준으로 나온다', async () => {
    const user = userEvent.setup()
    // 다른 기기에서 먼저 확인해 저장된 답은 1·2번 다 오답(⑤)인데,
    // 지금 이 화면에는 1·2번 다 정답(①·②)을 입력해둔 상황을 흉내낸다.
    state.data.addHomeworkCheck = vi.fn().mockResolvedValue({
      id: 800, dayId: 10, studentId: 7,
      answers: [{ number: 1, answer: '⑤' }, { number: 2, answer: '⑤' }],
      checkedAt: '2026-09-11T01:00:00Z',
    })
    render(<StudentHomeworkView category="naesin" />)
    await user.click(screen.getByText('월요일 과제'))
    await user.click(screen.getByTestId('cell-1-①'))
    await user.click(screen.getByTestId('cell-2-②'))
    await user.click(screen.getByRole('button', { name: '확인하기' }))

    // 지금 입력값 기준이면 2/2가 나와야 하지만, 저장된 답 기준이면 0/2다.
    await waitFor(() => expect(screen.getByTestId('check-score')).toHaveTextContent('0'))
    expect(screen.getByTestId('cell-1')).toHaveAttribute('data-wrong', 'true')
    expect(screen.getByTestId('cell-2')).toHaveAttribute('data-wrong', 'true')
  })
})
