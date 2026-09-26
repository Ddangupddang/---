-- ============================================================
-- Q&A 새 질문 알림만 안 올 때 — 어디서 끊겼는지 찾기
-- ============================================================
-- 과제 알림은 앱이 직접 부르고, Q&A 새 질문 알림은 DB 웹훅이 부른다.
-- 과제 알림이 오는데 Q&A만 안 온다면 폰·구독은 멀쩡하다는 뜻이라,
-- 웹훅이 쐈는지부터 본다.
--
-- Supabase → SQL Editor에서 위에서부터 하나씩 실행한다. 읽기만 한다.
-- ============================================================


-- ── 1. qna 표에 웹훅(트리거)이 아직 붙어 있나 ─────────────────
-- 행이 없으면 웹훅이 지워졌거나 꺼진 것이다. 그러면 질문이 올라와도
-- 우리 서버는 불리지 않는다 — Vercel 로그에도 아무것도 안 남는다.
select
  c.relname        as 표,
  t.tgname         as 트리거,
  t.tgenabled      as 켜짐,   -- O = 켜짐, D = 꺼짐
  pg_get_triggerdef(t.oid) as 정의
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
where not t.tgisinternal
  and c.relname in ('qna', 'qna_messages')
order by c.relname, t.tgname;


-- ── 2. 최근 질문과, 그 알림을 받을 사람이 알림을 켰나 ─────────
-- 받을사람_켠기기수가 0이면 보낼 곳이 없어 sent:0으로 끝난 것이다.
-- 담당교사가 '(없음)'이면 관리자에게 가도록 되어 있다.
select
  q.id                         as 질문id,
  q.created_at                 as 올라온시각,
  st.name                      as 학생,
  coalesce(pr.name, '(없음)')  as 담당교사,
  count(ps.id)                 as 받을사람_켠기기수
from public.qna q
left join public.students st on st.id = q.student_id
left join public.classes  cl on cl.id = st.class_id
left join public.profiles pr on pr.id = cl.teacher_id
left join public.push_subscriptions ps on ps.profile_id = cl.teacher_id
group by q.id, q.created_at, st.name, pr.name
order by q.created_at desc
limit 10;


-- ── 3. 웹훅이 실제로 쐈나, 우리 서버가 뭐라고 답했나 ──────────
-- 가장 결정적인 자료다. 질문을 하나 올린 직후에 실행한다.
--
--   행이 없다        → 웹훅이 안 쐈다 (1번을 볼 것)
--   응답코드 401     → x-webhook-secret 값이 Vercel 값과 다르다
--   응답코드 404/405 → 웹훅 URL이 지금 배포 주소가 아니다
--   응답코드 500     → 서버 환경변수 문제 (응답내용에 이유가 있다)
--   응답코드 200     → 서버는 보냈다. 응답내용의 sent 숫자를 볼 것
--                      (sent:0 이면 받을 기기가 없다는 뜻)
select
  id,
  status_code as 응답코드,
  content     as 응답내용,
  created     as 시각
from net._http_response
order by created desc
limit 10;


-- 3번이 "relation net._http_response does not exist"로 실패하면
-- 이 프로젝트는 응답을 남기지 않는 설정이다. 그때는 Vercel → Logs에서
-- /api/notify-qna 호출이 있는지 본다.
