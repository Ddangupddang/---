# 과제 파트 재설계 (내신/정시 · 요일별) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 과제 기능을 반 기반 단일 과제에서, 내신(학년별)·정시(레벨별)로 나뉜 주간 요일별 과제로 재설계한다.

**Architecture:** 순수 함수(상수/날짜/매퍼/선택 로직)를 먼저 TDD로 만들고, Supabase 스키마를 마이그레이션한 뒤, DataContext 데이터 계층을 교체하고, 마지막으로 화면(학생/교사)을 조립한다. 큰 화면은 `src/components/homework/` 아래 작은 컴포넌트로 분리한다.

**Tech Stack:** React 19, Vite 8, Tailwind CSS 4, Supabase(JS v2, Postgres + Storage), Vitest 4 + @testing-library/react, jsdom.

## Global Constraints

- 컴포넌트는 함수형, 파일명 PascalCase, 한글 주석 사용. (프로젝트 CLAUDE.md)
- 색상은 하드코딩된 기존 Tailwind 값 유지: 주색 `#2B2B2B`, 보조 `#5B8FD4`, 강조 `#C0392B`, 배경 `#F4F3EE`.
- Supabase는 snake_case, 앱은 camelCase. 변환은 매퍼 함수로 일원화.
- 학생 로스터 테이블명은 `students` (인증용 `profiles`와 별개). `grade`/`jeongsi_level`은 `students`에 추가.
- 과제 종류 코드: `naesin`(내신), `jeongsi`(정시). 학년 코드: 1=중1 … 6=고3. 정시 레벨: 1/2/3. 요일: 1=월 … 6=토.
- 마감 = 각 요일의 실제 날짜. 이후 제출은 허용하되 "지각" 표시.
- 해설 공개 = 해당 요일 제출 직후.
- 기존 `gradeHomework`, `isLateSubmission`(`src/utils/homework.js`), `ChoiceGrid`, `Layout` 재사용.
- 테스트 실행: `npx vitest run <경로>`. 린트: `npm run lint`.

## File Structure

**신규 생성**
- `src/constants/homework.js` — 종류/학년/레벨/요일 상수·라벨
- `src/utils/homeworkWeek.js` — 주 시작(월요일)·요일→날짜 계산
- `src/utils/homeworkMappers.js` — snake↔camel 매퍼(세트/요일/문항/제출)
- `src/utils/homeworkSelect.js` — 학생↔과제 매칭·요일 상태 판정
- `src/utils/homeworkWeek.test.js`, `homeworkMappers.test.js`, `homeworkSelect.test.js`
- `src/components/homework/SolutionViewer.jsx` — 해설(영상+파일) 표시
- `src/components/homework/StudentHomeworkView.jsx` — 학생 화면
- `src/components/homework/TeacherHomeworkCreate.jsx` — 교사 출제
- `src/components/homework/TeacherHomeworkStatus.jsx` — 교사 현황
- `src/components/homework/StudentHomeworkView.test.jsx` — 학생 화면 테스트
- `docs/... migration SQL`은 문서 내 코드블록으로 제공(Supabase SQL 편집기에서 실행)

**수정**
- `src/context/DataContext.jsx` — 학생 매퍼/CRUD에 grade·jeongsiLevel 추가; 과제 데이터 계층 교체
- `src/pages/Students.jsx` — 학생 추가/수정 폼에 학년·정시레벨 입력
- `src/pages/Homework.jsx` — 내신/정시 탭 + 역할별 뷰 조립(기존 내용 대체)

---

### Task 1: 과제 상수 (constants/homework.js)

**Files:**
- Create: `src/constants/homework.js`

**Interfaces:**
- Produces:
  - `HW_CATEGORY = { NAESIN: 'naesin', JEONGSI: 'jeongsi' }`
  - `CATEGORY_LABELS: { naesin: '내신과제', jeongsi: '정시과제' }`
  - `GRADES: number[]` = `[1,2,3,4,5,6]`, `GRADE_LABELS: { [n]: string }`
  - `JEONGSI_LEVELS: number[]` = `[1,2,3]`, `JEONGSI_LEVEL_LABELS: { [n]: string }`
  - `WEEKDAYS: number[]` = `[1,2,3,4,5,6]`, `WEEKDAY_LABELS: { [n]: string }`

- [ ] **Step 1: 상수 파일 작성**

```javascript
// src/constants/homework.js
// 과제(내신/정시) 관련 상수와 표시 라벨을 한 곳에서 관리한다.

// 과제 종류 코드
export const HW_CATEGORY = { NAESIN: 'naesin', JEONGSI: 'jeongsi' }
export const CATEGORY_LABELS = { naesin: '내신과제', jeongsi: '정시과제' }

// 학년: 1=중1 … 6=고3 (내신과제 그룹 기준)
export const GRADES = [1, 2, 3, 4, 5, 6]
export const GRADE_LABELS = { 1: '중1', 2: '중2', 3: '중3', 4: '고1', 5: '고2', 6: '고3' }

// 정시 레벨: 1/2/3 (정시과제 그룹 기준)
export const JEONGSI_LEVELS = [1, 2, 3]
export const JEONGSI_LEVEL_LABELS = { 1: '1레벨', 2: '2레벨', 3: '3레벨' }

// 요일: 1=월 … 6=토
export const WEEKDAYS = [1, 2, 3, 4, 5, 6]
export const WEEKDAY_LABELS = { 1: '월', 2: '화', 3: '수', 4: '목', 5: '금', 6: '토' }
```

- [ ] **Step 2: 린트 확인**

Run: `npx eslint src/constants/homework.js`
Expected: 출력 없음(오류 0)

- [ ] **Step 3: 커밋**

```bash
git add src/constants/homework.js
git commit -m "feat: 과제 내신/정시 상수·라벨 추가"
```

---

### Task 2: 주차·요일 날짜 유틸 (utils/homeworkWeek.js)

**Files:**
- Create: `src/utils/homeworkWeek.js`
- Test: `src/utils/homeworkWeek.test.js`

**Interfaces:**
- Produces:
  - `mondayOf(dateStr: 'YYYY-MM-DD'): 'YYYY-MM-DD'` — 그 날짜가 속한 주의 월요일
  - `dateForWeekday(weekStart: 'YYYY-MM-DD', weekday: 1..6): 'YYYY-MM-DD'` — 주 시작(월) 기준 요일의 실제 날짜

- [ ] **Step 1: 실패하는 테스트 작성**

```javascript
// src/utils/homeworkWeek.test.js
import { describe, it, expect } from 'vitest'
import { mondayOf, dateForWeekday } from './homeworkWeek'

describe('mondayOf', () => {
  it('수요일(2026-08-12)이 속한 주의 월요일은 2026-08-10', () => {
    expect(mondayOf('2026-08-12')).toBe('2026-08-10')
  })
  it('월요일을 넣으면 그대로 반환', () => {
    expect(mondayOf('2026-08-10')).toBe('2026-08-10')
  })
  it('일요일(2026-08-16)은 그 주 시작 월요일 2026-08-10', () => {
    expect(mondayOf('2026-08-16')).toBe('2026-08-10')
  })
})

describe('dateForWeekday', () => {
  it('월(1)은 주 시작 그대로', () => {
    expect(dateForWeekday('2026-08-10', 1)).toBe('2026-08-10')
  })
  it('토(6)는 +5일', () => {
    expect(dateForWeekday('2026-08-10', 6)).toBe('2026-08-15')
  })
  it('월말을 넘는 계산도 정확 (2026-08-31 월 → 토는 2026-09-05)', () => {
    expect(dateForWeekday('2026-08-31', 6)).toBe('2026-09-05')
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run src/utils/homeworkWeek.test.js`
Expected: FAIL — `mondayOf`/`dateForWeekday` is not defined

- [ ] **Step 3: 최소 구현**

```javascript
// src/utils/homeworkWeek.js
// 주 시작(월요일)·요일→날짜 계산. 시간대 영향을 없애려고 UTC로만 계산한다.

// 'YYYY-MM-DD' → 그 주의 월요일 'YYYY-MM-DD'
export function mondayOf(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  const dow = dt.getUTCDay()             // 0=일 … 6=토
  const diff = dow === 0 ? -6 : 1 - dow  // 월요일까지 이동
  dt.setUTCDate(dt.getUTCDate() + diff)
  return dt.toISOString().slice(0, 10)
}

// 주 시작(월요일) + 요일(1=월 … 6=토) → 실제 날짜 'YYYY-MM-DD'
export function dateForWeekday(weekStart, weekday) {
  const [y, m, d] = weekStart.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() + (weekday - 1))
  return dt.toISOString().slice(0, 10)
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/utils/homeworkWeek.test.js`
Expected: PASS (9 assertions)

