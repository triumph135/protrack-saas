'use client'

import { useState, useEffect } from 'react'
import { supabase, dbService } from '@/lib/supabase'
import { User, Session } from '@supabase/supabase-js'

interface UserProfile {
  id: string
  name: string
  email: string
  role: string
  permissions: {
    material: 'read' | 'write' | 'none'
    labor: 'read' | 'write' | 'none'
    equipment: 'read' | 'write' | 'none'
    subcontractor: 'read' | 'write' | 'none'
    others: 'read' | 'write' | 'none'
    capLeases: 'read' | 'write' | 'none'
    consumable: 'read' | 'write' | 'none'
    invoices: 'read' | 'write' | 'none'
    projects: 'read' | 'write' | 'none'
    users: 'read' | 'write' | 'none'
  }
  tenant_id?: string | null
}

interface AuthResponse {
  data: { user: User | null } | null
  error: Error | null
  stayOnSignUp?: boolean
}

export function useAuth() {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session?.user) {
        loadUserProfile(session.user.id)
      } else {
        setLoading(false)
      }
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session)
      
      if (session?.user) {
        loadUserProfile(session.user.id)
      } else {
        setUser(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function loadUserProfile(userId: string) {
    try {
      const userProfile = await dbService.users.getCurrentUser()
      setUser(userProfile)
    } catch (error: any) {
      console.error('Error loading user profile:', error)
      // If user doesn't exist in our users table, create a basic profile
      if (error.code === 'PGRST116') {
        await createUserProfile(userId)
      }
    } finally {
      setLoading(false)
    }
  }

  async function createUserProfile(userId: string) {
    try {
      const { data: authUser } = await supabase.auth.getUser()
      if (authUser.user) {
        const { data, error } = await supabase
          .from('users')
          .insert([{
            id: authUser.user.id,
            name: authUser.user.email?.split('@')[0] || '',
            email: authUser.user.email || '',
            role: 'entry',
            permissions: {
              material: 'read',
              labor: 'read',
              equipment: 'read',
              subcontractor: 'read',
              others: 'read',
              capLeases: 'read',
              consumable: 'read',
              invoices: 'read',
              projects: 'read',
              users: 'none'
            }
          }])
          .select()
          .single()
        
        if (error && !(error.code === '23505' || (error.message && error.message.toLowerCase().includes('duplicate key')))) {
          throw error
        }
        
        if (data) {
          setUser({
            id: data.id,
            name: data.name,
            email: data.email,
            role: data.role,
            permissions: data.permissions
          })
        }
      }
    } catch (error: any) {
      if (!(error.code === '23505' || (error.message && error.message.toLowerCase().includes('duplicate key')))) {
        console.error('Error creating user profile:', error)
      }
    }
  }

  async function updateUserTenantId(userId: string, tenantId: string) {
    try {
      const { data, error } = await supabase
        .from('users')
        .update({ 
          tenant_id: tenantId, 
          role: 'master', 
          permissions: {
            material: 'write',
            labor: 'write',
            equipment: 'write',
            subcontractor: 'write',
            others: 'write',
            capLeases: 'write',
            consumable: 'write',
            invoices: 'write',
            projects: 'write',
            users: 'write'
          } 
        })
        .eq('id', userId)
        .select()
        .single()
      
      if (error) throw error
      if (data) setUser(data)
      return data
    } catch (error) {
      console.error('Error updating user tenant_id:', error)
      throw error
    }
  }

  async function signIn(email: string, password: string): Promise<AuthResponse> {
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      if (error) throw error
      return { data, error: null }
    } catch (error: any) {
      return { data: null, error }
    } finally {
      setLoading(false)
    }
  }

  async function signUp(email: string, password: string, userData: Partial<UserProfile> = {}): Promise<AuthResponse> {
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      })
      
      if (error) {
        if (error.message?.toLowerCase().includes('already registered')) {
          return { 
            data: null, 
            error: { message: 'An account with this email already exists. Please log in.' } as Error, 
            stayOnSignUp: true 
          }
        }
        return { data: null, error, stayOnSignUp: true }
      }

      if (data.user && !error) {
        try {
          await dbService.users.create({
            id: data.user.id,
            name: userData.name || email.split('@')[0],
            email: email,
            role: userData.role || 'entry',
            permissions: userData.permissions || {
              material: 'read',
              labor: 'read',
              equipment: 'read',
              subcontractor: 'read',
              others: 'read',
              capLeases: 'read',
              consumable: 'read',
              invoices: 'read',
              projects: 'read',
              users: 'none'
            }
          })
        } catch (profileError: any) {
          if (!(profileError.code === '23505' || (profileError.message && profileError.message.toLowerCase().includes('duplicate key')))) {
            throw profileError
          }
        }
      }
      
      return { data, error: null, stayOnSignUp: false }
    } catch (error: any) {
      return { data: null, error, stayOnSignUp: true }
    } finally {
      setLoading(false)
    }
  }

  async function signOut() {
    setLoading(true)
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      localStorage.clear()
      window.location.href = '/'
    } catch (error) {
      console.error('Error signing out:', error)
    } finally {
      setLoading(false)
    }
  }

  async function resetPassword(email: string): Promise<AuthResponse> {
    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email)
      if (error) throw error
      return { data: { user: null }, error: null }
    } catch (error: any) {
      return { data: { user: null }, error }
    }
  }

  return {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updateUserTenantId
  }
} 