// src/pages/QnA.test.jsx
// Q&A 간편화 — 말머리로 받고, 테스트·문항 선택은 없앴다.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import QnA from './QnA'

const state = {}
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: state.user }) }))
vi.mock('../context/DataContext', () => ({ useData: () => state.data }))
// Layout은 사이드바·라우터를 끌고 오므로 껍데기만 둔다
vi.mock('../components/Layout', () => ({ default: ({ children }) => <div>{children}</div> }))

beforeEach(() => {
  state.user = { id: 't1', role: 'teacher' }
  state.data = {
    classes:  [{ id: 10, name: 'A반', teacherId: 't1' }],
    students: [{ id: 1, name: '홍길동', classId: 10 }],
    qnaList: [
      { id: 100, category: 'naesin', studentId: 1, content: '내신 3번이 이해가 안 돼요',
        createdAt: '2026-08-20T09:00:00Z', answer: null },
      { id: 200, category: 'etc', studentId: 1, content: '보충 수업은 언제인가요',
        createdAt: '2026-08-20T10:00:00Z', answer: '금요일입니다' },
      // 말머리가 없는 옛 질문 — 매퍼가 'test'로 채워 준다
      { id: 300, category: 'test', studentId: 1, content: '지난 테스트 2번요',
        createdAt: '2026-08-19T09:00:00Z', answer: null },
    ],
    addQuestion:    vi.fn().mockResolvedValue({ question: { id: 400 } }),
    answerQuestion: vi.fn().mockResolvedValue(undefined),
  }
})

describe('QnA 목록', () => {
  it('질문마다 말머리가 보인다', () => {
    render(<QnA />)
    expect(screen.getByTestId('question-100')).toHaveTextContent('내신과제')
    expect(screen.getByTestId('question-200')).toHaveTextContent('기타')
    expect(screen.getByTestId('question-300')).toHaveTextContent('테스트')
  })

  it('말머리로 걸러진다', async () => {
    const user = userEvent.setup()
    render(<QnA />)
    await user.click(screen.getByTestId('filter-naesin'))

    expect(screen.getByTestId('question-100')).toBeInTheDocument()
    expect(screen.queryByTestId('question-200')).not.toBeInTheDocument()
    expect(screen.queryByTestId('question-300')).not.toBeInTheDocument()
  })

  it('미답변 건수를 교사에게 알린다', () => {
    render(<QnA />)
    expect(screen.getByText('미답변 2건')).toBeInTheDocument()
  })

  it('담당 반이 아닌 학생의 질문은 보이지 않는다', () => {
    state.data.students = [{ id: 1, name: '홍길동', classId: 99 }] // 내 반이 아니다
    render(<QnA />)
    expect(screen.queryByTestId('question-100')).not.toBeInTheDocument()
    expect(screen.getByText('질문이 없습니다.')).toBeInTheDocument()
  })
})

describe('QnA 질문하기 (학생)', () => {
  beforeEach(() => {
    state.user = { id: 's1', role: 'student', studentId: 1, classId: 10 }
  })

  it('테스트가 하나도 없어도 질문할 수 있다', async () => {
    const user = userEvent.setup()
    // 예전에는 종료된 테스트가 없으면 질문 자체가 막혔다
    render(<QnA />)
    await user.click(screen.getByRole('button', { name: '+ 질문하기' }))

    expect(screen.getByRole('button', { name: '질문 등록' })).toBeInTheDocument()
    expect(screen.queryByText('관련 테스트')).not.toBeInTheDocument()
    expect(screen.queryByText(/관련 문항/)).not.toBeInTheDocument()
  })

  it('고른 말머리와 내용으로 등록한다', async () => {
    const user = userEvent.setup()
    render(<QnA />)
    await user.click(screen.getByRole('button', { name: '+ 질문하기' }))

    await user.click(screen.getByTestId('pick-jeongsi'))
    await user.type(screen.getByPlaceholderText(/궁금한 점/), '정시 4번 풀이가 궁금해요')
    await user.click(screen.getByRole('button', { name: '질문 등록' }))

    await waitFor(() => expect(state.data.addQuestion).toHaveBeenCalledWith({
      category:  'jeongsi',
      content:   '정시 4번 풀이가 궁금해요',
      studentId: 1,
    }))
  })

  it('말머리를 안 고르면 내신과제로 시작한다', async () => {
    const user = userEvent.setup()
    render(<QnA />)
    await user.click(screen.getByRole('button', { name: '+ 질문하기' }))
    expect(screen.getByTestId('pick-naesin')).toHaveAttribute('aria-pressed', 'true')
  })

  it('내용이 비면 등록할 수 없다', async () => {
    const user = userEvent.setup()
    render(<QnA />)
    await user.click(screen.getByRole('button', { name: '+ 질문하기' }))
    expect(screen.getByRole('button', { name: '질문 등록' })).toBeDisabled()
  })

  it('등록에 실패하면 목록으로 넘어가지 않고 사유를 보여준다', async () => {
    const user = userEvent.setup()
    // 올라간 줄 알고 지나가면 학생은 답을 영영 못 받는다
    state.data.addQuestion = vi.fn().mockResolvedValue({ error: 'null value in column "student_id"' })
    render(<QnA />)
    await user.click(screen.getByRole('button', { name: '+ 질문하기' }))
    await user.type(screen.getByPlaceholderText(/궁금한 점/), '테스트 질문')
    await user.click(screen.getByRole('button', { name: '질문 등록' }))

    expect(await screen.findByTestId('ask-error')).toHaveTextContent('student_id')
    // 작성 화면에 그대로 머문다 — 쓴 내용도 살아 있다
    expect(screen.getByPlaceholderText(/궁금한 점/)).toHaveValue('테스트 질문')
  })

  it('계정에 학생 정보가 없으면 아예 못 쓰게 막고 이유를 알린다', async () => {
    const user = userEvent.setup()
    state.user = { id: 's1', role: 'student', studentId: null, classId: 10 }
    render(<QnA />)
    await user.click(screen.getByRole('button', { name: '+ 질문하기' }))

    expect(screen.getByText(/학생 정보가 연결되어 있지 않아/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '질문 등록' })).not.toBeInTheDocument()
  })

  it('다른 학생 이름은 익명으로 가린다', () => {
    state.data.qnaList = [
      { id: 100, category: 'naesin', studentId: 2, content: '남의 질문',
        createdAt: '2026-08-20T09:00:00Z', answer: null },
    ]
    render(<QnA />)
    expect(screen.getByTestId('question-100')).toHaveTextContent('익명')
    expect(screen.getByTestId('question-100')).not.toHaveTextContent('홍길동')
  })
})
