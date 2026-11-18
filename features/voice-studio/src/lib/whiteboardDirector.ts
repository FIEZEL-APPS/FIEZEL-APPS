import type {
  CallScenario,
  LearnerLocale,
  TargetLang,
  VoiceUiAction,
  WhiteboardStepCommand,
  WhiteboardVectorShape,
} from '../types/voiceCall';
import {
  buildStrokeStepNarration,
  cleanReadingForLang,
  getKakijunEntry,
  resolveKakijunEntryForLang,
  resolveKakijunRequestFromPrompt,
  synthesizeFallbackStrokesForAnyChar,
  type KakijunCharEntry,
} from '../data/kakijunStrokeBank';
import { resolveVoiceApiCandidateBases } from './liveTransport';
import { layoutGraphToShapes } from './dagreLayout';

export interface BoardDynamicDataSubset {
  contextMode: string;
  focusType?: string;
  title?: string;
  summary?: string;
  sampleTarget?: string;
  sampleMeaningId?: string;
  topicTitle: string;
  patternFormula: string;
  coachExplanation: string;
  isOfflineNotice?: boolean;
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
  ribbonSegments?: Array<{
    role: string;
    word: string;
    tagColor: string;
  }>;
  characterData?: {
    char: string;
    reading: string;
    meaning: string;
    radical: string;
    radicalMeaning: string;
    strokesCount: number;
  };
  toneData?: {
    word: string;
    phonetic: string;
    toneType: string;
    toneShape: string;
  };
  quiz?: {
    prompt: string;
    options: Array<{ id: string; text: string; isCorrect: boolean; feedback: string }>;
  };
}

export interface StudentBoardQuestion {
  id: string;
  text: string;
  areaExcerpt?: string;
  imageDataUrl?: string;
  tutorAnswer?: string;
}

export interface SourceMaterialPage {
  id: string;
  pageNumber: number;
  badge: string;
  title: string;
  subtitle: string;
  highlights: string[];
  promptToExplain: string;
  imageDataUrl?: string;
}

export interface WhiteboardSceneStep extends WhiteboardStepCommand {
  id: string;
  column: 'left' | 'right';
  phaseIndex: number;
  durationMs: number;
}

export interface WhiteboardScenePlan {
  boardTitle: string;
  boardSubtitle: string;
  phaseLabels: string[];
  steps: WhiteboardSceneStep[];
  sourcePages: SourceMaterialPage[];
}

function readLocalGeminiApiKey(): string {
  try {
    if (typeof window === 'undefined') return '';
    return (
      localStorage.getItem('GEMINI_API_KEY') ||
      localStorage.getItem('gemini_api_key') ||
      localStorage.getItem('fiezel_gemini_api_key') ||
      localStorage.getItem('GOOGLE_API_KEY') ||
      ''
    ).trim();
  } catch {
    return '';
  }
}

function cleanBoardDisplayText(val: unknown): string {
  const s = String(val ?? '')
    .replace(/\(\s*\)|（\s*）|\[\s*\]|\{\s*\}/g, '')
    .replace(
      /(['"`]?\b(?:agree|know|believe|like|want|understand)\b['"`]?\s+(?:adalah|merupakan)\s+)(?:kata\s+kerja\s+aksi(?:\s*\([^)]*\))?|aksi\s+atau\s+(?:kata\s+kerja|tindakan)|aksi\b)/gi,
      '$1kata kerja utama (stative verb)'
    )
    .replace(
      /\b([Kk])ata\s+kerja\s+aksi(\s*\([^)]*\b(?:agree|know|believe|like|want|understand)\b[^)]*\))/g,
      '$1ata kerja utama$2'
    )
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/([,:•])\s*$/g, (m, ch) => (ch === ':' ? ':' : ''))
    .replace(/\s{2,}/g, ' ')
    .trim();
  return s;
}

function condenseNoteBulletToVisualKey(raw: string): string {
  const cleaned = cleanBoardDisplayText(raw);
  if (!cleaned) return '';
  if (cleaned.length <= 220) return cleaned;
  // Pertahankan aturan tata bahasa & pengecualian secara utuh; potong hanya bila melebihi batas paragraf panjang di akhir kalimat terdekat
  const sentences = cleaned.split(/(?<=[.!?])\s+/).filter(Boolean);
  let acc = '';
  for (const s of sentences) {
    const candidate = acc ? `${acc} ${s}` : s;
    if (candidate.length <= 230) {
      acc = candidate;
    } else {
      break;
    }
  }
  if (acc.length >= 24) return acc;
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length <= 32) return cleaned;
  return `${words.slice(0, 32).join(' ')}.`;
}

function isDegenerateSampleText(val: unknown): boolean {
  const s = cleanBoardDisplayText(val);
  if (!s) return true;
  if (/^[\d\s.,\-/+•:;()]+$/.test(s)) return true;
  if (/^(example|contoh|sample|placeholder|\.\.\.)$/i.test(s)) return true;
  return false;
}

function normalizeTableRows(rawRows: unknown): string[][] | undefined {
  if (!Array.isArray(rawRows) || rawRows.length === 0) return undefined;
  const isTablePlaceholderCell = (s: string) =>
    !s || /^(example|contoh|sample|placeholder|\.\.\.|-)$/i.test(s);
  const cleaned = rawRows
    .map((r) => {
      if (Array.isArray(r)) return r.map((c) => cleanBoardDisplayText(c));
      if (typeof r === 'string') return r.split('|').map((c) => cleanBoardDisplayText(c));
      return [];
    })
    .filter((r) => {
      if (r.length === 0) return false;
      const validCells = r.filter((cell) => !isTablePlaceholderCell(cell));
      if (validCells.length === 0) return false;
      // Reject degenerate rows where every populated column repeats the exact same phrase
      if (validCells.length >= 2 && new Set(validCells.map((c) => c.toLowerCase())).size <= 1) {
        return false;
      }
      return true;
    });
  return cleaned.length > 0 ? cleaned : undefined;
}

/**
 * Compiler real-time Client/Worker untuk papan tulis zero-template.
 * Prioritas:
 * 1. Backend Worker `/api/voice/partner-turn` (candidate bases: localhost same-origin atau api.fiezel.my.id)
 * 2. Fallback lokal langsung ke Gemini REST API (`gemini-3.5-flash-lite`) jika user menyimpan GEMINI_API_KEY lokal
 * 3. Fallback ke `https://api.fiezel.my.id/api/voice/partner-turn` apabila server statis localhost tanpa API proxy
 */
export interface WhiteboardFollowUpContext {
  topicTitle?: string;
  patternFormula?: string;
  summary?: string;
  areaExcerpt?: string;
  previousQuestions?: string[];
  currentVisualKinds?: string[];
  currentVisualSummary?: string;
}

export function isVisualSwitchRequestText(text?: string): boolean {
  return /\b(?:ubah|ganti|tukar|bikin(?:kan)?\s+ulang|coba)\s+(?:visual|gambar|diagram|sketsa|grafik|bagan|tabel|cara\s+gambar)\b|\b(?:visual|gambar|diagram|sketsa|grafik)\s+(?:lain|baru|berbeda)\b|\b(?:change|switch|another|different)\s+(?:visual|diagram|drawing|chart)\b/i.test(
    String(text || '')
  );
}

export async function requestRealtimeWhiteboardAction(params: {
  question: string;
  personaId: string;
  personaName: string;
  scenarioId: string;
  scenarioTitle: string;
  targetLang: TargetLang;
  locale: LearnerLocale;
  history?: Array<{ speaker: string; text: string }>;
  boardContext?: WhiteboardFollowUpContext;
  learnerDossier?: string;
}): Promise<{ uiAction?: VoiceUiAction; aiReply?: string } | null> {
  const { question, personaId, personaName, scenarioId, scenarioTitle, targetLang, locale, history = [], boardContext, learnerDossier } = params;
  const bases = resolveVoiceApiCandidateBases();
  const isLocalHost =
    typeof window !== 'undefined' &&
    /^(localhost|127\.0\.0\.1|0\.0\.0\.0)$/i.test(window.location?.hostname || '');

  const cleanQuestion = question.replace(/^\s*\[WHITEBOARD_REQUEST\]\s*/i, '').trim();
  const payloadBody = JSON.stringify({
    text: `[WHITEBOARD_REQUEST] ${cleanQuestion}`,
    forcePopup: true,
    boardOnly: true,
    personaId,
    personaName,
    scenarioId,
    scenarioTitle,
    targetLang,
    locale,
    callMode: 'tutor_coach',
    history: history.slice(-4),
    ...(learnerDossier ? { learnerDossier } : {}),
    ...(boardContext ? { boardContext } : {}),
  });

  // 1. Panggil backend resmi (local proxy atau Cloudflare Worker)
  for (const base of bases) {
    try {
      const controller = new AbortController();
      const t = window.setTimeout(() => controller.abort(), 24000);
      const res = await fetch(`${base}/api/voice/partner-turn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payloadBody,
        signal: controller.signal,
      });
      window.clearTimeout(t);
      if (res.ok) {
        const data = await res.json();
        if (data?.uiAction?.actionType === 'open_learning_popup') {
          return {
            uiAction: data.uiAction as VoiceUiAction,
            aiReply: data.aiReplyTranslation || data.aiReplyTranslationId || data.aiReply || '',
          };
        }
      }
    } catch {
      // Lanjut fallback berikutnya
    }
  }

  // 2. Di mode lokal tanpa backend proxy: coba kunci Gemini lokal user jika tersedia
  const localGeminiKey = readLocalGeminiApiKey();
  if (localGeminiKey.length > 10) {
    try {
      const targetLocaleName = locale === 'th' ? 'Thai' : locale === 'en' ? 'English' : 'Indonesian';
      const wantsVisualSwitch = isVisualSwitchRequestText(cleanQuestion);
      const activeVisualDesc = boardContext?.currentVisualKinds?.length
        ? `${boardContext.currentVisualKinds.join(', ')}${boardContext.currentVisualSummary ? ` (${boardContext.currentVisualSummary})` : ''}`
        : '';
      const followUpHint = boardContext
        ? [
            `FOLLOW-UP CONTEXT ON OPEN WHITEBOARD: Learner was studying "${boardContext.topicTitle || ''}"${boardContext.patternFormula ? ` (${boardContext.patternFormula})` : ''}.`,
            boardContext.summary ? `Prior explanation: "${boardContext.summary}".` : '',
            activeVisualDesc ? `Currently shown visuals on board: ${activeVisualDesc}.` : '',
            boardContext.areaExcerpt ? `Learner circled specifically: "${boardContext.areaExcerpt}".` : '',
            wantsVisualSwitch
              ? `MANDATORY VISUAL SWITCH: Learner explicitly asked for a DIFFERENT visual! You MUST NOT reuse the previous layout (${activeVisualDesc || 'same diagram'}). Switch to a genuinely DIFFERENT, crystal-clear visual representation (e.g., timeline_track, mind_map, contrast_scale, formula_blocks, syntax_flow, or multi-zone rough_scene with full labels, explanations, and examples).`
              : `Bridge directly to why they are still confused and explain clearly from zero with concrete examples and unambiguous diagram labels.`,
          ].filter(Boolean).join(' ')
        : '';
      const prompt = [
        `You are ${personaName}, a patient interactive beginner tutor drawing live on a whiteboard in ${targetLocaleName}.`,
        `Course: ${targetLang.toUpperCase()}. Exact learner question: "${question}".`,
        followUpHint,
        `AUDIO-FIRST, ZERO-AMBIGUITY & VISUAL-FIRST RULE: Never output vague placeholder labels ("Pola Pertama", "Pola Kedua", "Sisi A", "Visualisasi Lokasi") or oversimplified slogans ("to be hanya kata sifat"). Every box/panel/branch in step[2] MUST have a real rule title, a plain beginner explanation (10-20 words telling WHEN & WHY), and a real example phrase with translation! Keep Step 1 bullets complete and unambiguous (3-4 rules, 15-25 words each). For To Be vs Verb, explicitly teach Adj, Noun/Lokasi, Verb ing, and Verb 3 vs Verb 1. Match Step 2 "spokenNarration" (3-5 calm sentences, ~55-85 words) 1:1 left-to-right to every visual element drawn on Step 2.`,
        `SHAPE & BOX HYGIENE: NEVER put empty parentheses "()" or unlabeled empty boxes in shapes. Every rect/circle/ellipse MUST have a clear short label (1-4 words) + sublabel inside roomy non-overlapping coords (x:24..536, y:20..225 of width:560 height:250, >=24px gaps).`,
        `Produce a 100% UNIQUE, ZERO-TEMPLATE JSON teaching board tailored ONLY to "${question}".`,
        `Must include "whiteboardSteps" (5-6 steps across "left" and "right", phaseIndex 0..4) with calm natural multi-sentence "spokenNarration" per step, AND "phaseLabels" (5 labels), sampleTarget, trapWrongSentence, trapWrongReason, drillMeaningPrompt, drillTargetSentence, drillTrapSentence.`,
        `Return ONLY valid JSON: {"aiReply":"...","uiAction":{"actionType":"open_learning_popup","topicTitle":"...","focusType":"grammar","patternFormula":"...","coachSpokenScript":"...","explanationText":"...","sampleTarget":"...","trapWrongSentence":"...","trapWrongReason":"...","drillMeaningPrompt":"...","drillTargetSentence":"...","drillTrapSentence":"...","phaseLabels":["0 Mulai","1 Logika","2 Visual","3 Contoh","4 Latihan"],"whiteboardSteps":[]}}`,
      ].filter(Boolean).join('\n');

      const controller = new AbortController();
      const t = window.setTimeout(() => controller.abort(), 24000);
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${encodeURIComponent(localGeminiKey)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: 'application/json', temperature: 0.35, thinkingConfig: { thinkingBudget: 0 } },
          }),
          signal: controller.signal,
        }
      );
      window.clearTimeout(t);
      if (res.ok) {
        const json = await res.json();
        const rawText = json?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const parsed = JSON.parse(rawText);
        if (parsed?.uiAction) {
          return {
            uiAction: {
              ...parsed.uiAction,
              actionType: 'open_learning_popup',
              sourceLayer: 'ai_dynamic',
            },
            aiReply: parsed.aiReply || parsed.uiAction?.explanationText || '',
          };
        }
      }
    } catch {
      // Abaikan jika gagal
    }
  }

  // 3. Jika running lokal tanpa server proxy (/api/* 404) & tanpa GEMINI_API_KEY, coba api.fiezel.my.id jika online
  if (isLocalHost) {
    try {
      const controller = new AbortController();
      const t = window.setTimeout(() => controller.abort(), 14000);
      const res = await fetch('https://api.fiezel.my.id/api/voice/partner-turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payloadBody,
        mode: 'cors',
        signal: controller.signal,
      });
      window.clearTimeout(t);
      if (res.ok) {
        const data = await res.json();
        if (data?.uiAction?.actionType === 'open_learning_popup') {
          return {
            uiAction: data.uiAction as VoiceUiAction,
            aiReply: data.aiReplyTranslation || data.aiReplyTranslationId || data.aiReply || '',
          };
        }
      }
    } catch {
      // Offline / network block
    }
  }

  return null;
}

export async function requestRealtimeWhiteboardStream(params: {
  question: string;
  personaId: string;
  personaName: string;
  scenarioId: string;
  scenarioTitle: string;
  targetLang: TargetLang;
  locale: LearnerLocale;
  history?: Array<{ speaker: string; text: string }>;
  boardContext?: WhiteboardFollowUpContext;
  learnerDossier?: string;
  onOpenerReady?: (opener: {
    topicTitle?: string;
    patternFormula?: string;
    headingStep?: WhiteboardStepCommand;
  }) => void;
}): Promise<{ uiAction?: VoiceUiAction; aiReply?: string } | null> {
  const {
    question,
    personaId,
    personaName,
    scenarioId,
    scenarioTitle,
    targetLang,
    locale,
    history = [],
    boardContext,
    learnerDossier,
    onOpenerReady,
  } = params;
  const bases = resolveVoiceApiCandidateBases();
  const cleanQuestion = question.replace(/^\s*\[WHITEBOARD_REQUEST\]\s*/i, '').trim();
  const payloadBody = JSON.stringify({
    text: `[WHITEBOARD_REQUEST] ${cleanQuestion}`,
    forcePopup: true,
    boardOnly: true,
    personaId,
    personaName,
    scenarioId,
    scenarioTitle,
    targetLang,
    locale,
    callMode: 'tutor_coach',
    history: history.slice(-4),
    ...(learnerDossier ? { learnerDossier } : {}),
    ...(boardContext ? { boardContext } : {}),
  });

  for (const base of bases) {
    try {
      const controller = new AbortController();
      const t = window.setTimeout(() => controller.abort(), 24000);
      const res = await fetch(`${base}/api/voice/whiteboard-stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payloadBody,
        signal: controller.signal,
      });
      if (!res.ok) {
        window.clearTimeout(t);
        if (res.status === 404 || res.status === 405) break;
        continue;
      }
      const ctype = res.headers.get('content-type') || '';
      if (ctype.includes('text/event-stream') && res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = '';
        let resolvedBoard: { uiAction?: VoiceUiAction; aiReply?: string } | null = null;
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const frames = buf.split(/\r?\n\r?\n/);
          buf = frames.pop() || '';
          for (const frame of frames) {
            let evName = 'message';
            const dataLines: string[] = [];
            for (const line of frame.split(/\r?\n/)) {
              if (line.startsWith('event:')) evName = line.slice(6).trim();
              else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim());
            }
            const dataStr = dataLines.join('\n').trim();
            if (!dataStr || dataStr === '[DONE]') continue;
            try {
              const pkt = JSON.parse(dataStr);
              if (evName === 'opener' && typeof onOpenerReady === 'function') {
                onOpenerReady(pkt);
              } else if (evName === 'board' && pkt?.uiAction?.actionType === 'open_learning_popup') {
                resolvedBoard = {
                  uiAction: pkt.uiAction as VoiceUiAction,
                  aiReply: pkt.aiReplyTranslation || pkt.aiReplyTranslationId || pkt.aiReply || '',
                };
              }
            } catch {
              // Ignore partial SSE frame
            }
          }
        }
        window.clearTimeout(t);
        if (resolvedBoard) return resolvedBoard;
      } else {
        const data = await res.json().catch(() => null);
        window.clearTimeout(t);
        if (data?.uiAction?.actionType === 'open_learning_popup') {
          return {
            uiAction: data.uiAction as VoiceUiAction,
            aiReply: data.aiReplyTranslation || data.aiReplyTranslationId || data.aiReply || '',
          };
        }
      }
    } catch {
      // Fallback to standard JSON endpoint below
    }
  }

  return requestRealtimeWhiteboardAction(params);
}

export function isTrivialFillerBullet(val: string): boolean {
  const t = (val || '')
    .trim()
    .toLowerCase()
    .replace(/[!?.…,]+$/g, '')
    .trim();
  return (
    t.length < 10 ||
    /^(perhatikan baik[- ]?baik|dengar(?:kan)? baik[- ]?baik(?:\s+kawan)?|simak baik[- ]?baik|lihat contoh ini|pelajari ini|catat baik[- ]?baik(?:\s+aturan\s+ini)?|ayo kita pelajari|yuk simak)$/i.test(
      t
    ) ||
    /^(halo(?:\s+[\w\s,]{1,24})?|hai(?:\s+kawan|\s+semuanya)?|coach\s+\w+\s+di\s+sini|selamat\s+datang\s+di\s+papan\s+(?:belajar|penjelasan)(?:\s+[\w\s]{0,24})?|mari\s+kita\s+(?:mulai|bedah|pelajari)(?:\s+dari\s+(?:awal|pertanyaanmu|nol))?)$/i.test(
      t
    )
  );
}

function splitExplanationIntoBullets(explanation: string, formula: string): string[] {
  const clean = (explanation || '')
    .replace(
      /^\s*(?:perhatikan baik[- ]?baik|dengar(?:kan)? baik[- ]?baik(?:\s+kawan)?|simak baik[- ]?baik|catat baik[- ]?baik)[!.,:\s-]*/i,
      ''
    )
    .replace(/\s+/g, ' ')
    .trim();
  if (!clean) {
    return formula ? [formula] : [];
  }
  const sentences = clean
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 4 && !isTrivialFillerBullet(s));
  if (sentences.length >= 2) {
    return sentences.slice(0, 6);
  }
  const parts = clean
    .split(/[,;]\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 4 && !isTrivialFillerBullet(s));
  if (parts.length >= 2) {
    return parts.slice(0, 6);
  }
  if (!isTrivialFillerBullet(clean)) {
    return [clean];
  }
  return formula ? [formula] : [];
}

function extractRequestedCjkChar(text: string): string | null {
  const match = (text || '').match(/[\u4e00-\u9faf\u3040-\u309f\u30a0-\u30ff]/);
  return match ? match[0] : null;
}

function resolveOrSynthesizeKakijun(
  char: string | undefined,
  customPaths?: WhiteboardStepCommand['strokePaths'],
  declaredStrokeCount?: number,
  targetLang?: TargetLang
): KakijunCharEntry {
  const ch = ((char || '').match(/[\u4e00-\u9faf\u3040-\u309f\u30a0-\u30ff]/) || [(char || '字').trim()[0] || '字'])[0];
  const fromBank = getKakijunEntry(ch, targetLang);
  // Bank resmi KanjiVG / MakeMeAHanzi tidak boleh ditimpa path AI
  if (fromBank) {
    return fromBank;
  }
  return synthesizeFallbackStrokesForAnyChar(ch, customPaths, declaredStrokeCount, targetLang);
}

