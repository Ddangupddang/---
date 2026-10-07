// src/components/video/TrackedPlayer.test.jsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, act } from '@testing-library/react'

const save = vi.fn()
vi.mock('../../utils/videoProgressApi', () => ({ saveVideoProgress: (...a) => save(...a) }))

import TrackedPlayer from './TrackedPlayer'

// 가짜 YouTube API — 진짜 스크립트를 불러오지 않는다
let fake
function installFakeYT() {
  fake = { time: 0, state: -1, events: null, seekTo: vi.fn(), playVideo: vi.fn() }
  window.YT = {
    PlayerState: { ENDED: 0, PLAYING: 1, PAUSED: 2 },
    Player: function Player(_el, opts) {
      fake.events = opts.events
      this.getCurrentTime = () => fake.time
      this.getDuration = () => 100
      this.getPlayerState = () => fake.state
      this.seekTo = fake.seekTo
      this.playVideo = fake.playVideo
      this.destroy = () => {}
      setTimeout(() => opts.events.onReady?.({ target: this }), 0)
    },
  }
}

beforeEach(() => { vi.useFakeTimers(); save.mockReset().mockResolvedValue({ id: 1 }); installFakeYT() })
afterEach(() => { vi.useRealTimers(); delete window.YT })

function playSeconds(n) {
  for (let i = 0; i < n; i += 1) { fake.time += 1; vi.advanceTimersByTime(1000) }
}

describe('TrackedPlayer', () => {
  it('학생이면 재생 10초마다 저장한다', async () => {
    render(<TrackedPlayer youtubeId="abc" dbVideoId={3} title="t" trackAs="student" onSaved={() => {}} />)
    await act(async () => { vi.advanceTimersByTime(1) })
    fake.state = 1
    await act(async () => { playSeconds(10) })
    expect(save).toHaveBeenCalledTimes(1)
    expect(save.mock.calls[0][0]).toBe(3)
  })

  it('화면이 숨겨지면 바로 저장한다 (10초 전에 나가도 남는다)', async () => {
    render(<TrackedPlayer youtubeId="abc" dbVideoId={3} title="t" trackAs="student" onSaved={() => {}} />)
    await act(async () => { vi.advanceTimersByTime(1) })
    fake.state = 1
    await act(async () => { playSeconds(3) })
    expect(save).not.toHaveBeenCalled()
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })
    await act(async () => { document.dispatchEvent(new Event('visibilitychange')) })
    expect(save).toHaveBeenCalledTimes(1)
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
  })

  it('학생이 아니면 저장하지 않는다', async () => {
    render(<TrackedPlayer youtubeId="abc" dbVideoId={3} title="t" trackAs={null} onSaved={() => {}} />)
    await act(async () => { vi.advanceTimersByTime(1) })
    fake.state = 1
    await act(async () => { playSeconds(30) })
    fake.events.onStateChange({ data: 2 })
    expect(save).not.toHaveBeenCalled()
  })

  it('이어보기 위치가 오면 그 위치로 이동해 재생한다', async () => {
    const { rerender } = render(<TrackedPlayer youtubeId="abc" dbVideoId={3} title="t" trackAs="student" seekTo={null} onSaved={() => {}} />)
    await act(async () => { vi.advanceTimersByTime(1) })
    rerender(<TrackedPlayer youtubeId="abc" dbVideoId={3} title="t" trackAs="student" seekTo={750} onSaved={() => {}} />)
    expect(fake.seekTo).toHaveBeenCalledWith(750, true)
    expect(fake.playVideo).toHaveBeenCalled()
  })
})
