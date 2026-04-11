# 수문재 학생관리 시스템 1단계 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** React + Tailwind 기반의 수문재국어전문학원 학생 관리 시스템 1단계 (레이아웃, 로그인, 대시보드, 학생관리, 출결관리, 성적관리) 구현

**Architecture:** 페이지 중심 구조. AuthContext로 로그인 상태 관리, ProtectedRoute로 역할 기반 접근 제한, Mock 데이터로 백엔드 없이 동작. PC는 사이드바+헤더, 모바일(학생)은 하단 탭 바.

**Tech Stack:** React 19 + Vite 8, React Router DOM v7, Tailwind CSS v4, xlsx, Vitest + React Testing Library

---

## 파일 구조 (전체)

```
src/
├── constants/colors.js
├── context/AuthContext.jsx
├── data/users.js · students.js · classes.js · attendance.js · grades.js
├── components/
│   ├── Layout.jsx · Sidebar.jsx · Header.jsx · BottomNav.jsx · ProtectedRoute.jsx
├── pages/
│   ├── Login.jsx · Dashboard.jsx · Students.jsx · Attendance.jsx · Grades.jsx
├── App.jsx · main.jsx · index.css
public/index.html (기존)
```

---

## Task 1: 패키지 설치

**Files:**
- Modify: `package.json` (패키지 추가)
- Modify: `vite.config.js`
- Modify: `src/index.css`
- Modify: `index.html`

- [ ] **Step 1: 의존성 패키지 설치**

```bash
npm install react-router-dom xlsx
npm install -D tailwindcss @tailwindcss/vite vitest @vitest/ui jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom
```

Expected: `node_modules/` 에 패키지들 설치됨, 오류 없음

- [ ] **Step 2: vite.config.js 수정 (Tailwind + Vitest 설정 추가)**

```js
// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    globals: true,
  },
})
```

- [ ] **Step 3: 테스트 셋업 파일 생성**

```js
// src/test/setup.js
import '@testing-library/jest-dom'
```

- [ ] **Step 4: index.css 수정 (Tailwind + 폰트 설정)**

```css
/* src/index.css */
@import "tailwindcss";

@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;600;700;800&display=swap');

@layer base {
  * {
    font-family: 'Noto Sans KR', -apple-system, BlinkMacSystemFont, sans-serif;
  }
  body {
    background-color: #F4F3EE;
    color: #2B2B2B;
  }
}
```

- [ ] **Step 5: index.html에서 기존 Vite 보일러플레이트 타이틀 수정**

```html
<!-- index.html: <title> 태그만 수정 -->
<title>수문재국어전문학원</title>
```

- [ ] **Step 6: 개발 서버 실행 확인**

```bash
npm run dev
```

Expected: `http://localhost:5173` 에서 기존 Vite 화면이 보임 (오류 없음)

- [ ] **Step 7: 커밋**

```bash
git add -A
git commit -m "chore: 패키지 설치 및 Tailwind, Vitest 설정"
```

---

## Task 2: 디자인 상수 & Mock 데이터

**Files:**
- Create: `src/constants/colors.js`
- Create: `src/data/users.js`
- Create: `src/data/classes.js`
- Create: `src/data/students.js`
- Create: `src/data/attendance.js`
- Create: `src/data/grades.js`

- [ ] **Step 1: src/constants/colors.js 생성**

```js
// src/constants/colors.js
// 수문재 디자인 시스템 색상 상수
export const colors = {
  primary:    '#2B2B2B', // 차콜 블랙
  secondary:  '#5B8FD4', // 로고 블루
  accent:     '#C0392B', // 소프트 레드
  background: '#F4F3EE', // 따뜻한 아이보리
  card:       '#FFFFFF',
  success:    '#27ae60',
  warning:    '#f39c12',
}
```

- [ ] **Step 2: src/data/users.js 생성**

```js
// src/data/users.js
// 로그인 테스트 계정 (실제 서비스에선 Supabase로 대체)
// studentId: students.js의 id와 연결 (학생 역할에만 존재)
export const users = [
  { id: 1, name: '관리자', username: 'admin',    password: '1234', role: 'admin' },
  { id: 2, name: '김선생', username: 'teacher1', password: '1234', role: 'teacher' },
  { id: 3, name: '이선생', username: 'teacher2', password: '1234', role: 'teacher' },
  { id: 4, name: '홍길동', username: 'student1', password: '1234', role: 'student', classId: 1, studentId: 1 },
  { id: 5, name: '김철수', username: 'student2', password: '1234', role: 'student', classId: 1, studentId: 2 },
  { id: 6, name: '이영희', username: 'student3', password: '1234', role: 'student', classId: 2, studentId: 4 },
]
```

- [ ] **Step 3: src/data/classes.js 생성**

```js
// src/data/classes.js
// 반 목록
export const classes = [
  { id: 1, name: '수능국어A반', teacherId: 2 },
  { id: 2, name: '내신국어B반', teacherId: 2 },
  { id: 3, name: '수능국어C반', teacherId: 3 },
]
```

- [ ] **Step 4: src/data/students.js 생성**

```js
// src/data/students.js
// 학생 프로필 목록
export const students = [
  { id: 1, name: '홍길동', phone: '010-1234-5678', classId: 1, parentPhone: '010-9001-0001', joinDate: '2025-03-01' },
  { id: 2, name: '김철수', phone: '010-2345-6789', classId: 1, parentPhone: '010-9001-0002', joinDate: '2025-03-01' },
  { id: 3, name: '박민준', phone: '010-3456-7890', classId: 1, parentPhone: '010-9001-0003', joinDate: '2025-03-01' },
  { id: 4, name: '이영희', phone: '010-4567-8901', classId: 2, parentPhone: '010-9001-0004', joinDate: '2025-03-01' },
  { id: 5, name: '최수진', phone: '010-5678-9012', classId: 2, parentPhone: '010-9001-0005', joinDate: '2025-03-15' },
  { id: 6, name: '정다은', phone: '010-6789-0123', classId: 3, parentPhone: '010-9001-0006', joinDate: '2025-03-15' },
  { id: 7, name: '강민서', phone: '010-7890-1234', classId: 3, parentPhone: '010-9001-0007', joinDate: '2025-04-01' },
]
```

- [ ] **Step 5: src/data/attendance.js 생성**

```js
// src/data/attendance.js
// 출결 기록. status: 'present'(출석) | 'absent'(결석) | 'late'(지각)
export const attendance = [
  { id: 1,  studentId: 1, date: '2026-04-07', status: 'present' },
  { id: 2,  studentId: 2, date: '2026-04-07', status: 'absent'  },
  { id: 3,  studentId: 3, date: '2026-04-07', status: 'present' },
  { id: 4,  studentId: 4, date: '2026-04-07', status: 'present' },
  { id: 5,  studentId: 5, date: '2026-04-07', status: 'late'    },
  { id: 6,  studentId: 6, date: '2026-04-07', status: 'present' },
  { id: 7,  studentId: 7, date: '2026-04-07', status: 'present' },
  { id: 8,  studentId: 1, date: '2026-04-08', status: 'present' },
  { id: 9,  studentId: 2, date: '2026-04-08', status: 'present' },
  { id: 10, studentId: 3, date: '2026-04-08', status: 'late'    },
  { id: 11, studentId: 4, date: '2026-04-08', status: 'present' },
  { id: 12, studentId: 5, date: '2026-04-08', status: 'present' },
  { id: 13, studentId: 1, date: '2026-04-09', status: 'present' },
  { id: 14, studentId: 2, date: '2026-04-09', status: 'absent'  },
  { id: 15, studentId: 3, date: '2026-04-09', status: 'present' },
  { id: 16, studentId: 4, date: '2026-04-09', status: 'present' },
  { id: 17, studentId: 5, date: '2026-04-09', status: 'present' },
  { id: 18, studentId: 6, date: '2026-04-09', status: 'absent'  },
]
```

