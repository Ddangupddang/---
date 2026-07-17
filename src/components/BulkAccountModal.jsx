// 계정 없는 학생들의 로그인 계정을 한 번에 생성하는 모달.
import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { planStudentAccounts } from '../utils/studentUsername'
import { DEFAULT_STUDENT_PASSWORD } from '../constants/account'

export default function BulkAccountModal({ students, getClassName, onClose, onDone }) {
  const plan      = planStudentAccounts(students, [])
  const creatable = plan.filter((p) => !p.skip)
  const skipped   = plan.filter((p) => p.skip)

  const [phase,    setPhase]    = useState('preview') // preview | running | done
  const [progress, setProgress] = useState(0)
  const [results,  setResults]  = useState([])        // [{ name, username, ok, error }]

  async function handleCreate() {
    setPhase('running')
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    const out = []
    for (let i = 0; i < creatable.length; i++) {
      const p = creatable[i]
      try {
        const res = await fetch('/api/create-student-account', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            username:  p.username,
            password:  DEFAULT_STUDENT_PASSWORD,
            name:      p.name,
            classId:   p.classId,
            studentId: p.studentId,
          }),
        })
        const data = await res.json()
        out.push({ name: p.name, username: p.username, ok: res.ok, error: data.error })
      } catch {
        out.push({ name: p.name, username: p.username, ok: false, error: '네트워크 오류' })
      }
      setProgress(i + 1)
    }
    setResults(out)
    setPhase('done')
    onDone?.()
  }

  const successCount = results.filter((r) => r.ok).length
  const failCount    = results.filter((r) => !r.ok).length

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-5 w-full max-w-md max-h-[85vh] overflow-y-auto">
        {phase === 'preview' && (
          <>
            <h2 className="font-bold text-[#2B2B2B] mb-1">계정 일괄 생성</h2>
            <p className="text-sm text-gray-400 mb-4">
              계정이 없는 학생 {creatable.length}명의 계정을 만듭니다. (초기 비밀번호: {DEFAULT_STUDENT_PASSWORD})
            </p>
            <div className="border rounded-lg divide-y mb-3">
              {creatable.map((p) => (
                <div key={p.studentId} className="flex justify-between items-center px-3 py-2 text-sm">
                  <span className="text-[#2B2B2B]">{p.name} <span className="text-gray-400">· {getClassName(p.classId)}</span></span>
                  <span className="font-mono text-[#5B8FD4]">{p.username}</span>
                </div>
              ))}
              {creatable.length === 0 && (
                <div className="px-3 py-4 text-center text-gray-400 text-sm">생성할 학생이 없습니다.</div>
              )}
            </div>
            {skipped.length > 0 && (
              <div className="mb-3">
                <p className="text-xs text-gray-500 mb-1">건너뜀 {skipped.length}명</p>
                <div className="border rounded-lg divide-y">
                  {skipped.map((p) => (
                    <div key={p.studentId} className="flex justify-between px-3 py-2 text-sm">
                      <span className="text-[#2B2B2B]">{p.name}</span>
                      <span className="text-gray-400">{p.reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={onClose} className="flex-1 py-2 rounded-lg border text-sm text-gray-600">취소</button>
              <button onClick={handleCreate} disabled={creatable.length === 0}
                className="flex-1 py-2 rounded-lg bg-[#2B2B2B] text-white text-sm disabled:opacity-40">
                {creatable.length}명 생성
              </button>
            </div>
          </>
        )}

        {phase === 'running' && (
          <div className="py-8 text-center">
            <p className="text-sm text-gray-500 mb-2">계정 생성 중… ({progress}/{creatable.length})</p>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div className="bg-[#5B8FD4] h-2 rounded-full transition-all"
                style={{ width: `${creatable.length ? (progress / creatable.length) * 100 : 0}%` }} />
            </div>
          </div>
        )}

        {phase === 'done' && (
          <>
            <h2 className="font-bold text-[#2B2B2B] mb-1">생성 완료</h2>
            <p className="text-sm text-gray-400 mb-4">성공 {successCount}명 · 실패 {failCount}명</p>
            <div className="border rounded-lg divide-y mb-4 max-h-60 overflow-y-auto">
              {results.map((r, i) => (
                <div key={i} className="flex justify-between items-center px-3 py-2 text-sm">
                  <span className="text-[#2B2B2B]">{r.name} <span className="font-mono text-gray-400">{r.username}</span></span>
                  {r.ok
                    ? <span className="text-green-600">완료</span>
                    : <span className="text-[#C0392B]" title={r.error}>실패</span>}
                </div>
              ))}
            </div>
            <button onClick={onClose} className="w-full py-2 rounded-lg bg-[#2B2B2B] text-white text-sm">닫기</button>
          </>
        )}
      </div>
    </div>
  )
}
