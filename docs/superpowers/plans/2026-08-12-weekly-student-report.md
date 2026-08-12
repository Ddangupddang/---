# 주간 학생 리포트 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 교사가 반 하나를 고르면 그 주의 출석·주간테스트·주간과제를 학생별 한 표로 보고, 학생별 코멘트를 남길 수 있게 한다.

**Architecture:** 계산은 전부 `src/utils/weeklyReport.js`의 순수 함수에 모으고(DB·UI 의존성 없음), 화면은 결과를 그리기만 한다. 화면은 「반 전체 표」와 「개인 상세」 두 컴포넌트로 나눠 각각 작게 유지한다. 코멘트만 신규 테이블 `weekly_report_notes`에 저장한다.

**Tech Stack:** React 18 + React Router + Tailwind CSS · Supabase (Postgres + Storage) · Vitest + @testing-library/react · lucide-react 아이콘

## Global Constraints

- 설계 문서: `docs/superpowers/specs/2026-08-12-weekly-student-report-design.md` — 충돌 시 스펙이 기준
- 주 범위는 **월~토 6일**. 주 시작은 항상 `mondayOf()`로 정규화한 월요일 `YYYY-MM-DD`
- 색상은 하드코딩하지 말고 기존 화면과 같은 값을 쓴다: 주색 `#2B2B2B`, 보조 `#5B8FD4`, 강조 `#C0392B`, 배경 `#F4F3EE`
- 주석은 한글로, "무엇을"이 아니라 **"왜"**를 적는다 (기존 코드 스타일)
- 컴포넌트는 함수형, 파일명 PascalCase, 유틸은 camelCase
- 접근 권한: `admin`, `teacher`만. 학생 role은 차단
- 실패한 저장은 절대 성공처럼 보이면 안 된다 — 실패 시 입력값을 유지하고 에러를 표시 (기존 `upsertHomeworkSubmission` 규칙)
- 각 태스크 끝에서 `npx vitest run`과 `npm run lint`가 모두 통과해야 커밋한다

---

## File Structure

| 파일 | 상태 | 책임 |
|---|---|---|
| `src/constants/homework.js` | 수정 | `LOW_SUBMISSION` 상수 추가 |
| `src/utils/homeworkWeek.js` | 수정 | `weekDates()` 추가 |
| `src/utils/homeworkReport.js` | 수정 | 로컬 `LOW_SUBMISSION` 제거 → 공용 상수 import |
| `src/utils/weeklyReport.js` | 신규 | 출석/테스트/과제 계산 + 조합 (순수 함수 4개) |
| `src/utils/weeklyReport.test.js` | 신규 | 위 계산 전부의 단위 테스트 |
| `docs/weekly-report-notes.sql` | 신규 | `weekly_report_notes` 테이블 생성 SQL |
| `src/context/DataContext.jsx` | 수정 | `weeklyNotes` state + 로드 + `upsertWeeklyNote` |
| `src/components/reports/WeeklyReportTable.jsx` | 신규 | 반 전체 표 (읽기 전용) |
| `src/components/reports/WeeklyReportTable.test.jsx` | 신규 | 표 렌더·클릭 테스트 |
| `src/components/reports/WeeklyStudentDetail.jsx` | 신규 | 개인 상세 + 코멘트 입력/저장 |
| `src/components/reports/WeeklyStudentDetail.test.jsx` | 신규 | 상세·코멘트 저장 실패 테스트 |
| `src/pages/WeeklyReport.jsx` | 신규 | 반·주 선택, 표↔상세 전환, 권한 차단 |
| `src/pages/WeeklyReport.test.jsx` | 신규 | 권한 차단·주 이동 테스트 |
| `src/App.jsx` | 수정 | `/weekly-report` 라우트 |
| `src/components/Sidebar.jsx` | 수정 | 「주간 리포트」 메뉴 |

계산(utils)과 표시(components)를 갈라놓는 이유: 계산은 mock 데이터로 전부 검증할 수 있고, 화면 테스트는 "표에서 상세로 넘어가는가" 같은 최소한만 남길 수 있다. `Reports.jsx`가 385줄까지 커진 전철을 밟지 않기 위해 표와 상세도 분리한다.

---

## Task 1: 공용 상수와 주 날짜 유틸

**Files:**
- Modify: `src/constants/homework.js`
- Modify: `src/utils/homeworkWeek.js`
- Modify: `src/utils/homeworkReport.js:8` (로컬 `LOW_SUBMISSION` 제거)
- Test: `src/utils/homeworkWeek.test.js` (기존 파일에 추가)

**Interfaces:**
- Consumes: 없음 (첫 태스크)
- Produces:
  - `LOW_SUBMISSION: number` — `src/constants/homework.js`에서 export, 값 `70`
  - `weekDates(weekStart: string): string[]` — `src/utils/homeworkWeek.js`에서 export, 월~토 6개 `'YYYY-MM-DD'` 배열

- [ ] **Step 1: 실패하는 테스트 작성**

`src/utils/homeworkWeek.test.js` 맨 위 import에 `weekDates`를 추가하고, 파일 끝에 붙인다:

```js
describe('weekDates', () => {
  it('주 시작(월요일)부터 토요일까지 6일을 돌려준다', () => {
    expect(weekDates('2026-08-10')).toEqual([
      '2026-08-10', '2026-08-11', '2026-08-12',
      '2026-08-13', '2026-08-14', '2026-08-15',
    ])
  })

  it('월을 넘어가도 날짜가 이어진다', () => {
    expect(weekDates('2026-08-31')).toEqual([
      '2026-08-31', '2026-09-01', '2026-09-02',
      '2026-09-03', '2026-09-04', '2026-09-05',
    ])
  })
})
```

- [ ] **Step 2: 테스트를 돌려 실패를 확인**

Run: `npx vitest run src/utils/homeworkWeek.test.js`
Expected: FAIL — `weekDates is not a function`

- [ ] **Step 3: `weekDates` 구현**

`src/utils/homeworkWeek.js` 파일 끝에 추가:

```js
// 주 시작(월요일) → 그 주 월~토 6일의 날짜 배열.
// 출석·테스트처럼 "그 주에 속하는가"를 날짜로 판정하는 곳에서 공통으로 쓴다.
export function weekDates(weekStart) {
  return [1, 2, 3, 4, 5, 6].map((weekday) => dateForWeekday(weekStart, weekday))
}
```

> `WEEKDAYS` 상수를 import하지 않고 리터럴을 쓰는 이유: `homeworkWeek.js`는 지금 아무것도 import하지 않는 최하위 유틸이다. 상수 파일에 의존을 만들면 나중에 순환 import가 생기기 쉽다.

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/utils/homeworkWeek.test.js`
Expected: PASS

- [ ] **Step 5: `LOW_SUBMISSION`을 공용 상수로 옮기기**

`src/constants/homework.js` 파일 끝에 추가:

```js
// 과제 제출률이 이보다 낮으면 부진으로 본다.
// 월간 과제 리포트와 주간 리포트가 같은 기준을 써야 교사가 헷갈리지 않는다.
export const LOW_SUBMISSION = 70
```

`src/utils/homeworkReport.js`에서 로컬 상수 선언 3줄을 지운다:

```js
// 삭제할 부분
// 제출률이 이보다 낮으면 눈에 띄게 표시한다
const LOW_SUBMISSION = 70
```

그리고 상단 import를 바꾼다:

```js
import { gradeHomework } from './homework'
import { LOW_SUBMISSION } from '../constants/homework'
```

- [ ] **Step 6: 기존 테스트가 안 깨졌는지 확인**

Run: `npx vitest run && npm run lint`
Expected: 전부 PASS, lint 에러 0

- [ ] **Step 7: 커밋**

```bash
git add src/constants/homework.js src/utils/homeworkWeek.js src/utils/homeworkWeek.test.js src/utils/homeworkReport.js
git commit -m "refactor: 주 날짜 유틸 weekDates 추가, LOW_SUBMISSION 공용 상수로 이동"
```

---

## Task 2: 출석 주간 집계

**Files:**
- Create: `src/utils/weeklyReport.js`
- Test: `src/utils/weeklyReport.test.js`

**Interfaces:**
- Consumes: `weekDates()` (Task 1)
- Produces:
  - `weeklyAttendance(records, studentId, dates): { present, late, absent, counted, rate } | null`
    - `records`: `[{ studentId, date, status: 'present'|'late'|'absent', type }]`
    - 기록이 하나도 없으면 `null`

- [ ] **Step 1: 실패하는 테스트 작성**

`src/utils/weeklyReport.test.js` 신규 생성:

```js
// src/utils/weeklyReport.test.js
import { describe, it, expect } from 'vitest'
import { weeklyAttendance } from './weeklyReport'

const DATES = ['2026-08-10', '2026-08-11', '2026-08-12', '2026-08-13', '2026-08-14', '2026-08-15']

