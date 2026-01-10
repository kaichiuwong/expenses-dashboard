import { 
  TransactionResponse, 
  CategoryResponse, 
  CreateTransactionPayload, 
  RegularTransactionResponse,
  BulkCreateTransactionPayload,
  YearlySummaryResponse
} from '../types';

// Default constants
const DEFAULT_BASE_URL = 'https://rcwxnpbxhuvhnnwcijga.supabase.co/functions/v1';
const DEFAULT_API_KEY = 'sb_publishable_DzJJTqmieYKyofXX1GuCrA_KZuJuRnY';

let envBaseUrl = '';
let envApiKey = '';

// Attempt to retrieve environment variables using explicit access for static analysis by bundlers.
// We try both import.meta.env (Vite) and process.env (Webpack/CRA).
// We also check for both VITE_ and REACT_APP_ prefixes to be compatible with different setups.

try {
  // Check Vite / Modern ESM
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    // @ts-ignore
    envBaseUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.REACT_APP_API_BASE_URL;
    // @ts-ignore
    envApiKey = import.meta.env.VITE_SUPABASE_KEY || import.meta.env.REACT_APP_SUPABASE_KEY;
  }
} catch (e) {
  // Ignore errors accessing import.meta
}

try {
  // Check Node / Webpack / CRA
  // explicit check for process to avoid ReferenceError in browsers
  if (typeof process !== 'undefined' && process.env) {
    // We must access properties directly (dot notation) for DefinePlugin/replacement to work
    // Dynamic access like process.env[key] will NOT work in most bundlers
    if (!envBaseUrl) {
        envBaseUrl = process.env.REACT_APP_API_BASE_URL || process.env.VITE_API_BASE_URL || '';
    }
    if (!envApiKey) {
        envApiKey = process.env.REACT_APP_SUPABASE_KEY || process.env.VITE_SUPABASE_KEY || '';
    }
  }
} catch (e) {
  // Ignore errors accessing process
}

// Fallback to defaults if no env vars found
const BASE_URL = envBaseUrl || DEFAULT_BASE_URL;
const API_KEY = envApiKey || DEFAULT_API_KEY;

const getHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${API_KEY}`,
  'apikey': API_KEY,
});

export const fetchTransactions = async (month: string): Promise<TransactionResponse> => {
  const url = `${BASE_URL}/transaction?month=${month}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: getHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Error fetching data: ${response.statusText}`);
  }

  return response.json();
};

export const fetchCategories = async (): Promise<CategoryResponse> => {
  const url = `${BASE_URL}/category`;

  const response = await fetch(url, {
    method: 'GET',
    headers: getHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Error fetching categories: ${response.statusText}`);
  }

  return response.json();
};

export const fetchRegularTransactions = async (): Promise<RegularTransactionResponse> => {
  const url = `${BASE_URL}/regular`;

  const response = await fetch(url, {
    method: 'GET',
    headers: getHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Error fetching regular transactions: ${response.statusText}`);
  }

  return response.json();
};

export const fetchYearlySummary = async (year: string): Promise<YearlySummaryResponse> => {
  const url = `${BASE_URL}/summary?year=${year}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: getHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Error fetching yearly summary: ${response.statusText}`);
  }

  return response.json();
};

export const fetchExchangeRate = async (currencyCode: string): Promise<number> => {
  if (currencyCode === 'AUD') return 1;
  
  try {
    // Using a public free API for exchange rates. 
    // This fetches rates where base is the selected currency (e.g., 1 USD = x AUD)
    const response = await fetch(`https://open.er-api.com/v6/latest/${currencyCode}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch exchange rates');
    }

    const data = await response.json();
    const rate = data.rates?.AUD;

    if (!rate) {
      throw new Error(`Rate for AUD not found in ${currencyCode} response`);
    }

    return rate;
  } catch (error) {
    console.error('Exchange rate fetch error:', error);
    // Return 1 as fallback to prevent total failure, user can manually edit
    return 1;
  }
};

export const addTransaction = async (data: CreateTransactionPayload['transaction']): Promise<void> => {
  const url = `${BASE_URL}/transaction`;

  const response = await fetch(url, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ transaction: data }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Error adding transaction: ${errorText || response.statusText}`);
  }
};

export const addBulkTransactions = async (data: BulkCreateTransactionPayload['transaction']): Promise<void> => {
  const url = `${BASE_URL}/transaction`;

  const response = await fetch(url, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ transaction: data }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Error importing transactions: ${errorText || response.statusText}`);
  }
};

export const updateTransaction = async (id: string, data: CreateTransactionPayload['transaction']): Promise<void> => {
  const url = `${BASE_URL}/transaction/${id}`;

  const response = await fetch(url, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify({ transaction: data }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Error updating transaction: ${errorText || response.statusText}`);
  }
};

export const deleteTransaction = async (id: string): Promise<void> => {
  const url = `${BASE_URL}/transaction/${id}`;

  const response = await fetch(url, {
    method: 'DELETE',
    headers: getHeaders(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Error deleting transaction: ${errorText || response.statusText}`);
  }
};