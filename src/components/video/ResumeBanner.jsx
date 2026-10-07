// src/components/video/ResumeBanner.jsx
// 다시 들어온 학생에게 보던 곳부터 보게 권한다. 누르지 않으면 처음부터 본다.
import { formatClock, shouldOfferResume } from '../../utils/videoProgress'

export default function ResumeBanner({ row, onResume }) {
  if (!shouldOfferResume(row)) return null
  return (
    <div className="flex items-center justify-between gap-3 mb-2 px-3 py-2 rounded border border-line bg-surface-alt text-sm">
      <span className="text-ink-soft">
        지난번 <b className="text-ink">{formatClock(row.lastPositionSec)}</b>까지 봤어요
      </span>
      <button
        onClick={() => onResume(row.lastPositionSec)}
        className="shrink-0 whitespace-nowrap px-3 py-1 rounded bg-ink text-white text-xs font-bold"
      >
        이어보기
      </button>
    </div>
  )
}
