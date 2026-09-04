# Q&A 대화(스레드) 실행 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Q&A에서 학생과 교사가 사진을 붙여가며 여러 번 주고받을 수 있고, 학생이 추가 질문을 올리면 담당 교사 폰으로 알림이 간다.

**Architecture:** `qna_messages` 표를 새로 만들어 첫 질문 이후의 글을 쌓는다. "답변 완료" 판정을 `!q.answer`에서 "마지막 글을 누가 썼나"로 바꾸고, 그 규칙을 `qnaStatus` 순수 함수 하나에 모은다. 기존 `qna.answer`는 교사 메시지로 옮기고 비운다. 알림은 `qna_messages` INSERT에 웹훅을 하나 더 걸어 처리한다.

**Tech Stack:** React 19, Vite 8, Vercel Serverless Functions(Node), Supabase(Postgres + Storage + Database Webhooks), `web-push`, Vitest 4 + @testing-library/react

**Spec:** `docs/superpowers/specs/2026-09-04-qna-thread-design.md`

## Global Constraints

- 테스트 실행은 `npx vitest run` — `package.json`에 `test` 스크립트가 없다.
- 한글 주석을 쓴다. 주석은 "무엇을"이 아니라 "왜"를 적는다.
- 색상은 hex를 직접 쓰지 않고 `src/index.css`의 토큰 클래스를 쓴다 (`bg-ink`, `text-danger`, `border-line`, `bg-navy-soft` 등).
- 모서리는 `rounded`(4px), 뱃지만 `rounded-sm`(2px). 그림자 대신 `border border-line`.
- 컴포넌트 파일명은 PascalCase, 함수형 컴포넌트.
- API 함수는 판단 로직을 named export 순수 함수로 빼고 `default export handler`는 조립만 한다.
- 알림 문구에 **글 내용을 절대 넣지 않는다.** 잠금화면에 그대로 뜬다.
- 시각 표시는 반드시 `src/utils/datetime.js`의 `formatDate`/`formatDateTime`을 쓴다. 문자열을 직접 자르지 않는다.
- DB 쓰기 함수는 실패 시 `{ error }`를 돌려주고, 0건 처리도 실패로 친다. 화면은 그 사유를 보여준다.
- 커밋 메시지는 한글, `feat:` / `fix:` / `docs:` 접두사.

---

### Task 1: 답변 완료/대기 판정과 메시지 권한

화면·DB와 무관한 판단만 먼저 만든다. 지금 `!q.answer`로 흩어져 있는 규칙을 한곳에 모은다.

**Files:**
- Modify: `src/utils/qnaAccess.js`
- Modify: `src/utils/qnaAccess.test.js`

**Interfaces:**
- Consumes: 없음
- Produces:
  - `qnaStatus(question, messages) -> 'waiting' | 'answered'`
  - `unansweredCount(qnaList, students, classes, user, messages)` — **인자가 하나 늘었다**
  - `canDeleteMessage(message, question, students, classes, user) -> boolean`
  - `canEditMessage(message, user) -> boolean` — **본인 글만.** 삭제와 규칙이 다르다
  - `messages`는 앱 모양(camelCase): `{ id, qnaId, authorId, authorRole, content, imagePaths, createdAt }`

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`src/utils/qnaAccess.test.js` 맨 아래에 추가하고, 맨 위 import에 `qnaStatus`·`canDeleteMessage`·`canEditMessage`를 넣는다:

```js
describe('qnaStatus', () => {
  const q = { id: 100, studentId: 1 }
  const msg = (id, role, at) => ({ id, qnaId: 100, authorRole: role, createdAt: at })

  it('글이 없으면 답변 대기다', () => {
    expect(qnaStatus(q, [])).toBe('waiting')
  })

  it('마지막 글이 교사면 답변 완료다', () => {
    expect(qnaStatus(q, [
      msg(1, 'student', '2026-09-04T01:00:00Z'),
      msg(2, 'teacher', '2026-09-04T02:00:00Z'),
    ])).toBe('answered')
  })

  it('교사가 답한 뒤 학생이 되물으면 다시 답변 대기다', () => {
    // 추가 질문도 답을 기다리는 것이다. 이걸 완료로 두면 교사가 놓친다.
    expect(qnaStatus(q, [
      msg(1, 'teacher', '2026-09-04T02:00:00Z'),
      msg(2, 'student', '2026-09-04T03:00:00Z'),
    ])).toBe('waiting')
  })

  it('순서가 뒤섞여 들어와도 시각으로 마지막을 고른다', () => {
    expect(qnaStatus(q, [
      msg(2, 'student', '2026-09-04T03:00:00Z'),
      msg(1, 'teacher', '2026-09-04T02:00:00Z'),
    ])).toBe('waiting')
  })

  it('다른 질문의 글은 보지 않는다', () => {
    expect(qnaStatus(q, [
      { id: 9, qnaId: 999, authorRole: 'teacher', createdAt: '2026-09-04T05:00:00Z' },
    ])).toBe('waiting')
  })
})

describe('unansweredCount (대화 기준)', () => {
  const messages = [
    // 100번(가)은 교사가 답했다 → 완료
    { id: 1, qnaId: 100, authorRole: 'teacher', createdAt: '2026-09-04T02:00:00Z' },
    // 200번(나)은 교사가 답한 뒤 학생이 되물었다 → 대기
    { id: 2, qnaId: 200, authorRole: 'teacher', createdAt: '2026-09-04T02:00:00Z' },
    { id: 3, qnaId: 200, authorRole: 'student', createdAt: '2026-09-04T03:00:00Z' },
  ]

  it('마지막 글이 학생인 질문을 미답변으로 센다', () => {
    // t1은 A반(가)만 본다 → 100번은 완료이므로 0건
    expect(unansweredCount(QNA, STUDENTS, CLASSES, { id: 't1', role: 'teacher' }, messages)).toBe(0)
    // t2는 B반(나)만 본다 → 200번은 되물음 상태이므로 1건
    expect(unansweredCount(QNA, STUDENTS, CLASSES, { id: 't2', role: 'teacher' }, messages)).toBe(1)
  })

  it('글이 하나도 없으면 전부 미답변이다', () => {
    expect(unansweredCount(QNA, STUDENTS, CLASSES, { id: 'a', role: 'admin' }, [])).toBe(3)
  })
})

describe('canDeleteMessage', () => {
  const question = { id: 100, studentId: 1 }
  const msg = (authorId, role) => ({ id: 1, qnaId: 100, authorId, authorRole: role })
  const can = (m, user) => canDeleteMessage(m, question, STUDENTS, CLASSES, user)

  it('학생은 본인이 쓴 글을 지울 수 있다', () => {
    expect(can(msg('s1', 'student'), { id: 's1', role: 'student', studentId: 1 })).toBe(true)
  })

  it('학생은 선생님 글을 지울 수 없다', () => {
    expect(can(msg('t1', 'teacher'), { id: 's1', role: 'student', studentId: 1 })).toBe(false)
  })

  it('교사는 그 스레드의 학생 글도 지울 수 있다', () => {
    // 부적절한 사진을 지울 사람이 필요하다. 질문 전체를 지우면 대화가 통째로 사라진다.
    expect(can(msg('s1', 'student'), { id: 't1', role: 'teacher' })).toBe(true)
  })

  it('담당 반이 아닌 교사는 지울 수 없다', () => {
    expect(can(msg('s1', 'student'), { id: 't2', role: 'teacher' })).toBe(false)
  })

  it('로그인 정보나 글이 없으면 지울 수 없다', () => {
    expect(can(msg('s1', 'student'), null)).toBe(false)
    expect(canDeleteMessage(null, question, STUDENTS, CLASSES, { id: 'a', role: 'admin' })).toBe(false)
  })
})

describe('canEditMessage', () => {
  const msg = (authorId) => ({ id: 1, qnaId: 100, authorId, authorRole: 'student' })

  it('본인이 쓴 글은 고칠 수 있다', () => {
    expect(canEditMessage(msg('s1'), { id: 's1', role: 'student', studentId: 1 })).toBe(true)
  })

  it('교사여도 남의 글은 고칠 수 없다', () => {
    // 지우는 건 관리를 위해 필요하지만, 남의 말을 고쳐 쓰는 건 다른 얘기다.
    // 부적절한 글은 지우면 된다.
    expect(canEditMessage(msg('s1'), { id: 't1', role: 'teacher' })).toBe(false)
    expect(canEditMessage(msg('s1'), { id: 'a', role: 'admin' })).toBe(false)
  })

  it('로그인 정보나 글이 없으면 고칠 수 없다', () => {
    expect(canEditMessage(msg('s1'), null)).toBe(false)
    expect(canEditMessage(null, { id: 's1', role: 'student' })).toBe(false)
  })
})
```

