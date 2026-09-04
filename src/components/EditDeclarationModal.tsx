import React, { useState } from 'react';
import { X, Edit3, History, Check, AlertCircle } from 'lucide-react';
import { DeclarationField } from '../types.js';

interface EditDeclarationModalProps {
  field: DeclarationField | null;
  onSave: (fieldKey: string, newValue: string, reason: string) => Promise<void>;
  onClose: () => void;
}

export const EditDeclarationModal: React.FC<EditDeclarationModalProps> = ({
  field,
  onSave,
  onClose
}) => {
  if (!field) return null;

  const [newValue, setNewValue] = useState(field.value || '');
  const [reason, setReason] = useState('Manual verification against physical package');
  const [customReason, setCustomReason] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const REASONS = [
    'Manual verification against physical package',
    'OCR misread alphanumeric character (e.g. 0 vs O)',
    'Partial print visible on seam/crease',
    'Fine print requires optical inspection',
    'Custom reason (specify below)'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    const finalReason = reason === 'Custom reason (specify below)' ? customReason : reason;
    if (!finalReason.trim()) {
      setError('A valid correction reason is required for statutory audit compliance.');
      setIsSaving(false);
      return;
    }

    try {
      await onSave(field.key, newValue, finalReason);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to update declaration');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div
        className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl relative text-zinc-100 animate-in fade-in zoom-in-95 duration-150"
        id="edit-declaration-modal"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
            <Edit3 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-zinc-100">
              Manual Declaration Correction
            </h2>
            <p className="text-xs text-zinc-400 font-mono">
              {field.label} ({field.key})
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Original Value */}
          <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1">
            <div className="flex items-center justify-between text-[11px] text-zinc-500 uppercase font-semibold">
              <span>Original Machine-Extracted Value</span>
              <span className="font-mono text-zinc-400">Status: {field.status}</span>
            </div>
            <p className="font-mono text-xs text-zinc-300">
              {field.originalValue || field.value || '<Not Detected>'}
            </p>
          </div>

          {/* New Value Input */}
          <div>
            <label className="block text-xs font-semibold text-zinc-200 mb-1">
              Verified Declaration Value
            </label>
            <textarea
              rows={2}
              required
              value={newValue}
              onChange={e => setNewValue(e.target.value)}
              placeholder="Enter verified declaration text..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500 font-mono"
            />
          </div>

          {/* Reason Selection */}
          <div>
            <label className="block text-xs font-semibold text-zinc-200 mb-1">
              Statutory Correction Reason (Recorded to Audit Trail)
            </label>
            <select
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
            >
              {REASONS.map((r, i) => (
                <option key={i} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {reason === 'Custom reason (specify below)' && (
            <div>
              <input
                type="text"
                required
                value={customReason}
                onChange={e => setCustomReason(e.target.value)}
                placeholder="Specify specific justification for legal record..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
              />
            </div>
          )}

          {/* Edit History (if previously modified) */}
          {field.editHistory && field.editHistory.length > 0 && (
            <div className="pt-2 border-t border-zinc-800/80">
              <div className="flex items-center gap-1 text-[11px] font-semibold text-zinc-400 mb-2">
                <History className="w-3.5 h-3.5" />
                <span>Previous Modification History ({field.editHistory.length})</span>
              </div>
              <div className="space-y-1.5 max-h-24 overflow-y-auto pr-1">
                {field.editHistory.map((h, idx) => (
                  <div key={idx} className="text-[10px] p-2 rounded bg-zinc-950 border border-zinc-800/60">
                    <span className="text-zinc-400">{new Date(h.timestamp).toLocaleTimeString()} - {h.editor}: </span>
                    <span className="text-zinc-300 font-mono">"{h.newValue}"</span>
                    <span className="text-zinc-500 block italic mt-0.5">Reason: {h.reason}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="pt-3 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-bold transition-colors shadow-md shadow-emerald-500/20 flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>{isSaving ? 'Updating & Re-evaluating...' : 'Apply Correction'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
