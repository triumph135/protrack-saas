import React, { useState } from 'react';

const ChangeOrdersSection = ({ project, changeOrders, onAdd, onEdit, onDelete }) => {
  const [showList, setShowList] = useState(false);

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-semibold text-gray-800">Change Orders</h4>
        <div className="flex gap-2">
          <button
            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
            onClick={() => onAdd(project)}
          >
            Add Change Order
          </button>
          <button
            className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
            onClick={() => setShowList((v) => !v)}
          >
            {showList ? 'Hide' : 'Show'}
          </button>
        </div>
      </div>
      {showList && (
        <table className="min-w-full divide-y divide-gray-200 mt-2">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Value</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {changeOrders.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-2 text-gray-500">No change orders</td></tr>
            )}
            {changeOrders.map((co) => (
              <tr key={co.id}>
                <td className="px-4 py-2">{co.name}</td>
                <td className="px-4 py-2">${co.additional_contract_value?.toLocaleString()}</td>
                <td className="px-4 py-2">{co.description}</td>
                <td className="px-4 py-2 text-right">
                  <button
                    className="text-blue-600 hover:text-blue-900 text-sm mr-2"
                    onClick={() => onEdit(project, co)}
                  >
                    Edit
                  </button>
                  <button
                    className="text-red-600 hover:text-red-900 text-sm"
                    onClick={() => onDelete(project, co)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default ChangeOrdersSection; 