- [ ] **Step 5: 커밋**

```bash
git add src/utils/homeworkWeek.js src/utils/homeworkWeek.test.js
git commit -m "feat: 주차·요일 날짜 계산 유틸 추가"
```

---

### Task 3: 과제 매퍼 (utils/homeworkMappers.js)

**Files:**
- Create: `src/utils/homeworkMappers.js`
- Test: `src/utils/homeworkMappers.test.js`

**Interfaces:**
- Produces (Supabase row → 앱 객체):
  - `toHomeworkSet(r) -> { id, category, target, weekStart, title, teacherId, createdAt }`
  - `toHomeworkDay(r) -> { id, setId, weekday, date, questionCount, daySolutionVideoUrl, daySolutionFileUrl }`
  - `toHomeworkQuestion(r) -> { id, dayId, number, answer, solutionVideoUrl, solutionFileUrl }`
  - `toHomeworkSubmission(r) -> { id, dayId, studentId, answers, submittedAt }`

- [ ] **Step 1: 실패하는 테스트 작성**

```javascript
// src/utils/homeworkMappers.test.js
import { describe, it, expect } from 'vitest'
import {
  toHomeworkSet, toHomeworkDay, toHomeworkQuestion, toHomeworkSubmission,
} from './homeworkMappers'

describe('homework 매퍼', () => {
  it('toHomeworkSet: snake→camel', () => {
    const row = { id: 1, category: 'naesin', target: 5, week_start: '2026-08-10',
      title: '8월 2주차', teacher_id: 'uid-t', created_at: '2026-08-09T00:00:00Z' }
    expect(toHomeworkSet(row)).toEqual({
      id: 1, category: 'naesin', target: 5, weekStart: '2026-08-10',
      title: '8월 2주차', teacherId: 'uid-t', createdAt: '2026-08-09T00:00:00Z',
    })
  })
  it('toHomeworkDay: null 해설은 빈 문자열로', () => {
    const row = { id: 3, set_id: 1, weekday: 1, date: '2026-08-10', question_count: 20,
      day_solution_video_url: null, day_solution_file_url: null }
    expect(toHomeworkDay(row)).toEqual({
      id: 3, setId: 1, weekday: 1, date: '2026-08-10', questionCount: 20,
      daySolutionVideoUrl: '', daySolutionFileUrl: '',
    })
  })
  it('toHomeworkQuestion: 문항 해설 매핑', () => {
    const row = { id: 9, day_id: 3, number: 1, answer: '③',
      solution_video_url: 'https://y', solution_file_url: '' }
    expect(toHomeworkQuestion(row)).toEqual({
      id: 9, dayId: 3, number: 1, answer: '③',
      solutionVideoUrl: 'https://y', solutionFileUrl: '',
    })
  })
  it('toHomeworkSubmission: answers 기본값 빈 배열', () => {
    const row = { id: 4, day_id: 3, student_id: 7, answers: null, submitted_at: '2026-08-10T09:00:00Z' }
    expect(toHomeworkSubmission(row)).toEqual({
      id: 4, dayId: 3, studentId: 7, answers: [], submittedAt: '2026-08-10T09:00:00Z',
    })
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run src/utils/homeworkMappers.test.js`
Expected: FAIL — 매퍼 미정의

- [ ] **Step 3: 최소 구현**

```javascript
// src/utils/homeworkMappers.js
// Supabase(snake_case) 행 → 앱(camelCase) 객체 변환.

export function toHomeworkSet(r) {
  return {
    id: r.id, category: r.category, target: r.target,
    weekStart: r.week_start, title: r.title,
    teacherId: r.teacher_id, createdAt: r.created_at,
  }
}

export function toHomeworkDay(r) {
  return {
    id: r.id, setId: r.set_id, weekday: r.weekday, date: r.date,
    questionCount: r.question_count,
    daySolutionVideoUrl: r.day_solution_video_url ?? '',
    daySolutionFileUrl: r.day_solution_file_url ?? '',
  }
}

export function toHomeworkQuestion(r) {
  return {
    id: r.id, dayId: r.day_id, number: r.number, answer: r.answer,
    solutionVideoUrl: r.solution_video_url ?? '',
    solutionFileUrl: r.solution_file_url ?? '',
  }
}

export function toHomeworkSubmission(r) {
  return {
    id: r.id, dayId: r.day_id, studentId: r.student_id,
    answers: r.answers ?? [], submittedAt: r.submitted_at,
  }
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/utils/homeworkMappers.test.js`
Expected: PASS (4 tests)

- [ ] **Step 5: 커밋**

```bash
git add src/utils/homeworkMappers.js src/utils/homeworkMappers.test.js
git commit -m "feat: 과제 세트/요일/문항/제출 매퍼 추가"
```

---

### Task 4: 매칭·상태 판정 유틸 (utils/homeworkSelect.js)

**Files:**
- Create: `src/utils/homeworkSelect.js`
- Test: `src/utils/homeworkSelect.test.js`

**Interfaces:**
- Consumes: `isLateSubmission` from `src/utils/homework.js`
- Produces:
  - `matchesStudent(set, student): boolean` — 세트가 이 학생에게 보이는가 (내신=학년, 정시=정시레벨)
  - `dayStatus(day, submission, todayStr): 'none' | 'done' | 'late'`

- [ ] **Step 1: 실패하는 테스트 작성**

```javascript
// src/utils/homeworkSelect.test.js
import { describe, it, expect } from 'vitest'
import { matchesStudent, dayStatus } from './homeworkSelect'

const student = { grade: 5, jeongsiLevel: 2 }

describe('matchesStudent', () => {
  it('내신: 세트 target이 학생 학년과 같으면 true', () => {
    expect(matchesStudent({ category: 'naesin', target: 5 }, student)).toBe(true)
    expect(matchesStudent({ category: 'naesin', target: 4 }, student)).toBe(false)
  })
  it('정시: 세트 target이 학생 정시레벨과 같으면 true', () => {
    expect(matchesStudent({ category: 'jeongsi', target: 2 }, student)).toBe(true)
    expect(matchesStudent({ category: 'jeongsi', target: 1 }, student)).toBe(false)
  })
  it('정시레벨 미배정(null)이면 정시 과제는 항상 false', () => {
    expect(matchesStudent({ category: 'jeongsi', target: 2 }, { grade: 5, jeongsiLevel: null })).toBe(false)
  })
})

describe('dayStatus', () => {
  const day = { date: '2026-08-10' }
  it('제출 없음 → none', () => {
    expect(dayStatus(day, undefined, '2026-08-11')).toBe('none')
  })
  it('마감일 이내 제출 → done', () => {
    expect(dayStatus(day, { submittedAt: '2026-08-10T09:00:00Z' }, '2026-08-10')).toBe('done')
  })
  it('마감일 지나 제출 → late', () => {
    expect(dayStatus(day, { submittedAt: '2026-08-11T09:00:00Z' }, '2026-08-11')).toBe('late')
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run src/utils/homeworkSelect.test.js`
Expected: FAIL — 미정의

- [ ] **Step 3: 최소 구현**

```javascript
// src/utils/homeworkSelect.js
// 학생↔과제 매칭과 요일 제출 상태 판정.
import { isLateSubmission } from './homework'

// 세트가 이 학생에게 보이는지: 내신은 학년, 정시는 정시레벨로 매칭
export function matchesStudent(set, student) {
  if (set.category === 'naesin') return set.target === student.grade
  if (set.category === 'jeongsi') {
    return student.jeongsiLevel != null && set.target === student.jeongsiLevel
  }
  return false
}

// 요일 제출 상태: 미제출/정상제출/지각제출
export function dayStatus(day, submission, todayStr) {
  if (!submission) return 'none'
  return isLateSubmission(submission.submittedAt, day.date) ? 'late' : 'done'
}
```

> 참고: `todayStr`는 시그니처에 두되 판정은 `isLateSubmission(submittedAt, dueDate)`로 충분하다(제출시각 vs 마감일). 호출부 일관성을 위해 인자로 받는다.

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/utils/homeworkSelect.test.js`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add src/utils/homeworkSelect.js src/utils/homeworkSelect.test.js
git commit -m "feat: 학생↔과제 매칭·요일 상태 판정 유틸 추가"
```

---

### Task 5: DB 마이그레이션 — 컬럼 추가 + 신규 테이블 생성 (기존 테이블은 유지)

