# 자료가 얼마나 쌓이는지

앱은 열 때마다 모든 표를 통째로 받아온다. 지금은 수천 행이라 순식간이지만
수만 행이 되면 첫 화면이 뜨기까지 느려진다. 그때가 "필요한 것만 불러오기"로
바꿔야 할 시점이다.

언제인지 알려면 **증가 속도**를 알아야 하고, 그러려면 여러 번 재야 한다.

## 재는 방법

```sql
select 'homework_questions' as 표, count(*) as 행수 from public.homework_questions
union all select 'homework_submissions_v2', count(*) from public.homework_submissions_v2
union all select 'attendance',              count(*) from public.attendance
union all select 'grades',                  count(*) from public.grades
union all select 'qna',                     count(*) from public.qna
union all select 'qna_messages',            count(*) from public.qna_messages
order by 행수 desc;
```

저장 용량(사진)은 따로 본다.

```sql
select bucket_id, count(*) as 파일수,
       pg_size_pretty(sum((metadata->>'size')::bigint)) as 용량
from storage.objects
group by bucket_id;
```

## 기록

| 날짜 | homework_questions | 제출 | 출결 | Q&A 글 | 합계 | 사진 |
|------|-------------------|------|------|--------|------|------|
| 2026-09-09 | 1,072 | 254 | 65 | 35 | 약 1,430 | 14장 / 4.7MB |

다음에 잴 때 이 표에 한 줄 덧붙인다.

## 손봐야 할 시점

| 신호 | 할 일 |
|------|-------|
| 합계 2만 행쯤 | "필요한 것만 불러오기"로 바꿀 준비 |
| 앱 첫 화면이 눈에 띄게 느려짐 | 위와 같음 (숫자보다 이쪽이 실질 신호) |
| 콘솔에 `fetchAllRows: 50쪽에서 멈췄다` | 한 표가 5만 행을 넘었다. 즉시 손봐야 함 |
| 사진 800MB쯤 | 무료 플랜 1GB에 근접. 오래된 사진 정리 또는 유료 전환 |

## 그때 하는 일

`DataContext`가 앱을 열 때 모든 표를 받는 구조를 바꾼다.

- 과제 — 최근 몇 주만. 옛 주차는 그 쪽을 열 때 불러온다
- 출결 — 보고 있는 달만
- Q&A — 지금 쪽에 필요한 것만

화면은 이미 쪽 나누기와 접기로 "한 번에 조금씩" 보여주고 있다.
불러오는 쪽만 거기에 맞추면 된다.

## 이미 겪은 일

2026-09-09, `homework_questions`가 1,072행이 되면서 문제가 터졌다.
Supabase는 한 번에 1,000행까지만 돌려주는데 범위를 지정하지 않아
**최신 72개가 에러 없이 잘려 나갔다.**

교사에게는 방금 만든 과제의 정답이 재로그인하면 전부 풀려 보였고,
학생 화면에는 과제가 아예 뜨지 않았다. 저장은 되고 있었으므로
"저장이 안 된다"고 판단하면 원인을 못 찾는다.

`src/utils/fetchAll.js`가 여러 쪽에 나눠 받아 이 문제를 막는다.

### 뒤따라 나온 문제 (2026-09-10)

쪽으로 나눠 받는 것만으로는 부족했다. **정렬 기준이 없거나 같은 값이
여럿이면 쪽 경계에서 순서가 흔들려** 어떤 행은 두 번 오고 어떤 행은 빠진다.

과제 문항이 빠지자 학생 화면은 남은 문항만 1번부터 세어 그렸고,
제출은 실제 문항 번호로 답을 찾았다. 둘이 어긋나 **학생이 다 채우고
제출해도 답이 사라지거나 옆 번호에 붙었다.** 화면에는 아무 표시도 없이
점수만 낮게 나왔다 — 15문항 중 7개만 저장된 제출이 실제로 하나 있었다.

그래서 지금은 **모든 질의가 `id`로 끝난다.** id는 겹치지 않으므로
마지막 정렬 기준으로 두면 쪽을 나눠도 순서가 항상 같다.
새 질의를 추가할 때도 이 규칙을 지킬 것.
