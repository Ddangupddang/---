// src/utils/testPoints.js
// 총점을 문항 수만큼 나눈다.
//
// 나누어떨어지지 않을 때 그냥 반올림하면 합계가 총점과 어긋난다
// (3문항 100점 → 33.3×3 = 99.9). 남는 몫을 앞 문항부터 하나씩 얹어
// 합계가 총점과 정확히 맞게 한다.
//
// 얹는 단위는 되도록 1점이다. 예전에는 0.1점씩 얹어 30문항이면 3.4점·3.3점이
// 섞였는데, 교사가 "100점으로 딱 떨어지게" 해달라고 했다 — 30문항이면
// 4점 10개 + 3점 20개 = 100점. 소수 없이는 못 나누는 경우(문항이 총점보다
// 많거나 총점이 소수)에만 0.1점 단위로 나눈다. 12.5점처럼 0.1점 단위로
// 똑같이 나뉘면 굳이 갈라 놓지 않고 그대로 준다.
export function distributePoints(total, count) {
  const n = Math.floor(Number(count) || 0)
  if (n <= 0) return []

  // 0.1점 단위 정수로 다뤄 소수 계산 오차(0.1+0.2 !== 0.3)를 피한다
  const units = Math.round((Number(total) || 0) * 10)

  // 똑같이 나뉘면(12.5점 등) 그대로, 아니면 1점(=10단위) 단위로 갈라 본다
  const step = units % n === 0 ? 1 : (units % 10 === 0 && units / 10 >= n ? 10 : 1)
  const pieces = units / step
  const base = Math.floor(pieces / n)
  let rest = pieces - base * n

  return Array.from({ length: n }, () => {
    const u = (base + (rest > 0 ? 1 : 0)) * step
    if (rest > 0) rest--
    return u / 10
  })
}

// 점수를 더한 값을 0.1점 단위로 정리한다.
// 3.4 + 3.3 + … 처럼 소수를 그냥 더하면 99.99999999 같은 값이 화면에 찍힌다.
export function sumPoints(values) {
  const units = values.reduce((acc, v) => acc + Math.round((Number(v) || 0) * 10), 0)
  return units / 10
}
