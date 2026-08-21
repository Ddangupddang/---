// src/utils/homeworkPending.test.js
import { describe, it, expect } from 'vitest'
import { pendingHomeworkCount } from './homeworkPending'

// 2026-08-17(월) 주. 오늘은 수요일 2026-08-19로 두고 본다.
const WEEK = '2026-08-17'
const WED = '2026-08-19'

// 고2(학년 5) 두 명, 정시 2레벨은 한 명만
const STUDENTS = [
  { id: 1, name: '가', grade: 5, jeongsiLevel: 2 },
  { id: 2, name: '나', grade: 5, jeongsiLevel: null },
]
const SETS = [{ id: 11, category: 'naesin', target: 5, weekStart: WEEK }]
const DAYS = [
  { id: 110, setId: 11, weekday: 1, date: '2026-08-17' }, // 월 — 마감 지남
  { id: 112, setId: 11, weekday: 3, date: WED },          // 수 — 오늘
  { id: 115, setId: 11, weekday: 5, date: '2026-08-21' }, // 금 — 아직
]

const count = (over) =>
  pendingHomeworkCount({ students: STUDENTS, sets: SETS, days: DAYS, submissions: [], today: WED, ...over })

describe('pendingHomeworkCount', () => {
  it('아무도 안 냈으면 대상 학생 전원을 센다', () => {
    expect(count()).toBe(2)
  })

  it('마감이 안 지난 요일만 안 낸 학생은 세지 않는다', () => {
    // 월·수는 냈고 금(아직 마감 전)만 안 낸 상태
    const submissions = [
      { dayId: 110, studentId: 1 }, { dayId: 112, studentId: 1 },
      { dayId: 110, studentId: 2 }, { dayId: 112, studentId: 2 },
    ]
    expect(count({ submissions })).toBe(0)
  })

  it('한 학생이 여러 날 빼먹어도 1명으로 센다', () => {
    // 2번 학생만 월·수 모두 냈다 → 1번 학생 한 명만 남는다
    const submissions = [{ dayId: 110, studentId: 2 }, { dayId: 112, studentId: 2 }]
    expect(count({ submissions })).toBe(1)
  })

  it('오늘 마감인 과제도 센다', () => {
    // 월요일은 둘 다 냈고, 오늘(수)은 아무도 안 냈다
    const submissions = [{ dayId: 110, studentId: 1 }, { dayId: 110, studentId: 2 }]
    expect(count({ submissions })).toBe(2)
  })

  it('지난 주 과제는 세지 않는다', () => {
    const sets = [{ id: 11, category: 'naesin', target: 5, weekStart: '2026-08-10' }]
    expect(count({ sets })).toBe(0)
  })

  it('학년이 다르면 그 과제는 배정되지 않는다', () => {
    const students = [{ id: 3, name: '다', grade: 1, jeongsiLevel: null }]
    expect(count({ students })).toBe(0)
  })

  it('정시 레벨이 없는 학생은 정시과제에서 빠진다', () => {
    const sets = [{ id: 11, category: 'jeongsi', target: 2, weekStart: WEEK }]
    // 1번(2레벨)만 대상, 2번(레벨 없음)은 제외
    expect(count({ sets })).toBe(1)
  })

  it('정시 레벨이 둘 다 없으면 아무도 세지 않는다 (null끼리 걸리면 안 된다)', () => {
    const sets = [{ id: 11, category: 'jeongsi', target: null, weekStart: WEEK }]
    const students = [{ id: 2, name: '나', grade: 5, jeongsiLevel: null }]
    expect(count({ sets, students })).toBe(0)
  })

  it('마감 지난 회차가 하나도 없으면 0', () => {
    const days = [{ id: 115, setId: 11, weekday: 5, date: '2026-08-21' }]
    expect(count({ days })).toBe(0)
  })

  it('볼 수 있는 학생이 없으면 0', () => {
    expect(count({ students: [] })).toBe(0)
  })
})
