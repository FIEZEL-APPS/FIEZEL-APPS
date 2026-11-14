import React, { useState, useEffect, useRef } from 'react';
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
import { JapaneseRubyDisplay } from './JapaneseRubyDisplay';
import { resolveUnifiedPronunciation, translateAndPhoneticizeLiveText } from '../lib/liveCallHelper';
import { containsHanzi } from '../lib/mandarinPhonetics';
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
  // Data Khusus PTE Academic
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
  // Kuis Interaktif Multi-Mode
  quiz: DynamicQuizData;
}

export interface InCallLearningWorkbenchProps {
  isOpen: boolean;
  onClose: () => void;
  locale: LearnerLocale;
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
  onRequestCustomTopic?: (customQuestion: string, bankTopicId?: string) => void;
  onSpeakPreview?: (sampleText: string, spokenLang?: string) => void;
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
  onActiveBoardSync?: (info: {
    contextMode: string;
    topicTitle: string;
    activeTargetText: string;
  }) => void;
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

function normalizeWbLocale(locale?: LearnerLocale): 'th' | 'ja' | 'zh' | 'id' {
  const code = String(locale || 'id').toLowerCase().split(/[-_]/)[0];
  if (code === 'th' || code === 'ja' || code === 'zh') return code;
  return 'id';
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

/**
 * Memeriksa apakah `uiAction` membawa data dinamis lengkap dari backend Fiezel.
 */
export function hasRichDynamicAction(action?: VoiceUiAction): boolean {
  if (!action) return false;
  if (action.focusType === 'ssw_tactical_board') return true;
  if (action.focusType === 'read_aloud' || (action.focusType && action.focusType.startsWith('pte_'))) return true;
  const hasSample = Boolean(action.sampleTarget && action.sampleTarget.trim().length > 3);
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
  const hasMisconceptionPair = Boolean(
    action.misconceptionId || (action.wrongWord && action.rightWord && action.rightWord !== 'bentuk tepat')
  );
  return hasSample || hasMisconceptionPair || (hasFormula && hasRightWord);
}

/**
 * Menganalisis topik dan menurunkan Kanvas Kontekstual + Soal Interaktif Multi-Mode
 * dengan prinsip ANTI-SPOILING (soal kuis selalu menguji transfer pemahaman baru).
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
  const ui = getWorkbenchUiStrings(locale);
  const loc = normalizeWbLocale(locale);
  const combinedHintText = `${query} ${action?.sampleTarget || ''} ${action?.wrongWord || ''} ${action?.rightWord || ''} ${action?.patternFormula || ''}`;
  const effectiveLang: TargetLang =
    targetLang === 'ja' || /[\u3040-\u30ff]/.test(combinedHintText)
      ? 'ja'
      : targetLang === 'zh' || (containsHanzi(combinedHintText) && !/[\u3040-\u30ff]/.test(combinedHintText))
        ? 'zh'
        : targetLang || 'en';
  const lt = (idText: string, thText: string, jaText?: string, zhText?: string) => {
    if (loc === 'th') return thText;
    if (loc === 'ja' && jaText) return jaText;
    if (loc === 'zh' && zhText) return zhText;
    return idText;
  };

  // -------------------------------------------------------------
  // 0. KASUS KHUSUS SSW SENSEI: PAPAN TAKTIS HALAMAN, TRIK WAKAI PAPA+, & KUIS SSW
  // -------------------------------------------------------------
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
    const pageTitle = plan.pageObj?.title || `Halaman ${plan.targetPage}`;

    return {
      contextMode: 'ssw_tactical_board',
      topicTitle: `Hal. ${plan.targetPage}: ${pageTitle}`,
      patternFormula: `Hal. ${plan.targetPage} · Langkah ${plan.activeStepIndex} dari ${plan.steps.length}`,
      coachExplanation: '',
      sswTacticalData: {
        pageNumber: plan.targetPage,
        stepNumber: plan.activeStepIndex,
        requestedQuery: query,
      },
      quiz: {
        prompt: 'Latihan cepat SSW tersedia di panel Papan Taktis di atas.',
        options: [
          { id: 'opt_1', text: 'Siap lanjut memahami materi', isCorrect: true, feedback: 'Bagus!' },
          { id: 'opt_2', text: 'Perlu penjelasan tambahan', isCorrect: false, feedback: 'Pilih langkah aktif di atas.' },
        ],
        cloze: {
          prefix: '',
          blankWord: 'SSW',
          suffix: '',
          chips: ['SSW'],
          feedback: '',
        },
        blocks: {
          correctOrder: ['SSW'],
          pool: ['SSW'],
          meaningId: 'SSW Pengolahan Makanan',
          feedback: '',
        },
      },
    };
  }

  // -------------------------------------------------------------
  // 1. KASUS CONFUSING PAIR: DO VS THAT / DID VS DO
  // -------------------------------------------------------------
  if (/do\s*(?:vs|versus|sama|dan|ke)\s*that|do\s*that|did\s*(?:vs|versus|sama)\s*do/i.test(lowerQ)) {
    return {
      contextMode: 'confusing_pair',
      topicTitle: 'Penggunaan "Do" vs "That"',
      patternFormula: 'Do (Melakukan Tindakan) vs That (Merujuk Benda/Hal Tersebut)',
      coachExplanation:
        '"Do" adalah kata kerja tindakan (melakukan/mengerjakan), sedangkan "that" adalah kata penunjuk benda atau hal yang sedang dibicarakan. Sering dipadukan menjadi: "I do that" (Saya melakukan hal itu).',
      pairData: {
        termA: 'Do / Did',
        descA: 'Kata kerja perbuatan (Aksi)',
        colorA: '#FAF2E6',
        termB: 'That',
        descB: 'Kata penunjuk hal / objek (Benda)',
        colorB: '#F4EFEA',
        keyAnalogy: 'Do = Gerakannya (Aksi). That = Yang ditunjuk (Hal itu).',
      },
      quiz: {
        prompt: 'Lengkapi kalimat: "Kemarin saya sudah menyelesaikan tugas itu."',
        options: [
          { id: 'opt_1', text: 'I did that homework yesterday.', isCorrect: true, feedback: 'Tepat sekali! "Did" untuk lampau, "that" merujuk tugas tersebut.' },
          { id: 'opt_2', text: 'I that did homework yesterday.', isCorrect: false, feedback: 'Urutan terbalik! Kata kerja "did" diletakkan sebelum "that".' },
          { id: 'opt_3', text: 'I do that yesterday.', isCorrect: false, feedback: 'Karena ada kata "yesterday", gunakan bentuk lampau "did", bukan "do".' },
        ],
        cloze: {
          prefix: 'I really enjoyed the movie, so I will',
          blankWord: 'do',
          suffix: 'that again next weekend.',
          chips: ['do', 'that', 'did'],
          feedback: 'Keren! Setelah "will" gunakan kata kerja dasar "do", lalu "that" sebagai objek.',
        },
        blocks: {
          correctOrder: ['Can', 'you', 'do', 'that', 'for', 'me?'],
          pool: ['that', 'do', 'Can', 'for', 'you', 'me?', 'did'],
          meaningId: 'Bisakah kamu melakukan hal itu untukku?',
          feedback: 'Susunan sempurna! "Can you do that for me?"',
        },
      },
    };
  }

  // -------------------------------------------------------------
  // 2. KASUS CONFUSING PAIR: HARD VS HARDLY
  // -------------------------------------------------------------
  if (/hard/i.test(lowerQ)) {
    return {
      contextMode: 'confusing_pair',
      topicTitle: 'Hard versus Hardly',
      patternFormula: 'Work hard (giat/keras) vs Hardly work (hampir tidak)',
      coachExplanation:
        'Kata "hard" berarti giat atau bersungguh-sungguh. Sebaliknya, "hardly" bermakna hampir tidak sama sekali. Hati-hati, arti keduanya bertolak belakang 180 derajat!',
      pairData: {
        termA: 'Hard',
        descA: 'Giat, keras, sungguh-sungguh',
        colorA: '#FEF3C7',
        termB: 'Hardly',
        descB: 'Hampir tidak pernah sama sekali',
        colorB: '#FDE8E4',
        keyAnalogy: 'He works hard (Rajin banget) ≠ He hardly works (Pemalas, gak kerja).',
      },
      quiz: {
        prompt: seedVariant % 2 === 0
          ? 'Pilih kata yang tepat: "Chef itu bekerja ______ untuk menyiapkan hidangan pesta."'
          : 'Pilih kata yang tepat: "Rian begitu kelelahan sampai dia ______ bisa membuka matanya."',
        options: seedVariant % 2 === 0
          ? [
              { id: 'opt_1', text: 'The dedicated chef worked hard all evening.', isCorrect: true, feedback: 'Benar! "Worked hard" artinya bekerja giat dan bersungguh-sungguh.' },
              { id: 'opt_2', text: 'The dedicated chef worked hardly all evening.', isCorrect: false, feedback: 'Terkecoh! "Hardly" artinya hampir tidak bekerja sama sekali.' },
              { id: 'opt_3', text: 'The dedicated chef hardly working all evening.', isCorrect: false, feedback: 'Bentuk tata bahasa kurang tepat.' },
            ]
          : [
              { id: 'opt_1', text: 'Rian was so exhausted that he could hardly open his eyes.', isCorrect: true, feedback: 'Tepat sekali! "Hardly" diletakkan sebelum kata kerja untuk arti "hampir tidak bisa".' },
              { id: 'opt_2', text: 'Rian was so exhausted that he could hard open his eyes.', isCorrect: false, feedback: 'Gunakan "hardly" untuk arti hampir tidak bisa.' },
              { id: 'opt_3', text: 'Rian was so exhausted that he hard opened his eyes.', isCorrect: false, feedback: 'Kata "hard" bukan bermakna hampir tidak.' },
            ],
        cloze: {
          prefix: 'Athletes must train',
          blankWord: 'hard',
          suffix: 'every morning to win the trophy.',
          chips: ['hard', 'hardly', 'hardness'],
          feedback: 'Mantap! Untuk menyatakan usaha keras, selalu gunakan "hard".',
        },
        blocks: {
          correctOrder: ['He', 'studied', 'hard', 'for', 'the', 'final', 'exam.'],
          pool: ['hard', 'studied', 'He', 'for', 'the', 'hardly', 'final', 'exam.'],
          meaningId: 'Dia belajar giat untuk ujian akhir.',
          feedback: 'Susunan kalimat tepat sekali!',
        },
      },
    };
  }

  // -------------------------------------------------------------
  // 3. KASUS CONFUSING PAIR: BORROW VS LEND
  // -------------------------------------------------------------
  if (/borrow|lend|pinjam/i.test(lowerQ)) {
    return {
      contextMode: 'confusing_pair',
      topicTitle: 'Borrow versus Lend',
      patternFormula: 'Borrow from (Meminjam dari orang) vs Lend to (Meminjamkan ke orang)',
      coachExplanation:
        '"Borrow" artinya meminjam (kita yang menerima barang dari teman). "Lend" artinya meminjamkan (kita yang memberikan barang ke orang lain). Perhatikan arah barangnya!',
      pairData: {
        termA: 'Borrow (← Menerima)',
        descA: 'Kita meminjam dari orang lain',
        colorA: '#E6F4EA',
        termB: 'Lend (→ Memberi)',
        descB: 'Kita meminjamkan ke orang lain',
        colorB: '#FEF3C7',
        keyAnalogy: 'Barang masuk ke kita = Borrow. Barang keluar dari kita = Lend.',
      },
      quiz: {
        prompt: 'Pilih kalimat yang sopan saat kamu ingin meminjam payung temanmu:',
        options: [
          { id: 'opt_1', text: 'Could I please borrow your umbrella for an hour?', isCorrect: true, feedback: 'Tepat! Kita yang meminjam, jadi gunakan "borrow".' },
          { id: 'opt_2', text: 'Could I please lend your umbrella for an hour?', isCorrect: false, feedback: 'Salah arah! "Lend" artinya kamu meminjamkan payung temanmu ke orang lain.' },
          { id: 'opt_3', text: 'Could you please borrow me your umbrella?', isCorrect: false, feedback: 'Jika subjeknya "you", gunakan "lend me", bukan "borrow me".' },
        ],
        cloze: {
          prefix: 'My brother agreed to',
          blankWord: 'lend',
          suffix: 'me his gaming laptop tonight.',
          chips: ['lend', 'borrow', 'lending'],
          feedback: 'Benar! Kakak memberikan pinjaman ke saya, jadi gunakan "lend me".',
        },
        blocks: {
          correctOrder: ['May', 'I', 'borrow', 'your', 'dictionary', 'please?'],
          pool: ['borrow', 'May', 'I', 'lend', 'your', 'please?', 'dictionary'],
          meaningId: 'Bolehkah saya meminjam kamusmu?',
          feedback: 'Luar biasa! Kalimat tersusun dengan sangat sopan.',
        },
      },
    };
  }

  // -------------------------------------------------------------
  // 4. KASUS TATA BAHASA SINTAKSIS: VERB ING / PRESENT CONTINUOUS
  // -------------------------------------------------------------
  if (/verb.*ing|continuous|sedang|right now|studying/i.test(lowerQ)) {
    return {
      contextMode: 'syntax_ribbon',
      topicTitle: 'Pola Waktu Sedang Berlangsung (Verb-ing)',
      patternFormula: 'Subjek + [am / is / are] + Kata Kerja (Verb-ing)',
      coachExplanation:
        'Gunakan kata bantu to be (am/is/are) diikuti kata kerja berakhiran -ing saat menyatakan kegiatan yang sedang berlangsung detik ini juga. Jangan pernah meninggalkan to be!',
      ribbonSegments: [
        { role: 'Subjek', word: 'The engineers', tagColor: '#FEF3C7' },
        { role: 'Kata Bantu', word: 'are', tagColor: '#E6F4EA' },
        { role: 'Kata Kerja (-ing)', word: 'testing', tagColor: '#FDE8E4' },
        { role: 'Keterangan', word: 'the new system', tagColor: '#F1F0F7' },
      ],
      quiz: {
        prompt: 'Pilih kalimat yang BENAR saat para siswa sedang membaca buku di perpustakaan saat ini:',
        options: [
          { id: 'opt_1', text: 'The students are reading books in the library right now.', isCorrect: true, feedback: 'Tepat sekali! "Are reading" menyatakan kegiatan yang sedang berlangsung.' },
          { id: 'opt_2', text: 'The students are read books in the library right now.', isCorrect: false, feedback: 'Setelah "are", kata kerja wajib memakai bentuk -ing (reading).' },
          { id: 'opt_3', text: 'The students reading books in the library right now.', isCorrect: false, feedback: 'Jangan hilangkan kata bantu to be "are"!' },
        ],
        cloze: {
          prefix: 'Listen! The choir is',
          blankWord: 'singing',
          suffix: 'a beautiful song on stage.',
          chips: ['singing', 'sing', 'sang'],
          feedback: 'Sempurna! Setelah "is", kata kerja bernyanyi menjadi "singing".',
        },
        blocks: {
          correctOrder: ['We', 'are', 'learning', 'English', 'together', 'today.'],
          pool: ['learning', 'are', 'We', 'learn', 'English', 'together', 'today.'],
          meaningId: 'Kita sedang belajar bahasa Inggris bersama hari ini.',
          feedback: 'Rangkaian kalimat sangat alami dan tepat!',
        },
      },
    };
  }

  // -------------------------------------------------------------
  // 4-Z. KASUS JEPANG: PARTIKEL は (WA) VS が (GA)
  // -------------------------------------------------------------
  if (
    /wa\s*(?:vs|sama|dan|dengan)\s*ga|partikel\s*(?:wa|ga)\b|助詞.*は.*が|は\s*(?:vs|と|dan)\s*が|は.*が/i.test(
      lowerQ
    )
  ) {
    return {
      contextMode: 'confusing_pair',
      topicTitle: lt('Partikel は (Wa) vs が (Ga)', 'คำช่วย は (Wa) vs が (Ga)', '助詞「は」と「が」の違い', '助词 は (Wa) 与 が (Ga) 对比'),
      patternFormula: lt(
        'Topik + は (Fokus ke predikat) vs Subjek + が (Menegaskan SIAPA/APA)',
        'หัวข้อ + は (เน้นส่วนขยายด้านหลัง) vs ประธาน + が (เน้นว่าใคร/อะไร)'
      ),
      coachExplanation: lt(
        'Partikel は (dibaca "wa") memperkenalkan TOPIK besar kalimat ("kalau soal X, gimana?"). Sedangkan が (ga) mengunci SUBJEK spesifik atau menjawab pertanyaan "siapa/apa yang melakukan?"',
        'คำช่วย は (อ่านว่า wa) ใช้เปิดหัวข้อใหญ่ของประโยค ส่วน が (ga) ใช้ชี้เฉพาะตัวประธานหรือใช้ตอบคำถามว่า "ใคร/อะไร"'
      ),
      pairData: {
        termA: '私は学生です (Watashi wa gakusei desu)',
        descA: lt(
          'Topik Umum: Membahas predikat setelah は ("Soal saya, saya mahasiswa").',
          'หัวข้อทั่วไป: เน้นข้อมูลหลัง は ("เรื่องฉัน ฉันเป็นนักศึกษา")'
        ),
        colorA: '#FEF3C7',
        termB: '私がしました (Watashi ga shimashita)',
        descB: lt(
          'Penekanan Subjek: Menegaskan pelaku tepat pada kata sebelum が ("SAYALAH yang melakukannya").',
          'ชี้เฉพาะประธาน: เน้นตัวผู้กระทำหน้า が ("ฉันนี่แหละที่เป็นคนทำ")'
        ),
        colorB: '#E6F4EA',
        keyAnalogy: lt(
          'Trik cepat: Setelah kata tanya (誰/どれ/何), WAJIB pakai が, jangan pernah pakai は!',
          'จำง่ายๆ: หลังคำถามเช่น 誰 (ใคร) หรือ 何 (อะไร) ต้องใช้ が เสมอ ห้ามใช้ は!'
        ),
      },
      quiz: {
        prompt: lt(
          'Saat menjawab pertanyaan "Siapa yang membuat ini?", kalimat manakah yang tepat?',
          'เมื่อตอบคำถามว่า "ใครเป็นคนทำสิ่งนี้?" ประโยคใดถูกต้อง?'
        ),
        options: [
          { id: 'opt_1', text: '私が作りました。', isCorrect: true, feedback: ui.correctFeedback },
          {
            id: 'opt_2',
            text: '誰は作りましたか？',
            isCorrect: false,
            feedback: lt('Salah! Kata tanya seperti 誰 (siapa) wajib memakai が, bukan は.', 'ผิด! คำถามอย่าง 誰 ต้องตามด้วย が เสมอ'),
          },
          {
            id: 'opt_3',
            text: '桜は雨がきれいです。',
            isCorrect: false,
            feedback: lt('Sifat/keadaan subjek langsung seperti bunga sakura lebih alami memakai が (桜がきれい).', 'ลักษณะเฉพาะของสิ่งนั้นๆ มักใช้ が (桜がきれい)'),
          },
        ],
        cloze: {
          prefix: '誰',
          blankWord: 'が',
          suffix: '来ますか？',
          chips: ['が', 'は', 'を'],
          feedback: ui.clozeCorrectFeedback,
        },
        blocks: {
          correctOrder: ['桜', 'が', 'きれいです。'],
          pool: ['は', 'きれいです。', '桜', 'が'],
          meaningId: lt('Susun kata menjadi: "Bunga sakura itu indah."', 'เรียงคำเป็น: "ดอกซากุระสวยมาก"'),
          feedback: ui.blocksCorrectFeedback,
        },
      },
    };
  }

  // -------------------------------------------------------------
  // 5. KASUS JEPANG: PARTIKEL に (NI) VS で (DE)
  // -------------------------------------------------------------
  if (/ni\s*(?:vs|sama|dan)\s*de|partikel\s*ni|partikel\s*de|に.*で/i.test(lowerQ)) {
    return {
      contextMode: 'confusing_pair',
      topicTitle: lt('Partikel に (Ni) vs で (De)', 'คำช่วย に (Ni) vs で (De)', '助詞「に」と「で」の使い分け', '助词 に (Ni) 与 で (De) 对比'),
      patternFormula: lt(
        'Tempat + に (Tujuan Gerakan / Keberadaan) vs Tempat + で (Lokasi Aktivitas)',
        'สถานที่ + に (จุดหมายการเดินทาง / การมีอยู่) vs สถานที่ + で (สถานที่ทำกิจกรรม)'
      ),
      coachExplanation: lt(
        'Partikel に (ni) dipakai untuk titik tujuan gerakan (pergi ke...) atau tempat diamnya sesuatu (ada di...). Sedangkan partikel で (de) dipakai untuk tempat berlangsungnya suatu kegiatan aktif (belajar di..., makan di...).',
        'คำช่วย に (ni) ใช้บอกจุดหมายปลายทางที่ไปถึง (ไปที่...) หรือตำแหน่งที่มีสิ่งของ/คนอยู่ ส่วนคำช่วย で (de) ใช้บอกสถานที่ที่เกิดการกระทำหรือกิจกรรม (เรียนที่..., กินที่...)'
      ),
      pairData: {
        termA: lt('Tempat + に (Ni)', 'สถานที่ + に (Ni)'),
        descA: lt('Titik tujuan (pergi ke) / Posisi diam', 'จุดหมายปลายทาง (ไปที่) / ตำแหน่งคงที่'),
        colorA: '#FAF2E6',
        termB: lt('Tempat + で (De)', 'สถานที่ + で (De)'),
        descB: lt('Tempat melakukan aktivitas / aksi', 'สถานที่ลงมือทำกิจกรรม'),
        colorB: '#E6F4EA',
        keyAnalogy: lt('Tujuan pergi = に (Ni). Tempat beraksi = で (De).', 'จุดหมายที่จะไป = に (Ni). ที่ที่ทำกิจกรรม = で (De).'),
      },
      quiz: {
        prompt: lt('Lengkapi kalimat: "Saya makan ramen di restoran."', 'เติมคำช่วยในประโยค: "ฉันกินราเมงที่ร้านอาหาร"'),
        options: [
          { id: 'opt_1', text: 'レストランで ラーメンを 食べます。', isCorrect: true, feedback: lt('Tepat sekali! Makan ramen adalah aktivitas, jadi gunakan partikel で (de).', 'ถูกต้อง! การกินราเมงคือกิจกรรม จึงต้องใช้คำช่วย で (de)') },
          { id: 'opt_2', text: 'レストランに ラーメンを 食べます。', isCorrect: false, feedback: lt('Kurang pas. Partikel に untuk tujuan arah, bukan tempat beraktivitas.', 'ยังไม่ตรง คำช่วย に ใช้กับจุดหมาย ไม่ใช่สถานที่ทำกิจกรรม') },
          { id: 'opt_3', text: 'レストランを ラーメンに 食べます。', isCorrect: false, feedback: lt('Partikel terbalik.', 'คำช่วยสลับตำแหน่งกันอยู่') },
        ],
        cloze: {
          prefix: 'あした ともだちと としょかん',
          blankWord: 'で',
          suffix: 'べんきょうします。',
          chips: ['で', 'に', 'を'],
          feedback: lt('Benar! Belajar (べんきょうします) adalah aktivitas, jadi gunakan で.', 'ถูกต้อง! การเรียน (べんきょうします) เป็นกิจกรรม ใช้ で'),
        },
        blocks: {
          correctOrder: ['わたしは', 'にちようびに', 'とうきょうに', 'いきます。'],
          pool: ['いきます。', 'わたしは', 'とうきょうに', 'とうきょうで', 'にちようびに'],
          meaningId: lt('Saya pergi ke Tokyo pada hari Minggu.', 'ฉันไปโตเกียวในวันอาทิตย์'),
          feedback: lt('Susunan kalimat bahasa Jepang sudah sangat tepat!', 'เรียงประโยคภาษาญี่ปุ่นได้ถูกต้องและเป็นธรรมชาติมาก!'),
        },
      },
    };
  }

  // -------------------------------------------------------------
  // 5-A. KASUS PTE ACADEMIC: DESCRIBE IMAGE (SVG CHARTS & 5-STAGE FORMULA)
  // -------------------------------------------------------------
  if (
    action?.focusType === 'pte_describe_image' ||
    (action?.focusType !== 'pte_read_aloud' &&
      (lowerQ.includes('renewable') ||
        lowerQ.includes('describe image') ||
        /describe.*image|pte.*di|pte.*chart|pte.*grafik|bar chart|line graph|pie chart|process flow|map|table/i.test(lowerQ)))
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
      coachExplanation:
        'Kunci Describe Image adalah KELANCARAN MUTLAK. Jangan berhenti lebih dari 3 detik! Gunakan 5 kalimat sakti Fiezel tanpa ragu, biarkan intonasi terus mengalir santai tapi tegas.',
      pteChartData: pteChart,
      quiz: {
        prompt: `Pilih kalimat pembuka (Introduction) yang BENAR untuk ${targetQ.title}:`,
        options: [
          {
            id: 'opt_1',
            text: targetQ.universalTemplate.intro,
            isCorrect: true,
            feedback: 'Sempurna! Formula pembuka standar Pearson yang menjamin poin Fluency & Content.',
          },
          {
            id: 'opt_2',
            text: 'I see many colorful bars with numbers in this picture.',
            isCorrect: false,
            feedback: 'Hindari bahasa kasual seperti "I see"! Gunakan kalimat akademik standar.',
          },
          {
            id: 'opt_3',
            text: 'This image is talking about renewable energy maybe.',
            isCorrect: false,
            feedback: 'Hindari kata ragu "maybe". Bersikaplah tegas dan percaya diri.',
          },
        ],
        cloze: {
          prefix: 'Looking closely, the',
          blankWord: 'maximum',
          suffix: 'figure can be clearly observed in this informative visual.',
          chips: ['maximum', 'huge', 'big', 'taller'],
          feedback: 'Tepat! "maximum figure" adalah kolokasi akademik baku yang sangat disukai Pearson AI scorer.',
        },
        blocks: {
          correctOrder: ['The', 'given', 'image', 'provides', 'key', 'information', 'about', 'the', 'visual.'],
          pool: ['about', 'given', 'The', 'visual.', 'information', 'provides', 'key', 'image', 'the'],
          meaningId: 'Susun kalimat pengantar standar Pearson Describe Image:',
          feedback: 'Susunan kalimat pembuka tepat sempurna!',
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
            title: lt('Read Aloud Bahasa Inggris', 'ฝึกอ่านออกเสียงภาษาอังกฤษ'),
          },
          {
            passage: 'Could you please speak a little more slowly so I can understand every detail?',
            idTrans: 'Bisakah kamu berbicara sedikit lebih pelan agar aku bisa memahami setiap detailnya?',
            thTrans: 'ช่วยพูดช้าลงอีกนิดได้ไหม เพื่อให้ฉันเข้าใจทุกรายละเอียด',
            title: lt('Read Aloud Bahasa Inggris', 'ฝึกอ่านออกเสียงภาษาอังกฤษ'),
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
          : (liveTrans.translationId && !liveTrans.translationId.startsWith('Pahami') ? liveTrans.translationId : '')
        : loc === 'th'
          ? preset.thTrans
          : preset.idTrans;
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
          tip: lt('Baca utuh dengan artikulasi jelas sesuai teks.', 'อ่านให้ครบทุกพยางค์และออกเสียงให้ชัดเจนตามข้อความ'),
        })),
        questionId: 'custom_live_ra',
        category: effectiveLang,
        examFrequency: lt('Baca Nyaring Aktif', 'ฝึกอ่านออกเสียง'),
        sourceOrigin: 'FIEZEL Live Coach',
        examinerTips:
          action?.explanationText ||
          lt(
            'Baca teks berikut dengan lantang kata demi kata. AI akan memeriksa pelafalan & ketepatan setiap kata yang kamu ucapkan.',
            'อ่านออกเสียงข้อความด้านล่างให้ชัดเจนทีละคำ AI จะตรวจความถูกต้องของคำและเสียงทันที'
          ),
        oneSentenceHack:
          transText || lt('Fokus pada jeda napas alami dan jangan melewatkan kata akhir.', 'เน้นจังหวะหายใจที่เป็นธรรมชาติและไม่ข้ามคำท้าย'),
        isGeneralReadAloud: true,
        targetLang: effectiveLang,
        translationText: transText,
        readingGuide,
      };

      return {
        contextMode: 'read_aloud',
        topicTitle: readAloudData.title,
        patternFormula:
          readingGuide || lt('Baca kata demi kata persis seperti di layar', 'อ่านตามข้อความบนหน้าจอให้ครบทุกคำ'),
        coachExplanation: readAloudData.examinerTips || '',
        pteReadAloudData: readAloudData,
        quiz: {
          prompt: lt('Baca kalimat target berikut dengan jelas kata demi kata:', 'อ่านออกเสียงประโยคต่อไปนี้ให้ชัดเจนทีละคำ:'),
          options: [
            { id: 'opt_1', text: passage, isCorrect: true, feedback: ui.correctFeedback },
            { id: 'opt_2', text: passage, isCorrect: false, feedback: ui.wrongFeedback },
          ],
          cloze: { prefix: '', blankWord: cleanTokens[0] || passage, suffix: '', chips: [cleanTokens[0] || passage], feedback: ui.clozeCorrectFeedback },
          blocks: { correctOrder: cleanTokens, pool: cleanTokens, meaningId: transText || ui.blocksInstruction, feedback: ui.blocksCorrectFeedback },
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
                tip: 'Ucapkan suku kata akhir dengan artikulasi jelas.',
              })),
            oneSentenceHack:
              'Jaga intonasi stabil di tiap klausa dan berhenti sejenak (0.3d) di setiap tanda jeda //.',
            examinerTips:
              action?.explanationText ||
              'Baca kalimat persis sesuai teks di layar dengan pelafalan konsonan akhir yang jelas.',
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
        'Pearson tidak menilai kecepatan balap, melainkan KONSISTENSI IRAMA. Tarik nafas hanya pada tanda jeda //, jangan berhenti di tengah kata frasa!',
      pteReadAloudData: readAloudData,
      quiz: {
        prompt: 'Di manakah jeda nafas (chunking) yang BENAR pada kalimat ini?',
        options: [
          {
            id: 'opt_1',
            text: 'The proliferation of renewable technologies // has transformed power grids.',
            isCorrect: true,
            feedback: 'Tepat! Pemenggalan dilakukan di antara Subjek Frasa Kompleks dan Kata Kerja Utama.',
          },
          {
            id: 'opt_2',
            text: 'The proliferation // of renewable // technologies has // transformed grids.',
            isCorrect: false,
            feedback: 'Terlalu banyak jeda patah-patah! Ini akan merusak skor Oral Fluency.',
          },
          {
            id: 'opt_3',
            text: 'The proliferation of renewable technologies has transformed power grids without breathing.',
            isCorrect: false,
            feedback: 'Membaca tanpa jeda sama sekali akan membuat suara kehabisan nafas di akhir.',
          },
        ],
        cloze: {
          prefix: 'Recent empirical studies',
          blankWord: 'demonstrate',
          suffix: 'that battery storage provides stable output.',
          chips: ['demonstrate', 'demonstrates', 'demonstrated'],
          feedback: 'Benar! Subjek "studies" berbentuk jamak, jadi gunakan kata kerja dasar "demonstrate".',
        },
        blocks: {
          correctOrder: ['Recent', 'empirical', 'studies', 'demonstrate', 'clean', 'energy', 'growth.'],
          pool: ['growth.', 'demonstrate', 'Recent', 'energy', 'studies', 'empirical', 'clean'],
          meaningId: 'Susun kalimat akademik Read Aloud dengan urutan yang tepat:',
          feedback: 'Sempurna! Frasa terangkai dengan sintaksis akademik yang baik.',
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
      ? `Laju tutur terukur ${diag.wpm} WPM (${diag.pacingQuality === 'optimal' ? 'zona optimal 115-152 WPM' : diag.pacingQuality === 'rushed' ? 'terlalu cepat' : 'kurang cepat'}) dalam durasi ${diag.durationSec}d` +
        (typeof diag.activeSpeechSec === 'number'
          ? ` (vokal aktif ${diag.activeSpeechSec}d, fonasi ${Math.round((diag.phonationRatio || 0) * 100)}%). `
          : '. ') +
        (diag.fluencyReasons && diag.fluencyReasons.length > 0
          ? diag.fluencyReasons.slice(0, 2).join('; ') + '.'
          : 'Irama tutur konsisten.')
      : 'Belum ada sampel ucapan PTE pada sesi ini. Mulai bicara ke mikrofon agar Oral Fluency (WPM, jeda, disfluensi, & irama burst) terukur secara langsung.';

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
      topicTitle: 'Rapor Ujian Resmi Pearson PTE',
      patternFormula: 'Pearson Metric: Fluency (5.0) + Pronunciation (5.0) + Content (3.0)',
      coachExplanation: diag
        ? hasTiming && diag.scores.passedTarget
          ? `Hasil evaluasi objektif dari sampel ucapan terakhir (${diag.measurementSource || 'measured'}). Kamu memenuhi target PTE 58+.`
          : `Hasil evaluasi objektif dari sampel ucapan terakhir (${diag.measurementSource || 'measured'}). Fokus pada kelancaran jeda dan kejelasan vokal akhir.`
        : 'Rekam jawabanmu terlebih dahulu untuk melihat skor Pearson Concordance (/90), laju WPM, rasio fonasi aktif, dan rincian jeda nyata.',
      pteScorecardData: scorecardData,
      quiz: {
        prompt: 'Bagaimana pelafalan kata "fluctuations" yang benar?',
        options: [
          {
            id: 'opt_1',
            text: '/ˌflʌk.tʃuˈeɪ.ʃənz/ (dengan bunyi sh pada -tion)',
            isCorrect: true,
            feedback: 'Tepat sekali! Akhiran -tion dibaca /ʃənz/.',
          },
          {
            id: 'opt_2',
            text: '/fluk-tu-a-si-on/ (pelafalan harfiah)',
            isCorrect: false,
            feedback: 'Kurang tepat. Jangan melafalkan huruf demi huruf secara harfiah.',
          },
        ],
        cloze: {
          prefix: 'Learners must maintain steady',
          blankWord: 'fluency',
          suffix: 'throughout the speech.',
          chips: ['fluency', 'fluent', 'fluently'],
          feedback: 'Tepat! Kata benda "fluency" yang dibutuhkan.',
        },
        blocks: {
          correctOrder: ['Fluency', 'is', 'the', 'key', 'to', 'high', 'scores.'],
          pool: ['scores.', 'key', 'Fluency', 'to', 'high', 'is', 'the'],
          meaningId: 'Susun kalimat prinsip kelancaran PTE:',
          feedback: 'Tepat! Fluency is the key to high scores.',
        },
      },
    };
  }

  // -------------------------------------------------------------
  // 5-D. KASUS BAHASA JEPANG ALAMI: TE-KEI / PAST / PARTIKEL WO-NI / MASU-DESHITA
  // -------------------------------------------------------------
  if (
    effectiveLang === 'ja' &&
    (/て形|過去形|tekei|kakokei|ますでした|ました|コーヒー|に.*を|partikel.*o|partikel.*wo/i.test(combinedHintText) ||
      action?.misconceptionId === 'JA_PARTICLE_NI_AND_MASU_DESHITA')
  ) {
    const isTePast = /て形|過去形|tekei|kakokei|tsukaiwake|使い分け/i.test(combinedHintText);
    if (isTePast) {
      return {
        contextMode: 'confusing_pair',
        topicTitle: query || lt('Pola て形 (Sambung/Minta) vs 過去形 (Lampau)', 'รูป て形 (เชื่อม/ขอร้อง) vs 過去形 (อดีต)', 'て形と過去形の使い分け', 'て形与过去式用法对比'),
        patternFormula: lt(
          'V-て (Sambung aksi / Meminta) vs V-た / ました (Sudah selesai di masa lalu)',
          'V-て (เชื่อมกริยา/ขอร้อง) vs V-た / ました (ทำเสร็จแล้วในอดีต)',
          'V-て（つなぐ・依頼） vs V-た／ました（過去の完了）',
          'V-て（连接/请求） vs V-た／ました（过去完成）'
        ),
        coachExplanation: lt(
          'Bentuk て形 (te-kei) dipakai untuk menyambung dua aksi berurutan atau meminta dengan sopan (~てください). Bentuk 過去形 (kakokei: ~た / ~ました) menyatakan kejadian yang sudah selesai.',
          'รูป て形 (te-kei) ใช้เชื่อมกริยาต่อเนื่องหรือขอร้องอย่างสุภาพ (~てください) ส่วนรูป 過去形 (~た / ~ました) ใช้บอกสิ่งที่ทำเสร็จสิ้นแล้วในอดีต',
          '「て形」は動作をつないだりお願いするとき（〜てください）に使い、「過去形（〜た／〜ました）」は完了した出来事を表します。',
          '「て形」用于连接动作或礼貌请求（〜てください），而「过去式（〜た／〜ました）」表示已经完成的动作。'
        ),
        pairData: {
          termA: 'コーヒーを 買って 帰ります',
          descA: lt('て形: Beli kopi dulu, lalu pulang (aksi berurutan)', 'て形: ซื้อกาแฟแล้วกลับ (เชื่อมกริยาต่อเนื่อง)'),
          colorA: '#FEF3C7',
          termB: 'きのう カフェで コーヒーを 飲みました',
          descB: lt('過去形 (~ました): Sudah minum kopi kemarin (lampau)', '過去形 (~ました): ดื่มกาแฟแล้วเมื่อวาน (อดีต)'),
          colorB: '#E6F4EA',
          keyAnalogy: lt(
            'Sambung / minta = ~て。Sudah selesai = ~ました / ~た。',
            'เชื่อมกริยา/ขอร้อง = ~て。ทำเสร็จแล้ว = ~ました / ~た。'
          ),
        },
        quiz: {
          prompt: lt(
            'Pilih kalimat yang benar untuk "Kemarin saya minum kopi di kafe."',
            'เลือกประโยคที่ถูกต้องสำหรับ "เมื่อวานฉันดื่มกาแฟที่คาเฟ่"'
          ),
          options: [
            { id: 'opt_1', text: 'きのう カフェで コーヒーを 飲みました。', isCorrect: true, feedback: ui.correctFeedback },
            { id: 'opt_2', text: 'きのう カフェに コーヒーを 飲みますでした。', isCorrect: false, feedback: lt('Hindari bentuk tidak alami "飲みますでした" dan pakai で untuk tempat aktivitas.', 'หลีกเลี่ยงรูป "飲みますでした" และใช้ で สำหรับสถานที่ทำกิจกรรม') },
            { id: 'opt_3', text: 'きのう カフェで コーヒーを 飲んで いますでした。', isCorrect: false, feedback: lt('Bentuk lampau sopan dari ~ます adalah ~ました, bukan ~ますでした.', 'รูปอดีตสุภาพของ ~ます คือ ~ました ไม่ใช่ ~ますでした') },
          ],
          cloze: {
            prefix: 'ちょっと',
            blankWord: 'まって',
            suffix: 'ください。',
            chips: ['まって', 'まちました', 'まつの'],
            feedback: ui.clozeCorrectFeedback,
          },
          blocks: {
            correctOrder: ['カフェで', 'コーヒーを', '買って', '帰りました。'],
            pool: ['帰りました。', 'カフェで', '買って', '買うでした', 'コーヒーを'],
            meaningId: lt('Saya membeli kopi di kafe lalu pulang.', 'ฉันซื้อกาแฟที่คาเฟ่แล้วกลับบ้าน'),
            feedback: ui.blocksCorrectFeedback,
          },
        },
      };
    }

    return {
      contextMode: 'confusing_pair',
      topicTitle: query || lt('Pola Objek を & Lampau ～ました', 'คำช่วยกรรม を และรูปอดีต ～ました'),
      patternFormula: lt('Tempat + で · Objek + を · Kata Kerja + ました', 'สถานที่ + で · กรรม + を · กริยา + ました'),
      coachExplanation: lt(
        'Untuk aktivitas di tempat gunakan で (de), untuk objek langsung (seperti kopi) gunakan を (wo/o), dan bentuk lampau sopan dari ~ます adalah ~ました (BUKAN ~ますでした!).',
        'สำหรับสถานที่ทำกิจกรรมใช้ で (de) สำหรับกรรมตรง (เช่น กาแฟ) ใช้ を (o) และรูปอดีตสุภาพของ ~ます คือ ~ました (ไม่ใช่ ~ますでした!)',
        '場所での動作には「で」、目的語には「を」を使い、「〜ます」の過去形は「〜ました」になります（「〜ますでした」は不自然です）。',
        '动作发生的地点用「で」，直接宾语用「を」，「〜ます」的礼貌过去式是「〜ました」（不能说「〜ますでした」）。'
      ),
      pairData: {
        termA: action?.wrongWord || 'コーヒーに 飲みますでした',
        descA: lt('Kurang tepat: に untuk tujuan, dan ～ますでした tidak ada.', 'ยังไม่ถูก: に ใช้กับจุดหมาย และไม่มีรูป ～ますでした'),
        colorA: '#FDE8E4',
        termB: action?.rightWord || 'カフェで コーヒーを 飲みました',
        descB: lt('Alami: Tempat + で, Objek + を, Lampau ～ました.', 'เป็นธรรมชาติ: สถานที่ + で, กรรม + を, อดีต ～ました'),
        colorB: '#E6F4EA',
        keyAnalogy: lt('Objek minuman = を。Lampau dari 飲みます = 飲みました。', 'กรรมของกริยา = を。รูปอดีตของ 飲みます = 飲みました'),
      },
      quiz: {
        prompt: lt('Manakah kalimat bahasa Jepang yang paling alami?', 'ประโยคภาษาญี่ปุ่นข้อใดถูกต้องและเป็นธรรมชาติที่สุด?'),
        options: [
          { id: 'opt_1', text: 'カフェで コーヒーを 飲みました。', isCorrect: true, feedback: ui.correctFeedback },
          { id: 'opt_2', text: 'カフェに コーヒーに 飲みますでした。', isCorrect: false, feedback: lt('Partikel objek harus を dan lampau harus 飲みました.', 'คำช่วยกรรมต้องใช้ を และรูปอดีตต้องเป็น 飲みました') },
          { id: 'opt_3', text: 'カフェを コーヒーで 飲みました。', isCorrect: false, feedback: lt('Partikel で dan を tertukar.', 'คำช่วย で และ を สลับตำแหน่งกันอยู่') },
        ],
        cloze: {
          prefix: 'さっき コーヒーを',
          blankWord: '飲みました',
          suffix: '。',
          chips: ['飲みました', '飲みますでした', '飲みません'],
          feedback: ui.clozeCorrectFeedback,
        },
        blocks: {
          correctOrder: ['カフェで', 'コーヒーを', '飲みました。'],
          pool: ['コーヒーを', '飲みました。', 'カフェで', '飲みますでした'],
          meaningId: lt('Saya sudah minum kopi di kafe.', 'ฉันดื่มกาแฟที่คาเฟ่แล้ว'),
          feedback: ui.blocksCorrectFeedback,
        },
      },
    };
  }

  // -------------------------------------------------------------
  // 5-E. KASUS BAHASA MANDARIN: LOKASI SEBELUM KATA KERJA / CLASSIFIER / NADA
  // -------------------------------------------------------------
  if (
    effectiveLang === 'zh' &&
    (/在家里|在.*学习|学习汉语|zh_location_before_verb|一杯|一个|nada|tone|hanzi|radikal/i.test(combinedHintText) ||
      Boolean(action?.misconceptionId?.startsWith('zh_')))
  ) {
    if (/一杯|一个|classifier|量词/i.test(combinedHintText)) {
      return {
        contextMode: 'confusing_pair',
        topicTitle: query || lt('Kata Satuan: 一杯 (Secangkir) vs 一个 (Sebuah)', 'ลักษณนาม: 一杯 (1 แก้ว) vs 一个 (1 อัน)', '量詞：一杯 vs 一個', '量词对比：一杯 vs 一个'),
        patternFormula: lt('Bilangan + Kata Satuan (杯 untuk gelas/cangkir) + Benda', 'ตัวเลข + ลักษณนาม (杯 สำหรับแก้ว/ถ้วย) + คำนาม'),
        coachExplanation: lt(
          'Dalam Mandarin, minuman di cangkir/gelas memakai kata satuan 杯 (bēi), bukan kata satuan umum 个 (gè). Contoh alami: 一杯咖啡 (secangkir kopi).',
          'ในภาษาจีนกลาง เครื่องดื่มที่ใส่แก้วหรือถ้วยใช้ลักษณนามว่า 杯 (bēi) ไม่ใช่ 个 (gè) ตัวอย่างเช่น 一杯咖啡 (กาแฟ 1 แก้ว)',
          '中国語ではカップやグラスに入った飲み物には量詞「杯 (bēi)」を使います（「个」ではありません）。',
          '在汉语中，盛在杯子里的饮品使用量词“杯”，不用通用量词“个”。如：一杯咖啡。'
        ),
        pairData: {
          termA: '一个咖啡',
          descA: lt('Kurang alami untuk cangkir kopi', 'ไม่นิยมใช้กับกาแฟ 1 แก้ว'),
          colorA: '#FDE8E4',
          termB: '一杯咖啡',
          descB: lt('Alami: secangkir / segelas kopi', 'เป็นธรรมชาติ: กาแฟ 1 แก้ว'),
          colorB: '#E6F4EA',
          keyAnalogy: lt('Cangkir/gelas = 杯 (bēi). Benda umum = 个 (gè).', 'แก้ว/ถ้วย = 杯 (bēi). ของทั่วไป = 个 (gè).'),
        },
        characterData: {
          char: '杯',
          reading: 'bēi',
          meaning: lt('cangkir / gelas', 'ถ้วย / แก้ว'),
          radical: '木',
          radicalMeaning: lt('kayu (cangkir kuno dari kayu)', 'ไม้'),
          strokesCount: 8,
        },
        quiz: {
          prompt: lt('Bagaimana memesan "secangkir teh" secara alami?', 'จะสั่ง "ชา 1 แก้ว" อย่างเป็นธรรมชาติได้อย่างไร?'),
          options: [
            { id: 'opt_1', text: '我要一杯茶，谢谢。', isCorrect: true, feedback: ui.correctFeedback },
            { id: 'opt_2', text: '我要一个茶，谢谢。', isCorrect: false, feedback: lt('Minuman dalam gelas lebih alami memakai 杯, bukan 个.', 'เครื่องดื่มในแก้วควรใช้ 杯 แทน 个') },
            { id: 'opt_3', text: '我一杯要茶，谢谢。', isCorrect: false, feedback: lt('Letakkan kata kerja 要 sebelum 一杯茶.', 'วางกริยา 要 ไว้หน้า 一杯茶') },
          ],
          cloze: {
            prefix: '我想点一',
            blankWord: '杯',
            suffix: '冰咖啡。',
            chips: ['杯', '个', '本'],
            feedback: ui.clozeCorrectFeedback,
          },
          blocks: {
            correctOrder: ['我', '想要', '一杯', '热咖啡。'],
            pool: ['一杯', '我', '热咖啡。', '想要', '一个'],
            meaningId: lt('Saya ingin memesan secangkir kopi panas.', 'ฉันต้องการสั่งกาแฟร้อนหนึ่งแก้ว'),
            feedback: ui.blocksCorrectFeedback,
          },
        },
      };
    }

    if (/nada|tone|声调/i.test(combinedHintText) && !/在家里|学习汉语/i.test(combinedHintText)) {
      return {
        contextMode: 'tone_waveform',
        topicTitle: query || lt('Kontur 4 Nada Mandarin (声调)', 'ผันเสียงวรรณยุกต์จีน 4 เสียง (声调)'),
        patternFormula: lt('Nada 1 (ā datar) · Nada 2 (á naik) · Nada 3 (ǎ turun-naik) · Nada 4 (à turun tajam)', 'เสียง 1 (ā สามัญสูง) · เสียง 2 (á จัตวา) · เสียง 3 (ǎ ต่ำ) · เสียง 4 (à โทตก)'),
        coachExplanation: lt(
          'Perbedaan nada mengubah arti kata Mandarin sepenuhnya. Pertahankan tinggi-rendah nada sebelum menyambung ke kata berikutnya.',
          'ความต่างของวรรณยุกต์เปลี่ยนความหมายของคำในภาษาจีนกลางโดยสิ้นเชิง ลองฝึกออกเสียงให้ชัดเจนก่อนเชื่อมคำถัดไป',
          '中国語は声調によって意味が完全に変わります。それぞれの音の高低を意識しましょう。',
          '汉语声调不同意思完全不同，发音时请把调值发饱满。'
        ),
        toneData: {
          word: '喝茶',
          phonetic: 'hē chá',
          toneType: lt('Nada 1 (Datar Tinggi) + Nada 2 (Naik)', 'เสียง 1 (สูงราบ) + เสียง 2 (ไต่ขึ้น)'),
          toneShape: '55 ˉ + 35 ˊ',
        },
        quiz: {
          prompt: lt('Manakah nada yang benar untuk "minum kopi" (hē kāfēi)?', 'ข้อใดคือพินอินและวรรณยุกต์ที่ถูกต้องของ "ดื่มกาแฟ"?'),
          options: [
            { id: 'opt_1', text: '喝咖啡 (Hē kāfēi)', isCorrect: true, feedback: ui.correctFeedback },
            { id: 'opt_2', text: '和咖啡 (Hé kāfēi)', isCorrect: false, feedback: lt('和 (hé, nada 2) berarti "dan", sedangkan 喝 (hē, nada 1) berarti "minum".', '和 (hé) แปลว่า "และ" ส่วน 喝 (hē) แปลว่า "ดื่ม"') },
            { id: 'opt_3', text: '喝可乐 (Hē kělè)', isCorrect: false, feedback: lt('可乐 berarti cola, bukan kopi.', '可乐 แปลว่าโคล่า ไม่ใช่กาแฟ') },
          ],
          cloze: {
            prefix: '我每天早上都',
            blankWord: '喝',
            suffix: '咖啡。',
            chips: ['喝', '和', '吃'],
            feedback: ui.clozeCorrectFeedback,
          },
          blocks: {
            correctOrder: ['我', '每天', '喝', '热茶。'],
            pool: ['喝', '每天', '热茶。', '我', '和'],
            meaningId: lt('Saya minum teh hangat setiap hari.', 'ฉันดื่มชาร้อนทุกวัน'),
            feedback: ui.blocksCorrectFeedback,
          },
        },
      };
    }

    // Default ZH misconception board: Lokasi [在 + Tempat] sebelum Kata Kerja!
    return {
      contextMode: 'syntax_ribbon',
      topicTitle: query || lt('Urutan Lokasi Mandarin: 在 + Tempat + Aksi', 'ลำดับตำแหน่งภาษาจีน: 在 + สถานที่ + กริยา', '中国語の語順：在 + 場所 + 動詞', '汉语语序：在 + 地点 + 动词'),
      patternFormula: lt('Subjek + 在 + Tempat + Kata Kerja + Objek', 'ประธาน + 在 + สถานที่ + กริยา + กรรม'),
      coachExplanation: lt(
        'Dalam bahasa Mandarin, keterangan tempat (在 + lokasi) WAJIB diletakkan SEBELUM kata kerja, BUKAN di akhir kalimat seperti bahasa Indonesia atau Inggris!',
        'ในภาษาจีนกลาง คำบอกสถานที่ (在 + สถานที่) ต้องวางไว้ก่อนคำกริยาเสมอ ห้ามวางไว้ท้ายประโยคเหมือนภาษาไทยหรืออังกฤษ!',
        '中国語では「在＋場所」を必ず動詞の前に置きます。文末には置きません。',
        '汉语中地点状语“在＋地点”必须放在动词前面，不能像印尼语或英语那样放在句尾！'
      ),
      ribbonSegments: [
        { role: lt('Subjek', 'ประธาน'), word: '我', tagColor: '#FEF3C7' },
        { role: lt('Lokasi (Sebelum Aksi!)', 'สถานที่ (ก่อนกริยา!)'), word: '在家里', tagColor: '#E6F4EA' },
        { role: lt('Aksi + Objek', 'กริยา + กรรม'), word: '学习汉语', tagColor: '#FDE8E4' },
      ],
      pairData: {
        termA: action?.wrongWord || '我学习汉语在家里',
        descA: lt('Salah posisi: 在家里 ditaruh di belakang kata kerja', 'วางผิดตำแหน่ง: เอา 在家里 ไว้หลังกริยา'),
        colorA: '#FDE8E4',
        termB: action?.rightWord || '我在家里学习汉语',
        descB: lt('Alami: 在家里 ditaruh tepat sebelum 学习汉语', 'เป็นธรรมชาติ: วาง 在家里 ไว้ก่อน 学习汉语'),
        colorB: '#E6F4EA',
        keyAnalogy: lt('Rumus emas: Orang dulu -> Di mana -> Ngapain.', 'สูตรจำง่าย: ใคร -> ที่ไหน -> ทำอะไร'),
      },
      quiz: {
        prompt: lt('Manakah urutan kalimat Mandarin yang benar untuk "Saya belajar Mandarin di rumah."?', 'ประโยคภาษาจีนข้อใดเรียงลำดับถูกต้องสำหรับ "ฉันเรียนภาษาจีนที่บ้าน"?'),
        options: [
          { id: 'opt_1', text: '我在家里学习汉语。', isCorrect: true, feedback: ui.correctFeedback },
          { id: 'opt_2', text: '我学习汉语在家里。', isCorrect: false, feedback: lt('Jangan taruh 在家里 di akhir kalimat - pindahkan ke sebelum 学习!', 'อย่าวาง 在家里 ไว้ท้ายประโยค ให้ย้ายมาไว้หน้า 学习') },
          { id: 'opt_3', text: '在家里学习我汉语。', isCorrect: false, feedback: lt('Subjek 我 tetap diletakkan di awal sebelum kata kerja.', 'ประธาน 我 ต้องอยู่หน้าคำกริยา') },
        ],
        cloze: {
          prefix: '我',
          blankWord: '在图书馆',
          suffix: '看书。',
          chips: ['在图书馆', '看书在', '图书馆去'],
          feedback: ui.clozeCorrectFeedback,
        },
        blocks: {
          correctOrder: ['我', '在家里', '学习', '汉语。'],
          pool: ['学习', '我', '汉语。', '在家里', '去'],
          meaningId: lt('Saya belajar bahasa Mandarin di rumah.', 'ฉันเรียนภาษาจีนที่บ้าน'),
          feedback: ui.blocksCorrectFeedback,
        },
      },
    };
  }

  // -------------------------------------------------------------
  // 6. DEFAULT ADAPTIVE FALLBACK (BEBAS KAKU, ZERO ENGLISH LEAK PADA JA/ZH)
  // -------------------------------------------------------------
  const defaultTitles: Record<TargetLang, string> = {
    en: lt('Pemahaman Materi', 'ความเข้าใจบทเรียน', '学習ポイント', '学习重点'),
    ja: lt('Latihan Pola Bahasa Jepang', 'ฝึกโครงสร้างภาษาญี่ปุ่น', '日本語表現の練習', '日语表达练习'),
    zh: lt('Latihan Pola Bahasa Mandarin', 'ฝึกโครงสร้างภาษาจีนกลาง', '中国語表現の練習', '汉语表达练习'),
  };
  const cleanTitle = (action?.topicTitle || query || defaultTitles[effectiveLang]).trim();
  const cleanFormula = (
    action?.patternFormula ||
    lt(`Pola Inti: ${cleanTitle}`, `โครงสร้างหลัก: ${cleanTitle}`, `基本パターン: ${cleanTitle}`, `核心句型: ${cleanTitle}`)
  ).trim();
  const cleanExplanation = (
    action?.coachSpokenScript ||
    action?.explanationText ||
    lt(
      'Perhatikan pola dan penggunaannya dalam kalimat agar tuturanmu terdengar alami dan percaya diri.',
      'สังเกตโครงสร้างและวิธีใช้งานในประโยคจริง เพื่อให้คุณพูดได้เป็นธรรมชาติและมั่นใจมากขึ้น',
      '文の組み立てと自然な使い方を意識して、声に出して練習してみましょう。',
      '注意观察句型搭配与语序，大声跟读会让表达更加自然地道。'
    )
  ).trim();

  const fallbackDefaults: Record<TargetLang, { target: string; trap: string; distractors: string[]; wrongReason: string }> = {
    en: {
      target: 'I practice speaking English every day.',
      trap: 'I practice speak English every day.',
      distractors: ['is', 'practicing', 'practiced'],
      wrongReason: lt('Terkecoh! Pilihan ini memiliki susunan kata yang kurang tepat.', 'ยังไม่ใช่คำตอบที่ถูก ประโยคนี้โครงสร้างยังไม่ถูกต้อง'),
    },
    ja: {
      target: '毎日日本語で話す練習をします。',
      trap: '毎日日本語で話します練習です。',
      distractors: ['を', 'に', 'で'],
      wrongReason: lt('Kurang alami! Perhatikan kata sambung & partikel bahasa Jepang.', 'ยังไม่เป็นธรรมชาติ ลองสังเกตคำช่วยและรูปกริยาภาษาญี่ปุ่นอีกครั้ง'),
    },
    zh: {
      target: '我每天在家里练习说汉语。',
      trap: '我每天练习说汉语在家里。',
      distractors: ['在', '了', '的'],
      wrongReason: lt('Urutan kata kurang tepat! Ingat lokasi diletakkan sebelum kata kerja.', 'ลำดับคำยังไม่ถูก อย่าลืมว่าสถานที่ในภาษาจีนวางไว้หน้ากริยา'),
    },
  };

  const langFallback = fallbackDefaults[effectiveLang] || fallbackDefaults.en;
  const candidateTarget = (action?.drillTargetSentence || action?.sampleTarget || '').trim();
  const useCandidateTarget =
    candidateTarget.length > 0 &&
    (effectiveLang === 'en' ? !/練習|汉语/.test(candidateTarget) : isTargetSentenceForRuby(candidateTarget, effectiveLang));

  const rightWordCandidate =
    !useCandidateTarget &&
    action?.rightWord &&
    action.rightWord.trim() &&
    action.rightWord.trim() !== 'bentuk tepat' &&
    (effectiveLang === 'en' ? !/練習|汉语/.test(action.rightWord) : isTargetSentenceForRuby(action.rightWord, effectiveLang))
      ? action.rightWord.trim()
      : '';

  const topicInlineCandidate =
    !useCandidateTarget && !rightWordCandidate && effectiveLang !== 'en' && isTargetSentenceForRuby(query, effectiveLang)
      ? (query.match(/[\u3040-\u30ff\u3400-\u9fffー。？！]+/)?.[0] || '').trim()
      : '';

  const targetSent = (
    useCandidateTarget
      ? candidateTarget
      : rightWordCandidate || (topicInlineCandidate.length >= 3 ? topicInlineCandidate : langFallback.target)
  ).trim();
  const rawTrap = (action?.drillTrapSentence || action?.trapWrongSentence || '').trim();
  const trapSent =
    rawTrap && (effectiveLang === 'en' || isTargetSentenceForRuby(rawTrap, effectiveLang))
      ? rawTrap
      : action?.wrongWord && effectiveLang !== 'en' && isTargetSentenceForRuby(action.wrongWord, effectiveLang)
        ? action.wrongWord.trim()
        : langFallback.trap;

  const targetLiveMeta = translateAndPhoneticizeLiveText(targetSent, effectiveLang, undefined, undefined, undefined, { locale: loc });
  const rawTargetMeaning =
    loc === 'th' ? targetLiveMeta.translationTh || '' : targetLiveMeta.translationId || '';
  const targetMeaning =
    rawTargetMeaning && !/^Pahami makna|^ทำความเข้าใจ|^arti kalimat|^arti pola/i.test(rawTargetMeaning)
      ? rawTargetMeaning
      : '';
  const targetReading = resolveUnifiedPronunciation(targetSent, effectiveLang, undefined, loc) || '';

  const words = tokenizeSentenceIntoBlocks(targetSent, effectiveLang);
  const midIdx = Math.max(0, Math.min(words.length - 1, Math.floor(words.length / 2)));
  const blankWord = words[midIdx] || words[0] || (effectiveLang === 'ja' ? 'を' : effectiveLang === 'zh' ? '在' : 'practice');
  const blockPool = [...words];
  if (words.length > 2) {
    const extraToken = langFallback.distractors.find((d) => !blockPool.includes(d)) || langFallback.distractors[0];
    if (extraToken) blockPool.push(extraToken);
  }
  const clozeChips = Array.from(
    new Set([blankWord, ...langFallback.distractors].filter(Boolean))
  ).slice(0, 3);

  const hasCustomContrast = Boolean(
    action?.wrongWord &&
      action?.rightWord &&
      action.wrongWord.trim() &&
      action.rightWord.trim() &&
      action.wrongWord.trim() !== action.rightWord.trim() &&
      action.rightWord !== 'bentuk tepat'
  );

  return {
    contextMode: hasCustomContrast ? 'confusing_pair' : 'standard_clarity',
    topicTitle: cleanTitle,
    patternFormula: cleanFormula,
    coachExplanation: cleanExplanation,
    standardTarget: {
      text: targetSent,
      reading: targetReading,
      translation: targetMeaning,
    },
    ...(hasCustomContrast
      ? {
          pairData: {
            termA: action!.wrongWord!.trim(),
            descA: lt('Bentuk yang perlu diperbaiki', 'รูปแบบที่ควรปรับให้เป็นธรรมชาติ'),
            colorA: '#FDE8E4',
            termB: action!.rightWord!.trim(),
            descB: lt('Bentuk alami yang disarankan', 'รูปแบบที่ถูกต้องและเป็นธรรมชาติ'),
            colorB: '#E6F4EA',
            keyAnalogy: cleanFormula,
          },
        }
      : {}),
    quiz: {
      prompt:
        action?.drillMeaningPrompt ||
        lt(`Manakah kalimat yang BENAR untuk "${cleanTitle}"?`, `ประโยคใดถูกต้องสำหรับ "${cleanTitle}"?`),
      options: [
        { id: 'opt_1', text: targetSent, isCorrect: true, feedback: ui.correctFeedback },
        { id: 'opt_2', text: trapSent, isCorrect: false, feedback: action?.trapWrongReason || langFallback.wrongReason },
      ],
      cloze: {
        prefix: joinTokensForTarget(words.slice(0, midIdx), effectiveLang),
        blankWord,
        suffix: joinTokensForTarget(words.slice(midIdx + 1), effectiveLang),
        chips: clozeChips,
        feedback: ui.clozeCorrectFeedback,
      },
      blocks: {
        correctOrder: words,
        pool: [...blockPool].sort((a, b) => a.localeCompare(b)),
        meaningId: targetMeaning
          ? lt(`Susun kata menjadi: "${targetMeaning}"`, `เรียงคำเป็น: "${targetMeaning}"`)
          : ui.blocksInstruction,
        feedback: ui.blocksCorrectFeedback,
      },
    },
  };
}

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
            className="w-7 h-7 rounded-lg bg-white/15 hover:bg-white/25 disabled:opacity-40 text-xs font-black flex items-center justify-center cursor-pointer"
            title="Halaman sebelumnya"
          >
            &lt;
          </button>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-white/80">
              Papan Taktis OTAFF Ver 5.1 · Hal. {activePage} / {totalPages}
            </div>
            <div className="text-xs sm:text-sm font-black leading-snug break-words">
              {plan.pageObj?.title || `Halaman ${activePage}`}
            </div>
          </div>
          <button
            type="button"
            onClick={() => handleSelectPage(activePage + 1)}
            disabled={activePage >= totalPages}
            className="w-7 h-7 rounded-lg bg-white/15 hover:bg-white/25 disabled:opacity-40 text-xs font-black flex items-center justify-center cursor-pointer"
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
            <div className="text-sm font-black text-[#231A12]">{activeStep.title}</div>
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
                <span className="px-2 py-0.5 rounded-md bg-[#8C2233] text-white text-[9.5px] font-black tracking-wide">
                  {tip.badge}
                </span>
                <span className="text-xs font-black text-[#231A12]">{tip.title}</span>
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
                    <span className="font-black text-[#231A12]">{g.term}: </span>
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
                        className="font-black text-[#231A12]"
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
                        Dengar
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
              className="text-xs font-black text-[#231A12] leading-snug"
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
                      <span className="font-black text-[#8C2233] shrink-0">{opt.letter}.</span>
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
                <div className="font-black">
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
  onActiveQuestionChange?: (info: {
    questionId: string;
    title: string;
    targetText: string;
  }) => void;
}> = ({ data, onSpeakPreview, onActiveQuestionChange }) => {
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

  useEffect(() => {
    if (onActiveQuestionChange && activeQuestion) {
      const targetSummary = [
        activeQuestion.title,
        (activeQuestion.keywords || []).slice(0, 6).join(', '),
        activeQuestion.dataSummary?.highest,
        activeQuestion.dataSummary?.lowest,
      ]
        .filter(Boolean)
        .join(' | ');
      onActiveQuestionChange({
        questionId: activeQuestion.id,
        title: activeQuestion.title,
        targetText: targetSummary,
      });
    }
  }, [activeQuestion.id, activeQuestion.title]);

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
      <div className="flex flex-col gap-2.5 min-w-0 max-w-full">
        <div className="flex items-center justify-between gap-1.5 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full bg-[#E6F4EA] text-[#1B5E34] text-[10.5px] font-extrabold uppercase tracking-wide">
              PTE Academic • Describe Image
            </span>
            <span className="px-2 py-0.5 rounded-full bg-[#FEF3C4] text-[#92400E] text-[10px] font-bold">
              🔥 {activeQuestion.examFrequency}
            </span>
          </div>
          <span className="text-[10px] text-[#8C7760] font-semibold">
            {activeQuestion.sourceOrigin}
          </span>
        </div>

        {/* Category Filter Pills */}
        <div className="w-full max-w-full min-w-0 flex flex-wrap sm:flex-nowrap items-center gap-1 sm:overflow-x-auto pb-1 bg-[#FAF4E8] p-1.5 rounded-2xl scrollbar-none">
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
              className="px-2.5 py-1 rounded-lg bg-[#FAF4E8] hover:bg-[#F3EBE0] text-[#5C4A38] text-[10.5px] font-black cursor-pointer active:scale-95 transition-all"
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
              className="px-2.5 py-1 rounded-lg bg-[#FAF4E8] hover:bg-[#F3EBE0] text-[#5C4A38] text-[10.5px] font-black cursor-pointer active:scale-95 transition-all flex items-center gap-1"
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
          <h4 className="text-xs font-black text-[#231A12] leading-tight">
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
                      <span className="px-1.5 py-0.5 rounded-md bg-white/70 text-[9.5px] font-black uppercase text-[#231A12]">
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
              <span className="text-[9.5px] font-black px-2 py-0.5 rounded-md bg-[#E6F4EA] text-[#1B5E34]">
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
                  <div className="text-[11.5px] font-black" style={{ color: reg.color }}>
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
                    <th key={hIdx} className="px-2.5 py-1.5 font-black text-[#231A12] text-[10px] uppercase tracking-wider">
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
                <span className="text-[9.5px] font-bold text-[#8C7760] uppercase tracking-wider">Waktu Persiapan</span>
                <div className="text-lg font-black text-[#231A12] my-0.5">
                  {prepSeconds} <span className="text-[10px] font-semibold text-[#8C7760]">detik</span>
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
                  {isPrepRunning ? 'Pause' : prepSeconds === 0 ? 'Reset' : 'Mulai (25d)'}
                </button>
              </div>

