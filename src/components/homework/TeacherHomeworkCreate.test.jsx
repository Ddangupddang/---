// src/components/homework/TeacherHomeworkCreate.test.jsx
// 교사 주간 과제 출제 화면 테스트.
// 계획서의 "수동 확인" 항목(고2·이번 주·요일 선택 → 문항/정답 입력 → 저장)을 자동화한다.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TeacherHomeworkCreate from './TeacherHomeworkCreate'
import { mondayOf } from '../../utils/homeworkWeek'

const WEEK = mondayOf(new Date().toISOString().slice(0, 10))

const state = {}
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'teacher-1' } }) }))
vi.mock('../../context/DataContext', () => ({ useData: () => state.data }))

beforeEach(() => {
  state.data = {
    // 실제 addHomeworkSet은 성공 시 생성된 세트를, 실패 시 null을 반환한다
    addHomeworkSet: vi.fn().mockResolvedValue({ id: 1, category: 'naesin', target: 5 }),
    updateHomeworkSet: vi.fn().mockResolvedValue({ id: 11 }),
    uploadSolutionFile: vi.fn(),
    homeworkDays: [], homeworkQuestions: [], homeworkSubmissions: [],
  }
})

// 수정 모드용 기존 세트: 고2 월요일 2문항(정답 ①②), 이미 2명이 제출한 상태
const EDIT_SET = { id: 11, category: 'naesin', target: 5, weekStart: WEEK, title: '8월 2주차' }
function withExistingSet() {
  state.data.homeworkDays = [
    { id: 110, setId: 11, weekday: 1, date: WEEK, questionCount: 2, daySolutionVideoUrl: '', daySolutionFileUrl: '' },
  ]
  state.data.homeworkQuestions = [
    { dayId: 110, number: 1, answer: '①' },
    { dayId: 110, number: 2, answer: '②' },
  ]
  state.data.homeworkSubmissions = [
    { dayId: 110, studentId: 1 },
    { dayId: 110, studentId: 2 },
  ]
}

describe('TeacherHomeworkCreate (내신)', () => {
  it('제목·요일·정답이 모두 채워지기 전에는 저장할 수 없다', async () => {
    const user = userEvent.setup()
    render(<TeacherHomeworkCreate category="naesin" onDone={vi.fn()} />)

    const saveBtn = screen.getByRole('button', { name: '주간 과제 저장' })
    expect(saveBtn).toBeDisabled()

    // 제목만 입력 — 사용 요일이 없으므로 여전히 비활성
    await user.type(screen.getByPlaceholderText(/세트 제목/), '8월 2주차')
    expect(saveBtn).toBeDisabled()

    // 월요일 사용 + 문항 수 2 — 정답 미입력이라 여전히 비활성
    await user.click(screen.getByRole('checkbox'))
    await user.type(screen.getByRole('spinbutton'), '2')
    expect(saveBtn).toBeDisabled()

    // 정답 1개만 입력 — 2문항 중 1개라 여전히 비활성
    await user.click(screen.getByTestId('cell-1-①'))
    expect(saveBtn).toBeDisabled()
  })

  it('고2 월요일 2문항을 출제하면 addHomeworkSet에 올바른 payload가 전달된다', async () => {
    const user = userEvent.setup()
    const onDone = vi.fn()
    render(<TeacherHomeworkCreate category="naesin" onDone={onDone} />)

    await user.type(screen.getByPlaceholderText(/세트 제목/), '8월 2주차')
    // 학년 선택: 5 = 고2
    await user.selectOptions(screen.getAllByRole('combobox')[0], '5')

    // 월요일 과제 사용 → 문항 수 2 → 정답 ①, ②
    await user.click(screen.getByRole('checkbox'))
    await user.type(screen.getByRole('spinbutton'), '2')
    await user.click(screen.getByTestId('cell-1-①'))
    await user.click(screen.getByTestId('cell-2-②'))
    await user.type(screen.getByPlaceholderText(/해설 영상/), 'https://youtu.be/abc')

    const saveBtn = screen.getByRole('button', { name: '주간 과제 저장' })
    expect(saveBtn).toBeEnabled()
    await user.click(saveBtn)

    await waitFor(() => expect(state.data.addHomeworkSet).toHaveBeenCalledTimes(1))
    expect(state.data.addHomeworkSet).toHaveBeenCalledWith({
      category: 'naesin',
      target: 5,
      weekStart: WEEK,
      title: '8월 2주차',
      teacherId: 'teacher-1',
      days: [
        {
          weekday: 1,
          questionCount: 2,
          daySolutionVideoUrl: 'https://youtu.be/abc',
          daySolutionFileUrl: '',
          questions: [
            { number: 1, answer: '①', solutionVideoUrl: '', solutionFileUrl: '' },
            { number: 2, answer: '②', solutionVideoUrl: '', solutionFileUrl: '' },
          ],
        },
      ],
    })
    // 저장 후 목록으로 복귀
    await waitFor(() => expect(onDone).toHaveBeenCalled())
  })

  it('사용하지 않는 요일은 payload에 포함되지 않는다', async () => {
    const user = userEvent.setup()
    render(<TeacherHomeworkCreate category="naesin" onDone={vi.fn()} />)

    await user.type(screen.getByPlaceholderText(/세트 제목/), '8월 2주차')

    // 월요일: 사용 + 1문항 정답 입력
    await user.click(screen.getByRole('checkbox'))
    await user.type(screen.getByRole('spinbutton'), '1')
    await user.click(screen.getByTestId('cell-1-③'))

    // 화요일 탭으로 이동하되 "사용"은 체크하지 않음
    await user.click(screen.getByRole('button', { name: '화' }))
    expect(screen.getByRole('checkbox')).not.toBeChecked()

    await user.click(screen.getByRole('button', { name: '주간 과제 저장' }))

    await waitFor(() => expect(state.data.addHomeworkSet).toHaveBeenCalledTimes(1))
    const payload = state.data.addHomeworkSet.mock.calls[0][0]
    expect(payload.days).toHaveLength(1)
    expect(payload.days[0].weekday).toBe(1)
  })
})

