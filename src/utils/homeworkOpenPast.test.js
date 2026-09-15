import { describe, it, expect } from 'vitest'
import { reopenedPastDays } from './homeworkOpenPast'

const me = { id: 7, classId: 3, grade: 5, jeongsiLevel: null }
const THIS_WEEK = '2026-09-14'

const sets = [
  { id: 1, category: 'naesin', classId: 3, target: null, weekStart: THIS_WEEK,  title: '이번 주' },
  { id: 2, category: 'naesin', classId: 3, target: null, weekStart: '2026-09-07', title: '지난 주' },
  { id: 3, category: 'naesin', classId: 3, target: null, weekStart: '2026-08-31', title: '지지난 주' },
  { id: 4, category: 'naesin', classId: 9, target: null, weekStart: '2026-09-07', title: '남의 반' },
  { id: 5, category: 'jeongsi', classId: null, target: 1, weekStart: '2026-09-07', title: '정시' },
]
const days = [
  { id: 10, setId: 1, weekday: 1, date: '2026-09-14' },
  { id: 20, setId: 2, weekday: 1, date: '2026-09-07' },
  { id: 21, setId: 2, weekday: 2, date: '2026-09-08' },
  { id: 30, setId: 3, weekday: 1, date: '2026-08-31' },
  { id: 40, setId: 4, weekday: 1, date: '2026-09-07' },
]
const base = { sets, days, student: me, category: 'naesin', weekStart: THIS_WEEK }

describe('reopenedPastDays', () => {
  it('열어준 것이 없으면 빈 목록', () => {
    expect(reopenedPastDays({ ...base, reopens: [] })).toEqual([])
  })

  it('나에게 열린 지난 주 요일을 준다', () => {
    const out = reopenedPastDays({ ...base, reopens: [{ dayId: 21, studentId: 7 }] })
    expect(out).toHaveLength(1)
    expect(out[0].day.id).toBe(21)
    expect(out[0].set.title).toBe('지난 주')
  })

  it('이번 주 요일은 빼고 준다 — 원래 목록에 이미 있다', () => {
    const out = reopenedPastDays({ ...base, reopens: [{ dayId: 10, studentId: 7 }] })
    expect(out).toEqual([])
  })

  it('남에게 열린 것은 주지 않는다', () => {
    const out = reopenedPastDays({ ...base, reopens: [{ dayId: 20, studentId: 999 }] })
    expect(out).toEqual([])
  })

  it('내가 받지 않는 반의 과제는 주지 않는다', () => {
    const out = reopenedPastDays({ ...base, reopens: [{ dayId: 40, studentId: 7 }] })
    expect(out).toEqual([])
  })

  it('다른 종류(정시)는 섞이지 않는다', () => {
    const out = reopenedPastDays({ ...base, reopens: [{ dayId: 20, studentId: 7 }], category: 'jeongsi' })
    expect(out).toEqual([])
  })

  it('여러 개면 날짜가 이른 것부터', () => {
    const out = reopenedPastDays({
      ...base,
      reopens: [{ dayId: 21, studentId: 7 }, { dayId: 30, studentId: 7 }],
    })
    expect(out.map((o) => o.day.id)).toEqual([30, 21])
  })

  it('학생 정보가 없으면 빈 목록', () => {
    expect(reopenedPastDays({ ...base, reopens: [{ dayId: 20, studentId: 7 }], student: null })).toEqual([])
  })
})
