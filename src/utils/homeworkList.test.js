// src/utils/homeworkList.test.js
import { describe, it, expect } from 'vitest'
import { visibleSets } from './homeworkList'
import { HW_CATEGORY } from '../constants/homework'

const CLASSES = [{ id: 10, name: 'A반' }, { id: 20, name: 'B반' }]

const set = (over) => ({
  id: 1, category: HW_CATEGORY.NAESIN, classId: 10,
  weekStart: '2026-09-07', title: '세트', ...over,
})

const ids = (sets, role = 'admin', classes = CLASSES) =>
  visibleSets(sets, HW_CATEGORY.NAESIN, classes, role).map((s) => s.id)

describe('visibleSets — 무엇이 보이나', () => {
  it('다른 종류의 과제는 빼놓는다', () => {
    expect(ids([set({ id: 1 }), set({ id: 2, category: HW_CATEGORY.JEONGSI })])).toEqual([1])
  })

  it('정시는 담당 반과 무관하게 전부 보인다', () => {
    const sets = [set({ id: 1, category: HW_CATEGORY.JEONGSI, classId: null, target: 2 })]
    expect(visibleSets(sets, HW_CATEGORY.JEONGSI, [], 'teacher').map((s) => s.id)).toEqual([1])
  })

  it('내신은 담당 반 것만 보인다', () => {
    expect(ids([set({ id: 1, classId: 10 }), set({ id: 2, classId: 99 })], 'teacher')).toEqual([1])
  })

  it('반이 지워진 과제는 관리자에게 보인다', () => {
    // 안 보이면 지울 수도 없어 영영 남는다
    expect(ids([set({ id: 1, classId: 99 })], 'admin')).toEqual([1])
  })

  it('반이 지워진 과제가 교사에게는 안 보인다', () => {
    expect(ids([set({ id: 1, classId: 99 })], 'teacher')).toEqual([])
  })

  it('반별 전환 이전의 옛 세트는 관리자에게만 보인다', () => {
    const old = [set({ id: 1, classId: null, target: 2 })]
    expect(ids(old, 'admin')).toEqual([1])
    expect(ids(old, 'teacher')).toEqual([])
  })
})

describe('visibleSets — 순서', () => {
  it('최신 주차가 위로 온다', () => {
    expect(ids([
      set({ id: 1, weekStart: '2026-08-31' }),
      set({ id: 2, weekStart: '2026-09-07' }),
    ])).toEqual([2, 1])
  })

  it('같은 주차면 최근에 만든 것이 위로 온다', () => {
    // 예전 비교 함수는 0을 돌려주지 않아 같은 주차끼리 순서가 뒤죽박죽이었다.
    // 방금 만든 과제가 어디 있는지 알 수 없어 "저장이 안 됐다"로 보였다.
    expect(ids([
      set({ id: 5 }), set({ id: 9 }), set({ id: 7 }),
    ])).toEqual([9, 7, 5])
  })

  it('원본 배열을 건드리지 않는다', () => {
    const sets = [set({ id: 1 }), set({ id: 2 })]
    visibleSets(sets, HW_CATEGORY.NAESIN, CLASSES, 'admin')
    expect(sets.map((s) => s.id)).toEqual([1, 2])
  })
})
