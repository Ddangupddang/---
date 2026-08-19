// src/utils/answerSet.test.js
import { describe, it, expect } from 'vitest'
import { sameChoiceSet, toggleChoice } from './answerSet'

describe('sameChoiceSet', () => {
  it('한 개짜리 정답은 지금까지와 똑같이 비교된다', () => {
    expect(sameChoiceSet('③', '③')).toBe(true)
    expect(sameChoiceSet('③', '①')).toBe(false)
  })

  it('여러 개는 순서가 달라도 같은 집합이면 정답이다', () => {
    expect(sameChoiceSet('①③', '③①')).toBe(true)
  })

  it('덜 고르면 오답이다', () => {
    expect(sameChoiceSet('①③', '①')).toBe(false)
  })

  it('더 고르면 오답이다', () => {
    expect(sameChoiceSet('①③', '①②③')).toBe(false)
  })

  it('빈 값·null은 정답으로 치지 않는다 — 미입력을 정답으로 세면 안 된다', () => {
    expect(sameChoiceSet('', '①')).toBe(false)
    expect(sameChoiceSet('①', '')).toBe(false)
    expect(sameChoiceSet('', '')).toBe(false)
    expect(sameChoiceSet(null, null)).toBe(false)
    expect(sameChoiceSet(null, '①')).toBe(false)
    expect(sameChoiceSet(undefined, undefined)).toBe(false)
  })

  it('같은 선지가 중복돼 들어와도 집합으로 본다', () => {
    // 저장 값이 어떤 경로로든 '①①'이 되더라도 '①' 하나로 취급해야 한다
    expect(sameChoiceSet('①①', '①')).toBe(true)
  })
})

describe('toggleChoice', () => {
  it('없던 선지를 켠다', () => {
    expect(toggleChoice('', '③')).toBe('③')
    expect(toggleChoice(null, '③')).toBe('③')
  })

  it('켜져 있던 선지를 끈다', () => {
    expect(toggleChoice('③', '③')).toBe('')
  })

  it('여러 개를 켜면 선지 순서로 정렬해 돌려준다', () => {
    // 입력 순서에 따라 저장 값이 달라지면 나중에 눈으로 비교하기 어렵다
    expect(toggleChoice('③', '①')).toBe('①③')
    expect(toggleChoice('①③', '②')).toBe('①②③')
  })

  it('가운데 하나만 꺼도 나머지 순서가 유지된다', () => {
    expect(toggleChoice('①②③', '②')).toBe('①③')
  })

  it('마지막 하나를 끄면 빈 문자열이 된다 — 미입력으로 판정돼야 한다', () => {
    expect(toggleChoice('③', '③')).toBe('')
  })
})
