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
  -- 화면 배치와 답변 완료 판정이 이 값을 본다.
  author_role text        not null check (author_role in ('student', 'teacher')),
  content     text        not null,
  image_paths jsonb       not null default '[]'::jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists qna_messages_qna_idx
  on public.qna_messages (qna_id, created_at);

-- ── 2. 접근 정책 ─────────────────────────────────────────────
alter table public.qna_messages enable row level security;

-- 읽기: 부모 질문을 볼 수 있으면 그 대화도 볼 수 있다
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

-- 수정: 본인 글이거나, 교사·관리자가 볼 수 있는 스레드의 글
-- (화면에서는 본인 글만 고칠 수 있게 막는다. 정책은 그보다 넓게 두어
--  나중에 관리 도구가 필요해질 때 DB를 다시 손대지 않아도 되게 한다)
drop policy if exists qna_msg_update on public.qna_messages;
create policy qna_msg_update on public.qna_messages
for update to authenticated
using (
  author_id = auth.uid()
  or (public.is_qna_staff() and exists (
    select 1 from public.qna q
    where q.id = qna_id and public.can_see_qna_author(q.student_id)
  ))
);

-- 삭제: 본인 글이거나, 교사·관리자가 볼 수 있는 스레드의 글
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
-- 이미 달린 답변을 교사 메시지로 옮긴다.
-- 여러 번 실행해도 중복되지 않게 아직 안 옮긴 것만 고른다.
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
-- 정책 4줄이 나와야 한다:
--   qna_msg_delete / qna_msg_insert / qna_msg_select / qna_msg_update
select policyname, cmd from pg_policies
where schemaname = 'public' and tablename = 'qna_messages'
order by policyname;