describe('weeklyAttendance', () => {
  it('출석·지각·결석을 각각 세고, 지각은 출석률 분자에 포함한다', () => {
    const records = [
      { studentId: 1, date: '2026-08-10', status: 'present' },
      { studentId: 1, date: '2026-08-11', status: 'late'    },
      { studentId: 1, date: '2026-08-12', status: 'absent'  },
      { studentId: 1, date: '2026-08-13', status: 'present' },
    ]
    // 왔다는 사실(출석+지각)은 분자에 넣되, 지각은 따로 세어 감춰지지 않게 한다
    expect(weeklyAttendance(records, 1, DATES)).toEqual({
      present: 2, late: 1, absent: 1, counted: 4, rate: 75,
    })
  })

  it('그 주 기록이 하나도 없으면 null — 0%와 구별해야 한다', () => {
    const records = [{ studentId: 1, date: '2026-08-03', status: 'present' }]
    expect(weeklyAttendance(records, 1, DATES)).toBeNull()
  })

  it('다른 학생의 기록은 세지 않는다', () => {
    const records = [
      { studentId: 1, date: '2026-08-10', status: 'present' },
      { studentId: 2, date: '2026-08-10', status: 'absent'  },
    ]
    expect(weeklyAttendance(records, 1, DATES).counted).toBe(1)
  })

  it('주 범위 밖 날짜는 세지 않는다', () => {
    const records = [
      { studentId: 1, date: '2026-08-10', status: 'present' },
      { studentId: 1, date: '2026-08-16', status: 'absent'  }, // 일요일 = 범위 밖
    ]
    expect(weeklyAttendance(records, 1, DATES).counted).toBe(1)
  })
})
```

- [ ] **Step 2: 테스트를 돌려 실패를 확인**

Run: `npx vitest run src/utils/weeklyReport.test.js`
Expected: FAIL — `Failed to resolve import "./weeklyReport"`

- [ ] **Step 3: 구현**

`src/utils/weeklyReport.js` 신규 생성:

```js
// src/utils/weeklyReport.js
// 주간 학생 리포트 계산. DB·UI 의존성이 없는 순수 함수만 둔다.
//
// 교사가 한 학생의 한 주를 보려면 출결·테스트·과제 화면 세 곳을 열어야 했다.
// 그 합치는 일을 여기서 한다.

