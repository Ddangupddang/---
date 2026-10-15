// src/utils/answerPaste.js
// 정답표를 한 번에 붙여넣어 월~토에 나눠 채우는 순수 함수.
//
// 왜 필요한가: 시험지 한 장(예: 40문항)을 6일로 나눠 내는데, 지금은 교사가
// 요일마다 문항 수를 계산해 넣고 정답 40개를 하나씩 눌러야 한다.
// 정답표(또는 AI가 정답표를 읽어 준 결과)를 붙여넣으면 이 일을 대신한다.
//
// 받아들이는 모양 두 가지:
//   ① 번호 붙은 정답표  "1. ③  2. ①  3) 5  4번 2+4"   → 번호가 빠지거나 겹치면 알려 준다
//   ② 정답만 나열      "3 1 5 2 4 …" 또는 "③①⑤②④"   → 한 칸이 한 문항
// 복수 정답은 "2+4" 또는 "②④"처럼 쓴다.

import { WEEKDAYS } from '../constants/homework'

const CHOICES = ['①', '②', '③', '④', '⑤']
const DIGIT_TO_CHOICE = { 1: '①', 2: '②', 3: '③', 4: '④', 5: '⑤' }

// 정답 한 칸("3", "③", "2+4", "②④") → '①'~'⑤'를 이어 붙인 문자열. 못 읽으면 null.
function toAnswer(token) {
  const chars = [...token.replace(/\+/g, '')]
  if (chars.length === 0) return null
  const set = new Set()
  for (const c of chars) {
    const choice = DIGIT_TO_CHOICE[c] ?? (CHOICES.includes(c) ? c : null)
    if (!choice) return null
    set.add(choice)
  }
  // 저장 값은 항상 선지 순서로 — answerSet.toggleChoice와 같은 규칙
  return CHOICES.filter((c) => set.has(c)).join('')
}

// 번호 뒤 구분자: "1." "1)" "1:" "1번"
const NUMBERED = /(\d+)\s*(?:[.):]|번)\s*([①-⑤1-5][①-⑤1-5+]*)/g

// 붙여넣은 글 → { answers: ['③', '①', …], error: '' }
// 하나라도 못 읽으면 answers를 비우고 이유를 돌려준다 — 일부만 채우면 번호가 밀린다.
export function parseAnswerList(text) {
  const src = (text ?? '').trim()
  if (!src) return { answers: [], error: '' }

  const numbered = [...src.matchAll(NUMBERED)]
  if (numbered.length > 0) {
    const byNumber = new Map()
    const dup = []
    for (const [, num, raw] of numbered) {
      const n = Number(num)
      if (byNumber.has(n)) dup.push(n)
      byNumber.set(n, toAnswer(raw))
    }
    if (dup.length) return { answers: [], error: `${dup.join(', ')}번이 두 번 나옵니다.` }
    const last = Math.max(...byNumber.keys())
    const missing = []
    for (let n = 1; n <= last; n++) if (!byNumber.has(n)) missing.push(n)
    // 빠진 번호가 아주 많으면 날짜("2026. 10.") 같은 다른 글이 섞여 들어온 것이다
    if (missing.length > 10) return { answers: [], error: '번호를 제대로 읽지 못했습니다. 정답표 부분만 붙여넣어 주세요.' }
    if (missing.length) return { answers: [], error: `${missing.join(', ')}번 정답이 없습니다.` }
    return { answers: Array.from({ length: last }, (_, i) => byNumber.get(i + 1)), error: '' }
  }

  // 정답만 나열한 경우. 원문자는 붙여 써도 한 글자가 한 문항이다("③①⑤").
  const tokens = src.split(/[\s,/|]+/).filter(Boolean)
    .flatMap((t) => (/^[①-⑤]+$/.test(t) ? [...t] : [t]))
  const answers = []
  for (let i = 0; i < tokens.length; i++) {
    const a = toAnswer(tokens[i])
    if (!a) return { answers: [], error: `${i + 1}번째 값 "${tokens[i]}"을 읽을 수 없습니다. 정답은 1~5로 적어 주세요.` }
    answers.push(a)
  }
  return { answers, error: '' }
}

// total 문항을 days일에 고르게 나누고, 남는 문항은 앞 요일부터 하나씩 더 준다.
// 예) 40 → [7,7,7,7,6,6], 31 → [6,5,5,5,5,5]
export function splitEvenly(total, days = WEEKDAYS.length) {
  const base = Math.floor(total / days)
  const extra = total % days
  return Array.from({ length: days }, (_, i) => base + (i < extra ? 1 : 0))
}

// 정답 목록 → 요일별 { count, answers: {8: '③', …}, from, to }
// 번호는 시험지 번호 그대로다 — 화요일이 8번부터면 학생 화면에도 8번부터 보인다.
export function distributeAnswers(answers) {
  const counts = splitEvenly(answers.length)
  const result = {}
  let offset = 0
  WEEKDAYS.forEach((wd, i) => {
    const count = counts[i]
    const dayAnswers = {}
    for (let k = 1; k <= count; k++) dayAnswers[offset + k] = answers[offset + k - 1]
    result[wd] = { count, answers: dayAnswers, from: offset + 1, to: offset + count }
    offset += count
  })
  return result
}
