# 과제(Homework) 파트 재설계 — 내신/정시 · 요일별 구조

- 작성일: 2026-08-09
- 상태: 설계 확정 (구현 계획 수립 대기)

## 1. 배경 & 목적

기존 과제 기능은 **반(class)별**로 하나의 과제를 출제하고, 학생이 **객관식 답을 1회 제출**해 자동 채점하는 구조다. 이를 다음과 같이 바꾼다.

- 과제는 **반 구분 없이** 출제한다. (과제 파트에 한함 — 출결/성적 등 다른 기능은 기존 반 기반 유지)
- 과제는 **내신과제 / 정시과제** 두 종류로 나뉜다(탭 구분). 한 학생이 두 종류를 **모두** 풀 수 있다.
  - **내신과제 = 학년별** (중1~고3, 6단계). 학생은 자기 학년의 내신과제를 본다.
  - **정시과제 = 정시 레벨별** (1/2/3, 3단계). 학년과 무관하게 별도 배정.
- 교사는 한 주의 **월~토 6일치 과제를 한 번에** 등록한다("주간 과제 세트").
- 학생은 **요일별로 따로** 답을 제출하고, 요일마다 "완료"가 개별적으로 쌓인다. ("월요일 다했다! 화요일 다했다!")
- 학생이 특정 요일 답을 제출하면 **즉시 채점 결과 + 해설**을 확인한다.

## 2. 핵심 결정 사항 (확정)

| 항목 | 결정 |
|------|------|
| 과제 종류 | **내신 / 정시** 2종 (화면 상단 탭) |
| 그룹 기준(내신) | **학년별** — 중1~고3 (6단계) |
| 그룹 기준(정시) | **정시 레벨별** — 1/2/3 (3단계), 학년과 무관 |
| 학생 프로필 | **학년**(grade) + **정시 레벨**(jeongsiLevel, 선택) 두 값 추가 |
| 학생 노출 | 한 학생이 **내신·정시 둘 다** 조회 가능 (정시 레벨 없으면 정시 탭에 안내) |
| 학생 제출 단위 | **요일별 개별 제출** (월 따로, 화 따로 …) |
| 답안 방식 | 기존과 동일한 **객관식 답 입력**(ChoiceGrid) |
| 교사 출제 단위 | **주간 세트(월~토 6일) 한 번에** 등록 |
| 해설 단위 | **요일별 + 문항별 둘 다** 지원 (모두 선택 사항) |
| 해설 형태 | **YouTube 영상 링크** + **파일 업로드**(Supabase Storage) |
| 해설 공개 시점 | 해당 요일 **제출 직후** |
| 마감 규칙 | 각 요일 과제의 마감 = **그 요일 날짜**. 이후 제출은 허용하되 **"지각"** 표시 |

## 3. 데이터 모델

### 3.1 학생 프로필 (신규 필드 2개)
- `profiles`(=학생) 테이블에 두 컬럼 추가:
  - `grade` int — **학년**. 1=중1 … 6=고3 (중1~고3, 6단계). 내신과제 그룹 기준.
  - `jeongsi_level` int (nullable) — **정시 레벨** 1/2/3. 정시과제 그룹 기준. 정시 안 하는 학생은 `null`.
- 학년/정시레벨의 표시 이름은 상수(`constants`)로 매핑한다. (예: `grade: {1:'중1', … 6:'고3'}`)
- **학생↔과제 매칭 규칙**:
  - 내신과제: `homework_sets.category='naesin'` 이고 `homework_sets.target === student.grade`
  - 정시과제: `homework_sets.category='jeongsi'` 이고 `homework_sets.target === student.jeongsi_level`

### 3.2 신규 테이블

