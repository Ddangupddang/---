# 복수 정답(다중선택) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 교사가 문항 하나에 정답을 여러 개 지정하고, 학생도 여러 개 체크해 제출할 수 있게 한다 — 과제와 테스트 양쪽에서.

**Architecture:** 정답을 선지 글자를 이어 붙인 문자열(`'①③'`)로 저장해 DB 스키마와 기존 데이터를 건드리지 않는다. 집합 비교와 토글을 순수 함수 두 개(`src/utils/answerSet.js`)로 모으고, 선지 버튼이 있는 세 곳(`ChoiceGrid`, `Tests`의 `TakeView`·`CreateView`)이 그 함수를 쓰게 한다. 채점도 같은 비교 함수를 쓴다.

**Tech Stack:** React 19 + Vite 8 + Tailwind CSS v4 · Vitest + @testing-library/react

## Global Constraints

- 설계 문서: `docs/superpowers/specs/2026-08-19-multi-answer-design.md` — 충돌 시 스펙이 기준
- **기능·화면 배치·문구를 바꾸지 않는다.** 입력 방식(교체 → 토글)과 채점 기준(단순 비교 → 집합 비교)만 바뀐다
- **DB 스키마를 건드리지 않는다.** 마이그레이션 SQL을 쓰지 않는다
- 정답 문자열은 항상 **선지 순서(①②③④⑤)로 정렬**해 저장한다
- 채점은 **전부 맞아야 정답**이다. 부분점수를 넣지 않는다
- 색은 토큰 클래스만 쓴다 (`bg-ink` `bg-navy` `bg-danger` `bg-surface-alt` `text-ink-soft` `text-ink-mute` `border-line` 등). **hex 금지**
- 주석은 한글로, "무엇을"이 아니라 **"왜"**를 적는다
- 각 태스크 끝에서 **`npx vitest run` + `npm run lint` + `npm run build`가 모두 통과**해야 커밋한다
- **기존 265개 테스트가 그대로 통과해야 한다.** 그것이 "정답이 하나인 기존 문항의 동작이 안 바뀌었다"는 증거다. 깨지면 기존 단일 선택 흐름을 건드렸다는 신호이므로 멈추고 조사한다 (새로 추가하는 테스트는 이 수 위에 더해진다)

---

## File Structure

| 파일 | 상태 | 책임 |
|---|---|---|
| `src/utils/answerSet.js` | 신규 | `sameChoiceSet`, `toggleChoice` — 비교와 토글의 단일 출처 |
| `src/utils/answerSet.test.js` | 신규 | 위 두 함수의 단위 테스트 |
| `src/components/ChoiceGrid.jsx` | 수정 | 과제 화면의 토글·키보드·결과 표시 |
| `src/components/ChoiceGrid.test.jsx` | 수정 | 토글·키보드·다중 결과 테스트 추가 |
| `src/utils/homework.js` | 수정 | `gradeHomework`가 `sameChoiceSet` 사용 |
| `src/utils/homework.test.js` | 수정 | 다중 정답 채점 테스트 추가 |
| `src/pages/Tests.jsx` | 수정 | `CreateView` 정답 지정 토글, `TakeView` 학생 답안 토글, 채점 |
| `src/components/homework/TeacherHomeworkCreate.jsx` | 수정 | `canSave`·카운터가 빈 문자열을 미입력으로 센다 |
| `src/components/homework/StudentHomeworkView.jsx` | 수정 | `allAnswered`·카운터 동일 |

`answerSet.js`를 따로 두는 이유: 과제(`homework.js`)와 테스트(`Tests.jsx`)가 둘 다 쓴다. `homework.js`에 넣으면 테스트 채점이 과제 유틸을 import하게 되어 의존 방향이 어색해진다.

**주의 — 스펙의 정정 사항:** 최초 설계는 "과제와 테스트가 같은 `ChoiceGrid`를 쓴다"고 적었으나 사실이 아니다. `Tests.jsx`는 `ChoiceGrid`를 import하지 않고 `TakeView`·`CreateView`에 각자 선지 버튼을 갖고 있다. 그래서 토글을 **세 곳**에 적용한다.

---

## Task 1: 비교·토글 순수 함수

**Files:**
- Create: `src/utils/answerSet.js`
- Create: `src/utils/answerSet.test.js`

