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
    addHomeworkSet: vi.fn().mockResolvedValue(undefined),
    uploadSolutionFile: vi.fn(),
  }
})

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
