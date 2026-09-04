import React, { useState } from 'react';
import {
  ArrowLeft,
  ShieldCheck,
  AlertTriangle,
  FileText,
  Printer,
  Clock,
  Eye,
  Edit3,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Code2,
  Terminal,
  UserCheck,
  ChevronRight,
  Sparkles,
  Camera
} from 'lucide-react';
import {
  DeclarationEvidence,
  DeclarationField,
  ScanSession,
  SideType
} from '../types.js';
import { EvidenceViewerModal } from './EvidenceViewerModal.js';
import { EditDeclarationModal } from './EditDeclarationModal.js';
import { HumanReviewModal } from './HumanReviewModal.js';
import { ReportView } from './ReportView.js';
import { api } from '../lib/api.js';
import { sanitizeScanSession, formatValue } from '../lib/safeScanData.js';

interface InspectionDetailViewProps {
  session: ScanSession;
  onBack: () => void;
  onSessionUpdated: (updatedSession: ScanSession) => void;
}

export const InspectionDetailView: React.FC<InspectionDetailViewProps> = ({
  session: rawSession,
  onBack,
  onSessionUpdated
}) => {
  // Defensive normalization guarantees no undefined accesses
  const session = sanitizeScanSession(rawSession);

  const [activeTab, setActiveTab] = useState<'info' | 'issues' | 'compliance' | 'photos' | 'developer'>('info');
  const [showReportView, setShowReportView] = useState(false);
  const [showHumanReviewModal, setShowHumanReviewModal] = useState(false);
  const [showRawJsonModal, setShowRawJsonModal] = useState(false);

  // Evidence viewer modal state
  const [evidenceViewerState, setEvidenceViewerState] = useState<{
    evidence: DeclarationEvidence;
    label: string;
    value: string | null;
    variant?: 'ERROR' | 'WARNING' | 'NORMAL';
    altEvidence?: DeclarationEvidence | null;
    altLabel?: string;
    altValue?: string | null;
  } | null>(null);

  // Edit declaration modal state
  const [editingField, setEditingField] = useState<DeclarationField | null>(null);

  // Reviewer quick resolution form state
  const [reviewDecision, setReviewDecision] = useState<'CONFIRMED' | 'CORRECTED' | 'REJECTED'>('CONFIRMED');
  const [reviewerNotes, setReviewerNotes] = useState('');
  const [isResolvingReview, setIsResolvingReview] = useState(false);

  if (showReportView) {
    return (
      <ReportView
        session={session}
        onBack={() => setShowReportView(false)}
      />
    );
  }

  const pId = session.productIdentity;
  const decs = session.extractedDeclarations;
  const score = session.screeningScore;

  const handleSaveDeclaration = async (fieldKey: string, newValue: string, reason: string) => {
    const res = await api.updateDeclaration(session.scanId, fieldKey, newValue, reason);
    onSessionUpdated(sanitizeScanSession(res.session));
  };

  const handleResolveHumanReview = async () => {
    setIsResolvingReview(true);
    try {
      const res = await api.resolveHumanReview(session.scanId, {
        decision: reviewDecision,
        observations: reviewerNotes
      });
      onSessionUpdated(sanitizeScanSession(res.session));
    } catch (err: any) {
      alert(err?.message || 'Failed to resolve human review.');
    } finally {
      setIsResolvingReview(false);
    }
  };

  // Identify issues to review (Section 33)
  const missingOrLowConfidenceDecs: { key: string; label: string; field: DeclarationField }[] = [];
  const fieldsToCheck: [string, string, DeclarationField][] = [
    ['product_name', 'Product Name', decs.product_name],
    ['brand_name', 'Brand Name', decs.brand_name],
    ['manufacturer', 'Manufacturer Details', decs.manufacturer],
    ['net_quantity', 'Net Quantity', decs.net_quantity],
    ['mrp', 'Maximum Retail Price', decs.mrp],
    ['manufacturing_or_packing_date', 'Date of Mfg / Packing', decs.manufacturing_or_packing_date],
    ['consumer_care_details', 'Consumer Care Cell', decs.consumer_care_details],
    ['country_of_origin', 'Country of Origin', decs.country_of_origin]
  ];

  for (const [key, label, field] of fieldsToCheck) {
    if (!field || field.status === 'NOT_DETECTED' || field.confidence === 'LOW' || field.inconsistencyFlag) {
      missingOrLowConfidenceDecs.push({ key, label, field });
    }
  }

  const hasConflictingMrp = Boolean(decs.mrp?.alternativeValues && decs.mrp.alternativeValues.length > 0);
  const altMrp = hasConflictingMrp ? decs.mrp.alternativeValues![0] : null;

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-200">
      {/* Evidence Viewer Modal */}
      {evidenceViewerState && (
        <EvidenceViewerModal
          evidence={evidenceViewerState.evidence}
          fieldLabel={evidenceViewerState.label}
          fieldValue={evidenceViewerState.value}
          scanImages={session.images}
          variant={evidenceViewerState.variant}
          alternativeEvidence={evidenceViewerState.altEvidence}
          alternativeLabel={evidenceViewerState.altLabel}
          alternativeValue={evidenceViewerState.altValue}
          onClose={() => setEvidenceViewerState(null)}
        />
      )}

      {/* Edit Declaration Modal */}
      {editingField && (
        <EditDeclarationModal
          field={editingField}
          onSave={handleSaveDeclaration}
          onClose={() => setEditingField(null)}
        />
      )}

      {/* Human Review Modal */}
      {showHumanReviewModal && (
        <HumanReviewModal
          session={session}
          onClose={() => setShowHumanReviewModal(false)}
          onReviewSubmitted={updated => onSessionUpdated(sanitizeScanSession(updated))}
        />
      )}

      {/* Developer Raw JSON Modal */}
      {showRawJsonModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-4xl w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <h3 className="font-mono font-bold text-xs text-zinc-100">
                  Diagnostic Inspection Payload ({session.scanId})
                </h3>
              </div>
              <button
                onClick={() => setShowRawJsonModal(false)}
                className="text-xs px-3 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 cursor-pointer"
              >
                Close
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1 font-mono text-xs text-zinc-300 bg-zinc-950">
              <pre>{JSON.stringify(session, null, 2)}</pre>
            </div>
          </div>
        </div>
      )}

      {/* Top Header & Context */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 transition-colors cursor-pointer"
            title="Return to inspections"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono font-bold text-xs text-zinc-400">
                {session.scanId}
              </span>
              <span
                className={`text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded-full border ${
                  session.status === 'HUMAN_REVIEW_REQUESTED'
                    ? 'bg-purple-500/15 text-purple-400 border-purple-500/30'
                    : session.status === 'REVIEWED'
                    ? 'bg-sky-500/15 text-sky-400 border-sky-500/30'
                    : score.status === 'PASS'
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                    : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                }`}
              >
                {session.status === 'HUMAN_REVIEW_REQUESTED'
                  ? 'Human Review Requested'
                  : session.status === 'REVIEWED'
                  ? 'Reviewed by Inspector'
                  : score.status || 'Review Required'}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-zinc-100 mt-0.5">
              {formatValue(pId.productName || decs.product_name?.value, 'Inspected Package Specimen')}
            </h1>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
          <button
            type="button"
            id="request-human-review-btn"
            onClick={() => setShowHumanReviewModal(true)}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs font-semibold transition-all cursor-pointer"
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Request Human Review</span>
          </button>

          <button
            type="button"
            id="generate-report-btn"
            onClick={() => setShowReportView(true)}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-bold transition-all shadow-md shadow-emerald-500/20 active:scale-95 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Generate Report</span>
          </button>
        </div>
      </div>

      {/* Human Review Status Banner (if review requested or resolved) */}
      {session.humanReview && (
        <div className="p-4 sm:p-5 rounded-2xl bg-purple-500/10 border border-purple-500/30 text-xs text-purple-200 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-sm text-purple-100">
              <UserCheck className="w-4 h-4 text-purple-400" />
              <span>
                {session.humanReview.status === 'RESOLVED'
                  ? 'Human Review Completed'
                  : 'Human Review Requested'}
              </span>
            </div>
            <span className="font-mono text-[10px] text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded">
              {session.humanReview.status}
            </span>
          </div>

          <p className="text-zinc-300">
            <strong>Reason:</strong> {session.humanReview.reason}
          </p>
          {session.humanReview.note && (
            <p className="text-zinc-400">
              <strong>User Note:</strong> "{session.humanReview.note}"
            </p>
          )}

          {/* If resolved */}
          {session.humanReview.status === 'RESOLVED' && (
            <div className="pt-2 border-t border-purple-500/20 text-[11px] text-purple-300 space-y-1">
              <div>
                Reviewed by: <strong>{session.humanReview.reviewerName}</strong> • Decision:{' '}
                <strong>{session.humanReview.reviewerDecision}</strong>
              </div>
              {session.humanReview.observations && (
                <div className="text-zinc-300">
                  Observations: "{session.humanReview.observations}"
                </div>
              )}
            </div>
          )}

          {/* Quick Reviewer Resolution Actions for authorized inspector */}
          {session.humanReview.status === 'PENDING' && (
            <div className="pt-3 border-t border-purple-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <span className="text-[11px] text-purple-300 font-semibold">
                Authorized Reviewer Decision:
              </span>
              <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => {
                    setReviewDecision('CONFIRMED');
                    handleResolveHumanReview();
                  }}
                  disabled={isResolvingReview}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-xs font-semibold cursor-pointer"
                >
                  Confirm AI Extraction
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setReviewDecision('REJECTED');
                    handleResolveHumanReview();
                  }}
                  disabled={isResolvingReview}
                  className="px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-xs font-semibold cursor-pointer"
                >
                  Reject Extraction
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Conflicting MRP Warning Banner (Section 24) */}
      {hasConflictingMrp && altMrp && (
        <div className="p-4 sm:p-5 rounded-2xl bg-rose-500/10 border-2 border-rose-500/40 text-xs text-rose-300 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-sm text-rose-200">
              <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0" />
              <span>POTENTIAL INFORMATION MISMATCH: CONFLICTING MRP</span>
            </div>
            <button
              type="button"
              onClick={() => {
                if (decs.mrp.evidence) {
                  setEvidenceViewerState({
                    evidence: decs.mrp.evidence,
                    label: 'MRP (Primary)',
                    value: decs.mrp.value,
                    variant: 'ERROR',
                    altLabel: `MRP (${altMrp.side.toUpperCase()})`,
                    altValue: altMrp.value
                  });
                }
              }}
              className="px-3 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 text-rose-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>View Conflicting Evidence</span>
            </button>
          </div>
          <p className="text-zinc-200">
            MRP on Front: <strong className="font-mono text-white">{decs.mrp.value || 'N/A'}</strong> vs{' '}
            MRP on {altMrp.side.toUpperCase()}:{' '}
            <strong className="font-mono text-white">{altMrp.value}</strong>. Highlighted in red boxes on the packaging panels.
          </p>
        </div>
      )}

      {/* Image Mismatch Warning Banner (Section 25) */}
      {!pId.isConsistent && (
        <div className="p-4 sm:p-5 rounded-2xl bg-rose-500/10 border-2 border-rose-500/40 text-xs text-rose-300 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-sm text-rose-200">
              <XCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
              <span>POSSIBLE IMAGE MISMATCH DETECTED</span>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('photos')}
              className="px-3 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold cursor-pointer"
            >
              Review Photos
            </button>
          </div>
          <p className="text-zinc-300">{pId.matchAssessment}</p>
          {pId.mismatchDetails && (
            <p className="font-mono text-rose-300 font-semibold">{pId.mismatchDetails}</p>
          )}
        </div>
      )}

      {/* Navigation Tabs (Sections 20, 21, 32-35) */}
      <div className="flex items-center gap-2 border-b border-zinc-800 pb-2 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveTab('info')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'info'
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
          }`}
        >
          Review Information
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('issues')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'issues'
              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
          }`}
        >
          <span>Issues to Review</span>
          {missingOrLowConfidenceDecs.length > 0 && (
            <span className="w-4 h-4 rounded-full bg-rose-500/30 text-rose-300 text-[10px] flex items-center justify-center font-mono">
              {missingOrLowConfidenceDecs.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('compliance')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'compliance'
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
          }`}
        >
          Compliance Checklist
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('photos')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'photos'
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
          }`}
        >
          Package Photos
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('developer')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ml-auto ${
            activeTab === 'developer'
              ? 'bg-zinc-800 text-zinc-200 border border-zinc-700'
              : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900'
          }`}
        >
          <Code2 className="w-3.5 h-3.5" />
          <span>Dev Diagnostics</span>
        </button>
      </div>

      {/* TAB 1: REVIEW INFORMATION (Section 20 & 34) */}
      {activeTab === 'info' && (
        <div className="space-y-6">
          {/* Section 1: Product Information */}
          <div className="p-5 sm:p-6 rounded-3xl bg-zinc-900 border border-zinc-800 space-y-4">
            <h2 className="text-sm font-bold text-zinc-100 uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>Section 1: Product Identity</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { label: 'Product Name', field: decs.product_name, value: pId.productName || decs.product_name?.value },
                { label: 'Brand Name', field: decs.brand_name, value: pId.brand || decs.brand_name?.value },
                { label: 'Variant', field: decs.variant, value: pId.variant || decs.variant?.value },
                { label: 'Net Quantity', field: decs.net_quantity, value: pId.netQuantity || decs.net_quantity?.value }
              ].map(({ label, field, value }) => {
                const isDetected = field?.status === 'DETECTED';
                return (
                  <div
                    key={label}
                    className="p-3.5 rounded-2xl bg-zinc-950/70 border border-zinc-800/80 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <span className="text-[11px] font-semibold text-zinc-400 block">{label}</span>
                      <p className="text-sm font-bold text-zinc-100 truncate mt-0.5">
                        {formatValue(value)}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] text-zinc-500 mt-1 font-mono">
                        <span
                          className={`font-semibold ${
                            isDetected ? 'text-emerald-400' : 'text-amber-400'
                          }`}
                        >
                          {field?.status || 'NOT_DETECTED'}
                        </span>
                        <span>•</span>
                        <span>Conf: {field?.confidence || 'LOW'}</span>
                        {field?.sourceImage && (
                          <>
                            <span>•</span>
                            <span className="uppercase">{field.sourceImage}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {field?.evidence && (
                        <button
                          type="button"
                          onClick={() =>
                            setEvidenceViewerState({
                              evidence: field.evidence!,
                              label,
                              value: field.value,
                              variant: field.inconsistencyFlag ? 'ERROR' : 'NORMAL'
                            })
                          }
                          className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-emerald-400 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                          title="View Optical Evidence"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span className="text-[11px] hidden sm:inline">Evidence</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setEditingField(field)}
                        className="p-2 rounded-xl bg-zinc-800/70 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
                        title="Edit Declaration"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 2: Package Information */}
          <div className="p-5 sm:p-6 rounded-3xl bg-zinc-900 border border-zinc-800 space-y-4">
            <h2 className="text-sm font-bold text-zinc-100 uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-400" />
              <span>Section 2: Statutory Package Declarations</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { label: 'Maximum Retail Price (MRP)', field: decs.mrp },
                { label: 'Manufacturer Name', field: decs.manufacturer },
                { label: 'Manufacturer Complete Address', field: decs.manufacturer_address },
                { label: 'Packer Details', field: decs.packer },
                { label: 'Importer Details', field: decs.importer },
                { label: 'Date of Mfg / Packing', field: decs.manufacturing_or_packing_date },
                { label: 'Best Before / Expiry Date', field: decs.best_before_or_expiry },
                { label: 'Consumer Care Cell', field: decs.consumer_care_details },
                { label: 'Country of Origin', field: decs.country_of_origin }
              ].map(({ label, field }) => {
                const isDetected = field?.status === 'DETECTED';
                return (
                  <div
                    key={label}
                    className="p-3.5 rounded-2xl bg-zinc-950/70 border border-zinc-800/80 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <span className="text-[11px] font-semibold text-zinc-400 block">{label}</span>
                      <p className="text-sm font-bold text-zinc-100 truncate mt-0.5">
                        {formatValue(field?.value)}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] text-zinc-500 mt-1 font-mono">
                        <span
                          className={`font-semibold ${
                            isDetected ? 'text-emerald-400' : 'text-amber-400'
                          }`}
                        >
                          {field?.status || 'NOT_DETECTED'}
                        </span>
                        <span>•</span>
                        <span>Conf: {field?.confidence || 'LOW'}</span>
                        {field?.sourceImage && (
                          <>
                            <span>•</span>
                            <span className="uppercase">{field.sourceImage}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {field?.evidence && (
                        <button
                          type="button"
                          onClick={() =>
                            setEvidenceViewerState({
                              evidence: field.evidence!,
                              label,
                              value: field.value,
                              variant: field.inconsistencyFlag ? 'ERROR' : 'NORMAL'
                            })
                          }
                          className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-emerald-400 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                          title="View Optical Evidence"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span className="text-[11px] hidden sm:inline">Evidence</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setEditingField(field)}
                        className="p-2 rounded-xl bg-zinc-800/70 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
                        title="Edit Declaration"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ISSUES TO REVIEW (Section 33) */}
      {activeTab === 'issues' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800">
            <h2 className="text-sm font-bold text-zinc-100 mb-1">
              Issues Requiring Verification
            </h2>
            <p className="text-xs text-zinc-400">
              Only declarations that are missing, conflicting, uncertain, or flagged by configured rules.
            </p>
          </div>

          {missingOrLowConfidenceDecs.length === 0 && !hasConflictingMrp && pId.isConsistent ? (
            <div className="p-8 rounded-3xl bg-zinc-900/60 border border-zinc-800 text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
              <p className="text-sm font-bold text-zinc-200">
                No obvious issues detected in configured checks.
              </p>
              <p className="text-xs text-zinc-500">
                All mandatory statutory declarations were located with acceptable optical confidence.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Conflicting MRP item */}
              {hasConflictingMrp && altMrp && (
                <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 font-bold text-rose-300 text-xs">
                      <AlertTriangle className="w-4 h-4" />
                      <span>Conflicting Dual MRP Detected</span>
                    </div>
                    <p className="text-xs text-zinc-300 mt-1">
                      Front: {decs.mrp.value} vs {altMrp.side.toUpperCase()}: {altMrp.value}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (decs.mrp.evidence) {
                        setEvidenceViewerState({
                          evidence: decs.mrp.evidence,
                          label: 'Conflicting MRP',
                          value: decs.mrp.value,
                          variant: 'ERROR',
                          altLabel: `MRP (${altMrp.side.toUpperCase()})`,
                          altValue: altMrp.value
                        });
                      }
                    }}
                    className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 text-rose-200 text-xs font-semibold cursor-pointer"
                  >
                    View Red Box Evidence
                  </button>
                </div>
              )}

              {/* Missing or uncertain declarations */}
              {missingOrLowConfidenceDecs.map(({ key, label, field }) => (
                <div
                  key={key}
                  className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-between gap-4"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-zinc-200">{label}</span>
                      <span
                        className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                          field.status === 'NOT_DETECTED'
                            ? 'bg-rose-500/10 text-rose-400'
                            : 'bg-amber-500/10 text-amber-400'
                        }`}
                      >
                        {field.status}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Value: <strong className="text-zinc-200 font-mono">{formatValue(field.value)}</strong>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {field.evidence && (
                      <button
                        type="button"
                        onClick={() =>
                          setEvidenceViewerState({
                            evidence: field.evidence!,
                            label,
                            value: field.value,
                            variant: 'WARNING'
                          })
                        }
                        className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-amber-300 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Evidence</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setEditingField(field)}
                      className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Correct</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: COMPLIANCE CHECKLIST (Section 21) */}
      {activeTab === 'compliance' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800">
            <h2 className="text-sm font-bold text-zinc-100 mb-1">
              Legal Metrology Compliance Checklist
            </h2>
            <p className="text-xs text-zinc-400">
              Statutory verification against Packaged Commodities Rules, 2011. Click any item for explanation & evidence.
            </p>
          </div>

          <div className="space-y-3">
            {(session.ruleResults || []).map(rule => {
              const isPass = rule.status === 'PASS';
              return (
                <div
                  key={rule.ruleId}
                  className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-all space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-zinc-100">{rule.ruleName}</span>
                        <span className="font-mono text-xs text-zinc-500">({rule.legalReference})</span>
                      </div>
                      <p className="text-xs text-zinc-400 leading-relaxed">
                        {rule.reason || rule.detectedDetails}
                      </p>
                    </div>

                    <span
                      className={`text-xs font-mono font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${
                        isPass
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}
                    >
                      {rule.status}
                    </span>
                  </div>

                  {/* Evidence & Action Buttons for Rule */}
                  {rule.evidence && rule.evidence.length > 0 && (
                    <div className="pt-2 border-t border-zinc-800 flex items-center justify-between text-xs">
                      <span className="text-zinc-500">
                        Evidence in panel: <strong className="text-zinc-300 uppercase">{rule.evidence[0].side}</strong>
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setEvidenceViewerState({
                            evidence: rule.evidence[0],
                            label: rule.ruleName,
                            value: rule.evidence[0].textSnippet,
                            variant: isPass ? 'NORMAL' : 'ERROR'
                          })
                        }
                        className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect Evidence</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Mandatory Font Size Notice (Section 21) */}
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-amber-200">
                <HelpCircle className="w-4 h-4 text-amber-400" />
                <span>Physical Font Size Assessment</span>
                <span className="font-mono text-[10px] text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded ml-auto">
                  REVIEW_REQUIRED
                </span>
              </div>
              <p className="text-zinc-300 leading-relaxed">
                Physical font size cannot be reliably determined from this 2D digital image without calibrated optical scaling targets.
              </p>
              <p className="text-[11px] text-zinc-400">
                Statutory Rule 9 minimum letter height requires physical verification with an optical micrometer gauge.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: PACKAGE PHOTOS */}
      {activeTab === 'photos' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800">
            <h2 className="text-sm font-bold text-zinc-100 mb-1">
              Captured Packaging Photographs
            </h2>
            <p className="text-xs text-zinc-400">
              High-resolution optical captures inspected by Gemini multimodal vision model.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {(['front', 'back', 'upper', 'lower'] as SideType[]).map(side => {
              const img = session.images[side];
              return (
                <div
                  key={side}
                  className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-3 flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs uppercase text-zinc-200">
                      {side} Panel
                    </span>
                    {img ? (
                      <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                        Captured
                      </span>
                    ) : (
                      <span className="text-[10px] text-zinc-500">Empty</span>
                    )}
                  </div>

                  <div className="aspect-square bg-zinc-950 rounded-xl border border-zinc-800/80 overflow-hidden flex items-center justify-center">
                    {img?.previewUrl ? (
                      <img
                        src={img.previewUrl}
                        alt={side}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Camera className="w-8 h-8 text-zinc-700" />
                    )}
                  </div>

                  {img?.quality && (
                    <div className="text-[11px] text-zinc-400 space-y-0.5 font-mono">
                      <div>Res: {img.quality.resolution}</div>
                      <div>Readability: {img.quality.textReadability}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 5: DEVELOPER DIAGNOSTICS */}
      {activeTab === 'developer' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-2xl bg-zinc-900 border border-zinc-800">
            <div>
              <h2 className="text-sm font-bold text-zinc-100">
                Developer Diagnostics & Pipeline Steps
              </h2>
              <p className="text-xs text-zinc-400">
                Multimodal execution trail, OCR text regions, and raw JSON.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowRawJsonModal(true)}
              className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-mono font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Inspect JSON</span>
            </button>
          </div>

          {session.debugAnalysis?.steps && (
            <div className="space-y-2">
              {session.debugAnalysis.steps.map((step, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 font-mono text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-zinc-200">{step.name}</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded ${
                        step.status === 'SUCCESS'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'bg-amber-500/10 text-amber-400'
                      }`}
                    >
                      {step.status}
                    </span>
                  </div>
                  <p className="text-zinc-400 text-[11px]">{step.details}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
