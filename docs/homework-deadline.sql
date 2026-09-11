-- ============================================================
-- 과제 제출 기한을 DB에서 막는다 (2단계)
-- ============================================================
-- Supabase 대시보드 → SQL Editor → PART를 하나씩 복사해 실행한다.
-- 각 PART 끝의 확인 질의 결과를 보고 다음으로 넘어간다.
-- 여러 번 실행해도 안전하다(idempotent).
--
-- 왜 화면이 아니라 여기서 막나:
--   화면 판정은 학생 기기의 시계를 믿는 것이고, 앱은 개발자 도구로 우회할 수
--   있다. 여기서 막으면 무엇을 하든 기한이 지난 제출은 들어오지 않는다.
--   시각도 서버(Postgres)의 것을 쓰므로 폰 시간을 바꿔도 소용없다.
--
-- ⚠️ 시작 전 실제 상태 (2026-09-11 조회):
--      homework_submissions_v2 : hw_sub_all | ALL | authenticated | true | true
--      homework_checks         : hw_checks_all | ALL | authenticated | true | true
--   둘 다 정책이 하나뿐인 전면 허용이다. 겹겹이 쌓인 것은 없다.
--
--   무언가 잘못되면 맨 아래 "되돌리기"를 통째로 실행하면 즉시 원래대로 돌아간다.
-- ============================================================


-- ══════════════════════════════════════════════════════════
-- PART 0 — 이미 있는 도우미 함수를 먼저 본다 (읽기만)
-- ══════════════════════════════════════════════════════════
-- ⚠️ 이 DB에는 이미 is_staff(), get_my_role() 이 있다(다른 경로로 만들어진 것).
--    create or replace 로 덮어쓰면 그 함수를 쓰는 **다른 표의 정책이 조용히
--    바뀐다.** 그래서 아래 PART 1은 이름이 겹치지 않는 함수를 새로 만든다.
--    여기서는 무엇이 있는지 눈으로만 확인한다.

select p.proname as 함수, pg_get_functiondef(p.oid) as 정의
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('is_staff','get_my_role','is_admin','my_student_id',
                    'hw_is_staff','hw_my_student_id')
order by p.proname;


-- ══════════════════════════════════════════════════════════
-- PART 1 — 과제 정책 전용 도우미 함수 (이름을 겹치지 않게 둔다)
-- ══════════════════════════════════════════════════════════
-- 이름 앞에 hw_를 붙인다. 기존 is_staff()를 덮어쓰면 그것을 쓰는 다른 정책까지
-- 같이 바뀌는데, 그 정책들이 무엇을 기대하는지 모른 채 건드릴 수는 없다.
-- 조금 중복되더라도 이번 변경의 영향 범위를 과제 표 안에 가둔다.
--
-- security definer로 만드는 이유: 정책 안에서 profiles를 직접 조회하면
-- profiles의 RLS가 다시 걸려 재귀하거나, 정책이 조금만 달라져도 조용히
-- false가 되어 멀쩡한 동작이 막힌다. 이 함수는 그 영향을 받지 않는다.
--
-- search_path를 못박는 이유: security definer 함수에서 이것을 비워 두면
-- 남이 만든 같은 이름의 표를 보게 만들 수 있다.

create or replace function public.hw_is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('teacher', 'admin')
  );
$$;

-- 로그인한 사람에게 딸린 학생 명부 번호. 학생이 아니면 null이다.
create or replace function public.hw_my_student_id()
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select student_id from public.profiles where id = auth.uid();
$$;

revoke all on function public.hw_is_staff()       from public;
revoke all on function public.hw_my_student_id()  from public;
grant execute on function public.hw_is_staff()      to authenticated;
grant execute on function public.hw_my_student_id() to authenticated;

-- 확인 (2행) — 지금 로그인한 사람(SQL Editor는 보통 관리자) 기준 값도 함께 본다
select 'hw_is_staff' as 함수, public.hw_is_staff()::text as 내값
union all
select 'hw_my_student_id', coalesce(public.hw_my_student_id()::text, '(없음 — 학생 계정이 아님)');


