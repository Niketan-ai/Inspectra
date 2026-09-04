import React from 'react';
import { Camera, ArrowRight, ShieldCheck, AlertTriangle, Clock, ArrowUpRight, Sparkles } from 'lucide-react';
import { ScanSession, UserProfile } from '../types.js';

interface HomeViewProps {
  currentUser: UserProfile | null;
  recentScans: ScanSession[];
  onStartNewScan: () => void;
  onSelectScan: (scanId: string) => void;
  onViewAllInspections: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  currentUser,
  recentScans,
  onStartNewScan,
  onSelectScan,
  onViewAllInspections
}) => {
  // Show only the last 3 inspections
  const displayScans = recentScans.slice(0, 3);

  const getStatusBadge = (status: string, scoreStatus?: string) => {
    if (status === 'HUMAN_REVIEW_REQUESTED') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-full">
          <Clock className="w-3 h-3" />
          Review Requested
        </span>
      );
    }
    if (status === 'MISMATCH_DETECTED' || scoreStatus === 'POTENTIAL NON-COMPLIANCE') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full">
          <AlertTriangle className="w-3 h-3" />
          Review Required
        </span>
      );
    }
    if (status === 'REVIEWED') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-400 bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 rounded-full">
          <ShieldCheck className="w-3 h-3" />
          Reviewed
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
        <ShieldCheck className="w-3 h-3" />
        Completed
      </span>
    );
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* Welcome Header */}
      <div className="space-y-1">
        <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider">
          Legal Metrology Quality Portal
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-100 tracking-tight">
          Welcome, {currentUser?.name || 'Inspector'}
        </h1>
        <p className="text-xs sm:text-sm text-zinc-400">
          Fast optical label extraction and statutory packaging declaration screening.
        </p>
      </div>

      {/* Primary Action Card: Scan Product */}
      <div
        id="home-primary-scan-action"
        className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-zinc-900 to-zinc-950 border border-emerald-500/30 shadow-xl shadow-emerald-500/5 space-y-5 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Camera className="w-44 h-44 text-emerald-400" />
        </div>

        <div className="space-y-2 relative z-10 max-w-md">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Ready for Capture</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-zinc-100">
            Scan Product
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
            Scan a packaged product to read its label and check configured compliance requirements.
          </p>
        </div>

        <div className="pt-2 relative z-10 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <button
            type="button"
            id="start-new-scan-btn"
            onClick={onStartNewScan}
            className="w-full sm:w-auto py-3.5 px-6 rounded-2xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-zinc-950 font-bold text-sm flex items-center justify-center gap-2.5 shadow-lg shadow-emerald-500/25 transition-all cursor-pointer"
          >
            <Camera className="w-5 h-5" />
            <span>Start New Inspection</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </button>
          <button
            type="button"
            id="my-inspections-btn"
            onClick={onViewAllInspections}
            className="w-full sm:w-auto py-3.5 px-6 rounded-2xl bg-zinc-800 hover:bg-zinc-750 active:bg-zinc-700 text-zinc-200 font-semibold text-sm flex items-center justify-center gap-2 border border-zinc-700 transition-colors cursor-pointer"
          >
            <span>My Inspections</span>
          </button>
        </div>
      </div>

      {/* Recent Inspections Section (Only last 3) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-bold text-zinc-100">
            Recent Inspections
          </h2>
          {recentScans.length > 0 && (
            <button
              type="button"
              onClick={onViewAllInspections}
              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span>View all</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {displayScans.length === 0 ? (
          <div className="p-8 rounded-2xl bg-zinc-900/60 border border-zinc-800 text-center space-y-3">
            <div className="w-12 h-12 rounded-xl bg-zinc-800 text-zinc-400 flex items-center justify-center mx-auto">
              <Camera className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-zinc-300">No inspections recorded yet</p>
              <p className="text-xs text-zinc-500 max-w-xs mx-auto">
                Capture front and back product photos to begin your first statutory inspection.
              </p>
            </div>
            <button
              type="button"
              onClick={onStartNewScan}
              className="mt-2 text-xs font-semibold text-emerald-400 hover:text-emerald-300 cursor-pointer"
            >
              Start First Inspection →
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {displayScans.map(scan => {
              const productName =
                scan.productIdentity?.productName ||
                scan.extractedDeclarations?.product_name?.value ||
                'Packaged Commodity Specimen';
              const brand =
                scan.productIdentity?.brand ||
                scan.extractedDeclarations?.brand_name?.value ||
                '';
              const formattedDate = new Date(scan.createdAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              });

              return (
                <div
                  key={scan.scanId}
                  id={`recent-scan-${scan.scanId}`}
                  onClick={() => onSelectScan(scan.scanId)}
                  className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800/90 hover:border-zinc-700 hover:bg-zinc-850 transition-all cursor-pointer flex items-center justify-between gap-4 group"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-zinc-950 border border-zinc-800 flex-shrink-0 overflow-hidden flex items-center justify-center">
                      {scan.images?.front?.previewUrl ? (
                        <img
                          src={scan.images.front.previewUrl}
                          alt={productName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Camera className="w-5 h-5 text-zinc-600" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-zinc-100 truncate group-hover:text-emerald-400 transition-colors">
                          {productName}
                        </span>
                        {brand && (
                          <span className="text-[11px] text-zinc-500 truncate hidden sm:inline">
                            • {brand}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-zinc-400 mt-0.5">
                        <span className="font-mono text-zinc-500">{scan.scanId}</span>
                        <span>•</span>
                        <span>{formattedDate}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {getStatusBadge(scan.status, scan.screeningScore?.status)}
                    <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:text-zinc-300 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
