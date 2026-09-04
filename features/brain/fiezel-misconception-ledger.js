/**
 * FIEZEL Misconception Ledger v1 — memori miskonsepsi lintas sesi (braincore v3, P1).
 *
 * KENAPA MODUL INI ADA
 * --------------------
 * Tutor Brain v3 sudah bisa MENDIAGNOSIS miskonsepsi dari distraktor bernama (139 template
 * grammar, 416 entri diagnosis Indonesia), tetapi `createSession()` membuang seluruh memori
 * itu setiap sesi berakhir. Murid yang memilih distraktor `article-before-possessive` tiga
 * sesi berturut-turut diperlakukan sebagai kasus BARU setiap kali. Padahal seluruh nilai
 * diagnosis miskonsepsi ada pada akumulasi bukti lintas waktu: miskonsepsi sejati bersifat
 * stabil dan resisten, berbeda dari slip acak yang hilang sendiri. Ledger ini adalah model
 * siswa longitudinal yang hilang itu.
 *
 * MODEL KEYAKINAN (Bayesian log-odds, gaya DINA)
 * ----------------------------------------------
 * Untuk tiap pasangan (concept :: misconception) disimpan log-odds keyakinan
 * l = logit(beta), prior beta0 = 0.1 (kebanyakan murid TIDAK memiliki miskonsepsi
 * tertentu; prior rendah membuat satu slip tidak langsung dituduh sebagai pola).
 *
 *   - BUKTI POSITIF: salah karena memilih distraktor-m. Dengan slip s=0.1 dan tebakan acak
 *     dari 3 pengecoh, rasio likelihood lambda+ = (1-s)/(g/3) ~= 10, jadi delta-l = +ln(10).
 *     Modulasi timing: jawaban berlabel 'guess' (<1800 ms) hanya bernilai x0.3 karena murid
 *     yang menjawab asal tidak sedang menunjukkan keyakinannya; 'struggled' bernilai penuh
 *     x1.0 karena justru jawaban yang dipikirkan panjang lalu tetap salah adalah bukti
 *     terkuat bahwa miskonsepsinya dipegang sungguh-sungguh.
 *   - BUKTI NEGATIF: jawaban BENAR pada konsep yang sama menurunkan semua miskonsepsi yang
 *     sedang dilacak pada konsep itu sebesar -ln(2). Sengaja jauh lebih lemah dari bukti
 *     positif (2 vs 10): jawaban benar bisa lahir dari eliminasi opsi, bukan dari
 *     pemahaman - satu benar tidak boleh menghapus tiga salah yang konsisten.
 *   - DECAY ANTAR-SESI: tanpa aktivitas, l meluruh menuju prior dengan paruh-waktu 14 hari.
 *     Miskonsepsi yang tidak pernah terlihat lagi mungkin sudah teratasi lewat jalan lain;
 *     model yang tidak bisa lupa akan menghukum murid selamanya atas kesalahan bulan lalu.
 *     Waktu SELALU argumen (nowMs) - modul ini tidak pernah memanggil Date.now().
 *
 * GERBANG STATUS (anti tuduhan prematur)
 * --------------------------------------
 *   - AKTIF: beta >= 0.7 DAN >= 3 butir bukti distraktor DAN dari >= 2 sessionId berbeda.
 *     Ambang ganda ini disengaja: belief tinggi dari satu sesi bisa berarti murid sedang
 *     lelah/terburu-buru hari itu; pola yang MUNCUL ULANG di sesi lain baru layak disebut
 *     miskonsepsi. Tiga tebakan cepat (guess) tidak akan pernah mencapai 0.7 (3 x 0.3 x
 *     ln10 dari prior ~= belief 0.47) - itu fitur, bukan bug.
 *   - RESOLVED: pernah aktif, lalu belief turun <= 0.3. Histeresis (0.7 masuk / 0.3 keluar)
 *     mencegah status berkedip-kedip di sekitar satu ambang.
 *
 * KETAHANAN & KEMURNIAN
 * ---------------------
 *   - `update(ledger, evidence, nowMs)` MURNI: mengembalikan ledger BARU, tidak menyentuh
 *     argumen. State korup (null, string, angka, schema asing, entries bukan objek) tidak
 *     pernah melempar - diganti ledger kosong, karena localStorage di perangkat murid bisa
 *     rusak dan pelajaran tidak boleh ikut mati karenanya.
 *   - Field `canonical` opsional (dari taksonomi A5): bila tersedia, `summarize()` juga
 *     mengagregasi miskonsepsi aktif per nama kanonik, supaya dua label lokal yang sama
 *     maknanya bisa dibaca sebagai satu masalah.
 *   - Tanpa DOM, tanpa jaringan, tanpa storage, tanpa Math.random. Semua keputusan adalah
 *     nilai yang bisa di-assert.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FiezelMisconceptionLedger = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var SCHEMA = 'fiezel-misconception-ledger-v1';

  // Parameter model - ditulis sebagai konstanta bernama supaya bisa dibantah dengan data,
  // bukan disembunyikan di dalam rumus.
  var PRIOR_BELIEF = 0.1;                 // beta0: prior rendah, tidak menuduh dari satu slip
  var LR_POSITIVE = Math.log(10);         // salah + distraktor: (1-s)/(g/3) ~= 10
  var LR_NEGATIVE = Math.log(2);          // benar pada konsep sama: lemah, bisa dari eliminasi
  var TIMING_WEIGHT = { guess: 0.3, struggled: 1.0 }; // selain itu (normal/retrieved) = 1.0
  var DECAY_HALF_LIFE_DAYS = 14;          // peluruhan menuju prior antar-sesi
  var ACTIVE_BELIEF = 0.7;                // gerbang masuk status aktif
  var RESOLVED_BELIEF = 0.3;              // gerbang keluar (histeresis, bukan ambang tunggal)
  var MIN_EVIDENCE = 3;                   // minimal butir bukti distraktor
  var MIN_SESSIONS = 2;                   // minimal sessionId berbeda
  var MAX_SESSIONS_TRACKED = 24;          // batas memori daftar sesi (cukup untuk gerbang)
  var DAY_MS = 86400000;

  // Log-odds di-clamp ke belief [0.01 .. 0.99]. Tanpa batas, sepuluh bukti beruntun membuat
  // keyakinan "hampir pasti secara astronomis" yang butuh berminggu-minggu bukti balik untuk
  // dibongkar - padahal manusia memang bisa berubah lebih cepat dari itu.
  var LOGIT_CLAMP = logit(0.99);

  // ---- dasar -------------------------------------------------------------------------

  function num(value, fallback) {
    var n = Number(value);
    return isFinite(n) ? n : (fallback === undefined ? 0 : fallback);
  }
  function str(value) { return value == null ? '' : String(value).trim(); }
  function round(value, digits) {
    var f = Math.pow(10, digits === undefined ? 4 : digits);
    return Math.round(num(value) * f) / f;
  }
  function logit(p) { return Math.log(p / (1 - p)); }
  function sigmoid(l) { return 1 / (1 + Math.exp(-l)); }
  function clampLogit(l) { return Math.max(-LOGIT_CLAMP, Math.min(LOGIT_CLAMP, l)); }

  var PRIOR_LOGIT = logit(PRIOR_BELIEF);

  /** Kunci entri: concept::misconception. Nama miskonsepsi yang sama pada konsep berbeda
   *  adalah DUA masalah berbeda (mis. 'overgeneralization' di tenses vs di articles) dan
   *  tidak boleh saling menimpa. */
  function entryKey(concept, misconception) {
    return concept + '::' + misconception;
  }

  // ---- validasi state (tahan korupsi) --------------------------------------------------

  function emptyLedger() {
    return { schema: SCHEMA, entries: {} };
  }

  /** Entri dianggap sah hanya bila field intinya bertipe benar. Entri korup DIBUANG diam-
   *  diam (bukan melempar): satu entri rusak tidak boleh menular ke seluruh ledger. */
  function sanitizeEntry(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    var concept = str(raw.concept);
    var misconception = str(raw.misconception);
    if (!concept || !misconception) return null;
    var sessions = [];
    if (Array.isArray(raw.sessions)) {
      for (var i = 0; i < raw.sessions.length && sessions.length < MAX_SESSIONS_TRACKED; i++) {
        var sid = str(raw.sessions[i]);
        if (sid && sessions.indexOf(sid) === -1) sessions.push(sid);
      }
    }
    return {
      concept: concept,
      misconception: misconception,
      canonical: str(raw.canonical) || null,
      family: str(raw.family) || null,
      logOdds: clampLogit(num(raw.logOdds, PRIOR_LOGIT)),
      lastMs: num(raw.lastMs, 0),
      hits: Math.max(0, Math.floor(num(raw.hits, 0))),
      sessions: sessions,
      everActive: raw.everActive === true
    };
  }

  /** Terima apa pun (null, string, JSON rusak yang sudah di-parse jadi angka, schema asing)
   *  dan kembalikan ledger yang PASTI berbentuk benar. Ini garis pertahanan terhadap
   *  localStorage korup: pelajaran harus tetap jalan, paling buruk memorinya kosong. */
  function sanitizeLedger(ledger) {
    if (!ledger || typeof ledger !== 'object' || Array.isArray(ledger)) return emptyLedger();
    if (ledger.schema !== SCHEMA) return emptyLedger();
    if (!ledger.entries || typeof ledger.entries !== 'object' || Array.isArray(ledger.entries)) {
      return emptyLedger();
    }
    var clean = emptyLedger();
    for (var key in ledger.entries) {
      if (!Object.prototype.hasOwnProperty.call(ledger.entries, key)) continue;
      var entry = sanitizeEntry(ledger.entries[key]);
      if (entry) clean.entries[entryKey(entry.concept, entry.misconception)] = entry;
    }
    return clean;
  }

  // ---- decay -------------------------------------------------------------------------

  /** Log-odds pada saat nowMs: meluruh menuju PRIOR (bukan menuju nol - nol berarti belief
   *  50%, yang justru MENAIKKAN keyakinan entri yang sudah rendah). Paruh-waktu 14 hari:
   *  jarak ke prior terpotong separuh tiap dua minggu tanpa bukti baru. */
  function decayedLogOdds(entry, nowMs) {
    var now = num(nowMs, NaN);
    if (!isFinite(now)) return entry.logOdds; // waktu tidak sah: jangan mengarang peluruhan
    var dtDays = Math.max(0, now - entry.lastMs) / DAY_MS;
    if (dtDays <= 0) return entry.logOdds;
    var keep = Math.pow(2, -dtDays / DECAY_HALF_LIFE_DAYS);
    return PRIOR_LOGIT + (entry.logOdds - PRIOR_LOGIT) * keep;
  }

  function beliefAt(entry, nowMs) {
    return sigmoid(decayedLogOdds(entry, nowMs));
  }

  /** Gerbang aktif: belief SAJA tidak cukup. >=3 bukti menyingkirkan slip tunggal; >=2 sesi
   *  menyingkirkan "hari buruk" - pola yang layak diintervensi adalah pola yang kembali. */
  function meetsActiveGate(entry, nowMs) {
    return beliefAt(entry, nowMs) >= ACTIVE_BELIEF &&
      entry.hits >= MIN_EVIDENCE &&
      entry.sessions.length >= MIN_SESSIONS;
  }

  // ---- update (murni) ------------------------------------------------------------------

  function cloneEntry(entry) {
    return {
      concept: entry.concept,
      misconception: entry.misconception,
      canonical: entry.canonical,
      family: entry.family,
      logOdds: entry.logOdds,
      lastMs: entry.lastMs,
      hits: entry.hits,
      sessions: entry.sessions.slice(),
      everActive: entry.everActive
    };
  }

  /** Terapkan peluruhan lalu delta log-odds pada SALINAN entri, dan catat waktu sentuhan.
   *  Urutannya penting: bukti baru bekerja di atas keyakinan HARI INI, bukan keyakinan
   *  saat terakhir bertemu. */
  function applyDelta(entry, delta, nowMs) {
    var next = cloneEntry(entry);
    next.logOdds = clampLogit(decayedLogOdds(next, nowMs) + delta);
    if (isFinite(num(nowMs, NaN))) next.lastMs = num(nowMs);
    return next;
  }

  /**
   * update(ledger, evidence, nowMs) -> ledger'
   * evidence: {concept, family, misconception, canonical?, correct, timing, sessionId}
   *
   *   - correct === false + misconception: bukti positif +ln(10) x bobot timing.
   *   - correct === true: bukti negatif -ln(2) untuk SEMUA miskonsepsi yang dilacak pada
   *     konsep itu. Kenapa semua, bukan hanya yang berstatus aktif? Karena entri yang belum
   *     lolos gerbang sesi pun tetap hipotesis yang harus bisa dibantah oleh jawaban benar -
   *     kalau tidak, hipotesis muda tidak pernah bisa gugur kecuali oleh waktu.
   *
   * Murni: ledger argumen tidak disentuh; null/korup -> mulai dari ledger kosong.
   */
  function update(ledger, evidence, nowMs) {
    var base = sanitizeLedger(ledger);
    if (!evidence || typeof evidence !== 'object') return base;

    var concept = str(evidence.concept);
    if (!concept) return base; // tanpa konsep tidak ada alamat untuk bukti ini

    var next = emptyLedger();
    for (var key in base.entries) {
      if (Object.prototype.hasOwnProperty.call(base.entries, key)) {
        next.entries[key] = base.entries[key];
      }
    }

    if (evidence.correct === true) {
      // Bukti negatif menyebar ke semua miskonsepsi konsep ini: jawaban benar menunjukkan
      // konsepnya bisa dilalui TANPA jatuh ke pengecoh mana pun.
      for (var k in next.entries) {
        if (!Object.prototype.hasOwnProperty.call(next.entries, k)) continue;
        if (next.entries[k].concept !== concept) continue;
        next.entries[k] = applyDelta(next.entries[k], -LR_NEGATIVE, nowMs);
      }
      return next;
    }

    // Bukti positif butuh nama miskonsepsi (dari distraktor berlabel). Salah tanpa label
    // (mis. soal lama tanpa optionMisconceptions) bukan bukti tentang miskonsepsi tertentu.
    var misconception = str(evidence.misconception);
    if (!misconception) return next;

    var keyPos = entryKey(concept, misconception);
    var entry = next.entries[keyPos] || {
      concept: concept,
      misconception: misconception,
      canonical: null,
      family: null,
      logOdds: PRIOR_LOGIT,
      lastMs: num(nowMs, 0),
      hits: 0,
      sessions: [],
      everActive: false
    };

    var timing = str(evidence.timing);
    var weight = Object.prototype.hasOwnProperty.call(TIMING_WEIGHT, timing)
      ? TIMING_WEIGHT[timing] : 1.0;

    var updated = applyDelta(entry, LR_POSITIVE * weight, nowMs);
    updated.hits = entry.hits + 1;
    var sid = str(evidence.sessionId);
    if (sid && updated.sessions.indexOf(sid) === -1 &&
        updated.sessions.length < MAX_SESSIONS_TRACKED) {
      updated.sessions.push(sid);
    }
    // Metadata opsional menempel pada bukti terbaru: taksonomi A5 boleh datang belakangan
    // dan melabeli entri yang sudah ada tanpa migrasi.
    if (str(evidence.canonical)) updated.canonical = str(evidence.canonical);
    if (str(evidence.family)) updated.family = str(evidence.family);
    if (meetsActiveGate(updated, nowMs)) updated.everActive = true;

    next.entries[keyPos] = updated;
    return next;
  }

  // ---- pembacaan ------------------------------------------------------------------------

  function describeEntry(entry, nowMs, rationale) {
    return {
      concept: entry.concept,
      misconception: entry.misconception,
      canonical: entry.canonical,
      belief: round(beliefAt(entry, nowMs)),
      evidenceCount: entry.hits,
      sessions: entry.sessions.slice(),
      rationale: rationale
    };
  }

  /**
   * active(ledger, nowMs) -> [{concept, misconception, canonical, belief, evidenceCount,
   * sessions, rationale}] terurut belief menurun. Hanya entri yang lolos gerbang penuh
   * (belief >= 0.7, >= 3 bukti, >= 2 sesi) - di bawah itu ledger hanya boleh jadi digest,
   * bukan dasar keputusan.
   */
  function active(ledger, nowMs) {
    var clean = sanitizeLedger(ledger);
    var out = [];
    for (var key in clean.entries) {
      if (!Object.prototype.hasOwnProperty.call(clean.entries, key)) continue;
      var entry = clean.entries[key];
      if (!meetsActiveGate(entry, nowMs)) continue;
      out.push(describeEntry(entry, nowMs, 'brain3_misconception_active'));
    }
    out.sort(function (a, b) { return b.belief - a.belief; });
    return out;
  }

  /** Agregasi per nama kanonik (taksonomi A5): dua label lokal dengan canonical sama adalah
   *  satu masalah pedagogis, dan intervensinya sebaiknya satu, bukan dua. */
  function groupByCanonical(items) {
    var byName = {};
    var order = [];
    for (var i = 0; i < items.length; i++) {
      var canonical = items[i].canonical;
      if (!canonical) continue;
      if (!byName[canonical]) {
        byName[canonical] = { canonical: canonical, belief: 0, evidenceCount: 0, concepts: [] };
        order.push(canonical);
      }
      var g = byName[canonical];
      g.belief = Math.max(g.belief, items[i].belief); // max, bukan rata-rata: kasus terparah
      g.evidenceCount += items[i].evidenceCount;
      if (g.concepts.indexOf(items[i].concept) === -1) g.concepts.push(items[i].concept);
    }
    var out = [];
    for (var j = 0; j < order.length; j++) out.push(byName[order[j]]);
    out.sort(function (a, b) { return b.belief - a.belief; });
    return out;
  }

  /**
   * summarize(ledger, nowMs) -> {active:[...], resolved:[...], total, byCanonical:[...]}
   * `resolved` = pernah aktif lalu belief turun <= 0.3: cerita keberhasilan yang layak
   * ditampilkan ke murid, dan sinyal untuk berhenti memaksakan reteach.
   */
  function summarize(ledger, nowMs) {
    var clean = sanitizeLedger(ledger);
    var activeItems = [];
    var resolvedItems = [];
    var total = 0;
    for (var key in clean.entries) {
      if (!Object.prototype.hasOwnProperty.call(clean.entries, key)) continue;
      total++;
      var entry = clean.entries[key];
      if (meetsActiveGate(entry, nowMs)) {
        activeItems.push(describeEntry(entry, nowMs, 'brain3_misconception_active'));
      } else if (entry.everActive && beliefAt(entry, nowMs) <= RESOLVED_BELIEF) {
        resolvedItems.push(describeEntry(entry, nowMs, 'brain3_misconception_resolved'));
      }
    }
    activeItems.sort(function (a, b) { return b.belief - a.belief; });
    resolvedItems.sort(function (a, b) { return b.belief - a.belief; });
    return {
      active: activeItems,
      resolved: resolvedItems,
      total: total,
      byCanonical: groupByCanonical(activeItems)
    };
  }

  return {
    SCHEMA: SCHEMA,
    PRIOR_BELIEF: PRIOR_BELIEF,
    ACTIVE_BELIEF: ACTIVE_BELIEF,
    RESOLVED_BELIEF: RESOLVED_BELIEF,
    MIN_EVIDENCE: MIN_EVIDENCE,
    MIN_SESSIONS: MIN_SESSIONS,
    DECAY_HALF_LIFE_DAYS: DECAY_HALF_LIFE_DAYS,
    TIMING_WEIGHT: TIMING_WEIGHT,
    update: update,
    active: active,
    summarize: summarize
  };
});
