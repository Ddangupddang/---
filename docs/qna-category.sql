-- docs/qna-category.sql
-- Q&A 간편화 — 질문을 테스트에 매다는 대신 말머리 하나만 붙인다.
--
-- Supabase → SQL Editor에 통째로 붙여넣고 실행하면 된다. 여러 번 실행해도 안전하다.
--
-- 이 파일을 실행하지 않으면 학생이 질문을 등록할 수 없다.
-- 지금 정책이 test_id를 요구하는데, 새 화면은 test_id를 보내지 않기 때문이다.

-- ── 1. 말머리 칸 추가 ────────────────────────────────────────
alter table public.qna add column if not exists category text;

-- 이미 쌓인 질문은 전부 테스트에 달려 있었다
update public.qna set category = 'test' where category is null;

alter table public.qna alter column category set default 'test';

-- 아는 말머리만 들어오게 막는다
alter table public.qna drop constraint if exists qna_category_check;
alter table public.qna add constraint qna_category_check
  check (category in ('naesin', 'jeongsi', 'test', 'etc'));

-- ── 2. 테스트 연결을 선택 사항으로 ───────────────────────────
-- 옛 질문의 연결은 지우지 않고 그대로 둔다. 새 질문만 비워서 들어온다.
alter table public.qna alter column test_id drop not null;
alter table public.qna alter column question_id drop not null;

-- ── 3. 접근 정책 교체 ────────────────────────────────────────
-- 예전: "그 질문이 달린 테스트를 볼 수 있는가"
-- 지금: "그 질문을 쓴 학생을 볼 수 있는가"
--   관리자 → 전체
--   교사   → 담당 반 학생
--   학생   → 같은 반 학생 (화면에는 익명으로 보인다)
create or replace function public.can_see_qna_author(p_student_id bigint)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_admin() or exists (
    select 1 from public.students s
    where s.id = p_student_id and s.class_id = any(public.my_class_ids())
  )
$$;

drop policy if exists qna_select on public.qna;
create policy qna_select on public.qna
for select using (public.can_see_qna_author(student_id));

-- 학생은 본인 이름으로만 쓴다. 이제 테스트를 고를 필요가 없다.
drop policy if exists qna_student_insert on public.qna;
create policy qna_student_insert on public.qna
for insert with check (student_id = public.my_student_id());

drop policy if exists qna_staff_write on public.qna;
create policy qna_staff_write on public.qna
for all using (public.is_staff() and public.can_see_qna_author(student_id))
with check (public.is_staff() and public.can_see_qna_author(student_id));

-- ── 확인 ─────────────────────────────────────────────────────
-- 말머리가 빈 질문이 없어야 한다 (0이 나와야 정상)
-- select count(*) from public.qna where category is null;
