import React, { useState, useEffect } from 'react';
import { fetchCategories, addTransaction, updateTransaction } from '../services/api';
import { Category, Transaction } from '../types';

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  transactionToEdit?: Transaction | null;
}

export const AddTransactionModal: React.FC<AddTransactionModalProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess, 
  transactionToEdit 
}) => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
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
        setAmount(transactionToEdit.amount.toString());
        setCategoryName(transactionToEdit.category.name);
      } else {
        // Add mode - reset fields
        setDate(new Date().toISOString().split('T')[0]);
        setName('');
        setAmount('');
        // categoryName will be set after categories load if empty
        setError(null);
      }
    }
  }, [isOpen, transactionToEdit]);

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
    if (!categoryName || !name || !amount || !date) {
      setError('All fields are required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const payload = {
      trx_date: date,
      category_name: categoryName,
      name: name,
      amount: parseFloat(amount),
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
              placeholder="e.g. Lunch at Cafe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border shadow-sm outline-none"
            />
          </div>

          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Amount
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <span className="text-slate-500 dark:text-slate-400 sm:text-sm">$</span>
              </div>
              <input
                type="number"
                id="amount"
                required
                min="0.01"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm pl-7 pr-3 py-2 border shadow-sm outline-none"
              />
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
              disabled={isSubmitting || isLoadingCategories}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Saving...' : (isEditMode ? 'Update Transaction' : 'Add Transaction')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};