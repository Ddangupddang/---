# 영상 시청 추적 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 학생이 영상을 처음 보기 시작할 때와 다 봤을 때 교사에게 알림을 보내고, 교사는 학생별 시청 위치를, 학생은 이어보기를 본다.

**Architecture:** 학생 화면의 YouTube 플레이어가 실제로 재생된 5초 칸을 모아 DB 함수 `save_video_progress` 로 저장한다. DB 트리거가 칸 합치기·90% 완료 판정을 하고, 시작·완료 순간에 `video_events` 에 한 줄을 넣는다. 그 INSERT 를 Supabase Database Webhook 이 `api/notify-video.js` 로 보내 담당 교사·관리자에게 웹 푸시한다 (Q&A 알림과 같은 틀).

**Tech Stack:** React 19 + Vite + Tailwind 4, Supabase(PostgreSQL · RLS · RPC), Vercel 서버리스, `web-push`, YouTube IFrame Player API, vitest + @testing-library/react (jsdom)

**Spec:** `docs/superpowers/specs/2026-10-07-video-watch-tracking-design.md`

## Global Constraints

- 한글 주석, 개발 초보자가 읽을 수 있게 왜 그렇게 하는지 적는다 (CLAUDE.md)
- 색은 `@theme` 토큰 클래스만 (`bg-ink`, `text-ink-mute`, `border-line` …). hex 금지. 모서리 `rounded`, 뱃지만 `rounded-sm`. 그림자 대신 `border border-line`
- `api/` 의 `.js` 는 서버리스 함수 하나다 — **이번에 10 → 11개, 상한 12**. 테스트 파일은 `.vercelignore` 가 뺀다
- `api/` 에서 부르는 상대 경로 import 는 **`.js` 확장자를 붙인다**
- 완료 기준: `watched_sec >= 0.9 × duration_sec` 이고 `duration_sec > 0`
- 칸 크기 5초, 자연 재생으로 보는 1초 간 위치 변화 `0 < Δ ≤ 3`초, 저장 주기 10초
- 시작 알림은 학생 × 영상당 한 번 (`video_progress` 첫 INSERT 때만)
- 알림 대상: 학생 반 담당 교사 + 관리자 전원, 중복 제거. 비밀값은 기존 `QNA_WEBHOOK_SECRET`
- 알림 문구: 제목 `영상 시청 시작` / `영상 시청 완료`, 본문 `학생이름 · 영상제목`, url `/videos`
- **데모 DB(`zlvubufzbdhwvdtpomlz`)에서만 개발·검증한다.** 운영 DB(`pbihnyojlwibiuahtyzx`) 적용·배포·웹훅 설정은 마지막 Task 에서 **사용자 확인 후**
- **데모 DB에는 웹훅을 걸지 않는다** (2026-09-30 데모가 운영 서버를 불러 원장님 폰에 가짜 알림이 간 사고)
- 화면을 바꿀 때마다 390px 로 직접 찍어 확인한다
- 기존 테스트 756개가 계속 통과해야 한다

## Review Focus

1. **메타데이터 오기 전 저장 (길이 0)** — 플레이어가 길이를 알려주기 전에 저장되면 0의 90%=0 이라 즉시 완료가 찍힐 수 있다. 완료로 보지 않아야 한다 → Task 1 검증 SQL ⑥
2. **10초 안에 앱을 닫거나 다른 앱으로 전환** — 주기 저장 전에 나가도 본 칸이 남아야 한다 → Task 6 테스트 "화면이 숨겨지면 바로 저장한다"
3. **교사·관리자가 영상을 재생** — 기록이 생기면 안 된다 (학생 목록에 섞이고 알림이 간다) → Task 6 테스트 "학생이 아니면 저장하지 않는다" + Task 1 검증 SQL ⑤
4. **두 기기(폰·PC)에서 번갈아 시청** — 나중 저장이 앞 기록을 덮으면 안 된다, 칸은 합쳐져야 한다 → Task 1 검증 SQL ④
5. **되감아서 다시 본 구간** — 같은 칸이 두 번 세어져 시청 시간이 부풀면 안 된다 → Task 2 테스트 "되감기·건너뛰기는 세지 않는다" + Task 3 테스트 "같은 칸은 한 번만"

---

## 파일 구조

| 파일 | 책임 |
|---|---|
| `docs/video-progress.sql` (새) | 표 2개 · 트리거 · 저장 함수 · RLS. 데모와 운영에 같은 파일을 돌린다 |
| `docs/video-progress-verify.sql` (새) | 학생인 척하고 규칙이 지켜지는지 결과 표로 확인 |
| `src/utils/videoProgress.js` (새) | 순수 함수: 칸 계산 · 시간 표시 · 상태 · 정렬 · 요약 · 카드 문구 |
| `src/utils/watchTracker.js` (새) | 순수 객체: 1초 tick 을 받아 칸을 모으고 10초마다 save 호출 |
| `src/utils/videoProgressApi.js` (새) | Supabase 호출: 저장 RPC · 진행 기록 읽기 · 행 변환 |
| `src/hooks/useYouTubePlayer.js` (새) | IFrame API 스크립트를 한 번만 불러 플레이어를 만든다 |
| `src/components/video/TrackedPlayer.jsx` (새) | 플레이어 + 학생일 때만 추적 (tick · 일시정지 · 숨김 · 언마운트 저장) |
| `src/components/video/ResumeBanner.jsx` (새) | "지난번 12:30까지 봤어요 [이어보기]" |
| `src/components/video/WatchProgressLine.jsx` (새) | "실제 시청 18:20 / 25:00 (73%)" / "✓ 시청 완료" |
| `src/components/video/WatchRoster.jsx` (새) | 교사 시청 현황: 요약 + 학생 목록 |
| `src/components/VideoPlayer.jsx` (수정) | iframe → TrackedPlayer, 학생 이어보기·진행, 교사 [댓글 \| 시청 현황] 탭 |
| `src/components/VideoCard.jsx` (수정) | `progressLabel` 표시 |
| `src/pages/Videos.jsx` (수정) | 진행 기록을 읽어 카드·플레이어에 넘김 |
| `api/notify-video.js` (새) | 웹훅 → 담당 교사·관리자 웹 푸시 |

---

### Task 1: DB — 표 · 트리거 · 저장 함수 · RLS, 그리고 검증 SQL

**Files:**
- Create: `docs/video-progress.sql`
- Create: `docs/video-progress-verify.sql`

**Interfaces:**
- Produces:
  - 표 `public.video_progress(id, video_id, student_id, duration_sec, last_position_sec, watched_buckets integer[], watched_sec, started_at, completed_at, updated_at)`, `UNIQUE(video_id, student_id)`
  - 표 `public.video_events(id, type 'start'|'complete', video_id, student_id, created_at)`
  - RPC `public.save_video_progress(p_video_id bigint, p_duration_sec integer, p_position_sec integer, p_buckets integer[]) returns public.video_progress`

- [ ] **Step 1: 마이그레이션 SQL 작성**

`docs/video-progress.sql`:

