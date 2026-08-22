// src/utils/testPoints.test.js
import { describe, it, expect } from 'vitest'
import { distributePoints } from './testPoints'

const sum = (arr) => Math.round(arr.reduce((a, b) => a + b, 0) * 10) / 10

describe('distributePoints', () => {
  it('딱 나누어떨어지면 모두 같은 배점이다', () => {
    expect(distributePoints(100, 20)).toEqual(Array(20).fill(5))
    expect(distributePoints(100, 8)).toEqual(Array(8).fill(12.5))
  })

  it('나누어떨어지지 않아도 합계는 총점과 정확히 맞는다', () => {
    const p = distributePoints(100, 3)
    expect(sum(p)).toBe(100)
    expect(p).toEqual([33.4, 33.3, 33.3])
  })

  it('문항 간 차이는 0.1점을 넘지 않는다', () => {
    for (const n of [3, 7, 9, 11, 13, 17, 23]) {
      const p = distributePoints(100, n)
      expect(sum(p)).toBe(100)
      expect(Math.max(...p) - Math.min(...p)).toBeLessThanOrEqual(0.1000001)
    }
  })

  it('문항이 없으면 빈 배열이다', () => {
    expect(distributePoints(100, 0)).toEqual([])
    expect(distributePoints(100, -1)).toEqual([])
  })

  it('총점이 비어 있어도 터지지 않는다 — 0점씩 준다', () => {
    expect(distributePoints('', 2)).toEqual([0, 0])
  })
})
