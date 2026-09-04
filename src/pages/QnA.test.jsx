// src/pages/QnA.test.jsx
// Q&A 간편화 — 말머리로 받고, 테스트·문항 선택은 없앴다.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import QnA from './QnA'

// jsdom에는 없다. 미리보기가 이걸 쓴다.
globalThis.URL.createObjectURL = vi.fn(() => 'blob:preview')
globalThis.URL.revokeObjectURL = vi.fn()

const jpeg = (name = 'photo.jpg') => new File(['x'], name, { type: 'image/jpeg' })
// 숨겨진 file input이라 클릭이 안 먹는다. change를 직접 쏜다.
const pick = (files) =>
  fireEvent.change(screen.getByTestId('qna-photo-input'), { target: { files } })

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
    uploadQnaImage: vi.fn().mockResolvedValue('1/token.jpg'),
    qnaImageUrl:    vi.fn().mockResolvedValue('https://example.test/signed.jpg'),
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
      category:   'jeongsi',
      content:    '정시 4번 풀이가 궁금해요',
      imagePaths: [],
      studentId:  1,
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

  it('다른 학생의 질문은 아예 보이지 않는다', () => {
    // Q&A는 1:1 상담이다. 답안지 사진이 붙는 곳이라 반 친구에게 보이면 안 된다.
    state.data.qnaList = [
      { id: 100, category: 'naesin', studentId: 2, content: '남의 질문',
        createdAt: '2026-08-20T09:00:00Z', answer: null },
    ]
    render(<QnA />)
    expect(screen.queryByTestId('question-100')).not.toBeInTheDocument()
    expect(screen.getByText('질문이 없습니다.')).toBeInTheDocument()
  })

  it('본인 질문은 "나"로 표시된다', () => {
    state.data.qnaList = [
      { id: 100, category: 'naesin', studentId: 1, content: '내 질문',
        createdAt: '2026-08-20T09:00:00Z', answer: null },
    ]
    render(<QnA />)
    expect(screen.getByTestId('question-100')).toHaveTextContent('나')
    expect(screen.getByTestId('question-100')).not.toHaveTextContent('홍길동')
  })
})

describe('질문 사진 첨부 (학생)', () => {
  beforeEach(async () => {
    state.user = { id: 's1', role: 'student', studentId: 1, classId: 10 }
    state.data.qnaList = []
  })

  // 작성 화면까지 열어 준다
  async function openAsk(user) {
    render(<QnA />)
    await user.click(screen.getByRole('button', { name: '+ 질문하기' }))
  }

  it('고른 사진이 미리보기로 뜬다', async () => {
    const user = userEvent.setup()
    await openAsk(user)

    pick([jpeg()])

    expect(await screen.findByTestId('qna-photo-0')).toBeInTheDocument()
  })

  it('3장을 채우면 더 고를 수 없다', async () => {
    const user = userEvent.setup()
    await openAsk(user)

    pick([jpeg('a.jpg'), jpeg('b.jpg'), jpeg('c.jpg')])

    expect(await screen.findByTestId('qna-photo-2')).toBeInTheDocument()
    expect(screen.queryByTestId('qna-photo-add')).not.toBeInTheDocument()
  })

  it('4장째는 받지 않고 사유를 알린다', async () => {
    const user = userEvent.setup()
    await openAsk(user)

    pick([jpeg('a.jpg'), jpeg('b.jpg'), jpeg('c.jpg'), jpeg('d.jpg')])

    expect(await screen.findByTestId('qna-photo-error')).toHaveTextContent('3장')
    expect(screen.queryByTestId('qna-photo-3')).not.toBeInTheDocument()
  })

  it('사진이 아닌 파일은 받지 않고 사유를 알린다', async () => {
    const user = userEvent.setup()
    await openAsk(user)

    pick([new File(['x'], '메모.pdf', { type: 'application/pdf' })])

    expect(await screen.findByTestId('qna-photo-error')).toHaveTextContent('사진만')
    expect(screen.queryByTestId('qna-photo-0')).not.toBeInTheDocument()
  })

  it('뺀 사진은 미리보기에서 사라진다', async () => {
    const user = userEvent.setup()
    await openAsk(user)

    pick([jpeg('a.jpg'), jpeg('b.jpg')])
    await screen.findByTestId('qna-photo-1')
    await user.click(screen.getByTestId('qna-photo-remove-0'))

    expect(screen.getByTestId('qna-photo-0')).toBeInTheDocument()
    expect(screen.queryByTestId('qna-photo-1')).not.toBeInTheDocument()
  })

  it('등록하면 사진을 올리고 경로를 질문에 함께 담는다', async () => {
    const user = userEvent.setup()
    await openAsk(user)

    pick([jpeg()])
    await screen.findByTestId('qna-photo-0')
    await user.type(screen.getByPlaceholderText(/궁금한 점/), '이 문제 풀이가 궁금해요')
    await user.click(screen.getByRole('button', { name: '질문 등록' }))

    await waitFor(() => expect(state.data.addQuestion).toHaveBeenCalledWith({
      category:   'naesin',
      content:    '이 문제 풀이가 궁금해요',
      imagePaths: ['1/token.jpg'],
      studentId:  1,
    }))
  })

  it('사진 올리기가 실패하면 질문을 등록하지 않고 작성 화면에 남는다', async () => {
    const user = userEvent.setup()
    // 사진 없이 올라가면 학생은 "사진 보고 답해 주세요"라고 쓴 채로 답을 못 받는다
    state.data.uploadQnaImage = vi.fn().mockResolvedValue(null)
    await openAsk(user)

    pick([jpeg()])
    await screen.findByTestId('qna-photo-0')
    await user.type(screen.getByPlaceholderText(/궁금한 점/), '사진 보고 답해 주세요')
    await user.click(screen.getByRole('button', { name: '질문 등록' }))

    expect(await screen.findByTestId('ask-error')).toHaveTextContent('사진')
    expect(state.data.addQuestion).not.toHaveBeenCalled()
    expect(screen.getByPlaceholderText(/궁금한 점/)).toHaveValue('사진 보고 답해 주세요')
  })
})

