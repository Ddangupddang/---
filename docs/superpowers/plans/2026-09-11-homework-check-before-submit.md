# 과제 확인 → 오답 수정 → 제출 (1단계) 실행 계획

> **에이전트용:** 이 계획은 `superpowers:subagent-driven-development` 또는
> `superpowers:executing-plans`로 한 과제(Task)씩 실행한다. 단계는 체크박스로 추적한다.

**목표:** 학생이 제출 전에 딱 한 번 "확인"을 눌러 틀린 문항을 보고 고칠 수 있게 한다. 정답은 제출 후에만 공개한다.

**구조:** 확인 기록은 새 표 `homework_checks`에 따로 담는다. 기존 `homework_submissions_v2`를 건드리면 "제출했나"를 세는 일곱 군데가 전부 오판한다. `unique (day_id, student_id)`가 "확인은 1회"를 DB에서 보장한다. 채점은 이미 있는 `gradeHomework`를 그대로 쓰고, `ChoiceGrid`에 정답을 감추는 `check` 모드를 더한다.

**기술:** React 19 + Vite + Supabase(Postgres) + vitest + Tailwind v4

**설계 문서:** `docs/superpowers/specs/2026-09-11-homework-submission-flow-design.md`

## 전체 제약

- 색은 `src/index.css`의 토큰 클래스만 쓴다 (`bg-ink`, `text-danger`, `border-line`). hex 금지
- 모서리는 `rounded`(4px), 뱃지만 `rounded-sm`. 그림자 대신 `border border-line`
- 주석은 한글. "무엇을"이 아니라 "왜"를 적는다
- 컴포넌트는 함수형, 파일명 PascalCase
- 학생 화면은 모바일 우선
- `api/`에서 부르는 파일의 import는 `.js`를 붙인다 (이 계획에는 해당 없음)
- 커밋 메시지는 한글, 끝에 다음 두 줄을 붙인다:
  ```
  Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01GYTSzpiLcH2wyThwpJ5FPM
  ```

---

## 파일 구조

| 파일 | 책임 |
|------|------|
| `docs/homework-checks.sql` (신규) | `homework_checks` 표와 RLS 정책. 사용자가 Supabase에서 직접 실행 |
| `src/utils/homeworkCheck.js` (신규) | 확인 결과에서 "틀린 번호 목록"만 뽑는 순수 함수 |
| `src/components/ChoiceGrid.jsx` (수정) | `mode="check"` 추가 — 틀린 칸만 표시하고 정답은 감춘다 |
| `src/utils/homeworkMappers.js` (수정) | `toHomeworkCheck` 행 변환 |
| `src/context/DataContext.jsx` (수정) | `homeworkChecks` 상태, `addHomeworkCheck` |
| `src/components/homework/StudentHomeworkView.jsx` (수정) | 확인 버튼과 확인 화면 |
| `MANUAL.md` (수정) | 학생·교사용 설명 |

---

### Task 1: 틀린 문항만 뽑는 순수 함수

**파일:**
- 생성: `src/utils/homeworkCheck.js`
- 테스트: `src/utils/homeworkCheck.test.js`

**인터페이스:**
- 사용: `gradeHomework(questions, answers)` (`src/utils/homework.js`) — `{ results: [{number, correct, studentAnswer}], correctCount, total }`을 돌려준다
- 제공: `wrongNumbers(questions, answers) → number[]`, `checkSummary(questions, answers) → { correctCount, total, wrongNumbers }`

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`src/utils/homeworkCheck.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { wrongNumbers, checkSummary } from './homeworkCheck'

const questions = [
  { number: 1, answer: '①' },
  { number: 2, answer: '②' },
  { number: 3, answer: '③④' },
]

describe('wrongNumbers', () => {
  it('틀린 문항 번호만 돌려준다', () => {
    const answers = [
      { number: 1, answer: '①' },
      { number: 2, answer: '⑤' },
      { number: 3, answer: '③' },
    ]
    expect(wrongNumbers(questions, answers)).toEqual([2, 3])
  })

  it('다 맞으면 빈 배열', () => {
    const answers = [
      { number: 1, answer: '①' },
      { number: 2, answer: '②' },
      { number: 3, answer: '③④' },
    ]
    expect(wrongNumbers(questions, answers)).toEqual([])
  })

  it('답이 없는 문항도 틀린 것으로 센다', () => {
    expect(wrongNumbers(questions, [{ number: 1, answer: '①' }])).toEqual([2, 3])
  })
})

describe('checkSummary', () => {
  it('맞은 개수·전체·틀린 번호를 함께 준다', () => {
    const answers = [
      { number: 1, answer: '①' },
      { number: 2, answer: '⑤' },
      { number: 3, answer: '③④' },
    ]
    expect(checkSummary(questions, answers)).toEqual({
      correctCount: 2, total: 3, wrongNumbers: [2],
    })
  })
})
```

