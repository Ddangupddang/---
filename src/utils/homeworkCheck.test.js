import { describe, it, expect } from 'vitest'
import { wrongNumbers, checkSummary } from './homeworkCheck'

const questions = [
  { number: 1, answer: '①' },
  { number: 2, answer: '②' },
  { number: 3, answer: '③④' },
]

describe('wrongNumbers', () => {
  it('틀린 문항 번호만 돌려준다', () => {
    const answers = [
      { number: 1, answer: '①' },
      { number: 2, answer: '⑤' },
      { number: 3, answer: '③' },
    ]
    expect(wrongNumbers(questions, answers)).toEqual([2, 3])
  })

  it('다 맞으면 빈 배열', () => {
    const answers = [
      { number: 1, answer: '①' },
      { number: 2, answer: '②' },
      { number: 3, answer: '③④' },
    ]
    expect(wrongNumbers(questions, answers)).toEqual([])
  })

  it('답이 없는 문항도 틀린 것으로 센다', () => {
    expect(wrongNumbers(questions, [{ number: 1, answer: '①' }])).toEqual([2, 3])
  })
})

describe('checkSummary', () => {
  it('맞은 개수·전체·틀린 번호를 함께 준다', () => {
    const answers = [
      { number: 1, answer: '①' },
      { number: 2, answer: '⑤' },
      { number: 3, answer: '③④' },
    ]
    expect(checkSummary(questions, answers)).toEqual({
      correctCount: 2, total: 3, wrongNumbers: [2],
    })
  })
})
