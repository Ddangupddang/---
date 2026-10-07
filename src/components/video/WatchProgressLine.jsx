// src/components/video/WatchProgressLine.jsx
// 학생이 "실제로" 얼마나 봤는지. 건너뛴 구간은 들어가지 않는다.
import { formatClock, watchedPercent } from '../../utils/videoProgress'

export default function WatchProgressLine({ row }) {
  if (!row) return null
  if (row.completedAt) {
    return <p className="mt-1 text-sm font-bold text-navy">✓ 시청 완료</p>
  }
  return (
    <p className="mt-1 text-sm text-ink-mute">
      {`실제 시청 ${formatClock(row.watchedSec)} / ${formatClock(row.durationSec)} (${watchedPercent(row)}%)`}
    </p>
  )
}
