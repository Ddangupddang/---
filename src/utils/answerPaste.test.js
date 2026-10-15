// src/utils/answerPaste.test.js
import { describe, it, expect } from 'vitest'
import { parseAnswerList, splitEvenly, distributeAnswers } from './answerPaste'

describe('splitEvenly — 고르게 나누고 남는 건 앞 요일부터', () => {
  it('6의 배수면 똑같이 나눈다', () => {
    expect(splitEvenly(36)).toEqual([6, 6, 6, 6, 6, 6])
  })
  it('40문항 → 7,7,7,7,6,6', () => {
    expect(splitEvenly(40)).toEqual([7, 7, 7, 7, 6, 6])
  })
  it('31문항 → 6,5,5,5,5,5 (마지막 날이 1문항이 되지 않는다)', () => {
    expect(splitEvenly(31)).toEqual([6, 5, 5, 5, 5, 5])
  })
  it('6문항보다 적으면 뒤 요일은 0이다', () => {
    expect(splitEvenly(4)).toEqual([1, 1, 1, 1, 0, 0])
  })
})

describe('parseAnswerList', () => {
  it('정답만 나열한 숫자를 읽는다', () => {
    expect(parseAnswerList('3 1 5\n2 4')).toEqual({ answers: ['③', '①', '⑤', '②', '④'], error: '' })
  })
  it('붙여 쓴 원문자는 한 글자가 한 문항이다', () => {
    expect(parseAnswerList('③①⑤').answers).toEqual(['③', '①', '⑤'])
  })
  it('복수 정답은 + 로 쓰고 선지 순서로 정리한다', () => {
    expect(parseAnswerList('4+2 1').answers).toEqual(['②④', '①'])
  })
  it('번호 붙은 정답표를 읽는다 (구분자 . ) 번 섞여도)', () => {
    expect(parseAnswerList('1. ③  2) 1\n3번 ⑤ 4: 2+4').answers).toEqual(['③', '①', '⑤', '②④'])
  })
  it('번호 순서가 섞여 있어도 번호대로 놓는다', () => {
    expect(parseAnswerList('2.1 1.3').answers).toEqual(['③', '①'])
  })
  it('빠진 번호를 알려 주고 아무것도 채우지 않는다', () => {
    expect(parseAnswerList('1.3 2.1 4.5')).toEqual({ answers: [], error: '3번 정답이 없습니다.' })
  })
  it('겹치는 번호를 알려 준다', () => {
    expect(parseAnswerList('1.3 2.1 2.5').error).toBe('2번이 두 번 나옵니다.')
  })
  it('날짜 같은 글이 섞이면 정답표만 붙여넣으라고 한다', () => {
    expect(parseAnswerList('2026. 10. 15\n1.3 2.1').error).toMatch(/정답표 부분만/)
  })
  it('1~5가 아닌 값은 몇 번째인지 알려 준다', () => {
    expect(parseAnswerList('3 1 7').error).toMatch(/3번째 값 "7"/)
  })
  it('빈 글은 오류가 아니다', () => {
    expect(parseAnswerList('  ')).toEqual({ answers: [], error: '' })
  })
})

describe('distributeAnswers', () => {
  it('시험지 번호를 그대로 키로 쓰고, 요일의 첫·끝 번호(from~to)를 함께 준다', () => {
    const answers = Array.from({ length: 8 }, (_, i) => ['①', '②', '③', '④', '⑤'][i % 5])
    const days = distributeAnswers(answers)
    // 8 → 2,2,1,1,1,1
    expect(days[1]).toEqual({ count: 2, answers: { 1: '①', 2: '②' }, from: 1, to: 2 })
    expect(days[2]).toEqual({ count: 2, answers: { 3: '③', 4: '④' }, from: 3, to: 4 })
    expect(days[3]).toEqual({ count: 1, answers: { 5: '⑤' }, from: 5, to: 5 })
    expect(days[6]).toEqual({ count: 1, answers: { 8: '③' }, from: 8, to: 8 })
  })
})