**Interfaces:**
- Consumes: 없음 (첫 태스크)
- Produces: 이후 모든 태스크가 이 두 함수만 쓴다.
  - `sameChoiceSet(a: string|null, b: string|null): boolean` — 두 정답 문자열이 같은 집합인지
  - `toggleChoice(current: string|null, choice: string): string` — 선지 하나를 켜고/끄고, 선지 순서로 정렬해 반환

- [ ] **Step 1: 실패하는 테스트 작성**

`src/utils/answerSet.test.js` 신규 생성:

```js
// src/utils/answerSet.test.js
import { describe, it, expect } from 'vitest'
import { sameChoiceSet, toggleChoice } from './answerSet'

describe('sameChoiceSet', () => {
  it('한 개짜리 정답은 지금까지와 똑같이 비교된다', () => {
    expect(sameChoiceSet('③', '③')).toBe(true)
    expect(sameChoiceSet('③', '①')).toBe(false)
  })

  it('여러 개는 순서가 달라도 같은 집합이면 정답이다', () => {
    expect(sameChoiceSet('①③', '③①')).toBe(true)
  })

  it('덜 고르면 오답이다', () => {
    expect(sameChoiceSet('①③', '①')).toBe(false)
  })

  it('더 고르면 오답이다', () => {
    expect(sameChoiceSet('①③', '①②③')).toBe(false)
  })

  it('빈 값·null은 정답으로 치지 않는다 — 미입력을 정답으로 세면 안 된다', () => {
    expect(sameChoiceSet('', '①')).toBe(false)
    expect(sameChoiceSet('①', '')).toBe(false)
    expect(sameChoiceSet('', '')).toBe(false)
    expect(sameChoiceSet(null, null)).toBe(false)
    expect(sameChoiceSet(null, '①')).toBe(false)
    expect(sameChoiceSet(undefined, undefined)).toBe(false)
  })

  it('같은 선지가 중복돼 들어와도 집합으로 본다', () => {
    // 저장 값이 어떤 경로로든 '①①'이 되더라도 '①' 하나로 취급해야 한다
    expect(sameChoiceSet('①①', '①')).toBe(true)
  })
})

describe('toggleChoice', () => {
  it('없던 선지를 켠다', () => {
    expect(toggleChoice('', '③')).toBe('③')
    expect(toggleChoice(null, '③')).toBe('③')
  })

  it('켜져 있던 선지를 끈다', () => {
    expect(toggleChoice('③', '③')).toBe('')
  })

  it('여러 개를 켜면 선지 순서로 정렬해 돌려준다', () => {
    // 입력 순서에 따라 저장 값이 달라지면 나중에 눈으로 비교하기 어렵다
    expect(toggleChoice('③', '①')).toBe('①③')
    expect(toggleChoice('①③', '②')).toBe('①②③')
  })

  it('가운데 하나만 꺼도 나머지 순서가 유지된다', () => {
    expect(toggleChoice('①②③', '②')).toBe('①③')
  })

  it('마지막 하나를 끄면 빈 문자열이 된다 — 미입력으로 판정돼야 한다', () => {
    expect(toggleChoice('③', '③')).toBe('')
  })
})
```

- [ ] **Step 2: 테스트를 돌려 실패를 확인**

Run: `npx vitest run src/utils/answerSet.test.js`
Expected: FAIL — `Failed to resolve import "./answerSet"`

- [ ] **Step 3: 구현**

`src/utils/answerSet.js` 신규 생성:

