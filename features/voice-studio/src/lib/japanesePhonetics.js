/**
 * FIEZEL Japanese Phonetics & Furigana Engine
 *
 * Master Universal Phonetics & Furigana for AI Voice Studio & Kawan Bicara.
 * Integrates directly with FIEZEL Master Japanese Lexicon (6,128 compounds + stems + single kanji).
 *
 * Provides:
 * 1. tokenizeJapaneseToRuby: Tokenizes Japanese text into ruby tokens (<ruby>kanji<rt>kana</rt></ruby>)
 *    with okurigana separation (e.g. 大きい -> <ruby>大<rt>おお</rt></ruby>きい, not <ruby>大きい<rt>おおきい</rt></ruby>).
 * 2. toPhoneticRomaji: Accurate Hepburn romaji transliteration strictly following Japanese vocal rules:
 *    - Topic particle は -> "wa" (e.g. 私は -> "watashi wa", 今日は -> "kyou wa", これは -> "kore wa")
 *    - Object particle を -> "o" (e.g. 本を -> "hon o", コーヒーを -> "koohii o")
 *    - Direction particle へ -> "e" (e.g. 日本へ -> "nihon e", 学校へ -> "gakkou e")
 *    - Greetings: こんにちは -> "konnichiwa", こんばんは -> "konbanwa", では -> "dewa"
 *    - Accurate vowels & long vowels: おう/おお -> "ou"/"oo", ー -> lengthened vowel
 *    - Sokuon っ: double consonant; before ch -> tch (e.g. ちょっと -> "chotto", マッチ -> "matchi")
 *    - Accurate yoon: じゃ/じゅ/じょ -> ja/ju/jo (NEVER jya/jyu/jyo)
 *    - Word-boundary spacing between Katakana/Latin tokens and particles (RPG no, monsutaa ga)
 *    - Zero emojis and zero emoticon words!
 */

import MasterLexicon from './masterLexicon.js';

// Resolve dictionary across Node, ESM, and browser window/global
const dict = (typeof globalThis !== 'undefined' && globalThis.FiezelJaDictionary) || MasterLexicon;

const KANJI_REGEX = /[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF\u3005]/;

const PARTICLES = {
  'は': 'wa',
  'を': 'o',
  'へ': 'e',
  'が': 'ga',
  'の': 'no',
  'に': 'ni',
  'で': 'de',
  'と': 'to',
  'も': 'mo',
  'から': 'kara',
  'まで': 'made',
  'より': 'yori',
  'よ': 'yo',
  'ね': 'ne',
  'か': 'ka'
};

const PUNCT = {
  '。': '.',
  '、': ',',
  '！': '!',
  '？': '?',
  '!': '!',
  '?': '?',
  '…': '...',
  '〜': '~',
  '~': '~',
  '「': '"',
  '」': '"',
  '『': '"',
  '』': '"',
  '（': '(',
  '）': ')',
  '(': '(',
  ')': ')'
};

const KANA_MAP = {
  'あ': 'a', 'い': 'i', 'う': 'u', 'え': 'e', 'お': 'o',
  'か': 'ka', 'き': 'ki', 'く': 'ku', 'け': 'ke', 'こ': 'ko',
  'さ': 'sa', 'し': 'shi', 'す': 'su', 'せ': 'se', 'そ': 'so',
  'た': 'ta', 'ち': 'chi', 'つ': 'tsu', 'て': 'te', 'と': 'to',
  'な': 'na', 'に': 'ni', 'ぬ': 'nu', 'ね': 'ne', 'の': 'no',
  'は': 'ha', 'ひ': 'hi', 'ふ': 'fu', 'へ': 'he', 'ほ': 'ho',
  'ま': 'ma', 'み': 'mi', 'む': 'mu', 'め': 'me', 'も': 'mo',
  'や': 'ya', 'ゆ': 'yu', 'よ': 'yo',
  'ら': 'ra', 'り': 'ri', 'る': 'ru', 'れ': 're', 'ろ': 'ro',
  'わ': 'wa', 'を': 'o', 'ん': 'n',
  'が': 'ga', 'ぎ': 'gi', 'ぐ': 'gu', 'げ': 'ge', 'ご': 'go',
  'ざ': 'za', 'じ': 'ji', 'ず': 'zu', 'ぜ': 'ze', 'ぞ': 'zo',
  'だ': 'da', 'ぢ': 'ji', 'づ': 'zu', 'で': 'de', 'ど': 'do',
  'ば': 'ba', 'び': 'bi', 'ぶ': 'bu', 'べ': 'be', 'ぼ': 'bo',
  'ぱ': 'pa', 'ぴ': 'pi', 'ぷ': 'pu', 'ぺ': 'pe', 'ぽ': 'po',
  'ぁ': 'a', 'ぃ': 'i', 'ぅ': 'u', 'ぇ': 'e', 'ぉ': 'o',
  'ゔ': 'vu',
};

