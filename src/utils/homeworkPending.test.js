// src/utils/homeworkPending.test.js
import { describe, it, expect } from 'vitest'
import { pendingHomeworkCount, pendingHomeworkStudents } from './homeworkPending'

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

// ── 목록 ──────────────────────────────────────────────────
// 대시보드 숫자를 누르면 "누가 무엇을 안 냈는지"를 봐야 한다.
// 세는 함수와 목록 함수가 따로 놀면 숫자와 화면이 어긋난다.
const list = (over) =>
  pendingHomeworkStudents({ students: STUDENTS, sets: SETS, days: DAYS, submissions: [], today: WED, ...over })

describe('pendingHomeworkStudents', () => {
  it('안 낸 학생만 담는다', () => {
    // 2번만 월·수 다 냈다
    const submissions = [{ dayId: 110, studentId: 2 }, { dayId: 112, studentId: 2 }]
    const rows = list({ submissions })
    expect(rows).toHaveLength(1)
    expect(rows[0].student.id).toBe(1)
  })

  it('빠뜨린 요일을 전부 담는다', () => {
    const rows = list({ submissions: [{ dayId: 110, studentId: 1 }] })
    const 가 = rows.find((r) => r.student.id === 1)
    // 1번은 월을 냈으니 수요일만 남는다
    expect(가.days.map((d) => d.day.id)).toEqual([112])
    // 2번은 월·수 둘 다 안 냈다
    const 나 = rows.find((r) => r.student.id === 2)
    expect(나.days.map((d) => d.day.id)).toEqual([110, 112])
  })

  it('빠뜨린 요일에 그 과제 세트를 같이 담는다 (화면이 무슨 과제인지 보여줘야 한다)', () => {
    const rows = list()
    expect(rows[0].days[0].set.id).toBe(11)
  })

  it('마감 전 요일은 담지 않는다', () => {
    const rows = list()
    // 금(115)은 아직 마감 전이라 어디에도 없어야 한다
    const allDayIds = rows.flatMap((r) => r.days.map((d) => d.day.id))
    expect(allDayIds).not.toContain(115)
  })

  it('요일은 날짜순으로 담는다', () => {
    const days = [
      { id: 112, setId: 11, weekday: 3, date: WED },
      { id: 110, setId: 11, weekday: 1, date: '2026-08-17' },
    ]
    expect(list({ days })[0].days.map((d) => d.day.id)).toEqual([110, 112])
  })

  it('세는 함수와 길이가 항상 같다', () => {
    const cases = [
      {},
      { submissions: [{ dayId: 110, studentId: 2 }, { dayId: 112, studentId: 2 }] },
      { students: [] },
      { days: [{ id: 115, setId: 11, weekday: 5, date: '2026-08-21' }] },
      { sets: [{ id: 11, category: 'jeongsi', target: 2, weekStart: WEEK }] },
    ]
    for (const c of cases) expect(list(c)).toHaveLength(count(c))
  })
})
