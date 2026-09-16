-- ============================================================
-- 2단계(영상·테스트) 표가 라이브 DB에서 어떤 상태인지 확인
-- ============================================================
-- Supabase 대시보드 → SQL Editor → 통째로 붙여넣고 Run.
--
-- 읽기가 대부분이다. 학생으로 가장해 시험 삼아 넣어보는 행이 몇 개 있는데
-- 전부 그 자리에서 지운다. 지우는 것까지 실패하면 결과에 그렇게 적힌다.
--
-- 왜 보는가:
--   저장소의 docs/*.sql 과 실제 DB가 다르다는 것이 이미 확인된 사실이다.
--   과제 표 다섯 개는 2026-09-11에 확인했지만, 영상·테스트 표는 한 번도
--   들여다본 적이 없다. 화면은 멀쩡한데 학생 계정에서만 조용히 막히거나,
--   반대로 학생이 보면 안 되는 것까지 보이는 상태일 수 있다.
--
-- 특히 ㉮번을 눈여겨볼 것 — 테스트 정답이 학생에게 내려가는지 본다.
-- ============================================================


-- ── 1. 표가 있나, RLS는 켜져 있나 ─────────────────────────────
select
  c.relname                as 표,
  c.relrowsecurity         as rls켜짐,
  c.relforcerowsecurity    as 소유자에게도강제
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('videos','video_comments','tests','submissions')
order by c.relname;


-- ── 2. 각 표에 걸린 정책 전부 ─────────────────────────────────
-- 정책이 여러 개 쌓여 있으면(과제 아닌 표에서 이미 겪었다) 그중 하나가
-- 권한 오류를 내는 순간 조회가 통째로 실패한다.
select
  tablename   as 표,
  policyname  as 정책이름,
  cmd         as 대상동작,
  roles       as 대상역할,
  qual        as using조건,
  with_check  as withcheck조건
from pg_policies
where schemaname = 'public'
  and tablename in ('videos','video_comments','tests','submissions')
order by tablename, cmd, policyname;


-- ── 3. 표별 정책 개수 요약 ────────────────────────────────────
select tablename as 표, count(*) as 정책수,
       string_agg(policyname, ', ' order by policyname) as 정책들
from pg_policies
where schemaname = 'public'
  and tablename in ('videos','video_comments','tests','submissions')
group by tablename
order by tablename;


-- ── 4. 한 학생이 같은 테스트를 두 번 낼 수 있나 ───────────────
-- 화면에서는 이미 낸 테스트를 다시 못 열게 막아뒀다. 다만 화면만 막으면
-- 탭 두 개로 우회할 수 있다 — 과제 때 겪은 그 일이다.
-- (test_id, student_id) 에 unique 가 걸려 있어야 DB가 두 번째를 거절한다.
select
  con.conname                                   as 제약이름,
  pg_get_constraintdef(con.oid)                 as 내용
from pg_constraint con
where con.conrelid = 'public.submissions'::regclass
  and con.contype in ('u','p')
order by con.conname;

-- 같은 표에 걸린 unique 인덱스도 함께 본다 (제약 없이 인덱스만 있을 수 있다)
select indexname as 인덱스, indexdef as 내용
from pg_indexes
where schemaname = 'public' and tablename = 'submissions'
order by indexname;

-- 이미 중복으로 들어간 것이 있는지 (있다면 unique 를 거는 순간 실패한다)
select test_id as 테스트, student_id as 학생, count(*) as 제출수
from public.submissions
group by test_id, student_id
having count(*) > 1
order by count(*) desc;


-- ============================================================
-- 5. 학생으로 가장해서 실제로 되는지 본다
-- ============================================================
create temp table if not exists _stage2 (순서 int, 단계 text, 결과 text);
truncate _stage2;

do $$
declare
  v_prof     uuid;    -- 학생 계정(로그인 주체)
  v_me       bigint;  -- 그 학생의 명부 id
  v_other    bigint;  -- 다른 학생의 명부 id
  v_test     bigint;
  v_video    bigint;
  v_cnt      int;
  v_answers  text;
  v_new      bigint;
begin
  -- 시험에 쓸 학생 하나 (명부와 연결된 계정이어야 한다)
  select p.id, p.student_id into v_prof, v_me
  from public.profiles p
  where p.role = 'student' and p.student_id is not null
  order by p.id limit 1;

  if v_prof is null then
    insert into _stage2 values (0, '준비', '명부와 연결된 학생 계정이 없습니다. 학생 관리에서 연결한 뒤 다시 해보세요.');
    return;
  end if;

  select s.id into v_other
  from public.students s where s.id <> v_me order by s.id limit 1;

  insert into _stage2 values (0, '시험 대상', format('학생 명부 id=%s (다른 학생=%s)', v_me, coalesce(v_other::text, '없음')));

  -- 이제부터 이 학생인 척한다
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_prof::text, 'role', 'authenticated')::text, true);

  -- ㉮ 테스트 정답이 학생에게 보이는가  ★ 가장 중요 ★
  --    앱은 tests 를 select('*') 로 통째로 받아온다. questions 안에 정답이
  --    들어 있으므로, 여기서 보인다면 학생 브라우저에도 정답이 내려간다.
  --    (개발자도구 네트워크 탭이면 누구나 볼 수 있다)
  begin
    execute 'set local role authenticated';
    select count(*) into v_cnt from public.tests;
    select string_agg(distinct (q->>'answer'), ', ')
      into v_answers
      from public.tests t, jsonb_array_elements(t.questions) q
     where coalesce(q->>'answer', '') <> ''
     limit 1;
    execute 'reset role';

    if v_cnt = 0 then
      insert into _stage2 values (1, '㉮ 학생이 테스트를 읽는가',
        '테스트가 0건이라 판단 불가. 테스트를 하나 출제한 뒤 다시 해보세요.');
    elsif v_answers is null then
      insert into _stage2 values (1, '㉮ 학생이 테스트 정답을 읽는가',
        format('테스트 %s건은 보이지만 정답 값은 비어 있다', v_cnt));
    else
      insert into _stage2 values (1, '㉮ 학생이 테스트 정답을 읽는가',
        format('❌ 정답이 보인다 — 테스트 %s건, 예: %s', v_cnt, left(v_answers, 60)));
    end if;
  exception when others then
    execute 'reset role';
    insert into _stage2 values (1, '㉮ 학생이 테스트 정답을 읽는가',
      '✅ 막혔다 (' || sqlerrm || ')');
  end;

  -- ㉯ 남의 답안·점수가 보이는가
  begin
    execute 'set local role authenticated';
    select count(*) into v_cnt from public.submissions where student_id <> v_me;
    execute 'reset role';
    insert into _stage2 values (2, '㉯ 남의 답안·점수가 보이는가',
      case when v_cnt = 0 then '✅ 안 보인다 (또는 남의 제출이 아직 없다)'
           else format('❌ %s건 보인다 — 다른 학생 점수까지 읽힌다', v_cnt) end);
  exception when others then
    execute 'reset role';
    insert into _stage2 values (2, '㉯ 남의 답안·점수가 보이는가', '✅ 막혔다 (' || sqlerrm || ')');
  end;

  -- ㉰ 학생이 영상을 등록할 수 있는가 (막혀야 한다)
  begin
    execute 'set local role authenticated';
    -- created_at 까지 채우는 이유: 이 칸이 NOT NULL 이면 정책이 아니라 칸 때문에
    -- 실패하는데, 그러면 "막혔다"로 잘못 읽힌다.
    insert into public.videos (title, video_id, created_at)
    values ('__확인용_지워도됨__', 'zzzz', current_date)
    returning id into v_new;
    execute 'reset role';
    delete from public.videos where id = v_new;
    insert into _stage2 values (3, '㉰ 학생이 영상을 등록하는가',
      '❌ 등록됐다 — 학생이 영상을 올릴 수 있다 (넣은 행은 지웠다)');
  exception when others then
    execute 'reset role';
    insert into _stage2 values (3, '㉰ 학생이 영상을 등록하는가', '✅ 막혔다 (' || sqlerrm || ')');
  end;

  -- ㉱ 학생이 남의 댓글을 지울 수 있는가 (막혀야 한다)
  --    실제로 지우지 않는다 — 지워질 행이 몇 개인지만 세어본다.
  begin
    execute 'set local role authenticated';
    select count(*) into v_cnt
      from public.video_comments
     where student_id is distinct from v_me;
    execute 'reset role';
    insert into _stage2 values (4, '㉱ 남의 댓글이 보이는가',
      case when v_cnt = 0 then '남의 댓글이 아직 없다'
           else format('%s건 보인다 — 영상 댓글은 원래 서로 보이는 것이라 정상. 다만 수정·삭제까지 열려 있으면 문제', v_cnt) end);
  exception when others then
    execute 'reset role';
    insert into _stage2 values (4, '㉱ 남의 댓글이 보이는가', '조회가 막혔다 (' || sqlerrm || ') — 학생 화면에서 댓글이 안 보인다는 뜻');
  end;

  -- ㉲ 학생이 댓글을 남길 수 있는가 (돼야 한다)
  begin
    select id into v_video from public.videos order by id limit 1;
    if v_video is null then
      insert into _stage2 values (5, '㉲ 학생이 댓글을 남기는가', '영상이 0건이라 판단 불가. 영상을 하나 등록한 뒤 다시 해보세요.');
    else
      execute 'set local role authenticated';
      insert into public.video_comments (video_id, student_id, content)
      values (v_video, v_me, '__확인용_지워도됨__')
      returning id into v_new;
      execute 'reset role';
      delete from public.video_comments where id = v_new;
      insert into _stage2 values (5, '㉲ 학생이 댓글을 남기는가', '✅ 된다 (넣은 댓글은 지웠다)');
    end if;
  exception when others then
    execute 'reset role';
    insert into _stage2 values (5, '㉲ 학생이 댓글을 남기는가', '❌ 막혔다 (' || sqlerrm || ') — 학생이 질문을 못 남긴다!');
  end;

  -- ㉳ 학생이 테스트를 출제할 수 있는가 (막혀야 한다)
  begin
    execute 'set local role authenticated';
    insert into public.tests (title, date, status, questions)
    values ('__확인용_지워도됨__', current_date, 'ready', '[]'::jsonb)
    returning id into v_new;
    execute 'reset role';
    delete from public.tests where id = v_new;
    insert into _stage2 values (6, '㉳ 학생이 테스트를 출제하는가',
      '❌ 출제됐다 — 학생이 테스트를 만들 수 있다 (넣은 행은 지웠다)');
  exception when others then
    execute 'reset role';
    insert into _stage2 values (6, '㉳ 학생이 테스트를 출제하는가', '✅ 막혔다 (' || sqlerrm || ')');
  end;

end $$;

select 단계, 결과 from _stage2 order by 순서;
