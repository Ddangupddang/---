# 과제 제출 흐름 재설계

2026-09-11

세 가지 요구가 사실 한 덩어리라 함께 설계한다.

| 번호 | 요구 |
|------|------|
| 1 | 확인 → 오답 수정 → 제출. 확인은 1회, 정답은 제출 후 공개 |
| 3 | 어제 과제까지만 제출. 다시 내려면 허락이 필요 |
| 9 | 신입생에게 입학 전 지난 과제를 열어줄 수 있게 |

셋 다 "이 학생이 지금 이 과제에 손댈 수 있는가"라는 한 가지 규칙을 건드린다.
따로 만들면 같은 코드를 세 번 고치게 된다.

---

## 지금 어떻게 되어 있나

- 학생은 답을 다 채우면 **한 번에 제출**한다. 제출하면 끝이고 고칠 수 없다.
- 제출 시점의 판정은 **학생 기기의 시계**로 한다
  (`StudentHomeworkView.jsx`의 `new Date().toISOString()`).
- 마감이 지나도 **제출은 된다**. 지각으로 표시될 뿐이다.
- 학생 화면은 **이번 주 과제만** 보여준다.
- 교사는 **제출 취소**로 답안을 지워 다시 풀게 할 수 있다.

---

## 정한 것

| 질문 | 결정 |
|------|------|
| 확인을 누르면 무엇이 보이나 | **틀린 문항만 빨간 표시.** 정답은 가린다 |
| 성적·리포트 기준 | **최종 제출 점수** |
| 확인을 건너뛸 수 있나 | **건너뛸 수 있다.** 확인은 선택이다 |
| 다시 열어줄 때 기존 답안 | **지운다.** 기존 "제출 취소"를 그대로 쓴다 |

### 첫 채점 점수에 대한 메모

확인 → 수정 → 제출이면 최종 점수가 거의 전원 만점이 된다. 그래서
월간 리포트의 정답률, 주간 리포트의 점수, 제출 현황의 문항별 오답률이
사실상 평평해진다. 특히 문항별 오답률은 "반 전체가 틀린 문항"을 찾아
다음 수업에서 다시 다루려고 만든 것이라 신호가 사라진다.

이 점을 알고도 **성적은 최종 기준으로 가기로 했다.** 다만 확인 시점의
답안은 기록으로 남는다 — "확인은 1회"를 서버가 강제하려면 어차피 알아야 한다.
나중에 첫 채점 기준이 필요해지면 그때 꺼내 쓸 수 있다.

---

## 1. 확인 → 수정 → 제출

```
답 입력
  ├─ [확인하기]  ──→  틀린 문항 빨간 표시 (정답 비공개)
  │                     ↓  그 문항만 다시 고름
  │                  [제출하기]
  └─ [제출하기]   ──→  바로 제출
제출 후 → 결과 + 정답 공개 + 해설  (지금과 같다)
```

### 표를 따로 만든다

```sql
create table homework_checks (
  id         bigint generated always as identity primary key,
  day_id     bigint not null references homework_days(id) on delete cascade,
  student_id bigint not null,
  answers    jsonb  not null default '[]'::jsonb,   -- 확인을 누른 순간의 답안
  checked_at timestamptz not null default now(),
  unique (day_id, student_id)                       -- 1회 제한을 DB가 보장
);
```

**`homework_submissions_v2`에 넣지 않는 이유.** 그 표에 행이 생기면
"제출했나"를 세는 코드가 전부 오판한다. 지금 그렇게 세는 곳이 일곱 군데다
(`homeworkPending`, `homeworkSummary`, `weeklyReport`, `homeworkReport`,
`reportHomework`, `TeacherHomeworkStatus`, `StudentHomeworkView`).
표를 나누면 그 코드를 하나도 안 고쳐도 된다.

`unique (day_id, student_id)`가 "확인 1회"를 보장한다. 화면에서도 막지만
화면은 안내용이고 진짜 잠금은 DB다.

### 채점은 이미 있는 함수를 쓴다

`gradeHomework(questions, answers)`가 문항별 정답 여부를 이미 돌려준다.
확인 화면은 그 결과에서 **틀린 번호만** 쓰고 정답은 버린다.
`ChoiceGrid`에 `mode="check"`를 더한다 — `result` 모드와 달리
**정답 위치를 칠하지 않고** 틀린 칸만 테두리로 표시한다.

---

## 2. 제출 기한

