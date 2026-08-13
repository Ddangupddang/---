// src/components/Sidebar.jsx
import { NavLink, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  Users, School, ClipboardCheck, BarChart2,
  Video, ClipboardList, PencilLine, MessageCircle, Bell, TrendingUp, LogOut, KeyRound, UserCog,
  CalendarRange,
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
      { label: '영상 관리', path: '/videos',   Icon: Video },
      { label: '테스트',    path: '/tests',    Icon: ClipboardList },
      { label: '과제',      path: '/homework', Icon: PencilLine },
    ],
  },
  {
    label: '소통',
    items: [
      { label: 'Q&A',       path: '/qna',     Icon: MessageCircle },
      { label: '공지사항',  path: '/notices', Icon: Bell },
      { label: '진도 리포트', path: '/reports', Icon: TrendingUp },
      { label: '주간 리포트', path: '/weekly-report', Icon: CalendarRange },
    ],
  },
]

// 관리자 전용 섹션
const adminSection = {
  label: '관리',
  items: [
    { label: '계정 관리', path: '/staff', Icon: UserCog },
  ],
}

function SidebarContent({ onClose }) {
  const { user, logout } = useAuth()

  return (
    <>
      {/* 로고 영역 — 클릭 시 대시보드로 이동 */}
      <div className="mb-7">
        <Link to="/dashboard" onClick={onClose} className="block px-1 py-1 hover:opacity-80 transition-opacity">
          <img src="/logo.png" alt="수문재 로고" className="w-full object-contain" style={{ maxHeight: '48px' }} />
        </Link>
      </div>

      {/* 섹션 그룹 네비게이션 */}
      <nav className="flex flex-col gap-4 flex-1">
        {navSections.map((section) => (
          <div key={section.label}>
            <p className="px-3 mb-1 text-[10px] font-semibold tracking-widest text-ink-faint uppercase">
              {section.label}
            </p>
            <div className="flex flex-col gap-0.5">
              {section.items.map(({ label, path, Icon }) => (
                <NavLink
                  key={path}
                  to={path}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 px-3 py-2.5 rounded text-[15px] transition-colors ${
                      isActive
                        ? 'bg-navy text-white font-bold'
                        : 'text-ink-soft hover:bg-line-soft'
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

        {/* 관리자 전용 섹션 */}
        {user?.role === 'admin' && (
          <div>
            <p className="px-3 mb-1 text-[10px] font-semibold tracking-widest text-ink-faint uppercase">
              {adminSection.label}
            </p>
            <div className="flex flex-col gap-0.5">
              {adminSection.items.map(({ label, path, Icon }) => (
                <NavLink
                  key={path}
                  to={path}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 px-3 py-2.5 rounded text-[15px] transition-colors ${
                      isActive
                        ? 'bg-navy text-white font-bold'
                        : 'text-ink-soft hover:bg-line-soft'
                    }`
                  }
                >
                  <Icon size={15} strokeWidth={1.8} />
                  <span>{label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* 하단 사용자 정보 */}
      <div className="border-t border-line pt-3 mt-3">
        <div className="px-3 py-1 text-ink-mute text-xs mb-1">{user?.name}</div>
        <NavLink
          to="/change-password"
          onClick={onClose}
          className={({ isActive }) =>
            `w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded transition-colors ${
              isActive ? 'text-ink bg-line-soft' : 'text-ink-mute hover:bg-line-soft'
            }`
          }
        >
          <KeyRound size={15} strokeWidth={1.8} />
          비밀번호 변경
        </NavLink>
        <button
          onClick={() => { logout(); onClose?.() }}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-ink-mute hover:bg-line-soft rounded transition-colors"
        >
          <LogOut size={15} strokeWidth={1.8} />
          로그아웃
        </button>
      </div>
    </>
  )
}

function Sidebar({ isOpen, onClose }) {
  return (
    <>
      {/* 데스크탑 사이드바 */}
      <aside className="hidden md:flex flex-col w-56 min-h-screen bg-surface-alt border-r border-line px-3 py-5">
        <SidebarContent onClose={() => {}} />
      </aside>

      {/* 모바일 오버레이 */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* 모바일 드로어 */}
      <aside className={`fixed top-0 left-0 h-full w-64 bg-surface-alt border-r border-line px-3 py-5 z-50 flex flex-col md:hidden
        transform transition-transform duration-300 ease-in-out overflow-y-auto
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <SidebarContent onClose={onClose} />
      </aside>
    </>
  )
}

export default Sidebar
