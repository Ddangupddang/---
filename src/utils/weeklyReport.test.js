// src/utils/weeklyReport.test.js
import { describe, it, expect } from 'vitest'
import { weeklyAttendance, weeklyTests } from './weeklyReport'

const DATES = ['2026-08-10', '2026-08-11', '2026-08-12', '2026-08-13', '2026-08-14', '2026-08-15']

describe('weeklyAttendance', () => {
  it('출석·지각·결석을 각각 세고, 지각은 출석률 분자에 포함한다', () => {
    const records = [
      { studentId: 1, date: '2026-08-10', status: 'present' },
      { studentId: 1, date: '2026-08-11', status: 'late'    },
      { studentId: 1, date: '2026-08-12', status: 'absent'  },
      { studentId: 1, date: '2026-08-13', status: 'present' },
    ]
    // 왔다는 사실(출석+지각)은 분자에 넣되, 지각은 따로 세어 감춰지지 않게 한다
    expect(weeklyAttendance(records, 1, DATES)).toEqual({
      present: 2, late: 1, absent: 1, counted: 4, rate: 75,
    })
  })

  it('그 주 기록이 하나도 없으면 null — 0%와 구별해야 한다', () => {
    const records = [{ studentId: 1, date: '2026-08-03', status: 'present' }]
    expect(weeklyAttendance(records, 1, DATES)).toBeNull()
  })

  it('다른 학생의 기록은 세지 않는다', () => {
    const records = [
      { studentId: 1, date: '2026-08-10', status: 'present' },
      { studentId: 2, date: '2026-08-10', status: 'absent'  },
    ]
    expect(weeklyAttendance(records, 1, DATES).counted).toBe(1)
  })

  it('주 범위 밖 날짜는 세지 않는다', () => {
    const records = [
      { studentId: 1, date: '2026-08-10', status: 'present' },
      { studentId: 1, date: '2026-08-16', status: 'absent'  }, // 일요일 = 범위 밖
    ]
    expect(weeklyAttendance(records, 1, DATES).counted).toBe(1)
  })
})

const STUDENT = { id: 1, name: '홍길동', classId: 10, grade: 5, jeongsiLevel: 2 }

// 만점 100점짜리 시험 두 개 (같은 주, 같은 반)
const TESTS = [
  { id: 100, classId: 10, date: '2026-08-11', title: '문학',
    questions: [{ id: 1, points: 60 }, { id: 2, points: 40 }] },
  { id: 101, classId: 10, date: '2026-08-14', title: '독서',
    questions: [{ id: 3, points: 50 }, { id: 4, points: 50 }] },
]

describe('weeklyTests', () => {
  it('채점된 시험은 득점 합계와 배점 합계를 돌려준다', () => {
    const subs = [{ testId: 100, studentId: 1, scores: [{ questionId: 1, score: 60 }, { questionId: 2, score: 12 }] }]
    const { rows } = weeklyTests({
      tests: [TESTS[0]], testSubmissions: subs, student: STUDENT, classId: 10, dates: DATES,
    })
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ score: 72, total: 100, state: 'graded' })
  })

  it('제출이 없으면 absent, 제출은 있는데 채점 전이면 grading', () => {
    const subs = [{ testId: 101, studentId: 1, scores: [] }]
    const { rows } = weeklyTests({
      tests: TESTS, testSubmissions: subs, student: STUDENT, classId: 10, dates: DATES,
    })
    expect(rows[0].state).toBe('absent')   // 100번 시험 미제출
    expect(rows[1].state).toBe('grading')  // 101번 제출했으나 미채점
    // 채점 전을 0점으로 계산하면 학생이 0점 맞은 것처럼 보인다
    expect(rows[1].score).toBeNull()
  })

  it('평균은 백분율로 낸다 — 시험마다 만점이 달라도 공평해야 한다', () => {
    const subs = [
      { testId: 100, studentId: 1, scores: [{ questionId: 1, score: 60 }, { questionId: 2, score: 20 }] }, // 80/100
      { testId: 101, studentId: 1, scores: [{ questionId: 3, score: 30 }, { questionId: 4, score: 30 }] }, // 60/100
    ]
    const { summary } = weeklyTests({
      tests: TESTS, testSubmissions: subs, student: STUDENT, classId: 10, dates: DATES,
    })
    expect(summary).toEqual({ average: 70, count: 2 })
  })

  it('채점된 시험이 하나도 없으면 average는 null, count는 시험 수', () => {
    const { summary } = weeklyTests({
      tests: TESTS, testSubmissions: [], student: STUDENT, classId: 10, dates: DATES,
    })
    expect(summary).toEqual({ average: null, count: 2 })
  })

  it('그 주에 시험이 없으면 summary는 null', () => {
    const { rows, summary } = weeklyTests({
      tests: [], testSubmissions: [], student: STUDENT, classId: 10, dates: DATES,
    })
    expect(rows).toEqual([])
    expect(summary).toBeNull()
  })

  it('다른 반 시험과 다른 주 시험은 빼고 본다', () => {
    const others = [
      { id: 200, classId: 99, date: '2026-08-11', title: '남의반', questions: [{ id: 9, points: 10 }] },
      { id: 201, classId: 10, date: '2026-08-03', title: '지난주', questions: [{ id: 9, points: 10 }] },
    ]
    const { rows } = weeklyTests({
      tests: others, testSubmissions: [], student: STUDENT, classId: 10, dates: DATES,
    })
    expect(rows).toEqual([])
  })
})
