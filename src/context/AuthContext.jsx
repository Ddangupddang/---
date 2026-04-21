// src/context/AuthContext.jsx
// Supabase Auth 기반 인증 컨텍스트
import { createContext, useContext, useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

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
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // USER_UPDATED: updateUser() 호출 시 발생 — 여기서 fetchProfile 하면 데드락 발생
        // changePassword 함수가 직접 setUser를 갱신하므로 여기서는 스킵
        if (event === 'USER_UPDATED') {
          setLoading(false)
          return
        }
        if (session?.user) {
          const profile = await fetchProfile(session.user)
          setUser(profile)
        } else {
          setUser(null)
        }
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  // 로그인: username → username@soomoonjae.com 형식 이메일로 변환
  const login = async (username, password) => {
    const email = `${username.trim()}@soomoonjae.com`
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return false
    return true
  }

  const logout = async () => {
    await supabase.auth.signOut({ scope: 'local' })
    setUser(null)
  }

  // 비밀번호 변경: 임시 클라이언트로 현재 비밀번호 검증 → 새 비밀번호 업데이트
  const changePassword = async (currentPassword, newPassword) => {
    try {
      const email = `${user.username}@soomoonjae.com`

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

export const useAuth = () => useContext(AuthContext)
