// src/utils/homeworkStats.test.js
import { describe, it, expect } from 'vitest'
import { questionStats } from './homeworkStats'

// 2문항: 1번 정답 ①, 2번 정답 ②
const QUESTIONS = [
  { number: 1, answer: '①' },
  { number: 2, answer: '②' },
]

// 3명 제출: 1번은 모두 맞음, 2번은 2명이 ④로 몰려 틀림
const SUBS = [
  { studentId: 1, answers: [{ number: 1, answer: '①' }, { number: 2, answer: '②' }] },
  { studentId: 2, answers: [{ number: 1, answer: '①' }, { number: 2, answer: '④' }] },
  { studentId: 3, answers: [{ number: 1, answer: '①' }, { number: 2, answer: '④' }] },
]

describe('questionStats — 집계', () => {
  it('문항별 정답·오답 수를 센다', () => {
    const [q1, q2] = questionStats(QUESTIONS, SUBS)
    expect(q1).toMatchObject({ number: 1, answer: '①', correct: 3, wrong: 0 })
    expect(q2).toMatchObject({ number: 2, answer: '②', correct: 1, wrong: 2 })
  })

  it('오답률을 백분율로 낸다', () => {
    const [q1, q2] = questionStats(QUESTIONS, SUBS)
    expect(q1.wrongRate).toBe(0)
    expect(q2.wrongRate).toBe(67) // 2/3 반올림
  })

  it('문항 순서를 그대로 유지한다', () => {
    expect(questionStats(QUESTIONS, SUBS).map((q) => q.number)).toEqual([1, 2])
  })

  it('제출이 없으면 오답률은 판단할 수 없어 null이다', () => {
    const [q1] = questionStats(QUESTIONS, [])
    expect(q1).toMatchObject({ correct: 0, wrong: 0, blank: 0, wrongRate: null })
  })
})

describe('questionStats — 가장 많이 고른 오답', () => {
  it('오답이 몰린 선지를 집어준다', () => {
    const [, q2] = questionStats(QUESTIONS, SUBS)
    expect(q2.topWrong).toEqual({ choice: '④', count: 2 })
  })

  it('오답이 없으면 topWrong은 null이다', () => {
    const [q1] = questionStats(QUESTIONS, SUBS)
    expect(q1.topWrong).toBeNull()
  })

  it('오답이 갈리면 가장 많이 고른 것을 고르고, 같으면 앞 선지를 쓴다', () => {
    const subs = [
      { studentId: 1, answers: [{ number: 2, answer: '③' }] },
      { studentId: 2, answers: [{ number: 2, answer: '⑤' }] },
    ]
    const [, q2] = questionStats(QUESTIONS, subs)
    expect(q2.topWrong).toEqual({ choice: '③', count: 1 })
  })
})

describe('questionStats — 답이 없는 경우', () => {
  // 출제 후 문항 수를 늘리면 이미 제출한 학생에게는 그 문항의 답이 없다
  it('답을 내지 않은 문항은 blank로 세고 오답률 분모에서 뺀다', () => {
    const subs = [
      { studentId: 1, answers: [{ number: 1, answer: '①' }] }, // 2번 답 없음
      { studentId: 2, answers: [{ number: 1, answer: '③' }, { number: 2, answer: '②' }] },
    ]
    const [q1, q2] = questionStats(QUESTIONS, subs)
    expect(q1).toMatchObject({ correct: 1, wrong: 1, blank: 0, wrongRate: 50 })
    // 2번은 1명만 답했고 그 1명은 맞음 → 오답률 0%
    expect(q2).toMatchObject({ correct: 1, wrong: 0, blank: 1, wrongRate: 0 })
  })

  it('아무도 답하지 않은 문항의 오답률은 null이다', () => {
    const subs = [{ studentId: 1, answers: [{ number: 1, answer: '①' }] }]
    const [, q2] = questionStats(QUESTIONS, subs)
    expect(q2).toMatchObject({ blank: 1, wrongRate: null })
  })
})
