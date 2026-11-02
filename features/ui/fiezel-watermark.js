/**
 * FIEZEL — fiezel-watermark.js · STEGANOGRAFI FORENSIK ANTI-PENCURIAN BANK SOAL
 *
 * ============================================================================
 * KENAPA MODUL INI ADA
 * ============================================================================
 * Bank soal kurikulum, kalimat grammar, dan kosakata FIEZEL dirancang dengan riset
 * pedagogis mendalam. Scraper otomatis atau oknum yang menyalin (copy-paste) soal
 * dari layar dapat mencuri materi tanpa izin.
 *
 * Modul ini menyisipkan karakter tak terlihat (Zero-Width Characters Unicode) ke
 * dalam kalimat yang ditampilkan ke layar:
 *   - \u200B (Zero-Width Space) = bit 0
 *   - \u200C (Zero-Width Non-Joiner) = bit 1
 *   - \u200D (Zero-Width Joiner) = pembatas awal (start delimiter)
 *   - \uFEFF (Zero-Width No-Break Space) = pembatas akhir (end delimiter)
 *
 * Karakter tersebut tidak memakan ruang lebar (0 pixel) sehingga teks terlihat
 * 100% normal dan bersih di mata murid. Namun jika teks disalin ke clipboard atau
 * di-scrape bot, sidik jari forensik (ID akun / ID perangkat) ikut terbawa.
 *
 * Ekstraktor forensik dapat membuktikan secara hukum bahwa materi tersebut dicuri
 * langsung dari FIEZEL beserta identitas akun/perangkat yang membocorkannya.
 *
 * Anti-Breakage Invariant:
 * Modul menyediakan `strip(text)` yang wajib dipakai modul TTS / Speech Synthesis
 * dan verifikasi token Braincore agar pengucapan suara dan evaluasi jawaban 100% bersih.
 */

