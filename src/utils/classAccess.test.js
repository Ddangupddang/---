// src/utils/classAccess.test.js
import { describe, it, expect } from 'vitest'
import {
  visibleClasses, visibleClassIds, canSeeClass, visibleStudents, hasNoAssignedClass,
} from './classAccess'

const CLASSES = [
  { id: 1, name: '동화리A반', teacherId: 'teacher-1' },
  { id: 2, name: '동화리B반', teacherId: 'teacher-1' },
  { id: 3, name: '와우리A반', teacherId: 'teacher-2' },
  { id: 4, name: '담당없는반', teacherId: null },
]
const STUDENTS = [
  { id: 10, name: '가나', classId: 1 },
  { id: 11, name: '다라', classId: 3 },
  { id: 12, name: '마바', classId: null },  // 반 미배정
]

const admin    = { id: 'admin-1',   role: 'admin' }
const teacher1 = { id: 'teacher-1', role: 'teacher' }
const teacher2 = { id: 'teacher-2', role: 'teacher' }
const newbie   = { id: 'teacher-9', role: 'teacher' }   // 배정 전 교사
const student  = { id: 'stu-1',     role: 'student', classId: 3 }

describe('visibleClasses', () => {
  it('관리자는 모든 반을 본다', () => {
    expect(visibleClasses(CLASSES, admin)).toHaveLength(4)
  })

  it('교사는 담당 반만 본다 — 한 교사가 여러 반을 맡을 수 있다', () => {
    expect(visibleClasses(CLASSES, teacher1).map((c) => c.id)).toEqual([1, 2])
    expect(visibleClasses(CLASSES, teacher2).map((c) => c.id)).toEqual([3])
  })

  it('담당 교사가 없는 반은 교사에게 보이지 않는다', () => {
    expect(visibleClasses(CLASSES, newbie)).toEqual([])
  })

  it('학생은 본인 반만 본다', () => {
    expect(visibleClasses(CLASSES, student).map((c) => c.id)).toEqual([3])
  })

  it('로그인 정보가 없으면 아무것도 보이지 않는다', () => {
    expect(visibleClasses(CLASSES, null)).toEqual([])
  })
})

describe('visibleClassIds', () => {
  it('보이는 반의 id만 뽑는다 — 다른 자료를 거를 때 쓴다', () => {
    expect(visibleClassIds(CLASSES, teacher1)).toEqual([1, 2])
    expect(visibleClassIds(CLASSES, newbie)).toEqual([])
  })
})

describe('canSeeClass', () => {
  it('담당 반이면 통과, 남의 반이면 막는다', () => {
    expect(canSeeClass(CLASSES, teacher1, 2)).toBe(true)
    expect(canSeeClass(CLASSES, teacher1, 3)).toBe(false)
  })

  it('관리자는 어느 반이든 통과한다', () => {
    expect(canSeeClass(CLASSES, admin, 3)).toBe(true)
  })

  it('반이 정해지지 않은 자료는 교사에게 보이지 않는다 — 관리자에게는 보인다', () => {
    expect(canSeeClass(CLASSES, teacher1, null)).toBe(false)
    expect(canSeeClass(CLASSES, teacher1, undefined)).toBe(false)
    expect(canSeeClass(CLASSES, admin, null)).toBe(true)
  })
})

describe('visibleStudents', () => {
  it('교사는 담당 반 학생만 본다', () => {
    expect(visibleStudents(STUDENTS, CLASSES, teacher1).map((s) => s.id)).toEqual([10])
    expect(visibleStudents(STUDENTS, CLASSES, teacher2).map((s) => s.id)).toEqual([11])
  })

  it('반이 없는 학생은 관리자에게만 보인다', () => {
    expect(visibleStudents(STUDENTS, CLASSES, admin)).toHaveLength(3)
    expect(visibleStudents(STUDENTS, CLASSES, teacher1).some((s) => s.classId === null)).toBe(false)
  })

  it('담당 반이 없는 교사에게는 학생이 보이지 않는다', () => {
    expect(visibleStudents(STUDENTS, CLASSES, newbie)).toEqual([])
  })
})

describe('hasNoAssignedClass', () => {
  it('배정 전 교사만 참이다', () => {
    expect(hasNoAssignedClass(CLASSES, newbie)).toBe(true)
    expect(hasNoAssignedClass(CLASSES, teacher1)).toBe(false)
  })

  it('관리자와 학생은 해당하지 않는다 — 배정이라는 개념이 없다', () => {
    expect(hasNoAssignedClass(CLASSES, admin)).toBe(false)
    expect(hasNoAssignedClass([], student)).toBe(false)
  })
})
