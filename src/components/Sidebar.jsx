// src/components/Sidebar.jsx
import { NavLink, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  Users, School, ClipboardCheck, BarChart2,
  Video, ClipboardList, MessageCircle, Bell, TrendingUp, LogOut,
} from 'lucide-react'

// 섹션 그룹핑된 네비게이션 설정 (대시보드는 로고 클릭으로 이동)
const navSections = [
  {
    label: '학생',
    items: [
      { label: '학생 관리', path: '/students',             Icon: Users },
      { label: '반 관리',   path: '/students?tab=classes', Icon: School },
      { label: '출결 관리', path: '/attendance',           Icon: ClipboardCheck },
      { label: '성적 관리', path: '/grades',               Icon: BarChart2 },
    ],
  },
  {
    label: '수업',
    items: [
      { label: '영상 관리', path: '/videos', Icon: Video },
      { label: '테스트',    path: '/tests',  Icon: ClipboardList },
    ],
  },
  {
    label: '소통',
    items: [
      { label: 'Q&A',       path: '/qna',     Icon: MessageCircle },
      { label: '공지사항',  path: '/notices', Icon: Bell },
      { label: '진도 리포트', path: '/reports', Icon: TrendingUp },
    ],
  },
]

function Sidebar() {
  const { user, logout } = useAuth()

  return (
    <aside className="hidden md:flex flex-col w-56 min-h-screen bg-[#2B2B2B] px-3 py-5">
      {/* 로고 영역 — 클릭 시 대시보드로 이동 */}
      <div className="mb-7">
        <Link to="/dashboard" className="block bg-white rounded-xl px-3 py-2.5 hover:opacity-90 transition-opacity">
          <img src="/logo.png" alt="수문재 로고" className="w-full object-contain" style={{ maxHeight: '48px' }} />
        </Link>
      </div>

      {/* 섹션 그룹 네비게이션 */}
      <nav className="flex flex-col gap-4 flex-1">
        {navSections.map((section) => (
          <div key={section.label}>
            <p className="px-3 mb-1 text-[10px] font-semibold tracking-widest text-white/30 uppercase">
              {section.label}
            </p>
            <div className="flex flex-col gap-0.5">
              {section.items.map(({ label, path, Icon }) => (
                <NavLink
                  key={path}
                  to={path}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                      isActive
                        ? 'bg-[#5B8FD4]/20 text-white font-semibold border-l-2 border-[#5B8FD4]'
                        : 'text-white/55 hover:text-white hover:bg-white/8'
                    }`
                  }
                >
                  <Icon size={15} strokeWidth={1.8} />
                  <span>{label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* 하단 사용자 정보 */}
      <div className="border-t border-white/10 pt-3 mt-3">
        <div className="px-3 py-1 text-white/40 text-xs mb-1">{user?.name}</div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-white/40 hover:text-white hover:bg-white/8 rounded-lg transition-colors"
        >
          <LogOut size={15} strokeWidth={1.8} />
          로그아웃
        </button>
      </div>
    </aside>
  )
}

export default Sidebar
