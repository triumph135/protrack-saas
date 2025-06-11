// lib/supabase.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database service functions
export const dbService = {
  // Projects
  projects: {
    async getAll() {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data.map(this.formatProject)
    },

    async create(project) {
      const { data, error } = await supabase
        .from('projects')
        .insert([{
          job_number: project.jobNumber,
          job_name: project.jobName,
          customer: project.customer,
          field_shop_both: project.fieldShopBoth,
          total_contract_value: project.totalContractValue,
          status: project.status || 'Active'
        }])
        .select()
        .single()
      
      if (error) throw error
      return this.formatProject(data)
    },

    async update(id, updates) {
      const { data, error } = await supabase
        .from('projects')
        .update({
          job_number: updates.jobNumber,
          job_name: updates.jobName,
          customer: updates.customer,
          field_shop_both: updates.fieldShopBoth,
          total_contract_value: updates.totalContractValue,
          status: updates.status
        })
        .eq('id', id)
        .select()
        .single()
      
      if (error) throw error
      return this.formatProject(data)
    },

    async delete(id) {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id)
      
      if (error) throw error
    },

    formatProject(dbProject) {
      return {
        id: dbProject.id,
        jobNumber: dbProject.job_number,
        jobName: dbProject.job_name,
        customer: dbProject.customer,
        fieldShopBoth: dbProject.field_shop_both,
        totalContractValue: dbProject.total_contract_value,
        status: dbProject.status,
        createdDate: dbProject.created_at
      }
    }
  },

  // Users
  users: {
    async getAll() {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data.map(this.formatUser)
    },

    async create(user) {
      const { data, error } = await supabase
        .from('users')
        .insert([{
          name: user.name,
          email: user.email,
          role: user.role,
          permissions: user.permissions
        }])
        .select()
        .single()
      
      if (error) throw error
      return this.formatUser(data)
    },

    async update(id, updates) {
      const { data, error } = await supabase
        .from('users')
        .update({
          name: updates.name,
          email: updates.email,
          role: updates.role,
          permissions: updates.permissions
        })
        .eq('id', id)
        .select()
        .single()
      
      if (error) throw error
      return this.formatUser(data)
    },

    async delete(id) {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', id)
      
      if (error) throw error
    },

    async getCurrentUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()
      
      if (error) throw error
      return this.formatUser(data)
    },

    formatUser(dbUser) {
      return {
        id: dbUser.id,
        name: dbUser.name,
        email: dbUser.email,
        role: dbUser.role,
        permissions: dbUser.permissions
      }
    }
  },

  // Customer Invoices
  invoices: {
    async getByProject(projectId) {
      const { data, error } = await supabase
        .from('customer_invoices')
        .select('*')
        .eq('project_id', projectId)
        .order('date_billed', { ascending: false })
      
      if (error) throw error
      return data.map(this.formatInvoice)
    },

    async create(invoice) {
      const { data, error } = await supabase
        .from('customer_invoices')
        .insert([{
          project_id: invoice.projectId,
          invoice_number: invoice.invoiceNumber,
          amount: invoice.amount,
          date_billed: invoice.dateBilled
        }])
        .select()
        .single()
      
      if (error) throw error
      return this.formatInvoice(data)
    },

    async update(id, updates) {
      const { data, error } = await supabase
        .from('customer_invoices')
        .update({
          invoice_number: updates.invoiceNumber,
          amount: updates.amount,
          date_billed: updates.dateBilled
        })
        .eq('id', id)
        .select()
        .single()
      
      if (error) throw error
      return this.formatInvoice(data)
    },

    async delete(id) {
      const { error } = await supabase
        .from('customer_invoices')
        .delete()
        .eq('id', id)
      
      if (error) throw error
    },

    formatInvoice(dbInvoice) {
      return {
        id: dbInvoice.id,
        projectId: dbInvoice.project_id,
        invoiceNumber: dbInvoice.invoice_number,
        amount: dbInvoice.amount,
        dateBilled: dbInvoice.date_billed
      }
    }
  },

  // Generic cost functions for all cost categories
  costs: {
    async getByProject(category, projectId) {
      const tableName = `${category}_costs`
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('project_id', projectId)
        .order('date', { ascending: false })
      
      if (error) throw error
      return data.map(item => this.formatCost(category, item))
    },

    async create(category, cost) {
      const tableName = `${category}_costs`
      const insertData = this.prepareForInsert(category, cost)
      
      const { data, error } = await supabase
        .from(tableName)
        .insert([insertData])
        .select()
        .single()
      
      if (error) throw error
      return this.formatCost(category, data)
    },

    async update(category, id, updates) {
      const tableName = `${category}_costs`
      const updateData = this.prepareForInsert(category, updates, false)
      
      const { data, error } = await supabase
        .from(tableName)
        .update(updateData)
        .eq('id', id)
        .select()
        .single()
      
      if (error) throw error
      return this.formatCost(category, data)
    },

    async delete(category, id) {
      const tableName = `${category}_costs`
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', id)
      
      if (error) throw error
    },

    prepareForInsert(category, item, includeProjectId = true) {
      const baseData = includeProjectId ? { project_id: item.projectId } : {}
      
      if (category === 'labor') {
        return {
          ...baseData,
          employee_name: item.employeeName,
          date: item.date,
          st_hours: item.stHours || 0,
          st_rate: item.stRate || 0,
          ot_hours: item.otHours || 0,
          ot_rate: item.otRate || 0,
          dt_hours: item.dtHours || 0,
          dt_rate: item.dtRate || 0,
          per_diem: item.perDiem || 0
        }
      } else if (['equipment', 'subcontractor'].includes(category)) {
        return {
          ...baseData,
          subcontractor_name: item.subcontractorName,
          date: item.date,
          vendor: item.vendor,
          invoice_number: item.invoiceNumber,
          cost: item.cost,
          in_system: item.inSystem || false
        }
      } else {
        // material, other, cap_lease, consumable
        return {
          ...baseData,
          date: item.date,
          vendor: item.vendor,
          invoice_number: item.invoiceNumber,
          cost: item.cost,
          in_system: item.inSystem || false
        }
      }
    },

    formatCost(category, dbItem) {
      const baseFormat = {
        id: dbItem.id,
        projectId: dbItem.project_id,
        date: dbItem.date
      }

      if (category === 'labor') {
        return {
          ...baseFormat,
          employeeName: dbItem.employee_name,
          stHours: dbItem.st_hours,
          stRate: dbItem.st_rate,
          otHours: dbItem.ot_hours,
          otRate: dbItem.ot_rate,
          dtHours: dbItem.dt_hours,
          dtRate: dbItem.dt_rate,
          perDiem: dbItem.per_diem
        }
      } else if (['equipment', 'subcontractor'].includes(category)) {
        return {
          ...baseFormat,
          subcontractorName: dbItem.subcontractor_name,
          vendor: dbItem.vendor,
          invoiceNumber: dbItem.invoice_number,
          cost: dbItem.cost,
          inSystem: dbItem.in_system
        }
      } else {
        return {
          ...baseFormat,
          vendor: dbItem.vendor,
          invoiceNumber: dbItem.invoice_number,
          cost: dbItem.cost,
          inSystem: dbItem.in_system
        }
      }
    }
  }
}