**Files:**
- Supabase SQL 편집기에서 실행 (코드 저장소 변경 없음). SQL을 `docs/superpowers/plans/2026-08-09-homework-migration.sql`로도 저장해 이력 남김.

> **중요:** 이 단계에서는 기존 `homework`/`homework_submissions` 테이블을 **삭제하지 않는다.** DataContext가 아직 그 테이블을 읽으므로, Task 7에서 코드 교체 후 마지막에 드롭한다.

- [ ] **Step 1: 마이그레이션 SQL 파일 저장**

`docs/superpowers/plans/2026-08-09-homework-migration.sql`:

```sql
-- 1) 학생 로스터에 학년/정시레벨 추가
alter table students add column if not exists grade int;
alter table students add column if not exists jeongsi_level int;

-- 2) 신규 과제 테이블
create table if not exists homework_sets (
  id          bigint generated always as identity primary key,
  category    text not null check (category in ('naesin','jeongsi')),
  target      int  not null,                 -- 내신=학년(1~6), 정시=레벨(1~3)
  week_start  date not null,                 -- 그 주 월요일
  title       text not null,
  teacher_id  uuid,
  created_at  timestamptz not null default now(),
  unique (category, target, week_start)
);

create table if not exists homework_days (
  id                     bigint generated always as identity primary key,
  set_id                 bigint not null references homework_sets(id) on delete cascade,
  weekday                int not null check (weekday between 1 and 6),
  date                   date not null,
  question_count         int not null default 0,
  day_solution_video_url text,
  day_solution_file_url  text,
  unique (set_id, weekday)
);

create table if not exists homework_questions (
  id                  bigint generated always as identity primary key,
  day_id              bigint not null references homework_days(id) on delete cascade,
  number              int not null,
  answer              text not null,
  solution_video_url  text,
  solution_file_url   text,
  unique (day_id, number)
);

create table if not exists homework_submissions_v2 (
  id            bigint generated always as identity primary key,
  day_id        bigint not null references homework_days(id) on delete cascade,
  student_id    bigint not null,
  answers       jsonb not null default '[]'::jsonb,
  submitted_at  timestamptz not null default now(),
  unique (day_id, student_id)
);

-- 3) RLS: 기존 homework 테이블과 동일한 정책을 적용해야 한다.
--    (아래는 예시 — 프로젝트의 기존 homework 테이블 정책을 확인해 동일하게 맞출 것)
alter table homework_sets            enable row level security;
alter table homework_days            enable row level security;
alter table homework_questions       enable row level security;
alter table homework_submissions_v2  enable row level security;

-- 예시 정책(인증 사용자 전체 허용). 기존 프로젝트 정책에 맞게 수정하세요.
do $$
begin
  perform 1;
end $$;
create policy hw_sets_all on homework_sets      for all to authenticated using (true) with check (true);
create policy hw_days_all on homework_days      for all to authenticated using (true) with check (true);
create policy hw_q_all    on homework_questions for all to authenticated using (true) with check (true);
create policy hw_sub_all  on homework_submissions_v2 for all to authenticated using (true) with check (true);

-- 4) 해설 파일 저장용 Storage 버킷
insert into storage.buckets (id, name, public)
values ('homework-solutions','homework-solutions', true)
on conflict (id) do nothing;

create policy hw_sol_read   on storage.objects for select to public
  using (bucket_id = 'homework-solutions');
create policy hw_sol_write  on storage.objects for insert to authenticated
  with check (bucket_id = 'homework-solutions');
```

> `homework_submissions_v2`라는 이름을 쓰는 이유: 기존 `homework_submissions`(구 스키마)와 이름 충돌을 피하기 위함. Task 7에서 구 테이블 드롭 후, 필요하면 rename은 생략하고 코드에서 `homework_submissions_v2`를 사용한다(단순성 우선).

- [ ] **Step 2: Supabase에서 실행 & 검증**

Supabase Dashboard → SQL Editor에 위 SQL 붙여넣고 Run. 이후 검증 쿼리 실행:

```sql
select column_name from information_schema.columns
 where table_name='students' and column_name in ('grade','jeongsi_level');
-- 기대: grade, jeongsi_level 2행

select table_name from information_schema.tables
 where table_name in ('homework_sets','homework_days','homework_questions','homework_submissions_v2');
-- 기대: 4개 테이블
```

- [ ] **Step 3: SQL 파일 커밋**

```bash
git add docs/superpowers/plans/2026-08-09-homework-migration.sql
git commit -m "chore: 과제 재설계 DB 마이그레이션 SQL 추가"
```

---

### Task 6: 학생 프로필에 학년·정시레벨 추가 (DataContext + Students 폼)

**Files:**
- Modify: `src/context/DataContext.jsx` (`toStudent`, `addStudent`, `updateStudent`, `bulkAddStudents`)
- Modify: `src/pages/Students.jsx` (학생 추가/수정 모달 폼)

**Interfaces:**
- Consumes: `GRADES, GRADE_LABELS, JEONGSI_LEVELS, JEONGSI_LEVEL_LABELS` from `src/constants/homework.js`
- Produces: `student` 객체에 `grade: number|null`, `jeongsiLevel: number|null` 필드 추가

- [ ] **Step 1: `toStudent`에 필드 추가**

`src/context/DataContext.jsx`의 `toStudent`(약 29~38행)를 아래로 교체:

```javascript
function toStudent(s) {
  return {
    id:          s.id,
    name:        s.name,
    phone:       s.phone       ?? '',
    parentPhone: s.parent_phone ?? '',
    classId:     s.class_id,
    grade:       s.grade         ?? null,   // 학년(내신)
    jeongsiLevel: s.jeongsi_level ?? null,  // 정시 레벨
    joinDate:    s.join_date   ?? '',
    sortOrder:   s.sort_order  ?? s.id,
  }
}
```

- [ ] **Step 2: `addStudent` insert에 컬럼 추가**

`addStudent`의 `.insert([{ ... }])` 객체(약 215~221행)에 두 줄 추가:

```javascript
      .insert([{
        name:         data.name,
        phone:        data.phone        || null,
        parent_phone: data.parentPhone  || null,
        class_id:     Number(data.classId) || null,
        grade:        data.grade ? Number(data.grade) : null,
        jeongsi_level: data.jeongsiLevel ? Number(data.jeongsiLevel) : null,
        join_date:    data.joinDate     || new Date().toISOString().slice(0, 10),
      }])
```

- [ ] **Step 3: `updateStudent` update에 컬럼 추가**

`updateStudent`의 `.update({ ... })`(약 234~240행)에 두 줄 추가하고, 로컬 상태 병합도 숫자 변환:

```javascript
      .update({
        name:         data.name,
        phone:        data.phone        || null,
        parent_phone: data.parentPhone  || null,
        class_id:     Number(data.classId) || null,
        grade:        data.grade ? Number(data.grade) : null,
        jeongsi_level: data.jeongsiLevel ? Number(data.jeongsiLevel) : null,
        join_date:    data.joinDate     || null,
      })
      .eq('id', id)

    if (error) { console.error('학생 수정 실패:', error); return }
    setStudents((prev) =>
      prev.map((s) => s.id === id ? {
        ...s, ...data,
        classId: Number(data.classId),
        grade: data.grade ? Number(data.grade) : null,
        jeongsiLevel: data.jeongsiLevel ? Number(data.jeongsiLevel) : null,
      } : s)
    )
```

- [ ] **Step 4: `bulkAddStudents` rows에 컬럼 추가**

`bulkAddStudents`의 `rows` 매핑(약 266~272행)에 두 줄 추가:

```javascript
    const rows = dataArray.map((d) => ({
      name:         d.name,
      phone:        d.phone        || null,
      parent_phone: d.parentPhone  || null,
      class_id:     Number(d.classId) || null,
      grade:        d.grade ? Number(d.grade) : null,
      jeongsi_level: d.jeongsiLevel ? Number(d.jeongsiLevel) : null,
      join_date:    d.joinDate     || new Date().toISOString().slice(0, 10),
    }))
```

- [ ] **Step 5: Students 폼에 학년·정시레벨 입력 추가**

`src/pages/Students.jsx` 상단 import에 추가:

```javascript
import { GRADES, GRADE_LABELS, JEONGSI_LEVELS, JEONGSI_LEVEL_LABELS } from '../constants/homework'
```

`form` 초기 state에 `grade`, `jeongsiLevel`가 포함되도록 폼 상태 정의를 확인/수정한다(기존 `form` 객체에 `grade: '', jeongsiLevel: ''` 추가). 학생 추가/수정 모달(약 536~543행의 연락처 input 아래)에 select 두 개 추가:

```javascript
              <select value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })} className="w-full h-11 px-3 bg-[#F4F3EE] rounded-lg text-sm focus:outline-none">
                <option value="">학년 선택(내신)</option>
                {GRADES.map((g) => <option key={g} value={g}>{GRADE_LABELS[g]}</option>)}
              </select>
              <select value={form.jeongsiLevel} onChange={(e) => setForm({ ...form, jeongsiLevel: e.target.value })} className="w-full h-11 px-3 bg-[#F4F3EE] rounded-lg text-sm focus:outline-none">
                <option value="">정시 레벨(선택 안 함)</option>
                {JEONGSI_LEVELS.map((l) => <option key={l} value={l}>{JEONGSI_LEVEL_LABELS[l]}</option>)}
              </select>
```

그리고 "수정" 버튼이 기존 학생을 폼에 채울 때 `grade`, `jeongsiLevel`도 채우도록 편집 시작 핸들러에서 `grade: student.grade ?? '', jeongsiLevel: student.jeongsiLevel ?? ''`를 포함시킨다.

- [ ] **Step 6: 린트 + 기존 테스트 회귀 확인**

Run: `npm run lint`
Expected: 오류 0

Run: `npx vitest run`
Expected: 기존 70개 테스트 모두 PASS (회귀 없음)

- [ ] **Step 7: 수동 확인 (dev 서버)**

Run: `npm run dev` 후 관리자 로그인 → 학생 관리 → 학생 추가/수정에서 학년·정시레벨 저장·표시 확인. 확인 후 서버 종료.

- [ ] **Step 8: 커밋**

```bash
git add src/context/DataContext.jsx src/pages/Students.jsx
git commit -m "feat: 학생 프로필에 학년·정시레벨 추가 (내신/정시 과제 매칭용)"
```

---

### Task 7: DataContext 과제 데이터 계층 교체 + 구 테이블 드롭

**Files:**
- Modify: `src/context/DataContext.jsx` (import, 상태, 로드, CRUD, context value)
- Supabase SQL 편집기 (구 테이블 드롭)

**Interfaces:**
- Consumes: 매퍼(Task 3), `dateForWeekday`(Task 2)
- Produces (context value):
  - 상태: `homeworkSets, homeworkDays, homeworkQuestions, homeworkSubmissions`
  - `addHomeworkSet(payload) -> set|null`
    - `payload = { category, target, weekStart, title, teacherId, days: [{ weekday, questionCount, daySolutionVideoUrl, daySolutionFileUrl, questions: [{ number, answer, solutionVideoUrl, solutionFileUrl }] }] }`
  - `deleteHomeworkSet(setId) -> void`
  - `upsertHomeworkSubmission({ dayId, studentId, answers }) -> void`
  - `uploadSolutionFile(file, prefix) -> string(publicUrl) | null`
- 제거: `homework, homeworkSubmissions, addHomework, deleteHomework, upsertHomeworkSubmission`(구 스키마)

- [ ] **Step 1: import 추가**

`src/context/DataContext.jsx` 상단 import 영역에 추가:

```javascript
import {
  toHomeworkSet, toHomeworkDay, toHomeworkQuestion, toHomeworkSubmission,
} from '../utils/homeworkMappers'
import { dateForWeekday } from '../utils/homeworkWeek'
```

- [ ] **Step 2: 구 과제 상태 → 신규 상태로 교체**

기존 `const [homework, setHomework] = useState([])`, `const [homeworkSubmissions, setHomeworkSubmissions] = useState([])`(약 157~158행)를 아래로 교체:

```javascript
  const [homeworkSets,        setHomeworkSets]        = useState([])
  const [homeworkDays,        setHomeworkDays]        = useState([])
  const [homeworkQuestions,   setHomeworkQuestions]   = useState([])
  const [homeworkSubmissions, setHomeworkSubmissions] = useState([])
```

- [ ] **Step 3: 로드(Promise.all) 교체**

기존 로드에서 `supabase.from('homework')...`, `supabase.from('homework_submissions')...`(약 180~181행) 두 줄을 아래 4줄로 교체하고, 결과 구조분해와 setState도 맞춘다:

```javascript
          supabase.from('homework_sets').select('*').order('week_start', { ascending: false }),
          supabase.from('homework_days').select('*'),
          supabase.from('homework_questions').select('*'),
          supabase.from('homework_submissions_v2').select('*'),
```

로드 결과를 받는 부분에서 매핑:

```javascript
      setHomeworkSets((setsRes.data ?? []).map(toHomeworkSet))
      setHomeworkDays((daysRes.data ?? []).map(toHomeworkDay))
      setHomeworkQuestions((qRes.data ?? []).map(toHomeworkQuestion))
      setHomeworkSubmissions((subRes.data ?? []).map(toHomeworkSubmission))
```

> 실제 구조분해 변수명은 기존 `Promise.all` 결과 배열 순서에 맞춰 정확히 연결할 것. 기존 코드의 순서/변수명을 읽고 대응시키는 것이 이 스텝의 핵심이다.

- [ ] **Step 4: 구 CRUD 제거 + 신규 CRUD 추가**

기존 `addHomework`, `deleteHomework`, `upsertHomeworkSubmission`(약 585~640행) 함수를 삭제하고 아래를 추가:

```javascript
  // ── 과제(내신/정시) CRUD ─────────────────────────────
  // 주간 세트 + 요일 + 문항을 한 번에 생성
  async function addHomeworkSet(payload) {
    const { data: setRow, error: setErr } = await supabase
      .from('homework_sets')
      .insert([{
        category:   payload.category,
        target:     Number(payload.target),
        week_start: payload.weekStart,
        title:      payload.title,
        teacher_id: payload.teacherId,
      }])
      .select().single()
    if (setErr) { console.error('과제 세트 생성 실패:', setErr); return null }

    const newDays = []
    const newQuestions = []
    for (const day of payload.days) {
      const { data: dayRow, error: dayErr } = await supabase
        .from('homework_days')
        .insert([{
          set_id:  setRow.id,
          weekday: day.weekday,
          date:    dateForWeekday(payload.weekStart, day.weekday),
          question_count: day.questionCount,
          day_solution_video_url: day.daySolutionVideoUrl || null,
          day_solution_file_url:  day.daySolutionFileUrl || null,
        }])
        .select().single()
      if (dayErr) { console.error('과제 요일 생성 실패:', dayErr); continue }
      newDays.push(toHomeworkDay(dayRow))

      if (day.questions?.length) {
        const rows = day.questions.map((q) => ({
          day_id: dayRow.id,
          number: q.number,
          answer: q.answer,
          solution_video_url: q.solutionVideoUrl || null,
          solution_file_url:  q.solutionFileUrl || null,
        }))
        const { data: qRows, error: qErr } = await supabase
          .from('homework_questions').insert(rows).select()
        if (qErr) { console.error('과제 문항 생성 실패:', qErr); continue }
        newQuestions.push(...qRows.map(toHomeworkQuestion))
      }
    }

    const newSet = toHomeworkSet(setRow)
    setHomeworkSets((prev) => [newSet, ...prev])
    setHomeworkDays((prev) => [...prev, ...newDays])
    setHomeworkQuestions((prev) => [...prev, ...newQuestions])
    return newSet
  }

  // 세트 삭제 (FK on delete cascade로 요일/문항/제출 자동 삭제)
  async function deleteHomeworkSet(setId) {
    const { data: deleted, error } = await supabase
      .from('homework_sets').delete().eq('id', setId).select()
    if (error) { console.error('과제 세트 삭제 실패:', error); return }
    if (!deleted?.length) { console.error('과제 세트 삭제 실패: 0 rows (RLS 확인)'); return }
    const dayIds = homeworkDays.filter((d) => d.setId === setId).map((d) => d.id)
    setHomeworkSets((prev) => prev.filter((s) => s.id !== setId))
    setHomeworkDays((prev) => prev.filter((d) => d.setId !== setId))
    setHomeworkQuestions((prev) => prev.filter((q) => !dayIds.includes(q.dayId)))
    setHomeworkSubmissions((prev) => prev.filter((s) => !dayIds.includes(s.dayId)))
  }

  // 요일별 제출 (학생 × 요일) upsert
  async function upsertHomeworkSubmission({ dayId, studentId, answers }) {
    const { data, error } = await supabase
      .from('homework_submissions_v2')
      .upsert(
        { day_id: dayId, student_id: studentId, answers, submitted_at: new Date().toISOString() },
        { onConflict: 'day_id,student_id' }
      )
      .select().single()
    if (error) { console.error('과제 제출 실패:', error); return }
    const record = toHomeworkSubmission(data)
    setHomeworkSubmissions((prev) => {
      const exists = prev.some((s) => s.dayId === dayId && s.studentId === studentId)
      return exists
        ? prev.map((s) => (s.dayId === dayId && s.studentId === studentId ? record : s))
        : [...prev, record]
    })
  }

  // 해설 파일 업로드 → 공개 URL 반환
  async function uploadSolutionFile(file, prefix = 'sol') {
    const safe = file.name.replace(/[^\w.\-가-힣]/g, '_')
    const path = `${prefix}/${Date.now()}_${safe}`
    const { error } = await supabase.storage.from('homework-solutions').upload(path, file)
    if (error) { console.error('해설 파일 업로드 실패:', error); return null }
    const { data } = supabase.storage.from('homework-solutions').getPublicUrl(path)
    return data.publicUrl
  }
```

