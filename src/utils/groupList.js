// src/utils/groupList.js
// 목록을 묶음으로 나눈다. 화면이 길어지는 곳에서 접어두기 위해 쓴다.

// 들어온 순서를 지키면서 같은 키끼리 묶는다.
// 목록은 이미 정렬돼서 들어오므로 여기서 순서를 바꾸면 안 된다.
export function groupBy(items = [], keyOf) {
  const map = new Map()
  for (const item of items ?? []) {
    const key = keyOf(item)
    if (!map.has(key)) map.set(key, [])
    map.get(key).push(item)
  }
  return [...map.entries()].map(([key, groupItems]) => ({ key, items: groupItems }))
}
