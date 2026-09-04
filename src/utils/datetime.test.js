// src/utils/datetime.test.js
import { describe, it, expect } from 'vitest'
import { formatDateTime, formatDate } from './datetime'

describe('formatDateTime', () => {
  it('UTC로 저장된 시각을 한국 시각으로 보여준다', () => {
    // 예전에는 UTC 문자열 앞부분을 그대로 잘라 써서 9시간 어긋났다
    expect(formatDateTime('2026-09-03T06:49:00+00:00')).toBe('2026-09-03 15:49')
  })

  it('날짜가 넘어가는 시각도 제대로 넘긴다', () => {
    // 밤 9시 이후에 쓴 글이 하루 전으로 보이던 문제
    expect(formatDateTime('2026-09-03T15:49:00+00:00')).toBe('2026-09-04 00:49')
  })

  it('시간대 표기가 없어도 UTC로 읽는다', () => {
    // Supabase가 돌려주는 모양이 상황에 따라 다르다
    expect(formatDateTime('2026-09-03T15:49:00')).toBe('2026-09-04 00:49')
  })

  it('보는 사람이 어디에 있든 학원 시각으로 보여준다', () => {
    // 브라우저 시간대를 따르면 해외에서 볼 때 학원 기록이 현지 시각이 된다
    expect(formatDateTime('2026-01-01T00:00:00Z')).toBe('2026-01-01 09:00')
  })

  it('값이 없거나 이상하면 빈 문자열을 준다', () => {
    expect(formatDateTime(null)).toBe('')
    expect(formatDateTime(undefined)).toBe('')
    expect(formatDateTime('')).toBe('')
    expect(formatDateTime('아무거나')).toBe('')
  })
})

describe('formatDate', () => {
  it('한국 날짜를 준다', () => {
    expect(formatDate('2026-09-03T15:49:00+00:00')).toBe('2026-09-04')
    expect(formatDate('2026-09-03T06:49:00+00:00')).toBe('2026-09-03')
  })

  it('시각이 없는 날짜는 그대로 둔다', () => {
    // 출결·성적의 date 칸은 순수 날짜다. 시간대를 적용할 대상이 아니다.
    expect(formatDate('2026-09-04')).toBe('2026-09-04')
  })

  it('값이 없으면 빈 문자열을 준다', () => {
    expect(formatDate(null)).toBe('')
    expect(formatDate('아무거나')).toBe('')
  })
})