// 한 학생의 그 주 출결 집계.
// 지각은 "왔다"이므로 출석률 분자에 넣되, 별도로 세어 표에서 감춰지지 않게 한다.
// 그 주 기록이 아예 없으면 null — 출석률 0%와 "기록 없음"은 다른 뜻이다.
export function weeklyAttendance(records, studentId, dates) {
  const inWeek = new Set(dates)
  const mine = records.filter((a) => a.studentId === studentId && inWeek.has(a.date))

  const present = mine.filter((a) => a.status === 'present').length
  const late    = mine.filter((a) => a.status === 'late').length
  const absent  = mine.filter((a) => a.status === 'absent').length
  const counted = present + late + absent
  if (counted === 0) return null

  return {
    present, late, absent, counted,
    rate: Math.round(((present + late) / counted) * 100),
  }
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/utils/weeklyReport.test.js`
Expected: PASS (4 tests)

- [ ] **Step 5: 커밋**

```bash
git add src/utils/weeklyReport.js src/utils/weeklyReport.test.js
git commit -m "feat: 주간 리포트 출석 집계 weeklyAttendance"
```

---

## Task 3: 주간테스트 집계

**Files:**
- Modify: `src/utils/weeklyReport.js`
- Test: `src/utils/weeklyReport.test.js`

**Interfaces:**
- Consumes: `weeklyAttendance` 파일 (Task 2)
- Produces:
  - `weeklyTests({ tests, testSubmissions, student, classId, dates }): { rows, summary }`
    - `rows`: `[{ test, score: number|null, total: number, state: 'graded'|'grading'|'absent' }]`
    - `summary`: `{ average: number|null, count: number }` — 그 주 시험이 없으면 `null`
    - `average`는 **백분율 평균**. 시험마다 만점이 다를 수 있어 원점수 평균은 뜻이 없다

- [ ] **Step 1: 실패하는 테스트 작성**

`src/utils/weeklyReport.test.js`의 import에 `weeklyTests`를 추가하고, 파일 끝에 붙인다:

```js
const STUDENT = { id: 1, name: '홍길동', classId: 10, grade: 5, jeongsiLevel: 2 }

// 만점 100점짜리 시험 두 개 (같은 주, 같은 반)
const TESTS = [
  { id: 100, classId: 10, date: '2026-08-11', title: '문학',
    questions: [{ id: 1, points: 60 }, { id: 2, points: 40 }] },
  { id: 101, classId: 10, date: '2026-08-14', title: '독서',
    questions: [{ id: 3, points: 50 }, { id: 4, points: 50 }] },
]

describe('weeklyTests', () => {
  it('채점된 시험은 득점 합계와 배점 합계를 돌려준다', () => {
    const subs = [{ testId: 100, studentId: 1, scores: [{ questionId: 1, score: 60 }, { questionId: 2, score: 12 }] }]
    const { rows } = weeklyTests({
      tests: [TESTS[0]], testSubmissions: subs, student: STUDENT, classId: 10, dates: DATES,
    })
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ score: 72, total: 100, state: 'graded' })
  })

  it('제출이 없으면 absent, 제출은 있는데 채점 전이면 grading', () => {
    const subs = [{ testId: 101, studentId: 1, scores: [] }]
    const { rows } = weeklyTests({
      tests: TESTS, testSubmissions: subs, student: STUDENT, classId: 10, dates: DATES,
    })
    expect(rows[0].state).toBe('absent')   // 100번 시험 미제출
    expect(rows[1].state).toBe('grading')  // 101번 제출했으나 미채점
    // 채점 전을 0점으로 계산하면 학생이 0점 맞은 것처럼 보인다
    expect(rows[1].score).toBeNull()
  })

  it('평균은 백분율로 낸다 — 시험마다 만점이 달라도 공평해야 한다', () => {
    const subs = [
      { testId: 100, studentId: 1, scores: [{ questionId: 1, score: 60 }, { questionId: 2, score: 20 }] }, // 80/100
      { testId: 101, studentId: 1, scores: [{ questionId: 3, score: 30 }, { questionId: 4, score: 30 }] }, // 60/100
    ]
    const { summary } = weeklyTests({
      tests: TESTS, testSubmissions: subs, student: STUDENT, classId: 10, dates: DATES,
    })
    expect(summary).toEqual({ average: 70, count: 2 })
  })

  it('채점된 시험이 하나도 없으면 average는 null, count는 시험 수', () => {
    const { summary } = weeklyTests({
      tests: TESTS, testSubmissions: [], student: STUDENT, classId: 10, dates: DATES,
    })
    expect(summary).toEqual({ average: null, count: 2 })
  })

  it('그 주에 시험이 없으면 summary는 null', () => {
    const { rows, summary } = weeklyTests({
      tests: [], testSubmissions: [], student: STUDENT, classId: 10, dates: DATES,
    })
    expect(rows).toEqual([])
    expect(summary).toBeNull()
  })

  it('다른 반 시험과 다른 주 시험은 빼고 본다', () => {
    const others = [
      { id: 200, classId: 99, date: '2026-08-11', title: '남의반', questions: [{ id: 9, points: 10 }] },
      { id: 201, classId: 10, date: '2026-08-03', title: '지난주', questions: [{ id: 9, points: 10 }] },
    ]
    const { rows } = weeklyTests({
      tests: others, testSubmissions: [], student: STUDENT, classId: 10, dates: DATES,
    })
    expect(rows).toEqual([])
  })
})
```

- [ ] **Step 2: 테스트를 돌려 실패를 확인**

Run: `npx vitest run src/utils/weeklyReport.test.js`
Expected: FAIL — `weeklyTests is not a function`

- [ ] **Step 3: 구현**

`src/utils/weeklyReport.js` 파일 끝에 추가:

```js
// 한 학생의 그 주 주간테스트 결과.
// 시험은 반(classId) 단위로 배정되므로 반과 날짜로 먼저 추린 뒤 학생 제출을 찾는다.
export function weeklyTests({ tests, testSubmissions, student, classId, dates }) {
  const inWeek = new Set(dates)
  const weekTests = tests
    .filter((t) => t.classId === classId && inWeek.has(t.date))
    .sort((a, b) => a.date.localeCompare(b.date))

  const rows = weekTests.map((test) => {
    const total = (test.questions ?? []).reduce((sum, q) => sum + (q.points ?? 0), 0)
    const sub = testSubmissions.find((s) => s.testId === test.id && s.studentId === student.id)

    if (!sub) return { test, score: null, total, state: 'absent' }
    // 주관식은 교사가 채점해야 점수가 생긴다. 채점 전을 0점으로 세면 억울한 점수가 된다.
    if ((sub.scores ?? []).length === 0) return { test, score: null, total, state: 'grading' }

    const score = sub.scores.reduce((sum, s) => sum + (s.score ?? 0), 0)
    return { test, score, total, state: 'graded' }
  })

  if (rows.length === 0) return { rows: [], summary: null }

  // 시험마다 만점이 다를 수 있어 원점수 평균은 뜻이 없다 → 백분율로 환산해 평균낸다
  const graded = rows.filter((r) => r.state === 'graded' && r.total > 0)
  const average = graded.length === 0
    ? null
    : Math.round(graded.reduce((sum, r) => sum + (r.score / r.total) * 100, 0) / graded.length)

  return { rows, summary: { average, count: rows.length } }
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/utils/weeklyReport.test.js`
Expected: PASS (10 tests)

- [ ] **Step 5: 커밋**

```bash
git add src/utils/weeklyReport.js src/utils/weeklyReport.test.js
git commit -m "feat: 주간 리포트 테스트 집계 weeklyTests"
```

---

## Task 4: 주간과제 집계 (내신/정시 각각)

**Files:**
- Modify: `src/utils/weeklyReport.js`
- Test: `src/utils/weeklyReport.test.js`

**Interfaces:**
- Consumes: `matchesStudent` (`src/utils/homeworkSelect.js`), `gradeHomework` (`src/utils/homework.js`)
- Produces:
  - `weeklyHomework({ sets, days, questions, submissions, student, category, weekStart }): { submitted, total, submitRate, correctRate } | null`
    - `category`: `'naesin'` 또는 `'jeongsi'`
    - 그 학생에게 배정된 세트가 없으면 `null`
    - `correctRate`는 **제출한 회차의 문항만** 분모로 쓴다. 제출 안 한 회차까지 넣으면 성실도와 실력이 섞인다

- [ ] **Step 1: 실패하는 테스트 작성**

import에 `weeklyHomework`를 추가하고, 파일 끝에 붙인다:

```js
const WEEK = '2026-08-10'

// 고2(grade 5) 내신 세트: 월·화·수 3일, 각 2문항
const HW = {
  sets: [
    { id: 1, category: 'naesin',  target: 5, weekStart: WEEK, title: '내신' },
    { id: 2, category: 'jeongsi', target: 2, weekStart: WEEK, title: '정시' },
    { id: 3, category: 'naesin',  target: 5, weekStart: '2026-08-03', title: '지난주' },
  ],
  days: [
    { id: 11, setId: 1, weekday: 1, date: '2026-08-10', questionCount: 2 },
    { id: 12, setId: 1, weekday: 2, date: '2026-08-11', questionCount: 2 },
    { id: 13, setId: 1, weekday: 3, date: '2026-08-12', questionCount: 2 },
    { id: 21, setId: 2, weekday: 1, date: '2026-08-10', questionCount: 2 },
    { id: 31, setId: 3, weekday: 1, date: '2026-08-03', questionCount: 2 },
  ],
  questions: [
    { id: 111, dayId: 11, number: 1, answer: '①' }, { id: 112, dayId: 11, number: 2, answer: '②' },
    { id: 121, dayId: 12, number: 1, answer: '③' }, { id: 122, dayId: 12, number: 2, answer: '④' },
    { id: 131, dayId: 13, number: 1, answer: '⑤' }, { id: 132, dayId: 13, number: 2, answer: '①' },
    { id: 211, dayId: 21, number: 1, answer: '①' }, { id: 212, dayId: 21, number: 2, answer: '②' },
  ],
}

describe('weeklyHomework', () => {
  it('제출한 요일 수와 정답률을 계산한다', () => {
    // 월요일: 2문항 다 맞음 / 화요일: 1문항만 맞음 / 수요일: 미제출
    const submissions = [
      { dayId: 11, studentId: 1, answers: [{ number: 1, answer: '①' }, { number: 2, answer: '②' }] },
      { dayId: 12, studentId: 1, answers: [{ number: 1, answer: '③' }, { number: 2, answer: '⑤' }] },
    ]
    expect(weeklyHomework({
      ...HW, submissions, student: STUDENT, category: 'naesin', weekStart: WEEK,
    })).toEqual({
      submitted: 2, total: 3, submitRate: 67,
      // 낸 2회차 4문항 중 3개 정답 = 75%. 안 낸 수요일 문항은 분모에 넣지 않는다.
      correctRate: 75,
    })
  })

  it('하나도 안 냈으면 제출률 0, 정답률은 null', () => {
    expect(weeklyHomework({
      ...HW, submissions: [], student: STUDENT, category: 'naesin', weekStart: WEEK,
    })).toEqual({ submitted: 0, total: 3, submitRate: 0, correctRate: null })
  })

  it('배정된 세트가 없으면 null — 제출률 0%와 구별해야 한다', () => {
    const noLevel = { ...STUDENT, jeongsiLevel: null }
    expect(weeklyHomework({
      ...HW, submissions: [], student: noLevel, category: 'jeongsi', weekStart: WEEK,
    })).toBeNull()
  })

  it('학생의 학년·레벨에 맞는 세트만 본다', () => {
    const grade6 = { ...STUDENT, grade: 6 }
    expect(weeklyHomework({
      ...HW, submissions: [], student: grade6, category: 'naesin', weekStart: WEEK,
    })).toBeNull()
  })

  it('다른 주 세트는 세지 않는다', () => {
    const result = weeklyHomework({
      ...HW, submissions: [], student: STUDENT, category: 'naesin', weekStart: WEEK,
    })
    // 지난주 세트(id 3)의 요일이 섞였다면 total이 4가 된다
    expect(result.total).toBe(3)
  })
})
```

- [ ] **Step 2: 테스트를 돌려 실패를 확인**

Run: `npx vitest run src/utils/weeklyReport.test.js`
Expected: FAIL — `weeklyHomework is not a function`

- [ ] **Step 3: 구현**

`src/utils/weeklyReport.js` 상단 import를 추가한다:

```js
import { gradeHomework } from './homework'
import { matchesStudent } from './homeworkSelect'
```

파일 끝에 추가:

```js
// 한 학생의 그 주 한 종류(내신/정시) 과제 수행.
// 과제는 반이 아니라 학년(내신)·정시레벨로 배정되므로 학생마다 자기 세트를 찾아야 한다.
// 배정된 세트가 없으면 null — "0% 제출"과 "낼 과제가 없었음"은 전혀 다른 뜻이다.
export function weeklyHomework({ sets, days, questions, submissions, student, category, weekStart }) {
  const mySetIds = new Set(
    sets
      .filter((s) => s.category === category && s.weekStart === weekStart && matchesStudent(s, student))
      .map((s) => s.id)
  )
  if (mySetIds.size === 0) return null

  const myDays = days.filter((d) => mySetIds.has(d.setId))
  if (myDays.length === 0) return null

  let submitted = 0
  let correct = 0
  let attempted = 0

  for (const day of myDays) {
    const sub = submissions.find((s) => s.dayId === day.id && s.studentId === student.id)
    if (!sub) continue
    submitted++
    const graded = gradeHomework(questions.filter((q) => q.dayId === day.id), sub.answers)
    correct += graded.correctCount
    attempted += graded.total
  }

  return {
    submitted,
    total: myDays.length,
    submitRate: Math.round((submitted / myDays.length) * 100),
    // 낸 회차의 문항만 분모로 삼는다 — 안 낸 회차까지 넣으면
    // 성실도와 실력이 뒤섞여 어느 쪽이 문제인지 알 수 없다
    correctRate: attempted === 0 ? null : Math.round((correct / attempted) * 100),
  }
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/utils/weeklyReport.test.js`
Expected: PASS (15 tests)

- [ ] **Step 5: 커밋**

```bash
git add src/utils/weeklyReport.js src/utils/weeklyReport.test.js
git commit -m "feat: 주간 리포트 과제 집계 weeklyHomework"
```

---

## Task 5: 조합 — 반 전체 행 만들기, 경고와 정렬

**Files:**
- Modify: `src/utils/weeklyReport.js`
- Test: `src/utils/weeklyReport.test.js`

**Interfaces:**
- Consumes: `weeklyAttendance`, `weeklyTests`, `weeklyHomework` (Task 2~4), `weekDates` (Task 1), `LOW_SUBMISSION`·`HW_CATEGORY` (`src/constants/homework.js`)
- Produces:
  - `weeklyClassReport({ students, attendance, tests, testSubmissions, homeworkSets, homeworkDays, homeworkQuestions, homeworkSubmissions, classId, weekStart }): { weekStart, dates, rows }`
  - `rows[i]`: `{ student, attendance, tests, testSummary, naesin, jeongsi, flags }`
  - `flags`: `('absence'|'testAbsent'|'lowHomework')[]`

- [ ] **Step 1: 실패하는 테스트 작성**

import에 `weeklyClassReport`를 추가하고, 파일 끝에 붙인다:

```js
describe('weeklyClassReport', () => {
  // 같은 반 학생 3명: 문제 없음 / 결석+과제부진 / 시험 미응시
  const STUDENTS = [
    { id: 1, name: '가나다', classId: 10, grade: 5, jeongsiLevel: null },
    { id: 2, name: '하마바', classId: 10, grade: 5, jeongsiLevel: null },
    { id: 3, name: '사아자', classId: 10, grade: 5, jeongsiLevel: null },
    { id: 9, name: '남의반', classId: 99, grade: 5, jeongsiLevel: null },
  ]
  const ATT = [
    { studentId: 1, date: '2026-08-10', status: 'present' },
    { studentId: 2, date: '2026-08-10', status: 'absent'  },
    { studentId: 3, date: '2026-08-10', status: 'present' },
  ]
  const SUBS_HW = [
    // 1번은 3일 다 제출, 2번은 1일만 제출(33% → 부진), 3번은 3일 다 제출
    { dayId: 11, studentId: 1, answers: [{ number: 1, answer: '①' }, { number: 2, answer: '②' }] },
    { dayId: 12, studentId: 1, answers: [{ number: 1, answer: '③' }, { number: 2, answer: '④' }] },
    { dayId: 13, studentId: 1, answers: [{ number: 1, answer: '⑤' }, { number: 2, answer: '①' }] },
    { dayId: 11, studentId: 2, answers: [{ number: 1, answer: '①' }, { number: 2, answer: '②' }] },
    { dayId: 11, studentId: 3, answers: [{ number: 1, answer: '①' }, { number: 2, answer: '②' }] },
    { dayId: 12, studentId: 3, answers: [{ number: 1, answer: '③' }, { number: 2, answer: '④' }] },
    { dayId: 13, studentId: 3, answers: [{ number: 1, answer: '⑤' }, { number: 2, answer: '①' }] },
  ]
  const TEST_SUBS = [
    { testId: 100, studentId: 1, scores: [{ questionId: 1, score: 60 }, { questionId: 2, score: 40 }] },
    { testId: 100, studentId: 2, scores: [{ questionId: 1, score: 30 }, { questionId: 2, score: 20 }] },
    // 3번은 미응시
  ]

  function run() {
    return weeklyClassReport({
      students: STUDENTS, attendance: ATT,
      tests: [TESTS[0]], testSubmissions: TEST_SUBS,
      homeworkSets: HW.sets, homeworkDays: HW.days,
      homeworkQuestions: HW.questions, homeworkSubmissions: SUBS_HW,
      classId: 10, weekStart: WEEK,
    })
  }

  it('그 반 학생만 행으로 만든다', () => {
    const { rows } = run()
    expect(rows).toHaveLength(3)
    expect(rows.map((r) => r.student.id).sort()).toEqual([1, 2, 3])
  })

  it('월~토 6일을 dates로 돌려준다', () => {
    expect(run().dates).toEqual(DATES)
  })

  it('결석·시험미응시·과제부진에 flag를 세운다', () => {
    const { rows } = run()
    const byId = Object.fromEntries(rows.map((r) => [r.student.id, r]))
    expect(byId[1].flags).toEqual([])
    expect(byId[2].flags).toEqual(expect.arrayContaining(['absence', 'lowHomework']))
    expect(byId[3].flags).toEqual(['testAbsent'])
  })

  it('flag가 많은 학생을 위로, 같으면 이름 가나다순으로 정렬한다', () => {
    const { rows } = run()
    // 2번(flag 2개) → 3번(1개) → 1번(0개)
    expect(rows.map((r) => r.student.id)).toEqual([2, 3, 1])
  })

  it('정시 레벨이 없는 학생은 jeongsi가 null이다', () => {
    const { rows } = run()
    expect(rows.every((r) => r.jeongsi === null)).toBe(true)
    expect(rows.every((r) => r.naesin !== null)).toBe(true)
  })

  it('제출률 70%는 부진이 아니고 69%는 부진이다', () => {
    // 10일 중 7일 제출 = 70% (경계값)
    const days = Array.from({ length: 10 }, (_, i) => ({
      id: 500 + i, setId: 1, weekday: 1, date: '2026-08-10', questionCount: 0,
    }))
    const subs7 = Array.from({ length: 7 }, (_, i) => ({ dayId: 500 + i, studentId: 1, answers: [] }))
    const base = {
      students: [STUDENTS[0]], attendance: [], tests: [], testSubmissions: [],
      homeworkSets: HW.sets, homeworkDays: days, homeworkQuestions: [],
      classId: 10, weekStart: WEEK,
    }
    expect(weeklyClassReport({ ...base, homeworkSubmissions: subs7 }).rows[0].flags).toEqual([])
    expect(weeklyClassReport({ ...base, homeworkSubmissions: subs7.slice(0, 6) }).rows[0].flags)
      .toEqual(['lowHomework'])
  })
})
```

- [ ] **Step 2: 테스트를 돌려 실패를 확인**

Run: `npx vitest run src/utils/weeklyReport.test.js`
Expected: FAIL — `weeklyClassReport is not a function`

- [ ] **Step 3: 구현**

`src/utils/weeklyReport.js` 상단 import를 추가:

```js
import { weekDates } from './homeworkWeek'
import { HW_CATEGORY, LOW_SUBMISSION } from '../constants/homework'
```

파일 끝에 추가:

```js
// 한 반의 한 주 전체. 화면은 이 결과를 그리기만 한다.
export function weeklyClassReport({
  students, attendance, tests, testSubmissions,
  homeworkSets, homeworkDays, homeworkQuestions, homeworkSubmissions,
  classId, weekStart,
}) {
  const dates = weekDates(weekStart)
  const hw = {
    sets: homeworkSets, days: homeworkDays,
    questions: homeworkQuestions, submissions: homeworkSubmissions,
    weekStart,
  }

  const rows = students
    .filter((s) => s.classId === classId)
    .map((student) => {
      const att = weeklyAttendance(attendance, student.id, dates)
      const { rows: testRows, summary } = weeklyTests({
        tests, testSubmissions, student, classId, dates,
      })
      const naesin  = weeklyHomework({ ...hw, student, category: HW_CATEGORY.NAESIN })
      const jeongsi = weeklyHomework({ ...hw, student, category: HW_CATEGORY.JEONGSI })

      // 교사가 먼저 봐야 할 신호만 flag로 세운다
      const flags = []
      if (att && att.absent > 0) flags.push('absence')
      if (testRows.some((r) => r.state === 'absent')) flags.push('testAbsent')
      if ([naesin, jeongsi].some((h) => h && h.submitRate < LOW_SUBMISSION)) flags.push('lowHomework')

      return { student, attendance: att, tests: testRows, testSummary: summary, naesin, jeongsi, flags }
    })

  // 문제 있는 학생이 먼저 보여야 표를 훑는 의미가 있다
  rows.sort((a, b) =>
    b.flags.length - a.flags.length ||
    a.student.name.localeCompare(b.student.name, 'ko')
  )

  return { weekStart, dates, rows }
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/utils/weeklyReport.test.js && npm run lint`
Expected: PASS (21 tests), lint 에러 0

- [ ] **Step 5: 커밋**

```bash
git add src/utils/weeklyReport.js src/utils/weeklyReport.test.js
git commit -m "feat: 주간 리포트 반 단위 조합 weeklyClassReport"
```

---

## Task 6: 코멘트 저장 — 테이블과 DataContext

**Files:**
- Create: `docs/weekly-report-notes.sql`
- Modify: `src/context/DataContext.jsx`

**Interfaces:**
- Consumes: 없음
- Produces (DataContext value에 추가):
  - `weeklyNotes: [{ id, studentId, weekStart, content, updatedAt }]`
  - `upsertWeeklyNote({ studentId, weekStart, content }): Promise<note|null>` — 실패 시 `null`

- [ ] **Step 1: 마이그레이션 SQL 작성**

`docs/weekly-report-notes.sql` 신규 생성:

```sql
-- 주간 학생 리포트 — 교사 코멘트
-- Supabase 대시보드 → SQL Editor 에 붙여넣고 실행하세요.

create table if not exists weekly_report_notes (
  id         bigint generated always as identity primary key,
  student_id bigint references students(id) on delete cascade,
  week_start date not null,               -- 그 주 월요일 (mondayOf로 정규화된 값)
  content    text not null default '',
  updated_at timestamptz not null default now(),
  updated_by uuid,
  unique (student_id, week_start)
);

alter table weekly_report_notes enable row level security;

-- 교사·관리자만 읽고 쓴다. 학생에게는 보이지 않는다.
create policy "staff read weekly notes" on weekly_report_notes
  for select using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('admin', 'teacher'))
  );

create policy "staff write weekly notes" on weekly_report_notes
  for all using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('admin', 'teacher'))
  );