```js
// src/utils/answerSet.js
// 정답·답안을 "선지 글자를 이어 붙인 문자열"로 다루는 순수 함수.
//
// 왜 문자열인가: 선지 ①②③④⑤가 각각 한 글자라 '①③'처럼 이어 붙여도 분해가 쉽다.
// 덕분에 DB 스키마(text 컬럼)를 그대로 두고, 기존에 저장된 '③'도 원소 하나짜리
// 집합으로 그대로 읽힌다 — 마이그레이션이 필요 없다.

const CHOICES = ['①', '②', '③', '④', '⑤']

// 문자열 → 중복 없는 선지 집합
function toSet(value) {
  return new Set(value ? [...value] : [])
}

// 두 정답이 같은 집합인가. 순서는 무관하고, 하나라도 모자라거나 남으면 다르다.
// 빈 값끼리는 false — 아무것도 고르지 않은 답을 정답으로 세면 안 된다.
export function sameChoiceSet(a, b) {
  const setA = toSet(a)
  const setB = toSet(b)
  if (setA.size === 0 || setB.size === 0) return false
  if (setA.size !== setB.size) return false
  for (const c of setA) if (!setB.has(c)) return false
  return true
}

// 선지 하나를 켜고/끈다. 결과는 항상 선지 순서(①②③④⑤)로 정렬한다 —
// 누른 순서에 따라 저장 값이 달라지면 나중에 눈으로 비교하기 어렵다.
export function toggleChoice(current, choice) {
  const set = toSet(current)
  if (set.has(choice)) set.delete(choice)
  else set.add(choice)
  return CHOICES.filter((c) => set.has(c)).join('')
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/utils/answerSet.test.js`
Expected: PASS (11 tests)

- [ ] **Step 5: 전체 확인**

Run: `npx vitest run && npm run lint && npm run build`
Expected: 265 + 11 = **276 통과**, lint 에러 0, 빌드 성공

- [ ] **Step 6: 커밋**

```bash
git add src/utils/answerSet.js src/utils/answerSet.test.js
git commit -m "feat: 정답 집합 비교·토글 순수 함수"
```

---

## Task 2: 과제 채점을 집합 비교로

**Files:**
- Modify: `src/utils/homework.js` (`gradeHomework`)
- Modify: `src/utils/homework.test.js`

**Interfaces:**
- Consumes: `sameChoiceSet` (Task 1)
- Produces: 없음 — `gradeHomework`의 시그니처와 반환 모양은 그대로다

- [ ] **Step 1: 실패하는 테스트 추가**

`src/utils/homework.test.js`의 import에 아무것도 추가하지 말고(이미 `gradeHomework`를 가져온다), `describe('gradeHomework', ...)` 블록 안 마지막에 붙인다:

```js
  it('다중 정답은 전부 맞아야 정답이다', () => {
    const questions = [{ number: 1, answer: '①③' }]
    // 순서가 달라도 같은 집합이면 정답
    expect(gradeHomework(questions, [{ number: 1, answer: '③①' }]).correctCount).toBe(1)
    // 덜 고름
    expect(gradeHomework(questions, [{ number: 1, answer: '①' }]).correctCount).toBe(0)
    // 더 고름
    expect(gradeHomework(questions, [{ number: 1, answer: '①②③' }]).correctCount).toBe(0)
  })

  it('답을 아예 안 낸 문항은 정답이 아니다', () => {
    const questions = [{ number: 1, answer: '①③' }]
    expect(gradeHomework(questions, []).correctCount).toBe(0)
  })
```

- [ ] **Step 2: 테스트를 돌려 실패를 확인**

Run: `npx vitest run src/utils/homework.test.js`
Expected: FAIL — `expected 0 to be 1` (`'③①' === '①③'`가 false라 순서 다른 정답을 못 맞힌다)

- [ ] **Step 3: 구현**

`src/utils/homework.js` 상단 import에 추가:

```js
import { sameChoiceSet } from './answerSet'
```

`gradeHomework` 안의 `correct` 판정을 바꾼다:

```js
      // 다중 정답은 순서 무관 집합 비교 — 덜 골라도 더 골라도 오답이다
      correct: sameChoiceSet(studentAnswer, q.answer),
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/utils/homework.test.js`
Expected: PASS

- [ ] **Step 5: 전체 확인**

Run: `npx vitest run && npm run lint && npm run build`
Expected: **278 통과** (276 + 2), lint 0, 빌드 성공

기존 과제 테스트가 하나라도 깨지면 한 개짜리 정답의 채점이 바뀐 것이다 — 멈추고 조사할 것.

- [ ] **Step 6: 커밋**

```bash
git add src/utils/homework.js src/utils/homework.test.js
git commit -m "feat: 과제 채점을 정답 집합 비교로"
```

---

## Task 3: ChoiceGrid 토글 (과제 화면)

**Files:**
- Modify: `src/components/ChoiceGrid.jsx`
- Modify: `src/components/ChoiceGrid.test.jsx`

