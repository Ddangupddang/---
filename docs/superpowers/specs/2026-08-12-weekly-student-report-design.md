# 주간 학생 리포트 — 출석 · 주간테스트 · 주간과제 통합

작성일: 2026-08-12
상태: 설계 승인됨 (구현 계획 대기)

---

## 1. 배경 & 목적

교사가 한 학생의 한 주를 파악하려면 지금은 화면 세 곳을 따로 열어야 한다.
출결은 `/attendance`, 주간테스트 점수는 `/tests`, 과제 제출은 과제 화면이다.
상담 준비나 "요즘 누가 처지는가"를 볼 때마다 이 세 곳을 사람이 머릿속에서 합치고 있다.

이 리포트는 **한 반의 한 주를 한 표로** 보여줘서 그 합치는 일을 시스템이 대신하게 한다.

기존 리포트 두 종과 성격이 다르다:

| | 진도 리포트 (`Reports.jsx`) | 과제 월간 리포트 (`HomeworkReport.jsx`) | **주간 학생 리포트 (신규)** |
|---|---|---|---|
| 내용 | 교사가 손으로 쓰는 진도·과제 기록 | 과제 한 영역만 | 출석+테스트+과제 통합 |
| 기간 | 회차 | 월 | 주 |
| 묶음 | 반 | 학년/정시레벨 | 반 |
| 출처 | 수기 입력 | 자동 계산 | 자동 계산 + 교사 코멘트 |

---

## 2. 핵심 결정 사항 (확정)

1. **독자는 교사·관리자뿐.** 학부모 발송·학생 노출은 범위 밖. 학생 role은 접근 차단.
2. **기본 화면은 반 전체 표**, 학생 이름을 누르면 개인 주간 상세로 들어간다.
3. **묶음 단위는 반**(`classId`). 과제는 반이 아니라 학년/정시레벨로 배정되므로,
   학생 한 명 한 명에 대해 `matchesStudent`로 본인 세트를 찾아 계산한다.
4. **내신과제와 정시과제는 표에서부터 별도 열**로 분리한다.
5. **교사 코멘트를 학생별·주별로 저장한다.** 신규 테이블 필요.
6. **사이드바에 「주간 리포트」 새 메뉴**로 둔다. `Reports.jsx`(385줄)는 건드리지 않는다.
7. 주 범위는 기존 과제 기능과 같은 **월~토**. `mondayOf`로 주 시작을 정규화한다.

---

## 3. 계산 규칙

핵심은 순수 함수 `weeklyClassReport`다. DB·UI 의존성이 없어 단위 테스트로 전부 검증한다.

```js
weeklyClassReport({
  students, attendance, tests, testSubmissions,
  homeworkSets, homeworkDays, homeworkQuestions, homeworkSubmissions,
  classId, weekStart,
})
// →
{
  weekStart,
  dates: ['2026-08-10', ... , '2026-08-15'],   // 월~토
  rows: [{
    student,
    attendance: { present, late, absent, counted, rate } | null,
    tests: [{ test, score, total, state }],       // state: 'graded'|'grading'|'absent'
    testSummary: { average, count } | null,
    naesin:  { submitted, total, submitRate, correctRate } | null,
    jeongsi: { submitted, total, submitRate, correctRate } | null,
    flags: ['absence'|'testAbsent'|'lowHomework'],
  }],
}
```

### 3.1 출석

- 대상: 그 주(월~토) 그 학생의 `attendance` 레코드
- `present`/`late`/`absent`를 각각 센다. `counted` = 세 값의 합
- `rate` = `(present + late) / counted` (백분율 반올림)
- 화면 표기: `(present+late) / counted`, 지각·결석이 있으면 뒤에 `지1`·`결2`
- **지각은 출석으로 센다.** 왔다는 사실이 분자에 들어가되, 별기해서 감춰지지 않게 한다
- 레코드가 하나도 없으면 `null` → 화면에 `-`

