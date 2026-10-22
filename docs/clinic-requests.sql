-- docs/clinic-requests.sql
-- 보강 클리닉 신청.
--
-- 학생이 "받고 싶어요"와 어려운 부분 한 줄을 남기면, 담당 교사나 관리자가
-- 날짜·시간을 글로 적어 수락하거나 이유를 적어 거절한다.
--
-- Supabase → SQL Editor에 통째로 붙여넣고 실행한다. 여러 번 실행해도 안전하다.
-- 실행하지 않으면 클리닉 화면은 열리지만 신청이 실패한다.
--
-- 먼저 실행돼 있어야 하는 것:
--   docs/qna-images.sql   (my_qna_student_id)


-- ── 1. 신청 표 ───────────────────────────────────────────────
create table if not exists public.clinic_requests (
  id            bigint generated always as identity primary key,
  -- 학생을 지우면 신청도 함께 사라진다
  student_id    bigint      not null references public.students(id) on delete cascade,
  -- 어려운 부분 한 줄
  content       text        not null check (length(trim(content)) > 0),
  status        text        not null default 'pending'
                            check (status in ('pending', 'accepted', 'rejected')),
  -- 수락할 때 교사가 적는 날짜·시간. 형식을 정하지 않고 글 그대로 둔다
  -- ("10/25(토) 오후 3시", "다음 주 화요일 수업 끝나고").
  schedule_text text,
  -- 거절할 때 적는 이유
  reject_reason text,
  -- 계정을 지워도 신청은 남는다. 누가 처리했는지만 알 수 없게 된다.
  handled_by    uuid        references public.profiles(id) on delete set null,
  handled_at    timestamptz,
  created_at    timestamptz not null default now(),
  -- 수락이면 일정이, 거절이면 이유가 반드시 있어야 한다.
  -- 빈 칸으로 확정되면 학생은 언제 오라는 건지 알 수 없다.
  constraint clinic_handled_has_text check (
    (status = 'pending')
    or (status = 'accepted' and length(trim(coalesce(schedule_text, ''))) > 0)
    or (status = 'rejected' and length(trim(coalesce(reject_reason, ''))) > 0)
  )
);

create index if not exists clinic_requests_student_idx
  on public.clinic_requests (student_id, created_at desc);

-- 학생 한 명당 대기 중인 신청은 하나뿐이다.
-- 화면도 막지만, 창을 두 개 띄우거나 앱을 거치지 않고 넣으면 화면은 못 막는다.
-- 그러면 교사 폰에 같은 알림이 줄줄이 간다.
create unique index if not exists clinic_one_pending_per_student
  on public.clinic_requests (student_id) where (status = 'pending');

-- 처리 시각은 DB 시계로 적는다. 폰 시계가 틀린 교사가 처리하면
-- 확정 순서가 뒤바뀌어 보인다.
create or replace function public.clinic_set_handled_at()
returns trigger language plpgsql as $$
begin
  if old.status = 'pending' and new.status <> 'pending' then
    new.handled_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists clinic_handled_at on public.clinic_requests;
create trigger clinic_handled_at
  before update on public.clinic_requests
  for each row execute function public.clinic_set_handled_at();


-- ── 2. 누가 처리할 수 있나 ───────────────────────────────────
-- 관리자 전원, 그리고 그 학생 반의 담당 교사.
-- 알림을 받는 사람(담당 교사 + 관리자)과 같아야 한다 — 알림은 왔는데
-- 열어 보니 처리할 수 없으면 안 된다.
create or replace function public.can_handle_clinic(p_student_id bigint)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  ) or exists (
    select 1
    from public.students s
    join public.classes  c on c.id = s.class_id
    where s.id = p_student_id and c.teacher_id = auth.uid()
  )
$$;


-- ── 3. 접근 정책 ─────────────────────────────────────────────
alter table public.clinic_requests enable row level security;

-- 읽기: 학생은 본인 신청만, 교사는 담당 반 학생 것만, 관리자는 전부
drop policy if exists clinic_select on public.clinic_requests;
create policy clinic_select on public.clinic_requests
for select to authenticated
using (
  student_id = public.my_qna_student_id()
  or public.can_handle_clinic(student_id)
);

-- 신청: 학생 본인 이름으로, 대기 상태로만.
-- 처리 칸을 채운 채로 넣으면 스스로 확정을 만들 수 있으므로 비어 있어야 한다.
drop policy if exists clinic_insert on public.clinic_requests;
create policy clinic_insert on public.clinic_requests
for insert to authenticated
with check (
  student_id = public.my_qna_student_id()
  and status = 'pending'
  and schedule_text is null
  and reject_reason is null
  and handled_by is null
  and handled_at is null
);

-- 수락·거절: 처리할 수 있는 사람만, 본인 이름으로.
-- 학생에게는 고치기 정책이 없다 → 학생은 본인 신청을 확정으로 바꿀 수 없다.
drop policy if exists clinic_update on public.clinic_requests;
create policy clinic_update on public.clinic_requests
for update to authenticated
using (public.can_handle_clinic(student_id))
with check (
  public.can_handle_clinic(student_id)
  and handled_by = auth.uid()
);

-- 지우기: 학생은 아직 처리 안 된 본인 신청만(잘못 냈을 때 취소),
-- 교사·관리자는 처리할 수 있는 신청이면 상태와 상관없이.
drop policy if exists clinic_delete on public.clinic_requests;
create policy clinic_delete on public.clinic_requests
for delete to authenticated
using (
  (student_id = public.my_qna_student_id() and status = 'pending')
  or public.can_handle_clinic(student_id)
);


-- ── 4. 확인 ──────────────────────────────────────────────────
-- 정책 4줄이 나와야 한다:
--   clinic_delete / clinic_insert / clinic_select / clinic_update
select policyname, cmd from pg_policies
where schemaname = 'public' and tablename = 'clinic_requests'
order by policyname;
