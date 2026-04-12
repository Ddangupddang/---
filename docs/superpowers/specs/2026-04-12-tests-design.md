# 주간 테스트 시스템 설계

**날짜:** 2026-04-12  
**대상 파일:** `src/pages/Tests.jsx`, `src/data/tests.js`, `src/data/submissions.js`

---

## 개요

오프라인 시험지 배포 후 웹에서 답안만 입력하는 방식의 주간 테스트 시스템.  
교사가 테스트를 생성하고 "시작" 버튼으로 반 전체 카운트다운을 동시에 개시.  
객관식 자동 채점 + 주관식 교사 직접 채점 → 성적 저장.

---

## 데이터 구조

### src/data/tests.js

```js
{
  id: Number,
  title: String,           // 예: "4월 2주차 독서 테스트"
  classId: Number,         // 대상 반
  teacherId: Number,
  date: String,            // "2026-04-12"
  timeLimit: Number,       // 분 단위 (null이면 시간 제한 없음)
  status: 'ready' | 'active' | 'closed',
  startedAt: String | null, // 교사가 시작 버튼 누른 ISO 시각
  questions: [
    {
      id: Number,
      type: 'mc' | 'sa',       // 객관식(multiple choice) | 주관식(short answer)
      content: String,          // 문항 내용 (예: "1번")
      choices: String[] | null, // 객관식만: ["①", "②", "③", "④", "⑤"]
      answer: String | null,    // 객관식만: 정답 ("①" 등)
      points: Number,           // 배점
    }
  ]
}
```

### src/data/submissions.js

```js
{
  id: Number,
  testId: Number,
  studentId: Number,
  submittedAt: String,   // ISO 시각
  answers: [
    { questionId: Number, answer: String }
  ],
  scores: [
    { questionId: Number, score: Number }  // 채점 후 기록
  ]
}
```

---

## 화면 흐름 (Tests.jsx 내부 view 상태)

| view | 설명 | 접근 가능 역할 |
|------|------|---------------|
| `list` | 테스트 목록. 반 필터, 상태 배지, 채점 현황 | 전체 |
| `create` | 테스트 만들기. 제목/반/날짜/시간제한/문항 | 교사, 관리자 |
| `take` | 학생 응시. 카운트다운, 문항별 답 입력 | 학생 |
| `submissions` | 제출 목록. 채점 상태 확인 | 교사, 관리자 |
| `grade` | 채점 화면. 주관식만 점수 입력, 객관식 자동 | 교사, 관리자 |
| `result` | 학생 결과. 문항별 정오표, 총점 | 학생 |

---

## 역할별 주요 기능

### 관리자 / 교사
- 테스트 목록: 반 필터(관리자는 전체, 교사는 담당 반), 상태 배지(준비중/진행중/종료)
- 테스트 만들기: 제목, 반 선택, 날짜, 시간 제한(분), 문항 추가
- 문항 추가: 타입(객관식/주관식) → 내용 → 객관식이면 보기+정답 → 배점
- "시작" 버튼: status를 `active`로, `startedAt`을 현재 시각으로 변경 → 반 전체 카운트다운 시작
- "종료" 버튼: status를 `closed`로 변경 (수동 종료)
- 제출 목록 → 채점 화면: 주관식 점수 입력, 객관식 자동 채점

### 학생
- `active` 상태 테스트만 응시 가능 (본인 반 테스트만)
- 응시 화면: 카운트다운 = `startedAt + timeLimit(분) - 현재 시각`
- 시간 초과 시 자동 제출
- 제출 후 채점 완료되면 결과 확인 가능

---

## 타이머 로직

```
남은시간(초) = (startedAt을 Date로 변환 + timeLimit*60*1000) - Date.now()
```

- `timeLimit`이 null이면 타이머 없음
- 남은시간 ≤ 0이면 자동 제출 트리거
- `setInterval` 1초마다 갱신, 컴포넌트 언마운트 시 `clearInterval`

---

## 채점 규칙

- **객관식**: `submission.answers[i].answer === question.answer` 이면 `question.points`점, 아니면 0점
- **주관식**: 교사가 직접 점수 입력 (0 ~ question.points 범위)
- 총점 = 모든 문항 점수 합산
- 채점 완료 기준: 모든 문항에 score가 기록된 경우

---

## 아키텍처 결정

- **단일 파일(1안)**: Tests.jsx 하나에 view 상태로 화면 전환. 기존 Grades.jsx, Videos.jsx 패턴과 동일.
- Mock 데이터 기반, 백엔드 없이 동작 (추후 Supabase 연동 시 data 파일만 교체)
- 색상/스타일은 기존 디자인 시스템(`#2B2B2B`, `#5B8FD4`, `#C0392B`, `#F4F3EE`) 사용
