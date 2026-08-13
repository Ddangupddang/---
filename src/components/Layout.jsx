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
        <main className={`flex-1 p-4 overflow-auto ${isStudent ? 'pb-20' : ''}`}>
          {children}
        </main>
        {isStudent && <BottomNav />}
      </div>
    </div>
  )
}

export default Layout
