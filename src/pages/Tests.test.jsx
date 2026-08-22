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
      classes, students, submissions,
      tests: state.tests ?? tests,
      addTest: state.addTest,
      updateTestStatus: () => {},
      deleteTest: () => {},
      addSubmission: state.addSubmission,
      updateSubmissionScores: () => {},
    }),
  }
})

beforeEach(() => {
  state.tests         = null
  state.addTest       = vi.fn()
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

describe('Tests — 학생 다중 선택 응시 (TakeView)', () => {
  const student = { id: 4, name: '홍길동', role: 'student', classId: 1, studentId: 1 }

  // 기본 Mock에는 학생이 응시할 수 있는(진행중 + 미제출) 테스트가 없어 직접 심는다.
  // timeLimit이 null이라 타이머가 돌지 않고, 정답은 두 선지를 모두 골라야 하는 문항이다.
  const multiTest = {
    id: 99, title: '복수 정답 응시 테스트', classId: 1, teacherId: 2,
    date: '2026-04-20', timeLimit: null, status: 'active', startedAt: null,
    questions: [
      { id: 1, type: 'mc', content: '1번', choices: ['①', '②', '③', '④', '⑤'], answer: '①③', points: 10 },
    ],
  }

  // 선지 몇 개를 켜고 제출한 뒤 addSubmission이 받은 payload를 돌려준다
  async function submitWith(picks) {
    const { unmount } = renderWithAuth(student)
    fireEvent.click(screen.getByText('복수 정답 응시 테스트'))
    picks.forEach((c) => fireEvent.click(screen.getByRole('button', { name: c })))
    fireEvent.click(screen.getByRole('button', { name: '제출하기' }))
    await waitFor(() => expect(state.addSubmission).toHaveBeenCalledTimes(1))
    const payload = state.addSubmission.mock.calls[0][0]
    unmount()
    return payload
  }

  it('두 선지를 모두 골라야 만점이고, 하나만 고르면 0점이다', async () => {
    state.tests = [multiTest]

    const both = await submitWith(['①', '③'])
    expect(both.answers).toContainEqual({ questionId: 1, answer: '①③' })
    expect(both.scores).toContainEqual({ questionId: 1, score: 10 })

    // 부분 점수는 없다 — 덜 고르면 0점
    state.addSubmission = vi.fn()
    const one = await submitWith(['①'])
    expect(one.answers).toContainEqual({ questionId: 1, answer: '①' })
    expect(one.scores).toContainEqual({ questionId: 1, score: 0 })
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
