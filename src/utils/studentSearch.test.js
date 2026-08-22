// src/utils/studentSearch.test.js
import { describe, it, expect } from 'vitest'
import { filterStudents } from './studentSearch'

const STUDENTS = [
  { id: 1, name: '김민서', classId: 10, phone: '010-1234-5678', parentPhone: '010-1111-2222' },
  { id: 2, name: '이서준', classId: 10, phone: '01098765432',   parentPhone: '' },
  { id: 3, name: '김하준', classId: 20, phone: '',              parentPhone: '010-3333-4444' },
]

describe('filterStudents', () => {
  it('검색어가 없으면 그대로 돌려준다', () => {
    expect(filterStudents(STUDENTS, {})).toHaveLength(3)
  })

  it('이름 일부로 찾는다', () => {
    expect(filterStudents(STUDENTS, { search: '김' }).map((s) => s.id)).toEqual([1, 3])
    expect(filterStudents(STUDENTS, { search: '서준' }).map((s) => s.id)).toEqual([2])
  })

  it('앞뒤 공백은 무시한다', () => {
    expect(filterStudents(STUDENTS, { search: '  김하준 ' }).map((s) => s.id)).toEqual([3])
  })

  it('전화번호 뒷자리로 찾는다 — 하이픈 유무와 상관없다', () => {
    expect(filterStudents(STUDENTS, { search: '5678' }).map((s) => s.id)).toEqual([1])
    expect(filterStudents(STUDENTS, { search: '9876' }).map((s) => s.id)).toEqual([2])
    expect(filterStudents(STUDENTS, { search: '010-1234' }).map((s) => s.id)).toEqual([1])
  })

  it('학부모 번호로도 찾는다', () => {
    expect(filterStudents(STUDENTS, { search: '3333' }).map((s) => s.id)).toEqual([3])
  })

  it('숫자 한 자리로는 번호를 뒤지지 않는다 — 거의 전부가 걸려 쓸모가 없다', () => {
    expect(filterStudents(STUDENTS, { search: '1' })).toEqual([])
  })

  it('반 필터와 검색어가 함께 걸린다', () => {
    expect(filterStudents(STUDENTS, { classId: 10, search: '김' }).map((s) => s.id)).toEqual([1])
  })

  it('찾는 학생이 없으면 빈 목록이다', () => {
    expect(filterStudents(STUDENTS, { search: '없는이름' })).toEqual([])
  })
})
