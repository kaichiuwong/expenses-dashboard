import React, { useState, useEffect } from 'react';
import { fetchRegularTransactions, addBulkTransactions } from '../services/api';
import { RegularTransaction, BulkCreateTransactionPayload } from '../types';

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  targetMonth: string; // YYYY-MM
}

export const BulkImportModal: React.FC<BulkImportModalProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess,
  targetMonth
}) => {
  const [transactions, setTransactions] = useState<RegularTransaction[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadRegularTransactions();
    }
  }, [isOpen]);

  const loadRegularTransactions = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchRegularTransactions();
      const regs = data.regularTransactions || [];
      setTransactions(regs);
      // Select all by default
      setSelectedIds(new Set(regs.map(t => t.id)));
    } catch (err: any) {
      console.error('Failed to load regular transactions', err);
      setError('Failed to load templates. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleImport = async () => {
    if (selectedIds.size === 0) {
      setError("Please select at least one transaction to import.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Calculate first day of the target month
      const trx_date = `${targetMonth}-01`;

      const payload: BulkCreateTransactionPayload['transaction'] = transactions
        .filter(t => selectedIds.has(t.id))
        .map(t => ({
          category_name: t.category.name,
          amount: t.amount,
          trx_date: trx_date,
          name: t.name
        }));

      await addBulkTransactions(payload);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to import transactions.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-opacity">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-2xl w-full overflow-hidden border border-slate-100 dark:border-slate-700 flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white">
            Import Regular Transactions
          </h3>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>

        <div className="p-4 flex-1 overflow-y-auto">
          {error && (
            <div className="mb-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300 text-sm p-3 rounded-lg">
              {error}
            </div>
          )}

          <p className="mb-4 text-sm text-slate-600 dark:text-slate-300">
            Select transactions to import for <strong>{targetMonth}</strong>. All dates will be set to the 1st of the month.
          </p>

          {isLoading ? (
            <div className="space-y-3 animate-pulse">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-12 bg-slate-100 dark:bg-slate-700 rounded-lg"></div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {transactions.length === 0 ? (
                 <p className="text-center text-slate-500 py-8">No regular transactions found.</p>
              ) : (
                transactions.map((t) => (
                  <label 
                    key={t.id} 
                    className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedIds.has(t.id) 
                        ? 'border-indigo-200 bg-indigo-50 dark:bg-indigo-900/20 dark:border-indigo-800' 
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.has(t.id)}
                      onChange={() => toggleSelection(t.id)}
                      className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                    />
                    <div className="ml-3 flex-1 grid grid-cols-2 gap-2">
                      <div>
                        <div className="font-medium text-slate-900 dark:text-slate-200">{t.name}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 uppercase">{t.category.name}</div>
                      </div>
                      <div className={`text-right font-semibold ${t.amount < 0 ? 'text-green-600 dark:text-green-400' : 'text-slate-700 dark:text-slate-300'}`}>
                        ${Math.abs(t.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        <span className="text-xs font-normal ml-1 text-slate-500">
                           {t.amount < 0 ? '(Inc)' : '(Exp)'}
                        </span>
                      </div>
                    </div>
                  </label>
                ))
              )}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={isSubmitting || isLoading || selectedIds.size === 0}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Importing...' : `Import Selected (${selectedIds.size})`}
          </button>
        </div>
      </div>
    </div>
  );
};