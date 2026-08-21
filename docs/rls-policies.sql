-- ============================================================
-- RLS 정책 — 교사는 담당 반, 학생은 본인 것만 (서버에서 차단)
-- ============================================================
-- 지금까지는 정책이 전부 using(true)라, 로그인만 하면 브라우저에서 전 지점
-- 데이터를 읽고 쓸 수 있었다. 화면 필터는 눈에서 가릴 뿐 서버는 다 내줬다.
-- 이 파일은 서버가 애초에 남의 반 데이터를 내주지 않게 만든다.
--
-- 실행: Supabase 대시보드 → SQL Editor → 전체 붙여넣기 → Run
-- 되돌리기: docs/rls-rollback.sql 을 같은 방법으로 실행 (즉시 원상복구)
-- 확인 절차: docs/rls-checklist.md
--
-- 여러 번 실행해도 안전하다 (기존 정책을 지우고 다시 만든다).
-- ============================================================


-- ── 0. 헬퍼 함수 ─────────────────────────────────────────────
-- 정책 안에서 profiles를 직접 읽으면 profiles 자신의 정책이 다시 걸려
-- 무한 재귀가 난다. security definer 함수로 감싸 그 고리를 끊는다.

create or replace function public.my_role()
returns text language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.my_role() = 'admin', false)
$$;

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.my_role() in ('admin', 'teacher'), false)
$$;

-- 로그인한 학생 계정에 연결된 students.id
create or replace function public.my_student_id()
returns bigint language sql stable security definer set search_path = public as $$
  select student_id from public.profiles where id = auth.uid()
$$;

-- 내가 볼 수 있는 반 — 관리자는 전체, 교사는 담당 반, 학생은 본인 반
create or replace function public.my_class_ids()
returns bigint[] language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(c.id), '{}'::bigint[])
  from public.classes c
  where public.is_admin()
     or (public.my_role() = 'teacher' and c.teacher_id = auth.uid())
     or (public.my_role() = 'student'
         and c.id = (select class_id from public.profiles where id = auth.uid()))
$$;

-- 내가 볼 수 있는 학생. 학생 본인은 자기 한 명뿐이다 (같은 반 친구도 안 보인다).
create or replace function public.my_student_ids()
returns bigint[] language sql stable security definer set search_path = public as $$
  select case
    when public.is_admin() then
      coalesce((select array_agg(id) from public.students), '{}'::bigint[])
    when public.my_role() = 'teacher' then
      coalesce((select array_agg(id) from public.students
                where class_id = any(public.my_class_ids())), '{}'::bigint[])
    when public.my_student_id() is not null then array[public.my_student_id()]
    else '{}'::bigint[]
  end
$$;

-- 테스트·영상은 반에 묶여 있다. 그 반을 볼 수 있으면 자료도 볼 수 있다.
create or replace function public.can_see_test(p_test_id bigint)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_admin() or exists (
    select 1 from public.tests t
    where t.id = p_test_id and t.class_id = any(public.my_class_ids())
  )
$$;

-- Q&A는 반이 아니라 "쓴 학생"에 묶인다. 그 학생을 볼 수 있으면 질문도 본다.
create or replace function public.can_see_qna_author(p_student_id bigint)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_admin() or exists (
    select 1 from public.students s
    where s.id = p_student_id and s.class_id = any(public.my_class_ids())
  )
$$;

create or replace function public.can_see_video(p_video_id bigint)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_admin() or exists (
    select 1 from public.videos v
    where v.id = p_video_id and v.class_id = any(public.my_class_ids())
  )
$$;


-- ── 1. 기존 정책 정리 ────────────────────────────────────────
-- 예전 허용형 정책(using true)이 하나라도 남으면 그것만으로 전부 통과된다.
-- 대상 테이블의 정책을 모두 지운 뒤 아래에서 새로 만든다.

do $$
declare
  t text;
  p text;
  tables text[] := array[
    'profiles', 'classes', 'students', 'attendance', 'grades',
    'qna', 'notices', 'reports', 'videos', 'video_comments',
    'tests', 'submissions', 'weekly_report_notes',
    'homework_sets', 'homework_days', 'homework_questions',
    'homework_submissions_v2',
    -- 예전 구조(사용하지 않지만 남아 있으면 같이 잠근다)
    'homework', 'homework_submissions'
  ];
begin
  foreach t in array tables loop
    if exists (select 1 from information_schema.tables
               where table_schema = 'public' and table_name = t) then
      execute format('alter table public.%I enable row level security', t);
      for p in select policyname from pg_policies
               where schemaname = 'public' and tablename = t loop
        execute format('drop policy %I on public.%I', p, t);
      end loop;
    end if;
  end loop;
end $$;


