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
      fake.ready = () => opts.events.onReady?.({ target: this })   // 준비 신호는 테스트가 직접 보낸다
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

  it('준비된 플레이어에서 이어보기를 누르면 바로 그 위치로 이동해 재생한다', async () => {
    const control = { current: null }
    render(<TrackedPlayer youtubeId="abc" dbVideoId={3} title="t" trackAs="student" controlRef={control} onSaved={() => {}} />)
    await act(async () => { vi.advanceTimersByTime(1) })
    act(() => fake.ready())
    act(() => control.current.resume(750))
    expect(fake.seekTo).toHaveBeenCalledWith(750, true)
    expect(fake.playVideo).toHaveBeenCalled()
  })

  it('준비 전에 이어보기를 누르면 준비되는 순간 그 위치로 이동한다', async () => {
    const control = { current: null }
    render(<TrackedPlayer youtubeId="abc" dbVideoId={3} title="t" trackAs="student" controlRef={control} onSaved={() => {}} />)
    await act(async () => { vi.advanceTimersByTime(1) })
    act(() => control.current.resume(750))
    expect(fake.seekTo).not.toHaveBeenCalled()
    act(() => fake.ready())
    expect(fake.seekTo).toHaveBeenCalledWith(750, true)
  })

  it('같은 위치로 두 번 눌러도 두 번 다 이동한다', async () => {
    const control = { current: null }
    render(<TrackedPlayer youtubeId="abc" dbVideoId={3} title="t" trackAs="student" controlRef={control} onSaved={() => {}} />)
    await act(async () => { vi.advanceTimersByTime(1) })
    act(() => fake.ready())
    act(() => control.current.resume(750))
    act(() => control.current.resume(750))
    expect(fake.seekTo).toHaveBeenCalledTimes(2)
  })

  it('YouTube 스크립트를 못 불러오면 기록 없이 일반 플레이어로 재생한다', async () => {
    delete window.YT
    const { container } = render(<TrackedPlayer youtubeId="abc" dbVideoId={3} title="t" trackAs="student" onSaved={() => {}} />)
    const script = [...document.head.querySelectorAll('script')].find((x) => x.src.includes('iframe_api'))
    await act(async () => { script.onerror(new Event('error')) })
    expect(container.querySelector('iframe').src).toContain('youtube.com/embed/abc')
    expect(container.textContent).toContain('시청 기록 없이 재생')
  })

  it('YouTube 스크립트가 10초 안에 안 오면 일반 플레이어로 재생한다', async () => {
    delete window.YT
    const { container } = render(<TrackedPlayer youtubeId="abc" dbVideoId={3} title="t" trackAs="student" onSaved={() => {}} />)
    await act(async () => { vi.advanceTimersByTime(10000) })
    expect(container.querySelector('iframe').src).toContain('youtube.com/embed/abc')
  })
})
