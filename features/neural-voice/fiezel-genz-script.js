/**
 * m025-42 spoken-script shaping — Gen Z register, and the two pronunciation repairs
 * the research round actually measured.
 *
 * OWNER: "gaya bahasanya jangan baku, lebih ke bahasa anak Gen Z."
 *
 * This layer rewrites what is SPOKEN, never what is stored. Lesson content stays in
 * `features/classroom/classroom-lessons-v1.json` exactly as authored, so nothing in
 * the content pipeline, the transcript, or the written UI changes; only the string
 * handed to the engine does. That is what makes the register switchable without a
 * content migration, and reversible if OWNER wants a different register later.
 *
 * Two of the rules are not style at all, they are defect fixes found by round-tripping
 * generated audio back through ASR:
 *
 *   1. A bare single letter glues to its neighbour. "A sama an itu..." came back as
 *      "asaman". Wrapping the letter as a quoted word ("kata 'a' dan kata 'an'") was
 *      the only one of four candidate phrasings that survived the round trip.
 *   2. "diawali bunyi yu" came back as "di awal ibu Nyu" - the English fragment merges
 *      with the Indonesian word before it. "bunyi awalnya seperti yu" survived.
 *
 * Both engines (old Piper and new Supertonic) failed the same way, so these belong to
 * the script layer rather than to any adapter.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.FiezelGenZScript = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // Formal -> conversational. Deliberately small and boring: every entry is a word a
  // Jakarta teenager would actually say, none is slang that dates within a year
  // ("bestie", "anjay", "gaskeun" are intentionally absent), and none collides with
  // an English lesson term. Matching is word-boundary only, so English target
  // sentences inside a line are left alone.
  var CASUAL = Object.freeze([
    ['sudah', 'udah'],
    ['telah', 'udah'],
    ['tidak', 'nggak'],
    ['tak', 'nggak'],
    ['bukan main', 'keren'],
    ['benar', 'bener'],
    ['membuat', 'bikin'],
    ['seperti', 'kayak'],
    ['bertanya', 'nanya'],
    ['mudah', 'gampang'],
    ['saya', 'aku'],
    ['anda', 'kamu'],
    ['tetapi', 'tapi'],
    ['namun', 'tapi'],
    ['karena', 'soalnya'],
    ['oleh karena itu', 'makanya'],
    ['dengan kata lain', 'jadinya'],
    ['selesai', 'kelar'],
    ['melihat', 'lihat'],
    ['mengucapkan', 'ucapin'],
    ['perhatikan', 'perhatiin'],
    ['mari kita', 'yuk kita'],
    ['selamat datang', 'haloo']
  ]);

  // Anti-bosan pools. A tutor that opens every lesson with the same word is the
  // boredom OWNER is trying to remove, so the caller rotates instead of repeating.
  var OPENERS = Object.freeze([
    'Haloo!', 'Oke, siap?', 'Yuk!', 'Nah, kita lanjut ya.',
    'Hei, balik lagi nih.', 'Oke, gas!', 'Siap ya?', 'Yuk kita mulai.'
  ]);
  var PRAISES = Object.freeze([
    'Wih, keren banget!', 'Mantap!', 'Nah, bener!', 'Sip, tepat!',
    'Keren, lanjut!', 'Yes, itu dia!', 'Bagus banget!', 'Top, kamu paham!'
  ]);

  function escapeRe(value) { return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  // "sangat mudah" -> "gampang banget", not "banget gampang": in casual Indonesian the
  // intensifier follows the word it intensifies. A flat word-for-word dictionary gets
  // this backwards, so intensifiers are their own rule.
  function moveIntensifier(text) {
    return String(text)
      .replace(/\bsangat\s+([\w'-]+)/gi, function (_m, word) { return word + ' banget'; })
      .replace(/\b([\w'-]+)\s+sekali\b/gi, function (_m, word) { return word + ' banget'; });
  }

  function matchCase(source, replacement) {
    if (/^[A-Z]/.test(source)) return replacement.charAt(0).toUpperCase() + replacement.slice(1);
    return replacement;
  }

  /** Formal Indonesian -> the register the tutor speaks in. */
  function casualize(text) {
    var out = moveIntensifier(String(text == null ? '' : text));
    if (!out.trim()) return '';
    CASUAL.forEach(function (pair) {
      var re = new RegExp('(^|[^\\w-])(' + escapeRe(pair[0]) + ')(?![\\w-])', 'gi');
      out = out.replace(re, function (_m, lead, word) { return lead + matchCase(word, pair[1]); });
    });
    return out.replace(/\s+/g, ' ').trim();
  }

  /**
   * Pronunciation repairs. Applied after casualize so the rewritten text is what gets
   * protected, and safe to re-run: a letter already quoted is not quoted again.
   */
  function pronounceable(text) {
    var out = String(text == null ? '' : text);
    if (!out.trim()) return '';

    // "diawali bunyi X" / "diawali dengan bunyi X" -> the phrasing that survived ASR.
    out = out.replace(/\bdiawali\s+(?:dengan\s+)?bunyi\s+/gi, 'bunyi awalnya seperti ');

    // Bare grammar articles spoken as letters. Narrower than it looks on purpose:
    // the defect only appears when the article is NOT starting an English noun phrase -
    // "A sama an itu", "kita pakai a, bukan an" - because there the engine has nothing
    // to bind the letter to except the neighbouring Indonesian word. In "a university
    // student" the article is doing its normal job and must be left exactly as written,
    // or the tutor would say "kata a university student" out loud.
    var FOLLOWERS = ['sama', 'dan', 'atau', 'itu', 'bukan', 'ya', 'nih', 'sih', 'juga'];
    var followRe = '(?:' + FOLLOWERS.map(escapeRe).join('|') + ')';
    ['a', 'an', 'the', 'i'].forEach(function (token) {
      // Adjacent on either side: "... dan an dipakai" is the same defect as "a, bukan an".
      var re = new RegExp(
        "(^|[^\\w'\u2019-])(" + escapeRe(token) + ")(?=\\s*(?:[,.;:!?]|$)|\\s+" + followRe + "\\b)",
        'gi');
      var reAfterConnector = new RegExp(
        "(\\b" + followRe + "\\s+)(" + escapeRe(token) + ")(?![\\w'\u2019-])", 'gi');
      var quote = function (match, lead, word, offset, whole) {
        var before = whole.slice(Math.max(0, offset - 6), offset + lead.length);
        if (/kata\s+'$|'$/.test(before)) return match;
        // A sentence-initial article keeps the sentence's capital on the carrier word,
        // so the line still reads (and is spoken) as a sentence opening.
        var carrier = (offset === 0 && /^[A-Z]/.test(word)) ? 'Kata' : 'kata';
        return lead + carrier + " '" + word.toLowerCase() + "'";
      };
      out = out.replace(re, quote);
      out = out.replace(reAfterConnector, function (match, lead, word, offset, whole) {
        var head = whole.slice(Math.max(0, offset - 6), offset + lead.length);
        if (/kata\s+'$|'$/.test(head)) return match;
        return lead + "kata '" + word.toLowerCase() + "'";
      });
    });

    return out.replace(/\s+([,.;:!?])/g, '$1').replace(/\s+/g, ' ').trim();
  }

  /**
   * The full spoken-text pipeline for one Indonesian line.
   * English lines are passed through untouched: the casual dictionary is Indonesian,
   * and the target language must never be "made casual" by us.
   */
  function speakable(text, lang) {
    var line = String(text == null ? '' : text);
    if (!line.trim()) return '';
    if (!/^id/i.test(String(lang || 'id'))) return line.replace(/\s+/g, ' ').trim();
    return pronounceable(casualize(line));
  }

  /** Deterministic-but-rotating pick, so a session never repeats twice in a row. */
  function rotate(pool, index) {
    var list = pool && pool.length ? pool : [''];
    var i = Number(index);
    if (!Number.isFinite(i) || i < 0) i = 0;
    return list[Math.floor(i) % list.length];
  }

  function opener(index) { return rotate(OPENERS, index); }
  function praise(index) { return rotate(PRAISES, index); }

  return Object.freeze({
    CASUAL: CASUAL,
    OPENERS: OPENERS,
    PRAISES: PRAISES,
    casualize: casualize,
    moveIntensifier: moveIntensifier,
    pronounceable: pronounceable,
    speakable: speakable,
    opener: opener,
    praise: praise
  });
}));