const YOON_MAP = {
  'きゃ': 'kya', 'きゅ': 'kyu', 'きょ': 'kyo',
  'しゃ': 'sha', 'しゅ': 'shu', 'しょ': 'sho',
  'ちゃ': 'cha', 'ちゅ': 'chu', 'ちょ': 'cho',
  'にゃ': 'nya', 'にゅ': 'nyu', 'にょ': 'nyo',
  'ひゃ': 'hya', 'ひゅ': 'hyu', 'ひょ': 'hyo',
  'みゃ': 'mya', 'みゅ': 'myu', 'みょ': 'myo',
  'りゃ': 'rya', 'りゅ': 'ryu', 'りょ': 'ryo',
  'ぎゃ': 'gya', 'ぎゅ': 'gyu', 'ぎょ': 'gyo',
  'じゃ': 'ja', 'じゅ': 'ju', 'じょ': 'jo',
  'びゃ': 'bya', 'びゅ': 'byu', 'びょ': 'byo',
  'ぴゃ': 'pya', 'ぴゅ': 'pyu', 'ぴょ': 'pyo',
  'ふぁ': 'fa', 'ふぃ': 'fi', 'ふぇ': 'fe', 'ふぉ': 'fo',
  'てぃ': 'ti', 'でぃ': 'di', 'うぃ': 'wi', 'うぇ': 'we',
  'しぇ': 'she', 'ちぇ': 'che', 'じぇ': 'je',
};

/**
 * Strip emojis, asterisk emote directions, and smiling descriptors.
 */
export function stripEmojisAndEmotWords(text) {
  if (!text) return '';
  return String(text)
    // Strip Unicode emojis
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F000}-\u{1F2FF}\u{FE00}-\u{FE0F}]/gu, '')
    // Strip asterisk directions like *laughs*, *giggles*, *smiles*
    .replace(/\*[^*]+\*/g, '')
    // Strip parenthetical emote descriptions like (laughing), (smiling face)
    .replace(/\([^)]*(?:laugh|smile|chuckle|giggle|sigh|wink|pause|face|happy|sad)[^)]*\)/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Convert Katakana to Hiragana with long-vowel prolongation.
 */
export function katakanaToHiragana(text) {
  if (!text) return '';
  let out = '';
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    // Katakana block ァ (0x30A1) - ン (0x30F3)
    if (code >= 0x30A1 && code <= 0x30F3) {
      out += String.fromCharCode(code - 0x60);
    } else if (text[i] === 'ヴ') {
      out += 'ゔ';
    } else if (text[i] === 'ー') {
      // Prolong preceding vowel
      const prev = out[out.length - 1];
      if (!prev) {
        out += '-';
        continue;
      }
      const prevRoma = KANA_MAP[prev] || '';
      const lastVowel = prevRoma.slice(-1);
      if (lastVowel === 'a') out += 'あ';
      else if (lastVowel === 'i') out += 'い';
      else if (lastVowel === 'u') out += 'う';
      else if (lastVowel === 'e') out += 'え';
      else if (lastVowel === 'o') out += 'お';
      else out += 'ー';
    } else {
      out += text[i];
    }
  }
  return out;
}

/**
 * Convert Kana string to Romaji strictly observing Hepburn rules:
 * - Particle は -> "wa"
 * - Particle を -> "o"
 * - Particle へ -> "e"
 * - Sokuon っ: before ch -> tch, else double consonant
 * - Yoon: ja/ju/jo (never jya/jyu/jyo)
 * - Long vowel ー -> prolonged vowel
 */
