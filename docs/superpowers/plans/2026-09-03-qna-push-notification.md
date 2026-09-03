# Q&A 새 질문 → 교사 폰 알림 실행 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 담당 반 학생이 Q&A에 질문을 올리면 담당 교사 폰으로 웹 푸시 알림이 간다.

**Architecture:** Supabase가 `qna` INSERT를 감지해 Vercel 함수 `api/notify-qna.js`로 웹훅을 쏘고, 함수가 담당 교사를 찾아 기기별로 저장된 구독으로 web-push를 발송한다. 판단 로직은 전부 순수 함수로 빼서 Vitest로 덮고, 서비스 워커와 실제 발송은 배포 후 폰에서 확인한다.

**Tech Stack:** React 19, Vite 8, Vercel Serverless Functions(Node), Supabase(Postgres + Database Webhooks), `web-push`, Vitest 4 + @testing-library/react

**Spec:** `docs/superpowers/specs/2026-09-03-qna-push-notification-design.md`

## Global Constraints

- 테스트 실행은 `npx vitest run` — `package.json`에 `test` 스크립트가 없다.
- 한글 주석을 쓴다. 주석은 "무엇을"이 아니라 "왜"를 적는다.
- 색상은 hex를 직접 쓰지 않고 `src/index.css`의 토큰 클래스를 쓴다 (`bg-ink`, `text-danger`, `border-line` 등). 예외: `public/manifest.json`은 CSS가 아니라 hex를 써야 한다 — 배경 `#F4F3EE`, 테마 `#2B2B2B`.
- 모서리는 `rounded`(4px), 뱃지만 `rounded-sm`(2px). 그림자 대신 `border border-line`.
- 컴포넌트 파일명은 PascalCase, 함수형 컴포넌트.
- API 함수는 판단 로직을 named export 순수 함수로 빼고 `default export handler`는 조립만 한다 (`api/check-wifi.js` 방식).
- 알림 본문에 **질문 내용을 절대 넣지 않는다.** 잠금화면에 그대로 뜬다.
- 커밋 메시지는 한글, `feat:` / `docs:` / `fix:` 접두사.

---

### Task 1: 알림 대상과 문구를 정하는 순수 로직

발송·DB·브라우저와 무관한 판단만 먼저 만든다. 나중에 채널을 알림톡으로 바꿔도 이 부분은 그대로 쓴다.

**Files:**
- Create: `api/notify-qna.js`
- Test: `api/notify-qna.test.js`

**Interfaces:**
- Consumes: `qnaCategoryLabel` from `src/constants/qna.js`
- Produces:
  - `notifyTargets(question, students, classes, admins) -> string[]` — 알림 받을 profile id 배열
  - `qnaNotification(student, question) -> { title: string, body: string }`
  - `isDeadSubscription(statusCode) -> boolean`
  - 인자는 모두 **DB 행 모양(snake_case)** 이다. 웹훅 payload와 service role 조회 결과를 변환 없이 그대로 넘기기 위해서다.

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`api/notify-qna.test.js`:

```js
// api/notify-qna.test.js
import { describe, it, expect } from 'vitest'
import { notifyTargets, qnaNotification, isDeadSubscription } from './notify-qna.js'

// 인자는 전부 DB 행 모양(snake_case)이다 — 웹훅 payload를 변환 없이 그대로 넘긴다
const STUDENTS = [
  { id: 1, name: '홍길동', class_id: 10 },
  { id: 2, name: '김철수', class_id: 20 },
  { id: 3, name: '이영희', class_id: null },   // 반 미배정
]
const CLASSES = [
  { id: 10, teacher_id: 't1' },
  { id: 20, teacher_id: null },                // 담당 교사 없음
]
const ADMINS = [{ id: 'a1' }, { id: 'a2' }]

describe('notifyTargets', () => {
  it('담당 교사에게만 보낸다', () => {
    expect(notifyTargets({ student_id: 1 }, STUDENTS, CLASSES, ADMINS)).toEqual(['t1'])
  })

  it('반이 배정되지 않은 학생의 질문은 관리자 전원에게 간다', () => {
    expect(notifyTargets({ student_id: 3 }, STUDENTS, CLASSES, ADMINS)).toEqual(['a1', 'a2'])
  })

  it('반에 담당 교사가 없으면 관리자 전원에게 간다', () => {
    expect(notifyTargets({ student_id: 2 }, STUDENTS, CLASSES, ADMINS)).toEqual(['a1', 'a2'])
  })

  it('명부에 없는 학생이어도 알림이 사라지지 않는다', () => {
    // 계정과 명부가 어긋난 적이 있다. 그때 질문이 조용히 묻히면 안 된다.
    expect(notifyTargets({ student_id: 999 }, STUDENTS, CLASSES, ADMINS)).toEqual(['a1', 'a2'])
  })

  it('관리자가 없으면 빈 배열을 준다', () => {
    expect(notifyTargets({ student_id: 3 }, STUDENTS, CLASSES, [])).toEqual([])
  })
})

describe('qnaNotification', () => {
  it('이름과 말머리까지만 담는다', () => {
    const got = qnaNotification(STUDENTS[0], { category: 'naesin', content: '3번 문제 답이 왜 이렇게 되나요' })
    expect(got.title).toBe('새 질문')
    expect(got.body).toBe('홍길동 · 내신과제')
  })

  it('질문 내용은 넣지 않는다', () => {
    // 알림은 잠금화면에 그대로 뜬다. 카페·지하철에서 옆 사람이 읽으면 안 된다.
    const got = qnaNotification(STUDENTS[0], { category: 'test', content: '비밀스러운질문내용' })
    expect(JSON.stringify(got)).not.toContain('비밀스러운질문내용')
  })

  it('학생을 못 찾아도 문구를 만든다', () => {
    expect(qnaNotification(undefined, { category: 'etc' }).body).toBe('학생 · 기타')
  })
})

describe('isDeadSubscription', () => {
  it('404와 410은 죽은 구독이다', () => {
    expect(isDeadSubscription(404)).toBe(true)
    expect(isDeadSubscription(410)).toBe(true)
  })

  it('일시적인 실패는 죽은 구독이 아니다', () => {
    // 500은 잠시 후 되살아난다. 지우면 교사가 다시 켜야 한다.
    expect(isDeadSubscription(500)).toBe(false)
    expect(isDeadSubscription(429)).toBe(false)
    expect(isDeadSubscription(undefined)).toBe(false)
  })
})
```

