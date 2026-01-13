import React, { useState, useEffect, useMemo } from 'react';
import { Transaction } from '../types';
import { fetchAllTransactions, deleteTransaction } from '../services/api';
import { AddTransactionModal } from './AddTransactionModal';

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

const ChevronUpIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"/></svg>
);

const ChevronDownIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
);

const EditIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
);

const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
);

type SortField = 'date' | 'category' | 'name' | 'amount';
type SortDirection = 'asc' | 'desc';

export const TransactionManager: React.FC<TransactionManagerProps> = ({ theme }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // Fetch all transactions
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

  useEffect(() => {
    loadAllTransactions();
  }, []);

  // Handle edit transaction
  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setIsModalOpen(true);
  };

  // Handle delete transaction
  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this transaction?')) {
      try {
        await deleteTransaction(id);
        loadAllTransactions();
      } catch (err: any) {
        alert(`Failed to delete: ${err.message}`);
      }
    }
  };

  // Handle transaction saved/updated
  const handleTransactionSaved = () => {
    setIsModalOpen(false);
    setEditingTransaction(null);
    loadAllTransactions();
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
      <div className="animate-pulse space-y-4">
        {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-16 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>)}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 mb-6 rounded-r">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Collapsible Card */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
        {/* Card Header - Collapsible */}
        <div className="border-b border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Transaction Manager</h2>
              <span className="text-sm text-slate-500 dark:text-slate-400">
                ({summaryStats.count.toLocaleString()} transactions)
              </span>
            </div>
            {isCollapsed ? <ChevronDownIcon /> : <ChevronUpIcon />}
          </button>

          {/* Expanded Header Content */}
          {!isCollapsed && (
            <div className="px-6 pb-4 space-y-4">
              {/* Search Section */}
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                {/* Search Bar */}
                <div className="relative flex-1 w-full sm:max-w-md">
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
                
                {/* Export Button */}
                <button
                  onClick={handleExportCSV}
                  disabled={sortedTransactions.length === 0}
                  className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-indigo-600 dark:bg-indigo-500 text-white rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium whitespace-nowrap text-sm sm:text-base"
                >
                  <DownloadIcon />
                  <span className="hidden sm:inline">Export CSV</span>
                  <span className="sm:hidden">Export</span>
                </button>
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
          )}
        </div>

        {/* Transaction Table - Only shown when not collapsed */}
        {!isCollapsed && (
          <div className="overflow-x-auto">
            {sortedTransactions.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-slate-500 dark:text-slate-400 text-lg">
                  {searchQuery ? 'No transactions match your search' : 'No transactions found'}
                </p>
              </div>
            ) : (
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
                    <th 
                      scope="col" 
                      className="px-6 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider"
                    >
                      Actions
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
                      <tr key={transaction.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group">
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
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => handleEdit(transaction)}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-md transition-colors"
                              title="Edit"
                            >
                              <EditIcon />
                            </button>
                            <button 
                              onClick={() => handleDelete(transaction.id)}
                              className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md transition-colors"
                              title="Delete"
                            >
                              <TrashIcon />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Add/Edit Transaction Modal */}
      {isModalOpen && (
        <AddTransactionModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingTransaction(null);
          }}
          onSuccess={handleTransactionSaved}
          transactionToEdit={editingTransaction}
        />
      )}
    </div>
  );
};
