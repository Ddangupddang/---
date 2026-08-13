// src/pages/Login.jsx
import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Button from '../components/ui/Button'

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
    <div className="min-h-screen bg-surface-alt flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-surface border border-line rounded p-8">
        {/* 로고 영역 */}
        <div className="text-center mb-8">
          <img
            src="/logo-vertical.png"
            alt="수문재국어 로고"
            className="w-44 mx-auto mb-4 object-contain"
          />
          <p className="text-sm text-ink-faint">학생 관리 시스템</p>
        </div>

        {/* 로그인 폼 */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="text"
            placeholder="아이디"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full h-12 px-4 bg-surface-alt rounded border border-transparent focus:border-navy focus:outline-none text-sm"
            autoComplete="username"
          />
          <input
            type="password"
            placeholder="비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full h-12 px-4 bg-surface-alt rounded border border-transparent focus:border-navy focus:outline-none text-sm"
            autoComplete="current-password"
          />

          {error && (
            <p className="text-sm text-danger text-center">{error}</p>
          )}

          {/* 공통 Button을 쓰되, 모바일에서 눌린 느낌을 주는 active:scale-95만 덧붙인다.
              Button의 py-3와 h-12는 충돌하지 않는다 — border-box라 높이 48px가 그대로 지켜지고
              (안쪽 여백 24px + 글자 22px = 46px < 48px) 넘치지 않는다. py-0으로 덮지 않는 이유는
              같은 속성끼리는 class 순서가 아니라 CSS 출력 순서로 결정돼 믿을 수 없기 때문이다. */}
          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 mt-1 active:scale-95"
          >
            {loading ? '로그인 중...' : '로그인'}
          </Button>
        </form>

        {/* 학원 정보 */}
        <div className="mt-6 p-3 bg-surface-alt rounded text-center">
          <p className="text-xs text-ink-mute font-semibold mb-1">수문재국어전문학원</p>
          {/* 학원 대표 번호 — 로그인 못 하는 학부모가 보는 유일한 연락처라
              회색 배경(bg-surface-alt) 위에서 3:1을 넘도록 한 단계 진하게 쓴다 */}
          <p className="text-xs text-ink-mute">전화번호: 010-7324-8333</p>
          <p className="text-xs text-ink-mute mt-0.5">문의사항은 위 번호로 연락 부탁드립니다.</p>
        </div>
      </div>
    </div>
  )
}

export default Login
