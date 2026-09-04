import React, { useState, useRef } from 'react';
import {
  Camera,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  RotateCw,
  Trash2,
  Info,
  Image as ImageIcon,
  Check,
  RefreshCw
} from 'lucide-react';
import { ScanImage, ScanSession, SideType } from '../types.js';
import { api } from '../lib/api.js';
import { processMobileImage } from '../lib/imageProcessor.js';
import { sanitizeScanSession } from '../lib/safeScanData.js';

interface NewScanViewProps {
  onScanCreated: (session: ScanSession) => void;
  onCancel?: () => void;
}

type WizardStep = 'PHOTOS' | 'REVIEW' | 'READING';

const READING_STAGES = [
  'Checking photos & lighting...',
  'Reading package text lines...',
  'Identifying product information...',
  'Matching front and back surfaces...',
  'Preparing statutory inspection report...'
];

export const NewScanView: React.FC<NewScanViewProps> = ({ onScanCreated, onCancel }) => {
  const [step, setStep] = useState<WizardStep>('PHOTOS');
  const [currentSession, setCurrentSession] = useState<ScanSession | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState<SideType | null>(null);
  const [readingStageIdx, setReadingStageIdx] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Hidden file inputs for Camera and Gallery per side
  const cameraInputRefs = {
    front: useRef<HTMLInputElement>(null),
    back: useRef<HTMLInputElement>(null),
    upper: useRef<HTMLInputElement>(null),
    lower: useRef<HTMLInputElement>(null)
  };

  const galleryInputRefs = {
    front: useRef<HTMLInputElement>(null),
    back: useRef<HTMLInputElement>(null),
    upper: useRef<HTMLInputElement>(null),
    lower: useRef<HTMLInputElement>(null)
  };

  // Initialize session on demand
  const getOrCreateSession = async (): Promise<ScanSession> => {
    if (currentSession) return currentSession;
    setIsInitializing(true);
    try {
      const res = await api.createScan();
      const safe = sanitizeScanSession(res.session);
      setCurrentSession(safe);
      return safe;
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to initialize session');
      throw err;
    } finally {
      setIsInitializing(false);
    }
  };

  const handleFile = async (file: File, side: SideType) => {
    setErrorMessage(null);
    setIsProcessingFile(side);

    try {
      // 1. Process & downscale mobile image to prevent out-of-memory crashes
      const processed = await processMobileImage(file);

      // 2. Ensure session exists
      const sess = await getOrCreateSession();

      // 3. Upload to server
      const res = await api.uploadScanImage(sess.scanId, side, processed.base64Data, processed.fileName);
      const safe = sanitizeScanSession(res.session);
      setCurrentSession(safe);

      // Warning check
      const q = safe.images[side]?.quality;
      if (q && q.status !== 'GOOD' && q.issues?.length) {
        setErrorMessage(`Note for ${side.toUpperCase()} photo: ${q.issues[0]}`);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || `Failed to upload ${side} photo.`);
    } finally {
      setIsProcessingFile(null);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>, side: SideType) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file, side);
    }
    // reset input so same file can be reselected
    e.target.value = '';
  };

  const handleRemove = async (side: SideType) => {
    if (!currentSession) return;
    try {
      const res = await api.removeScanImage(currentSession.scanId, side);
      setCurrentSession(sanitizeScanSession(res.session));
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to remove photo');
    }
  };

  const handleProceedToReview = () => {
    setErrorMessage(null);
    if (!currentSession?.images?.front?.previewUrl) {
      setErrorMessage('Front photo is required to continue.');
      return;
    }
    if (!currentSession?.images?.back?.previewUrl) {
      setErrorMessage('Back photo is required for a complete statutory inspection.');
      return;
    }
    setStep('REVIEW');
  };

  const handleStartAnalysis = async () => {
    if (!currentSession) return;
    if (!currentSession.images.front?.previewUrl || !currentSession.images.back?.previewUrl) {
      setErrorMessage('Front and back photos are both required.');
      setStep('PHOTOS');
      return;
    }

    setStep('READING');
    setIsAnalyzing(true);
    setErrorMessage(null);
    setReadingStageIdx(0);

    // Progressive stage simulation while Gemini completes multimodal reading
    const stageInterval = setInterval(() => {
      setReadingStageIdx(prev => (prev < READING_STAGES.length - 1 ? prev + 1 : prev));
    }, 1800);

    try {
      const res = await api.analyzeScan(currentSession.scanId);
      clearInterval(stageInterval);
      const safe = sanitizeScanSession(res.session);
      onScanCreated(safe);
    } catch (err: any) {
      clearInterval(stageInterval);
      setIsAnalyzing(false);
      setErrorMessage(err?.message || 'Package analysis failed. Please verify lighting and try again.');
    }
  };

  const hasFront = Boolean(currentSession?.images?.front?.previewUrl);
  const hasBack = Boolean(currentSession?.images?.back?.previewUrl);
  const canProceed = hasFront && hasBack;

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* 6-Step Wizard Progress Header (Section 16) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[11px] font-mono font-bold text-zinc-400">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className={step === 'PHOTOS' ? 'text-emerald-400' : hasFront ? 'text-zinc-300' : 'text-zinc-600'}>
              1. Photos
            </span>
            <span className="text-zinc-600">→</span>
            <span className={step === 'REVIEW' ? 'text-emerald-400' : 'text-zinc-600'}>
              2. Review
            </span>
            <span className="text-zinc-600">→</span>
            <span className={step === 'READING' ? 'text-emerald-400' : 'text-zinc-600'}>
              3. Reading
            </span>
            <span className="text-zinc-600">→</span>
            <span className="text-zinc-600">4. Info</span>
            <span className="text-zinc-600">→</span>
            <span className="text-zinc-600">5. Compliance</span>
            <span className="text-zinc-600">→</span>
            <span className="text-zinc-600">6. Report</span>
          </div>
          {onCancel && step !== 'READING' && (
            <button
              type="button"
              onClick={onCancel}
              className="text-zinc-500 hover:text-zinc-300 cursor-pointer"
            >
              Cancel
            </button>
          )}
        </div>

        {/* Visual Progress Bar */}
        <div className="w-full h-1.5 bg-zinc-850 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 transition-all duration-300 rounded-full"
            style={{
              width: step === 'PHOTOS' ? '16%' : step === 'REVIEW' ? '33%' : '50%'
            }}
          />
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span>{errorMessage}</span>
            {step === 'READING' && (
              <div>
                <button
                  type="button"
                  onClick={() => setStep('REVIEW')}
                  className="mt-1.5 px-3 py-1 bg-rose-500/20 hover:bg-rose-500/30 rounded-lg text-rose-200 text-xs font-semibold cursor-pointer"
                >
                  Return to Review Photos
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* STEP 1: CAPTURE PRODUCT PHOTOS */}
      {step === 'PHOTOS' && (
        <div className="space-y-6">
          <div className="space-y-1">
            <h1 className="text-2xl font-extrabold text-zinc-100 tracking-tight">
              Capture Product Photos
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400">
              Front and back photos are required. Upper and lower photos are optional.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(['front', 'back', 'upper', 'lower'] as SideType[]).map(side => {
              const isRequired = side === 'front' || side === 'back';
              const img = currentSession?.images?.[side];
              const isUploading = isProcessingFile === side;

              return (
                <div
                  key={side}
                  className={`p-4 sm:p-5 rounded-3xl border transition-all ${
                    img?.previewUrl
                      ? 'bg-zinc-900 border-emerald-500/40'
                      : 'bg-zinc-900/70 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  {/* Hidden file inputs */}
                  <input
                    ref={cameraInputRefs[side]}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={e => handleFileInputChange(e, side)}
                  />
                  <input
                    ref={galleryInputRefs[side]}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => handleFileInputChange(e, side)}
                  />

                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-zinc-100 uppercase font-mono">
                        {side}
                      </span>
                      <span
                        className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                          isRequired
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-zinc-800 text-zinc-400'
                        }`}
                      >
                        {isRequired ? 'Required' : 'Optional'}
                      </span>
                    </div>

                    {img?.previewUrl && (
                      <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                        <Check className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </div>

                  {/* Thumbnail or Upload Buttons */}
                  {img?.previewUrl ? (
                    <div className="space-y-3">
                      <div className="aspect-[4/3] bg-zinc-950 rounded-2xl overflow-hidden border border-zinc-800 relative group">
                        <img
                          src={img.previewUrl}
                          alt={`${side} panel`}
                          className="w-full h-full object-contain"
                        />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => galleryInputRefs[side].current?.click()}
                            className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold cursor-pointer"
                            title="Replace"
                          >
                            Replace
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemove(side)}
                            className="p-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-semibold cursor-pointer"
                            title="Remove"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-1">
                        <span className="text-zinc-500 font-mono text-[11px] truncate max-w-[140px]">
                          {img.fileName || `${side}.jpg`}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemove(side)}
                          className="text-rose-400 hover:text-rose-300 text-xs font-medium cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="aspect-[4/3] bg-zinc-950/80 rounded-2xl border border-dashed border-zinc-800 flex flex-col items-center justify-center p-4 text-center">
                        {isUploading ? (
                          <div className="space-y-2">
                            <RefreshCw className="w-6 h-6 animate-spin text-emerald-400 mx-auto" />
                            <p className="text-xs text-zinc-400">Processing image...</p>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <Camera className="w-6 h-6 text-zinc-600 mx-auto mb-1" />
                            <p className="text-xs font-medium text-zinc-400">
                              Capture clear photo
                            </p>
                            <p className="text-[11px] text-zinc-600">
                              Keep text legible and well-lit
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Mobile & Desktop Action Buttons */}
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          disabled={isUploading}
                          onClick={() => cameraInputRefs[side].current?.click()}
                          className="py-2.5 px-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          <span>Camera</span>
                        </button>

                        <button
                          type="button"
                          disabled={isUploading}
                          onClick={() => galleryInputRefs[side].current?.click()}
                          className="py-2.5 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>Gallery</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Navigation Action */}
          <div className="pt-2">
            <button
              type="button"
              id="proceed-to-review-btn"
              onClick={handleProceedToReview}
              disabled={!canProceed}
              className="w-full py-3.5 px-6 rounded-2xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:pointer-events-none text-zinc-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 transition-all cursor-pointer"
            >
              <span>Review Photos</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            {!canProceed && (
              <p className="text-center text-xs text-zinc-500 mt-2">
                Both Front and Back photos must be uploaded before continuing.
              </p>
            )}
          </div>
        </div>
      )}

      {/* STEP 2: REVIEW PHOTOS */}
      {step === 'REVIEW' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-2xl font-extrabold text-zinc-100 tracking-tight">
                Review Packaging Photos
              </h1>
              <p className="text-xs sm:text-sm text-zinc-400">
                Confirm labels are sharp and legible before initiating AI optical reading.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setStep('PHOTOS')}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold cursor-pointer"
            >
              ← Back to Photos
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {(['front', 'back', 'upper', 'lower'] as SideType[]).map(side => {
              const img = currentSession?.images?.[side];
              if (!img?.previewUrl && side !== 'front' && side !== 'back') return null;

              return (
                <div
                  key={side}
                  className="p-3.5 sm:p-4 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs uppercase text-zinc-200">
                      {side} Panel
                    </span>
                    {img?.previewUrl ? (
                      <span className="text-[10px] text-emerald-400 font-mono">Ready</span>
                    ) : (
                      <span className="text-[10px] text-rose-400 font-mono">Missing</span>
                    )}
                  </div>

                  <div className="aspect-square bg-zinc-950 rounded-xl overflow-hidden border border-zinc-800 flex items-center justify-center">
                    {img?.previewUrl ? (
                      <img
                        src={img.previewUrl}
                        alt={side}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <span className="text-xs text-zinc-600">No Photo</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-1 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setStep('PHOTOS');
                      }}
                      className="text-zinc-400 hover:text-zinc-200 text-[11px] font-medium cursor-pointer"
                    >
                      Retake / Replace
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 text-xs text-zinc-400 space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-zinc-300">
              <Info className="w-4 h-4 text-emerald-400" />
              <span>Inspection Notice</span>
            </div>
            <p className="leading-relaxed">
              Gemini will process the high-resolution photographs to perform text extraction, match front and back panels, and verify statutory Legal Metrology requirements.
            </p>
          </div>

          <div className="pt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setStep('PHOTOS')}
              className="w-1/3 py-3.5 px-4 rounded-2xl bg-zinc-850 hover:bg-zinc-800 text-zinc-300 font-semibold text-xs transition-colors cursor-pointer"
            >
              Back
            </button>
            <button
              type="button"
              id="start-scan-confirmed-btn"
              onClick={handleStartAnalysis}
              className="w-2/3 py-3.5 px-6 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Start Scan</span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: READING PACKAGE (Section 19) */}
      {step === 'READING' && (
        <div className="p-8 sm:p-12 rounded-3xl bg-zinc-900 border border-zinc-800 text-center space-y-8 animate-in fade-in duration-300">
          <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-4 border-emerald-500/20 animate-ping" />
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <RefreshCw className="w-8 h-8 animate-spin text-emerald-400" />
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-xl sm:text-2xl font-extrabold text-zinc-100">
              Reading Package Information
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-sm mx-auto">
              Please wait while our multimodal model reads and verifies statutory packaging text.
            </p>
          </div>

          {/* Actual Multimodal Stages Checklist (Section 19) */}
          <div className="max-w-md mx-auto space-y-2.5 text-left text-xs bg-zinc-950 p-4 sm:p-5 rounded-2xl border border-zinc-800">
            {READING_STAGES.map((st, idx) => {
              const isDone = idx < readingStageIdx;
              const isCurrent = idx === readingStageIdx;

              return (
                <div
                  key={idx}
                  className={`flex items-center gap-3 p-2 rounded-xl transition-all ${
                    isCurrent
                      ? 'bg-emerald-500/10 text-emerald-300 font-semibold'
                      : isDone
                      ? 'text-zinc-400'
                      : 'text-zinc-600'
                  }`}
                >
                  <span className="flex-shrink-0">
                    {isDone ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : isCurrent ? (
                      <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                    ) : (
                      <span className="w-4 h-4 rounded-full border border-zinc-700 inline-block" />
                    )}
                  </span>
                  <span>{st}</span>
                </div>
              );
            })}
          </div>

          <p className="text-[11px] text-zinc-500 font-mono">
            Direct high-resolution optical inspection • Legal Metrology PCR 2011
          </p>
        </div>
      )}
    </div>
  );
};
