// src/contexts/TenantContext.js
import React, { createContext, useContext, useState, useEffect } from 'react'
import { tenantDbService } from '../lib/tenantDbService'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

const TenantContext = createContext()

export const useTenant = () => {
  const context = useContext(TenantContext)
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider')
  }
  return context
}

export const TenantProvider = ({ children }) => {
  const [tenant, setTenant] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const { user, loading: authLoading } = useAuth()

  // Get subdomain from URL
  const getSubdomain = () => {
    const hostname = window.location.hostname
    // For development (localhost), do not default to 'main'
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      const urlParams = new URLSearchParams(window.location.search)
      return urlParams.get('tenant') // Only use ?tenant=... if present
    }
    const parts = hostname.split('.')
    if (parts.length >= 3) {
      return parts[0]
    }
    return undefined // No subdomain/tenant
  }

  // Initialize tenant on load
  useEffect(() => {
    const initializeTenant = async () => {
      try {
        setLoading(true)
        setError(null)

        // If no user, do not fetch tenant, just set tenant to null and stop loading
        if (!user) {
          setTenant(null);
          setLoading(false);
          return;
        }

        // If user is logged in, fetch their tenant
        if (user && user.id) {
          const { data: userProfile, error: userError } = await supabase
            .from('users')
            .select('tenant_id')
            .eq('id', user.id)
            .single();
          if (userError) throw userError;
          if (userProfile && userProfile.tenant_id) {
            const { data: tenantData, error: tenantError } = await supabase
              .from('tenants')
              .select('*')
              .eq('id', userProfile.tenant_id)
              .single();
            if (tenantError) throw tenantError;
            setTenant(tenantData);
            tenantDbService.setTenant(tenantData.id);

            // --- REDIRECT LOGIC ---
            const hostname = window.location.hostname;
            const currentSubdomain = getSubdomain();
            if (tenantData && tenantData.subdomain) {
              if (hostname === 'localhost' || hostname === '127.0.0.1') {
                // Dev: update ?tenant= param if needed
                const urlParams = new URLSearchParams(window.location.search);
                if (urlParams.get('tenant') !== tenantData.subdomain) {
                  urlParams.set('tenant', tenantData.subdomain);
                  window.location.search = urlParams.toString();
                  return;
                }
              } else {
                // Prod: redirect to correct subdomain if needed
                if (currentSubdomain !== tenantData.subdomain) {
                  const newUrl = `${window.location.protocol}//${tenantData.subdomain}.${window.location.hostname.split('.').slice(1).join('.')}${window.location.pathname}`;
                  window.location.href = newUrl;
                  return;
                }
              }
            }
            // --- END REDIRECT LOGIC ---

            setLoading(false);
            return;
          } else {
            setTenant(null);
            setLoading(false);
            return;
          }
        }

        // Fallback: no user, use subdomain or query param (should not happen now)
        setTenant(null);
        setLoading(false);
      } catch (err) {
        console.error('Failed to initialize tenant:', err)
        setError(err.message)
        setLoading(false);
      }
    }
    if (!authLoading) {
      initializeTenant();
    }
  }, [user, authLoading])

  // Switch tenant (useful for admin interfaces)
  const switchTenant = async (subdomain) => {
    try {
      setLoading(true)
      setError(null)
      
      const tenantData = await tenantDbService.tenants.getBySubdomain(subdomain)
      
      if (!tenantData) {
        throw new Error(`Tenant not found: ${subdomain}`)
      }
      
      setTenant(tenantData)
      tenantDbService.setTenant(tenantData.id)
      
      // Update URL if needed
      const newUrl = `${window.location.protocol}//${subdomain}.${window.location.hostname.split('.').slice(1).join('.')}${window.location.pathname}`
      window.history.pushState({}, '', newUrl)
      
    } catch (err) {
      console.error('Failed to switch tenant:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const value = {
    tenant,
    loading,
    error,
    switchTenant,
    subdomain: getSubdomain()
  }

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading tenant...</p>
        </div>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">⚠️ Tenant Error</div>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  )
}