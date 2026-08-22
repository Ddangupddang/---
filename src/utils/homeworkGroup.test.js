// src/utils/homeworkGroup.test.js
import { describe, it, expect } from 'vitest'
import { homeworkGroups, setInGroup, studentInGroup, setTargetLabel } from './homeworkGroup'

const CLASSES = [
  { id: 1, name: '동화리 고2A' },
  { id: 2, name: '와우리 고2B' },
]

describe('homeworkGroups', () => {
  it('내신은 넘겨받은 반이 그대로 그룹이 된다', () => {
    expect(homeworkGroups('naesin', CLASSES).map((g) => g.label))
      .toEqual(['동화리 고2A', '와우리 고2B'])
  })

  it('내신 그룹은 반이 없으면 비어 있다 — 담당 반 없는 교사', () => {
    expect(homeworkGroups('naesin', [])).toEqual([])
  })

  it('정시는 반과 무관하게 레벨로 묶는다', () => {
    expect(homeworkGroups('jeongsi', CLASSES).map((g) => g.label))
      .toEqual(['1레벨', '2레벨', '3레벨'])
  })
})

describe('setInGroup', () => {
  const classGroup = { key: 'class-1', label: '동화리 고2A', classId: 1, target: null }
  const levelGroup = { key: 'level-2', label: '2레벨', classId: null, target: 2 }

  it('반 그룹에는 그 반 세트만 들어간다', () => {
    expect(setInGroup({ category: 'naesin', classId: 1, target: null }, classGroup)).toBe(true)
    expect(setInGroup({ category: 'naesin', classId: 2, target: null }, classGroup)).toBe(false)
  })

  it('반별 전환 이전의 학년 세트는 어느 반 그룹에도 없다', () => {
    expect(setInGroup({ category: 'naesin', classId: null, target: 5 }, classGroup)).toBe(false)
  })

  it('정시는 레벨로 맞춘다', () => {
    expect(setInGroup({ category: 'jeongsi', classId: null, target: 2 }, levelGroup)).toBe(true)
    expect(setInGroup({ category: 'jeongsi', classId: null, target: 3 }, levelGroup)).toBe(false)
  })
})

describe('studentInGroup', () => {
  it('반 그룹은 학생의 반으로 판단한다', () => {
    expect(studentInGroup({ classId: 1, grade: 5 }, { classId: 1, target: null })).toBe(true)
    expect(studentInGroup({ classId: 2, grade: 5 }, { classId: 1, target: null })).toBe(false)
  })

  it('반이 없는 학생은 어느 반 그룹에도 속하지 않는다', () => {
    expect(studentInGroup({ classId: null, grade: 5 }, { classId: 1, target: null })).toBe(false)
  })

  it('레벨 그룹은 정시 레벨로 판단한다', () => {
    expect(studentInGroup({ jeongsiLevel: 2 }, { classId: null, target: 2 })).toBe(true)
    expect(studentInGroup({ jeongsiLevel: null }, { classId: null, target: 2 })).toBe(false)
  })
})

describe('setTargetLabel', () => {
  it('반 세트는 반 이름으로 보인다', () => {
    expect(setTargetLabel({ category: 'naesin', classId: 1 }, CLASSES)).toBe('동화리 고2A')
  })

  it('반이 지워졌으면 그렇다고 알린다 — 빈칸이면 무엇이었는지 알 수 없다', () => {
    expect(setTargetLabel({ category: 'naesin', classId: 99 }, CLASSES)).toBe('삭제된 반')
  })

  it('예전 학년 세트는 학년으로 보인다', () => {
    expect(setTargetLabel({ category: 'naesin', classId: null, target: 5 }, CLASSES)).toBe('고2')
  })

  it('정시는 레벨로 보인다', () => {
    expect(setTargetLabel({ category: 'jeongsi', classId: null, target: 3 }, CLASSES)).toBe('3레벨')
  })
})
