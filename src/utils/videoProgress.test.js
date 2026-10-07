// src/utils/videoProgress.test.js
import { describe, it, expect } from 'vitest'
import {
  bucketsForStep, formatClock, progressStatus, watchedPercent, shouldOfferResume,
  buildRoster, summarizeRoster, cardProgressLabel,
} from './videoProgress'

describe('bucketsForStep — 1초 사이 위치 변화로 "봤다"를 판정', () => {
  it('자연스러운 재생이면 지나간 5초 칸을 센다', () => {
    expect(bucketsForStep(3, 4)).toEqual([0])
    expect(bucketsForStep(4.5, 5.5)).toEqual([0, 1])     // 칸 경계를 넘으면 두 칸
  })

  it('2배속(1초에 2초 진행)도 센다', () => {
    expect(bucketsForStep(10, 12)).toEqual([2])
  })

  it('되감기·건너뛰기는 세지 않는다', () => {
    expect(bucketsForStep(100, 40)).toEqual([])           // 되감기
    expect(bucketsForStep(10, 200)).toEqual([])           // 진행 막대를 끌어 건너뜀
    expect(bucketsForStep(10, 13.5)).toEqual([])          // 3초 초과
  })

  it('위치가 그대로면(버퍼링·정지) 세지 않는다', () => {
    expect(bucketsForStep(7, 7)).toEqual([])
  })
})

describe('formatClock', () => {
  it('분:초, 한 시간이 넘으면 시:분:초', () => {
    expect(formatClock(5)).toBe('0:05')
    expect(formatClock(750)).toBe('12:30')
    expect(formatClock(3723)).toBe('1:02:03')
  })
  it('잘못된 값은 0:00', () => {
    expect(formatClock(undefined)).toBe('0:00')
    expect(formatClock(-3)).toBe('0:00')
  })
})

const row = (o) => ({ id: 1, videoId: 1, studentId: 1, durationSec: 100, lastPositionSec: 0,
  watchedSec: 0, startedAt: '2026-10-07T01:00:00Z', completedAt: null, ...o })

describe('progressStatus · watchedPercent · shouldOfferResume', () => {
  it('기록이 없으면 안 봄, 완료 시각이 있으면 완료, 그 사이는 보는 중', () => {
    expect(progressStatus(undefined)).toBe('none')
    expect(progressStatus(row({}))).toBe('watching')
    expect(progressStatus(row({ completedAt: '2026-10-07T02:00:00Z' }))).toBe('done')
  })

  it('실제 시청 비율은 길이 대비, 길이를 모르면 0', () => {
    expect(watchedPercent(row({ watchedSec: 48 }))).toBe(48)
    expect(watchedPercent(row({ durationSec: 0, watchedSec: 5 }))).toBe(0)
    expect(watchedPercent(row({ watchedSec: 130 }))).toBe(100)
  })

  it('10초 이상 봤고 완료 전일 때만 이어보기를 권한다', () => {
    expect(shouldOfferResume(undefined)).toBe(false)
    expect(shouldOfferResume(row({ lastPositionSec: 9 }))).toBe(false)
    expect(shouldOfferResume(row({ lastPositionSec: 750 }))).toBe(true)
    expect(shouldOfferResume(row({ lastPositionSec: 750, completedAt: '2026-10-07T02:00:00Z' }))).toBe(false)
  })
})

describe('buildRoster · summarizeRoster — 교사 시청 현황', () => {
  const students = [
    { id: 1, name: '김하은' }, { id: 2, name: '나시우' }, { id: 3, name: '박은우' }, { id: 4, name: '강민준' },
  ]
  const rows = [
    row({ studentId: 1, completedAt: '2026-10-07T02:00:00Z', watchedSec: 95 }),
    row({ studentId: 2, watchedSec: 48, lastPositionSec: 750 }),
  ]

  it('챙길 학생이 위로: 안 봄 → 보는 중 → 완료, 같은 상태는 이름순', () => {
    const roster = buildRoster(students, rows)
    expect(roster.map((r) => [r.student.name, r.status])).toEqual([
      ['강민준', 'none'], ['박은우', 'none'], ['나시우', 'watching'], ['김하은', 'done'],
    ])
  })

  it('다른 영상·명단 밖 학생의 기록은 섞이지 않는다', () => {
    const roster = buildRoster([{ id: 1, name: '김하은' }], [row({ studentId: 99 })])
    expect(roster).toHaveLength(1)
    expect(roster[0].status).toBe('none')
  })

  it('요약 숫자', () => {
    expect(summarizeRoster(buildRoster(students, rows))).toEqual({ done: 1, watching: 1, none: 2, total: 4 })
  })
})

describe('cardProgressLabel — 목록 카드의 작은 표시', () => {
  it('학생: 완료 / 퍼센트 / 안 봤으면 없음', () => {
    expect(cardProgressLabel('student', [row({ completedAt: '2026-10-07T02:00:00Z' })], 0)).toBe('✓ 완료')
    expect(cardProgressLabel('student', [row({ watchedSec: 73 })], 0)).toBe('73%')
    expect(cardProgressLabel('student', [], 0)).toBeNull()
  })
  it('교사·관리자: 완료 n/반 인원, 반 인원이 0이면 없음', () => {
    const rows = [row({ studentId: 1, completedAt: 'x' }), row({ studentId: 2 })]
    expect(cardProgressLabel('teacher', rows, 7)).toBe('완료 1/7')
    expect(cardProgressLabel('admin', [], 7)).toBe('완료 0/7')
    expect(cardProgressLabel('teacher', rows, 0)).toBeNull()
  })
})
