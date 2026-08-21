// src/pages/QnA.jsx
// 질문은 말머리 하나만 붙여서 받는다.
// 예전에는 테스트를 고르고 문항까지 골라야 했는데, 그러면
// (1) 과제 관련 질문은 낼 방법이 없고
// (2) 종료된 테스트가 하나도 없으면 질문 자체를 못 했다.
import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import Layout from '../components/Layout'
import PageTitle from '../components/ui/PageTitle'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Alert from '../components/ui/Alert'
import { visibleQuestions, unansweredCount } from '../utils/qnaAccess'
import { QNA_CATEGORIES, QNA_CATEGORY, qnaCategoryLabel } from '../constants/qna'

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
  const { qnaList, students, classes, addQuestion, answerQuestion } = useData()
  const [view, setView]                         = useState('list') // list | detail | ask
  const [selectedQuestion, setSelectedQuestion] = useState(null)
  const [filterCategory, setFilterCategory]     = useState('all')

  const isTeacherOrAdmin = user.role === 'teacher' || user.role === 'admin'

  // 볼 수 있는 질문 (규칙은 utils/qnaAccess에 모아뒀다)
  const myQuestions = visibleQuestions(qnaList, students, classes, user)
  const filteredQuestions = myQuestions.filter(
    (q) => filterCategory === 'all' || q.category === filterCategory
  )
  const unanswered = unansweredCount(qnaList, students, classes, user)

  // 이름 표시 규칙: 교사/관리자→실명, 학생→본인은 "나" 나머지는 "익명"
  function displayName(studentId) {
    if (isTeacherOrAdmin) {
      return students.find((s) => s.id === studentId)?.name ?? '알 수 없음'
    }
    return user.studentId === studentId ? '나' : '익명'
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
                onClick={() => { setSelectedQuestion(q); setView('detail') }}
                className="bg-surface border border-line rounded p-4 cursor-pointer hover:bg-surface-alt transition-colors"
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs bg-surface-alt text-ink-soft px-2 py-0.5 rounded-sm font-medium">
                    {qnaCategoryLabel(q.category)}
                  </span>
                  {q.answer ? (
                    <Badge tone="navy" className="shrink-0 ml-2">답변 완료</Badge>
                  ) : (
                    <Badge tone="warn" className="shrink-0 ml-2">답변 대기</Badge>
                  )}
                </div>
                <p className="text-sm text-ink font-medium line-clamp-2">{q.content}</p>
                <p className="text-xs text-ink-faint mt-1">
                  {displayName(q.studentId)} · {q.createdAt?.slice(0, 10)}
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
    return (
      <Layout>
      <DetailView
        question={selectedQuestion}
        displayName={displayName}
        isTeacherOrAdmin={isTeacherOrAdmin}
        onAnswer={async (answer) => {
          await answerQuestion(selectedQuestion.id, answer, user.id)
          setView('list')
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
function DetailView({ question, displayName, isTeacherOrAdmin, onAnswer, onBack }) {
  const [answerText, setAnswerText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleAnswer() {
    if (!answerText.trim() || submitting) return
    setSubmitting(true)
    await onAnswer(answerText.trim())
    setSubmitting(false)
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
        <p className="text-xs text-ink-faint">
          {displayName(question.studentId)} · {question.createdAt?.slice(0, 16).replace('T', ' ')}
        </p>
      </div>

      {/* 답변 영역 */}
      {question.answer ? (
        <Alert tone="info">
          <p className="text-xs font-semibold text-navy mb-2">선생님 답변</p>
          <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap font-normal">{question.answer}</p>
          {/* Alert(info)의 남색 배경 위라 ink-faint는 2.66:1까지 떨어진다 */}
          <p className="text-xs text-ink-mute mt-3 font-normal">
            {question.answeredAt?.slice(0, 16).replace('T', ' ')}
          </p>
        </Alert>
      ) : isTeacherOrAdmin ? (
        <div className="bg-surface border border-line rounded p-5">
          <p className="text-sm font-semibold text-ink-soft mb-3">답변 작성</p>
          <textarea
            value={answerText}
            onChange={(e) => setAnswerText(e.target.value)}
            placeholder="답변을 입력하세요"
            rows={5}
            className="w-full border border-line rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy resize-none mb-3"
          />
          <Button onClick={handleAnswer} disabled={!answerText.trim() || submitting} className="w-full">
            {submitting ? '등록 중...' : '답변 등록'}
          </Button>
        </div>
      ) : (
        // 옅은 배경 위 안내문이라 ink-faint(2.94:1)로는 읽히지 않아 한 단계 진하게 쓴다
        <div className="bg-surface-alt rounded p-6 text-center">
          <p className="text-sm text-ink-mute">아직 답변이 등록되지 않았습니다.</p>
          <p className="text-xs text-ink-mute mt-1">선생님이 곧 답변 드릴 예정입니다.</p>
        </div>
      )}
    </div>
  )
}

// ────────── AskView 컴포넌트 ──────────
function AskView({ studentId, onSubmit, onBack }) {
  const [category,   setCategory]   = useState(QNA_CATEGORY.NAESIN)
  const [content,    setContent]    = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error,      setError]      = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!content.trim() || submitting) return
    setSubmitting(true)
    setError('')
    const failed = await onSubmit({ category, content: content.trim() })
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

        <p className="text-xs text-ink-faint -mt-2">
          * 질문은 선생님에게만 실명으로 표시됩니다.
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
