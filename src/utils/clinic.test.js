import { describe, it, expect } from 'vitest'
import { visibleClinicRequests, pendingRequestOf, sortClinicRequests } from './clinic'

const classes  = [{ id: 10, teacherId: 't1' }, { id: 20, teacherId: 't2' }]
const students = [{ id: 1, classId: 10 }, { id: 2, classId: 20 }]
const requests = [
  { id: 100, studentId: 1, status: 'pending',  createdAt: '2026-10-20T09:00:00Z' },
  { id: 200, studentId: 2, status: 'accepted', createdAt: '2026-10-21T09:00:00Z' },
  { id: 300, studentId: 1, status: 'rejected', createdAt: '2026-10-22T09:00:00Z' },
]

describe('visibleClinicRequests', () => {
  it('관리자는 전부 본다', () => {
    expect(visibleClinicRequests(requests, students, classes, { role: 'admin' })).toHaveLength(3)
  })
  it('교사는 담당 반 학생 것만 본다', () => {
    const got = visibleClinicRequests(requests, students, classes, { role: 'teacher', id: 't1' })
    expect(got.map((r) => r.id)).toEqual([100, 300])
  })
  it('학생은 본인 것만 본다', () => {
    const got = visibleClinicRequests(requests, students, classes, { role: 'student', studentId: 2 })
    expect(got.map((r) => r.id)).toEqual([200])
  })
  it('로그인 정보가 없으면 아무것도 안 보인다', () => {
    expect(visibleClinicRequests(requests, students, classes, null)).toEqual([])
  })
})

describe('pendingRequestOf', () => {
  it('그 학생의 대기 중 신청을 찾는다', () => {
    expect(pendingRequestOf(requests, 1)?.id).toBe(100)
    expect(pendingRequestOf(requests, 2)).toBeNull()
  })
})

describe('sortClinicRequests', () => {
  it('대기 중을 먼저, 그 안에서는 최근 것을 위로', () => {
    expect(sortClinicRequests(requests).map((r) => r.id)).toEqual([100, 300, 200])
  })
})
