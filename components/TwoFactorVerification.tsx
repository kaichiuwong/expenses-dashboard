import React, { useState } from 'react';
import { verify2FA } from '../services/api';

interface TwoFactorVerificationProps {
  onVerified: () => void;
  onCancel: () => void;
}

const LockIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);

const BackIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m15 18-6-6 6-6"/>
  </svg>
);

export const TwoFactorVerification: React.FC<TwoFactorVerificationProps> = ({ onVerified, onCancel }) => {
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remainingCodes, setRemainingCodes] = useState<number | null>(null);
  const [usedBackupCode, setUsedBackupCode] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!code || (code.length !== 6 && code.length !== 8)) {
      setError('Please enter a valid 6-digit code or 8-character backup code');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await verify2FA(code, false);
      
      if (response.verified) {
        if (response.usedBackupCode) {
          setUsedBackupCode(true);
          setRemainingCodes(response.remainingBackupCodes);
          // Show warning for a moment before proceeding
          setTimeout(() => {
            onVerified();
          }, 2000);
        } else {
          onVerified();
        }
      } else {
        setError('Invalid verification code. Please try again.');
      }
    } catch (err: any) {
      setError(err.message || 'Verification failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 transition-colors">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-12 h-12 bg-indigo-600 dark:bg-indigo-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
            <LockIcon />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900 dark:text-white">
          Two-Factor Authentication
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600 dark:text-slate-400">
          Enter the code from your authenticator app
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-slate-800 py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-slate-200 dark:border-slate-700">
          
          {usedBackupCode && remainingCodes !== null ? (
            <div className="text-center py-4">
              <div className="rounded-md bg-amber-50 dark:bg-amber-900/30 p-4 mb-4">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-2">
                  Backup Code Used
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  You have {remainingCodes} backup code{remainingCodes !== 1 ? 's' : ''} remaining. 
                  {remainingCodes <= 3 && ' Consider generating new backup codes soon.'}
                </p>
              </div>
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 mb-3">
                <svg className="h-6 w-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Verification successful. Redirecting...
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="code" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 text-center">
                  Verification Code
                </label>
                <input
                  id="code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase())}
                  className="appearance-none block w-full px-3 py-3 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm text-center text-2xl font-mono tracking-widest placeholder-slate-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-slate-700 dark:text-white transition-colors"
                  placeholder="000000"
                  autoFocus
                  maxLength={8}
                />
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 text-center">
                  Enter 6-digit code or 8-character backup code
                </p>
              </div>

              {error && (
                <div className="rounded-md bg-red-50 dark:bg-red-900/30 p-4">
                  <p className="text-sm text-red-700 dark:text-red-300 text-center">{error}</p>
                </div>
              )}

              <div className="space-y-3">
                <button
                  type="submit"
                  disabled={isLoading || !code}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? (
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    'Verify'
                  )}
                </button>

                <button
                  type="button"
                  onClick={onCancel}
                  disabled={isLoading}
                  className="w-full flex justify-center items-center gap-2 py-2 px-4 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
                >
                  <BackIcon />
                  Back to Login
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="mt-4 text-center">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Lost access to your authenticator app? Use a backup code instead.
          </p>
        </div>
      </div>
    </div>
  );
};
