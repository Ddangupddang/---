-- ============================================================
-- 테스트 0점 고치기 — 채점을 학생 폰이 아니라 DB가 한다
-- ============================================================
-- Supabase(운영 soomoonjae) → SQL Editor → **PART를 하나씩** 실행한다.
-- 모든 PART는 여러 번 실행해도 안전하다.
-- ⚠️ 데모 프로젝트(graduate)가 아니라 운영 프로젝트인지 먼저 확인할 것.
--
-- 무엇이 고장났나:
--   2026-09-16(stage2-answer-hiding.sql)부터 학생은 정답이 빠진 문항을 받는다.
--   그런데 학생 폰이 제출하면서 "내 답 = 정답?"을 직접 계산해 점수를 넣고 있었다.
--   비교할 정답이 없으니 객관식은 전부 0점이 저장됐다.
--
-- 어떻게 고치나:
--   제출이 들어오는 순간 DB가 원본 tests 의 정답과 맞춰 점수를 매긴다(트리거).
--   학생이 보낸 점수는 무시하고 덮어쓴다 — 학생이 API로 100점을 직접 넣던
--   구멍도 함께 막힌다.
--     객관식만 있는 시험 → 바로 채점된다 (학생이 결과를 바로 본다)
--     주관식이 섞인 시험 → 교사가 채점할 때까지 비워 둔다 (지금과 같음)
--     교사가 채점 저장   → 객관식은 DB가 다시 매기고, 주관식 점수는 교사 값 그대로
--
-- 순서: PART 1 → PART 2(눈으로 확인) → PART 3 → PART 4 → PART 5
--   PART 1만 해도 "이제부터 내는 답안"은 제대로 채점된다(앱 배포 전이어도).
--   이미 0점으로 저장된 것은 PART 3 이 다시 매긴다.
-- ============================================================


-- ══════════════════════════════════════════════════════════
-- PART 1 — 채점 함수와 트리거
-- ══════════════════════════════════════════════════════════

-- 두 답이 같은 선지 집합인가 — 앱의 sameChoiceSet 과 같은 규칙.
-- 순서 무관('③①' = '①③'), 하나라도 모자라거나 남으면 다르다, 빈 답은 언제나 오답.
create or replace function public.same_choice_set(a text, b text)
returns boolean
language sql
immutable
as $$
  with x as (
    select array(select distinct ch from regexp_split_to_table(coalesce(a, ''), '') ch
                 where ch <> '' order by ch) as v
  ), y as (
    select array(select distinct ch from regexp_split_to_table(coalesce(b, ''), '') ch
                 where ch <> '' order by ch) as v
  )
  select cardinality(x.v) > 0 and x.v = y.v from x, y
$$;

-- 객관식 점수표 — [{questionId, score}] (문항 순서대로)
create or replace function public.grade_mc(questions jsonb, answers jsonb)
returns jsonb
language sql
immutable
as $$
  select coalesce(jsonb_agg(
           jsonb_build_object(
             'questionId', e.q->'id',
             'score', case
               when public.same_choice_set(
                      (select a->>'answer'
                         from jsonb_array_elements(coalesce(answers, '[]'::jsonb)) a
                        where a->>'questionId' = e.q->>'id'
                        limit 1),
                      e.q->>'answer')
               then coalesce((e.q->>'points')::numeric, 0)
               else 0
             end
           ) order by e.ord), '[]'::jsonb)
  from jsonb_array_elements(coalesce(questions, '[]'::jsonb)) with ordinality as e(q, ord)
  where e.q->>'type' = 'mc'
$$;

-- 제출이 들어오거나 점수가 바뀔 때 점수를 다시 매긴다.
-- security definer: 학생은 원본 tests(정답)를 못 읽는다. 트리거만 대신 읽는다.
create or replace function public.grade_test_submission()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_questions jsonb;
  v_answers   jsonb := coalesce(to_jsonb(new.answers), '[]'::jsonb);
  v_scores    jsonb := coalesce(to_jsonb(new.scores),  '[]'::jsonb);
  v_has_sa    boolean;
  v_sa        jsonb;