- [ ] **Step 2: 실패를 확인한다**

실행: `npx vitest run src/utils/homeworkCheck.test.js`
기대: `Failed to resolve import "./homeworkCheck"`

- [ ] **Step 3: 최소 구현을 쓴다**

`src/utils/homeworkCheck.js`:

```js
// src/utils/homeworkCheck.js
// 제출 전 "확인"의 결과를 만든다.
//
// 채점 자체는 gradeHomework가 이미 한다. 여기서는 그 결과에서
// 학생에게 보여줄 것만 남긴다 — 틀린 번호까지. 정답은 버린다.
// 정답을 화면까지 내려보내면 개발자 도구로 들여다볼 수 있다.
import { gradeHomework } from './homework.js'

// 틀린 문항 번호 (오름차순)
export function wrongNumbers(questions, answers) {
  return gradeHomework(questions, answers)
    .results.filter((r) => !r.correct)
    .map((r) => r.number)
}

// 확인 화면이 필요로 하는 것 전부
export function checkSummary(questions, answers) {
  const { results, correctCount, total } = gradeHomework(questions, answers)
  return {
    correctCount,
    total,
    wrongNumbers: results.filter((r) => !r.correct).map((r) => r.number),
  }
}
```

- [ ] **Step 4: 통과를 확인한다**

실행: `npx vitest run src/utils/homeworkCheck.test.js`
기대: PASS (5 tests)

- [ ] **Step 5: 커밋**

```bash
git add src/utils/homeworkCheck.js src/utils/homeworkCheck.test.js
git commit -m "feat: 확인 결과에서 틀린 문항 번호만 뽑는다

정답은 화면까지 내려보내지 않는다. 내려보내면 개발자 도구로 들여다볼 수 있다.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01GYTSzpiLcH2wyThwpJ5FPM"
```

---

### Task 2: ChoiceGrid에 정답을 감추는 check 모드

**파일:**
- 수정: `src/components/ChoiceGrid.jsx`
- 테스트: `src/components/ChoiceGrid.test.jsx`

**인터페이스:**
- 사용: 없음
- 제공: `<ChoiceGrid mode="check" wrong={[2,3]} numbers={...} values={...} onChange={...} />`
  - `check` 모드는 입력이 계속 가능하다 (틀린 문항을 고쳐야 하므로)
  - 틀린 문항의 칸에 `data-wrong="true"`가 붙는다
  - `answerKey`를 받지 않는다 — 정답이 화면에 오지 않는다

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`src/components/ChoiceGrid.test.jsx` 끝에 덧붙인다:

```jsx
describe('ChoiceGrid (check 모드 — 확인 결과)', () => {
  it('틀린 문항만 표시하고 정답은 드러내지 않는다', () => {
    render(
      <ChoiceGrid
        mode="check"
        numbers={[1, 2, 3]}
        values={{ 1: '①', 2: '⑤', 3: '③' }}
        wrong={[2, 3]}
        onChange={() => {}}
      />
    )
    expect(screen.getByTestId('cell-1')).toHaveAttribute('data-wrong', 'false')
    expect(screen.getByTestId('cell-2')).toHaveAttribute('data-wrong', 'true')
    expect(screen.getByTestId('cell-3')).toHaveAttribute('data-wrong', 'true')

    // 정답 표시(result 모드의 'answer')는 어디에도 없어야 한다
    const marked = document.querySelectorAll('[data-result="answer"]')
    expect(marked.length).toBe(0)
  })

  it('확인 뒤에도 답을 고칠 수 있다', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <ChoiceGrid
        mode="check"
        numbers={[1, 2]}
        values={{ 1: '①', 2: '⑤' }}
        wrong={[2]}
        onChange={onChange}
      />
    )
    await user.click(screen.getByTestId('cell-2-②'))
    expect(onChange).toHaveBeenCalledWith(2, '②')
  })
})
```

`ChoiceGrid.test.jsx` 맨 위 import에 `vi`가 없으면 더한다:
`import { describe, it, expect, vi } from 'vitest'`

- [ ] **Step 2: 실패를 확인한다**

실행: `npx vitest run src/components/ChoiceGrid.test.jsx`
기대: FAIL — `data-wrong` 속성이 없다

- [ ] **Step 3: 최소 구현을 쓴다**

`src/components/ChoiceGrid.jsx`에서 세 곳을 고친다.

