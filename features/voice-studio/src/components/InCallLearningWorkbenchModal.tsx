import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  LearnerLocale,
  TargetLang,
  CallScenario,
  VoicePersona,
  VoiceUiAction,
} from '../types/voiceCall';
import { type PteDiagnosticSpeechResult } from '../lib/braincore';
import { type SpeechAlignmentResult } from '../lib/speechAlignment';
import { playFiezelSfx } from '../lib/sfx';
import { wbPick } from '../lib/i18n';
import { JapaneseRubyDisplay } from './JapaneseRubyDisplay';
import { resolveUnifiedPronunciation, translateAndPhoneticizeLiveText } from '../lib/liveCallHelper';
import { containsHanzi } from '../lib/mandarinPhonetics';
import {
  SSW_MASTER_KB,
  SSW_FOCUS_PAGE_EVENT,
  SSW_FOCUS_STEP_EVENT,
  SSW_KNOWLEDGE_HYDRATED_EVENT,
  SSW_STATE_UPDATED_EVENT,
  ensureSswFullKnowledgeLoaded,
  type SswDrawnQuestionPayload,
  type SswGradeQuizResult,
  type SswKotobaItem,
  drawSswQuizQuestionAsync,
  getSswLessonStepCursor,
  getSswProgressReport,
  gradeSswQuizAnswerAsync,
  lookupSswMaterialAndPageAsync,
  renderSswRubyHtml,
  updateSswLessonStepCursor,
} from '../lib/sswSenseiEngine';
import {
  advanceSswLessonStep,
  cleanSpacedJapanese,
  extractBeginnerGlossaryForText,
  getStructuredPagePlan,
  getWakaiPapaTacticalInsightsForPage,
} from '../lib/sswSenseiTeacher';
import { LiveWhiteboardCanvas, type PenColor } from './LiveWhiteboardCanvas';
import { WhiteboardErrorBoundary } from './WhiteboardErrorBoundary';
import {
  buildCohesiveBoardNarrationScript,
  buildWhiteboardScenePlan,
  computeProsodicTextWeight,
  computeProsodicWordWeight,
  splitTtsIntoSentenceChunks,
  type SourceMaterialPage,
  type StudentBoardQuestion,
  type WhiteboardFollowUpContext,
} from '../lib/whiteboardDirector';
import {
  ensureKanjiStrokesLoaded,
  resolveKakijunRequestFromPrompt,
  subscribeKanjiVgUpdates,
} from '../data/kakijunStrokeBank';
import { pruneTtsMemoryCache, sanitizeSpokenTextForClassicTts, synthesizeFlexibleTts } from '../lib/liveTransport';
import { wbPick, wbFmt } from '../lib/i18n';
import {
  decodeAudioDataSafe,
  ensureGlobalGestureUnlockListener,
  getSharedBoardAudioContext,
  isMobileLowMemoryDevice,
  playHtmlAudioBounded,
  resumeAudioContextBounded,
  subscribeBoardAudioUnlock,
  unlockSharedBoardAudioContext,
} from '../lib/boardAudioUnlock';
import {
  alignWordsToSpeech,
  locateWordAt,
  processSpeechBuffer,
  type SpeechAlignment,
} from '../lib/speechAlignment';

/** Padding aman minimal tanpa WSOLA atau pemotongan kata. */
const BOARD_SPEECH_PROCESSING = { edgePadSec: 0.08 } as const;
import {
  PTE_DESCRIBE_IMAGE_BANK,
  PteDescribeImageQuestion,
  PteChartCategory,
  getPteQuestionById,
  getPteQuestionsByCategory,
  getRandomPteQuestion,
} from '../data/pteDescribeImageBank';
import {
  PTE_READ_ALOUD_BANK,
  PteReadAloudQuestion,
  PteRaCategory,
  getPteRaQuestionById,
  getPteRaQuestionsByCategory,
  getRandomPteRaQuestion,
} from '../data/pteReadAloudBank';

export type WorkbenchContextMode =
  | 'confusing_pair'   // Timbangan Konseptual / Dual Contrast Stream
  | 'syntax_ribbon'    // Pita Kalimat Sintaksis Berwarna
  | 'magic_character'  // Kanvas Kaligrafi Zen & Radikal
  | 'tone_waveform'    // Kurva Nada Suara & Intonasi
  | 'standard_clarity' // Penjelasan Kontekstual Bersih
  | 'read_aloud'       // Kanvas Latihan Baca Nyaring Non-PTE (EN/JA/ZH)
  | 'pte_describe_image' // Kanvas Grafik SVG & Timer Ujian PTE
  | 'pte_read_aloud'   // Kanvas Teks Akademik & Chunking Nafas PTE
  | 'pte_scorecard'    // Rapor Skor Resmi Pearson PTE
  | 'ssw_tactical_board'; // Papan Taktis & Jebakan Ujian Khusus SSW Sensei

export type WorkbenchQuizMode = 'multiple_choice' | 'cloze_gap' | 'sentence_blocks';

export interface DynamicQuizData {
  prompt: string;
  // Mode Pilihan Ganda (3-4 Opsi, Anti-Spoiling)
  options: Array<{
    id: string;
    text: string;
    isCorrect: boolean;
    feedback: string;
  }>;
  // Mode Isian Rumpang (Fill-in-the-Blank / Cloze)
  cloze: {
    prefix: string;
    blankWord: string;
    suffix: string;
    chips: string[];
    feedback: string;
  };
  // Mode Susun Balok Kata (Sentence Builder)
  blocks: {
    correctOrder: string[];
    pool: string[];
    meaningId: string;
    feedback: string;
  };
}

export interface PteChartData {
  chartType: PteChartCategory;
  title: string;
  sourceText?: string;
  labels?: string[];
  values?: number[];
  seriesName?: string;
  pieData?: Array<{ label: string; pct: number; color: string }>;
  processSteps?: Array<{ step: number; title: string; desc: string }>;
  keywords: string[];
  universalTemplate: {
    intro: string;
    keyElements: string;
    maximum: string;
    minimum: string;
    conclusion: string;
  };
  questionId?: string;
  examFrequency?: string;
  sourceOrigin?: string;
  renderData?: any;
  examinerTips?: string;
}

export interface PteReadAloudData {
  title: string;
  passageText: string;
  chunkedSegments: Array<{ text: string; isChunkBreak?: boolean }>;
  targetWpm: number;
  phoneticFocus: Array<{ word: string; ipa: string; tip: string }>;
  questionId?: string;
  category?: string;
  examFrequency?: string;
  sourceOrigin?: string;
  examinerTips?: string;
  oneSentenceHack?: string;
  isGeneralReadAloud?: boolean;
  targetLang?: TargetLang;
  translationText?: string;
  readingGuide?: string;
}

export interface PteScorecardData {
  hasLiveSample?: boolean;
  compositeScore: number;
  fluencyScore: number;
  pronunciationScore: number;
  contentScore: number;
  passed: boolean;
  remedialWords: string[];
  examinerNotes: string;
  wpm?: number;
  articulationWpm?: number;
  durationSec?: number;
  activeSpeechSec?: number;
  phonationRatio?: number;
  pauseCount?: number;
  hesitationCount?: number;
  selfCorrectionCount?: number;
  rhythmScore?: number;
  measurementSource?: string;
  fluencyReasons?: string[];
}

export interface DynamicBoardState {
  contextMode: WorkbenchContextMode;
  focusType?: string;
  title?: string;
  summary?: string;
  sampleTarget?: string;
  sampleMeaningId?: string;
  topicTitle: string;
  patternFormula: string;
  coachExplanation: string;
  // Data Khusus Confusing Pair (Dual-Stream Contrast)
  pairData?: {
    termA: string;
    descA: string;
    colorA: string;
    termB: string;
    descB: string;
    colorB: string;
    keyAnalogy: string;
    labelA?: string;
    labelB?: string;
  };
  // Data Khusus Syntax Ribbon
  ribbonSegments?: Array<{
    role: string;
    word: string;
    tagColor: string;
  }>;
  // Data Khusus Karakter / Kanji / Hanzi
  characterData?: {
    char: string;
    reading: string;
    meaning: string;
    radical: string;
    radicalMeaning: string;
    strokesCount: number;
  };
  // Data Khusus Nada / Pelafalan
  toneData?: {
    word: string;
    phonetic: string;
    toneType: string;
    toneShape: string;
  };
  // Data Khusus PTE Academic & Target Standar
  pteChartData?: PteChartData;
  pteReadAloudData?: PteReadAloudData;
  pteScorecardData?: PteScorecardData;
  standardTarget?: {
    text: string;
    reading?: string;
    translation?: string;
  };
  // Data Khusus SSW Sensei (Papan Taktis Terfokus)
  sswTacticalData?: {
    pageNumber: number;
    stepNumber: number;
    requestedQuery?: string;
  };
  // Kuis Interaktif Multi-Mode (opsional bila papan murni visual atau offline)
  quiz?: DynamicQuizData;
  isOfflineNotice?: boolean;
}

export interface InCallLearningWorkbenchProps {
  isOpen: boolean;
  onClose: () => void;
  locale: LearnerLocale;
  onChangeLocale?: (nextLocale: LearnerLocale) => void;
  targetLang: TargetLang;
  scenario: CallScenario;
  persona: VoicePersona;
  isLiveConnected: boolean;
  callDurationSec?: number;
  isPlayingPreview?: boolean;
  topicTitle: string;
  focusType?:
    | 'grammar'
    | 'vocab'
    | 'kanji'
    | 'kana'
    | 'sentence_drill'
    | 'pte_describe_image'
    | 'pte_read_aloud'
    | 'pte_scorecard'
    | string;
  explanationText?: string;
  patternFormula?: string;
  drillInstruction?: string;
  sampleTarget?: string;
  currentMasteryPct?: number;
  uiAction?: VoiceUiAction;
  topMisconceptionId?: string | null;
  isGeneratingTopic?: boolean;
  onRequestCustomTopic?: (
    customQuestion: string,
    bankTopicId?: string,
    followUpContext?: WhiteboardFollowUpContext
  ) => void;
  onSpeakPreview?: (sampleText: string, spokenLang?: string) => void;
  onStopMainAudio?: () => void;
  onResumeConversation?: (completedSentence?: string, topicTitle?: string) => void;
  onEvaluatePractice?: (
    writtenText: string,
    sampleTarget: string,
    patternFormula: string,
    meta?: any
  ) => any;
  onSendToMentor?: (writtenSentence: string) => void;
  onNavigateModule?: (destination: string) => void;
  forcedExerciseMode?: 'multiple_choice' | 'cloze_gap' | 'sentence_blocks' | null;
  externalQuizSeed?: number;
  initialMinimized?: boolean;
  openNonce?: number;
  cefrLevel?: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2' | string;
  latestPteDiagnostic?: PteDiagnosticSpeechResult | null;
  latestReadAloudAlignment?: SpeechAlignmentResult | null;
  latestAiSubtitle?: string;
  onActiveBoardSync?: (info: {
    contextMode: string;
    topicTitle: string;
    activeTargetText: string;
  }) => void;
  onWhiteboardBraincoreEvent?: (evt: {
    kind: 'board_completed' | 'circle_ask_confusion';
    topicTitle: string;
    targetText?: string;
    misconceptionId?: string;
    isCorrect?: boolean;
  }) => void;
}

export interface WhiteboardEvaluationResultMeta {
  ok?: boolean;
}

export interface WorkbenchEvaluationMeta {
  competencyId?: string;
  trapWrongToken?: string;
  misconceptionId?: string;
  isQuizSuccess?: boolean;
  isQuizFailure?: boolean;
}

export interface WorkbenchPracticeCheckResult {
  ok: boolean;
  score: number;
  feedbackText: string;
  correctionText: string;
  trappedTokens: string[];
  masteryDeltaPct: number;
  nextMasteryPct: number;
}

/** Helper lokalisasi, tokenisasi CJK & antarmuka papan belajar dari main. */
function normalizeWbLocale(locale?: LearnerLocale): string {
  const code = String(locale || 'id').toLowerCase().split(/[-_]/)[0];
  if (code === 'id' || code === 'th' || code === 'en' || code === 'ja' || code === 'zh' || code === 'ms' || code === 'vi' || code === 'fil' || code === 'km' || code === 'ru') return code;
  return 'en';
}

function wbT(locale: LearnerLocale | undefined, en: string, id: string, th?: string, ja?: string): string {
  const loc = normalizeWbLocale(locale);
  if (loc === 'id') return id;
  if (loc === 'ja' && ja) return ja;
  return wbPick(en, id, th, loc);
}

function isTargetSentenceForRuby(text: string, targetLang: TargetLang): boolean {
  const clean = (text || '').trim();
  if (!clean) return false;
  if (targetLang === 'ja') return /[\u3040-\u30ff]/.test(clean) || containsHanzi(clean);
  if (targetLang === 'zh') return containsHanzi(clean);
  return /[a-zA-Z]{2,}/.test(clean);
}

function isMostlyTargetPhrase(text: string, targetLang: TargetLang): boolean {
  const clean = (text || '').replace(/\s+/g, '');
  if (!clean) return false;
  if (targetLang === 'ja') {
    const jpChars = (clean.match(/[\u3040-\u30ff\u4e00-\u9fafー]/g) || []).length;
    return jpChars / clean.length >= 0.45;
  }
  if (targetLang === 'zh') {
    const zhChars = (clean.match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;
    return zhChars / clean.length >= 0.45;
  }
  return /[a-zA-Z]/.test(clean);
}

function tokenizeSentenceIntoBlocks(sentence: string, targetLang: TargetLang): string[] {
  const cleaned = String(sentence || '')
    .replace(/^[×✓\s]+/, '')
    .replace(/[.?!,。？！、]+$/g, '')
    .trim();
  if (!cleaned) return [];

  const spaceSplit = cleaned.split(/\s+/).filter(Boolean);
  if (targetLang === 'en') {
    return spaceSplit.map((w) => w.replace(/[.,?!]+$/g, '')).filter(Boolean);
  }
  if (spaceSplit.length >= 3) {
    return spaceSplit.map((w) => w.replace(/[。？！、.,?!]+$/g, '')).filter(Boolean);
  }

  try {
    const Seg = (Intl as any)?.Segmenter;
    if (typeof Seg === 'function') {
      const segLocale = targetLang === 'zh' ? 'zh-CN' : 'ja';
      const segmenter = new Seg(segLocale, { granularity: 'word' });
      const rawSegs = Array.from(segmenter.segment(cleaned), (s: any) => String(s.segment || '').trim())
        .filter((s) => s && !/^[。？！、.,?!\s]+$/.test(s));
      if (targetLang === 'ja' && rawSegs.length > 2) {
        const particles = new Set(['は', 'が', 'を', 'に', 'で', 'へ', 'と', 'も', 'の', 'から', 'まで', 'よ', 'ね', 'か']);
        const merged: string[] = [];
        for (const seg of rawSegs) {
          if (particles.has(seg) && merged.length > 0 && merged[merged.length - 1].length <= 4) {
            merged[merged.length - 1] += seg;
          } else {
            merged.push(seg);
          }
        }
        if (merged.length >= 2) return merged;
      }
      if (rawSegs.length >= 2) return rawSegs;
    }
  } catch {
    // Fallback below
  }

  if (targetLang === 'zh') {
    const chars = Array.from(cleaned.replace(/\s+/g, ''));
    const chunks: string[] = [];
    for (let i = 0; i < chars.length; i += 2) {
      chunks.push(chars.slice(i, i + 2).join(''));
    }
    return chunks.filter(Boolean);
  }
  const jpChunks = cleaned
    .replace(/([はがをにでへともの]|でした|ました|ます|ません|です)/g, '$1 ')
    .split(/\s+/)
    .filter(Boolean);
  return jpChunks.length >= 2 ? jpChunks : Array.from(cleaned.replace(/\s+/g, ''));
}

function joinTokensForTarget(tokens: string[], targetLang: TargetLang): string {
  const clean = tokens.filter(Boolean);
  if (targetLang === 'ja' || targetLang === 'zh') {
    return clean.join('');
  }
  return clean.join(' ').replace(/\s+/g, ' ').trim();
}

/**
 * Pengacak deterministik berbasis seed (`quizSeed`) yang menjamin:
 * 1) Hasil tidak pernah identik dengan urutan jawaban asli (`items`) maupun kebalikan murni (`reverse`) untuk n >= 3.
 * 2) Setiap kenaikan `seed` ("Ganti Soal") menghasilkan permutasi berbeda secara deterministik.
 */
function seededShuffle<T>(items: readonly T[], seed: number): T[] {
  const n = items.length;
  if (n <= 1) return [...items];
  if (n === 2) {
    return Math.abs(seed) % 2 === 0 ? [items[1], items[0]] : [items[0], items[1]];
  }
  const origSig = items.map((x) => JSON.stringify(x)).join('||');
  const revSig = [...items].reverse().map((x) => JSON.stringify(x)).join('||');
  const firstSig = JSON.stringify(items[0]);
  const desiredFirstPos = (Math.abs(seed) + 1) % n;

  const allCandidates: T[][] = [];
  const posMatchedCandidates: T[][] = [];
  for (let variant = 0; variant < 32; variant++) {
    const arr = [...items];
    let state = (Math.abs(seed * 131 + variant * 97 + n * 31) + 1) >>> 0;
    for (let i = n - 1; i > 0; i--) {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      const j = state % (i + 1);
      const tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
    const sig = arr.map((x) => JSON.stringify(x)).join('||');
    if (
      sig !== origSig &&
      sig !== revSig &&
      !allCandidates.some((c) => c.map((x) => JSON.stringify(x)).join('||') === sig)
    ) {
      allCandidates.push(arr);
      if (JSON.stringify(arr[desiredFirstPos]) === firstSig) {
        posMatchedCandidates.push(arr);
      }
    }
  }
  if (posMatchedCandidates.length > 0) {
    return posMatchedCandidates[Math.abs(seed) % posMatchedCandidates.length];
  }
  if (allCandidates.length > 0) {
    return allCandidates[Math.abs(seed) % allCandidates.length];
  }
  const shift = (Math.abs(seed) % (n - 1)) + 1;
  return items.map((_, idx) => items[(idx + shift) % n]);
}

function synthesizeSentenceDistractors(
  targetSent: string,
  primaryTrap: string,
  targetLang: TargetLang,
  action?: VoiceUiAction,
  defaultWrongFeedback = 'Periksa kembali struktur tata bahasa dan pilihan katanya.',
  locale?: LearnerLocale
): Array<{ text: string; feedback: string }> {
  const pick = (en: string, id: string) => wbPick(en, id, undefined, locale);
  const cleanTarget = targetSent.trim();
  const normQuizKey = (val: string) =>
    String(val || '')
      .toLowerCase()
      .replace(/^[\s"'“”‘’「」『』()]+|[\s"'“”‘’「」『』().!?。！？,;:]+$/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  const seen = new Set<string>([normQuizKey(cleanTarget)]);
  const out: Array<{ text: string; feedback: string }> = [];
  const pushCandidate = (txt: string, feedback: string) => {
    const t = String(txt || '').replace(/\s+/g, ' ').trim();
    if (!t || t.length < 2) return;
    const key = normQuizKey(t);
    if (!key || seen.has(key)) return;
    seen.add(key);
    out.push({ text: t, feedback });
  };

  if (primaryTrap && primaryTrap.trim() !== cleanTarget) {
    pushCandidate(primaryTrap, action?.trapWrongReason || defaultWrongFeedback);
  }

  if (Array.isArray(action?.whiteboardSteps)) {
    for (const st of action.whiteboardSteps) {
      if (st?.wrongText) {
        pushCandidate(st.wrongText, st.reason || action?.trapWrongReason || defaultWrongFeedback);
      }
    }
  }

  if (targetLang === 'en') {
    if (/\b(?:am|is|are)\s+([a-z]+)\b/i.test(cleanTarget)) {
      pushCandidate(
        cleanTarget.replace(/\b(?:am|is|are)\s+/i, ''),
        pick(
          'This sentence is missing its linking verb (to be: am/is/are) after the subject.',
          'Kalimat ini kehilangan kata penghubung (to be: am/is/are) setelah subjek.'
        )
      );
      pushCandidate(
        cleanTarget.replace(/\b(is)\b/i, 'are').replace(/\b(are)\b/i, 'is').replace(/\b(am)\b/i, 'is'),
        pick(
          'The linking verb (am/is/are) does not agree with the subject.',
          'Pasangan to be (am/is/are) tidak sesuai dengan subjek kalimatnya.'
        )
      );
      pushCandidate(
        cleanTarget.replace(/\b(?:am|is|are)\b/i, (m) => (/^am$/i.test(m) ? 'do' : /^are$/i.test(m) ? 'do' : 'does')),
        pick(
          'Before an adjective or state, use to be (am/is/are), not do/does.',
          'Untuk kata sifat atau kondisi, gunakan to be (am/is/are), bukan do/does.'
        )
      );
    }
    const words = tokenizeSentenceIntoBlocks(cleanTarget, 'en');
    if (words.length >= 3) {
      const midSwap = [...words];
      const swapIdx = midSwap.length >= 4 ? 2 : 1;
      const t = midSwap[swapIdx - 1];
      midSwap[swapIdx - 1] = midSwap[swapIdx];
      midSwap[swapIdx] = t;
      const rawSwap = `${midSwap.join(' ')}.`;
      pushCandidate(
        rawSwap.charAt(0).toUpperCase() + rawSwap.slice(1),
        pick(
          'The word order in this statement is reversed.',
          'Urutan kata dalam kalimat pernyataan ini terbalik.'
        )
      );
      const dropped = words.filter((_, idx) => idx !== 1);
      const rawDrop = `${dropped.join(' ')}.`;
      pushCandidate(
        rawDrop.charAt(0).toUpperCase() + rawDrop.slice(1),
        pick(
          'An essential verb or linking word is missing in the middle of the sentence.',
          'Ada unsur kata kerja atau penghubung penting yang terlewat di tengah kalimat.'
        )
      );
    }
  } else if (targetLang === 'ja') {
    if (/は/.test(cleanTarget)) {
      pushCandidate(
        cleanTarget.replace(/は/, 'を'),
        pick(
          'Topic marker は cannot be replaced with direct-object particle を here.',
          'Partikel penanda topik は tidak boleh diganti partikel objek を di posisi ini.'
        )
      );
    }
    if (/を/.test(cleanTarget)) {
      pushCandidate(
        cleanTarget.replace(/を/, 'が'),
        pick(
          'Object marker を was mistakenly swapped with subject marker が.',
          'Partikel objek を keliru diganti menjadi が pada kata kerja ini.'
        )
      );
    }
    if (/です|ます/.test(cleanTarget)) {
      pushCandidate(
        cleanTarget.replace(/です|ます/g, ''),
        pick(
          'The polite predicate ending (です/ます) is incomplete.',
          'Akhiran predikat sopan (です/ます) di akhir kalimat belum lengkap.'
        )
      );
    }
  } else if (targetLang === 'zh') {
    if (/是/.test(cleanTarget)) {
      pushCandidate(
        cleanTarget.replace(/是/, '很'),
        pick(
          '是 (to be) and 很 (stative linker) serve different grammatical roles here.',
          'Kata penghubung 是 dan 很 memiliki fungsi berbeda pada pola kalimat ini.'
        )
      );
    }
    const toks = tokenizeSentenceIntoBlocks(cleanTarget, 'zh');
    if (toks.length >= 3) {
      const swapped = [...toks];
      const t = swapped[1];
      swapped[1] = swapped[2];
      swapped[2] = t;
      pushCandidate(
        swapped.join(''),
        pick(
          'The Mandarin adverbial and predicate order is inverted.',
          'Susunan kata keterangan dan predikat Mandarin-nya terbalik.'
        )
      );
    }
  }

  // Fallback universal bila kalimat sangat pendek
  const tokens = tokenizeSentenceIntoBlocks(cleanTarget, targetLang);
  if (out.length < 2 && tokens.length >= 2) {
    pushCandidate(
      joinTokensForTarget([tokens[1], tokens[0], ...tokens.slice(2)], targetLang),
      pick(
        'The word order in this choice is incorrect.',
        'Susunan urutan kata pada pilihan ini belum tepat.'
      )
    );
    pushCandidate(
      joinTokensForTarget(tokens.slice(0, -1), targetLang),
      pick(
        'This sentence is incomplete because the final part is missing.',
        'Kalimat ini belum lengkap karena bagian akhirnya terpotong.'
      )
    );
  }
  return out.slice(0, 3);
}

function buildClozeDistractorChips(
  blankTarget: string,
  cleanWords: string[],
  trapSent: string,
  targetLang: TargetLang,
  action: VoiceUiAction | undefined,
  seed: number
): string[] {
  const cleanBlank = String(blankTarget || '').trim();
  if (!cleanBlank) return [];
  const chips: string[] = [cleanBlank];
  const addChip = (raw: string) => {
    const c = String(raw || '').replace(/^[×✓\s]+|[.?!,。？！、]+$/g, '').trim();
    if (!c || c.length > 28) return;
    if (chips.some((x) => x.toLowerCase() === c.toLowerCase())) return;
    chips.push(c);
  };

  if (Array.isArray(action?.drillDistractors)) action.drillDistractors.forEach(addChip);
  if (Array.isArray(action?.drillBlocks)) action.drillBlocks.forEach(addChip);
  if (trapSent) {
    tokenizeSentenceIntoBlocks(trapSent, targetLang)
      .filter((w) => !cleanWords.some((cw) => cw.toLowerCase() === w.toLowerCase()))
      .forEach(addChip);
  }
  cleanWords.filter((w) => w.toLowerCase() !== cleanBlank.toLowerCase()).forEach(addChip);

  const fallbackPool =
    targetLang === 'ja'
      ? ['は', 'が', 'を', 'に', 'で', 'です', 'ます']
      : targetLang === 'zh'
        ? ['是', '很', '了', '的', '在', '不']
        : ['is', 'are', 'am', 'do', 'does', 'to', 'very'];
  fallbackPool.forEach(addChip);

  return seededShuffle(chips.slice(0, 4), seed + 5);
}

function getWorkbenchUiStrings(locale?: LearnerLocale) {
  const loc = normalizeWbLocale(locale);
  if (loc === 'th') {
    return {
      badge: 'กระดานเรียนรู้',
      minimizedBadge: 'กระดานทำงานอยู่',
      openBtn: '⤢ เปิด',
      minimizeTitle: 'ย่อกระดาน (ดูโมจิและคุยต่อได้)',
      closeTitle: 'ปิดและคุยต่อ',
      preparingTitle: 'Fiezel กำลังเตรียมบทเรียน...',
      preparingSub: 'กำลังเรียบเรียงคำอธิบายภาพและแบบฝึกหัดเฉพาะสำหรับคุณ',
      keyPointLabel: '💡 จุดสำคัญ:',
      syntaxLabel: 'โครงสร้างประโยค',
      listenBtn: 'ฟังเสียง',
      modeChoice: 'เลือกคำตอบ',
      modeCloze: 'เติมคำ',
      modeBlocks: 'เรียงคำ',
      rerollBtn: 'เปลี่ยนโจทย์',
      rerollTitle: 'เปลี่ยนโจทย์ใหม่',
      clozePrompt: 'แตะคำที่ถูกต้องเพื่อเติมประโยคให้สมบูรณ์:',
      clozeWrong: 'คำนี้ยังไม่ถูกต้อง ลองเลือกคำอื่นดูนะ!',
      blocksEmpty: 'แตะคำด้านล่างเพื่อเรียงเป็นประโยค...',
      micListening: (name: string) => `${name} กำลังฟังอยู่ (พูดผ่านไมค์ได้เลย)`,
      talkBtn: (name: string) => `พูดคุยต่อกับ ${name}`,
      closeBtn: 'ปิด ✕',
      wrongLabel: '× ยังไม่เป็นธรรมชาติ',
      rightLabel: '✓ รูปประโยคที่เป็นธรรมชาติ',
      radicalLabel: 'รากศัพท์หลัก',
      strokesLabel: 'ขีดเขียน',
      toneShapeLabel: 'ระดับเสียงและคำอ่าน',
      correctFeedback: 'เยี่ยมมาก! รูปประโยคถูกต้องและเป็นธรรมชาติแล้ว',
      wrongFeedback: 'ยังไม่ถูกต้อง ลองสังเกตโครงสร้างเปรียบเทียบด้านบนอีกครั้งนะ',
      clozeCorrectFeedback: 'ถูกต้อง! คำนี้ทำให้ประโยคสมบูรณ์',
      blocksCorrectFeedback: 'เรียงประโยคได้สมบูรณ์แบบ!',
      blocksInstruction: 'เรียงคำด้านล่างให้เป็นประโยคที่ถูกต้อง:',
    };
  }
  if (loc === 'ja') {
    return {
      badge: '学習ボード',
      minimizedBadge: '学習中',
      openBtn: '⤢ 開く',
      minimizeTitle: '最小化（会話は継続します）',
      closeTitle: '閉じて会話を続ける',
      preparingTitle: 'Fiezelが教材を準備中...',
      preparingSub: 'あなたに合わせた解説と練習問題を準備しています',
      keyPointLabel: '💡 ポイント:',
      syntaxLabel: '文の組み立てパターン',
      listenBtn: '音声を聞く',
      modeChoice: '選択',
      modeCloze: '穴埋め',
      modeBlocks: '並び替え',
      rerollBtn: '別の問題',
      rerollTitle: '新しい問題に切り替え',
      clozePrompt: '正しい言葉を選んで文を完成させましょう:',
      clozeWrong: 'まだ合っていません。別の言葉を試しましょう！',
      blocksEmpty: '下のブロックをタップして文を組み立ててください...',
      micListening: (name: string) => `${name} が聞いています（マイクでそのまま話せます）`,
      talkBtn: (name: string) => `${name} と会話を続ける`,
      closeBtn: '閉じる ✕',
      wrongLabel: '× 直したい表現',
      rightLabel: '✓ 自然な表現',
      radicalLabel: '部首',
      strokesLabel: '画数',
      toneShapeLabel: '声調・発音ポイント',
      correctFeedback: '正解です！とても自然な表現になりました。',
      wrongFeedback: '惜しいです。上の比較カードを確認してみましょう。',
      clozeCorrectFeedback: '正解！文にぴったりの表現です。',
      blocksCorrectFeedback: '文の組み立てが完璧です！',
      blocksInstruction: '下の語句を正しい順番に並べてください:',
    };
  }
  if (loc === 'zh') {
    return {
      badge: '学习白板',
      minimizedBadge: '白板开启',
      openBtn: '⤢ 展开',
      minimizeTitle: '最小化白板（继续对话）',
      closeTitle: '关闭并继续对话',
      preparingTitle: '正在准备学习白板...',
      preparingSub: '正在为你定制专属图解与巩固练习',
      keyPointLabel: '💡 要点:',
      syntaxLabel: '句型结构',
      listenBtn: '听发音',
      modeChoice: '选择',
      modeCloze: '填空',
      modeBlocks: '连词成句',
      rerollBtn: '换一题',
      rerollTitle: '换一道新练习题',
      clozePrompt: '点击正确的词语补全句子:',
      clozeWrong: '这个词不太合适，再试试另一个吧！',
      blocksEmpty: '点击下方词块组成完整句子...',
      micListening: (name: string) => `${name} 正在倾听（可直接用麦克风说话）`,
      talkBtn: (name: string) => `继续和 ${name} 对话`,
      closeBtn: '关闭 ✕',
      wrongLabel: '× 常见误区',
      rightLabel: '✓ 地道表达',
      radicalLabel: '偏旁部首',
      strokesLabel: '笔画数',
      toneShapeLabel: '声调与发音提示',
      correctFeedback: '回答正确！句子非常自然地道。',
      wrongFeedback: '差一点点，看看上面的对比要点再来一次吧。',
      clozeCorrectFeedback: '太棒了！词语搭配完全准确。',
      blocksCorrectFeedback: '语序完全正确！',
      blocksInstruction: '请将下方词块按正确语序排列:',
    };
  }
  if (loc === 'id') {
    return {
      badge: '✦ Papan Belajar',
      minimizedBadge: 'Papan Aktif',
      openBtn: '⤢ Buka',
      minimizeTitle: 'Kecilkan Papan (Lihat Mochi & Tetap Bicara)',
      closeTitle: 'Tutup & Lanjut Ngobrol',
      preparingTitle: 'Menyiapkan papan belajar...',
      preparingSub: 'Meracik penjelasan visual dan latihan khusus untukmu',
      keyPointLabel: '💡 Intinya:',
      syntaxLabel: 'Pola Susunan Kalimat',
      listenBtn: 'Dengarkan',
      modeChoice: 'Pilihan',
      modeCloze: 'Isian Kata',
      modeBlocks: 'Susun Balok',
      rerollBtn: 'Ganti Soal',
      rerollTitle: 'Ganti Soal Baru Tanpa Terjawab Duluan',
      clozePrompt: 'Ketuk kata yang tepat untuk melengkapi kalimat:',
      clozeWrong: 'Kata tersebut belum pas. Coba kata yang lain!',
      blocksEmpty: 'Ketuk balok di bawah untuk menyusun kalimat...',
      micListening: (name: string) => `${name} sedang mendengarkan (bisa bicara langsung via mic)`,
      talkBtn: (name: string) => `Lanjut Bicara dengan ${name}`,
      closeBtn: 'Tutup ✕',
      wrongLabel: '× Kurang Alami',
      rightLabel: '✓ Bentuk Alami',
      radicalLabel: 'Radikal Utama',
      strokesLabel: 'Goresan',
      toneShapeLabel: 'Kontur Nada & Pelafalan',
      correctFeedback: 'Tepat sekali! Susunan kalimat ini sudah benar dan alami.',
      wrongFeedback: 'Terkecoh! Pilihan ini memiliki susunan kata yang kurang tepat.',
      clozeCorrectFeedback: 'Mantap! Kata yang kamu pilih tepat melengkapi kalimat.',
      blocksCorrectFeedback: 'Susunan kalimat selesai dengan rapi!',
      blocksInstruction: 'Susun kata-kata berikut agar membentuk kalimat yang padu.',
    };
  }
  return {
    badge: '✦ Learning Board',
    minimizedBadge: 'Board Active',
    openBtn: '⤢ Open',
    minimizeTitle: 'Minimize Board (See Mochi & Keep Talking)',
    closeTitle: 'Close & Continue Talking',
    preparingTitle: 'Preparing learning board...',
    preparingSub: 'Building visual explanations and tailored practice for you',
    keyPointLabel: '💡 Key Point:',
    syntaxLabel: 'Sentence Pattern',
    listenBtn: 'Listen',
    modeChoice: 'Choice',
    modeCloze: 'Fill in Blank',
    modeBlocks: 'Word Order',
    rerollBtn: 'New Question',
    rerollTitle: 'Switch to a fresh practice question',
    clozePrompt: 'Tap the right word to complete the sentence:',
    clozeWrong: 'That word does not fit yet. Try another option!',
    blocksEmpty: 'Tap tiles below to build the sentence...',
    micListening: (name: string) => `${name} is listening (speak anytime via mic)`,
    talkBtn: (name: string) => `Continue Talking with ${name}`,
    closeBtn: 'Close ✕',
    wrongLabel: '× Unnatural / Avoid',
    rightLabel: '✓ Natural Form',
    radicalLabel: 'Key Radical',
    strokesLabel: 'Strokes',
    toneShapeLabel: 'Tone Contour & Pronunciation',
    correctFeedback: 'Spot on! This sentence structure is clear and natural.',
    wrongFeedback: 'Not quite, check the word order and pattern above and try again.',
    clozeCorrectFeedback: 'Nice work! That word completes the sentence naturally.',
    blocksCorrectFeedback: 'Cleanly arranged! Word order is spot on.',
    blocksInstruction: 'Arrange the tiles below into a natural sentence:',
  };
}

/**
 * Memeriksa apakah `uiAction` membawa data dinamis lengkap dari backend Fiezel.
 */

/**
 * Memeriksa apakah `uiAction` membawa data dinamis lengkap dari backend Fiezel.
 */
export function hasRichDynamicAction(action?: VoiceUiAction): boolean {
  if (!action) return false;
  if (action.focusType === 'ssw_tactical_board') return true;
  if (action.focusType === 'read_aloud' || (action.focusType && action.focusType.startsWith('pte_'))) return true;
  if (Array.isArray(action.whiteboardSteps) && action.whiteboardSteps.length > 0) return true;
  const hasSample = Boolean(action.sampleTarget && action.sampleTarget.trim().length > 3);
  const hasExplanation = Boolean(action.explanationText && action.explanationText.trim().length > 12);
  const hasFormula = Boolean(
    action.patternFormula &&
    action.patternFormula.trim().length > 3 &&
    !action.patternFormula.includes('Pola kalimat tepat untuk:')
  );
  const hasRightWord = Boolean(
    action.rightWord &&
    action.rightWord.trim().length > 0 &&
    action.rightWord !== 'bentuk tepat'
  );
  return hasSample || hasExplanation || (hasFormula && hasRightWord);
}

/**
 * Menganalisis payload dinamis dari Gemini Live / Worker dan menurunkan Kanvas Kontekstual
 * secara 100% real-time (ZERO template statis untuk percakapan umum/materi belajar).
 * Cabang resmi PTE Academic tetap dipertahankan sesuai bank Pearson.
 */
export function deriveContextualPedagogicalBoard(
  action: VoiceUiAction | undefined,
  rawQuery: string,
  targetLang: TargetLang,
  locale: LearnerLocale,
  seedVariant = 0,
  latestPteDiagnostic?: PteDiagnosticSpeechResult | null,
  isPteContext = false
): DynamicBoardState {
  const query = (action?.topicTitle || rawQuery || '').trim();
  const lowerQ = query.toLowerCase();
  const rawUi = getWorkbenchUiStrings(locale);
  const loc = normalizeWbLocale(locale);
  const ui = ['id', 'th', 'ja', 'zh', 'en'].includes(loc)
    ? rawUi
    : Object.fromEntries(
        Object.entries(rawUi).map(([k, v]) => [k, typeof v === 'string' ? wbPick(v, v, v, loc) : v])
      ) as typeof rawUi;
  const combinedHintText = `${query} ${action?.sampleTarget || ''} ${action?.wrongWord || ''} ${action?.rightWord || ''} ${action?.patternFormula || ''}`;
  const effectiveLang: TargetLang =
    targetLang === 'ja' || /[\u3040-\u30ff]/.test(combinedHintText)
      ? 'ja'
      : targetLang === 'zh' || (containsHanzi(combinedHintText) && !/[\u3040-\u30ff]/.test(combinedHintText))
        ? 'zh'
        : targetLang || 'en';
  const lt = (idText: string, thText: string, jaText?: string, zhText?: string, enText?: string) => {
    if (loc === 'id') return idText;
    if (loc === 'th') return thText;
    if (loc === 'ja' && jaText) return jaText;
    if (loc === 'zh' && zhText) return zhText;
    return wbPick(enText || thText, idText, thText, loc);
  };
  const isId = loc === 'id';

  // 0. KASUS KHUSUS SSW SENSEI: PAPAN TAKTIS HALAMAN, TRIK WAKAI PAPA+, & KUIS SSW
  if (
    action?.focusType === 'ssw_tactical_board' ||
    /papan\s*taktis\s*ssw|ssw_hal_/i.test(lowerQ)
  ) {
    const pageMatch =
      query.match(/\bhal(?:aman)?\.?\s*(\d{1,2})\b/i) ||
      query.match(/\bpage\s*(\d{1,2})\b/i);
    const cursor = getSswLessonStepCursor();
    const targetPageNum = pageMatch
      ? Math.max(1, Math.min(SSW_MASTER_KB.meta.totalPdfPages || 91, parseInt(pageMatch[1], 10)))
      : cursor.page || 1;
    const plan = getStructuredPagePlan(targetPageNum);
    const pageTitle = plan.pageObj?.title || wbFmt('Page {page}', 'Halaman {page}', undefined, { page: plan.targetPage }, loc);

    return {
      contextMode: 'ssw_tactical_board',
      focusType: 'ssw_tactical_board',
      topicTitle: `${wbPick('Page', 'Hal.', undefined, loc)} ${plan.targetPage}: ${pageTitle}`,
      patternFormula: wbFmt(
        'Page {page} · Step {step} of {total}',
        'Hal. {page} · Langkah {step} dari {total}',
        undefined,
        { page: plan.targetPage, step: plan.activeStepIndex, total: plan.steps.length },
        loc
      ),
      coachExplanation: '',
      sswTacticalData: {
        pageNumber: plan.targetPage,
        stepNumber: plan.activeStepIndex,
        requestedQuery: query,
      },
      quiz: {
        prompt: wbPick('Quick SSW practice is available in the Tactical Board panel above.', 'Latihan cepat SSW tersedia di panel Papan Taktis di atas.', undefined, loc),
        options: [
          { id: 'opt_1', text: wbPick('Ready to continue lesson', 'Siap lanjut memahami materi', undefined, loc), isCorrect: true, feedback: wbPick('Great!', 'Bagus!', undefined, loc) },
          { id: 'opt_2', text: wbPick('Need extra explanation', 'Perlu penjelasan tambahan', undefined, loc), isCorrect: false, feedback: wbPick('Select an active step above.', 'Pilih langkah aktif di atas.', undefined, loc) },
        ],
        cloze: { prefix: '', blankWord: 'SSW', suffix: '', chips: ['SSW'], feedback: '' },
        blocks: { correctOrder: ['SSW'], pool: ['SSW'], meaningId: wbPick('SSW Food Manufacturing', 'SSW Pengolahan Makanan', undefined, loc), feedback: '' },
      },
    };
  }

  // -------------------------------------------------------------
  // 5-A. KASUS PTE ACADEMIC: DESCRIBE IMAGE (SVG CHARTS & 5-STAGE FORMULA)
  // -------------------------------------------------------------
  if (
    action?.focusType === 'pte_describe_image' ||
    lowerQ.includes('renewable') ||
    lowerQ.includes('describe image') ||
    /describe.*image|pte.*di|pte.*chart|pte.*grafik|bar chart|line graph|pie chart|process flow|map|table/i.test(lowerQ)
  ) {
    const isLine = /line|garis|tren|growth|inflation|co2/i.test(lowerQ);
    const isPie = /pie|lingkaran|persen|share|smartphone|waste/i.test(lowerQ);
    const isProcess = /process|alur|tahap|flow|cycle|salmon|water|glass/i.test(lowerQ);
    const isMap = /map|peta|geografi|rainfall|deforestation/i.test(lowerQ);
    const isTable = /table|tabel|enrolment|hospital/i.test(lowerQ);
    const preferredCat: PteChartCategory = isLine
      ? 'line'
      : isPie
      ? 'pie'
      : isProcess
      ? 'process'
      : isMap
      ? 'map'
      : isTable
      ? 'table'
      : 'bar';

    // Cari soal spesifik jika judulnya cocok, atau ambil soal representatif dari kategori
    const targetQ =
      PTE_DESCRIBE_IMAGE_BANK.find(
        (q) =>
          lowerQ.includes(q.title.toLowerCase()) ||
          q.title.toLowerCase().includes(lowerQ) ||
          q.id === action?.topicTitle
      ) || getRandomPteQuestion(preferredCat);

    const pteChart: PteChartData = {
      chartType: targetQ.category,
      title: targetQ.title,
      labels: targetQ.renderData.labels || [],
      values: targetQ.renderData.values || [],
      seriesName: targetQ.renderData.unit || 'Units',
      pieData: targetQ.renderData.segments?.map((s) => ({ label: s.label, pct: s.pct, color: s.color })),
      processSteps: targetQ.renderData.steps?.map((st) => ({ step: st.stepNumber, title: st.title, desc: st.detail })),
      keywords: targetQ.keywords,
      universalTemplate: targetQ.universalTemplate,
      questionId: targetQ.id,
      examFrequency: targetQ.examFrequency,
      sourceOrigin: targetQ.sourceOrigin,
      renderData: targetQ.renderData,
      examinerTips: targetQ.examinerTips,
    };

    return {
      contextMode: 'pte_describe_image',
      topicTitle: pteChart.title,
      patternFormula: 'Universal Formula: Intro → Key Elements → Maximum → Minimum → Conclusion',
      coachExplanation: wbPick(
        'The key to Describe Image is STEADY FLUENCY. Never pause longer than 3 seconds! Deliver the 5 structured Fiezel sentences smoothly with steady, confident intonation.',
        'Kunci Describe Image adalah KELANCARAN MUTLAK. Jangan berhenti lebih dari 3 detik! Gunakan 5 kalimat sakti Fiezel tanpa ragu, biarkan intonasi terus mengalir santai tapi tegas.',
        undefined,
        loc
      ),
      pteChartData: pteChart,
      quiz: {
        prompt: wbFmt('Choose the CORRECT opening sentence for {title}:', 'Pilih kalimat pembuka (Introduction) yang BENAR untuk {title}:', undefined, { title: targetQ.title }, loc),
        options: [
          {
            id: 'opt_1',
            text: targetQ.universalTemplate.intro,
            isCorrect: true,
            feedback: wbPick('Perfect! A standard high-scoring opening structure covering Fluency and Content.', 'Sempurna! Formula pembuka standar Pearson yang menjamin poin Fluency & Content.', undefined, loc),
          },
          {
            id: 'opt_2',
            text: 'I see many colorful bars with numbers in this picture.',
            isCorrect: false,
            feedback: wbPick('Avoid casual phrasing like "I see"! Use standard academic register.', 'Hindari bahasa kasual seperti "I see"! Gunakan kalimat akademik standar.', undefined, loc),
          },
          {
            id: 'opt_3',
            text: 'This image is talking about renewable energy maybe.',
            isCorrect: false,
            feedback: wbPick('Avoid hedging words like "maybe". Speak decisively and clearly.', 'Hindari kata ragu "maybe". Bersikaplah tegas dan percaya diri.', undefined, loc),
          },
        ],
        cloze: {
          prefix: 'Looking closely, the',
          blankWord: 'maximum',
          suffix: 'figure can be clearly observed in this informative visual.',
          chips: ['maximum', 'huge', 'big', 'taller'],
          feedback: wbPick('Spot on! "maximum figure" is an academic collocation valued in Pearson scoring.', 'Tepat! "maximum figure" adalah kolokasi akademik baku yang sangat disukai Pearson AI scorer.', undefined, loc),
        },
        blocks: {
          correctOrder: ['The', 'given', 'image', 'provides', 'key', 'information', 'about', 'the', 'visual.'],
          pool: ['about', 'given', 'The', 'visual.', 'information', 'provides', 'key', 'image', 'the'],
          meaningId: wbPick('Arrange the standard Pearson Describe Image opening sentence:', 'Susun kalimat pengantar standar Pearson Describe Image:', undefined, loc),
          feedback: wbPick('Opening sentence ordered accurately!', 'Susunan kalimat pembuka tepat sempurna!', undefined, loc),
        },
      },
    };
  }

  // -------------------------------------------------------------
  // 5-B. KASUS READ ALOUD: PTE ACADEMIC VS NON-PTE (EN / JA / ZH)
  // -------------------------------------------------------------
  if (
    action?.focusType === 'pte_read_aloud' ||
    action?.focusType === 'read_aloud' ||
    /read.*aloud|pte.*ra|chunking|baca.*teks|baca.*nyaring|latihan.*baca|kalimat.*baca|pacing/i.test(lowerQ)
  ) {
    const isPteReadAloud =
      action?.focusType === 'pte_read_aloud' ||
      (isPteContext && action?.focusType !== 'read_aloud') ||
      /pte.*ra|pte.*read.*aloud|apeuni/i.test(lowerQ);

    const isCookery = /cook|culinary|kitchen|food|hygiene|sauce|haccp|hospit/i.test(lowerQ);
    const isPerth = /perth|wa|australia|swan|rottnest|quokka|solar|beach/i.test(lowerQ);
    const prefCat: PteRaCategory | undefined = isCookery
      ? 'cookery_hospitality'
      : isPerth
      ? 'australia_perth'
      : undefined;

    const customSample = (action?.sampleTarget || '').trim();
    const isMetaPromptOnly =
      !customSample ||
      /^(?:tampilkan|buka|kasih|minta|buatkan)?\s*(?:pop[\s-]?up|kalimat|latihan)?\s*(?:read\s*aloud|baca\s*nyaring)\.?$/i.test(
        customSample
      );

    if (!isPteReadAloud) {
      const generalPresets: Record<TargetLang, Array<{ passage: string; idTrans: string; thTrans: string; title: string }>> = {
        ja: [
          {
            passage: '明日の朝、駅の前で友達とコーヒーを飲みます。',
            idTrans: 'Besok pagi saya minum kopi bersama teman di depan stasiun.',
            thTrans: 'พรุ่งนี้เช้าฉันจะดื่มกาแฟกับเพื่อนที่หน้าสถานีรถไฟ',
            title: lt('Read Aloud Bahasa Jepang', 'ฝึกอ่านออกเสียงภาษาญี่ปุ่น'),
          },
          {
            passage: '毎日声に出して読むと、発音がもっと自然になります。',
            idTrans: 'Kalau membaca keras setiap hari, pelafalan akan menjadi lebih alami.',
            thTrans: 'ถ้าฝึกอ่านออกเสียงทุกวัน การออกเสียงจะยิ่งเป็นธรรมชาติมากขึ้น',
            title: lt('Read Aloud Bahasa Jepang', 'ฝึกอ่านออกเสียงภาษาญี่ปุ่น'),
          },
          {
            passage: 'すみません、駅まで一番近い道を教えていただけますか？',
            idTrans: 'Permisi, bisakah Anda memberi tahu jalan terdekat menuju stasiun?',
            thTrans: 'ขอโทษครับ/ค่ะ ช่วยบอกทางที่ใกล้ที่สุดไปสถานีรถไฟหน่อยได้ไหม?',
            title: lt('Read Aloud Bahasa Jepang', 'ฝึกอ่านออกเสียงภาษาญี่ปุ่น'),
          },
        ],
        zh: [
          {
            passage: '今天早上我在公园里练习中文发音。',
            idTrans: 'Pagi ini saya berlatih pelafalan Mandarin di taman.',
            thTrans: 'เช้านี้ฉันฝึกออกเสียงภาษาจีนกลางที่สวนสาธารณะ',
            title: lt('Read Aloud Bahasa Mandarin', 'ฝึกอ่านออกเสียงภาษาจีน'),
          },
          {
            passage: '我想喝一杯热茶，然后去图书馆看书。',
            idTrans: 'Saya ingin minum secangkir teh hangat, lalu pergi ke perpustakaan membaca buku.',
            thTrans: 'ฉันอยากดื่มชาร้อนสักแก้ว แล้วไปอ่านหนังสือที่ห้องสมุด',
            title: lt('Read Aloud Bahasa Mandarin', 'ฝึกอ่านออกเสียงภาษาจีน'),
          },
        ],
        en: [
          {
            passage: 'Every morning, I practice speaking English clearly for ten minutes before starting work.',
            idTrans: 'Setiap pagi saya berlatih berbicara bahasa Inggris dengan jelas selama sepuluh menit sebelum mulai bekerja.',
            thTrans: 'ทุกเช้า ฉันฝึกพูดภาษาอังกฤษให้ชัดเจนเป็นเวลาสิบนาทีก่อนเริ่มทำงาน',
            title: lt('Read Aloud Bahasa Inggris', 'ฝึกอ่านออกเสียงภาษาอังกฤษ', undefined, undefined, 'English Read Aloud'),
          },
          {
            passage: 'Could you please speak a little more slowly so I can understand every detail?',
            idTrans: 'Bisakah kamu berbicara sedikit lebih pelan agar aku bisa memahami setiap detailnya?',
            thTrans: 'ช่วยพูดช้าลงอีกนิดได้ไหม เพื่อให้ฉันเข้าใจทุกรายละเอียด',
            title: lt('Read Aloud Bahasa Inggris', 'ฝึกอ่านออกเสียงภาษาอังกฤษ', undefined, undefined, 'English Read Aloud'),
          },
        ],
      };

      const pool = generalPresets[effectiveLang] || generalPresets.en;
      const preset = pool[Math.abs(seedVariant) % pool.length];
      const useCustom = !isMetaPromptOnly && customSample.length >= 2;
      const passage = useCustom ? customSample : preset.passage;
      const liveTrans = translateAndPhoneticizeLiveText(passage, effectiveLang, undefined, undefined, undefined, { locale: loc });
      const transText = useCustom
        ? loc === 'th'
          ? (liveTrans.translationTh && !liveTrans.translationTh.startsWith('Pahami') ? liveTrans.translationTh : '')
          : isId && liveTrans.translationId && !liveTrans.translationId.startsWith('Pahami')
            ? liveTrans.translationId
            : ''
        : loc === 'th'
          ? preset.thTrans
          : isId
            ? preset.idTrans
            : '';
      const readingGuide = resolveUnifiedPronunciation(passage, effectiveLang, undefined, loc) || '';
      const segs =
        effectiveLang === 'ja' || effectiveLang === 'zh'
          ? [{ text: passage, isChunkBreak: false }]
          : passage
              .split(/(?<=[,;:.!?])\s+/)
              .map((part) => part.trim())
              .filter(Boolean)
              .map((text, idx, arr) => ({ text, isChunkBreak: idx < arr.length - 1 }));

      const cleanTokens = tokenizeSentenceIntoBlocks(passage, effectiveLang);
      const readAloudData: PteReadAloudData = {
        title:
          action?.topicTitle &&
          action.topicTitle.length < 70 &&
          !/read.*aloud|baca.*nyaring/i.test(action.topicTitle)
            ? action.topicTitle
            : preset.title,
        passageText: passage,
        chunkedSegments: segs,
        targetWpm: 120,
        phoneticFocus: (cleanTokens.length > 0 ? cleanTokens : [passage]).slice(0, 3).map((word) => ({
          word,
          ipa: resolveUnifiedPronunciation(word, effectiveLang, undefined, loc) || word,
          tip: lt('Baca utuh dengan artikulasi jelas sesuai teks.', 'อ่านให้ครบทุกพยางค์และออกเสียงให้ชัดเจนตามข้อความ', undefined, undefined, 'Read aloud smoothly with clear articulation.'),
        })),
        questionId: 'custom_live_ra',
        category: effectiveLang,
        examFrequency: lt('Baca Nyaring Aktif', 'ฝึกอ่านออกเสียง', undefined, undefined, 'Active Read Aloud'),
        sourceOrigin: 'FIEZEL Live Coach',
        examinerTips:
          action?.explanationText ||
          lt(
            'Baca teks berikut dengan lantang kata demi kata. AI akan memeriksa pelafalan & ketepatan setiap kata yang kamu ucapkan.',
            'อ่านออกเสียงข้อความด้านล่างให้ชัดเจนทีละคำ AI จะตรวจความถูกต้องของคำและเสียงทันที',
            undefined,
            undefined,
            'Read the passage below aloud word by word. AI checks pronunciation and word accuracy live.'
          ),
        oneSentenceHack:
          transText || lt('Fokus pada jeda napas alami dan jangan melewatkan kata akhir.', 'เน้นจังหวะหายใจที่เป็นธรรมชาติและไม่ข้ามคำท้าย', undefined, undefined, 'Focus on natural breath pauses and articulate final syllables clearly.'),
        isGeneralReadAloud: true,
        targetLang: effectiveLang,
        translationText: transText,
        readingGuide,
      };

      return {
        contextMode: 'read_aloud',
        topicTitle: readAloudData.title,
        patternFormula:
          readingGuide || lt('Baca kata demi kata persis seperti di layar', 'อ่านตามข้อความบนหน้าจอให้ครบทุกคำ', undefined, undefined, 'Read word by word exactly as shown on screen'),
        coachExplanation: readAloudData.examinerTips || '',
        pteReadAloudData: readAloudData,
        quiz: {
          prompt: lt('Baca kalimat target berikut dengan jelas kata demi kata:', 'อ่านออกเสียงประโยคต่อไปนี้ให้ชัดเจนทีละคำ:', undefined, undefined, 'Read the target sentence aloud clearly word by word:'),
          options: seededShuffle(
            [
              { id: 'opt_1', text: passage, isCorrect: true, feedback: ui.correctFeedback },
              ...synthesizeSentenceDistractors(passage, '', effectiveLang, action, ui.wrongFeedback, loc)
                .slice(0, 2)
                .map((d, idx) => ({
                  id: `opt_${idx + 2}`,
                  text: d.text,
                  isCorrect: false,
                  feedback: d.feedback,
                })),
            ],
            seedVariant + 1
          ),
          cloze: {
            prefix: '',
            blankWord: cleanTokens[0] || passage,
            suffix: joinTokensForTarget(cleanTokens.slice(1), effectiveLang),
            chips: buildClozeDistractorChips(cleanTokens[0] || passage, cleanTokens, '', effectiveLang, action, seedVariant),
            feedback: ui.clozeCorrectFeedback,
          },
          blocks: {
            correctOrder: cleanTokens,
            pool: seededShuffle(cleanTokens, seedVariant + 3),
            meaningId: transText || ui.blocksInstruction,
            feedback: ui.blocksCorrectFeedback,
          },
        },
      };
    }

    const matchedBankRa = !isMetaPromptOnly
      ? PTE_READ_ALOUD_BANK.find(
          (q) =>
            lowerQ.includes(q.title.toLowerCase()) ||
            q.title.toLowerCase().includes(lowerQ) ||
            q.id === action?.topicTitle
        )
      : PTE_READ_ALOUD_BANK.find(
          (q) =>
            lowerQ.includes(q.title.toLowerCase()) ||
            q.title.toLowerCase().includes(lowerQ) ||
            q.id === action?.topicTitle
        );

    const targetRa: PteReadAloudQuestion =
      matchedBankRa ||
      (!isMetaPromptOnly && customSample.length >= 2
        ? {
            id: 'custom_live_ra',
            category: prefCat || 'academic_science',
            categoryLabel: 'Live Practice',
            categoryIcon: '📖',
            title:
              action?.topicTitle && action.topicTitle.length < 70
                ? action.topicTitle
                : 'Read Aloud Practice',
            passageText: customSample,
            chunkedSegments: customSample
              .split(/(?<=[,;:.!?])\s+/)
              .map((part) => part.trim())
              .filter(Boolean)
              .map((text, idx, arr) => ({ text, isChunkBreak: idx < arr.length - 1 })),
            wordCount: customSample.split(/\s+/).filter(Boolean).length,
            targetWpm: 130,
            examFrequency: 'Live Custom',
            sourceOrigin: 'FIEZEL Live Coach',
            phoneticFocus: customSample
              .replace(/[^a-zA-Z0-9\s\u3040-\u30FF\u4E00-\u9FFF-]/g, ' ')
              .split(/\s+/)
              .filter((w) => w.length >= 4)
              .slice(0, 3)
              .map((word) => ({
                word,
                ipa: resolveUnifiedPronunciation(word, effectiveLang, undefined, loc) || word,
                tip: wbPick('Articulate the final syllable clearly.', 'Ucapkan suku kata akhir dengan artikulasi jelas.', undefined, loc),
              })),
            oneSentenceHack: wbPick(
              'Keep steady pitch across each clause and pause briefly (0.3s) at every // boundary.',
              'Jaga intonasi stabil di tiap klausa dan berhenti sejenak (0.3d) di setiap tanda jeda //.',
              undefined,
              loc
            ),
            examinerTips:
              action?.explanationText ||
              wbPick(
                'Read the sentence accurately with crisp final consonant articulation.',
                'Baca kalimat persis sesuai teks di layar dengan pelafalan konsonan akhir yang jelas.',
                undefined,
                loc
              ),
          }
        : getRandomPteRaQuestion(prefCat));

    const readAloudData: PteReadAloudData = {
      title: targetRa.title,
      passageText: targetRa.passageText,
      chunkedSegments: targetRa.chunkedSegments,
      targetWpm: targetRa.targetWpm,
      phoneticFocus: targetRa.phoneticFocus,
      questionId: targetRa.id,
      category: targetRa.category,
      examFrequency: targetRa.examFrequency,
      sourceOrigin: targetRa.sourceOrigin,
      examinerTips: targetRa.examinerTips,
      oneSentenceHack: targetRa.oneSentenceHack,
      isGeneralReadAloud: false,
      targetLang: effectiveLang,
    };

    return {
      contextMode: 'pte_read_aloud',
      topicTitle: readAloudData.title,
      patternFormula: 'Read Aloud Technique: Syntax Chunking (//) + 130 WPM Balanced Pacing',
      coachExplanation:
        targetRa.examinerTips ||
        wbPick(
          'Pearson scores STEADY RHYTHM rather than speed. Pause briefly only at // phrase breaks—never stop mid-phrase!',
          'Pearson tidak menilai kecepatan balap, melainkan KONSISTENSI IRAMA. Tarik nafas hanya pada tanda jeda //, jangan berhenti di tengah kata frasa!',
          undefined,
          loc
        ),
      pteReadAloudData: readAloudData,
      quiz: {
        prompt: wbPick(
          'Where is the NATURAL breath pause (chunking) in this sentence?',
          'Di manakah jeda nafas (chunking) yang BENAR pada kalimat ini?',
          undefined,
          loc
        ),
        options: [
          {
            id: 'opt_1',
            text: 'The proliferation of renewable technologies // has transformed power grids.',
            isCorrect: true,
            feedback: wbPick(
              'Exact! Pause cleanly between the complex noun subject and the main verb.',
              'Tepat! Pemenggalan dilakukan di antara Subjek Frasa Kompleks dan Kata Kerja Utama.',
              undefined,
              loc
            ),
          },
          {
            id: 'opt_2',
            text: 'The proliferation // of renewable // technologies has // transformed grids.',
            isCorrect: false,
            feedback: wbPick(
              'Too many choppy breaks! Choppy pausing lowers Oral Fluency.',
              'Terlalu banyak jeda patah-patah! Ini akan merusak skor Oral Fluency.',
              undefined,
              loc
            ),
          },
          {
            id: 'opt_3',
            text: 'The proliferation of renewable technologies has transformed power grids without breathing.',
            isCorrect: false,
            feedback: wbPick(
              'Reading with zero pauses makes the final words lose clarity and breath support.',
              'Membaca tanpa jeda sama sekali akan membuat suara kehabisan nafas di akhir.',
              undefined,
              loc
            ),
          },
        ],
        cloze: {
          prefix: 'Recent empirical studies',
          blankWord: 'demonstrate',
          suffix: 'that battery storage provides stable output.',
          chips: ['demonstrate', 'demonstrates', 'demonstrated'],
          feedback: wbPick(
            'Correct! Plural subject "studies" takes the base verb "demonstrate".',
            'Benar! Subjek "studies" berbentuk jamak, jadi gunakan kata kerja dasar "demonstrate".',
            undefined,
            loc
          ),
        },
        blocks: {
          correctOrder: ['Recent', 'empirical', 'studies', 'demonstrate', 'clean', 'energy', 'growth.'],
          pool: ['growth.', 'demonstrate', 'Recent', 'energy', 'studies', 'empirical', 'clean'],
          meaningId: wbPick(
            'Order this academic Read Aloud sentence accurately:',
            'Susun kalimat akademik Read Aloud dengan urutan yang tepat:',
            undefined,
            loc
          ),
          feedback: wbPick(
            'Perfect! Clean academic phrase grouping.',
            'Sempurna! Frasa terangkai dengan sintaksis akademik yang baik.',
            undefined,
            loc
          ),
        },
      },
    };
  }

  // -------------------------------------------------------------

  // 5-C. KASUS PTE ACADEMIC: SCORECARD (PEARSON EVALUATION)
  // -------------------------------------------------------------
  if (
    action?.focusType === 'pte_scorecard' ||
    /scorecard|rapor.*pte|evaluasi.*pte|hasil.*ujian.*pte|pearson.*score/i.test(lowerQ)
  ) {
    const diag = latestPteDiagnostic || null;
    const derivedRemedial = diag
      ? Array.from(
          new Set([
            ...diag.droppedPluralS.map((d) => d.expected),
            ...diag.droppedPastEd.map((d) => d.expected),
            ...diag.hesitationTokens.slice(0, 3),
          ])
        ).filter(Boolean)
      : [];

    const hasTiming = Boolean(diag && diag.durationSec > 0);
    const dynamicNotes = diag
      ? wbFmt(
          'Measured speech pace {wpm} WPM ({pace}) over {sec}s{vocal}{reasons}',
          'Laju tutur terukur {wpm} WPM ({pace}) dalam durasi {sec}d{vocal}{reasons}',
          undefined,
          {
            wpm: diag.wpm,
            pace: diag.pacingQuality === 'optimal'
              ? wbPick('optimal zone 115-152 WPM', 'zona optimal 115-152 WPM', undefined, loc)
              : diag.pacingQuality === 'rushed'
                ? wbPick('too fast', 'terlalu cepat', undefined, loc)
                : wbPick('too slow', 'kurang cepat', undefined, loc),
            sec: diag.durationSec,
            vocal: typeof diag.activeSpeechSec === 'number'
              ? wbFmt(' (active vocalization {asec}s, phonation {pct}%). ', ' (vokal aktif {asec}d, fonasi {pct}%). ', undefined, { asec: diag.activeSpeechSec, pct: Math.round((diag.phonationRatio || 0) * 100) }, loc)
              : '. ',
            reasons: diag.fluencyReasons && diag.fluencyReasons.length > 0
              ? diag.fluencyReasons.slice(0, 2).join('; ') + '.'
              : wbPick('Steady speech rhythm.', 'Irama tutur konsisten.', undefined, loc),
          },
          loc
        )
      : wbPick(
          'No PTE speech sample recorded in this session yet. Speak into the mic to measure Oral Fluency (WPM, pauses, disfluency, & burst rhythm) live.',
          'Belum ada sampel ucapan PTE pada sesi ini. Mulai bicara ke mikrofon agar Oral Fluency (WPM, jeda, disfluensi, & irama burst) terukur secara langsung.',
          undefined,
          loc
        );

    const scorecardData: PteScorecardData = diag
      ? {
          hasLiveSample: true,
          compositeScore: diag.scores.pearsonEstimate,
          fluencyScore: diag.scores.fluency,
          pronunciationScore: diag.scores.pronunciation,
          contentScore: diag.templateAdherence.contentScore,
          passed: diag.scores.passedTarget,
          remedialWords: derivedRemedial,
          examinerNotes: dynamicNotes,
          wpm: diag.wpm,
          articulationWpm: diag.articulationWpm,
          durationSec: diag.durationSec,
          activeSpeechSec: diag.activeSpeechSec,
          phonationRatio: diag.phonationRatio,
          pauseCount: diag.pauseCount,
          hesitationCount: diag.hesitationCount,
          selfCorrectionCount: diag.selfCorrectionCount,
          rhythmScore: diag.rhythmScore,
          measurementSource: diag.measurementSource,
          fluencyReasons: diag.fluencyReasons,
        }
      : {
          hasLiveSample: false,
          compositeScore: 0,
          fluencyScore: 0,
          pronunciationScore: 0,
          contentScore: 0,
          passed: false,
          remedialWords: [],
          examinerNotes: dynamicNotes,
        };

    return {
      contextMode: 'pte_scorecard',
      topicTitle: wbPick('Pearson PTE Official Scorecard', 'Rapor Ujian Resmi Pearson PTE', undefined, loc),
      patternFormula: 'Pearson Metric: Fluency (5.0) + Pronunciation (5.0) + Content (3.0)',
      coachExplanation: diag
        ? hasTiming && diag.scores.passedTarget
          ? wbFmt('Objective evaluation from your latest sample ({src}). You meet the PTE 58+ target.', 'Hasil evaluasi objektif dari sampel ucapan terakhir ({src}). Kamu memenuhi target PTE 58+.', undefined, { src: diag.measurementSource || 'measured' }, loc)
          : wbFmt('Objective evaluation from your latest sample ({src}). Focus on smooth phrasing and clear final consonants.', 'Hasil evaluasi objektif dari sampel ucapan terakhir ({src}). Fokus pada kelancaran jeda dan kejelasan vokal akhir.', undefined, { src: diag.measurementSource || 'measured' }, loc)
        : wbPick('Record a speech sample first to see your Pearson Concordance (/90), WPM pace, active phonation ratio, and pause telemetry.', 'Rekam jawabanmu terlebih dahulu untuk melihat skor Pearson Concordance (/90), laju WPM, rasio fonasi aktif, dan rincian jeda nyata.', undefined, loc),
      pteScorecardData: scorecardData,
      quiz: {
        prompt: wbPick('How is "fluctuations" pronounced naturally?', 'Bagaimana pelafalan kata "fluctuations" yang benar?', undefined, loc),
        options: [
          {
            id: 'opt_1',
            text: wbPick('/ˌflʌk.tʃuˈeɪ.ʃənz/ (with crisp /ʃ/ in -tion)', '/ˌflʌk.tʃuˈeɪ.ʃənz/ (dengan bunyi sh pada -tion)', undefined, loc),
            isCorrect: true,
            feedback: wbPick('Exact! The -tion ending is pronounced /ʃənz/.', 'Tepat sekali! Akhiran -tion dibaca /ʃənz/.', undefined, loc),
          },
          {
            id: 'opt_2',
            text: wbPick('/fluk-tu-a-si-on/ (letter-by-letter reading)', '/fluk-tu-a-si-on/ (pelafalan harfiah)', undefined, loc),
            isCorrect: false,
            feedback: wbPick('Not natural—avoid spelling-based syllable stress.', 'Kurang tepat. Jangan melafalkan huruf demi huruf secara harfiah.', undefined, loc),
          },
        ],
        cloze: {
          prefix: 'Learners must maintain steady',
          blankWord: 'fluency',
          suffix: 'throughout the speech.',
          chips: ['fluency', 'fluent', 'fluently'],
          feedback: wbPick('Right! The noun "fluency" fits after steady.', 'Tepat! Kata benda "fluency" yang dibutuhkan.', undefined, loc),
        },
        blocks: {
          correctOrder: ['Fluency', 'is', 'the', 'key', 'to', 'high', 'scores.'],
          pool: ['scores.', 'key', 'Fluency', 'to', 'high', 'is', 'the'],
          meaningId: wbPick('Order the core PTE fluency principle:', 'Susun kalimat prinsip kelancaran PTE:', undefined, loc),
          feedback: wbPick('Exact! Fluency is the key to high scores.', 'Tepat! Fluency is the key to high scores.', undefined, loc),
        },
      },
    };
  }

  // -------------------------------------------------------------
  // 6. KUMPULAN HASIL REAL-TIME AI (ZERO TEMPLATE STATIS)
  // -------------------------------------------------------------
  const cleanTitle = (action?.topicTitle || query || ui.badge.replace(/^✦\s*/, '')).trim();
  const cleanFormula = (action?.patternFormula || '').trim();
  const cleanExplanation = (action?.coachSpokenScript || action?.explanationText || '').trim();

  const rawTargetSent = (action?.drillTargetSentence || action?.sampleTarget || '').trim();
  const isDegenerateVal = (v: string) => /^[\d\s.,\-/+•:;()]+$/.test(v.trim()) || /^(example|contoh|sample|placeholder|\.\.\.)$/i.test(v.trim());
  const targetSent = isDegenerateVal(rawTargetSent)
    ? !isDegenerateVal(action?.drillTargetSentence || '')
      ? (action?.drillTargetSentence || '').trim()
      : ''
    : rawTargetSent;
  const rawTrapSent = (action?.drillTrapSentence || action?.trapWrongSentence || '').trim();
  const trapSent = isDegenerateVal(rawTrapSent) ? '' : rawTrapSent;
  const hasAnyAiPayload = Boolean(
    (Array.isArray(action?.whiteboardSteps) && action.whiteboardSteps.length > 0) ||
    cleanExplanation ||
    cleanFormula ||
    targetSent
  );

  // Deteksi apakah topik secara eksplisit membahas karakter Kanji/Hanzi/Kana tertentu
  const cjkMatch = `${cleanTitle} ${targetSent}`.match(/[\u4e00-\u9faf\u3040-\u309f\u30a0-\u30ff]/);
  const kakijunHits =
    targetLang === 'ja' || targetLang === 'zh'
      ? resolveKakijunRequestFromPrompt(`${cleanTitle} ${targetSent} ${cleanExplanation}`, targetLang)
      : [];
  const matchedChar = kakijunHits[0]?.char || cjkMatch?.[0] || '';
  const characterData =
    matchedChar &&
    (targetLang === 'ja' || targetLang === 'zh') &&
    (kakijunHits.length > 0 || /kanji|hanzi|hiragana|katakana|huruf|karakter|aksara|tulis|goresan|coret|stroke/i.test(`${cleanTitle} ${cleanExplanation}`))
      ? {
          char: matchedChar,
          reading: (action as any)?.kanjiReading || kakijunHits[0]?.reading || cleanFormula || '',
          meaning: (action as any)?.kanjiMeaning || kakijunHits[0]?.meaningId || cleanTitle,
          radical: '',
          radicalMeaning: '',
          strokesCount: Number((action as any)?.kanjiStrokeCount) || kakijunHits[0]?.strokeCount || 0,
        }
      : undefined;

  let quiz: DynamicQuizData | undefined;
  let standardReading = '';
  let standardMeaning = '';
  if (targetSent) {
    const cleanWords = tokenizeSentenceIntoBlocks(targetSent, effectiveLang);
    const midIdx =
      cleanWords.length > 0
        ? (Math.floor(cleanWords.length / 2) + Math.abs(seedVariant)) % cleanWords.length
        : 0;
    const blankTarget = cleanWords[midIdx] || cleanWords[0] || '';
    const distractorChips = buildClozeDistractorChips(
      blankTarget,
      cleanWords,
      trapSent,
      effectiveLang,
      action,
      seedVariant
    );

    standardReading = resolveUnifiedPronunciation(targetSent, effectiveLang, undefined, loc) || '';
    const liveMeta = translateAndPhoneticizeLiveText(targetSent, effectiveLang, undefined, undefined, undefined, { locale: loc });
    const rawMeaning = loc === 'th' ? liveMeta.translationTh || '' : liveMeta.translationId || '';
    if (rawMeaning && !/^Pahami makna|^ทำความเข้าใจ|^arti kalimat|^arti pola/i.test(rawMeaning)) {
      standardMeaning = rawMeaning;
    }

    const synthesizedDistractors = synthesizeSentenceDistractors(
      targetSent,
      trapSent,
      effectiveLang,
      action,
      ui.wrongFeedback,
      loc
    );
    const rawQuizOptions: DynamicQuizData['options'] = [
      {
        id: 'opt_1',
        text: targetSent,
        isCorrect: true,
        feedback: ui.correctFeedback,
      },
      ...synthesizedDistractors.map((d, idx) => ({
        id: `opt_${idx + 2}`,
        text: d.text,
        isCorrect: false,
        feedback: d.feedback,
      })),
    ];
    const quizOptions = seededShuffle(rawQuizOptions, seedVariant + 1);

    quiz = {
      prompt: action?.drillMeaningPrompt || `Manakah bentuk yang paling tepat untuk "${cleanTitle}"?`,
      options: quizOptions,
      cloze: {
        prefix: joinTokensForTarget(cleanWords.slice(0, midIdx), effectiveLang),
        blankWord: blankTarget,
        suffix: joinTokensForTarget(cleanWords.slice(midIdx + 1), effectiveLang),
        chips: distractorChips.length > 0 ? distractorChips : [blankTarget],
        feedback: ui.clozeCorrectFeedback,
      },
      blocks: {
        correctOrder: cleanWords,
        pool: seededShuffle(cleanWords, seedVariant + 3),
        meaningId: action?.drillMeaningPrompt || `Susun bagian berikut untuk: "${cleanTitle}"`,
        feedback: ui.blocksCorrectFeedback,
      },
    };
  }

  return {
    contextMode: characterData ? 'magic_character' : 'standard_clarity',
    focusType: action?.focusType,
    title: cleanTitle,
    summary: cleanExplanation || cleanFormula,
    sampleTarget: targetSent || undefined,
    sampleMeaningId: standardMeaning || undefined,
    topicTitle: cleanTitle,
    patternFormula: cleanFormula,
    coachExplanation: hasAnyAiPayload
      ? cleanExplanation || cleanFormula
      : `Belum menerima penjelasan visual real-time untuk "${cleanTitle}". Ketik pertanyaan atau pastikan koneksi Tutor aktif.`,
    isOfflineNotice: !hasAnyAiPayload,
    characterData,
    standardTarget: targetSent
      ? { text: targetSent, reading: standardReading, translation: standardMeaning }
      : undefined,
    quiz,
  };
}

/**
 * -------------------------------------------------------------
 * KANVAS KHUSUS 1: PTE ACADEMIC - DESCRIBE IMAGE
 * 50 Authentic Questions from Pearson Real Exam & APEUni Bank
 * Categories: Bar, Line, Pie, Process, Map, Table
 * Interactive Timers (25s Prep & 40s Speak), Keywords, & Universal Formula
 * -------------------------------------------------------------
 */
export const PteDescribeImageCanvas: React.FC<{
  data: PteChartData;
  onSpeakPreview?: (text: string) => void;
  locale?: LearnerLocale;
}> = ({ data, onSpeakPreview, locale = 'id' }) => {
  const [selectedCategory, setSelectedCategory] = useState<'all' | PteChartCategory>('all');
  const [currentQuestionId, setCurrentQuestionId] = useState<string>(data.questionId || 'di_bar_01');
  const [prepSeconds, setPrepSeconds] = useState<number>(25);
  const [isPrepRunning, setIsPrepRunning] = useState<boolean>(false);
  const [speakSeconds, setSpeakSeconds] = useState<number>(40);
  const [isSpeakRunning, setIsSpeakRunning] = useState<boolean>(false);
  const [checkedKeywords, setCheckedKeywords] = useState<Record<string, boolean>>({});
  const [isTemplateOpen, setIsTemplateOpen] = useState<boolean>(false);

  // Active question resolution
  const activeQuestion: PteDescribeImageQuestion =
    getPteQuestionById(currentQuestionId) || PTE_DESCRIBE_IMAGE_BANK[0];

  // Filtered pool based on selectedCategory
  const filteredQuestions =
    selectedCategory === 'all'
      ? PTE_DESCRIBE_IMAGE_BANK
      : getPteQuestionsByCategory(selectedCategory);

  const currentIndex = Math.max(
    0,
    filteredQuestions.findIndex((q) => q.id === activeQuestion.id)
  );

  // Sync external questionId change
  useEffect(() => {
    if (data.questionId && data.questionId !== currentQuestionId) {
      setCurrentQuestionId(data.questionId);
    }
  }, [data.questionId]);

  // Reset timers & state when switching question
  const handleSelectQuestion = (q: PteDescribeImageQuestion) => {
    playFiezelSfx('button_tap');
    setCurrentQuestionId(q.id);
    setPrepSeconds(25);
    setIsPrepRunning(false);
    setSpeakSeconds(40);
    setIsSpeakRunning(false);
    setCheckedKeywords({});
  };

  const handlePrevQuestion = () => {
    const prevIdx = (currentIndex - 1 + filteredQuestions.length) % filteredQuestions.length;
    handleSelectQuestion(filteredQuestions[prevIdx]);
  };

  const handleNextQuestion = () => {
    const nextIdx = (currentIndex + 1) % filteredQuestions.length;
    handleSelectQuestion(filteredQuestions[nextIdx]);
  };

  const handleRandomQuestion = () => {
    playFiezelSfx('button_tap');
    const pool = selectedCategory === 'all' ? PTE_DESCRIBE_IMAGE_BANK : filteredQuestions;
    const randomIdx = Math.floor(Math.random() * pool.length);
    handleSelectQuestion(pool[randomIdx] || pool[0]);
  };

  // Timer 25s Prep
  useEffect(() => {
    let timer: any = null;
    if (isPrepRunning && prepSeconds > 0) {
      timer = setInterval(() => {
        setPrepSeconds((prev) => {
          if (prev <= 1) {
            playFiezelSfx('lesson_complete');
            setIsPrepRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isPrepRunning, prepSeconds]);

  // Timer 40s Speak
  useEffect(() => {
    let timer: any = null;
    if (isSpeakRunning && speakSeconds > 0) {
      timer = setInterval(() => {
        setSpeakSeconds((prev) => {
          if (prev <= 1) {
            playFiezelSfx('lesson_complete');
            setIsSpeakRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isSpeakRunning, speakSeconds]);

  const handleToggleKeyword = (kw: string) => {
    playFiezelSfx('button_tap');
    setCheckedKeywords((prev) => ({ ...prev, [kw]: !prev[kw] }));
  };

  const fullSampleSpoken = `${activeQuestion.universalTemplate.intro} ${activeQuestion.universalTemplate.keyElements} ${activeQuestion.universalTemplate.maximum} ${activeQuestion.universalTemplate.minimum} ${activeQuestion.universalTemplate.conclusion}`;

  const CATEGORY_TABS: Array<{ key: 'all' | PteChartCategory; label: string; icon: string; count: number }> = [
    { key: 'all', label: 'Semua', icon: '📚', count: PTE_DESCRIBE_IMAGE_BANK.length },
    { key: 'bar', label: 'Bar', icon: '📊', count: getPteQuestionsByCategory('bar').length },
    { key: 'line', label: 'Line', icon: '📈', count: getPteQuestionsByCategory('line').length },
    { key: 'pie', label: 'Pie', icon: '🥧', count: getPteQuestionsByCategory('pie').length },
    { key: 'process', label: 'Process', icon: '🔄', count: getPteQuestionsByCategory('process').length },
    { key: 'map', label: 'Map', icon: '🗺️', count: getPteQuestionsByCategory('map').length },
    { key: 'table', label: 'Table', icon: '📋', count: getPteQuestionsByCategory('table').length },
  ];

  return (
    <div className="space-y-3.5" data-testid="pte-describe-image-canvas">
      {/* Top Banner, Category Pills & Question Navigator */}
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between gap-1.5 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full bg-[#E6F4EA] text-[#1B5E34] text-[10.5px] font-extrabold uppercase tracking-wide">
              PTE Academic • Describe Image
            </span>
            <span className="px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#92400E] text-[10px] font-bold">
              🔥 {activeQuestion.examFrequency}
            </span>
          </div>
          <span className="text-[10px] text-[#8C7760] font-semibold">
            {activeQuestion.sourceOrigin}
          </span>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 bg-[#FAF4E8] p-1.5 rounded-2xl scrollbar-none">
          {CATEGORY_TABS.map((tab) => {
            const isSelected = selectedCategory === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  playFiezelSfx('button_tap');
                  setSelectedCategory(tab.key);
                  const newPool = tab.key === 'all' ? PTE_DESCRIBE_IMAGE_BANK : getPteQuestionsByCategory(tab.key);
                  if (newPool.length > 0 && !newPool.some((q) => q.id === activeQuestion.id)) {
                    handleSelectQuestion(newPool[0]);
                  }
                }}
                className={`px-2.5 py-1 rounded-xl text-[10.5px] font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                  isSelected
                    ? 'bg-[#FFFFFF] text-[#231A12] shadow-xs'
                    : 'text-[#8C7760] hover:text-[#5C4A38]'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
                <span className={`text-[9px] px-1 py-0.2 rounded-full ${isSelected ? 'bg-[#FAF4E8] text-[#B45309]' : 'text-[#A89480]'}`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Question Navigator Toolbar */}
        <div className="flex items-center justify-between gap-2 p-1.5 rounded-xl bg-[#FFFDF8] border border-[#EADBCE]">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handlePrevQuestion}
              className="px-2.5 py-1 rounded-lg bg-[#FAF4E8] hover:bg-[#F3EBE0] text-[#5C4A38] text-[10.5px] font-extrabold cursor-pointer active:scale-95 transition-all"
              title="Soal Sebelumnya"
            >
              ◀ Prev
            </button>
            <span className="text-[11px] font-bold text-[#231A12] px-2 py-0.5">
              Soal {currentIndex + 1} / {filteredQuestions.length}
            </span>
            <button
              type="button"
              data-testid="pte-di-next-question-btn"
              onClick={handleNextQuestion}
              className="px-2.5 py-1 rounded-lg bg-[#FAF4E8] hover:bg-[#F3EBE0] text-[#5C4A38] text-[10.5px] font-extrabold cursor-pointer active:scale-95 transition-all flex items-center gap-1"
              title="Soal Grafik Berikutnya"
            >
              <span>Soal Grafik Berikutnya</span>
              <span>▶</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleRandomQuestion}
            className="px-2.5 py-1 rounded-lg bg-[#B45309] hover:bg-[#92400E] text-white text-[10.5px] font-bold cursor-pointer active:scale-95 transition-all flex items-center gap-1"
          >
            <span>🎲</span>
            <span>Acak Soal Ujian Asli</span>
          </button>
        </div>

        {/* Active Question Title & Exam ID */}
        <div className="flex items-start justify-between gap-2 pt-0.5">
          <h4 className="text-xs font-extrabold text-[#231A12] leading-tight">
            {activeQuestion.title}
          </h4>
          <span className="text-[9.5px] font-bold text-[#8C7760] bg-[#FAF6EE] px-1.5 py-0.5 rounded-md shrink-0">
            ID: {activeQuestion.id}
          </span>
        </div>
      </div>

      {/* 2-COLUMN LANDSCAPE SPLIT SCREEN WORKBENCH (DIAGRAM ON LEFT, FORMULA & HACKS ON RIGHT) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
        {/* ==========================================
            KOLOM KIRI: GRAFIK VISUAL, TIMERS, & CHECKLIST KATA KUNCI
           ========================================== */}
        <div className="flex flex-col gap-3">
          {/* SVG / DATA VISUALIZER CONTAINER (6 CATEGORIES) */}
      <div className="p-3 rounded-2xl bg-[#FFFFFF] border border-[#EADBCE] shadow-2xs flex flex-col items-center justify-center min-h-[175px]">
        {/* 1. BAR CHARTS */}
        {activeQuestion.category === 'bar' && (
          <svg viewBox="0 0 360 175" className="w-full h-auto max-h-[175px] select-none">
            <defs>
              <linearGradient id="barGrad0" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#F59E0B" /><stop offset="100%" stopColor="#D97706" /></linearGradient>
              <linearGradient id="barGrad1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10B981" /><stop offset="100%" stopColor="#059669" /></linearGradient>
              <linearGradient id="barGrad2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3B82F6" /><stop offset="100%" stopColor="#2563EB" /></linearGradient>
              <linearGradient id="barGrad3" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8B5CF6" /><stop offset="100%" stopColor="#7C3AED" /></linearGradient>
              <linearGradient id="barGrad4" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#EC4899" /><stop offset="100%" stopColor="#DB2777" /></linearGradient>
              <linearGradient id="barGrad5" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#06B6D4" /><stop offset="100%" stopColor="#0891B2" /></linearGradient>
            </defs>
            {/* Grid lines */}
            <line x1="45" y1="25" x2="345" y2="25" stroke="#F0E6D9" strokeDasharray="3 3" />
            <text x="38" y="28" fontSize="8.5" fill="#8C7760" textAnchor="end">100%</text>
            <line x1="45" y1="65" x2="345" y2="65" stroke="#F0E6D9" strokeDasharray="3 3" />
            <text x="38" y="68" fontSize="8.5" fill="#8C7760" textAnchor="end">65%</text>
            <line x1="45" y1="105" x2="345" y2="105" stroke="#F0E6D9" strokeDasharray="3 3" />
            <text x="38" y="108" fontSize="8.5" fill="#8C7760" textAnchor="end">30%</text>
            <line x1="45" y1="145" x2="345" y2="145" stroke="#D8CBB5" strokeWidth="1.5" />
            <text x="38" y="148" fontSize="8.5" fill="#8C7760" textAnchor="end">0</text>

            {/* Dynamic Bars */}
            {(() => {
              const labels = activeQuestion.renderData.labels || ['Cat A', 'Cat B', 'Cat C', 'Cat D'];
              const values = activeQuestion.renderData.values || [45, 30, 15, 10];
              const maxVal = Math.max(...values, 1);
              const barCount = labels.length;
              const totalWidth = 285;
              const barWidth = Math.min(48, Math.floor((totalWidth - (barCount - 1) * 12) / barCount));
              const startX = 55 + Math.floor((totalWidth - (barCount * barWidth + (barCount - 1) * 12)) / 2);

              return labels.map((lbl, idx) => {
                const val = values[idx] || 0;
                const barHeight = Math.max(8, Math.round((val / maxVal) * 115));
                const x = startX + idx * (barWidth + 12);
                const y = 145 - barHeight;
                const gradId = `url(#barGrad${idx % 6})`;
                const unit = activeQuestion.renderData.unit ? ` ${activeQuestion.renderData.unit}` : '';

                return (
                  <g key={idx}>
                    <rect x={x} y={y} width={barWidth} height={barHeight} rx="4" fill={gradId} />
                    <text x={x + barWidth / 2} y={Math.max(18, y - 5)} fontSize="9" fontWeight="bold" fill="#231A12" textAnchor="middle">
                      {val}{unit.length <= 3 ? unit : ''}
                    </text>
                    <text x={x + barWidth / 2} y="159" fontSize="8.5" fontWeight="600" fill="#5C4A38" textAnchor="middle">
                      {lbl.length > 9 ? lbl.slice(0, 8) + '…' : lbl}
                    </text>
                  </g>
                );
              });
            })()}
          </svg>
        )}

        {/* 2. LINE GRAPHS */}
        {activeQuestion.category === 'line' && (
          <svg viewBox="0 0 360 175" className="w-full h-auto max-h-[175px] select-none">
            <defs>
              <linearGradient id="areaLineGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2563EB" stopOpacity="0.32" />
                <stop offset="100%" stopColor="#2563EB" stopOpacity="0.0" />
              </linearGradient>
            </defs>
            {/* Grid */}
            <line x1="45" y1="25" x2="345" y2="25" stroke="#F0E6D9" strokeDasharray="3 3" />
            <text x="38" y="28" fontSize="8.5" fill="#8C7760" textAnchor="end">
              {activeQuestion.renderData.yAxis?.[3] || 'High'}
            </text>
            <line x1="45" y1="65" x2="345" y2="65" stroke="#F0E6D9" strokeDasharray="3 3" />
            <text x="38" y="68" fontSize="8.5" fill="#8C7760" textAnchor="end">
              {activeQuestion.renderData.yAxis?.[2] || 'Med'}
            </text>
            <line x1="45" y1="105" x2="345" y2="105" stroke="#F0E6D9" strokeDasharray="3 3" />
            <text x="38" y="108" fontSize="8.5" fill="#8C7760" textAnchor="end">
              {activeQuestion.renderData.yAxis?.[1] || 'Low'}
            </text>
            <line x1="45" y1="145" x2="345" y2="145" stroke="#D8CBB5" strokeWidth="1.5" />
            <text x="38" y="148" fontSize="8.5" fill="#8C7760" textAnchor="end">
              {activeQuestion.renderData.yAxis?.[0] || '0'}
            </text>

            {/* Points & Curve */}
            {(() => {
              const rawPoints = activeQuestion.renderData.points || [
                { x: 65, y: 120, label: '30', year: '2015' },
                { x: 145, y: 95, label: '50', year: '2018' },
                { x: 225, y: 65, label: '75', year: '2021' },
                { x: 305, y: 35, label: '110', year: '2024' },
              ];
              const polylineStr = rawPoints.map((p) => `${p.x},${p.y}`).join(' ');
              const polygonStr = `${polylineStr} ${rawPoints[rawPoints.length - 1].x},145 ${rawPoints[0].x},145`;

              return (
                <g>
                  <polygon points={polygonStr} fill="url(#areaLineGrad)" />
                  <polyline points={polylineStr} fill="none" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  {rawPoints.map((pt, pIdx) => (
                    <g key={pIdx}>
                      <circle cx={pt.x} cy={pt.y} r={pIdx === rawPoints.length - 1 ? 5 : 4} fill={pIdx === rawPoints.length - 1 ? '#2563EB' : '#FFFFFF'} stroke="#2563EB" strokeWidth="2" />
                      <text x={pt.x} y={Math.max(18, pt.y - 7)} fontSize="8.5" fontWeight="bold" fill="#1E40AF" textAnchor="middle">
                        {pt.label}
                      </text>
                      <text x={pt.x} y="159" fontSize="8.5" fontWeight="600" fill="#5C4A38" textAnchor="middle">
                        {pt.year}
                      </text>
                    </g>
                  ))}
                </g>
              );
            })()}
          </svg>
        )}

        {/* 3. PIE CHARTS */}
        {activeQuestion.category === 'pie' && (
          <div className="w-full flex items-center justify-between gap-3 py-1">
            <div className="shrink-0 flex items-center justify-center pl-2">
              <svg viewBox="0 0 160 160" className="w-[145px] h-[145px] select-none">
                {(() => {
                  const segments = activeQuestion.renderData.segments || [
                    { label: 'Segment A', pct: 60, color: '#10B981' },
                    { label: 'Segment B', pct: 30, color: '#3B82F6' },
                    { label: 'Segment C', pct: 10, color: '#F59E0B' },
                  ];
                  let currentAngle = 0;
                  return (
                    <g transform="translate(80, 80)">
                      {segments.map((seg, sIdx) => {
                        const angle = (seg.pct / 100) * 360;
                        const startAngle = currentAngle;
                        const endAngle = currentAngle + angle;
                        currentAngle += angle;

                        const rad = Math.PI / 180;
                        const safeEnd = angle >= 360 ? startAngle + 359.99 : endAngle;
                        const r = 62;
                        const innerR = 26;
                        const x1 = r * Math.sin(startAngle * rad);
                        const y1 = -r * Math.cos(startAngle * rad);
                        const x2 = r * Math.sin(safeEnd * rad);
                        const y2 = -r * Math.cos(safeEnd * rad);
                        const x3 = innerR * Math.sin(safeEnd * rad);
                        const y3 = -innerR * Math.cos(safeEnd * rad);
                        const x4 = innerR * Math.sin(startAngle * rad);
                        const y4 = -innerR * Math.cos(startAngle * rad);
                        const largeArc = angle > 180 ? 1 : 0;
                        const d = `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerR} ${innerR} 0 ${largeArc} 0 ${x4} ${y4} Z`;

                        return <path key={sIdx} d={d} fill={seg.color} stroke="#FFFFFF" strokeWidth="1.5" />;
                      })}
                      <circle cx="0" cy="0" r="24" fill="#FFFFFF" />
                      <text x="0" y="3" fontSize="8" fontWeight="bold" fill="#5C4A38" textAnchor="middle">
                        Share %
                      </text>
                    </g>
                  );
                })()}
              </svg>
            </div>
            <div className="flex-1 space-y-1.5 pr-2">
              {(activeQuestion.renderData.segments || []).map((seg, sIdx) => (
                <div key={sIdx} className="flex items-start gap-2 p-1.5 rounded-xl bg-[#FAF6EE] border border-[#EADBCE]">
                  <span className="w-3 h-3 rounded-md shrink-0 mt-0.5" style={{ backgroundColor: seg.color }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between text-[11px] font-bold text-[#231A12]">
                      <span className="truncate">{seg.label}</span>
                      <span className="shrink-0 font-extrabold text-[#B45309]">{seg.pct}%</span>
                    </div>
                    {seg.desc && <p className="text-[9.5px] text-[#8C7760] truncate">{seg.desc}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4. PROCESS DIAGRAMS */}
        {activeQuestion.category === 'process' && (
          <div className="w-full space-y-1.5 py-1">
            <div className="grid grid-cols-2 gap-2">
              {(activeQuestion.renderData.steps || []).map((st, sIdx) => {
                const bgColors = ['#E0F2FE', '#FEF3C7', '#DCFCE7', '#F3E8FF', '#FFE4E6'];
                const borderColors = ['#7DD3FC', '#FDE68A', '#86EFAC', '#D8B4FE', '#FDA4AF'];
                const currentBg = bgColors[sIdx % bgColors.length];
                const currentBorder = borderColors[sIdx % borderColors.length];

                return (
                  <div
                    key={sIdx}
                    className="p-2.5 rounded-xl border flex flex-col justify-between"
                    style={{ backgroundColor: currentBg, borderColor: currentBorder }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="px-1.5 py-0.5 rounded-md bg-white/70 text-[9.5px] font-extrabold uppercase text-[#231A12]">
                        Tahap {st.stepNumber}
                      </span>
                      <span className="text-xs font-bold text-black/40">➔</span>
                    </div>
                    <div className="pt-1.5">
                      <span className="text-xs font-bold text-[#231A12] block leading-tight">{st.title}</span>
                      <span className="text-[10px] text-[#5C4A38] leading-tight block pt-0.5">{st.detail}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 5. MAPS & GEOGRAPHY */}
        {activeQuestion.category === 'map' && (
          <div className="w-full space-y-2 py-1">
            <div className="flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-[#FAF6EE] border border-[#EADBCE]">
              <span className="text-[10.5px] font-bold text-[#8C7760] flex items-center gap-1.5">
                <span>🧭</span>
                <span>Arah Mata Angin: N (Utara) • S (Selatan) • E (Timur) • W (Barat)</span>
              </span>
              <span className="text-[9.5px] font-extrabold px-2 py-0.5 rounded-md bg-[#E6F4EA] text-[#1B5E34]">
                Peta Geografis Resmi
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(activeQuestion.renderData.mapRegions || []).map((reg, rIdx) => (
                <div key={rIdx} className="p-2.5 rounded-xl bg-[#FFFFFF] border border-[#EADBCE] shadow-2xs space-y-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-bold text-[#231A12] truncate">{reg.name}</span>
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: reg.color }} />
                  </div>
                  <div className="text-[11.5px] font-extrabold" style={{ color: reg.color }}>
                    {reg.value}
                  </div>
                  <p className="text-[9.5px] text-[#5C4A38] leading-tight line-clamp-2">{reg.note}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 6. ACADEMIC TABLES */}
        {activeQuestion.category === 'table' && (
          <div className="w-full overflow-x-auto rounded-xl border border-[#EADBCE] bg-[#FFFFFF] shadow-2xs">
            <table className="w-full text-left border-collapse text-[11px]">
              <thead>
                <tr className="bg-[#FAF4E8] border-b border-[#EADBCE]">
                  {(activeQuestion.renderData.headers || []).map((head, hIdx) => (
                    <th key={hIdx} className="px-2.5 py-1.5 font-extrabold text-[#231A12] text-[10px] uppercase tracking-wider">
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(activeQuestion.renderData.rows || []).map((row, rIdx) => {
                  const isHighlighted = rIdx === activeQuestion.renderData.highlightRowIdx;
                  return (
                    <tr
                      key={rIdx}
                      className={`border-b border-[#F0E6D9] last:border-b-0 transition-colors ${
                        isHighlighted ? 'bg-[#FEF3C7]/40 font-bold' : 'hover:bg-[#FAF6EE]'
                      }`}
                    >
                      {row.map((cell, cIdx) => (
                        <td key={cIdx} className="px-2.5 py-1.5 text-[#3D2E20]">
                          {cIdx === 0 && isHighlighted && <span className="inline-block mr-1 text-[#B45309]">★</span>}
                          {cell}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

          {/* TIMERS: 25s PREP & 40s SPEAK + GREEN ZONE SWEET SPOT BANNER */}
          <div className="p-3 rounded-2xl bg-[#FFFDF8] border border-[#EADBCE] space-y-2.5">
            <div className="grid grid-cols-2 gap-2">
              {/* Prep Timer (25s) */}
              <div className="p-2.5 rounded-xl bg-[#FAF6EE] border border-[#EADBCE] flex flex-col items-center justify-center text-center">
                <span className="text-[9.5px] font-bold text-[#8C7760] uppercase tracking-wider">{wbT(locale, 'Prep Time', 'Waktu Persiapan', 'เวลาเตรียมตัว')}</span>
                <div className="text-lg font-extrabold text-[#231A12] my-0.5">
                  {prepSeconds} <span className="text-[10px] font-semibold text-[#8C7760]">{wbT(locale, 'sec', 'detik', 'วินาที')}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    playFiezelSfx('button_tap');
                    if (prepSeconds === 0) setPrepSeconds(25);
                    setIsPrepRunning(!isPrepRunning);
                  }}
                  className="mt-1 px-2.5 py-0.5 rounded-lg bg-[#231A12] text-white text-[10px] font-bold cursor-pointer active:scale-95"
                >
                  {isPrepRunning ? 'Pause' : prepSeconds === 0 ? 'Reset' : wbT(locale, 'Start (25s)', 'Mulai (25d)', 'เริ่ม (25วิ)')}
                </button>
              </div>

              {/* Speaking Timer (40s) */}
              <div className="p-2.5 rounded-xl bg-[#FAF6EE] border border-[#EADBCE] flex flex-col items-center justify-center text-center">
                <span className="text-[9.5px] font-bold text-[#8C7760] uppercase tracking-wider">{wbT(locale, 'Recording Time', 'Waktu Rekam Bicara', 'เวลาพูด')}</span>
                <div className={`text-lg font-extrabold my-0.5 ${speakSeconds <= 10 ? 'text-[#DC2626]' : 'text-[#231A12]'}`}>
                  {speakSeconds} <span className="text-[10px] font-semibold text-[#8C7760]">{wbT(locale, 'sec', 'detik', 'วินาที')}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    playFiezelSfx('button_tap');
                    if (speakSeconds === 0) setSpeakSeconds(40);
                    setIsSpeakRunning(!isSpeakRunning);
                  }}
                  className="mt-1 px-2.5 py-0.5 rounded-lg bg-[#B45309] text-white text-[10px] font-bold cursor-pointer active:scale-95"
                >
                  {isSpeakRunning ? 'Stop' : speakSeconds === 0 ? 'Reset' : wbT(locale, 'Start Speaking (40s)', 'Mulai Bicara (40d)', 'เริ่มพูด (40วิ)')}
                </button>
              </div>
            </div>

            {/* Optimal Green Zone Indicator (Nakul Masterclass 25-28s Rule) */}
            <div className="p-2 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <span className="text-sm">⚡</span>
                <span className="text-[10.5px] font-bold text-[#065F46]">
                  {wbT(locale, 'Ideal Stop Zone:', 'Zona Berhenti Ideal:')} <strong className="font-extrabold text-[#047857]">{wbT(locale, '25-28 Sec!', '25-28 Detik!')}</strong>
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-md bg-[#059669] text-white text-[9px] font-extrabold uppercase">
                Oral Fluency 90
              </span>
            </div>

            {/* Pearson 3-Second Rule Warning Banner */}
            <div className="p-2 rounded-xl bg-[#FEF2F2] border border-[#FCA5A5] flex items-start gap-1.5">
              <span className="text-base select-none shrink-0 leading-none mt-0.5">⚠️</span>
              <p className="text-[10px] text-[#991B1B] font-semibold leading-snug">
                <span className="font-bold">{wbT(locale, 'Pearson 3-Second Rule:', 'Aturan 3 Detik Pearson:')}</span>{' '}
                {wbT(
                  locale,
                  'Never stay silent for >3 seconds! The microphone closes automatically and Fluency scores 0.',
                  'Jangan hening >3 detik! Mikrofon akan otomatis tertutup dan skor Fluency dinilai 0.'
                )}
              </p>
            </div>
          </div>

          {/* CHECKLIST KATA KUNCI TARGET */}
          <div className="p-3 rounded-2xl bg-[#FFFDF8] border border-[#EADBCE] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[#8C7760] uppercase tracking-wider block">
                {wbT(locale, 'Keyword Checklist (Tap as spoken):', 'Checklist Kata Kunci (Ketuk saat diucapkan):')}
              </span>
              <span className="text-[10px] font-bold text-[#B45309]">
                {Object.values(checkedKeywords).filter(Boolean).length} / {activeQuestion.keywords.length} {wbT(locale, 'spoken', 'terucap')}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {activeQuestion.keywords.map((kw, idx) => {
                const isChecked = Boolean(checkedKeywords[kw]);
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleToggleKeyword(kw)}
                    className={`px-2.5 py-1 rounded-xl border text-[11px] font-bold transition-all cursor-pointer active:scale-95 flex items-center gap-1.5 ${
                      isChecked
                        ? 'bg-[#E6F4EA] border-[#34D399] text-[#1B5E34]'
                        : 'bg-[#FFFFFF] border-[#EADBCE] text-[#3D2E20] hover:border-[#B45309]'
                    }`}
                  >
                    <span>{isChecked ? '✓' : '○'}</span>
                    <span>{kw}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ==========================================
            KOLOM KANAN: TEMPLATE 5-BARIS NAKUL & TRIK HACKS DR. JULIAN
           ========================================== */}
        <div className="flex flex-col gap-3">
          {/* RUMUS UNIVERSAL NAKUL 5-BARIS (SELALU TERBUKA & SIAP BACA TANPA SCROLL!) */}
          <div className="p-3.5 rounded-2xl bg-[#FFFDF8] border border-[#EADBCE] shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between pb-1 border-b border-[#F0E6D9]">
              <div className="flex items-center gap-1.5">
                <span className="text-sm">📐</span>
                <span className="text-xs font-extrabold text-[#231A12]">
                  Rumus Universal Nakul (5-Baris Anti-Pause)
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-[#E6F4EA] text-[#1B5E34] text-[9.5px] font-bold">
                100% Fluency Guard
              </span>
            </div>

            <div className="space-y-2 text-[11px] leading-relaxed">
              <div className="p-2 rounded-xl bg-[#FAF6EE] border border-[#EADBCE]">
                <span className="text-[10px] font-extrabold uppercase tracking-wide text-[#B45309] block mb-0.5">
                  1. Introduction (Pembuka):
                </span>
                <span className="text-[#231A12] font-semibold">{activeQuestion.universalTemplate.intro}</span>
              </div>
              <div className="p-2 rounded-xl bg-[#FAF6EE] border border-[#EADBCE]">
                <span className="text-[10px] font-extrabold uppercase tracking-wide text-[#B45309] block mb-0.5">
                  2. Key Elements (Fitur Utama):
                </span>
                <span className="text-[#231A12] font-semibold">{activeQuestion.universalTemplate.keyElements}</span>
              </div>
              <div className="p-2 rounded-xl bg-[#FAF6EE] border border-[#EADBCE]">
                <span className="text-[10px] font-extrabold uppercase tracking-wide text-[#B45309] block mb-0.5">
                  3. Maximum Figure (Tertinggi):
                </span>
                <span className="text-[#231A12] font-semibold">{activeQuestion.universalTemplate.maximum}</span>
              </div>
              <div className="p-2 rounded-xl bg-[#FAF6EE] border border-[#EADBCE]">
                <span className="text-[10px] font-extrabold uppercase tracking-wide text-[#B45309] block mb-0.5">
                  4. Minimum Figure (Terendah):
                </span>
                <span className="text-[#231A12] font-semibold">{activeQuestion.universalTemplate.minimum}</span>
              </div>
              <div className="p-2 rounded-xl bg-[#FAF6EE] border border-[#EADBCE]">
                <span className="text-[10px] font-extrabold uppercase tracking-wide text-[#B45309] block mb-0.5">
                  5. Conclusion (Kesimpulan):
                </span>
                <span className="text-[#231A12] font-semibold">{activeQuestion.universalTemplate.conclusion}</span>
              </div>
            </div>

            {onSpeakPreview && (
              <button
                type="button"
                onClick={() => onSpeakPreview(fullSampleSpoken)}
                className="w-full mt-1 py-2 px-3 rounded-xl bg-[#FAF4E8] hover:bg-[#F3EBE0] text-[#5C4A38] text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors active:scale-95"
              >
                <span>🔊</span>
                <span>Dengarkan Contoh Lengkap 5-Baris (Native Model - 26d)</span>
              </button>
            )}
          </div>

          {/* TRIK & TIPS RAHASIA LULUS PTE 42 (EXAMINER HACKS) */}
          <div className="p-3.5 rounded-2xl bg-[#EFF6FF] border border-[#BFDBFE] shadow-2xs space-y-2">
            <div className="flex items-center gap-1.5 pb-1 border-b border-[#DBEAFE]">
              <span className="text-sm">💡</span>
              <span className="text-xs font-extrabold text-[#1E40AF]">
                Trik & Tips Rahasia Lulus PTE 42 (Dr. Julian Insider Hacks)
              </span>
            </div>

            <div className="space-y-1.5 text-[10.5px] text-[#1E3A8A] leading-snug">
              <div className="p-2 rounded-xl bg-[#DBEAFE]/40 border border-[#BFDBFE] flex items-start gap-1.5">
                <span className="font-bold text-blue-700 shrink-0">⚡ Hack 25-28 Detik:</span>
                <span>Jangan bicara sampai 40 detik! Selesaikan baris ke-5 pada detik 25-28 lalu langsung klik Next. Skor Oral Fluency akan di-cap maksimal (90)!</span>
              </div>
              <div className="p-2 rounded-xl bg-[#DBEAFE]/40 border border-[#BFDBFE] flex items-start gap-1.5">
                <span className="font-bold text-blue-700 shrink-0">🎯 Nada Monoton:</span>
                <span>Gunakan pitch suara datar stabil (135-145 Hz). Pearson AI menyukai irama konsisten tanpa lonjakan nada dramatis.</span>
              </div>
              <div className="p-2 rounded-xl bg-[#DBEAFE]/40 border border-[#BFDBFE] flex items-start gap-1.5">
                <span className="font-bold text-blue-700 shrink-0">🚫 Pantangan Koreksi Diri:</span>
                <span>Salah sebut kata atau angka? JANGAN BERHENTI atau minta maaf! Teruskan membaca tanpa ragu untuk menjaga skor kelancaran.</span>
              </div>
              {activeQuestion.examinerTips && (
                <div className="p-2 rounded-xl bg-white/70 border border-[#BFDBFE] flex items-start gap-1.5 text-[#1E3A8A]">
                  <span className="font-bold text-amber-700 shrink-0">📌 Tips Khusus Grafik Ini:</span>
                  <span>{activeQuestion.examinerTips}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * -------------------------------------------------------------
 * KANVAS KHUSUS 2: PTE ACADEMIC - READ ALOUD (BANK MULTI-TOPIK)
 * 15+ Soal Otentik Pearson & APEUni (Cookery, Perth Ecology, Academic Science)
 * Academic Passage + Syntax Chunking (//) + Pacing Speedometer + Phonetics + Hacks
 * -------------------------------------------------------------
 */
export const PteReadAloudCanvas: React.FC<{
  data: PteReadAloudData;
  onSpeakPreview?: (text: string) => void;
  latestAlignment?: SpeechAlignmentResult | null;
  onActiveQuestionChange?: (info: {
    questionId: string;
    title: string;
    passageText: string;
  }) => void;
  locale?: LearnerLocale;
}> = ({ data, onSpeakPreview, latestAlignment, onActiveQuestionChange, locale = 'id' }) => {
  const isGeneralMode = Boolean(data.isGeneralReadAloud);
  const raLang = data.targetLang || 'en';
  const [selectedCategory, setSelectedCategory] = useState<'all' | PteRaCategory>('all');
  const [currentQuestionId, setCurrentQuestionId] = useState<string>(data.questionId || 'ra_cook_01');
  const [prepSeconds, setPrepSeconds] = useState<number>(35);
  const [isPrepRunning, setIsPrepRunning] = useState<boolean>(false);
  const [speakSeconds, setSpeakSeconds] = useState<number>(40);
  const [isSpeakRunning, setIsSpeakRunning] = useState<boolean>(false);

  const customLiveQuestion: PteReadAloudQuestion | null =
    data.questionId === 'custom_live_ra' && data.passageText
      ? {
          id: 'custom_live_ra',
          category: 'academic_science',
          categoryLabel: 'Live Practice',
          categoryIcon: '📖',
          title: data.title || 'Read Aloud Practice',
          passageText: data.passageText,
          chunkedSegments: data.chunkedSegments,
          wordCount: data.passageText.split(/\s+/).filter(Boolean).length,
          targetWpm: data.targetWpm || 130,
          examFrequency: data.examFrequency || 'Live Custom',
          sourceOrigin: data.sourceOrigin || 'FIEZEL Live Coach',
          phoneticFocus: data.phoneticFocus || [],
          oneSentenceHack: data.oneSentenceHack || '',
          examinerTips: data.examinerTips || '',
        }
      : null;

  // Active question resolution
  const activeQuestion: PteReadAloudQuestion =
    currentQuestionId === 'custom_live_ra' && customLiveQuestion
      ? customLiveQuestion
      : getPteRaQuestionById(currentQuestionId) || PTE_READ_ALOUD_BANK[0];

  useEffect(() => {
    if (onActiveQuestionChange && activeQuestion?.passageText) {
      onActiveQuestionChange({
        questionId: activeQuestion.id,
        title: activeQuestion.title,
        passageText: activeQuestion.passageText,
      });
    }
  }, [activeQuestion.id, activeQuestion.title, activeQuestion.passageText]);

  // Filtered pool based on selectedCategory
  const filteredQuestions =
    selectedCategory === 'all'
      ? PTE_READ_ALOUD_BANK
      : getPteRaQuestionsByCategory(selectedCategory);

  const currentIndex = Math.max(
    0,
    filteredQuestions.findIndex((q) => q.id === activeQuestion.id)
  );

  // Sync external questionId change
  useEffect(() => {
    if (data.questionId && data.questionId !== currentQuestionId) {
      setCurrentQuestionId(data.questionId);
    }
  }, [data.questionId]);

  // Reset timers when changing question
  const handleSelectQuestion = (q: PteReadAloudQuestion) => {
    playFiezelSfx('button_tap');
    setCurrentQuestionId(q.id);
    setPrepSeconds(35);
    setIsPrepRunning(false);
    setSpeakSeconds(40);
    setIsSpeakRunning(false);
  };

  const handlePrevQuestion = () => {
    const prevIdx = (currentIndex - 1 + filteredQuestions.length) % filteredQuestions.length;
    handleSelectQuestion(filteredQuestions[prevIdx]);
  };

  const handleNextQuestion = () => {
    const nextIdx = (currentIndex + 1) % filteredQuestions.length;
    handleSelectQuestion(filteredQuestions[nextIdx]);
  };

  const handleRandomQuestion = () => {
    playFiezelSfx('button_tap');
    const pool = selectedCategory === 'all' ? PTE_READ_ALOUD_BANK : filteredQuestions;
    const randomIdx = Math.floor(Math.random() * pool.length);
    handleSelectQuestion(pool[randomIdx] || pool[0]);
  };

  // Timer 35s Prep
  useEffect(() => {
    let timer: any = null;
    if (isPrepRunning && prepSeconds > 0) {
      timer = setInterval(() => {
        setPrepSeconds((prev) => {
          if (prev <= 1) {
            playFiezelSfx('lesson_complete');
            setIsPrepRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isPrepRunning, prepSeconds]);

  // Timer 40s Speak
  useEffect(() => {
    let timer: any = null;
    if (isSpeakRunning && speakSeconds > 0) {
      timer = setInterval(() => {
        setSpeakSeconds((prev) => {
          if (prev <= 1) {
            playFiezelSfx('lesson_complete');
            setIsSpeakRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isSpeakRunning, speakSeconds]);

  const CATEGORY_TABS: Array<{ key: 'all' | PteRaCategory; label: string; icon: string; count: number }> = [
    { key: 'all', label: 'Semua Soal', icon: '📚', count: PTE_READ_ALOUD_BANK.length },
    { key: 'cookery_hospitality', label: 'Cookery & Hospitality', icon: '🍳', count: getPteRaQuestionsByCategory('cookery_hospitality').length },
    { key: 'australia_perth', label: 'Perth & WA Ecology', icon: '☀️', count: getPteRaQuestionsByCategory('australia_perth').length },
    { key: 'academic_science', label: 'Academic & Science', icon: '🔬', count: getPteRaQuestionsByCategory('academic_science').length },
  ];

  return (
    <div className="space-y-3.5" data-testid="pte-read-aloud-canvas">
      {/* Top Banner, Category Pills & Question Navigator */}
      <div className="flex flex-col gap-2.5 min-w-0 max-w-full">
        <div className="flex items-center justify-between gap-1.5 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full bg-[#E6F4EA] text-[#1B5E34] text-[10.5px] font-extrabold uppercase tracking-wide">
              {isGeneralMode
                ? `Latihan Read Aloud • ${raLang === 'ja' ? '日本語' : raLang === 'zh' ? '中文' : 'English'}`
                : 'PTE Academic • Read Aloud'}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#92400E] text-[10px] font-bold">
              🔥 {activeQuestion.examFrequency}
            </span>
          </div>
          <span className="text-[10px] text-[#8C7760] font-semibold">
            {activeQuestion.sourceOrigin}
          </span>
        </div>

        {/* Category Filter Pills (khusus PTE bank) */}
        {!isGeneralMode && (
          <div className="w-full max-w-full min-w-0 flex flex-wrap items-center gap-1 pb-1 bg-[#FAF4E8] p-1.5 rounded-2xl">
            {CATEGORY_TABS.map((tab) => {
              const isSelected = selectedCategory === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => {
                    playFiezelSfx('button_tap');
                    setSelectedCategory(tab.key);
                    const newPool = tab.key === 'all' ? PTE_READ_ALOUD_BANK : getPteRaQuestionsByCategory(tab.key);
                    if (newPool.length > 0 && !newPool.some((q) => q.id === activeQuestion.id)) {
                      handleSelectQuestion(newPool[0]);
                    }
                  }}
                  className={`px-2.5 py-1 rounded-xl text-[10.5px] font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                    isSelected
                      ? 'bg-[#FFFFFF] text-[#231A12] shadow-xs'
                      : 'text-[#8C7760] hover:text-[#5C4A38]'
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                  <span className={`text-[9px] px-1 py-0.2 rounded-full ${isSelected ? 'bg-[#FAF4E8] text-[#B45309]' : 'text-[#A89480]'}`}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Question Navigator Toolbar (khusus PTE bank) */}
        {!isGeneralMode && (
          <div className="flex items-center justify-between gap-2 p-1.5 rounded-xl bg-[#FFFDF8] border border-[#EADBCE]">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handlePrevQuestion}
                className="px-2.5 py-1 rounded-lg bg-[#FAF4E8] hover:bg-[#F3EBE0] text-[#5C4A38] text-[10.5px] font-extrabold cursor-pointer active:scale-95 transition-all"
                title="Soal Sebelumnya"
              >
                ◀ Prev
              </button>
              <span className="text-[11px] font-bold text-[#231A12] px-2 py-0.5">
                Soal {currentIndex + 1} / {filteredQuestions.length}
              </span>
              <button
                type="button"
                data-testid="pte-ra-next-question-btn"
                onClick={handleNextQuestion}
                className="px-2.5 py-1 rounded-lg bg-[#FAF4E8] hover:bg-[#F3EBE0] text-[#5C4A38] text-[10.5px] font-extrabold cursor-pointer active:scale-95 transition-all flex items-center gap-1"
                title="Soal Bacaan Berikutnya"
              >
                <span>Soal Berikutnya</span>
                <span>▶</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleRandomQuestion}
              className="px-2.5 py-1 rounded-lg bg-[#B45309] hover:bg-[#92400E] text-white text-[10.5px] font-bold cursor-pointer active:scale-95 transition-all flex items-center gap-1"
            >
              <span>🎲</span>
              <span>Acak Soal Ujian Asli</span>
            </button>
          </div>
        )}

        {/* Active Question Title & Exam ID */}
        <div className="flex items-start justify-between gap-2 pt-0.5">
          <h4 className="text-xs font-extrabold text-[#231A12] leading-tight">
            {activeQuestion.title}
          </h4>
          {!isGeneralMode && (
            <span className="text-[9.5px] font-bold text-[#8C7760] bg-[#FAF6EE] px-1.5 py-0.5 rounded-md shrink-0">
              ID: {activeQuestion.id} • {activeQuestion.wordCount} Kata
            </span>
          )}
        </div>
      </div>

      {/* 2-COLUMN LANDSCAPE SPLIT SCREEN WORKBENCH */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
        {/* ==========================================
            KOLOM KIRI: TEKS AKADEMIK CHUNKING & TIMERS
           ========================================== */}
        <div className="md:col-span-7 flex flex-col gap-3">
          {/* Academic Passage with Chunking Breaks */}
          <div className="p-4 rounded-2xl bg-[#FFFFFF] border border-[#EADBCE] shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between pb-1 border-b border-[#F0E6D9]">
              <span className="text-[10px] font-bold text-[#8C7760] uppercase tracking-wider block">
                {isGeneralMode
                  ? 'Kalimat Target untuk Dibaca Lantang'
                  : 'Teks Akademik Resmi & Pemenggalan Nafas (Chunking)'}
              </span>
              {!isGeneralMode && (
                <span className="text-[10px] font-extrabold text-[#B45309]">
                  Target: {activeQuestion.targetWpm} WPM
                </span>
              )}
            </div>

            <div className="text-xs sm:text-[13px] leading-relaxed font-semibold text-[#231A12]">
              {isGeneralMode && (raLang === 'ja' || raLang === 'zh') ? (
                <JapaneseRubyDisplay
                  as="div"
                  text={activeQuestion.passageText}
                  targetLang={raLang}
                  showFurigana={true}
                  showRomaji={!data.readingGuide}
                  pronunciationTestId="ra-passage-pronunciation"
                  className="text-sm sm:text-base font-bold text-[#231A12]"
                />
              ) : (
                activeQuestion.chunkedSegments.map((seg, idx) => (
                  <React.Fragment key={idx}>
                    <span>{seg.text}</span>
                    {idx < activeQuestion.chunkedSegments.length - 1 && (
                      <span className="inline-flex items-center mx-1 px-1.5 py-0.5 rounded-md bg-[#FDE8E4] text-[#B85D43] font-extrabold text-[10px] select-none">
                        // jeda
                      </span>
                    )}
                  </React.Fragment>
                ))
              )}
            </div>

            {isGeneralMode && (data.readingGuide || data.translationText) && (
              <div className="mt-2 p-2.5 rounded-xl bg-[#FAF4E8] border border-[#EADBCE] space-y-1 text-xs">
                {data.readingGuide && (
                  <div>
                    <span className="font-bold text-[#8C7760]">Cara Baca: </span>
                    <span className="font-semibold text-[#B45309]">{data.readingGuide}</span>
                  </div>
                )}
                {data.translationText && (
                  <div>
                    <span className="font-bold text-[#8C7760]">Terjemahan: </span>
                    <span className="font-semibold text-[#231A12]">{data.translationText}</span>
                  </div>
                )}
              </div>
            )}

            {onSpeakPreview && (
              <button
                type="button"
                onClick={() => onSpeakPreview(activeQuestion.passageText)}
                className="mt-1 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FAF4E8] hover:bg-[#F3EBE0] text-[#5C4A38] text-[11px] font-bold cursor-pointer transition-colors active:scale-95"
              >
                <span>🔊</span>
                <span>
                  {isGeneralMode
                    ? 'Dengarkan Contoh Pengucapan'
                    : `Dengarkan Contoh Bacaan Pacing Ideal (${activeQuestion.targetWpm} WPM)`}
                </span>
              </button>
            )}

            {latestAlignment &&
              latestAlignment.expectedText.trim() === activeQuestion.passageText.trim() &&
              latestAlignment.tokens.length > 0 && (
                <div
                  data-testid="read-aloud-alignment-feedback"
                  className={`mt-2 p-2.5 rounded-xl border text-xs space-y-1.5 ${
                    latestAlignment.passed
                      ? 'bg-[#E6F4EA] border-[#6EE7B7] text-[#14532D]'
                      : 'bg-[#FEF2F2] border-[#FCA5A5] text-[#7F1D1D]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 font-bold text-[11px]">
                    <span>
                      {latestAlignment.passed ? wbT(locale, '✓ Pronunciation on Target', '✓ Pelafalan Sesuai Target') : wbT(locale, '✕ Refine Pronunciation & Words', '✕ Perbaiki Pengucapan & Kata')}
                    </span>
                    <span>
                      {Math.round(latestAlignment.wordAccuracy * 100)}% {wbT(locale, 'Words', 'Kata')} •{' '}
                      {Math.round(latestAlignment.phoneticAccuracy * 100)}% {wbT(locale, 'Phonetics', 'Fonetik')}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1 leading-normal">
                    {latestAlignment.tokens.map((tok, i) => (
                      <span
                        key={`${tok.word}-${i}`}
                        className={`px-1.5 py-0.5 rounded-md font-semibold text-[11px] ${
                          tok.status === 'match'
                            ? 'bg-[#DCFCE7] text-[#166534]'
                            : tok.status === 'close'
                              ? 'bg-[#FEF3C7] text-[#92400E]'
                              : 'bg-[#FEE2E2] text-[#991B1B] underline decoration-wavy'
                        }`}
                        title={
                          tok.status === 'miss'
                            ? wbT(locale, 'Missed while reading', 'Terlewat saat membaca')
                            : tok.heard
                              ? `${wbT(locale, 'Heard:', 'Terdengar:')} "${tok.heard}"`
                              : undefined
                        }
                      >
                        {tok.word}
                        {tok.status === 'wrong' && tok.heard ? ` (${tok.heard})` : ''}
                      </span>
                    ))}
                  </div>
                </div>
              )}
          </div>

          {/* TIMERS: 35s PREP & 40s SPEAK (khusus PTE Academic) */}
          {!isGeneralMode && (
            <div className="p-3 rounded-2xl bg-[#FFFDF8] border border-[#EADBCE] space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
                {/* Prep Timer (35s) */}
                <div className="p-2.5 rounded-xl bg-[#FAF6EE] border border-[#EADBCE] flex flex-col items-center justify-center text-center">
                  <span className="text-[9.5px] font-bold text-[#8C7760] uppercase tracking-wider">{wbT(locale, 'Prep Time', 'Waktu Persiapan')}</span>
                  <div className="text-lg font-extrabold text-[#231A12] my-0.5">
                    {prepSeconds} <span className="text-[10px] font-semibold text-[#8C7760]">{wbT(locale, 'sec', 'detik')}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      playFiezelSfx('button_tap');
                      if (prepSeconds === 0) setPrepSeconds(35);
                      setIsPrepRunning(!isPrepRunning);
                    }}
                    className="mt-1 px-2.5 py-0.5 rounded-lg bg-[#231A12] text-white text-[10px] font-bold cursor-pointer active:scale-95"
                  >
                    {isPrepRunning ? 'Pause' : prepSeconds === 0 ? 'Reset' : wbT(locale, 'Start (35s)', 'Mulai (35d)')}
                  </button>
                </div>

                {/* Speaking Timer (40s) */}
                <div className="p-2.5 rounded-xl bg-[#FAF6EE] border border-[#EADBCE] flex flex-col items-center justify-center text-center">
                  <span className="text-[9.5px] font-bold text-[#8C7760] uppercase tracking-wider">{wbT(locale, 'Recording Time', 'Waktu Rekam Bicara')}</span>
                  <div className={`text-lg font-extrabold my-0.5 ${speakSeconds <= 10 ? 'text-[#DC2626]' : 'text-[#231A12]'}`}>
                    {speakSeconds} <span className="text-[10px] font-semibold text-[#8C7760]">{wbT(locale, 'sec', 'detik')}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      playFiezelSfx('button_tap');
                      if (speakSeconds === 0) setSpeakSeconds(40);
                      setIsSpeakRunning(!isSpeakRunning);
                    }}
                    className="mt-1 px-2.5 py-0.5 rounded-lg bg-[#B45309] text-white text-[10px] font-bold cursor-pointer active:scale-95"
                  >
                    {isSpeakRunning ? 'Stop' : speakSeconds === 0 ? 'Reset' : wbT(locale, 'Start Speaking (40s)', 'Mulai Bicara (40d)')}
                  </button>
                </div>
              </div>

              {/* Pacing Speedometer Alert (khusus PTE) */}
              <div className="p-2 rounded-xl bg-[#FAF6EE] border border-[#EADBCE] flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">⏱️</span>
                  <div>
                    <span className="text-xs font-bold text-[#231A12] block">{wbT(locale, 'Steady Pacing (120-140 WPM)', 'Pacing Konsisten (120 - 140 WPM)')}</span>
                    <span className="text-[9.5px] text-[#8C7760]">{wbT(locale, 'Take a short breath only at // breaks', 'Tarik nafas pendek hanya pada tanda jeda //')}</span>
                  </div>
                </div>
                <div className="px-2 py-1 rounded-lg bg-[#E6F4EA] text-[#1B5E34] text-[10px] font-extrabold shrink-0">
                  Ideal Range
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ==========================================
            KOLOM KANAN: TITIK KRITIS FONETIK & HACKS
           ========================================== */}
        <div className="md:col-span-5 flex flex-col gap-3">
          {/* Articulation & Phonetic Chips */}
          <div className="p-3.5 rounded-2xl bg-[#FFFDF8] border border-[#EADBCE] shadow-2xs space-y-2">
            <span className="text-[10px] font-bold text-[#8C7760] uppercase tracking-wider block pb-1 border-b border-[#F0E6D9]">
              {wbT(locale, 'Key Articulation & Pronunciation Spots:', 'Titik Kritis Artikulasi & Pelafalan:')}
            </span>
            <div className="grid grid-cols-1 gap-2">
              {activeQuestion.phoneticFocus.map((p, idx) => (
                <div
                  key={idx}
                  className="p-2 rounded-xl bg-[#FAF6EE] border border-[#EADBCE] flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-extrabold text-[#231A12]">{p.word}</span>
                    <span className="text-[10px] font-mono font-bold text-[#B45309]">{p.ipa}</span>
                  </div>
                  <p className="text-[9.5px] text-[#5C4A38] mt-1 leading-snug">{p.tip}</p>
                  {onSpeakPreview && (
                    <button
                      type="button"
                      onClick={() => onSpeakPreview(p.word)}
                      className="mt-1 text-left text-[9.5px] font-bold text-[#B85D43] hover:underline cursor-pointer"
                    >
                      {wbT(locale, '🔊 Preview word pronunciation', '🔊 Tes dengar suku kata')}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {!isGeneralMode ? (
            <div className="p-3.5 rounded-2xl bg-[#EFF6FF] border border-[#BFDBFE] shadow-2xs space-y-2">
              <div className="flex items-center gap-1.5 pb-1 border-b border-[#DBEAFE]">
                <span className="text-sm">💡</span>
                <span className="text-xs font-extrabold text-[#1E40AF]">
                  {wbT(locale, 'PTE 42+ Read Aloud Tips & Strategy', 'Trik & Tips Rahasia Lulus PTE 42 Read Aloud')}
                </span>
              </div>

              <div className="space-y-1.5 text-[10.5px] text-[#1E3A8A] leading-snug">
                <div className="p-2 rounded-xl bg-[#DBEAFE]/40 border border-[#BFDBFE] flex flex-col gap-1">
                  <span className="font-bold text-blue-700">{wbT(locale, '⚡ One-Sentence Hack:', '⚡ Trik 1-Kalimat APEUni (One-Sentence Hack):')}</span>
                  <span>{activeQuestion.oneSentenceHack}</span>
                </div>
                <div className="p-2 rounded-xl bg-[#DBEAFE]/40 border border-[#BFDBFE] flex items-start gap-1.5">
                  <span className="font-bold text-blue-700 shrink-0">🎯 Monotone Pitch:</span>
                  <span>{wbT(locale, 'Hold a steady 135-145 Hz pitch for optimal fluency recognition.', 'Pertahankan nada datar 135-145 Hz. Pearson acoustic engine mendeteksi kelancaran konstan dengan skor kelancaran tertinggi.')}</span>
                </div>
                <div className="p-2 rounded-xl bg-[#DBEAFE]/40 border border-[#BFDBFE] flex items-start gap-1.5">
                  <span className="font-bold text-blue-700 shrink-0">{wbT(locale, '💨 0.3s Pause:', '💨 Jeda 0.3 Detik:')}</span>
                  <span>{wbT(locale, 'Take a brief breath at // breaks without audible sighing.', 'Ambil nafas pendek di tanda // tanpa menghela nafas keras di mikrofon.')}</span>
                </div>
                {activeQuestion.examinerTips && (
                  <div className="p-2 rounded-xl bg-white/70 border border-[#BFDBFE] flex items-start gap-1.5 text-[#1E3A8A]">
                    <span className="font-bold text-amber-700 shrink-0">{wbT(locale, '📌 Examiner Tip:', '📌 Tips Penguji:')}</span>
                    <span>{activeQuestion.examinerTips}</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-[#FFFDF8] border border-[#EADBCE] shadow-2xs space-y-2">
              <div className="flex items-center gap-1.5 pb-1 border-b border-[#F0E6D9]">
                <span className="text-sm">📖</span>
                <span className="text-xs font-extrabold text-[#231A12]">
                  {wbT(locale, 'Read Aloud & AI Evaluation Guide', 'Panduan Baca Nyaring & Evaluasi AI')}
                </span>
              </div>
              <div className="space-y-1.5 text-[10.5px] text-[#3D2E20] leading-snug">
                {activeQuestion.examinerTips && (
                  <div className="p-2 rounded-xl bg-[#FAF4E8] border border-[#EADBCE]">
                    <span>{activeQuestion.examinerTips}</span>
                  </div>
                )}
                {data.translationText && (
                  <div className="p-2 rounded-xl bg-[#E6F4EA] border border-[#BBF7D0] text-[#14532D]">
                    <span className="font-bold block">{wbT(locale, 'Translation:', 'Terjemahan:')}</span>
                    <span>{data.translationText}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


/**
 * -------------------------------------------------------------
 * KANVAS KHUSUS 3: PTE ACADEMIC - OFFICIAL SCORECARD
 * Pearson Concordance Circle (/90) + Enabling Skills Breakdown + Remedial Drill
 * -------------------------------------------------------------
 */
export const PteScorecardCanvas: React.FC<{
  data: PteScorecardData;
  onSpeakPreview?: (text: string) => void;
}> = ({ data, onSpeakPreview }) => {
  const hasSample = data.hasLiveSample !== false;
  return (
    <div className="space-y-3.5" data-testid="pte-scorecard-canvas">
      {/* Header Official Scorecard */}
      <div className="flex items-center justify-between gap-2">
        <span className="px-2.5 py-0.5 rounded-full bg-[#FAF4E8] border border-[#EADBCE] text-[#5C4A38] text-[10.5px] font-extrabold uppercase tracking-wide">
          Official Pearson Evaluation
        </span>
        <span
          className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-extrabold uppercase ${
            !hasSample
              ? 'bg-[#F3EDE2] text-[#6B5A48]'
              : data.passed
                ? 'bg-[#E6F4EA] text-[#1B5E34]'
                : 'bg-[#FEF2F2] text-[#DC2626]'
          }`}
        >
          {!hasSample ? 'MENUNGGU SAMPEL SUARA' : data.passed ? '✓ TARGET TERCAPAI' : '⚠️ REMEDIAL WAJIB'}
        </span>
      </div>

      {/* Big Score Circle & Metric Summary */}
      <div className="p-4 rounded-2xl bg-[#FFFFFF] border border-[#EADBCE] shadow-2xs flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
        <div
          className={`relative w-20 h-20 rounded-full bg-[#FAF6EE] border-4 flex flex-col items-center justify-center shrink-0 ${
            !hasSample ? 'border-[#D7C7B2]' : data.passed ? 'border-[#34D399]' : 'border-[#F59E0B]'
          }`}
        >
          <span className="text-2xl font-extrabold text-[#231A12] leading-none">
            {hasSample ? data.compositeScore : '--'}
          </span>
          <span className="text-[9px] font-bold text-[#8C7760]">/ 90</span>
        </div>
        <div className="space-y-1.5">
          <h4 className="text-xs font-extrabold text-[#231A12]">Pearson Academic Concordance</h4>
          <p className="text-[11px] text-[#5C4A38] leading-snug">
            {data.examinerNotes}
          </p>
          {hasSample && typeof data.wpm === 'number' && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              <span className="px-2 py-0.5 rounded-full bg-[#FAF4E8] border border-[#EADBCE] text-[10px] font-bold text-[#5C4A38]">
                {data.wpm} WPM
              </span>
              {typeof data.activeSpeechSec === 'number' && typeof data.durationSec === 'number' && (
                <span className="px-2 py-0.5 rounded-full bg-[#FAF4E8] border border-[#EADBCE] text-[10px] font-bold text-[#5C4A38]">
                  Aktif {data.activeSpeechSec}d / {data.durationSec}d
                </span>
              )}
              {typeof data.phonationRatio === 'number' && (
                <span className="px-2 py-0.5 rounded-full bg-[#FAF4E8] border border-[#EADBCE] text-[10px] font-bold text-[#5C4A38]">
                  Fonasi {Math.round(data.phonationRatio * 100)}%
                </span>
              )}
              {typeof data.pauseCount === 'number' && (
                <span className="px-2 py-0.5 rounded-full bg-[#FAF4E8] border border-[#EADBCE] text-[10px] font-bold text-[#5C4A38]">
                  Jeda &ge;0.7d: {data.pauseCount}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Subskills Breakdown */}
      <div className="p-3.5 rounded-2xl bg-[#FFFDF8] border border-[#EADBCE] space-y-2.5">
        <span className="text-[10px] font-bold text-[#8C7760] uppercase tracking-wider block">
          Rincian Kemampuan Inti (Enabling Skills):
        </span>
        <div className="space-y-2 text-xs font-semibold">
          {/* Fluency */}
          <div>
            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-[#231A12]">Oral Fluency (Kelancaran Irama)</span>
              <span className="font-bold text-[#B45309]">
                {hasSample ? `${data.fluencyScore} / 5.0` : '-- / 5.0'}
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-[#FAF4E8] overflow-hidden">
              <div
                className="h-full rounded-full bg-[#B45309]"
                style={{ width: `${hasSample ? (data.fluencyScore / 5.0) * 100 : 0}%` }}
              />
            </div>
            {hasSample && data.fluencyReasons && data.fluencyReasons.length > 0 && (
              <p className="mt-1 text-[10px] text-[#78614A] leading-snug">
                {data.fluencyReasons.slice(0, 3).join(' • ')}
              </p>
            )}
          </div>

          {/* Pronunciation */}
          <div>
            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-[#231A12]">Pronunciation (Kejelasan Lafal)</span>
              <span className="font-bold text-[#10B981]">
                {hasSample ? `${data.pronunciationScore} / 5.0` : '-- / 5.0'}
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-[#FAF4E8] overflow-hidden">
              <div
                className="h-full rounded-full bg-[#10B981]"
                style={{ width: `${hasSample ? (data.pronunciationScore / 5.0) * 100 : 0}%` }}
              />
            </div>
          </div>

          {/* Content */}
          <div>
            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-[#231A12]">Content (Kelengkapan Informasi)</span>
              <span className="font-bold text-[#3B82F6]">
                {hasSample ? `${data.contentScore} / 3.0` : '-- / 3.0'}
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-[#FAF4E8] overflow-hidden">
              <div
                className="h-full rounded-full bg-[#3B82F6]"
                style={{ width: `${hasSample ? (data.contentScore / 3.0) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Remedial Words List */}
      {data.remedialWords.length > 0 && (
        <div className="p-3 rounded-2xl bg-[#FEF2F2] border border-[#FCA5A5] space-y-1.5">
          <span className="text-[10px] font-bold text-[#991B1B] uppercase tracking-wider block">
            Kata yang Perlu Dilatih Ulang (Remedial Words):
          </span>
          <div className="flex flex-wrap gap-1.5">
            {data.remedialWords.map((word, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onSpeakPreview && onSpeakPreview(word)}
                className="px-2.5 py-1 rounded-xl bg-white border border-[#F87171] text-[#991B1B] text-xs font-bold flex items-center gap-1 cursor-pointer hover:bg-[#FEE2E2]"
              >
                <span>🔊</span>
                <span>{word}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * -------------------------------------------------------------
 * KANVAS KHUSUS SSW SENSEI: PAPAN TAKTIS HALAMAN, TRIK WAKAI PAPA+,
 * KAMUS PEMULA & KOTOBA, SERTA CEK PAHAM KILAT 3 OPSI PROMETRIC
 * -------------------------------------------------------------
 */
export const SswTacticalBoardCanvas: React.FC<{
  initialPageNumber: number;
  initialStepNumber: number;
  personaName: string;
  onSpeakPreview?: (text: string, spokenLang?: string) => void;
  onAskSensei?: (question: string) => void;
  onEvaluatePractice?: (...args: any[]) => void;
}> = ({
  initialPageNumber,
  initialStepNumber,
  personaName,
  onSpeakPreview,
  onAskSensei,
  onEvaluatePractice,
}) => {
  const [activePage, setActivePage] = useState<number>(initialPageNumber || 1);
  const [requestedStep, setRequestedStep] = useState<number | undefined>(initialStepNumber);
  const [showFurigana, setShowFurigana] = useState<boolean>(true);
  const [pageKotoba, setPageKotoba] = useState<SswKotobaItem[]>([]);
  const [activeQuiz, setActiveQuiz] = useState<SswDrawnQuestionPayload | null>(null);
  const [quizGrade, setQuizGrade] = useState<SswGradeQuizResult | null>(null);
  const [isLoadingQuiz, setIsLoadingQuiz] = useState<boolean>(false);
  const [stateTick, setStateTick] = useState<number>(0);

  const totalPages = SSW_MASTER_KB.meta.totalPdfPages || 91;

  useEffect(() => {
    setActivePage(initialPageNumber || 1);
    setRequestedStep(initialStepNumber);
  }, [initialPageNumber, initialStepNumber]);

  useEffect(() => {
    const onFocusPage = (ev: Event) => {
      const ce = ev as CustomEvent<{ page?: number }>;
      if (typeof ce?.detail?.page === 'number') {
        setActivePage(Math.max(1, Math.min(totalPages, ce.detail.page)));
        setRequestedStep(undefined);
      }
    };
    const onFocusStep = (ev: Event) => {
      const ce = ev as CustomEvent<{ page?: number; stepIndex?: number }>;
      if (typeof ce?.detail?.page === 'number') {
        setActivePage(Math.max(1, Math.min(totalPages, ce.detail.page)));
      }
      if (typeof ce?.detail?.stepIndex === 'number') {
        setRequestedStep(ce.detail.stepIndex);
      }
      setStateTick((n) => n + 1);
    };
    const onStateChanged = () => setStateTick((n) => n + 1);
    const onHydrated = () => setStateTick((n) => n + 1);
    void ensureSswFullKnowledgeLoaded().then(() => setStateTick((n) => n + 1));
    window.addEventListener(SSW_FOCUS_PAGE_EVENT, onFocusPage as EventListener);
    window.addEventListener(SSW_FOCUS_STEP_EVENT, onFocusStep as EventListener);
    window.addEventListener(SSW_STATE_UPDATED_EVENT, onStateChanged);
    window.addEventListener(SSW_KNOWLEDGE_HYDRATED_EVENT, onHydrated);
    return () => {
      window.removeEventListener(SSW_FOCUS_PAGE_EVENT, onFocusPage as EventListener);
      window.removeEventListener(SSW_FOCUS_STEP_EVENT, onFocusStep as EventListener);
      window.removeEventListener(SSW_STATE_UPDATED_EVENT, onStateChanged);
      window.removeEventListener(SSW_KNOWLEDGE_HYDRATED_EVENT, onHydrated);
    };
  }, [totalPages]);

  useEffect(() => {
    let cancelled = false;
    void lookupSswMaterialAndPageAsync({ pageNumber: activePage }).then((res) => {
      if (!cancelled) {
        setPageKotoba((res.kotobaOnPage || []).slice(0, 6));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [activePage]);

  const drawQuickQuiz = () => {
    setIsLoadingQuiz(true);
    setQuizGrade(null);
    void drawSswQuizQuestionAsync({ mode: 'mixed', preferWeakOrUnseen: true })
      .then((q) => {
        setActiveQuiz(q);
      })
      .finally(() => setIsLoadingQuiz(false));
  };

  useEffect(() => {
    if (!activeQuiz) {
      drawQuickQuiz();
    }
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _tickRef = stateTick;
  const plan = getStructuredPagePlan(activePage, requestedStep);
  const report = getSswProgressReport();
  const activeStep = plan.activeStep;
  const activeText = activeStep ? `${activeStep.title} ${activeStep.content}` : '';
  const insights = getWakaiPapaTacticalInsightsForPage(activePage, activeText, 3);
  const glossary = extractBeginnerGlossaryForText(
    `${activeText} ${plan.pageObj?.title || ''} ${plan.pageObj?.focusCompass || ''}`,
    5
  );

  const handleSelectPage = (nextPage: number) => {
    const safePage = Math.max(1, Math.min(totalPages, nextPage));
    playFiezelSfx('button_tap');
    setActivePage(safePage);
    setRequestedStep(undefined);
    updateSswLessonStepCursor({ page: safePage, stepIndex: 1 });
  };

  const handleSelectStep = (stepNum: number) => {
    playFiezelSfx('button_tap');
    setRequestedStep(stepNum);
    updateSswLessonStepCursor({ page: activePage, stepIndex: stepNum });
  };

  const handleCompleteStepAndNext = () => {
    if (!activeStep) return;
    playFiezelSfx('answer_correct');
    const result = advanceSswLessonStep({
      pageNumber: activePage,
      completedStepNumber: activeStep.stepNumber,
    });
    if ((result as any)?.pageCompleted) {
      setRequestedStep(undefined);
    } else if (typeof (result as any)?.activeStepNumber === 'number') {
      setRequestedStep((result as any).activeStepNumber);
    }
    setStateTick((n) => n + 1);
  };

  const handleAnswerQuickQuiz = async (letter: string) => {
    if (!activeQuiz || quizGrade) return;
    const result = await gradeSswQuizAnswerAsync({
      quizId: activeQuiz.quizId,
      userAnswer: letter,
    });
    setQuizGrade(result);
    if (result.ok) {
      playFiezelSfx('answer_correct');
      onEvaluatePractice?.(letter, result.correctAnswerJp, `SSW Hal. ${result.discussionPdfPage}`, {
        isQuizSuccess: true,
      });
    } else {
      playFiezelSfx('answer_wrong');
      onEvaluatePractice?.(letter, result.correctAnswerJp, `SSW Hal. ${result.discussionPdfPage}`, {
        isQuizSuccess: false,
        isQuizFailure: true,
        misconceptionId: `ssw_quiz_page_${result.discussionPdfPage}`,
      });
    }
    setStateTick((n) => n + 1);
  };

  return (
    <div data-testid="ssw-tactical-popup" className="space-y-3.5 text-[#231A12]">
      {/* BAR NAVIGASI HALAMAN, KESEPADANAN KESIAPAN, & FURIGANA */}
      <div className="p-3 rounded-2xl bg-[#8C2233] text-white flex flex-wrap items-center justify-between gap-2 shadow-xs">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={() => handleSelectPage(activePage - 1)}
            disabled={activePage <= 1}
            className="w-7 h-7 rounded-lg bg-white/15 hover:bg-white/25 disabled:opacity-40 text-xs font-extrabold flex items-center justify-center cursor-pointer"
            title="Halaman sebelumnya"
          >
            &lt;
          </button>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-white/80">
              Papan Taktis OTAFF Ver 5.1 · Hal. {activePage} / {totalPages}
            </div>
            <div className="text-xs sm:text-sm font-extrabold leading-snug break-words">
              {plan.pageObj?.title || `Halaman ${activePage}`}
            </div>
          </div>
          <button
            type="button"
            onClick={() => handleSelectPage(activePage + 1)}
            disabled={activePage >= totalPages}
            className="w-7 h-7 rounded-lg bg-white/15 hover:bg-white/25 disabled:opacity-40 text-xs font-extrabold flex items-center justify-center cursor-pointer"
            title="Halaman berikutnya"
          >
            &gt;
          </button>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="px-2.5 py-1 rounded-full bg-white/15 text-[10.5px] font-extrabold">
            Kesiapan {report.readinessScorePct}% / 65%
          </span>
          <button
            type="button"
            onClick={() => setShowFurigana((v) => !v)}
            className={`px-2 py-1 rounded-lg text-[10.5px] font-bold cursor-pointer transition ${
              showFurigana ? 'bg-white text-[#8C2233]' : 'bg-white/15 text-white'
            }`}
          >
            Aa Furigana
          </button>
        </div>
      </div>

      {/* KARTU 1: KUNCI FOKUS LANGKAH AKTIF (ANTI LOMPAT MATERI) */}
      <div className="p-3.5 rounded-2xl bg-[#FFFDF8] border border-[#E2D2BA] space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-[11px] font-extrabold uppercase tracking-wide text-[#8C2233]">
            Fokus Saat Ini: Langkah {plan.activeStepIndex} dari {plan.steps.length}
          </div>
          <div className="flex items-center gap-1 flex-wrap">
            {plan.steps.map((s) => {
              const isDone = plan.completedSteps.includes(s.stepNumber);
              const isCurrent = s.stepNumber === plan.activeStepIndex;
              return (
                <button
                  key={s.stepNumber}
                  type="button"
                  onClick={() => handleSelectStep(s.stepNumber)}
                  className={`px-2 py-0.5 rounded-lg text-[10.5px] font-bold cursor-pointer border transition ${
                    isCurrent
                      ? 'bg-[#8C2233] text-white border-[#8C2233]'
                      : isDone
                        ? 'bg-[#E6F4EA] text-[#1B5E34] border-[#A7F3D0]'
                        : 'bg-[#FAF4E8] text-[#5C4A38] border-[#EADBCE]'
                  }`}
                >
                  {isDone && !isCurrent ? `✓ ${s.stepNumber}` : `Langkah ${s.stepNumber}`}
                </button>
              );
            })}
          </div>
        </div>

        {activeStep && (
          <div className="space-y-2">
            <div className="text-sm font-extrabold text-[#231A12]">{activeStep.title}</div>
            <p className="text-xs text-[#3D2E20] leading-relaxed whitespace-pre-line">
              {cleanSpacedJapanese(activeStep.content)}
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleCompleteStepAndNext}
                className="px-3 py-1.5 rounded-xl bg-[#1B5E34] hover:bg-[#144727] text-white text-[11px] font-bold cursor-pointer"
              >
                ✓ Paham Langkah {activeStep.stepNumber} & Lanjut
              </button>
              <button
                type="button"
                onClick={() =>
                  onAskSensei?.(
                    `Sensei, bedah lebih dalam Langkah ${activeStep.stepNumber} (${activeStep.title}) di Halaman ${activePage} pakai contoh pabrik!`
                  )
                }
                className="px-3 py-1.5 rounded-xl bg-[#FCECED] hover:bg-[#F9D7DB] text-[#8C2233] text-[11px] font-bold cursor-pointer whitespace-nowrap"
              >
                Tanya Sensei Langkah Ini
              </button>
            </div>
          </div>
        )}
      </div>

      {/* KARTU 2: TRIK RAHASIA & JEBAKAN UJIAN (WAKAI PAPA+ MASTER MODE) */}
      <div className="space-y-2">
        <div className="text-[11px] font-extrabold uppercase tracking-wide text-[#5C4A38]">
          Trik Rahasia & Jebakan Ujian Halaman {activePage}
        </div>
        <div className="grid grid-cols-1 gap-2">
          {insights.map((tip) => (
            <div
              key={tip.id}
              data-testid="ssw-tactical-tip-card"
              className="p-3 rounded-2xl bg-[#FFFBF2] border border-[#E9D7B8] space-y-1.5"
            >
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="px-2 py-0.5 rounded-md bg-[#8C2233] text-white text-[9.5px] font-extrabold tracking-wide">
                  {tip.badge}
                </span>
                <span className="text-xs font-extrabold text-[#231A12]">{tip.title}</span>
              </div>
              <p className="text-xs text-[#3D2E20] leading-relaxed">{tip.trick}</p>
              <p className="text-[11px] font-semibold text-[#991B1B] bg-[#FFF1F2] border border-[#FECDD3] rounded-xl px-2.5 py-1.5">
                Waspada Jebakan: {tip.trapAlert}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* KARTU 3: KAMUS PEMULA & KOTOBA HALAMAN INI */}
      {(glossary.length > 0 || pageKotoba.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {glossary.length > 0 && (
            <div className="p-3 rounded-2xl bg-[#FFFDF8] border border-[#EADBCE] space-y-1.5">
              <div className="text-[10.5px] font-extrabold uppercase tracking-wide text-[#8C2233]">
                Kamus Istilah Pemula
              </div>
              <div className="space-y-1.5">
                {glossary.map((g) => (
                  <div key={g.term} className="text-[11px] leading-snug border-b border-[#F3EBE0] last:border-b-0 pb-1 last:pb-0">
                    <span className="font-extrabold text-[#231A12]">{g.term}: </span>
                    <span className="text-[#4A3B2C]">{g.simpleMeaningId}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {pageKotoba.length > 0 && (
            <div className="p-3 rounded-2xl bg-[#FFFDF8] border border-[#EADBCE] space-y-1.5">
              <div className="text-[10.5px] font-extrabold uppercase tracking-wide text-[#2D7A4D]">
                Kotoba Kunci Hal. {activePage}
              </div>
              <div className="space-y-1.5">
                {pageKotoba.map((k, idx) => (
                  <div
                    key={`${k.jp}_${idx}`}
                    className="flex items-center justify-between gap-2 text-[11px] border-b border-[#F3EBE0] last:border-b-0 pb-1 last:pb-0"
                  >
                    <div className="min-w-0">
                      <div
                        className="font-extrabold text-[#231A12]"
                        dangerouslySetInnerHTML={{
                          __html: renderSswRubyHtml(k.rubyMarkup || k.jp, !showFurigana),
                        }}
                      />
                      <div className="text-[10px] text-[#6E5E47]">
                        {k.romaji} · {k.meaningId}
                      </div>
                    </div>
                    {onSpeakPreview && (
                      <button
                        type="button"
                        onClick={() => onSpeakPreview(cleanSpacedJapanese(k.jp), 'ja')}
                        className="px-2 py-1 rounded-lg bg-[#FAF4E8] hover:bg-[#F3EBE0] text-[10px] font-bold text-[#5C4A38] shrink-0 cursor-pointer"
                      >
                        {wbPick('Listen', 'Dengar', undefined, locale)}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* KARTU 4: CEK PAHAM KILAT 1 SOAL PROMETRIC (3 PILIHAN A/B/C) */}
      <div className="p-3.5 rounded-2xl bg-[#FFFDF8] border border-[#DECFAF] space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-extrabold uppercase tracking-wide text-[#8C2233]">
            Uji Paham Kilat SSW (3 Pilihan Asli Prometric)
          </span>
          <button
            type="button"
            onClick={drawQuickQuiz}
            disabled={isLoadingQuiz}
            className="px-2.5 py-1 rounded-xl bg-[#FAF4E8] hover:bg-[#F3EBE0] text-[#5C4A38] text-[10.5px] font-bold cursor-pointer"
          >
            ↻ Soal Lain
          </button>
        </div>

        {activeQuiz ? (
          <div className="space-y-2">
            <div
              className="text-xs font-extrabold text-[#231A12] leading-snug"
              dangerouslySetInnerHTML={{
                __html: renderSswRubyHtml(activeQuiz.questionRuby || activeQuiz.questionJp, !showFurigana),
              }}
            />
            {activeQuiz.questionId && (
              <p className="text-[11px] text-[#5C4A38] font-medium">
                Arti soal: {activeQuiz.questionId}
              </p>
            )}
            <div className="grid grid-cols-1 gap-1.5">
              {activeQuiz.options.map((opt) => {
                const isPicked = quizGrade?.selectedLetter === opt.letter;
                const isRight = quizGrade && quizGrade.correctLetter === opt.letter;
                return (
                  <button
                    key={opt.letter}
                    type="button"
                    disabled={Boolean(quizGrade)}
                    onClick={() => void handleAnswerQuickQuiz(opt.letter)}
                    data-testid={`ssw-popup-quiz-opt-${opt.letter}`}
                    className={`w-full p-2.5 rounded-xl border text-left text-xs transition cursor-pointer ${
                      quizGrade
                        ? isRight
                          ? 'bg-[#E6F4EA] border-[#34D399] text-[#1B5E34]'
                          : isPicked
                            ? 'bg-[#FDE8E4] border-[#F87171] text-[#991B1B]'
                            : 'bg-[#FAF6EE] border-[#EADBCE] text-[#6E5E47] opacity-75'
                        : 'bg-[#FDFAF4] border-[#EADBCE] hover:border-[#8C2233] text-[#231A12]'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <span className="font-extrabold text-[#8C2233] shrink-0">{opt.letter}.</span>
                      <div className="min-w-0 flex-1">
                        <div
                          className="font-bold"
                          dangerouslySetInnerHTML={{
                            __html: renderSswRubyHtml(opt.ruby || opt.jp, !showFurigana),
                          }}
                        />
                        {opt.id && (
                          <div className="text-[10.5px] opacity-85 mt-0.5">{opt.id}</div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            {quizGrade && (
              <div
                className={`p-2.5 rounded-xl text-[11px] border ${
                  quizGrade.ok
                    ? 'bg-[#E6F4EA] border-[#A7F3D0] text-[#1B5E34]'
                    : 'bg-[#FFF1F2] border-[#FECDD3] text-[#991B1B]'
                }`}
              >
                <div className="font-extrabold">
                  {quizGrade.ok
                    ? `Benar (${quizGrade.correctLetter})! Kesiapan naik ke ${quizGrade.readinessScorePct}%`
                    : `Keliru (${quizGrade.selectedLetter}). Jawaban tepat: ${quizGrade.correctLetter}`}
                </div>
                <p className="mt-1 font-medium leading-relaxed">{quizGrade.explanationId}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-xs text-[#8C7760]">Menyiapkan 1 soal SSW...</div>
        )}
      </div>
    </div>
  );
};


/**
 * KOMPONEN UTAMA KANVAS ADAPTIF KAWAN BICARA
 * Desain Minimalis, Elegan, Anti-AI-Slop, Palet Pastel Lembut FIEZEL.
 */
export const InCallLearningWorkbenchModal: React.FC<InCallLearningWorkbenchProps> = ({
  isOpen,
  onClose,
  locale,
  onChangeLocale,
  targetLang,
  scenario,
  persona,
  isLiveConnected,
  isPlayingPreview = false,
  topicTitle,
  focusType,
  patternFormula,
  sampleTarget,
  uiAction,
  topMisconceptionId = null,
  isGeneratingTopic,
  onSpeakPreview,
  onStopMainAudio,
  onResumeConversation,
  onEvaluatePractice,
  onRequestCustomTopic,
  forcedExerciseMode,
  externalQuizSeed,
  initialMinimized,
  openNonce,
  cefrLevel = 'B1',
  latestPteDiagnostic = null,
  latestReadAloudAlignment = null,
  latestAiSubtitle = '',
  onActiveBoardSync,
  onWhiteboardBraincoreEvent,
}) => {
  const [quizMode, setQuizMode] = useState<WorkbenchQuizMode>(forcedExerciseMode || 'multiple_choice');
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [clozeAnswer, setClozeAnswer] = useState<string | null>(null);
  const [placedBlocks, setPlacedBlocks] = useState<string[]>([]);
  const [isQuizCompleted, setIsQuizCompleted] = useState<boolean>(false);
  const [quizSeed, setQuizSeed] = useState<number>(externalQuizSeed ?? 0);
  const [quizWrongCount, setQuizWrongCount] = useState<number>(0);
  const [quizCoachReply, setQuizCoachReply] = useState<{
    status: 'wrong' | 'correct';
    headline: string;
    spokenMessage: string;
    detailNote: string;
    userAnswer: string;
    correctAnswer: string;
    autoRemediateLeftSec: number | null;
    isSpeaking: boolean;
  } | null>(null);
  const quizSpeechTokenRef = useRef<number>(0);
  const quizSpeechSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const quizSpeechHtmlAudioRef = useRef<HTMLAudioElement | null>(null);
  const questionInputRef = useRef<HTMLInputElement | null>(null);
  const effectiveBoardLocale: LearnerLocale = uiAction?.explanationLocale || locale;
  const [isMinimized, setIsMinimized] = useState<boolean>(initialMinimized ?? false);
  const lastOpenNonceRef = useRef<number | undefined>(openNonce);
  const onActiveBoardSyncRef = useRef(onActiveBoardSync);
  onActiveBoardSyncRef.current = onActiveBoardSync;
  const onWhiteboardBraincoreEventRef = useRef(onWhiteboardBraincoreEvent);
  onWhiteboardBraincoreEventRef.current = onWhiteboardBraincoreEvent;
  const reportedQuizKeysRef = useRef<Set<string>>(new Set());
  const reportedBoardDoneKeysRef = useRef<Set<string>>(new Set());
  const rawComponentUi = getWorkbenchUiStrings(locale);
  const compLoc = normalizeWbLocale(locale);
  const ui = ['id', 'th', 'ja', 'zh', 'en'].includes(compLoc)
    ? rawComponentUi
    : Object.fromEntries(
        Object.entries(rawComponentUi).map(([k, v]) => [k, typeof v === 'string' ? wbPick(v, v, v, compLoc) : v])
      ) as typeof rawComponentUi;

  // Solvely-Parity Interactive Whiteboard Studio Controls
  const [playbackSpeed, setPlaybackSpeed] = useState<0.75 | 1 | 1.25 | 1.5>(1);
  const [isWritingPlaying, setIsWritingPlaying] = useState<boolean>(true);
  const [replayNonce, setReplayNonce] = useState<number>(0);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [autoSpotlight, setAutoSpotlight] = useState<boolean>(true);
  const onStopMainAudioRef = useRef(onStopMainAudio);
  onStopMainAudioRef.current = onStopMainAudio;
  const [lockstepIndex, setLockstepIndex] = useState<number>(0);
  const [lockstepProgress, setLockstepProgress] = useState<number>(0);
  const [activeStepSubtitle, setActiveStepSubtitle] = useState<string>('');
  // Kursor kata yang SEDANG diucapkan tutor (dari stempel waktu audio nyata) + jam audio nyata
  const [spokenCursor, setSpokenCursor] = useState<{
    stepIndex: number;
    wordIdx: number;
    stepWords?: string[];
  } | null>(null);
  const spokenCursorRef = useRef<{
    stepIndex: number;
    wordIdx: number;
    stepWords?: string[];
  } | null>(null);
  const [audioClock, setAudioClock] = useState<{ elapsedSec: number; totalSec: number } | null>(null);
  const [isStepAudioActive, setIsStepAudioActive] = useState<boolean>(false);
  const [isAudioPreparing, setIsAudioPreparing] = useState<boolean>(false);
  const [isInitialAudioGateActive, setIsInitialAudioGateActive] = useState<boolean>(true);
  const hasRevealedCanvasRef = useRef<boolean>(false);
  const [forceManualTts, setForceManualTts] = useState<boolean>(false);
  const [needsAudioUnlock, setNeedsAudioUnlock] = useState<boolean>(false);
  const needsAudioUnlockRef = useRef<boolean>(false);
  needsAudioUnlockRef.current = needsAudioUnlock;
  const [isUnlockLaunching, setIsUnlockLaunching] = useState<boolean>(false);
  const isUnlockLaunchingRef = useRef<boolean>(false);
  isUnlockLaunchingRef.current = isUnlockLaunching;
  const unlockLaunchTimerRef = useRef<number | null>(null);
  const isWritingPlayingRef = useRef<boolean>(isWritingPlaying);
  isWritingPlayingRef.current = isWritingPlaying;
  const lastCommitIdxRef = useRef<number>(-1);
  const lastCommitProgRef = useRef<number>(-1);
  const lastCommitProgAtRef = useRef<number>(0);
  const lastCommitSubRef = useRef<string>('');
  const playbackSpeedRef = useRef(playbackSpeed);
  playbackSpeedRef.current = playbackSpeed;
  const lockstepProgressRef = useRef(lockstepProgress);
  lockstepProgressRef.current = lockstepProgress;
  const lockstepAudioRef = useRef<HTMLAudioElement | null>(null);
  const trackAudioCtxRef = useRef<AudioContext | null>(null);
  const trackSourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const trackCacheRef = useRef<
    Map<
      string,
      Promise<{
        audioBuffer: AudioBuffer | null;
        dataUrl: string;
        durationSec: number;
        chunksTotal?: number;
        chunksSucceeded?: number;
      } | null>
    >
  >(new Map());
  const trackOffsetSecRef = useRef<number>(0);
  const trackTotalSecRef = useRef<number>(0);
  const trackFracRef = useRef<number>(0);
  const seekTargetStepRef = useRef<number | null>(null);
  const [seekNonce, setSeekNonce] = useState<number>(0);
  const lockstepSeqIdRef = useRef<number>(0);
  const personaRef = useRef<VoicePersona>(persona);
  personaRef.current = persona;
  const stopQuizCoachSpeech = () => {
    quizSpeechTokenRef.current += 1;
    if (quizSpeechSourceRef.current) {
      try {
        quizSpeechSourceRef.current.onended = null;
        quizSpeechSourceRef.current.stop();
        quizSpeechSourceRef.current.disconnect();
      } catch {}
      quizSpeechSourceRef.current = null;
    }
    if (quizSpeechHtmlAudioRef.current) {
      try {
        quizSpeechHtmlAudioRef.current.onended = null;
        quizSpeechHtmlAudioRef.current.pause();
        quizSpeechHtmlAudioRef.current.removeAttribute('src');
        quizSpeechHtmlAudioRef.current.load();
      } catch {}
      quizSpeechHtmlAudioRef.current = null;
    }
  };
  const stopLockstepAudio = () => {
    lockstepSeqIdRef.current += 1;
    try {
      (window as unknown as { __fzWbLockstepActive?: boolean }).__fzWbLockstepActive = false;
    } catch {
      // Ignore
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore speechSynthesis cancel errors
      }
    }
    if (trackSourceNodeRef.current) {
      try {
        trackSourceNodeRef.current.onended = null;
        trackSourceNodeRef.current.stop();
        trackSourceNodeRef.current.disconnect();
      } catch {
        // Ignore cleanup error
      }
      trackSourceNodeRef.current = null;
    }
    if (lockstepAudioRef.current) {
      try {
        lockstepAudioRef.current.onended = null;
        lockstepAudioRef.current.pause();
        lockstepAudioRef.current.removeAttribute('src');
        lockstepAudioRef.current.load();
      } catch {
        // Ignore cleanup error
      }
      lockstepAudioRef.current = null;
    }
    setIsStepAudioActive(false);
    setIsAudioPreparing(false);
  };
  useEffect(() => {
    const onStopWb = () => stopLockstepAudio();
    window.addEventListener('fz:stop-workbench-audio', onStopWb);
    return () => window.removeEventListener('fz:stop-workbench-audio', onStopWb);
  }, []);

  const triggerTactileAudioLaunch = (alreadyUnlocked = false) => {
    if (!needsAudioUnlockRef.current || isUnlockLaunchingRef.current) return;
    isUnlockLaunchingRef.current = true;
    setIsUnlockLaunching(true);
    if (!alreadyUnlocked) {
      unlockSharedBoardAudioContext();
    }
    playFiezelSfx('lesson_start');
    if (unlockLaunchTimerRef.current) window.clearTimeout(unlockLaunchTimerRef.current);
    unlockLaunchTimerRef.current = window.setTimeout(() => {
      unlockLaunchTimerRef.current = null;
      isUnlockLaunchingRef.current = false;
      needsAudioUnlockRef.current = false;
      setIsUnlockLaunching(false);
      setNeedsAudioUnlock(false);
      setSeekNonce((n) => n + 1);
    }, 290);
  };

  useEffect(() => {
    if (!isOpen) return;
    ensureGlobalGestureUnlockListener();
    return subscribeBoardAudioUnlock(() => {
      if (isWritingPlayingRef.current && needsAudioUnlockRef.current) {
        triggerTactileAudioLaunch(true);
      }
    });
  }, [isOpen]);
  const [isPenActive, setIsPenActive] = useState<boolean>(false);
  const [penColor, setPenColor] = useState<PenColor>('#2563EB');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 920 : true
  );
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(max-width: 767px)');
    const syncDrawer = () => {
      if (mq.matches) setIsSidebarOpen(false);
    };
    syncDrawer();
    mq.addEventListener?.('change', syncDrawer);
    return () => mq.removeEventListener?.('change', syncDrawer);
  }, []);
  const [showCaptions, setShowCaptions] = useState<boolean>(true);
  const [questionDraft, setQuestionDraft] = useState<string>('');
  const [studentQuestions, setStudentQuestions] = useState<StudentBoardQuestion[]>([]);
  const pendingQuestionIdRef = useRef<string | null>(null);
  const pendingQuestionActionSigRef = useRef<string>('');
  const prevGeneratingTopicRef = useRef<boolean>(false);
  const [uploadedMaterials, setUploadedMaterials] = useState<SourceMaterialPage[]>([]);
  const [selectedMaterialPage, setSelectedMaterialPage] = useState<SourceMaterialPage | null>(null);
  const [loaderProgress, setLoaderProgress] = useState<number>(18);
  const boardContainerRef = useRef<HTMLDivElement | null>(null);
  const materialUploadInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (initialMinimized !== undefined) {
      setIsMinimized(initialMinimized);
    }
  }, [initialMinimized]);

  useEffect(() => {
    if (isOpen && openNonce !== undefined && openNonce !== lastOpenNonceRef.current) {
      lastOpenNonceRef.current = openNonce;
      setIsMinimized(false);
    }
  }, [isOpen, openNonce]);

  useEffect(() => {
    if (externalQuizSeed !== undefined && externalQuizSeed !== quizSeed) {
      setQuizSeed(externalQuizSeed);
      setSelectedOptionId(null);
      setClozeAnswer(null);
      setPlacedBlocks([]);
      setIsQuizCompleted(false);
      setQuizWrongCount(0);
      setQuizCoachReply(null);
      stopQuizCoachSpeech();
    }
  }, [externalQuizSeed]);

  useEffect(() => {
    if (forcedExerciseMode && forcedExerciseMode !== quizMode) {
      setQuizMode(forcedExerciseMode);
      setSelectedOptionId(null);
      setClozeAnswer(null);
      setPlacedBlocks([]);
      setIsQuizCompleted(false);
      setQuizWrongCount(0);
      setQuizCoachReply(null);
      stopQuizCoachSpeech();
    }
  }, [forcedExerciseMode]);

  const onSpeakPreviewRef = useRef(onSpeakPreview);
  onSpeakPreviewRef.current = onSpeakPreview;
  const lastSpokenKeyRef = useRef<string>('');

  // Identifikasi kunci topik (untuk siklus hidup papan & cache audio) vs kunci soal (termasuk quizSeed untuk dedup Braincore).
  // Memisahkan quizSeed dari topicKey mencegah klik "Ganti Soal" menghapus cache audio atau mereset narasi papan ke Langkah 0.
  const topicKey = `${uiAction?.bankTopicId || ''}::${uiAction?.topicTitle || topicTitle || ''}::${(uiAction?.explanationText || '').slice(0, 64)}`;
  const currentKey = `${topicKey}::${quizSeed}`;
  const lastKeyRef = useRef<string>('');

  // Derivasi sinkron boardState & isReady agar zero 1-render lag dan zero double-TTS race
  const { boardState, isReady } = useMemo<{
    boardState: DynamicBoardState | null;
    isReady: boolean;
  }>(() => {
    if (!isOpen) return { boardState: null, isReady: false };
    const isSswPersonaModal = Boolean(
      persona?.id === 'ssw_sensei' ||
      scenario?.personaId === 'ssw_sensei' ||
      scenario?.id?.startsWith('scen_ssw_') ||
      focusType === 'ssw_tactical_board' ||
      uiAction?.focusType === 'ssw_tactical_board'
    );
    const baseAction: VoiceUiAction | undefined =
      uiAction ||
      (focusType
        ? {
            actionType: 'open_learning_popup',
            focusType: focusType as any,
            topicTitle: topicTitle || '',
            patternFormula: patternFormula || '',
            sampleTarget: sampleTarget || '',
          }
        : undefined);
    const effectiveAction: VoiceUiAction | undefined = isSswPersonaModal
      ? {
          ...(baseAction || { actionType: 'open_learning_popup', topicTitle: topicTitle || '' }),
          focusType: 'ssw_tactical_board' as any,
        }
      : baseAction;
    const isPteSessionModal = Boolean(
      scenario?.id?.startsWith('scen_pte') ||
      persona?.id === 'dr_julian' ||
      scenario?.personaId === 'dr_julian'
    );
    const query = (effectiveAction?.topicTitle || topicTitle || '').trim();
    const hasRich =
      hasRichDynamicAction(effectiveAction) ||
      focusType === 'read_aloud' ||
      Boolean(focusType?.startsWith('pte_')) ||
      isSswPersonaModal;
    if (!hasRich && isGeneratingTopic) {
      return { boardState: null, isReady: false };
    }
    const derived = deriveContextualPedagogicalBoard(
      effectiveAction,
      query,
      targetLang,
      locale,
      quizSeed,
      latestPteDiagnostic,
      isPteSessionModal
    );
    return { boardState: derived, isReady: true };
  }, [
    isOpen,
    uiAction,
    focusType,
    topicTitle,
    patternFormula,
    sampleTarget,
    isGeneratingTopic,
    targetLang,
    locale,
    quizSeed,
    latestPteDiagnostic,
    scenario,
    persona,
  ]);

  // Sinkronkan konten target papan tulis aktif -> konteks AI Live + catat selesainya alur papan ke Braincore
  useEffect(() => {
    if (!isOpen || !isReady || !boardState) return;
    if (
      onActiveBoardSyncRef.current &&
      boardState.contextMode !== 'pte_read_aloud' &&
      boardState.contextMode !== 'read_aloud' &&
      boardState.contextMode !== 'pte_describe_image'
    ) {
      const targetText =
        boardState.pteChartData?.title ||
        boardState.pairData?.termB ||
        boardState.standardTarget?.text ||
        boardState.characterData?.char ||
        boardState.toneData?.word ||
        uiAction?.sampleTarget ||
        boardState.topicTitle ||
        '';
      onActiveBoardSyncRef.current({
        contextMode: boardState.contextMode,
        topicTitle: boardState.topicTitle,
        activeTargetText: targetText,
      });
    }
  }, [isOpen, isReady, boardState, uiAction?.sampleTarget]);

  // SIKLUS HIDUP STATE BERSIH (PEMBERANTAS MUTLAK GHOST ANSWER BUG)
  useEffect(() => {
    if (!isOpen) {
      stopLockstepAudio();
      stopQuizCoachSpeech();
      trackCacheRef.current.clear();
      trackOffsetSecRef.current = 0;
      trackTotalSecRef.current = 0;
      trackFracRef.current = 0;
      setSelectedOptionId(null);
      setClozeAnswer(null);
      setPlacedBlocks([]);
      setIsQuizCompleted(false);
      setQuizWrongCount(0);
      setQuizCoachReply(null);
      stopQuizCoachSpeech();
      setQuizWrongCount(0);
      setQuizCoachReply(null);
      setNeedsAudioUnlock(false);
      setIsUnlockLaunching(false);
      isUnlockLaunchingRef.current = false;
      if (unlockLaunchTimerRef.current) {
        window.clearTimeout(unlockLaunchTimerRef.current);
        unlockLaunchTimerRef.current = null;
      }
      setIsMinimized(false);
      setIsPenActive(false);
      setStudentQuestions([]);
      pendingQuestionIdRef.current = null;
      pendingQuestionActionSigRef.current = '';
      setSelectedMaterialPage(null);
      setLoaderProgress(18);
      setLockstepIndex(0);
      setLockstepProgress(0);
      setActiveStepSubtitle('');
      lastKeyRef.current = '';
      lastSpokenKeyRef.current = '';
      return;
    }

    // JIKA TOPIK BERGANTI SELAGI MODAL TERBUKA: BERSIHKAN JAWABAN, CACHE AUDIO & STATE LAMA SEKETIKA!
    if (lastKeyRef.current && lastKeyRef.current !== topicKey) {
      const prevBaseTitle = lastKeyRef.current.split('::')[1] || '';
      const nextBaseTitle = topicKey.split('::')[1] || '';
      trackCacheRef.current.clear();
      setSelectedOptionId(null);
      setClozeAnswer(null);
      setPlacedBlocks([]);
      setIsQuizCompleted(false);
      setQuizWrongCount(0);
      setQuizCoachReply(null);
      stopQuizCoachSpeech();
      lastCommitIdxRef.current = -1;
      lastCommitProgRef.current = -1;
      lastCommitSubRef.current = '';
      spokenCursorRef.current = null;
      setSpokenCursor(null);
      setAudioClock(null);
      setActiveStepSubtitle('');
      setLockstepIndex(0);
      setLockstepProgress(0);
      if (prevBaseTitle !== nextBaseTitle) {
        setStudentQuestions([]);
        prevStudentQCountRef.current = 0;
        pendingQuestionIdRef.current = null;
        setSelectedMaterialPage(null);
      }
    }
    lastKeyRef.current = topicKey;

    if (hasRichDynamicAction(uiAction) || Boolean(focusType?.startsWith('pte_'))) {
      setForceManualTts(false);
      setIsWritingPlaying(true);
    }
  }, [isOpen, topicKey, uiAction, focusType]);

  useEffect(() => {
    if (!isOpen) {
      hasRevealedCanvasRef.current = false;
      setIsInitialAudioGateActive(true);
      // Release decoded Float32 AudioBuffers & trim base64 cache on close to keep Mobile PWA RAM lean
      if (isMobileLowMemoryDevice()) {
        trackCacheRef.current.clear();
        pruneTtsMemoryCache(2);
      }
      return;
    }
    if (isReady && !isInitialAudioGateActive) return;
    setLoaderProgress((prev) => (isReady ? Math.max(prev, 76) : 18));
    const id = window.setInterval(() => {
      setLoaderProgress((prev) => (prev >= 96 ? 96 : prev + (isReady ? 4 : 7)));
    }, 180);
    return () => window.clearInterval(id);
  }, [isOpen, isReady, isInitialAudioGateActive]);

  // Tahan tirai buffering sampai Chunk-0 suara tutor benar-benar siap menyala (sinkron 0ms visual + audio),
  // dengan batas aman 5.5 detik agar jaringan lambat/offline tidak pernah membuat tirai macet selamanya.
  useEffect(() => {
    if (!isOpen || !isReady || hasRevealedCanvasRef.current || !isInitialAudioGateActive) return;
    const isSpecialNow =
      Boolean(boardState?.contextMode?.startsWith('pte_')) ||
      boardState?.contextMode === 'read_aloud' ||
      boardState?.contextMode === 'ssw_tactical_board' ||
      Boolean(focusType?.startsWith('pte_')) ||
      focusType === 'read_aloud' ||
      focusType === 'ssw_tactical_board' ||
      Boolean(uiAction?.focusType?.startsWith('pte_')) ||
      uiAction?.focusType === 'read_aloud' ||
      uiAction?.focusType === 'ssw_tactical_board';
    if (isSpecialNow) {
      hasRevealedCanvasRef.current = true;
      setIsInitialAudioGateActive(false);
      return;
    }
    const failsafeTimer = window.setTimeout(() => {
      if (!hasRevealedCanvasRef.current) {
        hasRevealedCanvasRef.current = true;
        setIsInitialAudioGateActive(false);
      }
    }, 5500);
    return () => window.clearTimeout(failsafeTimer);
  }, [isOpen, isReady, isInitialAudioGateActive, boardState?.contextMode, focusType, uiAction?.focusType]);

  const [cjkRevision, setCjkRevision] = useState(0);

  useEffect(() => {
    if (!isOpen) return;
    const unsub = subscribeKanjiVgUpdates(() => {
      setCjkRevision((v) => v + 1);
    });
    const candidates = new Set<string>();
    const scanText = (txt?: string) => {
      if (!txt) return;
      const matches = txt.match(/[\u4e00-\u9faf\u3040-\u309f\u30a0-\u30ff]/g);
      if (matches) matches.slice(0, 6).forEach((ch) => candidates.add(ch));
    };
    scanText(uiAction?.topicTitle);
    scanText(boardState?.title);
    if (Array.isArray(uiAction?.whiteboardSteps)) {
      for (const st of uiAction.whiteboardSteps) {
        if (st?.kind === 'kanji_grid') {
          scanText(st.character);
          scanText(st.title);
        }
      }
    }
    candidates.forEach((ch) => {
      void ensureKanjiStrokesLoaded(ch, targetLang);
    });
    return unsub;
  }, [isOpen, uiAction, boardState?.title, targetLang]);

  const whiteboardPlan = useMemo(() => {
    if (!boardState) return null;
    return buildWhiteboardScenePlan({
      boardState,
      uiAction,
      scenario,
      targetLang,
      locale: effectiveBoardLocale,
      studentQuestions,
      uploadedMaterials,
    });
  }, [boardState, uiAction, scenario, targetLang, effectiveBoardLocale, studentQuestions, uploadedMaterials, cjkRevision]);

  const cohesiveAudioPlan = useMemo(
    () => (whiteboardPlan ? buildCohesiveBoardNarrationScript(whiteboardPlan) : null),
    [whiteboardPlan]
  );

  // Reset track & lockstep ke detik 0 saat topik papan berganti atau pengguna menekan Replay
  useEffect(() => {
    if (!isOpen || !isReady || !whiteboardPlan) return;
    stopLockstepAudio();
    trackOffsetSecRef.current = 0;
    trackTotalSecRef.current = 0;
    trackFracRef.current = 0;
    lastCommitIdxRef.current = -1;
    lastCommitProgRef.current = -1;
    lastCommitSubRef.current = '';
    spokenCursorRef.current = null;
    setSpokenCursor(null);
    setAudioClock(null);
    setActiveStepSubtitle('');
    setLockstepIndex(0);
    setLockstepProgress(0);
    setIsWritingPlaying(true);
  }, [isOpen, isReady, whiteboardPlan?.boardTitle, uiAction?.explanationText, replayNonce]);

  const prevStudentQCountRef = useRef<number>(0);
  useEffect(() => {
    const count = studentQuestions.length;
    if (
      count > prevStudentQCountRef.current &&
      !isGeneratingTopic &&
      !pendingQuestionIdRef.current &&
      whiteboardPlan &&
      cohesiveAudioPlan
    ) {
      // Mulai presentasi dari atas agar diagram/visual baru langsung terlihat jelas
      // tanpa melompat ke kartu pojok kanan bawah dan menyisakan area kosong di kiri.
      trackFracRef.current = 0;
      trackOffsetSecRef.current = 0;
      lastCommitIdxRef.current = -1;
      lastCommitProgRef.current = -1;
      lastCommitSubRef.current = '';
    spokenCursorRef.current = null;
    setSpokenCursor(null);
    setAudioClock(null);
      setActiveStepSubtitle('');
      setLockstepIndex(0);
      setLockstepProgress(0.02);
      setIsWritingPlaying(true);
      setSeekNonce((n) => n + 1);
      try {
        document.querySelector('[data-testid="solvely-dotgrid-whiteboard"]')?.scrollTo?.({
          top: 0,
          behavior: 'smooth',
        });
      } catch {
        // ignore
      }
    }
    prevStudentQCountRef.current = count;
  }, [studentQuestions.length, isGeneratingTopic, whiteboardPlan, cohesiveAudioPlan]);

  // Perbarui jawaban kartu tanya-jawab begitu penjelasan lanjutan dari tutor selesai dimuat
  useEffect(() => {
    const wasGenerating = prevGeneratingTopicRef.current;
    prevGeneratingTopicRef.current = Boolean(isGeneratingTopic);

    const pendingId = pendingQuestionIdRef.current;
    if (!pendingId || isGeneratingTopic) return;

    const currentSig = `${uiAction?.topicTitle || ''}::${uiAction?.explanationText || ''}::${uiAction?.coachSpokenScript || ''}`;
    const actionChanged = Boolean(currentSig) && currentSig !== pendingQuestionActionSigRef.current;
    if (!wasGenerating && !actionChanged) return;

    const rawReply =
      (uiAction?.coachSpokenScript || uiAction?.explanationText || boardState?.summary || '').trim();
    const allSentences = rawReply
      .replace(/\s+/g, ' ')
      .split(/(?<=[.!?])\s+/)
      .map((s) =>
        s
          .replace(/^(?:dengar(?:kan)?|perhatikan|simak)\s+baik-?baik(?:\s+ya)?[,!.\s]*/i, '')
          .trim()
      )
      .filter(
        (s) =>
          s.length > 8 &&
          !/^(?:halo|hai|hi|hey|oke|baik|siap|nah|wah|bagus|tentu)[^.!?]{0,24}[.!?]?$/i.test(s) &&
          !/^(?:halo!?\s*)?(?:aku\s+)?coach\s+\w+\s+di\s+sini[.!]?$/i.test(s)
      );
    const declarative = allSentences.filter((s) => !/\?\s*$/.test(s));
    const meaningfulSentences = declarative.length > 0 ? declarative : allSentences;
    const cleanedSentences = meaningfulSentences.slice(0, 2).join(' ').slice(0, 260);
    const finalAnswer =
      cleanedSentences || 'Penjelasan lanjutan beserta visual papan tulis sudah diperbarui di atas.';

    setStudentQuestions((prev) =>
      prev.map((q) => (q.id === pendingId ? { ...q, tutorAnswer: finalAnswer } : q))
    );
    pendingQuestionIdRef.current = null;
    pendingQuestionActionSigRef.current = '';
  }, [
    isGeneratingTopic,
    uiAction?.topicTitle,
    uiAction?.explanationText,
    uiAction?.coachSpokenScript,
    boardState?.summary,
  ]);

  // Update active audio playback speed smoothly without resetting progress
  useEffect(() => {
    if (trackSourceNodeRef.current) {
      try {
        trackSourceNodeRef.current.playbackRate.value = playbackSpeed;
      } catch {
        // Ignore rate update error
      }
    }
    if (lockstepAudioRef.current) {
      try {
        lockstepAudioRef.current.playbackRate = playbackSpeed;
      } catch {
        // Ignore rate update error
      }
    }
  }, [playbackSpeed]);

  // Single-Track Continuous Audio-Visual Lockstep Sequencer (1 TTS terpadu via Web Audio API, nol jeda antar-step!)
  useEffect(() => {
    const isPteBoard =
      boardState?.contextMode === 'read_aloud' ||
      boardState?.contextMode === 'ssw_tactical_board' ||
      focusType === 'read_aloud' ||
      focusType === 'ssw_tactical_board' ||
      uiAction?.focusType === 'read_aloud' ||
      uiAction?.focusType === 'ssw_tactical_board' ||
      Boolean(boardState?.contextMode?.startsWith('pte_')) ||
      Boolean(focusType?.startsWith('pte_')) ||
      Boolean(uiAction?.focusType?.startsWith('pte_'));

    if (!isOpen || !isReady || isPteBoard || !whiteboardPlan || !cohesiveAudioPlan) {
      stopLockstepAudio();
      return;
    }

    const steps = whiteboardPlan.steps;
    const spans = cohesiveAudioPlan.stepSpans;
    if (!steps.length || !spans.length) return;

    if (!activeStepSubtitle && spans[0]?.caption) {
      setActiveStepSubtitle(spans[0].caption);
    }

    if (!isWritingPlaying) {
      stopLockstepAudio();
      return;
    }

    let cancelled = false;
    const seqId = ++lockstepSeqIdRef.current;
    let rafId = 0;
    const isMobileLowMem = isMobileLowMemoryDevice();

    const estTotalSec = Math.max(
      4,
      steps.reduce((sum, s) => sum + (s.durationMs || 2200), 0) / 1000
    );

    const fullScript = cohesiveAudioPlan.fullScript;

    // 1:1 Step-to-Chunk Audio Packing:
    // - Satu chunk TTS hanya berisi kalimat dari SATU langkah yang sama (tidak pernah menggabungkan langkah berbeda ke 1 audio blob)
    // - Tidak pernah memotong kalimat di tengah klausa (split hanya bila 1 langkah > 260 karakter pada batas kalimat utuh)
    type StepPiece = { stepIndex: number; caption: string; text: string; weight: number };
    const stepPieces: StepPiece[] = [];
    spans.forEach((sp) => {
      const txt = String(sp.spokenText || '').trim();
      if (!txt) return;
      // Step 0 opener selalu dipotong pada <=145 karakter agar selaras 1:1 dengan pre-warm stream & langsung bunyi!
      const subParts = splitTtsIntoSentenceChunks(txt, sp.stepIndex === 0 ? 145 : sp.stepIndex === 1 ? 175 : 215);
      subParts.forEach((sub) => {
        const w = computeProsodicTextWeight(sub);
        stepPieces.push({
          stepIndex: sp.stepIndex,
          caption: sp.caption,
          text: sub,
          weight: w,
        });
      });
    });

    type PackedChunk = { stepIndex: number; text: string; pieces: StepPiece[]; weight: number };
    const packedChunks: PackedChunk[] = [];
    for (const pc of stepPieces) {
      const last = packedChunks[packedChunks.length - 1];
      const packMaxChars = pc.stepIndex === 0 && packedChunks.length <= 1 ? 145 : pc.stepIndex === 1 ? 175 : 215;
      if (last && last.stepIndex === pc.stepIndex && `${last.text} ${pc.text}`.length <= packMaxChars) {
        last.text = `${last.text} ${pc.text}`.trim();
        last.pieces.push(pc);
        last.weight += pc.weight;
      } else {
        packedChunks.push({ stepIndex: pc.stepIndex, text: pc.text, pieces: [pc], weight: pc.weight });
      }
    }
    const locCode = String(effectiveBoardLocale || 'id').toLowerCase().split(/[-_]/)[0];
    const alignLang = locCode === 'ja' ? 'ja' : locCode === 'zh' ? 'zh' : 'en';
    const chunks = packedChunks.length > 0 ? packedChunks.map((c) => c.text) : splitTtsIntoSentenceChunks(fullScript, 420);
    const alignedChunkTexts = chunks.map(
      (ct) => sanitizeSpokenTextForClassicTts(ct, alignLang) || ct
    );
    const chunkWeights =
      packedChunks.length > 0
        ? packedChunks.map((c) => Math.max(4, c.weight))
        : chunks.map((c) => computeProsodicTextWeight(c));
    const decodedDurations: Array<number | null> = new Array(chunks.length).fill(null);

    // Peta kata per chunk: wajib pakai teks TER-SANITASI YANG PERSIS SAMA dengan alignWordsToSpeech()
    // agar alignment.times.length === chunkWordMap.count selalu cocok 1:1 (tanpa jatuh ke pacing linear!).
    type ChunkWordMap = { fracs: number[]; stepIndex: number; stepWordOffset: number; count: number };
    const stepWordCursor = new Map<number, number>();
    const stepAlignedWordsMap = new Map<number, string[]>();
    const chunkWordMaps: ChunkWordMap[] = alignedChunkTexts.map((alignedText, cIdx) => {
      const pk = packedChunks[cIdx];
      const chunkWords = alignedText.split(/\s+/).filter(Boolean);
      const stepIndex = pk ? pk.stepIndex : -1;
      const stepWordOffset = stepWordCursor.get(stepIndex) || 0;
      stepWordCursor.set(stepIndex, stepWordOffset + chunkWords.length);
      if (stepIndex >= 0) {
        const list = stepAlignedWordsMap.get(stepIndex) || [];
        list.push(...chunkWords);
        stepAlignedWordsMap.set(stepIndex, list);
      }
      const fracs: number[] = [];
      const pieceWords = pk
        ? pk.pieces.map((pc) => (sanitizeSpokenTextForClassicTts(pc.text, alignLang) || pc.text).split(/\s+/).filter(Boolean))
        : [];
      const pieceTotal = pieceWords.reduce((s, ws) => s + ws.length, 0);
      if (pk && pieceTotal === chunkWords.length) {
        const pkW = Math.max(1, pk.weight);
        let pieceStart = 0;
        pk.pieces.forEach((pc, pIdx) => {
          const ws = pieceWords[pIdx];
          const wW = ws.map(computeProsodicWordWeight);
          const wSum = Math.max(1e-6, wW.reduce((a, b) => a + b, 0));
          const pieceSpan = pc.weight / pkW;
          let acc = 0;
          ws.forEach((_, wi) => {
            fracs.push(pieceStart + (acc / wSum) * pieceSpan);
            acc += wW[wi];
          });
          pieceStart += pieceSpan;
        });
      } else {
        const wW = chunkWords.map(computeProsodicWordWeight);
        const wSum = Math.max(1e-6, wW.reduce((a, b) => a + b, 0));
        let acc = 0;
        wW.forEach((w) => {
          fracs.push(acc / wSum);
          acc += w;
        });
      }
      fracs.push(1);
      return { fracs, stepIndex, stepWordOffset, count: chunkWords.length };
    });

    const publishSpokenWord = (chunkIdx: number, wordIdxInChunk: number, audioSecInChunk: number) => {
      const wm = chunkWordMaps[chunkIdx];
      if (!wm || wm.stepIndex < 0) return;
      const wordIdx = wm.stepWordOffset + wordIdxInChunk;
      const prev = spokenCursorRef.current;
      if (prev && prev.stepIndex === wm.stepIndex && prev.wordIdx === wordIdx) return;
      const stepWords = stepAlignedWordsMap.get(wm.stepIndex);
      spokenCursorRef.current = { stepIndex: wm.stepIndex, wordIdx, stepWords };
      setSpokenCursor({ stepIndex: wm.stepIndex, wordIdx, stepWords });
      // Jam papan dari durasi audio NYATA (bukan estimasi), diperbarui setiap pergantian kata
      const knownIdx = decodedDurations.map((d, i) => (d && d > 0 ? i : -1)).filter((i) => i >= 0);
      const knownSec = knownIdx.reduce((s, i) => s + (decodedDurations[i] || 0), 0);
      const knownW = knownIdx.reduce((s, i) => s + chunkWeights[i], 0);
      const secPerW = knownW > 0 ? knownSec / knownW : 0.066;
      const durOf = (i: number) => (decodedDurations[i] && decodedDurations[i]! > 0 ? decodedDurations[i]! : chunkWeights[i] * secPerW);
      let elapsed = audioSecInChunk;
      for (let i = 0; i < chunkIdx; i++) elapsed += durOf(i);
      let total = 0;
      for (let i = 0; i < chunks.length; i++) total += durOf(i);
      setAudioClock({ elapsedSec: elapsed, totalSec: Math.max(elapsed, total) });
    };

    const buildBoundsAndSpans = () => {
      // Kalibrasikan seluruh chunk yang sudah memiliki durasi audio NYATA ke skala bobot prosodi bersama
      const knownPairs = decodedDurations
        .map((d, i) => (d && d > 0.25 ? { i, d, w: chunkWeights[i] } : null))
        .filter((x): x is { i: number; d: number; w: number } => Boolean(x));
      const knownSecSum = knownPairs.reduce((s, p) => s + p.d, 0);
      const knownWSum = knownPairs.reduce((s, p) => s + p.w, 0);
      const wPerSec = knownSecSum > 0.25 && knownWSum > 0 ? knownWSum / knownSecSum : 15;
      const effectiveWeights = chunkWeights.map((w, idx) =>
        decodedDurations[idx] && decodedDurations[idx]! > 0.25
          ? decodedDurations[idx]! * wPerSec
          : w
      );
      const totalWeight = Math.max(1, effectiveWeights.reduce((a, b) => a + b, 0));
      let prefixW = 0;
      const cBounds = effectiveWeights.map((w, idx) => {
        const startFrac = prefixW / totalWeight;
        prefixW += w;
        const endFrac = idx === chunks.length - 1 ? 1 : prefixW / totalWeight;
        return { startFrac, endFrac };
      });
      const aSpans: Array<{ stepIndex: number; startFrac: number; endFrac: number; caption: string }> = [];
      if (packedChunks.length > 0) {
        const stepRangeMap = new Map<number, { startFrac: number; endFrac: number; caption: string }>();
        packedChunks.forEach((pk, pkIdx) => {
          const cStart = cBounds[pkIdx].startFrac;
          const cSpan = Math.max(0.0001, cBounds[pkIdx].endFrac - cStart);
          let inChunkW = 0;
          const pkW = Math.max(1, pk.weight);
          pk.pieces.forEach((pc) => {
            const pStart = cStart + (inChunkW / pkW) * cSpan;
            inChunkW += pc.weight;
            const pEnd = cStart + (inChunkW / pkW) * cSpan;
            const prev = stepRangeMap.get(pc.stepIndex);
            if (!prev) {
              stepRangeMap.set(pc.stepIndex, { startFrac: pStart, endFrac: pEnd, caption: pc.caption });
            } else {
              prev.endFrac = Math.max(prev.endFrac, pEnd);
            }
          });
        });
        const ordered = Array.from(stepRangeMap.entries()).sort((a, b) => a[0] - b[0]);
        ordered.forEach(([stepIndex, rng], idx) => {
          aSpans.push({
            stepIndex,
            startFrac: idx === 0 ? 0 : rng.startFrac,
            endFrac: idx === ordered.length - 1 ? 1 : rng.endFrac,
            caption: rng.caption,
          });
        });
      }
      return { cBounds, aSpans: aSpans.length > 0 ? aSpans : spans };
    };
    const { cBounds: chunkBounds, aSpans: activeSpans } = buildBoundsAndSpans();

    let pauseTimerId = 0;

    const applyTrackFraction = (frac: number, allowComplete = true): boolean => {
      if (cancelled || lockstepSeqIdRef.current !== seqId) return true;
      const clampedRaw = Math.max(0, Math.min(1, frac));
      const f = allowComplete ? clampedRaw : Math.min(0.994, clampedRaw);
      trackFracRef.current = f;
      if (allowComplete && f >= 0.999) {
        lastCommitIdxRef.current = steps.length;
        lastCommitProgRef.current = 1;
        lastCommitProgAtRef.current = performance.now();
        setLockstepIndex(steps.length);
        setLockstepProgress(1);
        setIsWritingPlaying(false);
        setIsAudioPreparing(false);
        stopLockstepAudio();
        return true;
      }
      const { aSpans: currentSpans } = buildBoundsAndSpans();
      let matched = currentSpans[currentSpans.length - 1];
      for (let i = 0; i < currentSpans.length; i++) {
        if (f >= currentSpans[i].startFrac && (f < currentSpans[i].endFrac || i === currentSpans.length - 1)) {
          matched = currentSpans[i];
          break;
        }
      }
      const spanLen = Math.max(0.001, matched.endFrac - matched.startFrac);
      const rawLocalP = Math.max(0, Math.min(1, (f - matched.startFrac) / spanLen));
      // Izinkan progres langkah berjalan penuh 0.02 -> 0.995 sepanjang audio langkah tersebut agar Zoom In (0.015..0.84) & Zoom Out Transisi (0.84..0.995) serasi 1:1
      const localP = allowComplete && rawLocalP >= 0.99 ? rawLocalP : Math.max(0.02, Math.min(0.995, rawLocalP));
      const nowPerf = performance.now();
      const idxChanged = lastCommitIdxRef.current !== matched.stepIndex;
      if (idxChanged) {
        lastCommitIdxRef.current = matched.stepIndex;
        setLockstepIndex(matched.stepIndex);
      }
      const progDelta = Math.abs(localP - lastCommitProgRef.current);
      const minCommitIntervalMs = isMobileLowMem ? 72 : 28;
      const minProgDelta = isMobileLowMem ? 0.022 : 0.008;
      if (
        idxChanged ||
        localP <= 0.025 ||
        localP >= 0.99 ||
        (localP > 0.93 && lastCommitProgRef.current <= 0.93) ||
        (progDelta >= minProgDelta && nowPerf - lastCommitProgAtRef.current >= (isMobileLowMem ? 45 : 0)) ||
        nowPerf - lastCommitProgAtRef.current >= minCommitIntervalMs
      ) {
        lastCommitProgRef.current = localP;
        lastCommitProgAtRef.current = nowPerf;
        setLockstepProgress(localP);
      }
      // Tampilkan teks/judul langkah yang tepat saat tutor bicara agar sub-elemen & caption 100% sinkron
      if (matched.caption && lastCommitSubRef.current !== matched.caption) {
        lastCommitSubRef.current = matched.caption;
        setActiveStepSubtitle(matched.caption);
      }
      return false;
    };

    const runSilentClock = (totalSec: number, leadOffsetSec: number) => {
      trackTotalSecRef.current = totalSec;
      trackOffsetSecRef.current = Math.max(0, Math.min(totalSec * 0.98, leadOffsetSec));
      let lastPerf = performance.now();
      const tickClock = (now: number) => {
        if (cancelled || lockstepSeqIdRef.current !== seqId) return;
        const dtSec = Math.max(0, Math.min(0.12, (now - lastPerf) / 1000));
        lastPerf = now;
        trackOffsetSecRef.current += dtSec * playbackSpeedRef.current;
        const done = applyTrackFraction(trackOffsetSecRef.current / totalSec, true);
        if (!done) {
          rafId = requestAnimationFrame(tickClock);
        }
      };
      rafId = requestAnimationFrame(tickClock);
    };

    // Popup selalu memegang otoritas suara tunggal (outer Kawan Bicara sudah dibungkam saat modal terbuka)
    onStopMainAudioRef.current?.();

    // Pertanyaan lanjutan sedang diracik: BEKUKAN papan lama di posisinya (tanpa suara, tanpa jam senyap
    // yang berlari menghabiskan langkah lama). Papan baru akan mengambil alih begitu tiba.
    if (isGeneratingTopic) {
      stopLockstepAudio();
      return;
    }

    if (!fullScript) {
      runSilentClock(trackTotalSecRef.current || estTotalSec, trackOffsetSecRef.current);
      return () => {
        cancelled = true;
        cancelAnimationFrame(rafId);
        if (pauseTimerId) window.clearTimeout(pauseTimerId);
        stopLockstepAudio();
      };
    }

    const scriptWords = Math.max(8, fullScript.split(/\s+/).filter(Boolean).length);
    let succeededCount = 0;
    let decodedDurationSum = 0;
    let silentChunksCount = 0;
    const playedChunks: Array<{ idx: number; mode: string }> = [];
    const interChunkGapsMs: number[] = [];
    let lastChunkEndedPerf = 0;
    let wordClockMatchedCount = 0;

    const publishAudioDebug = (patch: Record<string, unknown>) => {
      try {
        const w = window as unknown as { __fzWbAudioDebug?: Record<string, unknown> };
        w.__fzWbAudioDebug = {
          ...(w.__fzWbAudioDebug || {}),
          seqId,
          scriptChars: fullScript.length,
          wordCount: scriptWords,
          chunksTotal: chunks.length,
          chunksSucceeded: succeededCount,
          silentChunksCount,
          playedChunks: [...playedChunks],
          durationSec: Number(decodedDurationSum.toFixed(2)),
          playbackSpeed: playbackSpeedRef.current,
          ...patch,
        };
      } catch {
        // Ignore window telemetry errors
      }
    };
    publishAudioDebug({
      chunksSucceeded: 0,
      silentChunksCount: 0,
      playedChunks: [],
      durationSec: 0,
      mode: 'synthesizing',
      isPlaying: true,
      completed: false,
      error: null,
    });

    type ChunkRes = {
      audioBuffer: AudioBuffer | null;
      dataUrl: string;
      durationSec: number;
      alignment?: SpeechAlignment | null;
    };

    const explicitTargetStep = seekTargetStepRef.current;
    seekTargetStepRef.current = null;
    const explicitTargetSpan =
      explicitTargetStep !== null ? activeSpans.find((s) => s.stepIndex === explicitTargetStep) : undefined;
    const explicitTargetChunkIdx =
      explicitTargetStep !== null ? packedChunks.findIndex((pk) => pk.stepIndex === explicitTargetStep) : -1;

    const resumeFrac =
      explicitTargetSpan
        ? explicitTargetSpan.startFrac
        : trackFracRef.current >= 0.992
          ? 0
          : trackFracRef.current > 0.005
            ? trackFracRef.current
            : trackTotalSecRef.current > 0
              ? Math.max(0, Math.min(0.99, trackOffsetSecRef.current / trackTotalSecRef.current))
              : 0;
    let startChunkIdx = explicitTargetChunkIdx >= 0 ? explicitTargetChunkIdx : 0;
    if (explicitTargetChunkIdx < 0) {
      for (let i = 0; i < chunkBounds.length; i++) {
        if (resumeFrac >= chunkBounds[i].startFrac && (resumeFrac < chunkBounds[i].endFrac || i === chunkBounds.length - 1)) {
          startChunkIdx = i;
          break;
        }
      }
    }
    const startSpan = Math.max(0.001, chunkBounds[startChunkIdx].endFrac - chunkBounds[startChunkIdx].startFrac);
    const startIntraFrac =
      explicitTargetChunkIdx >= 0
        ? 0
        : Math.max(0, Math.min(0.95, (resumeFrac - chunkBounds[startChunkIdx].startFrac) / startSpan));

    const activePersona = personaRef.current;
    const maxTrackCacheSize = isMobileLowMem ? 2 : 16;

    const decodeChunkPayload = async (
      idx: number,
      audioBase64: string,
      audioMimeType?: string
    ): Promise<ChunkRes> => {
      const chunkText = chunks[idx] || '';
      let audioBuffer: AudioBuffer | null = null;
      let durationSec = 0;
      let alignment: SpeechAlignment | null = null;
      let ctxRunning = false;
      try {
        const bin = atob(audioBase64);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        const ctx = getSharedBoardAudioContext();
        if (ctx && ctx.state !== 'closed') {
          trackAudioCtxRef.current = ctx;
          ctxRunning = ctx.state === 'running';
          const decoded = await decodeAudioDataSafe(ctx, bytes.buffer, isMobileLowMem ? 3800 : 5000);
          if (decoded && decoded.duration > 0.18) {
            // Mobile PWA Memory Discipline: skip extra Float32 AudioBuffer reallocation via processSpeechBuffer
            // (alignWordsToSpeech uses zero-copy toMonoView on mono buffers -> slashes peak RAM ~15MB -> ~2.5MB/chunk!)
            audioBuffer = isMobileLowMem
              ? decoded
              : processSpeechBuffer(ctx, decoded, BOARD_SPEECH_PROCESSING);
            durationSec = audioBuffer.duration;
            const exactSpokenForAlign = alignedChunkTexts[idx] || chunkText;
            alignment = alignWordsToSpeech(exactSpokenForAlign, audioBuffer);
          }
        }
      } catch {
        // Fallback neatly to HTMLAudioElement if decodeAudioData fails
      }
      if (!durationSec) {
        durationSec = Math.max(1.8, chunkWeights[idx] * 0.068);
      }
      // On Mobile PWA, do NOT retain ~700KB base64 dataUrl string when WebAudio decoded & context is running
      const dataUrl =
        isMobileLowMem && audioBuffer && ctxRunning
          ? ''
          : `data:${audioMimeType || 'audio/wav'};base64,${audioBase64}`;
      return { audioBuffer, dataUrl, durationSec, alignment };
    };

    const fetchAndDecodeChunk = (idx: number): Promise<ChunkRes | null> => {
      const chunkText = chunks[idx];
      const chunkKey = `${activePersona.id}::${locCode}::chunk::${chunkText}`;
      const existing = trackCacheRef.current.get(chunkKey);
      if (existing) {
        return existing.then((res) => {
          if (res && !cancelled && lockstepSeqIdRef.current === seqId) {
            decodedDurations[idx] = res.durationSec;
            succeededCount = Math.min(chunks.length, succeededCount + 1);
            decodedDurationSum += res.durationSec;
            publishAudioDebug({});
          }
          return res;
        });
      }

      const promise = (async (): Promise<ChunkRes | null> => {
        if (cancelled || lockstepSeqIdRef.current !== seqId) return null;
        let tts = await synthesizeFlexibleTts({
          text: chunkText,
          targetLang: locCode,
          persona: activePersona,
        }).catch(() => null);
        if (!tts?.audioBase64) {
          if (cancelled || lockstepSeqIdRef.current !== seqId) return null;
          await new Promise((r) => window.setTimeout(r, 180));
          if (cancelled || lockstepSeqIdRef.current !== seqId) return null;
          tts = await synthesizeFlexibleTts({
            text: chunkText,
            targetLang: locCode,
            persona: activePersona,
            force: true,
          }).catch(() => null);
        }
        if (cancelled || lockstepSeqIdRef.current !== seqId) return null;
        if (!tts?.audioBase64) return null;

        return decodeChunkPayload(idx, tts.audioBase64, tts.audioMimeType);
      })();

      promise.then((res) => {
        if (!res && trackCacheRef.current.get(chunkKey) === promise) {
          trackCacheRef.current.delete(chunkKey);
        }
      });

      while (trackCacheRef.current.size >= maxTrackCacheSize) {
        const oldestKey = trackCacheRef.current.keys().next().value;
        if (oldestKey !== undefined) trackCacheRef.current.delete(oldestKey);
        else break;
      }
      trackCacheRef.current.set(chunkKey, promise);
      return promise.then((res) => {
        if (res && !cancelled && lockstepSeqIdRef.current === seqId) {
          decodedDurations[idx] = res.durationSec;
          succeededCount = Math.min(chunks.length, succeededCount + 1);
          decodedDurationSum += res.durationSec;
          publishAudioDebug({});
        }
        return res;
      });
    };

    // Sliding Lookahead Pipeline:
    // - Desktop: 4x Lookahead Pool for 0ms inter-chunk transitions across full board
    // - Mobile PWA (iOS Safari / Android Chrome): Strict 1-ahead sliding window (max 2 chunks decoded at once)
    //   so PCM Float32 memory stays <15MB and NEVER triggers WebKit Jetsam / OOM kill!
    const startedFlags = new Set<number>();
    let activePlayChunk = startChunkIdx;
    const resolvedChunkMap = new Map<number, ChunkRes | null>();

    const chunkDeferredMap = new Map<
      number,
      { resolve: (v: ChunkRes | null) => void; promise: Promise<ChunkRes | null> }
    >();
    const chunkPromiseMap = new Map<number, Promise<ChunkRes | null>>();
    for (let i = 0; i < chunks.length; i++) {
      let resFn!: (v: ChunkRes | null) => void;
      const p = new Promise<ChunkRes | null>((resolve) => {
        resFn = resolve;
      });
      chunkDeferredMap.set(i, { resolve: resFn, promise: p });
      chunkPromiseMap.set(i, p);
    }

    const resolveChunkResult = (idx: number, res: ChunkRes | null) => {
      resolvedChunkMap.set(idx, res);
      chunkDeferredMap.get(idx)?.resolve(res);
    };

    const pickNextPendingChunkIdx = (): number | null => {
      const upperBound = isMobileLowMem
        ? Math.min(chunks.length, activePlayChunk + 2)
        : chunks.length;
      for (let i = activePlayChunk; i < upperBound; i++) {
        if (!startedFlags.has(i)) return i;
      }
      if (!isMobileLowMem) {
        for (let i = 0; i < activePlayChunk; i++) {
          if (!startedFlags.has(i)) return i;
        }
      }
      return null;
    };

    let mobileWorkerActive = false;
    const runLookaheadWorker = async () => {
      if (isMobileLowMem) {
        if (mobileWorkerActive) return;
        mobileWorkerActive = true;
      }
      try {
        while (!cancelled && lockstepSeqIdRef.current === seqId) {
          const nextIdx = pickNextPendingChunkIdx();
          if (nextIdx === null) break;
          startedFlags.add(nextIdx);
          const res = await fetchAndDecodeChunk(nextIdx);
          resolveChunkResult(nextIdx, res);
        }
      } finally {
        if (isMobileLowMem) mobileWorkerActive = false;
      }
    };

    const ensureMobileSlidingLookahead = () => {
      if (cancelled || lockstepSeqIdRef.current !== seqId) return;
      if (isMobileLowMem) {
        void runLookaheadWorker();
      }
    };

    // Launch Chunk 0 / target start chunk immediately; kick lookahead cleanly
    if (chunks.length > 0) {
      startedFlags.add(startChunkIdx);
      const firstPromise = fetchAndDecodeChunk(startChunkIdx).then((res) => {
        resolveChunkResult(startChunkIdx, res);
        return res;
      });
      let lookaheadStarted = false;
      const kickLookahead = () => {
        if (lookaheadStarted || cancelled || lockstepSeqIdRef.current !== seqId) return;
        lookaheadStarted = true;
        const lookaheadWorkers = isMobileLowMem
          ? Math.min(1, Math.max(0, chunks.length - 1))
          : Math.min(4, Math.max(0, chunks.length - 1));
        for (let w = 0; w < lookaheadWorkers; w++) {
          void runLookaheadWorker();
        }
      };
      void firstPromise.then(kickLookahead);
      if (!isMobileLowMem) {
        window.setTimeout(kickLookahead, 20);
      }
    }

    // Tahan kursor tepat di pembuka langkah awal selagi Chunk-0 disintesis (ZERO pre-advance sebelum suara mulai!).
    // Tunda 60ms sebelum menampilkan pill "Menyiapkan suara" agar klik Resume/Play dari cache tidak berkedip kuning.
    let prepTimerId = window.setTimeout(() => {
      if (!cancelled && lockstepSeqIdRef.current === seqId) {
        setIsAudioPreparing(true);
      }
    }, 60);
    const activeStartSpan = explicitTargetSpan || activeSpans[0] || { startFrac: 0, endFrac: 0.2 };
    const idleEntryFrac = explicitTargetSpan
      ? explicitTargetSpan.startFrac + Math.max(0.001, explicitTargetSpan.endFrac - explicitTargetSpan.startFrac) * 0.025
      : Math.max(
          resumeFrac,
          activeStartSpan.startFrac + Math.max(0.001, activeStartSpan.endFrac - activeStartSpan.startFrac) * 0.025
        );
    applyTrackFraction(idleEntryFrac, false);

    const playChunkAt = async (chunkIdx: number, intraFrac = 0): Promise<void> => {
      if (cancelled || lockstepSeqIdRef.current !== seqId) return;
      activePlayChunk = chunkIdx;
      ensureMobileSlidingLookahead();
      if (chunkIdx >= chunks.length) {
        setIsStepAudioActive(false);
        setIsAudioPreparing(false);
        publishAudioDebug({ isPlaying: false, completed: true });
        applyTrackFraction(1, true);
        return;
      }

      const resolveLiveChunkBounds = () => {
        const { cBounds: liveCBounds } = buildBoundsAndSpans();
        return liveCBounds[chunkIdx] || chunkBounds[chunkIdx] || { startFrac: 0, endFrac: 1 };
      };
      const applyChunkLocalRatio = (localRatio: number) => {
        const { startFrac: liveStart, endFrac: liveEnd } = resolveLiveChunkBounds();
        applyTrackFraction(liveStart + localRatio * (liveEnd - liveStart), false);
      };
      const isLastChunk = chunkIdx === chunks.length - 1;
      let chunkRes: ChunkRes | null = resolvedChunkMap.has(chunkIdx)
        ? (resolvedChunkMap.get(chunkIdx) ?? null)
        : null;
      if (!resolvedChunkMap.has(chunkIdx)) {
        const chunkPromise = chunkPromiseMap.get(chunkIdx)!;
        const raceTimeoutMs = chunkIdx === startChunkIdx ? 11000 : 14000;
        let raceTimeoutId = 0;
        const raceTimeout = new Promise<null>((resolve) => {
          raceTimeoutId = window.setTimeout(() => resolve(null), raceTimeoutMs);
        });
        chunkRes = await Promise.race([chunkPromise, raceTimeout]);
        window.clearTimeout(raceTimeoutId);
      }
      if (cancelled || lockstepSeqIdRef.current !== seqId) return;
      if (chunkIdx === startChunkIdx) {
        window.clearTimeout(prepTimerId);
        setIsAudioPreparing(false);
      }
      cancelAnimationFrame(rafId);

      // NEURAL-ONLY VOICE INVARIANT: Banned 100% browser window.speechSynthesis robotic TTS!
      // Bila prefetch timeout/kosong, coba 1x sintesis Neural darurat paksa (force Edge Neural / Gemini) sebelum jatuh ke pacing visual senyap.
      if (!chunkRes) {
        const emergencyTts = await synthesizeFlexibleTts({
          text: chunks[chunkIdx] || '',
          targetLang: locCode,
          persona: activePersona,
          force: true,
        }).catch(() => null);
        if (cancelled || lockstepSeqIdRef.current !== seqId) return;
        if (emergencyTts?.audioBase64) {
          chunkRes = await decodeChunkPayload(
            chunkIdx,
            emergencyTts.audioBase64,
            emergencyTts.audioMimeType
          );
          if (cancelled || lockstepSeqIdRef.current !== seqId) return;
          succeededCount = Math.min(chunks.length, succeededCount + 1);
          decodedDurationSum += chunkRes.durationSec;
          decodedDurations[chunkIdx] = chunkRes.durationSec;
          resolvedChunkMap.set(chunkIdx, chunkRes);
        }
      }

      const revealCanvasNow = () => {
        if (!hasRevealedCanvasRef.current) {
          hasRevealedCanvasRef.current = true;
          setIsInitialAudioGateActive(false);
        }
      };

      let safetyWatchdogId = 0;
      const advanceToNextOrDone = () => {
        window.clearTimeout(safetyWatchdogId);
        if (cancelled || lockstepSeqIdRef.current !== seqId) return;
        cancelAnimationFrame(rafId);
        // Mobile PWA Memory Discipline: release finished Float32 PCM buffer & base64 dataUrl immediately once played
        if (isMobileLowMem) {
          const finished = resolvedChunkMap.get(chunkIdx);
          if (finished) {
            finished.audioBuffer = null;
            finished.dataUrl = '';
          }
          resolvedChunkMap.delete(chunkIdx);
          const playedChunkText = chunks[chunkIdx];
          if (playedChunkText) {
            trackCacheRef.current.delete(`${activePersona.id}::${locCode}::chunk::${playedChunkText}`);
          }
        }
        if (isLastChunk) {
          setIsStepAudioActive(false);
          setNeedsAudioUnlock(false);
          publishAudioDebug({ isPlaying: false, completed: true, interChunkGapsMs: [...interChunkGapsMs], wordClockMatchedCount });
          applyTrackFraction(1, true);
        } else {
          lastChunkEndedPerf = performance.now();
          applyTrackFraction(resolveLiveChunkBounds().endFrac, false);
          void playChunkAt(chunkIdx + 1, 0);
        }
      };

      const runTimedSilentFallback = (
        estChunkSec: number,
        modeLabel: 'silent_timeout' | 'silent_autoplay_blocked' | 'html_audio_error',
        errorTag?: string
      ) => {
        window.clearTimeout(safetyWatchdogId);
        if (cancelled || lockstepSeqIdRef.current !== seqId) return;
        cancelAnimationFrame(rafId);
        setIsStepAudioActive(false);
        if (modeLabel === 'silent_autoplay_blocked') {
          ensureGlobalGestureUnlockListener();
          setNeedsAudioUnlock(true);
        }
        silentChunksCount += 1;
        playedChunks.push({ idx: chunkIdx, mode: modeLabel });
        publishAudioDebug({
          mode: modeLabel,
          isPlaying: true,
          activeChunk: chunkIdx,
          ...(errorTag ? { error: errorTag } : {}),
        });
        let localElapsed = intraFrac * estChunkSec;
        let lastPerf = performance.now();
        const tickChunkSilent = (now: number) => {
          if (cancelled || lockstepSeqIdRef.current !== seqId) return;
          const dtSec = Math.max(0, Math.min(0.12, (now - lastPerf) / 1000));
          lastPerf = now;
          localElapsed += dtSec * playbackSpeedRef.current;
          const localRatio = Math.max(0, Math.min(1, localElapsed / Math.max(0.5, estChunkSec)));
          if (localRatio >= 0.999) {
            advanceToNextOrDone();
          } else {
            applyChunkLocalRatio(localRatio);
            rafId = requestAnimationFrame(tickChunkSilent);
          }
        };
        rafId = requestAnimationFrame(tickChunkSilent);
      };

      // Bila jaringan offline total dan seluruh jalur Neural gagal, lanjutkan penulisan papan secara senyap (TANPA suara robot OS speechSynthesis)
      if (!chunkRes) {
        revealCanvasNow();
        const estChunkSec = Math.max(2.0, chunkWeights[chunkIdx] * 0.068);
        runTimedSilentFallback(estChunkSec, 'silent_timeout', 'tts_timeout_or_empty');
        return;
      }

      const chunkDurSec = Math.max(0.4, chunkRes.durationSec);
      const seekInChunkSec = Math.max(0, Math.min(chunkDurSec - 0.1, intraFrac * chunkDurSec));
      const chunkAlignment = chunkRes.alignment;
      const chunkWordMap = chunkWordMaps[chunkIdx];
      const useWordClock = Boolean(
        chunkAlignment && chunkWordMap && chunkAlignment.times.length === chunkWordMap.count && chunkWordMap.count > 0
      );
      const leadTrim = Math.min(0.05, chunkDurSec * 0.02);
      const tailTrim = Math.min(0.07, chunkDurSec * 0.025);
      const speakWindow = Math.max(0.22, chunkDurSec - leadTrim - tailTrim);
      const computeLocalRatioFromAudible = (audibleSec: number): number => {
        if (useWordClock && chunkAlignment && chunkWordMap) {
          // Kunci ke kata yang sedang diucapkan: papan berhenti saat tutor jeda, melaju saat tutor bicara
          const { wordIdx, partial } = locateWordAt(chunkAlignment, audibleSec);
          const fa = chunkWordMap.fracs[wordIdx] ?? 0;
          const fb = chunkWordMap.fracs[wordIdx + 1] ?? 1;
          if (audibleSec >= chunkAlignment.times[0].start - 0.02) {
            publishSpokenWord(chunkIdx, wordIdx, Math.min(chunkDurSec, audibleSec));
          }
          return Math.max(0, Math.min(0.996, fa + (fb - fa) * partial));
        }
        return Math.max(0, Math.min(0.996, (audibleSec - leadTrim) / speakWindow));
      };

      // Prioritas 1: Web Audio API AudioBufferSourceNode per-kalimat
      if (chunkRes.audioBuffer && trackAudioCtxRef.current && trackAudioCtxRef.current.state !== 'closed') {
        try {
          const ctx = trackAudioCtxRef.current;
          if (ctx.state === 'suspended') {
            await resumeAudioContextBounded(ctx, 220);
          }
          if (cancelled || lockstepSeqIdRef.current !== seqId) return;
          if (ctx.state === 'running') {
            setNeedsAudioUnlock(false);
            const src = ctx.createBufferSource();
            src.buffer = chunkRes.audioBuffer;
            src.playbackRate.value = playbackSpeedRef.current;
            src.connect(ctx.destination);
            trackSourceNodeRef.current = src;

            let settled = false;
            const completeBuffer = () => {
              if (settled || cancelled || lockstepSeqIdRef.current !== seqId) return;
              settled = true;
              advanceToNextOrDone();
            };
            src.onended = completeBuffer;

            onStopMainAudioRef.current?.();
            try {
              (window as unknown as { __fzWbLockstepActive?: boolean }).__fzWbLockstepActive = true;
            } catch {
              // Ignore
            }
            src.start(0, seekInChunkSec);
            if (lastChunkEndedPerf > 0) {
              interChunkGapsMs.push(Math.round(performance.now() - lastChunkEndedPerf));
              lastChunkEndedPerf = 0;
            }
            if (useWordClock) wordClockMatchedCount += 1;
            setIsStepAudioActive(true);
            playedChunks.push({ idx: chunkIdx, mode: 'webaudio' });
            publishAudioDebug({
              mode: 'webaudio',
              isPlaying: true,
              completed: false,
              activeChunk: chunkIdx,
              interChunkGapsMs: [...interChunkGapsMs],
              wordClockMatchedCount,
            });
            revealCanvasNow();
            const remainingSec = Math.max(0.5, chunkDurSec - seekInChunkSec);
            safetyWatchdogId = window.setTimeout(
              completeBuffer,
              Math.ceil((remainingSec / Math.max(0.6, playbackSpeedRef.current) + 5) * 1000)
            );
            let anchorAudioSec = seekInChunkSec;
            let anchorCtxTime = ctx.currentTime;
            let anchorRate = playbackSpeedRef.current;
            // Latensi keluaran penuh (termasuk headset Bluetooth) agar papan mengikuti suara yang BENAR-BENAR terdengar,
            // dikurangi ~45 ms lead visual (seperti subtitle film yang muncul sepersekian detik sebelum diucapkan).
            const hwLatency = Math.min(
              0.3,
              (ctx.baseLatency || 0) + ((ctx as unknown as { outputLatency?: number }).outputLatency || 0)
            );
            const outLatCompensation = hwLatency - 0.045;
            const syncBufferFrame = () => {
              if (settled || cancelled || lockstepSeqIdRef.current !== seqId) return;
              const nowCtx = ctx.currentTime;
              const currRate = playbackSpeedRef.current;
              const elapsedInAnchor = Math.max(0, nowCtx - anchorCtxTime);
              const currentAudioSec = anchorAudioSec + elapsedInAnchor * anchorRate;
              if (Math.abs(currRate - anchorRate) > 0.001) {
                anchorAudioSec = currentAudioSec;
                anchorCtxTime = nowCtx;
                anchorRate = currRate;
                try {
                  src.playbackRate.value = currRate;
                } catch {}
              }
              const audibleSec = Math.max(0, currentAudioSec - outLatCompensation);
              const localRatio = computeLocalRatioFromAudible(audibleSec);
              applyChunkLocalRatio(localRatio);
              if (!settled) {
                rafId = requestAnimationFrame(syncBufferFrame);
              }
            };
            rafId = requestAnimationFrame(syncBufferFrame);
            return;
          }
        } catch {
          // Fall through cleanly to HTMLAudioElement
        }
      }

      // Prioritas 2: HTMLAudioElement terpisah per-kalimat jika WebAudio suspended
      if (cancelled || lockstepSeqIdRef.current !== seqId) return;
      if (!chunkRes.dataUrl) {
        revealCanvasNow();
        runTimedSilentFallback(chunkDurSec, 'silent_autoplay_blocked');
        return;
      }
      const audio = new Audio(chunkRes.dataUrl);
      audio.playbackRate = playbackSpeedRef.current;
      lockstepAudioRef.current = audio;
      try {
        if (seekInChunkSec > 0.05) audio.currentTime = seekInChunkSec;
      } catch {}

      const releaseHtmlAudio = () => {
        try {
          audio.onended = null;
          audio.onerror = null;
          audio.pause();
          audio.removeAttribute('src');
          audio.load();
        } catch {}
      };
      let settled = false;
      const completeHtmlAudio = () => {
        if (settled || cancelled || lockstepSeqIdRef.current !== seqId) return;
        settled = true;
        releaseHtmlAudio();
        advanceToNextOrDone();
      };
      audio.onended = completeHtmlAudio;
      audio.onerror = () => {
        if (!settled && !cancelled && lockstepSeqIdRef.current === seqId) {
          settled = true;
          releaseHtmlAudio();
          runTimedSilentFallback(chunkDurSec, 'html_audio_error', 'html_audio_decode_error');
        }
      };

      onStopMainAudioRef.current?.();
      const htmlPlayStatus = await playHtmlAudioBounded(audio, 650);
      if (cancelled || lockstepSeqIdRef.current !== seqId) {
        releaseHtmlAudio();
        return;
      }
      if (htmlPlayStatus === 'playing') {
        try {
          (window as unknown as { __fzWbLockstepActive?: boolean }).__fzWbLockstepActive = true;
        } catch {
          // Ignore
        }
        setNeedsAudioUnlock(false);
        setIsStepAudioActive(true);
        revealCanvasNow();
        playedChunks.push({ idx: chunkIdx, mode: 'html_audio' });
        publishAudioDebug({ mode: 'html_audio', isPlaying: true, completed: false, activeChunk: chunkIdx });
        const remainingSec = Math.max(0.5, chunkDurSec - seekInChunkSec);
        safetyWatchdogId = window.setTimeout(
          completeHtmlAudio,
          Math.ceil((remainingSec / Math.max(0.6, playbackSpeedRef.current) + 5) * 1000)
        );
        const syncHtmlAudioFrame = () => {
          if (settled || cancelled || lockstepSeqIdRef.current !== seqId) return;
          try { audio.playbackRate = playbackSpeedRef.current; } catch {}
          const localRatio = computeLocalRatioFromAudible(Math.max(0, audio.currentTime - 0.02));
          applyChunkLocalRatio(localRatio);
          if (!audio.ended && !settled) {
            rafId = requestAnimationFrame(syncHtmlAudioFrame);
          }
        };
        rafId = requestAnimationFrame(syncHtmlAudioFrame);
      } else {
        try {
          audio.pause();
          audio.removeAttribute('src');
        } catch {}
        if (!settled && !cancelled && lockstepSeqIdRef.current === seqId) {
          settled = true;
          revealCanvasNow();
          ensureGlobalGestureUnlockListener();
          setNeedsAudioUnlock(true);
          setIsStepAudioActive(false);
          if (chunkIdx === 0 && intraFrac < 0.08) {
            // MOBILE PWA STEP-0 HOLD: Jangan melangkahi penjelasan saat audio awal diblokir;
            // tampilkan tombol langsung di atas papan agar 1 ketukan langsung menyalakan suara & visual serentak dari detik 0!
            silentChunksCount += 1;
            playedChunks.push({ idx: chunkIdx, mode: 'silent_autoplay_blocked' });
            publishAudioDebug({ mode: 'silent_autoplay_blocked', isPlaying: true, completed: false, activeChunk: 0 });
            applyTrackFraction(idleEntryFrac, false);
          } else {
            runTimedSilentFallback(chunkDurSec, 'silent_autoplay_blocked');
          }
        }
      }
    };

    void playChunkAt(startChunkIdx, startIntraFrac);

    return () => {
      cancelled = true;
      window.clearTimeout(prepTimerId);
      cancelAnimationFrame(rafId);
      if (pauseTimerId) window.clearTimeout(pauseTimerId);
      stopLockstepAudio();
    };
  }, [
    isOpen,
    isReady,
    boardState?.contextMode,
    focusType,
    uiAction?.focusType,
    // Catatan: isLiveConnected / isPlayingPreview / forceManualTts / sourceLayer sengaja TIDAK menjadi dependensi.
    // Nilai itu tidak dipakai di efek ini; dulu setiap kali papan membungkam audio utama (isPlayingPreview true->false)
    // efek ikut di-restart dan memotong kalimat pembuka tutor di tengah jalan.
    cohesiveAudioPlan?.fullScript,
    isWritingPlaying,
    isGeneratingTopic,
    locale,
    effectiveBoardLocale,
    persona?.id,
    seekNonce,
    replayNonce,
  ]);

  const isWidePteCanvas =
    boardState?.contextMode === 'pte_describe_image' ||
    boardState?.contextMode === 'pte_read_aloud' ||
    focusType === 'pte_describe_image' ||
    focusType === 'pte_read_aloud' ||
    uiAction?.focusType === 'pte_describe_image' ||
    uiAction?.focusType === 'pte_read_aloud' ||
    scenario?.competencyId === 'speak_pte_describe_image' ||
    scenario?.competencyId === 'speak_pte_read_aloud' ||
    Boolean(scenario?.id?.startsWith('scen_pte_di')) ||
    Boolean(scenario?.id?.startsWith('scen_pte_ra'));

  const isSpecialCanvasModal =
    isWidePteCanvas ||
    boardState?.contextMode === 'pte_scorecard' ||
    boardState?.contextMode === 'read_aloud' ||
    boardState?.contextMode === 'ssw_tactical_board' ||
    focusType === 'read_aloud' ||
    focusType === 'ssw_tactical_board' ||
    uiAction?.focusType === 'read_aloud' ||
    uiAction?.focusType === 'ssw_tactical_board';
  const isPteModal = isSpecialCanvasModal;

  // Laporkan penyelesaian presentasi papan tulis (Solvely Walkthrough Completed) ke Braincore 1x per topik.
  // WAJIB berada SEBELUM early-return (`!isOpen` / `isMinimized`): hook setelah return bersyarat memicu
  // React error #300 ("Rendered fewer hooks") dan meruntuhkan seluruh Voice Studio saat papan diminimalkan.
  useEffect(() => {
    if (!isOpen || !isReady || !boardState || isSpecialCanvasModal || !whiteboardPlan) return;
    if (whiteboardPlan.steps.length >= 2 && lockstepIndex >= whiteboardPlan.steps.length - 1) {
      if (!reportedBoardDoneKeysRef.current.has(currentKey)) {
        reportedBoardDoneKeysRef.current.add(currentKey);
        onWhiteboardBraincoreEventRef.current?.({
          kind: 'board_completed',
          topicTitle: boardState.topicTitle,
          targetText: boardState.standardTarget?.text || uiAction?.sampleTarget || boardState.topicTitle,
          isCorrect: true,
        });
      }
    }
  }, [isOpen, isReady, boardState, isSpecialCanvasModal, whiteboardPlan, lockstepIndex, currentKey, uiAction?.sampleTarget]);

  // Pandu murid otomatis ke kartu latihan begitu tutor selesai menjelaskan seluruh langkah papan
  const autoScrolledQuizKeyRef = useRef<string>('');
  useEffect(() => {
    if (!isOpen || !isReady || isSpecialCanvasModal || !whiteboardPlan || isQuizCompleted) return;
    if (lockstepIndex >= whiteboardPlan.steps.length && autoScrolledQuizKeyRef.current !== currentKey) {
      autoScrolledQuizKeyRef.current = currentKey;
      window.setTimeout(() => {
        try {
          document.querySelector('[data-testid="in-call-workbench-quiz"]')?.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          });
        } catch {
          // Ignore scroll errors
        }
      }, 240);
    }
  }, [isOpen, isReady, isSpecialCanvasModal, whiteboardPlan, lockstepIndex, isQuizCompleted, currentKey]);

  const triggerRemediationActionRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    if (!isOpen || !quizCoachReply || quizCoachReply.status !== 'wrong') return;
    if (quizCoachReply.autoRemediateLeftSec === null) return;
    if (quizCoachReply.autoRemediateLeftSec <= 0) {
      triggerRemediationActionRef.current?.();
      return;
    }
    const tid = window.setTimeout(() => {
      setQuizCoachReply((prev) =>
        prev && prev.status === 'wrong' && prev.autoRemediateLeftSec !== null
          ? { ...prev, autoRemediateLeftSec: Math.max(0, prev.autoRemediateLeftSec - 1) }
          : prev
      );
    }, 1000);
    return () => window.clearTimeout(tid);
  }, [isOpen, quizCoachReply?.status, quizCoachReply?.autoRemediateLeftSec]);

  if (!isOpen) return null;

  const resolvedMisconceptionId =
    topMisconceptionId ||
    uiAction?.misconceptionId ||
    (boardState?.topicTitle
      ? `wb_${boardState.topicTitle.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 32)}`
      : 'workbench_syntax_slip');

  const speakQuizCoachLine = (spokenText: string) => {
    const cleanText = String(spokenText || '').trim();
    if (!cleanText) return;
    unlockSharedBoardAudioContext();
    stopLockstepAudio();
    stopQuizCoachSpeech();
    onStopMainAudioRef.current?.();
    const token = ++quizSpeechTokenRef.current;
    const langCode = String(effectiveBoardLocale || 'id').toLowerCase().split(/[-_]/)[0];
    setQuizCoachReply((prev) => (prev ? { ...prev, isSpeaking: true } : prev));
    void (async () => {
      try {
        const tts = await synthesizeFlexibleTts({
          text: cleanText,
          targetLang: langCode,
          persona: personaRef.current,
          force: true,
        }).catch(() => null);
        if (quizSpeechTokenRef.current !== token || !tts?.audioBase64) {
          if (quizSpeechTokenRef.current === token) {
            setQuizCoachReply((prev) => (prev ? { ...prev, isSpeaking: false } : prev));
          }
          return;
        }
        const ctx = getSharedBoardAudioContext();
        if (ctx && ctx.state !== 'closed') {
          if (ctx.state === 'suspended') {
            await resumeAudioContextBounded(ctx, 220);
          }
          if (quizSpeechTokenRef.current !== token) return;
          if (ctx.state === 'running') {
            try {
              const bin = atob(tts.audioBase64);
              const bytes = new Uint8Array(bin.length);
              for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
              const decoded = await decodeAudioDataSafe(ctx, bytes.buffer, 3800);
              if (!decoded) throw new Error('decode_failed');
              if (quizSpeechTokenRef.current !== token) return;
              const src = ctx.createBufferSource();
              src.buffer = decoded;
              src.connect(ctx.destination);
              quizSpeechSourceRef.current = src;
              src.onended = () => {
                if (quizSpeechTokenRef.current === token) {
                  setQuizCoachReply((prev) => (prev ? { ...prev, isSpeaking: false } : prev));
                }
              };
              src.start(0);
              return;
            } catch {
              // Fall through to HTMLAudioElement
            }
          }
        }
        const dataUrl = `data:${tts.audioMimeType || 'audio/wav'};base64,${tts.audioBase64}`;
        const a = new Audio(dataUrl);
        quizSpeechHtmlAudioRef.current = a;
        const releaseQuizAudio = () => {
          try {
            a.onended = null;
            a.pause();
            a.removeAttribute('src');
            a.load();
          } catch {}
        };
        a.onended = () => {
          releaseQuizAudio();
          if (quizSpeechTokenRef.current === token) {
            setQuizCoachReply((prev) => (prev ? { ...prev, isSpeaking: false } : prev));
          }
        };
        const st = await playHtmlAudioBounded(a, 650);
        if (st !== 'playing') {
          releaseQuizAudio();
          if (quizSpeechTokenRef.current === token) {
            setQuizCoachReply((prev) => (prev ? { ...prev, isSpeaking: false } : prev));
          }
        }
      } catch {
        if (quizSpeechTokenRef.current === token) {
          setQuizCoachReply((prev) => (prev ? { ...prev, isSpeaking: false } : prev));
        }
      }
    })();
  };

  const triggerDifferentAngleRemediation = (wrongAns: string, rightAns: string) => {
    stopQuizCoachSpeech();
    setQuizCoachReply(null);
    const cleanWrong = String(wrongAns || '').trim();
    const cleanRight = String(rightAns || '').trim();
    const prompt = wbT(
      effectiveBoardLocale,
      `[REMEDIATION_DIFFERENT_ANGLE] I just answered "${cleanWrong}" instead of "${cleanRight}" on "${boardState?.topicTitle || topicTitle}". Please explain this again from zero using a completely DIFFERENT visual diagram and a much simpler everyday analogy until I truly understand, then give me a fresh practice quiz!`,
      `[REMEDIATION_DIFFERENT_ANGLE] Aku baru saja salah memilih "${cleanWrong}" padahal yang benar "${cleanRight}" pada materi "${boardState?.topicTitle || topicTitle}". Tolong jelaskan ulang dari nol memakai diagram visual dan analogi yang BERBEDA agar aku benar-benar paham, lalu berikan latihan soal baru!`,
      `[REMEDIATION_DIFFERENT_ANGLE] ฉันเพิ่งตอบผิดว่า "${cleanWrong}" แทนที่จะเป็น "${cleanRight}" ในหัวข้อ "${boardState?.topicTitle || topicTitle}" ช่วยอธิบายใหม่จากพื้นฐานด้วยแผนภาพและตัวอย่างเปรียบเทียบแบบใหม่ที่เข้าใจง่ายกว่าเดิม พร้อมโจทย์ฝึกหัดข้อใหม่!`
    );
    handleSubmitBoardQuestion(prompt, cleanWrong || boardState?.topicTitle);
  };

  triggerRemediationActionRef.current = () => {
    if (!quizCoachReply || quizCoachReply.status !== 'wrong') return;
    triggerDifferentAngleRemediation(quizCoachReply.userAnswer, quizCoachReply.correctAnswer);
  };

  const handleQuizOutcome = (params: {
    isCorrect: boolean;
    userAnswer: string;
    correctAnswer: string;
    reasonHint?: string;
  }) => {
    const cleanUser = String(params.userAnswer || '').trim();
    const cleanRight = String(params.correctAnswer || '').trim();
    const reasonClean = String(params.reasonHint || uiAction?.trapWrongReason || '').trim();
    if (params.isCorrect) {
      setQuizWrongCount(0);
      const headline = wbT(
        effectiveBoardLocale,
        'Great job! You nailed it.',
        'Mantap! Jawabanmu sudah tepat.',
        'เก่งมาก! คำตอบของคุณถูกต้องแล้ว'
      );
      const spokenMessage = wbT(
        effectiveBoardLocale,
        `Spot on! "${cleanRight}" is completely accurate. Would you like to continue with another practice question on this topic, dive deeper with a new example, or move on to a different problem?`,
        `Mantap sekali! Jawabanmu "${cleanRight}" sudah tepat. Mau lanjut latihan soal berikutnya untuk topik ini, pendalaman dengan contoh lain, atau kita lanjut ke permasalahan lain?`,
        `ยอดเยี่ยมมาก! คำตอบ "${cleanRight}" ถูกต้องแล้ว อยากทำแบบฝึกหัดข้อถัดไปในเรื่องนี้ ลองดูตัวอย่างเพิ่มเติม หรือเปลี่ยนไปหัวข้ออื่นดี?`
      );
      setQuizCoachReply({
        status: 'correct',
        headline,
        spokenMessage,
        detailNote: reasonClean,
        userAnswer: cleanUser,
        correctAnswer: cleanRight,
        autoRemediateLeftSec: null,
        isSpeaking: true,
      });
      speakQuizCoachLine(spokenMessage);
    } else {
      const nextWrong = quizWrongCount + 1;
      setQuizWrongCount(nextWrong);
      const headline = wbT(
        effectiveBoardLocale,
        'Not quite yet, let us clear this up together!',
        'Belum tepat, ayo kita bedah ulang sampai benar-benar paham!',
        'ยังไม่ถูกทีเดียว มาทบทวนด้วยวิธีใหม่ให้เข้าใจชัดเจนกันนะ!'
      );
      const detailNote =
        reasonClean ||
        wbT(
          effectiveBoardLocale,
          `Your choice "${cleanUser}" does not match the target pattern "${cleanRight}".`,
          `Pilihanmu "${cleanUser}" belum sesuai dengan pola yang tepat "${cleanRight}".`,
          `คำตอบ "${cleanUser}" ยังไม่ตรงกับโครงสร้างที่ถูกต้อง "${cleanRight}"`
        );
      const spokenMessage = wbT(
        effectiveBoardLocale,
        `Not quite yet! "${cleanUser}" is off because ${detailNote} Let me explain this again from a completely different angle with a clearer diagram so it really clicks.`,
        `Belum tepat ya! Pilihan "${cleanUser}" masih keliru karena ${detailNote} Tenang, aku akan jelaskan ulang dengan cara dan analogi yang berbeda supaya kamu benar-benar paham.`,
        `ยังไม่ถูกต้องนะ! "${cleanUser}" ยังคลาดเคลื่อนเพราะ ${detailNote} เดี๋ยวฉันอธิบายใหม่ด้วยมุมมองและแผนภาพอีกแบบให้เข้าใจกระจ่างเลย`
      );
      setQuizCoachReply({
        status: 'wrong',
        headline,
        spokenMessage,
        detailNote,
        userAnswer: cleanUser,
        correctAnswer: cleanRight,
        autoRemediateLeftSec: onRequestCustomTopic ? 6 : null,
        isSpeaking: true,
      });
      speakQuizCoachLine(spokenMessage);
    }
  };

  // Interaksi 1: Pilihan Ganda (Catat jawaban benar & salah ke Braincore + Respon Tutor AI Terbimbing)
  const handleSelectOption = (optId: string) => {
    if (!boardState?.quiz) return;
    unlockSharedBoardAudioContext();
    setSelectedOptionId(optId);
    const opt = boardState.quiz.options.find((o) => o.id === optId);
    if (!opt) return;
    const correctText = boardState.quiz.options.find((o) => o.isCorrect)?.text || boardState.topicTitle;
    const attemptKey = `${currentKey}::mcq::${optId}`;
    const firstForKey = !reportedQuizKeysRef.current.has(attemptKey);
    if (firstForKey) reportedQuizKeysRef.current.add(attemptKey);
    if (opt.isCorrect) {
      playFiezelSfx('answer_correct');
      setIsQuizCompleted(true);
      if (onEvaluatePractice && firstForKey) {
        onEvaluatePractice(opt.text, opt.text, boardState.patternFormula, {
          isQuizSuccess: true,
          misconceptionId: resolvedMisconceptionId,
        });
      }
      handleQuizOutcome({ isCorrect: true, userAnswer: opt.text, correctAnswer: correctText, reasonHint: opt.feedback });
    } else {
      playFiezelSfx('answer_wrong');
      if (onEvaluatePractice && firstForKey) {
        onEvaluatePractice(opt.text, correctText, boardState.patternFormula, {
          isQuizSuccess: false, isQuizFailure: true,
          trapWrongToken: opt.text,
          misconceptionId: resolvedMisconceptionId,
        });
      }
      handleQuizOutcome({ isCorrect: false, userAnswer: opt.text, correctAnswer: correctText, reasonHint: opt.feedback });
    }
  };

  // Interaksi 2: Isian Rumpang (Cloze — catat benar & salah ke Braincore + Respon Tutor AI Terbimbing)
  const handleSelectClozeChip = (word: string) => {
    if (!boardState?.quiz || isQuizCompleted) return;
    unlockSharedBoardAudioContext();
    setClozeAnswer(word);
    const isCorrect =
      word.replace(/\s+/g, '').toLowerCase() ===
      boardState.quiz.cloze.blankWord.replace(/\s+/g, '').toLowerCase();
    const attemptKey = `${currentKey}::cloze::${word}`;
    const firstForKey = !reportedQuizKeysRef.current.has(attemptKey);
    if (firstForKey) reportedQuizKeysRef.current.add(attemptKey);
    const fullTarget = joinTokensForTarget(
      [boardState.quiz.cloze.prefix, boardState.quiz.cloze.blankWord, boardState.quiz.cloze.suffix],
      targetLang
    );
    const fullAttempt = joinTokensForTarget(
      [boardState.quiz.cloze.prefix, word, boardState.quiz.cloze.suffix],
      targetLang
    );
    if (isCorrect) {
      playFiezelSfx('answer_correct');
      setIsQuizCompleted(true);
      if (onEvaluatePractice && firstForKey) {
        onEvaluatePractice(fullAttempt, fullAttempt, boardState.patternFormula, {
          isQuizSuccess: true,
          misconceptionId: resolvedMisconceptionId,
        });
      }
      handleQuizOutcome({ isCorrect: true, userAnswer: fullAttempt, correctAnswer: fullTarget, reasonHint: boardState.quiz.cloze.feedback });
    } else {
      playFiezelSfx('answer_wrong');
      if (onEvaluatePractice && firstForKey) {
        onEvaluatePractice(fullAttempt, fullTarget, boardState.patternFormula, {
          isQuizSuccess: false,
          isQuizFailure: true,
          trapWrongToken: word,
          misconceptionId: resolvedMisconceptionId,
        });
      }
      handleQuizOutcome({ isCorrect: false, userAnswer: fullAttempt, correctAnswer: fullTarget });
    }
  };

  // Interaksi 3: Susun Balok Kata (Sentence Blocks — catat benar & salah ke Braincore + Respon Tutor AI Terbimbing)
  const handleAddBlock = (word: string) => {
    if (!boardState?.quiz || isQuizCompleted) return;
    unlockSharedBoardAudioContext();
    playFiezelSfx('button_tap');
    const nextBlocks = [...placedBlocks, word];
    setPlacedBlocks(nextBlocks);

    if (nextBlocks.length === boardState.quiz.blocks.correctOrder.length) {
      const joinedPlaced = joinTokensForTarget(nextBlocks, targetLang).toLowerCase();
      const joinedTarget = joinTokensForTarget(boardState.quiz.blocks.correctOrder, targetLang).toLowerCase();
      const displayPlaced = joinTokensForTarget(nextBlocks, targetLang);
      const displayTarget = joinTokensForTarget(boardState.quiz.blocks.correctOrder, targetLang);
      const attemptKey = `${currentKey}::blocks::${joinedPlaced}`;
      const firstForKey = !reportedQuizKeysRef.current.has(attemptKey);
      if (firstForKey) reportedQuizKeysRef.current.add(attemptKey);
      if (joinedPlaced === joinedTarget) {
        playFiezelSfx('answer_correct');
        setIsQuizCompleted(true);
        if (onEvaluatePractice && firstForKey) {
          onEvaluatePractice(joinedPlaced, joinedTarget, boardState.patternFormula, {
            isQuizSuccess: true,
            misconceptionId: resolvedMisconceptionId,
          });
        }
        handleQuizOutcome({ isCorrect: true, userAnswer: displayPlaced, correctAnswer: displayTarget, reasonHint: boardState.quiz.blocks.feedback });
      } else {
        playFiezelSfx('answer_wrong');
        if (onEvaluatePractice && firstForKey) {
          onEvaluatePractice(joinedPlaced, joinedTarget, boardState.patternFormula, {
            isQuizSuccess: false,
            isQuizFailure: true,
            trapWrongToken: joinedPlaced,
            misconceptionId: resolvedMisconceptionId,
          });
        }
        handleQuizOutcome({ isCorrect: false, userAnswer: displayPlaced, correctAnswer: displayTarget });
      }
    }
  };

  const handleRemoveBlock = (index: number) => {
    if (isQuizCompleted) return;
    playFiezelSfx('button_tap');
    setPlacedBlocks(placedBlocks.filter((_, i) => i !== index));
  };

  // Handler Ganti Soal Bersih (Clean State Regeneration)
  const handleReRollQuestion = () => {
    playFiezelSfx('button_tap');
    setSelectedOptionId(null);
    setClozeAnswer(null);
    setPlacedBlocks([]);
    setIsQuizCompleted(false);
    setQuizSeed((prev) => prev + 1);
  };

  const handleReplayVoice = () => {
    unlockSharedBoardAudioContext();
    setNeedsAudioUnlock(false);
    const isPteBoardNow =
      Boolean(boardState?.contextMode?.startsWith('pte_')) ||
      Boolean(focusType?.startsWith('pte_')) ||
      Boolean(uiAction?.focusType?.startsWith('pte_'));
    if (isPteBoardNow) {
      if (boardState?.coachExplanation && onSpeakPreview) {
        const locCode = String(locale || 'id').toLowerCase().split(/[-_]/)[0];
        onSpeakPreview(boardState.coachExplanation, locCode);
      }
      return;
    }
    stopLockstepAudio();
    trackOffsetSecRef.current = 0;
    setForceManualTts(true);
    setLockstepIndex(0);
    setLockstepProgress(0);
    setReplayNonce((n) => n + 1);
    setIsWritingPlaying(true);
  };

  const handleResumeTalk = () => {
    if (onResumeConversation) {
      onResumeConversation(undefined, boardState?.topicTitle || topicTitle);
    } else {
      onClose();
    }
  };

  if (isMinimized) {
    return (
      <aside
        className="fixed top-20 right-4 z-50 max-w-xs sm:max-w-sm w-full rounded-2xl bg-[#FFFDF8]/95 border-2 border-[#EADBCE] shadow-2xl backdrop-blur-md p-3 flex flex-col gap-2 animate-in fade-in slide-in-from-top-2 duration-200"
        data-testid="in-call-workbench-minimized"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse shrink-0" />
            <span className="text-[10px] font-extrabold uppercase tracking-wide text-[#B85D43] bg-[#FDE8E4] px-1.5 py-0.2 rounded-full shrink-0">
              {ui.minimizedBadge}
            </span>
            <span className="text-xs font-bold text-[#231A12] truncate">
              {boardState?.topicTitle || topicTitle || ui.badge.replace(/^✦\s*/, '')}
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              data-testid="workbench-restore-btn"
              onClick={() => {
                unlockSharedBoardAudioContext();
                playFiezelSfx('button_tap');
                setIsMinimized(false);
              }}
              className="px-2 py-0.5 rounded-lg bg-[#FAF4E8] hover:bg-[#F3EBE0] text-[#5C4A38] text-[11px] font-bold cursor-pointer border border-[#EADBCE]"
              title={wbT(locale, 'Expand Learning Board', 'Perbesar Papan Belajar', 'ขยายกระดานเรียนรู้')}
            >
              {ui.openBtn}
            </button>
            <button
              type="button"
              data-testid="workbench-minimized-close-btn"
              onClick={onClose}
              className="w-6 h-6 rounded-full bg-[#F3EBE0] hover:bg-[#EADBCE] text-[#5C4A38] text-[11px] font-bold flex items-center justify-center cursor-pointer"
              title={wbT(locale, 'Close Board', 'Tutup Papan', 'ปิดกระดาน')}
            >
              ✕
            </button>
          </div>
        </div>
        {boardState?.patternFormula && (
          <div className="text-[10.5px] font-medium text-[#5C4A38] bg-[#FAF4E8] px-2.5 py-1.5 rounded-xl border border-[#F0E6D9] line-clamp-2">
            💡 <span className="font-semibold">{boardState.patternFormula}</span>
          </div>
        )}
      </aside>
    );
  }

  const handleSubmitBoardQuestion = (rawQ: string, areaExcerpt?: string) => {
    const cleanQ = rawQ.trim();
    if (!cleanQ) return;
    unlockSharedBoardAudioContext();
    playFiezelSfx('button_tap');
    const qId = `q_${Date.now()}`;
    const currentVisualSteps = (whiteboardPlan?.steps || []).filter((s) =>
      [
        'rough_scene',
        'contrast_scale',
        'syntax_flow',
        'kanji_grid',
        'tone_wave',
        'table',
        'metaphor_scene',
        'mind_map',
        'timeline_track',
        'formula_blocks',
        'trap_vs_fix',
      ].includes(s.kind)
    );
    const currentVisualKinds = Array.from(new Set(currentVisualSteps.map((s) => s.kind)));
    const currentVisualSummary = currentVisualSteps
      .map((s) => {
        if (s.kind === 'rough_scene') {
          const lbls = (s.shapes || []).map((sh) => sh.label || sh.text || '').filter(Boolean).slice(0, 4).join(', ');
          return `${s.title || 'rough_scene'}${lbls ? ` [${lbls}]` : ''}`;
        }
        if (s.kind === 'contrast_scale') return `contrast_scale [${s.termA || ''} vs ${s.termB || ''}]`;
        if (s.kind === 'syntax_flow') return `syntax_flow [${(s.nodes || []).map((n) => n.word).filter(Boolean).join(' -> ')}]`;
        return `${s.kind} [${s.title || s.character || ''}]`;
      })
      .filter(Boolean)
      .join('; ');

    const followUpContext: WhiteboardFollowUpContext | undefined = boardState
      ? {
          topicTitle: boardState.topicTitle || uiAction?.topicTitle || topicTitle,
          patternFormula: boardState.patternFormula || uiAction?.patternFormula,
          summary: boardState.summary || uiAction?.explanationText,
          areaExcerpt: areaExcerpt || undefined,
          previousQuestions: studentQuestions.slice(-3).map((q) => q.text),
          currentVisualKinds: currentVisualKinds.length ? currentVisualKinds : undefined,
          currentVisualSummary: currentVisualSummary || undefined,
        }
      : undefined;

    pendingQuestionIdRef.current = qId;
    pendingQuestionActionSigRef.current = `${uiAction?.topicTitle || ''}::${uiAction?.explanationText || ''}::${uiAction?.coachSpokenScript || ''}`;

    setStudentQuestions((prev) => [
      ...prev.slice(-3),
      {
        id: qId,
        text: cleanQ,
        areaExcerpt,
        tutorAnswer: areaExcerpt
          ? wbT(
              locale,
              `⏳ Preparing detailed explanation for "${areaExcerpt}"...`,
              `⏳ Sedang menyiapkan penjelasan lanjutan khusus bagian "${areaExcerpt}"...`,
              `⏳ กำลังเตรียมคำอธิบายเพิ่มเติมสำหรับ "${areaExcerpt}"...`
            )
          : wbT(
              locale,
              '⏳ Preparing follow-up explanation and whiteboard diagram...',
              '⏳ Sedang menyusun penjelasan lanjutan & diagram di papan tulis...',
              '⏳ กำลังเรียบเรียงคำอธิบายและแผนภาพบนกระดาน...'
            ),
      },
    ]);

    if (areaExcerpt || /bingung|kenapa|apa beda|tidak paham|mengerti|explain|confusion|detail/i.test(cleanQ)) {
      onWhiteboardBraincoreEventRef.current?.({
        kind: 'circle_ask_confusion',
        topicTitle: boardState?.topicTitle || topicTitle,
        targetText: areaExcerpt || cleanQ,
        misconceptionId: topMisconceptionId || uiAction?.misconceptionId || undefined,
        isCorrect: false,
      });
    }

    setQuestionDraft('');
    if (onRequestCustomTopic) {
      onRequestCustomTopic(cleanQ, 'custom_dynamic', followUpContext);
    }
  };

  const handleMaterialUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    if (file.type.startsWith('image/')) {
      reader.onload = () => {
        const dataUrl = typeof reader.result === 'string' ? reader.result : '';
        const newPage: SourceMaterialPage = {
          id: `up_${Date.now()}`,
          pageNumber: (whiteboardPlan?.sourcePages.length || 2) + 1,
          badge: 'GAMBARMU',
          title: file.name,
          subtitle: 'Materi gambar yang kamu unggah',
          highlights: ['Ketuk untuk meminta tutor menjelaskan materi ini'],
          promptToExplain: `Jelaskan materi dari gambar ${file.name} terkait ${boardState?.topicTitle || scenario.titleId}`,
          imageDataUrl: dataUrl,
        };
        setUploadedMaterials((prev) => [...prev, newPage]);
        setIsSidebarOpen(true);
      };
      reader.readAsDataURL(file);
    } else {
      reader.onload = () => {
        const rawText = typeof reader.result === 'string' ? reader.result : '';
        const lines = rawText
          .split(/\r?\n/)
          .map((l) => l.trim())
          .filter(Boolean)
          .slice(0, 4);
        const newPage: SourceMaterialPage = {
          id: `up_${Date.now()}`,
          pageNumber: (whiteboardPlan?.sourcePages.length || 2) + 1,
          badge: 'CATATAN',
          title: file.name,
          subtitle: `${lines.length || 1} baris catatan belajar`,
          highlights: lines.length > 0 ? lines : [rawText.slice(0, 120)],
          promptToExplain: `Jelaskan catatan berikut: ${lines.join(' ').slice(0, 140)}`,
        };
        setUploadedMaterials((prev) => [...prev, newPage]);
        setIsSidebarOpen(true);
      };
      reader.readAsText(file);
    }
    e.target.value = '';
  };

  const handleExportBoardPng = async () => {
    if (!boardState) return;
    playFiezelSfx('button_tap');
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 760;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#FAFBF9';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Dot grid
    ctx.fillStyle = '#D5DAD3';
    for (let x = 22; x < canvas.width; x += 22) {
      for (let y = 22; y < canvas.height; y += 22) {
        ctx.beginPath();
        ctx.arc(x, y, 1.3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.fillStyle = '#15803D';
    ctx.font = 'bold 36px sans-serif';
    ctx.fillText(boardState.topicTitle || 'FIEZEL Whiteboard', 56, 78);

    ctx.fillStyle = '#334155';
    ctx.font = '600 21px sans-serif';
    ctx.fillText(boardState.patternFormula || '', 56, 118);

    ctx.fillStyle = 'rgba(125, 211, 252, 0.42)';
    ctx.fillRect(52, 142, 1080, 50);
    ctx.fillStyle = '#0F172A';
    ctx.font = '19px sans-serif';
    ctx.fillText((boardState.coachExplanation || '').slice(0, 108), 62, 174);

    // Draw rendered SVG diagram / Kanji stroke animator if present on the live board
    const renderedSvg = boardContainerRef.current?.querySelector('svg[viewBox]') as SVGSVGElement | null;
    const hasSvg = Boolean(renderedSvg);
    const cardLeft = hasSvg ? 610 : 56;
    const cardW = hasSvg ? 534 : 1088;

    if (renderedSvg) {
      try {
        const cloned = renderedSvg.cloneNode(true) as SVGSVGElement;
        const vb = renderedSvg.getAttribute('viewBox') || '0 0 560 250';
        const vbParts = vb.split(/[\s,]+/).map(Number);
        const svgW = vbParts[2] || 560;
        const svgH = vbParts[3] || 250;
        cloned.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        cloned.setAttribute('width', String(svgW));
        cloned.setAttribute('height', String(svgH));
        const xml = new XMLSerializer().serializeToString(cloned);
        const svgUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`;
        const img = new Image();
        await new Promise<void>((resolve) => {
          img.onload = () => {
            const maxBoxW = 520;
            const maxBoxH = 380;
            const scale = Math.min(maxBoxW / svgW, maxBoxH / svgH);
            const drawW = Math.round(svgW * scale);
            const drawH = Math.round(svgH * scale);
            ctx.drawImage(img, 56, 224, drawW, drawH);
            resolve();
          };
          img.onerror = () => resolve();
          img.src = svgUrl;
        });
      } catch {
        // Fallback to text card only
      }
    }

    ctx.strokeStyle = '#E2E0D8';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(cardLeft, 224, cardW, 250);
    ctx.strokeRect(cardLeft, 224, cardW, 250);

    const maxLineChars = hasSvg ? 44 : 88;
    ctx.fillStyle = '#15803D';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('Contoh Tepat:', cardLeft + 24, 272);
    ctx.fillStyle = '#1E293B';
    ctx.font = '20px sans-serif';
    ctx.fillText(
      (uiAction?.sampleTarget || boardState.quiz?.options?.find((o) => o.isCorrect)?.text || '').slice(0, maxLineChars),
      cardLeft + 24,
      308
    );

    ctx.fillStyle = '#DC2626';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('Hindari Jebakan:', cardLeft + 24, 372);
    ctx.fillStyle = '#7F1D1D';
    ctx.font = '18px sans-serif';
    ctx.fillText(
      (uiAction?.trapWrongSentence || boardState.quiz?.options?.find((o) => !o.isCorrect)?.text || '').slice(0, maxLineChars),
      cardLeft + 24,
      408
    );

    ctx.fillStyle = '#64748B';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(`FIEZEL Whiteboard Tutor • ${persona.name}`, 56, 716);

    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `fiezel-whiteboard-${(boardState.topicTitle || 'lesson').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`;
    a.click();
  };

  const activeQuiz = boardState?.quiz;
  const quizPanelElement = activeQuiz ? (
    <div className="space-y-3" data-testid="wb-interactive-quiz-card">
      {boardState?.characterData && (
        <div
          data-testid="wb-magic-character-canvas"
          className="p-2.5 rounded-xl bg-[#FFFDF8] border border-[#EADBCE] flex items-center gap-3 text-xs"
        >
          <div className="w-10 h-10 rounded-lg bg-[#FAF4E8] border border-[#EADBCE] flex items-center justify-center text-xl font-extrabold text-[#231A12] shrink-0">
            {boardState.characterData.char}
          </div>
          <div className="min-w-0 flex-1">
            <JapaneseRubyDisplay
              as="div"
              text={boardState.characterData.char}
              targetLang={targetLang === 'zh' ? 'zh' : 'ja'}
              phoneticText={boardState.characterData.reading || resolveUnifiedPronunciation(boardState.characterData.char, targetLang === 'zh' ? 'zh' : 'ja', undefined, locale)}
              showFurigana={true}
              showRomaji={true}
              className="font-bold text-[#231A12]"
            />
            <div className="text-[10.5px] text-[#64748B]">
              {boardState.characterData.meaning} · {boardState.characterData.strokesCount || '?'} {ui.strokesLabel}
            </div>
          </div>
        </div>
      )}
      {boardState?.toneData && (
        <div
          data-testid="wb-tone-waveform-canvas"
          className="p-2.5 rounded-xl bg-[#FFFDF8] border border-[#EADBCE] flex items-center justify-between gap-2 text-xs"
        >
          <div>
            <JapaneseRubyDisplay
              as="span"
              text={boardState.toneData.word}
              targetLang={targetLang}
              phoneticText={boardState.toneData.phonetic || resolveUnifiedPronunciation(boardState.toneData.word, targetLang, undefined, locale)}
              showFurigana={true}
              showRomaji={true}
              className="font-extrabold text-[#231A12]"
            />
            <div className="text-[10.5px] text-[#B45309] font-semibold">
              {boardState.toneData.toneType} ({boardState.toneData.toneShape})
            </div>
          </div>
        </div>
      )}
      <div className="flex items-center justify-between gap-2 border-b border-[#F0E6D9] pb-2.5">
        <div className="flex items-center gap-1 bg-[#FAF4E8] p-1 rounded-xl">
          <button
            type="button"
            onClick={() => { playFiezelSfx('button_tap'); setQuizMode('multiple_choice'); }}
            data-testid="mode-tab-multiple_choice"
            className={`px-2 py-0.5 rounded-lg text-[10.5px] font-bold transition-all cursor-pointer ${
              quizMode === 'multiple_choice' ? 'bg-[#FFFFFF] text-[#231A12] shadow-xs' : 'text-[#8C7760] hover:text-[#5C4A38]'
            }`}
          >
            Pilihan
          </button>
          <button
            type="button"
            onClick={() => { playFiezelSfx('button_tap'); setQuizMode('cloze_gap'); }}
            data-testid="mode-tab-cloze_gap"
            className={`px-2 py-0.5 rounded-lg text-[10.5px] font-bold transition-all cursor-pointer ${
              quizMode === 'cloze_gap' ? 'bg-[#FFFFFF] text-[#231A12] shadow-xs' : 'text-[#8C7760] hover:text-[#5C4A38]'
            }`}
          >
            Isian Kata
          </button>
          <button
            type="button"
            onClick={() => { playFiezelSfx('button_tap'); setQuizMode('sentence_blocks'); }}
            data-testid="mode-tab-sentence_blocks"
            className={`px-2 py-0.5 rounded-lg text-[10.5px] font-bold transition-all cursor-pointer ${
              quizMode === 'sentence_blocks' ? 'bg-[#FFFFFF] text-[#231A12] shadow-xs' : 'text-[#8C7760] hover:text-[#5C4A38]'
            }`}
          >
            Susun Balok
          </button>
        </div>

        <button
          type="button"
          onClick={handleReRollQuestion}
          data-testid="wb-reroll-btn"
          className="px-2.5 py-1 rounded-xl bg-[#FAF4E8] hover:bg-[#F3EBE0] text-[#5C4A38] text-[10.5px] font-bold inline-flex items-center gap-1 cursor-pointer transition-transform active:scale-95"
          title="Ganti Soal Baru Tanpa Terjawab Duluan"
        >
          <span>↻</span>
          <span>Ganti Soal</span>
        </button>
      </div>

      {quizMode === 'multiple_choice' && (
        <div className="space-y-2 pt-1">
          <p className="fz-handwriting-body text-sm font-bold text-[#231A12]">{activeQuiz.prompt}</p>
          <div className="grid grid-cols-1 gap-1.5">
            {activeQuiz.options.map((opt) => {
              const isSelected = selectedOptionId === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleSelectOption(opt.id)}
                  data-testid={`quiz-option-${opt.id}`}
                  className={`w-full p-2.5 rounded-xl border text-left text-xs font-semibold cursor-pointer transition-all active:scale-98 ${
                    isSelected
                      ? opt.isCorrect
                        ? 'bg-[#E6F4EA] border-[#34D399] text-[#1B5E34]'
                        : 'bg-[#FDE8E4] border-[#F87171] text-[#991B1B]'
                      : 'bg-[#FDFAF4] border-[#EADBCE] text-[#3D2E20] hover:border-[#D8CBB5]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span>{opt.text}</span>
                    {isSelected && <span>{opt.isCorrect ? '✓' : '✕'}</span>}
                  </div>
                  {isSelected && (
                    <p className="text-[10.5px] mt-1 font-medium opacity-90">{opt.feedback}</p>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {quizMode === 'cloze_gap' && (
        <div className="space-y-2.5 pt-1">
          <p className="text-xs font-bold text-[#231A12]">{ui.clozePrompt}</p>
          <div className="p-3 rounded-xl bg-[#FAF6EE] border border-[#EADBCE] text-xs font-medium text-[#231A12] leading-relaxed">
            {activeQuiz.cloze.prefix}{' '}
            <span className="inline-block px-2.5 py-0.5 rounded-md bg-[#FFFFFF] border-2 border-dashed border-[#B45309] font-bold text-[#B45309] min-w-[50px] text-center">
              {clozeAnswer || '______'}
            </span>{' '}
            {activeQuiz.cloze.suffix}
          </div>
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            {activeQuiz.cloze.chips.map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectClozeChip(chip)}
                data-testid={`cloze-chip-${idx}`}
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer active:scale-95 ${
                  clozeAnswer === chip
                    ? chip.toLowerCase() === activeQuiz.cloze.blankWord.toLowerCase()
                      ? 'bg-[#E6F4EA] border-[#34D399] text-[#1B5E34]'
                      : 'bg-[#FDE8E4] border-[#F87171] text-[#991B1B]'
                    : 'bg-[#FFFFFF] border-[#EADBCE] text-[#3D2E20] hover:border-[#D8CBB5]'
                }`}
              >
                {chip}
              </button>
            ))}
          </div>
          {clozeAnswer && (
            <p className={`text-[11px] font-semibold ${
              clozeAnswer.toLowerCase() === activeQuiz.cloze.blankWord.toLowerCase()
                ? 'text-[#1B5E34]'
                : 'text-[#991B1B]'
            }`}>
              {clozeAnswer.toLowerCase() === activeQuiz.cloze.blankWord.toLowerCase()
                ? activeQuiz.cloze.feedback
                : ui.clozeWrong}
            </p>
          )}
        </div>
      )}

      {quizMode === 'sentence_blocks' && (
        <div className="space-y-2.5 pt-1">
          <p className="text-xs font-bold text-[#231A12]">{activeQuiz.blocks.meaningId}</p>
          <div className="min-h-[44px] p-2 rounded-xl bg-[#FAF6EE] border border-[#EADBCE] flex flex-wrap gap-1.5 items-center">
            {placedBlocks.length === 0 ? (
              <span className="text-[11px] text-[#8C7760] italic">{ui.blocksEmpty}</span>
            ) : (
              placedBlocks.map((blk, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleRemoveBlock(idx)}
                  className="px-2.5 py-1 rounded-lg bg-[#FFFFFF] border border-[#D8CBB5] text-xs font-bold text-[#231A12] shadow-2xs hover:bg-[#FEE2E2] cursor-pointer"
                >
                  {blk} ✕
                </button>
              ))
            )}
          </div>
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            {activeQuiz.blocks.pool.map((blk, idx) => {
              const countInPool = activeQuiz.blocks.pool.filter(w => w === blk).length;
              const countPlaced = placedBlocks.filter(w => w === blk).length;
              const isExhausted = countPlaced >= countInPool;
              return (
                <button
                  key={idx}
                  type="button"
                  disabled={isExhausted}
                  onClick={() => handleAddBlock(blk)}
                  data-testid={`available-block-${idx}`}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    isExhausted
                      ? 'opacity-35 bg-[#EADBCE] border-transparent text-[#8C7760] cursor-not-allowed'
                      : 'bg-[#FFFFFF] border-[#EADBCE] text-[#3D2E20] hover:border-[#B45309] active:scale-95'
                  }`}
                >
                  {blk}
                </button>
              );
            })}
          </div>
          {isQuizCompleted && (
            <p className="text-[11px] font-bold text-[#1B5E34]">
              ✓ {activeQuiz.blocks.feedback}
            </p>
          )}
        </div>
      )}

      {/* GUIDED SOCRATIC MASTERY COACH: Respon suara & aksi lanjutan setelah murid menjawab */}
      {quizCoachReply && (
        <div
          ref={(el) => {
            if (el && el.dataset.scrolledKey !== `${quizCoachReply.status}:${quizCoachReply.userAnswer}`) {
              el.dataset.scrolledKey = `${quizCoachReply.status}:${quizCoachReply.userAnswer}`;
              window.requestAnimationFrame(() => {
                try {
                  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                } catch {}
              });
            }
          }}
          data-testid="wb-quiz-coach-card"
          className={`mt-2 rounded-2xl border-2 p-3 space-y-2.5 animate-in fade-in slide-in-from-bottom-2 duration-200 ${
            quizCoachReply.status === 'correct'
              ? 'bg-[#F0FDF4] border-[#86EFAC]'
              : 'bg-[#FFFBEB] border-[#FCD34D]'
          }`}
        >
          <div className="flex items-start gap-2.5">
            <div className="relative w-8 h-8 rounded-full overflow-hidden border-2 border-[#15803D] bg-white shrink-0">
              <img
                src={persona.avatarUrl || './assets/brand/fiezel-icon.svg'}
                alt={persona.name}
                className="w-full h-full object-cover"
              />
              {quizCoachReply.isSpeaking && (
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#16A34A] border border-white animate-ping" />
              )}
            </div>
            <div className="min-w-0 flex-1 space-y-0.5">
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`text-[11px] font-extrabold ${
                    quizCoachReply.status === 'correct' ? 'text-[#14532D]' : 'text-[#92400E]'
                  }`}
                >
                  {persona.name} · {quizCoachReply.headline}
                </span>
                {quizCoachReply.isSpeaking && (
                  <span className="text-[10px] font-bold text-[#15803D] shrink-0">🔊</span>
                )}
              </div>
              <p className="text-[11.5px] text-[#1E293B] leading-relaxed">
                {quizCoachReply.spokenMessage}
              </p>
            </div>
          </div>

          {quizCoachReply.status === 'wrong' ? (
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              {onRequestCustomTopic && (
                <button
                  type="button"
                  data-testid="wb-remediate-btn"
                  onClick={() =>
                    triggerDifferentAngleRemediation(
                      quizCoachReply.userAnswer,
                      quizCoachReply.correctAnswer
                    )
                  }
                  className="px-3 py-1.5 rounded-xl bg-[#D97706] hover:bg-[#B45309] text-white text-[11px] font-extrabold cursor-pointer shadow-xs active:scale-95 transition-all"
                >
                  🧠{' '}
                  {quizCoachReply.autoRemediateLeftSec !== null && quizCoachReply.autoRemediateLeftSec > 0
                    ? wbT(
                        effectiveBoardLocale,
                        `Re-explain Differently (${quizCoachReply.autoRemediateLeftSec}s)`,
                        `Jelaskan Ulang Cara Beda (${quizCoachReply.autoRemediateLeftSec}d)`,
                        `อธิบายใหม่แบบอื่น (${quizCoachReply.autoRemediateLeftSec} วิ)`
                      )
                    : wbT(
                        effectiveBoardLocale,
                        'Re-explain with Different Angle',
                        'Jelaskan Ulang dengan Cara Berbeda',
                        'อธิบายใหม่ด้วยวิธีที่ต่างออกไป'
                      )}
                </button>
              )}
              <button
                type="button"
                data-testid="wb-retry-quiz-btn"
                onClick={() => {
                  stopQuizCoachSpeech();
                  playFiezelSfx('button_tap');
                  setSelectedOptionId(null);
                  setClozeAnswer(null);
                  setPlacedBlocks([]);
                  setQuizCoachReply(null);
                }}
                className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-[#FEF3C7] border border-[#F59E0B]/50 text-[#92400E] text-[11px] font-bold cursor-pointer active:scale-95 transition-all"
              >
                🔄 {wbT(effectiveBoardLocale, 'Try Again First', 'Coba Jawab Lagi', 'ลองตอบอีกครั้ง')}
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              <button
                type="button"
                data-testid="wb-next-drill-btn"
                onClick={() => {
                  stopQuizCoachSpeech();
                  playFiezelSfx('button_tap');
                  const nextMode: WorkbenchQuizMode =
                    quizMode === 'multiple_choice'
                      ? 'cloze_gap'
                      : quizMode === 'cloze_gap'
                        ? 'sentence_blocks'
                        : 'multiple_choice';
                  setQuizMode(nextMode);
                  handleReRollQuestion();
                }}
                className="px-3 py-1.5 rounded-xl bg-[#15803D] hover:bg-[#166534] text-white text-[11px] font-extrabold cursor-pointer shadow-xs active:scale-95 transition-all"
              >
                🎯 {wbT(effectiveBoardLocale, 'Next Practice (Same Topic)', 'Latihan Soal Berikutnya', 'ทำโจทย์ข้อถัดไป')}
              </button>
              {onRequestCustomTopic && (
                <button
                  type="button"
                  data-testid="wb-deepen-topic-btn"
                  onClick={() => {
                    stopQuizCoachSpeech();
                    handleSubmitBoardQuestion(
                      wbT(
                        effectiveBoardLocale,
                        `Give me a deeper real-world variation and a different diagram for "${boardState?.topicTitle || topicTitle}"!`,
                        `Berikan contoh situasi nyata yang lebih mendalam dan diagram visual lain untuk "${boardState?.topicTitle || topicTitle}"!`,
                        `ขอตัวอย่างสถานการณ์จริงที่ลึกขึ้นและแผนภาพอีกแบบสำหรับ "${boardState?.topicTitle || topicTitle}"!`
                      ),
                      boardState?.topicTitle
                    );
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-[#DCFCE7] border border-[#86EFAC] text-[#14532D] text-[11px] font-bold cursor-pointer active:scale-95 transition-all"
                >
                  🔎 {wbT(effectiveBoardLocale, 'Deeper Examples', 'Pendalaman Materi', 'เจาะลึกตัวอย่างเพิ่ม')}
                </button>
              )}
              <button
                type="button"
                data-testid="wb-other-topic-btn"
                onClick={() => {
                  stopQuizCoachSpeech();
                  playFiezelSfx('button_tap');
                  questionInputRef.current?.focus();
                  questionInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }}
                className="px-2.5 py-1.5 rounded-xl bg-[#EFF6FF] hover:bg-[#DBEAFE] border border-[#93C5FD] text-[#1E40AF] text-[11px] font-bold cursor-pointer active:scale-95 transition-all"
              >
                ✨ {wbT(effectiveBoardLocale, 'Another Topic / Problem', 'Lanjut Masalah Lain', 'เปลี่ยนหัวข้ออื่น')}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  ) : boardState?.isOfflineNotice ? (
    <div
      className="rounded-2xl border border-amber-200 bg-amber-50/90 p-3.5 space-y-2.5"
      data-testid="wb-offline-retry-card"
    >
      <p className="text-xs font-bold text-amber-950">
        Koneksi Tutor AI sedang offline atau belum merespons untuk topik &ldquo;{boardState.topicTitle}&rdquo;.
      </p>
      <p className="text-[11px] text-amber-900/90 leading-relaxed">
        Papan tulis FIEZEL bebas template palsu dan meracik penjelasan serta kuis langsung sesuai pertanyaanmu. Hubungkan internet atau tambahkan Gemini API key lokal lalu muat ulang.
      </p>
      {onRequestCustomTopic && (
        <button
          type="button"
          onClick={() => onRequestCustomTopic(boardState.topicTitle || 'Jelaskan topik ini', 'custom_dynamic')}
          data-testid="wb-retry-realtime-btn"
          className="px-3 py-1.5 rounded-xl bg-[#15803D] hover:bg-[#166534] text-white text-xs font-bold cursor-pointer"
        >
          ↻ Coba Muat Ulang Real-Time
        </button>
      )}
    </div>
  ) : null;

  const showInitialBuffering = !isReady || (!isSpecialCanvasModal && isInitialAudioGateActive);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-[#1C1611]/78 animate-in fade-in duration-150"
      data-testid="in-call-learning-workbench"
    >
      <div
        className={`w-full max-w-[calc(100vw-16px)] sm:max-w-[calc(100vw-24px)] ${
          isPteModal
            ? 'sm:max-w-5xl xl:max-w-6xl max-h-[94dvh] sm:max-h-[92dvh] bg-[#FDFAF4] border-[#EADBCE]'
            : 'sm:max-w-[1260px] h-[94dvh] sm:h-[92dvh] bg-[#FAFBF9] border-[#DDE2DC]'
        } rounded-[24px] sm:rounded-[26px] border shadow-[0_24px_60px_rgba(28,22,17,0.25)] overflow-hidden flex flex-col`}
      >
        {/* TOP HEADER BAR ALA SOLVELY + KONTROL KECEPATAN, EXPORT, MINIMIZE, AKHIRI */}
        <div
          className={`px-3.5 sm:px-5 py-2 sm:py-2.5 border-b flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 shrink-0 ${
            isPteModal ? 'bg-[#FBF8F1] border-[#F0E6D9]' : 'bg-white/95 border-[#E5E8E3]'
          }`}
        >
          <div className="min-w-[200px] flex-1 flex items-center gap-2">
            {!showInitialBuffering && !isPteModal && isReady && (
              <button
                type="button"
                onClick={() => {
                  playFiezelSfx('button_tap');
                  setIsSidebarOpen((v) => !v);
                }}
                data-testid="wb-toggle-sidebar-btn"
                className="px-2.5 py-1 rounded-xl bg-[#F4F6F3] hover:bg-[#E7ECE6] border border-[#DCE2DA] text-[#334155] text-[11px] font-bold flex items-center gap-1 cursor-pointer shrink-0"
                title={wbT(locale, 'Toggle Source Materials', 'Buka / Tutup Materi Sumber', 'เปิด / ปิดสื่อประกอบ')}
              >
                <span>📄</span>
                <span className="hidden sm:inline">{wbT(locale, 'Sources', 'Materi', 'สื่อ')}</span>
              </button>
            )}
            <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full bg-[#DCFCE7] text-[#15803D] text-[10px] font-extrabold tracking-wide uppercase shrink-0">
              {wbT(locale, '✦ AI Whiteboard', '✦ Papan Tulis AI', '✦ กระดานไวท์บอร์ด AI')}
            </span>
            <h3
              className="text-xs sm:text-sm font-extrabold text-[#231A12] leading-tight truncate min-w-0"
              data-testid="workbench-topic-title"
            >
              {boardState?.topicTitle || topicTitle || ui.badge.replace(/^✦\s*/, '')}
            </h3>
            {!isPteModal && isReady && isGeneratingTopic && (
              <span
                data-testid="wb-updating-indicator"
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#EFF6FF] border border-[#BFDBFE] text-[#1D4ED8] text-[10px] font-bold shrink-0 animate-pulse"
              >
                <span>⏳</span>
                <span className="hidden sm:inline">{wbT(locale, 'Updating...', 'Menyusun lanjutan...', 'กำลังเรียบเรียง...')}</span>
              </span>
            )}
            {!showInitialBuffering && !isPteModal && isReady && !isGeneratingTopic && isAudioPreparing && (
              <span
                data-testid="wb-audio-preparing-pill"
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#FEF3C7] border border-[#FCD34D] text-[#92400E] text-[10px] font-extrabold shrink-0 animate-pulse"
              >
                <span>🎙️</span>
                <span className="hidden sm:inline">{wbT(locale, 'Preparing natural voice...', 'Menyiapkan suara natural...', 'กำลังเตรียมเสียงธรรมชาติ...')}</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0 justify-end ml-auto sm:ml-0">
            {!showInitialBuffering && !isPteModal && isReady && (
              <>
                {onChangeLocale && (
                  <select
                    data-testid="wb-explanation-lang-select"
                    aria-label={wbT(locale, 'Native explanation language', 'Bahasa native penjelasan papan', 'ภาษาอธิบายบนกระดาน')}
                    value={String(effectiveBoardLocale || 'id').toLowerCase().split(/[-_]/)[0]}
                    onChange={(e) => {
                      const nextLoc = e.target.value as LearnerLocale;
                      unlockSharedBoardAudioContext();
                      playFiezelSfx('button_tap');
                      onChangeLocale(nextLoc);
                      if (onRequestCustomTopic && boardState?.topicTitle) {
                        onRequestCustomTopic(boardState.topicTitle, 'custom_dynamic');
                      }
                    }}
                    className="px-1.5 py-1 rounded-xl bg-[#F4F6F3] border border-[#DCE2DA] text-[10.5px] font-bold text-[#334155] cursor-pointer max-w-[82px]"
                    title={wbT(locale, 'Explanation language (Native)', 'Bahasa Native Penjelasan', 'ภาษาอธิบาย')}
                  >
                    <option value="id">🌐 ID</option>
                    <option value="en">🌐 EN</option>
                    <option value="th">🌐 TH</option>
                    <option value="ja">🌐 JA</option>
                    <option value="ru">🌐 RU</option>
                    <option value="km">🌐 KM</option>
                    <option value="fil">🌐 FIL</option>
                    <option value="vi">🌐 VI</option>
                    <option value="ko">🌐 KO</option>
                    <option value="ms">🌐 MS</option>
                    <option value="zh">🌐 ZH</option>
                    <option value="ar">🌐 AR</option>
                    <option value="es">🌐 ES</option>
                    <option value="fr">🌐 FR</option>
                    <option value="de">🌐 DE</option>
                  </select>
                )}
                <select
                  data-testid="wb-speed-select"
                  aria-label={wbT(locale, 'Board writing speed', 'Kecepatan menulis papan', 'ความเร็วการเขียนกระดาน')}
                  value={playbackSpeed}
                  onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value) as 0.75 | 1 | 1.25 | 1.5)}
                  className="px-2 py-1 rounded-xl bg-[#F4F6F3] border border-[#DCE2DA] text-[11px] font-bold text-[#334155] cursor-pointer"
                >
                  <option value={0.75}>0.75x</option>
                  <option value={1}>1.0x</option>
                  <option value={1.25}>1.25x</option>
                  <option value={1.5}>1.5x</option>
                </select>

                <button
                  type="button"
                  onClick={() => {
                    unlockSharedBoardAudioContext();
                    setNeedsAudioUnlock(false);
                    playFiezelSfx('button_tap');
                    setReplayNonce((n) => n + 1);
                    setIsWritingPlaying(true);
                  }}
                  className="px-2.5 py-1 rounded-xl bg-[#F4F6F3] hover:bg-[#E7ECE6] border border-[#DCE2DA] text-[#334155] text-[11px] font-bold cursor-pointer hidden sm:inline-flex items-center gap-1"
                  title={wbT(locale, 'Replay board strokes', 'Putar Ulang Goresan Papan', 'เล่นซ้ำขั้นตอนบนกระดาน')}
                >
                  <span>↺</span>
                  <span>{wbT(locale, 'Replay', 'Ulangi', 'เล่นซ้ำ')}</span>
                </button>

                <div className="flex items-center bg-[#F4F6F3] border border-[#DCE2DA] rounded-xl overflow-hidden text-[10.5px] sm:text-[11px] font-bold text-[#334155]" data-testid="wb-zoom-controls">
                  <button
                    type="button"
                    data-testid="wb-zoom-out"
                    onClick={() => setZoomLevel((z) => Math.max(0.75, Number((z - 0.1).toFixed(2))))}
                    className="px-1.5 sm:px-2 py-1 hover:bg-[#E7ECE6] cursor-pointer"
                    title={wbT(locale, 'Zoom Out', 'Perkecil papan (Zoom Out)')}
                  >
                    −
                  </button>
                  <button
                    type="button"
                    data-testid="wb-zoom-reset"
                    onClick={() => setZoomLevel(1)}
                    className="px-1 sm:px-1.5 py-1 hover:bg-[#E7ECE6] cursor-pointer tabular-nums"
                    title="Reset zoom 100%"
                  >
                    {Math.round(zoomLevel * 100)}%
                  </button>
                  <button
                    type="button"
                    data-testid="wb-zoom-in"
                    onClick={() => setZoomLevel((z) => Math.min(1.6, Number((z + 0.1).toFixed(2))))}
                    className="px-1.5 sm:px-2 py-1 hover:bg-[#E7ECE6] cursor-pointer"
                    title={wbT(locale, 'Zoom In', 'Perbesar papan (Zoom In)')}
                  >
                    +
                  </button>
                </div>
                <button
                  type="button"
                  data-testid="wb-auto-spotlight-toggle"
                  onClick={() => setAutoSpotlight((v) => !v)}
                  className={`hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-xl border text-[11px] font-bold transition-colors cursor-pointer ${
                    autoSpotlight
                      ? 'bg-[#DCFCE7] border-[#86EFAC] text-[#14532D]'
                      : 'bg-[#F4F6F3] border-[#DCE2DA] text-[#475569]'
                  }`}
                  title={wbT(locale, 'Auto-highlight & scroll to active step', 'Sorot & gulir otomatis ke langkah aktif')}
                >
                  <span>{autoSpotlight ? wbT(locale, '🎯 Auto Focus', '🎯 Fokus Auto', '🎯 โฟกัสอัตโนมัติ') : wbT(locale, '🎯 Manual Focus', '🎯 Fokus Manual', '🎯 โฟกัสเอง')}</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportBoardPng}
                  className="px-2 py-1 rounded-xl bg-[#F4F6F3] hover:bg-[#E7ECE6] border border-[#DCE2DA] text-[#334155] text-[11px] font-bold cursor-pointer hidden sm:inline-flex items-center gap-1"
                  title={wbT(locale, 'Save whiteboard note (PNG)', 'Simpan Catatan Papan Tulis (PNG)', 'บันทึกกระดานเป็นรูป PNG')}
                >
                  <span>⬇</span>
                  <span className="hidden lg:inline">{wbT(locale, 'Save', 'Simpan', 'บันทึก')}</span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => {
                playFiezelSfx('button_tap');
                setIsMinimized(true);
              }}
              data-testid="workbench-minimize-btn"
              className="w-8 h-8 rounded-full bg-[#F3EBE0] hover:bg-[#EADBCE] text-[#5C4A38] font-bold text-sm flex items-center justify-center cursor-pointer shrink-0 transition-transform active:scale-90"
              title={ui.minimizeTitle}
            >
              −
            </button>

            <button
              type="button"
              onClick={onClose}
              data-testid="workbench-close-btn"
              className="px-2.5 sm:px-3 py-1.5 rounded-full bg-[#FEE2E2] hover:bg-[#FECACA] text-[#B91C1C] font-bold text-[11px] flex items-center gap-1.5 cursor-pointer shrink-0 transition-transform active:scale-95"
              title={ui.closeTitle}
            >
              <span className="w-2 h-2 rounded-full bg-[#DC2626]" />
              <span className="hidden sm:inline">{wbT(locale, 'End Board', 'Akhiri Papan', 'ปิดกระดาน')}</span>
              <span className="sm:hidden">{wbT(locale, 'Close', 'Tutup', 'ปิด')}</span>
            </button>
          </div>
        </div>

        {/* STAGE PERSIAPAN EDITORIAL ANTI-SLOP: Menahan tirai sampai papan + suara awal siap serentak */}
        {showInitialBuffering && (
          <div
            data-testid="workbench-buffering-state"
            className="flex-1 p-5 sm:p-10 flex flex-col items-center justify-center text-center fz-solvely-dotgrid"
          >
            <div className="w-full max-w-lg rounded-[26px] bg-[#FDFAF4] border border-[#E6DFD1] shadow-[0_22px_52px_rgba(28,22,17,0.10)] p-6 sm:p-7 space-y-5 relative overflow-hidden">
              {/* Architectural Ink & Acoustic Waveform Slate */}
              <div className="rounded-2xl bg-[#F7F3E9] border border-[#EAE2D2] px-4 py-3.5 sm:py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 relative overflow-hidden">
                <div className="flex items-center justify-between sm:justify-start gap-3 min-w-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-14 h-11 sm:w-16 sm:h-12 rounded-xl bg-white/90 border border-[#E6DFD1] shadow-2xs flex items-center justify-center shrink-0 relative">
                      <svg viewBox="0 0 80 44" className="w-12 h-8 sm:w-14 sm:h-9 overflow-visible" aria-hidden="true">
                        <line x1="6" y1="35" x2="74" y2="35" stroke="#D6CEC0" strokeWidth="1.2" strokeDasharray="3 3" />
                        <path
                          d="M 8 32 C 20 8, 34 36, 48 16 C 56 6, 65 24, 72 15"
                          fill="none"
                          stroke="#DCFCE7"
                          strokeWidth="6"
                          strokeLinecap="round"
                        />
                        <path
                          d="M 8 32 C 20 8, 34 36, 48 16 C 56 6, 65 24, 72 15"
                          fill="none"
                          stroke="#15803D"
                          strokeWidth="2.6"
                          strokeLinecap="round"
                          className="fz-atelier-ink-path"
                        />
                        <g className="fz-atelier-nib">
                          <circle cx="48" cy="16" r="3.4" fill="#D97706" />
                          <circle cx="48" cy="16" r="6.5" fill="#F59E0B" opacity="0.22" />
                        </g>
                      </svg>
                    </div>
                    <span className="sm:hidden inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#DCFCE7] text-[#14532D] text-[10px] font-extrabold tracking-wide uppercase">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] animate-pulse" />
                      <span>{persona.name}</span>
                    </span>
                  </div>

                  {/* Mobile Equalizer aligned cleanly on top row */}
                  <div className="flex sm:hidden items-end gap-1 h-7 px-2.5 py-1.5 rounded-xl bg-white/85 border border-[#E6DFD1] shrink-0" aria-hidden="true">
                    <span className="w-1 h-4 rounded-full bg-[#15803D] fz-atelier-wave-bar" />
                    <span className="w-1 h-5 rounded-full bg-[#16A34A] fz-atelier-wave-bar fz-atelier-wave-bar-2" />
                    <span className="w-1 h-3.5 rounded-full bg-[#22C55E] fz-atelier-wave-bar fz-atelier-wave-bar-3" />
                    <span className="w-1 h-5 rounded-full bg-[#16A34A] fz-atelier-wave-bar fz-atelier-wave-bar-4" />
                    <span className="w-1 h-3 rounded-full bg-[#D97706] fz-atelier-wave-bar fz-atelier-wave-bar-5" />
                  </div>

                  <div className="hidden sm:block text-left min-w-0">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#DCFCE7] text-[#14532D] text-[10px] font-extrabold tracking-wide uppercase mb-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] animate-pulse" />
                      <span>{persona.name}</span>
                    </span>
                    <h3 className="text-[15px] font-extrabold text-[#1C1611] leading-snug">
                      {wbT(
                        locale,
                        'Fiezel is preparing your explanation',
                        'Fiezel sedang menyiapkan penjelasan untukmu',
                        'Fiezel กำลังเตรียมคำอธิบายให้คุณ'
                      )}
                    </h3>
                  </div>
                </div>

                {/* Mobile Full-Width Headline (Zero 5-line skinny squeeze) */}
                <h3 className="sm:hidden text-left text-[15px] font-extrabold text-[#1C1611] leading-snug">
                  {wbT(
                    locale,
                    'Fiezel is preparing your explanation',
                    'Fiezel sedang menyiapkan penjelasan untukmu',
                    'Fiezel กำลังเตรียมคำอธิบายให้คุณ'
                  )}
                </h3>

                {/* Desktop Live Acoustic Calibrator Equalizer */}
                <div className="hidden sm:flex items-end gap-1 h-7 px-2.5 py-1.5 rounded-xl bg-white/85 border border-[#E6DFD1] shrink-0" aria-hidden="true">
                  <span className="w-1 h-4 rounded-full bg-[#15803D] fz-atelier-wave-bar" />
                  <span className="w-1 h-5 rounded-full bg-[#16A34A] fz-atelier-wave-bar fz-atelier-wave-bar-2" />
                  <span className="w-1 h-3.5 rounded-full bg-[#22C55E] fz-atelier-wave-bar fz-atelier-wave-bar-3" />
                  <span className="w-1 h-5 rounded-full bg-[#16A34A] fz-atelier-wave-bar fz-atelier-wave-bar-4" />
                  <span className="w-1 h-3 rounded-full bg-[#D97706] fz-atelier-wave-bar fz-atelier-wave-bar-5" />
                </div>
              </div>

              <div className="text-left space-y-1.5 px-0.5">
                <div className="text-[11px] font-bold text-[#8C6D1F] uppercase tracking-wider truncate">
                  {topicTitle || (normalizeWbLocale(locale) === 'id' ? scenario.titleId : (scenario.titleTh && normalizeWbLocale(locale) === 'th' ? scenario.titleTh : wbPick('Learning Session', 'Sesi Belajar', 'บทเรียน', locale)))}
                </div>
                <p className="text-xs text-[#57534E] leading-relaxed">
                  {!isReady
                    ? wbT(
                        locale,
                        'Structuring concepts, visual analogies, and example sentences from scratch...',
                        'Merangkai alur materi, analogi visual, dan contoh kalimat dari nol...',
                        'กำลังจัดลำดับเนื้อหา แผนภาพเปรียบเทียบ และประโยคตัวอย่าง...'
                      )
                    : wbT(
                        locale,
                        'Board & diagrams ready, syncing natural tutor voice to begin right away...',
                        'Papan & diagram siap, menyelaraskan suara tutor natural agar langsung bicara...',
                        'กระดานและแผนภาพพร้อมแล้ว กำลังซิงค์เสียงติวเตอร์เพื่อเริ่มอธิบายทันที...'
                      )}
                </p>
              </div>

              {/* 3-Stage Tactile Pipeline Status */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-left">
                {[
                  {
                    label: wbT(locale, 'Concepts & Formula', 'Konsep & Rumus', 'แนวคิดและสูตร'),
                    done: isReady,
                    active: !isReady,
                  },
                  {
                    label: wbT(locale, 'Visual Diagram', 'Diagram Visual', 'แผนภาพประกอบ'),
                    done: isReady,
                    active: !isReady,
                  },
                  {
                    label: wbT(locale, 'Natural Voice', 'Suara Natural', 'เสียงธรรมชาติ'),
                    done: isReady && !isAudioPreparing,
                    active: isReady && isAudioPreparing,
                  },
                ].map((stage, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-[11px] font-bold transition-colors ${
                      stage.done
                        ? 'bg-[#F0FDF4] border-[#BBF7D0] text-[#14532D]'
                        : stage.active
                          ? 'bg-white border-[#FCD34D] text-[#92400E] shadow-2xs'
                          : 'bg-[#FAF7F0] border-[#EDE6D8] text-[#9A8F7E]'
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] shrink-0 ${
                        stage.done
                          ? 'bg-[#16A34A] text-white'
                          : stage.active
                            ? 'bg-[#FEF3C7] text-[#B45309]'
                            : 'bg-[#EDE6D8] text-[#9A8F7E]'
                      }`}
                    >
                      {stage.done ? '✓' : stage.active ? '●' : idx + 1}
                    </span>
                    <span className="truncate">{stage.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* CABANG 1: KANVAS KHUSUS PTE ACADEMIC, READ ALOUD & SSW SENSEI */}
        {!showInitialBuffering && isReady && boardState && isSpecialCanvasModal && (
          <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
            {boardState.contextMode === 'pte_describe_image' && boardState.pteChartData && (
              <PteDescribeImageCanvas
                data={boardState.pteChartData}
                locale={locale}
                onSpeakPreview={(text) => onSpeakPreview && onSpeakPreview(text, 'en')}
              />
            )}
            {(boardState.contextMode === 'pte_read_aloud' || boardState.contextMode === 'read_aloud') &&
              boardState.pteReadAloudData && (
              <PteReadAloudCanvas
                data={boardState.pteReadAloudData}
                locale={locale}
                onSpeakPreview={(text) =>
                  onSpeakPreview &&
                  onSpeakPreview(text, boardState.pteReadAloudData?.targetLang || targetLang)
                }
                latestAlignment={latestReadAloudAlignment}
                onActiveQuestionChange={(info) => {
                  onActiveBoardSyncRef.current?.({
                    contextMode: boardState.contextMode,
                    topicTitle: info.title,
                    activeTargetText: info.passageText,
                  });
                }}
              />
            )}
            {boardState.contextMode === 'pte_scorecard' && boardState.pteScorecardData && (
              <PteScorecardCanvas
                data={boardState.pteScorecardData}
                onSpeakPreview={(text) => onSpeakPreview && onSpeakPreview(text, 'en')}
              />
            )}
            {boardState.contextMode === 'ssw_tactical_board' && boardState.sswTacticalData && (
              <SswTacticalBoardCanvas
                initialPageNumber={boardState.sswTacticalData.pageNumber}
                initialStepNumber={boardState.sswTacticalData.stepNumber}
                personaName={persona.name}
                onSpeakPreview={(text, spokenLang) => onSpeakPreview && onSpeakPreview(text, spokenLang || 'ja')}
                onAskSensei={(question) => {
                  if (onResumeConversation) {
                    onResumeConversation(question, boardState.topicTitle);
                  } else {
                    onClose();
                  }
                }}
                onEvaluatePractice={onEvaluatePractice}
              />
            )}
            <div className="flex items-center gap-2 pt-1 pb-1">
              <button
                type="button"
                onClick={handleResumeTalk}
                data-testid="wb-talk-coach-btn"
                className="flex-1 py-2.5 px-4 rounded-xl bg-[#231A12] hover:bg-[#3D2E20] text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-sm active:scale-98 transition-all"
              >
                <span>🎙️</span>
                <span>{ui.talkBtn(persona.name)}</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                data-testid="wb-dismiss-footer-btn"
                className="py-2.5 px-3.5 rounded-xl bg-[#F3EBE0] hover:bg-[#EADBCE] text-[#5C4A38] text-xs font-bold cursor-pointer transition-colors"
              >
                {ui.closeBtn}
              </button>
            </div>
          </div>
        )}

        {/* CABANG 2: PAPAN TULIS INTERAKTIF ALA SOLVELY (SIDEBAR MATERI + KANVAS DOT-GRID + BAR BAWAH) */}
        {!showInitialBuffering && isReady && boardState && !isSpecialCanvasModal && whiteboardPlan && (() => {
          const rawStepFullText = (
            cohesiveAudioPlan?.stepSpans?.[lockstepIndex]?.caption ||
            activeStepSubtitle ||
            latestAiSubtitle ||
            boardState.coachExplanation ||
            ''
          ).trim();
          const sentences = rawStepFullText
            .split(/(?<=[.!?。！？])\s+/)
            .map((s) => s.trim())
            .filter(Boolean);
          let activeSentenceText = rawStepFullText;
          let sentenceLocalFrac = lockstepProgress;
          if (sentences.length > 1) {
            const weights = sentences.map(computeProsodicTextWeight);
            const totalW = Math.max(1, weights.reduce((a, b) => a + b, 0));
            let curW = 0;
            const p = Math.max(0, Math.min(0.999, lockstepProgress));
            for (let sIdx = 0; sIdx < sentences.length; sIdx++) {
              const sStart = curW / totalW;
              curW += weights[sIdx];
              const sEnd = sIdx === sentences.length - 1 ? 1 : curW / totalW;
              if (p >= sStart && (p <= sEnd || sIdx === sentences.length - 1)) {
                activeSentenceText = sentences[sIdx];
                const spanW = Math.max(0.01, sEnd - sStart);
                sentenceLocalFrac = Math.max(0, Math.min(1, (p - sStart) / spanW));
                break;
              }
            }
          }

          const totalStepsCount = Math.max(1, whiteboardPlan.steps.length);
          const totalBoardMs = whiteboardPlan.steps.reduce(
            (acc, s) => acc + Math.max(900, (s.durationMs || 2200) / playbackSpeed),
            0
          );
          const elapsedBoardMs = whiteboardPlan.steps.reduce((acc, s, i) => {
            const d = Math.max(900, (s.durationMs || 2200) / playbackSpeed);
            if (i < lockstepIndex) return acc + d;
            if (i === lockstepIndex) return acc + d * lockstepProgress;
            return acc;
          }, 0);
          const fmtClock = (ms: number) => {
            const sec = Math.max(0, Math.round(ms / 1000));
            return `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
          };
          let captionText = activeSentenceText;
          let captionWords = captionText.split(/\s+/).filter(Boolean);
          let activeWordIdx = -1;
          if (captionWords.length > 0 && isWritingPlaying && lockstepIndex < totalStepsCount) {
            const wWeights = captionWords.map(computeProsodicWordWeight);
            const wTotal = Math.max(1, wWeights.reduce((a, b) => a + b, 0));
            const targetW = Math.max(0, Math.min(0.9999, sentenceLocalFrac)) * wTotal;
            let accW = 0;
            activeWordIdx = captionWords.length - 1;
            for (let wi = 0; wi < captionWords.length; wi += 1) {
              accW += wWeights[wi];
              if (targetW < accW) {
                activeWordIdx = wi;
                break;
              }
            }
          }
          // Subtitle presisi: bila stempel waktu kata nyata tersedia, tampilkan kalimat yang SEDANG diucapkan
          // dari array kata ter-sanitasi 1:1 dan berikan sliding window aktif ke diagram papan agar highlight tidak melompat ke akhir kalimat terlalu dini.
          const spokenStepText = String(cohesiveAudioPlan?.stepSpans?.[lockstepIndex]?.spokenText || '').trim();
          let activeSpokenWindowText = '';
          if (
            spokenCursor &&
            spokenCursor.stepIndex === lockstepIndex &&
            (spokenCursor.stepWords?.length || spokenStepText) &&
            isWritingPlaying &&
            lockstepIndex < totalStepsCount
          ) {
            const stepTokens =
              spokenCursor.stepWords && spokenCursor.stepWords.length > 0
                ? spokenCursor.stepWords
                : spokenStepText.split(/\s+/).filter(Boolean);
            const cursor = Math.max(0, Math.min(stepTokens.length - 1, spokenCursor.wordIdx));
            let sStart = 0;
            for (let i = 0; i < cursor; i++) {
              if (/[.!?。！？]["')\]]*$/.test(stepTokens[i])) sStart = i + 1;
            }
            let sEnd = stepTokens.length - 1;
            for (let i = cursor; i < stepTokens.length; i++) {
              if (/[.!?。！？]["')\]]*$/.test(stepTokens[i])) {
                sEnd = i;
                break;
              }
            }
            captionWords = stepTokens.slice(sStart, sEnd + 1);
            captionText = captionWords.join(' ');
            activeSentenceText = captionText;
            activeWordIdx = cursor - sStart;
            const winStart = Math.max(0, cursor - 6);
            const winEnd = Math.min(stepTokens.length, cursor + 2);
            activeSpokenWindowText = stepTokens.slice(winStart, winEnd).join(' ');
          } else if (spokenStepText || activeSentenceText) {
            const fallbackTokens = (spokenStepText || activeSentenceText).split(/\s+/).filter(Boolean);
            const endIdx = Math.min(
              fallbackTokens.length,
              Math.max(2, Math.ceil(fallbackTokens.length * Math.min(1, lockstepProgress + 0.14)))
            );
            const startIdx = Math.max(0, endIdx - 7);
            activeSpokenWindowText = fallbackTokens.slice(startIdx, endIdx).join(' ');
          }
          const clockElapsedMs = audioClock ? (audioClock.elapsedSec * 1000) / Math.max(0.5, playbackSpeed) : elapsedBoardMs;
          const clockTotalMs = audioClock ? (audioClock.totalSec * 1000) / Math.max(0.5, playbackSpeed) : totalBoardMs;

          return (
            <>
            <div className="flex-1 min-h-0 flex overflow-hidden relative">
              {/* EXCLUSIVE TACTILE FLOATING STUDIO START POPUP (Anti-AI-Slop + Physical Spring Push-Button) */}
              {(needsAudioUnlock || isUnlockLaunching) && isWritingPlaying && !isGeneratingTopic && (
                <div
                  data-testid="wb-audio-launch-overlay"
                  className={`fz-studio-launch-veil absolute inset-0 z-40 flex items-center justify-center p-5 bg-[#FAFBF9]/92 sm:bg-[#FAFBF9]/68 sm:backdrop-blur-[5px] ${
                    isUnlockLaunching ? 'is-launching' : ''
                  }`}
                >
                  <div
                    className={`fz-studio-launch-card relative w-full max-w-[332px] rounded-[30px] bg-[#FFFDF8] border border-[#E5DEC9] shadow-[0_28px_70px_rgba(28,22,17,0.16),0_1.5px_0_rgba(255,255,255,0.95)_inset] p-5 sm:p-6 text-center overflow-hidden ${
                      isUnlockLaunching ? 'is-launching' : ''
                    }`}
                  >
                    {/* Bespoke Graphic Studio Vignette (Warm Travertine Paper + Ink Curves + Acoustic Medallion) */}
                    <div className="relative mx-auto mb-4 h-28 w-full rounded-[22px] bg-[#F7F2E6] border border-[#EAE1CD] flex items-center justify-center overflow-hidden">
                      <svg
                        viewBox="0 0 280 112"
                        className="absolute inset-0 w-full h-full pointer-events-none"
                        aria-hidden="true"
                      >
                        <defs>
                          <radialGradient id="fzStudioOrbGrad" cx="50%" cy="50%" r="50%">
                            <stop offset="0%" stopColor="#86EFAC" stopOpacity="0.45" />
                            <stop offset="65%" stopColor="#FDE68A" stopOpacity="0.18" />
                            <stop offset="100%" stopColor="#F7F2E6" stopOpacity="0" />
                          </radialGradient>
                        </defs>
                        <circle cx="140" cy="56" r="56" fill="url(#fzStudioOrbGrad)" className="fz-studio-breathe-orb" />
                        {/* Flowing hand-drawn botanical ink ribbons */}
                        <path
                          d="M -10 82 C 42 48, 86 98, 140 58 C 194 18, 236 74, 290 36"
                          fill="none"
                          stroke="#DCFCE7"
                          strokeWidth="12"
                          strokeLinecap="round"
                        />
                        <path
                          d="M -10 82 C 42 48, 86 98, 140 58 C 194 18, 236 74, 290 36"
                          fill="none"
                          stroke="#15803D"
                          strokeOpacity="0.28"
                          strokeWidth="2.2"
                          strokeDasharray="6 6"
                          strokeLinecap="round"
                        />
                        <path
                          d="M 18 28 C 60 12, 82 32, 102 24"
                          fill="none"
                          stroke="#D97706"
                          strokeOpacity="0.34"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                        <circle cx="232" cy="26" r="4" fill="#F59E0B" fillOpacity="0.38" />
                        <circle cx="48" cy="88" r="3" fill="#15803D" fillOpacity="0.3" />
                      </svg>

                      {/* Acoustic Burst Halo Rings triggered on physical spring press */}
                      {isUnlockLaunching && (
                        <>
                          <span className="fz-acoustic-burst-ring absolute w-16 h-16 rounded-full border-[3px] border-[#16A34A]" />
                          <span className="fz-acoustic-burst-ring-2 absolute w-16 h-16 rounded-full border-2 border-[#D97706]" />
                        </>
                      )}

                      {/* Center Medallion: Tutor Seal + Live Equalizer Bars */}
                      <div className="relative z-10 flex items-center gap-3.5">
                        <div className="flex items-end gap-[3px] h-7" aria-hidden="true">
                          <span className="w-[3px] h-3.5 rounded-full bg-[#15803D]/70 fz-atelier-wave-bar" />
                          <span className="w-[3px] h-6 rounded-full bg-[#16A34A] fz-atelier-wave-bar fz-atelier-wave-bar-2" />
                          <span className="w-[3px] h-4 rounded-full bg-[#D97706]/85 fz-atelier-wave-bar fz-atelier-wave-bar-3" />
                        </div>

                        <div className="relative w-14 h-14 rounded-[18px] bg-white border-2 border-[#167942]/20 shadow-[0_10px_24px_rgba(28,22,17,0.12)] p-1 flex items-center justify-center">
                          <img
                            src={persona.avatarUrl || './assets/brand/fiezel-icon.svg'}
                            alt={persona.name}
                            className="w-full h-full object-cover rounded-[13px]"
                          />
                          <span className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full bg-[#167942] border-2 border-[#FFFDF8] flex items-center justify-center shadow-sm">
                            <svg viewBox="0 0 16 16" className="w-3 h-3 text-white fill-current ml-0.5" aria-hidden="true">
                              <path d="M4.2 2.8a1 1 0 0 1 1.52-.85l7.1 4.45a1 1 0 0 1 0 1.7l-7.1 4.45A1 1 0 0 1 4.2 11.7V2.8Z" />
                            </svg>
                          </span>
                        </div>

                        <div className="flex items-end gap-[3px] h-7" aria-hidden="true">
                          <span className="w-[3px] h-4 rounded-full bg-[#D97706]/85 fz-atelier-wave-bar fz-atelier-wave-bar-4" />
                          <span className="w-[3px] h-6 rounded-full bg-[#16A34A] fz-atelier-wave-bar fz-atelier-wave-bar-5" />
                          <span className="w-[3px] h-3.5 rounded-full bg-[#15803D]/70 fz-atelier-wave-bar" />
                        </div>
                      </div>
                    </div>

                    {/* Exclusive Casual Editorial Copy */}
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#ECFDF5] border border-[#BBF7D0] text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#14532D] mb-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] animate-pulse" />
                      <span>
                        {persona.name} ·{' '}
                        {wbT(effectiveBoardLocale, 'Ready to Teach', 'Siap Menjelaskan', 'พร้อมอธิบายแล้ว')}
                      </span>
                    </div>

                    <h4 className="text-[16px] sm:text-[17px] font-extrabold text-[#1C1611] tracking-[-0.02em] leading-snug line-clamp-2 px-1">
                      {boardState?.topicTitle || topicTitle}
                    </h4>

                    <p className="mt-1.5 mb-5 text-[12px] text-[#6B5E4E] leading-relaxed px-1">
                      {lockstepIndex === 0 && lockstepProgress < 0.08
                        ? wbT(
                            effectiveBoardLocale,
                            'Voice and live strokes are synced. Press start to begin the walkthrough smoothly.',
                            'Suara dan goresan papan sudah selaras. Tekan mulai agar penjelasan langsung mengalir mulus.',
                            'เสียงและกระดานซิงค์พร้อมแล้ว กดปุ่มเริ่มเพื่อฟังและชมคำอธิบายไปพร้อมกันทันที'
                          )
                        : wbT(
                            effectiveBoardLocale,
                            'Tap to reconnect natural tutor voice right at this step.',
                            'Tekan sekali untuk melanjutkan suara tutor tepat di langkah ini.',
                            'แตะครั้งเดียวเพื่อเปิดเสียงผู้สอนต่อจากขั้นตอนนี้ทันที'
                          )}
                    </p>

                    {/* Physical 3D Tactile Spring Push-Button */}
                    <button
                      type="button"
                      data-testid="wb-tap-unmute-btn"
                      onClick={() => triggerTactileAudioLaunch(false)}
                      className={`fz-tactile-start-btn w-full py-3.5 px-5 rounded-[18px] text-white font-extrabold text-[14px] tracking-[-0.01em] flex items-center justify-center gap-2.5 cursor-pointer select-none ${
                        isUnlockLaunching ? 'is-launching' : ''
                      }`}
                    >
                      <span className="w-7 h-7 rounded-full bg-white/18 border border-white/25 flex items-center justify-center shrink-0">
                        <svg viewBox="0 0 20 20" className="w-3.5 h-3.5 text-white fill-current ml-0.5" aria-hidden="true">
                          <path d="M5.2 3.4a1.2 1.2 0 0 1 1.82-1.03l9.2 5.6a1.2 1.2 0 0 1 0 2.06l-9.2 5.6A1.2 1.2 0 0 1 5.2 14.6V3.4Z" />
                        </svg>
                      </span>
                      <span>
                        {lockstepIndex === 0 && lockstepProgress < 0.08
                          ? wbT(effectiveBoardLocale, 'Start Explanation', 'Mulai Penjelasan', 'เริ่มคำอธิบาย')
                          : wbT(effectiveBoardLocale, 'Resume with Sound', 'Lanjutkan dengan Suara', 'ฟังเสียงต่อทันที')}
                      </span>
                      <svg viewBox="0 0 20 20" className="w-4 h-4 text-emerald-100 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" aria-hidden="true">
                        <path d="M4 10h2.2M8.8 6.5v7M12.4 4.5v11M16 7.8v4.4" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
              {/* LEFT SIDEBAR: COURSE SOURCE / MATERI SUMBER (Drawer di Mobile, Statis di Desktop) */}
              {isSidebarOpen && (
                <>
                  <div
                    onClick={() => setIsSidebarOpen(false)}
                    className="md:hidden fixed inset-0 bg-black/30 z-30"
                    aria-hidden="true"
                  />
                  <aside
                    data-testid="wb-course-source-sidebar"
                    className="absolute inset-y-0 left-0 z-40 w-[264px] max-w-[82vw] md:static md:w-[248px] md:max-w-none md:z-10 shrink-0 bg-[#F8FAFC] border-r border-[#E2E8F0] flex flex-col overflow-hidden shadow-2xl md:shadow-none"
                  >
                  <div className="px-3.5 py-2.5 border-b border-[#E2E8F0] flex items-center justify-between">
                    <div>
                      <div className="text-[9.5px] font-extrabold uppercase tracking-widest text-[#64748B]">
                        COURSE SOURCE
                      </div>
                      <div className="text-xs font-extrabold text-[#0F172A]">Materi Sesi Ini</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsSidebarOpen(false)}
                      className="w-6 h-6 rounded-lg hover:bg-[#E2E8F0] text-[#475569] text-xs font-bold flex items-center justify-center cursor-pointer"
                      title="Tutup panel materi"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
                    {whiteboardPlan.sourcePages.map((pg) => (
                      <div
                        key={pg.id}
                        className={`rounded-2xl border p-2.5 bg-white transition-all cursor-pointer hover:border-[#15803D] shadow-2xs ${
                          selectedMaterialPage?.id === pg.id ? 'border-[#2563EB] ring-2 ring-[#BFDBFE]' : 'border-[#E2E8F0]'
                        }`}
                        onClick={() => {
                          setSelectedMaterialPage(pg);
                          playFiezelSfx('button_tap');
                        }}
                      >
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="text-[9px] font-extrabold tracking-wider uppercase text-[#64748B]">
                            HALAMAN {pg.pageNumber}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-[#DCFCE7] text-[#15803D] text-[9px] font-extrabold">
                            {pg.badge}
                          </span>
                        </div>
                        {pg.imageDataUrl && (
                          <img
                            src={pg.imageDataUrl}
                            alt={pg.title}
                            className="w-full h-24 object-cover rounded-xl border border-[#E2E8F0] mb-1.5"
                          />
                        )}
                        <div className="text-xs font-extrabold text-[#0F172A] line-clamp-1">{pg.title}</div>
                        <div className="text-[10.5px] text-[#64748B] line-clamp-1 mb-1.5">{pg.subtitle}</div>
                        <ul className="space-y-1">
                          {pg.highlights.slice(0, 3).map((hl, idx) => (
                            <li
                              key={idx}
                              className="text-[10px] text-[#334155] bg-[#F8FAFC] px-2 py-1 rounded-lg border border-[#F1F5F9] line-clamp-2"
                            >
                              {hl}
                            </li>
                          ))}
                        </ul>
                        <button
                          type="button"
                          onClick={(ev) => {
                            ev.stopPropagation();
                            handleSubmitBoardQuestion(pg.promptToExplain, pg.title);
                          }}
                          className="mt-2 w-full py-1 px-2 rounded-lg bg-[#EFF6FF] hover:bg-[#DBEAFE] text-[#1D4ED8] text-[10.5px] font-bold cursor-pointer"
                        >
                          ⭕ Jelaskan di Papan Tulis
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="p-3 border-t border-[#E2E8F0] bg-white">
                    <input
                      ref={materialUploadInputRef}
                      type="file"
                      accept="image/*,.txt,.md"
                      onChange={handleMaterialUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => materialUploadInputRef.current?.click()}
                      className="w-full py-2 px-3 rounded-xl border border-dashed border-[#94A3B8] hover:border-[#2563EB] bg-[#F8FAFC] hover:bg-[#EFF6FF] text-[#334155] hover:text-[#1D4ED8] text-[11px] font-bold cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <span>📎</span>
                      <span>Tambah Gambar / Catatan</span>
                    </button>
                  </div>
                </aside>
                </>
              )}

            {/* KANVAS UTAMA SPIDOL HIDUP DOT-GRID */}
                  <WhiteboardErrorBoundary
                    locale={effectiveBoardLocale}
                    onClose={onClose}
                    onRetry={() => setReplayNonce((n) => n + 1)}
                  >
                  <LiveWhiteboardCanvas
                    plan={whiteboardPlan}
                    targetLang={targetLang}
                    playbackSpeed={playbackSpeed}
                    isPlaying={isWritingPlaying && !needsAudioUnlock}
                    onPlayingChange={(playing) => {
                      setIsWritingPlaying(playing);
                      if (!playing && lockstepAudioRef.current) {
                        try {
                          lockstepAudioRef.current.pause();
                        } catch {}
                      }
                    }}
                    replayNonce={replayNonce}
                    zoomLevel={zoomLevel}
                    onZoomChange={(nextZ) => setZoomLevel(Math.max(0.75, Math.min(1.6, Number(nextZ.toFixed(2)))))}
                    autoSpotlight={autoSpotlight}
                    onToggleAutoSpotlight={setAutoSpotlight}
                    isPenActive={isPenActive}
                    penColor={penColor}
                    onPenToggle={setIsPenActive}
                    onCircleAsk={(excerpt, userQ) => {
                      handleSubmitBoardQuestion(
                        userQ || `Jelaskan lebih detail bagian "${excerpt}"`,
                        excerpt
                      );
                    }}
                    quizSlot={quizPanelElement}
                    boardContainerRef={boardContainerRef}
                    externalStepIndex={lockstepIndex}
                    externalStepProgress={lockstepProgress}
                    activeSpokenText={activeSpokenWindowText || activeSentenceText}
                    onSelectStepIndex={(idx) => {
                      unlockSharedBoardAudioContext();
                      setNeedsAudioUnlock(false);
                      stopLockstepAudio();
                      const total = whiteboardPlan.steps.length;
                      const bounded = Math.max(0, Math.min(total, idx));
                      seekTargetStepRef.current = bounded < total ? bounded : null;
                      const span = cohesiveAudioPlan?.stepSpans[bounded];
                      const estSec = Math.max(
                        4,
                        whiteboardPlan.steps.reduce((s, st) => s + (st.durationMs || 2200), 0) / 1000
                      );
                      const totalSec = trackTotalSecRef.current || estSec;
                      const targetFrac = bounded >= total ? 1 : span ? span.startFrac : 0;
                      trackFracRef.current = targetFrac;
                      trackOffsetSecRef.current =
                        bounded >= total ? totalSec : span ? span.startFrac * totalSec : 0;
                      lastCommitIdxRef.current = bounded;
                      lastCommitProgRef.current = bounded >= total ? 1 : 0.04;
                      lastCommitSubRef.current = span?.caption || '';
                      spokenCursorRef.current = null;
                      setSpokenCursor(null);
                      setAudioClock(null);
                      setActiveStepSubtitle(span?.caption || '');
                      setLockstepIndex(bounded);
                      setLockstepProgress(bounded >= total ? 1 : 0.04);
                      setIsWritingPlaying(bounded < total);
                      setSeekNonce((n) => n + 1);
                    }}
                  />
                  </WhiteboardErrorBoundary>
                </div>

                {/* BOTTOM FLOATING BAR ALA SOLVELY (AVATAR + SUBTITLE + PEN TOOL + INPUT + MIC) */}
                <div className="px-3 sm:px-5 py-2.5 bg-white border-t border-[#E5E8E3] flex flex-col sm:flex-row sm:flex-wrap sm:items-center justify-between gap-2 shrink-0">
              {/* Kiri: Avatar Tutor + Kontrol Putar + Timer + CC Live Karaoke */}
              <div className="flex items-center gap-2 min-w-0 w-full sm:w-auto sm:flex-1 sm:max-w-lg">
                <div className="relative w-9 h-9 rounded-full overflow-hidden border-2 border-[#15803D] bg-[#FFF9EE] shrink-0">
                  <img
                    src={persona.avatarUrl || './assets/brand/fiezel-icon.svg'}
                    alt={persona.name}
                    className="w-full h-full object-cover"
                  />
                  <span
                    className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border border-white ${
                      isStepAudioActive || isLiveConnected ? 'bg-[#10B981]' : 'bg-[#F59E0B]'
                    }`}
                  />
                </div>

                <button
                  type="button"
                  data-testid="wb-play-pause-btn"
                  onClick={() => {
                    unlockSharedBoardAudioContext();
                    if (lockstepIndex >= totalStepsCount) {
                      handleReplayVoice();
                      return;
                    }
                    if (!isWritingPlaying) {
                      setNeedsAudioUnlock(false);
                    }
                    setIsWritingPlaying((v) => !v);
                  }}
                  className="w-8 h-8 rounded-full bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#0F172A] text-xs font-bold flex items-center justify-center cursor-pointer shrink-0"
                  title={isWritingPlaying ? wbT(locale, 'Pause Board', 'Jeda Menulis Papan') : wbT(locale, 'Resume Board', 'Lanjut Menulis Papan')}
                >
                  {isWritingPlaying ? '⏸' : '▶'}
                </button>

                <button
                  type="button"
                  onClick={handleReplayVoice}
                  data-testid="wb-replay-voice-btn"
                  className="w-8 h-8 rounded-full bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#0F172A] text-xs font-bold flex items-center justify-center cursor-pointer shrink-0"
                  title={wbT(locale, 'Replay board & audio from Step 1', 'Putar Ulang Papan & Suara dari Langkah 1')}
                >
                  🔊
                </button>

                <span
                  data-testid="wb-lockstep-timer"
                  className="px-2 py-0.5 rounded-md bg-[#F4F6F3] border border-[#DCE2DA] text-[10px] font-bold text-[#334155] tabular-nums shrink-0"
                  title={wbT(locale, `Step ${Math.min(totalStepsCount, lockstepIndex + 1)} of ${totalStepsCount}`, `Langkah ${Math.min(totalStepsCount, lockstepIndex + 1)} dari ${totalStepsCount}`)}
                >
                  {fmtClock(clockElapsedMs)} / {fmtClock(clockTotalMs)} • {Math.min(totalStepsCount, lockstepIndex + 1)}/{totalStepsCount}
                </span>

                <button
                  type="button"
                  onClick={() => setShowCaptions((v) => !v)}
                  className={`px-2 py-1 rounded-lg text-[10.5px] font-extrabold cursor-pointer shrink-0 ${
                    showCaptions ? 'bg-[#0F172A] text-white' : 'bg-[#F1F5F9] text-[#475569]'
                  }`}
                  title={wbT(locale, 'Toggle Explanation Captions', 'Tampilkan / Sembunyikan Teks Penjelasan')}
                >
                  CC
                </button>

                {showCaptions && (
                  <p
                    data-testid="wb-lockstep-caption"
                    className="text-[11px] font-medium text-[#334155] line-clamp-2 leading-snug min-w-0"
                  >
                    {activeWordIdx >= 0
                      ? captionWords.map((w, wIdx) => (
                          <span
                            key={wIdx}
                            className={
                              wIdx === activeWordIdx
                                ? 'bg-[#DCFCE7] text-[#15803D] font-bold px-0.5 rounded'
                                : wIdx < activeWordIdx
                                  ? 'text-[#0F172A]'
                                  : 'text-[#64748B]'
                            }
                          >
                            {w}{' '}
                          </span>
                        ))
                      : captionText}
                  </p>
                )}
              </div>

              {/* Tengah-Kanan: Pen Tool + Color Swatches + Input Pertanyaan + Mic Button */}
              <div className="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto sm:flex-1 justify-between sm:justify-end min-w-0">
                {/* Pen Tool + Ink Colors */}
                <div className="flex items-center gap-1 bg-[#F4F6F3] border border-[#DCE2DA] rounded-full px-2 py-1 shrink-0">
                  <button
                    type="button"
                    data-testid="wb-pen-toggle-btn"
                    onClick={() => {
                      playFiezelSfx('button_tap');
                      setIsPenActive((v) => !v);
                    }}
                    className={`px-2 py-0.5 rounded-full text-[11px] font-bold cursor-pointer transition-all ${
                      isPenActive ? 'bg-[#2563EB] text-white shadow-2xs' : 'text-[#334155] hover:bg-white'
                    }`}
                    title={wbT(locale, 'Use pen to circle on the board & ask', 'Pakai Spidol untuk Lingkari Papan & Tanya')}
                  >
                    ✏️ {isPenActive ? wbT(locale, 'Pen On', 'Spidol On') : wbT(locale, 'Draw', 'Coret')}
                  </button>
                  {isPenActive &&
                    (['#2563EB', '#DC2626', '#059669', '#D97706'] as PenColor[]).map((col) => (
                      <button
                        key={col}
                        type="button"
                        onClick={() => setPenColor(col)}
                        style={{ backgroundColor: col }}
                        className={`w-4 h-4 rounded-full cursor-pointer transition-transform ${
                          penColor === col ? 'ring-2 ring-offset-1 ring-[#0F172A] scale-110' : 'opacity-70'
                        }`}
                        title={wbT(locale, 'Pick pen color', 'Pilih Warna Spidol')}
                      />
                    ))}
                </div>

                {/* Form Tanya di Papan Tulis */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSubmitBoardQuestion(questionDraft);
                  }}
                  className="flex items-center gap-1.5 flex-1 max-w-md bg-[#F8FAFC] border border-[#CBD5E1] focus-within:border-[#2563EB] rounded-full px-3 py-1"
                >
                  <button
                    type="button"
                    onClick={() => materialUploadInputRef.current?.click()}
                    className="text-sm text-[#64748B] hover:text-[#0F172A] cursor-pointer shrink-0"
                    title={wbT(locale, 'Attach image or note', 'Lampirkan gambar atau catatan')}
                  >
                    📎
                  </button>
                  <input
                    ref={questionInputRef}
                    type="text"
                    data-testid="wb-board-question-input"
                    value={questionDraft}
                    onChange={(e) => setQuestionDraft(e.target.value)}
                    placeholder={wbT(locale, 'Ask a question or request another example...', 'Tulis pertanyaan atau minta contoh lain...', 'พิมพ์คำถามหรือขอตัวอย่างเพิ่ม...')}
                    className="flex-1 min-w-0 bg-transparent text-xs text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none"
                  />
                  {questionDraft.trim().length > 0 && (
                    <button
                      type="submit"
                      data-testid="wb-board-question-submit"
                      className="px-2.5 py-0.5 rounded-full bg-[#2563EB] text-white text-[11px] font-bold cursor-pointer shrink-0"
                    >
                      {wbT(locale, 'Ask', 'Tanya', 'ถาม')}
                    </button>
                  )}
                </form>

                {/* Mic / Lanjut Bicara CTA */}
                <button
                  type="button"
                  onClick={handleResumeTalk}
                  data-testid="wb-talk-coach-btn"
                  className="px-3.5 py-2 rounded-full bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95 transition-all shrink-0"
                  title={ui.talkBtn(persona.name)}
                >
                  <span>🎙️</span>
                  <span className="hidden sm:inline">{wbT(locale, 'Speak', 'Bicara', 'พูด')}</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  data-testid="wb-dismiss-footer-btn"
                  className="hidden"
                  aria-hidden="true"
                >
                  Tutup
                </button>
              </div>
            </div>
          </>
          );
        })()}
      </div>
    </div>
  );
};
