// src/pages/QnA.jsx
import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { qnaQuestions as initialQna } from '../data/qna'
import { tests } from '../data/tests'
import { useData } from '../context/DataContext'
import Layout from '../components/Layout'

export default function QnA() {
  const { user } = useAuth()
  const { classes, students } = useData()
  const [questions, setQuestions] = useState(initialQna)
  const [view, setView]                       = useState('list') // list | detail | ask
  const [selectedQuestion, setSelectedQuestion] = useState(null)
  const [filterTestId, setFilterTestId]         = useState('all')

  const isTeacherOrAdmin = user.role === 'teacher' || user.role === 'admin'

  // 학생은 본인 반 테스트만, 교사/관리자는 전체
  const accessibleTests =
    user.role === 'student'
      ? tests.filter((t) => t.classId === user.classId && t.status === 'closed')
      : tests

  // 질문 목록 필터링
  const filteredQuestions = questions.filter((q) => {
    const testMatch   = filterTestId === 'all' || q.testId === Number(filterTestId)
    const accessMatch =
      user.role !== 'student' || accessibleTests.some((t) => t.id === q.testId)
    return testMatch && accessMatch
  })

  // 미답변 건수 (교사용 배지)
  const unansweredCount = questions.filter(
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
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-xl font-bold text-[#2B2B2B]">Q&A</h1>
            {isTeacherOrAdmin && unansweredCount > 0 && (
              <p className="text-xs text-[#C0392B] mt-0.5">미답변 {unansweredCount}건</p>
            )}
          </div>
          {user.role === 'student' && (
            <button
              onClick={() => setView('ask')}
              className="px-4 py-2 bg-[#2B2B2B] text-white rounded-lg text-sm"
            >
              + 질문하기
            </button>
          )}
        </div>

        {/* 테스트 필터 탭 */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          <button
            onClick={() => setFilterTestId('all')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              filterTestId === 'all'
                ? 'bg-[#2B2B2B] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
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
                  ? 'bg-[#2B2B2B] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {t.title}
            </button>
          ))}
        </div>

        {/* 질문 목록 */}
        {filteredQuestions.length === 0 ? (
          <p className="text-center text-gray-400 py-12">질문이 없습니다.</p>
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
                  className="bg-white rounded-xl p-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex gap-2 items-center flex-wrap">
                      <span className="text-xs text-gray-400">{test?.title}</span>
                      {qIdx >= 0 && (
                        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                          {qIdx + 1}번 문항
                        </span>
                      )}
                    </div>
                    {q.answer ? (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full shrink-0 ml-2">
                        답변 완료
                      </span>
                    ) : (
                      <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full shrink-0 ml-2">
                        답변 대기
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-[#2B2B2B] font-medium line-clamp-2">{q.content}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {displayName(q.studentId)} · {q.createdAt.slice(0, 10)}
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
    const q         = selectedQuestion
    const test      = tests.find((t) => t.id === q.testId)
    const qInfo     = q.questionId ? test?.questions.find((tq) => tq.id === q.questionId) : null
    const qIdx      = qInfo ? test.questions.indexOf(qInfo) : -1

    return (
      <Layout>
      <DetailView
        question={q}
        test={test}
        questionIndex={qIdx}
        displayName={displayName}
        isTeacherOrAdmin={isTeacherOrAdmin}
        onAnswer={(answer) => {
          setQuestions(
            questions.map((item) =>
              item.id === q.id
                ? { ...item, answer, answeredAt: new Date().toISOString(), answeredBy: user.id }
                : item
            )
          )
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
        onSubmit={(newQ) => {
          setQuestions([
            {
              ...newQ,
              id: questions.length + 1,
              studentId: user.studentId,
              createdAt: new Date().toISOString(),
              answer: null,
              answeredAt: null,
              answeredBy: null,
            },
            ...questions,
          ])
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

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="text-sm text-gray-500 hover:text-gray-700">
          ← 목록
        </button>
        <h1 className="text-xl font-bold text-[#2B2B2B]">Q&A</h1>
      </div>

      {/* 질문 카드 */}
      <div className="bg-white rounded-xl p-5 shadow-sm mb-4">
        <div className="flex gap-2 items-center mb-3 flex-wrap">
          <span className="text-xs text-gray-400">{test?.title}</span>
          {questionIndex >= 0 && (
            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
              {questionIndex + 1}번 문항
            </span>
          )}
        </div>
        <p className="text-[#2B2B2B] leading-relaxed mb-3">{question.content}</p>
        <p className="text-xs text-gray-400">
          {displayName(question.studentId)} · {question.createdAt.slice(0, 16).replace('T', ' ')}
        </p>
      </div>

      {/* 답변 영역 */}
      {question.answer ? (
        <div className="bg-[#5B8FD4]/10 border-l-4 border-[#5B8FD4] rounded-xl p-5">
          <p className="text-xs font-semibold text-[#5B8FD4] mb-2">선생님 답변</p>
          <p className="text-sm text-[#2B2B2B] leading-relaxed whitespace-pre-wrap">{question.answer}</p>
          <p className="text-xs text-gray-400 mt-3">
            {question.answeredAt?.slice(0, 16).replace('T', ' ')}
          </p>
        </div>
      ) : isTeacherOrAdmin ? (
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <p className="text-sm font-semibold text-gray-700 mb-3">답변 작성</p>
          <textarea
            value={answerText}
            onChange={(e) => setAnswerText(e.target.value)}
            placeholder="답변을 입력하세요"
            rows={5}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5B8FD4] resize-none mb-3"
          />
          <button
            onClick={() => answerText.trim() && onAnswer(answerText.trim())}
            disabled={!answerText.trim()}
            className="w-full py-2.5 bg-[#2B2B2B] text-white rounded-lg text-sm font-medium disabled:opacity-40"
          >
            답변 등록
          </button>
        </div>
      ) : (
        <div className="bg-gray-50 rounded-xl p-6 text-center">
          <p className="text-sm text-gray-400">아직 답변이 등록되지 않았습니다.</p>
          <p className="text-xs text-gray-300 mt-1">선생님이 곧 답변 드릴 예정입니다.</p>
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

  const selectedTest = tests.find((t) => t.id === Number(testId))

  function handleSubmit(e) {
    e.preventDefault()
    if (!content.trim() || !testId) return
    onSubmit({
      testId:     Number(testId),
      questionId: questionId ? Number(questionId) : null,
      content:    content.trim(),
    })
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="text-sm text-gray-500 hover:text-gray-700">
          ← 목록
        </button>
        <h1 className="text-xl font-bold text-[#2B2B2B]">질문하기</h1>
      </div>

      {tests.length === 0 ? (
        <p className="text-center text-gray-400 py-12">
          종료된 테스트가 없습니다.
          <br />
          <span className="text-xs">테스트가 종료된 후 질문할 수 있습니다.</span>
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* 테스트 선택 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">관련 테스트</label>
            <select
              value={testId}
              onChange={(e) => { setTestId(e.target.value); setQuestionId('') }}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5B8FD4]"
            >
              {tests.map((t) => (
                <option key={t.id} value={String(t.id)}>{t.title}</option>
              ))}
            </select>
          </div>

          {/* 문항 선택 */}
          {selectedTest && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                관련 문항 <span className="text-gray-400 font-normal">(선택)</span>
              </label>
              <select
                value={questionId}
                onChange={(e) => setQuestionId(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5B8FD4]"
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
            <label className="block text-sm font-medium text-gray-700 mb-1">질문 내용</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="궁금한 점을 자유롭게 입력하세요"
              rows={5}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5B8FD4] resize-none"
              required
            />
          </div>

          <p className="text-xs text-gray-400 -mt-2">
            * 질문은 선생님에게만 실명으로 표시됩니다.
          </p>

          <button
            type="submit"
            disabled={!content.trim()}
            className="w-full py-3 bg-[#2B2B2B] text-white rounded-xl font-medium disabled:opacity-40"
          >
            질문 등록
          </button>
        </form>
      )}
    </div>
  )
}
