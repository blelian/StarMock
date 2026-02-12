import React, { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import { AuthContext, type User } from './auth-store'

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(
    localStorage.getItem('token')
  )
  const [loading, setLoading] = useState(true)

  const logout = useCallback(() => {
    setUser(null)
    setToken(null)
    localStorage.removeItem('token')
  }, [])

  useEffect(() => {
    const fetchUser = async () => {
      const savedToken = localStorage.getItem('token')
      if (savedToken) {
        try {
          const response = await axios.get<User>(
            'http://localhost:3001/api/auth/me',
            {
              headers: { Authorization: `Bearer ${savedToken}` },
            }
          )
          setUser(response.data)
        } catch (error) {
          console.error('Failed to fetch user', error)
          logout()
        }
      }
      setLoading(false)
    }
    void fetchUser()
  }, [logout])

  const login = (userData: User, userToken: string) => {
    setUser(userData)
    setToken(userToken)
    localStorage.setItem('token', userToken)
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}
