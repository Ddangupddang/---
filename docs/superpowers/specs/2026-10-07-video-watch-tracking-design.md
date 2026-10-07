# 영상 시청 추적 — 시작 알림 · 시청 위치 · 완료 알림

2026-10-07 · 브레인스토밍에서 확정

## 목적

교사가 숙제로 내준 강의 영상을 **학생이 실제로 봤는지** 확인하게 돕는다.
학생은 보던 곳부터 **이어서** 본다.

> 한계: 시청 기록은 학생 폰이 보내는 값이다. 개발자 도구를 다룰 줄 알면 꾸며 보낼 수 있다.
> 웹에서 영상 시청을 확인하는 방식은 전부 같은 한계가 있다. "막는" 기능이 아니라 "확인을 돕는" 기능이다.

## 확정한 것

| 질문 | 결정 |
|---|---|
| 시청 위치는 누가 보나 | **둘 다** — 교사는 학생별 진행, 학생은 이어보기 |
| 시작 알림은 언제 | 학생 × 영상마다 **처음 시작할 때 한 번만** |
| 완료 기준 | **실제로 재생된 구간이 영상 길이의 90% 이상**. 건너뛴 구간은 세지 않는다. 배속은 막지 않는다 |
| 교사는 어디서 보나 | 영상 화면의 **[댓글 \| 시청 현황]** 탭 (+ 목록 카드의 "완료 4/7") |
| 만드는 방식 | 진행 기록 한 줄 + DB 트리거 → 이벤트 테이블 → 웹훅 → 서버리스 알림 (Q&A 알림과 같은 틀) |

## 이번에 하지 않는 것

대시보드 · 주간 리포트 연동, 배속 감지, 영상에 기한을 두는 기능. 써 보고 필요하면 따로 한다.

---

## 1. 데이터

### `video_progress` — 학생 × 영상당 한 줄

| 열 | 타입 | 의미 |
|---|---|---|
| `id` | bigint identity PK | |
| `video_id` | bigint → `videos(id)` ON DELETE CASCADE | |
| `student_id` | bigint → `students(id)` ON DELETE CASCADE | 기록은 명부(students)에 건다 — "누구의 기록인가" 규칙 (논문 3-4절) |
| `duration_sec` | integer | 영상 길이. 플레이어가 알려준다 |
| `last_position_sec` | integer | 마지막으로 보던 위치 |
| `watched_buckets` | integer[] | 실제로 재생된 **5초 칸 번호**(0, 1, 2 …). 중복 없이 정렬 |
| `watched_sec` | integer | 칸 수 × 5, `duration_sec` 를 넘지 않게. **DB가 계산** |
| `started_at` | timestamptz default now() | |
| `completed_at` | timestamptz null | **DB가 찍는다** |
| `updated_at` | timestamptz | |

`UNIQUE (video_id, student_id)` — 학생이 저장할 때는 upsert 한다.

### 규칙은 DB 트리거가 정한다 (BEFORE INSERT/UPDATE)

1. **칸 합치기**: UPDATE 면 `NEW.watched_buckets = OLD ∪ NEW` (정렬·중복 제거). 화면은 이번 재생에서 본 칸만 보내도 된다
2. `watched_sec = least(칸 수 × 5, duration_sec)`
3. **완료 판정**: `completed_at` 이 비어 있고 `watched_sec >= 0.9 × duration_sec` 이면 `completed_at = now()`. 한 번 찍히면 바뀌지 않는다
4. `updated_at = now()`

### 저장은 DB 함수 하나로만 — 학생이 완료를 직접 넣지 못하게

> 2026-10-07 계획 단계에서 바꿈. 처음에는 열 단위 권한(GRANT INSERT/UPDATE (일부 열))으로 막으려 했다.
> 그런데 upsert 는 `ON CONFLICT DO UPDATE` 로 모든 열을 다시 쓰기 때문에 `video_id`·`student_id` 에도
> UPDATE 권한이 있어야 하고, 그러면 학생이 기록을 **다른 영상으로 옮겨** 완료를 꾸밀 틈이 생긴다.

