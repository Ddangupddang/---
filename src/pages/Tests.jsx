// src/pages/Tests.jsx
import { useState, useEffect, useRef } from 'react'
import { Navigate } from 'react-router-dom'
import { useViewMode } from '../hooks/useViewMode'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import Layout from '../components/Layout'
import PageTitle from '../components/ui/PageTitle'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import { sameChoiceSet, toggleChoice } from '../utils/answerSet'
import ChoiceGrid from '../components/ChoiceGrid'
import { distributePoints, sumPoints } from '../utils/testPoints'
import NoAssignedClass from '../components/NoAssignedClass'
import { visibleClasses, canSeeClass, hasNoAssignedClass } from '../utils/classAccess'
import { formatDateTime, todayKST } from '../utils/datetime'

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
    addTest, updateTest, refreshTest, updateTestStatus, deleteTest,
    addSubmission, updateSubmissionScores,
  } = useData()

  // 화면과 선택한 항목을 주소에 담는다 — 채점 화면에서 뒤로가기를 누르면
  // 제출 목록으로 돌아온다. 전에는 그 전에 있던 다른 페이지로 튕겼다.
  //   ?view=submissions&id=<테스트>   ?view=grade&id=<제출>
  const { mode: view, id: urlId, go } = useViewMode('list')
  const [filterClassId,       setFilterClassId]       = useState('all')

  // 고른 항목은 주소의 id로 매번 되짚는다. 따로 들고 있으면 목록이 갱신돼도
  // 옛 내용이 남아서, 전에는 effect로 일일이 맞춰줘야 했다.
  const selectedSubmission = view === 'grade'
    ? submissions.find((s) => s.id === urlId) ?? null
    : null
  const selectedTest = view === 'grade'
    ? tests.find((t) => t.id === selectedSubmission?.testId) ?? null
    : tests.find((t) => t.id === urlId) ?? null

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

  // ────────── list 뷰 ──────────
  if (view === 'list') {
    return (
      <Layout>
      <div>
        <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
          <PageTitle title="테스트" />
          {(user.role === 'teacher' || user.role === 'admin') && (
            <Button onClick={() => go('create')}>+ 테스트 만들기</Button>
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
                    if (user.role === 'student') {
                      if (test.status === 'active' && !mySub) go('take', test.id)
                      else if (mySub && mySub.scores.length > 0) go('result', test.id)
                    } else {
                      go('submissions', test.id)
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
                              go('edit', test.id)
                            }}
                            className="text-xs px-3 py-1 whitespace-nowrap border border-line text-ink-soft rounded hover:bg-surface-alt"
                          >
                            수정
                          </button>
                        )}
                        {test.status === 'ready' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              updateTestStatus(test.id, 'active', new Date().toISOString())
                            }}
                            className="text-xs px-3 py-1 whitespace-nowrap bg-navy text-white rounded"
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
                            className="text-xs px-3 py-1 whitespace-nowrap bg-danger text-white rounded"
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
                            className="text-xs px-3 py-1 whitespace-nowrap text-ink-faint hover:text-danger hover:bg-danger-soft rounded transition-colors"
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
    if (user.role === 'student') return <Navigate to="/tests" replace />
    return (
      <Layout>
      <CreateView
        classes={accessibleClasses}
        user={user}
        onSubmit={async (newTest) => {
          await addTest(newTest)
          go('list', null, { replace: true })
        }}
        onCancel={() => go('list')}
      />
      </Layout>
    )
  }

  // ────────── edit 뷰 (시작 전 수정) ──────────
  // 준비중일 때만 연다. 시작한 뒤에는 학생이 이미 풀고 있어서 정답·배점을 바꾸면
  // 같은 시험을 두 기준으로 채점하게 된다.
  if (view === 'edit') {
    if (user.role === 'student') return <Navigate to="/tests" replace />
    if (!selectedTest || selectedTest.status !== 'ready') return <Navigate to="/tests" replace />
    return (
      <Layout>
      <CreateView
        key={selectedTest.id}
        initial={selectedTest}
        classes={accessibleClasses}
        user={user}
        onSubmit={async (data) => {
          const saved = await updateTest(selectedTest.id, data)
          if (!saved) alert('저장하지 못했습니다. 그 사이 테스트가 시작됐다면 더 고칠 수 없습니다.')
          go('list', null, { replace: true })
        }}
        onCancel={() => go('list')}
      />
      </Layout>
    )
  }

  // ────────── submissions 뷰 ──────────
  if (view === 'submissions') {
    if (user.role === 'student') return <Navigate to="/tests" replace />
    if (!selectedTest) return <Navigate to="/tests" replace />
    const testSubs    = submissions.filter((s) => s.testId === selectedTest.id)
    const totalPoints = sumPoints(selectedTest.questions.map((q) => q.points))

    return (
      <Layout>
      <div>
        <button onClick={() => go('list')} className="text-sm text-ink-mute hover:text-ink-soft mb-2 block">
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
              const totalScore = sumPoints(sub.scores.map((s) => s.score))

              return (
                <div
                  key={sub.id}
                  onClick={() => {
                    go('grade', sub.id)
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
    if (user.role !== 'student') return <Navigate to="/tests" replace />
    if (!selectedTest) return <Navigate to="/tests" replace />
    return (
      <TakeView
        test={selectedTest}
        user={user}
        onSubmit={async (answers) => {
          // 채점은 여기서 하지 않는다. 학생 폰에는 정답이 내려오지 않으므로
          // (docs/stage2-answer-hiding.sql) 여기서 채점하면 전부 0점이 된다 —
          // 2026-09-16부터 10-07까지 실제로 그랬다. DB가 제출을 받는 순간
          // 정답과 맞춰 점수를 매긴다(docs/test-grading-fix.sql).
          const saved = await addSubmission({
            testId:    selectedTest.id,
            studentId: user.studentId,
            answers,
          })
          // 객관식만 있는 시험은 바로 채점돼 돌아온다 → 정답이 담긴 문항을 다시 받아
          // 결과 화면으로 간다. 주관식이 있으면 교사 채점을 기다린다.
          if (saved?.scores.length > 0) {
            await refreshTest(selectedTest.id)
            go('result', selectedTest.id, { replace: true })
          } else {
            go('list', null, { replace: true })
          }
        }}
        onBack={() => go('list')}
      />
    )
  }

  // ────────── grade 뷰 ──────────
  if (view === 'grade') {
    if (user.role === 'student') return <Navigate to="/tests" replace />
    // 제출이 취소됐거나 주소가 낡았으면 채점할 대상이 없다
    if (!selectedSubmission || !selectedTest) return <Navigate to="/tests" replace />
    return (
      <Layout>
      <GradeView
        test={selectedTest}
        submission={selectedSubmission}
        students={students}
        onSave={async (updatedScores) => {
          await updateSubmissionScores(selectedSubmission.id, updatedScores)
          go('submissions', selectedTest.id, { replace: true })
        }}
        onBack={() => go('submissions', selectedTest.id)}
      />
      </Layout>
    )
  }

  // ────────── result 뷰 (학생 결과 확인) ──────────
  if (view === 'result') {
    if (!selectedTest) return <Navigate to="/tests" replace />
    return (
      <Layout>
      <ResultView
        test={selectedTest}
        user={user}
        submissions={submissions}
        onNeedAnswers={() => refreshTest(selectedTest.id)}
        onBack={() => go('list')}
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

// ────────── CreateView 컴포넌트 (만들기 · 시작 전 수정 겸용) ──────────
const MC_CHOICES = ['①', '②', '③', '④', '⑤']

// 수정할 때 이미 있는 테스트를 폼 값으로 펼친다
function formFromTest(test) {
  const mc = test.questions.filter((q) => q.type === 'mc')
  const sa = test.questions.filter((q) => q.type !== 'mc')
  const answers = {}
  mc.forEach((q, i) => { if (q.answer) answers[i + 1] = q.answer })
  const total = sumPoints(test.questions.map((q) => q.points))
  // 균등 배분과 다른 배점만 "직접 고친 값"으로 남긴다 — 나머지는 자동 배분 그대로
  const auto = distributePoints(total, mc.length + sa.length)
  const overrides = {}
  ;[...mc, ...sa].forEach((q, i) => {
    if (q.points !== auto[i]) overrides[i + 1] = String(q.points)
  })
  return {
    title:       test.title ?? '',
    classId:     String(test.classId ?? ''),
    date:        test.date ?? todayKST(),
    timeLimit:   test.timeLimit ?? '',
    mcCount:     mc.length,
    answers,
    saList:      sa.map((q) => ({ content: q.content ?? '' })),
    totalPoints: total,
    overrides,
  }
}

// 배점 묶음 요약 — [4,4,3,3,3] → "4점 × 2문항, 3점 × 3문항"
function pointGroups(points) {
  const counts = new Map()
  points.forEach((p) => counts.set(p, (counts.get(p) ?? 0) + 1))
  return [...counts.entries()].map(([p, n]) => `${p}점 × ${n}문항`).join(', ')
}

function CreateView({ initial, classes, user, onSubmit, onCancel }) {
  const isEdit = Boolean(initial)
  // 수정이면 기존 값으로, 새로 만들면 빈 값으로 시작한다 (첫 렌더에 한 번만 계산)
  const [start] = useState(() => initial ? formFromTest(initial) : null)

  const [title,     setTitle]     = useState(start?.title ?? '')
  const [classId,   setClassId]   = useState(start?.classId ?? String(classes[0]?.id ?? ''))
  const [date,      setDate]      = useState(start?.date ?? todayKST())
  const [timeLimit, setTimeLimit] = useState(start?.timeLimit ?? 30)
  // 오프라인 시험지를 나눠주고 답만 입력하는 쓰임이라, 객관식은 문항 수를 넣고
  // 정답 표에서 한 번에 찍는다 (과제 출제 화면과 같은 방식).
  const [mcCount,   setMcCount]   = useState(start?.mcCount ?? 0)
  const [answers,   setAnswers]   = useState(start?.answers ?? {})   // { 문항번호: '①③' }
  const [saList,    setSaList]    = useState(start?.saList ?? [])    // 주관식은 필요할 때만 따로 추가
  const [totalPoints, setTotalPoints] = useState(start?.totalPoints ?? 100)
  // 교사가 직접 고친 배점 { 문항번호: '5' } — 없는 번호는 자동 배분 값을 쓴다
  const [overrides, setOverrides] = useState(start?.overrides ?? {})
  const [showPoints, setShowPoints] = useState(Object.keys(start?.overrides ?? {}).length > 0)
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
    // 문항 수가 바뀌면 번호가 밀리므로 배점은 다시 균등하게 나눈다
    setOverrides({})
  }

  // 배점: 먼저 총점을 문항 수로 고르게 나누고(1점 단위, 합계는 총점과 딱 맞음),
  // 교사가 고친 문항만 그 값으로 바꾼다
  const questionCount = mcCount + saList.length
  const autoPoints = distributePoints(totalPoints, questionCount)
  const points = autoPoints.map((p, i) =>
    overrides[i + 1] !== undefined ? Number(overrides[i + 1]) || 0 : p
  )
  const pointSum = sumPoints(points)
  const totalNum = sumPoints([totalPoints])
  const pointsMismatch = questionCount > 0 && pointSum !== totalNum

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
    !pointsMismatch &&
    !saving

  // 버튼이 꺼져 있는 이유 — 화면만 보고 알 수 있어야 한다
  const blockedReasons = []
  if (!title.trim()) blockedReasons.push('제목을 입력해 주세요.')
  if (questionCount === 0) blockedReasons.push('문항 수를 입력해 주세요.')
  if (unanswered.length > 0) {
    blockedReasons.push(`${unanswered.join(', ')}번 정답을 지정해 주세요.`)
  }
  if (pointsMismatch) {
    blockedReasons.push(`배점 합계(${pointSum}점)를 총점 ${totalNum}점에 맞춰 주세요.`)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!canSave) return
    setSaving(true)
    const payload = {
      title:     title.trim(),
      classId:   Number(classId),
      date,
      // 비우면 시간 제한 없음
      timeLimit: Number(timeLimit) || null,
      questions,
    }
    await onSubmit(isEdit ? payload : {
      ...payload,
      teacherId: user.id,
      status:    'ready',
      startedAt: null,
    })
    setSaving(false)
  }

  return (
    <div>
      <button onClick={onCancel} className="text-sm text-ink-mute hover:text-ink-soft mb-2 block">← 목록</button>
      <PageTitle
        title={isEdit ? '테스트 수정' : '테스트 만들기'}
        lead={isEdit ? '시작 전이라 시간·정답·배점까지 모두 고칠 수 있습니다' : undefined}
      />

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
          <div className="flex-1 min-w-0">
            <label className="block text-sm font-medium text-ink-soft mb-1">날짜</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full border border-line rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy"
            />
          </div>
          <div className="flex-1 min-w-0">
            <label className="block text-sm font-medium text-ink-soft mb-1">시간 제한 (분)</label>
            <input
              type="number"
              value={timeLimit}
              onChange={(e) => setTimeLimit(e.target.value)}
              min="1"
              placeholder="비우면 제한 없음"
              data-testid="time-limit"
              className="w-full border border-line rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy"
            />
          </div>
        </div>

        <div className="flex gap-4">
          <div className="flex-1 min-w-0">
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
          <div className="flex-1 min-w-0">
            <label className="block text-sm font-medium text-ink-soft mb-1">총점</label>
            <input
              type="number"
              value={totalPoints}
              onChange={(e) => { setTotalPoints(e.target.value); setOverrides({}) }}
              min="0"
              step="0.1"
              className="w-full border border-line rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy"
            />
          </div>
        </div>

        {questionCount > 0 && (
          <div className="-mt-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p data-testid="points-summary" className="text-xs text-ink-mute">
                {questionCount}문항 · {pointGroups(points)} ·{' '}
                <span className={pointsMismatch ? 'text-danger font-semibold' : 'text-ink-soft font-semibold'}>
                  합계 {pointSum}점
                </span>
              </p>
              <button
                type="button"
                onClick={() => setShowPoints((v) => !v)}
                className="text-xs px-3 py-1 whitespace-nowrap border border-line text-ink-soft rounded hover:bg-surface-alt"
              >
                {showPoints ? '배점 접기' : '문항별 배점 고치기'}
              </button>
            </div>

            {showPoints && (
              <div className="mt-2 border border-line rounded p-3">
                <p className="text-xs text-ink-mute mb-2">
                  총점을 고르게 나눈 값입니다. 고친 칸은 남색으로 표시됩니다.
                  총점이나 문항 수를 바꾸면 다시 고르게 나뉩니다.
                </p>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(88px,1fr))] gap-1.5">
                  {points.map((p, i) => {
                    const n = i + 1
                    const edited = overrides[n] !== undefined
                    return (
                      <label
                        key={n}
                        className={`flex items-center gap-1 px-2 py-1 rounded border ${
                          edited ? 'border-navy bg-navy-soft' : 'border-line'
                        }`}
                      >
                        <span className="text-xs text-ink-mute w-8 shrink-0">{n}번</span>
                        <input
                          type="number"
                          inputMode="decimal"
                          min="0"
                          step="0.1"
                          value={overrides[n] ?? p}
                          data-testid={`points-${n}`}
                          onChange={(e) => setOverrides((prev) => ({ ...prev, [n]: e.target.value }))}
                          className="w-full min-w-0 bg-transparent text-sm text-right text-ink focus:outline-none"
                        />
                      </label>
                    )
                  })}
                </div>
                {Object.keys(overrides).length > 0 && (
                  <button
                    type="button"
                    onClick={() => setOverrides({})}
                    className="mt-2 text-xs text-ink-soft underline"
                  >
                    고르게 다시 나누기
                  </button>
                )}
              </div>
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
              onClick={() => { setSaList((prev) => [...prev, { content: '' }]); setOverrides({}) }}
              className="text-xs px-3 py-1 whitespace-nowrap bg-ink text-white rounded"
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
                className="flex-1 min-w-0 border border-line rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-navy"
              />
              <button
                type="button"
                onClick={() => { setSaList((prev) => prev.filter((_, i) => i !== j)); setOverrides({}) }}
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
          {saving ? '저장 중...' : isEdit ? '수정 저장' : '저장'}
        </Button>
      </form>
    </div>
  )
}

// ────────── ResultView 컴포넌트 (학생 결과) ──────────
// 학생은 폰으로만 본다. 30문항을 카드로 한 줄씩 늘어놓으면 어디가 틀렸는지
// 스크롤해야 알 수 있어서, 위에 "틀린 문항" 번호를 먼저 보여주고
// 아래 표는 과제 결과와 같은 선지 격자로 정답/내 답을 색으로 구분한다.
function ResultView({ test, user, submissions, onNeedAnswers, onBack }) {
  const mySub = submissions.find(
    (s) => s.testId === test.id && s.studentId === user.studentId
  )
  const mcQs = test.questions.filter((q) => q.type === 'mc')
  const saQs = test.questions.filter((q) => q.type !== 'mc')
  const graded = (mySub?.scores.length ?? 0) > 0

  // 앱을 연 뒤에 채점이 끝났으면 손에 든 문항에는 아직 정답이 없다 → 한 번 다시 받는다
  const answersMissing = graded && mcQs.some((q) => !q.answer)
  useEffect(() => {
    if (answersMissing) onNeedAnswers?.()
    // 정답이 비었을 때 한 번만 부른다 (다시 받아도 비어 있으면 또 부르지 않는다)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answersMissing])

  const answerOf = (q) => mySub?.answers.find((a) => a.questionId === q.id)?.answer ?? ''
  const scoreOf  = (q) => mySub?.scores.find((s) => s.questionId === q.id)?.score ?? null

  const totalPoints = sumPoints(test.questions.map((q) => q.points))
  const totalScore  = sumPoints(mySub?.scores.map((s) => s.score) ?? [])
  // 맞음/틀림은 DB가 매긴 점수로 판단한다 — 화면과 점수가 어긋날 수 없게
  const wrongMc   = graded ? mcQs.filter((q) => !(scoreOf(q) > 0)) : []
  const correctMc = mcQs.length - wrongMc.length

  const values    = Object.fromEntries(mcQs.map((q) => [q.id, answerOf(q)]))
  const answerKey = Object.fromEntries(mcQs.map((q) => [q.id, q.answer ?? '']))

  return (
    <div>
      <button onClick={onBack} className="text-sm text-ink-mute hover:text-ink-soft mb-2 block">← 목록</button>
      <PageTitle title={`${test.title} — 결과`} />

      <div className="bg-ink text-white rounded p-5 text-center mb-4">
        <p className="text-sm text-white/60 mb-1">총점</p>
        <p data-testid="result-total" className="text-4xl font-bold">
          {totalScore}<span className="text-lg font-medium text-white/60"> / {totalPoints}점</span>
        </p>
        {mcQs.length > 0 && graded && (
          <p className="text-sm text-white/80 mt-2">
            객관식 {mcQs.length}문항 중 <span className="font-bold text-white">{correctMc}개</span> 맞음
          </p>
        )}
      </div>

      {mcQs.length > 0 && graded && (
        <div className={`rounded p-4 mb-4 border ${wrongMc.length > 0 ? 'border-danger bg-danger-soft' : 'border-navy bg-navy-soft'}`}>
          {wrongMc.length > 0 ? (
            <>
              <p className="text-sm font-semibold text-danger mb-2">틀린 문항 {wrongMc.length}개</p>
              <div data-testid="wrong-list" className="flex flex-wrap gap-1.5">
                {wrongMc.map((q) => (
                  <span key={q.id} className="px-2 py-0.5 rounded-sm bg-surface border border-danger text-danger text-sm font-semibold">
                    {q.id}번
                  </span>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm font-semibold text-navy">객관식을 모두 맞혔습니다</p>
          )}
        </div>
      )}

      {mcQs.length > 0 && (
        <div className="mb-6">
          {answersMissing ? (
            <p className="text-sm text-ink-mute py-4 text-center">정답을 불러오는 중…</p>
          ) : (
            <>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-mute mb-2">
                <span className="flex items-center gap-1"><span className="w-3.5 h-3.5 rounded-full bg-navy inline-block" />맞게 고름</span>
                <span className="flex items-center gap-1"><span className="w-3.5 h-3.5 rounded-full bg-danger inline-block" />잘못 고름</span>
                <span className="flex items-center gap-1"><span className="w-3.5 h-3.5 rounded-full border-2 border-navy inline-block" />정답</span>
              </div>
              <ChoiceGrid
                numbers={mcQs.map((q) => q.id)}
                mode="result"
                values={values}
                answerKey={answerKey}
                wrong={wrongMc.map((q) => q.id)}
                onChange={() => {}}
              />
            </>
          )}
        </div>
      )}

      {saQs.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-semibold text-ink-soft">주관식</p>
          {saQs.map((q) => {
            const score = scoreOf(q)
            return (
              <div key={q.id} className="bg-surface border border-line rounded p-4">
                <div className="flex justify-between items-center mb-2 gap-2">
                  <span className="font-semibold text-ink">{q.id}번{q.content ? ` — ${q.content}` : ''}</span>
                  <span className={`text-sm font-bold whitespace-nowrap ${
                    score === null ? 'text-ink-faint'
                    : score === q.points ? 'text-navy'
                    : score > 0 ? 'text-warn'
                    : 'text-danger'
                  }`}>
                    {score === null ? '채점 대기' : `${score} / ${q.points}점`}
                  </span>
                </div>
                <p className="text-sm text-ink-mute break-words">
                  내 답: <span className="text-ink font-medium">{answerOf(q) || '(미입력)'}</span>
                </p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ────────── GradeView 컴포넌트 ──────────
function GradeView({ test, submission, students, onSave, onBack }) {
  const student     = students.find((s) => s.id === submission.studentId)
  const totalPoints = sumPoints(test.questions.map((q) => q.points))
  const [saving, setSaving] = useState(false)

  // 객관식은 저장된 점수를 믿지 않고 늘 답안과 정답으로 다시 매긴다.
  // 2026-09-16~10-07에 학생 폰이 정답 없이 채점해 0점이 저장된 제출이 있는데,
  // 저장된 값을 그대로 쓰면 교사 화면도 0점으로 보이고 저장하면 그대로 굳는다.
  // 주관식만 저장된 점수를 이어받는다.
  const [localScores, setLocalScores] = useState(() =>
    test.questions.map((q) => {
      if (q.type === 'mc') {
        const ans = submission.answers.find((a) => a.questionId === q.id)
        // 다중 정답은 순서 무관 집합 비교 — 덜 골라도 더 골라도 0점이다
        return { questionId: q.id, score: sameChoiceSet(ans?.answer, q.answer) ? q.points : 0 }
      }
      const existing = submission.scores.find((s) => s.questionId === q.id)
      return existing ?? { questionId: q.id, score: 0 }
    })
  )

  const totalScore = sumPoints(localScores.map((s) => s.score))

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
                    step="0.1"
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