- [ ] **Step 2: 테스트를 돌려 실패를 확인한다**

Run: `npx vitest run api/notify-qna.test.js`
Expected: FAIL — `Failed to resolve import "./notify-qna.js"` (파일이 아직 없다)

- [ ] **Step 3: 최소 구현을 쓴다**

`api/notify-qna.js`:

```js
// api/notify-qna.js
// 새 질문이 올라오면 담당 교사 폰으로 알림을 보낸다.
//
// 판단 로직은 순수 함수로 빼서 테스트한다 (api/check-wifi.js와 같은 방식).
// 나중에 채널을 카카오 알림톡으로 바꿔도 이 부분은 그대로 쓴다.
import { qnaCategoryLabel } from '../src/constants/qna.js'

// 이 질문의 알림을 받을 사람들의 profile id.
// 인자는 전부 DB 행 모양(snake_case)이다 — 웹훅 payload를 변환 없이 그대로 받는다.
export function notifyTargets(question, students = [], classes = [], admins = []) {
  const adminIds = admins.map((a) => a.id)

  // 받을 교사를 못 찾으면 관리자에게 넘긴다.
  // 계정과 명부가 어긋나 학생을 못 찾는 경우가 실제로 있었다.
  // 그때 알림을 버리면 질문이 아무에게도 안 보인 채로 묻힌다.
  const student = students.find((s) => s.id === question.student_id)
  if (!student) return adminIds

  const klass = classes.find((c) => c.id === student.class_id)
  if (!klass?.teacher_id) return adminIds

  return [klass.teacher_id]
}

// 잠금화면에 그대로 뜨는 내용이다. 질문 본문은 넣지 않는다.
export function qnaNotification(student, question) {
  return {
    title: '새 질문',
    body: `${student?.name ?? '학생'} · ${qnaCategoryLabel(question.category)}`,
  }
}

// 브라우저가 구독을 버린 상태. 이 구독은 지워야 한다.
// 500·429처럼 잠시 실패한 것까지 지우면 교사가 알림을 다시 켜야 한다.
export function isDeadSubscription(statusCode) {
  return statusCode === 404 || statusCode === 410
}
```

- [ ] **Step 4: 테스트를 돌려 통과를 확인한다**

Run: `npx vitest run api/notify-qna.test.js`
Expected: PASS (10 tests)

- [ ] **Step 5: 전체 테스트와 린트를 돌린다**

Run: `npx vitest run && npm run lint`
Expected: 전체 통과, 린트 오류 없음

- [ ] **Step 6: 커밋**

```bash
git add api/notify-qna.js api/notify-qna.test.js
git commit -m "feat: 새 질문 알림을 누구에게 보낼지 정하는 로직"
```

---

### Task 2: 구독 저장 테이블과 저장 로직

알림은 사람이 아니라 **기기** 단위로 간다. 교사가 폰과 PC에서 각각 켜면 행이 둘 생긴다.

**Files:**
- Create: `docs/push-subscriptions.sql`
- Create: `src/utils/pushSubscription.js`
- Test: `src/utils/pushSubscription.test.js`
- Modify: `src/context/DataContext.jsx` (Q&A CRUD 블록 아래에 함수 추가, Provider value에 등록)

**Interfaces:**
- Consumes: 없음
- Produces:
  - `subscriptionRow(subscription, profileId, userAgent) -> { profile_id, endpoint, p256dh, auth, user_agent }`
  - DataContext: `savePushSubscription(subscription, profileId) -> Promise<boolean>`
  - DataContext: `deletePushSubscription(endpoint) -> Promise<boolean>`

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`src/utils/pushSubscription.test.js`:

```js
// src/utils/pushSubscription.test.js
import { describe, it, expect } from 'vitest'
import { subscriptionRow } from './pushSubscription'

// 브라우저가 주는 PushSubscription 모양
const sub = {
  endpoint: 'https://fcm.googleapis.com/fcm/send/abc123',
  toJSON: () => ({
    endpoint: 'https://fcm.googleapis.com/fcm/send/abc123',
    keys: { p256dh: 'PPPP', auth: 'AAAA' },
  }),
}

describe('subscriptionRow', () => {
  it('브라우저 구독을 DB 행 모양으로 바꾼다', () => {
    expect(subscriptionRow(sub, 't1', 'iPhone Safari')).toEqual({
      profile_id: 't1',
      endpoint:   'https://fcm.googleapis.com/fcm/send/abc123',
      p256dh:     'PPPP',
      auth:       'AAAA',
      user_agent: 'iPhone Safari',
    })
  })

  it('키가 없는 구독은 받지 않는다', () => {
    // 키 없이 저장하면 발송할 때가 되어서야 실패한다. 그때는 원인을 찾기 어렵다.
    const broken = { toJSON: () => ({ endpoint: 'https://x', keys: {} }) }
    expect(() => subscriptionRow(broken, 't1', 'UA')).toThrow(/키/)
  })

  it('기기 정보가 없으면 빈 값으로 둔다', () => {
    expect(subscriptionRow(sub, 't1', undefined).user_agent).toBe('')
  })
})
```

- [ ] **Step 2: 테스트를 돌려 실패를 확인한다**

Run: `npx vitest run src/utils/pushSubscription.test.js`
Expected: FAIL — `Failed to resolve import "./pushSubscription"`

- [ ] **Step 3: 최소 구현을 쓴다**

`src/utils/pushSubscription.js`:

```js
// src/utils/pushSubscription.js
// 브라우저가 준 구독 정보를 DB에 넣을 모양으로 바꾼다.
//
// 알림은 사람이 아니라 기기 단위로 간다. 교사가 폰과 PC에서 각각 켜면
// endpoint가 다른 행이 두 개 생기고, 두 기기 모두 알림을 받는다.

export function subscriptionRow(subscription, profileId, userAgent) {
  const json = subscription.toJSON()
  const { p256dh, auth } = json.keys ?? {}

  // 키 없이 저장하면 발송할 때가 되어서야 실패한다. 그때는 원인을 찾기 어렵다.
  if (!p256dh || !auth) throw new Error('구독에 암호화 키가 없습니다')

  return {
    profile_id: profileId,
    endpoint:   json.endpoint,
    p256dh,
    auth,
    user_agent: userAgent ?? '',
  }
}
```

