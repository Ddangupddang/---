# 새 질문 알림 설정 절차

코드를 배포해도 이 다섯 가지를 하지 않으면 알림이 오지 않는다.
순서대로 한 번만 하면 된다.

## 1. VAPID 키 만들기

푸시 서비스에 "이 알림은 우리 서버가 보낸 게 맞다"고 증명하는 열쇠다.

```bash
npx web-push generate-vapid-keys
```

`Public Key`와 `Private Key`가 나온다. **Private Key는 절대 코드나 깃에 넣지 않는다.**

## 2. Vercel 환경변수 등록

Vercel → 프로젝트 → Settings → Environment Variables에서 다섯 개를 추가한다.

| 이름 | 값 |
|------|-----|
| `VAPID_PUBLIC_KEY` | 1번의 Public Key |
| `VAPID_PRIVATE_KEY` | 1번의 Private Key |
| `VITE_VAPID_PUBLIC_KEY` | 1번의 Public Key (같은 값) |
| `QNA_WEBHOOK_SECRET` | 아무 긴 임의 문자열 (`openssl rand -hex 32` 결과를 쓰면 된다) |
| `VAPID_CONTACT` | `mailto:` 로 시작하는 실제 받는 메일 주소 |

공개 키를 두 번 넣는 이유: Vite는 `VITE_` 로 시작하는 값만 브라우저로 내보낸다.
브라우저도 이 키가 있어야 구독을 만들 수 있어서 이름을 나눠 둔 것이고, **값은 같아야 한다.**

`VAPID_CONTACT`는 구글·애플의 푸시 서버가 우리 쪽 발송에 문제가 생겼을 때 연락할 곳이다.
평소에는 쓰이지 않지만 발송이 대량으로 거부될 때 여기로 연락이 온다.

등록 후 **재배포해야** 적용된다.

## 3. 표 만들기

Supabase → SQL Editor에서 `docs/push-subscriptions.sql`을 실행한다.
맨 아래 확인 쿼리에서 `push_sub_own` 한 줄이 나오면 된다.

## 4. 웹훅 등록

Supabase → Database → Webhooks → Create a new hook

| 항목 | 값 |
|------|-----|
| Name | `notify-qna` |
| Table | `qna` |
| Events | `Insert` 만 체크 |
| Type | HTTP Request |
| Method | `POST` |
| URL | `https://<배포주소>/api/notify-qna` |
| HTTP Headers | `x-webhook-secret` : 2번에서 정한 `QNA_WEBHOOK_SECRET` 값 |

## 5. 교사 폰에서 알림 켜기

교사마다 한 번씩 한다.

**아이폰** — Safari로 사이트를 연다 → 공유 버튼 → **홈 화면에 추가** →
홈 화면의 아이콘으로 앱을 연다 → Q&A → **알림 받기** → 허용

아이폰은 홈 화면에 추가한 앱에서만 웹 알림이 열린다. Safari 탭에서는 버튼이 뜨지 않고
방법 안내가 대신 보인다. **홈 화면에서 앱을 지우면 알림도 끊긴다.**

**안드로이드 / PC** — 사이트를 열고 Q&A → **알림 받기** → 허용

## 확인

학생 계정으로 질문을 하나 올리고 담당 교사 폰에 `홍길동 · 내신과제` 형태의
알림이 오는지 본다.

안 오면 Vercel → 프로젝트 → Logs에서 `/api/notify-qna` 호출을 찾는다.

| 응답 | 원인 |
|------|------|
| 호출 자체가 없음 | 4번 웹훅이 등록되지 않았거나 URL이 틀렸다 |
| `401` | `x-webhook-secret` 헤더 값이 `QNA_WEBHOOK_SECRET`과 다르다 |
| `500 서버 환경변수` | 2번 환경변수가 빠졌거나 재배포하지 않았다 |
| `200 sent:0` | 그 교사가 5번을 하지 않았다 (구독이 없다) |

## 로컬에서는 확인할 수 없다

웹 푸시는 HTTPS를 요구하고, Supabase 웹훅이 `localhost`로 POST를 보낼 수 없다.
실제 확인은 Vercel에 배포한 뒤에 해야 한다.
