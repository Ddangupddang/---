-- ============================================================
-- 2단계 A — 정책이 제대로 들어갔는지 마지막 확인
-- ============================================================
-- stage2-policies.sql 의 PART 1~4 를 실행한 뒤 이것을 돌린다.
-- 읽기만 한다. 파일 전체를 붙여넣고 Run.
--
-- 기대하는 모습 (이 주석은 붙여넣어도 무해하다):
--   videos          — DELETE 가 staff_delete_videos 하나만
--   video_comments  — comments_delete / comments_insert /
--                     all_view_comments / staff_reply_comments
--   tests           — DELETE 가 staff_delete_tests 하나만
--   submissions     — sub_select / sub_insert / sub_delete /
--                     staff_grade_submissions
--   인덱스          — submissions_test_student_uniq 가 있어야 한다
-- ============================================================

select '정책' as 구분, tablename as 항목,
       policyname || ' · ' || cmd
                  || coalesce(' using(' || qual || ')', '')
                  || coalesce(' check(' || with_check || ')', '') as 내용
  from pg_policies
 where schemaname = 'public'
   and tablename in ('videos','video_comments','tests','submissions')
union all
select '중복제출 제약', indexname, indexdef
  from pg_indexes
 where schemaname = 'public' and tablename = 'submissions'
 order by 구분, 항목, 내용;
