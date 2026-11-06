import React, { useEffect, useRef, useState } from 'react';
import { Volume2, Send, Mic, RefreshCw, Sparkles, ChevronUp, ChevronDown, X } from 'lucide-react';
import type { BeginnerReplyCard } from '../lib/liveCallHelper';
import type { CallScenario, LearnerLocale } from '../types/voiceCall';
import { JapaneseRubyDisplay } from './JapaneseRubyDisplay';
import { toPhoneticRomaji } from '../lib/japanesePhonetics';
import { toPhoneticPinyin, containsHanzi } from '../lib/mandarinPhonetics';

export interface BeginnerAnswerAssistantProps {
  locale: LearnerLocale;
  targetLang: 'en' | 'ja' | 'zh';
  scenario: CallScenario;
  aiQuestionText: string;
  aiQuestionTranslation: string;
  lastUserText?: string;
  cards: BeginnerReplyCard[];
  copilotSource?: 'ai-realtime' | 'loading';
  isGeneratingCopilot?: boolean;
  isLiveConnected: boolean;
  isRecordingPtt: boolean;
  isAnalyzingTurn: boolean;
  isPlayingAiAudio?: boolean;
  isRefreshingAssist?: boolean;
  turnCount?: number;
  onRefreshAssist?: () => void;
  onSpeakSample: (text: string, rate?: number) => void;
  onSelectForInput: (text: string) => void;
  onSendDirect: (text: string) => void;
  onStartPttWithPrompt: (text: string) => void;
}

