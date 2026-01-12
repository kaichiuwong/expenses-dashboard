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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 transition-colors relative">
      <div className="absolute top-4 right-4">
        <button 
            onClick={toggleTheme}
            className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors"
        >
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
        </button>
      </div>
      
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
            <div className="w-12 h-12 bg-indigo-600 dark:bg-indigo-500 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/30 text-2xl">
                $
            </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900 dark:text-white">
          {step === 'email' ? 'Sign in to Expensify' : 'Welcome Back'}
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600 dark:text-slate-400">
          {step === 'email' ? 'Enter your email to access your dashboard' : `Authenticating as ${email}`}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-slate-800 py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-slate-200 dark:border-slate-700">
          
          {step === 'email' && (
            <form className="space-y-6" onSubmit={handleEmailSubmit}>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Email address
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
                    className="appearance-none block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-slate-700 dark:text-white transition-colors"
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
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? (
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                  ) : (
                      'Continue'
                  )}
                </button>
              </div>
            </form>
          )}

          {step === 'passkey' && (
             <div className="space-y-6">
                <div className="flex flex-col items-center justify-center space-y-4 py-4">
                    <div className={`p-4 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 ${isLoading ? 'animate-pulse' : ''}`}>
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
                        className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {isLoading ? 'Verifying...' : 'Authenticate with Passkey'}
                    </button>
                    
                    <button
                        onClick={handlePasskeyRegistration}
                        disabled={isLoading}
                        className="w-full flex justify-center items-center py-2 px-4 border border-indigo-200 dark:border-indigo-800 rounded-md shadow-sm text-sm font-medium text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                    >
                        First time? Create Passkey
                    </button>

                    <button
                        onClick={handleReset}
                        disabled={isLoading}
                        className="w-full flex justify-center items-center gap-2 py-2 px-4 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                    >
                        <BackIcon />
                        Use different email
                    </button>
                </div>
             </div>
          )}

        </div>
      </div>
    </div>
  );
};
