// src/components/Sidebar.jsx
import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const navConfig = {
  admin: [
    { label: '대시보드',  path: '/dashboard',            icon: '📊' },
    { label: '학생 관리', path: '/students',              icon: '👥' },
    { label: '반 관리',   path: '/students?tab=classes',  icon: '🏫' },
    { label: '출결 관리', path: '/attendance',            icon: '✅' },
    { label: '성적 관리', path: '/grades',                icon: '📝' },
    { label: '영상 관리', path: '/videos',                icon: '🎬' },
    { label: '테스트',    path: '/tests',                 icon: '📋' },
    { label: 'Q&A',       path: '/qna',                   icon: '💬' },
    { label: '공지사항',  path: '/notices',               icon: '📢' },
    { label: '진도 리포트', path: '/reports',             icon: '📄' },
  ],
  teacher: [
    { label: '대시보드',  path: '/dashboard',            icon: '📊' },
    { label: '학생 관리', path: '/students',              icon: '👥' },
    { label: '반 관리',   path: '/students?tab=classes',  icon: '🏫' },
    { label: '출결 관리', path: '/attendance',            icon: '✅' },
    { label: '성적 관리', path: '/grades',                icon: '📝' },
    { label: '영상 관리', path: '/videos',                icon: '🎬' },
    { label: '테스트',    path: '/tests',                 icon: '📋' },
    { label: 'Q&A',       path: '/qna',                   icon: '💬' },
    { label: '공지사항',  path: '/notices',               icon: '📢' },
    { label: '진도 리포트', path: '/reports',             icon: '📄' },
  ],
  student: [],
}

function Sidebar() {
  const { user, logout } = useAuth()
  const items = navConfig[user?.role] ?? []

  return (
    <aside className="hidden md:flex flex-col w-56 min-h-screen bg-[#2B2B2B] px-3 py-5">
      {/* 로고 영역 */}
      <div className="px-2 mb-7">
        {/* 이미지 로고: public/logo.png 파일 추가 후 아래 주석 해제
        <img src="/logo.png" alt="수문재 로고" className="w-28 mb-2" />
        */}
        <div className="text-[#5B8FD4] font-extrabold text-2xl leading-tight tracking-tight">
          수문재
        </div>
        <div className="text-white/50 text-sm font-medium mt-0.5">국어전문학원</div>
      </div>

      <nav className="flex flex-col gap-1 flex-1">
        {items.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2 rounded-lg text-base transition-colors ${
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
      </nav>

      <div className="border-t border-white/10 pt-3 mt-3">
        <div className="px-3 py-1 text-white/50 text-sm mb-2">{user?.name}</div>
        <button
          onClick={logout}
          className="w-full text-left px-3 py-2 text-base text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
        >
          🚪 로그아웃
        </button>
      </div>
    </aside>
  )
}

export default Sidebar
