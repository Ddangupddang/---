// src/pages/QnA.jsx
// 질문은 말머리 하나만 붙여서 받는다.
// 예전에는 테스트를 고르고 문항까지 골라야 했는데, 그러면
// (1) 과제 관련 질문은 낼 방법이 없고
// (2) 종료된 테스트가 하나도 없으면 질문 자체를 못 했다.
import { useState, useEffect } from 'react'
import { Camera } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import Layout from '../components/Layout'
import PageTitle from '../components/ui/PageTitle'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Alert from '../components/ui/Alert'
import PushToggle from '../components/PushToggle'
import {
  visibleQuestions, unansweredCount, canDeleteQuestion,
  qnaStatus, canDeleteMessage, canEditMessage,
} from '../utils/qnaAccess'
import { QNA_CATEGORIES, QNA_CATEGORY, qnaCategoryLabel } from '../constants/qna'
import QnaImagePicker from '../components/qna/QnaImagePicker'
import { MAX_QNA_IMAGES } from '../utils/qnaImage'
import { formatDate, formatDateTime } from '../utils/datetime'

// 말머리 알약 — 목록 필터와 작성 화면이 같은 모양을 쓴다
function Pill({ active, children, ...rest }) {
  return (
    <button
      type="button"
      className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
        active ? 'bg-ink text-white' : 'bg-surface-alt text-ink-soft hover:bg-line-soft'
      }`}
      {...rest}
    >
      {children}
    </button>
  )
}

export default function QnA() {
  const { user } = useAuth()
  const {
    qnaList, students, classes,
    addQuestion, deleteQuestion, uploadQnaImage, qnaImageUrl,
    qnaMessages, addQnaMessage, updateQnaMessage, deleteQnaMessage,
  } = useData()
  const [view, setView]                         = useState('list') // list | detail | ask
  // 질문 자체가 아니라 id를 들고 있는다. 스냅샷을 들고 있으면 답변을 고쳐도
  // 화면이 옛 내용 그대로 남는다.
  const [selectedId,       setSelectedId]       = useState(null)
  const [filterCategory, setFilterCategory]     = useState('all')

  const isTeacherOrAdmin = user.role === 'teacher' || user.role === 'admin'

  // 볼 수 있는 질문 (규칙은 utils/qnaAccess에 모아뒀다)
  const myQuestions = visibleQuestions(qnaList, students, classes, user)
  const filteredQuestions = myQuestions.filter(
    (q) => filterCategory === 'all' || q.category === filterCategory
  )
  const unanswered = unansweredCount(qnaList, students, classes, user, qnaMessages)

  // 이름 표시 규칙: 교사/관리자→실명, 학생→본인 질문뿐이므로 "나"
  function displayName(studentId) {
    if (isTeacherOrAdmin) {
      return students.find((s) => s.id === studentId)?.name ?? '알 수 없음'
    }
    // 학생 화면에는 본인 질문만 내려온다(qnaAccess). 그래도 남의 행이 섞여 들어오면
    // 이름 대신 "비공개"를 보여준다 — 실명이 새는 것보다 낫다.
    return user.studentId === studentId ? '나' : '비공개'
  }

  // ────────── list 뷰 ──────────
  if (view === 'list') {
    return (
      <Layout>
      <div>
        <div className="flex justify-between items-start">
          <PageTitle title="Q&A" />
          {user.role === 'student' && (
            <Button onClick={() => setView('ask')}>+ 질문하기</Button>
          )}
        </div>
        {/* 교사에게 급함을 알리는 신호라 PageTitle의 lead(고정 회색)로는 표현할 수 없어 직접 그린다 */}
        {isTeacherOrAdmin && unanswered > 0 && (
          <p className="text-sm text-danger mb-4">미답변 {unanswered}건</p>
        )}

        {/* 교사·관리자에게만 보인다 (컴포넌트 안에서 역할을 본다) */}
        <PushToggle />


        {/* 말머리 필터 */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          <Pill active={filterCategory === 'all'} onClick={() => setFilterCategory('all')}>
            전체
          </Pill>
          {QNA_CATEGORIES.map((c) => (
            <Pill
              key={c}
              active={filterCategory === c}
              onClick={() => setFilterCategory(c)}
              data-testid={`filter-${c}`}
            >
              {qnaCategoryLabel(c)}
            </Pill>
          ))}
        </div>

        {/* 질문 목록 */}
        {filteredQuestions.length === 0 ? (
          <p className="text-center text-ink-faint py-12">질문이 없습니다.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {filteredQuestions.map((q) => (
              <div
                key={q.id}
                data-testid={`question-${q.id}`}
                onClick={() => { setSelectedId(q.id); setView('detail') }}
                className="bg-surface border border-line rounded p-4 cursor-pointer hover:bg-surface-alt transition-colors"
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs bg-surface-alt text-ink-soft px-2 py-0.5 rounded-sm font-medium">
                    {qnaCategoryLabel(q.category)}
                  </span>
                  {qnaStatus(q, qnaMessages) === 'answered' ? (
                    <Badge tone="navy" className="shrink-0 ml-2">답변 완료</Badge>
                  ) : (
                    <Badge tone="warn" className="shrink-0 ml-2">답변 대기</Badge>
                  )}
                </div>
                <p className="text-sm text-ink font-medium line-clamp-2">{q.content}</p>
                <p className="text-xs text-ink-faint mt-1 flex items-center gap-1">
                  {displayName(q.studentId)} · {formatDate(q.createdAt)}
                  {q.imagePaths?.length > 0 && (
                    <span
                      data-testid={`photo-mark-${q.id}`}
                      className="inline-flex items-center gap-0.5 ml-1"
                      title={`사진 ${q.imagePaths.length}장`}
                    >
                      <Camera size={12} aria-hidden="true" />
                      {q.imagePaths.length}
                    </span>
                  )}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
      </Layout>
    )
  }

  // ────────── detail 뷰 ──────────
  if (view === 'detail') {
    const selectedQuestion = myQuestions.find((q) => q.id === selectedId)
    // 지워졌거나 더 이상 보이지 않는 질문이면 목록으로 돌려보낸다
    if (!selectedQuestion) { setView('list'); return null }

    return (
      <Layout>
      <DetailView
        question={selectedQuestion}
        displayName={displayName}
        qnaImageUrl={qnaImageUrl}
        canDelete={canDeleteQuestion(selectedQuestion, students, classes, user)}
        onDelete={async () => {
          const res = await deleteQuestion(selectedQuestion.id, selectedQuestion.imagePaths ?? [])
          // 실패했는데 목록으로 넘기면 지워진 줄 알고 지나간다 — 새로고침하면 되살아난다
          if (res?.error) return res.error
          setView('list')
          return null
        }}
        messages={qnaMessages
          .filter((m) => m.qnaId === selectedQuestion.id)
          .sort((a, b) => a.createdAt.localeCompare(b.createdAt))}
        canDeleteMessageOf={(m) => canDeleteMessage(m, selectedQuestion, students, classes, user)}
        canEditMessageOf={(m) => canEditMessage(m, user)}
        onSendMessage={async ({ content, photos }) => {
          // 사진부터 올린다. 한 장이라도 실패하면 글을 등록하지 않는다 —
          // "사진 보고 답해 주세요"라고 쓴 글만 올라가면 소용이 없다.
          const imagePaths = []
          for (const { file } of photos) {
            const path = await uploadQnaImage(file, selectedQuestion.studentId)
            if (!path) return '사진을 올리지 못했습니다. 잠시 후 다시 시도해 주세요.'
            imagePaths.push(path)
          }
          const res = await addQnaMessage({
            qnaId:      selectedQuestion.id,
            authorId:   user.id,
            authorRole: isTeacherOrAdmin ? 'teacher' : 'student',
            content,
            imagePaths,
          })
          return res?.error ?? null
        }}
        onUpdateMessage={async (m, content) => {
          const res = await updateQnaMessage(m.id, content)
          return res?.error ?? null
        }}
        onDeleteMessage={async (m) => {
          const res = await deleteQnaMessage(m.id, m.imagePaths ?? [])
          return res?.error ?? null
        }}
        onBack={() => setView('list')}
      />
      </Layout>
    )
  }

  // ────────── ask 뷰 (학생 질문 작성) ──────────
  if (view === 'ask') {
    if (user.role !== 'student') { setView('list'); return null }
    return (
      <Layout>
      <AskView
        studentId={user.studentId}
        uploadQnaImage={uploadQnaImage}
        onSubmit={async (newQ) => {
          const res = await addQuestion({ ...newQ, studentId: user.studentId })
          // 실패했는데 목록으로 넘기면 올라간 줄 알고 지나간다 — 작성 화면에 머문다
          if (res?.error) return res.error
          setView('list')
          return null
        }}
        onBack={() => setView('list')}
      />
      </Layout>
    )
  }

  return null
}

// ────────── DetailView 컴포넌트 ──────────
function DetailView({
  question, displayName, qnaImageUrl, canDelete, messages,
  canDeleteMessageOf, canEditMessageOf,
  onDelete, onSendMessage, onUpdateMessage, onDeleteMessage, onBack,
}) {
  // 질문 삭제 — 사진까지 함께 사라지는 동작이라 한 번 물어본다
  const [confirming,   setConfirming]   = useState(false)
  const [deleting,     setDeleting]     = useState(false)
  const [deleteError,  setDeleteError]  = useState('')

  // 대화 글쓰기
  const [draft,        setDraft]        = useState('')
  const [draftPhotos,  setDraftPhotos]  = useState([])
  const [photoError,   setPhotoError]   = useState('')
  const [messageError, setMessageError] = useState('')
  const [messageBusy,  setMessageBusy]  = useState(false)
  const [confirmingMessage, setConfirmingMessage] = useState(null)
  const [editingId,    setEditingId]    = useState(null)
  const [editText,     setEditText]     = useState('')

  async function handleSend() {
    if (!draft.trim() || messageBusy) return
    setMessageBusy(true)
    setMessageError('')
    const failed = await onSendMessage({ content: draft.trim(), photos: draftPhotos })
    if (failed) setMessageError(failed)
    else { setDraft(''); setDraftPhotos([]) }
    setMessageBusy(false)
  }

  async function handleEditSave(m) {
    if (!editText.trim() || messageBusy) return
    setMessageBusy(true)
    setMessageError('')
    const failed = await onUpdateMessage(m, editText.trim())
    if (failed) setMessageError(failed)
    else setEditingId(null)
    setMessageBusy(false)
  }

  async function handleDeleteMessage() {
    if (messageBusy) return
    setMessageBusy(true)
    const failed = await onDeleteMessage(confirmingMessage)
    if (failed) setMessageError(failed)
    setConfirmingMessage(null)
    setMessageBusy(false)
  }

  async function handleDelete() {
    if (deleting) return
    setDeleting(true)
    setDeleteError('')
    const failed = await onDelete()
    if (failed) { setDeleteError(failed); setConfirming(false) }
    setDeleting(false)
  }

  return (
    <div>
      <button onClick={onBack} className="text-sm text-ink-mute hover:text-ink-soft mb-2 block">
        ← 목록
      </button>
      <PageTitle title="Q&A" />

      {/* 질문 카드 */}
      <div className="bg-surface border border-line rounded p-5 mb-4">
        <span className="text-xs bg-surface-alt text-ink-soft px-2 py-0.5 rounded-sm font-medium">
          {qnaCategoryLabel(question.category)}
        </span>
        <p className="text-ink leading-relaxed mb-3 mt-3">{question.content}</p>
        <QuestionPhotos paths={question.imagePaths} qnaImageUrl={qnaImageUrl} />
        <p className="text-xs text-ink-faint">
          {displayName(question.studentId)} · {formatDateTime(question.createdAt)}
        </p>
      </div>

      {/* 대화 — 첫 질문 다음에 오간 글들 */}
      <div className="flex flex-col gap-3 mb-4">
        {messages.map((m) => (
          <div
            key={m.id}
            data-testid={`message-${m.id}`}
            className={m.authorRole === 'teacher'
              ? 'bg-navy-soft border border-line rounded p-4'
              : 'bg-surface border border-line rounded p-4'}
          >
            <div className="flex justify-between items-start mb-2">
              <p className="text-xs font-semibold text-ink-soft">
                {m.authorRole === 'teacher' ? '선생님' : displayName(question.studentId)}
              </p>
              <div className="flex gap-2 shrink-0">
                {/* 고치는 건 본인 글만. 남이 한 말을 고쳐 쓰면 학생이 하지 않은 말이
                    학생 이름으로 남는다. 문제가 있는 글은 지우면 된다. */}
                {canEditMessageOf(m) && editingId !== m.id && (
                  <button
                    type="button"
                    data-testid={`message-edit-${m.id}`}
                    onClick={() => { setEditingId(m.id); setEditText(m.content); setMessageError('') }}
                    className="text-xs text-ink-faint hover:text-ink-soft transition-colors"
                  >
                    수정
                  </button>
                )}
                {canDeleteMessageOf(m) && (
                  <button
                    type="button"
                    data-testid={`message-delete-${m.id}`}
                    onClick={() => setConfirmingMessage(m)}
                    className="text-xs text-ink-faint hover:text-danger transition-colors"
                  >
                    삭제
                  </button>
                )}
              </div>
            </div>

            {editingId === m.id ? (
              <div>
                <textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  rows={4}
                  className="w-full border border-line rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy resize-none mb-2"
                />
                <div className="flex gap-2">
                  <Button onClick={() => handleEditSave(m)} disabled={!editText.trim() || messageBusy} className="flex-1">
                    {messageBusy ? '저장 중...' : '수정 저장'}
                  </Button>
                  <button
                    type="button"
                    onClick={() => { setEditingId(null); setMessageError('') }}
                    disabled={messageBusy}
                    className="text-sm border border-line rounded px-4 hover:bg-surface-alt transition-colors"
                  >
                    취소
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap">{m.content}</p>
            )}

            {/* 사진은 수정 대상이 아니다. 바꾸려면 글을 지우고 다시 쓴다 —
                수정 중에 사진까지 갈아 끼우게 만들면 중간에 실패했을 때
                글과 사진이 어긋난 상태로 남는다. */}
            <QuestionPhotos paths={m.imagePaths} qnaImageUrl={qnaImageUrl} />
            <p className="text-xs text-ink-mute mt-2">{formatDateTime(m.createdAt)}</p>
          </div>
        ))}
      </div>

      {/* 글 삭제 확인 */}
      {confirmingMessage && (
        <div className="border border-line rounded p-3 mb-4 flex items-center gap-2">
          <p className="text-sm text-ink-soft flex-1">
            이 글을 삭제할까요?
            {confirmingMessage.imagePaths?.length > 0 && ' 붙은 사진도 함께 지워집니다.'}
          </p>
          <button
            type="button"
            data-testid="message-delete-confirm"
            onClick={handleDeleteMessage}
            disabled={messageBusy}
            className="shrink-0 text-xs bg-danger text-white rounded px-3 py-2"
          >
            {messageBusy ? '삭제 중...' : '삭제'}
          </button>
          <button
            type="button"
            onClick={() => setConfirmingMessage(null)}
            disabled={messageBusy}
            className="shrink-0 text-xs border border-line rounded px-3 py-2 hover:bg-surface-alt transition-colors"
          >
            취소
          </button>
        </div>
      )}

      {/* 글쓰기 — 학생·교사가 같은 칸을 쓴다 */}
      <div className="bg-surface border border-line rounded p-4">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="이어서 쓸 내용을 입력하세요"
          rows={3}
          className="w-full border border-line rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy resize-none mb-3"
        />
        <QnaImagePicker
          photos={draftPhotos}
          onChange={setDraftPhotos}
          error={photoError}
          onError={setPhotoError}
        />
        {messageError && (
          <p data-testid="message-error" className="text-xs text-danger mt-2">
            등록하지 못했습니다. 사유: {messageError}
          </p>
        )}
        <Button onClick={handleSend} disabled={!draft.trim() || messageBusy} className="w-full mt-3">
          {messageBusy ? '등록 중...' : '등록'}
        </Button>
      </div>

      {/* 삭제 — 권한이 있는 사람에게만 보인다 */}
      {canDelete && (
        <div className="mt-6 pt-4 border-t border-line">
          {confirming ? (
            <div>
              <p className="text-sm text-ink-soft mb-3">
                이 질문을 삭제할까요?
                {question.imagePaths?.length > 0 && ' 첨부한 사진도 함께 지워집니다.'}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  data-testid="delete-confirm"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="text-xs bg-danger text-white rounded px-3 py-2"
                >
                  {deleting ? '삭제 중...' : '삭제'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  disabled={deleting}
                  className="text-xs border border-line rounded px-3 py-2 hover:bg-surface-alt transition-colors"
                >
                  취소
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => { setConfirming(true); setDeleteError('') }}
              className="text-xs text-danger hover:underline"
            >
              질문 삭제
            </button>
          )}

          {deleteError && (
            <p data-testid="delete-error" className="text-xs text-danger mt-2">
              삭제하지 못했습니다. 사유: {deleteError}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ────────── 질문에 붙은 사진 ──────────
// qna-images는 비공개 버킷이라 주소가 고정돼 있지 않다.
// 볼 때마다 1시간짜리 임시 주소를 받아서 건다.
function QuestionPhotos({ paths, qnaImageUrl }) {
  const [urls, setUrls] = useState([])

  useEffect(() => {
    // 사진이 없으면 아래에서 아무것도 그리지 않는다. urls는 빈 채로 둔다.
    if (!paths?.length || !qnaImageUrl) return
    let alive = true
    Promise.all(paths.map((p) => qnaImageUrl(p)))
      .then((got) => { if (alive) setUrls(got) })
    // 화면을 떠난 뒤에 응답이 와서 setState하면 경고가 뜬다
    return () => { alive = false }
  }, [paths, qnaImageUrl])

  if (!paths?.length) return null

  return (
    <div className="flex flex-col gap-2 mb-3">
      {urls.map((url, i) => (
        url ? (
          // 원본은 새 탭에서 크게 본다 — 답안지 글씨를 확대해야 할 때가 있다
          <a key={paths[i]} href={url} target="_blank" rel="noreferrer">
            <img
              data-testid={`detail-photo-${i}`}
              src={url}
              alt={`첨부 사진 ${i + 1}`}
              className="w-full rounded border border-line"
            />
          </a>
        ) : (
          <p key={paths[i]} className="text-xs text-ink-mute">
            사진을 불러오지 못했습니다.
          </p>
        )
      ))}
    </div>
  )
}

// ────────── AskView 컴포넌트 ──────────
function AskView({ studentId, uploadQnaImage, onSubmit, onBack }) {
  const [category,   setCategory]   = useState(QNA_CATEGORY.NAESIN)
  const [content,    setContent]    = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error,      setError]      = useState('')
  // 고른 사진 [{ file, preview }] — 실제 업로드는 등록을 누를 때 한다.
  // 고를 때마다 올리면 뺐다 넣었다 한 사진이 스토리지에 쓰레기로 남는다.
  const [photos,     setPhotos]     = useState([])
  const [photoError, setPhotoError] = useState('')
  async function handleSubmit(e) {
    e.preventDefault()
    if (!content.trim() || submitting) return
    setSubmitting(true)
    setError('')

    // 사진부터 올린다. 한 장이라도 실패하면 질문을 등록하지 않는다 —
    // "사진 보고 답해 주세요"라고 쓴 질문만 올라가면 학생은 답을 못 받는다.
    const imagePaths = []
    for (const { file } of photos) {
      const path = await uploadQnaImage(file, studentId)
      if (!path) {
        setError('사진을 올리지 못했습니다. 잠시 후 다시 시도해 주세요.')
        setSubmitting(false)
        return
      }
      imagePaths.push(path)
    }

    const failed = await onSubmit({ category, content: content.trim(), imagePaths })
    if (failed) setError(failed)
    setSubmitting(false)
  }

  // 계정에 학생 정보가 안 붙어 있으면 등록이 반드시 실패한다 — 미리 알린다
  if (!studentId) {
    return (
      <div>
        <button onClick={onBack} className="text-sm text-ink-mute hover:text-ink-soft mb-2 block">
          ← 목록
        </button>
        <PageTitle title="질문하기" />
        <Alert tone="danger">
          이 계정에 학생 정보가 연결되어 있지 않아 질문을 등록할 수 없습니다.
          관리자에게 계정 확인을 요청해 주세요.
        </Alert>
      </div>
    )
  }

  return (
    <div>
      <button onClick={onBack} className="text-sm text-ink-mute hover:text-ink-soft mb-2 block">
        ← 목록
      </button>
      <PageTitle title="질문하기" />

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* 말머리 */}
        <div>
          <label className="block text-sm font-medium text-ink-soft mb-2">말머리</label>
          <div className="flex gap-2 flex-wrap">
            {QNA_CATEGORIES.map((c) => (
              <Pill
                key={c}
                active={category === c}
                onClick={() => setCategory(c)}
                data-testid={`pick-${c}`}
                aria-pressed={category === c}
              >
                {qnaCategoryLabel(c)}
              </Pill>
            ))}
          </div>
        </div>

        {/* 질문 내용 */}
        <div>
          <label className="block text-sm font-medium text-ink-soft mb-1">질문 내용</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="궁금한 점을 자유롭게 입력하세요"
            rows={5}
            className="w-full border border-line rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy resize-none"
            required
          />
        </div>

        {/* 사진 첨부 */}
        <div>
          <label className="block text-sm font-medium text-ink-soft mb-2">
            사진 첨부 <span className="text-ink-faint font-normal">(최대 {MAX_QNA_IMAGES}장, 선택)</span>
          </label>
          <QnaImagePicker
            photos={photos}
            onChange={setPhotos}
            error={photoError}
            onError={setPhotoError}
          />
        </div>

        <p className="text-xs text-ink-faint -mt-2">
          * 질문은 담당 선생님만 볼 수 있습니다. 다른 학생에게는 보이지 않습니다.
        </p>


        {/* Alert는 임의 props를 전달하지 않으므로 data-testid는 감싸는 div에 둔다 */}
        {error && (
          <div data-testid="ask-error">
            <Alert tone="danger">
              질문 등록에 실패했습니다. 입력한 내용은 그대로 두었으니 다시 시도해 주세요.
              <span className="block mt-1 text-xs font-normal">사유: {error}</span>
            </Alert>
          </div>
        )}

        <Button type="submit" disabled={!content.trim() || submitting} className="w-full">
          {submitting ? '등록 중...' : '질문 등록'}
        </Button>
      </form>
    </div>
  )
}
