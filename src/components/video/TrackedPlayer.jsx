// src/components/video/TrackedPlayer.jsx
// 영상 플레이어. 학생이 볼 때만 시청 기록을 남긴다.
//   - 1초마다 위치를 확인해 자연스럽게 재생된 칸만 모은다
//   - 10초마다, 그리고 일시정지 · 끝 · 다른 앱으로 전환 · 화면을 나갈 때 저장한다
import { useEffect, useRef } from 'react'
import { useYouTubePlayer } from '../../hooks/useYouTubePlayer'
import { createWatchTracker } from '../../utils/watchTracker'
import { saveVideoProgress } from '../../utils/videoProgressApi'

const PLAYING = 1, PAUSED = 2, ENDED = 0

export default function TrackedPlayer({ youtubeId, dbVideoId, title, trackAs, controlRef, onSaved }) {
  const tracking = trackAs === 'student'
  const onSavedRef = useRef(onSaved)
  useEffect(() => { onSavedRef.current = onSaved })
  const trackerRef = useRef(null)

  // 이어보기: 플레이어가 준비되기 전에 누르면 기억해 뒀다가 준비되는 순간 이동한다
  const readyRef = useRef(false)
  const pendingSeekRef = useRef(null)

  const { containerRef, playerRef, failed } = useYouTubePlayer(youtubeId, {
    onReady: () => {
      readyRef.current = true
      if (pendingSeekRef.current != null) {
        const sec = pendingSeekRef.current
        pendingSeekRef.current = null
        const p = playerRef.current
        p.seekTo(sec, true)
        p.playVideo()
      }
    },
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

  // 부모(VideoPlayer)가 "이어보기"를 누른 그 순간 부를 수 있게 한다.
  // 버튼 누름 안에서 바로 움직여야 아이폰이 재생을 막지 않는다 (사용자 동작 밖의 재생은 막힌다)
  useEffect(() => {
    if (!controlRef) return undefined
    controlRef.current = {
      resume: (sec) => {
        const p = playerRef.current
        if (readyRef.current && p?.seekTo) {
          p.seekTo(sec, true)
          p.playVideo()
        } else {
          pendingSeekRef.current = sec
        }
      },
    }
    return () => { controlRef.current = null }
  }, [controlRef, playerRef])

  // 영상이 바뀌면 준비 상태를 처음부터
  useEffect(() => () => { readyRef.current = false }, [youtubeId])

  // YouTube 스크립트를 못 불러오면(차단·끊김) 기록 없이라도 영상은 볼 수 있게 한다
  if (failed) {
    return (
      <div>
        <div className="aspect-video w-full bg-black rounded overflow-hidden">
          <iframe
            src={`https://www.youtube.com/embed/${youtubeId}`}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full"
          />
        </div>
        <p className="mt-1 text-xs text-ink-mute">영상 기록 기능을 불러오지 못해 시청 기록 없이 재생합니다.</p>
      </div>
    )
  }
  return (
    <div className="aspect-video w-full bg-black rounded overflow-hidden" aria-label={title}>
      <div ref={containerRef} className="w-full h-full [&>iframe]:w-full [&>iframe]:h-full" />
    </div>
  )
}
