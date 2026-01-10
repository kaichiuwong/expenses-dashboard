import React from 'react';
import { Transaction } from '../types';

interface TransactionTableProps {
  transactions: Transaction[];
}

export const TransactionTable: React.FC<TransactionTableProps> = ({ transactions }) => {
  // Sort by date desc
  const sorted = [...transactions].sort((a, b) => 
    new Date(b.trx_date).getTime() - new Date(a.trx_date).getTime()
  );

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm whitespace-nowrap">
        <thead className="uppercase tracking-wider border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
          <tr>
            <th scope="col" className="px-6 py-4 font-semibold text-slate-500 dark:text-slate-400">Date</th>
            <th scope="col" className="px-6 py-4 font-semibold text-slate-500 dark:text-slate-400">Name</th>
            <th scope="col" className="px-6 py-4 font-semibold text-slate-500 dark:text-slate-400">Category</th>
            <th scope="col" className="px-6 py-4 font-semibold text-slate-500 dark:text-slate-400 text-right">Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
          {sorted.map((t) => (
            <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
              <td className="px-6 py-4 font-medium text-slate-600 dark:text-slate-300">{t.trx_date}</td>
              <td className="px-6 py-4 text-slate-800 dark:text-slate-200 font-medium">{t.name}</td>
              <td className="px-6 py-4">
                <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                  {t.category.name}
                </span>
              </td>
              <td className="px-6 py-4 text-right font-bold text-slate-800 dark:text-slate-100">
                ${t.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </td>
            </tr>
          ))}
          {sorted.length === 0 && (
            <tr>
              <td colSpan={4} className="px-6 py-8 text-center text-slate-400 dark:text-slate-500">
                No transactions found for this period.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};