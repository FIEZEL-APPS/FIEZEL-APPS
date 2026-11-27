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
import { resolveVoiceApiCandidateBases, ensureVoiceWorkerSession, splitTtsIntoSentenceChunks } from './liveTransport';
import {
  cleanBoardDisplayText as cleanBoardDisplayTextSsot,
  cleanStepCaptionAndSpokenText,
  deriveHeadingSpokenNarration,
  openerSpokenText,
  stripMetaStepTitle,
  type OpenerPacketLike,
} from './boardSpeechText';
import { layoutGraphToShapes } from './dagreLayout';
import { wbPick, wbFmt } from './i18n';

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

function cleanBoardDisplayText(val: unknown): string {
  return cleanBoardDisplayTextSsot(val);
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
 * Seluruh kredensial AI dikelola terpusat di backend Worker FIEZEL:
 * 1. Backend Worker `/api/voice/whiteboard-stream` (SSE real-time opener + full board)
 * 2. Fallback JSON `/api/voice/partner-turn` melalui kandidat endpoint resmi FIEZEL
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

/**
 * POST JSON ke Worker suara dengan cookie sesi anonim/terverifikasi.
 * Mengembalikan Response (termasuk 4xx) atau null bila jaringan/timeout gagal.
 */
async function postWorkerJson(
  url: string,
  base: string,
  body: string,
  timeoutMs: number
): Promise<Response | null> {
  await ensureVoiceWorkerSession(base).catch(() => false);
  const controller = new AbortController();
  const t = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      credentials: 'include',
      mode: 'cors',
      signal: controller.signal,
    });
  } catch {
    return null;
  } finally {
    window.clearTimeout(t);
  }
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
  /** Lewati Worker (dipakai saat jalur stream sudah ditolak Worker, agar tidak menembak ulang rute yang sama). */
  skipBackend?: boolean;
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

  // 1. Panggil backend resmi (local proxy atau Cloudflare Worker).
  // Rute /api/voice/* dijaga aiSpendGate (identitas wajib): tanpa cookie sesi `fz_id` +
  // credentials:'include', Worker lintas-origin selalu menjawab 401 dan papan jatuh ke kartu offline.
  if (!params.skipBackend) {
    for (const base of bases) {
      try {
        let res = await postWorkerJson(`${base}/api/voice/partner-turn`, base, payloadBody, 24000);
        if (res && (res.status === 401 || res.status === 403)) {
          await ensureVoiceWorkerSession(base, true).catch(() => false);
          res = await postWorkerJson(`${base}/api/voice/partner-turn`, base, payloadBody, 24000);
        }
        if (res?.ok) {
          const data = await res.json().catch(() => null);
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
  }

  // 2. Jika running lokal tanpa server proxy (/api/* 404), coba api.fiezel.my.id melalui sesi Worker resmi (tanpa pernah menaruh API key di browser!)
  if (isLocalHost) {
    try {
      const prodBase = 'https://api.fiezel.my.id';
      const res = await postWorkerJson(`${prodBase}/api/voice/partner-turn`, prodBase, payloadBody, 14000);
      if (res?.ok) {
        const data = await res.json().catch(() => null);
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

  let backendAnswered = false;
  for (const base of bases) {
    const controller = new AbortController();
    const t = window.setTimeout(() => controller.abort(), 24000);
    try {
      await ensureVoiceWorkerSession(base).catch(() => false);
      const doFetch = () =>
        fetch(`${base}/api/voice/whiteboard-stream`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payloadBody,
          credentials: 'include',
          mode: 'cors',
          signal: controller.signal,
        });
      let res = await doFetch();
      if (res.status === 401 || res.status === 403) {
        // Sesi kedaluwarsa / belum terbit: terbitkan ulang cookie fz_id sekali lalu ulangi.
        await ensureVoiceWorkerSession(base, true).catch(() => false);
        res = await doFetch();
      }
      if (!res.ok) {
        window.clearTimeout(t);
        if (res.status === 404 || res.status === 405) break;
        // Worker menjawab (401/403/429/5xx): jangan tembak ulang rute AI yang sama lewat fallback JSON.
        backendAnswered = res.status < 500;
        continue;
      }
      const ctype = res.headers.get('content-type') || '';
      if (ctype.includes('text/event-stream') && res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = '';
        let resolvedBoard: { uiAction?: VoiceUiAction; aiReply?: string } | null = null;
        let openerFired = false;
        const handleFrame = (frame: string) => {
          let evName = 'message';
          const dataLines: string[] = [];
          for (const line of frame.split(/\r?\n/)) {
            if (line.startsWith('event:')) evName = line.slice(6).trim();
            else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim());
          }
          const dataStr = dataLines.join('\n').trim();
          if (!dataStr || dataStr === '[DONE]') return;
          try {
            const pkt = JSON.parse(dataStr);
            if (evName === 'opener') {
              if (!openerFired && typeof onOpenerReady === 'function') {
                openerFired = true;
                try {
                  onOpenerReady(pkt);
                } catch {
                  // Pre-warm hook must never break the stream
                }
              }
            } else if (evName === 'board' && pkt?.uiAction?.actionType === 'open_learning_popup') {
              resolvedBoard = {
                uiAction: pkt.uiAction as VoiceUiAction,
                aiReply: pkt.aiReplyTranslation || pkt.aiReplyTranslationId || pkt.aiReply || '',
              };
            }
          } catch {
            // Ignore partial SSE frame
          }
        };
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const frames = buf.split(/\r?\n\r?\n/);
          buf = frames.pop() || '';
          frames.forEach(handleFrame);
          // Papan sudah lengkap: langsung kembalikan tanpa menunggu server menutup koneksi.
          if (resolvedBoard) {
            try {
              void reader.cancel();
            } catch {
              // ignore
            }
            break;
          }
        }
        if (!resolvedBoard && buf.trim()) handleFrame(buf);
        window.clearTimeout(t);
        if (resolvedBoard) return resolvedBoard;
        backendAnswered = true;
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
      window.clearTimeout(t);
      // Fallback to standard JSON endpoint below
    }
  }

  return requestRealtimeWhiteboardAction({ ...params, skipBackend: backendAnswered });
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
    /^(halo(?:\s+[\w\s,]{1,24})?|hai(?:\s+kawan|\s+semuanya)?|coach\s+\w+\s+di\s+sini|selamat\s+datang\s+di\s+papan\s+(?:belajar|penjelasan)(?:\s+[\w\s]{0,24})?|mari\s+kita\s+(?:mulai|bedah|pelajari|perbaiki|bahas|pahami)(?:\s+[\w\s-]{1,56})?)$/i.test(
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
  const cleanedTitle = step.title ? stripMetaStepTitle(cleanBoardDisplayText(step.title)) : step.title;
  const next: WhiteboardStepCommand = {
    ...step,
    title: cleanedTitle,
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
        timeLabel: cleanBoardDisplayText(ev.timeLabel) || wbPick('Stage', 'Tahap'),
        title: cleanBoardDisplayText(ev.title),
        example: cleanBoardDisplayText(ev.example || '') || undefined,
      }))
      .filter((ev) => Boolean(ev.title));
  }
  if (Array.isArray(step.blocks)) {
    next.blocks = step.blocks
      .map((bl) => ({
        ...bl,
        role: cleanBoardDisplayText(bl.role) || wbPick('Part', 'Bagian'),
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

function extractNarrationTokens(raw: string): string[] {
  const stopRe = /^(?:yang|dan|atau|dengan|untuk|pakai|bisa|tidak|adalah|dari|pada|ini|itu|dalam|akan|saat|jika|kalau|karena|bukan|sisi|panel|bagian|sebelah|the|and|for|with|are|can|not|use|used|this|that|from|left|right)$/;
  return Array.from(
    new Set(
      cleanBoardDisplayText(raw || '')
        .toLowerCase()
        .split(/[^a-z0-9\u3040-\u30ff\u4e00-\u9faf\u0e00-\u0e7f]+/i)
        .filter((t) => (t.length >= 2 || /[\u3040-\u30ff\u4e00-\u9faf\u0e00-\u0e7f]/.test(t)) && !stopRe.test(t))
    )
  );
}

function hasNarrationInvertedLeftRight(narrationLower: string, leftRaw: string, rightRaw: string): boolean {
  const firstLeft = narrationLower.search(/\b(?:sisi|sebelah|panel|kolom|kotak)\s+kiri\b|\bleft\s+(?:side|panel|column)\b|\bon\s+the\s+left\b/);
  const firstRight = narrationLower.search(/\b(?:sisi|sebelah|panel|kolom|kotak)\s+kanan\b|\bright\s+(?:side|panel|column)\b|\bon\s+the\s+right\b/);
  if (firstRight >= 0 && (firstLeft < 0 || firstRight < firstLeft)) {
    return true;
  }
  if (firstLeft >= 0) {
    const afterLeft = narrationLower.slice(firstLeft);
    const rightSplit = afterLeft.search(/\b(?:di\s+)?(?:sisi|sebelah|panel|kolom)\s+kanan\b|\bkedua\b|\bsebaliknya\b|\bsedangkan\b/);
    const leftClause = rightSplit > 0 ? afterLeft.slice(0, rightSplit) : afterLeft.slice(0, 140);
    const leftClean = leftClause.replace(/\b(?:bukan|alih-alih|instead\s+of)\s+[^.!?,;]{1,42}/gi, ' ');
    const lToks = extractNarrationTokens(leftRaw);
    const rToks = extractNarrationTokens(rightRaw);
    const lOnly = lToks.filter((t) => !rToks.includes(t));
    const rOnly = rToks.filter((t) => !lToks.includes(t));
    const lHits = lOnly.filter((t) => leftClean.includes(t)).length;
    const rHits = rOnly.filter((t) => leftClean.includes(t)).length;
    if (rHits > lHits && lHits === 0) {
      return true;
    }
  }
  return false;
}

function doesNarrationCoverPanelPair(narration: string, leftRaw: string, rightRaw: string): boolean {
  const low = narration.toLowerCase();
  if (hasNarrationInvertedLeftRight(low, leftRaw, rightRaw)) return false;
  const lToks = extractNarrationTokens(leftRaw);
  const rToks = extractNarrationTokens(rightRaw);
  const lMatched = lToks.length === 0 || lToks.some((t) => low.includes(t));
  const rMatched = rToks.length === 0 || rToks.some((t) => low.includes(t));
  return lMatched && rMatched;
}

function sortShapesReadingOrder<T extends { op?: string; label?: string; text?: string; x?: number; y?: number; cx?: number; cy?: number; w?: number; h?: number }>(
  rawShapes: T[]
): T[] {
  return [...rawShapes].sort((a, b) => {
    const ax = (typeof a.cx === 'number' ? a.cx : (a.x ?? 0) + (a.w ?? 0) / 2);
    const ay = (typeof a.cy === 'number' ? a.cy : (a.y ?? 0) + (a.h ?? 0) / 2);
    const bx = (typeof b.cx === 'number' ? b.cx : (b.x ?? 0) + (b.w ?? 0) / 2);
    const by = (typeof b.cy === 'number' ? b.cy : (b.y ?? 0) + (b.h ?? 0) / 2);
    if (Math.abs(ay - by) > 48) return ay - by;
    return ax - bx;
  });
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

  // Pertahankan narasi kontekstual dari tutor bila sudah lengkap & selaras spasial Kiri->Kanan
  if (step.kind === 'heading') {
    return deriveHeadingSpokenNarration(step, topicTitle);
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
      const lp = step.leftPanel;
      const rp = step.rightPanel;
      const leftBlob = `${lp?.title || ''} ${step.termA || ''} ${lp?.subtitle || ''} ${lp?.example || ''}`;
      const rightBlob = `${rp?.title || ''} ${step.termB || ''} ${rp?.subtitle || ''} ${rp?.example || ''}`;
      if (existingWords >= 16 && doesNarrationCoverPanelPair(existing, leftBlob, rightBlob)) {
        return /[.!?。！？]$/.test(existing) ? existing : `${existing}.`;
      }
      const an = cleanBoardDisplayText(step.analogy || '');
      const leftCue = lp
        ? wbFmt(
            'First on the left, {title}: {subtitle}{ex}',
            'Pertama di sisi kiri, {title}: {subtitle}{ex}',
            undefined,
            {
              title: lp.title,
              subtitle: lp.subtitle || wbPick('focus on the core rule', 'perhatikan aturan utamanya'),
              ex: lp.example ? wbFmt('. Example: {example}', '. Contohnya kalimat {example}', undefined, { example: lp.example }) : '',
            }
          )
        : '';
      const rightCue = rp
        ? wbFmt(
            'Second on the right, {title}: {subtitle}{ex}',
            'Kedua di sisi kanan, {title}: {subtitle}{ex}',
            undefined,
            {
              title: rp.title,
              subtitle: rp.subtitle || wbPick('compare with this form', 'ini perbandingannya'),
              ex: rp.example ? wbFmt('. Example: {example}', '. Contohnya kalimat {example}', undefined, { example: rp.example }) : '',
            }
          )
        : '';
      return `${leftCue ? `${leftCue}. ` : ''}${rightCue ? `${rightCue}. ` : ''}${an && !/^visualisasi/i.test(an) ? `${wbPick('Key idea', 'Kuncinya')}: ${an}.` : ''}`.replace(/\.{2,}/g, '.').trim();
    }
    case 'mind_map': {
      const brs = (step.branches || []).slice(0, 6);
      const low = existing.toLowerCase();
      const coveredBrs = brs.filter((b) =>
        extractNarrationTokens(`${b.label || ''} ${b.sublabel || ''} ${b.example || ''}`).some((t) => low.includes(t))
      ).length;
      if (existingWords >= 15 && coveredBrs >= Math.min(1, brs.length)) {
        return /[.!?。！？]$/.test(existing) ? existing : `${existing}.`;
      }
      const ordinalsId = ['Pertama', 'Kedua', 'Ketiga', 'Keempat', 'Kelima', 'Keenam'];
      const ordinalsEn = ['First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth'];
      const items = brs
        .map((b, bIdx) => {
          const cleanLbl = String(b.label || '').replace(/^\d+[.)]\s*/, '').trim();
          return wbFmt(
            '{ord}, {label}{sub}{ex}',
            '{ord}, {label}{sub}{ex}',
            undefined,
            {
              ord: wbPick(ordinalsEn[bIdx] || `Point ${bIdx + 1}`, ordinalsId[bIdx] || `Poin ${bIdx + 1}`),
              label: cleanLbl,
              sub: b.sublabel ? `: ${b.sublabel.replace(/[.]+$/, '')}` : '',
              ex: b.example
                ? wbFmt(
                    ', for example {example}',
                    ', contohnya {example}',
                    undefined,
                    { example: b.example.replace(/^[✓✕]\s*/, '').replace(/[.]+$/, '') }
                  )
                : '',
            }
          );
        })
        .join('. ');
      return wbFmt(
        'Understand the core breakdown of {topic} first. {detail}.',
        'Pahami dulu poin kunci {topic} berikut. {detail}.',
        undefined,
        {
          topic: cleanBoardDisplayText(step.metaphorCenterLabel || step.title || topicTitle),
          detail: items || cleanBoardDisplayText(step.title || topicTitle),
        }
      ).replace(/\.{2,}/g, '.').trim();
    }
    case 'timeline_track': {
      const evs = (step.timelineEvents || []).slice(0, 5);
      const low = existing.toLowerCase();
      const coveredEvs = evs.filter((ev) => extractNarrationTokens(`${ev.timeLabel || ''} ${ev.title || ''}`).some((t) => low.includes(t))).length;
      if (existingWords >= 16 && coveredEvs >= Math.min(2, evs.length)) {
        return /[.!?。！？]$/.test(existing) ? existing : `${existing}.`;
      }
      const stops = evs
        .map((ev) => `${ev.timeLabel}: ${ev.title}${ev.example ? wbFmt(', e.g. {example}', ', contohnya {example}', undefined, { example: ev.example }) : ''}`)
        .join(wbPick('. Then ', '. Kemudian '));
      return wbFmt(
        'Follow the timeline from left to right. {stops}.',
        'Ikuti garis waktu dari kiri ke kanan. {stops}.',
        undefined,
        { stops: stops || cleanBoardDisplayText(step.title || topicTitle) }
      ).replace(/\.{2,}/g, '.').trim();
    }
    case 'formula_blocks': {
      const bls = (step.blocks || []).slice(0, 6);
      const low = existing.toLowerCase();
      const coveredBls = bls.filter((bl) => extractNarrationTokens(`${bl.role || ''} ${bl.token || ''}`).some((t) => low.includes(t))).length;
      if (existingWords >= 16 && coveredBls >= Math.min(2, bls.length)) {
        return /[.!?。！？]$/.test(existing) ? existing : `${existing}.`;
      }
      const pieceDesc = bls
        .map((bl, bIdx) => wbFmt(
          'Block {num}, {role}, contains {token}{note}',
          'Blok {num}, {role}, berisi {token}{note}',
          undefined,
          {
            num: bIdx + 1,
            role: bl.role,
            token: bl.token,
            note: bl.note ? wbFmt(', used for {note}', ', digunakan untuk {note}', undefined, { note: bl.note }) : '',
          }
        ))
        .join('. ');
      return wbFmt(
        'Notice the pattern blocks from left to right. {detail}.',
        'Perhatikan susunan blok polanya dari kiri ke kanan. {detail}.',
        undefined,
        { detail: pieceDesc || cleanBoardDisplayText(step.title || topicTitle) }
      ).replace(/\.{2,}/g, '.').trim();
    }
    case 'rough_scene': {
      const orderedShapes = sortShapesReadingOrder(step.shapes || []).filter(
        (s) => s.op !== 'arrow' && s.op !== 'line'
      );
      const partsList = orderedShapes
        .map((s) => {
          const lbl = cleanBoardDisplayText(s.label || s.text || '');
          const sub = cleanBoardDisplayText((s as { sublabel?: string }).sublabel || '');
          return { lbl, text: lbl && sub ? `${lbl}: ${sub}` : lbl };
        })
        .filter((p) => p.text && p.text.length <= 96)
        .slice(0, 6);
      const low = existing.toLowerCase();
      const coveredParts = partsList.filter((p) => extractNarrationTokens(p.text).some((t) => low.includes(t))).length;
      const firstTwo = partsList.slice(0, 2);
      const invertedPair =
        firstTwo.length === 2 &&
        hasNarrationInvertedLeftRight(low, firstTwo[0].text, firstTwo[1].text);
      if (existingWords >= 14 && !invertedPair && coveredParts >= Math.min(2, partsList.length)) {
        return /[.!?。！？]$/.test(existing) ? existing : `${existing}.`;
      }
      const partsDesc = partsList.map((p) => p.text);
      const visualCue = partsDesc.length
        ? wbFmt(' Starting from {parts}.', ' Mulai dari {parts}.', undefined, { parts: partsDesc.join(wbPick(', then ', ', lalu ')) })
        : '';
      const cap = step.caption ? ` ${cleanBoardDisplayText(step.caption)}.` : '';
      return wbFmt(
        'Look closely at the {topic} diagram on the board.{cap}{visualCue}',
        'Perhatikan skema {topic} di papan.{cap}{visualCue}',
        undefined,
        { topic: cleanBoardDisplayText(step.title || topicTitle), cap, visualCue }
      ).trim();
    }
    case 'contrast_scale': {
      const a = cleanBoardDisplayText(step.termA || wbPick('Primary form', 'Bentuk utama'));
      const dA = cleanBoardDisplayText(step.descA || '');
      const b = cleanBoardDisplayText(step.termB || wbPick('Comparison form', 'Bentuk pembanding'));
      const dB = cleanBoardDisplayText(step.descB || '');
      if (existingWords >= 14 && doesNarrationCoverPanelPair(existing, `${a} ${dA}`, `${b} ${dB}`)) {
        return /[.!?。！？]$/.test(existing) ? existing : `${existing}.`;
      }
      const an = cleanBoardDisplayText(step.analogy || '');
      return wbFmt(
        'Compare both sides: {sideA} versus {sideB}.{insight}',
        'Bandingkan sisi kiri dan kanan: {sideA}, versus {sideB}.{insight}',
        undefined,
        {
          sideA: `${a}${dA ? `: ${dA}` : ''}`,
          sideB: `${b}${dB ? `: ${dB}` : ''}`,
          insight: an ? wbFmt(' Key insight: {insight}.', ' Kuncinya: {insight}.', undefined, { insight: an }) : '',
        }
      ).replace(/\.{2,}/g, '.').trim();
    }
    case 'syntax_flow': {
      if (existingWords >= 12) return /[.!?。！？]$/.test(existing) ? existing : `${existing}.`;
      const chain = (step.nodes || [])
        .map((n) => {
          const r = cleanBoardDisplayText(n.role);
          const w = cleanBoardDisplayText(n.word);
          return r && w ? wbFmt('{role}: {word}', '{role} diisi {word}', undefined, { role: r, word: w }) : w || r;
        })
        .filter(Boolean)
        .join(wbPick(', followed by ', ', lalu '));
      const extraExplain = cleanBoardDisplayText(step.reason || _coachExplanation || '');
      if (chain) {
        return wbFmt(
          'Follow the sentence blocks from left to right: {chain}.{extra}',
          'Perhatikan urutan blok kalimat yang tepat dari kiri ke kanan: {chain}.{extra}',
          undefined,
          { chain, extra: extraExplain ? ` ${extraExplain.split(/(?<=[.!?])\s+/)[0]}` : '' }
        ).replace(/\.{2,}/g, '.').trim();
      }
      const formulaHint = cleanBoardDisplayText(step.rightText || step.text || '');
      return wbFmt(
        'Examine the sentence structure for {topic}: {detail}.',
        'Perhatikan susunan struktur kalimat untuk {topic}: {detail}.',
        undefined,
        {
          topic: cleanBoardDisplayText(step.title || topicTitle),
          detail: formulaHint || extraExplain || wbPick('place each clause element in its proper slot', 'letakkan setiap unsur kalimat tepat pada posisinya agar tidak bertabrakan'),
        }
      ).replace(/\.{2,}/g, '.').trim();
    }
    case 'table': {
      const tblRows = (step.tableRows || []).slice(0, 6);
      const low = existing.toLowerCase();
      const coveredRows = tblRows.filter((r) => extractNarrationTokens(r.join(' ')).some((t) => low.includes(t))).length;
      if (existingWords >= 14 && coveredRows >= Math.min(2, tblRows.length)) {
        return /[.!?。！？]$/.test(existing) ? existing : `${existing}.`;
      }
      const rowSummaries = tblRows
        .map((r) => r.map((c) => cleanBoardDisplayText(c)).filter(Boolean).slice(0, 3).join(', '))
        .filter(Boolean)
        .join(wbPick('. Next: ', '. Berikutnya: '));
      return rowSummaries
        ? `${cleanBoardDisplayText(step.title || wbPick('Examples on the board', 'Contoh nyata di papan'))}: ${rowSummaries}.`.trim()
        : `${cleanBoardDisplayText(step.title || wbPick('Review the examples in this table', 'Perhatikan contoh di tabel ini'))}.`.trim();
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
      const why = step.reason ? ` ${wbPick('Reason:', 'Alasannya:')} ${cleanBoardDisplayText(step.reason)}.` : '';
      return wbFmt(
        'Avoid forms like {wrong}. Use {right}.{why}',
        'Hindari kesalahan seperti {wrong}. Yang benar adalah {right}.{why}',
        undefined,
        { wrong: wrongClean || wbPick('the common mistake', 'bentuk yang keliru'), right: rightClean, why }
      ).replace(/\.{2,}/g, '.').trim();
    }
    case 'highlight_callout':
      if (existingWords >= 6) return /[.!?。！？]$/.test(existing) ? existing : `${existing}.`;
      return `${wbPick('Remember this key point:', 'Ingat kuncinya:')} ${cleanBoardDisplayText(step.highlightPhrase || step.text || step.title || topicTitle)}.`.trim();
    case 'interactive_mechanic':
    case 'socratic_slider': {
      const promptPart = cleanBoardDisplayText(step.socraticPrompt || '');
      const base =
        existingWords >= 8
          ? /[.!?。！？]$/.test(existing)
            ? existing
            : `${existing}.`
          : wbFmt(
              'Try interacting directly with {title} on the board.',
              'Coba gerakkan langsung simulasi {title} di papan tulis.',
              undefined,
              { title: cleanBoardDisplayText(step.title || topicTitle) }
            );
      if (promptPart && !base.toLowerCase().includes(promptPart.toLowerCase().slice(0, 16))) {
        return `${base} ${/[.!?。！？]$/.test(promptPart) ? promptPart : `${promptPart}.`}`.trim();
      }
      return base;
    }
    case 'surgical_strike': {
      const wrongClean = cleanBoardDisplayText(step.wrongText || (step.strikeTokens || []).join(' '));
      const promptPart = cleanBoardDisplayText(
        step.socraticPrompt ||
          wbPick(
            'Tap the single word that breaks this pattern.',
            'Sekarang giliranmu, ketuk satu kata yang membuat pola ini keliru.'
          )
      );
      if (existingWords >= 8) {
        const withDot = /[.!?。！？]$/.test(existing) ? existing : `${existing}.`;
        return promptPart && !withDot.toLowerCase().includes(promptPart.toLowerCase().slice(0, 16))
          ? `${withDot} ${promptPart}`.trim()
          : withDot;
      }
      return wbFmt(
        'Look closely at "{wrong}". {prompt}',
        'Coba amati kalimat "{wrong}". {prompt}',
        undefined,
        { wrong: wrongClean || topicTitle, prompt: promptPart }
      ).trim();
    }
    case 'step_derivation': {
      const promptPart = cleanBoardDisplayText(
        step.socraticPrompt ||
          wbPick(
            'Complete the missing final step on the board.',
            'Sekarang pilih nilai yang tepat untuk melengkapi baris terakhir.'
          )
      );
      if (existingWords >= 8) {
        const withDot = /[.!?。！？]$/.test(existing) ? existing : `${existing}.`;
        return promptPart && !withDot.toLowerCase().includes(promptPart.toLowerCase().slice(0, 16))
          ? `${withDot} ${promptPart}`.trim()
          : withDot;
      }
      return wbFmt(
        'Follow each transformation step for {topic}. {prompt}',
        'Ikuti penurunan langkah demi langkah untuk {topic}. {prompt}',
        undefined,
        { topic: cleanBoardDisplayText(step.title || topicTitle), prompt: promptPart }
      ).trim();
    }
    case 'tone_wave':
      return wbFmt(
        'Watch the pitch contour for {word} and trace the blue curve as you pronounce {reading}.',
        'Amati gelombang nada untuk {word} dan ikuti naik turunnya garis biru saat membaca {reading}.',
        undefined,
        { word: cleanBoardDisplayText(step.text || step.title), reading: cleanBoardDisplayText(step.reading || '') }
      ).trim();
    case 'checkpoint':
      return wbFmt(
        'Now try this quick check: {prompt}.',
        'Sekarang coba jawab latihan singkat ini: {prompt}.',
        undefined,
        { prompt: cleanBoardDisplayText(step.text || wbPick('choose the accurate sentence form', 'pilih bentuk kalimat yang benar')) }
      ).trim();
    default:
      return existing || `${cleanBoardDisplayText(step.title || topicTitle)}. ${cleanBoardDisplayText(step.text || step.reason || '')}`.trim();
  }
}

function distillToSixWordInk(raw?: string, maxWords = 7): string {
  const clean = cleanBoardDisplayText(raw || '');
  if (!clean) return '';
  if (/\$|\\frac|\\sqrt|\\int|\\sum|\\log|\\pi/.test(clean)) {
    if (clean.length <= 105) return clean;
    const strippedMathDelims = clean.replace(/\$/g, '');
    const mWords = strippedMathDelims.split(/\s+/).filter(Boolean);
    return mWords.slice(0, Math.max(maxWords, 9)).join(' ').replace(/[,;:.]+$/, '');
  }
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return clean;
  const colonIdx = clean.indexOf(':');
  if (colonIdx > 2 && colonIdx < 34) {
    const head = clean.slice(0, colonIdx).trim();
    const tailWords = clean.slice(colonIdx + 1).trim().split(/\s+/).filter(Boolean);
    if (head.split(/\s+/).length + Math.min(4, tailWords.length) <= maxWords + 1) {
      return `${head}: ${tailWords.slice(0, 4).join(' ')}`.replace(/[,;:.]+$/, '');
    }
  }
  return `${words.slice(0, maxWords).join(' ')}`.replace(/[,;:.]+$/, '');
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
    step.kind === 'interactive_mechanic' ||
    step.kind === 'socratic_slider' ||
    step.kind === 'surgical_strike' ||
    step.kind === 'step_derivation'
  ) {
    return Math.max(3600, Math.min(10500, words * 430 + 750));
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
 * Combinatorial Multi-Mechanic & Artisanal Ink Synthesizer:
 * Menghasilkan pasangan Beat interaktif yang SANGAT BERVARIASI (Seesaw, Scratch Foil, Venn Bucket,
 * Rotary Dial, Fraction Shader, Wire Connector, Wave Oscillator, Magnetic Rail, Direct-2D Rough Sketch)
 * dengan palet tinta dan tekstur arsir Rough.js yang selalu kontras antara Kiri & Kanan!
 */
function gcdPositive(a: number, b: number): number {
  let x = Math.abs(Math.round(a));
  let y = Math.abs(Math.round(b));
  while (y !== 0) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x || 1;
}

function synthesizePolymathStemBeats(
  boardState: BoardDynamicDataSubset,
  targetLang?: TargetLang,
  extraContextText = ''
): WhiteboardStepCommand[] | null {
  const title = (boardState.topicTitle || '').trim();
  const formulaRaw = (boardState.patternFormula || '').trim();
  const queryAndTitleBlob = `${title} ${formulaRaw} ${extraContextText}`;
  const blob = `${queryAndTitleBlob} ${boardState.coachExplanation || ''}`.toLowerCase();

  if (/kanji|hanzi|kakijun|urutan\s*goresan/i.test(queryAndTitleBlob)) {
    return null;
  }

  // 0A. 3D Cube, Paper Net Folding & Solid Geometry (`kubus`, `jaring-jaring`, `balok`, `bangun ruang`)!
  if (/\b(?:kubus|jaring[- ]?jaring|balok|bangun\s*ruang|cube|rusuk\s*kubus)\b/i.test(blob)) {
    const sideMatch = queryAndTitleBlob.match(/(?:rusuk|sisi|s)\s*(?:=\s*)?(\d+)/i) || queryAndTitleBlob.match(/(\d+)\s*cm/i);
    const sVal = sideMatch ? Math.max(2, Math.min(12, Number(sideMatch[1]))) : 4;
    const areaVal = 6 * sVal * sVal;
    const volVal = sVal * sVal * sVal;
    const asksVolume = /\bvolume|isi\b/i.test(queryAndTitleBlob);
    return [
      {
        id: 'wb_dyn_cube_3d_sandbox',
        kind: 'interactive_mechanic',
        mechanic: 'experiment_sandbox',
        sandboxKind: 'cube_3d_net',
        sandboxParams: { sideCm: sVal },
        inkPalette: 'cobalt_blueprint',
        roughHatch: 'hachure',
        domainType: 'math',
        column: 'left',
        phaseIndex: 2,
        pauseForInteraction: true,
        title: `Lab Lipat Kertas Jaring-Jaring Kubus 3D ($s = ${sVal}\\text{ cm}$)`,
        socraticPrompt:
          'Geser tuas lipatan hingga 90° (atau ketuk Lipat Jadi Kubus), putar bentuk 3D-nya dengan jari, dan bandingkan pola jaring yang valid vs jaring yang bertabrakan!',
        successVoiceFeedback: `Luar biasa! Keenam persegi terlipat 90 derajat menutup rapat menjadi kubus utuh dengan 6 sisi, 12 rusuk, dan 8 titik sudut!`,
        spokenNarration: `Sekarang saatnya kamu bereksperimen langsung! Coba geser tuas lipatan atau ketuk tombol Lipat Jadi Kubus untuk melipat kertas datar menjadi kubus tiga dimensi, putar sudut pandangnya 360 derajat, lalu uji juga kenapa pola jaring keempat gagal menutup karena dua sisinya bertabrakan!`,
      },
      {
        id: 'wb_dyn_cube_deriv',
        kind: 'step_derivation',
        inkPalette: 'emerald_botanical',
        roughHatch: 'cross-hatch',
        domainType: 'math',
        column: 'right',
        phaseIndex: 3,
        pauseForInteraction: true,
        title: asksVolume ? `Hitung Volume Kubus ($s = ${sVal}\\text{ cm}$)` : `Hitung Luas Permukaan Kubus ($s = ${sVal}\\text{ cm}$)`,
        derivationSteps: asksVolume
          ? [
              { latex: `V = s \\times s \\times s = s^3`, sideOp: '3 dimensi rusuk' },
              {
                latex: `V = ${sVal}^3 = ?`,
                isInteractiveBlank: true,
                expectedValue: `${volVal} cm³`,
                choices: [`${volVal} cm³`, `${areaVal} cm³`, `${sVal * 3} cm³`],
                hint: `Kalikan ${sVal} × ${sVal} × ${sVal}!`,
              },
            ]
          : [
              { latex: `L = 6 \\times s^2 = 6 \\times ${sVal}^2`, sideOp: '6 sisi persegi kembar' },
              {
                latex: `L = 6 \\times ${sVal * sVal} = ?`,
                isInteractiveBlank: true,
                expectedValue: `${areaVal} cm²`,
                choices: [`${areaVal} cm²`, `${volVal} cm²`, `${4 * sVal * sVal} cm²`],
                hint: `Satu persegi luasnya ${sVal * sVal} cm², dikali 6 sisi kubus!`,
              },
            ],
        socraticPrompt: asksVolume
          ? `Berapa volume kubus dengan panjang rusuk ${sVal} cm?`
          : `Karena kubus tersusun dari 6 persegi berukuran ${sVal} × ${sVal} cm, berapa total luas permukaannya?`,
        successVoiceFeedback: asksVolume
          ? `Tepat! ${sVal} pangkat 3 menghasilkan volume ${volVal} cm³!`
          : `Tepat sekali! Enam sisi dikali ${sVal * sVal} cm² menghasilkan luas permukaan ${areaVal} cm²!`,
      },
    ];
  }

  // 0B. Newton's Second Law & Motion Track (`hukum newton`, `gaya`, `percepatan`, `F = m * a`)!
  if (/\bhukum\s*newton\b|\bf\s*=\s*m\s*[·*×x]?\s*a\b|(?:\bgaya\b.*\bpercepatan\b)/i.test(blob)) {
    const fM = queryAndTitleBlob.match(/(\d+)\s*n(?:ewton)?\b/i);
    const mM = queryAndTitleBlob.match(/(\d+)\s*kg\b/i);
    const F = fM ? Number(fM[1]) : 12;
    const M = mM ? Math.max(1, Number(mM[1])) : 3;
    const A = Number((F / M).toFixed(2));
    return [
      {
        id: 'wb_dyn_newton_sandbox',
        kind: 'interactive_mechanic',
        mechanic: 'experiment_sandbox',
        sandboxKind: 'newton_motion_track',
        sandboxParams: { forceN: F, massKg: M },
        inkPalette: 'teal_oscillator',
        roughHatch: 'hachure',
        domainType: 'physics',
        column: 'left',
        phaseIndex: 2,
        pauseForInteraction: true,
        title: `Lintasan Eksperimen Hukum II Newton ($F = m \\cdot a$)`,
        socraticPrompt: 'Atur gaya dorong (F), ubah beban massa (m), uji gesekan permukaan, lalu ketuk Dorong & Luncurkan!',
        successVoiceFeedback: `Melesat! Semakin besar gaya F kereta makin kencang, sedangkan makin berat massa m percepatannya makin tertahan!`,
        spokenNarration: `Sekarang uji sendiri Hukum Kedua Newton di lintasan eksperimen: naik-turunkan gaya dorong dan massa beban di atas kereta, coba ganti permukaan es licin ke aspal kasar, lalu tekan tombol Dorong dan Luncurkan!`,
      },
      {
        id: 'wb_dyn_newton_deriv',
        kind: 'step_derivation',
        inkPalette: 'amber_fulcrum',
        roughHatch: 'cross-hatch',
        domainType: 'physics',
        column: 'right',
        phaseIndex: 3,
        pauseForInteraction: true,
        title: `Hitung Percepatan ($F = ${F}\\text{ N}, m = ${M}\\text{ kg}$)`,
        derivationSteps: [
          { latex: `F = m \\cdot a \\implies a = \\frac{F}{m}`, sideOp: 'Bagi gaya dengan massa' },
          {
            latex: `a = \\frac{${F}}{${M}} = ?`,
            isInteractiveBlank: true,
            expectedValue: `${A} m/s²`,
            choices: [`${A} m/s²`, `${F * M} m/s²`, `${F + M} m/s²`],
            hint: `Bagi gaya ${F} Newton dengan massa ${M} kg!`,
          },
        ],
        socraticPrompt: `Berapa percepatan kereta saat didorong gaya ${F} N dengan massa ${M} kg?`,
        successVoiceFeedback: `Presisi! ${F} dibagi ${M} menghasilkan percepatan ${A} m/s²!`,
      },
    ];
  }

  // 0C. Pythagoras & Circle Interactive 2D Sandbox (`pythagoras`, `sisi miring`, `luas lingkaran`, `keliling lingkaran`)!
  if (/\bpythagor|sisi\s*miring|hipotenusa\b/i.test(blob)) {
    return [
      {
        id: 'wb_dyn_pythagoras_sandbox',
        kind: 'interactive_mechanic',
        mechanic: 'experiment_sandbox',
        sandboxKind: 'geometry_2d_morph',
        sandboxParams: { shape: 'pythagoras', targetBase: 4, targetHeight: 3 },
        inkPalette: 'violet_prism',
        roughHatch: 'hachure',
        domainType: 'math',
        column: 'left',
        phaseIndex: 2,
        pauseForInteraction: true,
        title: 'Meja Eksperimen Segitiga Siku-Siku Pythagoras',
        socraticPrompt: 'Tarik titik sudut merah dan biru langsung di atas petak untuk melihat sisi miring c berubah secara real-time!',
        successVoiceFeedback: 'Mantap! Kamu membuktikan langsung hubungan kuadrat alas ditambah kuadrat tinggi menghasilkan sisi miring!',
        spokenNarration: 'Geser langsung titik sudut segitiga siku-siku di atas kertas berpetak ini dengan jarimu, dan amati bagaimana panjang sisi miring c selalu mengikuti akar dari a kuadrat tambah b kuadrat!',
      },
      {
        id: 'wb_dyn_pythagoras_deriv',
        kind: 'step_derivation',
        inkPalette: 'cobalt_blueprint',
        roughHatch: 'cross-hatch',
        domainType: 'math',
        column: 'right',
        phaseIndex: 3,
        pauseForInteraction: true,
        title: 'Tripel Pythagoras Klasik ($a=3, b=4$)',
        derivationSteps: [
          { latex: `c = \\sqrt{a^2 + b^2} = \\sqrt{3^2 + 4^2}`, sideOp: 'Kuadratkan sisi siku-siku' },
          {
            latex: `c = \\sqrt{9 + 16} = \\sqrt{25} = ?`,
            isInteractiveBlank: true,
            expectedValue: '5',
            choices: ['5', '7', '25'],
            hint: 'Akar kuadrat dari 25 adalah 5!',
          },
        ],
        socraticPrompt: 'Berapa panjang sisi miring c jika alas 3 cm dan tinggi 4 cm?',
        successVoiceFeedback: 'Tepat! Akar dari 25 adalah 5 cm!',
      },
    ];
  }

  // 1A. Japanese Particles に vs で -> Authentic Japanese Spatial / Action Zone Sorter + Surgical Particle Fix!
  if (
    targetLang === 'ja' &&
    (/partikel\s*(?:ni|de)|に.*で|\bni\b.*\bde\b/i.test(queryAndTitleBlob))
  ) {
    return [
      {
        id: 'wb_ja_nide_bucket',
        kind: 'interactive_mechanic',
        mechanic: 'venn_bucket_sorter',
        inkPalette: 'cobalt_blueprint',
        roughHatch: 'hachure',
        domainType: 'language',
        column: 'left',
        phaseIndex: 1,
        pauseForInteraction: true,
        title: 'Sortir Partikel Lokasi: に vs で',
        bucketZones: [
          { id: 'z_ni', label: 'に (Titik Ada / Tujuan)', sublabel: 'いる · ある · 行く · 着く' },
          { id: 'z_de', label: 'で (Tempat Aksi Aktif)', sublabel: '食べる · 勉強する · 働く' },
        ],
        bucketChips: [
          { id: 'c1', label: '部屋にいる (ada di kamar)', targetZoneId: 'z_ni' },
          { id: 'c2', label: 'カフェで飲む (minum di kafe)', targetZoneId: 'z_de' },
          { id: 'c3', label: '駅に着く (tiba di stasiun)', targetZoneId: 'z_ni' },
          { id: 'c4', label: '図書館で勉強する (belajar)', targetZoneId: 'z_de' },
        ],
        socraticPrompt: 'Pilih frasa Jepang di atas, lalu masukkan ke kotak に (keberadaan/tujuan) atau で (aksi berlangsung)!',
        successVoiceFeedback: 'Tepat sekali! Keberadaan diam dan titik tujuan memakai に, sedangkan aksi aktif di lokasi wajib memakai で.',
        spokenNarration: 'Kunci membedakan partikel ni dan de sangat jelas: ni menunjuk titik keberadaan atau tujuan akhir, sedangkan de menandai panggung tempat suatu aksi berlangsung. Sekarang sortir keempat contoh Jepang ini ke kotak yang tepat!',
      },
      {
        id: 'wb_ja_nide_strike',
        kind: 'surgical_strike',
        inkPalette: 'crimson_scalpel',
        roughHatch: 'cross-hatch',
        domainType: 'language',
        column: 'right',
        phaseIndex: 2,
        pauseForInteraction: true,
        title: 'Coret Partikel Lokasi yang Keliru',
        wrongText: '図書館 に 勉強します',
        rightText: '図書館 で 勉強します',
        strikeTokens: ['図書館', 'に', '勉強します'],
        bugTokenIndex: 1,
        fixedToken: 'で',
        reason: '勉強します (belajar) adalah aksi aktif di perpustakaan, jadi wajib memakai で, bukan に!',
        socraticPrompt: 'Ketuk satu partikel yang membuat kalimat "belajar di perpustakaan" ini salah!',
        successVoiceFeedback: 'Tajam! Karena belajar adalah aktivitas aktif, coret に dan ganti dengan で menjadi 図書館で勉強します.',
        spokenNarration: 'Sekarang lihat jebakan paling sering saat ujian: kalimat toshokan ni benkyoushimasu terdengar wajar kalau diterjemahkan dari kata di, padahal salah. Ketuk partikel yang keliru di papan!',
      },
    ];
  }

  // 1B. Mandarin 4 Tones (mā má mǎ mà) -> Authentic 4-Tone Wire Circuit + Ordered Contour Rail!
  if (
    (targetLang === 'zh' || /mandarin|pinyin/i.test(blob)) &&
    (/4\s*nada|empat\s*nada|ma1\s*ma2|mā.*má|nada\s*mandarin/i.test(blob))
  ) {
    return [
      {
        id: 'wb_zh_tones_wire',
        kind: 'interactive_mechanic',
        mechanic: 'wire_node_connector',
        inkPalette: 'terracotta_atelier',
        roughHatch: 'hachure',
        domainType: 'language',
        column: 'left',
        phaseIndex: 1,
        pauseForInteraction: true,
        title: 'Sambung 4 Nada Mandarin: mā · má · mǎ · mà',
        wirePairs: [
          { id: 't1', leftLabel: 'Nada 1: mā 妈 (Datar tinggi)', rightLabel: 'Ibu (suara stabil tinggi)' },
          { id: 't2', leftLabel: 'Nada 2: má 麻 (Naik tajam)', rightLabel: 'Rami / Kebas (seperti "Hah?")' },
          { id: 't3', leftLabel: 'Nada 3: mǎ 马 (Turun-naik)', rightLabel: 'Kuda (ayun rendah ke atas)' },
          { id: 't4', leftLabel: 'Nada 4: mà 骂 (Hentak turun)', rightLabel: 'Memarahi (tegas turun cepat)' },
        ],
        socraticPrompt: 'Hubungkan setiap pola suara nada mā, má, mǎ, mà di kiri dengan arti dan karakter suaranya di kanan!',
        successVoiceFeedback: 'Empat nada tersambung sempurna! Beda ayunan nada pada suku kata ma langsung mengubah arti dari ibu menjadi kuda atau memarahi.',
        spokenNarration: 'Dalam bahasa Mandarin, satu bunyi ma punya empat arti berbeda tergantung tinggi-rendah nadanya: mā datar tinggi berarti ibu, má naik berarti kebas, mǎ mengayun rendah berarti kuda, dan mà menghentak turun berarti memarahi. Sambungkan keempat jalurnya sekarang!',
      },
      {
        id: 'wb_zh_tones_slots',
        kind: 'interactive_mechanic',
        mechanic: 'magnetic_slot_builder',
        inkPalette: 'indigo_constellation',
        roughHatch: 'dots',
        domainType: 'language',
        column: 'right',
        phaseIndex: 2,
        pauseForInteraction: true,
        title: 'Susun Kontur Nada 1 sampai 4',
        magnetSlotRoles: ['Nada 1', 'Nada 2', 'Nada 3', 'Nada 4'],
        magnetTargetTokens: ['mā (Datar 55)', 'má (Naik 35)', 'mǎ (Ayun 214)', 'mà (Turun 51)'],
        socraticPrompt: 'Ketuk keping kontur nada secara berurutan dari Nada 1 sampai Nada 4!',
        successVoiceFeedback: 'Urutan 4 nada Mandarin tepat: datar tinggi, naik bertanya, ayun rendah, lalu hentak turun!',
        spokenNarration: 'Sekarang kunci ingatanmu dengan merakit urutan kontur suara dari Nada 1 sampai Nada 4 pada slot magnetik di kanan!',
      },
    ];
  }

  // 1C. English Prepositions IN / ON / AT -> Responsive Zone Sorter + Scratch Exception!
  if (
    targetLang !== 'ja' &&
    targetLang !== 'zh' &&
    (/\bin\b.*\bon\b.*\bat\b/i.test(queryAndTitleBlob) ||
      (/preposisi|in\s*\/\s*on\s*\/\s*at/i.test(queryAndTitleBlob)))
  ) {
    return [
      {
        id: 'wb_var_preposition_bucket',
        kind: 'interactive_mechanic',
        mechanic: 'venn_bucket_sorter',
        inkPalette: 'cobalt_blueprint',
        roughHatch: 'hachure',
        domainType: 'language',
        column: 'left',
        phaseIndex: 1,
        pauseForInteraction: true,
        title: wbPick('Sort Spatial Scale: IN · ON · AT', 'Sortir Cakupan: IN · ON · AT'),
        bucketZones: [
          { id: 'z_in', label: 'IN (Ruang / Kota / Bulan)', sublabel: 'Wilayah luas tertutup' },
          { id: 'z_on', label: 'ON (Permukaan / Hari)', sublabel: 'Menempel bidang / jalan' },
          { id: 'z_at', label: 'AT (Titik / Jam Spesifik)', sublabel: 'Titik lokasi & jam tepat' },
        ],
        bucketChips: [
          { id: 'c1', label: 'Jakarta / July', targetZoneId: 'z_in' },
          { id: 'c2', label: 'the wall / Monday', targetZoneId: 'z_on' },
          { id: 'c3', label: '7:30 AM / the door', targetZoneId: 'z_at' },
        ],
        socraticPrompt: 'Pilih keping contoh di atas lalu ketuk kotak zona IN, ON, atau AT yang sesuai cakupannya!',
        successVoiceFeedback: 'Tepat sekali! Wilayah luas & bulan pakai IN, permukaan & hari pakai ON, sedangkan titik spesifik & jam pakai AT.',
        spokenNarration: 'Bayangkan IN, ON, dan AT seperti lensa kamera dari luas ke sempit: IN untuk kota, ruang tertutup, atau bulan; ON untuk permukaan tempel dan nama hari; AT untuk titik persis dan jam. Sortir ketiga keping di atas ke kotaknya!',
      },
      {
        id: 'wb_var_preposition_scratch',
        kind: 'interactive_mechanic',
        mechanic: 'scratch_reveal',
        inkPalette: 'terracotta_atelier',
        roughHatch: 'cross-hatch',
        domainType: 'language',
        column: 'right',
        phaseIndex: 2,
        pauseForInteraction: true,
        title: 'Gosok Kapur: Kenapa ON the Bus tapi IN a Car?',
        scratchClueHeader: 'Tebak dulu bedanya bus vs mobil pribadi, lalu usap kartu ini!',
        scratchHiddenFormula: 'Bisa berdiri jalan = ON · Duduk sempit = IN',
        scratchHiddenSubnote: 'on a bus / train / plane  vs  in a car / taxi',
        scratchSketchKind: 'venn_core',
        socraticPrompt: 'Usap kartu terakota di atas dengan jari atau ketuk Buka Cepat untuk membuktikan rahasia kendaraan!',
        successVoiceFeedback: 'Terbongkar! Kalau kabinnya luas dan kamu bisa berdiri berjalan di lantainya seperti bus, kereta, atau pesawat, gunakan ON!',
        spokenNarration: 'Sekarang satu pengecualian favorit penguji: kenapa orang Inggris bilang on the bus padahal kita di dalam bus, sementara untuk mobil memakai in a car? Usap kartu kapur di kanan untuk melihat kuncinya!',
      },
    ];
  }

  // 2A. Quadratic Factoring (`x^2 + bx + c = 0`, e.g., `x^2 - 5x + 6 = 0`) — MUST RUN BEFORE LINEAR `ax + b = c`!
  const quadEqMatch = queryAndTitleBlob.match(/x(?:\^2|²)\s*([+-]\s*\d*)\s*x\s*([+-]\s*\d+)\s*=\s*0/i);
  if (quadEqMatch) {
    const rawB = quadEqMatch[1].replace(/\s+/g, '');
    const b = rawB === '+' ? 1 : rawB === '-' ? -1 : Number(rawB);
    const c = Number(quadEqMatch[2].replace(/\s+/g, ''));
    let pFound: number | null = null;
    let qFound: number | null = null;
    for (let p = -20; p <= 20; p++) {
      for (let q = p; q <= 20; q++) {
        if (p + q === b && p * q === c) {
          pFound = p;
          qFound = q;
          break;
        }
      }
      if (pFound !== null) break;
    }
    if (pFound !== null && qFound !== null) {
      const r1 = -pFound;
      const r2 = -qFound;
      const fmtSigned = (n: number) => (n >= 0 ? `+ ${n}` : `- ${Math.abs(n)}`);
      const factorStr = `(x ${fmtSigned(pFound)})(x ${fmtSigned(qFound)}) = 0`;
      const ansRoots = r1 === r2 ? `x = ${r1}` : `x = ${r1} atau x = ${r2}`;
      const trapSignRoots = r1 === r2 ? `x = ${-r1}` : `x = ${pFound} atau x = ${qFound}`;
      return [
        {
          id: 'wb_dyn_quad_wires',
          kind: 'interactive_mechanic',
          mechanic: 'wire_node_connector',
          inkPalette: 'violet_prism',
          roughHatch: 'dots',
          domainType: 'math',
          column: 'left',
          phaseIndex: 1,
          pauseForInteraction: true,
          title: `Cari Dua Angka Kunci ($p$ dan $q$)`,
          wirePairs: [
            { id: 'qd1', leftLabel: `Jika dijumlahkan ($p + q$)`, rightLabel: `Harus = ${b}` },
            { id: 'qd2', leftLabel: `Jika dikalikan ($p \\times q$)`, rightLabel: `Harus = ${c}` },
            { id: 'qd3', leftLabel: 'Pasangan angka yang cocok', rightLabel: `${pFound} dan ${qFound}` },
          ],
          socraticPrompt: `Hubungkan syarat jumlah dan hasil kali untuk memfaktorkan $x^2 ${fmtSigned(b)}x ${fmtSigned(c)} = 0$!`,
          successVoiceFeedback: `Tepat! Angka ${pFound} dan ${qFound} bila dijumlahkan jadi ${b}, dan bila dikalikan jadi ${c}!`,
          spokenNarration: `Kunci memfaktorkan persamaan kuadrat sangat sederhana: cari dua angka yang kalau dijumlahkan hasilnya koefisien tengah ${b}, dan kalau dikalikan hasilnya angka belakang ${c}. Sambungkan ketiga kuncinya di kiri!`,
        },
        {
          id: 'wb_dyn_quad_deriv',
          kind: 'step_derivation',
          inkPalette: 'terracotta_atelier',
          roughHatch: 'hachure',
          domainType: 'math',
          column: 'right',
          phaseIndex: 2,
          pauseForInteraction: true,
          title: 'Tentukan Akar Pembuat Nol ($x$)',
          derivationSteps: [
            { latex: `x^2 ${fmtSigned(b)}x ${fmtSigned(c)} = 0`, sideOp: `Faktor ${pFound} & ${qFound}` },
            { latex: factorStr, sideOp: 'Balik tanda tiap kurung = 0' },
            {
              latex: '?',
              isInteractiveBlank: true,
              expectedValue: ansRoots,
              choices: Array.from(new Set([ansRoots, trapSignRoots, `x = ${Math.abs(c)}`])),
              hint: `Supaya kurung bernilai 0, tanda angkanya berbalik saat pindah ruas!`,
            },
          ],
          socraticPrompt: `Hati-hati jebakan tanda! Dari ${factorStr}, berapa nilai akar x yang membuat kurung bernilai nol?`,
          successVoiceFeedback: `Tajam! Karena x ${fmtSigned(pFound)} sama dengan nol, tandanya berbalik menjadi ${ansRoots}!`,
          spokenNarration: `Ingat langkah terakhir yang sering menjebak: setelah dapat faktor ${factorStr}, samakan tiap kurung dengan nol sehingga tandanya berbalik. Pilih akar x yang tepat di kanan!`,
        },
      ];
    }
  }

  // 2B. Two-Variable Linear System / SPLDV (`x + y = A` dan `x - y = B`, e.g., `x + y = 10` & `x - y = 4`)!
  const spldvMatch = queryAndTitleBlob.match(/x\s*\+\s*y\s*=\s*(-?\d+).{1,28}?x\s*-\s*y\s*=\s*(-?\d+)/i);
  if (spldvMatch) {
    const sumXY = Number(spldvMatch[1]);
    const diffXY = Number(spldvMatch[2]);
    if ((sumXY + diffXY) % 2 === 0) {
      const xVal = (sumXY + diffXY) / 2;
      const yVal = sumXY - xVal;
      const ansPair = `x = ${xVal}, y = ${yVal}`;
      return [
        {
          id: 'wb_dyn_spldv_wires',
          kind: 'interactive_mechanic',
          mechanic: 'wire_node_connector',
          inkPalette: 'cobalt_blueprint',
          roughHatch: 'hachure',
          domainType: 'math',
          column: 'left',
          phaseIndex: 1,
          pauseForInteraction: true,
          title: `Eliminasi: $x + y = ${sumXY}$ & $x - y = ${diffXY}$`,
          wirePairs: [
            { id: 'sp1', leftLabel: `1. Jumlahkan kedua persamaan (+y dan -y habis)`, rightLabel: `$2x = ${sumXY + diffXY}$` },
            { id: 'sp2', leftLabel: '2. Bagi dua untuk mendapat nilai x', rightLabel: `$x = ${xVal}$` },
            { id: 'sp3', leftLabel: `3. Substitusi $x = ${xVal}$ ke $x + y = ${sumXY}$`, rightLabel: `$y = ${yVal}$` },
          ],
          socraticPrompt: `Hubungkan alur eliminasi untuk menemukan nilai $x$ dan $y$ secara berurutan!`,
          successVoiceFeedback: `Rapi sekali! Begitu kedua persamaan dijumlahkan, variabel y langsung tereliminasi menyisakan 2x = ${sumXY + diffXY}, sehingga x = ${xVal} dan y = ${yVal}!`,
          spokenNarration: `Lihat betapa enaknya sistem x tambah y sama dengan ${sumXY} dan x kurang y sama dengan ${diffXY}: karena tanda y sudah berlawanan, jumlahkan saja kedua persamaan supaya y lenyap menjadi 2x sama dengan ${sumXY + diffXY}! Sambungkan ketiga langkahnya di kiri!`,
        },
        {
          id: 'wb_dyn_spldv_deriv',
          kind: 'step_derivation',
          inkPalette: 'amber_fulcrum',
          roughHatch: 'cross-hatch',
          domainType: 'math',
          column: 'right',
          phaseIndex: 2,
          pauseForInteraction: true,
          title: 'Tentukan Pasangan Solusi $(x, y)$',
          derivationSteps: [
            { latex: `(x + y) + (x - y) = ${sumXY} + ${diffXY} \\implies 2x = ${sumXY + diffXY}`, sideOp: 'Eliminasi y' },
            { latex: `x = ${xVal} \\implies ${xVal} + y = ${sumXY}`, sideOp: 'Substitusi nilai x' },
            {
              latex: '?',
              isInteractiveBlank: true,
              expectedValue: ansPair,
              choices: [ansPair, `x = ${yVal}, y = ${xVal}`, `x = ${sumXY}, y = ${diffXY}`],
              hint: `Karena ${xVal} + y = ${sumXY}, maka y = ${sumXY} - ${xVal} = ${yVal}!`,
            },
          ],
          socraticPrompt: `Ketuk pasangan nilai akhir $x$ dan $y$ yang memenuhi kedua persamaan sekaligus!`,
          successVoiceFeedback: `Tepat! ${xVal} ditambah ${yVal} hasilnya ${sumXY}, dan ${xVal} dikurangi ${yVal} hasilnya ${diffXY}!`,
        },
      ];
    }
  }

  // 2C. Dynamic Single-Variable Linear Equation Parser (`ax ± b = c`, e.g., `3x - 5 = 16` or `5x + 7 = 32`)!
  const linMatch =
    !/x(?:\^2|²)|kuadrat|[+-]\s*\d*\s*y\b/i.test(queryAndTitleBlob)
      ? queryAndTitleBlob.match(/(?:^|[^\w^])(-?\d*)\s*x\s*([+-])\s*(\d+)\s*=\s*(-?\d+)/i)
      : null;
  if (linMatch) {
    const rawA = linMatch[1].trim();
    const a = rawA === '' || rawA === '+' ? 1 : rawA === '-' ? -1 : Number(rawA);
    const op = linMatch[2] as '+' | '-';
    const b = Number(linMatch[3]);
    const c = Number(linMatch[4]);
    const rhsStep = op === '+' ? c - b : c + b;
    const xVal = a !== 0 ? rhsStep / a : NaN;
    if (Number.isFinite(xVal) && Math.abs(xVal - Math.round(xVal * 100) / 100) < 0.001) {
      const cleanX = Number.isInteger(xVal) ? String(xVal) : xVal.toFixed(2);
      const aPrefix = a === 1 ? '' : a === -1 ? '-' : String(a);
      const eqStr = `${aPrefix}x ${op} ${b} = ${c}`;
      const invOp = op === '+' ? '-' : '+';
      const wrongRhs = op === '+' ? c + b : c - b;

      const leftBeat: WhiteboardStepCommand = {
        id: 'wb_dyn_algebra_scale_sandbox',
        kind: 'interactive_mechanic',
        mechanic: 'experiment_sandbox',
        sandboxKind: 'algebra_live_scale',
        sandboxParams: { a, b: op === '+' ? b : -b, c },
        inkPalette: 'violet_prism',
        roughHatch: 'cross-hatch',
        domainType: 'math',
        column: 'left',
        phaseIndex: 2,
        pauseForInteraction: true,
        title: `Timbangan Eksperimen Dua Ruas: $${eqStr}$`,
        socraticPrompt: `Uji sendiri timbangan aljabar di atas: tekan operasi kebalikan di kedua ruas (atau coba tambah satu sisi saja untuk melihat timbangan miring!) hingga tersisa x!`,
        successVoiceFeedback: `Seimbang sempurna! Dengan melakukan operasi kebalikan di kedua ruas, variabel x berdiri sendiri bernilai ${cleanX}.`,
        spokenNarration: `Sekarang bereksperimenlah langsung di timbangan aljabar untuk ${eqStr}: coba tekan tombol operasi kedua ruas untuk mengisolasi x, atau uji apa jadinya kalau kamu hanya mengubah sisi kiri saja!`,
      };

      return [
        leftBeat,
        {
          id: 'wb_dyn_algebra_deriv',
          kind: 'step_derivation',
          inkPalette: 'amber_fulcrum',
          roughHatch: 'hachure',
          domainType: 'math',
          column: 'right',
          phaseIndex: 2,
          pauseForInteraction: true,
          title: `Selesaikan Nilai Akhir $x$`,
          derivationSteps: [
            { latex: `${aPrefix}x ${op} ${b} = ${c}`, sideOp: `${invOp} ${b} kedua ruas` },
            { latex: `${aPrefix}x = ${rhsStep}`, sideOp: `÷ ${a} kedua ruas` },
            {
              latex: 'x = ?',
              isInteractiveBlank: true,
              expectedValue: cleanX,
              choices: Array.from(
                new Set([
                  cleanX,
                  String(Number.isFinite(wrongRhs / a) && Number.isInteger(wrongRhs / a) ? wrongRhs / a : Number(cleanX) - 2),
                  String(rhsStep),
                ])
              ),
              hint: `Bagi ${rhsStep} dengan koefisien ${a}!`,
            },
          ],
          socraticPrompt: `Langkah terakhir: berapa nilai x dari ${rhsStep} dibagi ${a}?`,
          successVoiceFeedback: `Tepat! ${rhsStep} dibagi ${a} adalah ${cleanX}. Coba cek balik: ${a} dikali ${cleanX} ${op === '+' ? 'ditambah' : 'dikurangi'} ${b} hasilnya persis ${c}!`,
          spokenNarration: `Sekarang tuntaskan baris terakhir di kanan: setelah kita tahu ${aPrefix}x sama dengan ${rhsStep}, ketuk nilai x yang benar!`,
        },
      ];
    }
  }

  // 3. Dynamic Fraction Addition / Subtraction (`a/b ± c/d`, e.g., `2/3 + 1/4` or `5/6 - 1/4`)!
  const fracOpMatch = queryAndTitleBlob.match(/(\d+)\s*\/\s*(\d+)\s*([+-])\s*(\d+)\s*\/\s*(\d+)/);
  if (fracOpMatch) {
    const a = Number(fracOpMatch[1]);
    const b = Number(fracOpMatch[2]);
    const op = fracOpMatch[3] as '+' | '-';
    const c = Number(fracOpMatch[4]);
    const d = Number(fracOpMatch[5]);
    if (b > 0 && d > 0) {
      const lcd = (b * d) / gcdPositive(b, d);
      const n1 = a * (lcd / b);
      const n2 = c * (lcd / d);
      const resNum = op === '+' ? n1 + n2 : n1 - n2;
      const g = gcdPositive(Math.abs(resNum), lcd);
      const simpNum = resNum / g;
      const simpDen = lcd / g;
      const ansStr = `${simpNum}/${simpDen}`;
      const trapOpDenom = `${op === '+' ? a + c : a - c}/${op === '+' ? b + d : Math.max(1, Math.abs(b - d))}`;
      const opWord = op === '+' ? 'Jumlahkan' : 'Kurangkan';
      return [
        {
          id: 'wb_dyn_frac_mixer_sandbox',
          kind: 'interactive_mechanic',
          mechanic: 'experiment_sandbox',
          sandboxKind: 'fraction_grid_mixer',
          sandboxParams: { n1: a, d1: b, n2: c, d2: d, op },
          inkPalette: 'teal_oscillator',
          roughHatch: 'hachure',
          domainType: 'math',
          column: 'left',
          phaseIndex: 2,
          pauseForInteraction: true,
          title: `Lab Potong & Gabung Pecahan: $\\frac{${a}}{${b}} ${op} \\frac{${c}}{${d}}$`,
          socraticPrompt: `Tekan tombol Potong Silang (Per ${lcd}) untuk membelah kedua kotak menjadi ukuran petak yang sama, lalu tekan Gabungkan Petaknya!`,
          successVoiceFeedback: `Terlihat nyata! Setelah dipotong silang menjadi ${lcd} petak sama besar, ${n1}/${lcd} ${op} ${n2}/${lcd} menyatu menjadi ${resNum}/${lcd}.`,
          spokenNarration: `Jangan sekadar menghafal KPK! Di laboratorium pecahan ini, tekan tombol Potong Silang supaya kotak ${a}/${b} dan ${c}/${d} terbelah menjadi ukuran petak yang persis sama yaitu per ${lcd}, lalu gabungkan petaknya!`,
        },
        {
          id: 'wb_dyn_frac_deriv',
          kind: 'step_derivation',
          inkPalette: 'violet_prism',
          roughHatch: 'cross-hatch',
          domainType: 'math',
          column: 'right',
          phaseIndex: 2,
          pauseForInteraction: true,
          title: `Hitung Hasil Akhir $\\frac{${a}}{${b}} ${op} \\frac{${c}}{${d}}$`,
          derivationSteps: [
            { latex: `\\frac{${a}}{${b}} ${op} \\frac{${c}}{${d}}`, sideOp: `KPK(${b},${d}) = ${lcd}` },
            { latex: `\\frac{${n1}}{${lcd}} ${op} \\frac{${n2}}{${lcd}}`, sideOp: 'Hitung pembilang saja' },
            {
              latex: '= ?',
              isInteractiveBlank: true,
              expectedValue: ansStr,
              choices: Array.from(new Set([ansStr, trapOpDenom, `${op === '+' ? a + c : Math.max(1, a - c)}/${lcd}`])),
              hint: `Hitung pembilang ${n1} ${op} ${n2} di atas penyebut tetap ${lcd}!`,
            },
          ],
          socraticPrompt: `Ketuk hasil akhir dari ${n1}/${lcd} ${op} ${n2}/${lcd}!`,
          successVoiceFeedback: `Mantap! ${n1} ${op === '+' ? 'ditambah' : 'dikurangi'} ${n2} menghasilkan ${ansStr}, sementara penyebut ${lcd} tetap utuh.`,
          spokenNarration: `Setelah penyebutnya sama-sama ${lcd}, penyebut tidak ikut berubah lagi. Sekarang ketuk hasil akhir perhitungan pembilangnya di kanan!`,
        },
      ];
    }
  }

  // 4. Sequential / Double Percentage Discount (`50% + 20%`, Q42)!
  const discMatch = queryAndTitleBlob.match(/(\d{1,2})\s*%\s*[+&]\s*(\d{1,2})\s*%/);
  if (discMatch && /diskon|discount|potongan|harga/i.test(blob)) {
    const d1 = Number(discMatch[1]);
    const d2 = Number(discMatch[2]);
    const rem1 = 100 - d1;
    const cut2 = (rem1 * d2) / 100;
    const finalPay = rem1 - cut2;
    const realDisc = 100 - finalPay;
    return [
      {
        id: 'wb_dyn_discount_wires',
        kind: 'interactive_mechanic',
        mechanic: 'wire_node_connector',
        inkPalette: 'amber_fulcrum',
        roughHatch: 'hachure',
        domainType: 'math',
        column: 'left',
        phaseIndex: 1,
        pauseForInteraction: true,
        title: `Bedah Diskon Bertingkat ${d1}% + ${d2}%`,
        wirePairs: [
          { id: 'dc1', leftLabel: `1. Diskon pertama ${d1}% dari Rp100rb`, rightLabel: `Sisa tagihan Rp${rem1}rb` },
          { id: 'dc2', leftLabel: `2. Diskon kedua ${d2}% dari sisa Rp${rem1}rb`, rightLabel: `Potong lagi Rp${cut2}rb (bukan Rp${d2}rb!)` },
          { id: 'dc3', leftLabel: '3. Total harga akhir & diskon asli', rightLabel: `Bayar Rp${finalPay}rb (Diskon asli ${realDisc}%)` },
        ],
        socraticPrompt: `Hubungkan tahapan hitung diskon ${d1}% + ${d2}% pada contoh Rp100.000 di atas!`,
        successVoiceFeedback: `Tepat! Karena diskon kedua ${d2}% dihitung dari sisa Rp${rem1}.000, potongannya hanya Rp${cut2}.000 sehingga total diskon aslinya ${realDisc}%, bukan ${d1 + d2}%!`,
        spokenNarration: `Kenapa diskon ${d1}% plus ${d2}% di mal tidak sama dengan ${d1 + d2}%? Karena diskon kedua tidak dihitung dari harga awal, melainkan dari sisa harga setelah dipotong diskon pertama! Sambungkan ketiga tahapannya di kiri!`,
      },
      {
        id: 'wb_dyn_discount_deriv',
        kind: 'step_derivation',
        inkPalette: 'crimson_scalpel',
        roughHatch: 'cross-hatch',
        domainType: 'math',
        column: 'right',
        phaseIndex: 2,
        pauseForInteraction: true,
        title: `Berapa Persen Harga yang Dibayar?`,
        derivationSteps: [
          { latex: `100\\% - ${d1}\\% = ${rem1}\\%`, sideOp: 'Sisa setelah diskon 1' },
          { latex: `${d2}\\% \\times ${rem1}\\% = ${cut2}\\%`, sideOp: 'Potongan diskon 2' },
          {
            latex: `\\text{Bayar} = ${rem1}\\% - ${cut2}\\% = ?`,
            isInteractiveBlank: true,
            expectedValue: `${finalPay}%`,
            choices: [`${finalPay}%`, `${Math.max(0, 100 - (d1 + d2))}%`, `${rem1}%`],
            hint: `Kurangi sisa ${rem1}% dengan potongan kedua ${cut2}%!`,
          },
        ],
        socraticPrompt: `Jadi berapa persen dari harga awal yang benar-benar harus kamu bayar di kasir?`,
        successVoiceFeedback: `Cerdas! Kamu membayar ${finalPay}% dari harga awal, artinya total diskon efektifnya ${realDisc}%, bukan ${d1 + d2}%.`,
        spokenNarration: `Sekarang hitung cepat di kanan: dari sisa ${rem1}% dikurangi potongan kedua ${cut2}%, berapa persen harga yang akhirnya kamu bayar?`,
      },
    ];
  }

  // 5A. Logarithm Concept (`2 log 8 = 3` / `logaritma`)!
  if (/\blogaritma\b|\d+\s*log\s*\d+/i.test(queryAndTitleBlob)) {
    const logMatch = queryAndTitleBlob.match(/(\d+)\s*log\s*(\d+)/i);
    const base = logMatch ? Math.max(2, Number(logMatch[1])) : 2;
    const arg = logMatch ? Math.max(2, Number(logMatch[2])) : 8;
    const expVal = Math.round(Math.log(arg) / Math.log(base));
    return [
      {
        id: 'wb_dyn_log_wires',
        kind: 'interactive_mechanic',
        mechanic: 'wire_node_connector',
        inkPalette: 'indigo_constellation',
        roughHatch: 'dots',
        domainType: 'math',
        column: 'left',
        phaseIndex: 1,
        pauseForInteraction: true,
        title: `Jembatan Pangkat ↔ Logaritma`,
        wirePairs: [
          { id: 'lg1', leftLabel: `Basis pangkat ($${base}$)`, rightLabel: `${base} dikalikan berulang` },
          { id: 'lg2', leftLabel: `Hasil perpangkatan ($${arg}$)`, rightLabel: `${base} × ${base}${expVal >= 3 ? ` × ${base}` : ''} = ${arg}` },
          { id: 'lg3', leftLabel: `Nilai $^${base}\\log ${arg}$`, rightLabel: `Pangkatnya = ${expVal}` },
        ],
        socraticPrompt: `Hubungkan arti logaritma: "${base} pangkat berapa supaya hasilnya ${arg}?"`,
        successVoiceFeedback: `Tepat! Logaritma hanyalah kebalikan dari pangkat: karena ${base} pangkat ${expVal} sama dengan ${arg}, maka ${base} log ${arg} adalah ${expVal}!`,
        spokenNarration: `Jangan takut melihat kata logaritma! Kalimat ${base} log ${arg} sebenarnya cuma bertanya: angka ${base} harus dipangkatkan berapa kali supaya hasilnya jadi ${arg}? Sambungkan ketiga petunjuknya di kiri!`,
      },
      {
        id: 'wb_dyn_log_deriv',
        kind: 'step_derivation',
        inkPalette: 'amber_fulcrum',
        roughHatch: 'hachure',
        domainType: 'math',
        column: 'right',
        phaseIndex: 2,
        pauseForInteraction: true,
        title: `Buktikan Nilai $^${base}\\log ${arg}$`,
        derivationSteps: [
          { latex: `${base}^c = ${arg}`, sideOp: 'Ubah ke bentuk pangkat' },
          { latex: `${base}^{${expVal}} = ${arg}`, sideOp: `${base} dikali ${expVal} faktor` },
          {
            latex: `^${base}\\log ${arg} = ?`,
            isInteractiveBlank: true,
            expectedValue: String(expVal),
            choices: [String(expVal), String(arg / base), String(base * expVal)],
            hint: `Ambil angka pangkat dari ${base}^${expVal} = ${arg}, bukan hasil bagi biasa!`,
          },
        ],
        socraticPrompt: `Ketuk nilai akhir dari $^${base}\\log ${arg}$!`,
        successVoiceFeedback: `Mantap! Bukan ${arg} dibagi ${base}, melainkan pangkatnya yaitu ${expVal}!`,
      },
    ];
  }

  // 5B. Exponent Law (`x^3 * x^4 / x^2`)!
  const expRuleMatch = queryAndTitleBlob.match(/x\^(\d+).{1,14}?x\^(\d+).{1,14}?x\^(\d+)/i);
  if (expRuleMatch && /eksponen|pangkat/i.test(blob)) {
    const e1 = Number(expRuleMatch[1]);
    const e2 = Number(expRuleMatch[2]);
    const e3 = Number(expRuleMatch[3]);
    const finalExp = e1 + e2 - e3;
    const ansExp = `x^${finalExp}`;
    return [
      {
        id: 'wb_dyn_exp_slots',
        kind: 'interactive_mechanic',
        mechanic: 'magnetic_slot_builder',
        inkPalette: 'violet_prism',
        roughHatch: 'hachure',
        domainType: 'math',
        column: 'left',
        phaseIndex: 1,
        pauseForInteraction: true,
        title: 'Sifat Pangkat: Kali = Tambah, Bagi = Kurang',
        magnetSlotRoles: ['1. Perkalian', '2. Pembagian', '3. Hasil Pangkat'],
        magnetTargetTokens: [`x^(${e1}+${e2}) = x^${e1 + e2}`, `Kurangi pangkat ${e3}`, `Hasil ${ansExp}`],
        magnetDistractors: [`x^${e1 * e2}`],
        socraticPrompt: `Susun aturan eksponen untuk $x^${e1} \\times x^${e2} \\div x^${e3}$ secara berurutan!`,
        successVoiceFeedback: `Tepat! Saat basis sama-sama x, dikali artinya pangkat ditambah (${e1}+${e2}=${e1 + e2}), lalu dibagi artinya pangkat dikurangi ${e3} menjadi ${ansExp}!`,
        spokenNarration: `Ingat hukum emas pangkat dengan basis yang sama: perkalian mengubah pangkat jadi penjumlahan, sedangkan pembagian mengubah pangkat jadi pengurangan. Susun urutannya di kiri!`,
      },
      {
        id: 'wb_dyn_exp_deriv',
        kind: 'step_derivation',
        inkPalette: 'teal_oscillator',
        roughHatch: 'cross-hatch',
        domainType: 'math',
        column: 'right',
        phaseIndex: 2,
        pauseForInteraction: true,
        title: 'Sederhanakan Bentuk Pangkat',
        derivationSteps: [
          { latex: `\\frac{x^${e1} \\cdot x^${e2}}{x^${e3}} = x^{${e1} + ${e2} - ${e3}}`, sideOp: 'Gabung pangkat' },
          {
            latex: '= ?',
            isInteractiveBlank: true,
            expectedValue: ansExp,
            choices: [ansExp, `x^${Math.max(1, Math.floor((e1 * e2) / Math.max(1, e3)))}`, `x^${e1 + e2 + e3}`],
            hint: `Hitung ${e1} + ${e2} - ${e3} pada pangkatnya!`,
          },
        ],
        socraticPrompt: `Ketuk bentuk paling sederhana dari $x^{${e1} + ${e2} - ${e3}}$!`,
        successVoiceFeedback: `Cerdas! ${e1} tambah ${e2} kurang ${e3} sama dengan ${finalExp}, jadi jawabannya ${ansExp}!`,
      },
    ];
  }

  // 5C. Indefinite Integral (`integral 3x^2 dx`)!
  if (/\bintegral\b/i.test(queryAndTitleBlob)) {
    const intMatch = queryAndTitleBlob.match(/(\d*)\s*x\^(\d+)/i);
    const coef = intMatch && intMatch[1] ? Number(intMatch[1]) : 3;
    const deg = intMatch ? Number(intMatch[2]) : 2;
    const nextDeg = deg + 1;
    const nextCoef = coef / nextDeg;
    const coefPrefix = nextCoef === 1 ? '' : Number.isInteger(nextCoef) ? String(nextCoef) : `${coef}/${nextDeg}`;
    const ansInt = `${coefPrefix}x^${nextDeg} + C`;
    return [
      {
        id: 'wb_dyn_int_slots',
        kind: 'interactive_mechanic',
        mechanic: 'magnetic_slot_builder',
        inkPalette: 'indigo_constellation',
        roughHatch: 'hachure',
        domainType: 'math',
        column: 'left',
        phaseIndex: 1,
        pauseForInteraction: true,
        title: `Aturan Kebalikan Turunan: $\\int ${coef}x^${deg}\\,dx$`,
        magnetSlotRoles: ['1. Naikkan Pangkat', '2. Bagi Pangkat Baru', '3. Tambah Konstanta'],
        magnetTargetTokens: [`Pangkat ${deg}+1 = ${nextDeg}`, `Bagi koefisien ${coef}/${nextDeg}`, `+ C (konstanta)`],
        magnetDistractors: [`Kurangi pangkat ${deg}-1`],
        socraticPrompt: `Susun 3 langkah integral tak tentu (kebalikan dari turunan)!`,
        successVoiceFeedback: `Tepat! Kalau turunan mengurangi pangkat, integral menaikkan pangkat jadi ${nextDeg}, membagi koefisien dengan ${nextDeg}, dan wajib menambah konstanta C!`,
        spokenNarration: `Integral tak tentu adalah kebalikan persis dari turunan: naikkan dulu pangkat x sebanyak 1 menjadi ${nextDeg}, bagi angka depannya dengan pangkat baru itu, dan jangan pernah lupa ekor plus C! Rakit urutannya di kiri!`,
      },
      {
        id: 'wb_dyn_int_deriv',
        kind: 'step_derivation',
        inkPalette: 'amber_fulcrum',
        roughHatch: 'dots',
        domainType: 'math',
        column: 'right',
        phaseIndex: 2,
        pauseForInteraction: true,
        title: 'Tentukan Hasil Integral Tak Tentu',
        derivationSteps: [
          { latex: `\\int ${coef}x^${deg}\\,dx = \\frac{${coef}}{${deg}+1}x^{${deg}+1} + C`, sideOp: 'Aturan pangkat integral' },
          {
            latex: '= ?',
            isInteractiveBlank: true,
            expectedValue: ansInt,
            choices: [ansInt, `${coefPrefix}x^${nextDeg}`, `${coef * deg}x`],
            hint: `Jangan lupakan konstanta + C pada integral tak tentu!`,
          },
        ],
        socraticPrompt: `Pilih hasil lengkap dari $\\int ${coef}x^${deg}\\,dx$!`,
        successVoiceFeedback: `Sempurna! Hasilnya ${ansInt}, lengkap dengan konstanta C karena turunan dari angka konstanta apa pun bernilai nol!`,
      },
    ];
  }

  // 5D. Ohm's Law (`V = I * R`, e.g., `12 volt` & `4 ohm`)!
  if (/\bhukum\s*ohm\b|\bv\s*=\s*i\s*[·*×x]?\s*r\b/i.test(queryAndTitleBlob)) {
    const vMatch = queryAndTitleBlob.match(/(\d+)\s*volt/i);
    const rMatch = queryAndTitleBlob.match(/(\d+)\s*ohm/i);
    const V = vMatch ? Number(vMatch[1]) : 12;
    const R = rMatch ? Math.max(1, Number(rMatch[1])) : 4;
    const I = Number((V / R).toFixed(2));
    return [
      {
        id: 'wb_dyn_ohm_circuit_sandbox',
        kind: 'interactive_mechanic',
        mechanic: 'experiment_sandbox',
        sandboxKind: 'circuit_ohm_live',
        sandboxParams: { targetV: V, targetR: R },
        inkPalette: 'amber_fulcrum',
        roughHatch: 'hachure',
        domainType: 'physics',
        column: 'left',
        phaseIndex: 2,
        pauseForInteraction: true,
        title: `Lab Rangkaian Listrik Hidup ($V = I \\times R$)`,
        socraticPrompt: `Geser tuas Tegangan Baterai ke ${V} Volt dan amati perubahan kecepatan elektron serta nyala lampu pijar!`,
        successVoiceFeedback: `Menyala terang dan stabil! Pada tegangan ${V} Volt dan hambatan ${R} Ohm, kuat arus terukur tepat ${I} Ampere!`,
        spokenNarration: `Sekarang uji rangkaian listrik hidup di papan: geser tegangan baterai menuju ${V} Volt dan ubah hambatan resistornya untuk melihat langsung bagaimana aliran elektron dan terang lampu berubah mengikuti Hukum Ohm!`,
      },
      {
        id: 'wb_dyn_ohm_deriv',
        kind: 'step_derivation',
        inkPalette: 'cobalt_blueprint',
        roughHatch: 'cross-hatch',
        domainType: 'physics',
        column: 'right',
        phaseIndex: 2,
        pauseForInteraction: true,
        title: 'Hitung Kuat Arus Listrik ($I$)',
        derivationSteps: [
          { latex: `V = I \\cdot R \\implies I = \\frac{V}{R}`, sideOp: 'Rumus arus listrik' },
          {
            latex: `I = \\frac{${V}}{${R}} = ?`,
            isInteractiveBlank: true,
            expectedValue: `${I} A`,
            choices: [`${I} A`, `${V * R} A`, `${V + R} A`],
            hint: `Bagi tegangan ${V} Volt dengan hambatan ${R} Ohm!`,
          },
        ],
        socraticPrompt: `Berapa kuat arus listrik ($I$) yang mengalir pada rangkaian ini?`,
        successVoiceFeedback: `Tepat! ${V} dibagi ${R} menghasilkan arus ${I} Ampere!`,
      },
    ];
  }

  // 5E. Slope / Gradient Between Two Points (`(x1, y1)` & `(x2, y2)`, e.g., `(1, 2)` and `(3, 8)`)!
  const slopePtsMatch = queryAndTitleBlob.match(/\(\s*(-?\d+)\s*,\s*(-?\d+)\s*\).{1,24}?\(\s*(-?\d+)\s*,\s*(-?\d+)\s*\)/);
  if (slopePtsMatch && /gradien|kemiringan|slope/i.test(blob)) {
    const x1 = Number(slopePtsMatch[1]);
    const y1 = Number(slopePtsMatch[2]);
    const x2 = Number(slopePtsMatch[3]);
    const y2 = Number(slopePtsMatch[4]);
    const dy = y2 - y1;
    const dx = x2 - x1;
    if (dx !== 0) {
      const mVal = dy / dx;
      const cleanM = Number.isInteger(mVal) ? String(mVal) : `${dy}/${dx}`;
      const trapInv = Number.isInteger(dx / dy) ? String(dx / dy) : `${dx}/${dy}`;
      return [
        {
          id: 'wb_dyn_slope_wires',
          kind: 'interactive_mechanic',
          mechanic: 'wire_node_connector',
          inkPalette: 'cobalt_blueprint',
          roughHatch: 'hachure',
          domainType: 'math',
          column: 'left',
          phaseIndex: 1,
          pauseForInteraction: true,
          title: `Bedah Gradien Lewat (${x1}, ${y1}) dan (${x2}, ${y2})`,
          wirePairs: [
            { id: 'sl1', leftLabel: '1. Naik tegak (Δy = y₂ - y₁)', rightLabel: `${y2} - ${y1} = ${dy}` },
            { id: 'sl2', leftLabel: '2. Geser datar (Δx = x₂ - x₁)', rightLabel: `${x2} - ${x1} = ${dx}` },
            { id: 'sl3', leftLabel: '3. Kemiringan m = Δy ÷ Δx', rightLabel: `m = ${cleanM}` },
          ],
          socraticPrompt: `Hubungkan komponen perubahan tegak (Δy) dan datar (Δx) untuk garis dari (${x1}, ${y1}) ke (${x2}, ${y2})!`,
          successVoiceFeedback: `Tepat! Gradien selalu naik tegak dibagi geser datar: ${dy} dibagi ${dx} sama dengan ${cleanM}!`,
          spokenNarration: `Ingat rumus anti-terbalik untuk gradien m: selalu perubahan tegak y dikurangi y di atas, dibagi perubahan datar x dikurangi x di bawah! Sambungkan ketiga langkahnya di kiri!`,
        },
        {
          id: 'wb_dyn_slope_deriv',
          kind: 'step_derivation',
          inkPalette: 'amber_fulcrum',
          roughHatch: 'cross-hatch',
          domainType: 'math',
          column: 'right',
          phaseIndex: 2,
          pauseForInteraction: true,
          title: 'Hitung Kemiringan Garis ($m$)',
          derivationSteps: [
            { latex: `m = \\frac{y_2 - y_1}{x_2 - x_1} = \\frac{${y2} - ${y1}}{${x2} - ${x1}}`, sideOp: 'Tegak ÷ Datar' },
            {
              latex: `m = \\frac{${dy}}{${dx}} = ?`,
              isInteractiveBlank: true,
              expectedValue: cleanM,
              choices: Array.from(new Set([cleanM, trapInv, String(dy + dx)])),
              hint: `Bagi Δy (${dy}) dengan Δx (${dx}), jangan terbalik!`,
            },
          ],
          socraticPrompt: `Berapa nilai gradien $m$ dari garis tersebut?`,
          successVoiceFeedback: `Persis! ${dy} dibagi ${dx} menghasilkan gradien ${cleanM}!`,
        },
      ];
    }
  }

  // 5F. Statistics: Mean, Median, Modus (`data 4, 7, 7, 9, 13`, Q174)!
  if (/\b(?:mean|rata-rata|median|modus)\b/i.test(blob)) {
    const dataListMatch = extraContextText.match(/\d+(?:\s*,\s*\d+){2,}/) || queryAndTitleBlob.match(/\d+(?:\s*,\s*\d+){2,}/);
    const nums = dataListMatch
      ? dataListMatch[0].split(',').map((s) => Number(s.trim())).filter((n) => Number.isFinite(n))
      : [4, 7, 7, 9, 13];
    if (nums.length >= 3) {
      const sorted = [...nums].sort((a, b) => a - b);
      const sum = sorted.reduce((acc, v) => acc + v, 0);
      const meanVal = sum / sorted.length;
      const meanStr = Number.isInteger(meanVal) ? String(meanVal) : meanVal.toFixed(1);
      const midIdx = Math.floor(sorted.length / 2);
      const medianVal = sorted.length % 2 === 1 ? sorted[midIdx] : (sorted[midIdx - 1] + sorted[midIdx]) / 2;
      const medianStr = Number.isInteger(medianVal) ? String(medianVal) : medianVal.toFixed(1);
      const freq = new Map<number, number>();
      sorted.forEach((n) => freq.set(n, (freq.get(n) || 0) + 1));
      let modeVal = sorted[0];
      let maxF = 0;
      freq.forEach((f, k) => {
        if (f > maxF) {
          maxF = f;
          modeVal = k;
        }
      });
      return [
        {
          id: 'wb_dyn_stats_wires',
          kind: 'interactive_mechanic',
          mechanic: 'wire_node_connector',
          inkPalette: 'cobalt_blueprint',
          roughHatch: 'hachure',
          domainType: 'math',
          column: 'left',
          phaseIndex: 1,
          pauseForInteraction: true,
          title: `Bedah Data: ${sorted.join(', ')}`,
          wirePairs: [
            { id: 'st1', leftLabel: 'Mean (Jumlah ÷ Banyak data)', rightLabel: `${sum} ÷ ${sorted.length} = ${meanStr}` },
            { id: 'st2', leftLabel: 'Median (Nilai tengah terurut)', rightLabel: `Posisi tengah = ${medianStr}` },
            { id: 'st3', leftLabel: 'Modus (Paling sering muncul)', rightLabel: `Angka ${modeVal} (${maxF}× muncul)` },
          ],
          socraticPrompt: `Hubungkan ukuran Mean, Median, dan Modus dengan hasil dari data ${sorted.join(', ')}!`,
          successVoiceFeedback: `Lengkap! Dari data ${sorted.join(', ')}, rata-ratanya ${meanStr}, nilai tengahnya ${medianStr}, dan modusnya ${modeVal}!`,
          spokenNarration: `Pastikan datanya sudah urut dari terkecil dulu yaitu ${sorted.join(', ')}: Mean menjumlahkan semuanya lalu dibagi ${sorted.length}, Median mengambil angka tepat di tengah, dan Modus mencari angka yang paling sering muncul. Sambungkan ketiganya di kiri!`,
        },
        {
          id: 'wb_dyn_stats_deriv',
          kind: 'step_derivation',
          inkPalette: 'amber_fulcrum',
          roughHatch: 'cross-hatch',
          domainType: 'math',
          column: 'right',
          phaseIndex: 2,
          pauseForInteraction: true,
          title: `Hitung Rata-Rata ($\\bar{x}$)`,
          derivationSteps: [
            { latex: `\\bar{x} = \\frac{${sorted.join(' + ')}}{${sorted.length}}`, sideOp: 'Jumlahkan seluruh data' },
            {
              latex: `\\bar{x} = \\frac{${sum}}{${sorted.length}} = ?`,
              isInteractiveBlank: true,
              expectedValue: meanStr,
              choices: Array.from(new Set([meanStr, String(sum), String(modeVal + 2)])),
              hint: `Bagi total ${sum} dengan banyaknya data (${sorted.length})!`,
            },
          ],
          socraticPrompt: `Berapa hasil akhir rata-rata (Mean) dari ${sum} dibagi ${sorted.length}?`,
          successVoiceFeedback: `Tepat! ${sum} dibagi ${sorted.length} menghasilkan Mean ${meanStr}!`,
        },
      ];
    }
  }

  // 5G. Arithmetic Sequence (`barisan aritmatika`, `3, 7, 11, 15`, `suku ke-10`, Q176)!
  if (/barisan\s*aritmatika|deret\s*aritmatika|suku\s*ke-\d+/i.test(blob)) {
    const seqMatch = queryAndTitleBlob.match(/(-?\d+)\s*,\s*(-?\d+)\s*,\s*(-?\d+)/);
    const nthMatch = queryAndTitleBlob.match(/suku\s*ke[- ]?(\d+)/i);
    if (seqMatch) {
      const a1 = Number(seqMatch[1]);
      const a2 = Number(seqMatch[2]);
      const b = a2 - a1;
      const n = nthMatch ? Math.max(4, Number(nthMatch[1])) : 10;
      const unVal = a1 + (n - 1) * b;
      const bSign = b >= 0 ? `+${b}` : `${b}`;
      return [
        {
          id: 'wb_dyn_arith_wires',
          kind: 'interactive_mechanic',
          mechanic: 'wire_node_connector',
          inkPalette: 'indigo_constellation',
          roughHatch: 'dots',
          domainType: 'math',
          column: 'left',
          phaseIndex: 1,
          pauseForInteraction: true,
          title: `Pola Loncatan: ${a1}, ${a2}, ${Number(seqMatch[3])}, ...`,
          wirePairs: [
            { id: 'ar1', leftLabel: 'Suku pertama (a)', rightLabel: `Mulai dari ${a1}` },
            { id: 'ar2', leftLabel: 'Beda tiap langkah (b)', rightLabel: `Loncat tetap ${bSign}` },
            { id: 'ar3', leftLabel: `Menuju suku ke-${n} (${n - 1} loncatan)`, rightLabel: `${a1} + ${n - 1} × ${b} = ${unVal}` },
          ],
          socraticPrompt: `Hubungkan suku awal, beda loncatan, dan banyak loncatan menuju suku ke-${n}!`,
          successVoiceFeedback: `Tepat! Karena dari suku ke-1 ke suku ke-${n} ada ${n - 1} kali loncatan sebesar ${b}, nilainya adalah ${unVal}!`,
          spokenNarration: `Rahasia rumus barisan aritmatika sangat logis: untuk mencapai suku ke-${n}, kita mulai dari angka pertama ${a1} lalu melompat sebanyak ${n - 1} kali dengan beda ${b}. Hubungkan ketiga unsurnya di kiri!`,
        },
        {
          id: 'wb_dyn_arith_deriv',
          kind: 'step_derivation',
          inkPalette: 'teal_oscillator',
          roughHatch: 'hachure',
          domainType: 'math',
          column: 'right',
          phaseIndex: 2,
          pauseForInteraction: true,
          title: `Hitung Suku ke-${n} ($U_{${n}}$)`,
          derivationSteps: [
            { latex: `U_{${n}} = a + (${n} - 1)b = ${a1} + ${n - 1} \\cdot ${b}`, sideOp: `${n - 1} kali loncatan` },
            {
              latex: `U_{${n}} = ${a1} + ${(n - 1) * b} = ?`,
              isInteractiveBlank: true,
              expectedValue: String(unVal),
              choices: Array.from(new Set([String(unVal), String(a1 + n * b), String(a1 * n)])),
              hint: `Jumlahkan suku awal ${a1} dengan ${(n - 1) * b}!`,
            },
          ],
          socraticPrompt: `Berapa nilai suku ke-${n} ($U_{${n}}$) dari barisan tersebut?`,
          successVoiceFeedback: `Persis! ${a1} ditambah ${(n - 1) * b} menghasilkan suku ke-${n} sebesar ${unVal}!`,
        },
      ];
    }
  }

  // 5H. Triangle Area (`luas segitiga`, `setengah alas kali tinggi`, Q180)!
  if (/luas\s*segitiga|setengah\s*alas\s*kali\s*tinggi/i.test(queryAndTitleBlob)) {
    const alasM = queryAndTitleBlob.match(/alas(?:nya)?\s*(\d+)/i);
    const tinggiM = queryAndTitleBlob.match(/tinggi(?:nya)?\s*(\d+)/i);
    const a = alasM ? Number(alasM[1]) : 12;
    const t = tinggiM ? Number(tinggiM[1]) : 8;
    const rectArea = a * t;
    const triArea = rectArea / 2;
    return [
      {
        id: 'wb_dyn_tri_vertex_sandbox',
        kind: 'interactive_mechanic',
        mechanic: 'experiment_sandbox',
        sandboxKind: 'geometry_2d_morph',
        sandboxParams: { shape: 'triangle', targetBase: a, targetHeight: t },
        inkPalette: 'emerald_botanical',
        roughHatch: 'hachure',
        domainType: 'math',
        column: 'left',
        phaseIndex: 2,
        pauseForInteraction: true,
        title: `Meja Eksperimen Geser Sudut Segitiga ($a=${a}, t=${t}$)`,
        socraticPrompt: 'Geser titik puncak merah & titik alas biru di atas petak, lalu tekan tombol Persegi Panjang Utuh untuk melihat bukti visual ½ × alas × tinggi!',
        successVoiceFeedback: `Terbukti secara visual! Setiap segitiga selalu menempati tepat separuh dari persegi panjang beralas a dan bertinggi t!`,
        spokenNarration: `Jangan cuma hafal setengah alas kali tinggi! Tarik sendiri titik sudut merah dan biru di meja geometri ini, lalu tekan tombol Persegi Panjang Utuh supaya kamu melihat langsung kenapa luas segitiga selalu separuh dari persegi panjang!`,
      },
      {
        id: 'wb_dyn_tri_deriv',
        kind: 'step_derivation',
        inkPalette: 'amber_fulcrum',
        roughHatch: 'cross-hatch',
        domainType: 'math',
        column: 'right',
        phaseIndex: 2,
        pauseForInteraction: true,
        title: `Hitung Luas Segitiga ($a=${a}, t=${t}$)`,
        derivationSteps: [
          { latex: `L = \\frac{1}{2} \\cdot a \\cdot t = \\frac{1}{2} \\cdot ${a} \\cdot ${t}`, sideOp: 'Separuh persegi panjang' },
          {
            latex: `L = \\frac{${rectArea}}{2} = ?`,
            isInteractiveBlank: true,
            expectedValue: String(triArea),
            choices: [String(triArea), String(rectArea), String(a + t)],
            hint: `Bagi luas persegi panjang ${rectArea} menjadi dua!`,
          },
        ],
        socraticPrompt: `Berapa luas segitiga dengan alas ${a} dan tinggi ${t}?`,
        successVoiceFeedback: `Mantap! Setengah dari ${a} dikali ${t} adalah ${triArea}!`,
      },
    ];
  }

  // 5I. Cylinder Volume (`volume tabung`, `jari-jari 7`, `tinggi 10`, Q181)!
  if (/volume\s*tabung/i.test(queryAndTitleBlob)) {
    const rM = queryAndTitleBlob.match(/jari[- ]?jari(?:nya)?\s*(\d+)|\br\s*=\s*(\d+)/i);
    const tM = queryAndTitleBlob.match(/tinggi(?:nya)?\s*(\d+)|\bt\s*=\s*(\d+)/i);
    const r = rM ? Number(rM[1] || rM[2]) : 7;
    const h = tM ? Number(tM[1] || tM[2]) : 10;
    const isM7 = r % 7 === 0;
    const baseNum = isM7 ? (22 / 7) * r * r : Number((3.14 * r * r).toFixed(2));
    const volNum = Number((baseNum * h).toFixed(2));
    return [
      {
        id: 'wb_dyn_cyl_wires',
        kind: 'interactive_mechanic',
        mechanic: 'wire_node_connector',
        inkPalette: 'teal_oscillator',
        roughHatch: 'dots',
        domainType: 'math',
        column: 'left',
        phaseIndex: 1,
        pauseForInteraction: true,
        title: `Volume Tabung ($r = ${r}\\text{ cm}, t = ${h}\\text{ cm}$)`,
        wirePairs: [
          { id: 'cy1', leftLabel: `1. Luas lingkaran alas ($\\pi r^2$)`, rightLabel: `${baseNum} cm²` },
          { id: 'cy2', leftLabel: `2. Tumpuk setinggi $t = ${h}\\text{ cm}$`, rightLabel: `Kalikan dengan ${h} cm` },
          { id: 'cy3', leftLabel: '3. Volume penuh tabung', rightLabel: `${volNum} cm³` },
        ],
        socraticPrompt: `Hubungkan tahapan menghitung volume tabung dari luas alas lingkaran hingga dikalikan tinggi!`,
        successVoiceFeedback: `Presisi! Tabung hanyalah kepingan lingkaran seluas ${baseNum} cm² yang ditumpuk setinggi ${h} cm menjadi ${volNum} cm³!`,
        spokenNarration: `Bayangkan tabung seperti tumpukan koin: hitung dulu luas satu lingkaran alasnya dengan pi r kuadrat yaitu ${baseNum} cm persegi, lalu kalikan dengan tingginya ${h} cm! Sambungkan ketiganya di kiri!`,
      },
      {
        id: 'wb_dyn_cyl_deriv',
        kind: 'step_derivation',
        inkPalette: 'cobalt_blueprint',
        roughHatch: 'hachure',
        domainType: 'math',
        column: 'right',
        phaseIndex: 2,
        pauseForInteraction: true,
        title: 'Hitung Volume Akhir ($V = \\pi r^2 t$)',
        derivationSteps: [
          {
            latex: isM7
              ? `L_{\\text{alas}} = \\frac{22}{7} \\cdot ${r} \\cdot ${r} = ${baseNum}\\text{ cm}^2`
              : `L_{\\text{alas}} = 3.14 \\cdot ${r}^2 = ${baseNum}\\text{ cm}^2`,
            sideOp: 'Luas lingkaran bawah',
          },
          {
            latex: `V = ${baseNum} \\cdot ${h} = ?`,
            isInteractiveBlank: true,
            expectedValue: `${volNum} cm³`,
            choices: [`${volNum} cm³`, `${baseNum + h} cm³`, `${2 * (isM7 ? (22 / 7) * r : Number((3.14 * r).toFixed(1))) * h} cm³`],
            hint: `Kalikan luas alas ${baseNum} cm² dengan tinggi ${h} cm!`,
          },
        ],
        socraticPrompt: `Berapa volume tabung tersebut dalam cm³?`,
        successVoiceFeedback: `Tepat sekali! ${baseNum} dikali ${h} menghasilkan volume ${volNum} cm³!`,
      },
    ];
  }

  // 5J. Inverse Proportion (`perbandingan berbalik nilai` / `pekerja ... hari`, Q184)!
  if (/berbalik\s*nilai|(\d+)\s*pekerja.{1,25}?(\d+)\s*hari/i.test(queryAndTitleBlob)) {
    const nums = (queryAndTitleBlob.match(/\d+/g) || []).map(Number).filter((n) => n > 0);
    if (nums.length >= 3) {
      const [p1, h1, p2] = nums;
      const totalWork = p1 * h1;
      const h2 = totalWork / p2;
      if (Number.isFinite(h2) && Number.isInteger(h2)) {
        const wrongDirect = Math.round((h1 * p2) / p1);
        return [
          {
            id: 'wb_dyn_invprop_seesaw',
            kind: 'interactive_mechanic',
            mechanic: 'balance_seesaw',
            inkPalette: 'amber_fulcrum',
            roughHatch: 'hachure',
            domainType: 'math',
            column: 'left',
            phaseIndex: 1,
            pauseForInteraction: true,
            title: `Timbangan Beban Kerja Tetap ($p_1 \\times h_1 = p_2 \\times h_2$)`,
            seesawLeftFixedLabel: `${p1} orang × ${h1} hari (${totalWork} unit)`,
            seesawLeftWeight: totalWork,
            seesawRightBaseWeight: 0,
            seesawRightFixedLabel: '',
            seesawTokens: [
              { id: 'ip_ok', label: `${p2} orang × ${h2} hari`, weight: totalWork },
              { id: 'ip_trap', label: `${p2} orang × ${wrongDirect} hari`, weight: p2 * wrongDirect },
              { id: 'ip_lo', label: `${p2} orang × ${Math.max(1, h2 - 2)} hari`, weight: p2 * Math.max(1, h2 - 2) },
            ],
            socraticPrompt: `Pekerja bertambah jadi ${p2} orang, otomatis hari makin cepat! Ketuk pasangan yang total bebannya sama (${totalWork})!`,
            successVoiceFeedback: `Seimbang di ${totalWork} unit kerja! Karena pekerja naik dari ${p1} ke ${p2} orang, waktunya turun menjadi ${h2} hari!`,
            spokenNarration: `Hati-hati jebakan kali silang biasa! Pada perbandingan berbalik nilai, makin banyak pekerja justru makin cepat selesai karena hasil kali orang dikali hari selalu tetap ${totalWork}. Seimbangkan timbangan di kiri!`,
          },
          {
            id: 'wb_dyn_invprop_deriv',
            kind: 'step_derivation',
            inkPalette: 'violet_prism',
            roughHatch: 'cross-hatch',
            domainType: 'math',
            column: 'right',
            phaseIndex: 2,
            pauseForInteraction: true,
            title: 'Hitung Waktu Selesai ($h_2$)',
            derivationSteps: [
              { latex: `${p1} \\cdot ${h1} = ${p2} \\cdot h_2 \\implies ${totalWork} = ${p2} \\cdot h_2`, sideOp: 'Total kerja tetap' },
              {
                latex: `h_2 = \\frac{${totalWork}}{${p2}} = ?`,
                isInteractiveBlank: true,
                expectedValue: `${h2} hari`,
                choices: Array.from(new Set([`${h2} hari`, `${wrongDirect} hari`, `${totalWork} hari`])),
                hint: `Bagi total beban ${totalWork} dengan ${p2} pekerja!`,
              },
            ],
            socraticPrompt: `Berapa hari proyek selesai jika dikerjakan oleh ${p2} pekerja?`,
            successVoiceFeedback: `Tepat! ${totalWork} dibagi ${p2} orang selesai dalam ${h2} hari!`,
          },
        ];
      }
    }
  }

  // 5K. Order of Operations / KuKaBaTaKu (`6 + 4 × 3`, `perkalian didahulukan`, Q185)!
  const orderOpMatch = queryAndTitleBlob.match(/(\d+)\s*\+\s*(\d+)\s*(?:×|\*|x|kali)\s*(\d+)/i);
  if (orderOpMatch || /kukabataku|perkalian\s+didahulukan|operasi\s+hitung\s+campuran/i.test(blob)) {
    const a = orderOpMatch ? Number(orderOpMatch[1]) : 6;
    const b = orderOpMatch ? Number(orderOpMatch[2]) : 4;
    const c = orderOpMatch ? Number(orderOpMatch[3]) : 3;
    const mul = b * c;
    const ans = a + mul;
    const wrongSeq = (a + b) * c;
    return [
      {
        id: 'wb_dyn_orderop_slots',
        kind: 'interactive_mechanic',
        mechanic: 'magnetic_slot_builder',
        inkPalette: 'crimson_scalpel',
        roughHatch: 'hachure',
        domainType: 'math',
        column: 'left',
        phaseIndex: 1,
        pauseForInteraction: true,
        title: `Prioritas KuKaBaTaKu: $${a} + ${b} \\times ${c}$`,
        magnetSlotRoles: ['1. Kali Duluan', '2. Baru Tambah', '3. Hasil Akhir'],
        magnetTargetTokens: [`${b} × ${c} = ${mul}`, `${a} + ${mul}`, `= ${ans}`],
        magnetDistractors: [`(${a}+${b}) × ${c} = ${wrongSeq}`],
        socraticPrompt: `Rakit urutan pengerjaan $${a} + ${b} \\times ${c}$ sesuai hierarki operasi hitung!`,
        successVoiceFeedback: `Tepat! Perkalian adalah penjumlahan berulang (${b} × ${c} = ${mul}) sehingga wajib dikerjakan sebelum menjumlahkan ${a}, menghasilkan ${ans}!`,
        spokenNarration: `Kenapa ${a} tambah ${b} kali ${c} hasilnya ${ans} dan bukan ${wrongSeq}? Karena ${b} kali ${c} adalah satu paket penjumlahan berulang bernilai ${mul} yang tidak boleh dipecah! Susun prioritasnya di kiri!`,
      },
      {
        id: 'wb_dyn_orderop_deriv',
        kind: 'step_derivation',
        inkPalette: 'cobalt_blueprint',
        roughHatch: 'dots',
        domainType: 'math',
        column: 'right',
        phaseIndex: 2,
        pauseForInteraction: true,
        title: 'Evaluasi Bertahap',
        derivationSteps: [
          { latex: `${a} + (${b} \\times ${c}) = ${a} + ${mul}`, sideOp: 'Hitung perkalian dulu' },
          {
            latex: `${a} + ${mul} = ?`,
            isInteractiveBlank: true,
            expectedValue: String(ans),
            choices: [String(ans), String(wrongSeq), String(a * b + c)],
            hint: `Jumlahkan ${a} dengan hasil perkalian ${mul}!`,
          },
        ],
        socraticPrompt: `Ketuk hasil akhir yang tepat dari $${a} + ${b} \\times ${c}$!`,
        successVoiceFeedback: `Persis! ${a} ditambah ${mul} hasilnya ${ans}, bukan ${wrongSeq}!`,
      },
    ];
  }

  // 6. Trigonometry (`sin cos tan` / `demi sami desa`, Q39)!
  if (/\bsin\b.*\bcos\b|\btrigonometri\b|demi.*sami.*desa/i.test(blob)) {
    return [
      {
        id: 'wb_stem_trig_wires',
        kind: 'interactive_mechanic',
        mechanic: 'wire_node_connector',
        inkPalette: 'cobalt_blueprint',
        roughHatch: 'hachure',
        domainType: 'math',
        column: 'left',
        phaseIndex: 1,
        pauseForInteraction: true,
        title: 'Jembatan Keledai: DeMi · SaMi · DeSa',
        wirePairs: [
          { id: 'tr1', leftLabel: 'sin θ (SinDeMi)', rightLabel: 'Depan ÷ Miring' },
          { id: 'tr2', leftLabel: 'cos θ (CosSaMi)', rightLabel: 'Samping ÷ Miring' },
          { id: 'tr3', leftLabel: 'tan θ (TanDeSa)', rightLabel: 'Depan ÷ Samping' },
        ],
        socraticPrompt: 'Hubungkan sin θ, cos θ, dan tan θ di kiri dengan perbandingan sisi segitiga siku-sikunya di kanan!',
        successVoiceFeedback: 'Lengkap! Sin adalah Depan per Miring, Cos adalah Samping per Miring, dan Tan adalah Depan per Samping.',
        spokenNarration: 'Pada segitiga siku-siku, posisi sisi Depan selalu berada persis di seberang sudut teta, sedangkan sisi Miring selalu sisi terpanjang di depan siku 90 derajat. Hubungkan rumus SinDeMi, CosSaMi, dan TanDeSa di kiri!',
      },
      {
        id: 'wb_stem_trig_deriv',
        kind: 'step_derivation',
        inkPalette: 'amber_fulcrum',
        roughHatch: 'cross-hatch',
        domainType: 'math',
        column: 'right',
        phaseIndex: 2,
        pauseForInteraction: true,
        title: 'Uji Segitiga Siku 3 - 4 - 5',
        derivationSteps: [
          { latex: '\\text{Depan} = 3, \\; \\text{Samping} = 4, \\; \\text{Miring} = 5', sideOp: 'Gunakan SinDeMi' },
          {
            latex: '\\sin\\theta = \\frac{\\text{Depan}}{\\text{Miring}} = ?',
            isInteractiveBlank: true,
            expectedValue: '3/5',
            choices: ['3/5', '4/5', '3/4'],
            hint: 'Ambil sisi Depan (3) dibagi sisi Miring terpanjang (5)!',
          },
        ],
        socraticPrompt: 'Jika sisi Depan = 3, Samping = 4, dan Miring = 5, berapa nilai sin θ?',
        successVoiceFeedback: 'Tepat! Sin teta adalah Depan dibagi Miring, yaitu 3 per 5!',
        spokenNarration: 'Sekarang terapkan langsung pada segitiga siku-siku 3, 4, dan 5 di kanan: berapa nilai sin teta jika sisi depannya 3 dan sisi miringnya 5?',
      },
    ];
  }

  // 7. Derivative / Power Rule (`turunan / diferensial`, e.g., `f(x) = x^3`, Q41)!
  if (/\bturunan\b|\bdiferensial\b|\bderivative\b|f'\(x\)/i.test(blob)) {
    const expMatch = queryAndTitleBlob.match(/x\^(\d+)/i);
    const n = expMatch ? Math.max(2, Number(expMatch[1])) : 3;
    const nMinus1 = n - 1;
    const ansDeriv = nMinus1 === 1 ? `${n}x` : `${n}x^${nMinus1}`;
    return [
      {
        id: 'wb_stem_deriv_slots',
        kind: 'interactive_mechanic',
        mechanic: 'magnetic_slot_builder',
        inkPalette: 'indigo_constellation',
        roughHatch: 'hachure',
        domainType: 'math',
        column: 'left',
        phaseIndex: 1,
        pauseForInteraction: true,
        title: `Aturan Pangkat Turunan $f(x) = x^${n}$`,
        magnetSlotRoles: ['1. Pangkat Turun', '2. Kurangi 1', '3. Hasil Laju'],
        magnetTargetTokens: [`Kalikan ${n} ke depan`, `Pangkat jadi ${n}-1`, `f'(x) = ${ansDeriv}`],
        magnetDistractors: [`Pangkat jadi ${n}+1`],
        socraticPrompt: `Rakit urutan aturan pangkat untuk menurunkan $f(x) = x^${n}$!`,
        successVoiceFeedback: `Tepat! Turunan mengukur laju perubahan sesaat: pangkat ${n} turun ke depan sebagai pengali, lalu pangkatnya berkurang 1 menjadi ${ansDeriv}.`,
        spokenNarration: `Turunan atau diferensial artinya seberapa cepat kemiringan grafik berubah di satu titik. Untuk fungsi pangkat x pangkat ${n}, pangkatnya turun ke depan lalu berkurang satu. Susun ketiga langkahnya di kiri!`,
      },
      {
        id: 'wb_stem_deriv_calc',
        kind: 'step_derivation',
        inkPalette: 'teal_oscillator',
        roughHatch: 'cross-hatch',
        domainType: 'math',
        column: 'right',
        phaseIndex: 2,
        pauseForInteraction: true,
        title: `Hitung $f'(x)$ dan Kemiringan di $x = 2$`,
        derivationSteps: [
          { latex: `f(x) = x^${n} \\implies f'(x) = ${n}x^{${n}-1}`, sideOp: 'Aturan pangkat' },
          {
            latex: `f'(x) = ?`,
            isInteractiveBlank: true,
            expectedValue: ansDeriv,
            choices: [ansDeriv, `${n}x^${n}`, `x^${nMinus1}`],
            hint: `Pangkat ${n} di depan, lalu pangkat x dikurangi 1 menjadi ${nMinus1}!`,
          },
        ],
        socraticPrompt: `Pilih bentuk akhir turunan pertama dari $f(x) = x^${n}$!`,
        successVoiceFeedback: `Persis! Turunan dari x pangkat ${n} adalah ${ansDeriv}!`,
        spokenNarration: `Sekarang pilih bentuk akhir turunan pertama f aksen x di sebelah kanan!`,
      },
    ];
  }

  // 8. Genuine Single Proper Fraction (`pecahan 3/4`, etc. — NEVER hijack unrelated 'persen' prose!)
  const singleFracMatch = queryAndTitleBlob.match(/\b([1-7])\s*\/\s*([2-8])\b/);
  if (singleFracMatch && /\b(?:pecahan|fraction|juring)\b/i.test(queryAndTitleBlob)) {
    const num = Number(singleFracMatch[1]);
    const den = Number(singleFracMatch[2]);
    if (num >= 1 && num <= den) {
      const pct = Math.round((num / den) * 100);
      return [
        {
          id: 'wb_var_fraction_shader',
          kind: 'interactive_mechanic',
          mechanic: 'fraction_slice_shader',
          inkPalette: 'teal_oscillator',
          roughHatch: 'hachure',
          domainType: 'math',
          column: 'left',
          phaseIndex: 1,
          pauseForInteraction: true,
          title: `Arsir Langsung Pecahan $\\frac{${num}}{${den}}$`,
          sliceTotal: den,
          sliceTargetCount: num,
          sliceCaptionUnit: 'bagian terarsir',
          socraticPrompt: `Ketuk bagian lingkaran atau nomornya sampai terarsir ${num} dari ${den} bagian!`,
          successVoiceFeedback: `Tepat! ${num} dari ${den} bagian lingkaran sudah terarsir (${pct}%).`,
          spokenNarration: `Penyebut ${den} artinya satu lingkaran dibagi menjadi ${den} potong sama besar, sedangkan pembilang ${num} adalah jumlah potong yang kita ambil. Ketuk juringnya sampai terarsir ${num} bagian!`,
        },
        {
          id: 'wb_var_fraction_scratch',
          kind: 'interactive_mechanic',
          mechanic: 'scratch_reveal',
          inkPalette: 'violet_prism',
          roughHatch: 'cross-hatch',
          domainType: 'math',
          column: 'right',
          phaseIndex: 2,
          pauseForInteraction: true,
          title: 'Gosok Konversi Persen & Desimal',
          scratchClueHeader: `Berapa persen nilai ${num} ÷ ${den} × 100%?`,
          scratchHiddenFormula: `$\\frac{${num}}{${den}} \\approx ${pct}\\%$`,
          scratchHiddenSubnote: `Pembilang ${num} dibagi penyebut ${den}`,
          scratchSketchKind: 'prism_split',
          socraticPrompt: `Tebak dulu persentasenya, lalu gosok kartu ungu di atas!`,
          successVoiceFeedback: `Tepat: ${num} per ${den} setara sekitar ${pct} persen!`,
        },
      ];
    }
  }

  // 9. English Modals (`might / should / must`) — ONLY for English modal queries!
  if (
    targetLang === 'en' &&
    /\b(?:might|should|must|modal\s*verb)\b/i.test(queryAndTitleBlob) &&
    !/passive|conditional|reported/i.test(queryAndTitleBlob)
  ) {
    return [
      {
        id: 'wb_var_modal_dial',
        kind: 'interactive_mechanic',
        mechanic: 'rotary_dial_gauge',
        inkPalette: 'amber_fulcrum',
        roughHatch: 'hachure',
        domainType: 'language',
        column: 'left',
        phaseIndex: 1,
        pauseForInteraction: true,
        title: 'Kompas Derajat Keyakinan Modal',
        dialInitialDeg: 25,
        dialTargetDeg: 155,
        dialStops: [
          { angleDeg: 25, label: 'Might (25%)', expression: 'He might be at home.', note: 'Tebakan ragu' },
          { angleDeg: 90, label: 'Should (65%)', expression: 'He should arrive soon.', note: 'Saran / wajar' },
          { angleDeg: 155, label: 'Must (95%)', expression: 'Lights are on: he must be home!', note: 'Bukti kuat!' },
        ],
        socraticPrompt: 'Putar jarum kompas atau ketuk tombol Must (95%) untuk melihat kalimat dengan bukti kuat!',
        successVoiceFeedback: 'Tepat di MUST! Saat ada bukti kuat di depan mata, putar derajat keyakinan ke must.',
        spokenNarration: 'Kata bantu might, should, dan must sebenarnya adalah pengukur seberapa yakin kamu: might masih ragu 25 persen, should saran kuat, dan must hampir pasti 95 persen. Putar kompasnya ke Must!',
      },
      {
        id: 'wb_var_modal_wires',
        kind: 'interactive_mechanic',
        mechanic: 'wire_node_connector',
        inkPalette: 'indigo_constellation',
        roughHatch: 'dots',
        domainType: 'language',
        column: 'right',
        phaseIndex: 2,
        pauseForInteraction: true,
        title: 'Sambung Situasi -> Modal Tepat',
        wirePairs: [
          { id: 'mw1', leftLabel: 'Langit agak mendung', rightLabel: 'It might rain' },
          { id: 'mw2', leftLabel: 'Saran ke teman flu', rightLabel: 'You should rest' },
          { id: 'mw3', leftLabel: 'Wajib sabuk pengaman', rightLabel: 'You must wear it' },
        ],
        socraticPrompt: 'Hubungkan situasi di kiri ke pasangan kalimat modal yang tepat di kanan!',
        successVoiceFeedback: 'Ketiga jalur situasi dan modal sudah tersambung akurat!',
      },
    ];
  }

  // 10. Waves / Frequency / Wavelength (`v = λ · f`, Q47)!
  if (/\b(?:gelombang|panjang\s*gelombang|cepat\s*rambat|wavelength)\b/i.test(queryAndTitleBlob)) {
    return [
      {
        id: 'wb_var_wave_osc',
        kind: 'interactive_mechanic',
        mechanic: 'wave_pendulum_oscillator',
        inkPalette: 'teal_oscillator',
        roughHatch: 'zigzag',
        domainType: 'physics',
        column: 'left',
        phaseIndex: 1,
        pauseForInteraction: true,
        title: 'Osilator Frekuensi vs Panjang Gelombang',
        waveInitialLevel: 1,
        waveTargetLevel: 3,
        waveUnitLabel: 'Frekuensi f',
        socraticPrompt: 'Geser titik gelombang atau ketuk tombol 3× untuk melihat bagaimana jarak antar puncak merapat!',
        successVoiceFeedback: 'Lihat langsung! Saat frekuensi naik 3 kali lipat, panjang gelombangnya memendek tiga puncak dalam ruang yang sama!',
        spokenNarration: 'Cepat rambat gelombang v adalah perkalian panjang gelombang lambda dengan frekuensi f. Coba naikkan frekuensi gelombang di kiri ke 3 kali lipat dan amati jarak antar puncaknya!',
      },
      {
        id: 'wb_var_wave_deriv',
        kind: 'step_derivation',
        inkPalette: 'cobalt_blueprint',
        roughHatch: 'hachure',
        domainType: 'physics',
        column: 'right',
        phaseIndex: 2,
        pauseForInteraction: true,
        title: 'Hubungan Rumus $v = \\lambda \\cdot f$',
        derivationSteps: [
          { latex: 'v = \\lambda \\cdot f', sideOp: 'Bagi kedua ruas dengan f' },
          {
            latex: '\\lambda = ?',
            isInteractiveBlank: true,
            expectedValue: 'v / f',
            choices: ['v / f', 'v · f', 'f / v'],
            hint: 'Karena v = λ × f, maka λ adalah cepat rambat v dibagi frekuensi f!',
          },
        ],
        socraticPrompt: 'Jika cepat rambat v tetap dan frekuensi f naik, apa rumus panjang gelombang λ?',
        successVoiceFeedback: 'Tepat: lambda sama dengan v dibagi f! Itulah bukti matematis kenapa frekuensi makin tinggi membuat panjang gelombang makin pendek.',
      },
    ];
  }

  // 11. Pythagoras (`a^2 + b^2 = c^2`, Q36)!
  if (/pythagor|pythagoras|hypotenuse|teorema\s*pythag|\ba\^?2\s*\+\s*b\^?2/i.test(queryAndTitleBlob)) {
    return [
      {
        id: 'wb_stem_pythagoras_slider',
        kind: 'socratic_slider',
        mechanic: 'direct_2d_canvas_lab',
        inkPalette: 'cobalt_blueprint',
        roughHatch: 'hachure',
        domainType: 'math',
        column: 'left',
        phaseIndex: 1,
        pauseForInteraction: true,
        title: 'Tarik Alas Segitiga Siku-Siku ($a = 3, b = 4$)',
        sliderDomain: 'math_graph',
        mathFnType: 'pythagoras',
        sliderLabel: 'Alas b (tegak a = 3)',
        sliderMin: 1,
        sliderMax: 6,
        sliderStep: 1,
        sliderInitial: 2,
        sliderTarget: 4,
        sliderUnit: '',
        socraticPrompt: 'Tarik titik sudut pada alas segitiga atau ketuk tombol 4 untuk membuktikan sisi miring c!',
        successVoiceFeedback: 'Tepat sekali! Saat sisi tegak 3 dan alas 4, luas persegi 9 ditambah 16 tepat sama dengan persegi miring 25, sehingga c = 5!',
        spokenNarration: 'Kenapa a kuadrat tambah b kuadrat sama dengan c kuadrat? Karena luas persegi pada dua sisi siku-siku kalau digabung persis memenuhi luas persegi pada sisi miring c! Tarik alas b ke angka 4 sekarang!',
      },
      {
        id: 'wb_stem_pythagoras_deriv',
        kind: 'step_derivation',
        inkPalette: 'violet_prism',
        domainType: 'math',
        column: 'right',
        phaseIndex: 2,
        pauseForInteraction: true,
        title: 'Pembuktian Segitiga Emas ($a=3, b=4$)',
        derivationSteps: [
          { latex: 'c^2 = a^2 + b^2 = 3^2 + 4^2', sideOp: 'Kuadratkan tiap sisi' },
          { latex: 'c^2 = 9 + 16 = 25', sideOp: 'Tarik akar kuadrat' },
          { latex: 'c = \\sqrt{25} = ?', isInteractiveBlank: true, expectedValue: '5', choices: ['5', '7', '25'] },
        ],
        socraticPrompt: 'Ketuk hasil akhir dari akar 25 untuk menuntaskan pembuktian Pythagoras!',
        successVoiceFeedback: 'Cerdas! Akar dari 25 adalah 5, membentuk tripel Pythagoras klasik 3, 4, dan 5.',
      },
    ];
  }

  // 12. Circle Area & Circumference (`luas / keliling lingkaran`, Q43 `r = 7 cm`)!
  if (/luas.*lingkaran|keliling.*lingkaran|circle\s*area|\bπ\s*r/i.test(queryAndTitleBlob)) {
    const rMatch = queryAndTitleBlob.match(/jari[- ]?jari(?:nya)?\s*(\d+)|\br\s*=\s*(\d+)|(\d+)\s*cm/i);
    const r = rMatch ? Math.max(2, Math.min(21, Number(rMatch[1] || rMatch[2] || rMatch[3]))) : 7;
    const isMult7 = r % 7 === 0;
    const areaExact = isMult7 ? `${(22 / 7) * r * r} cm²` : `${r * r}π cm²`;
    const kelExact = isMult7 ? `${2 * (22 / 7) * r} cm` : `${2 * r}π cm`;
    return [
      {
        id: 'wb_stem_circle_slider',
        kind: 'socratic_slider',
        mechanic: 'direct_2d_canvas_lab',
        inkPalette: 'teal_oscillator',
        roughHatch: 'cross-hatch',
        domainType: 'math',
        column: 'left',
        phaseIndex: 1,
        pauseForInteraction: true,
        title: `Tarik Jari-Jari Lingkaran ke $r = ${r}\\text{ cm}$`,
        sliderDomain: 'math_graph',
        mathFnType: 'circle_area',
        sliderLabel: 'Radius (r)',
        sliderMin: 1,
        sliderMax: Math.max(8, r + 2),
        sliderStep: 1,
        sliderInitial: Math.max(1, Math.min(3, r - 2)),
        sliderTarget: r,
        sliderUnit: ' cm',
        socraticPrompt: `Tarik tepi lingkaran atau ketuk tombol ${r} cm untuk melihat luasnya!`,
        successVoiceFeedback: `Mantap! Pada r = ${r} cm, karena ${r} habis dibagi 7 kita pakai π = 22/7 sehingga luasnya bulat ${areaExact}!`,
        spokenNarration: `Untuk jari-jari ${r} cm, ingat trik emasnya: kalau r kelipatan 7, gunakan pi sama dengan 22 per 7 supaya angkanya langsung bulat! Tarik jari-jari ke ${r} cm di kiri!`,
      },
      {
        id: 'wb_stem_circle_deriv',
        kind: 'step_derivation',
        inkPalette: 'amber_fulcrum',
        roughHatch: 'hachure',
        domainType: 'math',
        column: 'right',
        phaseIndex: 2,
        pauseForInteraction: true,
        title: `Hitung Luas ($L$) & Keliling ($K$) saat $r = ${r}$`,
        derivationSteps: [
          {
            latex: isMult7
              ? `K = 2 \\cdot \\frac{22}{7} \\cdot ${r} = ${2 * (22 / 7) * r}\\text{ cm}`
              : `K = 2\\pi r = ${2 * r}\\pi\\text{ cm}`,
            sideOp: 'Keliling tepi',
          },
          {
            latex: isMult7
              ? `L = \\frac{22}{7} \\cdot ${r} \\cdot ${r} = ?`
              : `L = \\pi \\cdot ${r}^2 = ?`,
            isInteractiveBlank: true,
            expectedValue: areaExact,
            choices: [
              areaExact,
              kelExact,
              isMult7 ? `${22 * r} cm²` : `${r * 2}π cm²`,
            ],
            hint: isMult7 ? `Sederhanakan 7 dengan ${r}, lalu kalikan 22 × ${r / 7} × ${r}!` : `Kuadratkan ${r} terlebih dulu!`,
          },
        ],
        socraticPrompt: `Berapa luas lingkaran ($L = \\pi r^2$) untuk jari-jari $r = ${r}\\text{ cm}$?`,
        successVoiceFeedback: `Tepat sekali! Kelilingnya ${kelExact} dan luasnya ${areaExact}!`,
      },
    ];
  }

  // 13. Physics Newton II (`F = m · a`, Q44)!
  if (/\bf\s*=\s*m\s*[·*x.]?\s*a\b|hukum\s*(?:2|ii|dua)?\s*newton|newton'?s?\s*(?:second|2nd|law)/i.test(queryAndTitleBlob)) {
    return [
      {
        id: 'wb_stem_newton_slider',
        kind: 'socratic_slider',
        mechanic: 'direct_2d_canvas_lab',
        inkPalette: 'amber_fulcrum',
        roughHatch: 'hachure',
        domainType: 'physics',
        column: 'left',
        phaseIndex: 1,
        pauseForInteraction: true,
        title: 'Tarik Vektor Gaya Dorong ($F = m \\cdot a$)',
        sliderDomain: 'physics_vector',
        sliderLabel: 'Gaya Dorong F',
        sliderMin: 0,
        sliderMax: 24,
        sliderStep: 4,
        sliderInitial: 4,
        sliderTarget: 12,
        sliderUnit: ' N',
        socraticPrompt: 'Tarik panah gaya dorong atau ketuk tombol 12 N untuk mempercepat benda 2 kg!',
        successVoiceFeedback: 'Persis! Makin besar gaya dorong F, percepatan a makin kencang; tapi makin berat massa mobil m, makin berat dipercepat!',
        spokenNarration: 'Hukum 2 Newton menjelaskan kenapa mendorong mobil mogok sendirian terasa lambat dibanding didorong bertiga: percepatan a berbanding lurus dengan gaya dorong F dan berbanding terbalik dengan massa m. Tarik gaya F ke 12 Newton!',
      },
      {
        id: 'wb_stem_newton_seesaw',
        kind: 'interactive_mechanic',
        mechanic: 'balance_seesaw',
        inkPalette: 'indigo_constellation',
        roughHatch: 'cross-hatch',
        domainType: 'physics',
        column: 'right',
        phaseIndex: 2,
        pauseForInteraction: true,
        title: 'Seimbangkan $F = m \\times a$',
        seesawLeftFixedLabel: '$F = 12\\text{ N}$',
        seesawLeftWeight: 12,
        seesawRightBaseWeight: 0,
        seesawRightFixedLabel: '',
        seesawTokens: [
          { id: 'nw_6', label: '$2\\text{ kg} \\times 6\\text{ m/s}^2$', weight: 12 },
          { id: 'nw_3', label: '$2\\text{ kg} \\times 3\\text{ m/s}^2$', weight: 6 },
          { id: 'nw_10', label: '$2\\text{ kg} \\times 10\\text{ m/s}^2$', weight: 20 },
        ],
        socraticPrompt: 'Ketuk pasangan massa × percepatan yang menghasilkan gaya 12 N!',
        successVoiceFeedback: 'Seimbang! Massa 2 kg dikali percepatan 6 m/s² tepat sama dengan gaya dorong 12 Newton.',
      },
    ];
  }

  return null;
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
  const stemBeats = synthesizePolymathStemBeats(boardState);
  if (stemBeats && stemBeats.length > 0) {
    return stemBeats[0];
  }
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
        { op: 'rect', x: 24, y: 14, w: 512, h: 66, fill: '#DBEAFE', stroke: '#1D4ED8', label: '1. IN: Wilayah / Ruang Tertutup (Paling Luas)', sublabel: 'Negara, kota, dalam ruangan: in Jakarta, in the room' },
        { op: 'arrow', x1: 280, y1: 82, x2: 280, y2: 100, stroke: '#1E293B' },
        { op: 'rect', x: 76, y: 102, w: 408, h: 66, fill: '#FEF3C7', stroke: '#D97706', label: '2. ON: Permukaan / Nama Jalan (Sedang)', sublabel: 'Benda menempel permukaan, jalan: on the table, on Sudirman St.' },
        { op: 'arrow', x1: 280, y1: 170, x2: 280, y2: 188, stroke: '#1E293B' },
        { op: 'rect', x: 132, y: 190, w: 296, h: 66, fill: '#DCFCE7', stroke: '#15803D', label: '3. AT: Titik Lokasi / Jam Persis (Paling Sempit)', sublabel: 'Alamat bernomor, pintu, jam: at 10 Sudirman, at 7 AM' },
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
      title: wbPick('To Be vs Active Verb Map', 'Peta Slot Sah To Be vs Verb 1 Aktif'),
      caption: wbPick(
        'Use To Be only with Adjectives, Nouns/Locations, Verb ing, or Passive Verb 3, NEVER bare Verb 1',
        'To Be hanya sah dengan Kata Sifat, Kata Benda/Lokasi, Verb ing, atau Verb 3 (pasif), BUKAN Verb 1'
      ),
      rightText: cleanSample,
      wrongText: cleanWrong,
      highlightTerms: ['Verb ing', 'Verb 3', 'Verb 1', 'To Be', 'Adjective', cleanSample],
      blocks: [
        { role: wbPick('Subject + Verb 1', 'Subjek + Verb 1'), token: 'I agree / work', note: wbPick('Direct active verb, no To Be', 'Kata kerja aktif langsung, tanpa To Be'), color: '#10B981' },
        { role: wbPick('To Be + Adj/Noun', 'To Be + Sifat/Benda'), token: 'I am ready / a student', note: wbPick('State, trait, role, or location', 'Kondisi, sifat, profesi, atau lokasi'), color: '#0EA5E9' },
        { role: wbPick('To Be + Verb-ing', 'To Be + Verb ing'), token: 'I am working', note: wbPick('Action happening right now', 'Aksi yang sedang berlangsung sekarang'), color: '#8B5CF6' },
        { role: wbPick('To Be + Verb 3', 'To Be + Verb 3'), token: 'It is agreed', note: wbPick('Passive voice (acted upon)', 'Kalimat pasif (dikenai tindakan)'), color: '#F59E0B' },
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
        example: /hindari|salah|keliru|trap|wrong|✕|×/i.test(leftTerm)
          ? wrongSentence
            ? `✕ ${wrongSentence}`
            : undefined
          : boardState.pairData?.exampleA ||
            (sampleSentence && /,\s*(?:so|and|but)\s+/i.test(sampleSentence)
              ? `${sampleSentence.split(/,\s*(?:so|and|but)\s+/i)[0].trim().replace(/[.,]+$/, '')}.`
              : sampleSentence || undefined),
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
        example:
          boardState.pairData?.exampleB ||
          (sampleSentence && /,\s*(?:so|and|but)\s+/i.test(sampleSentence)
            ? (() => {
                const rhs = sampleSentence.split(/,\s*(?:so|and|but)\s+/i)[1]?.trim() || '';
                return rhs ? rhs.charAt(0).toUpperCase() + rhs.slice(1) : sampleSentence;
              })()
            : sampleSentence || undefined),
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
    const splitBulletHeadingAndBody = (bullet: string, idx: number): { label: string; sublabel: string } => {
      const normalized = cleanBoardDisplayText(bullet).replace(/([A-Za-z])-([A-Za-z])/g, '$1 — $2');
      const colonIdx = normalized.indexOf(':');
      if (colonIdx > 2 && colonIdx <= 28) {
        const head = truncateDiagramLabel(normalized.slice(0, colonIdx), 28);
        const body = normalized.slice(colonIdx + 1).trim();
        if (head && body) {
          return {
            label: head,
            sublabel: truncateDiagramLabel(body.charAt(0).toUpperCase() + body.slice(1), 115),
          };
        }
      }
      const words = normalized.split(/\s+/).filter(Boolean);
      const rawLead = words
        .slice(0, 3)
        .join(' ')
        .replace(/[.,;!?]+$/, '')
        .replace(/\s+\b(?:tanpa|dengan|untuk|pada|dari|dalam|ke|di|oleh|yang|dan|atau|without|with|for|from|into|and|or)$/i, '')
        .trim();
      const shortLead = truncateDiagramLabel(rawLead, 26);
      return {
        label: shortLead || wbPick(`Point ${idx + 1}`, `Poin ${idx + 1}`),
        sublabel: truncateDiagramLabel(normalized, 115),
      };
    };
    const branches =
      rawBullets.length >= 2
        ? rawBullets.map((b, i) => {
            const pair = splitBulletHeadingAndBody(b, i);
            return {
              label: pair.label,
              sublabel: pair.sublabel,
              example: i === 0 && sampleSentence ? sampleSentence : undefined,
              icon: branchIcons[i % branchIcons.length],
              color: branchColors[i % branchColors.length],
            };
          })
        : [
            {
              label: wbPick('When to Use', 'Kapan Dipakai'),
              sublabel: truncateDiagramLabel(boardState.patternFormula || cleanBoardDisplayText(title), 88),
              icon: 'clock',
              color: '#0EA5E9',
            },
            {
              label: wbPick('Natural Example', 'Contoh Alami'),
              sublabel: sampleSentence || cleanBoardDisplayText(title),
              icon: 'check',
              color: '#10B981',
            },
            {
              label: wbPick('Avoid Traps', 'Hindari Jebakan'),
              sublabel: wrongSentence || wbPick('Check subject & verb form', 'Cek subjek & kata kerja'),
              icon: 'warn',
              color: '#EF4444',
            },
          ];
    return {
      id: 'wb_dynamic_mindmap',
      kind: 'mind_map',
      column: 'left',
      phaseIndex: 2,
      title: `${wbPick('Concept Map', 'Peta Pikiran')}: ${truncateDiagramLabel(cleanBoardDisplayText(title), 44)}`,
      caption: cleanBoardDisplayText(boardState.patternFormula || title),
      metaphorCenterLabel: truncateDiagramLabel(cleanBoardDisplayText(title).replace(/^[A-Za-z]+:\s*/, ''), 28) || wbPick('Core Topic', 'Topik Inti'),
      highlightTerms: [sampleSentence, cleanBoardDisplayText(title)].filter(Boolean),
      branches,
    };
  }

  if (sampleSentence) {
    const cleanSample = cleanBoardDisplayText(sampleSentence);
    const cleanWrong = cleanBoardDisplayText(wrongSentence);
    const tokens = cleanSample.split(/\s+/).filter(Boolean).slice(0, 5);
    const rolesGuess = [
      wbPick('Subject', 'Subjek / Pelaku'),
      wbPick('Key Connector', 'Kunci / Penghubung'),
      wbPick('Main Verb / Core', 'Kata Kerja / Inti'),
      wbPick('Object / Complement', 'Objek / Pelengkap'),
      wbPick('Details', 'Keterangan'),
    ];
    const blockColors = ['#0EA5E9', '#10B981', '#8B5CF6', '#F59E0B', '#EC4899'];
    return {
      id: 'wb_dynamic_blocks',
      kind: 'formula_blocks',
      column: 'left',
      phaseIndex: 2,
      title: `${wbPick('Build the Sentence', 'Rakit Puzzle Kalimat')}: ${cleanBoardDisplayText(title).slice(0, 36)}`,
      caption: cleanBoardDisplayText(boardState.patternFormula || title),
      rightText: cleanSample,
      wrongText: cleanWrong && cleanWrong !== cleanSample ? cleanWrong : undefined,
      highlightTerms: [...tokens.slice(0, 3), cleanSample],
      blocks: tokens.map((tok, idx) => ({
        role: rolesGuess[idx] || `${wbPick('Block', 'Blok')} ${idx + 1}`,
        token: tok,
        note: idx === 1 ? wbPick('Key pattern slot', 'Posisi penentu pola') : undefined,
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
  const left = stripComparisonFluff(m[1]);
  let right = stripComparisonFluff(m[2]);
  // Inherit headword for bare suffix contrasts like "Adjective -ing vs -ed" -> ["Adjective -ing", "Adjective -ed"]
  const leftHeadMatch = left.match(/^([A-Za-z\s]{3,20}?)\s+(-[a-z]+)$/i);
  if (leftHeadMatch && /^-[a-z]+$/i.test(right)) {
    right = `${leftHeadMatch[1].trim()} ${right}`;
  }
  return [left, right];
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
      metaphorCenterLabel: isCamVid ? wbPick('Photo vs Action Video', 'Kamera Foto vs Video Aksi') : `${t1} vs ${t2}`,
      highlightTerms: [t1, t2, ...(raw.highlightTerms || []), sampleSentence].filter(Boolean).slice(0, 6),
      leftPanel: {
        badge: isCamVid ? wbPick('PHOTO MODE', 'MODE FOTO') : wbPick('CONCEPT 1', 'KONSEP 1'),
        title: t1,
        subtitle: d1 || wbPick('Focuses on state, trait, or condition', 'Fokus pada kondisi, sifat, atau keadaan'),
        icon: isCamVid ? 'camera' : 'star',
        accentColor: c1.stroke || '#0369A1',
        bgColor: c1.fill || '#E0F2FE',
      },
      rightPanel: {
        badge: isCamVid ? wbPick('VIDEO MODE', 'MODE VIDEO') : wbPick('CONCEPT 2', 'KONSEP 2'),
        title: t2,
        subtitle: d2 || wbPick('Focuses on action, movement, or habit', 'Fokus pada aktivitas, gerakan, atau aksi nyata'),
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
        .map((v) => `${v.term}${v.reading ? ` (${v.reading})` : ''}: ${v.meaningId}`),
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
  // Never slice inside a word: build whole words up to maxLen and strip dangling connectors/symbols
  const words = cleaned.split(' ');
  let out = '';
  for (const w of words) {
    const next = out ? `${out} ${w}` : w;
    if (next.length <= maxLen) {
      out = next;
    } else {
      break;
    }
  }
  if (!out) {
    out = words[0].slice(0, maxLen);
  }
  out = out
    .replace(/[\s&+•,:;—–/\\-]+$/g, '')
    .replace(/\s+\b(?:dan|atau|yang|untuk|di|ke|dari|dengan|tanpa|tentang|seperti|agar|supaya|saat|ketika|pada|oleh|and|or|to|of|in|for|with|without|about|from|by|a|an|the)$/i, '')
    .replace(/[\s&+•,:;—–/\\-]+$/g, '')
    .trim();
  return out || words[0].slice(0, maxLen);
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
          label: 'Kalimat Alami',
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
            role: i === 0 ? 'Pembuka' : i === rawTokens.slice(0, 4).length - 1 ? 'Hasil / Akhir' : `Tahap ${i + 1}`,
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
      title: `${wbPick('Pattern Block Puzzle', 'Puzzle Blok Pola')}: ${truncateDiagramLabel(shortTitle, 32)}`,
      rightText: rightExpr,
      wrongText: wrongExpr !== rightExpr ? wrongExpr : undefined,
      highlightTerms: [rightExpr, ...blocks.map((b) => b.token)].filter(Boolean).slice(0, 6),
      blocks,
      caption: wbPick('Snap the colored blocks left to right into a natural sentence.', 'Klip puzzle warna-warni dari kiri ke kanan sampai klik jadi kalimat alami.'),
      spokenNarration: `Sekarang kita rakit dalam bentuk blok puzzle berwarna dari kiri ke kanan! Mulai dari ${blocks[0]?.token || 'bagian awal'}, disambung ${blocks[1]?.token || 'kunci pola'}, hingga membentuk ${rightExpr}. Pola ini gampang diingat karena tiap warna punya peran masing-masing.`,
    };
  }

  if (cycle === 3) {
    // Variant 3: Illustrated Metaphor / Focused Two-Side Contrast (no legacy rpg_stats)
    const lowerBlob = `${shortTitle} ${rawFormula} ${rightExpr}`.toLowerCase();
    const hasStative = /\b(?:agree|know|believe|like|want|understand|need|love|hate|xihuan)\b|喜欢/.test(lowerBlob);
    const theme: NonNullable<WhiteboardStepCommand['sceneTheme']> =
      /\b(?:always|usually|often|sometimes|never|modal|must|should|might)\b/.test(lowerBlob)
        ? 'battery_meter'
        : !hasStative && /\b(?:am|is|are|to\s*be)\b/.test(lowerBlob) && /\b(?:do|does|did)\b/.test(lowerBlob)
          ? 'camera_vs_video'
          : 'stage_spotlight';
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
      title: `Timbangan Perbandingan: ${truncateDiagramLabel(shortTitle, 30) || 'Perbandingan Pola'}`,
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

  // Variant 6 (cycle === 6): Vertical Stepped Timeline (Rough Scene)
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

type DirectorInkPaletteId = NonNullable<WhiteboardStepCommand['inkPalette']>;
type DirectorRoughHatchKind = NonNullable<WhiteboardStepCommand['roughHatch']>;

const DIRECTOR_INK_PALETTES: DirectorInkPaletteId[] = [
  'cobalt_blueprint',
  'terracotta_atelier',
  'violet_prism',
  'crimson_scalpel',
  'amber_fulcrum',
  'teal_oscillator',
  'indigo_constellation',
  'emerald_botanical',
];

const DIRECTOR_HATCH_STYLES: DirectorRoughHatchKind[] = [
  'hachure',
  'cross-hatch',
  'zigzag',
  'dots',
  'dashed',
];

function hashDirectorSeed(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h >>> 0);
}

function safeMathOrTruncate(raw: string, maxLen: number): string {
  const s = String(raw || '').trim();
  if (!s) return '';
  if (/\$|\\frac|\\sqrt|\\implies|\\cdot|\\times/.test(s)) {
    return s;
  }
  return truncateDiagramLabel(s, maxLen);
}

function looksIndonesianExplanationProse(raw: string): boolean {
  const s = String(raw || '').toLowerCase();
  if (!s) return false;
  const idMarkers =
    s.match(
      /\b(?:adalah|berarti|sedangkan|sementara|digunakan|menghasilkan|memilih|diucapkan|untuk|yang|atau|jika|urutan|huruf|angka|persegi|segitiga|kalimat|sebagai|pada|dalam|karena|dengan|tanpa)\b/g
    ) || [];
  return idMarkers.length >= 2;
}

function buildMinimalSurgicalStrikeStep(params: {
  id: string;
  title: string;
  wrongEx: string;
  rightEx: string;
  reasonNote: string;
  pal: DirectorInkPaletteId;
  hatch: DirectorRoughHatchKind;
  seed: number;
}): WhiteboardStepCommand | null {
  const { id, title, wrongEx, rightEx, reasonNote, pal, hatch, seed } = params;
  if (!wrongEx || !rightEx || looksIndonesianExplanationProse(wrongEx)) return null;
  const cleanW = cleanBoardDisplayText(wrongEx).replace(/^✕\s*/, '').replace(/[.!?]+$/, '').trim();
  const cleanR = cleanBoardDisplayText(rightEx).replace(/^✓\s*/, '').replace(/[.!?]+$/, '').trim();
  const wToks = cleanW.split(/\s+/).filter(Boolean);
  const rToks = cleanR.split(/\s+/).filter(Boolean);
  if (wToks.length < 2 || wToks.length > 12 || rToks.length < 2 || cleanW.toLowerCase() === cleanR.toLowerCase()) {
    return null;
  }
  let p = 0;
  while (p < wToks.length && p < rToks.length && wToks[p].toLowerCase() === rToks[p].toLowerCase()) {
    p += 1;
  }
  let s = 0;
  while (
    s < wToks.length - p &&
    s < rToks.length - p &&
    wToks[wToks.length - 1 - s].toLowerCase() === rToks[rToks.length - 1 - s].toLowerCase()
  ) {
    s += 1;
  }
  const wrongMid = wToks.slice(p, wToks.length - s);
  const rightMid = rToks.slice(p, rToks.length - s);
  let strikeTokens: string[] = [];
  let bugTokenIndex = 0;
  let fixedToken = '';
  if (wrongMid.length === 1) {
    strikeTokens = wToks;
    bugTokenIndex = p;
    fixedToken = rightMid.join(' ');
  } else if (wrongMid.length === 0 && rightMid.length >= 1 && p < wToks.length) {
    strikeTokens = wToks;
    bugTokenIndex = p;
    fixedToken = `${rightMid.join(' ')} ${wToks[p]}`.trim();
  } else if (wrongMid.length >= 2 && wrongMid.length <= 3) {
    strikeTokens = [...wToks.slice(0, p), wrongMid.join(' '), ...wToks.slice(wToks.length - s)];
    bugTokenIndex = p;
    fixedToken = rightMid.join(' ');
  } else {
    return null;
  }
  return {
    id,
    kind: 'surgical_strike',
    inkPalette: pal,
    roughHatch: hatch,
    variantSeed: seed,
    column: 'right',
    phaseIndex: 2,
    pauseForInteraction: true,
    title: wbPick('Tap the Flawed Word to Fix It', 'Ketuk Kata yang Keliru untuk Mengoreksi'),
    wrongText: cleanW,
    rightText: cleanR,
    strikeTokens,
    bugTokenIndex,
    fixedToken,
    reason: reasonNote,
    socraticPrompt: wbPick(
      'Tap the single flawed part on the board to fix this sentence!',
      'Ketuk bagian kata yang membuat kalimat ini keliru agar terkoreksi!'
    ),
    successVoiceFeedback: wbFmt(
      'Spot on! Replacing "{bug}" gives "{right}".',
      'Tajam! Begitu "{bug}" dikoreksi, kalimatnya menjadi "{right}".',
      undefined,
      { bug: strikeTokens[bugTokenIndex], right: cleanR }
    ),
    spokenNarration: wbFmt(
      'Now test your eye for {t} on the right: look at "{wrong}" and tap the single flawed part!',
      'Sekarang uji ketelitianmu untuk {t} di sebelah kanan: amati kalimat "{wrong}", lalu ketuk satu bagian yang keliru!',
      undefined,
      { t: title, wrong: cleanW }
    ),
  };
}

function buildDynamicTopicRemixPair(params: {
  shortTitle: string;
  boardState: BoardDynamicDataSubset;
  uiAction?: VoiceUiAction;
  sampleSentenceGlobal: string;
  seed: number;
  variantNonce: number;
  existingSteps?: WhiteboardStepCommand[];
}): [WhiteboardStepCommand, WhiteboardStepCommand] {
  const { shortTitle, boardState, uiAction, sampleSentenceGlobal, seed, variantNonce, existingSteps = [] } = params;
  const cleanTitle = stripMetaStepTitle(cleanBoardDisplayText(shortTitle || 'Topik Pertanyaan')).slice(0, 52);
  const rawFormulaText = String(boardState.patternFormula || '').trim();
  const cleanFormula = /\$|\\frac|\\sqrt|\\implies|\\cdot/.test(rawFormulaText)
    ? rawFormulaText
    : cleanBoardDisplayText(rawFormulaText || cleanTitle).slice(0, 68);

  const explanationFull = cleanBoardDisplayText(boardState.coachExplanation || '');
  const bulletPool = splitExplanationIntoBullets(explanationFull, rawFormulaText);
  const tblStep = existingSteps.find((s) => s.kind === 'table' && Array.isArray(s.tableRows) && s.tableRows.length >= 2);
  const mmStep = existingSteps.find((s) => s.kind === 'mind_map' && Array.isArray(s.branches) && s.branches.length >= 2);
  const fbStep = existingSteps.find((s) => s.kind === 'formula_blocks' && Array.isArray(s.blocks) && s.blocks.length >= 2);
  const tlStep = existingSteps.find((s) => s.kind === 'timeline_track' && Array.isArray(s.timelineEvents) && s.timelineEvents.length >= 2);
  const titlePair = splitTitleIntoPair(cleanTitle) || splitTitleIntoPair(cleanFormula);

  const rightEx =
    cleanBoardDisplayText(
      sampleSentenceGlobal ||
        boardState.sampleTarget ||
        uiAction?.drillTargetSentence ||
        tblStep?.tableRows?.[0]?.[1] ||
        mmStep?.branches?.[0]?.example ||
        cleanFormula
    ).trim() || cleanTitle;
  const wrongEx =
    cleanBoardDisplayText(
      uiAction?.trapWrongSentence ||
        uiAction?.drillTrapSentence ||
        boardState.quiz?.options?.find((o) => !o.isCorrect)?.text ||
        ''
    ).trim();
  const reasonNote =
    truncateDiagramLabel(
      cleanBoardDisplayText(uiAction?.trapWrongReason || bulletPool[0] || boardState.sampleMeaningId || cleanFormula),
      72
    ) || cleanTitle;

  const palLeft = DIRECTOR_INK_PALETTES[(seed + variantNonce * 3) % DIRECTOR_INK_PALETTES.length];
  const palRight = DIRECTOR_INK_PALETTES[(seed + variantNonce * 3 + 3) % DIRECTOR_INK_PALETTES.length];
  const hatchLeft = DIRECTOR_HATCH_STYLES[(seed + variantNonce * 2) % DIRECTOR_HATCH_STYLES.length];
  const hatchRight = DIRECTOR_HATCH_STYLES[(seed + variantNonce * 2 + 2) % DIRECTOR_HATCH_STYLES.length];

  // Ekstrak pasangan nyata 100% spesifik materi dari tabel / cabang / rumus multi-klausa / kalimat kontras ("sedangkan")
  const authenticPairs: Array<{ left: string; right: string }> = [];
  if (tblStep?.tableRows && tblStep.tableRows.length >= 2) {
    tblStep.tableRows.slice(0, 3).forEach((r) => {
      const l = cleanBoardDisplayText(r[0] || '').trim();
      const rhs = cleanBoardDisplayText(r[1] || r[2] || '').trim();
      if (l && rhs && l.toLowerCase() !== rhs.toLowerCase()) {
        authenticPairs.push({ left: truncateDiagramLabel(l, 38), right: safeMathOrTruncate(rhs, 62) });
      }
    });
  }
  if (authenticPairs.length < 2 && mmStep?.branches && mmStep.branches.length >= 2) {
    mmStep.branches.slice(0, 3).forEach((b) => {
      const l = cleanBoardDisplayText(b.label || '').trim();
      const rhs = cleanBoardDisplayText(b.example || b.sublabel || '').trim();
      if (l && rhs && l.toLowerCase() !== rhs.toLowerCase()) {
        authenticPairs.push({ left: truncateDiagramLabel(l, 38), right: safeMathOrTruncate(rhs, 62) });
      }
    });
  }
  if (authenticPairs.length < 2 && fbStep?.blocks && fbStep.blocks.length >= 2) {
    fbStep.blocks.slice(0, 3).forEach((bl) => {
      const l = cleanBoardDisplayText(bl.role || '').trim();
      const rhs = cleanBoardDisplayText(bl.token || bl.note || '').trim();
      if (l && rhs && l.toLowerCase() !== rhs.toLowerCase()) {
        authenticPairs.push({ left: truncateDiagramLabel(l, 38), right: safeMathOrTruncate(rhs, 62) });
      }
    });
  }
  if (authenticPairs.length < 2 && tlStep?.timelineEvents && tlStep.timelineEvents.length >= 2) {
    tlStep.timelineEvents.slice(0, 3).forEach((ev) => {
      const l = cleanBoardDisplayText(ev.timeLabel || ev.title || '').trim();
      const rhs = cleanBoardDisplayText(ev.example || ev.title || '').trim();
      if (l && rhs && l.toLowerCase() !== rhs.toLowerCase()) {
        authenticPairs.push({ left: truncateDiagramLabel(l, 38), right: safeMathOrTruncate(rhs, 62) });
      }
    });
  }
  // Parse multi-item formula definitions like "Mitosis: 1 -> 2 | Meiosis: 1 -> 4" or "Permutasi: Urutan Penting. Kombinasi: Urutan Bebas."
  if (authenticPairs.length < 2 && rawFormulaText) {
    const formulaClauses = rawFormulaText
      .split(/\s*(?:\||;|\.(?=\s+[A-Z])|,(?=\s+[A-Z][\w\s]{1,18}[:=]))\s*/)
      .map((s) => cleanBoardDisplayText(s).trim())
      .filter(Boolean);
    if (formulaClauses.length >= 2) {
      formulaClauses.slice(0, 3).forEach((cl) => {
        const kv = cl.match(/^([^:=]{2,32}?)\s*[:=]\s*(.{2,64})$/);
        if (kv) {
          authenticPairs.push({
            left: truncateDiagramLabel(kv[1].trim(), 34),
            right: safeMathOrTruncate(kv[2].trim(), 60),
          });
        }
      });
    }
  }
  // Parse "X ... sedangkan/sementara Y ..." contrast clauses directly from explanation!
  if (authenticPairs.length < 2 && titlePair) {
    const contrastSplit = explanationFull.split(/\s*,?\s*\b(?:sedangkan|sementara(?:\s+itu)?|sebaliknya)\b\s*/i);
    if (contrastSplit.length >= 2) {
      const stripTermLead = (txt: string, term: string) => {
        const esc = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return txt
          .replace(new RegExp(`^(?:kata|bentuk|pola|istilah)?\\s*${esc}\\s*(?:berarti|adalah|dipakai|digunakan|artinya)?\\s*`, 'i'), '')
          .trim();
      };
      const d0 = stripTermLead(contrastSplit[0], titlePair[0]) || contrastSplit[0];
      const d1 = stripTermLead(contrastSplit[1], titlePair[1]) || contrastSplit[1];
      authenticPairs.push(
        { left: truncateDiagramLabel(titlePair[0], 34), right: safeMathOrTruncate(d0, 62) },
        { left: truncateDiagramLabel(titlePair[1], 34), right: safeMathOrTruncate(d1, 62) }
      );
    } else if (bulletPool.length >= 2) {
      authenticPairs.push(
        { left: truncateDiagramLabel(titlePair[0], 34), right: safeMathOrTruncate(bulletPool[0], 62) },
        { left: truncateDiagramLabel(titlePair[1], 34), right: safeMathOrTruncate(bulletPool[1], 62) }
      );
    }
  }
  if (
    authenticPairs.length < 2 &&
    /\b(?:simple\s*past|past\s*tense)\b/i.test(`${cleanTitle} ${cleanFormula}`) &&
    !/\bpresent\s*perfect\b/i.test(`${cleanTitle} ${cleanFormula}`)
  ) {
    authenticPairs.push(
      { left: 'Kalimat Positif (+)', right: 'Subject + Verb 2 (She went / I watched)' },
      { left: 'Kalimat Negatif (-)', right: 'did not + Verb 1 dasar (I did not go)' },
      { left: 'Kalimat Tanya (?)', right: 'Did + Subject + Verb 1? (Did you study?)' }
    );
  }
  if (authenticPairs.length < 2) {
    const topicAnchor = truncateDiagramLabel(cleanTitle.split(':')[0].trim() || cleanTitle, 24);
    const isConceptualProse =
      looksIndonesianExplanationProse(rightEx) ||
      /\b(?:fisika|newton|ohm|ekonomi|harga|pasokan|biologi|mitosis|meiosis|kimia|matematika|rumus|luas|volume|segitiga|statistika|peluang|permutasi|kombinasi)\b/i.test(
        `${cleanTitle} ${cleanFormula}`
      );
    const validRightLabel = isConceptualProse
      ? wbPick('Accurate Fact ✓', 'Fakta Tepat ✓')
      : wbPick('Natural Sentence ✓', 'Kalimat Alami ✓');
    const trapLeftLabel = isConceptualProse
      ? wbPick('Misconception ✕', 'Miskonsepsi ✕')
      : wbPick('Mistake to Avoid ✕', 'Keliru (Hindari) ✕');
    if (cleanFormula && rightEx && cleanFormula.toLowerCase() !== rightEx.toLowerCase()) {
      authenticPairs.push({
        left: wbFmt('Rule {t}', 'Prinsip {t}', undefined, { t: topicAnchor }),
        right: safeMathOrTruncate(cleanFormula, 56),
      });
      authenticPairs.push({
        left: validRightLabel,
        right: safeMathOrTruncate(rightEx, 58),
      });
      if (wrongEx && wrongEx.toLowerCase() !== rightEx.toLowerCase()) {
        authenticPairs.push({
          left: trapLeftLabel,
          right: safeMathOrTruncate(wrongEx, 58),
        });
      }
    } else {
      authenticPairs.push(
        { left: validRightLabel, right: safeMathOrTruncate(rightEx, 58) },
        {
          left: wrongEx && wrongEx.toLowerCase() !== rightEx.toLowerCase()
            ? trapLeftLabel
            : wbPick('Core Reason', 'Alasan Logis'),
          right: safeMathOrTruncate(
            wrongEx && wrongEx.toLowerCase() !== rightEx.toLowerCase() ? wrongEx : reasonNote,
            58
          ),
        }
      );
    }
  }

  const isComparisonFormula = /\b(?:vs\.?|versus)\b|\||!=|≠|;/i.test(cleanFormula);
  const seqFormulaChunks =
    isComparisonFormula || /\$|\\/.test(cleanFormula)
      ? []
      : cleanFormula
          .split(/\s*(?:\+|->|→)\s*/)
          .map((s) => s.trim())
          .filter((s) => s.length >= 1 && s.length <= 28);
  const rWords = rightEx.replace(/[.!?]+$/, '').split(/\s+/).filter(Boolean);
  const canBuildTargetSentenceSlots = !looksIndonesianExplanationProse(rightEx) && rWords.length >= 3 && rWords.length <= 8;
  const canUseLeftSlots = seqFormulaChunks.length >= 2 && seqFormulaChunks.length <= 4;

  const leftCycle = (seed + variantNonce) % (canUseLeftSlots ? 3 : 2);
  let leftBeat: WhiteboardStepCommand;

  if (leftCycle === 0) {
    const z1Label = titlePair?.[0] || authenticPairs[0].left;
    const z2Label = titlePair?.[1] || authenticPairs[1].left;
    const c1Label = titlePair ? authenticPairs[0]?.right || rightEx : authenticPairs[0].right;
    const c2Label = titlePair ? authenticPairs[1]?.right || wrongEx || reasonNote : authenticPairs[1].right;
    leftBeat = {
      id: `wb_auth_venn_${variantNonce}`,
      kind: 'interactive_mechanic',
      mechanic: 'venn_bucket_sorter',
      inkPalette: palLeft,
      roughHatch: hatchLeft,
      variantSeed: seed + variantNonce,
      column: 'left',
      phaseIndex: 1,
      pauseForInteraction: true,
      title: wbFmt('Sort Concept Zones: {t}', 'Sortir Zona Konsep: {t}', undefined, { t: truncateDiagramLabel(cleanTitle, 32) }),
      bucketZones: [
        { id: 'z_a', label: truncateDiagramLabel(z1Label, 34), sublabel: '' },
        { id: 'z_b', label: truncateDiagramLabel(z2Label, 34), sublabel: '' },
      ],
      bucketChips: [
        { id: 'c_a', label: safeMathOrTruncate(c1Label, 62), targetZoneId: 'z_a' },
        { id: 'c_b', label: safeMathOrTruncate(c2Label, 62), targetZoneId: 'z_b' },
      ],
      socraticPrompt: wbPick(
        'Select each card above, then tap the matching sketched concept box!',
        'Pilih keping contoh di atas, lalu ketuk kotak konsep yang sesuai!'
      ),
      successVoiceFeedback: wbFmt(
        'Spot on! You sorted the core contrast of {t} cleanly.',
        'Tepat sekali! Kamu sudah memisahkan inti konsep {t} dengan akurat.',
        undefined,
        { t: cleanTitle }
      ),
      spokenNarration: wbFmt(
        'Let us map out {t} directly. Look at the two concept zones below: {z1} versus {z2}. Tap each card above and place it into its matching zone!',
        'Kita petakan langsung inti dari {t}. Lihat dua kotak konsep di bawah: {z1} dibandingkan dengan {z2}. Sekarang pilih tiap keping di atas dan masukkan ke kotak yang tepat!',
        undefined,
        { t: cleanTitle, z1: z1Label, z2: z2Label }
      ),
    };
  } else if (leftCycle === 1 || !canUseLeftSlots) {
    leftBeat = {
      id: `wb_auth_wire_${variantNonce}`,
      kind: 'interactive_mechanic',
      mechanic: 'wire_node_connector',
      inkPalette: palLeft,
      roughHatch: hatchLeft,
      variantSeed: seed + variantNonce,
      column: 'left',
      phaseIndex: 1,
      pauseForInteraction: true,
      title: wbFmt('Connect Concept Pairs: {t}', 'Hubungkan Pasangan: {t}', undefined, { t: truncateDiagramLabel(cleanTitle, 30) }),
      wirePairs: authenticPairs.slice(0, 3).map((ap, pIdx) => ({
        id: `wp_${pIdx}`,
        leftLabel: ap.left,
        rightLabel: ap.right,
      })),
      socraticPrompt: wbPick(
        'Tap each node on the left, then tap its matching partner on the right!',
        'Ketuk titik di sebelah kiri, lalu sambungkan ke pasangan yang tepat di kanan!'
      ),
      successVoiceFeedback: wbFmt(
        'All concept wires for {t} are connected accurately!',
        'Semua jalur pasangan untuk {t} sudah terhubung tepat!',
        undefined,
        { t: cleanTitle }
      ),
      spokenNarration: wbFmt(
        'Understanding {t} comes down to pairing each cue with its exact rule: {p0}. Now tap the left nodes and connect them to their partners on the right!',
        'Memahami {t} kuncinya adalah memasangkan setiap pemicu dengan pasangannya, mulai dari {p0}. Sekarang ketuk titik di kiri dan sambungkan ke pasangannya di kanan!',
        undefined,
        { t: cleanTitle, p0: `${authenticPairs[0].left} dengan ${authenticPairs[0].right}` }
      ),
    };
  } else {
    const orderedParts = seqFormulaChunks;
    const extraTrap =
      wrongEx && !looksIndonesianExplanationProse(wrongEx)
        ? wrongEx
            .replace(/[.!?]+$/, '')
            .split(/\s+/)
            .find((w) => w.length >= 2 && !rWords.some((rw) => rw.toLowerCase() === w.toLowerCase()))
        : undefined;
    leftBeat = {
      id: `wb_auth_slots_l_${variantNonce}`,
      kind: 'interactive_mechanic',
      mechanic: 'magnetic_slot_builder',
      inkPalette: palLeft,
      roughHatch: hatchLeft,
      variantSeed: seed + variantNonce,
      column: 'left',
      phaseIndex: 1,
      pauseForInteraction: true,
      title: wbFmt('Build the Core Formula: {t}', 'Rakit Struktur Rumus: {t}', undefined, { t: truncateDiagramLabel(cleanTitle, 30) }),
      magnetSlotRoles: orderedParts.map((_, idx) => `${wbPick('Slot', 'Unsur')} ${idx + 1}`),
      magnetTargetTokens: orderedParts.map((p) => safeMathOrTruncate(p, 30)),
      magnetDistractors: extraTrap ? [truncateDiagramLabel(extraTrap, 22)] : [],
      socraticPrompt: wbPick(
        'Tap the formula tiles in order from left to right to snap the structure together!',
        'Ketuk keping rumus di bawah secara berurutan dari kiri ke kanan!'
      ),
      successVoiceFeedback: wbFmt(
        'Locked into place: {seq}!',
        'Tersusun rapi dan akurat: {seq}!',
        undefined,
        { seq: orderedParts.join(' -> ') }
      ),
      spokenNarration: wbFmt(
        'Notice the exact building blocks of {t}: {seq}. Tap the tiles below in order so you feel how the structure locks together!',
        'Perhatikan urutan pembentuk rumus {t}: {seq}. Sekarang ketuk kepingannya secara berurutan supaya kamu merasakan alur susunannya!',
        undefined,
        { t: cleanTitle, seq: orderedParts.join(', lalu ') }
      ),
    };
  }

  const surgicalCandidate = buildMinimalSurgicalStrikeStep({
    id: `wb_auth_strike_${variantNonce}`,
    title: cleanTitle,
    wrongEx,
    rightEx,
    reasonNote,
    pal: palRight,
    hatch: hatchRight,
    seed: seed + variantNonce + 23,
  });

  let rightBeat: WhiteboardStepCommand;
  const rightCycle = (seed + variantNonce * 2 + 1) % 2;

  if (surgicalCandidate && rightCycle === 1) {
    rightBeat = surgicalCandidate;
  } else if (canBuildTargetSentenceSlots && leftBeat.mechanic !== 'magnetic_slot_builder' && rightCycle === 1) {
    const slotA = rWords[0];
    const slotB = rWords.slice(1, -1).join(' ');
    const slotC = rWords[rWords.length - 1];
    const targetSlots = [slotA, slotB, slotC];
    const slotRoles = [
      wbPick('Opening', 'Pembuka'),
      wbPick('Core Pattern', 'Inti Kalimat'),
      wbPick('Closing', 'Pelengkap'),
    ];
    const trapDistractor =
      wrongEx && !looksIndonesianExplanationProse(wrongEx)
        ? wrongEx
            .replace(/[.!?]+$/, '')
            .split(/\s+/)
            .find((w) => w.length >= 2 && !rWords.some((rw) => rw.toLowerCase() === w.toLowerCase()))
        : undefined;
    rightBeat = {
      id: `wb_auth_slots_r_${variantNonce}`,
      kind: 'interactive_mechanic',
      mechanic: 'magnetic_slot_builder',
      inkPalette: palRight,
      roughHatch: hatchRight,
      variantSeed: seed + variantNonce + 31,
      column: 'right',
      phaseIndex: 2,
      pauseForInteraction: true,
      title: wbPick('Snap the Natural Sentence', 'Rakit Kalimat Alami'),
      magnetSlotRoles: slotRoles,
      magnetTargetTokens: targetSlots.map((t) => truncateDiagramLabel(t, 32)),
      magnetDistractors: trapDistractor ? [truncateDiagramLabel(trapDistractor, 22)] : [],
      socraticPrompt: wbPick(
        'Tap the tiles in order to assemble the natural sentence!',
        'Ketuk keping secara berurutan untuk merakit kalimat yang alami!'
      ),
      successVoiceFeedback: wbFmt(
        'Assembled cleanly: "{r}"!',
        'Terpasang presisi menjadi "{r}"!',
        undefined,
        { r: rightEx }
      ),
      spokenNarration: wbFmt(
        'Now put {t} into action on the right: tap the tiles in exact order to build "{r}"!',
        'Sekarang praktikkan langsung {t} di sebelah kanan: ketuk kepingannya secara berurutan hingga membentuk "{r}"!',
        undefined,
        { t: cleanTitle, r: rightEx }
      ),
    };
  } else if (surgicalCandidate) {
    rightBeat = surgicalCandidate;
  } else {
    rightBeat = {
      id: `wb_auth_scratch_${variantNonce}`,
      kind: 'interactive_mechanic',
      mechanic: 'scratch_reveal',
      inkPalette: palRight,
      roughHatch: hatchRight,
      variantSeed: seed + variantNonce + 17,
      column: 'right',
      phaseIndex: 2,
      pauseForInteraction: true,
      title: wbPick('Scratch Card: Verify Key Rule', 'Gosok Kartu: Buktikan Kuncinya'),
      scratchClueHeader: wbFmt('Predict the key takeaway for {t}, then swipe!', 'Tebak simpulan kunci {t}, lalu usap!', undefined, {
        t: truncateDiagramLabel(cleanTitle, 26),
      }),
      scratchHiddenFormula: safeMathOrTruncate(rightEx || cleanFormula, 68),
      scratchHiddenSubnote: reasonNote,
      scratchSketchKind: variantNonce % 2 === 0 ? 'prism_split' : 'venn_core',
      socraticPrompt: wbPick(
        'Swipe across the colored chalk card or tap Reveal Now to verify your prediction!',
        'Usap kartu kapur berwarna di atas dengan jari atau ketuk Buka Cepat untuk membuktikan tebakanmu!'
      ),
      successVoiceFeedback: wbFmt(
        'Confirmed! Remember this anchor: "{r}".',
        'Terbukti! Pegang kunci utamanya: "{r}".',
        undefined,
        { r: rightEx || cleanFormula }
      ),
      spokenNarration: wbFmt(
        'Before opening the chalk card on the right, picture the core rule for {t} in your head, then swipe the card to check!',
        'Sebelum membuka kartu kapur di sebelah kanan, coba bayangkan dulu kunci utama untuk {t}, lalu usap kartunya untuk membuktikan!',
        undefined,
        { t: cleanTitle }
      ),
    };
  }

  return [leftBeat, rightBeat];
}

const KNOWN_MECHANIC_KINDS = new Set([
  'experiment_sandbox',
  'scratch_reveal',
  'balance_seesaw',
  'venn_bucket_sorter',
  'wire_node_connector',
  'rotary_dial_gauge',
  'fraction_slice_shader',
  'magnetic_slot_builder',
  'wave_pendulum_oscillator',
]);

function normalizeIncomingWhiteboardStep(raw: WhiteboardStepCommand): WhiteboardStepCommand {
  const k = String(raw.kind || '').trim();
  if (KNOWN_MECHANIC_KINDS.has(k)) {
    return {
      ...raw,
      kind: 'interactive_mechanic',
      mechanic: k as WhiteboardStepCommand['mechanic'],
    };
  }
  return raw;
}

function isInteractiveStepGenuinelyPopulated(
  st: WhiteboardStepCommand,
  isCharacterWritingTopic: boolean,
  topicBlob: string
): boolean {
  if (st.kind === 'interactive_mechanic') {
    const m = st.mechanic;
    if (m === 'experiment_sandbox') {
      return true;
    }
    if (m === 'venn_bucket_sorter') {
      return Array.isArray(st.bucketZones) && st.bucketZones.length >= 2 && Array.isArray(st.bucketChips) && st.bucketChips.length >= 2;
    }
    if (m === 'wire_node_connector') {
      return Array.isArray(st.wirePairs) && st.wirePairs.length >= 2;
    }
    if (m === 'balance_seesaw') {
      return Array.isArray(st.seesawTokens) && st.seesawTokens.length >= 2 && Boolean(st.seesawLeftFixedLabel);
    }
    if (m === 'rotary_dial_gauge') {
      return Array.isArray(st.dialStops) && st.dialStops.length >= 2;
    }
    if (m === 'fraction_slice_shader') {
      return typeof st.sliceTotal === 'number' && st.sliceTotal >= 2 && /\bpecahan|fraction|juring|\d+\s*\/\s*\d+/i.test(topicBlob);
    }
    if (m === 'magnetic_slot_builder') {
      return Array.isArray(st.magnetTargetTokens) && st.magnetTargetTokens.length >= 2;
    }
    if (m === 'scratch_reveal') {
      return Boolean(st.scratchHiddenFormula || st.rightText || st.highlightPhrase);
    }
    if (m === 'wave_pendulum_oscillator') {
      return typeof st.waveTargetLevel === 'number' && /gelombang|frekuensi|wave|oscillat|nada|intonasi/i.test(topicBlob);
    }
    return false;
  }
  if (st.kind === 'socratic_slider') {
    if (isCharacterWritingTopic) return false;
    if (st.sliderDomain === 'math_graph') {
      return /pythagor|segitiga|lingkaran|circle|kuadrat|quadratic|grafik|fungsi|linear|x\^2/i.test(topicBlob);
    }
    if (st.sliderDomain === 'physics_vector') {
      return /newton|gaya|massa|percepatan|vektor|force|\bf\s*=\s*m/i.test(topicBlob);
    }
    return (
      Array.isArray(st.sliderStops) &&
      st.sliderStops.length >= 2 &&
      st.sliderStops.every((sp) => Boolean(sp?.expression || sp?.example || sp?.formula))
    );
  }
  if (st.kind === 'step_derivation') {
    if (isCharacterWritingTopic) return false;
    return (
      Array.isArray(st.derivationSteps) &&
      st.derivationSteps.length >= 2 &&
      st.derivationSteps.some((ln) => Boolean(ln?.expr || ln?.latex))
    );
  }
  if (st.kind === 'surgical_strike') {
    if (isCharacterWritingTopic) return false;
    return (
      (Array.isArray(st.strikeTokens) && st.strikeTokens.length >= 2) ||
      Boolean(st.wrongText && st.wrongText.trim().length >= 4 && st.rightText && st.rightText.trim().length >= 2)
    );
  }
  return true;
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
  initialQuestionText?: string;
  uploadedMaterials?: SourceMaterialPage[];
  variantNonce?: number;
}): WhiteboardScenePlan {
  const {
    boardState,
    uiAction,
    scenario,
    targetLang,
    studentQuestions = [],
    initialQuestionText = '',
    uploadedMaterials = [],
    variantNonce = 0,
  } = params;

  const isLegacyShortPhases =
    Array.isArray(uiAction?.phaseLabels) &&
    uiAction.phaseLabels.some((p) => /0\s*inti|1\s*eksplorasi/i.test(String(p || '')));
  const customPhases =
    Array.isArray(uiAction?.phaseLabels) && uiAction.phaseLabels.length >= 3 && !isLegacyShortPhases
      ? uiAction.phaseLabels
      : null;

  const phaseLabels = customPhases || [
    wbPick('0 Concept', '0 Konsep'),
    wbPick('1 Explanation', '1 Penjelasan'),
    wbPick('2 Practice', '2 Praktik'),
    wbPick('3 Breakdown', '3 Bedah'),
    wbPick('4 Quiz', '4 Uji'),
  ];

  const steps: WhiteboardSceneStep[] = [];
  const shortTitle = (boardState.topicTitle || wbPick('Question Topic', 'Topik Pertanyaan')).trim();
  const latestUserQuestionText =
    studentQuestions.length > 0 ? studentQuestions[studentQuestions.length - 1].text : initialQuestionText || '';
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
      `${shortTitle} ${boardState.patternFormula || ''} ${latestUserQuestionText}`
    );
  const isCharacterWritingTopic =
    (targetLang === 'ja' || targetLang === 'zh') &&
    !isWorkflowDiagramTopic &&
    (boardState.contextMode === 'magic_character' ||
      /kanji|hanzi|hiragana|katakana|huruf|karakter|aksara|tulis|goresan|coretan|stroke|kakijun/i.test(
        `${shortTitle} ${latestUserQuestionText}`
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
            caption: 'To Be hanya sah untuk Sifat/Benda, Verb ing (sedang), atau Verb 3 (pasif), BUKAN Verb 1 aktif!',
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
            ...(st.spokenNarration && /kamera|video|foto\s*mati/i.test(st.spokenNarration)
              ? { spokenNarration: undefined }
              : {}),
          };
        }
        const leftDesc = [st.leftPanel?.subtitle, st.leftPanel?.example ? `Contoh: ${st.leftPanel.example}` : ''].filter(Boolean).join(', ');
        const rightDesc = [st.rightPanel?.subtitle, st.rightPanel?.example ? `Contoh: ${st.rightPanel.example}` : ''].filter(Boolean).join(', ');
        const stripCamTitle = (s?: string) => (s && !/kamera|video/i.test(s) ? s : '');
        const fallbackPair = splitTitleIntoPair(shortTitle);
        return {
          ...st,
          kind: 'contrast_scale',
          title: stripCamTitle(st.title) || `Perbandingan ${shortTitle}`,
          termA: stripCamTitle(st.leftPanel?.title || st.termA) || fallbackPair?.[0] || truncateDiagramLabel(shortTitle, 28),
          descA: stripCamTitle(leftDesc || st.descA) || '',
          termB: stripCamTitle(st.rightPanel?.title || st.termB) || fallbackPair?.[1] || 'Catatan Kontras',
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
          spokenNarration: undefined,
        };
      }
    }
    return st;
  };

  const finalizeStep = (rawInput: WhiteboardStepCommand, idx: number): WhiteboardSceneStep => {
    const normalized = normalizeIncomingWhiteboardStep(rawInput);
    const sanitized = sanitizeStepVisualFields(normalized);
    if (sanitized.kind === 'heading' && !sanitized.title) {
      sanitized.title = stripMetaStepTitle(cleanBoardDisplayText(shortTitle)) || shortTitle;
    }
    const aligned = enforceSemanticVisualAlignment(sanitized);
    const isGenuineInteractiveKind =
      aligned.kind === 'interactive_mechanic' ||
      aligned.kind === 'socratic_slider' ||
      aligned.kind === 'surgical_strike' ||
      aligned.kind === 'step_derivation';
    const enriched: WhiteboardStepCommand = {
      ...aligned,
      pauseForInteraction: isGenuineInteractiveKind ? true : false,
      quickChoices: isGenuineInteractiveKind ? aligned.quickChoices : undefined,
      highlightTerms: extractStepHighlightTerms(aligned, sampleSentenceGlobal),
      spokenNarration: deriveStepSpokenNarration(
        {
          ...aligned,
          pauseForInteraction: isGenuineInteractiveKind ? true : false,
          quickChoices: isGenuineInteractiveKind ? aligned.quickChoices : undefined,
        },
        shortTitle,
        boardState.coachExplanation || '',
        targetLang
      ),
    };
    const narration = enriched.spokenNarration || '';
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
  const fullTopicBlob = `${shortTitle} ${boardState.patternFormula || ''} ${latestUserQuestionText} ${sampleSentenceGlobal}`;

  if (Array.isArray(uiAction?.whiteboardSteps) && uiAction.whiteboardSteps.length > 0) {
    let injectedEntry: KakijunCharEntry | null = null;
    const normalizedRawSteps = uiAction.whiteboardSteps.map((r) => normalizeIncomingWhiteboardStep(r));
    normalizedRawSteps.forEach((raw, idx) => {
      if (raw.kind === 'kanji_grid') {
        const hasExplicitCjk = Boolean(
          boardState.characterData?.char || extractRequestedCjkChar(`${raw.character || ''} ${raw.title || ''}`)
        );
        if (!isCharacterWritingTopic && !hasExplicitCjk) {
          return;
        }
        const { step: enrichedKanji, entry } = enrichKanjiGridStep(
          {
            ...raw,
            character: boardState.characterData?.char || raw.character,
          },
          shortTitle,
          targetLang
        );
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

    if (isCharacterWritingTopic) {
      const explicitChar = extractRequestedCjkChar(`${boardState.characterData?.char || ''} ${shortTitle}`);
      const promptMatched = resolveKakijunRequestFromPrompt(
        explicitChar ? `${explicitChar} ${shortTitle}` : `${shortTitle} ${sampleSentenceGlobal}`,
        targetLang
      );
      const charToUse = explicitChar || promptMatched[0]?.char;
      if (charToUse) {
        const existingKanjiIdx = steps.findIndex((s) => s.kind === 'kanji_grid');
        if (existingKanjiIdx >= 0 && steps[existingKanjiIdx].character !== charToUse) {
          const { step: fixedKanji, entry } = enrichKanjiGridStep(
            { ...steps[existingKanjiIdx], character: charToUse, title: `Urutan Goresan "${charToUse}"` },
            shortTitle,
            targetLang
          );
          injectedEntry = entry;
          characterEntryForHeading = entry;
          steps[existingKanjiIdx] = finalizeStep(fixedKanji, existingKanjiIdx);
        } else if (existingKanjiIdx < 0) {
          const { step: kanjiStep, entry } = enrichKanjiGridStep(
            {
              id: 'wb_auto_kanji_grid',
              kind: 'kanji_grid',
              column: 'left',
              phaseIndex: 1,
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
      // Bersihkan langkah aljabar/kalimat nyasar pada topik cara tulis huruf Kanji/Hanzi!
      for (let i = steps.length - 1; i >= 0; i--) {
        const k = steps[i].kind;
        if (k === 'step_derivation' || k === 'surgical_strike' || k === 'socratic_slider' || k === 'trap_vs_fix') {
          steps.splice(i, 1);
        }
      }
    }

    const hasRichVisualSwitch = studentQuestions.some((sq) => isVisualSwitchRequestText(sq.text));
    const stemBeatsFromQuery = !hasRichVisualSwitch
      ? synthesizePolymathStemBeats(boardState, targetLang, latestUserQuestionText)
      : null;

    // Ganti langkah interaktif cangkang kosong (shell tanpa sliderStops/derivationSteps) dengan Beat presisi topik!
    if (stemBeatsFromQuery && stemBeatsFromQuery.length >= 2) {
      const leftShellIdx = steps.findIndex(
        (s) =>
          s.column !== 'right' &&
          (s.kind === 'socratic_slider' || s.kind === 'interactive_mechanic') &&
          !isInteractiveStepGenuinelyPopulated(s, isCharacterWritingTopic, fullTopicBlob)
      );
      if (leftShellIdx >= 0) {
        steps[leftShellIdx] = finalizeStep(stemBeatsFromQuery[0], leftShellIdx);
      } else if (
        !steps.some(
          (s) =>
            (s.kind === 'socratic_slider' || (s.kind === 'interactive_mechanic' && s.column !== 'right')) &&
            isInteractiveStepGenuinelyPopulated(s, isCharacterWritingTopic, fullTopicBlob)
        )
      ) {
        steps.push(finalizeStep(stemBeatsFromQuery[0], steps.length));
      }

      const rightShellIdx = steps.findIndex(
        (s) =>
          s.column === 'right' &&
          (s.kind === 'step_derivation' || s.kind === 'surgical_strike' || s.kind === 'interactive_mechanic') &&
          !isInteractiveStepGenuinelyPopulated(s, isCharacterWritingTopic, fullTopicBlob)
      );
      if (rightShellIdx >= 0) {
        steps[rightShellIdx] = finalizeStep(stemBeatsFromQuery[1], rightShellIdx);
      } else if (
        !steps.some(
          (s) =>
            (s.kind === 'step_derivation' || (s.kind === 'interactive_mechanic' && s.column === 'right')) &&
            isInteractiveStepGenuinelyPopulated(s, isCharacterWritingTopic, fullTopicBlob)
        )
      ) {
        steps.push(finalizeStep(stemBeatsFromQuery[1], steps.length));
      }
    }

    // Selamatkan setiap langkah interaktif yang masih cangkang kosong dengan materi otentik dari papan ini!
    const rescueSeed = hashDirectorSeed(`${shortTitle}|${boardState.patternFormula || ''}|${sampleSentenceGlobal}`);
    const [authenticLeftFallback, authenticRightFallback] = buildDynamicTopicRemixPair({
      shortTitle,
      boardState,
      uiAction,
      sampleSentenceGlobal,
      seed: rescueSeed,
      variantNonce,
      existingSteps: steps,
    });
    for (let i = 0; i < steps.length; i++) {
      const st = steps[i];
      if (
        (st.kind === 'socratic_slider' ||
          st.kind === 'step_derivation' ||
          st.kind === 'surgical_strike' ||
          st.kind === 'interactive_mechanic') &&
        !isInteractiveStepGenuinelyPopulated(st, isCharacterWritingTopic, fullTopicBlob)
      ) {
        const replacement = st.column === 'right' ? authenticRightFallback : authenticLeftFallback;
        steps[i] = finalizeStep({ ...replacement, id: st.id || replacement.id, column: st.column || replacement.column }, i);
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
        s.kind === 'interactive_mechanic' ||
        s.kind === 'socratic_slider' ||
        s.kind === 'metaphor_scene' ||
        s.kind === 'mind_map' ||
        s.kind === 'timeline_track' ||
        s.kind === 'formula_blocks' ||
        s.kind === 'contrast_scale' ||
        s.kind === 'syntax_flow' ||
        s.kind === 'kanji_grid' ||
        s.kind === 'tone_wave'
    );
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
    const hasPopulatedVisualScene =
      hasPopulatedRoughScene ||
      hasAutoFillableVisualStep ||
      steps.some((s) => s.kind === 'socratic_slider');
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

    // Untuk topik cara tulis Kanji/Hanzi: tambahkan Lab Interaktif Sambung Kosakata karakter tersebut di Kolom Kanan!
    const activeCharEntry = injectedEntry || characterEntryForHeading;
    if (
      activeCharEntry &&
      activeCharEntry.compounds &&
      activeCharEntry.compounds.length >= 2 &&
      !steps.some((s) => s.kind === 'interactive_mechanic')
    ) {
      const charTypeLabel = targetLang === 'zh' ? 'Hanzi' : 'Kanji';
      const compSlice = activeCharEntry.compounds.slice(0, 3);
      steps.push(
        finalizeStep(
          {
            id: 'wb_kanji_compounds_wire',
            kind: 'interactive_mechanic',
            mechanic: 'wire_node_connector',
            inkPalette: 'indigo_constellation',
            roughHatch: 'dots',
            column: 'right',
            phaseIndex: 2,
            pauseForInteraction: true,
            title: `Pasangkan Kosakata ${charTypeLabel} "${activeCharEntry.char}"`,
            wirePairs: compSlice.map((c, cIdx) => {
              const cleanRead = String(c.reading || '').replace(/\s*\(([^()]+)\)/g, ' · $1').trim();
              return {
                id: `kc_${cIdx}`,
                leftLabel: cleanRead ? `${c.word} (${cleanRead})` : c.word,
                rightLabel: c.meaning,
              };
            }),
            socraticPrompt: `Hubungkan setiap kosakata yang memuat karakter "${activeCharEntry.char}" di kiri dengan artinya di kanan!`,
            successVoiceFeedback: `Hebat! Kamu sudah menguasai urutan goresan sekaligus kosakata penting dari karakter "${activeCharEntry.char}".`,
            spokenNarration: `Setelah melihat urutan goresan karakter ${activeCharEntry.char}, sekarang uji ingatan kosakatamu di sebelah kanan: sambungkan tiap kata yang mengandung ${activeCharEntry.char} ke arti bahasa Indonesianya!`,
          },
          steps.length
        )
      );
    }

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
              truncateDiagramLabel(boardState.patternFormula || '', 120) ||
              (characterEntryForHeading
                ? `${characterEntryForHeading.char}${characterEntryForHeading.reading ? ` (${characterEntryForHeading.reading})` : ''}${characterEntryForHeading.strokeCount ? ` • ${characterEntryForHeading.strokeCount} Goresan` : ''}`
                : ''),
          },
          0
        )
      );
    }

    const hasAnyVisualOrInteractive = steps.some(
      (s) =>
        s.kind !== 'heading' &&
        s.kind !== 'note' &&
        s.kind !== 'checkpoint' &&
        s.kind !== 'highlight_callout'
    );
    if (!hasAnyVisualOrInteractive && !steps.some((s) => s.kind === 'note')) {
      const noteBullets = splitExplanationIntoBullets(
        boardState.coachExplanation || '',
        boardState.patternFormula || ''
      );
      if (noteBullets.length > 0) {
        steps.push(
          finalizeStep(
            {
              id: 'wb_auto_notes',
              kind: 'note',
              column: 'left',
              phaseIndex: 1,
              title: 'Inti Konsep',
              bullets: noteBullets.slice(0, 3).map((b) => distillToSixWordInk(b, 7)),
              spokenNarration: boardState.coachExplanation || noteBullets.join('. '),
            },
            steps.length
          )
        );
      }
    }

    if (
      !steps.some((s) => s.kind === 'trap_vs_fix' || s.kind === 'surgical_strike' || s.kind === 'step_derivation' || (s.kind === 'interactive_mechanic' && s.column === 'right')) &&
      !isCharacterWritingTopic &&
      (uiAction?.trapWrongSentence || sampleSentenceGlobal || (boardState.sampleTarget && !isDegenerateSampleText(boardState.sampleTarget)))
    ) {
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
              title: wrong ? 'Bedah Kesalahan Umum' : 'Contoh Kalimat Alami',
              wrongText: wrong || undefined,
              rightText: right || undefined,
              reason:
                uiAction?.trapReasonId ||
                (boardState.sampleMeaningId
                  ? distillToSixWordInk(`Arti: "${boardState.sampleMeaningId}"`, 8)
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
            title: `${wbPick('Quick Check', 'Uji Pemahaman')}: ${truncateDiagramLabel(shortTitle, 38)}`,
            text: boardState.quiz.prompt,
          },
          steps.length
        )
      );
    }
  } else {
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
          phaseIndex: 0,
          title: shortTitle,
          text: truncateDiagramLabel(boardState.patternFormula || '', 120),
        },
        steps.length
      )
    );

    const stemFallbackBeats = synthesizePolymathStemBeats(boardState, targetLang, latestUserQuestionText);
    const explicitChar = extractRequestedCjkChar(`${boardState.characterData?.char || ''} ${shortTitle}`);
    const promptEntries = resolveKakijunRequestFromPrompt(
      explicitChar ? `${explicitChar} ${shortTitle}` : `${shortTitle} ${sampleSentence}`,
      targetLang
    );
    const requestedCjk = explicitChar || promptEntries[0]?.char;

    if (stemFallbackBeats && stemFallbackBeats.length >= 2) {
      stemFallbackBeats.forEach((sb) => {
        steps.push(finalizeStep(sb, steps.length));
      });
    } else if (isCharacterWritingTopic && requestedCjk) {
      const { step: kanjiStep, entry } = enrichKanjiGridStep(
        {
          id: 'wb_kanji_grid',
          kind: 'kanji_grid',
          column: 'left',
          phaseIndex: 1,
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

      if (entry.compounds && entry.compounds.length >= 2) {
        const charLabel = targetLang === 'zh' ? 'Hanzi' : 'Kanji';
        steps.push(
          finalizeStep(
            {
              id: 'wb_kanji_compounds_wire',
              kind: 'interactive_mechanic',
              mechanic: 'wire_node_connector',
              inkPalette: 'indigo_constellation',
              roughHatch: 'dots',
              column: 'right',
              phaseIndex: 2,
              pauseForInteraction: true,
              title: `Pasangkan Kosakata ${charLabel} "${entry.char}"`,
              wirePairs: entry.compounds.slice(0, 3).map((c, cIdx) => {
                const cleanRead = String(c.reading || '').replace(/\s*\(([^()]+)\)/g, ' · $1').trim();
                return {
                  id: `kc_${cIdx}`,
                  leftLabel: cleanRead ? `${c.word} (${cleanRead})` : c.word,
                  rightLabel: c.meaning,
                };
              }),
              socraticPrompt: `Hubungkan setiap kosakata "${entry.char}" di kiri dengan artinya di kanan!`,
              successVoiceFeedback: `Tepat sekali! Kosakata penting dari karakter "${entry.char}" sudah tersambung rapi.`,
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
            phaseIndex: 1,
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
        const narFromCoach =
          boardState.coachExplanation && !scene.spokenNarration
            ? boardState.coachExplanation
            : scene.spokenNarration;
        steps.push(
          finalizeStep(
            {
              ...scene,
              id: scene.id || 'wb_topic_scene',
              column: scene.column || 'left',
              phaseIndex: typeof scene.phaseIndex === 'number' ? scene.phaseIndex : 1,
              spokenNarration: narFromCoach,
            },
            steps.length
          )
        );
      }
    }

    const isIrrelevantSentenceTrapForChar =
      isCharacterWritingTopic &&
      !isWorkflowDiagramTopic &&
      !/(goresan|urutan|stroke|tulis|radikal|bentuk|komponen)/i.test(`${wrongSentence} ${wrongReason}`);

    if (
      !stemFallbackBeats &&
      sampleSentence &&
      wrongSentence &&
      sampleSentence !== wrongSentence &&
      !isIrrelevantSentenceTrapForChar
    ) {
      steps.push(
        finalizeStep(
          {
            id: 'wb_trap_vs_fix',
            kind: 'trap_vs_fix',
            column: 'right',
            phaseIndex: 2,
            title: wbPick('Spot & Fix the Mistake', 'Bedah Jebakan Umum'),
            wrongText: wrongSentence,
            rightText: sampleSentence,
            reason: wrongReason || undefined,
          },
          steps.length
        )
      );
    }

    if (boardState.pairData?.keyAnalogy || boardState.patternFormula) {
      steps.push(
        finalizeStep(
          {
            id: 'wb_highlight_callout',
            kind: 'highlight_callout',
            column: 'right',
            phaseIndex: 3,
            title: wbPick('Core Formula', 'Kunci Inti'),
            text: distillToSixWordInk(boardState.pairData?.keyAnalogy || boardState.patternFormula, 8),
            highlightPhrase: distillToSixWordInk(boardState.pairData?.keyAnalogy || boardState.patternFormula, 8),
            highlightColor: 'rgba(125, 211, 252, 0.45)',
          },
          steps.length
        )
      );
    } else if (sampleSentence && !steps.some((s) => s.kind === 'highlight_callout')) {
      steps.push(
        finalizeStep(
          {
            id: 'wb_highlight_example',
            kind: 'highlight_callout',
            column: 'right',
            phaseIndex: 3,
            title: wbPick('Natural Pattern', 'Pola Alami'),
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
            title: wbPick('Contextual Practice', 'Latihan Kontekstual'),
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
        const existingHeadingNar = cleanBoardDisplayText(s.spokenNarration || '');
        const hasWrongLangHeadingNar =
          !existingHeadingNar ||
          existingHeadingNar.split(/\s+/).filter(Boolean).length < 6 ||
          /guratan\s*1\s*:|\|/i.test(existingHeadingNar) ||
          (targetLang === 'zh' && /sui\s*\/\s*mizu|go\s*\/\s*itsu/i.test(existingHeadingNar));
        const cleanHeadingNarration = deriveStepSpokenNarration(
          { ...s, spokenNarration: hasWrongLangHeadingNar ? undefined : existingHeadingNar },
          shortTitle,
          boardState.coachExplanation || '',
          targetLang
        );
        s.spokenNarration = cleanHeadingNarration;
        s.durationMs = computeStepDurationMs(s, cleanHeadingNarration);
      }
    });
  }

  const hasExplicitVisualSwitch = studentQuestions.some((sq) => isVisualSwitchRequestText(sq.text));
  for (let i = steps.length - 1; i >= 0; i--) {
    const st = steps[i];
    if (st.kind === 'note') {
      const hasNonInteractiveTeachingDiagram = steps.some(
        (other) =>
          other.id !== st.id &&
          !other.pauseForInteraction &&
          (other.kind === 'formula_blocks' ||
            other.kind === 'timeline_track' ||
            other.kind === 'mind_map' ||
            other.kind === 'contrast_scale' ||
            other.kind === 'rough_scene' ||
            other.kind === 'metaphor_scene' ||
            other.kind === 'kanji_grid')
      );
      if (hasNonInteractiveTeachingDiagram) {
        const nextVis = steps.find(
          (other) =>
            other.id !== st.id &&
            !other.pauseForInteraction &&
            other.kind !== 'heading' &&
            other.kind !== 'note' &&
            other.kind !== 'checkpoint'
        );
        if (nextVis && st.spokenNarration && (nextVis.spokenNarration || '').split(/\s+/).length < 24) {
          const mergedNar = `${st.spokenNarration.split(/(?<=[.!?])\s+/)[0]} ${nextVis.spokenNarration || ''}`.trim();
          nextVis.spokenNarration = mergedNar;
          nextVis.durationMs = computeStepDurationMs(nextVis, mergedNar);
        }
        steps.splice(i, 1);
      } else if (Array.isArray(st.bullets)) {
        st.bullets = st.bullets.slice(0, 4).map((b) => condenseNoteBulletToVisualKey(b)).filter(Boolean);
      }
    }
  }

  // Upgrade `trap_vs_fix` -> `surgical_strike` interaktif ketika pasangan salah vs benar jelas
  if (!isCharacterWritingTopic) {
    steps.forEach((st, idx) => {
      if (st.kind !== 'trap_vs_fix' || !st.wrongText || !st.rightText) return;
      const cleanW = cleanBoardDisplayText(st.wrongText).replace(/^✕\s*/, '').replace(/[.!?]+$/, '').trim();
      const cleanR = cleanBoardDisplayText(st.rightText).replace(/^✓\s*/, '').replace(/[.!?]+$/, '').trim();
      const wToks = cleanW.split(/\s+/).filter(Boolean);
      const rToks = cleanR.split(/\s+/).filter(Boolean);
      if (wToks.length < 2 || wToks.length > 11 || rToks.length < 1 || cleanW.toLowerCase() === cleanR.toLowerCase()) return;
      let p = 0;
      while (p < wToks.length && p < rToks.length && wToks[p].toLowerCase() === rToks[p].toLowerCase()) {
        p += 1;
      }
      let s = 0;
      while (
        s < wToks.length - p &&
        s < rToks.length - p &&
        wToks[wToks.length - 1 - s].toLowerCase() === rToks[rToks.length - 1 - s].toLowerCase()
      ) {
        s += 1;
      }
      const wrongMid = wToks.slice(p, wToks.length - s);
      const rightMid = rToks.slice(p, rToks.length - s);
      let strikeTokens: string[] = [];
      let bugTokenIndex = 0;
      let fixedToken = '';
      if (wrongMid.length === 1) {
        strikeTokens = wToks;
        bugTokenIndex = p;
        fixedToken = rightMid.join(' ');
      } else if (wrongMid.length === 0 && rightMid.length >= 1 && p < wToks.length) {
        strikeTokens = wToks;
        bugTokenIndex = p;
        fixedToken = `${rightMid.join(' ')} ${wToks[p]}`.trim();
      } else if (wrongMid.length >= 2 && wrongMid.length <= 3) {
        strikeTokens = [...wToks.slice(0, p), wrongMid.join(' '), ...wToks.slice(wToks.length - s)];
        bugTokenIndex = p;
        fixedToken = rightMid.join(' ');
      } else {
        return;
      }
      const socraticPrompt = wbPick(
        'Tap the single flawed part on the board to fix this sentence!',
        'Sekarang giliranmu: ketuk bagian pengganggu yang membuat kalimat ini keliru!'
      );
      const upgraded: WhiteboardStepCommand = {
        ...st,
        kind: 'surgical_strike',
        column: st.column || 'right',
        pauseForInteraction: true,
        wrongText: st.wrongText,
        rightText: st.rightText,
        strikeTokens,
        bugTokenIndex,
        fixedToken,
        reason: distillToSixWordInk(st.reason || uiAction?.trapWrongReason || '', 11) || st.reason,
        socraticPrompt,
        successVoiceFeedback: wbPick(
          `Spot on! Fixing "${strikeTokens[bugTokenIndex]}" gives "${st.rightText}".`,
          `Tepat sekali! Begitu "${strikeTokens[bugTokenIndex]}" dikoreksi, kalimatnya menjadi "${st.rightText}".`
        ),
      };
      const freshNar = deriveStepSpokenNarration({ ...upgraded, spokenNarration: st.spokenNarration }, shortTitle, boardState.coachExplanation || '', targetLang);
      steps[idx] = {
        ...upgraded,
        id: st.id || `wb_surgical_${idx}`,
        phaseIndex: st.phaseIndex ?? 2,
        column: st.column || 'right',
        spokenNarration: freshNar,
        durationMs: computeStepDurationMs(upgraded, freshNar),
      };
    });
  }

  // PERTAHANKAN `timeline_track` Tenses sebagai Penjelasan Fase 1, lalu TAMBAHKAN `socratic_slider` sebagai Praktik Fase 2 bila belum ada lab interaktif!
  if (
    !hasExplicitVisualSwitch &&
    !steps.some((s) => s.kind === 'socratic_slider' || s.kind === 'interactive_mechanic')
  ) {
    const tlIdx = steps.findIndex(
      (s) => s.kind === 'timeline_track' && Array.isArray(s.timelineEvents) && s.timelineEvents.length >= 2
    );
    if (tlIdx >= 0) {
      const tl = steps[tlIdx];
      const evs = (tl.timelineEvents || []).slice(0, 3);
      const stops = evs.map((ev, eIdx) => ({
        value: eIdx,
        label: distillToSixWordInk(ev.timeLabel || `Titik ${eIdx + 1}`, 4),
        formula: distillToSixWordInk(ev.title || '', 5),
        example: cleanBoardDisplayText(ev.example || sampleSentenceGlobal),
        spokenHint: distillToSixWordInk(ev.timeLabel || ev.title || '', 6),
      }));
      const targetStopIdx = Math.max(0, stops.length - 1);
      const targetStop = stops[targetStopIdx];
      const sliderPractice: WhiteboardStepCommand = {
        id: 'wb_tense_slider_practice',
        kind: 'socratic_slider',
        domainType: 'language',
        column: 'left',
        phaseIndex: 2,
        pauseForInteraction: true,
        title: wbPick('Interactive Timeline Lab', 'Praktik Geser Titik Waktu'),
        sliderDomain: 'tense_timeline',
        sliderLabel: wbPick('Time Anchor', 'Titik Waktu'),
        sliderMin: 0,
        sliderMax: Math.max(1, stops.length - 1),
        sliderStep: 1,
        sliderInitial: 0,
        sliderTarget: targetStopIdx,
        sliderStops: stops,
        socraticPrompt: wbFmt(
          'Now try it: slide or tap "{label}" to see how the verb transforms!',
          'Sekarang giliranmu: geser titik atau ketuk tombol "{label}" dan amati perubahan polanya!',
          undefined,
          { label: targetStop.label }
        ),
        successVoiceFeedback: wbFmt(
          'Exact! At "{label}", the pattern shifts to {formula}: "{example}".',
          'Nah, tepat! Pada "{label}", polanya menjadi {formula}, contohnya "{example}".',
          undefined,
          { label: targetStop.label, formula: targetStop.formula, example: targetStop.example }
        ),
      };
      steps.push(finalizeStep(sliderPractice, steps.length));
    }
  }

  // JAMINAN MUTLAK TEACH-FIRST ("JELASKAN DETAIL, SINGKAT & JELAS + CONTOH NYATA DULU, BARU PRAKTIK INTERAKTIF!"):
  // Pastikan setiap papan memiliki kartu Penjelasan & Contoh non-blocking (Fase 1, pauseForInteraction: false)
  // SEBELUM langkah interaktif pertama (Fase 2, pauseForInteraction: true), sehingga murid tidak pernah disodori soal buta!
  {
    const isNonBlockingTeachingStep = (s: WhiteboardSceneStep) =>
      !s.pauseForInteraction &&
      (s.kind === 'mind_map' ||
        s.kind === 'formula_blocks' ||
        s.kind === 'timeline_track' ||
        s.kind === 'contrast_scale' ||
        s.kind === 'metaphor_scene' ||
        s.kind === 'rough_scene' ||
        s.kind === 'syntax_flow' ||
        s.kind === 'kanji_grid' ||
        s.kind === 'tone_wave' ||
        (s.kind === 'table' && Array.isArray(s.tableRows) && s.tableRows.length >= 2) ||
        (s.kind === 'note' && Array.isArray(s.bullets) && s.bullets.length >= 2));

    const explainRaw = cleanBoardDisplayText(boardState.coachExplanation || uiAction?.explanationText || '');
    const explainSentences = splitExplanationIntoBullets(explainRaw, boardState.patternFormula || '');
    const headingStepRef = steps.find((s) => s.kind === 'heading');
    const topicCheckBlob = `${shortTitle} ${latestUserQuestionText} ${boardState.patternFormula || ''}`.toLowerCase();
    const isSimplePastOnly =
      /\b(?:simple\s*past|past\s*tense|verb\s*2|did\s+not|didn'?t)\b/i.test(topicCheckBlob) &&
      !/\b(?:present\s*perfect|past\s*continuous|past\s*perfect|have\s+been|has\s+been)\b/i.test(topicCheckBlob);
    const isPastVsPerfect =
      /\bsimple\s*past\b|\bpast\s*tense\b/i.test(topicCheckBlob) && /\bpresent\s*perfect\b/i.test(topicCheckBlob);
    const isCubeOr3DNetTopic =
      /\b(?:kubus|jaring[- ]?jaring|balok|bangun\s*ruang|cube)\b/i.test(topicCheckBlob);

    if (headingStepRef && !isCharacterWritingTopic) {
      const curHeadWords = String(headingStepRef.text || '').trim().split(/\s+/).filter(Boolean).length;
      if (isSimplePastOnly && curHeadWords < 9) {
        headingStepRef.text = wbPick(
          'Used for actions that started and finished at a specific time in the past (yesterday, last night, two days ago).',
          'Dipakai untuk kejadian yang mulai dan sudah selesai di waktu lampau tertentu (yesterday, last night, two days ago).'
        );
      } else if (curHeadWords < 7 && explainSentences[0] && explainSentences[0].length >= 24) {
        headingStepRef.text = truncateDiagramLabel(explainSentences[0], 138);
      }
    }

    // Jika topik adalah Simple Past Tense dan diagram bawaan hanyalah garis waktu generik 3 kotak (`wb_dynamic_timeline`),
    // singkirkan agar diganti dengan Peta Penjelasan & Rumus Lengkap Simple Past Tense (Positif, Negatif did not + V1, Tanya)!
    if (isSimplePastOnly) {
      for (let i = steps.length - 1; i >= 0; i--) {
        if (steps[i].id === 'wb_dynamic_timeline' || steps[i].id === 'wb_dynamic_blocks') {
          steps.splice(i, 1);
        }
      }
    }

    if (!steps.some(isNonBlockingTeachingStep)) {
      const formulaClean = cleanBoardDisplayText(boardState.patternFormula || uiAction?.patternFormula || '');
      const rightSample = cleanBoardDisplayText(sampleSentenceGlobal || boardState.sampleTarget || '');
      const wrongTrap = cleanBoardDisplayText(uiAction?.trapWrongSentence || '');
      const wrongWhy = cleanBoardDisplayText(uiAction?.trapWrongReason || '');

      let synthesizedTeachStep: WhiteboardStepCommand;

      if (isCubeOr3DNetTopic) {
        synthesizedTeachStep = {
          id: 'wb_teach_first_cube_3d',
          kind: 'mind_map',
          inkPalette: 'emerald_botanical',
          column: 'left',
          phaseIndex: 1,
          pauseForInteraction: false,
          title: wbPick('Cube Anatomy, Net Rules & Formulas', 'Penjelasan Unsur, Jaring-Jaring & Rumus Kubus'),
          metaphorCenterLabel: 'Bangun Ruang Kubus',
          branches: [
            {
              label: '1. Unsur Utama Kubus',
              sublabel: 'Tersusun dari 6 sisi persegi yang sama besar, 12 rusuk sama panjang, dan 8 titik sudut.',
              example: 'Pasangan berhadapan: Alas ↔ Tutup, Depan ↔ Belakang, Kiri ↔ Kanan',
              icon: 'star',
              color: '#0284C7',
            },
            {
              label: '2. Syarat Jaring-Jaring Sah',
              sublabel: 'Rangkaian 6 persegi datar yang saat tiap engselnya dilipat 90° menutup rapat tanpa ada sisi yang menumpuk.',
              example: '✓ Pola Salib (1-4-1), Pola T, Pola Tangga (total ada 11 pola sah)',
              icon: 'check',
              color: '#10B981',
            },
            {
              label: '3. Rumus Luas & Volume',
              sublabel: 'Luas 1 persegi = s², sehingga 6 sisi = 6 × s². Volume ruang dalam = s × s × s = s³.',
              example: 'Contoh s = 4 cm → Luas = 96 cm² · Volume = 64 cm³',
              icon: 'bolt',
              color: '#8B5CF6',
            },
          ],
          spokenNarration:
            'Sebelum kita melipat kertas tiga dimensi, pahami dulu struktur dasarnya. Kubus memiliki 6 sisi persegi identik, 12 rusuk sama panjang, dan 8 titik sudut. Jaring-jaring kubus hanya sah apabila keenam perseginya saat dilipat 90 derajat saling menutup rapat tanpa ada dua sisi yang bertabrakan di tempat yang sama. Untuk hitungan, luas permukaan adalah 6 dikali rusuk kuadrat, dan volumenya adalah rusuk pangkat tiga.',
        };
      } else if (isSimplePastOnly) {
        synthesizedTeachStep = {
          id: 'wb_teach_first_past_tense',
          kind: 'mind_map',
          inkPalette: 'emerald_botanical',
          column: 'left',
          phaseIndex: 1,
          pauseForInteraction: false,
          title: wbPick('Simple Past Tense: Rules & Examples', 'Penjelasan & Rumus Simple Past Tense'),
          metaphorCenterLabel: 'Simple Past Tense',
          branches: [
            {
              label: wbPick('1. When to Use', '1. Fungsi & Penanda Waktu'),
              sublabel: wbPick(
                'Completed action at a specific past time: yesterday, last night, ... ago, in 2020.',
                'Kejadian sudah selesai di titik waktu lampau: yesterday, last night, ... ago, in 2020.'
              ),
              example: 'I visited Bandung two days ago. (2 hari lalu)',
              icon: 'clock',
              color: '#0284C7',
            },
            {
              label: wbPick('2. Positive (+)', '2. Kalimat Positif (+)'),
              sublabel: wbPick(
                'Subject + Verb 2. Regular verbs add -ed; Irregular verbs change form.',
                'Rumus: Subject + Verb 2. Regular tambah -ed, Irregular berubah bentuk.'
              ),
              example: '✓ I watched TV · She went to school',
              icon: 'check',
              color: '#10B981',
            },
            {
              label: wbPick('3. Negative (-)', '3. Kalimat Negatif (-)'),
              sublabel: wbPick(
                'Subject + did not + Verb 1. Key rule: verb returns to base Verb 1!',
                'Rumus: Subject + did not + Verb 1. PENTING: Kata kerja kembali ke Verb 1 dasar!'
              ),
              example: '✓ I did not go (✕ BUKAN: I did not went)',
              icon: 'warn',
              color: '#F59E0B',
            },
            {
              label: wbPick('4. Question (?)', '4. Kalimat Tanya (?)'),
              sublabel: wbPick(
                'Did + Subject + Verb 1? Because "Did" already marks past, keep Verb 1.',
                'Rumus: Did + Subject + Verb 1? Karena sudah ada "Did", kata kerja tetap Verb 1.'
              ),
              example: '✓ Did you study English last night?',
              icon: 'star',
              color: '#8B5CF6',
            },
          ],
          spokenNarration: wbPick(
            'Before we try the interactive practice, let us make the rule crystal clear. Simple Past Tense describes an action completed at a specific past time like yesterday or last night. In positive sentences, use Verb 2, such as watched or went. Watch out in negative and question sentences: once did not or Did appears, the verb must return to base Verb 1, like I did not go, never I did not went.',
            'Sebelum masuk ke latihan interaktif, pahami dulu konsep dasarnya secara singkat dan jelas. Simple Past Tense dipakai untuk kejadian yang sudah tuntas di masa lalu, ditandai waktu seperti yesterday atau last night. Pada kalimat positif, gunakan kata kerja kedua atau Verb 2, misalnya I watched TV atau She went to school. Hati-hati pada kalimat negatif dan tanya: begitu muncul kata bantu did not atau Did, kata kerjanya wajib kembali ke bentuk dasar Verb 1, contohnya I did not go, bukan I did not went.'
          ),
        };
      } else if (isPastVsPerfect) {
        synthesizedTeachStep = {
          id: 'wb_teach_first_past_vs_perfect',
          kind: 'mind_map',
          inkPalette: 'emerald_botanical',
          column: 'left',
          phaseIndex: 1,
          pauseForInteraction: false,
          title: wbPick('Simple Past vs Present Perfect', 'Penjelasan: Simple Past vs Present Perfect'),
          metaphorCenterLabel: 'Past vs Perfect',
          branches: [
            {
              label: '1. Simple Past (V2)',
              sublabel: wbPick(
                'Finished at a closed past time (yesterday, last year, in 2020).',
                'Kejadian selesai di waktu lampau yang spesifik (yesterday, last year, in 2020).'
              ),
              example: '✓ I lost my key yesterday. (Fokus kapan terjadi)',
              icon: 'clock',
              color: '#0284C7',
            },
            {
              label: '2. Present Perfect (Have/Has + V3)',
              sublabel: wbPick(
                'Past action whose result or experience still connects to NOW.',
                'Aksi lampau tanpa jam spesifik yang hasilnya/pengalamannya masih terasa sekarang.'
              ),
              example: '✓ I have lost my key! (Sekarang kuncinya masih hilang)',
              icon: 'bolt',
              color: '#10B981',
            },
            {
              label: wbPick('3. Time Signal Contrast', '3. Kunci Penanda Waktu'),
              sublabel: wbPick(
                'Specific past clock/year -> Verb 2. Since / for / already / yet -> Have/Has + V3.',
                'Ada waktu lampau spesifik -> wajib Verb 2. Ada since / for / already / yet -> Have/Has + V3.'
              ),
              example: wrongTrap ? `✕ ${wrongTrap}` : '✕ I have seen him yesterday -> ✓ I saw him yesterday',
              icon: 'warn',
              color: '#F59E0B',
            },
          ],
          spokenNarration: wbPick(
            'First, understand the core boundary between the two. Simple Past uses Verb 2 when the past time is specific and closed, like yesterday or in 2020. Present Perfect uses have or has plus Verb 3 when the exact time is not stated or the effect still connects to right now, such as with since, for, or already.',
            'Pahami dulu batas utamanya sebelum berlatih. Simple Past memakai Verb 2 saat titik waktu lampaunya disebut jelas dan sudah lewat, seperti yesterday atau in 2020. Sebaliknya, Present Perfect memakai have atau has ditambah Verb 3 saat pengalaman atau dampaknya masih nyambung sampai detik ini, biasanya ditemani kata since, for, atau already.'
          ),
        };
      } else {
        // Universal Teach-First Card (covers Grammar, Vocab, Mandarin, Japanese, SSW, Math, Physics, Science!)
        const isStemBoard = steps.some(
          (s) =>
            s.domainType === 'math' ||
            s.domainType === 'physics' ||
            s.domainType === 'science' ||
            s.kind === 'step_derivation'
        );
        const firstInteractive = steps.find(
          (s) => s.kind === 'interactive_mechanic' || s.kind === 'socratic_slider' || s.kind === 'step_derivation'
        );
        const derivStep0 = steps.find((s) => s.kind === 'step_derivation')?.derivationSteps?.[0];
        const stemFormulaHint = derivStep0?.latex
          ? `$${derivStep0.latex}$${derivStep0.sideOp ? ` (${derivStep0.sideOp})` : ''}`
          : formulaClean;

        const stripLeadConnector = (s: string) =>
          String(s || '')
            .replace(/^(?:karena\s+itu|oleh\s+karena\s+itu|oleh\s+sebab\s+itu|jadi|sehingga|maka(?:\s+dari\s+itu)?)[,\s]+/i, '')
            .replace(/^([a-z])/, (m) => m.toUpperCase())
            .trim();
        const colonParts = shortTitle.split(/:\s*/).map((p) => p.trim()).filter(Boolean);
        const compactHubLabel =
          colonParts.length >= 2 && colonParts[colonParts.length - 1].length >= 4 && colonParts[colonParts.length - 1].length <= 28
            ? colonParts[colonParts.length - 1]
            : truncateDiagramLabel(shortTitle, 28);
        const compactTitleSuffix = safeMathOrTruncate(shortTitle, 48);

        const branches: NonNullable<WhiteboardStepCommand['branches']> = [];
        const conceptLine = stripLeadConnector(
          explainSentences[0] ||
          (isStemBoard
            ? wbFmt('Understand the core relationship in {t} before calculating.', 'Pahami hubungan dasar pada {t} sebelum mulai menghitung.', undefined, { t: shortTitle })
            : wbFmt('Core usage rule and context for {t}.', 'Aturan dasar dan konteks pemakaian {t}.', undefined, { t: shortTitle }))
        );
        branches.push({
          label: isStemBoard
            ? wbPick('1. Core Concept', '1. Konsep Dasar')
            : wbPick('1. Core Meaning & Function', '1. Makna & Fungsi Utama'),
          sublabel: truncateDiagramLabel(conceptLine, 135),
          example: !isStemBoard && rightSample ? `✓ ${truncateDiagramLabel(rightSample, 88)}` : undefined,
          icon: 'star',
          color: '#0284C7',
        });

        const ruleOrFormulaLine = stripLeadConnector(
          explainSentences[1] ||
          (formulaClean
            ? formulaClean
            : firstInteractive?.wirePairs?.[0]
              ? `${firstInteractive.wirePairs[0].leftLabel} → ${firstInteractive.wirePairs[0].rightLabel}`
              : '')
        );
        if (formulaClean || ruleOrFormulaLine) {
          branches.push({
            label: isStemBoard
              ? wbPick('2. Formula & Key Rule', '2. Rumus & Aturan Kunci')
              : wbPick('2. Pattern & Examples', '2. Pola & Contoh Kalimat'),
            sublabel: truncateDiagramLabel(
              isStemBoard && ruleOrFormulaLine && ruleOrFormulaLine !== formulaClean
                ? ruleOrFormulaLine
                : formulaClean || ruleOrFormulaLine,
              135
            ),
            example: isStemBoard
              ? stemFormulaHint
                ? safeMathOrTruncate(stemFormulaHint, 92)
                : rightSample
                  ? truncateDiagramLabel(rightSample, 88)
                  : undefined
              : rightSample
                ? `✓ ${truncateDiagramLabel(rightSample, 92)}`
                : undefined,
            icon: 'check',
            color: '#10B981',
          });
        }

        const thirdNote = stripLeadConnector(
          wrongWhy ||
          explainSentences[2] ||
          (isStemBoard && derivStep0?.sideOp
            ? `Langkah awal: lakukan ${derivStep0.sideOp} secara teliti sebelum menentukan hasil akhir.`
            : '')
        );
        if (wrongTrap || thirdNote) {
          branches.push({
            label: isStemBoard
              ? wbPick('3. How to Solve Cleanly', '3. Langkah & Ketelitian')
              : wbPick('3. Common Trap to Avoid', '3. Catatan & Jebakan Umum'),
            sublabel: truncateDiagramLabel(
              thirdNote || wbPick('Compare the wrong form with the natural pattern above.', 'Bandingkan bentuk keliru ini dengan pola yang benar di atas.'),
              135
            ),
            example: wrongTrap && !isStemBoard ? `✕ ${truncateDiagramLabel(wrongTrap, 88)}` : undefined,
            icon: wrongTrap ? 'warn' : 'bolt',
            color: '#F59E0B',
          });
        }

        const fullSpokenTeach =
          explainRaw && explainRaw.split(/\s+/).length >= 14
            ? explainRaw
            : [
                conceptLine,
                formulaClean ? `Pola kuncinya adalah ${formulaClean.replace(/\$+/g, '')}.` : '',
                rightSample && !isStemBoard ? `Contoh kalimat yang tepat: ${rightSample}.` : '',
                wrongWhy ? wrongWhy : '',
              ]
                .filter(Boolean)
                .join(' ');

        synthesizedTeachStep = {
          id: 'wb_teach_first_breakdown',
          kind: 'mind_map',
          inkPalette: 'emerald_botanical',
          column: 'left',
          phaseIndex: 1,
          pauseForInteraction: false,
          title: isStemBoard
            ? `${wbPick('Concept & Method', 'Penjelasan & Cara Hitung')}: ${compactTitleSuffix}`
            : `${wbPick('Explanation & Examples', 'Penjelasan & Contoh')}: ${compactTitleSuffix}`,
          metaphorCenterLabel: compactHubLabel,
          branches,
          spokenNarration: fullSpokenTeach,
        };
      }

      const headingPos = steps.findIndex((s) => s.kind === 'heading');
      const insertPos = headingPos >= 0 ? headingPos + 1 : 0;
      steps.splice(insertPos, 0, finalizeStep(synthesizedTeachStep, insertPos));
    }

    // BERSIHKAN BOCORAN JAWABAN DI SUBLABEL BUCKET & PROMOSIKAN OTOMATIS KE SANDBOX EKSPERIMEN 60 FPS!
    steps.forEach((st) => {
      if (Array.isArray(st.bucketZones) && Array.isArray(st.bucketChips) && st.bucketChips.length > 0) {
        const chipWords = st.bucketChips
          .map((c) => String(c.label || '').trim().toLowerCase())
          .filter((w) => w.length >= 2);
        st.bucketZones = st.bucketZones.map((z) => {
          const sub = String(z.sublabel || '').trim();
          if (!sub) return z;
          const leaksChip = chipWords.some((cw) => sub.toLowerCase().includes(cw));
          return leaksChip ? { ...z, sublabel: undefined } : z;
        });
      }
    });

    const hasExperimentSandboxAlready = steps.some(
      (s) => s.kind === 'interactive_mechanic' && s.mechanic === 'experiment_sandbox'
    );
    if (!hasExperimentSandboxAlready && !isCharacterWritingTopic && variantNonce === 0) {
      let autoSandboxKind: WhiteboardStepCommand['sandboxKind'] | undefined;
      let autoSandboxParams: Record<string, number | string | boolean> | undefined;
      let autoSandboxTitle = '';
      let autoSandboxPrompt = '';

      if (isCubeOr3DNetTopic) {
        const sM = topicCheckBlob.match(/(\d+)\s*cm/i);
        autoSandboxKind = 'cube_3d_net';
        autoSandboxParams = { sideCm: sM ? Math.max(2, Math.min(12, Number(sM[1]))) : 4 };
        autoSandboxTitle = 'Lab Eksperimen Lipat Kertas Kubus 3D';
        autoSandboxPrompt = 'Geser tuas lipatan hingga 90° (atau ketuk Lipat Jadi Kubus), putar bentuk 3D dengan jari, dan uji pola jaring valid vs jaring gagal!';
      } else if (/\b(?:luas\s*segitiga|segitiga|pythagor|luas\s*lingkaran|keliling\s*lingkaran)\b/i.test(topicCheckBlob)) {
        const isCir = /lingkaran/i.test(topicCheckBlob);
        const isPy = /pythagor/i.test(topicCheckBlob);
        autoSandboxKind = 'geometry_2d_morph';
        autoSandboxParams = { shape: isCir ? 'circle' : isPy ? 'pythagoras' : 'triangle', targetBase: 8, targetHeight: 6 };
        autoSandboxTitle = isCir ? 'Meja Eksperimen Jari-Jari & Keliling Lingkaran' : 'Meja Eksperimen Geser Titik Sudut Segitiga';
        autoSandboxPrompt = 'Geser langsung titik sudut berwarna dengan jarimu di atas petak untuk membuktikan perubahan ukurannya secara langsung!';
      } else if (/\bhukum\s*ohm|tegangan\s*listrik|rangkaian\s*listrik|kuat\s*arus\b/i.test(topicCheckBlob)) {
        autoSandboxKind = 'circuit_ohm_live';
        autoSandboxParams = { targetV: 12, targetR: 4 };
        autoSandboxTitle = 'Lab Eksperimen Rangkaian Listrik Hukum Ohm';
        autoSandboxPrompt = 'Ubah Tegangan Baterai (V) dan Hambatan (Ω), lalu amati gerak elektron dan terang lampu secara langsung!';
      } else if (/\bhukum\s*(?:ii\s*)?newton|\bf\s*=\s*m\s*[·*×x]?\s*a\b|gaya\s*dan\s*percepatan/i.test(topicCheckBlob)) {
        autoSandboxKind = 'newton_motion_track';
        autoSandboxParams = { forceN: 12, massKg: 3 };
        autoSandboxTitle = 'Lintasan Eksperimen Gaya & Massa Hukum Newton';
        autoSandboxPrompt = 'Atur Gaya (N) dan Massa Beban (kg), lalu tekan Dorong & Luncurkan untuk melihat percepatan kereta!';
      } else if (/\bpecahan\b|\d+\s*\/\s*\d+\s*[+-]\s*\d+\s*\/\s*\d+/i.test(topicCheckBlob)) {
        autoSandboxKind = 'fraction_grid_mixer';
        autoSandboxParams = { n1: 2, d1: 3, n2: 1, d2: 4, op: '+' };
        autoSandboxTitle = 'Lab Eksperimen Potong & Gabung Pecahan Visual';
        autoSandboxPrompt = 'Tekan Potong Silang untuk menyamakan ukuran petak kedua pecahan, lalu tekan Gabungkan Petaknya!';
      } else if (isSimplePastOnly || isPastVsPerfect) {
        autoSandboxKind = 'grammar_time_morph';
        autoSandboxParams = { tenseMode: isPastVsPerfect ? 'past_vs_perfect' : 'simple_past' };
        autoSandboxTitle = 'Mesin Eksperimen Mutasi Kalimat: (+), (-), (?)';
        autoSandboxPrompt = 'Ubah sakelar (+), (-), (?), ganti kata kerja, atau tekan Uji Tabrakan Salah untuk melihat langsung bagaimana kata bantu did menarik Verb 2 kembali ke Verb 1!';
      }

      if (autoSandboxKind) {
        const firstInteractiveIdx = steps.findIndex(
          (s) => s.kind === 'interactive_mechanic' || s.kind === 'socratic_slider'
        );
        const sandboxCmd: WhiteboardStepCommand = {
          id: 'wb_auto_experiment_sandbox',
          kind: 'interactive_mechanic',
          mechanic: 'experiment_sandbox',
          sandboxKind: autoSandboxKind,
          sandboxParams: autoSandboxParams,
          inkPalette: 'cobalt_blueprint',
          column: 'left',
          phaseIndex: 2,
          pauseForInteraction: true,
          title: autoSandboxTitle,
          socraticPrompt: autoSandboxPrompt,
        };
        if (firstInteractiveIdx >= 0) {
          steps[firstInteractiveIdx] = finalizeStep(
            { ...sandboxCmd, id: steps[firstInteractiveIdx].id || sandboxCmd.id },
            firstInteractiveIdx
          );
        } else {
          steps.push(finalizeStep(sandboxCmd, steps.length));
        }
      }
    }
  }

  // Tombol eksplisit "Variasi Lab" (`variantNonce > 0`): putar mekanik Kiri & Kanan menjadi lab otentik baru!
  const topicSeed = hashDirectorSeed(`${shortTitle}|${boardState.patternFormula || ''}|${sampleSentenceGlobal}`);
  if (variantNonce > 0 && !isCharacterWritingTopic) {
    const [remixLeftRaw, remixRightRaw] = buildDynamicTopicRemixPair({
      shortTitle,
      boardState,
      uiAction,
      sampleSentenceGlobal,
      seed: topicSeed,
      variantNonce,
      existingSteps: steps,
    });
    const leftReplaceIdx = steps.findIndex(
      (s) =>
        s.column !== 'right' &&
        (s.kind === 'interactive_mechanic' || s.kind === 'socratic_slider')
    );
    const rightReplaceIdx = steps.findIndex(
      (s) =>
        s.column === 'right' &&
        (s.kind === 'interactive_mechanic' ||
          s.kind === 'surgical_strike' ||
          s.kind === 'step_derivation' ||
          s.kind === 'trap_vs_fix')
    );
    if (leftReplaceIdx >= 0) {
      steps[leftReplaceIdx] = finalizeStep(remixLeftRaw, leftReplaceIdx);
    } else {
      steps.push(finalizeStep(remixLeftRaw, steps.length));
    }
    if (rightReplaceIdx >= 0) {
      steps[rightReplaceIdx] = finalizeStep(remixRightRaw, rightReplaceIdx);
    } else {
      steps.push(finalizeStep(remixRightRaw, steps.length));
    }
  }

  // JAMINAN MUTLAK INTERAKTIF 100% (ZERO PASSIVE LECTURE GUARANTEE):
  // Apabila setelah semua kompilasi masih belum ada SATU PUN langkah yang berhenti menunggu interaksi murid (`pauseForInteraction`),
  // bangkitkan otomatis 1 Lab Interaktif Otentik dari isi materi papan tersebut!
  if (!steps.some((s) => Boolean(s.pauseForInteraction))) {
    const [guaranteedLeftLab, guaranteedRightLab] = buildDynamicTopicRemixPair({
      shortTitle,
      boardState,
      uiAction,
      sampleSentenceGlobal,
      seed: topicSeed,
      variantNonce: 0,
      existingSteps: steps,
    });
    const hasLeftDiagram = steps.some(
      (s) => s.column !== 'right' && (s.kind === 'kanji_grid' || s.kind === 'rough_scene' || s.kind === 'mind_map' || s.kind === 'formula_blocks')
    );
    const fallbackInteractive = hasLeftDiagram ? guaranteedRightLab : guaranteedLeftLab;
    const insertIdx = Math.max(1, steps.findIndex((s) => s.kind === 'highlight_callout' || s.kind === 'checkpoint'));
    if (insertIdx > 0 && insertIdx < steps.length) {
      steps.splice(insertIdx, 0, finalizeStep(fallbackInteractive, insertIdx));
    } else {
      steps.push(finalizeStep(fallbackInteractive, steps.length));
    }
  }

  // Hindari penumpukan `wb_auto_trap` apabila Kolom Kanan sudah memiliki `interactive_mechanic` kaya
  if (steps.some((s) => s.kind === 'interactive_mechanic' && s.column === 'right')) {
    for (let i = steps.length - 1; i >= 0; i--) {
      if (
        (steps[i].kind === 'trap_vs_fix' || steps[i].kind === 'surgical_strike') &&
        /wb_auto_trap|wb_trap_vs_fix/i.test(steps[i].id)
      ) {
        steps.splice(i, 1);
      }
    }
  }

  const explicitLeftPal = steps.find((s) => s.column !== 'right' && s.kind !== 'heading' && s.inkPalette)?.inkPalette;
  const defaultLeftPalette = explicitLeftPal || DIRECTOR_INK_PALETTES[(topicSeed + variantNonce * 3) % DIRECTOR_INK_PALETTES.length];
  const defaultRightPalette = DIRECTOR_INK_PALETTES[(topicSeed + variantNonce * 3 + 3) % DIRECTOR_INK_PALETTES.length];
  const defaultLeftHatch = DIRECTOR_HATCH_STYLES[(topicSeed + variantNonce * 2) % DIRECTOR_HATCH_STYLES.length];
  const defaultRightHatch = DIRECTOR_HATCH_STYLES[(topicSeed + variantNonce * 2 + 2) % DIRECTOR_HATCH_STYLES.length];
  steps.forEach((st, idx) => {
    if (st.kind === 'heading') {
      st.inkPalette = defaultLeftPalette;
    } else if (!st.inkPalette) {
      st.inkPalette = st.column === 'right' ? defaultRightPalette : defaultLeftPalette;
    }
    if (!st.roughHatch) {
      st.roughHatch = st.column === 'right' ? defaultRightHatch : defaultLeftHatch;
    }
    if (typeof st.variantSeed !== 'number') {
      st.variantSeed = topicSeed + variantNonce * 19 + idx * 7;
    }
  });

  // Jaga urutan pedagogis Teach-First Sokratik yang kronologis 100% di Mobile & Desktop:
  // Kolom Kiri: Heading (Fase 0) -> Penjelasan & Contoh Non-Blocking (Fase 1) -> Lab Interaktif 1 (Fase 2, bila ada 2 lab)
  // Kolom Kanan: Lab Interaktif 2 / Bedah / Derivasi (Fase 3) -> Kunci Inti (Fase 4) -> Kuis Akhir (Fase 4)
  if (steps.length > 1) {
    const headings = steps.filter((s) => s.kind === 'heading').slice(0, 1);
    const isInteractivePracticeStep = (s: WhiteboardSceneStep) =>
      Boolean(s.pauseForInteraction) ||
      s.kind === 'interactive_mechanic' ||
      s.kind === 'socratic_slider' ||
      s.kind === 'surgical_strike' ||
      s.kind === 'step_derivation';
    const isTeachingVisualStep = (s: WhiteboardSceneStep) =>
      !isInteractivePracticeStep(s) &&
      (s.kind === 'kanji_grid' ||
        s.kind === 'rough_scene' ||
        s.kind === 'metaphor_scene' ||
        s.kind === 'mind_map' ||
        s.kind === 'timeline_track' ||
        s.kind === 'formula_blocks' ||
        s.kind === 'contrast_scale' ||
        s.kind === 'syntax_flow' ||
        s.kind === 'tone_wave' ||
        (s.kind === 'table' && Array.isArray(s.tableRows) && s.tableRows.length >= 2) ||
        (s.kind === 'note' && Array.isArray(s.bullets) && s.bullets.length >= 2));

    const allTeachingSteps = steps.filter(isTeachingVisualStep);
    if (isCharacterWritingTopic) {
      allTeachingSteps.sort((a, b) => Number(a.kind !== 'kanji_grid') - Number(b.kind !== 'kanji_grid'));
    } else if (isWorkflowDiagramTopic && variantNonce === 0) {
      allTeachingSteps.sort((a, b) => Number(a.kind !== 'rough_scene') - Number(b.kind !== 'rough_scene'));
    } else {
      const rankTeach = (v: WhiteboardSceneStep) => {
        if (v.kind === 'mind_map' || v.kind === 'formula_blocks' || v.kind === 'timeline_track') return 0;
        if (v.kind === 'contrast_scale' || v.kind === 'metaphor_scene') return 1;
        if (v.kind === 'rough_scene' && Array.isArray(v.shapes) && v.shapes.length >= 4) return 2;
        if (v.kind === 'table') return 3;
        return 4;
      };
      allTeachingSteps.sort((a, b) => rankTeach(a) - rankTeach(b));
    }
    const primaryTeaching = allTeachingSteps.slice(0, 1);
    // Khusus penulisan karakter Kanji/Hanzi yang punya tabel kosakata pendamping, izinkan tabel tetap mendampingi
    const extraCharTable =
      isCharacterWritingTopic && primaryTeaching[0]?.kind === 'kanji_grid'
        ? allTeachingSteps.filter((s) => s.kind === 'table').slice(0, 1)
        : [];

    const interactiveSteps = steps.filter(isInteractivePracticeStep).sort((a, b) => {
      const aExp = a.kind === 'interactive_mechanic' && a.mechanic === 'experiment_sandbox' ? 0 : 1;
      const bExp = b.kind === 'interactive_mechanic' && b.mechanic === 'experiment_sandbox' ? 0 : 1;
      return aExp - bExp;
    });
    const trapFallbacks =
      interactiveSteps.length < 2
        ? steps.filter((s) => s.kind === 'trap_vs_fix').slice(0, 1)
        : [];
    const callouts = steps.filter((s) => s.kind === 'highlight_callout').slice(0, 1);
    const studentQs = steps.filter((s) => s.kind === 'student_question');
    const checkpoints = steps.filter((s) => s.kind === 'checkpoint').slice(0, 1);

    // Tempatkan Lab Interaktif 1 di bawah Penjelasan (Kolom Kiri) bila ada >= 2 latihan agar kiri-kanan seimbang DAN urutan DOM mobile 100% kronologis!
    const leftInteractive =
      interactiveSteps.length >= 2 ? [interactiveSteps[0]] : [];
    const rightInteractive =
      interactiveSteps.length >= 2
        ? interactiveSteps.slice(1, 2)
        : interactiveSteps.slice(0, 1);

    headings.forEach((s) => {
      s.column = 'left';
      s.phaseIndex = 0;
      s.pauseForInteraction = false;
    });
    [...primaryTeaching, ...extraCharTable].forEach((s) => {
      s.column = 'left';
      s.phaseIndex = 1;
      s.pauseForInteraction = false;
    });
    leftInteractive.forEach((s) => {
      s.column = 'left';
      s.phaseIndex = Math.min(phaseLabels.length - 1, 2);
      s.pauseForInteraction = true;
    });
    rightInteractive.forEach((s) => {
      s.column = 'right';
      s.phaseIndex = Math.min(phaseLabels.length - 1, leftInteractive.length > 0 ? 3 : 2);
      s.pauseForInteraction = true;
    });
    trapFallbacks.forEach((s) => {
      s.column = 'right';
      s.phaseIndex = Math.min(phaseLabels.length - 1, 3);
    });
    callouts.forEach((s) => {
      s.column = 'right';
      s.phaseIndex = Math.min(phaseLabels.length - 1, 4);
      s.pauseForInteraction = false;
    });
    studentQs.forEach((s) => {
      s.column = 'right';
      s.phaseIndex = Math.min(phaseLabels.length - 1, 4);
    });
    checkpoints.forEach((s) => {
      s.column = 'right';
      s.phaseIndex = Math.max(3, phaseLabels.length - 1);
    });

    const reordered = [
      ...headings,
      ...primaryTeaching,
      ...extraCharTable,
      ...leftInteractive,
      ...rightInteractive,
      ...trapFallbacks,
      ...callouts,
      ...studentQs,
      ...checkpoints,
    ];
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
        st.title = st.title || wbPick('To Be vs Active Verb Map', 'Peta Slot Sah To Be vs Verb 1 Aktif');
        st.blocks = [
          { role: wbPick('Subject + Verb 1', 'Subjek + Verb 1'), token: 'I agree / work', note: wbPick('Direct active verb, no To Be', 'Kata kerja aktif langsung, tanpa To Be'), color: '#10B981' },
          { role: wbPick('To Be + Adj/Noun', 'To Be + Sifat/Benda'), token: 'I am ready / a student', note: wbPick('States, traits, roles, or places', 'Kata sifat, profesi, atau lokasi'), color: '#0EA5E9' },
          { role: wbPick('To Be + Verb-ing', 'To Be + Verb ing'), token: 'I am working', note: wbPick('Action happening right now', 'Aksi sedang berlangsung sekarang'), color: '#8B5CF6' },
          { role: wbPick('To Be + Verb 3', 'To Be + Verb 3'), token: 'It is agreed', note: wbPick('Passive voice (acted upon)', 'Kalimat pasif (dikenai tindakan)'), color: '#F59E0B' },
        ];
      } else {
        const toks = cleanBoardDisplayText(sampleSentenceGlobal || st.rightText || '').split(/\s+/).filter(Boolean).slice(0, 5);
        const colors = ['#0EA5E9', '#10B981', '#8B5CF6', '#F59E0B', '#EC4899'];
        if (toks.length >= 2) {
          st.blocks = toks.map((tok, bIdx) => ({
            role: bIdx === 0 ? wbPick('Subject', 'Subjek') : bIdx === 1 ? wbPick('Core Pattern', 'Inti Pola') : `${wbPick('Slot', 'Unsur')} ${bIdx + 1}`,
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
          role: nIdx === 0 ? wbPick('Subject', 'Subjek') : nIdx === 1 ? wbPick('Verb / Key', 'Kata Kerja / Kunci') : wbPick('Complement', 'Pelengkap'),
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
        label: truncateDiagramLabel(cleanBoardDisplayText(r[0] || `Poin ${rIdx + 1}`), 32),
        sublabel: cleanBoardDisplayText(r[2] || r[1] || noteStepForEnrich?.bullets?.[rIdx] || ''),
        example: cleanBoardDisplayText(r[1] || sampleSentenceGlobal || ''),
        color: palette[rIdx % palette.length],
        icon: icons[rIdx % icons.length],
      }));
      const replaced = {
        ...st,
        kind: 'mind_map' as const,
        sceneTheme: undefined,
        metaphorCenterLabel: truncateDiagramLabel(cleanBoardDisplayText(shortTitle), 28) || wbPick('Core Concept', 'Peta Konsep Inti'),
        title: `${wbPick('Concept Map', 'Peta Konsep')}: ${truncateDiagramLabel(cleanBoardDisplayText(shortTitle), 40)}`,
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
          label: truncateDiagramLabel(cleanBoardDisplayText(r[0] || `Poin ${rIdx + 1}`), 30),
          sublabel: cleanBoardDisplayText(r[2] || r[1] || noteStepForEnrich?.bullets?.[rIdx] || ''),
          example: cleanBoardDisplayText(r[1] || sampleSentenceGlobal || ''),
          color: palette[rIdx % palette.length],
          icon: icons[rIdx % icons.length],
        })).filter((b) => b.label) ||
        noteStepForEnrich?.bullets?.slice(0, 4).map((b, bIdx) => ({
          label: wbPick(`Rule ${bIdx + 1}`, `Aturan ${bIdx + 1}`),
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
          metaphorCenterLabel: truncateDiagramLabel(cleanBoardDisplayText(shortTitle), 28) || wbPick('Core Concept', 'Peta Konsep Inti'),
          title: `${wbPick('Concept Map', 'Peta Konsep Jelas')}: ${truncateDiagramLabel(cleanBoardDisplayText(shortTitle), 38)}`,
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
            tableStepForEnrich?.tableRows?.[0]?.slice(1).filter(Boolean).join(', ') ||
            boardState.patternFormula ||
            `Gunakan ${st.leftPanel.title} sesuai konteks utamanya.`
          ),
        };
        repaired = true;
      }
      if (!st.leftPanel.example) {
        const isLeftTrap = /hindari|salah|keliru|trap|wrong|✕|×/i.test(
          `${st.leftPanel.badge || ''} ${st.leftPanel.title || ''}`
        );
        const exA = cleanBoardDisplayText(
          tableStepForEnrich?.tableRows?.[0]?.[1] ||
          (isLeftTrap && trapStepForEnrich?.wrongText ? `✕ ${trapStepForEnrich.wrongText}` : '') ||
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
            tableStepForEnrich?.tableRows?.[1]?.slice(1).filter(Boolean).join(', ') ||
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
      if (st.kind === 'contrast_scale') repaired = true;
      st.termA = st.leftPanel?.title || resolvedPairA;
    } else {
      st.termA = cleanPairText(st.termA || '') || st.termA;
    }
    if ((!st.termB || genericSideRe.test(cleanPairText(st.termB))) && (st.rightPanel?.title || resolvedPairB)) {
      if (st.kind === 'contrast_scale') repaired = true;
      st.termB = st.rightPanel?.title || resolvedPairB;
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
    const existingNar = String(st.spokenNarration || '');
    const existingNarWords = existingNar.split(/\s+/).filter(Boolean).length;
    const leftFullForNar = `${st.leftPanel?.title || st.termA || ''} ${st.leftPanel?.subtitle || st.descA || ''} ${st.leftPanel?.example || ''}`;
    const rightFullForNar = `${st.rightPanel?.title || st.termB || ''} ${st.rightPanel?.subtitle || st.descB || ''} ${st.rightPanel?.example || ''}`;
    if (
      repaired ||
      existingNarWords < 16 ||
      !doesNarrationCoverPanelPair(existingNar, leftFullForNar, rightFullForNar) ||
      /\bsisi\s*[ab12]\b|\bsisi\s+(?:pertama|kedua)\b|\bpola\s+(?:pertama|kedua)\b/i.test(existingNar)
    ) {
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

export { cleanStepCaptionAndSpokenText };

/**
 * Menghasilkan teks TTS Chunk-0 pembuka yang 100% identik dengan hasil
 * `buildWhiteboardScenePlan` -> `buildCohesiveBoardNarrationScript` -> `splitTtsIntoSentenceChunks(..., 145)[0]`
 * sehingga audio yang di-pre-warm saat SSE `opener` tiba langsung cache-hit 0 ms saat papan lengkap tiba.
 */
export function extractOpenerFirstTtsChunk(opener?: OpenerPacketLike | null): string {
  const spokenText = openerSpokenText(opener);
  if (!spokenText) return '';
  return splitTtsIntoSentenceChunks(spokenText, 145)[0] || spokenText;
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
    const { caption: rawCaption, spokenText: spokenChunk } = cleanStepCaptionAndSpokenText(
      st.spokenNarration || st.title || st.text || ''
    );
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
