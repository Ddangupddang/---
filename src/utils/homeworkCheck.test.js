import { describe, it, expect } from 'vitest'
import { checkSummary } from './homeworkCheck'

const questions = [
  { number: 1, answer: '①' },
  { number: 2, answer: '②' },
  { number: 3, answer: '③④' },
]

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
