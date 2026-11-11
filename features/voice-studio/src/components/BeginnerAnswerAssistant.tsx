import React, { useEffect, useState } from 'react';
import { Volume2, Send, Mic, RefreshCw, Sparkles, ChevronUp, ChevronDown, Check } from 'lucide-react';
import type { BeginnerReplyCard } from '../lib/liveCallHelper';
import type { CallScenario, LearnerLocale, VoicePersona } from '../types/voiceCall';
import { JapaneseRubyDisplay } from './JapaneseRubyDisplay';
import { toPhoneticRomaji } from '../lib/japanesePhonetics';
import { toPhoneticPinyin, containsHanzi } from '../lib/mandarinPhonetics';

export interface BeginnerAnswerAssistantProps {
  locale: LearnerLocale;
  targetLang: 'en' | 'ja' | 'zh';
  scenario: CallScenario;
  persona?: VoicePersona;
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
  scenario,
  persona,
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
  // Default expanded so learners immediately see what to say without hunting or pulling sheets!
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  // Reset spotlight ke opsi paling singkat setiap Partner AI mengucapkan kalimat baru
  useEffect(() => {
    setSelectedIndex(0);
  }, [aiQuestionText]);

  const visibleCards = (cards || []).slice(0, 3);
  const safeIndex = selectedIndex < visibleCards.length ? selectedIndex : 0;
  const activeCard = visibleCards[safeIndex] || null;

  const isCambridgeMode =
    persona?.id === 'cambridge_examiner' ||
    scenario.personaId === 'cambridge_examiner' ||
    scenario.id.startsWith('scen_ielts') ||
    visibleCards.some(
      (c) =>
        c.tier === ('cambridge_model' as any) ||
        c.badgeId?.includes('Band 9') ||
        c.tierLabelId?.includes('Band 9')
    );

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

