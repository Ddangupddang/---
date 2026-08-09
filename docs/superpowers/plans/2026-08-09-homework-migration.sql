-- 과제 파트 재설계 마이그레이션 (내신/정시 · 요일별)
-- 실행 순서 주의: 이 파일은 "신규 구조 생성"까지만 담는다.
-- 기존 homework / homework_submissions 테이블 DROP은 코드 교체(Task 11)까지 끝난 뒤
-- 아래 맨 하단의 "구 테이블 드롭" 블록을 별도로 실행한다.

-- 1) 학생 로스터에 학년/정시레벨 추가
alter table students add column if not exists grade int;
alter table students add column if not exists jeongsi_level int;

-- 2) 신규 과제 테이블
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

-- 3) RLS: 기존 homework 테이블과 동일한 정책을 적용해야 한다.
--    (아래는 예시 — 프로젝트의 기존 homework 테이블 정책을 확인해 동일하게 맞출 것)
alter table homework_sets            enable row level security;
alter table homework_days            enable row level security;
alter table homework_questions       enable row level security;
alter table homework_submissions_v2  enable row level security;

create policy hw_sets_all on homework_sets      for all to authenticated using (true) with check (true);
create policy hw_days_all on homework_days      for all to authenticated using (true) with check (true);
create policy hw_q_all    on homework_questions for all to authenticated using (true) with check (true);
create policy hw_sub_all  on homework_submissions_v2 for all to authenticated using (true) with check (true);

-- 4) 해설 파일 저장용 Storage 버킷
insert into storage.buckets (id, name, public)
values ('homework-solutions','homework-solutions', true)
on conflict (id) do nothing;

create policy hw_sol_read   on storage.objects for select to public
  using (bucket_id = 'homework-solutions');
create policy hw_sol_write  on storage.objects for insert to authenticated
  with check (bucket_id = 'homework-solutions');

-- ─────────────────────────────────────────────────────────────
-- 검증 쿼리 (실행 후 확인)
-- select column_name from information_schema.columns
--  where table_name='students' and column_name in ('grade','jeongsi_level');   -- 기대: 2행
-- select table_name from information_schema.tables
--  where table_name in ('homework_sets','homework_days','homework_questions','homework_submissions_v2'); -- 기대: 4개

-- ─────────────────────────────────────────────────────────────
-- ⛔ 구 테이블 드롭 — 코드 교체(Task 11)까지 끝난 뒤에만 실행!
-- drop table if exists homework_submissions;  -- 구 스키마
-- drop table if exists homework;              -- 구 스키마