-- ── 2. profiles ─────────────────────────────────────────────
-- 본인 계정은 항상 읽는다(로그인 직후 역할 조회에 필요).
-- 교직원 목록(작성자 이름 표시 등)은 교사·관리자만 읽는다.
-- 학생 계정 정보는 관리자와 담당 교사만 읽는다.
create policy profiles_select on public.profiles
for select using (
  id = auth.uid()
  or (public.is_staff() and role in ('admin', 'teacher'))
  or (public.is_staff() and role = 'student'
      and (public.is_admin() or student_id = any(public.my_student_ids())))
);

-- 비밀번호 변경 표시 등 본인 정보만 수정. 계정 생성·삭제는 서버 API(service role)가 한다.
create policy profiles_update_self on public.profiles
for update using (id = auth.uid()) with check (id = auth.uid());


-- ── 3. classes ──────────────────────────────────────────────
create policy classes_select on public.classes
for select using (public.is_admin() or id = any(public.my_class_ids()));

create policy classes_write on public.classes
for all using (public.is_admin()) with check (public.is_admin());


-- ── 4. students ─────────────────────────────────────────────
-- 학생 본인은 자기 행만 본다 — 같은 반 친구의 연락처가 보이면 안 된다.
create policy students_select on public.students
for select using (public.is_admin() or id = any(public.my_student_ids()));

-- 등록·수정·삭제·엑셀 업로드는 화면에서도 관리자 전용이다.
create policy students_write on public.students
for all using (public.is_admin()) with check (public.is_admin());


-- ── 5. attendance ───────────────────────────────────────────
create policy attendance_select on public.attendance
for select using (public.is_admin() or student_id = any(public.my_student_ids()));

-- 교사는 담당 반 학생의 출결을 기록·수정한다.
create policy attendance_staff_write on public.attendance
for all using (public.is_staff() and (public.is_admin() or student_id = any(public.my_student_ids())))
with check (public.is_staff() and (public.is_admin() or student_id = any(public.my_student_ids())));

-- 학생 본인 출석 체크. 남의 이름으로, 지난 날짜로는 기록할 수 없다.
-- 앞뒤 하루를 허용하는 건 브라우저와 서버의 시간대 차이 때문이다.
create policy attendance_student_insert on public.attendance
for insert with check (
  student_id = public.my_student_id()
  and date between current_date - 1 and current_date + 1
);

create policy attendance_student_update on public.attendance
for update using (student_id = public.my_student_id())
with check (
  student_id = public.my_student_id()
  and date between current_date - 1 and current_date + 1
);


-- ── 6. grades ───────────────────────────────────────────────
create policy grades_select on public.grades
for select using (public.is_admin() or student_id = any(public.my_student_ids()));

create policy grades_staff_write on public.grades
for all using (public.is_staff() and (public.is_admin() or student_id = any(public.my_student_ids())))
with check (public.is_staff() and (public.is_admin() or student_id = any(public.my_student_ids())));


-- ── 7. tests ────────────────────────────────────────────────
create policy tests_select on public.tests
for select using (public.is_admin() or class_id = any(public.my_class_ids()));

create policy tests_staff_write on public.tests
for all using (public.is_staff() and (public.is_admin() or class_id = any(public.my_class_ids())))
with check (public.is_staff() and (public.is_admin() or class_id = any(public.my_class_ids())));


-- ── 8. submissions (테스트 답안) ────────────────────────────
create policy submissions_select on public.submissions
for select using (public.is_admin() or student_id = any(public.my_student_ids()));

-- 학생은 자기 답안만 낸다.
create policy submissions_student_insert on public.submissions
for insert with check (student_id = public.my_student_id());

create policy submissions_student_update on public.submissions
for update using (student_id = public.my_student_id())
with check (student_id = public.my_student_id());

-- 교사는 담당 반 학생 답안을 채점(수정)하고 지운다.
create policy submissions_staff_write on public.submissions
for all using (public.is_staff() and (public.is_admin() or student_id = any(public.my_student_ids())))
with check (public.is_staff() and (public.is_admin() or student_id = any(public.my_student_ids())));


-- ── 9. qna ──────────────────────────────────────────────────
-- 질문은 테스트에 매이지 않는다(말머리 방식). 작성한 학생을 볼 수 있으면 본다.
-- 실제 정의는 qna-category.sql에 있다 — 두 파일이 어긋나면 그 파일이 맞다.
create policy qna_select on public.qna
for select using (public.can_see_qna_author(student_id));

create policy qna_student_insert on public.qna
for insert with check (student_id = public.my_student_id());

create policy qna_staff_write on public.qna
for all using (public.is_staff() and public.can_see_qna_author(student_id))
with check (public.is_staff() and public.can_see_qna_author(student_id));


