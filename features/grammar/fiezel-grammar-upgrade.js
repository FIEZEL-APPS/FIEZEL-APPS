/**
 * Fiezel Grammar UI/UX Upgrade Feature Module
 * File: fiezel-grammar-upgrade.js
 *
 * Modul ini menyediakan antarmuka dan interaksi yang ditingkatkan untuk
 * fitur Grammar, termasuk latihan pengurutan token (Token Rail), highlight
 * sintaksis, popover 4-level progressive disclosure hint, umpan balik yang
 * diperkaya (bottom sheet), kotak kesalahan (Mistake Vault), dan kalkulator
 * tingkat penguasaan (Mastery Tier).
 */
(function() {
  'use strict';

  const FiezelGrammarUpgrade = {};

  const SUBJ_WORDS = new Set([
    'i', 'you', 'he', 'she', 'it', 'we', 'they', 'my', 'your', 'his', 'her', 'our', 'their', 'this', 'that', 'these', 'those'
  ]);
  const PREP_WORDS = new Set([
    'in', 'on', 'at', 'to', 'for', 'from', 'with', 'by', 'about', 'into', 'through', 'after', 'before', 'under', 'over', 'between', 'during', 'without', 'against'
  ]);
  const AUX_WORDS = new Set([
    'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had',
    'do', 'does', 'did',
    'can', 'could', 'will', 'would', 'shall', 'should', 'may', 'might', 'must'
  ]);
  const COMMON_VERBS = new Set([
    'go', 'goes', 'went', 'gone', 'going',
    'eat', 'eats', 'ate', 'eaten', 'eating',
    'drink', 'drinks', 'drank', 'drunk', 'drinking',
    'read', 'reads', 'reading',
    'write', 'writes', 'wrote', 'written', 'writing',
    'see', 'sees', 'saw', 'seen', 'seeing',
    'like', 'likes', 'liked', 'liking',
    'want', 'wants', 'wanted', 'wanting',
    'study', 'studies', 'studied', 'studying',
    'play', 'plays', 'played', 'playing',
    'make', 'makes', 'made', 'making',
    'take', 'takes', 'took', 'taken', 'taking',
    'come', 'comes', 'came', 'coming',
    'know', 'knows', 'knew', 'known', 'knowing',
    'think', 'thinks', 'thought', 'thinking',
    'look', 'looks', 'looked', 'looking',
    'use', 'uses', 'used', 'using',
    'find', 'finds', 'found', 'finding',
    'give', 'gives', 'gave', 'given', 'giving',
    'tell', 'tells', 'told', 'telling',
    'work', 'works', 'worked', 'working',
    'call', 'calls', 'called', 'calling',
    'try', 'tries', 'tried', 'trying',
    'ask', 'asks', 'asked', 'asking',
    'need', 'needs', 'needed', 'needing',
    'feel', 'feels', 'felt', 'feeling',
    'become', 'becomes', 'became', 'becoming',
    'leave', 'leaves', 'left', 'leaving',
    'put', 'puts', 'putting',
    'mean', 'means', 'meant', 'meaning',
    'keep', 'keeps', 'kept', 'keeping',
    'let', 'lets', 'letting',
    'begin', 'begins', 'began', 'begun', 'beginning',
    'seem', 'seems', 'seemed', 'seeming',
    'help', 'helps', 'helped', 'helping',
    'talk', 'talks', 'talked', 'talking',
    'turn', 'turns', 'turned', 'turning',
    'start', 'starts', 'started', 'starting',
    'show', 'shows', 'showed', 'shown', 'showing',
    'hear', 'hears', 'heard', 'hearing',
    'live', 'lives', 'lived', 'living'
  ]);

  /**
   * Mengklasifikasikan kata ke kategori sintaksis untuk penandaan warna (syntax highlighting).
   * @param {string} rawWord Kata mentah
   * @returns {string} 'subj' | 'prep' | 'aux' | 'verb' | 'obj' | ''
   */
  FiezelGrammarUpgrade.classifyWord = function(rawWord) {
    if (!rawWord || typeof rawWord !== 'string') return '';
    const clean = rawWord.toLowerCase().replace(/^[^\w]+|[^\w]+$/g, '');
    if (!clean) return '';
    if (SUBJ_WORDS.has(clean)) return 'subj';
    if (AUX_WORDS.has(clean)) return 'aux';
    if (PREP_WORDS.has(clean)) return 'prep';
    if (COMMON_VERBS.has(clean) || clean.endsWith('ing') || clean.endsWith('ed')) return 'verb';
    return '';
  };

  // =========================================================================
  // 1A. Voice-to-Tile Cross-Lingual Alignment Engine (EN / JA / ZH)
  // Zero-Ghost-Answer Invariant: pencocokan HANYA melihat daftar kata pada
  // bankTokens (termasuk distraktor), tidak pernah mengintip kunci jawaban.
  // =========================================================================
  const VOICE_LANG_MAP = { en: 'en-US', ja: 'ja-JP', zh: 'zh-CN' };
  const VOICE_BADGE_MAP = { en: 'EN', ja: 'JA', zh: 'ZH' };
  const HAS_KANA_RE = /[\u3040-\u30ff]/;
  const HAS_HANZI_RE = /[\u4e00-\u9fff]/;

  function t(key, fallback, params) {
    let out;
    try {
      const i18n = typeof FiezelI18n !== 'undefined' ? FiezelI18n : self.FiezelI18n;
      if (i18n && typeof i18n.t === 'function') {
        const res = i18n.t(key, params);
        if (res && res !== key) out = res;
      }
    } catch (_) {}
    if (!out) out = fallback;
    if (params && typeof out === 'string') {
      out = out.replace(/\{(\w+)\}/g, (m, k) => (Object.prototype.hasOwnProperty.call(params, k) ? String(params[k]) : m));
    }
    return out;
  }

  function normalizeLangKey(raw) {
    const v = String(raw || '').trim().toLowerCase();
    if (!v) return '';
    if (v === 'ja' || v.startsWith('ja-') || v === 'jp') return 'ja';
    if (v === 'zh' || v.startsWith('zh-') || v === 'cn' || v === 'mandarin') return 'zh';
    if (v === 'en' || v.startsWith('en-')) return 'en';
    return '';
  }

  function readActiveCourseLang() {
    const fromState = normalizeLangKey(self.state?.preferences?.targetLang || self.state?.targetLang);
    if (fromState) return fromState;
    try {
      if (typeof self.jaCourseOn === 'function' && self.jaCourseOn()) return 'ja';
    } catch (_) {}
    try {
      if (typeof localStorage !== 'undefined' && localStorage) {
        const stored = normalizeLangKey(localStorage.getItem('fz_target_course'));
        if (stored) return stored;
      }
    } catch (_) {}
    return '';
  }

  function resolveTokenOrderSpeechLang(q, bankTokens, opts) {
    const explicit = normalizeLangKey((opts && opts.lang) || (q && q.targetLang));
    if (explicit) return explicit;
    const sample = []
      .concat(Array.isArray(bankTokens) ? bankTokens : [])
      .concat(Array.isArray(q && q.tokens) ? q.tokens : [])
      .map((item) => (typeof item === 'object' && item ? (item.text || item.option || item.word || '') : String(item ?? '')))
      .join('');
    if (HAS_KANA_RE.test(sample)) return 'ja';
    const courseLang = readActiveCourseLang();
    if (HAS_HANZI_RE.test(sample)) return courseLang === 'ja' ? 'ja' : 'zh';
    if (courseLang) return courseLang;
    return 'en';
  }

  const VOICE_CLEAR_EXACT = new Set([
    'hapus semua', 'ulangi susunan', 'reset susunan', 'kosongkan susunan', 'clear all', 'reset sentence',
    '全部消して', 'ぜんぶけして', 'やりなおして', 'やり直して', 'リセットして',
    '全部清除', '清空句子', '重新开始', '重新排列'
  ]);

  function isVoiceClearCommand(transcript) {
    const cleaned = String(transcript || '')
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!cleaned) return false;
    if (VOICE_CLEAR_EXACT.has(cleaned)) return true;
    const compact = cleaned.replace(/\s+/g, '');
    return VOICE_CLEAR_EXACT.has(compact);
  }

  // English contractions & numbers (bidirectional lookup)
  const EN_CONTRACTIONS_EXPANDED_TO_SHORT = {
    'cannot': "can't", 'can not': "can't",
    'do not': "don't", 'does not': "doesn't", 'did not': "didn't",
    'will not': "won't", 'would not': "wouldn't", 'should not': "shouldn't", 'could not': "couldn't",
    'is not': "isn't", 'are not': "aren't", 'was not': "wasn't", 'were not': "weren't",
    'have not': "haven't", 'has not': "hasn't", 'had not': "hadn't", 'must not': "mustn't", 'need not': "needn't",
    'i am': "i'm", 'you are': "you're", 'we are': "we're", 'they are': "they're",
    'he is': "he's", 'she is': "she's", 'it is': "it's",
    'where is': "where's", 'what is': "what's", 'who is': "who's", 'that is': "that's", 'there is': "there's", 'here is': "here's",
    'let us': "let's",
    'i will': "i'll", 'you will': "you'll", 'we will': "we'll", 'they will': "they'll", 'he will': "he'll", 'she will': "she'll",
    'i have': "i've", 'you have': "you've", 'we have': "we've", 'they have': "they've",
    'i would': "i'd", 'you would': "you'd", 'he would': "he'd", 'she would': "she'd", 'we would': "we'd", 'they would': "they'd"
  };
  const EN_SHORT_TO_SPLIT = {
    "can't": ['can', 'not'], "don't": ['do', 'not'], "doesn't": ['does', 'not'], "didn't": ['did', 'not'],
    "won't": ['will', 'not'], "wouldn't": ['would', 'not'], "shouldn't": ['should', 'not'], "couldn't": ['could', 'not'],
    "isn't": ['is', 'not'], "aren't": ['are', 'not'], "wasn't": ['was', 'not'], "weren't": ['were', 'not'],
    "haven't": ['have', 'not'], "hasn't": ['has', 'not'], "hadn't": ['had', 'not'], "mustn't": ['must', 'not'], "needn't": ['need', 'not'],
    "i'm": ['i', 'am'], "you're": ['you', 'are'], "we're": ['we', 'are'], "they're": ['they', 'are'],
    "he's": ['he', 'is'], "she's": ['she', 'is'], "it's": ['it', 'is'],
    "where's": ['where', 'is'], "what's": ['what', 'is'], "who's": ['who', 'is'], "that's": ['that', 'is'], "there's": ['there', 'is'], "here's": ['here', 'is'],
    "let's": ['let', 'us'],
    "i'll": ['i', 'will'], "you'll": ['you', 'will'], "we'll": ['we', 'will'], "they'll": ['they', 'will'], "he'll": ['he', 'will'], "she'll": ['she', 'will'],
    "i've": ['i', 'have'], "you've": ['you', 'have'], "we've": ['we', 'have'], "they've": ['they', 'have'],
    "i'd": ['i', 'would'], "you'd": ['you', 'would'], "he'd": ['he', 'would'], "she'd": ['she', 'would'], "we'd": ['we', 'would'], "they'd": ['they', 'would'],
    'cannot': ['can', 'not']
  };
  const EN_NUM_TO_WORD = {
    '0': 'zero', '1': 'one', '2': 'two', '3': 'three', '4': 'four', '5': 'five',
    '6': 'six', '7': 'seven', '8': 'eight', '9': 'nine', '10': 'ten',
    '11': 'eleven', '12': 'twelve', '13': 'thirteen', '14': 'fourteen', '15': 'fifteen',
    '16': 'sixteen', '17': 'seventeen', '18': 'eighteen', '19': 'nineteen', '20': 'twenty',
    '30': 'thirty', '40': 'forty', '50': 'fifty', '100': 'hundred'
  };
  const EN_WORD_TO_NUM = Object.keys(EN_NUM_TO_WORD).reduce((acc, digit) => {
    acc[EN_NUM_TO_WORD[digit]] = digit;
    return acc;
  }, {});
  const EN_FILLERS = new Set(['um', 'uh', 'umm', 'uhh', 'er', 'erm', 'ah', 'eh']);

  function normEn(s) {
    return String(s || '')
      .replace(/[’‘\x60]/g, "'")
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\x27\s]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .map((w) => w.replace(/^\x27+|\x27+$/g, ''))
      .filter(Boolean);
  }

  function matchEnglishTranscript(transcript, tiles) {
    const words = normEn(transcript);
    const entries = tiles.map((tile) => {
      const parts = normEn(tile.text);
      return { tile, parts, key: parts.join(' '), used: false };
    }).filter((e) => e.parts.length > 0);

    const findUnusedExact = (key) => entries.find((e) => !e.used && e.key === key);
    const findUnusedNumericAlt = (w) => {
      const alt = EN_NUM_TO_WORD[w] || EN_WORD_TO_NUM[w];
      return alt ? entries.find((e) => !e.used && e.key === alt) : null;
    };

    const matchedIds = [];
    const matchedTokens = [];
    const unmatched = [];
    let i = 0;
    let safety = 0;

    while (i < words.length && safety++ < 256) {
      let bestExact = null;
      let bestSpan = 0;
      for (const e of entries) {
        if (e.used) continue;
        const n = e.parts.length;
        if (n <= words.length - i && n > bestSpan) {
          let allEq = true;
          for (let k = 0; k < n; k++) {
            if (words[i + k] !== e.parts[k]) { allEq = false; break; }
          }
          if (allEq) {
            bestExact = e;
            bestSpan = n;
          }
        }
      }
      if (bestExact) {
        bestExact.used = true;
        matchedIds.push(bestExact.tile.id);
        matchedTokens.push(bestExact.tile.text);
        i += bestSpan;
        continue;
      }

      // 2 spoken words -> contracted 1-word tile (when exact 1-word match did not win)
      if (i + 1 < words.length) {
        const pairKey = words[i] + ' ' + words[i + 1];
        const shortForm = EN_CONTRACTIONS_EXPANDED_TO_SHORT[pairKey];
        if (shortForm) {
          const shortEntry = findUnusedExact(shortForm);
          if (shortEntry) {
            shortEntry.used = true;
            matchedIds.push(shortEntry.tile.id);
            matchedTokens.push(shortEntry.tile.text);
            i += 2;
            continue;
          }
        }
      }

      const w = words[i];
      // 1-word contracted/compound -> equivalent short/split tile(s)
      const equivShort = EN_CONTRACTIONS_EXPANDED_TO_SHORT[w];
      if (equivShort) {
        const shortEntry = findUnusedExact(equivShort);
        if (shortEntry) {
          shortEntry.used = true;
          matchedIds.push(shortEntry.tile.id);
          matchedTokens.push(shortEntry.tile.text);
          i += 1;
          continue;
        }
      }

      const splitParts = EN_SHORT_TO_SPLIT[w];
      if (splitParts && splitParts.length === 2) {
        const firstPart = findUnusedExact(splitParts[0]);
        if (firstPart) {
          words.splice(i, 1, splitParts[0], splitParts[1]);
          continue;
        }
      }

      const numMatch = findUnusedNumericAlt(w);
      if (numMatch) {
        numMatch.used = true;
        matchedIds.push(numMatch.tile.id);
        matchedTokens.push(numMatch.tile.text);
        i += 1;
        continue;
      }

      if (!EN_FILLERS.has(w)) unmatched.push(w);
      i += 1;
    }

    return { matchedIds, matchedTokens, unmatchedText: unmatched.join(' ') };
  }

  // Japanese Kanji <-> Hiragana/Katakana Equivalence
  const JA_BUILTIN_KANJI_MAP = {
    '私': 'わたし', '僕': 'ぼく', '彼': 'かれ', '彼女': 'かのじょ', 'あなた': 'あなた',
    '今日': 'きょう', '明日': 'あした', '昨日': 'きのう', '毎日': 'まいにち', '毎週': 'まいしゅう',
    '今': 'いま', '時間': 'じかん', '時': 'とき', '分': 'ふん', '半': 'はん', '年': 'ねん', '月': 'つき', '日': 'ひ',
    '人': 'ひと', '方': 'かた', '男': 'おとこ', '女': 'おんな', '子供': 'こども', '子ども': 'こども',
    '学生': 'がくせい', '先生': 'せんせい', '友達': 'ともだち', '家族': 'かぞく', '母': 'はは', '父': 'ちち',
    '日本': 'にほん', '日本語': 'にほんご', '英語': 'えいご', '中国語': 'ちゅうごくご',
    '静か': 'しずか', '綺麗': 'きれい', '元気': 'げんき', '便利': 'べんり', '有名': 'ゆうめい', '好き': 'すき', '嫌い': 'きらい', '上手': 'じょうず', '下手': 'へた',
    '公園': 'こうえん', '学校': 'がっこう', '図書館': 'としょかん', '大学': 'だいがく', '教室': 'きょうしつ',
    '部屋': 'へや', '家': 'いえ', '駅': 'えき', '電車': 'でんしゃ', '車': 'くるま', 'バス': 'ばす',
    '会社': 'かいしゃ', '仕事': 'しごと', '店': 'みせ', '病院': 'びょういん', 'レストラン': 'れすとらん',
    '食べ物': 'たべもの', '飲み物': 'のみもの', '朝ご飯': 'あさごはん', '昼ご飯': 'ひるごはん', '晩ご飯': 'ばんごはん',
    '水': 'みず', 'お茶': 'おちゃ', 'コーヒー': 'こーひー', 'パン': 'ぱん', '肉': 'にく', '魚': 'さかな', '野菜': 'やさい', '果物': 'くだもの', 'リンゴ': 'りんご',
    '本': 'ほん', '映画': 'えいが', '音楽': 'おんがく', '写真': 'しゃしん', '手紙': 'てがみ', '新聞': 'しんぶん', '電話': 'でんわ',
    '行き': 'いき', '行く': 'いく', '行っ': 'いっ', '来': 'き', '来る': 'くる', '帰り': 'かえり', '帰る': 'かえる',
    '食べ': 'たべ', '食べる': 'たべる', '飲み': 'のみ', '飲む': 'のむ', '見': 'み', '見る': 'みる',
    '読み': 'よみ', '読む': 'よむ', '書き': 'かき', '書く': 'かく', '話し': 'はなし', '話す': 'はなす', '話': 'はなし',
    '聞き': 'きき', '聞く': 'きく', '買い': 'かい', '買う': 'かう', '作り': 'つくり', '作る': 'つくる',
    'でき': 'でき', '出来': 'でき', '分かる': 'わかる', '分かり': 'わかり', '思': 'おも', '言': 'い',
    '使い': 'つかい', '使う': 'つかう', '待ち': 'まち', '待つ': 'まつ', '持ち': 'もち', '持つ': 'もつ',
    '知り': 'しり', '知る': 'しる', '住み': 'すみ', '住む': 'すむ', '働き': 'はたらき', '働く': 'はたらく',
    '起き': 'おき', '起きる': 'おきる', '寝': 'ね', '寝る': 'ねる', '勉強': 'べんきょう', '運動': 'うんどう', '料理': 'りょうり',
    '大きい': 'おおきい', '大き': 'おおき', '小さい': 'ちいさい', '小さ': 'ちいさ',
    '新しい': 'あたらしい', '新し': 'あたらし', '古い': 'ふるい', '高い': 'たかい', '安い': 'やすい',
    '多い': 'おおい', '少ない': 'すくない', '早い': 'はやい', '遅い': 'おそい',
    '暑い': 'あつい', '寒い': 'さむい', '忙しい': 'いそがしい', '楽しい': 'たのしい', '難しい': 'むずかしい', '易しい': 'やさしい', '面白い': 'おもしろい',
    '一': 'いち', '二': 'に', '三': 'さん', '四': 'よん', '五': 'ご', '六': 'ろく', '七': 'なな', '八': 'はち', '九': 'きゅう', '十': 'じゅう',
    '一つ': 'ひとつ', '二つ': 'ふたつ', '三つ': 'みっつ', '四つ': 'よっつ', '五つ': 'いつつ',
    '何': 'なに', '誰': 'だれ', 'どこ': 'どこ', 'いつ': 'いつ', 'どう': 'どう',
    '1つ': 'ひとつ', '2つ': 'ふたつ', '3つ': 'みっつ', '4つ': 'よっつ', '5つ': 'いつつ',
    '0': 'ぜろ', '1': 'いち', '2': 'に', '3': 'さん', '4': 'よん', '5': 'ご',
    '6': 'ろく', '7': 'なな', '8': 'はち', '9': 'きゅう', '10': 'じゅう'
  };

  let _jaVocabLexiconCache = null;
  let _jaVocabLexiconLen = -1;

  function toHiragana(str) {
    return String(str || '').replace(/[\u30a1-\u30f6]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60));
  }

  function stripJaPunct(str) {
    return String(str || '')
      .toLowerCase()
      .replace(/[\s\u3000\p{P}\p{S}]+/gu, '');
  }

  function getJaKanjiLexicon() {
    const vocabList = Array.isArray(self.V) ? self.V : null;
    const vLen = vocabList ? vocabList.length : 0;
    if (_jaVocabLexiconCache && _jaVocabLexiconLen === vLen) return _jaVocabLexiconCache;

    const map = new Map(Object.entries(JA_BUILTIN_KANJI_MAP));
    if (vocabList) {
      for (let i = 0; i < vocabList.length; i++) {
        const entry = vocabList[i];
        if (!entry || (entry.lang && entry.lang !== 'ja')) continue;
        const w = stripJaPunct(entry.word);
        const r = toHiragana(stripJaPunct(entry.reading || entry.kana || ''));
        if (w && r && HAS_HANZI_RE.test(w) && !HAS_HANZI_RE.test(r) && !map.has(w)) {
          map.set(w, r);
        }
      }
    }
    const keys = Array.from(map.keys()).sort((a, b) => b.length - a.length);
    _jaVocabLexiconCache = { map, keys };
    _jaVocabLexiconLen = vLen;
    return _jaVocabLexiconCache;
  }

  function projectJaToKana(rawText) {
    const cleanRaw = stripJaPunct(rawText);
    const { map } = getJaKanjiLexicon();
    const maxKeyLen = 8;
    let kana = '';
    const kanaToRawPos = [];
    let i = 0;
    while (i < cleanRaw.length) {
      let matchedKey = '';
      let matchedVal = '';
      const maxSpan = Math.min(maxKeyLen, cleanRaw.length - i);
      for (let span = maxSpan; span >= 1; span--) {
        const sub = cleanRaw.slice(i, i + span);
        if (map.has(sub)) {
          matchedKey = sub;
          matchedVal = toHiragana(map.get(sub));
          break;
        }
      }
      if (matchedKey) {
        for (let k = 0; k < matchedVal.length; k++) kanaToRawPos.push(i);
        kana += matchedVal;
        i += matchedKey.length;
      } else {
        const h = toHiragana(cleanRaw[i]);
        kanaToRawPos.push(i);
        kana += h;
        i += 1;
      }
    }
    kanaToRawPos.push(cleanRaw.length);
    return { raw: cleanRaw, kana, kanaToRawPos };
  }

  function matchJapaneseTranscript(transcript, tiles) {
    const spoken = projectJaToKana(transcript);
    const entries = tiles.map((tile) => {
      const proj = projectJaToKana(tile.text);
      return { tile, raw: proj.raw, kana: proj.kana, used: false };
    }).filter((e) => e.kana.length > 0);

    const matchedIds = [];
    const matchedTokens = [];
    const unmatchedChars = [];
    let cursor = 0;

    while (cursor < spoken.kana.length) {
      let best = null;
      let bestScore = -1;
      const rawStart = spoken.kanaToRawPos[cursor] ?? 0;

      for (const e of entries) {
        if (e.used) continue;
        if (spoken.kana.startsWith(e.kana, cursor)) {
          const exactRawBonus = (e.raw && spoken.raw.startsWith(e.raw, rawStart)) ? 100 : 0;
          const score = exactRawBonus + e.kana.length;
          if (score > bestScore) {
            bestScore = score;
            best = e;
          }
        }
      }

      if (best) {
        best.used = true;
        matchedIds.push(best.tile.id);
        matchedTokens.push(best.tile.text);
        cursor += best.kana.length;
      } else {
        unmatchedChars.push(spoken.kana[cursor]);
        cursor += 1;
      }
    }

    return { matchedIds, matchedTokens, unmatchedText: unmatchedChars.join('') };
  }

  // Mandarin Hanzi + Digit + Pinyin Homophone Fallback
  const ZH_DIGIT_TO_HANZI = {
    '0': ['零'], '1': ['一'], '2': ['两', '二'], '3': ['三'], '4': ['四'],
    '5': ['五'], '6': ['六'], '7': ['七'], '8': ['八'], '9': ['九'], '10': ['十']
  };
  const ZH_CHAR_PY_FALLBACK = {
    '他': 'ta', '她': 'ta', '它': 'ta', '的': 'de', '地': 'de', '得': 'de',
    '在': 'zai', '再': 'zai', '做': 'zuo', '作': 'zuo', '坐': 'zuo', '座': 'zuo',
    '那': 'na', '哪': 'na', '和': 'he', '合': 'he', '河': 'he', '喝': 'he',
    '会': 'hui', '回': 'hui', '有': 'you', '友': 'you', '是': 'shi', '事': 'shi', '时': 'shi', '视': 'shi',
    '名': 'ming', '明': 'ming', '快': 'kuai', '块': 'kuai', '几': 'ji', '己': 'ji', '机': 'ji',
    '一': 'yi', '医': 'yi', '衣': 'yi', '两': 'liang', '二': 'er', '你': 'ni', '您': 'nin', '我': 'wo',
    '们': 'men', '好': 'hao', '号': 'hao', '叫': 'jiao', '什': 'shen', '么': 'me',
    '这': 'zhe', '谁': 'shei', '多': 'duo', '都': 'dou', '大': 'da', '小': 'xiao', '少': 'shao',
    '不': 'bu', '很': 'hen', '太': 'tai', '也': 'ye', '个': 'ge', '岁': 'sui',
    '年': 'nian', '月': 'yue', '日': 'ri', '天': 'tian', '星': 'xing', '期': 'qi',
    '点': 'dian', '分': 'fen', '现': 'xian', '去': 'qu', '来': 'lai', '家': 'jia',
    '吃': 'chi', '看': 'kan', '见': 'jian', '听': 'ting', '说': 'shuo', '读': 'du', '写': 'xie',
    '想': 'xiang', '要': 'yao', '能': 'neng', '买': 'mai', '卖': 'mai', '学': 'xue', '习': 'xi',
    '生': 'sheng', '老': 'lao', '师': 'shi', '朋': 'peng', '人': 'ren', '水': 'shui', '茶': 'cha',
    '喜': 'xi', '欢': 'huan', '爱': 'ai', '请': 'qing', '问': 'wen', '谢': 'xie',
    '吗': 'ma', '妈': 'ma', '呢': 'ne', '吧': 'ba', '爸': 'ba', '了': 'le', '过': 'guo', '着': 'zhe',
    '上': 'shang', '下': 'xia', '里': 'li', '中': 'zhong', '国': 'guo', '今': 'jin', '明': 'ming'
  };

  function stripPinyinTone(py) {
    return String(py || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/ü/gi, 'v')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
  }

  function getZhCharSyllable(ch) {
    try {
      const pyEngine = self.FiezelMandarinPinyinEngine;
      if (pyEngine && typeof pyEngine.getPinyinForChar === 'function') {
        const p = stripPinyinTone(pyEngine.getPinyinForChar(ch));
        if (p && p !== ch.toLowerCase()) return p;
      }
    } catch (_) {}
    if (ZH_CHAR_PY_FALLBACK[ch]) return ZH_CHAR_PY_FALLBACK[ch];
    if (ZH_DIGIT_TO_HANZI[ch]) return ZH_CHAR_PY_FALLBACK[ZH_DIGIT_TO_HANZI[ch][0]] || '';
    return '';
  }

  function getZhSyllables(str) {
    const out = [];
    for (let i = 0; i < str.length; i++) {
      const py = getZhCharSyllable(str[i]);
      if (!py) return null;
      out.push(py);
    }
    return out;
  }

  function stripZhPunct(str) {
    return String(str || '').replace(/[\s\u3000\p{P}\p{S}]+/gu, '');
  }

  function expandZhDigitVariants(spoken) {
    return String(spoken || '').replace(/10|[0-9]/g, (m) => {
      const list = ZH_DIGIT_TO_HANZI[m];
      return list ? list[0] : m;
    });
  }

  function matchMandarinTranscript(transcript, tiles) {
    const cleanSpoken = stripZhPunct(transcript);
    const entries = tiles.map((tile) => {
      const raw = stripZhPunct(tile.text);
      const normDigit = expandZhDigitVariants(raw);
      return {
        tile,
        raw,
        normDigit,
        syllables: raw.length > 0 ? getZhSyllables(raw) : null,
        used: false
      };
    }).filter((e) => e.raw.length > 0);

    const matchedIds = [];
    const matchedTokens = [];
    const unmatched = [];
    let cursor = 0;

    while (cursor < cleanSpoken.length) {
      let exactBest = null;
      let exactBestLen = 0;

      for (const e of entries) {
        if (e.used) continue;
        if (cleanSpoken.startsWith(e.raw, cursor) && e.raw.length > exactBestLen) {
          exactBest = e;
          exactBestLen = e.raw.length;
        }
      }

      // Digit spoken form (e.g. ASR outputs "2点" when bank tile is "两" / "点")
      if (!exactBest) {
        const slice2 = cleanSpoken.slice(cursor, cursor + 2);
        const digitKey = slice2 === '10' ? '10' : (ZH_DIGIT_TO_HANZI[cleanSpoken[cursor]] ? cleanSpoken[cursor] : '');
        if (digitKey) {
          const candidates = ZH_DIGIT_TO_HANZI[digitKey];
          for (const ch of candidates) {
            const found = entries.find((e) => !e.used && e.raw === ch);
            if (found) {
              exactBest = found;
              exactBestLen = digitKey.length;
              break;
            }
          }
        }
      }

      if (exactBest) {
        exactBest.used = true;
        matchedIds.push(exactBest.tile.id);
        matchedTokens.push(exactBest.tile.text);
        cursor += exactBestLen;
        continue;
      }

      // Pinyin homophone fallback ONLY when no exact Hanzi tile matches at cursor
      let pyBest = null;
      let pyBestLen = 0;
      for (const e of entries) {
        if (e.used || !e.syllables) continue;
        const cLen = e.raw.length;
        if (cursor + cLen > cleanSpoken.length || cLen <= pyBestLen) continue;
        const sub = cleanSpoken.slice(cursor, cursor + cLen);
        const subSyl = getZhSyllables(sub);
        if (subSyl && subSyl.length === e.syllables.length && subSyl.every((s, idx) => s === e.syllables[idx])) {
          pyBest = e;
          pyBestLen = cLen;
        }
      }

      if (pyBest) {
        pyBest.used = true;
        matchedIds.push(pyBest.tile.id);
        matchedTokens.push(pyBest.tile.text);
        cursor += pyBestLen;
        continue;
      }

      unmatched.push(cleanSpoken[cursor]);
      cursor += 1;
    }

    return { matchedIds, matchedTokens, unmatchedText: unmatched.join('') };
  }

  FiezelGrammarUpgrade.matchSpokenTranscriptToTokens = function(transcript, bankTokens, lang) {
    const resolvedLang = normalizeLangKey(lang) || resolveTokenOrderSpeechLang({ tokens: bankTokens }, bankTokens);
    const list = Array.isArray(bankTokens) ? bankTokens : [];
    const normalizedTiles = list.map((item, idx) => {
      if (item && typeof item === 'object') {
        return {
          id: item.id !== undefined ? item.id : idx,
          text: String(item.text || item.option || item.word || ''),
          placed: Boolean(item.placed)
        };
      }
      return { id: idx, text: String(item ?? ''), placed: false };
    }).filter((t) => !t.placed && t.text.trim().length > 0);

    if (isVoiceClearCommand(transcript)) {
      return { matchedIds: [], matchedTokens: [], unmatchedText: '', commandAction: 'clear', lang: resolvedLang };
    }

    let res;
    if (resolvedLang === 'ja') {
      res = matchJapaneseTranscript(transcript, normalizedTiles);
    } else if (resolvedLang === 'zh') {
      res = matchMandarinTranscript(transcript, normalizedTiles);
    } else {
      res = matchEnglishTranscript(transcript, normalizedTiles);
    }

    return {
      matchedIds: res.matchedIds,
      matchedTokens: res.matchedTokens,
      unmatchedText: res.unmatchedText,
      commandAction: null,
      lang: resolvedLang
    };
  };

  FiezelGrammarUpgrade.resolveTokenOrderSpeechLang = resolveTokenOrderSpeechLang;

  let _activeVoiceController = null;
  FiezelGrammarUpgrade.stopActiveVoice = function() {
    if (_activeVoiceController && typeof _activeVoiceController.stop === 'function') {
      const prev = _activeVoiceController;
      _activeVoiceController = null;
      try { prev.stop(true); } catch (_) {}
    }
  };

  /**
   * 1. Token-Order Exercise Renderer (Tap-to-Order Token Rail + Voice-to-Tile)
   * Merender latihan susun kata untuk grammar dengan token rail interaktif.
   * @param {Object} q Objek pertanyaan (q.tokens, q.distractors, q.correctOrder)
   * @param {Function} onComplete Callback saat pengguna selesai/submit, dipanggil dengan boolean (isCorrect)
   * @returns {HTMLElement} Elemen DOM siap dimasukkan ke dalam kuis
   */
  FiezelGrammarUpgrade.renderTokenOrder = function(q, onComplete, opts) {
    FiezelGrammarUpgrade.stopActiveVoice();
    // Mode ukur (tes penempatan, ujian lompat level, gerbang lewati materi): tanpa bantuan
    // apa pun - arti kata yang bisa diintip adalah bantuan, dan bantuan di alat ukur membuat
    // levelnya mengukur bantuan itu, bukan muridnya (audit P-A 2026-10-04).
    const measure = !!(opts && opts.measure);
    const container = document.createElement('div');
    container.className = 'token-order-container';
    const esc = (str) => String(str ?? '')
      .split('&').join('&amp;').split('<').join('&lt;').split('>').join('&gt;')
      .split('"').join('&quot;').split("'").join('&#039;');

    const tokens = [...(q.tokens || [])];
    const distractors = [...(q.distractors || [])];
    const allTokens = [...tokens, ...distractors];

    // Fisher-Yates shuffle (skip when explicit presetBankOrder requested)
    const shuffle = (array) => {
      let currentIndex = array.length, randomIndex;
      while (currentIndex !== 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
      }
      return array;
    };

    // Arti kata (gloss) dalam bahasa MURID. Dua sumber, keduanya sudah dwibahasa:
    //  1. q.gloss — peta {kata: arti} dari pembuat soal (app.js mengisinya dari bank kosakata
    //     yang sudah ber-overlay locale);
    //  2. kamus kecil kata fungsi & bentuk berinfleksi di copy-map (`grammar.gloss.<kata>`),
    //     karena bank kosakata hanya memuat bentuk dasar.
    // Dulu kamusnya literal Indonesia di sini, jadi murid Thai membaca "dia (pr)".
    const glossFor = (text) => {
      const lower = text.toLowerCase().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
      const fromQ = (q.gloss && (q.gloss[text] || q.gloss[lower])) || '';
      if (fromQ) return String(fromQ);
      const isThai = (self.FiezelI18n?.getLocale?.() === 'th');
      const loc = isThai ? 'th' : 'id';
      const key = 'grammar.gloss.' + lower;
      try {
        if (typeof FiezelI18n.hasCopy === 'function' && FiezelI18n.hasCopy(loc, key)) return FiezelI18n.t(key);
      } catch (_) {}
      if (self.FiezelGrammarLexicon && typeof self.FiezelGrammarLexicon.lookup === 'function') {
        const gl = self.FiezelGrammarLexicon.lookup(lower, loc);
        if (gl) return gl;
      }
      return '';
    };

    const rawBankList = allTokens.map((item, id) => {
      const rawText = typeof item === 'object' && item ? (item.text || item.option || item.word || '') : String(item ?? '');
      const text = rawText.replace(/^[.,\/#!$%\^&\*;:{}=\-_`~()“”"']+|[.,\/#!$%\^&\*;:{}=\-_`~()“”"']+$/g, '');
      const explicitSyntax = typeof item === 'object' && item.syntax ? item.syntax : '';
      const syntax = explicitSyntax || FiezelGrammarUpgrade.classifyWord(text);
      const gloss = glossFor(text);
      return { text, id, syntax, gloss, placed: false };
    });
    const bankTokens = (opts && opts.preserveBankOrder) ? rawBankList : shuffle(rawBankList);
    // Tombol "intip arti" hanya muncul kalau memang ada arti yang bisa diintip: tombol yang
    // ditekan lalu tidak mengubah apa pun justru membuat murid mengira aplikasinya rusak.
    const anyGloss = !measure && bankTokens.some(t => t.gloss);
    const placedTokens = [];
    let vacantSlotIndex = null;
    let showGloss = false;
    const vacantSlotHtml = () => `<span aria-hidden="true">↳</span> ${esc(t('grammar.token-isi-di-sini', 'isi di sini'))}`;
    const courseLangKey = resolveTokenOrderSpeechLang(q, bankTokens, opts);
    const speechBcp47 = VOICE_LANG_MAP[courseLangKey] || 'en-US';
    const speechBadge = VOICE_BADGE_MAP[courseLangKey] || 'EN';

    container.innerHTML = `
      <div class="token-rail" id="tokenRail" aria-label="${esc(t('grammar.token-rail-aria', 'Area penyusunan kalimat'))}"></div>
      <div class="gx-gloss-bar">
        <span class="token-bank-label">${esc(t('grammar.token-bank-aria', 'Daftar kata tersedia'))}</span>
        <div class="gx-bar-actions">
          <button type="button" class="gx-btn-voice" id="tokenVoiceBtn" aria-pressed="false" aria-label="${esc(t('grammar.token-voice-aria', 'Susun kalimat dengan suara'))}">
            <span class="gx-voice-mic-icon" aria-hidden="true">🎙️</span>
            <span class="gx-voice-label">${esc(t('grammar.token-voice-btn', 'Susun Suara'))}</span>
            <span class="gx-voice-lang">${esc(speechBadge)}</span>
          </button>
          ${anyGloss ? `<button type="button" class="gx-btn-gloss" id="tokenGlossToggle" aria-pressed="false">
            <span aria-hidden="true">📖</span> ${esc(t('grammar.token-intip-arti', 'Intip arti kata'))}
          </button>` : ''}
        </div>
      </div>
      <div class="gx-voice-status" id="tokenVoiceStatus" hidden role="status" aria-live="polite"></div>
      <div class="token-bank" id="tokenBank" aria-label="${esc(t('grammar.token-bank-aria', 'Daftar kata tersedia'))}"></div>
      <div class="token-actions">
        <button type="button" id="tokenResetBtn" class="token-reset-btn" disabled>
          <i data-lucide="rotate-ccw"></i>
          <span>${esc(t('umum.hapus', 'Hapus'))}</span>
        </button>
        <button type="button" id="tokenSubmitBtn" class="primary token-submit-btn" disabled>${esc(t('quiz.periksa', 'Periksa'))}</button>
      </div>
    `;

    const railEl = container.querySelector('#tokenRail');
    const bankEl = container.querySelector('#tokenBank');
    const glossToggleBtn = container.querySelector('#tokenGlossToggle');
    const voiceBtn = container.querySelector('#tokenVoiceBtn');
    const voiceStatusEl = container.querySelector('#tokenVoiceStatus');
    const submitBtn = container.querySelector('#tokenSubmitBtn');
    const resetBtn = container.querySelector('#tokenResetBtn');

    if (glossToggleBtn) {
      glossToggleBtn.onclick = () => {
        showGloss = !showGloss;
        glossToggleBtn.classList.toggle('active', showGloss);
        glossToggleBtn.setAttribute('aria-pressed', String(showGloss));
        render();
      };
    }

    const render = () => {
      railEl.innerHTML = '';
      bankEl.innerHTML = '';

      // Render kata di bank
      bankTokens.forEach((token) => {
        if (token.placed) {
          const placeholder = document.createElement('div');
          placeholder.className = 'token-chip placed placeholder';
          placeholder.setAttribute('aria-hidden', 'true');
          placeholder.textContent = token.text;
          bankEl.appendChild(placeholder);
        } else {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'token-chip' + (showGloss && token.gloss ? ' has-gloss' : '');
          if (showGloss && token.gloss) {
            btn.innerHTML = `<span class="token-gloss">${esc(token.gloss)}</span><span class="token-word">${esc(token.text)}</span>`;
          } else {
            btn.textContent = token.text;
          }
          btn.onclick = () => {
            FiezelGrammarUpgrade.stopActiveVoice();
            if (typeof self.haptic === 'function') self.haptic('tap');
            if (typeof self.uiSfx === 'function') self.uiSfx('pop');
            token.placed = true;
            if (vacantSlotIndex !== null && vacantSlotIndex <= placedTokens.length) {
              placedTokens.splice(vacantSlotIndex, 0, token);
              vacantSlotIndex = null;
            } else {
              placedTokens.push(token);
            }
            render();
          };
          bankEl.appendChild(btn);
        }
      });

      // Render kata di rail (kalimat yang sedang disusun) dengan dukungan vacant slot insertion
      placedTokens.forEach((token, index) => {
        if (vacantSlotIndex === index) {
          const vacantEl = document.createElement('span');
          vacantEl.className = 'gx-vacant-slot';
          vacantEl.innerHTML = vacantSlotHtml();
          vacantEl.onclick = () => {
            if (typeof self.haptic === 'function') self.haptic('tap');
            vacantSlotIndex = null;
            render();
          };
          railEl.appendChild(vacantEl);
        }
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'token-chip in-rail' + (showGloss && token.gloss ? ' has-gloss' : '');
        if (showGloss && token.gloss) {
          btn.innerHTML = `<span class="token-gloss">${esc(token.gloss)}</span><span class="token-word">${esc(token.text)}</span>`;
        } else {
          btn.textContent = token.text;
        }
        btn.setAttribute('title', FiezelI18n.t('grammar.token-lepas', 'Ketuk untuk melepas'));
        btn.onclick = () => {
          FiezelGrammarUpgrade.stopActiveVoice();
          if (typeof self.haptic === 'function') self.haptic('tap');
          token.placed = false;
          placedTokens.splice(index, 1);
          vacantSlotIndex = index;
          render();
        };
        railEl.appendChild(btn);
      });

      if (vacantSlotIndex !== null && vacantSlotIndex >= placedTokens.length) {
        const vacantEl = document.createElement('span');
        vacantEl.className = 'gx-vacant-slot';
        vacantEl.innerHTML = vacantSlotHtml();
        vacantEl.onclick = () => {
          if (typeof self.haptic === 'function') self.haptic('tap');
          vacantSlotIndex = null;
          render();
        };
        railEl.appendChild(vacantEl);
      }

      const targetCount = Array.isArray(q.tokens) && q.tokens.length > 0 ? q.tokens.length : 1;
      submitBtn.disabled = placedTokens.length < targetCount;
      if (q.__scaffoldAttempt) {
        submitBtn.classList.add('token-submit-retry');
        submitBtn.innerHTML = `<i data-lucide="rotate-ccw"></i> <span>${FiezelI18n.t('quiz.periksa-ulang', 'Periksa Ulang')}</span>`;
      }
      if (resetBtn) resetBtn.disabled = placedTokens.length === 0;
    };

    let activeRec = null;
    let isListening = false;
    let silenceTimer = null;
    let preVoiceIds = [];
    let hadSpeechResult = false;
    let wasConnected = !!container.isConnected;
    const clearSilenceTimer = () => {
      if (silenceTimer !== null) {
        clearTimeout(silenceTimer);
        silenceTimer = null;
      }
    };
    const updateVoiceBtnUi = () => {
      if (!voiceBtn) return;
      voiceBtn.classList.toggle('is-listening', isListening);
      voiceBtn.setAttribute('aria-pressed', String(isListening));
      const lbl = voiceBtn.querySelector('.gx-voice-label');
      if (lbl) {
        lbl.textContent = isListening
          ? t('grammar.token-voice-listening', 'Mendengarkan...')
          : t('grammar.token-voice-btn', 'Susun Suara');
      }
    };
    const setVoiceStatus = (mode, text) => {
      if (!voiceStatusEl) return;
      voiceStatusEl.className = 'gx-voice-status' + (mode ? ' is-' + mode : '');
      if (!text) {
        voiceStatusEl.hidden = true;
        voiceStatusEl.textContent = '';
        return;
      }
      voiceStatusEl.hidden = false;
      voiceStatusEl.innerHTML = '';
      if (mode === 'listening') {
        const dot = document.createElement('span');
        dot.className = 'gx-voice-dot';
        dot.setAttribute('aria-hidden', 'true');
        voiceStatusEl.appendChild(dot);
      }
      const span = document.createElement('span');
      span.textContent = text;
      voiceStatusEl.appendChild(span);
    };
    const stopListening = (preserveStatus) => {
      clearSilenceTimer();
      const rec = activeRec;
      activeRec = null;
      isListening = false;
      if (rec) {
        try {
          rec.onresult = null;
          rec.onerror = null;
          rec.onend = null;
          if (typeof rec.stop === 'function') rec.stop();
          else if (typeof rec.abort === 'function') rec.abort();
        } catch (_) {
          try { if (typeof rec.abort === 'function') rec.abort(); } catch (__) {}
        }
      }
      if (_activeVoiceController && _activeVoiceController.stop === stopListening) {
        _activeVoiceController = null;
      }
      updateVoiceBtnUi();
      if (!preserveStatus && !hadSpeechResult) {
        setVoiceStatus('', '');
      }
    };
    const armSilenceTimer = (ms) => {
      clearSilenceTimer();
      silenceTimer = setTimeout(() => {
        if (isListening) stopListening(true);
      }, ms);
    };

    const applySpeechEvent = (event) => {
      if (container.isConnected) wasConnected = true;
      if (wasConnected && container.isConnected === false) {
        stopListening(true);
        return;
      }

      const results = event && event.results ? Array.from(event.results) : [];
      const candidates = [];
      let allFinal = false;

      if (results.length > 0) {
        allFinal = results.every((r) => Boolean(r && r.isFinal));
        const lastIdx = results.length - 1;
        const prefix = results
          .slice(0, lastIdx)
          .map((r) => (r && r[0] && r[0].transcript) || '')
          .filter(Boolean)
          .join(' ');
        const lastRes = results[lastIdx];
        const altLen = lastRes && typeof lastRes.length === 'number' ? Math.min(3, lastRes.length) : 0;
        for (let a = 0; a < altLen; a++) {
          const altText = (lastRes[a] && lastRes[a].transcript) || '';
          const combined = [prefix, altText].filter(Boolean).join(' ').trim();
          if (combined) candidates.push(combined);
        }
      } else if (event && typeof event.transcript === 'string' && event.transcript.trim()) {
        candidates.push(event.transcript.trim());
        allFinal = true;
      }

      if (candidates.length === 0) return;

      const preVoiceSet = new Set(preVoiceIds);
      const preTokens = preVoiceIds
        .map((id) => bankTokens.find((t) => t.id === id))
        .filter(Boolean);
      const availableForVoice = bankTokens
        .filter((t) => !preVoiceSet.has(t.id))
        .map((t) => ({ id: t.id, text: t.text, placed: false }));

      let chosen = null;
      let chosenCand = candidates[0];
      for (let i = 0; i < candidates.length; i++) {
        const res = FiezelGrammarUpgrade.matchSpokenTranscriptToTokens(candidates[i], availableForVoice, courseLangKey);
        if (res.commandAction === 'clear') {
          chosen = res;
          chosenCand = candidates[i];
          break;
        }
        if (!chosen || res.matchedIds.length > chosen.matchedIds.length) {
          chosen = res;
          chosenCand = candidates[i];
        }
      }

      if (!chosen) return;
      if (chosen.commandAction === 'clear') {
        bankTokens.forEach((t) => { t.placed = false; });
        placedTokens.length = 0;
        preVoiceIds = [];
        vacantSlotIndex = null;
        hadSpeechResult = true;
        render();
        setVoiceStatus('matched', t('grammar.token-voice-matched', '{cocok} kata tersusun', { cocok: 0 }));
        stopListening(true);
        return;
      }

      if (chosen.matchedIds.length > 0) {
        hadSpeechResult = true;
        const nextTokens = [...preTokens];
        const chosenSet = new Set(preTokens.map((t) => t.id));
        chosen.matchedIds.forEach((id) => {
          if (chosenSet.has(id)) return;
          const tok = bankTokens.find((t) => t.id === id);
          if (tok) {
            chosenSet.add(id);
            nextTokens.push(tok);
          }
        });
        bankTokens.forEach((t) => { t.placed = chosenSet.has(t.id); });
        placedTokens.length = 0;
        placedTokens.push(...nextTokens);
        vacantSlotIndex = null;
        render();
        setVoiceStatus('matched', t('grammar.token-voice-matched', '{cocok} kata tersusun', { cocok: placedTokens.length }));
      } else if (allFinal) {
        setVoiceStatus('error', t('grammar.token-voice-nomatch', 'Belum ada kata yang cocok dari {teks}.', { teks: chosenCand.slice(0, 48) }));
      }

      if (isListening) armSilenceTimer(2600);
    };

    if (voiceBtn) {
      voiceBtn.onclick = () => {
        if (typeof self.haptic === 'function') self.haptic('tap');
        if (isListening) {
          stopListening(true);
          return;
        }
        FiezelGrammarUpgrade.stopActiveVoice();
        const SpeechRec = (typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition))
          || (typeof self !== 'undefined' && (self.SpeechRecognition || self.webkitSpeechRecognition));
        if (!SpeechRec) {
          setVoiceStatus('error', t('grammar.token-voice-unsupported', 'Peramban ini belum mendukung pengenalan suara otomatis.'));
          return;
        }

        preVoiceIds = placedTokens.map((t) => t.id);
        hadSpeechResult = false;
        let rec;
        try {
          rec = new SpeechRec();
        } catch (_) {
          setVoiceStatus('error', t('grammar.token-voice-unsupported', 'Peramban ini belum mendukung pengenalan suara otomatis.'));
          return;
        }

        rec.lang = speechBcp47;
        rec.interimResults = true;
        rec.continuous = true;
        rec.maxAlternatives = 3;

        activeRec = rec;
        isListening = true;
        _activeVoiceController = { stop: stopListening };
        updateVoiceBtnUi();
        setVoiceStatus('listening', t('grammar.token-voice-ready', 'Ucapkan kalimat sesuai kata yang tersedia...'));
        armSilenceTimer(7500);

        rec.onresult = (ev) => applySpeechEvent(ev);
        rec.onerror = (ev) => {
          const err = String(ev && ev.error ? ev.error : '');
          if (err === 'not-allowed' || err === 'service-not-allowed') {
            hadSpeechResult = true;
            setVoiceStatus('error', t('grammar.token-voice-denied', 'Izin mikrofon ditolak. Aktifkan izin mikrofon di peramban.'));
          } else if (err && err !== 'no-speech' && err !== 'aborted') {
            hadSpeechResult = true;
            setVoiceStatus('error', t('grammar.token-voice-unsupported', 'Peramban ini belum mendukung pengenalan suara otomatis.'));
          }
          stopListening(true);
        };
        rec.onend = () => {
          if (activeRec === rec) {
            stopListening(true);
          }
        };

        try {
          rec.start();
        } catch (_) {
          stopListening(false);
          setVoiceStatus('error', t('grammar.token-voice-unsupported', 'Peramban ini belum mendukung pengenalan suara otomatis.'));
        }
      };
    }

    if (resetBtn) {
      resetBtn.onclick = () => {
        stopListening(false);
        if (typeof self.haptic === 'function') self.haptic('tap');
        bankTokens.forEach((token) => { token.placed = false; });
        placedTokens.length = 0;
        preVoiceIds = [];
        vacantSlotIndex = null;
        setVoiceStatus('', '');
        render();
      };
    }

    submitBtn.onclick = () => {
      stopListening(true);
      const HAS_CJK_RE = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/;
      const norm = (s) => {
        const cleaned = String(s || '')
          .toLowerCase()
          .replace(/[^\p{L}\p{N}\s]/gu, '')
          .replace(/\s+/g, ' ')
          .trim();
        return HAS_CJK_RE.test(cleaned) ? cleaned.replace(/\s+/g, '') : cleaned;
      };
      const placedTexts = placedTokens.map(t => t.text);
      const userText = placedTexts.join(' ');
      const userNorm = norm(userText);
      const targetTokenTexts = (q.tokens || []).map(t => typeof t === 'object' && t.text ? t.text : String(t));
      const correctText = targetTokenTexts.join(' ');
      const targets = [correctText, q.options?.[0], ...(q.alternates || [])].filter(Boolean);
      let isCorrect = Boolean(userNorm) && (userText === correctText || targets.some(tgt => norm(tgt) === userNorm));
      let detectedMisconceptionId = null;

      if (!isCorrect && HAS_CJK_RE.test(correctText) && self.FiezelJaConjugator && typeof self.FiezelJaConjugator.validateJapaneseSentenceOrder === 'function') {
        const jaVerdict = self.FiezelJaConjugator.validateJapaneseSentenceOrder(placedTexts, targetTokenTexts);
        if (jaVerdict && jaVerdict.ok && !q.strictOrder) {
          isCorrect = true;
        } else if (jaVerdict && jaVerdict.misconception) {
          detectedMisconceptionId = jaVerdict.misconception;
          q.__detectedMisconceptionId = jaVerdict.misconception;
        }
      }

      const unplacedTokens = bankTokens.filter(t => !t.placed).map(t => t.text);

      // Kiriman SALAH langsung diteruskan ke answer() di app.js. Dulu widget menahan kiriman
      // salah pertama dan memberi petunjuknya sendiri: answer() tidak pernah melihatnya,
      // sehingga murid mendapat tiga kesempatan (bukan dua), salah-lalu-benar tercatat benar
      // di percobaan pertama, dan BrainCore buta terhadap kesalahan pertama (audit
      // BRAINCORE-GRAMMAR-FEEDBACK-AUDIT-2026-10-03 G1). Retry, petunjuk, dan diagnosisnya
      // (diagnoseTokenOrderMistake) sudah dimiliki answer(); widget cukup memberi goyangan.
      if (!isCorrect) {
        railEl.classList.remove('gx-shake');
        void railEl.offsetWidth;
        railEl.classList.add('gx-shake');
      }

      if (typeof onComplete === 'function') {
        onComplete(isCorrect, {
          userText: userText,
          placedTokens: placedTexts,
          unplacedTokens: unplacedTokens,
          misconceptionId: detectedMisconceptionId
        });
      }
    };

    render();
    if (typeof self.enhanceUI === 'function') self.enhanceUI();
    try { if (window.lucide && typeof window.lucide.createIcons === 'function') window.lucide.createIcons(); } catch(_) {}
    return container;
  };

  /**
   * 2. Syntax Highlighter
   * Memberikan penandaan sintaks (warna) untuk kalimat sesuai anotasi atau klasifikasi POS.
   * @param {string} sentence Kalimat utuh
   * @param {Array} annotations Array objek {word: 'kata', type: 'verb'}
   * @returns {string} String HTML dengan tag span
   */
  FiezelGrammarUpgrade.highlightSyntax = function(sentence, annotations) {
    if (!sentence) return '';
    const isEsc = typeof self.esc === 'function';
    const esc = (str) => isEsc ? self.esc(str) : str;

    if (annotations && Array.isArray(annotations) && annotations.length > 0) {
      let result = sentence;
      annotations.forEach(ann => {
        if (ann.word && ann.type) {
          const regex = new RegExp(`\\b(${ann.word})\\b`, 'gi');
          const cls = ann.type === 'target' || ann.type === 'error' ? 'target-word' : `syntax-${ann.type}`;
          result = result.replace(regex, `<span class="${cls}">$1</span>`);
        }
      });
      return result;
    }

    // Auto-highlight jika tidak ada anotasi manual
    const words = String(sentence).split(/(\s+)/);
    return words.map(w => {
      if (/^\s+$/.test(w)) return w;
      const type = FiezelGrammarUpgrade.classifyWord(w);
      return type ? `<span class="syntax-${type}">${esc(w)}</span>` : esc(w);
    }).join('');
  };

  /**
   * 2b. Target Word Formatter for Sentence Correction & Fill-in Questions
   * Formats the target word/error token with distinct highlight tint, underline, and italic styling.
   * @param {string} stem Kalimat utama soal
   * @param {string} [targetWord] Kata target spesifik jika ada
   * @param {Array} [options] Pilihan jawaban untuk deteksi otomatis
   * @param {string} [instruction] Instruksi soal untuk deteksi mode repair
   * @returns {string} String HTML aman dengan tag <span class="target-word">
   */
  FiezelGrammarUpgrade.formatTargetWord = function(stem, targetWord, options, instruction) {
    if (!stem) return '';
    const esc = (str) => {
      if (typeof self !== 'undefined' && typeof self.esc === 'function') return self.esc(str);
      return String(str ?? '')
        .split('&').join('&amp;')
        .split('<').join('&lt;')
        .split('>').join('&gt;')
        .split('"').join('&quot;')
        .split("'").join('&#039;');
    };

    // Jika sudah ada tag target-word, kembalikan langsung
    if (/<span class="target-word">|<mark>|<u><i>|<i><u>/i.test(stem)) return stem;

    // 1. Tangani penanda eksplisit dalam teks jika ada: *kata*, [kata], <u>kata</u>
    const mdMatch = stem.match(/(\*|_|<u>|\[)([A-Za-z0-9_’'\s-]{1,40})(\*|_|<\/u>|\])/i);
    if (mdMatch && !/_{2,}|\[\.\.\.\]/.test(mdMatch[0])) {
      const matchIndex = mdMatch.index;
      const fullLen = mdMatch[0].length;
      const word = mdMatch[2].trim();
      const before = stem.slice(0, matchIndex);
      const after = stem.slice(matchIndex + fullLen);
      return `${esc(before)}<span class="target-word">${esc(word)}</span>${esc(after)}`;
    }

    const stripQuotes = (s) => {
      let r = String(s || '').trim();
      const openQuotes = ['"', "'", '\u201c', '\u2018'];
      const closeQuotes = ['"', "'", '\u201d', '\u2019'];
      if (r.length >= 2) {
        const first = r[0];
        const last = r[r.length - 1];
        const openIdx = openQuotes.indexOf(first);
        const closeIdx = closeQuotes.indexOf(last);
        if (openIdx !== -1 && closeIdx !== -1) {
          return r.slice(1, -1).trim();
        }
      }
      return r;
    };

    let target = stripQuotes(targetWord);

    // 2. Deteksi otomatis jika target belum diset eksplisit dan instruksi meminta perbaikan kalimat
    if (!target && /perbaiki|repair|koreksi|ganti|benahi|ubah|salah|pilihan yang tepat|correct|fix|pilihlah|แก้ไข/i.test(instruction || '')) {
      const quoteMatch = stem.match(new RegExp('[\\x22\\u201c\\x27\\u2018]([A-Za-z0-9_\\u2019\\x27-]{1,30})[\\x22\\u201d\\x27\\u2019]'));
      if (quoteMatch && quoteMatch[1]) {
        target = quoteMatch[1];
      } else if (Array.isArray(options) && options.length > 0) {
        const sortedOpts = [...options]
          .map(opt => stripQuotes(opt))
          .filter(Boolean)
          .sort((a, b) => b.length - a.length);

        for (const cleanOpt of sortedOpts) {
          const cleanOptionText = cleanOpt.replace(/^\[|\]$/g, '').trim();
          const escOpt = (cleanOptionText || cleanOpt).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const optRegex = new RegExp('(?:^|[^A-Za-z0-9])(' + escOpt + ')(?:[^A-Za-z0-9]|$)', 'i');
          if (optRegex.test(stem)) {
            target = cleanOptionText || cleanOpt;
            break;
          }
        }
      }
    }

    if (target) {
      const cleanTarget = target.replace(/^\[|\]$/g, '').trim();
      const escTarget = (cleanTarget || target).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp('(^|[^A-Za-z0-9])(' + escTarget + ')([^A-Za-z0-9]|$)', 'i');
      const match = stem.match(regex);
      if (match) {
        const matchIndex = match.index + match[1].length;
        const wordLen = match[2].length;
        const before = stem.slice(0, matchIndex);
        const word = stem.slice(matchIndex, matchIndex + wordLen);
        const after = stem.slice(matchIndex + wordLen);
        return `${esc(before)}<span class="target-word">${esc(word)}</span>${esc(after)}`;
      }
    }

    return esc(stem);
  };

  /**
   * 3. 4-Level Progressive Disclosure Grammar Hint Popover
   * Menampilkan panduan tata bahasa 4 tingkat:
   * Level 1: Arah Fokus (Conceptual Orientation)
   * Level 2: Aturan Pola (Grammar Rule)
   * Level 3: Waspada Jebakan (Distractor Warning / Trap Avoidance)
   * Level 4: Kunci Pemahaman & Memori (Deep Why + Mnemonic Cue)
   * @param {Object|string} qOrRule Objek pertanyaan atau string rule
   * @param {HTMLElement} anchorEl Elemen jangkar tempat popover akan muncul
   */
  FiezelGrammarUpgrade.showGrammarHint = function(qOrRule, anchorEl) {
    const isEsc = typeof self.esc === 'function';
    const esc = (str) => isEsc ? self.esc(str) : str;

    let existing = document.getElementById('grammarHintPopover');
    if (existing) {
      // Jika popover sudah ada dan dipanggil kembali, majukan tingkat disclosure atau dismiss jika sudah level 4
      const currentLevel = parseInt(existing.getAttribute('data-level') || '1', 10);
      if (currentLevel < 4) {
        existing.remove();
        return FiezelGrammarUpgrade._renderHintPopover(qOrRule, anchorEl, currentLevel + 1);
      } else {
        existing.remove();
        return;
      }
    }

    FiezelGrammarUpgrade._renderHintPopover(qOrRule, anchorEl, 1);
  };

  FiezelGrammarUpgrade._renderHintPopover = function(qOrRule, anchorEl, initialLevel = 1) {
    const isEsc = typeof self.esc === 'function';
    const esc = (str) => isEsc ? self.esc(str) : str;

    const q = (typeof qOrRule === 'object' && qOrRule !== null) ? qOrRule : { explain: { rule: String(qOrRule || '') } };
    const exp = q.explain || {};
    // Audit pedagogi 2026-10-11 (P2): petunjuk ini dibuka SEBELUM murid menjawab. Saran
    // menghindar (106 templat) dan pegangan ingatan (36 templat) sering ditutup dengan kuncinya
    // ("Kalau iya, cuma “whose” yang bisa dipakai"), jadi kuncinya disamarkan jadi "…" lewat
    // grammarHideKey() milik app.js - aturannya tetap terbaca, bentuknya harus diingat sendiri.
    const keyText = (Array.isArray(q.options) && Number.isInteger(q.answerIndex)) ? String(q.options[q.answerIndex] || '') : '';
    const hideKey = (t) => (t && keyText && typeof self.grammarHideKey === 'function') ? self.grammarHideKey(t, keyText) : t;

    const levels = [
      {
        num: 1,
        title: FiezelI18n.t('grammar.hint-level-1', 'Arah Fokus'),
        text: exp.clue || q.pedagogicalObjective || FiezelI18n.t('grammar.hint-fallback', 'Perhatikan subjek kalimat dan penanda waktu untuk menentukan bentuk yang tepat.')
      },
      {
        num: 2,
        title: FiezelI18n.t('grammar.hint-level-2', 'Aturan Pola'),
        text: exp.rule || q.rule || FiezelI18n.t('quiz.fallback-context', 'Gunakan pola bentuk kata kerja yang sesuai dengan subjek.')
      },
      {
        num: 3,
        title: FiezelI18n.t('grammar.hint-level-3', 'Waspada Jebakan'),
        text: hideKey(exp.avoid) || FiezelI18n.t('quiz.fallback-hint-check', 'Hati-hati dengan pilihan pengecoh yang mirip tapi tidak sesuai konteks kalimat.')
      },
      {
        num: 4,
        title: FiezelI18n.t('grammar.hint-level-4', 'Kunci & Memori'),
        // Audit G8: dulu tingkat ini membuka `explain.why` - kalimat "kenapa jawaban benar itu
        // benar" yang pada ±78% soal menyebut kuncinya, SEBELUM murid menjawab. Kini hanya
        // pegangan ingatan; alasan lengkapnya tetap ada di pembahasan sesudah menjawab.
        text: exp.memory ? `💡 ${hideKey(exp.memory)}` : FiezelI18n.t('quiz.fallback-hint-connect', 'Ingat pola kalimat dan hubungannya dengan subjek.')
      }
    ];

    let currentLvl = Math.max(1, Math.min(4, initialLevel));

    const popover = document.createElement('div');
    popover.id = 'grammarHintPopover';
    popover.className = 'grammar-hint-popover grammar-hint-sheet fade-in';
    popover.setAttribute('data-level', String(currentLvl));
    popover.setAttribute('role', 'dialog');
    popover.setAttribute('aria-modal', 'true');

    const updateContent = () => {
      popover.setAttribute('data-level', String(currentLvl));
      // Audit G8: tingkat petunjuk tertinggi yang DILIHAT murid dicatat di soal; app.js
      // menuliskannya ke baris riwayat dan meringankan bobot bukti jawaban benar sesudahnya.
      if (typeof qOrRule === 'object' && qOrRule !== null) {
        qOrRule.__hintLevel = Math.max(Number(qOrRule.__hintLevel) || 0, currentLvl);
      }
      const cur = levels[currentLvl - 1];

      popover.innerHTML = `
        <div class="hint-sheet-handle" aria-hidden="true"></div>
        <div class="hint-popover-header">
          <div style="display:flex;align-items:center;gap:6px">
            <i data-lucide="info"></i>
            <strong>${FiezelI18n.t('grammar.petunjuk', 'Petunjuk Tata Bahasa')}</strong>
          </div>
          <span class="hint-level-pill">${currentLvl}/4</span>
          <button type="button" id="hintCloseBtn" class="hint-close-btn" aria-label="${FiezelI18n.t('modal.tutup', 'Tutup')}"><i data-lucide="x"></i></button>
        </div>
        <div class="hint-step-indicator" aria-hidden="true">
          ${[1,2,3,4].map(i => `<div class="hint-step-dot${i <= currentLvl ? ' active' : ''}"></div>`).join('')}
        </div>
        <div class="hint-body">
          <p class="hint-body-title">${esc(cur.title)}</p>
          <p class="hint-body-text">${typeof self.formatRuleForDisplay === 'function' ? self.formatRuleForDisplay(esc(cur.text)) : esc(cur.text)}</p>
        </div>
        <div class="hint-popover-actions">
          ${currentLvl < 4
            ? `<button type="button" class="hint-next-btn" id="hintNextBtn">${FiezelI18n.t('grammar.hint-next', 'Petunjuk Berikutnya')} <i data-lucide="arrow-right"></i></button>`
            : `<button type="button" class="hint-next-btn" id="hintNextBtn"><i data-lucide="check"></i> ${FiezelI18n.t('grammar.hint-close', 'Mengerti')}</button>`
          }
        </div>
      `;

      if (typeof self.enhanceUI === 'function') self.enhanceUI();

      const closeBtn = popover.querySelector('#hintCloseBtn') || popover.querySelector('.hint-close-btn');
      if (closeBtn) {
        closeBtn.onclick = (e) => {
          if (e && e.stopPropagation) e.stopPropagation();
          popover.remove();
        };
      }

      const nextBtn = popover.querySelector('#hintNextBtn');
      if (nextBtn) {
        nextBtn.onclick = (e) => {
          if (e && e.stopPropagation) e.stopPropagation();
          if (currentLvl < 4) {
            currentLvl++;
            updateContent();
          } else {
            popover.remove();
          }
        };
      }
    };

    updateContent();
    document.body.appendChild(popover);

    const dismiss = (e) => {
      if (popover.parentNode && !popover.contains(e.target) && (!anchorEl || e.target !== anchorEl)) {
        popover.remove();
        document.removeEventListener('click', dismiss);
        document.removeEventListener('touchstart', dismiss);
      }
    };

    setTimeout(() => {
      document.addEventListener('click', dismiss);
      document.addEventListener('touchstart', dismiss, { passive: true });
    }, 100);
  };

  /**
   * 4. Enhanced Feedback Builder (Non-punitive Bottom Sheet)
   * Membangun HTML umpan balik dengan non-punitive sheet, rule pill, dan AI Explain.
   * @param {Object} q Objek pertanyaan
   * @param {number} j Indeks opsi yang dipilih
   * @param {boolean} ok Status benar/salah
   * @returns {string} Markup HTML
   */
  FiezelGrammarUpgrade.buildFeedbackHTML = function(q, j, ok) {
    const isEsc = typeof self.esc === 'function';
    const esc = (str) => isEsc ? self.esc(str) : str;

    const pickedOption = q.__userTokenAnswer || (q.options ? q.options[j] : '');
    const correctOption = (q.tokens ? q.tokens.join(' ') : '') || (q.options ? q.options[q.answerIndex] : '');

    const icon = ok ? 'circle-check-big' : 'circle-x';
    const title = ok ? FiezelI18n.t('quiz.verdict-correct', 'Tepat sekali!') : FiezelI18n.t('quiz.verdict-wrong', 'Belum tepat');

    let pickedWhyFails = '';
    if (!ok && (q.type === 'grammar') && q.explain && Array.isArray(q.explain.distractors)) {
      const dist = q.explain.distractors.find(x => x.option && pickedOption && String(x.option).toLowerCase() === String(pickedOption).toLowerCase());
      pickedWhyFails = dist ? (dist.reason || '').trim() : '';
    }

    const whyText = q.explain && q.explain.why ? esc(q.explain.why) : FiezelI18n.t('quiz.fallback-context', 'Pemakaian bentuk yang tepat.');
    const ruleText = q.explain && q.explain.rule ? esc(q.explain.rule) : '';
    const memoryTip = q.explain && q.explain.memory ? esc(q.explain.memory) : FiezelI18n.t('quiz.fallback-hint-connect', 'Ingat pola kalimatnya.');

    return `
      <div class="feedback-title">
        <i data-lucide="${icon}"></i><b>${title}</b>
      </div>

      <div class="feedback-comparison">
        ${ok
          ? `<p>${FiezelI18n.t('quiz.correct-answer', { answer: `<strong>${esc(pickedOption)}</strong>` })}</p>`
          : `<p class="wrong-pick"><i data-lucide="x"></i> ${FiezelI18n.t('quiz.jawabanmu', 'Jawabanmu:')} <strong>${esc(pickedOption)}</strong></p>
             <p class="correct-pick"><i data-lucide="check"></i> ${FiezelI18n.t('quiz.answer-paling-tepat-adalah', 'Yang benar:')} <strong>${esc(correctOption)}</strong></p>`
        }
      </div>

      ${pickedWhyFails ? `<div class="feedback-your-pick-box"><p><strong>${FiezelI18n.t('quiz.mengapa-salah', 'Mengapa kurang tepat?')}</strong> ${esc(pickedWhyFails)}</p></div>` : ''}

      <div class="feedback-rule-pill grammar-rule-pill">
        <p class="grammar-rule-why"><strong>${FiezelI18n.t('quiz.intinya', 'Intinya:')}</strong> ${whyText}</p>
        ${ruleText ? `<p class="grammar-rule-text"><strong>${FiezelI18n.t('quiz.aturannya', 'Aturannya:')}</strong> ${ruleText}</p>` : ''}
      </div>

      ${(q.contrast || q.explain?.contrast) ? `
      <div class="gx-contrast-card">
        <div class="gx-contrast-title">💡 ${FiezelI18n.t('grammar.contrast-title')}</div>
        <div class="gx-contrast-body">${esc(q.contrast || q.explain?.contrast)}</div>
      </div>` : ''}

      <div class="feedback-memory-box memory-tip">
        <div class="feedback-memory-header">
          <i data-lucide="lightbulb"></i>
          <span class="feedback-memory-kicker">${FiezelI18n.t('quiz.trik-ingat', 'Trik Cepat Ingat')}</span>
        </div>
        <div class="feedback-memory-content">
          ${FiezelGrammarUpgrade.formatMemoryTip ? FiezelGrammarUpgrade.formatMemoryTip(memoryTip) : ('<span>' + memoryTip + '</span>')}
        </div>
      </div>

      <button class="ai-btn" id="aiExplainBtn">
        <i data-lucide="sparkles"></i> ${FiezelI18n.t('quiz.jelaskan-dengan-cara-lebih-sederhana', 'Jelaskan lebih sederhana')}
      </button>
    `;
  };

  /**
   * Helper format tips mengingat: memformat perbandingan rumus (=) menjadi bullet terstruktur
   */
  FiezelGrammarUpgrade.formatMemoryTip = function(txt) {
    if (!txt) return '';
    let s = String(txt).trim();
    s = s.replace(/\b(Trik cepat|Tips cepat|Tips|Trik ingat|Catatan):/gi, '<strong>$1:</strong>');
    return `<span>${s}</span>`;
  };

  /**
   * 5. Mistake Vault Manager
   * Melacak antrean kesalahan grammar dengan SRS queue dan 2-session graduation.
   */
  FiezelGrammarUpgrade.getMistakeCount = function() {
    if (!self.state) return 0;
    if (self.state.mistakeVault && Object.keys(self.state.mistakeVault).length > 0) {
      return Object.keys(self.state.mistakeVault).length;
    }
    // Fallback baca dari riwayat jika mistakeVault belum diinisialisasi
    if (self.state.history && Array.isArray(self.state.history)) {
      const s = new Set();
      self.state.history.slice(-50).forEach(h => {
        if ((h.type === 'grammar' || h.domain === 'grammar') && !h.ok && (h.skill || h.lessonSkill)) {
          s.add(h.skill || h.lessonSkill);
        }
      });
      return s.size;
    }
    return 0;
  };

  FiezelGrammarUpgrade.renderVaultCard = function() {
    const count = this.getMistakeCount();
    if (!count || count <= 0) return '';

    const cardHtml = `
      <div class="row">
        <b><i data-lucide="archive"></i> ${FiezelI18n.t('grammar.mistake-vault-title', 'Koleksi Kesalahan')}</b>
        <span>${count} ${FiezelI18n.t('grammar.mistake-vault-items', 'catatan')}</span>
      </div>
      <p class="muted">
        ${FiezelI18n.t('grammar.mistake-vault-desc-active', 'Latih kembali polanya sampai tuntas 2x sesi.')}
      </p>
      <button onclick="startMistakeVaultSession()" class="primary">
        ${FiezelI18n.t('grammar.mistake-vault-btn', 'Latih Kesalahan')} <i data-lucide="arrow-right"></i>
      </button>
    `;

    return typeof self.card === 'function' ? self.card(cardHtml, 'mistake-vault-card') : `<div class="card mistake-vault-card">${cardHtml}</div>`;
  };

  FiezelGrammarUpgrade.clearMistake = function(skillId) {
    if (!self.state) return;
    if (!self.state.mistakeVault) self.state.mistakeVault = {};
    if (self.state.mistakeVault[skillId]) {
      delete self.state.mistakeVault[skillId];
      if (typeof self.saveState === 'function') self.saveState();
    }
  };

  /**
   * 6. Mastery Tier Calculator
   * Menghitung tingkatan penguasaan dari 1 sampai 4.
   * @param {string} skill ID skill grammar
   * @param {number} [explicitMastery] Nilai mastery opsional
   * @returns {number} Tingkatan penguasaan (1, 2, 3, atau 4)
   */
  FiezelGrammarUpgrade.getMasteryTier = function(skill, explicitMastery) {
    let mastery = 0;
    if (typeof explicitMastery === 'number') {
      mastery = explicitMastery;
    } else if (self.state?.grammar?.[skill]?.mastery) {
      mastery = self.state.grammar[skill].mastery;
    }

    if (mastery < 40) return 1; // Tier 1: Recognition
    if (mastery >= 40 && mastery < 70) return 2; // Tier 2: Practice
    if (mastery >= 70 && mastery < 90) return 3; // Tier 3: Production
    if (mastery >= 90) return 4; // Tier 4: Mastered

    return 1;
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = FiezelGrammarUpgrade;
  }
  if (typeof self !== 'undefined') {
    self.FiezelGrammarUpgrade = FiezelGrammarUpgrade;
  }

})();
