// src/utils/testPoints.test.js
import { describe, it, expect } from 'vitest'
import { distributePoints, sumPoints } from './testPoints'

describe('distributePoints', () => {
  it('딱 나누어떨어지면 모두 같은 배점이다', () => {
    expect(distributePoints(100, 20)).toEqual(Array(20).fill(5))
    expect(distributePoints(100, 8)).toEqual(Array(8).fill(12.5))
  })

  it('나누어떨어지지 않으면 1점 단위로 갈라 합계를 총점에 딱 맞춘다', () => {
    expect(distributePoints(100, 3)).toEqual([34, 33, 33])
    const p = distributePoints(100, 30)
    expect(p.filter((v) => v === 4)).toHaveLength(10)
    expect(p.filter((v) => v === 3)).toHaveLength(20)
    expect(sumPoints(p)).toBe(100)
  })

  it('어떤 문항 수든 소수 없이 합계가 100점이다', () => {
    for (const n of [3, 7, 9, 11, 13, 17, 23, 30, 45]) {
      const p = distributePoints(100, n)
      expect(sumPoints(p)).toBe(100)
      expect(p.every(Number.isInteger)).toBe(true)
      expect(Math.max(...p) - Math.min(...p)).toBeLessThanOrEqual(1)
    }
  })

  it('문항이 총점보다 많으면 어쩔 수 없이 0.1점 단위로 나눈다', () => {
    const p = distributePoints(10, 30)
    expect(sumPoints(p)).toBe(10)
    expect(p.every((v) => v > 0)).toBe(true)
  })

  it('문항이 없으면 빈 배열이다', () => {
    expect(distributePoints(100, 0)).toEqual([])
    expect(distributePoints(100, -1)).toEqual([])
  })

  it('총점이 비어 있어도 터지지 않는다 — 0점씩 준다', () => {
    expect(distributePoints('', 2)).toEqual([0, 0])
  })
})

describe('sumPoints', () => {
  it('소수를 더해도 99.999… 가 아니라 딱 떨어진 값이다', () => {
    expect(sumPoints(Array(10).fill(3.4).concat(Array(20).fill(3.3)))).toBe(100)
    expect(sumPoints([0.1, 0.2])).toBe(0.3)
  })

  it('빈 값·문자열이 섞여도 터지지 않는다', () => {
    expect(sumPoints([])).toBe(0)
    expect(sumPoints(['5', '', null, 2])).toBe(7)
  })
})
