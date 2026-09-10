import { describe, it, expect } from 'vitest'
import { defaultCopyGroupKey, findConflictingSet, urlsSafeToDelete } from './homeworkCopy'

const groups = [
  { key: 'class-1', label: '봉담고', classId: 1, target: null },
  { key: 'class-2', label: '화성고', classId: 2, target: null },
]

describe('defaultCopyGroupKey', () => {
  it('원본과 다른 반을 먼저 고른다', () => {
    expect(defaultCopyGroupKey(groups, { classId: 1 })).toBe('class-2')
    expect(defaultCopyGroupKey(groups, { classId: 2 })).toBe('class-1')
  })

  it('고를 반이 원본뿐이면 그대로 둔다', () => {
    expect(defaultCopyGroupKey([groups[0]], { classId: 1 })).toBe('class-1')
  })

  it('반이 없으면 빈 값', () => {
    expect(defaultCopyGroupKey([], { classId: 1 })).toBe('')
  })
})

describe('findConflictingSet', () => {
  const sets = [
    { id: 10, category: 'naesin', classId: 1, target: null, weekStart: '2026-09-07' },
    { id: 11, category: 'naesin', classId: 2, target: null, weekStart: '2026-09-14' },
  ]

  it('같은 반 같은 주에 이미 있으면 그 세트를 준다', () => {
    const hit = findConflictingSet(sets, { category: 'naesin', group: groups[0], weekStart: '2026-09-07' })
    expect(hit?.id).toBe(10)
  })

  it('주가 다르면 부딪히지 않는다', () => {
    expect(findConflictingSet(sets, { category: 'naesin', group: groups[0], weekStart: '2026-09-14' })).toBeNull()
  })

  it('반이 다르면 부딪히지 않는다', () => {
    expect(findConflictingSet(sets, { category: 'naesin', group: groups[1], weekStart: '2026-09-07' })).toBeNull()
  })

  it('수정 중인 자기 자신과는 부딪히지 않는다', () => {
    const hit = findConflictingSet(sets, {
      category: 'naesin', group: groups[0], weekStart: '2026-09-07', exceptId: 10,
    })
    expect(hit).toBeNull()
  })
})

describe('urlsSafeToDelete', () => {
  const days = [
    { id: 1, daySolutionFileUrl: 'https://x/a.pdf' },   // 내 요일
    { id: 2, daySolutionFileUrl: 'https://x/b.pdf' },   // 내 요일
    { id: 9, daySolutionFileUrl: 'https://x/a.pdf' },   // 복제본이 같은 파일을 쓴다
  ]

  it('다른 요일이 아직 쓰는 파일은 남긴다', () => {
    expect(urlsSafeToDelete(['https://x/a.pdf'], days, [1, 2])).toEqual([])
  })

  it('아무도 안 쓰는 파일만 지운다', () => {
    expect(urlsSafeToDelete(['https://x/b.pdf'], days, [1, 2])).toEqual(['https://x/b.pdf'])
  })

  it('같은 주소가 여러 번 들어와도 한 번만 지운다', () => {
    expect(urlsSafeToDelete(['https://x/b.pdf', 'https://x/b.pdf'], days, [1, 2]))
      .toEqual(['https://x/b.pdf'])
  })

  it('빈 값은 걸러낸다', () => {
    expect(urlsSafeToDelete(['', null], days, [1, 2])).toEqual([])
  })
})
