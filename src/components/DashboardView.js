import React, { useState } from 'react';
import { BarChart3, Download, Lock, Plus } from 'lucide-react';

// Dashboard view
const DashboardView = ({ 
  changeOrders, 
  activeProject,
  calculateTotals,
  hasPermission,
  setCurrentView,
  costData,
  budgetData,
  tenantDbService,
  loading,
  showBudgetReport,
  setShowBudgetReport
}) => {
    if (!activeProject) {
      return (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow-md text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Welcome to ProTrack!</h2>
            <p className="text-gray-600 mb-6">Get started by creating your first project.</p>
            {hasPermission('projects', 'write') ? (
              <button
                onClick={() => setCurrentView('projects')}
                className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2 mx-auto"
              >
                <Plus className="w-5 h-5" />
                Create Your First Project
              </button>
            ) : (
              <p className="text-gray-500">Ask an administrator to create a project for you.</p>
            )}
          </div>
        </div>
      );
    }
    const totals = calculateTotals();
    const [editingContractValue, setEditingContractValue] = useState(false);
    const [contractValueInput, setContractValueInput] = useState(activeProject?.totalContractValue || 0);
    
    // Calculate change order total and grand total
    const changeOrdersTotal = changeOrders.reduce((sum, co) => sum + (co.additional_contract_value || 0), 0);
    const baseContractValue = activeProject?.totalContractValue || 0;
    const grandTotalContractValue = baseContractValue + changeOrdersTotal;
    
    return (
      <div className="space-y-6">
        {/* Export Buttons */}
        <div className="bg-white p-4 rounded-lg shadow-md">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">Export Options</h2>
            <div className="flex gap-2">
              <button
                onClick={exportToPDF}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export PDF Report
              </button>
              <button
                onClick={exportToExcel}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export Excel Report
              </button>
            </div>
          </div>
        </div>

        {/* Project Overview */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Project Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-blue-600 text-2xl font-bold">{activeProject.jobNumber}</div>
              <div className="text-gray-600">Job Number</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-green-600 text-lg font-bold">{activeProject.jobName}</div>
              <div className="text-gray-600">Project Name</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-purple-600 text-lg font-bold">{activeProject.customer}</div>
              <div className="text-gray-600">Customer</div>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg">
              <div className="text-orange-600 text-lg font-bold">{activeProject.fieldShopBoth}</div>
              <div className="text-gray-600">Type</div>
            </div>
          </div>
        </div>

        {/* Financial Overview */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Financial Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* Grand Total Contract Value */}
            <div className="bg-indigo-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-indigo-600 text-2xl font-bold">
                    ${grandTotalContractValue.toLocaleString()}
                  </div>
                  <div className="text-gray-600">Total Contract Value</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Base: ${baseContractValue.toLocaleString()}<br/>
                    Change Orders: ${changeOrdersTotal.toLocaleString()}
                  </div>
                </div>
                {/* Edit button removed */}
              </div>
              {/* Edit input removed */}
            </div>
            <div className="bg-cyan-50 p-4 rounded-lg">
              <div className="text-cyan-600 text-2xl font-bold">${totals.totalBilledToDate.toLocaleString()}</div>
              <div className="text-gray-600">Total Billed to Date</div>
            </div>
            <div className="bg-amber-50 p-4 rounded-lg">
              <div className="text-amber-600 text-2xl font-bold">${totals.totalCosts.toLocaleString()}</div>
              <div className="text-gray-600">Total Costs</div>
            </div>
          </div>
          
          <div className="pt-4 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <div>
                <div className={`text-2xl font-bold ${totals.grossProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  Gross Profit: ${totals.grossProfit.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600">
                  Remaining to Bill: ${(grandTotalContractValue - totals.totalBilledToDate).toLocaleString()}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-600">Profit Margin</div>
                <div className={`text-xl font-bold ${totals.grossProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {totals.totalBilledToDate > 0 ? ((totals.grossProfit / totals.totalBilledToDate) * 100).toFixed(1) : '0.0'}%
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Cost Summary */}
        {/* Enhanced Cost Summary with Budget Tracking */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Budget vs Actual</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 text-sm font-medium text-gray-600">Category</th>
                  <th className="text-right py-2 px-3 text-sm font-medium text-gray-600">Budget</th>
                  <th className="text-right py-2 px-3 text-sm font-medium text-gray-600">Actual</th>
                  <th className="text-right py-2 px-3 text-sm font-medium text-gray-600">Variance</th>
                  <th className="text-right py-2 px-3 text-sm font-medium text-gray-600">% of Budget</th>
                </tr>
              </thead>
              <tbody>
                {Object.keys(totals.budgets || {}).map((category) => {
                  const actual = totals[category] || 0;
                  const budget = totals.budgets[category] || 0;
                  const variance = totals.variances[category] || 0;
                  const percentUsed = budget > 0 ? (actual / budget) * 100 : 0;
                  const isOverBudget = variance < 0;
                  
                  return (
                    <tr key={category} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900 capitalize">
                            {category.replace(/([A-Z])/g, ' $1').trim()}
                          </span>
                          {!hasPermission(category, 'read') && (
                            <Lock className="w-3 h-3 text-gray-400" />
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-3 text-right text-sm text-gray-600">
                        ${budget.toLocaleString()}
                      </td>
                      <td className="py-2 px-3 text-right text-sm font-medium text-gray-900">
                        ${actual.toLocaleString()}
                      </td>
                      <td className={`py-2 px-3 text-right text-sm font-medium ${
                        isOverBudget ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {isOverBudget ? '-' : ''}${Math.abs(variance).toLocaleString()}
                        {isOverBudget && ' (Over)'}
                      </td>
                      <td className="py-2 px-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span className={`text-sm font-medium ${
                            percentUsed > 100 ? 'text-red-600' : 
                            percentUsed > 80 ? 'text-yellow-600' : 'text-green-600'
                          }`}>
                            {percentUsed.toFixed(1)}%
                          </span>
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${
                                percentUsed > 100 ? 'bg-red-500' : 
                                percentUsed > 80 ? 'bg-yellow-500' : 'bg-green-500'
                              }`}
                              style={{ width: `${Math.min(percentUsed, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                <tr className="border-t-2 border-gray-300 font-semibold">
                  <td className="py-3 px-3 text-sm text-gray-900">Total</td>
                  <td className="py-3 px-3 text-right text-sm text-gray-900">
                    ${(totals.totalBudget || 0).toLocaleString()}
                  </td>
                  <td className="py-3 px-3 text-right text-sm text-gray-900">
                    ${totals.totalCosts.toLocaleString()}
                  </td>
                  <td className={`py-3 px-3 text-right text-sm font-bold ${
                    (totals.totalVariance || 0) < 0 ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {(totals.totalVariance || 0) < 0 ? '-' : ''}${Math.abs(totals.totalVariance || 0).toLocaleString()}
                    {(totals.totalVariance || 0) < 0 && ' (Over)'}
                  </td>
                  <td className="py-3 px-3 text-right text-sm font-bold text-gray-900">
                    {totals.totalBudget > 0 ? ((totals.totalCosts / totals.totalBudget) * 100).toFixed(1) : '0.0'}%
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          
          {/* Budget Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-200">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-blue-600 text-lg font-semibold">${(totals.totalBudget || 0).toLocaleString()}</div>
              <div className="text-gray-600 text-sm">Total Budget</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-gray-900 text-lg font-semibold">${totals.totalCosts.toLocaleString()}</div>
              <div className="text-gray-600 text-sm">Actual Costs</div>
            </div>
            <div className={`p-4 rounded-lg ${
              (totals.totalVariance || 0) < 0 ? 'bg-red-50' : 'bg-green-50'
            }`}>
              <div className={`text-lg font-semibold ${
                (totals.totalVariance || 0) < 0 ? 'text-red-600' : 'text-green-600'
              }`}>
                {(totals.totalVariance || 0) < 0 ? '-' : ''}${Math.abs(totals.totalVariance || 0).toLocaleString()}
              </div>
              <div className="text-gray-600 text-sm">
                {(totals.totalVariance || 0) < 0 ? 'Over Budget' : 'Under Budget'}
              </div>
            </div>
          </div>
        </div>
        {/* Budget vs Actual Report Section - ADD THIS */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">Budget vs Actual Report</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setShowBudgetReport(!showBudgetReport)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
              >
                <BarChart3 className="w-4 h-4" />
                {showBudgetReport ? 'Hide Report' : 'Show Report'}
              </button>
            </div>
          </div>
          
          {showBudgetReport && (
            <BudgetVsActualReport
              activeProject={activeProject}
              costData={costData}
              budgetData={budgetData}
              calculateTotals={calculateTotals}
              hasPermission={hasPermission}
              tenantDbService={tenantDbService}
              loading={loading}
            />
          )}
        </div>
      </div>
    );
  };

export default DashboardView; 