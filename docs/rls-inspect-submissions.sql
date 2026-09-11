-- ============================================================
-- 과제 제출 표에 지금 걸려 있는 정책 확인
-- ============================================================
-- 읽기만 한다. 아무것도 바꾸지 않는다.
-- 2단계(제출 기한을 DB에서 막기)에 들어가기 전에 반드시 먼저 본다 —
-- 저장소의 SQL과 실제 DB가 다르다는 것이 이미 확인된 상태다.
-- 모르고 덮으면 지금 되는 제출이 안 되게 만든다.
-- ============================================================


-- ── 1. 제출 표에 걸린 정책 전부 ────────────────────────────────
-- cmd(ALL/INSERT/SELECT...)와 조건식을 그대로 본다.
select
  policyname  as 정책이름,
  cmd         as 대상동작,
  roles       as 대상역할,
  qual        as using조건,
  with_check  as withcheck조건
from pg_policies
where schemaname = 'public'
  and tablename = 'homework_submissions_v2'
order by cmd, policyname;


-- ── 2. RLS가 켜져 있나 ────────────────────────────────────────
select relname as 표, relrowsecurity as rls켜짐, relforcerowsecurity as 소유자에게도강제
from pg_class
where oid = 'public.homework_submissions_v2'::regclass;


-- ── 3. 과제 관련 표 전체 정책 개수 (겹겹이 쌓였는지) ───────────
select tablename as 표, count(*) as 정책수, string_agg(policyname, ', ' order by policyname) as 정책들
from pg_policies
where schemaname = 'public'
  and tablename in ('homework_sets','homework_days','homework_questions',
                    'homework_submissions_v2','homework_checks')
group by tablename
order by tablename;


-- ── 4. 정책이 쓰는 도우미 함수가 있나 ──────────────────────────
-- is_admin() / my_class_ids() 같은 것이 이미 있으면 새 정책도 그걸 쓴다.
select p.proname as 함수, pg_get_function_result(p.oid) as 반환형
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('is_admin','is_teacher','my_class_ids','my_student_id','current_role_name')
order by p.proname;
