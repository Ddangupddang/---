// src/components/Header.jsx
import { useLocation, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { KeyRound, Menu } from 'lucide-react'

const pageTitles = {
  '/dashboard':       '대시보드',
  '/students':        '학생 관리',
  '/attendance':      '출결 관리',
  '/grades':          '성적 관리',
  '/videos':          '영상 관리',
  '/tests':           '테스트',
  '/qna':             'Q&A',
  '/notices':         '공지사항',
  '/reports':         '진도 리포트',
  '/change-password': '비밀번호 변경',
}

function Header({ onMenuClick }) {
  const { user, logout } = useAuth()
  const location = useLocation()
  const isStudent = user?.role === 'student'
  const title = pageTitles[location.pathname] ?? '수문재'

  return (
    <header className="flex items-center justify-between h-14 px-4 bg-surface border-b border-line">
      <div className="flex items-center gap-3">
        {/* 관리자/교사 모바일: 햄버거 버튼 */}
        {!isStudent && onMenuClick && (
          <button
            onClick={onMenuClick}
            className="md:hidden text-ink hover:text-ink-soft"
          >
            <Menu size={22} strokeWidth={1.8} />
          </button>
        )}
        {/* 학생(모바일)은 화면이 좁아 헤더에 로고만 두고, 제목은 오른쪽에 작게 보여준다.
            교사·관리자 화면은 각 페이지가 PageTitle로 제목을 그리므로 헤더에서는 그리지 않는다
            — 둘 다 그리면 같은 제목이 위아래로 두 번 나온다. */}
        {isStudent && (
          <Link to="/dashboard">
            <img src="/logo.png" alt="수문재 로고" className="h-8 object-contain hover:opacity-80 transition-opacity" />
          </Link>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* 학생: 현재 페이지 타이틀을 오른쪽에 작게 표시 */}
        {isStudent && (
          <span className="text-sm text-ink-mute">{title}</span>
        )}
        <span className="text-sm text-ink-soft">{user?.name}</span>
        {/* 학생: 비밀번호 변경 아이콘 버튼 */}
        {isStudent && (
          <Link to="/change-password" className="text-ink-mute hover:text-ink-soft">
            <KeyRound size={16} strokeWidth={1.8} />
          </Link>
        )}
        {/* 학생은 항상 표시, 관리자/교사는 모바일에서만 표시 (PC는 사이드바에 로그아웃 있음) */}
        <button
          onClick={logout}
          className={`text-xs text-ink-mute hover:text-ink-soft ${!isStudent ? 'md:hidden' : ''}`}
        >
          로그아웃
        </button>
      </div>
    </header>
  )
}

export default Header