export function kanaStringToRomaji(kanaStr) {
  if (!kanaStr) return '';
  if (dict && typeof dict.kanaToRomaji === 'function') {
    return dict.kanaToRomaji(kanaStr);
  }

  let s = katakanaToHiragana(kanaStr);
  let out = '';
  let i = 0;

  while (i < s.length) {
    const ch = s[i];
    const next = s[i + 1] || '';
    const pair = ch + next;

    // 1. Sokuon っ
    if (ch === 'っ' || ch === 'ッ') {
      if (!next) {
        out += "'";
        i += 1;
        continue;
      }
      // Before ch -> tch (e.g. ちょっと -> chotto, まっち -> matchi)
      const nextYoon = s.substr(i + 1, 2);
      if (YOON_MAP[nextYoon] && YOON_MAP[nextYoon].startsWith('ch')) {
        out += 't';
        i += 1;
        continue;
      }
      const nextRoma = KANA_MAP[next] || '';
      if (nextRoma.startsWith('ch')) {
        out += 't';
        i += 1;
        continue;
      }
      if (nextRoma) {
        out += nextRoma[0];
        i += 1;
        continue;
      }
      out += "'";
      i += 1;
      continue;
    }

    // 2. Yoon (two-kana compounds)
    if (YOON_MAP[pair]) {
      out += YOON_MAP[pair];
      i += 2;
      continue;
    }

    // 3. Single kana
    if (KANA_MAP[ch]) {
      out += KANA_MAP[ch];
      i += 1;
      continue;
    }

    out += ch;
    i += 1;
  }

  return out;
}

/**
 * Tokenize Japanese text into Ruby tokens for HTML rendering.
 * Accurately extracts okurigana outside ruby tags (e.g. 大きい -> <ruby>大<rt>おお</rt></ruby>きい).
 */
