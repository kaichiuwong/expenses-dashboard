import React from 'react';

interface SummaryCardProps {
  title: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  trend?: string;
  trendColor?: string;
}

export const SummaryCard: React.FC<SummaryCardProps> = ({ title, value, icon, trend, trendColor }) => {
  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-start justify-between transition-all hover:shadow-md h-full">
      <div className="flex-1">
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">{title}</p>
        <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{value}</div>
        {trend && (
          <p className={`text-xs mt-2 font-medium ${trendColor || 'text-slate-400 dark:text-slate-500'}`}>
            {trend}
          </p>
        )}
      </div>
      {icon && (
        <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400 ml-4">
          {icon}
        </div>
      )}
    </div>
  );
};