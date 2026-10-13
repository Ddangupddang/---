// src/pages/Attendance.test.jsx
// 학생 출석 체크 — 감지된 주소를 남기는지, 원인별 안내가 맞는지.
//
// 남기는 것이 왜 중요한가: "일부 학생만 출석이 안 된다"를 2026-08부터 못
// 고쳤는데, 이유는 실패할 때마다 증거가 증발해서였다. 기록이 빠지면 조사가
// 다시 원점으로 돌아간다. 그래서 테스트로 묶어 둔다.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import Attendance from './Attendance'

const checkAcademyWifi = vi.fn()
vi.mock('../utils/checkWifi', async (orig) => ({
  ...(await orig()),               // wifiFailureHint·wifiFailureCause는 진짜를 쓴다
  checkAcademyWifi: (...a) => checkAcademyWifi(...a),
}))

const state = {}
vi.mock('../utils/demoWifi', async (orig) => ({
  ...(await orig()),
  isDemoWifi: () => state.demo,
  DEMO_STEP_MS: 0,
}))
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: state.user }) }))
vi.mock('../context/DataContext', () => ({ useData: () => state.data }))
vi.mock('../components/Layout', () => ({ default: ({ children }) => <div>{children}</div> }))

beforeEach(() => {
  checkAcademyWifi.mockReset()
  state.demo = false
  state.user = { id: 's1', role: 'student', studentId: 7 }
  state.data = {
    attendance: [],
    students: [], classes: [],
    upsertAttendance: vi.fn().mockResolvedValue(undefined),
    deleteAttendance: vi.fn(),
    logWifiCheck:     vi.fn().mockResolvedValue(true),
  }
})

const press = () => fireEvent.click(screen.getByRole('button', { name: '출석 체크' }))

describe('학생 출석 체크 기록', () => {
  it('성공하면 주소와 함께 성공으로 남긴다', async () => {
    checkAcademyWifi.mockResolvedValue({ ok: true, clientIp: '119.64.94.220' })
    render(<Attendance />)
    press()
    await waitFor(() => expect(state.data.logWifiCheck).toHaveBeenCalledWith({
      studentId: 7, clientIp: '119.64.94.220', ok: true,
    }))
  })

  it('실패해도 남긴다 — 이게 없으면 원인을 짚을 근거가 사라진다', async () => {
    checkAcademyWifi.mockResolvedValue({ ok: false, clientIp: '104.28.102.59' })
    render(<Attendance />)
    press()
    await waitFor(() => expect(state.data.logWifiCheck).toHaveBeenCalledWith({
      studentId: 7, clientIp: '104.28.102.59', ok: false,
    }))
  })

  it('성공하면 출석이 기록된다', async () => {
    checkAcademyWifi.mockResolvedValue({ ok: true, clientIp: '119.64.94.220' })
    render(<Attendance />)
    press()
    await waitFor(() => expect(state.data.upsertAttendance).toHaveBeenCalled())
  })

  it('실패하면 출석은 기록하지 않는다', async () => {
    checkAcademyWifi.mockResolvedValue({ ok: false, clientIp: '104.28.102.59' })
    render(<Attendance />)
    press()
    await waitFor(() => expect(screen.getByText(/사설 릴레이/)).toBeInTheDocument())
    expect(state.data.upsertAttendance).not.toHaveBeenCalled()
  })
})

describe('실패 안내', () => {
  it('사설 릴레이 주소면 끄는 자리를 알려주고, WiFi를 껐다 켜라고 하지 않는다', async () => {
    checkAcademyWifi.mockResolvedValue({ ok: false, clientIp: '140.248.29.5' })
    render(<Attendance />)
    press()
    await waitFor(() => expect(screen.getByText(/사설 릴레이/)).toBeInTheDocument())
    expect(screen.getByText(/IP 주소 추적 제한/)).toBeInTheDocument()
    expect(screen.queryByText(/WiFi를 껐다 켠 뒤/)).not.toBeInTheDocument()
  })

  it('그 밖의 주소면 WiFi를 껐다 켜보라고 한다', async () => {
    checkAcademyWifi.mockResolvedValue({ ok: false, clientIp: '39.7.51.22' })
    render(<Attendance />)
    press()
    await waitFor(() => expect(screen.getByText(/WiFi를 껐다 켠 뒤/)).toBeInTheDocument())
  })

  it('감지된 주소를 화면에 보여준다 — 선생님께 보여줄 수 있어야 한다', async () => {
    checkAcademyWifi.mockResolvedValue({ ok: false, clientIp: '104.28.102.59' })
    render(<Attendance />)
    press()
    await waitFor(() => expect(screen.getByText('104.28.102.59')).toBeInTheDocument())
  })
})

// 졸업전시회 시연장은 학원이 아니고 서버 함수도 돌지 않는다.
// 시연 모드에서는 대조 과정을 단계별로 보여주고 출석을 기록한다.
describe('시연 모드', () => {
  beforeEach(() => { state.demo = true })

  it('서버에 묻지 않고 단계를 보여준 뒤 출석을 기록한다', async () => {
    render(<Attendance />)
    press()
    await waitFor(() => expect(screen.getByText('출석이 기록됐습니다!')).toBeInTheDocument())
    expect(checkAcademyWifi).not.toHaveBeenCalled()
    expect(state.data.upsertAttendance).toHaveBeenCalledWith(7, expect.any(String), 'present', '수업')
    expect(screen.getByText('학원 WiFi 주소와 대조')).toBeInTheDocument()
    expect(screen.getByText(/시연 모드/)).toBeInTheDocument()
  })

  it('WiFi 조사 기록은 남기지 않는다 — 진짜 원인 조사용이다', async () => {
    render(<Attendance />)
    press()
    await waitFor(() => expect(screen.getByText('출석이 기록됐습니다!')).toBeInTheDocument())
    expect(state.data.logWifiCheck).not.toHaveBeenCalled()
  })

  it('시연 모드가 아니면 단계 목록도 안내도 없다', async () => {
    state.demo = false
    checkAcademyWifi.mockResolvedValue({ ok: true, clientIp: '119.64.94.220' })
    render(<Attendance />)
    press()
    await waitFor(() => expect(screen.getByText('출석이 기록됐습니다!')).toBeInTheDocument())
    expect(screen.queryByText('학원 WiFi 주소와 대조')).not.toBeInTheDocument()
    expect(screen.queryByText(/시연 모드/)).not.toBeInTheDocument()
  })
})