function enrichKanjiGridStep(
  raw: WhiteboardStepCommand,
  fallbackMeaning: string,
  targetLang: TargetLang
): { step: WhiteboardStepCommand; entry: KakijunCharEntry } {
  const directChar = extractRequestedCjkChar(`${raw.character || ''} ${raw.title || ''}`);
  const promptMatches = !directChar
    ? resolveKakijunRequestFromPrompt(`${raw.character || ''} ${raw.title || ''} ${raw.text || ''}`, targetLang)
    : [];
  const chosenChar = directChar || promptMatches[0]?.char || raw.character || '五';
  const baseEntry = resolveOrSynthesizeKakijun(chosenChar, raw.strokePaths, raw.strokeCount, targetLang);
  const entry = resolveKakijunEntryForLang(baseEntry, targetLang);
  const strokeNarration = buildStrokeStepNarration(entry, targetLang);
  const existingNarration = (raw.spokenNarration || '').trim();
  // INVARIAN ZERO-HALLUCINATION: Saat data vektor resmi sudah tersedia, narasi WAJIB memakai deskripsi goresan resmi
  const finalNarration =
    entry.strokes.length > 0
      ? strokeNarration
      : existingNarration && /goresan|stroke|coretan/i.test(existingNarration)
        ? existingNarration
        : strokeNarration;
  const scrubStrokeCount = (s?: string) =>
    entry.strokeCount > 0 && typeof s === 'string'
      ? s.replace(/\b\d+\s*(goresan|strokes?|coretan)\b/gi, `${entry.strokeCount} $1`)
      : s;
  const cleanMeaning = (scrubStrokeCount(raw.meaning) || entry.meaningId || fallbackMeaning)
    .replace(/\s*\(\d+\s*Goresan\)/i, '')
    .trim();
  const cleanReading = cleanReadingForLang(raw.reading, entry.reading, targetLang, entry.char);
  const rawTitle =
    targetLang === 'zh'
      ? (raw.title || `Urutan Goresan Hanzi "${entry.char}"`).replace(/\bKanji\b/gi, 'Hanzi')
      : raw.title;
  const cleanTitle = scrubStrokeCount(rawTitle);

  return {
    entry,
    step: {
      ...raw,
      title: cleanTitle,
      character: entry.char,
      reading: cleanReading,
      meaning: cleanMeaning,
      strokeCount: entry.strokeCount,
      strokePaths: entry.strokes,
      mnemonic: scrubStrokeCount(raw.mnemonic) || entry.mnemonicId,
      spokenNarration: finalNarration,
    },
  };
}

function sanitizeSceneShape(sh: WhiteboardVectorShape): WhiteboardVectorShape {
  const rec = sh as WhiteboardVectorShape & { title?: string };
  const rawLabel = cleanBoardDisplayText(rec.label || rec.title || (rec.op !== 'text' ? rec.text : ''));
  const rawSub = cleanBoardDisplayText(rec.sublabel);
  const rawText = rec.op === 'text' ? cleanBoardDisplayText(rec.text || rec.label || rec.title) : cleanBoardDisplayText(rec.text);
  return {
    ...sh,
    ...(rawLabel ? { label: rawLabel } : { label: undefined }),
    ...(rawSub ? { sublabel: rawSub } : { sublabel: undefined }),
    ...(rawText ? { text: rawText } : { text: undefined }),
  };
}

function sanitizeStepVisualFields(step: WhiteboardStepCommand): WhiteboardStepCommand {
  const next: WhiteboardStepCommand = {
    ...step,
    title: step.title ? cleanBoardDisplayText(step.title) : step.title,
    text: step.text ? cleanBoardDisplayText(step.text) : step.text,
    caption: step.caption ? cleanBoardDisplayText(step.caption) : step.caption,
    highlightPhrase: step.highlightPhrase ? cleanBoardDisplayText(step.highlightPhrase) : step.highlightPhrase,
    termA: step.termA ? cleanBoardDisplayText(step.termA) : step.termA,
    descA: step.descA ? cleanBoardDisplayText(step.descA) : step.descA,
    termB: step.termB ? cleanBoardDisplayText(step.termB) : step.termB,
    descB: step.descB ? cleanBoardDisplayText(step.descB) : step.descB,
    analogy: step.analogy ? cleanBoardDisplayText(step.analogy) : step.analogy,
    wrongText: step.wrongText ? cleanBoardDisplayText(step.wrongText) : step.wrongText,
    rightText: step.rightText ? cleanBoardDisplayText(step.rightText) : step.rightText,
    reason: step.reason ? cleanBoardDisplayText(step.reason) : step.reason,
    metaphorCenterLabel: step.metaphorCenterLabel
      ? cleanBoardDisplayText(step.metaphorCenterLabel)
      : step.metaphorCenterLabel,
  };
  if (Array.isArray(step.highlightTerms)) {
    next.highlightTerms = step.highlightTerms
      .map((t) => cleanBoardDisplayText(t))
      .filter((t) => t.length >= 2)
      .slice(0, 8);
  }
  if (step.leftPanel) {
    next.leftPanel = {
      ...step.leftPanel,
      badge: cleanBoardDisplayText(step.leftPanel.badge || '') || undefined,
      title: cleanBoardDisplayText(step.leftPanel.title) || '',
      subtitle: cleanBoardDisplayText(step.leftPanel.subtitle || '') || undefined,
      example: cleanBoardDisplayText(step.leftPanel.example || '') || undefined,
    };
  }
  if (step.rightPanel) {
    next.rightPanel = {
      ...step.rightPanel,
      badge: cleanBoardDisplayText(step.rightPanel.badge || '') || undefined,
      title: cleanBoardDisplayText(step.rightPanel.title) || '',
      subtitle: cleanBoardDisplayText(step.rightPanel.subtitle || '') || undefined,
      example: cleanBoardDisplayText(step.rightPanel.example || '') || undefined,
    };
  }
  if (Array.isArray(step.branches)) {
    next.branches = step.branches
      .map((b) => ({
        ...b,
        label: cleanBoardDisplayText(b.label),
        sublabel: cleanBoardDisplayText(b.sublabel || '') || undefined,
        example: cleanBoardDisplayText(b.example || '') || undefined,
      }))
      .filter((b) => Boolean(b.label));
  }
  if (Array.isArray(step.timelineEvents)) {
    next.timelineEvents = step.timelineEvents
      .map((ev) => ({
        ...ev,
        timeLabel: cleanBoardDisplayText(ev.timeLabel) || 'Tahap',
        title: cleanBoardDisplayText(ev.title),
        example: cleanBoardDisplayText(ev.example || '') || undefined,
      }))
      .filter((ev) => Boolean(ev.title));
  }
  if (Array.isArray(step.blocks)) {
    next.blocks = step.blocks
      .map((bl) => ({
        ...bl,
        role: cleanBoardDisplayText(bl.role) || 'Bagian',
        token: cleanBoardDisplayText(bl.token),
        note: cleanBoardDisplayText(bl.note || '') || undefined,
      }))
      .filter((bl) => Boolean(bl.token));
  }
  if (Array.isArray(step.bullets)) {
    next.bullets = step.bullets
      .map((b) => condenseNoteBulletToVisualKey(b))
      .filter((b) => b && !isTrivialFillerBullet(b));
  }
  if (Array.isArray(step.nodes)) {
    next.nodes = step.nodes
      .map((n) => ({
        ...n,
        role: cleanBoardDisplayText(n.role),
        word: cleanBoardDisplayText(n.word),
      }))
      .filter((n) => n.word || n.role);
  }
  if (Array.isArray(step.shapes)) {
    next.shapes = step.shapes
      .map((s) => sanitizeSceneShape(s))
      .filter((s) => {
        if (s.op === 'text') return Boolean(s.text);
        if (s.op === 'rect') {
          const isSmallMarker = Math.abs(s.w || 0) <= 30 && Math.abs(s.h || 0) <= 30;
          return isSmallMarker || Boolean(s.label || s.sublabel);
        }
        if (s.op === 'circle' || s.op === 'ellipse') {
          return Boolean(s.label || s.sublabel);
        }
        return true;
      });
  }
  return next;
}

