# 주간 테스트 시스템 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 교사가 문항을 만들고 반 단위로 시간을 개시하면 학생이 응시·제출하고 교사가 채점하는 주간 테스트 시스템 구현

**Architecture:** Tests.jsx 단일 파일에 `view` 상태로 6개 화면 전환. Mock 데이터(tests.js, submissions.js)로 백엔드 없이 동작. 기존 Videos.jsx 패턴과 동일.

**Tech Stack:** React 19 + Vite, React Router DOM v7, Tailwind CSS v4, Vitest + React Testing Library

---

## 파일 구조

```
src/data/tests.js          ← 신규: 테스트 목록 + 문항
src/data/submissions.js    ← 신규: 학생 제출 + 채점
src/pages/Tests.jsx        ← 신규: 메인 페이지 (6개 view)
src/pages/Tests.test.jsx   ← 신규: 테스트
src/App.jsx                ← 수정: /tests 라우트 추가
src/components/Sidebar.jsx ← 수정: 테스트 메뉴 활성화
src/components/BottomNav.jsx ← 수정: 학생 테스트 탭 추가
```

---

## Task 1: Mock 데이터 생성

**Files:**
- Create: `src/data/tests.js`
- Create: `src/data/submissions.js`

- [ ] **Step 1: src/data/tests.js 생성**

```js
// src/data/tests.js
// 주간 테스트 Mock 데이터
// status: 'ready'(준비중) | 'active'(진행중) | 'closed'(종료)
// questions[].type: 'mc'(객관식) | 'sa'(주관식)
export const tests = [
  {
    id: 1,
    title: '4월 2주차 독서 테스트',
    classId: 1,
    teacherId: 2,
    date: '2026-04-12',
    timeLimit: 30,
    status: 'closed',
    startedAt: '2026-04-12T14:00:00',
    questions: [
      { id: 1, type: 'mc', content: '1번', choices: ['①', '②', '③', '④', '⑤'], answer: '③', points: 10 },
      { id: 2, type: 'mc', content: '2번', choices: ['①', '②', '③', '④', '⑤'], answer: '①', points: 10 },
      { id: 3, type: 'sa', content: '3번 (서술형)', choices: null, answer: null, points: 20 },
    ],
  },
  {
    id: 2,
    title: '4월 2주차 문학 테스트',
    classId: 2,
    teacherId: 2,
    date: '2026-04-12',
    timeLimit: 25,
    status: 'ready',
    startedAt: null,
    questions: [
      { id: 1, type: 'mc', content: '1번', choices: ['①', '②', '③', '④', '⑤'], answer: '②', points: 15 },
      { id: 2, type: 'mc', content: '2번', choices: ['①', '②', '③', '④', '⑤'], answer: '④', points: 15 },
      { id: 3, type: 'sa', content: '서술형 1번', choices: null, answer: null, points: 30 },
    ],
  },
  {
    id: 3,
    title: '4월 1주차 어휘 테스트',
    classId: 3,
    teacherId: 3,
    date: '2026-04-07',
    timeLimit: 20,
    status: 'closed',
    startedAt: '2026-04-07T15:00:00',
    questions: [
      { id: 1, type: 'mc', content: '1번', choices: ['①', '②', '③', '④', '⑤'], answer: '⑤', points: 20 },
      { id: 2, type: 'mc', content: '2번', choices: ['①', '②', '③', '④', '⑤'], answer: '②', points: 20 },
    ],
  },
]
```

- [ ] **Step 2: src/data/submissions.js 생성**

