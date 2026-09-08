// src/utils/paginate.js
// 목록을 쪽으로 나눈다.

export function pageCount(total, size) {
  // 항목이 없어도 1쪽이다. 0을 주면 "1 / 0쪽" 같은 표시가 나온다.
  return Math.max(1, Math.ceil(total / size))
}

// 범위를 벗어난 쪽 번호는 양끝으로 맞춘다.
// 항목이 줄어들어 마지막 쪽이 사라졌을 때 빈 화면이 남지 않게 한다.
export function pageSlice(items = [], page, size) {
  const last  = pageCount(items.length, size)
  const safe  = Math.min(Math.max(1, page), last)
  const start = (safe - 1) * size
  return items.slice(start, start + size)
}