- 학생(그리고 모든 로그인 사용자)은 `video_progress` 에 **INSERT · UPDATE · DELETE 권한이 없다**
- 저장은 `save_video_progress(p_video_id, p_duration_sec, p_position_sec, p_buckets)` 만 쓴다 (`SECURITY DEFINER`)
  - 학생 번호는 인자로 받지 않는다 — `hw_my_student_id()` 로 DB가 찾는다
  - 학생 계정이 아니면(교사·관리자) 거절한다 → 교사가 영상을 봐도 기록이 생기지 않는다
  - 그 학생이 볼 수 있는 영상(`videos.class_id` 가 비었거나 학생 반과 같다)이 아니면 거절한다
  - upsert 는 함수 안에서 하고, 위의 트리거가 칸 합치기·완료 판정을 한다
  - UPDATE 때 트리거가 `video_id`·`student_id`·`started_at`·`completed_at` 를 기존 값으로 되돌린다
- `duration_sec` 가 0 이면 완료로 보지 않는다 (메타데이터가 오기 전 저장 — 0의 90%는 0이다)

### 행 수준 보안

| 누가 | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| 학생 | `student_id = hw_my_student_id()` | ✗ (함수로만) | ✗ (함수로만) | ✗ |
| 교사 · 관리자 | `hw_is_staff()` | ✗ | ✗ | ✗ |

`USING (true)` 같은 열린 정책은 두지 않는다 — 정책은 논리합으로 결합된다 (2026-09-30 사고).

### `video_events` — 알림용 이벤트

| 열 | 의미 |
|---|---|
| `id` bigint identity PK | |
| `type` text check in (`'start'`, `'complete'`) | |
| `video_id`, `student_id` | |
| `created_at` timestamptz default now() | |

- `video_progress` AFTER INSERT → `start` 한 줄
- `video_progress` AFTER UPDATE 에서 `OLD.completed_at IS NULL AND NEW.completed_at IS NOT NULL` → `complete` 한 줄
- 트리거 함수는 `SECURITY DEFINER` 로 넣는다 (학생에겐 `video_events` 쓰기 권한이 없다)
- `video_events` 는 학생 SELECT ✗, 교사·관리자 SELECT 만

**왜 중간 테이블인가**: 기존 알림은 Supabase Database Webhook(행 INSERT 시 HTTP 호출)으로 보낸다.
"완료로 **바뀐 순간**"은 INSERT 가 아니어서 웹훅으로 직접 못 고른다. 이벤트 테이블에 INSERT 로 바꿔 주면
기존 틀을 그대로 쓰고, 알림이 언제 나갔는지 기록도 남는다.

## 2. 화면

### 학생

- 영상을 열 때 자기 `video_progress` 를 읽는다
  - `last_position_sec ≥ 10` 이고 완료 전이면 플레이어 위에: **"지난번 12:30까지 봤어요 [이어보기]"**
  - 이어보기 → 그 위치로 이동해 재생. 누르지 않으면 처음부터
- 제목 아래: **"실제 시청 18:20 / 25:00 (73%)"**, 완료면 **"✓ 시청 완료"**
- 목록 카드: `✓ 완료` / `73%` / (안 봤으면 표시 없음)

### 재생 추적 (학생만 — 교사·관리자가 보는 건 기록하지 않는다)

- 지금의 `<iframe>` 을 **YouTube IFrame Player API** 로 바꾼다 (`https://www.youtube.com/iframe_api`)
- 재생 중 1초마다 `getCurrentTime()` 을 본다. 직전 값과의 차이가 **0 초과 3초 이하**면 자연스러운 재생으로 보고
  그 구간의 5초 칸을 "봤다"에 넣는다. 그보다 크거나 뒤로 가면(건너뛰기·되감기) 칸을 넣지 않는다
  - 3초는 2배속 + 타이머 지연을 감안한 값이다