```js
// src/data/submissions.js
// 학생 제출 답안 및 채점 결과 Mock 데이터
// scores 배열이 비어있으면 미채점 상태
export const submissions = [
  {
    id: 1,
    testId: 1,
    studentId: 1,
    submittedAt: '2026-04-12T14:22:00',
    answers: [
      { questionId: 1, answer: '③' },
      { questionId: 2, answer: '②' },
      { questionId: 3, answer: '현대시의 주요 특징은 이미지와 리듬의 결합입니다.' },
    ],
    scores: [
      { questionId: 1, score: 10 },
      { questionId: 2, score: 0 },
      { questionId: 3, score: 15 },
    ],
  },
  {
    id: 2,
    testId: 1,
    studentId: 2,
    submittedAt: '2026-04-12T14:28:00',
    answers: [
      { questionId: 1, answer: '③' },
      { questionId: 2, answer: '①' },
      { questionId: 3, answer: '이미지와 감정 표현을 통해 독자에게 전달합니다.' },
    ],
    scores: [
      { questionId: 1, score: 10 },
      { questionId: 2, score: 10 },
      { questionId: 3, score: 18 },
    ],
  },
  {
    id: 3,
    testId: 1,
    studentId: 3,
    submittedAt: '2026-04-12T14:29:55',
    answers: [
      { questionId: 1, answer: '①' },
      { questionId: 2, answer: '①' },
      { questionId: 3, answer: '' },
    ],
    scores: [], // 미채점
  },
]
```

- [ ] **Step 3: 커밋**

```bash
git add src/data/tests.js src/data/submissions.js
git commit -m "feat: 테스트 시스템 Mock 데이터 추가"
```

---

## Task 2: 라우팅 & 메뉴 업데이트

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/components/Sidebar.jsx`
- Modify: `src/components/BottomNav.jsx`

- [ ] **Step 1: App.jsx에 /tests 라우트 추가**

`src/App.jsx` 상단 import에 추가:
```jsx
import Tests from './pages/Tests'
```

Videos 라우트 아래에 추가:
```jsx
{/* 테스트 (전체 역할) */}
<Route
  path="/tests"
  element={
    <ProtectedRoute allowedRoles={['admin', 'teacher', 'student']}>
      <Tests />
    </ProtectedRoute>
  }
/>
```

- [ ] **Step 2: Sidebar.jsx — 테스트 메뉴 활성화**

`src/components/Sidebar.jsx`에서 `navConfig`의 admin/teacher 배열에 영상 관리 아래 테스트 항목 추가:

```js
const navConfig = {
  admin: [
    { label: '대시보드', path: '/dashboard',  icon: '📊' },
    { label: '학생 관리', path: '/students',   icon: '👥' },
    { label: '반 관리',   path: '/students?tab=classes', icon: '🏫' },
    { label: '출결 관리', path: '/attendance', icon: '✅' },
    { label: '성적 관리', path: '/grades',     icon: '📝' },
    { label: '영상 관리', path: '/videos',     icon: '🎬' },
    { label: '테스트',    path: '/tests',      icon: '📋' },
  ],
  teacher: [
    { label: '대시보드', path: '/dashboard',  icon: '📊' },
    { label: '학생 관리', path: '/students',   icon: '👥' },
    { label: '반 관리',   path: '/students?tab=classes', icon: '🏫' },
    { label: '출결 관리', path: '/attendance', icon: '✅' },
    { label: '성적 관리', path: '/grades',     icon: '📝' },
    { label: '영상 관리', path: '/videos',     icon: '🎬' },
    { label: '테스트',    path: '/tests',      icon: '📋' },
  ],
  student: [],
}
```

`disabledItems` 배열에서 `'📋 테스트'` 제거:
```js
const disabledItems = ['💬 Q&A', '📢 공지사항', '📄 진도리포트']
```

- [ ] **Step 3: BottomNav.jsx — 학생 테스트 탭 추가**

```js
const tabs = [
  { label: '홈',    path: '/dashboard',  icon: '🏠' },
  { label: '출결',  path: '/attendance', icon: '✅' },
  { label: '성적',  path: '/grades',     icon: '📊' },
  { label: '영상',  path: '/videos',     icon: '🎬' },
  { label: '테스트', path: '/tests',     icon: '📋' },
]
```

- [ ] **Step 4: 커밋**

```bash
git add src/App.jsx src/components/Sidebar.jsx src/components/BottomNav.jsx
git commit -m "feat: 테스트 라우팅 추가 및 메뉴 활성화"
```

---

## Task 3: Tests.jsx 기반 구조 + list 뷰 (TDD)

**Files:**
- Create: `src/pages/Tests.test.jsx`
- Create: `src/pages/Tests.jsx`

- [ ] **Step 1: 실패하는 테스트 작성**

```jsx
// src/pages/Tests.test.jsx
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AuthContext } from '../context/AuthContext'
import Tests from './Tests'

