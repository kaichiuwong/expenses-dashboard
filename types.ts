
export interface Category {
  id: string;
  name: string;
}

export interface CategoryResponse {
  categories: Category[];
}

export interface Transaction {
  id: string;
  trx_date: string;
  category: Category;
  name: string;
  amount: number;
  created_at: string;
  updated_at: string;
}

export interface TransactionResponse {
  transactions: Transaction[];
}

export interface CreateTransactionPayload {
  transaction: {
    trx_date: string;
    category_name: string;
    name: string;
    amount: number;
  };
}

export interface RegularTransaction {
  id: string;
  category: Category;
  name: string;
  amount: number;
  created_at: string;
  updated_at: string;
}

export interface RegularTransactionResponse {
  regularTransactions: RegularTransaction[];
}

export interface BulkTransactionItem {
  category_name: string;
  amount: number;
  trx_date: string;
  name: string;
}

export interface BulkCreateTransactionPayload {
  transaction: BulkTransactionItem[];
}

export interface ChartDataPoint {
  name: string;
  value: number;
  color?: string;
  [key: string]: any;
}

export interface DailyDataPoint {
  date: string;
  amount: number;
  dayOfMonth: number;
  [key: string]: any;
}

// Yearly Dashboard Types

export interface YearlyCategoryExpense {
  category_id: string;
  category_name: string;
  total: number;
  percentage: number;
}

export interface MonthlySummary {
  month: string;
  total_expenses: number;
  total_salary: number;
  total_savings: number;
  savings_percentage: number;
  expenses_by_category: YearlyCategoryExpense[];
}

export interface YearlySummaryResponse {
  year: string;
  yearly_total_income: number;
  yearly_total_expenses: number;
  yearly_total_savings: number;
  yearly_savings_percentage: number;
  yearly_expenses_by_category: YearlyCategoryExpense[];
  monthly_breakdown: MonthlySummary[];
}
