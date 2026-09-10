import { describe, it, expect, vi } from 'vitest'
import { isDeadSubscription, sendToSubscriptions } from './pushDispatch'

const subs = [
  { endpoint: 'a', p256dh: 'p', auth: 'x' },
  { endpoint: 'b', p256dh: 'p', auth: 'x' },
  { endpoint: 'c', p256dh: 'p', auth: 'x' },
]

const fail = (statusCode) => Object.assign(new Error('nope'), { statusCode })

describe('isDeadSubscription', () => {
  it('404·410만 죽은 구독이다', () => {
    expect(isDeadSubscription(404)).toBe(true)
    expect(isDeadSubscription(410)).toBe(true)
    expect(isDeadSubscription(500)).toBe(false)
    expect(isDeadSubscription(429)).toBe(false)
  })
})

describe('sendToSubscriptions', () => {
  it('모두 성공하면 보낸 수를 센다', async () => {
    const webpush = { sendNotification: vi.fn().mockResolvedValue({}) }
    expect(await sendToSubscriptions(webpush, subs, '{}')).toEqual({ sent: 3, dead: [] })
  })

  it('한 기기가 죽어도 나머지는 보낸다', async () => {
    const webpush = {
      sendNotification: vi.fn()
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce(fail(410))
        .mockResolvedValueOnce({}),
    }
    expect(await sendToSubscriptions(webpush, subs, '{}')).toEqual({ sent: 2, dead: ['b'] })
  })

  it('잠시 실패한 구독은 지울 목록에 넣지 않는다', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const webpush = {
      sendNotification: vi.fn()
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce(fail(500))
        .mockResolvedValueOnce({}),
    }
    expect(await sendToSubscriptions(webpush, subs, '{}')).toEqual({ sent: 2, dead: [] })
    console.error.mockRestore()
  })

  it('구독이 없으면 아무것도 하지 않는다', async () => {
    const webpush = { sendNotification: vi.fn() }
    expect(await sendToSubscriptions(webpush, [], '{}')).toEqual({ sent: 0, dead: [] })
    expect(webpush.sendNotification).not.toHaveBeenCalled()
  })
})
