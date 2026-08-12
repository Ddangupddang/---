// src/utils/weeklyReport.test.js
import { describe, it, expect } from 'vitest'
import { weeklyAttendance, weeklyTests, weeklyHomework, weeklyClassReport } from './weeklyReport'

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

const WEEK = '2026-08-10'

// 고2(grade 5) 내신 세트: 월·화·수 3일, 각 2문항
const HW = {
  sets: [
    { id: 1, category: 'naesin',  target: 5, weekStart: WEEK, title: '내신' },
    { id: 2, category: 'jeongsi', target: 2, weekStart: WEEK, title: '정시' },
    { id: 3, category: 'naesin',  target: 5, weekStart: '2026-08-03', title: '지난주' },
  ],
  days: [
    { id: 11, setId: 1, weekday: 1, date: '2026-08-10', questionCount: 2 },
    { id: 12, setId: 1, weekday: 2, date: '2026-08-11', questionCount: 2 },
    { id: 13, setId: 1, weekday: 3, date: '2026-08-12', questionCount: 2 },
    { id: 21, setId: 2, weekday: 1, date: '2026-08-10', questionCount: 2 },
    { id: 31, setId: 3, weekday: 1, date: '2026-08-03', questionCount: 2 },
  ],
  questions: [
    { id: 111, dayId: 11, number: 1, answer: '①' }, { id: 112, dayId: 11, number: 2, answer: '②' },
    { id: 121, dayId: 12, number: 1, answer: '③' }, { id: 122, dayId: 12, number: 2, answer: '④' },
    { id: 131, dayId: 13, number: 1, answer: '⑤' }, { id: 132, dayId: 13, number: 2, answer: '①' },
    { id: 211, dayId: 21, number: 1, answer: '①' }, { id: 212, dayId: 21, number: 2, answer: '②' },
  ],
}

describe('weeklyHomework', () => {
  it('제출한 요일 수와 정답률을 계산한다', () => {
    // 월요일: 2문항 다 맞음 / 화요일: 1문항만 맞음 / 수요일: 미제출
    const submissions = [
      { dayId: 11, studentId: 1, answers: [{ number: 1, answer: '①' }, { number: 2, answer: '②' }] },
      { dayId: 12, studentId: 1, answers: [{ number: 1, answer: '③' }, { number: 2, answer: '⑤' }] },
    ]
    expect(weeklyHomework({
      ...HW, submissions, student: STUDENT, category: 'naesin', weekStart: WEEK,
    })).toEqual({
      submitted: 2, total: 3, submitRate: 67,
      // 낸 2회차 4문항 중 3개 정답 = 75%. 안 낸 수요일 문항은 분모에 넣지 않는다.
      correctRate: 75,
    })
  })

  it('하나도 안 냈으면 제출률 0, 정답률은 null', () => {
    expect(weeklyHomework({
      ...HW, submissions: [], student: STUDENT, category: 'naesin', weekStart: WEEK,
    })).toEqual({ submitted: 0, total: 3, submitRate: 0, correctRate: null })
  })

  it('배정된 세트가 없으면 null — 제출률 0%와 구별해야 한다', () => {
    const noLevel = { ...STUDENT, jeongsiLevel: null }
    expect(weeklyHomework({
      ...HW, submissions: [], student: noLevel, category: 'jeongsi', weekStart: WEEK,
    })).toBeNull()
  })

  it('학생의 학년·레벨에 맞는 세트만 본다', () => {
    const grade6 = { ...STUDENT, grade: 6 }
    expect(weeklyHomework({
      ...HW, submissions: [], student: grade6, category: 'naesin', weekStart: WEEK,
    })).toBeNull()
  })

  it('다른 주 세트는 세지 않는다', () => {
    const result = weeklyHomework({
      ...HW, submissions: [], student: STUDENT, category: 'naesin', weekStart: WEEK,
    })
    // 지난주 세트(id 3)의 요일이 섞였다면 total이 4가 된다
    expect(result.total).toBe(3)
  })
})

