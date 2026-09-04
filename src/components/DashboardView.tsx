import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileSearch,
  PlusCircle,
  TrendingUp,
  ShieldAlert,
  ChevronRight,
  Info,
  Calendar,
  Sparkles
} from 'lucide-react';
import { DashboardMetrics, ScanSession } from '../types.js';

interface DashboardViewProps {
  metrics: DashboardMetrics | null;
  recentScans: ScanSession[];
  onStartNewScan: () => void;
  onSelectScan: (scanId: string) => void;
  onViewAllInspections: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  metrics,
  recentScans,
  onStartNewScan,
  onSelectScan,
  onViewAllInspections
}) => {
  const total = metrics?.totalInspections || 0;
  const violations = metrics?.potentialViolations || 0;
  const reviews = metrics?.reviewRequired || 0;
  const compliant = metrics?.compliantCount || 0;

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Top Banner: Statutory Context */}
      <div className="rounded-2xl bg-gradient-to-r from-zinc-900 via-zinc-900/90 to-zinc-900 border border-zinc-800 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="space-y-2 max-w-2xl relative z-10">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3 h-3" />
              Statutory Inspection Portal
            </span>
            <span className="text-xs text-zinc-500 font-mono">
              Enforcement Protocol 2011
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-100 tracking-tight">
            Legal Metrology Packaged Commodities Verification
          </h1>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Multi-surface image reconciliation and deterministic rule evaluation
            under the Legal Metrology (Packaged Commodities) Rules, 2011.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto relative z-10">
          <button
            id="dashboard-start-scan-btn"
            onClick={onStartNewScan}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-sm transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
          >
            <PlusCircle className="w-5 h-5" />
            <span>Scan New Commodity</span>
          </button>
        </div>
      </div>

      {/* 4 Core Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Inspected */}
        <div className="p-5 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between shadow-sm hover:border-zinc-700 transition-colors">
          <div>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Total Inspected
            </p>
            <h3 className="text-3xl font-extrabold text-zinc-100 mt-1 font-mono">
              {total}
            </h3>
            <p className="text-xs text-zinc-500 mt-1 flex items-center gap-1">
              <span>All 4-sided package sets</span>
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-zinc-800 text-zinc-300 flex items-center justify-center">
            <FileSearch className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2: Potential Violations */}
        <div className="p-5 rounded-xl bg-zinc-900 border border-rose-500/20 flex items-center justify-between shadow-sm hover:border-rose-500/40 transition-colors">
          <div>
            <p className="text-xs font-semibold text-rose-400 uppercase tracking-wider">
              Potential Violations
            </p>
            <h3 className="text-3xl font-extrabold text-rose-400 mt-1 font-mono">
              {violations}
            </h3>
            <p className="text-xs text-zinc-500 mt-1">
              Rule breaches or missing fields
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center border border-rose-500/20">
            <ShieldAlert className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3: Review Required */}
        <div className="p-5 rounded-xl bg-zinc-900 border border-amber-500/20 flex items-center justify-between shadow-sm hover:border-amber-500/40 transition-colors">
          <div>
            <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
              Review Required
            </p>
            <h3 className="text-3xl font-extrabold text-amber-400 mt-1 font-mono">
              {reviews}
            </h3>
            <p className="text-xs text-zinc-500 mt-1">
              Uncertain font or blurry OCR
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        {/* Card 4: Compliant Packages */}
        <div className="p-5 rounded-xl bg-zinc-900 border border-emerald-500/20 flex items-center justify-between shadow-sm hover:border-emerald-500/40 transition-colors">
          <div>
            <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
              Fully Compliant
            </p>
            <h3 className="text-3xl font-extrabold text-emerald-400 mt-1 font-mono">
              {compliant}
            </h3>
            <p className="text-xs text-zinc-500 mt-1">
              All mandatory declarations verified
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Middle Section: Analytics & Common Non-Compliances */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Violations by Category */}
        <div className="p-5 rounded-xl bg-zinc-900 border border-zinc-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              Violations by Statutory Category
            </h3>
          </div>

          <div className="space-y-3 pt-2">
            {(metrics?.violationsByCategory || []).map((cat, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-300 font-medium">{cat.category}</span>
                  <span className="text-zinc-400 font-mono">
                    {cat.count} ({cat.percentage}%)
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-500 to-rose-500 transition-all duration-500"
                    style={{ width: `${Math.max(5, cat.percentage)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Common Missing Declarations */}
        <div className="p-5 rounded-xl bg-zinc-900 border border-zinc-800 space-y-4">
          <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            Top Missing Mandatory Declarations
          </h3>

          <div className="space-y-2.5 pt-2">
            {(metrics?.commonMissingDeclarations || []).length === 0 ? (
              <p className="text-xs text-zinc-500 italic">No missing declarations recorded.</p>
            ) : (
              (metrics?.commonMissingDeclarations || []).map((item, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-lg bg-zinc-950/60 border border-zinc-800/80 flex items-center justify-between text-xs"
                >
                  <span className="text-zinc-300 font-medium truncate pr-2">{item.field}</span>
                  <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 font-mono font-bold border border-rose-500/20">
                    {item.count} occurrences
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Inspection Inspection Trend (5-day) */}
        <div className="p-5 rounded-xl bg-zinc-900 border border-zinc-800 space-y-4">
          <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            Inspection Activity Trend
          </h3>

          <div className="space-y-3 pt-2">
            {(metrics?.recentTrend || []).map((t, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs py-1 border-b border-zinc-800/60 last:border-0">
                <span className="text-zinc-400 font-medium flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                  {t.date}
                </span>
                <div className="flex items-center gap-3 font-mono">
                  <span className="text-zinc-300">{t.inspections} Scans</span>
                  <span className="text-rose-400 font-bold">{t.violations} Violations</span>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2">
            <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10 text-[11px] text-zinc-400 flex items-start gap-2">
              <Info className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <span>
                Automated screening results are calculated deterministically. Authorized inspectors should verify original physical packages.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Inspections Table */}
      <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-zinc-100">
              Recent Inspection Sessions
            </h2>
            <p className="text-xs text-zinc-400">
              Click any package inspection to view evidence bounding boxes, extracted declarations, and audit logs.
            </p>
          </div>

          <button
            onClick={onViewAllInspections}
            className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
          >
            <span>View All Records</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-zinc-800 text-zinc-400 uppercase font-semibold">
              <tr>
                <th className="py-3 px-3">Scan ID</th>
                <th className="py-3 px-3">Commodity & Brand</th>
                <th className="py-3 px-3">Net Qty</th>
                <th className="py-3 px-3">Screening Status</th>
                <th className="py-3 px-3">Compliance Score</th>
                <th className="py-3 px-3">Images</th>
                <th className="py-3 px-3">Timestamp</th>
                <th className="py-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 text-zinc-200">
              {recentScans.map(scan => {
                const imgCount = Object.values(scan.images || {}).filter(Boolean).length;
                const status = scan.screeningScore?.status || 'REVIEW REQUIRED';
                const overallScore = scan.screeningScore?.overall ?? 0;
                const statusColor =
                  status === 'PASS'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : status === 'REVIEW REQUIRED'
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    : 'bg-rose-500/10 text-rose-400 border-rose-500/20';

                return (
                  <tr
                    key={scan.scanId}
                    onClick={() => onSelectScan(scan.scanId)}
                    className="hover:bg-zinc-800/40 cursor-pointer transition-colors group"
                  >
                    <td className="py-3 px-3 font-mono font-bold text-zinc-300 group-hover:text-emerald-400">
                      {scan.scanId}
                      {scan.isDemo && (
                        <span className="block text-[9px] font-sans text-zinc-500 uppercase tracking-wider">
                          Demo
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-zinc-100">
                        {scan.productIdentity?.productName || 'Unclassified Commodity'}
                      </div>
                      <div className="text-[11px] text-zinc-400">
                        {scan.productIdentity?.brand || 'Brand unread'}
                      </div>
                    </td>
                    <td className="py-3 px-3 font-mono">
                      {scan.productIdentity?.netQuantity || '—'}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${statusColor}`}>
                        {status}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-zinc-100">
                          {overallScore}/100
                        </span>
                        <div className="w-16 h-1.5 rounded-full bg-zinc-800 overflow-hidden hidden sm:block">
                          <div
                            className={`h-full ${
                              overallScore >= 80
                                ? 'bg-emerald-500'
                                : overallScore >= 50
                                ? 'bg-amber-500'
                                : 'bg-rose-500'
                            }`}
                            style={{ width: `${overallScore}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-mono text-zinc-400">
                        {imgCount}/4 sides
                      </span>
                    </td>
                    <td className="py-3 px-3 text-zinc-400">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-zinc-500" />
                        <span>{new Date(scan.createdAt).toLocaleDateString()}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold group-hover:translate-x-0.5 transition-transform">
                        <span>Inspect</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