describe('TeacherHomeworkCreate (저장 실패)', () => {
  it('저장에 실패하면 목록으로 돌아가지 않고 에러를 보여주며 입력값을 유지한다', async () => {
    const user = userEvent.setup()
    const onDone = vi.fn()
    // DB 테이블 없음/RLS 거부 등으로 addHomeworkSet이 null을 반환하는 상황
    state.data.addHomeworkSet = vi.fn().mockResolvedValue(null)
    render(<TeacherHomeworkCreate category="naesin" onDone={onDone} />)

    await user.type(screen.getByPlaceholderText(/세트 제목/), '8월 2주차')
    await user.click(screen.getByRole('checkbox'))
    await user.type(screen.getByRole('spinbutton'), '1')
    await user.click(screen.getByTestId('cell-1-①'))
    await user.click(screen.getByRole('button', { name: '주간 과제 저장' }))

    // 실패를 사용자에게 알려야 한다
    expect(await screen.findByText(/저장에 실패했습니다/)).toBeInTheDocument()
    // 성공한 것처럼 목록으로 빠져나가면 안 된다
    expect(onDone).not.toHaveBeenCalled()
    // 입력값이 날아가면 안 된다
    expect(screen.getByPlaceholderText(/세트 제목/)).toHaveValue('8월 2주차')
  })
})

