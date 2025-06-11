// src/lib/tenantDbService.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY

class TenantDbService {
  constructor() {
    this.supabase = createClient(supabaseUrl, supabaseKey)
    this.currentTenant = null
  }

  setTenant(tenantId) {
    this.currentTenant = tenantId
  }

  getCurrentTenant() {
    return this.currentTenant
  }

  // Tenant operations
  tenants = {
    create: async (tenantData) => {
      const { data, error } = await this.supabase
        .from('tenants')
        .insert([tenantData])
        .select()
        .single()
      
      if (error) throw error
      return data
    },

    getBySubdomain: async (subdomain) => {
      const { data, error } = await this.supabase
        .from('tenants')
        .select('*')
        .eq('subdomain', subdomain)
        .eq('status', 'active')
        .single()
      
      if (error) throw error
      return data
    },

    update: async (tenantId, updates) => {
      const { data, error } = await this.supabase
        .from('tenants')
        .update(updates)
        .eq('id', tenantId)
        .select()
        .single()
      
      if (error) throw error
      return data
    }
  }

  // Users with tenant isolation
  users = {
    getAll: async () => {
      if (!this.currentTenant) throw new Error('No tenant context')
      
      const { data, error } = await this.supabase
        .from('users')
        .select('*')
        .eq('tenant_id', this.currentTenant)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data
    },

    create: async (userData) => {
      if (!this.currentTenant) throw new Error('No tenant context')
      
      const { data, error } = await this.supabase
        .from('users')
        .insert([{ ...userData, tenant_id: this.currentTenant }])
        .select()
        .single()
      
      if (error) throw error
      return data
    },

    update: async (userId, updates) => {
      if (!this.currentTenant) throw new Error('No tenant context')
      
      const { data, error } = await this.supabase
        .from('users')
        .update(updates)
        .eq('id', userId)
        .eq('tenant_id', this.currentTenant)
        .select()
        .single()
      
      if (error) throw error
      return data
    },

    delete: async (userId) => {
      if (!this.currentTenant) throw new Error('No tenant context')
      
      const { error } = await this.supabase
        .from('users')
        .delete()
        .eq('id', userId)
        .eq('tenant_id', this.currentTenant)
      
      if (error) throw error
    },

    getByEmail: async (email) => {
      if (!this.currentTenant) throw new Error('No tenant context')
      
      const { data, error } = await this.supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .eq('tenant_id', this.currentTenant)
        .single()
      
      if (error) throw error
      return data
    }
  }

  // Projects with tenant isolation
  projects = {
    getAll: async () => {
      if (!this.currentTenant) throw new Error('No tenant context')
      
      const { data, error } = await this.supabase
        .from('projects')
        .select('*')
        .eq('tenant_id', this.currentTenant)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data
    },

    create: async (projectData) => {
      if (!this.currentTenant) throw new Error('No tenant context')
      
      const { data, error } = await this.supabase
        .from('projects')
        .insert([{ ...projectData, tenant_id: this.currentTenant }])
        .select()
        .single()
      
      if (error) throw error
      return data
    },

    update: async (projectId, updates) => {
      if (!this.currentTenant) throw new Error('No tenant context')
      
      const { data, error } = await this.supabase
        .from('projects')
        .update(updates)
        .eq('id', projectId)
        .eq('tenant_id', this.currentTenant)
        .select()
        .single()
      
      if (error) throw error
      return data
    },

    delete: async (projectId) => {
      if (!this.currentTenant) throw new Error('No tenant context')
      
      const { error } = await this.supabase
        .from('projects')
        .delete()
        .eq('id', projectId)
        .eq('tenant_id', this.currentTenant)
      
      if (error) throw error
    }
  }

  // Invoices with tenant isolation
  invoices = {
    getByProject: async (projectId) => {
      if (!this.currentTenant) throw new Error('No tenant context')
      
      const { data, error } = await this.supabase
        .from('customer_invoices')
        .select('*')
        .eq('project_id', projectId)
        .eq('tenant_id', this.currentTenant)
        .order('date_billed', { ascending: false })
      
      if (error) throw error
      return data
    },

    create: async (invoiceData) => {
      if (!this.currentTenant) throw new Error('No tenant context')
      
      const { data, error } = await this.supabase
        .from('customer_invoices')
        .insert([{ ...invoiceData, tenant_id: this.currentTenant }])
        .select()
        .single()
      
      if (error) throw error
      return data
    },

    update: async (invoiceId, updates) => {
      if (!this.currentTenant) throw new Error('No tenant context')
      
      const { data, error } = await this.supabase
        .from('customer_invoices')
        .update(updates)
        .eq('id', invoiceId)
        .eq('tenant_id', this.currentTenant)
        .select()
        .single()
      
      if (error) throw error
      return data
    },

    delete: async (invoiceId) => {
      if (!this.currentTenant) throw new Error('No tenant context')
      
      const { error } = await this.supabase
        .from('customer_invoices')
        .delete()
        .eq('id', invoiceId)
        .eq('tenant_id', this.currentTenant)
      
      if (error) throw error
    }
  }

  // Costs with tenant isolation
  costs = {
    getByProject: async (category, projectId) => {
      if (!this.currentTenant) throw new Error('No tenant context')
      
      const { data, error } = await this.supabase
        .from('project_costs')
        .select('*')
        .eq('category', category)
        .eq('project_id', projectId)
        .eq('tenant_id', this.currentTenant)
        .order('date', { ascending: false })
      
      if (error) throw error
      return data
    },

    create: async (category, costData) => {
      if (!this.currentTenant) throw new Error('No tenant context')
      
      const { data, error } = await this.supabase
        .from('project_costs')
        .insert([{ 
          ...costData, 
          category, 
          tenant_id: this.currentTenant 
        }])
        .select()
        .single()
      
      if (error) throw error
      return data
    },

    update: async (category, costId, updates) => {
      if (!this.currentTenant) throw new Error('No tenant context')
      
      const { data, error } = await this.supabase
        .from('project_costs')
        .update(updates)
        .eq('id', costId)
        .eq('tenant_id', this.currentTenant)
        .select()
        .single()
      
      if (error) throw error
      return data
    },

    delete: async (category, costId) => {
      if (!this.currentTenant) throw new Error('No tenant context')
      
      const { error } = await this.supabase
        .from('project_costs')
        .delete()
        .eq('id', costId)
        .eq('tenant_id', this.currentTenant)
      
      if (error) throw error
    }
  }
}

export const tenantDbService = new TenantDbService()