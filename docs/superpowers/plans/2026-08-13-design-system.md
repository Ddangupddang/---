# 디자인 시스템 리뉴얼 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 정보제공 사이트의 시각 언어(Pretendard + 본명조, 남색 계열, 4px 모서리, 1px 선)를 학생관리 전체에 적용하고, 색을 토큰 한 곳으로 모아 화면 간 편차를 없앤다.

**Architecture:** Tailwind v4의 `@theme` 디렉티브로 `src/index.css`에 색·글꼴 토큰을 선언하면 `bg-ink`, `text-danger` 같은 유틸리티가 자동 생성된다. 그 위에 순수 표시 컴포넌트 7종(`src/components/ui/`)을 올리고, 셸(Layout/Sidebar/Header/BottomNav) → 페이지 순으로 교체한다. 아래에서 위로 쌓아 각 단계가 독립적으로 동작하고 커밋된다.

**Tech Stack:** React 19 + Vite 8 + Tailwind CSS v4 (`@tailwindcss/vite`, 설정 파일 없음) · React Router · Vitest + @testing-library/react · lucide-react

## Global Constraints

- 설계 문서: `docs/superpowers/specs/2026-08-13-design-system-design.md` — 충돌 시 스펙이 기준
- **기능·문구·라우트·사이드바 메뉴 구조·화면 배치를 바꾸지 않는다.** 순수 시각 변경이다. 화면을 만지다 "이 버튼 위치도 바꿀까" 싶어져도 하지 않는다
- 색은 반드시 토큰 클래스(`bg-ink`, `text-danger` 등)를 쓴다. **hex를 직접 쓰지 않는다**
- 모서리: 뱃지 `rounded-sm`(2px), 그 외 전부 `rounded`(4px). `rounded-lg`/`rounded-xl`/`rounded-2xl`을 새로 쓰지 않는다
- **그림자를 쓰지 않는다.** 구분은 항상 `border border-line`
- 컴포넌트는 함수형, 파일명 PascalCase, 주석은 한글로 "왜"를 적는다
- `src/components/ui/*`는 순수 표시 컴포넌트다 — `useData`/`useAuth`를 쓰지 않고 props만 받는다
- 각 태스크 끝에서 **`npx vitest run`(전체) + `npm run lint`가 모두 통과**해야 커밋한다. 태스크 3 이후로는 `npm run build`도 통과해야 한다
- 기존 248개 테스트 중 색상 클래스명을 단언하는 4곳(태스크 2에서 처리) 외에는 **하나도 깨지면 안 된다.** 깨지면 시각 변경이 동작을 건드렸다는 신호이므로 멈추고 조사한다

---

## File Structure

| 파일 | 상태 | 책임 |
|---|---|---|
| `src/index.css` | 수정 | `@theme` 토큰(색·글꼴), 폰트 import, base 스타일 |
| `src/constants/colors.js` | **삭제** | 어디서도 import되지 않는 죽은 파일 |
| `CLAUDE.md` | 수정 | 색상 규칙을 토큰 기준으로 갱신 |
| `src/components/ChoiceGrid.jsx` | 수정 | 색 클래스 → 토큰, 선택 상태를 `data-selected`로 노출 |
| `src/components/ChoiceGrid.test.jsx` | 수정 | hex 단언 → 의미 단언 |
| `src/components/homework/TeacherHomeworkStatus.test.jsx` | 수정 | hex 단언 → 의미 단언 |
| `src/components/homework/TeacherHomeworkCreate.test.jsx` | 수정 | hex 단언 → 의미 단언 |
| `src/components/homework/TeacherHomeworkStatus.jsx` | 수정 | 오답 셀에 `data-wrong` 노출 |
| `src/components/ui/Button.jsx` + test | 신규 | 버튼 4종 |
| `src/components/ui/Badge.jsx` + test | 신규 | 상태 라벨 4종 |
| `src/components/ui/Card.jsx` | 신규 | 흰 배경 + 1px 테두리 |
| `src/components/ui/PageTitle.jsx` | 신규 | 세리프 제목 + 설명 |
| `src/components/ui/Alert.jsx` | 신규 | 경고 배너 |
| `src/components/ui/MiniBar.jsx` + test | 신규 | 각진 미니 막대 |
| `src/components/ui/DataTable.jsx` + test | 신규 | 표 껍데기 |
| `src/components/Layout.jsx` | 수정 | 배경색 토큰화 |
| `src/components/Sidebar.jsx` | 수정 | 밝은 사이드바 + 남색 선택 상태 |
| `src/components/Header.jsx` | 수정 | 토큰화 |
| `src/components/BottomNav.jsx` | 수정 | 토큰화 |
| `src/components/reports/WeeklyReportTable.jsx` | 수정 | 새 표 스타일 + MiniBar |
| `src/components/reports/WeeklyStudentDetail.jsx` | 수정 | 새 컴포넌트 적용 |
| 나머지 페이지 12개 | 수정 | 토큰·공통 컴포넌트 적용 (태스크 7~9) |

`src/components/ui/`를 새로 만드는 이유: 기존 `src/components/`에는 도메인 컴포넌트(VideoCard, ChoiceGrid 등)가 섞여 있다. 도메인을 모르는 순수 표시 부품은 따로 두어야 "이건 어디서든 써도 되는 것"이 분명해진다.

---

## Task 1: 디자인 토큰과 글꼴

**Files:**
- Modify: `src/index.css`
- Delete: `src/constants/colors.js`
- Modify: `CLAUDE.md`

**Interfaces:**
- Consumes: 없음 (첫 태스크)
- Produces: 아래 토큰 클래스들. 이후 모든 태스크가 이것만 쓴다.
  - 배경: `bg-ink` `bg-navy` `bg-navy-soft` `bg-danger` `bg-danger-soft` `bg-warn-soft` `bg-surface` `bg-surface-alt`
  - 글자: `text-ink` `text-ink-soft` `text-ink-mute` `text-ink-faint` `text-navy` `text-danger` `text-warn`
  - 테두리: `border-line` `border-line-soft`
  - 글꼴: `font-serif`(본명조) / 기본 sans(Pretendard)

- [ ] **Step 1: `src/index.css`를 통째로 교체**

