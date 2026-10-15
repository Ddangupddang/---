// src/utils/gradeStats.js
// 성적 화면의 계산 — 그래프 점과 강점·보완 파트. 화면과 떼어 테스트한다.

// 백분율(0~100). 만점이 비면 100점 만점으로 본다.
const pct = (g) => (g.score / (g.total || 100)) * 100

// 날짜별 평균 — 그래프의 점 하나가 하루다.
// 주간 테스트는 같은 날 파트 4개를 함께 보므로, 시험마다 점을 찍으면
// 같은 날짜 라벨이 네 번 겹쳐 x축 글자가 붙어 버린다(390px에서 읽을 수 없었다).
// grades: [{ date: 'YYYY-MM-DD', score, total }] → [{ label: 'MM-DD', value: 평균%, max: 100 }]
export function dailyAverages(grades = []) {
  const byDate = {}
  for (const g of grades) {
    if (!byDate[g.date]) byDate[g.date] = { sum: 0, cnt: 0 }
    byDate[g.date].sum += pct(g)
    byDate[g.date].cnt += 1
  }
  return Object.entries(byDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ label: date.slice(5), value: Math.round(v.sum / v.cnt), max: 100 }))
}

// 강점·보완 파트 — 내 전체 평균보다 높은 파트가 강점, 낮은 파트가 보완이다(각 최대 2개).
// 예전에는 순위로 위 2개·아래 2개를 잘랐다. 파트가 4개면 85%짜리도 86%짜리와
// 1%p 차이로 "보완"이 됐다. 평균과 같은 파트는 어느 쪽에도 넣지 않는다.
// grades: [{ part, score, total }] → { strong: [{ part, avg }], weak: [{ part, avg }], parts }
export function partStrengths(grades = [], limit = 2) {
  const withPart = grades.filter((g) => g.part)
  if (withPart.length === 0) return { strong: [], weak: [], parts: [] }

  const byPart = {}
  for (const g of withPart) {
    if (!byPart[g.part]) byPart[g.part] = { sum: 0, cnt: 0 }
    byPart[g.part].sum += pct(g)
    byPart[g.part].cnt += 1
  }
  const parts = Object.entries(byPart)
    .map(([part, v]) => ({ part, exact: v.sum / v.cnt, avg: Math.round(v.sum / v.cnt) }))
    .sort((a, b) => b.exact - a.exact)
  const overall = withPart.reduce((s, g) => s + pct(g), 0) / withPart.length

  const strip = ({ part, avg }) => ({ part, avg })
  return {
    strong: parts.filter((p) => p.exact > overall).slice(0, limit).map(strip),
    weak:   parts.filter((p) => p.exact < overall).reverse().slice(0, limit).map(strip),
    parts:  parts.map(strip),
  }
}
