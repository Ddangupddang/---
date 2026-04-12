# 영상 관리 기능 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** YouTube oEmbed로 썸네일·제목 자동 추출, 반 기준 영상 분류, 익명 댓글/교사 답변 기능을 갖춘 영상 관리 페이지 구현

**Architecture:** Mock 데이터(videos.js, comments.js)로 상태 관리. 영상 재생은 Videos.jsx 내부 state로 전환(별도 라우트 없음, 기존 페이지 패턴과 일관). YouTube oEmbed API로 등록 시 제목·썸네일 자동 추출.

**Tech Stack:** React 19, Vite, Tailwind CSS, Vitest + jsdom + @testing-library/react, YouTube oEmbed API

---

## 파일 맵

| 상태 | 경로 | 역할 |
|------|------|------|
| 신규 | `src/data/videos.js` | 영상 Mock 데이터 |
| 신규 | `src/data/comments.js` | 댓글 Mock 데이터 |
| 신규 | `src/utils/youtube.js` | URL 파싱·oEmbed 호출 유틸 |
| 신규 | `src/utils/youtube.test.js` | 유틸 단위 테스트 |
| 신규 | `src/components/VideoCard.jsx` | 그리드 카드 컴포넌트 |
| 신규 | `src/components/VideoCard.test.jsx` | VideoCard 테스트 |
| 신규 | `src/components/CommentSection.jsx` | 댓글 목록 + 입력 |
| 신규 | `src/components/CommentSection.test.jsx` | CommentSection 테스트 |
| 신규 | `src/components/VideoForm.jsx` | 영상 등록 폼 |
| 신규 | `src/components/VideoForm.test.jsx` | VideoForm 테스트 |
| 신규 | `src/components/VideoPlayer.jsx` | 재생 화면 (PC 2열/모바일 세로) |
| 신규 | `src/components/VideoPlayer.test.jsx` | VideoPlayer 테스트 |
| 신규 | `src/pages/Videos.jsx` | 메인 페이지 |
| 신규 | `src/pages/Videos.test.jsx` | Videos 테스트 |
| 수정 | `src/App.jsx` | /videos 라우트 추가 |
| 수정 | `src/components/Sidebar.jsx` | 영상 관리 메뉴 활성화 |
| 수정 | `src/components/BottomNav.jsx` | 강의 영상 탭 추가 |

---

## Task 1: Mock 데이터 파일 생성

**Files:**
- Create: `src/data/videos.js`
- Create: `src/data/comments.js`

- [ ] **Step 1: videos.js 생성**

```js
// src/data/videos.js
export const videos = [
  {
    id: 1,
    youtubeUrl: 'https://youtu.be/dQw4w9WgXcQ',
    videoId: 'dQw4w9WgXcQ',
    title: '1강. 화법과 작문 기초',
    thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
    classId: 1,
    teacherId: 2,
    createdAt: '2026-04-10',
  },
  {
    id: 2,
    youtubeUrl: 'https://youtu.be/abc123def45',
    videoId: 'abc123def45',
    title: '2강. 독서 비문학 전략',
    thumbnail: 'https://img.youtube.com/vi/abc123def45/hqdefault.jpg',
    classId: 1,
    teacherId: 2,
    createdAt: '2026-04-08',
  },
  {
    id: 3,
    youtubeUrl: 'https://youtu.be/xyz789ghi01',
    videoId: 'xyz789ghi01',
    title: '1강. 현대시 분석 기초',
    thumbnail: 'https://img.youtube.com/vi/xyz789ghi01/hqdefault.jpg',
    classId: 2,
    teacherId: 2,
    createdAt: '2026-04-09',
  },
]
```

- [ ] **Step 2: comments.js 생성**

```js
// src/data/comments.js
export const comments = [
  {
    id: 1,
    videoId: 1,
    studentId: 3,
    content: '이 부분 이해가 잘 안 돼요. 다시 설명해 주실 수 있나요?',
    createdAt: '2026-04-11 14:30',
    reply: null,
  },
  {
    id: 2,
    videoId: 1,
    studentId: 3,
    content: '예시 문제 더 풀어볼 수 있는 방법이 있나요?',
    createdAt: '2026-04-11 15:00',
    reply: '다음 강의에서 추가 예시를 다룰 예정이에요.',
  },
]
```

- [ ] **Step 3: 커밋**

```bash
git add src/data/videos.js src/data/comments.js
git commit -m "feat: 영상·댓글 Mock 데이터 추가"
```

