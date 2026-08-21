-- docs/rls-audit.sql
-- 정책 상태 점검 — 읽기만 한다. 아무것도 바꾸지 않는다.
--
-- Supabase SQL Editor는 여러 문장을 붙여 실행하면 "마지막 결과"만 보여준다.
-- 그러니 아래 ①②③을 한 번에 하나씩 실행할 것.

-- ─────────────────────────────────────────────────────────────
-- ① 테이블별 요약 — 여기서 문제 테이블을 먼저 고른다
-- ─────────────────────────────────────────────────────────────
select
  c.relname                                        as 테이블,
  c.relrowsecurity                                 as rls켜짐,
  count(p.policyname)                              as 정책수,
  -- 조건 없이 통과시키는 정책. 있으면 그 동작은 사실상 무방비다.
  count(*) filter (
    where coalesce(p.qual, '') in ('true')
       or coalesce(p.with_check, '') in ('true')
  )                                                as 무조건통과,
  -- 로그인 사용자에게 권한이 없는 테이블. 있으면 그 화면이 통째로 막힌다.
  count(*) filter (
    where coalesce(p.qual, '') || coalesce(p.with_check, '') like '%auth.users%'
  )                                                as auth_users참조,
  string_agg(distinct p.cmd, ', ' order by p.cmd)  as 명령들
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
left join pg_policies p
       on p.schemaname = 'public' and p.tablename = c.relname
where n.nspname = 'public' and c.relkind = 'r'
group by c.relname, c.relrowsecurity
order by 무조건통과 desc, auth_users참조 desc, 정책수 desc, c.relname;

-- 읽는 법
--   무조건통과 > 0        → 누구나 통과. 그 테이블의 해당 동작에 방어가 없다
--   auth_users참조 > 0    → 그 테이블 쿼리가 통째로 실패한다 (qna가 이 경우였다)
--   rls켜짐 = true, 정책수 = 0 → 아무도 못 읽는다. 그 화면은 항상 비어 보인다
--   rls켜짐 = false       → 서버 제한 없음. 키만 있으면 누구나 읽고 쓴다


-- ─────────────────────────────────────────────────────────────
-- ② 정책이 부르는 함수가 실제로 있는지
--    없는 함수를 부르면 그 테이블 쿼리가 실행 중에 터진다
-- ─────────────────────────────────────────────────────────────
with 참조 as (
  select distinct (regexp_matches(
           coalesce(qual, '') || ' ' || coalesce(with_check, ''),
           'public\.([a-z0-9_]+)\s*\(', 'g'))[1] as 함수명
  from pg_policies
  where schemaname = 'public'
)
select r.함수명,
       exists (
         select 1 from pg_proc p
         where p.pronamespace = 'public'::regnamespace and p.proname = r.함수명
       ) as 존재함,
       (select p.prosecdef from pg_proc p
        where p.pronamespace = 'public'::regnamespace and p.proname = r.함수명
        limit 1) as 보안정의자
from 참조 r
order by 존재함, r.함수명;

-- 읽는 법
--   존재함 = false   → 그 함수를 쓰는 정책이 걸린 테이블은 지금 통째로 고장나 있다
--   보안정의자 = false → 그 함수가 보는 테이블의 RLS까지 함께 평가된다.
--                       연쇄로 터질 수 있으니 true가 안전하다


-- ─────────────────────────────────────────────────────────────
-- ③ 문제 테이블 상세 — ①에서 걸린 테이블 이름을 넣고 본다
-- ─────────────────────────────────────────────────────────────
select policyname as 정책, cmd as 명령, permissive as 종류,
       coalesce(qual, '')       as 읽기조건,
       coalesce(with_check, '') as 쓰기조건
from pg_policies
where schemaname = 'public'
  and tablename = 'notices'   -- ← 여기를 바꿔가며 확인
order by policyname;
