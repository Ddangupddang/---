-- ============================================================
-- 2단계 B — 테스트 정답을 학생에게 내려보내지 않기
-- ============================================================
-- Supabase 대시보드 → SQL Editor → **PART를 하나씩** 실행한다.
-- 모든 PART는 여러 번 실행해도 안전하다.
--
-- ⚠️ 순서가 중요하다. 반드시 이 차례대로 한다:
--
--     PART 1·2 (뷰 만들기)  →  앱 배포  →  PART 3 (원본 표 잠그기)
--
--   PART 3을 앱 배포보다 먼저 하면, 학생 앱은 아직 원본 표를 보고 있어서
--   테스트 화면이 통째로 비어 버린다.
--
-- 왜 하는가:
--   `tests.questions` 안에 정답이 들어 있고 앱이 select('*') 로 통째로
--   받아오기 때문에, 학생이 로그인하면 브라우저로 정답표가 내려간다.
--   2026-09-16에 실제로 확인했다(①②③④⑤ 가 그대로 보였다).
--   오프라인 시험지를 나눠주고 답만 입력받는 방식이라, 정답이 미리 보이면
--   시험 자체가 무의미해진다.
--
-- 어떻게 고치는가:
--   보는 사람에 따라 다른 것을 돌려주는 창구(뷰)를 하나 둔다.
--     교사·관리자          → 정답 그대로, 전체 행
--     학생                 → 정답 칸을 뺀 문항, 본인 반 행만
--     학생(본인 제출 채점 완료) → 그 테스트만 정답 포함
--   마지막 줄이 있어야 지금의 학생 결과 화면(제출 후 정답 공개)이 유지된다.
-- ============================================================


-- ══════════════════════════════════════════════════════════
-- PART 1 — 학생에게 보여줄 창구(뷰) 만들기
-- ══════════════════════════════════════════════════════════
-- security_invoker = off (기본값) 이라 이 뷰는 원본 표의 RLS를 거치지 않는다.
-- **그래서 행 제한을 뷰 안에 직접 넣는다.** 이걸 빠뜨리면 학생이 다른 반
-- 시험 제목까지 보게 된다.
--
-- 만약 `with (security_invoker = off)` 에서 문법 에러가 나면(옛 Postgres)
-- 그 줄만 지우고 다시 실행한다 — 지우면 기본값이 적용되므로 동작은 같다.

drop view if exists public.tests_visible;

create view public.tests_visible
with (security_invoker = off)
as
select
  t.id,
  t.title,
  t.class_id,
  t.teacher_id,
  t.date,
  t.time_limit,
  t.status,
  t.started_at,
  t.created_at,
  case
    -- 교사·관리자는 그대로 본다 (출제·채점 화면이 정답을 쓴다)
    when public.hw_is_staff() then t.questions

    -- 학생이라도 본인이 낸 제출이 채점 완료라면 그 테스트는 정답을 본다
    when exists (
      select 1
      from public.submissions s
      where s.test_id    = t.id
        and s.student_id = public.hw_my_student_id()
        and coalesce(jsonb_array_length((s.scores)::jsonb), 0) > 0
    ) then t.questions

    -- 그 밖에는 문항에서 정답 칸만 덜어낸다.
    -- 선지·배점·유형은 남긴다 — 없으면 응시 화면이 그려지지 않는다.
    else coalesce(
      (
        select jsonb_agg(e.q - 'answer' order by e.ord)
        from jsonb_array_elements(t.questions) with ordinality as e(q, ord)
      ),
      '[]'::jsonb
    )
  end as questions
from public.tests t
where
  -- 교사·관리자는 전부
  public.hw_is_staff()
  -- 학생은 본인 반 것만
  or t.class_id = (
    select s.class_id from public.students s
    where s.id = public.hw_my_student_id()
  );

comment on view public.tests_visible is
  '앱이 테스트를 읽는 창구. 학생에게는 정답을 뺀 문항과 본인 반 행만 준다. 쓰기는 원본 tests 에 한다.';