- [ ] **Step 4: 테스트를 돌려 통과를 확인한다**

Run: `npx vitest run src/utils/pushSubscription.test.js`
Expected: PASS (3 tests)

- [ ] **Step 5: 테이블 SQL 파일을 만든다**

`docs/push-subscriptions.sql`:

```sql
-- docs/push-subscriptions.sql
-- 웹 푸시 구독을 담는 표.
--
-- Supabase → SQL Editor에 통째로 붙여넣고 실행한다. 여러 번 실행해도 안전하다.
--
-- 알림은 사람이 아니라 기기 단위로 간다. 교사가 폰과 PC에서 각각 켜면
-- 행이 두 개 생기고 두 기기 모두 알림을 받는다.

create table if not exists public.push_subscriptions (
  id         bigint generated always as identity primary key,
  -- 계정을 지우면 구독도 같이 지운다. 남겨두면 아무도 못 받는 구독에 계속 쏜다.
  profile_id uuid        not null references public.profiles(id) on delete cascade,
  -- 브라우저가 준 고유 주소. 껐다 켜면 같은 값이 다시 오므로 unique로 막는다
  -- (막지 않으면 행이 쌓여 한 기기에 알림이 여러 번 간다)
  endpoint   text        not null unique,
  p256dh     text        not null,
  auth       text        not null,
  -- "어느 기기인지" 화면에 보여주려고 남긴다
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists push_subscriptions_profile_idx
  on public.push_subscriptions (profile_id);

-- ── 접근 정책 ────────────────────────────────────────────────
-- 본인 구독만 읽고 쓰고 지운다. 남의 구독을 읽으면 그 사람 폰으로
-- 알림을 보낼 수 있게 되므로 반드시 잠근다.
--
-- 발송 함수는 서버에서 service role로 읽으므로 이 정책의 영향을 받지 않는다.
alter table public.push_subscriptions enable row level security;

drop policy if exists push_sub_own on public.push_subscriptions;
create policy push_sub_own on public.push_subscriptions
for all to authenticated
using (profile_id = auth.uid())
with check (profile_id = auth.uid());

-- ── 확인 ─────────────────────────────────────────────────────
-- 1줄이 나와야 한다: push_sub_own
select policyname, cmd from pg_policies
where schemaname = 'public' and tablename = 'push_subscriptions';
```

- [ ] **Step 6: DataContext에 저장·삭제 함수를 추가한다**

`src/context/DataContext.jsx` — 파일 위쪽 import 블록에 추가:

```js
import { subscriptionRow } from '../utils/pushSubscription'
```

`answerQuestion` 함수 바로 아래에 추가:

```js
  // ── 알림 구독 ──────────────────────────────────────────

  // 이 기기에서 알림을 받겠다고 등록한다.
  // 껐다 켜면 같은 endpoint가 다시 오므로 upsert로 덮어쓴다.
  async function savePushSubscription(subscription, profileId) {
    let row
    try {
      row = subscriptionRow(subscription, profileId, navigator.userAgent)
    } catch (e) {
      console.error('알림 구독 정보가 올바르지 않습니다:', e)
      return false
    }

    const { error } = await supabase
      .from('push_subscriptions')
      .upsert(row, { onConflict: 'endpoint' })

    if (error) { console.error('알림 구독 저장 실패:', error); return false }
    return true
  }

  // 이 기기에서 알림을 끈다
  async function deletePushSubscription(endpoint) {
    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('endpoint', endpoint)

    if (error) { console.error('알림 구독 해제 실패:', error); return false }
    return true
  }
```

Provider value에서 `addQuestion, answerQuestion, uploadQnaImage, qnaImageUrl,` 줄 바로 아래에 추가:

```js
      savePushSubscription, deletePushSubscription,
```

- [ ] **Step 7: 전체 테스트와 린트를 돌린다**

Run: `npx vitest run && npm run lint`
Expected: 전체 통과, 린트 오류 없음

- [ ] **Step 8: 커밋**

```bash
git add docs/push-subscriptions.sql src/utils/pushSubscription.js src/utils/pushSubscription.test.js src/context/DataContext.jsx
git commit -m "feat: 기기별 알림 구독을 저장한다"
```

---

### Task 3: PWA 기반 — 매니페스트, 아이콘, 서비스 워커

아이폰은 매니페스트와 서비스 워커가 있고 **홈 화면에 추가된 상태**에서만 웹 알림을 허용한다.

**Files:**
- Create: `public/icon-512.png`, `public/icon-192.png` (기존 로고에서 만든다)
- Create: `public/manifest.json`
- Create: `public/sw.js`
- Modify: `index.html`

**Interfaces:**
- Consumes: 없음
- Produces: `/sw.js`가 `push` 이벤트로 받는 payload 모양 — `{ title, body, url }`. Task 5의 발송 함수가 이 모양으로 보낸다.

- [ ] **Step 1: 정사각형 아이콘을 만든다**

`public/logo.png`는 1772×428, `logo-vertical.png`는 1772×1583으로 **둘 다 정사각형이 아니다.** PWA 아이콘은 정사각형이어야 하므로 아이보리 배경으로 여백을 채워 만든다.

```bash
sips -Z 448 public/logo-vertical.png --out /tmp/qna-icon-src.png
sips --padToHeightWidth 512 512 --padColor F4F3EE /tmp/qna-icon-src.png --out public/icon-512.png
sips -z 192 192 public/icon-512.png --out public/icon-192.png
```

- [ ] **Step 2: 아이콘 크기를 확인한다**

Run: `sips -g pixelWidth -g pixelHeight public/icon-512.png public/icon-192.png`
Expected: 512×512, 192×192

- [ ] **Step 3: 매니페스트를 만든다**

`public/manifest.json`:

```json
{
  "name": "수문재국어전문학원",
  "short_name": "수문재",
  "start_url": "/dashboard",
  "scope": "/",
  "display": "standalone",
  "background_color": "#F4F3EE",
  "theme_color": "#2B2B2B",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

- [ ] **Step 4: 서비스 워커를 만든다**

`public/sw.js`:

```js
// public/sw.js
// 알림을 받아 띄우고, 누르면 앱을 여는 서비스 워커.
//
// 빌드를 거치지 않고 그대로 배포되는 파일이라 import 없이 순수 JS로 쓴다.

self.addEventListener('push', (event) => {
  // payload가 깨졌다고 알림을 통째로 버리면 교사는 질문이 온 줄도 모른다.
  // 최소한 "새 질문"이라도 띄운다.
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = {}
  }

  event.waitUntil(
    self.registration.showNotification(data.title || '새 질문', {
      body:  data.body || '',
      icon:  '/icon-192.png',
      badge: '/icon-192.png',
      data:  { url: data.url || '/qna' },
      // tag를 주면 알림이 하나로 합쳐진다. 질문마다 따로 보여야 해서 주지 않는다.
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/qna'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      // 이미 열려 있는 탭이 있으면 새로 열지 않고 그 탭을 앞으로 가져온다
      for (const client of list) {
        if (client.url.includes(url) && 'focus' in client) return client.focus()
      }
      return self.clients.openWindow(url)
    })
  )
})
```

- [ ] **Step 5: index.html에 매니페스트를 연결한다**

`index.html`의 `<title>` 바로 위에 추가:

```html
    <link rel="manifest" href="/manifest.json" />
    <link rel="apple-touch-icon" href="/icon-192.png" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-title" content="수문재" />
    <meta name="theme-color" content="#2B2B2B" />
```

- [ ] **Step 6: 빌드가 깨지지 않는지 확인한다**

Run: `npm run build && ls dist/manifest.json dist/sw.js dist/icon-512.png`
Expected: 빌드 성공, 세 파일 모두 `dist/`에 복사됨

- [ ] **Step 7: 전체 테스트와 린트를 돌린다**

Run: `npx vitest run && npm run lint`
Expected: 전체 통과. 린트가 `public/sw.js`의 `self`를 모르는 전역이라고 하면 `eslint.config.js`의 `ignores`에 `'public/sw.js'`를 넣는다 — 빌드를 거치지 않는 파일이라 린트 대상이 아니다.

- [ ] **Step 8: 커밋**

```bash
git add public/manifest.json public/sw.js public/icon-192.png public/icon-512.png index.html eslint.config.js
git commit -m "feat: 앱을 폰에 설치할 수 있게 만든다 (PWA 기반)"
```

---

### Task 4: 교사 화면 알림 켜기 토글

교사가 이 기기에서 알림을 받을지 정한다. 아이폰에서 홈 화면 미추가 상태면 토글 대신 방법을 안내한다.

**Files:**
- Create: `src/utils/pushSupport.js`
- Test: `src/utils/pushSupport.test.js`
- Create: `src/components/PushToggle.jsx`
- Test: `src/components/PushToggle.test.jsx`
- Modify: `src/pages/QnA.jsx` (list 뷰 상단, 교사·관리자에게만)

**Interfaces:**
- Consumes: DataContext의 `savePushSubscription`, `deletePushSubscription` (Task 2)
- Produces:
  - `pushEnvironment(env) -> 'ready' | 'on' | 'ios-needs-install' | 'denied' | 'unsupported'`
    - `env`: `{ hasServiceWorker, hasPushManager, isIos, isStandalone, permission, subscribed }`
  - `<PushToggle />` — props 없음. 내부에서 `useAuth`·`useData`를 쓴다.

- [ ] **Step 1: 환경 판단 테스트를 쓴다**

`src/utils/pushSupport.test.js`:

```js
// src/utils/pushSupport.test.js
import { describe, it, expect } from 'vitest'
import { pushEnvironment } from './pushSupport'

// 기본은 "알림을 켤 수 있는 안드로이드/PC"
const base = {
  hasServiceWorker: true,
  hasPushManager:   true,
  isIos:            false,
  isStandalone:     false,
  permission:       'default',
  subscribed:       false,
}

describe('pushEnvironment', () => {
  it('켤 수 있으면 ready다', () => {
    expect(pushEnvironment(base)).toBe('ready')
  })

  it('이미 구독했으면 on이다', () => {
    expect(pushEnvironment({ ...base, permission: 'granted', subscribed: true })).toBe('on')
  })

  it('아이폰인데 홈 화면에 추가하지 않았으면 안내가 필요하다', () => {
    // 토글을 눌러도 아무 일이 안 일어나는 상황을 만들지 않는다
    expect(pushEnvironment({ ...base, isIos: true, isStandalone: false })).toBe('ios-needs-install')
  })

  it('아이폰이어도 홈 화면에 추가했으면 켤 수 있다', () => {
    expect(pushEnvironment({ ...base, isIos: true, isStandalone: true })).toBe('ready')
  })

  it('권한을 거부한 상태면 denied다', () => {
    expect(pushEnvironment({ ...base, permission: 'denied' })).toBe('denied')
  })

  it('브라우저가 지원하지 않으면 unsupported다', () => {
    expect(pushEnvironment({ ...base, hasServiceWorker: false })).toBe('unsupported')
    expect(pushEnvironment({ ...base, hasPushManager: false })).toBe('unsupported')
  })

  it('지원하지 않는 게 먼저다 — 아이폰 안내보다 우선한다', () => {
    // iOS 16.4 미만에는 PushManager 자체가 없다. 홈 화면에 추가해도 안 된다.
    expect(pushEnvironment({ ...base, isIos: true, isStandalone: true, hasPushManager: false }))
      .toBe('unsupported')
  })
})
```

- [ ] **Step 2: 테스트를 돌려 실패를 확인한다**

Run: `npx vitest run src/utils/pushSupport.test.js`
Expected: FAIL — `Failed to resolve import "./pushSupport"`

- [ ] **Step 3: 최소 구현을 쓴다**

`src/utils/pushSupport.js`:

```js
// src/utils/pushSupport.js
// 이 기기에서 알림을 켤 수 있는 상태인지 판단한다.
//
// 아이폰은 Safari에서 "홈 화면에 추가"한 뒤에만 웹 알림을 허용한다(iOS 16.4+).
// 그 상태를 구분하지 않으면 아이폰 교사는 토글을 눌러도 아무 일이 없는 걸 겪는다.

