// src/components/CommentSection.test.jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import CommentSection from './CommentSection'

const mockStudents = [
  { id: 3, name: '홍길동', classId: 1 },
]

const mockComments = [
  { id: 1, videoId: 1, studentId: 3, content: '질문입니다', createdAt: '2026-04-11 14:30', reply: null },
  { id: 2, videoId: 1, studentId: 3, content: '두 번째 질문', createdAt: '2026-04-11 15:00', reply: '답변이에요' },
]

describe('CommentSection', () => {
  it('학생 역할일 때 댓글 작성자가 "익명"으로 표시', () => {
    render(
      <CommentSection
        videoId={1}
        role="student"
        currentUser={{ id: 3, role: 'student' }}
        comments={mockComments}
        students={mockStudents}
        onAddComment={() => {}}
        onAddReply={() => {}}
      />
    )
    expect(screen.getAllByText('익명').length).toBeGreaterThan(0)
    expect(screen.queryByText('홍길동')).toBeNull()
  })

  it('교사 역할일 때 댓글 작성자가 실명으로 표시', () => {
    render(
      <CommentSection
        videoId={1}
        role="teacher"
        currentUser={{ id: 2, role: 'teacher' }}
        comments={mockComments}
        students={mockStudents}
        onAddComment={() => {}}
        onAddReply={() => {}}
      />
    )
    expect(screen.getAllByText('홍길동').length).toBeGreaterThan(0)
  })

  it('답변이 달린 댓글에 교사 답변 내용이 표시', () => {
    render(
      <CommentSection
        videoId={1}
        role="student"
        currentUser={{ id: 3, role: 'student' }}
        comments={mockComments}
        students={mockStudents}
        onAddComment={() => {}}
        onAddReply={() => {}}
      />
    )
    expect(screen.getByText('답변이에요')).toBeInTheDocument()
  })

  it('학생은 댓글 입력창이 보임', () => {
    render(
      <CommentSection
        videoId={1}
        role="student"
        currentUser={{ id: 3, role: 'student' }}
        comments={mockComments}
        students={mockStudents}
        onAddComment={() => {}}
        onAddReply={() => {}}
      />
    )
    expect(screen.getByPlaceholderText('익명으로 질문을 남겨보세요')).toBeInTheDocument()
  })

  it('학생이 댓글 작성 후 제출하면 onAddComment 호출', () => {
    const onAddComment = vi.fn()
    render(
      <CommentSection
        videoId={1}
        role="student"
        currentUser={{ id: 3, role: 'student' }}
        comments={mockComments}
        students={mockStudents}
        onAddComment={onAddComment}
        onAddReply={() => {}}
      />
    )
    fireEvent.change(screen.getByPlaceholderText('익명으로 질문을 남겨보세요'), {
      target: { value: '새 질문' },
    })
    fireEvent.click(screen.getByText('등록'))
    expect(onAddComment).toHaveBeenCalledWith({
      videoId: 1,
      studentId: 3,
      content: '새 질문',
    })
  })

  it('교사는 "답변 달기" 버튼이 보임 (미답변 댓글에만)', () => {
    render(
      <CommentSection
        videoId={1}
        role="teacher"
        currentUser={{ id: 2, role: 'teacher' }}
        comments={mockComments}
        students={mockStudents}
        onAddComment={() => {}}
        onAddReply={() => {}}
      />
    )
    // id:1 댓글은 reply 없음 → 버튼 있음
    expect(screen.getByText('답변 달기')).toBeInTheDocument()
  })
})
