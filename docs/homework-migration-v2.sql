-- 과제 재설계 마이그레이션 (내신/정시 · 요일별) — 단계 분리판
--
-- 왜 나눴나:
--   Supabase SQL Editor는 실행한 내용 전체를 하나의 트랜잭션으로 처리한다.
--   중간에 한 문장이라도 에러가 나면 앞에서 성공한 것까지 전부 롤백된다.
--   그래서 PART를 하나씩 따로 실행해야 어디서 막히는지 알 수 있다.
--
-- 실행 방법:
--   PART 1만 복사 → 실행 → 성공 확인 → PART 2 복사 → 실행 → ... 순서대로.
--   에러가 나면 그 PART에서 멈추고 에러 메시지를 그대로 알려줄 것.
--
-- 모든 PART는 여러 번 실행해도 안전하다(idempotent).


-- ══════════════════════════════════════════════════════════
-- PART 1 — 학생 로스터 컬럼 추가
-- ══════════════════════════════════════════════════════════

alter table students add column if not exists grade int;
alter table students add column if not exists jeongsi_level int;

-- 확인 (기대: 2행)
select column_name from information_schema.columns
 where table_name = 'students' and column_name in ('grade', 'jeongsi_level');


-- ══════════════════════════════════════════════════════════
-- PART 2 — 신규 과제 테이블 4개
-- ══════════════════════════════════════════════════════════

create table if not exists homework_sets (
  id          bigint generated always as identity primary key,
  category    text not null check (category in ('naesin','jeongsi')),
  target      int  not null,                 -- 내신=학년(1~6), 정시=레벨(1~3)
  week_start  date not null,                 -- 그 주 월요일
  title       text not null,
  teacher_id  uuid,
  created_at  timestamptz not null default now(),
  unique (category, target, week_start)
);

create table if not exists homework_days (
  id                     bigint generated always as identity primary key,
  set_id                 bigint not null references homework_sets(id) on delete cascade,
  weekday                int not null check (weekday between 1 and 6),
  date                   date not null,
  question_count         int not null default 0,
  day_solution_video_url text,
  day_solution_file_url  text,
  unique (set_id, weekday)
);

create table if not exists homework_questions (
  id                  bigint generated always as identity primary key,
  day_id              bigint not null references homework_days(id) on delete cascade,
  number              int not null,
  answer              text not null,
  solution_video_url  text,
  solution_file_url   text,
  unique (day_id, number)
);

create table if not exists homework_submissions_v2 (
  id            bigint generated always as identity primary key,
  day_id        bigint not null references homework_days(id) on delete cascade,
  student_id    bigint not null,
  answers       jsonb not null default '[]'::jsonb,
  submitted_at  timestamptz not null default now(),
  unique (day_id, student_id)
);

-- 확인 (기대: 4행)
select table_name from information_schema.tables
 where table_name in ('homework_sets','homework_days','homework_questions','homework_submissions_v2');


-- ══════════════════════════════════════════════════════════
-- PART 3 — RLS 정책
-- 이미 있는 정책이면 지우고 다시 만든다 (재실행 안전)
-- ══════════════════════════════════════════════════════════

alter table homework_sets            enable row level security;
alter table homework_days            enable row level security;
alter table homework_questions       enable row level security;
alter table homework_submissions_v2  enable row level security;

drop policy if exists hw_sets_all on homework_sets;
drop policy if exists hw_days_all on homework_days;
drop policy if exists hw_q_all    on homework_questions;
drop policy if exists hw_sub_all  on homework_submissions_v2;

create policy hw_sets_all on homework_sets           for all to authenticated using (true) with check (true);
create policy hw_days_all on homework_days           for all to authenticated using (true) with check (true);
create policy hw_q_all    on homework_questions      for all to authenticated using (true) with check (true);
create policy hw_sub_all  on homework_submissions_v2 for all to authenticated using (true) with check (true);

-- 확인 (기대: 4행)
select tablename, policyname from pg_policies
 where tablename in ('homework_sets','homework_days','homework_questions','homework_submissions_v2');


-- ══════════════════════════════════════════════════════════
-- PART 4 — 해설 파일 저장용 Storage 버킷
-- 여기서 에러가 나도 과제 저장 자체는 동작한다 (해설 파일 업로드만 안 됨)
-- ══════════════════════════════════════════════════════════

insert into storage.buckets (id, name, public)
values ('homework-solutions', 'homework-solutions', true)
on conflict (id) do nothing;

drop policy if exists hw_sol_read  on storage.objects;
drop policy if exists hw_sol_write on storage.objects;

create policy hw_sol_read  on storage.objects for select to public
  using (bucket_id = 'homework-solutions');
create policy hw_sol_write on storage.objects for insert to authenticated
  with check (bucket_id = 'homework-solutions');

-- 확인 (기대: 1행)
select id, public from storage.buckets where id = 'homework-solutions';


-- ══════════════════════════════════════════════════════════
-- ⛔ 구 테이블 드롭 — 새 과제 기능이 정상 동작하는 걸 눈으로 확인한 뒤에만!
--    되돌릴 수 없다. 예전 과제 데이터가 영구 삭제된다.
-- ══════════════════════════════════════════════════════════
-- drop table if exists homework_submissions;
-- drop table if exists homework;
