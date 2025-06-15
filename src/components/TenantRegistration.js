// src/components/TenantRegistration.js
import React, { useState } from 'react'
import { Building, User, Mail, Phone, CreditCard } from 'lucide-react'
import { tenantDbService } from '../lib/tenantDbService'
import Logo from './Logo';
import { useAuth } from '../hooks/useAuth';

const TenantRegistration = ({ onSuccess }) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const [tenantData, setTenantData] = useState({
    subdomain: '',
    name: '',
    email: '',
    phone: '',
    plan: 'professional'
  })

  const { user, updateUserTenantId } = useAuth();

  const validateSubdomain = (subdomain) => {
    // Check if subdomain is valid (alphanumeric, no spaces, 3-50 chars)
    const regex = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,48}[a-zA-Z0-9]$/
    return regex.test(subdomain)
  }

  const checkSubdomainAvailable = async (subdomain) => {
    try {
      await tenantDbService.tenants.getBySubdomain(subdomain)
      return false // If no error, subdomain exists
    } catch (error) {
      return true // If error, subdomain is available
    }
  }

  const handleOrgNameChange = (e) => {
    const orgName = e.target.value;
    // Generate subdomain: lowercase, replace spaces with hyphens, remove non-alphanum/hyphen
    const subdomain = orgName
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
    setTenantData({ ...tenantData, name: orgName, subdomain });
  };

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Validate subdomain format
      if (!validateSubdomain(tenantData.subdomain)) {
        throw new Error('Subdomain must be 3-50 characters, alphanumeric and hyphens only')
      }

      // Check if subdomain is available
      const available = await checkSubdomainAvailable(tenantData.subdomain)
      if (!available) {
        throw new Error('This subdomain is already taken')
      }

      // Create tenant
      const newTenant = await tenantDbService.tenants.create({
        ...tenantData,
        status: 'active'
      })

      // Set tenant context for user creation
      tenantDbService.setTenant(newTenant.id)

      // Update current user's tenant_id and set as master
      if (user) {
        await updateUserTenantId(user.id, newTenant.id);
      }

      // Redirect to tenant subdomain
      const hostname = window.location.hostname
      let newUrl
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        newUrl = `${window.location.protocol}//${hostname}:${window.location.port}?tenant=${tenantData.subdomain}`
      } else {
        newUrl = `${window.location.protocol}//${tenantData.subdomain}.${hostname}${window.location.pathname}`
      }

      if (onSuccess) {
        onSuccess(newTenant, user)
      } else {
        window.location.href = newUrl
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <Logo size="lg" className="mx-auto" />
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Set up your ProTrack workspace
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Create your organization's project tracking environment
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Organization Name
              </label>
              <input
                type="text"
                required
                value={tenantData.name}
                onChange={handleOrgNameChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Your Company Name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Workspace URL
              </label>
              <input
                type="text"
                value={tenantData.subdomain}
                disabled
                className="mt-1 block w-full px-3 py-2 border border-gray-200 bg-gray-100 text-gray-500 rounded-md cursor-not-allowed"
                placeholder="yourcompany"
              />
              <p className="text-xs text-gray-500 mt-1">This will be your workspace subdomain.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Email for Billing
              </label>
              <input
                type="email"
                required
                value={tenantData.email}
                onChange={(e) => setTenantData({...tenantData, email: e.target.value})}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="hello@yourcompany.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Phone Number (Optional)
              </label>
              <input
                type="tel"
                value={tenantData.phone}
                onChange={(e) => setTenantData({...tenantData, phone: e.target.value})}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="+1 (555) 123-4567"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Plan
              </label>
              <select
                value={tenantData.plan}
                onChange={(e) => setTenantData({...tenantData, plan: e.target.value})}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="starter">Starter - $29/month</option>
                <option value="professional">Professional - $79/month</option>
                <option value="enterprise">Enterprise - Contact Sales</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? 'Creating workspace...' : 'Create Workspace'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default TenantRegistration