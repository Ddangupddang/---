-- docs/fix-author-columns.sql
-- 작성자 칸을 계정 id(uuid)에 맞춘다.
--
-- Supabase → SQL Editor에 통째로 붙여넣고 실행한다. 여러 번 실행해도 안전하다.
--
-- 증상: 공지를 작성해도 등록되지 않는다. 진도 리포트도 마찬가지다.
--       목록에는 지우지도 못하는 공지 3건이 남아 있다.
--
-- 원인: notices.author_id와 reports.created_by가 integer인데 앱은 uuid를 넣는다.
--       계정 id가 숫자이던 시절의 구조가 그대로 남아 있었다. 그래서 등록이
--       매번 실패했고, 표가 비어 있으니 화면에는 Mock 자료만 남아 있었다.
--       (지워지지 않던 이유도 이것이다 — DB에 없는 id를 지우려 했다.)
--
-- 나머지 7개 칸(classes.teacher_id, qna.answered_by 등)은 이미 uuid라 건드리지 않는다.

-- ── 확인 (먼저 실행해서 눈으로 보세요) ───────────────────────
-- 값이 들어 있는 행이 있으면 아래 2단계에서 작성자가 비워진다.
-- 옛 숫자 id와 계정 uuid는 대응 관계가 없어 옮길 방법이 없다.
-- 내용·날짜 등 나머지는 그대로 남는다.
select 'notices' as 표, count(*) as 전체, count(author_id)  as 작성자_있음 from public.notices
union all
select 'reports',        count(*),        count(created_by)              from public.reports;

-- ── 1. 옛 외래키 정리 ────────────────────────────────────────
-- 타입을 바꾸려면 그 칸을 물고 있는 외래키를 먼저 떼어내야 한다.
do $$
declare c record;
begin
  for c in
    select con.conname, con.conrelid::regclass::text as tbl
    from pg_constraint con
    join pg_attribute a on a.attrelid = con.conrelid and a.attnum = any(con.conkey)
    where con.contype = 'f'
      and ((con.conrelid = 'public.notices'::regclass and a.attname = 'author_id')
        or (con.conrelid = 'public.reports'::regclass and a.attname = 'created_by'))
  loop
    execute format('alter table %s drop constraint %I', c.tbl, c.conname);
  end loop;
end $$;

-- ── 2. 타입 교체 ─────────────────────────────────────────────
-- using null: 옛 숫자 값은 버린다. 계정 uuid로 옮길 방법이 없다.
-- not null도 푼다 — 작성자 계정이 지워져도 공지 내용은 남아야 한다.
alter table public.notices alter column author_id  drop not null;
alter table public.notices alter column author_id  type uuid using null;

alter table public.reports alter column created_by drop not null;
alter table public.reports alter column created_by type uuid using null;

-- ── 3. 계정에 연결 ───────────────────────────────────────────
-- on delete set null: 교사 계정을 지워도 그 사람이 쓴 공지는 남고
-- 작성자만 "알 수 없음"이 된다. 공지가 함께 사라지면 안 된다.
alter table public.notices drop constraint if exists notices_author_id_fkey;
alter table public.notices
  add constraint notices_author_id_fkey foreign key (author_id)
  references public.profiles(id) on delete set null;

alter table public.reports drop constraint if exists reports_created_by_fkey;
alter table public.reports
  add constraint reports_created_by_fkey foreign key (created_by)
  references public.profiles(id) on delete set null;

-- ── 확인 ─────────────────────────────────────────────────────
-- 둘 다 uuid로 나와야 한다
select table_name, column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and (table_name, column_name) in (('notices', 'author_id'), ('reports', 'created_by'));
