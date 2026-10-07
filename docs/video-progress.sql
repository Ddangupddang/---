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
