// Project Tracking Application
// A React application for tracking project costs, invoices, and user management
import React, { useState, useEffect } from 'react';
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

const ProjectTrackingApp = () => {
  // Authentication
  const { user, loading: authLoading, signIn, signUp, signOut } = useTenantAuth();
  const { tenant } = useTenant();

  // State management
  const [projects, setProjects] = useState([]);
  const [activeProject, setActiveProject] = useState(null);
  const [customerInvoices, setCustomerInvoices] = useState([]);
  const [users, setUsers] = useState([]);
  const [currentView, setCurrentView] = useState('dashboard');
  const [showUserModal, setShowUserModal] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editingProject, setEditingProject] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showBudgetReport, setShowBudgetReport] = useState(false);
  const [changeOrders, setChangeOrders] = useState([]);
  // Add selectedChangeOrder state at the top level
  const [selectedChangeOrder, setSelectedChangeOrder] = useState('all');

  // Cost categories data structure
  const [costData, setCostData] = useState({
    material: [],
    labor: [],
    equipment: [],
    subcontractor: [],
    others: [],
    capLeases: [],
    consumable: []
  });

  // Budget data structure
  const [budgetData, setBudgetData] = useState({
    material_budget: 0,
    labor_budget: 0,
    equipment_budget: 0,
    subcontractor_budget: 0,
    others_budget: 0,
    cap_leases_budget: 0,
    consumable_budget: 0
  });

  // Filter states
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

  // Add at the top level of ProjectTrackingApp
  const [allEmployees, setAllEmployees] = useState([]);
  useEffect(() => {
    if (tenant?.id && activeProject?.id) {
      supabase
        .from('employees')
        .select('*')
        .eq('tenant_id', tenant.id)
        .or(`project_id.eq.${activeProject.id},project_id.is.null`)
        .then(({ data, error }) => {
          if (!error) setAllEmployees(data);
        });
    }
  }, [tenant?.id, activeProject?.id]);

  // Load data when user logs in or active project changes
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

  // Add tenant and user check
  useEffect(() => {
    if (user && tenant) {
      loadInitialData();
    }
  }, [user, tenant]);

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

  // Set tenant context for tenantDbService
  useEffect(() => {
    if (tenant?.id) {
      tenantDbService.setTenant(tenant.id);
    }
  }, [tenant]);

  useEffect(() => {
    const fetchChangeOrders = async () => {
      if (activeProject) {
        try {
          const data = await tenantDbService.changeOrders.getAllByProject(activeProject.id);
          setChangeOrders(data);
        } catch (error) {
          setChangeOrders([]);
        }
      } else {
        setChangeOrders([]);
      }
    };
    fetchChangeOrders();
  }, [activeProject]);

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

  // Filter Component with debounced input
  const FilterComponent = ({ category, onFilterChange, onClearFilters, onExportFiltered }) => {
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

  // Dashboard view
  const DashboardView = () => {
  const totals = calculateTotals();
  const [editingContractValue, setEditingContractValue] = useState(false);
  const [contractValueInput, setContractValueInput] = useState(activeProject?.totalContractValue || 0);
  
  // Calculate change order total and grand total
  const changeOrdersTotal = changeOrders.reduce((sum, co) => sum + (co.additional_contract_value || 0), 0);
  const baseContractValue = activeProject?.totalContractValue || 0;
  const grandTotalContractValue = baseContractValue + changeOrdersTotal;
  
  // Handle case where no projects exist
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
                  Remaining to Bill: ${(activeProject.totalContractValue - totals.totalBilledToDate).toLocaleString()}
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
  
  
  // Cost Category View with enhanced permissions
    const CostCategoryView = ({ category, selectedChangeOrder, setSelectedChangeOrder, changeOrders }) => {
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

  // User management view with enhanced permissions system
  const UserManagementView = () => {
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
    const filteredProjects = allProjects.filter(project => {
      if (statusFilter === 'all') return true;
      return project.status === statusFilter;
    });

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
                <tr key={project.id} className={`hover:bg-gray-50 ${activeProject?.id === project.id ? 'bg-blue-50' : ''}`}>
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
              ))}
            </tbody>
          </table>
          
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
        {activeProject && (
          <div className="bg-white rounded-lg shadow-md overflow-hidden mt-8">
            <ChangeOrdersSection activeProject={activeProject} />
          </div>
        )}
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
      </div>
    );
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
                    onClick={signOut}
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
            {currentView === 'dashboard' && <DashboardView />}
            {currentView === 'invoices' && <CustomerInvoiceView changeOrders={changeOrders} selectedChangeOrder={selectedChangeOrder} setSelectedChangeOrder={setSelectedChangeOrder} />}
            {currentView === 'users' && <UserManagementView />}
            {currentView === 'projects' && <ProjectManagementView />}
            {['material', 'labor', 'equipment', 'subcontractor', 'others', 'capLeases', 'consumable'].includes(currentView) && (
              <CostCategoryView category={currentView} selectedChangeOrder={selectedChangeOrder} setSelectedChangeOrder={setSelectedChangeOrder} changeOrders={changeOrders} />
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

const App = () => {
  // Check if we need to show tenant registration
  const hostname = window.location.hostname;
  const isMainDomain = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === 'protrack.com';
  
  if (isMainDomain && !window.location.search.includes('tenant=')) {
    return <TenantRegistration />;
  }

  return (
    <TenantProvider>
      <ProjectTrackingApp />
    </TenantProvider>
  );
};

// ChangeOrdersSection component
const ChangeOrdersSection = ({ activeProject }) => {
  const [changeOrders, setChangeOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingChangeOrder, setEditingChangeOrder] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', additional_contract_value: 0 });

  useEffect(() => {
    if (activeProject) {
      loadChangeOrders();
    }
    // eslint-disable-next-line
  }, [activeProject]);

  const loadChangeOrders = async () => {
    setLoading(true);
    try {
      const data = await tenantDbService.changeOrders.getAllByProject(activeProject.id);
      setChangeOrders(data);
    } catch (error) {
      console.error('Error loading change orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      if (editingChangeOrder) {
        await tenantDbService.changeOrders.update(editingChangeOrder.id, form);
      } else {
        await tenantDbService.changeOrders.create(activeProject.id, form);
      }
      setShowModal(false);
      setEditingChangeOrder(null);
      setForm({ name: '', description: '', additional_contract_value: 0 });
      loadChangeOrders();
    } catch (error) {
      console.error('Error saving change order:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this change order?')) return;
    setLoading(true);
    try {
      await tenantDbService.changeOrders.delete(id);
      loadChangeOrders();
    } catch (error) {
      console.error('Error deleting change order:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-gray-900">Change Orders</h3>
        <button
          onClick={() => { setShowModal(true); setEditingChangeOrder(null); setForm({ name: '', description: '', additional_contract_value: 0 }); }}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          + Add Change Order
        </button>
      </div>
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Additional Contract Value</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {changeOrders.map((co) => (
            <tr key={co.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{co.name}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{co.description}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${co.additional_contract_value?.toLocaleString()}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <button
                  onClick={() => { setEditingChangeOrder(co); setForm({ name: co.name, description: co.description, additional_contract_value: co.additional_contract_value }); setShowModal(true); }}
                  className="text-blue-600 hover:text-blue-900 mr-4"
                >Edit</button>
                <button
                  onClick={() => handleDelete(co.id)}
                  className="text-red-600 hover:text-red-900"
                  disabled={loading}
                >Delete</button>
              </td>
            </tr>
          ))}
          {changeOrders.length === 0 && (
            <tr><td colSpan={4} className="text-center py-8 text-gray-500">No change orders found</td></tr>
          )}
        </tbody>
      </table>
      {/* Modal for create/edit */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">{editingChangeOrder ? 'Edit Change Order' : 'Add Change Order'}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Additional Contract Value</label>
                <input
                  type="number"
                  value={form.additional_contract_value}
                  onChange={e => setForm({ ...form, additional_contract_value: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={handleSave}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >{loading ? 'Saving...' : 'Save'}</button>
              <button
                onClick={() => { setShowModal(false); setEditingChangeOrder(null); }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
              >Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const mapCostFormDataToDb = (category, formData) => {
  const mapping = {
    labor: { employee_id: 'employee_id', employeeName: 'employee_name', stHours: 'st_hours', stRate: 'st_rate', otHours: 'ot_hours', otRate: 'ot_rate', dtHours: 'dt_hours', dtRate: 'dt_rate', perDiem: 'per_diem', mobQty: 'mob_qty', mobRate: 'mob_rate' },
    subcontractor: { subcontractor_name: 'subcontractor_name' },
    // Add more mappings as needed
  };
  let mapped = { ...formData };
  if (mapping[category]) {
    Object.entries(mapping[category]).forEach(([from, to]) => {
      if (from in mapped) {
        mapped[to] = mapped[from];
        if (from !== to) delete mapped[from];
      }
    });
  }
  return mapped;
};

export default App;