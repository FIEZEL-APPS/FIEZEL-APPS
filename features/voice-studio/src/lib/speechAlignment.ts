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
