-- 삭제(DELETE) RLS 정책 일괄 추가
-- 증상: 항목을 삭제하면 화면에선 사라지지만 새로고침하면 다시 나타남.
-- 원인: 해당 테이블에 RLS는 켜져 있는데 DELETE를 허용하는 정책이 없어,
--       삭제 요청이 0개 행만 지우고 에러 없이 조용히 실패함.
-- 해결: 각 테이블에 허용형 DELETE 정책을 추가한다 (이 앱은 anon key + 앱 레벨
--       역할 분기 방식이라, 기존 homework 테이블 정책과 동일하게 허용형으로 둔다).
--
-- Supabase 대시보드 → SQL Editor 에 붙여넣고 한 번 실행하세요.
-- 이미 DELETE 정책이 있는 테이블이라도 안전합니다 (drop if exists 후 재생성).
-- SELECT/INSERT/UPDATE 정책은 건드리지 않습니다.

do $$
declare
  t text;
  tables text[] := array[
    'students', 'classes', 'attendance', 'grades',
    'notices', 'reports', 'videos', 'video_comments',
    'tests', 'submissions', 'homework', 'homework_submissions'
  ];
begin
  foreach t in array tables loop
    -- 테이블이 존재할 때만 처리 (아직 안 만든 테이블은 건너뜀)
    if exists (select 1 from information_schema.tables
               where table_schema = 'public' and table_name = t) then
      execute format('drop policy if exists %I on public.%I', t || '_delete', t);
      execute format('create policy %I on public.%I for delete using (true)',
                     t || '_delete', t);
    end if;
  end loop;
end $$;
