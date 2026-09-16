-- ============================================================
-- 2단계 A — 영상·테스트 표의 권한 구멍 막기
-- ============================================================
-- Supabase 대시보드 → SQL Editor → **PART를 하나씩** 복사해 실행한다.
--
-- 왜 하나씩인가:
--   SQL Editor는 붙여넣은 내용 전체를 하나의 트랜잭션으로 처리한다.
--   중간에 한 문장이라도 에러가 나면 앞에서 성공한 것까지 전부 되돌아간다.
--   하나씩 해야 어디서 막혔는지 알 수 있다.
--   모든 PART는 여러 번 실행해도 안전하다.
--
-- 무엇을 고치나 (2026-09-16 확인된 것):
--   네 표 모두 쓰기는 막혀 있는데 **읽기와 삭제가 통째로 열려 있다.**
--   특히 삭제 정책 넷이 `using(true)` — "누구든 통과" 다.
--   교사만 지우게 하는 정책을 옆에 만들어 두셨지만, PERMISSIVE 정책은
--   OR로 묶이므로 `using(true)` 하나가 그걸 전부 무력화한다.
--
-- 여기서 다루지 않는 것:
--   **테스트 정답이 학생에게 내려가는 문제(all_view_tests)** 는 건드리지 않는다.
--   그건 앱이 테스트를 가져오는 경로까지 바꿔야 해서 따로 설계한다(B).
--   여기서는 정답을 '지우지 못하게'만 막는다.
-- ============================================================


-- ══════════════════════════════════════════════════════════
-- PART 0 — 넣기 전에 확인 (아무것도 바꾸지 않는다)
-- ══════════════════════════════════════════════════════════
-- 이 결과를 먼저 보고 PART 1로 넘어간다.
-- ①이 0행이 아니면 그 학생들은 이 정책이 들어가는 순간 시험을 못 낸다.
-- 먼저 학생 관리에서 명부와 연결한 뒤에 진행할 것.

select '① 명부와 어긋난 학생 계정' as 확인,
       coalesce(string_agg(username, ', '), '(없음 — 진행해도 좋다)') as 내용
  from public.profiles
 where role = 'student' and student_id is null;

-- ②가 0행이 아니면 PART 4의 unique 제약이 실패한다. 먼저 정리해야 한다.
select '② 이미 중복된 제출' as 확인,
       coalesce(string_agg('테스트' || test_id || '·학생' || student_id, ', '), '(없음 — 진행해도 좋다)') as 내용
  from (
    select test_id, student_id from public.submissions
    group by test_id, student_id having count(*) > 1
  ) d;

-- ③ 도우미 함수가 있는지 (없으면 docs/homework-deadline.sql 의 PART 1을 먼저 실행)
select '③ 도우미 함수' as 확인,
       string_agg(proname, ', ' order by proname) as 내용
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public' and p.proname in ('hw_is_staff','hw_my_student_id');


-- ══════════════════════════════════════════════════════════
-- PART 1 — 테스트 제출(submissions)
-- ══════════════════════════════════════════════════════════
-- 지금: 로그인만 하면 남의 답안·점수가 다 보이고, 아무나 지울 수 있고,
--       남의 이름으로도 낼 수 있다.

-- 열려 있던 것들을 먼저 치운다 (이름은 2026-09-16 확인된 그대로)
drop policy if exists all_view_submissions    on public.submissions;
drop policy if exists auth_insert_submissions on public.submissions;
drop policy if exists submissions_delete      on public.submissions;

-- 읽기 — 교사는 전부, 학생은 본인 것만.
-- 앱은 제출 직후 넣은 행을 되읽으므로(.insert().select()) 본인 것은 반드시 보여야 한다.
create policy sub_select on public.submissions
for select to authenticated
using (public.hw_is_staff() or student_id = public.hw_my_student_id());

-- 새로 내기 — 본인 이름으로만.
-- 이게 없으면 학생이 API를 직접 불러 남의 이름으로 답안을 넣을 수 있다.
create policy sub_insert on public.submissions
for insert to authenticated
with check (student_id = public.hw_my_student_id());

-- 삭제 — 교사만.
-- 앱에는 제출을 지우는 기능이 없다(확인함). 나중에 "제출 취소"를 만들 때를 위해
-- 교사에게만 열어 둔다. 학생이 남의 답안을 지우던 구멍은 이걸로 막힌다.
create policy sub_delete on public.submissions
for delete to authenticated
using (public.hw_is_staff());

-- 채점(update)은 staff_grade_submissions 가 이미 교사만 열고 있다. 그대로 둔다.

-- 확인 (4행: delete / insert / select / update)
select policyname, cmd, qual, with_check from pg_policies
 where schemaname = 'public' and tablename = 'submissions' order by cmd, policyname;


-- ══════════════════════════════════════════════════════════
-- PART 2 — 테스트(tests) 삭제 구멍
-- ══════════════════════════════════════════════════════════
-- 지금: tests_delete 가 using(true) 라 학생이 시험 자체를 지울 수 있다.
-- staff_delete_tests(교사만) 는 이미 있으므로 열린 것만 치우면 된다.

