// hooks/useAuth.js
import { useState, useEffect } from 'react'
import { supabase, dbService } from '../lib/supabase'

export function useAuth() {
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
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

  async function loadUserProfile(userId) {
    try {
      const userProfile = await dbService.users.getCurrentUser()
      setUser(userProfile)
    } catch (error) {
      console.error('Error loading user profile:', error)
      // If user doesn't exist in our users table, create a basic profile
      if (error.code === 'PGRST116') {
        await createUserProfile(userId)
      }
    } finally {
      setLoading(false)
    }
  }

async function createUserProfile(userId) {
  try {
    const { data: authUser } = await supabase.auth.getUser()
    if (authUser.user) {
      // Insert using the auth user's UUID as the primary key
      const { data, error } = await supabase
        .from('users')
        .insert([{
          id: authUser.user.id, // Use auth user ID as primary key
          name: authUser.user.email.split('@')[0],
          email: authUser.user.email,
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
      
      if (error) throw error
      
      const formattedUser = {
        id: data.id,
        name: data.name,
        email: data.email,
        role: data.role,
        permissions: data.permissions
      }
      
      setUser(formattedUser)
    }
  } catch (error) {
    console.error('Error creating user profile:', error)
  }
}

  async function signIn(email, password) {
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    } finally {
      setLoading(false)
    }
  }

  async function signUp(email, password, userData = {}) {
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      })
      
      if (error) throw error
      
      // Create user profile if signup successful
      if (data.user && !error) {
        await dbService.users.create({
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
      }
      
      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    } finally {
      setLoading(false)
    }
  }

  async function signOut() {
    setLoading(true)
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    } catch (error) {
      console.error('Error signing out:', error)
    } finally {
      setLoading(false)
    }
  }

  async function resetPassword(email) {
    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email)
      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }

  return {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword
  }
}