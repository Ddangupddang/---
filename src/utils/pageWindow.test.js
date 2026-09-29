import { describe, it, expect } from 'vitest'
import { pageWindow } from './pageWindow'

describe('pageWindow', () => {
  it('쪽이 적으면 전부 보여준다', () => {
    expect(pageWindow(1, 3)).toEqual([1, 2, 3])
    expect(pageWindow(5, 5)).toEqual([1, 2, 3, 4, 5])
  })

  it('가운데 쪽이면 앞뒤로 둘씩 보여준다', () => {
    expect(pageWindow(8, 15)).toEqual([6, 7, 8, 9, 10])
  })

  it('앞쪽에서는 1부터 다섯 개다', () => {
    // 1쪽에서 앞으로 둘을 더 그리면 0, -1이 된다
    expect(pageWindow(1, 15)).toEqual([1, 2, 3, 4, 5])
    expect(pageWindow(2, 15)).toEqual([1, 2, 3, 4, 5])
  })

  it('끝쪽에서는 마지막 다섯 개다', () => {
    expect(pageWindow(15, 15)).toEqual([11, 12, 13, 14, 15])
    expect(pageWindow(14, 15)).toEqual([11, 12, 13, 14, 15])
  })

  it('보여줄 개수를 바꿀 수 있다', () => {
    expect(pageWindow(5, 15, 3)).toEqual([4, 5, 6])
  })

  it('쪽이 없으면 빈 목록이다', () => {
    expect(pageWindow(1, 0)).toEqual([])
  })
})
