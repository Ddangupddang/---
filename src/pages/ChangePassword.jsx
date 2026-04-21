// src/pages/ChangePassword.jsx
// 비밀번호 변경 페이지 (첫 로그인 강제 변경 + 이후 자유 변경)
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Layout from '../components/Layout'

function ChangePassword() {
  const { user, changePassword } = useAuth()
  const navigate = useNavigate()

  const [form, setForm]       = useState({ current: '', next: '', confirm: '' })
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone]       = useState(false)

  // 첫 로그인 강제 변경 여부
  const isFirstLogin = user?.passwordChanged === false

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (form.next.length < 6) {
      setError('새 비밀번호는 6자 이상이어야 합니다.')
      return
    }
    if (form.next !== form.confirm) {
      setError('새 비밀번호가 일치하지 않습니다.')
      return
    }

    setLoading(true)
    try {
      const { error: err } = await changePassword(form.current, form.next)
      if (err) {
        setError(err)
        return
      }
      setDone(true)
    } catch {
      setError('오류가 발생했습니다. 다시 시도해주세요.')
    } finally {
      setLoading(false)
    }
  }

  const handleDone = () => navigate('/dashboard', { replace: true })

  return (
    <Layout>
      <div className="max-w-sm mx-auto mt-6">
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h1 className="font-bold text-[#2B2B2B] text-lg mb-1">비밀번호 변경</h1>

          {isFirstLogin && (
            <div className="mb-4 px-3 py-2 bg-[#5B8FD4]/10 rounded-lg text-sm text-[#5B8FD4]">
              처음 로그인하셨습니다. 보안을 위해 비밀번호를 변경해주세요.
            </div>
          )}

          {done ? (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-2xl">✓</div>
              <p className="text-sm text-gray-600 text-center">비밀번호가 성공적으로 변경됐습니다.</p>
              <button
                onClick={handleDone}
                className="w-full h-11 bg-[#2B2B2B] text-white rounded-xl text-sm font-semibold"
              >
                대시보드로 이동
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-3 mt-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">현재 비밀번호</label>
                <input
                  required
                  type="password"
                  value={form.current}
                  onChange={(e) => setForm({ ...form, current: e.target.value })}
                  className="w-full h-11 px-3 bg-[#F4F3EE] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5B8FD4]"
                  autoComplete="current-password"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">새 비밀번호 (6자 이상)</label>
                <input
                  required
                  type="password"
                  minLength={6}
                  value={form.next}
                  onChange={(e) => setForm({ ...form, next: e.target.value })}
                  className="w-full h-11 px-3 bg-[#F4F3EE] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5B8FD4]"
                  autoComplete="new-password"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">새 비밀번호 확인</label>
                <input
                  required
                  type="password"
                  minLength={6}
                  value={form.confirm}
                  onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                  className="w-full h-11 px-3 bg-[#F4F3EE] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5B8FD4]"
                  autoComplete="new-password"
                />
              </div>

              {error && (
                <p className="text-sm text-[#C0392B]">{error}</p>
              )}

              <div className="flex gap-2 mt-1">
                {!isFirstLogin && (
                  <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="flex-1 h-11 border border-gray-200 rounded-xl text-sm text-gray-500 hover:bg-gray-50"
                  >
                    취소
                  </button>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 h-11 bg-[#2B2B2B] text-white rounded-xl text-sm font-semibold disabled:opacity-40"
                >
                  {loading ? '변경 중...' : '비밀번호 변경'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </Layout>
  )
}

export default ChangePassword
