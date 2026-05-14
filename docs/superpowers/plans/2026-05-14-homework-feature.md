# 과제(Homework) 기능 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 학생이 객관식 문제를 풀어 제출해야만 클리어되는 독립된 "과제" 기능을 추가한다.

**Architecture:** 새 페이지 `Homework.jsx`(역할 분기), 재사용 컴포넌트 `ChoiceGrid`(키보드/클릭 입력 격자), 순수 유틸 `homework.js`(채점·지각판정). 데이터는 Supabase 새 테이블 2개(`homework`, `homework_submissions`)에 저장하고 `DataContext`로 앱 전체에 제공. 기존 `Tests.jsx` / `Reports.jsx` 패턴을 그대로 따른다.

**Tech Stack:** React 19, react-router-dom 7, Tailwind CSS 4, Supabase JS, Vitest + Testing Library, lucide-react.

---

## 테스트 전략 메모

이 프로젝트는 순수 컴포넌트 테스트(`VideoCard.test.jsx`)만 안정적으로 동작한다. 페이지 테스트(`Tests.test.jsx`)는 `DataProvider` 없이 렌더해서 현재 깨져 있을 수 있다. 따라서:

- **순수 유닛(`homework.js` 유틸, `ChoiceGrid` 컴포넌트)**: TDD로 작성한다.
- **`DataContext`, `Homework.jsx` 페이지, 라우팅/네비**: 자동 테스트 대신 명시된 수동 검증 절차로 확인한다.

테스트 실행 명령: `npx vitest run <경로>` (package.json에 test 스크립트 없음).

---

## File Structure

| 파일 | 책임 |
|---|---|
| `docs/homework-tables.sql` (Create) | 사용자가 Supabase에서 실행할 테이블 생성 SQL |
| `src/utils/homework.js` (Create) | 순수 함수: `gradeHomework`, `isLateSubmission` |
| `src/utils/homework.test.js` (Create) | 위 유틸 테스트 |
| `src/components/ChoiceGrid.jsx` (Create) | ①②③④⑤ 선택 격자 (input/result 모드, 키보드+클릭) |
| `src/components/ChoiceGrid.test.jsx` (Create) | ChoiceGrid 테스트 |
| `src/context/DataContext.jsx` (Modify) | homework 상태·변환·로드·CRUD 추가 |
| `src/pages/Homework.jsx` (Create) | 과제 페이지 — 역할 분기, list/create/submissions/detail/take/result 뷰 |
| `src/App.jsx` (Modify) | `/homework` 라우트 추가 |
| `src/components/Sidebar.jsx` (Modify) | "수업" 섹션에 "과제" 메뉴 추가 |
| `src/components/BottomNav.jsx` (Modify) | "과제" 탭 추가 |

---

## Task 1: Supabase 테이블 생성 SQL 작성

**Files:**
- Create: `docs/homework-tables.sql`

- [ ] **Step 1: SQL 파일 작성**

`docs/homework-tables.sql`:

```sql
-- 과제(Homework) 기능 테이블
-- Supabase 대시보드 → SQL Editor 에 붙여넣고 실행하세요.

-- 과제 자체
create table if not exists homework (
  id          bigint generated always as identity primary key,
  title       text   not null,
  class_id    bigint references classes(id) on delete cascade,
  teacher_id  uuid,
  due_date    date   not null,
  questions   jsonb  not null default '[]',  -- [{ "number": 1, "answer": "③" }, ...]
  created_at  timestamptz not null default now()
);

-- 학생 제출
create table if not exists homework_submissions (
  id           bigint generated always as identity primary key,
  homework_id  bigint references homework(id) on delete cascade,
  student_id   bigint references students(id) on delete cascade,
  answers      jsonb  not null default '[]', -- [{ "number": 1, "answer": "②" }, ...]
  submitted_at timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (homework_id, student_id)
);

-- RLS (기존 tests / submissions 테이블과 동일한 허용형 정책)
alter table homework enable row level security;
alter table homework_submissions enable row level security;

create policy "homework_all" on homework
  for all using (true) with check (true);
create policy "homework_submissions_all" on homework_submissions
  for all using (true) with check (true);
```

> 참고: `teacher_id` 컬럼 타입은 기존 `tests` 테이블의 `teacher_id`와 동일하게 맞추세요. 위는 `uuid` 기준입니다. 만약 `tests.teacher_id`가 다른 타입이면 그 타입으로 바꿔 실행하세요.

- [ ] **Step 2: 사용자에게 실행 요청**

이 SQL은 코드가 아니라 사용자가 Supabase 대시보드에서 직접 실행해야 한다. 구현 진행자는 이 파일을 사용자에게 안내하고, 사용자가 "실행 완료"를 확인하기 전까지는 Task 4의 수동 검증을 보류한다. (코드 작성 Task 2·3은 DB 없이 진행 가능)

- [ ] **Step 3: Commit**

```bash
git add docs/homework-tables.sql
git commit -m "docs: 과제 기능 Supabase 테이블 생성 SQL 추가"
```

---

## Task 2: 과제 유틸 함수 (채점 · 지각 판정)

**Files:**
- Create: `src/utils/homework.js`
- Test: `src/utils/homework.test.js`

- [ ] **Step 1: 실패하는 테스트 작성**

`src/utils/homework.test.js`:

```js
// src/utils/homework.test.js
import { describe, it, expect } from 'vitest'
import { gradeHomework, isLateSubmission } from './homework'

describe('gradeHomework', () => {
  const questions = [
    { number: 1, answer: '③' },
    { number: 2, answer: '①' },
    { number: 3, answer: '⑤' },
  ]

  it('정답/오답을 문항별로 판정하고 정답 개수를 센다', () => {
    const answers = [
      { number: 1, answer: '③' }, // 정답
      { number: 2, answer: '④' }, // 오답
      { number: 3, answer: '⑤' }, // 정답
    ]
    const result = gradeHomework(questions, answers)
    expect(result.total).toBe(3)
    expect(result.correctCount).toBe(2)
    expect(result.results).toEqual([
      { number: 1, correct: true,  studentAnswer: '③' },
      { number: 2, correct: false, studentAnswer: '④' },
      { number: 3, correct: true,  studentAnswer: '⑤' },
    ])
  })

  it('답을 안 낸 문항은 studentAnswer=null, 오답 처리', () => {
    const answers = [{ number: 1, answer: '③' }]
    const result = gradeHomework(questions, answers)
    expect(result.correctCount).toBe(1)
    expect(result.results[1]).toEqual({ number: 2, correct: false, studentAnswer: null })
  })
})

describe('isLateSubmission', () => {
  it('제출일이 마감일보다 늦으면 true', () => {
    expect(isLateSubmission('2026-05-20T09:00:00.000Z', '2026-05-15')).toBe(true)
  })
  it('제출일이 마감일과 같거나 빠르면 false', () => {
    expect(isLateSubmission('2026-05-15T23:59:00.000Z', '2026-05-15')).toBe(false)
    expect(isLateSubmission('2026-05-10T09:00:00.000Z', '2026-05-15')).toBe(false)
  })
  it('값이 없으면 false', () => {
    expect(isLateSubmission(null, '2026-05-15')).toBe(false)
    expect(isLateSubmission('2026-05-20T09:00:00.000Z', null)).toBe(false)
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run src/utils/homework.test.js`
Expected: FAIL — `homework.js` 모듈 없음 / export 없음

- [ ] **Step 3: 최소 구현 작성**

`src/utils/homework.js`:

```js
// src/utils/homework.js
// 과제 채점·지각 판정 순수 함수 (DB·UI 의존성 없음)

// 학생 답안을 정답표와 비교해 문항별 정답 여부와 정답 개수를 계산한다.
// questions: [{ number, answer }]  /  answers: [{ number, answer }]
export function gradeHomework(questions, answers) {
  const answerMap = Object.fromEntries((answers ?? []).map((a) => [a.number, a.answer]))
  const results = questions.map((q) => {
    const studentAnswer = answerMap[q.number] ?? null
    return {
      number: q.number,
      correct: studentAnswer === q.answer,
      studentAnswer,
    }
  })
  return {
    results,
    correctCount: results.filter((r) => r.correct).length,
    total: questions.length,
  }
}

// 제출 시각(ISO 문자열)이 마감일(YYYY-MM-DD)보다 늦으면 지각 제출이다.
export function isLateSubmission(submittedAt, dueDate) {
  if (!submittedAt || !dueDate) return false
  return submittedAt.slice(0, 10) > dueDate
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/utils/homework.test.js`
Expected: PASS — 5 tests passed

- [ ] **Step 5: Commit**

```bash
git add src/utils/homework.js src/utils/homework.test.js
git commit -m "feat: 과제 채점·지각 판정 유틸 추가"
```

---

## Task 3: ChoiceGrid 재사용 컴포넌트

**Files:**
- Create: `src/components/ChoiceGrid.jsx`
- Test: `src/components/ChoiceGrid.test.jsx`

`ChoiceGrid` API:
- `count` (number): 문항 수
- `values` (object): 현재 선택값 `{ [number]: '③' }`
- `onChange` (function): `(number, choice) => void` — `mode='input'`일 때만 호출
- `mode` (string): `'input'`(입력 가능) | `'result'`(읽기 전용 + 정답 비교)
- `answerKey` (object, 선택): `{ [number]: '③' }` — `mode='result'`에서 정답/오답 표시용

상수: `CHOICES = ['①','②','③','④','⑤']`. 키보드 `1`~`5` → `CHOICES[n-1]`.

- [ ] **Step 1: 실패하는 테스트 작성**

`src/components/ChoiceGrid.test.jsx`:

```jsx
// src/components/ChoiceGrid.test.jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ChoiceGrid from './ChoiceGrid'

describe('ChoiceGrid — input 모드', () => {
  it('count만큼 문항 행을 렌더링한다', () => {
    render(<ChoiceGrid count={3} values={{}} mode="input" onChange={() => {}} />)
    expect(screen.getByText('1번')).toBeInTheDocument()
    expect(screen.getByText('2번')).toBeInTheDocument()
    expect(screen.getByText('3번')).toBeInTheDocument()
  })

  it('선지 클릭 시 onChange(number, choice)를 호출한다', () => {
    const onChange = vi.fn()
    render(<ChoiceGrid count={2} values={{}} mode="input" onChange={onChange} />)
    // 1번 문항의 ③ 버튼 클릭
    const cell = screen.getByTestId('cell-1')
    fireEvent.click(within(cell).getByText('③'))
    expect(onChange).toHaveBeenCalledWith(1, '③')
  })

  it('키보드 숫자키로 포커스된 칸의 값을 설정하고 다음 칸으로 이동한다', () => {
    const onChange = vi.fn()
    render(<ChoiceGrid count={3} values={{}} mode="input" onChange={onChange} />)
    const grid = screen.getByTestId('choice-grid')
    grid.focus()
    fireEvent.keyDown(grid, { key: '3' })
    expect(onChange).toHaveBeenCalledWith(1, '③')
    fireEvent.keyDown(grid, { key: '1' })
    expect(onChange).toHaveBeenCalledWith(2, '①')
  })

  it('values에 담긴 선택값이 강조 표시된다', () => {
    render(<ChoiceGrid count={1} values={{ 1: '②' }} mode="input" onChange={() => {}} />)
    const selected = screen.getByTestId('cell-1-②')
    expect(selected.className).toMatch(/bg-\[#2B2B2B\]/)
  })
})

describe('ChoiceGrid — result 모드', () => {
  it('정답은 초록, 학생 오답은 빨강으로 표시한다', () => {
    render(
      <ChoiceGrid
        count={2}
        mode="result"
        values={{ 1: '③', 2: '①' }}
        answerKey={{ 1: '③', 2: '④' }}
        onChange={() => {}}
      />
    )
    expect(screen.getByTestId('cell-1-③').className).toMatch(/bg-green/)
    expect(screen.getByTestId('cell-2-①').className).toMatch(/bg-red|C0392B/)
    // 2번의 실제 정답 ④ 는 초록 테두리로 표시
    expect(screen.getByTestId('cell-2-④').className).toMatch(/green/)
  })

  it('result 모드에서는 클릭해도 onChange가 호출되지 않는다', () => {
    const onChange = vi.fn()
    render(
      <ChoiceGrid count={1} mode="result" values={{ 1: '③' }} answerKey={{ 1: '③' }} onChange={onChange} />
    )
    fireEvent.click(screen.getByTestId('cell-1-①'))
    expect(onChange).not.toHaveBeenCalled()
  })
})
```

