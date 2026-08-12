import { describe, it, expect } from 'vitest'
import { mondayOf, dateForWeekday, weekDates } from './homeworkWeek'

describe('mondayOf', () => {
  it('수요일(2026-08-12)이 속한 주의 월요일은 2026-08-10', () => {
    expect(mondayOf('2026-08-12')).toBe('2026-08-10')
  })
  it('월요일을 넣으면 그대로 반환', () => {
    expect(mondayOf('2026-08-10')).toBe('2026-08-10')
  })
  it('일요일(2026-08-16)은 그 주 시작 월요일 2026-08-10', () => {
    expect(mondayOf('2026-08-16')).toBe('2026-08-10')
  })
})

describe('dateForWeekday', () => {
  it('월(1)은 주 시작 그대로', () => {
    expect(dateForWeekday('2026-08-10', 1)).toBe('2026-08-10')
  })
  it('토(6)는 +5일', () => {
    expect(dateForWeekday('2026-08-10', 6)).toBe('2026-08-15')
  })
  it('월말을 넘는 계산도 정확 (2026-08-31 월 → 토는 2026-09-05)', () => {
    expect(dateForWeekday('2026-08-31', 6)).toBe('2026-09-05')
  })
})

describe('weekDates', () => {
  it('주 시작(월요일)부터 토요일까지 6일을 돌려준다', () => {
    expect(weekDates('2026-08-10')).toEqual([
      '2026-08-10', '2026-08-11', '2026-08-12',
      '2026-08-13', '2026-08-14', '2026-08-15',
    ])
  })

  it('월을 넘어가도 날짜가 이어진다', () => {
    expect(weekDates('2026-08-31')).toEqual([
      '2026-08-31', '2026-09-01', '2026-09-02',
      '2026-09-03', '2026-09-04', '2026-09-05',
    ])
  })
})