describe('weeklyClassReport', () => {
  // 같은 반 학생 3명: 문제 없음 / 결석+과제부진 / 시험 미응시
  const STUDENTS = [
    { id: 1, name: '가나다', classId: 10, grade: 5, jeongsiLevel: null },
    { id: 2, name: '하마바', classId: 10, grade: 5, jeongsiLevel: null },
    { id: 3, name: '사아자', classId: 10, grade: 5, jeongsiLevel: null },
    { id: 9, name: '남의반', classId: 99, grade: 5, jeongsiLevel: null },
  ]
  const ATT = [
    { studentId: 1, date: '2026-08-10', status: 'present' },
    { studentId: 2, date: '2026-08-10', status: 'absent'  },
    { studentId: 3, date: '2026-08-10', status: 'present' },
  ]
  const SUBS_HW = [
    // 1번은 3일 다 제출, 2번은 1일만 제출(33% → 부진), 3번은 3일 다 제출
    { dayId: 11, studentId: 1, answers: [{ number: 1, answer: '①' }, { number: 2, answer: '②' }] },
    { dayId: 12, studentId: 1, answers: [{ number: 1, answer: '③' }, { number: 2, answer: '④' }] },
    { dayId: 13, studentId: 1, answers: [{ number: 1, answer: '⑤' }, { number: 2, answer: '①' }] },
    { dayId: 11, studentId: 2, answers: [{ number: 1, answer: '①' }, { number: 2, answer: '②' }] },
    { dayId: 11, studentId: 3, answers: [{ number: 1, answer: '①' }, { number: 2, answer: '②' }] },
    { dayId: 12, studentId: 3, answers: [{ number: 1, answer: '③' }, { number: 2, answer: '④' }] },
    { dayId: 13, studentId: 3, answers: [{ number: 1, answer: '⑤' }, { number: 2, answer: '①' }] },
  ]
  const TEST_SUBS = [
    { testId: 100, studentId: 1, scores: [{ questionId: 1, score: 60 }, { questionId: 2, score: 40 }] },
    { testId: 100, studentId: 2, scores: [{ questionId: 1, score: 30 }, { questionId: 2, score: 20 }] },
    // 3번은 미응시
  ]

  function run() {
    return weeklyClassReport({
      students: STUDENTS, attendance: ATT,
      tests: [TESTS[0]], testSubmissions: TEST_SUBS,
      homeworkSets: HW.sets, homeworkDays: HW.days,
      homeworkQuestions: HW.questions, homeworkSubmissions: SUBS_HW,
      classId: 10, weekStart: WEEK,
    })
  }

  it('그 반 학생만 행으로 만든다', () => {
    const { rows } = run()
    expect(rows).toHaveLength(3)
    expect(rows.map((r) => r.student.id).sort()).toEqual([1, 2, 3])
  })

  it('월~토 6일을 dates로 돌려준다', () => {
    expect(run().dates).toEqual(DATES)
  })

  it('결석·시험미응시·과제부진에 flag를 세운다', () => {
    const { rows } = run()
    const byId = Object.fromEntries(rows.map((r) => [r.student.id, r]))
    expect(byId[1].flags).toEqual([])
    expect(byId[2].flags).toEqual(expect.arrayContaining(['absence', 'lowHomework']))
    expect(byId[3].flags).toEqual(['testAbsent'])
  })

  it('flag가 많은 학생을 위로, 같으면 이름 가나다순으로 정렬한다', () => {
    const { rows } = run()
    // 2번(flag 2개) → 3번(1개) → 1번(0개)
    expect(rows.map((r) => r.student.id)).toEqual([2, 3, 1])
  })

  it('정시 레벨이 없는 학생은 jeongsi가 null이다', () => {
    const { rows } = run()
    expect(rows.every((r) => r.jeongsi === null)).toBe(true)
    expect(rows.every((r) => r.naesin !== null)).toBe(true)
  })

  it('제출률 70%는 부진이 아니고 69%는 부진이다', () => {
    // 10일 중 7일 제출 = 70% (경계값)
    const days = Array.from({ length: 10 }, (_, i) => ({
      id: 500 + i, setId: 1, weekday: 1, date: '2026-08-10', questionCount: 0,
    }))
    const subs7 = Array.from({ length: 7 }, (_, i) => ({ dayId: 500 + i, studentId: 1, answers: [] }))
    const base = {
      students: [STUDENTS[0]], attendance: [], tests: [], testSubmissions: [],
      homeworkSets: HW.sets, homeworkDays: days, homeworkQuestions: [],
      classId: 10, weekStart: WEEK,
    }
    expect(weeklyClassReport({ ...base, homeworkSubmissions: subs7 }).rows[0].flags).toEqual([])
    expect(weeklyClassReport({ ...base, homeworkSubmissions: subs7.slice(0, 6) }).rows[0].flags)
      .toEqual(['lowHomework'])
  })
})
