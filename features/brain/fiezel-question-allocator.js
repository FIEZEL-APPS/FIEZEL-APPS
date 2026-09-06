/**
 * FIEZEL Question Allocator — BANKOR SEBAGAI MESIN ALOKASI, BUKAN LEMARI SOAL.
 *
 * ==========================================================================
 * SATU TUGAS GURU, TIGA PULUH SET SOAL
 * ==========================================================================
 * Guru membuat SATU tugas: "Past Tense, 20 soal". Berkas ini yang mengubahnya
 * menjadi 30 set berbeda — satu per murid — tanpa guru membuat 30 tugas.
 * Tujuannya tetap satu dan sama; yang berbeda adalah BUTIR yang dipakai untuk
 * mencapainya, karena tiga puluh murid itu tidak berdiri di titik yang sama.
 *
 * Alokasi terjadi DI PERANGKAT MURID, saat tugas dibuka. Alasannya ada di kepala
 * `fiezel-question-memory.js` dan tidak diulang di sini selain satu kalimat: data
 * yang dibutuhkan untuk memilih hanya lengkap di perangkat, dan memindahkannya ke
 * server berarti membayar ratusan tulis D1 sekaligus membatalkan janji privasi
 * yang sudah ditegakkan gerbang lain.
 *
 * ==========================================================================
 * ATURAN YANG TIDAK BOLEH DILANGGAR: SOAL MANUAL ADALAH PERINTAH
 * ==========================================================================
 * Kalau guru memilih sendiri butirnya, Bankor TIDAK BOLEH ikut campur — tidak
 * menambah, tidak membuang, tidak menukar, tidak mengurutkan ulang. Guru yang
 * memilih empat soal tertentu sedang mengajar sesuatu yang spesifik, dan sistem
 * yang "memperbaiki" pilihan itu sedang membatalkan keputusan pengajaran.
 *
 * Aturan itu tidak ditulis sebagai komentar dan diharapkan diingat orang.
 * `resolve()` di bawah MENOLAK menyentuh set manual sebagai cabang pertama, dan
 * `tests/question-allocator-test.js` membuktikannya dengan ingatan murid yang
 * dirancang khusus supaya alokator SANGAT ingin mengubahnya.
 *
 * ==========================================================================
 * KENAPA SET YANG KURANG TIDAK PERNAH DITAMBAL DIAM-DIAM
 * ==========================================================================
 * Murid yang sudah menguasai hampir seluruh bank akan membuat kolam calon habis.
 * Godaannya adalah mengisi sisanya dengan butir yang baru saja ia kerjakan dan
 * berpura-pura set itu utuh. Itu kebohongan yang mahal: guru melihat "20 soal",
 * murid mengerjakan pengulangan, dan buktinya masuk seolah-olah pengukuran baru.
 *
 * Jadi pelonggaran dilakukan BERTAHAP dan setiap tahap DILAPORKAN di hasil:
 *   `relaxed`   — pembatas konsep dilonggarkan supaya jumlahnya tercapai;
 *   `repeated`  — butir yang baru saja tampil terpaksa dipakai;
 *   `short`     — jumlah yang diminta memang tidak bisa dipenuhi.
 * Pemanggil boleh memutuskan cara menyampaikannya, tetapi tidak bisa berpura-pura
 * tidak tahu.
 *
 * MODUL MURNI: tanpa DOM, jaringan, penyimpanan, sumber acak, atau jam internal.
 * Acak diganti pengocok ber-seed, sehingga dua murid dengan riwayat sama tetap
 * mendapat urutan berbeda (seed dari id mereka) dan setiap hasil bisa diputar ulang.
 */
