-- docs/qna-delete.sql
-- Q&A 질문 삭제를 허용한다.
--
-- Supabase → SQL Editor에 통째로 붙여넣고 실행한다. 여러 번 실행해도 안전하다.
--
-- 실행하지 않으면 화면에 삭제 버튼은 보이지만 눌러도 0건만 지워지고
-- "삭제 권한이 없습니다"가 뜬다.
--
-- 먼저 실행돼 있어야 하는 것:
--   docs/qna-category.sql   (is_qna_staff, can_see_qna_author)
--   docs/qna-private.sql    (학생 = 본인만)
--   docs/qna-images.sql     (qna_image_owner, my_qna_student_id, 사진 버킷)

-- ── 1. 학생이 본인 질문을 지울 수 있게 ───────────────────────
-- 교사·관리자는 qna_staff_write(ALL)로 이미 지울 수 있다. 학생만 빠져 있었다.
-- 잘못 찍어 올린 답안지를 선생님께 부탁해야만 지울 수 있으면 불편하다.
drop policy if exists qna_student_delete on public.qna;
create policy qna_student_delete on public.qna
for delete to authenticated
using (student_id = public.my_qna_student_id());

-- ── 2. 교사·관리자도 사진을 지울 수 있게 ─────────────────────
-- 지금 qna_img_delete는 "올린 본인만"이라, 교사가 학생 질문을 지울 때
-- 질문만 사라지고 사진은 스토리지에 남는다.
-- 볼 수 있는 학생의 사진에 한해 지울 수 있게 넓힌다.
drop policy if exists qna_img_delete on storage.objects;
create policy qna_img_delete on storage.objects
for delete to authenticated
using (
  bucket_id = 'qna-images'
  and (
    -- 올린 본인
    public.qna_image_owner(name) = public.my_qna_student_id()
    -- 또는 그 학생을 볼 수 있는 교사·관리자
    or (public.is_qna_staff() and public.can_see_qna_author(public.qna_image_owner(name)))
  )
);

-- ── 확인 ─────────────────────────────────────────────────────
-- qna에 DELETE 정책 2개가 나와야 한다: qna_staff_write(ALL) / qna_student_delete
select tablename, policyname, cmd from pg_policies
where schemaname = 'public' and tablename = 'qna'
order by policyname;
