import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, ArrowLeft, Bug } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  onReset?: () => void;
  onResetToScan?: () => void;
  onResetToDashboard?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDevDetails: boolean;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDevDetails: false
    };
  }

  public static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[INSPECTRA ERROR BOUNDARY] Uncaught error during rendering:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[70vh] flex items-center justify-center p-4">
          <div className="max-w-md w-full p-6 sm:p-8 rounded-3xl bg-zinc-900 border border-zinc-800 shadow-2xl text-center space-y-6 text-zinc-100 animate-in fade-in duration-200">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto shadow-lg shadow-rose-500/10">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-lg font-bold text-zinc-100">
                Display Recovery Required
              </h2>
              <p className="text-xs text-zinc-400 leading-relaxed">
                A rendering issue was safely intercepted. Your captured images and inspection results remain safe in your session history.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Try Again</span>
              </button>

              {this.props.onResetToScan && (
                <button
                  type="button"
                  onClick={() => {
                    this.handleReset();
                    this.props.onResetToScan?.();
                  }}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Scan</span>
                </button>
              )}

              {this.props.onResetToDashboard && (
                <button
                  type="button"
                  onClick={() => {
                    this.handleReset();
                    this.props.onResetToDashboard?.();
                  }}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Home className="w-3.5 h-3.5" />
                  <span>Go to Home</span>
                </button>
              )}
            </div>

            {/* Diagnostics toggle */}
            <div className="pt-4 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => this.setState(prev => ({ showDevDetails: !prev.showDevDetails }))}
                className="text-[11px] font-mono text-zinc-500 hover:text-zinc-400 flex items-center justify-center gap-1.5 mx-auto cursor-pointer"
              >
                <Bug className="w-3 h-3" />
                <span>{this.state.showDevDetails ? 'Hide Diagnostics' : 'Diagnostic Info'}</span>
              </button>

              {this.state.showDevDetails && (
                <div className="mt-3 p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-left overflow-auto max-h-48 text-[10px] font-mono text-rose-300">
                  <p className="font-bold">{this.state.error?.name}: {this.state.error?.message}</p>
                  {this.state.errorInfo?.componentStack && (
                    <pre className="mt-2 text-zinc-500 whitespace-pre-wrap">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
