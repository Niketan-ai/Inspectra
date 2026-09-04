import React from 'react';
import {
  FileCheck2,
  PlusCircle,
  LayoutDashboard,
  ScrollText,
  Settings,
  Scale,
  Sun,
  Moon,
  Home,
  User,
  RotateCcw,
  Camera
} from 'lucide-react';
import { UserProfile } from '../types.js';

export type AppTab = 'home' | 'new-scan' | 'inspections' | 'dashboard' | 'rules' | 'settings';

interface HeaderProps {
  currentTab: AppTab;
  setCurrentTab: (tab: AppTab) => void;
  currentUser: UserProfile | null;
  onOpenAuth: () => void;
  isDark: boolean;
  toggleTheme: () => void;
  onResetDemo: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  setCurrentTab,
  currentUser,
  onOpenAuth,
  isDark,
  toggleTheme,
  onResetDemo
}) => {
  return (
    <>
      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-md text-zinc-100 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo & Brand */}
            <div
              className="flex items-center gap-3 cursor-pointer group"
              onClick={() => setCurrentTab('home')}
              id="brand-header-home-btn"
            >
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-white transition-transform group-hover:scale-105">
                <Scale className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold tracking-tight text-lg sm:text-xl text-zinc-100">
                    INSPECTRA
                  </span>
                  <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hidden sm:inline">
                    PCR 2011
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 font-medium tracking-wide hidden sm:block">
                  Scan. Read. Verify. Report.
                </p>
              </div>
            </div>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1">
              <button
                id="nav-btn-home"
                onClick={() => setCurrentTab('home')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  currentTab === 'home'
                    ? 'bg-zinc-850 text-emerald-400 border border-zinc-700 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
                }`}
              >
                <Home className="w-4 h-4" />
                <span>Home</span>
              </button>

              <button
                id="nav-btn-new-scan"
                onClick={() => setCurrentTab('new-scan')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  currentTab === 'new-scan'
                    ? 'bg-emerald-500 text-zinc-950 font-bold shadow-md shadow-emerald-500/20'
                    : 'text-zinc-300 hover:text-white hover:bg-emerald-500/10 border border-emerald-500/30'
                }`}
              >
                <PlusCircle className="w-4 h-4" />
                <span>New Scan</span>
              </button>

              <button
                id="nav-btn-inspections"
                onClick={() => setCurrentTab('inspections')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  currentTab === 'inspections'
                    ? 'bg-zinc-850 text-emerald-400 border border-zinc-700 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
                }`}
              >
                <FileCheck2 className="w-4 h-4" />
                <span>Inspections</span>
              </button>

              <button
                id="nav-btn-dashboard"
                onClick={() => setCurrentTab('dashboard')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  currentTab === 'dashboard'
                    ? 'bg-zinc-850 text-emerald-400 border border-zinc-700 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Analytics</span>
              </button>

              <button
                id="nav-btn-rules"
                onClick={() => setCurrentTab('rules')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  currentTab === 'rules'
                    ? 'bg-zinc-850 text-emerald-400 border border-zinc-700 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
                }`}
              >
                <ScrollText className="w-4 h-4" />
                <span>Rules</span>
              </button>
            </nav>

            {/* Right Action Tools: Theme, Demo Reset, User Profile */}
            <div className="flex items-center gap-2">
              <button
                id="btn-reset-demo-data"
                onClick={onResetDemo}
                title="Reset Sample Inspection Data"
                className="p-2 rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850 transition-colors border border-transparent hover:border-zinc-800 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <button
                id="theme-toggle-btn"
                onClick={toggleTheme}
                title={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
                className="p-2 rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850 transition-colors border border-transparent hover:border-zinc-800 cursor-pointer"
              >
                {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-zinc-400" />}
              </button>

              {/* User Profile Trigger */}
              <button
                id="user-auth-trigger-btn"
                onClick={onOpenAuth}
                className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-200 transition-colors cursor-pointer"
              >
                <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs border border-emerald-500/30">
                  {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <span className="text-xs font-medium max-w-[100px] truncate hidden sm:inline">
                  {currentUser?.name || 'Account'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* MOBILE BOTTOM NAVIGATION BAR (Section 8: Home, Inspections, Profile) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-zinc-950/95 backdrop-blur-md border-t border-zinc-800 px-6 py-2 flex items-center justify-around shadow-2xl">
        <button
          type="button"
          onClick={() => setCurrentTab('home')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl text-[10px] font-semibold transition-colors cursor-pointer ${
            currentTab === 'home' ? 'text-emerald-400' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Home className="w-5 h-5" />
          <span>Home</span>
        </button>

        <button
          type="button"
          onClick={() => setCurrentTab('new-scan')}
          className="flex flex-col items-center -mt-5 cursor-pointer"
        >
          <div className="w-12 h-12 rounded-full bg-emerald-500 text-zinc-950 flex items-center justify-center shadow-lg shadow-emerald-500/30 active:scale-95 transition-transform">
            <Camera className="w-6 h-6" />
          </div>
          <span className="text-[10px] font-bold text-emerald-400 mt-0.5">Scan</span>
        </button>

        <button
          type="button"
          onClick={() => setCurrentTab('inspections')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl text-[10px] font-semibold transition-colors cursor-pointer ${
            currentTab === 'inspections' ? 'text-emerald-400' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <FileCheck2 className="w-5 h-5" />
          <span>Inspections</span>
        </button>

        <button
          type="button"
          onClick={() => setCurrentTab('settings')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl text-[10px] font-semibold transition-colors cursor-pointer ${
            currentTab === 'settings' ? 'text-emerald-400' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <User className="w-5 h-5" />
          <span>Profile</span>
        </button>
      </nav>
    </>
  );
};