```css
/* 폰트 @import는 반드시 맨 위에 둔다.
   @import "tailwindcss"는 Tailwind v4에서 실제 CSS 규칙으로 전개되므로,
   그 아래에 @import를 쓰면 "@import must precede all other statements" 에러가 난다. */
@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.css');
@import url('https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400;600;700;900&display=swap');

@import "tailwindcss";

/* 디자인 토큰 — 색을 바꾸려면 여기만 고친다.
   Tailwind v4는 @theme에 선언한 값으로 유틸리티 클래스를 자동 생성한다
   (--color-ink → bg-ink / text-ink / border-ink).
   정보제공 사이트(수문재-정보제공)와 같은 계열을 쓰되, 관리 도구라 채도를 낮췄다. */
@theme {
  --color-ink:         #22242A;  /* 본문 글자, 기본 버튼 배경 */
  --color-ink-soft:    #767884;  /* 보조 설명 */
  --color-ink-mute:    #8E9099;  /* 더 약한 보조 (문항 수, 날짜) */
  --color-ink-faint:   #B4B7C0;  /* 비활성, — (기록 없음) */

  --color-navy:        #2B3A55;  /* 강조·선택 상태·막대 */
  --color-navy-soft:   #E7EBF2;  /* 남색 계열 뱃지 배경 */

  --color-danger:      #A63A2C;  /* 결석·부진·경고 */
  --color-danger-soft: #F6E9E7;  /* 경고 뱃지·배너 배경 */
  --color-warn:        #8A6320;  /* 주의 (중간 점수) */
  --color-warn-soft:   #F4EEE2;  /* 채점중 뱃지 배경 */

  --color-surface:     #FFFFFF;  /* 본문 바탕, 카드 */
  --color-surface-alt: #F5F6F9;  /* 사이드바, 표 머리 */

  --color-line:        #DFE1E7;  /* 테두리 */
  --color-line-soft:   #EFF0F4;  /* 표 행 구분선 */

  --font-sans:  'Pretendard', system-ui, -apple-system, sans-serif;
  --font-serif: 'Noto Serif KR', serif;

  /* 모서리는 4px 하나로 통일한다. 뱃지만 2px(rounded-sm).
     표·숫자가 많은 관리 도구에서 각진 편이 정돈돼 보인다. */
  --radius-sm: 2px;
  --radius:    4px;
}

@layer base {
  body {
    font-family: var(--font-sans);
    background-color: var(--color-surface);
    color: var(--color-ink);
    letter-spacing: -0.012em;
  }
  /* 제목은 본명조. 나눔명조는 큰 글씨에서 획이 헐거워 인상이 약하다. */
  h1, h2 {
    font-family: var(--font-serif);
    font-weight: 700;
    letter-spacing: -0.03em;
  }
  /* 표의 숫자가 자릿수마다 흔들리지 않게 고정폭 숫자를 쓴다 */
  td, th { font-variant-numeric: tabular-nums; }
}
```

- [ ] **Step 2: 죽은 상수 파일 삭제**

```bash
git rm src/constants/colors.js
```

이 파일은 어디에서도 import되지 않는다. 확인:

```bash
grep -rn "constants/colors" src --include="*.jsx" --include="*.js"
```

Expected: 출력 없음. 출력이 있으면 삭제하지 말고 **BLOCKED로 보고**할 것.

- [ ] **Step 3: `CLAUDE.md`의 색상 규칙 교체**

`## 코딩 규칙` 섹션에서 이 줄을 찾아:

```markdown
- 색상은 constants/colors.js에서 불러와서 사용
```

이렇게 바꾼다:

```markdown
- 색상은 `src/index.css`의 `@theme` 토큰 클래스를 쓴다 (`bg-ink`, `text-danger`, `border-line` 등). hex를 직접 쓰지 않는다
- 모서리는 `rounded`(4px), 뱃지만 `rounded-sm`(2px). 그림자 대신 `border border-line`으로 구분한다
- 페이지 제목은 `font-serif`(본명조), 본문은 기본 sans(Pretendard)
```

- [ ] **Step 4: 빌드가 되는지 확인**

Run: `npm run build`
Expected: 성공. Tailwind가 `@theme` 토큰을 읽어 유틸리티를 생성한다.

실패하면 `@import` 순서 문제일 가능성이 높다 — 폰트 `@import` 두 줄이 `@import "tailwindcss"`보다 **위에** 있어야 한다.

- [ ] **Step 5: 기존 테스트가 안 깨졌는지 확인**

Run: `npx vitest run && npm run lint`
Expected: 248 통과, lint 에러 0

(이 시점에는 화면이 아직 옛 hex를 쓰므로 겉모습은 거의 그대로다. 토큰만 준비된 상태다.)

- [ ] **Step 6: 커밋**

```bash
git add src/index.css CLAUDE.md src/constants/colors.js
git commit -m "feat: 디자인 토큰 정의 (Pretendard + 본명조, 남색 계열, 4px)"
```

---

## Task 2: 색 단언 테스트를 의미 단언으로 교체

**Files:**
- Modify: `src/components/ChoiceGrid.jsx`
- Modify: `src/components/ChoiceGrid.test.jsx:34-38`
- Modify: `src/components/homework/TeacherHomeworkStatus.jsx`
- Modify: `src/components/homework/TeacherHomeworkStatus.test.jsx:124`
- Modify: `src/components/homework/TeacherHomeworkCreate.test.jsx:167-168`

**Interfaces:**
- Consumes: Task 1의 토큰 클래스
- Produces: `ChoiceGrid`의 셀이 `data-selected="true|false"`를 노출한다. `TeacherHomeworkStatus`의 셀이 오답일 때 `data-wrong="true"`를 노출한다.

**왜 이 태스크가 필요한가:** 지금 테스트 4곳이 `className`에 hex가 들어있는지 단언한다. 색을 토큰으로 바꾸면 클래스명이 달라져 깨진다. 그런데 이 테스트들의 원래 의도는 "색이 #2B2B2B인가"가 아니라 **"선택된 것으로 표시되는가"**다. 의미를 단언하도록 바꾸면 앞으로 색을 바꿔도 테스트가 깨지지 않는다.

- [ ] **Step 1: `ChoiceGrid.jsx`의 색 클래스를 토큰으로 바꾸고 상태를 속성으로 노출**

`cellClass` 함수를 이렇게 바꾼다:

```jsx
  // 한 선지 버튼의 색상 클래스 결정
  function cellClass(number, choice) {
    const picked = values[number] === choice
    if (mode === 'result') {
      const correctChoice = answerKey[number]
      if (choice === correctChoice && picked) return 'bg-navy text-white'              // 맞게 고름
      if (choice === correctChoice) return 'border-2 border-navy text-navy'            // 실제 정답 표시
      if (picked) return 'bg-danger text-white'                                        // 틀리게 고름
      return 'bg-surface-alt text-ink-faint'
    }
    return picked ? 'bg-ink text-white' : 'bg-surface-alt text-ink-soft hover:bg-line-soft'
  }
```

그리고 셀을 그리는 `<button>`(또는 해당 요소)에 `data-selected`를 추가한다. 셀 요소를 찾아 `data-testid={...}` 옆에 붙인다:

```jsx
  data-selected={values[number] === choice}
```

> 주의: `mode === 'result'`에서 "맞게 고름"이 초록이었는데 남색으로 바뀐다. 정답/오답을 초록/빨강으로 가르던 것을 남색/붉은색으로 바꾸는 것이며, 토큰 팔레트에 초록이 없기 때문이다. 스펙의 팔레트를 따른다.

- [ ] **Step 2: `ChoiceGrid.test.jsx`의 단언 교체**

`:34-38`의 테스트를 이렇게 바꾼다:

```jsx
  it('values에 담긴 선택값이 강조 표시된다', () => {
    render(<ChoiceGrid count={1} values={{ 1: '②' }} mode="input" onChange={() => {}} />)
    // 색이 아니라 "선택됨"이라는 의미를 단언한다 — 색은 디자인 토큰이 바뀌면 함께 바뀐다
    expect(screen.getByTestId('cell-1-②')).toHaveAttribute('data-selected', 'true')
    expect(screen.getByTestId('cell-1-①')).toHaveAttribute('data-selected', 'false')
  })
```

- [ ] **Step 3: `TeacherHomeworkStatus.jsx`에 오답 표시 속성 추가**

