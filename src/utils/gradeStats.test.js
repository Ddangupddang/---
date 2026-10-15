import { describe, it, expect } from 'vitest'
import { dailyAverages, partStrengths } from './gradeStats'

const g = (date, part, score, total = 100) => ({ date, part, score, total })

describe('dailyAverages', () => {
  it('같은 날 여러 시험은 점 하나로 묶는다 — x축 날짜가 겹치지 않게', () => {
    const data = dailyAverages([
      g('2026-09-11', '독서', 80), g('2026-09-11', '문학', 90),
      g('2026-09-18', '독서', 70),
    ])
    expect(data).toEqual([
      { label: '09-11', value: 85, max: 100 },
      { label: '09-18', value: 70, max: 100 },
    ])
  })

  it('만점이 다르면 백분율로 평균한다', () => {
    expect(dailyAverages([g('2026-09-11', 'a', 40, 50), g('2026-09-11', 'b', 60, 100)])[0].value).toBe(70)
  })

  it('날짜순으로 늘어놓는다', () => {
    const data = dailyAverages([g('2026-10-02', 'a', 50), g('2026-09-11', 'a', 60)])
    expect(data.map((d) => d.label)).toEqual(['09-11', '10-02'])
  })
})

describe('partStrengths', () => {
  it('1%p 차이로 85%가 보완이 되지 않는다 — 전체 평균보다 낮은 파트만 보완', () => {
    // 화법 86 · 언매 86 · 문학 85 · 독서 80 → 평균 84.25
    const { strong, weak } = partStrengths([
      g('d', '화법과 작문', 86), g('d', '언어와 매체', 86), g('d', '문학', 85), g('d', '독서', 80),
    ])
    expect(weak).toEqual([{ part: '독서', avg: 80 }])
    expect(weak.map((p) => p.part)).not.toContain('문학')
    expect(strong.map((p) => p.part)).toEqual(['화법과 작문', '언어와 매체'])
  })

  it('강점·보완은 각각 최대 2개, 보완은 낮은 것부터', () => {
    const { weak } = partStrengths([
      g('d', 'a', 100), g('d', 'b', 100), g('d', 'c', 100),
      g('d', 'x', 50), g('d', 'y', 40), g('d', 'z', 60),
    ])
    expect(weak.map((p) => p.part)).toEqual(['y', 'x'])
  })

  it('모든 파트가 같으면 강점도 보완도 없다', () => {
    const r = partStrengths([g('d', 'a', 80), g('d', 'b', 80)])
    expect(r.strong).toEqual([])
    expect(r.weak).toEqual([])
    expect(r.parts).toHaveLength(2)
  })

  it('파트가 없는 성적은 빼고 센다', () => {
    expect(partStrengths([g('d', '', 10), g('d', null, 20)]).parts).toEqual([])
  })
})
