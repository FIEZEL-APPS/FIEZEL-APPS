import React, { useEffect, useMemo, useState } from 'react';
import { Volume2, Send, Mic, RefreshCw, Sparkles, ChevronUp, ChevronDown, Check } from 'lucide-react';
import { resolveUnifiedPronunciation, type BeginnerReplyCard } from '../lib/liveCallHelper';
import { buildSswContextualReplyCards } from '../lib/sswSenseiEngine';
import type { CallScenario, LearnerLocale, VoicePersona } from '../types/voiceCall';
import { JapaneseRubyDisplay } from './JapaneseRubyDisplay';
import { toPhoneticRomaji } from '../lib/japanesePhonetics';
import { toPhoneticPinyin, containsHanzi } from '../lib/mandarinPhonetics';
import { t } from '../lib/i18n';

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

  const isSswMode =
    persona?.id === 'ssw_sensei' ||
    scenario.personaId === 'ssw_sensei' ||
    scenario.id.startsWith('scen_ssw_');

  const sswFallbackCards = useMemo(() => {
    if (!isSswMode) return [];
    return buildSswContextualReplyCards(aiQuestionText || '', lastUserText || '', 0).map((c) => ({
      id: c.id,
      tier: c.tier,
      badgeId: c.badgeId,
      badgeTh: c.badgeTh,
      tierLabelId: c.tierLabelId,
      tierLabelTh: c.tierLabelTh,
      text: c.text,
      pronunciation: c.pronunciation,
      hintId: c.hintId,
      hintTh: c.hintTh,
      meaningId: c.meaningId,
      meaningTh: c.meaningTh,
      isRealtimeAi: false,
      isOfflineFallback: true,
    }));
  }, [isSswMode, aiQuestionText, lastUserText]);

  const incomingCards = (cards || []).slice(0, 3);
  const visibleCards =
    incomingCards.length > 0 ? incomingCards : isSswMode ? sswFallbackCards.slice(0, 3) : [];
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
    if (isSswMode) {
      if (idx === 0 || card.tier === 'easy') return '1 · Tanya Detail';
      if (idx === 1 || card.tier === 'mission') return '2 · Trik & Contoh';
      return '3 · Uji Saya';
    }
    if (idx === 0 || card.tier === 'easy') return t(locale, 'ui.tabShort');
    if (idx === 1 || card.tier === 'mission') return t(locale, 'ui.tabNatural');
    return t(locale, 'ui.tabFollowUp');
  };

  const resolvePronunciationGuide = (card: BeginnerReplyCard): string => {
    if (isSswMode && !/[\u3040-\u30ff\u4e00-\u9fff]/.test(card.text || '')) {
      return '';
    }
    return resolveUnifiedPronunciation(card.text, targetLang, card.pronunciation);
  };

  const sanitizeMotherTongueHint = (hintText: string): string => {
    if (!hintText) return '';
    let res = hintText;
    // Never replace target CJK characters when UI locale itself is Japanese or Chinese
    if (locale === 'ja' || locale === 'zh') {
      return res.replace(/\s{2,}/g, ' ').trim();
    }
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
        className={`w-full max-w-full min-w-0 rounded-2xl sm:rounded-3xl border shadow-sm p-2 sm:p-2.5 space-y-2 transition-all overflow-hidden ${
          isSswMode ? 'bg-[#FCF9F1] border-[#DECFAF]' : 'bg-[#FDFAF4] border-[#EADBCE]'
        }`}
      >
        {isSswMode && (
          <div
            data-testid="ssw-quick-chips"
            className="w-full max-w-full min-w-0 flex flex-wrap sm:flex-nowrap items-center gap-1.5 sm:overflow-x-auto no-scrollbar pb-0.5"
          >
            {[
              {
                label: 'Cek Progres & Tahap 1',
                prompt: 'Sensei, cek progres SSW saya dan mulai dari mana untuk pemula nol?',
              },
              {
                label: 'Update Alergen Apr 2026',
                prompt: 'Bahas update alergen OTAFF Ver 5.1 April 2026: Kurumi, Cashew Nut, dan Pistachio!',
              },
              {
                label: 'Tes Hitungan Klorin',
                prompt: 'Tarik 1 soal hitungan kalkulator klorin atau budomari Wakai Papa sekarang!',
              },
              {
                label: 'Jebakan Yukkuri',
                prompt: 'Jelaskan jebakan kata yukkuri dan hokang sampuru di modul!',
              },
            ].map((chip) => (
              <button
                key={chip.label}
                type="button"
                onClick={() => {
                  if (onSendDirect) {
                    onSendDirect(chip.prompt);
                  } else {
                    onSelectForInput(chip.prompt);
                  }
                }}
                className="px-2.5 py-1 rounded-full bg-[#F6EDE0] hover:bg-[#8C2233] hover:text-white border border-[#DECFAF] text-[#5C3A21] text-[11px] font-bold whitespace-nowrap transition cursor-pointer shrink-0"
              >
                {chip.label}
              </button>
            ))}
          </div>
        )}
        {/* HEADER BAR: Toggle Ciutkan + Quick Tabs + Tombol Refresh */}
        <div className="w-full flex flex-wrap sm:flex-nowrap items-center justify-between gap-1.5 shrink-0">
          <button
            type="button"
            data-testid="copilot-toggle-collapse-btn"
            onClick={() => setIsExpanded(!isExpanded)}
            className={`order-1 inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold shrink-0 cursor-pointer transition-transform active:scale-95 shadow-2xs ${
              isSswMode
                ? 'bg-[#FCECED] hover:bg-[#F9D7DB] text-[#8C2233] border border-[#E8B8BF]'
                : 'bg-[#FDE8E4] hover:bg-[#FCD8D2] text-[#B85D43]'
            }`}
            title={
              isSswMode
                ? isExpanded
                  ? 'Sembunyikan kartu aksi SSW Sensei'
                  : 'Tampilkan aksi tanya & uji SSW Sensei'
                : isExpanded
                  ? t(locale, 'ui.toggleHideIdeas')
                  : t(locale, 'ui.toggleShowIdeas')
            }
          >
            <Sparkles className={`w-3.5 h-3.5 shrink-0 ${isSswMode ? 'text-[#8C2233]' : 'text-[#B85D43]'}`} />
            <span className="truncate">
              {isSswMode
                ? 'Aksi & Tanya Sensei'
                : isCambridgeMode
                  ? t(locale, 'ui.modelAnswerBtn')
                  : t(locale, 'ui.ideaBtn')}
            </span>
            {isExpanded ? <ChevronDown className="w-3.5 h-3.5 shrink-0" /> : <ChevronUp className="w-3.5 h-3.5 shrink-0" />}
          </button>

          {/* Quick Tabs: Singkat · Alami · Tanya Balik OR Single Best Model Answer Badge */}
          {isCambridgeMode ? (
            <div className="order-3 sm:order-2 w-full sm:w-auto flex items-center gap-1.5 min-w-0 flex-1">
              <span className="px-2.5 py-1 rounded-xl bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A] text-[11px] font-bold tracking-wide flex items-center gap-1.5 shadow-2xs truncate">
                <span className="text-xs">🎯</span>
                <span>
                  {locale === 'th'
                    ? (activeCard?.badgeTh || t(locale, 'ui.bestAnswer'))
                    : locale === 'id'
                      ? (activeCard?.badgeId || t(locale, 'ui.bestAnswer'))
                      : t(locale, 'ui.bestAnswer')}
                </span>
              </span>
              <span className="hidden sm:inline-block text-[10.5px] font-semibold text-[#8C7760] truncate">
                {locale === 'id' ? (activeCard?.tierLabelId || (scenario.id.startsWith('scen_pte') ? 'Pearson PTE Academic' : 'Cambridge IELTS Academic')) : (scenario.id.startsWith('scen_pte') ? 'Pearson PTE Academic' : 'Cambridge IELTS Academic')}
              </span>
            </div>
          ) : (
            <div className="order-3 sm:order-2 w-full sm:w-auto max-w-full flex flex-wrap sm:flex-nowrap items-center gap-1 sm:overflow-x-auto no-scrollbar min-w-0 sm:flex-1 pt-0.5 sm:pt-0">
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
                          ? isSswMode
                            ? 'bg-[#8C2233] text-white shadow-2xs'
                            : 'bg-[#1C1611] text-white shadow-2xs'
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
              className="order-2 sm:order-3 ml-auto sm:ml-0 w-7 h-7 rounded-xl bg-white hover:bg-[#FAF6EE] border border-[#EADBCE] text-[#5C4A38] flex items-center justify-center shrink-0 cursor-pointer transition-transform active:scale-95 disabled:opacity-40"
              title={t(locale, 'ui.refreshIdeas')}
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
            {(() => {
              const resolvedCardHint = sanitizeMotherTongueHint(
                isSswMode
                  ? locale === 'th'
                    ? activeCard.hintTh || activeCard.hintId
                    : activeCard.hintId
                  : locale === 'th'
                    ? activeCard.hintTh || activeCard.hintId
                    : locale === 'id'
                      ? activeCard.hintId
                      : (activeCard as any).hintEn || ''
              );
              if (!resolvedCardHint) return null;
              return (
                <p
                  data-testid="teleprompter-meaning"
                  className="text-xs sm:text-[12.5px] text-[#4A3B2C] font-medium leading-relaxed pt-1 border-t border-[#F2ECE0] break-words"
                >
                  {isSswMode ? (
                    <span className="font-bold text-[#8C2233] mr-1">
                      {locale === 'id' ? '[Arah Belajar]:' : '[Study Focus]:'}
                    </span>
                  ) : (
                    <>💡 {isCambridgeMode && <span className="font-bold text-[#92400E] mr-1">[{t(locale, 'ui.modelTranslationLabel')}]:</span>}</>
                  )}
                  {resolvedCardHint}
                </p>
              );
            })()}

            {/* Action Bar: Dengar, Ucapkan, Pakai */}
            <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#F2ECE0]">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  data-testid="teleprompter-listen-btn"
                  onClick={() => onSpeakSample(activeCard.text, 0.92)}
                  className="px-2.5 py-1 rounded-lg bg-[#FAF6EE] hover:bg-[#F3EBE0] text-[#231A12] text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer transition-transform active:scale-95 border border-[#EADBCE]"
                  title={t(locale, 'ui.listenTitle')}
                >
                  <Volume2 className="w-3.5 h-3.5 text-[#5C4A38]" />
                  <span>{t(locale, 'ui.listenBtn')}</span>
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
                    title={t(locale, 'ui.speakTitle')}
                  >
                    <Mic className="w-3.5 h-3.5" />
                    <span>{t(locale, 'ui.speakBtn')}</span>
                  </button>
                )}
              </div>

              <button
                type="button"
                data-testid="teleprompter-send-btn"
                disabled={isAnalyzingTurn}
                onClick={() => onSendDirect(activeCard.text)}
                className={`px-3.5 py-1.5 rounded-lg text-white text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer transition-transform active:scale-95 shadow-xs disabled:opacity-40 ${
                  isSswMode ? 'bg-[#8C2233] hover:bg-[#731A28]' : 'bg-[#231A12] hover:bg-[#3D2E20]'
                }`}
              >
                <Send className="w-3 h-3" />
                <span>
                  {isSswMode
                    ? 'Kirim ke Sensei'
                    : t(locale, 'ui.useAnswerBtn')}
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
