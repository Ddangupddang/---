// src/utils/dbRows.js
// Supabase 조회 결과를 화면에 반영할지 판단한다.
//
// "0건"과 "못 읽었다"는 다르다. 이걸 구분하지 않으면 둘 중 하나가 망가진다.
//   0건인데 화면을 안 건드리면 → 처음 넣어둔 자료가 그대로 남아 유령이 된다
//   못 읽었는데 화면을 비우면  → 멀쩡한 자료가 사라진 것처럼 보인다

// 화면에 쓸 행 목록. null이면 "이번엔 건드리지 말라"는 뜻이다.
export function rowsOrNull(res) {
  if (!res || res.error || !res.data) return null
  return res.data
}
