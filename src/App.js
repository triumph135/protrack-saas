// Project Tracking Application
// A React application for tracking project costs, invoices, and user management
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Plus, Edit, Trash2, Save, X, BarChart3, DollarSign, 
  Building, Calendar, Wrench, User, FileText, Settings, 
  Download, Filter, Eye, Lock, LogOut 
} from 'lucide-react';
import { useAuth } from './hooks/useAuth'; 
import LoginPage from './components/LoginPage'; 
import { TenantProvider, useTenant } from './contexts/TenantContext';
import { useTenantAuth } from './hooks/useTenantAuth';
import { tenantDbService } from './lib/tenantDbService';
import TenantRegistration from './components/TenantRegistration';
import Logo from './components/Logo';
import FileAttachments from './components/FileAttachments';
import BudgetVsActualReport from './components/BudgetVsActualReport';
import EmployeeManagement from './components/EmployeeManagement';
import { dbService, supabase } from './lib/supabase';
import ChangeOrdersSection from './components/ChangeOrdersSection';
import DashboardView from './components/DashboardView';
import CostCategoryView from './components/CostCategoryView';
import CostEntryForm from './components/CostEntryForm';
import FilterComponent from './components/FilterComponent';
import BudgetTrackingSection from './components/BudgetTrackingSection';
import UserManagementView from './components/UserManagementView';
import ProjectManagementView from './components/ProjectManagementView';
import CustomerInvoiceView from './components/CustomerInvoiceView';

// Utility to map cost form data to DB fields
function mapCostFormDataToDb(category, formData) {
  if (category === 'labor') {
    return {
      employee_id: formData.employee_id || null,
      employeeName: formData.employeeName || '',
      date: formData.date,
      stHours: formData.stHours || 0,
      stRate: formData.stRate || 0,
      otHours: formData.otHours || 0,
      otRate: formData.otRate || 0,
      dtHours: formData.dtHours || 0,
      dtRate: formData.dtRate || 0,
      perDiem: formData.perDiem || 0,
      mobQty: formData.mobQty || 0,
      mobRate: formData.mobRate || 0
    };
  } else if (["equipment", "subcontractor"].includes(category)) {
    return {
      subcontractorName: formData.subcontractorName,
      date: formData.date,
      vendor: formData.vendor,
      invoiceNumber: formData.invoice_number,
      cost: formData.cost,
      inSystem: formData.in_system || false
    };
  } else {
    // material, others, capLeases, consumable
    return {
      date: formData.date,
      vendor: formData.vendor,
      invoiceNumber: formData.invoice_number,
      cost: formData.cost,
      inSystem: formData.in_system || false,
      description: formData.description || undefined
    };
  }
}