- [ ] **Step 5: context value 교체**

context provider의 value(약 735~737행)에서

```javascript
      homework, homeworkSubmissions,
      addHomework, deleteHomework, upsertHomeworkSubmission,
```

를 아래로 교체:

```javascript
      homeworkSets, homeworkDays, homeworkQuestions, homeworkSubmissions,
      addHomeworkSet, deleteHomeworkSet, upsertHomeworkSubmission, uploadSolutionFile,
```

- [ ] **Step 6: 앱 빌드로 참조 오류 확인**

Run: `npm run build`
Expected: 빌드 성공. 만약 `homework`/`addHomework` 미정의 오류가 나면, 아직 구 API를 쓰는 곳(`src/pages/Homework.jsx`)이다 — Task 8~10에서 교체하므로, 이 시점에는 **Homework.jsx를 임시로 빈 페이지로 두거나** Task 8 이후 다시 빌드한다. (권장: Task 8~11을 먼저 끝내고 빌드)

> 실무 순서: 이 Task의 Step 1~5 커밋 → Task 8~11 완료 → 최종 빌드. 중간 빌드 실패는 예상된 상태다.

- [ ] **Step 7: 커밋(코드 교체분)**

```bash
git add src/context/DataContext.jsx
git commit -m "feat: DataContext 과제 데이터 계층을 내신/정시 주간 구조로 교체"
```

- [ ] **Step 8: 구 테이블 드롭 (Task 8~11까지 코드 교체 완료 후 실행)**

Supabase SQL Editor:

```sql
drop table if exists homework_submissions;  -- 구 스키마
drop table if exists homework;              -- 구 스키마
```

검증:

```sql
select table_name from information_schema.tables where table_name in ('homework','homework_submissions');
-- 기대: 0행
```

---

### Task 8: 해설 뷰어 컴포넌트 (SolutionViewer)

**Files:**
- Create: `src/components/homework/SolutionViewer.jsx`

**Interfaces:**
- Consumes: props `{ videoUrl?: string, fileUrl?: string, label?: string }`
- Produces: 영상 링크가 있으면 YouTube 임베드, 파일 URL이 있으면 새 탭 열기 버튼. 둘 다 없으면 아무것도 렌더하지 않음.

- [ ] **Step 1: 컴포넌트 작성**

```jsx
// src/components/homework/SolutionViewer.jsx
// 해설(YouTube 영상 + 파일)을 표시. 둘 다 없으면 렌더하지 않는다.

// YouTube URL에서 videoId 추출 (watch?v=, youtu.be/, embed/ 지원)
function youtubeId(url) {
  if (!url) return null
  const m = url.match(/(?:v=|youtu\.be\/|embed\/)([\w-]{11})/)
  return m ? m[1] : null
}

export default function SolutionViewer({ videoUrl, fileUrl, label = '해설' }) {
  const vid = youtubeId(videoUrl)
  if (!vid && !fileUrl) return null
  return (
    <div className="mt-3">
      <p className="text-sm font-semibold text-gray-700 mb-2">{label}</p>
      {vid && (
        <div className="relative w-full mb-2" style={{ paddingTop: '56.25%' }}>
          <iframe
            className="absolute inset-0 w-full h-full rounded-lg"
            src={`https://www.youtube.com/embed/${vid}`}
            title="해설 영상"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}
      {fileUrl && (
        <a
          href={fileUrl} target="_blank" rel="noreferrer"
          className="inline-block px-4 py-2 bg-[#5B8FD4]/15 text-[#5B8FD4] rounded-lg text-sm font-medium"
        >
          해설 파일 열기
        </a>
      )}
    </div>
  )
}
```

- [ ] **Step 2: 린트 확인**

Run: `npx eslint src/components/homework/SolutionViewer.jsx`
Expected: 오류 0

- [ ] **Step 3: 커밋**

```bash
git add src/components/homework/SolutionViewer.jsx
git commit -m "feat: 해설 뷰어(SolutionViewer) 컴포넌트 추가"
```

---

### Task 9: 학생 과제 화면 (StudentHomeworkView) + 테스트

**Files:**
- Create: `src/components/homework/StudentHomeworkView.jsx`
- Test: `src/components/homework/StudentHomeworkView.test.jsx`

**Interfaces:**
- Consumes: `useData()`(homeworkSets/Days/Questions/Submissions, upsertHomeworkSubmission), `useAuth()`(user.studentId), students(자기 학년/정시레벨 조회), 유틸(`matchesStudent`, `dayStatus`, `mondayOf`), 상수(WEEKDAYS, WEEKDAY_LABELS, CATEGORY_LABELS), `ChoiceGrid`, `gradeHomework`, `SolutionViewer`
- Produces: 기본 export `StudentHomeworkView({ category })` — 한 종류(내신/정시)의 이번 주 요일별 과제 목록/제출/결과

- [ ] **Step 1: 컴포넌트 작성**

```jsx
// src/components/homework/StudentHomeworkView.jsx
// 학생: 한 종류(내신/정시) 이번 주(월~토) 요일별 과제 제출·결과.
import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import ChoiceGrid from '../ChoiceGrid'
import SolutionViewer from './SolutionViewer'
import { gradeHomework } from '../../utils/homework'
import { matchesStudent, dayStatus } from '../../utils/homeworkSelect'
import { mondayOf } from '../../utils/homeworkWeek'
import { WEEKDAY_LABELS } from '../../constants/homework'

const BADGE = {
  none: { label: '미제출', color: 'bg-gray-100 text-gray-500' },
  done: { label: '제출완료', color: 'bg-green-100 text-green-700' },
  late: { label: '지각제출', color: 'bg-[#C0392B]/10 text-[#C0392B]' },
}

