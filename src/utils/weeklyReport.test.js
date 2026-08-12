// src/utils/weeklyReport.test.js
import { describe, it, expect } from 'vitest'
import { weeklyAttendance } from './weeklyReport'

const DATES = ['2026-08-10', '2026-08-11', '2026-08-12', '2026-08-13', '2026-08-14', '2026-08-15']

describe('weeklyAttendance', () => {
  it('출석·지각·결석을 각각 세고, 지각은 출석률 분자에 포함한다', () => {
    const records = [
      { studentId: 1, date: '2026-08-10', status: 'present' },
      { studentId: 1, date: '2026-08-11', status: 'late'    },
      { studentId: 1, date: '2026-08-12', status: 'absent'  },
      { studentId: 1, date: '2026-08-13', status: 'present' },
    ]
    // 왔다는 사실(출석+지각)은 분자에 넣되, 지각은 따로 세어 감춰지지 않게 한다
    expect(weeklyAttendance(records, 1, DATES)).toEqual({
      present: 2, late: 1, absent: 1, counted: 4, rate: 75,
    })
  })

  it('그 주 기록이 하나도 없으면 null — 0%와 구별해야 한다', () => {
    const records = [{ studentId: 1, date: '2026-08-03', status: 'present' }]
    expect(weeklyAttendance(records, 1, DATES)).toBeNull()
  })

  it('다른 학생의 기록은 세지 않는다', () => {
    const records = [
      { studentId: 1, date: '2026-08-10', status: 'present' },
      { studentId: 2, date: '2026-08-10', status: 'absent'  },
    ]
    expect(weeklyAttendance(records, 1, DATES).counted).toBe(1)
  })

  it('주 범위 밖 날짜는 세지 않는다', () => {
    const records = [
      { studentId: 1, date: '2026-08-10', status: 'present' },
      { studentId: 1, date: '2026-08-16', status: 'absent'  }, // 일요일 = 범위 밖
    ]
    expect(weeklyAttendance(records, 1, DATES).counted).toBe(1)
  })
})
