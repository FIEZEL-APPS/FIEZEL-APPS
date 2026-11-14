/**
 * features/voice-studio/src/lib/mandarinPhonetics.ts
 *
 * FIEZEL Master Mandarin Phonetics, Pinyin Transliteration & Ruby Annotation Engine.
 * Provides 100% clean Pinyin with tone marks and Ruby tags for AI Voice Studio.
 * Guarantees ZERO leftover Hanzi characters in pronunciation and translation displays.
 */

import lexiconData from './mandarinLexicon.json' with { type: 'json' };

const EXTRA_MANDARIN_WORDS: Record<string, string> = {
  '语序': 'yǔ xù',
  '例子': 'lì zi',
  '动词': 'dòng cí',
  '前面': 'qián miàn',
  '后面': 'hòu miàn',
  '试试': 'shì shi',
  '当场': 'dāng chǎng',
  '声调': 'shēng diào',
  '课文腔': 'kè wén qiāng',
  '死板': 'sǐ bǎn',
  '实话': 'shí huà',
  '头疼': 'tóu téng',
  '时间': 'shí jiān',
  '位置': 'wèi zhì',
  '量词': 'liàng cí',
  '区别': 'qū bié',
  '搞混': 'gǎo hùn',
  '用法': 'yòng fǎ',
  '一下': 'yí xià',
  '一会儿': 'yí huìr',
  '练习': 'liàn xí',
  '汉语': 'Hàn yǔ',
  '中文': 'Zhōng wén',
  '图书馆': 'tú shū guǎn',
  '语法': 'yǔ fǎ',
  '家里': 'jiā lǐ',
  '地道': 'dì dào',
  '自然': 'zì rán',
  '小糯米': 'Xiǎo Nuòmǐ',
  '冰美式': 'bīng měi shì',
  '咖啡': 'kā fēi',
  '怎么': 'zěn me',
  '为什么': 'wèi shén me',
  '容易': 'róng yì',
  '觉得': 'jué de',
  '哪里': 'nǎ lǐ',
  '块儿': 'kuàir',
  '平时': 'píng shí',
  '经常': 'jīng cháng',
  '不好意思': 'bù hǎoyìsi',
};

const EXTRA_MANDARIN_CHARS: Record<string, string> = {
  '怼': 'duì',
  '呃': 'è',
  '嗯': 'ǹg',
  '呗': 'bei',
  '嘛': 'ma',
  '啥': 'shá',
  '咋': 'zǎ',
  '咱': 'zán',
  '喂': 'wèi',
  '哟': 'yō',
  '啦': 'la',
  '嘿': 'hēi',
  '哼': 'hēng',
  '哈': 'hā',
  '呀': 'ya',
  '哦': 'ò',
  '喽': 'lou',
  '咯': 'lo',
  '呐': 'na',
  '哩': 'li',
  '飘': 'piāo',
  '聊': 'liáo',
  '棒': 'bàng',
  '糟': 'zāo',
  '晕': 'yūn',
  '猜': 'cāi',
  '忘': 'wàng',
  '懂': 'dǒng',
  '改': 'gǎi',
  '查': 'chá',
  '找': 'zhǎo',
  '借': 'jiè',
  '还': 'hái',
  '买': 'mǎi',
  '卖': 'mài',
  '选': 'xuǎn',
  '试': 'shì',
  '穿': 'chuān',
  '累': 'lèi',
  '饿': 'è',
  '渴': 'kě',
  '甜': 'tián',
  '辣': 'là',
  '吵': 'chǎo',
  '帮': 'bāng',
  '错': 'cuò',
  '混': 'hùn',
  '搞': 'gǎo',
  '练': 'liàn',
  '读': 'dú',
  '写': 'xiě',
  '听': 'tīng',
  '说': 'shuō',
  '问': 'wèn',
  '答': 'dá',
  '让': 'ràng',
  '被': 'bèi',
  '把': 'bǎ',
  '跟': 'gēn',
  '给': 'gěi',
  '比': 'bǐ',
  '刚': 'gāng',
  '才': 'cái',
  '就': 'jiù',
  '却': 'què',
  '并': 'bìng',
};

const WORDS: Record<string, string> = { ...(lexiconData.words || {}), ...EXTRA_MANDARIN_WORDS };
const CHARS: Record<string, string> = { ...EXTRA_MANDARIN_CHARS, ...(lexiconData.chars || {}) };

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
  '「': '«',
  '」': '»',
  '『': '«',
  '』': '»',
  '“': '«',
  '”': '»',
  '‘': "'",
  '’': "'",
  '\u2014': ',',
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
    // Erhua suffix ('儿') merges directly onto the preceding Hanzi word without regex \b bugs on toned vowels (e.g. 'róngyì')
    if (tk.text === '儿' && parts.length > 0 && /[a-z\u00C0-\u024F]$/i.test(parts[parts.length - 1])) {
      parts[parts.length - 1] = `${parts[parts.length - 1]}r`;
      continue;
    }
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
    .replace(/,\s*,/g, ',')
    .replace(/\s+([.,!?:;~)\]}»])/g, '$1')
    .replace(/([(\[{«])\s+/g, '$1')
    .replace(/([^\s(\[{«])([«])/g, '$1 $2')
    .replace(/([»])([^\s.,!?:;~)\]}»])/g, '$1 $2')
    .replace(/[«»]/g, '"')
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
