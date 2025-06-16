import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useTenantContext } from './TenantProvider';
import { tenantDbService } from '@/lib/tenantDbService';

interface AppStateContextType {
  projects: any[];
  activeProject: any;
  setActiveProject: (project: any) => void;
  customerInvoices: any[];
  users: any[];
  currentView: string;
  setCurrentView: (view: string) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  changeOrders: any[];
  calculateTotals: () => any;
  hasPermission: (area: string, level?: string) => boolean;
  showBudgetReport: boolean;
  setShowBudgetReport: (show: boolean) => void;
  allProjects: any[];
  statusFilter: string;
  setStatusFilter: (filter: string) => void;
  editingUser: any;
  setEditingUser: (user: any) => void;
  showUserModal: boolean;
  setShowUserModal: (show: boolean) => void;
  handleCreateUser: (userData: any) => void;
  handleUpdateUser: (id: string, updates: any) => void;
  handleDeleteUser: (id: string) => void;
}

const AppStateContext = createContext<AppStateContextType | undefined>(undefined);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { tenant } = useTenantContext();
  const [projects, setProjects] = useState<any[]>([]);
  const [activeProject, setActiveProject] = useState<any>(null);
  const [customerInvoices, setCustomerInvoices] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [currentView, setCurrentView] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [changeOrders, setChangeOrders] = useState<any[]>([]);
  const [showBudgetReport, setShowBudgetReport] = useState(false);
  const [allProjects, setAllProjects] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [editingUser, setEditingUser] = useState<any>(null);
  const [showUserModal, setShowUserModal] = useState(false);

  useEffect(() => {
    if (user && tenant) {
      loadInitialData();
    }
  }, [user, tenant]);

  useEffect(() => {
    if (activeProject && tenant) {
      fetchChangeOrders();
    }
  }, [activeProject, tenant]);

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
  }, [user, tenant]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const projectsData = await tenantDbService.projects.getAll(false);
      setProjects(projectsData);
      if (projectsData.length > 0 && !activeProject) {
        setActiveProject(projectsData[0]);
      }
      // ... load other initial data as needed ...
    } catch (error) {
      console.error('Error loading initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchChangeOrders = async () => {
    try {
      const data = await tenantDbService.changeOrders.getAllByProject(activeProject.id);
      setChangeOrders(data);
    } catch (err) {
      setChangeOrders([]);
    }
  };

  // Permission logic
  const hasPermission = (area: string, level: string = 'read') => {
    if (!user) return false;
    if (user.role === 'master') return true;
    const userPermission = (user.permissions as Record<string, string>)[area];
    if (!userPermission || userPermission === 'none') return false;
    if (level === 'read') return ['read', 'write'].includes(userPermission);
    if (level === 'write') return userPermission === 'write';
    return false;
  };

  // Totals calculation (stub, should be replaced with real logic)
  const calculateTotals = () => ({
    totalBilledToDate: 0,
    totalCosts: 0,
    grossProfit: 0,
    budgets: {},
    variances: {},
  });

  const handleCreateUser = async (userData: any) => {
    try {
      setLoading(true);
      const newUser = await tenantDbService.users.create(userData);
      setUsers((prev) => [...prev, newUser]);
      setShowUserModal(false);
    } catch (error) {
      console.error('Error creating user:', error);
      alert('Error creating user: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUser = async (id: string, updates: any) => {
    try {
      setLoading(true);
      const updatedUser = await tenantDbService.users.update(id, updates);
      setUsers((prev) => prev.map((u) => u.id === id ? updatedUser : u));
      setShowUserModal(false);
      setEditingUser(null);
    } catch (error) {
      console.error('Error updating user:', error);
      alert('Error updating user: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      setLoading(true);
      await tenantDbService.users.delete(id);
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Error deleting user: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppStateContext.Provider value={{
      projects,
      activeProject,
      setActiveProject,
      customerInvoices,
      users,
      currentView,
      setCurrentView,
      loading,
      setLoading,
      changeOrders,
      calculateTotals,
      hasPermission,
      showBudgetReport,
      setShowBudgetReport,
      allProjects,
      statusFilter,
      setStatusFilter,
      editingUser,
      setEditingUser,
      showUserModal,
      setShowUserModal,
      handleCreateUser,
      handleUpdateUser,
      handleDeleteUser,
    }}>
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState() {
  const context = useContext(AppStateContext);
  if (!context) throw new Error('useAppState must be used within an AppStateProvider');
  return context;
} 