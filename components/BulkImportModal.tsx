import React, { useState, useEffect } from 'react';
import { fetchRegularTransactions, addBulkTransactions, fetchExchangeRate } from '../services/api';
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
  const [editedAmounts, setEditedAmounts] = useState<Record<string, string>>({});
  const [rates, setRates] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // 1. Fetch Transactions
      const data = await fetchRegularTransactions();
      const regs = data.regularTransactions || [];
      setTransactions(regs);
      
      // 2. Initialize Selection and Amounts
      setSelectedIds(new Set(regs.map(t => t.id)));
      
      const initialAmounts: Record<string, string> = {};
      regs.forEach(t => {
        initialAmounts[t.id] = t.amount.toString();
      });
      setEditedAmounts(initialAmounts);

      // 3. Identify Currencies and Fetch Rates
      const uniqueCurrencies = Array.from(new Set(regs.map(t => t.ccy || 'AUD').filter(c => c !== 'AUD')));
      
      const ratesMap: Record<string, number> = {};
      await Promise.all(uniqueCurrencies.map(async (code) => {
        try {
            const rate = await fetchExchangeRate(code);
            ratesMap[code] = rate;
        } catch (e) {
            console.warn(`Could not fetch rate for ${code}`, e);
            ratesMap[code] = 1; // Fallback
        }
      }));
      setRates(ratesMap);

    } catch (err: any) {
      console.error('Failed to load data', err);
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

  const handleAmountChange = (id: string, value: string) => {
    setEditedAmounts(prev => ({
      ...prev,
      [id]: value
    }));
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
        .map(t => {
          const ccy = t.ccy || 'AUD';
          const rate = ccy === 'AUD' ? 1 : (rates[ccy] || 1);
          const rawAmount = parseFloat(editedAmounts[t.id] || '0');
          
          // Convert to AUD
          const finalAmount = rawAmount * rate;

          return {
            category_name: t.category.name,
            // Round to 2 decimal places for storage
            amount: Math.round(finalAmount * 100) / 100,
            trx_date: trx_date,
            name: t.name.toUpperCase()
          };
        });

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
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-3xl w-full overflow-hidden border border-slate-100 dark:border-slate-700 flex flex-col max-h-[90vh]">
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
            <br/>You can edit amounts before importing. <strong>Foreign currencies will be converted to AUD.</strong>
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
                transactions.map((t) => {
                  const ccy = t.ccy || 'AUD';
                  const isForeign = ccy !== 'AUD';
                  const rate = rates[ccy] || 1;
                  const currentAmount = parseFloat(editedAmounts[t.id] || '0');
                  const convertedAmount = currentAmount * rate;

                  return (
                    <label 
                      key={t.id} 
                      className={`flex flex-col sm:flex-row sm:items-center p-3 rounded-lg border cursor-pointer transition-colors gap-3 ${
                        selectedIds.has(t.id) 
                          ? 'border-indigo-200 bg-indigo-50 dark:bg-indigo-900/20 dark:border-indigo-800' 
                          : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                      }`}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(t.id)}
                          onChange={() => toggleSelection(t.id)}
                          className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 flex-shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="font-medium text-slate-900 dark:text-slate-200 truncate pr-2">{t.name}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 uppercase">{t.category.name}</div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col sm:items-end gap-1 ml-7 sm:ml-0">
                         <div className="flex items-center gap-2">
                           <span className="text-xs text-slate-400 font-medium whitespace-nowrap">
                             {ccy}:
                           </span>
                           <input 
                              type="number" 
                              step="0.01"
                              value={editedAmounts[t.id] || 0}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => handleAmountChange(t.id, e.target.value)}
                              className="w-24 px-2 py-1 text-right text-sm border rounded bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors"
                           />
                         </div>
                         {isForeign && (
                           <div className="text-xs text-slate-500 dark:text-slate-400 text-right">
                             ≈ {convertedAmount.toLocaleString('en-US', { style: 'currency', currency: 'AUD' })} 
                             <span className="opacity-75 ml-1">(@ {rate.toFixed(4)})</span>
                           </div>
                         )}
                      </div>
                    </label>
                  );
                })
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