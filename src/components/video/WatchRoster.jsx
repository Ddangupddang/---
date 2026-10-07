// src/components/video/WatchRoster.jsx
// 교사·관리자 화면의 "시청 현황". 챙길 학생(안 봄)이 위로 온다.
import { buildRoster, summarizeRoster, formatClock, watchedPercent } from '../../utils/videoProgress'
import { formatDate } from '../../utils/datetime'
import Badge from '../ui/Badge'

function statusText({ status, row }) {
  if (status === 'none') return '안 봄'
  if (status === 'done') return `✓ 완료 ${formatDate(row.completedAt)}`
  return `${formatClock(row.lastPositionSec)}까지 · 실제 시청 ${watchedPercent(row)}%`
}

const TONE = { none: 'danger', watching: 'warn', done: 'navy' }

export default function WatchRoster({ students, rows }) {
  if (students.length === 0) {
    return <p className="text-sm text-ink-faint py-6 text-center">이 영상을 볼 학생이 없어요.</p>
  }
  const roster = buildRoster(students, rows)
  const s = summarizeRoster(roster)
  return (
    <div>
      <p className="text-sm font-bold text-ink mb-3">
        {`완료 ${s.done} · 보는 중 ${s.watching} · 안 봄 ${s.none} (${s.total}명)`}
      </p>
      <ul className="border border-line rounded divide-y divide-line">
        {roster.map((r) => (
          <li key={r.student.id} className="flex items-center justify-between gap-3 px-3 py-2">
            <span className="text-sm text-ink whitespace-nowrap">{r.student.name}</span>
            <Badge tone={TONE[r.status]}>{statusText(r)}</Badge>
          </li>
        ))}
      </ul>
    </div>
  )
}
