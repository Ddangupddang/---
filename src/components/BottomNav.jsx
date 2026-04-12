// src/components/BottomNav.jsx
import { NavLink } from 'react-router-dom'

const tabs = [
  { label: '홈',    path: '/dashboard',  icon: '🏠' },
  { label: '출결',  path: '/attendance', icon: '✅' },
  { label: '성적',  path: '/grades',     icon: '📊' },
  { label: '영상',  path: '/videos',     icon: '🎬' },
  { label: '테스트', path: '/tests',    icon: '📋' },
  { label: 'Q&A',  path: '/qna',        icon: '💬' },
  { label: '공지',  path: '/notices',   icon: '📢' },
]

function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 h-14 bg-[#2B2B2B] flex items-center z-50">
      {tabs.map((tab) => (
        <NavLink
          key={tab.path}
          to={tab.path}
          style={{ flex: 1 }}
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 py-1 ${
              isActive ? 'text-[#5B8FD4]' : 'text-white/50'
            }`
          }
        >
          <span className="text-lg">{tab.icon}</span>
          <span className="text-[10px]">{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}

export default BottomNav