const ProjectTrackingApp = () => {
  // All useState hooks at the top
  const { user, loading: authLoading, signIn, signUp, signOut } = useAuth();
  const { tenant } = useTenant();
  const [projects, setProjects] = useState([]);
  const [activeProject, setActiveProject] = useState(null);
  const [customerInvoices, setCustomerInvoices] = useState([]);
  const [users, setUsers] = useState([]);
  const [currentView, setCurrentView] = useState(() => {
    return localStorage.getItem('protrack_currentView') || 'dashboard';
  });
  const [showUserModal, setShowUserModal] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editingProject, setEditingProject] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showBudgetReport, setShowBudgetReport] = useState(false);
  const [selectedChangeOrder, setSelectedChangeOrder] = useState('all');
  const [costData, setCostData] = useState({
    material: [], labor: [], equipment: [], subcontractor: [], others: [], capLeases: [], consumable: []
  });
  const [budgetData, setBudgetData] = useState({
    material_budget: 0, labor_budget: 0, equipment_budget: 0, subcontractor_budget: 0, others_budget: 0, cap_leases_budget: 0, consumable_budget: 0
  });
  const [filters, setFilters] = useState({
    material: { startDate: '', endDate: '', vendor: '', minCost: '', maxCost: '', in_system: 'all' },
    labor: { startDate: '', endDate: '', employeeName: '', minHours: '', maxHours: '' },
    equipment: { startDate: '', endDate: '', vendor: '', minCost: '', maxCost: '', in_system: 'all' },
    subcontractor: { startDate: '', endDate: '', subcontractorName: '', vendor: '', minCost: '', maxCost: '', in_system: 'all' },
    others: { startDate: '', endDate: '', vendor: '', minCost: '', maxCost: '', in_system: 'all' },
    capLeases: { startDate: '', endDate: '', vendor: '', minCost: '', maxCost: '', in_system: 'all' },
    consumable: { startDate: '', endDate: '', vendor: '', minCost: '', maxCost: '', in_system: 'all' },
    invoices: { startDate: '', endDate: '', invoice_number: '', minAmount: '', maxAmount: '' }
  });
  const [allEmployees, setAllEmployees] = useState([]);
  const [changeOrdersByProject, setChangeOrdersByProject] = useState({});
  const [showChangeOrderModal, setShowChangeOrderModal] = useState(false);
  const [changeOrderModalProject, setChangeOrderModalProject] = useState(null);
  const [editingChangeOrder, setEditingChangeOrder] = useState(null);
  const [changeOrderForm, setChangeOrderForm] = useState({ name: '', additional_contract_value: '', description: '' });
  const [changeOrderLoading, setChangeOrderLoading] = useState(false);
  const [changeOrderError, setChangeOrderError] = useState('');
  const [changeOrdersLoading, setChangeOrdersLoading] = useState(false);
  const prevProjectIdsRef = useRef([]);
  const prevUserRef = useRef();
  const prevTenantRef = useRef();

  // All useEffect hooks at the top, no duplicates
  useEffect(() => {
    // Only set to dashboard if user/tenant just became available (i.e., login event)
    if (
      user && tenant &&
      (!prevUserRef.current || !prevTenantRef.current)
    ) {
      setCurrentView('dashboard');
    }
    prevUserRef.current = user;
    prevTenantRef.current = tenant;
  }, [user, tenant]);

  useEffect(() => {
    if (currentView) {
      localStorage.setItem('protrack_currentView', currentView);
    }
  }, [currentView]);

  useEffect(() => {
    if (user && tenant) {
      loadInitialData();
    }
  }, [user, tenant]);

  useEffect(() => {
    if (activeProject) {
      loadProjectData(activeProject.id);
    }
  }, [activeProject]);

  useEffect(() => {
    if (tenant?.id) {
      tenantDbService.setTenant(tenant.id);
    }
  }, [tenant]);

  useEffect(() => {
    if (activeProject && tenant) {
      const fetchChangeOrders = async () => {
        try {
          const data = await tenantDbService.changeOrders.getAllByProject(activeProject.id);
          setChangeOrdersByProject(prev => ({ ...prev, [activeProject.id]: data }));
        } catch (err) {
          setChangeOrdersByProject(prev => ({ ...prev, [activeProject.id]: [] }));
        }
      };
      fetchChangeOrders();
    }
  }, [activeProject, tenant]);

  // Load initial data (updated for project status)
  const loadInitialData = async () => {
    setLoading(true);
    try {
      // Load only active projects for the dropdown
      const projectsData = await tenantDbService.projects.getAll(false); // false = only active
      setProjects(projectsData);
      
      if (projectsData.length > 0 && !activeProject) {
        setActiveProject(projectsData[0]);
      }

      // Load users if user has permission
      if (hasPermission('users', 'read')) {
        const usersData = await tenantDbService.users.getAll();
        setUsers(usersData);
      }
    } catch (error) {
      console.error('Error loading initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load project-specific data
  const loadProjectData = async (projectId) => {
    try {
      // Load invoices
      const invoicesData = await tenantDbService.invoices.getByProject(projectId);
      setCustomerInvoices(invoicesData);

      // Load cost data for each category
      const costCategories = ['material', 'labor', 'equipment', 'subcontractor', 'others', 'capLeases', 'consumable'];
      const newCostData = {};

      for (const category of costCategories) {
        if (hasPermission(category, 'read')) {
          newCostData[category] = await tenantDbService.costs.getByProject(category, projectId);
        } else {
          newCostData[category] = [];
        }
      }

      setCostData(newCostData);

      // Load budget data
      try {
        const projectBudget = await tenantDbService.budgets.getByProject(projectId);
        setBudgetData(projectBudget);
      } catch (error) {
        console.error('Error loading budget data:', error);
        // Set default budget if loading fails
        setBudgetData({
          material_budget: 0,
          labor_budget: 0,
          equipment_budget: 0,
          subcontractor_budget: 0,
          others_budget: 0,
          cap_leases_budget: 0,
          consumable_budget: 0
        });
      }

    } catch (error) {
      console.error('Error loading project data:', error);
    }
  };

  // Show login page if not authenticated
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading ProTrack...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage onSignIn={signIn} onSignUp={signUp} loading={authLoading} />;
  }

  // Enhanced permission checking
  const hasPermission = (area, level = 'read') => {
    if (!user) return false;
    if (user.role === 'master') return true;
    
    const userPermission = user.permissions[area];
    if (!userPermission || userPermission === 'none') return false;
    
    if (level === 'read') return ['read', 'write'].includes(userPermission);
    if (level === 'write') return userPermission === 'write';
    
    return false;
  };

  // Get permission level for display
  const getPermissionLevel = (area) => {
    if (!user) return 'none';
    return user.permissions[area] || 'none';
  };

  // Database operations for projects
  const handleCreateProject = async (projectData) => {
    try {
      setLoading(true);
      const newProject = await tenantDbService.projects.create(projectData);
      setProjects([...projects, newProject]);
      setActiveProject(newProject);
      setShowProjectModal(false);
      setEditingProject(null);
    } catch (error) {
      console.error('Error creating project:', error);
      alert('Error creating project: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProject = async (id, updates) => {
    try {
      setLoading(true);
      const updatedProject = await tenantDbService.projects.update(id, updates);
      setProjects(projects.map(p => p.id === id ? updatedProject : p));
      if (activeProject?.id === id) {
        setActiveProject(updatedProject);
      }
      setShowProjectModal(false);
      setEditingProject(null);
    } catch (error) {
      console.error('Error updating project:', error);
      alert('Error updating project: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProject = async (id) => {
    if (!window.confirm('Are you sure you want to delete this project? This will also delete all associated data.')) {
      return;
    }
    
    try {
      setLoading(true);
      await tenantDbService.projects.delete(id);
      const remainingProjects = projects.filter(p => p.id !== id);
      setProjects(remainingProjects);
      
      if (activeProject?.id === id) {
        setActiveProject(remainingProjects[0] || null);
      }
    } catch (error) {
      console.error('Error deleting project:', error);
      alert('Error deleting project: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Database operations for users
  const handleCreateUser = async (userData) => {
    try {
      setLoading(true);
      const newUser = await tenantDbService.users.create(userData);
      setUsers([...users, newUser]);
      setShowUserModal(false);
    } catch (error) {
      console.error('Error creating user:', error);
      alert('Error creating user: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUser = async (id, updates) => {
    try {
      setLoading(true);
      const updatedUser = await tenantDbService.users.update(id, updates);
      setUsers(users.map(u => u.id === id ? updatedUser : u));
      setShowUserModal(false);
      setEditingUser(null);
    } catch (error) {
      console.error('Error updating user:', error);
      alert('Error updating user: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (id) => {
    if (!window.confirm('Are you sure you want to delete this user?')) {
      return;
    }
    
    try {
      setLoading(true);
      await tenantDbService.users.delete(id);
      setUsers(users.filter(u => u.id !== id));
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Error deleting user: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Database operations for invoices
  const handleCreateInvoice = async (invoiceData) => {
    try {
      setLoading(true);
      const newInvoice = await tenantDbService.invoices.create({
        ...invoiceData,
        project_id: activeProject.id
      });
      setCustomerInvoices([...customerInvoices, newInvoice]);
    } catch (error) {
      console.error('Error creating invoice:', error);
      alert('Error creating invoice: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateInvoice = async (id, updates) => {
    try {
      setLoading(true);
      const updatedInvoice = await tenantDbService.invoices.update(id, updates);
      setCustomerInvoices(customerInvoices.map(inv => 
        inv.id === id ? updatedInvoice : inv
      ));
    } catch (error) {
      console.error('Error updating invoice:', error);
      alert('Error updating invoice: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteInvoice = async (id) => {
    try {
      setLoading(true);
      await tenantDbService.invoices.delete(id);
      setCustomerInvoices(customerInvoices.filter(inv => inv.id !== id));
    } catch (error) {
      console.error('Error deleting invoice:', error);
      alert('Error deleting invoice: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Database operations for costs
  const handleCreateCost = async (category, costData) => {
    try {
      setLoading(true);
      const mappedData = mapCostFormDataToDb(category, costData);
      const newCost = await tenantDbService.costs.create(category, {
        ...mappedData,
        project_id: activeProject.id,
        in_system: true
      });
      setCostData(prev => ({
        ...prev,
        [category]: [...prev[category], newCost]
      }));
    } catch (error) {
      console.error('Error creating cost:', error);
      alert('Error creating cost: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCost = async (category, id, updates) => {
    try {
      setLoading(true);
      const mappedUpdates = mapCostFormDataToDb(category, updates);
      const updatedCost = await tenantDbService.costs.update(category, id, mappedUpdates);
      setCostData(prev => ({
        ...prev,
        [category]: prev[category].map(item => 
          item.id === id ? updatedCost : item
        )
      }));
    } catch (error) {
      console.error('Error updating cost:', error);
      alert('Error updating cost: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCost = async (category, id) => {
    try {
      setLoading(true);
      await tenantDbService.costs.delete(category, id);
      
      setCostData(prev => ({
        ...prev,
        [category]: prev[category].filter(item => item.id !== id)
      }));
    } catch (error) {
      console.error('Error deleting cost:', error);
      alert('Error deleting cost: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Budget operations
  const handleUpdateBudget = async (category, amount) => {
    if (!activeProject) return;
    
    try {
      setLoading(true);
      await tenantDbService.budgets.updateCategory(activeProject.id, category, amount);
      
        // Update local state with correct key mapping
    const budgetKey = category === 'capLeases' ? 'cap_leases_budget' : 
                     category === 'others' ? 'others_budget' :
                     `${category}_budget`;
    
    setBudgetData(prev => ({
      ...prev,
      [budgetKey]: amount
    }));
    } catch (error) {
      console.error('Error updating budget:', error);
      alert('Error updating budget: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAllBudgets = async (newBudgetData) => {
    if (!activeProject) return;
    
    try {
      setLoading(true);
      const updatedBudget = await tenantDbService.budgets.update(activeProject.id, newBudgetData);
      setBudgetData(updatedBudget);
    } catch (error) {
      console.error('Error updating budgets:', error);
      alert('Error updating budgets: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Filter data based on current filters
  const applyFilters = (data, category) => {
    const categoryFilters = filters[category];
    if (!categoryFilters) return data;

    return data.filter(item => {
      // Date filtering
      if (categoryFilters.startDate && item.date < categoryFilters.startDate) return false;
      if (categoryFilters.endDate && item.date > categoryFilters.endDate) return false;

      // Category-specific filtering
      switch (category) {
        case 'material':
        case 'others':
        case 'capLeases':
        case 'consumable':
        case 'equipment':
          if (categoryFilters.vendor && !item.vendor?.toLowerCase().includes(categoryFilters.vendor.toLowerCase())) return false;
          if (categoryFilters.minCost && item.cost < parseFloat(categoryFilters.minCost)) return false;
          if (categoryFilters.maxCost && item.cost > parseFloat(categoryFilters.maxCost)) return false;
          if (categoryFilters.in_system !== 'all' && item.in_system !== (categoryFilters.in_system === 'true')) return false;
          break;

        case 'labor':
          if (categoryFilters.employeeName && !item.employeeName?.toLowerCase().includes(categoryFilters.employeeName.toLowerCase())) return false;
          const totalHours = (item.stHours || 0) + (item.otHours || 0) + (item.dtHours || 0);
          if (categoryFilters.minHours && totalHours < parseFloat(categoryFilters.minHours)) return false;
          if (categoryFilters.maxHours && totalHours > parseFloat(categoryFilters.maxHours)) return false;
          break;

        case 'subcontractor':
          if (categoryFilters.subcontractorName && !item.subcontractorName?.toLowerCase().includes(categoryFilters.subcontractorName.toLowerCase())) return false;
          if (categoryFilters.vendor && !item.vendor?.toLowerCase().includes(categoryFilters.vendor.toLowerCase())) return false;
          if (categoryFilters.minCost && item.cost < parseFloat(categoryFilters.minCost)) return false;
          if (categoryFilters.maxCost && item.cost > parseFloat(categoryFilters.maxCost)) return false;
          if (categoryFilters.in_system !== 'all' && item.in_system !== (categoryFilters.in_system === 'true')) return false;
          break;
      }

      return true;
    });
  };

  // Filter invoices
  const applyInvoiceFilters = (invoices) => {
    const invoiceFilters = filters.invoices;
    if (!invoiceFilters) return invoices;

    return invoices.filter(invoice => {
      if (invoiceFilters.startDate && invoice.date_billed < invoiceFilters.startDate) return false;
      if (invoiceFilters.endDate && invoice.date_billed > invoiceFilters.endDate) return false;
      if (invoiceFilters.invoice_number && !invoice.invoice_number?.toLowerCase().includes(invoiceFilters.invoice_number.toLowerCase())) return false;
      if (invoiceFilters.minAmount && invoice.amount < parseFloat(invoiceFilters.minAmount)) return false;
      if (invoiceFilters.maxAmount && invoice.amount > parseFloat(invoiceFilters.maxAmount)) return false;
      return true;
    });
  };

  // Update filter
  const updateFilter = (category, field, value) => {
    setFilters(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: value
      }
    }));
  };

  // Clear filters
  const clearFilters = (category) => {
    if (category === 'invoices') {
      setFilters(prev => ({
        ...prev,
        invoices: { startDate: '', endDate: '', invoice_number: '', minAmount: '', maxAmount: '' }
      }));
    } else {
      const baseFilter = category === 'labor' 
        ? { startDate: '', endDate: '', employeeName: '', minHours: '', maxHours: '' }
        : { startDate: '', endDate: '', vendor: '', minCost: '', maxCost: '', in_system: 'all' };
      
      if (category === 'subcontractor') {
        baseFilter.subcontractorName = '';
      }

      setFilters(prev => ({
        ...prev,
        [category]: baseFilter
      }));
    }
  };
  

  // Calculate totals with budget comparison
  const calculateTotals = () => {
  // Handle case where no active project
  if (!activeProject) {
    return {
      material: 0,
      labor: 0,
      equipment: 0,
      subcontractor: 0,
      others: 0,
      capLeases: 0,
      consumable: 0,
      totalCosts: 0,
      grossProfit: 0,
      totalBilledToDate: 0,
      budgets: {},
      variances: {},
      totalBudget: 0,
      totalVariance: 0
    };
  }

  const totals = {};
  const budgets = {};
  const variances = {};
  
  Object.keys(costData).forEach(category => {
    if (category === 'labor') {
      // Special calculation for labor
      totals[category] = costData[category]
        .filter(item => item.project_id === activeProject.id || !item.project_id)
        .reduce((sum, item) => {
          const stCost = (item.stHours || 0) * (item.stRate || 0);
          const otCost = (item.otHours || 0) * (item.otRate || 0);
          const dtCost = (item.dtHours || 0) * (item.dtRate || 0);
          const perDiem = item.perDiem || 0;
          const mobCost = (item.mobQty || 0) * (item.mobRate || 0);
          return sum + stCost + otCost + dtCost + perDiem + mobCost;
        }, 0);
    } else {
      // Regular calculation for other categories
      totals[category] = costData[category]
        .filter(item => item.project_id === activeProject.id || !item.project_id)
        .reduce((sum, item) => {
          return sum + (item.cost || 0);
        }, 0);
    }
    
    // Get budget for this category
    const budgetKey = category === 'others' ? 'others_budget' : 
                     category === 'capLeases' ? 'cap_leases_budget' :
                     `${category}_budget`;
    budgets[category] = budgetData[budgetKey] || 0;
    
    // Calculate variance (negative = over budget)
    variances[category] = budgets[category] - totals[category];
  });
  
  const totalCosts = Object.values(totals).reduce((sum, cost) => sum + cost, 0);
  const totalBudget = Object.values(budgets).reduce((sum, budget) => sum + budget, 0);
  const totalVariance = totalBudget - totalCosts;
  
  // Calculate total billed from customer invoices
  const totalBilledToDate = customerInvoices
    .filter(inv => inv.project_id === activeProject.id)
    .reduce((sum, inv) => sum + inv.amount, 0);
  
  const grossProfit = totalBilledToDate - totalCosts;
  
  return { 
    ...totals, 
    totalCosts, 
    grossProfit, 
    totalBilledToDate,
    budgets,
    variances,
    totalBudget,
    totalVariance
  };
};

  // Update contract value
  const updateContractValue = async (newValue) => {
    if (!activeProject) return;
    
    try {
      await handleUpdateProject(activeProject.id, {
        ...activeProject,
        totalContractValue: newValue
      });
    } catch (error) {
      console.error('Error updating contract value:', error);
    }
  };

  // Export functions (keeping original implementations)
  const exportToPDF = () => {
    const totals = calculateTotals();
    const laborData = (costData.labor || []).filter(item => (item.project_id === activeProject.id || !item.project_id));
    let reportContent = `
      PROJECT PERFORMANCE REPORT
      ==========================
      
      Project Information:
      Job Number: ${activeProject.jobNumber}
      Job Name: ${activeProject.jobName}
      Customer: ${activeProject.customer}
      Field/Shop/Both: ${activeProject.fieldShopBoth}
      Total Billed: ${totals.totalBilledToDate.toLocaleString()}
      Report Date: ${new Date().toLocaleDateString()}
      
      COST SUMMARY:
      =============
      Material: ${totals.material.toLocaleString()}
      Labor: ${totals.labor.toLocaleString()}
      Equipment: ${totals.equipment.toLocaleString()}
      Subcontractors: ${totals.subcontractor.toLocaleString()}
      Cap Leases: ${totals.capLeases.toLocaleString()}
      Consumables: ${totals.consumable.toLocaleString()}
      Other: ${totals.others.toLocaleString()}
      
      Total Costs: ${totals.totalCosts.toLocaleString()}
      Gross Profit: ${totals.grossProfit.toLocaleString()}
      Profit Margin: ${((totals.grossProfit / totals.totalBilledToDate) * 100).toFixed(1)}%
    `;
    // Append detailed labor breakdown (including MOB fields) if labor data exists
    if (laborData.length > 0) {
      reportContent += "\n\nDETAILED LABOR BREAKDOWN:\n" + ("=".repeat(50)) + "\n";
      reportContent += "Date\t\tEmployee\t\tST Hours\tST Rate\tOT Hours\tOT Rate\tDT Hours\tDT Rate\tPer Diem\tMOB Qty\tMOB Rate\tTotal Cost\n";
      laborData.forEach(item => {
         const totalCost = ((item.stHours || 0) * (item.stRate || 0)) + ((item.otHours || 0) * (item.otRate || 0)) + ((item.dtHours || 0) * (item.dtRate || 0)) + (item.perDiem || 0) + ((item.mobQty || 0) * (item.mobRate || 0));
         reportContent += `${item.date}\t\t${item.employeeName}\t\t${item.stHours}\t${item.stRate || 0}\t${item.otHours}\t${item.otRate || 0}\t${item.dtHours}\t${item.dtRate || 0}\t${item.perDiem}\t${item.mobQty || 0}\t${item.mobRate || 0}\t${totalCost}\n`;
      });
    }

    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${activeProject.jobNumber}_${activeProject.jobName}_Report.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportToExcel = () => {
    const totals = calculateTotals();
    
    let csvContent = "Project Performance Report\n\n";
    csvContent += "Project Information\n";
    csvContent += "Field,Value\n";
    csvContent += `Job Number,${activeProject.jobNumber}\n`;
    csvContent += `Job Name,${activeProject.jobName}\n`;
    csvContent += `Customer,${activeProject.customer}\n`;
    csvContent += `Field/Shop/Both,${activeProject.fieldShopBoth}\n`;
    csvContent += `Total Billed,${totals.totalBilledToDate}\n`;
    csvContent += `Report Date,${new Date().toLocaleDateString()}\n\n`;
    
    csvContent += "Cost Summary\n";
    csvContent += "Category,Amount\n";
    csvContent += `Material,${totals.material}\n`;
    csvContent += `Labor,${totals.labor}\n`;
    csvContent += `Equipment,${totals.equipment}\n`;
    csvContent += `Subcontractors,${totals.subcontractor}\n`;
    csvContent += `Cap Leases,${totals.capLeases}\n`;
    csvContent += `Consumables,${totals.consumable}\n`;
    csvContent += `Other,${totals.others}\n`;
    csvContent += `Total Costs,${totals.totalCosts}\n`;
    csvContent += `Gross Profit,${totals.grossProfit}\n`;
    csvContent += `Profit Margin,${((totals.grossProfit / totals.totalBilledToDate) * 100).toFixed(1)}%\n`;
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${activeProject.jobNumber}_${activeProject.jobName}_Report.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportCategoryToExcel = (category, useFilters = false) => {
    let categoryData = (costData[category] || []).filter(item => 
      item.project_id === activeProject.id || !item.project_id
    );
    
    // Apply filters if requested
    if (useFilters) {
      categoryData = applyFilters(categoryData, category);
    }
    
    const filterSuffix = useFilters ? '_filtered' : '';
    let csvContent = `${category.charAt(0).toUpperCase() + category.slice(1)} Export - ${activeProject.jobName}${filterSuffix}\n\n`;
    
    // Add filter information if filters were applied
    if (useFilters) {
      const categoryFilters = filters[category];
      csvContent += "Applied Filters:\n";
      if (categoryFilters.startDate) csvContent += `Start Date: ${categoryFilters.startDate}\n`;
      if (categoryFilters.endDate) csvContent += `End Date: ${categoryFilters.endDate}\n`;
      if (categoryFilters.vendor) csvContent += `Vendor: ${categoryFilters.vendor}\n`;
      if (categoryFilters.employeeName) csvContent += `Employee: ${categoryFilters.employeeName}\n`;
      if (categoryFilters.subcontractorName) csvContent += `Subcontractor: ${categoryFilters.subcontractorName}\n`;
      if (categoryFilters.minCost) csvContent += `Min Cost: ${categoryFilters.minCost}\n`;
      if (categoryFilters.maxCost) csvContent += `Max Cost: ${categoryFilters.maxCost}\n`;
      if (categoryFilters.minHours) csvContent += `Min Hours: ${categoryFilters.minHours}\n`;
      if (categoryFilters.maxHours) csvContent += `Max Hours: ${categoryFilters.maxHours}\n`;
      if (categoryFilters.in_system !== 'all') csvContent += `In System: ${categoryFilters.in_system === 'true' ? 'Yes' : 'No'}\n`;
      csvContent += `\nTotal Records: ${categoryData.length}\n\n`;
    }
    
    if (category === 'labor') {
      csvContent += "Date,Employee Name,ST Hours,ST Rate,OT Hours,OT Rate,DT Hours,DT Rate,Per Diem,MOB Quantity,MOB Rate,Total Cost\n";
      categoryData.forEach(item => {
        const totalCost = ((item.stHours || 0) * (item.stRate || 0)) + 
                        ((item.otHours || 0) * (item.otRate || 0)) + 
                        ((item.dtHours || 0) * (item.dtRate || 0)) + 
                        (item.perDiem || 0) + 
                        ((item.mobQty || 0) * (item.mobRate || 0));
        csvContent += `${item.date},${item.employeeName},${item.stHours},${item.stRate || 0},${item.otHours},${item.otRate || 0},${item.dtHours},${item.dtRate || 0},${item.perDiem},${item.mobQty || 0},${item.mobRate || 0},${totalCost}\n`;
      });
    } else if (category === 'others') {
      csvContent += "Date,Vendor,Description,Invoice Number,Cost,In System\n";
      categoryData.forEach(item => {
        csvContent += `${item.date},${item.vendor || ''},${item.description || ''},${item.invoice_number},${item.cost},${item.in_system ? 'Yes' : 'No'}\n`;
      });
    } else {
      csvContent += "Date,Vendor/Subcontractor,Invoice Number,Cost,In System\n";
      categoryData.forEach(item => {
        csvContent += `${item.date},${item.vendor || item.subcontractorName},${item.invoice_number},${item.cost},${item.in_system ? 'Yes' : 'No'}\n`;
      });
    }
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${activeProject.jobNumber}_${category}${filterSuffix}_${new Date().toLocaleDateString().replace(/\//g, '-')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Export filtered invoices
  const exportFilteredInvoices = () => {
    const projectInvoices = customerInvoices.filter(inv => inv.project_id === activeProject.id);
    const filteredInvoices = applyInvoiceFilters(projectInvoices);
    
    let csvContent = `Customer Invoices Export - ${activeProject.jobName}_filtered\n\n`;
    
    // Add filter information
    const invoiceFilters = filters.invoices;
    csvContent += "Applied Filters:\n";
    if (invoiceFilters.startDate) csvContent += `Start Date: ${invoiceFilters.startDate}\n`;
    if (invoiceFilters.endDate) csvContent += `End Date: ${invoiceFilters.endDate}\n`;
    if (invoiceFilters.invoice_number) csvContent += `Invoice Number: ${invoiceFilters.invoice_number}\n`;
    if (invoiceFilters.minAmount) csvContent += `Min Amount: ${invoiceFilters.minAmount}\n`;
    if (invoiceFilters.maxAmount) csvContent += `Max Amount: ${invoiceFilters.maxAmount}\n`;
    csvContent += `\nTotal Records: ${filteredInvoices.length}\n\n`;
    
    csvContent += "Invoice Number,Amount,Date Billed\n";
    filteredInvoices.forEach(invoice => {
      csvContent += `${invoice.invoice_number},${invoice.amount},${invoice.date_billed}\n`;
    });
    
    const totalFiltered = filteredInvoices.reduce((sum, inv) => sum + inv.amount, 0);
    csvContent += `\nTotal Amount: ${totalFiltered.toLocaleString()}\n`;
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${activeProject.jobNumber}_invoices_filtered_${new Date().toLocaleDateString().replace(/\//g, '-')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  
  // Save currentView to localStorage whenever it changes
  useEffect(() => {
    if (currentView) {
      localStorage.setItem('protrack_currentView', currentView);
    }
  }, [currentView]);

  // Add a handleSignOut function that clears the saved view and calls signOut
  const handleSignOut = () => {
    localStorage.removeItem('protrack_currentView');
    signOut();
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Logo size="md" className="mr-3" />
              <div className="text-xs text-gray-500">{tenant?.name}</div>
            </div>
            <div className="flex items-center space-x-4">
              {projects.length > 0 && (
                <select
                  value={activeProject?.id || ''}
                  onChange={(e) => {
                    const selectedProject = projects.find(p => p.id === e.target.value);
                    setActiveProject(selectedProject);
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {projects.map(project => (
                    <option key={project.id} value={project.id}>
                      {project.jobNumber} - {project.jobName}
                    </option>
                  ))}
                </select>
              )}
              <div className="text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <span>Welcome, {user.name}</span>
                  <button
                    onClick={handleSignOut}
                    className="text-gray-400 hover:text-gray-600 p-1 rounded"
                    title="Sign Out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
                <div className="text-xs text-gray-500">({user.role})</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Sidebar Navigation */}
          <nav className="w-64 bg-white rounded-lg shadow-md p-6">
            <ul className="space-y-2">
              <li>
                <button
                  onClick={() => setCurrentView('dashboard')}
                  className={`w-full text-left px-4 py-2 rounded-md flex items-center gap-3 ${
                    currentView === 'dashboard' ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <BarChart3 className="w-4 h-4" />
                  Dashboard
                </button>
              </li>
              
              {hasPermission('invoices', 'read') && (
                <li>
                  <button
                    onClick={() => setCurrentView('invoices')}
                    className={`w-full text-left px-4 py-2 rounded-md flex items-center gap-3 ${
                      currentView === 'invoices' ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <DollarSign className="w-4 h-4" />
                    Customer Invoices
                    {getPermissionLevel('invoices') === 'read' && <Lock className="w-3 h-3 ml-auto text-gray-400" />}
                  </button>
                </li>
              )}
              
              {/* Cost Categories */}
              {[
                { key: 'material', label: 'Material', icon: Building },
                { key: 'labor', label: 'Labor', icon: Wrench },
                { key: 'equipment', label: 'Equipment', icon: Wrench },
                { key: 'subcontractor', label: 'Subcontractors', icon: User },
                { key: 'capLeases', label: 'Cap Leases', icon: Calendar },
                { key: 'consumable', label: 'Consumables', icon: Building },
                { key: 'others', label: 'Other', icon: FileText }
              ].filter(({ key }) => hasPermission(key, 'read')).map(({ key, label, icon: Icon }) => (
                <li key={key}>
                  <button
                    onClick={() => setCurrentView(key)}
                    className={`w-full text-left px-4 py-2 rounded-md flex items-center gap-3 ${
                      currentView === key ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                    {getPermissionLevel(key) === 'read' && <Lock className="w-3 h-3 ml-auto text-gray-400" />}
                  </button>
                </li>
              ))}

              {/* Admin Functions */}
              {(hasPermission('projects', 'read') || hasPermission('users', 'read')) && (
                <li className="pt-4 border-t border-gray-200">
                  <div className="text-xs text-gray-500 uppercase tracking-wider px-4 py-2">Administration</div>
                </li>
              )}
              
              {hasPermission('projects', 'read') && (
                <li>
                  <button
                    onClick={() => setCurrentView('projects')}
                    className={`w-full text-left px-4 py-2 rounded-md flex items-center gap-3 ${
                      currentView === 'projects' ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Building className="w-4 h-4" />
                    Projects
                    {getPermissionLevel('projects') === 'read' && <Lock className="w-3 h-3 ml-auto text-gray-400" />}
                  </button>
                </li>
              )}
              
              {hasPermission('users', 'read') && (
                <li>
                  <button
                    onClick={() => setCurrentView('users')}
                    className={`w-full text-left px-4 py-2 rounded-md flex items-center gap-3 ${
                      currentView === 'users' ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Settings className="w-4 h-4" />
                    Users
                    {getPermissionLevel('users') === 'read' && <Lock className="w-3 h-3 ml-auto text-gray-400" />}
                  </button>
                </li>
              )}
            </ul>
          </nav>

          {/* Main Content */}
          <main className="flex-1">
            {(() => {
              // Define currentChangeOrders for the active project
              const currentChangeOrders = changeOrdersByProject[activeProject?.id] || [];
              return (
                <>
                  {currentView === 'dashboard' && (
                    <DashboardView 
                      changeOrders={currentChangeOrders} 
                      activeProject={activeProject}
                      calculateTotals={calculateTotals}
                      hasPermission={hasPermission}
                      setCurrentView={setCurrentView}
                      costData={costData}
                      budgetData={budgetData}
                      tenantDbService={tenantDbService}
                      loading={loading}
                      showBudgetReport={showBudgetReport}
                      setShowBudgetReport={setShowBudgetReport}
                    />
                  )}
                  {currentView === 'invoices' && (
                    <CustomerInvoiceView 
                      changeOrders={currentChangeOrders} 
                      selectedChangeOrder={selectedChangeOrder} 
                      setSelectedChangeOrder={setSelectedChangeOrder}
                      activeProject={activeProject}
                      hasPermission={hasPermission}
                      filters={filters}
                      applyFilters={applyInvoiceFilters}
                      exportFilteredInvoices={exportFilteredInvoices}
                      loading={loading}
                    />
                  )}
                  {currentView === 'users' && (
                    <UserManagementView 
                      hasPermission={hasPermission}
                      getPermissionLevel={getPermissionLevel}
                      handleCreateUser={handleCreateUser}
                      handleUpdateUser={handleUpdateUser}
                      handleDeleteUser={handleDeleteUser}
                      loading={loading}
                    />
                  )}
                  {currentView === 'projects' && (
                    <ProjectManagementView 
                      hasPermission={hasPermission}
                      getPermissionLevel={getPermissionLevel}
                      handleCreateProject={handleCreateProject}
                      handleUpdateProject={handleUpdateProject}
                      handleDeleteProject={handleDeleteProject}
                      loading={loading}
                    />
                  )}
                  {['material', 'labor', 'equipment', 'subcontractor', 'others', 'capLeases', 'consumable'].includes(currentView) && (
                    <CostCategoryView 
                      category={currentView} 
                      selectedChangeOrder={selectedChangeOrder} 
                      setSelectedChangeOrder={setSelectedChangeOrder} 
                      changeOrders={currentChangeOrders}
                      costData={costData}
                      activeProject={activeProject}
                      calculateTotals={calculateTotals}
                      hasPermission={hasPermission}
                      getPermissionLevel={getPermissionLevel}
                      handleDeleteCost={handleDeleteCost}
                      handleUpdateBudget={handleUpdateBudget}
                      loading={loading}
                      filters={filters}
                      applyFilters={applyFilters}
                      exportCategoryToExcel={exportCategoryToExcel}
                    />
                  )}
                </>
              );
            })()}
          </main>
        </div>
      </div>
    </div>
  );
};

const AppContent = () => {
  const { user, loading: authLoading, signIn, signUp, signOut } = useAuth();
  const { tenant, loading: tenantLoading } = useTenant();

  if (authLoading || tenantLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading ProTrack...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage onSignIn={signIn} onSignUp={signUp} loading={authLoading} />;
  }

  if (!tenant) {
    return <TenantRegistration />;
  }

  return <ProjectTrackingApp />;
};

const App = () => (
  <TenantProvider>
    <AppContent />
  </TenantProvider>
);

export default App;