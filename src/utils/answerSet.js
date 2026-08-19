// src/utils/answerSet.js
// 정답·답안을 "선지 글자를 이어 붙인 문자열"로 다루는 순수 함수.
//
// 왜 문자열인가: 선지 ①②③④⑤가 각각 한 글자라 '①③'처럼 이어 붙여도 분해가 쉽다.
// 덕분에 DB 스키마(text 컬럼)를 그대로 두고, 기존에 저장된 '③'도 원소 하나짜리
// 집합으로 그대로 읽힌다 — 마이그레이션이 필요 없다.

const CHOICES = ['①', '②', '③', '④', '⑤']

// 문자열 → 중복 없는 선지 집합
function toSet(value) {
  return new Set(value ? [...value] : [])
}

// 두 정답이 같은 집합인가. 순서는 무관하고, 하나라도 모자라거나 남으면 다르다.
// 빈 값끼리는 false — 아무것도 고르지 않은 답을 정답으로 세면 안 된다.
export function sameChoiceSet(a, b) {
  const setA = toSet(a)
  const setB = toSet(b)
  if (setA.size === 0 || setB.size === 0) return false
  if (setA.size !== setB.size) return false
  for (const c of setA) if (!setB.has(c)) return false
  return true
}

// 선지 하나를 켜고/끈다. 결과는 항상 선지 순서(①②③④⑤)로 정렬한다 —
// 누른 순서에 따라 저장 값이 달라지면 나중에 눈으로 비교하기 어렵다.
export function toggleChoice(current, choice) {
  const set = toSet(current)
  if (set.has(choice)) set.delete(choice)
  else set.add(choice)
  return CHOICES.filter((c) => set.has(c)).join('')
}
