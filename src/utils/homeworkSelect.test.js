// src/utils/homeworkSelect.test.js
import { describe, it, expect } from 'vitest'
import { matchesStudent, dayStatus } from './homeworkSelect'

const student = { grade: 5, jeongsiLevel: 2 }

describe('matchesStudent', () => {
  it('내신: 세트 target이 학생 학년과 같으면 true', () => {
    expect(matchesStudent({ category: 'naesin', target: 5 }, student)).toBe(true)
    expect(matchesStudent({ category: 'naesin', target: 4 }, student)).toBe(false)
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
