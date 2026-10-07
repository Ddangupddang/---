// src/pages/Tests.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AuthContext } from '../context/AuthContext'
import Tests from './Tests'

// 저장 payload를 확인하는 테스트가 스파이를 갈아끼우고, 응시 테스트가 자기 문항을
// 심을 수 있도록 가변 상태를 하나 둔다 (vi.mock 팩토리는 끌어올려지므로 값은 호출 시점에 읽는다)
const state = {}

// DataContext(useData)를 Mock 데이터로 대체 — 실제 Supabase 연결 없이 UI 로직만 검증
// (DataContext는 createContext 객체를 export하지 않으므로 Provider 대신 useData를 모킹)
vi.mock('../context/DataContext', async () => {
  const { classes }     = await import('../data/classes')
  const { students }    = await import('../data/students')
  const { tests }       = await import('../data/tests')
  const { submissions } = await import('../data/submissions')
  return {
    useData: () => ({
      classes, students,
      submissions: state.submissions ?? submissions,
      tests: state.tests ?? tests,
      addTest: state.addTest,
      updateTest: state.updateTest,
      refreshTest: state.refreshTest,
      updateTestStatus: () => {},
      deleteTest: () => {},
      addSubmission: state.addSubmission,
      updateSubmissionScores: () => {},
    }),
  }
})

beforeEach(() => {
  state.tests         = null
  state.submissions   = null
  state.addTest       = vi.fn()
  state.updateTest    = vi.fn(async () => ({}))
  state.refreshTest   = vi.fn()
  state.addSubmission = vi.fn()
})

function renderWithAuth(user) {
  return render(
    <AuthContext.Provider value={{ user, login: () => {}, logout: () => {} }}>
      <MemoryRouter>
        <Tests />
      </MemoryRouter>
    </AuthContext.Provider>
  )
}

describe('Tests — 교사 역할', () => {
  const teacher = { id: 2, name: '김선생', role: 'teacher' }

  it('"테스트 만들기" 버튼이 표시', () => {
    renderWithAuth(teacher)
    expect(screen.getByText('+ 테스트 만들기')).toBeInTheDocument()
  })

  it('테스트 목록이 표시 (Mock 데이터)', () => {
    renderWithAuth(teacher)
    expect(screen.getByText('4월 2주차 독서 테스트')).toBeInTheDocument()
  })

  it('"테스트 만들기" 클릭 시 생성 폼으로 전환', () => {
    renderWithAuth(teacher)
    fireEvent.click(screen.getByText('+ 테스트 만들기'))
    expect(screen.getByPlaceholderText('예: 4월 2주차 독서 테스트')).toBeInTheDocument()
  })

  it('테스트 제목 클릭 시 제출 목록으로 전환', () => {
    renderWithAuth(teacher)
    fireEvent.click(screen.getByText('4월 2주차 독서 테스트'))
    expect(screen.getByText('제출 목록')).toBeInTheDocument()
  })
})