(a) 파일 맨 위 주석에 모드 설명을 더한다:

```jsx
// mode='input'  : 입력 가능 (클릭/숫자키 1~5로 토글, Enter·화살표로 이동)
// mode='check'  : 제출 전 확인 — 틀린 문항만 알려주고 계속 고칠 수 있다.
//                 정답은 받지도 보여주지도 않는다(answerKey를 쓰지 않는다).
// mode='result' : 읽기 전용, answerKey와 비교해 정답/오답 표시
```

(b) 시그니처에 `wrong`을 더하고, 입력 가능 여부를 모드 하나로 판단하게 바꾼다:

```jsx
export default function ChoiceGrid({
  count, numbers: numbersProp, values = {}, onChange,
  mode = 'input', answerKey = {}, wrong = [],
}) {
  const numbers = numbersProp ?? Array.from({ length: count ?? 0 }, (_, i) => i + 1)
  // check 모드에서도 답을 고쳐야 한다 — 고칠 수 없으면 확인할 이유가 없다
  const editable = mode === 'input' || mode === 'check'
  const wrongSet = new Set(wrong)
  const [focused, setFocused] = useState(() => numbers[0] ?? 1)
```

(c) `mode !== 'input'` / `mode === 'input'` 판정을 `editable`로 바꾸고, 칸에 표시를 더한다.
바꿔야 할 곳은 다음 다섯 군데다.

```jsx
  function handleKeyDown(e) {
    if (!editable) return                                    // 1) mode !== 'input' → !editable
```
```jsx
      tabIndex={editable ? 0 : -1}                           // 2) mode === 'input' → editable
```
```jsx
        const isFocused = editable && number === focused     // 3)
        const isWrong = mode === 'check' && wrongSet.has(number)
```
```jsx
            data-testid={`cell-${number}`}
            data-wrong={String(isWrong)}
            onClick={() => editable && setFocused(number)}   // 4)
            className={`flex items-center gap-2 px-2 py-1.5 rounded ${
              isWrong ? 'ring-2 ring-danger bg-danger-soft' : isFocused ? 'ring-2 ring-navy bg-navy-soft' : ''
            }`}
```
```jsx
                  onClick={(e) => {
                    e.stopPropagation()
                    if (!editable) return                    // 5)
                    setFocused(number)
                    onChange(number, toggleChoice(values[number], choice))
                  }}
```

`cellClass`와 `cellResult`는 `mode === 'result'`만 보므로 그대로 둔다 —
check 모드는 `result`가 아니라서 입력 모드와 같은 색을 쓴다.

- [ ] **Step 4: 통과를 확인한다**

실행: `npx vitest run src/components/ChoiceGrid.test.jsx src/components/homework/StudentHomeworkView.test.jsx`
기대: 전부 PASS (기존 테스트가 깨지면 안 된다 — `editable` 치환을 빠뜨린 곳이 있다는 뜻이다)

- [ ] **Step 5: 커밋**

```bash
git add src/components/ChoiceGrid.jsx src/components/ChoiceGrid.test.jsx
git commit -m "feat: 정답을 감추고 틀린 문항만 알려주는 확인 모드

확인 뒤에도 답을 고칠 수 있어야 해서 입력이 계속 열려 있다.
answerKey를 받지 않는다 — 정답이 화면에 오면 개발자 도구로 들여다볼 수 있다.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01GYTSzpiLcH2wyThwpJ5FPM"
```

---

### Task 3: homework_checks 표 SQL

**파일:**
- 생성: `docs/homework-checks.sql`

**인터페이스:**
- 제공: `homework_checks(id, day_id, student_id, answers, checked_at)` 표. Task 4가 읽고 쓴다

이 과제에는 테스트가 없다. 사용자가 Supabase에서 실행하는 문서다.
대신 **여러 번 실행해도 안전(idempotent)** 해야 하고, 확인 쿼리로 끝나야 한다.

- [ ] **Step 1: SQL 파일을 쓴다**

`docs/homework-checks.sql`:

```sql
-- ============================================================
-- 제출 전 "확인" 기록 표
-- ============================================================
-- Supabase 대시보드 → SQL Editor → 전체 붙여넣기 → Run
-- 여러 번 실행해도 안전하다.
--
-- 왜 제출 표에 같이 안 넣나:
--   homework_submissions_v2에 행이 생기면 "제출했나"를 세는 코드가
--   전부 오판한다(대시보드 미제출 수, 주간·월간 리포트, 제출 현황 등).
--   표를 나누면 그 코드를 하나도 안 고쳐도 된다.
-- ============================================================

create table if not exists public.homework_checks (
  id         bigint generated always as identity primary key,
  day_id     bigint not null references public.homework_days(id) on delete cascade,
  student_id bigint not null,
  -- 확인을 누른 순간의 답안. 고치기 전 실력이 여기 남는다.
  answers    jsonb  not null default '[]'::jsonb,
  checked_at timestamptz not null default now(),
  -- 확인은 요일당 한 번뿐이다. 화면에서도 막지만 진짜 잠금은 여기다.
  unique (day_id, student_id)
);

create index if not exists homework_checks_day_idx
  on public.homework_checks (day_id);

alter table public.homework_checks enable row level security;

drop policy if exists hw_checks_all on public.homework_checks;
create policy hw_checks_all on public.homework_checks
for all to authenticated using (true) with check (true);

-- ── 확인 ─────────────────────────────────────────────────────
-- 1) 표가 생겼는지 (1행)
select table_name from information_schema.tables
 where table_schema = 'public' and table_name = 'homework_checks';

-- 2) 정책이 걸렸는지 (1행: hw_checks_all)
select policyname, cmd from pg_policies
 where schemaname = 'public' and tablename = 'homework_checks';
```

- [ ] **Step 2: 커밋**

```bash
git add docs/homework-checks.sql
git commit -m "feat: 확인 기록 표

제출 표에 같이 넣으면 '제출했나'를 세는 일곱 군데가 오판한다.
unique(day_id, student_id)가 '확인은 1회'를 DB에서 보장한다.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01GYTSzpiLcH2wyThwpJ5FPM"
```

- [ ] **Step 3: 사용자에게 실행을 요청한다**

작업을 멈추고 사용자에게 알린다:

> `docs/homework-checks.sql`을 Supabase SQL Editor에서 실행해 주세요.
> 맨 아래 확인 쿼리가 각각 1행씩 나오면 됩니다.

표가 없으면 Task 5의 확인 버튼이 저장에 실패한다. **실행을 확인한 뒤 다음으로 넘어간다.**

---

### Task 4: 확인 기록을 읽고 쓰는 DataContext 배선

**파일:**
- 수정: `src/utils/homeworkMappers.js`
- 수정: `src/utils/homeworkMappers.test.js`
- 수정: `src/context/DataContext.jsx`

**인터페이스:**
- 사용: Task 3의 `homework_checks` 표
- 제공:
  - `toHomeworkCheck(row) → { id, dayId, studentId, answers, checkedAt }`
  - `useData()`의 `homeworkChecks: Array<check>`
  - `useData()`의 `addHomeworkCheck({ dayId, studentId, answers }) → check | null`
    (이미 확인한 요일이면 기존 기록을 그대로 돌려준다. 실패하면 null)

- [ ] **Step 1: 매퍼 테스트를 쓴다**

`src/utils/homeworkMappers.test.js` 끝에 덧붙인다.
파일 맨 위 import 목록에 `toHomeworkCheck`를 더한다.

```js
describe('toHomeworkCheck', () => {
  it('DB 행을 앱 모양으로 바꾼다', () => {
    expect(toHomeworkCheck({
      id: 5, day_id: 10, student_id: 7,
      answers: [{ number: 1, answer: '①' }],
      checked_at: '2026-09-11T01:00:00Z',
    })).toEqual({
      id: 5, dayId: 10, studentId: 7,
      answers: [{ number: 1, answer: '①' }],
      checkedAt: '2026-09-11T01:00:00Z',
    })
  })

  it('answers가 비어 있으면 빈 배열로 본다', () => {
    expect(toHomeworkCheck({ id: 5, day_id: 10, student_id: 7, answers: null }).answers).toEqual([])
  })
})
```

- [ ] **Step 2: 실패를 확인한다**

실행: `npx vitest run src/utils/homeworkMappers.test.js`
기대: FAIL — `toHomeworkCheck is not a function`

- [ ] **Step 3: 매퍼를 더한다**

`src/utils/homeworkMappers.js` 끝에:

```js
export function toHomeworkCheck(r) {
  return {
    id: r.id, dayId: r.day_id, studentId: r.student_id,
    answers: r.answers ?? [], checkedAt: r.checked_at,
  }
}
```

- [ ] **Step 4: 통과를 확인한다**

실행: `npx vitest run src/utils/homeworkMappers.test.js`
기대: PASS

- [ ] **Step 5: DataContext에 상태와 조회를 더한다**

`src/context/DataContext.jsx`에서 네 곳을 고친다.

(a) import에 `toHomeworkCheck`를 더한다 (`toHomeworkSubmission`이 있는 줄):

