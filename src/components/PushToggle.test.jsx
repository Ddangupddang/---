// src/components/PushToggle.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import PushToggle from './PushToggle'

const state = {}
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: state.user }) }))
vi.mock('../context/DataContext', () => ({ useData: () => state.data }))
vi.mock('../utils/pushSupport', async (orig) => ({
  ...(await orig()),
  readPushEnvironment: () => state.env,
}))

beforeEach(() => {
  state.user = { id: 't1', role: 'teacher' }
  state.data = {
    savePushSubscription:   vi.fn().mockResolvedValue(true),
    deletePushSubscription: vi.fn().mockResolvedValue(true),
  }
  state.env = {
    hasServiceWorker: true, hasPushManager: true, isIos: false,
    isStandalone: false, permission: 'default', subscribed: false,
  }
})

describe('PushToggle', () => {
  it('켤 수 있으면 켜기 버튼을 보여준다', () => {
    render(<PushToggle />)
    expect(screen.getByRole('button', { name: /알림 받기/ })).toBeInTheDocument()
  })

  it('아이폰인데 홈 화면에 추가하지 않았으면 방법을 알려준다', () => {
    // 버튼을 보여주면 눌러도 아무 일이 없어 고장으로 보인다
    state.env = { ...state.env, isIos: true, isStandalone: false }
    render(<PushToggle />)
    expect(screen.getByText(/홈 화면에 추가/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /알림 받기/ })).not.toBeInTheDocument()
  })

  it('권한을 거부했으면 브라우저 설정을 안내한다', () => {
    state.env = { ...state.env, permission: 'denied' }
    render(<PushToggle />)
    expect(screen.getByText(/브라우저 설정/)).toBeInTheDocument()
  })

  it('지원하지 않는 브라우저면 그렇다고 알린다', () => {
    state.env = { ...state.env, hasPushManager: false }
    render(<PushToggle />)
    expect(screen.getByText(/지원하지 않습니다/)).toBeInTheDocument()
  })

  it('이미 켜져 있으면 끄기를 보여준다', () => {
    state.env = { ...state.env, permission: 'granted', subscribed: true }
    render(<PushToggle />)
    expect(screen.getByRole('button', { name: /알림 끄기/ })).toBeInTheDocument()
  })

  it('학생에게는 아무것도 보여주지 않는다', () => {
    // 학생이 받을 알림이 아직 없다
    state.user = { id: 's1', role: 'student', studentId: 1 }
    const { container } = render(<PushToggle />)
    expect(container).toBeEmptyDOMElement()
  })
})