```sql
-- ============================================================
-- 영상 시청 추적 (2026-10-07)
-- ============================================================
-- 설계: docs/superpowers/specs/2026-10-07-video-watch-tracking-design.md
-- 데모(graduate)에 먼저 돌리고 docs/video-progress-verify.sql 로 확인한 뒤 운영에 돌린다.
-- 여러 번 돌려도 같은 결과가 나오게 썼다 (if not exists / create or replace / drop policy if exists).
-- ============================================================

-- ── 1. 표 ────────────────────────────────────────────────
-- 학생 × 영상당 한 줄. 기록은 명부(students)에 건다 — "누구의 기록인가"
create table if not exists public.video_progress (
  id                bigint generated always as identity primary key,
  video_id          bigint not null references public.videos(id)   on delete cascade,
  student_id        bigint not null references public.students(id) on delete cascade,
  duration_sec      integer not null default 0 check (duration_sec >= 0),
  last_position_sec integer not null default 0 check (last_position_sec >= 0),
  watched_buckets   integer[] not null default '{}',   -- 실제로 재생된 5초 칸 번호
  watched_sec       integer not null default 0,        -- 트리거가 계산한다
  started_at        timestamptz not null default now(),
  completed_at      timestamptz,                       -- 트리거가 찍는다
  updated_at        timestamptz not null default now(),
  unique (video_id, student_id)
);

-- 알림용 이벤트. 웹훅은 INSERT 만 잡을 수 있어서 "완료로 바뀐 순간"을 INSERT 로 바꿔 준다
create table if not exists public.video_events (
  id         bigint generated always as identity primary key,
  type       text not null check (type in ('start', 'complete')),
  video_id   bigint not null references public.videos(id)   on delete cascade,
  student_id bigint not null references public.students(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- ── 2. 규칙: 칸 합치기 · 시청 시간 · 완료 판정 (저장 직전) ──────────
create or replace function public.video_progress_apply()
returns trigger
language plpgsql
set search_path to 'public'
as $$
begin
  if tg_op = 'UPDATE' then
    -- 누구의 어떤 영상인지, 언제 시작했고 언제 끝냈는지는 한 번 정해지면 바뀌지 않는다
    new.video_id     := old.video_id;
    new.student_id   := old.student_id;
    new.started_at   := old.started_at;
    new.completed_at := old.completed_at;
    -- 새로 보낸 칸을 기존 칸과 합친다 — 오늘 앞부분, 내일 뒷부분을 봐도 누적된다
    new.watched_buckets := array(
      select distinct b from unnest(old.watched_buckets || new.watched_buckets) as b
      where b >= 0 order by b);
    -- 길이를 0 으로 잘못 보내도 아는 길이를 지우지 않는다
    new.duration_sec := greatest(new.duration_sec, old.duration_sec);
  else
    new.completed_at := null;
    new.watched_buckets := array(
      select distinct b from unnest(new.watched_buckets) as b
      where b >= 0 order by b);
  end if;

  new.watched_sec := least(cardinality(new.watched_buckets) * 5, new.duration_sec);

  -- 길이를 모르면(0) 완료로 보지 않는다 — 0 의 90% 는 0 이라 바로 완료가 찍힌다
  if new.completed_at is null
     and new.duration_sec > 0
     and new.watched_sec >= 0.9 * new.duration_sec then
    new.completed_at := now();
  end if;

  new.updated_at := now();
  return new;
end
$$;

drop trigger if exists video_progress_apply on public.video_progress;
create trigger video_progress_apply
  before insert or update on public.video_progress
  for each row execute function public.video_progress_apply();

-- ── 3. 시작 · 완료 순간을 이벤트로 (저장 직후) ─────────────────────
create or replace function public.video_progress_events()
returns trigger
language plpgsql
security definer                 -- 학생에게는 video_events 쓰기 권한이 없다
set search_path to 'public'
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.video_events (type, video_id, student_id)
    values ('start', new.video_id, new.student_id);
  end if;

  if new.completed_at is not null
     and (tg_op = 'INSERT' or old.completed_at is null) then
    insert into public.video_events (type, video_id, student_id)
    values ('complete', new.video_id, new.student_id);
  end if;

  return null;
end
$$;

drop trigger if exists video_progress_events on public.video_progress;
create trigger video_progress_events
  after insert or update on public.video_progress
  for each row execute function public.video_progress_events();

-- ── 4. 저장은 이 함수로만 ─────────────────────────────────────
-- 학생 번호는 인자로 받지 않는다 — 로그인 정보로 DB가 찾는다.
-- 교사·관리자가 부르면 거절한다 → 교사가 영상을 봐도 기록이 생기지 않는다.
create or replace function public.save_video_progress(
  p_video_id     bigint,
  p_duration_sec integer,
  p_position_sec integer,
  p_buckets      integer[]
)
returns public.video_progress
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_student bigint := public.hw_my_student_id();
  v_row     public.video_progress;
begin
  if v_student is null then
    raise exception '학생 계정만 시청 기록을 남깁니다' using errcode = '42501';
  end if;

  -- 그 학생이 볼 수 있는 영상인가 (반이 비어 있으면 전체 공개)
  if not exists (
    select 1
    from public.videos v
    join public.students s on s.id = v_student
    where v.id = p_video_id
      and (v.class_id is null or v.class_id = s.class_id)
  ) then
    raise exception '볼 수 없는 영상입니다' using errcode = '42501';
  end if;

  insert into public.video_progress (video_id, student_id, duration_sec, last_position_sec, watched_buckets)
  values (
    p_video_id, v_student,
    greatest(coalesce(p_duration_sec, 0), 0),
    greatest(coalesce(p_position_sec, 0), 0),
    coalesce(p_buckets, '{}')
  )
  on conflict (video_id, student_id) do update
    set duration_sec      = excluded.duration_sec,
        last_position_sec = excluded.last_position_sec,
        watched_buckets   = excluded.watched_buckets
  returning * into v_row;

  return v_row;
end
$$;

revoke all on function public.save_video_progress(bigint, integer, integer, integer[]) from public, anon;
grant execute on function public.save_video_progress(bigint, integer, integer, integer[]) to authenticated;

-- ── 5. 권한 ────────────────────────────────────────────────
alter table public.video_progress enable row level security;
alter table public.video_events   enable row level security;

-- 표에 직접 쓰는 길은 막는다. 저장은 위 함수로만 한다.
revoke insert, update, delete on public.video_progress from anon, authenticated;
revoke insert, update, delete on public.video_events   from anon, authenticated;
grant select on public.video_progress to authenticated;
grant select on public.video_events   to authenticated;

-- 열린 정책(using (true))은 두지 않는다 — 정책은 논리합으로 합쳐진다 (2026-09-30)
drop policy if exists video_progress_select_own   on public.video_progress;
drop policy if exists video_progress_select_staff on public.video_progress;
drop policy if exists video_events_select_staff   on public.video_events;

create policy video_progress_select_own on public.video_progress
  for select to authenticated using (student_id = public.hw_my_student_id());
create policy video_progress_select_staff on public.video_progress
  for select to authenticated using (public.hw_is_staff());
create policy video_events_select_staff on public.video_events
  for select to authenticated using (public.hw_is_staff());
```

- [ ] **Step 2: 검증 SQL 작성**

`docs/video-progress-verify.sql` — 기존 `docs/homework-deadline-verify.sql` 과 같은 방식(임시 표에 결과를 쌓아 마지막에 보여준다, 넣은 것은 지운다):

```sql
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
```

- [ ] **Step 3: 데모 DB에 적용 (사용자가 직접 실행 — DB 비밀번호 입력이 필요하다)**

먼저 대상이 데모인지 확인:

```bash
grep -o 'https://[a-z]*\.supabase\.co' .env    # → https://zlvubufzbdhwvdtpomlz.supabase.co
```

사용자에게 프롬프트에 입력해 달라고 요청한다 (데모가 기본값):

```
! ~/Documents/developments/졸업전시회-2026/05_시연/seed/run_sql.sh "$PWD/docs/video-progress.sql"
! ~/Documents/developments/졸업전시회-2026/05_시연/seed/run_sql.sh "$PWD/docs/video-progress-verify.sql"
```

Expected (verify): ①~⑧ 이 전부 `✅`. 하나라도 `❌` 면 `docs/video-progress.sql` 을 고치고 다시 돌린다.

- [ ] **Step 4: Commit**

```bash
git add docs/video-progress.sql docs/video-progress-verify.sql
git commit -m "feat: 영상 시청 기록 표와 저장 함수 — 칸 합치기·90% 완료는 DB가 판정한다"
```

---

### Task 2: 순수 함수 — 칸 계산 · 시간 표시 · 상태 · 정렬

**Files:**
- Create: `src/utils/videoProgress.js`
- Test: `src/utils/videoProgress.test.js`

**Interfaces:**
- Produces (진행 기록 `row` 는 Task 4 의 `toProgress` 모양: `{ id, videoId, studentId, durationSec, lastPositionSec, watchedSec, startedAt, completedAt }`):
  - `BUCKET_SEC = 5`, `MAX_STEP_SEC = 3`, `RESUME_MIN_SEC = 10`
  - `bucketsForStep(prevSec: number, curSec: number): number[]`
  - `formatClock(sec: number): string` — `"0:05"`, `"12:30"`, `"1:02:03"`
  - `progressStatus(row | null | undefined): 'none' | 'watching' | 'done'`
  - `watchedPercent(row): number` — 0~100 정수
  - `shouldOfferResume(row): boolean`
  - `buildRoster(students: {id,name}[], rows: row[]): { student, row, status }[]` — none → watching → done, 같은 상태끼리 이름순
  - `summarizeRoster(roster): { done, watching, none, total }`
  - `cardProgressLabel(role, rows: row[], studentCount: number): string | null`

- [ ] **Step 1: 실패하는 테스트 작성**

`src/utils/videoProgress.test.js`:

```js
// src/utils/videoProgress.test.js
import { describe, it, expect } from 'vitest'
import {
  bucketsForStep, formatClock, progressStatus, watchedPercent, shouldOfferResume,
  buildRoster, summarizeRoster, cardProgressLabel,
} from './videoProgress'

describe('bucketsForStep — 1초 사이 위치 변화로 "봤다"를 판정', () => {
  it('자연스러운 재생이면 지나간 5초 칸을 센다', () => {
    expect(bucketsForStep(3, 4)).toEqual([0])
    expect(bucketsForStep(4.5, 5.5)).toEqual([0, 1])     // 칸 경계를 넘으면 두 칸
  })

  it('2배속(1초에 2초 진행)도 센다', () => {
    expect(bucketsForStep(10, 12)).toEqual([2])
  })

  it('되감기·건너뛰기는 세지 않는다', () => {
    expect(bucketsForStep(100, 40)).toEqual([])           // 되감기
    expect(bucketsForStep(10, 200)).toEqual([])           // 진행 막대를 끌어 건너뜀
    expect(bucketsForStep(10, 13.5)).toEqual([])          // 3초 초과
  })

  it('위치가 그대로면(버퍼링·정지) 세지 않는다', () => {
    expect(bucketsForStep(7, 7)).toEqual([])
  })
})

describe('formatClock', () => {
  it('분:초, 한 시간이 넘으면 시:분:초', () => {
    expect(formatClock(5)).toBe('0:05')
    expect(formatClock(750)).toBe('12:30')
    expect(formatClock(3723)).toBe('1:02:03')
  })
  it('잘못된 값은 0:00', () => {
    expect(formatClock(undefined)).toBe('0:00')
    expect(formatClock(-3)).toBe('0:00')
  })
})

const row = (o) => ({ id: 1, videoId: 1, studentId: 1, durationSec: 100, lastPositionSec: 0,
  watchedSec: 0, startedAt: '2026-10-07T01:00:00Z', completedAt: null, ...o })

describe('progressStatus · watchedPercent · shouldOfferResume', () => {
  it('기록이 없으면 안 봄, 완료 시각이 있으면 완료, 그 사이는 보는 중', () => {
    expect(progressStatus(undefined)).toBe('none')
    expect(progressStatus(row({}))).toBe('watching')
    expect(progressStatus(row({ completedAt: '2026-10-07T02:00:00Z' }))).toBe('done')
  })

  it('실제 시청 비율은 길이 대비, 길이를 모르면 0', () => {
    expect(watchedPercent(row({ watchedSec: 48 }))).toBe(48)
    expect(watchedPercent(row({ durationSec: 0, watchedSec: 5 }))).toBe(0)
    expect(watchedPercent(row({ watchedSec: 130 }))).toBe(100)
  })

  it('10초 이상 봤고 완료 전일 때만 이어보기를 권한다', () => {
    expect(shouldOfferResume(undefined)).toBe(false)
    expect(shouldOfferResume(row({ lastPositionSec: 9 }))).toBe(false)
    expect(shouldOfferResume(row({ lastPositionSec: 750 }))).toBe(true)
    expect(shouldOfferResume(row({ lastPositionSec: 750, completedAt: '2026-10-07T02:00:00Z' }))).toBe(false)
  })
})

describe('buildRoster · summarizeRoster — 교사 시청 현황', () => {
  const students = [
    { id: 1, name: '김하은' }, { id: 2, name: '나시우' }, { id: 3, name: '박은우' }, { id: 4, name: '강민준' },
  ]
  const rows = [
    row({ studentId: 1, completedAt: '2026-10-07T02:00:00Z', watchedSec: 95 }),
    row({ studentId: 2, watchedSec: 48, lastPositionSec: 750 }),
  ]

  it('챙길 학생이 위로: 안 봄 → 보는 중 → 완료, 같은 상태는 이름순', () => {
    const roster = buildRoster(students, rows)
    expect(roster.map((r) => [r.student.name, r.status])).toEqual([
      ['강민준', 'none'], ['박은우', 'none'], ['나시우', 'watching'], ['김하은', 'done'],
    ])
  })

  it('다른 영상·명단 밖 학생의 기록은 섞이지 않는다', () => {
    const roster = buildRoster([{ id: 1, name: '김하은' }], [row({ studentId: 99 })])
    expect(roster).toHaveLength(1)
    expect(roster[0].status).toBe('none')
  })

  it('요약 숫자', () => {
    expect(summarizeRoster(buildRoster(students, rows))).toEqual({ done: 1, watching: 1, none: 2, total: 4 })
  })
})

describe('cardProgressLabel — 목록 카드의 작은 표시', () => {
  it('학생: 완료 / 퍼센트 / 안 봤으면 없음', () => {
    expect(cardProgressLabel('student', [row({ completedAt: '2026-10-07T02:00:00Z' })], 0)).toBe('✓ 완료')
    expect(cardProgressLabel('student', [row({ watchedSec: 73 })], 0)).toBe('73%')
    expect(cardProgressLabel('student', [], 0)).toBeNull()
  })
  it('교사·관리자: 완료 n/반 인원, 반 인원이 0이면 없음', () => {
    const rows = [row({ studentId: 1, completedAt: 'x' }), row({ studentId: 2 })]
    expect(cardProgressLabel('teacher', rows, 7)).toBe('완료 1/7')
    expect(cardProgressLabel('admin', [], 7)).toBe('완료 0/7')
    expect(cardProgressLabel('teacher', rows, 0)).toBeNull()
  })
})
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/utils/videoProgress.test.js`
Expected: FAIL — `Failed to resolve import "./videoProgress"`