`:124` 테스트가 단언하는 셀을 찾아, 오답일 때 `data-wrong="true"`가 붙도록 한다. 셀을 그리는 곳에서 오답 판정 변수를 그대로 쓴다:

```jsx
  data-wrong={isWrong}
```

(변수명은 그 파일의 실제 판정 변수를 쓸 것. 오답 여부를 이미 계산하고 있으므로 새로 만들지 말 것.)

그리고 그 셀의 `bg-[#C0392B]`를 `bg-danger`로 바꾼다.

- [ ] **Step 4: `TeacherHomeworkStatus.test.jsx:124`의 단언 교체**

```jsx
    expect(screen.getByTestId('cell-2-⑤')).toHaveAttribute('data-wrong', 'true')
```

- [ ] **Step 5: `TeacherHomeworkCreate.test.jsx:167-168`의 단언 교체**

```jsx
    // 저장된 정답이 선택된 상태로 보인다
    expect(screen.getByTestId('cell-1-①')).toHaveAttribute('data-selected', 'true')
    expect(screen.getByTestId('cell-2-②')).toHaveAttribute('data-selected', 'true')
```

- [ ] **Step 6: 전체 확인**

Run: `npx vitest run && npm run lint && npm run build`
Expected: 248 통과, lint 0, 빌드 성공

- [ ] **Step 7: 커밋**

```bash
git add src/components/ChoiceGrid.jsx src/components/ChoiceGrid.test.jsx src/components/homework/TeacherHomeworkStatus.jsx src/components/homework/TeacherHomeworkStatus.test.jsx src/components/homework/TeacherHomeworkCreate.test.jsx
git commit -m "refactor: 색상 클래스 단언을 의미 단언(data-selected/data-wrong)으로 교체"
```

---

## Task 3: 공통 컴포넌트 — Button, Badge

**Files:**
- Create: `src/components/ui/Button.jsx`
- Create: `src/components/ui/Button.test.jsx`
- Create: `src/components/ui/Badge.jsx`
- Create: `src/components/ui/Badge.test.jsx`

**Interfaces:**
- Consumes: Task 1의 토큰 클래스
- Produces:
  - `<Button variant="primary|accent|ghost" type="button" disabled onClick className>{children}</Button>` — 기본 `variant="primary"`, 기본 `type="button"`
  - `<Badge tone="navy|danger|warn|neutral">{children}</Badge>` — 기본 `tone="neutral"`

- [ ] **Step 1: 실패하는 Button 테스트 작성**

`src/components/ui/Button.test.jsx`:

```jsx
// src/components/ui/Button.test.jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Button from './Button'

describe('Button', () => {
  it('내용을 보여주고 클릭이 전달된다', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<Button onClick={onClick}>저장</Button>)

    await user.click(screen.getByRole('button', { name: '저장' }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('disabled면 클릭이 전달되지 않는다', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<Button onClick={onClick} disabled>저장</Button>)

    const btn = screen.getByRole('button', { name: '저장' })
    expect(btn).toBeDisabled()
    await user.click(btn)
    expect(onClick).not.toHaveBeenCalled()
  })

  it('variant를 속성으로 노출한다 — 색이 아니라 종류를 검증한다', () => {
    render(<><Button variant="accent">제출</Button><Button variant="ghost">취소</Button></>)
    expect(screen.getByRole('button', { name: '제출' })).toHaveAttribute('data-variant', 'accent')
    expect(screen.getByRole('button', { name: '취소' })).toHaveAttribute('data-variant', 'ghost')
  })

  it('variant를 안 주면 primary다', () => {
    render(<Button>저장</Button>)
    expect(screen.getByRole('button')).toHaveAttribute('data-variant', 'primary')
  })

  it('기본 type은 button이다 — 폼 안에서 의도치 않게 제출되면 안 된다', () => {
    render(<Button>저장</Button>)
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button')
  })
})
```

- [ ] **Step 2: 테스트를 돌려 실패를 확인**

Run: `npx vitest run src/components/ui/Button.test.jsx`
Expected: FAIL — `Failed to resolve import "./Button"`

- [ ] **Step 3: Button 구현**

`src/components/ui/Button.jsx`:

