# 학생 계정 일괄 자동 생성 — 설계 문서

- 작성일: 2026-07-09
- 상태: 설계 확정(구현 계획 작성 대기)

## 1. 목표

지금은 교사가 학생마다 "계정 생성" 모달에서 **아이디와 초기 비밀번호를 직접 입력**한다.
이를 개선하여, **계정이 없는 학생들의 로그인 계정을 규칙에 따라 한 번에 자동 생성**한다.

- 아이디는 `이름 + 전화 뒤 4자리`로 자동 생성 (한글 그대로, 예: `홍길동5678`)
- 초기 비밀번호는 공통 기본값, 첫 로그인 시 변경 유도
- **일괄 생성만** 지원 (단건 수동 생성은 기존 흐름 유지)

## 2. 결정 사항 요약

| 항목 | 결정 |
|------|------|
| 아이디 형식 | `이름 + 전화뒤4자리` (한글, 예: `홍길동5678`) |
| 인증 이메일 | 아이디에서 규칙적으로 계산되는 ASCII 값 + `@soomoonjae.com` |
| 전화번호 기준 | 학생 본인 → 없으면 학부모 → 둘 다 없으면 건너뜀 |
| 충돌 처리 | 동명이인 + 같은 뒷4자리 → `-2`, `-3` 접미사 |
| 생성 방식 | 계정 없는 학생 일괄 생성 + 결과 리포트 |
| 초기 비밀번호 | `123456` (상수 `DEFAULT_STUDENT_PASSWORD`, 첫 로그인 변경) |
| 로그인 | 공유 유틸 `loginEmail()`로 소폭 수정, 기존 계정 하위호환 |

## 3. 아이디 & 인증 이메일 규칙 (핵심)

### 문제
현재 로그인은 아이디를 `아이디@soomoonjae.com` 이메일로 변환해 Supabase 인증을 한다.
이메일 로컬파트(@ 앞부분)에 **한글이 들어가면 Supabase가 거부**할 가능성이 높다.
따라서 화면 아이디(한글)와 인증 이메일(ASCII)을 **분리**한다.

### 규칙: `loginEmail(username)`
```js
// src/utils/loginEmail.js
// 아이디 → Supabase 인증용 이메일. 생성/로그인 양쪽에서 동일하게 사용.
export function loginEmail(username) {
  const asciiSafe = /^[a-zA-Z0-9._-]+$/.test(username)
  // 한글 등 비ASCII 아이디는 UTF-8 바이트를 16진수로 인코딩 → 항상 ASCII
  const local = asciiSafe
    ? username
    : Array.from(new TextEncoder().encode(username))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')
  return `${local}@soomoonjae.com`
}
```

- **결정적(deterministic)**: 같은 아이디는 항상 같은 이메일 → 로그인 시 DB 조회 없이 재계산 가능
- **하위호환**: 기존 ASCII 아이디(수동 입력분)는 `asciiSafe` 경로라 `아이디@soomoonjae.com` 그대로 → 기존 계정 로그인 안 깨짐
- **길이**: 한글 3자 + 숫자 4자 ≈ 26 hex 문자 → 이메일 로컬파트 64자 제한 이내
- `TextEncoder`는 브라우저와 최신 Node 양쪽에서 사용 가능 → 프론트/백엔드 공유

### 저장 형태
- `profiles.username` = 한글 아이디 (`홍길동5678`) — 화면 표시·학생이 타이핑하는 값
- Supabase Auth email = `loginEmail(username)` — 숨김(학생은 볼 일 없음)

## 4. 데이터 모델 — "계정 없는 학생" 판별

### 현재 한계
- `DataContext`는 **교사/관리자 프로필만**(`staffProfiles`) 로드한다.
- 학생 계정 목록은 로드하지 않아, 앱이 학생별 계정 유무를 모른다.
- `계정` 컬럼은 유무와 무관하게 항상 "계정 생성" 버튼만 표시한다.

### 변경
- `DataContext`에 **학생 계정 목록** 로드 추가:
  ```js
  supabase.from('profiles').select('student_id').eq('role', 'student')
  ```
  → `studentAccountIds` (계정이 있는 student_id의 Set)로 노출.
- "계정 없는 학생" = `students` 중 `studentAccountIds`에 없는 학생.
- (덤) `계정` 컬럼에서 유무를 실제로 표시할 수 있게 됨 — 있으면 "완료" 뱃지, 없으면 "계정 생성" 버튼.

### 의존성 / 확인 필요
- **RLS**: 관리자/교사가 `role='student'` 프로필을 SELECT할 수 있어야 한다. (기존 staff 프로필 조회는 되므로 정책 확인 필요)

