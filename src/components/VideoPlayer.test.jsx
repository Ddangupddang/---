// src/components/VideoPlayer.test.jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

vi.mock('./video/TrackedPlayer', () => ({
  default: (p) => <div data-testid="player" data-track={String(p.trackAs)} data-seek={String(p.seekTo)} />,
}))
vi.mock('./CommentSection', () => ({ default: () => <div>댓글 칸</div> }))

import VideoPlayer from './VideoPlayer'

const video = { id: 3, videoId: 'abc', title: '현대시 1강', classId: 1 }
const base = { video, comments: [], students: [], onBack: () => {}, onAddComment: () => {}, onAddReply: () => {} }
const row = { id: 1, videoId: 3, studentId: 11, durationSec: 1500, lastPositionSec: 750, watchedSec: 1100, startedAt: 's', completedAt: null }

describe('VideoPlayer', () => {
  it('학생: 추적하는 플레이어 + 이어보기 → 누르면 그 위치로', () => {
    render(<VideoPlayer {...base} role="student" currentUser={{ id: 'u', studentId: 11 }}
      progressRows={[row]} rosterStudents={[]} onProgressSaved={() => {}} />)
    expect(screen.getByTestId('player').dataset.track).toBe('student')
    fireEvent.click(screen.getByRole('button', { name: '이어보기' }))
    expect(screen.getByTestId('player').dataset.seek).toBe('750')
    expect(screen.getByText('실제 시청 18:20 / 25:00 (73%)')).toBeInTheDocument()
    expect(screen.queryByRole('tab')).toBeNull()
  })

  it('교사: 추적하지 않고 [댓글 | 시청 현황] 탭', () => {
    render(<VideoPlayer {...base} role="teacher" currentUser={{ id: 't' }}
      progressRows={[row]} rosterStudents={[{ id: 11, name: '김하은' }, { id: 12, name: '나시우' }]} onProgressSaved={() => {}} />)
    expect(screen.getByTestId('player').dataset.track).toBe('null')
    expect(screen.getByText('댓글 칸')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('tab', { name: '시청 현황' }))
    expect(screen.getByText('완료 0 · 보는 중 1 · 안 봄 1 (2명)')).toBeInTheDocument()
  })
})
