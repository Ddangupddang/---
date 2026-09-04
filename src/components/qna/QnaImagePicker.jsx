// src/components/qna/QnaImagePicker.jsx
// 사진을 고르고 미리보기로 보여주는 칸.
//
// 질문 작성 화면과 대화 글쓰기 칸이 같은 부품을 쓴다. 두 곳에 따로 적으면
// 장수 제한이나 안내 문구가 한쪽만 바뀐다.
//
// 실제 업로드는 등록을 누를 때 부모가 한다. 고를 때마다 올리면
// 뺐다 넣었다 한 사진이 스토리지에 쓰레기로 남는다.
import { useRef, useEffect } from 'react'
import { Camera, X } from 'lucide-react'
import { MAX_QNA_IMAGES, validateQnaImage } from '../../utils/qnaImage'

export default function QnaImagePicker({ photos, onChange, error, onError }) {
  const fileInputRef = useRef(null)
  // 정리할 때 최신 목록이 필요하다. photos를 의존성에 넣으면 사진을 더할 때마다
  // 정리가 돌아서 아직 쓰고 있는 미리보기까지 끊어 버린다.
  const photosRef = useRef(photos)
  photosRef.current = photos

  // 미리보기 주소는 브라우저가 붙들고 있으므로 화면을 떠날 때 놓아준다
  useEffect(() => () => photosRef.current.forEach((p) => URL.revokeObjectURL(p.preview)), [])

  function handlePick(e) {
    const picked = Array.from(e.target.files ?? [])
    // 같은 사진을 뺐다가 다시 고를 수 있게 입력칸을 비운다
    e.target.value = ''

    const next = [...photos]
    let firstReason = ''
    for (const file of picked) {
      const reason = validateQnaImage(file, next.length)
      // 한 장이 걸려도 나머지는 받는다. 사유는 처음 것만 보여준다.
      if (reason) { firstReason ||= reason; continue }
      next.push({ file, preview: URL.createObjectURL(file) })
    }
    onChange(next)
    onError(firstReason)
  }

  function removePhoto(index) {
    URL.revokeObjectURL(photos[index].preview)
    onChange(photos.filter((_, i) => i !== index))
    onError('')
  }

  return (
    <div>
      <div className="flex gap-2 flex-wrap">
        {photos.map((p, i) => (
          <div
            key={p.preview}
            data-testid={`qna-photo-${i}`}
            className="relative w-20 h-20 rounded border border-line overflow-hidden"
          >
            <img src={p.preview} alt={`첨부 사진 ${i + 1}`} className="w-full h-full object-cover" />
            <button
              type="button"
              data-testid={`qna-photo-remove-${i}`}
              onClick={() => removePhoto(i)}
              aria-label={`첨부 사진 ${i + 1} 빼기`}
              className="absolute top-0 right-0 bg-ink/70 text-white p-0.5 rounded-bl"
            >
              <X size={14} aria-hidden="true" />
            </button>
          </div>
        ))}

        {photos.length < MAX_QNA_IMAGES && (
          <button
            type="button"
            data-testid="qna-photo-add"
            onClick={() => fileInputRef.current?.click()}
            className="w-20 h-20 rounded border border-line border-dashed text-ink-mute flex flex-col items-center justify-center gap-1 hover:bg-surface-alt transition-colors"
          >
            <Camera size={18} aria-hidden="true" />
            <span className="text-xs">사진 추가</span>
          </button>
        )}
      </div>

      {/* accept 덕분에 폰에서 카메라와 앨범을 바로 고를 수 있다 */}
      <input
        ref={fileInputRef}
        data-testid="qna-photo-input"
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handlePick}
      />

      {error && (
        <p data-testid="qna-photo-error" className="text-xs text-danger mt-2">{error}</p>
      )}
    </div>
  )
}