**제출 가능 = 마감일 다음날까지.** 월요일 과제는 화요일 23:59까지.

### 판정을 서버로 옮긴다

지금은 학생 기기 시계로 판정한다. 두 가지 문제가 있다.

1. **폰 시간을 바꾸면 뚫린다.**
2. **UTC라서 한국시간 오전 9시 전에는 어제 날짜가 나온다.** 새벽에 내면
   마감 판정이 하루 관대해진다. 이미 있는 버그다.

그래서 **DB 정책(RLS)에서 막는다.** 학생 화면은 앱이 고쳐질 수 있지만
DB 정책은 그렇지 않다.

```
제출 허용 조건 =
    (오늘(한국시간) <= 그 요일의 date + 1일)
 또는 (그 학생·그 요일에 열림 행이 있다)
```

화면에서도 같은 판정을 보여준다 — 기한이 지난 요일은 "마감됨"으로 표시하고
제출 버튼을 내린다. 서버에서 튕기기 전에 알려주는 것이 목적이다.

> 이것이 7번(앱 시간 동기화)의 토대다. 출석 자동 지각은 별도 작업이지만
> "서버 시간을 기준으로 삼는다"는 구조가 여기서 깔린다.

---

## 3. 열어주기 — 재제출(3번)과 신입생(9번)

둘은 같은 장치다.

```sql
create table homework_reopens (
  id         bigint generated always as identity primary key,
  day_id     bigint not null references homework_days(id) on delete cascade,
  student_id bigint not null,
  opened_by  uuid,
  opened_at  timestamptz not null default now(),
  unique (day_id, student_id)
);
```

| 상황 | 교사가 하는 일 | 일어나는 일 |
|------|---------------|------------|
| **재제출 허락** (3번) | 제출 현황 → 학생 → **제출 취소** | 답안 삭제 + 열림 행 추가 |
| **신입생 지난 과제** (9번) | 제출 현황 → **지난 과제 열어주기** | 제출한 적 없는 학생에게 열림 행 추가 |

기존 "제출 취소"에 열림 행 추가를 한 줄 더하는 것이 3번의 전부다.

### 9번은 학생 화면도 손봐야 한다

지금 학생 화면은 **이번 주 세트만** 찾는다(`weekStart === thisWeek`).
신입생에게 지난 주 과제를 보여주려면 요일 목록 위에 **"열린 지난 과제"**
칸이 붙어야 한다. 열림 행이 있는 지난 요일만 모아서 보여준다.

열린 과제를 내면 마감이 한참 지났으므로 **지각제출로 표시된다.**
신입생에게는 부당한 표시라 **열어준 과제는 지각으로 세지 않는다** —
`isLateSubmission` 판정에서 열림 행이 있는 제출은 뺀다.

---

## 만드는 순서

| 단계 | 내용 | 배포 단위 |
|------|------|----------|
| 1 | 확인 → 수정 → 제출 | 단독으로 쓸 수 있다 |
| 2 | 서버 시간 기준 + 기한 제한 | 3단계의 토대 |
| 3 | 열어주기 + 학생 지난 과제 칸 | 2단계의 잠금을 여는 장치 |

단계마다 배포한다. 중간에 멈춰도 그때까지는 쓸 수 있다.

---

## 시작 전에 확인할 것

**실제 DB 정책이 저장소의 SQL과 다르다.** 정책이 겹겹이 쌓여 있고
`docs/rls-policies.sql`은 적용되지 않은 것으로 기록돼 있다.
2단계에서 `homework_submissions_v2`의 정책을 갈아끼우기 전에
**지금 걸려 있는 정책을 먼저 조회해서 확인한다.** 모르고 덮으면
지금 되는 제출이 안 되게 만들 수 있다.

---

## 손대는 파일

| 단계 | 파일 |
|------|------|
| 1 | `docs/homework-checks.sql`(신규), `src/components/ChoiceGrid.jsx`, `src/components/homework/StudentHomeworkView.jsx`, `src/context/DataContext.jsx`, `src/utils/homeworkMappers.js` |
| 2 | `docs/homework-deadline.sql`(신규), `src/utils/homeworkSelect.js`, `StudentHomeworkView.jsx` |
| 3 | `docs/homework-reopens.sql`(신규), `src/components/homework/DaySubmissionList.jsx`, `TeacherHomeworkStatus.jsx`, `StudentHomeworkView.jsx`, `src/utils/homework.js` |

`MANUAL.md`는 단계마다 갱신한다.