export const BeginnerAnswerAssistant: React.FC<BeginnerAnswerAssistantProps> = ({
  locale,
  targetLang,
  aiQuestionText,
  aiQuestionTranslation,
  lastUserText,
  cards,
  copilotSource = 'ai-realtime',
  isGeneratingCopilot = false,
  isLiveConnected,
  isRecordingPtt,
  isAnalyzingTurn,
  isRefreshingAssist = false,
  onRefreshAssist,
  onSpeakSample,
  onSelectForInput,
  onSendDirect,
  onStartPttWithPrompt,
}) => {
  const MIN_HEIGHT = 58; // Tinggi docked peek bar
  const [maxHeight, setMaxHeight] = useState<number>(() =>
    typeof window !== 'undefined' ? Math.round(window.innerHeight * 0.86) : 620
  );

  useEffect(() => {
    const handleResize = () => {
      setMaxHeight(Math.round(window.innerHeight * 0.86));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [sheetHeight, setSheetHeight] = useState<number>(MIN_HEIGHT);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const isDraggingRef = useRef<boolean>(false);
  const dragStartYRef = useRef<number>(0);
  const dragStartHeightRef = useRef<number>(MIN_HEIGHT);
  const hasDraggedRef = useRef<boolean>(false);

  // Direct Gesture Tracking: Sprei / Window Blind interaction (ditarik ke atas / ditutup ke bawah)
  const handleDragStart = (e: React.PointerEvent) => {
    // Abaikan jika klik berasal dari tombol interaktif
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }
    isDraggingRef.current = true;
    dragStartYRef.current = e.clientY;
    dragStartHeightRef.current = sheetHeight;
    hasDraggedRef.current = false;
    setIsDragging(true);

    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
  };

  const handleDragMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    // Delta positif = ditarik KE ATAS (layaknya sprei yang menyelimuti ke atas)
    const deltaY = dragStartYRef.current - e.clientY;
    if (Math.abs(deltaY) > 6) {
      hasDraggedRef.current = true;
    }
    const targetHeight = Math.max(MIN_HEIGHT, Math.min(maxHeight, dragStartHeightRef.current + deltaY));
    setSheetHeight(targetHeight);
  };

  const handleDragEnd = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    setIsDragging(false);

    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}

    const threshold = MIN_HEIGHT + (maxHeight - MIN_HEIGHT) * 0.35;
    if (sheetHeight > threshold) {
      // Snap penuh menyelimuti ke atas (86vh)
      setIsExpanded(true);
      setSheetHeight(maxHeight);
    } else {
      // Snap kembali ke docked peek bar
      setIsExpanded(false);
      setSheetHeight(MIN_HEIGHT);
    }
  };

  const toggleExpand = () => {
    if (isExpanded) {
      setIsExpanded(false);
      setSheetHeight(MIN_HEIGHT);
    } else {
      setIsExpanded(true);
      setSheetHeight(maxHeight);
    }
  };

  const closeSheet = () => {
    setIsExpanded(false);
    setSheetHeight(MIN_HEIGHT);
  };

  // Reset spotlight ke opsi paling singkat setiap Partner AI mengucapkan kalimat baru
  useEffect(() => {
    setSelectedIndex(0);
  }, [aiQuestionText]);

  const visibleCards = (cards || []).slice(0, 3);
  const safeIndex = selectedIndex < visibleCards.length ? selectedIndex : 0;
  const activeCard = visibleCards[safeIndex] || null;

  const showLoadingState =
    !isRecordingPtt &&
    !activeCard &&
    (isGeneratingCopilot || isRefreshingAssist || copilotSource === 'loading' || isAnalyzingTurn);

  if (!showLoadingState && !activeCard) {
    return null;
  }

  const getShortTabLabel = (card: BeginnerReplyCard, idx: number): string => {
    if (locale === 'th') {
      if (idx === 0 || card.tier === 'easy') return '1 · สั้น';
      if (idx === 1 || card.tier === 'mission') return '2 · ธรรมชาติ';
      return '3 · ถามกลับ';
    }
    if (idx === 0 || card.tier === 'easy') return '1 · Singkat';
    if (idx === 1 || card.tier === 'mission') return '2 · Alami';
    return '3 · + Tanya Balik';
  };

  const resolvePronunciationGuide = (card: BeginnerReplyCard): string => {
    const raw = (card.pronunciation || '').trim();
    const hasCjkRaw = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/.test(raw);
    if (targetLang === 'ja') {
      const deterministic = toPhoneticRomaji(card.text);
      if (deterministic) return deterministic;
      return hasCjkRaw ? '' : raw;
    }
    if (targetLang === 'zh') {
      const deterministic = toPhoneticPinyin(card.text);
      if (deterministic) return deterministic;
      return hasCjkRaw ? '' : raw;
    }
    if (
      raw &&
      raw.toLowerCase().replace(/[^a-z0-9]/g, '') ===
        String(card.text || '').toLowerCase().replace(/[^a-z0-9]/g, '')
    ) {
      return '';
    }
    return raw;
  };

  const sanitizeMotherTongueHint = (hintText: string): string => {
    if (!hintText) return '';
    let res = hintText;
    res = res.replace(/["'「『]([\u4e00-\u9fff\u3040-\u30ff]+)["'」』]/g, (_match, inner) => {
      if (targetLang === 'zh') {
        const py = toPhoneticPinyin(inner);
        return py ? `"${py}"` : inner;
      }
      if (targetLang === 'ja') {
        const ro = toPhoneticRomaji(inner);
        return ro ? `"${ro}"` : inner;
      }
      return inner;
    });
    if (targetLang === 'zh' && containsHanzi(res)) {
      res = res.replace(/[\u3400-\u4dbf\u4e00-\u9fff]+/g, (match) => {
        const py = toPhoneticPinyin(match);
        return py ? ` (${py}) ` : '';
      });
    }
    if (targetLang === 'ja' && /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/.test(res)) {
      res = res.replace(/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]+/g, (match) => {
        const ro = toPhoneticRomaji(match);
        return ro ? ` (${ro}) ` : '';
      });
    }
    return res.replace(/\s{2,}/g, ' ').trim();
  };

  const showExpandedContent = isExpanded || sheetHeight > MIN_HEIGHT + 30;
  const progressRatio = Math.max(0, Math.min(1, (sheetHeight - MIN_HEIGHT) / (maxHeight - MIN_HEIGHT)));

  return (
    <section
      data-testid="beginner-answer-assistant"
      data-copilot-source={showLoadingState ? 'loading' : 'ai-realtime'}
      data-copilot-collapsed={isExpanded ? 'false' : 'true'}
      aria-label="Laci Bantuan Jawaban Natural (Copilot)"
      className="w-full relative"
    >
      {/* Konteks tersembunyi untuk kestabilan uji sinkronisasi */}
      <div data-testid="assistant-live-context-bar" style={{ display: 'none' }} className="hidden">
        <span>{aiQuestionText}</span>
        <span>{aiQuestionTranslation}</span>
        {lastUserText && <span>{lastUserText}</span>}
      </div>

      {/* Placeholder in-place agar tata letak dock tidak bergeser */}
      <div style={{ height: MIN_HEIGHT }} className="w-full shrink-0 invisible pointer-events-none" aria-hidden="true" />

      {/* -----------------------------------------------------------------
          BACKDROP OVERLAY HALUS
          Muncul bertahap saat sprei ditarik ke atas menutupi panggung
      ----------------------------------------------------------------- */}
      {progressRatio > 0.05 && (
        <div
          onClick={closeSheet}
          style={{ opacity: progressRatio * 0.55 }}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs transition-opacity cursor-pointer"
          title="Ketuk untuk menutup sprei laci"
        />
      )}

      {/* -----------------------------------------------------------------
          FLUID BOTTOM SHEET: MENYELIMUTI KE ATAS LAYAKNYA SPREI / WINDOW BLIND
          Tinggi mengikuti sentuhan tangan secara 1:1, bersudut rounded-3xl
      ----------------------------------------------------------------- */}
      <div
        data-testid="copilot-peek-container"
        onPointerDown={handleDragStart}
        onPointerMove={handleDragMove}
        onPointerUp={handleDragEnd}
        onPointerCancel={handleDragEnd}
        style={{
          height: `${sheetHeight}px`,
          transition: isDragging
            ? 'none'
            : 'height 0.32s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.32s ease',
        }}
        className={`fixed inset-x-0 bottom-0 z-50 w-full max-w-xl mx-auto bg-[#FDFAF4] rounded-t-[32px] sm:rounded-t-[36px] border-t border-[#EADBCE] flex flex-col overflow-hidden select-none touch-none ${
          showExpandedContent
            ? 'shadow-[0_-16px_50px_rgba(28,22,17,0.22)]'
            : 'shadow-[0_-4px_16px_rgba(28,22,17,0.06)]'
        }`}
      >
        {/* GRAB HANDLE BAR (Sprei Pull Tab: Dapat ditarik ke atas / ke bawah) */}
        <div
          className="w-full pt-2 pb-1.5 flex flex-col items-center justify-center cursor-grab active:cursor-grabbing hover:bg-[#F7F1E4] transition-colors shrink-0"
          title="Tarik ke atas layaknya sprei untuk membuka, atau tarik ke bawah untuk menutup"
        >
          <div className="w-14 h-1.5 rounded-full bg-[#D8CBB5] hover:bg-[#B85D43] transition-colors" />
        </div>

        {/* ---------------------------------------------------------------
            A. MODE COLLAPSED (PEEK BAR RAMPING ~58PX)
        --------------------------------------------------------------- */}
        {!showExpandedContent && (
          <div className="w-full px-3 pb-2 flex items-center justify-between gap-1.5 shrink-0">
            {/* Tombol Pemicu Buka Laci Sprei */}
            <button
              type="button"
              data-testid="copilot-toggle-collapse-btn"
              onClick={toggleExpand}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#FDE8E4] hover:bg-[#FCD8D2] text-[#B85D43] text-xs font-bold shrink-0 cursor-pointer transition-transform active:scale-95 shadow-2xs"
              title="Tarik ke atas atau ketuk untuk membuka ide kalimat"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#B85D43] shrink-0" />
              <span className="truncate max-w-[85px] xs:max-w-none">
                {locale === 'th' ? 'ตัวช่วยตอบ' : 'Ide Bicara'}
              </span>
              <ChevronUp className="w-3.5 h-3.5 shrink-0" />
            </button>

            {/* 3 Quick Chips Interaktif */}
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar min-w-0 flex-1">
              {showLoadingState ? (
                <div className="flex items-center gap-1 animate-pulse">
                  <span className="w-16 h-6 rounded-lg bg-[#EADBCE]/60 inline-block" />
                  <span className="w-16 h-6 rounded-lg bg-[#EADBCE]/60 inline-block" />
                </div>
              ) : (
                visibleCards.map((card, idx) => {
                  const isSelected = idx === safeIndex;
                  return (
                    <button
                      key={`${card.id}_quick_chip_${idx}`}
                      type="button"
                      data-testid={`copilot-tier-tab-${idx}`}
                      onClick={() => {
                        setSelectedIndex(idx);
                        onSelectForInput(card.text);
                      }}
                      className={`px-2.5 py-1 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                        isSelected
                          ? 'bg-[#1C1611] text-white shadow-2xs'
                          : 'bg-white/80 hover:bg-white text-[#5C4A38] border border-[#EADBCE]'
                      }`}
                    >
                      {getShortTabLabel(card, idx)}
                    </button>
                  );
                })
              )}
            </div>

            {/* Tombol Regenerasi Ide Baru */}
            {onRefreshAssist && (
              <button
                type="button"
                data-testid="copilot-refresh-btn"
                disabled={showLoadingState || isAnalyzingTurn}
                onClick={onRefreshAssist}
                className="w-7 h-7 rounded-xl bg-white hover:bg-[#FAF6EE] border border-[#EADBCE] text-[#5C4A38] flex items-center justify-center shrink-0 cursor-pointer transition-transform active:scale-95 disabled:opacity-40"
                title="Minta ide jawaban baru"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingAssist ? 'animate-spin' : ''}`} />
              </button>
            )}
          </div>
        )}

        {/* Target text tersembunyi saat collapsed agar probe automated tetap dapat membacanya */}
        {activeCard && !showExpandedContent && (
          <span data-testid="teleprompter-target-text" className="sr-only">
            {activeCard.text}
          </span>
        )}

        {/* ---------------------------------------------------------------
            B. MODE EXPANDED (SPREI SELIMUT PENUH HINGGA 86VH)
        --------------------------------------------------------------- */}
        {showExpandedContent && (
          <div className="flex-1 flex flex-col p-4 sm:p-5 space-y-3.5 overflow-y-auto">
            {/* Header Laci Bersih */}
            <div className="w-full flex items-center justify-between pb-2 border-b border-[#F0E6D9] shrink-0">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-[#FDE8E4] text-[#B85D43] text-[10.5px] font-bold tracking-wide uppercase">
                  ✦ Bantuan Jawaban
                </span>
                <span className="text-xs text-[#8C7760] font-medium">Pilih ide balasan natural:</span>
              </div>
              <button
                type="button"
                onClick={closeSheet}
                className="w-7 h-7 rounded-full bg-[#F3EBE0] hover:bg-[#EADBCE] text-[#5C4A38] text-xs font-bold flex items-center justify-center cursor-pointer active:scale-95 transition-transform"
                title="Tutup laci"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Selector Tab Mode Balasan */}
            <div className="flex items-center gap-1.5 bg-[#FAF4E8] p-1 rounded-2xl shrink-0">
              {visibleCards.map((card, idx) => {
                const isSelected = idx === safeIndex;
                return (
                  <button
                    key={`${card.id}_drawer_tab_${idx}`}
                    type="button"
                    onClick={() => {
                      setSelectedIndex(idx);
                      onSelectForInput(card.text);
                    }}
                    className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer text-center ${
                      isSelected
                        ? 'bg-white text-[#231A12] shadow-xs'
                        : 'text-[#8C7760] hover:text-[#5C4A38]'
                    }`}
                  >
                    {getShortTabLabel(card, idx)}
                  </button>
                );
              })}
            </div>

            {/* Konten Kartu Jawaban Aktif */}
            {activeCard && (
              <div
                data-testid="beginner-reply-card-0"
                className="p-4 rounded-2xl bg-white border border-[#EADBCE] space-y-2.5 shadow-xs shrink-0"
              >
                {/* Kalimat Asing Lengkap (Bold & Nyaman Dilihat Siswa SMP) */}
                <div
                  data-testid="teleprompter-target-text"
                  className="text-base sm:text-lg font-bold text-[#231A12] leading-snug break-words"
                >
                  <JapaneseRubyDisplay
                    text={activeCard.text}
                    targetLang={targetLang}
                    showRomaji={false}
                    rubyClassName="text-base sm:text-lg font-bold text-[#231A12]"
                  />
                </div>

                {/* Panduan Pengucapan / Romaji / Pinyin */}
                {resolvePronunciationGuide(activeCard) && (
                  <p
                    data-testid="teleprompter-pronunciation"
                    className="text-xs sm:text-sm font-semibold text-[#B85D43] tracking-wide break-words"
                  >
                    {resolvePronunciationGuide(activeCard)}
                  </p>
                )}

                {/* Terjemahan Bahasa Indonesia */}
                <p
                  data-testid="teleprompter-meaning"
                  className="text-xs sm:text-[13px] text-[#5C4A38] leading-relaxed pt-1.5 border-t border-[#F2ECE0] break-words"
                >
                  💡 {sanitizeMotherTongueHint(locale === 'th' ? activeCard.hintTh || activeCard.hintId : activeCard.hintId)}
                </p>

                {/* Tombol Aksi: Dengarkan, Ucapkan, Pakai */}
                <div className="flex items-center justify-between gap-2 pt-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      data-testid="teleprompter-listen-btn"
                      onClick={() => onSpeakSample(activeCard.text, 0.92)}
                      className="px-3 py-1.5 rounded-xl bg-[#FAF6EE] hover:bg-[#F3EBE0] text-[#231A12] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-transform active:scale-95 border border-[#EADBCE]"
                      title="Dengarkan cara baca"
                    >
                      <Volume2 className="w-3.5 h-3.5 text-[#5C4A38]" />
                      <span>Dengarkan</span>
                    </button>

                    {!isLiveConnected && (
                      <button
                        type="button"
                        data-testid="teleprompter-mic-btn"
                        onClick={() => {
                          onSelectForInput(activeCard.text);
                          onStartPttWithPrompt(activeCard.text);
                          closeSheet();
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-transform active:scale-95 ${
                          isRecordingPtt
                            ? 'bg-[#B85D43] text-white'
                            : 'bg-[#FAF6EE] hover:bg-[#F3EBE0] text-[#231A12] border border-[#EADBCE]'
                        }`}
                        title="Ucapkan kalimat ini"
                      >
                        <Mic className="w-3.5 h-3.5" />
                        <span>Ucapkan</span>
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    data-testid="teleprompter-send-btn"
                    disabled={isAnalyzingTurn}
                    onClick={() => {
                      onSendDirect(activeCard.text);
                      closeSheet();
                    }}
                    className="px-4 py-2 rounded-xl bg-[#231A12] hover:bg-[#3D2E20] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-transform active:scale-95 shadow-xs disabled:opacity-40"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Pakai Jawaban Ini</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};