- [ ] **Step 3: 구현**

`src/utils/videoProgress.js`:

```js
// src/utils/videoProgress.js
// 영상 시청 기록을 계산하고 보여주는 순수 함수들.
// 저장 규칙(칸 합치기·90% 완료)은 DB가 정한다. 여기는 "화면에서 어떻게 셀지·보여줄지"만 다룬다.

export const BUCKET_SEC = 5        // 영상을 5초 칸으로 나눠 "봤다/안 봤다"를 센다
export const MAX_STEP_SEC = 3      // 1초 사이에 이보다 많이 움직이면 건너뛴 것으로 본다 (2배속 + 타이머 지연 감안)
export const RESUME_MIN_SEC = 10   // 이만큼은 봐야 이어보기를 권한다

// 직전 위치에서 지금 위치까지 자연스럽게 재생됐으면 지나간 칸 번호들을 준다.
// 되감기(뒤로)·건너뛰기(3초 초과)·정지(그대로)는 빈 배열 — 실제로 본 것이 아니다.
export function bucketsForStep(prevSec, curSec) {
  const delta = curSec - prevSec
  if (!(delta > 0) || delta > MAX_STEP_SEC) return []
  const from = Math.floor(prevSec / BUCKET_SEC)
  const to = Math.floor(curSec / BUCKET_SEC)
  const out = []
  for (let b = from; b <= to; b += 1) out.push(b)
  return out
}

// 750 → "12:30", 3723 → "1:02:03"
export function formatClock(sec) {
  const total = Number.isFinite(sec) && sec > 0 ? Math.floor(sec) : 0
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const ss = String(s).padStart(2, '0')
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`
}

export function progressStatus(row) {
  if (!row) return 'none'
  return row.completedAt ? 'done' : 'watching'
}

// 실제로 본 시간의 비율. 길이를 모르면 0 — 나누기 0 으로 NaN 이 화면에 뜨지 않게
export function watchedPercent(row) {
  if (!row?.durationSec) return 0
  return Math.min(100, Math.round((row.watchedSec / row.durationSec) * 100))
}

export function shouldOfferResume(row) {
  return Boolean(row && !row.completedAt && row.lastPositionSec >= RESUME_MIN_SEC)
}

const ORDER = { none: 0, watching: 1, done: 2 }

// 교사 시청 현황: 반 학생 전원 + 각자의 기록. 챙길 학생(안 봄)이 위로 온다
export function buildRoster(students, rows) {
  const byStudent = new Map(rows.map((r) => [r.studentId, r]))
  return students
    .map((student) => {
      const row = byStudent.get(student.id)
      return { student, row, status: progressStatus(row) }
    })
    .sort((a, b) => ORDER[a.status] - ORDER[b.status] || a.student.name.localeCompare(b.student.name, 'ko'))
}

export function summarizeRoster(roster) {
  const count = (s) => roster.filter((r) => r.status === s).length
  return { done: count('done'), watching: count('watching'), none: count('none'), total: roster.length }
}

