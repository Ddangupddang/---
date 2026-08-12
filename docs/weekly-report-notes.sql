-- 주간 학생 리포트 — 교사 코멘트
-- Supabase 대시보드 → SQL Editor 에 붙여넣고 실행하세요.

create table if not exists weekly_report_notes (
  id         bigint generated always as identity primary key,
  student_id bigint references students(id) on delete cascade,
  week_start date not null,               -- 그 주 월요일 (mondayOf로 정규화된 값)
  content    text not null default '',
  updated_at timestamptz not null default now(),
  updated_by uuid,
  unique (student_id, week_start)
);

alter table weekly_report_notes enable row level security;

-- 교사·관리자만 읽고 쓴다. 학생에게는 보이지 않는다.
create policy "staff read weekly notes" on weekly_report_notes
  for select using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('admin', 'teacher'))
  );

create policy "staff write weekly notes" on weekly_report_notes
  for all using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('admin', 'teacher'))
  );
