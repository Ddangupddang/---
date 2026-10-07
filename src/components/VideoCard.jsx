// src/components/VideoCard.jsx

/** 영상 목록 그리드에 표시되는 카드 컴포넌트
 *  Props:
 *    video       - { id, videoId, title, thumbnail, classId }
 *    className   - 반 이름 문자열 (예: "수능국어A반")
 *    commentCount - 댓글 수
 *    progressLabel - 시청 표시 ("✓ 완료", "73%", "완료 4/7") 또는 null
 *    onClick     - 카드 클릭 핸들러
 */
export default function VideoCard({ video, className, commentCount, progressLabel, onClick, onDelete }) {
  return (
    <div className="relative bg-surface rounded overflow-hidden border border-line hover:bg-surface-alt transition-colors">
      <div onClick={onClick} className="cursor-pointer">
        <img
          src={video.thumbnail}
          alt={video.title}
          className="w-full aspect-video object-cover bg-surface-alt"
          onError={(e) => {
            e.target.src = 'https://placehold.co/320x180?text=No+Thumbnail'
          }}
        />
        <div className="p-3">
          <h3 className="font-semibold text-sm text-ink line-clamp-2 mb-1">
            {video.title}
          </h3>
          <div className="text-xs text-ink-mute flex items-center gap-1">
            <span>{className}</span>
            <span>·</span>
            <span>댓글 {commentCount}</span>
            {progressLabel && (
              <>
                <span>·</span>
                <span className="font-bold text-navy whitespace-nowrap">{progressLabel}</span>
              </>
            )}
          </div>
        </div>
      </div>
      {onDelete && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete() }}
          className="absolute top-2 right-2 bg-black/50 hover:bg-danger text-white rounded-full w-7 h-7 flex items-center justify-center text-sm transition-colors"
          title="영상 삭제"
        >
          ✕
        </button>
      )}
    </div>
  )
}
