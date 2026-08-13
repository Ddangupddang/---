// src/components/CommentSection.jsx
import { useState } from 'react'

/** 영상 댓글 목록 + 입력 컴포넌트
 *  Props:
 *    videoId     - 현재 영상 id
 *    role        - 'student' | 'teacher' | 'admin'
 *    currentUser - { id, role }
 *    comments    - 전체 댓글 배열 (videoId로 필터링)
 *    students    - 학생 배열 (실명 조회용)
 *    onAddComment - ({ videoId, studentId, content }) => void
 *    onAddReply   - (commentId, replyText) => void
 */
export default function CommentSection({
  videoId,
  role,
  currentUser,
  comments,
  students,
  onAddComment,
  onAddReply,
}) {
  const [text, setText] = useState('')
  const [replyText, setReplyText] = useState('')
  const [replyingTo, setReplyingTo] = useState(null)

  const videoComments = comments.filter((c) => c.videoId === videoId)

  function getDisplayName(studentId) {
    if (role === 'student') return '익명'
    const student = students.find((s) => s.id === studentId)
    return student ? student.name : '알 수 없음'
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!text.trim()) return
    onAddComment({ videoId, studentId: currentUser.id, content: text.trim() })
    setText('')
  }

  function handleReplySubmit(commentId) {
    if (!replyText.trim()) return
    onAddReply(commentId, replyText.trim())
    setReplyText('')
    setReplyingTo(null)
  }

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-ink">댓글 {videoComments.length}개</h3>

      <div className="space-y-3">
        {videoComments.map((comment) => (
          <div key={comment.id} className="bg-surface-alt rounded p-3">
            <div className="flex justify-between items-start">
              <span className="text-sm font-medium text-ink">
                {getDisplayName(comment.studentId)}
              </span>
              <span className="text-xs text-ink-faint">{comment.createdAt}</span>
            </div>
            <p className="text-sm text-ink-soft mt-1">{comment.content}</p>

            {comment.reply && (
              <div className="mt-2 ml-3 bg-navy-soft rounded p-2 border-l-2 border-navy">
                <span className="text-xs font-medium text-navy">교사 답변</span>
                <p className="text-sm text-ink-soft mt-0.5">{comment.reply}</p>
              </div>
            )}

            {(role === 'teacher' || role === 'admin') && !comment.reply && (
              replyingTo === comment.id ? (
                <div className="mt-2 flex gap-2">
                  <input
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="답변을 입력하세요"
                    className="flex-1 border border-line rounded px-2 py-1 text-sm"
                  />
                  <button
                    onClick={() => handleReplySubmit(comment.id)}
                    className="px-3 py-1 bg-navy text-white rounded text-sm"
                  >
                    등록
                  </button>
                  <button
                    onClick={() => setReplyingTo(null)}
                    className="px-3 py-1 border border-line rounded text-sm"
                  >
                    취소
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setReplyingTo(comment.id)}
                  className="mt-1 text-xs text-navy"
                >
                  답변 달기
                </button>
              )
            )}
          </div>
        ))}

        {videoComments.length === 0 && (
          <p className="text-sm text-ink-faint text-center py-4">아직 댓글이 없어요.</p>
        )}
      </div>

      {role === 'student' && (
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="익명으로 질문을 남겨보세요"
            className="flex-1 border border-line rounded px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-ink text-white rounded text-sm"
          >
            등록
          </button>
        </form>
      )}
    </div>
  )
}
