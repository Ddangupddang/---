// src/pages/Notices.jsx
import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { visibleClasses, visibleClassIds } from '../utils/classAccess'
import Layout from '../components/Layout'
import PageTitle from '../components/ui/PageTitle'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'

// 공지는 반 단위로 대상을 정한다 — 대상이 비어 있으면 학원 전체 공지다
export default function Notices() {
  const { user } = useAuth()
  const { classes, notices, addNotice, deleteNotice, staffProfiles } = useData()
  const [view, setView]         = useState('list') // list | detail | create
  const [selected, setSelected] = useState(null)

  const isTeacherOrAdmin = user.role === 'teacher' || user.role === 'admin'

  // 대상이 비어 있으면 학원 전체 공지라 누구에게나 보인다.
  // 대상이 정해진 공지는 자기 반(교사는 담당 반)과 겹칠 때만 보인다.
  const myClassIds = visibleClassIds(classes, user)
  function canSeeNotice(n) {
    if (user.role === 'admin') return true
    if (n.targetClassIds.length === 0) return true
    if (user.role === 'student') return n.targetClassIds.includes(user.classId)
    return n.targetClassIds.some((id) => myClassIds.includes(id))
  }

  const visibleNotices = notices
    .filter(canSeeNotice)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  // ────────── list 뷰 ──────────
  if (view === 'list') {
    return (
      <Layout>
      <div>
        <div className="flex justify-between items-center mb-4">
          <PageTitle title="공지사항" />
          {isTeacherOrAdmin && (
            <Button onClick={() => setView('create')}>+ 공지 작성</Button>
          )}
        </div>

        {visibleNotices.length === 0 ? (
          <p className="text-center text-ink-faint py-12">공지사항이 없습니다.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {visibleNotices.map((n) => {
              const author      = staffProfiles.find((p) => p.id === n.authorId)
              const isAllClass  = n.targetClassIds.length === classes.length
              const targetLabel = isAllClass
                ? '전체'
                : n.targetClassIds
                    .map((id) => classes.find((c) => c.id === id)?.name)
                    .filter(Boolean)
                    .join(', ')
              const canDelete = isTeacherOrAdmin && (n.authorId === user.id || user.role === 'admin')

              return (
                <div
                  key={n.id}
                  className="bg-surface border border-line rounded p-4 hover:bg-surface-alt transition-colors"
                >
                  <div
                    onClick={() => { setSelected(n); setView('detail') }}
                    className="cursor-pointer"
                  >
                    <div className="flex justify-between items-start mb-1">
                      <p className="font-semibold text-ink flex-1 pr-2">{n.title}</p>
                      {/* 이미 발송이 끝난 상태라 '완료' 톤(navy)을 쓴다.
                          warn은 이 앱에서 채점중·답변 대기처럼 "아직 안 끝났다"는 뜻이다 */}
                      {n.kakaoSent && <Badge tone="navy" className="shrink-0">카카오 전송</Badge>}
                    </div>
                    <p className="text-sm text-ink-mute line-clamp-2 mb-2">{n.content}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <div
                      onClick={() => { setSelected(n); setView('detail') }}
                      className="flex items-center gap-2 text-xs text-ink-faint cursor-pointer"
                    >
                      <span>{n.createdAt?.slice(0, 10)}</span>
                      <span>·</span>
                      <span>{author?.name ?? '알 수 없음'}</span>
                      <span>·</span>
                      <span>{targetLabel}</span>
                    </div>
                    {canDelete && (
                      <button
                        onClick={() => {
                          if (confirm('공지를 삭제하시겠습니까?')) deleteNotice(n.id)
                        }}
                        className="text-xs text-ink-faint hover:text-danger transition-colors ml-2 shrink-0"
                      >
                        삭제
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
      </Layout>
    )
  }

  // ────────── detail 뷰 ──────────
  if (view === 'detail') {
    const n          = selected
    const author     = staffProfiles.find((p) => p.id === n.authorId)
    const isAllClass = n.targetClassIds.length === classes.length
    const targetLabel = isAllClass
      ? '전체'
      : n.targetClassIds
          .map((id) => classes.find((c) => c.id === id)?.name)
          .filter(Boolean)
          .join(', ')

    return (
      <Layout>
      <div>
        <button onClick={() => setView('list')} className="text-sm text-ink-mute hover:text-ink-soft mb-2 block">
          ← 목록
        </button>
        <PageTitle title="공지사항" />

        <div className="bg-surface border border-line rounded p-5">
          <div className="flex justify-between items-start mb-3">
            <h2 className="text-lg font-bold text-ink flex-1 pr-2">{n.title}</h2>
            {/* 목록과 같은 이유로 완료 톤(navy) */}
            {n.kakaoSent && <Badge tone="navy" className="shrink-0">카카오 전송</Badge>}
          </div>
          <div className="flex items-center gap-2 text-xs text-ink-faint mb-4 pb-4 border-b border-line">
            <span>{n.createdAt?.slice(0, 10)}</span>
            <span>·</span>
            <span>{author?.name}</span>
            <span>·</span>
            <span>{targetLabel}</span>
          </div>
          <p className="text-sm text-ink-soft leading-relaxed whitespace-pre-wrap">{n.content}</p>
        </div>
      </div>
      </Layout>
    )
  }

  // ────────── create 뷰 ──────────
  if (view === 'create') {
    if (!isTeacherOrAdmin) { setView('list'); return null }
    return (
      <Layout>
      <CreateView
        user={user}
        onSubmit={async (newNotice) => {
          const res = await addNotice(newNotice)
          // 실패했는데 목록으로 넘기면 올라간 줄 알고 지나간다
          if (res?.error) return res.error
          setView('list')
          return null
        }}
        onCancel={() => setView('list')}
      />
      </Layout>
    )
  }

  return null
}

// ────────── CreateView 컴포넌트 ──────────
function CreateView({ user, onSubmit, onCancel }) {
  const { classes: allClasses } = useData()
  // 남의 반에 공지를 보내지 못하도록 대상 선택지도 담당 반으로 제한한다
  const classes = visibleClasses(allClasses, user)
  const [title,           setTitle]          = useState('')
  const [content,         setContent]        = useState('')
  const [selectedClasses, setSelectedClasses] = useState(classes.map((c) => c.id)) // 기본: 전체
  const [sendKakao,       setSendKakao]      = useState(false)
  const [kakaoSending,    setKakaoSending]   = useState(false)
  const [kakaoSent,       setKakaoSent]      = useState(false)
  const [submitting,      setSubmitting]     = useState(false)
  const [error,           setError]          = useState('')

  function toggleClass(id) {
    setSelectedClasses((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    )
  }

  function handleKakaoSend() {
    if (!title.trim() || !content.trim()) return
    setKakaoSending(true)
    // 실제 서비스에서는 카카오 알림톡 API 호출
    setTimeout(() => {
      setKakaoSending(false)
      setKakaoSent(true)
    }, 1500)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!title.trim() || !content.trim() || selectedClasses.length === 0 || submitting) return
    setSubmitting(true)
    setError('')
    const failed = await onSubmit({
      title:          title.trim(),
      content:        content.trim(),
      authorId:       user.id,
      targetClassIds: selectedClasses,
      kakaoSent:      kakaoSent,
    })
    if (failed) setError(failed)
    setSubmitting(false)
  }

  return (
    <div>
      <button onClick={onCancel} className="text-sm text-ink-mute hover:text-ink-soft mb-2 block">
        ← 목록
      </button>
      <PageTitle title="공지 작성" />

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {/* 제목 */}
        <div>
          <label className="block text-sm font-medium text-ink-soft mb-1">제목</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="공지 제목을 입력하세요"
            className="w-full border border-line rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy"
            required
          />
        </div>

        {/* 내용 */}
        <div>
          <label className="block text-sm font-medium text-ink-soft mb-1">내용</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="공지 내용을 입력하세요"
            rows={6}
            className="w-full border border-line rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy resize-none"
            required
          />
        </div>

        {/* 대상 반 */}
        <div>
          <label className="block text-sm font-medium text-ink-soft mb-2">대상 반</label>
          <div className="flex gap-2 flex-wrap">
            <button
              type="button"
              onClick={() =>
                selectedClasses.length === classes.length
                  ? setSelectedClasses([])
                  : setSelectedClasses(classes.map((c) => c.id))
              }
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                selectedClasses.length === classes.length
                  ? 'bg-ink text-white'
                  : 'bg-surface-alt text-ink-soft hover:bg-line-soft'
              }`}
            >
              전체
            </button>
            {classes.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => toggleClass(c.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  selectedClasses.includes(c.id)
                    ? 'bg-navy text-white'
                    : 'bg-surface-alt text-ink-soft hover:bg-line-soft'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
          {selectedClasses.length === 0 && (
            <p className="text-xs text-danger mt-1">대상 반을 하나 이상 선택해주세요.</p>
          )}
        </div>

        {/* 카카오톡 알림톡 전송 — 팔레트에 카카오 고유 노랑이 없어 warn(주의) 톤으로 대응한다 */}
        <div className="bg-warn-soft border border-line rounded p-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-sm font-medium text-ink-soft">카카오톡 알림톡 전송</p>
              <p className="text-xs text-ink-mute">학생/학부모에게 카카오톡으로 공지를 발송합니다.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={sendKakao}
                onChange={(e) => { setSendKakao(e.target.checked); setKakaoSent(false) }}
                className="sr-only"
              />
              <div className={`w-10 h-6 rounded-full transition-colors ${sendKakao ? 'bg-warn' : 'bg-line'}`}>
                <div className={`w-4 h-4 bg-surface rounded-full m-1 transition-transform ${sendKakao ? 'translate-x-4' : ''}`} />
              </div>
            </label>
          </div>
          {sendKakao && (
            <button
              type="button"
              onClick={handleKakaoSend}
              disabled={kakaoSending || kakaoSent || !title.trim() || !content.trim()}
              className={`w-full py-2 rounded text-sm font-medium transition-colors ${
                kakaoSent
                  ? 'bg-navy text-white cursor-default'
                  : kakaoSending
                  ? 'bg-warn-soft text-warn cursor-wait'
                  : 'bg-warn text-white hover:opacity-90 disabled:opacity-40'
              }`}
            >
              {kakaoSent ? '✓ 전송 완료' : kakaoSending ? '전송 중...' : '카카오톡 전송하기'}
            </button>
          )}
        </div>

        {error && (
          <div data-testid="notice-error" className="bg-danger-soft border border-line rounded p-4">
            <p className="text-sm text-danger font-medium">
              공지 등록에 실패했습니다. 입력한 내용은 그대로 두었으니 다시 시도해 주세요.
            </p>
            <p className="text-xs text-danger mt-1">사유: {error}</p>
          </div>
        )}

        <Button type="submit" disabled={!title.trim() || !content.trim() || selectedClasses.length === 0 || submitting} className="w-full">
          {submitting ? '저장 중...' : '공지 저장'}
        </Button>
      </form>
    </div>
  )
}
