/**
 * FIEZEL Param Ledger — rantai hash untuk perubahan parameter otak, di perangkat.
 *
 * KENAPA MODUL INI ADA
 * --------------------
 * Langkah 5 roadmap otonomi akan membiarkan otak mengubah parameternya sendiri. Sebuah sistem
 * yang bisa mengubah dirinya TANPA catatan yang bisa diperiksa bukan sistem otonom — ia
 * sistem yang tidak bisa dipertanggungjawabkan. Sebelum satu parameter pun boleh bergerak
 * sendiri, harus ada jawaban untuk tiga pertanyaan, kapan pun ditanyakan:
 *
 *   1. apa yang berubah, dari nilai berapa ke berapa, dan kapan;
 *   2. atas bukti apa (verdict mana, dengan interval berapa);
 *   3. bagaimana mengembalikannya.
 *
 * KENAPA RANTAI HASH, BUKAN SEKADAR DAFTAR
 * ----------------------------------------
 * Daftar biasa bisa disunting di tengah tanpa jejak — dan yang paling menggoda untuk disunting
 * justru entri yang memalukan: perubahan yang memperburuk lalu dikembalikan. Setiap entri
 * membawa hash entri sebelumnya, jadi mengubah satu entri lama membuat SELURUH rantai
 * sesudahnya tidak cocok. verify() menunjuk persis di mana rantai putus, bukan sekadar
 * mengatakan "ada yang salah".
 *
 * ROLLBACK MENAMBAH SEJARAH, TIDAK MENGHAPUSNYA
 * ---------------------------------------------
 * rollbackTo() mengembalikan nilai parameter DAN mencatat pengembalian itu sebagai entri
 * baru. Sejarah tidak pernah dipotong untuk menyembunyikan kesalahan: percobaan yang gagal
 * adalah bukti paling berharga tentang apa yang tidak berhasil, dan sistem yang menghapusnya
 * akan mengulangi kesalahan yang sama.
 *
 * Modul MURNI: tanpa DOM, jaringan, penyimpanan, sumber acak, atau jam internal. Waktu selalu
 * argumen. Fungsi hash-nya sinkron dan deterministik (FNV-1a + fmix32 ganda menuju 64 bit
 * heksadesimal) — WebCrypto bersifat async dan akan memaksa seluruh rantai jadi async, yang
 * berarti penulisnya bisa berpacu dengan dirinya sendiri.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FiezelParamLedger = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var SCHEMA = 'fiezel-param-ledger-v1';
  var GENESIS_HASH = '0000000000000000';
  /* Peristiwa yang boleh dicatat — kosakata TERTUTUP. Peristiwa bebas berarti rantai yang
     bisa diisi apa saja, dan rantai yang bisa diisi apa saja tidak menjelaskan apa-apa. */
  var EVENTS = ['param_proposed', 'param_applied', 'param_rolled_back', 'experiment_started', 'experiment_ended', 'halt'];
  var MAX_ENTRIES = 500;

  function str(v) { return typeof v === 'string' ? v.trim() : ''; }
  function num(v) { return typeof v === 'number' && isFinite(v) ? v : null; }

  function fnv1a(s) {
    var h = 0x811c9dc5;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    return h >>> 0;
  }
  function fmix32(h) {
    h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b) >>> 0;
    h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35) >>> 0;
    h ^= h >>> 16; return h >>> 0;
  }
  function hex8(n) { var s = (n >>> 0).toString(16); return '00000000'.slice(s.length) + s; }
  /** 64 bit dari dua jalur berbeda atas masukan yang sama — satu jalur 32 bit terlalu mudah
   *  bertabrakan untuk sesuatu yang gunanya membuktikan tidak ada yang menyunting. */
  function hash64(s) {
    return hex8(fmix32(fnv1a(s))) + hex8(fmix32(fnv1a(s + '#2')));
  }

  /** Bentuk kanonik entri untuk di-hash. Urutan field DIKUNCI di sini: hash yang bergantung
   *  urutan properti objek akan berubah tanpa datanya berubah. */
  function canonical(e) {
    return JSON.stringify([
      e.seq, e.event, e.path, e.from, e.to, e.reason, e.evidence, e.at, e.prevHash
    ]);
  }

  function entryHash(e) { return hash64(canonical(e)); }

  /** genesis(nowMs) -> rantai baru berisi satu entri akar. */
  function genesis(nowMs) {
    var at = num(nowMs) === null ? 0 : Math.floor(nowMs);
    var e = {
      seq: 0, event: 'param_applied', path: '', from: null, to: null,
      reason: 'genesis', evidence: null, at: at, prevHash: GENESIS_HASH
    };
    e.hash = entryHash(e);
    return { schema: SCHEMA, entries: [e] };
  }

  function normalize(chain) {
    var ok = chain && typeof chain === 'object' && Array.isArray(chain.entries) && chain.entries.length;
    return ok && chain.schema === SCHEMA ? chain : null;
  }

  /**
   * append(chain, raw, nowMs) -> rantai BARU (argumen tidak dimutasi).
   * Entri tak sah DITOLAK dengan mengembalikan rantai apa adanya — menulis entri setengah sah
   * ke dalam rantai bukti berarti buktinya sendiri jadi ragu.
   */
  function append(chain, raw, nowMs) {
    var base = normalize(chain) || genesis(nowMs);
    var e = raw && typeof raw === 'object' ? raw : null;
    if (!e) return base;
    var event = str(e.event);
    if (EVENTS.indexOf(event) < 0) return base;

    var prev = base.entries[base.entries.length - 1];
    var next = {
      seq: prev.seq + 1,
      event: event,
      path: str(e.path),
      from: e.from === undefined ? null : e.from,
      to: e.to === undefined ? null : e.to,
      reason: str(e.reason).slice(0, 300),
      evidence: e.evidence && typeof e.evidence === 'object' ? e.evidence : null,
      at: num(nowMs) === null ? prev.at : Math.floor(nowMs),
      prevHash: prev.hash
    };
    next.hash = entryHash(next);
    var entries = base.entries.concat([next]);
    /* Pemangkasan MERANTAI ULANG dari entri tertua yang tersisa. Memotong tanpa merantai ulang
       menghasilkan rantai yang verify()-nya selalu merah — dan gerbang yang selalu merah akan
       dimatikan orang, yang artinya jaminannya hilang sama sekali. */
    if (entries.length > MAX_ENTRIES) entries = rechain(entries.slice(entries.length - MAX_ENTRIES));
    return { schema: SCHEMA, entries: entries };
  }

  function rechain(entries) {
    var out = [], prevHash = GENESIS_HASH;
    for (var i = 0; i < entries.length; i++) {
      var e = entries[i];
      var next = {
        seq: e.seq, event: e.event, path: e.path, from: e.from, to: e.to,
        reason: e.reason, evidence: e.evidence, at: e.at, prevHash: prevHash
      };
      next.hash = entryHash(next);
      out.push(next);
      prevHash = next.hash;
    }
    return out;
  }

  /**
   * verify(chain) -> {ok, brokenAt, length}
   * brokenAt menunjuk seq entri PERTAMA yang tidak cocok. Menunjuk tempatnya penting: rantai
   * yang cuma bilang "rusak" tidak memberi tahu apakah yang disunting satu entri lama atau
   * seluruh ekornya.
   */
  function verify(chain) {
    var base = normalize(chain);
    if (!base) return { ok: false, brokenAt: null, length: 0, rationale: 'brain4_ledger_invalid' };
    var prevHash = GENESIS_HASH;
    for (var i = 0; i < base.entries.length; i++) {
      var e = base.entries[i];
      if (e.prevHash !== prevHash) {
        return { ok: false, brokenAt: e.seq, length: base.entries.length, rationale: 'brain4_ledger_broken_link' };
      }
      var salinan = {
        seq: e.seq, event: e.event, path: e.path, from: e.from, to: e.to,
        reason: e.reason, evidence: e.evidence, at: e.at, prevHash: e.prevHash
      };
      if (entryHash(salinan) !== e.hash) {
        return { ok: false, brokenAt: e.seq, length: base.entries.length, rationale: 'brain4_ledger_tampered' };
      }
      prevHash = e.hash;
    }
    return { ok: true, brokenAt: null, length: base.entries.length, rationale: 'brain4_ledger_ok' };
  }

  /**
   * rollbackTo(chain, seq, nowMs) -> {chain, restored}
   * Mengembalikan setiap parameter yang berubah SETELAH seq ke nilai sebelum perubahannya,
   * dari yang terbaru ke terlama supaya nilai akhirnya adalah keadaan pada titik seq. Setiap
   * pengembalian dicatat sebagai entri BARU.
   */
  function rollbackTo(chain, seq, nowMs) {
    var base = normalize(chain);
    if (!base) return { chain: genesis(nowMs), restored: [] };
    var target = num(seq);
    if (target === null) return { chain: base, restored: [] };

    var sesudah = base.entries.filter(function (e) {
      return e.seq > target && e.event === 'param_applied' && e.path;
    });
    var out = base, restored = [];
    for (var i = sesudah.length - 1; i >= 0; i--) {
      var e = sesudah[i];
      out = append(out, {
        event: 'param_rolled_back',
        path: e.path,
        from: e.to,
        to: e.from,
        reason: 'rollback ke seq ' + target,
        evidence: { rolledBackSeq: e.seq }
      }, nowMs);
      restored.push({ path: e.path, to: e.from, fromSeq: e.seq });
    }
    return { chain: out, restored: restored };
  }

  /** Nilai efektif tiap parameter menurut rantai — apa yang sedang berlaku, menurut catatan. */
  function effective(chain) {
    var base = normalize(chain);
    var out = {};
    if (!base) return out;
    for (var i = 0; i < base.entries.length; i++) {
      var e = base.entries[i];
      if (!e.path) continue;
      if (e.event === 'param_applied' || e.event === 'param_rolled_back') out[e.path] = e.to;
    }
    return out;
  }

  return {
    SCHEMA: SCHEMA,
    EVENTS: EVENTS,
    MAX_ENTRIES: MAX_ENTRIES,
    genesis: genesis,
    append: append,
    verify: verify,
    rollbackTo: rollbackTo,
    effective: effective
  };
});
