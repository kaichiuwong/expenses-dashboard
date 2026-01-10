import { TransactionResponse, CategoryResponse, CreateTransactionPayload } from '../types';

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