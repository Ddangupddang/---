// src/context/AuthContext.jsx
// Supabase Auth 기반 인증 컨텍스트
import { createContext, useContext, useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { loginEmail } from '../utils/loginEmail'

// 컨텍스트 객체 co-export는 표준 관행 (Fast Refresh 힌트일 뿐 동작 오류 아님)
// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null)
  const [loading, setLoading] = useState(true)

  // auth.users의 uid로 profiles 테이블에서 역할/이름 등 조회
  async function fetchProfile(authUser) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authUser.id)
      .single()

    if (error || !data) return null

    return {
      id:              authUser.id,
      email:           authUser.email,
      username:        data.username,
      name:            data.name,
      role:            data.role,
      classId:         data.class_id       ?? null,
      studentId:       data.student_id     ?? null,
      passwordChanged: data.password_changed ?? true,
    }
  }

  useEffect(() => {
    // 앱 시작 시 현재 세션 확인 (새로고침 후 로그인 유지)
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const profile = await fetchProfile(session.user)
        setUser(profile)
      }
      setLoading(false)
    })

    // 로그인·로그아웃 상태 변화 실시간 감지
    // 핸들러를 동기로 유지해야 Supabase가 await하지 않아 auth 락 데드락 방지
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // USER_UPDATED, TOKEN_REFRESHED: user/loading 변경 없이 스킵
        if (event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED') return

        if (session?.user) {
          // SIGNED_IN: 프로필 로드 전 로딩 표시 → 완료 후 user 세팅 + 로딩 해제
          // 이렇게 해야 ProtectedRoute가 user 준비되기 전 /login으로 튕기지 않음
          if (event === 'SIGNED_IN') setLoading(true)
          // 비동기 프로필 조회는 .then()으로 분리 — Supabase가 기다리지 않음
          fetchProfile(session.user).then((profile) => {
            setUser(profile)
            setLoading(false)
          })
        } else {
          setUser(null)
          setLoading(false)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  // 로그인: username → username@soomoonjae.com 형식 이메일로 변환
  // 프로필 로드는 onAuthStateChange(SIGNED_IN)이 처리 — 여기서는 인증만
  const login = async (username, password) => {
    const email = loginEmail(username.trim())
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return !error
  }

  const logout = async () => {
    await supabase.auth.signOut({ scope: 'local' })
    setUser(null)
  }

  // 비밀번호 변경: 임시 클라이언트로 현재 비밀번호 검증 → 새 비밀번호 업데이트
  const changePassword = async (currentPassword, newPassword) => {
    try {
      const email = loginEmail(user.username)

      // 임시 클라이언트로 현재 비밀번호 검증 (메인 세션/onAuthStateChange 영향 없음)
      const tmpClient = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY,
        { auth: { persistSession: false, autoRefreshToken: false, storageKey: 'tmp-verify-client' } }
      )
      const { error: authErr } = await tmpClient.auth.signInWithPassword({ email, password: currentPassword })
      if (authErr) return { error: '현재 비밀번호가 올바르지 않습니다.' }

      // 메인 클라이언트로 새 비밀번호 변경
      const { error: updateErr } = await supabase.auth.updateUser({ password: newPassword })
      if (updateErr) return { error: '비밀번호 변경에 실패했습니다.' }

      // profiles 테이블 password_changed = true
      await supabase.from('profiles').update({ password_changed: true }).eq('id', user.id)

      // 로컬 user 상태 갱신
      setUser((prev) => ({ ...prev, passwordChanged: true }))
      return { error: null }
    } catch {
      return { error: '비밀번호 변경 중 오류가 발생했습니다.' }
    }
  }

  // 세션 확인 중에는 빈 화면 (깜빡임 방지)
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F4F3EE]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#5B8FD4] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-400">불러오는 중...</p>
        </div>
      </div>
    )
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, changePassword }}>
      {children}
    </AuthContext.Provider>
  )
}

// 훅 co-export는 표준 관행 (Fast Refresh 힌트일 뿐 동작 오류 아님)
// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext)
