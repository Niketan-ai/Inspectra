import React from 'react';
import { Printer, ArrowLeft, Shield, Scale, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { ScanSession } from '../types.js';

interface ReportPrintViewProps {
  session: ScanSession;
  onBack: () => void;
}

export const ReportPrintView: React.FC<ReportPrintViewProps> = ({ session, onBack }) => {
  const handlePrint = () => {
    window.print();
  };

  const pId = session.productIdentity;
  const decs = session.extractedDeclarations;
  const allRules = session.ruleResults || [];
  const failedRules = allRules.filter(r => r.status === 'FAIL');
  const reviewRules = allRules.filter(r => r.status === 'REVIEW_REQUIRED');
  const passedRules = allRules.filter(r => r.status === 'PASS');

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      {/* Top Action Bar (Hidden on Print) */}
      <div className="flex items-center justify-between print:hidden p-4 rounded-xl bg-zinc-900 border border-zinc-800">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Inspection Details</span>
        </button>

        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-bold shadow-lg shadow-emerald-500/20"
        >
          <Printer className="w-4 h-4" />
          <span>Print / Export Inspection Report</span>
        </button>
      </div>

      {/* Official Report Document Container */}
      <div
        className="p-8 sm:p-12 rounded-2xl bg-white text-zinc-900 border border-zinc-200 shadow-2xl space-y-8 print:p-0 print:border-none print:shadow-none print:rounded-none font-sans"
        id="official-inspection-report-document"
      >
        {/* Document Header */}
        <div className="border-b-2 border-zinc-900 pb-6 text-center space-y-1">
          <div className="flex items-center justify-center gap-2 text-zinc-800 font-extrabold uppercase tracking-widest text-xs">
            <Scale className="w-4 h-4" />
            <span>Ministry of Consumer Affairs, Food & Public Distribution</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-zinc-950">
            Legal Metrology Packaged Commodities Inspection Report
          </h1>
          <p className="text-xs text-zinc-600 font-medium">
            Pursuant to the Legal Metrology (Packaged Commodities) Rules, 2011 & The Legal Metrology Act, 2009
          </p>
          <div className="pt-2 flex items-center justify-center gap-4 text-xs font-mono text-zinc-600">
            <span>REFERENCE ID: <strong>{session.scanId}</strong></span>
            <span>•</span>
            <span>INSPECTION DATE: <strong>{new Date(session.createdAt).toLocaleDateString()} {new Date(session.createdAt).toLocaleTimeString()}</strong></span>
          </div>
        </div>

        {/* Product Identity Summary */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-700 border-b border-zinc-300 pb-1">
            1. Inspected Commodity Details
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-zinc-500 block">Commodity Name:</span>
              <span className="font-bold text-zinc-900">{pId.productName || 'Unstated'}</span>
            </div>
            <div>
              <span className="text-zinc-500 block">Brand / Trade Name:</span>
              <span className="font-bold text-zinc-900">{pId.brand || 'Unstated'}</span>
            </div>
            <div>
              <span className="text-zinc-500 block">Declared Net Quantity:</span>
              <span className="font-bold text-zinc-900 font-mono">{pId.netQuantity || 'Unstated'}</span>
            </div>
            <div>
              <span className="text-zinc-500 block">Packaging Type:</span>
              <span className="font-bold text-zinc-900">{pId.packagingIdentifier || 'Pre-packaged Unit'}</span>
            </div>
          </div>

          <div className="p-3 bg-zinc-50 border border-zinc-200 rounded text-xs">
            <span className="font-semibold text-zinc-700">Cross-Surface Consistency Assessment: </span>
            <span className="text-zinc-800">{pId.matchAssessment}</span>
            {pId.mismatchDetails && (
              <p className="mt-1 text-rose-700 font-semibold">{pId.mismatchDetails}</p>
            )}
          </div>
        </div>

        {/* 4-Panel Photographic Specimen Thumbnails */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-700 border-b border-zinc-300 pb-1">
            2. Photographic Specimen Panels Ingested
          </h2>
          <div className="grid grid-cols-4 gap-2">
            {(['front', 'back', 'upper', 'lower'] as const).map(side => {
              const img = session.images[side];
              return (
                <div key={side} className="border border-zinc-200 rounded p-2 text-center bg-zinc-50">
                  <span className="text-[10px] font-bold uppercase font-mono text-zinc-600 block mb-1">
                    {side} Panel
                  </span>
                  {img ? (
                    <img
                      src={img.previewUrl}
                      alt={side}
                      className="w-full aspect-square object-cover rounded border border-zinc-300 mb-1"
                    />
                  ) : (
                    <div className="w-full aspect-square bg-zinc-200 rounded flex items-center justify-center text-[10px] text-zinc-500 mb-1">
                      Not Captured
                    </div>
                  )}
                  <span className="text-[9px] text-zinc-500 font-mono">
                    {img?.quality?.resolution || '—'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Declarations Extraction Table */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-700 border-b border-zinc-300 pb-1">
            3. Statutory Declarations Extracted (Rule 6 Compliance)
          </h2>
          <table className="w-full text-left text-xs border border-zinc-300 divide-y divide-zinc-200">
            <thead className="bg-zinc-100 font-bold text-zinc-800">
              <tr>
                <th className="p-2 border-r border-zinc-300">Statutory Field</th>
                <th className="p-2 border-r border-zinc-300">Extracted Package Value</th>
                <th className="p-2 border-r border-zinc-300">Panel</th>
                <th className="p-2">Detection Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {Object.values(decs).map((field: any, i) => {
                if (!field.label) return null;
                return (
                  <tr key={i} className="hover:bg-zinc-50">
                    <td className="p-2 font-semibold text-zinc-800 border-r border-zinc-300">{field.label}</td>
                    <td className="p-2 font-mono text-zinc-900 border-r border-zinc-300">
                      {field.value || '—'}
                      {field.isEdited && (
                        <span className="text-[9px] block text-amber-700 font-sans italic">
                          (Verified by inspector: {field.originalValue})
                        </span>
                      )}
                    </td>
                    <td className="p-2 uppercase font-mono text-[10px] text-zinc-600 border-r border-zinc-300">
                      {field.sourceImage || '—'}
                    </td>
                    <td className="p-2">
                      <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                        field.status === 'DETECTED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : field.status === 'NOT_DETECTED'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-zinc-100 text-zinc-700'
                      }`}>
                        {field.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Violations & Observations */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-700 border-b border-zinc-300 pb-1">
            4. Statutory Rule Engine Findings & Violations
          </h2>

          {failedRules.length === 0 ? (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-700" />
              <span>No direct statutory violations detected across automated inspection rules.</span>
            </div>
          ) : (
            <div className="space-y-2">
              {failedRules.map(rule => (
                <div key={rule.ruleId} className="p-3 rounded border border-rose-300 bg-rose-50/70 text-xs space-y-1">
                  <div className="flex items-center justify-between font-bold text-rose-950">
                    <span>{rule.ruleName} ({rule.legalReference})</span>
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 bg-rose-200 text-rose-900 rounded">
                      VIOLATION ({rule.severity})
                    </span>
                  </div>
                  <p className="text-zinc-800 font-medium">{rule.explanation || rule.reason}</p>
                  <p className="text-[11px] text-zinc-600 italic">
                    Recommendation: {rule.recommendedAction}
                  </p>
                </div>
              ))}
            </div>
          )}

          {reviewRules.length > 0 && (
            <div className="mt-3 space-y-2">
              <span className="text-xs font-semibold text-amber-800 block">
                Fields Flagged for Physical Measurement / Officer Review ({reviewRules.length}):
              </span>
              {reviewRules.map(rule => (
                <div key={rule.ruleId} className="p-2.5 rounded border border-amber-200 bg-amber-50 text-xs">
                  <span className="font-bold text-amber-950">{rule.ruleName}: </span>
                  <span className="text-zinc-800">{rule.explanation || rule.reason}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Screening Score */}
        <div className="p-4 bg-zinc-100 rounded-xl border border-zinc-300 flex items-center justify-between">
          <div>
            <span className="text-xs uppercase font-bold text-zinc-600 block">
              Inspection Screening Score
            </span>
            <span className="text-2xl font-black font-mono text-zinc-950">
              {session.screeningScore.overall} / 100
            </span>
          </div>
          <div className="text-right">
            <span className={`px-3 py-1 rounded text-xs font-bold uppercase tracking-wider ${
              session.screeningScore.status === 'PASS'
                ? 'bg-emerald-600 text-white'
                : session.screeningScore.status === 'REVIEW REQUIRED'
                ? 'bg-amber-500 text-white'
                : 'bg-rose-600 text-white'
            }`}>
              {session.screeningScore.status}
            </span>
            <p className="text-[10px] text-zinc-500 mt-1 max-w-xs">
              {session.screeningScore.disclaimer}
            </p>
          </div>
        </div>

        {/* Final Inspector Assessment Block */}
        <div className="pt-4 border-t-2 border-zinc-900 space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-700">
            5. Legal Metrology Officer Final Determination
          </h2>

          <div className="grid grid-cols-3 gap-3 text-xs">
            <div className="p-3 border border-zinc-300 rounded flex items-center gap-2">
              <input
                type="checkbox"
                readOnly
                checked={session.inspectorAssessment?.decision === 'ACCEPT'}
                className="w-4 h-4"
              />
              <span className="font-semibold">ACCEPT (Compliant)</span>
            </div>
            <div className="p-3 border border-zinc-300 rounded flex items-center gap-2">
              <input
                type="checkbox"
                readOnly
                checked={session.inspectorAssessment?.decision === 'REJECT'}
                className="w-4 h-4"
              />
              <span className="font-semibold">ISSUE NOTICE (Rectify)</span>
            </div>
            <div className="p-3 border border-zinc-300 rounded flex items-center gap-2">
              <input
                type="checkbox"
                readOnly
                checked={session.inspectorAssessment?.decision === 'ESCALATE_FOR_LEGAL_HEARING'}
                className="w-4 h-4"
              />
              <span className="font-semibold">SEIZE / PROCEED TO COURT</span>
            </div>
          </div>

          <div className="border border-zinc-300 rounded p-3 min-h-[60px] text-xs">
            <span className="text-zinc-500 font-semibold block mb-1">Inspector Notes & Remarks:</span>
            <p className="text-zinc-800 font-mono">
              {session.inspectorAssessment?.notes || 'No remarks recorded.'}
            </p>
          </div>

          <div className="pt-8 grid grid-cols-2 gap-8 text-xs">
            <div>
              <div className="border-b border-zinc-400 pb-1 mb-1">
                <span className="font-bold">{session.inspectorAssessment?.assessedBy || 'R. K. Sharma'}</span>
              </div>
              <span className="text-zinc-500">Inspecting Legal Metrology Officer Name & Designation</span>
            </div>
            <div>
              <div className="border-b border-zinc-400 pb-1 mb-1 font-mono">
                {session.inspectorAssessment?.assessedAt
                  ? new Date(session.inspectorAssessment.assessedAt).toLocaleDateString()
                  : new Date().toLocaleDateString()}
              </div>
              <span className="text-zinc-500">Date, Seal & Official Signature</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
