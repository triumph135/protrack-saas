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
      if (error && !(error.code === '23505' || (error.message && error.message.toLowerCase().includes('duplicate key')))) throw error
      if (data) {
        const formattedUser = {
          id: data.id,
          name: data.name,
          email: data.email,
          role: data.role,
          permissions: data.permissions
        }
        setUser(formattedUser)
      }
    }
  } catch (error) {
    if (!(error.code === '23505' || (error.message && error.message.toLowerCase().includes('duplicate key')))) {
      console.error('Error creating user profile:', error)
    }
  }
}

// New: Update user's tenant_id after tenant creation
async function updateUserTenantId(userId, tenantId) {
  try {
    const { data, error } = await supabase
      .from('users')
      .update({ tenant_id: tenantId, role: 'master', permissions: {
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
      } })
      .eq('id', userId)
      .select()
      .single();
    if (error) throw error;
    setUser(data);
    return data;
  } catch (error) {
    console.error('Error updating user tenant_id:', error);
    throw error;
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
      if (error) {
        // Supabase error code for duplicate email is '23505' or message includes 'already registered'
        if (error.message && error.message.toLowerCase().includes('already registered')) {
          return { data: null, error: { message: 'An account with this email already exists. Please log in.' }, stayOnSignUp: true }
        }
        return { data: null, error, stayOnSignUp: true }
      }
      // Create user profile if signup successful (without tenant_id)
      if (data.user && !error) {
        try {
          await dbService.users.create({
            id: data.user.id, // Always pass Auth UUID
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
            },
            tenant_id: null
          })
        } catch (profileError) {
          // If duplicate key (23505), ignore
          if (!(profileError.code === '23505' || (profileError.message && profileError.message.toLowerCase().includes('duplicate key')))) {
            throw profileError;
          }
        }
      }
      return { data, error: null, stayOnSignUp: false }
    } catch (error) {
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
      // Clear all localStorage (or just relevant keys if you prefer)
      localStorage.clear();
      // Force reload to login page
      window.location.href = '/';
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
    resetPassword,
    updateUserTenantId
  }
}