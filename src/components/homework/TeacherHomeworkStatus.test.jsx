// src/components/homework/TeacherHomeworkStatus.test.jsx
// 교사 과제 현황 화면 테스트 — 그룹(학년/정시레벨) 탭 전환과 요일별 제출 집계.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TeacherHomeworkStatus from './TeacherHomeworkStatus'

const WEEK = '2026-08-10'

const state = {}
vi.mock('../../context/DataContext', () => ({ useData: () => state.data }))
vi.mock('../../context/AuthContext', () => ({ useAuth: () => state.auth }))

beforeEach(() => {
  // 기본은 관리자 — 담당 반 제한은 별도 테스트에서 확인한다
  state.auth = { user: { id: 'admin-1', role: 'admin' } }
  state.data = {
    students: [
      { id: 1, name: '고2-A', grade: 5, jeongsiLevel: 2 },
      { id: 2, name: '고2-B', grade: 5, jeongsiLevel: null },
      { id: 3, name: '중1-C', grade: 1, jeongsiLevel: null },
    ],
    homeworkSets: [
      { id: 11, category: 'naesin',  target: 5, weekStart: WEEK,        title: '고2 8월 2주차' },
      { id: 12, category: 'naesin',  target: 5, weekStart: '2026-08-03', title: '고2 8월 1주차' },
      { id: 13, category: 'jeongsi', target: 2, weekStart: WEEK,        title: '정시2 8월 2주차' },
    ],
    homeworkDays: [
      { id: 110, setId: 11, weekday: 1, date: '2026-08-10', questionCount: 2 },
      { id: 111, setId: 11, weekday: 2, date: '2026-08-11', questionCount: 3 },
      { id: 120, setId: 12, weekday: 1, date: '2026-08-03', questionCount: 2 },
      { id: 130, setId: 13, weekday: 1, date: '2026-08-10', questionCount: 5 },
    ],
    homeworkQuestions: [
      { id: 1, dayId: 110, number: 1, answer: '①' },
      { id: 2, dayId: 110, number: 2, answer: '②' },
    ],
    // 월요일은 고2 2명 중 1명만 제출 — 2번을 틀려 1/2
    homeworkSubmissions: [
      {
        id: 900, dayId: 110, studentId: 1, submittedAt: '2026-08-10T10:00:00Z',
        answers: [{ number: 1, answer: '①' }, { number: 2, answer: '⑤' }],
      },
    ],
  }
})

describe('TeacherHomeworkStatus (내신)', () => {
  it('과제가 없는 그룹에는 안내 문구를 보여준다', () => {
    // 기본 선택 그룹은 중1 — 중1 대상 세트는 없다
    render(<TeacherHomeworkStatus category="naesin" />)
    expect(screen.getByText('등록된 과제가 없습니다.')).toBeInTheDocument()
  })

  it('고2 탭을 누르면 해당 학년 세트와 요일별 제출 집계가 보인다', async () => {
    const user = userEvent.setup()
    render(<TeacherHomeworkStatus category="naesin" />)

    await user.click(screen.getByRole('button', { name: '고2' }))

    expect(screen.getByText('고2 8월 2주차')).toBeInTheDocument()
    // 고2 학생 2명 중 월요일은 1명 제출, 화요일은 0명 제출
    // (같은 학년의 다른 주차 세트에도 '0/2 제출'이 있으므로 요일 행 단위로 검증)
    expect(screen.getByText('월요일 · 2026-08-10').parentElement).toHaveTextContent('1/2 제출')
    expect(screen.getByText('화요일 · 2026-08-11').parentElement).toHaveTextContent('0/2 제출')
  })

  it('세트는 최신 주차가 위로 정렬된다', async () => {
    const user = userEvent.setup()
    render(<TeacherHomeworkStatus category="naesin" />)
    await user.click(screen.getByRole('button', { name: '고2' }))

    const titles = screen.getAllByText(/8월 \d주차/).map((el) => el.textContent)
    expect(titles[0]).toContain('8월 2주차')
    expect(titles[1]).toContain('8월 1주차')
  })

  it('다른 학년 세트는 섞여 나오지 않는다', async () => {
    const user = userEvent.setup()
    render(<TeacherHomeworkStatus category="naesin" />)
    await user.click(screen.getByRole('button', { name: '고2' }))
    expect(screen.queryByText('정시2 8월 2주차')).not.toBeInTheDocument()
  })
})

