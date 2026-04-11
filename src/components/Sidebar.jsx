// src/components/Sidebar.jsx
import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

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
  student: [],
}

const disabledItems = ['🎬 영상 관리', '📋 테스트', '💬 Q&A', '📢 공지사항', '📄 진도리포트']

function Sidebar() {
  const { user, logout } = useAuth()
  const items = navConfig[user?.role] ?? []

  return (
    <aside className="hidden md:flex flex-col w-52 min-h-screen bg-[#2B2B2B] px-3 py-5">
      <div className="px-2 mb-6">
        <div className="text-[#5B8FD4] font-extrabold text-base leading-tight">수문재</div>
        <div className="text-white/40 text-xs">국어전문학원</div>
      </div>

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
