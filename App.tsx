import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area, ResponsiveContainer, Tooltip
} from 'recharts';
import { fetchTransactions, deleteTransaction } from './services/api';
import { Transaction, RegularTransaction } from './types';
import { 
  calculateFinancials, 
  getExpensesByCategory, 
  getIncomesByCategory,
  getExpensesByDate, 
  getExpensesByWeekday 
} from './utils/analytics';
import { SummaryCard } from './components/SummaryCard';
import { TransactionTable } from './components/TransactionTable';
import { AddTransactionModal } from './components/AddTransactionModal';
import { BulkImportModal } from './components/BulkImportModal';
import { YearlyDashboard } from './components/YearlyDashboard';
import { RegularTransactionManager } from './components/RegularTransactionManager';
import { AddRegularTransactionModal } from './components/AddRegularTransactionModal';
import { CategoryManager } from './components/CategoryManager';
import { AddCategoryModal } from './components/AddCategoryModal';
import { LoginPage } from './components/LoginPage';
import { TwoFactorSetup } from './components/TwoFactorSetup';
import { TransactionManager } from './components/TransactionManager';
import { SankeyChart } from './components/SankeyChart';
import { useTheme } from './hooks/useTheme';
import { getCookie, setCookie } from './utils/cookies';

// --- Icons ---
const DollarIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 18V6"/></svg>
);
const TagIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z"/><path d="M7 7h.01"/></svg>
);
const TargetIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
);
const SunIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
);
const MoonIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
);
const PlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
);
const DownloadIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
);
const DashboardIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>
);
const ChartIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
);
const TemplatesIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
);
const FolderIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
);
const ChevronLeftIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
);
const ChevronRightIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
);
const MenuIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
);
const XIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
);
const CalendarIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
);
const LogoutIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
);
const ShieldIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
);
const ListIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/></svg>
);

