import React, { useState } from 'react';
import { Plus, Edit, Trash2, Save, Lock, Download } from 'lucide-react';

// Customer Invoice Management View
const CustomerInvoiceView = ({ changeOrders = [], selectedChangeOrder, setSelectedChangeOrder }) => {
    const [showForm, setShowForm] = useState(false);
    const [editingInvoice, setEditingInvoice] = useState(null);
    const [newInvoice, setNewInvoice] = useState({
      invoice_number: '',
      amount: 0,
      date_billed: '',
      change_order_id: ''
    });

    // Use a new variable for filtered invoices
    const projectInvoicesRaw = customerInvoices.filter(inv => inv.project_id === activeProject?.id);
    let projectInvoices = projectInvoicesRaw;
    if (selectedChangeOrder !== 'all') {
      if (selectedChangeOrder === 'base') {
        projectInvoices = projectInvoicesRaw.filter(inv => !inv.change_order_id);
      } else {
        projectInvoices = projectInvoicesRaw.filter(inv => inv.change_order_id === selectedChangeOrder);
      }
    }
    const filteredInvoices = applyInvoiceFilters(projectInvoices);
    const totalBilled = filteredInvoices.reduce((sum, inv) => sum + inv.amount, 0);

    const handleSave = async () => {
      if (!activeProject) {
        alert('Please select a project first');
        return;
      }

      try {
        if (editingInvoice) {
          await handleUpdateInvoice(editingInvoice.id, editingInvoice);
        } else {
          await handleCreateInvoice(newInvoice);
        }
        setShowForm(false);
        setEditingInvoice(null);
        setNewInvoice({ invoice_number: '', amount: 0, date_billed: '', change_order_id: '' });
      } catch (error) {
        console.error('Error saving invoice:', error);
      }
    };

    const handleDelete = async (id) => {
      if (!window.confirm('Are you sure you want to delete this invoice?')) {
        return;
      }
      await handleDeleteInvoice(id);
    };

    // Check permissions
    const canRead = hasPermission('invoices', 'read');
    const canWrite = hasPermission('invoices', 'write');

    if (!canRead) {
      return (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center justify-center gap-2 text-gray-500">
            <Lock className="w-6 h-6" />
            <span>You don't have permission to view customer invoices</span>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Change Order Filter Dropdown - move to very top */}
        <div className="flex items-center gap-4 mb-6">
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
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">Customer Invoices</h2>
          <div className="flex gap-2">
            <div className="text-right">
              <div className="text-sm text-gray-600">
                Filtered Total: ${totalBilled.toLocaleString()}
                {filteredInvoices.length !== projectInvoices.length && (
                  <div className="text-xs text-gray-500">
                    ({filteredInvoices.length} of {projectInvoices.length} records)
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
                Add Invoice
              </button>
            )}
          </div>
        </div>

        {!activeProject && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-md">
            Please select a project to view and manage invoices.
          </div>
        )}

        {/* Filter Component */}
        <FilterComponent
          category="invoices"
          onExportFiltered={exportFilteredInvoices}
        />

        {showForm && canWrite && activeProject && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">
              {editingInvoice ? 'Edit Invoice' : 'Add New Invoice'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Number</label>
                <input
                  type="text"
                  value={editingInvoice ? editingInvoice.invoice_number : newInvoice.invoice_number}
                  onChange={(e) => editingInvoice 
                    ? setEditingInvoice({...editingInvoice, invoice_number: e.target.value})
                    : setNewInvoice({...newInvoice, invoice_number: e.target.value})
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                <input
                  type="number"
                  value={editingInvoice ? editingInvoice.amount : newInvoice.amount}
                  onChange={(e) => editingInvoice 
                    ? setEditingInvoice({...editingInvoice, amount: parseFloat(e.target.value) || 0})
                    : setNewInvoice({...newInvoice, amount: parseFloat(e.target.value) || 0})
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date Billed</label>
                <input
                  type="date"
                  value={editingInvoice ? editingInvoice.date_billed : newInvoice.date_billed}
                  onChange={(e) => editingInvoice 
                    ? setEditingInvoice({...editingInvoice, date_billed: e.target.value})
                    : setNewInvoice({...newInvoice, date_billed: e.target.value})
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            {/* Change Order Dropdown */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Change Order</label>
              <select
                value={editingInvoice ? editingInvoice.change_order_id || '' : newInvoice.change_order_id || ''}
                onChange={e => editingInvoice
                  ? setEditingInvoice({ ...editingInvoice, change_order_id: e.target.value || null })
                  : setNewInvoice({ ...newInvoice, change_order_id: e.target.value || null })
                }
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
              {editingInvoice ? (
                <FileAttachments
                  entityType="invoice"
                  entityId={editingInvoice.id}
                  tenantId={tenant?.id}
                  userId={user?.id}
                  canEdit={canWrite}
                />
              ) : (
                <div className="text-center py-4 text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <p className="text-sm">💡 Save this invoice first, then edit it to add file attachments</p>
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-4">
              <button
                onClick={handleSave}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {loading ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingInvoice(null);
                  setNewInvoice({ invoice_number: '', amount: 0, date_billed: '', change_order_id: '' });
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice Number</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Billed</th>
                  {canWrite && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredInvoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{invoice.invoice_number}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${invoice.amount.toLocaleString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{invoice.date_billed}</td>
                    {canWrite && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => {
                            setEditingInvoice(invoice);
                            setShowForm(true);
                          }}
                          className="text-blue-600 hover:text-blue-900 mr-4"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(invoice.id)}
                          disabled={loading}
                          className="text-red-600 hover:text-red-900"
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
          {filteredInvoices.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              {projectInvoices.length === 0 ? 'No invoices found' : 'No invoices match the current filters'}
            </div>
          )}
        </div>
      </div>
    );
  }; 

export default CustomerInvoiceView; 