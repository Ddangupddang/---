// src/pages/Videos.jsx
import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { videos as initialVideos } from '../data/videos'
import { comments as initialComments } from '../data/comments'
import { useData } from '../context/DataContext'
import VideoCard from '../components/VideoCard'
import VideoPlayer from '../components/VideoPlayer'
import VideoForm from '../components/VideoForm'
import { extractVideoId, getThumbnailUrl } from '../utils/youtube'
import Layout from '../components/Layout'

// localStorage 키
const VIDEOS_KEY   = 'smj_videos'
const COMMENTS_KEY = 'smj_comments'

function loadFromStorage(key, fallback) {
  try {
    const saved = localStorage.getItem(key)
    return saved ? JSON.parse(saved) : fallback
  } catch {
    return fallback
  }
}

export default function Videos() {
  const { user } = useAuth()
  const { classes, students } = useData()
  const [videos,   setVideos]   = useState(() => loadFromStorage(VIDEOS_KEY,   initialVideos))
  const [comments, setComments] = useState(() => loadFromStorage(COMMENTS_KEY, initialComments))

  // videos/comments 변경 시 localStorage에 저장
  useEffect(() => { localStorage.setItem(VIDEOS_KEY,   JSON.stringify(videos))   }, [videos])
  useEffect(() => { localStorage.setItem(COMMENTS_KEY, JSON.stringify(comments)) }, [comments])
  const [selectedVideo, setSelectedVideo] = useState(null)
  const [showForm, setShowForm] = useState(false)
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

  function handleAddVideo(data) {
    const videoId = data.videoId ?? extractVideoId(data.youtubeUrl)
    const newVideo = {
      id: videos.length + 1,
      ...data,
      videoId,
      thumbnail: videoId ? getThumbnailUrl(videoId) : '',
      teacherId: user.id,
      createdAt: new Date().toISOString().slice(0, 10),
    }
    setVideos([newVideo, ...videos])
    setShowForm(false)
  }

  function handleAddComment({ videoId, studentId, content }) {
    const newComment = {
      id: comments.length + 1,
      videoId,
      studentId,
      content,
      createdAt: new Date().toLocaleString('ko-KR'),
      reply: null,
    }
    setComments([...comments, newComment])
  }

  function handleAddReply(commentId, reply) {
    setComments(
      comments.map((c) => (c.id === commentId ? { ...c, reply } : c))
    )
  }

  function handleDeleteVideo(videoId) {
    if (!confirm('영상을 삭제하시겠습니까?')) return
    setVideos((prev) => prev.filter((v) => v.id !== videoId))
    setComments((prev) => prev.filter((c) => c.videoId !== videoId))
  }

  // 영상 재생 화면
  if (selectedVideo) {
    return (
      <VideoPlayer
        video={selectedVideo}
        role={user.role}
        currentUser={user}
        comments={comments}
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
            const commentCount = comments.filter((c) => c.videoId === video.id).length
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
