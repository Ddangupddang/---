import { describe, it, expect } from 'vitest'
import { backlogWeeks } from './homeworkBacklog'

// 오늘은 2026-08-24(월). 이번 주는 08-24 주, 지난 주는 08-17 주다.
const TODAY = '2026-08-24'

const STUDENTS = [
  { id: 1, name: '가', grade: 5, classId: 7, jeongsiLevel: null },
  { id: 2, name: '나', grade: 5, classId: 7, jeongsiLevel: null },
]
// 지난 주(08-17) 내신 세트 — 월·수 두 회차
const SETS = [
  { id: 11, category: 'naesin', classId: 7, target: null, weekStart: '2026-08-17', title: '8월 3주' },
  { id: 21, category: 'naesin', classId: 7, target: null, weekStart: '2026-08-24', title: '8월 4주' },
]
const DAYS = [
  { id: 110, setId: 11, weekday: 1, date: '2026-08-17' },
  { id: 112, setId: 11, weekday: 3, date: '2026-08-19' },
  { id: 210, setId: 21, weekday: 1, date: '2026-08-24' }, // 이번 주
]

const run = (over) =>
  backlogWeeks({ students: STUDENTS, sets: SETS, days: DAYS, submissions: [], today: TODAY, ...over })

describe('backlogWeeks', () => {
  it('지난 주만 담는다 — 이번 주는 다른 탭에 있다', () => {
    expect(run().map((w) => w.weekStart)).toEqual(['2026-08-17'])
  })

  it('완료율은 (학생 × 요일) 중 낸 비율이다', () => {
    // 학생 2 × 요일 2 = 4건 중 1건 제출
    const [week] = run({ submissions: [{ dayId: 110, studentId: 1 }] })
    expect(week.total).toBe(4)
    expect(week.done).toBe(1)
    expect(week.rate).toBe(25)
  })

  it('안 낸 학생과 그 요일을 담는다', () => {
    const [week] = run({ submissions: [{ dayId: 110, studentId: 1 }, { dayId: 112, studentId: 1 }] })
    expect(week.students).toHaveLength(1)
    expect(week.students[0].student.id).toBe(2)
    expect(week.students[0].days.map((d) => d.day.id)).toEqual([110, 112])
  })

  it('전원이 다 낸 주도 담는다 — 끝난 주를 봐야 닫을 수 있다', () => {
    const submissions = [
      { dayId: 110, studentId: 1 }, { dayId: 112, studentId: 1 },
      { dayId: 110, studentId: 2 }, { dayId: 112, studentId: 2 },
    ]
    const [week] = run({ submissions })
    expect(week.rate).toBe(100)
    expect(week.students).toEqual([])
  })

  it('최근 주가 위로 온다', () => {
    const sets = [
      { id: 11, category: 'naesin', classId: 7, target: null, weekStart: '2026-08-17' },
      { id: 12, category: 'naesin', classId: 7, target: null, weekStart: '2026-08-10' },
    ]
    const days = [
      { id: 110, setId: 11, weekday: 1, date: '2026-08-17' },
      { id: 120, setId: 12, weekday: 1, date: '2026-08-10' },
    ]
    expect(run({ sets, days }).map((w) => w.weekStart)).toEqual(['2026-08-17', '2026-08-10'])
  })

  it('배정된 학생이 없는 세트의 주는 담지 않는다', () => {
    // 8반 과제인데 학생은 모두 7반이다 — 셀 것이 없다
    const sets = [{ id: 11, category: 'naesin', classId: 8, target: null, weekStart: '2026-08-17' }]
    expect(run({ sets })).toEqual([])
  })

  it('밀린 건수가 많은 학생이 위로 온다', () => {
    const submissions = [{ dayId: 110, studentId: 1 }]
    const [week] = run({ submissions })
    // 1번은 수요일만(1건), 2번은 월·수(2건)
    expect(week.students.map((s) => s.student.id)).toEqual([2, 1])
  })

  it('볼 수 있는 학생이 없으면 빈 목록이다', () => {
    expect(run({ students: [] })).toEqual([])
  })
})
