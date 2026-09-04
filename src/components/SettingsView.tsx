import React, { useState, useEffect } from 'react';
import { User, Shield, RotateCcw, Sparkles, Moon, Sun, Info, CheckCircle2, LogOut, Terminal, Smartphone } from 'lucide-react';
import { UserProfile } from '../types.js';
import { maskPhoneNumber } from '../lib/phoneUtils.js';

interface SettingsViewProps {
  currentUser: UserProfile | null;
  onOpenAuth: () => void;
  isDark: boolean;
  toggleTheme: () => void;
  onResetDemo: () => Promise<void>;
  onLogout?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  currentUser,
  onOpenAuth,
  isDark,
  toggleTheme,
  onResetDemo,
  onLogout
}) => {
  const [resetting, setResetting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Development debug mode state (Section 37)
  const [debugMode, setDebugMode] = useState<boolean>(() => {
    return localStorage.getItem('inspectra_debug_mode') === 'true';
  });

  const handleToggleDebug = (enabled: boolean) => {
    setDebugMode(enabled);
    localStorage.setItem('inspectra_debug_mode', enabled ? 'true' : 'false');
  };

  const handleReset = async () => {
    if (!confirm('Reset all inspection sessions to default Legal Metrology demo datasets?')) {
      return;
    }
    setResetting(true);
    setMsg(null);
    try {
      await onResetDemo();
      setMsg('Inspection database reset successfully with 5 realistic demo specimens!');
    } catch (e: any) {
      setMsg(e?.message || 'Reset failed');
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl pb-20 animate-in fade-in duration-200">
      {/* Top Banner */}
      <div className="border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-widest px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
            System Configuration
          </span>
          <span className="text-xs text-zinc-500 font-mono">INSPECTRA v1.0.0</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-zinc-100 mt-1">
          Settings & Inspector Profile
        </h1>
        <p className="text-xs text-zinc-400 mt-0.5">
          Inspection engine configuration, user authorization, and system diagnostics.
        </p>
      </div>

      {msg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{msg}</span>
        </div>
      )}

      {/* Profile Card */}
      <div className="p-6 rounded-3xl bg-zinc-900 border border-zinc-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-zinc-100 flex items-center gap-2">
            <User className="w-4 h-4 text-emerald-400" />
            <span>Active Inspector Profile</span>
          </h2>
          <div className="flex items-center gap-2">
            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-rose-400 hover:text-rose-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Log Out</span>
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-1">
          <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-0.5">
            <span className="text-zinc-500 font-semibold uppercase text-[10px]">Officer Name</span>
            <p className="text-zinc-100 font-bold text-sm">{currentUser?.name || 'Authorized Inspector'}</p>
          </div>
          <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-0.5">
            <span className="text-zinc-500 font-semibold uppercase text-[10px] flex items-center gap-1">
              <Smartphone className="w-3 h-3" />
              <span>Phone</span>
            </span>
            <p className="text-zinc-200 font-mono">
              {currentUser?.mobileNumber ? maskPhoneNumber(currentUser.mobileNumber) : '—'}
            </p>
          </div>
          <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-0.5">
            <span className="text-zinc-500 font-semibold uppercase text-[10px]">Official Email</span>
            <p className="text-zinc-200 font-mono">{currentUser?.email || '—'}</p>
          </div>
          <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-0.5">
            <span className="text-zinc-500 font-semibold uppercase text-[10px]">Statutory Role</span>
            <p className="text-emerald-400 font-mono font-bold">{currentUser?.role || 'INSPECTOR'}</p>
          </div>
        </div>
      </div>

      {/* Visual Theme Card */}
      <div className="p-6 rounded-3xl bg-zinc-900 border border-zinc-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-zinc-100">Visual Appearance</h2>
            <p className="text-xs text-zinc-400">
              Select your interface color theme. Dark theme is recommended for fine-print visual inspection.
            </p>
          </div>

          <button
            type="button"
            onClick={toggleTheme}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 cursor-pointer"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-zinc-400" />}
            <span>{isDark ? 'Switch to Light' : 'Switch to Dark'}</span>
          </button>
        </div>
      </div>

      {/* Developer Debug Mode Card (Section 37) */}
      <div className="p-6 rounded-3xl bg-zinc-900 border border-zinc-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-zinc-100 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span>Developer Diagnostics & Debug Mode</span>
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Enables image dimensions, payload sizes, OCR bounding boxes, and raw multimodal response logs.
            </p>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={debugMode}
              onChange={e => handleToggleDebug(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:width-5 after:transition-all peer-checked:bg-emerald-500"></div>
          </label>
        </div>
      </div>

      {/* Database Reset Card */}
      <div className="p-6 rounded-3xl bg-zinc-900 border border-zinc-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-zinc-100 flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-amber-400" />
              <span>Sample Datasets & Reset</span>
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Re-seed database with all 5 verified specimen packages (Tata Salt, Golden Harvest, Heritage Spice Conflicting MRP, Farm Fresh Blurry, Britannia/Parle Mismatch).
            </p>
          </div>

          <button
            type="button"
            onClick={handleReset}
            disabled={resetting}
            className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-amber-400 border border-amber-500/20 text-xs font-bold transition-colors whitespace-nowrap cursor-pointer"
          >
            {resetting ? 'Resetting...' : 'Re-seed Demo Datasets'}
          </button>
        </div>
      </div>
    </div>
  );
};
