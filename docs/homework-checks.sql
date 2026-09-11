-- ============================================================
-- 제출 전 "확인" 기록 표
-- ============================================================
-- Supabase 대시보드 → SQL Editor → 전체 붙여넣기 → Run
-- 여러 번 실행해도 안전하다.
--
-- 왜 제출 표에 같이 안 넣나:
--   homework_submissions_v2에 행이 생기면 "제출했나"를 세는 코드가
--   전부 오판한다(대시보드 미제출 수, 주간·월간 리포트, 제출 현황 등).
--   표를 나누면 그 코드를 하나도 안 고쳐도 된다.
-- ============================================================

create table if not exists public.homework_checks (
  id         bigint generated always as identity primary key,
  day_id     bigint not null references public.homework_days(id) on delete cascade,
  student_id bigint not null,
  -- 확인을 누른 순간의 답안. 고치기 전 실력이 여기 남는다.
  answers    jsonb  not null default '[]'::jsonb,
  checked_at timestamptz not null default now(),
  -- unique는 "같은 (day_id, student_id) 행이 두 개 생기는 것"만 막는다.
  -- 지금 정책이 authenticated에게 using(true)/with check(true)라 학생이 API를
  -- 직접 두드려 자기 행을 지우고 다시 넣으면 이 제약을 우회해 재확인할 수 있고,
  -- 남의 행도 조회할 수 있다. 정책을 좁히는 일은 2단계로 미뤄뒀다(RLS 실제
  -- 상태를 먼저 조회해 확인한 뒤 교체해야 한다) — 그때까지는 진짜 잠금이 아니다.
  unique (day_id, student_id)
);

create index if not exists homework_checks_day_idx
  on public.homework_checks (day_id);

alter table public.homework_checks enable row level security;

drop policy if exists hw_checks_all on public.homework_checks;
create policy hw_checks_all on public.homework_checks
for all to authenticated using (true) with check (true);

-- ── 확인 ─────────────────────────────────────────────────────
-- 1) 표가 생겼는지 (1행)
select table_name from information_schema.tables
 where table_schema = 'public' and table_name = 'homework_checks';

-- 2) 정책이 걸렸는지 (1행: hw_checks_all)
select policyname, cmd from pg_policies
 where schemaname = 'public' and tablename = 'homework_checks';
