-- docs/qna-category.sql
-- Q&A 간편화 — 질문을 테스트에 매다는 대신 말머리 하나만 붙인다.
--
-- Supabase → SQL Editor에 통째로 붙여넣고 실행한다. 여러 번 실행해도 안전하다.
--
-- 이 파일만 실행하면 된다. rls-policies.sql을 먼저 돌릴 필요가 없다 —
-- 필요한 판단을 다른 파일의 헬퍼 함수에 기대지 않고 여기서 직접 한다.
--
-- 실행하지 않으면 학생이 질문을 등록할 수 없다. 지금 정책이 test_id를
-- 요구하는데 새 화면은 test_id를 보내지 않기 때문이다.

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

-- ── 3. 접근 판단 ─────────────────────────────────────────────
-- 예전: "그 질문이 달린 테스트를 볼 수 있는가"
-- 지금: "그 질문을 쓴 학생을 볼 수 있는가"
--   관리자 → 전체
--   교사   → 담당 반 학생
--   학생   → 같은 반 학생 (화면에는 익명으로 보인다)
--
-- profiles를 직접 본다. rls-policies.sql의 is_admin()·my_class_ids()와
-- 같은 규칙이지만, 그 파일을 실행했는지와 무관하게 동작해야 해서 풀어 썼다.
create or replace function public.can_see_qna_author(p_student_id bigint)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  ) or exists (
    select 1
    from public.students s
    join public.classes  c on c.id = s.class_id
    join public.profiles p on p.id = auth.uid()
    where s.id = p_student_id
      and (
        (p.role = 'teacher' and c.teacher_id = auth.uid())
        or (p.role = 'student' and c.id = p.class_id)
      )
  )
$$;

create or replace function public.is_qna_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('admin', 'teacher')
  )
$$;

-- ── 4. 정책 교체 ─────────────────────────────────────────────
-- RLS가 꺼져 있으면 정책은 그냥 대기 상태로 남는다(해가 없다).
-- 나중에 rls-policies.sql로 RLS를 켜면 그때부터 이 정책이 적용된다.
drop policy if exists qna_select on public.qna;
create policy qna_select on public.qna
for select using (public.can_see_qna_author(student_id));

-- 학생은 본인 이름으로만 쓴다. 이제 테스트를 고를 필요가 없다.
drop policy if exists qna_student_insert on public.qna;
create policy qna_student_insert on public.qna
for insert with check (
  student_id = (select student_id from public.profiles where id = auth.uid())
);

drop policy if exists qna_staff_write on public.qna;
create policy qna_staff_write on public.qna
for all using (public.is_qna_staff() and public.can_see_qna_author(student_id))
with check (public.is_qna_staff() and public.can_see_qna_author(student_id));

-- ── 확인 ─────────────────────────────────────────────────────
-- 말머리가 빈 질문이 없어야 한다. 0이 나와야 정상이다.
select count(*) as 말머리_없는_질문 from public.qna where category is null;