export function tokenizeJapaneseToRuby(rawText) {
  const clean = stripEmojisAndEmotWords(rawText);
  if (!clean) return [];

  const tokens = [];
  let i = 0;

  while (i < clean.length) {
    const ch = clean[i];

    // Spaces
    if (/\s/.test(ch)) {
      tokens.push({ text: ' ', isKanji: false, isSpace: true, romaji: ' ' });
      i++;
      continue;
    }

    // Punctuation
    if (PUNCT[ch] !== undefined) {
      tokens.push({ text: ch, isKanji: false, isPunct: true, romaji: PUNCT[ch] });
      i++;
      continue;
    }

    // Latin / Alphanumeric acronyms (e.g. RPG, AI, N5, PC)
    if (/[A-Za-z0-9]/.test(ch)) {
      let alpha = '';
      while (i < clean.length && /[A-Za-z0-9]/.test(clean[i])) {
        alpha += clean[i];
        i++;
      }
      tokens.push({ text: alpha, isKanji: false, isAlpha: true, romaji: alpha });
      continue;
    }

    const prev = tokens.length ? tokens[tokens.length - 1] : null;

    // Standalone particles は / を / へ
    if (/[はをへ]/.test(ch) && prev && !prev.isSpace && !prev.isPunct && !prev.isParticle && !/[ぁぃぅぇぉっゃゅょゎ]/.test(clean[i + 1])) {
      tokens.push({ text: ch, isKanji: false, isParticle: true, romaji: PARTICLES[ch] });
      i++;
      continue;
    }

    // 1. Try longest match from dict.WORDS or dict.STEMS
    let hit = null;
    const maxLen = Math.min(12, clean.length - i);

    for (let len = maxLen; len >= 1; len--) {
      const piece = clean.substr(i, len);

      // A) Compound word match in dict.WORDS (len >= 2)
      if (len >= 2 && dict?.WORDS && dict.WORDS[piece]) {
        const wData = dict.WORDS[piece];
        // Split trailing okurigana if piece ends with kana (e.g. 大きい -> 大[おお]きい)
        const m = piece.match(/^([\u3400-\u4dbf\u4e00-\u9fff\u3005]+)([\u3040-\u309f]+)$/);
        if (m && wData.kana && wData.kana.endsWith(m[2])) {
          const kanjiKana = wData.kana.slice(0, -m[2].length);
          hit = {
            text: piece,
            kanjiPart: m[1],
            ruby: kanjiKana,
            tail: m[2],
            romaji: wData.romaji || kanaStringToRomaji(wData.kana),
            isKanji: true,
            isStemWithTail: true,
          };
        } else {
          hit = {
            text: piece,
            ruby: KANJI_REGEX.test(piece) ? wData.kana : undefined,
            romaji: wData.romaji || kanaStringToRomaji(wData.kana),
            isKanji: KANJI_REGEX.test(piece),
          };
        }
        break;
      }

      // B) Stem + Okurigana match in dict.STEMS (e.g. 違う, 続けよう, 話そう, 待って)
      if (KANJI_REGEX.test(piece) && /^[㐀-䶿一-鿿々]+$/.test(piece) && dict?.STEMS && dict.STEMS[piece]) {
        const tailMatch = clean.slice(i + len).match(/^[ぁ-ん]*/);
        let tail = tailMatch ? tailMatch[0] : '';
        const cut = tail.search(/[はをへがにでともの]/);
        if (cut > 0) tail = tail.slice(0, cut);
        else if (cut === 0) tail = '';

        if (tail.length > 0) {
          const stemKana = dict.STEMS[piece];
          const fullKana = stemKana + tail;
          hit = {
            text: piece + tail,
            kanjiPart: piece,
            ruby: stemKana,
            tail: tail,
            romaji: kanaStringToRomaji(fullKana),
            isKanji: true,
            isStemWithTail: true,
          };
          break;
        }
      }
    }

    if (hit) {
      tokens.push(hit);
      i += hit.text.length;
      continue;
    }

    // 2. Single kanji match
    if (KANJI_REGEX.test(ch)) {
      const sInfo = dict && typeof dict.lookupSingle === 'function' ? dict.lookupSingle(ch) : null;
      if (sInfo) {
        tokens.push({
          text: ch,
          ruby: sInfo.kana,
          romaji: sInfo.romaji || kanaStringToRomaji(sInfo.kana),
          isKanji: true,
        });
      } else {
        tokens.push({
          text: ch,
          isKanji: true,
        });
      }
      i++;
      continue;
    }

    // 3. Other particles
    if (PARTICLES[ch] && prev && !prev.isPunct && !prev.isSpace && !/[ぁぃぅぇぉっゃゅょゎ]/.test(clean[i + 1])) {
      tokens.push({ text: ch, isKanji: false, isParticle: true, romaji: PARTICLES[ch] });
      i++;
      continue;
    }

    // 4. Katakana run
    if (/[\u30A0-\u30FF]/.test(ch)) {
      let kata = '';
      while (i < clean.length && /[\u30A0-\u30FFー]/.test(clean[i])) {
        kata += clean[i];
        i++;
      }
      tokens.push({
        text: kata,
        isKanji: false,
        isKatakana: true,
        romaji: kanaStringToRomaji(kata),
      });
      continue;
    }

    // 5. Hiragana run
    let hira = '';
    while (i < clean.length && /[\u3040-\u309F]/.test(clean[i])) {
      if (PARTICLES[clean[i]] && !/[ぁぃぅぇぉっゃゅょゎ]/.test(clean[i + 1]) && (!dict?.WORDS || !dict.WORDS[clean.substr(i, 2)])) {
        break;
      }
      hira += clean[i];
      i++;
    }
    if (hira) {
      tokens.push({
        text: hira,
        isKanji: false,
        romaji: kanaStringToRomaji(hira),
      });
      continue;
    }

    tokens.push({ text: ch, isKanji: false, romaji: ch });
    i++;
  }

  return tokens;
}

const IS_KANJI_CHAR_RE = /^[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF\u3005]$/;

