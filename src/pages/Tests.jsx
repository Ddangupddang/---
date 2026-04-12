// src/pages/Tests.jsx
import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { tests as initialTests } from '../data/tests'
import { submissions as initialSubmissions } from '../data/submissions'
import { classes } from '../data/classes'
import { students } from '../data/students'

// 상태 배지 색상
const statusBadge = {
  ready:  { label: '준비중', color: 'bg-gray-100 text-gray-600' },
  active: { label: '진행중', color: 'bg-green-100 text-green-700' },
  closed: { label: '종료',   color: 'bg-red-100 text-red-600' },
}

export default function Tests() {
  const { user } = useAuth()
  const [tests, setTests]             = useState(initialTests)
  const [submissions, setSubmissions] = useState(initialSubmissions)
  const [view, setView]               = useState('list')
  const [selectedTest, setSelectedTest]             = useState(null)
  const [filterClassId, setFilterClassId]           = useState('all')

  // 학생은 본인 반만, 교사/관리자는 전체
  const accessibleClasses =
    user.role === 'student'
      ? classes.filter((c) => c.id === user.classId)
      : classes

  // 목록 필터
  const filteredTests = tests.filter((t) => {
    const classMatch  = filterClassId === 'all' || t.classId === Number(filterClassId)
    const accessMatch = user.role !== 'student' || t.classId === user.classId
    return classMatch && accessMatch
  })

  // 미채점 건수
  function ungradedCount(testId) {
    return submissions.filter((s) => s.testId === testId && s.scores.length === 0).length
  }

  // 학생 본인 제출
  function mySubmission(testId) {
    return submissions.find((s) => s.testId === testId && s.studentId === user.studentId)
  }

  // ────────── list 뷰 ──────────
  if (view === 'list') {
    return (
      <div>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-bold text-[#2B2B2B]">테스트</h1>
          {(user.role === 'teacher' || user.role === 'admin') && (
            <button
              onClick={() => setView('create')}
              className="px-4 py-2 bg-[#2B2B2B] text-white rounded-lg text-sm"
            >
              + 테스트 만들기
            </button>
          )}
        </div>

        {/* 반 탭 (교사/관리자만) */}
        {user.role !== 'student' && (
          <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
            <button
              onClick={() => setFilterClassId('all')}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                filterClassId === 'all'
                  ? 'bg-[#2B2B2B] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              전체
            </button>
            {classes.map((c) => (
              <button
                key={c.id}
                onClick={() => setFilterClassId(String(c.id))}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  filterClassId === String(c.id)
                    ? 'bg-[#2B2B2B] text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        )}

        {/* 테스트 목록 */}
        {filteredTests.length === 0 ? (
          <p className="text-center text-gray-400 py-12">테스트가 없습니다.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {filteredTests.map((test) => {
              const cls      = classes.find((c) => c.id === test.classId)
              const badge    = statusBadge[test.status]
              const ungraded = ungradedCount(test.id)
              const mySub    = mySubmission(test.id)

              return (
                <div
                  key={test.id}
                  onClick={() => {
                    setSelectedTest(test)
                    if (user.role === 'student') {
                      if (test.status === 'active' && !mySub) {
                        setView('take')
                      } else if (mySub && mySub.scores.length > 0) {
                        setView('result')
                      }
                    } else {
                      setView('submissions')
                    }
                  }}
                  className="bg-white rounded-xl p-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badge.color}`}>
                          {badge.label}
                        </span>
                        <span className="text-xs text-gray-400">{cls?.name}</span>
                      </div>
                      <p className="font-semibold text-[#2B2B2B]">{test.title}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {test.date} · {test.questions.length}문항 ·{' '}
                        {test.timeLimit ? `${test.timeLimit}분` : '시간 제한 없음'}
                      </p>
                    </div>

                    {user.role !== 'student' && (
                      <div className="flex flex-col items-end gap-2 ml-3">
                        {ungraded > 0 && (
                          <span className="text-xs bg-[#C0392B] text-white px-2 py-0.5 rounded-full">
                            미채점 {ungraded}
                          </span>
                        )}
                        {test.status === 'ready' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setTests(tests.map((t) =>
                                t.id === test.id
                                  ? { ...t, status: 'active', startedAt: new Date().toISOString() }
                                  : t
                              ))
                            }}
                            className="text-xs px-3 py-1 bg-green-600 text-white rounded-lg"
                          >
                            시작
                          </button>
                        )}
                        {test.status === 'active' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setTests(tests.map((t) =>
                                t.id === test.id ? { ...t, status: 'closed' } : t
                              ))
                            }}
                            className="text-xs px-3 py-1 bg-[#C0392B] text-white rounded-lg"
                          >
                            종료
                          </button>
                        )}
                      </div>
                    )}

                    {user.role === 'student' && (
                      <div className="ml-3 text-xs text-gray-400">
                        {mySub
                          ? mySub.scores.length > 0 ? '✅ 채점 완료' : '📝 제출 완료'
                          : test.status === 'active' ? '▶ 응시 가능' : '-'}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // ────────── create 뷰 ──────────
  if (view === 'create') {
    return (
      <CreateView
        classes={accessibleClasses}
        user={user}
        onSubmit={(newTest) => {
          setTests([{ ...newTest, id: tests.length + 1 }, ...tests])
          setView('list')
        }}
        onCancel={() => setView('list')}
      />
    )
  }

  // submissions 뷰 — 다음 Task에서 추가 예정
  if (view === 'submissions') {
    return (
      <div>
        <button onClick={() => setView('list')} className="text-sm text-gray-500 mb-4">← 목록</button>
        <h2 className="text-base font-semibold">제출 목록</h2>
      </div>
    )
  }

  return null
}

// ────────── CreateView 컴포넌트 ──────────
function CreateView({ classes, user, onSubmit, onCancel }) {
  const [title, setTitle]         = useState('')
  const [classId, setClassId]     = useState(String(classes[0]?.id ?? ''))
  const [date, setDate]           = useState(new Date().toISOString().slice(0, 10))
  const [timeLimit, setTimeLimit] = useState(30)
  const [questions, setQuestions] = useState([])

  function addQuestion(type) {
    const newQ = {
      id: questions.length + 1,
      type,
      content: '',
      choices: type === 'mc' ? ['①', '②', '③', '④', '⑤'] : null,
      answer: type === 'mc' ? '①' : null,
      points: 10,
    }
    setQuestions([...questions, newQ])
  }

  function updateQuestion(idx, field, value) {
    setQuestions(questions.map((q, i) => (i === idx ? { ...q, [field]: value } : q)))
  }

  function removeQuestion(idx) {
    setQuestions(questions.filter((_, i) => i !== idx))
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!title.trim() || questions.length === 0) return
    onSubmit({
      title: title.trim(),
      classId: Number(classId),
      teacherId: user.id,
      date,
      timeLimit: Number(timeLimit),
      status: 'ready',
      startedAt: null,
      questions,
    })
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onCancel} className="text-sm text-gray-500 hover:text-gray-700">
          ← 목록
        </button>
        <h1 className="text-xl font-bold text-[#2B2B2B]">테스트 만들기</h1>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {/* 제목 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">제목</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="예: 4월 2주차 독서 테스트"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5B8FD4]"
            required
          />
        </div>

        {/* 반 선택 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">대상 반</label>
          <select
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5B8FD4]"
          >
            {classes.map((c) => (
              <option key={c.id} value={String(c.id)}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* 날짜 & 시간제한 */}
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">날짜</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5B8FD4]"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">시간 제한 (분)</label>
            <input
              type="number"
              value={timeLimit}
              onChange={(e) => setTimeLimit(e.target.value)}
              min="1"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5B8FD4]"
            />
          </div>
        </div>

        {/* 문항 목록 */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-medium text-gray-700">문항</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => addQuestion('mc')}
                className="text-xs px-3 py-1 bg-[#5B8FD4] text-white rounded-lg"
              >
                + 객관식
              </button>
              <button
                type="button"
                onClick={() => addQuestion('sa')}
                className="text-xs px-3 py-1 bg-gray-600 text-white rounded-lg"
              >
                + 주관식
              </button>
            </div>
          </div>

          {questions.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-6 border border-dashed border-gray-200 rounded-lg">
              문항을 추가해주세요.
            </p>
          )}

          {questions.map((q, idx) => (
            <div key={idx} className="bg-gray-50 rounded-lg p-3 mb-3">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-medium text-gray-500">
                  {idx + 1}번 · {q.type === 'mc' ? '객관식' : '주관식'}
                </span>
                <button
                  type="button"
                  onClick={() => removeQuestion(idx)}
                  className="text-xs text-red-400 hover:text-red-600"
                >
                  삭제
                </button>
              </div>

              <input
                value={q.content}
                onChange={(e) => updateQuestion(idx, 'content', e.target.value)}
                placeholder={`${idx + 1}번 문항 내용 (참고용)`}
                className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm mb-2 focus:outline-none focus:ring-1 focus:ring-[#5B8FD4]"
              />

              {q.type === 'mc' && (
                <div className="flex gap-2 mb-2 flex-wrap">
                  <span className="text-xs text-gray-500 self-center">정답:</span>
                  {q.choices.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => updateQuestion(idx, 'answer', c)}
                      className={`w-8 h-8 rounded-full text-sm font-medium transition-colors ${
                        q.answer === c
                          ? 'bg-[#2B2B2B] text-white'
                          : 'bg-white border border-gray-300 text-gray-600 hover:border-[#5B8FD4]'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">배점:</span>
                <input
                  type="number"
                  value={q.points}
                  onChange={(e) => updateQuestion(idx, 'points', Number(e.target.value))}
                  min="1"
                  className="w-16 border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-[#5B8FD4]"
                />
                <span className="text-xs text-gray-500">점</span>
              </div>
            </div>
          ))}
        </div>

        <button
          type="submit"
          disabled={!title.trim() || questions.length === 0}
          className="w-full py-3 bg-[#2B2B2B] text-white rounded-xl font-medium disabled:opacity-40"
        >
          저장
        </button>
      </form>
    </div>
  )
}
