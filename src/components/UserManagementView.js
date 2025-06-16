import React, { useState, useEffect } from 'react';
import { useAppState } from '@/components/providers/AppStateProvider';

// User management view with enhanced permissions system
const UserManagementView = () => {
  const {
    users,
    editingUser,
    setEditingUser,
    showUserModal,
    setShowUserModal,
    handleCreateUser,
    handleUpdateUser,
    handleDeleteUser,
    hasPermission,
    loading,
    // user, // get user from useAuth if needed
  } = useAppState();
  const [formUser, setFormUser] = useState({ 
    name: '', 
    role: '', 
    email: '', 
    permissions: {
      material: 'none',
      labor: 'none',
      equipment: 'none',
      subcontractor: 'none',
      others: 'none',
      capLeases: 'none',
      consumable: 'none',
      invoices: 'none',
      projects: 'none',
      users: 'none'
    }
  });

  useEffect(() => {
    if (editingUser) {
      setFormUser(editingUser);
    } else {
      setFormUser({ 
        name: '', 
        role: '', 
        email: '', 
        permissions: {
          material: 'none',
          labor: 'none',
          equipment: 'none',
          subcontractor: 'none',
          others: 'none',
          capLeases: 'none',
          consumable: 'none',
          invoices: 'none',
          projects: 'none',
          users: 'none'
        }
      });
    }
  }, [editingUser, showUserModal]);

  const handleSaveUser = async () => {
    try {
      if (editingUser) {
        await handleUpdateUser(editingUser.id, formUser);
      } else {
        await handleCreateUser(formUser);
      }
      setShowUserModal(false);
      setEditingUser(null);
      setFormUser({ 
        name: '', 
        role: '', 
        email: '', 
        permissions: {
          material: 'none',
          labor: 'none',
          equipment: 'none',
          subcontractor: 'none',
          others: 'none',
          capLeases: 'none',
          consumable: 'none',
          invoices: 'none',
          projects: 'none',
          users: 'none'
        }
      });
    } catch (error) {
      console.error('Error saving user:', error);
    }
  };

  const canManageUsers = hasPermission('users', 'write');

  if (!hasPermission('users', 'read')) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex items-center justify-center gap-2 text-gray-500">
          <Lock className="w-6 h-6" />
          <span>You don't have permission to view user management</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
        {canManageUsers && (
          <button
            onClick={() => setShowUserModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add User
          </button>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Permissions Summary</th>
              {canManageUsers && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((userItem) => (
              <tr key={userItem.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{userItem.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{userItem.email}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    userItem.role === 'master' ? 'bg-red-100 text-red-800' :
                    userItem.role === 'manager' ? 'bg-blue-100 text-blue-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {userItem.role}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {userItem.role === 'master' ? 'All Access' : (
                    <div className="flex gap-1 flex-wrap">
                      {Object.entries(userItem.permissions || {}).map(([perm, level]) => 
                        level !== 'none' && (
                          <span key={perm} className={`px-1 py-0.5 text-xs rounded ${
                            level === 'write' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {perm}({level})
                          </span>
                        )
                      )}
                    </div>
                  )}
                </td>
                {canManageUsers && (
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => {
                        setEditingUser(userItem);
                        setShowUserModal(true);
                      }}
                      className="text-blue-600 hover:text-blue-900 mr-4"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    {userItem.id !== user.id && (
                      <button
                        onClick={() => handleDeleteUser(userItem.id)}
                        disabled={loading}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* User Modal */}
      {showUserModal && canManageUsers && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">
              {editingUser ? 'Edit User' : 'Add New User'}
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    value={formUser.name}
                    onChange={(e) => setFormUser({...formUser, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={formUser.email}
                    onChange={(e) => setFormUser({...formUser, email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  value={formUser.role}
                  onChange={(e) => setFormUser({...formUser, role: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Role</option>
                  <option value="master">Master Admin</option>
                  <option value="manager">Project Manager</option>
                  <option value="entry">Data Entry</option>
                </select>
              </div>
              
              {formUser.role !== 'master' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Detailed Permissions</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {['material', 'labor', 'equipment', 'subcontractor', 'others', 'capLeases', 'consumable', 'invoices', 'projects', 'users'].map(area => (
                      <div key={area} className="border rounded-lg p-3">
                        <label className="block text-sm font-medium text-gray-700 mb-2 capitalize">
                          {area.replace(/([A-Z])/g, ' $1').trim()}
                        </label>
                        <select
                          value={formUser.permissions[area]}
                          onChange={(e) => setFormUser({
                            ...formUser, 
                            permissions: {
                              ...formUser.permissions,
                              [area]: e.target.value
                            }
                          })}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="none">No Access</option>
                          <option value="read">Read Only</option>
                          <option value="write">Read/Write</option>
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={handleSaveUser}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={() => {
                  setShowUserModal(false);
                  setEditingUser(null);
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagementView; 