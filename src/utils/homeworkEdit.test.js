// src/utils/homeworkEdit.test.js
import { describe, it, expect } from 'vitest'
import { homeworkEditImpact } from './homeworkEdit'

// 기존 세트: 월요일 2문항(정답 ①②) + 화요일 1문항(정답 ③)
// 제출: 월요일에 2명, 화요일에 0명
const base = () => ({
  days: [
    { id: 110, weekday: 1, questionCount: 2 },
    { id: 111, weekday: 2, questionCount: 1 },
  ],
  questions: [
    { dayId: 110, number: 1, answer: '①' },
    { dayId: 110, number: 2, answer: '②' },
    { dayId: 111, number: 1, answer: '③' },
  ],
  submissions: [
    { dayId: 110, studentId: 1 },
    { dayId: 110, studentId: 2 },
  ],
})

// 기존과 완전히 같은 내용의 nextDays
const sameAsBase = () => [
  { weekday: 1, questionCount: 2, questions: [{ number: 1, answer: '①' }, { number: 2, answer: '②' }] },
  { weekday: 2, questionCount: 1, questions: [{ number: 1, answer: '③' }] },
]

describe('homeworkEditImpact — 경고 없음', () => {
  it('바뀐 게 없으면 경고가 없다', () => {
    const r = homeworkEditImpact({ ...base(), nextDays: sameAsBase() })
    expect(r.warnings).toEqual([])
    expect(r.destructive).toBe(false)
  })

  it('제출이 없는 요일은 정답을 바꿔도 경고하지 않는다', () => {
    // 화요일은 제출 0건 → 아무에게도 영향이 없다
    const next = sameAsBase()
    next[1].questions[0].answer = '⑤'
    const r = homeworkEditImpact({ ...base(), nextDays: next })
    expect(r.warnings).toEqual([])
  })

  it('제출이 없는 요일은 사용 해제해도 경고하지 않는다', () => {
    const next = sameAsBase().filter((d) => d.weekday !== 2)
    const r = homeworkEditImpact({ ...base(), nextDays: next })
    expect(r.warnings).toEqual([])
    expect(r.destructive).toBe(false)
  })

  it('요일을 새로 추가하는 것은 경고 대상이 아니다', () => {
    const next = [...sameAsBase(), { weekday: 3, questionCount: 1, questions: [{ number: 1, answer: '④' }] }]
    const r = homeworkEditImpact({ ...base(), nextDays: next })
    expect(r.warnings).toEqual([])
  })
})

describe('homeworkEditImpact — 정답 변경', () => {
  it('제출이 있는 요일의 정답을 바꾸면 영향받는 인원을 알려준다', () => {
    const next = sameAsBase()
    next[0].questions[1].answer = '④' // 월요일 2번 ② → ④
    const r = homeworkEditImpact({ ...base(), nextDays: next })

    expect(r.warnings).toHaveLength(1)
    expect(r.warnings[0]).toMatchObject({ type: 'answerChanged', weekday: 1, students: 2, questions: 1 })
    expect(r.warnings[0].message).toContain('2명')
    expect(r.destructive).toBe(false) // 다시 계산될 뿐, 지워지지 않는다
  })

  it('여러 문항의 정답을 바꾸면 바뀐 문항 수를 센다', () => {
    const next = sameAsBase()
    next[0].questions[0].answer = '⑤'
    next[0].questions[1].answer = '④'
    const r = homeworkEditImpact({ ...base(), nextDays: next })
    expect(r.warnings[0].questions).toBe(2)
  })
})

describe('homeworkEditImpact — 문항 수 변경', () => {
  it('문항이 늘면 이미 제출한 학생은 오답 처리된다고 알린다', () => {
    const next = sameAsBase()
    next[0] = {
      weekday: 1, questionCount: 3,
      questions: [{ number: 1, answer: '①' }, { number: 2, answer: '②' }, { number: 3, answer: '③' }],
    }
    const r = homeworkEditImpact({ ...base(), nextDays: next })
    expect(r.warnings).toHaveLength(1)
    expect(r.warnings[0]).toMatchObject({ type: 'countIncreased', weekday: 1, students: 2, from: 2, to: 3 })
    expect(r.warnings[0].message).toContain('오답')
  })

  it('문항이 줄면 만점이 바뀐다고 알린다', () => {
    const next = sameAsBase()
    next[0] = { weekday: 1, questionCount: 1, questions: [{ number: 1, answer: '①' }] }
    const r = homeworkEditImpact({ ...base(), nextDays: next })
    expect(r.warnings).toHaveLength(1)
    expect(r.warnings[0]).toMatchObject({ type: 'countDecreased', weekday: 1, students: 2, from: 2, to: 1 })
  })
})

describe('homeworkEditImpact — 요일 삭제(되돌릴 수 없음)', () => {
  it('제출이 있는 요일을 사용 해제하면 삭제 경고를 내고 destructive로 표시한다', () => {
    const next = sameAsBase().filter((d) => d.weekday !== 1)
    const r = homeworkEditImpact({ ...base(), nextDays: next })

    expect(r.warnings).toHaveLength(1)
    expect(r.warnings[0]).toMatchObject({ type: 'dayRemoved', weekday: 1, students: 2 })
    expect(r.warnings[0].message).toContain('영구 삭제')
    expect(r.destructive).toBe(true)
  })

  it('삭제 경고를 가장 위에 놓는다', () => {
    // 월요일 삭제(되돌릴 수 없음) + 화요일 정답 변경(제출 있음)
    const withTueSubs = base()
    withTueSubs.submissions.push({ dayId: 111, studentId: 3 })
    const next = [{ weekday: 2, questionCount: 1, questions: [{ number: 1, answer: '⑤' }] }]

    const r = homeworkEditImpact({ ...withTueSubs, nextDays: next })
    expect(r.warnings).toHaveLength(2)
    expect(r.warnings[0].type).toBe('dayRemoved')
    expect(r.destructive).toBe(true)
  })
})