```

- [ ] **Step 2: DataContext에 state와 매퍼 추가**

`src/context/DataContext.jsx`의 매퍼 함수들 옆(`toAttendance` 근처)에 추가:

```js
function toWeeklyNote(n) {
  return {
    id: n.id, studentId: n.student_id, weekStart: n.week_start,
    content: n.content ?? '', updatedAt: n.updated_at,
  }
}
```

state 선언부(`const [homeworkSubmissions, ...]` 다음 줄)에 추가:

```js
  const [weeklyNotes, setWeeklyNotes] = useState([])
```

- [ ] **Step 3: 초기 로드에 추가**

`useEffect` 안 `Promise.all` 배열의 마지막 항목(`profiles ... role student`) **앞에** 한 줄 추가하고, 구조 분해 배열에도 같은 위치에 `wnRes`를 넣는다:

```js
      const [cRes, sRes, aRes, gRes, qRes, nRes, rRes, pRes, vRes, vcRes, tRes, subRes,
             hwSetsRes, hwDaysRes, hwQRes, hwSubRes, wnRes, saRes] =
        await Promise.all([
          // ... 기존 항목 그대로 ...
          supabase.from('homework_submissions_v2').select('*'),
          supabase.from('weekly_report_notes').select('*'),
          supabase.from('profiles').select('student_id, username').eq('role', 'student'),
        ])
