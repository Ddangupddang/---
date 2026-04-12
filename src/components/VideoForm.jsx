// src/components/VideoForm.jsx
import { useState } from 'react'
import { fetchVideoMeta, extractVideoId, getThumbnailUrl } from '../utils/youtube'

/** 영상 등록 폼
 *  Props:
 *    classes  - [{ id, name }] 반 목록
 *    onSubmit - ({ youtubeUrl, videoId, title, thumbnail, classId }) => void
 *    onCancel - () => void
 */
export default function VideoForm({ classes, onSubmit, onCancel }) {
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [thumbnail, setThumbnail] = useState('')
  const [classId, setClassId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleFetch() {
    setLoading(true)
    setError('')
    try {
      const meta = await fetchVideoMeta(url)
      setTitle(meta.title)
      const videoId = extractVideoId(url)
      setThumbnail(videoId ? getThumbnailUrl(videoId) : meta.thumbnail)
    } catch {
      setError('영상 정보를 가져올 수 없어요. URL을 확인해주세요.')
    } finally {
      setLoading(false)
    }
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!url || !title || !classId) {
      setError('URL, 제목, 반을 모두 입력해주세요.')
      return
    }
    const videoId = extractVideoId(url)
    onSubmit({
      youtubeUrl: url,
      videoId,
      title,
      thumbnail: videoId ? getThumbnailUrl(videoId) : thumbnail,
      classId: Number(classId),
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-lg font-bold text-[#2B2B2B]">영상 등록</h2>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">YouTube URL</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://youtu.be/..."
            className="flex-1 border rounded-lg px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={handleFetch}
            disabled={!url || loading}
            className="px-4 py-2 bg-[#5B8FD4] text-white rounded-lg text-sm disabled:opacity-50"
          >
            {loading ? '불러오는 중...' : '가져오기'}
          </button>
        </div>
      </div>

      {thumbnail && (
        <img src={thumbnail} alt="썸네일 미리보기" className="w-full max-w-xs rounded-lg" />
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">제목</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="강의 제목"
          className="w-full border rounded-lg px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">반 선택</label>
        <select
          value={classId}
          onChange={(e) => setClassId(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 text-sm"
        >
          <option value="">반을 선택해주세요</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {error && <p className="text-sm text-[#C0392B]">{error}</p>}

      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border rounded-lg text-sm text-gray-600"
        >
          취소
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-[#2B2B2B] text-white rounded-lg text-sm"
        >
          등록
        </button>
      </div>
    </form>
  )
}
