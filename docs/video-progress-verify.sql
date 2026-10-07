-- ============================================================
-- 영상 시청 추적 규칙이 진짜로 지켜지는지 확인
-- ============================================================
-- Supabase SQL Editor 에 통째로 붙여넣고 Run (또는 run_sql.sh).
-- 학생인 척하고 저장해 본 뒤, 응답이 아니라 남은 행을 직접 조회해서 판정한다
-- (RLS 로 막혀도 API 는 성공처럼 답할 수 있다 — 2026-09-30).
-- 끝에 만든 행을 모두 지운다. 지우는 동안 이벤트가 생겨도 함께 지운다.
-- ============================================================

create temp table if not exists _vp_verify (순서 int, 단계 text, 결과 text);
truncate _vp_verify;

do $$
declare
  v_student  bigint;
  v_profile  uuid;
  v_video    bigint;
  v_teacher  uuid;
  v_other    bigint;
  v_row      public.video_progress;
  v_cnt      int;
begin
  -- 시험 대상: 학생 계정 하나와 그 학생이 볼 수 있는 영상 하나 (아직 기록이 없는 것)
  select p.student_id, p.id into v_student, v_profile
  from public.profiles p
  where p.role = 'student' and p.student_id is not null
  limit 1;

  select v.id into v_video
  from public.videos v join public.students s on s.id = v_student
  where (v.class_id is null or v.class_id = s.class_id)
    and not exists (select 1 from public.video_progress vp where vp.video_id = v.id and vp.student_id = v_student)
  limit 1;

  select id into v_teacher from public.profiles where role in ('teacher', 'admin') limit 1;
  select id into v_other from public.students where id <> v_student limit 1;

  if v_student is null or v_video is null then
    insert into _vp_verify values (0, '준비', '학생 계정이나 볼 수 있는 영상을 못 찾았습니다.');
    return;
  end if;
  insert into _vp_verify values (0, '시험 대상', format('학생 %s · 영상 %s', v_student, v_video));

  -- 학생인 척한다
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_profile::text, 'role', 'authenticated')::text, true);

  -- ① 표에 직접 쓰기는 막혀야 한다
  begin
    execute 'set local role authenticated';
    insert into public.video_progress (video_id, student_id, duration_sec, watched_buckets, completed_at)
    values (v_video, v_student, 100, '{0}', now());
    execute 'reset role';
    insert into _vp_verify values (1, '① 표에 직접 쓰기', '❌ 들어갔다 — 학생이 완료를 꾸밀 수 있다');
  exception when others then
    execute 'reset role';
    insert into _vp_verify values (1, '① 표에 직접 쓰기', '✅ 막혔다 (' || sqlerrm || ')');
  end;
  delete from public.video_progress where video_id = v_video and student_id = v_student;

  -- ② 저장 함수로 첫 저장 → 줄 하나 + 시작 이벤트 하나 (길이 100초, 0~44초 = 칸 0~8)
  execute 'set local role authenticated';
  perform public.save_video_progress(v_video, 100, 44, array[0,1,2,3,4,5,6,7,8]);
  execute 'reset role';
  select * into v_row from public.video_progress where video_id = v_video and student_id = v_student;
  select count(*) into v_cnt from public.video_events where video_id = v_video and student_id = v_student and type = 'start';
  insert into _vp_verify values (2, '② 첫 저장',
    case when v_row.watched_sec = 45 and v_row.completed_at is null and v_cnt = 1
         then '✅ 45초 · 미완료 · 시작 이벤트 1건'
         else format('❌ watched_sec=%s completed=%s 시작이벤트=%s', v_row.watched_sec, v_row.completed_at, v_cnt) end);

  -- ③ 두 번째 저장은 시작 이벤트를 다시 만들지 않는다
  execute 'set local role authenticated';
  perform public.save_video_progress(v_video, 100, 50, array[9]);
  execute 'reset role';
  select count(*) into v_cnt from public.video_events where video_id = v_video and student_id = v_student and type = 'start';
  insert into _vp_verify values (3, '③ 시작 알림은 한 번',
    case when v_cnt = 1 then '✅ 시작 이벤트 그대로 1건' else format('❌ 시작 이벤트 %s건', v_cnt) end);

  -- ④ 다른 기기에서 앞부분만 다시 보내도 칸이 합쳐진다 (덮어쓰지 않는다)
  execute 'set local role authenticated';
  perform public.save_video_progress(v_video, 100, 10, array[0,1]);
  execute 'reset role';
  select * into v_row from public.video_progress where video_id = v_video and student_id = v_student;
  insert into _vp_verify values (4, '④ 칸 합치기',
    case when v_row.watched_sec = 50 and v_row.last_position_sec = 10
         then '✅ 칸 10개(50초) 유지 · 위치는 최신(10초)'
         else format('❌ watched_sec=%s position=%s', v_row.watched_sec, v_row.last_position_sec) end);

  -- ⑤ 90% 를 넘으면 완료 + 완료 이벤트 한 건
  execute 'set local role authenticated';
  perform public.save_video_progress(v_video, 100, 95, array[10,11,12,13,14,15,16,17]);
  execute 'reset role';
  select * into v_row from public.video_progress where video_id = v_video and student_id = v_student;
  select count(*) into v_cnt from public.video_events where video_id = v_video and student_id = v_student and type = 'complete';
  insert into _vp_verify values (5, '⑤ 90% 완료',
    case when v_row.watched_sec = 90 and v_row.completed_at is not null and v_cnt = 1
         then '✅ 90초 · 완료 · 완료 이벤트 1건'
         else format('❌ watched_sec=%s completed=%s 완료이벤트=%s', v_row.watched_sec, v_row.completed_at, v_cnt) end);

  -- ⑥ 길이를 모르는(0) 저장은 완료가 아니다 — 다른 학생 영상 없이 같은 학생의 새 줄로 확인
  delete from public.video_events   where video_id = v_video and student_id = v_student;
  delete from public.video_progress where video_id = v_video and student_id = v_student;
  execute 'set local role authenticated';
  perform public.save_video_progress(v_video, 0, 0, array[0]);
  execute 'reset role';
  select * into v_row from public.video_progress where video_id = v_video and student_id = v_student;
  insert into _vp_verify values (6, '⑥ 길이 0',
    case when v_row.completed_at is null then '✅ 완료로 보지 않는다'
         else '❌ 길이를 모르는데 완료가 찍혔다' end);

  -- ⑦ 남의 기록은 안 보인다
  if v_other is not null then
    insert into public.video_progress (video_id, student_id, duration_sec) values (v_video, v_other, 100)
    on conflict do nothing;
    execute 'set local role authenticated';
    select count(*) into v_cnt from public.video_progress where student_id = v_other;
    execute 'reset role';
    insert into _vp_verify values (7, '⑦ 남의 기록 읽기',
      case when v_cnt = 0 then '✅ 0건 — 보이지 않는다' else format('❌ %s건이 보인다', v_cnt) end);
    delete from public.video_events   where video_id = v_video and student_id = v_other;
    delete from public.video_progress where video_id = v_video and student_id = v_other;
  end if;

  -- ⑧ 교사·관리자가 저장 함수를 부르면 거절된다
  if v_teacher is not null then
    perform set_config('request.jwt.claims',
      json_build_object('sub', v_teacher::text, 'role', 'authenticated')::text, true);
    begin
      execute 'set local role authenticated';
      perform public.save_video_progress(v_video, 100, 10, array[0]);
      execute 'reset role';
      insert into _vp_verify values (8, '⑧ 교사가 저장', '❌ 들어갔다 — 교사가 보면 기록이 생긴다');
    exception when others then
      execute 'reset role';
      insert into _vp_verify values (8, '⑧ 교사가 저장', '✅ 거절 (' || sqlerrm || ')');
    end;
  end if;

  -- 뒷정리
  delete from public.video_events   where video_id = v_video and student_id = v_student;
  delete from public.video_progress where video_id = v_video and student_id = v_student;
end $$;

insert into _vp_verify
select 9, '뒷정리', format('남은 기록 %s건 · 이벤트 %s건 (시험 전부터 있던 것 포함)',
  (select count(*) from public.video_progress), (select count(*) from public.video_events));

select 단계, 결과 from _vp_verify order by 순서;
