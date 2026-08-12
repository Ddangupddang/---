// src/utils/reportHomework.test.js
import { describe, it, expect } from 'vitest'
import { autoHomeworkStatus, resolveCheck } from './reportHomework'

const DATE = '2026-08-12'

// 그날(수요일) 과제: 내신 고2 1개, 정시 2레벨 1개
const base = () => ({
  date: DATE,
  sets: [
    { id: 11, category: 'naesin',  target: 5, weekStart: '2026-08-10' },
    { id: 12, category: 'jeongsi', target: 2, weekStart: '2026-08-10' },
  ],
  days: [
    { id: 110, setId: 11, weekday: 3, date: DATE },
    { id: 120, setId: 12, weekday: 3, date: DATE },
    { id: 111, setId: 11, weekday: 1, date: '2026-08-10' }, // 다른 날
  ],
  submissions: [],
})

describe('autoHomeworkStatus — 판정 대상', () => {
  it('그날 배정된 과제가 없으면 판정하지 않는다(null)', () => {
    // 중1 학생 — 그날 중1 과제가 없다
    const r = autoHomeworkStatus({ ...base(), student: { id: 1, grade: 1, jeongsiLevel: null } })
    expect(r).toBeNull()
  })

  it('리포트 날짜와 다른 날의 과제는 세지 않는다', () => {
    const r = autoHomeworkStatus({ ...base(), date: '2026-08-11', student: { id: 1, grade: 5, jeongsiLevel: null } })
    expect(r).toBeNull()
  })

  it('내신만 해당되면 그 1개만 센다', () => {
    const r = autoHomeworkStatus({ ...base(), student: { id: 1, grade: 5, jeongsiLevel: null } })
    expect(r).toMatchObject({ total: 1, submitted: 0, done: false })
  })

  it('내신과 정시에 모두 해당되면 둘 다 센다', () => {
    const r = autoHomeworkStatus({ ...base(), student: { id: 1, grade: 5, jeongsiLevel: 2 } })
    expect(r).toMatchObject({ total: 2, submitted: 0, done: false })
  })
})

describe('autoHomeworkStatus — 제출 판정', () => {
  const student = { id: 1, grade: 5, jeongsiLevel: 2 }

  it('배정된 과제를 모두 내야 수행으로 본다', () => {
    const d = base()
    d.submissions = [{ dayId: 110, studentId: 1 }]
    expect(autoHomeworkStatus({ ...d, student })).toMatchObject({ total: 2, submitted: 1, done: false })

    d.submissions.push({ dayId: 120, studentId: 1 })
    expect(autoHomeworkStatus({ ...d, student })).toMatchObject({ total: 2, submitted: 2, done: true })
  })

  it('다른 학생의 제출은 세지 않는다', () => {
    const d = base()
    d.submissions = [{ dayId: 110, studentId: 999 }, { dayId: 120, studentId: 999 }]
    expect(autoHomeworkStatus({ ...d, student })).toMatchObject({ submitted: 0, done: false })
  })
})

describe('resolveCheck — 자동값과 교사 수정의 우선순위', () => {
  it('교사가 고친 값이 있으면 그것을 쓴다', () => {
    // 제출 기록은 미제출이지만 교사가 수행으로 표시(종이로 받은 경우 등)
    expect(resolveCheck({ manual: true, done: true }, { done: false })).toEqual({ value: true, source: 'manual' })
    expect(resolveCheck({ manual: true, done: false }, { done: true })).toEqual({ value: false, source: 'manual' })
  })

  it('교사가 고치지 않았으면 제출 기록을 따른다', () => {
    expect(resolveCheck({ done: false }, { done: true })).toEqual({ value: true, source: 'auto' })
  })

  it('판정할 과제가 없으면 저장된 값을 그대로 쓴다', () => {
    // 과제 기능 이전에 작성된 리포트는 이렇게 예전 모습 그대로 보인다
    expect(resolveCheck({ done: true }, null)).toEqual({ value: true, source: 'stored' })
    expect(resolveCheck({ done: false }, null)).toEqual({ value: false, source: 'stored' })
  })

  it('저장된 항목이 아예 없어도 안전하게 답한다', () => {
    expect(resolveCheck(undefined, null)).toEqual({ value: false, source: 'stored' })
    expect(resolveCheck(undefined, { done: true })).toEqual({ value: true, source: 'auto' })
  })
})
