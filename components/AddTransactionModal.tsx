import React, { useState, useEffect } from 'react';
import { fetchCategories, addTransaction, updateTransaction, fetchExchangeRate } from '../services/api';
import { Category, Transaction } from '../types';

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  transactionToEdit?: Transaction | null;
}

type TransactionType = 'expense' | 'income';

const CURRENCIES = [
  'AUD', 'USD', 'EUR', 'GBP', 'JPY', 'CAD', 'NZD', 'SGD', 'CNY', 'INR', 'HKD'
];

export const AddTransactionModal: React.FC<AddTransactionModalProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess, 
  transactionToEdit 
}) => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<TransactionType>('expense');
  const [categoryName, setCategoryName] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  
  // Currency State
  const [currency, setCurrency] = useState('AUD');
  const [fxRate, setFxRate] = useState<string>('1.0');
  const [isLoadingFx, setIsLoadingFx] = useState(false);
  
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditMode = !!transactionToEdit;

  useEffect(() => {
    if (isOpen) {
      loadCategories();
      
      if (transactionToEdit) {
        // Edit mode - populate fields
        setDate(transactionToEdit.trx_date);
        setName(transactionToEdit.name);
        
        // Since backend stores final AUD amount, we default to AUD with rate 1
        setCurrency('AUD');
        setFxRate('1.0');

        // If amount is negative, it's income. Absolute value for input.
        if (transactionToEdit.amount < 0) {
          setType('income');
          setAmount(Math.abs(transactionToEdit.amount).toString());
        } else {
          setType('expense');
          setAmount(transactionToEdit.amount.toString());
        }
        setCategoryName(transactionToEdit.category.name);
      } else {
        // Add mode - reset fields
        setDate(new Date().toISOString().split('T')[0]);
        setName('');
        setAmount('');
        setType('expense');
        setCurrency('AUD');
        setFxRate('1.0');
        // categoryName will be set after categories load if empty
        setError(null);
      }
    }
  }, [isOpen, transactionToEdit]);

  // Handle Currency Change
  useEffect(() => {
    const updateRate = async () => {
      if (currency === 'AUD') {
        setFxRate('1.0');
        return;
      }

      setIsLoadingFx(true);
      try {
        const rate = await fetchExchangeRate(currency);
        setFxRate(rate.toString());
      } catch (err) {
        console.error('Failed to update FX rate', err);
        // Don't override existing rate on error, allows manual entry
      } finally {
        setIsLoadingFx(false);
      }
    };

    if (isOpen) {
      updateRate();
    }
  }, [currency, isOpen]);

  const loadCategories = async () => {
    setIsLoadingCategories(true);
    try {
      const data = await fetchCategories();
      const fetchedCats = data.categories || [];
      setCategories(fetchedCats);
      
      // If adding new (not editing) and no category selected yet, pick first
      if (!transactionToEdit && !categoryName && fetchedCats.length > 0) {
        setCategoryName(fetchedCats[0].name);
      }
    } catch (err) {
      console.error('Failed to load categories', err);
      setError('Failed to load categories. Please check your connection.');
    } finally {
      setIsLoadingCategories(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryName || !name || !amount || !date || !fxRate) {
      setError('All fields are required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    let inputAmount = parseFloat(amount);
    const rate = parseFloat(fxRate);
    
    // Calculate final AUD amount
    let finalAmount = inputAmount * rate;

    // If income, ensure amount is negative.
    // If expense, ensure amount is positive.
    if (type === 'income') {
      finalAmount = -Math.abs(finalAmount);
    } else {
      finalAmount = Math.abs(finalAmount);
    }

    // Round to 2 decimal places for storage
    finalAmount = Math.round(finalAmount * 100) / 100;

    const payload = {
      trx_date: date,
      category_name: categoryName,
      name: name,
      amount: finalAmount,
    };

    try {
      if (isEditMode && transactionToEdit) {
        await updateTransaction(transactionToEdit.id, payload);
      } else {
        await addTransaction(payload);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || `Failed to ${isEditMode ? 'update' : 'add'} transaction.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  // Calculate estimated display amount
  const displayTotal = amount && fxRate 
    ? (parseFloat(amount) * parseFloat(fxRate)).toLocaleString('en-US', { style: 'currency', currency: 'AUD' })
    : '$0.00';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-opacity">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-md w-full overflow-hidden border border-slate-100 dark:border-slate-700">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white">
            {isEditMode ? 'Edit Transaction' : 'Add New Transaction'}
          </h3>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300 text-sm p-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Type Toggle */}
          <div className="flex rounded-lg bg-slate-100 dark:bg-slate-700 p-1 mb-4">
            <button
              type="button"
              onClick={() => setType('expense')}
              className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${
                type === 'expense'
                  ? 'bg-white dark:bg-slate-600 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              Expense
            </button>
            <button
              type="button"
              onClick={() => setType('income')}
              className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${
                type === 'income'
                  ? 'bg-white dark:bg-slate-600 text-green-600 dark:text-green-400 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              Income
            </button>
          </div>

          <div>
            <label htmlFor="date" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Date
            </label>
            <input
              type="date"
              id="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border shadow-sm outline-none"
            />
          </div>

          <div>
            <label htmlFor="category" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Category
            </label>
            <select
              id="category"
              required
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              disabled={isLoadingCategories}
              className="w-full rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border shadow-sm outline-none disabled:opacity-50"
            >
              {isLoadingCategories ? (
                <option>Loading categories...</option>
              ) : (
                <>
                  <option value="" disabled>Select a category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.name}>
                      {cat.name}
                    </option>
                  ))}
                </>
              )}
            </select>
          </div>

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Description / Name
            </label>
            <input
              type="text"
              id="name"
              required
              placeholder={type === 'income' ? 'e.g. Salary, Refund' : 'e.g. Lunch at Cafe'}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border shadow-sm outline-none"
            />
          </div>

          <div className="grid grid-cols-5 gap-4">
            <div className="col-span-2">
               <label htmlFor="currency" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Currency
              </label>
              <select
                id="currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border shadow-sm outline-none"
              >
                {CURRENCIES.map(curr => (
                  <option key={curr} value={curr}>{curr}</option>
                ))}
              </select>
            </div>
            <div className="col-span-3">
              <label htmlFor="amount" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Amount
              </label>
              <input
                type="number"
                id="amount"
                required
                min="0.01"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border shadow-sm outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="fxRate" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-2">
                FX Rate
                {isLoadingFx && (
                  <svg className="animate-spin h-3 w-3 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
              </label>
              <input
                type="number"
                id="fxRate"
                required
                step="0.0001"
                value={fxRate}
                disabled={currency === 'AUD'}
                onChange={(e) => setFxRate(e.target.value)}
                className="w-full rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border shadow-sm outline-none disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                 Total (AUD)
              </label>
              <div className="w-full rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 sm:text-sm px-3 py-2 border border-slate-200 dark:border-slate-700 font-medium">
                {displayTotal}
              </div>
            </div>
          </div>

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isLoadingCategories || isLoadingFx}
              className={`flex-1 px-4 py-2 text-sm font-medium text-white border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                type === 'income' 
                  ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500' 
                  : 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500'
              }`}
            >
              {isSubmitting ? 'Saving...' : (isEditMode ? 'Update' : 'Add') + (type === 'income' ? ' Income' : ' Expense')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};