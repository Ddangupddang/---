-- docs/qna-reads.sql
-- Q&A 답변을 학생이 읽었는지 표시한다 (카카오톡의 '읽음'처럼).
--
-- Supabase → SQL Editor에 통째로 붙여넣고 실행한다. 여러 번 실행해도 안전하다.
--
-- 실행하지 않으면 교사 화면에 읽음 표시가 뜨지 않는다. 앱이 멈추지는 않는다 —
-- 표가 없으면 조회 결과를 빈 것으로 두고 넘어간다(fetchAllRows).
--
-- 먼저 실행돼 있어야 하는 것:
--   docs/qna-category.sql   (is_qna_staff, can_see_qna_author)
--   docs/qna-images.sql     (my_qna_student_id)
--
-- 왜 qna 표에 칸을 더하지 않았나:
--   `qna.student_read_at` 한 칸이면 짧게 끝나지만, 그러려면 학생에게 qna 표를
--   고칠 권한을 줘야 한다. RLS는 "이 칸만 고쳐라"를 못 하므로, 그 순간 질문
--   내용과 답변까지 고칠 수 있는 문이 같이 열린다. 표를 따로 두면 그 문을 안 연다.


-- ── 1. 읽은 기록 표 ──────────────────────────────────────────
-- 질문 하나당 학생 하나. 학생이 그 질문을 열 때마다 read_at을 새로 쓴다.
-- 글마다 기록하지 않는 이유: 학생이 스레드를 열면 그 안의 글을 다 보게 되므로,
-- "마지막으로 언제 열었나" 하나면 어떤 글을 봤는지 전부 판정할 수 있다.
create table if not exists public.qna_reads (
  qna_id     bigint      not null references public.qna(id)      on delete cascade,
  student_id bigint      not null references public.students(id) on delete cascade,
  read_at    timestamptz not null default now(),
  primary key (qna_id, student_id)
);


-- ── 2. 접근 정책 ─────────────────────────────────────────────
alter table public.qna_reads enable row level security;

-- 읽기: 그 질문을 볼 수 있으면 읽은 기록도 볼 수 있다.
-- (교사는 담당 반 학생의 질문을, 학생은 본인 질문을 본다 — qna_messages와 같은 규칙)
drop policy if exists qna_reads_select on public.qna_reads;
create policy qna_reads_select on public.qna_reads
for select to authenticated
using (exists (
  select 1 from public.qna q
  where q.id = qna_id and public.can_see_qna_author(q.student_id)
));

-- 쓰기: 본인 이름으로, 본인 질문에만.
-- 두 조건을 다 본다. 이름만 보면 남의 질문을 읽은 것으로 꾸밀 수 있고,
-- 질문만 보면 남의 이름으로 기록을 남길 수 있다.
drop policy if exists qna_reads_insert on public.qna_reads;
create policy qna_reads_insert on public.qna_reads
for insert to authenticated
with check (
  student_id = public.my_qna_student_id()
  and exists (
    select 1 from public.qna q
    where q.id = qna_id and q.student_id = public.my_qna_student_id()
  )
);

-- 고치기: 같은 조건. 학생이 다시 열면 read_at을 새 시각으로 덮는다.
-- 앱은 upsert(insert ... on conflict do update)를 쓰므로 둘 다 있어야 한다.
drop policy if exists qna_reads_update on public.qna_reads;
create policy qna_reads_update on public.qna_reads
for update to authenticated
using (student_id = public.my_qna_student_id())
with check (student_id = public.my_qna_student_id());

-- 지우는 정책은 만들지 않는다 → 아무도 읽은 기록을 지울 수 없다.
-- 질문이 지워지면 이 줄도 함께 사라진다(on delete cascade).


-- ── 3. 확인 ──────────────────────────────────────────────────
-- 정책 3행(insert / select / update)이 나와야 한다. delete는 없어야 정상이다.
select policyname, cmd, qual, with_check
  from pg_policies
 where schemaname = 'public' and tablename = 'qna_reads'
 order by cmd, policyname;
