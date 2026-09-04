import React, { useState } from 'react';
import { X, UserCheck, AlertTriangle, Send, RefreshCw } from 'lucide-react';
import { api } from '../lib/api.js';
import { ScanSession } from '../types.js';

interface HumanReviewModalProps {
  session: ScanSession;
  onClose: () => void;
  onReviewSubmitted: (updatedSession: ScanSession) => void;
}

const REVIEW_REASONS = [
  'Conflicting values found across panels (e.g. dual MRP)',
  'Product identity or variant is uncertain',
  'Important statutory declaration is unclear or missing',
  'Fine print text is partially blurred or difficult to read',
  'Image evidence is insufficient or partially cropped',
  'Physical font size cannot be reliably determined',
  'Disagree with AI automated extraction',
  'Other statutory inspection inquiry'
];

export const HumanReviewModal: React.FC<HumanReviewModalProps> = ({
  session,
  onClose,
  onReviewSubmitted
}) => {
  const [reason, setReason] = useState(REVIEW_REASONS[0]);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason) {
      setError('Please select a reason for human review.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await api.requestHumanReview(session.scanId, reason, note);
      onReviewSubmitted(res.session);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to submit human review request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-7 shadow-2xl text-zinc-100 space-y-6">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-100">Request Human Review</h2>
              <p className="text-xs text-zinc-400">Escalate package scan to an authorized inspector</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-zinc-300">
              Reason for Review <span className="text-rose-400">*</span>
            </label>
            <select
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700 text-xs text-zinc-200 focus:outline-none focus:border-purple-500"
            >
              {REVIEW_REASONS.map(r => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-zinc-300">
              Additional Observations / Note (Optional)
            </label>
            <textarea
              rows={3}
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="e.g. Please check the dual MRP sticker on back panel; front states ₹99 while back states ₹109."
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-purple-500 resize-none"
            />
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800 text-[11px] text-zinc-400 space-y-1">
            <div className="flex items-center justify-between text-zinc-300 font-medium">
              <span>Scan ID:</span>
              <span className="font-mono text-zinc-200">{session.scanId}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Product:</span>
              <span className="truncate max-w-[240px] text-zinc-300">
                {session.productIdentity?.productName || 'Unspecified Commodity'}
              </span>
            </div>
            <p className="pt-1 text-[10px] text-zinc-500">
              All extracted OCR text blocks, confidence scores, and photographic panels will be attached automatically.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-purple-600/25 transition-all cursor-pointer"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Submit for Review</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
