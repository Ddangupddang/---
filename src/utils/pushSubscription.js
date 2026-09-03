// src/utils/pushSubscription.js
// 브라우저가 준 구독 정보를 DB에 넣을 모양으로 바꾼다.
//
// 알림은 사람이 아니라 기기 단위로 간다. 교사가 폰과 PC에서 각각 켜면
// endpoint가 다른 행이 두 개 생기고, 두 기기 모두 알림을 받는다.

export function subscriptionRow(subscription, profileId, userAgent) {
  const json = subscription.toJSON()
  const { p256dh, auth } = json.keys ?? {}

  // 키 없이 저장하면 발송할 때가 되어서야 실패한다. 그때는 원인을 찾기 어렵다.
  if (!p256dh || !auth) throw new Error('구독에 암호화 키가 없습니다')

  return {
    profile_id: profileId,
    endpoint:   json.endpoint,
    p256dh,
    auth,
    user_agent: userAgent ?? '',
  }
}
