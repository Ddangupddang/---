-- ============================================================
-- 2단계 진단 — 나머지 절반 (한 표로 한꺼번에)
-- ============================================================
-- Supabase SQL Editor 는 마지막 질의의 결과만 보여준다.
-- 그래서 앞선 stage2-inspect.sql 의 1~4번이 화면에 안 나왔다.
-- 여기서는 전부 하나의 표로 합쳐서 돌려준다.
--
-- 읽기만 한다. 아무것도 바꾸지 않고, 아무것도 넣지 않는다.
--
-- 왜 필요한가:
--   지금 걸려 있는 정책이 무엇인지 모르는 채로 새 정책을 얹으면,
--   지금 되는 것을 조용히 망가뜨린다. 과제 때 이미 겪은 일이다.
-- ============================================================

select * from (

  -- ① 표가 있나, RLS 는 켜져 있나
  select
    1 as 순서,
    'RLS 상태'                      as 구분,
    c.relname::text                 as 항목,
    case when c.relrowsecurity then 'RLS 켜짐' else '⚠️ RLS 꺼짐' end as 내용
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname in ('videos','video_comments','tests','submissions')

  union all

  -- ② 각 표에 걸린 정책 (조건식까지 그대로)
  select
    2,
    '정책',
    (p.tablename || ' · ' || p.cmd)::text,
    (p.policyname
      || '  [대상: ' || array_to_string(p.roles, ',') || ']'
      || coalesce('  using(' || p.qual || ')', '')
      || coalesce('  check(' || p.with_check || ')', ''))::text
  from pg_policies p
  where p.schemaname = 'public'
    and p.tablename in ('videos','video_comments','tests','submissions')

  union all

  -- ③ 표별 정책 개수 (겹겹이 쌓였는지)
  select
    3,
    '정책 개수',
    p.tablename::text,
    (count(*) || '개')::text
  from pg_policies p
  where p.schemaname = 'public'
    and p.tablename in ('videos','video_comments','tests','submissions')
  group by p.tablename

  union all

  -- ④ 같은 테스트를 두 번 못 내게 막는 장치가 있나
  select
    4,
    '중복 제출 장치',
    con.conname::text,
    pg_get_constraintdef(con.oid)::text
  from pg_constraint con
  where con.conrelid = 'public.submissions'::regclass
    and con.contype in ('u','p')

  union all

  select
    4,
    '중복 제출 장치(인덱스)',
    i.indexname::text,
    i.indexdef::text
  from pg_indexes i
  where i.schemaname = 'public' and i.tablename = 'submissions'

  union all

  -- ⑤ 이미 중복으로 들어간 제출이 있나 (있으면 unique 를 못 건다)
  select
    5,
    '이미 중복된 제출',
    ('테스트 ' || s.test_id || ' · 학생 ' || s.student_id)::text,
    (count(*) || '건')::text
  from public.submissions s
  group by s.test_id, s.student_id
  having count(*) > 1

  union all

  -- ⑥ 다시 쓸 수 있는 도우미 함수가 이미 있나
  --    과제 때 만든 hw_ 함수들을 그대로 쓸 수 있으면 새로 만들지 않는다.
  select
    6,
    '쓸 수 있는 함수',
    p.proname::text,
    pg_get_function_result(p.oid)::text
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname in ('hw_is_staff','hw_my_student_id','is_staff','get_my_role',
                      'is_admin','my_class_ids','my_student_id')

  union all

  -- ⑦ 지금 자료가 얼마나 있나 (판정 보류였던 항목들 때문에)
  select 7, '자료 건수', '영상',        (select count(*) || '건' from public.videos)
  union all
  select 7, '자료 건수', '영상 댓글',   (select count(*) || '건' from public.video_comments)
  union all
  select 7, '자료 건수', '테스트',      (select count(*) || '건' from public.tests)
  union all
  select 7, '자료 건수', '테스트 제출', (select count(*) || '건' from public.submissions)

) t
order by 순서, 구분, 항목;
