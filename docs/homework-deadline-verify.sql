-- ============================================================
-- 기한 잠금이 진짜로 막는지 확인 (아무것도 남기지 않는다)
-- ============================================================
-- Supabase 대시보드 → SQL Editor → 통째로 붙여넣고 Run.
--
-- 학생인 척하고 기한이 지난 요일에 제출을 시도해 본다.
-- 전부 트랜잭션 안에서 하고 맨 끝에 rollback 하므로 자료는 그대로다.
--
-- 왜 필요한가: 화면으로 확인하려면 기한이 지난 요일이 있어야 하는데,
-- 이번 주에서는 그런 요일이 내일에야 생긴다. 정책은 지금도 살아 있으므로
-- 여기서 미리 확인한다.
-- ============================================================

begin;

do $$
declare
  v_day      bigint;
  v_date     date;
  v_student  bigint;
  v_profile  uuid;
  v_today    date := (now() at time zone 'Asia/Seoul')::date;
begin
  -- ── 기한이 지난 요일 하나 고른다 ────────────────────────────
  select d.id, d.date into v_day, v_date
  from public.homework_days d
  where v_today > d.date + 1
  order by d.date desc
  limit 1;

  if v_day is null then
    raise notice '기한이 지난 요일이 아직 없습니다. 내일 다시 해보세요.';
    return;
  end if;

  -- ── 아직 그 요일을 내지 않은 학생 계정 하나 ─────────────────
  select p.student_id, p.id into v_student, v_profile
  from public.profiles p
  where p.role = 'student' and p.student_id is not null
    and not exists (
      select 1 from public.homework_submissions_v2 s
      where s.day_id = v_day and s.student_id = p.student_id
    )
  limit 1;

  if v_student is null then
    raise notice '쓸 만한 학생 계정을 못 찾았습니다.';
    return;
  end if;

  raise notice '--- 시험 대상: 요일 %(마감 %), 학생 % / 오늘 % ---', v_day, v_date, v_student, v_today;

  -- ── 그 학생인 척한다 ───────────────────────────────────────
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_profile::text, 'role', 'authenticated')::text,
    true
  );
  execute 'set local role authenticated';

  -- ① 기한이 지났으니 막혀야 한다
  begin
    insert into public.homework_submissions_v2 (day_id, student_id, answers)
    values (v_day, v_student, '[]'::jsonb);
    raise notice '① 기한 지난 제출: ❌ 들어갔다 — 정책이 막지 못하고 있다';
  exception when others then
    raise notice '① 기한 지난 제출: ✅ 막혔다 (%)', sqlerrm;
  end;

  -- ② 열어주면 통과해야 한다
  execute 'reset role';
  insert into public.homework_reopens (day_id, student_id)
  values (v_day, v_student)
  on conflict do nothing;

  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_profile::text, 'role', 'authenticated')::text,
    true
  );
  execute 'set local role authenticated';

  begin
    insert into public.homework_submissions_v2 (day_id, student_id, answers)
    values (v_day, v_student, '[]'::jsonb);
    raise notice '② 열어준 뒤 제출:   ✅ 들어갔다 — 구제책이 동작한다';
  exception when others then
    raise notice '② 열어준 뒤 제출:   ❌ 막혔다 (%) — 열어주기가 듣지 않는다', sqlerrm;
  end;

  -- ③ 학생이 스스로 열어주기 행을 넣을 수 있으면 잠금이 무의미하다
  begin
    insert into public.homework_reopens (day_id, student_id)
    values (v_day, v_student + 1);
    raise notice '③ 학생이 직접 열기: ❌ 들어갔다 — 학생이 기한을 스스로 풀 수 있다';
  exception when others then
    raise notice '③ 학생이 직접 열기: ✅ 막혔다 (%)', sqlerrm;
  end;

  execute 'reset role';
end $$;

-- 아무것도 남기지 않는다
rollback;

-- 되돌아갔는지 확인 — 위에서 넣은 것이 없어야 한다
select count(*) as 남은열어주기 from public.homework_reopens;
