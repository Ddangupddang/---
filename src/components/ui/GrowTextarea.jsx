// src/components/ui/GrowTextarea.jsx
// 쓰는 만큼 높아지는 입력 칸.
//
// Q&A 답장이 몇 줄로 고정돼 있으면 긴 답을 쓰는 동안 앞부분이 위로 밀려
// 올라가 전체를 다시 읽을 수 없다. 그렇다고 처음부터 15줄로 열어두면
// 학생 폰에서는 그 칸이 화면을 다 먹는다.
// 그래서 minRows로 시작해 내용만큼 늘어나고, maxRows를 넘으면 스크롤한다.
import { useLayoutEffect, useRef } from 'react'

export default function GrowTextarea({
  value, minRows = 4, maxRows = 15, className = '', ...props
}) {
  const ref = useRef(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return

    // 먼저 높이를 비워야 내용이 줄었을 때 칸도 같이 줄어든다
    el.style.height = 'auto'

    const style   = getComputedStyle(el)
    // 브라우저가 lineHeight를 'normal'로 주면 숫자로 못 읽는다 → 글자 크기의 1.5배로 본다
    const line    = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.5 || 20
    const padding = (parseFloat(style.paddingTop) || 0) + (parseFloat(style.paddingBottom) || 0)
    // scrollHeight에는 테두리가 안 들어 있다
    const border  = el.offsetHeight - el.clientHeight

    const min = line * minRows + padding + border
    const max = line * maxRows + padding + border
    const want = el.scrollHeight + border

    el.style.height    = `${Math.min(max, Math.max(min, want))}px`
    el.style.overflowY = want > max ? 'auto' : 'hidden'
  }, [value, minRows, maxRows])

  return (
    <textarea
      ref={ref}
      value={value}
      rows={minRows}
      className={className}
      {...props}
    />
  )
}
