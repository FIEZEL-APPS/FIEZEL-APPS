/**
 * FIEZEL · features/interactive-chat/fiezel-chat-voice.js
 * Satu pintu suara untuk Ngobrol AI dan Panggilan (voice call).
 *
 * KEPUTUSAN OWNER (diulang 17 Okt 2026 untuk voice call): suara Fiezel memakai pipeline Neural
 * Voice resmi — FiezelVoiceSay (aset R2 → Cloudflare TTS → Puter → neural di perangkat) dan
 * Puter Voice — dan TIDAK PERNAH memakai TTS bawaan peramban. Kanon m025-232/m025-246: "tts
 * browser harus mati total." Modul chat dulu menyimpan cadangan TTS peramban sendiri di luar
 * zona audio, dan dari situlah suara robot itu kembali; tests/audio-locale-guard-test.js kini
 * ikut menjaga direktori ini.
 *
 * TANGGA SUARA, per bahasa kursus:
 *   en  FiezelVoiceSay.say()            — tangga resmi lengkap, termasuk L2 Puter dan L3 lokal
 *       FiezelPuterVoice.speak()        — hanya bila FiezelVoiceSay belum termuat
 *   ja  FiezelPuterVoice.speak(ja-JP)   — 'generative' lebih dulu, 'neural' bila ditolak
 *   semua gagal → DIAM (resolve false). Teks balasan tetap tampil di layar; itu L5 yang sama
 *   dengan fitur lain, bukan galat.
 *
 * LATENSI PERCAKAPAN TELEPON. Balasan dipotong per kalimat: kalimat PERTAMA dirender dan
 * diputar sendirian (render pendek = suara pertama lebih cepat), sementara kalimat
 * berikutnya dihangatkan lewat prefetch() selagi kalimat sekarang berbunyi. Potongan yang
 * terlalu pendek ("Oh!") digabung ke kalimat sesudahnya supaya ucapan tidak tersendat.
 *
 * BARGE-IN. stop() menaikkan token dan membungkam setiap lapisan; loop kalimat memeriksa
 * token sebelum setiap kalimat, jadi interupsi murid memutus sisa balasan seketika.
 */
