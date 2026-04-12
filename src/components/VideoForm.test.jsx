// src/components/VideoForm.test.jsx
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import VideoForm from './VideoForm'

const mockClasses = [
  { id: 1, name: '수능국어A반' },
  { id: 2, name: '내신국어B반' },
]

describe('VideoForm', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('반 선택 드롭다운에 반 목록이 표시', () => {
    render(<VideoForm classes={mockClasses} onSubmit={() => {}} onCancel={() => {}} />)
    expect(screen.getByText('수능국어A반')).toBeInTheDocument()
    expect(screen.getByText('내신국어B반')).toBeInTheDocument()
  })

  it('"가져오기" 클릭 시 oEmbed 호출 후 제목 자동 입력', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        title: 'oEmbed 제목',
        thumbnail_url: 'https://img.youtube.com/vi/abc/hqdefault.jpg',
      }),
    }))

    render(<VideoForm classes={mockClasses} onSubmit={() => {}} onCancel={() => {}} />)
    fireEvent.change(screen.getByPlaceholderText('https://youtu.be/...'), {
      target: { value: 'https://youtu.be/abc123' },
    })
    fireEvent.click(screen.getByText('가져오기'))

    await waitFor(() => {
      expect(screen.getByDisplayValue('oEmbed 제목')).toBeInTheDocument()
    })
  })

  it('URL 없이 가져오기 버튼은 비활성화', () => {
    render(<VideoForm classes={mockClasses} onSubmit={() => {}} onCancel={() => {}} />)
    expect(screen.getByText('가져오기')).toBeDisabled()
  })

  it('필수 입력 누락 시 에러 메시지 표시', () => {
    render(<VideoForm classes={mockClasses} onSubmit={() => {}} onCancel={() => {}} />)
    fireEvent.click(screen.getByText('등록'))
    expect(screen.getByText('URL, 제목, 반을 모두 입력해주세요.')).toBeInTheDocument()
  })

  it('취소 클릭 시 onCancel 호출', () => {
    const onCancel = vi.fn()
    render(<VideoForm classes={mockClasses} onSubmit={() => {}} onCancel={onCancel} />)
    fireEvent.click(screen.getByText('취소'))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })
})
