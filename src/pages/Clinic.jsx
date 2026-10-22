// src/pages/Clinic.jsx
// 보강 클리닉 신청.
//
// 학생: 어려운 부분 한 줄을 적어 신청한다. 날짜·시간은 고르지 않는다.
// 교사·관리자: 수락하면서 날짜·시간을 글로 적어 주거나, 이유를 적어 거절한다.
//
// 신청이 오면 담당 교사와 관리자 폰에, 처리되면 학생 폰에 알림이 간다
// (웹훅 → api/notify-qna-message.js → src/utils/clinicNotify.js).
import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import Layout from '../components/Layout'
import PageTitle from '../components/ui/PageTitle'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Alert from '../components/ui/Alert'
import PushToggle from '../components/PushToggle'
import {
  CLINIC_STATUS, visibleClinicRequests, pendingRequestOf, sortClinicRequests,
} from '../utils/clinic'
import { formatDateTime } from '../utils/datetime'

// 한 줄이면 충분하다. 길게 쓰게 두면 Q&A와 겹친다.
const MAX_CONTENT = 100

const inputClass =
  'w-full border border-line rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy'

export default function Clinic() {
  const { user } = useAuth()
  const {
    clinicRequests = [], students = [], classes = [], staffProfiles = [],
    requestClinic, acceptClinic, rejectClinic, cancelClinic,
  } = useData()

  const isStaff = user.role === 'teacher' || user.role === 'admin'
  const visible = sortClinicRequests(visibleClinicRequests(clinicRequests, students, classes, user))

  return (
    <Layout>
      <div>
        <PageTitle
          title="클리닉"
          lead={isStaff
            ? '학생이 신청한 보강 클리닉을 수락하거나 거절합니다.'
            : '어려운 부분을 적어 보강 클리닉을 신청하세요.'}
        />
        <PushToggle label="클리닉 알림" />
        {isStaff ? (
          <StaffView
            requests={visible}
            students={students}
            classes={classes}
            staffProfiles={staffProfiles}
            user={user}
            acceptClinic={acceptClinic}
            rejectClinic={rejectClinic}
          />
        ) : (
          <StudentView
            requests={visible}
            user={user}
            requestClinic={requestClinic}
            cancelClinic={cancelClinic}
          />
        )}
      </div>
    </Layout>
  )
}

