-- ============================================================
-- 2026-10-07 원장님 문의 — 원인 확인 (읽기만 한다, 아무것도 바꾸지 않는다)
-- ============================================================
-- Supabase(운영 soomoonjae) → SQL Editor 에서 번호별로 하나씩 실행한다.
-- ⚠️ 데모 프로젝트(graduate)가 아니라 운영 프로젝트인지 먼저 확인할 것.
-- ============================================================


-- ── 1. 테스트 0점 — 피해가 얼마나 되나 ─────────────────────────
-- 2026-09-16 정답 숨김 이후 학생 폰은 정답 없이 채점해서 객관식이 전부 0점이 됐다.
-- "저장된 총점"이 0인데 답안이 있는 제출이 몇 건인지 본다.
-- (정확한 재채점 전후 비교는 test-grading-fix.sql PART 2 에서 한다)
select
  t.title                                   as 테스트,
  t.date                                    as 날짜,
  count(*)                                  as 제출수,
  count(*) filter (where coalesce((
    select sum((e->>'score')::numeric)
    from jsonb_array_elements(to_jsonb(s.scores)) e
  ), 0) = 0 and jsonb_array_length(to_jsonb(s.scores)) > 0) as 저장총점이_0인_제출
from public.submissions s
join public.tests t on t.id = s.test_id
group by t.id, t.title, t.date
order by t.date desc;


-- ── 2. 이재빈 학생 — 계정과 명부의 반이 같은가 ──────────────────
-- 앱은 계정의 반(profiles.class_id)으로, DB 창구는 명부의 반(students.class_id)으로
-- 테스트를 거른다. 둘이 다르면 그 학생에게 테스트가 하나도 안 보인다.
--   계정반 ≠ 명부반          → 이번 앱 수정 + fix PART 4 로 해결
--   계정 행이 없다            → 계정이 명부와 연결이 끊겼다(유령 계정, ghost-student-accounts.sql)
--   그반테스트수가 0          → 그 반에 낸 테스트가 아예 없다
select
  st.id                    as 명부id,
  st.name                  as 이름,
  st.class_id              as 명부반,
  c.name                   as 명부반_이름,
  p.username               as 아이디,
  p.class_id               as 계정반,
  (select count(*) from public.tests t where t.class_id = st.class_id)                       as 그반테스트수,
  (select count(*) from public.tests t where t.class_id = st.class_id and t.status = 'active') as 진행중
from public.students st
left join public.profiles p on p.student_id = st.id and p.role = 'student'
left join public.classes  c on c.id = st.class_id
where st.name like '%이재빈%';

-- 이름으로 계정만 따로 — 명부와 연결이 끊긴 계정이 있는지
select username as 아이디, name as 이름, role, student_id as 명부id, class_id as 계정반
from public.profiles
where name like '%이재빈%';

-- 반이 어긋난 학생 전체 (이재빈 말고도 있을 수 있다)
select st.name as 이름, p.username as 아이디, p.class_id as 계정반, st.class_id as 명부반
from public.profiles p
join public.students st on st.id = p.student_id
where p.role = 'student' and p.class_id is distinct from st.class_id
order by st.name;


-- ── 3. 과제 알림 — 웹훅이 살아 있나 ────────────────────────────
-- 과제 "제출" 알림(학생 → 교사)은 DB 웹훅이 부른다. 아래에
--   homework_submissions_v2 | … | https://…/api/notify-homework-submission
-- 줄이 없으면 웹훅이 지워진 것이다. (9/30 데모 DB에서 운영 웹훅을 지우는
-- 08_drop_prod_webhooks.sql 을 돌렸는데, 혹시 운영에서 돌렸다면 여기서 드러난다)
-- 주소만 뽑는다 — 트리거 정의에는 비밀값이 들어 있어 통째로 보이지 않게 한다.
select
  c.relname   as 표,
  t.tgname    as 트리거,
  substring(pg_get_triggerdef(t.oid) from 'https?://[^''", )]+') as 부르는주소
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
where not t.tgisinternal
  and c.relnamespace = 'public'::regnamespace
order by 1, 2;


-- ── 4. 과제 알림 — 웹훅이 쐈다면 서버가 뭐라고 답했나 ──────────
--   행이 없다        → 웹훅이 아예 안 쐈다 (3번 확인)
--   401              → 비밀값이 Vercel 값과 다르다
--   200 + sent:0     → 받을 기기가 없다 (5번 확인)
--   200 + sent:1 이상 → 서버는 보냈다. 폰의 알림 설정 문제
select status_code as 응답코드, left(content::text, 120) as 응답내용, created as 시각
from net._http_response
order by created desc
limit 15;


-- ── 5. 과제 알림 — 받을 기기가 있나 ────────────────────────────
-- 제출 알림은 출제한 교사 + 관리자 전원에게 간다. 켠기기수 0이면 그 계정은
-- 알림을 안 켰거나, 같은 폰에서 다른 계정으로 로그인해 주소를 빼앗긴 것이다
-- (한 기기 = 계정 하나, 나중에 로그인한 계정이 가져간다).
select p.role as 역할, p.name as 이름, count(ps.id) as 켠기기수, max(ps.created_at) as 마지막등록
from public.profiles p
left join public.push_subscriptions ps on ps.profile_id = p.id
where p.role in ('admin', 'teacher')
group by p.id, p.role, p.name
order by p.role, p.name;

-- 출제 알림(교사 → 학생)을 받을 학생 기기 수 — 0이면 학생들이 알림을 안 켠 것
select count(distinct ps.profile_id) as 알림켠학생수, count(*) as 학생기기수
from public.push_subscriptions ps
join public.profiles p on p.id = ps.profile_id
where p.role = 'student';
