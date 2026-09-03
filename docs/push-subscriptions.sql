-- docs/push-subscriptions.sql
-- 웹 푸시 구독을 담는 표.
--
-- Supabase → SQL Editor에 통째로 붙여넣고 실행한다. 여러 번 실행해도 안전하다.
--
-- 알림은 사람이 아니라 기기 단위로 간다. 교사가 폰과 PC에서 각각 켜면
-- 행이 두 개 생기고 두 기기 모두 알림을 받는다.

create table if not exists public.push_subscriptions (
  id         bigint generated always as identity primary key,
  -- 계정을 지우면 구독도 같이 지운다. 남겨두면 아무도 못 받는 구독에 계속 쏜다.
  profile_id uuid        not null references public.profiles(id) on delete cascade,
  -- 브라우저가 준 고유 주소. 껐다 켜면 같은 값이 다시 오므로 unique로 막는다
  -- (막지 않으면 행이 쌓여 한 기기에 알림이 여러 번 간다)
  endpoint   text        not null unique,
  p256dh     text        not null,
  auth       text        not null,
  -- "어느 기기인지" 화면에 보여주려고 남긴다
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists push_subscriptions_profile_idx
  on public.push_subscriptions (profile_id);

-- ── 접근 정책 ────────────────────────────────────────────────
-- 본인 구독만 읽고 쓰고 지운다. 남의 구독을 읽으면 그 사람 폰으로
-- 알림을 보낼 수 있게 되므로 반드시 잠근다.
--
-- 발송 함수는 서버에서 service role로 읽으므로 이 정책의 영향을 받지 않는다.
alter table public.push_subscriptions enable row level security;

drop policy if exists push_sub_own on public.push_subscriptions;
create policy push_sub_own on public.push_subscriptions
for all to authenticated
using (profile_id = auth.uid())
with check (profile_id = auth.uid());

-- ── 확인 ─────────────────────────────────────────────────────
-- 1줄이 나와야 한다: push_sub_own
select policyname, cmd from pg_policies
where schemaname = 'public' and tablename = 'push_subscriptions';