drop policy if exists tests_delete on public.tests;

-- 확인 (delete 가 staff_delete_tests 하나만 남아야 한다)
select policyname, cmd, qual from pg_policies
 where schemaname = 'public' and tablename = 'tests' order by cmd, policyname;


-- ══════════════════════════════════════════════════════════
-- PART 3 — 영상(videos) · 영상 댓글(video_comments)
-- ══════════════════════════════════════════════════════════
-- 영상은 아직 0건이라 고쳐도 잃을 것이 없다.

-- 영상 삭제 — staff_delete_videos(교사만)가 이미 있으니 열린 것만 치운다
drop policy if exists videos_delete on public.videos;

-- 댓글 삭제 — 교사만. 앱에는 댓글을 지우는 기능이 아직 없다(확인함).
drop policy if exists video_comments_delete on public.video_comments;
create policy comments_delete on public.video_comments
for delete to authenticated
using (public.hw_is_staff());

-- 댓글 쓰기 — 본인 이름으로만.
-- 학생 화면에는 익명으로 보이지만 교사 화면에는 실명이 뜬다.
-- 이걸 안 막으면 남을 사칭해 질문을 남길 수 있다.
drop policy if exists auth_insert_comments on public.video_comments;
create policy comments_insert on public.video_comments
for insert to authenticated
with check (student_id = public.hw_my_student_id());

-- 답글(update)은 staff_reply_comments 가 이미 교사만 열고 있다. 그대로 둔다.

-- 확인
select tablename, policyname, cmd, qual, with_check from pg_policies
 where schemaname = 'public' and tablename in ('videos','video_comments')
 order by tablename, cmd, policyname;


-- ══════════════════════════════════════════════════════════
-- PART 4 — 같은 테스트를 두 번 못 내게
-- ══════════════════════════════════════════════════════════
-- 지금은 화면에서만 막고 있다(이미 낸 테스트는 다시 안 열린다).
-- 화면만 막으면 탭 두 개로 우회할 수 있다 — 과제 때 겪은 그 일이다.
-- PART 0의 ②가 "없음"이어야 이 문장이 성공한다.

create unique index if not exists submissions_test_student_uniq
  on public.submissions (test_id, student_id);

-- 확인
select indexname, indexdef from pg_indexes
 where schemaname = 'public' and tablename = 'submissions'
 order by indexname;


-- ══════════════════════════════════════════════════════════
-- PART 5 — 진짜 막혔는지, 그리고 정상 동작이 안 막혔는지
-- ══════════════════════════════════════════════════════════
-- 막는 것만 확인하면 반쪽이다. **되어야 하는 것이 되는지**를 같이 본다.
-- 시험 삼아 넣는 행은 그 자리에서 지운다.

create temp table if not exists _s2 (순서 int, 단계 text, 결과 text);
truncate _s2;

do $$
declare
  v_prof  uuid;
  v_me    bigint;
  v_other bigint;
  v_test  bigint;
  v_cnt   int;
  v_new   bigint;