describe('Tests — 교사 정답 지정 (CreateView)', () => {
  const teacher = { id: 2, name: '김선생', role: 'teacher' }

  // 선지 클릭이 "교체"가 아니라 "토글"이므로, 새 문항이 어떤 선지도 켜지 않은 채
  // 시작해야 교사가 누른 것만 정답이 된다 — 미리 켜두면 누른 선지가 거기에 더해진다
  it('객관식 문항에 ③만 켜고 저장하면 정답이 정확히 ③으로 전달된다', async () => {
    renderWithAuth(teacher)
    fireEvent.click(screen.getByText('+ 테스트 만들기'))
    fireEvent.change(screen.getByPlaceholderText('예: 4월 2주차 독서 테스트'), {
      target: { value: '정답 지정 테스트' },
    })
    fireEvent.change(screen.getByPlaceholderText('예: 20'), { target: { value: '1' } })
    fireEvent.click(screen.getByTestId('cell-1-③'))
    fireEvent.click(screen.getByRole('button', { name: '저장' }))

    await waitFor(() => expect(state.addTest).toHaveBeenCalledTimes(1))
    expect(state.addTest.mock.calls[0][0].questions[0].answer).toBe('③')
  })

  it('문항 수를 넣으면 그 수만큼 문항이 만들어지고 총점이 나눠 담긴다', async () => {
    renderWithAuth(teacher)
    fireEvent.click(screen.getByText('+ 테스트 만들기'))
    fireEvent.change(screen.getByPlaceholderText('예: 4월 2주차 독서 테스트'), {
      target: { value: '20문항 테스트' },
    })
    fireEvent.change(screen.getByPlaceholderText('예: 20'), { target: { value: '20' } })
    for (let n = 1; n <= 20; n++) fireEvent.click(screen.getByTestId(`cell-${n}-①`))
    fireEvent.click(screen.getByRole('button', { name: '저장' }))

    await waitFor(() => expect(state.addTest).toHaveBeenCalledTimes(1))
    const { questions } = state.addTest.mock.calls[0][0]
    expect(questions).toHaveLength(20)
    expect(questions.every((q) => q.type === 'mc' && q.points === 5)).toBe(true)
  })

  it('정답을 지정하지 않은 문항이 있으면 저장할 수 없고 몇 번인지 알려준다', () => {
    renderWithAuth(teacher)
    fireEvent.click(screen.getByText('+ 테스트 만들기'))
    fireEvent.change(screen.getByPlaceholderText('예: 4월 2주차 독서 테스트'), {
      target: { value: '미완성 테스트' },
    })
    fireEvent.change(screen.getByPlaceholderText('예: 20'), { target: { value: '3' } })
    fireEvent.click(screen.getByTestId('cell-2-②'))

    expect(screen.getByTestId('save-blocked')).toHaveTextContent('1, 3번 정답을 지정해 주세요.')
    expect(screen.getByRole('button', { name: '저장' })).toBeDisabled()
  })

  it('문항 수를 줄이면 사라진 문항의 정답도 함께 버린다', async () => {
    renderWithAuth(teacher)
    fireEvent.click(screen.getByText('+ 테스트 만들기'))
    fireEvent.change(screen.getByPlaceholderText('예: 4월 2주차 독서 테스트'), {
      target: { value: '줄이기 테스트' },
    })
    const countInput = screen.getByPlaceholderText('예: 20')
    fireEvent.change(countInput, { target: { value: '2' } })
    fireEvent.click(screen.getByTestId('cell-1-①'))
    fireEvent.click(screen.getByTestId('cell-2-⑤'))
    // 2번을 지웠다가 다시 늘려도 예전 답이 되살아나지 않는다
    fireEvent.change(countInput, { target: { value: '1' } })
    fireEvent.change(countInput, { target: { value: '2' } })
    fireEvent.click(screen.getByTestId('cell-2-③'))
    fireEvent.click(screen.getByRole('button', { name: '저장' }))

    await waitFor(() => expect(state.addTest).toHaveBeenCalledTimes(1))
    expect(state.addTest.mock.calls[0][0].questions[1].answer).toBe('③')
  })

  it('나누어떨어지지 않으면 1점 단위로 나눠 합계가 딱 100점이다', () => {
    renderWithAuth(teacher)
    fireEvent.click(screen.getByText('+ 테스트 만들기'))
    fireEvent.change(screen.getByPlaceholderText('예: 20'), { target: { value: '30' } })

    expect(screen.getByTestId('points-summary'))
      .toHaveTextContent('30문항 · 4점 × 10문항, 3점 × 20문항 · 합계 100점')
  })

  it('문항별 배점을 고칠 수 있고, 합계가 총점과 다르면 저장을 막고 이유를 알려준다', async () => {
    renderWithAuth(teacher)
    fireEvent.click(screen.getByText('+ 테스트 만들기'))
    fireEvent.change(screen.getByPlaceholderText('예: 4월 2주차 독서 테스트'), {
      target: { value: '배점 고치기' },
    })
    fireEvent.change(screen.getByPlaceholderText('예: 20'), { target: { value: '4' } })
    for (let n = 1; n <= 4; n++) fireEvent.click(screen.getByTestId(`cell-${n}-①`))
    fireEvent.click(screen.getByText('문항별 배점 고치기'))

    // 25점씩 → 1번을 40점으로 올리면 합계 115점이 돼 저장이 막힌다
    fireEvent.change(screen.getByTestId('points-1'), { target: { value: '40' } })
    expect(screen.getByTestId('save-blocked')).toHaveTextContent('배점 합계(115점)를 총점 100점에 맞춰 주세요.')
    expect(screen.getByRole('button', { name: '저장' })).toBeDisabled()

    // 2번을 10점으로 내려 다시 100점을 맞추면 저장된다
    fireEvent.change(screen.getByTestId('points-2'), { target: { value: '10' } })
    fireEvent.click(screen.getByRole('button', { name: '저장' }))
    await waitFor(() => expect(state.addTest).toHaveBeenCalledTimes(1))
    expect(state.addTest.mock.calls[0][0].questions.map((q) => q.points)).toEqual([40, 10, 25, 25])
  })

  it('주관식은 객관식 뒤 번호로 붙고 배점도 함께 나눠 갖는다', async () => {
    renderWithAuth(teacher)
    fireEvent.click(screen.getByText('+ 테스트 만들기'))
    fireEvent.change(screen.getByPlaceholderText('예: 4월 2주차 독서 테스트'), {
      target: { value: '주관식 포함' },
    })
    fireEvent.change(screen.getByPlaceholderText('예: 20'), { target: { value: '3' } })
    for (let n = 1; n <= 3; n++) fireEvent.click(screen.getByTestId(`cell-${n}-①`))
    fireEvent.click(screen.getByText('+ 주관식'))
    fireEvent.click(screen.getByRole('button', { name: '저장' }))

    await waitFor(() => expect(state.addTest).toHaveBeenCalledTimes(1))
    const { questions } = state.addTest.mock.calls[0][0]
    expect(questions).toHaveLength(4)
    expect(questions[3]).toMatchObject({ id: 4, type: 'sa', answer: null })
    expect(questions.reduce((sum, q) => sum + q.points, 0)).toBe(100)
  })
})