```jsx
// src/components/ui/Button.jsx
// 모든 화면이 같은 버튼을 쓰게 하는 공통 부품.
// 색을 직접 쓰지 않고 variant로 고르게 해서, 나중에 색이 바뀌어도 여기만 고치면 된다.

const VARIANTS = {
  primary: 'bg-ink text-white hover:opacity-90',
  accent:  'bg-navy text-white hover:opacity-90',
  ghost:   'border border-line text-ink hover:bg-surface-alt',
}

export default function Button({
  variant = 'primary', type = 'button', disabled = false,
  onClick, className = '', children, ...rest
}) {
  return (
    <button
      type={type}
      data-variant={variant}
      disabled={disabled}
      onClick={onClick}
      className={`px-6 py-3 rounded text-[15px] font-bold transition-opacity
        disabled:opacity-40 disabled:cursor-not-allowed ${VARIANTS[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}
```

- [ ] **Step 4: Button 테스트 통과 확인**

Run: `npx vitest run src/components/ui/Button.test.jsx`
Expected: PASS (5 tests)

- [ ] **Step 5: 실패하는 Badge 테스트 작성**

`src/components/ui/Badge.test.jsx`:

```jsx
// src/components/ui/Badge.test.jsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Badge from './Badge'

describe('Badge', () => {
  it('내용을 보여주고 tone을 속성으로 노출한다', () => {
    render(<Badge tone="danger">지각제출</Badge>)
    const el = screen.getByText('지각제출')
    expect(el).toHaveAttribute('data-tone', 'danger')
  })

  it('tone을 안 주면 neutral이다', () => {
    render(<Badge>미제출</Badge>)
    expect(screen.getByText('미제출')).toHaveAttribute('data-tone', 'neutral')
  })

  it('네 가지 tone을 모두 그릴 수 있다', () => {
    render(
      <>
        <Badge tone="navy">제출완료</Badge>
        <Badge tone="danger">지각제출</Badge>
        <Badge tone="warn">채점중</Badge>
        <Badge tone="neutral">미제출</Badge>
      </>
    )
    expect(screen.getByText('제출완료')).toHaveAttribute('data-tone', 'navy')
    expect(screen.getByText('지각제출')).toHaveAttribute('data-tone', 'danger')
    expect(screen.getByText('채점중')).toHaveAttribute('data-tone', 'warn')
    expect(screen.getByText('미제출')).toHaveAttribute('data-tone', 'neutral')
  })
})
```

- [ ] **Step 6: 테스트를 돌려 실패를 확인**

Run: `npx vitest run src/components/ui/Badge.test.jsx`
Expected: FAIL — `Failed to resolve import "./Badge"`

- [ ] **Step 7: Badge 구현**

`src/components/ui/Badge.jsx`:

```jsx
// src/components/ui/Badge.jsx
// 상태 라벨. 알약(둥근) 대신 네모(2px)로 두어 관리 도구다운 인상을 준다.

const TONES = {
  navy:    'bg-navy-soft text-navy',
  danger:  'bg-danger-soft text-danger',
  warn:    'bg-warn-soft text-warn',
  neutral: 'bg-surface-alt text-ink-soft',
}

export default function Badge({ tone = 'neutral', className = '', children }) {
  return (
    <span
      data-tone={tone}
      className={`inline-block px-2 py-[3px] rounded-sm text-xs font-bold ${TONES[tone]} ${className}`}
    >
      {children}
    </span>
  )
}
```

- [ ] **Step 8: 전체 확인**

Run: `npx vitest run && npm run lint && npm run build`
Expected: 256 통과 (248 + 8), lint 0, 빌드 성공

- [ ] **Step 9: 커밋**

```bash
git add src/components/ui/Button.jsx src/components/ui/Button.test.jsx src/components/ui/Badge.jsx src/components/ui/Badge.test.jsx
git commit -m "feat: 공통 컴포넌트 Button, Badge"
```

---

## Task 4: 공통 컴포넌트 — Card, PageTitle, Alert, MiniBar

**Files:**
- Create: `src/components/ui/Card.jsx`
- Create: `src/components/ui/PageTitle.jsx`
- Create: `src/components/ui/Alert.jsx`
- Create: `src/components/ui/MiniBar.jsx`
- Create: `src/components/ui/MiniBar.test.jsx`

**Interfaces:**
- Consumes: Task 1의 토큰 클래스
- Produces:
  - `<Card className>{children}</Card>`
  - `<PageTitle title="주간 리포트" lead="한 반의 한 주를 한눈에 봅니다" />` — `lead`는 선택
  - `<Alert tone="danger|info">{children}</Alert>` — 기본 `tone="danger"`
  - `<MiniBar value={3} max={5} tone="navy|danger" />` — 기본 `tone="navy"`. `max`가 0이면 렌더하지 않음(`null`)

- [ ] **Step 1: 실패하는 MiniBar 테스트 작성**

MiniBar만 계산 로직이 있어 테스트한다. Card/PageTitle/Alert은 마크업뿐이라 태스크 6~9의 화면 테스트로 검증된다.

`src/components/ui/MiniBar.test.jsx`:

```jsx
// src/components/ui/MiniBar.test.jsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import MiniBar from './MiniBar'

describe('MiniBar', () => {
  it('비율을 퍼센트 폭으로 그린다', () => {
    render(<MiniBar value={3} max={5} />)
    expect(screen.getByTestId('minibar-fill')).toHaveStyle({ width: '60%' })
  })

  it('max가 0이면 아무것도 그리지 않는다 — 0으로 나눌 수 없다', () => {
    const { container } = render(<MiniBar value={0} max={0} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('value가 max보다 커도 100%를 넘지 않는다', () => {
    render(<MiniBar value={7} max={5} />)
    expect(screen.getByTestId('minibar-fill')).toHaveStyle({ width: '100%' })
  })

  it('tone을 속성으로 노출한다', () => {
    render(<MiniBar value={1} max={5} tone="danger" />)
    expect(screen.getByTestId('minibar-fill')).toHaveAttribute('data-tone', 'danger')
  })
})
```

- [ ] **Step 2: 테스트를 돌려 실패를 확인**

Run: `npx vitest run src/components/ui/MiniBar.test.jsx`
Expected: FAIL — `Failed to resolve import "./MiniBar"`

- [ ] **Step 3: MiniBar 구현**

`src/components/ui/MiniBar.jsx`:

```jsx
// src/components/ui/MiniBar.jsx
// 표에서 숫자 옆에 붙는 각진 미니 막대.
// 숫자를 읽지 않고 훑어도 비율이 보이게 해서, 문제 학생을 빨리 찾게 한다.

const TONES = { navy: 'bg-navy', danger: 'bg-danger' }

export default function MiniBar({ value, max, tone = 'navy' }) {
  // 배정이 0이면 비율 자체가 성립하지 않는다
  if (!max) return null
  const pct = Math.min(100, Math.round((value / max) * 100))
  return (
    <span className="inline-block w-[52px] h-[5px] bg-line align-middle ml-2.5">
      <span
        data-testid="minibar-fill"
        data-tone={tone}
        className={`block h-full ${TONES[tone]}`}
        style={{ width: `${pct}%` }}
      />
    </span>
  )
}
```

- [ ] **Step 4: MiniBar 테스트 통과 확인**

Run: `npx vitest run src/components/ui/MiniBar.test.jsx`
Expected: PASS (4 tests)

- [ ] **Step 5: Card 구현**

`src/components/ui/Card.jsx`:

```jsx
// src/components/ui/Card.jsx
// 흰 배경 + 1px 테두리. 그림자를 쓰지 않는 것이 이 디자인의 규칙이다.

export default function Card({ className = '', children }) {
  return (
    <div className={`bg-surface border border-line rounded ${className}`}>
      {children}
    </div>
  )
}
```

- [ ] **Step 6: PageTitle 구현**

`src/components/ui/PageTitle.jsx`:

```jsx
// src/components/ui/PageTitle.jsx
// 페이지 제목. 본명조(font-serif)를 쓰는 곳은 여기와 로고뿐이다.

export default function PageTitle({ title, lead }) {
  return (
    <div className="mb-6">
      <h1 className="font-serif text-3xl font-bold text-ink">{title}</h1>
      {lead && <p className="text-sm text-ink-soft mt-1.5">{lead}</p>}
    </div>
  )
}
```

- [ ] **Step 7: Alert 구현**

`src/components/ui/Alert.jsx`:

```jsx
// src/components/ui/Alert.jsx
// 경고·안내 배너. 왼쪽 세로선으로 눈에 띄게 한다.

const TONES = {
  danger: 'bg-danger-soft border-danger text-danger',
  info:   'bg-navy-soft border-navy text-navy',
}

export default function Alert({ tone = 'danger', className = '', children }) {
  return (
    <div
      data-tone={tone}
      className={`px-4 py-3 rounded-sm border-l-[3px] text-sm font-semibold ${TONES[tone]} ${className}`}
    >
      {children}
    </div>
  )
}
```

- [ ] **Step 8: 전체 확인**

Run: `npx vitest run && npm run lint && npm run build`
Expected: 260 통과 (256 + 4), lint 0, 빌드 성공

- [ ] **Step 9: 커밋**

```bash
git add src/components/ui/Card.jsx src/components/ui/PageTitle.jsx src/components/ui/Alert.jsx src/components/ui/MiniBar.jsx src/components/ui/MiniBar.test.jsx
git commit -m "feat: 공통 컴포넌트 Card, PageTitle, Alert, MiniBar"
```

---

## Task 5: 공통 컴포넌트 — DataTable

**Files:**
- Create: `src/components/ui/DataTable.jsx`
- Create: `src/components/ui/DataTable.test.jsx`

**Interfaces:**
- Consumes: Task 1의 토큰, Task 4의 `Card`
- Produces:
  - `<DataTable columns={[{key, label, align}]} rows={[...]} rowKey={(row) => key} renderCell={(row, col) => node} isAlert={(row) => bool} onRowClick={(row) => void} empty="문구" />`
  - `align`은 `'left'`(기본) 또는 `'right'`
  - `isAlert`가 참인 행은 왼쪽에 붉은 세로선이 붙고 `data-alert="true"`를 노출한다
  - `rows`가 비면 `empty` 문구만 그린다

- [ ] **Step 1: 실패하는 테스트 작성**

`src/components/ui/DataTable.test.jsx`:

```jsx
// src/components/ui/DataTable.test.jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DataTable from './DataTable'

const COLUMNS = [
  { key: 'name',  label: '이름' },
  { key: 'score', label: '점수', align: 'right' },
]
const ROWS = [
  { id: 1, name: '김민서', score: 88, bad: false },
  { id: 2, name: '최예진', score: 55, bad: true },
]

function renderTable(overrides = {}) {
  const props = {
    columns: COLUMNS,
    rows: ROWS,
    rowKey: (r) => r.id,
    renderCell: (r, c) => (c.key === 'name' ? r.name : `${r.score}점`),
    isAlert: (r) => r.bad,
    empty: '등록된 학생이 없습니다.',
    ...overrides,
  }
  render(<DataTable {...props} />)
  return props
}

describe('DataTable', () => {
  it('헤더와 셀을 그린다', () => {
    renderTable()
    expect(screen.getByText('이름')).toBeInTheDocument()
    expect(screen.getByText('점수')).toBeInTheDocument()
    expect(screen.getByText('김민서')).toBeInTheDocument()
    expect(screen.getByText('88점')).toBeInTheDocument()
  })

  it('경고 행에 표시를 남긴다 — 문제 학생이 멀리서도 보여야 한다', () => {
    renderTable()
    expect(screen.getByTestId('row-2')).toHaveAttribute('data-alert', 'true')
    expect(screen.getByTestId('row-1')).toHaveAttribute('data-alert', 'false')
  })

  it('행을 누르면 그 행으로 onRowClick이 불린다', async () => {
    const user = userEvent.setup()
    const onRowClick = vi.fn()
    renderTable({ onRowClick })

    await user.click(screen.getByText('최예진'))
    expect(onRowClick).toHaveBeenCalledWith(ROWS[1])
  })

  it('onRowClick이 없으면 눌러도 아무 일이 없다', async () => {
    const user = userEvent.setup()
    renderTable({ onRowClick: undefined })
    await user.click(screen.getByText('최예진'))
    // 예외 없이 지나가면 통과
    expect(screen.getByText('최예진')).toBeInTheDocument()
  })

  it('행이 없으면 안내 문구만 보여준다', () => {
    renderTable({ rows: [] })
    expect(screen.getByText('등록된 학생이 없습니다.')).toBeInTheDocument()
    expect(screen.queryByText('이름')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: 테스트를 돌려 실패를 확인**

Run: `npx vitest run src/components/ui/DataTable.test.jsx`
Expected: FAIL — `Failed to resolve import "./DataTable"`

- [ ] **Step 3: DataTable 구현**

`src/components/ui/DataTable.jsx`:

```jsx
// src/components/ui/DataTable.jsx
// 표 껍데기. 헤더 스타일·행 구분선·경고 행 세로선을 한곳에서 정해
// 화면마다 표 생김새가 달라지지 않게 한다. 내용은 renderCell이 정한다.

export default function DataTable({
  columns, rows, rowKey, renderCell, isAlert, onRowClick, empty,
}) {
  if (rows.length === 0) {
    return <p className="text-center text-ink-faint py-12">{empty}</p>
  }

  return (
    <div className="border border-line rounded overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key}
                className={`bg-surface-alt text-ink-soft font-bold text-[11.5px] tracking-wider
                  px-3.5 py-3 border-b border-line whitespace-nowrap
                  ${c.align === 'right' ? 'text-right' : 'text-left'}`}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const alert = Boolean(isAlert?.(row))
            return (
              <tr key={rowKey(row)}
                data-testid={`row-${rowKey(row)}`}
                data-alert={alert}
                onClick={() => onRowClick?.(row)}
                className={`border-b border-line-soft last:border-0
                  ${onRowClick ? 'cursor-pointer hover:bg-surface-alt' : ''}`}>
                {columns.map((c, i) => (
                  <td key={c.key}
                    data-testid={`cell-${rowKey(row)}-${c.key}`}
                    className={`px-3.5 py-4 text-base
                      ${c.align === 'right' ? 'text-right' : 'text-left'}
                      ${i === 0 && alert ? 'shadow-[inset_3px_0_0_var(--color-danger)]' : ''}`}>
                    {renderCell(row, c)}
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/components/ui/DataTable.test.jsx`
Expected: PASS (5 tests)

- [ ] **Step 5: 전체 확인**

Run: `npx vitest run && npm run lint && npm run build`
Expected: 265 통과 (260 + 5), lint 0, 빌드 성공

- [ ] **Step 6: 커밋**

```bash
git add src/components/ui/DataTable.jsx src/components/ui/DataTable.test.jsx
git commit -m "feat: 공통 컴포넌트 DataTable"
```

---

## Task 6: 셸 적용 — Layout, Sidebar, Header, BottomNav

**Files:**
- Modify: `src/components/Layout.jsx:14`
- Modify: `src/components/Sidebar.jsx` (여러 곳)
- Modify: `src/components/Header.jsx` (여러 곳)
- Modify: `src/components/BottomNav.jsx:18,26`

**Interfaces:**
- Consumes: Task 1의 토큰
- Produces: 없음 (화면만 바뀐다)

**핵심 변경:** 사이드바가 **짙은 차콜 → 밝은 회색**으로 바뀐다. 글자색이 흰색 계열에서 먹색 계열로 전부 뒤집히므로, `text-white/55` 같은 클래스를 하나도 남기지 말 것.

- [ ] **Step 1: `Layout.jsx`의 배경색 교체**

`:14`의 `bg-[#F4F3EE]`를 `bg-surface`로 바꾼다:

```jsx
    <div className="flex min-h-screen bg-surface">
```

- [ ] **Step 2: `Sidebar.jsx`의 컨테이너 두 곳 교체**

데스크탑 사이드바(`:149`):

```jsx
      <aside className="hidden md:flex flex-col w-56 min-h-screen bg-surface-alt border-r border-line px-3 py-5">
```

모바일 드로어(`:162`):

```jsx
      <aside className={`fixed top-0 left-0 h-full w-64 bg-surface-alt border-r border-line px-3 py-5 z-50 flex flex-col md:hidden
        transform transition-transform duration-300 ease-in-out overflow-y-auto
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
```

- [ ] **Step 3: `Sidebar.jsx`의 로고 영역 교체**

`:55`의 `bg-white rounded-xl`을 바꾼다 — 배경이 이미 밝으므로 흰 상자가 필요 없다:

```jsx
        <Link to="/dashboard" onClick={onClose} className="block px-1 py-1 hover:opacity-80 transition-opacity">
```

- [ ] **Step 4: `Sidebar.jsx`의 섹션 라벨 교체 (2곳)**

`:64`와 `:92`의 `text-white/30`을 바꾼다:

```jsx
            <p className="px-3 mb-1 text-[10px] font-semibold tracking-widest text-ink-faint uppercase">
```

- [ ] **Step 5: `Sidebar.jsx`의 메뉴 항목 교체 (2곳)**

`:74-78`과 `:102-106`의 `className` 함수를 바꾼다. 선택 항목이 **진한 남색 알약**이 된다:

```jsx
                    `flex items-center gap-2.5 px-3 py-2.5 rounded text-[15px] transition-colors ${
                      isActive
                        ? 'bg-navy text-white font-bold'
                        : 'text-ink-soft hover:bg-line-soft'
                    }`
```

- [ ] **Step 6: `Sidebar.jsx`의 하단 사용자 영역 교체**

`:119`의 구분선:

```jsx
      <div className="border-t border-line pt-3 mt-3">
```

`:120`의 이름:

```jsx
        <div className="px-3 py-1 text-ink-mute text-xs mb-1">{user?.name}</div>
```

`:125-127`의 비밀번호 변경 링크:

```jsx
            `w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded transition-colors ${
              isActive ? 'text-ink bg-line-soft' : 'text-ink-mute hover:bg-line-soft'
            }`
```

`:135`의 로그아웃 버튼:

```jsx
          className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-ink-mute hover:bg-line-soft rounded transition-colors"
```

- [ ] **Step 7: `Header.jsx` 교체**

`:26`:

```jsx
    <header className="flex items-center justify-between h-14 px-4 bg-surface border-b border-line">
```

`:32`:

```jsx
            className="md:hidden text-ink hover:text-ink-soft"
```

`:43` — 헤더 제목은 작아서 세리프를 쓰지 않는다(페이지 안의 `PageTitle`이 세리프를 담당):

```jsx
          <h1 className="text-base font-bold text-ink">{title}</h1>
```

`:50`:

```jsx
          <span className="text-sm text-ink-mute">{title}</span>
```

`:52`:

```jsx
        <span className="text-sm text-ink-soft">{user?.name}</span>
```

`:55`:

```jsx
          <Link to="/change-password" className="text-ink-mute hover:text-ink-soft">
```

`:62`:

```jsx
          className={`text-xs text-ink-mute hover:text-ink-soft ${!isStudent ? 'md:hidden' : ''}`}
```

- [ ] **Step 8: `BottomNav.jsx` 교체**

`:18` — 학생 하단 바는 짙은 먹색을 유지한다. 모바일에서 흰 배경 위 흰 바는 경계가 사라진다:

```jsx
    <nav className="fixed bottom-0 left-0 right-0 h-14 bg-ink flex items-center z-50">
```

`:26`:

```jsx
            isActive ? 'text-white' : 'text-white/45 hover:text-white/70'
```

- [ ] **Step 9: 남은 hex가 없는지 확인**

Run:

```bash
grep -n "#[0-9A-Fa-f]\{6\}" src/components/Layout.jsx src/components/Sidebar.jsx src/components/Header.jsx src/components/BottomNav.jsx
```

Expected: 출력 없음

- [ ] **Step 10: 전체 확인**

Run: `npx vitest run && npm run lint && npm run build`
Expected: 265 통과, lint 0, 빌드 성공

- [ ] **Step 11: 커밋**

```bash
git add src/components/Layout.jsx src/components/Sidebar.jsx src/components/Header.jsx src/components/BottomNav.jsx
git commit -m "feat: 셸(레이아웃·사이드바·헤더·하단바)에 디자인 토큰 적용"
```

---

## Task 7: 주간 리포트 화면 적용

**Files:**
- Modify: `src/components/reports/WeeklyReportTable.jsx`
- Modify: `src/components/reports/WeeklyReportTable.test.jsx`
- Modify: `src/components/reports/WeeklyStudentDetail.jsx`
- Modify: `src/pages/WeeklyReport.jsx`

**Interfaces:**
- Consumes: Task 3~5의 `Button` `Badge` `Card` `PageTitle` `MiniBar` `DataTable`
- Produces: 없음

**주의:** 이 화면의 테스트는 셀 값을 `data-testid`(`att-2`, `test-2`, `naesin-2`, `jeongsi-2`)로 읽는다. `DataTable`은 `cell-{rowKey}-{colKey}` 형식으로 testid를 만들므로 **테스트의 testid를 새 형식에 맞춰 고쳐야 한다.** 값 자체의 단언은 그대로 둘 것.

- [ ] **Step 1: `WeeklyReportTable.jsx`를 DataTable 기반으로 교체**

```jsx
// src/components/reports/WeeklyReportTable.jsx
// 주간 리포트 — 한 반의 한 주를 표 하나로. 표시만 하고 데이터는 받아 쓴다.
import { StickyNote } from 'lucide-react'
import DataTable from '../ui/DataTable'
import Badge from '../ui/Badge'
import MiniBar from '../ui/MiniBar'

// 출석: (출석+지각)/전체. 지각·결석은 뒤에 별기해 감춰지지 않게 한다.
function AttendanceCell({ att }) {
  if (!att) return <span className="text-ink-faint">-</span>
  const notes = []
  if (att.late > 0)   notes.push(`지${att.late}`)
  if (att.absent > 0) notes.push(`결${att.absent}`)
  const attended = att.present + att.late
  return (
    <span>
      <span className={att.absent > 0 ? 'text-danger font-bold' : 'font-semibold'}>
        {attended}/{att.counted}
      </span>
      {notes.length > 0 && <span className="ml-1 text-[13px] text-ink-mute">{notes.join(' ')}</span>}
      <MiniBar value={attended} max={att.counted} tone={att.absent > 0 ? 'danger' : 'navy'} />
    </span>
  )
}

// 테스트: 채점된 게 없으면 0점처럼 보이지 않게 상태만 보여준다.
function TestCell({ summary }) {
  if (!summary) return <span className="text-ink-faint">-</span>
  const suffix = summary.count > 1 ? ` (${summary.count}건)` : ''
  if (summary.average == null) {
    return <Badge tone="warn">채점중{suffix}</Badge>
  }
  const tone = summary.average < 60 ? 'text-danger font-bold'
    : summary.average < 80 ? 'text-warn font-bold' : 'font-semibold'
  return <span className={tone}>{summary.average}점{suffix}</span>
}

// 과제: 제출 회차 / 배정 회차 + 정답률
function HomeworkCell({ hw }) {
  if (!hw) return <span className="text-ink-faint">-</span>
  const low = hw.submitRate < 70
  return (
    <span>
      <span className={low ? 'text-danger font-bold' : 'font-semibold'}>
        {hw.submitted}/{hw.total}
      </span>
      {hw.correctRate != null && (
        <span className="ml-1 text-[13px] text-ink-mute">{hw.correctRate}%</span>
      )}
      <MiniBar value={hw.submitted} max={hw.total} tone={low ? 'danger' : 'navy'} />
    </span>
  )
}

const COLUMNS = [
  { key: 'name',    label: '이름' },
  { key: 'att',     label: '출석',     align: 'right' },
  { key: 'test',    label: '테스트',   align: 'right' },
  { key: 'naesin',  label: '내신과제', align: 'right' },
  { key: 'jeongsi', label: '정시과제', align: 'right' },
]

export default function WeeklyReportTable({ rows, noteStudentIds, onSelect }) {
  return (
    <DataTable
      columns={COLUMNS}
      rows={rows}
      rowKey={(row) => row.student.id}
      isAlert={(row) => row.flags.length > 0}
      onRowClick={onSelect ? (row) => onSelect(row.student) : undefined}
      empty="이 반에 등록된 학생이 없습니다."
      renderCell={(row, col) => {
        if (col.key === 'name') return (
          <span>
            <span className="font-bold text-[16.5px] text-ink">{row.student.name}</span>
            {noteStudentIds.has(row.student.id) && (
              <StickyNote className="inline-block ml-1.5 w-3.5 h-3.5 text-navy"
                data-testid={`note-mark-${row.student.id}`} />
            )}
          </span>
        )
        if (col.key === 'att')     return <AttendanceCell att={row.attendance} />
        if (col.key === 'test')    return <TestCell summary={row.testSummary} />
        if (col.key === 'naesin')  return <HomeworkCell hw={row.naesin} />
        return <HomeworkCell hw={row.jeongsi} />
      }}
    />
  )
}
```

- [ ] **Step 2: `WeeklyReportTable.test.jsx`의 testid 형식 수정**

파일 상단의 `cell` 헬퍼를 새 형식에 맞춘다:

```jsx
// DataTable이 만드는 셀 testid 형식: cell-{학생id}-{열key}
const cell = (studentId, key) => screen.getByTestId(`cell-${studentId}-${key}`).textContent
```

이 헬퍼를 쓰는 단언들은 그대로 두되, `flag-2`를 단언하는 곳이 있으면 행 속성 단언으로 바꾼다:

```jsx
    expect(screen.getByTestId('row-2')).toHaveAttribute('data-alert', 'true')
```

- [ ] **Step 3: 테스트를 돌려 확인**

Run: `npx vitest run src/components/reports/WeeklyReportTable.test.jsx`
Expected: PASS (6 tests). 실패하면 단언하는 문자열이 실제 렌더 결과와 다른 것이므로, **기댓값을 함부로 낮추지 말고** 어느 쪽이 옳은지 판단해 보고할 것.

- [ ] **Step 4: `WeeklyStudentDetail.jsx`의 색·모서리 교체**

`Card`와 `Badge`, `Button`, `Alert`을 import하고 다음을 바꾼다:

- 각 `<section className="bg-white rounded-xl p-4 shadow-sm mb-3">` → `<Card className="p-4 mb-3">`
- 제목 `<h2 className="text-lg font-bold text-[#2B2B2B] mb-4">` → `<h2 className="font-serif text-2xl font-bold text-ink mb-4">`
- `text-gray-700` → `text-ink-soft`, `text-gray-400` → `text-ink-faint`, `text-gray-500` → `text-ink-mute`
- 결석 글자 `text-[#C0392B]` → `text-danger`
- 미응시 `<span className="text-[#C0392B]">미응시</span>` → `<Badge tone="danger">미응시</Badge>`
- 채점중 `<span className="text-gray-500">채점중</span>` → `<Badge tone="warn">채점중</Badge>`
- 코멘트 textarea의 `focus:ring-[#5B8FD4]` → `focus:ring-navy`, `rounded-lg` → `rounded`
- 에러 문구 `<p className="text-sm text-[#C0392B] bg-[#C0392B]/10 rounded-lg px-3 py-2 mt-2">` → `<Alert tone="danger" className="mt-2">`
- 성공 문구 `text-[#5B8FD4]` → `text-navy`
- 저장 버튼 → `<Button variant="primary" onClick={handleSave} disabled={saving} className="w-full mt-3">`

- [ ] **Step 5: `WeeklyReport.jsx`의 색·모서리 교체**

- `<h1 className="text-xl font-bold text-[#2B2B2B] mb-4">주간 리포트</h1>` → `<PageTitle title="주간 리포트" lead="한 반의 한 주를 한눈에 봅니다" />`
- 주 이동 버튼 `className="p-1.5 rounded-lg bg-white shadow-sm"` → `className="w-9 h-9 flex items-center justify-center rounded border border-line bg-surface text-ink-soft"`
- 주 라벨 `text-[#2B2B2B]` → `text-ink`, 크기를 `text-base font-bold`로
- 반 선택 `<select>`의 `rounded-lg` → `rounded`, `border-gray-200` → `border-line`
- 접근 차단 문구의 `text-gray-400` → `text-ink-faint`

- [ ] **Step 6: 남은 hex 확인**

Run:

```bash
grep -n "#[0-9A-Fa-f]\{6\}" src/components/reports/*.jsx src/pages/WeeklyReport.jsx
```

Expected: 출력 없음

- [ ] **Step 7: 전체 확인**

Run: `npx vitest run && npm run lint && npm run build`
Expected: 265 통과, lint 0, 빌드 성공

- [ ] **Step 8: 커밋**

```bash
git add src/components/reports src/pages/WeeklyReport.jsx
git commit -m "feat: 주간 리포트에 디자인 시스템 적용"
```

---

## Task 8: 과제·출결·학생 관리 화면 적용

**Files:**
- Modify: `src/components/homework/*.jsx` (7개 — test 파일 제외)
- Modify: `src/pages/Homework.jsx`
- Modify: `src/pages/Attendance.jsx`
- Modify: `src/pages/Students.jsx`
- Modify: `src/components/BulkAccountModal.jsx`

**Interfaces:**
- Consumes: Task 3~5의 공통 컴포넌트
- Produces: 없음

**치환 규칙** — 아래 표대로 기계적으로 바꾼다. 애매하면 바꾸지 말고 보고할 것.

| 기존 | 교체 |
|---|---|
| `bg-[#2B2B2B]` | `bg-ink` |
| `text-[#2B2B2B]` | `text-ink` |
| `bg-[#5B8FD4]` | `bg-navy` |
| `text-[#5B8FD4]` | `text-navy` |
| `bg-[#5B8FD4]/10`, `/15`, `/20` | `bg-navy-soft` |
| `bg-[#C0392B]` | `bg-danger` |
| `text-[#C0392B]` | `text-danger` |
| `bg-[#C0392B]/10` | `bg-danger-soft` |
| `bg-[#F4F3EE]` | `bg-surface-alt` |
| `text-gray-700` | `text-ink-soft` |
| `text-gray-600` | `text-ink-soft` |
| `text-gray-500` | `text-ink-mute` |
| `text-gray-400` | `text-ink-faint` |
| `border-gray-200`, `border-gray-100` | `border-line` |
| `bg-gray-100` | `bg-surface-alt` |
| `rounded-xl`, `rounded-2xl`, `rounded-lg` | `rounded` |
| `shadow-sm`, `shadow-md`, `hover:shadow-md` | 삭제하고 `border border-line` 추가 |
| `bg-green-100 text-green-700` | `<Badge tone="navy">` |
| `bg-green-500` | `bg-navy` |
| `text-green-600` | `text-navy` |

추가로:
- 페이지 최상단 제목(`<h1 className="text-xl font-bold ...">`)은 `<PageTitle title="..." />`로 교체
- 주요 액션 버튼은 `<Button>`으로 교체 (제출/저장은 `variant="primary"`, 보조는 `variant="ghost"`)
- 상태 뱃지는 `<Badge>`로 교체

- [ ] **Step 1: 과제 컴포넌트 7개 치환**

대상: `StudentHomeworkCard.jsx` `StudentHomeworkView.jsx` `TeacherHomeworkCreate.jsx` `TeacherHomeworkStatus.jsx` `HomeworkReport.jsx` `DaySubmissionList.jsx` `DayQuestionStats.jsx` `SolutionViewer.jsx`

`StudentHomeworkView.jsx`의 BADGE 상수는 이렇게 바꾼다:

```jsx
const BADGE = {
  none: { label: '미제출', tone: 'neutral' },
  done: { label: '제출완료', tone: 'navy' },
  late: { label: '지각제출', tone: 'danger' },
}
```

사용처는 `<Badge tone={badge.tone}>{badge.label}</Badge>`로 바꾼다.

- [ ] **Step 2: 과제 화면 테스트 확인**

Run: `npx vitest run src/components/homework`
Expected: 전부 통과. 뱃지 문구를 찾는 단언(`getByText('제출완료')`)은 `Badge`가 같은 문구를 그리므로 그대로 통과해야 한다.

- [ ] **Step 3: `Homework.jsx`, `Attendance.jsx`, `Students.jsx`, `BulkAccountModal.jsx` 치환**

같은 규칙을 적용한다.

- [ ] **Step 4: 남은 hex 확인**

Run:

```bash
grep -n "#[0-9A-Fa-f]\{6\}" src/components/homework/*.jsx src/pages/Homework.jsx src/pages/Attendance.jsx src/pages/Students.jsx src/components/BulkAccountModal.jsx | grep -v test
```

Expected: 출력 없음

- [ ] **Step 5: 전체 확인**

Run: `npx vitest run && npm run lint && npm run build`
Expected: 265 통과, lint 0, 빌드 성공

- [ ] **Step 6: 커밋**

```bash
git add src/components/homework src/pages/Homework.jsx src/pages/Attendance.jsx src/pages/Students.jsx src/components/BulkAccountModal.jsx
git commit -m "feat: 과제·출결·학생 관리 화면에 디자인 시스템 적용"
```

---

## Task 9: 나머지 화면 적용과 잔여 정리

**Files:**
- Modify: `src/pages/Dashboard.jsx` `Grades.jsx` `Tests.jsx` `Videos.jsx` `QnA.jsx` `Notices.jsx` `Reports.jsx` `Staff.jsx` `Login.jsx` `ChangePassword.jsx`
- Modify: `src/components/VideoCard.jsx` `VideoForm.jsx` `VideoPlayer.jsx` `CommentSection.jsx` `ChoiceGrid.jsx` `ProtectedRoute.jsx` `reports/ReportHomeworkChecks.jsx`

**Interfaces:**
- Consumes: Task 3~5의 공통 컴포넌트
- Produces: 없음 (마지막 태스크)

- [ ] **Step 1: Task 8과 같은 치환 규칙을 나머지 파일 전부에 적용**

Task 8의 치환 표를 그대로 쓴다. `Tests.jsx`(42곳)와 `Students.jsx`는 이미 Task 8에서 했으므로 제외.

`ChoiceGrid.jsx`는 Task 2에서 색을 이미 바꿨으므로, 남은 `rounded-lg` 등 모서리만 정리한다.

- [ ] **Step 2: 저장소 전체에 남은 hex 검색**

Run:

```bash
grep -rn "#[0-9A-Fa-f]\{6\}" src --include="*.jsx" | grep -v "\.test\." | grep -v "index.css"
```

Expected: 출력 없음.

남은 것이 있으면 하나씩 판단한다 — 토큰으로 바꿀 수 있으면 바꾸고, 토큰에 없는 색이 꼭 필요하면 **바꾸지 말고 어떤 색이 왜 필요한지 보고**할 것 (토큰을 늘려야 할 수도 있다).

- [ ] **Step 3: 남은 그림자·둥근 모서리 검색**

Run:

```bash
grep -rn "shadow-\|rounded-xl\|rounded-2xl\|rounded-lg\|rounded-full" src --include="*.jsx" | grep -v "\.test\."
```

Expected: 출력 없음.

예외: 아바타·아이콘 원형처럼 `rounded-full`이 의미상 필요한 곳은 남겨도 된다. 남긴다면 보고에 이유를 적을 것.

- [ ] **Step 4: 전체 확인**

Run: `npx vitest run && npm run lint && npm run build`
Expected: 265 통과, lint 0, 빌드 성공

- [ ] **Step 5: 개발 서버로 눈으로 확인**

Run: `npm run dev`

브라우저에서 확인할 것:
1. 사이드바가 밝은 회색이고 현재 메뉴만 진한 남색인가
2. 페이지 제목이 본명조로 보이는가 (글꼴이 로드되기 전엔 기본 세리프로 보인다 — 새로고침 후 확인)
3. 주간 리포트 표에서 문제 학생 행 왼쪽에 붉은 세로선이 보이는가
4. 학생 화면(모바일 크기로 창을 줄여서)의 하단 바가 짙은 먹색인가
5. 어느 화면에도 옛 아이보리 배경(`#F4F3EE`)이 남아 있지 않은가

문제가 있으면 고치고 다시 확인한다.

- [ ] **Step 6: 커밋**

```bash
git add src
git commit -m "feat: 나머지 화면에 디자인 시스템 적용, 잔여 하드코딩 색 정리"
```

---

## Self-Review 결과

**스펙 커버리지 확인**

| 스펙 항목 | 담당 태스크 |
|---|---|
| 2. 확정 사항 (글꼴·모서리·사이드바·표·크기·채도·그림자) | Task 1(토큰), 6(셸), 7(표) |
| 3.1 색 토큰 14개 | Task 1 Step 1 |
| 3.2 글꼴 (Pretendard + 본명조) | Task 1 Step 1 |
| 3.3 크기 | Task 1(base), 4(PageTitle), 5(DataTable) |
| 3.4 형태 (4px/2px, 그림자 없음) | Task 1(토큰), 8·9(치환 규칙) |
| `colors.js` 삭제 + CLAUDE.md 갱신 | Task 1 Step 2~3 |
| 4. 공통 컴포넌트 7종 | Task 3(Button/Badge), 4(Card/PageTitle/Alert/MiniBar), 5(DataTable) |
| 5. 적용 순서 5단계 | Task 1 → 3~5 → 6 → 7~8 → 9 |
| 6. 테스트 영향 (색 단언 4곳) | Task 2 |
| 9. 성공 기준 | Task 9 Step 2~3(하드코딩 0), Step 5(눈 확인) |

**타입 일관성 확인** — `Button`의 `variant`(primary/accent/ghost), `Badge`의 `tone`(navy/danger/warn/neutral), `MiniBar`의 `tone`(navy/danger), `Alert`의 `tone`(danger/info), `DataTable`의 `columns/rows/rowKey/renderCell/isAlert/onRowClick/empty` — Task 7~9에서 쓰는 이름이 Task 3~5의 정의와 일치한다. `DataTable`이 만드는 testid는 `row-{key}`와 `cell-{key}-{colKey}`이고 Task 7 Step 2가 같은 형식을 단언한다.

**플레이스홀더 스캔** — 모든 코드 단계에 실제 코드 또는 정확한 치환 규칙이 있고 TBD/TODO 없음.

**알려진 판단 지점** — Task 2에서 정답/오답 색이 초록/빨강 → 남색/붉은색으로 바뀐다. 토큰 팔레트에 초록이 없기 때문이며 스펙의 팔레트를 따른 결과다. 실제로 보고 초록이 꼭 필요하다고 판단되면 토큰을 늘리는 것이 맞다 — 그 경우 hex를 직접 쓰지 말고 `--color-success`를 추가할 것.