- [ ] **Step 6: src/data/grades.js 생성**

```js
// src/data/grades.js
// 성적 기록. type: 'weekly'(주간테스트) | 'exam'(내신시험)
export const grades = [
  { id: 1, studentId: 1, type: 'weekly', date: '2026-04-07', subject: '독서', part: '현대문학', score: 85, total: 100 },
  { id: 2, studentId: 2, type: 'weekly', date: '2026-04-07', subject: '독서', part: '현대문학', score: 72, total: 100 },
  { id: 3, studentId: 3, type: 'weekly', date: '2026-04-07', subject: '독서', part: '현대문학', score: 91, total: 100 },
  { id: 4, studentId: 4, type: 'weekly', date: '2026-04-07', subject: '문학',  part: '고전소설',  score: 78, total: 100 },
  { id: 5, studentId: 5, type: 'weekly', date: '2026-04-07', subject: '문학',  part: '고전소설',  score: 65, total: 100 },
  { id: 6, studentId: 1, type: 'weekly', date: '2026-03-31', subject: '독서', part: '비문학',   score: 80, total: 100 },
  { id: 7, studentId: 2, type: 'weekly', date: '2026-03-31', subject: '독서', part: '비문학',   score: 68, total: 100 },
  { id: 8, studentId: 1, type: 'exam',   date: '2026-03-20', subject: '국어', part: '3월 모의고사', score: 82, total: 100 },
  { id: 9, studentId: 2, type: 'exam',   date: '2026-03-20', subject: '국어', part: '3월 모의고사', score: 70, total: 100 },
]
```

- [ ] **Step 7: 커밋**

```bash
git add src/constants/ src/data/
git commit -m "feat: 디자인 상수 및 Mock 데이터 추가"
```

---

## Task 3: AuthContext 구현 (TDD)

**Files:**
- Create: `src/context/AuthContext.test.jsx`
- Create: `src/context/AuthContext.jsx`

- [ ] **Step 1: 실패하는 테스트 작성**

