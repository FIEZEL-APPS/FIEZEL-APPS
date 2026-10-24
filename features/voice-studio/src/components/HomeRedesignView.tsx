import React, { useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Compass,
  Flame,
  Headphones,
  MessageSquare,
  Phone,
  Volume2,
  X,
  CheckCircle2,
  Unlock,
  Play,
} from 'lucide-react';
import {
  BraincoreStoreState,
  CallScenario,
  LearnerLocale,
  TargetLang,
} from '../types/voiceCall';
import { checkPrerequisiteStatus } from '../lib/braincore';
import {
  FiezelCornerOrnament,
  FiezelNeuralConstellation,
  FiezelPawStamp,
  FiezelSparkleOrnament,
} from './FiezelOrnaments';

interface HomeRedesignViewProps {
  locale: LearnerLocale;
  targetLang: TargetLang;
  braincore: BraincoreStoreState;
  scenariosForLang: CallScenario[];
  activeScenario: CallScenario;
  currentMasteryP: number;
  onSelectScenarioAndCall: (scenarioId: string) => void;
  onOpenBraincore: () => void;
  onUnlockScenarioPrereq: (scenario: CallScenario) => void;
  onSpeakSample: (text: string) => void;
}

type ActiveHomeStudio = 'none' | 'vocab' | 'grammar' | 'shadowing';
type ScenarioFilter = 'all' | 'daily' | 'academic';

