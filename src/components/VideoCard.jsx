// src/components/VideoCard.jsx

/** 영상 목록 그리드에 표시되는 카드 컴포넌트
 *  Props:
 *    video       - { id, videoId, title, thumbnail, classId }
 *    className   - 반 이름 문자열 (예: "수능국어A반")
 *    commentCount - 댓글 수
 *    onClick     - 카드 클릭 핸들러
 */
export default function VideoCard({ video, className, commentCount, onClick }) {
  return (
    <div
      onClick={onClick}
      className="cursor-pointer bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
    >
      <img
        src={video.thumbnail}
        alt={video.title}
        className="w-full aspect-video object-cover bg-gray-200"
        onError={(e) => {
          e.target.src = 'https://placehold.co/320x180?text=No+Thumbnail'
        }}
      />
      <div className="p-3">
        <h3 className="font-semibold text-sm text-[#2B2B2B] line-clamp-2 mb-1">
          {video.title}
        </h3>
        <div className="text-xs text-gray-500 flex items-center gap-1">
          <span>{className}</span>
          <span>·</span>
          <span>댓글 {commentCount}</span>
        </div>
      </div>
    </div>
  )
}