describe('TeacherHomeworkCreate (수정 모드)', () => {
  it('기존 세트의 제목·학년·정답을 채운 채로 열린다', () => {
    withExistingSet()
    render(<TeacherHomeworkCreate category="naesin" editSet={EDIT_SET} onDone={vi.fn()} />)

    expect(screen.getByText('내신과제 수정')).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/세트 제목/)).toHaveValue('8월 2주차')
    expect(screen.getAllByRole('combobox')[0]).toHaveValue('5')
    expect(screen.getByRole('checkbox')).toBeChecked()
    expect(screen.getByRole('spinbutton')).toHaveValue(2)
    // 저장된 정답이 선택된 상태로 보인다
    expect(screen.getByTestId('cell-1-①').className).toContain('#2B2B2B')
    expect(screen.getByTestId('cell-2-②').className).toContain('#2B2B2B')
  })

  it('바꾼 게 없으면 영향 경고를 보여주지 않는다', () => {
    withExistingSet()
    render(<TeacherHomeworkCreate category="naesin" editSet={EDIT_SET} onDone={vi.fn()} />)
    expect(screen.queryByTestId('edit-impact')).not.toBeInTheDocument()
  })

  it('정답을 바꾸면 영향받는 학생 수를 저장 전에 보여준다', async () => {
    const user = userEvent.setup()
    withExistingSet()
    render(<TeacherHomeworkCreate category="naesin" editSet={EDIT_SET} onDone={vi.fn()} />)

    await user.click(screen.getByTestId('cell-2-④')) // 2번 정답 ② → ④
    expect(screen.getByTestId('edit-impact')).toHaveTextContent('2명')
  })

  it('확인창에서 승인하면 updateHomeworkSet으로 저장한다', async () => {
    const user = userEvent.setup()
    const onDone = vi.fn()
    withExistingSet()
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<TeacherHomeworkCreate category="naesin" editSet={EDIT_SET} onDone={onDone} />)

    await user.click(screen.getByTestId('cell-2-④'))
    await user.click(screen.getByRole('button', { name: '수정 저장' }))

    expect(confirmSpy).toHaveBeenCalled()
    await waitFor(() => expect(state.data.updateHomeworkSet).toHaveBeenCalledTimes(1))
    const [setId, payload] = state.data.updateHomeworkSet.mock.calls[0]
    expect(setId).toBe(11)
    expect(payload.days[0].questions).toEqual([
      { number: 1, answer: '①', solutionVideoUrl: '', solutionFileUrl: '' },
      { number: 2, answer: '④', solutionVideoUrl: '', solutionFileUrl: '' },
    ])
    // 새 세트를 만들면 안 된다
    expect(state.data.addHomeworkSet).not.toHaveBeenCalled()
    await waitFor(() => expect(onDone).toHaveBeenCalled())
    confirmSpy.mockRestore()
  })

  it('확인창에서 취소하면 아무것도 저장하지 않는다', async () => {
    const user = userEvent.setup()
    withExistingSet()
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
    render(<TeacherHomeworkCreate category="naesin" editSet={EDIT_SET} onDone={vi.fn()} />)

    await user.click(screen.getByTestId('cell-2-④'))
    await user.click(screen.getByRole('button', { name: '수정 저장' }))

    expect(state.data.updateHomeworkSet).not.toHaveBeenCalled()
    confirmSpy.mockRestore()
  })

  it('제출이 있는 요일을 사용 해제하면 영구 삭제를 경고한다', async () => {
    const user = userEvent.setup()
    withExistingSet()
    render(<TeacherHomeworkCreate category="naesin" editSet={EDIT_SET} onDone={vi.fn()} />)

    await user.click(screen.getByRole('checkbox')) // 월요일 사용 해제
    expect(screen.getByTestId('edit-impact')).toHaveTextContent('영구 삭제')
  })
})

describe('TeacherHomeworkCreate (정시)', () => {
  it('정시는 학년 대신 정시 레벨을 고르고 category가 jeongsi로 저장된다', async () => {
    const user = userEvent.setup()
    render(<TeacherHomeworkCreate category="jeongsi" onDone={vi.fn()} />)

    expect(screen.getByText('정시 레벨')).toBeInTheDocument()
    expect(screen.getByText('정시과제 만들기')).toBeInTheDocument()

    await user.type(screen.getByPlaceholderText(/세트 제목/), '정시 8월 2주차')
    await user.selectOptions(screen.getAllByRole('combobox')[0], '2')
    await user.click(screen.getByRole('checkbox'))
    await user.type(screen.getByRole('spinbutton'), '1')
    await user.click(screen.getByTestId('cell-1-⑤'))
    await user.click(screen.getByRole('button', { name: '주간 과제 저장' }))

    await waitFor(() => expect(state.data.addHomeworkSet).toHaveBeenCalledTimes(1))
    const payload = state.data.addHomeworkSet.mock.calls[0][0]
    expect(payload.category).toBe('jeongsi')
    expect(payload.target).toBe(2)
  })
})
