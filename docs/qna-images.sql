-- docs/qna-images.sql
-- Q&A 질문에 사진을 붙일 수 있게 한다 (한 질문에 최대 3장).
--
-- Supabase → SQL Editor에 통째로 붙여넣고 실행한다. 여러 번 실행해도 안전하다.
--
-- 실행 순서: docs/qna-private.sql을 먼저 실행하고 이 파일을 실행한다.
-- 순서를 바꾸면 사진이 잠시 같은 반 학생 전체에게 보이는 구간이 생긴다.
--
-- 실행하지 않으면 사진을 고를 수는 있어도 등록이 실패한다.

-- ── 1. 사진 경로를 담을 칸 ───────────────────────────────────
-- 공개 URL이 아니라 스토리지 경로("7/a1b2c3.jpg")를 담는다.
-- 버킷이 비공개라 주소가 고정돼 있지 않고, 볼 때마다 임시 주소를 새로 만든다.
alter table public.qna add column if not exists image_paths jsonb not null default '[]'::jsonb;

-- 사진을 붙이기 전에 쌓인 질문은 빈 배열로 채운다
update public.qna set image_paths = '[]'::jsonb where image_paths is null;

-- ── 2. 사진 저장소 ───────────────────────────────────────────
-- public = false 가 핵심이다. 질문 자체는 본인·담당 교사만 보는데
-- 사진만 주소를 아는 사람 아무나 볼 수 있으면 앞문 잠그고 뒷문 여는 꼴이다.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'qna-images', 'qna-images', false,
  20971520,  -- 20MB. 앱이 올리기 전에 줄이지만, 축소가 실패하면 원본이 올라온다.
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do update set
  public             = false,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ── 3. 사진 주인 판단 ────────────────────────────────────────
-- 경로의 첫 폴더가 학생 id다: "7/a1b2c3.jpg" → 7
-- 숫자가 아니면 null을 돌려준다. 아래 정책이 형변환 오류로 통째로 터지는 걸 막는다.
create or replace function public.qna_image_owner(p_name text)
returns bigint language sql stable set search_path = public as $$
  select case
    when (storage.foldername(p_name))[1] ~ '^\d+$'
    then ((storage.foldername(p_name))[1])::bigint
  end
$$;

-- 로그인한 사람의 student_id. qna-policy-cleanup.sql에도 있지만
-- 그 파일을 실행했는지와 무관하게 동작하도록 여기서도 만든다.
create or replace function public.my_qna_student_id()
returns bigint language sql stable security definer set search_path = public as $$
  select student_id from public.profiles where id = auth.uid()
$$;

-- ── 4. 저장소 정책 ───────────────────────────────────────────
-- 읽기: 그 사진을 올린 학생의 질문을 볼 수 있는 사람만
--   (can_see_qna_author = 본인 / 담당 교사 / 관리자 — qna-private.sql에서 정한 규칙)
drop policy if exists qna_img_read on storage.objects;
create policy qna_img_read on storage.objects
for select to authenticated
using (
  bucket_id = 'qna-images'
  and public.can_see_qna_author(public.qna_image_owner(name))
);

-- 쓰기: 학생은 본인 번호 폴더에만 올린다
drop policy if exists qna_img_write on storage.objects;
create policy qna_img_write on storage.objects
for insert to authenticated
with check (
  bucket_id = 'qna-images'
  and public.qna_image_owner(name) = public.my_qna_student_id()
);

-- 지우기: 본인이 올린 사진만
drop policy if exists qna_img_delete on storage.objects;
create policy qna_img_delete on storage.objects
for delete to authenticated
using (
  bucket_id = 'qna-images'
  and public.qna_image_owner(name) = public.my_qna_student_id()
);

-- ── 확인 ─────────────────────────────────────────────────────
-- public이 false로 나와야 한다
select id, public, file_size_limit from storage.buckets where id = 'qna-images';

-- 3줄이 나와야 한다: qna_img_delete / qna_img_read / qna_img_write
select policyname, cmd from pg_policies
where schemaname = 'storage' and tablename = 'objects' and policyname like 'qna_img%'
order by policyname;
