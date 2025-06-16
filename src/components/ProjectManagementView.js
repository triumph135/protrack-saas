import React, { useState, useEffect, useMemo, useRef } from 'react';

// Project management view with status management
const ProjectManagementView = () => {
  const [newProject, setNewProject] = useState({
    jobNumber: '',
    jobName: '',
    customer: '',
    fieldShopBoth: 'Both',
    totalContractValue: '', // string
    status: 'Active'
  });
  
  const [allProjects, setAllProjects] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all'); // all, Active, Inactive, etc.
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [employeeModalProject, setEmployeeModalProject] = useState(null);

  // Add loading state for change orders
  const [changeOrdersLoading, setChangeOrdersLoading] = useState(false);
  const [changeOrdersByProject, setChangeOrdersByProject] = useState({});
  const [showChangeOrderModal, setShowChangeOrderModal] = useState(false);
  const [changeOrderModalProject, setChangeOrderModalProject] = useState(null);
  const [editingChangeOrder, setEditingChangeOrder] = useState(null);
  const [changeOrderForm, setChangeOrderForm] = useState({ name: '', additional_contract_value: '', description: '' });
  const [changeOrderError, setChangeOrderError] = useState('');
  const [changeOrderLoading, setChangeOrderLoading] = useState(false);

  // Add ref to track previous project IDs
  const prevProjectIdsRef = useRef([]);

  // Load all projects (including inactive) for management view
  useEffect(() => {
    const loadAllProjects = async () => {
      if (hasPermission('projects', 'read')) {
        try {
          const allProjectsData = await tenantDbService.projects.getAllWithStatus();
          setAllProjects(allProjectsData);
        } catch (error) {
          console.error('Error loading all projects:', error);
        }
      }
    };
    
    loadAllProjects();
  }, []);

  const canRead = hasPermission('projects', 'read');
  const canWrite = hasPermission('projects', 'write');

  const handleSaveProject = async () => {
    try {
      if (editingProject) {
        const updatedProject = await tenantDbService.projects.update(editingProject.id, {
          ...editingProject,
          totalContractValue: parseFloat(editingProject.totalContractValue) || 0
        });
        setAllProjects(allProjects.map(p => p.id === editingProject.id ? updatedProject : p));
        // Also update the main projects list if it's active
        if (updatedProject.status === 'Active') {
          const activeProjects = await tenantDbService.projects.getAll(false);
          setProjects(activeProjects);
        } else {
          setProjects(projects.filter(p => p.id !== editingProject.id));
          if (activeProject?.id === editingProject.id) {
            const activeProjects = await tenantDbService.projects.getAll(false);
            setActiveProject(activeProjects[0] || null);
          }
        }
        // If the edited project is the active project, update it and reload project data
        if (activeProject?.id === updatedProject.id) {
          setActiveProject(updatedProject);
          loadProjectData(updatedProject.id);
        }
      } else {
        const newProjectData = await tenantDbService.projects.create({
          ...newProject,
          totalContractValue: parseFloat(newProject.totalContractValue) || 0
        });
        setAllProjects([newProjectData, ...allProjects]);
        if (newProjectData.status === 'Active') {
          setProjects([newProjectData, ...projects]);
          if (!activeProject) {
            setActiveProject(newProjectData);
          }
        }
      }
      setShowProjectModal(false);
      setEditingProject(null);
      setNewProject({
        jobNumber: '',
        jobName: '',
        customer: '',
        fieldShopBoth: 'Both',
        totalContractValue: '',
        status: 'Active'
      });
    } catch (error) {
      console.error('Error saving project:', error);
      alert('Error saving project: ' + error.message);
    }
  };

  const handleStatusChange = async (projectId, newStatus) => {
    try {
      setLoading(true);
      const updatedProject = await tenantDbService.projects.updateStatus(projectId, newStatus);
      setAllProjects(allProjects.map(p => p.id === projectId ? updatedProject : p));
      
      // Update main projects list
      const activeProjects = await tenantDbService.projects.getAll(false);
      setProjects(activeProjects);
      
      // If current active project was deactivated, switch to another active project
      if (activeProject?.id === projectId && newStatus !== 'Active') {
        setActiveProject(activeProjects[0] || null);
      }
    } catch (error) {
      console.error('Error updating project status:', error);
      alert('Error updating project status: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Filter projects based on status filter
  const filteredProjects = useMemo(() => {
    return allProjects.filter(project => {
      if (statusFilter === 'all') return true;
      return project.status === statusFilter;
    });
  }, [allProjects, statusFilter]);

  // Fetch change orders for all visible projects - optimized version
  useEffect(() => {
    const fetchChangeOrdersForProjects = async () => {
      // Get current project IDs
      const currentProjectIds = filteredProjects.map(p => p.id).sort();
      
      // Skip if project IDs haven't changed
      if (JSON.stringify(currentProjectIds) === JSON.stringify(prevProjectIdsRef.current)) {
        return;
      }
      
      setChangeOrdersLoading(true);
      try {
        const newChangeOrdersByProject = {};
        for (const project of filteredProjects) {
          try {
            const changeOrders = await tenantDbService.changeOrders.getAllByProject(project.id);
            newChangeOrdersByProject[project.id] = changeOrders;
          } catch (error) {
            newChangeOrdersByProject[project.id] = [];
          }
        }
        
        // Only update state if data actually changed
        setChangeOrdersByProject(prev => {
          const prevKeys = Object.keys(prev);
          const newKeys = Object.keys(newChangeOrdersByProject);
          
          if (prevKeys.length === newKeys.length &&
              prevKeys.every((k, i) => k === newKeys[i]) &&
              prevKeys.every(k => JSON.stringify(prev[k]) === JSON.stringify(newChangeOrdersByProject[k]))) {
            return prev;
          }
          return newChangeOrdersByProject;
        });
        
        // Update ref with current project IDs
        prevProjectIdsRef.current = currentProjectIds;
      } catch (error) {
        console.error('Error fetching change orders:', error);
      } finally {
        setChangeOrdersLoading(false);
      }
    };

    if (filteredProjects.length > 0) {
      fetchChangeOrdersForProjects();
    }
  }, [filteredProjects]);

  // Open modal to add or edit change order
  const handleOpenChangeOrderModal = (project, changeOrder = null) => {
    setChangeOrderModalProject(project);
    setEditingChangeOrder(changeOrder);
    setChangeOrderForm(changeOrder ? {
      name: changeOrder.name,
      additional_contract_value: changeOrder.additional_contract_value,
      description: changeOrder.description || ''
    } : { name: '', additional_contract_value: '', description: '' });
    setShowChangeOrderModal(true);
  };

  const handleCloseChangeOrderModal = () => {
    setShowChangeOrderModal(false);
    setChangeOrderModalProject(null);
    setEditingChangeOrder(null);
    setChangeOrderForm({ name: '', additional_contract_value: '', description: '' });
    setChangeOrderError('');
  };

  const handleChangeOrderFormChange = (e) => {
    setChangeOrderForm({ ...changeOrderForm, [e.target.name]: e.target.value });
  };

  // Fetch change orders for a project
  const fetchChangeOrdersForProject = async (projectId) => {
    try {
      const data = await tenantDbService.changeOrders.getAllByProject(projectId);
      setChangeOrdersByProject(prev => ({ ...prev, [projectId]: data }));
    } catch (err) {
      setChangeOrdersByProject(prev => ({ ...prev, [projectId]: [] }));
    }
  };

  const handleSaveChangeOrder = async () => {
    if (!changeOrderModalProject) return;
    setChangeOrderLoading(true);
    setChangeOrderError('');
    try {
      if (editingChangeOrder) {
        await tenantDbService.changeOrders.update(editingChangeOrder.id, {
          name: changeOrderForm.name,
          additional_contract_value: parseFloat(changeOrderForm.additional_contract_value) || 0,
          description: changeOrderForm.description
        });
      } else {
        await tenantDbService.changeOrders.create(changeOrderModalProject.id, {
          name: changeOrderForm.name,
          additional_contract_value: parseFloat(changeOrderForm.additional_contract_value) || 0,
          description: changeOrderForm.description
        });
      }
      await fetchChangeOrdersForProject(changeOrderModalProject.id);
      handleCloseChangeOrderModal();
    } catch (err) {
      setChangeOrderError('Failed to save change order');
    } finally {
      setChangeOrderLoading(false);
    }
  };

  const handleDeleteChangeOrder = async (project, changeOrder) => {
    if (!window.confirm('Delete this change order?')) return;
    try {
      await tenantDbService.changeOrders.delete(changeOrder.id);
      await fetchChangeOrdersForProject(project.id);
    } catch (err) {}
  };

  if (!canRead) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex items-center justify-center gap-2 text-gray-500">
          <Lock className="w-6 h-6" />
          <span>You don't have permission to view project management</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Project Management</h2>
        <div className="flex gap-4">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Projects</option>
            <option value="Active">Active Only</option>
            <option value="Inactive">Inactive Only</option>
            <option value="Completed">Completed</option>
            <option value="On Hold">On Hold</option>
          </select>
          
          {canWrite && (
            <button
              onClick={() => setShowProjectModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              New Project
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {changeOrdersLoading ? (
          <div className="p-4 text-center text-gray-500">
            Loading change orders...
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Job Number</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Project Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contract Value</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employees</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredProjects.map((project) => (
                <React.Fragment key={project.id}>
                  <tr className={`hover:bg-gray-50 ${activeProject?.id === project.id ? 'bg-blue-50' : ''}`}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{project.jobNumber}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{project.jobName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{project.customer}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${project.totalContractValue?.toLocaleString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={project.status}
                        onChange={(e) => handleStatusChange(project.id, e.target.value)}
                        disabled={!canWrite}
                        className={`px-2 py-1 text-xs rounded-full border-0 focus:ring-2 focus:ring-blue-500 ${
                          project.status === 'Active' ? 'bg-green-100 text-green-800' :
                          project.status === 'Completed' ? 'bg-blue-100 text-blue-800' :
                          project.status === 'Inactive' ? 'bg-gray-100 text-gray-800' :
                          'bg-yellow-100 text-yellow-800'
                        } ${!canWrite ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                        <option value="Completed">Completed</option>
                        <option value="On Hold">On Hold</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => setActiveProject(project)}
                        className="text-green-600 hover:text-green-900 mr-4"
                        title="View Project"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {canWrite && (
                        <>
                          <button
                            onClick={() => {
                              setEditingProject(project);
                              setShowProjectModal(true);
                            }}
                            className="text-blue-600 hover:text-blue-900 mr-4"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm('Are you sure you want to delete this project? This will also delete all associated data.')) {
                                handleDeleteProject(project.id);
                                setAllProjects(allProjects.filter(p => p.id !== project.id));
                              }
                            }}
                            disabled={loading}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => { setEmployeeModalProject(project); setShowEmployeeModal(true); }}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        Edit Employees
                      </button>
                    </td>
                  </tr>
                  {/* Change Orders Section for this project */}
                  <tr>
                    <td colSpan={7} className="bg-gray-50">
                      <ChangeOrdersSection
                        project={project}
                        changeOrders={changeOrdersByProject[project.id] || []}
                        onAdd={handleOpenChangeOrderModal}
                        onEdit={handleOpenChangeOrderModal}
                        onDelete={handleDeleteChangeOrder}
                        loading={changeOrdersLoading}
                      />
                    </td>
                  </tr>
                </React.Fragment>
              ))}
            </tbody>
          </table>
        )}
        
        {filteredProjects.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            {statusFilter === 'all' ? 'No projects found' : `No ${statusFilter.toLowerCase()} projects found`}
          </div>
        )}
      </div>

      {/* Project Modal - Update the form to include status */}
      {showProjectModal && canWrite && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              {editingProject ? 'Edit Project' : 'New Project'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Job Number</label>
                <input
                  type="text"
                  value={editingProject ? editingProject.jobNumber : newProject.jobNumber}
                  onChange={(e) => editingProject 
                    ? setEditingProject({...editingProject, jobNumber: e.target.value})
                    : setNewProject({...newProject, jobNumber: e.target.value})
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Project Name</label>
                <input
                  type="text"
                  value={editingProject ? editingProject.jobName : newProject.jobName}
                  onChange={(e) => editingProject 
                    ? setEditingProject({...editingProject, jobName: e.target.value})
                    : setNewProject({...newProject, jobName: e.target.value})
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
                <input
                  type="text"
                  value={editingProject ? editingProject.customer : newProject.customer}
                  onChange={(e) => editingProject 
                    ? setEditingProject({...editingProject, customer: e.target.value})
                    : setNewProject({...newProject, customer: e.target.value})
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Field/Shop/Both</label>
                <select
                  value={editingProject ? editingProject.fieldShopBoth : newProject.fieldShopBoth}
                  onChange={(e) => editingProject 
                    ? setEditingProject({...editingProject, fieldShopBoth: e.target.value})
                    : setNewProject({...newProject, fieldShopBoth: e.target.value})
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Field">Field</option>
                  <option value="Shop">Shop</option>
                  <option value="Both">Both</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Total Contract Value</label>
                <input
                  type="number"
                  value={editingProject ? editingProject.totalContractValue?.toString() : newProject.totalContractValue}
                  onChange={(e) => editingProject 
                    ? setEditingProject({...editingProject, totalContractValue: e.target.value})
                    : setNewProject({...newProject, totalContractValue: e.target.value})
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={editingProject ? editingProject.status : newProject.status}
                  onChange={(e) => editingProject 
                    ? setEditingProject({...editingProject, status: e.target.value})
                    : setNewProject({...newProject, status: e.target.value})
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Completed">Completed</option>
                  <option value="On Hold">On Hold</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={handleSaveProject}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={() => {
                  setShowProjectModal(false);
                  setEditingProject(null);
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Change Orders Section */}
      {showEmployeeModal && employeeModalProject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-2xl relative">
            <button
              onClick={() => { setShowEmployeeModal(false); setEmployeeModalProject(null); }}
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 text-2xl"
              title="Close"
            >
              &times;
            </button>
            <EmployeeManagement tenantId={tenant?.id} projectId={employeeModalProject?.id} />
          </div>
        </div>
      )}
      {showChangeOrderModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              {editingChangeOrder ? 'Edit Change Order' : 'Add Change Order'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  name="name"
                  value={changeOrderForm.name}
                  onChange={handleChangeOrderFormChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Value</label>
                <input
                  type="number"
                  name="additional_contract_value"
                  value={changeOrderForm.additional_contract_value}
                  onChange={handleChangeOrderFormChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                  step="0.01"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input
                  type="text"
                  name="description"
                  value={changeOrderForm.description}
                  onChange={handleChangeOrderFormChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {changeOrderError && <div className="text-red-600">{changeOrderError}</div>}
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={handleSaveChangeOrder}
                disabled={changeOrderLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {changeOrderLoading ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={handleCloseChangeOrderModal}
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

export default ProjectManagementView; 