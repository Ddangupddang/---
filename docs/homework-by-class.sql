-- ============================================================
-- 내신 과제를 학년 단위 → 반 단위로
-- ============================================================
-- 반마다 진도가 달라 과제도 반별로 나가야 한다는 요구다.
-- 정시 과제는 지금처럼 레벨(1~3)로 묶는다.
--
-- 실행: Supabase 대시보드 → SQL Editor → 전체 붙여넣기 → Run
-- 여러 번 실행해도 안전하다.
--
-- 기존 데이터는 옮기지 않는다. 반별 전환 이전의 내신 세트는 class_id가 빈 채
-- target에 학년이 남아, 학생 화면과 주간 리포트에서 예전처럼 매칭된다.
-- 다만 교사의 제출 현황·리포트 탭은 반 기준이라 거기에는 나타나지 않는다.
-- ============================================================

-- 1) 대상 반 컬럼
alter table public.homework_sets
  add column if not exists class_id bigint references public.classes(id) on delete cascade;

-- 2) 내신은 이제 target(학년)을 쓰지 않는다
alter table public.homework_sets alter column target drop not null;

-- 3) 예전 중복 방지 규칙 제거 — unique (category, target, week_start)
--    이름이 환경마다 다를 수 있어 유니크 제약을 모두 훑어 지운다 (기본키는 건드리지 않는다)
do $$
declare c text;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.homework_sets'::regclass and contype = 'u'
  loop
    execute format('alter table public.homework_sets drop constraint %I', c);
  end loop;
end $$;

-- 4) 새 중복 방지 규칙
--    내신: 한 반에 그 주 세트 하나
create unique index if not exists homework_sets_naesin_class_week
  on public.homework_sets (class_id, week_start)
  where category = 'naesin' and class_id is not null;

--    내신(예전 데이터): 한 학년에 그 주 세트 하나 — 과거 기록이 중복되지 않게 유지
create unique index if not exists homework_sets_naesin_grade_week
  on public.homework_sets (target, week_start)
  where category = 'naesin' and class_id is null;

--    정시: 한 레벨에 그 주 세트 하나 (지금과 같다)
create unique index if not exists homework_sets_jeongsi_level_week
  on public.homework_sets (target, week_start)
  where category = 'jeongsi';

-- 5) 대상이 비어 있는 세트가 생기지 않게 막는다.
--    둘 다 없으면 아무 학생에게도 안 보이는 유령 과제가 된다.
alter table public.homework_sets drop constraint if exists homework_sets_target_shape;
alter table public.homework_sets add constraint homework_sets_target_shape check (
  (category = 'naesin'  and (class_id is not null or target is not null))
  or (category = 'jeongsi' and target is not null and class_id is null)
);

-- 6) 확인 — 반별 세트와 예전 학년 세트가 어떻게 남았는지 본다
select
  s.category,
  c.name as 반,
  s.target as 예전학년또는레벨,
  s.week_start,
  s.title
from public.homework_sets s
left join public.classes c on c.id = s.class_id
order by s.week_start desc, s.category
limit 50;

-- ── RLS 참고 ────────────────────────────────────────────────
-- 지금 homework_sets는 "로그인한 사람은 모두 읽기 / 교사·관리자만 쓰기"다.
-- 내신이 반 단위가 됐으니 읽기도 담당 반으로 좁히려면 아래를 실행한다.
-- (급하지 않다. 화면에서는 이미 담당 반 것만 보인다)
--
-- drop policy if exists homework_sets_select on public.homework_sets;
-- create policy homework_sets_select on public.homework_sets
-- for select using (
--   public.is_admin()
--   or class_id is null                          -- 정시·예전 학년 세트는 공용
--   or class_id = any(public.my_class_ids())
-- );