// ────────── 학생 화면 ──────────
function StudentView({ requests, user, requestClinic, cancelClinic }) {
  const [content, setContent] = useState('')
  const [busy,    setBusy]    = useState(false)
  const [error,   setError]   = useState('')

  const pending = pendingRequestOf(requests, user.studentId)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!content.trim() || busy) return
    setBusy(true)
    setError('')
    const res = await requestClinic({ studentId: user.studentId, content: content.trim() })
    // 실패했는데 칸을 비우면 신청된 줄 알고 넘어간다 — 적은 글을 그대로 둔다
    if (res?.error) setError('신청하지 못했습니다. 잠시 후 다시 시도해 주세요.')
    else setContent('')
    setBusy(false)
  }

  async function handleCancel(id) {
    if (busy) return
    setBusy(true)
    setError('')
    const res = await cancelClinic(id)
    if (res?.error) setError(res.error)
    setBusy(false)
  }

  return (
    <div className="flex flex-col gap-4">
      {/* 기다리는 신청이 있으면 새로 받지 않는다 — 교사 폰에 같은 알림이 줄줄이 간다 */}
      {pending ? (
        <Alert tone="info">신청을 보냈어요. 선생님이 시간을 정해 알려 줄 거예요.</Alert>
      ) : (
        <form onSubmit={handleSubmit} className="bg-surface border border-line rounded p-4">
          <label htmlFor="clinic-content" className="block text-sm font-semibold text-ink mb-2">
            어떤 부분이 어려운가요?
          </label>
          <input
            id="clinic-content"
            data-testid="clinic-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={MAX_CONTENT}
            placeholder="예: 비문학 추론 문제를 자꾸 틀려요"
            className={`${inputClass} mb-3`}
          />
          <Button type="submit" disabled={!content.trim() || busy} className="w-full">
            클리닉 신청
          </Button>
        </form>
      )}

      {error && <Alert>{error}</Alert>}

      <section>
        <h2 className="text-sm font-semibold text-ink-soft mb-2">내 신청</h2>
        {requests.length === 0 ? (
          <p className="text-center text-ink-faint py-8 text-sm">아직 신청한 클리닉이 없어요.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {requests.map((r) => (
              <div
                key={r.id}
                data-testid={`clinic-${r.id}`}
                className="bg-surface border border-line rounded p-4"
              >
                <div className="flex justify-between items-start gap-2 mb-2">
                  <p className="text-sm text-ink min-w-0 break-words">{r.content}</p>
                  <StatusBadge status={r.status} />
                </div>
                {r.status === 'accepted' && (
                  <p className="text-sm font-semibold text-navy mb-1">일정: {r.scheduleText}</p>
                )}
                {r.status === 'rejected' && (
                  <p className="text-sm text-ink-soft mb-1">선생님: {r.rejectReason}</p>
                )}
                <div className="flex justify-between items-center">
                  <p className="text-xs text-ink-faint">{formatDateTime(r.createdAt)} 신청</p>
                  {r.status === 'pending' && (
                    <button
                      type="button"
                      data-testid={`clinic-cancel-${r.id}`}
                      onClick={() => handleCancel(r.id)}
                      disabled={busy}
                      className="text-xs text-ink-faint hover:text-danger transition-colors"
                    >
                      신청 취소
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

// ────────── 교사·관리자 화면 ──────────
function StaffView({ requests, students, classes, staffProfiles, user, acceptClinic, rejectClinic }) {
  const pending = requests.filter((r) => r.status === 'pending')
  const handled = requests.filter((r) => r.status !== 'pending')

  const studentOf = (id) => students.find((s) => s.id === id)
  const classNameOf = (student) => classes.find((c) => c.id === student?.classId)?.name ?? ''
  const staffNameOf = (id) => staffProfiles.find((p) => p.id === id)?.name ?? ''

  return (
    <div className="flex flex-col gap-6">
      <section>
        <h2 className="text-sm font-semibold text-ink-soft mb-2">
          대기 중 {pending.length > 0 && <span className="text-danger">{pending.length}건</span>}
        </h2>
        {pending.length === 0 ? (
          <p className="text-center text-ink-faint py-8 text-sm">기다리는 신청이 없습니다.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {pending.map((r) => (
              <PendingCard
                key={r.id}
                request={r}
                student={studentOf(r.studentId)}
                className={classNameOf(studentOf(r.studentId))}
                onAccept={(scheduleText) => acceptClinic(r.id, { scheduleText, handledBy: user.id })}
                onReject={(rejectReason) => rejectClinic(r.id, { rejectReason, handledBy: user.id })}
              />
            ))}
          </div>
        )}
      </section>

      {handled.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-ink-soft mb-2">처리한 신청</h2>
          <div className="flex flex-col gap-3">
            {handled.map((r) => {
              const student = studentOf(r.studentId)
              return (
                <div
                  key={r.id}
                  data-testid={`clinic-${r.id}`}
                  className="bg-surface border border-line rounded p-4"
                >
                  <div className="flex justify-between items-start gap-2 mb-1">
                    <p className="text-sm font-semibold text-ink min-w-0 truncate">
                      {student?.name ?? '알 수 없음'}
                      <span className="text-xs font-normal text-ink-faint ml-1.5">{classNameOf(student)}</span>
                    </p>
                    <StatusBadge status={r.status} />
                  </div>
                  <p className="text-sm text-ink-soft mb-1 break-words">{r.content}</p>
                  <p className="text-sm text-ink break-words">
                    {r.status === 'accepted' ? `일정: ${r.scheduleText}` : `거절 이유: ${r.rejectReason}`}
                  </p>
                  <p className="text-xs text-ink-faint mt-1">
                    {[staffNameOf(r.handledBy), r.handledAt && formatDateTime(r.handledAt)]
                      .filter(Boolean).join(' · ')}
                  </p>
                </div>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}

// 대기 중인 신청 하나. 수락·거절 버튼을 누르면 그 자리에서 입력 칸이 열린다.
function PendingCard({ request, student, className, onAccept, onReject }) {
  const [mode,  setMode]  = useState(null) // null | 'accept' | 'reject'
  const [text,  setText]  = useState('')
  const [busy,  setBusy]  = useState(false)
  const [error, setError] = useState('')

  function open(next) { setMode(next); setText(''); setError('') }

  async function handleConfirm() {
    if (!text.trim() || busy) return
    setBusy(true)
    setError('')
    const res = mode === 'accept' ? await onAccept(text.trim()) : await onReject(text.trim())
    // 성공하면 이 카드는 '처리한 신청'으로 옮겨 가며 사라진다
    if (res?.error) { setError(res.error); setBusy(false) }
  }

  return (
    <div data-testid={`clinic-${request.id}`} className="bg-surface border border-line rounded p-4">
      <div className="flex justify-between items-start gap-2 mb-1">
        <p className="text-sm font-semibold text-ink min-w-0 truncate">
          {student?.name ?? '알 수 없음'}
          <span className="text-xs font-normal text-ink-faint ml-1.5">{className}</span>
        </p>
        <StatusBadge status="pending" />
      </div>
      <p className="text-sm text-ink mb-1 break-words">{request.content}</p>
      <p className="text-xs text-ink-faint mb-3">{formatDateTime(request.createdAt)} 신청</p>

      {mode ? (
        <div>
          <label htmlFor={`clinic-text-${request.id}`} className="block text-xs font-semibold text-ink-soft mb-1">
            {mode === 'accept' ? '날짜·시간' : '거절 이유'}
          </label>
          <input
            id={`clinic-text-${request.id}`}
            data-testid={`clinic-text-${request.id}`}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={mode === 'accept' ? '예: 10/25(토) 오후 3시, 3강의실' : '예: 이번 주는 일정이 꽉 찼어요. 다음 주에 다시 신청해 주세요.'}
            className={`${inputClass} mb-2`}
            autoFocus
          />
          <div className="flex flex-wrap gap-2">
            <Button
              variant={mode === 'accept' ? 'accent' : 'danger'}
              onClick={handleConfirm}
              disabled={!text.trim() || busy}
              data-testid={`clinic-confirm-${request.id}`}
            >
              {mode === 'accept' ? '수락하고 알리기' : '거절하고 알리기'}
            </Button>
            <Button variant="ghost" onClick={() => open(null)} disabled={busy}>취소</Button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <Button variant="accent" onClick={() => open('accept')} data-testid={`clinic-accept-${request.id}`}>
            수락
          </Button>
          <Button variant="ghost" onClick={() => open('reject')} data-testid={`clinic-reject-${request.id}`}>
            거절
          </Button>
        </div>
      )}

      {error && <Alert className="mt-2">{error}</Alert>}
    </div>
  )
}

function StatusBadge({ status }) {
  const s = CLINIC_STATUS[status] ?? CLINIC_STATUS.pending
  return <Badge tone={s.tone} className="shrink-0">{s.label}</Badge>
}
