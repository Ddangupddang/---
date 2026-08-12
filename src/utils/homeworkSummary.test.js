// src/utils/homeworkSummary.test.js
import { describe, it, expect } from 'vitest'
import { weekHomeworkSummary } from './homeworkSummary'

const WEEK = '2026-08-10'   // 월요일
const ME = { id: 1, grade: 5, jeongsiLevel: 2 }

// 이번 주: 내신(고2) 월·수, 정시(2레벨) 화
const base = () => ({
  sets: [
    { id: 11, category: 'naesin',  target: 5, weekStart: WEEK },
    { id: 12, category: 'jeongsi', target: 2, weekStart: WEEK },
    { id: 13, category: 'naesin',  target: 5, weekStart: '2026-08-03' }, // 지난 주
    { id: 14, category: 'naesin',  target: 1, weekStart: WEEK },         // 중1 — 남의 것
  ],
  days: [
    { id: 110, setId: 11, weekday: 1, date: '2026-08-10' },
    { id: 111, setId: 11, weekday: 3, date: '2026-08-12' },
    { id: 120, setId: 12, weekday: 2, date: '2026-08-11' },
    { id: 130, setId: 13, weekday: 1, date: '2026-08-03' },
    { id: 140, setId: 14, weekday: 1, date: '2026-08-10' },
  ],
  submissions: [],
  student: ME,
  weekStart: WEEK,
  today: '2026-08-11',
})

describe('weekHomeworkSummary — 대상 고르기', () => {
  it('이번 주 + 내 그룹의 과제만 센다', () => {
    const r = weekHomeworkSummary(base())
    // 내신 월·수 + 정시 화 = 3개 (지난 주와 중1 것은 제외)
    expect(r.total).toBe(3)
  })

  it('정시 레벨이 없는 학생에게는 정시 과제를 세지 않는다', () => {
    const r = weekHomeworkSummary({ ...base(), student: { id: 1, grade: 5, jeongsiLevel: null } })
    expect(r.total).toBe(2)
  })

  it('이번 주 과제가 없으면 0으로 답한다', () => {
    const r = weekHomeworkSummary({ ...base(), weekStart: '2026-09-07' })
    expect(r).toMatchObject({ total: 0, submitted: 0, pending: [] })
  })
})

describe('weekHomeworkSummary — 제출/미제출', () => {
  it('제출한 것은 세고 미제출만 pending에 담는다', () => {
    const d = base()
    d.submissions = [{ dayId: 110, studentId: 1 }]
    const r = weekHomeworkSummary(d)

    expect(r).toMatchObject({ total: 3, submitted: 1 })
    expect(r.pending.map((p) => p.dayId)).toEqual([120, 111]) // 날짜순
  })

  it('다른 학생의 제출은 내 것으로 세지 않는다', () => {
    const d = base()
    d.submissions = [{ dayId: 110, studentId: 999 }]
    expect(weekHomeworkSummary(d).submitted).toBe(0)
  })

  it('마감일이 지난 미제출은 overdue로 표시한다', () => {
    // 오늘 08-11 기준: 월(08-10)은 지났고, 수(08-12)는 남았다
    const r = weekHomeworkSummary(base())
    const byId = Object.fromEntries(r.pending.map((p) => [p.dayId, p]))
    expect(byId[110].overdue).toBe(true)
    expect(byId[120].overdue).toBe(false) // 오늘이 마감 — 아직 지나지 않았다
    expect(byId[111].overdue).toBe(false)
  })

  it('pending에 종류와 요일을 담아 화면이 바로 쓸 수 있게 한다', () => {
    const r = weekHomeworkSummary(base())
    const byId = Object.fromEntries(r.pending.map((p) => [p.dayId, p]))
    expect(byId[110]).toMatchObject({ category: 'naesin',  weekday: 1, date: '2026-08-10' })
    expect(byId[120]).toMatchObject({ category: 'jeongsi', weekday: 2, date: '2026-08-11' })
  })

  it('전부 제출하면 pending이 비고 submitted가 total과 같다', () => {
    const d = base()
    d.submissions = [
      { dayId: 110, studentId: 1 }, { dayId: 111, studentId: 1 }, { dayId: 120, studentId: 1 },
    ]
    const r = weekHomeworkSummary(d)
    expect(r).toMatchObject({ total: 3, submitted: 3, pending: [] })
  })
})