const Dashboard: React.FC<{ user: any, onLogout: () => void }> = ({ user, onLogout }) => {
  const [viewMode, setViewMode] = useState<'monthly' | 'yearly' | 'regular' | 'categories' | 'transactions' | '2fa-setup'>('monthly');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  
  const monthInputRef = useRef<HTMLInputElement>(null);
  const sankeyContainerRef = useRef<HTMLDivElement>(null);
  const [sankeyWidth, setSankeyWidth] = useState(900);
  
  // Yearly View State
  const [year, setYear] = useState(new Date().getFullYear().toString());

  // Regular Transaction State
  const [isRegularModalOpen, setIsRegularModalOpen] = useState(false);
  const [editingRegularTransaction, setEditingRegularTransaction] = useState<RegularTransaction | null>(null);
  const [regularRefreshTrigger, setRegularRefreshTrigger] = useState(0);

  // Category State
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<{ id: string; name: string } | null>(null);
  const [categoryRefreshTrigger, setCategoryRefreshTrigger] = useState(0);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  
  // Target Savings State - Initialize from cookie
  const [targetSavings, setTargetSavings] = useState(() => {
    const savedTarget = getCookie('targetSavings');
    return savedTarget ? parseFloat(savedTarget) : 2000;
  });
  const [isEditingTarget, setIsEditingTarget] = useState(false);
  const [tempTargetInput, setTempTargetInput] = useState(() => {
    const savedTarget = getCookie('targetSavings');
    return savedTarget || "2000";
  });
  
  const { theme, toggleTheme } = useTheme();

  // Save targetSavings to cookie whenever it changes
  useEffect(() => {
    setCookie('targetSavings', targetSavings.toString());
  }, [targetSavings]);

  // Update document title based on view mode
  useEffect(() => {
    const titles = {
      monthly: 'Expensify',
      yearly: 'Expensify',
      regular: 'Expensify',
      categories: 'Expensify',
      transactions: 'Expensify',
      '2fa-setup': 'Expensify'
    };
    document.title = titles[viewMode];
  }, [viewMode]);

  const loadData = useCallback(async () => {
    // Only load transaction list data if in monthly view
    if (viewMode !== 'monthly') return;

    setLoading(true);
    setError(null);
    try {
      const data = await fetchTransactions(month);
      setTransactions(data.transactions || []);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to fetch transactions');
    } finally {
      setLoading(false);
    }
  }, [month, viewMode]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Measure sankey container width
  useEffect(() => {
    const updateWidth = () => {
      if (sankeyContainerRef.current) {
        // Get container width and subtract SVG internal padding (50px left + 50px right = 100px)
        const containerWidth = sankeyContainerRef.current.clientWidth;
        setSankeyWidth(Math.max(containerWidth - 100, 300)); // Subtract padding, minimum 300px
      }
    };
    
    // Initial measurement with delay to ensure container is fully rendered
    const timer = setTimeout(updateWidth, 300);
    updateWidth();
    
    window.addEventListener('resize', updateWidth);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateWidth);
    };
  }, [monthlySankeyData]); // Re-measure when data changes

  // Analytics (Only used for Monthly view)
  const { income, expense, savings } = useMemo(() => calculateFinancials(transactions), [transactions]);
  const dateData = useMemo(() => getExpensesByDate(transactions), [transactions]);
  const weekdayData = useMemo(() => getExpensesByWeekday(transactions), [transactions]);
  
  const allocationData = useMemo(() => {
    const expenses = getExpensesByCategory(transactions);
    const data = [...expenses];
    
    if (savings > 0) {
      data.push({
        name: 'SAVINGS',
        value: savings,
        color: '#10b981' // Green
      });
    }
    
    // Sort descending by value
    return data.sort((a, b) => b.value - a.value);
  }, [transactions, savings]);

  const monthlySankeyData = useMemo(() => {
    const incomes = getIncomesByCategory(transactions);
    const expenses = getExpensesByCategory(transactions);
    
    // Create nodes: income sources (left), total income (middle), expenses & savings (right)
    const nodes = [];
    
    // Add income source category nodes (left side) with income- prefix
    incomes.forEach((cat) => {
      nodes.push({
        id: `income-${cat.name}`,
        label: cat.name,
        color: cat.color
      });
    });
    
    // Add total income node (middle)
    nodes.push({
      id: 'income',
      label: 'Total Income',
      color: '#10b981'
    });
    
    // Add savings node if positive (right side - should appear above)
    if (savings > 0) {
      nodes.push({
        id: 'SAVINGS',
        label: 'SAVINGS',
        color: '#10b981'
      });
    }
    
    // Add expense category nodes (right side) with expense- prefix
    expenses.forEach((cat) => {
      nodes.push({
        id: `expense-${cat.name}`,
        label: cat.name,
        color: cat.color
      });
    });
    
    // Create links: income sources -> total income -> expenses & savings
    const links = [];
    
    // Links from income sources to total income
    incomes.forEach((cat) => {
      links.push({
        source: `income-${cat.name}`,
        target: 'income',
        value: cat.value,
        color: cat.color
      });
    });
    
    // Link from total income to savings if positive
    if (savings > 0) {
      links.push({
        source: 'income',
        target: 'SAVINGS',
        value: savings,
        color: '#10b981'
      });
    }
    
    // Links from total income to expense categories
    expenses.forEach((cat) => {
      links.push({
        source: 'income',
        target: `expense-${cat.name}`,
        value: cat.value,
        color: cat.color
      });
    });

    return { nodes, links };
  }, [transactions, savings]);

  const topCategory = allocationData.find(d => d.name !== 'SAVINGS')?.name || 'N/A';
  const topCategoryAmount = allocationData.find(d => d.name !== 'SAVINGS')?.value || 0;

  // Targeted Daily Expense Calculation
  const { dailyTarget, remainingDays } = useMemo(() => {
    const now = new Date();
    const [y, m] = month.split('-').map(Number);
    // new Date(y, m, 0) gives last day of month 'm'
    const daysInMonth = new Date(y, m, 0).getDate();
    const todayDate = now.getDate();

    const isCurrentMonth = now.getFullYear() === y && now.getMonth() + 1 === m;
    const isFuture = new Date(y, m - 1, 1) > now;
    const isPast = new Date(y, m, 0) < now;

    let remDays = 0;
    if (isFuture) {
      remDays = daysInMonth;
    } else if (isCurrentMonth) {
      remDays = Math.max(0, daysInMonth - todayDate + 1);
    } else if (isPast) {
      remDays = 0;
    }

    const availableBudget = income - expense - targetSavings;
    const daily = remDays > 0 ? availableBudget / remDays : 0;

    return { dailyTarget: daily, remainingDays: remDays };
  }, [month, income, expense, targetSavings]);

  const availableYears = useMemo(() => {
    const years = [];
    for (let i = 2024; i <= 2030; i++) {
        years.push(i);
    }
    const selectedYearInt = parseInt(year);
    if (!isNaN(selectedYearInt) && !years.includes(selectedYearInt)) {
        years.push(selectedYearInt);
    }
    return years.sort((a, b) => a - b);
  }, [year]);

  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMonth(e.target.value);
  };

  const navigateMonth = (direction: number) => {
    const [y, m] = month.split('-').map(Number);
    // Javascript month is 0-indexed. Current input is 1-indexed.
    // subtract 1 to get JS month, add direction, and let Date object handle overflow/underflow
    const newDate = new Date(y, m - 1 + direction, 1);
    const newYear = newDate.getFullYear();
    const newMonth = String(newDate.getMonth() + 1).padStart(2, '0');
    setMonth(`${newYear}-${newMonth}`);
  };
  
  const goToCurrentMonth = () => {
    const now = new Date();
    const current = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    setMonth(current);
  };

  const handleTransactionSaved = () => {
    loadData();
  };

  const openAddModal = () => {
    setEditingTransaction(null);
    setIsModalOpen(true);
  };

  const openBulkModal = () => {
    setIsBulkModalOpen(true);
  };

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this transaction?')) {
      try {
        await deleteTransaction(id);
        loadData();
      } catch (err: any) {
        alert(`Failed to delete: ${err.message}`);
      }
    }
  };

  // Regular Transaction Handlers
  const handleRegularEdit = (transaction: RegularTransaction) => {
    setEditingRegularTransaction(transaction);
    setIsRegularModalOpen(true);
  };

  const handleRegularSuccess = () => {
      setRegularRefreshTrigger(prev => prev + 1);
  };

  // Category Handlers
  const handleCategoryEdit = (category: { id: string; name: string }) => {
    setEditingCategory(category);
    setIsCategoryModalOpen(true);
  };

  const handleCategorySuccess = () => {
    setCategoryRefreshTrigger(prev => prev + 1);
  };

  const chartColors = {
    text: theme === 'dark' ? '#94a3b8' : '#64748b',
    grid: theme === 'dark' ? '#334155' : '#e2e8f0',
    tooltipBg: theme === 'dark' ? '#1e293b' : '#ffffff',
    tooltipText: theme === 'dark' ? '#f8fafc' : '#1e293b',
    areaGradientStart: theme === 'dark' ? '#818cf8' : '#6366f1',
    areaStroke: theme === 'dark' ? '#818cf8' : '#6366f1',
  };

  return (
    <div className="flex flex-col md:flex-row h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 overflow-hidden transition-colors duration-200">
      
      {/* --- Sidebar (Desktop) --- */}
      <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex-shrink-0 z-20 transition-colors">
        <div className="h-16 flex items-center px-6 border-b border-slate-200 dark:border-slate-700">
          <div className="w-8 h-8 bg-indigo-600 dark:bg-indigo-500 rounded-lg flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/30 mr-3">
            $
          </div>
          <span className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">Expensify</span>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <button 
            onClick={() => setViewMode('monthly')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${viewMode === 'monthly' ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
          >
            <DashboardIcon />
            Monthly Expenses
          </button>
          <button 
            onClick={() => setViewMode('yearly')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${viewMode === 'yearly' ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
          >
            <ChartIcon />
            Yearly Expenses
          </button>
          <button 
            onClick={() => setViewMode('regular')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${viewMode === 'regular' ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
          >
            <TemplatesIcon />
            Template Transactions
          </button>
          <button 
            onClick={() => setViewMode('categories')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${viewMode === 'categories' ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
          >
            <FolderIcon />
            Categories
          </button>
          <button 
            onClick={() => setViewMode('transactions')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${viewMode === 'transactions' ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
          >
            <ListIcon />
            All Transactions
          </button>
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-slate-700 space-y-2">
           <button 
              onClick={() => setViewMode('2fa-setup')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${viewMode === '2fa-setup' ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
            >
              <ShieldIcon />
              <span>Setup 2FA</span>
            </button>
           <button 
              onClick={toggleTheme}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
              <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
            </button>
            <button 
              onClick={onLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <LogoutIcon />
              <span>Sign Out</span>
            </button>
        </div>
      </aside>

      {/* --- Mobile Left Sidebar Menu --- */}
      <aside className={`md:hidden fixed inset-y-0 left-0 w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex-shrink-0 z-50 transform transition-transform duration-300 ease-in-out ${
        isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-indigo-600 dark:bg-indigo-500 rounded-lg flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/30 mr-3">
              $
            </div>
            <span className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">Expensify</span>
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="p-1 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <XIcon />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <button 
            onClick={() => {
              setViewMode('monthly');
              setIsMobileMenuOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${viewMode === 'monthly' ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
          >
            <DashboardIcon />
            Monthly Expenses
          </button>
          <button 
            onClick={() => {
              setViewMode('yearly');
              setIsMobileMenuOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${viewMode === 'yearly' ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
          >
            <ChartIcon />
            Yearly Expenses
          </button>
          <button 
            onClick={() => {
              setViewMode('regular');
              setIsMobileMenuOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${viewMode === 'regular' ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
          >
            <TemplatesIcon />
            Template Transactions
          </button>
          <button 
            onClick={() => {
              setViewMode('categories');
              setIsMobileMenuOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${viewMode === 'categories' ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
          >
            <FolderIcon />
            Categories
          </button>
          <button 
            onClick={() => {
              setViewMode('transactions');
              setIsMobileMenuOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${viewMode === 'transactions' ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
          >
            <ListIcon />
            All Transactions
          </button>
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-slate-700 space-y-2">
           <button 
              onClick={() => {
                setViewMode('2fa-setup');
                setIsMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${viewMode === '2fa-setup' ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
            >
              <ShieldIcon />
              <span>Setup 2FA</span>
            </button>
           <button 
              onClick={toggleTheme}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
              <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
            </button>
            <button 
              onClick={onLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <LogoutIcon />
              <span>Sign Out</span>
            </button>
        </div>
      </aside>

      {/* --- Mobile Menu Overlay --- */}
      {isMobileMenuOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/50 z-40 transition-opacity duration-300"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* --- Top Header (Mobile Only) --- */}
      <header className="md:hidden h-16 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-4 flex-shrink-0 z-20">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors -ml-2"
            >
              <MenuIcon />
            </button>
            <div className="w-8 h-8 bg-indigo-600 dark:bg-indigo-500 rounded-lg flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/30">
              $
            </div>
            <span className="font-bold text-slate-900 dark:text-white">Expensify</span>
          </div>
          <div className="flex items-center gap-2">
            <button 
                onClick={toggleTheme}
                className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors"
            >
                {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
            </button>
            <button 
                onClick={onLogout}
                className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors"
            >
                <LogoutIcon />
            </button>
          </div>
      </header>

      {/* --- Main Content Area --- */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Context Header (Desktop & Mobile) */}
        <header className="h-16 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-4 sm:px-6 lg:px-8 flex-shrink-0 z-10 sticky top-0">
           <div className="flex items-center">
                {viewMode === 'yearly' && <h2 className="text-xl font-bold text-slate-800 dark:text-white mr-4">Yearly Expenses</h2>}
                {viewMode === 'regular' && <h2 className="text-xl font-bold text-slate-800 dark:text-white mr-4">Template Transactions</h2>}
                {viewMode === 'categories' && <h2 className="text-xl font-bold text-slate-800 dark:text-white mr-4">Categories</h2>}
                {viewMode === 'transactions' && <h2 className="text-xl font-bold text-slate-800 dark:text-white mr-4">All Transactions</h2>}
                {viewMode === '2fa-setup' && <h2 className="text-xl font-bold text-slate-800 dark:text-white mr-4">Two-Factor Authentication</h2>}
           </div>

           <div className="flex items-center gap-2 sm:gap-3">
              {viewMode === 'monthly' && (
                <>
                  <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm">
                    <button
                      onClick={() => navigateMonth(-1)}
                      className="p-1.5 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-l-md transition-colors border-r border-slate-200 dark:border-slate-700"
                      title="Previous Month"
                    >
                      <ChevronLeftIcon />
                    </button>
                    
                    <div className="relative flex items-center justify-center px-3 py-1.5 min-w-[100px] hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                        <span className="text-sm font-medium text-slate-900 dark:text-white pointer-events-none">
                            {month}
                        </span>
                        <input 
                            ref={monthInputRef}
                            type="month" 
                            value={month} 
                            onChange={handleMonthChange}
                            onClick={(e) => {
                                try {
                                    // Explicitly show picker on click for consistent behavior across browsers
                                    if ('showPicker' in e.currentTarget) {
                                      e.currentTarget.showPicker();
                                    }
                                } catch(err) {
                                    // Fallback handled by browser
                                }
                            }}
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                            title="Select Month"
                        />
                    </div>

                    <button
                      onClick={() => navigateMonth(1)}
                      className="p-1.5 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-700 border-l border-slate-200 dark:border-slate-700 transition-colors"
                      title="Next Month"
                    >
                      <ChevronRightIcon />
                    </button>
                     <button
                      onClick={goToCurrentMonth}
                      className="p-1.5 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-r-md border-l border-slate-200 dark:border-slate-700 transition-colors"
                      title="Go to Current Month"
                    >
                      <CalendarIcon />
                    </button>
                  </div>

                  <button
                    onClick={openBulkModal}
                    className="hidden sm:flex items-center gap-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 px-3 py-1.5 rounded-md text-sm font-medium transition-colors shadow-sm"
                    title="Import Regular Transactions"
                  >
                    <DownloadIcon />
                    Import
                  </button>
                   <button
                    onClick={openBulkModal}
                    className="sm:hidden p-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm"
                  >
                    <DownloadIcon />
                  </button>
                  <button
                    onClick={openAddModal}
                    className="hidden sm:flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-md text-sm font-medium transition-colors shadow-sm"
                  >
                    <PlusIcon />
                    Add
                  </button>
                  <button
                    onClick={openAddModal}
                    className="sm:hidden p-2 bg-indigo-600 text-white rounded-md shadow-sm"
                  >
                    <PlusIcon />
                  </button>
                </>
              )}

              {viewMode === 'yearly' && (
                 <div className="flex items-center gap-2">
                    <label htmlFor="year-select" className="text-sm font-medium text-slate-600 dark:text-slate-300 hidden sm:inline">Select Year:</label>
                    <select 
                      id="year-select"
                      value={year}
                      onChange={(e) => setYear(e.target.value)}
                      className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white rounded-md px-3 py-1.5 text-sm w-32 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none cursor-pointer shadow-sm"
                    >
                        {availableYears.map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                </div>
              )}

              {viewMode === 'regular' && (
                  <>
                    <button
                        onClick={() => {
                            setEditingRegularTransaction(null);
                            setIsRegularModalOpen(true);
                        }}
                        className="hidden sm:flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-md text-sm font-medium transition-colors shadow-sm"
                    >
                        <PlusIcon />
                        Add Template
                    </button>
                    <button
                        onClick={() => {
                            setEditingRegularTransaction(null);
                            setIsRegularModalOpen(true);
                        }}
                        className="sm:hidden p-2 bg-indigo-600 text-white rounded-md shadow-sm"
                    >
                        <PlusIcon />
                    </button>
                  </>
              )}

              {viewMode === 'categories' && (
                  <>
                    <button
                        onClick={() => {
                            setEditingCategory(null);
                            setIsCategoryModalOpen(true);
                        }}
                        className="hidden sm:flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-md text-sm font-medium transition-colors shadow-sm"
                    >
                        <PlusIcon />
                        Add Category
                    </button>
                    <button
                        onClick={() => {
                            setEditingCategory(null);
                            setIsCategoryModalOpen(true);
                        }}
                        className="sm:hidden p-2 bg-indigo-600 text-white rounded-md shadow-sm"
                    >
                        <PlusIcon />
                    </button>
                  </>
              )}
           </div>
        </header>

        {/* Scrollable Body */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pb-8">
            {viewMode === 'yearly' && (
              <YearlyDashboard selectedYear={year} />
            )}
            
            {viewMode === 'regular' && (
              <RegularTransactionManager 
                onEdit={handleRegularEdit} 
                refreshTrigger={regularRefreshTrigger}
              />
            )}

            {viewMode === 'categories' && (
              <CategoryManager 
                onEdit={handleCategoryEdit} 
                refreshTrigger={categoryRefreshTrigger}
              />
            )}

            {viewMode === 'transactions' && (
              <TransactionManager theme={theme} />
            )}

            {viewMode === '2fa-setup' && (
              <div className="flex items-start justify-center py-8">
                <div className="w-full max-w-md">
                  <TwoFactorSetup 
                    onComplete={() => setViewMode('monthly')} 
                    onCancel={() => setViewMode('monthly')} 
                  />
                </div>
              </div>
            )}

            {viewMode === 'monthly' && (
              <>
                {/* Error State */}
                {error && (
                  <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 mb-6 rounded-r">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-red-700 dark:text-red-300">
                          {error}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Loading State Skeleton */}
                {loading ? (
                  <div className="animate-pulse space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {[1, 2, 3].map(i => <div key={i} className="h-32 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>)}
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="h-80 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
                      <div className="h-80 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <SummaryCard 
                        title="Monthly Overview" 
                        value={
                          <div className="flex flex-col gap-1">
                            <span className="text-lg">Expenses: ${expense.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            <span className={`text-sm font-semibold ${savings >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                              Savings: ${savings.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        }
                        icon={<DollarIcon />}
                        trend="Net Balance"
                        trendColor="text-slate-500 dark:text-slate-400"
                      />
                      <SummaryCard 
                        title="Top Expense Category" 
                        value={topCategory} 
                        icon={<TagIcon />}
                        trend={allocationData.some(d => d.name !== 'SAVINGS') ? `Total: $${topCategoryAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : 'No data'}
                        trendColor="text-indigo-600 dark:text-indigo-400"
                      />
                      <SummaryCard 
                        title="Target Daily Expense" 
                        value={
                            remainingDays <= 0 ? (
                               <span className="text-slate-400 text-xl font-semibold">Month Ended</span>
                            ) : dailyTarget < 0 ? (
                               <span className="text-red-500 dark:text-red-400 text-xl font-semibold">Over Budget</span>
                            ) : (
                               `$${dailyTarget.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                            )
                        } 
                        icon={<TargetIcon />}
                        trend={
                            isEditingTarget ? (
                                <div className="flex items-center gap-1 mt-1">
                                    <span className="text-xs text-slate-500 dark:text-slate-400">Target: $</span>
                                    <input 
                                        type="number" 
                                        value={tempTargetInput}
                                        onChange={(e) => setTempTargetInput(e.target.value)}
                                        className="w-20 px-1 py-0.5 text-xs border rounded bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-100 focus:ring-1 focus:ring-indigo-500 outline-none"
                                        autoFocus
                                        onBlur={() => {
                                            setTargetSavings(parseFloat(tempTargetInput) || 0);
                                            setIsEditingTarget(false);
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                setTargetSavings(parseFloat(tempTargetInput) || 0);
                                                setIsEditingTarget(false);
                                            }
                                        }}
                                    />
                                </div>
                            ) : (
                                <button 
                                    onClick={() => {
                                        setTempTargetInput(targetSavings.toString());
                                        setIsEditingTarget(true);
                                    }}
                                    className="flex items-center gap-1 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors focus:outline-none group"
                                    title="Click to edit target savings"
                                >
                                    <span>Target Savings: ${targetSavings.toLocaleString()}</span>
                                    <svg className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                    </svg>
                                </button>
                            )
                        }
                        trendColor="text-indigo-600 dark:text-indigo-400"
                      />
                    </div>

                    {/* Income Flow Sankey Diagram - Full Width */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 transition-all">
                      <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6">Income Flow</h3>
                      <div ref={sankeyContainerRef} className="w-full flex items-center justify-center">
                        <SankeyChart
                          nodes={monthlySankeyData.nodes}
                          links={monthlySankeyData.links}
                          width={sankeyWidth}
                          height={500}
                        />
                      </div>
                    </div>

                    {/* Daily Spending Trend */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 transition-all">
                      <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6">Daily Spending Trend</h3>
                      <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={dateData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <defs>
                              <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={chartColors.areaGradientStart} stopOpacity={0.8}/>
                                <stop offset="95%" stopColor={chartColors.areaGradientStart} stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.grid} />
                            <XAxis 
                              dataKey="date" 
                              tickFormatter={(val) => val.split('-')[2]} 
                              axisLine={false}
                              tickLine={false}
                              tick={{ fill: chartColors.text, fontSize: 12 }}
                              dy={10}
                            />
                            <YAxis 
                              axisLine={false} 
                              tickLine={false}
                              tick={{ fill: chartColors.text, fontSize: 12 }}
                              tickFormatter={(val) => `$${val}`}
                            />
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: chartColors.tooltipBg,
                                borderColor: chartColors.grid,
                                borderRadius: '8px', 
                                color: chartColors.tooltipText,
                                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' 
                              }}
                              itemStyle={{ color: chartColors.tooltipText }}
                              formatter={(value: number) => [`$${value.toFixed(2)}`, 'Spent']}
                            />
                            <Area 
                              type="monotone" 
                              dataKey="amount" 
                              stroke={chartColors.areaStroke} 
                              fillOpacity={1} 
                              fill="url(#colorAmount)" 
                              strokeWidth={2} 
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Transaction List */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden transition-all">
                      <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white">Transaction History</h3>
                      </div>
                      <TransactionTable 
                        transactions={transactions} 
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                      />
                    </div>
                  </div>
                )}

                <AddTransactionModal 
                  isOpen={isModalOpen} 
                  onClose={() => setIsModalOpen(false)} 
                  onSuccess={handleTransactionSaved}
                  transactionToEdit={editingTransaction}
                />

                <BulkImportModal 
                  isOpen={isBulkModalOpen}
                  onClose={() => setIsBulkModalOpen(false)}
                  onSuccess={handleTransactionSaved}
                  targetMonth={month}
                />
              </>
            )}
        </main>
      </div>

      <AddRegularTransactionModal 
        isOpen={isRegularModalOpen}
        onClose={() => setIsRegularModalOpen(false)}
        onSuccess={handleRegularSuccess}
        transactionToEdit={editingRegularTransaction}
      />

      <AddCategoryModal 
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        onSuccess={handleCategorySuccess}
        categoryToEdit={editingCategory}
      />


    </div>
  );
};

const App: React.FC = () => {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const handleLogin = (userData: any) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  if (!user) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return <Dashboard user={user} onLogout={handleLogout} />;
};

export default App;