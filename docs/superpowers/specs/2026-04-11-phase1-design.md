# 수문재국어전문학원 학생 관리 시스템 — 1단계 설계

**작성일:** 2026-04-11  
**범위:** 1단계 핵심 기능

---

## 1. 개요

수문재국어전문학원을 위한 웹 기반 학생 관리 시스템의 1단계 구현 설계.  
관리자, 교사, 학생 3가지 역할로 구성되며, 출결·성적·학생 프로필을 통합 관리한다.

---

## 2. 기술 스택

| 항목 | 기술 |
|------|------|
| 프레임워크 | React 19 + Vite |
| 스타일링 | Tailwind CSS |
| 라우팅 | React Router DOM |
| 엑셀 처리 | xlsx |
| 데이터 | Mock 데이터 (Supabase 연결은 이후 단계) |

---

## 3. 디자인 시스템

```js
// src/constants/colors.js
export const colors = {
  primary:    '#2B2B2B', // 차콜 블랙 (로고 색상)
  secondary:  '#5B8FD4', // 로고 블루
  accent:     '#C0392B', // 소프트 레드
  background: '#F4F3EE', // 따뜻한 아이보리
  card:       '#FFFFFF',
}
```

폰트: Noto Sans KR

---

## 4. 레이아웃

- **PC**: 좌측 텍스트 사이드바 + 상단 헤더 + 우측 콘텐츠 영역
- **모바일**: 상단 헤더 + 콘텐츠 영역 + 하단 탭 바
- **학생은 모바일 전용** (PC에서 접속 시 모바일 너비 고정)
- 관리자/교사는 PC + 모바일 모두 지원

---

## 5. 파일 구조

```
src/
├── constants/
│   └── colors.js
├── context/
│   └── AuthContext.jsx      ← 로그인 상태 (user, role) 전역 관리
├── data/
│   ├── users.js             ← 로그인용 사용자 목록
│   ├── students.js          ← 학생 프로필
│   ├── classes.js           ← 반 목록
│   ├── attendance.js        ← 출결 기록
│   └── grades.js            ← 성적 기록
├── components/
│   ├── Layout.jsx           ← 전체 레이아웃 래퍼
│   ├── Sidebar.jsx          ← PC 사이드바 (역할별 메뉴)
│   ├── Header.jsx           ← 상단 헤더 (페이지명, 사용자, 로그아웃)
│   ├── BottomNav.jsx        ← 모바일 하단 탭 바
│   └── ProtectedRoute.jsx   ← 역할 기반 접근 제한
├── pages/
│   ├── Login.jsx
│   ├── Dashboard.jsx
│   ├── Students.jsx         ← 학생관리 + 반 필터 포함
│   ├── Attendance.jsx
│   └── Grades.jsx
├── App.jsx                  ← 라우팅 설정
└── main.jsx
```

---

## 6. Mock 데이터 구조

```js
// data/users.js
[
  { id: 1, name: '관리자', username: 'admin',    password: '1234', role: 'admin' },
  { id: 2, name: '김선생', username: 'teacher1', password: '1234', role: 'teacher' },
  { id: 3, name: '홍길동', username: 'student1', password: '1234', role: 'student', classId: 1 },
]

// data/classes.js
[
  { id: 1, name: '수능국어A반', teacherId: 2 },
  { id: 2, name: '내신국어B반', teacherId: 2 },
]

// data/students.js
[
  { id: 1, name: '홍길동', phone: '010-1234-5678',
    classId: 1, parentPhone: '010-9999-0000', joinDate: '2024-03-01' },
]

// data/attendance.js
[
  { id: 1, studentId: 1, date: '2025-04-01', status: 'present' },
  // status: 'present' | 'absent' | 'late'
]

// data/grades.js
[
  { id: 1, studentId: 1, type: 'weekly', date: '2025-04-07',
    subject: '독서', score: 85, total: 100 },
  // type: 'weekly' | 'exam'
]
```

---

## 7. 역할별 메뉴 구성

