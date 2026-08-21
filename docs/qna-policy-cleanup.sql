-- docs/qna-policy-cleanup.sql
-- qna 테이블에 쌓인 옛 정책을 걷어내고 필요한 3개만 남긴다.
--
-- 왜 필요한가:
-- 설정을 여러 번 시도하면서 정책이 11개까지 쌓였다. 그중 일부가 지금은
-- 존재하지 않는 함수(is_staff, get_my_role 등)를 부른다. 정책이 없는 함수를
-- 부르면 그 테이블에 대한 조회·삽입이 통째로 에러가 난다 — 여러 정책이
-- OR로 묶여 있어도, 하나라도 평가 중에 터지면 쿼리 전체가 실패한다.
--
-- 그래서 qna 테이블은 지금까지 질문이 한 건도 저장된 적이 없다.
--
-- 이 파일을 실행하기 전에 qna-category.sql을 먼저 실행해야 한다
-- (can_see_qna_author / is_qna_staff 함수를 거기서 만든다).

-- ── 1. qna의 정책을 전부 걷어낸다 ────────────────────────────
do $$
declare p record;
begin
  for p in select policyname from pg_policies
           where schemaname = 'public' and tablename = 'qna' loop
    execute format('drop policy %I on public.qna', p.policyname);
  end loop;
end $$;

-- ── 2. 필요한 3개만 다시 깐다 ────────────────────────────────
-- 읽기: 그 질문을 쓴 학생을 볼 수 있으면 본다
--   관리자 → 전체 / 교사 → 담당 반 학생 / 학생 → 같은 반 학생(익명 표시)
create policy qna_select on public.qna
for select using (public.can_see_qna_author(student_id));

-- 쓰기(학생): 본인 이름으로만 쓴다.
-- profiles를 정책 안에서 직접 읽으면 profiles의 RLS까지 함께 평가된다.
-- 그 정책 중 하나라도 권한 없는 테이블(auth.users 등)을 보면 여기서 같이 터진다.
-- 그래서 security definer 함수로 감싸 의존을 끊는다.
create or replace function public.my_qna_student_id()
returns bigint language sql stable security definer set search_path = public as $$
  select student_id from public.profiles where id = auth.uid()
$$;

create policy qna_student_insert on public.qna
for insert with check (student_id = public.my_qna_student_id());

-- 답변·수정·삭제(교사/관리자): 볼 수 있는 학생의 질문만
create policy qna_staff_write on public.qna
for all using (public.is_qna_staff() and public.can_see_qna_author(student_id))
with check (public.is_qna_staff() and public.can_see_qna_author(student_id));

-- ── 확인 ─────────────────────────────────────────────────────
-- 3줄만 나와야 한다: qna_select / qna_staff_write / qna_student_insert
select policyname, cmd from pg_policies
where schemaname = 'public' and tablename = 'qna'
order by policyname;
