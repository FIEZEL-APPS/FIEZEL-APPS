import React from 'react';
import { wbPick } from '../lib/i18n';

interface WhiteboardErrorBoundaryProps {
  locale?: string;
  onClose?: () => void;
  onRetry?: () => void;
  children: React.ReactNode;
}

interface WhiteboardErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class WhiteboardErrorBoundary extends React.Component<
  WhiteboardErrorBoundaryProps,
  WhiteboardErrorBoundaryState
> {
  constructor(props: WhiteboardErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: unknown): WhiteboardErrorBoundaryState {
    const msg = error instanceof Error ? error.message : String(error || 'Unexpected whiteboard error');
    return { hasError: true, errorMessage: msg };
  }

  componentDidCatch(error: unknown): void {
    try {
      console.warn('[WhiteboardErrorBoundary] Recovered from whiteboard render error:', error);
    } catch {
      // Ignore console errors on locked runtimes
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, errorMessage: '' });
    try {
      this.props.onRetry?.();
    } catch {
      // Ignore
    }
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }
    const loc = this.props.locale || 'id';
    return (
      <div
        data-testid="wb-error-boundary-fallback"
        className="flex-1 min-h-[260px] w-full flex items-center justify-center p-5 bg-[#FAFBF9]"
      >
        <div className="w-full max-w-sm rounded-[24px] bg-[#FFFDF8] border border-[#E6DFD1] shadow-[0_18px_44px_rgba(28,22,17,0.12)] p-6 text-center space-y-3.5">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-[#FEF3C7] border border-[#FDE68A] flex items-center justify-center text-xl">
            📝
          </div>
          <h4 className="text-[15px] font-extrabold text-[#1C1611] leading-snug">
            {wbPick(
              loc,
              'Whiteboard needs a quick refresh',
              'Papan tulis perlu disegarkan sebentar',
              'กระดานไวท์บอร์ดต้องรีเฟรชสักครู่'
            )}
          </h4>
          <p className="text-xs text-[#6B5E4E] leading-relaxed">
            {wbPick(
              loc,
              'Your voice session is still safe. Tap reload to reopen the visual explanation cleanly.',
              'Sesi belajarmu tetap aman. Tekan muat ulang agar papan tulis terbuka kembali dengan mulus.',
              'เซสชันการเรียนของคุณยังปลอดภัย กดโหลดใหม่เพื่อเปิดกระดานอีกครั้งอย่างราบรื่น'
            )}
          </p>
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={this.handleRetry}
              className="flex-1 py-2.5 px-4 rounded-xl bg-[#15803D] hover:bg-[#166534] text-white text-xs font-extrabold cursor-pointer"
            >
              {wbPick(loc, 'Reload Board', 'Muat Ulang Papan', 'โหลดกระดานใหม่')}
            </button>
            {this.props.onClose && (
              <button
                type="button"
                onClick={this.props.onClose}
                className="py-2.5 px-4 rounded-xl bg-[#F3EBE0] hover:bg-[#EADBCE] text-[#5C4A38] text-xs font-bold cursor-pointer"
              >
                {wbPick(loc, 'Close', 'Tutup', 'ปิด')}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }
}
