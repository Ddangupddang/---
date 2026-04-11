// src/components/BottomNav.jsx
import { NavLink } from 'react-router-dom'

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
