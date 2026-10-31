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
  function isExamModeActive() {
    try {
      if (root.state && (root.state.view === 'test' || root.state.view === 'exam')) return true;
      var ses = root.state && root.state.activeSession;
      if (ses && (ses.measureMode || ses.placement || ses.noHints || ses.examKind)) return true;
      if (root.document && root.document.body && root.document.body.classList &&
          typeof root.document.body.classList.contains === 'function' &&
          root.document.body.classList.contains('fz-exam-mode')) return true;
      if (root.document && typeof root.document.querySelector === 'function' &&
          root.document.querySelector('#placementSoal')) return true;
    } catch (_) {}
    return false;
  }

  function applyPrefs() {
    var prefs = readPrefs();
    var exam = isExamModeActive();
    var body = root.document && root.document.body;
    if (body && body.classList && typeof body.classList.toggle === 'function') {
      body.classList.toggle('fz-ja-no-furigana', exam ? true : !prefs.furigana);
      body.classList.toggle('fz-ja-no-romaji', exam ? true : !prefs.romaji);
    }
    if (root.document && typeof root.document.querySelectorAll === 'function') {
      root.document.querySelectorAll('[data-ja-toggle]').forEach(function (btn) {
        btn.setAttribute('aria-pressed', (!exam && prefs[btn.getAttribute('data-ja-toggle')]) ? 'true' : 'false');
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
  var JUKUJIKUN_OVERRIDES = {
    '今日': 'きょう', '明日': 'あした', '昨日': 'きのう',
    '大人': 'おとな', '一人': 'ひとり', '二人': 'ふたり',
    '二十歳': 'はたち', '二十日': 'はつか', '一日': 'ついたち',
    '果物': 'くだもの', '眼鏡': 'めがね', '時計': 'とけい',
    '土産': 'みやげ', 'お土産': 'おみやげ', '友達': 'ともだち',
    '今朝': 'けさ', '今年': 'ことし', '梅雨': 'つゆ',
    '部屋': 'へや', '八百屋': 'やおや', 'お母さん': 'おかあさん',
    'お父さん': 'おとうさん', 'お兄さん': 'おにいさん', 'お姉さん': 'おねえさん',
    '上手': 'じょうず', '下手': 'へた', '真面目': 'まじめ', '可愛い': 'かわいい'
  };
  var IS_KANJI_CHAR_RE = /^[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff々]$/;
  function kataToHira(str) {
    return String(str || '').replace(/[\u30a1-\u30f6]/g, function (ch) {
      return String.fromCharCode(ch.charCodeAt(0) - 0x60);
    });
  }
  function isKanjiChar(ch) {
    return IS_KANJI_CHAR_RE.test(ch);
  }
  function solveConsecutiveKanjiCompound(kanjiStr, reading, singleKanjiMap) {
    if (JUKUJIKUN_OVERRIDES[kanjiStr] === reading) {
      return [{ ruby: kanjiStr, rt: reading }];
    }
    if (!singleKanjiMap || kanjiStr.length <= 1) {
      return [{ ruby: kanjiStr, rt: reading }];
    }
    function backtrack(kIdx, rIdx, acc) {
      if (kIdx === kanjiStr.length && rIdx === reading.length) return acc;
      if (kIdx >= kanjiStr.length || rIdx >= reading.length) return null;
      var ch = kanjiStr[kIdx] === '々' && kIdx > 0 ? kanjiStr[kIdx - 1] : kanjiStr[kIdx];
      var info = singleKanjiMap[ch];
      var candidates = [];
      if (info) {
        if (Array.isArray(info.readings)) candidates = info.readings;
        else if (info.kana) candidates = [info.kana];
        else if (typeof info === 'string') candidates = [info];
      }
      var remKanji = kanjiStr.length - kIdx - 1;
      for (var end = rIdx + 1; end <= reading.length && end <= rIdx + 4; end++) {
        if (reading.length - end < remKanji) break;
        var slice = reading.slice(rIdx, end);
        if (candidates.indexOf(slice) !== -1) {
          var hit = backtrack(kIdx + 1, end, acc.concat([{ ruby: kanjiStr[kIdx], rt: slice }]));
          if (hit) return hit;
        }
      }
      return null;
    }
    var solved = backtrack(0, 0, []);
    if (solved) return solved;
    return [{ ruby: kanjiStr, rt: reading }];
  }
  function solveCoreKanjiSegments(text, reading, singleKanjiMap) {
    if (JUKUJIKUN_OVERRIDES[text] === reading) {
      return [{ ruby: text, rt: reading }];
    }
    if (text.length === 1 && isKanjiChar(text[0])) {
      return [{ ruby: text, rt: reading }];
    }
    var hasConsecutiveKanji = false;
    var groups = [];
    for (var i = 0; i < text.length; i++) {
      var kj = isKanjiChar(text[i]);
      if (kj && i > 0 && isKanjiChar(text[i - 1])) hasConsecutiveKanji = true;
      if (!groups.length || groups[groups.length - 1].isKanji !== kj) {
        groups.push({ text: text[i], isKanji: kj });
      } else {
        groups[groups.length - 1].text += text[i];
      }
    }
    if (groups.length > 1) {
      var escRe = function (s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); };
      var greedyPat = '^' + groups.map(function (g) {
        return g.isKanji ? '(.+)' : escRe(kataToHira(g.text));
      }).join('') + '$';
      var lazyPat = '^' + groups.map(function (g) {
        return g.isKanji ? '(.+?)' : escRe(kataToHira(g.text));
      }).join('') + '$';
      var mG = new RegExp(greedyPat).exec(reading);
      var mL = new RegExp(lazyPat).exec(reading);
      if (mG && mL) {
        var identical = true;
        for (var m = 1; m < mG.length; m++) {
          if (mG[m] !== mL[m]) { identical = false; break; }
        }
        if (identical) {
          var segs = [], capIdx = 1;
          for (var gIdx = 0; gIdx < groups.length; gIdx++) {
            if (groups[gIdx].isKanji) {
              segs = segs.concat(
                hasConsecutiveKanji
                  ? solveConsecutiveKanjiCompound(groups[gIdx].text, mG[capIdx++], singleKanjiMap)
                  : [{ ruby: groups[gIdx].text, rt: mG[capIdx++] }]
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
  /**
   * Memecah pasangan (surface, rawReading) menjadi [{ ruby, rt? }] sehingga okurigana
   * di awal, tengah, maupun akhir kata (お茶, 持ち運ぶ, 買いました, 練習します) tidak pernah
   * digumpalkan ke dalam tag <ruby> bersama kanji.
   */
  function solveFuriganaSegments(surface, rawReading, singleKanjiMap) {
    var text = String(surface || '');
    var reading = kataToHira(rawReading);
    if (!text || !reading) return [{ ruby: text }];
    var hasAnyKanji = false;
    for (var k = 0; k < text.length; k++) {
      if (isKanjiChar(text[k])) { hasAnyKanji = true; break; }
    }
    if (!hasAnyKanji) return [{ ruby: text }];
    if (JUKUJIKUN_OVERRIDES[text] === reading) {
      if (!isKanjiChar(text[0]) && kataToHira(text[0]) === reading[0]) {
        return [{ ruby: text[0] }].concat(
          solveFuriganaSegments(text.slice(1), reading.slice(1), singleKanjiMap)
        );
      }
      return [{ ruby: text, rt: reading }];
    }
    var prefixLen = 0;
    while (
      prefixLen < text.length &&
      prefixLen < reading.length &&
      !isKanjiChar(text[prefixLen]) &&
      kataToHira(text[prefixLen]) === reading[prefixLen]
    ) {
      prefixLen++;
    }
    var suffixLen = 0;
    while (
      text.length - 1 - suffixLen >= prefixLen &&
      reading.length - 1 - suffixLen >= prefixLen &&
      !isKanjiChar(text[text.length - 1 - suffixLen]) &&
      kataToHira(text[text.length - 1 - suffixLen]) === reading[reading.length - 1 - suffixLen]
    ) {
      suffixLen++;
    }
    if (prefixLen > 0 || suffixLen > 0) {
      var out = [];
      if (prefixLen > 0) out.push({ ruby: text.slice(0, prefixLen) });
      var coreText = text.slice(prefixLen, text.length - suffixLen);
      var coreReading = reading.slice(prefixLen, reading.length - suffixLen);
      if (coreText) {
        out = out.concat(solveCoreKanjiSegments(coreText, coreReading, singleKanjiMap));
      }
      if (suffixLen > 0) out.push({ ruby: text.slice(text.length - suffixLen) });
      return out;
    }
    return solveCoreKanjiSegments(text, reading, singleKanjiMap);
  }

  /** Furigana hanya di atas kanji: okurigana di awal, tengah, dan ujung (お茶, 持ち運ぶ, 行きます)
   *  dibiarkan polos di luar <ruby>, seperti di buku ajar Jepang standar. */
  function rubyHtml(text, kana, attrs, singleKanjiMap) {
    if (isExamModeActive()) return esc(text);
    var openAttr = attrs || '';
    var segs = solveFuriganaSegments(text, kana, singleKanjiMap);
    return segs.map(function (seg) {
      if (!seg.rt) return esc(seg.ruby);
      return '<ruby class="ja-word"' + openAttr + '>' + esc(seg.ruby) +
        '<rp>(</rp><rt>' + esc(seg.rt) + '</rt><rp>)</rp></ruby>';
    }).join('');
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
        cells += '<button type="button" class="kana-cell" onclick="if(window.FiezelKakijunStudio)window.FiezelKakijunStudio.open(\'' + esc(shown) + '\')" aria-label="' + esc(shown + ' ' + romaji) + '">' +
          '<b lang="ja">' + esc(shown) + '</b><small class="ja-romaji">' + esc(romaji) + '</small></button>';
      }
      return cells;
    }).join('');
  }
  var kanaScope = 'all'; // 'all' | 'gojuon' | 'dakuten'
  function setScript(next) {
    script = next === 'katakana' ? 'katakana' : 'hiragana';
    var host = root.document && root.document.getElementById('jaKanaChart');
    if (host) host.outerHTML = kanaChartMarkup();
    applyPrefs();
  }
  function setKanaScope(nextScope) {
    kanaScope = (nextScope === 'gojuon' || nextScope === 'dakuten') ? nextScope : 'all';
    var host = root.document && root.document.getElementById('jaKanaChart');
    if (host) host.outerHTML = kanaChartMarkup();
    applyPrefs();
  }
  function kakijunBannerMarkup() {
    return '<div class="ja-kakijun-banner card">' +
      '<div class="ja-kakijun-banner-left">' +
        '<div class="ja-kakijun-icon-bubble" aria-hidden="true">筆</div>' +
        '<div class="ja-kakijun-banner-text">' +
          '<h3>Kakijun Studio (書き順)</h3>' +
          '<p>' + esc(t('jepang.kakijun-desc', 'Latihan menulis goresan Hiragana, Katakana & Kanji di atas kertas kotak Genkō Yōshi.')) + '</p>' +
        '</div>' +
      '</div>' +
      '<button type="button" class="ja-kakijun-banner-btn" onclick="if(window.FiezelKakijunStudio)window.FiezelKakijunStudio.open(\'あ\')">' +
        '<span>' + esc(t('jepang.kakijun-mulai', 'Mulai Menulis')) + '</span>' +
        '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>' +
      '</button>' +
    '</div>';
  }
  function kanaChartMarkup() {
    function tab(which, labelKey) {
      return '<button type="button" class="kana-tab" role="tab" aria-selected="' + (script === which) +
        '" onclick="FiezelJaUi.setScript(\'' + which + '\')"><span lang="ja">' + esc(t(labelKey)) + '</span></button>';
    }
    function scopeBtn(which, labelKey, fallback) {
      var isAct = kanaScope === which;
      return '<button type="button" class="kana-scope-btn' + (isAct ? ' is-active' : '') +
        '" role="tab" aria-selected="' + isAct + '" onclick="FiezelJaUi.setKanaScope(\'' + which + '\')">' +
        esc(t(labelKey, fallback)) + '</button>';
    }
    var showGojuon = kanaScope === 'all' || kanaScope === 'gojuon';
    var showDakuten = kanaScope === 'all' || kanaScope === 'dakuten';

    return '<div id="jaKanaChart" class="ja-kana">' +
      '<div class="ja-kana-top-controls">' +
        '<div class="kana-tabs" role="tablist" aria-label="Aksara">' + tab('hiragana', 'jepang.hiragana') + tab('katakana', 'jepang.katakana') + '</div>' +
        '<div class="kana-scope-group" role="tablist" aria-label="Kelompok Aksara">' +
          scopeBtn('all', 'jepang.kana-semua', 'Semua (71)') +
          scopeBtn('gojuon', 'jepang.kana-dasar-singkat', 'Gojūon (46)') +
          scopeBtn('dakuten', 'jepang.kana-dakuten-singkat', 'Dakuon (25)') +
        '</div>' +
      '</div>' +
      '<div class="ja-kana-layout">' +
        (showGojuon ? '<section class="ja-kana-section is-gojuon"><h2 class="kana-heading">' + esc(t('jepang.kana-dasar')) + '</h2>' +
        '<div class="kana-grid" role="list">' + kanaRows(GOJUON) + '</div></section>' : '') +
        (showDakuten ? '<section class="ja-kana-section is-dakuten"><h2 class="kana-heading">' + esc(t('jepang.kana-dakuten')) + '</h2>' +
        '<div class="kana-grid" role="list">' + kanaRows(DAKUTEN) + '</div>' +
        '<aside class="ja-kana-guide-box" aria-label="' + esc(t('jepang.kana-guide-title')) + '">' +
          '<div class="ja-kana-guide-badge">' + esc(t('jepang.kana-guide-badge')) + '</div>' +
          '<h3 class="ja-kana-guide-title">' + esc(t('jepang.kana-guide-title')) + '</h3>' +
          '<p class="ja-kana-guide-desc">' + esc(t('jepang.kana-guide-desc')) + '</p>' +
          '<div class="ja-kana-guide-pairs">' +
            '<span><b>か (k)</b> ➔ <b>が (g)</b></span>' +
            '<span><b>さ (s)</b> ➔ <b>ざ (z)</b></span>' +
            '<span><b>た (t)</b> ➔ <b>だ (d)</b></span>' +
            '<span><b>は (h)</b> ➔ <b>ば (b) / ぱ (p)</b></span>' +
          '</div>' +
        '</aside>' +
        '</section>' : '') +
      '</div></div>';
  }
  function kanaViewBody() {
    /* Kana tidak punya furigana; di tabel ini hanya romaji yang bisa disembunyikan. */
    return kakijunBannerMarkup() + togglesMarkup('romaji') + kanaChartMarkup();
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
    var label = t('jepang.chokai') + ' JLPT (N5–N1)';
    var emblem = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#FFE02E" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 18v-6a9 9 0 0 1 18 0v6"></path><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"></path></svg>';
    return '<button type="button" class="launch-card ja-chokai-card" onclick="openListeningPanel()" aria-label="' + esc(label) + '">' +
      '<span class="launch-icon ja-glyph" aria-hidden="true">' + emblem + '</span><span><small>' +
      esc(t('jepang.chokai-card-note')) + '</small><b>' + esc(label) + '</b></span><i data-lucide="arrow-up-right"></i></button>';
  }
  function kanjiCardMarkup() {
    var label = t('jepang.kanji');
    return '<button type="button" class="launch-card ja-kanji-card" onclick="openKanjiPractice()" aria-label="' + esc(label) + '">' +
      '<span class="launch-icon ja-glyph" lang="ja" aria-hidden="true">字</span><span><small>' +
      esc(t('jepang.kanji-card-note')) + '</small><b>' + esc(label) + '</b></span><i data-lucide="arrow-up-right"></i></button>';
  }
  function moshiCardMarkup() {
    var label = t('jepang.moshi');
    return '<button type="button" class="launch-card ja-moshi-card" onclick="openJlptMoshiPanel()" aria-label="' + esc(label) + '">' +
      '<span class="launch-icon ja-glyph" lang="ja" aria-hidden="true">模</span><span><small>' +
      esc(t('jepang.moshi-card-note')) + '</small><b>' + esc(label) + '</b></span><i data-lucide="arrow-up-right"></i></button>';
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
  var COMPOUNDS = {
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
    'しぇ': 'she', 'ちぇ': 'che', 'じぇ': 'je'
  };
  var PUNCT = {
    '。': '.', '、': ',', '！': '!', '？': '?',
    '「': '"', '」': '"', '『': '"', '』': '"',
    '・': ' ', '　': ' ', '～': '~', '（': '(', '）': ')',
    '(': '(', ')': ')'
  };
  var PARTICLES = {
    'は': 'wa', 'へ': 'e', 'を': 'o', 'が': 'ga',
    'に': 'ni', 'で': 'de', 'と': 'to', 'も': 'mo',
    'の': 'no', 'や': 'ya', 'か': 'ka', 'ね': 'ne', 'よ': 'yo',
    'から': 'kara', 'まで': 'made'
  };
  var JA_RUN_RE = /[0-9぀-ヿ㐀-䶿一-鿿々　-〿！-／：-？～\s_()（）]+/g;
  var HAS_JA_RE = /[0-9぀-ヿ㐀-䶿一-鿿]/;

  function toHiragana(text) {
    return String(text).replace(/[ァ-ヶ]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0x60); });
  }
  /** Kana → romaji gaya Hepburn standar (ou, ja/ju/jo, konsonan ganda, sokuon tch). Mengembalikan null bila ada huruf yang tak terbaca. */
  function kanaToRomaji(kana) {
    var s = toHiragana(kana), out = '', i = 0;
    while (i < s.length) {
      var c = s[i], next = s[i + 1];
      if (/[0-9a-zA-Z\-_]/.test(c)) {
        out += c;
        i += 1;
        continue;
      }
      if (c === 'っ') {
        var peek2 = s.slice(i + 1, i + 3);
        var nextRoma = COMPOUNDS[peek2] || KANA_ROMAJI[s[i + 1]];
        if (nextRoma) {
          out += nextRoma.charAt(0) === 'c' ? 't' : nextRoma.charAt(0);
        }
        i += 1; continue;
      }
      if (c === 'ー') {
        var lastChar = out.slice(-1).toLowerCase();
        if (/[aeiou]/.test(lastChar)) {
          out += lastChar;
        }
        i += 1;
        continue;
      }
      if (PUNCT[c] !== undefined) { out += PUNCT[c]; i += 1; continue; }
      var pair = s.slice(i, i + 2);
      if (COMPOUNDS[pair]) {
        out += COMPOUNDS[pair];
        i += 2;
        continue;
      }
      var roma = KANA_ROMAJI[c];
      if (roma === undefined) return null;
      if (next && YOON[next]) {
        var stem = roma.slice(0, -1);
        if (stem === 'sh' || stem === 'ch' || stem === 'j') roma = stem + YOON[next];
        else roma = stem + 'y' + YOON[next];
        i += 2;
      } else i += 1;
      if (roma === 'n' && s[i] && /[あいうえおやゆよ]/.test(s[i])) roma = "n'";
      out += roma;
    }
    return out;
  }

  function getMasterDictionary() {
    if (root.FiezelJaDictionary) return root.FiezelJaDictionary;
    if (typeof require === 'function') {
      try { return require('./fiezel-ja-dictionary.js'); } catch (_) {
        try { return require('./features/japanese/fiezel-ja-dictionary.js'); } catch (_) {}
      }
    }
    return null;
  }

  var lexicon = { source: null, master: null, words: null, stems: null, single: null, maxLen: 12 };
  function cleanEntryWord(word) { return String(word || '').replace(/（[^）]*）|\([^)]*\)/g, '').trim(); }
  function buildLexicon(pool) {
    var master = getMasterDictionary();
    if (lexicon.source === pool && lexicon.master === master && lexicon.words) return lexicon;
    var words = Object.create(null), stems = Object.create(null), single = Object.create(null);

    // 1. Ingest Master Dictionary if available (Universal Baseline when pool is not explicitly restricted)
    if (master && (!Array.isArray(pool) || pool.__useUniversalMaster)) {
      if (master.WORDS) Object.assign(words, master.WORDS);
      if (master.STEMS) Object.assign(stems, master.STEMS);
      if (master.SINGLE) Object.assign(single, master.SINGLE);
    }

    // 2. Overlay active pool (if provided, e.g. V)
    if (Array.isArray(pool)) {
      pool.forEach(function (v) {
        var reading = splitPhonetic(v && v.phonetic);
        if (!reading) return;
        var word = cleanEntryWord(v.word), kana = cleanEntryWord(reading.kana);
        if (!word || !kana || !/^[0-9\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\u3005]+$/.test(word)) return;
        if (word.length < 2 && !KANJI_RE.test(word)) return;
        var cleanRoma = reading.romaji ? reading.romaji.replace(/\bjy([auo])/gi, 'j$1').replace(/jy([auo])/gi, 'j$1') : reading.romaji;
        words[word] = { kana: kana, romaji: cleanRoma };
        // Batang kanji: 遊ぶ (あそぶ) → 遊 = あそ, dipakai untuk bentuk berkonjugasi.
        var m = word.match(/^([㐀-䶿一-鿿々]+)([぀-ゟ]+)$/);
        if (m && kana.length > m[2].length && kana.slice(-m[2].length) === m[2]) {
          var stemKana = kana.slice(0, kana.length - m[2].length);
          if (!stems[m[1]]) stems[m[1]] = stemKana;
        }
      });
    }

    // 3. Functional vocabulary & common words
    [
      ['です', 'desu'], ['でした', 'deshita'], ['でしょう', 'deshou'], ['ではありません', 'dewa arimasen'],
      ['じゃありません', 'ja arimasen'], ['ください', 'kudasai'], ['ません', 'masen'], ['ました', 'mashita'],
      ['ましょう', 'mashou'], ['いかが', 'ikaga'],
      ['ありませんでした', 'arimasen deshita'], ['ありません', 'arimasen'], ['ありました', 'arimashita'],
      ['ませんでした', 'masen deshita'], ['なかったでした', 'nakatta deshita'], ['なかった', 'nakatta'],
      ['つくります', 'tsukurimasu'], ['つくっています', 'tsukutte imasu'], ['つくってあります', 'tsukutte arimasu'],
      ['つくりました', 'tsukurimashita'], ['つくる', 'tsukuru'],
      ['よみます', 'yomimasu'], ['よみました', 'yomimashita'], ['よみません', 'yomimasen'],
      ['よみませんでした', 'yomimasen deshita'], ['よまなかった', 'yomanakatta'], ['よまなかったでした', 'yomanakatta deshita'],
      ['けさ', 'kesa'], ['しんぶん', 'shinbun'], ['じかん', 'jikan'], ['だいどころ', 'daidokoro'],
      ['ごはん', 'gohan'], ['いいえ', 'iie'], ['はい', 'hai'], ['はは', 'haha'], ['ちち', 'chichi'],
      ['あさ', 'asa'], ['ひる', 'hiru'], ['よる', 'yoru'], ['ゆうがた', 'yuugata'], ['いま', 'ima'],
      ['きのう', 'kinou'], ['きょう', 'kyou'], ['あした', 'ashita'], ['から', 'kara'], ['まで', 'made'],
      ['しゃべる', 'shaberu'], ['しゃべります', 'shaberimasu'], ['おじいさん', 'ojiisan'], ['おばあさん', 'obaasan'],
      ['ともだち', 'tomodachi'], ['がっこう', 'gakkou'], ['せんせい', 'sensei'], ['がくせい', 'gakusei'],
      ['わたし', 'watashi'], ['ぼく', 'boku'], ['おれ', 'ore'], ['きみ', 'kimi'], ['あなた', 'anata'],
      ['かれ', 'kare'], ['かのじょ', 'kanojo'], ['これ', 'kore'], ['それ', 'sore'], ['あれ', 'are'],
      ['どれ', 'dore'], ['だれ', 'dare'], ['なに', 'nani'], ['どこ', 'doko'], ['あそこ', 'asoko'],
      ['こちら', 'kochira'], ['そちら', 'sochira'], ['あちら', 'achira'], ['どちら', 'dochira'],
      ['がめん', 'gamen'], ['てんき', 'tenki'], ['きれい', 'kirei'],
      ['いきます', 'ikimasu'], ['いきました', 'ikimashita'], ['いく', 'iku'],
      ['きます', 'kimasu'], ['きました', 'kimashita'], ['くる', 'kuru'],
      ['たべます', 'tabemasu'], ['たべました', 'tabemashita'], ['たべる', 'taberu'],
      ['のみます', 'nomimasu'], ['のみました', 'nomimashita'], ['のむ', 'nomu'],
      ['わかります', 'wakarimasu'], ['わかりました', 'wakarimashita'], ['わかる', 'wakaru']
    ].forEach(function (pair) {
      if (!words[pair[0]]) words[pair[0]] = { kana: pair[0], romaji: pair[1] };
    });
    lexicon = { source: pool, master: master, words: words, stems: stems, single: single, maxLen: 12 };
    return lexicon;
  }
  /** Pecah satu potongan Jepang jadi token: {text, kana|null, romaji|null, ruby:boolean}. */
  function tokenize(run, lex) {
    var tokens = [], i = 0;
    while (i < run.length) {
      if (/\s/.test(run[i])) {
        tokens.push({ text: ' ', space: true, romaji: ' ' });
        i += 1;
        continue;
      }
      if (run[i] === '_') {
        var bLen = 0;
        while (run[i + bLen] === '_') bLen++;
        tokens.push({ text: '___', blank: true, romaji: '___' });
        i += bLen;
        continue;
      }

      var prev = tokens.length ? tokens[tokens.length - 1] : null;

      // Partikel は / を / へ (hanya bila bukan diikuti kana kecil)
      if (/[はをへ]/.test(run[i]) && prev && !prev.space && !prev.punct && !prev.particle && !prev.blank && !/[ぁぃぅぇぉっゃゅょゎ]/.test(run[i + 1])) {
        tokens.push({ text: run[i], romaji: PARTICLES[run[i]], particle: true });
        i += 1;
        continue;
      }

      var hit = null;
      for (var len = Math.min(lex.maxLen, run.length - i); len >= 2 || (len === 1 && KANJI_RE.test(run[i])); len--) {
        var piece = run.substr(i, len);
        // Bila kanji diikuti okurigana (misal 遊 + びました), dahulukan batang konjugasi (stems)
        if (KANJI_RE.test(piece) && /^[㐀-䶿一-鿿々]+$/.test(piece) && lex.stems[piece]) {
          var tailMatch = run.slice(i + len).match(/^[ぁ-ん]*/);
          var tail = tailMatch ? tailMatch[0] : '';
          var cut = tail.search(/[はをへがにでともの]/);
          if (cut > 0) tail = tail.slice(0, cut);
          else if (cut === 0) tail = '';
          if (tail.length > 0) {
            var kana = lex.stems[piece] + tail;
            hit = { text: piece, kana: lex.stems[piece], tail: tail, romaji: kanaToRomaji(kana), ruby: true };
            break;
          }
        }
        if (lex.words[piece]) {
          hit = { text: piece, kana: lex.words[piece].kana, romaji: lex.words[piece].romaji, ruby: KANJI_RE.test(piece) };
          break;
        }
        if (KANJI_RE.test(piece) && /^[㐀-䶿一-鿿々]+$/.test(piece) && lex.stems[piece]) {
          var tailMatch2 = run.slice(i + len).match(/^[ぁ-ん]*/);
          var tail2 = tailMatch2 ? tailMatch2[0] : '';
          var cut2 = tail2.search(/[はをへがにでともの]/);
          if (cut2 > 0) tail2 = tail2.slice(0, cut2);
          else if (cut2 === 0) tail2 = '';
          var kana2 = lex.stems[piece] + tail2;
          hit = { text: piece, kana: lex.stems[piece], tail: tail2, romaji: kanaToRomaji(kana2), ruby: true };
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
      if (KANJI_RE.test(c)) {
        var sInfo = lex.single && lex.single[c];
        if (sInfo && sInfo.kana) {
          tokens.push({ text: c, kana: sInfo.kana, romaji: sInfo.romaji || kanaToRomaji(sInfo.kana), ruby: true });
        } else {
          tokens.push({ text: c, kana: null, romaji: null, ruby: false });
        }
        i += 1;
        continue;
      }
      if (/[0-9]/.test(c)) {
        var numStr = '';
        while (i < run.length && /[0-9]/.test(run[i])) {
          numStr += run[i];
          i += 1;
        }
        tokens.push({ text: numStr, romaji: numStr });
        continue;
      }
      if (PUNCT[c] !== undefined) {
        tokens.push({ text: c, punct: true, romaji: PUNCT[c] });
        i += 1;
        continue;
      }
      if (PARTICLES[c] && prev && !prev.punct && !prev.space && !prev.blank && !/[ぁぃぅぇぉっゃゅょゎ]/.test(run[i + 1])) {
        tokens.push({ text: c, romaji: PARTICLES[c], particle: true });
        i += 1;
        continue;
      }

      // Deret kana bebas sampai token lain.
      var j = i + 1;
      while (j < run.length && /[぀-ヿ]/.test(run[j])) {
        if (PARTICLES[run[j]] && !/[ぁぃぅぇぉっゃゅょゎ]/.test(run[j + 1]) && !lex.words[run.substr(j, 2)]) break;
        j += 1;
      }
      var free = run.slice(i, j);
      tokens.push({ text: free, romaji: kanaToRomaji(free) });
      i = j;
    }
    return tokens;
  }
  function annotateRun(run, lex) {
    var tokens = tokenize(run, lex), html = '', parts = [], complete = true;
    tokens.forEach(function (tk) {
      if (tk.blank) {
        html += '<span class="ja-blank">______</span>';
      } else if (tk.ruby && tk.kana) {
        html += rubyHtml(tk.text, tk.kana) + esc(tk.tail || '');
      } else {
        html += esc(tk.text);
      }

      var tkRoma = tk.romaji;
      if (!tkRoma) {
        if (tk.kana) tkRoma = kanaToRomaji(tk.kana);
        else if (!KANJI_RE.test(tk.text)) tkRoma = kanaToRomaji(tk.text);
      }

      if (tkRoma == null) {
        complete = false;
      } else if (tk.punct) {
        if (parts.length && tkRoma !== '"') {
          parts[parts.length - 1] += tkRoma;
        } else {
          parts.push(tkRoma);
        }
      } else if (tk.space) {
        // dipelihara lewat join
      } else {
        parts.push(tkRoma);
      }
    });

    var romaji = '';
    var isExam = isExamModeActive();
    try {
      if (!isExam && root.document && typeof root.document.querySelector === 'function' &&
          root.document.querySelector('.quiz-shell, #placementSoal')) isExam = true;
    } catch (_) {}

    if (complete && !isExam) {
      romaji = parts.join(' ')
        .replace(/\s+([.,!?)」』"])/g, '$1')
        .replace(/([「『"(])\s+/g, '$1')
        .replace(/""+/g, '" "')
        .replace(/\s{2,}/g, ' ')
        .trim();
    }

    return '<span class="ja-run" lang="ja"><span class="ja-run-text">' + html + '</span>' +
      (romaji && /[a-z0-9]/i.test(romaji) ? '<span class="ja-romaji ja-run-romaji" lang="ja-Latn">' + esc(romaji) + '</span>' : '') + '</span>';
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
  var SKIP_SELECTOR = 'ruby,rt,script,style,textarea,input,.ja-run,.ja-word,.ja-word-wrap,.ja-display,.ja-romaji,[data-ja-annotated],#fzMochiCardToggle,#fzMochiThoughtBubble,#fzMochiVoiceUnder';
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
  var ZONES = '.quiz-shell,.flash-face,.passage,#quizPassage,.passage-reading,.card-reading';
  var observer = null, pending = false, lexiconSource = null;
  function scan(appEl) {
    pending = false;
    if (!appEl) return;
    var exam = isExamModeActive();
    var pool = typeof lexiconSource === 'function' ? lexiconSource() : lexiconSource;
    appEl.querySelectorAll(ZONES).forEach(function (zone) {
      if (zone.classList.contains('quiz-shell')) {
        var existingBar = zone.querySelector('.ja-quiz-display');
        if (exam) {
          if (existingBar && existingBar.parentNode) existingBar.parentNode.removeChild(existingBar);
        } else if (!existingBar) {
          var bar = root.document.createElement('div');
          bar.className = 'ja-quiz-display';
          bar.innerHTML = togglesMarkup();
          var top = zone.querySelector('.quiz-topbar');
          if (top && top.parentNode === zone) top.insertAdjacentElement('afterend', bar);
          else zone.insertBefore(bar, zone.firstChild);
        }
      }
      if (!exam) annotate(zone, pool);
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

  /**
   * Adapter Tier-2 menghubungkan Lindera WASM (IPADIC via OPFS) ke Kuroshiro & FiezelJaUi
   * secara on-demand tanpa membebani shell cache awal.
   */
  function createLinderaKuroshiroAnalyzer(options) {
    var opts = options || {};
    var dictUrl = opts.dictUrl || './assets/dict/lindera-ipadic.zip';
    var tokenizer = null;
    return {
      isReady: function () { return tokenizer !== null; },
      getTokenizer: function () { return tokenizer; },
      init: async function () {
        if (tokenizer) return;
        var lindera = await import(opts.wasmModulePath || '/vendor/lindera-wasm/lindera_wasm.js');
        var opfs = await import(opts.opfsModulePath || '/vendor/lindera-wasm/opfs.js');
        if (typeof lindera.default === 'function') await lindera.default();
        if (!(await opfs.hasDictionary('ipadic'))) {
          await opfs.downloadDictionary(dictUrl, 'ipadic', { onProgress: opts.onProgress });
        }
        var files = await opfs.loadDictionaryFiles('ipadic');
        var dictionary = lindera.loadDictionaryFromBytes(
          files.metadata, files.dictTrie, files.dictValsIdx, files.dictVals,
          files.dictWordsIdx, files.dictWords, files.matrixMtx, files.charDef, files.unk
        );
        var builder = new lindera.TokenizerBuilder();
        builder.setDictionaryInstance(dictionary);
        builder.setMode(lindera.Mode.normal());
        tokenizer = builder.build();
      },
      parse: async function (str) {
        if (!tokenizer) return [];
        var raw = tokenizer.tokenize(String(str || ''));
        return raw.map(function (tok) {
          var d = tok.details || [];
          return {
            surface_form: tok.surface,
            pos: d[0] || '',
            pos_detail_1: d[1] || '',
            pos_detail_2: d[2] || '',
            pos_detail_3: d[3] || '',
            conjugated_type: d[4] || '',
            conjugated_form: d[5] || '',
            basic_form: d[6] && d[6] !== '*' ? d[6] : tok.surface,
            reading: d[7] && d[7] !== '*' ? d[7] : tok.surface,
            pronunciation: d[8] && d[8] !== '*' ? d[8] : (d[7] && d[7] !== '*' ? d[7] : tok.surface)
          };
        });
      }
    };
  }

  root.FiezelJaUi = {
    readPrefs: readPrefs,
    applyPrefs: applyPrefs,
    isExamModeActive: isExamModeActive,
    toggle: toggle,
    togglesMarkup: togglesMarkup,
    splitPhonetic: splitPhonetic,
    solveFuriganaSegments: solveFuriganaSegments,
    rubyHtml: rubyHtml,
    wordMarkup: wordMarkup,
    phoneticMarkup: phoneticMarkup,
    toKatakana: toKatakana,
    setScript: setScript,
    setKanaScope: setKanaScope,
    kanaChartMarkup: kanaChartMarkup,
    kanaViewBody: kanaViewBody,
    kanaCardMarkup: kanaCardMarkup,
    chokaiCardMarkup: chokaiCardMarkup,
    kanjiCardMarkup: kanjiCardMarkup,
    moshiCardMarkup: moshiCardMarkup,
    comingSoonMarkup: comingSoonMarkup,
    wordOfDay: wordOfDay,
    wordOfDayMarkup: wordOfDayMarkup,
    jlptLabel: jlptLabel,
    kanaToRomaji: kanaToRomaji,
    annotate: annotate,
    annotateText: annotateText,
    observe: observe,
    unobserve: unobserve,
    createLinderaKuroshiroAnalyzer: createLinderaKuroshiroAnalyzer
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.FiezelJaUi;
}(typeof self !== 'undefined' ? self : globalThis));
