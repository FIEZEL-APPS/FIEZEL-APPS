/**
 * FIEZEL Question Memory — INGATAN SOAL PER MURID.
 *
 * ==========================================================================
 * MASALAH YANG DISELESAIKAN BERKAS INI
 * ==========================================================================
 * Guru menekan "beri tugas: 20 soal Past Tense". Bank soal punya ratusan butir,
 * dan guru TIDAK PUNYA CARA TAHU butir mana yang sudah dikuasai murid tertentu —
 * apalagi butir yang murid itu sudah kerjakan sendiri di dasbornya. Akibatnya
 * satu paket yang sama dikirim ke 30 murid, dan sebagian besar mengerjakan ulang
 * hal yang sudah mereka bisa. Waktu belajar terbakar, dan yang lebih buruk:
 * jawaban benar atas soal yang sudah hafal MASUK ke bukti sebagai "menguasai",
 * padahal yang diukur cuma ingatan atas butir itu.
 *
 * Sebelum berkas ini, FIEZEL menyimpan dua potong dari tiga potong yang perlu:
 *   1. `st.seen[skill]` (learner-flow) — daftar id yang PERNAH TAMPIL. Tanpa
 *      hasil: butir yang selalu salah dan butir yang sudah dikuasai terlihat sama.
 *   2. `tc_lesson_evidence` (D1) — benar/salah per soal, tetapi HANYA untuk soal
 *      yang datang dari tugas guru. Latihan mandiri murid tidak pernah ke sana.
 * Yang hilang adalah potongan ketiga: keadaan per butir yang MENGGABUNGKAN
 * keduanya dan bisa dipakai memilih.
 *
 * ==========================================================================
 * KENAPA INGATAN INI HIDUP DI PERANGKAT, BUKAN DI SERVER
 * ==========================================================================
 * Ini bukan pilihan kenyamanan. Riwayat per-butir per-murid di server berarti
 * satu baris D1 per jawaban per murid — 30 murid x 20 soal = 600 tulis untuk SATU
 * tugas, pada plan gratis, selamanya. Dan `fiezel-attempt-record.js` beserta
 * `tests/observability-privacy-test.js` berdiri di atas janji yang berlawanan:
 * riwayat jawaban mentah TIDAK BOLEH keluar dari perangkat.
 *
 * Perangkat justru punya data yang PALING lengkap — ia melihat latihan mandiri
 * yang tidak pernah dilaporkan ke mana pun. Jadi tempat yang benar untuk ingatan
 * ini adalah tempat data itu sudah berada.
 *
 * ==========================================================================
 * KENAPA "PERNAH DIKERJAKAN → JANGAN PERNAH LAGI" ADALAH ATURAN YANG SALAH
 * ==========================================================================
 * Aturan itu terdengar benar dan merusak dua hal sekaligus. Butir yang SALAH tiga
 * kali justru butir yang paling perlu kembali. Dan butir yang dikuasai enam bulan
 * lalu bukan lagi butir yang dikuasai — ia butir yang belum diuji ulang.
 *
 * Karena itu berkas ini tidak menyimpan boolean "pernah". Ia menghitung KEADAAN,
 * dan keadaan itulah yang menentukan prioritas di `fiezel-question-allocator.js`.
 *
 * ==========================================================================
 * KEBARUAN BUTIR vs KEBARUAN KONSEP
 * ==========================================================================
 * Menghindari id yang sama TIDAK CUKUP. Bank FIEZEL membangkitkan butir dari
 * template: `gpt:3:0:1` dan `gpt:3:5:2` adalah dua id berbeda yang menguji KATA
 * KERJA YANG SAMA. Murid yang mendapat dua puluh id berbeda dengan lima konsep
 * yang sama sedang mengulang lima soal dua puluh kali, dan tidak ada satu pun
 * pemeriksaan berbasis id yang akan melihatnya.
 *
 * `conceptOf()` menurunkan kunci konsep dari `marker` — bidang yang setiap butir
 * bank punya dan yang isinya memang PETUNJUK LINGUISTIK yang sedang diuji
 * (penanda waktu, kata "did", kata petunjuk konteks, benda yang digambar).
 * Alokator memakainya untuk membatasi berapa butir sekonsep boleh masuk satu set.
 *
 * MODUL MURNI: tanpa DOM, jaringan, penyimpanan, sumber acak, atau jam internal.
 * Waktu SELALU argumen (`nowMs`). Ingatan dioper masuk dan dikembalikan sebagai
 * nilai baru — pemanggil yang memutuskan di mana ia disimpan.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FiezelQuestionMemory = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var SCHEMA = 'fiezel-question-memory-v1';

  /**
   * Keadaan tertutup, URUT DARI YANG PALING MENDESAK. Urutan array ini adalah
   * dokumentasi yang bisa dieksekusi: `PRIORITY` di bawah menurunkannya, jadi
   * memindahkan satu nama di sini benar-benar mengubah pilihan soal.
   */
  var STATES = [
    'repeated-error',   // pola salah berulang — paling butuh kembali
    'weak',             // lebih sering salah daripada benar
    'unseen',           // belum pernah tampil
    'due-for-review',   // pernah dikuasai, sudah lama tidak diuji
    'seen',             // baru sekali tampil
    'practiced',        // beberapa kali, belum mantap
    'mastered',         // mantap dan masih segar
    'recently-seen'     // baru saja tampil — jangan diulang sekarang
  ];

  var PRIORITY = {};
  (function () {
    for (var i = 0; i < STATES.length; i++) PRIORITY[STATES[i]] = (STATES.length - i) * 10;
    /* `recently-seen` bukan sekadar prioritas terendah — ia NOL, dan alokator
       memperlakukan nol sebagai "hanya kalau tidak ada pilihan lain sama sekali",
       lalu MELAPORKAN keadaan itu alih-alih diam. */
    PRIORITY['recently-seen'] = 0;
  }());

  var DEFAULTS = {
    recentMs: 86400000,      // 24 jam — di bawah ini butir dianggap baru saja lewat
    reviewMs: 1814400000,    // 21 hari — di atas ini yang dikuasai wajib diuji ulang
    masterStreak: 2,         // benar berturut-turut minimum untuk disebut dikuasai
    masterRate: 0.8,
    weakRate: 0.6,
    errorCount: 3,           // salah sebanyak ini + akurasi < 0.5 = pola berulang
    errorRate: 0.5,
    cap: 600                 // batas butir yang diingat; melebihi ini yang tertua dibuang
  };

  var ID_RE = /^[A-Za-z0-9._:@#~|-]{1,80}$/;

  function opt(o, k) {
    var v = o && o[k];
    return typeof v === 'number' && isFinite(v) && v >= 0 ? v : DEFAULTS[k];
  }
  function idOf(v) {
    if (typeof v !== 'string') return null;
    var s = v.trim();
    return s && ID_RE.test(s) ? s : null;
  }

  /**
   * Kunci konsep sebuah butir. `null` bila tidak bisa diturunkan — dan `null`
   * SENGAJA tidak diganti dengan id butir sebagai cadangan: konsep palsu yang
   * unik per butir akan membuat pembatas konsep di alokator tampak bekerja
   * padahal ia tidak membatasi apa pun.
   */
  function conceptOf(item) {
    if (!item || typeof item !== 'object') return null;
    var skill = idOf(item.skill);
    var marker = item.marker;
    if (typeof marker !== 'string') return null;
    var m = marker.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    if (!m) return null;
    return (skill || 'x') + '|' + m.slice(0, 40);
  }

  function emptyMemory() { return { schema: SCHEMA, items: {} }; }

  function isMemory(m) {
    return !!m && typeof m === 'object' && !Array.isArray(m) &&
      m.schema === SCHEMA && !!m.items && typeof m.items === 'object';
  }
  function normalize(m) { return isMemory(m) ? m : emptyMemory(); }

  /**
   * Catat satu percobaan. Mengembalikan ingatan BARU — tidak menyunting argumen,
   * supaya pemanggil bisa membandingkan sebelum/sesudah dan supaya putar-ulang
   * atas aliran percobaan yang sama selalu menghasilkan ingatan yang sama.
   *
   * Baris tanpa id butir atau tanpa waktu DILEWAT, bukan menggagalkan seluruh
   * pemanggilan: satu baris cacat dari versi lama tidak boleh membuang seluruh
   * riwayat belajar murid.
   */
  function recordAttempt(memory, row, opts) {
    var mem = normalize(memory);
    var id = idOf(row && (row.item || row.id));
    var at = row && typeof row.at === 'number' && isFinite(row.at) && row.at > 0 ? Math.floor(row.at) : null;
    if (!id || at === null || typeof row.ok !== 'boolean') return mem;

    var items = {};
    for (var k in mem.items) if (Object.prototype.hasOwnProperty.call(mem.items, k)) items[k] = mem.items[k];

    var prev = items[id];
    var rec = {
      n: (prev && prev.n) || 0,
      ok: (prev && prev.ok) || 0,
      streak: (prev && prev.streak) || 0,
      first: (prev && prev.first) || at,
      last: at
    };
    rec.n += 1;
    if (row.ok) { rec.ok += 1; rec.streak += 1; } else { rec.streak = 0; }
    if (at < rec.first) rec.first = at;
    if (prev && prev.last > at) rec.last = prev.last;

    var concept = idOf(row.concept) || (prev && prev.c) || null;
    if (concept) rec.c = concept;
    var skill = idOf(row.skill) || (prev && prev.s) || null;
    if (skill) rec.s = skill;

    items[id] = rec;
    return prune({ schema: SCHEMA, items: items }, opt(opts, 'cap'));
  }

  /** Rekam banyak baris sekaligus, urut apa adanya. */
  function recordAll(memory, rows, opts) {
    var mem = normalize(memory);
    if (!Array.isArray(rows)) return mem;
    for (var i = 0; i < rows.length; i++) mem = recordAttempt(mem, rows[i], opts);
    return mem;
  }

  /**
   * Buang butir tertua saat melewati batas. Yang dibuang adalah yang PALING LAMA
   * tidak disentuh — bukan yang paling jarang: butir yang sering salah justru
   * yang paling mahal kalau ingatannya hilang.
   */
  function prune(memory, cap) {
    var ids = Object.keys(memory.items);
    if (ids.length <= cap) return memory;
    ids.sort(function (a, b) { return memory.items[b].last - memory.items[a].last; });
    var keep = {};
    for (var i = 0; i < cap; i++) keep[ids[i]] = memory.items[ids[i]];
    return { schema: SCHEMA, items: keep };
  }

  /** Keadaan dasar dari hitungan saja — tanpa memandang waktu. */
  function baseState(rec, o) {
    if (!rec || !rec.n) return 'unseen';
    var wrong = rec.n - rec.ok;
    var rate = rec.ok / rec.n;
    if (wrong >= opt(o, 'errorCount') && rate < opt(o, 'errorRate')) return 'repeated-error';
    if (rec.n >= 2 && rate < opt(o, 'weakRate')) return 'weak';
    if (rec.streak >= opt(o, 'masterStreak') && rate >= opt(o, 'masterRate')) return 'mastered';
    if (rec.n >= 2) return 'practiced';
    return rec.ok ? 'seen' : 'weak';
  }

  /**
   * Keadaan butir SEKARANG. Waktu dipakai sebagai lapisan di atas hitungan, dan
   * urutannya menentukan:
   *   1. baru saja tampil  -> `recently-seen`, apa pun hasilnya. Butir yang lemah
   *      sekalipun tidak boleh muncul lagi lima menit kemudian; itu persis keluhan
   *      "soalnya itu-itu saja" yang pernah dilaporkan.
   *   2. dikuasai/terlatih tapi basi -> `due-for-review`. Dikuasai enam bulan lalu
   *      bukan dikuasai; itu belum diuji ulang.
   */
  function stateOf(memory, itemId, nowMs, opts) {
    var mem = normalize(memory);
    var id = idOf(itemId);
    var rec = id ? mem.items[id] : null;
    var base = baseState(rec, opts);
    if (base === 'unseen') return 'unseen';
    var now = typeof nowMs === 'number' && isFinite(nowMs) ? nowMs : null;
    if (now === null) return base;
    var age = now - rec.last;
    if (age < opt(opts, 'recentMs')) return 'recently-seen';
    if ((base === 'mastered' || base === 'practiced') && age > opt(opts, 'reviewMs')) return 'due-for-review';
    return base;
  }

  function priorityOf(state) {
    return Object.prototype.hasOwnProperty.call(PRIORITY, state) ? PRIORITY[state] : 0;
  }

  /** Catatan mentah satu butir (untuk panel diagnostik dan gerbang). */
  function recordOf(memory, itemId) {
    var mem = normalize(memory);
    var id = idOf(itemId);
    var rec = id ? mem.items[id] : null;
    if (!rec) return null;
    return {
      item: id, attempts: rec.n, correct: rec.ok, incorrect: rec.n - rec.ok,
      streak: rec.streak, firstSeen: rec.first, lastSeen: rec.last,
      concept: rec.c || null, skill: rec.s || null
    };
  }

  /** Berapa butir di tiap keadaan — dipakai layar "kenapa soalku begini". */
  function summary(memory, nowMs, opts) {
    var mem = normalize(memory);
    var out = { total: 0 };
    for (var i = 0; i < STATES.length; i++) out[STATES[i]] = 0;
    for (var id in mem.items) {
      if (!Object.prototype.hasOwnProperty.call(mem.items, id)) continue;
      out[stateOf(mem, id, nowMs, opts)] += 1;
      out.total += 1;
    }
    return out;
  }

  return {
    SCHEMA: SCHEMA,
    STATES: STATES,
    PRIORITY: PRIORITY,
    DEFAULTS: DEFAULTS,
    emptyMemory: emptyMemory,
    conceptOf: conceptOf,
    recordAttempt: recordAttempt,
    recordAll: recordAll,
    stateOf: stateOf,
    baseState: baseState,
    priorityOf: priorityOf,
    recordOf: recordOf,
    summary: summary
  };
});
