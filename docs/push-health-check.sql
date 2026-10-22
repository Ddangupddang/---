-- docs/push-health-check.sql
-- 알림 웹훅이 전부 살아 있는지 한 번에 본다. 읽기만 한다 — 아무것도 바꾸지 않는다.
--
-- Supabase 웹 SQL Editor → 화면 위쪽이 soomoonjae 인지 확인 → 통째로 붙여넣고 실행.
-- 결과 칸은 마지막 질의만 보여 준다. 1번을 보려면 1번만 골라(드래그) 실행한다.
--
-- 2026-10-22 클리닉 알림을 notify-qna-message 주소에 붙인 뒤,
-- Q&A·과제 알림이 그대로인지 확인하려고 만들었다.


-- ── 1. 웹훅(트리거)이 표마다 붙어 있고 켜져 있나 ─────────────
-- 4줄이 나와야 하고 켜짐은 전부 O 여야 한다.
--   qna                     → /api/notify-qna
--   qna_messages            → /api/notify-qna-message
--   homework_submissions_v2 → /api/notify-homework-submission
--   clinic_requests         → /api/notify-qna-message   (같은 주소가 맞다)
-- (video_progress 등 다른 표에 웹훅이 있으면 그것도 함께 나온다)
select
  c.relname   as 표,
  t.tgname    as 트리거,
  t.tgenabled as 켜짐,   -- O = 켜짐, D = 꺼짐
  (string_to_array(encode(t.tgargs, 'escape'), '\000'))[1] as 주소
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
where not t.tgisinternal
  and t.tgfoid = 'supabase_functions.http_request'::regproc
order by c.relname, t.tgname;


-- ── 2. 웹훅이 최근에 쏜 것과 우리 서버의 답 ───────────────────
-- 응답코드가 전부 200이면 정상이다. 내용의 sent 숫자가 받은 기기 수다.
--   401     → 웹훅 비밀값이 틀렸다
--   404/405 → 주소가 틀렸다
--   500     → 서버 오류 (내용에 이유가 있다)
--   빈칸    → 시간초과. 배포 직후 첫 호출은 콜드 스타트로 그럴 수 있다(알림은 간다)
-- 오늘 오전 배포 뒤의 Q&A 글·과제 제출 시각과 맞춰 보면 된다.
select
  id,
  created     as 시각,
  status_code as 응답코드,
  left(content, 120) as 응답내용,
  timed_out   as 시간초과
from net._http_response
where created > now() - interval '1 day'
order by created desc
limit 30;
