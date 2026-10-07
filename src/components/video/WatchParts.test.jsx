// src/components/video/WatchParts.test.jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import ResumeBanner from './ResumeBanner'
import WatchProgressLine from './WatchProgressLine'
import WatchRoster from './WatchRoster'

const row = (o) => ({ id: 1, videoId: 1, studentId: 1, durationSec: 1500, lastPositionSec: 750,
  watchedSec: 1100, startedAt: '2026-10-07T01:00:00Z', completedAt: null, ...o })

describe('ResumeBanner', () => {
  it('보던 위치를 보여주고 누르면 그 위치를 넘긴다', () => {
    const onResume = vi.fn()
    render(<ResumeBanner row={row({})} onResume={onResume} />)
    expect(screen.getByText(/12:30/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '이어보기' }))
    expect(onResume).toHaveBeenCalledWith(750)
  })
  it('완료했거나 거의 안 봤으면 띄우지 않는다', () => {
    const { container } = render(<ResumeBanner row={row({ completedAt: 'x' })} onResume={() => {}} />)
    expect(container).toBeEmptyDOMElement()
  })
})

describe('WatchProgressLine', () => {
  it('실제 시청 시간 / 길이 (비율)', () => {
    render(<WatchProgressLine row={row({})} />)
    expect(screen.getByText('실제 시청 18:20 / 25:00 (73%)')).toBeInTheDocument()
  })
  it('완료면 완료 표시', () => {
    render(<WatchProgressLine row={row({ completedAt: '2026-10-07T03:00:00Z' })} />)
    expect(screen.getByText('✓ 시청 완료')).toBeInTheDocument()
  })
  it('기록이 없으면 아무것도 없다', () => {
    const { container } = render(<WatchProgressLine row={undefined} />)
    expect(container).toBeEmptyDOMElement()
  })
})

describe('WatchRoster', () => {
  const students = [{ id: 1, name: '김하은' }, { id: 2, name: '나시우' }, { id: 3, name: '박은우' }]
  const rows = [
    row({ studentId: 1, completedAt: '2026-10-07T03:00:00Z' }),
    row({ studentId: 2, watchedSec: 720, lastPositionSec: 750 }),
  ]

  it('요약 한 줄', () => {
    render(<WatchRoster students={students} rows={rows} />)
    expect(screen.getByText('완료 1 · 보는 중 1 · 안 봄 1 (3명)')).toBeInTheDocument()
  })

  it('안 봄 → 보는 중 → 완료 순, 상태 문구', () => {
    render(<WatchRoster students={students} rows={rows} />)
    const items = screen.getAllByRole('listitem')
    expect(within(items[0]).getByText('박은우')).toBeInTheDocument()
    expect(within(items[0]).getByText('안 봄')).toBeInTheDocument()
    expect(within(items[1]).getByText('12:30까지 · 실제 시청 48%')).toBeInTheDocument()
    expect(within(items[2]).getByText('✓ 완료 2026-10-07')).toBeInTheDocument()
  })

  it('반에 학생이 없으면 안내', () => {
    render(<WatchRoster students={[]} rows={[]} />)
    expect(screen.getByText('이 영상을 볼 학생이 없어요.')).toBeInTheDocument()
  })
})
