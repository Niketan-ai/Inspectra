import React, { useState } from 'react';
import { Search, Filter, PlusCircle, ChevronRight, Clock, FileCheck2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { ScanSession } from '../types.js';

interface InspectionsListViewProps {
  scans: ScanSession[];
  onSelectScan: (scanId: string) => void;
  onStartNewScan: () => void;
}

export const InspectionsListView: React.FC<InspectionsListViewProps> = ({
  scans,
  onSelectScan,
  onStartNewScan
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const filteredScans = scans.filter(scan => {
    const q = search.toLowerCase();
    const matchesSearch =
      scan.scanId.toLowerCase().includes(q) ||
      (scan.productIdentity?.productName || '').toLowerCase().includes(q) ||
      (scan.productIdentity?.brand || '').toLowerCase().includes(q) ||
      (scan.extractedDeclarations?.manufacturer?.value || '').toLowerCase().includes(q);

    const matchesStatus =
      statusFilter === 'ALL' ||
      scan.screeningScore.status === statusFilter ||
      scan.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-200">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-widest px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
              Inspection Registry
            </span>
            <span className="text-xs text-zinc-500">{scans.length} Recorded Sessions</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-zinc-100 mt-1">
            Packaged Commodities Inspections
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Full repository of 4-panel package captures, multimodal extractions, and statutory evaluations.
          </p>
        </div>

        <button
          onClick={onStartNewScan}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-bold shadow-md shadow-emerald-500/20 active:scale-95"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New Inspection Scan</span>
        </button>
      </div>

      {/* Search & Status Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by product name, brand, scan ID, or manufacturer..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {['ALL', 'PASS', 'REVIEW REQUIRED', 'POTENTIAL NON-COMPLIANCE'].map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                statusFilter === status
                  ? 'bg-zinc-800 text-emerald-400 border border-zinc-700'
                  : 'text-zinc-400 hover:text-zinc-200 bg-zinc-900/60 border border-zinc-800'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Cards List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredScans.map(scan => {
          const frontImg = scan.images?.front;
          const status = scan.screeningScore?.status || 'REVIEW REQUIRED';
          const overallScore = scan.screeningScore?.overall ?? 0;
          const statusColor =
            status === 'PASS'
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : status === 'REVIEW REQUIRED'
              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
              : 'bg-rose-500/10 text-rose-400 border-rose-500/20';

          const imgCount = Object.values(scan.images || {}).filter(Boolean).length;

          return (
            <div
              key={scan.scanId}
              onClick={() => onSelectScan(scan.scanId)}
              className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-all cursor-pointer group shadow-sm flex flex-col justify-between space-y-4"
            >
              <div className="flex items-start gap-4">
                {/* Thumbnail */}
                <div className="w-20 h-20 rounded-xl bg-zinc-950 border border-zinc-800 overflow-hidden flex-shrink-0 flex items-center justify-center">
                  {frontImg ? (
                    <img
                      src={frontImg.previewUrl}
                      alt="front"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <span className="text-[10px] text-zinc-600 font-mono">No Image</span>
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-zinc-300 group-hover:text-emerald-400">
                      {scan.scanId}
                    </span>
                    {scan.isDemo && (
                      <span className="text-[9px] uppercase font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded font-mono">
                        Demo
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm font-bold text-zinc-100 truncate">
                    {scan.productIdentity?.productName || 'Unclassified Commodity'}
                  </h3>
                  <p className="text-xs text-zinc-400 truncate">
                    Brand: {scan.productIdentity?.brand || 'Unstated'} • Qty: {scan.productIdentity?.netQuantity || '—'}
                  </p>
                  <p className="text-[11px] text-zinc-500 truncate">
                    Mfd: {scan.extractedDeclarations?.manufacturer?.value || 'Manufacturer unstated'}
                  </p>
                </div>
              </div>

              {/* Card Footer */}
              <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase font-mono border ${statusColor}`}>
                    {status}
                  </span>
                  <span className="font-mono text-zinc-400 text-[11px]">
                    Score: {overallScore}/100
                  </span>
                </div>

                <div className="flex items-center gap-1 text-emerald-400 font-semibold text-xs group-hover:translate-x-0.5 transition-transform">
                  <span>Review Evidence</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
