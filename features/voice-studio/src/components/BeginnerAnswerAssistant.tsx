import React, { useEffect, useState } from 'react';
import { Volume2, Send, Mic, RefreshCw, Sparkles, Eye, EyeOff } from 'lucide-react';
import type { BeginnerReplyCard } from '../lib/liveCallHelper';
import type { CallScenario, LearnerLocale } from '../types/voiceCall';
import { JapaneseRubyDisplay } from './JapaneseRubyDisplay';
import { toPhoneticRomaji } from '../lib/japanesePhonetics';
import { toPhoneticPinyin, containsHanzi, stripHanzi } from '../lib/mandarinPhonetics';

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
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  // Reset spotlight to easiest/shortest option whenever Partner AI speaks a new sentence
  useEffect(() => {
    setSelectedIndex(0);
  }, [aiQuestionText]);

  const visibleCards = (cards || []).slice(0, 3);
  const safeIndex = selectedIndex < visibleCards.length ? selectedIndex : 0;
  const activeCard = visibleCards[safeIndex] || null;

  // ZERO-DISAPPEARING TELEPROMPTER INVARIANT:
  // ONLY show full-surface skeleton shimmer when there are genuinely NO CARDS available at all!
  // If activeCard exists, keep teleprompter rock-solid and responsive (never hide cards while user is reading!)
  const showLoadingState =
    !isRecordingPtt &&
    !activeCard &&
    (isGeneratingCopilot || isRefreshingAssist || copilotSource === 'loading' || isAnalyzingTurn);

  if (!showLoadingState && !activeCard) {
    return null;
  }

  // Mode Sembunyikan: Tampilan ringkas agar panggung & avatar lawan bicara terlihat bebas leluasa
  if (isCollapsed) {
    return (
      <section
        data-testid="beginner-answer-assistant"
        data-copilot-source={showLoadingState ? 'loading' : 'ai-realtime'}
        data-copilot-collapsed="true"
        aria-label="Layar Bantuan Jawaban Natural (Disembunyikan)"
        className="w-full"
      >
        <div className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-2xl bg-white/90 backdrop-blur-sm border border-[#E6DEC8]/80 shadow-2xs">
          <div className="flex items-center gap-1.5 min-w-0">
            <Sparkles className="w-3.5 h-3.5 text-[#8C2233] shrink-0" />
            <span className="text-xs font-semibold text-[#5C4E3C] truncate">
              {locale === 'th'
                ? 'แนวทางตอบธรรมชาติ · Fiezel Copilot'
                : 'Bantuan Jawaban Natural · Fiezel Copilot'}
            </span>
          </div>
          <button
            type="button"
            data-testid="copilot-toggle-collapse-btn"
            onClick={() => setIsCollapsed(false)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#F5F1E8] hover:bg-[#EAE3D5] text-[#1C1611] text-[11px] font-semibold cursor-pointer transition-colors shrink-0"
            title="Tampilkan kembali bantuan jawaban Fiezel"
            aria-label={locale === 'th' ? 'เปิดตัวช่วย' : 'Tampilkan Bantuan'}
          >
            <Eye className="w-3.5 h-3.5 text-[#5C4E3C] shrink-0" />
            <span>{locale === 'th' ? 'เปิดตัวช่วย' : 'Tampilkan Bantuan'}</span>
          </button>
        </div>
      </section>
    );
  }

  const getShortTabLabel = (card: BeginnerReplyCard, idx: number): string => {
    if (locale === 'th') {
      if (idx === 0 || card.tier === 'easy') return '1 · สั้นและง่าย';
      if (idx === 1 || card.tier === 'mission') return '2 · เป็นธรรมชาติ';
      return '3 · ตอบ+ถามกลับ';
    }
    if (idx === 0 || card.tier === 'easy') return '1 · Singkat';
    if (idx === 1 || card.tier === 'mission') return '2 · Alami';
    return '3 · + Tanya Balik';
  };

  const resolvePronunciationGuide = (card: BeginnerReplyCard): string => {
    const raw = (card.pronunciation || '').trim();
    const hasCjkRaw = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/.test(raw);
    if (targetLang === 'ja') {
      // Deterministic word-spaced Hepburn engine (FIEZEL Master Lexicon) is ALWAYS preferred:
      // AI-provided romaji is often syllable-split ("to sho ka n de") and hard to read aloud.
      const deterministic = toPhoneticRomaji(card.text);
      if (deterministic) return deterministic;
      return hasCjkRaw ? '' : raw;
    }
    if (targetLang === 'zh') {
      const deterministic = toPhoneticPinyin(card.text);
      if (deterministic) return deterministic;
      return hasCjkRaw ? '' : raw;
    }
    // For English, avoid echoing the exact same Latin sentence twice if pronunciation === text
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
    // 1. Convert quoted CJK to Romanized equivalent
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
    // 2. Convert or strip any remaining raw Hanzi from Mandarin translations
    if (targetLang === 'zh' && containsHanzi(res)) {
      res = res.replace(/[\u3400-\u4dbf\u4e00-\u9fff]+/g, (match) => {
        const py = toPhoneticPinyin(match);
        return py ? ` (${py}) ` : '';
      });
    }
    // 3. Convert or strip any remaining raw Kanji/Kana from Japanese translations
    if (targetLang === 'ja' && /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/.test(res)) {
      res = res.replace(/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]+/g, (match) => {
        const ro = toPhoneticRomaji(match);
        return ro ? ` (${ro}) ` : '';
      });
    }
    return res.replace(/\s{2,}/g, ' ').trim();
  };

  return (
    <section
      data-testid="beginner-answer-assistant"
      data-copilot-source={showLoadingState ? 'loading' : 'ai-realtime'}
      data-copilot-collapsed="false"
      aria-label={locale === 'th' ? 'แนวทางตอบธรรมชาติ · Fiezel Copilot' : 'Bantuan Jawaban Natural · Fiezel Copilot'}
      className="w-full space-y-1.5"
    >
      {/* Baris Header Bantuan: Judul Natural + Badge Status + Tombol Sembunyikan & Variasi Baru */}
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1C1611] tracking-[-0.01em] min-w-0">
            <Sparkles className="w-3.5 h-3.5 text-[#8C2233] shrink-0" />
            <span className="sm:hidden truncate">
              {locale === 'th' ? 'แนวทางตอบ · Fiezel' : 'Bantuan Jawaban · Fiezel'}
            </span>
            <span className="hidden sm:inline truncate">
              {locale === 'th'
                ? 'แนวทางตอบธรรมชาติ · Fiezel Copilot'
                : 'Bantuan Jawaban Natural · Fiezel Copilot'}
            </span>
          </span>

          <span
            data-testid="realtime-context-sync-badge"
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap shrink-0 ${
              showLoadingState || isRefreshingAssist
                ? 'bg-[#FFF4DB] text-[#8A5A00]'
                : 'bg-[#E9F7F0] text-[#1F6E50]'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                showLoadingState || isRefreshingAssist
                  ? 'bg-[#E6A800] animate-ping'
                  : 'bg-[#2E8B69]'
              }`}
            />
            {showLoadingState ? (
              <span>{locale === 'th' ? 'กำลังสร้าง...' : 'Meracik Jawaban...'}</span>
            ) : isRefreshingAssist ? (
              <span>{locale === 'th' ? 'กำลังอัปเดต...' : 'Menyelaraskan...'}</span>
            ) : (
              <>
                <span className="sm:hidden">{locale === 'th' ? 'สด' : 'Spontan'}</span>
                <span className="hidden sm:inline">
                  {locale === 'th' ? 'ตอบโต้สด' : 'Jawaban Spontan'}
                </span>
              </>
            )}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {onRefreshAssist && (
            <button
              type="button"
              data-testid="copilot-refresh-btn"
              disabled={showLoadingState || isAnalyzingTurn}
              onClick={onRefreshAssist}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white hover:bg-[#FAF5EB] border border-[#E6DEC8] text-[#5C4E3C] hover:text-[#1C1611] text-[11px] font-semibold shadow-2xs cursor-pointer transition-all shrink-0 disabled:opacity-50"
              title="Minta 3 variasi jawaban baru"
            >
              <RefreshCw className={`w-3 h-3 ${isRefreshingAssist ? 'animate-spin' : ''}`} />
              <span className="hidden xs:inline">{locale === 'th' ? 'สร้างใหม่' : 'Opsi Baru'}</span>
            </button>
          )}

          <button
            type="button"
            data-testid="copilot-toggle-collapse-btn"
            onClick={() => setIsCollapsed(true)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white hover:bg-[#FAF5EB] border border-[#E6DEC8] text-[#5C4E3C] hover:text-[#8C2233] text-[11px] font-semibold shadow-2xs cursor-pointer transition-all shrink-0"
            title="Sembunyikan bantuan jawaban untuk melihat lawan bicara lebih leluasa"
            aria-label={locale === 'th' ? 'ซ่อน' : 'Sembunyikan Bantuan'}
          >
            <EyeOff className="w-3 h-3 text-[#7A6B56] shrink-0" />
            <span>{locale === 'th' ? 'ซ่อน' : 'Sembunyikan'}</span>
          </button>
        </div>
      </div>

      {/* Konteks tersembunyi untuk inspeksi sinkronisasi */}
      <div data-testid="assistant-live-context-bar" style={{ display: 'none' }} className="hidden">
        <span>{aiQuestionText}</span>
        <span>{aiQuestionTranslation}</span>
        {lastUserText && <span>{lastUserText}</span>}
      </div>

      {/* Kartu Utama Teleprompter User (Satu Permukaan Bersih, Mudah Dilirik Saat Menatap Layar) */}
      <div
        className={`bg-white rounded-3xl px-4 py-3 sm:px-5 sm:py-3.5 shadow-[0_4px_20px_rgba(28,22,17,0.05)] border transition-all ${
          isRecordingPtt
            ? 'border-[#8C2233]/50 ring-2 ring-[#8C2233]/15'
            : 'border-[#E6DEC8]/80'
        }`}
      >
        {showLoadingState ? (
          <div
            data-testid="copilot-loading-shimmer"
            aria-live="polite"
            className="py-2 space-y-2.5 animate-pulse"
          >
            <div className="flex items-center gap-1.5">
              <div className="h-6 w-20 rounded-full bg-[#F5F1E8]" />
              <div className="h-6 w-20 rounded-full bg-[#F5F1E8]" />
              <div className="h-6 w-28 rounded-full bg-[#F5F1E8]" />
            </div>
            <div className="space-y-1.5 pt-0.5">
              <div className="h-4 w-4/5 rounded-lg bg-[#EFE9DC]" />
              <div className="h-3.5 w-3/5 rounded-lg bg-[#F5F1E8]" />
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] font-medium text-[#857560]">
                {locale === 'th'
                  ? 'กำลังวิเคราะห์คำพูดล่าสุดและสร้างแนวทางตอบโต้สด...'
                  : 'Menyesuaikan bantuan jawaban dengan kalimat yang baru diucapkan partner...'}
              </span>
              <div className="h-7 w-20 rounded-full bg-[#EFE9DC]" />
            </div>
          </div>
        ) : (
          activeCard && (
            <div className="space-y-2.5">
              {/* Strip Pilihan Gaya Balasan (1-Tap Instant Teleprompter Switch) */}
              {visibleCards.length > 1 && (
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                  {visibleCards.map((card, idx) => {
                    const isSelected = idx === safeIndex;
                    return (
                      <button
                        key={`${card.id}_tab_${idx}`}
                        type="button"
                        data-testid={`copilot-tier-tab-${idx}`}
                        onClick={() => {
                          setSelectedIndex(idx);
                          onSelectForInput(card.text);
                        }}
                        className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all cursor-pointer shrink-0 ${
                          isSelected
                            ? 'bg-[#1C1611] text-white shadow-2xs'
                            : 'bg-[#F5F1E8] text-[#5C4E3C] hover:bg-[#EAE3D5] hover:text-[#1C1611]'
                        }`}
                      >
                        {getShortTabLabel(card, idx)}
                      </button>
                    );
                  })}

                  {isRecordingPtt && (
                    <span className="ml-auto text-[11px] font-bold text-[#8C2233] animate-pulse shrink-0">
                      {locale === 'th' ? 'อ่านออกเสียงได้เลย...' : 'Baca lantang sekarang...'}
                    </span>
                  )}
                </div>
              )}

              {/* Area Teks Teleprompter Fokus Mata */}
              <div
                data-testid="beginner-reply-card-0"
                onClick={() => onSelectForInput(activeCard.text)}
                title="Ketuk untuk memilih balasan ini"
                className="w-full cursor-pointer space-y-1 text-left rounded-xl transition-colors hover:bg-[#FAF6EE] p-0.5"
              >
                <div
                  data-testid="teleprompter-target-text"
                  className="text-[15px] sm:text-[17px] font-bold text-[#1C1611] leading-relaxed pt-1 tracking-[-0.01em] break-words"
                >
                  <JapaneseRubyDisplay
                    text={activeCard.text}
                    targetLang={targetLang}
                    showRomaji={false}
                    rubyClassName="text-[15px] sm:text-[17px] font-bold text-[#1C1611]"
                  />
                </div>

                {resolvePronunciationGuide(activeCard) && (
                  <p
                    data-testid="teleprompter-pronunciation"
                    className="text-[13px] sm:text-sm font-semibold text-[#8C2233] leading-relaxed break-words pt-1"
                  >
                    {resolvePronunciationGuide(activeCard)}
                  </p>
                )}
              </div>

              {/* Arti Bahasa Ibu + Tombol Aksi Suara / Kirim */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-2 border-t border-[#F2ECE0]">
                <p
                  data-testid="teleprompter-meaning"
                  className="text-xs sm:text-[13px] text-[#5C4E3C] leading-snug min-w-0 flex-1 break-words"
                >
                  {sanitizeMotherTongueHint(locale === 'th' ? activeCard.hintTh || activeCard.hintId : activeCard.hintId)}
                </p>

                <div className="flex items-center justify-end gap-1.5 shrink-0">
                  <button
                    type="button"
                    data-testid="teleprompter-listen-btn"
                    onClick={() => onSpeakSample(activeCard.text, 0.92)}
                    className="h-8 px-2.5 rounded-full bg-[#F5F1E8] hover:bg-[#EAE3D5] text-[#1C1611] text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors"
                    title="Dengarkan contoh cara baca"
                    aria-label={locale === 'th' ? 'ฟังตัวอย่าง' : 'Dengar contoh'}
                  >
                    <Volume2 className="w-3.5 h-3.5 text-[#5C4E3C] shrink-0" />
                    <span>{locale === 'th' ? 'ฟัง' : 'Dengar'}</span>
                  </button>

                  {!isLiveConnected && (
                    <button
                      type="button"
                      data-testid="teleprompter-mic-btn"
                      onClick={() => {
                        onSelectForInput(activeCard.text);
                        onStartPttWithPrompt(activeCard.text);
                      }}
                      className={`h-8 px-2.5 rounded-full text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors ${
                        isRecordingPtt
                          ? 'bg-[#8C2233] text-white'
                          : 'bg-[#F5F1E8] hover:bg-[#EAE3D5] text-[#1C1611]'
                      }`}
                      title="Baca & ucapkan lewat mikrofon"
                      aria-label={locale === 'th' ? 'พูดตาม' : 'Ucapkan'}
                    >
                      <Mic className="w-3.5 h-3.5 shrink-0" />
                      <span>{locale === 'th' ? 'พูด' : 'Ucapkan'}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    data-testid="teleprompter-send-btn"
                    disabled={isAnalyzingTurn}
                    onClick={() => onSendDirect(activeCard.text)}
                    className="h-8 px-3.5 rounded-full bg-[#1C1611] hover:bg-[#332920] text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50"
                  >
                    <Send className="w-3 h-3 shrink-0" />
                    <span>{locale === 'th' ? 'ใช้ตอบ' : 'Pakai'}</span>
                  </button>
                </div>
              </div>
            </div>
          )
        )}
      </div>
    </section>
  );
};