describe('질문에 붙은 사진 보기', () => {
  beforeEach(() => {
    state.data.qnaList = [
      { id: 100, category: 'naesin', studentId: 1, content: '이 문제 풀이가 궁금해요',
        createdAt: '2026-08-20T09:00:00Z', answer: null, imagePaths: ['1/a.jpg', '1/b.jpg'] },
      { id: 200, category: 'etc', studentId: 1, content: '사진 없는 질문',
        createdAt: '2026-08-20T10:00:00Z', answer: null, imagePaths: [] },
    ]
  })

  it('사진이 있는 질문만 목록에서 표시가 붙는다', () => {
    render(<QnA />)
    expect(screen.getByTestId('photo-mark-100')).toBeInTheDocument()
    expect(screen.queryByTestId('photo-mark-200')).not.toBeInTheDocument()
  })

  it('상세 화면에서 교사가 사진을 본다', async () => {
    const user = userEvent.setup()
    render(<QnA />)
    await user.click(screen.getByTestId('question-100'))

    expect(await screen.findByTestId('detail-photo-0')).toHaveAttribute(
      'src', 'https://example.test/signed.jpg'
    )
    expect(screen.getByTestId('detail-photo-1')).toBeInTheDocument()
    expect(state.data.qnaImageUrl).toHaveBeenCalledWith('1/a.jpg')
  })
})