## 5. 일괄 생성 흐름 & UI

1. 학생 관리 화면에 **"계정 일괄 생성"** 버튼 추가 (관리자/교사).
2. 클릭 → 모달에서 **계정 없는 학생 목록**과 각자 생성될 아이디를 **미리보기**로 표시.
   - 각 행: 이름 / 반 / 생성될 아이디 / 상태(정상·건너뜀 사유)
   - 전화번호 없어 건너뛸 학생은 미리 "전화번호 없음"으로 표시.
3. "생성" 확인 → 학생마다 순차로 기존 `/api/create-student-account` 호출.
   - body: `username`(자동), `password`(`123456`), `name`, `classId`, `studentId`
   - 순차 처리(수십 명 수준이므로 충분). 진행률 표시.
4. 완료 후 **결과 리포트**: 성공 N명 / 건너뜀·실패 M명(사유별) 목록.
5. 완료 시 `DataContext`의 학생 계정 목록 갱신 → 목록·계정 컬럼 즉시 반영.

### API 변경
- `api/create-student-account.js`의 이메일 생성부를 `loginEmail(username)`으로 교체
  (현재 `${username}@soomoonjae.com` 하드코딩 → 한글 아이디 대응).
- 그 외 로직(권한 확인, 중복 확인, 롤백)은 그대로 재사용.

## 6. 예외 처리 규칙

| 상황 | 처리 |
|------|------|
| 학생 본인 전화 있음 | 본인 전화 뒤 4자리 사용 |
| 본인 전화 없음, 학부모 전화 있음 | 학부모 전화 뒤 4자리 사용 |
| 본인·학부모 전화 모두 없음 | **건너뜀**, 리포트에 "전화번호 없음" |
| 동명이인 + 같은 뒷4자리 | 아이디 뒤에 `-2`, `-3` … 접미사로 유일화 |
| 이미 계정 있는 학생 | 대상 목록에서 제외 |
| API가 "이미 사용 중" 반환 | 해당 학생만 실패 처리, 나머지 계속 진행 |

- 아이디 유일성은 **기존 계정(profiles.username) + 이번 배치 내부** 둘 다에 대해 검사.
- 인증 이메일은 최종 유일 아이디에서 파생되므로 이메일도 자동 유일.

## 7. 로그인 변경 (하위호환)

- `AuthContext.login(username, password)`:
  - `const email = loginEmail(username)` 로 변경 (기존 `${username}@soomoonjae.com` 대체).
- `changePassword`의 임시 클라이언트 로그인도 동일 유틸 적용.
- 기존 ASCII 아이디 계정은 규칙상 이메일이 동일하게 계산되어 **로그인 정상 유지**.

## 8. 변경/추가 파일 목록

- **신규**
  - `src/utils/loginEmail.js` — 아이디→이메일 공유 유틸
  - `src/utils/loginEmail.test.js` — 유틸 단위 테스트
  - `src/utils/studentUsername.js` — 이름+전화4자리 아이디 생성 + 충돌 접미사
  - `src/utils/studentUsername.test.js`
  - `src/constants/` 에 `DEFAULT_STUDENT_PASSWORD = '123456'`
  - 일괄 생성 모달 컴포넌트 (예: `src/components/BulkAccountModal.jsx`)
- **수정**
  - `src/context/AuthContext.jsx` — login/changePassword 이메일 계산
  - `src/context/DataContext.jsx` — 학생 계정 목록 로드 + 노출
  - `src/pages/Students.jsx` — "계정 일괄 생성" 버튼·모달 연결, 계정 컬럼 유무 표시
  - `api/create-student-account.js` — 이메일 생성부 `loginEmail` 적용

## 9. 테스트 계획

- `loginEmail`: 한글/ASCII 아이디 → 이메일 계산, 결정성(같은 입력 같은 출력), ASCII 하위호환.
- `studentUsername`: 이름+전화4자리 규칙, 본인/학부모 전화 우선순위, 전화 없음 처리, 충돌 접미사.
- `AuthContext` 로그인 테스트: 기존 ASCII 계정 로그인 여전히 통과(회귀 방지).
- (선택) 일괄 생성 모달: 대상 필터링·미리보기·건너뜀 표시 렌더 테스트.

## 10. 범위 밖 (YAGNI)

- 단건 자동 생성 UI (일괄만 하기로 결정).
- 아이디 로마자 변환 옵션.
- 비밀번호 개별 랜덤 생성 (공통 기본값으로 결정).
