// 보강 클리닉 — 학생은 한 줄 적어 신청, 교사는 일정을 글로 적어 수락하거나 이유를 적어 거절
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Clinic from './Clinic'

const state = {}
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: state.user }) }))
vi.mock('../context/DataContext', () => ({ useData: () => state.data }))
vi.mock('../components/Layout', () => ({ default: ({ children }) => <div>{children}</div> }))
vi.mock('../components/PushToggle', () => ({ default: () => null }))

beforeEach(() => {
  state.data = {
    classes:  [{ id: 10, name: 'A반', teacherId: 't1' }],
    students: [{ id: 1, name: '홍길동', classId: 10 }],
    staffProfiles: [{ id: 't1', name: '김선생' }],
    clinicRequests: [],
    requestClinic: vi.fn().mockResolvedValue({ request: { id: 1 } }),
    acceptClinic:  vi.fn().mockResolvedValue({ request: { id: 1 } }),
    rejectClinic:  vi.fn().mockResolvedValue({ request: { id: 1 } }),
    cancelClinic:  vi.fn().mockResolvedValue({}),
  }
})

describe('학생 화면', () => {
  beforeEach(() => { state.user = { id: 's1', role: 'student', studentId: 1 } })

  it('한 줄 적어 신청한다', async () => {
    render(<Clinic />)
    await userEvent.type(screen.getByTestId('clinic-content'), '비문학 추론이 어려워요')
    await userEvent.click(screen.getByRole('button', { name: '클리닉 신청' }))
    expect(state.data.requestClinic).toHaveBeenCalledWith({ studentId: 1, content: '비문학 추론이 어려워요' })
  })

  it('빈 칸이면 신청 버튼이 꺼져 있다', () => {
    render(<Clinic />)
    expect(screen.getByRole('button', { name: '클리닉 신청' })).toBeDisabled()
  })

  it('기다리는 신청이 있으면 새 신청 칸을 숨기고 취소할 수 있다', async () => {
    state.data.clinicRequests = [{ id: 5, studentId: 1, content: '문법', status: 'pending', createdAt: '2026-10-22T01:00:00Z' }]
    render(<Clinic />)
    expect(screen.queryByTestId('clinic-content')).toBeNull()
    await userEvent.click(screen.getByTestId('clinic-cancel-5'))
    expect(state.data.cancelClinic).toHaveBeenCalledWith(5)
  })

  it('확정되면 일정이, 거절되면 이유가 보인다', () => {
    state.data.clinicRequests = [
      { id: 5, studentId: 1, content: '문법', status: 'accepted', scheduleText: '10/25(토) 3시', createdAt: '2026-10-22T01:00:00Z' },
      { id: 6, studentId: 1, content: '문학', status: 'rejected', rejectReason: '다음 주에 다시', createdAt: '2026-10-21T01:00:00Z' },
    ]
    render(<Clinic />)
    expect(screen.getByTestId('clinic-5')).toHaveTextContent('10/25(토) 3시')
    expect(screen.getByTestId('clinic-6')).toHaveTextContent('다음 주에 다시')
  })

  it('남의 신청은 보이지 않는다', () => {
    state.data.clinicRequests = [{ id: 9, studentId: 2, content: '남의 것', status: 'pending', createdAt: '2026-10-22T01:00:00Z' }]
    render(<Clinic />)
    expect(screen.queryByText('남의 것')).toBeNull()
  })
})

describe('교사 화면', () => {
  beforeEach(() => {
    state.user = { id: 't1', role: 'teacher' }
    state.data.clinicRequests = [{ id: 5, studentId: 1, content: '문법이 어려워요', status: 'pending', createdAt: '2026-10-22T01:00:00Z' }]
  })

  it('일정을 글로 적어 수락한다', async () => {
    render(<Clinic />)
    expect(screen.getByTestId('clinic-5')).toHaveTextContent('홍길동')
    await userEvent.click(screen.getByTestId('clinic-accept-5'))
    await userEvent.type(screen.getByTestId('clinic-text-5'), '10/25(토) 오후 3시')
    await userEvent.click(screen.getByTestId('clinic-confirm-5'))
    expect(state.data.acceptClinic).toHaveBeenCalledWith(5, { scheduleText: '10/25(토) 오후 3시', handledBy: 't1' })
  })

  it('이유를 적어 거절한다', async () => {
    render(<Clinic />)
    await userEvent.click(screen.getByTestId('clinic-reject-5'))
    expect(screen.getByTestId('clinic-confirm-5')).toBeDisabled()
    await userEvent.type(screen.getByTestId('clinic-text-5'), '이번 주는 꽉 찼어요')
    await userEvent.click(screen.getByTestId('clinic-confirm-5'))
    expect(state.data.rejectClinic).toHaveBeenCalledWith(5, { rejectReason: '이번 주는 꽉 찼어요', handledBy: 't1' })
  })

  it('다른 사람이 먼저 처리했으면 알려 준다', async () => {
    state.data.acceptClinic.mockResolvedValue({ error: '이미 처리된 신청입니다.' })
    render(<Clinic />)
    await userEvent.click(screen.getByTestId('clinic-accept-5'))
    await userEvent.type(screen.getByTestId('clinic-text-5'), '내일')
    await userEvent.click(screen.getByTestId('clinic-confirm-5'))
    expect(await screen.findByText('이미 처리된 신청입니다.')).toBeInTheDocument()
  })

  it('다른 반 학생의 신청은 보이지 않는다', () => {
    state.user = { id: 't2', role: 'teacher' }
    render(<Clinic />)
    expect(screen.queryByTestId('clinic-5')).toBeNull()
  })
})
