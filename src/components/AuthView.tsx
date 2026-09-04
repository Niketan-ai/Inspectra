import React, { useState, useEffect } from 'react';
import {
  Shield,
  User,
  ArrowRight,
  AlertCircle,
  Sun,
  Moon,
  Smartphone,
  CheckCircle2
} from 'lucide-react';
import { api } from '../lib/api.js';
import { UserProfile } from '../types.js';
import { isValidIndianMobile, normalizeIndianMobile } from '../lib/phoneUtils.js';

interface AuthViewProps {
  onAuthenticated: (user: UserProfile, token: string) => void;
}

type AuthMode = 'CHOICE' | 'LOGIN' | 'CREATE_ACCOUNT';

export const AuthView: React.FC<AuthViewProps> = ({ onAuthenticated }) => {
  const [mode, setMode] = useState<AuthMode>('CHOICE');
  // Default user name pre-filled as required by Section 4
  const [name, setName] = useState('Niketan');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [accountNotFound, setAccountNotFound] = useState(false);

  // Theme support for Get Started view
  const [isDark, setIsDark] = useState<boolean>(() => {
    const saved = localStorage.getItem('inspectra_theme');
    return saved ? saved === 'dark' : true;
  });

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
    localStorage.setItem('inspectra_theme', nextDark ? 'dark' : 'light');
  };

  const cleanPhone = normalizeIndianMobile(phone);

  // Reset errors when mode changes
  const switchMode = (newMode: AuthMode) => {
    setErrorMessage(null);
    setAccountNotFound(false);
    setMode(newMode);
  };

  // 1. Create Account handler (No OTP)
  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMessage('Enter your name.');
      return;
    }

    if (!isValidIndianMobile(cleanPhone)) {
      setErrorMessage('Enter a valid 10-digit mobile number.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.createAccount(trimmedName, cleanPhone);
      localStorage.setItem('inspectra_token', res.token);
      localStorage.setItem('inspectra_user_id', res.user.id);
      localStorage.setItem('inspectra_cached_phone', cleanPhone);
      onAuthenticated(res.user, res.token);
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to create your account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // 2. Login handler (No OTP)
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setAccountNotFound(false);

    if (!isValidIndianMobile(cleanPhone)) {
      setErrorMessage('Enter a valid 10-digit mobile number.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.loginWithPhone(cleanPhone);
      localStorage.setItem('inspectra_token', res.token);
      localStorage.setItem('inspectra_user_id', res.user.id);
      localStorage.setItem('inspectra_cached_phone', cleanPhone);
      onAuthenticated(res.user, res.token);
    } catch (err: any) {
      if (err.code === 'ACCOUNT_NOT_FOUND' || err.message?.includes('No Inspectra account found')) {
        setAccountNotFound(true);
        setErrorMessage('No Inspectra account found.');
      } else {
        setErrorMessage(err.message || 'Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      id="inspectra-auth-container"
      className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col justify-center items-center px-4 py-8 sm:py-12 transition-colors duration-150 relative"
    >
      {/* Subtle Theme Toggle in top-right corner */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
        <button
          type="button"
          id="auth-theme-toggle-btn"
          onClick={toggleTheme}
          title={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
          className="p-2.5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 shadow-sm transition-colors cursor-pointer"
        >
          {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-zinc-600" />}
        </button>
      </div>

      <div className="w-full max-w-[420px] mx-auto space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 dark:text-emerald-400 mb-1 shadow-lg shadow-emerald-500/10">
            <Shield className="w-7 h-7" />
          </div>
          <h1 id="app-title" className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">
            INSPECTRA
          </h1>
          <p id="app-tagline" className="text-sm text-zinc-600 dark:text-zinc-400 font-medium">
            AI-assisted product inspection
          </p>
        </div>

        {/* Card Container */}
        <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl dark:shadow-2xl space-y-6">
          {/* Error Notice */}
          {errorMessage && (
            <div
              id="auth-error-message"
              className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs flex items-start gap-2.5 animate-in fade-in"
            >
              <AlertCircle className="w-4 h-4 text-rose-500 dark:text-rose-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 space-y-2">
                <span className="leading-relaxed font-medium">{errorMessage}</span>

                {/* If account not found during login: show Create Account and Back buttons per Section 8 */}
                {accountNotFound && (
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      id="error-create-account-btn"
                      onClick={() => switchMode('CREATE_ACCOUNT')}
                      className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-bold transition-colors cursor-pointer"
                    >
                      Create Account
                    </button>
                    <button
                      type="button"
                      id="error-back-btn"
                      onClick={() => switchMode('CHOICE')}
                      className="px-3 py-1.5 rounded-lg bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-300 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Back
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 1. GET STARTED OPENING SCREEN */}
          {mode === 'CHOICE' && (
            <div id="auth-choice-view" className="space-y-4">
              <div className="text-center space-y-1">
                <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-200">Get Started</h2>
                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                  Select an option to access the inspection platform
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <button
                  id="btn-choice-login"
                  type="button"
                  onClick={() => switchMode('LOGIN')}
                  className="w-full min-h-[44px] py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-zinc-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
                >
                  <span>Login</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  id="btn-choice-create-account"
                  type="button"
                  onClick={() => switchMode('CREATE_ACCOUNT')}
                  className="w-full min-h-[44px] py-3 px-4 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-750 active:bg-zinc-300 dark:active:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-semibold text-sm flex items-center justify-center gap-2 border border-zinc-300 dark:border-zinc-700 transition-colors cursor-pointer"
                >
                  <span>Create Account</span>
                </button>
              </div>
            </div>
          )}

          {/* 2. LOGIN SCREEN (NO OTP) */}
          {mode === 'LOGIN' && (
            <form id="auth-login-form" onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1">
                <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-200">Login</h2>
                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                  Enter your mobile number to access your Inspectra account
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label htmlFor="login-mobile-input" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Phone Number
                  </label>
                  <div className="relative flex rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 overflow-hidden focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500">
                    <span className="inline-flex items-center px-3.5 text-xs font-mono font-bold text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800">
                      +91
                    </span>
                    <input
                      id="login-mobile-input"
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      value={phone}
                      onChange={e => {
                        setErrorMessage(null);
                        setAccountNotFound(false);
                        setPhone(e.target.value.replace(/\D/g, ''));
                      }}
                      placeholder="Enter 10 digit mobile number"
                      className="w-full px-3.5 py-3 text-sm sm:text-base bg-transparent text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none font-mono"
                    />
                  </div>
                </div>

                <button
                  id="login-continue-btn"
                  type="submit"
                  disabled={loading || cleanPhone.length !== 10}
                  className="w-full min-h-[44px] py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
                >
                  {loading ? (
                    <span className="animate-pulse">Signing in...</span>
                  ) : (
                    <>
                      <span>Continue</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

              <div className="flex items-center justify-between pt-2 text-xs">
                <button
                  id="login-back-btn"
                  type="button"
                  onClick={() => switchMode('CHOICE')}
                  className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 cursor-pointer py-1 font-medium"
                >
                  ← Back
                </button>
                <button
                  id="login-switch-to-signup-btn"
                  type="button"
                  onClick={() => switchMode('CREATE_ACCOUNT')}
                  className="text-emerald-600 dark:text-emerald-400 hover:underline font-semibold cursor-pointer py-1"
                >
                  Create Account
                </button>
              </div>
            </form>
          )}

          {/* 3. CREATE ACCOUNT SCREEN (NO OTP) */}
          {mode === 'CREATE_ACCOUNT' && (
            <form id="auth-create-account-form" onSubmit={handleCreateAccount} className="space-y-4">
              <div className="space-y-1">
                <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-200">Create Account</h2>
                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                  Enter your details to access the inspection platform
                </p>
              </div>

              <div className="space-y-3">
                {/* Name field (pre-filled with 'Niketan', editable) */}
                <div>
                  <label htmlFor="create-account-name-input" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Name
                  </label>
                  <div className="relative flex rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 overflow-hidden focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500">
                    <span className="inline-flex items-center px-3 text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800">
                      <User className="w-4 h-4" />
                    </span>
                    <input
                      id="create-account-name-input"
                      type="text"
                      value={name}
                      onChange={e => {
                        setErrorMessage(null);
                        setName(e.target.value);
                      }}
                      placeholder="Niketan"
                      className="w-full px-3.5 py-3 text-sm sm:text-base bg-transparent text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Phone number field with +91 prefix */}
                <div>
                  <label htmlFor="create-account-phone-input" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Phone Number
                  </label>
                  <div className="relative flex rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 overflow-hidden focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500">
                    <span className="inline-flex items-center px-3.5 text-xs font-mono font-bold text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800">
                      +91
                    </span>
                    <input
                      id="create-account-phone-input"
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      value={phone}
                      onChange={e => {
                        setErrorMessage(null);
                        setPhone(e.target.value.replace(/\D/g, ''));
                      }}
                      placeholder="Enter 10 digit mobile number"
                      className="w-full px-3.5 py-3 text-sm sm:text-base bg-transparent text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none font-mono"
                    />
                  </div>
                </div>

                <button
                  id="create-account-continue-btn"
                  type="submit"
                  disabled={loading || !name.trim() || cleanPhone.length !== 10}
                  className="w-full min-h-[44px] py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
                >
                  {loading ? (
                    <span className="animate-pulse">Setting up account...</span>
                  ) : (
                    <>
                      <span>Continue</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

              <div className="flex items-center justify-between pt-2 text-xs">
                <button
                  id="create-account-back-btn"
                  type="button"
                  onClick={() => switchMode('CHOICE')}
                  className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 cursor-pointer py-1 font-medium"
                >
                  ← Back
                </button>
                <button
                  id="create-account-switch-to-login-btn"
                  type="button"
                  onClick={() => switchMode('LOGIN')}
                  className="text-emerald-600 dark:text-emerald-400 hover:underline font-semibold cursor-pointer py-1"
                >
                  Already have an account? Login
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Legal Metrology Footer */}
        <p className="text-center text-[11px] text-zinc-500 dark:text-zinc-500">
          Legal Metrology (Packaged Commodities) Rules, 2011 Compliance System
        </p>
      </div>
    </div>
  );
};
