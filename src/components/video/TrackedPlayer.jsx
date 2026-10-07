// src/components/video/TrackedPlayer.jsx
// 영상 플레이어. 학생이 볼 때만 시청 기록을 남긴다.
//   - 1초마다 위치를 확인해 자연스럽게 재생된 칸만 모은다
//   - 10초마다, 그리고 일시정지 · 끝 · 다른 앱으로 전환 · 화면을 나갈 때 저장한다
import { useEffect, useRef } from 'react'
import { useYouTubePlayer } from '../../hooks/useYouTubePlayer'
import { createWatchTracker } from '../../utils/watchTracker'
import { saveVideoProgress } from '../../utils/videoProgressApi'

const PLAYING = 1, PAUSED = 2, ENDED = 0

export default function TrackedPlayer({ youtubeId, dbVideoId, title, trackAs, seekTo, onSaved }) {
  const tracking = trackAs === 'student'
  const onSavedRef = useRef(onSaved)
  useEffect(() => { onSavedRef.current = onSaved })
  const trackerRef = useRef(null)

  const { containerRef, playerRef } = useYouTubePlayer(youtubeId, {
    onStateChange: (state) => {
      const tracker = trackerRef.current
      if (!tracker) return
      if (state === PAUSED || state === ENDED) {
        const p = playerRef.current
        if (p) tracker.notePosition(p.getCurrentTime())
        tracker.flush()
      }
    },
  })

  // 학생일 때만 추적기를 만들고, 1초 tick · 화면 숨김 저장 · 나갈 때 저장을 건다
  useEffect(() => {
    if (!tracking) return undefined
    const tracker = createWatchTracker({
      save: (p) => saveVideoProgress(dbVideoId, p).then((row) => { onSavedRef.current?.(row); return row }),
    })
    trackerRef.current = tracker

    const id = setInterval(() => {
      const p = playerRef.current
      if (!p?.getCurrentTime) return
      tracker.tick(p.getCurrentTime(), p.getPlayerState() === PLAYING, p.getDuration())
    }, 1000)

    // 다른 앱으로 전환할 때 바로 저장 — 10초 전에 나가도 본 칸이 남게
    const onHide = () => { if (document.visibilityState === 'hidden') tracker.flush() }
    document.addEventListener('visibilitychange', onHide)

    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onHide)
      tracker.flush()                       // 목록으로 돌아갈 때
      trackerRef.current = null
    }
  }, [tracking, dbVideoId, playerRef])

  // 이어보기
  useEffect(() => {
    if (seekTo == null) return
    const p = playerRef.current
    if (!p?.seekTo) return
    p.seekTo(seekTo, true)
    p.playVideo()
  }, [seekTo, playerRef])

  return (
    <div className="aspect-video w-full bg-black rounded overflow-hidden" aria-label={title}>
      <div ref={containerRef} className="w-full h-full [&>iframe]:w-full [&>iframe]:h-full" />
    </div>
  )
}
