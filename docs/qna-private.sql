-- docs/qna-private.sql
-- Q&A를 1:1 상담으로 바꾼다 — 학생은 "본인이 쓴 질문"만 본다.
--
-- Supabase → SQL Editor에 통째로 붙여넣고 실행한다. 여러 번 실행해도 안전하다.
--
-- 왜 바꾸나:
-- 지금은 같은 반 학생끼리 서로의 질문을 볼 수 있다(작성자만 "익명"으로 가려진다).
-- 여기에 사진 첨부가 붙으면 본인 답안지 사진이 반 전체에 보이게 된다.
-- 사진에 손글씨나 이름이 찍혀 있으면 익명 표시는 의미가 없다.
--
-- 실행 순서: 이 파일을 먼저 실행하고, 그다음 docs/qna-images.sql을 실행한다.
-- 순서를 바꾸면 사진이 잠시 반 전체에 보이는 구간이 생긴다.
--
-- 먼저 실행돼 있어야 하는 것: docs/qna-category.sql (함수를 거기서 만들었다)

-- ── 접근 판단 교체 ───────────────────────────────────────────
-- 관리자 → 전체
-- 교사   → 담당 반 학생 (그대로)
-- 학생   → 본인 (예전에는 "같은 반 학생"이었다)
--
-- 함수 이름과 인자는 그대로 둔다. qna_select / qna_staff_write 정책이
-- 이 이름을 부르고 있어서, 안쪽만 바꾸면 정책은 손대지 않아도 된다.
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
      and p.role = 'teacher'
      and c.teacher_id = auth.uid()
  ) or exists (
    -- 학생은 본인 질문만. 반이 아니라 본인 student_id로 판단한다.
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'student'
      and p.student_id = p_student_id
  )
$$;

-- ── 확인 ─────────────────────────────────────────────────────
-- 정책은 3줄 그대로여야 한다: qna_select / qna_staff_write / qna_student_insert
select policyname, cmd from pg_policies
where schemaname = 'public' and tablename = 'qna'
order by policyname;
