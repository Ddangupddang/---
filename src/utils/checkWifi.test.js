import { describe, it, expect } from 'vitest'
import { wifiFailureHint, wifiFailureCause } from './checkWifi'

describe('wifiFailureCause', () => {
  it('콜론이 있으면 IPv6', () => {
    expect(wifiFailureCause('2001:2d8:abcd::1')).toBe('ipv6')
    expect(wifiFailureCause('::1')).toBe('ipv6')
  })

  it('Cloudflare 대역이면 사설 릴레이로 본다', () => {
    // 2026-09-17에 실제로 나온 주소
    expect(wifiFailureCause('104.28.102.59')).toBe('relay')
    expect(wifiFailureCause('104.16.0.1')).toBe('relay')
    expect(wifiFailureCause('104.31.255.254')).toBe('relay')
    expect(wifiFailureCause('172.64.1.1')).toBe('relay')
    expect(wifiFailureCause('162.158.5.5')).toBe('relay')
  })

  it('Fastly 대역이면 사설 릴레이로 본다', () => {
    // 같은 날, WiFi를 껐다 켜기 전에 나온 주소
    expect(wifiFailureCause('140.248.29.5')).toBe('relay')
    expect(wifiFailureCause('151.101.1.1')).toBe('relay')
    expect(wifiFailureCause('199.232.4.4')).toBe('relay')
  })

  it('릴레이 대역 바로 바깥은 릴레이로 보지 않는다', () => {
    expect(wifiFailureCause('104.15.0.1')).toBe('unknown')
    expect(wifiFailureCause('104.32.0.1')).toBe('unknown')
    expect(wifiFailureCause('172.63.0.1')).toBe('unknown')
    expect(wifiFailureCause('172.72.0.1')).toBe('unknown')
  })

  it('한국 통신사 주소 같은 그 밖의 IPv4는 단정하지 않는다', () => {
    expect(wifiFailureCause('39.7.51.22')).toBe('unknown')
    expect(wifiFailureCause('119.64.94.220')).toBe('unknown')
  })

  it('주소를 못 받았으면 none', () => {
    expect(wifiFailureCause(null)).toBe('none')
    expect(wifiFailureCause('')).toBe('none')
  })
})

describe('wifiFailureHint', () => {
  it('사설 릴레이면 끄는 자리를 정확히 알려 준다', () => {
    const hint = wifiFailureHint('104.28.102.59')
    expect(hint).toMatch(/사설 릴레이/)
    // 학생이 그대로 따라갈 수 있어야 한다
    expect(hint).toMatch(/IP 주소 추적 제한/)
  })

  it('사설 릴레이면 WiFi가 정상이라고 말해 준다 — 껐다 켜라고 하면 헛돈다', () => {
    const hint = wifiFailureHint('140.248.29.5')
    expect(hint).toMatch(/WiFi는 정상/)
    expect(hint).not.toMatch(/껐다 켜/)
  })

  it('IPv6면 그렇게 말해 준다 — 학원 주소는 IPv4라 절대 못 맞춘다', () => {
    expect(wifiFailureHint('2001:2d8:abcd::1')).toMatch(/IPv6/)
    expect(wifiFailureHint('::1')).toMatch(/IPv6/)
  })

  it('그 밖의 IPv4면 두 가지 가능성을 모두 알려 준다', () => {
    const hint = wifiFailureHint('39.7.51.22')
    expect(hint).toMatch(/다른 망/)
    // 릴레이·VPN도 같은 증상을 내므로 함께 짚어 준다
    expect(hint).toMatch(/VPN|릴레이/)
  })

  it('주소를 못 받았으면 다시 시도하라고 한다', () => {
    expect(wifiFailureHint(null)).toMatch(/다시 눌러/)
    expect(wifiFailureHint('')).toMatch(/다시 눌러/)
  })
})
