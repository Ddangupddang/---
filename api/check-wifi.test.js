// api/check-wifi.test.js
import { describe, it, expect } from 'vitest'
import { academyIps, isAcademyIp } from './check-wifi.js'

describe('academyIps', () => {
  it('쉼표로 이어 적은 지점 IP를 모두 읽는다', () => {
    expect(academyIps({ ACADEMY_IPS: '1.2.3.4,5.6.7.8,9.10.11.12' }))
      .toEqual(['1.2.3.4', '5.6.7.8', '9.10.11.12'])
  })

  it('쉼표 앞뒤 공백과 빈 칸을 걸러낸다', () => {
    expect(academyIps({ ACADEMY_IPS: ' 1.2.3.4 , ,5.6.7.8, ' }))
      .toEqual(['1.2.3.4', '5.6.7.8'])
  })

  it('예전 이름(ACADEMY_IP)도 함께 읽는다', () => {
    expect(academyIps({ ACADEMY_IP: '1.2.3.4', ACADEMY_IPS: '5.6.7.8' }))
      .toEqual(['5.6.7.8', '1.2.3.4'])
  })
})

describe('isAcademyIp', () => {
  const env = { ACADEMY_IPS: '1.2.3.4,5.6.7.8,9.10.11.12' }

  it('어느 지점 IP와 맞아도 통과시킨다', () => {
    expect(isAcademyIp('1.2.3.4', env)).toBe(true)
    expect(isAcademyIp('9.10.11.12', env)).toBe(true)
  })

  it('등록되지 않은 IP는 막는다', () => {
    expect(isAcademyIp('123.45.67.89', env)).toBe(false)
  })

  it('IP를 하나도 등록하지 않았으면 막는다', () => {
    expect(isAcademyIp('1.2.3.4', {})).toBe(false)
  })

  it('요청자 IP를 알 수 없으면 막는다 (환경변수도 비어 있는 경우 포함)', () => {
    expect(isAcademyIp(undefined, env)).toBe(false)
    expect(isAcademyIp(undefined, {})).toBe(false)
  })
})

describe('진단 정보', () => {
  it('등록된 IP 개수를 세어 환경변수 문제와 값 오류를 가른다', () => {
    expect(academyIps({ ACADEMY_IPS: '1.2.3.4,5.6.7.8,9.10.11.12' })).toHaveLength(3)
    expect(academyIps({ ACADEMY_IPS: '1.2.3.4' })).toHaveLength(1)
    expect(academyIps({})).toHaveLength(0)
  })
})