(function (root, factory) {
  var api = factory(root && root.FiezelQuestionMemory);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FiezelQuestionAllocator = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (injectedMemory) {
  'use strict';

  var SCHEMA = 'fiezel-question-allocator-v1';

  /** Tiga mode dari rancangan; `resolve()` mencabangkannya. */
  var MODES = ['manual', 'adaptive', 'constrained'];

  var DEFAULT_CONCEPT_CAP = 2;
  var MAX_COUNT = 60;

  function memoryApi() {
    if (injectedMemory) return injectedMemory;
    try {
      var g = typeof globalThis !== 'undefined' ? globalThis : null;
      if (g && g.FiezelQuestionMemory) return g.FiezelQuestionMemory;
    } catch (_) { /* lingkungan tanpa global — pemanggil wajib menyuntik */ }
    return null;
  }

  /**
   * Hash ber-seed 32-bit atas string. Dipakai sebagai pemecah seri yang STABIL:
   * dua murid dengan riwayat identik tetap mendapat urutan berbeda karena seed-nya
   * diturunkan dari id mereka, dan set yang sama bisa dibangun ulang persis untuk
   * diperiksa. Pengocok berbasis jam akan menghancurkan keduanya sekaligus.
   */
  function hash(str, seed) {
    var h = (seed | 0) ^ 0x9e3779b9;
    var s = String(str);
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = (h * 16777619) >>> 0;
    }
    return h >>> 0;
  }

  function intSeed(v) {
    if (typeof v === 'number' && isFinite(v)) return Math.floor(v) | 0;
    return hash(v == null ? '' : String(v), 7) | 0;
  }

  /**
   * Nilai setiap calon: keadaannya, prioritasnya, konsepnya.
   * Butir yang tidak punya id DIBUANG di sini — butir tanpa id tidak bisa diingat,
   * jadi memasukkannya berarti ia akan tampil berulang selamanya.
   */
  function score(pool, memory, nowMs, opts) {
    var M = memoryApi();
    var out = [];
    if (!Array.isArray(pool) || !M) return out;
    for (var i = 0; i < pool.length; i++) {
      var item = pool[i];
      if (!item || typeof item !== 'object' || typeof item.id !== 'string' || !item.id) continue;
      var state = M.stateOf(memory, item.id, nowMs, opts);
      out.push({
        item: item,
        id: item.id,
        state: state,
        priority: M.priorityOf(state),
        concept: M.conceptOf(item)
      });
    }
    return out;
  }

  /** Urutkan: prioritas turun, lalu pemecah seri ber-seed yang stabil. */
  function order(cands, seed) {
    var s = intSeed(seed);
    return cands.slice().sort(function (a, b) {
      if (b.priority !== a.priority) return b.priority - a.priority;
      var ha = hash(a.id, s), hb = hash(b.id, s);
      if (ha !== hb) return ha - hb;
      return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
    });
  }

  /**
   * allocate(opts) -> { items, picks, byState, relaxed, repeated, short, count }
   *
   * opts = {
   *   pool,        // calon butir (objek bank, wajib punya .id)
   *   memory,      // ingatan soal murid ini
   *   count,       // berapa butir diminta
   *   nowMs,       // waktu — WAJIB argumen, tidak pernah dibaca dari jam
   *   seed,        // apa saja; id murid adalah pilihan yang benar
   *   conceptCap,  // maksimum butir sekonsep dalam satu set (default 2)
   *   memoryOpts   // ambang keadaan; diteruskan apa adanya ke question-memory
   * }
   */
  function allocate(opts) {
    var o = opts || {};
    var count = Math.max(0, Math.min(MAX_COUNT, (Number(o.count) || 0) | 0));
    var cap = o.conceptCap == null ? DEFAULT_CONCEPT_CAP : Math.max(1, (Number(o.conceptCap) || 1) | 0);
    var nowMs = typeof o.nowMs === 'number' && isFinite(o.nowMs) ? o.nowMs : null;
    var cands = order(score(o.pool, o.memory, nowMs, o.memoryOpts), o.seed);

    var picks = [], taken = {}, perConcept = {};
    var relaxed = false, repeated = false;

    /* Lintasan 1 — hormati pembatas konsep, dan JANGAN sentuh yang baru saja tampil. */
    for (var i = 0; i < cands.length && picks.length < count; i++) {
      var c = cands[i];
      if (taken[c.id] || c.priority <= 0) continue;
      var key = c.concept;
      if (key) {
        var n = perConcept[key] || 0;
        if (n >= cap) continue;
        perConcept[key] = n + 1;
      }
      taken[c.id] = true;
      picks.push(c);
    }

    /* Lintasan 2 — masih kurang: longgarkan pembatas konsep, dan katakan begitu. */
    if (picks.length < count) {
      for (var j = 0; j < cands.length && picks.length < count; j++) {
        var c2 = cands[j];
        if (taken[c2.id] || c2.priority <= 0) continue;
        taken[c2.id] = true;
        relaxed = true;
        picks.push(c2);
      }
    }

    /* Lintasan 3 — kolam benar-benar habis: pakai yang baru saja tampil, dan
       tandai `repeated` supaya layar bisa berkata jujur bahwa ini pengulangan. */
    if (picks.length < count) {
      for (var k = 0; k < cands.length && picks.length < count; k++) {
        var c3 = cands[k];
        if (taken[c3.id]) continue;
        taken[c3.id] = true;
        repeated = true;
        picks.push(c3);
      }
    }

    var byState = {};
    for (var p = 0; p < picks.length; p++) {
      byState[picks[p].state] = (byState[picks[p].state] || 0) + 1;
    }

    return {
      schema: SCHEMA,
      items: picks.map(function (x) { return x.item; }),
      picks: picks.map(function (x) {
        return { id: x.id, state: x.state, priority: x.priority, concept: x.concept };
      }),
      byState: byState,
      count: picks.length,
      requested: count,
      relaxed: relaxed,
      repeated: repeated,
      short: picks.length < count
    };
  }

  /**
   * resolve(plan) -> { mode, items, allocation }
   *
   * Satu pintu untuk ketiga mode, dan cabang PERTAMA-nya adalah aturan yang tidak
   * boleh dilanggar: set manual dikembalikan APA ADANYA — objek yang sama, urutan
   * yang sama, tanpa satu pun keputusan Bankor menyentuhnya.
   *
   * `plan` = { mode, items?, pool?, count?, memory, nowMs, seed, conceptCap }
   */
  function resolve(plan) {
    var p = plan || {};
    var mode = MODES.indexOf(p.mode) >= 0 ? p.mode : 'manual';

    if (mode === 'manual') {
      return {
        mode: 'manual',
        items: Array.isArray(p.items) ? p.items.slice() : [],
        allocation: null
      };
    }

    /* `constrained` memakai mesin yang sama; bedanya kolam calon sudah DISARING
       pemanggil sesuai batasan guru (skill, subskill, tingkat kesulitan). Bankor
       tetap tidak boleh keluar dari kolam itu — itulah arti "adaptif di dalam
       batasan guru", dan menyaring di hulu membuatnya mustahil dilanggar di sini. */
    var alloc = allocate({
      pool: p.pool,
      memory: p.memory,
      count: p.count,
      nowMs: p.nowMs,
      seed: p.seed,
      conceptCap: p.conceptCap,
      memoryOpts: p.memoryOpts
    });
    return { mode: mode, items: alloc.items, allocation: alloc };
  }

  return {
    SCHEMA: SCHEMA,
    MODES: MODES,
    DEFAULT_CONCEPT_CAP: DEFAULT_CONCEPT_CAP,
    MAX_COUNT: MAX_COUNT,
    hash: hash,
    allocate: allocate,
    resolve: resolve
  };
});
