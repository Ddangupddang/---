import { describe, it, expect } from 'vitest'
import {
  homeworkStudentIds, newHomeworkNotification, submissionNotification, submissionTargets,
  isFutureWeek, isDeferredForWeek,
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

// 2026-10-24는 토요일, 10-25는 일요일, 10-26은 다음 주 월요일
describe('isFutureWeek — 다음 주 과제는 알림을 미룬다', () => {
  it('토요일에 다음 주 과제를 내면 미룬다', () => {
    expect(isFutureWeek('2026-10-26', '2026-10-24')).toBe(true)
  })
  it('일요일도 아직 지난주라 미룬다 — 학생 화면이 일요일을 지난주로 친다', () => {
    expect(isFutureWeek('2026-10-26', '2026-10-25')).toBe(true)
  })
  it('그 주 월요일이 되면 바로 보낸다', () => {
    expect(isFutureWeek('2026-10-26', '2026-10-26')).toBe(false)
  })
  it('이번 주·지난 주 과제는 바로 보낸다', () => {
    expect(isFutureWeek('2026-10-19', '2026-10-24')).toBe(false)
    expect(isFutureWeek('2026-10-12', '2026-10-24')).toBe(false)
  })
})

describe('isDeferredForWeek — 월요일 아침에 보낼 세트', () => {
  const MON = '2026-10-26'
  it('지난주에 만들어 둔 이번 주 세트는 보낸다', () => {
    expect(isDeferredForWeek({ week_start: MON, created_at: '2026-10-24T05:00:00.123456+00:00' }, MON)).toBe(true)
  })
  it('일요일 밤 11시(한국)에 만든 것도 보낸다 — UTC로는 일요일 오후다', () => {
    expect(isDeferredForWeek({ week_start: MON, created_at: '2026-10-25T14:00:00+00:00' }, MON)).toBe(true)
  })
  it('월요일 0시 이후(한국)에 만든 것은 이미 알렸으니 다시 보내지 않는다', () => {
    // 한국 월요일 00:30 = UTC 일요일 15:30
    expect(isDeferredForWeek({ week_start: MON, created_at: '2026-10-25T15:30:00+00:00' }, MON)).toBe(false)
  })
  it('다른 주 세트는 보내지 않는다', () => {
    expect(isDeferredForWeek({ week_start: '2026-11-02', created_at: '2026-10-24T05:00:00+00:00' }, MON)).toBe(false)
  })
  it('만든 시각을 모르면 보내지 않는다', () => {
    expect(isDeferredForWeek({ week_start: MON }, MON)).toBe(false)
    expect(isDeferredForWeek(undefined, MON)).toBe(false)
  })
})
