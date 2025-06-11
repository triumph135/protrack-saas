// src/contexts/TenantContext.js
import React, { createContext, useContext, useState, useEffect } from 'react'
import { tenantDbService } from '../lib/tenantDbService'

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

  // Get subdomain from URL
  const getSubdomain = () => {
    const hostname = window.location.hostname
    
    // For development (localhost)
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      // You can use a query parameter or default tenant for development
      const urlParams = new URLSearchParams(window.location.search)
      return urlParams.get('tenant') || 'main'
    }
    
    // For production - extract subdomain
    const parts = hostname.split('.')
    if (parts.length >= 3) {
      return parts[0] // subdomain.domain.com -> subdomain
    }
    
    // Default fallback
    return 'main'
  }

  // Initialize tenant on load
  useEffect(() => {
    const initializeTenant = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const subdomain = getSubdomain()
        
        // Fetch tenant data
        const tenantData = await tenantDbService.tenants.getBySubdomain(subdomain)
        
        if (!tenantData) {
          throw new Error(`Tenant not found for subdomain: ${subdomain}`)
        }
        
        // Set tenant in context and database service
        setTenant(tenantData)
        tenantDbService.setTenant(tenantData.id)
        
      } catch (err) {
        console.error('Failed to initialize tenant:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    initializeTenant()
  }, [])

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