              {/* Speaking Timer (40s) */}
              <div className="p-2.5 rounded-xl bg-[#FAF6EE] border border-[#EADBCE] flex flex-col items-center justify-center text-center">
                <span className="text-[9.5px] font-bold text-[#8C7760] uppercase tracking-wider">Waktu Rekam Bicara</span>
                <div className={`text-lg font-black my-0.5 ${speakSeconds <= 10 ? 'text-[#DC2626]' : 'text-[#231A12]'}`}>
                  {speakSeconds} <span className="text-[10px] font-semibold text-[#8C7760]">detik</span>
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
                  {isSpeakRunning ? 'Stop' : speakSeconds === 0 ? 'Reset' : 'Mulai Bicara (40d)'}
                </button>
              </div>
            </div>

            {/* Optimal Green Zone Indicator (Nakul Masterclass 25-28s Rule) */}
            <div className="p-2 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <span className="text-sm">⚡</span>
                <span className="text-[10.5px] font-bold text-[#065F46]">
                  Zona Berhenti Ideal: <strong className="font-black text-[#047857]">25–28 Detik!</strong>
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-md bg-[#059669] text-white text-[9px] font-black uppercase">
                Oral Fluency 90
              </span>
            </div>

            {/* Pearson 3-Second Rule Warning Banner */}
            <div className="p-2 rounded-xl bg-[#FEF2F2] border border-[#FCA5A5] flex items-start gap-1.5">
              <span className="text-base select-none shrink-0 leading-none mt-0.5">⚠️</span>
              <p className="text-[10px] text-[#991B1B] font-semibold leading-snug">
                <span className="font-bold">Aturan 3 Detik Pearson:</span> Jangan hening &gt;3 detik! Mikrofon akan otomatis tertutup dan skor Fluency dinilai 0.
              </p>
            </div>
          </div>

          {/* CHECKLIST KATA KUNCI TARGET */}
          <div className="p-3 rounded-2xl bg-[#FFFDF8] border border-[#EADBCE] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[#8C7760] uppercase tracking-wider block">
                Checklist Kata Kunci (Ketuk saat diucapkan):
              </span>
              <span className="text-[10px] font-bold text-[#B45309]">
                {Object.values(checkedKeywords).filter(Boolean).length} / {activeQuestion.keywords.length} terucap
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
                <span className="text-xs font-black text-[#231A12]">
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
              <span className="text-xs font-black text-[#1E40AF]">
                Trik & Tips Rahasia Lulus PTE 42 (Dr. Julian Insider Hacks)
              </span>
            </div>

            <div className="space-y-1.5 text-[10.5px] text-[#1E3A8A] leading-snug">
              <div className="p-2 rounded-xl bg-[#DBEAFE]/40 border border-[#BFDBFE] flex items-start gap-1.5">
                <span className="font-bold text-blue-700 shrink-0">⚡ Hack 25–28 Detik:</span>
                <span>Jangan bicara sampai 40 detik! Selesaikan baris ke-5 pada detik 25–28 lalu langsung klik Next. Skor Oral Fluency akan di-cap maksimal (90)!</span>
              </div>
              <div className="p-2 rounded-xl bg-[#DBEAFE]/40 border border-[#BFDBFE] flex items-start gap-1.5">
                <span className="font-bold text-blue-700 shrink-0">🎯 Nada Monoton:</span>
                <span>Gunakan pitch suara datar stabil (135–145 Hz). Pearson AI menyukai irama konsisten tanpa lonjakan nada dramatis.</span>
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
}> = ({ data, onSpeakPreview, latestAlignment, onActiveQuestionChange }) => {
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
                className="px-2.5 py-1 rounded-lg bg-[#FAF4E8] hover:bg-[#F3EBE0] text-[#5C4A38] text-[10.5px] font-black cursor-pointer active:scale-95 transition-all"
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
                className="px-2.5 py-1 rounded-lg bg-[#FAF4E8] hover:bg-[#F3EBE0] text-[#5C4A38] text-[10.5px] font-black cursor-pointer active:scale-95 transition-all flex items-center gap-1"
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
          <h4 className="text-xs font-black text-[#231A12] leading-tight">
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
                <span className="text-[10px] font-black text-[#B45309]">
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
                      <span className="inline-flex items-center mx-1 px-1.5 py-0.5 rounded-md bg-[#FDE8E4] text-[#B85D43] font-black text-[10px] select-none">
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
                      {latestAlignment.passed ? '✓ Pelafalan Sesuai Target' : '✕ Perbaiki Pengucapan & Kata'}
                    </span>
                    <span>
                      {Math.round(latestAlignment.wordAccuracy * 100)}% Kata •{' '}
                      {Math.round(latestAlignment.phoneticAccuracy * 100)}% Fonetik
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
                            ? 'Terlewat saat membaca'
                            : tok.heard
                              ? `Terdengar: "${tok.heard}"`
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
                  <span className="text-[9.5px] font-bold text-[#8C7760] uppercase tracking-wider">Waktu Persiapan</span>
                  <div className="text-lg font-black text-[#231A12] my-0.5">
                    {prepSeconds} <span className="text-[10px] font-semibold text-[#8C7760]">detik</span>
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
                    {isPrepRunning ? 'Pause' : prepSeconds === 0 ? 'Reset' : 'Mulai (35d)'}
                  </button>
                </div>

                {/* Speaking Timer (40s) */}
                <div className="p-2.5 rounded-xl bg-[#FAF6EE] border border-[#EADBCE] flex flex-col items-center justify-center text-center">
                  <span className="text-[9.5px] font-bold text-[#8C7760] uppercase tracking-wider">Waktu Rekam Bicara</span>
                  <div className={`text-lg font-black my-0.5 ${speakSeconds <= 10 ? 'text-[#DC2626]' : 'text-[#231A12]'}`}>
                    {speakSeconds} <span className="text-[10px] font-semibold text-[#8C7760]">detik</span>
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
                    {isSpeakRunning ? 'Stop' : speakSeconds === 0 ? 'Reset' : 'Mulai Bicara (40d)'}
                  </button>
                </div>
              </div>

              {/* Pacing Speedometer Alert (khusus PTE) */}
              <div className="p-2 rounded-xl bg-[#FAF6EE] border border-[#EADBCE] flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">⏱️</span>
                  <div>
                    <span className="text-xs font-bold text-[#231A12] block">Pacing Konsisten (120 - 140 WPM)</span>
                    <span className="text-[9.5px] text-[#8C7760]">Tarik nafas pendek hanya pada tanda jeda //</span>
                  </div>
                </div>
                <div className="px-2 py-1 rounded-lg bg-[#E6F4EA] text-[#1B5E34] text-[10px] font-black shrink-0">
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
              Titik Kritis Artikulasi & Pelafalan:
            </span>
            <div className="grid grid-cols-1 gap-2">
              {activeQuestion.phoneticFocus.map((p, idx) => (
                <div
                  key={idx}
                  className="p-2 rounded-xl bg-[#FAF6EE] border border-[#EADBCE] flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-black text-[#231A12]">{p.word}</span>
                    <span className="text-[10px] font-mono font-bold text-[#B45309]">{p.ipa}</span>
                  </div>
                  <p className="text-[9.5px] text-[#5C4A38] mt-1 leading-snug">{p.tip}</p>
                  {onSpeakPreview && (
                    <button
                      type="button"
                      onClick={() => onSpeakPreview(p.word)}
                      className="mt-1 text-left text-[9.5px] font-bold text-[#B85D43] hover:underline cursor-pointer"
                    >
                      🔊 Tes dengar suku kata
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
                <span className="text-xs font-black text-[#1E40AF]">
                  Trik & Tips Rahasia Lulus PTE 42 Read Aloud
                </span>
              </div>

              <div className="space-y-1.5 text-[10.5px] text-[#1E3A8A] leading-snug">
                <div className="p-2 rounded-xl bg-[#DBEAFE]/40 border border-[#BFDBFE] flex flex-col gap-1">
                  <span className="font-bold text-blue-700">⚡ Trik 1-Kalimat APEUni (One-Sentence Hack):</span>
                  <span>{activeQuestion.oneSentenceHack}</span>
                </div>
                <div className="p-2 rounded-xl bg-[#DBEAFE]/40 border border-[#BFDBFE] flex items-start gap-1.5">
                  <span className="font-bold text-blue-700 shrink-0">🎯 Monotone Pitch:</span>
                  <span>Pertahankan nada datar 135–145 Hz. Pearson acoustic engine mendeteksi kelancaran konstan dengan skor kelancaran tertinggi.</span>
                </div>
                <div className="p-2 rounded-xl bg-[#DBEAFE]/40 border border-[#BFDBFE] flex items-start gap-1.5">
                  <span className="font-bold text-blue-700 shrink-0">💨 Jeda 0.3 Detik:</span>
                  <span>Ambil nafas pendek di tanda // tanpa menghela nafas keras di mikrofon.</span>
                </div>
                {activeQuestion.examinerTips && (
                  <div className="p-2 rounded-xl bg-white/70 border border-[#BFDBFE] flex items-start gap-1.5 text-[#1E3A8A]">
                    <span className="font-bold text-amber-700 shrink-0">📌 Tips Penguji:</span>
                    <span>{activeQuestion.examinerTips}</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-[#FFFDF8] border border-[#EADBCE] shadow-2xs space-y-2">
              <div className="flex items-center gap-1.5 pb-1 border-b border-[#F0E6D9]">
                <span className="text-sm">📖</span>
                <span className="text-xs font-black text-[#231A12]">
                  Panduan Baca Nyaring & Evaluasi AI
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
                    <span className="font-bold block">Terjemahan:</span>
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
          className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-black uppercase ${
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
          <span className="text-2xl font-black text-[#231A12] leading-none">
            {hasSample ? data.compositeScore : '--'}
          </span>
          <span className="text-[9px] font-bold text-[#8C7760]">/ 90</span>
        </div>
        <div className="space-y-1.5">
          <h4 className="text-xs font-black text-[#231A12]">Pearson Academic Concordance</h4>
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
 * KOMPONEN UTAMA KANVAS ADAPTIF KAWAN BICARA
 * Desain Minimalis, Elegan, Anti-AI-Slop, Palet Pastel Lembut FIEZEL.
 */
export const InCallLearningWorkbenchModal: React.FC<InCallLearningWorkbenchProps> = ({
  isOpen,
  onClose,
  locale,
  targetLang,
  scenario,
  persona,
  isLiveConnected,
  topicTitle,
  focusType,
  patternFormula,
  sampleTarget,
  uiAction,
  isGeneratingTopic,
  onSpeakPreview,
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
  onActiveBoardSync,
}) => {
  const [boardState, setBoardState] = useState<DynamicBoardState | null>(null);
  const [quizMode, setQuizMode] = useState<WorkbenchQuizMode>(forcedExerciseMode || 'multiple_choice');
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [clozeAnswer, setClozeAnswer] = useState<string | null>(null);
  const [placedBlocks, setPlacedBlocks] = useState<string[]>([]);
  const [isQuizCompleted, setIsQuizCompleted] = useState<boolean>(false);
  const [isReady, setIsReady] = useState<boolean>(false);
  const [quizSeed, setQuizSeed] = useState<number>(externalQuizSeed ?? 0);
  const [isMinimized, setIsMinimized] = useState<boolean>(initialMinimized ?? false);
  const lastOpenNonceRef = useRef<number | undefined>(openNonce);

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
    }
  }, [externalQuizSeed]);

  useEffect(() => {
    if (forcedExerciseMode && forcedExerciseMode !== quizMode) {
      setQuizMode(forcedExerciseMode);
      setSelectedOptionId(null);
      setClozeAnswer(null);
      setPlacedBlocks([]);
      setIsQuizCompleted(false);
    }
  }, [forcedExerciseMode]);

  const onSpeakPreviewRef = useRef(onSpeakPreview);
  onSpeakPreviewRef.current = onSpeakPreview;
  const onActiveBoardSyncRef = useRef(onActiveBoardSync);
  onActiveBoardSyncRef.current = onActiveBoardSync;
  const lastSpokenKeyRef = useRef<string>('');

  const ui = getWorkbenchUiStrings(locale);

  // Close popup cleanly via Escape key on desktop
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') {
        ev.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  // Identifikasi kunci soal saat ini
  const currentKey = `${uiAction?.focusType || focusType || ''}::${uiAction?.bankTopicId || ''}::${uiAction?.topicTitle || topicTitle || ''}::${uiAction?.wrongWord || ''}::${uiAction?.sampleTarget || ''}::${quizSeed}`;
  const lastKeyRef = useRef<string>('');

  // SIKLUS HIDUP STATE BERSIH (PEMBERANTAS MUTLAK GHOST ANSWER BUG)
  useEffect(() => {
    if (!isOpen) {
      setBoardState(null);
      setSelectedOptionId(null);
      setClozeAnswer(null);
      setPlacedBlocks([]);
      setIsQuizCompleted(false);
      setIsReady(false);
      setIsMinimized(false);
      lastKeyRef.current = '';
      lastSpokenKeyRef.current = '';
      return;
    }

    // JIKA TOPIK BERGANTI SELAGI MODAL TERBUKA: BERSIHKAN JAWABAN LAMA SEKETIKA!
    if (lastKeyRef.current && lastKeyRef.current !== currentKey) {
      setSelectedOptionId(null);
      setClozeAnswer(null);
      setPlacedBlocks([]);
      setIsQuizCompleted(false);
      setIsMinimized(false);
    }
    lastKeyRef.current = currentKey;

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
    const query = (effectiveAction?.topicTitle || topicTitle || '').trim();
    const isPteSessionModal = Boolean(
      scenario?.id?.startsWith('scen_pte') ||
      persona?.id === 'dr_julian' ||
      scenario?.personaId === 'dr_julian'
    );
    const hasRich =
      hasRichDynamicAction(effectiveAction) ||
      focusType === 'read_aloud' ||
      Boolean(focusType?.startsWith('pte_')) ||
      isSswPersonaModal;

    const previewDerived = deriveContextualPedagogicalBoard(
      effectiveAction,
      query,
      targetLang,
      locale,
      quizSeed,
      latestPteDiagnostic,
      isPteSessionModal
    );

    if (hasRich || previewDerived.contextMode !== 'standard_clarity' || !isGeneratingTopic) {
      setBoardState(previewDerived);
      setIsReady(true);
      return;
    }

    setIsReady(false);
    const timer = setTimeout(() => {
      const derived = deriveContextualPedagogicalBoard(
        effectiveAction,
        query,
        targetLang,
        locale,
        quizSeed,
        latestPteDiagnostic,
        isPteSessionModal
      );
      setBoardState(derived);
      setIsReady(true);
    }, 1500);

    return () => clearTimeout(timer);
  }, [isOpen, currentKey, topicTitle, focusType, patternFormula, sampleTarget, uiAction, targetLang, locale, isGeneratingTopic, quizSeed, latestPteDiagnostic, scenario, persona]);

  // Handler Suara Guru & Sinkronisasi Target Layar -> AI Live
  useEffect(() => {
    if (!isOpen || !isReady || !boardState) return;
    if (
      onActiveBoardSyncRef.current &&
      boardState.contextMode !== 'pte_read_aloud' &&
      boardState.contextMode !== 'read_aloud' &&
      boardState.contextMode !== 'pte_describe_image'
    ) {
      const targetText =
        boardState.pteReadAloudData?.passageText ||
        boardState.pteChartData?.title ||
        boardState.pairData?.termB ||
        boardState.ribbonSegments?.map((s) => s.word).join(' ') ||
        boardState.characterData?.char ||
        boardState.toneData?.word ||
        boardState.topicTitle ||
        '';
      onActiveBoardSyncRef.current({
        contextMode: boardState.contextMode,
        topicTitle: boardState.topicTitle,
        activeTargetText: targetText,
      });
    }
    if (boardState.coachExplanation && onSpeakPreviewRef.current) {
      const key = `${boardState.topicTitle}::${boardState.coachExplanation}`;
      if (lastSpokenKeyRef.current !== key) {
        lastSpokenKeyRef.current = key;
        if (!isLiveConnected) {
          const locCode = String(locale || 'id').toLowerCase().split(/[-_]/)[0];
          onSpeakPreviewRef.current(boardState.coachExplanation, locCode);
        }
      }
    }
  }, [isOpen, isReady, boardState, isLiveConnected, locale]);

  if (!isOpen) return null;

  // Interaksi 1: Pilihan Ganda 3 Opsi
  const handleSelectOption = (optId: string) => {
    if (!boardState) return;
    setSelectedOptionId(optId);
    const opt = boardState.quiz.options.find((o) => o.id === optId);
    if (opt?.isCorrect) {
      playFiezelSfx('answer_correct');
      setIsQuizCompleted(true);
      if (onEvaluatePractice) {
        onEvaluatePractice(opt.text, opt.text, boardState.patternFormula, { isQuizSuccess: true });
      }
    } else {
      playFiezelSfx('answer_wrong');
      if (onEvaluatePractice && opt) {
        onEvaluatePractice(
          opt.text,
          boardState.quiz.options.find((o) => o.isCorrect)?.text || boardState.topicTitle,
          boardState.patternFormula,
          { isQuizSuccess: false, isQuizFailure: true }
        );
      }
    }
  };

  // Interaksi 2: Isian Rumpang (Cloze)
  const isClozeWordMatch = (candidate: string | null | undefined, blank: string | undefined) => {
    if (!candidate || !blank) return false;
    return candidate.replace(/\s+/g, '').toLowerCase() === blank.replace(/\s+/g, '').toLowerCase();
  };

  const handleSelectClozeChip = (word: string) => {
    if (!boardState || isQuizCompleted) return;
    setClozeAnswer(word);
    const isCorrect = isClozeWordMatch(word, boardState.quiz.cloze.blankWord);
    if (isCorrect) {
      playFiezelSfx('answer_correct');
      setIsQuizCompleted(true);
      if (onEvaluatePractice) {
        const full = joinTokensForTarget(
          [boardState.quiz.cloze.prefix, word, boardState.quiz.cloze.suffix],
          targetLang
        );
        onEvaluatePractice(full, full, boardState.patternFormula, { isQuizSuccess: true });
      }
    } else {
      playFiezelSfx('answer_wrong');
      if (onEvaluatePractice) {
        const attempted = joinTokensForTarget(
          [boardState.quiz.cloze.prefix, word, boardState.quiz.cloze.suffix],
          targetLang
        );
        const expected = joinTokensForTarget(
          [boardState.quiz.cloze.prefix, boardState.quiz.cloze.blankWord, boardState.quiz.cloze.suffix],
          targetLang
        );
        onEvaluatePractice(attempted, expected, boardState.patternFormula, {
          isQuizSuccess: false,
          isQuizFailure: true,
        });
      }
    }
  };

  // Interaksi 3: Susun Balok Kata (Sentence Blocks)
  const normalizeBlocksForComparison = (tokens: string[]) => {
    if (targetLang === 'ja' || targetLang === 'zh') {
      return tokens.join('').replace(/[\s。？！、.,?!]+/g, '').toLowerCase();
    }
    return tokens.join(' ').replace(/\s+/g, ' ').trim().toLowerCase();
  };

  const handleAddBlock = (word: string) => {
    if (isQuizCompleted) return;
    playFiezelSfx('button_tap');
    const nextBlocks = [...placedBlocks, word];
    setPlacedBlocks(nextBlocks);

    if (nextBlocks.length === boardState?.quiz.blocks.correctOrder.length) {
      const normPlaced = normalizeBlocksForComparison(nextBlocks);
      const normTarget = normalizeBlocksForComparison(boardState.quiz.blocks.correctOrder);
      if (normPlaced === normTarget) {
        playFiezelSfx('answer_correct');
        setIsQuizCompleted(true);
        if (onEvaluatePractice) {
          onEvaluatePractice(
            joinTokensForTarget(nextBlocks, targetLang),
            joinTokensForTarget(boardState.quiz.blocks.correctOrder, targetLang),
            boardState.patternFormula,
            { isQuizSuccess: true }
          );
        }
      } else {
        playFiezelSfx('answer_wrong');
        if (onEvaluatePractice) {
          onEvaluatePractice(
            joinTokensForTarget(nextBlocks, targetLang),
            joinTokensForTarget(boardState.quiz.blocks.correctOrder, targetLang),
            boardState.patternFormula,
            { isQuizSuccess: false, isQuizFailure: true }
          );
        }
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

    if (onRequestCustomTopic) {
      onRequestCustomTopic(`Soal latihan baru tentang ${topicTitle}`, 'custom_dynamic');
    }
  };

  const handleReplayVoice = () => {
    if (boardState?.coachExplanation && onSpeakPreview) {
      const locCode = String(locale || 'id').toLowerCase().split(/[-_]/)[0];
      onSpeakPreview(boardState.coachExplanation, locCode);
    }
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
        className="fixed bottom-24 left-3 right-3 sm:left-auto sm:right-4 z-50 max-w-[calc(100vw-24px)] sm:max-w-sm sm:w-full rounded-2xl bg-[#FFFDF8]/95 border-2 border-[#EADBCE] shadow-2xl backdrop-blur-md p-3 flex flex-col gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200"
        data-testid="in-call-workbench-minimized"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse shrink-0" />
            <span className="text-[10px] font-extrabold uppercase tracking-wide text-[#B85D43] bg-[#FDE8E4] px-1.5 py-0.2 rounded-full shrink-0">
              {ui.minimizedBadge}
            </span>
            <span className="text-xs font-bold text-[#231A12] truncate">
              {boardState?.topicTitle || topicTitle || ui.badge}
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              data-testid="workbench-restore-btn"
              onClick={() => {
                playFiezelSfx('button_tap');
                setIsMinimized(false);
              }}
              className="px-2 py-0.5 rounded-lg bg-[#FAF4E8] hover:bg-[#F3EBE0] text-[#5C4A38] text-[11px] font-bold cursor-pointer border border-[#EADBCE]"
              title={ui.openBtn}
            >
              {ui.openBtn}
            </button>
            <button
              type="button"
              data-testid="workbench-minimized-close-btn"
              onClick={onClose}
              className="w-6 h-6 rounded-full bg-[#F3EBE0] hover:bg-[#EADBCE] text-[#5C4A38] text-[11px] font-bold flex items-center justify-center cursor-pointer"
              title={ui.closeTitle}
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

  const resolvedTitle = boardState?.topicTitle || topicTitle || ui.badge;
  const resolvedEffectiveLang: TargetLang =
    targetLang === 'ja' || /[\u3040-\u30ff]/.test(`${resolvedTitle} ${boardState?.quiz?.options?.[0]?.text || ''}`)
      ? 'ja'
      : targetLang === 'zh' || containsHanzi(`${resolvedTitle} ${boardState?.quiz?.options?.[0]?.text || ''}`)
        ? 'zh'
        : targetLang;
  const isClozeCorrect = Boolean(
    boardState && isClozeWordMatch(clozeAnswer, boardState.quiz.cloze.blankWord)
  );
  const titleHasCjk =
    resolvedEffectiveLang !== 'en' && isTargetSentenceForRuby(resolvedTitle, resolvedEffectiveLang);

  const isGeneralReadAloudCanvas =
    boardState?.contextMode === 'read_aloud' ||
    focusType === 'read_aloud' ||
    uiAction?.focusType === 'read_aloud';

  const isWidePteCanvas =
    isGeneralReadAloudCanvas ||
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

  const isSswTacticalBoard =
    boardState?.contextMode === 'ssw_tactical_board' ||
    focusType === 'ssw_tactical_board' ||
    uiAction?.focusType === 'ssw_tactical_board' ||
    persona?.id === 'ssw_sensei' ||
    scenario?.personaId === 'ssw_sensei' ||
    Boolean(scenario?.id?.startsWith('scen_ssw_'));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#1C1611]/60 backdrop-blur-sm animate-in fade-in duration-200"
      data-testid="in-call-learning-workbench"
    >
      <div className={`w-full ${isGeneralReadAloudCanvas ? 'max-w-3xl' : isWidePteCanvas ? 'max-w-5xl xl:max-w-6xl' : isSswTacticalBoard ? 'max-w-3xl' : 'max-w-lg'} rounded-[28px] bg-[#FDFAF4] border ${isSswTacticalBoard ? 'border-[#DECFAF]' : 'border-[#EADBCE]'} shadow-[0_20px_50px_rgba(28,22,17,0.18)] overflow-hidden flex flex-col max-h-[92vh]`}>
        {/* HEADER MINIMALIS PASTEL FIEZEL */}
        <div className={`px-5 py-3.5 ${isSswTacticalBoard ? 'bg-[#FCF6EE] border-[#E6D5BD]' : 'bg-[#FBF8F1] border-[#F0E6D9]'} border-b flex items-center justify-between gap-2 shrink-0`}>
          <div className="min-w-0 flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase w-fit ${isSswTacticalBoard ? 'bg-[#FCECED] text-[#8C2233]' : 'bg-[#FDE8E4] text-[#B85D43]'}`}>
                {isSswTacticalBoard ? 'Papan Taktis SSW' : ui.badge}
              </span>
              <h3 className="text-xs sm:text-sm font-extrabold text-[#231A12] leading-tight line-clamp-2" data-testid="workbench-topic-title">
                {titleHasCjk ? (
                  <JapaneseRubyDisplay
                    as="span"
                    text={resolvedTitle}
                    targetLang={resolvedEffectiveLang}
                    showFurigana={true}
                    showRomaji={isMostlyTargetPhrase(resolvedTitle, resolvedEffectiveLang)}
                  />
                ) : (
                  resolvedTitle
                )}
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
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
              —
            </button>
            <button
              type="button"
              onClick={onClose}
              data-testid="workbench-close-btn"
              className="w-8 h-8 rounded-full bg-[#F3EBE0] hover:bg-[#EADBCE] text-[#5C4A38] font-bold text-xs flex items-center justify-center cursor-pointer shrink-0 transition-transform active:scale-90"
              title={ui.closeTitle}
            >
              ✕
            </button>
          </div>
        </div>

        {/* JIKA SEDANG MERACIK MATERI: ANIMASI ORGANIK MINIMALIS */}
        {!isReady && (
          <div data-testid="workbench-buffering-state" className="p-8 flex flex-col items-center justify-center text-center space-y-4 min-h-[280px]">
            <div className="relative w-16 h-16 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-[#FDE8E4] animate-ping opacity-75" />
              <div className="relative w-14 h-14 rounded-2xl bg-[#FFF9F5] border border-[#F5D5CE] flex items-center justify-center shadow-xs">
                <span className="text-2xl select-none">✨</span>
              </div>
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-extrabold text-[#231A12] tracking-tight">
                {ui.preparingTitle}
              </h3>
              <p className="text-xs text-[#8C7760] max-w-[220px] leading-relaxed">
                {ui.preparingSub}
              </p>
            </div>
          </div>
        )}

        {/* JIKA MATERI SIAP: KANVAS ADAPTIF & LATIHAN MULTI-MODE */}
        {isReady && boardState && (
          <div className="p-4 sm:p-5 space-y-4 overflow-y-auto">
            {/* -------------------------------------------------------------
                KANVAS 1: DUAL-STREAM CONTRAST (UNTUK CONFUSING PAIR)
            ------------------------------------------------------------- */}
            {boardState.contextMode === 'confusing_pair' && boardState.pairData && (
              <div className="space-y-2.5" data-testid="wb-confusing-pair-canvas">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Sisi A */}
                  <div className="p-3 rounded-2xl bg-[#FFF9F2] border border-[#F0E4D3] space-y-1">
                    <span className="text-xs font-black text-[#B45309] block">
                      {isTargetSentenceForRuby(boardState.pairData.termA, resolvedEffectiveLang) ? (
                        <JapaneseRubyDisplay
                          as="span"
                          text={boardState.pairData.termA}
                          targetLang={resolvedEffectiveLang}
                          showFurigana={true}
                          showRomaji={isMostlyTargetPhrase(boardState.pairData.termA, resolvedEffectiveLang) || resolvedEffectiveLang === 'en'}
                        />
                      ) : (
                        boardState.pairData.termA
                      )}
                    </span>
                    <p className="text-[11px] font-medium text-[#5C4A38] leading-tight">{boardState.pairData.descA}</p>
                  </div>
                  {/* Sisi B */}
                  <div className="p-3 rounded-2xl bg-[#F7F9F5] border border-[#E3EBDC] space-y-1">
                    <span className="text-xs font-black text-[#2D7A4D] block">
                      {isTargetSentenceForRuby(boardState.pairData.termB, resolvedEffectiveLang) ? (
                        <JapaneseRubyDisplay
                          as="span"
                          text={boardState.pairData.termB}
                          targetLang={resolvedEffectiveLang}
                          showFurigana={true}
                          showRomaji={isMostlyTargetPhrase(boardState.pairData.termB, resolvedEffectiveLang) || resolvedEffectiveLang === 'en'}
                        />
                      ) : (
                        boardState.pairData.termB
                      )}
                    </span>
                    <p className="text-[11px] font-medium text-[#5C4A38] leading-tight">{boardState.pairData.descB}</p>
                  </div>
                </div>
                {/* Analogi Inti */}
                <div className="px-3.5 py-2 rounded-xl bg-[#FAF6EE] border border-[#EADBCE] text-[11.5px] font-semibold text-[#5C4A38] flex items-center gap-2">
                  <span className="text-amber-600 font-bold shrink-0">{ui.keyPointLabel}</span>
                  <span>{boardState.pairData.keyAnalogy}</span>
                </div>
              </div>
            )}

            {/* -------------------------------------------------------------
                KANVAS 2: PITA KALIMAT SINTAKSIS (UNTUK GRAMMAR / FORMULA)
            ------------------------------------------------------------- */}
            {boardState.contextMode === 'syntax_ribbon' && boardState.ribbonSegments && (
              <div className="space-y-2.5 p-3.5 rounded-2xl bg-[#FFFDF8] border border-[#EADBCE]" data-testid="wb-syntax-ribbon-canvas">
                <span className="text-[10px] font-bold text-[#8C7760] tracking-wider uppercase block">
                  {ui.syntaxLabel}
                </span>
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  {boardState.ribbonSegments.map((seg, idx) => (
                    <React.Fragment key={idx}>
                      <div className="px-2.5 py-1.5 rounded-xl border border-black/5 flex flex-col items-center text-center" style={{ backgroundColor: seg.tagColor }}>
                        <span className="text-[9px] font-bold text-black/60 uppercase">{seg.role}</span>
                        <span className="text-xs font-black text-[#231A12]">
                          {isTargetSentenceForRuby(seg.word, resolvedEffectiveLang) ? (
                            <JapaneseRubyDisplay
                              as="span"
                              text={seg.word}
                              targetLang={resolvedEffectiveLang}
                              showFurigana={true}
                              showRomaji={true}
                            />
                          ) : (
                            seg.word
                          )}
                        </span>
                      </div>
                      {idx < boardState.ribbonSegments!.length - 1 && (
                        <span className="text-[#8C7760] font-bold text-xs">→</span>
                      )}
                    </React.Fragment>
                  ))}
                </div>
                {boardState.pairData && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <div className="px-2.5 py-1.5 rounded-xl bg-[#FFF5F5] border border-[#FECACA] text-[11px] text-[#991B1B]">
                      <span className="text-[9.5px] font-extrabold uppercase block">{ui.wrongLabel}</span>
                      <JapaneseRubyDisplay
                        as="span"
                        text={boardState.pairData.termA}
                        targetLang={resolvedEffectiveLang}
                        showFurigana={true}
                        showRomaji={true}
                      />
                    </div>
                    <div className="px-2.5 py-1.5 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0] text-[11px] text-[#166534]">
                      <span className="text-[9.5px] font-extrabold uppercase block">{ui.rightLabel}</span>
                      <JapaneseRubyDisplay
                        as="span"
                        text={boardState.pairData.termB}
                        targetLang={resolvedEffectiveLang}
                        showFurigana={true}
                        showRomaji={true}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* -------------------------------------------------------------
                KANVAS 3: KARAKTER / RADIKAL ZEN (MAGIC CHARACTER)
            ------------------------------------------------------------- */}
            {boardState.contextMode === 'magic_character' && boardState.characterData && (
              <div className="p-3.5 rounded-2xl bg-[#FFFDF8] border border-[#EADBCE] flex items-center gap-3.5" data-testid="wb-magic-character-canvas">
                <div className="w-16 h-16 rounded-2xl bg-[#FAF4E8] border border-[#EADBCE] flex items-center justify-center text-3xl font-black text-[#231A12] shrink-0">
                  {boardState.characterData.char}
                </div>
                <div className="min-w-0 flex-1 space-y-1 text-xs">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-black text-[#B85D43]">
                      {boardState.characterData.reading || resolveUnifiedPronunciation(boardState.characterData.char, resolvedEffectiveLang, undefined, locale)}
                    </span>
                    <span className="text-[#5C4A38] font-semibold">· {boardState.characterData.meaning}</span>
                  </div>
                  <div className="text-[11px] text-[#8C7760] flex flex-wrap gap-3">
                    <span>{ui.radicalLabel}: <strong className="text-[#3D2E20]">{boardState.characterData.radical}</strong> ({boardState.characterData.radicalMeaning})</span>
                    <span>{ui.strokesLabel}: <strong className="text-[#3D2E20]">{boardState.characterData.strokesCount}</strong></span>
                  </div>
                </div>
              </div>
            )}

            {/* -------------------------------------------------------------
                KANVAS 4: KONTUR NADA & INTONASI (TONE WAVEFORM)
            ------------------------------------------------------------- */}
            {boardState.contextMode === 'tone_waveform' && boardState.toneData && (
              <div className="p-3.5 rounded-2xl bg-[#FFFDF8] border border-[#EADBCE] space-y-1.5" data-testid="wb-tone-waveform-canvas">
                <span className="text-[10px] font-bold text-[#8C7760] tracking-wider uppercase block">
                  {ui.toneShapeLabel}
                </span>
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="space-y-0.5">
                    <div className="text-base font-black text-[#231A12]">
                      <JapaneseRubyDisplay
                        as="span"
                        text={boardState.toneData.word}
                        targetLang={resolvedEffectiveLang}
                        phoneticText={boardState.toneData.phonetic || resolveUnifiedPronunciation(boardState.toneData.word, resolvedEffectiveLang, undefined, locale)}
                        showFurigana={true}
                        showRomaji={true}
                      />
                    </div>
                    <p className="text-[11px] font-semibold text-[#B45309]">{boardState.toneData.toneType} ({boardState.toneData.toneShape})</p>
                  </div>
                  {onSpeakPreview && (
                    <button
                      type="button"
                      onClick={() => onSpeakPreview(boardState.toneData!.word, resolvedEffectiveLang)}
                      className="px-2.5 py-1 rounded-lg bg-[#FAF4E8] hover:bg-[#F3EBE0] text-[#5C4A38] text-[11px] font-bold cursor-pointer"
                    >
                      🔊 {ui.listenBtn}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* -------------------------------------------------------------
                KANVAS PTE 1: DESCRIBE IMAGE (SVG CHARTS & TIMERS)
            ------------------------------------------------------------- */}
            {boardState.contextMode === 'pte_describe_image' && boardState.pteChartData && (
              <PteDescribeImageCanvas
                data={boardState.pteChartData}
                onSpeakPreview={(text) => onSpeakPreview && onSpeakPreview(text, 'en')}
                onActiveQuestionChange={(info) => {
                  onActiveBoardSyncRef.current?.({
                    contextMode: 'pte_describe_image',
                    topicTitle: info.title,
                    activeTargetText: info.targetText,
                  });
                }}
              />
            )}

            {/* -------------------------------------------------------------
                KANVAS 2: READ ALOUD (PTE & NON-PTE EN/JA/ZH)
            ------------------------------------------------------------- */}
            {(boardState.contextMode === 'pte_read_aloud' || boardState.contextMode === 'read_aloud') &&
              boardState.pteReadAloudData && (
              <PteReadAloudCanvas
                data={boardState.pteReadAloudData}
                onSpeakPreview={(text) =>
                  onSpeakPreview &&
                  onSpeakPreview(text, boardState.pteReadAloudData?.targetLang || resolvedEffectiveLang)
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

            {/* -------------------------------------------------------------
                KANVAS PTE 3: SCORECARD (PEARSON EVALUATION)
            ------------------------------------------------------------- */}
            {boardState.contextMode === 'pte_scorecard' && boardState.pteScorecardData && (
              <PteScorecardCanvas
                data={boardState.pteScorecardData}
                onSpeakPreview={(text) => onSpeakPreview && onSpeakPreview(text, 'en')}
              />
            )}

            {/* -------------------------------------------------------------
                KANVAS KHUSUS SSW SENSEI: PAPAN TAKTIS & KUIS SSW 3 OPSI
            ------------------------------------------------------------- */}
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

            {/* KANVAS STANDARD CLARITY: CONTOH KALIMAT MODEL + CARA BACA + TERJEMAHAN */}
            {boardState.contextMode === 'standard_clarity' && boardState.standardTarget?.text && (
              <div className="p-3.5 rounded-2xl bg-[#FFFDF8] border border-[#EADBCE] space-y-2" data-testid="wb-standard-clarity-canvas">
                <div className="flex items-start justify-between gap-2">
                  <JapaneseRubyDisplay
                    as="div"
                    text={boardState.standardTarget.text}
                    targetLang={resolvedEffectiveLang}
                    phoneticText={boardState.standardTarget.reading}
                    showFurigana={true}
                    showRomaji={!boardState.standardTarget.reading}
                    pronunciationTestId={!boardState.standardTarget.reading ? 'wb-standard-target-pronunciation' : undefined}
                    className="text-sm font-black text-[#231A12]"
                  />
                  {onSpeakPreview && (
                    <button
                      type="button"
                      onClick={() => onSpeakPreview(boardState.standardTarget!.text, resolvedEffectiveLang)}
                      className="px-2.5 py-1 rounded-lg bg-[#FAF4E8] hover:bg-[#F3EBE0] text-[#5C4A38] text-[10.5px] font-bold cursor-pointer shrink-0"
                    >
                      🔊 {ui.listenBtn}
                    </button>
                  )}
                </div>
                {(boardState.standardTarget.reading || boardState.standardTarget.translation) && (
                  <div className="pt-1 border-t border-[#F0E6D9] space-y-0.5 text-[11px]">
                    {boardState.standardTarget.reading && (
                      <p className="font-semibold text-[#8C6D1F]" data-testid="wb-standard-target-pronunciation">
                        <span className="font-bold text-[#8C7760]">Cara Baca: </span>
                        {boardState.standardTarget.reading}
                      </p>
                    )}
                    {boardState.standardTarget.translation && (
                      <p className="font-semibold text-[#5C4A38]">
                        <span className="font-bold text-[#8C7760]">Terjemahan: </span>
                        {boardState.standardTarget.translation}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* PENJELASAN SINGKAT GURU DENGAN TOMBOL AUDIO - hanya jika bukan mode PTE canvas lebar atau SSW tactical board */}
            {!isWidePteCanvas && !isSswTacticalBoard && boardState.coachExplanation && (
              <div className="p-3.5 rounded-2xl bg-[#FFFDF8] border border-[#EADBCE] space-y-2">
                <p className="text-xs text-[#3D2E20] leading-relaxed font-medium">
                  {boardState.coachExplanation}
                </p>
                <div className="flex items-center justify-between pt-1 border-t border-[#F0E6D9]">
                  <span className="text-[11px] font-semibold text-[#8C7760]">
                    {persona.name} {(persona.geminiVoice || persona.edgeVoice) ? `(${persona.geminiVoice || persona.edgeVoice})` : ''}
                  </span>
                  <button
                    type="button"
                    onClick={handleReplayVoice}
                    data-testid="wb-replay-voice-btn"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#FAF4E8] hover:bg-[#F3EBE0] text-[#5C4A38] text-[11px] font-bold cursor-pointer transition-colors active:scale-95"
                  >
                    <span>🔊</span>
                    <span>{ui.listenBtn}</span>
                  </button>
                </div>
              </div>
            )}

            {/* -------------------------------------------------------------
                AREA LATIHAN INTERAKTIF MULTI-MODE (ANTI-SPOILING)
            ------------------------------------------------------------- */}
            {!isWidePteCanvas && !isSswTacticalBoard && (
              <div className="p-4 rounded-2xl bg-[#FFFDF8] border border-[#EADBCE] space-y-3">
              {/* Top Bar Kuis & Switcher Mode */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#F0E6D9] pb-2.5">
                <div className="flex items-center gap-1 bg-[#FAF4E8] p-1 rounded-xl overflow-x-auto no-scrollbar max-w-full">
                  <button
                    type="button"
                    onClick={() => { playFiezelSfx('button_tap'); setQuizMode('multiple_choice'); }}
                    data-testid="mode-tab-multiple_choice"
                    className={`px-2 py-1 rounded-lg text-[10px] sm:text-[10.5px] font-bold whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                      quizMode === 'multiple_choice' ? 'bg-[#FFFFFF] text-[#231A12] shadow-xs' : 'text-[#8C7760] hover:text-[#5C4A38]'
                    }`}
                  >
                    {ui.modeChoice}
                  </button>
                  <button
                    type="button"
                    onClick={() => { playFiezelSfx('button_tap'); setQuizMode('cloze_gap'); }}
                    data-testid="mode-tab-cloze_gap"
                    className={`px-2 py-1 rounded-lg text-[10px] sm:text-[10.5px] font-bold whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                      quizMode === 'cloze_gap' ? 'bg-[#FFFFFF] text-[#231A12] shadow-xs' : 'text-[#8C7760] hover:text-[#5C4A38]'
                    }`}
                  >
                    {ui.modeCloze}
                  </button>
                  <button
                    type="button"
                    onClick={() => { playFiezelSfx('button_tap'); setQuizMode('sentence_blocks'); }}
                    data-testid="mode-tab-sentence_blocks"
                    className={`px-2 py-1 rounded-lg text-[10px] sm:text-[10.5px] font-bold whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                      quizMode === 'sentence_blocks' ? 'bg-[#FFFFFF] text-[#231A12] shadow-xs' : 'text-[#8C7760] hover:text-[#5C4A38]'
                    }`}
                  >
                    {ui.modeBlocks}
                  </button>
                </div>

                {/* Tombol Ganti Soal Bersih */}
                <button
                  type="button"
                  onClick={handleReRollQuestion}
                  data-testid="wb-reroll-btn"
                  className="px-2.5 py-1 rounded-xl bg-[#FAF4E8] hover:bg-[#F3EBE0] text-[#5C4A38] text-[10px] sm:text-[10.5px] font-bold whitespace-nowrap shrink-0 inline-flex items-center gap-1 cursor-pointer transition-transform active:scale-95"
                  title={ui.rerollTitle}
                >
                  <span>↻</span>
                  <span>{ui.rerollBtn}</span>
                </button>
              </div>

              {/* MODE 1: PILIHAN GANDA (3 OPSI TRANSFER) */}
              {quizMode === 'multiple_choice' && (
                <div className="space-y-2 pt-1">
                  <p className="text-xs font-bold text-[#231A12]">{boardState.quiz.prompt}</p>
                  <div className="grid grid-cols-1 gap-1.5">
                    {boardState.quiz.options.map((opt) => {
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
                            <JapaneseRubyDisplay
                              as="span"
                              text={opt.text}
                              targetLang={resolvedEffectiveLang}
                              showFurigana={true}
                              showRomaji={true}
                              pronunciationTestId={`wb-option-pronunciation-${opt.id}`}
                              className="flex-1"
                            />
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

              {/* MODE 2: ISIAN RUMPANG (CLOZE GAP) */}
              {quizMode === 'cloze_gap' && (
                <div className="space-y-2.5 pt-1">
                  <p className="text-xs font-bold text-[#231A12]">{ui.clozePrompt}</p>
                  <div className="p-3 rounded-xl bg-[#FAF6EE] border border-[#EADBCE] text-xs font-medium text-[#231A12] leading-relaxed flex flex-wrap items-center gap-1.5">
                    {boardState.quiz.cloze.prefix && (
                      <JapaneseRubyDisplay
                        as="span"
                        text={boardState.quiz.cloze.prefix}
                        targetLang={resolvedEffectiveLang}
                        showFurigana={true}
                        showRomaji={true}
                      />
                    )}
                    <span className="inline-block px-2.5 py-0.5 rounded-md bg-[#FFFFFF] border-2 border-dashed border-[#B45309] font-bold text-[#B45309] min-w-[50px] text-center">
                      {clozeAnswer ? (
                        <JapaneseRubyDisplay
                          as="span"
                          text={clozeAnswer}
                          targetLang={resolvedEffectiveLang}
                          showFurigana={true}
                          showRomaji={true}
                        />
                      ) : (
                        '______'
                      )}
                    </span>
                    {boardState.quiz.cloze.suffix && (
                      <JapaneseRubyDisplay
                        as="span"
                        text={boardState.quiz.cloze.suffix}
                        targetLang={resolvedEffectiveLang}
                        showFurigana={true}
                        showRomaji={true}
                      />
                    )}
                  </div>
                  {/* Pilihan Kata Chip */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    {boardState.quiz.cloze.chips.map((chip, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectClozeChip(chip)}
                        data-testid={`cloze-chip-${idx}`}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer active:scale-95 ${
                          clozeAnswer === chip
                            ? isClozeCorrect
                              ? 'bg-[#E6F4EA] border-[#34D399] text-[#1B5E34]'
                              : 'bg-[#FDE8E4] border-[#F87171] text-[#991B1B]'
                            : 'bg-[#FFFFFF] border-[#EADBCE] text-[#3D2E20] hover:border-[#D8CBB5]'
                        }`}
                      >
                        <JapaneseRubyDisplay
                          as="span"
                          text={chip}
                          targetLang={resolvedEffectiveLang}
                          showFurigana={true}
                          showRomaji={true}
                        />
                      </button>
                    ))}
                  </div>
                  {clozeAnswer && (
                    <p className={`text-[11px] font-semibold ${
                      isClozeCorrect ? 'text-[#1B5E34]' : 'text-[#991B1B]'
                    }`}>
                      {isClozeCorrect ? boardState.quiz.cloze.feedback : ui.clozeWrong}
                    </p>
                  )}
                </div>
              )}

              {/* MODE 3: SUSUN BALOK KATA (SENTENCE BLOCKS) */}
              {quizMode === 'sentence_blocks' && (
                <div className="space-y-2.5 pt-1">
                  <p className="text-xs font-bold text-[#231A12]">{boardState.quiz.blocks.meaningId}</p>
                  {/* Slot Kalimat yang Sedang Disusun */}
                  <div className="min-h-[44px] p-2 rounded-xl bg-[#FAF6EE] border border-[#EADBCE] flex flex-wrap gap-1.5 items-center">
                    {placedBlocks.length === 0 ? (
                      <span className="text-[11px] text-[#8C7760] italic">{ui.blocksEmpty}</span>
                    ) : (
                      placedBlocks.map((blk, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleRemoveBlock(idx)}
                          className="px-2.5 py-1 rounded-lg bg-[#FFFFFF] border border-[#D8CBB5] text-xs font-bold text-[#231A12] shadow-2xs hover:bg-[#FEE2E2] cursor-pointer inline-flex items-center gap-1"
                        >
                          <JapaneseRubyDisplay
                            as="span"
                            text={blk}
                            targetLang={resolvedEffectiveLang}
                            showFurigana={true}
                            showRomaji={true}
                          />
                          <span aria-hidden="true">✕</span>
                        </button>
                      ))
                    )}
                  </div>
                  {/* Pool Balok Kata Tersedia */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    {boardState.quiz.blocks.pool.map((blk, idx) => {
                      const countInPool = boardState.quiz.blocks.pool.filter(w => w === blk).length;
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
                          <JapaneseRubyDisplay
                            as="span"
                            text={blk}
                            targetLang={resolvedEffectiveLang}
                            showFurigana={true}
                            showRomaji={true}
                          />
                        </button>
                      );
                    })}
                  </div>
                  {isQuizCompleted && (
                    <p className="text-[11px] font-bold text-[#1B5E34]">
                      ✓ {boardState.quiz.blocks.feedback}
                    </p>
                  )}
                </div>
              )}
            </div>
            )}

            {/* STATUS SUARA MIKROFON & TOMBOL SELESAI */}
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#FBF8F1] border border-[#F0E6D9] text-[11px] text-[#5C4A38]">
              <span className="w-2 h-2 rounded-full bg-[#10B981] animate-ping shrink-0" />
              <span className="font-semibold truncate">
                {ui.micListening(persona.name)}
              </span>
            </div>

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
      </div>
    </div>
  );
};
