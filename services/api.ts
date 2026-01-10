import { TransactionResponse, CategoryResponse, CreateTransactionPayload } from '../types';

const BASE_URL = 'https://rcwxnpbxhuvhnnwcijga.supabase.co/functions/v1';
const API_KEY = process.env.REACT_APP_SUPABASE_KEY || 'sb_publishable_DzJJTqmieYKyofXX1GuCrA_KZuJuRnY';

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