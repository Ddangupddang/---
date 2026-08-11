// src/context/AuthContext.test.jsx
// 현재 AuthContext는 Supabase 인증 기반이므로, Supabase 클라이언트를 모킹하여
// 로그인/로그아웃/역할 로딩 흐름을 검증한다. (예전 mock 계정·localStorage 방식 테스트는 폐기)
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useState } from 'react'
import { render, screen, act, waitFor } from '@testing-library/react'
import { AuthProvider, useAuth } from './AuthContext'

// ── Supabase 모킹 ──
// vi.mock 팩토리는 import보다 먼저 끌어올려지므로, 공유 상태를 vi.hoisted 안에서 생성한다.
const { supabaseMock, resetSupabaseMock, emitAuth, setHoldProfile, flushProfiles } = vi.hoisted(() => {
  // username → profiles 테이블 행(row) 형태의 가짜 계정
  const ACCOUNTS = {
    admin:    { id: 'uid-admin',   username: 'admin',    name: '관리자', role: 'admin',   class_id: null, student_id: null, password_changed: true },
    student1: { id: 'uid-student', username: 'student1', name: '학생1',  role: 'student', class_id: 1,    student_id: 1,    password_changed: true },
  }

  // 실제 Supabase처럼 인증 상태 변화를 콜백으로 전파하기 위한 공유 상태
  // holdProfile: true면 프로필 조회를 즉시 끝내지 않고 대기 → 실제 네트워크 지연 재현
  const state = { authChangeCb: null, profileRow: null, holdProfile: false, resolvers: [] }

  const supabaseMock = {
    auth: {
      // 앱 시작 시: 로그인된 세션 없음
      getSession: () => Promise.resolve({ data: { session: null } }),
      // AuthContext가 등록하는 상태변화 콜백을 저장해 뒀다가 로그인/로그아웃 때 호출
      onAuthStateChange: (cb) => {
        state.authChangeCb = cb
        return { data: { subscription: { unsubscribe: () => {} } } }
      },
      signInWithPassword: ({ email }) => {
        const username = email.split('@')[0]
        const account = ACCOUNTS[username]
        if (!account) return Promise.resolve({ error: { message: 'Invalid login credentials' } })
        state.profileRow = account
        // 실제 Supabase처럼 SIGNED_IN 이벤트를 발생 → AuthContext가 프로필을 로드
        state.authChangeCb?.('SIGNED_IN', { user: { id: account.id, email } })
        return Promise.resolve({ error: null })
      },
      signOut: () => {
        state.profileRow = null
        state.authChangeCb?.('SIGNED_OUT', null)
        return Promise.resolve({ error: null })
      },
    },
    // fetchProfile: from('profiles').select('*').eq('id', ...).single()
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => {
            const result = {
              data: state.profileRow,
              error: state.profileRow ? null : { message: 'not found' },
            }
            // holdProfile 모드: 즉시 끝내지 않고 resolver를 저장 → flushProfiles()로 나중에 완료
            if (state.holdProfile) {
              return new Promise((resolve) => state.resolvers.push(() => resolve(result)))
            }
            return Promise.resolve(result)
          },
        }),
      }),
    }),
  }

  const resetSupabaseMock = () => {
    state.authChangeCb = null
    state.profileRow = null
    state.holdProfile = false
    state.resolvers = []
  }

  // 테스트에서 임의의 auth 이벤트를 직접 발생시키는 헬퍼
  // (예: 창 전환 시 Supabase가 다시 쏘는 SIGNED_IN 재현)
  const emitAuth = (event, session) => state.authChangeCb?.(event, session)
  // 프로필 조회 지연 on/off
  const setHoldProfile = (v) => { state.holdProfile = v }
  // 대기 중이던 프로필 조회들을 완료시킴
  const flushProfiles = () => { state.resolvers.forEach((r) => r()); state.resolvers = [] }

  return { supabaseMock, resetSupabaseMock, emitAuth, setHoldProfile, flushProfiles }
})

vi.mock('../lib/supabase', () => ({ supabase: supabaseMock }))

// ── 테스트용 컴포넌트: 현재 역할 표시 + 로그인/로그아웃 버튼 ──
function TestComponent() {
  const { user, login, logout } = useAuth()
  return (
    <div>
      <span data-testid="role">{user?.role ?? 'none'}</span>
      <button onClick={() => login('admin', '1234')}>관리자 로그인</button>
      <button onClick={() => login('student1', '1234')}>학생 로그인</button>
      <button onClick={() => login('wrong', 'wrong')}>잘못된 로그인</button>
      <button onClick={logout}>로그아웃</button>
    </div>
  )
}