```

그리고 결과 반영부에 추가:

```js
      if (!wnRes.error && wnRes.data) setWeeklyNotes(wnRes.data.map(toWeeklyNote))
```

> 테이블이 아직 없으면 `wnRes.error`가 들어와 조용히 건너뛴다. 다른 데이터 로드를 막지 않는다.

- [ ] **Step 4: upsert 함수 추가**

`uploadSolutionFile` / `deleteSolutionFile` 아래에 추가:

```js
  // 주간 리포트 코멘트 저장 — 학생·주 조합 하나당 한 줄
  async function upsertWeeklyNote({ studentId, weekStart, content }) {
    const { data, error } = await supabase
      .from('weekly_report_notes')
      .upsert(
        { student_id: studentId, week_start: weekStart, content, updated_at: new Date().toISOString() },
        { onConflict: 'student_id,week_start' }
      )
      .select().single()
    // 실패 시 null을 돌려줘서 화면이 "저장됨"으로 잘못 넘어가지 않게 한다
    if (error) { console.error('주간 코멘트 저장 실패:', error); return null }

    const record = toWeeklyNote(data)
    setWeeklyNotes((prev) => {
      const exists = prev.some((n) => n.studentId === studentId && n.weekStart === weekStart)
      return exists
        ? prev.map((n) => (n.studentId === studentId && n.weekStart === weekStart ? record : n))
        : [...prev, record]
    })
    return record
  }
```

- [ ] **Step 5: Provider value에 노출**

`uploadSolutionFile, deleteSolutionFile,` 다음 줄에 추가:

```js
      weeklyNotes, upsertWeeklyNote,
```

- [ ] **Step 6: 기존 테스트가 안 깨졌는지 확인**

Run: `npx vitest run && npm run lint`
Expected: 전부 PASS, lint 에러 0

- [ ] **Step 7: 커밋**

```bash
git add docs/weekly-report-notes.sql src/context/DataContext.jsx
git commit -m "feat: 주간 리포트 코멘트 테이블과 저장 함수"
```

---

## Task 7: 반 전체 표 컴포넌트

**Files:**
- Create: `src/components/reports/WeeklyReportTable.jsx`
- Test: `src/components/reports/WeeklyReportTable.test.jsx`

**Interfaces:**
- Consumes: `weeklyClassReport`의 `rows` (Task 5)
- Produces:
  - `<WeeklyReportTable rows={rows} noteStudentIds={Set<number>} onSelect={(student) => void} />`
  - 순수 표시 컴포넌트 — `useData`/`useAuth`를 쓰지 않는다. 테스트가 쉬워진다.

- [ ] **Step 1: 실패하는 테스트 작성**

`src/components/reports/WeeklyReportTable.test.jsx` 신규 생성:

```jsx
// src/components/reports/WeeklyReportTable.test.jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import WeeklyReportTable from './WeeklyReportTable'

const ROWS = [
  {
    student: { id: 2, name: '박지후' },
    attendance: { present: 3, late: 1, absent: 1, counted: 5, rate: 80 },
    tests: [], testSummary: { average: 72, count: 1 },
    naesin: { submitted: 3, total: 5, submitRate: 60, correctRate: 80 },
    jeongsi: null,
    flags: ['absence', 'lowHomework'],
  },
  {
    student: { id: 1, name: '김민서' },
    attendance: { present: 5, late: 0, absent: 0, counted: 5, rate: 100 },
    tests: [], testSummary: { average: null, count: 2 },
    naesin: { submitted: 5, total: 5, submitRate: 100, correctRate: 92 },
    jeongsi: { submitted: 4, total: 5, submitRate: 80, correctRate: 75 },
    flags: [],
  },
]

// 셀 값은 숫자 안에 보조 span이 섞여 있고 같은 값이 여러 열에 나올 수 있다.
// getByText로 잡으면 깨지기 쉬워서 셀마다 testid로 찍어 확인한다.
const cell = (studentId, key) => screen.getByTestId(`${key}-${studentId}`).textContent

