// src/components/Layout.jsx
import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import Sidebar from './Sidebar'
import Header from './Header'
import BottomNav from './BottomNav'

function Layout({ children }) {
  const { user } = useAuth()
  const isStudent = user?.role === 'student'
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-surface">
      {!isStudent && (
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      )}

      <div className={`flex flex-col flex-1 min-w-0 ${isStudent ? 'max-w-sm mx-auto w-full' : ''}`}>
        <Header onMenuClick={!isStudent ? () => setSidebarOpen(true) : undefined} />
        {/* 아래 여백을 넉넉히 둔다 — 쪽 번호나 마지막 버튼이 화면 밑에 붙으면
            폰에서 누르기 어렵다. 학생 화면은 아래 탭바가 더 가리므로 더 준다. */}
        <main className={`flex-1 p-4 overflow-auto ${isStudent ? 'pb-28' : 'pb-16'}`}>
          {children}
        </main>
        {isStudent && <BottomNav />}
      </div>
    </div>
  )
}

export default Layout