-- ══════════════════════════════════════════════════════════
-- PART 2 — 교사가 따로 열어준 요일을 담는 표
-- ══════════════════════════════════════════════════════════
-- 3단계(재제출 허락·신입생 지난 과제)에서 화면이 붙는다.
-- 지금은 비어 있고, 비어 있는 동안에는 아무 영향이 없다.
-- PART 3의 정책이 이 표를 참조하므로 먼저 만든다.

create table if not exists public.homework_reopens (
  id         bigint generated always as identity primary key,
  day_id     bigint not null references public.homework_days(id) on delete cascade,
  student_id bigint not null,
  opened_by  uuid,
  opened_at  timestamptz not null default now(),
  -- 같은 학생·같은 요일을 두 번 열 이유가 없다
  unique (day_id, student_id)
);

create index if not exists homework_reopens_day_idx
  on public.homework_reopens (day_id);

alter table public.homework_reopens enable row level security;

drop policy if exists hw_reopens_all    on public.homework_reopens;
drop policy if exists hw_reopens_select on public.homework_reopens;
drop policy if exists hw_reopens_insert on public.homework_reopens;
drop policy if exists hw_reopens_update on public.homework_reopens;
drop policy if exists hw_reopens_delete on public.homework_reopens;

-- 읽기는 열어 둔다. 학생 화면이 "내 요일이 열렸나"를 이 표로 판단한다.
create policy hw_reopens_select on public.homework_reopens
for select to authenticated using (true);

-- ⚠️ 쓰기는 교사·관리자만. 여기를 열어 두면 학생이 자기 이름으로 "열어줌" 행을
-- 직접 넣어 기한 잠금 전체를 무력화할 수 있다. 이 표의 존재 이유가 사라진다.
create policy hw_reopens_insert on public.homework_reopens
for insert to authenticated with check (public.hw_is_staff());

create policy hw_reopens_update on public.homework_reopens
for update to authenticated using (public.hw_is_staff()) with check (public.hw_is_staff());

create policy hw_reopens_delete on public.homework_reopens
for delete to authenticated using (public.hw_is_staff());

-- 확인 (4행: delete / insert / select / update)
select policyname, cmd, qual, with_check from pg_policies
 where schemaname = 'public' and tablename = 'homework_reopens' order by cmd;


-- ══════════════════════════════════════════════════════════
-- PART 3 — 제출 표의 정책을 넷으로 나눈다
-- ══════════════════════════════════════════════════════════
-- 이 PART를 실행하는 순간부터 기한이 지난 제출이 거부된다.
-- 읽기·수정·삭제는 지금과 똑같이 열어 둔다 — 교사의 제출 현황 조회와
-- "제출 취소"가 거기 걸려 있어서, 좁히면 교사 화면이 죽는다.

drop policy if exists hw_sub_all    on public.homework_submissions_v2;
drop policy if exists hw_sub_select on public.homework_submissions_v2;
drop policy if exists hw_sub_insert on public.homework_submissions_v2;
drop policy if exists hw_sub_update on public.homework_submissions_v2;
drop policy if exists hw_sub_delete on public.homework_submissions_v2;

-- 읽기 — 지금과 같다. 교사의 제출 현황·리포트, 학생 본인 결과.
-- 제출 직후 앱이 넣은 행을 되읽으므로(.insert().select()) 이것이 없으면 제출이 실패한다.
create policy hw_sub_select on public.homework_submissions_v2
for select to authenticated using (true);

-- 수정 — 지금과 같다. 앱은 제출을 고치지 않지만, 좁혀 두면 나중에 조용히 막힌다.
create policy hw_sub_update on public.homework_submissions_v2
for update to authenticated using (true) with check (true);

-- 삭제 — 지금과 같다. 교사의 "제출 취소"가 여기 걸린다.
create policy hw_sub_delete on public.homework_submissions_v2
for delete to authenticated using (true);

-- 새로 내기 — 여기만 기한을 본다.
--   1) 마감 다음날까지 (월요일 과제는 화요일 자정까지)
--   2) 또는 교사가 그 학생·그 요일을 따로 열어준 경우
-- 날짜는 서버 시각을 한국 시간으로 바꿔서 센다. 학생 기기의 시계는 보지 않는다.
create policy hw_sub_insert on public.homework_submissions_v2
for insert to authenticated
with check (
  exists (
    select 1
    from public.homework_days d
    where d.id = homework_submissions_v2.day_id
      and (now() at time zone 'Asia/Seoul')::date <= d.date + 1
  )
  or exists (
    select 1
    from public.homework_reopens r
    where r.day_id     = homework_submissions_v2.day_id
      and r.student_id = homework_submissions_v2.student_id
  )
);

