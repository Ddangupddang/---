// src/components/VideoPlayer.jsx
import { useRef, useState } from 'react'
import CommentSection from './CommentSection'
import TrackedPlayer from './video/TrackedPlayer'
import ResumeBanner from './video/ResumeBanner'
import WatchProgressLine from './video/WatchProgressLine'
import WatchRoster from './video/WatchRoster'

/** 영상 재생 화면
 *  PC: 플레이어(2/3) + 오른쪽 칸(1/3) 2열
 *  모바일: 플레이어 → 제목 → 오른쪽 칸 세로 배치
 *
 *  학생: 이어보기 줄 · 실제 시청 진행 · 댓글
 *  교사·관리자: [댓글 | 시청 현황] 탭
 *
 *  Props:
 *    video           - { id, videoId, title, classId }
 *    role            - 'student' | 'teacher' | 'admin'
 *    currentUser     - { id, role, studentId }
 *    comments        - 전체 댓글 배열
 *    students        - 학생 배열 (실명 조회용)
 *    progressRows    - 시청 기록 (학생은 자기 것 0~1줄, 교사는 이 영상 전부)
 *    rosterStudents  - 이 영상을 볼 학생 명단 (교사 시청 현황용)
 *    onProgressSaved - (row) => void  저장이 끝난 최신 기록
 *    onBack, onAddComment, onAddReply
 */
export default function VideoPlayer({
  video, role, currentUser, comments, students,
  progressRows = [], rosterStudents = [], onProgressSaved,
  onBack, onAddComment, onAddReply,
}) {
  const isStudent = role === 'student'
  const controlRef = useRef(null)          // 플레이어를 직접 움직이는 손잡이 (이어보기)
  const [resumed, setResumed] = useState(false)
  const [tab, setTab] = useState('comments')
  const myRow = isStudent ? progressRows[0] : undefined

  const comment = (
    <CommentSection
      videoId={video.id}
      role={role}
      currentUser={currentUser}
      comments={comments}
      students={students}
      onAddComment={onAddComment}
      onAddReply={onAddReply}
    />
  )

  return (
    <div>
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-ink-mute hover:text-ink mb-4 transition-colors"
      >
        ← 목록으로
      </button>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="lg:w-2/3">
          {isStudent && !resumed && (
            <ResumeBanner
              row={myRow}
              onResume={(sec) => {
                controlRef.current?.resume(sec)   // 누른 그 순간 움직인다
                setResumed(true)                  // 한 번 눌렀으면 줄을 거둔다
              }}
            />
          )}
          <TrackedPlayer
            youtubeId={video.videoId}
            dbVideoId={video.id}
            title={video.title}
            trackAs={isStudent ? 'student' : null}
            controlRef={controlRef}
            onSaved={onProgressSaved}
          />
          <h2 className="mt-3 text-lg font-bold text-ink">{video.title}</h2>
          {isStudent && <WatchProgressLine row={myRow} />}
        </div>

        <div className="lg:w-1/3">
          {isStudent ? comment : (
            <>
              <div role="tablist" className="flex gap-2 mb-3">
                {[['comments', '댓글'], ['watch', '시청 현황']].map(([key, label]) => (
                  <button
                    key={key}
                    role="tab"
                    aria-selected={tab === key}
                    onClick={() => setTab(key)}
                    className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                      tab === key ? 'bg-ink text-white' : 'bg-surface-alt text-ink-soft hover:bg-line-soft'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {tab === 'comments' ? comment : <WatchRoster students={rosterStudents} rows={progressRows} />}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
