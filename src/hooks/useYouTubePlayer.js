// src/hooks/useYouTubePlayer.js
// YouTube 공식 플레이어 API 로 영상을 띄운다.
// 그냥 <iframe> 으로는 지금 몇 초를 보는지, 멈췄는지 알 수 없다 — 시청 기록에 그게 필요하다.
import { useEffect, useRef, useState } from 'react'

let apiPromise = null

// 이 시간 안에 스크립트가 안 오면 포기하고 일반 플레이어로 띄운다
export const API_TIMEOUT_MS = 10000

// 스크립트는 앱 전체에서 한 번만 불러온다.
// 실패(차단·끊김)하거나 늦으면 거절한다 — 기다리기만 하면 영상이 영영 안 나온다.
// 거절하면 다음 영상에서 다시 시도할 수 있게 기억을 지운다.
function loadApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT)
  if (apiPromise) return apiPromise
  apiPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script')
    const fail = (why) => {
      clearTimeout(timer)
      apiPromise = null
      s.remove()
      reject(new Error(`YouTube 플레이어 스크립트: ${why}`))
    }
    const timer = setTimeout(() => fail('시간 초과'), API_TIMEOUT_MS)
    const prev = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => { clearTimeout(timer); prev?.(); resolve(window.YT) }
    s.src = 'https://www.youtube.com/iframe_api'
    s.onerror = () => fail('불러오기 실패')
    document.head.appendChild(s)
  })
  return apiPromise
}

export function useYouTubePlayer(youtubeId, { onStateChange, onReady } = {}) {
  const containerRef = useRef(null)
  const playerRef = useRef(null)
  const stateRef = useRef(onStateChange)
  // 최신 콜백을 기억해 둔다 — 그리는 도중이 아니라 그린 직후에 바꾼다 (React 규칙)
  useEffect(() => { stateRef.current = onStateChange })
  const readyRef = useRef(onReady)
  useEffect(() => { readyRef.current = onReady })
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let alive = true
    const box = containerRef.current     // 정리할 때 같은 칸을 비우려고 잡아 둔다
    loadApi().then((YT) => {
      if (!alive || !box) return
      // YouTube 는 넘겨받은 칸을 iframe 으로 통째로 바꿔 끼운다.
      // React 가 관리하는 칸을 넘기면 화면을 나갈 때 React 가 사라진 칸을 지우려다 오류가 난다 —
      // 그래서 안쪽에 칸을 하나 직접 만들어 그걸 넘긴다
      const el = document.createElement('div')
      box.appendChild(el)
      playerRef.current = new YT.Player(el, {
        videoId: youtubeId,
        width: '100%',
        height: '100%',
        playerVars: { rel: 0, playsinline: 1 },   // 폰에서 전체화면으로 튀지 않고 화면 안에서 재생
        events: {
          onReady: () => readyRef.current?.(),
          onStateChange: (e) => stateRef.current?.(e.data),
        },
      })
    }).catch(() => { if (alive) setFailed(true) })
    return () => {
      alive = false
      playerRef.current?.destroy?.()
      playerRef.current = null
      if (box) box.innerHTML = ''
    }
  }, [youtubeId])

  return { containerRef, playerRef, failed }
}