(function (root, factory) {
  'use strict';
  var api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FiezelChatVoice = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  'use strict';

  var MIN_CHUNK_CHARS = 14;
  var token = 0;
  // Mesin Puter untuk ja-JP yang terbukti menjawab di sesi ini ('generative' / 'neural').
  var jaEngine = '';

  function voiceSay() { return root.FiezelVoiceSay || null; }
  function puter() { return root.FiezelPuterVoice || null; }

  /** Buang furigana [漢字](かんじ) → 漢字 dan tanda markdown; yang diucapkan hanya kalimatnya. */
  function cleanText(text) {
    return String(text == null ? '' : text)
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/[*_~`#>]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /** Potong per kalimat; potongan pendek digabung ke kalimat berikutnya. */
  function splitSentences(text, course) {
    var t = cleanText(text);
    if (!t) return [];
    var re = course === 'ja'
      ? /[^。！？!?]+[。！？!?]*/g
      : /[^.!?]+[.!?]+["'”’)]*\s*|[^.!?]+$/g;
    var parts = (t.match(re) || [t]).map(function (p) { return p.trim(); }).filter(Boolean);
    var out = [];
    var carry = '';
    for (var i = 0; i < parts.length; i++) {
      var piece = carry ? carry + (course === 'ja' ? '' : ' ') + parts[i] : parts[i];
      if (piece.length < MIN_CHUNK_CHARS && i < parts.length - 1) { carry = piece; continue; }
      out.push(piece);
      carry = '';
    }
    if (carry) out.push(carry);
    return out;
  }

  function speakJa(sentence) {
    var p = puter();
    if (!p || typeof p.speak !== 'function') return Promise.resolve(false);
    var engines = jaEngine ? [jaEngine] : ['generative', 'neural'];
    function attempt(i) {
      if (i >= engines.length) return Promise.resolve(false);
      return Promise.resolve(p.speak(sentence, { lang: 'ja-JP', engine: engines[i] })).then(function (ok) {
        if (ok) jaEngine = engines[i];
        return !!ok;
      }, function () {
        return attempt(i + 1);
      });
    }
    return attempt(0);
  }

  function speakEn(sentence) {
    var vs = voiceSay();
    if (vs && typeof vs.say === 'function') {
      return Promise.resolve(vs.say(sentence, { suppressSubtitles: true })).then(function (ok) { return !!ok; }, function () { return false; });
    }
    var p = puter();
    if (p && typeof p.speak === 'function') {
      return Promise.resolve(p.speak(sentence, { lang: 'en-US' })).then(function (ok) { return !!ok; }, function () { return false; });
    }
    return Promise.resolve(false);
  }

  /** Menghangatkan kalimat berikutnya. Tidak pernah reject dan tidak pernah berbunyi. */
  function prefetch(sentence, course) {
    try {
      if (course === 'ja') {
        var p = puter();
        if (p && typeof p.prefetch === 'function') return Promise.resolve(p.prefetch(sentence, { lang: 'ja-JP', engine: jaEngine || 'generative' })).catch(function () { return false; });
        return Promise.resolve(false);
      }
      var vs = voiceSay();
      if (vs && typeof vs.prefetch === 'function') return Promise.resolve(vs.prefetch(sentence, {})).catch(function () { return false; });
    } catch (_) {}
    return Promise.resolve(false);
  }

  function isAvailable(course) {
    if (course === 'ja') return !!(puter() && typeof puter().speak === 'function');
    return !!((voiceSay() && typeof voiceSay().say === 'function') || (puter() && typeof puter().speak === 'function'));
  }

  /**
   * Ucapkan satu balasan.
   * @param {string} text
   * @param {'en'|'ja'} course
   * @param {{onSentenceStart?:function(number,string), onEnd?:function(boolean)}} [hooks]
   * @returns {Promise<boolean>} true bila minimal satu kalimat berbunyi dan giliran tidak diputus
   */
  function speak(text, course, hooks) {
    stop();
    var mine = ++token;
    var h = hooks || {};
    var c = course === 'ja' ? 'ja' : 'en';
    var sentences = splitSentences(text, c);
    var spokeAny = false;

    function finish(ok) {
      if (typeof h.onEnd === 'function') { try { h.onEnd(ok); } catch (_) {} }
      return ok;
    }
    if (!sentences.length || !isAvailable(c)) return Promise.resolve(finish(false));

    function step(i) {
      if (mine !== token) return Promise.resolve(false);
      if (i >= sentences.length) return Promise.resolve(spokeAny);
      if (i + 1 < sentences.length) prefetch(sentences[i + 1], c);
      if (typeof h.onSentenceStart === 'function') { try { h.onSentenceStart(i, sentences[i]); } catch (_) {} }
      var run = c === 'ja' ? speakJa(sentences[i]) : speakEn(sentences[i]);
      return run.then(function (ok) {
        if (mine !== token) return false;
        if (!ok) return spokeAny; // lapisan habis: sisa balasan tetap terbaca di layar
        spokeAny = true;
        return step(i + 1);
      });
    }
    return step(0).then(function (ok) { return finish(mine === token && ok); });
  }

  /** Barge-in / ganti giliran: putus loop kalimat dan bungkam semua lapisan. */
  function stop() {
    token++;
    var vs = voiceSay();
    if (vs && typeof vs.stop === 'function') { try { vs.stop(); } catch (_) {} }
    var p = puter();
    if (p && typeof p.stop === 'function') { try { p.stop(); } catch (_) {} }
    return true;
  }

  return {
    speak: speak,
    stop: stop,
    prefetch: prefetch,
    isAvailable: isAvailable,
    splitSentences: splitSentences,
    cleanText: cleanText
  };
}));