describe('Tests — 학생 응시 (TakeView)', () => {
  const student = { id: 4, name: '홍길동', role: 'student', classId: 1, studentId: 1 }

  // 학생이 받는 문항에는 정답이 없다(tests_visible 이 덜어낸다) — 실제와 똑같이 answer를 뺀다.
  // 예전 테스트는 정답을 넣어 둔 채 "학생 폰이 채점한다"를 확인해서, 실제로는
  // 정답이 없어 전부 0점이 되던 문제(2026-09-16~10-07)를 잡지 못했다.
  const activeTest = {
    id: 99, title: '복수 정답 응시 테스트', classId: 1, teacherId: 2,
    date: '2026-04-20', timeLimit: null, status: 'active', startedAt: null,
    questions: [
      { id: 1, type: 'mc', content: '', choices: ['①', '②', '③', '④', '⑤'], points: 10 },
    ],
  }

  async function submitWith(picks) {
    renderWithAuth(student)
    fireEvent.click(screen.getByText('복수 정답 응시 테스트'))
    picks.forEach((c) => fireEvent.click(screen.getByRole('button', { name: c })))
    fireEvent.click(screen.getByRole('button', { name: '제출하기' }))
    await waitFor(() => expect(state.addSubmission).toHaveBeenCalledTimes(1))
    return state.addSubmission.mock.calls[0][0]
  }

  it('고른 답만 보내고 점수는 매기지 않는다 — 채점은 DB가 한다', async () => {
    state.tests = [activeTest]
    const payload = await submitWith(['①', '③'])
    expect(payload.answers).toContainEqual({ questionId: 1, answer: '①③' })
    expect(payload.scores).toBeUndefined()
  })

  it('DB가 채점해 돌려주면 정답이 담긴 문항을 다시 받는다', async () => {
    state.tests = [activeTest]
    state.addSubmission = vi.fn(async () => ({ id: 1, scores: [{ questionId: 1, score: 10 }] }))
    await submitWith(['①'])
    await waitFor(() => expect(state.refreshTest).toHaveBeenCalledWith(99))
  })
})

