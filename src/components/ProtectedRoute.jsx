import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// allowedRoles: 접근 허용할 역할 배열 (예: ['admin', 'teacher'])
// children: 접근 허용 시 렌더링할 컴포넌트
function ProtectedRoute({ allowedRoles, children }) {
  const { user } = useAuth()
  const { pathname } = useLocation()

  // 로그인 안 된 경우 → 로그인 페이지로
  if (!user) {
    return <Navigate to="/login" replace />
  }

  // 첫 로그인(비밀번호 미변경) → 비밀번호 변경 페이지로 강제 이동
  if (user.passwordChanged === false && pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />
  }

  // 역할 권한 없는 경우 → 대시보드로
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}

export default ProtectedRoute