### 관리자 (admin)
| 메뉴 | 경로 | 상태 |
|------|------|------|
| 대시보드 | /dashboard | 1단계 |
| 학생 관리 | /students | 1단계 |
| 반 관리 | /students?tab=classes | 1단계 |
| 출결 관리 | /attendance | 1단계 |
| 성적 관리 | /grades | 1단계 |
| 영상 관리 | /videos | 비활성 (2단계) |
| 테스트 | /tests | 비활성 (2단계) |
| Q&A | /qna | 비활성 (3단계) |
| 공지사항 | /notices | 비활성 (3단계) |
| 진도리포트 | /reports | 비활성 (3단계) |

### 교사 (teacher)
| 메뉴 | 경로 | 상태 |
|------|------|------|
| 대시보드 | /dashboard | 1단계 |
| 학생 관리 | /students | 1단계 |
| 반 관리 | /students?tab=classes | 1단계 |
| 출결 관리 | /attendance | 1단계 |
| 성적 관리 | /grades | 1단계 |
| 영상 관리 | /videos | 비활성 (2단계) |
| 테스트 | /tests | 비활성 (2단계) |
| Q&A | /qna | 비활성 (3단계) |
| 진도리포트 | /reports | 비활성 (3단계) |

### 학생 (student)
| 메뉴 | 경로 | 상태 |
|------|------|------|
| 홈 | /dashboard | 1단계 |
| 내 출결 | /attendance | 1단계 |
| 내 성적 | /grades | 1단계 |
| 강의 영상 | /videos | 비활성 (2단계) |
| 테스트 | /tests | 비활성 (2단계) |
| Q&A | /qna | 비활성 (3단계) |
| 공지 | /notices | 비활성 (3단계) |

---

## 8. 화면 흐름 & 접근 권한

```
/ → 로그인 상태 확인
  → 미로그인 → /login
  → 로그인됨 → /dashboard

/login → 아이디/비밀번호 입력 → 역할 자동 감지 → /dashboard

접근 권한:
  /dashboard   → 전체 역할 (내용은 역할별로 다름)
  /students    → admin, teacher만 (학생 접근 시 /dashboard로 리다이렉트)
  /attendance  → 전체 역할 (학생은 본인 출결만 표시)
  /grades      → 전체 역할 (학생은 본인 성적만 표시)
```

---

## 9. 대시보드 구성

### 관리자 / 교사
- 반별 출결 현황 카드 (반 이름, 학생 수, 오늘 출석/결석/지각 수)
- 카드는 담당 반 목록 기준으로 표시 (관리자는 전체 반, 교사는 담당 반)

### 학생
- 내 출결 요약 카드 (이번 달 출석/결석/지각 수)
- 최근 성적 카드 (최근 테스트 점수)

---

## 10. 주요 페이지 기능

### 로그인 (Login.jsx)
- 아이디 + 비밀번호 입력 폼
- 로그인 버튼 클릭 시 Mock 데이터에서 사용자 확인
- 성공 시 AuthContext에 user/role 저장 후 /dashboard 이동
- 실패 시 에러 메시지 표시

### 학생 관리 (Students.jsx)
- 전체 학생 목록 테이블 (이름, 반, 연락처, 등록일)
- 상단에 반 필터 탭 (전체 / 반별)
- 학생 추가/수정/삭제 (관리자만)
- 엑셀 업로드로 학생 일괄 등록 (관리자만)
- 엑셀 다운로드 (관리자, 교사)

### 출결 관리 (Attendance.jsx)
- 날짜 선택 → 해당 날짜의 반별 출결 현황
- 출석/결석/지각 상태 토글 (관리자, 교사)
- 학생은 본인의 월별 출결 달력 표시
- **1단계 범위:** 수동 입력만 (WiFi 자동 출결 인증은 2단계 이후 구현)

### 성적 관리 (Grades.jsx)
- 주간 테스트 성적 + 내신 성적 탭
- 학생별 점수 입력 테이블 (관리자, 교사)
- 학생은 본인 성적만 확인 (점수 + 추이)

---

## 11. AuthContext 구조

```jsx
// context/AuthContext.jsx
const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null) // { id, name, username, role, classId? }

  const login = (username, password) => { /* Mock 데이터에서 확인 */ }
  const logout = () => { setUser(null) }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
```

---

## 12. 설치 패키지

```bash
npm install react-router-dom
npm install -D tailwindcss @tailwindcss/vite
npm install xlsx
```
