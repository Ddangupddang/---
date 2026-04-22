// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { DataProvider } from './context/DataContext'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Students from './pages/Students'
import Attendance from './pages/Attendance'
import Grades from './pages/Grades'
import Videos from './pages/Videos'
import Tests from './pages/Tests'
import QnA from './pages/QnA'
import Notices from './pages/Notices'
import Reports from './pages/Reports'
import ChangePassword from './pages/ChangePassword'
import Staff from './pages/Staff'

function App() {
  return (
    <AuthProvider>
      <DataProvider>
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

          {/* 출결 관리 (전체 역할) */}
          <Route
            path="/attendance"
            element={
              <ProtectedRoute allowedRoles={['admin', 'teacher', 'student']}>
                <Attendance />
              </ProtectedRoute>
            }
          />

          {/* 성적 관리 (전체 역할) */}
          <Route
            path="/grades"
            element={
              <ProtectedRoute allowedRoles={['admin', 'teacher', 'student']}>
                <Grades />
              </ProtectedRoute>
            }
          />

          {/* 영상 관리 (전체 역할) */}
          <Route
            path="/videos"
            element={
              <ProtectedRoute allowedRoles={['admin', 'teacher', 'student']}>
                <Videos />
              </ProtectedRoute>
            }
          />

          {/* 테스트 (전체 역할) */}
          <Route
            path="/tests"
            element={
              <ProtectedRoute allowedRoles={['admin', 'teacher', 'student']}>
                <Tests />
              </ProtectedRoute>
            }
          />

          {/* Q&A (전체 역할) */}
          <Route
            path="/qna"
            element={
              <ProtectedRoute allowedRoles={['admin', 'teacher', 'student']}>
                <QnA />
              </ProtectedRoute>
            }
          />

          {/* 공지사항 (전체 역할) */}
          <Route
            path="/notices"
            element={
              <ProtectedRoute allowedRoles={['admin', 'teacher', 'student']}>
                <Notices />
              </ProtectedRoute>
            }
          />

          {/* 진도 리포트 (관리자, 교사만) */}
          <Route
            path="/reports"
            element={
              <ProtectedRoute allowedRoles={['admin', 'teacher']}>
                <Reports />
              </ProtectedRoute>
            }
          />

          {/* 계정 관리 (관리자만) */}
          <Route
            path="/staff"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Staff />
              </ProtectedRoute>
            }
          />

          {/* 비밀번호 변경 (전체 역할) */}
          <Route
            path="/change-password"
            element={
              <ProtectedRoute allowedRoles={['admin', 'teacher', 'student']}>
                <ChangePassword />
              </ProtectedRoute>
            }
          />

          {/* 없는 경로 → 로그인으로 */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
      </DataProvider>
    </AuthProvider>
  )
}

export default App
