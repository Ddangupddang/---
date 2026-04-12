// src/components/VideoPlayer.test.jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import VideoPlayer from './VideoPlayer'

const mockVideo = {
  id: 1,
  videoId: 'dQw4w9WgXcQ',
  title: '1강. 화법과 작문 기초',
  thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
  classId: 1,
}

const mockComments = [
  { id: 1, videoId: 1, studentId: 3, content: '질문입니다', createdAt: '2026-04-11 14:30', reply: null },
]

const mockStudents = [{ id: 3, name: '홍길동', classId: 1 }]

describe('VideoPlayer', () => {
  it('YouTube iframe이 올바른 videoId로 렌더링', () => {
    render(
      <VideoPlayer
        video={mockVideo}
        role="student"
        currentUser={{ id: 3, role: 'student' }}
        comments={mockComments}
        students={mockStudents}
        onBack={() => {}}
        onAddComment={() => {}}
        onAddReply={() => {}}
      />
    )
    const iframe = document.querySelector('iframe')
    expect(iframe.src).toContain('dQw4w9WgXcQ')
  })

  it('영상 제목이 표시', () => {
    render(
      <VideoPlayer
        video={mockVideo}
        role="student"
        currentUser={{ id: 3, role: 'student' }}
        comments={mockComments}
        students={mockStudents}
        onBack={() => {}}
        onAddComment={() => {}}
        onAddReply={() => {}}
      />
    )
    expect(screen.getByText('1강. 화법과 작문 기초')).toBeInTheDocument()
  })

  it('"← 목록으로" 클릭 시 onBack 호출', () => {
    const onBack = vi.fn()
    render(
      <VideoPlayer
        video={mockVideo}
        role="student"
        currentUser={{ id: 3, role: 'student' }}
        comments={mockComments}
        students={mockStudents}
        onBack={onBack}
        onAddComment={() => {}}
        onAddReply={() => {}}
      />
    )
    fireEvent.click(screen.getByText('← 목록으로'))
    expect(onBack).toHaveBeenCalledTimes(1)
  })
})