```jsx
// src/context/AuthContext.test.jsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { AuthProvider, useAuth } from './AuthContext'

// useAuth를 테스트하기 위한 헬퍼 컴포넌트
function TestComponent() {
  const { user, login, logout } = useAuth()
  return (
    <div>
      <span data-testid="role">{user?.role ?? 'none'}</span>
      <button onClick={() => login('admin', '1234')}>관리자 로그인</button>
      <button onClick={() => login('student1', '1234')}>학생 로그인</button>
      <button onClick={() => login('wrong', 'wrong')}>잘못된 로그인</button>
      <button onClick={logout}>로그아웃</button>
    </div>
  )
}

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('초기 상태는 로그인 안 된 상태', () => {
    render(<AuthProvider><TestComponent /></AuthProvider>)
    expect(screen.getByTestId('role').textContent).toBe('none')
  })

  it('admin 로그인 성공 시 role이 admin', async () => {
    render(<AuthProvider><TestComponent /></AuthProvider>)
    await act(async () => {
      screen.getByText('관리자 로그인').click()
    })
    expect(screen.getByTestId('role').textContent).toBe('admin')
  })

  it('student1 로그인 성공 시 role이 student', async () => {
    render(<AuthProvider><TestComponent /></AuthProvider>)
    await act(async () => {
      screen.getByText('학생 로그인').click()
    })
    expect(screen.getByTestId('role').textContent).toBe('student')
  })

  it('잘못된 계정으로 로그인 시 user는 null 유지', async () => {
    render(<AuthProvider><TestComponent /></AuthProvider>)
    await act(async () => {
      screen.getByText('잘못된 로그인').click()
    })
    expect(screen.getByTestId('role').textContent).toBe('none')
  })

  it('로그아웃 시 user가 null', async () => {
    render(<AuthProvider><TestComponent /></AuthProvider>)
    await act(async () => {
      screen.getByText('관리자 로그인').click()
    })
    await act(async () => {
      screen.getByText('로그아웃').click()
    })
    expect(screen.getByTestId('role').textContent).toBe('none')
  })

  it('로그인 상태가 localStorage에 저장됨', async () => {
    render(<AuthProvider><TestComponent /></AuthProvider>)
    await act(async () => {
      screen.getByText('관리자 로그인').click()
    })
    const saved = JSON.parse(localStorage.getItem('soomoonjae_user'))
    expect(saved?.role).toBe('admin')
  })
})
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

```bash
npx vitest run src/context/AuthContext.test.jsx
```

Expected: FAIL — `AuthContext` 파일이 없으므로 import 에러

- [ ] **Step 3: AuthContext.jsx 구현**

```jsx
// src/context/AuthContext.jsx
import { createContext, useContext, useState } from 'react'
import { users } from '../data/users'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  // localStorage에서 이전 로그인 정보 복원
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('soomoonjae_user')
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })

  // 로그인: 성공 시 true, 실패 시 false 반환
  const login = (username, password) => {
    const found = users.find(
      (u) => u.username === username && u.password === password
    )
    if (found) {
      setUser(found)
      localStorage.setItem('soomoonjae_user', JSON.stringify(found))
      return true
    }
    return false
  }

  // 로그아웃
  const logout = () => {
    setUser(null)
    localStorage.removeItem('soomoonjae_user')
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

// 사용법: const { user, login, logout } = useAuth()
export const useAuth = () => useContext(AuthContext)
```

- [ ] **Step 4: 테스트 실행 — 통과 확인**

```bash
npx vitest run src/context/AuthContext.test.jsx
```

Expected: PASS — 6개 테스트 모두 통과

- [ ] **Step 5: 커밋**

```bash
git add src/context/
git commit -m "feat: AuthContext 로그인/로그아웃 상태 관리 구현"
```

---

## Task 4: ProtectedRoute 구현 (TDD)

**Files:**
- Create: `src/components/ProtectedRoute.test.jsx`
- Create: `src/components/ProtectedRoute.jsx`

- [ ] **Step 1: 실패하는 테스트 작성**

```jsx
// src/components/ProtectedRoute.test.jsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { AuthContext } from '../context/AuthContext'
import ProtectedRoute from './ProtectedRoute'

// 테스트용 AuthContext 값 주입 헬퍼
function renderWithAuth(user, element) {
  return render(
    <AuthContext.Provider value={{ user, login: () => {}, logout: () => {} }}>
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route path="/login" element={<div>로그인 페이지</div>} />
          <Route path="/dashboard" element={<div>대시보드</div>} />
          <Route
            path="/protected"
            element={
              <ProtectedRoute allowedRoles={['admin', 'teacher']}>
                <div>보호된 페이지</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>
  )
}

describe('ProtectedRoute', () => {
  it('비로그인 상태에서 /login으로 리다이렉트', () => {
    renderWithAuth(null, null)
    expect(screen.getByText('로그인 페이지')).toBeInTheDocument()
  })

  it('권한 있는 역할(admin)은 페이지 접근 허용', () => {
    renderWithAuth({ role: 'admin' }, null)
    expect(screen.getByText('보호된 페이지')).toBeInTheDocument()
  })

  it('권한 없는 역할(student)은 /dashboard로 리다이렉트', () => {
    renderWithAuth({ role: 'student' }, null)
    expect(screen.getByText('대시보드')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

```bash
npx vitest run src/components/ProtectedRoute.test.jsx
```

Expected: FAIL — `ProtectedRoute` 파일 없음

- [ ] **Step 3: AuthContext.jsx에 AuthContext export 추가**

기존 `AuthContext.jsx`의 `const AuthContext = createContext(null)` 줄을 아래처럼 수정 (export 추가):

```js
// 변경 전
const AuthContext = createContext(null)

// 변경 후
export const AuthContext = createContext(null)
```

- [ ] **Step 4: ProtectedRoute.jsx 구현**

```jsx
// src/components/ProtectedRoute.jsx
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// allowedRoles: 접근 허용할 역할 배열 (예: ['admin', 'teacher'])
// children: 접근 허용 시 렌더링할 컴포넌트
function ProtectedRoute({ allowedRoles, children }) {
  const { user } = useAuth()

  // 로그인 안 된 경우 → 로그인 페이지로
  if (!user) {
    return <Navigate to="/login" replace />
  }

  // 역할 권한 없는 경우 → 대시보드로
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}

export default ProtectedRoute
```

- [ ] **Step 5: 테스트 실행 — 통과 확인**

```bash
npx vitest run src/components/ProtectedRoute.test.jsx
```

Expected: PASS — 3개 테스트 모두 통과

- [ ] **Step 6: 커밋**

```bash
git add src/components/ProtectedRoute.jsx src/components/ProtectedRoute.test.jsx src/context/AuthContext.jsx
git commit -m "feat: ProtectedRoute 역할 기반 접근 제한 구현"
```

---

## Task 5: App.jsx 라우팅 설정

**Files:**
- Modify: `src/App.jsx` (전체 재작성)
- Modify: `src/main.jsx`

- [ ] **Step 1: App.jsx 전체 재작성**

```jsx
// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Students from './pages/Students'
import Attendance from './pages/Attendance'
import Grades from './pages/Grades'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* 루트: 로그인 페이지로 이동 */}
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* 로그인 페이지 (누구나 접근 가능) */}
          <Route path="/login" element={<Login />} />

          {/* 대시보드 (전체 역할) */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRoles={['admin', 'teacher', 'student']}>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          {/* 학생 관리 (관리자, 교사만) */}
          <Route
            path="/students"
            element={
              <ProtectedRoute allowedRoles={['admin', 'teacher']}>
                <Students />
              </ProtectedRoute>
            }
          />

          {/* 출결 관리 (전체 역할, 내용은 역할별로 다름) */}
          <Route
            path="/attendance"
            element={
              <ProtectedRoute allowedRoles={['admin', 'teacher', 'student']}>
                <Attendance />
              </ProtectedRoute>
            }
          />

          {/* 성적 관리 (전체 역할, 내용은 역할별로 다름) */}
          <Route
            path="/grades"
            element={
              <ProtectedRoute allowedRoles={['admin', 'teacher', 'student']}>
                <Grades />
              </ProtectedRoute>
            }
          />

          {/* 없는 경로 → 로그인으로 */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
```

- [ ] **Step 2: main.jsx에서 App.css import 제거**

```jsx
// src/main.jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

- [ ] **Step 3: 임시 페이지 파일 생성 (빌드 오류 방지)**

각 페이지 파일을 빈 컴포넌트로 생성합니다:

```jsx
// src/pages/Login.jsx
export default function Login() { return <div>로그인</div> }
```

```jsx
// src/pages/Dashboard.jsx
export default function Dashboard() { return <div>대시보드</div> }
```

```jsx
// src/pages/Students.jsx
export default function Students() { return <div>학생관리</div> }
```

```jsx
// src/pages/Attendance.jsx
export default function Attendance() { return <div>출결관리</div> }
```

```jsx
// src/pages/Grades.jsx
export default function Grades() { return <div>성적관리</div> }
```

- [ ] **Step 4: 개발 서버에서 라우팅 동작 확인**

```bash
npm run dev
```

브라우저에서 확인:
- `http://localhost:5173/` → `/login`으로 리다이렉트
- `http://localhost:5173/login` → "로그인" 텍스트 표시
- `http://localhost:5173/dashboard` → `/login`으로 리다이렉트 (로그인 안 됨)

- [ ] **Step 5: 커밋**

```bash
git add src/App.jsx src/main.jsx src/pages/
git commit -m "feat: React Router 라우팅 및 임시 페이지 구조 설정"
```

---

## Task 6: Layout 컴포넌트 (Sidebar, Header, BottomNav, Layout)

**Files:**
- Create: `src/components/Sidebar.jsx`
- Create: `src/components/Header.jsx`
- Create: `src/components/BottomNav.jsx`
- Create: `src/components/Layout.jsx`

- [ ] **Step 1: Sidebar.jsx 생성 (PC 사이드바)**

```jsx
// src/components/Sidebar.jsx
import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// 역할별 메뉴 항목 정의
const navConfig = {
  admin: [
    { label: '대시보드', path: '/dashboard',  icon: '📊' },
    { label: '학생 관리', path: '/students',   icon: '👥' },
    { label: '반 관리',   path: '/students?tab=classes', icon: '🏫' },
    { label: '출결 관리', path: '/attendance', icon: '✅' },
    { label: '성적 관리', path: '/grades',     icon: '📝' },
  ],
  teacher: [
    { label: '대시보드', path: '/dashboard',  icon: '📊' },
    { label: '학생 관리', path: '/students',   icon: '👥' },
    { label: '반 관리',   path: '/students?tab=classes', icon: '🏫' },
    { label: '출결 관리', path: '/attendance', icon: '✅' },
    { label: '성적 관리', path: '/grades',     icon: '📝' },
  ],
  student: [], // 학생은 사이드바 없음 (BottomNav 사용)
}

// 비활성 메뉴 (2·3단계)
const disabledItems = ['🎬 영상 관리', '📋 테스트', '💬 Q&A', '📢 공지사항', '📄 진도리포트']

function Sidebar() {
  const { user, logout } = useAuth()
  const items = navConfig[user?.role] ?? []

  return (
    <aside className="hidden md:flex flex-col w-52 min-h-screen bg-[#2B2B2B] px-3 py-5">
      {/* 학원 로고 / 이름 */}
      <div className="px-2 mb-6">
        <div className="text-[#5B8FD4] font-extrabold text-base leading-tight">수문재</div>
        <div className="text-white/40 text-xs">국어전문학원</div>
      </div>

      {/* 메뉴 항목 */}
      <nav className="flex flex-col gap-1 flex-1">
        {items.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-[#5B8FD4]/30 text-white font-semibold'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`
            }
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}

        {/* 비활성 메뉴 */}
        <div className="mt-4 border-t border-white/10 pt-3">
          {disabledItems.map((label) => (
            <div
              key={label}
              className="flex items-center gap-2 px-3 py-2 text-sm text-white/25 cursor-not-allowed italic"
            >
              {label}
            </div>
          ))}
        </div>
      </nav>

      {/* 사용자 정보 + 로그아웃 */}
      <div className="border-t border-white/10 pt-3 mt-3">
        <div className="px-3 py-1 text-white/50 text-xs mb-2">{user?.name}</div>
        <button
          onClick={logout}
          className="w-full text-left px-3 py-2 text-sm text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
        >
          🚪 로그아웃
        </button>
      </div>
    </aside>
  )
}

export default Sidebar
```

- [ ] **Step 2: Header.jsx 생성 (상단 헤더)**

```jsx
// src/components/Header.jsx
import { useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// 경로별 페이지 제목 매핑
const pageTitles = {
  '/dashboard':  '대시보드',
  '/students':   '학생 관리',
  '/attendance': '출결 관리',
  '/grades':     '성적 관리',
}

function Header() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const title = pageTitles[location.pathname] ?? '수문재'

  return (
    <header className="flex items-center justify-between h-14 px-4 bg-white border-b border-gray-100">
      <h1 className="text-base font-bold text-[#2B2B2B]">{title}</h1>

      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-500">{user?.name}</span>
        {/* 모바일에서만 로그아웃 버튼 표시 (PC는 사이드바에 있음) */}
        <button
          onClick={logout}
          className="md:hidden text-xs text-gray-400 hover:text-gray-600"
        >
          로그아웃
        </button>
      </div>
    </header>
  )
}

export default Header
```

- [ ] **Step 3: BottomNav.jsx 생성 (모바일 학생 하단 탭 바)**

```jsx
// src/components/BottomNav.jsx
import { NavLink } from 'react-router-dom'

// 학생 전용 하단 탭
const tabs = [
  { label: '홈',  path: '/dashboard',  icon: '🏠' },
  { label: '출결', path: '/attendance', icon: '✅' },
  { label: '성적', path: '/grades',     icon: '📊' },
]

function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-[#2B2B2B] flex items-center justify-around z-50 md:hidden">
      {tabs.map((tab) => (
        <NavLink
          key={tab.path}
          to={tab.path}
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 px-4 py-1 ${
              isActive ? 'text-[#5B8FD4]' : 'text-white/50'
            }`
          }
        >
          <span className="text-xl">{tab.icon}</span>
          <span className="text-xs">{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}

export default BottomNav
```

- [ ] **Step 4: Layout.jsx 생성 (전체 레이아웃 래퍼)**

```jsx
// src/components/Layout.jsx
import { useAuth } from '../context/AuthContext'
import Sidebar from './Sidebar'
import Header from './Header'
import BottomNav from './BottomNav'

function Layout({ children }) {
  const { user } = useAuth()
  const isStudent = user?.role === 'student'

  return (
    <div className="flex min-h-screen bg-[#F4F3EE]">
      {/* 사이드바: 관리자, 교사에게만 표시 */}
      {!isStudent && <Sidebar />}

      {/* 메인 영역 */}
      <div className={`flex flex-col flex-1 ${isStudent ? 'max-w-sm mx-auto w-full' : ''}`}>
        <Header />
        <main className={`flex-1 p-4 overflow-auto ${isStudent ? 'pb-20' : ''}`}>
          {children}
        </main>
        {/* 하단 탭 바: 학생에게만 표시 */}
        {isStudent && <BottomNav />}
      </div>
    </div>
  )
}

export default Layout
```

- [ ] **Step 5: 커밋**

```bash
git add src/components/Sidebar.jsx src/components/Header.jsx src/components/BottomNav.jsx src/components/Layout.jsx
git commit -m "feat: Layout, Sidebar, Header, BottomNav 컴포넌트 구현"
```

---

## Task 7: 로그인 페이지

**Files:**
- Modify: `src/pages/Login.jsx` (전체 구현)

- [ ] **Step 1: Login.jsx 구현**

```jsx
// src/pages/Login.jsx
import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function Login() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  // 이미 로그인된 경우 대시보드로 이동
  if (user) return <Navigate to="/dashboard" replace />

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')
    const success = login(username.trim(), password)
    if (success) {
      navigate('/dashboard', { replace: true })
    } else {
      setError('아이디 또는 비밀번호가 올바르지 않습니다.')
    }
  }

  return (
    <div className="min-h-screen bg-[#F4F3EE] flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-md p-8">
        {/* 로고 영역 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-[#2B2B2B] rounded-2xl mb-3">
            <span className="text-[#5B8FD4] text-xl font-black">수</span>
          </div>
          <h1 className="text-lg font-extrabold text-[#2B2B2B]">수문재국어전문학원</h1>
          <p className="text-sm text-gray-400 mt-1">학생 관리 시스템</p>
        </div>

        {/* 로그인 폼 */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="text"
            placeholder="아이디"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full h-12 px-4 bg-[#F4F3EE] rounded-xl border border-transparent focus:border-[#5B8FD4] focus:outline-none text-sm"
            autoComplete="username"
          />
          <input
            type="password"
            placeholder="비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full h-12 px-4 bg-[#F4F3EE] rounded-xl border border-transparent focus:border-[#5B8FD4] focus:outline-none text-sm"
            autoComplete="current-password"
          />

          {/* 에러 메시지 */}
          {error && (
            <p className="text-sm text-[#C0392B] text-center">{error}</p>
          )}

          <button
            type="submit"
            className="w-full h-12 bg-[#2B2B2B] text-white text-sm font-semibold rounded-xl hover:bg-[#3d3d3d] active:scale-95 transition-all mt-1"
          >
            로그인
          </button>
        </form>

        {/* 테스트 계정 안내 */}
        <div className="mt-6 p-3 bg-[#F4F3EE] rounded-xl">
          <p className="text-xs text-gray-500 font-semibold mb-1">테스트 계정</p>
          <div className="text-xs text-gray-400 leading-relaxed">
            관리자: admin / 1234<br />
            교사: teacher1 / 1234<br />
            학생: student1 / 1234
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login
```

- [ ] **Step 2: 브라우저에서 동작 확인**

```bash
npm run dev
```

확인 항목:
1. `http://localhost:5173/login` — 로그인 화면 표시
2. `admin / 1234` 입력 후 로그인 → `/dashboard`로 이동 (임시 "대시보드" 텍스트 보임)
3. 잘못된 계정 입력 → 에러 메시지 표시
4. 로그인 후 새로고침 → 대시보드 유지 (localStorage 저장 확인)
5. `http://localhost:5173/` → `/login`으로 리다이렉트

- [ ] **Step 3: 커밋**

```bash
git add src/pages/Login.jsx
git commit -m "feat: 로그인 페이지 구현 (역할 자동 감지)"
```

---

## Task 8: 대시보드 페이지

**Files:**
- Modify: `src/pages/Dashboard.jsx` (전체 구현)

- [ ] **Step 1: Dashboard.jsx 구현**

```jsx
// src/pages/Dashboard.jsx
import Layout from '../components/Layout'
import { useAuth } from '../context/AuthContext'
import { classes } from '../data/classes'
import { students } from '../data/students'
import { attendance } from '../data/attendance'
import { grades } from '../data/grades'

// 오늘 날짜 문자열 (YYYY-MM-DD)
const today = new Date().toISOString().slice(0, 10)

// --- 관리자/교사 대시보드 ---
function AdminTeacherDashboard({ user }) {
  // 관리자는 전체 반, 교사는 담당 반만
  const myClasses = user.role === 'admin'
    ? classes
    : classes.filter((c) => c.teacherId === user.id)

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-gray-500">
        오늘 <span className="font-semibold text-[#2B2B2B]">{today}</span> 출결 현황
      </p>

      {myClasses.length === 0 && (
        <div className="bg-white rounded-xl p-6 text-center text-gray-400 text-sm">
          담당 반이 없습니다.
        </div>
      )}

      {myClasses.map((cls) => {
        // 해당 반 학생 목록
        const classStudents = students.filter((s) => s.classId === cls.id)
        const total = classStudents.length

        // 오늘 출결 집계
        const todayRecords = attendance.filter(
          (a) => a.date === today && classStudents.some((s) => s.id === a.studentId)
        )
        const present = todayRecords.filter((a) => a.status === 'present').length
        const absent  = todayRecords.filter((a) => a.status === 'absent').length
        const late    = todayRecords.filter((a) => a.status === 'late').length

        return (
          <div key={cls.id} className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-[#2B2B2B]">{cls.name}</h3>
                <p className="text-xs text-gray-400 mt-0.5">학생 {total}명</p>
              </div>
              <div className="flex gap-4">
                <div className="text-center">
                  <div className="text-xl font-bold text-[#27ae60]">{present}</div>
                  <div className="text-xs text-gray-400">출석</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-[#C0392B]">{absent}</div>
                  <div className="text-xs text-gray-400">결석</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-[#f39c12]">{late}</div>
                  <div className="text-xs text-gray-400">지각</div>
                </div>
              </div>
            </div>
            {/* 미기록 안내 */}
            {todayRecords.length === 0 && (
              <p className="mt-2 text-xs text-gray-400 italic">오늘 출결 미기록</p>
            )}
          </div>
        )
      })}
    </div>
  )
}

// --- 학생 대시보드 ---
function StudentDashboard({ user }) {
  // 이번 달 출결 집계
  // user.studentId: users.js → students.js 연결 키
  const thisMonth = today.slice(0, 7) // 'YYYY-MM'
  const myRecords = attendance.filter(
    (a) => a.studentId === user.studentId && a.date.startsWith(thisMonth)
  )
  const present = myRecords.filter((a) => a.status === 'present').length
  const absent  = myRecords.filter((a) => a.status === 'absent').length
  const late    = myRecords.filter((a) => a.status === 'late').length

  // 최근 성적 3개
  const myGrades = grades
    .filter((g) => g.studentId === user.studentId)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 3)

  return (
    <div className="flex flex-col gap-4">
      {/* 이번 달 출결 카드 */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <h3 className="font-bold text-[#2B2B2B] mb-3">이번 달 출결</h3>
        <div className="flex justify-around">
          <div className="text-center">
            <div className="text-2xl font-bold text-[#27ae60]">{present}</div>
            <div className="text-xs text-gray-400">출석</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-[#C0392B]">{absent}</div>
            <div className="text-xs text-gray-400">결석</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-[#f39c12]">{late}</div>
            <div className="text-xs text-gray-400">지각</div>
          </div>
        </div>
      </div>

      {/* 최근 성적 카드 */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <h3 className="font-bold text-[#2B2B2B] mb-3">최근 성적</h3>
        {myGrades.length === 0 ? (
          <p className="text-sm text-gray-400">성적 기록이 없습니다.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {myGrades.map((g) => (
              <div key={g.id} className="flex justify-between items-center">
                <div>
                  <span className="text-sm font-medium">{g.subject}</span>
                  <span className="text-xs text-gray-400 ml-2">{g.part}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-[#5B8FD4]">{g.score}점</span>
                  <span className="text-xs text-gray-400">{g.date}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// --- 메인 대시보드 컴포넌트 ---
function Dashboard() {
  const { user } = useAuth()

  return (
    <Layout>
      {user?.role === 'student'
        ? <StudentDashboard user={user} />
        : <AdminTeacherDashboard user={user} />
      }
    </Layout>
  )
}

export default Dashboard
```

- [ ] **Step 2: 브라우저에서 동작 확인**

관리자(`admin/1234`)로 로그인 후:
- 사이드바가 좌측에 표시됨
- 반별 출결 현황 카드가 표시됨

학생(`student1/1234`)으로 로그인 후:
- 하단 탭 바가 표시됨
- 이번 달 출결 + 최근 성적 카드가 표시됨

- [ ] **Step 3: 커밋**

```bash
git add src/pages/Dashboard.jsx
git commit -m "feat: 대시보드 페이지 구현 (역할별 반별 출결/학생 성적 요약)"
```

---

## Task 9: 학생 관리 페이지

**Files:**
- Modify: `src/pages/Students.jsx` (전체 구현)

- [ ] **Step 1: Students.jsx 구현**

```jsx
// src/pages/Students.jsx
import { useState, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import * as XLSX from 'xlsx'
import Layout from '../components/Layout'
import { useAuth } from '../context/AuthContext'
import { students as initialStudents } from '../data/students'
import { classes } from '../data/classes'

function Students() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [studentList, setStudentList] = useState(initialStudents)
  const [showForm, setShowForm] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [form, setForm] = useState({ name: '', phone: '', classId: '', parentPhone: '', joinDate: '' })
  const fileInputRef = useRef(null)

  // URL 파라미터로 현재 탭 결정 (tab=classes → 반 관리, 기본 → 학생 목록)
  const activeTab = searchParams.get('tab') === 'classes' ? 'classes' : 'students'

  // 반별 필터 (선택된 반 ID, null이면 전체)
  const [selectedClass, setSelectedClass] = useState(null)

  const isAdmin = user?.role === 'admin'

  // 표시할 학생 목록
  const displayStudents = selectedClass
    ? studentList.filter((s) => s.classId === selectedClass)
    : studentList

  // 반 이름 조회 헬퍼
  const getClassName = (classId) =>
    classes.find((c) => c.id === classId)?.name ?? '미배정'

  // 폼 제출 (추가/수정)
  const handleFormSubmit = (e) => {
    e.preventDefault()
    if (editTarget) {
      setStudentList((prev) =>
        prev.map((s) => s.id === editTarget.id ? { ...s, ...form, classId: Number(form.classId) } : s)
      )
    } else {
      const newId = Math.max(...studentList.map((s) => s.id), 0) + 1
      setStudentList((prev) => [...prev, { id: newId, ...form, classId: Number(form.classId) }])
    }
    setShowForm(false)
    setEditTarget(null)
    setForm({ name: '', phone: '', classId: '', parentPhone: '', joinDate: '' })
  }

  // 삭제 (관리자만)
  const handleDelete = (id) => {
    if (confirm('정말 삭제하시겠습니까?')) {
      setStudentList((prev) => prev.filter((s) => s.id !== id))
    }
  }

  // 수정 버튼
  const handleEdit = (student) => {
    setEditTarget(student)
    setForm({ ...student, classId: String(student.classId) })
    setShowForm(true)
  }

  // 엑셀 다운로드
  const handleExcelDownload = () => {
    const data = studentList.map((s) => ({
      이름: s.name,
      반: getClassName(s.classId),
      연락처: s.phone,
      학부모연락처: s.parentPhone,
      등록일: s.joinDate,
    }))
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '학생목록')
    XLSX.writeFile(wb, '수문재_학생목록.xlsx')
  }

  // 엑셀 업로드 (관리자만)
  const handleExcelUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (evt) => {
      const wb = XLSX.read(evt.target.result, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json(ws)
      const newStudents = rows.map((row, i) => ({
        id: Math.max(...studentList.map((s) => s.id), 0) + i + 1,
        name: row['이름'] ?? '',
        phone: row['연락처'] ?? '',
        classId: classes.find((c) => c.name === row['반'])?.id ?? null,
        parentPhone: row['학부모연락처'] ?? '',
        joinDate: row['등록일'] ?? '',
      }))
      setStudentList((prev) => [...prev, ...newStudents])
    }
    reader.readAsArrayBuffer(file)
    e.target.value = ''
  }

  return (
    <Layout>
      {/* 탭: 학생 목록 / 반 관리 */}
      <div className="flex gap-1 mb-4 bg-white rounded-xl p-1 shadow-sm w-fit">
        <button
          onClick={() => setSearchParams({})}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'students' ? 'bg-[#2B2B2B] text-white' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          학생 목록
        </button>
        <button
          onClick={() => setSearchParams({ tab: 'classes' })}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'classes' ? 'bg-[#2B2B2B] text-white' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          반 관리
        </button>
      </div>

      {/* === 학생 목록 탭 === */}
      {activeTab === 'students' && (
        <div className="flex flex-col gap-4">
          {/* 상단 액션 버튼 */}
          <div className="flex gap-2 flex-wrap">
            {isAdmin && (
              <button
                onClick={() => { setShowForm(true); setEditTarget(null); setForm({ name: '', phone: '', classId: '', parentPhone: '', joinDate: '' }) }}
                className="px-4 py-2 bg-[#2B2B2B] text-white text-sm rounded-lg hover:bg-[#3d3d3d]"
              >
                + 학생 추가
              </button>
            )}
            {isAdmin && (
              <>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-[#5B8FD4] text-white text-sm rounded-lg hover:bg-[#4a7ec3]"
                >
                  📥 엑셀 업로드
                </button>
                <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleExcelUpload} />
              </>
            )}
            <button
              onClick={handleExcelDownload}
              className="px-4 py-2 bg-white border border-gray-200 text-sm rounded-lg hover:bg-gray-50"
            >
              📤 엑셀 다운로드
            </button>
          </div>

          {/* 반 필터 */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setSelectedClass(null)}
              className={`px-3 py-1 rounded-full text-xs font-medium ${!selectedClass ? 'bg-[#2B2B2B] text-white' : 'bg-white text-gray-500 border border-gray-200'}`}
            >
              전체 ({studentList.length})
            </button>
            {classes.map((cls) => (
              <button
                key={cls.id}
                onClick={() => setSelectedClass(cls.id)}
                className={`px-3 py-1 rounded-full text-xs font-medium ${selectedClass === cls.id ? 'bg-[#5B8FD4] text-white' : 'bg-white text-gray-500 border border-gray-200'}`}
              >
                {cls.name} ({studentList.filter((s) => s.classId === cls.id).length})
              </button>
            ))}
          </div>

          {/* 학생 목록 테이블 */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-gray-500 text-xs">
                  <th className="text-left px-4 py-3 font-medium">이름</th>
                  <th className="text-left px-4 py-3 font-medium">반</th>
                  <th className="text-left px-4 py-3 font-medium hidden md:table-cell">연락처</th>
                  <th className="text-left px-4 py-3 font-medium hidden md:table-cell">등록일</th>
                  {isAdmin && <th className="px-4 py-3"></th>}
                </tr>
              </thead>
              <tbody>
                {displayStudents.map((student) => (
                  <tr key={student.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{student.name}</td>
                    <td className="px-4 py-3 text-gray-500">{getClassName(student.classId)}</td>
                    <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{student.phone}</td>
                    <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{student.joinDate}</td>
                    {isAdmin && (
                      <td className="px-4 py-3">
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => handleEdit(student)} className="text-xs text-[#5B8FD4] hover:underline">수정</button>
                          <button onClick={() => handleDelete(student.id)} className="text-xs text-[#C0392B] hover:underline">삭제</button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {displayStudents.length === 0 && (
              <div className="py-8 text-center text-gray-400 text-sm">학생이 없습니다.</div>
            )}
          </div>
        </div>
      )}

      {/* === 반 관리 탭 === */}
      {activeTab === 'classes' && (
        <div className="flex flex-col gap-3">
          {classes.map((cls) => {
            const count = studentList.filter((s) => s.classId === cls.id).length
            return (
              <div key={cls.id} className="bg-white rounded-xl p-4 shadow-sm flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-[#2B2B2B]">{cls.name}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">학생 {count}명</p>
                </div>
                <button
                  onClick={() => { setSelectedClass(cls.id); setSearchParams({}) }}
                  className="text-sm text-[#5B8FD4] hover:underline"
                >
                  학생 보기 →
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* 학생 추가/수정 모달 */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h2 className="font-bold text-[#2B2B2B] mb-4">{editTarget ? '학생 수정' : '학생 추가'}</h2>
            <form onSubmit={handleFormSubmit} className="flex flex-col gap-3">
              <input required placeholder="이름" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full h-11 px-3 bg-[#F4F3EE] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5B8FD4]" />
              <select required value={form.classId} onChange={(e) => setForm({ ...form, classId: e.target.value })} className="w-full h-11 px-3 bg-[#F4F3EE] rounded-lg text-sm focus:outline-none">
                <option value="">반 선택</option>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <input placeholder="연락처 (010-0000-0000)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full h-11 px-3 bg-[#F4F3EE] rounded-lg text-sm focus:outline-none" />
              <input placeholder="학부모 연락처" value={form.parentPhone} onChange={(e) => setForm({ ...form, parentPhone: e.target.value })} className="w-full h-11 px-3 bg-[#F4F3EE] rounded-lg text-sm focus:outline-none" />
              <input type="date" value={form.joinDate} onChange={(e) => setForm({ ...form, joinDate: e.target.value })} className="w-full h-11 px-3 bg-[#F4F3EE] rounded-lg text-sm focus:outline-none" />
              <div className="flex gap-2 mt-1">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 h-11 border border-gray-200 rounded-lg text-sm text-gray-500 hover:bg-gray-50">취소</button>
                <button type="submit" className="flex-1 h-11 bg-[#2B2B2B] text-white rounded-lg text-sm font-semibold hover:bg-[#3d3d3d]">저장</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  )
}

export default Students
```

- [ ] **Step 2: 브라우저에서 동작 확인**

관리자로 로그인 후 `/students`:
1. 학생 목록 테이블 표시 확인
2. 반 필터 버튼으로 필터링 확인
3. "+ 학생 추가" → 모달 열림 → 저장 → 목록에 추가됨
4. 수정/삭제 동작 확인
5. "반 관리" 탭 클릭 → 반 목록 표시 확인
6. 엑셀 다운로드 확인

- [ ] **Step 3: 커밋**

```bash
git add src/pages/Students.jsx
git commit -m "feat: 학생 관리 페이지 구현 (반 필터, 추가/수정/삭제, 엑셀)"
```

---

## Task 10: 출결 관리 페이지

**Files:**
- Modify: `src/pages/Attendance.jsx` (전체 구현)

- [ ] **Step 1: Attendance.jsx 구현**

```jsx
// src/pages/Attendance.jsx
import { useState } from 'react'
import Layout from '../components/Layout'
import { useAuth } from '../context/AuthContext'
import { students } from '../data/students'
import { classes } from '../data/classes'
import { attendance as initialAttendance } from '../data/attendance'

// 상태 표시 설정
const statusConfig = {
  present: { label: '출석', color: 'bg-green-100 text-green-700' },
  absent:  { label: '결석', color: 'bg-red-100 text-red-700' },
  late:    { label: '지각', color: 'bg-yellow-100 text-yellow-700' },
  none:    { label: '미기록', color: 'bg-gray-100 text-gray-400' },
}

// 상태 순환: 미기록 → 출석 → 결석 → 지각 → 미기록
const nextStatus = { none: 'present', present: 'absent', absent: 'late', late: 'none' }

// --- 관리자/교사 출결 관리 ---
function AdminTeacherAttendance({ user }) {
  const today = new Date().toISOString().slice(0, 10)
  const [selectedDate, setSelectedDate] = useState(today)
  const [selectedClass, setSelectedClass] = useState(classes[0]?.id ?? null)
  const [records, setRecords] = useState(initialAttendance)

  const myClasses = user.role === 'admin' ? classes : classes.filter((c) => c.teacherId === user.id)
  const classStudents = students.filter((s) => s.classId === selectedClass)

  // 특정 학생의 특정 날짜 출결 상태 조회
  const getStatus = (studentId) => {
    return records.find((r) => r.studentId === studentId && r.date === selectedDate)?.status ?? 'none'
  }

  // 출결 상태 토글
  const toggleStatus = (studentId) => {
    const current = getStatus(studentId)
    const next = nextStatus[current]
    setRecords((prev) => {
      const existing = prev.find((r) => r.studentId === studentId && r.date === selectedDate)
      if (next === 'none') {
        return prev.filter((r) => !(r.studentId === studentId && r.date === selectedDate))
      }
      if (existing) {
        return prev.map((r) =>
          r.studentId === studentId && r.date === selectedDate ? { ...r, status: next } : r
        )
      }
      const newId = Math.max(...prev.map((r) => r.id), 0) + 1
      return [...prev, { id: newId, studentId, date: selectedDate, status: next }]
    })
  }

  // 집계
  const presentCount = classStudents.filter((s) => getStatus(s.id) === 'present').length
  const absentCount  = classStudents.filter((s) => getStatus(s.id) === 'absent').length
  const lateCount    = classStudents.filter((s) => getStatus(s.id) === 'late').length

  return (
    <div className="flex flex-col gap-4">
      {/* 날짜 선택 */}
      <input
        type="date"
        value={selectedDate}
        onChange={(e) => setSelectedDate(e.target.value)}
        className="w-fit px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5B8FD4]"
      />

      {/* 반 선택 탭 */}
      <div className="flex gap-2 flex-wrap">
        {myClasses.map((cls) => (
          <button
            key={cls.id}
            onClick={() => setSelectedClass(cls.id)}
            className={`px-3 py-1 rounded-full text-xs font-medium ${selectedClass === cls.id ? 'bg-[#2B2B2B] text-white' : 'bg-white text-gray-500 border border-gray-200'}`}
          >
            {cls.name}
          </button>
        ))}
      </div>

      {/* 집계 */}
      <div className="flex gap-3">
        {[
          { label: '출석', count: presentCount, color: 'text-green-600' },
          { label: '결석', count: absentCount,  color: 'text-red-500' },
          { label: '지각', count: lateCount,    color: 'text-yellow-500' },
        ].map((item) => (
          <div key={item.label} className="bg-white rounded-xl px-4 py-3 shadow-sm text-center flex-1">
            <div className={`text-2xl font-bold ${item.color}`}>{item.count}</div>
            <div className="text-xs text-gray-400">{item.label}</div>
          </div>
        ))}
      </div>

      {/* 학생 목록 + 출결 토글 */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {classStudents.length === 0 ? (
          <div className="py-8 text-center text-gray-400 text-sm">해당 반에 학생이 없습니다.</div>
        ) : (
          classStudents.map((student) => {
            const status = getStatus(student.id)
            const cfg = statusConfig[status]
            return (
              <div key={student.id} className="flex items-center justify-between px-4 py-3 border-b border-gray-50 last:border-0">
                <span className="text-sm font-medium">{student.name}</span>
                <button
                  onClick={() => toggleStatus(student.id)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${cfg.color}`}
                >
                  {cfg.label}
                </button>
              </div>
            )
          })
        )}
      </div>
      <p className="text-xs text-gray-400">💡 상태를 클릭하면 출석 → 결석 → 지각 순으로 변경됩니다.</p>
    </div>
  )
}