---

## Task 2: YouTube 유틸 함수 (TDD)

**Files:**
- Create: `src/utils/youtube.js`
- Create: `src/utils/youtube.test.js`

- [ ] **Step 1: 테스트 파일 먼저 작성**

```js
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
```

- [ ] **Step 2: 테스트 실행해서 실패 확인**

```bash
npx vitest run src/utils/youtube.test.js
```

Expected: FAIL (youtube.js 파일 없음)

- [ ] **Step 3: youtube.js 구현**

```js
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
```

- [ ] **Step 4: 테스트 실행해서 통과 확인**

```bash
npx vitest run src/utils/youtube.test.js
```

Expected: PASS (5 tests)

- [ ] **Step 5: 커밋**

```bash
git add src/utils/youtube.js src/utils/youtube.test.js
git commit -m "feat: YouTube URL 파싱·oEmbed 유틸 추가"
```

---

## Task 3: VideoCard 컴포넌트 (TDD)

**Files:**
- Create: `src/components/VideoCard.jsx`
- Create: `src/components/VideoCard.test.jsx`

- [ ] **Step 1: 테스트 작성**

```jsx
// src/components/VideoCard.test.jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import VideoCard from './VideoCard'

const mockVideo = {
  id: 1,
  videoId: 'dQw4w9WgXcQ',
  title: '1강. 화법과 작문 기초',
  thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
  classId: 1,
}

describe('VideoCard', () => {
  it('썸네일, 제목, 반 이름, 댓글 수를 렌더링', () => {
    render(
      <VideoCard
        video={mockVideo}
        className="수능국어A반"
        commentCount={3}
        onClick={() => {}}
      />
    )
    expect(screen.getByAltText('1강. 화법과 작문 기초')).toBeInTheDocument()
    expect(screen.getByText('1강. 화법과 작문 기초')).toBeInTheDocument()
    expect(screen.getByText('수능국어A반')).toBeInTheDocument()
    expect(screen.getByText('댓글 3')).toBeInTheDocument()
  })

  it('클릭 시 onClick 호출', () => {
    const onClick = vi.fn()
    render(
      <VideoCard
        video={mockVideo}
        className="수능국어A반"
        commentCount={0}
        onClick={onClick}
      />
    )
    fireEvent.click(screen.getByText('1강. 화법과 작문 기초'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 2: 테스트 실행해서 실패 확인**

```bash
npx vitest run src/components/VideoCard.test.jsx
```

Expected: FAIL

- [ ] **Step 3: VideoCard.jsx 구현**

```jsx
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
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
npx vitest run src/components/VideoCard.test.jsx
```

Expected: PASS (2 tests)

- [ ] **Step 5: 커밋**

```bash
git add src/components/VideoCard.jsx src/components/VideoCard.test.jsx
git commit -m "feat: VideoCard 컴포넌트 추가"
```

---

## Task 4: CommentSection 컴포넌트 (TDD)

**Files:**
- Create: `src/components/CommentSection.jsx`
- Create: `src/components/CommentSection.test.jsx`

- [ ] **Step 1: 테스트 작성**

```jsx
// src/components/CommentSection.test.jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import CommentSection from './CommentSection'

const mockStudents = [
  { id: 3, name: '홍길동', classId: 1 },
]

const mockComments = [
  { id: 1, videoId: 1, studentId: 3, content: '질문입니다', createdAt: '2026-04-11 14:30', reply: null },
  { id: 2, videoId: 1, studentId: 3, content: '두 번째 질문', createdAt: '2026-04-11 15:00', reply: '답변이에요' },
]