**Interfaces:**
- Consumes: `toggleChoice` (Task 1)
- Produces: `onChange(number, nextValue)` — `nextValue`는 **토글 후의 전체 문자열**. 호출부는 지금도 받은 값을 그대로 저장하므로 변경이 필요 없다.

- [ ] **Step 1: 실패하는 테스트 추가**

`src/components/ChoiceGrid.test.jsx` 파일 끝에 붙인다:

```js
describe('ChoiceGrid (다중선택)', () => {
  it('같은 선지를 두 번 누르면 꺼진다', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<ChoiceGrid count={1} values={{ 1: '②' }} mode="input" onChange={onChange} />)

    await user.click(screen.getByTestId('cell-1-②'))
    // 이미 켜져 있던 선지를 누르면 빈 문자열이 돼야 한다
    expect(onChange).toHaveBeenCalledWith(1, '')
  })

  it('다른 선지를 누르면 교체가 아니라 추가된다', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<ChoiceGrid count={1} values={{ 1: '③' }} mode="input" onChange={onChange} />)

    await user.click(screen.getByTestId('cell-1-①'))
    // 선지 순서로 정렬돼 돌아온다
    expect(onChange).toHaveBeenCalledWith(1, '①③')
  })

  it('여러 개 켜진 값이 모두 선택 표시된다', () => {
    render(<ChoiceGrid count={1} values={{ 1: '①③' }} mode="input" onChange={() => {}} />)
    expect(screen.getByTestId('cell-1-①')).toHaveAttribute('data-selected', 'true')
    expect(screen.getByTestId('cell-1-②')).toHaveAttribute('data-selected', 'false')
    expect(screen.getByTestId('cell-1-③')).toHaveAttribute('data-selected', 'true')
  })

  it('숫자키는 제자리에서 토글한다 — 다음 문항으로 넘어가지 않는다', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<ChoiceGrid count={2} values={{}} mode="input" onChange={onChange} />)

    const grid = screen.getByTestId('choice-grid')
    grid.focus()
    await user.keyboard('1')
    await user.keyboard('3')

    // 둘 다 1번 문항에 들어가야 한다 (자동 이동했다면 두 번째가 2번 문항으로 갔을 것)
    expect(onChange).toHaveBeenNthCalledWith(1, 1, '①')
    expect(onChange).toHaveBeenNthCalledWith(2, 1, '③')
  })

  it('Enter를 누르면 다음 문항으로 이동한다', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<ChoiceGrid count={2} values={{}} mode="input" onChange={onChange} />)

    const grid = screen.getByTestId('choice-grid')
    grid.focus()
    await user.keyboard('1')
    await user.keyboard('{Enter}')
    await user.keyboard('2')

    expect(onChange).toHaveBeenNthCalledWith(1, 1, '①')
    expect(onChange).toHaveBeenNthCalledWith(2, 2, '②')
  })

  it('결과 모드에서 다중 정답의 네 상태를 바르게 표시한다', () => {
    // 정답 ①③ / 학생 답 ①④ → ①맞음, ③놓침, ④틀림, ②아무것도 아님
    render(
      <ChoiceGrid count={1} values={{ 1: '①④' }} mode="result"
        answerKey={{ 1: '①③' }} onChange={() => {}} />
    )
    expect(screen.getByTestId('cell-1-①')).toHaveAttribute('data-result', 'correct')
    expect(screen.getByTestId('cell-1-③')).toHaveAttribute('data-result', 'answer')
    expect(screen.getByTestId('cell-1-④')).toHaveAttribute('data-result', 'wrong')
    expect(screen.getByTestId('cell-1-②')).toHaveAttribute('data-result', 'none')
  })
})
```

> 이 파일은 이미 `import { describe, it, expect, vi } from 'vitest'`를 하고 있으므로 import를 고칠 필요가 없다.

- [ ] **Step 2: 테스트를 돌려 실패를 확인**

Run: `npx vitest run src/components/ChoiceGrid.test.jsx`
Expected: FAIL — 토글 테스트가 `expected '' but got '②'` 류로 실패한다 (지금은 교체 동작)

- [ ] **Step 3: 구현 — import와 키보드**

`src/components/ChoiceGrid.jsx` 상단에 추가:

```js
import { toggleChoice } from '../utils/answerSet'
```

파일 머리 주석의 mode 설명을 갱신한다:

```js
// mode='input'  : 입력 가능 (클릭/숫자키 1~5로 토글, Enter·화살표로 이동)
```

`handleKeyDown`의 숫자키 분기를 바꾼다 — 토글만 하고 제자리에 머문다:

```js
    if (e.key >= '1' && e.key <= '5') {
      e.preventDefault()
      // 다중선택을 키보드로 넣을 수 있어야 해서 자동 이동을 하지 않는다.
      // 다음 문항으로는 Enter나 화살표로 옮긴다.
      onChange(focused, toggleChoice(values[focused], CHOICES[Number(e.key) - 1]))
    } else if (e.key === 'Enter' || e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      e.preventDefault()
      setFocused((n) => Math.min(count, n + 1))
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault()
      setFocused((n) => Math.max(1, n - 1))
    }
```

- [ ] **Step 4: 구현 — 판정과 클릭**

`cellResult`의 두 줄을 포함 여부로 바꾼다:

```js
    // 값에 그 선지가 들어 있는지로 본다 — 다중 정답이면 여러 글자가 담긴다
    const picked = Boolean(values[number]?.includes(choice))
    const isAnswer = Boolean(answerKey[number]?.includes(choice))
```

`cellClass`의 input 모드 판정도 같은 방식으로 바꾼다:

```js
    const picked = Boolean(values[number]?.includes(choice))
```

선지 버튼의 `data-selected`와 `onClick`을 바꾼다:

```js
                  data-selected={Boolean(values[number]?.includes(choice))}
                  data-result={cellResult(number, choice)}
                  onClick={(e) => {
                    e.stopPropagation()
                    if (mode !== 'input') return
                    setFocused(number)
                    onChange(number, toggleChoice(values[number], choice))
                  }}
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `npx vitest run src/components/ChoiceGrid.test.jsx`
Expected: PASS (기존 + 신규 6개)

- [ ] **Step 6: 전체 확인**

Run: `npx vitest run && npm run lint && npm run build`
Expected: **284 통과** (278 + 6), lint 0, 빌드 성공

- [ ] **Step 7: 커밋**

```bash
git add src/components/ChoiceGrid.jsx src/components/ChoiceGrid.test.jsx
git commit -m "feat: ChoiceGrid 선지 토글 — 다중선택 입력"
```

---

## Task 4: 과제 입력 완료 판정

**Files:**
- Modify: `src/components/homework/TeacherHomeworkCreate.jsx`
- Modify: `src/components/homework/StudentHomeworkView.jsx`

**Interfaces:**
- Consumes: Task 3의 토글 동작 (빈 문자열이 "미입력"을 뜻하게 됨)
- Produces: 없음

**왜 필요한가:** 지금은 `Object.keys(answers).length`로 입력된 문항 수를 센다. 토글로 선지를 다 끄면 값이 `''`로 남아 **키는 그대로 있다.** 그러면 아무것도 안 고른 문항이 입력된 것으로 세어져 저장·제출 버튼이 열린다.

- [ ] **Step 1: `TeacherHomeworkCreate.jsx`의 세는 방식 교체**

파일 상단(`emptyDay` 정의 근처)에 헬퍼를 추가한다:

```js
// 선지를 다 끄면 값이 빈 문자열로 남는다 — 키가 있다고 입력된 것으로 세면 안 된다
const answeredCount = (answers) => Object.values(answers).filter(Boolean).length
```

`canSave`의 판정을 바꾼다:

```js
      return dd.count > 0 && answeredCount(dd.answers) === dd.count
```

정답 입력 카운터도 바꾼다:

```jsx
                  <p className="text-xs text-ink-faint mb-2">정답 입력 ({answeredCount(d.answers)}/{d.count})</p>
```

- [ ] **Step 2: `StudentHomeworkView.jsx`의 세는 방식 교체**

`answeredNum` 계산을 바꾼다:

```js
    // 선지를 다 끄면 값이 빈 문자열로 남는다 — 키가 있다고 입력된 것으로 세면 안 된다
    const answeredNum = Object.values(answers).filter(Boolean).length
