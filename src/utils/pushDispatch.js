// src/utils/pushDispatch.js
// 여러 기기에 알림을 보내고, 죽은 구독을 골라낸다.
//
// webpush를 인자로 받는다. 이 파일이 서버 전용 꾸러미를 직접 부르지 않으므로
// 어디서 불러도 안전하고, 테스트에서는 가짜를 넣어 확인할 수 있다.

// 브라우저가 구독을 버린 상태. 이 구독은 지워야 한다.
// 500·429처럼 잠시 실패한 것까지 지우면 사용자가 알림을 다시 켜야 한다.
export function isDeadSubscription(statusCode) {
  return statusCode === 404 || statusCode === 410
}

// 한 기기가 실패해도 나머지는 계속 보낸다.
// 교사 폰 하나가 죽었다고 다른 사람이 못 받으면 안 된다.
export async function sendToSubscriptions(webpush, subs = [], payload) {
  const results = await Promise.all(subs.map(async (s) => {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        payload
      )
      return { endpoint: s.endpoint }
    } catch (e) {
      // 죽은 구독은 조용히 정리하고, 그 밖의 실패는 원인을 남긴다
      if (!isDeadSubscription(e.statusCode)) {
        console.error('알림 발송 실패:', s.endpoint, e.statusCode, e.body)
      }
      return { endpoint: s.endpoint, statusCode: e.statusCode }
    }
  }))

  return {
    sent: results.filter((r) => !r.statusCode).length,
    // 죽은 구독을 남겨두면 "보냈다"는 기록만 쌓이고 아무도 못 받는 상태가 이어진다
    dead: results.filter((r) => isDeadSubscription(r.statusCode)).map((r) => r.endpoint),
  }
}
