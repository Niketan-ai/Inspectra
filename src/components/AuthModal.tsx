import React, { useState } from 'react';
import { X, Shield, Lock, Mail, User, Building, ArrowRight } from 'lucide-react';
import { UserProfile } from '../types.js';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  onLogin: (email: string) => Promise<void>;
  onSignup: (data: { name: string; email: string; role?: string; organization?: string }) => Promise<void>;
  onGuestLogin: () => Promise<void>;
  onLogout: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onLogin,
  onSignup,
  onGuestLogin,
  onLogout
}) => {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot' | 'profile'>('login');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'INSPECTOR' | 'SUPERVISOR'>('INSPECTOR');
  const [organization, setOrganization] = useState('');
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setStatusMsg(null);

    try {
      if (mode === 'login') {
        await onLogin(email || 'inspector@inspectra.gov.in');
        onClose();
      } else if (mode === 'signup') {
        await onSignup({
          name: name || 'Field Inspector',
          email: email || 'officer@inspectra.gov.in',
          role,
          organization: organization || 'Legal Metrology Enforcement Directorate'
        });
        onClose();
      } else if (mode === 'forgot') {
        setStatusMsg(`Password reset instructions sent to ${email}`);
      }
    } catch (err: any) {
      setStatusMsg(err?.message || 'Authentication operation failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuest = async () => {
    setIsLoading(true);
    try {
      await onGuestLogin();
      onClose();
    } catch (err: any) {
      setStatusMsg(err?.message || 'Failed to enter guest mode');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div
        className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl relative text-zinc-100 animate-in fade-in zoom-in-95 duration-150"
        id="auth-modal-container"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
          id="auth-modal-close-btn"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-zinc-100">
              {currentUser && mode === 'profile'
                ? 'Inspector Profile'
                : mode === 'signup'
                ? 'Register Inspector Account'
                : mode === 'forgot'
                ? 'Recover Access'
                : 'Authentication Portal'}
            </h2>
            <p className="text-xs text-zinc-400">
              Legal Metrology (Packaged Commodities) Rules, 2011
            </p>
          </div>
        </div>

        {statusMsg && (
          <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 font-medium">
            {statusMsg}
          </div>
        )}

        {currentUser && (
          <div className="mb-6 p-4 rounded-xl bg-zinc-950/80 border border-zinc-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-zinc-500 uppercase font-semibold">Active Session</span>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {currentUser.role}
              </span>
            </div>
            <p className="font-semibold text-sm text-zinc-200">{currentUser.name}</p>
            <p className="text-xs text-zinc-400">{currentUser.email}</p>
            {currentUser.organization && (
              <p className="text-xs text-zinc-500 mt-1">{currentUser.organization}</p>
            )}

            <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between">
              <button
                type="button"
                onClick={onLogout}
                className="text-xs text-rose-400 hover:text-rose-300 font-medium"
              >
                Sign Out
              </button>
              <button
                type="button"
                onClick={() => setMode('login')}
                className="text-xs text-zinc-400 hover:text-zinc-200"
              >
                Switch Account
              </button>
            </div>
          </div>
        )}

        {(!currentUser || mode !== 'profile') && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <>
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Inspector / User Full Name
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Officer R. K. Sharma"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Jurisdiction / Department
                  </label>
                  <div className="relative">
                    <Building className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="e.g. Department of Consumer Affairs"
                      value={organization}
                      onChange={e => setOrganization(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    System Role
                  </label>
                  <select
                    value={role}
                    onChange={e => setRole(e.target.value as any)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="INSPECTOR">Field Legal Metrology Inspector</option>
                    <option value="SUPERVISOR">Enforcement Supervisor / Controller</option>
                  </select>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Official Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
                <input
                  type="email"
                  required
                  placeholder="officer@inspectra.gov.in"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {mode !== 'forgot' && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-zinc-300">
                    Access Password
                  </label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => setMode('forgot')}
                      className="text-xs text-emerald-400 hover:text-emerald-300"
                    >
                      Forgot?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    placeholder="••••••••"
                    defaultValue="demo1234"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-sm transition-colors shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
              id="auth-submit-btn"
            >
              {isLoading ? 'Processing...' : mode === 'signup' ? 'Create Inspector Account' : mode === 'forgot' ? 'Send Recovery Link' : 'Sign In'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* Guest & Mode switches */}
        <div className="mt-6 pt-4 border-t border-zinc-800 text-center space-y-2">
          {mode === 'login' && (
            <>
              <button
                type="button"
                onClick={handleGuest}
                disabled={isLoading}
                className="w-full py-2 px-3 rounded-lg border border-zinc-700 hover:border-zinc-600 bg-zinc-800/50 hover:bg-zinc-800 text-xs font-semibold text-zinc-300 transition-colors"
                id="guest-login-btn"
              >
                Continue as Public Guest (Citizen Screening)
              </button>
              <p className="text-xs text-zinc-400 mt-2">
                Need an official inspector profile?{' '}
                <button
                  type="button"
                  onClick={() => setMode('signup')}
                  className="text-emerald-400 hover:underline font-semibold"
                >
                  Register here
                </button>
              </p>
            </>
          )}

          {mode === 'signup' && (
            <p className="text-xs text-zinc-400">
              Already have credentials?{' '}
              <button
                type="button"
                onClick={() => setMode('login')}
                className="text-emerald-400 hover:underline font-semibold"
              >
                Sign in
              </button>
            </p>
          )}

          {mode === 'forgot' && (
            <button
              type="button"
              onClick={() => setMode('login')}
              className="text-xs text-zinc-400 hover:text-zinc-200"
            >
              Back to Login
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