begin
  select to_jsonb(t.questions) into v_questions from public.tests t where t.id = new.test_id;
  if v_questions is null then
    return new;
  end if;

  v_has_sa := exists (
    select 1 from jsonb_array_elements(v_questions) q where q->>'type' is distinct from 'mc'
  );

  -- 주관식이 섞인 시험: 새 제출이거나 아직 아무도 채점 안 했으면 비워 둔다
  -- (비어 있어야 교사 화면에 '미채점'이 뜨고 학생에게 정답이 안 열린다)
  if v_has_sa and (tg_op = 'INSERT' or jsonb_typeof(v_scores) <> 'array'
                   or jsonb_array_length(v_scores) = 0) then
    new.scores := '[]'::jsonb;
    return new;
  end if;

  -- 주관식 점수는 교사가 넣은 값을 그대로 둔다
  if jsonb_typeof(v_scores) = 'array' then
    select coalesce(jsonb_agg(s), '[]'::jsonb) into v_sa
      from jsonb_array_elements(v_scores) s
     where exists (
       select 1 from jsonb_array_elements(v_questions) q
        where q->>'id' = s->>'questionId' and q->>'type' is distinct from 'mc'
     );
  else
    v_sa := '[]'::jsonb;
  end if;

  new.scores := public.grade_mc(v_questions, v_answers) || v_sa;
  return new;
end;
$$;

drop trigger if exists grade_test_submission on public.submissions;
create trigger grade_test_submission
before insert or update of answers, scores on public.submissions
for each row execute function public.grade_test_submission();

-- 확인 — 한 줄이 나와야 한다
select tgname, tgenabled from pg_trigger
 where tgrelid = 'public.submissions'::regclass and tgname = 'grade_test_submission';


-- ══════════════════════════════════════════════════════════
-- PART 2 — 다시 매기면 점수가 어떻게 바뀌나 (읽기만 한다)
-- ══════════════════════════════════════════════════════════
-- "지금"과 "다시 매긴 뒤"가 다른 제출만 보여준다. 바뀌는 게 0점 → 제 점수인지 눈으로 본다.
-- 주관식이 섞였는데 아직 채점 안 한 제출(점수 비어 있음)은 PART 3 에서도 건드리지 않는다.
with cur as (
  select
    s.id, t.title, t.date, st.name,
    coalesce((select sum((e->>'score')::numeric)
                from jsonb_array_elements(to_jsonb(s.scores)) e), 0) as 지금,
    coalesce((select sum((e->>'score')::numeric)
                from jsonb_array_elements(public.grade_mc(to_jsonb(t.questions), to_jsonb(s.answers))) e), 0)
    + coalesce((select sum((e->>'score')::numeric)
                from jsonb_array_elements(to_jsonb(s.scores)) e
               where exists (select 1 from jsonb_array_elements(to_jsonb(t.questions)) q
                              where q->>'id' = e->>'questionId' and q->>'type' is distinct from 'mc')), 0) as 다시매기면,
    jsonb_array_length(to_jsonb(s.scores)) > 0 as 채점됨
  from public.submissions s
  join public.tests t     on t.id = s.test_id
  left join public.students st on st.id = s.student_id
)
select title as 테스트, date as 날짜, name as 학생, 지금, 다시매기면
from cur
where 채점됨 and 지금 <> 다시매기면
order by date desc, title, name;

-- submissions 에 다른 트리거(웹훅 등)가 있는지 — PART 3 의 update 가 그것도 깨운다.
-- grade_test_submission 말고 다른 것이 있으면 PART 3 전에 알려줄 것.
select tgname from pg_trigger
 where tgrelid = 'public.submissions'::regclass and not tgisinternal;