- [ ] **Step 2: 테스트를 돌려 실패를 확인한다**

Run: `npx vitest run src/utils/qnaAccess.test.js`
Expected: FAIL — `qnaStatus is not a function`, `canDeleteMessage is not a function`, `canEditMessage is not a function`

- [ ] **Step 3: 구현한다**

`src/utils/qnaAccess.js`의 `unansweredCount`를 아래로 교체하고, 두 함수를 추가한다:

```js
// 이 질문이 답을 기다리는 중인가.
//
// 예전에는 "답변 칸이 비었나"로 판정했다. 이제 대화가 오가므로
// "마지막 글을 누가 썼나"로 본다 — 교사가 답한 뒤 학생이 되물으면
// 그건 다시 답을 기다리는 상태다. 완료로 두면 교사가 놓친다.
export function qnaStatus(question, messages = []) {
  const mine = messages.filter((m) => m.qnaId === question.id)
  if (mine.length === 0) return 'waiting'

  // 목록이 어떤 순서로 들어오든 시각으로 마지막을 고른다
  const last = mine.reduce((a, b) => (a.createdAt > b.createdAt ? a : b))
  return last.authorRole === 'teacher' ? 'answered' : 'waiting'
}

// 교사 화면·대시보드에 띄우는 "지금 답해야 할" 건수
export function unansweredCount(qnaList = [], students = [], classes = [], user, messages = []) {
  return visibleQuestions(qnaList, students, classes, user)
    .filter((q) => qnaStatus(q, messages) === 'waiting')
    .length
}

// 이 글을 지울 수 있는가.
//
//   학생   — 본인이 쓴 글만
//   교사   — 담당 반 학생의 스레드에 달린 모든 글 (학생 글 포함)
//   관리자 — 전체
//
// 교사가 학생 글도 지울 수 있어야 하는 이유: 부적절한 사진을 지울 사람이
// 필요하다. 질문 전체를 지우면 대화가 통째로 사라진다.
export function canDeleteMessage(message, question, students = [], classes = [], user) {
  if (!user || !message || !question) return false

  if (user.role === 'student') {
    if (!user.studentId) return false
    return message.authorRole === 'student' && message.authorId === user.id
  }

  const ids = new Set(visibleStudents(students, classes, user).map((s) => s.id))
  return ids.has(question.studentId)
}

// 이 글을 고칠 수 있는가 — 본인 글만.
//
// 삭제와 규칙이 다르다. 부적절한 글을 치우려면 교사가 남의 글도 지울 수 있어야
// 하지만, 남이 한 말을 고쳐 쓰는 건 다른 얘기다. 문제가 있으면 지우면 된다.
export function canEditMessage(message, user) {
  if (!user || !message) return false
  return message.authorId === user.id
}
```

- [ ] **Step 4: 테스트를 돌려 통과를 확인한다**

Run: `npx vitest run src/utils/qnaAccess.test.js`
Expected: PASS

- [ ] **Step 5: 전체 테스트와 린트를 돌린다**

Run: `npx vitest run && npm run lint`
Expected: 전체 통과. `unansweredCount`에 5번째 인자를 안 넘기는 기존 호출부(`QnA.jsx:55`, `Dashboard.jsx:36`)는 빈 배열 기본값으로 동작하므로 아직 깨지지 않는다(Task 5에서 넘긴다).

- [ ] **Step 6: 커밋**

```bash
git add src/utils/qnaAccess.js src/utils/qnaAccess.test.js
git commit -m "feat: 대화의 마지막 글로 답변 완료를 판정한다"
```

---

### Task 2: 표와 정책, 기존 답변 옮기기

**Files:**
- Create: `docs/qna-messages.sql`

**Interfaces:**
- Consumes: 없음
- Produces: `public.qna_messages` 표. 앱이 읽는 칸 이름은 `id, qna_id, author_id, author_role, content, image_paths, created_at`

- [ ] **Step 1: SQL 파일을 만든다**

`docs/qna-messages.sql`:

````sql
-- docs/qna-messages.sql
-- Q&A를 주고받는 대화로 바꾼다.
--
-- Supabase → SQL Editor에 통째로 붙여넣고 실행한다. 여러 번 실행해도 안전하다.
--
-- 실행하지 않으면 화면에 글쓰기 칸은 보이지만 등록이 실패한다.
--
-- 먼저 실행돼 있어야 하는 것:
--   docs/qna-category.sql   (is_qna_staff, can_see_qna_author)
--   docs/qna-private.sql    (학생 = 본인만)
--   docs/qna-images.sql     (qna_image_owner, my_qna_student_id, 사진 버킷)
--   docs/qna-delete.sql     (학생 본인 삭제)