// 목록 카드에 붙는 작은 표시.
// 학생은 자기 기록(0~1줄), 교사·관리자는 그 영상의 기록 전부를 받는다
export function cardProgressLabel(role, rows, studentCount) {
  if (role === 'student') {
    const row = rows[0]
    if (!row) return null
    return row.completedAt ? '✓ 완료' : `${watchedPercent(row)}%`
  }
  if (!studentCount) return null
  return `완료 ${rows.filter((r) => r.completedAt).length}/${studentCount}`
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run src/utils/videoProgress.test.js`
Expected: PASS (전부)

- [ ] **Step 5: Commit**

```bash
git add src/utils/videoProgress.js src/utils/videoProgress.test.js
git commit -m "feat: 영상 시청 칸 계산과 시청 현황 정렬·요약"
```

---

### Task 3: 시청 추적기 — tick 을 받아 칸을 모으고 저장

**Files:**
- Create: `src/utils/watchTracker.js`
- Test: `src/utils/watchTracker.test.js`

**Interfaces:**
- Consumes: `bucketsForStep` (Task 2)
- Produces:
  - `createWatchTracker({ save, flushEveryTicks = 10 })` → `{ tick(curSec, playing, durationSec), notePosition(curSec), flush(): Promise<void>, pendingCount(): number }`
  - `save({ durationSec, positionSec, buckets })` 는 Promise 를 돌려주는 함수 (Task 4 의 `saveVideoProgress` 를 감싸 넘긴다)

- [ ] **Step 1: 실패하는 테스트 작성**

`src/utils/watchTracker.test.js`:

```js
// src/utils/watchTracker.test.js
import { describe, it, expect, vi } from 'vitest'
import { createWatchTracker } from './watchTracker'

// 1초마다 위치를 넣어 주는 흉내
function play(tracker, from, to, duration = 100) {
  for (let t = from; t <= to; t += 1) tracker.tick(t, true, duration)
}

describe('createWatchTracker', () => {
  it('10번 tick 마다 모은 칸을 저장한다', async () => {
    const save = vi.fn().mockResolvedValue({})
    const tr = createWatchTracker({ save, flushEveryTicks: 10 })
    play(tr, 0, 10)                      // tick 11번 → 10번째에서 저장
    expect(save).toHaveBeenCalledTimes(1)
    expect(save.mock.calls[0][0]).toEqual({ durationSec: 100, positionSec: 9, buckets: [0, 1] })
  })

  it('같은 칸은 한 번만 보낸다', async () => {
    const save = vi.fn().mockResolvedValue({})
    const tr = createWatchTracker({ save, flushEveryTicks: 100 })
    play(tr, 0, 4)
    play(tr, 0, 4)                       // 되감아서 같은 구간을 다시 봄 (0 으로 돌아가는 tick 은 건너뜀으로 버려진다)
    await tr.flush()
    expect(save.mock.calls[0][0].buckets).toEqual([0])
  })

  it('정지 중 tick 은 칸을 세지 않고, 다시 재생하면 그 지점부터 센다', async () => {
    const save = vi.fn().mockResolvedValue({})
    const tr = createWatchTracker({ save, flushEveryTicks: 100 })
    play(tr, 0, 2)
    tr.tick(2, false, 100)
    tr.tick(60, true, 100)               // 정지 후 다른 곳에서 재생 시작 — 건너뛴 구간은 세지 않는다
    tr.tick(61, true, 100)
    await tr.flush()
    expect(save.mock.calls[0][0].buckets).toEqual([0, 12])
    expect(save.mock.calls[0][0].positionSec).toBe(61)
  })

  it('저장이 실패하면 칸을 버리지 않고 다음 저장에 다시 보낸다', async () => {
    const save = vi.fn().mockRejectedValueOnce(new Error('network')).mockResolvedValue({})
    const tr = createWatchTracker({ save, flushEveryTicks: 100 })
    play(tr, 0, 3)
    await tr.flush()
    expect(tr.pendingCount()).toBe(1)
    await tr.flush()
    expect(save.mock.calls[1][0].buckets).toEqual([0])
    expect(tr.pendingCount()).toBe(0)
  })

  it('본 칸도 없고 길이도 모르면 저장하지 않는다', async () => {
    const save = vi.fn().mockResolvedValue({})
    const tr = createWatchTracker({ save })
    await tr.flush()
    expect(save).not.toHaveBeenCalled()
  })

  it('일시정지 위치만 바뀌어도 위치는 저장된다 (이어보기용)', async () => {
    const save = vi.fn().mockResolvedValue({})
    const tr = createWatchTracker({ save, flushEveryTicks: 100 })
    play(tr, 0, 2)
    await tr.flush()
    tr.notePosition(300)
    await tr.flush()
    expect(save.mock.calls[1][0]).toEqual({ durationSec: 100, positionSec: 300, buckets: [] })
  })
})
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/utils/watchTracker.test.js`
Expected: FAIL — `Failed to resolve import "./watchTracker"`

- [ ] **Step 3: 구현**

`src/utils/watchTracker.js`:

```js
// src/utils/watchTracker.js
// 학생 플레이어가 1초마다 알려주는 위치를 받아 "실제로 본 5초 칸"을 모은다.
// 화면(React)과 떼어 두어서 타이머·플레이어 없이 테스트한다.
import { bucketsForStep } from './videoProgress'

export function createWatchTracker({ save, flushEveryTicks = 10 }) {
  let prev = null          // 직전 tick 위치. 정지하면 비운다 — 다시 재생할 때 건너뛴 것으로 세지 않게
  let pending = new Set()  // 아직 저장 못 한 칸
  let position = 0
  let duration = 0
  let ticks = 0
  let dirty = false        // 위치만 바뀌어도 저장할 거리가 있다

  function flush() {
    ticks = 0
    if (pending.size === 0 && !dirty) return Promise.resolve()
    if (!duration && pending.size === 0) return Promise.resolve()
    const buckets = [...pending].sort((a, b) => a - b)
    pending = new Set()
    dirty = false
    // save 는 바로(동기로) 부른다 — 화면을 나가는 순간에도 요청이 출발하게
    let request
    try {
      request = Promise.resolve(save({ durationSec: duration, positionSec: position, buckets }))
    } catch (e) {
      request = Promise.reject(e)
    }
    return request
      .then(() => undefined)
      .catch(() => {
        // 실패한 칸은 다음 저장 때 다시 보낸다. DB가 칸을 합치므로 두 번 가도 안전하다
        buckets.forEach((b) => pending.add(b))
        dirty = true
      })
  }

  return {
    tick(curSec, playing, durationSec) {
      if (durationSec > 0) duration = Math.round(durationSec)
      if (!playing) { prev = null; return }
      if (prev !== null) bucketsForStep(prev, curSec).forEach((b) => pending.add(b))
      prev = curSec
      position = Math.floor(curSec)
      dirty = true
      ticks += 1
      if (ticks >= flushEveryTicks) flush()
    },
    notePosition(curSec) {
      position = Math.floor(curSec)
      dirty = true
    },
    flush,
    pendingCount: () => pending.size,
  }
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run src/utils/watchTracker.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/utils/watchTracker.js src/utils/watchTracker.test.js
git commit -m "feat: 시청 추적기 — 자연 재생 칸만 모아 10초마다 저장, 실패하면 다시 보낸다"
```

---

### Task 4: Supabase 호출 모듈

**Files:**
- Create: `src/utils/videoProgressApi.js`
- Test: `src/utils/videoProgressApi.test.js`

**Interfaces:**
- Consumes: `supabase` (`src/lib/supabase.js`), `fetchAllRows` (`src/utils/fetchAll.js`), Task 1 RPC
- Produces:
  - `toProgress(dbRow) → { id, videoId, studentId, durationSec, lastPositionSec, watchedSec, startedAt, completedAt }`
  - `saveVideoProgress(videoId, { durationSec, positionSec, buckets }): Promise<progressRow>`
  - `fetchProgressForVideos(videoIds: number[]): Promise<progressRow[]>` — 학생은 RLS 로 자기 줄만 받는다

- [ ] **Step 1: 실패하는 테스트 작성**

`src/utils/videoProgressApi.test.js`:

```js
// src/utils/videoProgressApi.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest'

const rpc = vi.fn()
const range = vi.fn()
vi.mock('../lib/supabase', () => ({
  supabase: {
    rpc: (...a) => rpc(...a),
    from: () => ({ select: () => ({ in: () => ({ order: () => ({ range: (...a) => range(...a) }) }) }) }),
  },
}))

import { toProgress, saveVideoProgress, fetchProgressForVideos } from './videoProgressApi'

const DB = { id: 7, video_id: 3, student_id: 11, duration_sec: 100, last_position_sec: 44,
  watched_buckets: [0, 1], watched_sec: 10, started_at: 's', completed_at: null, updated_at: 'u' }

beforeEach(() => { rpc.mockReset(); range.mockReset() })

describe('videoProgressApi', () => {
  it('DB 행을 화면 모양으로 바꾼다 (칸 목록은 화면에 필요 없다)', () => {
    expect(toProgress(DB)).toEqual({ id: 7, videoId: 3, studentId: 11, durationSec: 100,
      lastPositionSec: 44, watchedSec: 10, startedAt: 's', completedAt: null })
  })

  it('저장은 RPC 로만 — 학생 번호를 보내지 않는다', async () => {
    rpc.mockResolvedValue({ data: DB, error: null })
    await saveVideoProgress(3, { durationSec: 100, positionSec: 44, buckets: [0, 1] })
    expect(rpc).toHaveBeenCalledWith('save_video_progress',
      { p_video_id: 3, p_duration_sec: 100, p_position_sec: 44, p_buckets: [0, 1] })
  })

  it('저장 실패는 던진다 — 추적기가 칸을 다시 보내게', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'denied' } })
    await expect(saveVideoProgress(3, { durationSec: 1, positionSec: 0, buckets: [] })).rejects.toBeTruthy()
  })

  it('영상이 없으면 묻지 않는다', async () => {
    expect(await fetchProgressForVideos([])).toEqual([])
    expect(range).not.toHaveBeenCalled()
  })

  it('여러 영상의 기록을 받아 화면 모양으로', async () => {
    range.mockResolvedValue({ data: [DB], error: null })
    expect(await fetchProgressForVideos([3])).toEqual([toProgress(DB)])
  })
})
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/utils/videoProgressApi.test.js`
Expected: FAIL — import 를 못 찾는다

- [ ] **Step 3: 구현**

`src/utils/videoProgressApi.js`:

```js
// src/utils/videoProgressApi.js
// 영상 시청 기록을 DB와 주고받는다.
// 전역 데이터(DataContext)에 넣지 않고 영상 화면이 필요할 때만 부른다 —
// 앱을 열 때마다 모든 표를 다 읽는 문제를 더 키우지 않기 위해서다.
import { supabase } from '../lib/supabase'
import { fetchAllRows } from './fetchAll'

export function toProgress(r) {
  return {
    id:              r.id,
    videoId:         r.video_id,
    studentId:       r.student_id,
    durationSec:     r.duration_sec ?? 0,
    lastPositionSec: r.last_position_sec ?? 0,
    watchedSec:      r.watched_sec ?? 0,
    startedAt:       r.started_at ?? null,
    completedAt:     r.completed_at ?? null,
  }
}

// 학생 번호는 보내지 않는다 — DB가 로그인 정보로 찾는다 (남의 이름으로 저장할 수 없게)
export async function saveVideoProgress(videoId, { durationSec, positionSec, buckets }) {
  const { data, error } = await supabase.rpc('save_video_progress', {
    p_video_id: videoId,
    p_duration_sec: durationSec,
    p_position_sec: positionSec,
    p_buckets: buckets,
  })
  if (error) throw error
  return toProgress(data)
}

// 학생은 행 수준 보안 때문에 자기 기록만, 교사·관리자는 전부 받는다.
// 52명 × 영상 20개면 1,000행을 넘는다 — 나눠 받는다 (조용히 잘리던 사고, 2026-09-09)
export async function fetchProgressForVideos(videoIds) {
  if (!videoIds.length) return []
  const { data, error } = await fetchAllRows(() =>
    supabase.from('video_progress').select('*').in('video_id', videoIds).order('id'))
  if (error) throw error
  return (data ?? []).map(toProgress)
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run src/utils/videoProgressApi.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/utils/videoProgressApi.js src/utils/videoProgressApi.test.js
git commit -m "feat: 영상 시청 기록 저장(RPC)·읽기 모듈"
```

---

### Task 5: 화면 조각 — 이어보기 · 진행 줄 · 교사 시청 현황

**Files:**
- Create: `src/components/video/ResumeBanner.jsx`, `src/components/video/WatchProgressLine.jsx`, `src/components/video/WatchRoster.jsx`
- Test: `src/components/video/WatchParts.test.jsx`

**Interfaces:**
- Consumes: Task 2 (`formatClock`, `watchedPercent`, `shouldOfferResume`, `buildRoster`, `summarizeRoster`), `formatDate` (`src/utils/datetime.js`), `Badge`
- Produces:
  - `<ResumeBanner row onResume />` — `shouldOfferResume(row)` 가 거짓이면 아무것도 그리지 않는다
  - `<WatchProgressLine row />` — 기록이 없으면 아무것도 그리지 않는다
  - `<WatchRoster students rows />`

- [ ] **Step 1: 실패하는 테스트 작성**

`src/components/video/WatchParts.test.jsx`:

```jsx
// src/components/video/WatchParts.test.jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import ResumeBanner from './ResumeBanner'
import WatchProgressLine from './WatchProgressLine'
import WatchRoster from './WatchRoster'

const row = (o) => ({ id: 1, videoId: 1, studentId: 1, durationSec: 1500, lastPositionSec: 750,
  watchedSec: 1100, startedAt: '2026-10-07T01:00:00Z', completedAt: null, ...o })

describe('ResumeBanner', () => {
  it('보던 위치를 보여주고 누르면 그 위치를 넘긴다', () => {
    const onResume = vi.fn()
    render(<ResumeBanner row={row({})} onResume={onResume} />)
    expect(screen.getByText(/12:30/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '이어보기' }))
    expect(onResume).toHaveBeenCalledWith(750)
  })
  it('완료했거나 거의 안 봤으면 띄우지 않는다', () => {
    const { container } = render(<ResumeBanner row={row({ completedAt: 'x' })} onResume={() => {}} />)
    expect(container).toBeEmptyDOMElement()
  })
})

