// src/hooks/useTenantAuth.js
import { useState, useEffect } from 'react'
import { tenantDbService } from '../lib/tenantDbService'
import { useTenant } from '../contexts/TenantContext'

export const useTenantAuth = () => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const { tenant } = useTenant()

  // Initialize authentication
  useEffect(() => {
    // Check for stored user session
    const storedUser = localStorage.getItem(`protrack_user_${tenant?.id}`)
    if (storedUser && tenant) {
      try {
        const userData = JSON.parse(storedUser)
        setUser(userData)
      } catch (error) {
        console.error('Error parsing stored user:', error)
        localStorage.removeItem(`protrack_user_${tenant?.id}`)
      }
    }
    setLoading(false)
  }, [tenant])

  const signIn = async (email, password) => {
    try {
      setLoading(true)
      
      if (!tenant) {
        throw new Error('No tenant context available')
      }

      // In a real app, you'd validate password against database
      // For now, we'll just check if user exists in this tenant
      const userData = await tenantDbService.users.getByEmail(email)
      
      if (!userData) {
        throw new Error('User not found in this organization')
      }

      // Store user session
      localStorage.setItem(`protrack_user_${tenant.id}`, JSON.stringify(userData))
      setUser(userData)
      
      return userData
    } catch (error) {
      console.error('Sign in error:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const signUp = async (userData) => {
    try {
      setLoading(true)
      
      if (!tenant) {
        throw new Error('No tenant context available')
      }

      // Create new user in current tenant
      const newUser = await tenantDbService.users.create(userData)
      
      // Store user session
      localStorage.setItem(`protrack_user_${tenant.id}`, JSON.stringify(newUser))
      setUser(newUser)
      
      return newUser
    } catch (error) {
      console.error('Sign up error:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const signOut = () => {
    if (tenant) {
      localStorage.removeItem(`protrack_user_${tenant.id}`)
    }
    setUser(null)
  }

  const updateUser = async (updates) => {
    try {
      if (!user || !tenant) return

      const updatedUser = await tenantDbService.users.update(user.id, updates)
      
      // Update stored session
      localStorage.setItem(`protrack_user_${tenant.id}`, JSON.stringify(updatedUser))
      setUser(updatedUser)
      
      return updatedUser
    } catch (error) {
      console.error('Update user error:', error)
      throw error
    }
  }

  return {
    user,
    loading,
    signIn,
    signUp,
    signOut,
    updateUser,
    tenant
  }
}