// --- 학생 출결 조회 ---
function StudentAttendance({ user }) {
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7))
  const myRecords = initialAttendance.filter(
    (r) => r.studentId === user.studentId && r.date.startsWith(selectedMonth)
  )

  const present = myRecords.filter((r) => r.status === 'present').length
  const absent  = myRecords.filter((r) => r.status === 'absent').length
  const late    = myRecords.filter((r) => r.status === 'late').length

  return (
    <div className="flex flex-col gap-4">
      <input
        type="month"
        value={selectedMonth}
        onChange={(e) => setSelectedMonth(e.target.value)}
        className="w-fit px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
      />

      <div className="flex gap-3">
        {[
          { label: '출석', count: present, color: 'text-green-600' },
          { label: '결석', count: absent,  color: 'text-red-500' },
          { label: '지각', count: late,    color: 'text-yellow-500' },
        ].map((item) => (
          <div key={item.label} className="bg-white rounded-xl px-4 py-3 shadow-sm text-center flex-1">
            <div className={`text-2xl font-bold ${item.color}`}>{item.count}</div>
            <div className="text-xs text-gray-400">{item.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 text-xs font-semibold text-gray-500">
          {selectedMonth} 출결 기록
        </div>
        {myRecords.length === 0 ? (
          <div className="py-8 text-center text-gray-400 text-sm">기록이 없습니다.</div>
        ) : (
          myRecords
            .sort((a, b) => b.date.localeCompare(a.date))
            .map((record) => {
              const cfg = statusConfig[record.status]
              return (
                <div key={record.id} className="flex justify-between items-center px-4 py-3 border-b border-gray-50 last:border-0">
                  <span className="text-sm text-gray-600">{record.date}</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
                </div>
              )
            })
        )}
      </div>
    </div>
  )
}

function Attendance() {
  const { user } = useAuth()
  return (
    <Layout>
      {user?.role === 'student'
        ? <StudentAttendance user={user} />
        : <AdminTeacherAttendance user={user} />
      }
    </Layout>
  )
}

export default Attendance
```

- [ ] **Step 2: 브라우저에서 동작 확인**

관리자로 로그인 후 `/attendance`:
1. 날짜 선택 → 반 선택 → 학생 목록 표시
2. 출결 상태 클릭 → 출석/결석/지각/미기록 순환 확인
3. 집계 숫자 실시간 업데이트 확인

학생으로 로그인 후 `/attendance`:
1. 월 선택 → 본인 출결 기록 표시 확인

- [ ] **Step 3: 커밋**

```bash
git add src/pages/Attendance.jsx
git commit -m "feat: 출결 관리 페이지 구현 (관리자/교사 토글, 학생 조회)"
```

---

## Task 11: 성적 관리 페이지

**Files:**
- Modify: `src/pages/Grades.jsx` (전체 구현)

- [ ] **Step 1: Grades.jsx 구현**

```jsx
// src/pages/Grades.jsx
import { useState } from 'react'
import Layout from '../components/Layout'
import { useAuth } from '../context/AuthContext'
import { students } from '../data/students'
import { classes } from '../data/classes'
import { grades as initialGrades } from '../data/grades'

function Grades() {
  const { user } = useAuth()
  const [gradeList, setGradeList] = useState(initialGrades)
  const [activeType, setActiveType] = useState('weekly') // 'weekly' | 'exam'
  const [selectedClass, setSelectedClass] = useState(classes[0]?.id ?? null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ studentId: '', subject: '', part: '', score: '', total: '100', date: new Date().toISOString().slice(0, 10) })

  const isStudent = user?.role === 'student'
  const isAdmin = user?.role === 'admin'

  // 관리자/교사 뷰: 선택한 반 학생들의 성적
  const classStudents = students.filter((s) => s.classId === selectedClass)
  const displayGrades = gradeList.filter((g) => g.type === activeType)

  // 특정 학생의 최근 성적 조회
  const getStudentGrade = (studentId) =>
    displayGrades
      .filter((g) => g.studentId === studentId)
      .sort((a, b) => b.date.localeCompare(a.date))[0]

  // 성적 추가
  const handleAdd = (e) => {
    e.preventDefault()
    const newId = Math.max(...gradeList.map((g) => g.id), 0) + 1
    setGradeList((prev) => [
      ...prev,
      { id: newId, type: activeType, ...form, studentId: Number(form.studentId), score: Number(form.score), total: Number(form.total) },
    ])
    setShowForm(false)
    setForm({ studentId: '', subject: '', part: '', score: '', total: '100', date: new Date().toISOString().slice(0, 10) })
  }

  // 학생 본인 뷰
  if (isStudent) {
    const myGrades = gradeList
      .filter((g) => g.studentId === user.studentId && g.type === activeType)
      .sort((a, b) => b.date.localeCompare(a.date))

    return (
      <Layout>
        {/* 탭 */}
        <div className="flex gap-1 mb-4 bg-white rounded-xl p-1 shadow-sm w-fit">
          {[{ key: 'weekly', label: '주간 테스트' }, { key: 'exam', label: '내신 시험' }].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveType(tab.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${activeType === tab.key ? 'bg-[#2B2B2B] text-white' : 'text-gray-500'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {myGrades.length === 0 ? (
            <div className="py-8 text-center text-gray-400 text-sm">성적 기록이 없습니다.</div>
          ) : (
            myGrades.map((g) => (
              <div key={g.id} className="flex justify-between items-center px-4 py-3 border-b border-gray-50 last:border-0">
                <div>
                  <span className="text-sm font-medium">{g.subject}</span>
                  <span className="text-xs text-gray-400 ml-2">{g.part}</span>
                  <div className="text-xs text-gray-400 mt-0.5">{g.date}</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-[#5B8FD4]">{g.score}점</div>
                  <div className="text-xs text-gray-400">/ {g.total}점</div>
                </div>
              </div>
            ))
          )}
        </div>
      </Layout>
    )
  }

  // 관리자/교사 뷰
  return (
    <Layout>
      {/* 탭 */}
      <div className="flex gap-1 mb-4 bg-white rounded-xl p-1 shadow-sm w-fit">
        {[{ key: 'weekly', label: '주간 테스트' }, { key: 'exam', label: '내신 시험' }].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveType(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${activeType === tab.key ? 'bg-[#2B2B2B] text-white' : 'text-gray-500'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-4">
        {/* 상단 액션 */}
        <div className="flex gap-2 items-center flex-wrap">
          <div className="flex gap-2 flex-wrap">
            {classes.map((cls) => (
              <button
                key={cls.id}
                onClick={() => setSelectedClass(cls.id)}
                className={`px-3 py-1 rounded-full text-xs font-medium ${selectedClass === cls.id ? 'bg-[#2B2B2B] text-white' : 'bg-white text-gray-500 border border-gray-200'}`}
              >
                {cls.name}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="ml-auto px-4 py-2 bg-[#5B8FD4] text-white text-sm rounded-lg hover:bg-[#4a7ec3]"
          >
            + 성적 입력
          </button>
        </div>

        {/* 성적 테이블 */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-gray-500 text-xs">
                <th className="text-left px-4 py-3 font-medium">학생</th>
                <th className="text-left px-4 py-3 font-medium">과목</th>
                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">파트</th>
                <th className="text-left px-4 py-3 font-medium">점수</th>
                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">날짜</th>
              </tr>
            </thead>
            <tbody>
              {classStudents.map((student) => {
                const g = getStudentGrade(student.id)
                return (
                  <tr key={student.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-4 py-3 font-medium">{student.name}</td>
                    <td className="px-4 py-3 text-gray-500">{g?.subject ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-400 hidden md:table-cell text-xs">{g?.part ?? '—'}</td>
                    <td className="px-4 py-3">
                      {g ? (
                        <span className={`font-bold ${g.score >= 80 ? 'text-green-600' : g.score >= 60 ? 'text-yellow-500' : 'text-red-500'}`}>
                          {g.score}점
                        </span>
                      ) : <span className="text-gray-300">미입력</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-400 hidden md:table-cell text-xs">{g?.date ?? '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {classStudents.length === 0 && (
            <div className="py-8 text-center text-gray-400 text-sm">해당 반에 학생이 없습니다.</div>
          )}
        </div>
      </div>

      {/* 성적 입력 모달 */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h2 className="font-bold text-[#2B2B2B] mb-4">성적 입력</h2>
            <form onSubmit={handleAdd} className="flex flex-col gap-3">
              <select required value={form.studentId} onChange={(e) => setForm({ ...form, studentId: e.target.value })} className="w-full h-11 px-3 bg-[#F4F3EE] rounded-lg text-sm focus:outline-none">
                <option value="">학생 선택</option>
                {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <input required placeholder="과목 (예: 독서)" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="w-full h-11 px-3 bg-[#F4F3EE] rounded-lg text-sm focus:outline-none" />
              <input placeholder="파트 (예: 현대문학)" value={form.part} onChange={(e) => setForm({ ...form, part: e.target.value })} className="w-full h-11 px-3 bg-[#F4F3EE] rounded-lg text-sm focus:outline-none" />
              <div className="flex gap-2">
                <input required type="number" placeholder="점수" min="0" max="100" value={form.score} onChange={(e) => setForm({ ...form, score: e.target.value })} className="flex-1 h-11 px-3 bg-[#F4F3EE] rounded-lg text-sm focus:outline-none" />
                <input required type="number" placeholder="만점" value={form.total} onChange={(e) => setForm({ ...form, total: e.target.value })} className="w-20 h-11 px-3 bg-[#F4F3EE] rounded-lg text-sm focus:outline-none" />
              </div>
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="w-full h-11 px-3 bg-[#F4F3EE] rounded-lg text-sm focus:outline-none" />
              <div className="flex gap-2 mt-1">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 h-11 border border-gray-200 rounded-lg text-sm text-gray-500">취소</button>
                <button type="submit" className="flex-1 h-11 bg-[#2B2B2B] text-white rounded-lg text-sm font-semibold">저장</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  )
}

export default Grades
```

- [ ] **Step 2: 브라우저에서 동작 확인**

관리자로 로그인 후 `/grades`:
1. 주간 테스트 / 내신 시험 탭 전환 확인
2. 반 필터 확인
3. "+ 성적 입력" → 모달 → 저장 → 목록 반영 확인
4. 점수 색상 (80점 이상 초록, 60점 이상 노랑, 미만 빨강) 확인

학생으로 로그인 후 `/grades`:
1. 본인 성적만 표시 확인

- [ ] **Step 3: 전체 테스트 실행**

```bash
npx vitest run
```

Expected: PASS — AuthContext 6개 + ProtectedRoute 3개 = 9개 테스트 통과

- [ ] **Step 4: 최종 커밋**

```bash
git add src/pages/Grades.jsx
git commit -m "feat: 성적 관리 페이지 구현 (주간테스트/내신, 역할별 뷰)"
```

---

## Task 12: App.css 정리 & 빌드 검증

**Files:**
- Modify: `src/App.css` (불필요한 보일러플레이트 제거)

- [ ] **Step 1: App.css를 빈 파일로 교체**

```css
/* src/App.css */
/* Tailwind CSS로 스타일링합니다. 이 파일은 비워둡니다. */
```

- [ ] **Step 2: App.jsx에서 App.css import 제거**

`src/App.jsx` 상단에 `import './App.css'` 가 있으면 삭제합니다. (Task 5에서 이미 제거했으므로 확인만)

- [ ] **Step 3: 프로덕션 빌드 확인**

```bash
npm run build
```

Expected: `dist/` 폴더 생성, 오류 없음

- [ ] **Step 4: 빌드 결과물 미리보기**

```bash
npm run preview
```

브라우저에서 `http://localhost:4173` 접속 → 정상 동작 확인

- [ ] **Step 5: 최종 전체 테스트**

```bash
npx vitest run
```

Expected: 전체 PASS

- [ ] **Step 6: 최종 커밋**

```bash
git add src/App.css
git commit -m "chore: App.css 보일러플레이트 정리, 빌드 검증 완료"
```

---

## 완료 기준 체크리스트

- [ ] `npm run dev` — 오류 없이 실행
- [ ] `npm run build` — 오류 없이 빌드
- [ ] `npx vitest run` — 9개 테스트 PASS
- [ ] admin/1234 로그인 → 사이드바 + 반별 출결 대시보드
- [ ] teacher1/1234 로그인 → 사이드바 + 담당 반 대시보드
- [ ] student1/1234 로그인 → 하단 탭 바 + 학생 대시보드
- [ ] /students — 학생 목록, 반 필터, 추가/수정/삭제, 엑셀 다운로드
- [ ] /attendance — 날짜+반 선택, 출결 토글, 집계
- [ ] /grades — 주간테스트/내신 탭, 반 선택, 성적 입력
- [ ] 비로그인 상태에서 /dashboard 접근 → /login 리다이렉트
- [ ] 학생이 /students 접근 → /dashboard 리다이렉트