export function pushEnvironment({
  hasServiceWorker, hasPushManager, isIos, isStandalone, permission, subscribed,
}) {
  // iOS 16.4 미만에는 PushManager 자체가 없다. 홈 화면에 추가해도 안 되므로 먼저 본다.
  if (!hasServiceWorker || !hasPushManager) return 'unsupported'
  if (isIos && !isStandalone) return 'ios-needs-install'
  if (permission === 'denied') return 'denied'
  if (subscribed) return 'on'
  return 'ready'
}

// 브라우저에서 위 인자들을 읽어 온다. 창이 없는 곳(테스트·서버)에서는 지원 안 함으로 본다.
export function readPushEnvironment(subscribed = false) {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return { hasServiceWorker: false, hasPushManager: false, isIos: false,
             isStandalone: false, permission: 'default', subscribed }
  }
  return {
    hasServiceWorker: 'serviceWorker' in navigator,
    hasPushManager:   'PushManager' in window,
    // 아이패드는 데스크톱 Safari처럼 보고하므로 터치 지원까지 함께 본다
    isIos: /iPad|iPhone|iPod/.test(navigator.userAgent) ||
           (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1),
    isStandalone: window.matchMedia?.('(display-mode: standalone)').matches ||
                  window.navigator.standalone === true,
    permission: typeof Notification === 'undefined' ? 'default' : Notification.permission,
    subscribed,
  }
}
```

- [ ] **Step 4: 테스트를 돌려 통과를 확인한다**

Run: `npx vitest run src/utils/pushSupport.test.js`
Expected: PASS (7 tests)

- [ ] **Step 5: 토글 컴포넌트 테스트를 쓴다**

`src/components/PushToggle.test.jsx`:

```jsx
// src/components/PushToggle.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PushToggle from './PushToggle'

const state = {}
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: state.user }) }))
vi.mock('../context/DataContext', () => ({ useData: () => state.data }))
vi.mock('../utils/pushSupport', async (orig) => ({
  ...(await orig()),
  readPushEnvironment: () => state.env,
}))

beforeEach(() => {
  state.user = { id: 't1', role: 'teacher' }
  state.data = {
    savePushSubscription:   vi.fn().mockResolvedValue(true),
    deletePushSubscription: vi.fn().mockResolvedValue(true),
  }
  state.env = {
    hasServiceWorker: true, hasPushManager: true, isIos: false,
    isStandalone: false, permission: 'default', subscribed: false,
  }
})

describe('PushToggle', () => {
  it('켤 수 있으면 켜기 버튼을 보여준다', () => {
    render(<PushToggle />)
    expect(screen.getByRole('button', { name: /알림 받기/ })).toBeInTheDocument()
  })

  it('아이폰인데 홈 화면에 추가하지 않았으면 방법을 알려준다', () => {
    // 버튼을 보여주면 눌러도 아무 일이 없어 고장으로 보인다
    state.env = { ...state.env, isIos: true, isStandalone: false }
    render(<PushToggle />)
    expect(screen.getByText(/홈 화면에 추가/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /알림 받기/ })).not.toBeInTheDocument()
  })

  it('권한을 거부했으면 브라우저 설정을 안내한다', () => {
    state.env = { ...state.env, permission: 'denied' }
    render(<PushToggle />)
    expect(screen.getByText(/브라우저 설정/)).toBeInTheDocument()
  })

  it('지원하지 않는 브라우저면 그렇다고 알린다', () => {
    state.env = { ...state.env, hasPushManager: false }
    render(<PushToggle />)
    expect(screen.getByText(/지원하지 않습니다/)).toBeInTheDocument()
  })

  it('이미 켜져 있으면 끄기를 보여준다', () => {
    state.env = { ...state.env, permission: 'granted', subscribed: true }
    render(<PushToggle />)
    expect(screen.getByRole('button', { name: /알림 끄기/ })).toBeInTheDocument()
  })

  it('학생에게는 아무것도 보여주지 않는다', () => {
    // 학생이 받을 알림이 아직 없다
    state.user = { id: 's1', role: 'student', studentId: 1 }
    const { container } = render(<PushToggle />)
    expect(container).toBeEmptyDOMElement()
  })
})
```

- [ ] **Step 6: 테스트를 돌려 실패를 확인한다**

Run: `npx vitest run src/components/PushToggle.test.jsx`
Expected: FAIL — `Failed to resolve import "./PushToggle"`

- [ ] **Step 7: 토글 컴포넌트를 만든다**

`src/components/PushToggle.jsx`:

```jsx
// src/components/PushToggle.jsx
// 이 기기에서 새 질문 알림을 받을지 정하는 버튼.
//
// "이 기기에서"라고 쓰는 건 실제로 기기 단위이기 때문이다.
// 교사가 PC에서만 켜면 폰은 조용하다.
import { useState, useEffect } from 'react'
import { Bell, BellOff } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { pushEnvironment, readPushEnvironment } from '../utils/pushSupport'

// VAPID 공개 키는 브라우저가 base64url 문자열이 아니라 바이트 배열로 요구한다
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw     = window.atob(base64)
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)))
}

