import React, { useState, useEffect } from 'react';

// Component for rendering cost entry forms
const CostEntryForm = ({ category, onSave, editItem = null, changeOrders = [] }) => {
  const [formData, setFormData] = useState(editItem || {});
  useEffect(() => {
    if (editItem) {
      setFormData({
        ...editItem,
        mobQty: editItem.mobQty ?? 0,
        mobRate: editItem.mobRate ?? 0,
      });
    } else {
      setFormData({});
    }
  }, [editItem]);
  const [employees, setEmployees] = useState([]);
  const [employeeLoading, setEmployeeLoading] = useState(false);
  const [employeeError, setEmployeeError] = useState('');

  useEffect(() => {
    if (category === 'labor' && tenant?.id && activeProject?.id) {
      setEmployeeLoading(true);
      supabase
        .from('employees')
        .select('*')
        .eq('tenant_id', tenant.id)
        .or(`project_id.eq.${activeProject.id},project_id.is.null`)
        .order('name', { ascending: true })
        .then(({ data, error }) => {
          if (error) setEmployeeError('Failed to load employees');
          else setEmployees(data);
        })
        .finally(() => setEmployeeLoading(false));
    }
  }, [category, tenant?.id, activeProject?.id]);

  const handleEmployeeChange = (e) => {
    const empId = e.target.value;
    setFormData({ ...formData, employee_id: empId });
    const emp = employees.find(emp => emp.id === empId);
    if (emp) {
      setFormData(fd => ({
        ...fd,
        stRate: emp.standard_rate,
        otRate: emp.ot_rate,
        dtRate: emp.dt_rate,
        employeeName: emp.name, // for display/legacy
        mobQty: emp.mob_qty,
        mobRate: emp.mob_rate
      }));
    }
  };

  const getFormFields = () => {
    switch (category) {
      case 'material':
      case 'capLeases':
        return [
          { name: 'date', label: 'Date', type: 'date' },
          { name: 'vendor', label: 'Vendor', type: 'text' },
          { name: 'invoice_number', label: 'Invoice Number', type: 'text' },
          { name: 'cost', label: 'Cost', type: 'number' },
          { name: 'in_system', label: 'In System', type: 'checkbox' }
        ];
      case 'others':
        return [
          { name: 'date', label: 'Date', type: 'date' },
          { name: 'vendor', label: 'Vendor', type: 'text' },
          { name: 'invoice_number', label: 'Invoice Number', type: 'text' },
          { name: 'description', label: 'Description', type: 'text' },
          { name: 'cost', label: 'Cost', type: 'number' },
          { name: 'in_system', label: 'In System', type: 'checkbox' }
        ];
      case 'labor':
        return [
          { name: 'employee_id', label: 'Employee', type: 'select', options: employees },
          { name: 'date', label: 'Date', type: 'date' },
          { name: 'stHours', label: 'ST Hours', type: 'number' },
          { name: 'stRate', label: 'ST Rate ($/hr)', type: 'number' },
          { name: 'otHours', label: 'OT Hours', type: 'number' },
          { name: 'otRate', label: 'OT Rate ($/hr)', type: 'number' },
          { name: 'dtHours', label: 'DT Hours', type: 'number' },
          { name: 'dtRate', label: 'DT Rate ($/hr)', type: 'number' },
          { name: 'perDiem', label: 'Per Diem ($)', type: 'number' },
          { name: 'mobQty', label: 'MOB Quantity', type: 'number' },
          { name: 'mobRate', label: 'MOB Rate ($)', type: 'number' }
        ];
      case 'equipment':
        return [
          { name: 'date', label: 'Date', type: 'date' },
          { name: 'vendor', label: 'Vendor', type: 'text' },
          { name: 'invoice_number', label: 'Invoice Number', type: 'text' },
          { name: 'cost', label: 'Cost', type: 'number' },
          { name: 'in_system', label: 'In System', type: 'checkbox' }
        ];
      case 'subcontractor':
        return [
          { name: 'subcontractor_name', label: 'Subcontractor Name', type: 'text' },
          { name: 'date', label: 'Date', type: 'date' },
          { name: 'vendor', label: 'Vendor', type: 'text' },
          { name: 'invoice_number', label: 'Invoice Number', type: 'text' },
          { name: 'cost', label: 'Cost', type: 'number' },
          { name: 'in_system', label: 'In System', type: 'checkbox' }
        ];
      case 'consumable':
        return [
          { name: 'date', label: 'Date', type: 'date' },
          { name: 'vendor', label: 'Vendor', type: 'text' },
          { name: 'invoice_number', label: 'Invoice Number', type: 'text' },
          { name: 'cost', label: 'Cost', type: 'number' },
          { name: 'in_system', label: 'In System', type: 'checkbox' }
        ];
      default:
        return [];
    }
  };

  const handleSubmit = async () => {
    if (!activeProject) {
      alert('Please select a project first');
      return;
    }

    try {
      if (editItem) {
        await handleUpdateCost(category, editItem.id, formData);
      } else {
        await handleCreateCost(category, formData);
      }
      onSave();
      setFormData({});
    } catch (error) {
      console.error('Error saving cost:', error);
    }
  };

  // Check if user has write permission for this category
  if (!hasPermission(category, 'write')) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="flex items-center gap-2 text-yellow-800">
          <Lock className="w-4 h-4" />
          <span>You don't have write permissions for this section</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {getFormFields().map(field => (
          <div key={field.name}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {field.label}
            </label>
            {category === 'labor' && field.name === 'employee_id' ? (
              <select
                value={formData.employee_id || ''}
                onChange={handleEmployeeChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select Employee</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name}</option>
                ))}
              </select>
            ) : field.type === 'checkbox' ? (
              <input
                type="checkbox"
                checked={formData[field.name] || false}
                onChange={(e) => setFormData({...formData, [field.name]: e.target.checked})}
                className="rounded border-gray-300"
              />
            ) : (
              <input
                type={field.type}
                value={formData[field.name] || ''}
                onChange={(e) => setFormData({...formData, [field.name]: 
                  field.type === 'number' ? (e.target.value === '' ? '' : parseFloat(e.target.value)) : e.target.value
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                step={field.type === 'number' ? '0.1' : undefined}
                min={field.type === 'number' ? '0' : undefined}
                disabled={category === 'labor' && ['stRate','otRate','dtRate'].includes(field.name) && !formData.employee_id}
              />
            )}
          </div>
        ))}
      </div>

      {/* Change Order Dropdown */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Change Order</label>
        <select
          value={formData.change_order_id || ''}
          onChange={e => setFormData({ ...formData, change_order_id: e.target.value || null })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Base Contract</option>
          {changeOrders.map(co => (
            <option key={co.id} value={co.id}>{co.name}</option>
          ))}
        </select>
      </div>

      {/* File Attachments */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        {editItem ? (
          <FileAttachments
            entityType="cost"
            entityId={editItem.id}
            tenantId={tenant?.id}
            userId={user?.id}
            canEdit={hasPermission(category, 'write')}
          />
        ) : (
          <div className="text-center py-4 text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <p className="text-sm">💡 Save this entry first, then edit it to add file attachments</p>
          </div>
        )}
      </div>  
      {/* Save Button */}
      <div className="flex gap-2">
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {loading ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  );
};

export default CostEntryForm; 