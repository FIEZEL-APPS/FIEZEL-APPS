/**
 * features/voice-studio/src/lib/mandarinPhonetics.ts
 *
 * FIEZEL Master Mandarin Phonetics, Pinyin Transliteration & Ruby Annotation Engine.
 * Provides 100% clean Pinyin with tone marks and Ruby tags for AI Voice Studio.
 * Guarantees ZERO leftover Hanzi characters in pronunciation and translation displays.
 */

import lexiconData from './mandarinLexicon.json' with { type: 'json' };

const WORDS: Record<string, string> = lexiconData.words || {};
const CHARS: Record<string, string> = lexiconData.chars || {};

const HANZI_REGEX = /[\u3400-\u4DBF\u4E00-\u9FFF]/;
const ALL_HANZI_REGEX = /[\u3400-\u4DBF\u4E00-\u9FFF]/g;

// Sort words by length descending for greedy longest-word matching
const SORTED_WORD_KEYS = Object.keys(WORDS).sort((a, b) => b.length - a.length || a.localeCompare(b));

const PUNCT_MAP: Record<string, string> = {
  '。': '.',
  '，': ',',
  '、': ',',
  '！': '!',
  '？': '?',
  '；': ';',
  '：': ':',
  '（': '(',
  '）': ')',
  '【': '[',
  '】': ']',
  '“': '"',
  '”': '"',
  '‘': "'",
  '’': "'",
  '—': '-',
  '…': '...',
};

function esc(str: string): string {
  return String(str == null ? '' : str).replace(/[&<>"']/g, (c) => {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] || c;
  });
}

export function isHanziChar(ch: string): boolean {
  return HANZI_REGEX.test(ch);
}

export function containsHanzi(text: string): boolean {
  return HANZI_REGEX.test(text);
}

/**
 * Strips all Hanzi/Kanji characters from a text string.
 */
export function stripHanzi(text: string): string {
  return String(text || '').replace(ALL_HANZI_REGEX, '').replace(/\s{2,}/g, ' ').trim();
}

/**
 * Lookup Pinyin for a single Hanzi character.
 */
export function getPinyinForChar(ch: string): string {
  if (CHARS[ch]) return CHARS[ch];
  return '';
}

/**
 * Lookup Pinyin for a multi-character word.
 */
export function getPinyinForWord(word: string): string {
  if (WORDS[word]) return WORDS[word];
  return '';
}

export interface MandarinToken {
  text: string;
  isHanzi: boolean;
  pinyin?: string;
  isPunct?: boolean;
  isSpace?: boolean;
}

/**
 * Tokenizes Mandarin text using greedy longest-word match.
 */
