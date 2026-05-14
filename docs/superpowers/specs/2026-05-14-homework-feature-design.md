# 과제(Homework) 기능 설계

작성일: 2026-05-14

## 1. 목적

학생이 객관식 문제를 직접 풀어서 제출해야만 과제가 "클리어"되는 기능을 추가한다.
현재 진도 리포트의 "과제 수행 현황"은 교사가 수동으로 체크하는 방식인데, 이와 별개로
학생 제출 기반의 독립적인 과제 시스템을 만든다.

## 2. 핵심 결정 사항

- **과제는 항상 객관식 문제풀이만** — 텍스트 과제/혼합 없음
- **한 과제에 100문항 이상** 가능 → 빠른 입력 UX 필수
- **선지는 5지선다(①②③④⑤) 고정**
- **채점 없음** — "제출 = 클리어". 점수/등급 합산 안 함
- **정답/오답은 자동 표시** — 제출 직후 학생이 본인 정답 개수 확인 가능 (`N문항 중 M개 정답`)
- **마감일 있음** — 마감 후에도 제출 가능하되 "지각 제출"로 표시
- **마감 전까지 수정 가능** — 제출 후에도 마감 전이면 재제출 가능. 마감 후엔 잠김
- **진도 리포트는 건드리지 않음** — 독립된 새 기능

## 3. 위치 & 라우팅

- 새 페이지: `src/pages/Homework.jsx`
- 라우트: `/homework` — `App.jsx`에 추가, `allowedRoles={['admin','teacher','student']}` (페이지 내부에서 역할 분기)
- 사이드바: `src/components/Sidebar.jsx`의 "수업" 섹션에 테스트 아래 "과제" 항목 추가 (아이콘 lucide `PencilLine` 또는 유사)
- 하단탭: `src/components/BottomNav.jsx`에 "과제" 탭 추가 (현재 7개 → 8개, 폭 좁아지지만 허용 범위)

## 4. 데이터 모델 (Supabase 새 테이블 2개)

### `homework`
| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | bigint PK | |
| title | text | 과제 제목 |
| class_id | bigint | 대상 반 |
| teacher_id | uuid | 출제자 |
| due_date | date | 마감일 |
| questions | jsonb | `[{ "number": 1, "answer": "③" }, ...]` — 번호 + 정답만 |
| created_at | timestamptz | 기본값 now() |

### `homework_submissions`
| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | bigint PK | |
| homework_id | bigint | 과제 FK |
| student_id | bigint | 제출 학생 |
| answers | jsonb | `[{ "number": 1, "answer": "②" }, ...]` |
| submitted_at | timestamptz | 최초 제출 시각 (기본값 now()) |
| updated_at | timestamptz | 마지막 수정 시각 |

- `(homework_id, student_id)` 유니크 제약 → upsert로 재제출 처리
- **지각 판정**: `submitted_at::date > homework.due_date` 이면 지각 제출
- RLS 정책은 기존 `tests` / `submissions` 테이블과 동일한 패턴으로 설정

### DataContext 변경 (`src/context/DataContext.jsx`)
- 상태 추가: `homework`, `homeworkSubmissions`
- 변환 함수: `toHomework`, `toHomeworkSubmission` (snake_case → camelCase)
- 초기 로드: `load()`의 `Promise.all`에 `homework`, `homework_submissions` select 추가
- CRUD 함수:
  - `addHomework(data)` — 과제 출제
  - `deleteHomework(id)` — 과제 삭제 (제출 데이터도 함께 정리)
  - `upsertHomeworkSubmission(data)` — 학생 제출/재제출 (onConflict: `homework_id,student_id`)
- Provider value에 위 상태 + 함수 노출

## 5. 재사용 컴포넌트: `ChoiceGrid`

`src/components/ChoiceGrid.jsx` — ①②③④⑤ 선택을 격자로 처리하는 공용 컴포넌트.

- **mode**: `'input'` (입력 가능) | `'result'` (결과 표시, 읽기 전용)
- **props**: `count`(문항 수), `values`(현재 선택 배열), `onChange(number, choice)`, `answerKey`(result 모드에서 정답 비교용, 선택)
- **키보드 입력**:
  - 격자에 "현재 포커스된 칸" 하이라이트
  - `1`~`5` 키 → 해당 칸 선택 + 자동으로 다음 칸으로 이동
  - 화살표키(←→↑↓) → 칸 이동
  - 클릭/터치로도 직접 선택 가능 (키보드와 병행)
- **반응형**: 데스크탑은 한 줄에 여러 문항, 모바일은 좁게 — 100문항도 스크롤로 처리
- 나중에 `Tests.jsx`에서도 재사용할 수 있도록 과제에 의존하지 않는 순수 컴포넌트로 작성

## 6. 교사 흐름 (Homework.jsx 내 뷰)

### list 뷰
- 과제 카드 목록: 제목, 반, 마감일, `제출 n / 총원` 표시
- "+ 과제 만들기" 버튼
- 반 필터 탭 (테스트와 동일 패턴)
- 카드 클릭 → submissions 뷰
- 삭제 버튼 (테스트와 동일 패턴, 본인 출제 or admin)

### create 뷰
- 입력: 제목 / 대상 반 / 마감일 / **문항 수**
- 문항 수 입력 시 → 그 수만큼 정답표 격자(`ChoiceGrid` input 모드) 생성
- 교사가 키보드 숫자 또는 클릭으로 각 문항 정답 입력
- 저장 → `addHomework`

### submissions 뷰
- 제출한 학생 목록 — 이름 + 제출 시각, 마감 후 제출이면 "🔴 지각" 배지
- 미제출 학생 목록 별도 표시
- 학생 클릭 → detail 뷰 (그 학생 답안 vs 정답 비교, `ChoiceGrid` result 모드)

## 7. 학생 흐름 (Homework.jsx 내 뷰)

### list 뷰
- 본인 반 과제만 표시
- 상태 배지: `미제출` / `제출완료` / `지각제출`
- 마감일 표시

### take 뷰
- `ChoiceGrid` input 모드 — 1번~N번 답안 입력 (터치/클릭 위주, 키보드도 지원)
- 제출 버튼 → `upsertHomeworkSubmission`
- 이미 제출했고 마감 전이면 → 기존 답 불러와서 수정 후 재제출 가능
- 마감 후 + 미제출 → 지각 제출 1회 가능
- 마감 후 + 제출완료 → 잠김 (수정 불가)

### result 뷰
- `ChoiceGrid` result 모드 — 본인 답안에 정답/오답 표시
- 상단에 `N문항 중 M개 정답` (점수 합산 없음)

## 8. 작업이 아닌 것 (사용자 직접 수행)

- Supabase 대시보드에서 `homework` / `homework_submissions` 테이블 생성
  → 구현 시 복사용 SQL 스크립트를 별도 제공

## 9. 범위 밖 (이번 작업 제외)

- 테스트(`Tests.jsx`)의 출제 화면을 격자 입력으로 바꾸는 작업 — 과제 완성 후 별도 진행.
  단 `ChoiceGrid`는 그때 재사용 가능하도록 설계.
- 진도 리포트 수정
- 과제 점수화/등급화
