// src/components/VideoPlayer.jsx
import CommentSection from './CommentSection'

/** 영상 재생 화면
 *  PC: 플레이어(2/3) + 댓글(1/3) 2열
 *  모바일: 플레이어 → 제목 → 댓글 세로 배치
 *
 *  Props:
 *    video       - { id, videoId, title }
 *    role        - 'student' | 'teacher' | 'admin'
 *    currentUser - { id, role }
 *    comments    - 전체 댓글 배열
 *    students    - 학생 배열 (실명 조회용)
 *    onBack      - () => void
 *    onAddComment - ({ videoId, studentId, content }) => void
 *    onAddReply   - (commentId, replyText) => void
 */
export default function VideoPlayer({
  video,
  role,
  currentUser,
  comments,
  students,
  onBack,
  onAddComment,
  onAddReply,
}) {
  return (
    <div>
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-ink-mute hover:text-ink mb-4 transition-colors"
      >
        ← 목록으로
      </button>

      {/* PC: flex-row / 모바일: flex-col */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* 플레이어 영역 */}
        <div className="lg:w-2/3">
          <div className="aspect-video w-full bg-black rounded overflow-hidden">
            <iframe
              src={`https://www.youtube.com/embed/${video.videoId}`}
              title={video.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full"
            />
          </div>
          <h2 className="mt-3 text-lg font-bold text-ink">{video.title}</h2>
        </div>

        {/* 댓글 영역 */}
        <div className="lg:w-1/3">
          <CommentSection
            videoId={video.id}
            role={role}
            currentUser={currentUser}
            comments={comments}
            students={students}
            onAddComment={onAddComment}
            onAddReply={onAddReply}
          />
        </div>
      </div>
    </div>
  )
}