describe('Tests — 학생 결과 (ResultView)', () => {
  const student = { id: 4, name: '홍길동', role: 'student', classId: 1, studentId: 1 }

  it('틀린 문항 번호를 위에 모아 보여주고, 총점은 소수 찌꺼기 없이 표시한다', () => {
    state.tests = [{
      id: 77, title: '결과 테스트', classId: 1, teacherId: 2,
      date: '2026-10-07', timeLimit: null, status: 'closed', startedAt: null,
      questions: [
        { id: 1, type: 'mc', choices: ['①', '②', '③', '④', '⑤'], answer: '①', points: 3.4 },
        { id: 2, type: 'mc', choices: ['①', '②', '③', '④', '⑤'], answer: '②', points: 3.3 },
        { id: 3, type: 'mc', choices: ['①', '②', '③', '④', '⑤'], answer: '③', points: 3.3 },
      ],
    }]
    state.submissions = [{
      id: 5, testId: 77, studentId: 1, submittedAt: '2026-10-07T01:00:00Z',
      answers: [{ questionId: 1, answer: '①' }, { questionId: 2, answer: '④' }, { questionId: 3, answer: '③' }],
      scores:  [{ questionId: 1, score: 3.4 }, { questionId: 2, score: 0 }, { questionId: 3, score: 3.3 }],
    }]
    renderWithAuth(student)
    fireEvent.click(screen.getByText('결과 테스트'))

    expect(screen.getByTestId('result-total')).toHaveTextContent('6.7 / 10점')
    expect(screen.getByTestId('wrong-list')).toHaveTextContent('2번')
    expect(screen.getByTestId('wrong-list')).not.toHaveTextContent('1번')
    expect(screen.getByTestId('cell-2')).toHaveAttribute('data-wrong', 'true')
  })
})

describe('Tests — 시작 전 수정', () => {
  const teacher = { id: 2, name: '김선생', role: 'teacher' }

  it('준비중 테스트는 수정 버튼으로 시간·정답·배점을 고쳐 저장한다', async () => {
    state.tests = [{
      id: 55, title: '수정할 테스트', classId: 1, teacherId: 2,
      date: '2026-10-07', timeLimit: 30, status: 'ready', startedAt: null,
      questions: [
        { id: 1, type: 'mc', content: '', choices: ['①', '②', '③', '④', '⑤'], answer: '①', points: 60 },
        { id: 2, type: 'mc', content: '', choices: ['①', '②', '③', '④', '⑤'], answer: '②', points: 40 },
      ],
    }]
    renderWithAuth(teacher)
    fireEvent.click(screen.getByRole('button', { name: '수정' }))

    // 기존 값이 채워져 있다 — 고친 배점(60/40)도 그대로
    expect(screen.getByDisplayValue('수정할 테스트')).toBeInTheDocument()
    expect(screen.getByTestId('points-1')).toHaveValue(60)

    fireEvent.change(screen.getByTestId('time-limit'), { target: { value: '45' } })
    fireEvent.click(screen.getByTestId('cell-2-②'))   // ② 끄기
    fireEvent.click(screen.getByTestId('cell-2-⑤'))   // ⑤ 켜기
    fireEvent.click(screen.getByRole('button', { name: '수정 저장' }))

    await waitFor(() => expect(state.updateTest).toHaveBeenCalledTimes(1))
    const [id, data] = state.updateTest.mock.calls[0]
    expect(id).toBe(55)
    expect(data.timeLimit).toBe(45)
    expect(data.questions.map((q) => q.answer)).toEqual(['①', '⑤'])
    expect(data.questions.map((q) => q.points)).toEqual([60, 40])
  })

  it('진행중 테스트에는 수정 버튼이 없다', () => {
    state.tests = [{
      id: 56, title: '진행중 테스트', classId: 1, teacherId: 2,
      date: '2026-10-07', timeLimit: 30, status: 'active', startedAt: null, questions: [],
    }]
    renderWithAuth(teacher)
    expect(screen.queryByRole('button', { name: '수정' })).toBeNull()
  })
})

describe('Tests — 학생 역할', () => {
  const student = { id: 4, name: '홍길동', role: 'student', classId: 1, studentId: 1 }

  it('"테스트 만들기" 버튼이 없음', () => {
    renderWithAuth(student)
    expect(screen.queryByText('+ 테스트 만들기')).toBeNull()
  })

  it('본인 반(classId:1) 테스트만 표시', () => {
    renderWithAuth(student)
    expect(screen.getByText('4월 2주차 독서 테스트')).toBeInTheDocument()
    expect(screen.queryByText('4월 2주차 문학 테스트')).toBeNull()
  })
})
