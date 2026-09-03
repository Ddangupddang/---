// src/utils/pushSubscription.test.js
import { describe, it, expect } from 'vitest'
import { subscriptionRow } from './pushSubscription'

// 브라우저가 주는 PushSubscription 모양
const sub = {
  endpoint: 'https://fcm.googleapis.com/fcm/send/abc123',
  toJSON: () => ({
    endpoint: 'https://fcm.googleapis.com/fcm/send/abc123',
    keys: { p256dh: 'PPPP', auth: 'AAAA' },
  }),
}

describe('subscriptionRow', () => {
  it('브라우저 구독을 DB 행 모양으로 바꾼다', () => {
    expect(subscriptionRow(sub, 't1', 'iPhone Safari')).toEqual({
      profile_id: 't1',
      endpoint:   'https://fcm.googleapis.com/fcm/send/abc123',
      p256dh:     'PPPP',
      auth:       'AAAA',
      user_agent: 'iPhone Safari',
    })
  })

  it('키가 없는 구독은 받지 않는다', () => {
    // 키 없이 저장하면 발송할 때가 되어서야 실패한다. 그때는 원인을 찾기 어렵다.
    const broken = { toJSON: () => ({ endpoint: 'https://x', keys: {} }) }
    expect(() => subscriptionRow(broken, 't1', 'UA')).toThrow(/키/)
  })

  it('기기 정보가 없으면 빈 값으로 둔다', () => {
    expect(subscriptionRow(sub, 't1', undefined).user_agent).toBe('')
  })
})
