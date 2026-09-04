// src/pages/Tests.jsx
import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import Layout from '../components/Layout'
import PageTitle from '../components/ui/PageTitle'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import { sameChoiceSet, toggleChoice } from '../utils/answerSet'
import ChoiceGrid from '../components/ChoiceGrid'
import { distributePoints, evenTotalSuggestions } from '../utils/testPoints'
import NoAssignedClass from '../components/NoAssignedClass'
import { visibleClasses, canSeeClass, hasNoAssignedClass } from '../utils/classAccess'
import { formatDateTime } from '../utils/datetime'

// 상태 배지 톤 — 팔레트에 초록이 없어 진행중=navy(긍정)로 대응한다
const statusBadge = {
  ready:  { label: '준비중', tone: 'neutral' },
  active: { label: '진행중', tone: 'navy' },
  // 종료는 경고가 아니라 정상적인 끝 상태다. danger로 두면 같은 카드의
  // '미채점 N'(교사가 지금 해야 할 일)과 똑같은 붉은 뱃지가 돼 급한 게 안 보인다.
  closed: { label: '종료',   tone: 'neutral' },
}

export default function Tests() {
  const { user } = useAuth()
  const {
    classes, students,
    tests, submissions,
    addTest, updateTestStatus, deleteTest,
    addSubmission, updateSubmissionScores,
  } = useData()

  const [view,                setView]                = useState('list')
  const [selectedTest,        setSelectedTest]        = useState(null)
  const [selectedSubmission,  setSelectedSubmission]  = useState(null)
  const [filterClassId,       setFilterClassId]       = useState('all')

  // 관리자는 전체, 교사는 담당 반, 학생은 본인 반
  const accessibleClasses = visibleClasses(classes, user)

  // 목록 필터
  const filteredTests = tests.filter((t) => {
    const classMatch = filterClassId === 'all' || t.classId === Number(filterClassId)
    return classMatch && canSeeClass(classes, user, t.classId)
  })

  // 미채점 건수
  function ungradedCount(testId) {
    return submissions.filter((s) => s.testId === testId && s.scores.length === 0).length
  }

  // 학생 본인 제출
  function mySubmission(testId) {
    return submissions.find((s) => s.testId === testId && s.studentId === user.studentId)
  }

  // selectedTest가 업데이트되면 최신 버전으로 동기화
  useEffect(() => {
    if (selectedTest) {
      const updated = tests.find((t) => t.id === selectedTest.id)
      // 목록(tests)이 갱신될 때 선택된 항목을 최신 버전으로 동기화
      if (updated) setSelectedTest(updated)
    }
    // selectedTest는 의존성에서 제외 — 목록(tests) 변경 시에만 동기화하려는 의도
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tests])

  // ────────── list 뷰 ──────────
  if (view === 'list') {
    return (
      <Layout>
      <div>
        <div className="flex justify-between items-center mb-4">
          <PageTitle title="테스트" />
          {(user.role === 'teacher' || user.role === 'admin') && (
            <Button onClick={() => setView('create')}>+ 테스트 만들기</Button>
          )}
        </div>

        {/* 반 탭 (교사/관리자만) */}
        {user.role !== 'student' && (
          <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
            <button
              onClick={() => setFilterClassId('all')}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                filterClassId === 'all'
                  ? 'bg-ink text-white'
                  : 'bg-surface-alt text-ink-soft hover:bg-line-soft'
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
                    ? 'bg-ink text-white'
                    : 'bg-surface-alt text-ink-soft hover:bg-line-soft'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        )}

        {/* 테스트 목록 */}
        {hasNoAssignedClass(classes, user) ? (
          <NoAssignedClass />
        ) : filteredTests.length === 0 ? (
          <p className="text-center text-ink-faint py-12">테스트가 없습니다.</p>
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
                  className="bg-surface border border-line rounded p-4 cursor-pointer hover:bg-surface-alt transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge tone={badge.tone}>{badge.label}</Badge>
                        <span className="text-xs text-ink-faint">{cls?.name}</span>
                      </div>
                      <p className="font-semibold text-ink">{test.title}</p>
                      <p className="text-xs text-ink-faint mt-1">
                        {test.date} · {test.questions.length}문항 ·{' '}
                        {test.timeLimit ? `${test.timeLimit}분` : '시간 제한 없음'}
                      </p>
                    </div>

                    {user.role !== 'student' && (
                      <div className="flex flex-col items-end gap-2 ml-3">
                        {ungraded > 0 && <Badge tone="danger">미채점 {ungraded}</Badge>}
                        {test.status === 'ready' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              updateTestStatus(test.id, 'active', new Date().toISOString())
                            }}
                            className="text-xs px-3 py-1 bg-navy text-white rounded"
                          >
                            시작
                          </button>
                        )}
                        {test.status === 'active' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              updateTestStatus(test.id, 'closed')
                            }}
                            className="text-xs px-3 py-1 bg-danger text-white rounded"
                          >
                            종료
                          </button>
                        )}
                        {test.status !== 'active' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              if (confirm(`"${test.title}" 테스트를 삭제하시겠습니까?`)) {
                                deleteTest(test.id)
                              }
                            }}
                            className="text-xs px-3 py-1 text-ink-faint hover:text-danger hover:bg-danger-soft rounded transition-colors"
                          >
                            삭제
                          </button>
                        )}
                      </div>
                    )}

                    {user.role === 'student' && (
                      <div className="ml-3 text-xs text-ink-faint">
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
      </Layout>
    )
  }

  // ────────── create 뷰 ──────────
  if (view === 'create') {
    if (user.role === 'student') { setView('list'); return null }
    return (
      <Layout>
      <CreateView
        classes={accessibleClasses}
        user={user}
        onSubmit={async (newTest) => {
          await addTest(newTest)
          setView('list')
        }}
        onCancel={() => setView('list')}
      />
      </Layout>
    )
  }

  // ────────── submissions 뷰 ──────────
  if (view === 'submissions') {
    if (user.role === 'student') { setView('list'); return null }
    const testSubs    = submissions.filter((s) => s.testId === selectedTest.id)
    const totalPoints = selectedTest.questions.reduce((sum, q) => sum + q.points, 0)

    return (
      <Layout>
      <div>
        <button onClick={() => setView('list')} className="text-sm text-ink-mute hover:text-ink-soft mb-2 block">
          ← 목록
        </button>
        <PageTitle title={selectedTest.title} lead="제출 목록" />

        {testSubs.length === 0 ? (
          <p className="text-center text-ink-faint py-12">제출한 학생이 없습니다.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {testSubs.map((sub) => {
              const student  = students.find((s) => s.id === sub.studentId)
              const isGraded = sub.scores.length > 0
              const totalScore = sub.scores.reduce((sum, s) => sum + s.score, 0)

              return (
                <div
                  key={sub.id}
                  onClick={() => {
                    setSelectedSubmission(sub)
                    setView('grade')
                  }}
                  className="bg-surface border border-line rounded p-4 cursor-pointer hover:bg-surface-alt transition-colors flex justify-between items-center"
                >
                  <div>
                    <p className="font-medium text-ink">{student?.name ?? '알 수 없음'}</p>
                    <p className="text-xs text-ink-faint mt-0.5">
                      {formatDateTime(sub.submittedAt)}
                    </p>
                  </div>
                  <div className="text-right">
                    {isGraded ? (
                      <>
                        <p className="font-bold text-ink">{totalScore}점</p>
                        <p className="text-xs text-ink-faint">/ {totalPoints}점</p>
                      </>
                    ) : (
                      <Badge tone="danger">미채점</Badge>
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

  // ────────── take 뷰 (학생 응시) ──────────
  if (view === 'take') {
    if (user.role !== 'student') { setView('list'); return null }
    return (
      <TakeView
        test={selectedTest}
        user={user}
        onSubmit={async (answers) => {
          const hasSA = selectedTest.questions.some((q) => q.type === 'sa')
          const mcScores = selectedTest.questions
            .filter((q) => q.type === 'mc')
            .map((q) => {
              const ans = answers.find((a) => a.questionId === q.id)
              // 다중 정답은 순서 무관 집합 비교 — 덜 골라도 더 골라도 0점이다
              return { questionId: q.id, score: sameChoiceSet(ans?.answer, q.answer) ? q.points : 0 }
            })

          await addSubmission({
            testId:    selectedTest.id,
            studentId: user.studentId,
            answers,
            scores: hasSA ? [] : mcScores,
          })
          setView('list')
        }}
        onBack={() => setView('list')}
      />
    )
  }

  // ────────── grade 뷰 ──────────
  if (view === 'grade') {
    if (user.role === 'student') { setView('list'); return null }
    return (
      <Layout>
      <GradeView
        test={selectedTest}
        submission={selectedSubmission}
        students={students}
        onSave={async (updatedScores) => {
          await updateSubmissionScores(selectedSubmission.id, updatedScores)
          setView('submissions')
        }}
        onBack={() => setView('submissions')}
      />
      </Layout>
    )
  }

  // ────────── result 뷰 (학생 결과 확인) ──────────
  if (view === 'result') {
    if (!selectedTest) { setView('list'); return null }
    return (
      <Layout>
      <ResultView
        test={selectedTest}
        user={user}
        submissions={submissions}
        onBack={() => setView('list')}
      />
      </Layout>
    )
  }

  return null
}

// ────────── TakeView 컴포넌트 ──────────
function TakeView({ test, onSubmit, onBack }) {
  const [answers, setAnswers] = useState(
    test.questions.map((q) => ({ questionId: q.id, answer: '' }))
  )
  // 최초 렌더 시 남은 시간을 지연 초기화(effect 안에서 setState 하지 않도록)
  const [timeLeft,   setTimeLeft]   = useState(calcTimeLeft)
  const [submitting, setSubmitting] = useState(false)
  const submitted   = useRef(false)
  const answersRef  = useRef(answers)

  useEffect(() => { answersRef.current = answers }, [answers])

  function calcTimeLeft() {
    if (!test.startedAt || !test.timeLimit) return null
    const endTime = new Date(test.startedAt).getTime() + test.timeLimit * 60 * 1000
    return Math.max(0, Math.floor((endTime - Date.now()) / 1000))
  }

  async function handleSubmit() {
    if (submitted.current || submitting) return
    submitted.current = true
    setSubmitting(true)
    await onSubmit(answersRef.current)
  }

  useEffect(() => {
    if (!test.startedAt || !test.timeLimit) return
    const interval = setInterval(() => {
      const left = calcTimeLeft()
      setTimeLeft(left)
      if (left <= 0) { clearInterval(interval); handleSubmit() }
    }, 1000)
    return () => clearInterval(interval)
    // 마운트 시 1회만 타이머 시작 (의존성 추가 시 매 렌더마다 재시작되므로 의도적으로 빈 배열)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function formatTime(sec) {
    if (sec === null) return ''
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  function setAnswer(questionId, answer) {
    setAnswers(answers.map((a) => (a.questionId === questionId ? { ...a, answer } : a)))
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <button onClick={onBack} className="text-sm text-ink-mute hover:text-ink-soft mb-1 block">
            ← 목록
          </button>
          {/* 타이머와 한 행에서 나란히 정렬돼야 해서 PageTitle(자체 mb-6 보유) 대신
              같은 스타일을 직접 그린다 — PageTitle을 쓰면 여백만큼 박스가 커져 타이머와 어긋난다 */}
          <h1 className="text-3xl font-bold text-ink tracking-tight">{test.title}</h1>
        </div>
        {timeLeft !== null && (
          <div className={`text-xl font-mono font-bold px-4 py-2 rounded ${
            timeLeft <= 60 ? 'bg-danger-soft text-danger' : 'bg-surface-alt text-ink'
          }`}>
            {formatTime(timeLeft)}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4 mb-8">
        {test.questions.map((q, idx) => {
          const myAnswer = answers.find((a) => a.questionId === q.id)?.answer ?? ''
          return (
            <div key={q.id} className="bg-surface border border-line rounded p-4">
              <div className="flex justify-between items-center mb-3">
                <span className="font-semibold text-ink">
                  {idx + 1}번{q.content ? ` — ${q.content}` : ''}
                </span>
                <span className="text-xs text-ink-faint">
                  {q.points}점 · {q.type === 'mc' ? '객관식' : '주관식'}
                </span>
              </div>

              {q.type === 'mc' ? (
                <div className="flex gap-2 flex-wrap">
                  {q.choices.map((c) => (
                    <button
                      key={c}
                      onClick={() => setAnswer(q.id, toggleChoice(myAnswer, c))}
                      className={`w-10 h-10 rounded-full text-base font-medium transition-colors ${
                        myAnswer.includes(c)
                          ? 'bg-ink text-white'
                          : 'bg-surface-alt text-ink-soft hover:bg-line-soft'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              ) : (
                <textarea
                  value={myAnswer}
                  onChange={(e) => setAnswer(q.id, e.target.value)}
                  placeholder="답안을 입력하세요"
                  rows={3}
                  className="w-full border border-line rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy resize-none"
                />
              )}
            </div>
          )
        })}
      </div>

      <Button onClick={handleSubmit} disabled={submitting} className="w-full">
        {submitting ? '제출 중...' : '제출하기'}
      </Button>
    </div>
  )
}

// ────────── CreateView 컴포넌트 ──────────
const MC_CHOICES = ['①', '②', '③', '④', '⑤']

function CreateView({ classes, user, onSubmit, onCancel }) {
  const [title,     setTitle]     = useState('')
  const [classId,   setClassId]   = useState(String(classes[0]?.id ?? ''))
  const [date,      setDate]      = useState(new Date().toISOString().slice(0, 10))
  const [timeLimit, setTimeLimit] = useState(30)
  // 오프라인 시험지를 나눠주고 답만 입력하는 쓰임이라, 객관식은 문항 수를 넣고
  // 정답 표에서 한 번에 찍는다 (과제 출제 화면과 같은 방식).
  const [mcCount,   setMcCount]   = useState(0)
  const [answers,   setAnswers]   = useState({})   // { 문항번호: '①③' }
  const [saList,    setSaList]    = useState([])   // 주관식은 필요할 때만 따로 추가
  const [totalPoints, setTotalPoints] = useState(100)
  const [saving,    setSaving]    = useState(false)

  function changeMcCount(val) {
    const n = Math.max(0, Math.min(300, Number(val) || 0))
    // 문항 수를 줄이면 사라진 문항의 정답도 함께 버린다 — 남겨두면
    // 나중에 다시 늘렸을 때 예전 답이 되살아나 교사가 모르게 저장된다
    setAnswers((prev) => {
      const next = {}
      for (let i = 1; i <= n; i++) if (prev[i]) next[i] = prev[i]
      return next
    })
    setMcCount(n)
  }

  // 배점은 총점을 문항 수로 나눠 자동으로 정한다
  const questionCount = mcCount + saList.length
  const points = distributePoints(totalPoints, questionCount)
  // 배점이 갈리면 총점을 조금 고치는 편이 낫다 — 가까운 값을 알려준다
  const evenTotals = evenTotalSuggestions(totalPoints, questionCount)

  const questions = [
    ...Array.from({ length: mcCount }, (_, i) => ({
      id: i + 1, type: 'mc', content: '',
      choices: MC_CHOICES,
      // 선지 클릭이 토글이라 빈 상태로 시작한다 — 미리 켜두면 교사가 누른 선지가 거기에 더해진다
      answer: answers[i + 1] ?? '',
      points: points[i] ?? 0,
    })),
    ...saList.map((sa, j) => ({
      id: mcCount + j + 1, type: 'sa', content: sa.content,
      choices: null, answer: null,
      points: points[mcCount + j] ?? 0,
    })),
  ]

  // 저장 조건은 한 곳에서만 정한다 — 버튼과 handleSubmit이 어긋나면
  // 버튼은 눌리는데 아무 일도 일어나지 않아 교사가 이유를 알 수 없다.
  // 객관식은 정답을 다 끄면 ''이 되는데, 그 문항은 누구도 맞힐 수 없으므로 막는다(과제 쪽과 같은 규칙).
  const unanswered = Array.from({ length: mcCount }, (_, i) => i + 1).filter((n) => !answers[n])
  const canSave =
    Boolean(title.trim()) &&
    questionCount > 0 &&
    unanswered.length === 0 &&
    !saving

  // 버튼이 꺼져 있는 이유 — 화면만 보고 알 수 있어야 한다
  const blockedReasons = []
  if (!title.trim()) blockedReasons.push('제목을 입력해 주세요.')
  if (questionCount === 0) blockedReasons.push('문항 수를 입력해 주세요.')
  if (unanswered.length > 0) {
    blockedReasons.push(`${unanswered.join(', ')}번 정답을 지정해 주세요.`)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!canSave) return
    setSaving(true)
    await onSubmit({
      title:     title.trim(),
      classId:   Number(classId),
      teacherId: user.id,
      date,
      timeLimit: Number(timeLimit),
      status:    'ready',
      startedAt: null,
      questions,
    })
    setSaving(false)
  }

  return (
    <div>
      <button onClick={onCancel} className="text-sm text-ink-mute hover:text-ink-soft mb-2 block">← 목록</button>
      <PageTitle title="테스트 만들기" />

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div>
          <label className="block text-sm font-medium text-ink-soft mb-1">제목</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="예: 4월 2주차 독서 테스트"
            className="w-full border border-line rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-ink-soft mb-1">대상 반</label>
          <select
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            className="w-full border border-line rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy"
          >
            {classes.map((c) => (
              <option key={c.id} value={String(c.id)}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-ink-soft mb-1">날짜</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full border border-line rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-ink-soft mb-1">시간 제한 (분)</label>
            <input
              type="number"
              value={timeLimit}
              onChange={(e) => setTimeLimit(e.target.value)}
              min="1"
              className="w-full border border-line rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy"
            />
          </div>
        </div>

        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-ink-soft mb-1">객관식 문항 수</label>
            <input
              type="number"
              value={mcCount || ''}
              onChange={(e) => changeMcCount(e.target.value)}
              min="0"
              max="300"
              placeholder="예: 20"
              className="w-full border border-line rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-ink-soft mb-1">총점</label>
            <input
              type="number"
              value={totalPoints}
              onChange={(e) => setTotalPoints(e.target.value)}
              min="0"
              step="0.1"
              className="w-full border border-line rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy"
            />
          </div>
        </div>

        {questionCount > 0 && (
          <div className="-mt-3">
            <p className="text-xs text-ink-mute">
              {questionCount}문항 · 문항당 {points[0]}점
              {points[0] !== points[questionCount - 1] && ` (뒤쪽 ${questionCount - points.filter((p) => p === points[0]).length}문항은 ${points[questionCount - 1]}점)`}
            </p>
            {evenTotals.length > 0 && (
              <p data-testid="even-total-hint" className="text-xs text-ink-soft mt-1">
                {questionCount}문항은 {totalPoints}점으로 나누어떨어지지 않습니다.{' '}
                {evenTotals.map((v) => `${v}점(문항당 ${v / questionCount}점)`).join(' 또는 ')}으로 하면 딱 맞습니다.
              </p>
            )}
          </div>
        )}

        {mcCount > 0 && (
          <div>
            <label className="block text-sm font-medium text-ink-soft mb-2">
              정답 <span className="font-normal text-ink-faint">— 선지를 누르거나 숫자키 1~5로 지정합니다</span>
            </label>
            <ChoiceGrid
              count={mcCount}
              values={answers}
              onChange={(number, value) => setAnswers((prev) => ({ ...prev, [number]: value }))}
            />
          </div>
        )}

        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-medium text-ink-soft">
              주관식 <span className="font-normal text-ink-faint">— 교사가 직접 채점합니다</span>
            </label>
            <button
              type="button"
              onClick={() => setSaList((prev) => [...prev, { content: '' }])}
              className="text-xs px-3 py-1 bg-ink text-white rounded"
            >
              + 주관식
            </button>
          </div>

          {saList.map((sa, j) => (
            <div key={j} className="flex items-center gap-2 mb-2">
              <span className="text-xs font-medium text-ink-mute w-10 shrink-0">{mcCount + j + 1}번</span>
              <input
                value={sa.content}
                onChange={(e) => setSaList((prev) => prev.map((it, i) => (i === j ? { content: e.target.value } : it)))}
                placeholder="문항 내용 (참고용, 비워도 됩니다)"
                className="flex-1 border border-line rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-navy"
              />
              <button
                type="button"
                onClick={() => setSaList((prev) => prev.filter((_, i) => i !== j))}
                className="text-xs text-danger hover:opacity-80"
              >
                삭제
              </button>
            </div>
          ))}
        </div>

        {!canSave && !saving && (
          <p data-testid="save-blocked" className="text-sm text-ink-soft">
            {blockedReasons.join(' ')}
          </p>
        )}

        <Button type="submit" disabled={!canSave} className="w-full">
          {saving ? '저장 중...' : '저장'}
        </Button>
      </form>
    </div>
  )
}

// ────────── ResultView 컴포넌트 ──────────
function ResultView({ test, user, submissions, onBack }) {
  const mySub = submissions.find(
    (s) => s.testId === test.id && s.studentId === user.studentId
  )
  const totalPoints = test.questions.reduce((sum, q) => sum + q.points, 0)
  const totalScore  = mySub?.scores.reduce((sum, s) => sum + s.score, 0) ?? 0

  return (
    <div>
      <button onClick={onBack} className="text-sm text-ink-mute hover:text-ink-soft mb-2 block">← 목록</button>
      <PageTitle title={`${test.title} — 결과`} />

      <div className="bg-ink text-white rounded p-6 text-center mb-6">
        <p className="text-sm text-white/60 mb-1">총점</p>
        <p className="text-4xl font-bold">{totalScore}점</p>
        <p className="text-sm text-white/60 mt-1">/ {totalPoints}점</p>
      </div>

      <div className="flex flex-col gap-3">
        {test.questions.map((q, idx) => {
          const ans        = mySub?.answers.find((a) => a.questionId === q.id)?.answer ?? ''
          const scoreEntry = mySub?.scores.find((s) => s.questionId === q.id)
          const score      = scoreEntry?.score ?? null
          // 다중 정답은 순서 무관 집합 비교여야 정오답이 올바르게 표시된다
          const isCorrect  = q.type === 'mc' ? sameChoiceSet(ans, q.answer) : null

          return (
            <div key={q.id} className="bg-surface border border-line rounded p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="font-semibold text-ink">{idx + 1}번</span>
                <span className={`text-sm font-bold ${
                  score === null ? 'text-ink-faint'
                  : score === q.points ? 'text-navy'
                  : score > 0 ? 'text-warn'
                  : 'text-danger'
                }`}>
                  {score === null ? '채점 대기' : `${score} / ${q.points}점`}
                </span>
              </div>
              <p className="text-sm text-ink-mute">
                내 답: <span className="text-ink font-medium">{ans || '(미입력)'}</span>
              </p>
              {q.type === 'mc' && (
                <p className="text-sm text-ink-mute">
                  정답: <span className="text-navy font-medium">{q.answer}</span>
                  <span className="ml-2">{isCorrect ? '✓' : '✗'}</span>
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ────────── GradeView 컴포넌트 ──────────
function GradeView({ test, submission, students, onSave, onBack }) {
  const student     = students.find((s) => s.id === submission.studentId)
  const totalPoints = test.questions.reduce((sum, q) => sum + q.points, 0)
  const [saving, setSaving] = useState(false)

  const [localScores, setLocalScores] = useState(() =>
    test.questions.map((q) => {
      const existing = submission.scores.find((s) => s.questionId === q.id)
      if (existing) return existing
      if (q.type === 'mc') {
        const ans = submission.answers.find((a) => a.questionId === q.id)
        // 다중 정답은 순서 무관 집합 비교 — 덜 골라도 더 골라도 0점이다
        return { questionId: q.id, score: sameChoiceSet(ans?.answer, q.answer) ? q.points : 0 }
      }
      return { questionId: q.id, score: 0 }
    })
  )

  const totalScore = localScores.reduce((sum, s) => sum + s.score, 0)

  return (
    <div>
      <button onClick={onBack} className="text-sm text-ink-mute hover:text-ink-soft mb-2 block">← 제출 목록</button>
      <PageTitle title="채점" lead={`${student?.name} · ${test.title}`} />

      <div className="flex flex-col gap-4 mb-6">
        {test.questions.map((q, idx) => {
          const ans        = submission.answers.find((a) => a.questionId === q.id)?.answer ?? ''
          const scoreEntry = localScores.find((s) => s.questionId === q.id)
          // 다중 정답은 순서 무관 집합 비교여야 정오답이 올바르게 표시된다
          const isCorrect  = q.type === 'mc' && sameChoiceSet(ans, q.answer)

          return (
            <div key={q.id} className="bg-surface border border-line rounded p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="font-semibold text-ink">
                  {idx + 1}번{q.content ? ` — ${q.content}` : ''}
                </span>
                <span className="text-xs text-ink-faint">{q.points}점</span>
              </div>

              <p className="text-sm text-ink-soft mb-2">
                제출 답안: <span className="font-medium text-ink">{ans || '(미입력)'}</span>
              </p>

              {q.type === 'mc' ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-ink-mute">정답: {q.answer}</span>
                  <span className={`text-xs font-bold ${isCorrect ? 'text-navy' : 'text-danger'}`}>
                    {isCorrect ? `✓ ${q.points}점` : '✗ 0점'}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-ink-mute">점수 입력:</span>
                  <input
                    type="number"
                    min="0"
                    max={q.points}
                    value={scoreEntry?.score ?? 0}
                    onChange={(e) =>
                      setLocalScores(localScores.map((s) =>
                        s.questionId === q.id
                          ? { ...s, score: Math.min(q.points, Math.max(0, Number(e.target.value))) }
                          : s
                      ))
                    }
                    className="w-16 border border-line rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-navy"
                  />
                  <span className="text-xs text-ink-mute">/ {q.points}점</span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="flex justify-between items-center bg-surface border border-line rounded p-4 mb-4">
        <span className="font-semibold text-ink-soft">총점</span>
        <span className="text-xl font-bold text-ink">{totalScore} / {totalPoints}점</span>
      </div>

      <Button
        onClick={async () => { setSaving(true); await onSave(localScores); setSaving(false) }}
        disabled={saving}
        className="w-full"
      >
        {saving ? '저장 중...' : '채점 저장'}
      </Button>
    </div>
  )
}
