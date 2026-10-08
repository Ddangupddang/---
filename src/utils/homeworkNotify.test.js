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

  // 원장님은 관리자·민상용(담당 교사) 두 계정을 한 폰에서 쓴다. 출제자에게만 보내면
  // 폰이 쥔 알림 주소가 다른 계정 것일 때 과제 알림만 끊긴다(2026-10-08).
  // Q&A 알림과 같은 규칙으로 맞춘다.
  it('출제자 + 그 학생 반 담당 교사 + 관리자 전원이 받는다', () => {
    expect(submissionTargets({ teacher_id: 'teacher-9' }, admins, 'teacher-3'))
      .toEqual(['teacher-9', 'teacher-3', 'admin-1', 'admin-2'])
  })

  it('같은 사람은 한 번만 — 두 번 보내면 폰에 알림이 두 개 뜬다', () => {
    expect(submissionTargets({ teacher_id: 'admin-1' }, admins, 'admin-1'))
      .toEqual(['admin-1', 'admin-2'])
  })

  it('출제자·담당 교사를 몰라도 관리자에게는 간다', () => {
    expect(submissionTargets({ teacher_id: null }, admins, null)).toEqual(['admin-1', 'admin-2'])
    expect(submissionTargets(null, admins)).toEqual(['admin-1', 'admin-2'])
  })
})
