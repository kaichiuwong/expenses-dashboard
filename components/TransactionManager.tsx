import React, { useState, useEffect, useMemo } from 'react';
import { Transaction } from '../types';
import { fetchAllTransactions } from '../services/api';

interface TransactionManagerProps {
  theme: string;
}

const SearchIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
);

const DownloadIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
);

const XCircleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>
);

const ArrowUpIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"/></svg>
);

const ArrowDownIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
);

type SortField = 'date' | 'category' | 'name' | 'amount';
type SortDirection = 'asc' | 'desc';

export const TransactionManager: React.FC<TransactionManagerProps> = ({ theme }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false);
  const [isHeaderManuallyExpanded, setIsHeaderManuallyExpanded] = useState(false);
  const tableContainerRef = React.useRef<HTMLDivElement>(null);

  // Fetch all transactions
  useEffect(() => {
    const loadAllTransactions = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchAllTransactions();
        setTransactions(data.transactions || []);
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Failed to fetch transactions');
      } finally {
        setLoading(false);
      }
    };

    loadAllTransactions();
  }, []);

  // Handle scroll for collapsible header (mobile only)
  useEffect(() => {
    const container = tableContainerRef.current;
    if (!container) return;

    let lastScrollTop = 0;
    const handleScroll = () => {
      // Only apply on mobile screens
      if (window.innerWidth >= 768) {
        setIsHeaderCollapsed(false);
        return;
      }

      const scrollTop = container.scrollTop;
      
      // If manually expanded, don't auto-collapse
      if (isHeaderManuallyExpanded) return;

      // Collapse when scrolling down past 50px
      if (scrollTop > 50 && scrollTop > lastScrollTop) {
        setIsHeaderCollapsed(true);
      } else if (scrollTop < 20) {
        // Expand when near top
        setIsHeaderCollapsed(false);
      }
      
      lastScrollTop = scrollTop;
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [isHeaderManuallyExpanded]);

  // Toggle header expansion
  const toggleHeaderExpansion = () => {
    if (isHeaderCollapsed) {
      setIsHeaderCollapsed(false);
      setIsHeaderManuallyExpanded(true);
      // Reset manual expansion after 2 seconds
      setTimeout(() => setIsHeaderManuallyExpanded(false), 2000);
    }
  };

  // Filter transactions based on search query
  const filteredTransactions = useMemo(() => {
    if (!searchQuery.trim()) {
      return transactions;
    }

    const query = searchQuery.toLowerCase();
    return transactions.filter((t) => {
      return (
        t.name.toLowerCase().includes(query) ||
        t.category.name.toLowerCase().includes(query) ||
        t.trx_date.includes(query) ||
        t.amount.toString().includes(query)
      );
    });
  }, [transactions, searchQuery]);

  // Handle column sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Sort transactions based on current sort field and direction
  const sortedTransactions = useMemo(() => {
    return [...filteredTransactions].sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'date':
          comparison = new Date(a.trx_date).getTime() - new Date(b.trx_date).getTime();
          break;
        case 'category':
          comparison = a.category.name.localeCompare(b.category.name);
          break;
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'amount':
          comparison = Math.abs(a.amount) - Math.abs(b.amount);
          break;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredTransactions, sortField, sortDirection]);

  // Export to CSV
  const handleExportCSV = () => {
    if (sortedTransactions.length === 0) {
      alert('No transactions to export');
      return;
    }

    // Create CSV content
    const headers = ['Date', 'Category', 'Name', 'Amount', 'Type'];
    const csvRows = [
      headers.join(','),
      ...sortedTransactions.map(t => {
        const absAmount = Math.abs(t.amount).toFixed(2);
        const type = t.amount > 0 ? 'DR' : t.amount < 0 ? 'CR' : '';
        return [
          t.trx_date,
          `"${t.category.name.replace(/"/g, '""')}"`,
          `"${t.name.replace(/"/g, '""')}"`,
          absAmount,
          type
        ].join(',');
      })
    ];

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    // Create download link
    const link = document.createElement('a');
    link.href = url;
    link.download = `transactions_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    const total = filteredTransactions.reduce((sum, t) => sum + t.amount, 0);
    const count = filteredTransactions.length;
    const average = count > 0 ? total / count : 0;

    return { total, count, average };
  }, [filteredTransactions]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 dark:border-indigo-400 mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Loading transactions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center bg-red-50 dark:bg-red-900/20 p-6 rounded-lg">
          <p className="text-red-600 dark:text-red-400 font-medium mb-2">Error loading transactions</p>
          <p className="text-sm text-red-500 dark:text-red-300">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-900">
      <div 
        className={`bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 transition-all duration-300 ${
          isHeaderCollapsed ? 'py-2 cursor-pointer' : 'py-4'
        }`}
        onClick={isHeaderCollapsed ? toggleHeaderExpansion : undefined}
      >
        <div className="max-w-7xl mx-auto">
          {/* Title and Export Button */}
          <div className="flex items-center justify-between mb-4">
            <h1 className={`font-bold text-slate-900 dark:text-white transition-all duration-300 ${
              isHeaderCollapsed ? 'text-lg' : 'text-2xl'
            }`}>
              Transaction Manager
            </h1>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleExportCSV();
              }}
              disabled={sortedTransactions.length === 0}
              className={`flex items-center gap-2 bg-indigo-600 dark:bg-indigo-500 text-white rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-medium whitespace-nowrap ${
                isHeaderCollapsed ? 'px-3 py-1 text-sm' : 'px-4 py-2'
              }`}
            >
              <DownloadIcon />
              <span className={isHeaderCollapsed ? 'hidden sm:inline' : ''}>Export CSV</span>
            </button>
          </div>
          
          {/* Collapsible Content */}
          <div className={`transition-all duration-300 overflow-hidden ${
            isHeaderCollapsed ? 'max-h-0 opacity-0' : 'max-h-[500px] opacity-100'
          }`}>
            {/* Search Bar */}
            <div className="mb-4">
              <div className="relative w-full sm:max-w-md">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <SearchIcon />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name, category, date, or amount..."
                  className="w-full pl-10 pr-10 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent transition-colors"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  >
                    <XCircleIcon />
                  </button>
                )}
              </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3">
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide mb-1">
                Total Transactions
              </div>
              <div className="text-xl font-bold text-slate-900 dark:text-white break-words">
                {summaryStats.count.toLocaleString()}
              </div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3">
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide mb-1">
                Total Amount
              </div>
              <div className={`text-xl font-bold break-words ${
                summaryStats.total > 0 
                  ? 'text-red-600 dark:text-red-400' 
                  : summaryStats.total < 0 
                  ? 'text-green-600 dark:text-green-400' 
                  : 'text-slate-900 dark:text-white'
              }`}>
                ${Math.abs(summaryStats.total).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                {summaryStats.total > 0 ? ' DR' : summaryStats.total < 0 ? ' CR' : ''}
              </div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3">
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide mb-1">
                Average Amount
              </div>
              <div className={`text-xl font-bold break-words ${
                summaryStats.average > 0 
                  ? 'text-red-600 dark:text-red-400' 
                  : summaryStats.average < 0 
                  ? 'text-green-600 dark:text-green-400' 
                  : 'text-slate-900 dark:text-white'
              }`}>
                ${Math.abs(summaryStats.average).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                {summaryStats.average > 0 ? ' DR' : summaryStats.average < 0 ? ' CR' : ''}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction Table */}
      <div ref={tableContainerRef} className="flex-1 overflow-auto px-6 py-4">
        <div className="max-w-7xl mx-auto">
          {sortedTransactions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-500 dark:text-slate-400 text-lg">
                {searchQuery ? 'No transactions match your search' : 'No transactions found'}
              </p>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                  <thead className="bg-slate-50 dark:bg-slate-700/50">
                    <tr>
                      <th 
                        scope="col" 
                        className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 select-none"
                        onClick={() => handleSort('date')}
                      >
                        <div className="flex items-center gap-1">
                          Date
                          {sortField === 'date' && (
                            sortDirection === 'asc' ? <ArrowUpIcon /> : <ArrowDownIcon />
                          )}
                        </div>
                      </th>
                      <th 
                        scope="col" 
                        className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 select-none"
                        onClick={() => handleSort('category')}
                      >
                        <div className="flex items-center gap-1">
                          Category
                          {sortField === 'category' && (
                            sortDirection === 'asc' ? <ArrowUpIcon /> : <ArrowDownIcon />
                          )}
                        </div>
                      </th>
                      <th 
                        scope="col" 
                        className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 select-none"
                        onClick={() => handleSort('name')}
                      >
                        <div className="flex items-center gap-1">
                          Name
                          {sortField === 'name' && (
                            sortDirection === 'asc' ? <ArrowUpIcon /> : <ArrowDownIcon />
                          )}
                        </div>
                      </th>
                      <th 
                        scope="col" 
                        className="px-6 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 select-none"
                        onClick={() => handleSort('amount')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          Amount
                          {sortField === 'amount' && (
                            sortDirection === 'asc' ? <ArrowUpIcon /> : <ArrowDownIcon />
                          )}
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                    {sortedTransactions.map((transaction) => {
                      const isPositive = transaction.amount > 0;
                      const isNegative = transaction.amount < 0;
                      const absAmount = Math.abs(transaction.amount);
                      const amountColorClass = isPositive 
                        ? 'text-red-600 dark:text-red-400' 
                        : isNegative
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-slate-800 dark:text-slate-100';
                      
                      const displayAmount = `$${absAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                      const typeLabel = isPositive ? ' DR' : isNegative ? ' CR' : '';
                      
                      return (
                        <tr key={transaction.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-600 dark:text-slate-300">
                            {transaction.trx_date}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                              {transaction.category.name}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-800 dark:text-slate-200 font-medium">
                            {transaction.name}
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap text-right text-sm font-bold ${amountColorClass}`}>
                            {displayAmount}{typeLabel}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
