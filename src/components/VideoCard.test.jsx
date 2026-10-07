// src/components/VideoCard.test.jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import VideoCard from './VideoCard'

const mockVideo = {
  id: 1,
  videoId: 'dQw4w9WgXcQ',
  title: '1강. 화법과 작문 기초',
  thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
  classId: 1,
}

describe('VideoCard', () => {
  it('썸네일, 제목, 반 이름, 댓글 수를 렌더링', () => {
    render(
      <VideoCard
        video={mockVideo}
        className="수능국어A반"
        commentCount={3}
        onClick={() => {}}
      />
    )
    expect(screen.getByAltText('1강. 화법과 작문 기초')).toBeInTheDocument()
    expect(screen.getByText('1강. 화법과 작문 기초')).toBeInTheDocument()
    expect(screen.getByText('수능국어A반')).toBeInTheDocument()
    expect(screen.getByText('댓글 3')).toBeInTheDocument()
  })

  it('클릭 시 onClick 호출', () => {
    const onClick = vi.fn()
    render(
      <VideoCard
        video={mockVideo}
        className="수능국어A반"
        commentCount={0}
        onClick={onClick}
      />
    )
    fireEvent.click(screen.getByText('1강. 화법과 작문 기초'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('시청 표시가 있으면 보여준다', () => {
    render(<VideoCard video={mockVideo} className="수능국어A반" commentCount={0} onClick={() => {}} progressLabel="완료 4/7" />)
    expect(screen.getByText('완료 4/7')).toBeInTheDocument()
  })

  it('시청 표시가 없으면 아무것도 붙지 않는다', () => {
    render(<VideoCard video={mockVideo} className="수능국어A반" commentCount={0} onClick={() => {}} />)
    expect(screen.queryByText(/완료|%/)).toBeNull()
  })
})
