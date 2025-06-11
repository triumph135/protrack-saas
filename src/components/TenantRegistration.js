// src/components/TenantRegistration.js
import React, { useState } from 'react'
import { Building, User, Mail, Phone, CreditCard } from 'lucide-react'
import { tenantDbService } from '../lib/tenantDbService'
import Logo from './Logo';

const TenantRegistration = ({ onSuccess }) => {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const [tenantData, setTenantData] = useState({
    subdomain: '',
    name: '',
    email: '',
    phone: '',
    plan: 'professional'
  })

  const [adminUser, setAdminUser] = useState({
    name: '',
    email: '',
    role: 'master',
    permissions: {} // Master role gets all permissions
  })

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

  const handleStep1Submit = async (e) => {
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

      setStep(2)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleStep2Submit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Create tenant
      const newTenant = await tenantDbService.tenants.create({
        ...tenantData,
        status: 'active'
      })

      // Set tenant context for user creation
      tenantDbService.setTenant(newTenant.id)

      // Create admin user
      const newUser = await tenantDbService.users.create({
        ...adminUser,
        tenant_id: newTenant.id
      })

      // Redirect to tenant subdomain
      // For development, use query parameter instead of subdomain
      const hostname = window.location.hostname
      let newUrl

      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        // Development: use query parameter
        newUrl = `${window.location.protocol}//${hostname}:${window.location.port}?tenant=${tenantData.subdomain}`
      } else {
        // Production: use subdomain
        newUrl = `${window.location.protocol}//${tenantData.subdomain}.${hostname}${window.location.pathname}`
      }

      if (onSuccess) {
        onSuccess(newTenant, newUser)
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
          {/* Progress Indicator */}
          <div className="mb-8">
            <div className="flex items-center">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'
              }`}>
                1
              </div>
              <div className={`flex-1 h-1 mx-2 ${step >= 2 ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'
              }`}>
                2
              </div>
            </div>
            <div className="flex justify-between mt-2">
              <span className="text-xs text-gray-600">Organization</span>
              <span className="text-xs text-gray-600">Admin User</span>
            </div>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
              {error}
            </div>
          )}

          {step === 1 && (
            <form onSubmit={handleStep1Submit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Choose your workspace URL
                </label>
                <div className="mt-1 flex rounded-md shadow-sm">
                  <input
                    type="text"
                    required
                    value={tenantData.subdomain}
                    onChange={(e) => setTenantData({
                      ...tenantData, 
                      subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')
                    })}
                    className="flex-1 rounded-l-md border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
                    placeholder="your-company"
                  />
                  <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                    .protrack.com
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  This will be your organization's unique URL
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Organization Name
                </label>
                <input
                  type="text"
                  required
                  value={tenantData.name}
                  onChange={(e) => setTenantData({...tenantData, name: e.target.value})}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Your Company Name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Business Email
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
                {loading ? 'Checking availability...' : 'Continue'}
              </button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleStep2Submit} className="space-y-6">
              <div className="text-center mb-6">
                <h3 className="text-lg font-medium text-gray-900">Create Admin Account</h3>
                <p className="text-sm text-gray-600">
                  Set up the main administrator account for {tenantData.name}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={adminUser.name}
                  onChange={(e) => setAdminUser({...adminUser, name: e.target.value})}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={adminUser.email}
                  onChange={(e) => setAdminUser({...adminUser, email: e.target.value})}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="john@yourcompany.com"
                />
              </div>

              <div className="flex space-x-4">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {loading ? 'Creating workspace...' : 'Create Workspace'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

export default TenantRegistration