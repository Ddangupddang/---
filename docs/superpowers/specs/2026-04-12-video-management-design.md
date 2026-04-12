# 수문재국어전문학원 — 영상 관리 기능 설계 (2단계)

**작성일:** 2026-04-12  
**범위:** 2단계 — 영상 관리 (YouTube 임베드 + 익명 댓글)

---

## 1. 개요

교사가 YouTube 비공개 링크를 등록하면 썸네일·제목이 자동 추출되고, 학생은 본인 반 영상을 앱 안에서 시청하며 익명으로 질문을 남길 수 있다. 교사는 댓글에서 질문자 실명을 확인하고 답변을 달 수 있다.

---

## 2. 기술 결정사항

| 항목 | 결정 | 이유 |
|------|------|------|
| 썸네일·제목 추출 | YouTube oEmbed API | API 키 불필요, 구현 단순 |
| 데이터 저장 | Mock 데이터 (videos.js, comments.js) | Supabase 연동은 이후 단계 |
| 비공개 영상 썸네일 | img.youtube.com 직접 조합으로 대체 | oEmbed 비공개 미지원 보완 |

---

## 3. 데이터 구조

```js
// src/data/videos.js
[
  {
    id: 1,
    youtubeUrl: 'https://youtu.be/xxxxx',
    videoId: 'xxxxx',              // URL에서 추출
    title: '1강. 화법과 작문 기초', // 교사가 수정 가능
    thumbnail: 'https://img.youtube.com/vi/xxxxx/hqdefault.jpg',
    duration: '23:14',             // oEmbed로 추출
    classId: 1,                    // 반 연결
    teacherId: 2,                  // 등록한 교사
    createdAt: '2026-04-10',
  }
]

// src/data/comments.js
[
  {
    id: 1,
    videoId: 1,
    studentId: 3,                  // 실제 studentId 저장
    content: '이 부분 이해가 잘 안 돼요',
    createdAt: '2026-04-11 14:30',
    reply: null,                   // 교사 답변 (없으면 null)
  }
]
```

**댓글 표시 규칙:**
- 학생 화면: `studentId` → "익명" 표시
- 교사/관리자 화면: `studentId` → 실명 표시

---

## 4. 파일 구조

```
src/
├── data/
│   ├── videos.js          ← 영상 목록 Mock 데이터
│   └── comments.js        ← 댓글 Mock 데이터
├── pages/
│   └── Videos.jsx         ← 영상 관리 메인 페이지
├── components/
│   ├── VideoCard.jsx      ← 그리드 카드 (썸네일 + 제목 + 반)
│   ├── VideoPlayer.jsx    ← 재생 화면 (PC 2열 / 모바일 세로)
│   ├── VideoForm.jsx      ← 영상 등록 폼 (URL → 자동추출)
│   └── CommentSection.jsx ← 댓글 목록 + 입력
└── utils/
    └── youtube.js         ← YouTube URL 파싱, oEmbed 호출 유틸
```

---

## 5. 화면별 기능 명세

### 5-1. Videos.jsx (메인 페이지)
- 상단: 반 탭 (전체 / 수능국어A반 / 내신국어B반 ...)
- 탭 아래: 영상 카드 그리드 (PC 3열 / 모바일 1열)
- 교사/관리자: 우측 상단 "영상 등록" 버튼
- 학생: 본인 반 탭만 표시, 등록 버튼 없음

### 5-2. VideoCard.jsx
- 썸네일 이미지 (`https://img.youtube.com/vi/{videoId}/hqdefault.jpg`)
- 영상 제목
- 반 이름 + 댓글 수
- 클릭 시 VideoPlayer로 전환

### 5-3. VideoPlayer.jsx
- **PC**: 왼쪽 YouTube iframe (2/3 너비) + 오른쪽 CommentSection (1/3 너비)
- **모바일**: YouTube iframe → 제목/정보 → CommentSection 순 세로 배치
- 상단 "← 목록으로" 뒤로가기 버튼

### 5-4. VideoForm.jsx (교사/관리자만)
- YouTube URL 입력 → "가져오기" 버튼
- oEmbed API 자동 추출: 제목(수정 가능), 썸네일 미리보기
- 반 선택 드롭다운 (직접 선택)
- "등록" / "취소" 버튼

### 5-5. CommentSection.jsx
- 댓글 목록 (학생: "익명" / 교사·관리자: 실명 표시)
- 답변이 달린 댓글은 답변 내용도 함께 표시
- 하단 댓글 입력창 (학생만 작성 가능)
- 교사·관리자: 각 댓글에 "답변 달기" 버튼

### 5-6. youtube.js (유틸)
```js
// YouTube URL에서 videoId 추출
export function extractVideoId(url) { ... }

// oEmbed API로 제목·썸네일 가져오기
export async function fetchVideoMeta(url) { ... }

// 썸네일 URL 직접 조합 (비공개 영상 폴백)
export function getThumbnailUrl(videoId) {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
}
```

---

## 6. 라우팅 & 접근 권한

```
/videos          → Videos.jsx (반 탭 + 그리드)
/videos/:id      → VideoPlayer.jsx (영상 재생)
```

| 기능 | 학생 | 교사 | 관리자 |
|------|------|------|--------|
| 영상 목록 조회 | 본인 반만 | 전체 | 전체 |
| 영상 재생 | 본인 반만 | 전체 | 전체 |
| 영상 등록·수정·삭제 | X | O | O |
| 댓글 작성 | O (익명) | X | X |
| 댓글 답변 | X | O (실명) | O (실명) |
| 댓글 실명 확인 | X | O | O |

App.jsx에 라우트 2개 추가. 기존 ProtectedRoute 컴포넌트 재사용.

---

## 7. UI 레이아웃 결정

| 항목 | 결정 |
|------|------|
| 영상 목록 | 반 탭 + 그리드 카드 (PC 3열 / 모바일 1열) |
| 영상 재생 | PC 2열 (플레이어 + 댓글) / 모바일 세로 |
| 영상 등록 | URL 자동추출 + 제목 수정 + 반 선택 드롭다운 |

---

## 8. 향후 연동 계획

| 항목 | 현재 | 이후 |
|------|------|------|
| 데이터 저장 | Mock (videos.js) | Supabase DB |
| 썸네일 추출 | oEmbed + img.youtube.com | YouTube Data API v3 (API 키) |
| 댓글 알림 | 없음 | 카카오톡 알림톡 (3단계) |