begin
  select p.id, p.student_id into v_prof, v_me
  from public.profiles p
  where p.role = 'student' and p.student_id is not null
  order by p.id limit 1;

  if v_prof is null then
    insert into _s2 values (0, '준비', '명부와 연결된 학생 계정이 없습니다.');
    return;
  end if;

  select s.id into v_other from public.students s where s.id <> v_me order by s.id limit 1;
  select t.id into v_test  from public.tests t order by t.id limit 1;

  perform set_config('request.jwt.claims',
    json_build_object('sub', v_prof::text, 'role', 'authenticated')::text, true);

  -- ⓐ 남의 답안·점수 (안 보여야 한다)
  begin
    execute 'set local role authenticated';
    select count(*) into v_cnt from public.submissions where student_id <> v_me;
    execute 'reset role';
    insert into _s2 values (1, 'ⓐ 남의 답안·점수',
      case when v_cnt = 0 then '✅ 안 보인다' else '❌ 아직 ' || v_cnt || '건 보인다' end);
  exception when others then
    execute 'reset role';
    insert into _s2 values (1, 'ⓐ 남의 답안·점수', '✅ 막혔다 (' || sqlerrm || ')');
  end;

  -- ⓑ 본인 제출은 보여야 한다 (여기가 ❌면 학생이 자기 점수를 못 본다)
  begin
    execute 'set local role authenticated';
    select count(*) into v_cnt from public.submissions where student_id = v_me;
    execute 'reset role';
    insert into _s2 values (2, 'ⓑ 본인 제출 조회',
      case when v_cnt > 0 then '✅ 보인다 (' || v_cnt || '건)'
           else '— 이 학생의 제출이 아직 없어 판단 불가' end);
  exception when others then
    execute 'reset role';
    insert into _s2 values (2, 'ⓑ 본인 제출 조회', '❌ 막혔다 (' || sqlerrm || ') — 정책이 너무 빡빡하다!');
  end;

  -- ⓒ 남의 이름으로 제출 (막혀야 한다)
  if v_test is null or v_other is null then
    insert into _s2 values (3, 'ⓒ 남의 이름으로 제출', '테스트나 다른 학생이 없어 판단 불가');
  else
    begin
      execute 'set local role authenticated';
      insert into public.submissions (test_id, student_id, answers)
      values (v_test, v_other, '[]'::jsonb) returning id into v_new;
      execute 'reset role';
      delete from public.submissions where id = v_new;
      insert into _s2 values (3, 'ⓒ 남의 이름으로 제출', '❌ 들어갔다 (넣은 행은 지웠다)');
    exception when unique_violation then
      -- 그 학생이 이미 낸 테스트였다. 정책이 막은 것이 아니므로 판단할 수 없다.
      execute 'reset role';
      insert into _s2 values (3, 'ⓒ 남의 이름으로 제출',
        '판단 불가 — 그 학생이 이미 낸 테스트라 중복 제약에 먼저 걸렸다');
    when others then
      execute 'reset role';
      insert into _s2 values (3, 'ⓒ 남의 이름으로 제출', '✅ 막혔다 (' || sqlerrm || ')');
    end;
  end if;

  -- ⓓ 테스트 삭제 (막혀야 한다)
  --    진짜 시험지를 시험 대상으로 쓰면 지워졌을 때 돌이킬 수 없다.
  --    그래서 가짜 행을 하나 만들어 그것을 지워보게 한다.
  --    (이 insert 는 지금 역할 그대로라 RLS를 거치지 않는다 — 의도한 것이다)
  begin
    insert into public.tests (title, date, status, questions)
    values ('__삭제시험용_지워도됨__', current_date, 'ready', '[]'::jsonb)
    returning id into v_new;

    execute 'set local role authenticated';
    delete from public.tests where id = v_new;
    execute 'reset role';

    select count(*) into v_cnt from public.tests where id = v_new;
    if v_cnt = 0 then
      insert into _s2 values (4, 'ⓓ 학생이 테스트 삭제', '❌ 지워졌다 — 아직 막히지 않았다');
    else
      insert into _s2 values (4, 'ⓓ 학생이 테스트 삭제', '✅ 막혔다 (가짜 행은 아래에서 지운다)');
    end if;

    delete from public.tests where id = v_new;   -- 뒷정리
  exception when others then
    execute 'reset role';
    delete from public.tests where title = '__삭제시험용_지워도됨__';
    insert into _s2 values (4, 'ⓓ 학생이 테스트 삭제', '✅ 막혔다 (' || sqlerrm || ')');
  end;

  -- ⓔ 본인 이름으로 제출은 되어야 한다 (이미 낸 테스트면 unique 때문에 막힐 수 있다)
  if v_test is null then
    insert into _s2 values (5, 'ⓔ 본인 이름으로 제출', '테스트가 없어 판단 불가');
  else
    begin
      execute 'set local role authenticated';
      insert into public.submissions (test_id, student_id, answers)
      values (v_test, v_me, '[]'::jsonb) returning id into v_new;
      execute 'reset role';
      delete from public.submissions where id = v_new;
      insert into _s2 values (5, 'ⓔ 본인 이름으로 제출', '✅ 된다 (넣은 행은 지웠다)');
    exception when unique_violation then
      execute 'reset role';
      insert into _s2 values (5, 'ⓔ 본인 이름으로 제출', '✅ 정상 — 이미 낸 테스트라 중복 제출이 막혔다');
    when others then
      execute 'reset role';
      insert into _s2 values (5, 'ⓔ 본인 이름으로 제출', '❌ 막혔다 (' || sqlerrm || ') — 정책이 너무 빡빡하다!');
    end;
  end if;
end $$;

select 단계, 결과 from _s2 order by 순서;


-- ══════════════════════════════════════════════════════════
-- 되돌리기 — 무언가 망가졌을 때만
-- ══════════════════════════════════════════════════════════
-- 아래를 실행하면 2026-09-16 이전 상태(전부 열린 상태)로 돌아간다.
-- 구멍도 같이 돌아오므로, 급한 불을 끈 뒤 원인을 찾고 다시 막을 것.
--
-- drop policy if exists sub_select      on public.submissions;
-- drop policy if exists sub_insert      on public.submissions;
-- drop policy if exists sub_delete      on public.submissions;
-- drop policy if exists comments_delete on public.video_comments;
-- drop policy if exists comments_insert on public.video_comments;
-- drop index  if exists public.submissions_test_student_uniq;
--
-- create policy all_view_submissions    on public.submissions for select using (auth.uid() is not null);
-- create policy auth_insert_submissions on public.submissions for insert with check (auth.uid() is not null);
-- create policy submissions_delete      on public.submissions for delete using (true);
-- create policy tests_delete            on public.tests       for delete using (true);
-- create policy videos_delete           on public.videos      for delete using (true);
-- create policy video_comments_delete   on public.video_comments for delete using (true);
-- create policy auth_insert_comments    on public.video_comments for insert with check (auth.uid() is not null);