-- ── 1. 대화 표 ───────────────────────────────────────────────
create table if not exists public.qna_messages (
  id          bigint generated always as identity primary key,
  -- 질문을 지우면 대화도 함께 사라진다
  qna_id      bigint      not null references public.qna(id) on delete cascade,
  -- 계정을 지워도 글은 남는다. 누가 썼는지만 알 수 없게 된다.
  author_id   uuid        references public.profiles(id) on delete set null,
  -- 역할을 따로 적어 두는 이유: 나중에 그 사람의 역할이 바뀌거나 계정이
  -- 지워져도, 그때 누가 쓴 글이었는지가 남아야 한다.
  -- 화면의 좌우 배치와 답변 완료 판정이 이 값을 본다.
  author_role text        not null check (author_role in ('student', 'teacher')),
  content     text        not null,
  image_paths jsonb       not null default '[]'::jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists qna_messages_qna_idx
  on public.qna_messages (qna_id, created_at);

-- ── 2. 접근 정책 ─────────────────────────────────────────────
alter table public.qna_messages enable row level security;

-- 부모 질문을 볼 수 있으면 그 대화도 볼 수 있다
drop policy if exists qna_msg_select on public.qna_messages;
create policy qna_msg_select on public.qna_messages
for select to authenticated
using (exists (
  select 1 from public.qna q
  where q.id = qna_id and public.can_see_qna_author(q.student_id)
));

-- 쓰기: 볼 수 있는 스레드에만, 본인 이름으로만
drop policy if exists qna_msg_insert on public.qna_messages;
create policy qna_msg_insert on public.qna_messages
for insert to authenticated
with check (
  author_id = auth.uid()
  and exists (
    select 1 from public.qna q
    where q.id = qna_id and public.can_see_qna_author(q.student_id)
  )
);

-- 수정·삭제: 본인 글이거나, 교사·관리자가 볼 수 있는 스레드의 글
drop policy if exists qna_msg_modify on public.qna_messages;
create policy qna_msg_modify on public.qna_messages
for update to authenticated
using (
  author_id = auth.uid()
  or (public.is_qna_staff() and exists (
    select 1 from public.qna q
    where q.id = qna_id and public.can_see_qna_author(q.student_id)
  ))
);

drop policy if exists qna_msg_delete on public.qna_messages;
create policy qna_msg_delete on public.qna_messages
for delete to authenticated
using (
  author_id = auth.uid()
  or (public.is_qna_staff() and exists (
    select 1 from public.qna q
    where q.id = qna_id and public.can_see_qna_author(q.student_id)
  ))
);

-- ── 3. 기존 답변 옮기기 ──────────────────────────────────────
-- 이미 달린 답변을 교사 메시지로 옮긴다. 여러 번 실행해도 중복되지 않게
-- 아직 안 옮긴 것만 고른다.
insert into public.qna_messages (qna_id, author_id, author_role, content, created_at)
select q.id, q.answered_by, 'teacher', q.answer, coalesce(q.answered_at, now())
from public.qna q
where q.answer is not null
  and not exists (
    select 1 from public.qna_messages m
    where m.qna_id = q.id and m.author_role = 'teacher'
  );

-- 옮긴 답변은 원래 칸에서 비운다. 두 곳에 남으면 화면이 둘 다 그려
-- 답변이 두 번 보이고, 어느 쪽이 진짜인지 알 수 없게 된다.
-- 칸 자체는 남겨 둔다 — 문제가 생겼을 때 되돌릴 여지를 두고, 안정되면 지운다.
update public.qna
set answer = null, answered_at = null, answered_by = null
where answer is not null;

-- ── 4. 교사도 사진을 올릴 수 있게 ────────────────────────────
-- 지금 qna_img_write는 "본인 폴더만"이라 교사가 사진을 올릴 수 없다.
-- 사진은 그 스레드 학생의 폴더에 넣으므로(읽기 정책이 그 기준이다),
-- 교사·관리자가 볼 수 있는 학생의 폴더에 쓸 수 있게 넓힌다.
drop policy if exists qna_img_write on storage.objects;
create policy qna_img_write on storage.objects
for insert to authenticated
with check (
  bucket_id = 'qna-images'
  and (
    public.qna_image_owner(name) = public.my_qna_student_id()
    or (public.is_qna_staff() and public.can_see_qna_author(public.qna_image_owner(name)))
  )
);

-- ── 확인 ─────────────────────────────────────────────────────
-- 정책 4개가 나와야 한다
select policyname, cmd from pg_policies
where schemaname = 'public' and tablename = 'qna_messages'
order by policyname;

-- 옮겨진 답변 수. 아래가 0이어야 한다 (남은 옛 답변 없음)
select count(*) as 안_옮겨진_답변 from public.qna where answer is not null;
````

- [ ] **Step 2: 사람이 실행한다**

Supabase → SQL Editor에서 `docs/qna-messages.sql`을 실행한다.
Expected: 정책 4줄(`qna_msg_delete` / `qna_msg_insert` / `qna_msg_modify` / `qna_msg_select`), `안_옮겨진_답변`이 `0`

- [ ] **Step 3: 커밋**

```bash
git add docs/qna-messages.sql
git commit -m "feat: Q&A 대화 표와 정책"
```

---

### Task 3: 데이터 계층 — 메시지 읽기·쓰기

**Files:**
- Modify: `src/context/DataContext.jsx`

**Interfaces:**
- Consumes: `qna_messages` 표 (Task 2), `resizeQnaImage`/`qnaImagePath`/`qnaImageToken` (기존 `src/utils/qnaImage.js`)
- Produces (Provider value):
  - `qnaMessages` — `{ id, qnaId, authorId, authorRole, content, imagePaths, createdAt }[]`
  - `addQnaMessage({ qnaId, authorId, authorRole, content, imagePaths }) -> { message } | { error }`
  - `updateQnaMessage(id, content) -> {} | { error }`
  - `deleteQnaMessage(id, imagePaths) -> {} | { error }`
  - `uploadQnaImage(file, studentId)` — 기존 함수를 그대로 쓴다 (교사도 그 스레드 학생의 폴더에 올린다)
  - `answerQuestion`·`deleteAnswer`는 **삭제한다**

- [ ] **Step 1: 매퍼와 상태를 추가한다**

`toSubmission` 함수 바로 아래에 추가:

```js
function toQnaMessage(m) {
  return {
    id:         m.id,
    qnaId:      m.qna_id,
    authorId:   m.author_id,
    authorRole: m.author_role,
    content:    m.content,
    imagePaths: m.image_paths ?? [],
    createdAt:  m.created_at,
  }
}
```

`const [qnaList, setQnaList] = useState([])` 바로 아래에 추가:

```js
  const [qnaMessages,  setQnaMessages]  = useState([])
```

- [ ] **Step 2: 초기 로드에 넣는다**

`Promise.all` 배열의 `supabase.from('qna')...` 줄 바로 아래에 추가:

```js
          supabase.from('qna_messages').select('*').order('created_at'),
```

배열 구조분해에서 `qRes,` 바로 뒤에 `qmRes,`를 넣는다:

```js
      const [cRes, sRes, aRes, gRes, qRes, qmRes, nRes, rRes, pRes, vRes, vcRes, tRes, subRes, hwSetsRes, hwDaysRes, hwQRes, hwSubRes, wnRes, saRes] =
```

`const qRows = ...` 줄 바로 아래에 추가:

```js
      const qmRows = rowsOrNull(qmRes); if (qmRows) setQnaMessages(qmRows.map(toQnaMessage))
```

- [ ] **Step 3: `answerQuestion`과 `deleteAnswer`를 지우고 메시지 함수로 바꾼다**

두 함수를 통째로 지우고 그 자리에 넣는다:

```js
  // ── Q&A 대화 ───────────────────────────────────────────

  // 첫 질문 다음에 오가는 글을 한 줄 추가한다.
  // 학생의 추가 질문과 교사의 답변이 같은 함수를 쓴다 — 화면만 다르고
  // 저장되는 모양은 같다.
  async function addQnaMessage({ qnaId, authorId, authorRole, content, imagePaths = [] }) {
    const { data: inserted, error } = await supabase
      .from('qna_messages')
      .insert([{
        qna_id:      qnaId,
        author_id:   authorId,
        author_role: authorRole,
        content,
        image_paths: imagePaths,
      }])
      .select()
      .single()

    if (error) { console.error('Q&A 글 등록 실패:', error); return { error: error.message } }
    const newMsg = toQnaMessage(inserted)
    setQnaMessages((prev) => [...prev, newMsg])
    return { message: newMsg }
  }

  async function updateQnaMessage(id, content) {
    const { data: updated, error } = await supabase
      .from('qna_messages')
      .update({ content })
      .eq('id', id)
      .select()

    if (error) { console.error('Q&A 글 수정 실패:', error); return { error: error.message } }
    if (!updated?.length) {
      console.error('Q&A 글 수정 실패: 0 rows updated (RLS 정책 확인 필요)')
      return { error: '이 글을 고칠 권한이 없습니다.' }
    }

    setQnaMessages((prev) => prev.map((m) => m.id === id ? { ...m, content } : m))
    return {}
  }

  // 글을 먼저 지우고 사진을 나중에 지운다. 반대로 하면 사진 삭제 후
  // 글 삭제가 실패했을 때 이미지가 깨진 글이 남는다.
  async function deleteQnaMessage(id, imagePaths = []) {
    const { data: deleted, error } = await supabase
      .from('qna_messages').delete().eq('id', id).select()

    if (error) { console.error('Q&A 글 삭제 실패:', error); return { error: error.message } }
    if (!deleted?.length) {
      console.error('Q&A 글 삭제 실패: 0 rows deleted (RLS 정책 확인 필요)')
      return { error: '이 글을 지울 권한이 없습니다.' }
    }

    if (imagePaths.length > 0) {
      const { error: imgError } = await supabase.storage.from('qna-images').remove(imagePaths)
      if (imgError) console.error('Q&A 글 사진 삭제 실패(글은 삭제됨):', imgError)
    }

    setQnaMessages((prev) => prev.filter((m) => m.id !== id))
    return {}
  }
```

- [ ] **Step 4: 질문을 지울 때 대화의 사진도 함께 지운다**

`deleteQuestion` 안에서 사진을 지우는 부분을 아래로 바꾼다. 표는 `on delete cascade`로
따라 지워지지만 **스토리지 파일은 자동으로 안 지워진다.**

```js
    // 대화에 붙은 사진까지 모아서 지운다. 표는 cascade로 따라 지워지지만
    // 스토리지 파일은 아무도 안 지워 준다.
    const threadPaths = qnaMessages
      .filter((m) => m.qnaId === id)
      .flatMap((m) => m.imagePaths ?? [])
    const allPaths = [...imagePaths, ...threadPaths]

    if (allPaths.length > 0) {
      const { error: imgError } = await supabase.storage.from('qna-images').remove(allPaths)
      if (imgError) console.error('질문 사진 삭제 실패(질문은 삭제됨):', imgError)
    }

    setQnaList((prev) => prev.filter((q) => q.id !== id))
    setQnaMessages((prev) => prev.filter((m) => m.qnaId !== id))
    return {}
```

- [ ] **Step 5: Provider value를 고친다**

`addQuestion, answerQuestion, deleteAnswer, deleteQuestion, uploadQnaImage, qnaImageUrl,` 줄을 아래로 교체:

```js
      addQuestion, deleteQuestion, uploadQnaImage, qnaImageUrl,
      qnaMessages, addQnaMessage, updateQnaMessage, deleteQnaMessage,
```

- [ ] **Step 6: 빌드가 깨지는 곳을 확인한다**

Run: `npm run build`
Expected: FAIL — `QnA.jsx`가 없어진 `answerQuestion`·`deleteAnswer`를 쓴다. Task 4에서 고친다.

- [ ] **Step 7: 커밋하지 않고 Task 4로 넘어간다**

화면이 깨진 상태라 여기서 끊으면 동작하지 않는 커밋이 남는다. Task 4와 함께 커밋한다.

---

### Task 4: 상세 화면을 대화로

**Files:**
- Create: `src/components/qna/QnaImagePicker.jsx`
- Modify: `src/pages/QnA.jsx`
- Modify: `src/pages/QnA.test.jsx`

**Interfaces:**
- Consumes: Task 1의 `qnaStatus`·`canDeleteMessage`·`canEditMessage`, Task 3의 `qnaMessages`·`addQnaMessage`·`updateQnaMessage`·`deleteQnaMessage`
- Produces: `<QnaImagePicker photos onChange error />` — 질문 작성 화면과 대화 글쓰기 칸이 함께 쓰는 사진 첨부 부품

- [ ] **Step 1: 사진 첨부 부품을 떼어낸다**

지금 `AskView` 안에 있는 사진 첨부 UI(`qna-photo-*` testid들)를 그대로 옮긴다.
질문 작성과 대화 글쓰기 두 곳에서 같은 부품을 써야 하므로 파일로 뺀다.

`src/components/qna/QnaImagePicker.jsx`:

```jsx
// src/components/qna/QnaImagePicker.jsx
// 사진을 고르고 미리보기로 보여주는 칸.
//
// 질문 작성 화면과 대화 글쓰기 칸이 같은 부품을 쓴다. 두 곳에 따로 적으면
// 장수 제한이나 안내 문구가 한쪽만 바뀐다.
//
// 실제 업로드는 등록을 누를 때 부모가 한다. 고를 때마다 올리면
// 뺐다 넣었다 한 사진이 스토리지에 쓰레기로 남는다.
import { useRef, useEffect } from 'react'
import { Camera, X } from 'lucide-react'
import { MAX_QNA_IMAGES, validateQnaImage } from '../../utils/qnaImage'

export default function QnaImagePicker({ photos, onChange, error, onError }) {
  const fileInputRef = useRef(null)
  const photosRef = useRef(photos)
  photosRef.current = photos

  // 미리보기 주소는 브라우저가 붙들고 있으므로 화면을 떠날 때 놓아준다
  useEffect(() => () => photosRef.current.forEach((p) => URL.revokeObjectURL(p.preview)), [])

  function handlePick(e) {
    const picked = Array.from(e.target.files ?? [])
    // 같은 사진을 뺐다가 다시 고를 수 있게 입력칸을 비운다
    e.target.value = ''

    const next = [...photos]
    let firstReason = ''
    for (const file of picked) {
      const reason = validateQnaImage(file, next.length)
      // 한 장이 걸려도 나머지는 받는다. 사유는 처음 것만 보여준다.
      if (reason) { firstReason ||= reason; continue }
      next.push({ file, preview: URL.createObjectURL(file) })
    }
    onChange(next)
    onError(firstReason)
  }

  function removePhoto(index) {
    URL.revokeObjectURL(photos[index].preview)
    onChange(photos.filter((_, i) => i !== index))
    onError('')
  }

  return (
    <div>
      <div className="flex gap-2 flex-wrap">
        {photos.map((p, i) => (
          <div
            key={p.preview}
            data-testid={`qna-photo-${i}`}
            className="relative w-20 h-20 rounded border border-line overflow-hidden"
          >
            <img src={p.preview} alt={`첨부 사진 ${i + 1}`} className="w-full h-full object-cover" />
            <button
              type="button"
              data-testid={`qna-photo-remove-${i}`}
              onClick={() => removePhoto(i)}
              aria-label={`첨부 사진 ${i + 1} 빼기`}
              className="absolute top-0 right-0 bg-ink/70 text-white p-0.5 rounded-bl"
            >
              <X size={14} aria-hidden="true" />
            </button>
          </div>
        ))}

        {photos.length < MAX_QNA_IMAGES && (
          <button
            type="button"
            data-testid="qna-photo-add"
            onClick={() => fileInputRef.current?.click()}
            className="w-20 h-20 rounded border border-line border-dashed text-ink-mute flex flex-col items-center justify-center gap-1 hover:bg-surface-alt transition-colors"
          >
            <Camera size={18} aria-hidden="true" />
            <span className="text-xs">사진 추가</span>
          </button>
        )}
      </div>

      {/* accept 덕분에 폰에서 카메라와 앨범을 바로 고를 수 있다 */}
      <input
        ref={fileInputRef}
        data-testid="qna-photo-input"
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handlePick}
      />

      {error && (
        <p data-testid="qna-photo-error" className="text-xs text-danger mt-2">{error}</p>
      )}
    </div>
  )
}
```

- [ ] **Step 2: 대화 화면 테스트를 쓴다**

`src/pages/QnA.test.jsx`의 기존 `describe('답변 수정·삭제', ...)` 블록을 통째로 지우고
아래로 바꾼다. `beforeEach`의 `state.data`에 `qnaMessages: []`,
`addQnaMessage: vi.fn().mockResolvedValue({ message: { id: 1 } })`,
`updateQnaMessage: vi.fn().mockResolvedValue({})`,
`deleteQnaMessage: vi.fn().mockResolvedValue({})`를 추가하고 `answerQuestion`은 지운다.

```jsx
describe('Q&A 대화', () => {
  beforeEach(() => {
    state.data.qnaList = [
      { id: 100, category: 'naesin', studentId: 1, content: '3번 문제요',
        createdAt: '2026-09-04T00:00:00Z', imagePaths: [] },
    ]
    state.data.qnaMessages = [
      { id: 1, qnaId: 100, authorId: 't1', authorRole: 'teacher',
        content: '지문 2단락을 보세요', imagePaths: [], createdAt: '2026-09-04T01:00:00Z' },
    ]
  })

  it('첫 질문과 이후 글이 함께 보인다', async () => {
    const user = userEvent.setup()
    render(<QnA />)
    await user.click(screen.getByTestId('question-100'))

    expect(screen.getByText('3번 문제요')).toBeInTheDocument()
    expect(screen.getByText('지문 2단락을 보세요')).toBeInTheDocument()
  })

  it('교사가 글을 이어서 쓴다', async () => {
    const user = userEvent.setup()
    render(<QnA />)
    await user.click(screen.getByTestId('question-100'))
    await user.type(screen.getByPlaceholderText(/이어서/), '3번은 다음 시간에 다룹니다')
    await user.click(screen.getByRole('button', { name: '등록' }))

    await waitFor(() => expect(state.data.addQnaMessage).toHaveBeenCalledWith({
      qnaId:      100,
      authorId:   't1',
      authorRole: 'teacher',
      content:    '3번은 다음 시간에 다룹니다',
      imagePaths: [],
    }))
  })

  it('학생이 되물으면 authorRole이 student로 간다', async () => {
    const user = userEvent.setup()
    state.user = { id: 's1', role: 'student', studentId: 1, classId: 10 }
    render(<QnA />)
    await user.click(screen.getByTestId('question-100'))
    await user.type(screen.getByPlaceholderText(/이어서/), '그럼 4번은요?')
    await user.click(screen.getByRole('button', { name: '등록' }))

    await waitFor(() => expect(state.data.addQnaMessage).toHaveBeenCalledWith(
      expect.objectContaining({ authorRole: 'student', authorId: 's1' })))
  })

  it('등록에 실패하면 쓴 내용이 남고 사유를 보여준다', async () => {
    const user = userEvent.setup()
    state.data.addQnaMessage = vi.fn().mockResolvedValue({ error: '권한이 없습니다' })
    render(<QnA />)
    await user.click(screen.getByTestId('question-100'))
    await user.type(screen.getByPlaceholderText(/이어서/), '테스트')
    await user.click(screen.getByRole('button', { name: '등록' }))

    expect(await screen.findByTestId('message-error')).toHaveTextContent('권한')
    expect(screen.getByPlaceholderText(/이어서/)).toHaveValue('테스트')
  })

  it('교사는 대화의 글을 지울 수 있다', async () => {
    const user = userEvent.setup()
    render(<QnA />)
    await user.click(screen.getByTestId('question-100'))
    await user.click(screen.getByTestId('message-delete-1'))
    await user.click(screen.getByTestId('message-delete-confirm'))

    await waitFor(() => expect(state.data.deleteQnaMessage).toHaveBeenCalledWith(1, []))
  })

  it('학생은 선생님 글을 지울 수 없다', async () => {
    const user = userEvent.setup()
    state.user = { id: 's1', role: 'student', studentId: 1, classId: 10 }
    render(<QnA />)
    await user.click(screen.getByTestId('question-100'))

    expect(screen.queryByTestId('message-delete-1')).not.toBeInTheDocument()
  })

  it('본인이 쓴 글은 고쳐서 저장한다', () => {
    // 어제까지 있던 "답변 수정"을 대화에서도 그대로 쓸 수 있어야 한다
    return (async () => {
      const user = userEvent.setup()
      render(<QnA />)
      await user.click(screen.getByTestId('question-100'))
      await user.click(screen.getByTestId('message-edit-1'))

      const box = screen.getByDisplayValue('지문 2단락을 보세요')
      await user.clear(box)
      await user.type(box, '지문 3단락이 근거입니다')
      await user.click(screen.getByRole('button', { name: '수정 저장' }))

      await waitFor(() => expect(state.data.updateQnaMessage)
        .toHaveBeenCalledWith(1, '지문 3단락이 근거입니다'))
    })()
  })

  it('교사여도 학생 글은 고칠 수 없다 — 지우는 것만 된다', async () => {
    const user = userEvent.setup()
    state.data.qnaMessages = [
      { id: 2, qnaId: 100, authorId: 's1', authorRole: 'student',
        content: '그럼 4번은요?', imagePaths: [], createdAt: '2026-09-04T02:00:00Z' },
    ]
    render(<QnA />)
    await user.click(screen.getByTestId('question-100'))

    expect(screen.queryByTestId('message-edit-2')).not.toBeInTheDocument()
    expect(screen.getByTestId('message-delete-2')).toBeInTheDocument()
  })

  it('마지막 글이 학생이면 목록에 답변 대기로 나온다', () => {
    state.data.qnaMessages = [
      ...state.data.qnaMessages,
      { id: 2, qnaId: 100, authorId: 's1', authorRole: 'student',
        content: '그럼 4번은요?', imagePaths: [], createdAt: '2026-09-04T02:00:00Z' },
    ]
    render(<QnA />)
    expect(screen.getByTestId('question-100')).toHaveTextContent('답변 대기')
  })
})
```

- [ ] **Step 3: 테스트를 돌려 실패를 확인한다**

Run: `npx vitest run src/pages/QnA.test.jsx`
Expected: FAIL — 글쓰기 칸과 대화 표시가 아직 없다

- [ ] **Step 4: `QnA.jsx`를 고친다**

`DetailView`에서 답변 관련 부분(`answerText`, `handleAnswer`, `editing`, `startEdit`,
`saveEdit`, `removeAnswer`, 답변 표시 블록, 답변 작성 폼)을 전부 걷어내고, 대화를 그린다.

바뀌는 지점:

```jsx
// 상단 useData
const {
  qnaList, students, classes,
  addQuestion, deleteQuestion, uploadQnaImage, qnaImageUrl,
  qnaMessages, addQnaMessage, updateQnaMessage, deleteQnaMessage,
} = useData()

// 목록 배지
{qnaStatus(q, qnaMessages) === 'answered' ? (
  <Badge tone="navy" className="shrink-0 ml-2">답변 완료</Badge>
) : (
  <Badge tone="warn" className="shrink-0 ml-2">답변 대기</Badge>
)}

// 미답변 건수
const unanswered = unansweredCount(qnaList, students, classes, user, qnaMessages)

// DetailView에 넘기는 props (기존 onAnswer·onUpdateAnswer·onDeleteAnswer 대신)
messages={qnaMessages.filter((m) => m.qnaId === selectedQuestion.id)
                     .sort((a, b) => a.createdAt.localeCompare(b.createdAt))}
canDeleteMessageOf={(m) => canDeleteMessage(m, selectedQuestion, students, classes, user)}
canEditMessageOf={(m) => canEditMessage(m, user)}
onSendMessage={async ({ content, photos }) => {
  // 사진부터 올린다. 한 장이라도 실패하면 글을 등록하지 않는다 —
  // "사진 보고 답해 주세요"라고 쓴 글만 올라가면 소용이 없다.
  const imagePaths = []
  for (const { file } of photos) {
    const path = await uploadQnaImage(file, selectedQuestion.studentId)
    if (!path) return '사진을 올리지 못했습니다. 잠시 후 다시 시도해 주세요.'
    imagePaths.push(path)
  }
  const res = await addQnaMessage({
    qnaId:      selectedQuestion.id,
    authorId:   user.id,
    authorRole: isTeacherOrAdmin ? 'teacher' : 'student',
    content,
    imagePaths,
  })
  return res?.error ?? null
}}
onDeleteMessage={async (m) => {
  const res = await deleteQnaMessage(m.id, m.imagePaths ?? [])
  return res?.error ?? null
}}
onUpdateMessage={async (m, content) => {
  const res = await updateQnaMessage(m.id, content)
  return res?.error ?? null
}}
```

`DetailView` 안의 대화 영역:

```jsx
{/* 대화 */}
<div className="flex flex-col gap-3 mb-4">
  {messages.map((m) => (
    <div
      key={m.id}
      data-testid={`message-${m.id}`}
      className={m.authorRole === 'teacher'
        ? 'bg-navy-soft border border-line rounded p-4'
        : 'bg-surface border border-line rounded p-4'}
    >
      <div className="flex justify-between items-start mb-2">
        <p className="text-xs font-semibold text-ink-soft">
          {m.authorRole === 'teacher' ? '선생님' : displayName(question.studentId)}
        </p>
        <div className="flex gap-2">
          {/* 고치는 건 본인 글만. 남의 말을 고쳐 쓰는 건 지우는 것과 다른 얘기다. */}
          {canEditMessageOf(m) && editingId !== m.id && (
            <button
              type="button"
              data-testid={`message-edit-${m.id}`}
              onClick={() => { setEditingId(m.id); setEditText(m.content); setMessageError('') }}
              className="text-xs text-ink-faint hover:text-ink-soft transition-colors"
            >
              수정
            </button>
          )}
          {canDeleteMessageOf(m) && (
            <button
              type="button"
              data-testid={`message-delete-${m.id}`}
              onClick={() => setConfirmingMessage(m)}
              className="text-xs text-ink-faint hover:text-danger transition-colors"
            >
              삭제
            </button>
          )}
        </div>
      </div>

      {editingId === m.id ? (
        <div>
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            rows={4}
            className="w-full border border-line rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy resize-none mb-2"
          />
          <div className="flex gap-2">
            <Button onClick={() => handleEditSave(m)} disabled={!editText.trim() || messageBusy} className="flex-1">
              {messageBusy ? '저장 중...' : '수정 저장'}
            </Button>
            <button
              type="button"
              onClick={() => { setEditingId(null); setMessageError('') }}
              disabled={messageBusy}
              className="text-sm border border-line rounded px-4 hover:bg-surface-alt transition-colors"
            >
              취소
            </button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap">{m.content}</p>
      )}

      {/* 사진은 수정 대상이 아니다. 바꾸려면 글을 지우고 다시 쓴다 —
          수정 중에 사진까지 갈아 끼우게 만들면 중간에 실패했을 때
          글과 사진이 어긋난 상태로 남는다. */}
      <QuestionPhotos paths={m.imagePaths} qnaImageUrl={qnaImageUrl} />
      <p className="text-xs text-ink-mute mt-2">{formatDateTime(m.createdAt)}</p>
    </div>
  ))}
</div>

{/* 삭제 확인 */}
{confirmingMessage && (
  <div className="border border-line rounded p-3 mb-4 flex items-center gap-2">
    <p className="text-sm text-ink-soft flex-1">이 글을 삭제할까요? 붙은 사진도 함께 지워집니다.</p>
    <button
      type="button"
      data-testid="message-delete-confirm"
      onClick={handleDeleteMessage}
      disabled={messageBusy}
      className="text-xs bg-danger text-white rounded px-3 py-2"
    >
      {messageBusy ? '삭제 중...' : '삭제'}
    </button>
    <button
      type="button"
      onClick={() => setConfirmingMessage(null)}
      disabled={messageBusy}
      className="text-xs border border-line rounded px-3 py-2 hover:bg-surface-alt transition-colors"
    >
      취소
    </button>
  </div>
)}

{/* 글쓰기 — 학생·교사가 같은 칸을 쓴다 */}
<div className="bg-surface border border-line rounded p-4">
  <textarea
    value={draft}
    onChange={(e) => setDraft(e.target.value)}
    placeholder="이어서 쓸 내용을 입력하세요"
    rows={3}
    className="w-full border border-line rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy resize-none mb-3"
  />
  <QnaImagePicker
    photos={draftPhotos}
    onChange={setDraftPhotos}
    error={photoError}
    onError={setPhotoError}
  />
  {messageError && (
    <p data-testid="message-error" className="text-xs text-danger mt-2">
      등록하지 못했습니다. 사유: {messageError}
    </p>
  )}
  <Button onClick={handleSend} disabled={!draft.trim() || messageBusy} className="w-full mt-3">
    {messageBusy ? '등록 중...' : '등록'}
  </Button>
</div>
```

`DetailView`에 필요한 상태와 핸들러:

```jsx
const [draft,             setDraft]             = useState('')
const [draftPhotos,       setDraftPhotos]       = useState([])
const [photoError,        setPhotoError]        = useState('')
const [messageError,      setMessageError]      = useState('')
const [messageBusy,       setMessageBusy]       = useState(false)
const [confirmingMessage, setConfirmingMessage] = useState(null)
const [editingId,         setEditingId]         = useState(null)
const [editText,          setEditText]          = useState('')

async function handleEditSave(m) {
  if (!editText.trim() || messageBusy) return
  setMessageBusy(true)
  setMessageError('')
  const failed = await onUpdateMessage(m, editText.trim())
  if (failed) setMessageError(failed)
  else setEditingId(null)
  setMessageBusy(false)
}

async function handleSend() {
  if (!draft.trim() || messageBusy) return
  setMessageBusy(true)
  setMessageError('')
  const failed = await onSendMessage({ content: draft.trim(), photos: draftPhotos })
  if (failed) setMessageError(failed)
  else { setDraft(''); setDraftPhotos([]) }
  setMessageBusy(false)
}

async function handleDeleteMessage() {
  if (messageBusy) return
  setMessageBusy(true)
  const failed = await onDeleteMessage(confirmingMessage)
  if (failed) setMessageError(failed)
  setConfirmingMessage(null)
  setMessageBusy(false)
}
```

`AskView`의 사진 첨부 UI도 `QnaImagePicker`로 교체한다(동작·testid는 그대로).

- [ ] **Step 5: 테스트를 돌려 통과를 확인한다**

Run: `npx vitest run src/pages/QnA.test.jsx`
Expected: PASS

- [ ] **Step 6: 전체 테스트·린트·빌드**

Run: `npx vitest run && npm run lint && npm run build`
Expected: 전체 통과. `Dashboard.jsx`가 아직 `q.answer`를 보지만 오류는 아니다(Task 5에서 고친다).

- [ ] **Step 7: 커밋 (Task 3과 함께)**

```bash
git add src/context/DataContext.jsx src/components/qna/QnaImagePicker.jsx src/pages/QnA.jsx src/pages/QnA.test.jsx
git commit -m "feat: Q&A에서 사진을 붙여가며 여러 번 주고받는다"
```

---

### Task 5: 대시보드 맞추기

**Files:**
- Modify: `src/pages/Dashboard.jsx`

**Interfaces:**
- Consumes: Task 1의 `qnaStatus`·`unansweredCount`, Task 3의 `qnaMessages`
- Produces: 없음

- [ ] **Step 1: 미답변 건수에 대화를 넘긴다**

`Dashboard.jsx`의 `useData()` 구조분해에 `qnaMessages`를 추가하고, 36번 줄을 바꾼다:

```js
  const unansweredQna = unansweredCount(qnaList, students, classes, user, qnaMessages)
```

- [ ] **Step 2: "Q&A 답변" 카드를 마지막 교사 글 기준으로 바꾼다**

지금은 `q.answer`가 있는 질문을 `answeredAt` 순으로 고른다. 그 칸은 이제 비어 있어
카드가 항상 빈다. 아래로 교체한다:

```js
  // 답변받은 Q&A — 마지막 글이 교사인 내 질문을, 그 글이 최신인 순서로
  const answeredQna = qnaList
    .filter((q) => q.studentId === user.studentId && qnaStatus(q, qnaMessages) === 'answered')
    .map((q) => ({
      question: q,
      // 이 질문에 달린 교사 글 중 가장 최근 것
      lastAt: qnaMessages
        .filter((m) => m.qnaId === q.id && m.authorRole === 'teacher')
        .reduce((a, m) => (m.createdAt > a ? m.createdAt : a), ''),
    }))
    .sort((a, b) => b.lastAt.localeCompare(a.lastAt))
    .slice(0, 2)
    .map((x) => x.question)
```

`import { unansweredCount } from '../utils/qnaAccess'`를 아래로 바꾼다:

```js
import { unansweredCount, qnaStatus } from '../utils/qnaAccess'
```

- [ ] **Step 3: 전체 테스트·린트·빌드**

Run: `npx vitest run && npm run lint && npm run build`
Expected: 전체 통과

- [ ] **Step 4: 커밋**

```bash
git add src/pages/Dashboard.jsx
git commit -m "fix: 대시보드가 대화 기준으로 답변 여부를 본다"
```

---

### Task 6: 추가 질문 알림

**Files:**
- Create: `api/notify-qna-message.js`
- Create: `api/notify-qna-message.test.js`

**Interfaces:**
- Consumes: `api/notify-qna.js`의 `notifyTargets`·`isDeadSubscription`·`endpointsToRemove`·`isAuthorizedWebhook`
- Produces: `shouldNotifyMessage(record) -> boolean`, `messageNotification(student) -> { title, body }`, `POST /api/notify-qna-message`

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`api/notify-qna-message.test.js`:

```js
// api/notify-qna-message.test.js
import { describe, it, expect } from 'vitest'
import { shouldNotifyMessage, messageNotification } from './notify-qna-message.js'

describe('shouldNotifyMessage', () => {
  it('학생이 쓴 글이면 보낸다', () => {
    expect(shouldNotifyMessage({ author_role: 'student', qna_id: 1 })).toBe(true)
  })

  it('교사가 쓴 글에는 보내지 않는다', () => {
    // 받을 학생 구독이 없다. 알림 켜기는 교사·관리자에게만 있다.
    expect(shouldNotifyMessage({ author_role: 'teacher', qna_id: 1 })).toBe(false)
  })

  it('질문 정보가 없으면 보내지 않는다', () => {
    expect(shouldNotifyMessage({ author_role: 'student' })).toBe(false)
    expect(shouldNotifyMessage(null)).toBe(false)
  })
})

describe('messageNotification', () => {
  it('이름과 "추가 질문"까지만 담는다', () => {
    const got = messageNotification({ id: 1, name: '홍길동' })
    expect(got.title).toBe('새 질문')
    expect(got.body).toBe('홍길동 · 추가 질문')
  })

  it('학생을 못 찾아도 문구를 만든다', () => {
    expect(messageNotification(undefined).body).toBe('학생 · 추가 질문')
  })
})
```

- [ ] **Step 2: 테스트를 돌려 실패를 확인한다**

Run: `npx vitest run api/notify-qna-message.test.js`
Expected: FAIL — `Failed to resolve import "./notify-qna-message.js"`

- [ ] **Step 3: 구현한다**

`api/notify-qna-message.js`:

```js
// api/notify-qna-message.js
// Q&A 대화에 학생이 글을 올리면 담당 교사 폰으로 알림을 보낸다.
//
// 첫 질문은 api/notify-qna.js가 맡는다(qna 표의 INSERT). 이 파일은
// 그 뒤에 오가는 글(qna_messages 표의 INSERT)을 맡는다.
import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'
import {
  notifyTargets, isDeadSubscription, endpointsToRemove, isAuthorizedWebhook,
} from './notify-qna.js'

// 교사가 쓴 글에는 보내지 않는다 — 받을 학생 구독이 없다.
// (알림 켜기는 교사·관리자 화면에만 있다)
export function shouldNotifyMessage(record) {
  if (!record?.qna_id) return false
  return record.author_role === 'student'
}

// 잠금화면에 그대로 뜨는 내용이다. 글 본문은 넣지 않는다.
export function messageNotification(student) {
  return {
    title: '새 질문',
    body: `${student?.name ?? '학생'} · 추가 질문`,
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  if (!isAuthorizedWebhook(req.headers, process.env.QNA_WEBHOOK_SECRET)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const record = req.body?.record
  if (!shouldNotifyMessage(record)) {
    return res.status(200).json({ sent: 0, removed: 0, reason: '보낼 대상 아님' })
  }

  const supabaseUrl    = process.env.VITE_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const publicKey      = process.env.VAPID_PUBLIC_KEY
  const privateKey     = process.env.VAPID_PRIVATE_KEY
  const contact        = process.env.VAPID_CONTACT

  if (!supabaseUrl || !serviceRoleKey || !publicKey || !privateKey || !contact) {
    return res.status(500).json({ error: '서버 환경변수가 설정되지 않았습니다.' })
  }

  webpush.setVapidDetails(contact, publicKey, privateKey)

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // 글에는 qna_id만 있다. 누구의 질문인지는 부모를 봐야 안다.
  const { data: question } = await admin
    .from('qna').select('student_id').eq('id', record.qna_id).single()

  if (!question) return res.status(200).json({ sent: 0, removed: 0, reason: '질문 없음' })

  const [studentsRes, classesRes, adminsRes] = await Promise.all([
    admin.from('students').select('id, name, class_id'),
    admin.from('classes').select('id, teacher_id'),
    admin.from('profiles').select('id').eq('role', 'admin'),
  ])

  const students = studentsRes.data ?? []
  const targets  = notifyTargets(question, students, classesRes.data ?? [], adminsRes.data ?? [])
  if (targets.length === 0) {
    return res.status(200).json({ sent: 0, removed: 0, reason: '받을 사람 없음' })
  }

  const { data: subs } = await admin
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .in('profile_id', targets)

  const student = students.find((s) => s.id === question.student_id)
  const payload = JSON.stringify({ ...messageNotification(student), url: '/qna' })

  const results = await Promise.all((subs ?? []).map(async (s) => {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        payload
      )
      return { endpoint: s.endpoint }
    } catch (e) {
      if (!isDeadSubscription(e.statusCode)) {
        console.error('추가 질문 알림 발송 실패:', s.endpoint, e.statusCode, e.body)
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

- [ ] **Step 4: 테스트를 돌려 통과를 확인한다**

Run: `npx vitest run api/notify-qna-message.test.js`
Expected: PASS (5 tests)

- [ ] **Step 5: 전체 테스트·린트·빌드**

Run: `npx vitest run && npm run lint && npm run build`
Expected: 전체 통과

- [ ] **Step 6: 커밋**

```bash
git add api/notify-qna-message.js api/notify-qna-message.test.js
git commit -m "feat: 학생이 추가 질문을 올리면 교사 폰으로 알린다"
```

---

### Task 7: 문서

**Files:**
- Modify: `MANUAL.md`
- Modify: `docs/push-setup.md`

**Interfaces:**
- Consumes: Task 1~6의 결과물
- Produces: 없음

- [ ] **Step 1: 매뉴얼의 Q&A 절을 고친다**

`### 답변 등록 (교사 / 관리자)` 절을 아래로 교체한다:

```markdown
### 대화 주고받기

질문 하나에서 학생과 선생님이 여러 번 주고받을 수 있습니다.

1. 질문 카드를 클릭합니다.
2. 첫 질문과 지금까지 오간 글이 순서대로 보입니다. 선생님 글은 남색 배경입니다.
3. 맨 아래 칸에 이어서 쓸 내용을 입력하고 **등록**을 누릅니다.
4. 필요하면 **사진 추가**로 사진을 붙입니다 (최대 3장). 학생·선생님 모두 붙일 수 있습니다.

> **답변 대기 / 답변 완료**는 마지막 글을 누가 썼는지로 정해집니다.
> 선생님이 답한 뒤 학생이 되물으면 다시 **답변 대기**가 됩니다.
> 추가 질문도 답을 기다리는 것이라, 그래야 선생님이 놓치지 않습니다.

> 학생이 추가 질문을 올리면 담당 선생님 폰으로 **알림이 갑니다.** 새 질문과 같습니다.

### 글 삭제

각 글 오른쪽 위 **삭제**를 누릅니다.

- **학생** — 본인이 쓴 글만
- **교사·관리자** — 그 대화의 모든 글 (학생 글 포함)

> 붙은 사진도 함께 지워집니다. 되돌릴 수 없습니다.
> 질문 자체를 지우면 대화 전체와 모든 사진이 사라집니다.
```

- [ ] **Step 2: 알림 설정 문서에 웹훅을 하나 더 적는다**

`docs/push-setup.md`의 `## 4. 웹훅 등록` 절 끝에 추가한다:

```markdown
### 추가 질문 알림 웹훅 (하나 더)

같은 화면에서 두 번째 웹훅을 만듭니다. 첫 질문과 추가 질문은 서로 다른 표에
저장되므로 웹훅도 두 개가 필요합니다.

| 항목 | 값 |
|------|-----|
| Name | `notify-qna-message` |
| Table | `qna_messages` |
| Events | `Insert` 만 체크 |
| Type | HTTP Request |
| Method | `POST` |
| URL | `https://www.sumunjae.com/api/notify-qna-message` |
| HTTP Headers | `x-webhook-secret` : 위와 **같은 값** |
```

- [ ] **Step 3: 커밋**

```bash
git add MANUAL.md docs/push-setup.md
git commit -m "docs: Q&A 대화와 추가 질문 알림 안내"
```

---

## 배포 후 확인 (사람이 한다)

- [ ] 기존에 답변이 달려 있던 질문을 열면 그 답변이 대화의 첫 글로 보인다
- [ ] 교사가 이어서 글을 쓰면 "답변 완료"가 된다
- [ ] 학생이 되물으면 목록에서 다시 "답변 대기"로 바뀐다
- [ ] 미답변 건수가 되물음까지 세어 준다
- [ ] 학생·교사 모두 글에 사진을 붙일 수 있다
- [ ] 학생은 본인 글만, 교사는 모든 글을 지울 수 있다
- [ ] 수정은 본인 글에만 뜬다 (교사 화면에서 학생 글에 "수정"이 없어야 한다)
- [ ] 학생이 추가 질문을 올리면 담당 교사 폰에 `홍길동 · 추가 질문` 알림이 온다
- [ ] 학생 대시보드의 "Q&A 답변" 카드에 답변받은 질문이 나온다