describe('WeeklyReportTable', () => {
  it('학생별 출석·테스트·내신·정시를 보여준다', () => {
    render(<WeeklyReportTable rows={ROWS} noteStudentIds={new Set()} onSelect={vi.fn()} />)

    expect(screen.getByText('박지후')).toBeInTheDocument()
    expect(cell(2, 'att')).toContain('4/5')      // 출석+지각 / 전체
    expect(cell(2, 'att')).toContain('지1')
    expect(cell(2, 'att')).toContain('결1')
    expect(cell(2, 'test')).toContain('72점')
    expect(cell(2, 'naesin')).toContain('3/5')
    expect(cell(2, 'naesin')).toContain('80%')
  })

  it('배정이 없는 칸은 -로 표시한다', () => {
    render(<WeeklyReportTable rows={ROWS} noteStudentIds={new Set()} onSelect={vi.fn()} />)
    // 박지후는 정시과제 배정이 없다 — 0/0이 아니라 "기록 없음"이어야 한다
    expect(cell(2, 'jeongsi')).toBe('-')
    expect(cell(1, 'jeongsi')).toContain('4/5')
  })

  it('채점된 시험이 없으면 0점이 아니라 채점중으로 보여준다', () => {
    render(<WeeklyReportTable rows={ROWS} noteStudentIds={new Set()} onSelect={vi.fn()} />)
    // 김민서는 2건 다 채점 전
    expect(cell(1, 'test')).toContain('채점중')
    expect(cell(1, 'test')).toContain('(2건)')
  })

  it('코멘트가 있는 학생에 표시를 남긴다', () => {
    render(<WeeklyReportTable rows={ROWS} noteStudentIds={new Set([2])} onSelect={vi.fn()} />)
    expect(screen.getByTestId('note-mark-2')).toBeInTheDocument()
    expect(screen.queryByTestId('note-mark-1')).not.toBeInTheDocument()
  })

  it('이름을 누르면 그 학생으로 onSelect가 불린다', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(<WeeklyReportTable rows={ROWS} noteStudentIds={new Set()} onSelect={onSelect} />)

    await user.click(screen.getByText('김민서'))
    expect(onSelect).toHaveBeenCalledWith(ROWS[1].student)
  })

  it('학생이 없으면 안내 문구를 보여준다', () => {
    render(<WeeklyReportTable rows={[]} noteStudentIds={new Set()} onSelect={vi.fn()} />)
    expect(screen.getByText(/등록된 학생이 없습니다/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: 테스트를 돌려 실패를 확인**

Run: `npx vitest run src/components/reports/WeeklyReportTable.test.jsx`
Expected: FAIL — `Failed to resolve import "./WeeklyReportTable"`

- [ ] **Step 3: 구현**

`src/components/reports/WeeklyReportTable.jsx` 신규 생성:

```jsx
// src/components/reports/WeeklyReportTable.jsx
// 주간 리포트 — 한 반의 한 주를 표 하나로. 표시만 하고 데이터는 받아 쓴다.
import { AlertTriangle, StickyNote } from 'lucide-react'

// 출석: (출석+지각)/전체. 지각·결석은 뒤에 별기해 감춰지지 않게 한다.
function AttendanceCell({ att }) {
  if (!att) return <span className="text-gray-300">-</span>
  const notes = []
  if (att.late > 0)   notes.push(`지${att.late}`)
  if (att.absent > 0) notes.push(`결${att.absent}`)
  return (
    <span>
      {att.present + att.late}/{att.counted}
      {notes.length > 0 && (
        <span className="ml-1 text-xs text-[#C0392B]">{notes.join(' ')}</span>
      )}
    </span>
  )
}

// 테스트: 채점된 게 없으면 0점처럼 보이지 않게 상태만 보여준다.
function TestCell({ summary }) {
  if (!summary) return <span className="text-gray-300">-</span>
  const suffix = summary.count > 1 ? ` (${summary.count}건)` : ''
  if (summary.average == null) {
    return <span className="text-gray-500">채점중{suffix}</span>
  }
  return <span>{summary.average}점{suffix}</span>
}

// 과제: 제출 회차 / 배정 회차 + 정답률
function HomeworkCell({ hw }) {
  if (!hw) return <span className="text-gray-300">-</span>
  return (
    <span>
      {hw.submitted}/{hw.total}
      {hw.correctRate != null && (
        <span className="ml-1 text-xs text-gray-400">{hw.correctRate}%</span>
      )}
    </span>
  )
}

export default function WeeklyReportTable({ rows, noteStudentIds, onSelect }) {
  if (rows.length === 0) {
    return <p className="text-center text-gray-400 py-12">이 반에 등록된 학생이 없습니다.</p>
  }

  return (
    <div className="overflow-x-auto bg-white rounded-xl shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 text-gray-500 text-xs">
            <th className="text-left  px-4 py-3 font-medium">이름</th>
            <th className="text-right px-3 py-3 font-medium">출석</th>
            <th className="text-right px-3 py-3 font-medium">테스트</th>
            <th className="text-right px-3 py-3 font-medium">내신과제</th>
            <th className="text-right px-3 py-3 font-medium whitespace-nowrap">정시과제</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.student.id}
              className="border-b border-gray-50 last:border-0 hover:bg-[#F4F3EE] cursor-pointer"
              onClick={() => onSelect(row.student)}>
              <td className="px-4 py-3">
                <span className="font-medium text-[#2B2B2B]">{row.student.name}</span>
                {row.flags.length > 0 && (
                  <AlertTriangle className="inline-block ml-1.5 w-3.5 h-3.5 text-[#C0392B]"
                    data-testid={`flag-${row.student.id}`} />
                )}
                {noteStudentIds.has(row.student.id) && (
                  <StickyNote className="inline-block ml-1 w-3.5 h-3.5 text-[#5B8FD4]"
                    data-testid={`note-mark-${row.student.id}`} />
                )}
              </td>
              <td className="text-right px-3 py-3" data-testid={`att-${row.student.id}`}>
                <AttendanceCell att={row.attendance} />
              </td>
              <td className="text-right px-3 py-3" data-testid={`test-${row.student.id}`}>
                <TestCell summary={row.testSummary} />
              </td>
              <td className="text-right px-3 py-3" data-testid={`naesin-${row.student.id}`}>
                <HomeworkCell hw={row.naesin} />
              </td>
              <td className="text-right px-3 py-3" data-testid={`jeongsi-${row.student.id}`}>
                <HomeworkCell hw={row.jeongsi} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/components/reports/WeeklyReportTable.test.jsx`
Expected: PASS (6 tests)

- [ ] **Step 5: 커밋**

```bash
git add src/components/reports/WeeklyReportTable.jsx src/components/reports/WeeklyReportTable.test.jsx
git commit -m "feat: 주간 리포트 반 전체 표 컴포넌트"
```

---

## Task 8: 개인 상세 + 코멘트 입력

**Files:**
- Create: `src/components/reports/WeeklyStudentDetail.jsx`
- Test: `src/components/reports/WeeklyStudentDetail.test.jsx`

**Interfaces:**
- Consumes: `weeklyClassReport`의 `row` 하나 + `dates` (Task 5)
- Produces:
  - `<WeeklyStudentDetail row={row} dates={dates} weekStart={string} attendanceRecords={[]} note={note|null} onSaveNote={(content) => Promise<note|null>} onBack={() => void} />`
  - `attendanceRecords`는 그 학생의 원본 출결 레코드 — 요일별 ○/지각/결석을 그리는 데 쓴다

- [ ] **Step 1: 실패하는 테스트 작성**

`src/components/reports/WeeklyStudentDetail.test.jsx` 신규 생성:

```jsx
// src/components/reports/WeeklyStudentDetail.test.jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import WeeklyStudentDetail from './WeeklyStudentDetail'

const DATES = ['2026-08-10', '2026-08-11', '2026-08-12', '2026-08-13', '2026-08-14', '2026-08-15']

const ROW = {
  student: { id: 2, name: '박지후' },
  attendance: { present: 3, late: 1, absent: 1, counted: 5, rate: 80 },
  tests: [
    { test: { id: 100, title: '문학' }, score: 72, total: 100, state: 'graded' },
    { test: { id: 101, title: '독서' }, score: null, total: 100, state: 'absent' },
  ],
  testSummary: { average: 72, count: 2 },
  naesin: { submitted: 3, total: 5, submitRate: 60, correctRate: 80 },
  jeongsi: null,
  flags: ['absence', 'lowHomework'],
}

const ATT_RECORDS = [
  { studentId: 2, date: '2026-08-10', status: 'present' },
  { studentId: 2, date: '2026-08-11', status: 'late'    },
  { studentId: 2, date: '2026-08-12', status: 'absent'  },
]

function renderDetail(overrides = {}) {
  const props = {
    row: ROW, dates: DATES, weekStart: '2026-08-10',
    attendanceRecords: ATT_RECORDS, note: null,
    onSaveNote: vi.fn().mockResolvedValue({ id: 1, content: '저장됨' }),
    onBack: vi.fn(),
    ...overrides,
  }
  render(<WeeklyStudentDetail {...props} />)
  return props
}

describe('WeeklyStudentDetail', () => {
  it('세 영역을 모두 보여준다', () => {
    renderDetail()
    expect(screen.getByText('박지후')).toBeInTheDocument()
    expect(screen.getByText(/문학/)).toBeInTheDocument()
    expect(screen.getByText(/72/)).toBeInTheDocument()
    expect(screen.getByText(/미응시/)).toBeInTheDocument()
    expect(screen.getByText(/내신/)).toBeInTheDocument()
  })

  it('정시 과제 배정이 없으면 배정 없음으로 알린다', () => {
    renderDetail()
    expect(screen.getByText(/정시.*배정 없음/)).toBeInTheDocument()
  })

  it('요일별 출결을 보여준다', () => {
    renderDetail()
    expect(screen.getByTestId('att-2026-08-11')).toHaveTextContent('지각')
    expect(screen.getByTestId('att-2026-08-12')).toHaveTextContent('결석')
    // 기록이 없는 날은 빈칸으로 둔다 — 결석으로 단정하면 안 된다
    expect(screen.getByTestId('att-2026-08-15')).toHaveTextContent('-')
  })

  it('기존 코멘트를 입력창에 채워서 연다', () => {
    renderDetail({ note: { id: 5, content: '이번 주 집중력 좋았음' } })
    expect(screen.getByRole('textbox')).toHaveValue('이번 주 집중력 좋았음')
  })

  it('코멘트를 저장하면 onSaveNote가 내용과 함께 불린다', async () => {
    const user = userEvent.setup()
    const props = renderDetail()

    await user.type(screen.getByRole('textbox'), '과제 독려 필요')
    await user.click(screen.getByRole('button', { name: '저장' }))

    expect(props.onSaveNote).toHaveBeenCalledWith('과제 독려 필요')
    expect(await screen.findByText(/저장했습니다/)).toBeInTheDocument()
  })

  it('저장에 실패하면 입력 내용을 남기고 에러를 보여준다', async () => {
    const user = userEvent.setup()
    renderDetail({ onSaveNote: vi.fn().mockResolvedValue(null) })

    await user.type(screen.getByRole('textbox'), '지워지면 안 되는 메모')
    await user.click(screen.getByRole('button', { name: '저장' }))

    expect(await screen.findByText(/저장에 실패했습니다/)).toBeInTheDocument()
    expect(screen.getByRole('textbox')).toHaveValue('지워지면 안 되는 메모')
  })

  it('목록으로 버튼이 onBack을 부른다', async () => {
    const user = userEvent.setup()
    const props = renderDetail()
    await user.click(screen.getByRole('button', { name: /목록/ }))
    expect(props.onBack).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: 테스트를 돌려 실패를 확인**

Run: `npx vitest run src/components/reports/WeeklyStudentDetail.test.jsx`
Expected: FAIL — `Failed to resolve import "./WeeklyStudentDetail"`

- [ ] **Step 3: 구현**

`src/components/reports/WeeklyStudentDetail.jsx` 신규 생성:

```jsx
// src/components/reports/WeeklyStudentDetail.jsx
// 주간 리포트 — 학생 한 명의 한 주 + 교사 코멘트.
import { useState } from 'react'
import { WEEKDAY_LABELS, WEEKDAYS } from '../../constants/homework'

const ATT_LABEL = { present: '출석', late: '지각', absent: '결석' }

// 과제 한 종류를 한 줄로. 배정이 없으면 "0% 제출"이 아니라 "배정 없음"이다.
function HomeworkLine({ label, hw }) {
  if (!hw) return <p className="text-sm text-gray-400">{label} — 배정 없음</p>
  return (
    <p className="text-sm text-[#2B2B2B]">
      {label} {hw.submitted}/{hw.total} 제출
      {hw.correctRate != null && <span className="text-gray-500"> · 정답률 {hw.correctRate}%</span>}
    </p>
  )
}

export default function WeeklyStudentDetail({
  row, dates, attendanceRecords, note, onSaveNote, onBack,
}) {
  const [content, setContent] = useState(note?.content ?? '')
  const [saving, setSaving]   = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError]     = useState('')

  const statusByDate = Object.fromEntries(
    attendanceRecords
      .filter((a) => a.studentId === row.student.id)
      .map((a) => [a.date, a.status])
  )

  async function handleSave() {
    if (saving) return
    setSaving(true)
    setError('')
    setMessage('')
    const saved = await onSaveNote(content)
    setSaving(false)
    // 실패했는데 입력을 지우면 교사가 쓴 내용이 날아간다
    if (!saved) {
      setError('저장에 실패했습니다. 입력한 내용은 그대로 두었으니 다시 시도해 주세요.')
      return
    }
    setMessage('저장했습니다.')
  }

  return (
    <div>
      <button onClick={onBack} className="text-sm text-gray-500 mb-3">← 목록</button>
      <h2 className="text-lg font-bold text-[#2B2B2B] mb-4">{row.student.name}</h2>

      {/* 출석 — 요일별로 펼쳐 보여준다. 숫자만으로는 언제 빠졌는지 알 수 없다 */}
      <section className="bg-white rounded-xl p-4 shadow-sm mb-3">
        <p className="text-sm font-semibold text-gray-700 mb-2">
          출석 {row.attendance ? `${row.attendance.present + row.attendance.late}/${row.attendance.counted}` : '기록 없음'}
        </p>
        <div className="flex gap-2">
          {WEEKDAYS.map((wd, i) => (
            <div key={wd} className="flex-1 text-center">
              <p className="text-xs text-gray-400 mb-1">{WEEKDAY_LABELS[wd]}</p>
              <p data-testid={`att-${dates[i]}`}
                className={`text-xs ${statusByDate[dates[i]] === 'absent' ? 'text-[#C0392B]' : 'text-[#2B2B2B]'}`}>
                {ATT_LABEL[statusByDate[dates[i]]] ?? '-'}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 주간테스트 */}
      <section className="bg-white rounded-xl p-4 shadow-sm mb-3">
        <p className="text-sm font-semibold text-gray-700 mb-2">주간테스트</p>
        {row.tests.length === 0 && <p className="text-sm text-gray-400">이번 주 시험이 없습니다.</p>}
        {row.tests.map((t) => (
          <p key={t.test.id} className="text-sm text-[#2B2B2B]">
            {t.test.title}{' '}
            {t.state === 'graded'  && <span>{t.score}/{t.total}</span>}
            {t.state === 'grading' && <span className="text-gray-500">채점중</span>}
            {t.state === 'absent'  && <span className="text-[#C0392B]">미응시</span>}
          </p>
        ))}
      </section>

      {/* 주간과제 */}
      <section className="bg-white rounded-xl p-4 shadow-sm mb-3">
        <p className="text-sm font-semibold text-gray-700 mb-2">주간과제</p>
        <HomeworkLine label="내신" hw={row.naesin} />
        <HomeworkLine label="정시" hw={row.jeongsi} />
      </section>

      {/* 교사 코멘트 */}
      <section className="bg-white rounded-xl p-4 shadow-sm">
        <p className="text-sm font-semibold text-gray-700 mb-2">교사 코멘트</p>
        <textarea
          value={content} onChange={(e) => setContent(e.target.value)} rows={3}
          placeholder="상담이나 다음 주 지도에 참고할 내용을 적어 두세요."
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5B8FD4]"
        />
        {error   && <p className="text-sm text-[#C0392B] bg-[#C0392B]/10 rounded-lg px-3 py-2 mt-2">{error}</p>}
        {message && <p className="text-sm text-[#5B8FD4] mt-2">{message}</p>}
        <button onClick={handleSave} disabled={saving}
          className="w-full py-2.5 mt-3 bg-[#2B2B2B] text-white rounded-xl text-sm font-medium disabled:opacity-40">
          {saving ? '저장 중...' : '저장'}
        </button>
      </section>
    </div>
  )
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/components/reports/WeeklyStudentDetail.test.jsx`
Expected: PASS (8 tests)

- [ ] **Step 5: 커밋**

```bash
git add src/components/reports/WeeklyStudentDetail.jsx src/components/reports/WeeklyStudentDetail.test.jsx
git commit -m "feat: 주간 리포트 개인 상세와 교사 코멘트"
```

---

## Task 9: 페이지 · 라우트 · 사이드바 연결

**Files:**
- Create: `src/pages/WeeklyReport.jsx`
- Create: `src/pages/WeeklyReport.test.jsx`
- Modify: `src/App.jsx`
- Modify: `src/components/Sidebar.jsx:33` 근처 (소통 섹션)

**Interfaces:**
- Consumes: `weeklyClassReport` (Task 5), `weeklyNotes`/`upsertWeeklyNote` (Task 6), `WeeklyReportTable` (Task 7), `WeeklyStudentDetail` (Task 8), `mondayOf` (기존)
- Produces: `/weekly-report` 라우트에서 동작하는 완성 화면

- [ ] **Step 1: 실패하는 테스트 작성**

`src/pages/WeeklyReport.test.jsx` 신규 생성:

```jsx
// src/pages/WeeklyReport.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import WeeklyReport from './WeeklyReport'

const state = {}
vi.mock('../context/AuthContext', () => ({ useAuth: () => state.auth }))
vi.mock('../context/DataContext', () => ({ useData: () => state.data }))
vi.mock('../components/Layout', () => ({ default: ({ children }) => <div>{children}</div> }))

beforeEach(() => {
  state.auth = { user: { id: 'teacher-1', role: 'teacher' } }
  state.data = {
    classes: [{ id: 10, name: '수능국어A반' }],
    students: [{ id: 1, name: '김민서', classId: 10, grade: 5, jeongsiLevel: null }],
    attendance: [], tests: [], submissions: [],
    homeworkSets: [], homeworkDays: [], homeworkQuestions: [], homeworkSubmissions: [],
    weeklyNotes: [],
    upsertWeeklyNote: vi.fn().mockResolvedValue({ id: 1, content: 'ok' }),
  }
})

describe('WeeklyReport', () => {
  it('학생은 접근할 수 없다', () => {
    state.auth = { user: { id: 's1', role: 'student', studentId: 1 } }
    render(<WeeklyReport />)
    expect(screen.getByText(/접근 권한이 없습니다/)).toBeInTheDocument()
  })

  it('교사는 반의 주간 표를 본다', () => {
    render(<WeeklyReport />)
    expect(screen.getByText('주간 리포트')).toBeInTheDocument()
    expect(screen.getByText('김민서')).toBeInTheDocument()
  })

  it('이전 주 버튼을 누르면 표시되는 주가 바뀐다', async () => {
    const user = userEvent.setup()
    render(<WeeklyReport />)
    const before = screen.getByTestId('week-label').textContent
    await user.click(screen.getByRole('button', { name: '이전 주' }))
    expect(screen.getByTestId('week-label').textContent).not.toBe(before)
  })

  it('학생을 누르면 개인 상세로 들어가고 목록으로 돌아온다', async () => {
    const user = userEvent.setup()
    render(<WeeklyReport />)

    await user.click(screen.getByText('김민서'))
    expect(screen.getByText('교사 코멘트')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /목록/ }))
    expect(screen.queryByText('교사 코멘트')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: 테스트를 돌려 실패를 확인**

Run: `npx vitest run src/pages/WeeklyReport.test.jsx`
Expected: FAIL — `Failed to resolve import "./WeeklyReport"`

- [ ] **Step 3: 페이지 구현**

`src/pages/WeeklyReport.jsx` 신규 생성:

```jsx
// src/pages/WeeklyReport.jsx
// 주간 리포트 — 반 하나의 한 주(출석·주간테스트·주간과제)를 한 표로. 교사/관리자 전용.
import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import Layout from '../components/Layout'
import WeeklyReportTable from '../components/reports/WeeklyReportTable'
import WeeklyStudentDetail from '../components/reports/WeeklyStudentDetail'
import { weeklyClassReport } from '../utils/weeklyReport'
import { mondayOf, dateForWeekday } from '../utils/homeworkWeek'

// 주 시작에서 n주 이동한 월요일
function shiftWeek(weekStart, weeks) {
  return mondayOf(dateForWeekday(weekStart, 1 + weeks * 7))
}

export default function WeeklyReport() {
  const { user } = useAuth()
  const {
    classes, students, attendance, tests, submissions,
    homeworkSets, homeworkDays, homeworkQuestions, homeworkSubmissions,
    weeklyNotes, upsertWeeklyNote,
  } = useData()

  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date().toISOString().slice(0, 10)))
  const [classId, setClassId]     = useState(() => classes[0]?.id ?? null)
  const [selected, setSelected]   = useState(null)

  // 학생은 이 페이지에 접근 불가
  if (user.role === 'student') {
    return (
      <Layout>
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg">접근 권한이 없습니다.</p>
        </div>
      </Layout>
    )
  }

  const report = weeklyClassReport({
    students, attendance, tests, testSubmissions: submissions,
    homeworkSets, homeworkDays, homeworkQuestions, homeworkSubmissions,
    classId: Number(classId), weekStart,
  })

  const noteOf = (studentId) =>
    weeklyNotes.find((n) => n.studentId === studentId && n.weekStart === weekStart) ?? null
  const noteStudentIds = new Set(
    weeklyNotes.filter((n) => n.weekStart === weekStart && n.content.trim()).map((n) => n.studentId)
  )

  const selectedRow = selected && report.rows.find((r) => r.student.id === selected.id)

  return (
    <Layout>
      <div>
        <h1 className="text-xl font-bold text-[#2B2B2B] mb-4">주간 리포트</h1>

        {/* 주 이동 + 반 선택 */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <button aria-label="이전 주" onClick={() => setWeekStart(shiftWeek(weekStart, -1))}
            className="p-1.5 rounded-lg bg-white shadow-sm"><ChevronLeft className="w-4 h-4" /></button>
          <span data-testid="week-label" className="text-sm font-medium text-[#2B2B2B]">
            {weekStart} ~ {dateForWeekday(weekStart, 6)}
          </span>
          <button aria-label="다음 주" onClick={() => setWeekStart(shiftWeek(weekStart, 1))}
            className="p-1.5 rounded-lg bg-white shadow-sm"><ChevronRight className="w-4 h-4" /></button>

          <select value={classId ?? ''} onChange={(e) => { setClassId(e.target.value); setSelected(null) }}
            className="ml-auto border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white">
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {selectedRow ? (
          <WeeklyStudentDetail
            row={selectedRow}
            dates={report.dates}
            weekStart={weekStart}
            attendanceRecords={attendance}
            note={noteOf(selectedRow.student.id)}
            onSaveNote={(content) =>
              upsertWeeklyNote({ studentId: selectedRow.student.id, weekStart, content })}
            onBack={() => setSelected(null)}
          />
        ) : (
          <WeeklyReportTable
            rows={report.rows}
            noteStudentIds={noteStudentIds}
            onSelect={setSelected}
          />
        )}
      </div>
    </Layout>
  )
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/pages/WeeklyReport.test.jsx`
Expected: PASS (4 tests)

- [ ] **Step 5: 라우트 추가**

`src/App.jsx` — import 목록에 추가:

```jsx
import WeeklyReport from './pages/WeeklyReport'
```

`/reports` 라우트 블록 바로 아래에 추가:

```jsx
          {/* 주간 리포트 (관리자, 교사만) */}
          <Route
            path="/weekly-report"
            element={
              <ProtectedRoute allowedRoles={['admin', 'teacher']}>
                <WeeklyReport />
              </ProtectedRoute>
            }
          />
```

- [ ] **Step 6: 사이드바 메뉴 추가**

`src/components/Sidebar.jsx` — 아이콘 import에 `CalendarRange`를 추가:

```jsx
import {
  Users, School, ClipboardCheck, BarChart2,
  Video, ClipboardList, PencilLine, MessageCircle, Bell, TrendingUp, LogOut, KeyRound, UserCog,
  CalendarRange,
} from 'lucide-react'
```

「소통」 섹션의 `진도 리포트` 줄 아래에 추가:

```jsx
      { label: '주간 리포트', path: '/weekly-report', Icon: CalendarRange },
```

- [ ] **Step 7: 전체 검증**

Run: `npx vitest run && npm run lint && npm run build`
Expected: 전체 테스트 PASS, lint 에러 0, 빌드 성공

- [ ] **Step 8: 커밋**

```bash
git add src/pages/WeeklyReport.jsx src/pages/WeeklyReport.test.jsx src/App.jsx src/components/Sidebar.jsx
git commit -m "feat: 주간 리포트 페이지 · 라우트 · 사이드바 메뉴"
```

---

## Task 10: 문서 갱신과 마무리

**Files:**
- Modify: `CLAUDE.md` (기능 목록 표)
- Modify: `MANUAL.md` (교사 사용법)

**Interfaces:**
- Consumes: Task 1~9 전부
- Produces: 없음 (문서만)

- [ ] **Step 1: Supabase에 테이블 생성**

`docs/weekly-report-notes.sql` 내용을 Supabase 대시보드 → SQL Editor에 붙여넣고 실행한다.
실행 후 Table Editor에서 `weekly_report_notes` 테이블이 보이는지 확인한다.

> 이걸 하지 않으면 코멘트 저장이 항상 실패한다(표와 계산은 정상 동작한다).

- [ ] **Step 2: `CLAUDE.md` 기능 목록 갱신**

기능 목록 표의 9번 아래에 한 줄 추가:

```markdown
| 10 | 주간 리포트 (학생별 출석+테스트+과제 통합) | ✅ 완료 |
```

- [ ] **Step 3: `MANUAL.md`에 사용법 추가**

교사용 섹션에 추가:

```markdown
### 주간 리포트

사이드바 → 소통 → 주간 리포트

한 반의 한 주를 표 하나로 봅니다. 출석·주간테스트·내신과제·정시과제가 학생별로 나옵니다.

- 위쪽 `◀ ▶`로 지난 주를 볼 수 있습니다
- ⚠ 표시는 결석이 있거나, 시험을 안 봤거나, 과제 제출률이 70% 미만인 학생입니다.
  이런 학생이 표 위쪽에 먼저 나옵니다
- `-`는 "기록이 없음"입니다. 0점이나 0%와 다릅니다
- `채점중`은 주관식 채점이 아직 안 끝난 시험입니다
- 학생 이름을 누르면 요일별 출결과 시험별 점수를 볼 수 있고, 상담용 코멘트를 남길 수 있습니다
- 이 화면은 교사·관리자만 볼 수 있습니다. 학생에게는 보이지 않습니다
```

- [ ] **Step 4: 커밋**

```bash
git add CLAUDE.md MANUAL.md
git commit -m "docs: 주간 리포트 기능 목록·사용법 추가"
```

---

## Self-Review 결과

**스펙 커버리지 확인**

| 스펙 항목 | 담당 태스크 |
|---|---|
| 2-1 교사·관리자 전용 | Task 9 (Step 3 권한 차단, Step 5 ProtectedRoute) |
| 2-2 반 표 → 개인 상세 | Task 7, 8, 9 |
| 2-3 반 단위 묶음 + 학생별 과제 매칭 | Task 4 (`matchesStudent`), Task 5 |
| 2-4 내신/정시 열 분리 | Task 7 (`HomeworkCell` 2열) |
| 2-5 코멘트 저장 | Task 6, 8 |
| 2-6 사이드바 새 메뉴 | Task 9 Step 6 |
| 2-7 월~토 주 범위 | Task 1 (`weekDates`) |
| 3.1 출석 (지각 포함, null 구분) | Task 2 |
| 3.2 테스트 (absent/grading/graded, 백분율 평균) | Task 3 |
| 3.3 과제 (낸 회차만 정답률 분모) | Task 4 |
| 3.4 flags 3종 + 정렬 | Task 5 |
| 4 `weekly_report_notes` 테이블 | Task 6 Step 1, Task 10 Step 1 |
| 7 권한·빈 상태·저장 실패 | Task 7 (빈 표), Task 8 (저장 실패), Task 9 (권한) |
| 8 테스트 계획 | Task 2~5 (계산), 7~9 (화면) |

빠진 항목: 스펙 7절의 "그 주에 데이터가 전혀 없으면 안내" — 표는 학생 행을 그리고 각 칸이 `-`가 되므로 별도 빈 상태 화면을 두지 않는다. 학생이 없을 때의 안내만 Task 7에서 처리한다. 각 칸의 `-`가 "기록 없음"을 이미 말해주므로 화면을 하나 더 만들 이유가 없다.

**타입 일관성 확인** — `weeklyAttendance`가 돌려주는 `{present, late, absent, counted, rate}`를 Task 7 `AttendanceCell`과 Task 8이 같은 이름으로 쓴다. `weeklyTests`의 `{rows, summary}`를 Task 5가 `{rows: testRows, summary}`로 받아 `testSummary`로 넘기고, Task 7 `TestCell`이 `summary` prop으로 받는다. `weeklyHomework`의 `{submitted, total, submitRate, correctRate}`를 Task 7 `HomeworkCell`과 Task 8 `HomeworkLine`이 같은 이름으로 쓴다. 일치한다.

**플레이스홀더 스캔** — 모든 코드 단계에 실제 코드가 들어 있고 TBD/TODO 없음.
