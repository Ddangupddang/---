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
