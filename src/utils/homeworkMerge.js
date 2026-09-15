// src/utils/homeworkMerge.js
// 이미 있는 세트에 "지금 입력하던 요일"을 얹는다.
//
// 한 반의 한 주에는 세트가 하나뿐이다(DB 제약). 그래서 교사가 요일마다
// 새로 만들려 하면 두 번째부터 막힌다. 그때 입력한 것을 버리게 하지 않고
// 기존 세트로 옮겨 붙이려고 쓴다 — 15문항 정답을 다시 찍게 하면 안 된다.

// base    : 기존 세트에서 되살린 요일 상태 (weekday → day)
// pending : 방금 입력하던 요일 상태 (weekday → day)
//
// '사용'을 켠 요일만 덮어쓴다. 켜지 않은 요일까지 덮으면 기존 세트에 있던
// 다른 요일 과제가 빈 것으로 지워진다.
export function mergePendingDays(base = {}, pending = {}) {
  const out = { ...base }
  for (const [weekday, day] of Object.entries(pending)) {
    if (day?.enabled) out[weekday] = day
  }
  return out
}

// 옮겨 붙인 뒤 처음 보여줄 요일 — 방금 입력하던 것부터 보여준다.
// 기존 세트의 첫 요일을 보여주면 "내가 넣던 게 사라졌나" 싶다.
export function firstPendingWeekday(pending = {}) {
  const found = Object.entries(pending)
    .filter(([, day]) => day?.enabled)
    .map(([weekday]) => Number(weekday))
    .sort((a, b) => a - b)
  return found[0] ?? null
}
