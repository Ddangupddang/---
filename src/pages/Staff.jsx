// src/pages/Staff.jsx
// 관리자 전용 — 교사/관리자 계정 목록 조회 및 생성/삭제
import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import Layout from '../components/Layout'
import PageTitle from '../components/ui/PageTitle'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Alert from '../components/ui/Alert'

const ROLE_LABEL = { admin: '관리자', teacher: '교사' }
// 팔레트에 역할별 색이 따로 없어 관리자=danger(주의), 교사=navy(일반)로 대응한다
const ROLE_TONE = { admin: 'danger', teacher: 'navy' }

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

  // 마운트 시 1회 스태프 목록 조회 (의도된 데이터 로딩)
  // eslint-disable-next-line react-hooks/set-state-in-effect
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
      <div className="flex justify-between items-center mb-4">
        <PageTitle title="계정 관리" />
        <Button onClick={() => { setShowForm(true); setFormMsg({ type: '', text: '' }) }}>
          + 계정 추가
        </Button>
      </div>

      {/* 스태프 목록 */}
      {listLoading ? (
        <div className="text-center py-12 text-ink-faint text-sm">불러오는 중...</div>
      ) : staffList.length === 0 ? (
        <div className="text-center py-12 text-ink-faint text-sm">등록된 계정이 없습니다.</div>
      ) : (
        <div className="flex flex-col gap-2">
          {staffList.map((s) => (
            <div
              key={s.id}
              className="bg-surface border border-line rounded p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <Badge tone={ROLE_TONE[s.role]}>{ROLE_LABEL[s.role]}</Badge>
                <div>
                  <p className="text-sm font-semibold text-ink">{s.name}</p>
                  <p className="text-xs text-ink-faint">@{s.username}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!s.password_changed && <Badge tone="warn">비밀번호 미변경</Badge>}
                {/* 본인 계정은 삭제 버튼 미표시 */}
                {s.id !== user?.id && (
                  <button
                    onClick={() => { setDeleteTarget({ id: s.id, name: s.name }); setDeleteMsg('') }}
                    className="text-xs text-ink-faint hover:text-danger transition-colors px-2 py-1 rounded"
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
          <div className="bg-surface rounded p-6 w-full max-w-sm">
            <h2 className="text-lg font-bold text-ink mb-4">계정 추가</h2>
            <form onSubmit={handleCreate} className="flex flex-col gap-3">
              {/* 역할 선택 */}
              <div className="flex gap-2">
                {['teacher', 'admin'].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, role: r }))}
                    className={`flex-1 py-2 rounded text-sm font-medium border transition-colors ${
                      form.role === r
                        ? 'bg-ink text-white border-ink'
                        : 'bg-surface text-ink-mute border-line hover:border-ink-faint'
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
                className="w-full h-11 px-4 bg-surface-alt rounded border border-transparent focus:border-navy focus:outline-none text-sm"
                required
              />
              <input
                type="text"
                placeholder="아이디 (영문·숫자)"
                value={form.username}
                onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                className="w-full h-11 px-4 bg-surface-alt rounded border border-transparent focus:border-navy focus:outline-none text-sm"
                required
              />
              <input
                type="password"
                placeholder="초기 비밀번호"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                className="w-full h-11 px-4 bg-surface-alt rounded border border-transparent focus:border-navy focus:outline-none text-sm"
                required
              />

              {/* 성공/실패는 팔레트에 초록이 없어 Alert의 info(남색)/danger로 대응한다 */}
              {formMsg.text && (
                <Alert tone={formMsg.type === 'error' ? 'danger' : 'info'} className="text-center">
                  {formMsg.text}
                </Alert>
              )}

              <div className="flex gap-2 mt-1">
                <Button type="button" variant="ghost" onClick={() => setShowForm(false)} className="flex-1">
                  닫기
                </Button>
                <Button type="submit" disabled={formLoading} className="flex-1">
                  {formLoading ? '생성 중...' : '계정 생성'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 삭제 확인 모달 */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded p-6 w-full max-w-sm">
            <h2 className="text-lg font-bold text-ink mb-2">계정 삭제</h2>
            <p className="text-sm text-ink-mute mb-4">
              <span className="font-semibold text-ink">{deleteTarget.name}</span> 계정을 삭제하시겠습니까?
              <br />삭제 후 복구할 수 없습니다.
            </p>
            {deleteMsg && <Alert tone="danger" className="mb-3">{deleteMsg}</Alert>}
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setDeleteTarget(null)} className="flex-1">
                취소
              </Button>
              <Button
                variant="danger"
                onClick={handleDelete}
                disabled={deleteLoading}
                className="flex-1"
              >
                {deleteLoading ? '삭제 중...' : '삭제'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
