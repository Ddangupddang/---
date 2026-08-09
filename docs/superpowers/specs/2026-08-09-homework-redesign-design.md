# 과제(Homework) 파트 재설계 — 요일별 · 레벨별 구조

- 작성일: 2026-08-09
- 상태: 설계 확정 (구현 계획 수립 대기)

## 1. 배경 & 목적

기존 과제 기능은 **반(class)별**로 하나의 과제를 출제하고, 학생이 **객관식 답을 1회 제출**해 자동 채점하는 구조다. 이를 다음과 같이 바꾼다.

- 과제는 **반 구분 없이 레벨(level) 단위**로 출제한다. (과제 파트에 한함 — 출결/성적 등 다른 기능은 기존 반 기반 유지)
- 교사는 한 주의 **월~토 6일치 과제를 한 번에** 등록한다("주간 과제 세트").
- 학생은 **요일별로 따로** 답을 제출하고, 요일마다 "완료"가 개별적으로 쌓인다. ("월요일 다했다! 화요일 다했다!")
- 학생이 특정 요일 답을 제출하면 **즉시 채점 결과 + 해설**을 확인한다.

## 2. 핵심 결정 사항 (확정)

| 항목 | 결정 |
|------|------|
| 그룹 기준 | 레벨(반 아님), **3단계** (`1레벨 / 2레벨 / 3레벨`, 관리자가 이름 편집 가능) |
| 학생↔레벨 연결 | 학생 프로필에 `level` 필드 1개 지정 |
| 학생 제출 단위 | **요일별 개별 제출** (월 따로, 화 따로 …) |
| 답안 방식 | 기존과 동일한 **객관식 답 입력**(ChoiceGrid) |
| 교사 출제 단위 | **주간 세트(월~토 6일) 한 번에** 등록 |
| 해설 단위 | **요일별 + 문항별 둘 다** 지원 (모두 선택 사항) |
| 해설 형태 | **YouTube 영상 링크** + **파일 업로드**(Supabase Storage) |
| 해설 공개 시점 | 해당 요일 **제출 직후** |
| 마감 규칙 | 각 요일 과제의 마감 = **그 요일 날짜**. 이후 제출은 허용하되 **"지각"** 표시 |

## 3. 데이터 모델

### 3.1 학생 레벨
- `profiles`(=학생) 테이블에 `level` 컬럼 추가 (nullable 정수 또는 문자열 코드).
- 레벨 목록은 관리자 편집 대상. 초기값 3단계.
  - 단순화를 위해 레벨은 **정수 1/2/3**로 저장하고, 표시 이름은 별도 설정(`level_labels`)에서 매핑한다.
  - MVP에서는 표시 이름을 상수(`constants`)로 두고, "관리자 편집 UI"는 후속 작업으로 남길 수 있다. (구현 계획에서 범위 확정)

### 3.2 신규 테이블

```
homework_sets          -- 주간 과제 세트 (레벨 + 주차)
  id            PK
  level         int            -- 1 | 2 | 3
  week_start    date           -- 그 주 '월요일' 날짜 (세트 식별 기준)
  title         text           -- 예: "8월 2주차 독서 과제"
  teacher_id    uuid           -- 출제 교사
  created_at    timestamptz
  UNIQUE(level, week_start)    -- 한 레벨의 한 주에 세트는 하나

homework_days          -- 요일별 과제 (세트당 최대 6개: 월~토)
  id                    PK
  set_id                FK -> homework_sets
  weekday               int   -- 1=월 … 6=토
  date                  date  -- week_start 기준으로 계산된 실제 날짜 (= 마감일)
  question_count        int
  day_solution_video_url text  -- 요일 전체 해설 영상(선택)
  day_solution_file_url  text  -- 요일 전체 해설 파일(선택)
  UNIQUE(set_id, weekday)

homework_questions     -- 문항별 정답 + (선택) 문항 해설
  id                    PK
  day_id                FK -> homework_days
  number                int
  answer                text   -- 정답 (예: '③')
  solution_video_url    text   -- 문항별 해설 영상(선택)
  solution_file_url     text   -- 문항별 해설 파일(선택)
  UNIQUE(day_id, number)

homework_submissions   -- 요일별 제출 (학생 × 요일)
  id            PK
  day_id        FK -> homework_days
  student_id    (학생 식별자)
  answers       jsonb   -- [{ number, answer }]
  submitted_at  timestamptz
  UNIQUE(day_id, student_id)
```

