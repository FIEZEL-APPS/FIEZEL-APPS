import React from 'react';
import { Volume2, Send, Mic, RefreshCw } from 'lucide-react';
import { BeginnerReplyCard } from '../lib/liveCallHelper';
import { CallScenario, LearnerLocale } from '../types/voiceCall';

interface BeginnerAnswerAssistantProps {
  locale: LearnerLocale;
  targetLang: 'en' | 'ja';
  scenario: CallScenario;
  aiQuestionText: string;
  aiQuestionTranslation: string;
  lastUserText?: string;
  cards: BeginnerReplyCard[];
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
  aiQuestionText,
  aiQuestionTranslation,
  lastUserText,
  cards,
  isRecordingPtt,
  isAnalyzingTurn,
  isPlayingAiAudio = false,
  isRefreshingAssist = false,
  turnCount = 1,
  onRefreshAssist,
  onSpeakSample,
  onSelectForInput,
  onSendDirect,
  onStartPttWithPrompt,
}) => {
  if (!cards || cards.length === 0) return null;

  const visibleCards = cards.slice(0, 3);
  const isUpdatingLive = isAnalyzingTurn || isRefreshingAssist || isPlayingAiAudio;

  return (
    <section
      data-testid="beginner-answer-assistant"
      aria-label="Bantuan Cara Jawab Realtime"
      className="space-y-2"
    >
      {/* Header Tanpa Kotak — Ringan & Tenang */}
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-semibold text-[#5C4E3C]">
            {locale === 'th' ? 'ไอเดียคำตอบ' : 'Ide Balasan'}
          </span>
          <span
            data-testid="realtime-context-sync-badge"
            className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#857560]"
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isUpdatingLive ? 'bg-[#E6A800] animate-ping' : 'bg-[#2E8B69]'
              }`}
            />
            <span>
              {isUpdatingLive
                ? locale === 'th'
                  ? 'กำลังอัปเดต...'
                  : 'Menyesuaikan...'
                : locale === 'th'
                  ? `เทิร์น #${turnCount}`
                  : `Giliran #${turnCount}`}
            </span>
          </span>
        </div>

        {onRefreshAssist && (
          <button
            type="button"
            disabled={isRefreshingAssist || isAnalyzingTurn}
            onClick={onRefreshAssist}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/80 hover:bg-white text-[#5C4E3C] hover:text-[#1C1611] text-[11px] font-semibold shadow-[0_1px_2px_rgba(28,22,17,0.05)] cursor-pointer transition-all shrink-0 disabled:opacity-50"
            title="Perbarui opsi jawaban"
          >
            <RefreshCw className={`w-3 h-3 ${isRefreshingAssist ? 'animate-spin' : ''}`} />
            <span>{locale === 'th' ? 'เปลี่ยน' : 'Opsi Lain'}</span>
          </button>
        )}
      </div>

      {/* Konteks tersembunyi untuk sinkronisasi otomatis */}
      <div data-testid="assistant-live-context-bar" style={{ display: 'none' }} className="hidden">
        <span>{aiQuestionText}</span>
        <span>{aiQuestionTranslation}</span>
        {lastUserText && <span>{lastUserText}</span>}
      </div>

      {/* 3 Pilihan Balasan Lebar Penuh (Nyaman Dibaca di Layar Sempit Tanpa Teks Terjepit) */}
      <div
        key={`${aiQuestionText}_${lastUserText || ''}`}
        className="space-y-2"
      >
        {visibleCards.map((card, index) => (
          <div
            key={`${card.id}_${index}`}
            data-testid={`beginner-reply-card-${index}`}
            className="bg-white hover:bg-[#FCFBF8] rounded-2xl px-4 py-3 shadow-[0_1px_4px_rgba(28,22,17,0.04)] border border-black/[0.04] space-y-1.5 transition-all"
          >
            <div
              onClick={() => onSelectForInput(card.text)}
              className="w-full cursor-pointer space-y-0.5"
            >
              <p
                data-testid={index === 0 ? 'teleprompter-target-text' : undefined}
                className="text-sm sm:text-[15px] font-semibold text-[#1C1611] leading-snug break-words"
              >
                {card.text}
              </p>

              <p
                data-testid={index === 0 ? 'teleprompter-pronunciation' : undefined}
                className="text-xs text-[#8C6D1F] font-medium leading-snug break-words"
              >
                {card.pronunciation}
              </p>
            </div>

            <div className="flex items-center justify-between gap-2.5 pt-0.5">
              <p
                data-testid={index === 0 ? 'teleprompter-meaning' : undefined}
                className="text-xs text-[#6E5E47] leading-snug min-w-0 flex-1 break-words"
              >
                {locale === 'th' ? card.hintTh : card.hintId}
              </p>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => onSpeakSample(card.text, 0.9)}
                  className="w-7 h-7 rounded-full bg-[#F5F1E8] hover:bg-[#EAE3D5] text-[#1C1611] flex items-center justify-center cursor-pointer transition-colors"
                  title="Dengarkan cara baca"
                  aria-label={locale === 'th' ? 'ฟัง' : 'Dengar'}
                >
                  <Volume2 className="w-3.5 h-3.5 text-[#5C4E3C]" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onSelectForInput(card.text);
                    onStartPttWithPrompt(card.text);
                  }}
                  className={`w-7 h-7 rounded-full flex items-center justify-center cursor-pointer transition-colors ${
                    isRecordingPtt
                      ? 'bg-[#8C2233] text-white'
                      : 'bg-[#F5F1E8] hover:bg-[#EAE3D5] text-[#5C4E3C]'
                  }`}
                  title="Ucapkan dengan mikrofon"
                  aria-label={locale === 'th' ? 'พูด' : 'Ucap'}
                >
                  <Mic className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  data-testid={index === 0 ? 'teleprompter-send-btn' : undefined}
                  disabled={isAnalyzingTurn}
                  onClick={() => onSendDirect(card.text)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#1C1611] hover:bg-[#332920] text-white text-xs font-semibold cursor-pointer transition-colors disabled:opacity-50"
                >
                  <Send className="w-3 h-3 shrink-0" />
                  <span>{locale === 'th' ? 'ส่ง' : 'Pakai'}</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
