import { createContext, useContext, useState } from 'react'
import { users } from '../data/users'

export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('soomoonjae_user')
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })

  const login = (username, password) => {
    const found = users.find(
      (u) => u.username === username && u.password === password
    )
    if (found) {
      setUser(found)
      localStorage.setItem('soomoonjae_user', JSON.stringify(found))
      return true
    }
    return false
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('soomoonjae_user')
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
