// src/components/Header.jsx
import { useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const pageTitles = {
  '/dashboard':  '대시보드',
  '/students':   '학생 관리',
  '/attendance': '출결 관리',
  '/grades':     '성적 관리',
  '/videos':     '영상 관리',
  '/tests':      '테스트',
  '/qna':        'Q&A',
  '/notices':    '공지사항',
  '/reports':    '진도 리포트',
}

function Header() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const isStudent = user?.role === 'student'
  const title = pageTitles[location.pathname] ?? '수문재'

  return (
    <header className="flex items-center justify-between h-14 px-4 bg-white border-b border-gray-100">
      {/* 학생(모바일): 수문재 로고 표시 / 교사·관리자: 페이지 제목 */}
      {isStudent ? (
        <div className="flex items-center gap-2">
          {/* 이미지 로고: public/logo.png 파일 추가 후 아래 주석 해제
          <img src="/logo.png" alt="수문재 로고" className="h-7" />
          */}
          <div>
            <div className="text-[#5B8FD4] font-extrabold text-lg leading-tight tracking-tight">
              수문재
            </div>
            <div className="text-gray-400 text-[10px] leading-none -mt-0.5">국어전문학원</div>
          </div>
        </div>
      ) : (
        <h1 className="text-base font-bold text-[#2B2B2B]">{title}</h1>
      )}

      <div className="flex items-center gap-3">
        {/* 학생: 현재 페이지 타이틀을 오른쪽에 작게 표시 */}
        {isStudent && (
          <span className="text-sm text-gray-400">{title}</span>
        )}
        <span className="text-sm text-gray-500">{user?.name}</span>
        {/* 학생은 항상 표시, 관리자/교사는 모바일에서만 표시 (PC는 사이드바에 로그아웃 있음) */}
        <button
          onClick={logout}
          className={`text-xs text-gray-400 hover:text-gray-600 ${!isStudent ? 'md:hidden' : ''}`}
        >
          로그아웃
        </button>
      </div>
    </header>
  )
}

export default Header