```jsx
import { toHomeworkSet, toHomeworkDay, toHomeworkQuestion, toHomeworkSubmission, toHomeworkCheck } from '../utils/homeworkMappers'
```
(실제 import 줄 모양에 맞춰 `toHomeworkCheck`만 덧붙인다)

(b) `const [homeworkQuestions, setHomeworkQuestions] = useState([])` 아래에:

```jsx
  const [homeworkChecks,      setHomeworkChecks]      = useState([])
```

(c) `loadAll`의 `Promise.all` 배열에서 `homework_submissions_v2` 줄 **다음**에 한 줄을 더하고,
맨 앞 구조분해에도 이름을 더한다. 구조분해는 배열 순서와 1:1이므로
**반드시 같은 자리에 넣어야 한다.**

```jsx
      const [cRes, sRes, aRes, gRes, qRes, qmRes, nRes, rRes, pRes, vRes, vcRes, tRes, subRes, hwSetsRes, hwDaysRes, hwQRes, hwSubRes, hwChkRes, wnRes, saRes] =
```
```jsx
          fetchAllRows(() => supabase.from('homework_submissions_v2').select('*').order('id')),
          fetchAllRows(() => supabase.from('homework_checks').select('*').order('id')),
          fetchAllRows(() => supabase.from('weekly_report_notes').select('*').order('id')),
```

(d) 반영하는 곳 — `homeworkSubmissions`를 반영하는 줄을 찾아 그 아래에:

```jsx
      const hwChkRows = rowsOrNull(hwChkRes); if (hwChkRows) setHomeworkChecks(hwChkRows.map(toHomeworkCheck))
```

- [ ] **Step 6: addHomeworkCheck를 더한다**

`upsertHomeworkSubmission` 함수 **바로 위**에:

```jsx
  // 제출 전 "확인" 기록. 요일당 한 번뿐이다.
  //
  // 제출 표(homework_submissions_v2)와 따로 두는 이유:
  // 그쪽에 행이 생기면 "제출했나"를 세는 코드가 전부 오판한다.
  //
  // upsert가 아니라 insert를 쓴다 — 두 번째 확인은 DB가 거부해야 한다.
  async function addHomeworkCheck({ dayId, studentId, answers }) {
    const already = homeworkChecks.find((c) => c.dayId === dayId && c.studentId === studentId)
    if (already) return already

    const { data, error } = await supabase
      .from('homework_checks')
      .insert({ day_id: dayId, student_id: studentId, answers })
      .select().single()

    // 다른 기기에서 이미 확인한 경우(unique 위반) — 먼저 한 기록이 맞다
    if (error?.code === '23505') {
      const { data: existing } = await supabase
        .from('homework_checks')
        .select('*').eq('day_id', dayId).eq('student_id', studentId).single()
      return existing ? toHomeworkCheck(existing) : null
    }
    if (error) { console.error('확인 기록 실패:', error); return null }

    const record = toHomeworkCheck(data)
    setHomeworkChecks((prev) => [...prev, record])
    return record
  }
```

(e) context value에 둘을 더한다 — `upsertHomeworkSubmission,`이 있는 줄 근처:

```jsx
      homeworkChecks, addHomeworkCheck,
```

- [ ] **Step 7: 전체 테스트와 빌드를 확인한다**

실행: `npx vitest run && npm run lint && npm run build`
기대: 전부 통과. 실패하면 (c)의 구조분해 순서가 배열과 어긋난 것이다.

- [ ] **Step 8: 커밋**

```bash
git add src/utils/homeworkMappers.js src/utils/homeworkMappers.test.js src/context/DataContext.jsx
git commit -m "feat: 확인 기록을 읽고 쓴다

두 번째 확인은 DB가 거부한다 — upsert가 아니라 insert를 쓴다.
다른 기기에서 먼저 확인했으면 그 기록을 그대로 돌려준다.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01GYTSzpiLcH2wyThwpJ5FPM"
```

---

### Task 5: 학생 화면에 확인 버튼과 확인 결과

**파일:**
- 수정: `src/components/homework/StudentHomeworkView.jsx`
- 테스트: `src/components/homework/StudentHomeworkView.test.jsx`

**인터페이스:**
- 사용: `checkSummary` (Task 1), `<ChoiceGrid mode="check" wrong={...}>` (Task 2),
  `useData()`의 `homeworkChecks`·`addHomeworkCheck` (Task 4)
- 제공: 없음 (화면이 끝단이다)