describe('CommentSection', () => {
  it('학생 역할일 때 댓글 작성자가 "익명"으로 표시', () => {
    render(
      <CommentSection
        videoId={1}
        role="student"
        currentUser={{ id: 3, role: 'student' }}
        comments={mockComments}
        students={mockStudents}
        onAddComment={() => {}}
        onAddReply={() => {}}
      />
    )
    expect(screen.getAllByText('익명').length).toBeGreaterThan(0)
    expect(screen.queryByText('홍길동')).toBeNull()
  })

  it('교사 역할일 때 댓글 작성자가 실명으로 표시', () => {
    render(
      <CommentSection
        videoId={1}
        role="teacher"
        currentUser={{ id: 2, role: 'teacher' }}
        comments={mockComments}
        students={mockStudents}
        onAddComment={() => {}}
        onAddReply={() => {}}
      />
    )
    expect(screen.getAllByText('홍길동').length).toBeGreaterThan(0)
  })

  it('답변이 달린 댓글에 교사 답변 내용이 표시', () => {
    render(
      <CommentSection
        videoId={1}
        role="student"
        currentUser={{ id: 3, role: 'student' }}
        comments={mockComments}
        students={mockStudents}
        onAddComment={() => {}}
        onAddReply={() => {}}
      />
    )
    expect(screen.getByText('답변이에요')).toBeInTheDocument()
  })

  it('학생은 댓글 입력창이 보임', () => {
    render(
      <CommentSection
        videoId={1}
        role="student"
        currentUser={{ id: 3, role: 'student' }}
        comments={mockComments}
        students={mockStudents}
        onAddComment={() => {}}
        onAddReply={() => {}}
      />
    )
    expect(screen.getByPlaceholderText('익명으로 질문을 남겨보세요')).toBeInTheDocument()
  })

  it('학생이 댓글 작성 후 제출하면 onAddComment 호출', () => {
    const onAddComment = vi.fn()
    render(
      <CommentSection
        videoId={1}
        role="student"
        currentUser={{ id: 3, role: 'student' }}
        comments={mockComments}
        students={mockStudents}
        onAddComment={onAddComment}
        onAddReply={() => {}}
      />
    )
    fireEvent.change(screen.getByPlaceholderText('익명으로 질문을 남겨보세요'), {
      target: { value: '새 질문' },
    })
    fireEvent.click(screen.getByText('등록'))
    expect(onAddComment).toHaveBeenCalledWith({
      videoId: 1,
      studentId: 3,
      content: '새 질문',
    })
  })

  it('교사는 "답변 달기" 버튼이 보임 (미답변 댓글에만)', () => {
    render(
      <CommentSection
        videoId={1}
        role="teacher"
        currentUser={{ id: 2, role: 'teacher' }}
        comments={mockComments}
        students={mockStudents}
        onAddComment={() => {}}
        onAddReply={() => {}}
      />
    )
    // id:1 댓글은 reply 없음 → 버튼 있음
    expect(screen.getByText('답변 달기')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: 테스트 실행해서 실패 확인**

```bash
npx vitest run src/components/CommentSection.test.jsx
```

Expected: FAIL

- [ ] **Step 3: CommentSection.jsx 구현**

```jsx
// src/components/CommentSection.jsx
import { useState } from 'react'

/** 영상 댓글 목록 + 입력 컴포넌트
 *  Props:
 *    videoId     - 현재 영상 id
 *    role        - 'student' | 'teacher' | 'admin'
 *    currentUser - { id, role }
 *    comments    - 전체 댓글 배열 (videoId로 필터링)
 *    students    - 학생 배열 (실명 조회용)
 *    onAddComment - ({ videoId, studentId, content }) => void
 *    onAddReply   - (commentId, replyText) => void
 */
export default function CommentSection({
  videoId,
  role,
  currentUser,
  comments,
  students,
  onAddComment,
  onAddReply,
}) {
  const [text, setText] = useState('')
  const [replyText, setReplyText] = useState('')
  const [replyingTo, setReplyingTo] = useState(null)

  const videoComments = comments.filter((c) => c.videoId === videoId)

  function getDisplayName(studentId) {
    if (role === 'student') return '익명'
    const student = students.find((s) => s.id === studentId)
    return student ? student.name : '알 수 없음'
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!text.trim()) return
    onAddComment({ videoId, studentId: currentUser.id, content: text.trim() })
    setText('')
  }

  function handleReplySubmit(commentId) {
    if (!replyText.trim()) return
    onAddReply(commentId, replyText.trim())
    setReplyText('')
    setReplyingTo(null)
  }

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-[#2B2B2B]">댓글 {videoComments.length}개</h3>

      <div className="space-y-3">
        {videoComments.map((comment) => (
          <div key={comment.id} className="bg-gray-50 rounded-lg p-3">
            <div className="flex justify-between items-start">
              <span className="text-sm font-medium text-[#2B2B2B]">
                {getDisplayName(comment.studentId)}
              </span>
              <span className="text-xs text-gray-400">{comment.createdAt}</span>
            </div>
            <p className="text-sm text-gray-700 mt-1">{comment.content}</p>

            {comment.reply && (
              <div className="mt-2 ml-3 bg-blue-50 rounded p-2 border-l-2 border-[#5B8FD4]">
                <span className="text-xs font-medium text-[#5B8FD4]">교사 답변</span>
                <p className="text-sm text-gray-700 mt-0.5">{comment.reply}</p>
              </div>
            )}

            {(role === 'teacher' || role === 'admin') && !comment.reply && (
              replyingTo === comment.id ? (
                <div className="mt-2 flex gap-2">
                  <input
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="답변을 입력하세요"
                    className="flex-1 border rounded px-2 py-1 text-sm"
                  />
                  <button
                    onClick={() => handleReplySubmit(comment.id)}
                    className="px-3 py-1 bg-[#5B8FD4] text-white rounded text-sm"
                  >
                    등록
                  </button>
                  <button
                    onClick={() => setReplyingTo(null)}
                    className="px-3 py-1 border rounded text-sm"
                  >
                    취소
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setReplyingTo(comment.id)}
                  className="mt-1 text-xs text-[#5B8FD4]"
                >
                  답변 달기
                </button>
              )
            )}
          </div>
        ))}

        {videoComments.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-4">아직 댓글이 없어요.</p>
        )}
      </div>

      {role === 'student' && (
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="익명으로 질문을 남겨보세요"
            className="flex-1 border rounded-lg px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-[#2B2B2B] text-white rounded-lg text-sm"
          >
            등록
          </button>
        </form>
      )}
    </div>
  )
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
npx vitest run src/components/CommentSection.test.jsx
```

Expected: PASS (6 tests)

- [ ] **Step 5: 커밋**

```bash
git add src/components/CommentSection.jsx src/components/CommentSection.test.jsx
git commit -m "feat: CommentSection 컴포넌트 추가 (익명/실명, 답변)"
```

---

## Task 5: VideoForm 컴포넌트 (TDD)

**Files:**
- Create: `src/components/VideoForm.jsx`
- Create: `src/components/VideoForm.test.jsx`

- [ ] **Step 1: 테스트 작성**

```jsx
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
```

- [ ] **Step 2: 테스트 실행해서 실패 확인**

```bash
npx vitest run src/components/VideoForm.test.jsx
```

Expected: FAIL

- [ ] **Step 3: VideoForm.jsx 구현**

```jsx
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
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
npx vitest run src/components/VideoForm.test.jsx
```

Expected: PASS (5 tests)

- [ ] **Step 5: 커밋**

```bash
git add src/components/VideoForm.jsx src/components/VideoForm.test.jsx
git commit -m "feat: VideoForm 컴포넌트 추가 (URL 자동추출, 반 선택)"
```

---

## Task 6: VideoPlayer 컴포넌트 (TDD)

**Files:**
- Create: `src/components/VideoPlayer.jsx`
- Create: `src/components/VideoPlayer.test.jsx`

- [ ] **Step 1: 테스트 작성**

```jsx
// src/components/VideoPlayer.test.jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import VideoPlayer from './VideoPlayer'

const mockVideo = {
  id: 1,
  videoId: 'dQw4w9WgXcQ',
  title: '1강. 화법과 작문 기초',
  thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
  classId: 1,
}

const mockComments = [
  { id: 1, videoId: 1, studentId: 3, content: '질문입니다', createdAt: '2026-04-11 14:30', reply: null },
]

const mockStudents = [{ id: 3, name: '홍길동', classId: 1 }]

describe('VideoPlayer', () => {
  it('YouTube iframe이 올바른 videoId로 렌더링', () => {
    render(
      <VideoPlayer
        video={mockVideo}
        role="student"
        currentUser={{ id: 3, role: 'student' }}
        comments={mockComments}
        students={mockStudents}
        onBack={() => {}}
        onAddComment={() => {}}
        onAddReply={() => {}}
      />
    )
    const iframe = document.querySelector('iframe')
    expect(iframe.src).toContain('dQw4w9WgXcQ')
  })

  it('영상 제목이 표시', () => {
    render(
      <VideoPlayer
        video={mockVideo}
        role="student"
        currentUser={{ id: 3, role: 'student' }}
        comments={mockComments}
        students={mockStudents}
        onBack={() => {}}
        onAddComment={() => {}}
        onAddReply={() => {}}
      />
    )
    expect(screen.getByText('1강. 화법과 작문 기초')).toBeInTheDocument()
  })

  it('"← 목록으로" 클릭 시 onBack 호출', () => {
    const onBack = vi.fn()
    render(
      <VideoPlayer
        video={mockVideo}
        role="student"
        currentUser={{ id: 3, role: 'student' }}
        comments={mockComments}
        students={mockStudents}
        onBack={onBack}
        onAddComment={() => {}}
        onAddReply={() => {}}
      />
    )
    fireEvent.click(screen.getByText('← 목록으로'))
    expect(onBack).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 2: 테스트 실행해서 실패 확인**

```bash
npx vitest run src/components/VideoPlayer.test.jsx
```

Expected: FAIL

- [ ] **Step 3: VideoPlayer.jsx 구현**

```jsx
// src/components/VideoPlayer.jsx
import CommentSection from './CommentSection'

/** 영상 재생 화면
 *  PC: 플레이어(2/3) + 댓글(1/3) 2열
 *  모바일: 플레이어 → 제목 → 댓글 세로 배치
 *
 *  Props:
 *    video       - { id, videoId, title }
 *    role        - 'student' | 'teacher' | 'admin'
 *    currentUser - { id, role }
 *    comments    - 전체 댓글 배열
 *    students    - 학생 배열 (실명 조회용)
 *    onBack      - () => void
 *    onAddComment - ({ videoId, studentId, content }) => void
 *    onAddReply   - (commentId, replyText) => void
 */
export default function VideoPlayer({
  video,
  role,
  currentUser,
  comments,
  students,
  onBack,
  onAddComment,
  onAddReply,
}) {
  return (
    <div>
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-[#2B2B2B] mb-4 transition-colors"
      >
        ← 목록으로
      </button>

      {/* PC: flex-row / 모바일: flex-col */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* 플레이어 영역 */}
        <div className="lg:w-2/3">
          <div className="aspect-video w-full bg-black rounded-xl overflow-hidden">
            <iframe
              src={`https://www.youtube.com/embed/${video.videoId}`}
              title={video.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full"
            />
          </div>
          <h2 className="mt-3 text-lg font-bold text-[#2B2B2B]">{video.title}</h2>
        </div>

        {/* 댓글 영역 */}
        <div className="lg:w-1/3">
          <CommentSection
            videoId={video.id}
            role={role}
            currentUser={currentUser}
            comments={comments}
            students={students}
            onAddComment={onAddComment}
            onAddReply={onAddReply}
          />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
npx vitest run src/components/VideoPlayer.test.jsx
```

Expected: PASS (3 tests)

- [ ] **Step 5: 커밋**

```bash
git add src/components/VideoPlayer.jsx src/components/VideoPlayer.test.jsx
git commit -m "feat: VideoPlayer 컴포넌트 추가 (PC 2열/모바일 세로)"
```

---

## Task 7: Videos 메인 페이지 (TDD)

**Files:**
- Create: `src/pages/Videos.jsx`
- Create: `src/pages/Videos.test.jsx`

- [ ] **Step 1: 테스트 작성**

```jsx
// src/pages/Videos.test.jsx
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AuthContext } from '../context/AuthContext'
import Videos from './Videos'

function renderWithAuth(user) {
  return render(
    <AuthContext.Provider value={{ user, login: () => {}, logout: () => {} }}>
      <MemoryRouter>
        <Videos />
      </MemoryRouter>
    </AuthContext.Provider>
  )
}

describe('Videos — 교사 역할', () => {
  const teacher = { id: 2, name: '김선생', role: 'teacher' }

  it('"영상 등록" 버튼이 표시', () => {
    renderWithAuth(teacher)
    expect(screen.getByText('+ 영상 등록')).toBeInTheDocument()
  })

  it('전체 영상 카드가 표시 (Mock 데이터 3개)', () => {
    renderWithAuth(teacher)
    expect(screen.getByText('1강. 화법과 작문 기초')).toBeInTheDocument()
    expect(screen.getByText('2강. 독서 비문학 전략')).toBeInTheDocument()
    expect(screen.getByText('1강. 현대시 분석 기초')).toBeInTheDocument()
  })

  it('"영상 등록" 클릭 시 등록 폼이 열림', () => {
    renderWithAuth(teacher)
    fireEvent.click(screen.getByText('+ 영상 등록'))
    expect(screen.getByText('영상 등록')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('https://youtu.be/...')).toBeInTheDocument()
  })

  it('영상 카드 클릭 시 플레이어 화면으로 전환', () => {
    renderWithAuth(teacher)
    fireEvent.click(screen.getByText('1강. 화법과 작문 기초'))
    expect(screen.getByText('← 목록으로')).toBeInTheDocument()
  })
})

describe('Videos — 학생 역할', () => {
  // classId: 1인 학생 (수능국어A반)
  const student = { id: 3, name: '홍길동', role: 'student', classId: 1 }

  it('"영상 등록" 버튼이 표시되지 않음', () => {
    renderWithAuth(student)
    expect(screen.queryByText('+ 영상 등록')).toBeNull()
  })

  it('본인 반(classId:1) 영상만 표시', () => {
    renderWithAuth(student)
    expect(screen.getByText('1강. 화법과 작문 기초')).toBeInTheDocument()
    // classId:2 영상은 표시 안 됨
    expect(screen.queryByText('1강. 현대시 분석 기초')).toBeNull()
  })
})
```

- [ ] **Step 2: 테스트 실행해서 실패 확인**

```bash
npx vitest run src/pages/Videos.test.jsx
```

Expected: FAIL

- [ ] **Step 3: Videos.jsx 구현**

```jsx
// src/pages/Videos.jsx
import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { videos as initialVideos } from '../data/videos'
import { comments as initialComments } from '../data/comments'
import { classes } from '../data/classes'
import { students } from '../data/students'
import VideoCard from '../components/VideoCard'
import VideoPlayer from '../components/VideoPlayer'
import VideoForm from '../components/VideoForm'
import { extractVideoId, getThumbnailUrl } from '../utils/youtube'

export default function Videos() {
  const { user } = useAuth()
  const [videos, setVideos] = useState(initialVideos)
  const [comments, setComments] = useState(initialComments)
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
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
npx vitest run src/pages/Videos.test.jsx
```

Expected: PASS (6 tests)

- [ ] **Step 5: 커밋**

```bash
git add src/pages/Videos.jsx src/pages/Videos.test.jsx
git commit -m "feat: Videos 메인 페이지 구현 (반 탭, 그리드, 재생, 등록)"
```

---

## Task 8: 라우팅 + 메뉴 활성화

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/components/Sidebar.jsx`
- Modify: `src/components/BottomNav.jsx`

- [ ] **Step 1: App.jsx에 /videos 라우트 추가**

`src/App.jsx` 상단 import에 추가:
```js
import Videos from './pages/Videos'
```

`<Grades />` 라우트 뒤, `<Route path="*" ...>` 앞에 추가:
```jsx
{/* 영상 관리 (전체 역할) */}
<Route
  path="/videos"
  element={
    <ProtectedRoute allowedRoles={['admin', 'teacher', 'student']}>
      <Videos />
    </ProtectedRoute>
  }
/>
```

- [ ] **Step 2: Sidebar.jsx — 영상 관리 메뉴 활성화**

`navConfig`의 `admin`과 `teacher` 배열에 항목 추가:
```js
{ label: '영상 관리', path: '/videos', icon: '🎬' },
```

`disabledItems`에서 `'🎬 영상 관리'` 제거:
```js
// 변경 전
const disabledItems = ['🎬 영상 관리', '📋 테스트', '💬 Q&A', '📢 공지사항', '📄 진도리포트']

// 변경 후
const disabledItems = ['📋 테스트', '💬 Q&A', '📢 공지사항', '📄 진도리포트']
```

- [ ] **Step 3: BottomNav.jsx — 강의 영상 탭 추가**

`tabs` 배열에 항목 추가:
```js
const tabs = [
  { label: '홈',   path: '/dashboard', icon: '🏠' },
  { label: '출결', path: '/attendance', icon: '✅' },
  { label: '성적', path: '/grades',     icon: '📊' },
  { label: '영상', path: '/videos',     icon: '🎬' },
]
```

- [ ] **Step 4: 전체 테스트 실행해서 기존 테스트 회귀 없음 확인**

```bash
npx vitest run
```

Expected: 모든 테스트 PASS (기존 테스트 포함)

- [ ] **Step 5: 빌드 확인**

```bash
npm run build
```

Expected: 에러 없이 빌드 성공

- [ ] **Step 6: 커밋**

```bash
git add src/App.jsx src/components/Sidebar.jsx src/components/BottomNav.jsx
git commit -m "feat: 영상 관리 라우팅 추가 및 메뉴 활성화"
```

---

## 완료 기준

- [ ] `npx vitest run` 전체 통과
- [ ] `npm run build` 에러 없음
- [ ] 교사로 로그인 → /videos → 영상 등록 → 카드 확인
- [ ] 학생으로 로그인 → /videos → 본인 반 영상만 표시
- [ ] 영상 카드 클릭 → 재생 화면 → 댓글 작성 확인
- [ ] 교사로 로그인 → 댓글에 실명 표시 + 답변 달기