describe('질문 삭제', () => {
  beforeEach(() => {
    state.data.qnaList = [
      { id: 100, category: 'naesin', studentId: 1, content: '지울 질문',
        createdAt: '2026-09-04T09:00:00Z', answer: null, imagePaths: ['1/a.jpg'] },
    ]
    state.data.deleteQuestion = vi.fn().mockResolvedValue({})
  })

  it('교사는 담당 반 학생의 질문을 지운다 — 사진 경로도 함께 넘긴다', async () => {
    const user = userEvent.setup()
    render(<QnA />)
    await user.click(screen.getByTestId('question-100'))
    await user.click(screen.getByRole('button', { name: '질문 삭제' }))
    await user.click(screen.getByTestId('delete-confirm'))

    await waitFor(() =>
      expect(state.data.deleteQuestion).toHaveBeenCalledWith(100, ['1/a.jpg']))
  })

  it('확인을 거치지 않으면 지우지 않는다', async () => {
    const user = userEvent.setup()
    // 사진까지 사라지는 동작이라 한 번 물어본다
    render(<QnA />)
    await user.click(screen.getByTestId('question-100'))
    await user.click(screen.getByRole('button', { name: '질문 삭제' }))

    expect(state.data.deleteQuestion).not.toHaveBeenCalled()
    expect(screen.getByTestId('delete-confirm')).toBeInTheDocument()
  })

  it('학생은 본인 질문을 지울 수 있다', async () => {
    const user = userEvent.setup()
    state.user = { id: 's1', role: 'student', studentId: 1, classId: 10 }
    render(<QnA />)
    await user.click(screen.getByTestId('question-100'))

    expect(screen.getByRole('button', { name: '질문 삭제' })).toBeInTheDocument()
  })

  it('관리자는 반이 배정되지 않은 학생의 질문도 지울 수 있다', async () => {
    const user = userEvent.setup()
    // 담당 교사가 없어 아무도 못 지우는 질문이 남으면 안 된다
    state.user = { id: 'a', role: 'admin' }
    state.data.students = [{ id: 1, name: '홍길동', classId: null }]
    render(<QnA />)
    await user.click(screen.getByTestId('question-100'))

    expect(screen.getByRole('button', { name: '질문 삭제' })).toBeInTheDocument()
  })

  it('삭제에 실패하면 화면에 남고 사유를 보여준다', async () => {
    const user = userEvent.setup()
    // 지워진 줄 알고 넘어가면 새로고침했을 때 되살아나 혼란스럽다
    state.data.deleteQuestion = vi.fn().mockResolvedValue({ error: '삭제 권한이 없습니다.' })
    render(<QnA />)
    await user.click(screen.getByTestId('question-100'))
    await user.click(screen.getByRole('button', { name: '질문 삭제' }))
    await user.click(screen.getByTestId('delete-confirm'))

    expect(await screen.findByTestId('delete-error')).toHaveTextContent('권한')
    expect(screen.getByText('지울 질문')).toBeInTheDocument()
  })
})

describe('답변 수정·삭제', () => {
  beforeEach(() => {
    state.data.qnaList = [
      { id: 100, category: 'naesin', studentId: 1, content: '3번 문제요',
        createdAt: '2026-09-04T09:00:00Z', imagePaths: [],
        answer: '지문 2단락을 보세요', answeredAt: '2026-09-04T10:00:00Z', answeredBy: 't1' },
    ]
    state.data.answerQuestion = vi.fn().mockResolvedValue({})
    state.data.deleteAnswer   = vi.fn().mockResolvedValue({})
  })

  it('교사는 답변을 고쳐 저장한다', async () => {
    const user = userEvent.setup()
    render(<QnA />)
    await user.click(screen.getByTestId('question-100'))
    await user.click(screen.getByRole('button', { name: '답변 수정' }))

    const box = screen.getByDisplayValue('지문 2단락을 보세요')
    await user.clear(box)
    await user.type(box, '지문 3단락이 근거입니다')
    await user.click(screen.getByRole('button', { name: '답변 저장' }))

    await waitFor(() =>
      expect(state.data.answerQuestion).toHaveBeenCalledWith(100, '지문 3단락이 근거입니다', 't1'))
  })

  it('수정을 취소하면 원래 답변이 그대로 남는다', async () => {
    const user = userEvent.setup()
    render(<QnA />)
    await user.click(screen.getByTestId('question-100'))
    await user.click(screen.getByRole('button', { name: '답변 수정' }))
    await user.click(screen.getByRole('button', { name: '취소' }))

    expect(screen.getByText('지문 2단락을 보세요')).toBeInTheDocument()
    expect(state.data.answerQuestion).not.toHaveBeenCalled()
  })

  it('답변을 지우면 다시 답변 대기가 된다', async () => {
    const user = userEvent.setup()
    render(<QnA />)
    await user.click(screen.getByTestId('question-100'))
    await user.click(screen.getByRole('button', { name: '답변 삭제' }))
    await user.click(screen.getByTestId('answer-delete-confirm'))

    await waitFor(() => expect(state.data.deleteAnswer).toHaveBeenCalledWith(100))
  })

  it('학생에게는 수정·삭제 버튼이 보이지 않는다', async () => {
    const user = userEvent.setup()
    // 학생이 선생님 답변을 지울 수 있으면 안 된다
    state.user = { id: 's1', role: 'student', studentId: 1, classId: 10 }
    render(<QnA />)
    await user.click(screen.getByTestId('question-100'))

    expect(screen.getByText('지문 2단락을 보세요')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '답변 수정' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '답변 삭제' })).not.toBeInTheDocument()
  })
})