**동작:**
- 답을 다 채우면 **[확인하기]** 와 **[제출하기]** 가 함께 보인다
- 확인을 누르면 맞은 개수와 틀린 문항이 표시되고, 틀린 칸을 고칠 수 있다
- 확인 버튼은 그 뒤로 사라진다 (`homeworkChecks`에 기록이 있으면 처음부터 안 보인다)
- 제출하면 지금과 똑같이 결과·정답·해설이 나온다

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`src/components/homework/StudentHomeworkView.test.jsx`의 `beforeEach` 안
`upsertHomeworkSubmission` 줄 아래에 두 줄을 더한다:

```js
    homeworkChecks: [],
    addHomeworkCheck: vi.fn().mockResolvedValue({ id: 800, dayId: 10, studentId: 7 }),
```

그리고 파일 끝에 덧붙인다:

```jsx
// ── 제출 전 확인 (1단계) ─────────────────────────────────────
describe('StudentHomeworkView (제출 전 확인)', () => {
  it('다 채우면 확인하기와 제출하기가 함께 보인다', async () => {
    const user = userEvent.setup()
    render(<StudentHomeworkView category="naesin" />)
    await user.click(screen.getByText('월요일 과제'))

    expect(screen.getByRole('button', { name: '확인하기' })).toBeDisabled()

    await user.click(screen.getByTestId('cell-1-①'))
    await user.click(screen.getByTestId('cell-2-⑤'))

    expect(screen.getByRole('button', { name: '확인하기' })).toBeEnabled()
    expect(screen.getByRole('button', { name: '제출하기' })).toBeEnabled()
  })

  it('확인하면 틀린 문항을 알려주고 정답은 감춘다', async () => {
    const user = userEvent.setup()
    render(<StudentHomeworkView category="naesin" />)
    await user.click(screen.getByText('월요일 과제'))

    // 1번은 정답(①), 2번은 오답(정답 ②인데 ⑤를 고름)
    await user.click(screen.getByTestId('cell-1-①'))
    await user.click(screen.getByTestId('cell-2-⑤'))
    await user.click(screen.getByRole('button', { name: '확인하기' }))

    await waitFor(() => expect(state.data.addHomeworkCheck).toHaveBeenCalled())
    expect(screen.getByTestId('check-score')).toHaveTextContent('1')
    expect(screen.getByTestId('cell-1')).toHaveAttribute('data-wrong', 'false')
    expect(screen.getByTestId('cell-2')).toHaveAttribute('data-wrong', 'true')

    // 정답(②)이 화면에 드러나면 안 된다
    expect(document.querySelectorAll('[data-result="answer"]').length).toBe(0)
  })

  it('확인한 답안이 그대로 기록된다', async () => {
    const user = userEvent.setup()
    render(<StudentHomeworkView category="naesin" />)
    await user.click(screen.getByText('월요일 과제'))
    await user.click(screen.getByTestId('cell-1-①'))
    await user.click(screen.getByTestId('cell-2-⑤'))
    await user.click(screen.getByRole('button', { name: '확인하기' }))

    await waitFor(() => expect(state.data.addHomeworkCheck).toHaveBeenCalledWith({
      dayId: 10,
      studentId: 7,
      answers: [
        { number: 1, answer: '①' },
        { number: 2, answer: '⑤' },
      ],
    }))
  })

  it('확인 뒤에 틀린 답을 고쳐 제출할 수 있다', async () => {
    const user = userEvent.setup()
    render(<StudentHomeworkView category="naesin" />)
    await user.click(screen.getByText('월요일 과제'))
    await user.click(screen.getByTestId('cell-1-①'))
    await user.click(screen.getByTestId('cell-2-⑤'))
    await user.click(screen.getByRole('button', { name: '확인하기' }))
    await waitFor(() => expect(state.data.addHomeworkCheck).toHaveBeenCalled())

    // ⑤를 끄고 ②로 고친다
    await user.click(screen.getByTestId('cell-2-⑤'))
    await user.click(screen.getByTestId('cell-2-②'))
    await user.click(screen.getByRole('button', { name: '제출하기' }))

    await waitFor(() => expect(state.data.upsertHomeworkSubmission).toHaveBeenCalledWith({
      dayId: 10,
      studentId: 7,
      answers: [
        { number: 1, answer: '①' },
        { number: 2, answer: '②' },
      ],
    }))
  })

  it('이미 확인한 요일이면 확인하기가 아예 안 보인다', async () => {
    const user = userEvent.setup()
    state.data.homeworkChecks = [
      { id: 800, dayId: 10, studentId: 7, answers: [], checkedAt: '2026-09-11T01:00:00Z' },
    ]
    render(<StudentHomeworkView category="naesin" />)
    await user.click(screen.getByText('월요일 과제'))
    await user.click(screen.getByTestId('cell-1-①'))
    await user.click(screen.getByTestId('cell-2-⑤'))

    expect(screen.queryByRole('button', { name: '확인하기' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '제출하기' })).toBeEnabled()
  })

  it('확인을 건너뛰고 바로 제출할 수 있다', async () => {
    const user = userEvent.setup()
    render(<StudentHomeworkView category="naesin" />)
    await user.click(screen.getByText('월요일 과제'))
    await user.click(screen.getByTestId('cell-1-①'))
    await user.click(screen.getByTestId('cell-2-⑤'))
    await user.click(screen.getByRole('button', { name: '제출하기' }))

    await waitFor(() => expect(state.data.upsertHomeworkSubmission).toHaveBeenCalled())
    expect(state.data.addHomeworkCheck).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: 실패를 확인한다**

실행: `npx vitest run src/components/homework/StudentHomeworkView.test.jsx`
기대: FAIL — "확인하기" 버튼이 없다

- [ ] **Step 3: 화면을 고친다**

`src/components/homework/StudentHomeworkView.jsx`에서 다섯 곳을 고친다.

(a) import 두 줄을 더한다:

```jsx
import { checkSummary } from '../../utils/homeworkCheck'
```

(b) `useData()` 구조분해에 둘을 더한다:

```jsx
    homeworkSubmissions, upsertHomeworkSubmission,
    homeworkChecks = [], addHomeworkCheck,