```

`allAnswered`와 카운터 표시는 `answeredNum`을 쓰므로 그대로 둔다.

- [ ] **Step 3: 전체 확인**

Run: `npx vitest run && npm run lint && npm run build`
Expected: **284 통과** (변동 없음), lint 0, 빌드 성공

기존 과제 화면 테스트(`TeacherHomeworkCreate.test.jsx`, `StudentHomeworkView.test.jsx`)가 그대로 통과해야 한다. 이 테스트들은 선지를 한 번씩만 눌러 답을 채우므로, 토글이어도 결과가 같다.

- [ ] **Step 4: 커밋**

```bash
git add src/components/homework/TeacherHomeworkCreate.jsx src/components/homework/StudentHomeworkView.jsx
git commit -m "fix: 선지를 다 끈 문항을 미입력으로 센다"
```

---

## Task 5: 테스트 화면 토글과 채점

**Files:**
- Modify: `src/pages/Tests.jsx` — `TakeView`(학생 답안), `CreateView`(교사 정답 지정), 채점

**Interfaces:**
- Consumes: `sameChoiceSet`, `toggleChoice` (Task 1)
- Produces: 없음 (마지막 태스크)

**주의:** `Tests.jsx`는 `ChoiceGrid`를 쓰지 않는다. `TakeView`와 `CreateView`가 각자 선지 버튼을 갖고 있어 **두 곳 모두** 고쳐야 한다. 파일이 크므로(800줄대) 해당 지점을 정확히 찾아 바꿀 것.

- [ ] **Step 1: import 추가**

`src/pages/Tests.jsx` 상단 import 목록에 추가:

```js
import { sameChoiceSet, toggleChoice } from '../utils/answerSet'
```

- [ ] **Step 2: 채점을 집합 비교로**

`onSubmit` 안의 `mcScores` 계산에서 `===` 비교를 바꾼다. 찾을 코드:

```js
              return { questionId: q.id, score: ans?.answer === q.answer ? q.points : 0 }
```

바꿀 코드:

```js
              // 다중 정답은 순서 무관 집합 비교 — 덜 골라도 더 골라도 0점이다
              return { questionId: q.id, score: sameChoiceSet(ans?.answer, q.answer) ? q.points : 0 }
```

- [ ] **Step 3: `TakeView` 학생 답안 버튼을 토글로**

`q.choices.map((c) => (...))` 안의 학생 답안 버튼을 찾는다 (`onClick={() => setAnswer(q.id, c)}`). 두 곳을 바꾼다:

```jsx
                      onClick={() => setAnswer(q.id, toggleChoice(myAnswer, c))}
                      className={`w-10 h-10 rounded-full text-base font-medium transition-colors ${
                        myAnswer.includes(c)
                          ? 'bg-ink text-white'
                          : 'bg-surface-alt text-ink-soft hover:bg-line-soft'
                      }`}
```

`myAnswer`는 이미 `?? ''`로 기본값이 있어 `.includes`가 안전하다.

- [ ] **Step 4: `CreateView` 교사 정답 지정 버튼을 토글로**

`updateQuestion(idx, 'answer', c)`를 호출하는 버튼을 찾는다. 두 곳을 바꾼다:

```jsx
                      onClick={() => updateQuestion(idx, 'answer', toggleChoice(q.answer, c))}
                      className={`w-8 h-8 rounded-full text-sm font-medium transition-colors ${
                        q.answer?.includes(c)
                          ? 'bg-ink text-white'
                          : 'bg-surface border border-line text-ink-soft hover:border-navy'
                      }`}
