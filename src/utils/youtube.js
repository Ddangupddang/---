// src/utils/youtube.js

/** YouTube URL에서 videoId 추출 */
export function extractVideoId(url) {
  const patterns = [
    /youtu\.be\/([^?&/]+)/,
    /youtube\.com\/watch\?v=([^&]+)/,
    /youtube\.com\/embed\/([^?&]+)/,
  ]
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }
  return null
}

/** videoId로 썸네일 URL 직접 조합 (비공개 영상 폴백용) */
export function getThumbnailUrl(videoId) {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
}

/** YouTube oEmbed API로 제목·썸네일 가져오기 (API 키 불필요) */
export async function fetchVideoMeta(url) {
  const oEmbedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`
  const res = await fetch(oEmbedUrl)
  if (!res.ok) throw new Error('영상 정보를 가져올 수 없어요.')
  const data = await res.json()
  return {
    title: data.title,
    thumbnail: data.thumbnail_url,
  }
}