-- ══════════════════════════════════════════════════════════
-- PART 2 — 이 창구를 로그인한 사람만 쓰게
-- ══════════════════════════════════════════════════════════
revoke all on public.tests_visible from public, anon;
grant select on public.tests_visible to authenticated;

-- API가 새 창구를 알아보게 한다.
-- 보통은 저절로 되지만, 앱에서 "relation tests_visible does not exist" 같은
-- 말이 나오면 이 한 줄을 다시 실행하면 된다.
notify pgrst, 'reload schema';

-- 확인 (authenticated 에 select 만 있어야 한다)
select grantee, privilege_type
  from information_schema.role_table_grants
 where table_schema = 'public' and table_name = 'tests_visible'
 order by grantee, privilege_type;


-- ══════════════════════════════════════════════════════════
-- PART 3 — 원본 표는 교사만 읽게  ⚠️ 앱 배포 뒤에 실행할 것
-- ══════════════════════════════════════════════════════════
-- 앱이 아직 원본 표를 보고 있으면 학생 테스트 화면이 비어 버린다.
-- 앱 배포를 확인한 뒤에 실행한다.

drop policy if exists all_view_tests on public.tests;

create policy tests_select_staff on public.tests
for select to authenticated
using (public.hw_is_staff());

-- 확인 (tests 의 SELECT 가 tests_select_staff 하나여야 한다)
select policyname, cmd, qual from pg_policies
 where schemaname = 'public' and tablename = 'tests' order by cmd, policyname;


-- ══════════════════════════════════════════════════════════
-- PART 4 — 진짜 가려졌는지, 그리고 응시가 여전히 되는지
-- ══════════════════════════════════════════════════════════
-- PART 3까지 끝낸 뒤 실행한다. 읽기만 한다.
-- 가리는 것만 확인하면 반쪽이다. **응시에 필요한 것이 남아 있는지**를 같이 본다.

create temp table if not exists _s2b (순서 int, 단계 text, 결과 text);
truncate _s2b;

do $$
declare
  v_prof   uuid;
  v_me     bigint;
  v_class  bigint;
  v_cnt    int;
  v_ans    text;
  v_choice text;
