// 계정 없는 학생들의 로그인 계정을 한 번에 생성하는 모달.
import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { planStudentAccounts } from '../utils/studentUsername'
import { DEFAULT_STUDENT_PASSWORD } from '../constants/account'
import Button from './ui/Button'

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
      <div className="bg-surface rounded p-5 w-full max-w-md max-h-[85vh] overflow-y-auto">
        {phase === 'preview' && (
          <>
            <h2 className="font-bold text-ink mb-1">계정 일괄 생성</h2>
            <p className="text-sm text-ink-faint mb-4">
              계정이 없는 학생 {creatable.length}명의 계정을 만듭니다. (초기 비밀번호: {DEFAULT_STUDENT_PASSWORD})
            </p>
            <div className="border border-line rounded divide-y divide-line-soft mb-3">
              {creatable.map((p) => (
                <div key={p.studentId} className="flex justify-between items-center px-3 py-2 text-sm">
                  <span className="text-ink">{p.name} <span className="text-ink-faint">· {getClassName(p.classId)}</span></span>
                  <span className="font-mono text-navy">{p.username}</span>
                </div>
              ))}
              {creatable.length === 0 && (
                <div className="px-3 py-4 text-center text-ink-faint text-sm">생성할 학생이 없습니다.</div>
              )}
            </div>
            {skipped.length > 0 && (
              <div className="mb-3">
                <p className="text-xs text-ink-mute mb-1">건너뜀 {skipped.length}명</p>
                <div className="border border-line rounded divide-y divide-line-soft">
                  {skipped.map((p) => (
                    <div key={p.studentId} className="flex justify-between px-3 py-2 text-sm">
                      <span className="text-ink">{p.name}</span>
                      <span className="text-ink-faint">{p.reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <Button variant="ghost" onClick={onClose} className="flex-1">취소</Button>
              <Button variant="primary" onClick={handleCreate} disabled={creatable.length === 0} className="flex-1">
                {creatable.length}명 생성
              </Button>
            </div>
          </>
        )}

        {phase === 'running' && (
          <div className="py-8 text-center">
            <p className="text-sm text-ink-mute mb-2">계정 생성 중… ({progress}/{creatable.length})</p>
            <div className="w-full bg-surface-alt rounded-full h-2">
              <div className="bg-navy h-2 rounded-full transition-all"
                style={{ width: `${creatable.length ? (progress / creatable.length) * 100 : 0}%` }} />
            </div>
          </div>
        )}

        {phase === 'done' && (
          <>
            <h2 className="font-bold text-ink mb-1">생성 완료</h2>
            <p className="text-sm text-ink-faint mb-4">성공 {successCount}명 · 실패 {failCount}명</p>
            <div className="border border-line rounded divide-y divide-line-soft mb-4 max-h-60 overflow-y-auto">
              {results.map((r, i) => (
                <div key={i} className="flex justify-between items-center px-3 py-2 text-sm">
                  <span className="text-ink">{r.name} <span className="font-mono text-ink-faint">{r.username}</span></span>
                  {r.ok
                    ? <span className="text-navy">완료</span>
                    : <span className="text-danger" title={r.error}>실패</span>}
                </div>
              ))}
            </div>
            <Button variant="primary" onClick={onClose} className="w-full">닫기</Button>
          </>
        )}
      </div>
    </div>
  )
}
