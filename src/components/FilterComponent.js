import React, { useState, useEffect } from 'react';

// Filter Component with debounced input
const FilterComponent = ({ 
  category, 
  onFilterChange, 
  onClearFilters, 
  onExportFiltered,
  filters,
  updateFilter,
  clearFilters 
}) => {
  const categoryFilters = filters[category] || {};
  const [showFilters, setShowFilters] = useState(false);
  const [localFilters, setLocalFilters] = useState(categoryFilters);
  const [debounceTimer, setDebounceTimer] = useState(null);

  // Update local filters when category filters change from outside
  useEffect(() => {
    setLocalFilters(categoryFilters);
  }, [categoryFilters]);

  // Debounced filter update
  useEffect(() => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    const timer = setTimeout(() => {
      // Only update if there are actual changes
      const hasChanges = Object.keys(localFilters).some(
        key => localFilters[key] !== categoryFilters[key]
      );
      
      if (hasChanges) {
        Object.keys(localFilters).forEach(key => {
          if (localFilters[key] !== categoryFilters[key]) {
            updateFilter(category, key, localFilters[key]);
          }
        });
        if (onFilterChange) onFilterChange();
      }
    }, 500); // 500ms delay after user stops typing

    setDebounceTimer(timer);

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [localFilters]);

  const handleLocalFilterChange = (field, value) => {
    setLocalFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleImmediateFilterChange = (field, value) => {
    // For dropdowns and checkboxes, update immediately
    updateFilter(category, field, value);
    setLocalFilters(prev => ({
      ...prev,
      [field]: value
    }));
    if (onFilterChange) onFilterChange();
  };

  const getFilterFields = () => {
    switch (category) {
      case 'material':
      case 'others':
      case 'capLeases':
      case 'consumable':
      case 'equipment':
        return [
          { name: 'startDate', label: 'Start Date', type: 'date' },
          { name: 'endDate', label: 'End Date', type: 'date' },
          { name: 'vendor', label: 'Vendor Contains', type: 'text' },
          { name: 'minCost', label: 'Min Cost', type: 'number' },
          { name: 'maxCost', label: 'Max Cost', type: 'number' },
          { name: 'in_system', label: 'In System Status', type: 'select', options: [
            { value: 'all', label: 'All' },
            { value: 'true', label: 'In System' },
            { value: 'false', label: 'Pending' }
          ]}
        ];
      case 'labor':
        return [
          { name: 'startDate', label: 'Start Date', type: 'date' },
          { name: 'endDate', label: 'End Date', type: 'date' },
          { name: 'employeeName', label: 'Employee Name Contains', type: 'text' },
          { name: 'minHours', label: 'Min Total Hours', type: 'number' },
          { name: 'maxHours', label: 'Max Total Hours', type: 'number' }
        ];
      case 'subcontractor':
        return [
          { name: 'startDate', label: 'Start Date', type: 'date' },
          { name: 'endDate', label: 'End Date', type: 'date' },
          { name: 'subcontractorName', label: 'Subcontractor Contains', type: 'text' },
          { name: 'vendor', label: 'Vendor Contains', type: 'text' },
          { name: 'minCost', label: 'Min Cost', type: 'number' },
          { name: 'maxCost', label: 'Max Cost', type: 'number' },
          { name: 'in_system', label: 'In System Status', type: 'select', options: [
            { value: 'all', label: 'All' },
            { value: 'true', label: 'In System' },
            { value: 'false', label: 'Pending' }
          ]}
        ];
      case 'invoices':
        return [
          { name: 'startDate', label: 'Start Date', type: 'date' },
          { name: 'endDate', label: 'End Date', type: 'date' },
          { name: 'invoice_number', label: 'Invoice Number Contains', type: 'text' },
          { name: 'minAmount', label: 'Min Amount', type: 'number' },
          { name: 'maxAmount', label: 'Max Amount', type: 'number' }
        ];
      default:
        return [];
    }
  };

  // Count active filters from the actual filters state
  const activeFilterCount = Object.values(categoryFilters).filter(value => 
    value && value !== '' && value !== 'all'
  ).length;

  return (
    <div className="bg-white p-4 rounded-lg shadow-md border">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
          >
            <Filter className="w-4 h-4" />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                {activeFilterCount}
              </span>
            )}
          </button>
          {activeFilterCount > 0 && (
            <button
              onClick={() => {
                clearFilters(category);
                setLocalFilters(category === 'invoices' 
                  ? { startDate: '', endDate: '', invoice_number: '', minAmount: '', maxAmount: '' }
                  : category === 'labor' 
                    ? { startDate: '', endDate: '', employeeName: '', minHours: '', maxHours: '' }
                    : { startDate: '', endDate: '', vendor: '', minCost: '', maxCost: '', in_system: 'all', ...(category === 'subcontractor' && { subcontractorName: '' }) }
                );
                if (onClearFilters) onClearFilters();
              }}
              className="text-sm text-red-600 hover:text-red-800"
            >
              Clear All
            </button>
          )}
        </div>
        
        <div className="flex gap-2">
          {activeFilterCount > 0 && (
            <button
              onClick={onExportFiltered}
              className="px-3 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 flex items-center gap-2 text-sm"
            >
              <Download className="w-4 h-4" />
              Export Filtered
            </button>
          )}
          <button
            onClick={() => category === 'invoices' ? exportFilteredInvoices() : exportCategoryToExcel(category, false)}
            className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2 text-sm"
          >
            <Download className="w-4 h-4" />
            Export All
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {getFilterFields().map(field => (
              <div key={field.name}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {field.label}
                </label>
                {field.type === 'select' ? (
                  <select
                    value={localFilters[field.name] || 'all'}
                    onChange={(e) => handleImmediateFilterChange(field.name, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    {field.options.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : field.type === 'date' ? (
                  <input
                    type="date"
                    value={localFilters[field.name] || ''}
                    onChange={(e) => handleImmediateFilterChange(field.name, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                ) : (
                  <input
                    type={field.type}
                    value={localFilters[field.name] || ''}
                    onChange={(e) => handleLocalFilterChange(field.name, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder={field.type === 'number' ? '0' : field.type === 'text' ? 'Type to search...' : ''}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FilterComponent; 