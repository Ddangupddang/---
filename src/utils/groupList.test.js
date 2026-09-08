// src/utils/groupList.test.js
import { describe, it, expect } from 'vitest'
import { groupBy } from './groupList'

describe('groupBy', () => {
  it('같은 키끼리 묶는다', () => {
    const got = groupBy(
      [{ id: 1, w: 'A' }, { id: 2, w: 'B' }, { id: 3, w: 'A' }],
      (x) => x.w
    )
    expect(got.map((g) => g.key)).toEqual(['A', 'B'])
    expect(got[0].items.map((x) => x.id)).toEqual([1, 3])
    expect(got[1].items.map((x) => x.id)).toEqual([2])
  })

  it('들어온 순서를 지킨다', () => {
    // 목록은 이미 정렬돼서 들어온다. 여기서 순서를 바꾸면
    // 최신 주차가 위로 오게 해둔 정렬이 무의미해진다.
    const got = groupBy([{ w: 'B' }, { w: 'A' }, { w: 'B' }], (x) => x.w)
    expect(got.map((g) => g.key)).toEqual(['B', 'A'])
  })

  it('빈 목록은 빈 배열을 준다', () => {
    expect(groupBy([], (x) => x)).toEqual([])
    expect(groupBy(undefined, (x) => x)).toEqual([])
  })

  it('키가 비어 있어도 한 묶음으로 모은다', () => {
    // 반이 배정되지 않은 학생들이 여기 모인다
    const got = groupBy([{ id: 1, c: null }, { id: 2, c: 10 }, { id: 3, c: null }], (x) => x.c)
    expect(got.map((g) => g.key)).toEqual([null, 10])
    expect(got[0].items.map((x) => x.id)).toEqual([1, 3])
  })
})
