// src/utils/pushSupport.test.js
import { describe, it, expect } from 'vitest'
import { pushEnvironment } from './pushSupport'

// 기본은 "알림을 켤 수 있는 안드로이드/PC"
const base = {
  hasServiceWorker: true,
  hasPushManager:   true,
  isIos:            false,
  isStandalone:     false,
  permission:       'default',
  subscribed:       false,
}

describe('pushEnvironment', () => {
  it('켤 수 있으면 ready다', () => {
    expect(pushEnvironment(base)).toBe('ready')
  })

  it('이미 구독했으면 on이다', () => {
    expect(pushEnvironment({ ...base, permission: 'granted', subscribed: true })).toBe('on')
  })

  it('아이폰인데 홈 화면에 추가하지 않았으면 안내가 필요하다', () => {
    // 토글을 눌러도 아무 일이 안 일어나는 상황을 만들지 않는다
    expect(pushEnvironment({ ...base, isIos: true, isStandalone: false })).toBe('ios-needs-install')
  })

  it('아이폰이어도 홈 화면에 추가했으면 켤 수 있다', () => {
    expect(pushEnvironment({ ...base, isIos: true, isStandalone: true })).toBe('ready')
  })

  it('권한을 거부한 상태면 denied다', () => {
    expect(pushEnvironment({ ...base, permission: 'denied' })).toBe('denied')
  })

  it('브라우저가 지원하지 않으면 unsupported다', () => {
    expect(pushEnvironment({ ...base, hasServiceWorker: false })).toBe('unsupported')
    expect(pushEnvironment({ ...base, hasPushManager: false })).toBe('unsupported')
  })

  it('지원하지 않는 게 먼저다 — 아이폰 안내보다 우선한다', () => {
    // iOS 16.4 미만에는 PushManager 자체가 없다. 홈 화면에 추가해도 안 된다.
    expect(pushEnvironment({ ...base, isIos: true, isStandalone: true, hasPushManager: false }))
      .toBe('unsupported')
  })
})