describe('AuthContext', () => {
  beforeEach(() => {
    resetSupabaseMock()
  })

  it('초기 상태는 로그인 안 된 상태', async () => {
    render(<AuthProvider><TestComponent /></AuthProvider>)
    // getSession(비동기)이 끝나 로딩이 해제되면 TestComponent가 렌더됨
    expect(await screen.findByTestId('role')).toHaveTextContent('none')
  })

  it('admin 로그인 성공 시 role이 admin', async () => {
    render(<AuthProvider><TestComponent /></AuthProvider>)
    await screen.findByTestId('role')
    await act(async () => {
      screen.getByText('관리자 로그인').click()
    })
    await waitFor(() => expect(screen.getByTestId('role')).toHaveTextContent('admin'))
  })

  it('student1 로그인 성공 시 role이 student', async () => {
    render(<AuthProvider><TestComponent /></AuthProvider>)
    await screen.findByTestId('role')
    await act(async () => {
      screen.getByText('학생 로그인').click()
    })
    await waitFor(() => expect(screen.getByTestId('role')).toHaveTextContent('student'))
  })

  it('잘못된 계정으로 로그인 시 user는 null 유지', async () => {
    render(<AuthProvider><TestComponent /></AuthProvider>)
    await screen.findByTestId('role')
    await act(async () => {
      screen.getByText('잘못된 로그인').click()
    })
    expect(screen.getByTestId('role')).toHaveTextContent('none')
  })

  it('로그아웃 시 user가 null', async () => {
    render(<AuthProvider><TestComponent /></AuthProvider>)
    await screen.findByTestId('role')
    await act(async () => {
      screen.getByText('관리자 로그인').click()
    })
    await waitFor(() => expect(screen.getByTestId('role')).toHaveTextContent('admin'))
    await act(async () => {
      screen.getByText('로그아웃').click()
    })
    await waitFor(() => expect(screen.getByTestId('role')).toHaveTextContent('none'))
  })
})

// ── 창 전환(Alt+Tab) 시 팝업 유지 검증 ──
// 로컬 state로 열려있는 모달을 가진 자식 컴포넌트.
// AuthProvider가 loading으로 자식을 unmount하면 이 모달 state가 초기화된다.
function ModalHost() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  return (
    <div>
      <span data-testid="role">{user?.role ?? 'none'}</span>
      <button onClick={() => setOpen(true)}>팝업 열기</button>
      {open && <div data-testid="modal">학생 추가 팝업</div>}
    </div>
  )
}

describe('AuthContext - 창 전환(Alt+Tab) 시 팝업 유지', () => {
  beforeEach(() => {
    resetSupabaseMock()
  })

  it('이미 로그인된 사용자에게 SIGNED_IN이 다시 와도 열린 팝업이 사라지지 않는다', async () => {
    render(<AuthProvider><ModalHost /></AuthProvider>)
    await screen.findByTestId('role')

    // 관리자 로그인 (실제 signInWithPassword → SIGNED_IN 발생)
    await act(async () => {
      supabaseMock.auth.signInWithPassword({ email: 'admin@soomoonjae.com' })
    })
    await waitFor(() => expect(screen.getByTestId('role')).toHaveTextContent('admin'))

    // 팝업 열기
    await act(async () => {
      screen.getByText('팝업 열기').click()
    })
    expect(screen.getByTestId('modal')).toBeInTheDocument()

    // 이후 프로필 조회는 지연시켜 실제 네트워크 타이밍 재현
    // (버그 버전: SIGNED_IN → setLoading(true) 후 프로필 응답 대기 동안 로딩화면이
    //  커밋되어 ModalHost가 unmount됨 → 팝업 state 소실)
    setHoldProfile(true)

    // 창 전환 후 복귀: Supabase가 같은 사용자로 SIGNED_IN을 다시 발생시킴
    await act(async () => {
      emitAuth('SIGNED_IN', { user: { id: 'uid-admin', email: 'admin@soomoonjae.com' } })
    })

    // 수정 후: 중복 SIGNED_IN을 무시하므로 로딩화면 없이 팝업이 그대로 유지되어야 함
    expect(screen.queryByText('불러오는 중...')).not.toBeInTheDocument()
    expect(screen.getByTestId('modal')).toBeInTheDocument()

    // 정리: 혹시 대기 중인 프로필 조회가 있으면 완료시켜 경고 없이 종료
    await act(async () => { flushProfiles() })
  })
})