export function tokenizeMandarin(rawText: string): MandarinToken[] {
  const clean = String(rawText || '').trim();
  if (!clean) return [];

  const tokens: MandarinToken[] = [];
  let i = 0;
  const len = clean.length;

  while (i < len) {
    const ch = clean[i];

    // 1. Whitespace
    if (/\s/.test(ch)) {
      tokens.push({ text: ' ', isHanzi: false, isSpace: true, pinyin: ' ' });
      i++;
      continue;
    }

    // 2. Chinese Punctuation
    if (PUNCT_MAP[ch] !== undefined) {
      tokens.push({ text: ch, isHanzi: false, isPunct: true, pinyin: PUNCT_MAP[ch] });
      i++;
      continue;
    }

    // 3. Latin / Alphanumeric / Pinyin accented words (keep intact, never split tone-marked vowels)
    if (/[A-Za-z0-9āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜüĀÁǍÀĒÉĚÈĪÍǏÌŌÓǑÒŪÚǓÙǕǗǙǛÜ']/u.test(ch)) {
      let alpha = '';
      while (i < len && /[A-Za-z0-9āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜüĀÁǍÀĒÉĚÈĪÍǏÌŌÓǑÒŪÚǓÙǕǗǙǛÜ']/u.test(clean[i])) {
        alpha += clean[i];
        i++;
      }
      tokens.push({ text: alpha, isHanzi: false, pinyin: alpha });
      continue;
    }

    // 4. Non-Hanzi symbol
    if (!HANZI_REGEX.test(ch)) {
      tokens.push({ text: ch, isHanzi: false, pinyin: ch });
      i++;
      continue;
    }

    // 5. Greedy match multi-character words (up to 6 chars)
    let matchedWord = false;
    const maxSubLen = Math.min(6, len - i);
    for (let wLen = maxSubLen; wLen >= 2; wLen--) {
      const sub = clean.slice(i, i + wLen);
      const py = WORDS[sub];
      if (py) {
        tokens.push({
          text: sub,
          isHanzi: true,
          pinyin: py,
        });
        i += wLen;
        matchedWord = true;
        break;
      }
    }

    if (matchedWord) continue;

    // 6. Single Hanzi character
    const singlePy = CHARS[ch] || '';
    tokens.push({
      text: ch,
      isHanzi: true,
      pinyin: singlePy,
    });
    i++;
  }

  return tokens;
}

const VOWEL_INITIAL_SYL_RE = /^[aāáǎàeēéěèoōóǒò]/i;

function formatWordSyllablesForLine(wordText: string, rawPinyin: string): string {
  const syls = rawPinyin.split(/\s+/).filter(Boolean);
  if (syls.length <= 1) return rawPinyin;
  if (wordText === '小糯米') return 'Xiǎo Nuòmǐ';

  let out = syls[0];
  for (let i = 1; i < syls.length; i++) {
    const s = syls[i];
    if ((s === 'ér' || s === 'er' || s === 'r') && wordText[i] === '儿') {
      out += 'r';
    } else if (VOWEL_INITIAL_SYL_RE.test(s)) {
      out += "'" + s;
    } else {
      out += s;
    }
  }
  return out;
}

/**
 * Converts Chinese Hanzi text to 100% clean, tone-marked, readable Pinyin:
 * - Words are properly spaced: "Nǐ hǎo! Wǒ shì Xiǎo Nuòmǐ."
 * - Capitalizes start of sentences (including tone-marked initial vowels).
 * - Guarantees ZERO leftover Hanzi characters in the returned string!
 */
export function toPhoneticPinyin(rawText: string): string {
  const clean = String(rawText || '').trim();
  if (!clean) return '';

  const tokens = tokenizeMandarin(clean);
  const parts: string[] = [];

  for (const tk of tokens) {
    if (tk.isSpace) continue;
    if (tk.pinyin) {
      if (tk.isHanzi && tk.text.length > 1) {
        parts.push(formatWordSyllablesForLine(tk.text, tk.pinyin));
      } else {
        parts.push(tk.pinyin);
      }
    } else if (!tk.isHanzi) {
      parts.push(tk.text);
    }
  }

  let pinyin = parts
    .join(' ')
    .replace(/\s+(?:ér|r)\b/g, 'r')
    .replace(/-\s+-/g, '—')
    .replace(/\s+([.,!?:;~")\]}])/g, '$1')
    .replace(/([(\[{"])\s+/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim();

  // Capitalize after sentence-ending punctuation (including accented Pinyin vowels)
  pinyin = pinyin.replace(/(^|[.!?]\s+)([a-z\u00C0-\u024F])/g, (_m, p1, p2) => p1 + p2.toUpperCase());

  // Strictly strip any rogue Hanzi that might have slipped through
  return pinyin.replace(ALL_HANZI_REGEX, '').trim();
}

/**
 * Render HTML with <ruby class="zh-ruby">字<rt class="zh-rt">zì</rt></ruby> tags.
 */
export function renderMandarinRubyHtml(rawText: string, opts?: { hideRuby?: boolean }): string {
  const clean = String(rawText || '').trim();
  if (!clean) return '';
  if (opts?.hideRuby) {
    return esc(clean);
  }

  const tokens = tokenizeMandarin(clean);
  let html = '';

  for (const tk of tokens) {
    if (!tk.isHanzi) {
      html += esc(tk.text);
      continue;
    }

    const sub = tk.text;
    const py = tk.pinyin || '';
    const pyParts = py.split(/\s+/).filter(Boolean);

    if (sub.length > 1 && pyParts.length === sub.length) {
      for (let k = 0; k < sub.length; k++) {
        html += `<ruby class="zh-ruby">${esc(sub[k])}<rt class="zh-rt">${esc(pyParts[k])}</rt></ruby>`;
      }
    } else if (sub.length === 1 && py) {
      html += `<ruby class="zh-ruby">${esc(sub)}<rt class="zh-rt">${esc(py)}</rt></ruby>`;
    } else {
      // Per-character fallback
      for (let m = 0; m < sub.length; m++) {
        const c = sub[m];
        const cPy = CHARS[c] || '';
        if (cPy) {
          html += `<ruby class="zh-ruby">${esc(c)}<rt class="zh-rt">${esc(cPy)}</rt></ruby>`;
        } else {
          html += esc(c);
        }
      }
    }
  }

  return html;
}