(function (root, factory) {
  var api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FiezelWatermark = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  'use strict';

  // LAPIS 1: Karakter Zero-Width Standar Unicode (Legacy / Backward-Compatible)
  var ZW_ZERO = '\u200B';   // Zero-Width Space (bit 0)
  var ZW_ONE = '\u200C';    // Zero-Width Non-Joiner (bit 1)
  var ZW_START = '\u200D';  // Zero-Width Joiner (delimiter start)
  var ZW_END = '\uFEFF';    // Zero-Width No-Break Space (delimiter end)
  var ZW_REGEX = /[\u200B\u200C\u200D\uFEFF]/g;
  var WATERMARK_REGEX = /\u200D([\u200B\u200C]+)\uFEFF/;

  // LAPIS 2: Steganografi Resisten Unicode Variation Selectors (\uFE00–\uFE0F)
  // Kebal terhadap pembersihan regex sepihak scraper: text.replace(/[\u200B-\u200D\uFEFF]/g, '')
  // Karakter \uFE00-\uFE0F berada di luar rentang zero-width biasa, 0-pixel invisible, dan tetap bertahan.
  var VS_START = '\uFE0E\uFE00';
  var VS_END = '\uFE0F\uFE01';
  var VS_REGEX = /[\uFE00-\uFE0F]/g;
  var VS_WATERMARK_REGEX = /\uFE0E\uFE00([\uFE00-\uFE0F]+)\uFE0F\uFE01/;

  // LAPIS 3: Visual Homoglyphs (Karakter Kembar Sirilik-Latin)
  // Huruf Sirilik yang 100% identik secara visual dengan huruf Latin.
  // Menyatu dalam teks biasa tanpa spasi nol, kebal terhadap penghapusan karakter tak terlihat.
  var HOMOGLYPHS = {
    'a': '\u0430', 'c': '\u0441', 'e': '\u0435', 'i': '\u0456',
    'j': '\u0458', 'o': '\u043E', 'p': '\u0440', 's': '\u0455',
    'x': '\u0445', 'y': '\u0443'
  };
  var REVERSE_HOMOGLYPHS = {
    '\u0430': 'a', '\u0441': 'c', '\u0435': 'e', '\u0456': 'i',
    '\u0458': 'j', '\u043E': 'o', '\u0440': 'p', '\u0455': 's',
    '\u0445': 'x', '\u0443': 'y'
  };
  var HOMOGLYPH_REGEX = /[\u0430\u0441\u0435\u0456\u0458\u043E\u0440\u0455\u0445\u0443]/g;

  function getLearnerSignature() {
    try {
      if (typeof root !== 'undefined' && root.state && root.state.account && root.state.account.id) {
        return 'fz:' + String(root.state.account.id).slice(0, 12);
      }
      var s = root && root.localStorage ? root.localStorage.getItem('fiezel-account-v1') : null;
      if (s) {
        var acc = JSON.parse(s);
        if (acc && acc.id) return 'fz:' + String(acc.id).slice(0, 12);
      }
      var fp = root && root.localStorage ? root.localStorage.getItem('fz_device_fp') : null;
      if (fp) return 'fz:' + fp;
      var newFp = Math.random().toString(36).slice(2, 8);
      if (root && root.localStorage) root.localStorage.setItem('fz_device_fp', newFp);
      return 'fz:' + newFp;
    } catch (_) {
      return 'fz:core';
    }
  }

  function textToHex(text) {
    var hex = '';
    var s = String(text || '');
    for (var i = 0; i < s.length; i++) {
      hex += s.charCodeAt(i).toString(16).padStart(2, '0');
    }
    return hex;
  }

  function hexToText(hex) {
    var out = '';
    var s = String(hex || '');
    for (var i = 0; i < s.length; i += 2) {
      out += String.fromCharCode(parseInt(s.slice(i, i + 2), 16));
    }
    return out;
  }

  function textToBinary(text) {
    var bin = '';
    var s = String(text || '');
    for (var i = 0; i < s.length; i++) {
      var code = s.charCodeAt(i);
      bin += code.toString(2).padStart(8, '0');
    }
    return bin;
  }

  function binaryToText(bin) {
    var out = '';
    for (var i = 0; i < bin.length; i += 8) {
      var chunk = bin.slice(i, i + 8);
      if (chunk.length === 8) {
        out += String.fromCharCode(parseInt(chunk, 2));
      }
    }
    return out;
  }

  function encode(payload) {
    var str = String(payload || '');
    // Lapis 1: Zero-Width Unicode (kompatibel penuh dengan decoder lama)
    var bin = textToBinary(str);
    var zw = ZW_START;
    for (var i = 0; i < bin.length; i++) {
      zw += bin[i] === '1' ? ZW_ONE : ZW_ZERO;
    }
    zw += ZW_END;

    // Lapis 2: Resilient Variation Selectors (\uFE00–\uFE0F)
    // Berada di luar rentang \u200B-\u200D dan \uFEFF sehingga selamat dari pembersihan regex scraper.
    var hex = textToHex(str);
    var vs = VS_START;
    for (var j = 0; j < hex.length; j++) {
      vs += String.fromCharCode(0xFE00 + parseInt(hex[j], 16));
    }
    vs += VS_END;

    return zw + vs;
  }

  function decode(text) {
    var str = String(text || '');

    // 1. Coba dekode dari Lapis 1 (Zero-Width)
    var m1 = str.match(WATERMARK_REGEX);
    if (m1 && m1[1]) {
      var rawZw = m1[1];
      var bin = '';
      for (var i = 0; i < rawZw.length; i++) {
        if (rawZw[i] === ZW_ONE) bin += '1';
        else if (rawZw[i] === ZW_ZERO) bin += '0';
      }
      try {
        var dec1 = binaryToText(bin);
        if (dec1 && dec1.indexOf('fz:') === 0) return dec1;
      } catch (_) {}
    }

    // 2. Coba dekode dari Lapis 2 (Variation Selectors) — jika Lapis 1 telah di-strip penyerang
    var m2 = str.match(VS_WATERMARK_REGEX);
    if (m2 && m2[1]) {
      var rawVs = m2[1];
      var hex = '';
      for (var j = 0; j < rawVs.length; j++) {
        var code = rawVs.charCodeAt(j);
        if (code >= 0xFE00 && code <= 0xFE0F) {
          hex += (code - 0xFE00).toString(16);
        }
      }
      try {
        var dec2 = hexToText(hex);
        if (dec2 && dec2.indexOf('fz:') === 0) return dec2;
      } catch (_) {}
    }

    return null;
  }

  function strip(text) {
    var s = String(text || '').replace(ZW_REGEX, '').replace(VS_REGEX, '');
    return s.replace(HOMOGLYPH_REGEX, function (ch) {
      return REVERSE_HOMOGLYPHS[ch] || ch;
    });
  }

  function hasWatermark(text) {
    var s = String(text || '');
    return WATERMARK_REGEX.test(s) || VS_WATERMARK_REGEX.test(s) || HOMOGLYPH_REGEX.test(s);
  }

  function watermarkText(text, optSignature) {
    if (!text || typeof text !== 'string') return text;
    if (hasWatermark(text)) return text;
    var sig = optSignature || getLearnerSignature();
    var mark = encode(sig);

    // Sisipkan setelah kata pertama jika ada spasi, atau di akhir jika tanpa spasi
    var firstSpace = text.indexOf(' ');
    if (firstSpace > -1) {
      return text.slice(0, firstSpace) + mark + text.slice(firstSpace);
    }
    return text + mark;
  }

  return {
    encode: encode,
    decode: decode,
    strip: strip,
    hasWatermark: hasWatermark,
    watermarkText: watermarkText,
    getLearnerSignature: getLearnerSignature,
    ZW_ZERO: ZW_ZERO,
    ZW_ONE: ZW_ONE,
    ZW_START: ZW_START,
    ZW_END: ZW_END,
    VS_START: VS_START,
    VS_END: VS_END,
    HOMOGLYPHS: HOMOGLYPHS,
    REVERSE_HOMOGLYPHS: REVERSE_HOMOGLYPHS
  };
});
