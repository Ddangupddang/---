// src/utils/fetchAll.test.js
import { describe, it, expect, vi } from 'vitest'
import { fetchAllRows, FETCH_PAGE } from './fetchAll'

// range(from, to)를 받아 그 구간을 돌려주는 가짜 질의
function fakeQuery(rows) {
  return () => ({
    range: (from, to) =>
      Promise.resolve({ data: rows.slice(from, to + 1), error: null }),
  })
}

describe('fetchAllRows', () => {
  it('한 쪽에 다 들어가면 한 번만 부른다', async () => {
    const rows = Array.from({ length: 10 }, (_, i) => i)
    const make = vi.fn(fakeQuery(rows))

    const { data } = await fetchAllRows(make)

    expect(data).toHaveLength(10)
    expect(make).toHaveBeenCalledTimes(1)
  })

  it('한도를 넘으면 이어서 마저 받는다', async () => {
    // Supabase는 한 번에 1000행까지만 준다. 예전에는 여기서 조용히 잘려서
    // 최근에 만든 과제 문항이 화면에 아예 안 나왔다.
    const rows = Array.from({ length: FETCH_PAGE + 72 }, (_, i) => i)

    const { data } = await fetchAllRows(fakeQuery(rows))

    expect(data).toHaveLength(FETCH_PAGE + 72)
    expect(data[data.length - 1]).toBe(FETCH_PAGE + 71)
  })

  it('딱 한도만큼이면 한 번 더 불러 끝인지 확인한다', async () => {
    const rows = Array.from({ length: FETCH_PAGE }, (_, i) => i)
    const make = vi.fn(fakeQuery(rows))

    const { data } = await fetchAllRows(make)

    expect(data).toHaveLength(FETCH_PAGE)
    expect(make).toHaveBeenCalledTimes(2)
  })

  it('에러가 나면 그대로 돌려준다', async () => {
    const make = () => ({
      range: () => Promise.resolve({ data: null, error: { message: '권한 없음' } }),
    })

    const { data, error } = await fetchAllRows(make)

    expect(data).toBeNull()
    expect(error.message).toBe('권한 없음')
  })

  it('끝나지 않는 응답에도 멈춘다', async () => {
    // 항상 가득 찬 쪽을 주는 응답이 오면 무한히 돈다. 상한을 둔다.
    const full = Array.from({ length: FETCH_PAGE }, (_, i) => i)
    const make = vi.fn(() => ({ range: () => Promise.resolve({ data: full, error: null }) }))

    const { data } = await fetchAllRows(make)

    expect(make.mock.calls.length).toBeLessThanOrEqual(50)
    expect(data.length).toBeLessThanOrEqual(FETCH_PAGE * 50)
  })
})
