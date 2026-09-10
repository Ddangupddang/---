import { describe, it, expect } from 'vitest'
import {
  homeworkStudentIds, newHomeworkNotification, submissionNotification, submissionTargets,
} from './homeworkNotify'

const students = [
  { id: 1, name: '가나', class_id: 7, grade: 5, jeongsi_level: 1 },
  { id: 2, name: '다라', class_id: 8, grade: 5, jeongsi_level: 2 },
  { id: 3, name: '마바', class_id: null, grade: 5, jeongsi_level: null },
]

describe('homeworkStudentIds', () => {
  it('내신 반 세트는 그 반 학생만', () => {
    const set = { category: 'naesin', class_id: 7, target: null }
    expect(homeworkStudentIds(set, students)).toEqual([1])
  })

  it('정시 세트는 그 레벨 학생만 (반과 무관)', () => {
    const set = { category: 'jeongsi', class_id: null, target: 2 }
    expect(homeworkStudentIds(set, students)).toEqual([2])
  })

  it('반별 전환 이전의 학년 세트는 학년으로 맞춘다', () => {
    const set = { category: 'naesin', class_id: null, target: 5 }
    expect(homeworkStudentIds(set, students)).toEqual([1, 2, 3])
  })

  it('반이 없는 학생은 내신 반 세트를 받지 않는다', () => {
    const set = { category: 'naesin', class_id: 9, target: null }
    expect(homeworkStudentIds(set, students)).toEqual([])
  })

  it('세트가 없으면 빈 목록', () => {
    expect(homeworkStudentIds(null, students)).toEqual([])
  })
})

describe('알림 문구', () => {
  it('새 과제는 종류와 제목만 알린다 — 문항·정답은 넣지 않는다', () => {
    const n = newHomeworkNotification({ category: 'naesin', title: '9월 2주차' })
    expect(n).toEqual({ title: '새 과제', body: '내신과제 · 9월 2주차' })
  })

  it('제출 알림은 학생 이름과 요일만 알린다 — 점수는 넣지 않는다', () => {
    const n = submissionNotification({ name: '홍길동' }, { weekday: 1 })
    expect(n).toEqual({ title: '과제 제출', body: '홍길동 · 월요일 과제' })
  })

  it('요일을 모르면 이름만 알린다', () => {
    expect(submissionNotification({ name: '홍길동' }, null).body).toBe('홍길동')
  })
})

describe('submissionTargets', () => {
  const admins = [{ id: 'admin-1' }, { id: 'admin-2' }]

  it('그 과제를 낸 교사에게 간다', () => {
    expect(submissionTargets({ teacher_id: 'teacher-9' }, admins)).toEqual(['teacher-9'])
  })

  it('출제자를 모르면 관리자에게 넘긴다', () => {
    expect(submissionTargets({ teacher_id: null }, admins)).toEqual(['admin-1', 'admin-2'])
  })
})
