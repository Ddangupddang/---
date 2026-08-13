// src/pages/QnA.jsx
import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import Layout from '../components/Layout'
import PageTitle from '../components/ui/PageTitle'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Alert from '../components/ui/Alert'

export default function QnA() {
  const { user } = useAuth()
  const { qnaList, students, tests, addQuestion, answerQuestion } = useData()
  const [view, setView]                         = useState('list') // list | detail | ask
  const [selectedQuestion, setSelectedQuestion] = useState(null)
  const [filterTestId, setFilterTestId]         = useState('all')

  const isTeacherOrAdmin = user.role === 'teacher' || user.role === 'admin'

  // 학생은 본인 반 테스트만, 교사/관리자는 전체
  const accessibleTests =
    user.role === 'student'
      ? tests.filter((t) => t.classId === user.classId && t.status === 'closed')
      : tests

  // 질문 목록 필터링
  const filteredQuestions = qnaList.filter((q) => {
    const testMatch   = filterTestId === 'all' || q.testId === Number(filterTestId)
    const accessMatch =
      user.role !== 'student' || accessibleTests.some((t) => t.id === q.testId)
    return testMatch && accessMatch
  })

  // 미답변 건수 (교사용 배지)
  const unansweredCount = qnaList.filter(
    (q) =>
      !q.answer &&
      (user.role !== 'student' || accessibleTests.some((t) => t.id === q.testId))
  ).length

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
        <div className="flex justify-between items-start mb-4">
          <PageTitle
            title="Q&A"
            lead={isTeacherOrAdmin && unansweredCount > 0 ? `미답변 ${unansweredCount}건` : undefined}
          />
          {user.role === 'student' && (
            <Button onClick={() => setView('ask')}>+ 질문하기</Button>
          )}
        </div>

        {/* 테스트 필터 탭 */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          <button
            onClick={() => setFilterTestId('all')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              filterTestId === 'all'
                ? 'bg-ink text-white'
                : 'bg-surface-alt text-ink-soft hover:bg-line-soft'
            }`}
          >
            전체
          </button>
          {accessibleTests.map((t) => (
            <button
              key={t.id}
              onClick={() => setFilterTestId(String(t.id))}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                filterTestId === String(t.id)
                  ? 'bg-ink text-white'
                  : 'bg-surface-alt text-ink-soft hover:bg-line-soft'
              }`}
            >
              {t.title}
            </button>
          ))}
        </div>

        {/* 질문 목록 */}
        {filteredQuestions.length === 0 ? (
          <p className="text-center text-ink-faint py-12">질문이 없습니다.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {filteredQuestions.map((q) => {
              const test        = tests.find((t) => t.id === q.testId)
              const questionInfo = q.questionId
                ? test?.questions.find((tq) => tq.id === q.questionId)
                : null
              const qIdx = questionInfo ? test.questions.indexOf(questionInfo) : -1

              return (
                <div
                  key={q.id}
                  onClick={() => {
                    setSelectedQuestion(q)
                    setView('detail')
                  }}
                  className="bg-surface border border-line rounded p-4 cursor-pointer hover:bg-surface-alt transition-colors"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex gap-2 items-center flex-wrap">
                      <span className="text-xs text-ink-faint">{test?.title}</span>
                      {qIdx >= 0 && (
                        <span className="text-xs bg-surface-alt text-ink-mute px-2 py-0.5 rounded-full">
                          {qIdx + 1}번 문항
                        </span>
                      )}
                    </div>
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
    const q     = selectedQuestion
    const test  = tests.find((t) => t.id === q.testId)
    const qInfo = q.questionId ? test?.questions.find((tq) => tq.id === q.questionId) : null
    const qIdx  = qInfo ? test.questions.indexOf(qInfo) : -1

    return (
      <Layout>
      <DetailView
        question={q}
        test={test}
        questionIndex={qIdx}
        displayName={displayName}
        isTeacherOrAdmin={isTeacherOrAdmin}
        onAnswer={async (answer) => {
          await answerQuestion(q.id, answer, user.id)
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
        tests={accessibleTests}
        onSubmit={async (newQ) => {
          await addQuestion({ ...newQ, studentId: user.studentId })
          setView('list')
        }}
        onBack={() => setView('list')}
      />
      </Layout>
    )
  }

  return null
}

// ────────── DetailView 컴포넌트 ──────────
function DetailView({ question, test, questionIndex, displayName, isTeacherOrAdmin, onAnswer, onBack }) {
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
        <div className="flex gap-2 items-center mb-3 flex-wrap">
          <span className="text-xs text-ink-faint">{test?.title}</span>
          {questionIndex >= 0 && (
            <span className="text-xs bg-surface-alt text-ink-mute px-2 py-0.5 rounded-full">
              {questionIndex + 1}번 문항
            </span>
          )}
        </div>
        <p className="text-ink leading-relaxed mb-3">{question.content}</p>
        <p className="text-xs text-ink-faint">
          {displayName(question.studentId)} · {question.createdAt?.slice(0, 16).replace('T', ' ')}
        </p>
      </div>

      {/* 답변 영역 */}
      {question.answer ? (
        <Alert tone="info">
          <p className="text-xs font-semibold text-navy mb-2">선생님 답변</p>
          <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap font-normal">{question.answer}</p>
          <p className="text-xs text-ink-faint mt-3 font-normal">
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
        <div className="bg-surface-alt rounded p-6 text-center">
          <p className="text-sm text-ink-faint">아직 답변이 등록되지 않았습니다.</p>
          <p className="text-xs text-ink-faint mt-1">선생님이 곧 답변 드릴 예정입니다.</p>
        </div>
      )}
    </div>
  )
}

// ────────── AskView 컴포넌트 ──────────
function AskView({ tests, onSubmit, onBack }) {
  const [testId,     setTestId]     = useState(String(tests[0]?.id ?? ''))
  const [questionId, setQuestionId] = useState('')
  const [content,    setContent]    = useState('')
  const [submitting, setSubmitting] = useState(false)

  const selectedTest = tests.find((t) => t.id === Number(testId))

  async function handleSubmit(e) {
    e.preventDefault()
    if (!content.trim() || !testId || submitting) return
    setSubmitting(true)
    await onSubmit({
      testId:     Number(testId),
      questionId: questionId ? Number(questionId) : null,
      content:    content.trim(),
    })
    setSubmitting(false)
  }

  return (
    <div>
      <button onClick={onBack} className="text-sm text-ink-mute hover:text-ink-soft mb-2 block">
        ← 목록
      </button>
      <PageTitle title="질문하기" />

      {tests.length === 0 ? (
        <p className="text-center text-ink-faint py-12">
          종료된 테스트가 없습니다.
          <br />
          <span className="text-xs">테스트가 종료된 후 질문할 수 있습니다.</span>
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* 테스트 선택 */}
          <div>
            <label className="block text-sm font-medium text-ink-soft mb-1">관련 테스트</label>
            <select
              value={testId}
              onChange={(e) => { setTestId(e.target.value); setQuestionId('') }}
              className="w-full border border-line rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy"
            >
              {tests.map((t) => (
                <option key={t.id} value={String(t.id)}>{t.title}</option>
              ))}
            </select>
          </div>

          {/* 문항 선택 */}
          {selectedTest && (
            <div>
              <label className="block text-sm font-medium text-ink-soft mb-1">
                관련 문항 <span className="text-ink-faint font-normal">(선택)</span>
              </label>
              <select
                value={questionId}
                onChange={(e) => setQuestionId(e.target.value)}
                className="w-full border border-line rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy"
              >
                <option value="">테스트 전체 관련</option>
                {selectedTest.questions.map((q, idx) => (
                  <option key={q.id} value={String(q.id)}>
                    {idx + 1}번{q.content ? ` — ${q.content}` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

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

          <Button type="submit" disabled={!content.trim() || submitting} className="w-full">
            {submitting ? '등록 중...' : '질문 등록'}
          </Button>
        </form>
      )}
    </div>
  )
}
