/**
 * FIEZEL · features/japanese/fiezel-ja-ui.js — PERMUKAAN KHUSUS KURSUS BAHASA JEPANG
 *
 * Kursus Jepang tidak cukup dibedakan lewat warna. Aplikasi belajar Jepang yang dipakai
 * murid (LingoDeer, Bunpro, LingQ, tabel kana StudyX/Hanabira, jalur JLPT Migii) berbagi
 * beberapa pola yang tidak punya padanan di kursus Inggris, dan modul ini membawanya:
 *
 *   1. Furigana sebagai <ruby> di atas kanji + romaji terpisah, masing-masing bisa
 *      disembunyikan (ふりがな / ローマ字). Pilihan disimpan per perangkat dan diterapkan
 *      sebagai kelas body, jadi mengubahnya tidak melukis ulang layar - kuis yang sedang
 *      berjalan tidak kehilangan jawabannya.
 *   2. Tabel kana (gojūon + dakuten/handakuten), hiragana ↔ katakana dengan satu tombol.
 *   3. Kartu "Segera hadir" untuk bagian yang belum punya isi Jepang yang jujur
 *      (menyimak/berbicara masih bersuara Inggris, kanji dan simulasi JLPT belum ada).
 *      Kartunya tidak bisa diketuk, jadi tidak menjanjikan apa pun yang tidak ada.
 *   4. Kata hari ini (今日の言葉) di beranda, dipilih deterministik dari bank level aktif.
 *   5. Label level JLPT (A1 → N5 ...) untuk tampilan saja; data tetap CEFR.
 *
 * Semua teks lewat FiezelI18n (kunci 'jepang.*' di copy-*-bahasa.js). Istilah Jepang
 * identik di id dan th, keterangannya diterjemahkan.
 */
