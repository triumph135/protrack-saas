import { createClient } from '@supabase/supabase-js'

console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log('Supabase Anon Key:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Types
export interface Project {
  id: string
  jobNumber: string
  jobName: string
  customer: string
  fieldShopBoth: string
  totalContractValue: number
  status: string
  createdDate: string
  tenant_id?: string
}

export interface User {
  id: string
  name: string
  email: string
  role: string
  permissions: {
    material: 'read' | 'write' | 'none'
    labor: 'read' | 'write' | 'none'
    equipment: 'read' | 'write' | 'none'
    subcontractor: 'read' | 'write' | 'none'
    others: 'read' | 'write' | 'none'
    capLeases: 'read' | 'write' | 'none'
    consumable: 'read' | 'write' | 'none'
    invoices: 'read' | 'write' | 'none'
    projects: 'read' | 'write' | 'none'
    users: 'read' | 'write' | 'none'
  }
  tenant_id?: string | null
}

export interface CustomerInvoice {
  id: string
  projectId: string
  invoiceNumber: string
  amount: number
  dateBilled: string
  tenant_id?: string
}

export interface Cost {
  id: string
  projectId: string
  date: string
  vendor?: string
  invoiceNumber?: string
  cost: number
  inSystem: boolean
  employee_id?: string
  employeeName?: string
  stHours?: number
  stRate?: number
  otHours?: number
  otRate?: number
  dtHours?: number
  dtRate?: number
  perDiem?: number
  subcontractorName?: string
  tenant_id?: string
}

// Database service
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

    async create(project: Omit<Project, 'id' | 'createdDate'>) {
      const { data, error } = await supabase
        .from('projects')
        .insert([{
          job_number: project.jobNumber,
          job_name: project.jobName,
          customer: project.customer,
          field_shop_both: project.fieldShopBoth,
          total_contract_value: project.totalContractValue,
          status: project.status || 'Active',
          tenant_id: project.tenant_id
        }])
        .select()
        .single()
      
      if (error) throw error
      return this.formatProject(data)
    },

    async update(id: string, updates: Partial<Project>) {
      const { data, error } = await supabase
        .from('projects')
        .update({
          job_number: updates.jobNumber,
          job_name: updates.jobName,
          customer: updates.customer,
          field_shop_both: updates.fieldShopBoth,
          total_contract_value: updates.totalContractValue,
          status: updates.status,
          tenant_id: updates.tenant_id
        })
        .eq('id', id)
        .select()
        .single()
      
      if (error) throw error
      return this.formatProject(data)
    },

    async delete(id: string) {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id)
      
      if (error) throw error
    },

    formatProject(dbProject: any): Project {
      return {
        id: dbProject.id,
        jobNumber: dbProject.job_number,
        jobName: dbProject.job_name,
        customer: dbProject.customer,
        fieldShopBoth: dbProject.field_shop_both,
        totalContractValue: dbProject.total_contract_value,
        status: dbProject.status,
        createdDate: dbProject.created_at,
        tenant_id: dbProject.tenant_id
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

    async create(user: Omit<User, 'id'> & { id: string }) {
      const { data, error } = await supabase
        .from('users')
        .insert([{
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          permissions: user.permissions,
          tenant_id: user.tenant_id
        }])
        .select()
        .single()
      
      if (error) throw error
      return this.formatUser(data)
    },

    async update(id: string, updates: Partial<User>) {
      const { data, error } = await supabase
        .from('users')
        .update({
          name: updates.name,
          email: updates.email,
          role: updates.role,
          permissions: updates.permissions,
          tenant_id: updates.tenant_id
        })
        .eq('id', id)
        .select()
        .single()
      
      if (error) throw error
      return this.formatUser(data)
    },

    async delete(id: string) {
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

    formatUser(dbUser: any): User {
      return {
        id: dbUser.id,
        name: dbUser.name,
        email: dbUser.email,
        role: dbUser.role,
        permissions: dbUser.permissions,
        tenant_id: dbUser.tenant_id
      }
    }
  },

  // Customer Invoices
  invoices: {
    async getByProject(projectId: string) {
      const { data, error } = await supabase
        .from('customer_invoices')
        .select('*')
        .eq('project_id', projectId)
        .order('date_billed', { ascending: false })
      
      if (error) throw error
      return data.map(this.formatInvoice)
    },

    async create(invoice: Omit<CustomerInvoice, 'id'>) {
      const { data, error } = await supabase
        .from('customer_invoices')
        .insert([{
          project_id: invoice.projectId,
          invoice_number: invoice.invoiceNumber,
          amount: invoice.amount,
          date_billed: invoice.dateBilled,
          tenant_id: invoice.tenant_id
        }])
        .select()
        .single()
      
      if (error) throw error
      return this.formatInvoice(data)
    },

    async update(id: string, updates: Partial<CustomerInvoice>) {
      const { data, error } = await supabase
        .from('customer_invoices')
        .update({
          invoice_number: updates.invoiceNumber,
          amount: updates.amount,
          date_billed: updates.dateBilled,
          tenant_id: updates.tenant_id
        })
        .eq('id', id)
        .select()
        .single()
      
      if (error) throw error
      return this.formatInvoice(data)
    },

    async delete(id: string) {
      const { error } = await supabase
        .from('customer_invoices')
        .delete()
        .eq('id', id)
      
      if (error) throw error
    },

    formatInvoice(dbInvoice: any): CustomerInvoice {
      return {
        id: dbInvoice.id,
        projectId: dbInvoice.project_id,
        invoiceNumber: dbInvoice.invoice_number,
        amount: dbInvoice.amount,
        dateBilled: dbInvoice.date_billed,
        tenant_id: dbInvoice.tenant_id
      }
    }
  },

  // Generic cost functions for all cost categories
  costs: {
    async getByProject(category: string, projectId: string) {
      const tableName = `${category}_costs`
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('project_id', projectId)
        .order('date', { ascending: false })
      
      if (error) throw error
      return data.map((item: any) => this.formatCost(category, item))
    },

    async create(category: string, cost: Omit<Cost, 'id'>) {
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

    async update(category: string, id: string, updates: Partial<Cost>) {
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

    async delete(category: string, id: string) {
      const tableName = `${category}_costs`
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', id)
      
      if (error) throw error
    },

    prepareForInsert(category: string, item: Partial<Cost>, includeProjectId = true) {
      const baseData = includeProjectId ? { project_id: item.projectId } : {}
      
      if (category === 'labor') {
        return {
          ...baseData,
          employee_id: item.employee_id,
          employee_name: item.employeeName,
          date: item.date,
          st_hours: item.stHours,
          st_rate: item.stRate,
          ot_hours: item.otHours,
          ot_rate: item.otRate,
          dt_hours: item.dtHours,
          dt_rate: item.dtRate,
          per_diem: item.perDiem,
          tenant_id: item.tenant_id
        }
      } else if (['equipment', 'subcontractor'].includes(category)) {
        return {
          ...baseData,
          subcontractor_name: item.subcontractorName,
          date: item.date,
          vendor: item.vendor,
          invoice_number: item.invoiceNumber,
          cost: item.cost,
          in_system: item.inSystem,
          tenant_id: item.tenant_id
        }
      } else {
        return {
          ...baseData,
          date: item.date,
          vendor: item.vendor,
          invoice_number: item.invoiceNumber,
          cost: item.cost,
          in_system: item.inSystem,
          tenant_id: item.tenant_id
        }
      }
    },

    formatCost(category: string, dbItem: any): Cost {
      const baseFormat = {
        id: dbItem.id,
        projectId: dbItem.project_id,
        date: dbItem.date,
        tenant_id: dbItem.tenant_id,
        cost: dbItem.cost || 0,
        inSystem: dbItem.in_system || false
      }

      if (category === 'labor') {
        return {
          ...baseFormat,
          employee_id: dbItem.employee_id,
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
          invoiceNumber: dbItem.invoice_number
        }
      } else {
        return {
          ...baseFormat,
          vendor: dbItem.vendor,
          invoiceNumber: dbItem.invoice_number
        }
      }
    }
  }
} 