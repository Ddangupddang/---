// src/utils/watchTracker.js
// 학생 플레이어가 1초마다 알려주는 위치를 받아 "실제로 본 5초 칸"을 모은다.
// 화면(React)과 떼어 두어서 타이머·플레이어 없이 테스트한다.
import { bucketsForStep } from './videoProgress'

export function createWatchTracker({ save, flushEveryTicks = 10 }) {
  let prev = null          // 직전 tick 위치. 정지하면 비운다 — 다시 재생할 때 건너뛴 것으로 세지 않게
  let pending = new Set()  // 아직 저장 못 한 칸
  let position = 0
  let duration = 0
  let ticks = 0
  let dirty = false        // 위치만 바뀌어도 저장할 거리가 있다

  function flush() {
    ticks = 0
    if (pending.size === 0 && !dirty) return Promise.resolve()
    if (!duration && pending.size === 0) return Promise.resolve()
    const buckets = [...pending].sort((a, b) => a - b)
    pending = new Set()
    dirty = false
    // save 는 바로(동기로) 부른다 — 화면을 나가는 순간에도 요청이 출발하게
    let request
    try {
      request = Promise.resolve(save({ durationSec: duration, positionSec: position, buckets }))
    } catch (e) {
      request = Promise.reject(e)
    }
    return request
      .then(() => undefined)
      .catch(() => {
        // 실패한 칸은 다음 저장 때 다시 보낸다. DB가 칸을 합치므로 두 번 가도 안전하다
        buckets.forEach((b) => pending.add(b))
        dirty = true
      })
  }

  return {
    tick(curSec, playing, durationSec) {
      if (durationSec > 0) duration = Math.round(durationSec)
      if (!playing) { prev = null; return }
      if (prev !== null) bucketsForStep(prev, curSec).forEach((b) => pending.add(b))
      prev = curSec
      position = Math.floor(curSec)
      dirty = true
      ticks += 1
      if (ticks >= flushEveryTicks) flush()
    },
    notePosition(curSec) {
      position = Math.floor(curSec)
      dirty = true
    },
    flush,
    pendingCount: () => pending.size,
  }
}