-- 확인 (4행: delete / insert / select / update)
select policyname, cmd, qual, with_check from pg_policies
 where schemaname = 'public' and tablename = 'homework_submissions_v2' order by cmd;


-- ══════════════════════════════════════════════════════════
-- PART 4 — 확인 기록 표도 같이 조인다
-- ══════════════════════════════════════════════════════════
-- 1단계에서 미뤄둔 것이다. 지금은 전면 허용이라 학생이 자기 확인 기록을
-- 지우고 다시 확인할 수 있고, 남의 "고치기 전 답안"도 내려받을 수 있다.

drop policy if exists hw_checks_all    on public.homework_checks;
drop policy if exists hw_checks_select on public.homework_checks;
drop policy if exists hw_checks_insert on public.homework_checks;
drop policy if exists hw_checks_delete on public.homework_checks;

-- 읽기 — 교사는 전부, 학생은 자기 것만. 남의 답안을 볼 이유가 없다.
create policy hw_checks_select on public.homework_checks
for select to authenticated
using (public.hw_is_staff() or student_id = public.hw_my_student_id());

-- 쓰기 — 자기 이름으로만. 남의 확인 기록을 만들어 그 학생의 기회를 태울 수 없게 한다.
create policy hw_checks_insert on public.homework_checks
for insert to authenticated
with check (student_id = public.hw_my_student_id());

-- 지우기 — 교사·관리자만. 이것이 "확인은 한 번"을 실제로 지키는 부분이다.
create policy hw_checks_delete on public.homework_checks
for delete to authenticated using (public.hw_is_staff());

-- 고치기 정책은 만들지 않는다 → 아무도 확인 기록을 수정할 수 없다.
-- 확인은 그 순간의 기록이므로 나중에 바뀌면 안 된다.

-- 확인 (3행: delete / insert / select)
select policyname, cmd, qual, with_check from pg_policies
 where schemaname = 'public' and tablename = 'homework_checks' order by cmd;


-- ══════════════════════════════════════════════════════════
-- PART 5 — 제대로 걸렸는지 눈으로 확인
-- ══════════════════════════════════════════════════════════
-- 서버가 보는 오늘 날짜(한국 기준). 실제 오늘과 같아야 한다.
select (now() at time zone 'Asia/Seoul')::date as 서버가보는오늘;

-- 지금 이 순간 제출을 받아주는 요일과 닫힌 요일
select
  s.title                          as 세트,
  d.date                           as 마감일,
  d.date + 1                       as 제출가능마지막날,
  case when (now() at time zone 'Asia/Seoul')::date <= d.date + 1
       then '열림' else '닫힘' end as 상태
from public.homework_days d
join public.homework_sets s on s.id = d.set_id
order by d.date desc
limit 15;


-- ══════════════════════════════════════════════════════════
-- ⛔ 되돌리기 — 제출이 안 되는 등 문제가 생기면 이것만 통째로 실행
-- ══════════════════════════════════════════════════════════
-- 원래의 전면 허용 정책으로 즉시 돌아간다.
-- 표와 함수는 남지만 아무 영향이 없다.
--
-- drop policy if exists hw_sub_select on public.homework_submissions_v2;
-- drop policy if exists hw_sub_insert on public.homework_submissions_v2;
-- drop policy if exists hw_sub_update on public.homework_submissions_v2;
-- drop policy if exists hw_sub_delete on public.homework_submissions_v2;
-- create policy hw_sub_all on public.homework_submissions_v2
-- for all to authenticated using (true) with check (true);
--
-- drop policy if exists hw_checks_select on public.homework_checks;
-- drop policy if exists hw_checks_insert on public.homework_checks;
-- drop policy if exists hw_checks_delete on public.homework_checks;
-- create policy hw_checks_all on public.homework_checks
-- for all to authenticated using (true) with check (true);
