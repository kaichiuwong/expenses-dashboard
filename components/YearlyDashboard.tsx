import React, { useEffect, useState, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { fetchYearlySummary, fetchAllTransactions } from '../services/api';
import { YearlySummaryResponse, Transaction } from '../types';
import { SummaryCard } from './SummaryCard';
import { SankeyChart } from './SankeyChart';
import { COLORS, getIncomesByCategory, getExpensesByCategory } from '../utils/analytics';

interface YearlyDashboardProps {
  selectedYear: string;
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

export const YearlyDashboard: React.FC<YearlyDashboardProps> = ({ selectedYear }) => {
  const [data, setData] = useState<YearlySummaryResponse | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeMonthIndex, setActiveMonthIndex] = useState<number | null>(null);
  const [sankeyWidth, setSankeyWidth] = useState(900);
  const sankeyContainerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadYearlyData = async () => {
      setLoading(true);
      setError(null);
      setActiveMonthIndex(null); // Reset selection on year change
      try {
        const result = await fetchYearlySummary(selectedYear);
        setData(result);
        
        // Fetch all transactions without month filter
        const transactionsResult = await fetchAllTransactions();
        // Filter by selected year
        const yearTransactions = transactionsResult.transactions.filter(t => 
          t.trx_date.startsWith(selectedYear)
        );
        setTransactions(yearTransactions);
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Failed to fetch yearly summary');
      } finally {
        setLoading(false);
      }
    };

    loadYearlyData();
  }, [selectedYear]);
  
  // Filter transactions when active month changes
  useEffect(() => {
    if (!data || activeMonthIndex === null) return;
    
    const filterMonthTransactions = async () => {
      try {
        const monthData = data.monthly_breakdown[activeMonthIndex];
        if (monthData) {
          // Fetch all transactions and filter by month
          const transactionsResult = await fetchAllTransactions();
          const monthTransactions = transactionsResult.transactions.filter(t => 
            t.trx_date.startsWith(monthData.month)
          );
          setTransactions(monthTransactions);
        }
      } catch (err: any) {
        console.error('Failed to fetch month transactions:', err);
      }
    };
    
    filterMonthTransactions();
  }, [activeMonthIndex, data]);

  // Measure sankey container width
  useEffect(() => {
    const updateWidth = () => {
      if (sankeyContainerRef.current) {
        // Get container width and account for SVG internal padding (50px on each side)
        const containerWidth = sankeyContainerRef.current.clientWidth;
        setSankeyWidth(containerWidth); // Use full container width, SVG will handle its own padding
      }
    };
    
    // Initial measurement with slight delay to ensure container is rendered
    const timer = setTimeout(updateWidth, 100);
    updateWidth();
    
    window.addEventListener('resize', updateWidth);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateWidth);
    };
  }, []);

  const chartData = useMemo(() => {
    if (!data) return [];
    return data.monthly_breakdown.map(m => ({
      month: m.month,
      income: m.total_salary,
      expense: m.total_expenses,
      savings: m.total_savings
    }));
  }, [data]);

  // Create a stable color map for categories so they don't change colors when switching between yearly/monthly views
  const categoryColorMap = useMemo(() => {
    if (!data) return {};
    const map: Record<string, string> = {};
    data.yearly_expenses_by_category.forEach((c, index) => {
      map[c.category_name] = COLORS[index % COLORS.length];
    });
    return map;
  }, [data]);

  const sankeyData = useMemo(() => {
    if (!data || !transactions.length) return { nodes: [], links: [] };
    
    // Get income and expense categories from actual transactions
    const incomes = getIncomesByCategory(transactions);
    const expenses = getExpensesByCategory(transactions);
    
    let savingsAmount;

    // Determine if we are showing yearly data or specific month data
    if (activeMonthIndex !== null && data.monthly_breakdown[activeMonthIndex]) {
        const monthData = data.monthly_breakdown[activeMonthIndex];
        savingsAmount = monthData.total_savings;
    } else {
        savingsAmount = data.yearly_total_savings;
    }
    
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
    
    // Add savings node if positive (right side - will appear above)
    if (savingsAmount > 0) {
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
        color: categoryColorMap[cat.name] || cat.color
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
    if (savingsAmount > 0) {
      links.push({
        source: 'income',
        target: 'SAVINGS',
        value: savingsAmount,
        color: '#10b981'
      });
    }
    
    // Links from total income to expense categories
    expenses.forEach((cat) => {
      links.push({
        source: 'income',
        target: `expense-${cat.name}`,
        value: cat.value,
        color: categoryColorMap[cat.name] || cat.color
      });
    });

    return { nodes, links };
  }, [data, transactions, activeMonthIndex, categoryColorMap]);

  const sankeyChartTitle = useMemo(() => {
    if (activeMonthIndex !== null && data?.monthly_breakdown[activeMonthIndex]) {
        return `Income Flow: ${data.monthly_breakdown[activeMonthIndex].month}`;
    }
    return `Income Flow (${selectedYear})`;
  }, [activeMonthIndex, data, selectedYear]);

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

          {/* Income Flow Sankey Diagram - Full Width */}
          <div ref={sankeyContainerRef} className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6 truncate" title={sankeyChartTitle}>
              {sankeyChartTitle}
            </h3>
            <div className="flex-1 w-full flex items-center justify-center">
              <SankeyChart
                nodes={sankeyData.nodes}
                links={sankeyData.links}
                width={sankeyWidth}
                height={600}
              />
            </div>
          </div>

          {/* Monthly Income vs Expenses Chart */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">Monthly Income vs Expenses</h3>
              <span className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">
                 Hover to filter categories
              </span>
            </div>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={chartData} 
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  onMouseMove={(state: any) => {
                    if (state.isTooltipActive && state.activeTooltipIndex !== undefined) {
                      setActiveMonthIndex(state.activeTooltipIndex);
                    } else {
                      setActiveMonthIndex(null);
                    }
                  }}
                  onMouseLeave={() => setActiveMonthIndex(null)}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="month" tickFormatter={(val) => val.split('-')[1]} stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" tickFormatter={(val) => `$${val}`} />
                  <Tooltip 
                    formatter={(value: number) => [`$${value.toLocaleString()}`, '']}
                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
                    itemStyle={{ color: '#f8fafc' }}
                  />
                  <Legend />
                  <Bar dataKey="income" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expense" name="Expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
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