```

(c) 상태 두 개를 더한다 (`const [submitError, setSubmitError] = useState('')` 아래):

```jsx
  // 확인 결과 — 눌렀을 때만 채워진다. 요일을 닫으면 지운다.
  const [checkResult, setCheckResult] = useState(null)  // { correctCount, total, wrongNumbers }
  const [checking, setChecking] = useState(false)
```

(d) 답 입력 화면(`// 답 입력(신규 제출 또는 수정)` 아래)에서 `handleSubmit` **위**에
확인 핸들러와 판정을 더한다:

```jsx
    // 이 요일을 이미 확인했나 — 확인은 요일당 한 번뿐이다
    const checkedAlready = homeworkChecks.some((c) => c.dayId === day.id && c.studentId === me.id)
    const canCheck = allAnswered && !checkedAlready && !checking && loadedAll

    async function handleCheck() {
      if (!canCheck) return
      setChecking(true)
      setSubmitError('')
      const payload = qs.map((q) => ({ number: q.number, answer: answers[q.number] }))
      const saved = await addHomeworkCheck({ dayId: day.id, studentId: me.id, answers: payload })
      setChecking(false)
      // 기록에 실패하면 확인 결과도 보여주지 않는다.
      // 보여주고 기록이 없으면 새로고침으로 몇 번이든 다시 확인할 수 있다.
      if (!saved) {
        setSubmitError('확인에 실패했습니다. 잠시 후 다시 시도해 주세요.')
        return
      }
      setCheckResult(checkSummary(qs, payload))
    }
```

(e) 화면을 고친다. `ChoiceGrid` 부분과 버튼 부분을 아래로 바꾼다:

```jsx
        {checkResult && (
          <div className="bg-ink text-white rounded p-4 text-center my-3">
            <p className="text-sm text-white/60 mb-1">확인 결과</p>
            <p data-testid="check-score" className="text-3xl font-bold">
              {checkResult.correctCount}<span className="text-xl text-white/50"> / {checkResult.total}</span>
            </p>
            {checkResult.wrongNumbers.length > 0 && (
              <p className="text-xs text-white/70 mt-2">
                {checkResult.wrongNumbers.join(', ')}번을 다시 보세요. 정답은 제출한 뒤에 공개됩니다.
              </p>
            )}
          </div>
        )}

        <ChoiceGrid
          numbers={qs.map((q) => q.number)}
          values={answers}
          mode={checkResult ? 'check' : 'input'}
          wrong={checkResult?.wrongNumbers ?? []}
          onChange={(number, choice) => setAnswers((prev) => ({ ...prev, [number]: choice }))}
        />
```

그리고 마지막 버튼 하나를 두 개로 바꾼다:

```jsx
        <div className="flex gap-2 mt-3">
          {!checkedAlready && (
            <Button variant="ghost" onClick={handleCheck} disabled={!canCheck} className="flex-1">
              {checking ? '확인 중...' : '확인하기'}
            </Button>
          )}
          <Button variant="primary" onClick={handleSubmit}
            disabled={!allAnswered || submitting || !loadedAll} className="flex-1">
            {submitting ? '제출 중...' : '제출하기'}
          </Button>
        </div>
```

(f) 안내 문구를 상황에 맞게 바꾼다. 기존 빨간 Alert를 아래로 교체한다:

