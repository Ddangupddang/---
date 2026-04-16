// src/pages/Notices.jsx
import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { notices as initialNotices } from '../data/notices'
import { useData } from '../context/DataContext'
import { users } from '../data/users'
import Layout from '../components/Layout'

export default function Notices() {
  const { user } = useAuth()
  const { classes } = useData()
  const [notices, setNotices]   = useState(initialNotices)
  const [view, setView]         = useState('list') // list | detail | create
  const [selected, setSelected] = useState(null)

  const isTeacherOrAdmin = user.role === 'teacher' || user.role === 'admin'

  // 학생은 본인 반 또는 전체(targetClassIds 비어있거나 본인 반 포함) 공지만
  const visibleNotices = notices
    .filter((n) =>
      user.role !== 'student' ||
      n.targetClassIds.length === 0 ||
      n.targetClassIds.includes(user.classId)
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  // ────────── list 뷰 ──────────
  if (view === 'list') {
    return (
      <Layout>
      <div>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-bold text-[#2B2B2B]">공지사항</h1>
          {isTeacherOrAdmin && (
            <button
              onClick={() => setView('create')}
              className="px-4 py-2 bg-[#2B2B2B] text-white rounded-lg text-sm"
            >
              + 공지 작성
            </button>
          )}
        </div>

        {visibleNotices.length === 0 ? (
          <p className="text-center text-gray-400 py-12">공지사항이 없습니다.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {visibleNotices.map((n) => {
              const author      = users.find((u) => u.id === n.authorId)
              const isAllClass  = n.targetClassIds.length === classes.length
              const targetLabel = isAllClass
                ? '전체'
                : n.targetClassIds
                    .map((id) => classes.find((c) => c.id === id)?.name)
                    .filter(Boolean)
                    .join(', ')

              return (
                <div
                  key={n.id}
                  onClick={() => { setSelected(n); setView('detail') }}
                  className="bg-white rounded-xl p-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start mb-1">
                    <p className="font-semibold text-[#2B2B2B] flex-1 pr-2">{n.title}</p>
                    {n.kakaoSent && (
                      <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full shrink-0">
                        카카오 전송
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 line-clamp-2 mb-2">{n.content}</p>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <span>{n.createdAt.slice(0, 10)}</span>
                    <span>·</span>
                    <span>{author?.name}</span>
                    <span>·</span>
                    <span>{targetLabel}</span>
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
    const author     = users.find((u) => u.id === n.authorId)
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
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setView('list')} className="text-sm text-gray-500 hover:text-gray-700">
            ← 목록
          </button>
          <h1 className="text-xl font-bold text-[#2B2B2B]">공지사항</h1>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm">
          <div className="flex justify-between items-start mb-3">
            <h2 className="text-lg font-bold text-[#2B2B2B] flex-1 pr-2">{n.title}</h2>
            {n.kakaoSent && (
              <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full shrink-0">
                카카오 전송
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-400 mb-4 pb-4 border-b border-gray-100">
            <span>{n.createdAt.slice(0, 10)}</span>
            <span>·</span>
            <span>{author?.name}</span>
            <span>·</span>
            <span>{targetLabel}</span>
          </div>
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{n.content}</p>
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
        onSubmit={(newNotice) => {
          setNotices([{ ...newNotice, id: notices.length + 1 }, ...notices])
          setView('list')
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
  const { classes } = useData()
  const [title,          setTitle]          = useState('')
  const [content,        setContent]        = useState('')
  const [selectedClasses, setSelectedClasses] = useState(classes.map((c) => c.id)) // 기본: 전체
  const [sendKakao,      setSendKakao]      = useState(false)
  const [kakaoSending,   setKakaoSending]   = useState(false)
  const [kakaoSent,      setKakaoSent]      = useState(false)

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

  function handleSubmit(e) {
    e.preventDefault()
    if (!title.trim() || !content.trim() || selectedClasses.length === 0) return
    onSubmit({
      title:          title.trim(),
      content:        content.trim(),
      authorId:       user.id,
      targetClassIds: selectedClasses,
      createdAt:      new Date().toISOString(),
      kakaoSent:      kakaoSent,
    })
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onCancel} className="text-sm text-gray-500 hover:text-gray-700">
          ← 목록
        </button>
        <h1 className="text-xl font-bold text-[#2B2B2B]">공지 작성</h1>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {/* 제목 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">제목</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="공지 제목을 입력하세요"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5B8FD4]"
            required
          />
        </div>

        {/* 내용 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">내용</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="공지 내용을 입력하세요"
            rows={6}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5B8FD4] resize-none"
            required
          />
        </div>

        {/* 대상 반 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">대상 반</label>
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
                  ? 'bg-[#2B2B2B] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
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
                    ? 'bg-[#5B8FD4] text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
          {selectedClasses.length === 0 && (
            <p className="text-xs text-[#C0392B] mt-1">대상 반을 하나 이상 선택해주세요.</p>
          )}
        </div>

        {/* 카카오톡 알림톡 전송 */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-sm font-medium text-gray-800">카카오톡 알림톡 전송</p>
              <p className="text-xs text-gray-500">학생/학부모에게 카카오톡으로 공지를 발송합니다.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={sendKakao}
                onChange={(e) => { setSendKakao(e.target.checked); setKakaoSent(false) }}
                className="sr-only"
              />
              <div className={`w-10 h-6 rounded-full transition-colors ${sendKakao ? 'bg-yellow-500' : 'bg-gray-300'}`}>
                <div className={`w-4 h-4 bg-white rounded-full m-1 transition-transform ${sendKakao ? 'translate-x-4' : ''}`} />
              </div>
            </label>
          </div>
          {sendKakao && (
            <button
              type="button"
              onClick={handleKakaoSend}
              disabled={kakaoSending || kakaoSent || !title.trim() || !content.trim()}
              className={`w-full py-2 rounded-lg text-sm font-medium transition-colors ${
                kakaoSent
                  ? 'bg-green-500 text-white cursor-default'
                  : kakaoSending
                  ? 'bg-yellow-300 text-yellow-800 cursor-wait'
                  : 'bg-yellow-500 text-white hover:bg-yellow-600 disabled:opacity-40'
              }`}
            >
              {kakaoSent ? '✓ 전송 완료' : kakaoSending ? '전송 중...' : '카카오톡 전송하기'}
            </button>
          )}
        </div>

        <button
          type="submit"
          disabled={!title.trim() || !content.trim() || selectedClasses.length === 0}
          className="w-full py-3 bg-[#2B2B2B] text-white rounded-xl font-medium disabled:opacity-40"
        >
          공지 저장
        </button>
      </form>
    </div>
  )
}