export default function PushToggle() {
  const { user } = useAuth()
  const { savePushSubscription, deletePushSubscription } = useData()
  const [subscribed, setSubscribed] = useState(false)
  const [busy,       setBusy]       = useState(false)
  const [error,      setError]      = useState('')

  const isStaff = user?.role === 'teacher' || user?.role === 'admin'

  // 이 기기가 이미 구독 중인지 브라우저에 물어본다
  useEffect(() => {
    if (!isStaff || !('serviceWorker' in navigator)) return
    let alive = true
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => { if (alive) setSubscribed(Boolean(sub)) })
      .catch(() => {})
    return () => { alive = false }
  }, [isStaff])

  if (!isStaff) return null

  const status = pushEnvironment(readPushEnvironment(subscribed))

  async function turnOn() {
    setBusy(true)
    setError('')
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') { setError('알림 권한이 허용되지 않았습니다.'); return }

      const reg = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(import.meta.env.VITE_VAPID_PUBLIC_KEY),
      })

      const ok = await savePushSubscription(sub, user.id)
      // 브라우저에만 등록되고 서버에 저장이 안 되면 켜진 것처럼 보이지만
      // 알림은 오지 않는다. 그 상태로 두지 않는다.
      if (!ok) { await sub.unsubscribe(); setError('알림 설정을 저장하지 못했습니다.'); return }
      setSubscribed(true)
    } catch (e) {
      console.error('알림 켜기 실패:', e)
      setError('알림을 켜지 못했습니다.')
    } finally {
      setBusy(false)
    }
  }

  async function turnOff() {
    setBusy(true)
    setError('')
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await deletePushSubscription(sub.endpoint)
        await sub.unsubscribe()
      }
      setSubscribed(false)
    } catch (e) {
      console.error('알림 끄기 실패:', e)
      setError('알림을 끄지 못했습니다.')
    } finally {
      setBusy(false)
    }
  }

  const note = {
    'ios-needs-install': '아이폰은 홈 화면에 추가한 뒤에만 알림을 받을 수 있습니다. 공유 버튼 → 홈 화면에 추가.',
    denied:              '알림이 차단되어 있습니다. 브라우저 설정에서 이 사이트의 알림을 허용해 주세요.',
    unsupported:         '이 브라우저는 알림을 지원하지 않습니다.',
  }[status]

  return (
    <div className="border border-line rounded p-3 mb-4 flex items-center justify-between gap-3">
      <div>
        <p className="text-sm font-medium text-ink-soft">새 질문 알림</p>
        {note
          ? <p className="text-xs text-ink-mute mt-1">{note}</p>
          : <p className="text-xs text-ink-mute mt-1">
              {status === 'on' ? '이 기기로 알림을 받고 있습니다.' : '이 기기에서 알림을 받습니다.'}
            </p>}
        {error && <p className="text-xs text-danger mt-1">{error}</p>}
      </div>

      {status === 'on' && (
        <button type="button" onClick={turnOff} disabled={busy}
          className="shrink-0 text-xs border border-line rounded px-3 py-2 flex items-center gap-1 hover:bg-surface-alt transition-colors">
          <BellOff size={14} aria-hidden="true" />알림 끄기
        </button>
      )}
      {status === 'ready' && (
        <button type="button" onClick={turnOn} disabled={busy}
          className="shrink-0 text-xs bg-ink text-white rounded px-3 py-2 flex items-center gap-1">
          <Bell size={14} aria-hidden="true" />알림 받기
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 8: 테스트를 돌려 통과를 확인한다**

Run: `npx vitest run src/components/PushToggle.test.jsx`
Expected: PASS (6 tests)

- [ ] **Step 9: Q&A 화면에 붙인다**

`src/pages/QnA.jsx` — import 블록에 추가:

```js
import PushToggle from '../components/PushToggle'
```

list 뷰에서 `{isTeacherOrAdmin && unanswered > 0 && (...)}` 블록 **바로 아래**에 추가:

```jsx
        <PushToggle />
```

- [ ] **Step 10: 전체 테스트와 린트를 돌린다**

Run: `npx vitest run && npm run lint`
Expected: 전체 통과. `QnA.test.jsx`가 `useData`를 목으로 바꿔 놓았으므로 `savePushSubscription`이 없어 오류가 나면, `QnA.test.jsx`의 `beforeEach`에 `savePushSubscription: vi.fn()`, `deletePushSubscription: vi.fn()`을 추가한다.

- [ ] **Step 11: 커밋**

```bash
git add src/utils/pushSupport.js src/utils/pushSupport.test.js src/components/PushToggle.jsx src/components/PushToggle.test.jsx src/pages/QnA.jsx src/pages/QnA.test.jsx
git commit -m "feat: 교사가 이 기기에서 새 질문 알림을 켠다"
```

---

### Task 5: 발송 함수

웹훅을 받아 담당 교사의 기기로 실제 알림을 쏜다.

**Files:**
- Modify: `api/notify-qna.js` (Task 1의 순수 함수 아래에 핸들러 추가)
- Modify: `api/notify-qna.test.js` (인증 판단 테스트 추가)
- Modify: `package.json` (`web-push` 의존성)

**Interfaces:**
- Consumes: `notifyTargets`, `qnaNotification`, `isDeadSubscription` (Task 1) / `push_subscriptions` 테이블 (Task 2) / `/sw.js`의 payload 모양 `{ title, body, url }` (Task 3)
- Produces:
  - `isAuthorizedWebhook(headers, secret) -> boolean`
  - `endpointsToRemove(results) -> string[]` — `results`는 `[{ endpoint, statusCode? }]`, `statusCode`는 실패했을 때만 있다
  - `POST /api/notify-qna`

- [ ] **Step 1: web-push를 설치한다**

Run: `npm install web-push`
Expected: `package.json`의 `dependencies`에 `web-push` 추가

- [ ] **Step 2: 인증과 구독 정리 테스트를 쓴다**

`api/notify-qna.test.js` 맨 아래에 추가하고, 맨 위 import에 `isAuthorizedWebhook`과 `endpointsToRemove`를 넣는다:

```js
describe('isAuthorizedWebhook', () => {
  it('비밀값이 맞으면 통과시킨다', () => {
    expect(isAuthorizedWebhook({ 'x-webhook-secret': 'S3CRET' }, 'S3CRET')).toBe(true)
  })

  it('비밀값이 틀리거나 없으면 막는다', () => {
    expect(isAuthorizedWebhook({ 'x-webhook-secret': 'nope' }, 'S3CRET')).toBe(false)
    expect(isAuthorizedWebhook({}, 'S3CRET')).toBe(false)
  })

  it('서버에 비밀값을 설정하지 않았으면 아무도 통과시키지 않는다', () => {
    // 설정 전에는 누구나 알림을 쏘는 것보다 아무도 못 쏘는 편이 안전하다
    expect(isAuthorizedWebhook({ 'x-webhook-secret': 'anything' }, undefined)).toBe(false)
    expect(isAuthorizedWebhook({ 'x-webhook-secret': '' }, '')).toBe(false)
  })
})

describe('endpointsToRemove', () => {
  it('죽은 구독만 골라낸다', () => {
    expect(endpointsToRemove([
      { endpoint: 'https://a', statusCode: 410 },
      { endpoint: 'https://b' },                   // 성공
      { endpoint: 'https://c', statusCode: 500 },  // 잠시 실패 — 살려둔다
      { endpoint: 'https://d', statusCode: 404 },
    ])).toEqual(['https://a', 'https://d'])
  })

  it('전부 성공하면 지울 게 없다', () => {
    expect(endpointsToRemove([{ endpoint: 'https://a' }])).toEqual([])
    expect(endpointsToRemove([])).toEqual([])
  })
})
```

- [ ] **Step 3: 테스트를 돌려 실패를 확인한다**

Run: `npx vitest run api/notify-qna.test.js`
Expected: FAIL — `isAuthorizedWebhook is not a function`

- [ ] **Step 4: 인증 함수와 핸들러를 구현한다**

`api/notify-qna.js` 맨 위 import에 추가:

```js
import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'
```

`isDeadSubscription` 아래에 추가:

```js
// 이 주소를 아는 사람이 아무나 알림을 쏘지 못하게 막는다.
// 비밀값을 설정하지 않았으면 아무도 통과시키지 않는다 —
// 설정 전에는 누구나 쏘는 것보다 아무도 못 쏘는 편이 안전하다.
export function isAuthorizedWebhook(headers, secret) {
  if (!secret) return false
  return headers['x-webhook-secret'] === secret
}

// 발송 결과에서 지워야 할 구독만 골라낸다.
// 죽은 구독을 남겨두면 "보냈다"는 기록만 쌓이고 아무도 못 받는 상태가 조용히 이어진다.
export function endpointsToRemove(results = []) {
  return results.filter((r) => isDeadSubscription(r.statusCode)).map((r) => r.endpoint)
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  if (!isAuthorizedWebhook(req.headers, process.env.QNA_WEBHOOK_SECRET)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const supabaseUrl    = process.env.VITE_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const publicKey      = process.env.VAPID_PUBLIC_KEY
  const privateKey     = process.env.VAPID_PRIVATE_KEY
  // 푸시 서비스가 문제 생겼을 때 연락할 곳. 실제로 받는 주소를 넣어야 한다.
  const contact        = process.env.VAPID_CONTACT

  if (!supabaseUrl || !serviceRoleKey || !publicKey || !privateKey || !contact) {
    return res.status(500).json({ error: '서버 환경변수가 설정되지 않았습니다.' })
  }

  webpush.setVapidDetails(contact, publicKey, privateKey)

  const question = req.body?.record
  if (!question?.student_id) return res.status(400).json({ error: '질문 정보가 없습니다.' })

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const [studentsRes, classesRes, adminsRes] = await Promise.all([
    admin.from('students').select('id, name, class_id'),
    admin.from('classes').select('id, teacher_id'),
    admin.from('profiles').select('id').eq('role', 'admin'),
  ])

  const students = studentsRes.data ?? []
  const targets  = notifyTargets(question, students, classesRes.data ?? [], adminsRes.data ?? [])
  if (targets.length === 0) return res.status(200).json({ sent: 0, removed: 0, reason: '받을 사람 없음' })

  const { data: subs } = await admin
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .in('profile_id', targets)

  const student = students.find((s) => s.id === question.student_id)
  const payload = JSON.stringify({ ...qnaNotification(student, question), url: '/qna' })

  // 한 기기가 실패해도 나머지는 계속 보낸다.
  // 교사 한 명의 폰이 죽었다고 다른 교사가 못 받으면 안 된다.
  const results = await Promise.all((subs ?? []).map(async (s) => {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        payload
      )
      return { endpoint: s.endpoint }
    } catch (e) {
      // 죽은 구독은 조용히 정리하고, 그 밖의 실패는 원인을 남긴다
      if (!isDeadSubscription(e.statusCode)) {
        console.error('알림 발송 실패:', s.endpoint, e.statusCode, e.body)
      }
      return { endpoint: s.endpoint, statusCode: e.statusCode }
    }
  }))

  const dead = endpointsToRemove(results)
  const sent = results.filter((r) => !r.statusCode).length

  if (dead.length > 0) {
    await admin.from('push_subscriptions').delete().in('endpoint', dead)
  }

  return res.status(200).json({ sent, removed: dead.length })
}
```

- [ ] **Step 5: 테스트를 돌려 통과를 확인한다**

Run: `npx vitest run api/notify-qna.test.js`
Expected: PASS (15 tests)

- [ ] **Step 6: 전체 테스트와 린트, 빌드를 돌린다**

Run: `npx vitest run && npm run lint && npm run build`
Expected: 전체 통과

- [ ] **Step 7: 커밋**

```bash
git add api/notify-qna.js api/notify-qna.test.js package.json package-lock.json
git commit -m "feat: 새 질문을 담당 교사 기기로 발송한다"
```

---

### Task 6: 설정 절차 문서와 매뉴얼

코드만으로는 동작하지 않는다. 사람이 해야 하는 다섯 가지를 순서대로 적어 둔다.

**Files:**
- Create: `docs/push-setup.md`
- Modify: `MANUAL.md` (Q&A 절에 교사용 알림 안내 추가)
- Modify: `CLAUDE.md` (기능 목록에 알림 상태 반영)

**Interfaces:**
- Consumes: Task 2~5의 결과물 전부
- Produces: 없음 (문서)

- [ ] **Step 1: 설정 절차 문서를 쓴다**

`docs/push-setup.md`:

````markdown
# 새 질문 알림 설정 절차

코드를 배포해도 이 다섯 가지를 하지 않으면 알림이 오지 않는다.
순서대로 한 번만 하면 된다.

## 1. VAPID 키 만들기

푸시 서비스에 "이 알림은 우리 서버가 보낸 게 맞다"고 증명하는 열쇠다.

```bash
npx web-push generate-vapid-keys
```

`Public Key`와 `Private Key`가 나온다. **Private Key는 절대 코드나 깃에 넣지 않는다.**

## 2. Vercel 환경변수 등록

Vercel → 프로젝트 → Settings → Environment Variables에서 네 개를 추가한다.

| 이름 | 값 |
|------|-----|
| `VAPID_PUBLIC_KEY` | 1번의 Public Key |
| `VAPID_PRIVATE_KEY` | 1번의 Private Key |
| `VITE_VAPID_PUBLIC_KEY` | 1번의 Public Key (같은 값) |
| `QNA_WEBHOOK_SECRET` | 아무 긴 임의 문자열 (예: `openssl rand -hex 32` 결과) |
| `VAPID_CONTACT` | `mailto:` 로 시작하는 실제 받는 메일 주소 (예: `mailto:won@example.com`) |

`VAPID_CONTACT`는 구글·애플의 푸시 서버가 우리 쪽 발송에 문제가 생겼을 때
연락할 곳이다. 실제로 받는 주소를 넣는다. 안 쓰이는 게 정상이지만, 발송이
대량으로 거부될 때 여기로 연락이 온다.

공개 키를 두 번 넣는 이유: Vite는 `VITE_` 로 시작하는 값만 브라우저로 내보낸다.
브라우저도 이 키가 있어야 구독을 만들 수 있어서 이름을 나눠 둔 것이고, **값은 같아야 한다.**

등록 후 **재배포해야** 적용된다.

## 3. 표 만들기

Supabase → SQL Editor에서 `docs/push-subscriptions.sql`을 실행한다.
맨 아래 확인 쿼리에서 `push_sub_own` 한 줄이 나오면 된다.

## 4. 웹훅 등록

Supabase → Database → Webhooks → Create a new hook

| 항목 | 값 |
|------|-----|
| Name | `notify-qna` |
| Table | `qna` |
| Events | `Insert` 만 체크 |
| Type | HTTP Request |
| Method | `POST` |
| URL | `https://<배포주소>/api/notify-qna` |
| HTTP Headers | `x-webhook-secret` : 2번에서 정한 `QNA_WEBHOOK_SECRET` 값 |

## 5. 교사 폰에서 알림 켜기

교사마다 한 번씩 한다.

**아이폰** — Safari로 사이트를 연다 → 공유 버튼 → **홈 화면에 추가** →
홈 화면의 아이콘으로 앱을 연다 → Q&A → **알림 받기** → 허용

아이폰은 홈 화면에 추가한 앱에서만 웹 알림이 열린다. Safari 탭에서는 버튼이 뜨지 않고
방법 안내가 대신 보인다. **홈 화면에서 앱을 지우면 알림도 끊긴다.**

**안드로이드 / PC** — 사이트를 열고 Q&A → **알림 받기** → 허용

## 확인

학생 계정으로 질문을 하나 올리고 담당 교사 폰에 `홍길동 · 내신과제` 형태의
알림이 오는지 본다.

안 오면 Vercel → 프로젝트 → Logs에서 `/api/notify-qna` 호출을 찾는다.

| 응답 | 원인 |
|------|------|
| 호출 자체가 없음 | 4번 웹훅이 등록되지 않았거나 URL이 틀렸다 |
| `401` | `x-webhook-secret` 헤더 값이 `QNA_WEBHOOK_SECRET`과 다르다 |
| `500 서버 환경변수` | 2번 환경변수가 빠졌거나 재배포하지 않았다 |
| `200 sent:0` | 그 교사가 5번을 하지 않았다 (구독이 없다) |

## 로컬에서는 확인할 수 없다

웹 푸시는 HTTPS를 요구하고, Supabase 웹훅이 `localhost`로 POST를 보낼 수 없다.
실제 확인은 Vercel에 배포한 뒤에 해야 한다.
````

- [ ] **Step 2: 매뉴얼에 교사용 안내를 넣는다**

`MANUAL.md`의 `### 누구의 질문이 보이나` 절 **바로 위**에 추가:

```markdown
### 새 질문 알림 받기 (교사 / 관리자)

담당 반 학생이 질문을 올리면 폰으로 알림을 받을 수 있습니다.

1. Q&A 화면 위쪽 **새 질문 알림** 칸에서 **알림 받기**를 누릅니다.
2. 브라우저가 물어보면 **허용**을 누릅니다.

> **아이폰은 한 단계가 더 필요합니다.** Safari에서 공유 버튼 → **홈 화면에 추가**를
> 한 뒤, 홈 화면의 아이콘으로 앱을 열어야 알림 버튼이 나옵니다. 홈 화면에서 앱을
> 지우면 알림도 함께 끊깁니다.

> 알림은 **기기 단위**입니다. 폰과 컴퓨터 양쪽에서 받으려면 각각 켜야 합니다.

> 알림에는 **학생 이름과 말머리까지만** 표시됩니다("홍길동 · 내신과제").
> 질문 내용은 앱을 열어야 보입니다. 잠금화면에 질문이 그대로 뜨지 않게 하기 위해서입니다.
```

- [ ] **Step 3: CLAUDE.md 기능 목록을 갱신한다**

`CLAUDE.md`의 기능 목록 표에서 4번 줄을 다음으로 바꾼다:

```markdown
| 4 | 공지사항 (카카오톡 알림톡) | ⬜ 예정 |
| 4-1 | 새 질문 알림 (웹 푸시 → 교사 폰) | ✅ 완료 |
```

- [ ] **Step 4: 문서 링크가 깨지지 않는지 확인한다**

Run: `npx vitest run && npm run lint && npm run build`
Expected: 전체 통과 (문서 변경이라 코드에는 영향 없음)

- [ ] **Step 5: 커밋**

```bash
git add docs/push-setup.md MANUAL.md CLAUDE.md
git commit -m "docs: 새 질문 알림 설정 절차와 교사용 안내"
```

---

## 배포 후 확인 (사람이 한다)

계획의 모든 Task를 마친 뒤, `docs/push-setup.md`를 따라 설정하고 다음을 확인한다.

- [ ] 안드로이드 또는 PC 교사 계정에서 알림 받기 → 학생이 질문 → 알림 도착
- [ ] 아이폰에서 홈 화면 추가 전에는 안내가 보이고 버튼이 없다
- [ ] 아이폰에서 홈 화면 추가 후 알림 받기 → 학생이 질문 → 알림 도착
- [ ] 알림에 질문 내용이 들어 있지 않다 (이름 · 말머리까지만)
- [ ] 알림을 누르면 Q&A 목록이 열린다
- [ ] 담당 반이 아닌 교사에게는 알림이 가지 않는다