```jsx
        <Alert tone={checkResult ? 'info' : 'danger'} className="mt-3">
          {checkResult
            ? '틀린 문항을 고쳐 제출하세요. 확인은 한 번뿐이라 다시 눌러도 채점되지 않습니다.'
            : '확인은 한 번만 할 수 있습니다. 제출한 뒤에는 답을 수정할 수 없습니다.'}
        </Alert>
```

(g) 요일을 닫을 때 확인 결과도 지운다. `setAnswers({})`를 하는 두 곳에
`setCheckResult(null)`을 함께 넣는다 — 뒤로 가기 버튼과 요일 목록의 카드 클릭이다.

- [ ] **Step 4: 통과를 확인한다**

실행: `npx vitest run src/components/homework/StudentHomeworkView.test.jsx`
기대: PASS (전부)

- [ ] **Step 5: 전체 확인**

실행: `npx vitest run && npm run lint && npm run build`
기대: 전부 통과

- [ ] **Step 6: 커밋**

```bash
git add src/components/homework/StudentHomeworkView.jsx src/components/homework/StudentHomeworkView.test.jsx
git commit -m "feat: 제출 전에 한 번 확인하고 틀린 문항을 고친다

틀린 번호만 알려주고 정답은 제출 뒤에 공개한다.
확인은 요일당 한 번이고, 건너뛰고 바로 제출해도 된다.
기록에 실패하면 결과도 보여주지 않는다 — 보여주고 기록이 없으면
새로고침으로 몇 번이든 다시 확인할 수 있다.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01GYTSzpiLcH2wyThwpJ5FPM"
```

---

### Task 6: 매뉴얼 갱신

**파일:**
- 수정: `MANUAL.md`

- [ ] **Step 1: 학생 제출 설명을 고친다**

`### 과제 제출 (학생)` 절을 찾아 제출 절차 설명 뒤에 덧붙인다:

```markdown
### 제출 전 확인 (학생)

답을 다 채우면 **확인하기** 와 **제출하기** 가 함께 보입니다.

**확인하기** 를 누르면:

- 몇 개를 맞혔는지와 **틀린 문항 번호** 가 표시됩니다
- **정답은 보이지 않습니다.** 틀렸다는 것만 알려줍니다
- 틀린 문항을 다시 골라 고칠 수 있습니다
- 고친 뒤 **제출하기** 를 누르면 제출됩니다

> **확인은 요일당 한 번뿐입니다.** 한 번 누르면 그 뒤로 버튼이 사라집니다.
> 고친 답을 다시 채점해 볼 수는 없습니다.
>
> **확인을 건너뛰고 바로 제출해도 됩니다.** 자신 있으면 제출하기만 누르세요.
>
> **정답과 해설은 제출한 뒤에 공개됩니다.**

교사 화면의 점수와 리포트는 **최종 제출한 답안** 기준입니다.
```

- [ ] **Step 2: 커밋**

```bash
git add MANUAL.md
git commit -m "docs: 제출 전 확인 사용법

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01GYTSzpiLcH2wyThwpJ5FPM"
```

- [ ] **Step 3: 배포하고 확인한다**

```bash
git push origin main
```

배포 뒤 학생 계정으로 한 요일을 열어 확인 → 수정 → 제출을 한 번 해 본다.
`homework_checks`에 행이 하나 생겼는지 SQL로 확인한다:

```sql
select c.id, st.name, d.weekday, c.checked_at
from public.homework_checks c
join public.homework_days d on d.id = c.day_id
join public.students st on st.id = c.student_id
order by c.checked_at desc limit 5;
```

---

## 자기 점검

**설계 문서 대비 빠진 것:** 1단계 항목(확인 화면, `homework_checks` 표, `ChoiceGrid` check 모드, 1회 제한, 건너뛰기)은 Task 1~6이 모두 덮는다. 2·3단계(기한, 열어주기)는 이 계획의 범위가 아니다.

**빈칸:** 없다. 모든 코드 단계에 실제 코드가 들어 있다.

**이름 일관성:** `wrongNumbers`/`checkSummary`(Task 1) → Task 5에서 `checkSummary`만 쓴다. `wrongNumbers`는 Task 1 테스트에서만 쓰이지만 독립적으로 쓸모가 있어 남긴다. `toHomeworkCheck`(Task 4) → Task 4 내부에서만. `mode="check"`와 `wrong` prop(Task 2) → Task 5에서 같은 이름으로 쓴다. `addHomeworkCheck`의 인자 모양 `{ dayId, studentId, answers }`은 Task 4 정의와 Task 5 테스트가 일치한다.
