// src/utils/homeworkSelect.test.js
import { describe, it, expect } from 'vitest'
import { matchesStudent, dayStatus, submitDeadlineOf, canSubmitOn } from './homeworkSelect'

const student = { grade: 5, jeongsiLevel: 2, classId: 10 }

describe('matchesStudent', () => {
  it('내신: 세트의 반이 학생 반과 같으면 true', () => {
    expect(matchesStudent({ category: 'naesin', classId: 10 }, student)).toBe(true)
    expect(matchesStudent({ category: 'naesin', classId: 20 }, student)).toBe(false)
  })
  it('내신: 반이 없는 학생은 반별 과제를 받지 않는다', () => {
    expect(matchesStudent({ category: 'naesin', classId: 10 }, { ...student, classId: null })).toBe(false)
  })
  it('내신: 반별 전환 이전 세트(반 없음)는 예전처럼 학년으로 맞춘다', () => {
    expect(matchesStudent({ category: 'naesin', classId: null, target: 5 }, student)).toBe(true)
    expect(matchesStudent({ category: 'naesin', classId: null, target: 4 }, student)).toBe(false)
  })
  it('정시: 세트 target이 학생 정시레벨과 같으면 true', () => {
    expect(matchesStudent({ category: 'jeongsi', target: 2 }, student)).toBe(true)
    expect(matchesStudent({ category: 'jeongsi', target: 1 }, student)).toBe(false)
  })
  it('정시레벨 미배정(null)이면 정시 과제는 항상 false', () => {
    expect(matchesStudent({ category: 'jeongsi', target: 2 }, { grade: 5, jeongsiLevel: null })).toBe(false)
  })
})

describe('dayStatus', () => {
  const day = { date: '2026-08-10' }
  it('제출 없음 → none', () => {
    expect(dayStatus(day, undefined, '2026-08-11')).toBe('none')
  })
  it('마감일 이내 제출 → done', () => {
    expect(dayStatus(day, { submittedAt: '2026-08-10T09:00:00Z' }, '2026-08-10')).toBe('done')
  })
  it('마감일 지나 제출 → late', () => {
    expect(dayStatus(day, { submittedAt: '2026-08-11T09:00:00Z' }, '2026-08-11')).toBe('late')
  })
})

// ── 제출 기한 (2단계) ────────────────────────────────────────
// 규칙: 마감 다음날까지 받는다. 월요일 과제는 화요일 자정까지.
describe('submitDeadlineOf', () => {
  it('마감 다음날이 마지막 날이다', () => {
    expect(submitDeadlineOf({ date: '2026-09-07' })).toBe('2026-09-08')
  })

  it('달을 넘겨도 맞다', () => {
    expect(submitDeadlineOf({ date: '2026-09-30' })).toBe('2026-10-01')
  })

  it('해를 넘겨도 맞다', () => {
    expect(submitDeadlineOf({ date: '2026-12-31' })).toBe('2027-01-01')
  })
})

describe('canSubmitOn', () => {
  const day = { date: '2026-09-07' }   // 월요일 과제

  it('마감일 당일에는 낼 수 있다', () => {
    expect(canSubmitOn(day, '2026-09-07')).toBe(true)
  })

  it('마감 다음날에도 낼 수 있다 (지각으로 표시된다)', () => {
    expect(canSubmitOn(day, '2026-09-08')).toBe(true)
  })

  it('그 다음날부터는 못 낸다', () => {
    expect(canSubmitOn(day, '2026-09-09')).toBe(false)
  })

  it('한참 지나도 못 낸다', () => {
    expect(canSubmitOn(day, '2026-10-01')).toBe(false)
  })

  it('교사가 열어주면 기한과 무관하게 낼 수 있다', () => {
    expect(canSubmitOn(day, '2026-10-01', true)).toBe(true)
  })
})

describe('dayStatus (기한 반영)', () => {
  const day = { date: '2026-09-07' }
  const sub = { submittedAt: '2026-09-07T05:00:00Z' }

  it('아직 낼 수 있으면 미제출', () => {
    expect(dayStatus(day, null, '2026-09-08')).toBe('none')
  })

  it('기한까지 지났으면 마감 — 미제출과 구분한다', () => {
    expect(dayStatus(day, null, '2026-09-09')).toBe('closed')
  })

  it('열어준 요일은 기한이 지나도 미제출로 본다', () => {
    expect(dayStatus(day, null, '2026-09-09', true)).toBe('none')
  })

  it('제출했으면 기한과 무관하게 제출완료', () => {
    expect(dayStatus(day, sub, '2026-10-01')).toBe('done')
  })
})