> **가정 (열린 항목):** 분모는 "그 주에 남아 있는 출결 기록 수"다.
> 수업일인데 아무 기록도 남기지 않은 날은 분모에서 빠진다.
> 학원 수업일이 고정이라면 이 방식은 무단결석을 놓칠 수 있다.
> 운영해 보고 문제가 되면 반별 수업요일을 따로 두는 방식으로 바꾼다.
> 바꿀 지점은 `weeklyReport.js`의 출석 계산 한 곳뿐이다.

### 3.2 주간테스트

- 대상: `tests` 중 `classId`가 같고 `date`가 그 주 범위 안인 것
- 학생 점수: `testSubmissions`에서 그 학생 제출을 찾아 `scores` 합 / `questions[].points` 합
- 상태(`state`)
  - `absent` — 제출 자체가 없음 → `미응시`
  - `grading` — 제출은 있으나 `scores`가 비었음 → `채점중` (주관식 채점 대기)
  - `graded` — 채점 완료 → 점수 표시
- 그 주 시험이 2개 이상이면 표에는 **채점 완료된 것들의 평균 + `(2건)`**, 개인 상세에는 전부 나열
- 그 주 시험이 없으면 `testSummary`는 `null` → `-`
- 시험은 있으나 채점 완료된 게 하나도 없으면 `testSummary.average`는 `null`,
  `count`는 시험 수 → 화면에는 `채점중 (2건)`처럼 상태만 보여준다 (0점으로 오해되면 안 된다)

### 3.3 과제 (내신 / 정시 각각)

- 그 학생에게 배정된 세트: `homeworkSets` 중 `weekStart` 일치 + `category` 일치 + `matchesStudent(set, student)`
- 그 세트의 `homeworkDays`가 분모, 제출한 요일 수가 분자
- 정답률은 기존 `gradeHomework`로 계산하되 **낸 회차의 문항만 분모**로 삼는다
  — 안 낸 회차까지 넣으면 성실도와 실력이 섞여 어느 쪽이 문제인지 알 수 없다
  (기존 `homeworkPeriodReport`와 같은 규칙)
- 배정된 세트가 없으면 `null` → `-`

### 3.4 경고(⚠)와 정렬

`flags`에 담는다:

| flag | 조건 |
|---|---|
| `absence` | 그 주 결석 1회 이상 |
| `testAbsent` | 그 주 시험이 있는데 미응시 |
| `lowHomework` | 내신 또는 정시 제출률이 70% 미만 |

70%는 기존 `homeworkReport.js`의 `LOW_SUBMISSION` 상수를 공용으로 옮겨 재사용한다.

정렬: **flags 많은 학생이 위로**, 같으면 이름 가나다순. 문제 있는 학생이 먼저 보이게 한다.

---

## 4. 데이터 모델 (신규)

```sql
-- 주간 리포트에 교사가 남기는 학생별 코멘트
create table if not exists weekly_report_notes (
  id         bigint generated always as identity primary key,
  student_id bigint references students(id) on delete cascade,
  week_start date not null,                 -- 그 주 월요일
  content    text not null default '',
  updated_at timestamptz not null default now(),
  updated_by uuid,
  unique (student_id, week_start)
);
```

- `docs/weekly-report-notes.sql`로 남긴다 (기존 `homework-tables.sql`과 같은 방식)
- `DataContext`에 `weeklyNotes` state + `upsertWeeklyNote({ studentId, weekStart, content })` 추가
- 기존 `upsertAttendance`와 같은 모양: 실패 시 `null` 반환, 성공 시 로컬 state 갱신

---

## 5. 화면 흐름

```
/weekly-report
  ├─ 헤더: [◀] 8월 2주차 (8/10~8/15) [▶]   [수능국어A반 ▾]
  │
  ├─ 표 (WeeklyReportTable)
  │    이름 | 출석 | 테스트 | 내신과제 | 정시과제 | 📝
  │    ⚠ 있는 학생 위로 정렬
  │    이름 클릭 →
  │
  └─ 개인 상세 (WeeklyStudentDetail)
       ← 목록
       학생 이름 · 8월 2주차
       출석    월○ 화○ 수지각 목○ 금결석 토-
       테스트  문학 72/100 · 독서 미응시
       과제    내신 5/5 (정답률 92%) · 정시 3/5 (정답률 80%)
       ─────────────────────────────
       교사 코멘트 [                    ] [저장]
```

