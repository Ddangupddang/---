// src/utils/homeworkReport.test.js
import { describe, it, expect } from 'vitest'
import { homeworkPeriodReport } from './homeworkReport'

// 고2A반(내신) 8월: 월·수 2회 출제, 각 2문항
const CLASS_GROUP  = { key: 'class-7', label: '고2A반', classId: 7, target: null }
const LEVEL_GROUP  = { key: 'level-2', label: '2레벨',  classId: null, target: 2 }

const base = () => ({
  students: [
    { id: 1, name: '성실이', grade: 5, jeongsiLevel: 2, classId: 7 },
    { id: 2, name: '가끔이', grade: 5, jeongsiLevel: null, classId: 7 },
    { id: 3, name: '남의반', grade: 1, jeongsiLevel: null, classId: 8 },
  ],
  sets: [
    { id: 11, category: 'naesin',  classId: 7,    target: null, weekStart: '2026-08-10' },
    { id: 12, category: 'jeongsi', classId: null, target: 2,    weekStart: '2026-08-10' },
  ],
  days: [
    { id: 110, setId: 11, weekday: 1, date: '2026-08-10' },
    { id: 111, setId: 11, weekday: 3, date: '2026-08-12' },
    { id: 112, setId: 11, weekday: 1, date: '2026-09-07' }, // 다음 달
    { id: 120, setId: 12, weekday: 1, date: '2026-08-10' }, // 정시
  ],
  questions: [
    { dayId: 110, number: 1, answer: '①' }, { dayId: 110, number: 2, answer: '②' },
    { dayId: 111, number: 1, answer: '③' }, { dayId: 111, number: 2, answer: '④' },
    { dayId: 120, number: 1, answer: '⑤' },
  ],
  submissions: [],
  category: 'naesin',
  group: CLASS_GROUP,
  month: '2026-08',
})

describe('homeworkPeriodReport — 기간·그룹 고르기', () => {
  it('그 달, 그 그룹의 과제 횟수를 센다', () => {
    // 8월 내신 고2는 2회 (9월 것과 정시 것은 제외)
    expect(homeworkPeriodReport(base()).totalDays).toBe(2)
  })

  it('그 그룹 학생만 줄에 담는다', () => {
    const r = homeworkPeriodReport(base())
    // 순서는 별도 테스트에서 다룬다 — 여기서는 남의 학년이 섞이지 않는지만 본다
    expect(r.rows.map((x) => x.student.name).sort()).toEqual(['가끔이', '성실이'])
  })

  it('정시는 정시 레벨로 학생을 고른다', () => {
    const r = homeworkPeriodReport({ ...base(), category: 'jeongsi', group: LEVEL_GROUP })
    expect(r.totalDays).toBe(1)
    expect(r.rows.map((x) => x.student.name)).toEqual(['성실이'])
  })

  it('그 달에 과제가 없으면 빈 결과를 준다', () => {
    const r = homeworkPeriodReport({ ...base(), month: '2026-07' })
    expect(r.totalDays).toBe(0)
    expect(r.rows.every((x) => x.submitRate === null)).toBe(true)
  })
})

describe('homeworkPeriodReport — 제출률과 정답률', () => {
  it('제출 횟수와 제출률을 낸다', () => {
    const d = base()
    d.submissions = [
      { dayId: 110, studentId: 1, answers: [{ number: 1, answer: '①' }, { number: 2, answer: '②' }] },
      { dayId: 111, studentId: 1, answers: [{ number: 1, answer: '③' }, { number: 2, answer: '④' }] },
      { dayId: 110, studentId: 2, answers: [{ number: 1, answer: '①' }, { number: 2, answer: '⑤' }] },
    ]
    const r = homeworkPeriodReport(d)
    const [a, b] = r.rows

    expect(a).toMatchObject({ submitted: 2, total: 2, submitRate: 100, correctRate: 100 })
    expect(b).toMatchObject({ submitted: 1, total: 2, submitRate: 50, correctRate: 50 })
  })

  it('정답률은 제출한 회차의 문항만으로 낸다', () => {
    const d = base()
    // 1회만 제출, 2문항 중 1개 정답 → 정답률 50% (안 낸 회차는 분모에서 뺀다)
    d.submissions = [
      { dayId: 110, studentId: 1, answers: [{ number: 1, answer: '①' }, { number: 2, answer: '⑤' }] },
    ]
    expect(homeworkPeriodReport(d).rows[0]).toMatchObject({ submitRate: 50, correctRate: 50 })
  })

  it('한 번도 내지 않으면 정답률은 판단할 수 없어 null이다', () => {
    const r = homeworkPeriodReport(base())
    expect(r.rows[0]).toMatchObject({ submitted: 0, submitRate: 0, correctRate: null })
  })

  it('다른 학생의 제출을 섞지 않는다', () => {
    const d = base()
    d.submissions = [{ dayId: 110, studentId: 2, answers: [] }]
    expect(homeworkPeriodReport(d).rows.find((x) => x.student.id === 1).submitted).toBe(0)
  })
})

describe('homeworkPeriodReport — 정렬과 주의 표시', () => {
  it('제출률 높은 학생을 위에 둔다', () => {
    const d = base()
    d.submissions = [{ dayId: 110, studentId: 2, answers: [] }]
    // 가끔이(1회)가 성실이(0회)보다 위
    expect(homeworkPeriodReport(d).rows.map((x) => x.student.name)).toEqual(['가끔이', '성실이'])
  })

  it('제출률이 70% 미만이면 주의로 표시한다', () => {
    const d = base()
    d.submissions = [
      { dayId: 110, studentId: 1, answers: [] }, { dayId: 111, studentId: 1, answers: [] },
      { dayId: 110, studentId: 2, answers: [] }, // 2회 중 1회 = 50%
    ]
    const r = homeworkPeriodReport(d)
    expect(r.rows.find((x) => x.student.id === 1).lowSubmission).toBe(false)
    expect(r.rows.find((x) => x.student.id === 2).lowSubmission).toBe(true)
  })

  it('과제가 없는 달에는 주의를 띄우지 않는다', () => {
    const r = homeworkPeriodReport({ ...base(), month: '2026-07' })
    expect(r.rows.every((x) => x.lowSubmission === false)).toBe(true)
  })
})