-- ── 10. videos ──────────────────────────────────────────────
create policy videos_select on public.videos
for select using (public.is_admin() or class_id = any(public.my_class_ids()));

create policy videos_staff_write on public.videos
for all using (public.is_staff() and (public.is_admin() or class_id = any(public.my_class_ids())))
with check (public.is_staff() and (public.is_admin() or class_id = any(public.my_class_ids())));


-- ── 11. video_comments ──────────────────────────────────────
-- 학생 화면에서는 익명으로 보이지만 행 자체는 같은 반 학생들이 함께 읽는다.
create policy video_comments_select on public.video_comments
for select using (public.can_see_video(video_id));

create policy video_comments_student_insert on public.video_comments
for insert with check (
  student_id = public.my_student_id() and public.can_see_video(video_id)
);

create policy video_comments_staff_write on public.video_comments
for all using (public.is_staff() and public.can_see_video(video_id))
with check (public.is_staff() and public.can_see_video(video_id));


-- ── 12. notices ─────────────────────────────────────────────
-- 대상이 비어 있으면 학원 전체 공지다 — 누구에게나 보인다.
create policy notices_select on public.notices
for select using (
  public.is_admin()
  or coalesce(array_length(target_class_ids, 1), 0) = 0
  or target_class_ids::bigint[] && public.my_class_ids()
);

-- 교사는 담당 반에만 공지를 보낸다. 관리자는 제한 없다.
create policy notices_insert on public.notices
for insert with check (
  public.is_staff()
  and (public.is_admin() or target_class_ids::bigint[] <@ public.my_class_ids())
);

create policy notices_delete on public.notices
for delete using (public.is_admin() or author_id = auth.uid());


-- ── 13. reports (진도 리포트) ───────────────────────────────
-- 학생에게는 보이지 않는다.
create policy reports_select on public.reports
for select using (public.is_staff() and (public.is_admin() or class_id = any(public.my_class_ids())));

create policy reports_insert on public.reports
for insert with check (public.is_staff() and (public.is_admin() or class_id = any(public.my_class_ids())));

create policy reports_update on public.reports
for update using (public.is_staff() and (public.is_admin() or class_id = any(public.my_class_ids())))
with check (public.is_staff() and (public.is_admin() or class_id = any(public.my_class_ids())));

create policy reports_delete on public.reports
for delete using (public.is_admin() or created_by = auth.uid());


-- ── 14. weekly_report_notes (주간 코멘트) ───────────────────
create policy weekly_notes_select on public.weekly_report_notes
for select using (public.is_staff() and (public.is_admin() or student_id = any(public.my_student_ids())));

create policy weekly_notes_write on public.weekly_report_notes
for all using (public.is_staff() and (public.is_admin() or student_id = any(public.my_student_ids())))
with check (public.is_staff() and (public.is_admin() or student_id = any(public.my_student_ids())));


-- ── 15. 과제 ────────────────────────────────────────────────
-- 과제 세트는 반이 아니라 학년·레벨 단위로 출제되는 학원 공용 자료다.
-- 그래서 로그인한 사람은 모두 읽고, 만드는 건 교사·관리자만 한다.
create policy homework_sets_select on public.homework_sets
for select using (auth.uid() is not null);
create policy homework_sets_write on public.homework_sets
for all using (public.is_staff()) with check (public.is_staff());

create policy homework_days_select on public.homework_days
for select using (auth.uid() is not null);
create policy homework_days_write on public.homework_days
for all using (public.is_staff()) with check (public.is_staff());

create policy homework_questions_select on public.homework_questions
for select using (auth.uid() is not null);
create policy homework_questions_write on public.homework_questions
for all using (public.is_staff()) with check (public.is_staff());

-- 제출은 학생 개인 기록이다 — 본인과 담당 교사만.
create policy homework_submissions_select on public.homework_submissions_v2
for select using (public.is_admin() or student_id = any(public.my_student_ids()));

create policy homework_submissions_student_insert on public.homework_submissions_v2
for insert with check (student_id = public.my_student_id());

create policy homework_submissions_student_update on public.homework_submissions_v2
for update using (student_id = public.my_student_id())
with check (student_id = public.my_student_id());

-- 교사의 제출 취소(삭제) 포함
create policy homework_submissions_staff_write on public.homework_submissions_v2
for all using (public.is_staff() and (public.is_admin() or student_id = any(public.my_student_ids())))
with check (public.is_staff() and (public.is_admin() or student_id = any(public.my_student_ids())));


-- ── 16. 확인 ────────────────────────────────────────────────
-- 정책이 없는(=아무도 못 읽는) 테이블이 있는지 훑어본다.
select tablename, count(*) as 정책수
from pg_policies
where schemaname = 'public'
group by tablename
order by tablename;