describe('WatchProgressLine', () => {
  it('실제 시청 시간 / 길이 (비율)', () => {
    render(<WatchProgressLine row={row({})} />)
    expect(screen.getByText('실제 시청 18:20 / 25:00 (73%)')).toBeInTheDocument()
  })
  it('완료면 완료 표시', () => {
    render(<WatchProgressLine row={row({ completedAt: '2026-10-07T03:00:00Z' })} />)
    expect(screen.getByText('✓ 시청 완료')).toBeInTheDocument()
  })
  it('기록이 없으면 아무것도 없다', () => {
    const { container } = render(<WatchProgressLine row={undefined} />)
    expect(container).toBeEmptyDOMElement()
  })
})

describe('WatchRoster', () => {
  const students = [{ id: 1, name: '김하은' }, { id: 2, name: '나시우' }, { id: 3, name: '박은우' }]
  const rows = [
    row({ studentId: 1, completedAt: '2026-10-07T03:00:00Z' }),
    row({ studentId: 2, watchedSec: 720, lastPositionSec: 750 }),
  ]

  it('요약 한 줄', () => {
    render(<WatchRoster students={students} rows={rows} />)
    expect(screen.getByText('완료 1 · 보는 중 1 · 안 봄 1 (3명)')).toBeInTheDocument()
  })

  it('안 봄 → 보는 중 → 완료 순, 상태 문구', () => {
    render(<WatchRoster students={students} rows={rows} />)
    const items = screen.getAllByRole('listitem')
    expect(within(items[0]).getByText('박은우')).toBeInTheDocument()
    expect(within(items[0]).getByText('안 봄')).toBeInTheDocument()
    expect(within(items[1]).getByText('12:30까지 · 실제 시청 48%')).toBeInTheDocument()
    expect(within(items[2]).getByText('✓ 완료 2026-10-07')).toBeInTheDocument()
  })

  it('반에 학생이 없으면 안내', () => {
    render(<WatchRoster students={[]} rows={[]} />)
    expect(screen.getByText('이 영상을 볼 학생이 없어요.')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/components/video/WatchParts.test.jsx`
Expected: FAIL — import 를 못 찾는다

- [ ] **Step 3: 구현**

`src/components/video/ResumeBanner.jsx`:

```jsx
// src/components/video/ResumeBanner.jsx
// 다시 들어온 학생에게 보던 곳부터 보게 권한다. 누르지 않으면 처음부터 본다.
import { formatClock, shouldOfferResume } from '../../utils/videoProgress'

export default function ResumeBanner({ row, onResume }) {
  if (!shouldOfferResume(row)) return null
  return (
    <div className="flex items-center justify-between gap-3 mb-2 px-3 py-2 rounded border border-line bg-surface-alt text-sm">
      <span className="text-ink-soft">
        지난번 <b className="text-ink">{formatClock(row.lastPositionSec)}</b>까지 봤어요
      </span>
      <button
        onClick={() => onResume(row.lastPositionSec)}
        className="shrink-0 whitespace-nowrap px-3 py-1 rounded bg-ink text-white text-xs font-bold"
      >
        이어보기
      </button>
    </div>
  )
}
```

`src/components/video/WatchProgressLine.jsx`:

```jsx
// src/components/video/WatchProgressLine.jsx
// 학생이 "실제로" 얼마나 봤는지. 건너뛴 구간은 들어가지 않는다.
import { formatClock, watchedPercent } from '../../utils/videoProgress'

export default function WatchProgressLine({ row }) {
  if (!row) return null
  if (row.completedAt) {
    return <p className="mt-1 text-sm font-bold text-navy">✓ 시청 완료</p>
  }
  return (
    <p className="mt-1 text-sm text-ink-mute">
      {`실제 시청 ${formatClock(row.watchedSec)} / ${formatClock(row.durationSec)} (${watchedPercent(row)}%)`}
    </p>
  )
}
```

`src/components/video/WatchRoster.jsx`:

```jsx
// src/components/video/WatchRoster.jsx
// 교사·관리자 화면의 "시청 현황". 챙길 학생(안 봄)이 위로 온다.
import { buildRoster, summarizeRoster, formatClock, watchedPercent } from '../../utils/videoProgress'
import { formatDate } from '../../utils/datetime'
import Badge from '../ui/Badge'

function statusText({ status, row }) {
  if (status === 'none') return '안 봄'
  if (status === 'done') return `✓ 완료 ${formatDate(row.completedAt)}`
  return `${formatClock(row.lastPositionSec)}까지 · 실제 시청 ${watchedPercent(row)}%`
}

const TONE = { none: 'danger', watching: 'warn', done: 'navy' }

export default function WatchRoster({ students, rows }) {
  if (students.length === 0) {
    return <p className="text-sm text-ink-faint py-6 text-center">이 영상을 볼 학생이 없어요.</p>
  }
  const roster = buildRoster(students, rows)
  const s = summarizeRoster(roster)
  return (
    <div>
      <p className="text-sm font-bold text-ink mb-3">
        {`완료 ${s.done} · 보는 중 ${s.watching} · 안 봄 ${s.none} (${s.total}명)`}
      </p>
      <ul className="border border-line rounded divide-y divide-line">
        {roster.map((r) => (
          <li key={r.student.id} className="flex items-center justify-between gap-3 px-3 py-2">
            <span className="text-sm text-ink whitespace-nowrap">{r.student.name}</span>
            <Badge tone={TONE[r.status]}>{statusText(r)}</Badge>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run src/components/video/WatchParts.test.jsx`
Expected: PASS. 만약 `formatDate('2026-10-07T03:00:00Z')` 가 다른 날짜를 주면(KST 변환) 테스트 기대값이 아니라 **입력 시각**을 KST 같은 날이 되도록 그대로 둔다 — 03:00Z = 12:00 KST 라 같은 날이다.

- [ ] **Step 5: Commit**

```bash
git add src/components/video/ResumeBanner.jsx src/components/video/WatchProgressLine.jsx src/components/video/WatchRoster.jsx src/components/video/WatchParts.test.jsx
git commit -m "feat: 이어보기·시청 진행 줄·교사 시청 현황 화면 조각"
```

---

### Task 6: 추적하는 플레이어 (YouTube IFrame API)

**Files:**
- Create: `src/hooks/useYouTubePlayer.js`
- Create: `src/components/video/TrackedPlayer.jsx`
- Test: `src/components/video/TrackedPlayer.test.jsx`

**Interfaces:**
- Consumes: `createWatchTracker` (Task 3), `saveVideoProgress` (Task 4)
- Produces:
  - `useYouTubePlayer(youtubeId, { onStateChange }) → { containerRef, playerRef }`
  - `<TrackedPlayer youtubeId dbVideoId title trackAs seekTo onSaved />`
    - `trackAs`: 학생이면 `'student'`, 아니면 `null` → 추적하지 않는다
    - `seekTo`: 숫자가 바뀌면 그 위치로 이동해 재생 (이어보기)
    - `onSaved(row)`: 저장이 끝난 최신 기록

- [ ] **Step 1: 실패하는 테스트 작성**

`src/components/video/TrackedPlayer.test.jsx`:

```jsx
// src/components/video/TrackedPlayer.test.jsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, act } from '@testing-library/react'

const save = vi.fn()
vi.mock('../../utils/videoProgressApi', () => ({ saveVideoProgress: (...a) => save(...a) }))

import TrackedPlayer from './TrackedPlayer'

// 가짜 YouTube API — 진짜 스크립트를 불러오지 않는다
let fake
function installFakeYT() {
  fake = { time: 0, state: -1, events: null, seekTo: vi.fn(), playVideo: vi.fn() }
  window.YT = {
    PlayerState: { ENDED: 0, PLAYING: 1, PAUSED: 2 },
    Player: function Player(_el, opts) {
      fake.events = opts.events
      this.getCurrentTime = () => fake.time
      this.getDuration = () => 100
      this.getPlayerState = () => fake.state
      this.seekTo = fake.seekTo
      this.playVideo = fake.playVideo
      this.destroy = () => {}
      setTimeout(() => opts.events.onReady?.({ target: this }), 0)
    },
  }
}

beforeEach(() => { vi.useFakeTimers(); save.mockReset().mockResolvedValue({ id: 1 }); installFakeYT() })
afterEach(() => { vi.useRealTimers(); delete window.YT })

function playSeconds(n) {
  for (let i = 0; i < n; i += 1) { fake.time += 1; vi.advanceTimersByTime(1000) }
}

describe('TrackedPlayer', () => {
  it('학생이면 재생 10초마다 저장한다', async () => {
    render(<TrackedPlayer youtubeId="abc" dbVideoId={3} title="t" trackAs="student" onSaved={() => {}} />)
    await act(async () => { vi.advanceTimersByTime(1) })
    fake.state = 1
    await act(async () => { playSeconds(10) })
    expect(save).toHaveBeenCalledTimes(1)
    expect(save.mock.calls[0][0]).toBe(3)
  })

  it('화면이 숨겨지면 바로 저장한다 (10초 전에 나가도 남는다)', async () => {
    render(<TrackedPlayer youtubeId="abc" dbVideoId={3} title="t" trackAs="student" onSaved={() => {}} />)
    await act(async () => { vi.advanceTimersByTime(1) })
    fake.state = 1
    await act(async () => { playSeconds(3) })
    expect(save).not.toHaveBeenCalled()
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })
    await act(async () => { document.dispatchEvent(new Event('visibilitychange')) })
    expect(save).toHaveBeenCalledTimes(1)
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
  })

  it('학생이 아니면 저장하지 않는다', async () => {
    render(<TrackedPlayer youtubeId="abc" dbVideoId={3} title="t" trackAs={null} onSaved={() => {}} />)
    await act(async () => { vi.advanceTimersByTime(1) })
    fake.state = 1
    await act(async () => { playSeconds(30) })
    fake.events.onStateChange({ data: 2 })
    expect(save).not.toHaveBeenCalled()
  })

  it('이어보기 위치가 오면 그 위치로 이동해 재생한다', async () => {
    const { rerender } = render(<TrackedPlayer youtubeId="abc" dbVideoId={3} title="t" trackAs="student" seekTo={null} onSaved={() => {}} />)
    await act(async () => { vi.advanceTimersByTime(1) })
    rerender(<TrackedPlayer youtubeId="abc" dbVideoId={3} title="t" trackAs="student" seekTo={750} onSaved={() => {}} />)
    expect(fake.seekTo).toHaveBeenCalledWith(750, true)
    expect(fake.playVideo).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/components/video/TrackedPlayer.test.jsx`
Expected: FAIL — import 를 못 찾는다

- [ ] **Step 3: 플레이어 훅 구현**

`src/hooks/useYouTubePlayer.js`:

```js
// src/hooks/useYouTubePlayer.js
// YouTube 공식 플레이어 API 로 영상을 띄운다.
// 그냥 <iframe> 으로는 지금 몇 초를 보는지, 멈췄는지 알 수 없다 — 시청 기록에 그게 필요하다.
import { useEffect, useRef } from 'react'

let apiPromise = null

// 스크립트는 앱 전체에서 한 번만 불러온다
function loadApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT)
  if (apiPromise) return apiPromise
  apiPromise = new Promise((resolve) => {
    const prev = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => { prev?.(); resolve(window.YT) }
    const s = document.createElement('script')
    s.src = 'https://www.youtube.com/iframe_api'
    document.head.appendChild(s)
  })
  return apiPromise
}

export function useYouTubePlayer(youtubeId, { onStateChange } = {}) {
  const containerRef = useRef(null)
  const playerRef = useRef(null)
  const stateRef = useRef(onStateChange)
  stateRef.current = onStateChange

  useEffect(() => {
    let alive = true
    loadApi().then((YT) => {
      if (!alive || !containerRef.current) return
      // YouTube 는 넘겨받은 칸을 iframe 으로 통째로 바꿔 끼운다.
      // React 가 관리하는 칸을 넘기면 화면을 나갈 때 React 가 사라진 칸을 지우려다 오류가 난다 —
      // 그래서 안쪽에 칸을 하나 직접 만들어 그걸 넘긴다
      const el = document.createElement('div')
      containerRef.current.appendChild(el)
      playerRef.current = new YT.Player(el, {
        videoId: youtubeId,
        width: '100%',
        height: '100%',
        playerVars: { rel: 0, playsinline: 1 },   // 폰에서 전체화면으로 튀지 않고 화면 안에서 재생
        events: { onStateChange: (e) => stateRef.current?.(e.data) },
      })
    })
    return () => {
      alive = false
      playerRef.current?.destroy?.()
      playerRef.current = null
      if (containerRef.current) containerRef.current.innerHTML = ''
    }
  }, [youtubeId])

  return { containerRef, playerRef }
}
```

- [ ] **Step 4: 추적 플레이어 구현**

`src/components/video/TrackedPlayer.jsx`:

```jsx
// src/components/video/TrackedPlayer.jsx
// 영상 플레이어. 학생이 볼 때만 시청 기록을 남긴다.
//   - 1초마다 위치를 확인해 자연스럽게 재생된 칸만 모은다
//   - 10초마다, 그리고 일시정지 · 끝 · 다른 앱으로 전환 · 화면을 나갈 때 저장한다
import { useEffect, useMemo, useRef } from 'react'
import { useYouTubePlayer } from '../../hooks/useYouTubePlayer'
import { createWatchTracker } from '../../utils/watchTracker'
import { saveVideoProgress } from '../../utils/videoProgressApi'

const PLAYING = 1, PAUSED = 2, ENDED = 0

export default function TrackedPlayer({ youtubeId, dbVideoId, title, trackAs, seekTo, onSaved }) {
  const tracking = trackAs === 'student'
  const onSavedRef = useRef(onSaved)
  onSavedRef.current = onSaved

  const tracker = useMemo(() => (tracking
    ? createWatchTracker({
        save: (p) => saveVideoProgress(dbVideoId, p).then((row) => { onSavedRef.current?.(row); return row }),
      })
    : null), [tracking, dbVideoId])

  const { containerRef, playerRef } = useYouTubePlayer(youtubeId, {
    onStateChange: (state) => {
      if (!tracker) return
      if (state === PAUSED || state === ENDED) {
        const p = playerRef.current
        if (p) tracker.notePosition(p.getCurrentTime())
        tracker.flush()
      }
    },
  })

  // 1초 tick
  useEffect(() => {
    if (!tracker) return undefined
    const id = setInterval(() => {
      const p = playerRef.current
      if (!p?.getCurrentTime) return
      tracker.tick(p.getCurrentTime(), p.getPlayerState() === PLAYING, p.getDuration())
    }, 1000)
    return () => clearInterval(id)
  }, [tracker, playerRef])

  // 다른 앱으로 전환 · 화면을 나갈 때 바로 저장 — 10초 전에 나가도 본 칸이 남게
  useEffect(() => {
    if (!tracker) return undefined
    const onHide = () => { if (document.visibilityState === 'hidden') tracker.flush() }
    document.addEventListener('visibilitychange', onHide)
    return () => {
      document.removeEventListener('visibilitychange', onHide)
      tracker.flush()
    }
  }, [tracker])

  // 이어보기
  useEffect(() => {
    if (seekTo == null) return
    const p = playerRef.current
    if (!p?.seekTo) return
    p.seekTo(seekTo, true)
    p.playVideo()
  }, [seekTo, playerRef])

  return (
    <div className="aspect-video w-full bg-black rounded overflow-hidden" aria-label={title}>
      <div ref={containerRef} className="w-full h-full [&>iframe]:w-full [&>iframe]:h-full" />
    </div>
  )
}
```

- [ ] **Step 5: 통과 확인**

Run: `npx vitest run src/components/video/TrackedPlayer.test.jsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useYouTubePlayer.js src/components/video/TrackedPlayer.jsx src/components/video/TrackedPlayer.test.jsx
git commit -m "feat: YouTube 플레이어 API 로 학생 시청을 추적한다 — 숨김·일시정지에도 저장"
```

---

### Task 7: 영상 화면 연결 — 학생 이어보기·진행, 교사 시청 현황 탭, 목록 카드

**Files:**
- Modify: `src/components/VideoPlayer.jsx` (전체 — iframe 자리와 오른쪽 칸)
- Modify: `src/components/VideoCard.jsx` (`progressLabel` prop)
- Modify: `src/pages/Videos.jsx` (진행 기록 상태)
- Test: `src/components/VideoPlayer.test.jsx` (새), `src/components/VideoCard.test.jsx` (추가)

**Interfaces:**
- Consumes: Task 4 `fetchProgressForVideos`, Task 5 조각들, Task 6 `TrackedPlayer`, Task 2 `cardProgressLabel`
- Produces:
  - `VideoPlayer` 새 props: `progressRows: row[]` (학생은 자기 줄 0~1, 교사는 그 영상 전부), `rosterStudents: {id,name}[]`, `onProgressSaved(row)`
  - `VideoCard` 새 prop: `progressLabel?: string | null`

- [ ] **Step 1: 실패하는 테스트 작성**

`src/components/VideoPlayer.test.jsx`:

```jsx
// src/components/VideoPlayer.test.jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

vi.mock('./video/TrackedPlayer', () => ({
  default: (p) => <div data-testid="player" data-track={String(p.trackAs)} data-seek={String(p.seekTo)} />,
}))
vi.mock('./CommentSection', () => ({ default: () => <div>댓글 칸</div> }))

import VideoPlayer from './VideoPlayer'

const video = { id: 3, videoId: 'abc', title: '현대시 1강', classId: 1 }
const base = { video, comments: [], students: [], onBack: () => {}, onAddComment: () => {}, onAddReply: () => {} }
const row = { id: 1, videoId: 3, studentId: 11, durationSec: 1500, lastPositionSec: 750, watchedSec: 1100, startedAt: 's', completedAt: null }

describe('VideoPlayer', () => {
  it('학생: 추적하는 플레이어 + 이어보기 → 누르면 그 위치로', () => {
    render(<VideoPlayer {...base} role="student" currentUser={{ id: 'u', studentId: 11 }}
      progressRows={[row]} rosterStudents={[]} onProgressSaved={() => {}} />)
    expect(screen.getByTestId('player').dataset.track).toBe('student')
    fireEvent.click(screen.getByRole('button', { name: '이어보기' }))
    expect(screen.getByTestId('player').dataset.seek).toBe('750')
    expect(screen.getByText('실제 시청 18:20 / 25:00 (73%)')).toBeInTheDocument()
    expect(screen.queryByRole('tab')).toBeNull()
  })

  it('교사: 추적하지 않고 [댓글 | 시청 현황] 탭', () => {
    render(<VideoPlayer {...base} role="teacher" currentUser={{ id: 't' }}
      progressRows={[row]} rosterStudents={[{ id: 11, name: '김하은' }, { id: 12, name: '나시우' }]} onProgressSaved={() => {}} />)
    expect(screen.getByTestId('player').dataset.track).toBe('null')
    expect(screen.getByText('댓글 칸')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('tab', { name: '시청 현황' }))
    expect(screen.getByText('완료 0 · 보는 중 1 · 안 봄 1 (2명)')).toBeInTheDocument()
  })
})
```

`src/components/VideoCard.test.jsx` 의 `describe('VideoCard', …)` 안 끝에 추가:

```jsx
  it('시청 표시가 있으면 보여준다', () => {
    render(<VideoCard video={mockVideo} className="수능국어A반" commentCount={0} onClick={() => {}} progressLabel="완료 4/7" />)
    expect(screen.getByText('완료 4/7')).toBeInTheDocument()
  })

  it('시청 표시가 없으면 아무것도 붙지 않는다', () => {
    render(<VideoCard video={mockVideo} className="수능국어A반" commentCount={0} onClick={() => {}} />)
    expect(screen.queryByText(/완료|%/)).toBeNull()
  })
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/components/VideoPlayer.test.jsx src/components/VideoCard.test.jsx`
Expected: FAIL — 이어보기 버튼·탭·시청 표시가 없다

- [ ] **Step 3: VideoPlayer 수정**

`src/components/VideoPlayer.jsx` 전체를 아래로 바꾼다:

```jsx
// src/components/VideoPlayer.jsx
import { useState } from 'react'
import CommentSection from './CommentSection'
import TrackedPlayer from './video/TrackedPlayer'
import ResumeBanner from './video/ResumeBanner'
import WatchProgressLine from './video/WatchProgressLine'
import WatchRoster from './video/WatchRoster'

/** 영상 재생 화면
 *  PC: 플레이어(2/3) + 오른쪽 칸(1/3) 2열
 *  모바일: 플레이어 → 제목 → 오른쪽 칸 세로 배치
 *
 *  학생: 이어보기 줄 · 실제 시청 진행 · 댓글
 *  교사·관리자: [댓글 | 시청 현황] 탭
 *
 *  Props:
 *    video           - { id, videoId, title, classId }
 *    role            - 'student' | 'teacher' | 'admin'
 *    currentUser     - { id, role, studentId }
 *    comments        - 전체 댓글 배열
 *    students        - 학생 배열 (실명 조회용)
 *    progressRows    - 시청 기록 (학생은 자기 것 0~1줄, 교사는 이 영상 전부)
 *    rosterStudents  - 이 영상을 볼 학생 명단 (교사 시청 현황용)
 *    onProgressSaved - (row) => void  저장이 끝난 최신 기록
 *    onBack, onAddComment, onAddReply
 */
export default function VideoPlayer({
  video, role, currentUser, comments, students,
  progressRows = [], rosterStudents = [], onProgressSaved,
  onBack, onAddComment, onAddReply,
}) {
  const isStudent = role === 'student'
  const [seekTo, setSeekTo] = useState(null)
  const [tab, setTab] = useState('comments')
  const myRow = isStudent ? progressRows[0] : undefined

  const comment = (
    <CommentSection
      videoId={video.id}
      role={role}
      currentUser={currentUser}
      comments={comments}
      students={students}
      onAddComment={onAddComment}
      onAddReply={onAddReply}
    />
  )

  return (
    <div>
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-ink-mute hover:text-ink mb-4 transition-colors"
      >
        ← 목록으로
      </button>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="lg:w-2/3">
          {isStudent && (
            <ResumeBanner row={myRow} onResume={(sec) => setSeekTo(sec)} />
          )}
          <TrackedPlayer
            youtubeId={video.videoId}
            dbVideoId={video.id}
            title={video.title}
            trackAs={isStudent ? 'student' : null}
            seekTo={seekTo}
            onSaved={onProgressSaved}
          />
          <h2 className="mt-3 text-lg font-bold text-ink">{video.title}</h2>
          {isStudent && <WatchProgressLine row={myRow} />}
        </div>

        <div className="lg:w-1/3">
          {isStudent ? comment : (
            <>
              <div role="tablist" className="flex gap-2 mb-3">
                {[['comments', '댓글'], ['watch', '시청 현황']].map(([key, label]) => (
                  <button
                    key={key}
                    role="tab"
                    aria-selected={tab === key}
                    onClick={() => setTab(key)}
                    className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                      tab === key ? 'bg-ink text-white' : 'bg-surface-alt text-ink-soft hover:bg-line-soft'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {tab === 'comments' ? comment : <WatchRoster students={rosterStudents} rows={progressRows} />}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: VideoCard 수정**

`src/components/VideoCard.jsx` 에서
- 함수 인자에 `progressLabel` 을 추가: `export default function VideoCard({ video, className, commentCount, progressLabel, onClick, onDelete })`
- 주석 Props 목록에 `progressLabel - 시청 표시 ("✓ 완료", "73%", "완료 4/7") 또는 null` 추가
- `<span>댓글 {commentCount}</span>` 바로 뒤에 넣는다:

```jsx
            {progressLabel && (
              <>
                <span>·</span>
                <span className="font-bold text-navy whitespace-nowrap">{progressLabel}</span>
              </>
            )}
```

- [ ] **Step 5: Videos.jsx 수정**

`src/pages/Videos.jsx`:

import 줄에 추가:

```jsx
import { useEffect, useState } from 'react'
import { fetchProgressForVideos } from '../utils/videoProgressApi'
import { cardProgressLabel } from '../utils/videoProgress'
```

(기존 `import { useState } from 'react'` 는 위 줄로 바꾼다)

`const [selectedClassId, setSelectedClassId] = useState('all')` 다음에:

```jsx
  // 시청 기록 — 화면에 보이는 영상들의 것만 읽는다 (학생은 행 수준 보안으로 자기 것만 온다)
  const [progress, setProgress] = useState([])
```

`filteredVideos` 계산 다음에:

```jsx
  const visibleIds = filteredVideos.map((v) => v.id).join(',')
  useEffect(() => {
    const ids = visibleIds ? visibleIds.split(',').map(Number) : []
    let alive = true
    fetchProgressForVideos(ids)
      .then((rows) => { if (alive) setProgress(rows) })
      .catch((e) => console.error('시청 기록을 불러오지 못했습니다:', e))
    return () => { alive = false }
  }, [visibleIds, selectedVideo?.id])   // 영상에서 나올 때 다시 읽어 카드 표시를 새로 고친다

  // 저장이 끝난 최신 기록으로 바꿔 끼운다
  function handleProgressSaved(row) {
    setProgress((prev) => [...prev.filter((r) => r.id !== row.id), row])
  }

  // 그 영상을 볼 학생 명단 — 반이 비어 있으면 교사가 볼 수 있는 학생 전원
  function rosterFor(video) {
    return video.classId == null
      ? accessibleStudents
      : accessibleStudents.filter((s) => s.classId === video.classId)
  }
```

`<VideoPlayer` 에 props 추가:

```jsx
        progressRows={progress.filter((r) => r.videoId === currentVideo.id)}
        rosterStudents={rosterFor(currentVideo)}
        onProgressSaved={handleProgressSaved}
```

`<VideoCard` 에 prop 추가:

```jsx
                progressLabel={cardProgressLabel(
                  user.role,
                  progress.filter((r) => r.videoId === video.id),
                  rosterFor(video).length,
                )}
```

- [ ] **Step 6: 통과 확인 + 전체 테스트**

Run: `npx vitest run src/components/VideoPlayer.test.jsx src/components/VideoCard.test.jsx`
Expected: PASS

Run: `npx vitest run`
Expected: 기존 756개 + 새 테스트 전부 PASS

- [ ] **Step 7: Commit**

```bash
git add src/components/VideoPlayer.jsx src/components/VideoPlayer.test.jsx src/components/VideoCard.jsx src/components/VideoCard.test.jsx src/pages/Videos.jsx
git commit -m "feat: 영상 화면에 이어보기·시청 진행, 교사 시청 현황 탭, 카드 시청 표시"
```

---

### Task 8: 알림 함수 `api/notify-video.js`

**Files:**
- Create: `api/notify-video.js`
- Test: `api/notify-video.test.js`

**Interfaces:**
- Consumes: 웹훅 payload `{ type: 'INSERT', table: 'video_events', record: { id, type: 'start'|'complete', video_id, student_id, created_at } }`
- Produces:
  - `videoNotifyTargets(student, classes, admins): string[]`
  - `videoNotification(type, student, video): { title, body }`
  - `isAuthorizedWebhook`, `isDeadSubscription`, `endpointsToRemove` (notify-qna 와 같은 동작)
  - HTTP: `POST /api/notify-video` → `200 { sent, removed }`

- [ ] **Step 1: 실패하는 테스트 작성**

`api/notify-video.test.js`:

```js
// api/notify-video.test.js
import { describe, it, expect } from 'vitest'
import { videoNotifyTargets, videoNotification } from './notify-video.js'

const CLASSES = [{ id: 10, teacher_id: 't1' }, { id: 20, teacher_id: null }]
const ADMINS = [{ id: 'a1' }, { id: 'a2' }]

describe('videoNotifyTargets', () => {
  it('학생 반 담당 교사와 관리자 전원', () => {
    expect(videoNotifyTargets({ id: 1, class_id: 10 }, CLASSES, ADMINS)).toEqual(['t1', 'a1', 'a2'])
  })
  it('담당 교사가 관리자를 겸하면 한 번만', () => {
    expect(videoNotifyTargets({ id: 1, class_id: 10 }, [{ id: 10, teacher_id: 'a1' }], ADMINS)).toEqual(['a1', 'a2'])
  })
  it('반이 없거나 담당 교사가 없어도 관리자에게는 간다', () => {
    expect(videoNotifyTargets({ id: 1, class_id: null }, CLASSES, ADMINS)).toEqual(['a1', 'a2'])
    expect(videoNotifyTargets({ id: 1, class_id: 20 }, CLASSES, ADMINS)).toEqual(['a1', 'a2'])
    expect(videoNotifyTargets(undefined, CLASSES, ADMINS)).toEqual(['a1', 'a2'])
  })
})

describe('videoNotification', () => {
  it('시작 · 완료 문구 — 진행률 같은 세부는 넣지 않는다', () => {
    expect(videoNotification('start', { name: '김하은' }, { title: '현대시 개념 정리 1강' }))
      .toEqual({ title: '영상 시청 시작', body: '김하은 · 현대시 개념 정리 1강' })
    expect(videoNotification('complete', { name: '김하은' }, { title: '현대시 개념 정리 1강' }))
      .toEqual({ title: '영상 시청 완료', body: '김하은 · 현대시 개념 정리 1강' })
  })
  it('이름·제목을 못 찾아도 알림은 간다', () => {
    expect(videoNotification('start', undefined, undefined)).toEqual({ title: '영상 시청 시작', body: '학생 · 영상' })
  })
})
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run api/notify-video.test.js`
Expected: FAIL — import 를 못 찾는다

- [ ] **Step 3: 구현**

`api/notify-video.js`:

```js
// api/notify-video.js
// 학생이 영상을 처음 보기 시작했을 때와 다 봤을 때 담당 교사·관리자 폰으로 알린다.
//
// DB 트리거가 video_events 에 한 줄을 넣고, Supabase Database Webhook 이 그 줄을 여기로 보낸다.
// 틀은 api/notify-qna.js 와 같다. 판단 로직은 순수 함수로 빼서 테스트한다.
import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'
import { isAuthorizedWebhook, isDeadSubscription, endpointsToRemove } from './notify-qna.js'

export { isAuthorizedWebhook, isDeadSubscription, endpointsToRemove }

// 학생 반 담당 교사 + 관리자 전원. 반·교사를 못 찾아도 관리자에게는 간다 (Q&A 와 같은 규칙)
export function videoNotifyTargets(student, classes = [], admins = []) {
  const klass = student && classes.find((c) => c.id === student.class_id)
  return [...new Set([
    ...(klass?.teacher_id ? [klass.teacher_id] : []),
    ...admins.map((a) => a.id),
  ])]
}

// 잠금화면에 그대로 뜬다. 진행률 같은 세부는 넣지 않는다.
export function videoNotification(type, student, video) {
  return {
    title: type === 'complete' ? '영상 시청 완료' : '영상 시청 시작',
    body: `${student?.name ?? '학생'} · ${video?.title ?? '영상'}`,
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // 비밀값은 Q&A 알림과 함께 쓴다 — 환경변수를 늘리지 않는다
  if (!isAuthorizedWebhook(req.headers, process.env.QNA_WEBHOOK_SECRET)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const supabaseUrl    = process.env.VITE_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const publicKey      = process.env.VAPID_PUBLIC_KEY
  const privateKey     = process.env.VAPID_PRIVATE_KEY
  const contact        = process.env.VAPID_CONTACT
  if (!supabaseUrl || !serviceRoleKey || !publicKey || !privateKey || !contact) {
    return res.status(500).json({ error: '서버 환경변수가 설정되지 않았습니다.' })
  }
  webpush.setVapidDetails(contact, publicKey, privateKey)

  const event = req.body?.record
  if (!event?.student_id || !event?.video_id || !['start', 'complete'].includes(event.type)) {
    return res.status(400).json({ error: '시청 이벤트 정보가 없습니다.' })
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const [studentRes, videoRes, classesRes, adminsRes] = await Promise.all([
    admin.from('students').select('id, name, class_id').eq('id', event.student_id).maybeSingle(),
    admin.from('videos').select('id, title').eq('id', event.video_id).maybeSingle(),
    admin.from('classes').select('id, teacher_id'),
    admin.from('profiles').select('id').eq('role', 'admin'),
  ])

  const student = studentRes.data ?? undefined
  const targets = videoNotifyTargets(student, classesRes.data ?? [], adminsRes.data ?? [])
  if (targets.length === 0) return res.status(200).json({ sent: 0, removed: 0, reason: '받을 사람 없음' })

  const { data: subs } = await admin
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .in('profile_id', targets)

  const payload = JSON.stringify({ ...videoNotification(event.type, student, videoRes.data), url: '/videos' })

  // 한 기기가 실패해도 나머지는 계속 보낸다
  const results = await Promise.all((subs ?? []).map(async (s) => {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload)
      return { endpoint: s.endpoint }
    } catch (e) {
      if (!isDeadSubscription(e.statusCode)) console.error('알림 발송 실패:', s.endpoint, e.statusCode, e.body)
      return { endpoint: s.endpoint, statusCode: e.statusCode }
    }
  }))

  const dead = endpointsToRemove(results)
  if (dead.length > 0) await admin.from('push_subscriptions').delete().in('endpoint', dead)
  return res.status(200).json({ sent: results.filter((r) => !r.statusCode).length, removed: dead.length })
}
```

- [ ] **Step 4: 통과 확인 + 함수 수 확인**

Run: `npx vitest run api/notify-video.test.js`
Expected: PASS

Run: `ls api/*.js | grep -v '\.test\.js$' | wc -l`
Expected: `11` (12 를 넘으면 배포가 통째로 실패한다)

- [ ] **Step 5: Commit**

```bash
git add api/notify-video.js api/notify-video.test.js
git commit -m "feat: 영상 시청 시작·완료를 담당 교사와 관리자에게 알린다"
```

---

### Task 9: 데모에서 끝까지 확인 — 테스트 · 빌드 · 390px

**Files:**
- (코드 변경 없음. 문제가 나오면 해당 Task 파일을 고친다)

- [ ] **Step 1: 전체 테스트와 빌드**

Run: `npx vitest run && npm run build && npm run lint`
Expected: 테스트 전부 PASS, 빌드 성공, lint 오류 0

- [ ] **Step 2: 데모 DB 를 보는지 다시 확인하고 개발 서버**

```bash
grep -o 'https://[a-z]*\.supabase\.co' .env   # zlvubufzbdhwvdtpomlz
npm run dev -- --port 5181
```

- [ ] **Step 3: 학생으로 실제 재생 (390×844)**

`~/Documents/developments/졸업전시회-2026/05_시연/shoot.mjs` 의 puppeteer 틀(로그인 방식)을 복사해 `BASE=http://localhost:5181` 로 쓴다.
`st04` 로 로그인 → 영상 → 첫 영상 → 재생 버튼을 누르고 25초 기다린 뒤 목록으로 → 다시 들어간다.
확인할 것:
- 제목 아래 `실제 시청 0:2x / …` 가 보인다
- (10초 이상 봤으므로) `지난번 0:2x까지 봤어요 [이어보기]` 가 보인다
- 390px 에서 줄이 쪼개지거나 넘치지 않는다 → 스크린샷을 찍어 Read 로 직접 본다

- [ ] **Step 4: 교사로 확인 (1440×900, 그리고 390×844)**

`teacher` 로 로그인 → 같은 영상 → `시청 현황` 탭: `완료 0 · 보는 중 1 · 안 봄 n (m명)`, 김하은 줄에 `0:2x까지 · 실제 시청 n%`.
목록 카드에 `완료 0/m`. 두 폭에서 스크린샷을 찍어 확인한다.

- [ ] **Step 5: 데모 DB 에 남은 시험 기록을 적어 둔다**

`video_progress`/`video_events` 에 st04 기록이 남는다 — 데모라 두어도 되지만, 작업 보고에 무엇이 남았는지 적는다.
(데모 DB에는 웹훅이 없으므로 알림은 가지 않는 것이 정상이다)

- [ ] **Step 6: Commit (고친 것이 있으면)**

```bash
git add -A src api
git commit -m "fix: 데모 확인에서 찾은 문제"
```

---

### Task 10: 운영 적용 — **사용자 확인을 받고 한 단계씩**

**Files:** 없음 (운영 작업)

- [ ] **Step 1: 운영 DB 에 SQL — 사용자에게 묻고, 사용자가 직접 실행**

> "운영 DB에 시청 기록 표를 만들어도 될까요? 학생 데이터는 바뀌지 않고 새 표 2개와 함수가 생깁니다."

승인되면 사용자에게:

```
! ~/Documents/developments/졸업전시회-2026/05_시연/seed/run_sql.sh "$PWD/docs/video-progress.sql" prod
! ~/Documents/developments/졸업전시회-2026/05_시연/seed/run_sql.sh "$PWD/docs/video-progress-verify.sql" prod
```

Expected: verify ①~⑧ 전부 `✅`. (verify 는 만든 행을 지운다 — 다만 지우기 전에 이벤트가 생겼다가 지워지므로 **웹훅을 걸기 전에** 돌린다)

- [ ] **Step 2: 배포 — 사용자에게 묻고 push**

> "브랜치를 main 에 합치고 배포할까요?"

승인되면 `superpowers:finishing-a-development-branch` 를 따른다. 배포 후 `https://www.sumunjae.com/api/notify-video` 에 GET 을 보내 `405` 가 오는지 확인한다 (`404`/`index.html` 이면 함수가 안 올라간 것 — 함수 수 상한).

- [ ] **Step 3: 운영 Supabase 웹훅 설정 — 사용자가 대시보드에서**

안내할 내용:
- Supabase → **soomoonjae** 프로젝트(이름 확인!) → Database → Webhooks → Create
- Table `video_events`, Events `Insert`
- Type HTTP Request, Method POST, URL `https://www.sumunjae.com/api/notify-video`
- Headers `Content-type: application/json`, `x-webhook-secret: <QNA_WEBHOOK_SECRET 과 같은 값>`
- **graduate(데모) 프로젝트에는 만들지 않는다**

- [ ] **Step 4: 실제 알림 확인**

교사 폰에서 알림을 켠 상태로, 학생 테스트 계정이 영상을 10초 이상 본다 → "영상 시청 시작" 알림이 오는지.
안 오면 `docs/qna-push-debug.sql` 처럼 `video_events` 행 → 웹훅 기록 → 함수 로그 순으로 끊긴 곳을 찾는다.

- [ ] **Step 5: CLAUDE.md 기능 목록 갱신 후 Commit**

`CLAUDE.md` 기능 목록 표에 한 줄 추가:

```
| 15 | 영상 시청 추적 (시작·완료 알림 · 시청 위치 · 이어보기) | ✅ 완료 |
```

```bash
git add CLAUDE.md
git commit -m "docs: 기능 목록에 영상 시청 추적"
```
