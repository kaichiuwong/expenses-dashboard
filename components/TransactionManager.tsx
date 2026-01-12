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

export const TransactionManager: React.FC<TransactionManagerProps> = ({ theme }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

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

  // Sort transactions by date descending
  const sortedTransactions = useMemo(() => {
    return [...filteredTransactions].sort((a, b) => 
      new Date(b.trx_date).getTime() - new Date(a.trx_date).getTime()
    );
  }, [filteredTransactions]);

  // Export to CSV
  const handleExportCSV = () => {
    if (sortedTransactions.length === 0) {
      alert('No transactions to export');
      return;
    }

    // Create CSV content
    const headers = ['Date', 'Category', 'Name', 'Amount'];
    const csvRows = [
      headers.join(','),
      ...sortedTransactions.map(t => [
        t.trx_date,
        `"${t.category.name.replace(/"/g, '""')}"`,
        `"${t.name.replace(/"/g, '""')}"`, // Escape quotes in name
        t.amount.toFixed(2)
      ].join(','))
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
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Transaction Manager</h1>
          
          {/* Search and Export Section */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
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
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 dark:bg-indigo-500 text-white rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium whitespace-nowrap"
            >
              <DownloadIcon />
              Export CSV
            </button>
          </div>

          {/* Summary Stats */}
          <div className="mt-4 grid grid-cols-3 gap-4">
            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3">
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide mb-1">
                Total Transactions
              </div>
              <div className="text-xl font-bold text-slate-900 dark:text-white">
                {summaryStats.count.toLocaleString()}
              </div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3">
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide mb-1">
                Total Amount
              </div>
              <div className="text-xl font-bold text-slate-900 dark:text-white">
                ${summaryStats.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3">
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide mb-1">
                Average Amount
              </div>
              <div className="text-xl font-bold text-slate-900 dark:text-white">
                ${summaryStats.average.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction Table */}
      <div className="flex-1 overflow-auto px-6 py-4">
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
                      <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Date
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Category
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Name
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                    {sortedTransactions.map((transaction) => {
                      const isPositive = transaction.amount > 0;
                      const amountColorClass = isPositive 
                        ? 'text-red-600 dark:text-red-400' 
                        : 'text-green-600 dark:text-green-400';
                      
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
                            ${transaction.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
