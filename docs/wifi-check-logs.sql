-- docs/wifi-check-logs.sql
-- 출석 체크 때 감지된 주소를 한 줄씩 남긴다.
--
-- Supabase → SQL Editor에 통째로 붙여넣고 실행한다. 여러 번 실행해도 안전하다.
--
-- 실행하지 않아도 앱은 그대로 돌아간다 — 기록만 안 남는다.
--
-- 왜 만드나:
--   "일부 학생만 출석이 안 된다"를 2026-08부터 못 고치고 있었다. 이유는
--   하나다 — **실패할 때마다 증거가 증발했다.** 학생이 화면을 닫으면 끝이었다.
--   그래서 실패한 학생을 찾아다니며 물어보는 수밖에 없었다.
--
--   2026-09-17에 한 학생의 주소를 겨우 받아 조회했더니 Fastly와 Cloudflare —
--   애플 iCloud+ 「사설 릴레이」의 출구였다. 주소 하나가 한 달을 풀었다.
--   나머지 학생도 같은 원인인지는 아직 모른다. 그걸 알려면 주소를 모아야 한다.
--
-- 무엇을 알 수 있나:
--   실패한 주소의 주인이 원인을 그대로 알려준다.
--     Cloudflare·Fastly·Akamai  → 아이폰 사설 릴레이
--     그 밖의 해외 업체          → VPN 앱
--     한국 이동통신             → LTE로 샘 (WiFi 신호 문제)
--     콜론(:) 든 주소            → IPv6


-- ── 1. 기록 표 ──────────────────────────────────────────────
-- 성공도 함께 남긴다. 성공한 주소가 있어야 "이 지점은 보통 이 주소"라는
-- 기준이 생기고, 실패한 주소와 견줄 수 있다. 학원 주소가 바뀐 것도 여기서 보인다.
create table if not exists public.wifi_check_logs (
  id         bigint generated always as identity primary key,
  -- 학생이 지워져도 기록은 남긴다. 누구였는지만 알 수 없게 된다.
  student_id bigint      references public.students(id) on delete set null,
  -- 감지된 공인 IP. 이것 하나가 원인을 가른다.
  client_ip  text,
  ok         boolean     not null,
  created_at timestamptz not null default now()
);

create index if not exists wifi_check_logs_time_idx
  on public.wifi_check_logs (created_at desc);


-- ── 2. 접근 정책 ─────────────────────────────────────────────
alter table public.wifi_check_logs enable row level security;

-- 남기기: 로그인한 사람은 자기 이름으로 남길 수 있다.
-- 출석 체크를 누르는 건 학생이므로 본인 이름만 허용한다.
drop policy if exists wifi_logs_insert on public.wifi_check_logs;
create policy wifi_logs_insert on public.wifi_check_logs
for insert to authenticated
with check (student_id = public.hw_my_student_id());

-- 읽기: 교사·관리자만. 학생은 자기 것도 볼 필요가 없다(화면에 이미 떠 있다).
drop policy if exists wifi_logs_select on public.wifi_check_logs;
create policy wifi_logs_select on public.wifi_check_logs
for select to authenticated
using (public.hw_is_staff());

-- 고치기·지우기 정책은 만들지 않는다 → 아무도 기록을 바꿀 수 없다.
-- 오래된 기록은 아래 4번으로 사람이 직접 지운다.


-- ── 3. 원인별로 모아 보기 ────────────────────────────────────
-- 일주일쯤 쌓인 뒤 이걸 돌리면 된다. 실패한 주소가 어디로 뭉치는지 보인다.
select
  case
    when client_ip is null            then '주소 못 받음'
    when client_ip like '%:%'         then 'IPv6'
    when client_ip ~ '^104\.(1[6-9]|2[0-9]|3[01])\.' then '사설 릴레이 (Cloudflare)'
    when client_ip ~ '^172\.(6[4-9]|7[01])\.'        then '사설 릴레이 (Cloudflare)'
    when client_ip ~ '^162\.15[89]\.'                then '사설 릴레이 (Cloudflare)'
    when client_ip ~ '^(140\.248|151\.101|199\.232)\.' then '사설 릴레이 (Fastly)'
    else '그 밖 — 주소를 직접 조회해 볼 것'
  end                       as 짐작되는_원인,
  client_ip                 as 주소,
  count(*)                  as 횟수,
  count(distinct student_id) as 학생수,
  max(created_at)           as 마지막
from public.wifi_check_logs
where ok = false
group by 1, 2
order by 횟수 desc;

-- 성공한 주소도 한번 본다. 지점별 진짜 주소가 여기 나온다.
select client_ip as 주소, count(*) as 횟수, count(distinct student_id) as 학생수
from public.wifi_check_logs
where ok = true
group by client_ip
order by 횟수 desc;

-- 실패가 잦은 학생 (누구를 먼저 도와줄지)
select s.name as 학생, count(*) as 실패횟수,
       string_agg(distinct l.client_ip, ', ') as 나온_주소들
from public.wifi_check_logs l
join public.students s on s.id = l.student_id
where l.ok = false
group by s.name
order by 실패횟수 desc;


-- ── 4. 오래된 기록 지우기 ────────────────────────────────────
-- 원인 조사용이라 오래 둘 이유가 없다. 가끔 이 한 줄을 실행한다.
-- (자동으로 지우려면 pg_cron이 필요한데, 무료 요금제에서는 켜기 번거롭다)
--
-- delete from public.wifi_check_logs where created_at < now() - interval '30 days';


-- ── 5. 확인 ──────────────────────────────────────────────────
-- 정책 2행(insert / select)이 나와야 한다.
select policyname, cmd, qual, with_check
  from pg_policies
 where schemaname = 'public' and tablename = 'wifi_check_logs'
 order by cmd;
