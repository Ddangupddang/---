// src/utils/datetime.js
// 시각을 한국 시각으로 보여준다.
//
// DB의 created_at·answered_at 등은 UTC로 저장된다. 예전에는 그 문자열 앞부분을
// 그대로 잘라 화면에 썼는데(`.slice(0, 16)`), 그러면 9시간 어긋난다.
// 밤 9시 이후에 쓴 글은 날짜까지 하루 전으로 보였다.
//
// 시간대를 브라우저에 맡기지 않고 Asia/Seoul로 고정한다. 선생님이 해외에
// 계셔도 학원 기록은 학원 시각으로 보여야 한다.

const KST = 'Asia/Seoul'

// 시각이 없는 순수 날짜("2026-09-04")인가. 출결·성적의 date 칸이 이 모양이다.
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/

function toDate(value) {
  if (!value) return null
  // 시간대 표기가 없는 문자열을 new Date에 그대로 넣으면 브라우저마다
  // UTC로 읽기도 하고 현지 시각으로 읽기도 한다. UTC로 못박는다.
  const text = typeof value === 'string' && value.includes('T') && !/[Z+]|-\d{2}:\d{2}$/.test(value)
    ? `${value}Z`
    : value
  const d = new Date(text)
  return Number.isNaN(d.getTime()) ? null : d
}

// sv-SE 로케일은 "2026-09-04 00:49" 모양을 준다 — 조각을 직접 이어붙이지 않아도 된다
function parts(d, withTime) {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: KST,
    year: 'numeric', month: '2-digit', day: '2-digit',
    ...(withTime ? { hour: '2-digit', minute: '2-digit', hour12: false } : {}),
  }).format(d)
}

// "2026-09-04 00:49"
export function formatDateTime(value) {
  const d = toDate(value)
  return d ? parts(d, true) : ''
}

// "2026-09-04"
export function formatDate(value) {
  // 순수 날짜는 시간대를 적용할 대상이 아니다. 건드리면 하루가 밀린다.
  if (typeof value === 'string' && DATE_ONLY.test(value)) return value
  const d = toDate(value)
  return d ? parts(d, false) : ''
}