> `within`는 `@testing-library/react`에서 import 해야 한다. import 줄을 `import { render, screen, fireEvent, within } from '@testing-library/react'` 로 작성한다.

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run src/components/ChoiceGrid.test.jsx`
Expected: FAIL — `ChoiceGrid` 컴포넌트 없음

- [ ] **Step 3: ChoiceGrid 구현 작성**

`src/components/ChoiceGrid.jsx`:

```jsx
// src/components/ChoiceGrid.jsx
// ①②③④⑤ 객관식 선택 격자 — 과제/테스트 공용 재사용 컴포넌트
// mode='input'  : 입력 가능 (클릭 + 키보드 1~5, 화살표 이동)
// mode='result' : 읽기 전용, answerKey와 비교해 정답/오답 표시
import { useState } from 'react'

export const CHOICES = ['①', '②', '③', '④', '⑤']

export default function ChoiceGrid({ count, values = {}, onChange, mode = 'input', answerKey = {} }) {
  // 키보드 입력 중인 칸 (1-based 문항 번호)
  const [focused, setFocused] = useState(1)
  const numbers = Array.from({ length: count }, (_, i) => i + 1)

  function handleKeyDown(e) {
    if (mode !== 'input') return
    if (e.key >= '1' && e.key <= '5') {
      e.preventDefault()
      onChange(focused, CHOICES[Number(e.key) - 1])
      setFocused((n) => Math.min(count, n + 1)) // 자동으로 다음 칸
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      e.preventDefault()
      setFocused((n) => Math.min(count, n + 1))
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault()
      setFocused((n) => Math.max(1, n - 1))
    }
  }

  // 한 선지 버튼의 색상 클래스 결정
  function cellClass(number, choice) {
    const picked = values[number] === choice
    if (mode === 'result') {
      const correctChoice = answerKey[number]
      if (choice === correctChoice && picked) return 'bg-green-500 text-white'      // 맞게 고름
      if (choice === correctChoice) return 'border-2 border-green-500 text-green-600' // 실제 정답 표시
      if (picked) return 'bg-[#C0392B] text-white'                                   // 틀리게 고름
      return 'bg-gray-100 text-gray-400'
    }
    return picked ? 'bg-[#2B2B2B] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
  }

  return (
    <div
      data-testid="choice-grid"
      tabIndex={mode === 'input' ? 0 : -1}
      onKeyDown={handleKeyDown}
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5 focus:outline-none"
    >
      {numbers.map((number) => {
        const isFocused = mode === 'input' && number === focused
        return (
          <div
            key={number}
            data-testid={`cell-${number}`}
            onClick={() => mode === 'input' && setFocused(number)}
            className={`flex items-center gap-2 px-2 py-1.5 rounded-lg ${
              isFocused ? 'ring-2 ring-[#5B8FD4] bg-[#5B8FD4]/5' : ''
            }`}
          >
            <span className="text-xs font-semibold text-gray-500 w-7 shrink-0">{number}번</span>
            <div className="flex gap-1">
              {CHOICES.map((choice) => (
                <button
                  key={choice}
                  type="button"
                  data-testid={`cell-${number}-${choice}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    if (mode !== 'input') return
                    setFocused(number)
                    onChange(number, choice)
                  }}
                  className={`w-7 h-7 rounded-full text-sm font-medium transition-colors ${cellClass(number, choice)}`}
                >
                  {choice}
                </button>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/components/ChoiceGrid.test.jsx`
Expected: PASS — 6 tests passed

- [ ] **Step 5: Commit**

```bash
git add src/components/ChoiceGrid.jsx src/components/ChoiceGrid.test.jsx
git commit -m "feat: ChoiceGrid 객관식 선택 격자 컴포넌트 추가"
```

---

## Task 4: DataContext에 homework 상태·CRUD 추가

**Files:**
- Modify: `src/context/DataContext.jsx`

- [ ] **Step 1: 변환 함수 추가**

`src/context/DataContext.jsx`의 `toSubmission` 함수 바로 아래(약 121번째 줄 뒤)에 추가:

```js
function toHomework(h) {
  return {
    id:        h.id,
    title:     h.title,
    classId:   h.class_id,
    teacherId: h.teacher_id,
    dueDate:   h.due_date,
    questions: h.questions ?? [],
    createdAt: h.created_at,
  }
}
function toHomeworkSubmission(s) {
  return {
    id:          s.id,
    homeworkId:  s.homework_id,
    studentId:   s.student_id,
    answers:     s.answers ?? [],
    submittedAt: s.submitted_at,
    updatedAt:   s.updated_at,
  }
}
```

- [ ] **Step 2: 상태 추가**

`const [submissions, setSubmissions] = useState([])` 줄 바로 아래에 추가:

```js
  const [homework,            setHomework]            = useState([])
  const [homeworkSubmissions, setHomeworkSubmissions] = useState([])
```

- [ ] **Step 3: 초기 로드에 추가**

`load()` 함수의 `Promise.all([...])` 배열 마지막 항목(`supabase.from('submissions')...`) 뒤에 콤마를 찍고 추가:

```js
          supabase.from('homework').select('*').order('created_at', { ascending: false }),
          supabase.from('homework_submissions').select('*').order('submitted_at', { ascending: false }),
```

그리고 구조분해 배열에 `hwRes, hwSubRes`를 추가한다. 즉:

```js
      const [cRes, sRes, aRes, gRes, qRes, nRes, rRes, pRes, vRes, vcRes, tRes, subRes, hwRes, hwSubRes] =
        await Promise.all([
```

`if (!subRes.error ...)` 줄 아래에 추가:

```js
      if (!hwRes.error && hwRes.data)       setHomework(hwRes.data.map(toHomework))
      if (!hwSubRes.error && hwSubRes.data) setHomeworkSubmissions(hwSubRes.data.map(toHomeworkSubmission))
```

- [ ] **Step 4: CRUD 함수 추가**

`updateSubmissionScores` 함수 바로 아래(약 540번째 줄 뒤), `// ── 순서 변경 ──` 주석 위에 추가:

```js
  // ── 과제 CRUD ──────────────────────────────────────────

  async function addHomework(data) {
    const { data: inserted, error } = await supabase
      .from('homework')
      .insert([{
        title:      data.title,
        class_id:   data.classId   ?? null,
        teacher_id: data.teacherId ?? null,
        due_date:   data.dueDate,
        questions:  data.questions ?? [],
      }])
      .select()
      .single()

    if (error) { console.error('과제 추가 실패:', error); return null }
    const newHw = toHomework(inserted)
    setHomework((prev) => [newHw, ...prev])
    return newHw
  }

  async function deleteHomework(id) {
    const { error } = await supabase.from('homework').delete().eq('id', id)
    if (error) { console.error('과제 삭제 실패:', error); return }
    setHomework((prev) => prev.filter((h) => h.id !== id))
    setHomeworkSubmissions((prev) => prev.filter((s) => s.homeworkId !== id))
  }

  async function upsertHomeworkSubmission(data) {
    const now = new Date().toISOString()
    const { data: upserted, error } = await supabase
      .from('homework_submissions')
      .upsert(
        {
          homework_id: data.homeworkId,
          student_id:  data.studentId,
          answers:     data.answers ?? [],
          updated_at:  now,
        },
        { onConflict: 'homework_id,student_id' }
      )
      .select()
      .single()

    if (error) { console.error('과제 제출 실패:', error); return null }
    const record = toHomeworkSubmission(upserted)
    setHomeworkSubmissions((prev) => {
      const exists = prev.some((s) => s.homeworkId === data.homeworkId && s.studentId === data.studentId)
      return exists
        ? prev.map((s) => (s.homeworkId === data.homeworkId && s.studentId === data.studentId ? record : s))
        : [record, ...prev]
    })
    return record
  }
```

- [ ] **Step 5: Provider value에 노출**

`return (` 안의 `<DataContext.Provider value={{ ... }}>` 객체에서 `addSubmission, updateSubmissionScores,` 줄 아래에 추가:

```js
      homework, homeworkSubmissions,
      addHomework, deleteHomework, upsertHomeworkSubmission,
```

- [ ] **Step 6: 빌드로 문법 검증**

Run: `npm run build`
Expected: 빌드 성공 (에러 없음). 실패 시 추가한 코드의 콤마/괄호를 점검한다.

- [ ] **Step 7: Commit**

```bash
git add src/context/DataContext.jsx
git commit -m "feat: DataContext에 과제 상태·CRUD 추가"
```

---

## Task 5: Homework.jsx — 교사 뷰 (list / create / submissions / detail)

**Files:**
- Create: `src/pages/Homework.jsx`

`Tests.jsx`의 구조(상단 메인 컴포넌트 + 하단 서브 컴포넌트, `view` state로 분기)를 그대로 따른다. 이 Task에서는 교사/관리자 경로만 구현하고, 학생 경로는 Task 6에서 채운다.

- [ ] **Step 1: 메인 컴포넌트 + list 뷰 (교사) 작성**

`src/pages/Homework.jsx`:

```jsx
// src/pages/Homework.jsx
// 과제 — 교사: 출제·제출현황 / 학생: 응시·결과확인
import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import Layout from '../components/Layout'
import ChoiceGrid from '../components/ChoiceGrid'
import { gradeHomework, isLateSubmission } from '../utils/homework'

export default function Homework() {
  const { user } = useAuth()
  const {
    classes, students,
    homework, homeworkSubmissions,
    addHomework, deleteHomework, upsertHomeworkSubmission,
  } = useData()

  const [view,          setView]          = useState('list')
  const [selectedHw,    setSelectedHw]    = useState(null)
  const [selectedSub,   setSelectedSub]   = useState(null)
  const [filterClassId, setFilterClassId] = useState('all')

  const isStaff = user.role === 'teacher' || user.role === 'admin'

  // 반별 학생
  function classStudents(classId) {
    return students.filter((s) => s.classId === classId)
  }
  // 특정 과제·학생의 제출
  function submissionOf(homeworkId, studentId) {
    return homeworkSubmissions.find((s) => s.homeworkId === homeworkId && s.studentId === studentId)
  }

  // 목록 필터 (학생은 본인 반만)
  const visibleHomework = homework.filter((h) => {
    if (user.role === 'student') return h.classId === user.classId
    return filterClassId === 'all' || h.classId === Number(filterClassId)
  })

  // ────────── list 뷰 ──────────
  if (view === 'list') {
    return (
      <Layout>
        <div>
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-xl font-bold text-[#2B2B2B]">과제</h1>
            {isStaff && (
              <button
                onClick={() => setView('create')}
                className="px-4 py-2 bg-[#2B2B2B] text-white rounded-lg text-sm"
              >
                + 과제 만들기
              </button>
            )}
          </div>

          {/* 반 필터 (교사/관리자만) */}
          {isStaff && (
            <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
              <button
                onClick={() => setFilterClassId('all')}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  filterClassId === 'all' ? 'bg-[#2B2B2B] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                전체
              </button>
              {classes.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setFilterClassId(String(c.id))}
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                    filterClassId === String(c.id) ? 'bg-[#2B2B2B] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          )}

          {visibleHomework.length === 0 ? (
            <p className="text-center text-gray-400 py-12">과제가 없습니다.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {visibleHomework.map((hw) => {
                const cls = classes.find((c) => c.id === hw.classId)
                if (isStaff) {
                  const total    = classStudents(hw.classId).length
                  const subCount = homeworkSubmissions.filter((s) => s.homeworkId === hw.id).length
                  const canDelete = user.role === 'admin' || hw.teacherId === user.id
                  return (
                    <div key={hw.id} className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                      <div onClick={() => { setSelectedHw(hw); setView('submissions') }} className="cursor-pointer">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs bg-[#5B8FD4]/15 text-[#5B8FD4] px-2 py-0.5 rounded-full font-medium">
                                {cls?.name}
                              </span>
                              <span className="text-xs text-gray-400">마감 {hw.dueDate}</span>
                            </div>
                            <p className="font-semibold text-[#2B2B2B]">{hw.title}</p>
                            <p className="text-xs text-gray-400 mt-1">{hw.questions.length}문항</p>
                          </div>
                          <div className="text-right ml-3 shrink-0">
                            <p className="text-sm font-bold text-[#2B2B2B]">{subCount}/{total}</p>
                            <p className="text-xs text-gray-400">제출</p>
                          </div>
                        </div>
                      </div>
                      {canDelete && (
                        <div className="flex justify-end mt-1">
                          <button
                            onClick={() => { if (confirm(`"${hw.title}" 과제를 삭제하시겠습니까?`)) deleteHomework(hw.id) }}
                            className="text-xs text-gray-300 hover:text-[#C0392B] transition-colors"
                          >
                            삭제
                          </button>
                        </div>
                      )}
                    </div>
                  )
                }
                // 학생 카드는 Task 6에서 구현
                return null
              })}
            </div>
          )}
        </div>
      </Layout>
    )
  }

  // create / submissions / detail / take / result 뷰는 이후 Step에서 추가
  return null
}
```

- [ ] **Step 2: create 뷰 추가 (메인 컴포넌트 내부)**

Step 1의 `// create / submissions ...` 주석을 지우고 그 자리에 아래 블록들을 차례로 넣는다. 먼저 create 뷰:

```jsx
  // ────────── create 뷰 ──────────
  if (view === 'create') {
    if (!isStaff) { setView('list'); return null }
    return (
      <Layout>
        <CreateView
          classes={classes}
          user={user}
          onSubmit={async (newHw) => { await addHomework(newHw); setView('list') }}
          onCancel={() => setView('list')}
        />
      </Layout>
    )
  }
```

- [ ] **Step 3: submissions 뷰 추가**

create 뷰 블록 아래에:

```jsx
  // ────────── submissions 뷰 (교사: 제출 현황) ──────────
  if (view === 'submissions') {
    if (!isStaff) { setView('list'); return null }
    const studs = classStudents(selectedHw.classId)
    const submitted   = studs.filter((s) => submissionOf(selectedHw.id, s.id))
    const notSubmitted = studs.filter((s) => !submissionOf(selectedHw.id, s.id))
    return (
      <Layout>
        <div>
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => setView('list')} className="text-sm text-gray-500 hover:text-gray-700">← 목록</button>
            <h1 className="text-xl font-bold text-[#2B2B2B]">{selectedHw.title}</h1>
          </div>

          <h2 className="text-base font-semibold text-gray-700 mb-3">
            제출 ({submitted.length}/{studs.length})
          </h2>
          {submitted.length === 0 ? (
            <p className="text-center text-gray-400 py-6">제출한 학생이 없습니다.</p>
          ) : (
            <div className="flex flex-col gap-2 mb-6">
              {submitted.map((s) => {
                const sub  = submissionOf(selectedHw.id, s.id)
                const late = isLateSubmission(sub.submittedAt, selectedHw.dueDate)
                const { correctCount, total } = gradeHomework(selectedHw.questions, sub.answers)
                return (
                  <div
                    key={s.id}
                    onClick={() => { setSelectedSub(sub); setSelectedHw(selectedHw); setView('detail') }}
                    className="bg-white rounded-xl p-3 shadow-sm cursor-pointer hover:shadow-md transition-shadow flex justify-between items-center"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-[#2B2B2B]">{s.name}</span>
                      {late && (
                        <span className="text-xs bg-[#C0392B] text-white px-2 py-0.5 rounded-full">지각</span>
                      )}
                    </div>
                    <span className="text-xs text-gray-400">{correctCount}/{total} 정답</span>
                  </div>
                )
              })}
            </div>
          )}

          <h2 className="text-base font-semibold text-gray-700 mb-3">
            미제출 ({notSubmitted.length}/{studs.length})
          </h2>
          {notSubmitted.length === 0 ? (
            <p className="text-center text-gray-400 py-6">모든 학생이 제출했습니다.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {notSubmitted.map((s) => (
                <div key={s.id} className="bg-gray-50 rounded-xl p-3 text-sm text-gray-500">{s.name}</div>
              ))}
            </div>
          )}
        </div>
      </Layout>
    )
  }

  // ────────── detail 뷰 (교사: 학생 답안 열람) ──────────
  if (view === 'detail') {
    if (!isStaff) { setView('list'); return null }
    const student = students.find((s) => s.id === selectedSub.studentId)
    const valueMap   = Object.fromEntries(selectedSub.answers.map((a) => [a.number, a.answer]))
    const answerKey  = Object.fromEntries(selectedHw.questions.map((q) => [q.number, q.answer]))
    const { correctCount, total } = gradeHomework(selectedHw.questions, selectedSub.answers)
    return (
      <Layout>
        <div>
          <div className="flex items-center gap-3 mb-2">
            <button onClick={() => setView('submissions')} className="text-sm text-gray-500 hover:text-gray-700">← 제출 현황</button>
          </div>
          <h1 className="text-xl font-bold text-[#2B2B2B] mb-1">{student?.name} — 답안</h1>
          <p className="text-sm text-gray-500 mb-4">{selectedHw.title} · {correctCount}/{total} 정답</p>
          <ChoiceGrid
            count={selectedHw.questions.length}
            mode="result"
            values={valueMap}
            answerKey={answerKey}
            onChange={() => {}}
          />
        </div>
      </Layout>
    )
  }
```

- [ ] **Step 4: CreateView 서브 컴포넌트 추가 (파일 맨 아래)**

`export default function Homework()` 닫는 중괄호 아래에 추가:

```jsx
// ────────── CreateView — 과제 출제 ──────────
function CreateView({ classes, user, onSubmit, onCancel }) {
  const [title,     setTitle]     = useState('')
  const [classId,   setClassId]   = useState(String(classes[0]?.id ?? ''))
  const [dueDate,   setDueDate]   = useState(new Date().toISOString().slice(0, 10))
  const [count,     setCount]     = useState(0)
  const [answers,   setAnswers]   = useState({}) // { [number]: '③' }
  const [saving,    setSaving]    = useState(false)

  function handleCountChange(val) {
    const n = Math.max(0, Math.min(300, Number(val) || 0))
    setCount(n)
    // 문항 수가 줄면 초과분 정답 제거
    setAnswers((prev) => {
      const next = {}
      for (let i = 1; i <= n; i++) if (prev[i]) next[i] = prev[i]
      return next
    })
  }

  const allAnswered = count > 0 && Object.keys(answers).length === count

  async function handleSubmit(e) {
    e.preventDefault()
    if (!title.trim() || !allAnswered || saving) return
    setSaving(true)
    const questions = Array.from({ length: count }, (_, i) => ({
      number: i + 1,
      answer: answers[i + 1],
    }))
    await onSubmit({
      title:     title.trim(),
      classId:   Number(classId),
      teacherId: user.id,
      dueDate,
      questions,
    })
    setSaving(false)
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onCancel} className="text-sm text-gray-500 hover:text-gray-700">← 목록</button>
        <h1 className="text-xl font-bold text-[#2B2B2B]">과제 만들기</h1>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">제목</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="예: 4월 2주차 독서 과제"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5B8FD4]"
            required
          />
        </div>

        <div className="flex gap-4">
          <div className="flex-1">
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
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">마감일</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5B8FD4]"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">문항 수</label>
          <input
            type="number"
            min="0"
            max="300"
            value={count || ''}
            onChange={(e) => handleCountChange(e.target.value)}
            placeholder="예: 100"
            className="w-32 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5B8FD4]"
          />
        </div>

        {count > 0 && (
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium text-gray-700">정답 입력</label>
              <span className="text-xs text-gray-400">
                {Object.keys(answers).length}/{count} 입력됨 · 키보드 1~5로 빠르게 입력
              </span>
            </div>
            <ChoiceGrid
              count={count}
              values={answers}
              mode="input"
              onChange={(number, choice) => setAnswers((prev) => ({ ...prev, [number]: choice }))}
            />
          </div>
        )}

        <button
          type="submit"
          disabled={!title.trim() || !allAnswered || saving}
          className="w-full py-3 bg-[#2B2B2B] text-white rounded-xl font-medium disabled:opacity-40"
        >
          {saving ? '저장 중...' : '과제 저장'}
        </button>
      </form>
    </div>
  )
}
```

- [ ] **Step 5: 빌드 검증**

Run: `npm run build`
Expected: 빌드 성공. 실패 시 import 누락(`useState`, `ChoiceGrid`, `gradeHomework`, `isLateSubmission`)이나 괄호를 점검한다.

- [ ] **Step 6: Commit**

```bash
git add src/pages/Homework.jsx
git commit -m "feat: 과제 페이지 교사 뷰(출제·제출현황·답안열람) 추가"
```

---

## Task 6: Homework.jsx — 학생 뷰 (list 카드 / take / result)

**Files:**
- Modify: `src/pages/Homework.jsx`

- [ ] **Step 1: list 뷰의 학생 카드 채우기**

Task 5 Step 1에서 `// 학생 카드는 Task 6에서 구현 \n return null` 로 둔 부분을 아래로 교체:

```jsx
                // ── 학생 카드 ──
                const mySub = submissionOf(hw.id, user.studentId)
                let badge
                if (!mySub) {
                  badge = { label: '미제출', color: 'bg-gray-100 text-gray-500' }
                } else if (isLateSubmission(mySub.submittedAt, hw.dueDate)) {
                  badge = { label: '지각제출', color: 'bg-[#C0392B]/10 text-[#C0392B]' }
                } else {
                  badge = { label: '제출완료', color: 'bg-green-100 text-green-700' }
                }
                return (
                  <div
                    key={hw.id}
                    onClick={() => {
                      setSelectedHw(hw)
                      setView(mySub ? 'result' : 'take')
                    }}
                    className="bg-white rounded-xl p-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badge.color}`}>
                            {badge.label}
                          </span>
                          <span className="text-xs text-gray-400">마감 {hw.dueDate}</span>
                        </div>
                        <p className="font-semibold text-[#2B2B2B]">{hw.title}</p>
                        <p className="text-xs text-gray-400 mt-1">{hw.questions.length}문항</p>
                      </div>
                    </div>
                  </div>
                )
```

- [ ] **Step 2: take 뷰 + result 뷰 추가 (메인 컴포넌트 내부)**

Task 5에서 추가한 detail 뷰 블록 아래, `return null` 위에 추가:

```jsx
  // ────────── take 뷰 (학생: 응시/수정) ──────────
  if (view === 'take') {
    if (user.role !== 'student') { setView('list'); return null }
    const existing = submissionOf(selectedHw.id, user.studentId)
    return (
      <Layout>
        <TakeView
          homework={selectedHw}
          existing={existing}
          onSubmit={async (answers) => {
            await upsertHomeworkSubmission({
              homeworkId: selectedHw.id,
              studentId:  user.studentId,
              answers,
            })
            setView('result')
          }}
          onBack={() => setView('list')}
        />
      </Layout>
    )
  }

  // ────────── result 뷰 (학생: 결과 확인) ──────────
  if (view === 'result') {
    if (user.role !== 'student') { setView('list'); return null }
    const mySub = submissionOf(selectedHw.id, user.studentId)
    if (!mySub) { setView('take'); return null }
    const valueMap  = Object.fromEntries(mySub.answers.map((a) => [a.number, a.answer]))
    const answerKey = Object.fromEntries(selectedHw.questions.map((q) => [q.number, q.answer]))
    const { correctCount, total } = gradeHomework(selectedHw.questions, mySub.answers)
    const beforeDue = new Date().toISOString().slice(0, 10) <= selectedHw.dueDate
    return (
      <Layout>
        <div>
          <div className="flex items-center gap-3 mb-4">
            <button onClick={() => setView('list')} className="text-sm text-gray-500 hover:text-gray-700">← 목록</button>
            <h1 className="text-xl font-bold text-[#2B2B2B]">{selectedHw.title} — 결과</h1>
          </div>

          <div className="bg-[#2B2B2B] text-white rounded-2xl p-6 text-center mb-4">
            <p className="text-sm text-white/60 mb-1">정답</p>
            <p className="text-4xl font-bold">{correctCount}<span className="text-2xl text-white/50"> / {total}</span></p>
          </div>

          {beforeDue && (
            <button
              onClick={() => setView('take')}
              className="w-full py-2.5 mb-4 border border-gray-300 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50"
            >
              답 수정하기 (마감 전까지 가능)
            </button>
          )}

          <ChoiceGrid
            count={selectedHw.questions.length}
            mode="result"
            values={valueMap}
            answerKey={answerKey}
            onChange={() => {}}
          />
        </div>
      </Layout>
    )
  }
```

- [ ] **Step 3: TakeView 서브 컴포넌트 추가 (파일 맨 아래)**

`CreateView` 함수 아래에 추가:

```jsx
// ────────── TakeView — 학생 응시/수정 ──────────
function TakeView({ homework, existing, onSubmit, onBack }) {
  // 기존 제출이 있으면 그 답을 초기값으로 (마감 전 수정)
  const [answers, setAnswers] = useState(() =>
    existing ? Object.fromEntries(existing.answers.map((a) => [a.number, a.answer])) : {}
  )
  const [submitting, setSubmitting] = useState(false)

  const count       = homework.questions.length
  const answeredNum = Object.keys(answers).length
  const allAnswered = answeredNum === count
  const isLate      = new Date().toISOString().slice(0, 10) > homework.dueDate

  async function handleSubmit() {
    if (!allAnswered || submitting) return
    setSubmitting(true)
    const payload = homework.questions.map((q) => ({
      number: q.number,
      answer: answers[q.number],
    }))
    await onSubmit(payload)
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <button onClick={onBack} className="text-sm text-gray-500 hover:text-gray-700">← 목록</button>
      </div>
      <h1 className="text-xl font-bold text-[#2B2B2B] mb-1">{homework.title}</h1>
      <p className="text-sm text-gray-500 mb-1">{count}문항 · 마감 {homework.dueDate}</p>
      {isLate && (
        <p className="text-xs text-[#C0392B] mb-4">마감일이 지났습니다. 지금 제출하면 지각 제출로 표시됩니다.</p>
      )}

      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">답안 입력</span>
          <span className="text-xs text-gray-400">{answeredNum}/{count} 입력됨</span>
        </div>
        <ChoiceGrid
          count={count}
          values={answers}
          mode="input"
          onChange={(number, choice) => setAnswers((prev) => ({ ...prev, [number]: choice }))}
        />
      </div>

      <button
        onClick={handleSubmit}
        disabled={!allAnswered || submitting}
        className="w-full py-3 bg-[#2B2B2B] text-white rounded-xl font-medium disabled:opacity-40"
      >
        {submitting ? '제출 중...' : existing ? '다시 제출하기' : '제출하기'}
      </button>
    </div>
  )
}
```

- [ ] **Step 4: 빌드 검증**

Run: `npm run build`
Expected: 빌드 성공.

- [ ] **Step 5: Commit**

```bash
git add src/pages/Homework.jsx
git commit -m "feat: 과제 페이지 학생 뷰(응시·수정·결과확인) 추가"
```

---

## Task 7: 라우팅 + 네비게이션 연결

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/components/Sidebar.jsx`
- Modify: `src/components/BottomNav.jsx`

- [ ] **Step 1: App.jsx에 라우트 추가**

`src/App.jsx` — import 구역의 `import Tests from './pages/Tests'` 아래에 추가:

```jsx
import Homework from './pages/Homework'
```

테스트 라우트(`<Route path="/tests" ...>` 블록) 아래에 추가:

```jsx
          {/* 과제 (전체 역할) */}
          <Route
            path="/homework"
            element={
              <ProtectedRoute allowedRoles={['admin', 'teacher', 'student']}>
                <Homework />
              </ProtectedRoute>
            }
          />
```

- [ ] **Step 2: Sidebar.jsx에 메뉴 추가**

`src/components/Sidebar.jsx` — lucide import에 `PencilLine` 추가. 즉 import 줄을:

```jsx
import {
  Users, School, ClipboardCheck, BarChart2,
  Video, ClipboardList, PencilLine, MessageCircle, Bell, TrendingUp, LogOut, KeyRound, UserCog,
} from 'lucide-react'
```

`navSections`의 '수업' 섹션 `items` 배열에서 테스트 항목 아래에 추가:

```jsx
      { label: '과제',      path: '/homework', Icon: PencilLine },
```

즉 '수업' 섹션은 다음과 같이 된다:

```jsx
  {
    label: '수업',
    items: [
      { label: '영상 관리', path: '/videos',   Icon: Video },
      { label: '테스트',    path: '/tests',    Icon: ClipboardList },
      { label: '과제',      path: '/homework', Icon: PencilLine },
    ],
  },
```

- [ ] **Step 3: BottomNav.jsx에 탭 추가**

`src/components/BottomNav.jsx` — lucide import에 `PencilLine` 추가:

```jsx
import { Home, ClipboardCheck, BarChart2, Video, ClipboardList, PencilLine, MessageCircle, Bell } from 'lucide-react'
```

`tabs` 배열에서 테스트 탭 아래에 추가:

```jsx
  { label: '과제',  path: '/homework',   Icon: PencilLine },
```

즉 `tabs`는:

```jsx
const tabs = [
  { label: '홈',    path: '/dashboard',  Icon: Home },
  { label: '출결',  path: '/attendance', Icon: ClipboardCheck },
  { label: '성적',  path: '/grades',     Icon: BarChart2 },
  { label: '영상',  path: '/videos',     Icon: Video },
  { label: '테스트', path: '/tests',     Icon: ClipboardList },
  { label: '과제',  path: '/homework',   Icon: PencilLine },
  { label: 'Q&A',  path: '/qna',        Icon: MessageCircle },
  { label: '공지',  path: '/notices',   Icon: Bell },
]
```

- [ ] **Step 4: 빌드 검증**

Run: `npm run build`
Expected: 빌드 성공.

- [ ] **Step 5: Commit**

```bash
git add src/App.jsx src/components/Sidebar.jsx src/components/BottomNav.jsx
git commit -m "feat: 과제 라우트·사이드바·하단탭 연결"
```

---

## Task 8: 전체 통합 검증

**Files:** (없음 — 검증만)

- [ ] **Step 1: 전체 유닛 테스트 실행**

Run: `npx vitest run src/utils/homework.test.js src/components/ChoiceGrid.test.jsx`
Expected: 전체 PASS (11 tests)

- [ ] **Step 2: 빌드 + 린트**

Run: `npm run build && npm run lint`
Expected: 빌드 성공, 신규 파일에서 lint 에러 없음

- [ ] **Step 3: 사용자 확인 — Supabase 테이블**

사용자가 `docs/homework-tables.sql`을 Supabase에서 실행했는지 확인한다. 실행 전이면 여기서 멈추고 사용자에게 요청한다.

- [ ] **Step 4: 수동 시나리오 검증 (`npm run dev`)**

dev 서버를 띄우고 아래를 순서대로 확인한다:

1. **교사 로그인** → 사이드바에 "과제" 메뉴 보임 → 클릭 → 빈 목록 "과제가 없습니다."
2. "+ 과제 만들기" → 제목/반/마감일 입력 → 문항 수 `5` 입력 → 정답 격자 등장 → 격자에 포커스 주고 키보드 `3 1 4 2 5` 입력 → 다섯 칸이 채워지고 커서가 자동 이동 → "과제 저장" → 목록에 카드 표시 (`0/N 제출`)
3. **학생 로그인** (그 반 학생) → "과제" 메뉴 → 카드에 "미제출" 배지 → 클릭 → take 뷰 → 답 입력 → "제출하기" → result 뷰에서 정답 개수·정답/오답 색상 표시
4. 학생 목록 복귀 → 카드가 "제출완료"로 바뀜 → 다시 클릭 → result 뷰 → 마감 전이면 "답 수정하기" 버튼 → 클릭 → 기존 답이 채워진 take 뷰 → 답 바꿔 재제출 → 결과 갱신
5. **교사 로그인** → 과제 카드 → submissions 뷰 → 제출/미제출 목록 확인 → 제출 학생 클릭 → detail 뷰에서 답안 vs 정답 비교
6. 마감일을 지난 날짜로 한 과제를 만들고, 미제출 학생으로 제출 → submissions에서 "지각" 배지 확인
7. 교사가 과제 "삭제" → 목록에서 사라짐

- [ ] **Step 5: 진행 상황 메모리 업데이트 (선택)**

검증이 모두 통과하면 `/Users/choiwonyong/.claude/projects/-Users-choiwonyong-Documents---------/memory/project_progress.md`의 완료 기능 목록에 "과제(객관식 제출 클리어) 기능"을 추가한다.

- [ ] **Step 6: 최종 커밋 (변경 사항이 있을 경우)**

```bash
git add -A
git commit -m "chore: 과제 기능 통합 검증 완료"
```
