import React from 'react';
import { ArrowLeft, Printer, Download, ShieldCheck, AlertTriangle, FileText, CheckCircle2, Clock } from 'lucide-react';
import { ScanSession } from '../types.js';
import { formatValue } from '../lib/safeScanData.js';

interface ReportViewProps {
  session: ScanSession;
  onBack: () => void;
}

export const ReportView: React.FC<ReportViewProps> = ({ session, onBack }) => {
  const pId = session.productIdentity;
  const decs = session.extractedDeclarations;
  const score = session.screeningScore;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-200 print:p-0 print:m-0 print:max-w-none">
      {/* Top action bar - Hidden during print */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-4 print:hidden">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Inspection</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print / Save PDF</span>
          </button>
        </div>
      </div>

      {/* Printable Report Sheet */}
      <div className="p-6 sm:p-10 rounded-3xl bg-zinc-900 border border-zinc-800 shadow-2xl text-zinc-100 space-y-8 print:border-none print:shadow-none print:p-2 print:bg-white print:text-black">
        {/* Report Official Header */}
        <div className="border-b border-zinc-800 pb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 print:border-b-2 print:border-black">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-widest px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 print:border-black print:text-black print:bg-transparent">
                Statutory Examination
              </span>
              <span className="text-xs text-zinc-500 print:text-gray-600 font-mono">
                Legal Metrology Rules, 2011
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-zinc-100 print:text-black mt-1">
              Packaged Commodity Inspection Report
            </h1>
            <p className="text-xs text-zinc-400 print:text-gray-600 mt-0.5">
              Official verification summary of statutory declarations and packaging compliance.
            </p>
          </div>

          <div className="text-left sm:text-right text-xs font-mono text-zinc-400 print:text-gray-700">
            <div><strong>Inspection ID:</strong> {session.scanId}</div>
            <div><strong>Date:</strong> {new Date(session.createdAt).toLocaleDateString()}</div>
            <div><strong>Status:</strong> {session.status}</div>
          </div>
        </div>

        {/* Section 1: Executive Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-zinc-950/70 border border-zinc-800 print:border print:bg-gray-50">
            <span className="text-[11px] font-semibold text-zinc-400 print:text-gray-600 uppercase">Product Name</span>
            <p className="text-sm font-bold text-zinc-100 print:text-black mt-1">
              {formatValue(pId?.productName || decs?.product_name?.value)}
            </p>
            {pId?.brand && (
              <p className="text-xs text-zinc-400 print:text-gray-600 mt-0.5">
                Brand: {pId.brand}
              </p>
            )}
          </div>

          <div className="p-4 rounded-2xl bg-zinc-950/70 border border-zinc-800 print:border print:bg-gray-50">
            <span className="text-[11px] font-semibold text-zinc-400 print:text-gray-600 uppercase">Screening Result</span>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={`text-sm font-extrabold font-mono px-2 py-0.5 rounded ${
                  score?.status === 'PASS'
                    ? 'text-emerald-400 bg-emerald-500/10'
                    : 'text-rose-400 bg-rose-500/10'
                }`}
              >
                {score?.status || 'REVIEW REQUIRED'}
              </span>
            </div>
            <p className="text-xs text-zinc-400 print:text-gray-600 mt-1">
              Compliance Score: {score?.overall || 0}/100
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-950/70 border border-zinc-800 print:border print:bg-gray-50">
            <span className="text-[11px] font-semibold text-zinc-400 print:text-gray-600 uppercase">Net Quantity & MRP</span>
            <p className="text-sm font-bold text-zinc-100 print:text-black mt-1">
              Qty: {formatValue(decs?.net_quantity?.value)}
            </p>
            <p className="text-xs text-zinc-400 print:text-gray-600 mt-0.5">
              MRP: {formatValue(decs?.mrp?.value)}
            </p>
          </div>
        </div>

        {/* Section 2: Extracted Statutory Declarations */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-zinc-200 print:text-black uppercase tracking-wider flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-400 print:text-black" />
            <span>Extracted Statutory Declarations</span>
          </h2>

          <div className="border border-zinc-800 rounded-2xl overflow-hidden print:border-black">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-zinc-950 text-zinc-400 print:bg-gray-100 print:text-black border-b border-zinc-800 print:border-black">
                  <th className="py-2.5 px-3 font-semibold">Mandatory Field</th>
                  <th className="py-2.5 px-3 font-semibold">Extracted Packaging Value</th>
                  <th className="py-2.5 px-3 font-semibold">Source Panel</th>
                  <th className="py-2.5 px-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/80 print:divide-gray-300">
                {[
                  { label: 'Commodity Name', field: decs?.product_name },
                  { label: 'Brand / Trade Name', field: decs?.brand_name },
                  { label: 'Manufacturer Name', field: decs?.manufacturer },
                  { label: 'Manufacturer Address', field: decs?.manufacturer_address },
                  { label: 'Net Quantity', field: decs?.net_quantity },
                  { label: 'MRP (incl. of all taxes)', field: decs?.mrp },
                  { label: 'Date of Mfg / Packing', field: decs?.manufacturing_or_packing_date },
                  { label: 'Expiry / Best Before', field: decs?.best_before_or_expiry },
                  { label: 'Consumer Care Cell', field: decs?.consumer_care_details },
                  { label: 'Country of Origin', field: decs?.country_of_origin }
                ].map(({ label, field }) => (
                  <tr key={label} className="hover:bg-zinc-850/40 print:hover:bg-transparent">
                    <td className="py-2 px-3 font-medium text-zinc-300 print:text-black">{label}</td>
                    <td className="py-2 px-3 font-mono text-zinc-100 print:text-black">
                      {formatValue(field?.value)}
                    </td>
                    <td className="py-2 px-3 font-mono text-zinc-400 print:text-gray-700 uppercase">
                      {field?.sourceImage || 'N/A'}
                    </td>
                    <td className="py-2 px-3">
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          field?.status === 'DETECTED'
                            ? 'text-emerald-400 bg-emerald-500/10'
                            : 'text-amber-400 bg-amber-500/10'
                        }`}
                      >
                        {field?.status || 'NOT_DETECTED'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 3: Compliance Screening Checklist */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-zinc-200 print:text-black uppercase tracking-wider flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 print:text-black" />
            <span>Statutory Compliance Screening Results</span>
          </h2>

          <div className="space-y-2">
            {(session.ruleResults || []).map(rule => (
              <div
                key={rule.ruleId}
                className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800 print:border print:bg-gray-50 flex items-start justify-between gap-4 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-zinc-100 print:text-black">{rule.ruleName}</span>
                    <span className="font-mono text-[10px] text-zinc-400 print:text-gray-600">
                      ({rule.legalReference})
                    </span>
                  </div>
                  <p className="text-zinc-400 print:text-gray-700 text-[11px] leading-relaxed">
                    {rule.reason || rule.detectedDetails}
                  </p>
                </div>
                <span
                  className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] flex-shrink-0 ${
                    rule.status === 'PASS'
                      ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
                      : 'text-rose-400 bg-rose-500/10 border border-rose-500/20'
                  }`}
                >
                  {rule.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Section 4: Photo Evidence Record */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-zinc-200 print:text-black uppercase tracking-wider">
            Photographic Evidence Panels
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {(['front', 'back', 'upper', 'lower'] as const).map(side => {
              const img = session.images?.[side];
              return (
                <div
                  key={side}
                  className="rounded-xl bg-zinc-950 border border-zinc-800 overflow-hidden p-2 text-center text-xs print:border-black"
                >
                  <span className="font-mono font-bold uppercase text-[10px] text-zinc-400 print:text-gray-700 block mb-1">
                    {side}
                  </span>
                  <div className="aspect-square bg-zinc-900 rounded-lg overflow-hidden flex items-center justify-center">
                    {img?.previewUrl ? (
                      <img
                        src={img.previewUrl}
                        alt={side}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <span className="text-zinc-600 text-[10px]">Not provided</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 5: Auditor Certification Sign-off */}
        <div className="border-t border-zinc-800 pt-6 mt-8 text-xs text-zinc-400 print:text-gray-700 print:border-t-2 print:border-black flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="font-semibold text-zinc-300 print:text-black">
              Verified by Inspectra Legal Metrology Verification Engine
            </p>
            <p className="text-[11px] text-zinc-500 print:text-gray-600">
              Disclaimer: Screenings are advisory based on visible label photography. Font sizes must be verified with physical gauge.
            </p>
          </div>

          <div className="text-right font-mono text-[11px]">
            <div>Timestamp: {new Date().toISOString()}</div>
            <div>Signatory: Authorized Officer</div>
          </div>
        </div>
      </div>
    </div>
  );
};
