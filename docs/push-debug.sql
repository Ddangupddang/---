-- ============================================================
-- 알림이 안 올 때 어디서 끊겼는지 찾기
-- ============================================================
-- Supabase → SQL Editor에서 위에서부터 하나씩 실행한다.
-- 읽기만 한다. 아무것도 바꾸지 않는다.
-- ============================================================


-- ── 1. 방금 제출의 알림이 "누구에게" 가게 되어 있었나 ─────────
-- 제출 알림은 그 과제를 낸 교사에게 간다(출제자를 모르면 관리자 전원).
-- 출제자_켠기기수가 0이면 보낼 곳이 없어서 sent:0으로 끝난 것이다.
select
  st.name                       as 제출학생,
  s.title                       as 세트,
  d.weekday                     as 요일,
  coalesce(pr.name, '(없음)')   as 출제자,
  s.teacher_id                  as 출제자_id,
  count(ps.id)                  as 출제자_켠기기수,
  sub.submitted_at              as 제출시각
from public.homework_submissions_v2 sub
join public.homework_days d  on d.id = sub.day_id
join public.homework_sets  s on s.id = d.set_id
join public.students      st on st.id = sub.student_id
left join public.profiles pr on pr.id = s.teacher_id
left join public.push_subscriptions ps on ps.profile_id = s.teacher_id
group by st.name, s.title, d.weekday, pr.name, s.teacher_id, sub.submitted_at
order by sub.submitted_at desc
limit 5;


-- ── 2. 내 계정은 알림을 켰나 ──────────────────────────────────
-- 켠기기수가 0이면 아직 안 켠 것이다. 과제 화면 → 과제 알림 → 알림 받기.
select
  p.role                     as 역할,
  coalesce(st.name, p.name)  as 이름,
  count(ps.id)               as 켠기기수
from public.profiles p
left join public.students st          on st.id = p.student_id
left join public.push_subscriptions ps on ps.profile_id = p.id
group by p.role, st.name, p.name
having count(ps.id) > 0
order by p.role, 이름;


-- ── 3. 구독이 아예 하나도 없나 ────────────────────────────────
-- 0이면 이 학원에서 아무도 알림을 안 켠 상태다.
select count(*) as 전체구독수 from public.push_subscriptions;


-- ── 4. 웹훅이 실제로 쐈나, 우리 서버가 뭐라고 답했나 ──────────
-- Supabase 웹훅은 pg_net으로 나가고 응답이 여기 쌓인다.
-- 이게 알림 문제에서 가장 결정적인 자료다.
--
--   행이 없다        → 웹훅이 아예 안 쐈다 (표·URL·Events 설정 확인)
--   status_code 401  → x-webhook-secret 값이 Vercel 값과 다르다
--   status_code 200  → 우리 서버는 보냈다. content의 sent 숫자를 볼 것
--   status_code 500  → 서버 환경변수 문제
select
  id,
  status_code   as 응답코드,
  content       as 응답내용,
  created       as 시각
from net._http_response
order by created desc
limit 10;


-- 4번이 "relation net._http_response does not exist"로 실패하면
-- 이 프로젝트는 응답을 남기지 않는 설정이다. 그때는 Vercel Logs를 본다.
