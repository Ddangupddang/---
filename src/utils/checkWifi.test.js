import { describe, it, expect } from 'vitest'
import { wifiFailureHint } from './checkWifi'

describe('wifiFailureHint', () => {
  it('IPv6면 그렇게 말해 준다 — 학원 주소는 IPv4라 절대 못 맞춘다', () => {
    expect(wifiFailureHint('2001:2d8:abcd::1')).toMatch(/IPv6/)
    expect(wifiFailureHint('::1')).toMatch(/IPv6/)
  })

  it('IPv4면 다른 망으로 나간 것으로 본다', () => {
    expect(wifiFailureHint('39.7.51.22')).toMatch(/다른 망/)
  })

  it('주소를 못 받았으면 다시 시도하라고 한다', () => {
    expect(wifiFailureHint(null)).toMatch(/다시 눌러/)
    expect(wifiFailureHint('')).toMatch(/다시 눌러/)
  })
})
