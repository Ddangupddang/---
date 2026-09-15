-- ============================================================
-- 기한 잠금이 진짜로 막는지 확인
-- ============================================================
-- Supabase 대시보드 → SQL Editor → 통째로 붙여넣고 Run.
-- 결과가 Results 표에 세 줄로 나온다.
--
-- 학생인 척하고 기한이 지난 요일에 제출을 시도해 본다.
-- 넣은 것은 그 자리에서 지우고, 맨 끝에 남은 것이 없는지 다시 센다.
--
-- (트랜잭션 rollback을 쓰지 않는 이유: 결과를 담은 임시 표까지 함께
--  되돌아가 아무것도 볼 수 없다. raise notice는 이 편집기가 안 보여준다.)
-- ============================================================

create temp table if not exists _hw_verify (순서 int, 단계 text, 결과 text);
truncate _hw_verify;

do $$
declare
  v_day     bigint;
  v_date    date;
  v_student bigint;
  v_profile uuid;
  v_today   date := (now() at time zone 'Asia/Seoul')::date;
  v_other   bigint;
begin
  -- 기한이 지난 요일 하나
  select d.id, d.date into v_day, v_date
  from public.homework_days d
  where v_today > d.date + 1
  order by d.date desc limit 1;

  if v_day is null then
    insert into _hw_verify values (0, '준비', '기한이 지난 요일이 아직 없습니다. 내일 다시 해보세요.');
    return;
  end if;

  -- 그 요일을 아직 내지 않은 학생 계정 하나
  select p.student_id, p.id into v_student, v_profile
  from public.profiles p
  where p.role = 'student' and p.student_id is not null
    and not exists (
      select 1 from public.homework_submissions_v2 s
      where s.day_id = v_day and s.student_id = p.student_id)
  limit 1;

  if v_student is null then
    insert into _hw_verify values (0, '준비', '쓸 만한 학생 계정을 못 찾았습니다.');
    return;
  end if;

  select st.id into v_other from public.students st where st.id <> v_student limit 1;

  insert into _hw_verify values (
    0, '시험 대상',
    format('요일 %s (마감 %s) · 학생 %s · 서버가 보는 오늘 %s', v_day, v_date, v_student, v_today));

  -- 그 학생인 척한다
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_profile::text, 'role', 'authenticated')::text, true);

  -- ① 기한이 지났으니 막혀야 한다
  begin
    execute 'set local role authenticated';
    insert into public.homework_submissions_v2 (day_id, student_id, answers)
    values (v_day, v_student, '[]'::jsonb);
    execute 'reset role';
    delete from public.homework_submissions_v2 where day_id = v_day and student_id = v_student;
    insert into _hw_verify values (1, '① 기한 지난 제출', '❌ 들어갔다 — 정책이 막지 못한다');
  exception when others then
    execute 'reset role';
    insert into _hw_verify values (1, '① 기한 지난 제출', '✅ 막혔다 (' || sqlerrm || ')');
  end;

  -- ② 열어주면 통과해야 한다
  insert into public.homework_reopens (day_id, student_id) values (v_day, v_student)
  on conflict do nothing;
  begin
    execute 'set local role authenticated';
    insert into public.homework_submissions_v2 (day_id, student_id, answers)
    values (v_day, v_student, '[]'::jsonb);
    execute 'reset role';
    delete from public.homework_submissions_v2 where day_id = v_day and student_id = v_student;
    insert into _hw_verify values (2, '② 열어준 뒤 제출', '✅ 들어갔다 — 구제책이 동작한다');
  exception when others then
    execute 'reset role';
    insert into _hw_verify values (2, '② 열어준 뒤 제출', '❌ 막혔다 (' || sqlerrm || ') — 열어주기가 듣지 않는다');
  end;
  delete from public.homework_reopens where day_id = v_day and student_id = v_student;

  -- ③ 학생이 스스로 열어주기 행을 넣을 수 있으면 잠금이 무의미하다
  begin
    execute 'set local role authenticated';
    insert into public.homework_reopens (day_id, student_id) values (v_day, coalesce(v_other, v_student));
    execute 'reset role';
    delete from public.homework_reopens where day_id = v_day and student_id = coalesce(v_other, v_student);
    insert into _hw_verify values (3, '③ 학생이 직접 열기', '❌ 들어갔다 — 학생이 기한을 스스로 풀 수 있다');
  exception when others then
    execute 'reset role';
    insert into _hw_verify values (3, '③ 학생이 직접 열기', '✅ 막혔다 (' || sqlerrm || ')');
  end;

  -- ④ 남의 이름으로 제출할 수 있나 (아직 안 막은 항목)
  begin
    execute 'set local role authenticated';
    insert into public.homework_submissions_v2 (day_id, student_id, answers)
    values (v_day, coalesce(v_other, v_student), '[]'::jsonb);
    execute 'reset role';
    delete from public.homework_submissions_v2
     where day_id = v_day and student_id = coalesce(v_other, v_student);
    insert into _hw_verify values (4, '④ 남의 이름으로 제출', '❌ 들어갔다 — 아직 안 막았다(알고 있는 항목)');
  exception when others then
    execute 'reset role';
    insert into _hw_verify values (4, '④ 남의 이름으로 제출', '✅ 막혔다 (' || sqlerrm || ')');
  end;
end $$;

-- 넣었던 것이 전부 지워졌는지 확인하고 결과를 함께 보여준다
insert into _hw_verify
select 9, '뒷정리',
       case when (select count(*) from public.homework_reopens) = 0
            then '✅ 남은 열어주기 0건'
            else '⚠️ 열어주기가 ' || (select count(*) from public.homework_reopens) || '건 남아 있음 — 확인 필요'
       end;

select 단계, 결과 from _hw_verify order by 순서;