```
homework_sets          -- 주간 과제 세트 (종류 + 그룹 + 주차)
  id            PK
  category      text           -- 'naesin'(내신) | 'jeongsi'(정시)
  target        int            -- 내신이면 학년(1~6), 정시면 정시레벨(1~3)
  week_start    date           -- 그 주 '월요일' 날짜 (세트 식별 기준)
  title         text           -- 예: "8월 2주차 독서 과제"
  teacher_id    uuid           -- 출제 교사
  created_at    timestamptz
  UNIQUE(category, target, week_start)  -- 한 종류·그룹의 한 주에 세트는 하나

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

모든 화면 상단에 **[내신과제] / [정시과제] 탭**이 있고, 선택한 탭에 따라 아래 흐름이 그 종류(category)로 동작한다.

### 4.1 교사 — 주간 과제 만들기
1. **종류 선택**(내신/정시) + **그룹 선택**(내신=학년 중1~고3 / 정시=레벨 1~3) + **주차 선택**(그 주 월요일 날짜)
2. 월~토 **탭**에서 각 요일마다:
   - 문항 수 입력 → 정답 입력(ChoiceGrid, 기존 재사용)
   - (선택) 요일 전체 해설: 영상 링크 / 파일 업로드
   - (선택) 문항별 해설: 특정 문항에 영상 링크 / 파일
   - 요일별로 "이 요일 비움" 허용(6일 전부 채울 필요는 없음)
3. **저장** → `homework_sets` 1개 + 채워진 요일 수만큼 `homework_days`/`homework_questions` 생성

### 4.2 교사 — 제출 현황
- 종류/그룹/주차 선택 → 요일별 "제출 n/전체 표시".
- 요일 선택 시 학생별 제출 여부·정답 수·지각 여부 확인. 학생 답안 상세 열람.

### 4.3 학생 — 과제
- 상단 [내신과제]/[정시과제] 탭 전환.
  - 내신 탭: 자기 **학년**의 이번 주(월~토) 과제.
  - 정시 탭: 자기 **정시 레벨**의 이번 주(월~토) 과제.
- 요일별 상태 뱃지: `미제출` / `제출완료` / `지각제출`.
- 요일 선택 → 객관식 답 입력 → **제출** → **채점 결과 + 해설(요일 해설 + 문항별 해설)** 즉시 확인.
- 마감(그 요일 날짜) 전에는 답 수정 가능, 마감 후 제출은 지각 표시.
- 정시 레벨 미배정 학생: 정시 탭에 "정시 레벨이 배정되지 않았습니다" 안내. (학년은 모든 학생에 있으므로 내신 탭은 항상 표시)

## 5. 권한 규칙
- **관리자/교사**: 출제·수정·삭제·현황 열람. (삭제는 관리자 또는 출제 교사)
- **학생**: 자기 학년(내신)·자기 정시 레벨(정시) 과제만 조회/제출, 제출 후 자기 해설 확인.

## 6. 순수 함수 / 재사용
- 채점: 기존 `gradeHomework(questions, answers)` 재사용.
- 지각 판정: 기존 `isLateSubmission(submittedAt, dueDate)` 재사용 (dueDate = 요일 `date`).
- 요일↔날짜 계산 유틸 신설: `week_start`(월요일) + weekday → 실제 date.
- 입력 UI: 기존 `ChoiceGrid` 재사용.

## 7. 범위 밖 (YAGNI / 후속)
- 학년/정시레벨 이름 편집 관리자 UI (MVP는 상수 매핑으로 시작)
- 매주 자동 반복 생성 (이번엔 주차 수동 선택)
- 주관식/서술형 채점
- 카카오 알림 연동

## 8. 열린 항목 (구현 계획에서 확정)
- 학생 프로필 `grade` / `jeongsi_level` 입력 UI를 학생 관리 화면에 추가하는 범위.
- 기존 `homework*` 테이블/데이터 폐기 범위.
- Supabase Storage 버킷 정책(공개/서명 URL).
- 문항별 해설 입력 UI의 구체 형태(문항 클릭 → 링크/파일 지정).
