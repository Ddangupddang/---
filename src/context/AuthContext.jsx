// src/context/AuthContext.jsx
// Supabase Auth 기반 인증 컨텍스트
import { createContext, useContext, useState, useEffect } from 'react'
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
      id:        authUser.id,
      email:     authUser.email,
      username:  data.username,
      name:      data.name,
      role:      data.role,
      classId:   data.class_id   ?? null,
      studentId: data.student_id ?? null,
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
      async (_event, session) => {
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
    await supabase.auth.signOut()
    setUser(null)
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
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
