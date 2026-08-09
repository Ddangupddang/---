// 주 시작(월요일)·요일→날짜 계산. 시간대 영향을 없애려고 UTC로만 계산한다.

// 'YYYY-MM-DD' → 그 주의 월요일 'YYYY-MM-DD'
export function mondayOf(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  const dow = dt.getUTCDay()             // 0=일 … 6=토
  const diff = dow === 0 ? -6 : 1 - dow  // 월요일까지 이동
  dt.setUTCDate(dt.getUTCDate() + diff)
  return dt.toISOString().slice(0, 10)
}

// 주 시작(월요일) + 요일(1=월 … 6=토) → 실제 날짜 'YYYY-MM-DD'
export function dateForWeekday(weekStart, weekday) {
  const [y, m, d] = weekStart.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() + (weekday - 1))
  return dt.toISOString().slice(0, 10)
}
