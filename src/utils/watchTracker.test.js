// src/utils/watchTracker.test.js
import { describe, it, expect, vi } from 'vitest'
import { createWatchTracker } from './watchTracker'

// 1초마다 위치를 넣어 주는 흉내
function play(tracker, from, to, duration = 100) {
  for (let t = from; t <= to; t += 1) tracker.tick(t, true, duration)
}

describe('createWatchTracker', () => {
  it('10번 tick 마다 모은 칸을 저장한다', async () => {
    const save = vi.fn().mockResolvedValue({})
    const tr = createWatchTracker({ save, flushEveryTicks: 10 })
    play(tr, 0, 10)                      // tick 11번 → 10번째에서 저장
    expect(save).toHaveBeenCalledTimes(1)
    expect(save.mock.calls[0][0]).toEqual({ durationSec: 100, positionSec: 9, buckets: [0, 1] })
  })

  it('같은 칸은 한 번만 보낸다', async () => {
    const save = vi.fn().mockResolvedValue({})
    const tr = createWatchTracker({ save, flushEveryTicks: 100 })
    play(tr, 0, 4)
    play(tr, 0, 4)                       // 되감아서 같은 구간을 다시 봄 (0 으로 돌아가는 tick 은 건너뜀으로 버려진다)
    await tr.flush()
    expect(save.mock.calls[0][0].buckets).toEqual([0])
  })

  it('정지 중 tick 은 칸을 세지 않고, 다시 재생하면 그 지점부터 센다', async () => {
    const save = vi.fn().mockResolvedValue({})
    const tr = createWatchTracker({ save, flushEveryTicks: 100 })
    play(tr, 0, 2)
    tr.tick(2, false, 100)
    tr.tick(60, true, 100)               // 정지 후 다른 곳에서 재생 시작 — 건너뛴 구간은 세지 않는다
    tr.tick(61, true, 100)
    await tr.flush()
    expect(save.mock.calls[0][0].buckets).toEqual([0, 12])
    expect(save.mock.calls[0][0].positionSec).toBe(61)
  })

  it('저장이 실패하면 칸을 버리지 않고 다음 저장에 다시 보낸다', async () => {
    const save = vi.fn().mockRejectedValueOnce(new Error('network')).mockResolvedValue({})
    const tr = createWatchTracker({ save, flushEveryTicks: 100 })
    play(tr, 0, 3)
    await tr.flush()
    expect(tr.pendingCount()).toBe(1)
    await tr.flush()
    expect(save.mock.calls[1][0].buckets).toEqual([0])
    expect(tr.pendingCount()).toBe(0)
  })

  it('본 칸도 없고 길이도 모르면 저장하지 않는다', async () => {
    const save = vi.fn().mockResolvedValue({})
    const tr = createWatchTracker({ save })
    await tr.flush()
    expect(save).not.toHaveBeenCalled()
  })

  it('일시정지 위치만 바뀌어도 위치는 저장된다 (이어보기용)', async () => {
    const save = vi.fn().mockResolvedValue({})
    const tr = createWatchTracker({ save, flushEveryTicks: 100 })
    play(tr, 0, 2)
    await tr.flush()
    tr.notePosition(300)
    await tr.flush()
    expect(save.mock.calls[1][0]).toEqual({ durationSec: 100, positionSec: 300, buckets: [] })
  })
})