- 기본 주는 오늘이 속한 주. `◀ ▶`로 이전/다음 주 이동
- 반 목록은 기존 `classes`를 그대로 쓴다 (관리자는 전체, 교사는 본인 반 — 기존 페이지들의 권한 처리를 따른다)

---

## 6. 파일 구성

| 파일 | 상태 | 역할 |
|---|---|---|
| `src/utils/weeklyReport.js` | 신규 | 계산 전부 (순수 함수) |
| `src/utils/weeklyReport.test.js` | 신규 | 계산 단위 테스트 |
| `src/pages/WeeklyReport.jsx` | 신규 | 반·주 선택, 표/상세 전환, 권한 차단 |
| `src/components/reports/WeeklyReportTable.jsx` | 신규 | 반 전체 표 |
| `src/components/reports/WeeklyStudentDetail.jsx` | 신규 | 개인 상세 + 코멘트 입력 |
| `docs/weekly-report-notes.sql` | 신규 | 테이블 생성 SQL |
| `src/context/DataContext.jsx` | 수정 | `weeklyNotes`, `upsertWeeklyNote` |
| `src/components/Sidebar.jsx` | 수정 | 「주간 리포트」 메뉴 |
| `src/App.jsx` | 수정 | `/weekly-report` 라우트 |
| `src/utils/homeworkReport.js` | 수정 | `LOW_SUBMISSION`을 공용 상수로 이동 |

화면 컴포넌트를 표와 상세로 나눈 이유: 각각 한 가지만 하게 두면 파일이 작게 유지되고,
표만 따로 렌더해 테스트할 수 있다. `Reports.jsx`가 385줄까지 커진 전철을 밟지 않는다.

---

## 7. 권한 · 에러 처리

- 학생 role 접근 차단 — `Reports.jsx`와 같은 문구(`접근 권한이 없습니다`)
- 그 반에 학생이 없으면: `이 반에 등록된 학생이 없습니다`
- 그 주에 출결·테스트·과제 데이터가 전혀 없으면: `이번 주 기록이 아직 없습니다`
  (빈 표를 그리면 "0점"처럼 오해된다)
- 코멘트 저장 실패 시 입력 내용을 유지하고 에러를 보여준다 — 과제 제출·세트 저장과 같은 규칙

---

## 8. 테스트 계획

**`weeklyReport.test.js` (핵심)**
- 출결 기록이 없는 학생 → `attendance`가 `null`
- 지각이 분자에 포함되고 별도로 세어진다
- 미채점 테스트 → `grading`, 미제출 → `absent`
- 그 주 시험이 2개면 채점된 것만 평균에 들어간다
- 내신만 배정된 학생 → `jeongsi`가 `null`
- 정답률은 제출한 회차의 문항만 분모로 쓴다
- 제출률 70% 경계 (69% → `lowHomework`, 70% → 아님)
- flags 많은 학생이 위로 정렬되고, 같으면 이름순

**화면 테스트 (최소)**
- 학생 role은 접근 차단 문구를 본다
- 표에서 이름을 누르면 개인 상세로 이동한다
- 코멘트 저장이 실패하면 입력 내용이 남고 에러가 보인다

---

## 9. 범위 밖 (YAGNI / 후속)

- 학부모 발송, 카카오톡 알림톡, PDF·이미지 출력
- 학생 본인 화면 노출
- 주간 스냅샷 저장 (지난 기록을 나중에 고쳐도 그때 리포트를 보존하는 기능)
- 여러 주를 걸친 추이 그래프
- 자동 계산값을 교사가 덮어쓰는 기능 (코멘트로 충분한지 먼저 써 본다)

---

## 10. 열린 항목 (구현 중 확정)

1. **출석 분모** — 3.1의 가정대로 진행. 운영 후 재검토.
2. 반 목록에서 교사에게 본인 반만 보일지, 전체 반이 보일지 — 기존 페이지들의 실제 동작을 확인해 맞춘다.
3. `weekly_report_notes`의 RLS 정책 — 기존 테이블들의 정책과 같은 수준으로 맞춘다.
