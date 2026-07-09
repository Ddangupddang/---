// src/pages/Login.jsx
import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function Login() {
  const { user, login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // 이미 로그인된 경우 대시보드로 이동 (훅은 반드시 모두 선언 후 조건부 return)
  if (user) return <Navigate to="/dashboard" replace />

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const success = await login(username.trim(), password)
    if (!success) {
      setLoading(false)
      setError('아이디 또는 비밀번호가 올바르지 않습니다.')
    }
    // 성공 시: loading 유지 → onAuthStateChange에서 user 세팅 → if (user) Navigate 자동 처리
  }

  return (
    <div className="min-h-screen bg-[#F4F3EE] flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-md p-8">
        {/* 로고 영역 */}
        <div className="text-center mb-8">
          <img
            src="/logo-vertical.png"
            alt="수문재국어 로고"
            className="w-44 mx-auto mb-4 object-contain"
          />
          <p className="text-sm text-gray-400">학생 관리 시스템</p>
        </div>

        {/* 로그인 폼 */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="text"
            placeholder="아이디"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full h-12 px-4 bg-[#F4F3EE] rounded-xl border border-transparent focus:border-[#5B8FD4] focus:outline-none text-sm"
            autoComplete="username"
          />
          <input
            type="password"
            placeholder="비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full h-12 px-4 bg-[#F4F3EE] rounded-xl border border-transparent focus:border-[#5B8FD4] focus:outline-none text-sm"
            autoComplete="current-password"
          />

          {error && (
            <p className="text-sm text-[#C0392B] text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-[#2B2B2B] text-white text-sm font-semibold rounded-xl hover:bg-[#3d3d3d] active:scale-95 transition-all mt-1 disabled:opacity-50"
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>

        {/* 학원 정보 */}
        <div className="mt-6 p-3 bg-[#F4F3EE] rounded-xl text-center">
          <p className="text-xs text-gray-500 font-semibold mb-1">수문재국어전문학원</p>
          <p className="text-xs text-gray-400">전화번호: 010-7324-8333</p>
          <p className="text-xs text-gray-400 mt-0.5">문의사항은 위 번호로 연락 부탁드립니다.</p>
        </div>
      </div>
    </div>
  )
}

export default Login