- 저장(upsert): **10초마다**, 그리고 일시정지 · 영상 끝 · `visibilitychange` hidden · 목록으로 돌아갈 때
- 저장 실패는 다음 저장 때 다시 보낸다 (칸은 합쳐지므로 중복 전송이 안전하다). 학생에게 오류 창은 띄우지 않는다

### 교사 · 관리자

- 영상 화면 오른쪽(폰은 아래) 칸을 **[댓글 | 시청 현황]** 탭으로
- 시청 현황
  - 요약: **"완료 4 · 보는 중 2 · 안 봄 1 (7명)"**
  - 그 영상 반(`videos.class_id`) 학생 전원 (`class_id` 가 비어 있으면 교사가 볼 수 있는 반의 학생 전원). **안 봄 → 보는 중 → 완료** 순
  - 안 봄 = 진행 기록 없음 / 보는 중 = 기록 있고 `completed_at` 없음 / 완료 = `completed_at` 있음
  - 안 봄 / `12:30까지 · 실제 시청 48%` / `✓ 완료 10/07`
- 목록 카드: **"완료 4/7"**
- 데이터는 **그 영상을 열 때만** 그 영상의 진행 기록을 읽는다 — 전역 데이터 컨텍스트에 넣지 않는다
  (전역 컨텍스트가 모든 표를 다 읽는 문제를 키우지 않기 위해. 논문 6-2 (4))
  - 목록 카드의 "완료 4/7"은 화면에 보이는 영상들의 진행 기록을 한 번에 읽는다

모든 화면은 390px 에서 직접 찍어 확인한다.

## 3. 알림

### `api/notify-video.js` (서버리스 10 → **11개**, 상한 12)

- 틀은 `api/notify-qna.js` 와 같다: 웹훅 비밀값 확인 → 대상 찾기 → `web-push` 발송 → 죽은 구독(404/410) 정리
- 비밀값은 기존 `QNA_WEBHOOK_SECRET` 을 함께 쓴다 (환경변수를 늘리지 않는다)
- 순수 함수로 뺀다 (테스트 대상)
  - `videoNotifyTargets(student, classes, admins)` → 학생 반 담당 교사 + 관리자 전원, 중복 제거
  - `videoNotification(type, student, video)` → `{ title: '영상 시청 시작' | '영상 시청 완료', body: '김하은 · 현대시 개념 정리 1강', url: '/videos' }`
- 잠금화면에 뜨므로 진행률 같은 세부는 넣지 않는다
- `api/` 에서 부르는 파일은 import 에 `.js` 를 붙인다

## 4. 테스트

| 무엇 | 어떻게 |
|---|---|
| 재생 판정 (자연 재생은 세고, 건너뛰기·되감기는 안 센다) · 칸 계산 · 시간 표시 `12:30` | 순수 함수 단위 테스트 |
| 알림 대상 · 문구 | 순수 함수 단위 테스트 |
| 이어보기 줄 · 진행 표시 · 시청 현황 정렬과 요약 | 컴포넌트 테스트 (jsdom) |
| 학생이 표에 직접 못 쓴다 · 남의 줄을 못 읽는다 · 교사는 저장 함수가 거절 · 90%에서 완료 · 길이 0은 완료 아님 · 칸 누적 · 이벤트 행 생성 | **DB 검증 SQL** — 응답 코드가 아니라 **결과 행을 직접 조회**해서 판정 (RLS 로 막혀도 204 가 온다) |
| 화면 | 390px 캡처 |

## 5. 적용 순서

1. **데모 DB**(`graduate`)에 SQL 적용 → 검증 SQL. 개발도 데모에서 한다
2. 코드 → 테스트 → 390px 확인
3. **운영 DB** 에 같은 SQL — 사용자 확인 후
4. 배포 — 사용자 확인 후. `api/` 함수 수 11 확인
5. 운영 Supabase 에서 Database Webhook: `video_events` INSERT → `https://www.sumunjae.com/api/notify-video`, 헤더 `x-webhook-secret`
   - **데모 DB에는 웹훅을 걸지 않는다** — 데모가 운영 서버를 불러 원장님 폰에 가짜 알림이 간 사고(2026-09-30)
