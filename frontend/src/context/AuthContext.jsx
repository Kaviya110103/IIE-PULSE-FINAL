import { createContext, useContext, useState, useEffect } from 'react'
import api, { getApiErrorMessage, logoutSession, resetInactivityTimer } from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    const bootstrap = async () => {
      const access = localStorage.getItem('access')
      const refresh = localStorage.getItem('refresh')
      let storedUser = null

      try {
        storedUser = JSON.parse(localStorage.getItem('user') || 'null')
      } catch {
        storedUser = null
      }

      if (storedUser?.user_type === 'public' && storedUser.username) {
        if (!cancelled) {
          setUser(storedUser)
          setLoading(false)
        }
        return
      }

      if (!storedUser || (!access && !refresh)) {
        localStorage.removeItem('user')
        if (!cancelled) {
          setUser(null)
          setLoading(false)
        }
        return
      }

      try {
        if (!access && refresh) {
          const { data } = await api.post('/auth/refresh/', { refresh })
          localStorage.setItem('access', data.access)
        } else if (!access) {
          throw new Error('Session expired')
        }

        const verifyPath =
          storedUser.user_type === 'admin'
            ? '/dashboard/admin/'
            : storedUser.user_type === 'student'
              ? '/dashboard/student/'
              : storedUser.designation === 'counselor'
                ? '/dashboard/counselor/'
                : '/dashboard/employee/'

        await api.get(verifyPath)

        resetInactivityTimer()
        if (!cancelled) setUser(storedUser)
      } catch {
        localStorage.clear()
        if (!cancelled) setUser(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    bootstrap()
    return () => { cancelled = true }
  }, [])

  const login = async (username, password, user_type) => {
    setLoading(true)
    try {
      const { data } = await api.post('/auth/login/', { username, password, user_type })
      localStorage.setItem('access', data.access)
      localStorage.setItem('refresh', data.refresh)
      const userData = { ...data }
      delete userData.access
      delete userData.refresh
      localStorage.setItem('user', JSON.stringify(userData))
      setUser(userData)
      resetInactivityTimer()
      return { success: true, data: userData }
    } catch (err) {
      if (user_type === 'student') {
        try {
          const { data } = await api.post('/public-users/login/', { username, password })
          const publicUser = { ...(data?.data || {}), user_type: 'public' }
          if (!publicUser.username) throw new Error('Invalid public-user session')
          localStorage.removeItem('access')
          localStorage.removeItem('refresh')
          localStorage.setItem('user', JSON.stringify(publicUser))
          setUser(publicUser)
          return { success: true, data: publicUser }
        } catch (publicError) {
          return { success: false, error: getApiErrorMessage(publicError, getApiErrorMessage(err, 'Login failed')) }
        }
      }
      return { success: false, error: getApiErrorMessage(err, 'Login failed') }
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    if (user?.user_type === 'public') {
      try {
        await api.post('/public-users/logout/', { username: user.username })
      } finally {
        localStorage.clear()
        setUser(null)
        window.location.replace('/login')
      }
      return
    }
    await logoutSession({ redirect: false })
    setUser(null)
    window.location.replace('/login')
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
