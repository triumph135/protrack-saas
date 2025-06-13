// src/lib/tenantDbService.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY

function mapLaborDbToApp(item) {
  return {
    ...item,
    stHours: item.st_hours,
    stRate: item.st_rate,
    otHours: item.ot_hours,
    otRate: item.ot_rate,
    dtHours: item.dt_hours,
    dtRate: item.dt_rate,
    perDiem: item.per_diem,
    employeeName: item.employee_name,
    employee_id: item.employee_id,
    mobQty: item.mob_qty ?? 0,
    mobRate: item.mob_rate ?? 0,
  };
}

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

  // Projects with status management and tenant isolation
  projects = {
    getAll: async (includeInactive = false) => {
      if (!this.currentTenant) throw new Error('No tenant context')
      
      let query = this.supabase
        .from('projects')
        .select('*')
        .eq('tenant_id', this.currentTenant)
        .order('created_at', { ascending: false })
      
      // Filter to only active projects unless specifically requesting all
      if (!includeInactive) {
        query = query.eq('status', 'Active')
      }
      
      const { data, error } = await query
      if (error) throw error
      return data
    },

    getAllWithStatus: async () => {
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
        .insert([{ ...projectData, tenant_id: this.currentTenant, status: 'Active' }])
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

    updateStatus: async (projectId, status) => {
      if (!this.currentTenant) throw new Error('No tenant context')
      
      const { data, error } = await this.supabase
        .from('projects')
        .update({ status })
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
    getByProject: async (projectId, changeOrderId = null) => {
      if (!this.currentTenant) throw new Error('No tenant context')
      
      let query = this.supabase
        .from('customer_invoices')
        .select('*')
        .eq('project_id', projectId)
        .eq('tenant_id', this.currentTenant)
        .order('date_billed', { ascending: false })
      
      if (changeOrderId !== null) {
        query = query.eq('change_order_id', changeOrderId)
      }
      
      const { data, error } = await query
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
    getByProject: async (category, projectId, changeOrderId = null) => {
      if (!this.currentTenant) throw new Error('No tenant context')
      let query = this.supabase
        .from('project_costs')
        .select('*')
        .eq('category', category)
        .eq('project_id', projectId)
        .eq('tenant_id', this.currentTenant)
        .order('date', { ascending: false })
      if (changeOrderId !== null) {
        query = query.eq('change_order_id', changeOrderId)
      }
      const { data, error } = await query
      if (error) throw error
      if (category === 'labor') {
        return data.map(mapLaborDbToApp)
      }
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
      if (category === 'labor') {
        return mapLaborDbToApp(data)
      }
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
      if (category === 'labor') {
        return mapLaborDbToApp(data)
      }
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

  // Budget operations with tenant isolation
  budgets = {
    getByProject: async (projectId) => {
      if (!this.currentTenant) throw new Error('No tenant context')
      
      const { data, error } = await this.supabase
        .from('project_budgets')
        .select('*')
        .eq('tenant_id', this.currentTenant)
        .eq('project_id', projectId)
        .single()
      
      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error
      }
      
      // If no budget exists, create a default one
      if (!data) {
        return await this.createDefaultBudget(projectId)
      }
      
      return data
    },

    createDefaultBudget: async (projectId) => {
      if (!this.currentTenant) throw new Error('No tenant context')
      
      const { data, error } = await this.supabase
        .from('project_budgets')
        .insert([{
          tenant_id: this.currentTenant,
          project_id: projectId,
          material_budget: 0,
          labor_budget: 0,
          equipment_budget: 0,
          subcontractor_budget: 0,
          others_budget: 0,
          cap_leases_budget: 0,
          consumable_budget: 0
        }])
        .select()
        .single()
      
      if (error) throw error
      return data
    },

    update: async (projectId, budgetData) => {
      if (!this.currentTenant) throw new Error('No tenant context')
      
      const { data, error } = await this.supabase
        .from('project_budgets')
        .update(budgetData)
        .eq('tenant_id', this.currentTenant)
        .eq('project_id', projectId)
        .select()
        .single()
      
      if (error) throw error
      return data
    },

    updateCategory: async (projectId, category, amount) => {
      if (!this.currentTenant) throw new Error('No tenant context')
      
      const budgetField = category === 'capLeases' ? 'cap_leases_budget' : `${category}_budget`
      const updateData = { [budgetField]: amount }
      
      const { data, error } = await this.supabase
        .from('project_budgets')
        .update(updateData)
        .eq('tenant_id', this.currentTenant)
        .eq('project_id', projectId)
        .select()
        .single()
      
      if (error) throw error
      return data
    }
  }

  // Change Orders
  changeOrders = {
    getAllByProject: async (projectId) => {
      if (!this.currentTenant) throw new Error('No tenant context');
      const { data, error } = await this.supabase
        .from('change_orders')
        .select('*')
        .eq('project_id', projectId)
        .eq('tenant_id', this.currentTenant)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    },
    create: async (projectId, changeOrderData) => {
      if (!this.currentTenant) throw new Error('No tenant context');
      const { data, error } = await this.supabase
        .from('change_orders')
        .insert([{ ...changeOrderData, project_id: projectId, tenant_id: this.currentTenant }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    update: async (id, updates) => {
      if (!this.currentTenant) throw new Error('No tenant context');
      const { data, error } = await this.supabase
        .from('change_orders')
        .update(updates)
        .eq('id', id)
        .eq('tenant_id', this.currentTenant)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    delete: async (id) => {
      if (!this.currentTenant) throw new Error('No tenant context');
      const { error } = await this.supabase
        .from('change_orders')
        .delete()
        .eq('id', id)
        .eq('tenant_id', this.currentTenant);
      if (error) throw error;
    }
  }

  // Change Order Budgets
  changeOrderBudgets = {
    getByChangeOrder: async (changeOrderId) => {
      if (!this.currentTenant) throw new Error('No tenant context');
      const { data, error } = await this.supabase
        .from('change_order_budgets')
        .select('*')
        .eq('change_order_id', changeOrderId)
        .order('category', { ascending: true });
      if (error) throw error;
      return data;
    },
    update: async (changeOrderId, category, amount) => {
      if (!this.currentTenant) throw new Error('No tenant context');
      // Upsert budget for this change order/category
      const { data, error } = await this.supabase
        .from('change_order_budgets')
        .upsert({ change_order_id: changeOrderId, category, budget: amount }, { onConflict: ['change_order_id', 'category'] })
        .select()
        .single();
      if (error) throw error;
      return data;
    }
  }

  // Move createDefaultBudget to be a regular class method
  async createDefaultBudget(projectId) {
    if (!this.currentTenant) throw new Error('No tenant context')
    const { data, error } = await this.supabase
      .from('project_budgets')
      .insert([{
        tenant_id: this.currentTenant,
        project_id: projectId,
        material_budget: 0,
        labor_budget: 0,
        equipment_budget: 0,
        subcontractor_budget: 0,
        others_budget: 0,
        cap_leases_budget: 0,
        consumable_budget: 0
      }])
      .select()
      .single()
    if (error) throw error
    return data
  }
}

export const tenantDbService = new TenantDbService()