describe('TeacherHomeworkStatus — 요일별 학생 명단', () => {
  // 고2 탭의 월요일 카드를 펼친 상태로 만든다
  async function openMonday(user) {
    await user.click(screen.getByRole('button', { name: '고2' }))
    await user.click(screen.getByRole('button', { name: /월요일 · 2026-08-10/ }))
  }

  it('요일을 펼치기 전에는 학생 이름이 보이지 않는다', async () => {
    const user = userEvent.setup()
    render(<TeacherHomeworkStatus category="naesin" />)
    await user.click(screen.getByRole('button', { name: '고2' }))
    expect(screen.queryByText('고2-A')).not.toBeInTheDocument()
  })

  it('요일을 펼치면 미제출 학생과 제출 학생의 점수가 보인다', async () => {
    const user = userEvent.setup()
    render(<TeacherHomeworkStatus category="naesin" />)
    await openMonday(user)

    expect(screen.getByText('미제출')).toBeInTheDocument()
    expect(screen.getByText('고2-B')).toBeInTheDocument()   // 미제출
    expect(screen.getByText('고2-A')).toBeInTheDocument()   // 제출
    expect(screen.getByText('1/2 ›')).toBeInTheDocument()   // 2번 오답
  })

  it('다른 학년 학생은 명단에 섞이지 않는다', async () => {
    const user = userEvent.setup()
    render(<TeacherHomeworkStatus category="naesin" />)
    await openMonday(user)
    expect(screen.queryByText('중1-C')).not.toBeInTheDocument()
  })

  it('제출한 학생을 누르면 문항별 정답/오답이 보인다', async () => {
    const user = userEvent.setup()
    render(<TeacherHomeworkStatus category="naesin" />)
    await openMonday(user)

    await user.click(screen.getByRole('button', { name: /고2-A/ }))

    // 색이 아니라 의미를 단언한다 — 디자인 토큰이 바뀌어도 이 테스트는 그대로 통과해야 한다
    expect(screen.getByTestId('cell-1-①')).toHaveAttribute('data-result', 'correct')
    expect(screen.getByTestId('cell-2-⑤')).toHaveAttribute('data-result', 'wrong')
    expect(screen.getByTestId('cell-2-②')).toHaveAttribute('data-result', 'answer')
  })

  it('다시 누르면 명단이 접힌다', async () => {
    const user = userEvent.setup()
    render(<TeacherHomeworkStatus category="naesin" />)
    await openMonday(user)
    expect(screen.getByText('고2-B')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /월요일 · 2026-08-10/ }))
    expect(screen.queryByText('고2-B')).not.toBeInTheDocument()
  })
})

describe('TeacherHomeworkStatus — 문항별 오답률', () => {
  async function openMondayQuestions(user) {
    await user.click(screen.getByRole('button', { name: '고2' }))
    await user.click(screen.getByRole('button', { name: /월요일 · 2026-08-10/ }))
    await user.click(screen.getByRole('button', { name: '문항별' }))
  }

  it('요일을 펼치면 학생별 화면이 먼저 나온다', async () => {
    const user = userEvent.setup()
    render(<TeacherHomeworkStatus category="naesin" />)
    await user.click(screen.getByRole('button', { name: '고2' }))
    await user.click(screen.getByRole('button', { name: /월요일 · 2026-08-10/ }))

    expect(screen.getByText('고2-A')).toBeInTheDocument()
    expect(screen.queryByTestId('day-question-stats')).not.toBeInTheDocument()
  })

  it('문항별을 누르면 문항마다 오답률이 보인다', async () => {
    const user = userEvent.setup()
    render(<TeacherHomeworkStatus category="naesin" />)
    await openMondayQuestions(user)

    // 제출 1명(고2-A): 1번 정답, 2번 오답
    expect(screen.getByTestId('day-question-stats')).toHaveTextContent('제출 1명')
    expect(screen.getByTestId('qstat-1')).toHaveTextContent('0%')
    expect(screen.getByTestId('qstat-2')).toHaveTextContent('100%')
  })

  it('절반 넘게 틀린 문항을 따로 알려준다', async () => {
    const user = userEvent.setup()
    render(<TeacherHomeworkStatus category="naesin" />)
    await openMondayQuestions(user)
    expect(screen.getByText(/절반 이상이 틀린 문항: 2번/)).toBeInTheDocument()
  })

  it('오답이 몰린 선지를 집어준다', async () => {
    const user = userEvent.setup()
    render(<TeacherHomeworkStatus category="naesin" />)
    await openMondayQuestions(user)
    // 2번 정답은 ②인데 ⑤를 골랐다
    expect(screen.getByTestId('qstat-2')).toHaveTextContent('⑤ 고른 학생 1명')
  })

  it('제출이 없는 요일에는 집계 대신 안내를 보여준다', async () => {
    const user = userEvent.setup()
    // 화요일에도 문항은 있지만 아직 아무도 내지 않은 상태
    state.data.homeworkQuestions.push({ id: 3, dayId: 111, number: 1, answer: '①' })
    render(<TeacherHomeworkStatus category="naesin" />)
    await user.click(screen.getByRole('button', { name: '고2' }))
    await user.click(screen.getByRole('button', { name: /화요일 · 2026-08-11/ }))
    await user.click(screen.getByRole('button', { name: '문항별' }))

    expect(screen.getByText('아직 제출한 학생이 없습니다.')).toBeInTheDocument()
  })

  it('학생별로 다시 돌아올 수 있다', async () => {
    const user = userEvent.setup()
    render(<TeacherHomeworkStatus category="naesin" />)
    await openMondayQuestions(user)
    await user.click(screen.getByRole('button', { name: '학생별' }))

    expect(screen.getByText('고2-A')).toBeInTheDocument()
    expect(screen.queryByTestId('day-question-stats')).not.toBeInTheDocument()
  })
})

