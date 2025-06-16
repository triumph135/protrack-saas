import React, { useState } from 'react';
import { Plus, Edit, Trash2, Lock } from 'lucide-react';

// Cost Category View with enhanced permissions
const CostCategoryView = ({ 
  category, 
  selectedChangeOrder, 
  setSelectedChangeOrder, 
  changeOrders,
  costData,
  activeProject,
  calculateTotals,
  hasPermission,
  getPermissionLevel,
  handleDeleteCost,
  handleUpdateBudget,
  loading,
  filters,
  applyFilters,
  exportCategoryToExcel
}) => {
    const [showForm, setShowForm] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const totals = calculateTotals();
    const budgets = totals.budgets || {};
    const variances = totals.variances || {};
    
    // Use a new variable for filtered data
    const allCategoryDataRaw = (costData[category] || []).filter(item => item.project_id === activeProject?.id || !item.project_id);
    let allCategoryData = allCategoryDataRaw;
    if (selectedChangeOrder !== 'all') {
      if (selectedChangeOrder === 'base') {
        allCategoryData = allCategoryDataRaw.filter(item => !item.change_order_id);
      } else {
        allCategoryData = allCategoryDataRaw.filter(item => item.change_order_id === selectedChangeOrder);
      }
    }
    const filteredCategoryData = applyFilters(allCategoryData, category);

    const canRead = hasPermission(category, 'read');
    const canWrite = hasPermission(category, 'write');
    const permissionLevel = getPermissionLevel(category);

    const handleSave = () => {
      setShowForm(false);
      setEditingItem(null);
    };

    const handleDelete = async (id) => {
      if (!window.confirm('Are you sure you want to delete this entry?')) {
        return;
      }
      
      await handleDeleteCost(category, id);
    };

    if (!canRead) {
      return (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center justify-center gap-2 text-gray-500">
            <Lock className="w-6 h-6" />
            <span>You don't have permission to view this section</span>
          </div>
        </div>
      );
    }

    // Calculate totals for filtered data
    const filteredTotal = filteredCategoryData.reduce((sum, item) => {
      if (category === 'labor') {
        const stCost = (item.stHours || 0) * (item.stRate || 0);
        const otCost = (item.otHours || 0) * (item.otRate || 0);
        const dtCost = (item.dtHours || 0) * (item.dtRate || 0);
        const perDiem = item.perDiem || 0;
        const mobCost = (item.mobQty || 0) * (item.mobRate || 0);
        return sum + stCost + otCost + dtCost + perDiem + mobCost;
      } else {
        return sum + (item.cost || 0);
      }
    }, 0);

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-gray-900 capitalize">
              {category.replace(/([A-Z])/g, ' $1').trim()} Management
            </h2>
            {permissionLevel !== 'none' && (
              <span className={`px-2 py-1 text-xs rounded-full ${
                permissionLevel === 'write' ? 'bg-green-100 text-green-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>
                {permissionLevel === 'write' ? 'Read/Write' : 'Read Only'}
              </span>
            )}
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm text-gray-600">
                Filtered Total: ${filteredTotal.toLocaleString()}
                {filteredCategoryData.length !== allCategoryData.length && (
                  <div className="text-xs text-gray-500">
                    ({filteredCategoryData.length} of {allCategoryData.length} records)
                  </div>
                )}
              </div>
            </div>
            {canWrite && (
              <button
                onClick={() => setShowForm(!showForm)}
                disabled={!activeProject}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4" />
                Add Entry
              </button>
            )}
          </div>
        </div>

        {/* Change Order Filter Dropdown */}
        <div className="flex items-center gap-4 mb-2">
          <label className="text-sm font-medium text-gray-700">Change Order:</label>
          <select
            value={selectedChangeOrder}
            onChange={e => setSelectedChangeOrder(e.target.value)}
            className="px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          >
            <option value="all">All</option>
            <option value="base">Base Contract</option>
            {changeOrders.map(co => (
              <option key={co.id} value={co.id}>{co.name}</option>
            ))}
          </select>
        </div>

        {/* Budget vs Actual Section */}
        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
          <BudgetTrackingSection 
            category={category}
            actualAmount={filteredTotal}
            budgetAmount={budgets[category] || 0}
            variance={variances[category] || 0}
            onUpdateBudget={handleUpdateBudget}
            canEdit={hasPermission(category, 'write')}
            loading={loading}
          />
        </div>

        {!activeProject && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-md">
            Please select a project to view and manage costs.
          </div>
        )}

        {/* Filter Component */}
        <FilterComponent
          category={category}
          onExportFiltered={() => exportCategoryToExcel(category, true)}
        />

        {showForm && canWrite && activeProject && (
          <CostEntryForm
            category={category}
            onSave={handleSave}
            editItem={editingItem}
            changeOrders={changeOrders}
          />
        )}

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {category === 'labor' ? (
                    <>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ST Hours</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">OT Hours</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">DT Hours</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Per Diem</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">MOB Quantity</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">MOB Rate</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Cost</th>
                    </>
                  ) : category === 'others' ? (
                    <>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cost</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    </>
                  ) : (
                    <>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cost</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    </>
                  )}
                  {canWrite && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCategoryData.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    {category === 'labor' ? (
                      <>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{((() => {
                          if (item.employee_id) {
                            const emp = allEmployees.find(e => e.id === item.employee_id);
                            return emp ? emp.name : '(Unknown)';
                          }
                          return item.employeeName || '(Unknown)';
                        })())}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.date}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.stHours} @ ${item.stRate || 0}/hr</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.otHours} @ ${item.otRate || 0}/hr</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.dtHours} @ ${item.dtRate || 0}/hr</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${item.perDiem || 0}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.mob_qty || 0}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${item.mob_rate || 0}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                          ${(((item.stHours || 0) * (item.stRate || 0)) + 
                            ((item.otHours || 0) * (item.otRate || 0)) + 
                            ((item.dtHours || 0) * (item.dtRate || 0)) + 
                            (item.perDiem || 0) + 
                            ((item.mob_qty || 0) * (item.mob_rate || 0))).toLocaleString()}
                        </td>
                      </>
                    ) : category === 'others' ? (
                      <>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.date}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.vendor || item.subcontractorName}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.description || '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.invoice_number}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${item.cost?.toLocaleString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs rounded-full ${item.in_system ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                            {item.in_system ? 'In System' : 'Pending'}
                          </span>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.date}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.vendor || item.subcontractorName}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.invoice_number}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${item.cost?.toLocaleString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs rounded-full ${item.in_system ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                            {item.in_system ? 'In System' : 'Pending'}
                          </span>
                        </td>
                      </>
                    )}
                    {canWrite && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => {
                            setEditingItem(item);
                            setShowForm(true);
                          }}
                          className="text-blue-600 hover:text-blue-900 mr-4"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="text-red-600 hover:text-red-900"
                          disabled={loading}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredCategoryData.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              {allCategoryData.length === 0 ? 'No entries found' : 'No entries match the current filters'}
            </div>
          )}
        </div>
      </div>
    );
  };

export default CostCategoryView; 