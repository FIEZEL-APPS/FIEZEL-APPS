import React, { useEffect, useMemo, useState } from 'react';
import {
  SSW_FOCUS_STEP_EVENT,
  SSW_KNOWLEDGE_HYDRATED_EVENT,
  SSW_MASTER_KB,
  SSW_PASS_SCORE_PCT,
  type SswDrawnQuestionPayload,
  type SswGradeQuizResult,
  type SswMasterState,
  ensureSswFullKnowledgeLoaded,
  getSswHydrationStatus,
  getSswLessonStepCursor,
  getSswProgressReport,
  lookupSswMaterialAndPage,
  renderSswRubyHtml,
  updateSswLessonStepCursor,
} from '../lib/sswSenseiEngine.ts';
import {
  cleanSpacedJapanese,
  extractBeginnerGlossaryForText,
  parseSswPageLessonSteps,
} from '../lib/sswSenseiTeacher.ts';
import { wbPick } from '../lib/i18n';

export type SswWorkbenchTab = 'roadmap' | 'pdf_kotoba' | 'quiz';
export type SswQuizDrawMode = 'cbt' | 'math' | 'trap' | 'kotoba_drill' | 'mixed';

interface SswSenseiWorkbenchPanelProps {
  activeTab: SswWorkbenchTab;
  onChangeTab: (tab: SswWorkbenchTab) => void;
  state: SswMasterState;
  focusPage: number;
  drawnQuiz: SswDrawnQuestionPayload | null;
  latestGrade: SswGradeQuizResult | null;
  onSelectStage: (stageId: string, firstPageNumber?: number) => void;
  onToggleStageComplete: (stageId: string) => void;
  onSelectPage: (pageNumber: number) => void;
  onMarkPageRead: (pageNumber: number) => void;
  onToggleKotobaMastered: (kotobaId: string) => void;
  onDrawQuiz: (mode: SswQuizDrawMode, topicTag?: string) => void;
  onAnswerQuiz: (quizId: string, choiceLetter: string) => void;
  onAskSensei?: (promptText: string) => void;
  onResetProgress?: () => void;
}

function parseStartPage(pdfPagesRange: string): number {
  const m = String(pdfPagesRange || '').match(/(\d{1,2})/);
  if (!m) return 1;
  const n = parseInt(m[1], 10);
  return n >= 1 && n <= SSW_MASTER_KB.meta.totalPdfPages ? n : 1;
}

