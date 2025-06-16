'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { useAuthContext } from './AuthProvider'
import { supabase } from '@/lib/supabase'

// Define Tenant type locally
interface Tenant {
  id: string
  name: string
  subdomain: string
  status: string
  [key: string]: any
}

interface TenantContextType {
  tenant: Tenant | null
  loading: boolean
  error: Error | null
  refreshTenant: () => Promise<void>
}

const TenantContext = createContext<TenantContextType>({
  tenant: null,
  loading: true,
  error: null,
  refreshTenant: async () => {},
})

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuthContext()
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchTenant = async () => {
    if (!user?.tenant_id) {
      setTenant(null)
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', user.tenant_id)
        .single()

      if (error) throw error
      setTenant(data)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch tenant'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTenant()
  }, [user?.tenant_id])

  const refreshTenant = async () => {
    setLoading(true)
    await fetchTenant()
  }

  return (
    <TenantContext.Provider value={{ tenant, loading, error, refreshTenant }}>
      {children}
    </TenantContext.Provider>
  )
}

export function useTenantContext() {
  const context = useContext(TenantContext)
  if (context === undefined) {
    throw new Error('useTenantContext must be used within a TenantProvider')
  }
  return context
} 