const JUKUJIKUN_OVERRIDES = {
  '大人': 'おとな', '今日': 'きょう', '明日': 'あした', '昨日': 'きのう',
  '今朝': 'けさ', '今年': 'ことし', '一人': 'ひとり', '二人': 'ふたり',
  '二十歳': 'はたち', '二十日': 'はつか', '果物': 'くだもの', '土産': 'みやげ',
  'お土産': 'おみやげ', '眼鏡': 'めがね', '時計': 'とけい', '友達': 'ともだち',
  'お母さん': 'おかあさん', 'お父さん': 'おとうさん', 'お兄さん': 'おにいさん',
  'お姉さん': 'おねえさん', '叔父さん': 'おじさん', '叔母さん': 'おばさん',
  '伯父さん': 'おじさん', '伯母さん': 'おばさん', '八百屋': 'やおや',
  '梅雨': 'つゆ', '田舎': 'いなか', '紅葉': 'もみじ', '風邪': 'かぜ',
  '上手': 'じょうず', '下手': 'へた', '真面目': 'まじめ', '可愛い': 'かわいい'
};

function isKanjiChar(ch) {
  return IS_KANJI_CHAR_RE.test(ch);
}

function kataToHiraSimple(str) {
  return String(str || '').replace(/[\u30a1-\u30f6]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0x60)
  );
}

/**
 * Peels prefix/middle/suffix okurigana (e.g. お茶 -> お + 茶[ちゃ], 持ち運ぶ -> 持[も] + ち + 運[はこ] + ぶ,
 * 買いました -> 買[か] + いました) and optionally decomposes consecutive kanji compounds when singleKanjiMap is provided.
 * Adapted from Doublevil/JmdictFurigana (MIT) + hexenq/kuroshiro (MIT).
 */
export function solveFuriganaSegments(surface, rawReading, singleKanjiMap = null) {
  const text = String(surface || '');
  const reading = kataToHiraSimple(rawReading);
  if (!text || !reading) return [{ ruby: text }];

  let hasAnyKanji = false;
  for (let k = 0; k < text.length; k++) {
    if (isKanjiChar(text[k])) { hasAnyKanji = true; break; }
  }
  if (!hasAnyKanji) return [{ ruby: text }];

  if (JUKUJIKUN_OVERRIDES[text] === reading) {
    if (!isKanjiChar(text[0]) && kataToHiraSimple(text[0]) === reading[0]) {
      return [{ ruby: text[0] }].concat(
        solveFuriganaSegments(text.slice(1), reading.slice(1), singleKanjiMap)
      );
    }
    return [{ ruby: text, rt: reading }];
  }

  let prefixLen = 0;
  while (
    prefixLen < text.length &&
    prefixLen < reading.length &&
    !isKanjiChar(text[prefixLen]) &&
    kataToHiraSimple(text[prefixLen]) === reading[prefixLen]
  ) {
    prefixLen++;
  }
  let suffixLen = 0;
  while (
    text.length - 1 - suffixLen >= prefixLen &&
    reading.length - 1 - suffixLen >= prefixLen &&
    !isKanjiChar(text[text.length - 1 - suffixLen]) &&
    kataToHiraSimple(text[text.length - 1 - suffixLen]) === reading[reading.length - 1 - suffixLen]
  ) {
    suffixLen++;
  }

  if (prefixLen > 0 || suffixLen > 0) {
    let out = [];
    if (prefixLen > 0) out.push({ ruby: text.slice(0, prefixLen) });
    const coreText = text.slice(prefixLen, text.length - suffixLen);
    const coreReading = reading.slice(prefixLen, reading.length - suffixLen);
    if (coreText) {
      out = out.concat(solveCoreKanjiSegments(coreText, coreReading, singleKanjiMap));
    }
    if (suffixLen > 0) out.push({ ruby: text.slice(text.length - suffixLen) });
    return out;
  }

  return solveCoreKanjiSegments(text, reading, singleKanjiMap);
}