export const SswSenseiWorkbenchPanel: React.FC<SswSenseiWorkbenchPanelProps> = ({
  activeTab,
  onChangeTab,
  state,
  focusPage,
  drawnQuiz,
  latestGrade,
  onSelectStage,
  onToggleStageComplete,
  onSelectPage,
  onMarkPageRead,
  onToggleKotobaMastered,
  onDrawQuiz,
  onAnswerQuiz,
  onAskSensei,
  onResetProgress,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [hideFurigana, setHideFurigana] = useState(false);
  const [showGoldenNumbers, setShowGoldenNumbers] = useState(false);
  const [showFormulas, setShowFormulas] = useState(false);
  const [hydrationEpoch, setHydrationEpoch] = useState(0);
  const [stepCursorEpoch, setStepCursorEpoch] = useState(0);

  useEffect(() => {
    let alive = true;
    const onHydrated = () => {
      if (alive) setHydrationEpoch((n) => n + 1);
    };
    const onStepUpdated = () => {
      if (alive) setStepCursorEpoch((n) => n + 1);
    };
    window.addEventListener(SSW_KNOWLEDGE_HYDRATED_EVENT, onHydrated);
    window.addEventListener(SSW_FOCUS_STEP_EVENT, onStepUpdated);
    void ensureSswFullKnowledgeLoaded().then(() => {
      if (alive) setHydrationEpoch((n) => n + 1);
    });
    return () => {
      alive = false;
      window.removeEventListener(SSW_KNOWLEDGE_HYDRATED_EVENT, onHydrated);
      window.removeEventListener(SSW_FOCUS_STEP_EVENT, onStepUpdated);
    };
  }, []);

  const hydration = useMemo(() => getSswHydrationStatus(), [hydrationEpoch]);
  const progress = useMemo(() => getSswProgressReport(), [state, hydrationEpoch, stepCursorEpoch]);
  const totalPages = SSW_MASTER_KB.meta.totalPdfPages || 91;
  const clampedPage = Math.max(1, Math.min(totalPages, Math.round(focusPage || 1)));

  const pageDetail = useMemo(
    () => lookupSswMaterialAndPage({ pageNumber: clampedPage }),
    [clampedPage, hydrationEpoch]
  );

  const pageSteps = useMemo(() => {
    if (pageDetail.mode !== 'exact_page' || !pageDetail.page) return [];
    return parseSswPageLessonSteps(pageDetail.page);
  }, [pageDetail]);

  const savedCursor = useMemo(() => {
    return state.lessonStepCursor || getSswLessonStepCursor();
  }, [state, stepCursorEpoch]);

  const activeStepNumber = useMemo(() => {
    if (pageSteps.length === 0) return 1;
    if (savedCursor && savedCursor.page === clampedPage) {
      return Math.max(1, Math.min(pageSteps.length, savedCursor.stepIndex || 1));
    }
    return 1;
  }, [savedCursor, clampedPage, pageSteps.length]);

  const completedStepsOnPage = useMemo(() => {
    const arr = savedCursor?.completedStepsByPage?.[String(clampedPage)] || [];
    return new Set(Array.isArray(arr) ? arr : []);
  }, [savedCursor, clampedPage]);

  const activeStepObj = useMemo(() => {
    if (pageSteps.length === 0) return null;
    return pageSteps.find((st) => st.stepNumber === activeStepNumber) || pageSteps[0];
  }, [pageSteps, activeStepNumber]);

  const searchResult = useMemo(() => {
    const q = searchQuery.trim();
    if (!q) return null;
    return lookupSswMaterialAndPage({ query: q });
  }, [searchQuery, hydrationEpoch]);

  const completedSet = useMemo(() => new Set(state.completedStageIds), [state.completedStageIds]);
  const pagesReadSet = useMemo(() => new Set(state.pdfPagesRead), [state.pdfPagesRead]);
  const masteredKotobaSet = useMemo(() => new Set(state.kotobaMasteredIds), [state.kotobaMasteredIds]);

  const readiness = state.readinessScorePct;
  const isPassReady = readiness >= SSW_PASS_SCORE_PCT;

  const jumpToPageAndStep = (targetPage: number, targetStep = 1) => {
    const safePage = Math.max(1, Math.min(totalPages, Math.round(targetPage || 1)));
    updateSswLessonStepCursor({ page: safePage, stepIndex: targetStep });
    setStepCursorEpoch((n) => n + 1);
    onSelectPage(safePage);
  };

  return (
    <section
      data-testid="ssw-sensei-workbench"
      data-hydrated={hydration.hydrated && hydration.corpusHydrated ? 'true' : 'false'}
      data-chunks={String(hydration.chunksCount || 0)}
      className="w-full rounded-2xl border border-[#E4D8C4] bg-[#FDFAF5] text-[#1C1611] shadow-[0_14px_34px_rgba(28,22,17,0.08)] overflow-hidden"
    >
      {/* Top Status Header - Clean Beginner Friendly Hierarchy */}
      <div className="px-4 py-3.5 bg-[#F6EFE2] border-b border-[#E4D8C4] space-y-2.5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-[#8C2233] text-white px-2.5 py-0.5 text-[11px] font-black tracking-wide">
                SSW SENSEI
              </span>
              <span className="text-sm font-black text-[#1C1611]">
                Panduan SSW Pengolahan Makanan
              </span>
              <span className="inline-flex items-center rounded-full bg-white border border-[#DECFAF] px-2 py-0.5 text-[10.5px] font-bold text-[#6E4912]">
                {progress.isZeroProgress ? wbPick('Start from Scratch', 'Mulai dari Nol') : wbPick('In Progress', 'Sedang Berjalan')}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-[#5B4B3A] font-semibold">
              <span className="px-2 py-0.5 rounded-md bg-white/90 border border-[#E5DAC6]">
                {wbPick('Pages:', 'Materi:')} <strong className="text-[#1C1611]">{state.pdfPagesRead.length}/{totalPages} {wbPick('Pg', 'Hal')}</strong>
              </span>
              <span className="px-2 py-0.5 rounded-md bg-white/90 border border-[#E5DAC6]">
                {wbPick('Vocab:', 'Kosakata:')} <strong className="text-[#1C1611]">{state.kotobaMasteredIds.length}/{SSW_MASTER_KB.meta.totalKotoba}</strong>
              </span>
              <span className="px-2 py-0.5 rounded-md bg-white/90 border border-[#E5DAC6]">
                {wbPick('Correct:', 'Latihan Benar:')} <strong className="text-[#1C1611]">{progress.totalQuizCorrect}/{progress.totalQuizAttempted}</strong>
              </span>
              {!hydration.hydrated && (
                <span className="text-[#8C2233] font-bold">{wbPick('Loading full material...', 'Memuat materi lengkap...')}</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <div className="text-right">
              <div className="flex items-center justify-end gap-1.5">
                <span className="text-[11px] font-bold text-[#6B5A48]">{wbPick('Exam Readiness:', 'Kesiapan Ujian:')}</span>
                <span
                  data-testid="ssw-readiness-pct"
                  className={`text-base font-black ${isPassReady ? 'text-emerald-700' : 'text-[#8C2233]'}`}
                >
                  {readiness}%
                </span>
                <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-white border border-[#DECFAF] text-[#5B4B3A]">
                  {wbPick('Pass', 'Lulus')} {SSW_PASS_SCORE_PCT}%
                </span>
              </div>
              <div className="relative w-44 h-2.5 mt-1 rounded-full bg-[#E8DEC9] overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${isPassReady ? 'bg-emerald-600' : 'bg-[#8C2233]'}`}
                  style={{ width: `${Math.max(5, readiness)}%` }}
                />
                <div
                  title={`${wbPick('Pass threshold', 'Batas Lulus')} ${SSW_PASS_SCORE_PCT}%`}
                  className="absolute top-0 bottom-0 w-0.5 bg-[#1C1611]/70"
                  style={{ left: `${SSW_PASS_SCORE_PCT}%` }}
                />
              </div>
            </div>

            {onResetProgress && (
              <button
                type="button"
                onClick={() => {
                  onResetProgress();
                  updateSswLessonStepCursor({ page: 1, stepIndex: 1 });
                  setStepCursorEpoch((n) => n + 1);
                }}
                title={wbPick('Reset SSW study progress to 0%', 'Reset progres belajar SSW ke 0%')}
                className="px-2.5 py-1.5 rounded-lg border border-[#D8CAB3] bg-white hover:bg-[#EFE6D5] text-[11px] font-bold text-[#6B5A48] transition cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Live Synced Current Focus Strip - Keeps Student Oriented 100% */}
        <div
          data-testid="ssw-active-step-banner"
          className="rounded-xl bg-white border border-[#E2D4BC] px-3 py-2 flex flex-wrap items-center justify-between gap-2"
        >
          <div className="min-w-0 flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#8C2233]/10 text-[#8C2233] text-[11px] font-black shrink-0">
              {wbPick('Active Spot', 'Posisi Belajar')}
            </span>
            <p className="text-xs font-bold text-[#1C1611] leading-snug break-words">
              {wbPick('Page', 'Hal.')} {clampedPage}
              {pageSteps.length > 0
                ? ` · ${wbPick('Step', 'Langkah')} ${activeStepNumber} ${wbPick('of', 'dari')} ${pageSteps.length}: ${cleanSpacedJapanese(activeStepObj?.title || '')}`
                : pageDetail.page?.title
                ? ` · ${cleanSpacedJapanese(pageDetail.page.title)}`
                : ''}
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {activeTab !== 'pdf_kotoba' && (
              <button
                type="button"
                onClick={() => {
                  jumpToPageAndStep(clampedPage, activeStepNumber);
                  onChangeTab('pdf_kotoba');
                }}
                className="px-2.5 py-1 rounded-lg bg-[#8C2233] hover:bg-[#741A29] text-white text-[11px] font-extrabold transition cursor-pointer"
              >
                Lihat Langkah Ini
              </button>
            )}
            {onAskSensei && (
              <button
                type="button"
                onClick={() =>
                  onAskSensei(
                    `Sensei, tolong ajarkan pelan-pelan dari nol halaman ${clampedPage} langkah ${activeStepNumber}${
                      activeStepObj?.title ? ` (${cleanSpacedJapanese(activeStepObj.title)})` : ''
                    }.`
                  )
                }
                className="px-2.5 py-1 rounded-lg border border-[#8C2233] text-[#8C2233] hover:bg-[#8C2233]/10 text-[11px] font-extrabold transition cursor-pointer"
              >
                Minta Sensei Jelaskan
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3 Primary Tabs - Clean Plain Language */}
      <div className="grid grid-cols-3 border-b border-[#E4D8C4] bg-[#FAF4E8]">
        <button
          type="button"
          data-testid="ssw-tab-roadmap"
          onClick={() => onChangeTab('roadmap')}
          className={`py-3 px-2 text-xs sm:text-[13px] font-extrabold border-b-2 transition cursor-pointer ${
            activeTab === 'roadmap'
              ? 'border-[#8C2233] text-[#8C2233] bg-[#FDFAF5]'
              : 'border-transparent text-[#6B5A48] hover:text-[#1C1611]'
          }`}
        >
          1. Alur Belajar ({state.completedStageIds.length}/{SSW_MASTER_KB.roadmapStages.length})
        </button>
        <button
          type="button"
          data-testid="ssw-tab-pdf"
          onClick={() => onChangeTab('pdf_kotoba')}
          className={`py-3 px-2 text-xs sm:text-[13px] font-extrabold border-b-2 transition cursor-pointer ${
            activeTab === 'pdf_kotoba'
              ? 'border-[#8C2233] text-[#8C2233] bg-[#FDFAF5]'
              : 'border-transparent text-[#6B5A48] hover:text-[#1C1611]'
          }`}
        >
          2. Materi (Hal. {clampedPage}/{totalPages})
        </button>
        <button
          type="button"
          data-testid="ssw-tab-quiz"
          onClick={() => onChangeTab('quiz')}
          className={`py-3 px-2 text-xs sm:text-[13px] font-extrabold border-b-2 transition cursor-pointer ${
            activeTab === 'quiz'
              ? 'border-[#8C2233] text-[#8C2233] bg-[#FDFAF5]'
              : 'border-transparent text-[#6B5A48] hover:text-[#1C1611]'
          }`}
        >
          3. Latihan Soal
        </button>
      </div>

      {/* Tab Body */}
      <div className="p-4 sm:p-5 max-h-[620px] overflow-y-auto space-y-4">
        {/* TAB 1: ALUR BELAJAR */}
        {activeTab === 'roadmap' && (
          <div className="space-y-4">
            {/* Beginner / Recommended Next Action Hero Card */}
            <div className="rounded-2xl border border-[#DECFAF] bg-[#FFF8EB] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
              <div className="space-y-1.5 min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-[#8C2233] text-white">
                    {progress.isZeroProgress ? 'MULAI DARI SINI (PEMULA NOL)' : 'TAHAP AKTIF SEKARANG'}
                  </span>
                  <span className="text-xs font-bold text-[#8C2233]">
                    {progress.recommendedStage.pdfPages}
                  </span>
                </div>
                <p className="text-[15px] font-black text-[#1C1611]">
                  Tahap {progress.recommendedStage.stage}: {progress.recommendedStage.title}
                </p>
                <p className="text-[13px] text-[#3F3326] leading-relaxed">
                  {progress.recommendedStage.goal}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    const startP = parseStartPage(progress.recommendedStage.pdfPages);
                    onSelectStage(progress.recommendedStage.id, startP);
                    jumpToPageAndStep(startP, 1);
                    onChangeTab('pdf_kotoba');
                  }}
                  className="px-4 py-2 rounded-xl bg-[#8C2233] hover:bg-[#741A29] text-white text-xs sm:text-[13px] font-extrabold shadow-sm transition cursor-pointer"
                >
                  Buka Hal. {parseStartPage(progress.recommendedStage.pdfPages)} &amp; Mulai
                </button>
                {onAskSensei && (
                  <button
                    type="button"
                    onClick={() =>
                      onAskSensei(
                        `Sensei, aku masih pemula nol. Tolong jelaskan pelan-pelan Tahap ${progress.recommendedStage.stage}: ${progress.recommendedStage.title} (${progress.recommendedStage.pdfPages}) dari langkah pertama.`
                      )
                    }
                    className="px-3.5 py-2 rounded-xl border border-[#8C2233] bg-white text-[#8C2233] hover:bg-[#8C2233]/10 text-xs sm:text-[13px] font-extrabold transition cursor-pointer"
                  >
                    Tanya Sensei
                  </button>
                )}
              </div>
            </div>

            {/* Weak Topics Alert */}
            {state.weakTopics.length > 0 && (
              <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-3.5">
                <p className="text-xs font-black text-rose-800 mb-2">
                  Topik yang Masih Perlu Diulang (Klik untuk Latihan Soal):
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {state.weakTopics.map((topic) => (
                    <button
                      key={topic}
                      type="button"
                      onClick={() => {
                        onDrawQuiz('mixed', topic);
                        onChangeTab('quiz');
                      }}
                      className="px-3 py-1 rounded-full bg-white border border-rose-300 hover:bg-rose-100 text-xs font-bold text-rose-900 transition cursor-pointer"
                    >
                      Latih: {topic}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 8 Roadmap Stages Grid */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs font-black uppercase tracking-wider text-[#6B5A48]">
                  Urutan Belajar dari Dasar Sampai Siap Ujian (8 Tahap)
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {SSW_MASTER_KB.roadmapStages.map((st) => {
                  const isDone = completedSet.has(st.id);
                  const isActive = state.activeStageId === st.id;
                  const firstP = parseStartPage(st.pdfPages);
                  return (
                    <div
                      key={st.id}
                      data-testid={`ssw-stage-${st.id}`}
                      className={`rounded-xl border p-3.5 transition ${
                        isDone
                          ? 'border-emerald-300 bg-emerald-50/60'
                          : isActive
                          ? 'border-[#8C2233] bg-white shadow-sm'
                          : 'border-[#E6DAC5] bg-white hover:border-[#CBB89D]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className={`text-[11px] font-black px-2 py-0.5 rounded-full ${
                                isDone
                                  ? 'bg-emerald-600 text-white'
                                  : isActive
                                  ? 'bg-[#8C2233] text-white'
                                  : 'bg-[#EDE3D2] text-[#4E4032]'
                              }`}
                            >
                              Tahap {st.stage}
                            </span>
                            <span className="text-xs font-extrabold text-[#8C2233]">
                              {st.pdfPages}
                            </span>
                          </div>
                          <p className="text-[13px] font-black text-[#1C1611] mt-1">{st.title}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => onToggleStageComplete(st.id)}
                          className={`shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-extrabold border transition cursor-pointer ${
                            isDone
                              ? 'bg-emerald-600 border-emerald-600 text-white'
                              : 'bg-[#FAF4E8] border-[#D8CAB3] text-[#4E4032] hover:bg-[#EFE6D5]'
                          }`}
                        >
                          {isDone ? wbPick('Done ✓', 'Selesai ✓') : wbPick('Mark Done', 'Tandai Lulus')}
                        </button>
                      </div>
                      <p className="text-xs text-[#4E4032] mt-1.5 leading-relaxed">{st.goal}</p>
                      <div className="mt-2.5 flex items-start justify-between gap-2 pt-2 border-t border-[#F0E6D5]">
                        <span className="min-w-0 flex-1 text-[11px] font-semibold leading-snug text-[#7A6855]">
                          {st.otaffRef}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            onSelectStage(st.id, firstP);
                            jumpToPageAndStep(firstP, 1);
                            onChangeTab('pdf_kotoba');
                          }}
                          className="text-xs font-extrabold text-[#8C2233] hover:underline shrink-0 cursor-pointer"
                        >
                          {wbPick('Open Page', 'Buka Hal.')} {firstP} -&gt;
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 13 Golden Numbers Drawer (Closed by Default so Tab 1 Stays Calm) */}
            <div className="rounded-xl border border-[#E4D8C4] bg-white overflow-hidden">
              <button
                type="button"
                onClick={() => setShowGoldenNumbers((v) => !v)}
                className="w-full px-4 py-3 flex items-center justify-between bg-[#F7F1E5] text-xs font-black text-[#1C1611] cursor-pointer"
              >
                <span>{wbPick('13 Must-Know Exam Numbers Summary (Tap to Open)', 'Ringkasan 13 Angka Wajib Hafal Ujian (Klik untuk Buka)')}</span>
                <span className="text-xs text-[#8C2233]">
                  {showGoldenNumbers ? wbPick('Hide', 'Sembunyikan') : wbPick('View 13 Numbers', 'Lihat 13 Angka')}
                </span>
              </button>
              {showGoldenNumbers && (
                <div className="p-3.5 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {SSW_MASTER_KB.goldenNumbers.map((gn, idx) => (
                    <button
                      key={`${gn.label}_${idx}`}
                      type="button"
                      onClick={() => {
                        jumpToPageAndStep(gn.pdfPage, 1);
                        onChangeTab('pdf_kotoba');
                      }}
                      className="text-left rounded-xl border border-[#EAE0CF] hover:border-[#8C2233] bg-[#FDFAF5] p-3 transition cursor-pointer"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-extrabold text-[#6B5A48]">{gn.label}</span>
                        <span className="text-[10.5px] font-black px-2 py-0.5 rounded bg-[#EDE3D2] text-[#1C1611]">
                          {wbPick('Pg.', 'Hal.')} {gn.pdfPage}
                        </span>
                      </div>
                      <p className="text-[13px] font-black text-[#8C2233] mt-1">{gn.value}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: MATERI LANGKAH DEMI LANGKAH (HAL. 1-91) */}
        {activeTab === 'pdf_kotoba' && (
          <div className="space-y-4">
            {/* Search & Clean Page Controls */}
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                data-testid="ssw-pdf-search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={wbPick('Search topic or keyword (e.g., allergy, chlorine, page 27)...', 'Cari topik atau kata kunci (misal: alergi, klorin, kurumi, hal 27)...')}
                className="flex-1 min-w-[200px] px-3.5 py-2 rounded-xl border border-[#D8CAB3] bg-white text-[13px] text-[#1C1611] focus:outline-none focus:border-[#8C2233]"
              />
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  data-testid="ssw-page-prev"
                  onClick={() => jumpToPageAndStep(Math.max(1, clampedPage - 1), 1)}
                  disabled={clampedPage <= 1}
                  className="px-3 py-2 rounded-xl border border-[#D8CAB3] bg-white disabled:opacity-40 text-xs font-black cursor-pointer"
                >
                  &lt; Prev
                </button>
                <span className="text-xs font-black px-3 py-2 rounded-xl bg-[#EFE6D5] text-[#1C1611]">
                  Hal. {clampedPage} / {totalPages}
                </span>
                <button
                  type="button"
                  data-testid="ssw-page-next"
                  onClick={() => jumpToPageAndStep(Math.min(totalPages, clampedPage + 1), 1)}
                  disabled={clampedPage >= totalPages}
                  className="px-3 py-2 rounded-xl border border-[#D8CAB3] bg-white disabled:opacity-40 text-xs font-black cursor-pointer"
                >
                  Next &gt;
                </button>
              </div>
              <button
                type="button"
                data-testid="ssw-toggle-furigana"
                onClick={() => setHideFurigana((v) => !v)}
                className="px-3 py-2 rounded-xl border border-[#D8CAB3] bg-white hover:bg-[#FAF4E8] text-xs font-extrabold text-[#4E4032] cursor-pointer"
              >
                {hideFurigana ? 'Tampilkan Cara Baca (Furigana)' : 'Sembunyikan Cara Baca (Furigana)'}
              </button>
            </div>

            {/* Quick Search Matches */}
            {searchResult && searchResult.mode === 'search' && (
              <div className="rounded-xl border border-amber-300 bg-amber-50/70 p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-black text-amber-900">
                    Hasil Pencarian &quot;{searchQuery}&quot; ({searchResult.totalMatches} temuan)
                  </p>
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="text-xs font-bold text-[#8C2233] cursor-pointer"
                  >
                    Tutup Hasil
                  </button>
                </div>
                {searchResult.matchedPages.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {searchResult.matchedPages.map((mp) => (
                      <button
                        key={mp.page}
                        type="button"
                        onClick={() => {
                          jumpToPageAndStep(mp.page, 1);
                          setSearchQuery('');
                        }}
                        className="px-3 py-1.5 rounded-lg bg-white border border-amber-300 hover:border-[#8C2233] text-xs font-bold text-[#1C1611] cursor-pointer"
                      >
                        Hal. {mp.page}: {cleanSpacedJapanese(mp.title)}
                      </button>
                    ))}
                  </div>
                )}
                {searchResult.matchedTraps.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    {searchResult.matchedTraps.map((t) => (
                      <div key={t.id} className="rounded-lg bg-white border border-rose-200 p-2.5 text-xs">
                        <span className="font-black text-[#8C2233]">Jebakan (Hal. {t.pdfPage}): {t.title} - </span>
                        <span className="text-[#3C3024]">{t.detail}</span>
                      </div>
                    ))}
                  </div>
                )}
                {searchResult.matchedVideos && searchResult.matchedVideos.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <p className="text-xs font-black text-[#8C2233]">
                      Rujukan Penjelasan Video ({searchResult.matchedVideos.length}):
                    </p>
                    {searchResult.matchedVideos.map((vid) => (
                      <div key={vid.videoId} className="rounded-lg bg-white border border-[#E2D4BC] p-2.5 text-xs space-y-1">
                        <div className="flex flex-wrap items-center justify-between gap-1">
                          <span className="font-black text-[#1C1611]">
                            [{vid.channel}] {vid.title}
                          </span>
                          {vid.pdfPagesSuggested.length > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                jumpToPageAndStep(vid.pdfPagesSuggested[0], 1);
                                setSearchQuery('');
                              }}
                              className="text-xs font-bold text-[#8C2233] hover:underline cursor-pointer"
                            >
                              Buka Hal. {vid.pdfPagesSuggested.join(', ')}
                            </button>
                          )}
                        </div>
                        {vid.keyPoints.length > 0 ? (
                          <p className="text-[#4E4032]">{vid.keyPoints.slice(0, 2).join(' | ')}</p>
                        ) : vid.excerpt ? (
                          <p className="text-[#4E4032] line-clamp-2">{vid.excerpt}</p>
                        ) : null}
                      </div>
                    ))}
                    {searchResult.matchedTranscriptQuotes && searchResult.matchedTranscriptQuotes.length > 0 && (
                      <div className="space-y-1 pt-1">
                        <p className="text-[11px] font-black uppercase tracking-wide text-[#7A6855]">
                          Kutipan Transkrip Video ({searchResult.matchedTranscriptQuotes.length}):
                        </p>
                        {searchResult.matchedTranscriptQuotes.slice(0, 3).map((tq) => (
                          <div key={tq.chunkId} className="rounded-lg bg-[#FDFAF5] border border-[#E6DAC5] p-2.5 text-xs">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-bold text-[#8C2233]">{tq.channel}</span>
                              {tq.url && (
                                <a
                                  href={tq.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[11px] font-extrabold text-sky-700 hover:underline"
                                >
                                  Tonton YouTube
                                </a>
                              )}
                            </div>
                            <p className="text-[#3C3024] mt-0.5 line-clamp-3">&quot;{tq.text}&quot;</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Page Dossier Card - Guided Sequential Micro-Steps */}
            {pageDetail.mode === 'exact_page' && pageDetail.page && (
              <div className="rounded-2xl border border-[#E2D4BC] bg-white p-4 sm:p-5 space-y-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="px-2.5 py-0.5 rounded-full bg-[#1C1611] text-white text-[11px] font-black">
                        Hal. {pageDetail.page.page}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-[#EFE6D5] text-[#4E4032] text-[11px] font-extrabold">
                        {cleanSpacedJapanese(pageDetail.page.unit)}
                      </span>
                      {pageSteps.length > 0 && (
                        <span className="px-2.5 py-0.5 rounded-full bg-[#8C2233]/10 text-[#8C2233] text-[11px] font-extrabold">
                          {pageSteps.length} Langkah Belajar
                        </span>
                      )}
                    </div>
                    <h4 data-testid="ssw-pdf-page-title" className="text-base sm:text-lg font-black text-[#1C1611] leading-snug">
                      {cleanSpacedJapanese(pageDetail.page.title)}
                    </h4>
                  </div>

                  <button
                    type="button"
                    data-testid="ssw-mark-page-read"
                    onClick={() => onMarkPageRead(clampedPage)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-extrabold border transition cursor-pointer shrink-0 ${
                      pagesReadSet.has(clampedPage)
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : 'bg-[#FAF4E8] border-[#D8CAB3] text-[#1C1611] hover:bg-[#EFE6D5]'
                    }`}
                  >
                    {pagesReadSet.has(clampedPage) ? wbPick('Page Completed ✓', 'Halaman Selesai ✓') : wbPick('Mark Page Complete', 'Tandai Halaman Selesai')}
                  </button>
                </div>

                {/* Simple Beginner Compass */}
                <div className="rounded-xl bg-[#FFF8EC] border border-[#F0DEC0] px-3.5 py-2.5 space-y-0.5">
                  <p className="text-[11px] font-black uppercase tracking-wider text-[#8C5B18]">
                    {wbPick('Key Takeaway on This Page', 'Inti Halaman Ini')}
                  </p>
                  <p className="text-[13px] text-[#3B280D] font-bold leading-relaxed">
                    {cleanSpacedJapanese(pageDetail.page.focusCompass)}
                  </p>
                </div>

                {/* Step-by-Step Guided Cards (Replaces Dense Unreadable Summary Wall) */}
                {pageSteps.length > 0 ? (
                  <div className="space-y-3">
                    {pageSteps.map((step) => {
                      const isCurrentStep = step.stepNumber === activeStepNumber;
                      const isStepDone = completedStepsOnPage.has(step.stepNumber);
                      const cleanContent = cleanSpacedJapanese(step.content);
                      const glossaryTerms = isCurrentStep
                        ? extractBeginnerGlossaryForText(`${step.title} ${cleanContent}`, 4)
                        : [];

                      return (
                        <div
                          key={`step_${clampedPage}_${step.stepNumber}`}
                          data-testid={`ssw-step-card-${step.stepNumber}`}
                          data-active={isCurrentStep ? 'true' : 'false'}
                          className={`rounded-2xl border p-4 space-y-3 transition ${
                            isCurrentStep
                              ? 'border-[#8C2233] bg-[#FFFDF9] shadow-[0_6px_20px_rgba(140,34,51,0.08)]'
                              : isStepDone
                              ? 'border-emerald-300 bg-emerald-50/40'
                              : 'border-[#E6DAC5] bg-[#FAF7F0]/70 hover:border-[#CBB89D]'
                          }`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span
                                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                                  isCurrentStep
                                    ? 'bg-[#8C2233] text-white'
                                    : isStepDone
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-[#E5DAC6] text-[#4E4032]'
                                }`}
                              >
                                {isStepDone && !isCurrentStep ? '✓' : step.stepNumber}
                              </span>
                              <div className="min-w-0">
                                <h5 className="text-sm font-black text-[#1C1611] leading-snug">
                                  {wbPick('Step', 'Langkah')} {step.stepNumber}: {cleanSpacedJapanese(step.title)}
                                </h5>
                              </div>
                            </div>

                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[11px] font-black shrink-0 ${
                                isCurrentStep
                                  ? 'bg-[#8C2233] text-white'
                                  : isStepDone
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : 'bg-white text-[#6B5A48] border border-[#E0D3BC]'
                              }`}
                            >
                              {isCurrentStep
                                ? wbPick('Active', 'Sedang Dibahas')
                                : isStepDone
                                ? wbPick('Understood', 'Sudah Paham')
                                : wbPick('Next Step', 'Langkah Berikutnya')}
                            </span>
                          </div>

                          <p className="text-[13.5px] sm:text-sm text-[#241C14] leading-relaxed whitespace-pre-line">
                            {cleanContent}
                          </p>

                          {/* Beginner Jargon Translator for Active Step */}
                          {isCurrentStep && glossaryTerms.length > 0 && (
                            <div
                              data-testid="ssw-beginner-glossary"
                              className="rounded-xl bg-[#F6EFE2] border border-[#E4D8C4] p-3 space-y-1.5"
                            >
                              <p className="text-[11px] font-black uppercase tracking-wider text-[#6E4912]">
                                Arti Istilah Penting (Biar Nggak Bingung):
                              </p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {glossaryTerms.map((g) => (
                                  <div
                                    key={g.term}
                                    className="rounded-lg bg-white border border-[#E5DAC6] px-2.5 py-2 text-xs leading-snug"
                                  >
                                    <span className="font-black text-[#8C2233]">{g.term}: </span>
                                    <span className="text-[#3C3024] font-medium">{g.simpleMeaningId}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Beginner Clear Step Actions */}
                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            {onAskSensei && (
                              <button
                                type="button"
                                data-testid="ssw-step-ask-btn"
                                onClick={() => {
                                  jumpToPageAndStep(clampedPage, step.stepNumber);
                                  onAskSensei(
                                    `Sensei, aku masih awam. Tolong jelaskan pelan-pelan Hal. ${clampedPage} Langkah ${step.stepNumber} (${cleanSpacedJapanese(
                                      step.title
                                    )}) pakai bahasa sederhana dan contoh nyata.`
                                  );
                                }}
                                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                                  isCurrentStep
                                    ? 'bg-[#1C1611] hover:bg-[#332920] text-white'
                                    : 'border border-[#D8CAB3] bg-white hover:bg-[#EFE6D5] text-[#1C1611]'
                                }`}
                              >
                                {isCurrentStep ? 'Jelaskan Pelan-pelan Lewat Suara' : 'Fokus & Bahas Langkah Ini'}
                              </button>
                            )}

                            {isCurrentStep && (
                              <button
                                type="button"
                                data-testid="ssw-step-complete-next-btn"
                                onClick={() => {
                                  const nextNum = step.stepNumber + 1;
                                  if (nextNum <= pageSteps.length) {
                                    updateSswLessonStepCursor({
                                      page: clampedPage,
                                      stepIndex: nextNum,
                                      markStepCompleted: step.stepNumber,
                                    });
                                    setStepCursorEpoch((n) => n + 1);
                                    if (onAskSensei) {
                                      const nextStepObj = pageSteps.find((s) => s.stepNumber === nextNum);
                                      onAskSensei(
                                        `Oke Sensei, Langkah ${step.stepNumber} sudah paham! Lanjut jelaskan Langkah ${nextNum}: ${cleanSpacedJapanese(
                                          nextStepObj?.title || ''
                                        )} di Hal. ${clampedPage}.`
                                      );
                                    }
                                  } else {
                                    updateSswLessonStepCursor({
                                      page: clampedPage,
                                      stepIndex: step.stepNumber,
                                      markStepCompleted: step.stepNumber,
                                    });
                                    onMarkPageRead(clampedPage);
                                    if (clampedPage < totalPages) {
                                      const nextPage = clampedPage + 1;
                                      jumpToPageAndStep(nextPage, 1);
                                      if (onAskSensei) {
                                        onAskSensei(
                                          `Sensei, semua langkah di Hal. ${clampedPage} sudah selesai aku pahami! Sekarang kita pindah pelan-pelan ke Hal. ${nextPage} Langkah 1.`
                                        );
                                      }
                                    }
                                    setStepCursorEpoch((n) => n + 1);
                                  }
                                }}
                                className="px-3.5 py-1.5 rounded-xl bg-[#8C2233] hover:bg-[#741A29] text-white text-xs font-extrabold shadow-xs transition cursor-pointer"
                              >
                                {step.stepNumber < pageSteps.length
                                  ? wbPick(`Got it, Next Step ${step.stepNumber + 1} ->`, `Paham, Lanjut ke Langkah ${step.stepNumber + 1} ->`)
                                  : clampedPage < totalPages
                                  ? wbPick(`Finish Page ${clampedPage}, Open Page ${clampedPage + 1} ->`, `Selesai Hal. ${clampedPage}, Buka Hal. ${clampedPage + 1} ->`)
                                  : wbPick('Complete Final Step ✓', 'Tandai Langkah Terakhir Selesai ✓')}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-[13.5px] text-[#2F261D] leading-relaxed whitespace-pre-line">
                    {cleanSpacedJapanese(pageDetail.page.summary)}
                  </p>
                )}

                {/* Page Traps & Formulas Callout */}
                {pageDetail.trapsOnPage.map((tr) => (
                  <div key={tr.id} className="rounded-xl border border-rose-200 bg-rose-50/70 p-3.5 space-y-1">
                    <p className="text-xs font-black text-rose-900">
                      {wbPick('Exam Trap Alert:', 'Hati-hati Jebakan Ujian:')} {tr.title}
                    </p>
                    <p className="text-[13px] text-rose-950 leading-relaxed">{tr.detail}</p>
                  </div>
                ))}

                {pageDetail.mathOnPage.map((mf) => (
                  <div key={mf.id} className="rounded-xl border border-sky-200 bg-sky-50/70 p-3.5 space-y-1">
                    <p className="text-xs font-black text-sky-900">{wbPick('Exam Calculation Formula:', 'Rumus Hitungan Ujian:')} {mf.name}</p>
                    <p className="text-[13px] font-mono font-bold text-sky-950">{mf.formula}</p>
                    <p className="text-xs text-sky-900 leading-relaxed">{mf.rule}</p>
                  </div>
                ))}

                {pageDetail.videosOnPage && pageDetail.videosOnPage.length > 0 && (
                  <div className="rounded-xl border border-[#DFD2BC] bg-[#FAF4E8] p-3.5 space-y-2">
                    <p className="text-xs font-black text-[#1C1611]">
                      {wbPick(`Video Notes for Page ${clampedPage}:`, `Catatan Video Pembahasan Halaman ${clampedPage}:`)}
                    </p>
                    {pageDetail.videosOnPage.map((vid) => (
                      <div key={vid.videoId} className="rounded-lg bg-white border border-[#E6DAC5] p-2.5 text-xs space-y-1">
                        <p className="font-black text-[#8C2233]">
                          [{vid.channel}] {vid.title}
                        </p>
                        {vid.keyPoints.length > 0 ? (
                          <p className="text-[#3C3024] leading-relaxed">{vid.keyPoints.slice(0, 2).join(' | ')}</p>
                        ) : (
                          vid.excerpt && <p className="text-[#4E4032] leading-relaxed">{vid.excerpt}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Kotoba List for Current Page (or matched search) */}
            <div className="space-y-2.5">
              <h5 className="text-xs font-black uppercase tracking-wider text-[#6B5A48]">
                {searchResult && searchResult.mode === 'search' && searchResult.matchedKotoba.length > 0
                  ? wbPick(`Matching Vocabulary (${searchResult.matchedKotoba.length})`, `Kosakata Cocok Pencarian (${searchResult.matchedKotoba.length})`)
                  : wbPick(
                      `Key Vocabulary on Page ${clampedPage} (${pageDetail.mode === 'exact_page' ? pageDetail.kotobaOnPage.length : 0})`,
                      `Kosakata Penting di Halaman ${clampedPage} (${pageDetail.mode === 'exact_page' ? pageDetail.kotobaOnPage.length : 0})`
                    )}
              </h5>

              {(() => {
                const list =
                  searchResult && searchResult.mode === 'search' && searchResult.matchedKotoba.length > 0
                    ? searchResult.matchedKotoba
                    : pageDetail.mode === 'exact_page'
                    ? pageDetail.kotobaOnPage
                    : [];
                if (list.length === 0) {
                  return (
                    <div className="rounded-xl border border-dashed border-[#D8CAB3] p-3.5 text-xs text-[#6B5A48]">
                      Halaman ini fokus menjelaskan konsep atau contoh soal. Tekan Next untuk melihat kosakata di halaman berikutnya.
                    </div>
                  );
                }
                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {list.map((k) => {
                      const isMastered = masteredKotobaSet.has(k.id);
                      return (
                        <div
                          key={k.id}
                          className={`rounded-xl border p-3.5 flex items-start justify-between gap-2.5 ${
                            isMastered ? 'border-emerald-300 bg-emerald-50/50' : 'border-[#E6DAC5] bg-white'
                          }`}
                        >
                          <div className="min-w-0 space-y-1">
                            <div
                              data-testid="ssw-kotoba-ruby"
                              className="text-base font-black text-[#1C1611] leading-snug"
                              dangerouslySetInnerHTML={{
                                __html: renderSswRubyHtml(k.rubyMarkup || k.jp, hideFurigana),
                              }}
                            />
                            <p className="text-xs font-bold text-[#8C2233]">
                              {k.romaji} <span className="text-[#7A6855] font-normal">({k.reading})</span>
                            </p>
                            <p className="text-[13px] font-semibold text-[#2F261D]">{k.meaningId}</p>
                            <span className="inline-block text-[10.5px] font-bold px-2 py-0.5 rounded bg-[#F5EDE0] text-[#5B4B3A]">
                              {k.category} | Hal. {k.pdfPage}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => onToggleKotobaMastered(k.id)}
                            className={`shrink-0 px-2.5 py-1.5 rounded-lg text-[11px] font-extrabold border cursor-pointer ${
                              isMastered
                                ? 'bg-emerald-600 border-emerald-600 text-white'
                                : 'bg-[#FAF4E8] border-[#D8CAB3] text-[#4E4032] hover:bg-[#EFE6D5]'
                            }`}
                          >
                            {isMastered ? 'Hafal ✓' : 'Tandai Hafal'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* TAB 3: LATIHAN SOAL & HITUNG */}
        {activeTab === 'quiz' && (
          <div className="space-y-4">
            {/* Quiz Mode Toolbar */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                data-testid="ssw-draw-cbt"
                onClick={() => onDrawQuiz('cbt')}
                className="px-3.5 py-2 rounded-xl bg-[#8C2233] hover:bg-[#741A29] text-white text-xs font-extrabold shadow-sm cursor-pointer"
              >
                Soal Cerita Ujian
              </button>
              <button
                type="button"
                data-testid="ssw-draw-math"
                onClick={() => onDrawQuiz('math')}
                className="px-3.5 py-2 rounded-xl bg-[#1C1611] hover:bg-[#332920] text-white text-xs font-extrabold cursor-pointer"
              >
                Latihan Hitungan
              </button>
              <button
                type="button"
                data-testid="ssw-draw-trap"
                onClick={() => onDrawQuiz('trap')}
                className="px-3.5 py-2 rounded-xl border border-[#8C2233] text-[#8C2233] hover:bg-[#8C2233]/10 text-xs font-extrabold cursor-pointer"
              >
                Soal Jebakan Ujian
              </button>
              <button
                type="button"
                data-testid="ssw-draw-kotoba"
                onClick={() => onDrawQuiz('kotoba_drill')}
                className="px-3.5 py-2 rounded-xl border border-[#D8CAB3] bg-white hover:bg-[#EFE6D5] text-xs font-extrabold text-[#1C1611] cursor-pointer"
              >
                {wbPick('Vocab Drill', 'Tebak Kosakata')}
              </button>
              <button
                type="button"
                onClick={() => setShowFormulas((v) => !v)}
                className="ml-auto px-3 py-2 rounded-xl border border-sky-300 bg-sky-50 text-sky-900 text-xs font-extrabold cursor-pointer"
              >
                {showFormulas ? wbPick('Hide 5 Formulas', 'Tutup 5 Rumus') : wbPick('Open 5 Calculation Formulas', 'Buka 5 Rumus Hitung')}
              </button>
            </div>

            {/* 5 Mandatory Formulas Drawer */}
            {showFormulas && (
              <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-3.5 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {SSW_MASTER_KB.mathFormulas.map((mf) => (
                  <div key={mf.id} className="rounded-lg bg-white border border-sky-200 p-3 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-black text-sky-950">{mf.name}</span>
                      <button
                        type="button"
                        onClick={() => {
                          jumpToPageAndStep(mf.pdfPage, 1);
                          onChangeTab('pdf_kotoba');
                        }}
                        className="text-xs font-bold text-[#8C2233] hover:underline cursor-pointer"
                      >
                        Hal. {mf.pdfPage}
                      </button>
                    </div>
                    <p className="text-xs font-mono font-bold text-[#8C2233]">{mf.formula}</p>
                    <p className="text-xs text-[#4E4032] leading-relaxed">{mf.rule}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Active Quiz Question Card */}
            {drawnQuiz ? (
              <div
                data-testid="ssw-quiz-card"
                className="rounded-2xl border border-[#E2D4BC] bg-white p-4 sm:p-5 space-y-3.5 shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-full bg-[#8C2233] text-white text-[11px] font-black">
                      Soal #{drawnQuiz.n} ({drawnQuiz.quizId})
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-[#EFE6D5] text-[#4E4032] text-[11px] font-extrabold">
                      {drawnQuiz.tag}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-[#6B5A48]">
                    Tryout Hal. {drawnQuiz.tryoutPdfPage} | Pembahasan Hal. {drawnQuiz.discussionPdfPage}
                  </span>
                </div>

                {/* Japanese Question with Furigana Ruby + Indonesian */}
                <div className="rounded-xl bg-[#FAF5EC] border border-[#E8DEC9] p-4 space-y-2">
                  <div
                    className="text-base font-black text-[#1C1611] leading-relaxed"
                    dangerouslySetInnerHTML={{
                      __html: renderSswRubyHtml(drawnQuiz.questionRuby || drawnQuiz.questionJp, hideFurigana),
                    }}
                  />
                  {drawnQuiz.questionReading && (
                    <p className="text-xs font-bold text-[#8C2233]">{drawnQuiz.questionReading}</p>
                  )}
                  <p className="text-[13.5px] font-semibold text-[#3B2F23] leading-relaxed">
                    {drawnQuiz.questionId}
                  </p>
                </div>

                {/* Interactive Answer Choices A / B / C */}
                <div className="space-y-2.5">
                  {drawnQuiz.options.map((opt) => {
                    const isThisQuizGraded = latestGrade && latestGrade.quizId === drawnQuiz.quizId;
                    const isSelected = isThisQuizGraded && latestGrade.selectedIndex === opt.index;
                    const isCorrectOpt = isThisQuizGraded && latestGrade.correctIndex === opt.index;

                    let cardStyle = 'border-[#E0D3BC] bg-[#FDFAF5] hover:border-[#8C2233] hover:bg-[#FFF9F2]';
                    if (isThisQuizGraded) {
                      if (isCorrectOpt) {
                        cardStyle = 'border-emerald-500 bg-emerald-50';
                      } else if (isSelected && !latestGrade.ok) {
                        cardStyle = 'border-rose-500 bg-rose-50';
                      }
                    }

                    return (
                      <button
                        key={opt.letter}
                        type="button"
                        data-testid={`ssw-quiz-opt-${opt.letter}`}
                        onClick={() => onAnswerQuiz(drawnQuiz.quizId, opt.letter)}
                        className={`w-full text-left rounded-xl border p-3.5 flex items-start gap-3 transition cursor-pointer ${cardStyle}`}
                      >
                        <span
                          className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${
                            isThisQuizGraded && isCorrectOpt
                              ? 'bg-emerald-600 text-white'
                              : isThisQuizGraded && isSelected && !latestGrade.ok
                              ? 'bg-rose-600 text-white'
                              : 'bg-[#1C1611] text-white'
                          }`}
                        >
                          {opt.letter}
                        </span>
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <div
                            className="text-sm font-black text-[#1C1611]"
                            dangerouslySetInnerHTML={{
                              __html: renderSswRubyHtml(opt.ruby || opt.jp, hideFurigana),
                            }}
                          />
                          {opt.reading && (
                            <p className="text-xs font-semibold text-[#8C2233]">{opt.reading}</p>
                          )}
                          <p className="text-[13px] text-[#4E4032]">{opt.id}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Grading Result Feedback */}
                {latestGrade && latestGrade.quizId === drawnQuiz.quizId && (
                  <div
                    data-testid="ssw-quiz-grade-feedback"
                    className={`rounded-xl border p-4 space-y-2.5 ${
                      latestGrade.ok
                        ? 'border-emerald-300 bg-emerald-50'
                        : 'border-rose-300 bg-rose-50'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span
                        className={`text-[13px] font-black ${
                          latestGrade.ok ? 'text-emerald-800' : 'text-rose-800'
                        }`}
                      >
                        {latestGrade.ok
                          ? `BENAR! Pilihan ${latestGrade.correctLetter} tepat.`
                          : `BELUM TEPAT. Kamu memilih ${latestGrade.selectedLetter || latestGrade.userAnswer}, jawaban benar adalah ${latestGrade.correctLetter} (${latestGrade.correctAnswerId}).`}
                      </span>
                      <span className="text-xs font-black text-[#1C1611]">
                        Kesiapan: {latestGrade.readinessScorePct}% (Target {latestGrade.passingThresholdPct}%)
                      </span>
                    </div>
                    {latestGrade.selectedRationaleId && (
                      <p
                        data-testid="ssw-quiz-selected-rationale"
                        className="text-xs font-bold text-[#1C1611] bg-white/85 rounded-lg px-3 py-2 border border-black/10 leading-relaxed"
                      >
                        Alasan pilihan {latestGrade.selectedLetter}: {latestGrade.selectedRationaleId}
                      </p>
                    )}
                    <p className="text-[13px] text-[#2F261D] leading-relaxed">
                      {latestGrade.explanationId}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        type="button"
                        data-testid="ssw-open-discussion-page"
                        onClick={() => {
                          jumpToPageAndStep(latestGrade.discussionPdfPage, 1);
                          onChangeTab('pdf_kotoba');
                        }}
                        className="px-3.5 py-2 rounded-xl bg-[#1C1611] hover:bg-[#332920] text-white text-xs font-extrabold cursor-pointer"
                      >
                        Lihat Penjelasan di Hal. {latestGrade.discussionPdfPage}
                      </button>
                      <button
                        type="button"
                        onClick={() => onDrawQuiz((drawnQuiz.mode as SswQuizDrawMode) || 'mixed')}
                        className="px-3.5 py-2 rounded-xl bg-[#8C2233] hover:bg-[#741A29] text-white text-xs font-extrabold cursor-pointer"
                      >
                        Soal Berikutnya -&gt;
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-[#D8CAB3] bg-white p-6 text-center space-y-3">
                <p className="text-[15px] font-black text-[#1C1611]">
                  Siap Coba Latihan Soal SSW Pengolahan Makanan?
                </p>
                <p className="text-[13px] text-[#6B5A48] max-w-lg mx-auto leading-relaxed">
                  Pilih jenis latihan di atas atau minta Sensei lewat suara. Setiap soal dilengkapi pembahasan sederhana dan halaman materi terkait.
                </p>
                <button
                  type="button"
                  onClick={() => onDrawQuiz('mixed')}
                  className="px-4 py-2.5 rounded-xl bg-[#8C2233] text-white text-xs sm:text-[13px] font-extrabold cursor-pointer"
                >
                  Mulai 1 Soal Sekarang
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};