```

`q.answer`는 주관식 문항에서 `null`일 수 있으므로 `?.`를 반드시 쓸 것.

- [ ] **Step 5: 학생 결과 화면의 정답 표시 확인**

`TakeView` 밖, 학생이 채점 결과를 보는 화면에서 `q.answer`를 그대로 문자열로 출력하는 곳이 있는지 확인한다:

```bash
grep -n "q.answer" src/pages/Tests.jsx
```

문자열을 그냥 출력하는 곳은 `'①③'`이 그대로 보이므로 **그대로 두어도 읽힌다.** `===` 비교가 남아 있는 곳이 있으면 `sameChoiceSet`이나 `.includes`로 바꾸고, 바꾼 위치를 보고에 적을 것.

- [ ] **Step 6: 전체 확인**

Run: `npx vitest run && npm run lint && npm run build`
Expected: **284 통과**, lint 0, 빌드 성공

`Tests.test.jsx`가 하나라도 깨지면 기존 단일 선택 흐름을 건드린 것이다 — 멈추고 조사할 것.

- [ ] **Step 7: 남은 `===` 비교 검색**

Run:

```bash
grep -n "answer ===\|=== q.answer\|answer !==" src/pages/Tests.jsx src/utils/homework.js src/components/ChoiceGrid.jsx
```

Expected: 출력 없음. 남아 있으면 그 자리가 다중 정답에서 틀리게 판정하는 곳이다.

- [ ] **Step 8: 커밋**

```bash
git add src/pages/Tests.jsx
git commit -m "feat: 테스트 화면 선지 토글과 집합 채점"
```

---

## Task 6: 문서 갱신

**Files:**
- Modify: `MANUAL.md`

**Interfaces:**
- Consumes: Task 1~5
- Produces: 없음

- [ ] **Step 1: `MANUAL.md`의 과제·테스트 섹션에 안내 추가**

`MANUAL.md`를 읽어 과제 출제와 테스트 출제를 설명하는 섹션을 찾고, 각각에 아래 문단을 그 섹션의 문체에 맞춰 넣는다:

```markdown
> **정답이 여러 개인 문항**
>
> 선지를 여러 개 눌러 두면 그 문항의 정답이 여러 개가 됩니다(「모두 고르시오」형).
> 이미 켜진 선지를 다시 누르면 꺼집니다.
>
> 학생도 같은 방식으로 여러 개를 체크해 제출합니다. **정답을 전부 맞혀야 정답 처리**되며,
> 하나라도 빠뜨리거나 더 고르면 오답입니다.
>
> 키보드로 입력할 때는 숫자 1~5로 선지를 켜고 끄고, **Enter로 다음 문항**으로 넘어갑니다.
```

- [ ] **Step 2: 전체 확인**

Run: `npx vitest run && npm run lint`
Expected: **284 통과**, lint 0

- [ ] **Step 3: 커밋**

```bash
git add MANUAL.md
git commit -m "docs: 복수 정답 사용법 추가"
```

---

## Self-Review 결과

**스펙 커버리지 확인**

| 스펙 항목 | 담당 태스크 |
|---|---|
| 2. 「모두 고르시오」형, 부분점수 없음 | Task 1 (`sameChoiceSet`), Task 2·5 (채점) |
| 2. 과제와 테스트 둘 다 | Task 3 (과제), Task 5 (테스트) |
| 2. 모든 문항 토글식, 플래그 없음 | Task 3, Task 5 — 어디에도 플래그를 만들지 않는다 |
| 2. 숫자키 토글, Enter로 이동 | Task 3 Step 3 |
| 3. 이어 붙인 문자열, 마이그레이션 없음 | Task 1 — SQL 파일을 만들지 않는다 |
| 4. 비교 함수 단일 출처 | Task 1, Task 2·5가 그것만 쓴다 |
| 5. 토글 (세 곳) | Task 3 (ChoiceGrid), Task 5 (TakeView, CreateView) |
| 5. 선지 순서로 정렬 | Task 1 `toggleChoice` |
| 5. result 모드 포함 판정 | Task 3 Step 4 |
| 6. 입력 완료 판정 | Task 4 |
| 8. 테스트 계획 | Task 1·2·3의 테스트 단계 |

**타입 일관성 확인** — `sameChoiceSet(a, b) → boolean`과 `toggleChoice(current, choice) → string`을 Task 2·3·5가 같은 이름·같은 인자 순서로 쓴다. `onChange(number, nextValue)`의 `nextValue`는 Task 3에서 문자열이고, 호출부는 그대로 저장한다.

**플레이스홀더 스캔** — 모든 코드 단계에 실제 코드가 있고 TBD/TODO 없음. Task 5 Step 3·4는 파일이 커서 줄 번호 대신 찾을 코드를 명시했다.

**알려진 판단 지점** — Task 5 Step 5는 결과 화면에 `q.answer`를 문자열로 출력하는 곳을 확인하는 단계다. `'①③'`이 그대로 보이는 것은 읽는 데 문제가 없어 그대로 두되, `===` 비교가 남아 있으면 고치도록 했다. 실제로 무엇을 찾았는지 보고에 적게 한다.