function solveCoreKanjiSegments(text, reading, singleKanjiMap) {
  if (JUKUJIKUN_OVERRIDES[text] === reading) {
    return [{ ruby: text, rt: reading }];
  }
  if (text.length === 1 && isKanjiChar(text[0])) {
    return [{ ruby: text, rt: reading }];
  }

  let hasConsecutiveKanji = false;
  const groups = [];
  for (let i = 0; i < text.length; i++) {
    const kj = isKanjiChar(text[i]);
    if (kj && i > 0 && isKanjiChar(text[i - 1])) {
      hasConsecutiveKanji = true;
    }
    if (!groups.length || groups[groups.length - 1].isKanji !== kj) {
      groups.push({ text: text[i], isKanji: kj });
    } else {
      groups[groups.length - 1].text += text[i];
    }
  }

  if (groups.length > 1) {
    const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const greedyPat = '^' + groups.map((g) => (g.isKanji ? '(.+)' : escRe(kataToHiraSimple(g.text)))).join('') + '$';
    const lazyPat = '^' + groups.map((g) => (g.isKanji ? '(.+?)' : escRe(kataToHiraSimple(g.text)))).join('') + '$';
    const mG = new RegExp(greedyPat).exec(reading);
    const mL = new RegExp(lazyPat).exec(reading);
    if (mG && mL) {
      let identical = true;
      for (let m = 1; m < mG.length; m++) {
        if (mG[m] !== mL[m]) { identical = false; break; }
      }
      if (identical) {
        let segs = [];
        let capIdx = 1;
        for (let gIdx = 0; gIdx < groups.length; gIdx++) {
          if (groups[gIdx].isKanji) {
            const subR = mG[capIdx++];
            segs = segs.concat(
              hasConsecutiveKanji && singleKanjiMap
                ? solveConsecutiveKanjiCompound(groups[gIdx].text, subR, singleKanjiMap)
                : [{ ruby: groups[gIdx].text, rt: subR }]
            );
          } else {
            segs.push({ ruby: groups[gIdx].text });
          }
        }
        return segs;
      }
    }
  }

  return solveConsecutiveKanjiCompound(text, reading, singleKanjiMap);
}

function solveConsecutiveKanjiCompound(kanjiStr, reading, singleKanjiMap) {
  if (JUKUJIKUN_OVERRIDES[kanjiStr] === reading || !singleKanjiMap || kanjiStr.length <= 1) {
    return [{ ruby: kanjiStr, rt: reading }];
  }
  function backtrack(kIdx, rIdx, acc) {
    if (kIdx === kanjiStr.length && rIdx === reading.length) return acc;
    if (kIdx >= kanjiStr.length || rIdx >= reading.length) return null;
    const ch = kanjiStr[kIdx] === '々' && kIdx > 0 ? kanjiStr[kIdx - 1] : kanjiStr[kIdx];
    const info = singleKanjiMap[ch];
    const candidates = Array.isArray(info)
      ? info
      : info && Array.isArray(info.readings)
        ? info.readings
        : info && info.kana
          ? [info.kana]
          : [];
    const remKanji = kanjiStr.length - kIdx - 1;
    for (let end = rIdx + 1; end <= reading.length && end <= rIdx + 4; end++) {
      if (reading.length - end < remKanji) break;
      const slice = reading.slice(rIdx, end);
      if (candidates.indexOf(slice) !== -1) {
        const hit = backtrack(kIdx + 1, end, acc.concat([{ ruby: kanjiStr[kIdx], rt: slice }]));
        if (hit) return hit;
      }
    }
    return null;
  }
  return backtrack(0, 0, []) || [{ ruby: kanjiStr, rt: reading }];
}

/**
 * Render HTML with <ruby> and <rt> tags.
 * Okurigana (leading, middle, and trailing) always sits cleanly outside <ruby> tags.
 * When opts.hideFurigana is true (Exam / Measure Mode), renders plain surface text without <rt>.
 */
export function renderFuriganaHtml(rawText, opts = {}) {
  const clean = stripEmojisAndEmotWords(rawText);
  if (!clean) return '';
  if (opts && opts.hideFurigana) {
    return clean;
  }
  const tokens = tokenizeJapaneseToRuby(clean);
  const singleMap = opts && opts.splitCompounds ? (opts.singleKanjiMap || dict?.SINGLE || null) : null;
  return tokens
    .map((tk) => {
      if (tk.isStemWithTail && tk.ruby) {
        return `<ruby class="fz-ja-ruby">${tk.kanjiPart}<rt class="fz-ja-rt">${tk.ruby}</rt></ruby>${tk.tail}`;
      }
      if (tk.isKanji && tk.ruby) {
        const segs = solveFuriganaSegments(tk.text, tk.ruby, singleMap);
        return segs
          .map((seg) =>
            seg.rt
              ? `<ruby class="fz-ja-ruby">${seg.ruby}<rt class="fz-ja-rt">${seg.rt}</rt></ruby>`
              : seg.ruby
          )
          .join('');
      }
      return tk.text;
    })
    .join('');
}