describe('TeacherHomeworkStatus (정시)', () => {
  it('정시 레벨 탭 기준으로 그룹 인원을 센다', async () => {
    const user = userEvent.setup()
    render(<TeacherHomeworkStatus category="jeongsi" />)

    await user.click(screen.getByRole('button', { name: '2레벨' }))

    expect(screen.getByText('정시2 8월 2주차')).toBeInTheDocument()
    // 정시 2레벨 학생은 1명(고2-A), 아직 제출 없음
    expect(screen.getByText('0/1 제출')).toBeInTheDocument()
  })
})

// 학생이 실수로 낸 제출을 교사가 되돌릴 수 있어야 한다.
// 제출은 한 번뿐이고 학생 스스로 고칠 수 없으므로, 이 길이 유일한 구제책이다.
describe('TeacherHomeworkStatus — 제출 취소', () => {
  // 고2 탭 → 월요일 → 제출한 학생(고2-A) 상세까지 들어간다
  // (기본 탭은 중1이라 학년 탭부터 눌러야 세트가 나온다)
  async function 제출한학생상세로(user, props) {
    render(<TeacherHomeworkStatus category="naesin" {...props} />)
    await user.click(screen.getByRole('button', { name: '고2' }))
    await user.click(screen.getByRole('button', { name: /월요일 · 2026-08-10/ }))
    await user.click(screen.getByRole('button', { name: /고2-A/ }))
  }

  it('과제를 낸 교사에게는 제출 취소 버튼이 보인다', async () => {
    const user = userEvent.setup()
    state.data.homeworkSets[0].teacherId = 'teacher-1'
    await 제출한학생상세로(user, { userRole: 'teacher', userId: 'teacher-1' })
    expect(screen.getByRole('button', { name: '제출 취소' })).toBeInTheDocument()
  })

  it('관리자에게도 보인다', async () => {
    const user = userEvent.setup()
    state.data.homeworkSets[0].teacherId = 'teacher-1'
    await 제출한학생상세로(user, { userRole: 'admin', userId: 'admin-9' })
    expect(screen.getByRole('button', { name: '제출 취소' })).toBeInTheDocument()
  })

  it('과제를 내지 않은 다른 교사에게는 보이지 않는다', async () => {
    const user = userEvent.setup()
    state.data.homeworkSets[0].teacherId = 'teacher-1'
    await 제출한학생상세로(user, { userRole: 'teacher', userId: 'teacher-2' })
    expect(screen.queryByRole('button', { name: '제출 취소' })).not.toBeInTheDocument()
  })

  it('확인창에서 승인하면 그 학생의 제출만 지운다', async () => {
    const user = userEvent.setup()
    state.data.homeworkSets[0].teacherId = 'teacher-1'
    state.data.deleteHomeworkSubmission = vi.fn().mockResolvedValue(true)
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)

    await 제출한학생상세로(user, { userRole: 'teacher', userId: 'teacher-1' })
    await user.click(screen.getByRole('button', { name: '제출 취소' }))

    // 되돌릴 수 없다는 사실을 확인창에서 알려야 한다
    expect(confirmSpy.mock.calls[0][0]).toMatch(/되돌릴 수 없/)
    expect(state.data.deleteHomeworkSubmission).toHaveBeenCalledWith({ dayId: 110, studentId: 1 })
    confirmSpy.mockRestore()
  })

  it('확인창에서 취소하면 아무 일도 일어나지 않는다', async () => {
    const user = userEvent.setup()
    state.data.homeworkSets[0].teacherId = 'teacher-1'
    state.data.deleteHomeworkSubmission = vi.fn().mockResolvedValue(true)
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)

    await 제출한학생상세로(user, { userRole: 'teacher', userId: 'teacher-1' })
    await user.click(screen.getByRole('button', { name: '제출 취소' }))

    expect(state.data.deleteHomeworkSubmission).not.toHaveBeenCalled()
    confirmSpy.mockRestore()
  })

  it('취소에 실패하면 성공한 척하지 않고 알린다', async () => {
    const user = userEvent.setup()
    state.data.homeworkSets[0].teacherId = 'teacher-1'
    state.data.deleteHomeworkSubmission = vi.fn().mockResolvedValue(false)
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)

    await 제출한학생상세로(user, { userRole: 'teacher', userId: 'teacher-1' })
    await user.click(screen.getByRole('button', { name: '제출 취소' }))

    expect(await screen.findByText(/제출 취소에 실패/)).toBeInTheDocument()
    confirmSpy.mockRestore()
  })
})
