// src/utils/paginate.test.js
import { describe, it, expect } from 'vitest'
import { pageCount, pageSlice } from './paginate'

describe('pageCount', () => {
  it('나누어떨어지지 않으면 올림한다', () => {
    expect(pageCount(25, 10)).toBe(3)
    expect(pageCount(20, 10)).toBe(2)
  })

  it('비어 있어도 1쪽은 있다', () => {
    // 0을 주면 "1 / 0쪽" 같은 표시가 나온다
    expect(pageCount(0, 10)).toBe(1)
  })
})

describe('pageSlice', () => {
  const items = Array.from({ length: 25 }, (_, i) => i + 1)

  it('그 쪽의 항목만 준다', () => {
    expect(pageSlice(items, 1, 10)[0]).toBe(1)
    expect(pageSlice(items, 2, 10)[0]).toBe(11)
    expect(pageSlice(items, 3, 10)).toEqual([21, 22, 23, 24, 25])
  })

  it('범위를 벗어난 쪽은 끝 쪽으로 맞춘다', () => {
    // 항목이 줄어들어 마지막 쪽이 사라지면 빈 화면이 남는다
    expect(pageSlice(items, 99, 10)).toEqual([21, 22, 23, 24, 25])
    expect(pageSlice(items, 0, 10)[0]).toBe(1)
  })

  it('빈 목록은 빈 배열을 준다', () => {
    expect(pageSlice([], 1, 10)).toEqual([])
  })
})
