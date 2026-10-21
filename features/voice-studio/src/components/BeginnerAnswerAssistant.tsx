import React from 'react';
import { Volume2, Send, Mic, Ear, RefreshCw, Sparkles } from 'lucide-react';
import { BeginnerReplyCard } from '../lib/liveCallHelper';
import { CallScenario, LearnerLocale } from '../types/voiceCall';
import {
  FiezelCornerOrnament,
  FiezelPawStamp,
  FiezelSparkleOrnament,
} from './FiezelOrnaments';

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
  isLiveConnected,
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

  // Always display all 3 contextual options as confirmed by user preference
  const visibleCards = cards.slice(0, 3);
  const isUpdatingLive = isAnalyzingTurn || isRefreshingAssist || isPlayingAiAudio;

  return (
    <section
      data-testid="beginner-answer-assistant"
      aria-label="Bantuan Cara Jawab Realtime"
      className="fz-studio-card rounded-3xl p-4 sm:p-6 space-y-4 relative overflow-hidden transition-all duration-300"
    >
      {/* Ornamen Pita Atas Solar Gold & Marun Khas FIEZEL */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-[#8C2233] via-[#FFC700] to-[#D8B36B]"
      />
      <FiezelCornerOrnament className="absolute -right-3 -top-3 w-28 h-28 opacity-75" />

      {/* Header Bantuan Cara Jawab dengan Status Sinkronisasi Ucapan PAW Realtime */}
      <div className="relative z-10 flex flex-col gap-3 pb-3.5 border-b border-[#F0E4CF]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#FFF3C4] border-2 border-[#FFC700] text-[#8C2233] flex items-center justify-center shrink-0 shadow-xs">
              <FiezelPawStamp className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="fz-badge-paw">
                  <FiezelSparkleOrnament className="w-3.5 h-3.5" />
                  <span>
                    {locale === 'th'
                      ? 'ตัวช่วยตอบคำถาม PAW แบบเรียลไทม์ (3 ตัวเลือก)'
                      : 'BANTUAN CARA JAWAB PAW · REALTIME (3 OPSI KONTEKSTUAL)'}
                  </span>
                </span>

                <span
                  data-testid="realtime-context-sync-badge"
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition-all ${
                    isUpdatingLive
                      ? 'bg-[#FFF3C4] border-[#E6A800]/50 text-[#8C6D1F]'
                      : 'bg-[#E9F7F0] border-[#2E8B69]/35 text-[#2E8B69]'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isUpdatingLive ? 'bg-[#E6A800] animate-ping' : 'bg-[#2E8B69] animate-pulse'
                    }`}
                  />
                  <span>
                    {isUpdatingLive
                      ? locale === 'th'
                        ? 'กำลังปรับตัวเลือกตามคำพูดล่าสุดของ PAW...'
                        : 'Menyesuaikan ucapan terbaru PAW...'
                      : locale === 'th'
                        ? `อัปเดตตามบริบทสด · เทิร์นที่ ${turnCount}`
                        : `Sinkron Otomatis Sesuai Balasan PAW · Giliran #${turnCount}`}
                  </span>
                </span>

                {isLiveConnected && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#FDF2F4] border border-[#8C2233]/30 text-[#8C2233] text-[10px] font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#8C2233] animate-pulse" />
                    LIVE STREAM
                  </span>
                )}
              </div>

              <h3 className="text-sm sm:text-base font-bold text-[#241A11] pt-0.5">
                {locale === 'th'
                  ? '3 ตัวเลือกคำตอบที่สร้างขึ้นสดตามคำถามล่าสุดของ PAW และคำตอบก่อนหน้าของคุณ:'
                  : '3 pilihan jawaban di bawah ini dibuat otomatis mengikuti pertanyaan terakhir PAW & jawabanmu sebelumnya:'}
              </h3>
            </div>
          </div>

          {onRefreshAssist && (
            <button
              type="button"
              disabled={isRefreshingAssist || isAnalyzingTurn}
              onClick={onRefreshAssist}
              className="self-start sm:self-center inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FFF3DC] hover:bg-[#FFF3C4] border border-[#F0E4CF] text-[#241A11] text-xs font-bold cursor-pointer transition-colors shrink-0 disabled:opacity-50"
              title="Perbarui 3 opsi kalimat bantuan sesuai konteks bicara saat ini"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 text-[#8C2233] ${isRefreshingAssist ? 'animate-spin' : ''}`}
              />
              <span>{locale === 'th' ? 'รีเฟรชตัวเลือก' : 'Perbarui Opsi'}</span>
            </button>
          )}
        </div>

        {/* Pita Konteks Bicara Langsung (Pertanyaan Terakhir PAW + Jawaban Murid Sebelumnya) */}
        <div
          data-testid="assistant-live-context-bar"
          className="bg-[#FFF9EE] border border-[#F0E4CF] rounded-2xl px-3.5 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
        >
          <div className="space-y-0.5 min-w-0 flex-1">
            <div className="text-[#6E5E47] truncate">
              <span className="font-bold text-[#8C2233]">
                {locale === 'th' ? 'คำถามล่าสุดของ PAW: ' : 'Pertanyaan PAW saat ini: '}
              </span>
              <span className="font-semibold text-[#241A11]">"{aiQuestionText}"</span>
            </div>
            <div className="text-[#6E5E47]">
              <span className="font-bold text-[#2E8B69]">
                {locale === 'th' ? 'ความหมาย: ' : 'Maksud PAW: '}
              </span>
              <span className="font-semibold text-[#241A11]">"{aiQuestionTranslation}"</span>
            </div>
          </div>

          {lastUserText && lastUserText.trim().length > 0 && (
            <div className="sm:max-w-[44%] bg-[#FFF3DC] border border-[#E6A800]/35 rounded-xl px-3 py-1.5 text-[11px] text-[#6E5E47] shrink-0">
              <span className="font-bold text-[#8C6D1F] block">
                {locale === 'th' ? 'เชื่อมโยงจากคำตอบคุณ:' : 'Menyambung jawabanmu tadi:'}
              </span>
              <span className="font-semibold text-[#241A11] line-clamp-1">"{lastUserText}"</span>
            </div>
          )}
        </div>
      </div>

      {/* Grid 3 Kartu Opsi Jawaban Kontekstual Lengkap dengan Cara Baca & Arti */}
      <div
        key={`${aiQuestionText}_${lastUserText || ''}`}
        className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-3.5 fz-status-transition"
      >
        {visibleCards.map((card, index) => {
          const isEasy = card.tier === 'easy';
          const isNatural = card.tier === 'mission';

          return (
            <div
              key={`${card.id}_${index}`}
              data-testid={`beginner-reply-card-${index}`}
              className="fz-studio-subcard rounded-2xl p-4 flex flex-col justify-between gap-3.5 relative group overflow-hidden"
            >
              {/* Ornamen Garis Kiri Solar Gold / Maroon / Emerald */}
              <div
                aria-hidden="true"
                className={`absolute left-0 top-3 bottom-3 w-1 rounded-r-full ${
                  isEasy ? 'bg-[#2E8B69]' : isNatural ? 'bg-[#FFC700]' : 'bg-[#8C2233]'
                }`}
              />

              <div className="space-y-2.5 pl-2">
                {/* Baris Atas: Lencana Tingkat + Tombol Dengar */}
                <div className="flex items-center justify-between gap-1.5 flex-wrap">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                      isEasy
                        ? 'bg-[#E9F7F0] text-[#2E8B69] border-[#2E8B69]/30'
                        : isNatural
                          ? 'bg-[#FFF3C4] text-[#8C6D1F] border-[#E6A800]/40'
                          : 'bg-[#FDF2F4] text-[#8C2233] border-[#8C2233]/25'
                    }`}
                  >
                    <FiezelPawStamp className="w-3 h-3 shrink-0" />
                    <span>{locale === 'th' ? card.badgeTh : card.badgeId}</span>
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onSpeakSample(card.text, 0.85)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#FFF3DC] hover:bg-[#FFF3C4] border border-[#F0E4CF] text-[#241A11] text-[11px] font-bold cursor-pointer transition-colors"
                      title="Dengarkan cara baca kalimat ini"
                    >
                      <Volume2 className="w-3.5 h-3.5 text-[#8C2233]" />
                      <span>{locale === 'th' ? 'ฟังเสียง' : 'Dengar'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onSpeakSample(card.text, 0.72)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#FFF9EE] hover:bg-[#FFF3C4] border border-[#F0E4CF] text-[#6E5E47] text-[11px] font-mono font-bold cursor-pointer transition-colors"
                      title="Dengarkan dengan tempo lambat (0.7x)"
                    >
                      <Ear className="w-3 h-3 text-[#8C6D1F]" />
                      <span>0.7x</span>
                    </button>
                  </div>
                </div>

                {/* Label Konteks Percakapan jika tersedia */}
                {card.contextAnchorId && (
                  <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#8C6D1F]">
                    <Sparkles className="w-3 h-3 text-[#E6A800] shrink-0" />
                    <span>
                      {locale === 'th' && card.contextAnchorTh
                        ? card.contextAnchorTh
                        : card.contextAnchorId}
                    </span>
                  </div>
                )}

                {/* Kalimat Target yang Diucapkan */}
                <p
                  data-testid={index === 0 ? 'teleprompter-target-text' : undefined}
                  className="text-base sm:text-[16px] font-bold text-[#241A11] leading-snug tracking-tight break-words"
                >
                  "{card.text}"
                </p>

                {/* Panduan Cara Baca Fonetik (Warna Krem Hangat & Emas Khas FIEZEL) */}
                <div
                  data-testid={index === 0 ? 'teleprompter-pronunciation' : undefined}
                  className="bg-[#FFF9EE] border border-[#F0E4CF] fz-solar-ribbon rounded-xl px-3 py-2 text-xs text-[#241A11] break-words"
                >
                  <span className="font-bold text-[#8C2233] uppercase tracking-wider text-[10px] block mb-0.5">
                    {locale === 'th' ? 'คำอ่านออกเสียง (CARA BACA):' : '🗣️ CARA BACA (LAFAL MUDAH):'}
                  </span>
                  <span className="font-mono font-bold text-[#241A11] leading-relaxed">
                    {card.pronunciation}
                  </span>
                </div>

                {/* Arti Kalimat Bahasa Indonesia / Thailand */}
                <p
                  data-testid={index === 0 ? 'teleprompter-meaning' : undefined}
                  className="text-xs text-[#6E5E47] leading-relaxed break-words pl-0.5"
                >
                  <span className="font-bold text-[#241A11]">
                    {locale === 'th' ? 'ความหมาย: ' : '🇮🇩 Arti: '}
                  </span>
                  "{locale === 'th' ? card.hintTh : card.hintId}"
                </p>
              </div>

              {/* Tombol Aksi Taktil Khas FIEZEL */}
              <div className="pt-2.5 pl-2 border-t border-[#F7EFDF] flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onSelectForInput(card.text);
                    onStartPttWithPrompt(card.text);
                  }}
                  className={`flex-1 py-2.5 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                    isRecordingPtt
                      ? 'btn-maroon-tactile'
                      : 'bg-[#FFF3DC] hover:bg-[#FFF3C4] border border-[#F0E4CF] text-[#241A11]'
                  }`}
                  title="Salin kalimat & mulai latihan bicara dengan mikrofon"
                >
                  <Mic
                    className={`w-3.5 h-3.5 shrink-0 ${
                      isRecordingPtt ? 'text-white' : 'text-[#8C2233]'
                    }`}
                  />
                  <span>{locale === 'th' ? 'ฝึกพูด' : 'Latih Ucapkan'}</span>
                </button>

                <button
                  type="button"
                  data-testid={index === 0 ? 'teleprompter-send-btn' : undefined}
                  disabled={isAnalyzingTurn}
                  onClick={() => onSendDirect(card.text)}
                  className="flex-1 py-2.5 px-2.5 rounded-xl btn-sun-tactile text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5 shrink-0 text-[#241A11]" />
                  <span>{locale === 'th' ? 'ส่งคำตอบนี้' : 'Pakai Jawaban Ini'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
