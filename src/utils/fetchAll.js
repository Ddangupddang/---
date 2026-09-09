// src/utils/fetchAll.js
// Supabase에서 표를 통째로 받아온다.
//
// Supabase는 한 번에 최대 1,000행만 돌려준다. 범위를 지정하지 않으면
// 그 이상은 에러 없이 조용히 잘린다. 그래서 과제 문항이 1,072행이 되던 날
// 최신 72개가 화면에 아예 안 나왔다 — 교사가 방금 만든 과제의 정답이
// 재로그인하면 전부 풀려 있었고, 학생 화면에는 과제가 뜨지 않았다.
//
// 질의를 그대로 받지 않고 "질의를 만드는 함수"를 받는다.
// Supabase 질의 객체는 한 번 실행하면 다시 못 쓰기 때문이다.

export const FETCH_PAGE = 1000

// 응답이 계속 가득 차서 끝나지 않는 경우를 대비한 상한.
// 5만 행이면 이 앱에서는 있을 수 없는 크기다.
const MAX_PAGES = 50

export async function fetchAllRows(makeQuery) {
  const all = []

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const from = page * FETCH_PAGE
    const { data, error } = await makeQuery().range(from, from + FETCH_PAGE - 1)

    if (error) return { data: null, error }
    all.push(...(data ?? []))

    // 한 쪽을 다 못 채웠으면 끝이다
    if (!data || data.length < FETCH_PAGE) return { data: all, error: null }
  }

  console.error(`fetchAllRows: ${MAX_PAGES}쪽에서 멈췄다. 표가 예상보다 크다.`)
  return { data: all, error: null }
}
