// src/utils/dbRows.test.js
import { describe, it, expect } from 'vitest'
import { rowsOrNull } from './dbRows'

describe('rowsOrNull', () => {
  it('받아온 행을 그대로 준다', () => {
    expect(rowsOrNull({ data: [{ id: 1 }], error: null })).toEqual([{ id: 1 }])
  })

  it('0건이면 빈 배열을 준다 — 화면도 비워야 한다', () => {
    // 예전에는 0건일 때 화면을 건드리지 않아서, 처음 넣어둔 Mock 데이터가
    // 그대로 남았다. 그 가짜 공지를 지우려 하면 DB에 없는 id라 0건만 지워진다.
    expect(rowsOrNull({ data: [], error: null })).toEqual([])
  })

  it('에러면 null을 준다 — 화면을 건드리지 않는다', () => {
    // 못 읽은 것과 0건인 것은 다르다. 잠깐 못 읽었다고 화면을 비우면
    // 멀쩡한 자료가 사라진 것처럼 보인다.
    expect(rowsOrNull({ data: null, error: { message: '권한 없음' } })).toBeNull()
    expect(rowsOrNull({ data: [{ id: 1 }], error: { message: '권한 없음' } })).toBeNull()
  })

  it('응답 자체가 없어도 터지지 않는다', () => {
    expect(rowsOrNull(undefined)).toBeNull()
    expect(rowsOrNull({})).toBeNull()
  })
})
