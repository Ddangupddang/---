-- ============================================================
-- RLS 되돌리기 — 정책을 예전(모두 허용) 상태로 복구
-- ============================================================
-- rls-policies.sql 을 적용한 뒤 화면이 비거나 저장이 안 되면,
-- 원인을 찾기 전에 이 파일부터 실행해 서비스를 정상으로 되돌린다.
--
-- 실행: Supabase 대시보드 → SQL Editor → 전체 붙여넣기 → Run
-- 걸리는 시간: 1초. 앱은 새로고침하면 바로 원래대로 동작한다.
--
-- 주의: 되돌리면 로그인한 사람은 누구나 전 지점 데이터를 다시 읽고 쓸 수 있다.
-- 화면 필터는 그대로 남아 있으므로 눈에 보이는 범위는 달라지지 않는다.
-- ============================================================

do $$
declare
  t text;
  p text;
  tables text[] := array[
    'profiles', 'classes', 'students', 'attendance', 'grades',
    'qna', 'notices', 'reports', 'videos', 'video_comments',
    'tests', 'submissions', 'weekly_report_notes',
    'homework_sets', 'homework_days', 'homework_questions',
    'homework_submissions_v2', 'homework', 'homework_submissions'
  ];
begin
  foreach t in array tables loop
    if exists (select 1 from information_schema.tables
               where table_schema = 'public' and table_name = t) then
      -- 새로 만든 정책 제거
      for p in select policyname from pg_policies
               where schemaname = 'public' and tablename = t loop
        execute format('drop policy %I on public.%I', p, t);
      end loop;
      -- 예전과 같은 허용형 정책 하나로 되돌린다
      execute format(
        'create policy %I on public.%I for all using (true) with check (true)',
        t || '_all', t);
    end if;
  end loop;
end $$;

-- 헬퍼 함수는 남겨둔다 (아무 동작도 하지 않으며, 다시 적용할 때 그대로 쓴다).
-- 완전히 지우려면 아래 주석을 풀고 실행한다.
-- drop function if exists public.can_see_video(bigint);
-- drop function if exists public.can_see_test(bigint);
-- drop function if exists public.my_student_ids();
-- drop function if exists public.my_class_ids();
-- drop function if exists public.my_student_id();
-- drop function if exists public.is_staff();
-- drop function if exists public.is_admin();
-- drop function if exists public.my_role();

select tablename, policyname from pg_policies
where schemaname = 'public' order by tablename;
