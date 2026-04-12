// src/utils/youtube.test.js
import { describe, it, expect, vi, afterEach } from 'vitest'
import { extractVideoId, getThumbnailUrl, fetchVideoMeta } from './youtube'

describe('extractVideoId', () => {
  it('youtu.be 단축 URL에서 videoId 추출', () => {
    expect(extractVideoId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
  })

  it('youtube.com/watch URL에서 videoId 추출', () => {
    expect(extractVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
  })

  it('잘못된 URL이면 null 반환', () => {
    expect(extractVideoId('https://example.com')).toBeNull()
  })
})

describe('getThumbnailUrl', () => {
  it('videoId로 YouTube 썸네일 URL 반환', () => {
    expect(getThumbnailUrl('dQw4w9WgXcQ')).toBe(
      'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg'
    )
  })
})

describe('fetchVideoMeta', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('oEmbed API 호출 성공 시 title과 thumbnail 반환', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        title: '테스트 영상 제목',
        thumbnail_url: 'https://img.youtube.com/vi/abc/hqdefault.jpg',
      }),
    }))

    const meta = await fetchVideoMeta('https://youtu.be/abc123')
    expect(meta.title).toBe('테스트 영상 제목')
    expect(meta.thumbnail).toBe('https://img.youtube.com/vi/abc/hqdefault.jpg')
  })

  it('oEmbed API 실패 시 에러 throw', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))
    await expect(fetchVideoMeta('https://youtu.be/abc')).rejects.toThrow(
      '영상 정보를 가져올 수 없어요.'
    )
  })
})