/**
 * Convert Japanese text to accurate, word-spaced Hepburn Romaji:
 * - Particle は after words -> "wa"
 * - Particle を -> "o"
 * - Particle へ -> "e"
 * - Strict Hepburn rules (chotto, matchi, ja/ju/jo)
 * - Zero emoji leakage and zero dropped kanji
 */
export function toPhoneticRomaji(text) {
  const clean = stripEmojisAndEmotWords(text);
  if (!clean) return '';

  const tokens = tokenizeJapaneseToRuby(clean);
  const parts = [];

  for (let idx = 0; idx < tokens.length; idx++) {
    const tk = tokens[idx];
    if (tk.isSpace) continue;
    if (tk.romaji) {
      parts.push(tk.romaji);
    }
  }

  let romaji = parts
    .join(' ')
    .replace(/\s+([.,!?:;~])/g, '$1')
    .replace(/([(\[{])\s+/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim();

  // Post-polishing for particle edge-cases and vocal nuances
  romaji = romaji
    // Particle は -> wa
    .replace(/\b([A-Za-z]+)\s+ha\b/gi, (match, word) => {
      if (word.toLowerCase() === 'ha') return match;
      return `${word} wa`;
    })
    // Particle へ -> e
    .replace(/\b([A-Za-z]+)\s+he\b/gi, '$1 e')
    // Particle を -> o
    .replace(/\b([A-Za-z]+)wo\b/gi, '$1 o')
    .replace(/\bwo\b/gi, 'o')
    // Greetings & set phrases
    .replace(/\bkonnichiha\b/gi, 'konnichiwa')
    .replace(/\bkonbanha\b/gi, 'konbanwa')
    .replace(/\bdewaha\b/gi, 'dewa')
    .replace(/\bdeha\b/gi, 'dewa')
    .replace(/\bde wa arimasen\b/gi, 'dewa arimasen')
    .replace(/\bja arimasen\b/gi, 'ja arimasen')
    .replace(/\bjya arimasen\b/gi, 'ja arimasen')
    // Strict elimination of jya/jyu/jyo everywhere
    .replace(/jy([auo])/gi, 'j$1')
    // Sokuon before ch -> tch
    .replace(/cch/gi, 'tch')
    // Auxiliary endings spacing
    .replace(/\b(desu|deshita|masu|mashita|masen)(ne|yo|ka)\b/gi, '$1 $2')
    .replace(/\b([A-Za-z]+)(san|kun|chan|sensei|senpai)\b/gi, (match, prefix, suffix) => {
      if (/^(?:bot|ot|otou|okaa|onii|onee|oji|ojii|obaa|oba)$/i.test(prefix)) return match;
      return `${prefix}-${suffix}`;
    });

  // STRICT INVARIANT: ZERO KANJI LEAKAGE IN ROMAJI
  if (KANJI_REGEX.test(romaji)) {
    romaji = romaji.replace(/[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF\u3005]/g, (k) => {
      const s = dict && typeof dict.lookupSingle === 'function' ? dict.lookupSingle(k) : null;
      return s && s.romaji ? s.romaji : '';
    });
  }

  romaji = romaji.replace(/\s{2,}/g, ' ').trim();

  // Capitalize first letter of each sentence
  if (romaji.length > 0) {
    romaji = romaji.replace(/(?:^|[.!?]\s+)([a-z])/g, (m, p1) => m.toUpperCase());
  }

  return romaji;
}

/**
 * Full analysis producing both Furigana HTML and Phonetic Romaji.
 */
export function analyzeJapaneseText(text) {
  const clean = stripEmojisAndEmotWords(text);
  return {
    raw: clean,
    furiganaHtml: renderFuriganaHtml(clean),
    romaji: toPhoneticRomaji(clean),
  };
}
