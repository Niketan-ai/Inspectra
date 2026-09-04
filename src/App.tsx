import React, { useState, useEffect } from 'react';
import { Scale } from 'lucide-react';
import { Header, AppTab } from './components/Header.js';
import { ErrorBoundary } from './components/ErrorBoundary.js';
import { AuthView } from './components/AuthView.js';
import { HomeView } from './components/HomeView.js';
import { NewScanView } from './components/NewScanView.js';
import { InspectionsListView } from './components/InspectionsListView.js';
import { InspectionDetailView } from './components/InspectionDetailView.js';
import { DashboardView } from './components/DashboardView.js';
import { RulesManagerView } from './components/RulesManagerView.js';
import { SettingsView } from './components/SettingsView.js';
import { ComplianceRule, DashboardMetrics, ScanSession, UserProfile } from './types.js';
import { api } from './lib/api.js';
import { sanitizeScanSession } from './lib/safeScanData.js';

export default function App() {
  const [currentTab, setCurrentTab] = useState<AppTab>('home');
  const [selectedScanId, setSelectedScanId] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<ScanSession | null>(null);

  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [scans, setScans] = useState<ScanSession[]>([]);
  const [rules, setRules] = useState<ComplianceRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Theme state: dark by default (Section 7: DARK THEME = DEFAULT)
  const [isDark, setIsDark] = useState<boolean>(() => {
    const saved = localStorage.getItem('inspectra_theme');
    return saved ? saved === 'dark' : true;
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
    localStorage.setItem('inspectra_theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  const toggleTheme = () => setIsDark(prev => !prev);

  // Initial Data & Auth Loading
  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      // 1. Current user check
      try {
        const userRes = await api.getMe();
        if (userRes?.user) {
          setCurrentUser(userRes.user);
        }
      } catch (e) {
        console.log('[INSPECTRA] No active user session');
      }

      // 2. Dashboard metrics & scans & rules
      const [dashRes, scansRes, rulesRes] = await Promise.all([
        api.getDashboard().catch(() => ({ metrics: null, recentScans: [] })),
        api.getScans().catch(() => ({ scans: [] })),
        api.getRules().catch(() => ({ rules: [] }))
      ]);

      if (dashRes.metrics) setMetrics(dashRes.metrics);
      if (scansRes.scans) {
        setScans(scansRes.scans.map(sanitizeScanSession));
      }
      if (rulesRes.rules) setRules(rulesRes.rules);
    } catch (err) {
      console.error('[INSPECTRA] Error loading initial app data:', err);
    } finally {
      setIsLoading(false);
      setIsAuthChecking(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Fetch full scan details when selectedScanId changes
  useEffect(() => {
    if (!selectedScanId) {
      setSelectedSession(null);
      return;
    }

    const fetchScan = async () => {
      try {
        const res = await api.getScan(selectedScanId);
        if (res?.session) {
          setSelectedSession(sanitizeScanSession(res.session));
        }
      } catch (e) {
        console.error('Failed to load scan session:', e);
      }
    };
    fetchScan();
  }, [selectedScanId]);

  // Auth Handler
  const handleAuthenticated = (user: UserProfile, token: string) => {
    setCurrentUser(user);
    loadInitialData();
    setCurrentTab('home');
  };

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch (e) {
      // Ignore
    }
    localStorage.removeItem('inspectra_token');
    localStorage.removeItem('inspectra_user_id');
    setCurrentUser(null);
    setSelectedScanId(null);
    setSelectedSession(null);
    setCurrentTab('home');
  };

  // Rule toggle
  const handleToggleRule = async (ruleId: string, enabled: boolean) => {
    try {
      await api.toggleRule(ruleId, enabled);
      setRules(prev =>
        prev.map(r => (r.id === ruleId ? { ...r, enabled } : r))
      );
    } catch (e) {
      console.error(e);
    }
  };

  // Reset demo datasets
  const handleResetDemo = async () => {
    await api.resetDemoData();
    setSelectedScanId(null);
    setSelectedSession(null);
    await loadInitialData();
  };

  // When a new scan is analyzed in NewScanView
  const handleScanCreated = (rawSession: ScanSession) => {
    const session = sanitizeScanSession(rawSession);
    setSelectedScanId(session.scanId);
    setSelectedSession(session);
    setScans(prev => [session, ...prev.filter(s => s.scanId !== session.scanId)]);
  };

  // When an existing scan is edited or assessed
  const handleSessionUpdated = (updated: ScanSession) => {
    const safe = sanitizeScanSession(updated);
    setSelectedSession(safe);
    setScans(prev => prev.map(s => (s.scanId === safe.scanId ? safe : s)));
    api.getDashboard().then(res => {
      if (res.metrics) setMetrics(res.metrics);
    });
  };

  // While verifying initial credentials and session
  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 text-zinc-100">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-white animate-pulse">
            <Scale className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div className="text-center space-y-1">
            <h1 className="font-extrabold tracking-tight text-lg text-zinc-100">
              INSPECTRA
            </h1>
            <p className="text-xs font-mono text-zinc-500">
              Verifying inspector session...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // If not authenticated, render the clean Auth flow (Sections 10-13)
  if (!currentUser) {
    return (
      <ErrorBoundary>
        <AuthView onAuthenticated={handleAuthenticated} />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-zinc-950 text-zinc-100 selection:bg-emerald-500 selection:text-zinc-950 font-sans transition-colors duration-150 pb-20 md:pb-10">
        {/* Header with desktop navigation & quick tools */}
        <Header
          currentTab={currentTab}
          setCurrentTab={tab => {
            setSelectedScanId(null);
            setSelectedSession(null);
            setCurrentTab(tab);
          }}
          currentUser={currentUser}
          onOpenAuth={() => setCurrentTab('settings')}
          isDark={isDark}
          toggleTheme={toggleTheme}
          onResetDemo={handleResetDemo}
        />

        {/* Main Content View Container */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          {selectedSession ? (
            /* Result Screen wrapped in its own Error Boundary to guarantee no white screens */
            <ErrorBoundary
              onReset={() => {
                setSelectedScanId(null);
                setSelectedSession(null);
              }}
            >
              <InspectionDetailView
                session={selectedSession}
                onBack={() => {
                  setSelectedScanId(null);
                  setSelectedSession(null);
                }}
                onSessionUpdated={handleSessionUpdated}
              />
            </ErrorBoundary>
          ) : currentTab === 'home' ? (
            /* Clean Home Screen (Section 14-15) */
            <HomeView
              currentUser={currentUser}
              recentScans={scans}
              onStartNewScan={() => setCurrentTab('new-scan')}
              onSelectScan={scanId => setSelectedScanId(scanId)}
              onViewAllInspections={() => setCurrentTab('inspections')}
            />
          ) : currentTab === 'new-scan' ? (
            /* 6-step Scanning Wizard (Sections 16-19) */
            <NewScanView
              onScanCreated={handleScanCreated}
              onCancel={() => setCurrentTab('home')}
            />
          ) : currentTab === 'inspections' ? (
            <InspectionsListView
              scans={scans}
              onSelectScan={scanId => setSelectedScanId(scanId)}
              onStartNewScan={() => setCurrentTab('new-scan')}
            />
          ) : currentTab === 'dashboard' ? (
            <DashboardView
              metrics={metrics}
              recentScans={scans.slice(0, 6)}
              onStartNewScan={() => setCurrentTab('new-scan')}
              onSelectScan={scanId => setSelectedScanId(scanId)}
              onViewAllInspections={() => setCurrentTab('inspections')}
            />
          ) : currentTab === 'rules' ? (
            <RulesManagerView rules={rules} onToggleRule={handleToggleRule} />
          ) : currentTab === 'settings' ? (
            <SettingsView
              currentUser={currentUser}
              onOpenAuth={() => {}}
              isDark={isDark}
              toggleTheme={toggleTheme}
              onResetDemo={handleResetDemo}
              onLogout={handleLogout}
            />
          ) : null}
        </main>
      </div>
    </ErrorBoundary>
  );
}
