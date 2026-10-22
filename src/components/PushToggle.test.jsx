// src/components/PushToggle.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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

  it('학생에게도 보여준다 — 선생님 답변 알림을 받는다', () => {
    state.user = { id: 's1', role: 'student', studentId: 1 }
    render(<PushToggle />)
    expect(screen.getByRole('button', { name: /알림 받기/ })).toBeInTheDocument()
  })

  it('로그인 정보가 없으면 아무것도 보여주지 않는다', () => {
    state.user = null
    const { container } = render(<PushToggle />)
    expect(container).toBeEmptyDOMElement()
  })

  // 폰에서 "알림을 켜지 못했습니다"만 뜨면 어느 단계에서 왜 막혔는지 알 수 없다.
  // 학생 폰의 콘솔은 볼 수 없으니 화면에 단계와 오류 이름을 같이 띄운다.
  it('켜다가 실패하면 어느 단계에서 무슨 오류였는지 보여준다', async () => {
    const reg = {
      pushManager: {
        getSubscription: vi.fn().mockResolvedValue(null),
        subscribe: vi.fn().mockRejectedValue(
          new DOMException('Registration failed - push service error', 'AbortError')),
      },
    }
    vi.stubEnv('VITE_VAPID_PUBLIC_KEY', 'AAAA')
    vi.stubGlobal('Notification', { requestPermission: vi.fn().mockResolvedValue('granted') })
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: { register: vi.fn().mockResolvedValue(reg), ready: Promise.resolve(reg) },
    })
    vi.spyOn(console, 'error').mockImplementation(() => {})

    render(<PushToggle />)
    await userEvent.click(screen.getByRole('button', { name: /알림 받기/ }))

    expect(await screen.findByText(/알림을 켜지 못했습니다/)).toHaveTextContent('구독 · AbortError')

    delete navigator.serviceWorker
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })
})
