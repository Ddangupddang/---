// src/hooks/useYouTubePlayer.js
// YouTube 공식 플레이어 API 로 영상을 띄운다.
// 그냥 <iframe> 으로는 지금 몇 초를 보는지, 멈췄는지 알 수 없다 — 시청 기록에 그게 필요하다.
import { useEffect, useRef } from 'react'

let apiPromise = null

// 스크립트는 앱 전체에서 한 번만 불러온다
function loadApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT)
  if (apiPromise) return apiPromise
  apiPromise = new Promise((resolve) => {
    const prev = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => { prev?.(); resolve(window.YT) }
    const s = document.createElement('script')
    s.src = 'https://www.youtube.com/iframe_api'
    document.head.appendChild(s)
  })
  return apiPromise
}

export function useYouTubePlayer(youtubeId, { onStateChange } = {}) {
  const containerRef = useRef(null)
  const playerRef = useRef(null)
  const stateRef = useRef(onStateChange)
  stateRef.current = onStateChange

  useEffect(() => {
    let alive = true
    loadApi().then((YT) => {
      if (!alive || !containerRef.current) return
      // YouTube 는 넘겨받은 칸을 iframe 으로 통째로 바꿔 끼운다.
      // React 가 관리하는 칸을 넘기면 화면을 나갈 때 React 가 사라진 칸을 지우려다 오류가 난다 —
      // 그래서 안쪽에 칸을 하나 직접 만들어 그걸 넘긴다
      const el = document.createElement('div')
      containerRef.current.appendChild(el)
      playerRef.current = new YT.Player(el, {
        videoId: youtubeId,
        width: '100%',
        height: '100%',
        playerVars: { rel: 0, playsinline: 1 },   // 폰에서 전체화면으로 튀지 않고 화면 안에서 재생
        events: { onStateChange: (e) => stateRef.current?.(e.data) },
      })
    })
    return () => {
      alive = false
      playerRef.current?.destroy?.()
      playerRef.current = null
      if (containerRef.current) containerRef.current.innerHTML = ''
    }
  }, [youtubeId])

  return { containerRef, playerRef }
}
