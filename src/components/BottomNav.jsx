// src/components/BottomNav.jsx
import { NavLink } from 'react-router-dom'
import { Home, ClipboardCheck, BarChart2, Video, ClipboardList, PencilLine, MessageCircle, Bell } from 'lucide-react'

const tabs = [
  { label: '홈',    path: '/dashboard',  Icon: Home },
  { label: '출결',  path: '/attendance', Icon: ClipboardCheck },
  { label: '성적',  path: '/grades',     Icon: BarChart2 },
  { label: '영상',  path: '/videos',     Icon: Video },
  { label: '테스트', path: '/tests',     Icon: ClipboardList },
  { label: '과제',  path: '/homework',   Icon: PencilLine },
  { label: 'Q&A',  path: '/qna',        Icon: MessageCircle },
  { label: '공지',  path: '/notices',   Icon: Bell },
]

function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 h-14 bg-ink flex items-center z-50">
      {tabs.map(({ label, path, Icon }) => (
        <NavLink
          key={path}
          to={path}
          style={{ flex: 1 }}
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 py-1 transition-colors ${
              isActive ? 'text-white' : 'text-white/45 hover:text-white/70'
            }`
          }
        >
          <Icon size={18} strokeWidth={1.8} />
          <span className="text-[10px]">{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}

export default BottomNav
