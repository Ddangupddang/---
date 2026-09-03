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

  it('아이폰 Safari 탭에는 PushManager가 없다 — 그래도 안내를 보여준다', () => {
    // 아이폰은 홈 화면에 추가한 뒤에야 PushManager가 생긴다.
    // 이걸 "지원 안 함"으로 처리하면, 안내가 필요한 바로 그 사람에게
    // "이 브라우저는 알림을 지원하지 않습니다"가 뜬다.
    expect(pushEnvironment({
      ...base, isIos: true, isStandalone: false, hasPushManager: false,
    })).toBe('ios-needs-install')
  })

  it('홈 화면에 추가했는데도 PushManager가 없으면 지원하지 않는 기기다', () => {
    // iOS 16.4 미만. 여기서는 안내해도 방법이 없다.
    expect(pushEnvironment({
      ...base, isIos: true, isStandalone: true, hasPushManager: false,
    })).toBe('unsupported')
  })
})