begin
  select p.id, p.student_id into v_prof, v_me
  from public.profiles p
  where p.role = 'student' and p.student_id is not null
  order by p.id limit 1;

  if v_prof is null then
    insert into _s2b values (0, '준비', '명부와 연결된 학생 계정이 없습니다.');
    return;
  end if;

  select s.class_id into v_class from public.students s where s.id = v_me;
  insert into _s2b values (0, '시험 대상',
    format('학생 명부 id=%s · 반=%s', v_me, coalesce(v_class::text, '(없음)')));

  perform set_config('request.jwt.claims',
    json_build_object('sub', v_prof::text, 'role', 'authenticated')::text, true);

  -- ㉠ 원본 표에 아직 손이 닿는가 (닿으면 안 된다)
  begin
    execute 'set local role authenticated';
    select count(*) into v_cnt from public.tests;
    execute 'reset role';
    insert into _s2b values (1, '㉠ 학생이 원본 tests 를 읽는가',
      case when v_cnt = 0 then '✅ 안 보인다 (0건)'
           else '❌ 아직 ' || v_cnt || '건 보인다 — PART 3을 실행했는지 확인' end);
  exception when others then
    execute 'reset role';
    insert into _s2b values (1, '㉠ 학생이 원본 tests 를 읽는가', '✅ 막혔다 (' || sqlerrm || ')');
  end;

  -- ㉡ 창구에서 정답이 보이는가 (보이면 안 된다 — 채점 완료 건은 제외)
  begin
    execute 'set local role authenticated';
    select string_agg(distinct (q->>'answer'), ', ')
      into v_ans
      from public.tests_visible t, jsonb_array_elements(t.questions) q
     where coalesce(q->>'answer', '') <> ''
       and not exists (
         select 1 from public.submissions s
         where s.test_id = t.id and s.student_id = v_me
           and coalesce(jsonb_array_length((s.scores)::jsonb), 0) > 0
       );
    execute 'reset role';
    insert into _s2b values (2, '㉡ 창구에 정답이 남아 있는가',
      case when v_ans is null then '✅ 정답이 없다'
           else '❌ 아직 보인다: ' || left(v_ans, 60) end);
  exception when others then
    execute 'reset role';
    insert into _s2b values (2, '㉡ 창구에 정답이 남아 있는가', '조회 실패 (' || sqlerrm || ')');
  end;

  -- ㉢ 응시에 필요한 것은 남아 있는가 (선지가 없으면 시험을 못 본다)
  begin
    execute 'set local role authenticated';
    select count(*) into v_cnt from public.tests_visible;
    select string_agg(distinct (q->'choices')::text, ' ')
      into v_choice
      from public.tests_visible t, jsonb_array_elements(t.questions) q
     where q->>'type' = 'mc'
     limit 1;
    execute 'reset role';
    insert into _s2b values (3, '㉢ 응시에 필요한 것이 남았는가',
      case when v_cnt = 0 then '— 이 학생 반에 테스트가 없어 판단 불가'
           when v_choice is null then '⚠️ 객관식 문항이 없거나 선지가 비었다'
           else format('✅ 테스트 %s건 · 선지 예: %s', v_cnt, left(v_choice, 40)) end);
  exception when others then
    execute 'reset role';
    insert into _s2b values (3, '㉢ 응시에 필요한 것이 남았는가', '❌ 조회가 막혔다 (' || sqlerrm || ')');
  end;

  -- ㉣ 다른 반 테스트가 섞여 오는가 (섞이면 안 된다)
  begin
    execute 'set local role authenticated';
    select count(*) into v_cnt
      from public.tests_visible
     where class_id is distinct from v_class;
    execute 'reset role';
    insert into _s2b values (4, '㉣ 다른 반 테스트가 보이는가',
      case when v_cnt = 0 then '✅ 안 보인다' else '❌ ' || v_cnt || '건 섞여 있다' end);
  exception when others then
    execute 'reset role';
    insert into _s2b values (4, '㉣ 다른 반 테스트가 보이는가', '조회 실패 (' || sqlerrm || ')');
  end;

  -- ㉤ 교사에게는 정답이 그대로 보이는가 (안 보이면 채점 화면이 죽는다)
  declare
    v_staff uuid;
  begin
    select p.id into v_staff from public.profiles p
    where p.role in ('teacher','admin') order by p.id limit 1;

    if v_staff is null then
      insert into _s2b values (5, '㉤ 교사에게 정답이 보이는가', '교사 계정이 없어 판단 불가');
    else
      perform set_config('request.jwt.claims',
        json_build_object('sub', v_staff::text, 'role', 'authenticated')::text, true);
      execute 'set local role authenticated';
      select string_agg(distinct (q->>'answer'), ', ')
        into v_ans
        from public.tests_visible t, jsonb_array_elements(t.questions) q
       where coalesce(q->>'answer', '') <> '';
      execute 'reset role';
      insert into _s2b values (5, '㉤ 교사에게 정답이 보이는가',
        case when v_ans is null then '❌ 안 보인다 — 채점 화면이 죽는다!'
             else '✅ 보인다: ' || left(v_ans, 40) end);
    end if;
  exception when others then
    execute 'reset role';
    insert into _s2b values (5, '㉤ 교사에게 정답이 보이는가', '조회 실패 (' || sqlerrm || ')');
  end;
end $$;

select 단계, 결과 from _s2b order by 순서;


-- ══════════════════════════════════════════════════════════
-- 되돌리기 — 학생 테스트 화면이 비었을 때만
-- ══════════════════════════════════════════════════════════
-- 앱을 예전 것으로 되돌렸거나 뷰에 문제가 있을 때, 원본 표를 다시 연다.
-- 정답 노출도 같이 돌아온다는 것을 알고 쓸 것.
--
-- drop policy if exists tests_select_staff on public.tests;
-- create policy all_view_tests on public.tests
-- for select using (auth.uid() is not null);