-- ══════════════════════════════════════════════════════════
-- PART 3 — 이미 저장된 제출을 다시 매긴다
-- ══════════════════════════════════════════════════════════
-- 값은 그대로 두고 답안 칸을 "다시 쓰는" 것만으로 PART 1 트리거가 점수를 새로 매긴다.
-- 채점된 제출만 대상으로 한다 — 주관식 미채점 건은 트리거가 어차피 비워 두지만 건드릴 이유가 없다.
update public.submissions
   set answers = answers
 where jsonb_array_length(to_jsonb(scores)) > 0;

-- 다시 PART 2 첫 질의를 돌려 0줄이 나오면 끝.


-- ══════════════════════════════════════════════════════════
-- PART 4 — 계정의 반을 명부의 반에 맞춘다 (이재빈 학생 건)
-- ══════════════════════════════════════════════════════════
-- 계정(profiles.class_id)은 만들 때 한 번 복사된 값이라, 명부에서 반을 옮기면 낡는다.
-- 앱은 이번 수정으로 명부의 반을 읽지만, DB 정책 중에 계정의 반을 보는 것이 있을 수
-- 있어 값 자체도 맞춰 둔다. 앞으로 반을 옮기면 자동으로 따라가게 트리거도 단다.

-- 먼저 어긋난 학생 확인
select st.name as 이름, p.username as 아이디, p.class_id as 계정반, st.class_id as 명부반
from public.profiles p
join public.students st on st.id = p.student_id
where p.role = 'student' and p.class_id is distinct from st.class_id;

-- 맞추기
update public.profiles p
   set class_id = st.class_id
  from public.students st
 where st.id = p.student_id
   and p.role = 'student'
   and p.class_id is distinct from st.class_id;

-- 앞으로는 명부의 반이 바뀌면 계정도 따라 바뀐다
create or replace function public.sync_student_profile_class()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
     set class_id = new.class_id
   where student_id = new.id
     and role = 'student'
     and class_id is distinct from new.class_id;
  return new;
end;
$$;

drop trigger if exists sync_student_profile_class on public.students;
create trigger sync_student_profile_class
after update of class_id on public.students
for each row execute function public.sync_student_profile_class();


-- ══════════════════════════════════════════════════════════
-- PART 5 — 확인 (읽기만 한다)
-- ══════════════════════════════════════════════════════════
-- ㉠ 채점은 됐는데 다시 매긴 값과 다른 제출 — 0이어야 한다
select count(*) as 어긋난제출
from public.submissions s
join public.tests t on t.id = s.test_id
where jsonb_array_length(to_jsonb(s.scores)) > 0
  and not (public.grade_mc(to_jsonb(t.questions), to_jsonb(s.answers)) <@ to_jsonb(s.scores));

-- ㉡ 반이 어긋난 학생 계정 — 0이어야 한다
select count(*) as 반어긋난계정
from public.profiles p
join public.students st on st.id = p.student_id
where p.role = 'student' and p.class_id is distinct from st.class_id;

-- ㉢ 채점 규칙 자체 — 전부 true 여야 한다
select
  public.same_choice_set('①③', '③①')          as 순서무관,
  not public.same_choice_set('①', '①③')       as 덜고르면오답,
  not public.same_choice_set('①③④', '①③')    as 더고르면오답,
  not public.same_choice_set('', '')           as 빈답은오답,
  not public.same_choice_set('①', null)        as 정답없으면오답;


-- ══════════════════════════════════════════════════════════
-- 되돌리기 — 트리거가 문제를 일으킬 때만
-- ══════════════════════════════════════════════════════════
-- 되돌리면 새 앱은 점수를 비워서 보내므로, 객관식 시험도 교사가 채점 화면에서
-- 한 번씩 "채점 저장"을 눌러야 점수가 생긴다(교사 화면은 정답으로 다시 매긴다).
--
-- drop trigger if exists grade_test_submission on public.submissions;
-- drop trigger if exists sync_student_profile_class on public.students;
