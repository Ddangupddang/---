-- ============================================================
-- "본인 이름으로만 제출" 정책이 실제로 듣는지 확인
-- ============================================================
-- Supabase 대시보드 → SQL Editor → 통째로 붙여넣고 Run.
-- 결과가 Results 표로 나온다. 넣은 것은 그 자리에서 지운다.
--
-- 앞선 확인 질의(homework-deadline-verify.sql)의 ④번은 잘못 설계돼 있었다 —
-- 기한이 지난 요일에 시험해서 "남의 이름이라서"가 아니라 "기한이 지나서"
-- 막혔다. 그래서 여기서는 **기한 안인 요일**로 시험한다.
-- ============================================================

create temp table if not exists _hw_id_verify (순서 int, 단계 text, 결과 text);
truncate _hw_id_verify;

do $$
declare
  v_day     bigint;
  v_date    date;
  v_a       bigint;   -- 나
  v_a_prof  uuid;
  v_b       bigint;   -- 남
  v_today   date := (now() at time zone 'Asia/Seoul')::date;
  v_orphans int;
begin
  -- 0) 명부와 어긋난 학생 계정이 있으면 그 학생은 이제 제출이 막힌다
  select count(*) into v_orphans
  from public.profiles where role = 'student' and student_id is null;

  insert into _hw_id_verify values (
    0, '명부와 어긋난 계정',
    case when v_orphans = 0 then '✅ 0명 — 이 정책으로 막히는 학생이 없다'
         else '⚠️ ' || v_orphans || '명 — 이 학생들은 제출이 막힌다. 학생 관리에서 명부와 연결할 것' end);

  -- 기한 안인 요일 하나 (여기가 앞선 시험과 다른 점이다)
  select d.id, d.date into v_day, v_date
  from public.homework_days d
  where v_today <= d.date + 1
  order by d.date asc limit 1;

  if v_day is null then
    insert into _hw_id_verify values (1, '준비', '기한 안인 요일이 없습니다. 이번 주 과제를 하나 낸 뒤 다시 해보세요.');
    return;
  end if;

  -- 그 요일을 아직 내지 않은 학생 둘
  select p.student_id, p.id into v_a, v_a_prof
  from public.profiles p
  where p.role = 'student' and p.student_id is not null
    and not exists (select 1 from public.homework_submissions_v2 s
                     where s.day_id = v_day and s.student_id = p.student_id)
  limit 1;

  select p.student_id into v_b
  from public.profiles p
  where p.role = 'student' and p.student_id is not null and p.student_id <> v_a
    and not exists (select 1 from public.homework_submissions_v2 s
                     where s.day_id = v_day and s.student_id = p.student_id)
  limit 1;

  if v_a is null or v_b is null then
    insert into _hw_id_verify values (1, '준비', '아직 안 낸 학생이 둘 이상 필요합니다.');
    return;
  end if;

  insert into _hw_id_verify values (
    1, '시험 대상',
    format('기한 안인 요일 %s (마감 %s) · 나=%s · 남=%s · 오늘 %s', v_day, v_date, v_a, v_b, v_today));

  perform set_config('request.jwt.claims',
    json_build_object('sub', v_a_prof::text, 'role', 'authenticated')::text, true);

  -- ① 본인 이름으로는 들어가야 한다 (정책이 너무 빡빡하면 여기서 걸린다)
  begin
    execute 'set local role authenticated';
    insert into public.homework_submissions_v2 (day_id, student_id, answers)
    values (v_day, v_a, '[]'::jsonb);
    execute 'reset role';
    delete from public.homework_submissions_v2 where day_id = v_day and student_id = v_a;
    insert into _hw_id_verify values (2, '① 본인 이름으로 제출', '✅ 들어갔다 — 정상 제출은 막히지 않는다');
  exception when others then
    execute 'reset role';
    insert into _hw_id_verify values (2, '① 본인 이름으로 제출', '❌ 막혔다 (' || sqlerrm || ') — 정책이 너무 빡빡하다!');
  end;

  -- ② 남의 이름으로는 막혀야 한다 (이번 정책의 목적)
  begin
    execute 'set local role authenticated';
    insert into public.homework_submissions_v2 (day_id, student_id, answers)
    values (v_day, v_b, '[]'::jsonb);
    execute 'reset role';
    delete from public.homework_submissions_v2 where day_id = v_day and student_id = v_b;
    insert into _hw_id_verify values (3, '② 남의 이름으로 제출', '❌ 들어갔다 — 아직 막히지 않는다');
  exception when others then
    execute 'reset role';
    insert into _hw_id_verify values (3, '② 남의 이름으로 제출', '✅ 막혔다 (' || sqlerrm || ')');
  end;
end $$;

select 단계, 결과 from _hw_id_verify order by 순서;
