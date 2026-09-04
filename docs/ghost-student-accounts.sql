-- docs/ghost-student-accounts.sql
-- 명부에 없는 학생 번호를 든 "유령 계정"을 찾아 정리한다.
--
-- 왜 생기나:
-- 학생을 명부에서 지우거나 엑셀로 다시 올리면 students 행이 새 번호로 바뀌는데,
-- 로그인 계정은 옛 번호를 그대로 들고 남아 있었다. 그 계정으로 로그인하면
-- 화면은 열리지만 질문 등록 같은 동작이 외래키 오류로 실패한다.
--
-- 앞으로는 학생을 지울 때 계정도 함께 지워진다(앱에서 처리). 이 파일은
-- 그 전에 이미 생긴 것들을 치우는 용도다.

-- ── 1. 확인 (먼저 이것만 실행해서 눈으로 보세요) ─────────────
select p.username, p.name, p.student_id,
       case when p.student_id is null then '학생 번호 없음'
            when s.id is null         then '명부에 없는 번호 (유령)'
            else '정상' end as 상태
from public.profiles p
left join public.students s on s.id = p.student_id
where p.role = 'student'
order by 상태, p.username;

-- ── 2. 정리 ──────────────────────────────────────────────────
-- "유령"으로 나온 계정이 정말 지워도 되는 것인지 이름으로 확인한 뒤 실행하세요.
--
-- 주의: 이 SQL은 profiles 행만 지웁니다. 로그인 계정(auth.users)은 SQL로
-- 지울 수 없어 대시보드에서 따로 지워야 합니다:
--   Authentication → Users → 해당 사용자 → Delete user
--
-- profiles만 지워도 그 계정은 로그인 후 아무 화면도 못 쓰게 되지만,
-- 아이디가 남아 있어 같은 아이디로 다시 만들 수 없습니다. 깔끔히 하려면
-- 대시보드에서 함께 지우세요.
--
-- 아래 주석을 풀고 실행합니다.

-- delete from public.profiles p
-- where p.role = 'student'
--   and p.student_id is not null
--   and not exists (select 1 from public.students s where s.id = p.student_id);

-- ── 3. 확인 ──────────────────────────────────────────────────
-- 1번을 다시 실행해서 "유령"이 사라졌는지 봅니다.
