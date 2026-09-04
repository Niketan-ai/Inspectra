import React, { useState } from 'react';
import { X, ZoomIn, ZoomOut, AlertTriangle, CheckCircle2, HelpCircle, Tag } from 'lucide-react';
import { DeclarationEvidence, ScanImage } from '../types.js';

export interface EvidenceViewerModalProps {
  evidence: DeclarationEvidence | null;
  fieldLabel: string;
  fieldValue: string | null;
  scanImages: Record<string, ScanImage | null>;
  onClose: () => void;
  // Visual evidence status: inconsistency/violation (red), low confidence (yellow), verified (emerald)
  variant?: 'ERROR' | 'WARNING' | 'NORMAL';
  alternativeEvidence?: DeclarationEvidence | null;
  alternativeLabel?: string;
  alternativeValue?: string | null;
}

export const EvidenceViewerModal: React.FC<EvidenceViewerModalProps> = ({
  evidence,
  fieldLabel,
  fieldValue,
  scanImages,
  onClose,
  variant = 'NORMAL',
  alternativeEvidence,
  alternativeLabel,
  alternativeValue
}) => {
  const [zoom, setZoom] = useState(1);

  if (!evidence) return null;

  const side = evidence.side || 'back';
  const image = scanImages[side];
  const bbox = evidence.boundingBox;
  const hasValidBbox =
    bbox &&
    typeof bbox.ymin === 'number' &&
    typeof bbox.ymax === 'number' &&
    typeof bbox.xmin === 'number' &&
    typeof bbox.xmax === 'number' &&
    bbox.ymax > bbox.ymin &&
    bbox.xmax > bbox.xmin;

  // Determine color scheme based on user prompt rules (Section 23):
  // Red: Potential inconsistency, mismatch, unclear declaration, suspected violation
  // Yellow: Low confidence / needs manual verification
  // Emerald / Neutral: Successfully detected information
  let boxBorderClass = 'border-emerald-400 bg-emerald-500/15 text-emerald-400';
  let badgeBgClass = 'bg-emerald-500 text-zinc-950';

  if (variant === 'ERROR' || evidence.confidence === 'LOW') {
    boxBorderClass = 'border-rose-500 bg-rose-500/20 text-rose-400 shadow-rose-500/20';
    badgeBgClass = 'bg-rose-500 text-white';
  } else if (variant === 'WARNING' || evidence.confidence === 'MEDIUM') {
    boxBorderClass = 'border-amber-400 bg-amber-400/20 text-amber-400 shadow-amber-500/20';
    badgeBgClass = 'bg-amber-400 text-zinc-950';
  }

  // Calculate percentage bounding box safely
  const boxTop = hasValidBbox ? `${(bbox!.ymin / 10).toFixed(2)}%` : '0%';
  const boxLeft = hasValidBbox ? `${(bbox!.xmin / 10).toFixed(2)}%` : '0%';
  const boxHeight = hasValidBbox ? `${((bbox!.ymax - bbox!.ymin) / 10).toFixed(2)}%` : '0%';
  const boxWidth = hasValidBbox ? `${((bbox!.xmax - bbox!.xmin) / 10).toFixed(2)}%` : '0%';

  // Alternative evidence (for conflicting MRP / mixed information)
  const altBbox = alternativeEvidence?.boundingBox;
  const hasAltBbox =
    altBbox &&
    alternativeEvidence?.side === side &&
    typeof altBbox.ymin === 'number' &&
    typeof altBbox.ymax === 'number' &&
    altBbox.ymax > altBbox.ymin;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150">
      <div
        className="w-full max-w-4xl max-h-[92vh] bg-zinc-900 border border-zinc-800 rounded-3xl flex flex-col shadow-2xl overflow-hidden text-zinc-100"
        id="evidence-viewer-modal"
      >
        {/* Modal Header */}
        <div className="px-5 py-3.5 sm:px-6 sm:py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/80">
          <div className="min-w-0 pr-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`text-[11px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                  variant === 'ERROR'
                    ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                    : variant === 'WARNING'
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                }`}
              >
                {variant === 'ERROR' ? 'Inconsistency Evidence' : 'Optical Evidence'}
              </span>
              <span className="text-xs font-mono text-zinc-400">
                Panel: <strong className="text-zinc-200">{side.toUpperCase()}</strong>
              </span>
              <span className="text-xs font-mono text-zinc-400">
                Confidence: <strong className="text-zinc-200">{evidence.confidence}</strong>
              </span>
            </div>
            <h2 className="text-sm sm:text-base font-bold text-zinc-100 mt-1 truncate">
              {fieldLabel}:{' '}
              <span className={variant === 'ERROR' ? 'text-rose-400' : 'text-emerald-400'}>
                {fieldValue || 'Not detected'}
              </span>
            </h2>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            <button
              onClick={() => setZoom(prev => Math.max(0.6, prev - 0.2))}
              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={() => setZoom(1)}
              className="px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-mono text-zinc-300"
              title="Reset Zoom"
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              onClick={() => setZoom(prev => Math.min(3, prev + 0.2))}
              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Informational banner when coordinates are not available (Anti-Fake Rule Section 22 & 26) */}
        {!hasValidBbox && (
          <div className="px-6 py-2.5 bg-zinc-950/90 border-b border-zinc-800 text-xs text-zinc-400 flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>
              Exact bounding-box coordinates not available for this declaration. Displaying full{' '}
              <strong className="text-zinc-200">{side.toUpperCase()}</strong> photograph without artificial boxes.
            </span>
          </div>
        )}

        {/* Conflicting information callout banner if mixed info */}
        {alternativeValue && (
          <div className="px-6 py-2.5 bg-rose-500/10 border-b border-rose-500/30 text-xs text-rose-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>
              <strong>Conflicting Evidence:</strong> {fieldLabel} = {fieldValue} vs{' '}
              {alternativeLabel || 'Alternate'} = {alternativeValue}
            </span>
          </div>
        )}

        {/* Image Display Stage */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 bg-zinc-950 flex items-center justify-center min-h-[320px] max-h-[62vh]">
          {image ? (
            <div
              className="relative inline-block transition-transform duration-200 select-none"
              style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
            >
              <img
                src={image.previewUrl}
                alt={`${side} package panel`}
                className="max-h-[55vh] max-w-full rounded-xl border border-zinc-800 object-contain block mx-auto shadow-lg"
              />

              {/* PRIMARY BOUNDING BOX HIGHLIGHT (Only drawn if coordinate is authentic!) */}
              {hasValidBbox && (
                <div
                  className={`absolute border-2 rounded shadow-xl pointer-events-none transition-all duration-300 ${boxBorderClass}`}
                  style={{
                    top: boxTop,
                    left: boxLeft,
                    height: boxHeight,
                    width: boxWidth
                  }}
                >
                  <div
                    className={`absolute -top-7 left-0 text-[10px] font-mono font-extrabold px-2 py-0.5 rounded shadow-md whitespace-nowrap flex items-center gap-1 ${badgeBgClass}`}
                  >
                    <Tag className="w-3 h-3" />
                    <span>{fieldLabel}</span>
                  </div>
                </div>
              )}

              {/* ALTERNATIVE BOUNDING BOX (For dual MRP or conflicting region on same panel) */}
              {hasAltBbox && (
                <div
                  className="absolute border-2 border-rose-500 bg-rose-500/20 rounded shadow-xl pointer-events-none"
                  style={{
                    top: `${(altBbox!.ymin / 10).toFixed(2)}%`,
                    left: `${(altBbox!.xmin / 10).toFixed(2)}%`,
                    height: `${((altBbox!.ymax - altBbox!.ymin) / 10).toFixed(2)}%`,
                    width: `${((altBbox!.xmax - altBbox!.xmin) / 10).toFixed(2)}%`
                  }}
                >
                  <div className="absolute -top-7 left-0 bg-rose-600 text-white text-[10px] font-mono font-extrabold px-2 py-0.5 rounded shadow-md whitespace-nowrap flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    <span>{alternativeLabel || 'Conflicting Value'}</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center p-8 text-zinc-500 space-y-2">
              <AlertTriangle className="w-8 h-8 mx-auto text-zinc-600" />
              <p>Image not captured for the {side.toUpperCase()} panel.</p>
            </div>
          )}
        </div>

        {/* Snippet & Evidence Details Footer */}
        <div className="px-6 py-3.5 border-t border-zinc-800 bg-zinc-900/95 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
          <div className="flex items-start sm:items-center gap-2 min-w-0">
            <span className="text-zinc-400 font-semibold flex-shrink-0">Visible Text Snippet:</span>
            <code className="text-emerald-300 font-mono bg-zinc-950 px-2 py-1 rounded border border-zinc-800 text-[11px] truncate max-w-md">
              "{evidence.textSnippet || fieldValue || 'Not explicitly segmented'}"
            </code>
          </div>

          {hasValidBbox && bbox ? (
            <span className="text-zinc-500 font-mono text-[11px] flex-shrink-0">
              Box Coordinates: [{bbox.ymin}–{bbox.ymax}, {bbox.xmin}–{bbox.xmax}]
            </span>
          ) : (
            <span className="text-zinc-500 font-mono text-[11px] flex-shrink-0">
              No artificial bounding box applied
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
