-- 과제(Homework) 기능 테이블
-- Supabase 대시보드 → SQL Editor 에 붙여넣고 실행하세요.

-- 과제 자체
create table if not exists homework (
  id          bigint generated always as identity primary key,
  title       text   not null,
  class_id    bigint references classes(id) on delete cascade,
  teacher_id  uuid,
  due_date    date   not null,
  questions   jsonb  not null default '[]',  -- [{ "number": 1, "answer": "③" }, ...]
  created_at  timestamptz not null default now()
);

-- 학생 제출
create table if not exists homework_submissions (
  id           bigint generated always as identity primary key,
  homework_id  bigint references homework(id) on delete cascade,
  student_id   bigint references students(id) on delete cascade,
  answers      jsonb  not null default '[]', -- [{ "number": 1, "answer": "②" }, ...]
  submitted_at timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (homework_id, student_id)
);

-- RLS (기존 tests / submissions 테이블과 동일한 허용형 정책)
alter table homework enable row level security;
alter table homework_submissions enable row level security;

create policy "homework_all" on homework
  for all using (true) with check (true);
create policy "homework_submissions_all" on homework_submissions
  for all using (true) with check (true);