function renderWithAuth(user) {
  return render(
    <AuthContext.Provider value={{ user, login: () => {}, logout: () => {} }}>
      <MemoryRouter>
        <Tests />
      </MemoryRouter>
    </AuthContext.Provider>
  )
}

describe('Tests — 교사 역할', () => {
  const teacher = { id: 2, name: '김선생', role: 'teacher' }

  it('"테스트 만들기" 버튼이 표시', () => {
    renderWithAuth(teacher)
    expect(screen.getByText('+ 테스트 만들기')).toBeInTheDocument()
  })

  it('테스트 목록이 표시 (Mock 데이터)', () => {
    renderWithAuth(teacher)
    expect(screen.getByText('4월 2주차 독서 테스트')).toBeInTheDocument()
  })

  it('"테스트 만들기" 클릭 시 생성 폼으로 전환', () => {
    renderWithAuth(teacher)
    fireEvent.click(screen.getByText('+ 테스트 만들기'))
    expect(screen.getByPlaceholderText('예: 4월 2주차 독서 테스트')).toBeInTheDocument()
  })

  it('테스트 제목 클릭 시 제출 목록으로 전환', () => {
    renderWithAuth(teacher)
    fireEvent.click(screen.getByText('4월 2주차 독서 테스트'))
    expect(screen.getByText('제출 목록')).toBeInTheDocument()
  })
})

describe('Tests — 학생 역할', () => {
  const student = { id: 4, name: '홍길동', role: 'student', classId: 1, studentId: 1 }

  it('"테스트 만들기" 버튼이 없음', () => {
    renderWithAuth(student)
    expect(screen.queryByText('+ 테스트 만들기')).toBeNull()
  })

  it('본인 반(classId:1) 테스트만 표시', () => {
    renderWithAuth(student)
    expect(screen.getByText('4월 2주차 독서 테스트')).toBeInTheDocument()
    expect(screen.queryByText('4월 2주차 문학 테스트')).toBeNull()
  })
})
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

```bash
npx vitest run src/pages/Tests.test.jsx
```

Expected: FAIL — `Tests` 모듈 없음

- [ ] **Step 3: Tests.jsx 생성 (list 뷰만 구현)**

```jsx
// src/pages/Tests.jsx
import { useState, useEffect, useRef } from 'react'
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
  const [selectedTest, setSelectedTest]           = useState(null)
  const [selectedSubmission, setSelectedSubmission] = useState(null)
  const [filterClassId, setFilterClassId]         = useState('all')

  // 학생은 본인 반만, 교사/관리자는 전체
  const accessibleClasses =
    user.role === 'student'
      ? classes.filter((c) => c.id === user.classId)
      : classes

  // 목록 필터 (반 + 학생 접근 제한)
  const filteredTests = tests.filter((t) => {
    const classMatch = filterClassId === 'all' || t.classId === Number(filterClassId)
    const accessMatch = user.role !== 'student' || t.classId === user.classId
    return classMatch && accessMatch
  })

  // 미채점 건수
  function ungradedCount(testId) {
    return submissions
      .filter((s) => s.testId === testId && s.scores.length === 0)
      .length
  }

  // 학생이 이미 제출했는지
  function mySubmission(testId) {
    return submissions.find(
      (s) => s.testId === testId && s.studentId === user.studentId
    )
  }

  // ────────── list 뷰 ──────────
  if (view === 'list') {
    return (
      <div>
        {/* 헤더 */}
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
              const cls = classes.find((c) => c.id === test.classId)
              const badge = statusBadge[test.status]
              const ungraded = ungradedCount(test.id)
              const mySub = mySubmission(test.id)

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
                    {/* 교사/관리자: 미채점 배지 + 시작/종료 버튼 */}
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
                    {/* 학생: 응시 상태 표시 */}
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

  // 나머지 view는 다음 Task에서 추가
  return null
}
```

- [ ] **Step 4: 테스트 실행 — 통과 확인**

```bash
npx vitest run src/pages/Tests.test.jsx
```

Expected: PASS (4개)

- [ ] **Step 5: 커밋**

```bash
git add src/pages/Tests.jsx src/pages/Tests.test.jsx
git commit -m "feat: Tests 목록 화면 구현 (TDD)"
```