(function (root) {
  'use strict';
  if (!root || root.FiezelJaUi) return;

  var STORE_KEY = 'fiezel-ja-display-v1';
  var KANJI_RE = /[㐀-䶿一-鿿々]/;
  var JLPT_BY_LEVEL = { A1: 'N5', A2: 'N4', B1: 'N3', B2: 'N2', C1: 'N1', C2: 'N1' };
  var script = 'hiragana';

  function t(key, params) {
    var i18n = root.FiezelI18n;
    return i18n && typeof i18n.t === 'function' ? i18n.t(key, params) : key;
  }
  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ---------- Preferensi tampilan: furigana & romaji ---------- */
  function readPrefs() {
    try {
      var raw = JSON.parse(root.localStorage.getItem(STORE_KEY) || '{}') || {};
      return { furigana: raw.furigana !== false, romaji: raw.romaji !== false };
    } catch (_) {
      return { furigana: true, romaji: true };
    }
  }
  function writePrefs(prefs) {
    try { root.localStorage.setItem(STORE_KEY, JSON.stringify(prefs)); } catch (_) {}
  }
  function applyPrefs() {
    var prefs = readPrefs();
    var body = root.document && root.document.body;
    if (body) {
      body.classList.toggle('fz-ja-no-furigana', !prefs.furigana);
      body.classList.toggle('fz-ja-no-romaji', !prefs.romaji);
    }
    if (root.document) {
      root.document.querySelectorAll('[data-ja-toggle]').forEach(function (btn) {
        btn.setAttribute('aria-pressed', prefs[btn.getAttribute('data-ja-toggle')] ? 'true' : 'false');
      });
    }
    return prefs;
  }
  function toggle(which) {
    if (which !== 'furigana' && which !== 'romaji') return readPrefs();
    var prefs = readPrefs();
    prefs[which] = !prefs[which];
    writePrefs(prefs);
    return applyPrefs();
  }
  function togglesMarkup(only) {
    var prefs = readPrefs();
    function btn(which, labelKey, ariaKey) {
      return '<button type="button" class="ja-toggle" data-ja-toggle="' + which + '" aria-pressed="' +
        (prefs[which] ? 'true' : 'false') + '" aria-label="' + esc(t(ariaKey)) + '" onclick="FiezelJaUi.toggle(\'' +
        which + '\')"><span lang="ja">' + esc(t(labelKey)) + '</span></button>';
    }
    return '<div class="ja-display" role="group" aria-label="' + esc(t('jepang.tampilan-aria')) + '">' +
      (only === 'romaji' ? '' : btn('furigana', 'jepang.furigana', 'jepang.furigana-aria')) +
      btn('romaji', 'jepang.romaji', 'jepang.romaji-aria') + '</div>';
  }

  /* ---------- Kata Jepang: furigana di atas kanji, romaji terpisah ---------- */
  /** phonetic bank Jepang berbentuk "かな · romaji". */
  function splitPhonetic(phonetic) {
    var parts = String(phonetic || '').split(' · ');
    if (parts.length !== 2 || !parts[0].trim()) return null;
    return { kana: parts[0].trim(), romaji: parts[1].trim() };
  }
  /** Furigana hanya di atas kanji: okurigana di ujung (行きます → 行[い]きます) dibiarkan polos,
   *  seperti di buku ajar dan aplikasi Jepang. */
  function rubyHtml(text, kana, attrs) {
    var open = '<ruby class="ja-word"' + (attrs || '') + '>';
    var m = String(text).match(/^([\u3400-\u4dbf\u4e00-\u9fff\u3005]+)([\u3040-\u309f]+)$/);
    if (m && kana.length > m[2].length && kana.slice(-m[2].length) === m[2]) {
      return open + esc(m[1]) + '<rp>(</rp><rt>' + esc(kana.slice(0, kana.length - m[2].length)) +
        '</rt><rp>)</rp></ruby>' + esc(m[2]);
    }
    return open + esc(text) + '<rp>(</rp><rt>' + esc(kana) + '</rt><rp>)</rp></ruby>';
  }
  function wordMarkup(word, phonetic) {
    var reading = splitPhonetic(phonetic);
    if (!reading || !KANJI_RE.test(String(word || ''))) {
      return '<span class="ja-word" lang="ja">' + esc(word) + '</span>';
    }
    return '<span class="ja-word-wrap" lang="ja">' + rubyHtml(word, reading.kana) + '</span>';
  }
  /** Baris di bawah kata: kana sudah duduk di atas kanji sebagai furigana, jadi baris ini
   *  hanya membawa romaji - kecuali kata tanpa kanji, yang kananya adalah kata itu sendiri. */
  function phoneticMarkup(phonetic) {
    var reading = splitPhonetic(phonetic);
    if (!reading) return esc(phonetic);
    return '<span class="ja-romaji">' + esc(reading.romaji) + '</span>';
  }

  /* ---------- Tabel kana ---------- */
  var GOJUON = [
    ['a', 'あ', 'i', 'い', 'u', 'う', 'e', 'え', 'o', 'お'],
    ['ka', 'か', 'ki', 'き', 'ku', 'く', 'ke', 'け', 'ko', 'こ'],
    ['sa', 'さ', 'shi', 'し', 'su', 'す', 'se', 'せ', 'so', 'そ'],
    ['ta', 'た', 'chi', 'ち', 'tsu', 'つ', 'te', 'て', 'to', 'と'],
    ['na', 'な', 'ni', 'に', 'nu', 'ぬ', 'ne', 'ね', 'no', 'の'],
    ['ha', 'は', 'hi', 'ひ', 'fu', 'ふ', 'he', 'へ', 'ho', 'ほ'],
    ['ma', 'ま', 'mi', 'み', 'mu', 'む', 'me', 'め', 'mo', 'も'],
    ['ya', 'や', '', '', 'yu', 'ゆ', '', '', 'yo', 'よ'],
    ['ra', 'ら', 'ri', 'り', 'ru', 'る', 're', 'れ', 'ro', 'ろ'],
    ['wa', 'わ', '', '', '', '', '', '', 'wo', 'を'],
    ['n', 'ん', '', '', '', '', '', '', '', '']
  ];
  var DAKUTEN = [
    ['ga', 'が', 'gi', 'ぎ', 'gu', 'ぐ', 'ge', 'げ', 'go', 'ご'],
    ['za', 'ざ', 'ji', 'じ', 'zu', 'ず', 'ze', 'ぜ', 'zo', 'ぞ'],
    ['da', 'だ', 'ji', 'ぢ', 'zu', 'づ', 'de', 'で', 'do', 'ど'],
    ['ba', 'ば', 'bi', 'び', 'bu', 'ぶ', 'be', 'べ', 'bo', 'ぼ'],
    ['pa', 'ぱ', 'pi', 'ぴ', 'pu', 'ぷ', 'pe', 'ぺ', 'po', 'ぽ']
  ];
  /** Katakana = hiragana + 0x60 untuk seluruh blok yang dipakai tabel ini. */
  function toKatakana(kana) {
    return String(kana).replace(/[ぁ-ゖ]/g, function (c) {
      return String.fromCharCode(c.charCodeAt(0) + 0x60);
    });
  }
  function kanaRows(rows) {
    return rows.map(function (row) {
      var cells = '';
      for (var i = 0; i < row.length; i += 2) {
        var romaji = row[i], kana = row[i + 1];
        if (!kana) { cells += '<span class="kana-cell is-empty" aria-hidden="true"></span>'; continue; }
        var shown = script === 'katakana' ? toKatakana(kana) : kana;
        cells += '<span class="kana-cell" role="listitem" aria-label="' + esc(shown + ' ' + romaji) + '">' +
          '<b lang="ja">' + esc(shown) + '</b><small class="ja-romaji">' + esc(romaji) + '</small></span>';
      }
      return cells;
    }).join('');
  }
  function setScript(next) {
    script = next === 'katakana' ? 'katakana' : 'hiragana';
    var host = root.document && root.document.getElementById('jaKanaChart');
    if (host) host.outerHTML = kanaChartMarkup();
    applyPrefs();
  }
  function kanaChartMarkup() {
    function tab(which, labelKey) {
      return '<button type="button" class="kana-tab" role="tab" aria-selected="' + (script === which) +
        '" onclick="FiezelJaUi.setScript(\'' + which + '\')"><span lang="ja">' + esc(t(labelKey)) + '</span></button>';
    }
    return '<div id="jaKanaChart" class="ja-kana">' +
      '<div class="kana-tabs" role="tablist">' + tab('hiragana', 'jepang.hiragana') + tab('katakana', 'jepang.katakana') + '</div>' +
      '<h2 class="kana-heading">' + esc(t('jepang.kana-dasar')) + '</h2>' +
      '<div class="kana-grid" role="list">' + kanaRows(GOJUON) + '</div>' +
      '<h2 class="kana-heading">' + esc(t('jepang.kana-dakuten')) + '</h2>' +
      '<div class="kana-grid" role="list">' + kanaRows(DAKUTEN) + '</div></div>';
  }
  function kanaViewBody() {
    /* Kana tidak punya furigana; di tabel ini hanya romaji yang bisa disembunyikan. */
    return togglesMarkup('romaji') + kanaChartMarkup();
  }

  /* ---------- Kartu Renshū: kana (aktif) + "Segera hadir" ---------- */
  var SOON = [
    { key: 'chokai', icon: 'listening' },
    { key: 'kaiwa', icon: 'speaking' },
    { key: 'kanji', icon: 'writing' },
    { key: 'moshi', icon: 'progress' }
  ];
  function kanaCardMarkup() {
    var label = t('jepang.kana-kartu');
    return '<button class="launch-card ja-kana-card" onclick="go(\'kana\')" aria-label="' + esc(label) + '">' +
      '<span class="launch-icon ja-glyph" lang="ja" aria-hidden="true">あ</span><span><small>' +
      esc(t('jepang.kana-note')) + '</small><b>' + esc(label) + '</b></span><i data-lucide="arrow-up-right"></i></button>';
  }
  function chokaiCardMarkup() {
    var label = t('jepang.chokai') + ' JLPT (N5 & N4)';
    return '<button type="button" class="launch-card ja-chokai-card" onclick="openListeningPanel()" aria-label="' + esc(label) + '">' +
      '<span class="launch-icon ja-glyph" style="background:#FFF3C4;color:#B45309;" aria-hidden="true">🎧</span><span><small>' +
      esc(t('jepang.chokai-note')) + ' · 30 Audio JEES</small><b>' + esc(label) + '</b></span><i data-lucide="arrow-up-right"></i></button>';
  }
  function comingSoonMarkup() {
    var cards = SOON.map(function (item) {
      var name = t('jepang.' + item.key);
      return '<div class="launch-card ja-soon" aria-disabled="true" aria-label="' +
        esc(t('jepang.segera-aria', { nama: name })) + '"><span class="launch-icon"><i class="fz-i" data-fz-icon="' +
        esc(item.icon) + '" aria-hidden="true"></i></span><span><small>' + esc(t('jepang.' + item.key + '-note')) +
        '</small><b>' + esc(name) + '</b></span><span class="ja-soon-badge">' + esc(t('jepang.segera-hadir')) + '</span></div>';
    }).join('');
    return '<section class="ja-soon-section"><h2>' + esc(t('jepang.segera-bagian')) + '</h2>' +
      '<div class="learning-launcher">' + cards + '</div></section>';
  }

  /* ---------- Kata hari ini ---------- */
  function wordOfDay(pool, now) {
    var list = (pool || []).filter(function (v) { return v && v.word && v.meaning; });
    if (!list.length) return null;
    var day = Math.floor((now || Date.now()) / 86400000);
    return list[day % list.length];
  }
  function wordOfDayMarkup(pool, now) {
    var v = wordOfDay(pool, now);
    if (!v) return '';
    return '<section class="ja-kotoba card" aria-label="' + esc(t('jepang.kata-hari-ini')) + '">' +
      '<div class="ja-kotoba-head"><span class="today-eyebrow">' + esc(t('jepang.kata-hari-ini')) + '</span>' +
      togglesMarkup() + '</div>' +
      '<p class="ja-kotoba-word">' + wordMarkup(v.word, v.phonetic) + '</p>' +
      '<p class="ja-kotoba-reading">' + phoneticMarkup(v.phonetic) + '</p>' +
      '<p class="ja-kotoba-meaning">' + esc(v.meaning) + '</p></section>';
  }

  /* ---------- Anotasi soal & jawaban: furigana + romaji dari bank kosakata ----------
     Teks soal, pilihan jawaban, dan pembahasan tidak menyimpan cara baca. Pembacanya
     diturunkan dari bank kosakata Jepang (kata + kana + romaji): kata utuh dicocokkan
     terpanjang lebih dulu, lalu "batang" kanji dari kata ber-okurigana (遊ぶ/あそぶ → 遊 = あそ)
     supaya bentuk berkonjugasi (遊びます) tetap mendapat furigana. Romaji hanya ditulis bila
     SELURUH potongan Jepang bisa dibaca - romaji setengah jadi lebih menyesatkan daripada
     tidak ada. */
  var KANA_ROMAJI = (function () {
    var base = {
      'あ':'a','い':'i','う':'u','え':'e','お':'o','か':'ka','き':'ki','く':'ku','け':'ke','こ':'ko',
      'さ':'sa','し':'shi','す':'su','せ':'se','そ':'so','た':'ta','ち':'chi','つ':'tsu','て':'te','と':'to',
      'な':'na','に':'ni','ぬ':'nu','ね':'ne','の':'no','は':'ha','ひ':'hi','ふ':'fu','へ':'he','ほ':'ho',
      'ま':'ma','み':'mi','む':'mu','め':'me','も':'mo','や':'ya','ゆ':'yu','よ':'yo',
      'ら':'ra','り':'ri','る':'ru','れ':'re','ろ':'ro','わ':'wa','を':'o','ん':'n',
      'が':'ga','ぎ':'gi','ぐ':'gu','げ':'ge','ご':'go','ざ':'za','じ':'ji','ず':'zu','ぜ':'ze','ぞ':'zo',
      'だ':'da','ぢ':'ji','づ':'zu','で':'de','ど':'do','ば':'ba','び':'bi','ぶ':'bu','べ':'be','ぼ':'bo',
      'ぱ':'pa','ぴ':'pi','ぷ':'pu','ぺ':'pe','ぽ':'po','ぁ':'a','ぃ':'i','ぅ':'u','ぇ':'e','ぉ':'o','ゔ':'vu'
    };
    return base;
  }());
  var YOON = { 'ゃ': 'a', 'ゅ': 'u', 'ょ': 'o' };
  var PUNCT = { '。': '.', '、': ',', '！': '!', '？': '?', '「': '"', '」': '"', '『': '"', '』': '"', '・': ' ', '　': ' ', '～': '~', '（': '(', '）': ')' };
  var PARTICLES = { 'は': 'wa', 'へ': 'e', 'を': 'o', 'が': 'ga', 'に': 'ni', 'で': 'de', 'と': 'to', 'も': 'mo', 'の': 'no', 'や': 'ya', 'か': 'ka', 'ね': 'ne', 'よ': 'yo' };
  var JA_RUN_RE = /[぀-ヿ㐀-䶿一-鿿々　-〿！-／：-？～]+/g;
  var HAS_JA_RE = /[぀-ヿ㐀-䶿一-鿿]/;

  function toHiragana(text) {
    return String(text).replace(/[ァ-ヶ]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0x60); });
  }
  /** Kana → romaji gaya bank FIEZEL (ou, jyo). Mengembalikan null bila ada huruf yang tak terbaca. */
  function kanaToRomaji(kana) {
    var s = toHiragana(kana), out = '', i = 0;
    while (i < s.length) {
      var c = s[i], next = s[i + 1];
      if (c === 'っ') {
        var after = kanaToRomaji(s.slice(i + 1, i + 3 + (YOON[s[i + 2]] ? 1 : 0)));
        out += after ? after[0] : '';
        i += 1; continue;
      }
      if (c === 'ー') { out += out.slice(-1) === '' ? '' : out.slice(-1); i += 1; continue; }
      if (PUNCT[c] !== undefined) { out += PUNCT[c]; i += 1; continue; }
      var roma = KANA_ROMAJI[c];
      if (roma === undefined) return null;
      if (next && YOON[next]) {
        var stem = roma.slice(0, -1);
        if (stem === 'sh' || stem === 'ch' || stem === 'j') roma = (stem === 'j' ? 'jy' : stem) + YOON[next];
        else roma = stem + 'y' + YOON[next];
        i += 2;
      } else i += 1;
      if (roma === 'n' && s[i] && /[あいうえおやゆよ]/.test(s[i])) roma = "n'";
      out += roma;
    }
    return out;
  }

  var lexicon = { source: null, words: null, stems: null };
  function cleanEntryWord(word) { return String(word || '').replace(/（[^）]*）|\([^)]*\)/g, '').trim(); }
  function buildLexicon(pool) {
    if (lexicon.source === pool && lexicon.words) return lexicon;
    var words = Object.create(null), stems = Object.create(null);
    (pool || []).forEach(function (v) {
      var reading = splitPhonetic(v && v.phonetic);
      if (!reading) return;
      var word = cleanEntryWord(v.word), kana = cleanEntryWord(reading.kana);
      if (!word || !kana || !/^[぀-ヿ㐀-䶿一-鿿々]+$/.test(word)) return;
      if (word.length < 2 && !KANJI_RE.test(word)) return;
      if (!words[word]) words[word] = { kana: kana, romaji: reading.romaji };
      // Batang kanji: 遊ぶ (あそぶ) → 遊 = あそ, dipakai untuk bentuk berkonjugasi.
      var m = word.match(/^([㐀-䶿一-鿿々]+)([぀-ゟ]+)$/);
      if (m && kana.length > m[2].length && kana.slice(-m[2].length) === m[2]) {
        var stemKana = kana.slice(0, kana.length - m[2].length);
        if (!stems[m[1]]) stems[m[1]] = stemKana;
      }
    });
    // Kata fungsi yang tidak berdiri sebagai entri bank, tapi ada di hampir setiap kalimat soal.
    [['です', 'desu'], ['でした', 'deshita'], ['でしょう', 'deshou'], ['ではありません', 'dewa arimasen'],
      ['じゃありません', 'jya arimasen'], ['ください', 'kudasai'], ['ません', 'masen'], ['ました', 'mashita'],
      ['ましょう', 'mashou'], ['いかが', 'ikaga']].forEach(function (pair) {
      if (!words[pair[0]]) words[pair[0]] = { kana: pair[0], romaji: pair[1] };
    });
    lexicon = { source: pool, words: words, stems: stems, maxLen: 12 };
    return lexicon;
  }
  /** Pecah satu potongan Jepang jadi token: {text, kana|null, romaji|null, ruby:boolean}. */
  function tokenize(run, lex) {
    var tokens = [], i = 0;
    while (i < run.length) {
      var hit = null;
      // は/を/へ sesudah sebuah kata hampir selalu partikel (wa/o/e); tanpa aturan ini
      // "そちらはいかが" terbaca "sochira hai ..." karena はい (ya) ada di bank.
      var prev = tokens[tokens.length - 1];
      if (/[はをへ]/.test(run[i]) && prev && !prev.punct && !prev.particle) {
        tokens.push({ text: run[i], romaji: PARTICLES[run[i]], particle: true }); i += 1; continue;
      }
      for (var len = Math.min(lex.maxLen, run.length - i); len >= 2 || (len === 1 && KANJI_RE.test(run[i])); len--) {
        var piece = run.substr(i, len);
        if (lex.words[piece]) { hit = { text: piece, kana: lex.words[piece].kana, romaji: lex.words[piece].romaji, ruby: KANJI_RE.test(piece) }; break; }
        if (KANJI_RE.test(piece) && /^[㐀-䶿一-鿿々]+$/.test(piece) && lex.stems[piece]) {
          // Batang kanji + okurigana yang menempel (sampai partikel/tanda baca berikutnya).
          var tail = run.slice(i + len).match(/^[ぁ-ん]*/)[0];
          var cut = tail.search(/[はをへがにでともの]/);
          if (cut > 0) tail = tail.slice(0, cut); else if (cut === 0) tail = '';
          var kana = lex.stems[piece] + tail;
          hit = { text: piece, kana: lex.stems[piece], tail: tail, romaji: kanaToRomaji(kana), ruby: true };
          break;
        }
        if (len === 1) break;
      }
      if (hit) {
        tokens.push(hit);
        i += hit.text.length + (hit.tail ? hit.tail.length : 0);
        continue;
      }
      var c = run[i];
      if (KANJI_RE.test(c)) { tokens.push({ text: c, kana: null, romaji: null, ruby: false }); i += 1; continue; }
      if (PUNCT[c] !== undefined) { tokens.push({ text: c, punct: true, romaji: PUNCT[c] }); i += 1; continue; }
      if (PARTICLES[c] && tokens.length && !tokens[tokens.length - 1].punct) {
        tokens.push({ text: c, romaji: PARTICLES[c], particle: true }); i += 1; continue;
      }
      // Deret kana bebas sampai token lain.
      var j = i + 1;
      while (j < run.length && /[぀-ヿ]/.test(run[j]) && !lex.words[run.substr(j, 2)]) j += 1;
      var free = run.slice(i, j);
      tokens.push({ text: free, romaji: kanaToRomaji(free) });
      i = j;
    }
    return tokens;
  }
  function annotateRun(run, lex) {
    var tokens = tokenize(run, lex), html = '', parts = [], complete = true;
    tokens.forEach(function (tk) {
      if (tk.ruby && tk.kana) {
        html += rubyHtml(tk.text, tk.kana) + esc(tk.tail || '');
      } else html += esc(tk.text);
      if (tk.romaji == null) complete = false;
      else if (tk.punct) { if (parts.length) parts[parts.length - 1] += tk.romaji; else parts.push(tk.romaji); }
      else parts.push(tk.romaji);
    });
    var romaji = complete ? parts.join(' ').replace(/\s+([.,!?)"])/g, '$1').replace(/\s{2,}/g, ' ').trim() : '';
    return '<span class="ja-run" lang="ja"><span class="ja-run-text">' + html + '</span>' +
      (romaji && /[a-z]/i.test(romaji) ? '<span class="ja-romaji ja-run-romaji" lang="ja-Latn">' + esc(romaji) + '</span>' : '') + '</span>';
  }
  /** Versi murni (tanpa DOM) dari anotasi satu teks - dipakai annotate() dan gerbang uji. */
  function annotateText(value, pool) {
    var lex = buildLexicon(pool), html = '', last = 0;
    String(value).replace(JA_RUN_RE, function (run, offset) {
      html += esc(value.slice(last, offset));
      html += HAS_JA_RE.test(run) ? annotateRun(run, lex) : esc(run);
      last = offset + run.length;
      return run;
    });
    return html + esc(String(value).slice(last));
  }
  var SKIP_SELECTOR = 'ruby,rt,script,style,textarea,input,.ja-run,.ja-word,.ja-word-wrap,.ja-display,.ja-romaji,[data-ja-annotated]';
  /** Anotasi semua teks Jepang di dalam `el` (sekali; node yang sudah dianotasi dilewati). */
  function annotate(el, pool) {
    if (!el || !root.document || typeof root.document.createTreeWalker !== 'function') return 0;
    var lex = buildLexicon(pool);
    var walker = root.document.createTreeWalker(el, 4 /* NodeFilter.SHOW_TEXT */, null);
    var targets = [], node;
    while ((node = walker.nextNode())) {
      if (!HAS_JA_RE.test(node.nodeValue)) continue;
      var parent = node.parentElement;
      if (!parent || parent.closest(SKIP_SELECTOR)) continue;
      targets.push(node);
    }
    targets.forEach(function (textNode) {
      var html = annotateText(textNode.nodeValue, pool);
      var holder = root.document.createElement('span');
      holder.setAttribute('data-ja-annotated', '');
      holder.innerHTML = html;
      textNode.parentNode.replaceChild(holder, textNode);
    });
    return targets.length;
  }

  /* ---------- Pengamat: setiap soal, jawaban, dan pembahasan di layar kuis ---------- */
  var ZONES = '.quiz-shell,.flash-face';
  var observer = null, pending = false, lexiconSource = null;
  function scan(appEl) {
    pending = false;
    if (!appEl) return;
    var pool = typeof lexiconSource === 'function' ? lexiconSource() : lexiconSource;
    appEl.querySelectorAll(ZONES).forEach(function (zone) {
      if (zone.classList.contains('quiz-shell') && !zone.querySelector('.ja-quiz-display')) {
        var bar = root.document.createElement('div');
        bar.className = 'ja-quiz-display';
        bar.innerHTML = togglesMarkup();
        var top = zone.querySelector('.quiz-topbar');
        if (top && top.parentNode === zone) top.insertAdjacentElement('afterend', bar);
        else zone.insertBefore(bar, zone.firstChild);
      }
      annotate(zone, pool);
    });
    applyPrefs();
  }
  function observe(appEl, source) {
    lexiconSource = source;
    if (!appEl || typeof root.MutationObserver !== 'function') return false;
    if (observer) observer.disconnect();
    observer = new root.MutationObserver(function () {
      if (pending) return;
      pending = true;
      Promise.resolve().then(function () { scan(appEl); });
    });
    observer.observe(appEl, { childList: true, subtree: true });
    scan(appEl);
    return true;
  }
  function unobserve() {
    if (observer) observer.disconnect();
    observer = null;
  }

  function jlptLabel(level) {
    return JLPT_BY_LEVEL[String(level || '')] || String(level || '');
  }

  root.FiezelJaUi = {
    readPrefs: readPrefs,
    applyPrefs: applyPrefs,
    toggle: toggle,
    togglesMarkup: togglesMarkup,
    splitPhonetic: splitPhonetic,
    wordMarkup: wordMarkup,
    phoneticMarkup: phoneticMarkup,
    toKatakana: toKatakana,
    setScript: setScript,
    kanaChartMarkup: kanaChartMarkup,
    kanaViewBody: kanaViewBody,
    kanaCardMarkup: kanaCardMarkup,
    chokaiCardMarkup: chokaiCardMarkup,
    comingSoonMarkup: comingSoonMarkup,
    wordOfDay: wordOfDay,
    wordOfDayMarkup: wordOfDayMarkup,
    jlptLabel: jlptLabel,
    kanaToRomaji: kanaToRomaji,
    annotate: annotate,
    annotateText: annotateText,
    observe: observe,
    unobserve: unobserve
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.FiezelJaUi;
}(typeof self !== 'undefined' ? self : globalThis));
