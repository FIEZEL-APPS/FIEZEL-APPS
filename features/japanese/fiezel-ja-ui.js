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
  function wordMarkup(word, phonetic) {
    var reading = splitPhonetic(phonetic);
    if (!reading || !KANJI_RE.test(String(word || ''))) {
      return '<span class="ja-word" lang="ja">' + esc(word) + '</span>';
    }
    return '<ruby class="ja-word" lang="ja">' + esc(word) + '<rp>(</rp><rt>' + esc(reading.kana) +
      '</rt><rp>)</rp></ruby>';
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
    comingSoonMarkup: comingSoonMarkup,
    wordOfDay: wordOfDay,
    wordOfDayMarkup: wordOfDayMarkup,
    jlptLabel: jlptLabel
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.FiezelJaUi;
}(typeof self !== 'undefined' ? self : globalThis));
