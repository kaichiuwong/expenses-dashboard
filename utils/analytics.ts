import { Transaction, ChartDataPoint, DailyDataPoint } from '../types';

export const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#10b981', '#06b6d4', '#3b82f6'];

export const calculateTotalExpenses = (transactions: Transaction[]): number => {
  return transactions.reduce((sum, t) => sum + t.amount, 0);
};

export const getExpensesByCategory = (transactions: Transaction[]): ChartDataPoint[] => {
  const map: Record<string, number> = {};
  
  transactions.forEach((t) => {
    const catName = t.category.name;
    map[catName] = (map[catName] || 0) + t.amount;
  });

  return Object.entries(map)
    .map(([name, value], index) => ({
      name,
      value,
      color: COLORS[index % COLORS.length]
    }))
    .sort((a, b) => b.value - a.value); // Sort descending
};

export const getExpensesByDate = (transactions: Transaction[]): DailyDataPoint[] => {
  const map: Record<string, number> = {};

  transactions.forEach((t) => {
    map[t.trx_date] = (map[t.trx_date] || 0) + t.amount;
  });

  return Object.entries(map)
    .map(([date, amount]) => ({
      date,
      amount,
      dayOfMonth: parseInt(date.split('-')[2], 10)
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
};

export const getExpensesByWeekday = (transactions: Transaction[]): ChartDataPoint[] => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const map: number[] = new Array(7).fill(0);

  transactions.forEach((t) => {
    const date = new Date(t.trx_date);
    const dayIndex = date.getDay(); // 0 is Sunday
    map[dayIndex] += t.amount;
  });

  // Reorder to start from Monday for business visualization usually
  const orderedDays = [1, 2, 3, 4, 5, 6, 0]; 
  
  return orderedDays.map((dayIndex) => ({
    name: days[dayIndex],
    value: map[dayIndex],
    color: '#6366f1'
  }));
};