export default function StudentHomeworkView({ category }) {
  const { user } = useAuth()
  const {
    students, homeworkSets, homeworkDays, homeworkQuestions,
    homeworkSubmissions, upsertHomeworkSubmission,
  } = useData()
  const [openDayId, setOpenDayId] = useState(null)
  const [answers, setAnswers] = useState({})
  const [submitting, setSubmitting] = useState(false)

  const me = students.find((s) => s.id === user.studentId)
  const today = new Date().toISOString().slice(0, 10)
  const thisWeek = mondayOf(today)

  // 정시 레벨 미배정 안내
  if (category === 'jeongsi' && (!me || me.jeongsiLevel == null)) {
    return <p className="text-center text-gray-400 py-12">정시 레벨이 배정되지 않았습니다. 선생님께 문의하세요.</p>
  }
  if (!me) return <p className="text-center text-gray-400 py-12">학생 정보를 찾을 수 없습니다.</p>

  // 이번 주 + 종류 + 내 그룹에 맞는 세트 → 요일들
  const mySet = homeworkSets.find(
    (s) => s.category === category && s.weekStart === thisWeek && matchesStudent(s, me)
  )
  const days = mySet
    ? homeworkDays.filter((d) => d.setId === mySet.id).sort((a, b) => a.weekday - b.weekday)
    : []

  const subOf = (dayId) => homeworkSubmissions.find((s) => s.dayId === dayId && s.studentId === me.id)
  const questionsOf = (dayId) =>
    homeworkQuestions.filter((q) => q.dayId === dayId).sort((a, b) => a.number - b.number)

  // ── 특정 요일 열기(제출/결과) ──
  if (openDayId != null) {
    const day = days.find((d) => d.id === openDayId)
    if (!day) { setOpenDayId(null); return null }
    const qs = questionsOf(day.id)
    const sub = subOf(day.id)
    const beforeDue = today <= day.date

    // 결과 보기 (제출 있음)
    if (sub && !submitting) {
      const valueMap = Object.fromEntries(sub.answers.map((a) => [a.number, a.answer]))
      const answerKey = Object.fromEntries(qs.map((q) => [q.number, q.answer]))
      const { correctCount, total } = gradeHomework(qs, sub.answers)
      return (
        <div>
          <button onClick={() => setOpenDayId(null)} className="text-sm text-gray-500 mb-3">← 요일 목록</button>
          <h2 className="text-lg font-bold text-[#2B2B2B] mb-1">{WEEKDAY_LABELS[day.weekday]}요일 과제 — 결과</h2>
          <div className="bg-[#2B2B2B] text-white rounded-2xl p-6 text-center my-3">
            <p className="text-sm text-white/60 mb-1">정답</p>
            <p className="text-4xl font-bold">{correctCount}<span className="text-2xl text-white/50"> / {total}</span></p>
          </div>
          {beforeDue && (
            <button
              onClick={() => { setAnswers(valueMap); setSubmitting(true) }}
              className="w-full py-2.5 mb-3 border border-gray-300 text-gray-600 rounded-xl text-sm font-medium"
            >답 수정하기 (마감 전까지)</button>
          )}
          <ChoiceGrid count={qs.length} mode="result" values={valueMap} answerKey={answerKey} onChange={() => {}} />
          <SolutionViewer videoUrl={day.daySolutionVideoUrl} fileUrl={day.daySolutionFileUrl} label="요일 해설" />
          {qs.filter((q) => q.solutionVideoUrl || q.solutionFileUrl).map((q) => (
            <SolutionViewer key={q.id} videoUrl={q.solutionVideoUrl} fileUrl={q.solutionFileUrl} label={`${q.number}번 해설`} />
          ))}
        </div>
      )
    }

    // 답 입력(신규 제출 또는 수정)
    const answeredNum = Object.keys(answers).length
    const allAnswered = answeredNum === qs.length && qs.length > 0
    async function handleSubmit() {
      if (!allAnswered) return
      setSubmitting(true)
      const payload = qs.map((q) => ({ number: q.number, answer: answers[q.number] }))
      await upsertHomeworkSubmission({ dayId: day.id, studentId: me.id, answers: payload })
      setSubmitting(false)
      setAnswers({})
    }
    return (
      <div>
        <button onClick={() => { setOpenDayId(null); setAnswers({}) }} className="text-sm text-gray-500 mb-3">← 요일 목록</button>
        <h2 className="text-lg font-bold text-[#2B2B2B] mb-1">{WEEKDAY_LABELS[day.weekday]}요일 과제</h2>
        <p className="text-sm text-gray-500 mb-1">{qs.length}문항 · 마감 {day.date}</p>
        {!beforeDue && <p className="text-xs text-[#C0392B] mb-3">마감이 지났습니다. 지금 제출하면 지각으로 표시됩니다.</p>}
        <div className="flex justify-between items-center my-2">
          <span className="text-sm font-medium text-gray-700">답안 입력</span>
          <span className="text-xs text-gray-400">{answeredNum}/{qs.length} 입력됨</span>
        </div>
        <ChoiceGrid count={qs.length} values={answers} mode="input"
          onChange={(number, choice) => setAnswers((prev) => ({ ...prev, [number]: choice }))} />
        <button onClick={handleSubmit} disabled={!allAnswered}
          className="w-full py-3 mt-4 bg-[#2B2B2B] text-white rounded-xl font-medium disabled:opacity-40">
          제출하기
        </button>
      </div>
    )
  }

  // ── 요일 목록 ──
  if (!mySet || days.length === 0) {
    return <p className="text-center text-gray-400 py-12">이번 주 {CATEGORY_LABELS[category]}가 없습니다.</p>
  }
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-gray-500">{mySet.title}</p>
      {days.map((day) => {
        const st = dayStatus(day, subOf(day.id), today)
        const badge = BADGE[st]
        return (
          <div key={day.id}
            onClick={() => { const sub = subOf(day.id); setAnswers(sub ? Object.fromEntries(sub.answers.map((a) => [a.number, a.answer])) : {}); setSubmitting(!sub); setOpenDayId(day.id) }}
            className="bg-white rounded-xl p-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow flex justify-between items-center">
            <div>
              <p className="font-semibold text-[#2B2B2B]">{WEEKDAY_LABELS[day.weekday]}요일 과제</p>
              <p className="text-xs text-gray-400 mt-1">{day.questionCount}문항 · 마감 {day.date}</p>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badge.color}`}>{badge.label}</span>
          </div>
        )
      })}
    </div>
  )
}
```

> import에 `CATEGORY_LABELS`도 추가할 것: `import { WEEKDAY_LABELS, CATEGORY_LABELS } from '../../constants/homework'`.

- [ ] **Step 2: 학생 화면 테스트 작성 (useData/useAuth 모킹)**

```jsx
// src/components/homework/StudentHomeworkView.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import StudentHomeworkView from './StudentHomeworkView'
import { mondayOf } from '../../utils/homeworkWeek'

// 이번 주 월요일(테스트 실행 시점 기준)
const WEEK = mondayOf(new Date().toISOString().slice(0, 10))

const state = {}
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ user: { studentId: 7, role: 'student' } }) }))
vi.mock('../../context/DataContext', () => ({ useData: () => state.data }))

beforeEach(() => {
  state.data = {
    students: [{ id: 7, name: '홍길동', grade: 5, jeongsiLevel: null }],
    homeworkSets: [
      { id: 1, category: 'naesin',  target: 5, weekStart: WEEK, title: '내신 세트' },
      { id: 2, category: 'naesin',  target: 4, weekStart: WEEK, title: '다른학년 세트' },
    ],
    homeworkDays: [
      { id: 10, setId: 1, weekday: 1, date: WEEK, questionCount: 2, daySolutionVideoUrl: '', daySolutionFileUrl: '' },
    ],
    homeworkQuestions: [
      { id: 100, dayId: 10, number: 1, answer: '①', solutionVideoUrl: '', solutionFileUrl: '' },
      { id: 101, dayId: 10, number: 2, answer: '②', solutionVideoUrl: '', solutionFileUrl: '' },
    ],
    homeworkSubmissions: [],
    upsertHomeworkSubmission: vi.fn(),
  }
})

describe('StudentHomeworkView (내신)', () => {
  it('자기 학년(5=고2) 세트의 요일만 보인다', () => {
    render(<StudentHomeworkView category="naesin" />)
    expect(screen.getByText('내신 세트')).toBeInTheDocument()
    expect(screen.getByText('월요일 과제')).toBeInTheDocument()
    expect(screen.queryByText('다른학년 세트')).not.toBeInTheDocument()
  })

  it('제출 없으면 미제출 뱃지', () => {
    render(<StudentHomeworkView category="naesin" />)
    expect(screen.getByText('미제출')).toBeInTheDocument()
  })
})

describe('StudentHomeworkView (정시, 레벨 미배정)', () => {
  it('정시 레벨 없으면 안내 문구', () => {
    render(<StudentHomeworkView category="jeongsi" />)
    expect(screen.getByText(/정시 레벨이 배정되지 않았습니다/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 3: 테스트 실행**

Run: `npx vitest run src/components/homework/StudentHomeworkView.test.jsx`
Expected: PASS (3 tests). 실패 시 컴포넌트의 필터/안내 로직을 테스트에 맞춰 수정.

- [ ] **Step 4: 커밋**

```bash
git add src/components/homework/StudentHomeworkView.jsx src/components/homework/StudentHomeworkView.test.jsx
git commit -m "feat: 학생 과제 화면(내신/정시 요일별 제출·결과·해설) 추가"
```

---

### Task 10: 교사 과제 출제 화면 (TeacherHomeworkCreate)

**Files:**
- Create: `src/components/homework/TeacherHomeworkCreate.jsx`

**Interfaces:**
- Consumes: `useData()`(addHomeworkSet, uploadSolutionFile), `useAuth()`(user.id), 상수(HW_CATEGORY, GRADES/GRADE_LABELS, JEONGSI_LEVELS/JEONGSI_LEVEL_LABELS, WEEKDAYS/WEEKDAY_LABELS), `mondayOf`, `ChoiceGrid`
- Produces: 기본 export `TeacherHomeworkCreate({ category, onDone })` — 한 종류의 주간 세트를 만들고 저장 후 `onDone()` 호출

- [ ] **Step 1: 컴포넌트 작성**

```jsx
// src/components/homework/TeacherHomeworkCreate.jsx
// 교사: 한 종류(내신/정시) 주간 세트(월~토)를 한 번에 출제.
import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import ChoiceGrid from '../ChoiceGrid'
import { mondayOf } from '../../utils/homeworkWeek'
import {
  HW_CATEGORY, CATEGORY_LABELS, GRADES, GRADE_LABELS,
  JEONGSI_LEVELS, JEONGSI_LEVEL_LABELS, WEEKDAYS, WEEKDAY_LABELS,
} from '../../constants/homework'

// 요일 하나의 편집 상태 초기값
const emptyDay = () => ({ enabled: false, count: 0, answers: {}, videoUrl: '', fileUrl: '', file: null })

export default function TeacherHomeworkCreate({ category, onDone }) {
  const { user } = useAuth()
  const { addHomeworkSet, uploadSolutionFile } = useData()

  const isNaesin = category === HW_CATEGORY.NAESIN
  const targets = isNaesin ? GRADES : JEONGSI_LEVELS
  const targetLabels = isNaesin ? GRADE_LABELS : JEONGSI_LEVEL_LABELS

  const [target, setTarget]   = useState(String(targets[0]))
  const [title, setTitle]     = useState('')
  const [weekStart, setWeekStart] = useState(mondayOf(new Date().toISOString().slice(0, 10)))
  const [activeWd, setActiveWd] = useState(1)
  const [days, setDays] = useState(() => Object.fromEntries(WEEKDAYS.map((wd) => [wd, emptyDay()])))
  const [saving, setSaving] = useState(false)

  const d = days[activeWd]
  const setDay = (patch) => setDays((prev) => ({ ...prev, [activeWd]: { ...prev[activeWd], ...patch } }))

  function changeCount(val) {
    const n = Math.max(0, Math.min(300, Number(val) || 0))
    const next = {}
    for (let i = 1; i <= n; i++) if (d.answers[i]) next[i] = d.answers[i]
    setDay({ count: n, answers: next })
  }

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const url = await uploadSolutionFile(file, `${category}-${target}-${weekStart}`)
    if (url) setDay({ fileUrl: url })
  }

  const enabledDays = WEEKDAYS.filter((wd) => days[wd].enabled)
  const canSave =
    title.trim() && enabledDays.length > 0 &&
    enabledDays.every((wd) => {
      const dd = days[wd]
      return dd.count > 0 && Object.keys(dd.answers).length === dd.count
    })

  async function handleSave() {
    if (!canSave || saving) return
    setSaving(true)
    const payloadDays = enabledDays.map((wd) => {
      const dd = days[wd]
      return {
        weekday: wd,
        questionCount: dd.count,
        daySolutionVideoUrl: dd.videoUrl,
        daySolutionFileUrl: dd.fileUrl,
        questions: Array.from({ length: dd.count }, (_, i) => ({
          number: i + 1,
          answer: dd.answers[i + 1],
          solutionVideoUrl: '',   // 문항별 해설은 후속 UI(열린 항목). MVP는 요일 해설 사용.
          solutionFileUrl: '',
        })),
      }
    })
    await addHomeworkSet({
      category, target: Number(target), weekStart, title: title.trim(),
      teacherId: user.id, days: payloadDays,
    })
    setSaving(false)
    onDone()
  }

  return (
    <div>
      <button onClick={onDone} className="text-sm text-gray-500 mb-4">← 목록</button>
      <h1 className="text-xl font-bold text-[#2B2B2B] mb-4">{CATEGORY_LABELS[category]} 만들기</h1>

      <div className="flex flex-col gap-4">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="세트 제목 (예: 8월 2주차)"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5B8FD4]" />

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">{isNaesin ? '학년' : '정시 레벨'}</label>
            <select value={target} onChange={(e) => setTarget(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
              {targets.map((t) => <option key={t} value={t}>{targetLabels[t]}</option>)}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">주 시작(월요일)</label>
            <input type="date" value={weekStart} onChange={(e) => setWeekStart(mondayOf(e.target.value))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>

        {/* 요일 탭 */}
        <div className="flex gap-2 overflow-x-auto">
          {WEEKDAYS.map((wd) => (
            <button key={wd} onClick={() => setActiveWd(wd)}
              className={`px-3 py-2 rounded-lg text-sm whitespace-nowrap ${
                activeWd === wd ? 'bg-[#2B2B2B] text-white' : 'bg-gray-100 text-gray-600'
              } ${days[wd].enabled ? 'ring-2 ring-[#5B8FD4]' : ''}`}>
              {WEEKDAY_LABELS[wd]}
            </button>
          ))}
        </div>

        {/* 선택 요일 편집 */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <label className="flex items-center gap-2 mb-3 text-sm font-medium text-gray-700">
            <input type="checkbox" checked={d.enabled} onChange={(e) => setDay({ enabled: e.target.checked })} />
            {WEEKDAY_LABELS[activeWd]}요일 과제 사용
          </label>
          {d.enabled && (
            <>
              <div className="flex items-center gap-2 mb-3">
                <label className="text-sm text-gray-700">문항 수</label>
                <input type="number" min="0" max="300" value={d.count || ''} onChange={(e) => changeCount(e.target.value)}
                  className="w-24 border border-gray-200 rounded-lg px-2 py-1 text-sm" />
              </div>
              {d.count > 0 && (
                <div className="mb-3">
                  <p className="text-xs text-gray-400 mb-2">정답 입력 ({Object.keys(d.answers).length}/{d.count})</p>
                  <ChoiceGrid count={d.count} values={d.answers} mode="input"
                    onChange={(number, choice) => setDay({ answers: { ...d.answers, [number]: choice } })} />
                </div>
              )}
              <input value={d.videoUrl} onChange={(e) => setDay({ videoUrl: e.target.value })}
                placeholder="해설 영상 YouTube 링크(선택)"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-2" />
              <div className="flex items-center gap-2">
                <input type="file" onChange={handleFile} className="text-sm" />
                {d.fileUrl && <span className="text-xs text-green-600">파일 업로드됨</span>}
              </div>
            </>
          )}
        </div>

        <button onClick={handleSave} disabled={!canSave || saving}
          className="w-full py-3 bg-[#2B2B2B] text-white rounded-xl font-medium disabled:opacity-40">
          {saving ? '저장 중...' : '주간 과제 저장'}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 린트 확인**

Run: `npx eslint src/components/homework/TeacherHomeworkCreate.jsx`
Expected: 오류 0

- [ ] **Step 3: 커밋**

```bash
git add src/components/homework/TeacherHomeworkCreate.jsx
git commit -m "feat: 교사 주간 과제 출제 화면(요일 탭·정답·해설) 추가"
```

---

### Task 11: 교사 현황 화면 (TeacherHomeworkStatus) + Homework 페이지 조립 + 최종 검증

**Files:**
- Create: `src/components/homework/TeacherHomeworkStatus.jsx`
- Modify: `src/pages/Homework.jsx` (전체 대체)

**Interfaces:**
- Consumes: `useData()`, 상수/유틸, `gradeHomework`, `dayStatus`
- Produces:
  - `TeacherHomeworkStatus({ category })` — 그룹/주차 선택 → 요일별 제출 현황
  - `Homework()` 페이지 — 내신/정시 탭 + (학생: StudentHomeworkView, 교사: 목록/출제/현황 전환)

- [ ] **Step 1: 교사 현황 컴포넌트 작성**

```jsx
// src/components/homework/TeacherHomeworkStatus.jsx
// 교사: 한 종류(내신/정시)의 그룹·주차별 요일 제출 현황.
import { useState } from 'react'
import { useData } from '../../context/DataContext'
import { gradeHomework } from '../../utils/homework'
import { dayStatus } from '../../utils/homeworkSelect'
import {
  HW_CATEGORY, GRADES, GRADE_LABELS,
  JEONGSI_LEVELS, JEONGSI_LEVEL_LABELS, WEEKDAY_LABELS,
} from '../../constants/homework'

export default function TeacherHomeworkStatus({ category }) {
  const { students, homeworkSets, homeworkDays, homeworkQuestions, homeworkSubmissions } = useData()
  const isNaesin = category === HW_CATEGORY.NAESIN
  const targets = isNaesin ? GRADES : JEONGSI_LEVELS
  const targetLabels = isNaesin ? GRADE_LABELS : JEONGSI_LEVEL_LABELS

  const [target, setTarget] = useState(targets[0])

  // 이 종류·그룹의 세트(주차 최신순)
  const sets = homeworkSets
    .filter((s) => s.category === category && s.target === target)
    .sort((a, b) => (a.weekStart < b.weekStart ? 1 : -1))

  // 이 그룹에 속한 학생 (내신=학년, 정시=정시레벨)
  const groupStudents = students.filter((s) =>
    isNaesin ? s.grade === target : s.jeongsiLevel === target
  )
  const today = new Date().toISOString().slice(0, 10)

  return (
    <div>
      {/* 그룹 탭 */}
      <div className="flex gap-2 mb-4 overflow-x-auto">
        {targets.map((t) => (
          <button key={t} onClick={() => setTarget(t)}
            className={`px-4 py-2 rounded-full text-sm whitespace-nowrap ${
              target === t ? 'bg-[#2B2B2B] text-white' : 'bg-gray-100 text-gray-600'
            }`}>{targetLabels[t]}</button>
        ))}
      </div>

      {sets.length === 0 ? (
        <p className="text-center text-gray-400 py-10">등록된 과제가 없습니다.</p>
      ) : sets.map((set) => {
        const days = homeworkDays.filter((d) => d.setId === set.id).sort((a, b) => a.weekday - b.weekday)
        return (
          <div key={set.id} className="mb-6">
            <p className="font-semibold text-[#2B2B2B] mb-2">{set.title} <span className="text-xs text-gray-400">({set.weekStart} 주)</span></p>
            <div className="flex flex-col gap-2">
              {days.map((day) => {
                const subs = homeworkSubmissions.filter((s) => s.dayId === day.id)
                return (
                  <div key={day.id} className="bg-white rounded-xl p-3 shadow-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-[#2B2B2B]">{WEEKDAY_LABELS[day.weekday]}요일 · {day.date}</span>
                      <span className="text-sm font-bold text-[#2B2B2B]">{subs.length}/{groupStudents.length} 제출</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
```

> 참고: `gradeHomework`, `dayStatus`, `homeworkQuestions`는 상세 확장(학생별 정답 수/지각 표시) 시 사용한다. MVP 현황은 요일별 제출 수 집계까지. 상세 열람은 후속 확장으로 두되, import는 유지해도 되고 미사용 시 제거해 린트를 통과시킨다.

- [ ] **Step 2: Homework 페이지 조립 (전체 대체)**

`src/pages/Homework.jsx` 전체를 아래로 교체:

```jsx
// src/pages/Homework.jsx
// 과제 — 상단 내신/정시 탭. 학생: 제출/결과, 교사: 목록/출제/현황.
import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import Layout from '../components/Layout'
import StudentHomeworkView from '../components/homework/StudentHomeworkView'
import TeacherHomeworkCreate from '../components/homework/TeacherHomeworkCreate'
import TeacherHomeworkStatus from '../components/homework/TeacherHomeworkStatus'
import { HW_CATEGORY, CATEGORY_LABELS } from '../constants/homework'

export default function Homework() {
  const { user } = useAuth()
  const { homeworkSets, deleteHomeworkSet } = useData()
  const isStaff = user.role === 'teacher' || user.role === 'admin'

  const [category, setCategory] = useState(HW_CATEGORY.NAESIN)
  const [mode, setMode] = useState('list') // list | create | status

  return (
    <Layout>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold text-[#2B2B2B]">과제</h1>
        {isStaff && mode === 'list' && (
          <div className="flex gap-2">
            <button onClick={() => setMode('status')} className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm">제출 현황</button>
            <button onClick={() => setMode('create')} className="px-4 py-2 bg-[#2B2B2B] text-white rounded-lg text-sm">+ 주간 과제</button>
          </div>
        )}
      </div>

      {/* 내신/정시 탭 */}
      <div className="flex gap-2 mb-6">
        {Object.values(HW_CATEGORY).map((c) => (
          <button key={c} onClick={() => { setCategory(c); setMode('list') }}
            className={`px-4 py-2 rounded-full text-sm font-medium ${
              category === c ? 'bg-[#5B8FD4] text-white' : 'bg-gray-100 text-gray-600'
            }`}>{CATEGORY_LABELS[c]}</button>
        ))}
      </div>

      {/* 학생 */}
      {!isStaff && <StudentHomeworkView category={category} />}

      {/* 교사 */}
      {isStaff && mode === 'create' && (
        <TeacherHomeworkCreate category={category} onDone={() => setMode('list')} />
      )}
      {isStaff && mode === 'status' && (
        <>
          <button onClick={() => setMode('list')} className="text-sm text-gray-500 mb-4">← 목록</button>
          <TeacherHomeworkStatus category={category} />
        </>
      )}
      {isStaff && mode === 'list' && (
        <TeacherSetList category={category} sets={homeworkSets} onDelete={deleteHomeworkSet} userRole={user.role} userId={user.id} />
      )}
    </Layout>
  )
}

// 교사 목록: 이 종류의 세트들 (주차 최신순) + 삭제
function TeacherSetList({ category, sets, onDelete, userRole, userId }) {
  const mine = sets
    .filter((s) => s.category === category)
    .sort((a, b) => (a.weekStart < b.weekStart ? 1 : -1))
  if (mine.length === 0) return <p className="text-center text-gray-400 py-12">등록된 {CATEGORY_LABELS[category]}가 없습니다.</p>
  return (
    <div className="flex flex-col gap-3">
      {mine.map((s) => {
        const canDelete = userRole === 'admin' || s.teacherId === userId
        return (
          <div key={s.id} className="bg-white rounded-xl p-4 shadow-sm flex justify-between items-center">
            <div>
              <p className="font-semibold text-[#2B2B2B]">{s.title}</p>
              <p className="text-xs text-gray-400 mt-1">{s.weekStart} 주 · target {s.target}</p>
            </div>
            {canDelete && (
              <button onClick={() => { if (confirm(`"${s.title}" 세트를 삭제하시겠습니까?`)) onDelete(s.id) }}
                className="text-xs text-gray-300 hover:text-[#C0392B]">삭제</button>
            )}
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 3: 린트 + 전체 테스트**

Run: `npm run lint`
Expected: 오류 0 (미사용 import 있으면 제거)

Run: `npx vitest run`
Expected: 전체 PASS (기존 70 + 신규 유틸/학생화면 테스트)

- [ ] **Step 4: 빌드 확인**

Run: `npm run build`
Expected: 빌드 성공 (구 `homework` API 참조 잔재 없음)

- [ ] **Step 5: 구 테이블 드롭 (Task 7 Step 8 실행)**

Task 7 Step 8의 SQL을 지금 실행한다(코드가 더 이상 구 테이블을 참조하지 않음).

- [ ] **Step 6: 수동 통합 확인 (dev 서버)**

Run: `npm run dev`
- 교사 로그인 → 과제 → 내신 탭 → +주간 과제 → 고2, 이번 주, 월·화 요일에 문항/정답/해설 입력 → 저장 → 목록에 표시.
- 학생(고2, 정시레벨 지정) 로그인 → 과제 → 내신 탭에서 월요일 과제 제출 → 채점 결과 + 해설 확인 → 정시 탭 확인.
- 정시레벨 없는 학생 → 정시 탭에 안내 문구.
확인 후 서버 종료.

- [ ] **Step 7: 커밋**

```bash
git add src/components/homework/TeacherHomeworkStatus.jsx src/pages/Homework.jsx
git commit -m "feat: 과제 페이지 내신/정시 탭 + 교사 현황/목록 조립 (재설계 완료)"
```

---

## Self-Review 결과 (작성자 점검)

- **스펙 커버리지**: 내신=학년별(Task1,4,6,9~11)/정시=레벨별(동일) ✓, 요일별 개별 제출(Task9) ✓, 주간 세트 일괄 출제(Task10) ✓, 요일+문항 해설(Task8,10 — 문항별 해설 입력 UI는 스펙 "열린 항목"으로 MVP 후속) ✓, 제출 직후 해설 공개(Task9) ✓, 요일당 그 날 마감·지각(Task4,9) ✓, Storage 파일 업로드(Task7,10) ✓, YouTube 임베드(Task8) ✓, 학생 프로필 학년/정시레벨(Task6) ✓, 기존 테이블 교체(Task5,7) ✓.
- **플레이스홀더**: 없음. 문항별 해설 "입력 UI"는 스펙에서 명시적으로 열린 항목/후속으로 분류했고, 데이터 구조·표시(뷰어)는 완비.
- **타입 일관성**: `category`('naesin'/'jeongsi'), `target`(int), `weekStart`(YYYY-MM-DD), `weekday`(1~6), submission `answers`([{number,answer}]) — Task 3/4/7/9/10 전반 일치. `upsertHomeworkSubmission({dayId,studentId,answers})` 시그니처 Task7 정의 = Task9 호출 일치.
- **주의**: Task 7 중간 빌드는 Homework.jsx 교체(Task11) 전까지 실패가 정상. 구 테이블 드롭은 반드시 Task 11 이후.
