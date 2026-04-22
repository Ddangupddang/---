// src/pages/Videos.jsx
import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import VideoCard from '../components/VideoCard'
import VideoPlayer from '../components/VideoPlayer'
import VideoForm from '../components/VideoForm'
import { extractVideoId, getThumbnailUrl } from '../utils/youtube'
import Layout from '../components/Layout'

export default function Videos() {
  const { user } = useAuth()
  const {
    classes, students,
    videos, videoComments,
    addVideo, deleteVideo, addVideoComment, replyVideoComment,
  } = useData()

  const [selectedVideo,   setSelectedVideo]   = useState(null)
  const [showForm,        setShowForm]        = useState(false)
  const [selectedClassId, setSelectedClassId] = useState('all')

  // 학생은 본인 반만, 교사/관리자는 전체 반
  const accessibleClasses =
    user.role === 'student'
      ? classes.filter((c) => c.id === user.classId)
      : classes

  // 반 탭 + 학생 접근 필터 적용
  const filteredVideos = videos.filter((v) => {
    const classMatch =
      selectedClassId === 'all' || v.classId === Number(selectedClassId)
    const accessMatch =
      user.role !== 'student' || v.classId === user.classId
    return classMatch && accessMatch
  })

  async function handleAddVideo(data) {
    const videoId = data.videoId ?? extractVideoId(data.youtubeUrl)
    await addVideo({
      ...data,
      videoId,
      thumbnail: videoId ? getThumbnailUrl(videoId) : '',
      teacherId: user.id,
    })
    setShowForm(false)
  }

  async function handleAddComment({ videoId, studentId, content }) {
    await addVideoComment({ videoId, studentId, content })
  }

  async function handleAddReply(commentId, reply) {
    await replyVideoComment(commentId, reply)
  }

  async function handleDeleteVideo(id) {
    if (!confirm('영상을 삭제하시겠습니까?')) return
    await deleteVideo(id)
    if (selectedVideo?.id === id) setSelectedVideo(null)
  }

  // 영상 재생 화면
  if (selectedVideo) {
    // 삭제된 경우 목록으로 복귀
    const currentVideo = videos.find((v) => v.id === selectedVideo.id)
    if (!currentVideo) { setSelectedVideo(null); return null }

    return (
      <VideoPlayer
        video={currentVideo}
        role={user.role}
        currentUser={user}
        comments={videoComments}
        students={students}
        onBack={() => setSelectedVideo(null)}
        onAddComment={handleAddComment}
        onAddReply={handleAddReply}
      />
    )
  }

  return (
    <Layout>
    <div>
      {/* 헤더 */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-bold text-[#2B2B2B]">영상 관리</h1>
        {(user.role === 'teacher' || user.role === 'admin') && (
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-[#2B2B2B] text-white rounded-lg text-sm"
          >
            + 영상 등록
          </button>
        )}
      </div>

      {/* 영상 등록 모달 */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <VideoForm
              classes={accessibleClasses}
              onSubmit={handleAddVideo}
              onCancel={() => setShowForm(false)}
            />
          </div>
        </div>
      )}

      {/* 반 탭 */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {user.role !== 'student' && (
          <button
            onClick={() => setSelectedClassId('all')}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              selectedClassId === 'all'
                ? 'bg-[#2B2B2B] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            전체
          </button>
        )}
        {accessibleClasses.map((c) => (
          <button
            key={c.id}
            onClick={() => setSelectedClassId(String(c.id))}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              selectedClassId === String(c.id)
                ? 'bg-[#2B2B2B] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>

      {/* 영상 그리드 */}
      {filteredVideos.length === 0 ? (
        <p className="text-center text-gray-400 py-12">등록된 영상이 없어요.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVideos.map((video) => {
            const cls = classes.find((c) => c.id === video.classId)
            const commentCount = videoComments.filter((c) => c.videoId === video.id).length
            return (
              <VideoCard
                key={video.id}
                video={video}
                className={cls?.name ?? ''}
                commentCount={commentCount}
                onClick={() => setSelectedVideo(video)}
                onDelete={user.role !== 'student' ? () => handleDeleteVideo(video.id) : undefined}
              />
            )
          })}
        </div>
      )}
    </div>
    </Layout>
  )
}