function deriveStepSpokenNarration(
  step: WhiteboardStepCommand,
  topicTitle: string,
  _coachExplanation: string,
  targetLang?: TargetLang
): string {
  const rawExisting = cleanBoardDisplayText(step.spokenNarration || '');
  const hasPhantomSpatialRef =
    (step.kind === 'syntax_flow' ||
      step.kind === 'formula_blocks' ||
      step.kind === 'timeline_track') &&
    /(?:di\s+)?sisi\s+(?:kiri|kanan)|panel\s+(?:kiri|kanan)|mode\s+video|\bkamera\b/i.test(rawExisting);

  let noteMismatch = false;
  if (step.kind === 'note' && Array.isArray(step.bullets) && step.bullets.length >= 1) {
    const existingLower = rawExisting.toLowerCase();
    const stopRe = /^(?:yang|dan|atau|dengan|untuk|bisa|tidak|adalah|dari|pada|ini|itu|dalam|akan|saat|jika|kalau|karena|the|and|for|with|are|can|not)$/;
    const cleanBullets = step.bullets.map((b) => cleanBoardDisplayText(b)).filter(Boolean);
    const bulletWordsTotal = cleanBullets.join(' ').split(/\s+/).filter(Boolean).length;
    const rawWords = rawExisting.split(/\s+/).filter(Boolean).length;
    let matchedCount = 0;
    let comparableCount = 0;
    for (const cleanB of cleanBullets) {
      const tokens = cleanB
        .toLowerCase()
        .split(/[^a-z0-9\u3040-\u30ff\u4e00-\u9faf\u0e00-\u0e7f]+/i)
        .filter((t) => t.length >= 3 && !stopRe.test(t));
      if (tokens.length === 0) continue;
      comparableCount += 1;
      const hits = tokens.filter((tok) => existingLower.includes(tok)).length;
      if (hits >= Math.min(2, tokens.length)) {
        matchedCount += 1;
      }
    }
    if (
      !rawExisting ||
      rawWords < Math.max(8, bulletWordsTotal * 0.58) ||
      (comparableCount >= 1 && matchedCount < comparableCount)
    ) {
      noteMismatch = true;
    }
  }

  const existing = (hasPhantomSpatialRef || noteMismatch ? '' : rawExisting)
    .replace(/(?:^|[.!?]\s*)Visualisasi\s+(?:Aksi|Lokasi|Konsep|Kalimat|Struktur|Pola)(?:\s+\w+){0,2}\.(?=\s|$)/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
  const isVagueDiagramTitleOnly =
    step.kind !== 'heading' &&
    step.kind !== 'highlight_callout' &&
    /^(?:visualisasi|alur|skema|diagram|peta|struktur)\s+[\w\s]{1,36}\.?$/i.test(existing);
  const existingWords = isVagueDiagramTitleOnly ? 0 : existing.split(/\s+/).filter(Boolean).length;

  // Pertahankan narasi kontekstual dari tutor bila sudah bermakna dan utuh (hindari menggantinya dengan template generik)
  if (step.kind === 'heading') {
    const subTxt = cleanBoardDisplayText(step.text || '');
    if (existingWords >= 6) {
      return /[.!?。！？]$/.test(existing) ? existing : `${existing}.`;
    }
    return `${cleanBoardDisplayText(step.title || topicTitle)}${subTxt ? `. ${subTxt}` : ''}.`.replace(/\.{2,}/g, '.').trim();
  }

  if (existingWords >= 10 && step.kind !== 'kanji_grid' && step.kind !== 'note' && step.kind !== 'trap_vs_fix') {
    return /[.!?。！？]$/.test(existing) ? existing : `${existing}.`;
  }

  switch (step.kind) {
    case 'note': {
      if (!noteMismatch && existingWords >= 10) return /[.!?。！？]$/.test(existing) ? existing : `${existing}.`;
      const fullPts = (step.bullets || [])
        .map((b) => {
          const cleanB = cleanBoardDisplayText(b);
          if (!cleanB) return '';
          return /[.!?。！？]$/.test(cleanB) ? cleanB : `${cleanB}.`;
        })
        .filter(Boolean)
        .join(' ');
      if (fullPts) {
        return fullPts.replace(/\.{2,}/g, '.').trim();
      }
      return `${cleanBoardDisplayText(step.title || topicTitle)}.`.trim();
    }
    case 'kanji_grid': {
      const entry = resolveOrSynthesizeKakijun(step.character, step.strokePaths, step.strokeCount, targetLang);
      return buildStrokeStepNarration(entry, targetLang);
    }
    case 'metaphor_scene': {
      if (existingWords >= 14) return /[.!?。！？]$/.test(existing) ? existing : `${existing}.`;
      const lp = step.leftPanel;
      const rp = step.rightPanel;
      const an = cleanBoardDisplayText(step.analogy || '');
      const leftCue = lp
        ? `Pertama di sisi kiri, ${lp.title}: ${lp.subtitle || 'perhatikan aturan utamanya'}${lp.example ? `. Contohnya kalimat ${lp.example}` : ''}`
        : '';
      const rightCue = rp
        ? `Kedua di sisi kanan, ${rp.title}: ${rp.subtitle || 'ini perbandingannya'}${rp.example ? `. Contohnya kalimat ${rp.example}` : ''}`
        : '';
      return `${leftCue ? `${leftCue}. ` : ''}${rightCue ? `${rightCue}. ` : ''}${an && !/^visualisasi/i.test(an) ? `Kuncinya: ${an}.` : ''}`.replace(/\.{2,}/g, '.').trim();
    }
    case 'mind_map': {
      if (existingWords >= 14) return /[.!?。！？]$/.test(existing) ? existing : `${existing}.`;
      const items = (step.branches || [])
        .slice(0, 4)
        .map((b, bIdx) => `Cabang ${bIdx + 1}, ${b.label}${b.sublabel ? `, yaitu ${b.sublabel}` : ''}${b.example ? `, contohnya ${b.example}` : ''}`)
        .join('. ');
      return `Mari kita baca peta konsep ${cleanBoardDisplayText(step.metaphorCenterLabel || step.title || topicTitle)} satu per satu. ${items || cleanBoardDisplayText(step.title || topicTitle)}.`.replace(/\.{2,}/g, '.').trim();
    }
    case 'timeline_track': {
      if (existingWords >= 14) return /[.!?。！？]$/.test(existing) ? existing : `${existing}.`;
      const stops = (step.timelineEvents || [])
        .slice(0, 4)
        .map((ev) => `${ev.timeLabel}: ${ev.title}${ev.example ? `, contohnya ${ev.example}` : ''}`)
        .join('. Kemudian ');
      return `Ikuti garis waktu dari kiri ke kanan. ${stops || cleanBoardDisplayText(step.title || topicTitle)}.`.replace(/\.{2,}/g, '.').trim();
    }
    case 'formula_blocks': {
      if (existingWords >= 14) return /[.!?。！？]$/.test(existing) ? existing : `${existing}.`;
      const pieceDesc = (step.blocks || [])
        .slice(0, 5)
        .map((bl, bIdx) => `Blok ${bIdx + 1}, ${bl.role}, berisi ${bl.token}${bl.note ? `, digunakan untuk ${bl.note}` : ''}`)
        .join('. ');
      return `Perhatikan susunan blok polanya dari kiri ke kanan. ${pieceDesc || cleanBoardDisplayText(step.title || topicTitle)}.`.replace(/\.{2,}/g, '.').trim();
    }
    case 'rough_scene': {
      if (existingWords >= 8) return /[.!?。！？]$/.test(existing) ? existing : `${existing}.`;
      const partsDesc = (step.shapes || [])
        .map((s) => {
          const lbl = cleanBoardDisplayText(s.label || s.text || '');
          const sub = cleanBoardDisplayText(s.sublabel || '');
          return lbl && sub ? `${lbl}: ${sub}` : lbl;
        })
        .filter((s) => s && s.length <= 80)
        .slice(0, 4);
      const visualCue = partsDesc.length ? ` Mulai dari ${partsDesc.join(', lalu ')}.` : '';
      const cap = step.caption ? ` ${cleanBoardDisplayText(step.caption)}.` : '';
      return `Perhatikan skema ${cleanBoardDisplayText(step.title || topicTitle)} di papan.${cap}${visualCue}`.trim();
    }
    case 'contrast_scale': {
      if (existingWords >= 8) return /[.!?。！？]$/.test(existing) ? existing : `${existing}.`;
      const a = cleanBoardDisplayText(step.termA || 'Bentuk utama');
      const dA = cleanBoardDisplayText(step.descA || '');
      const b = cleanBoardDisplayText(step.termB || 'Bentuk pembanding');
      const dB = cleanBoardDisplayText(step.descB || '');
      const an = cleanBoardDisplayText(step.analogy || '');
      return `Bandingkan sisi kiri dan kanan: ${a}${dA ? ` (${dA})` : ''}, versus ${b}${dB ? ` (${dB})` : ''}.${an ? ` Kuncinya: ${an}.` : ''}`.trim();
    }
    case 'syntax_flow': {
      if (existingWords >= 12) return /[.!?。！？]$/.test(existing) ? existing : `${existing}.`;
      const chain = (step.nodes || [])
        .map((n) => {
          const r = cleanBoardDisplayText(n.role);
          const w = cleanBoardDisplayText(n.word);
          return r && w ? `${r} diisi ${w}` : w || r;
        })
        .filter(Boolean)
        .join(', lalu ');
      const extraExplain = cleanBoardDisplayText(step.reason || _coachExplanation || '');
      if (chain) {
        return `Perhatikan urutan blok kalimat yang tepat dari kiri ke kanan: ${chain}.${extraExplain ? ` ${extraExplain.split(/(?<=[.!?])\s+/)[0]}` : ''}`.replace(/\.{2,}/g, '.').trim();
      }
      const formulaHint = cleanBoardDisplayText(step.rightText || step.text || '');
      return `Perhatikan susunan struktur kalimat untuk ${cleanBoardDisplayText(step.title || topicTitle)}: ${formulaHint || extraExplain || 'letakkan setiap unsur kalimat tepat pada posisinya agar tidak bertabrakan'}.`.replace(/\.{2,}/g, '.').trim();
    }
    case 'table': {
      if (existingWords >= 8) return /[.!?。！？]$/.test(existing) ? existing : `${existing}.`;
      const rowSummaries = (step.tableRows || [])
        .slice(0, 4)
        .map((r) => r.map((c) => cleanBoardDisplayText(c)).filter(Boolean).slice(0, 3).join(', '))
        .filter(Boolean)
        .join('. Berikutnya: ');
      return rowSummaries
        ? `${cleanBoardDisplayText(step.title || 'Contoh nyata di papan')}: ${rowSummaries}.`.trim()
        : `${cleanBoardDisplayText(step.title || 'Perhatikan contoh di tabel ini')}.`.trim();
    }
    case 'trap_vs_fix': {
      const wrongClean = cleanBoardDisplayText(step.wrongText || '');
      const rightClean = cleanBoardDisplayText(step.rightText || '');
      const narLow = existing.toLowerCase();
      const coversWrong = !wrongClean || narLow.includes(wrongClean.toLowerCase().slice(0, 14));
      const coversRight = !rightClean || narLow.includes(rightClean.toLowerCase().slice(0, 14));
      if (existingWords >= 10 && coversWrong && coversRight) {
        return /[.!?。！？]$/.test(existing) ? existing : `${existing}.`;
      }
      const why = step.reason ? ` Alasannya: ${cleanBoardDisplayText(step.reason)}.` : '';
      return `Hindari kesalahan seperti ${wrongClean || 'bentuk yang keliru'}. Yang benar adalah ${rightClean}.${why}`.replace(/\.{2,}/g, '.').trim();
    }
    case 'highlight_callout':
      if (existingWords >= 6) return /[.!?。！？]$/.test(existing) ? existing : `${existing}.`;
      return `Ingat kuncinya: ${cleanBoardDisplayText(step.highlightPhrase || step.text || step.title || topicTitle)}.`.trim();
    case 'tone_wave':
      return `Amati gelombang nada untuk ${cleanBoardDisplayText(step.text || step.title)} dan ikuti naik turunnya garis biru saat membaca ${cleanBoardDisplayText(step.reading || '')}.`.trim();
    case 'checkpoint':
      return `Sekarang coba jawab latihan singkat ini: ${cleanBoardDisplayText(step.text || 'pilih bentuk kalimat yang benar')}.`.trim();
    default:
      return existing || `${cleanBoardDisplayText(step.title || topicTitle)}. ${cleanBoardDisplayText(step.text || step.reason || '')}`.trim();
  }
}

function computeStepDurationMs(
  step: WhiteboardStepCommand,
  spokenNarration: string
): number {
  const words = spokenNarration.split(/\s+/).filter(Boolean).length;
  // ~135 WPM (440ms per word) beginner-friendly calm teaching cadence + visual reading buffer
  if (step.kind === 'heading') {
    return Math.max(2400, Math.min(5500, words * 420 + 900));
  }
  if (step.kind === 'kanji_grid') {
    const strokes = step.strokeCount || step.strokePaths?.length || 4;
    return Math.max(5200, Math.min(13000, Math.max(strokes * 1200 + 1200, words * 430 + 1000)));
  }
  if (
    step.kind === 'rough_scene' ||
    step.kind === 'metaphor_scene' ||
    step.kind === 'mind_map' ||
    step.kind === 'timeline_track' ||
    step.kind === 'formula_blocks' ||
    step.kind === 'contrast_scale' ||
    step.kind === 'syntax_flow'
  ) {
    const shapeCount =
      step.shapes?.length ||
      step.nodes?.length ||
      step.branches?.length ||
      step.timelineEvents?.length ||
      step.blocks?.length ||
      4;
    return Math.max(4600, Math.min(13000, Math.max(words * 440 + 800, shapeCount * 750 + 1000)));
  }
  if (step.kind === 'table') {
    const rowCount = step.tableRows?.length || 2;
    return Math.max(4000, Math.min(12000, Math.max(words * 440 + 800, rowCount * 950 + 800)));
  }
  return Math.max(3000, Math.min(14000, words * 440 + 900));
}

/**
 * Membangun sketsa vektor dinamis (`rough_scene`) langsung dari data pertanyaan saat AI
 * tidak mengirim array `shapes` eksplisit — TANPA kata template statis apa pun.
 */
function synthesizeTopicSpecificScene(
  boardState: BoardDynamicDataSubset,
  sampleSentence: string,
  wrongSentence: string
): WhiteboardStepCommand | null {
  const title = (boardState.topicTitle || '').trim();
  const searchBlob = `${title} ${boardState.patternFormula || ''} ${boardState.coachExplanation || ''} ${sampleSentence} ${wrongSentence}`.toLowerCase();

  // SSW / Tokutei Ginou domain diagrams (5S, Ho-Ren-So, KYT, Kaigo, Food HACCP, Keigo)
  if (/\b5\s*s\b|seiri|seiton|seiso|seiketsu|shitsuke|整理|整頓/.test(searchBlob)) {
    return {
      id: 'wb_ssw_5s_scene',
      kind: 'rough_scene',
      column: 'left',
      phaseIndex: 2,
      title: 'Siklus 5S Pabrik & Kerja Jepang',
      caption: '1. Seiri → 2. Seiton → 3. Seiso → 4. Seiketsu → 5. Shitsuke',
      spokenNarration: 'Lihat alur 5S di papan tulis. Pertama Seiri pilah barang perlu. Kedua Seiton rapikan posisi. Ketiga Seiso bersihkan area. Keempat Seiketsu standarkan, lalu kelima Shitsuke biasakan setiap hari.',
      width: 560,
      height: 245,
      shapes: [
        { op: 'rect', x: 14, y: 18, w: 152, h: 72, fill: '#DBEAFE', stroke: '#1D4ED8', label: '1. 整理 Seiri', sublabel: 'Pilah & singkirkan' },
        { op: 'arrow', x1: 168, y1: 54, x2: 196, y2: 54, stroke: '#0F172A', strokeWidth: 2.5 },
        { op: 'rect', x: 200, y: 18, w: 152, h: 72, fill: '#DCFCE7', stroke: '#15803D', label: '2. 整頓 Seiton', sublabel: 'Susun rapi & label' },
        { op: 'arrow', x1: 354, y1: 54, x2: 382, y2: 54, stroke: '#0F172A', strokeWidth: 2.5 },
        { op: 'rect', x: 386, y: 18, w: 156, h: 72, fill: '#FEF3C7', stroke: '#B45309', label: '3. 清掃 Seiso', sublabel: 'Bersihkan & cek' },
        { op: 'curve', points: [[464, 92], [440, 114], [156, 114], [152, 134]], stroke: '#475569', strokeWidth: 2, dashed: true },
        { op: 'arrow', x1: 160, y1: 120, x2: 152, y2: 136, stroke: '#0F172A', strokeWidth: 2.5 },
        { op: 'rect', x: 56, y: 140, w: 194, h: 72, fill: '#FCE7F3', stroke: '#BE185D', label: '4. 清潔 Seiketsu', sublabel: 'Standar kebersihan' },
        { op: 'arrow', x1: 254, y1: 176, x2: 300, y2: 176, stroke: '#0F172A', strokeWidth: 2.5 },
        { op: 'rect', x: 304, y: 140, w: 194, h: 72, fill: '#EDE9FE', stroke: '#6D28D9', label: '5. 躾 Shitsuke', sublabel: 'Disiplin rutin harian' },
      ],
    };
  }

  if (/ho[-\s]?ren[-\s]?so|hourensou|報連相|lapor.*hubung.*konsultasi/i.test(searchBlob)) {
    return {
      id: 'wb_ssw_horenso_scene',
      kind: 'rough_scene',
      column: 'left',
      phaseIndex: 2,
      title: 'Prinsip Komunikasi Kerja 報連相 (Ho-Ren-So)',
      caption: 'Aturan wajib karyawan Tokutei Ginou bersama atasan (Senpai / Shunin)',
      spokenNarration: 'Mari kita pahami tiga pilar Ho Ren So di papan. Pertama Hokoku melapor hasil secepatnya terutama saat ada masalah. Kedua Renraku mengabari rekan kerja soal perubahan jadwal atau stok. Ketiga Sodan berkonsultasi sebelum bertindak jika ragu.',
      width: 560,
      height: 245,
      shapes: [
        { op: 'circle', x: 100, y: 96, r: 62, fill: '#DBEAFE', stroke: '#1D4ED8', label: '報告 Hokoku', sublabel: 'Lapor cepat' },
        { op: 'arrow', x1: 168, y1: 96, x2: 206, y2: 96, stroke: '#0F172A' },
        { op: 'circle', x: 280, y: 96, r: 62, fill: '#FEF3C7', stroke: '#B45309', label: '連絡 Renraku', sublabel: 'Kabari tim' },
        { op: 'arrow', x1: 348, y1: 96, x2: 386, y2: 96, stroke: '#0F172A' },
        { op: 'circle', x: 460, y: 96, r: 62, fill: '#DCFCE7', stroke: '#15803D', label: '相談 Sodan', sublabel: 'Konsultasi dulu' },
        { op: 'text', x: 40, y: 204, text: 'Rumus Emas: 悪い報告ほど早く! (Kabar buruk wajib dilapor paling cepat)', stroke: '#B91C1C', size: 'sm' },
      ],
    };
  }

  if (/\bkyt\b|kiken\s*yochi|bahaya\s*kerja|kecelakaan|keselamatan|安全|指差し/i.test(searchBlob)) {
    return {
      id: 'wb_ssw_kyt_scene',
      kind: 'rough_scene',
      column: 'left',
      phaseIndex: 2,
      title: 'Alur Keselamatan Kerja KYT & Yubisashi Kakunin',
      caption: 'Kiken Yochi Training sebelum mengoperasikan mesin pabrik',
      spokenNarration: 'Lihat alur pencegahan bahaya di papan. Langkah satu identifikasi potensi bahaya di sekitar mesin. Langkah dua tunjuk dengan jari dan ucapkan Yoshi secara lantang. Langkah tiga pastikan kunci pengaman terkunci sebelum menyalakan alat.',
      width: 560,
      height: 240,
      shapes: [
        { op: 'rect', x: 20, y: 40, w: 155, h: 86, fill: '#FEE2E2', stroke: '#DC2626', label: '1. 危険発見', sublabel: 'Temukan titik bahaya' },
        { op: 'arrow', x1: 180, y1: 83, x2: 202, y2: 83, stroke: '#1E293B' },
        { op: 'rect', x: 206, y: 40, w: 155, h: 86, fill: '#FEF3C7', stroke: '#D97706', label: '2. 指差し確認', sublabel: 'Tunjuk & ucap "Yoshi!"' },
        { op: 'arrow', x1: 366, y1: 83, x2: 388, y2: 83, stroke: '#1E293B' },
        { op: 'rect', x: 392, y: 40, w: 150, h: 86, fill: '#DCFCE7', stroke: '#15803D', label: '3. 安全作業', sublabel: 'Kerja aman 0 insiden' },
        { op: 'text', x: 28, y: 186, text: 'Frasa wajib SSW: "〜を確認しました、よし！" (Sudah dicek, siap/aman!)', stroke: '#0F172A', size: 'sm' },
      ],
    };
  }

  if (/kaigo|介護|lansia|perawat|transfer\s*kursi/i.test(searchBlob)) {
    return {
      id: 'wb_ssw_kaigo_scene',
      kind: 'rough_scene',
      column: 'left',
      phaseIndex: 2,
      title: 'Protokol Pendampingan Kaigo (介護) 3 Langkah',
      caption: 'Utamakan izin (Koe-kake) & martabat lansia sebelum menyentuh',
      spokenNarration: 'Dalam kerja Kaigo di Jepang, jangan pernah langsung mengangkat lansia tanpa aba aba. Pertama lakukan Koe kake menyapa dari depan sejajar mata. Kedua jelaskan tindakan dan minta izin. Ketiga dampingi perlahan sambil memantau ekspresi.',
      width: 560,
      height: 240,
      shapes: [
        { op: 'rect', x: 20, y: 36, w: 160, h: 84, fill: '#FCE7F3', stroke: '#BE185D', label: '1. 声かけ Koe-kake', sublabel: 'Sapa sejajar mata' },
        { op: 'arrow', x1: 184, y1: 78, x2: 204, y2: 78, stroke: '#1E293B' },
        { op: 'rect', x: 208, y: 36, w: 156, h: 84, fill: '#E0F2FE', stroke: '#0369A1', label: '2. 同意 Izin', sublabel: '"いいですか？"' },
        { op: 'arrow', x1: 368, y1: 78, x2: 388, y2: 78, stroke: '#1E293B' },
        { op: 'rect', x: 392, y: 36, w: 150, h: 84, fill: '#DCFCE7', stroke: '#15803D', label: '3. 移乗 Bantuan', sublabel: 'Bantu pelan & aman' },
        { op: 'text', x: 24, y: 184, text: 'Contoh sopan: 「今から車椅子に移りますよ。よろしいですか？」', stroke: '#1E293B', size: 'sm' },
      ],
    };
  }

  if (/haccp|makanan|minuman|sanitasi|kebersihan\s*pangan|食品/i.test(searchBlob)) {
    return {
      id: 'wb_ssw_haccp_scene',
      kind: 'rough_scene',
      column: 'left',
      phaseIndex: 2,
      title: 'Zona Steril Pengolahan Pangan (HACCP SSW)',
      caption: 'Pemisahan zona kotor & zona bersih agar terhindar kontaminasi silang',
      spokenNarration: 'Lihat alur higienitas pabrik makanan Jepang. Pertama cuci tangan 30 detik dan bersihkan seragam dengan roller rambut. Kedua patuhi kontrol suhu di bawah 10 derajat untuk bahan dingin dan di atas 75 derajat saat memasak. Ketiga pisahkan pisau bahan mentah dan matang.',
      width: 560,
      height: 240,
      shapes: [
        { op: 'rect', x: 20, y: 38, w: 158, h: 84, fill: '#E0F2FE', stroke: '#0284C7', label: '1. 手洗い・ローラー', sublabel: 'Cuci & roller 30 dtk' },
        { op: 'arrow', x1: 182, y1: 80, x2: 202, y2: 80, stroke: '#1E293B' },
        { op: 'rect', x: 206, y: 38, w: 158, h: 84, fill: '#FEF3C7', stroke: '#D97706', label: '2. 温度管理', sublabel: 'Dingin <10°C / Masak >75°C' },
        { op: 'arrow', x1: 368, y1: 80, x2: 388, y2: 80, stroke: '#1E293B' },
        { op: 'rect', x: 392, y: 38, w: 150, h: 84, fill: '#DCFCE7', stroke: '#15803D', label: '3. 交差汚染防止', sublabel: 'Pisah mentah & matang' },
        { op: 'text', x: 24, y: 184, text: 'Prinsip SSW Food: つけない (Jangan tempel) · 増やさない · やっつける', stroke: '#0F172A', size: 'sm' },
      ],
    };
  }

  if (/pythagor|pythagoras|hypotenuse|teorema\s*pythag|segitiga\s*siku|right\s*triangle/i.test(searchBlob)) {
    return {
      id: 'wb_pythagorean_scene',
      kind: 'rough_scene',
      column: 'left',
      phaseIndex: 2,
      title: 'Pythagorean Theorem Visual Triangle',
      caption: 'Right Triangle (90 deg): a^2 + b^2 = c^2',
      spokenNarration: 'Look at the right triangle on the whiteboard. Side a and side b meet at 90 degrees, and squaring both adds up to hypotenuse c squared.',
      width: 560,
      height: 240,
      shapes: [
        { op: 'polygon', points: [[155, 42], [155, 182], [385, 182]], fill: '#EFF6FF', stroke: '#1D4ED8' },
        { op: 'rect', x: 155, y: 162, w: 20, h: 20, fill: '#DBEAFE', stroke: '#1D4ED8' },
        { op: 'text', x: 180, y: 177, text: '90°', stroke: '#1D4ED8', size: 'sm' },
        { op: 'text', x: 112, y: 118, text: 'a = 3', stroke: '#15803D', size: 'md' },
        { op: 'text', x: 255, y: 206, text: 'b = 4', stroke: '#1D4ED8', size: 'md' },
        { op: 'text', x: 282, y: 98, text: 'c = 5', stroke: '#DC2626', size: 'md' },
        { op: 'rect', x: 398, y: 58, w: 146, h: 96, fill: '#FEF3C7', stroke: '#D97706', label: 'a² + b² = c²', sublabel: '3² + 4² = 5²' },
      ],
    };
  }

  const isStaticStateSide = (s: string) =>
    /\b(am\s*\/?\s*is|am.*is.*are|to\s*be|nominal|sifat|status|kondisi|identitas|adjective|foto|diam|selesai)\b/i.test(s);
  const isActiveMotionSide = (s: string) =>
    /\b(do\s*\/?\s*does|do.*does|did|verbal|aksi|aktivitas|kerja|verb\s*1|kebiasaan|video|berjalan|nyambung|present\s*perfect)\b/i.test(s);
  const isTenseContrastTopic =
    /\b(simple\s*past|present\s*perfect|past\s*continuous|past\s*perfect)\b/i.test(searchBlob) &&
    /\b(vs|versus|dan|atau|beda|perbedaan)\b/i.test(searchBlob);

  const pickSmpTheme = (): NonNullable<WhiteboardStepCommand['sceneTheme']> | null => {
    if (isTenseContrastTopic || /\b(since|for\b|already|yet|ago|yesterday|sudah\s*terjadi|garis\s*waktu)\b/i.test(searchBlob)) {
      return 'bridge_timeline';
    }
    if (/\b(am|is|are|to\s*be)\b/i.test(searchBlob) && /\b(do|does|did)\b/i.test(searchBlob)) {
      return 'camera_vs_video';
    }
    if (/always|usually|often|sometimes|rarely|never|modal|must|should|might|could|persen|frekuensi|tingkat\s*keyakinan/i.test(searchBlob)) {
      return 'battery_meter';
    }
    if (/passive|aktif.*pasif|pelaku|objek|spotlight|sorot|は\s*vs\s*が|partikel\s*(?:wa|ga|は|が)/i.test(searchBlob)) {
      return 'stage_spotlight';
    }
    if (/subject.*verb|agreement|he\/?she\/?it|i\/?you\/?they|pasangan|cocok|kunci/i.test(searchBlob)) {
      return 'key_and_lock';
    }
    if (/sopan|kasual|formal|informal|polite|casual|keigo|teineigo|izin|larangan|boleh/i.test(searchBlob)) {
      return 'traffic_light';
    }
    // Jangan memaksa analogi acak (RPG/Kereta) pada topik tata bahasa umum; pakai contrast_scale/formula_blocks yang lugas
    return null;
  };

  // Topik Preposisi Lokasi & Waktu (IN vs ON vs AT / に vs で) -> diagram zona visual berlapis yang sangat jelas bagi pemula!
  if (
    (/\bin\b.*\bon\b.*\bat\b/i.test(searchBlob) ||
      (/preposisi|lokasi|tempat|in\s*\/\s*on|pada\s+tempat/i.test(searchBlob) && /\b(?:in|on|at)\b/i.test(searchBlob))) &&
    !/kanji|hanzi/i.test(searchBlob)
  ) {
    return {
      id: 'wb_dynamic_location_zones',
      kind: 'rough_scene',
      column: 'left',
      phaseIndex: 2,
      title: 'Peta Cakupan Lokasi & Waktu: IN ⊃ ON ⊃ AT',
      caption: 'Makin ke dalam makin sempit & spesifik: Ruang Besar (IN) → Permukaan/Jalan (ON) → Titik Persis (AT)',
      highlightTerms: ['IN', 'ON', 'AT', 'in', 'on', 'at'],
      width: 560,
      height: 290,
      shapes: [
        { op: 'rect', x: 24, y: 14, w: 512, h: 66, fill: '#DBEAFE', stroke: '#1D4ED8', label: '1. IN — Wilayah / Ruang Tertutup (Paling Luas)', sublabel: 'Negara, kota, dalam ruangan: in Jakarta, in the room' },
        { op: 'arrow', x1: 280, y1: 82, x2: 280, y2: 100, stroke: '#1E293B' },
        { op: 'rect', x: 76, y: 102, w: 408, h: 66, fill: '#FEF3C7', stroke: '#D97706', label: '2. ON — Permukaan / Nama Jalan (Sedang)', sublabel: 'Benda menempel permukaan, jalan: on the table, on Sudirman St.' },
        { op: 'arrow', x1: 280, y1: 170, x2: 280, y2: 188, stroke: '#1E293B' },
        { op: 'rect', x: 132, y: 190, w: 296, h: 66, fill: '#DCFCE7', stroke: '#15803D', label: '3. AT — Titik Lokasi / Jam Persis (Paling Sempit)', sublabel: 'Alamat bernomor, pintu, jam: at 10 Sudirman, at 7 AM' },
        { op: 'text', x: 24, y: 276, text: 'Prinsip Corong: Besar/Kota (IN) → Permukaan/Jalan (ON) → Titik Spesifik (AT)', stroke: '#0F172A', size: 'sm' },
      ],
      spokenNarration:
        'Lihat peta corong lokasi ini dari yang paling luas di atas hingga yang paling spesifik di bawah. Kotak biru paling atas adalah IN untuk ruang tertutup atau wilayah geografis besar seperti in Jakarta atau in the room. Kotak oranye di tengah adalah ON untuk benda yang menyentuh permukaan dan nama jalan tanpa nomor seperti on the table atau on Sudirman Street. Kotak hijau paling bawah adalah AT untuk titik lokasi atau jam yang sangat spesifik seperti at 10 Sudirman atau at 7 AM.',
    };
  }

  // Topik kompatibilitas To Be vs Kata Kerja (e.g., "I am agree", To Be + Adj/Noun/Verb ing/Verb 3 vs Verb 1) -> diagram slot struktural, bukan analogi RPG/kamera!
  if (
    !/\b(?:do|does|did)\b/i.test(searchBlob) &&
    ((/\b(?:agree|work|study|eat|go|know|want|believe)\b/i.test(searchBlob) && /\b(?:am|is|are|to\s*be)\b/i.test(searchBlob)) ||
      /\b(?:verb\s*1|verb[\s-]?ing|verb\s*3|to\s*be\s*\+\s*verb)\b/i.test(searchBlob))
  ) {
    const cleanSample = cleanBoardDisplayText(sampleSentence || 'I agree with you.');
    const cleanWrong = cleanBoardDisplayText(wrongSentence || 'I am agree with you.');
    return {
      id: 'wb_dynamic_tobe_slots',
      kind: 'formula_blocks',
      column: 'left',
      phaseIndex: 2,
      title: 'Peta Slot Sah To Be vs Verb 1 Aktif',
      caption: 'To Be hanya sah dengan Kata Sifat, Kata Benda/Lokasi, Verb ing, atau Verb 3 (pasif) — BUKAN Verb 1',
      rightText: cleanSample,
      wrongText: cleanWrong,
      highlightTerms: ['Verb ing', 'Verb 3', 'Verb 1', 'To Be', 'Adjective', cleanSample],
      blocks: [
        { role: 'Subjek + Verb 1', token: 'I agree / work', note: 'Kata kerja aktif langsung, tanpa To Be', color: '#10B981' },
        { role: 'To Be + Sifat/Benda', token: 'I am ready / a student', note: 'Kondisi, sifat, profesi, atau lokasi', color: '#0EA5E9' },
        { role: 'To Be + Verb ing', token: 'I am working', note: 'Aksi yang sedang berlangsung sekarang', color: '#8B5CF6' },
        { role: 'To Be + Verb 3', token: 'It is agreed', note: 'Kalimat pasif (dikenai tindakan)', color: '#F59E0B' },
      ],
    };
  }

  const strippedVsTitle = stripComparisonFluff(title);
  const explicitPairPrefix = /^(?:perbedaan|bedanya|beda|perbandingan|membandingkan|antara)\s+/i.test(title);
  const vsMatch = strippedVsTitle.match(
    explicitPairPrefix
      ? /^(.+?)\s+(?:vs\.?|versus|dan|sama|dengan|atau|≠|\/)\s+(.+?)$/i
      : /^(.+?)\s+(?:vs\.?|versus|lawan|dibanding|≠)\s+(.+?)$/i
  );

  if (boardState.pairData) {
    const tA =
      cleanBoardDisplayText(boardState.pairData.termA)
        .replace(/^(?:bedah tuntas|membedah|kupas tuntas|perbedaan|bedanya|dari nol|memahami|penggunaan|arti)\s+/i, '')
        .replace(/\s+(?:dari nol|untuk pemula|secara lengkap|bahasa inggris|bahasa jepang|di papan)$/i, '')
        .trim() ||
      cleanBoardDisplayText(boardState.pairData.termA) ||
      'Konsep A';
    const dA = cleanBoardDisplayText(boardState.pairData.descA);
    const tB =
      cleanBoardDisplayText(boardState.pairData.termB)
        .replace(/^(?:bedah tuntas|membedah|kupas tuntas|perbedaan|bedanya|dari nol|memahami|penggunaan|arti)\s+/i, '')
        .replace(/\s+(?:dari nol|untuk pemula|secara lengkap|bahasa inggris|bahasa jepang|di papan)$/i, '')
        .trim() ||
      cleanBoardDisplayText(boardState.pairData.termB) ||
      'Konsep B';
    const dB = cleanBoardDisplayText(boardState.pairData.descB);
    const keyAn = cleanBoardDisplayText(boardState.pairData.keyAnalogy || boardState.patternFormula || title);
    const theme = pickSmpTheme();
    if (!theme) {
      return {
        id: 'wb_dynamic_contrast',
        kind: 'contrast_scale',
        column: 'left',
        phaseIndex: 2,
        title: `Perbandingan Struktural: ${tA} vs ${tB}`,
        termA: tA,
        descA: dA || cleanBoardDisplayText(boardState.patternFormula || ''),
        termB: tB,
        descB: dB || cleanBoardDisplayText(sampleSentence || ''),
        analogy: keyAn,
        highlightTerms: [tA, tB, sampleSentence].filter(Boolean),
      };
    }
    const isCamVid = theme === 'camera_vs_video';
    return {
      id: 'wb_dynamic_scene',
      kind: 'metaphor_scene',
      sceneTheme: theme,
      column: 'left',
      phaseIndex: 2,
      title: cleanBoardDisplayText(`Analogi Visual: ${tA} vs ${tB}`),
      caption: cleanBoardDisplayText(boardState.patternFormula || title),
      analogy: keyAn,
      metaphorCenterLabel: isCamVid ? 'Foto Snapshot vs Video Reels' : `${tA} ↔ ${tB}`,
      highlightTerms: [tA, tB, sampleSentence].filter(Boolean),
      leftPanel: {
        badge: isCamVid ? 'FOTO SNAPSHOT' : tA.slice(0, 14).toUpperCase(),
        title: tA,
        subtitle: dA || cleanBoardDisplayText(boardState.patternFormula || wrongSentence || 'Dipakai untuk kondisi, sifat, atau aturan pembanding pertama.'),
        example: wrongSentence || undefined,
        icon: isCamVid ? 'camera' : theme === 'key_and_lock' ? 'key' : 'star',
        accentColor: '#0284C7',
        bgColor: '#E0F2FE',
      },
      rightPanel: {
        badge: isCamVid ? 'VIDEO AKSI' : tB.slice(0, 14).toUpperCase(),
        title: tB,
        subtitle: dB || cleanBoardDisplayText(sampleSentence || 'Dipakai untuk aksi aktif, perubahan proses, atau pasangan kedua.'),
        example: sampleSentence || undefined,
        icon: isCamVid ? 'video' : theme === 'key_and_lock' ? 'lock' : 'bolt',
        accentColor: '#15803D',
        bgColor: '#DCFCE7',
      },
    };
  }

  if (vsMatch) {
    const cleanSide = (s: string) => {
      const cleaned = cleanBoardDisplayText(s)
        .replace(/^(?:perbedaan|bedanya|beda|perbandingan|membandingkan|antara|penggunaan|arti|cara\s+menghitung)\s+/i, '')
        .replace(/\s*(?:itu\s+)?(?:apa|gimana|bagaimana|ya|dong|sih|nih|secara\s+visual|\?)+$/gi, '')
        .trim();
      if (cleaned.length <= 44) return cleaned;
      return cleaned.slice(0, 44).replace(/\s+\S*$/, '').trim() || cleaned.slice(0, 44);
    };
    let leftTerm = cleanSide(vsMatch[1]) || 'Bentuk 1';
    let rightTerm = cleanSide(vsMatch[2]) || 'Bentuk 2';
    const footNote = cleanBoardDisplayText(boardState.patternFormula || sampleSentence || title);
    const theme = pickSmpTheme();
    if (!theme) {
      return {
        id: 'wb_dynamic_contrast',
        kind: 'contrast_scale',
        column: 'left',
        phaseIndex: 2,
        title: `Perbandingan Tepat: ${leftTerm} vs ${rightTerm}`,
        termA: leftTerm,
        descA: cleanBoardDisplayText(boardState.patternFormula || title),
        termB: rightTerm,
        descB: cleanBoardDisplayText(sampleSentence || wrongSentence || title),
        analogy: footNote,
        highlightTerms: [leftTerm, rightTerm, sampleSentence].filter(Boolean),
      };
    }
    const isCamVid = theme === 'camera_vs_video';
    if (isCamVid && isActiveMotionSide(leftTerm) && isStaticStateSide(rightTerm)) {
      const tmp = leftTerm;
      leftTerm = rightTerm;
      rightTerm = tmp;
    }
    return {
      id: 'wb_dynamic_scene',
      kind: 'metaphor_scene',
      sceneTheme: theme,
      column: 'left',
      phaseIndex: 2,
      title: `Perbandingan Visual: ${leftTerm} vs ${rightTerm}`,
      caption: cleanBoardDisplayText(title),
      analogy: footNote || `${leftTerm} berbeda fungsi dengan ${rightTerm} dalam kalimat.`,
      metaphorCenterLabel: isCamVid ? 'Kondisi vs Aksi' : `${leftTerm} vs ${rightTerm}`,
      highlightTerms: [leftTerm, rightTerm, sampleSentence].filter(Boolean),
      leftPanel: {
        badge: isCamVid ? 'FOTO KONDISI' : leftTerm.slice(0, 14).toUpperCase(),
        title: leftTerm,
        subtitle: /am|is|are|to\s*be|sifat|status|kondisi/i.test(leftTerm)
          ? 'Untuk kondisi, sifat, profesi, atau Verb ing / Verb 3'
          : cleanBoardDisplayText(boardState.patternFormula || `Aturan penggunaan "${leftTerm}" secara tepat dalam kalimat.`),
        example: wrongSentence || sampleSentence || undefined,
        icon: isCamVid ? 'camera' : theme === 'key_and_lock' ? 'key' : 'star',
        accentColor: '#0369A1',
        bgColor: '#E0F2FE',
      },
      rightPanel: {
        badge: isCamVid ? 'VIDEO AKSI' : rightTerm.slice(0, 14).toUpperCase(),
        title: rightTerm,
        subtitle: /do|does|did|aksi|aktivitas|kerja/i.test(rightTerm)
          ? 'Memakai kata kerja aktif (Verb 1) untuk kebiasaan atau aksi'
          : cleanBoardDisplayText(sampleSentence || `Pola pembanding "${rightTerm}" beserta konteks pemakaiannya.`),
        example: sampleSentence || undefined,
        icon: isCamVid ? 'video' : theme === 'key_and_lock' ? 'lock' : 'bolt',
        accentColor: '#15803D',
        bgColor: '#DCFCE7',
      },
    };
  }

  // Timeline / Tenses topics -> Visual Timeline Track
  if (/\b(?:tense|past|present|future|perfect|yesterday|tomorrow|already|since|for)\b|lampau|sekarang|masa\s*depan|garis\s*waktu/i.test(searchBlob)) {
    return {
      id: 'wb_dynamic_timeline',
      kind: 'timeline_track',
      column: 'left',
      phaseIndex: 2,
      title: `Garis Waktu Aksi: ${cleanBoardDisplayText(title).slice(0, 38)}`,
      caption: cleanBoardDisplayText(boardState.patternFormula || title),
      highlightTerms: [sampleSentence, title].filter(Boolean),
      timelineEvents: [
        {
          timeLabel: 'Lampau (Past)',
          title: 'Sudah terjadi',
          example: wrongSentence && /yesterday|did|was|were|ed\b/i.test(wrongSentence) ? wrongSentence : 'Yesterday / V2',
          icon: 'clock',
          color: '#0EA5E9',
          isActive: /past|lampau|yesterday/i.test(searchBlob),
        },
        {
          timeLabel: 'Sekarang (Now)',
          title: 'Sedang / Rutinitas',
          example: sampleSentence || cleanBoardDisplayText(boardState.patternFormula || 'Present / Do·Does'),
          icon: 'bolt',
          color: '#10B981',
          isActive: !/past|future|akan/i.test(searchBlob),
        },
        {
          timeLabel: 'Nanti (Future)',
          title: 'Akan dilakukan',
          example: 'Will / Going to',
          icon: 'target',
          color: '#F59E0B',
          isActive: /future|will|akan/i.test(searchBlob),
        },
      ],
    };
  }

  // Vocabulary families / 5W1H / Topic Mind Map
  if (/\b(?:what|where|when|who|why|how|5w1h|vocab|kosakata)\b|macam|jenis|kapan|fungsi|salam|sapaan|pilihan\s*kata/i.test(searchBlob)) {
    const rawBullets = splitExplanationIntoBullets(boardState.coachExplanation, boardState.patternFormula).slice(0, 4);
    const branchColors = ['#0EA5E9', '#10B981', '#F59E0B', '#EC4899'];
    const branchIcons = ['star', 'bolt', 'chat', 'target'];
    const branches =
      rawBullets.length >= 2
        ? rawBullets.map((b, i) => ({
            label: truncateDiagramLabel(b.split(/[:—–-]/)[0] || `Cabang ${i + 1}`, 22),
            sublabel: truncateDiagramLabel(b, 48),
            example: i === 0 && sampleSentence ? sampleSentence : undefined,
            icon: branchIcons[i % branchIcons.length],
            color: branchColors[i % branchColors.length],
          }))
        : [
            {
              label: 'Kapan Dipakai',
              sublabel: truncateDiagramLabel(boardState.patternFormula || cleanBoardDisplayText(title), 44),
              icon: 'clock',
              color: '#0EA5E9',
            },
            {
              label: 'Contoh Alami',
              sublabel: sampleSentence || cleanBoardDisplayText(title),
              icon: 'check',
              color: '#10B981',
            },
            {
              label: 'Hindari Jebakan',
              sublabel: wrongSentence || 'Cek subjek & kata kerja',
              icon: 'warn',
              color: '#EF4444',
            },
          ];
    return {
      id: 'wb_dynamic_mindmap',
      kind: 'mind_map',
      column: 'left',
      phaseIndex: 2,
      title: `Peta Pikiran: ${cleanBoardDisplayText(title).slice(0, 38)}`,
      caption: cleanBoardDisplayText(boardState.patternFormula || title),
      metaphorCenterLabel: truncateDiagramLabel(cleanBoardDisplayText(title), 24) || 'Topik Inti',
      highlightTerms: [sampleSentence, cleanBoardDisplayText(title)].filter(Boolean),
      branches,
    };
  }

  if (sampleSentence) {
    const cleanSample = cleanBoardDisplayText(sampleSentence);
    const cleanWrong = cleanBoardDisplayText(wrongSentence);
    const tokens = cleanSample.split(/\s+/).filter(Boolean).slice(0, 5);
    const rolesGuess = ['Subjek / Pelaku', 'Kunci / Penghubung', 'Kata Kerja / Inti', 'Objek / Pelengkap', 'Keterangan'];
    const blockColors = ['#0EA5E9', '#10B981', '#8B5CF6', '#F59E0B', '#EC4899'];
    return {
      id: 'wb_dynamic_blocks',
      kind: 'formula_blocks',
      column: 'left',
      phaseIndex: 2,
      title: `Rakit Puzzle Kalimat: ${cleanBoardDisplayText(title).slice(0, 36)}`,
      caption: cleanBoardDisplayText(boardState.patternFormula || title),
      rightText: cleanSample,
      wrongText: cleanWrong && cleanWrong !== cleanSample ? cleanWrong : undefined,
      highlightTerms: [...tokens.slice(0, 3), cleanSample],
      blocks: tokens.map((tok, idx) => ({
        role: rolesGuess[idx] || `Blok ${idx + 1}`,
        token: tok,
        note: idx === 1 ? 'Posisi penentu pola' : undefined,
        color: blockColors[idx % blockColors.length],
      })),
    };
  }

  return null;
}

function isPlainTwoBoxRoughScene(step: WhiteboardStepCommand): boolean {
  if (step.kind !== 'rough_scene' || !Array.isArray(step.shapes)) return false;
  const shapes = step.shapes;
  const sceneBlob = `${step.title || ''} ${step.caption || ''} ${shapes.map((s) => `${s.label || ''} ${s.sublabel || ''}`).join(' ')}`;
  if (/\b5\s*s\b|seiri|seiton|seiso|seiketsu|shitsuke|ho[-\s]?ren[-\s]?so|kyt|kaigo|haccp|pythagor/i.test(sceneBlob)) {
    return false;
  }
  const hasRichVectorPrimitives = shapes.some(
    (s) => s.op === 'polygon' || s.op === 'curve' || Boolean(s.icon) || Boolean(s.badge)
  );
  if (hasRichVectorPrimitives) return false;
  const containerShapes = shapes.filter((s) => s.op === 'rect' || s.op === 'circle' || s.op === 'ellipse');
  return containerShapes.length > 0 && containerShapes.length <= 2;
}

function stripComparisonFluff(raw: string): string {
  return cleanBoardDisplayText(raw || '')
    .replace(
      /^(?:bedah tuntas|membedah|kupas tuntas|perbedaan|bedanya|dari nol|memahami|penggunaan|arti)\s+/i,
      ''
    )
    .replace(
      /\s+(?:dari nol|untuk pemula|secara lengkap|bahasa inggris|bahasa jepang|di papan)$/i,
      ''
    )
    .replace(/\s*(?:itu\s+)?(?:apa|gimana|bagaimana|ya|dong|sih|nih|\?)+$/gi, '')
    .trim();
}

function splitTitleIntoPair(title: string): [string, string] | null {
  const cleaned = stripComparisonFluff(title);
  const m = cleaned.match(/^(.{2,34}?)\s+(?:vs\.?|versus|sama|dengan|lawan|dibanding)\s+(.{2,34})$/i);
  if (!m) return null;
  return [stripComparisonFluff(m[1]), stripComparisonFluff(m[2])];
}

function upgradePlainTwoBoxToRichVisual(
  raw: WhiteboardStepCommand,
  boardState: BoardDynamicDataSubset,
  shortTitle: string,
  sampleSentence: string,
  wrongSentence: string
): WhiteboardStepCommand {
  const shapes = Array.isArray(raw.shapes) ? raw.shapes : [];
  const containers = shapes.filter((s) => s.op === 'rect' || s.op === 'circle' || s.op === 'ellipse');
  const textShapes = shapes
    .filter((s) => s.op === 'text' && s.text)
    .map((s) => ({
      x: typeof s.x === 'number' ? s.x : 280,
      y: typeof s.y === 'number' ? s.y : 120,
      text: cleanBoardDisplayText(s.text),
    }))
    .filter((t) => Boolean(t.text));
  const noteTexts = textShapes.map((t) => t.text);
  if (containers.length >= 2) {
    const sortedContainers = [...containers].sort(
      (a, b) => (typeof a.x === 'number' ? a.x : 0) - (typeof b.x === 'number' ? b.x : 0)
    );
    const c1 = sortedContainers[0];
    const c2 = sortedContainers[1];
    const c1Left = typeof c1.x === 'number' ? c1.x : 0;
    const c1Right = c1Left + (typeof c1.w === 'number' ? c1.w : 230);
    const c2Left = typeof c2.x === 'number' ? c2.x : 280;
    const midX = (c1Right + c2Left) / 2 || 280;
    const leftTexts = textShapes.filter((t) => t.x <= midX).map((t) => t.text);
    const rightTexts = textShapes.filter((t) => t.x > midX).map((t) => t.text);
    const titlePair = splitTitleIntoPair(shortTitle || raw.title || '');
    const rawT1 =
      stripComparisonFluff(c1.label || c1.text || '') ||
      stripComparisonFluff(leftTexts[0] || '') ||
      stripComparisonFluff(boardState.pairData?.termA || '') ||
      titlePair?.[0] ||
      '';
    const rawT2 =
      stripComparisonFluff(c2.label || c2.text || '') ||
      stripComparisonFluff(rightTexts[0] || '') ||
      stripComparisonFluff(boardState.pairData?.termB || '') ||
      titlePair?.[1] ||
      '';
    if (!rawT1 || !rawT2) {
      return raw;
    }
    const t1 = rawT1;
    const d1 =
      cleanBoardDisplayText(c1.sublabel || leftTexts[1] || '') ||
      cleanBoardDisplayText(boardState.pairData?.descA || '');
    const t2 = rawT2;
    const d2 =
      cleanBoardDisplayText(c2.sublabel || rightTexts[1] || '') ||
      cleanBoardDisplayText(boardState.pairData?.descB || '');
    const combinedBlob = `${shortTitle} ${raw.title || ''} ${t1} ${d1} ${t2} ${d2} ${sampleSentence}`.toLowerCase();
    const isDoVsToBe =
      /\b(am|is|are|to\s*be|kondisi|sifat)\b/i.test(combinedBlob) &&
      /\b(do|does|did|aksi|aktivitas|kebiasaan)\b/i.test(combinedBlob);
    const theme: NonNullable<WhiteboardStepCommand['sceneTheme']> | null =
      isDoVsToBe
        ? 'camera_vs_video'
        : /\b(always|usually|often|sometimes|never|modal|must|should|persen|frekuensi)\b/i.test(combinedBlob)
          ? 'battery_meter'
          : /\b(past|perfect|lampau|sejak|waktu|tense|masa\s*lalu)\b/i.test(combinedBlob)
            ? 'bridge_timeline'
            : /\b(pasif|passive|fokus|sorot|partikel|wa\s+vs\s+ga|は|が)\b/i.test(combinedBlob)
              ? 'stage_spotlight'
              : /\b(he|she|it|pasangan|agreement|kunci|subject)\b/i.test(combinedBlob)
                ? 'key_and_lock'
                : null;
    const isCamVid = theme === 'camera_vs_video';
    if (!theme) {
      return {
        ...raw,
        kind: 'contrast_scale',
        sceneTheme: undefined,
        title: cleanBoardDisplayText(raw.title) || `Perbandingan: ${t1} vs ${t2}`,
        termA: t1,
        descA: d1 || cleanBoardDisplayText(boardState.patternFormula || ''),
        termB: t2,
        descB: d2 || cleanBoardDisplayText(sampleSentence || ''),
        analogy: noteTexts[0] || boardState.pairData?.keyAnalogy || cleanBoardDisplayText(raw.caption) || undefined,
        highlightTerms: [t1, t2, ...(raw.highlightTerms || []), sampleSentence].filter(Boolean).slice(0, 6),
      };
    }
    return {
      ...raw,
      kind: 'metaphor_scene',
      sceneTheme: theme,
      analogy: noteTexts[0] || boardState.pairData?.keyAnalogy || cleanBoardDisplayText(raw.caption) || undefined,
      metaphorCenterLabel: isCamVid ? 'Kamera Foto vs Video Aksi' : `${t1} vs ${t2}`,
      highlightTerms: [t1, t2, ...(raw.highlightTerms || []), sampleSentence].filter(Boolean).slice(0, 6),
      leftPanel: {
        badge: isCamVid ? 'MODE FOTO' : 'KONSEP 1',
        title: t1,
        subtitle: d1 || 'Fokus pada kondisi, sifat, atau keadaan',
        icon: isCamVid ? 'camera' : 'star',
        accentColor: c1.stroke || '#0369A1',
        bgColor: c1.fill || '#E0F2FE',
      },
      rightPanel: {
        badge: isCamVid ? 'MODE VIDEO' : 'KONSEP 2',
        title: t2,
        subtitle: d2 || 'Fokus pada aktivitas, gerakan, atau aksi nyata',
        example: sampleSentence || undefined,
        icon: isCamVid ? 'video' : 'bolt',
        accentColor: c2.stroke || '#15803D',
        bgColor: c2.fill || '#DCFCE7',
      },
    };
  }
  const single = containers[0];
  if (single && sampleSentence) {
    const tokens = cleanBoardDisplayText(sampleSentence).split(/\s+/).filter(Boolean).slice(0, 4);
    const colors = ['#0EA5E9', '#10B981', '#8B5CF6', '#F59E0B'];
    if (tokens.length >= 2) {
      return {
        ...raw,
        kind: 'formula_blocks',
        rightText: cleanBoardDisplayText(sampleSentence),
        wrongText: wrongSentence ? cleanBoardDisplayText(wrongSentence) : undefined,
        highlightTerms: [cleanBoardDisplayText(single.label || ''), ...tokens].filter(Boolean).slice(0, 6),
        blocks: tokens.map((tok, i) => ({
          role: i === 0 ? 'Kunci Awal' : `Blok ${i + 1}`,
          token: tok,
          color: colors[i % colors.length],
        })),
      };
    }
  }
  return raw;
}

function extractStepHighlightTerms(step: WhiteboardStepCommand, sampleSentence: string): string[] {
  const existing = Array.isArray(step.highlightTerms) ? step.highlightTerms.filter(Boolean) : [];
  if (existing.length >= 2) return existing.slice(0, 6);
  const pool = new Set<string>(existing);
  if (step.highlightPhrase) {
    const cleanHp = cleanBoardDisplayText(step.highlightPhrase);
    if (cleanHp.length >= 2 && cleanHp.length <= 36) pool.add(cleanHp);
  }
  if (sampleSentence && sampleSentence.length <= 42) pool.add(cleanBoardDisplayText(sampleSentence));
  if (step.termA) pool.add(cleanBoardDisplayText(step.termA));
  if (step.termB) pool.add(cleanBoardDisplayText(step.termB));
  if (step.leftPanel?.title) pool.add(step.leftPanel.title);
  if (step.rightPanel?.title) pool.add(step.rightPanel.title);
  const blob = `${step.title || ''} ${step.text || ''} ${(step.bullets || []).join(' ')}`;
  const quoted = blob.match(/["'「『]([^"'」』]{2,26})["'」』]/g) || [];
  quoted.forEach((q) => pool.add(q.replace(/["'「」『』]/g, '').trim()));
  const grammarTokens = blob.match(/\b(?:Am|Is|Are|Do|Does|Did|Have|Has|Will|Can|Should|Must|Always|Usually|Sometimes|Never|Past|Present|Perfect|Verb|Noun|Adjective)\b/gi) || [];
  grammarTokens.forEach((g) => pool.add(g));
  return Array.from(pool).filter((t) => t.length >= 2).slice(0, 6);
}

export function buildSourceMaterialsFromScenario(
  scenario: CallScenario,
  boardState: BoardDynamicDataSubset,
  uploadedMaterials: SourceMaterialPage[] = []
): SourceMaterialPage[] {
  const pages: SourceMaterialPage[] = [];

  pages.push({
    id: 'src_page_1',
    pageNumber: 1,
    badge: 'TOPIK AKTIF',
    title: boardState.topicTitle || scenario.titleId,
    subtitle: boardState.patternFormula || scenario.subtitleId,
    highlights: [
      cleanBoardDisplayText(boardState.patternFormula || ''),
      ...splitExplanationIntoBullets(cleanBoardDisplayText(boardState.coachExplanation || ''), boardState.patternFormula).slice(0, 2),
    ].filter(Boolean),
    promptToExplain: `Jelaskan lebih detail mengenai: ${boardState.topicTitle || scenario.titleId}`,
  });

  if (scenario.vocabPrereqs && scenario.vocabPrereqs.length > 0) {
    pages.push({
      id: 'src_page_2',
      pageNumber: 2,
      badge: 'SESI',
      title: scenario.titleId,
      subtitle: `${scenario.vocabPrereqs.length} butir terkait skenario`,
      highlights: scenario.vocabPrereqs
        .slice(0, 4)
        .map((v) => `${v.term}${v.reading ? ` (${v.reading})` : ''} — ${v.meaningId}`),
      promptToExplain: `Berikan contoh kalimat memakai ${scenario.vocabPrereqs
        .slice(0, 2)
        .map((v) => v.term)
        .join(' dan ')}`,
    });
  }

  uploadedMaterials.forEach((item, idx) => {
    pages.push({
      ...item,
      pageNumber: pages.length + 1 + idx,
    });
  });

  return pages;
}

function truncateDiagramLabel(text: string, maxLen = 28): string {
  const cleaned = cleanBoardDisplayText(text).replace(/\s+/g, ' ').trim();
  if (!cleaned) return '';
  if (cleaned.length <= maxLen) return cleaned;
  const sliced = cleaned.slice(0, maxLen - 1).trim();
  const lastSpace = sliced.lastIndexOf(' ');
  return (lastSpace > Math.floor(maxLen * 0.55) ? sliced.slice(0, lastSpace) : sliced).trim();
}

function synthesizeAlternativeVisualStep(params: {
  variantIndex: number;
  boardState: BoardDynamicDataSubset;
  uiAction?: VoiceUiAction;
  shortTitle: string;
  sampleSentence: string;
  targetLang: TargetLang;
}): WhiteboardStepCommand {
  const { variantIndex, boardState, uiAction, shortTitle, sampleSentence, targetLang } = params;
  const cycle = ((Math.max(1, variantIndex) - 1) % 6) + 1;

  const rawFormula = cleanBoardDisplayText(boardState.patternFormula || uiAction?.patternFormula || '');
  const correctOpt = cleanBoardDisplayText(boardState.quiz?.options?.find((o) => o.isCorrect)?.text || '');
  const wrongOpt = cleanBoardDisplayText(
    uiAction?.trapWrongSentence ||
      boardState.quiz?.options?.find((o) => !o.isCorrect)?.text ||
      ''
  );
  const rightExpr = cleanBoardDisplayText(
    uiAction?.rightWord || sampleSentence || correctOpt || rawFormula || shortTitle
  );
  const wrongExpr = cleanBoardDisplayText(
    uiAction?.wrongWord || wrongOpt || (targetLang === 'ja' ? 'Bentuk yang sering tertukar' : 'Kesalahan umum pemula')
  );
  const wrongReason = truncateDiagramLabel(
    cleanBoardDisplayText(uiAction?.trapWrongReason || 'Cek konteks, fungsi kata, dan polanya agar tidak keliru.'),
    56
  );
  const rightReason = truncateDiagramLabel(
    cleanBoardDisplayText(uiAction?.explanationText || boardState.coachExplanation || `Pola akurat untuk ${shortTitle}`),
    56
  );

  if (cycle === 1) {
    // Variant 1: Interactive Mind Map Radial
    return {
      id: `wb_alt_mindmap_${variantIndex}`,
      kind: 'mind_map',
      column: 'left',
      phaseIndex: 2,
      title: `Peta Pikiran Seru: ${truncateDiagramLabel(shortTitle, 32)}`,
      metaphorCenterLabel: truncateDiagramLabel(shortTitle, 24) || 'Konsep Inti',
      caption: 'Semua kunci penting bercabang dari satu ide utama di tengah.',
      highlightTerms: [shortTitle, rightExpr, wrongExpr].filter(Boolean).slice(0, 6),
      branches: [
        {
          label: 'Kunci Utama',
          sublabel: truncateDiagramLabel(rawFormula || rightReason, 44),
          icon: 'key',
          color: '#0EA5E9',
        },
        {
          label: 'Contoh Tepat',
          sublabel: truncateDiagramLabel(rightExpr, 38),
          example: rightExpr,
          icon: 'check',
          color: '#10B981',
        },
        {
          label: 'Jebakan Umum',
          sublabel: truncateDiagramLabel(wrongExpr, 38),
          example: wrongReason,
          icon: 'warn',
          color: '#EF4444',
        },
        {
          label: 'Analogi Cepat',
          sublabel: truncateDiagramLabel(boardState.pairData?.keyAnalogy || rightReason, 44),
          icon: 'star',
          color: '#F59E0B',
        },
      ],
      spokenNarration: `Sekarang kita ubah visualnya menjadi peta pikiran bercabang untuk ${shortTitle}! Lihat inti di tengah: cabang biru mengingatkan kunci utamanya yaitu ${rawFormula || rightReason}; cabang hijau memberi contoh yang tepat yaitu ${rightExpr}; dan cabang merah mengingatkan jebakan ${wrongExpr} supaya tidak tertukar.`,
    };
  }

  if (cycle === 2) {
    // Variant 2: Interlocking Puzzle Formula Blocks
    const palette = ['#0EA5E9', '#10B981', '#8B5CF6', '#F59E0B'];
    const rawTokens = (rightExpr || rawFormula)
      .split(/\s*(?:→|->|\+|｜|\||\/|\s+)\s*/)
      .map((t) => cleanBoardDisplayText(t))
      .filter((t) => t.length > 0 && t !== rightExpr);
    const blocks =
      rawTokens.length >= 2
        ? rawTokens.slice(0, 4).map((tok, i) => ({
            role: i === 0 ? 'Pembuka' : i === rawTokens.slice(0, 4).length - 1 ? 'Hasil / Akhir' : `Kunci ${i + 1}`,
            token: truncateDiagramLabel(tok, 18),
            note: i === 1 ? 'Penentu pola' : undefined,
            color: palette[i % palette.length],
          }))
        : [
            {
              role: '1. Situasi',
              token: truncateDiagramLabel(uiAction?.triggerWord || shortTitle, 18) || 'Konteks',
              color: palette[0],
            },
            {
              role: '2. Kunci Pola',
              token: truncateDiagramLabel(rawFormula || 'Pilih Pola', 18) || 'Aturan',
              color: palette[1],
            },
            {
              role: '3. Jadi Kalimat',
              token: truncateDiagramLabel(rightExpr, 22) || 'Bentuk Alami',
              color: palette[2],
            },
          ];

    return {
      id: `wb_alt_blocks_${variantIndex}`,
      kind: 'formula_blocks',
      column: 'left',
      phaseIndex: 2,
      title: `Puzzle Blok Pola: ${truncateDiagramLabel(shortTitle, 32)}`,
      rightText: rightExpr,
      wrongText: wrongExpr !== rightExpr ? wrongExpr : undefined,
      highlightTerms: [rightExpr, ...blocks.map((b) => b.token)].filter(Boolean).slice(0, 6),
      blocks,
      caption: 'Klip puzzle warna-warni dari kiri ke kanan sampai klik jadi kalimat alami.',
      spokenNarration: `Sekarang kita rakit dalam bentuk blok puzzle berwarna dari kiri ke kanan! Mulai dari ${blocks[0]?.token || 'bagian awal'}, disambung ${blocks[1]?.token || 'kunci pola'}, hingga membentuk ${rightExpr}. Pola ini gampang diingat karena tiap warna punya peran masing-masing.`,
    };
  }

  if (cycle === 3) {
    // Variant 3: Illustrated Metaphor / Focused Two-Side Contrast (no legacy rpg_stats)
    const lowerBlob = `${shortTitle} ${rawFormula} ${rightExpr}`.toLowerCase();
    const hasStative = /\b(?:agree|know|believe|like|want|understand|need|love|hate|xihuan)\b|喜欢/.test(lowerBlob);
    const theme: NonNullable<WhiteboardStepCommand['sceneTheme']> | null =
      /\b(?:always|usually|often|sometimes|never|modal|must|should|might)\b/.test(lowerBlob)
        ? 'battery_meter'
        : !hasStative && /\b(?:am|is|are|to\s*be)\b/.test(lowerBlob) && /\b(?:do|does|did)\b/.test(lowerBlob)
          ? 'camera_vs_video'
          : /\b(?:pasif|passive|fokus|sorot|は|が)\b/.test(lowerBlob)
            ? 'stage_spotlight'
            : null;
    if (!theme) {
      return {
        id: `wb_alt_metaphor_${variantIndex}`,
        kind: 'contrast_scale',
        column: 'left',
        phaseIndex: 2,
        title: `Perbandingan Jelas: ${truncateDiagramLabel(shortTitle, 30)}`,
        termA: truncateDiagramLabel(wrongExpr, 28) || 'Pola Jebakan',
        descA: wrongReason,
        termB: truncateDiagramLabel(rightExpr, 28) || 'Pola Akurat',
        descB: rightReason,
        analogy: boardState.pairData?.keyAnalogy || rightReason,
        highlightTerms: [rightExpr, wrongExpr, shortTitle].filter(Boolean).slice(0, 6),
        caption: 'Bandingkan pola tepat vs jebakan secara berdampingan.',
        spokenNarration: `Sekarang kita tampilkan perbandingan jernih kiri dan kanan! Di sisi kiri adalah jebakan umum yaitu ${wrongExpr}, karena ${wrongReason}. Di sisi kanan adalah bentuk yang akurat yaitu ${rightExpr}, karena ${rightReason}.`,
      };
    }
    return {
      id: `wb_alt_metaphor_${variantIndex}`,
      kind: 'metaphor_scene',
      sceneTheme: theme,
      column: 'left',
      phaseIndex: 2,
      title: `Perumpamaan Seru: ${truncateDiagramLabel(shortTitle, 30)}`,
      analogy: rightReason,
      metaphorCenterLabel: `${truncateDiagramLabel(shortTitle, 20)} Spotlight`,
      highlightTerms: [rightExpr, wrongExpr, shortTitle].filter(Boolean).slice(0, 6),
      leftPanel: {
        badge: 'YANG TEPAT ✓',
        title: truncateDiagramLabel(rightExpr, 28) || 'Pola Akurat',
        subtitle: rightReason,
        icon: 'star',
        accentColor: '#15803D',
        bgColor: '#DCFCE7',
      },
      rightPanel: {
        badge: 'HINDARI ✕',
        title: truncateDiagramLabel(wrongExpr, 28) || 'Pola Jebakan',
        subtitle: wrongReason,
        icon: 'warn',
        accentColor: '#DC2626',
        bgColor: '#FEE2E2',
      },
      caption: 'Bayangkan analogi visual ini supaya bedanya langsung nempel di kepala.',
      spokenNarration: `Kali ini kita ganti tampilannya memakai kartu perumpamaan visual! Di panel kiri dengan bintang hijau adalah pilihan tepat yaitu ${rightExpr}, karena ${rightReason}. Sedangkan di panel kanan adalah peringatan yang sering menjebak pemula yaitu ${wrongExpr}, karena ${wrongReason}.`,
    };
  }

  if (cycle === 4) {
    // Variant 4: Interactive Timeline Track
    return {
      id: `wb_alt_track_${variantIndex}`,
      kind: 'timeline_track',
      column: 'left',
      phaseIndex: 2,
      title: `Jalur Langkah Visual: ${truncateDiagramLabel(shortTitle, 30)}`,
      caption: 'Ikuti alur jalur langkah 1 → 2 → 3 sebelum kamu berbicara.',
      highlightTerms: [rightExpr, wrongExpr, shortTitle].filter(Boolean).slice(0, 6),
      timelineEvents: [
        {
          timeLabel: 'Langkah 1',
          title: 'Cek Konteks & Subjek',
          example: truncateDiagramLabel(uiAction?.triggerWord || shortTitle, 32),
          icon: 'target',
          color: '#0EA5E9',
          isActive: false,
        },
        {
          timeLabel: 'Langkah 2',
          title: 'Pilih Kunci Pola Tepat',
          example: truncateDiagramLabel(rightExpr, 36),
          icon: 'key',
          color: '#10B981',
          isActive: true,
        },
        {
          timeLabel: 'Langkah 3',
          title: 'Lolos Anti-Jebakan',
          example: `Hindari: ${truncateDiagramLabel(wrongExpr, 30)}`,
          icon: 'check',
          color: '#8B5CF6',
          isActive: false,
        },
      ],
      spokenNarration: `Kita ubah papan menjadi jalur tiga langkah berurutan! Langkah pertama cek konteks dan kata pemicunya. Langkah kedua langsung pasang bentuk yang tepat yaitu ${rightExpr}. Langkah ketiga pastikan kamu tidak terjebak bentuk keliru seperti ${wrongExpr}.`,
    };
  }

  if (cycle === 5) {
    // Variant 5: Interactive 2-Column Illustrated Contrast Scale
    return {
      id: `wb_alt_contrast_${variantIndex}`,
      kind: 'contrast_scale',
      column: 'left',
      phaseIndex: 2,
      title: `Timbangan Perbandingan: ${truncateDiagramLabel(shortTitle, 30) || 'Bentuk Tepat vs Keliru'}`,
      termA: truncateDiagramLabel(wrongExpr, 32) || 'Pola Kurang Tepat',
      descA: wrongReason || 'Sering dipakai terburu-buru tanpa cek konteks kalimat.',
      termB: truncateDiagramLabel(rightExpr, 32) || 'Pola Tepat',
      descB: rightReason || `Digunakan konsisten sesuai aturan ${shortTitle}.`,
      analogy: boardState.pairData?.keyAnalogy || 'Bandingkan kiri vs kanan sebelum memilih saat ngobrol!',
      highlightTerms: [rightExpr, wrongExpr].filter(Boolean).slice(0, 6),
      caption: 'Lihat timbangan kontras kiri vs kanan supaya langsung klik bedanya.',
      spokenNarration: `Sekarang kita ubah tampilannya ke kartu timbangan perbandingan visual! Di sisi kiri adalah bentuk yang sering keliru atau tertukar, yaitu ${wrongExpr || 'pola jebakan'}: ${wrongReason}. Di sisi kanan adalah bentuk yang tepat, yaitu ${rightExpr}: ${rightReason}. Bandingkan keduanya sambil dengarkan contoh penggunaan nyatanya.`,
    };
  }

  // Variant 4 (cycle === 4): Vertical Stepped Timeline (Rough Scene)
  return {
    id: `wb_alt_timeline_${variantIndex}`,
    kind: 'rough_scene',
    column: 'left',
    phaseIndex: 2,
    title: `Tangga Pemahaman: ${truncateDiagramLabel(shortTitle, 30)}`,
    caption: 'Tiga langkah cepat memeriksa kalimat sebelum diucapkan.',
    shapes: [
      { op: 'circle', cx: 56, cy: 52, r: 22, color: '#2563EB', fill: '#DBEAFE', label: '1' },
      { op: 'arrow', x1: 82, y1: 52, x2: 120, y2: 52, color: '#2563EB' },
      {
        op: 'rect',
        x: 126,
        y: 20,
        w: 442,
        h: 64,
        color: '#2563EB',
        fill: '#EFF6FF',
        label: truncateDiagramLabel(`Cek Topik: ${shortTitle}`, 34) || 'Kenali konteks kalimat',
        sublabel: truncateDiagramLabel(uiAction?.triggerWord ? `Kata kunci: ${uiAction.triggerWord}` : rightReason, 38) || 'Fokus pada maksud utama',
      },
      { op: 'circle', cx: 56, cy: 146, r: 22, color: '#059669', fill: '#D1FAE5', label: '2' },
      { op: 'arrow', x1: 82, y1: 146, x2: 120, y2: 146, color: '#059669' },
      {
        op: 'rect',
        x: 126,
        y: 114,
        w: 442,
        h: 64,
        color: '#059669',
        fill: '#ECFDF5',
        label: truncateDiagramLabel(`Gunakan: ${rightExpr}`, 34) || 'Pasang pola yang benar',
        sublabel: truncateDiagramLabel(rawFormula || rightReason, 38) || 'Susunan sesuai aturan resmi',
      },
      { op: 'circle', cx: 56, cy: 240, r: 22, color: '#D97706', fill: '#FEF3C7', label: '3' },
      { op: 'arrow', x1: 82, y1: 240, x2: 120, y2: 240, color: '#D97706' },
      {
        op: 'rect',
        x: 126,
        y: 208,
        w: 442,
        h: 64,
        color: '#D97706',
        fill: '#FFFBEB',
        label: truncateDiagramLabel(`Hindari: ${wrongExpr}`, 34) || 'Waspadai kesalahan umum',
        sublabel: truncateDiagramLabel(wrongReason, 38) || 'Jangan tertukar dengan bentuk jebakan',
      },
    ],
    spokenNarration: `Sekarang visualnya berbentuk tangga tiga langkah dari atas ke bawah! Langkah 1, cek konteks dari ${shortTitle}. Langkah 2, pakai bentuk yang akurat seperti ${rightExpr}. Langkah 3, periksa agar tidak terjebak kesalahan umum seperti ${wrongExpr}.`,
  };
}

function ensureAlternativeVisualOnSwitchRequest(params: {
  steps: WhiteboardSceneStep[];
  studentQuestions: StudentBoardQuestion[];
  boardState: BoardDynamicDataSubset;
  uiAction?: VoiceUiAction;
  shortTitle: string;
  sampleSentence: string;
  targetLang: TargetLang;
  finalizeStep: (raw: WhiteboardStepCommand, idx: number) => WhiteboardSceneStep;
}): void {
  const { steps, studentQuestions, boardState, uiAction, shortTitle, sampleSentence, targetLang, finalizeStep } = params;
  const settledSwitchReqs = studentQuestions.filter(
    (sq) => isVisualSwitchRequestText(sq.text) && !String(sq.tutorAnswer || '').trim().startsWith('⏳')
  );
  if (settledSwitchReqs.length === 0) return;

  const latestQuestion = studentQuestions[studentQuestions.length - 1];
  const latestIsSettledSwitch =
    latestQuestion &&
    isVisualSwitchRequestText(latestQuestion.text) &&
    !String(latestQuestion.tutorAnswer || '').trim().startsWith('⏳');
  if (!latestIsSettledSwitch) return;

  const switchCount = settledSwitchReqs.length;
  const diagramKinds = ['rough_scene', 'metaphor_scene', 'mind_map', 'timeline_track', 'formula_blocks', 'contrast_scale', 'syntax_flow'];
  const existingDiagramIndices = steps
    .map((s, idx) => (diagramKinds.includes(s.kind) ? idx : -1))
    .filter((idx) => idx >= 0);
  const existingDiagramIdx = existingDiagramIndices.length > 0 ? existingDiagramIndices[0] : -1;
  const existingDiagram = existingDiagramIdx >= 0 ? steps[existingDiagramIdx] : null;

  // Dedupe any secondary stacked diagram cards on switch requests so 1 rich visual stands clear
  for (let i = existingDiagramIndices.length - 1; i >= 1; i--) {
    steps.splice(existingDiagramIndices[i], 1);
  }

  // Preserve rich distinct archetypes explicitly generated by online AI if properly populated
  const isPopulatedDiagram = (st: WhiteboardSceneStep | null): boolean => {
    if (!st) return false;
    if (st.kind === 'mind_map') return Array.isArray(st.branches) && st.branches.length >= 2;
    if (st.kind === 'timeline_track') return Array.isArray(st.timelineEvents) && st.timelineEvents.length >= 2;
    if (st.kind === 'formula_blocks') return Array.isArray(st.blocks) && st.blocks.length >= 2;
    if (st.kind === 'contrast_scale' || st.kind === 'syntax_flow' || st.kind === 'metaphor_scene') return true;
    if (st.kind === 'rough_scene') {
      return (
        /wb_alt_tree_|wb_alt_timeline_/i.test(st.id) ||
        ((st.shapes?.filter((sh) => sh.op === 'rect' || sh.op === 'circle').length || 0) >= 4 &&
          (st.shapes?.filter((sh) => sh.op === 'arrow').length || 0) >= 2 &&
          hasDistinctVerticalHierarchy(st.shapes || []))
      );
    }
    return false;
  };
  const isCustomSwitchRich =
    existingDiagram &&
    isPopulatedDiagram(existingDiagram) &&
    ((switchCount === 1 && ['metaphor_scene', 'mind_map', 'contrast_scale', 'syntax_flow'].includes(existingDiagram.kind)) ||
      (switchCount === 2 && ['mind_map', 'timeline_track', 'formula_blocks', 'syntax_flow'].includes(existingDiagram.kind)) ||
      (switchCount >= 3 && ['timeline_track', 'formula_blocks', 'rough_scene'].includes(existingDiagram.kind)));

  if (isCustomSwitchRich) return;

  const altCmd = synthesizeAlternativeVisualStep({
    variantIndex: switchCount,
    boardState,
    uiAction,
    shortTitle,
    sampleSentence,
    targetLang,
  });
  const altStep = finalizeStep(altCmd, existingDiagramIdx >= 0 ? existingDiagramIdx : Math.min(2, steps.length));

  if (existingDiagramIdx >= 0) {
    steps[existingDiagramIdx] = altStep;
  } else {
    const kanjiIdx = steps.findIndex((s) => s.kind === 'kanji_grid');
    const headingIdx = steps.findIndex((s) => s.kind === 'heading');
    const insertAt = kanjiIdx >= 0 ? kanjiIdx + 1 : headingIdx >= 0 ? headingIdx + 1 : 0;
    steps.splice(insertAt, 0, altStep);
  }
}

function hasDistinctVerticalHierarchy(shapes: Array<{ y?: number; cy?: number }>): boolean {
  const ys = shapes
    .map((s) => (typeof s.y === 'number' ? s.y : typeof s.cy === 'number' ? s.cy : null))
    .filter((y): y is number => y !== null);
  if (ys.length < 4) return false;
  return Math.max(...ys) - Math.min(...ys) >= 130;
}

/**
 * Mengubah payload AI real-time / DynamicBoardState menjadi rencana adegan papan tulis
 * tanpa template statis — 100% mengikuti konteks pertanyaan murid.
 */
export function buildWhiteboardScenePlan(params: {
  boardState: BoardDynamicDataSubset;
  uiAction?: VoiceUiAction;
  scenario: CallScenario;
  targetLang: TargetLang;
  locale: LearnerLocale;
  studentQuestions?: StudentBoardQuestion[];
  uploadedMaterials?: SourceMaterialPage[];
}): WhiteboardScenePlan {
  const {
    boardState,
    uiAction,
    scenario,
    targetLang,
    studentQuestions = [],
    uploadedMaterials = [],
  } = params;

  const customPhases =
    Array.isArray(uiAction?.phaseLabels) && uiAction.phaseLabels.length >= 3
      ? uiAction.phaseLabels
      : null;

  const phaseLabels = customPhases || [
    '0 Mulai',
    '1 Konsep',
    '2 Sketsa',
    '3 Bedah',
    '4 Latihan',
  ];

  const steps: WhiteboardSceneStep[] = [];
  const shortTitle = (boardState.topicTitle || 'Topik Pertanyaan').trim();
  const rawSampleGlobal = (
    uiAction?.sampleTarget ||
    boardState.quiz?.options?.find((o) => o.isCorrect)?.text ||
    ''
  ).trim();
  const sampleSentenceGlobal = isDegenerateSampleText(rawSampleGlobal)
    ? (boardState.quiz?.options?.find((o) => o.isCorrect && !isDegenerateSampleText(o.text))?.text || '').trim()
    : rawSampleGlobal;
  const isWorkflowDiagramTopic =
    /\b5\s*s\b|seiri|seiton|seiso|seiketsu|shitsuke|整理|整頓|ho[-\s]?ren[-\s]?so|hourensou|報連相|\bkyt\b|kiken\s*yochi|kaigo|介護|haccp|pythagor|siklus|alur\s*kerja/i.test(
      `${shortTitle} ${boardState.patternFormula || ''}`
    );
  const isCharacterWritingTopic =
    (targetLang === 'ja' || targetLang === 'zh') &&
    !isWorkflowDiagramTopic &&
    (boardState.contextMode === 'magic_character' ||
      /kanji|hanzi|hiragana|katakana|huruf|karakter|aksara|tulis|goresan|coretan|stroke|kakijun/i.test(
        shortTitle
      ));

  const enforceSemanticVisualAlignment = (st: WhiteboardStepCommand): WhiteboardStepCommand => {
    if (st.kind !== 'metaphor_scene' && st.kind !== 'contrast_scale') return st;
    const isPastSide = (txt: string) => /\bsimple\s*past\b|\bpast\s*tense\b|\byesterday\b|\bago\b|\bv2\b|\bselesai\s*dulu\b|\bfoto\s*mati\b/i.test(txt);
    const isPerfectSide = (txt: string) => /\bpresent\s*perfect\b|\bhave\s*\/?\s*has\b|\bsince\b|\bfor\b|\bsudah\s*terhubung\b|\bvideo\s*berjalan\b/i.test(txt);
    const isStateSide = (txt: string) => /\bam\b|\bis\b|\bare\b|\bto\s*be\b|\badjective\b|\bsifat\b|\bstatus\b|\bkondisi\b|\bidentitas\b|\bdiam\b/i.test(txt);
    const isActionSide = (txt: string) => /\bdo\b|\bdoes\b|\bdid\b|\baksi\b|\baktivitas\b|\bkebiasaan\b|\bgerak\b/i.test(txt);

    const leftBlob = `${st.leftPanel?.title || ''} ${st.leftPanel?.subtitle || ''} ${st.termA || ''}`;
    const rightBlob = `${st.rightPanel?.title || ''} ${st.rightPanel?.subtitle || ''} ${st.termB || ''}`;
    const fullBlob = `${shortTitle} ${st.title || ''} ${leftBlob} ${rightBlob} ${st.analogy || ''}`;

    // 1. Topik perbandingan Tense (Simple Past vs Present Perfect) harus berbentuk Timeline kronologis (Dulu -> Terhubung Kini), bukan Kamera terbalik!
    if ((isPastSide(fullBlob) && isPerfectSide(fullBlob)) || /\b(simple\s*past|present\s*perfect)\b/i.test(shortTitle)) {
      const lpTitle = st.leftPanel?.title || st.termA || 'Simple Past';
      const rpTitle = st.rightPanel?.title || st.termB || 'Present Perfect';
      const pastPanel = isPastSide(lpTitle) ? st.leftPanel : isPastSide(rpTitle) ? st.rightPanel : st.leftPanel;
      const perfPanel = isPerfectSide(rpTitle) ? st.rightPanel : isPerfectSide(lpTitle) ? st.leftPanel : st.rightPanel;
      const cleanNar = st.spokenNarration && !/foto\s*mati|kamera/i.test(st.spokenNarration) ? st.spokenNarration : undefined;
      return {
        ...st,
        kind: 'timeline_track',
        title: `Garis Waktu: ${cleanBoardDisplayText(shortTitle).slice(0, 40)}`,
        caption: st.caption || 'Dari titik waktu selesai di masa lalu menuju efek hingga sekarang.',
        timelineEvents: [
          {
            timeLabel: 'Titik Lampau (Selesai)',
            title: pastPanel?.title || 'Simple Past (Verb 2)',
            example: pastPanel?.example || pastPanel?.subtitle || 'I visited Bali yesterday.',
            icon: 'clock',
            color: '#0284C7',
            isActive: false,
          },
          {
            timeLabel: 'Jembatan ke Sekarang',
            title: perfPanel?.title || 'Present Perfect (Have/Has + V3)',
            example: perfPanel?.example || perfPanel?.subtitle || 'I have visited Bali twice.',
            icon: 'bridge',
            color: '#10B981',
            isActive: true,
          },
        ],
        ...(cleanNar ? { spokenNarration: cleanNar } : { spokenNarration: undefined }),
      };
    }

    // 2. Pastikan camera_vs_video hanya dipakai untuk Kondisi/Status (Kamera Kiri) vs Aksi/Kebiasaan (Video Kanan) dengan orientasi konsisten
    const hasCameraThemeOrText =
      (st.kind === 'metaphor_scene' && (st.sceneTheme || 'camera_vs_video') === 'camera_vs_video') ||
      /\bkamera\b|\bvideo\b|foto\s*mati/i.test(fullBlob);
    if (hasCameraThemeOrText) {
      const hasCamLeft = st.leftPanel && st.rightPanel;
      const isStateVsActionContrast =
        /\b(do|does|did)\b/i.test(fullBlob) && /\b(am|is|are|to\s*be)\b/i.test(fullBlob);
      const isStativeVerbMistake = /\b(agree|know|want|like|believe|need|love|hate|xihuan)\b|喜欢/i.test(fullBlob);
      const legitStateAction =
        isStateVsActionContrast ||
        ((isStateSide(leftBlob) || isStateSide(rightBlob)) &&
          (isActionSide(leftBlob) || isActionSide(rightBlob)) &&
          !isStativeVerbMistake);
      if (!legitStateAction) {
        if (isStativeVerbMistake && /\b(am|is|are|to\s*be)\b/i.test(fullBlob)) {
          return {
            ...st,
            kind: 'formula_blocks',
            sceneTheme: undefined,
            title: 'Peta 4 Slot Sah: Verb 1 vs To Be',
            caption: 'To Be hanya sah untuk Sifat/Benda, Verb ing (sedang), atau Verb 3 (pasif) — BUKAN Verb 1 aktif!',
            rightText: boardState.sampleTarget || 'I agree with you.',
            wrongText: 'I am agree with you.',
            blocks: [
              { role: 'Subjek + Verb 1', token: 'I agree / work', note: 'Kata kerja aktif langsung, tanpa am/is/are', color: '#10B981' },
              { role: 'To Be + Sifat/Benda', token: 'I am happy / teacher', note: 'Untuk kata sifat, profesi, atau lokasi', color: '#0EA5E9' },
              { role: 'To Be + Verb ing', token: 'I am working', note: 'Aksi yang sedang berlangsung sekarang', color: '#8B5CF6' },
              { role: 'To Be + Verb 3', token: 'It is agreed', note: 'Kalimat pasif (dikenai tindakan)', color: '#F59E0B' },
            ],
            spokenNarration: undefined,
          };
        }
        if (
          /\b(he|she|it|he\/?she\/?it)\b/i.test(fullBlob) &&
          /\b(do|does|agreement|satuan|classifier)\b/i.test(fullBlob) &&
          !/\b(in|on|at|lokasi|tempat|posisi)\b/i.test(fullBlob)
        ) {
          const cleanLeft = st.leftPanel ? { ...st.leftPanel, badge: 'PEMICU SUBJEK', icon: 'key' } : undefined;
          const cleanRight = st.rightPanel ? { ...st.rightPanel, badge: 'KATA BANTU', icon: 'lock' } : undefined;
          return {
            ...st,
            sceneTheme: 'key_and_lock',
            metaphorCenterLabel: `${cleanLeft?.title || st.termA || 'Subjek'} ↔ ${cleanRight?.title || st.termB || 'Kata Kerja'}`,
            leftPanel: cleanLeft,
            rightPanel: cleanRight,
          };
        }
        // Jangan memaksa analogi RPG/kamera pada topik slot/perbandingan kata: konversi ke contrast_scale yang jernih!
        const leftDesc = [st.leftPanel?.subtitle, st.leftPanel?.example ? `Contoh: ${st.leftPanel.example}` : ''].filter(Boolean).join(' — ');
        const rightDesc = [st.rightPanel?.subtitle, st.rightPanel?.example ? `Contoh: ${st.rightPanel.example}` : ''].filter(Boolean).join(' — ');
        const stripCamTitle = (s?: string) => (s && !/kamera|video/i.test(s) ? s : '');
        return {
          ...st,
          kind: 'contrast_scale',
          title: stripCamTitle(st.title) || `Perbandingan ${shortTitle}`,
          termA: stripCamTitle(st.leftPanel?.title || st.termA) || 'Bentuk Tepat',
          descA: stripCamTitle(leftDesc || st.descA) || '',
          termB: stripCamTitle(st.rightPanel?.title || st.termB) || 'Pembanding',
          descB: stripCamTitle(rightDesc || st.descB) || '',
          analogy: stripCamTitle(st.analogy || st.caption) || undefined,
          spokenNarration: st.spokenNarration && !/foto|kamera|video/i.test(st.spokenNarration) ? st.spokenNarration : undefined,
        };
      }
      if (hasCamLeft && isActionSide(leftBlob) && isStateSide(rightBlob)) {
        return {
          ...st,
          leftPanel: {
            ...st.rightPanel!,
            badge: 'FOTO KONDISI',
            icon: 'camera',
            accentColor: '#0284C7',
            bgColor: '#E0F2FE',
          },
          rightPanel: {
            ...st.leftPanel!,
            badge: 'VIDEO AKSI',
            icon: 'video',
            accentColor: '#15803D',
            bgColor: '#DCFCE7',
          },
          termA: st.rightPanel!.title,
          termB: st.leftPanel!.title,
          metaphorCenterLabel: 'Kondisi vs Aksi',
        };
      }
    }
    return st;
  };

  const finalizeStep = (raw: WhiteboardStepCommand, idx: number): WhiteboardSceneStep => {
    const sanitized = sanitizeStepVisualFields(raw);
    const aligned = enforceSemanticVisualAlignment(sanitized);
    const narration = deriveStepSpokenNarration(aligned, shortTitle, boardState.coachExplanation || '', targetLang);
    const highlightTerms = extractStepHighlightTerms(aligned, sampleSentenceGlobal);
    const enriched: WhiteboardStepCommand = {
      ...aligned,
      highlightTerms,
      spokenNarration: narration,
    };
    return {
      ...enriched,
      id: aligned.id || `wb_step_${idx}`,
      tableRows: normalizeTableRows(aligned.tableRows),
      column: aligned.column || (idx % 2 === 1 && idx > 0 ? 'right' : 'left'),
      phaseIndex:
        typeof aligned.phaseIndex === 'number'
          ? aligned.phaseIndex
          : Math.min(phaseLabels.length - 1, idx + 1),
      durationMs: computeStepDurationMs(enriched, narration),
    };
  };

  let characterEntryForHeading: KakijunCharEntry | null = null;

  if (Array.isArray(uiAction?.whiteboardSteps) && uiAction.whiteboardSteps.length > 0) {
    let injectedEntry: KakijunCharEntry | null = null;
    uiAction.whiteboardSteps.forEach((raw, idx) => {
      if (raw.kind === 'kanji_grid') {
        const { step: enrichedKanji, entry } = enrichKanjiGridStep(raw, shortTitle, targetLang);
        injectedEntry = entry;
        characterEntryForHeading = entry;
        steps.push(finalizeStep(enrichedKanji, idx));
      } else if (raw.kind === 'note') {
        const cleanBullets = (Array.isArray(raw.bullets) ? raw.bullets : [])
          .map((b) => String(b || '').trim())
          .filter((b) => b && !isTrivialFillerBullet(b));
        if (cleanBullets.length < 2) {
          const backupBullets = splitExplanationIntoBullets(
            boardState.coachExplanation || raw.text || '',
            boardState.patternFormula || ''
          ).filter((b) => !isTrivialFillerBullet(b));
          backupBullets.forEach((b) => {
            if (!cleanBullets.includes(b)) cleanBullets.push(b);
          });
          if (boardState.patternFormula && !cleanBullets.some((b) => b.includes(boardState.patternFormula!))) {
            cleanBullets.unshift(`Pola Utama: ${boardState.patternFormula}`);
          }
          if (uiAction?.trapWrongReason && cleanBullets.length < 4 && !cleanBullets.some((b) => b.includes(uiAction.trapWrongReason!))) {
            cleanBullets.push(`Catatan Penting: ${uiAction.trapWrongReason}`);
          }
        }
        steps.push(
          finalizeStep(
            {
              ...raw,
              bullets: cleanBullets.length > 0 ? cleanBullets : raw.bullets,
            },
            idx
          )
        );
      } else if (raw.kind === 'rough_scene') {
        let patchedScene = raw;
        if (
          Array.isArray(patchedScene.graphNodes) &&
          patchedScene.graphNodes.length >= 2 &&
          (!Array.isArray(patchedScene.shapes) || patchedScene.shapes.length < 3)
        ) {
          const laidOut = layoutGraphToShapes({
            graphNodes: patchedScene.graphNodes,
            graphEdges: patchedScene.graphEdges,
            graphDirection: patchedScene.graphDirection,
            caption: patchedScene.caption,
          });
          if (laidOut.shapes.length >= 2) {
            patchedScene = {
              ...patchedScene,
              shapes: laidOut.shapes,
              width: patchedScene.width || laidOut.width,
              height: patchedScene.height || laidOut.height,
            };
          }
        }
        const shapesArr = Array.isArray(patchedScene.shapes) ? [...patchedScene.shapes] : [];
        const sceneText = `${shortTitle} ${raw.title || ''} ${shapesArr.map((s) => `${s.label || ''} ${s.text || ''}`).join(' ')}`;
        if (/\b5\s*s\b|seiri|seiton|seiso|seiketsu|shitsuke|整理|整頓/i.test(sceneText)) {
          const rect4 = shapesArr.find((s) => /4|seiketsu|清潔/i.test(s.label || ''));
          const rect5 = shapesArr.find((s) => /5|shitsuke|躾/i.test(s.label || ''));
          const arrowCount = shapesArr.filter((s) => s.op === 'arrow').length;
          const isBackwards5S = rect4 && rect5 && typeof rect4.x === 'number' && typeof rect5.x === 'number' && rect5.x < rect4.x;
          if (isBackwards5S || arrowCount < 3 || shapesArr.length < 5) {
            const crisp5S = synthesizeTopicSpecificScene(boardState, sampleSentenceGlobal, uiAction?.trapWrongSentence || '');
            if (crisp5S) {
              patchedScene = {
                ...crisp5S,
                title: raw.title || crisp5S.title,
                spokenNarration: raw.spokenNarration || crisp5S.spokenNarration,
              };
            }
          }
        } else if (/pythagor|pythagoras|hypotenuse|teorema\s*pythag|segitiga\s*siku|right\s*triangle/i.test(sceneText)) {
          const textCount = shapesArr.filter((s) => (s.op === 'text' && s.text) || s.label).length;
          if (textCount < 3) {
            const crispPy = synthesizeTopicSpecificScene(boardState, sampleSentenceGlobal, uiAction?.trapWrongSentence || '');
            if (crispPy) {
              patchedScene = {
                ...crispPy,
                title: raw.title || crispPy.title,
                spokenNarration: raw.spokenNarration || crispPy.spokenNarration,
              };
            }
          }
        }
        if (isPlainTwoBoxRoughScene(patchedScene)) {
          patchedScene = upgradePlainTwoBoxToRichVisual(
            patchedScene,
            boardState,
            shortTitle,
            sampleSentenceGlobal,
            uiAction?.trapWrongSentence || ''
          );
        }
        steps.push(finalizeStep(patchedScene, idx));
      } else {
        steps.push(finalizeStep(raw, idx));
      }
    });

    if (targetLang === 'zh' && injectedEntry && injectedEntry.compounds && injectedEntry.compounds.length > 0) {
      steps.forEach((s) => {
        if (s.kind === 'table' && s.tableRows) {
          const flat = s.tableRows.flat().join(' ');
          if (/[\u3040-\u309f\u30a0-\u30ff]/.test(flat)) {
            s.title = `Contoh Kosakata Hanzi "${injectedEntry!.char}"`;
            s.tableHeaders = ['Kosakata Mandarin', 'Pinyin', 'Arti'];
            s.tableRows = injectedEntry!.compounds!.slice(0, 4).map((c) => [c.word, c.reading, c.meaning]);
            s.spokenNarration = deriveStepSpokenNarration({ ...s, spokenNarration: undefined }, shortTitle, boardState.coachExplanation || '', targetLang);
          }
        }
      });
    }

    if (isCharacterWritingTopic && !steps.some((s) => s.kind === 'kanji_grid')) {
      const promptMatched = resolveKakijunRequestFromPrompt(
        `${shortTitle} ${sampleSentenceGlobal} ${boardState.coachExplanation || ''}`,
        targetLang
      );
      const explicitChar = extractRequestedCjkChar(`${boardState.characterData?.char || ''} ${shortTitle} ${sampleSentenceGlobal}`);
      const charToUse = promptMatched[0]?.char || explicitChar;
      if (charToUse) {
        const { step: kanjiStep, entry } = enrichKanjiGridStep(
          {
            id: 'wb_auto_kanji_grid',
            kind: 'kanji_grid',
            column: 'left',
            phaseIndex: 2,
            title: `Urutan Goresan "${charToUse}"`,
            character: charToUse,
            reading: boardState.characterData?.reading,
            meaning: boardState.characterData?.meaning || shortTitle,
            strokeCount: boardState.characterData?.strokesCount,
          },
          shortTitle,
          targetLang
        );
        injectedEntry = entry;
        characterEntryForHeading = entry;
        const insertAt = steps.length > 0 && steps[0].kind === 'heading' ? 1 : 0;
        steps.splice(insertAt, 0, finalizeStep(kanjiStep, steps.length));
      }
    }

    const hasPopulatedRoughScene = steps.some(
      (s) =>
        s.kind === 'rough_scene' &&
        ((Array.isArray(s.shapes) && s.shapes.length >= 2) ||
          (Array.isArray(s.graphNodes) && s.graphNodes.length >= 2))
    );
    const hasAutoFillableVisualStep = steps.some(
      (s) =>
        s.kind === 'metaphor_scene' ||
        s.kind === 'mind_map' ||
        s.kind === 'timeline_track' ||
        s.kind === 'formula_blocks' ||
        s.kind === 'contrast_scale' ||
        s.kind === 'syntax_flow' ||
        s.kind === 'kanji_grid' ||
        s.kind === 'tone_wave'
    );
    const hasRichVisualSwitch = studentQuestions.some((sq) => isVisualSwitchRequestText(sq.text));
    // Jika kontras awal Am/Is/Are vs Do/Does hanya memakai timbangan teks polos tanpa diagram, hadirkan adegan Kamera vs Video yang kaya
    if (
      !hasRichVisualSwitch &&
      !steps.some((s) => s.kind === 'metaphor_scene') &&
      steps.some((s) => s.kind === 'contrast_scale') &&
      (/\b(am|is|are|to\s*be)\b/i.test(shortTitle) || /\b(am|is|are|to\s*be)\b/i.test(boardState.patternFormula || '')) &&
      (/\b(do|does|did)\b/i.test(shortTitle) || /\b(do|does|did)\b/i.test(boardState.patternFormula || ''))
    ) {
      const cIdx = steps.findIndex((s) => s.kind === 'contrast_scale');
      const cs = steps[cIdx];
      if (cs) {
        const synthesized = synthesizeTopicSpecificScene(boardState, sampleSentenceGlobal, uiAction?.trapWrongSentence || '');
        if (synthesized && synthesized.kind === 'metaphor_scene') {
          steps[cIdx] = finalizeStep(
            {
              ...synthesized,
              id: cs.id || synthesized.id,
              column: cs.column || 'left',
              phaseIndex: typeof cs.phaseIndex === 'number' ? cs.phaseIndex : 2,
              spokenNarration: cs.spokenNarration && /kamera|video|kondisi|aksi/i.test(cs.spokenNarration) ? cs.spokenNarration : synthesized.spokenNarration,
            },
            cIdx
          );
        }
      }
    }
    const hasPopulatedVisualScene = isWorkflowDiagramTopic
      ? hasPopulatedRoughScene || hasAutoFillableVisualStep
      : hasPopulatedRoughScene || hasAutoFillableVisualStep;
    if (!hasPopulatedVisualScene) {
      const synthesizedScene = synthesizeTopicSpecificScene(
        boardState,
        sampleSentenceGlobal,
        uiAction?.trapWrongSentence || ''
      );
      if (synthesizedScene) {
        for (let i = steps.length - 1; i >= 0; i--) {
          if (steps[i].kind === 'rough_scene' && (!steps[i].shapes || steps[i].shapes.length < 2)) {
            steps.splice(i, 1);
          }
        }
        steps.push(
          finalizeStep(
            {
              ...synthesizedScene,
              id: synthesizedScene.id || 'wb_topic_scene',
              column: synthesizedScene.column || 'left',
              phaseIndex: typeof synthesizedScene.phaseIndex === 'number' ? synthesizedScene.phaseIndex : 2,
            },
            steps.length
          )
        );
      }
    }

    if (
      injectedEntry &&
      injectedEntry.compounds &&
      injectedEntry.compounds.length > 0 &&
      !steps.some((s) => s.kind === 'table')
    ) {
      steps.push(
        finalizeStep(
          {
            id: 'wb_kanji_compounds',
            kind: 'table',
            column: 'right',
            phaseIndex: 3,
            title: `Contoh Kosakata "${injectedEntry.char}"`,
            tableHeaders: ['Kosakata', 'Cara Baca', 'Arti'],
            tableRows: injectedEntry.compounds.slice(0, 4).map((c) => [c.word, c.reading, c.meaning]),
          },
          steps.length
        )
      );
    }

    // Jaminan kelengkapan penjelasan: walau AI hanya mengirim langkah visual singkat, selalu lengkapi heading, catatan inti & jebakan umum bila datanya tersedia
    if (!steps.some((s) => s.kind === 'heading')) {
      steps.unshift(
        finalizeStep(
          {
            id: 'wb_auto_heading',
            kind: 'heading',
            column: 'left',
            phaseIndex: 0,
            title: boardState.topicTitle || 'Papan Belajar',
            text:
              boardState.patternFormula ||
              (characterEntryForHeading
                ? `${characterEntryForHeading.char}${characterEntryForHeading.reading ? ` (${characterEntryForHeading.reading})` : ''}${characterEntryForHeading.strokeCount ? ` • ${characterEntryForHeading.strokeCount} Goresan` : ''}`
                : ''),
          },
          0
        )
      );
    }

    if (!steps.some((s) => s.kind === 'note')) {
      const noteBullets = splitExplanationIntoBullets(
        boardState.coachExplanation || '',
        boardState.patternFormula || ''
      );
      if (boardState.patternFormula && !noteBullets.some((b) => b.includes(boardState.patternFormula || ''))) {
        noteBullets.unshift(`Pola Utama: ${boardState.patternFormula}`);
      }
      if (noteBullets.length > 0) {
        steps.push(
          finalizeStep(
            {
              id: 'wb_auto_notes',
              kind: 'note',
              column: 'left',
              phaseIndex: 1,
              title: 'Poin Visual Inti',
              bullets: noteBullets,
              spokenNarration: boardState.coachExplanation || noteBullets.join('. '),
            },
            steps.length
          )
        );
      }
    }

    if (!steps.some((s) => s.kind === 'trap_vs_fix') && (uiAction?.trapWrongSentence || sampleSentenceGlobal || (boardState.sampleTarget && !isDegenerateSampleText(boardState.sampleTarget)))) {
      const wrong = isDegenerateSampleText(uiAction?.trapWrongSentence) ? '' : (uiAction?.trapWrongSentence || '');
      const right = !isDegenerateSampleText(boardState.sampleTarget)
        ? (boardState.sampleTarget || '')
        : sampleSentenceGlobal;
      if (wrong || right) {
        steps.push(
          finalizeStep(
            {
              id: 'wb_auto_trap',
              kind: 'trap_vs_fix',
              column: 'right',
              phaseIndex: 3,
              title: wrong ? 'Jebakan Umum vs Bentuk Tepat' : 'Contoh Kalimat Alami',
              wrongText: wrong || undefined,
              rightText: right || undefined,
              reason:
                uiAction?.trapReasonId ||
                (boardState.sampleMeaningId
                  ? `Arti: "${boardState.sampleMeaningId}". Biasakan struktur ini dalam percakapan nyata.`
                  : undefined),
            },
            steps.length
          )
        );
      }
    }

    if (
      boardState.quiz &&
      boardState.quiz.options.length > 0 &&
      !steps.some((s) => s.kind === 'checkpoint')
    ) {
      const leftCount = steps.filter((s) => s.column === 'left').length;
      const rightCount = steps.filter((s) => s.column === 'right').length;
      steps.push(
        finalizeStep(
          {
            id: 'wb_checkpoint',
            kind: 'checkpoint',
            column: rightCount <= leftCount ? 'right' : 'left',
            phaseIndex: Math.max(3, phaseLabels.length - 1),
            title: `Uji Pemahaman: ${shortTitle.slice(0, 36)}`,
            text: boardState.quiz.prompt,
          },
          steps.length
        )
      );
    }
  } else {
    const bullets = splitExplanationIntoBullets(boardState.coachExplanation, boardState.patternFormula);
    const sampleSentence = sampleSentenceGlobal;
    const wrongSentence = (
      uiAction?.trapWrongSentence ||
      boardState.quiz?.options?.find((o) => !o.isCorrect)?.text ||
      ''
    ).trim();
    const wrongReason = (
      uiAction?.trapWrongReason ||
      boardState.quiz?.options?.find((o) => !o.isCorrect)?.feedback ||
      ''
    ).trim();

    steps.push(
      finalizeStep(
        {
          id: 'wb_heading',
          kind: 'heading',
          column: 'left',
          phaseIndex: 1,
          title: shortTitle,
          text: boardState.patternFormula || '',
        },
        steps.length
      )
    );

    if (bullets.length > 0) {
      steps.push(
        finalizeStep(
          {
            id: 'wb_notes',
            kind: 'note',
            column: 'left',
            phaseIndex: 1,
            title: 'Inti Pembahasan',
            bullets,
          },
          steps.length
        )
      );
    }

    const promptEntries = resolveKakijunRequestFromPrompt(
      `${shortTitle} ${sampleSentence} ${boardState.coachExplanation || ''}`,
      targetLang
    );
    const requestedCjk =
      promptEntries[0]?.char ||
      boardState.characterData?.char ||
      extractRequestedCjkChar(`${shortTitle} ${sampleSentence}`);

    if (isCharacterWritingTopic && requestedCjk) {
      const { step: kanjiStep, entry } = enrichKanjiGridStep(
        {
          id: 'wb_kanji_grid',
          kind: 'kanji_grid',
          column: 'left',
          phaseIndex: 2,
          title: `Urutan Goresan "${requestedCjk}" (${resolveOrSynthesizeKakijun(requestedCjk, undefined, boardState.characterData?.strokesCount).strokeCount} Goresan)`,
          character: requestedCjk,
          reading: boardState.characterData?.reading,
          meaning: boardState.characterData?.meaning || shortTitle,
          strokeCount: boardState.characterData?.strokesCount,
        },
        shortTitle,
        targetLang
      );
      characterEntryForHeading = entry;
      steps.push(finalizeStep(kanjiStep, steps.length));

      if (entry.compounds && entry.compounds.length > 0) {
        const charLabel = targetLang === 'zh' ? 'Hanzi' : 'Kanji';
        steps.push(
          finalizeStep(
            {
              id: 'wb_kanji_compounds',
              kind: 'table',
              column: 'right',
              phaseIndex: 3,
              title: `Contoh Kosakata ${charLabel} "${entry.char}"`,
              tableHeaders: targetLang === 'zh' ? ['Kosakata Mandarin', 'Pinyin', 'Arti'] : ['Kosakata', 'Cara Baca', 'Arti'],
              tableRows: entry.compounds.slice(0, 4).map((c) => [c.word, c.reading, c.meaning]),
            },
            steps.length
          )
        );
      }
    } else if (
      targetLang === 'zh' &&
      (boardState.contextMode === 'tone_waveform' || /nada|tone|pinyin/i.test(shortTitle)) &&
      (boardState.toneData?.word || sampleSentence)
    ) {
      steps.push(
        finalizeStep(
          {
            id: 'wb_tone_wave',
            kind: 'tone_wave',
            column: 'left',
            phaseIndex: 2,
            title: `Gelombang Nada: ${shortTitle.slice(0, 32)}`,
            text: boardState.toneData?.word || sampleSentence,
            reading: boardState.toneData?.toneShape || boardState.patternFormula,
          },
          steps.length
        )
      );
    } else {
      const scene = synthesizeTopicSpecificScene(boardState, sampleSentence, wrongSentence);
      if (scene) {
        steps.push(
          finalizeStep(
            {
              ...scene,
              id: scene.id || 'wb_topic_scene',
              column: scene.column || 'left',
              phaseIndex: typeof scene.phaseIndex === 'number' ? scene.phaseIndex : 2,
            },
            steps.length
          )
        );
      }
    }

    if (boardState.pairData?.keyAnalogy || boardState.patternFormula) {
      steps.push(
        finalizeStep(
          {
            id: 'wb_highlight_callout',
            kind: 'highlight_callout',
            column: 'left',
            phaseIndex: 3,
            title: `Poin Penting: ${shortTitle.slice(0, 34)}`,
            text: boardState.pairData?.keyAnalogy || boardState.patternFormula,
            highlightPhrase: boardState.pairData?.keyAnalogy || boardState.patternFormula,
            highlightColor: 'rgba(125, 211, 252, 0.45)',
          },
          steps.length
        )
      );
    }

    const isIrrelevantSentenceTrapForChar =
      isCharacterWritingTopic &&
      !isWorkflowDiagramTopic &&
      !/(goresan|urutan|stroke|tulis|radikal|bentuk|komponen)/i.test(`${wrongSentence} ${wrongReason}`);

    if (
      sampleSentence &&
      wrongSentence &&
      sampleSentence !== wrongSentence &&
      !isIrrelevantSentenceTrapForChar
    ) {
      steps.push(
        finalizeStep(
          {
            id: 'wb_comparison_table',
            kind: 'table',
            column: 'right',
            phaseIndex: 2,
            title:
              shortTitle.length <= 32
                ? `Perbandingan: ${shortTitle}`
                : `Perbandingan: ${shortTitle.slice(0, 32).replace(/\s+\S*$/, '')}...`,
            tableHeaders: boardState.pairData
              ? [boardState.pairData.termA, boardState.pairData.termB]
              : ['Dipakai Secara Alami (✓)', 'Kekeliruan Umum (✕)'],
            tableRows: boardState.pairData
              ? [
                  [boardState.pairData.descA, boardState.pairData.descB],
                  [sampleSentence, wrongSentence],
                ]
              : [
                  [sampleSentence, wrongSentence],
                  ...(wrongReason ? [[boardState.patternFormula || shortTitle, wrongReason]] : []),
                ],
          },
          steps.length
        )
      );

      steps.push(
        finalizeStep(
          {
            id: 'wb_trap_vs_fix',
            kind: 'trap_vs_fix',
            column: 'right',
            phaseIndex: 3,
            title: 'Evaluasi Contoh',
            wrongText: wrongSentence,
            rightText: sampleSentence,
            reason: wrongReason || undefined,
          },
          steps.length
        )
      );
    } else if (sampleSentence && !steps.some((s) => s.kind === 'highlight_callout' && s.column === 'right')) {
      steps.push(
        finalizeStep(
          {
            id: 'wb_highlight_example',
            kind: 'highlight_callout',
            column: 'right',
            phaseIndex: 2,
            title: 'Contoh Kontekstual',
            text: sampleSentence,
            highlightPhrase: sampleSentence,
            highlightColor: 'rgba(167, 243, 208, 0.5)',
          },
          steps.length
        )
      );
    }

    if (boardState.quiz && boardState.quiz.options.length > 0) {
      const leftCount = steps.filter((s) => s.column === 'left').length;
      const rightCount = steps.filter((s) => s.column === 'right').length;
      steps.push(
        finalizeStep(
          {
            id: 'wb_checkpoint',
            kind: 'checkpoint',
            column: rightCount <= leftCount ? 'right' : 'left',
            phaseIndex: Math.max(3, phaseLabels.length - 1),
            title: 'Latihan Kontekstual',
            text: boardState.quiz.prompt,
          },
          steps.length
        )
      );
    }
  }

  if (characterEntryForHeading) {
    const resolvedHeadingEntry = resolveKakijunEntryForLang(characterEntryForHeading, targetLang);
    const cleanMeaning = resolvedHeadingEntry.meaningId.replace(/\s*\(\d+\s*Goresan\)/i, '').trim();
    const readingTag = resolvedHeadingEntry.reading ? ` (${resolvedHeadingEntry.reading})` : '';
    const meaningTag = cleanMeaning ? ` • ${cleanMeaning}` : '';
    const conciseCharText = `${resolvedHeadingEntry.char}${readingTag}${meaningTag} • ${resolvedHeadingEntry.strokeCount} Goresan Resmi`;
    steps.forEach((s) => {
      if (s.kind === 'heading') {
        s.text = !s.text || /guratan\s*1\s*:|\|/i.test(s.text) || (targetLang === 'zh' && /sui\s*\/\s*mizu|go\s*\/\s*itsu/i.test(s.text))
          ? conciseCharText
          : cleanBoardDisplayText(cleanReadingForLang(s.text, s.text, targetLang, resolvedHeadingEntry.char));
        const cleanHeadingNarration = deriveStepSpokenNarration(
          { ...s, spokenNarration: undefined },
          shortTitle,
          boardState.coachExplanation || '',
          targetLang
        );
        s.spokenNarration = cleanHeadingNarration;
        s.durationMs = computeStepDurationMs(s, cleanHeadingNarration);
      }
    });
  }

  // Jaga urutan pedagogis alami: Heading (0) -> Logika Dasar Note -> Diagram Visual -> Contoh Tabel -> Jebakan -> Rumus -> Kuis
  if (steps.length > 1) {
    const headings = steps.filter((s) => s.kind === 'heading');
    const notes = steps.filter((s) => s.kind === 'note');
    const isVisualDiagramKind = (k: WhiteboardStepCommand['kind']) =>
      k === 'kanji_grid' ||
      k === 'rough_scene' ||
      k === 'metaphor_scene' ||
      k === 'mind_map' ||
      k === 'timeline_track' ||
      k === 'formula_blocks' ||
      k === 'contrast_scale' ||
      k === 'syntax_flow' ||
      k === 'tone_wave';
    const allPrimaryVisuals = steps.filter((s) => isVisualDiagramKind(s.kind));
    if (isWorkflowDiagramTopic) {
      allPrimaryVisuals.sort((a, b) => Number(a.kind !== 'rough_scene') - Number(b.kind !== 'rough_scene'));
    } else if (isCharacterWritingTopic) {
      allPrimaryVisuals.sort((a, b) => Number(a.kind !== 'kanji_grid') - Number(b.kind !== 'kanji_grid'));
    } else {
      const rankVisual = (v: WhiteboardSceneStep) => {
        if (v.kind === 'formula_blocks' || v.kind === 'timeline_track' || v.kind === 'mind_map') return 0;
        if (v.kind === 'rough_scene' && Array.isArray(v.shapes) && v.shapes.length >= 4) return 1;
        return 2;
      };
      allPrimaryVisuals.sort((a, b) => rankVisual(a) - rankVisual(b));
    }
    // Simpan tepat 1 diagram visual utama agar tidak pernah ada 2 kartu visual bertumpuk / berkonflik di Fase 2
    const primaryVisuals = allPrimaryVisuals.slice(0, 1);
    const nonEmptyOtherSteps = steps.filter(
      (s) => s.kind !== 'heading' && s.kind !== 'note' && !isVisualDiagramKind(s.kind)
    );
    const others = nonEmptyOtherSteps.filter(
      (s) => !(s.kind === 'table' && (!s.tableRows || s.tableRows.length === 0) && headings.length + primaryVisuals.length + notes.length >= 2)
    );
    const reordered =
      isCharacterWritingTopic || isWorkflowDiagramTopic
        ? [...headings, ...primaryVisuals, ...notes.slice(0, 1), ...others]
        : [...headings, ...notes.slice(0, 1), ...primaryVisuals, ...others];
    reordered.forEach((s, rIdx) => {
      if (s.kind === 'heading' || rIdx === 0) {
        s.phaseIndex = 0;
      } else if (s.kind === 'note') {
        s.phaseIndex = 1;
      } else if (isVisualDiagramKind(s.kind)) {
        s.phaseIndex = Math.min(phaseLabels.length - 1, 2);
      } else if (s.kind === 'checkpoint' || s.kind === 'student_question') {
        s.phaseIndex = Math.max(3, phaseLabels.length - 1);
      } else {
        s.phaseIndex = Math.min(phaseLabels.length - 1, 3);
      }
    });
    steps.splice(0, steps.length, ...reordered);
  }

  // Tampilkan maksimal 1 pertanyaan isi terakhir (abaikan perintah ganti visual) pada kolom paling pendek agar 2 kolom tetap seimbang.
  const latestContentQuestion = studentQuestions
    .filter((sq) => !isVisualSwitchRequestText(sq.text))
    .slice(-1);
  latestContentQuestion.forEach((sq, idx) => {
    const leftCount = steps.filter((s) => s.column === 'left').length;
    const rightCount = steps.filter((s) => s.column === 'right').length;
    steps.push(
      finalizeStep(
        {
          id: `wb_student_q_${sq.id || idx}`,
          kind: 'student_question',
          column: leftCount <= rightCount ? 'left' : 'right',
          phaseIndex: 4,
          title: 'PERTANYAANMU',
          text: sq.text,
          highlightPhrase: sq.areaExcerpt,
          reason: sq.tutorAnswer,
        },
        steps.length
      )
    );
  });

  ensureAlternativeVisualOnSwitchRequest({
    steps,
    studentQuestions,
    boardState,
    uiAction,
    shortTitle,
    sampleSentence: sampleSentenceGlobal,
    targetLang,
    finalizeStep,
  });

  // Hapus/isi otomatis diagram kosong (mis. mind_map tanpa branches, timeline tanpa events, formula_blocks tanpa blocks)
  for (let i = steps.length - 1; i >= 0; i--) {
    const st = steps[i];
    if (st.kind === 'mind_map' && (!st.branches || st.branches.length < 2)) {
      const noteStep = steps.find((n) => n.kind === 'note' && Array.isArray(n.bullets) && n.bullets.length >= 2);
      const tblStep = steps.find((t) => t.kind === 'table' && Array.isArray(t.tableRows) && t.tableRows.length >= 2);
      const colors = ['#0EA5E9', '#10B981', '#8B5CF6', '#F59E0B'];
      const icons: Array<'star' | 'bolt' | 'shield' | 'sparkles'> = ['star', 'bolt', 'shield', 'sparkles'];
      const autoBranches = tblStep?.tableRows?.slice(0, 4).map((r, bIdx) => ({
        label: cleanBoardDisplayText(r[0] || `Poin ${bIdx + 1}`),
        sublabel: cleanBoardDisplayText(r[2] || r[1] || ''),
        example: cleanBoardDisplayText(r[1] || ''),
        color: colors[bIdx % colors.length],
        icon: icons[bIdx % icons.length],
      })).filter((b) => b.label) ||
      noteStep?.bullets?.slice(0, 4).map((b, bIdx) => ({
        label: `Poin ${bIdx + 1}`,
        sublabel: cleanBoardDisplayText(b).slice(0, 68),
        color: colors[bIdx % colors.length],
        icon: icons[bIdx % icons.length],
      })) || [];
      if (autoBranches.length >= 2) {
        st.branches = autoBranches;
        if (!st.metaphorCenterLabel || /^konsep\s*inti$/i.test(st.metaphorCenterLabel)) {
          st.metaphorCenterLabel = cleanBoardDisplayText(shortTitle).slice(0, 26);
        }
      } else {
        steps.splice(i, 1);
      }
    } else if (st.kind === 'timeline_track' && (!st.timelineEvents || st.timelineEvents.length < 2)) {
      const tblStep = steps.find((t) => t.kind === 'table' && Array.isArray(t.tableRows) && t.tableRows.length >= 2);
      const isMetaComparisonTable = tblStep?.tableRows?.some((r) => /^(?:rumus|formula|waktu|aspek|fungsi|kategori|status|pola)\b/i.test(String(r?.[0] || '').trim()));
      const isPastVsPerf = /\bsimple\s*past\b/i.test(shortTitle) || /\bpresent\s*perfect\b/i.test(shortTitle);
      if (isPastVsPerf) {
        st.timelineEvents = [
          { timeLabel: 'Masa Lalu Tertutup', title: 'Simple Past (Verb 2)', example: 'I moved to Bali in 2020.', icon: 'clock', color: '#0284C7', isActive: false },
          { timeLabel: 'Jembatan ke Sekarang', title: 'Present Perfect (Have/Has + V3)', example: 'I have lived in Bali since 2020.', icon: 'bridge', color: '#10B981', isActive: true },
        ];
      } else if (tblStep?.tableRows && tblStep.tableRows.length >= 2 && !isMetaComparisonTable) {
        const evColors = ['#0284C7', '#10B981', '#F59E0B', '#8B5CF6'];
        const evIcons = ['clock', 'bridge', 'target', 'check'];
        st.timelineEvents = tblStep.tableRows.slice(0, 3).map((r, tIdx) => ({
          timeLabel: cleanBoardDisplayText(r[0] || `Tahap ${tIdx + 1}`).slice(0, 32),
          title: cleanBoardDisplayText(r[1] || r[0] || `Contoh ${tIdx + 1}`).slice(0, 48),
          example: cleanBoardDisplayText(r[2] || '').slice(0, 80) || undefined,
          icon: evIcons[tIdx % evIcons.length],
          color: evColors[tIdx % evColors.length],
          isActive: tIdx === tblStep.tableRows!.slice(0, 3).length - 1,
        }));
      } else {
        st.timelineEvents = [
          { timeLabel: 'Masa Lalu Selesai', title: 'Simple Past (Verb 2)', example: 'I worked here in 2020.', icon: 'clock', color: '#0284C7', isActive: false },
          { timeLabel: 'Terhubung Sampai Kini', title: 'Present Perfect (Have/Has + V3)', example: sampleSentenceGlobal || 'I have worked here since 2020.', icon: 'bridge', color: '#10B981', isActive: true },
        ];
      }
    } else if (st.kind === 'formula_blocks' && (!st.blocks || st.blocks.length < 2)) {
      const topicBlob = `${shortTitle} ${sampleSentenceGlobal} ${uiAction?.trapWrongSentence || ''}`.toLowerCase();
      if (/\b(am|is|are|to\s*be)\b/i.test(topicBlob) && !/\b(do|does|did)\b/i.test(topicBlob)) {
        st.title = st.title || 'Peta Slot Sah To Be vs Verb 1 Aktif';
        st.blocks = [
          { role: 'Subjek + Verb 1', token: 'I agree / work', note: 'Kata kerja aktif langsung, tanpa To Be', color: '#10B981' },
          { role: 'To Be + Sifat/Benda', token: 'I am ready / a student', note: 'Kata sifat, profesi, atau lokasi', color: '#0EA5E9' },
          { role: 'To Be + Verb ing', token: 'I am working', note: 'Aksi sedang berlangsung sekarang', color: '#8B5CF6' },
          { role: 'To Be + Verb 3', token: 'It is agreed', note: 'Kalimat pasif (dikenai tindakan)', color: '#F59E0B' },
        ];
      } else {
        const toks = cleanBoardDisplayText(sampleSentenceGlobal || st.rightText || '').split(/\s+/).filter(Boolean).slice(0, 5);
        const colors = ['#0EA5E9', '#10B981', '#8B5CF6', '#F59E0B', '#EC4899'];
        if (toks.length >= 2) {
          st.blocks = toks.map((tok, bIdx) => ({
            role: bIdx === 0 ? 'Subjek' : bIdx === 1 ? 'Inti Pola' : `Bagian ${bIdx + 1}`,
            token: tok,
            color: colors[bIdx % colors.length],
          }));
        } else {
          steps.splice(i, 1);
        }
      }
    } else if (st.kind === 'syntax_flow' && (!st.nodes || st.nodes.filter((n) => n?.word).length < 2)) {
      const toks = cleanBoardDisplayText(sampleSentenceGlobal || st.rightText || st.caption || '').split(/\s+/).filter(Boolean).slice(0, 5);
      const colors = ['#DBEAFE', '#DCFCE7', '#EDE9FE', '#FEF3C7', '#FCE7F3'];
      if (toks.length >= 2) {
        st.nodes = toks.map((tok, nIdx) => ({
          role: nIdx === 0 ? 'Subjek' : nIdx === 1 ? 'Kata Kerja / Kunci' : 'Pelengkap',
          word: tok,
          color: colors[nIdx % colors.length],
        }));
      } else {
        steps.splice(i, 1);
      }
    }
  }

  // Pastikan setiap langkah metaphor_scene / contrast_scale bebas label generik "Sisi A / Sisi B / Kategori / Pilihan / Cara Baca / Artinya / Visual Baru"
  const cleanPairText = (raw: string): string =>
    stripComparisonFluff(cleanBoardDisplayText(raw))
      .replace(/^(?:visual|diagram|tampilan|bagan)\s+[^:]{2,36}:\s*/i, '')
      .replace(/^kenapa\s+(?:pakai|menggunakan)?\s*/i, '')
      .replace(/^(?:vs\.?|versus|atau)\s+/i, '')
      .replace(/\s+(?:vs\.?|versus|atau)\s*$/i, '')
      .replace(/^['"`]+|['"`]+$/g, '')
      .trim();
  const extractGrammarTokensFromTitle = (title: string): [string, string] | null => {
    const cleanT = cleanBoardDisplayText(title)
      .replace(/^(?:visual|diagram|tampilan|bagan)\s+[^:]{2,36}:\s*/i, '')
      .replace(/\s+(?:lewat|dengan|melalui)\s+(?:analogi|perumpamaan|metode|cara|cerita).*$/i, '')
      .replace(/\s+(?:dari\s+nol|untuk\s+(?:pemula|anak\s+smp)|secara\s+mudah).*$/i, '')
      .trim();
    const bukanMatch = cleanT.match(/^(.+?)\s*,?\s*\bbukan\b\s+(.+)$/i);
    if (bukanMatch) {
      const L = cleanPairText(bukanMatch[1]);
      const R = cleanPairText(bukanMatch[2]);
      const tokA = L.match(/\b(am\s+is\s+are|do\s+does|does|do|did|was|were|have|has|is|am|are|will|can|should)\b/i)?.[1];
      const tokB = R.match(/\b(am\s+is\s+are|do\s+does|does|do|did|was|were|have|has|is|am|are|will|can|should)\b/i)?.[1];
      if (tokA && tokB && tokA.toLowerCase() !== tokB.toLowerCase()) {
        return [tokA.replace(/\b\w/g, (c) => c.toUpperCase()), tokB.replace(/\b\w/g, (c) => c.toUpperCase())];
      }
      if (L && R && L.toLowerCase() !== R.toLowerCase()) return [L.slice(0, 26), R.slice(0, 26)];
    }
    const basePair = splitTitleIntoPair(cleanT);
    if (basePair) {
      const b0 = cleanPairText(basePair[0]) || basePair[0].trim();
      const b1 = cleanPairText(basePair[1]) || basePair[1].trim();
      if (b0 && b1) return [b0, b1];
    }
    return null;
  };
  const genericSideRe = /^(?:sisi\s*[ab12]|sisi\s*(?:pertama|kedua)|konsep\s*[12]|bagian\s*[12]|pilihan(?:\s*(?:tepat|benar|kata|[12]))?|kiri|kanan|panel\s*[ab12]|kategori|penggunaan|kalimat\s*(?:tanya|salah|benar|inggris)|arti(?:nya|\s+bahasa\s+\w+)?|cara\s*baca(?:\s*\/\s*arti)?|pecahan(?:\s*\/\s*rute)?|keterangan(?:\s*pola)?|jenis\s*jalur|bentuk(?:\s*(?:utama|pembanding|pertama|kedua))?|pola\s*(?:pertama|kedua)|jenis|tipe|pemakaian|situasi(?:\s+kalimat)?|contoh(?:\s+(?:kalimat|nyata))?|a|b)$/i;
  const resolveRealPairLabels = (): [string, string] => {
    const pA = cleanPairText(boardState.pairData?.labelA || '');
    const pB = cleanPairText(boardState.pairData?.labelB || '');
    if (pA && pB && !genericSideRe.test(pA) && !genericSideRe.test(pB)) {
      return [pA, pB];
    }
    const titlePair = extractGrammarTokensFromTitle(shortTitle);
    if (titlePair && !genericSideRe.test(titlePair[0]) && !genericSideRe.test(titlePair[1])) {
      return titlePair;
    }
    const headingStep = steps.find((s) => s.kind === 'heading' && s.title);
    if (headingStep?.title) {
      const hPair = extractGrammarTokensFromTitle(headingStep.title);
      if (hPair && !genericSideRe.test(hPair[0]) && !genericSideRe.test(hPair[1])) {
        return hPair;
      }
    }
    const tblStep = steps.find((s) => s.kind === 'table' && Array.isArray(s.tableRows) && s.tableRows.length >= 2);
    if (tblStep?.tableHeaders) {
      const meaningfulHeaders = tblStep.tableHeaders
        .map((h) => cleanPairText(h))
        .filter((h) => h.length >= 2 && !genericSideRe.test(h) && !/^(?:arti|makna|fungsi|rumus|penjelasan|terjemahan|subjek|kalimat|catatan|topik|cara\s*baca|pecahan|rute|visualisasi(?:\s+\w+)?)$/i.test(h));
      if (meaningfulHeaders.length >= 2) {
        return [meaningfulHeaders[0], meaningfulHeaders[1]];
      }
    }
    if (tblStep?.tableRows && tblStep.tableRows.length >= 2) {
      const r0 = cleanPairText(String(tblStep.tableRows[0]?.[0] || ''));
      const r1 = cleanPairText(String(tblStep.tableRows[1]?.[0] || ''));
      if (r0 && r1 && r0.toLowerCase() !== r1.toLowerCase() && !genericSideRe.test(r0) && !genericSideRe.test(r1)) {
        return [r0.slice(0, 26), r1.slice(0, 26)];
      }
    }
    return ['', ''];
  };
  const [resolvedPairA, resolvedPairB] = resolveRealPairLabels();
  const noteStepForEnrich = steps.find((n) => n.kind === 'note' && Array.isArray(n.bullets) && n.bullets.length > 0);
  const tableStepForEnrich = steps.find((t) => t.kind === 'table' && Array.isArray(t.tableRows) && t.tableRows.length > 0);
  const trapStepForEnrich = steps.find((t) => t.kind === 'trap_vs_fix');

  for (let stIdx = 0; stIdx < steps.length; stIdx++) {
    const st = steps[stIdx];
    if (st.kind !== 'metaphor_scene' && st.kind !== 'contrast_scale') continue;

    // Jika pasangan contrast_scale ternyata membahas >= 3 kategori (misal much/many/a lot of, in/on/at), promosikan ke mind_map!
    const distinctRowTerms = Array.isArray(tableStepForEnrich?.tableRows)
      ? new Set(tableStepForEnrich.tableRows.map((r) => String(r?.[0] || '').trim().toLowerCase()).filter(Boolean)).size
      : 0;
    const isThreePlusPrompt = /\bvs\b.*(?:\bvs\b|\bdan\b)|much.*many.*a\s+lot|in.*on.*at|\b(?:tiga|3)\b/i.test(shortTitle);
    if (distinctRowTerms >= 3 && isThreePlusPrompt && tableStepForEnrich?.tableRows) {
      const palette = ['#0EA5E9', '#10B981', '#8B5CF6', '#F59E0B'];
      const icons: Array<'star' | 'bolt' | 'check' | 'target'> = ['star', 'bolt', 'check', 'target'];
      const branches = tableStepForEnrich.tableRows.slice(0, 4).map((r, rIdx) => ({
        label: cleanBoardDisplayText(r[0] || `Poin ${rIdx + 1}`).slice(0, 32),
        sublabel: cleanBoardDisplayText(r[2] || r[1] || noteStepForEnrich?.bullets?.[rIdx] || ''),
        example: cleanBoardDisplayText(r[1] || sampleSentenceGlobal || ''),
        color: palette[rIdx % palette.length],
        icon: icons[rIdx % icons.length],
      }));
      const replaced = {
        ...st,
        kind: 'mind_map' as const,
        sceneTheme: undefined,
        metaphorCenterLabel: cleanBoardDisplayText(shortTitle).slice(0, 28) || 'Peta Konsep Inti',
        title: `Peta Konsep: ${cleanBoardDisplayText(shortTitle).slice(0, 38)}`,
        branches,
        spokenNarration: '',
      };
      const nar = deriveStepSpokenNarration(replaced, shortTitle, boardState.coachExplanation || '', targetLang);
      steps[stIdx] = {
        ...replaced,
        spokenNarration: nar,
        durationMs: computeStepDurationMs(replaced, nar),
      };
      continue;
    }

    // Jika kedua sisi tetap kosong/generik dan topik bukan pasangan biner jelas -> ubah menjadi Peta Cabang / Blok Struktural yang jelas dari isi materi!
    const rawL = cleanPairText(st.leftPanel?.title || st.termA || '');
    const rawR = cleanPairText(st.rightPanel?.title || st.termB || '');
    const leftGeneric = !rawL || genericSideRe.test(rawL) || /^visualisasi\s+/i.test(rawL);
    const rightGeneric = !rawR || genericSideRe.test(rawR) || /^visualisasi\s+/i.test(rawR);
    if ((leftGeneric || rightGeneric) && (!resolvedPairA || !resolvedPairB)) {
      const palette = ['#0EA5E9', '#10B981', '#8B5CF6', '#F59E0B'];
      const icons: Array<'star' | 'bolt' | 'check' | 'target'> = ['star', 'bolt', 'check', 'target'];
      const branches =
        tableStepForEnrich?.tableRows?.slice(0, 4).map((r, rIdx) => ({
          label: cleanBoardDisplayText(r[0] || `Poin ${rIdx + 1}`).slice(0, 28),
          sublabel: cleanBoardDisplayText(r[2] || r[1] || noteStepForEnrich?.bullets?.[rIdx] || ''),
          example: cleanBoardDisplayText(r[1] || sampleSentenceGlobal || ''),
          color: palette[rIdx % palette.length],
          icon: icons[rIdx % icons.length],
        })).filter((b) => b.label) ||
        noteStepForEnrich?.bullets?.slice(0, 4).map((b, bIdx) => ({
          label: `Aturan ${bIdx + 1}`,
          sublabel: cleanBoardDisplayText(b),
          example: bIdx === 0 ? cleanBoardDisplayText(sampleSentenceGlobal) : undefined,
          color: palette[bIdx % palette.length],
          icon: icons[bIdx % icons.length],
        })) || [];
      if (branches.length >= 2) {
        const replaced = {
          ...st,
          kind: 'mind_map' as const,
          sceneTheme: undefined,
          metaphorCenterLabel: cleanBoardDisplayText(shortTitle).slice(0, 28) || 'Peta Konsep Inti',
          title: `Peta Konsep Jelas: ${cleanBoardDisplayText(shortTitle).slice(0, 36)}`,
          branches,
          spokenNarration: '',
        };
        const nar = deriveStepSpokenNarration(replaced, shortTitle, boardState.coachExplanation || '', targetLang);
        steps[stIdx] = {
          ...replaced,
          spokenNarration: nar,
          durationMs: computeStepDurationMs(replaced, nar),
        };
        continue;
      }
    }

    let repaired = false;
    if (st.leftPanel) {
      if ((!rawL || genericSideRe.test(rawL)) && resolvedPairA) {
        st.leftPanel = { ...st.leftPanel, title: resolvedPairA };
        repaired = true;
      } else if (rawL && rawL !== st.leftPanel.title) {
        st.leftPanel = { ...st.leftPanel, title: rawL };
      }
      if (!st.leftPanel.subtitle || st.leftPanel.subtitle.trim().length < 12) {
        st.leftPanel = {
          ...st.leftPanel,
          subtitle: cleanBoardDisplayText(
            noteStepForEnrich?.bullets?.[0] ||
            tableStepForEnrich?.tableRows?.[0]?.slice(1).filter(Boolean).join(' — ') ||
            boardState.patternFormula ||
            `Gunakan ${st.leftPanel.title} sesuai konteks utamanya.`
          ),
        };
        repaired = true;
      }
      if (!st.leftPanel.example) {
        const exA = cleanBoardDisplayText(
          tableStepForEnrich?.tableRows?.[0]?.[1] ||
          trapStepForEnrich?.wrongText ||
          sampleSentenceGlobal
        );
        if (exA) {
          st.leftPanel = { ...st.leftPanel, example: exA };
        }
      }
    }
    if (st.rightPanel) {
      if ((!rawR || genericSideRe.test(rawR)) && resolvedPairB) {
        st.rightPanel = { ...st.rightPanel, title: resolvedPairB };
        repaired = true;
      } else if (rawR && rawR !== st.rightPanel.title) {
        st.rightPanel = { ...st.rightPanel, title: rawR };
      }
      if (!st.rightPanel.subtitle || st.rightPanel.subtitle.trim().length < 12) {
        st.rightPanel = {
          ...st.rightPanel,
          subtitle: cleanBoardDisplayText(
            noteStepForEnrich?.bullets?.[1] ||
            tableStepForEnrich?.tableRows?.[1]?.slice(1).filter(Boolean).join(' — ') ||
            boardState.coachExplanation ||
            `Gunakan ${st.rightPanel.title} untuk situasi pembandingnya.`
          ),
        };
        repaired = true;
      }
      if (!st.rightPanel.example) {
        const exB = cleanBoardDisplayText(
          tableStepForEnrich?.tableRows?.[1]?.[1] ||
          trapStepForEnrich?.rightText ||
          sampleSentenceGlobal
        );
        if (exB) {
          st.rightPanel = { ...st.rightPanel, example: exB };
        }
      }
    }
    if (!st.analogy || st.analogy.trim().length < 24 || /^visualisasi\s+/i.test(st.analogy.trim())) {
      const autoAnalogy = cleanBoardDisplayText(
        boardState.pairData?.keyAnalogy ||
        (st.leftPanel?.title && st.rightPanel?.title
          ? `Bedakan fungsinya: ${st.leftPanel.title} fokus pada ${cleanBoardDisplayText(st.leftPanel.subtitle).slice(0, 56)}, sedangkan ${st.rightPanel.title} dipakai untuk ${cleanBoardDisplayText(st.rightPanel.subtitle).slice(0, 56)}.`
          : boardState.patternFormula || trapStepForEnrich?.reason || '')
      );
      if (autoAnalogy) {
        st.analogy = autoAnalogy;
      }
    }
    if (st.leftPanel && (!st.leftPanel.badge || /^(?:sisi\s*[ab12]|pola\s*(?:a|b|pertama|kedua))$/i.test(st.leftPanel.badge.trim()))) {
      st.leftPanel = {
        ...st.leftPanel,
        badge: st.sceneTheme === 'camera_vs_video' ? 'FOTO KONDISI' : (st.leftPanel.title || resolvedPairA || 'ATURAN 1').slice(0, 14).toUpperCase(),
      };
    }
    if (st.rightPanel && (!st.rightPanel.badge || /^(?:sisi\s*[ab12]|pola\s*(?:a|b|pertama|kedua))$/i.test(st.rightPanel.badge.trim()))) {
      st.rightPanel = {
        ...st.rightPanel,
        badge: st.sceneTheme === 'camera_vs_video' ? 'VIDEO AKSI' : (st.rightPanel.title || resolvedPairB || 'ATURAN 2').slice(0, 14).toUpperCase(),
      };
    }
    if ((!st.termA || genericSideRe.test(cleanPairText(st.termA))) && (st.leftPanel?.title || resolvedPairA)) {
      st.termA = st.leftPanel?.title || resolvedPairA;
      repaired = true;
    } else {
      st.termA = cleanPairText(st.termA || '') || st.termA;
    }
    if ((!st.termB || genericSideRe.test(cleanPairText(st.termB))) && (st.rightPanel?.title || resolvedPairB)) {
      st.termB = st.rightPanel?.title || resolvedPairB;
      repaired = true;
    } else {
      st.termB = cleanPairText(st.termB || '') || st.termB;
    }
    if (st.kind === 'contrast_scale') {
      const tblForDesc = steps.find((t) => t.kind === 'table' && Array.isArray(t.tableRows) && t.tableRows.length >= 2);
      if (!st.descA) {
        st.descA = st.leftPanel?.subtitle || tblForDesc?.tableRows?.[0]?.slice(1).filter(Boolean).join(' • ') || cleanBoardDisplayText(boardState.patternFormula || st.termA || '');
      }
      if (!st.descB) {
        st.descB = st.rightPanel?.subtitle || tblForDesc?.tableRows?.[1]?.slice(1).filter(Boolean).join(' • ') || cleanBoardDisplayText(sampleSentenceGlobal || st.termB || '');
      }
    }
    const existingNarWords = String(st.spokenNarration || '').split(/\s+/).filter(Boolean).length;
    if (repaired || existingNarWords < 16 || /\bsisi\s*[ab12]\b|\bsisi\s+(?:pertama|kedua)\b|\bpola\s+(?:pertama|kedua)\b/i.test(st.spokenNarration || '')) {
      const freshNarration = deriveStepSpokenNarration({ ...st, spokenNarration: '' }, shortTitle, boardState.coachExplanation || '', targetLang);
      st.spokenNarration = freshNarration;
      st.durationMs = computeStepDurationMs(st, freshNarration);
    }
  }

  const cleanMeaningGlobal = characterEntryForHeading
    ? characterEntryForHeading.meaningId.replace(/\s*\(\d+\s*Goresan\)/i, '').trim()
    : '';
  const globalReadingTag = characterEntryForHeading?.reading ? ` (${characterEntryForHeading.reading})` : '';
  const globalMeaningTag = cleanMeaningGlobal ? ` • ${cleanMeaningGlobal}` : '';
  const rawBoardSubtitle =
    characterEntryForHeading && /guratan\s*1\s*:|\|/i.test(boardState.patternFormula || '')
      ? `${characterEntryForHeading.char}${globalReadingTag}${globalMeaningTag} • ${characterEntryForHeading.strokeCount} Goresan Resmi`
      : cleanBoardDisplayText(boardState.patternFormula || '');

  // Sinkronisasi global jumlah goresan resmi ke seluruh langkah papan tulis (kecuali frasa negasi miskonsepsi seperti "bukan/keliru/salah 8 goresan")
  const primaryKanjiStep = steps.find((s) => s.kind === 'kanji_grid' && (s.strokeCount || 0) > 0);
  const authStrokeCount = primaryKanjiStep?.strokeCount || characterEntryForHeading?.strokeCount || 0;
  const syncStrokeText = (str?: string): string | undefined => {
    if (typeof str !== 'string' || authStrokeCount <= 0) return str;
    const negatedRe = /\b(?:bukan|jangan|keliru|salah(?:\s+\w+){0,2}|mengira|tidak|dihitung|terhitung|dipecah|pecah\w*\s+menjadi|membagi\w*\s+menjadi|terbagi\s+menjadi)\s+(?:(?:itu|hanya|menjadi|ke)\s+)?(?:\d+|satu|dua|tiga|empat|lima|enam|tujuh|delapan|sembilan|sepuluh|one|two|three|four|five|six|seven|eight|nine|ten)\s+(?:goresan|strokes?|coretan)\b/i;
    if (negatedRe.test(str)) return str;
    return str
      .replace(/\b(?:[2-9]|[1-9]\d+)\s*(goresan|strokes?|coretan)\b/gi, `${authStrokeCount} $1`)
      .replace(
        /\b(dua|tiga|empat|lima|enam|tujuh|delapan|sembilan|sepuluh|sebelas|dua\s+belas|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s+(goresan|strokes?|coretan)\b/gi,
        `${authStrokeCount} $2`
      );
  };

  const syncedSteps =
    authStrokeCount > 0
      ? steps.map((st) => ({
          ...st,
          title: syncStrokeText(st.title),
          text: syncStrokeText(st.text),
          caption: syncStrokeText(st.caption),
          reason: syncStrokeText(st.reason),
          analogy: syncStrokeText(st.analogy),
          descA: syncStrokeText(st.descA),
          descB: syncStrokeText(st.descB),
          bullets: st.bullets?.map((b) => syncStrokeText(b) || b),
          tableRows: st.tableRows?.map((r) =>
            r.map((c, cIdx) => {
              const hdr = String(st.tableHeaders?.[cIdx] || '');
              const isTrapCol = /keliru|salah|hindari|trap|✕|×/i.test(hdr);
              return isTrapCol ? c : syncStrokeText(c) || c;
            })
          ),
          spokenNarration: st.kind === 'kanji_grid' ? st.spokenNarration : syncStrokeText(st.spokenNarration) || st.spokenNarration,
        }))
      : steps;

  return {
    boardTitle: syncStrokeText(boardState.topicTitle || 'Papan Belajar') || 'Papan Belajar',
    boardSubtitle: syncStrokeText(rawBoardSubtitle) || '',
    phaseLabels,
    steps: syncedSteps,
    sourcePages: buildSourceMaterialsFromScenario(scenario, boardState, uploadedMaterials),
  };
}

/**
 * Shared prosodic speech-weight estimator so chunk durations, step spans,
 * caption sentence slicing, word karaoke, and board text sweeps advance at the same cadence.
 */
export function computeProsodicWordWeight(word: string): number {
  const w = String(word || '').trim();
  if (!w) return 0;
  const cleanLen = w.replace(/[^a-zA-Z0-9\u3040-\u30ff\u4e00-\u9faf\u0e00-\u0e7f]/g, '').length;
  const cjkChars = (w.match(/[\u3040-\u30ff\u4e00-\u9faf]/g) || []).length;
  const pauseW = /[,:;()]$/.test(w) ? 2.8 : /[.!?。！？]$/.test(w) ? 4.4 : 0;
  const syllabic = Math.max(cleanLen + cjkChars * 1.4, 1.5);
  return Math.max(2.6, Math.min(12.5, syllabic + 1.1)) + pauseW;
}

export function computeProsodicTextWeight(text: string): number {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return 4;
  return Math.max(5, words.reduce((sum, w) => sum + computeProsodicWordWeight(w), 0));
}

export interface CohesiveBoardStepSpan {
  stepId: string;
  stepIndex: number;
  startFrac: number;
  endFrac: number;
  weight: number;
  caption: string;
  spokenText: string;
}

export interface CohesiveBoardNarrationResult {
  fullScript: string;
  stepSpans: CohesiveBoardStepSpan[];
}

/**
 * Menggabungkan narasi seluruh langkah papan tulis menjadi SATU naskah tutur yang mengalir alami
 * sehingga backend menyintesis audio studio mulus sementara kursor langkah & efek Zoom In/Out
 * terkunci ketat 1:1 terhadap bobot prosodik kata yang benar-benar diucapkan per fase.
 */
export function buildCohesiveBoardNarrationScript(plan: WhiteboardScenePlan): CohesiveBoardNarrationResult {
  const steps = plan?.steps || [];
  if (steps.length === 0) {
    return { fullScript: '', stepSpans: [] };
  }

  const rawParts: Array<{ stepId: string; stepIndex: number; text: string; caption: string; weight: number }> = [];

  steps.forEach((st, idx) => {
    const rawCaption = (st.spokenNarration || st.title || st.text || '')
      .replace(
        /\b(?:perhatikan|dengar(?:kan)?|simak|catat)\s+baik[- ]?baik(?:\s+pembagian\s+tugasnya|\s+aturan\s+ini|\s+kawan)?[,!.:;\s]*/gi,
        ''
      )
      .replace(/\s+/g, ' ')
      .trim();
    const cleaned = rawCaption.replace(/[•|]/g, ', ').replace(/\s+/g, ' ').trim();
    const spokenChunk = !cleaned
      ? ''
      : /[.!?。！？]$/.test(cleaned)
        ? cleaned
        : `${cleaned}.`;
    const spokenWeight = spokenChunk ? computeProsodicTextWeight(spokenChunk) : 4;
    rawParts.push({
      stepId: st.id,
      stepIndex: idx,
      text: spokenChunk,
      caption: rawCaption,
      weight: spokenWeight,
    });
  });

  const totalWeight = Math.max(
    1,
    rawParts.reduce((sum, p) => sum + p.weight, 0)
  );
  let cursor = 0;
  const stepSpans: CohesiveBoardStepSpan[] = rawParts.map((p, idx) => {
    const startFrac = idx === 0 ? 0 : cursor / totalWeight;
    cursor += p.weight;
    const endFrac = idx === rawParts.length - 1 ? 1 : cursor / totalWeight;
    return {
      stepId: p.stepId,
      stepIndex: p.stepIndex,
      startFrac,
      endFrac,
      weight: p.weight,
      caption: p.caption,
      spokenText: p.text,
    };
  });

  const fullScript = rawParts
    .map((p) => p.text)
    .filter(Boolean)
    .join(' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  return { fullScript, stepSpans };
}

export { splitTtsIntoSentenceChunks } from './liveTransport';
