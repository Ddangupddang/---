// src/components/Layout.jsx
import { useAuth } from '../context/AuthContext'
import Sidebar from './Sidebar'
import Header from './Header'
import BottomNav from './BottomNav'

function Layout({ children }) {
  const { user } = useAuth()
  const isStudent = user?.role === 'student'

  return (
    <div className="flex min-h-screen bg-[#F4F3EE]">
      {!isStudent && <Sidebar />}

      <div className={`flex flex-col flex-1 ${isStudent ? 'max-w-sm mx-auto w-full' : ''}`}>
        <Header />
        <main className={`flex-1 p-4 overflow-auto ${isStudent ? 'pb-20' : ''}`}>
          {children}
        </main>
        {isStudent && <BottomNav />}
      </div>
    </div>
  )
}

export default Layout