- **해설 파일**: Supabase Storage 버킷(예: `homework-solutions`)에 업로드하고 URL만 테이블에 저장.
- **영상**: YouTube 링크 문자열 저장 → 앱 내 임베드 재생(기존 영상 관리 방식 재사용).

### 3.3 기존 구조 처리
- 기존 `homework` / `homework_submissions` 테이블은 위 신규 구조로 **교체(마이그레이션)**.
- `DataContext`의 `homework`, `homeworkSubmissions`, `addHomework`, `deleteHomework`, `upsertHomeworkSubmission`를 신규 모델에 맞게 재작성.
- 기존 데이터 이관은 불필요(개발 단계). 구현 계획에서 "기존 테이블/데이터 폐기" 여부 확정.

## 4. 화면 흐름

### 4.1 교사 — 주간 과제 만들기
1. **레벨 선택**(1/2/3) + **주차 선택**(그 주 월요일 날짜)
2. 월~토 **탭**에서 각 요일마다:
   - 문항 수 입력 → 정답 입력(ChoiceGrid, 기존 재사용)
   - (선택) 요일 전체 해설: 영상 링크 / 파일 업로드
   - (선택) 문항별 해설: 특정 문항에 영상 링크 / 파일
   - 요일별로 "이 요일 비움" 허용(6일 전부 채울 필요는 없음)
3. **저장** → `homework_sets` 1개 + 채워진 요일 수만큼 `homework_days`/`homework_questions` 생성

### 4.2 교사 — 제출 현황
- 레벨/주차 선택 → 요일별 "제출 n/전체 표시".
- 요일 선택 시 학생별 제출 여부·정답 수·지각 여부 확인. 학생 답안 상세 열람.

### 4.3 학생 — 과제
- 자기 **레벨의 이번 주(월~토)** 목록 표시.
- 요일별 상태 뱃지: `미제출` / `제출완료` / `지각제출`.
- 요일 선택 → 객관식 답 입력 → **제출** → **채점 결과 + 해설(요일 해설 + 문항별 해설)** 즉시 확인.
- 마감(그 요일 날짜) 전에는 답 수정 가능, 마감 후 제출은 지각 표시.
- 레벨 미배정 학생: "레벨이 배정되지 않았습니다" 안내.

## 5. 권한 규칙
- **관리자/교사**: 출제·수정·삭제·현황 열람. (삭제는 관리자 또는 출제 교사)
- **학생**: 자기 레벨 과제만 조회/제출, 제출 후 자기 해설 확인.

## 6. 순수 함수 / 재사용
- 채점: 기존 `gradeHomework(questions, answers)` 재사용.
- 지각 판정: 기존 `isLateSubmission(submittedAt, dueDate)` 재사용 (dueDate = 요일 `date`).
- 요일↔날짜 계산 유틸 신설: `week_start`(월요일) + weekday → 실제 date.
- 입력 UI: 기존 `ChoiceGrid` 재사용.

## 7. 범위 밖 (YAGNI / 후속)
- 레벨 이름 편집 관리자 UI (MVP는 상수 매핑으로 시작 가능)
- 매주 자동 반복 생성 (이번엔 주차 수동 선택)
- 주관식/서술형 채점
- 카카오 알림 연동

## 8. 열린 항목 (구현 계획에서 확정)
- `level` 저장 타입(정수 vs 코드) 및 레벨 이름 매핑 위치(상수 vs DB).
- 기존 `homework*` 테이블/데이터 폐기 범위.
- Supabase Storage 버킷 정책(공개/서명 URL).
- 문항별 해설 입력 UI의 구체 형태(문항 클릭 → 링크/파일 지정).
