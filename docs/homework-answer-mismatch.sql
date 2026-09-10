-- ============================================================
-- 과제 답안이 밀리거나 사라진 범위 확인
-- ============================================================
-- 실행: Supabase 대시보드 → SQL Editor → 한 덩어리씩 복사 → Run
-- 읽기만 하는 질의다. 아무것도 바꾸지 않는다.
--
-- 배경:
--   학생 화면은 문항 칸을 1번부터 세어 그렸는데, 제출은 실제 문항 번호로
--   답을 찾았다. 번호가 1..N이 아닌 순간 답이 엉뚱한 번호에 붙거나 사라졌다.
--   번호에 구멍이 생기는 원인은 1,000행이 넘는 표를 정렬 없이 쪽으로 나눠
--   받은 것이다(2026-09-09에 homework_questions가 1,072행을 넘었다).
-- ============================================================


-- ── 1. 출제한 문항 수와 실제 문항 수가 다른 요일 ──────────────
-- 기대: 0행. 나오면 그 요일은 DB 자체가 어긋나 있다.
select
  s.title            as 세트,
  c.name             as 반,
  d.date             as 마감일,
  d.weekday          as 요일,
  d.question_count   as 출제문항수,
  count(q.id)        as 실제문항수
from public.homework_days d
join public.homework_sets s on s.id = d.set_id
left join public.classes c on c.id = s.class_id
left join public.homework_questions q on q.day_id = d.id
group by s.title, c.name, d.date, d.weekday, d.question_count
having count(q.id) <> d.question_count
order by d.date desc;


-- ── 2. 문항 번호에 구멍이 있는 요일 ──────────────────────────
-- 번호가 1부터 빈틈없이 이어지지 않는 요일. 기대: 0행.
select
  s.title       as 세트,
  d.date        as 마감일,
  count(q.id)   as 문항수,
  min(q.number) as 첫번호,
  max(q.number) as 끝번호
from public.homework_days d
join public.homework_sets s on s.id = d.set_id
join public.homework_questions q on q.day_id = d.id
group by s.title, d.date, d.id
having min(q.number) <> 1 or max(q.number) <> count(q.id)
order by d.date desc;


-- ── 3. 답이 비어 있는 제출 (← 피해 학생 명단) ────────────────
-- 학생은 모든 칸을 채워야만 제출 버튼이 눌린다.
-- 그러므로 여기 나오는 빈 답은 전부 학생 잘못이 아니라 이 버그다.
select
  st.name                                      as 학생,
  c.name                                       as 반,
  s.title                                      as 세트,
  d.date                                       as 마감일,
  count(*) filter (where a->>'answer' is null
                      or a->>'answer' = '')    as 사라진답,
  jsonb_array_length(sub.answers)              as 전체문항,
  sub.submitted_at                             as 제출시각
from public.homework_submissions_v2 sub
join public.homework_days d on d.id = sub.day_id
join public.homework_sets s on s.id = d.set_id
join public.students st on st.id = sub.student_id
left join public.classes c on c.id = st.class_id
cross join lateral jsonb_array_elements(sub.answers) a
group by st.name, c.name, s.title, d.date, sub.answers, sub.submitted_at
having count(*) filter (where a->>'answer' is null or a->>'answer' = '') > 0
order by d.date desc, c.name, st.name;


-- ── 4. 제출한 답의 개수가 문항 수와 다른 제출 ────────────────
-- 덜 불러온 상태로 낸 제출. 나머지 문항은 통째로 오답 처리됐다.
select
  st.name                          as 학생,
  c.name                           as 반,
  s.title                          as 세트,
  d.date                           as 마감일,
  d.question_count                 as 출제문항수,
  jsonb_array_length(sub.answers)  as 제출한답수,
  sub.submitted_at                 as 제출시각
from public.homework_submissions_v2 sub
join public.homework_days d on d.id = sub.day_id
join public.homework_sets s on s.id = d.set_id
join public.students st on st.id = sub.student_id
left join public.classes c on c.id = st.class_id
where jsonb_array_length(sub.answers) <> d.question_count
order by d.date desc, c.name, st.name;


-- ── 5. 다시 풀게 할 제출을 지운다 (확인한 뒤에만!) ────────────
-- 사라진 답은 되살릴 수 없다. 학생이 고른 값이 애초에 전송되지 않았다.
-- 해당 제출을 지우면 학생 화면에서 그 요일이 다시 "미제출"이 되어 다시 낼 수 있다.
-- 3번·4번 결과를 눈으로 확인하고, 지울 대상을 정한 뒤에 주석을 풀 것.
--
-- delete from public.homework_submissions_v2 sub
-- using public.homework_days d
-- where d.id = sub.day_id
--   and jsonb_array_length(sub.answers) <> d.question_count;
