// src/pages/Staff.jsx
// 관리자 전용 — 교사/관리자 계정 목록 조회 및 생성/삭제
import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import Layout from '../components/Layout'

const ROLE_LABEL = { admin: '관리자', teacher: '교사' }
const ROLE_COLOR = {
  admin:   'bg-[#C0392B]/10 text-[#C0392B]',
  teacher: 'bg-[#5B8FD4]/10 text-[#5B8FD4]',
}

export default function Staff() {
  const { user } = useAuth()
  const [staffList, setStaffList]   = useState([])
  const [listLoading, setListLoading] = useState(true)

  // 계정 생성 모달
  const [showForm, setShowForm]   = useState(false)
  const [form, setForm]           = useState({ username: '', password: '', name: '', role: 'teacher' })
  const [formMsg, setFormMsg]     = useState({ type: '', text: '' })
  const [formLoading, setFormLoading] = useState(false)

  // 삭제 확인
  const [deleteTarget, setDeleteTarget] = useState(null) // { id, name }
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteMsg, setDeleteMsg]   = useState('')

  // 스태프 목록 조회
  async function loadStaff() {
    setListLoading(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, name, role, password_changed')
      .in('role', ['admin', 'teacher'])
      .order('role')
      .order('name')

    if (!error && data) setStaffList(data)
    setListLoading(false)
  }

  useEffect(() => { loadStaff() }, [])

  // 계정 생성
  async function handleCreate(e) {
    e.preventDefault()
    if (!form.username.trim() || !form.password.trim() || !form.name.trim()) return
    setFormLoading(true)
    setFormMsg({ type: '', text: '' })

    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token

    const res = await fetch('/api/create-staff-account', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        username: form.username.trim(),
        password: form.password.trim(),
        name:     form.name.trim(),
        role:     form.role,
      }),
    })

    const data = await res.json()
    setFormLoading(false)

    if (res.ok) {
      setFormMsg({ type: 'success', text: `${form.name} 계정이 생성됐습니다.` })
      setForm({ username: '', password: '', name: '', role: 'teacher' })
      loadStaff()
    } else {
      setFormMsg({ type: 'error', text: data.error ?? '계정 생성에 실패했습니다.' })
    }
  }

  // 계정 삭제
  async function handleDelete() {
    if (!deleteTarget) return
    setDeleteLoading(true)
    setDeleteMsg('')

    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token

    const res = await fetch('/api/delete-staff-account', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ userId: deleteTarget.id }),
    })

    const data = await res.json()
    setDeleteLoading(false)

    if (res.ok) {
      setDeleteTarget(null)
      loadStaff()
    } else {
      setDeleteMsg(data.error ?? '삭제에 실패했습니다.')
    }
  }

  return (
    <Layout>
      {/* 헤더 */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-bold text-[#2B2B2B]">계정 관리</h1>
        <button
          onClick={() => { setShowForm(true); setFormMsg({ type: '', text: '' }) }}
          className="px-4 py-2 bg-[#2B2B2B] text-white rounded-lg text-sm"
        >
          + 계정 추가
        </button>
      </div>

      {/* 스태프 목록 */}
      {listLoading ? (
        <div className="text-center py-12 text-gray-400 text-sm">불러오는 중...</div>
      ) : staffList.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">등록된 계정이 없습니다.</div>
      ) : (
        <div className="flex flex-col gap-2">
          {staffList.map((s) => (
            <div
              key={s.id}
              className="bg-white rounded-xl p-4 shadow-sm flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ROLE_COLOR[s.role]}`}>
                  {ROLE_LABEL[s.role]}
                </span>
                <div>
                  <p className="text-sm font-semibold text-[#2B2B2B]">{s.name}</p>
                  <p className="text-xs text-gray-400">@{s.username}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!s.password_changed && (
                  <span className="text-xs text-[#f39c12] bg-[#f39c12]/10 px-2 py-0.5 rounded-full">
                    비밀번호 미변경
                  </span>
                )}
                {/* 본인 계정은 삭제 버튼 미표시 */}
                {s.id !== user?.id && (
                  <button
                    onClick={() => { setDeleteTarget({ id: s.id, name: s.name }); setDeleteMsg('') }}
                    className="text-xs text-gray-400 hover:text-[#C0392B] transition-colors px-2 py-1 rounded-lg hover:bg-[#C0392B]/5"
                  >
                    삭제
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 계정 생성 모달 */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h2 className="text-lg font-bold text-[#2B2B2B] mb-4">계정 추가</h2>
            <form onSubmit={handleCreate} className="flex flex-col gap-3">
              {/* 역할 선택 */}
              <div className="flex gap-2">
                {['teacher', 'admin'].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, role: r }))}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${
                      form.role === r
                        ? 'bg-[#2B2B2B] text-white border-[#2B2B2B]'
                        : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
                    }`}
                  >
                    {ROLE_LABEL[r]}
                  </button>
                ))}
              </div>

              <input
                type="text"
                placeholder="이름"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full h-11 px-4 bg-[#F4F3EE] rounded-xl border border-transparent focus:border-[#5B8FD4] focus:outline-none text-sm"
                required
              />
              <input
                type="text"
                placeholder="아이디 (영문·숫자)"
                value={form.username}
                onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                className="w-full h-11 px-4 bg-[#F4F3EE] rounded-xl border border-transparent focus:border-[#5B8FD4] focus:outline-none text-sm"
                required
              />
              <input
                type="password"
                placeholder="초기 비밀번호"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                className="w-full h-11 px-4 bg-[#F4F3EE] rounded-xl border border-transparent focus:border-[#5B8FD4] focus:outline-none text-sm"
                required
              />

              {formMsg.text && (
                <p className={`text-sm text-center ${formMsg.type === 'error' ? 'text-[#C0392B]' : 'text-[#27ae60]'}`}>
                  {formMsg.text}
                </p>
              )}

              <div className="flex gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50"
                >
                  닫기
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex-1 py-2.5 rounded-xl bg-[#2B2B2B] text-white text-sm font-semibold disabled:opacity-50"
                >
                  {formLoading ? '생성 중...' : '계정 생성'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 삭제 확인 모달 */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h2 className="text-lg font-bold text-[#2B2B2B] mb-2">계정 삭제</h2>
            <p className="text-sm text-gray-500 mb-4">
              <span className="font-semibold text-[#2B2B2B]">{deleteTarget.name}</span> 계정을 삭제하시겠습니까?
              <br />삭제 후 복구할 수 없습니다.
            </p>
            {deleteMsg && (
              <p className="text-sm text-[#C0392B] mb-3">{deleteMsg}</p>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteLoading}
                className="flex-1 py-2.5 rounded-xl bg-[#C0392B] text-white text-sm font-semibold disabled:opacity-50"
              >
                {deleteLoading ? '삭제 중...' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