export const HomeRedesignView: React.FC<HomeRedesignViewProps> = ({
  locale,
  targetLang,
  braincore,
  scenariosForLang,
  activeScenario,
  currentMasteryP,
  onSelectScenarioAndCall,
  onOpenBraincore,
  onUnlockScenarioPrereq,
  onSpeakSample,
}) => {
  const [activeStudio, setActiveStudio] = useState<ActiveHomeStudio>('none');
  const [scenarioFilter, setScenarioFilter] = useState<ScenarioFilter>('all');
  const [showPawDock, setShowPawDock] = useState<boolean>(true);

  const dailyGoal = 5;
  const totalAttempts = (braincore.speakingHistory || []).length;
  const completedToday = Math.min(totalAttempts, dailyGoal);
  const remainingToday = Math.max(0, dailyGoal - completedToday);
  const ringRadius = 24;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringProgress = (completedToday / dailyGoal) * ringCircumference;
  const streakDays = Math.max(3, Math.min(30, 3 + Math.floor(totalAttempts / 2)));

  const totalVocabCount = scenariosForLang.reduce(
    (acc, s) => acc + s.vocabPrereqs.length,
    0
  );

  const filteredScenarios = scenariosForLang.filter((scen) => {
    if (scenarioFilter === 'all') return true;
    if (scenarioFilter === 'daily') {
      return scen.id.includes('cafe') || scen.id.includes('konbini') || scen.id.includes('station');
    }
    return (
      scen.id.includes('opinion') ||
      scen.id.includes('weekend') ||
      scen.id.includes('intro') ||
      scen.id.includes('hometown')
    );
  });

  const langLabel =
    targetLang === 'en'
      ? locale === 'th'
        ? 'ภาษาอังกฤษ · English Studio'
        : 'Bahasa Inggris · English Studio'
      : locale === 'th'
        ? 'ภาษาญี่ปุ่น · Japanese Studio'
        : 'Bahasa Jepang · Japanese Studio';

  const activeGrammarFocus =
    locale === 'th'
      ? activeScenario.competencyNameTh
      : activeScenario.competencyNameId;

  return (
    <div className="space-y-6 pb-20 relative" data-testid="home-redesign-view">
      {/* 1. SAPAAN EDITORIAL & RITME HARIAN KHAS FIEZEL */}
      <section
        className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch"
        aria-label="Sapaan dan Ritme Harian"
      >
        <div className="lg:col-span-7 fz-studio-card rounded-3xl p-6 flex flex-col justify-between gap-4 relative overflow-hidden">
          <FiezelCornerOrnament className="absolute -right-2 -top-2 w-28 h-28 opacity-80" />
          <div className="space-y-2 relative z-10">
            <div className="fz-badge-paw">
              <FiezelPawStamp className="w-3.5 h-3.5 text-[#8C2233]" />
              <span>{langLabel}</span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#241A11] leading-tight tracking-tight">
              {locale === 'th'
                ? 'พร้อมฝึกพูดกับ Mochi วันนี้หรือยัง?'
                : 'Siap Bicara Lebih Lancar Bersama Mochi?'}
            </h1>
            <p className="text-sm text-[#6E5E47] leading-relaxed">
              {locale === 'th'
                ? 'ฝึกสนทนาจริงกับ Mochi พร้อมคำแปลเรียลไทม์และตัวช่วยตอบสำหรับผู้เริ่มต้น'
                : 'Latihan telepon interaktif bersama Mochi dilengkapi terjemahan langsung, panduan cara baca, dan evaluasi Braincore.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1 relative z-10">
            <button
              type="button"
              onClick={() => setScenarioFilter('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                scenarioFilter === 'all'
                  ? 'btn-maroon-tactile'
                  : 'bg-[#FFF3DC] text-[#6E5E47] hover:text-[#241A11] border border-[#F0E4CF]'
              }`}
            >
              {locale === 'th' ? 'ทั้งหมด' : 'Semua Jalur'}
            </button>
            <button
              type="button"
              onClick={() => setScenarioFilter('daily')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                scenarioFilter === 'daily'
                  ? 'btn-maroon-tactile'
                  : 'bg-[#FFF3DC] text-[#6E5E47] hover:text-[#241A11] border border-[#F0E4CF]'
              }`}
            >
              {locale === 'th' ? 'ชีวิตประจำวัน' : 'Percakapan Harian'}
            </button>
            <button
              type="button"
              onClick={() => setScenarioFilter('academic')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                scenarioFilter === 'academic'
                  ? 'btn-maroon-tactile'
                  : 'bg-[#FFF3DC] text-[#6E5E47] hover:text-[#241A11] border border-[#F0E4CF]'
              }`}
            >
              {locale === 'th' ? 'เรียนและงาน' : 'Perkenalan & Opini'}
            </button>
          </div>
        </div>

        {/* Kartu Ritme Harian & Runtun (Streak) */}
        <div className="lg:col-span-5 fz-studio-card rounded-3xl p-6 flex flex-col justify-between gap-4 relative overflow-hidden">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3.5">
              <div
                className="relative w-14 h-14 shrink-0"
                role="img"
                aria-label={`${completedToday} dari ${dailyGoal} target bicara hari ini`}
              >
                <svg viewBox="0 0 56 56" className="w-14 h-14 -rotate-90" aria-hidden="true">
                  <circle
                    cx="28"
                    cy="28"
                    r={ringRadius}
                    fill="none"
                    stroke="#F0E4CF"
                    strokeWidth="6"
                  />
                  <circle
                    cx="28"
                    cy="28"
                    r={ringRadius}
                    fill="none"
                    stroke="#FFC700"
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray={`${ringProgress.toFixed(1)} ${ringCircumference.toFixed(1)}`}
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-xs font-bold font-mono tabular-nums text-[#241A11]">
                  {completedToday}/{dailyGoal}
                </span>
              </div>

              <div>
                <div className="text-sm font-bold text-[#241A11]">
                  {locale === 'th' ? 'เป้าหมายการพูดวันนี้' : 'Target Bicara Harian'}
                </div>
                <p className="text-xs text-[#6E5E47] mt-0.5 leading-snug">
                  {remainingToday > 0
                    ? locale === 'th'
                      ? `อีก ${remainingToday} รอบเพื่อรักษาจังหวะ`
                      : `${remainingToday} giliran bicara lagi hari ini`
                    : locale === 'th'
                      ? 'บรรลุเป้าหมายวันนี้แล้ว!'
                      : 'Target harian telah tercapai!'}
                </p>
              </div>
            </div>

            <div className="shrink-0 flex flex-col items-center bg-[#FFF3C4] border border-[#E6A800]/40 rounded-2xl px-3.5 py-2">
              <span className="flex items-center gap-1 text-base font-bold font-mono tabular-nums text-[#241A11]">
                <Flame className="w-4 h-4 text-[#8C2233] fill-[#FFC700]" />
                <span>{streakDays}</span>
              </span>
              <span className="text-[11px] font-bold text-[#8C6D1F]">
                {locale === 'th' ? 'วันต่อเนื่อง' : 'Hari Runtun'}
              </span>
            </div>
          </div>

          <div className="pt-3 border-t border-[#F0E4CF] flex items-center justify-between text-xs">
            <span className="text-[#6E5E47] font-semibold">
              {locale === 'th' ? 'ความแม่นยำเฉลี่ย (Braincore)' : 'Penguasaan Aktif (Braincore)'}
            </span>
            <span className="font-mono font-bold text-[#8C2233] tabular-nums">
              {Math.round(currentMasteryP * 100)}% Mastery
            </span>
          </div>
        </div>
      </section>

      {/* 2. KARTU HERO REKOMENDASI PAW (Solar Gold + Maroon + Neural Constellation Ornament) */}
      <section
        aria-label="Lanjut belajar"
        data-testid="home-bright-mind-card"
        className="relative overflow-hidden rounded-3xl p-6 sm:p-7 bg-gradient-to-br from-[#FFF3C4] via-[#FFF9EE] to-[#FFF3DC] border-2 border-[#FFC700] text-[#241A11] shadow-[0_16px_40px_-12px_rgba(230,168,0,0.28)]"
      >
        <FiezelNeuralConstellation
          className="absolute inset-0 w-full h-full"
          strokeColor="#E6A800"
          opacity={0.35}
        />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 flex-1 min-w-0">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#8C2233] text-[#FFFBF3] text-xs font-bold tracking-wide shadow-xs">
              <FiezelSparkleOrnament className="w-4 h-4" />
              <span>
                {locale === 'th'
                  ? `แนะนำโดย Mochi · ระดับ ${activeScenario.level}`
                  : `Pilihan Utama Mochi · Level ${activeScenario.level}`}
              </span>
            </div>

            <h2 className="font-display text-xl sm:text-2xl font-bold text-[#241A11] leading-snug">
              {locale === 'th' ? activeScenario.titleTh : activeScenario.titleId}
            </h2>

            <p className="text-sm text-[#6E5E47] leading-relaxed max-w-2xl">
              {locale === 'th' ? activeScenario.situationTh : activeScenario.situationId}
            </p>

            {/* Preview Pertanyaan Pembuka Mochi */}
            <div className="inline-flex flex-wrap items-center gap-2 bg-white/90 border border-[#F0E4CF] fz-solar-ribbon rounded-2xl px-3.5 py-2 text-xs text-[#241A11] shadow-2xs">
              <span className="font-bold text-[#8C2233]">Pertanyaan Pembuka Mochi:</span>
              <span className="font-semibold italic">"{activeScenario.openingLine}"</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row md:flex-col items-stretch sm:items-center md:items-end gap-3 shrink-0">
            <div className="hidden md:flex items-center gap-3 bg-white/95 border border-[#F0E4CF] rounded-2xl p-2.5 pr-4 shadow-xs">
              <img
                src="./assets/brand/paw-mochi-speaking.svg"
                alt="Mochi"
                className="w-14 h-14 rounded-xl bg-[#FFF3C4] p-1 object-contain border border-[#FFC700]"
              />
              <div>
                <div className="text-xs font-bold text-[#241A11]">Mochi si Teman Bicara</div>
                <div className="text-[11px] text-[#2E8B69] font-bold">
                  ● Siap Telepon & Bantu Jawab
                </div>
              </div>
            </div>

            <button
              type="button"
              data-testid="home-resume-call-btn"
              onClick={() => onSelectScenarioAndCall(activeScenario.id)}
              className="px-6 py-3.5 rounded-2xl btn-maroon-tactile font-bold text-sm flex items-center justify-center gap-2.5 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-[#FFC700] text-[#FFC700]" />
              <span>
                {locale === 'th' ? 'เริ่มคุยกับ Mochi ตอนนี้' : 'Mulai Telepon Bersama Mochi'}
              </span>
              <ArrowRight className="w-4 h-4 text-[#FFC700]" />
            </button>
          </div>
        </div>
      </section>

      {/* 3. STUDIO FOKUS HARI INI (4 Kartu Taktil Khas FIEZEL) */}
      <section aria-label="Pilih fokus" className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="fz-solar-ribbon pl-3">
            <h2 className="text-base sm:text-lg font-bold text-[#241A11]">
              {locale === 'th' ? 'สตูดิโอฝึกทักษะเสริม' : 'Pilih Fokus Hari Ini'}
            </h2>
            <p className="text-xs text-[#6E5E47]">
              {locale === 'th'
                ? 'ทบทวนคำศัพท์และรูปประโยคก่อนเริ่มโทรจริง'
                : 'Pelajari kosakata kunci atau dengarkan contoh pelafalan sebelum telepon dimulai'}
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenBraincore}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-[#F0E4CF] hover:border-[#FFC700] text-xs font-bold text-[#8C2233] cursor-pointer shadow-2xs"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>{locale === 'th' ? 'ดูแผนที่การเรียน' : 'Peta Braincore'}</span>
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button
            type="button"
            onClick={() => onSelectScenarioAndCall(activeScenario.id)}
            className="fz-studio-subcard rounded-2xl p-4 text-left flex flex-col justify-between min-h-[126px] cursor-pointer group"
          >
            <span className="w-11 h-11 rounded-xl bg-[#E9F7F0] border border-[#2E8B69]/25 flex items-center justify-center text-[#2E8B69] group-hover:scale-105 transition-transform">
              <Phone className="w-5 h-5" />
            </span>
            <div className="mt-3">
              <div className="text-sm font-bold text-[#241A11]">Telepon Live AI</div>
              <div className="text-xs text-[#6E5E47] mt-0.5">
                {scenariosForLang.length} skenario aktif
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveStudio(activeStudio === 'vocab' ? 'none' : 'vocab')}
            className={`fz-studio-subcard rounded-2xl p-4 text-left flex flex-col justify-between min-h-[126px] cursor-pointer group ${
              activeStudio === 'vocab' ? 'ring-2 ring-[#FFC700] bg-[#FFF3C4]/40' : ''
            }`}
          >
            <span className="w-11 h-11 rounded-xl bg-[#FFF3C4] border border-[#E6A800]/35 flex items-center justify-center text-[#8C6D1F] group-hover:scale-105 transition-transform">
              <BookOpen className="w-5 h-5" />
            </span>
            <div className="mt-3">
              <div className="text-sm font-bold text-[#241A11]">Vocabulary</div>
              <div className="text-xs text-[#6E5E47] mt-0.5">
                {totalVocabCount} kata inti prasyarat
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveStudio(activeStudio === 'grammar' ? 'none' : 'grammar')}
            className={`fz-studio-subcard rounded-2xl p-4 text-left flex flex-col justify-between min-h-[126px] cursor-pointer group ${
              activeStudio === 'grammar' ? 'ring-2 ring-[#FFC700] bg-[#FFF3C4]/40' : ''
            }`}
          >
            <span className="w-11 h-11 rounded-xl bg-[#FDF2F4] border border-[#8C2233]/25 flex items-center justify-center text-[#8C2233] group-hover:scale-105 transition-transform">
              <MessageSquare className="w-5 h-5" />
            </span>
            <div className="mt-3">
              <div className="text-sm font-bold text-[#241A11]">Grammar</div>
              <div className="text-xs text-[#6E5E47] mt-0.5">{activeGrammarFocus}</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveStudio(activeStudio === 'shadowing' ? 'none' : 'shadowing')}
            className={`fz-studio-subcard rounded-2xl p-4 text-left flex flex-col justify-between min-h-[126px] cursor-pointer group ${
              activeStudio === 'shadowing' ? 'ring-2 ring-[#FFC700] bg-[#FFF3C4]/40' : ''
            }`}
          >
            <span className="w-11 h-11 rounded-xl bg-[#FFF3DC] border border-[#D8B36B] flex items-center justify-center text-[#8C2233] group-hover:scale-105 transition-transform">
              <Headphones className="w-5 h-5" />
            </span>
            <div className="mt-3">
              <div className="text-sm font-bold text-[#241A11]">Shadowing Suara</div>
              <div className="text-xs text-[#6E5E47] mt-0.5">Dengar & tirukan lafal Mochi</div>
            </div>
          </button>
        </div>
      </section>

      {/* PANEL STUDIO INTERAKTIF (VOCAB / GRAMMAR / SHADOWING) */}
      {activeStudio !== 'none' && (
        <section
          data-testid="home-interactive-studio"
          className="fz-studio-card rounded-3xl p-5 sm:p-6 space-y-4 border-2 border-[#FFC700]"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#8C2233]">
                {activeStudio === 'vocab'
                  ? 'STUDIO KOSAKATA PRASYARAT'
                  : activeStudio === 'grammar'
                    ? 'STUDIO POLA TATA BAHASA'
                    : 'STUDIO SHADOWING PELAFALAN'}
              </div>
              <h3 className="text-base font-bold text-[#241A11]">
                {locale === 'th' ? activeScenario.titleTh : activeScenario.titleId}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setActiveStudio('none')}
              className="w-9 h-9 rounded-xl bg-[#FFF3DC] hover:bg-[#FFF3C4] flex items-center justify-center text-[#241A11] cursor-pointer"
              aria-label="Tutup studio"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {activeStudio === 'vocab' && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {activeScenario.vocabPrereqs.map((v) => (
                  <div
                    key={v.id}
                    className="bg-[#FFF9EE] border border-[#F0E4CF] rounded-2xl p-3.5 flex items-center justify-between gap-2"
                  >
                    <div>
                      <div className="text-sm font-bold text-[#241A11]">{v.term}</div>
                      <div className="text-xs text-[#6E5E47] mt-0.5">
                        {locale === 'th' ? v.meaningTh : v.meaningId}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onSpeakSample(v.term)}
                      className="w-9 h-9 rounded-xl bg-white border border-[#F0E4CF] hover:border-[#FFC700] text-[#8C2233] flex items-center justify-center shrink-0 cursor-pointer"
                      aria-label={`Dengarkan ${v.term}`}
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => onUnlockScenarioPrereq(activeScenario)}
                  className="px-4 py-2.5 rounded-xl bg-[#FFF3DC] hover:bg-[#FFF3C4] border border-[#F0E4CF] text-xs font-bold text-[#241A11] flex items-center gap-1.5 cursor-pointer"
                >
                  <Unlock className="w-3.5 h-3.5 text-[#2E8B69]" />
                  <span>Tandai Kosakata Dikuasai (Braincore BKT)</span>
                </button>
                <button
                  type="button"
                  onClick={() => onSelectScenarioAndCall(activeScenario.id)}
                  className="px-4 py-2.5 rounded-xl btn-sun-tactile text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Latih di Panggilan AI</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {activeStudio === 'grammar' && (
            <div className="space-y-3">
              <div className="bg-[#FFF3C4]/60 border border-[#F0E4CF] fz-solar-ribbon rounded-2xl p-4 space-y-1.5">
                <div className="text-xs font-bold text-[#8C2233]">
                  Fokus Kompetensi: {activeGrammarFocus}
                </div>
                <p className="text-sm text-[#241A11] leading-relaxed">
                  {(locale === 'th'
                    ? activeScenario.missionGoalsTh
                    : activeScenario.missionGoalsId
                  ).join(' · ')}
                </p>
              </div>
              <div className="space-y-2">
                <div className="text-xs font-semibold text-[#6E5E47]">
                  Klik kalimat di bawah untuk mendengar pelafalan natural:
                </div>
                {activeScenario.sampleUtterances
                  .filter((s) => s.intent === 'accurate')
                  .concat(activeScenario.sampleUtterances.slice(0, 2))
                  .slice(0, 2)
                  .map((samp, idx) => (
                    <button
                      key={`${samp.text}-${idx}`}
                      type="button"
                      onClick={() => onSpeakSample(samp.text)}
                      className="w-full text-left bg-[#FFF9EE] hover:bg-[#FFF3C4]/60 border border-[#F0E4CF] rounded-2xl p-3.5 flex items-center justify-between gap-3 cursor-pointer transition-colors"
                    >
                      <span className="text-sm font-semibold text-[#241A11]">"{samp.text}"</span>
                      <Volume2 className="w-4 h-4 text-[#8C2233] shrink-0" />
                    </button>
                  ))}
              </div>
            </div>
          )}

          {activeStudio === 'shadowing' && (
            <div className="bg-[#FFF9EE] border border-[#F0E4CF] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="text-xs font-bold text-[#8C2233]">Kalimat Pembuka Mochi</div>
                <p className="text-base font-bold text-[#241A11]">
                  "{activeScenario.openingLine}"
                </p>
                <p className="text-xs text-[#6E5E47]">
                  {locale === 'th'
                    ? activeScenario.openingTranslationTh
                    : activeScenario.openingTranslationId}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onSpeakSample(activeScenario.openingLine)}
                className="px-4 py-2.5 rounded-xl btn-sun-tactile text-xs font-bold flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
              >
                <Volume2 className="w-4 h-4" />
                <span>Dengarkan Lafal</span>
              </button>
            </div>
          )}
        </section>
      )}

      {/* 4. JALUR SKENARIO PERCAKAPAN */}
      <section aria-label="Jalur skenario percakapan" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-bold text-[#241A11] fz-solar-ribbon pl-3">
            {locale === 'th' ? 'เลือกสถานการณ์สนทนา' : 'Jalur Skenario Percakapan'}
          </h2>
          <span className="text-xs font-bold text-[#6E5E47]">
            {filteredScenarios.length} skenario tersedia
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredScenarios.map((scen) => {
            const pStatus = checkPrerequisiteStatus(braincore, scen.prereqCompetencyId);
            const scenComp = braincore.competencies[scen.competencyId];
            const scenMastery = Math.round(
              ((scenComp?.pMasteryDecayed ?? scenComp?.pMastery) ?? 0.65) * 100
            );
            const isSelected = scen.id === activeScenario.id;

            return (
              <div
                key={scen.id}
                className={`fz-studio-subcard rounded-3xl p-5 flex flex-col justify-between gap-4 ${
                  isSelected ? 'ring-2 ring-[#FFC700] bg-[#FFF3C4]/25' : ''
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="fz-badge-paw">
                      <FiezelPawStamp className="w-3 h-3 text-[#8C2233]" />
                      <span>{scen.level}</span>
                      <span>·</span>
                      <span>{locale === 'th' ? scen.competencyNameTh : scen.competencyNameId}</span>
                    </span>
                    <span className="font-mono tabular-nums font-bold text-[#8C2233]">
                      {scenMastery}% Mastery
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-[#241A11]">
                    {locale === 'th' ? scen.titleTh : scen.titleId}
                  </h3>

                  <p className="text-xs text-[#6E5E47] line-clamp-2 leading-relaxed">
                    {locale === 'th' ? scen.situationTh : scen.situationId}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-[#F7EFDF]">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#2E8B69]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#2E8B69]" />
                    <span>
                      {pStatus.isReady
                        ? locale === 'th'
                          ? 'พร้อมสนทนา'
                          : 'Siap Bicara'
                        : locale === 'th'
                          ? 'ต้องทบทวนคำศัพท์'
                          : 'Prasyarat Kosakata'}
                    </span>
                  </span>

                  <button
                    type="button"
                    onClick={() => onSelectScenarioAndCall(scen.id)}
                    className="px-4 py-2 rounded-xl btn-sun-tactile text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>{locale === 'th' ? 'เริ่มโทร' : 'Mulai Bicara'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 5. DOCK MASKOT MOCHI RESMI */}
      {showPawDock && (
        <aside
          aria-label="Maskot Mochi"
          data-testid="home-paw-dock"
          className="fixed right-4 bottom-20 sm:bottom-6 z-40 w-20 h-20 bg-[#FFF9EE] border-2 border-[#FFC700] rounded-3xl shadow-xl flex items-center justify-center"
        >
          <button
            type="button"
            onClick={() => setShowPawDock(false)}
            aria-label="Sembunyikan maskot"
            className="absolute -top-2.5 -left-2.5 w-7 h-7 rounded-full bg-white border border-[#F0E4CF] shadow-xs flex items-center justify-center text-[#241A11] cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onSelectScenarioAndCall(activeScenario.id)}
            title="Langsung bicara dengan Mochi"
            className="w-14 h-14 cursor-pointer hover:scale-105 transition-transform"
          >
            <img
              src="./assets/brand/paw-mochi-idle.svg"
              alt="Mochi"
              className="w-full h-full object-contain"
            />
          </button>
        </aside>
      )}
    </div>
  );
};
