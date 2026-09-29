// src/utils/pageWindow.js
// 쪽 번호를 몇 개만 보여줄지 고른다.
//
// 번호를 전부 그리면 폰에서 화면 밖으로 밀려 뒷번호만 보인다(Q&A가 15쪽이
// 되면서 실제로 겪었다). 현재 쪽을 가운데 두고 다섯 개만 그리고,
// 앞뒤는 이전·다음 버튼으로 옮긴다.

// page를 가운데 둔 size개의 쪽 번호. 양끝에서는 안쪽으로 붙인다.
export function pageWindow(page, total, size = 5) {
  if (total <= 0) return []
  if (total <= size) return Array.from({ length: total }, (_, i) => i + 1)

  // 가운데에 두려면 앞으로 절반만큼 물러난다.
  // 1쪽에서 그냥 물러나면 0, -1이 나오므로 양끝을 잘라 붙인다.
  const half  = Math.floor(size / 2)
  const start = Math.min(Math.max(page - half, 1), total - size + 1)

  return Array.from({ length: size }, (_, i) => start + i)
}
