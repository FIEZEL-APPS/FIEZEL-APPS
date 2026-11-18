import type { TargetLang } from '../types/voiceCall.ts';
import { tokenizeJapaneseToRuby } from './japanesePhonetics.js';

export type AlignedTokenStatus = 'match' | 'close' | 'miss' | 'wrong';

export interface AlignedWordToken {
  word: string;
  normalized: string;
  status: AlignedTokenStatus;
  heard?: string;
  similarity: number;
}

export interface MispronouncedWordPair {
  expected: string;
  heard: string;
  similarity: number;
}

export interface SpeechAlignmentResult {
  expectedText: string;
  heardText: string;
  targetLang: TargetLang;
  expectedCount: number;
  heardCount: number;
  exactMatches: number;
  closeMatches: number;
  wordAccuracy: number; // 0..1 exact word ratio
  phoneticAccuracy: number; // 0..1 weighted phonetic + order accuracy
  passed: boolean;
  matchedWords: string[];
  missedWords: string[];
  extraWords: string[];
  mispronouncedPairs: MispronouncedWordPair[];
  tokens: AlignedWordToken[];
}

function katakanaToHiragana(s: string): string {
  return s.replace(/[\u30A1-\u30F6]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0x60)
  );
}

function expandEnglishContractions(text: string): string {
  return text
    .replace(/\bcan['\u2019]t\b/gi, 'cannot')
    .replace(/\bwon['\u2019]t\b/gi, 'will not')
    .replace(/\bshan['\u2019]t\b/gi, 'shall not')
    .replace(/\b(do|does|did|is|are|was|were|have|has|had|would|could|should|must|need|might)n['\u2019]t\b/gi, '$1 not')
    .replace(/\b(i|you|we|they|he|she|it|that|there|here|what|who|where)['\u2019]re\b/gi, '$1 are')
    .replace(/\b(i|you|we|they|could|would|should|might|must)['\u2019]ve\b/gi, '$1 have')
    .replace(/\b(i|you|we|they|he|she|it|that|there)['\u2019]ll\b/gi, '$1 will')
    .replace(/\bi['\u2019]m\b/gi, 'i am')
    .replace(/\blet['\u2019]s\b/gi, 'let us')
    .replace(/\b(it|that|there|here|what|who|where|he|she)['\u2019]s\b/gi, '$1 is')
    .replace(/\b(i|you|we|they|he|she|it)['\u2019]d\b/gi, '$1 would');
}

function extractEnglishVowelCore(word: string): string {
  return word
    .toLowerCase()
    .replace(/[^a-z]/g, '')
    .replace(/(ee|ea|ie)/g, 'i')
    .replace(/(oo|ou)/g, 'u')
    .replace(/[^aeiou]/g, '');
}

function tokenizeJaWithReadings(
  stripped: string,
  expectedCompoundReadings?: Set<string>
): {
  tokens: Array<{ display: string; norm: string }>;
  compoundReadings: Set<string>;
} {
  const rubyTokens = tokenizeJapaneseToRuby(stripped);
  const rawUnits: Array<{ display: string; norm: string; isCompoundKanji: boolean }> = [];
  const compoundReadings = new Set<string>();

  for (const tk of rubyTokens as any[]) {
    if (!tk || tk.isSpace || tk.isPunct) continue;
    if (tk.isKanji && tk.isStemWithTail && tk.ruby) {
      const stemHira = katakanaToHiragana(String(tk.ruby).toLowerCase());
      if (stemHira.length >= 2) compoundReadings.add(stemHira);
      rawUnits.push({
        display: String(tk.kanjiPart || tk.text || ''),
        norm: stemHira,
        isCompoundKanji: stemHira.length >= 2,
      });
      for (const ch of String(tk.tail || '')) {
        if (/[\u3040-\u30FF\u4E00-\u9FFF0-9a-zA-Zー]/.test(ch)) {
          rawUnits.push({
            display: ch,
            norm: katakanaToHiragana(ch.toLowerCase()),
            isCompoundKanji: false,
          });
        }
      }
      continue;
    }
    if (tk.isKanji && tk.ruby) {
      const hira = katakanaToHiragana(String(tk.ruby).toLowerCase());
      if (hira.length >= 2) compoundReadings.add(hira);
      rawUnits.push({
        display: String(tk.text || ''),
        norm: hira,
        isCompoundKanji: hira.length >= 2,
      });
      continue;
    }
    for (const ch of String(tk.text || '')) {
      if (/[\u3040-\u30FF\u4E00-\u9FFF0-9a-zA-Zー]/.test(ch)) {
        rawUnits.push({
          display: ch,
          norm: katakanaToHiragana(ch.toLowerCase()),
          isCompoundKanji: false,
        });
      }
    }
  }

  if (!expectedCompoundReadings) {
    return {
      tokens: rawUnits.map((u) => ({ display: u.display, norm: u.norm })),
      compoundReadings,
    };
  }

  // Expand heard compound Kanji if expected did not group by that compound (e.g. expected wrote kana)
  const expandedHeard: Array<{ display: string; norm: string; isCompoundKanji: boolean }> = [];
  for (const u of rawUnits) {
    if (u.isCompoundKanji && !expectedCompoundReadings.has(u.norm)) {
      let first = true;
      for (const ch of u.norm) {
        expandedHeard.push({ display: first ? u.display : '', norm: ch, isCompoundKanji: false });
        first = false;
      }
    } else {
      expandedHeard.push(u);
    }
  }

  const sortedCompounds = [...expectedCompoundReadings].sort((a, b) => b.length - a.length);
  const out: Array<{ display: string; norm: string }> = [];
  let idx = 0;
  while (idx < expandedHeard.length) {
    const cur = expandedHeard[idx];
    if (!cur.isCompoundKanji) {
      let matchedComp = '';
      for (const comp of sortedCompounds) {
        if (idx + comp.length <= expandedHeard.length) {
          let okComp = true;
          let joined = '';
          let disp = '';
          for (let k = 0; k < comp.length; k++) {
            if (expandedHeard[idx + k].isCompoundKanji) {
              okComp = false;
              break;
            }
            joined += expandedHeard[idx + k].norm;
            disp += expandedHeard[idx + k].display;
          }
          if (okComp && joined === comp) {
            matchedComp = comp;
            out.push({ display: disp || comp, norm: comp });
            idx += comp.length;
            break;
          }
        }
      }
      if (matchedComp) continue;
    }
    out.push({ display: cur.display || cur.norm, norm: cur.norm });
    idx += 1;
  }
  return { tokens: out, compoundReadings };
}

function tokenizeForAlignment(
  raw: string,
  targetLang: TargetLang,
  expectedJaCompounds?: Set<string>
): { tokens: Array<{ display: string; norm: string }>; jaCompounds?: Set<string> } {
  const cleaned = String(raw || '').trim();
  if (!cleaned) return { tokens: [] };

  if (targetLang === 'zh') {
    const stripped = cleaned.replace(/[，。！？、；：“”"'‘’（）【】《》.,!?;:()\[\]{}]/g, ' ').trim();
    const out: Array<{ display: string; norm: string }> = [];
    const parts = stripped.split(/\s+/).filter(Boolean);
    for (const part of parts) {
      if (/[\u4E00-\u9FFF]/.test(part)) {
        for (const ch of part) {
          if (/[\u4E00-\u9FFF0-9a-zA-Z]/.test(ch)) {
            out.push({ display: ch, norm: ch.toLowerCase() });
          }
        }
      } else {
        const low = part.toLowerCase();
        if (low) out.push({ display: part, norm: low });
      }
    }
    return { tokens: out };
  }

  if (targetLang === 'ja') {
    const stripped = cleaned.replace(/[、。「」『』！？・，．.,!?;:()\[\]{}"']/g, ' ').trim();
    const hasCjk = /[\u3040-\u30FF\u4E00-\u9FFF]/.test(stripped);
    if (!hasCjk) {
      return {
        tokens: stripped
          .split(/\s+/)
          .map((w) => w.trim())
          .filter(Boolean)
          .map((w) => ({ display: w, norm: w.toLowerCase() })),
      };
    }
    const jaRes = tokenizeJaWithReadings(stripped, expectedJaCompounds);
    return { tokens: jaRes.tokens, jaCompounds: jaRes.compoundReadings };
  }

  // English (default)
  const expanded = expandEnglishContractions(cleaned);
  const stripped = expanded
    .replace(/[\u2018\u2019']/g, '')
    .replace(/[^a-zA-Z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!stripped) return { tokens: [] };
  return {
    tokens: stripped
      .split(/\s+/)
      .flatMap((tok) => tok.split('-'))
      .map((w) => w.trim())
      .filter(Boolean)
      .map((w) => ({ display: w, norm: w.toLowerCase() })),
  };
}

function toPhoneticSkeleton(word: string): string {
  let w = word.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!w) return '';
  w = w
    .replace(/^kn/, 'n')
    .replace(/^wr/, 'r')
    .replace(/^ps/, 's')
    .replace(/tion/g, 'shn')
    .replace(/sion/g, 'shn')
    .replace(/ph/g, 'f')
    .replace(/gh(?=[aeiou]|$)/g, 'g')
    .replace(/gh/g, '')
    .replace(/qu/g, 'kw')
    .replace(/ch/g, 'c')
    .replace(/sh/g, 's')
    .replace(/th/g, '0')
    .replace(/c(?=[eiy])/g, 's')
    .replace(/c/g, 'k')
    .replace(/x/g, 'ks')
    .replace(/z/g, 's')
    .replace(/v/g, 'f')
    .replace(/([a-z])\1+/g, '$1');

  if (w.length <= 2) return w;
  const first = w[0];
  const tail = w.slice(1).replace(/[aeiouyh]/g, '');
  return (first + tail).slice(0, 8);
}

function levenshteinDist(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp: number[] = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const temp = dp[j];
      if (a[i - 1] === b[j - 1]) {
        dp[j] = prev;
      } else {
        dp[j] = 1 + Math.min(prev, dp[j], dp[j - 1]);
      }
      prev = temp;
    }
  }
  return dp[n];
}

function tokenSimilarity(
  expNorm: string,
  heardNorm: string,
  targetLang: TargetLang
): { similarity: number; isMorphDrop: boolean } {
  if (!expNorm || !heardNorm) return { similarity: 0, isMorphDrop: false };
  if (expNorm === heardNorm) return { similarity: 1, isMorphDrop: false };

  if (targetLang === 'en') {
    // Explicitly flag dropped plural -s or past -ed endings so pronunciation errors are never masked
    if (
      (expNorm.endsWith('s') && expNorm.slice(0, -1) === heardNorm) ||
      (expNorm.endsWith('es') && expNorm.slice(0, -2) === heardNorm) ||
      (expNorm.endsWith('ed') && (expNorm.slice(0, -2) === heardNorm || expNorm.slice(0, -1) === heardNorm))
    ) {
      return { similarity: 0.62, isMorphDrop: true };
    }
    const maxLen = Math.max(expNorm.length, heardNorm.length);
    const charSim = maxLen > 0 ? 1 - levenshteinDist(expNorm, heardNorm) / maxLen : 0;
    const skelA = toPhoneticSkeleton(expNorm);
    const skelB = toPhoneticSkeleton(heardNorm);
    const maxSkel = Math.max(skelA.length, skelB.length);
    const skelSim = maxSkel > 0 ? 1 - levenshteinDist(skelA, skelB) / maxSkel : 0;
    // Preserve minimal-pair vowel contrasts (e.g. bed/bad, ship/sheep, cat/cut) so vowel-erasure skeletons don't mask vowel errors
    const vowA = extractEnglishVowelCore(expNorm);
    const vowB = extractEnglishVowelCore(heardNorm);
    if (
      expNorm.length >= 2 &&
      heardNorm.length >= 2 &&
      skelA &&
      skelA === skelB &&
      vowA !== vowB &&
      charSim < 0.72
    ) {
      return {
        similarity: Number((charSim * 0.55 + skelSim * 0.30).toFixed(3)),
        isMorphDrop: false,
      };
    }
    // Distinguish dental fricative "th" from alveolar "t" ("three" vs "tree", "bath" vs "bat")
    if (
      (/th/.test(expNorm) !== /th/.test(heardNorm)) &&
      (expNorm.replace(/th/g, 't') === heardNorm.replace(/th/g, 't') ||
        skelA.replace(/0/g, 't') === skelB.replace(/0/g, 't'))
    ) {
      return {
        similarity: Number(Math.min(0.64, charSim * 0.72).toFixed(3)),
        isMorphDrop: false,
      };
    }
    return { similarity: Math.max(charSim, skelSim * 0.9), isMorphDrop: false };
  }

  const maxLen = Math.max(expNorm.length, heardNorm.length);
  const charSim = maxLen > 0 ? 1 - levenshteinDist(expNorm, heardNorm) / maxLen : 0;
  return { similarity: charSim, isMorphDrop: false };
}

/**
 * Handy-style multi-language word + phonetic DP aligner for strict Read Aloud
 * and pronunciation verification.
 */
export function alignSpokenToTargetPassage(
  expectedText: string,
  heardText: string,
  targetLang: TargetLang = 'en'
): SpeechAlignmentResult {
  const expectedParsed = tokenizeForAlignment(expectedText, targetLang);
  const expectedToks = expectedParsed.tokens;
  const heardToks = tokenizeForAlignment(heardText, targetLang, expectedParsed.jaCompounds).tokens;
  const m = expectedToks.length;
  const n = heardToks.length;

  if (m === 0) {
    return {
      expectedText,
      heardText,
      targetLang,
      expectedCount: 0,
      heardCount: n,
      exactMatches: 0,
      closeMatches: 0,
      wordAccuracy: 1,
      phoneticAccuracy: 1,
      passed: true,
      matchedWords: [],
      missedWords: [],
      extraWords: heardToks.map((t) => t.display),
      mispronouncedPairs: [],
      tokens: [],
    };
  }

  // DP Needleman-Wunsch alignment maximizing similarity sum
  const GAP_DEL = -0.55;
  const GAP_INS = -0.45;
  const scores: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  const trace: Array<Array<'D' | 'U' | 'L'>> = Array.from({ length: m + 1 }, () =>
    new Array(n + 1).fill('U')
  );

  for (let i = 1; i <= m; i++) {
    scores[i][0] = i * GAP_DEL;
    trace[i][0] = 'U';
  }
  for (let j = 1; j <= n; j++) {
    scores[0][j] = j * GAP_INS;
    trace[0][j] = 'L';
  }

  const simCache: Array<Array<{ similarity: number; isMorphDrop: boolean }>> = Array.from(
    { length: m },
    (_, i) =>
      Array.from({ length: n }, (_, j) =>
        tokenSimilarity(expectedToks[i].norm, heardToks[j].norm, targetLang)
      )
  );

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const pair = simCache[i - 1][j - 1];
      const diagGain =
        pair.similarity >= 0.99
          ? 2.0
          : pair.similarity >= 0.72
            ? 1.15
            : pair.isMorphDrop
              ? 0.45
              : pair.similarity >= 0.5
                ? 0.1
                : -1.1;
      const diag = scores[i - 1][j - 1] + diagGain;
      const up = scores[i - 1][j] + GAP_DEL;
      const left = scores[i][j - 1] + GAP_INS;
      if (diag >= up && diag >= left) {
        scores[i][j] = diag;
        trace[i][j] = 'D';
      } else if (up >= left) {
        scores[i][j] = up;
        trace[i][j] = 'U';
      } else {
        scores[i][j] = left;
        trace[i][j] = 'L';
      }
    }
  }

  const tokensRev: AlignedWordToken[] = [];
  const extraWordsRev: string[] = [];
  let i = m;
  let j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && trace[i][j] === 'D') {
      const exp = expectedToks[i - 1];
      const hrd = heardToks[j - 1];
      const pair = simCache[i - 1][j - 1];
      let status: AlignedTokenStatus = 'wrong';
      if (pair.similarity >= 0.99) {
        status = 'match';
      } else if (!pair.isMorphDrop && pair.similarity >= 0.76) {
        status = 'close';
      }
      tokensRev.push({
        word: exp.display,
        normalized: exp.norm,
        status,
        heard: hrd.display,
        similarity: Number(pair.similarity.toFixed(2)),
      });
      i -= 1;
      j -= 1;
    } else if (i > 0 && (j === 0 || trace[i][j] === 'U')) {
      const exp = expectedToks[i - 1];
      tokensRev.push({
        word: exp.display,
        normalized: exp.norm,
        status: 'miss',
        similarity: 0,
      });
      i -= 1;
    } else {
      const hrd = heardToks[j - 1];
      extraWordsRev.push(hrd.display);
      j -= 1;
    }
  }

  const tokens = tokensRev.reverse();
  const extraWords = extraWordsRev.reverse();

  let exactMatches = 0;
  let closeMatches = 0;
  let weightedSum = 0;
  const matchedWords: string[] = [];
  const missedWords: string[] = [];
  const mispronouncedPairs: MispronouncedWordPair[] = [];

  for (const tok of tokens) {
    if (tok.status === 'match') {
      exactMatches += 1;
      weightedSum += 1.0;
      matchedWords.push(tok.word);
    } else if (tok.status === 'close') {
      closeMatches += 1;
      weightedSum += 0.65;
      mispronouncedPairs.push({
        expected: tok.word,
        heard: tok.heard || '',
        similarity: tok.similarity,
      });
    } else if (tok.status === 'wrong') {
      weightedSum += tok.similarity >= 0.58 ? 0.25 : 0;
      mispronouncedPairs.push({
        expected: tok.word,
        heard: tok.heard || '',
        similarity: tok.similarity,
      });
    } else {
      missedWords.push(tok.word);
    }
  }

  const excessiveExtras = Math.max(0, extraWords.length - Math.ceil(m * 0.25));
  const extraPenalty = excessiveExtras > 0 ? Math.min(0.25, (excessiveExtras / m) * 0.35) : 0;
  const wordAccuracy = Number((exactMatches / m).toFixed(3));
  const rawPhonetic = Math.max(0, weightedSum / m - extraPenalty);
  const phoneticAccuracy = Number(rawPhonetic.toFixed(3));
  const maxMissedAllowed = Math.floor(m * 0.22);
  const maxWrongAllowed = m <= 12 ? 0 : Math.floor(m * 0.06);
  const hasMorphDropFailure = tokens.some(
    (tok) =>
      tok.status === 'wrong' &&
      targetLang === 'en' &&
      tok.heard &&
      ((tok.normalized.endsWith('s') && tok.normalized.slice(0, -1) === tok.heard.toLowerCase()) ||
        (tok.normalized.endsWith('es') && tok.normalized.slice(0, -2) === tok.heard.toLowerCase()) ||
        (tok.normalized.endsWith('ed') &&
          (tok.normalized.slice(0, -2) === tok.heard.toLowerCase() ||
            tok.normalized.slice(0, -1) === tok.heard.toLowerCase())))
  );
  const passed =
    n > 0 &&
    wordAccuracy >= 0.78 &&
    phoneticAccuracy >= 0.8 &&
    missedWords.length <= maxMissedAllowed &&
    mispronouncedPairs.length <= maxWrongAllowed &&
    !hasMorphDropFailure;

  return {
    expectedText,
    heardText,
    targetLang,
    expectedCount: m,
    heardCount: n,
    exactMatches,
    closeMatches,
    wordAccuracy,
    phoneticAccuracy,
    passed,
    matchedWords,
    missedWords,
    extraWords,
    mispronouncedPairs,
    tokens,
  };
}

// ============================================================================
// WHITEBOARD TTS WAVEFORM FORCED-ALIGNMENT & BUFFER PROCESSING
// ============================================================================
/**
 * Speech alignment ("forced-alignment-lite") for the whiteboard tutor.
 *
 * Instead of assuming every word occupies a fixed share of the audio, we read the real
 * waveform of each TTS chunk, find where the tutor actually pauses (breaths, commas,
 * sentence ends), snap those pauses to the matching word boundaries in the script, and
 * spread the words only across the VOICED time between pauses. The result is a per-word
 * start/end timestamp that drives captions, board writing, zoom and phase switching.
 *
 * It also tightens delivery: leading/trailing silence is trimmed, over-long pauses are
 * capped, and a pitch-preserving WSOLA time-stretch brings the pace to a brisk,
 * natural conversational tempo.
 */

export interface WordTiming {
  start: number;
  end: number;
}

export interface SpeechAlignment {
  words: string[];
  times: WordTiming[];
  speechStart: number;
  speechEnd: number;
  duration: number;
}

export interface SpeechProcessOptions {
  /** Pitch-preserving tempo factor (1 = original). */
  tempo?: number;
  /** Longest pause kept inside speech, in seconds. */
  maxPauseSec?: number;
  /** Silence kept before the first and after the last voiced frame, in seconds. */
  edgePadSec?: number;
}

const HOP_SEC = 0.01;
const SENTENCE_END_RE = /[.!?。！？]["')\]]*$/;
const CLAUSE_END_RE = /[,;:、，；：]["')\]]*$/;

function toMono(buf: AudioBuffer): Float32Array {
  const len = buf.length;
  if (buf.numberOfChannels === 1) return buf.getChannelData(0).slice();
  const out = new Float32Array(len);
  for (let ch = 0; ch < buf.numberOfChannels; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) out[i] += d[i];
  }
  const inv = 1 / buf.numberOfChannels;
  for (let i = 0; i < len; i++) out[i] *= inv;
  return out;
}

function rmsEnvelope(x: Float32Array, sr: number): Float32Array {
  const hop = Math.max(1, Math.round(sr * HOP_SEC));
  const frames = Math.max(1, Math.floor(x.length / hop));
  const env = new Float32Array(frames);
  for (let f = 0; f < frames; f++) {
    let acc = 0;
    const base = f * hop;
    for (let i = 0; i < hop; i++) {
      const v = x[base + i] || 0;
      acc += v * v;
    }
    env[f] = Math.sqrt(acc / hop);
  }
  return env;
}

function percentile(arr: Float32Array, p: number): number {
  const sorted = Array.from(arr).sort((a, b) => a - b);
  if (!sorted.length) return 0;
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.floor(p * (sorted.length - 1))))];
}

/** Voiced mask with hangover so plosive closures (<= 120 ms) never count as pauses. */
function voicedMask(env: Float32Array): boolean[] {
  const p75 = percentile(env, 0.78);
  const floor = percentile(env, 0.08);
  const thr = Math.max(0.0020, floor * 2.2, p75 * 0.035);
  const mask = Array.from(env, (v) => v > thr);
  const HANG = 12;
  let i = 0;
  while (i < mask.length) {
    if (mask[i]) {
      i++;
      continue;
    }
    let j = i;
    while (j < mask.length && !mask[j]) j++;
    if (i > 0 && j < mask.length && j - i <= HANG) {
      for (let k = i; k < j; k++) mask[k] = true;
    }
    i = j;
  }
  return mask;
}

interface Region {
  a: number;
  b: number;
}

function speechBounds(mask: boolean[]): Region | null {
  const first = mask.indexOf(true);
  if (first < 0) return null;
  const last = mask.lastIndexOf(true);
  return { a: first, b: last + 1 };
}

/** Silent runs (in frames) strictly inside the speech region. */
function innerPauses(mask: boolean[], speech: Region, minFrames: number): Region[] {
  const out: Region[] = [];
  let i = speech.a;
  while (i < speech.b) {
    if (mask[i]) {
      i++;
      continue;
    }
    let j = i;
    while (j < speech.b && !mask[j]) j++;
    if (j - i >= minFrames) out.push({ a: i, b: j });
    i = j;
  }
  return out;
}

/**
 * Gently trim only dead edge padding while keeping 100% of spoken audio intact
 * (zero inner-pause slicing and zero synchronous CPU WSOLA stalls/tail-truncation).
 */
export function processSpeechBuffer(
  ctx: BaseAudioContext,
  buf: AudioBuffer,
  opts: SpeechProcessOptions = {}
): AudioBuffer {
  const leadPad = Math.max(0.06, opts.edgePadSec ?? 0.08);
  const tailPad = Math.max(0.09, (opts.edgePadSec ?? 0.08) + 0.04);
  try {
    const sr = buf.sampleRate;
    const x = toMono(buf);
    const hop = Math.max(1, Math.round(sr * HOP_SEC));
    const env = rmsEnvelope(x, sr);
    const floor = percentile(env, 0.08);
    const p75 = percentile(env, 0.78);
    const deadThr = Math.max(0.0012, floor * 1.8, p75 * 0.015);
    const rawMask = Array.from(env, (v) => v > deadThr);
    const speech = speechBounds(rawMask);
    if (!speech) return buf;
    const startSample = Math.max(0, speech.a * hop - Math.round(leadPad * sr));
    const endSample = Math.min(x.length, speech.b * hop + Math.round(tailPad * sr));
    const len = endSample - startSample;
    if (len <= sr * 0.15) return buf;
    if (startSample === 0 && endSample === x.length && buf.numberOfChannels === 1) {
      return buf;
    }
    const out = ctx.createBuffer(1, len, sr);
    const slice = x.subarray(startSample, endSample);
    const fade = Math.min(Math.round(sr * 0.006), Math.floor(len / 8));
    if (fade > 2) {
      for (let i = 0; i < fade; i++) {
        slice[i] *= i / fade;
        slice[len - 1 - i] *= i / fade;
      }
    }
    out.copyToChannel(new Float32Array(slice), 0);
    return out;
  } catch {
    return buf;
  }
}

function computeProsodicWordWeight(word: string): number {
  const w = String(word || '').trim();
  if (!w) return 0;
  const cleanLen = w.replace(/[^a-zA-Z0-9\u3040-\u30ff\u4e00-\u9faf\u0e00-\u0e7f]/g, '').length;
  const cjkChars = (w.match(/[\u3040-\u30ff\u4e00-\u9faf]/g) || []).length;
  const pauseW = /[,:;()]$/.test(w) ? 2.8 : /[.!?。！？]$/.test(w) ? 4.4 : 0;
  const syllabic = Math.max(cleanLen + cjkChars * 1.4, 1.5);
  return Math.max(2.6, Math.min(12.5, syllabic + 1.1)) + pauseW;
}

/** Spoken-length estimate in syllable units (vowel groups, digits/symbols read aloud, CJK morae). */
function articulationWeight(word: string): number {
  const raw = String(word || '').trim();
  const bare = raw.replace(/[,.;:!?()"'“”‘’。！？、，；：]+/g, '');
  if (!bare) return 0.6;
  let symSyl = 0;
  if (/=/.test(bare)) symSyl += 4.0;
  if (/\^2|\u00B2/.test(bare)) symSyl += 3.2;
  if (/\^3|\u00B3/.test(bare)) symSyl += 3.2;
  if (/[*×·]/.test(bare)) symSyl += 2.2;
  if (/\+/.test(bare)) symSyl += 2.6;
  if (/->|→/.test(bare)) symSyl += 2.8;
  if (/[π]/i.test(bare)) symSyl += 1.4;
  const cjk = (bare.match(/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\u0e00-\u0e7f]/g) || []).length;
  const digits = (bare.match(/\d/g) || []).length;
  const latin = bare.replace(/[^a-zA-Z\u00C0-\u024F]/g, '');
  const vowelGroups = (latin.match(/[aeiouyàáâãäåèéêëìíîïòóôõöùúûüāēīōū]+/gi) || []).length;
  const consonants = Math.max(0, latin.length - (latin.match(/[aeiouy]/gi) || []).length);
  const syl = (latin ? Math.max(1, vowelGroups) : 0) + consonants * 0.18 + digits * 2.1 + cjk * 1.0 + symSyl;
  const fallback = syl > 0 ? syl : Math.max(1, computeProsodicWordWeight(bare) / 3);
  return 0.45 + fallback;
}

/**
 * Align every word of `text` to real time in `buf` using the voiced/silent structure.
 */
export function alignWordsToSpeech(text: string, buf: AudioBuffer): SpeechAlignment {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean);
  const duration = buf.duration;
  const fallbackLinear = (s0: number, s1: number): SpeechAlignment => {
    const ws = words.map(articulationWeight);
    const W = Math.max(1e-6, ws.reduce((a, b) => a + b, 0));
    let acc = 0;
    const times = ws.map((wt) => {
      const start = s0 + (acc / W) * (s1 - s0);
      acc += wt;
      return { start, end: s0 + (acc / W) * (s1 - s0) };
    });
    return { words, times, speechStart: s0, speechEnd: s1, duration };
  };
  if (!words.length) return { words, times: [], speechStart: 0, speechEnd: duration, duration };

  let mask: boolean[];
  try {
    mask = voicedMask(rmsEnvelope(toMono(buf), buf.sampleRate));
  } catch {
    return fallbackLinear(0, duration);
  }
  const speech = speechBounds(mask);
  if (!speech) return fallbackLinear(0, duration);
  const s0 = speech.a * HOP_SEC;
  const s1 = speech.b * HOP_SEC;
  if (words.length === 1) return fallbackLinear(s0, s1);

  const pauses = innerPauses(mask, speech, 14);
  const weights = words.map(articulationWeight);
  const W = weights.reduce((a, b) => a + b, 0);
  const cumW: number[] = [0];
  weights.forEach((wt) => cumW.push(cumW[cumW.length - 1] + wt));

  // Voiced frames before each frame index (prefix sum) to work in "speaking time".
  const voicedPrefix = new Int32Array(mask.length + 1);
  for (let i = 0; i < mask.length; i++) {
    const inSpeech = i >= speech.a && i < speech.b;
    voicedPrefix[i + 1] = voicedPrefix[i] + (inSpeech && mask[i] ? 1 : 0);
  }
  const totalVoiced = Math.max(1, voicedPrefix[speech.b] - voicedPrefix[speech.a]);
  const voicedAt = (frame: number) => voicedPrefix[frame] - voicedPrefix[speech.a];

  // Boundaries after word b (b = 0..n-2).
  const B = words.length - 1;
  const boundaryExpected = Array.from({ length: B }, (_, b) => (cumW[b + 1] / W) * totalVoiced);
  const boundaryPunct = Array.from({ length: B }, (_, b) =>
    SENTENCE_END_RE.test(words[b]) ? 1 : CLAUSE_END_RE.test(words[b]) ? 0.65 : 0
  );
  const P = pauses.length;
  const POS_K = 7;
  const SKIP_COST = 0.35;
  const maxPauseFrames = Math.max(1, ...pauses.map((p) => p.b - p.a));
  const cost = (p: number, b: number) => {
    // Relative pause length: sentence ends carry the longest breaths, commas medium,
    // and a long silence is very unlikely to sit between two words of the same phrase.
    const durN = Math.min(1, (pauses[p].b - pauses[p].a) / maxPauseFrames);
    const pos = (Math.abs(boundaryExpected[b] - voicedAt(pauses[p].a)) / totalVoiced) * POS_K;
    if (boundaryPunct[b] >= 1) return pos - 1.2 * durN + 0.5 * (1 - durN);
    if (boundaryPunct[b] > 0) return pos - 0.6 * durN;
    return pos + 0.9 * durN * durN;
  };
  // f[p][b]: min cost for pauses p.. given next free boundary index >= b.
  const INF = 1e9;
  const f: Float64Array[] = Array.from({ length: P + 1 }, () => new Float64Array(B + 1).fill(INF));
  const choice: Int32Array[] = Array.from({ length: P + 1 }, () => new Int32Array(B + 1).fill(-2));
  for (let b = 0; b <= B; b++) f[P][b] = 0;
  for (let p = P - 1; p >= 0; p--) {
    // Skipping a long pause is expensive (it is almost surely a word boundary).
    const longPause = pauses[p].b - pauses[p].a >= 22;
    const skip = longPause ? SKIP_COST * 3 : SKIP_COST;
    let bestAssign = INF;
    let bestAssignB = -1;
    for (let b = B; b >= 0; b--) {
      if (b < B) {
        const c = cost(p, b) + f[p + 1][b + 1];
        if (c < bestAssign) {
          bestAssign = c;
          bestAssignB = b;
        }
      }
      const skipC = skip + f[p + 1][b];
      if (bestAssign <= skipC) {
        f[p][b] = bestAssign;
        choice[p][b] = bestAssignB;
      } else {
        f[p][b] = skipC;
        choice[p][b] = -1;
      }
    }
  }
  const assigned: Array<{ boundary: number; pause: Region }> = [];
  let nb = 0;
  for (let p = 0; p < P; p++) {
    const ch = choice[p][nb];
    if (ch >= 0) {
      assigned.push({ boundary: ch, pause: pauses[p] });
      nb = ch + 1;
    }
  }

  // Build word groups split by assigned pauses, then spread words over voiced frames.
  const times: WordTiming[] = new Array(words.length);
  let groupStartWord = 0;
  let regionStartFrame = speech.a;
  const flushGroup = (endWord: number, regionEndFrame: number) => {
    const gw = weights.slice(groupStartWord, endWord + 1);
    const gW = Math.max(1e-6, gw.reduce((a, b) => a + b, 0));
    const vA = voicedAt(regionStartFrame);
    const vB = Math.max(vA + 1, voicedAt(regionEndFrame));
    // Map a voiced-time target back to a real frame inside the region.
    const realFrameAtVoiced = (target: number): number => {
      let lo = regionStartFrame;
      let hi = regionEndFrame;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (voicedAt(mid) < target) lo = mid + 1;
        else hi = mid;
      }
      return lo;
    };
    let acc = 0;
    for (let i = groupStartWord; i <= endWord; i++) {
      const startV = vA + (acc / gW) * (vB - vA);
      acc += weights[i];
      const endV = vA + (acc / gW) * (vB - vA);
      const startF = i === groupStartWord ? regionStartFrame : realFrameAtVoiced(startV);
      const endF = i === endWord ? regionEndFrame : realFrameAtVoiced(endV);
      times[i] = { start: startF * HOP_SEC, end: Math.max(startF + 1, endF) * HOP_SEC };
    }
  };
  for (const { boundary, pause } of assigned) {
    flushGroup(boundary, pause.a);
    groupStartWord = boundary + 1;
    regionStartFrame = pause.b;
  }
  flushGroup(words.length - 1, speech.b);

  return {
    words,
    times,
    speechStart: s0,
    speechEnd: s1,
    duration,
    debug: {
      pauses: pauses.map((p) => [p.a * HOP_SEC, p.b * HOP_SEC]),
      assigned: assigned.map((a) => [a.boundary, words[a.boundary], a.pause.a * HOP_SEC]),
    },
  } as SpeechAlignment;
}

/** Locate the word being spoken at time `t` (seconds in the processed buffer). */
export function locateWordAt(al: SpeechAlignment, t: number): { wordIdx: number; partial: number } {
  const n = al.times.length;
  if (!n) return { wordIdx: 0, partial: 0 };
  if (t <= al.times[0].start) return { wordIdx: 0, partial: 0 };
  let lo = 0;
  let hi = n - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (al.times[mid].start <= t) lo = mid;
    else hi = mid - 1;
  }
  const wt = al.times[lo];
  const partial = t >= wt.end ? 1 : Math.max(0, Math.min(1, (t - wt.start) / Math.max(0.01, wt.end - wt.start)));
  return { wordIdx: lo, partial };
}
