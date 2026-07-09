# 학생 계정 일괄 자동 생성 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 계정이 없는 학생들의 로그인 계정을 `이름+전화뒤4자리` 아이디로 한 번에 자동 생성한다.

**Architecture:** 화면 아이디(한글)와 Supabase 인증 이메일(ASCII)을 공유 유틸 `loginEmail()`로 분리한다. 순수 함수(`studentUsername`)로 아이디 생성 규칙을 만들고, `DataContext`가 학생 계정 유무를 로드하며, 일괄 생성 모달이 기존 `/api/create-student-account`를 학생마다 순차 호출한다.

**Tech Stack:** React(함수형) + Tailwind, Supabase Auth/DB, Vitest + Testing Library, Vercel serverless(api/).

## Global Constraints

- 컴포넌트는 함수형, 색상은 하드코딩된 기존 팔레트 유지(#2B2B2B, #5B8FD4, #C0392B), 한글 주석.
- Supabase 인증 이메일 로컬파트는 **반드시 ASCII** 여야 한다(한글 거부됨).
- Supabase 비밀번호는 **최소 6자리**. 초기 비밀번호 = `123456`.
- 기존 ASCII 아이디 계정은 로그인이 깨지면 안 된다(하위호환).
- 전화 우선순위: 학생 본인 → 학부모 → 둘 다 없으면 건너뜀.
- 동명이인+같은 뒷4자리 충돌 시 `-2`, `-3` 접미사.

---

### Task 1: `loginEmail` 공유 유틸

**Files:**
- Create: `src/utils/loginEmail.js`
- Test: `src/utils/loginEmail.test.js`

**Interfaces:**
- Produces: `loginEmail(username: string): string` — 아이디를 Supabase 인증용 이메일로 변환. ASCII 아이디는 그대로, 비ASCII(한글)는 UTF-8 바이트를 hex로 인코딩.

- [ ] **Step 1: 실패하는 테스트 작성**

```js
// src/utils/loginEmail.test.js
import { describe, it, expect } from 'vitest'
import { loginEmail } from './loginEmail'

describe('loginEmail', () => {
  it('ASCII 아이디는 그대로 이메일 로컬파트가 된다 (하위호환)', () => {
    expect(loginEmail('admin')).toBe('admin@soomoonjae.com')
    expect(loginEmail('student1')).toBe('student1@soomoonjae.com')
  })

  it('한글 아이디는 hex로 인코딩된다 (ASCII만 남김)', () => {
    const email = loginEmail('홍길동5678')
    expect(email.endsWith('@soomoonjae.com')).toBe(true)
    expect(email).toMatch(/^[a-f0-9]+@soomoonjae\.com$/) // 로컬파트가 전부 hex
  })

  it('결정적이다 — 같은 아이디는 항상 같은 이메일', () => {
    expect(loginEmail('홍길동5678')).toBe(loginEmail('홍길동5678'))
  })

  it('접미사가 붙은 한글 아이디도 처리된다', () => {
    expect(loginEmail('홍길동5678-2')).toMatch(/^[a-f0-9]+@soomoonjae\.com$/)
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run src/utils/loginEmail.test.js`
Expected: FAIL — "Failed to resolve import './loginEmail'"

- [ ] **Step 3: 최소 구현**

```js
// src/utils/loginEmail.js
// 아이디 → Supabase 인증용 이메일. 계정 생성과 로그인 양쪽에서 동일하게 사용해야 한다.
// 한글은 이메일 로컬파트로 못 쓰므로 UTF-8 바이트를 hex로 인코딩해 항상 ASCII로 만든다.
export function loginEmail(username) {
  const asciiSafe = /^[a-zA-Z0-9._-]+$/.test(username)
  const local = asciiSafe
    ? username
    : Array.from(new TextEncoder().encode(username))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')
  return `${local}@soomoonjae.com`
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/utils/loginEmail.test.js`
Expected: PASS (4 tests)

- [ ] **Step 5: 커밋**

```bash
git add src/utils/loginEmail.js src/utils/loginEmail.test.js
git commit -m "feat: 아이디→인증 이메일 변환 유틸 loginEmail 추가"
```

---

### Task 2: `studentUsername` 아이디 생성 유틸

**Files:**
- Create: `src/utils/studentUsername.js`
- Test: `src/utils/studentUsername.test.js`

**Interfaces:**
- Consumes: 학생 객체 `{ id, name, classId, phone, parentPhone }`
- Produces:
  - `last4(phone: string): string` — 숫자만 추출한 뒤 4자리, 없으면 `''`
  - `studentLast4(student): string` — 본인 전화 우선, 없으면 학부모 전화의 뒤 4자리
  - `uniqueUsername(base: string, taken: Set<string>): string` — 충돌 시 `-2`,`-3`…
  - `planStudentAccounts(students: object[], existingUsernames: string[]): {studentId, name, classId, username, skip, reason}[]`

- [ ] **Step 1: 실패하는 테스트 작성**

```js
// src/utils/studentUsername.test.js
import { describe, it, expect } from 'vitest'
import { last4, studentLast4, uniqueUsername, planStudentAccounts } from './studentUsername'

describe('last4', () => {
  it('전화번호 숫자 뒤 4자리를 반환', () => {
    expect(last4('010-1234-5678')).toBe('5678')
  })
  it('전화번호가 없으면 빈 문자열', () => {
    expect(last4('')).toBe('')
    expect(last4(null)).toBe('')
  })
})

describe('studentLast4', () => {
  it('본인 전화를 우선 사용', () => {
    expect(studentLast4({ phone: '010-1111-2222', parentPhone: '010-3333-4444' })).toBe('2222')
  })
  it('본인 전화가 없으면 학부모 전화 사용', () => {
    expect(studentLast4({ phone: '', parentPhone: '010-3333-4444' })).toBe('4444')
  })
  it('둘 다 없으면 빈 문자열', () => {
    expect(studentLast4({ phone: '', parentPhone: '' })).toBe('')
  })
})

describe('uniqueUsername', () => {
  it('충돌 없으면 그대로', () => {
    expect(uniqueUsername('홍길동5678', new Set())).toBe('홍길동5678')
  })
  it('충돌 시 -2, -3 접미사', () => {
    const taken = new Set(['홍길동5678', '홍길동5678-2'])
    expect(uniqueUsername('홍길동5678', taken)).toBe('홍길동5678-3')
  })
})

describe('planStudentAccounts', () => {
  it('이름+전화뒤4자리로 아이디를 만든다', () => {
    const plan = planStudentAccounts(
      [{ id: 1, name: '홍길동', classId: 1, phone: '010-1234-5678', parentPhone: '' }], [])
    expect(plan[0]).toMatchObject({ studentId: 1, username: '홍길동5678', skip: false })
  })
  it('전화 없는 학생은 건너뛴다', () => {
    const plan = planStudentAccounts(
      [{ id: 2, name: '김철수', classId: 1, phone: '', parentPhone: '' }], [])
    expect(plan[0]).toMatchObject({ studentId: 2, skip: true, reason: '전화번호 없음', username: null })
  })
  it('배치 내부 동명이인+같은4자리는 접미사로 유일화', () => {
    const plan = planStudentAccounts([
      { id: 1, name: '홍길동', classId: 1, phone: '010-0000-5678', parentPhone: '' },
      { id: 2, name: '홍길동', classId: 2, phone: '010-9999-5678', parentPhone: '' },
    ], [])
    expect(plan.map((p) => p.username)).toEqual(['홍길동5678', '홍길동5678-2'])
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run src/utils/studentUsername.test.js`
Expected: FAIL — "Failed to resolve import './studentUsername'"

- [ ] **Step 3: 최소 구현**

```js
// src/utils/studentUsername.js
// 학생 계정 아이디 = 이름 + 전화 뒤 4자리. 전화는 본인 우선, 없으면 학부모.

// 전화번호에서 숫자만 뽑아 뒤 4자리
export function last4(phone) {
  if (!phone) return ''
  const digits = String(phone).replace(/\D/g, '')
  return digits.length >= 4 ? digits.slice(-4) : ''
}

// 본인 전화 우선, 없으면 학부모 전화의 뒤 4자리
export function studentLast4(student) {
  return last4(student.phone) || last4(student.parentPhone)
}

// taken에 없을 때까지 -2, -3 … 접미사 부여
export function uniqueUsername(base, taken) {
  if (!taken.has(base)) return base
  let n = 2
  while (taken.has(`${base}-${n}`)) n++
  return `${base}-${n}`
}

// 계정 없는 학생 목록 → 생성 계획.
// existingUsernames: 이미 존재하는 아이디(중복 방지용). 현재는 [] 전달(교차 충돌은 API가 최종 검증).
export function planStudentAccounts(students, existingUsernames) {
  const taken = new Set(existingUsernames)
  return students.map((s) => {
    const l4 = studentLast4(s)
    if (!l4) {
      return { studentId: s.id, name: s.name, classId: s.classId, username: null, skip: true, reason: '전화번호 없음' }
    }
    const username = uniqueUsername(`${s.name}${l4}`, taken)
    taken.add(username)
    return { studentId: s.id, name: s.name, classId: s.classId, username, skip: false, reason: '' }
  })
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/utils/studentUsername.test.js`
Expected: PASS (모든 케이스)

- [ ] **Step 5: 커밋**

```bash
git add src/utils/studentUsername.js src/utils/studentUsername.test.js
git commit -m "feat: 학생 아이디 생성 규칙 유틸 studentUsername 추가"
```

---

### Task 3: 로그인/계정생성이 `loginEmail`을 쓰도록 수정 (하위호환)

**Files:**
- Modify: `src/context/AuthContext.jsx` (login, changePassword의 이메일 계산)
- Modify: `api/create-student-account.js:53` (이메일 계산)
- Test: 기존 `src/context/AuthContext.test.jsx` 회귀 통과

**Interfaces:**
- Consumes: `loginEmail` (Task 1)

- [ ] **Step 1: AuthContext에 loginEmail 적용**

`src/context/AuthContext.jsx` 상단 import 블록에 추가:

```js
import { loginEmail } from '../utils/loginEmail'
```

`login` 함수의 이메일 계산 교체:

```js
// 변경 전
  const login = async (username, password) => {
    const email = `${username.trim()}@soomoonjae.com`
// 변경 후
  const login = async (username, password) => {
    const email = loginEmail(username.trim())
```

`changePassword` 함수의 이메일 계산 교체:

```js
// 변경 전
      const email = `${user.username}@soomoonjae.com`
// 변경 후
      const email = loginEmail(user.username)
```

- [ ] **Step 2: 계정 생성 API에 loginEmail 적용**

`api/create-student-account.js` 상단 import에 추가:

```js
import { loginEmail } from '../src/utils/loginEmail.js'
```

이메일 계산 교체:

```js
// 변경 전 (53행 부근)
  const email = `${username}@soomoonjae.com`
// 변경 후
  const email = loginEmail(username)
```

- [ ] **Step 3: 기존 로그인 테스트가 여전히 통과하는지 확인**

Run: `npx vitest run src/context/AuthContext.test.jsx`
Expected: PASS (5 tests) — ASCII 아이디(admin/student1)는 `loginEmail`이 그대로 `admin@…`을 만들어 mock의 `email.split('@')[0]` 로직과 일치.

- [ ] **Step 4: 린트·빌드 확인**

Run: `npm run lint && npm run build`
Expected: 둘 다 성공, 0 problems.

- [ ] **Step 5: 커밋**

```bash
git add src/context/AuthContext.jsx api/create-student-account.js
git commit -m "refactor: 로그인·계정생성 이메일 계산을 loginEmail 유틸로 통일"
```

---

### Task 4: `DataContext`에 학생 계정 목록 로드

**Files:**
- Modify: `src/context/DataContext.jsx` (상태 추가, load 쿼리 추가, value 노출, 새로고침 함수)

**Interfaces:**
- Produces (context value):
  - `studentAccountIds: number[]` — 계정이 있는 학생의 student_id 목록
  - `refreshStudentAccounts(): Promise<void>` — 일괄 생성 후 목록 갱신

- [ ] **Step 1: 상태 추가**

`src/context/DataContext.jsx` 의 `DataProvider` 상태 선언부(159행 `dataLoading` 근처)에 추가:

```js
  const [studentAccountIds, setStudentAccountIds] = useState([])
```

- [ ] **Step 2: load()의 Promise.all에 쿼리 추가**

`Promise.all([...])` 배열 마지막(`homework_submissions` 쿼리 뒤)에 항목 추가하고, 구조분해 배열에도 `saRes`를 추가한다:

```js
      const [cRes, sRes, aRes, gRes, qRes, nRes, rRes, pRes, vRes, vcRes, tRes, subRes, hwRes, hwSubRes, saRes] =
        await Promise.all([
          // ...기존 14개 쿼리 그대로...
          supabase.from('homework_submissions').select('*').order('submitted_at', { ascending: false }),
          supabase.from('profiles').select('student_id').eq('role', 'student'),
        ])
```

set 블록(196행 `setDataLoading(false)` 직전)에 추가:

```js
      if (!saRes.error && saRes.data) setStudentAccountIds(saRes.data.map((r) => r.student_id).filter(Boolean))
```

- [ ] **Step 3: 새로고침 함수 추가**

`deleteClass` 함수 아래(698행 `return (` 직전)에 추가:

```js
  // 일괄 계정 생성 후 학생 계정 목록 다시 로드
  async function refreshStudentAccounts() {
    const { data, error } = await supabase.from('profiles').select('student_id').eq('role', 'student')
    if (!error && data) setStudentAccountIds(data.map((r) => r.student_id).filter(Boolean))
  }
```

- [ ] **Step 4: context value에 노출**

`<DataContext.Provider value={{ ... }}>` 의 value 객체에서 `staffProfiles,` 줄을 다음으로 교체:

```js
      staffProfiles, studentAccountIds, refreshStudentAccounts,
```

- [ ] **Step 5: 린트·빌드·기존 테스트 확인**

Run: `npm run lint && npm run build && npx vitest run`
Expected: 린트 0 problems, 빌드 성공, 테스트 전부 통과(기존 53개 + Task1·2 신규).

- [ ] **Step 6: 커밋**

```bash
git add src/context/DataContext.jsx
git commit -m "feat: DataContext에 학생 계정 목록(studentAccountIds) 로드 추가"
```

---

### Task 5: 일괄 생성 모달 컴포넌트

**Files:**
- Create: `src/constants/account.js`
- Create: `src/components/BulkAccountModal.jsx`
- Test: `src/components/BulkAccountModal.test.jsx`

**Interfaces:**
- Consumes: `planStudentAccounts` (Task 2), `DEFAULT_STUDENT_PASSWORD`, `supabase`
- Produces: `<BulkAccountModal students getClassName onClose onDone />` (default export)
  - `students`: 계정 없는 학생 배열
  - `getClassName(classId): string`
  - `onClose()`, `onDone()` 콜백

- [ ] **Step 1: 초기 비밀번호 상수 생성**

```js
// src/constants/account.js
// 학생 계정 초기 비밀번호. 첫 로그인 시 변경을 유도한다.
// Supabase는 비밀번호 최소 6자리를 요구하므로 6자리 이상이어야 한다.
export const DEFAULT_STUDENT_PASSWORD = '123456'
```

- [ ] **Step 2: 실패하는 컴포넌트 테스트 작성**

```jsx
// src/components/BulkAccountModal.test.jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import BulkAccountModal from './BulkAccountModal'

// supabase는 미리보기 단계에서 호출되지 않지만, import 시점 오류 방지를 위해 모킹
vi.mock('../lib/supabase', () => ({ supabase: { auth: { getSession: () => Promise.resolve({ data: { session: null } }) } } }))

const getClassName = (id) => (id === 1 ? '수능국어A반' : '기타반')

describe('BulkAccountModal — 미리보기', () => {
  it('전화 있는 학생의 생성될 아이디를 보여준다', () => {
    render(
      <BulkAccountModal
        students={[{ id: 1, name: '홍길동', classId: 1, phone: '010-1234-5678', parentPhone: '' }]}
        getClassName={getClassName} onClose={() => {}} onDone={() => {}} />
    )
    expect(screen.getByText('홍길동5678')).toBeInTheDocument()
  })

  it('전화 없는 학생은 건너뜀으로 표시', () => {
    render(
      <BulkAccountModal
        students={[{ id: 2, name: '김철수', classId: 1, phone: '', parentPhone: '' }]}
        getClassName={getClassName} onClose={() => {}} onDone={() => {}} />
    )
    expect(screen.getByText('전화번호 없음')).toBeInTheDocument()
  })
})
```

- [ ] **Step 3: 테스트 실패 확인**

Run: `npx vitest run src/components/BulkAccountModal.test.jsx`
Expected: FAIL — "Failed to resolve import './BulkAccountModal'"

- [ ] **Step 4: 컴포넌트 구현**

```jsx
// src/components/BulkAccountModal.jsx
// 계정 없는 학생들의 로그인 계정을 한 번에 생성하는 모달.
import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { planStudentAccounts } from '../utils/studentUsername'
import { DEFAULT_STUDENT_PASSWORD } from '../constants/account'

export default function BulkAccountModal({ students, getClassName, onClose, onDone }) {
  const plan      = planStudentAccounts(students, [])
  const creatable = plan.filter((p) => !p.skip)
  const skipped   = plan.filter((p) => p.skip)

  const [phase,    setPhase]    = useState('preview') // preview | running | done
  const [progress, setProgress] = useState(0)
  const [results,  setResults]  = useState([])        // [{ name, username, ok, error }]

  async function handleCreate() {
    setPhase('running')
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    const out = []
    for (let i = 0; i < creatable.length; i++) {
      const p = creatable[i]
      try {
        const res = await fetch('/api/create-student-account', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            username:  p.username,
            password:  DEFAULT_STUDENT_PASSWORD,
            name:      p.name,
            classId:   p.classId,
            studentId: p.studentId,
          }),
        })
        const data = await res.json()
        out.push({ name: p.name, username: p.username, ok: res.ok, error: data.error })
      } catch {
        out.push({ name: p.name, username: p.username, ok: false, error: '네트워크 오류' })
      }
      setProgress(i + 1)
    }
    setResults(out)
    setPhase('done')
    onDone?.()
  }

  const successCount = results.filter((r) => r.ok).length
  const failCount    = results.filter((r) => !r.ok).length

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-5 w-full max-w-md max-h-[85vh] overflow-y-auto">
        {phase === 'preview' && (
          <>
            <h2 className="font-bold text-[#2B2B2B] mb-1">계정 일괄 생성</h2>
            <p className="text-sm text-gray-400 mb-4">
              계정이 없는 학생 {creatable.length}명의 계정을 만듭니다. (초기 비밀번호: {DEFAULT_STUDENT_PASSWORD})
            </p>
            <div className="border rounded-lg divide-y mb-3">
              {creatable.map((p) => (
                <div key={p.studentId} className="flex justify-between items-center px-3 py-2 text-sm">
                  <span className="text-[#2B2B2B]">{p.name} <span className="text-gray-400">· {getClassName(p.classId)}</span></span>
                  <span className="font-mono text-[#5B8FD4]">{p.username}</span>
                </div>
              ))}
              {creatable.length === 0 && (
                <div className="px-3 py-4 text-center text-gray-400 text-sm">생성할 학생이 없습니다.</div>
              )}
            </div>
            {skipped.length > 0 && (
              <div className="mb-3">
                <p className="text-xs text-gray-500 mb-1">건너뜀 {skipped.length}명</p>
                <div className="border rounded-lg divide-y">
                  {skipped.map((p) => (
                    <div key={p.studentId} className="flex justify-between px-3 py-2 text-sm">
                      <span className="text-[#2B2B2B]">{p.name}</span>
                      <span className="text-gray-400">{p.reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={onClose} className="flex-1 py-2 rounded-lg border text-sm text-gray-600">취소</button>
              <button onClick={handleCreate} disabled={creatable.length === 0}
                className="flex-1 py-2 rounded-lg bg-[#2B2B2B] text-white text-sm disabled:opacity-40">
                {creatable.length}명 생성
              </button>
            </div>
          </>
        )}

        {phase === 'running' && (
          <div className="py-8 text-center">
            <p className="text-sm text-gray-500 mb-2">계정 생성 중… ({progress}/{creatable.length})</p>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div className="bg-[#5B8FD4] h-2 rounded-full transition-all"
                style={{ width: `${creatable.length ? (progress / creatable.length) * 100 : 0}%` }} />
            </div>
          </div>
        )}

        {phase === 'done' && (
          <>
            <h2 className="font-bold text-[#2B2B2B] mb-1">생성 완료</h2>
            <p className="text-sm text-gray-400 mb-4">성공 {successCount}명 · 실패 {failCount}명</p>
            <div className="border rounded-lg divide-y mb-4 max-h-60 overflow-y-auto">
              {results.map((r, i) => (
                <div key={i} className="flex justify-between items-center px-3 py-2 text-sm">
                  <span className="text-[#2B2B2B]">{r.name} <span className="font-mono text-gray-400">{r.username}</span></span>
                  {r.ok
                    ? <span className="text-green-600">완료</span>
                    : <span className="text-[#C0392B]" title={r.error}>실패</span>}
                </div>
              ))}
            </div>
            <button onClick={onClose} className="w-full py-2 rounded-lg bg-[#2B2B2B] text-white text-sm">닫기</button>
          </>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `npx vitest run src/components/BulkAccountModal.test.jsx`
Expected: PASS (2 tests)

- [ ] **Step 6: 커밋**

```bash
git add src/constants/account.js src/components/BulkAccountModal.jsx src/components/BulkAccountModal.test.jsx
git commit -m "feat: 학생 계정 일괄 생성 모달 BulkAccountModal 추가"
```

---

### Task 6: `Students.jsx`에 일괄 생성 버튼·모달 연결

**Files:**
- Modify: `src/pages/Students.jsx` (import, useData 구조분해, 상태, 버튼, 모달 렌더)

**Interfaces:**
- Consumes: `studentAccountIds`, `refreshStudentAccounts` (Task 4), `BulkAccountModal` (Task 5)

- [ ] **Step 1: import 추가**

`src/pages/Students.jsx` 상단 import 블록에 추가:

```js
import BulkAccountModal from '../components/BulkAccountModal'
```

- [ ] **Step 2: useData 구조분해에 값 추가**

기존:
```js
  const {
    classes, students: studentList,
    addStudent, updateStudent, deleteStudent, bulkAddStudents, bulkDeleteStudents,
    addClass, updateClass, deleteClass,
    reorderClasses, reorderStudents,
  } = useData()
```
변경:
```js
  const {
    classes, students: studentList,
    addStudent, updateStudent, deleteStudent, bulkAddStudents, bulkDeleteStudents,
    addClass, updateClass, deleteClass,
    reorderClasses, reorderStudents,
    studentAccountIds, refreshStudentAccounts,
  } = useData()
```

- [ ] **Step 3: 상태 + 대상 계산 추가**

`계정 생성 모달` 상태 선언부(`const [accountLoading, …]` 줄) 아래에 추가:

```js
  // 일괄 계정 생성 모달
  const [showBulkModal, setShowBulkModal] = useState(false)
  // 계정이 없는 학생 목록
  const accountlessStudents = studentList.filter((s) => !studentAccountIds.includes(s.id))
```

- [ ] **Step 4: 툴바에 버튼 추가**

`선택 삭제` 버튼(275-280행) 바로 아래, `isAdmin` 블록의 `</>` 직전에 추가:

```jsx
                <button
                  onClick={() => setShowBulkModal(true)}
                  className="px-4 py-2 bg-white border border-gray-200 text-sm rounded-lg hover:bg-gray-50 text-gray-600"
                >
                  계정 일괄 생성 ({accountlessStudents.length})
                </button>
```

- [ ] **Step 5: 모달 렌더 추가**

`계정 생성 모달`(`{accountModal && ( … )}`) 렌더 블록 아래에 추가:

```jsx
      {/* 계정 일괄 생성 모달 */}
      {showBulkModal && (
        <BulkAccountModal
          students={accountlessStudents}
          getClassName={getClassName}
          onClose={() => setShowBulkModal(false)}
          onDone={refreshStudentAccounts}
        />
      )}
```

- [ ] **Step 6: 린트·빌드·전체 테스트 확인**

Run: `npm run lint && npm run build && npx vitest run`
Expected: 린트 0 problems, 빌드 성공, 테스트 전부 통과.

- [ ] **Step 7: 실제 동작 확인 (수동)**

`npm run dev` → 관리자로 로그인 → 학생 관리 → "계정 일괄 생성 (N)" 클릭 → 미리보기에서 `이름+전화4자리` 아이디 확인 → 생성 → 결과 리포트 확인 → 목록 버튼 숫자가 줄었는지 확인.

- [ ] **Step 8: 커밋**

```bash
git add src/pages/Students.jsx
git commit -m "feat: 학생 관리에 계정 일괄 생성 버튼·모달 연결"
```

---

## 참고: 배포 시 확인 (구현 후)

- **RLS 정책**: 관리자/교사가 `profiles`에서 `role='student'` 행을 SELECT할 수 있어야 `studentAccountIds`가 채워진다. 안 되면 Supabase에서 SELECT 정책 추가 필요.
- **api/ import 경로**: Vercel 빌드에서 `api/create-student-account.js`가 `../src/utils/loginEmail.js`를 정상 번들하는지 확인. 문제 시 유틸 함수를 api 파일 안에 인라인 복제.

## Self-Review 결과

- 스펙 커버리지: 아이디/이메일 규칙(T1,T3), 아이디 생성·충돌·전화 우선순위(T2), 계정 유무 로드(T4), 일괄 생성 UI·리포트(T5,T6), 초기 비밀번호 상수(T5), 하위호환 로그인(T3), 테스트(T1,T2,T3,T5) 모두 포함.
- 타입 일관성: `planStudentAccounts` 반환 필드(studentId,name,classId,username,skip,reason)를 T5 모달이 그대로 사용. `studentAccountIds`/`refreshStudentAccounts` 명칭 T4↔T6 일치.
- 플레이스홀더 없음.
