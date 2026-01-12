import React, { useState, useEffect } from 'react';
import { enable2FA, verify2FA } from '../services/api';

interface TwoFactorSetupProps {
  onComplete: () => void;
  onCancel: () => void;
}

const ShieldIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);

const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

const CopyIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
  </svg>
);

export const TwoFactorSetup: React.FC<TwoFactorSetupProps> = ({ onComplete, onCancel }) => {
  const [step, setStep] = useState<'loading' | 'scan' | 'verify' | 'success'>('loading');
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [verificationCode, setVerificationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    initiate2FA();
  }, []);

  const initiate2FA = async () => {
    try {
      const response = await enable2FA();
      setQrCode(response.qrCode);
      setSecret(response.secret);
      setBackupCodes(response.backupCodes);
      setStep('scan');
    } catch (err: any) {
      setError(err.message || 'Failed to initialize 2FA');
      setStep('scan');
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationCode || verificationCode.length !== 6) {
      setError('Please enter a valid 6-digit code');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await verify2FA(verificationCode, true);
      if (response.verified && response.twoFactorEnabled) {
        setStep('success');
        setTimeout(() => {
          onComplete();
        }, 2000);
      } else {
        setError('Verification failed. Please try again.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to verify code');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string, type: 'secret' | 'code', code?: string) => {
    navigator.clipboard.writeText(text);
    if (type === 'secret') {
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    } else if (code) {
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    }
  };

  return (
    <div className="flex flex-col justify-center py-8 sm:px-6 lg:px-8 transition-colors">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-12 h-12 bg-green-600 dark:bg-green-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-green-500/30">
            <ShieldIcon />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900 dark:text-white">
          Setup Two-Factor Authentication
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600 dark:text-slate-400">
          Add an extra layer of security to your account
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-slate-800 py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-slate-200 dark:border-slate-700">
          
          {step === 'loading' && (
            <div className="flex flex-col items-center justify-center py-8">
              <svg className="animate-spin h-10 w-10 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="mt-4 text-slate-600 dark:text-slate-400">Initializing 2FA setup...</p>
            </div>
          )}

          {step === 'scan' && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-4">
                  Step 1: Scan QR Code
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
                  Use an authenticator app like Google Authenticator or Authy
                </p>
                
                {qrCode && (
                  <div className="bg-white p-4 rounded-lg inline-block shadow-inner">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrCode)}`} 
                      alt="2FA QR Code" 
                      className="w-48 h-48 mx-auto" 
                    />
                  </div>
                )}

                <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">
                    Can't scan? Enter this code manually:
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    <code className="text-sm font-mono text-slate-900 dark:text-white bg-white dark:bg-slate-800 px-3 py-1 rounded border border-slate-200 dark:border-slate-600">
                      {secret}
                    </code>
                    <button
                      onClick={() => copyToClipboard(secret, 'secret')}
                      className="p-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                      title="Copy secret"
                    >
                      {copiedSecret ? <CheckIcon /> : <CopyIcon />}
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <button
                  onClick={() => setStep('verify')}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                >
                  Continue to Verification
                </button>
                <button
                  onClick={onCancel}
                  className="mt-2 w-full flex justify-center py-2 px-4 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {step === 'verify' && (
            <form onSubmit={handleVerify} className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-4 text-center">
                  Step 2: Verify Code
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 text-center">
                  Enter the 6-digit code from your authenticator app
                </p>

                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                  className="appearance-none block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm text-center text-2xl font-mono tracking-widest placeholder-slate-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-slate-700 dark:text-white transition-colors"
                  placeholder="000000"
                  autoComplete="off"
                  autoFocus
                />
              </div>

              {error && (
                <div className="rounded-md bg-red-50 dark:bg-red-900/30 p-4">
                  <p className="text-sm text-red-700 dark:text-red-300 text-center">{error}</p>
                </div>
              )}

              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                <h4 className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-2">
                  Save Your Backup Codes
                </h4>
                <p className="text-xs text-amber-700 dark:text-amber-300 mb-3">
                  Store these codes in a safe place. Use them if you lose access to your authenticator app.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {backupCodes.map((code, idx) => (
                    <div key={idx} className="flex items-center gap-1 bg-white dark:bg-slate-800 rounded px-2 py-1 border border-amber-200 dark:border-amber-700">
                      <code className="text-xs font-mono text-slate-900 dark:text-white flex-1">
                        {code}
                      </code>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(code, 'code', code)}
                        className="p-1 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                      >
                        {copiedCode === code ? <CheckIcon /> : <CopyIcon />}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <button
                  type="submit"
                  disabled={isLoading || verificationCode.length !== 6}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? 'Verifying...' : 'Verify and Enable 2FA'}
                </button>
                <button
                  type="button"
                  onClick={() => setStep('scan')}
                  disabled={isLoading}
                  className="w-full flex justify-center py-2 px-4 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
                >
                  Back
                </button>
              </div>
            </form>
          )}

          {step === 'success' && (
            <div className="text-center py-8">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
                <svg className="h-8 w-8 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
                Two-Factor Authentication Enabled!
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Your account is now more secure. Redirecting...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
