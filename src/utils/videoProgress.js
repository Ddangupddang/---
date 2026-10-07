// src/utils/videoProgress.js
// 영상 시청 기록을 계산하고 보여주는 순수 함수들.
// 저장 규칙(칸 합치기·90% 완료)은 DB가 정한다. 여기는 "화면에서 어떻게 셀지·보여줄지"만 다룬다.

export const BUCKET_SEC = 5        // 영상을 5초 칸으로 나눠 "봤다/안 봤다"를 센다
export const MAX_STEP_SEC = 3      // 1초 사이에 이보다 많이 움직이면 건너뛴 것으로 본다 (2배속 + 타이머 지연 감안)
export const RESUME_MIN_SEC = 10   // 이만큼은 봐야 이어보기를 권한다

// 직전 위치에서 지금 위치까지 자연스럽게 재생됐으면 지나간 칸 번호들을 준다.
// 되감기(뒤로)·건너뛰기(3초 초과)·정지(그대로)는 빈 배열 — 실제로 본 것이 아니다.
export function bucketsForStep(prevSec, curSec) {
  const delta = curSec - prevSec
  if (!(delta > 0) || delta > MAX_STEP_SEC) return []
  const from = Math.floor(prevSec / BUCKET_SEC)
  const to = Math.floor(curSec / BUCKET_SEC)
  const out = []
  for (let b = from; b <= to; b += 1) out.push(b)
  return out
}

// 750 → "12:30", 3723 → "1:02:03"
export function formatClock(sec) {
  const total = Number.isFinite(sec) && sec > 0 ? Math.floor(sec) : 0
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const ss = String(s).padStart(2, '0')
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`
}

export function progressStatus(row) {
  if (!row) return 'none'
  return row.completedAt ? 'done' : 'watching'
}

// 실제로 본 시간의 비율. 길이를 모르면 0 — 나누기 0 으로 NaN 이 화면에 뜨지 않게
export function watchedPercent(row) {
  if (!row?.durationSec) return 0
  return Math.min(100, Math.round((row.watchedSec / row.durationSec) * 100))
}

export function shouldOfferResume(row) {
  return Boolean(row && !row.completedAt && row.lastPositionSec >= RESUME_MIN_SEC)
}

const ORDER = { none: 0, watching: 1, done: 2 }

// 교사 시청 현황: 반 학생 전원 + 각자의 기록. 챙길 학생(안 봄)이 위로 온다
export function buildRoster(students, rows) {
  const byStudent = new Map(rows.map((r) => [r.studentId, r]))
  return students
    .map((student) => {
      const row = byStudent.get(student.id)
      return { student, row, status: progressStatus(row) }
    })
    .sort((a, b) => ORDER[a.status] - ORDER[b.status] || a.student.name.localeCompare(b.student.name, 'ko'))
}

export function summarizeRoster(roster) {
  const count = (s) => roster.filter((r) => r.status === s).length
  return { done: count('done'), watching: count('watching'), none: count('none'), total: roster.length }
}

// 목록 카드에 붙는 작은 표시.
// 학생은 자기 기록(0~1줄), 교사·관리자는 그 영상의 기록 전부를 받는다
export function cardProgressLabel(role, rows, studentCount) {
  if (role === 'student') {
    const row = rows[0]
    if (!row) return null
    return row.completedAt ? '✓ 완료' : `${watchedPercent(row)}%`
  }
  if (!studentCount) return null
  return `완료 ${rows.filter((r) => r.completedAt).length}/${studentCount}`
}
