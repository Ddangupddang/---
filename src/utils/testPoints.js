// src/utils/testPoints.js
// 총점을 문항 수만큼 나눈다.
//
// 나누어떨어지지 않을 때 그냥 반올림하면 합계가 총점과 어긋난다
// (3문항 100점 → 33.3×3 = 99.9). 남는 몫을 앞 문항부터 0.1씩 얹어
// 합계가 총점과 정확히 맞게 한다. 문항 간 차이는 0.1점을 넘지 않는다.
export function distributePoints(total, count) {
  const n = Math.floor(Number(count) || 0)
  if (n <= 0) return []

  // 0.1점 단위 정수로 다뤄 소수 계산 오차(0.1+0.2 !== 0.3)를 피한다
  const units = Math.round((Number(total) || 0) * 10)
  const base = Math.floor(units / n)
  let rest = units - base * n

  return Array.from({ length: n }, () => {
    const u = base + (rest > 0 ? 1 : 0)
    if (rest > 0) rest--
    return u / 10
  })
}

// 총점이 문항 수로 나누어떨어지지 않을 때, 가까운 "딱 떨어지는 총점"을 알려준다.
// 배점이 전부 같은 시험이라 33.4/33.3처럼 갈리는 것보다 총점을 조금 고치는 편이 낫다.
// 정수 점수로만 제안한다 — 소수 배점을 피하는 게 목적이므로.
export function evenTotalSuggestions(total, count) {
  const n = Math.floor(Number(count) || 0)
  const t = Number(total) || 0
  if (n <= 0 || t <= 0) return []
  if (Number.isInteger(t) && t % n === 0) return []   // 이미 딱 떨어진다

  const lower = Math.floor(t / n) * n
  const upper = Math.ceil(t / n) * n
  return [...new Set([lower, upper])].filter((v) => v > 0)
}