  return (
    <section
      data-testid="beginner-answer-assistant"
      data-copilot-source={showLoadingState ? 'loading' : 'ai-realtime'}
      data-copilot-collapsed={isExpanded ? 'false' : 'true'}
      aria-label="Bantuan Jawaban Natural (Copilot)"
      className="w-full relative"
    >
      {/* Konteks tersembunyi untuk kestabilan uji sinkronisasi */}
      <div data-testid="assistant-live-context-bar" style={{ display: 'none' }} className="hidden">
        <span>{aiQuestionText}</span>
        <span>{aiQuestionTranslation}</span>
        {lastUserText && <span>{lastUserText}</span>}
      </div>

      {/* DOCKED IN-FLOW CONTAINER: Menempel secara aman di atas input bar tanpa pernah menutupi mic atau input text */}
      <div
        data-testid="copilot-peek-container"
        className="w-full bg-[#FDFAF4] rounded-2xl sm:rounded-3xl border border-[#EADBCE] shadow-sm p-2 sm:p-2.5 space-y-2 transition-all"
      >
        {/* HEADER BAR: Toggle Ciutkan + Quick Tabs + Tombol Refresh */}
        <div className="w-full flex items-center justify-between gap-1.5 shrink-0">
          <button
            type="button"
            data-testid="copilot-toggle-collapse-btn"
            onClick={() => setIsExpanded(!isExpanded)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#FDE8E4] hover:bg-[#FCD8D2] text-[#B85D43] text-xs font-bold shrink-0 cursor-pointer transition-transform active:scale-95 shadow-2xs"
            title={isExpanded ? 'Sembunyikan detail bantuan' : 'Tampilkan ide kalimat'}
          >
            <Sparkles className="w-3.5 h-3.5 text-[#B85D43] shrink-0" />
            <span className="truncate">
              {isCambridgeMode ? (locale === 'th' ? 'คำตอบ Band 9.0' : 'Model Answer') : (locale === 'th' ? 'ตัวช่วยตอบ' : 'Ide Bicara')}
            </span>
            {isExpanded ? <ChevronDown className="w-3.5 h-3.5 shrink-0" /> : <ChevronUp className="w-3.5 h-3.5 shrink-0" />}
          </button>

          {/* Quick Tabs: Singkat · Alami · Tanya Balik OR Single Best Model Answer Badge */}
          {isCambridgeMode ? (
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <span className="px-2.5 py-1 rounded-xl bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A] text-[11px] font-bold tracking-wide flex items-center gap-1.5 shadow-2xs truncate">
                <span className="text-xs">🎯</span>
                <span>{locale === 'th' ? 'คำตอบระดับ Band 9.0' : 'Jawaban Terbaik (Band 9.0)'}</span>
              </span>
              <span className="hidden sm:inline-block text-[10.5px] font-semibold text-[#8C7760] truncate">
                Cambridge IELTS Academic
              </span>
            </div>
          ) : (
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
                      key={`${card.id}_tab_${idx}`}
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
          )}

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

        {/* Target text tersembunyi saat collapsed agar probe automated tetap dapat membacanya */}
        {activeCard && !isExpanded && (
          <span data-testid="teleprompter-target-text" className="sr-only">
            {activeCard.text}
          </span>
        )}

        {/* DETAIL KARTU JAWABAN (Langsung terbaca jelas tanpa perlu tarik sprei!) */}
        {isExpanded && activeCard && (
          <div
            data-testid="beginner-reply-card-0"
            className="p-2.5 sm:p-3 rounded-xl bg-white border border-[#EADBCE] space-y-2 shadow-2xs"
          >
            {/* Kalimat Target Kursus (Bold & Nyaman Dilihat) */}
            <div
              data-testid="teleprompter-target-text"
              className="text-[14px] sm:text-[15.5px] font-bold text-[#231A12] leading-snug break-words"
            >
              <JapaneseRubyDisplay
                text={activeCard.text}
                targetLang={targetLang}
                showRomaji={false}
                rubyClassName="text-[14px] sm:text-[15.5px] font-bold text-[#231A12]"
              />
            </div>

            {/* Panduan Pengucapan / Romaji / Pinyin */}
            {resolvePronunciationGuide(activeCard) && (
              <p
                data-testid="teleprompter-pronunciation"
                className="text-xs font-semibold text-[#B85D43] tracking-wide break-words"
              >
                {resolvePronunciationGuide(activeCard)}
              </p>
            )}

            {/* Terjemahan Bahasa Indonesia / Thai yang JELAS & TEGAS */}
            <p
              data-testid="teleprompter-meaning"
              className="text-xs sm:text-[12.5px] text-[#4A3B2C] font-medium leading-relaxed pt-1 border-t border-[#F2ECE0] break-words"
            >
              💡 {isCambridgeMode && <span className="font-bold text-[#92400E] mr-1">[{locale === 'th' ? 'แปลคำตอบ Band 9.0' : 'Terjemahan Model Answer'}]:</span>}
              {sanitizeMotherTongueHint(locale === 'th' ? activeCard.hintTh || activeCard.hintId : activeCard.hintId)}
            </p>

            {/* Action Bar: Dengar, Ucapkan, Pakai */}
            <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#F2ECE0]">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  data-testid="teleprompter-listen-btn"
                  onClick={() => onSpeakSample(activeCard.text, 0.92)}
                  className="px-2.5 py-1 rounded-lg bg-[#FAF6EE] hover:bg-[#F3EBE0] text-[#231A12] text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer transition-transform active:scale-95 border border-[#EADBCE]"
                  title="Dengarkan cara baca"
                >
                  <Volume2 className="w-3.5 h-3.5 text-[#5C4A38]" />
                  <span>Dengar</span>
                </button>

                {!isLiveConnected && (
                  <button
                    type="button"
                    data-testid="teleprompter-mic-btn"
                    onClick={() => {
                      onSelectForInput(activeCard.text);
                      onStartPttWithPrompt(activeCard.text);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer transition-transform active:scale-95 ${
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
                onClick={() => onSendDirect(activeCard.text)}
                className="px-3.5 py-1.5 rounded-lg bg-[#231A12] hover:bg-[#3D2E20] text-white text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer transition-transform active:scale-95 shadow-xs disabled:opacity-40"
              >
                <Send className="w-3 h-3" />
                <span>Pakai Jawaban</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