---

## Task 4: create 뷰 구현

**Files:**
- Modify: `src/pages/Tests.jsx`

- [ ] **Step 1: Tests.jsx에 create 뷰 추가**

`return null` 바로 위에 create 뷰 블록 삽입:

```jsx
// ────────── create 뷰 ──────────
if (view === 'create') {
  return <CreateView
    classes={accessibleClasses}
    user={user}
    onSubmit={(newTest) => {
      setTests([{ ...newTest, id: tests.length + 1 }, ...tests])
      setView('list')
    }}
    onCancel={() => setView('list')}
  />
}
```

그리고 파일 맨 아래(export default 바깥)에 CreateView 컴포넌트 추가:

```jsx
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
    setQuestions(questions.map((q, i) => i === idx ? { ...q, [field]: value } : q))
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
        <button onClick={onCancel} className="text-sm text-gray-500 hover:text-gray-700">← 목록</button>
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
              <option key={c.id} value={String(c.id)}>{c.name}</option>
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

              {/* 문항 내용 */}
              <input
                value={q.content}
                onChange={(e) => updateQuestion(idx, 'content', e.target.value)}
                placeholder={`${idx + 1}번 문항 내용 (참고용)`}
                className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm mb-2 focus:outline-none focus:ring-1 focus:ring-[#5B8FD4]"
              />

              {/* 객관식: 정답 선택 */}
              {q.type === 'mc' && (
                <div className="flex gap-2 mb-2">
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

              {/* 배점 */}
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

        {/* 저장 버튼 */}
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
```

- [ ] **Step 2: 개발 서버에서 동작 확인**

```bash
npm run dev
```

`http://localhost:5173` → 교사 로그인 → 테스트 → "+ 테스트 만들기" 클릭 → 문항 추가 → 저장 확인

- [ ] **Step 3: 커밋**

```bash
git add src/pages/Tests.jsx
git commit -m "feat: 테스트 만들기 화면 구현"
```

---

## Task 5: take 뷰 + 타이머 구현

**Files:**
- Modify: `src/pages/Tests.jsx`

- [ ] **Step 1: Tests.jsx에 take 뷰 추가**

`return null` 바로 위에 take 뷰 블록 삽입:

```jsx
// ────────── take 뷰 (학생 응시) ──────────
if (view === 'take') {
  return <TakeView
    test={selectedTest}
    user={user}
    onSubmit={(answers) => {
      // 객관식 자동 채점, 주관식은 빈 scores
      const scores = selectedTest.questions.map((q) => {
        if (q.type === 'mc') {
          const ans = answers.find((a) => a.questionId === q.id)
          return { questionId: q.id, score: ans?.answer === q.answer ? q.points : 0 }
        }
        return null // 주관식은 교사 채점 대기
      }).filter(Boolean)

      const hasSA = selectedTest.questions.some((q) => q.type === 'sa')

      const newSub = {
        id: submissions.length + 1,
        testId: selectedTest.id,
        studentId: user.studentId,
        submittedAt: new Date().toISOString(),
        answers,
        scores: hasSA ? [] : scores, // 주관식 있으면 미채점 상태
      }
      setSubmissions([...submissions, newSub])
      setView('list')
    }}
    onBack={() => setView('list')}
  />
}
```

파일 맨 아래에 TakeView 컴포넌트 추가:

```jsx
// ────────── TakeView 컴포넌트 ──────────
function TakeView({ test, user, onSubmit, onBack }) {
  const [answers, setAnswers] = useState(
    test.questions.map((q) => ({ questionId: q.id, answer: '' }))
  )
  const [timeLeft, setTimeLeft] = useState(null)
  const submitted = useRef(false)

  function calcTimeLeft() {
    if (!test.startedAt || !test.timeLimit) return null
    const endTime = new Date(test.startedAt).getTime() + test.timeLimit * 60 * 1000
    return Math.max(0, Math.floor((endTime - Date.now()) / 1000))
  }

  function handleSubmit() {
    if (submitted.current) return
    submitted.current = true
    onSubmit(answers)
  }

  useEffect(() => {
    if (!test.startedAt || !test.timeLimit) return
    setTimeLeft(calcTimeLeft())
    const interval = setInterval(() => {
      const left = calcTimeLeft()
      setTimeLeft(left)
      if (left <= 0) {
        clearInterval(interval)
        handleSubmit()
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  function formatTime(sec) {
    if (sec === null) return ''
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  function setAnswer(questionId, answer) {
    setAnswers(answers.map((a) => a.questionId === questionId ? { ...a, answer } : a))
  }

  return (
    <div>
      {/* 헤더 */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <button onClick={onBack} className="text-sm text-gray-500 hover:text-gray-700 mb-1">← 목록</button>
          <h1 className="text-xl font-bold text-[#2B2B2B]">{test.title}</h1>
        </div>
        {timeLeft !== null && (
          <div className={`text-xl font-mono font-bold px-4 py-2 rounded-xl ${
            timeLeft <= 60 ? 'bg-red-100 text-[#C0392B]' : 'bg-gray-100 text-[#2B2B2B]'
          }`}>
            {formatTime(timeLeft)}
          </div>
        )}
      </div>

      {/* 문항 */}
      <div className="flex flex-col gap-4 mb-8">
        {test.questions.map((q, idx) => {
          const myAnswer = answers.find((a) => a.questionId === q.id)?.answer ?? ''
          return (
            <div key={q.id} className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex justify-between items-center mb-3">
                <span className="font-semibold text-[#2B2B2B]">{idx + 1}번 {q.content && `— ${q.content}`}</span>
                <span className="text-xs text-gray-400">{q.points}점 · {q.type === 'mc' ? '객관식' : '주관식'}</span>
              </div>

              {q.type === 'mc' ? (
                <div className="flex gap-2 flex-wrap">
                  {q.choices.map((c) => (
                    <button
                      key={c}
                      onClick={() => setAnswer(q.id, c)}
                      className={`w-10 h-10 rounded-full text-base font-medium transition-colors ${
                        myAnswer === c
                          ? 'bg-[#2B2B2B] text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
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
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5B8FD4] resize-none"
                />
              )}
            </div>
          )
        })}
      </div>

      {/* 제출 버튼 */}
      <button
        onClick={handleSubmit}
        className="w-full py-3 bg-[#2B2B2B] text-white rounded-xl font-medium"
      >
        제출하기
      </button>
    </div>
  )
}
```

- [ ] **Step 2: 개발 서버에서 동작 확인**

```bash
npm run dev
```

학생(student1/1234) 로그인 → 테스트 → `active` 상태 테스트 클릭 → 응시 화면 진입 확인.  
※ Mock 데이터에 `active` 상태 테스트가 없으면 Sidebar에서 테스트 목록의 "시작" 버튼 클릭 후 확인.

- [ ] **Step 3: 커밋**

```bash
git add src/pages/Tests.jsx
git commit -m "feat: 학생 응시 화면 + 타이머 구현"
```

---

## Task 6: submissions + grade 뷰 구현

**Files:**
- Modify: `src/pages/Tests.jsx`

- [ ] **Step 1: Tests.jsx에 submissions 뷰 추가**

`return null` 바로 위에 삽입:

```jsx
// ────────── submissions 뷰 (제출 목록) ──────────
if (view === 'submissions') {
  const testSubs = submissions.filter((s) => s.testId === selectedTest.id)
  const totalPoints = selectedTest.questions.reduce((sum, q) => sum + q.points, 0)

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => setView('list')} className="text-sm text-gray-500 hover:text-gray-700">← 목록</button>
        <h1 className="text-xl font-bold text-[#2B2B2B]">{selectedTest.title}</h1>
      </div>
      <h2 className="text-base font-semibold text-gray-700 mb-4">제출 목록</h2>

      {testSubs.length === 0 ? (
        <p className="text-center text-gray-400 py-12">제출한 학생이 없습니다.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {testSubs.map((sub) => {
            const student = students.find((s) => s.id === sub.studentId)
            const isGraded = sub.scores.length > 0
            const totalScore = sub.scores.reduce((sum, s) => sum + s.score, 0)

            return (
              <div
                key={sub.id}
                onClick={() => {
                  setSelectedSubmission(sub)
                  setView('grade')
                }}
                className="bg-white rounded-xl p-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow flex justify-between items-center"
              >
                <div>
                  <p className="font-medium text-[#2B2B2B]">{student?.name ?? '알 수 없음'}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{sub.submittedAt.slice(0, 16).replace('T', ' ')}</p>
                </div>
                <div className="text-right">
                  {isGraded ? (
                    <>
                      <p className="font-bold text-[#2B2B2B]">{totalScore}점</p>
                      <p className="text-xs text-gray-400">/ {totalPoints}점</p>
                    </>
                  ) : (
                    <span className="text-xs bg-[#C0392B] text-white px-2 py-0.5 rounded-full">미채점</span>
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
```

- [ ] **Step 2: Tests.jsx에 grade 뷰 추가**

`return null` 바로 위에 삽입 (GradeView 컴포넌트로 분리 — `useState`를 조건문 안에서 쓰면 Hooks 규칙 위반이므로):

```jsx
// ────────── grade 뷰 (채점) ──────────
if (view === 'grade') {
  return (
    <GradeView
      test={selectedTest}
      submission={selectedSubmission}
      students={students}
      onSave={(updatedScores) => {
        setSubmissions(submissions.map((s) =>
          s.id === selectedSubmission.id ? { ...s, scores: updatedScores } : s
        ))
        setView('submissions')
      }}
      onBack={() => setView('submissions')}
    />
  )
}
```

파일 맨 아래에 GradeView 컴포넌트 추가:

```jsx
// ────────── GradeView 컴포넌트 ──────────
function GradeView({ test, submission, students, onSave, onBack }) {
  const student = students.find((s) => s.id === submission.studentId)
  const totalPoints = test.questions.reduce((sum, q) => sum + q.points, 0)

  const [localScores, setLocalScores] = useState(() =>
    test.questions.map((q) => {
      const existing = submission.scores.find((s) => s.questionId === q.id)
      if (existing) return existing
      if (q.type === 'mc') {
        const ans = submission.answers.find((a) => a.questionId === q.id)
        return { questionId: q.id, score: ans?.answer === q.answer ? q.points : 0 }
      }
      return { questionId: q.id, score: 0 }
    })
  )

  const totalScore = localScores.reduce((sum, s) => sum + s.score, 0)

  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <button onClick={onBack} className="text-sm text-gray-500 hover:text-gray-700">← 제출 목록</button>
      </div>
      <h1 className="text-xl font-bold text-[#2B2B2B] mb-1">채점</h1>
      <p className="text-sm text-gray-500 mb-6">{student?.name} · {test.title}</p>

      <div className="flex flex-col gap-4 mb-6">
        {test.questions.map((q, idx) => {
          const ans = submission.answers.find((a) => a.questionId === q.id)?.answer ?? ''
          const scoreEntry = localScores.find((s) => s.questionId === q.id)
          const isCorrect = q.type === 'mc' && ans === q.answer

          return (
            <div key={q.id} className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex justify-between items-center mb-2">
                <span className="font-semibold text-[#2B2B2B]">{idx + 1}번 {q.content && `— ${q.content}`}</span>
                <span className="text-xs text-gray-400">{q.points}점</span>
              </div>

              <p className="text-sm text-gray-600 mb-2">
                제출 답안: <span className="font-medium text-[#2B2B2B]">{ans || '(미입력)'}</span>
              </p>

              {q.type === 'mc' ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">정답: {q.answer}</span>
                  <span className={`text-xs font-bold ${isCorrect ? 'text-green-600' : 'text-[#C0392B]'}`}>
                    {isCorrect ? `✓ ${q.points}점` : '✗ 0점'}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">점수 입력:</span>
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
                    className="w-16 border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-[#5B8FD4]"
                  />
                  <span className="text-xs text-gray-500">/ {q.points}점</span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="flex justify-between items-center bg-white rounded-xl p-4 shadow-sm mb-4">
        <span className="font-semibold text-gray-700">총점</span>
        <span className="text-xl font-bold text-[#2B2B2B]">{totalScore} / {totalPoints}점</span>
      </div>

      <button
        onClick={() => onSave(localScores)}
        className="w-full py-3 bg-[#2B2B2B] text-white rounded-xl font-medium"
      >
        채점 저장
      </button>
    </div>
  )
}
```

- [ ] **Step 3: 개발 서버에서 동작 확인**

교사 로그인 → 테스트 → "4월 2주차 독서 테스트" 클릭 → 제출 목록 확인 → 미채점 학생 클릭 → 채점 후 저장

- [ ] **Step 4: 커밋**

```bash
git add src/pages/Tests.jsx
git commit -m "feat: 제출 목록 및 채점 화면 구현"
```

---

## Task 7: result 뷰 + 전체 테스트

**Files:**
- Modify: `src/pages/Tests.jsx`

- [ ] **Step 1: Tests.jsx에 result 뷰 추가**

`return null` 바로 위에 삽입:

```jsx
// ────────── result 뷰 (학생 결과 확인) ──────────
if (view === 'result') {
  const mySub = submissions.find(
    (s) => s.testId === selectedTest.id && s.studentId === user.studentId
  )
  const totalPoints = selectedTest.questions.reduce((sum, q) => sum + q.points, 0)
  const totalScore = mySub?.scores.reduce((sum, s) => sum + s.score, 0) ?? 0

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => setView('list')} className="text-sm text-gray-500 hover:text-gray-700">← 목록</button>
        <h1 className="text-xl font-bold text-[#2B2B2B]">{selectedTest.title} — 결과</h1>
      </div>

      {/* 총점 카드 */}
      <div className="bg-[#2B2B2B] text-white rounded-2xl p-6 text-center mb-6">
        <p className="text-sm text-white/60 mb-1">총점</p>
        <p className="text-4xl font-bold">{totalScore}점</p>
        <p className="text-sm text-white/60 mt-1">/ {totalPoints}점</p>
      </div>

      {/* 문항별 정오표 */}
      <div className="flex flex-col gap-3">
        {selectedTest.questions.map((q, idx) => {
          const ans = mySub?.answers.find((a) => a.questionId === q.id)?.answer ?? ''
          const scoreEntry = mySub?.scores.find((s) => s.questionId === q.id)
          const score = scoreEntry?.score ?? null

          const isCorrect = q.type === 'mc' ? ans === q.answer : null

          return (
            <div key={q.id} className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex justify-between items-center mb-2">
                <span className="font-semibold text-[#2B2B2B]">{idx + 1}번</span>
                <span className={`text-sm font-bold ${
                  score === null ? 'text-gray-400'
                  : score === q.points ? 'text-green-600'
                  : score > 0 ? 'text-[#5B8FD4]'
                  : 'text-[#C0392B]'
                }`}>
                  {score === null ? '채점 대기' : `${score} / ${q.points}점`}
                </span>
              </div>
              <p className="text-sm text-gray-500">
                내 답: <span className="text-[#2B2B2B] font-medium">{ans || '(미입력)'}</span>
              </p>
              {q.type === 'mc' && (
                <p className="text-sm text-gray-500">
                  정답: <span className="text-green-600 font-medium">{q.answer}</span>
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
```

- [ ] **Step 2: 전체 테스트 실행**

```bash
npx vitest run
```

Expected: PASS (기존 테스트 포함 전체)

- [ ] **Step 3: 개발 서버 최종 확인**

```bash
npm run dev
```

확인 체크리스트:
- 교사 로그인 → 테스트 목록 → 반 필터 작동
- 교사 → "시작" 버튼 → 상태가 "진행중"으로 변경
- 교사 → 테스트 만들기 → 문항 추가 → 저장 → 목록에 표시
- 학생(student1/1234) → 본인 반 테스트만 표시
- 학생 → active 테스트 클릭 → 응시 → 제출
- 교사 → 제출 목록 → 채점 → 저장
- 학생 → 결과 확인

- [ ] **Step 4: 최종 커밋**

```bash
git add src/pages/Tests.jsx
git commit -m "feat: 학생 결과 화면 구현 — 주간 테스트 시스템 완성"
```

---

## 완료 기준

- [ ] `npx vitest run` — 전체 PASS
- [ ] 교사가 테스트를 만들고 시작 버튼으로 반 전체 카운트다운 개시
- [ ] 학생이 응시 후 제출 (타이머 자동 제출 포함)
- [ ] 교사가 주관식 채점 저장
- [ ] 학생이 결과 확인 (문항별 정오표 + 총점)
