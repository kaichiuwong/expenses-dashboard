import React, { useEffect, useState, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell
} from 'recharts';
import { fetchYearlySummary } from '../services/api';
import { YearlySummaryResponse } from '../types';
import { SummaryCard } from './SummaryCard';
import { COLORS } from '../utils/analytics';

interface YearlyDashboardProps {
  initialYear: string;
}

const DollarIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 18V6"/></svg>
);

const TrendingUpIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
);

const PieChartIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>
);

const PercentIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>
);

export const YearlyDashboard: React.FC<YearlyDashboardProps> = ({ initialYear }) => {
  const [year, setYear] = useState(initialYear);
  const [data, setData] = useState<YearlySummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadYearlyData = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await fetchYearlySummary(year);
        setData(result);
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Failed to fetch yearly summary');
      } finally {
        setLoading(false);
      }
    };

    loadYearlyData();
  }, [year]);

  const chartData = useMemo(() => {
    if (!data) return [];
    return data.monthly_breakdown.map(m => ({
      month: m.month,
      income: m.total_salary,
      expense: m.total_expenses,
      savings: m.total_savings
    }));
  }, [data]);

  const pieData = useMemo(() => {
    if (!data) return [];
    return data.yearly_expenses_by_category.map((c, index) => ({
      name: c.category_name,
      value: c.total,
      percentage: c.percentage,
      color: COLORS[index % COLORS.length]
    })).sort((a, b) => b.value - a.value);
  }, [data]);

  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    // Create a range of years, e.g., 5 years back and 2 years forward
    const years = [];
    for (let i = currentYear - 5; i <= currentYear + 2; i++) {
        years.push(i);
    }
    
    // Ensure the current selected year is included if it's outside the range
    const selectedYearInt = parseInt(year);
    if (!isNaN(selectedYearInt) && !years.includes(selectedYearInt)) {
        years.push(selectedYearInt);
    }
    
    // Sort descending
    return years.sort((a, b) => b - a);
  }, [year]);

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setYear(e.target.value);
  };

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
      <div className="flex items-center justify-between bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
        <h2 className="text-lg font-bold text-slate-800 dark:text-white">Yearly Overview: {year}</h2>
        <div className="flex items-center gap-2">
            <label htmlFor="year-select" className="text-sm font-medium text-slate-600 dark:text-slate-300">Select Year:</label>
            <select 
              id="year-select"
              value={year}
              onChange={handleYearChange}
              className="bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white rounded-md px-3 py-1.5 text-sm w-32 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none cursor-pointer"
            >
                {availableYears.map(y => (
                    <option key={y} value={y}>{y}</option>
                ))}
            </select>
        </div>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
             {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>)}
          </div>
          <div className="h-96 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
        </div>
      ) : data && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <SummaryCard 
              title="Total Income" 
              value={`$${data.yearly_total_income.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
              icon={<DollarIcon />}
              trend="Yearly Earnings"
              trendColor="text-green-600 dark:text-green-400"
            />
            <SummaryCard 
              title="Total Expenses" 
              value={`$${data.yearly_total_expenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
              icon={<TrendingUpIcon />}
              trend="Yearly Spending"
              trendColor="text-red-600 dark:text-red-400"
            />
            <SummaryCard 
              title="Total Savings" 
              value={`$${data.yearly_total_savings.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
              icon={<PieChartIcon />}
              trend={data.yearly_total_savings >= 0 ? "Net Positive" : "Net Negative"}
              trendColor={data.yearly_total_savings >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}
            />
             <SummaryCard 
              title="Savings Rate" 
              value={`${data.yearly_savings_percentage.toFixed(1)}%`}
              icon={<PercentIcon />}
              trend="Of Total Income"
              trendColor="text-indigo-600 dark:text-indigo-400"
            />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Monthly Trend Bar Chart */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6">Monthly Income vs Expenses</h3>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="month" tickFormatter={(val) => val.split('-')[1]} stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" tickFormatter={(val) => `$${val}`} />
                    <Tooltip 
                      formatter={(value: number) => [`$${value.toLocaleString()}`, '']}
                      contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
                    />
                    <Legend />
                    <Bar dataKey="income" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expense" name="Expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

             {/* Yearly Category Pie Chart */}
             <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6">Expenses by Category</h3>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                       formatter={(value: number, name: string, props: any) => {
                         const percent = props.payload.percentage;
                         return [`$${value.toFixed(2)} (${percent.toFixed(1)}%)`, name];
                       }}
                       contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
                    />
                    <Legend 
                      layout="vertical" 
                      verticalAlign="bottom" 
                      align="center"
                      wrapperStyle={{ maxHeight: '100px', overflowY: 'auto' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Monthly Details Table */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
             <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">Monthly Breakdown</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm whitespace-nowrap">
                  <thead className="uppercase tracking-wider border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                    <tr>
                      <th className="px-6 py-4 font-semibold text-slate-500 dark:text-slate-400">Month</th>
                      <th className="px-6 py-4 font-semibold text-slate-500 dark:text-slate-400 text-right">Income</th>
                      <th className="px-6 py-4 font-semibold text-slate-500 dark:text-slate-400 text-right">Expenses</th>
                      <th className="px-6 py-4 font-semibold text-slate-500 dark:text-slate-400 text-right">Savings</th>
                      <th className="px-6 py-4 font-semibold text-slate-500 dark:text-slate-400 text-right">% Saved</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {data.monthly_breakdown.map((m) => (
                      <tr key={m.month} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-6 py-4 font-medium text-slate-600 dark:text-slate-300">{m.month}</td>
                        <td className="px-6 py-4 text-right text-green-600 dark:text-green-400 font-medium">
                          ${m.total_salary.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 text-right text-red-600 dark:text-red-400 font-medium">
                          ${m.total_expenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className={`px-6 py-4 text-right font-bold ${m.total_savings >= 0 ? 'text-slate-800 dark:text-slate-100' : 'text-red-500'}`}>
                          ${m.total_savings.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 text-right text-slate-600 dark:text-slate-400">
                          {m.savings_percentage.toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
          </div>
        </>
      )}
    </div>
  );
};