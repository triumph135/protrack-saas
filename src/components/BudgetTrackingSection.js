import React, { useState, useEffect } from 'react';

// Budget Tracking Section Component
const BudgetTrackingSection = ({ 
  category, 
  actualAmount, 
  budgetAmount, 
  variance, 
  onUpdateBudget, 
  canEdit,
  loading 
}) => {
  const [editing, setEditing] = useState(false);
  const [newBudget, setNewBudget] = useState(budgetAmount);
  
  useEffect(() => {
    setNewBudget(budgetAmount);
  }, [budgetAmount]);

  const handleSave = async () => {
    await onUpdateBudget(category, newBudget);
    setEditing(false);
  };

  const handleCancel = () => {
    setNewBudget(budgetAmount);
    setEditing(false);
  };

  const percentUsed = budgetAmount > 0 ? (actualAmount / budgetAmount) * 100 : 0;
  const isOverBudget = variance < 0;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          {category.replace(/([A-Z])/g, ' $1').trim()} Budget Tracking
        </h3>
        {canEdit && !editing && (
          <button
            onClick={() => setEditing(true)}
            className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
          >
            <Edit className="w-4 h-4" />
            Edit Budget
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
        {/* Budget Amount */}
        <div className="bg-blue-50 p-4 rounded-lg">
          {editing ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Budget</label>
              <input
                type="number"
                value={newBudget}
                onChange={(e) => setNewBudget(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          ) : (
            <>
              <div className="text-blue-600 text-xl font-bold">${budgetAmount.toLocaleString()}</div>
              <div className="text-gray-600 text-sm">Budgeted</div>
            </>
          )}
        </div>

        {/* Actual Amount */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="text-gray-900 text-xl font-bold">${actualAmount.toLocaleString()}</div>
          <div className="text-gray-600 text-sm">Actual</div>
        </div>

        {/* Variance */}
        <div className={`p-4 rounded-lg ${isOverBudget ? 'bg-red-50' : 'bg-green-50'}`}>
          <div className={`text-xl font-bold ${isOverBudget ? 'text-red-600' : 'text-green-600'}`}>
            {isOverBudget ? '-' : ''}${Math.abs(variance).toLocaleString()}
          </div>
          <div className="text-gray-600 text-sm">
            {isOverBudget ? 'Over Budget' : 'Under Budget'}
          </div>
        </div>

        {/* Percentage Used */}
        <div className="bg-purple-50 p-4 rounded-lg">
          <div className={`text-xl font-bold ${
            percentUsed > 100 ? 'text-red-600' : 
            percentUsed > 80 ? 'text-yellow-600' : 'text-purple-600'
          }`}>
            {percentUsed.toFixed(1)}%
          </div>
          <div className="text-gray-600 text-sm">Used</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-600">Budget Progress</span>
          <span className={`text-sm font-medium ${
            percentUsed > 100 ? 'text-red-600' : 
            percentUsed > 80 ? 'text-yellow-600' : 'text-green-600'
          }`}>
            ${actualAmount.toLocaleString()} / ${budgetAmount.toLocaleString()}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div 
            className={`h-3 rounded-full transition-all duration-300 ${
              percentUsed > 100 ? 'bg-red-500' : 
              percentUsed > 80 ? 'bg-yellow-500' : 'bg-green-500'
            }`}
            style={{ width: `${Math.min(percentUsed, 100)}%` }}
          ></div>
        </div>
      </div>

      {/* Edit Controls */}
      {editing && (
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {loading ? 'Saving...' : 'Save Budget'}
          </button>
          <button
            onClick={handleCancel}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
};

export default BudgetTrackingSection; 