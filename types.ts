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