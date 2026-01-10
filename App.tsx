import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { 
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area
} from 'recharts';
import { fetchTransactions, deleteTransaction } from './services/api';
import { Transaction } from './types';
import { 
  calculateTotalExpenses, 
  getExpensesByCategory, 
  getExpensesByDate, 
  getExpensesByWeekday 
} from './utils/analytics';
import { SummaryCard } from './components/SummaryCard';
import { TransactionTable } from './components/TransactionTable';
import { AddTransactionModal } from './components/AddTransactionModal';
import { useTheme } from './hooks/useTheme';

// Icons
const DollarIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 18V6"/></svg>
);
const TagIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z"/><path d="M7 7h.01"/></svg>
);
const CalendarIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
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

const App: React.FC = () => {
  const [month, setMonth] = useState('2026-01');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  
  const { theme, toggleTheme } = useTheme();

  const loadData = useCallback(async () => {
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
  }, [month]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Analytics
  const totalExpenses = useMemo(() => calculateTotalExpenses(transactions), [transactions]);
  const categoryData = useMemo(() => getExpensesByCategory(transactions), [transactions]);
  const dateData = useMemo(() => getExpensesByDate(transactions), [transactions]);
  const weekdayData = useMemo(() => getExpensesByWeekday(transactions), [transactions]);

  const topCategory = categoryData.length > 0 ? categoryData[0].name : 'N/A';
  const topCategoryAmount = categoryData.length > 0 ? categoryData[0].value : 0;
  const transactionCount = transactions.length;

  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMonth(e.target.value);
  };

  const handleTransactionSaved = () => {
    loadData();
  };

  const openAddModal = () => {
    setEditingTransaction(null);
    setIsModalOpen(true);
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

  // Chart Styling based on theme
  const chartColors = {
    grid: theme === 'dark' ? '#334155' : '#f1f5f9',
    text: theme === 'dark' ? '#94a3b8' : '#64748b',
    tooltipBg: theme === 'dark' ? '#1e293b' : '#ffffff',
    tooltipText: theme === 'dark' ? '#f8fafc' : '#1e293b',
    areaGradientStart: theme === 'dark' ? '#818cf8' : '#6366f1',
    areaStroke: theme === 'dark' ? '#818cf8' : '#6366f1',
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 pb-20 transition-colors duration-200">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 dark:bg-indigo-500 rounded-lg flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/30">
              $
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white hidden sm:block">Expenses Dashboard</h1>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white sm:hidden">Expenses</h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
             <div className="flex items-center gap-2">
              <input 
                type="month" 
                id="month" 
                value={month} 
                onChange={handleMonthChange}
                className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white rounded-md px-2 sm:px-3 py-1.5 text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none shadow-sm transition-colors"
              />
            </div>
            
            <button
              onClick={openAddModal}
              className="hidden sm:flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-md text-sm font-medium transition-colors shadow-sm"
            >
              <PlusIcon />
              Add
            </button>
            <button
              onClick={openAddModal}
              className="sm:hidden flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white p-1.5 rounded-md text-sm font-medium transition-colors shadow-sm"
              aria-label="Add Transaction"
            >
              <PlusIcon />
            </button>

            <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1"></div>
            
            <button 
              onClick={toggleTheme}
              className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors"
              aria-label="Toggle Dark Mode"
            >
              {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
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
                title="Total Expenses" 
                value={`$${totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} 
                icon={<DollarIcon />}
                trend="For selected month"
                trendColor="text-slate-500 dark:text-slate-400"
              />
              <SummaryCard 
                title="Top Category" 
                value={topCategory} 
                icon={<TagIcon />}
                trend={categoryData.length > 0 ? `Total: $${topCategoryAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : 'No data'}
                trendColor="text-indigo-600 dark:text-indigo-400"
              />
              <SummaryCard 
                title="Total Transactions" 
                value={transactionCount.toString()} 
                icon={<CalendarIcon />}
                trend="Recorded entries"
                trendColor="text-slate-500 dark:text-slate-400"
              />
            </div>

            {/* Main Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Daily Trend */}
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

              {/* Category Pie */}
              <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 transition-all">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6">Expenses by Category</h3>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: chartColors.tooltipBg,
                          borderColor: chartColors.grid,
                          borderRadius: '8px', 
                          color: chartColors.tooltipText,
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' 
                        }}
                        itemStyle={{ color: chartColors.tooltipText }}
                        formatter={(value: number) => [`$${value.toFixed(2)}`, 'Amount']}
                      />
                      <Legend 
                        layout="vertical" 
                        verticalAlign="middle" 
                        align="right"
                        iconType="circle"
                        formatter={(value) => <span style={{ color: chartColors.text }}>{value}</span>}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Weekday Analysis */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 transition-all">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6">Spending by Day of Week</h3>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weekdayData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.grid} />
                    <XAxis 
                      dataKey="name" 
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
                      cursor={{ fill: theme === 'dark' ? '#334155' : '#f8fafc' }}
                      contentStyle={{ 
                        backgroundColor: chartColors.tooltipBg,
                        borderColor: chartColors.grid,
                        borderRadius: '8px', 
                        color: chartColors.tooltipText,
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' 
                      }}
                      itemStyle={{ color: chartColors.tooltipText }}
                      formatter={(value: number) => [`$${value.toFixed(2)}`, 'Total']}
                    />
                    <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={40} />
                  </BarChart>
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
      </main>
    </div>
  );
};

export default App;