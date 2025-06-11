-- Migration 001: Add Multi-Tenant Support
-- Run this in your database (Supabase SQL Editor or psql)

-- 1. Create tenants table
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subdomain VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('pending', 'active', 'suspended', 'cancelled')),
    plan VARCHAR(20) DEFAULT 'professional' CHECK (plan IN ('starter', 'professional', 'enterprise')),
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    subscription_ends_at TIMESTAMP WITH TIME ZONE,
    billing_info JSONB DEFAULT '{}'
);

-- 2. Add tenant_id to existing tables
-- First, add the columns (nullable initially)
ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE customer_invoices ADD COLUMN IF NOT EXISTS tenant_id UUID;

-- 3. Create a default tenant for your existing data
INSERT INTO tenants (subdomain, name, email, plan, status) 
VALUES ('main', 'Main Company', 'admin@yourcompany.com', 'professional', 'active')
ON CONFLICT (subdomain) DO NOTHING;

-- 4. Get the tenant ID and update existing records
DO $$
DECLARE
    main_tenant_id UUID;
BEGIN
    -- Get the main tenant ID
    SELECT id INTO main_tenant_id FROM tenants WHERE subdomain = 'main';
    
    -- Update all existing records to belong to main tenant
    UPDATE users SET tenant_id = main_tenant_id WHERE tenant_id IS NULL;
    UPDATE projects SET tenant_id = main_tenant_id WHERE tenant_id IS NULL;
    UPDATE customer_invoices SET tenant_id = main_tenant_id WHERE tenant_id IS NULL;
END $$;

-- 5. Make tenant_id NOT NULL after data migration
ALTER TABLE users ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE projects ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE customer_invoices ALTER COLUMN tenant_id SET NOT NULL;

-- 6. Add foreign key constraints
ALTER TABLE users ADD CONSTRAINT fk_users_tenant 
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE projects ADD CONSTRAINT fk_projects_tenant 
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE customer_invoices ADD CONSTRAINT fk_invoices_tenant 
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- 7. Add unique constraints for tenant-scoped data
ALTER TABLE users ADD CONSTRAINT unique_user_email_per_tenant 
    UNIQUE (tenant_id, email);
ALTER TABLE projects ADD CONSTRAINT unique_job_number_per_tenant 
    UNIQUE (tenant_id, job_number);
ALTER TABLE customer_invoices ADD CONSTRAINT unique_invoice_number_per_tenant 
    UNIQUE (tenant_id, invoice_number);

-- 8. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_projects_tenant_id ON projects(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_tenant_id ON customer_invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenants_subdomain ON tenants(subdomain);
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);

-- 9. Create consolidated project_costs table (if you have separate cost tables)
CREATE TABLE IF NOT EXISTS project_costs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL, -- 'material', 'labor', 'equipment', etc.
    date DATE NOT NULL,
    cost DECIMAL(15,2) DEFAULT 0,
    vendor VARCHAR(255),
    invoice_number VARCHAR(100),
    in_system BOOLEAN DEFAULT false,
    
    -- Labor-specific fields
    employee_name VARCHAR(255),
    st_hours DECIMAL(8,2) DEFAULT 0,
    st_rate DECIMAL(8,2) DEFAULT 0,
    ot_hours DECIMAL(8,2) DEFAULT 0,
    ot_rate DECIMAL(8,2) DEFAULT 0,
    dt_hours DECIMAL(8,2) DEFAULT 0,
    dt_rate DECIMAL(8,2) DEFAULT 0,
    per_diem DECIMAL(8,2) DEFAULT 0,
    
    -- Subcontractor-specific fields
    subcontractor_name VARCHAR(255),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. Create indexes for project_costs
CREATE INDEX IF NOT EXISTS idx_costs_tenant_id ON project_costs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_costs_project_id ON project_costs(project_id);
CREATE INDEX IF NOT EXISTS idx_costs_category ON project_costs(category);
CREATE INDEX IF NOT EXISTS idx_costs_tenant_project_category ON project_costs(tenant_id, project_id, category);

-- 11. Add password_hash column to users if it doesn't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;

-- 12. Create audit_logs table for security
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource VARCHAR(100),
    resource_id UUID,
    ip_address INET,
    user_agent TEXT,
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_id ON audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

-- 13. Create function to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 14. Create triggers for updated_at
DROP TRIGGER IF EXISTS update_tenants_updated_at ON tenants;
CREATE TRIGGER update_tenants_updated_at 
    BEFORE UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
CREATE TRIGGER update_projects_updated_at 
    BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_costs_updated_at ON project_costs;
CREATE TRIGGER update_costs_updated_at 
    BEFORE UPDATE ON project_costs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();