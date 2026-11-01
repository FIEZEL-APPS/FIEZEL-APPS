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

  var ZW_ZERO = '\u200B';   // Zero-Width Space (bit 0)
  var ZW_ONE = '\u200C';    // Zero-Width Non-Joiner (bit 1)
  var ZW_START = '\u200D';  // Zero-Width Joiner (delimiter start)
  var ZW_END = '\uFEFF';    // Zero-Width No-Break Space (delimiter end)
  var ZW_REGEX = /[\u200B\u200C\u200D\uFEFF]/g;
  var WATERMARK_REGEX = /\u200D([\u200B\u200C]+)\uFEFF/;

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
    var bin = textToBinary(payload);
    var zw = ZW_START;
    for (var i = 0; i < bin.length; i++) {
      zw += bin[i] === '1' ? ZW_ONE : ZW_ZERO;
    }
    zw += ZW_END;
    return zw;
  }

  function decode(text) {
    var m = String(text || '').match(WATERMARK_REGEX);
    if (!m || !m[1]) return null;
    var rawZw = m[1];
    var bin = '';
    for (var i = 0; i < rawZw.length; i++) {
      if (rawZw[i] === ZW_ONE) bin += '1';
      else if (rawZw[i] === ZW_ZERO) bin += '0';
    }
    try {
      return binaryToText(bin);
    } catch (_) {
      return null;
    }
  }

  function strip(text) {
    return String(text || '').replace(ZW_REGEX, '');
  }

  function hasWatermark(text) {
    return WATERMARK_REGEX.test(String(text || ''));
  }

  function watermarkText(text, optSignature) {
    if (!text || typeof text !== 'string') return text;
    if (hasWatermark(text)) return text;
    var sig = optSignature || getLearnerSignature();
    var zwMark = encode(sig);

    // Sisipkan setelah kata pertama jika ada spasi, atau di akhir jika tanpa spasi
    var firstSpace = text.indexOf(' ');
    if (firstSpace > -1) {
      return text.slice(0, firstSpace) + zwMark + text.slice(firstSpace);
    }
    return text + zwMark;
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
    ZW_END: ZW_END
  };
});
