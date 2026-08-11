// src/components/homework/SolutionViewer.jsx
// 해설(YouTube 영상 + 파일)을 표시. 둘 다 없으면 렌더하지 않는다.

// YouTube URL에서 videoId 추출 (watch?v=, youtu.be/, embed/ 지원)
function youtubeId(url) {
  if (!url) return null
  const m = url.match(/(?:v=|youtu\.be\/|embed\/)([\w-]{11})/)
  return m ? m[1] : null
}

export default function SolutionViewer({ videoUrl, fileUrl, label = '해설' }) {
  const vid = youtubeId(videoUrl)
  if (!vid && !fileUrl) return null
  return (
    <div className="mt-3">
      <p className="text-sm font-semibold text-gray-700 mb-2">{label}</p>
      {vid && (
        <div className="relative w-full mb-2" style={{ paddingTop: '56.25%' }}>
          <iframe
            className="absolute inset-0 w-full h-full rounded-lg"
            src={`https://www.youtube.com/embed/${vid}`}
            title="해설 영상"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}
      {fileUrl && (
        <a
          href={fileUrl} target="_blank" rel="noreferrer"
          className="inline-block px-4 py-2 bg-[#5B8FD4]/15 text-[#5B8FD4] rounded-lg text-sm font-medium"
        >
          해설 파일 열기
        </a>
      )}
    </div>
  )
}
