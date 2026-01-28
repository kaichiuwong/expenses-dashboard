import React, { useState, useEffect } from 'react';
import { checkUserEmail } from '../services/api';
import { registerLocalPasskey, authenticateLocalPasskey } from '../services/auth';
import { useTheme } from '../hooks/useTheme';
import { getCookie, setCookie } from '../utils/cookies';
import { TwoFactorVerification } from './TwoFactorVerification';

interface LoginPageProps {
  onLogin: (user: any) => void;
}

const SunIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
);
const MoonIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
);
const FingerprintIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12C2 6.5 6.5 2 12 2a10 10 0 0 1 8 6"/><path d="M5 15.181a7.003 7.003 0 0 1 14 0"/><path d="M2.058 12A10.002 10.002 0 0 0 12 22a10 10 0 0 0 9.942-10"/><path d="M12 18a6 6 0 0 0 0-12c-3.314 0-6 2.686-6 6v3.314"/><path d="M12 18V6.16"/></svg>
);
const BackIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
);

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [step, setStep] = useState<'email' | 'passkey' | '2fa-verify'>('email');
  const [foundUser, setFoundUser] = useState<any>(null);
  const [requires2FA, setRequires2FA] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { theme, toggleTheme } = useTheme();

  // Load email from cookie on mount
  useEffect(() => {
    const savedEmail = getCookie('loginEmail');
    if (savedEmail) {
      setEmail(savedEmail);
    }
  }, []);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    
    setIsLoading(true);
    setError(null);

    try {
      const response = await checkUserEmail(email);
      if (response.exists && response.user) {
        setFoundUser(response.user);
        setRequires2FA(response.user.two_factor_enabled || false);
        setStep('passkey');
        // Save email to cookie for next time
        setCookie('loginEmail', email);
      } else {
        setError(response.message || 'Access denied. User not found.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to check user');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasskeyLogin = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const success = await authenticateLocalPasskey();
      if (success) {
        // Check if 2FA is required
        if (requires2FA) {
          setStep('2fa-verify');
        } else {
          onLogin(foundUser);
        }
      } else {
        setError('Authentication failed.');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Passkey verification failed. If you haven\'t created one on this device yet, try "First time? Create Passkey".');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasskeyRegistration = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const success = await registerLocalPasskey(email);
      if (success) {
        // Check if 2FA is required
        if (requires2FA) {
          setStep('2fa-verify');
        } else {
          onLogin(foundUser);
        }
      } else {
        setError('Passkey creation failed.');
      }
    } catch (err: any) {
        console.error(err);
        setError(err.message || 'Passkey creation failed.');
    } finally {
        setIsLoading(false);
    }
  };

  const handle2FAVerified = () => {
    onLogin(foundUser);
  };

  const handle2FACancel = () => {
    setStep('passkey');
  };

  const handleReset = () => {
    setStep('email');
    setFoundUser(null);
    setEmail('');
    setError(null);
    setRequires2FA(false);
  };

  // Show 2FA verification screen
  if (step === '2fa-verify') {
    return <TwoFactorVerification onVerified={handle2FAVerified} onCancel={handle2FACancel} email={email} />;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-emerald-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 transition-colors relative">
      {/* Theme Toggle */}
      <div className="absolute top-4 right-4 z-50">
        <button 
            onClick={toggleTheme}
            className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors"
        >
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
        </button>
      </div>

      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-8 border border-slate-100 dark:border-slate-800">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
            <span className="text-4xl">💸</span>
          </div>
        </div>
        <h1 className="text-3xl font-bold text-center text-slate-800 dark:text-slate-100 mb-8">Expensify</h1>
        
        {step === 'passkey' && (
          <div className="text-center mb-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">Authenticating as {email}</p>
          </div>
        )}
          
        {step === 'email' && (
            <form className="space-y-6" onSubmit={handleEmailSubmit}>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Email Address
                </label>
                <div className="mt-1">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email webauthn" 
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              {error && (
                <div className="rounded-md bg-red-50 dark:bg-red-900/30 p-4">
                  <div className="flex">
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Error</h3>
                      <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                        <p>{error}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-slate-900 dark:bg-emerald-600 text-white py-3 rounded-lg font-semibold hover:bg-slate-800 dark:hover:bg-emerald-500 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                  ) : (
                      <>
                        <span className="text-xl">🔑</span>
                        Continue with Passkey
                      </>
                  )}
                </button>
              </div>
            </form>
          )}

        {step === 'passkey' && (
             <div className="space-y-6">
                <div className="flex flex-col items-center justify-center space-y-4 py-4">
                    <div className={`p-4 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 ${isLoading ? 'animate-pulse' : ''}`}>
                        <FingerprintIcon />
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 text-center">
                        Use your device passkey (FaceID, TouchID, or PIN) to log in securely.
                    </p>
                </div>

                {error && (
                    <div className="rounded-md bg-red-50 dark:bg-red-900/30 p-4">
                        <p className="text-sm text-red-700 dark:text-red-300 text-center">{error}</p>
                    </div>
                )}

                <div className="space-y-3">
                    <button
                        onClick={handlePasskeyLogin}
                        disabled={isLoading}
                        className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg text-sm font-semibold text-white bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {isLoading ? 'Verifying...' : 'Authenticate with Passkey'}
                    </button>
                    
                    <button
                        onClick={handlePasskeyRegistration}
                        disabled={isLoading}
                        className="w-full flex justify-center items-center py-3 px-4 border border-emerald-200 dark:border-emerald-800 rounded-lg text-sm font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors"
                    >
                        First time? Create Passkey
                    </button>

                    <button
                        onClick={handleReset}
                        disabled={isLoading}
                        className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-slate-300 dark:border-slate-600 rounded-lg text-sm font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
                    >
                        <BackIcon />
                        Use different email
                    </button>
                </div>
             </div>
          )}

        </div>
        
        <p className="text-xs text-center text-slate-400 dark:text-slate-500 mt-6">
          Secure, private, and encrypted. Your financial data stays yours.
        </p>
      </div>
    </div>
  );
};
