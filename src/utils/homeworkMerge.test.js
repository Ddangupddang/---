import { describe, it, expect } from 'vitest'
import { mergePendingDays, firstPendingWeekday } from './homeworkMerge'

const day = (over = {}) => ({ enabled: false, count: 0, answers: {}, videoUrl: '', fileUrl: '', file: null, ...over })

describe('mergePendingDays', () => {
  it('입력하던 요일을 기존 세트에 얹는다', () => {
    const base    = { 1: day({ enabled: true, count: 2, answers: { 1: '①', 2: '②' } }), 6: day() }
    const pending = { 1: day(), 6: day({ enabled: true, count: 15, answers: { 1: '③' } }) }
    const out = mergePendingDays(base, pending)

    expect(out[6].count).toBe(15)          // 토요일이 들어왔다
    expect(out[1].count).toBe(2)           // 월요일은 그대로다
  })

  it('사용을 켜지 않은 요일은 덮어쓰지 않는다 — 기존 과제가 지워지면 안 된다', () => {
    const base    = { 1: day({ enabled: true, count: 5 }) }
    const pending = { 1: day({ enabled: false, count: 0 }) }
    expect(mergePendingDays(base, pending)[1].count).toBe(5)
  })

  it('같은 요일을 입력했으면 방금 입력한 것이 이긴다', () => {
    const base    = { 1: day({ enabled: true, count: 5, answers: { 1: '①' } }) }
    const pending = { 1: day({ enabled: true, count: 3, answers: { 1: '⑤' } }) }
    const out = mergePendingDays(base, pending)
    expect(out[1].count).toBe(3)
    expect(out[1].answers).toEqual({ 1: '⑤' })
  })

  it('얹을 것이 없으면 기존 그대로', () => {
    const base = { 1: day({ enabled: true, count: 5 }) }
    expect(mergePendingDays(base, {})).toEqual(base)
    expect(mergePendingDays(base)).toEqual(base)
  })
})

describe('firstPendingWeekday', () => {
  it('입력하던 요일 중 가장 앞을 준다', () => {
    expect(firstPendingWeekday({ 1: day(), 4: day({ enabled: true }), 6: day({ enabled: true }) })).toBe(4)
  })

  it('없으면 null', () => {
    expect(firstPendingWeekday({ 1: day() })).toBeNull()
    expect(firstPendingWeekday()).toBeNull()
  })
})
