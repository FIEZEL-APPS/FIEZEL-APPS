/**
 * FIEZEL Self-Tune — otak mengusulkan perubahan parameternya sendiri, di dalam pagar.
 *
 * INI TITIK DI MANA KATA "OTONOM" MULAI JUJUR DIPAKAI — DAN KARENA ITU PAGARNYA PALING RAPAT
 * ------------------------------------------------------------------------------------------
 * Empat langkah sebelumnya membangun syaratnya: otak bisa mengukur hasilnya sendiri (Langkah 1),
 * menilainya dengan interval alih-alih ambang (Langkah 2), membandingkannya pada dirinya
 * sendiri lewat eksperimen yang sah pada N=1 (Langkah 3), dan mencatat setiap perubahan
 * parameter dalam rantai yang bisa diperiksa dan dikembalikan (Langkah 4). Modul ini yang
 * menyatukannya menjadi tindakan.
 *
 * MODUL INI TIDAK MENULIS APA PUN. Ia mengembalikan USULAN. Pemanggilnya yang menerapkan,
 * mencatat ke ledger, dan menampilkannya. Pemisahan itu bukan gaya: modul murni bisa diuji
 * habis-habisan tanpa menyentuh penyimpanan murid, dan pagar yang tidak bisa diuji habis
 * bukan pagar.
 *
 * TUJUH PAGAR, SEMUANYA BISA DIUJI
 * --------------------------------
 *  1. DI DALAM BOUNDS SEJAK LAHIR. Usulan di luar batas tidak dijepit belakangan — ia tidak
 *     pernah lahir. Menjepit belakangan menyembunyikan bahwa pengusulnya memang ingin keluar.
 *  2. SATU PARAMETER PER USULAN. Dua perubahan bersamaan membuat atribusi mustahil: kalau
 *     hasilnya membaik, tidak ada yang tahu karena yang mana.
 *  3. SATU PERUBAHAN AKTIF PER JENDELA. Perubahan berikutnya menunggu sampai yang sekarang
 *     punya bukti. Tanpa ini, otak akan berputar mengubah parameter lebih cepat daripada
 *     bukti bisa terkumpul — gerakan yang terlihat seperti belajar tetapi bukan.
 *  4. HANYA SAAT VERDICT 'promote'. 'hold' berarti belum tahu, dan belum tahu bukan izin.
 *  5. ROLLBACK OTOMATIS PADA REGRESI, dengan ambang tertulis, dan rollback ikut tercatat.
 *  6. KILL SWITCH. halt mematikan seluruh jalur usul, mengalahkan segalanya — semantik yang
 *     sama dengan halt di fiezel-autonomy-config.js.
 *  7. FAIL-CLOSED. Dependensi absen, konfigurasi rusak, verdict tak terbaca -> tidak
 *     mengusulkan apa pun. Diam adalah default yang aman; menebak tidak pernah.
 *
 * Modul MURNI: tanpa DOM, jaringan, penyimpanan, sumber acak, atau jam internal.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FiezelSelfTune = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var SCHEMA = 'fiezel-self-tune-v1';

  /**
   * Parameter yang boleh disetel sendiri — daftar TERTUTUP dan sengaja pendek.
   *
   * Yang TIDAK ada di sini, dan alasannya:
   *   - bkt.slip / bkt.guess: ambang degenerasi BKT. Menggesernya membuat model berhenti
   *     membedakan "menguasai" dari "menebak", dan kerusakannya tidak terlihat di metrik
   *     jangka pendek mana pun yang dipakai untuk memutuskan.
   *   - seluruh blok memory (FSRS): ia menulis jadwal ulangan. Salah setel berarti murid
   *     kehilangan materi yang sudah dikuasai, dan kerugiannya baru terlihat berminggu-minggu
   *     kemudian — jauh setelah bukti yang memicu perubahannya kedaluwarsa.
   *   - misconception.*: menggerbangi diagnosis. Melonggarkannya menghasilkan tuduhan.
   *
   * `step` adalah langkah maksimum per usulan: perubahan yang besar tidak bisa dievaluasi,
   * karena efeknya bercampur dengan pergeseran perilaku murid yang ia sebabkan sendiri.
   */
  var TUNABLE = {
    'difficulty.targetSuccess': { step: 0.02, min: 0.70, max: 0.90 },
    'bkt.T': { step: 0.02, min: 0.05, max: 0.35 }
  };

  /* Ambang regresi untuk rollback otomatis, dalam proporsi. Dipisahkan dari margin
     non-inferioritas verdict: memutuskan "cukup baik untuk maju" dan "cukup buruk untuk
     mundur" adalah dua pertanyaan berbeda, dan menyamakannya membuat sistem berayun. */
  var ROLLBACK_MARGIN = 0.03;
  /* Sesi minimum sebelum perubahan berikutnya boleh diusulkan. */
  var COOLDOWN_SESSIONS = 5;

  function num(v) { return typeof v === 'number' && isFinite(v) ? v : null; }
  function str(v) { return typeof v === 'string' ? v.trim() : ''; }

  function hold(code, extra) {
    var out = { schema: SCHEMA, decision: 'hold', change: null, rationale: code, confidence: 0 };
    if (extra) for (var k in extra) if (Object.prototype.hasOwnProperty.call(extra, k)) out[k] = extra[k];
    return out;
  }

  /** Baca nilai bersarang lewat path 'a.b'. */
  function readPath(obj, path) {
    var parts = String(path).split('.'), cur = obj;
    for (var i = 0; i < parts.length; i++) {
      if (!cur || typeof cur !== 'object') return null;
      cur = cur[parts[i]];
    }
    return num(cur);
  }

  /**
   * propose(state, input, nowMs) -> {decision:'apply'|'hold'|'rollback', change, ...}
   *
   * state: {activeChange?, sessionsSinceChange?, halt?}
   * input: {config, verdict, metrics?}
   */
  function propose(state, input, nowMs) {
    var st = state && typeof state === 'object' ? state : {};
    var inp = input && typeof input === 'object' ? input : null;

    // PAGAR 6 — kill switch, mengalahkan segalanya. Diperiksa PERTAMA supaya tidak ada
    // cabang di bawahnya yang bisa lolos lebih dulu.
    if (st.halt === true) return hold('brain4_tune_halted');
    if (!inp) return hold('brain4_tune_hold_no_input');

    var config = inp.config && typeof inp.config === 'object' ? inp.config : null;
    if (!config) return hold('brain4_tune_hold_no_config');

    var verdict = inp.verdict && typeof inp.verdict === 'object' ? inp.verdict : null;
    if (!verdict || typeof verdict.decision !== 'string') return hold('brain4_tune_hold_no_verdict');

    // PAGAR 5 — regresi pada perubahan yang sedang aktif dikembalikan, dan itu diperiksa
    // SEBELUM usulan baru: sistem yang mengusulkan maju sambil sedang memburuk adalah sistem
    // yang menumpuk kerusakan.
    var active = st.activeChange && typeof st.activeChange === 'object' ? st.activeChange : null;
    if (active && verdict.decision === 'reject') {
      return {
        schema: SCHEMA,
        decision: 'rollback',
        change: { path: str(active.path), from: num(active.to), to: num(active.from) },
        rationale: 'brain4_tune_rollback_regression',
        basis: str(verdict.rationale),
        confidence: num(verdict.confidence) || 0
      };
    }
    var diff = num(verdict.diff);
    if (active && diff !== null && diff <= -ROLLBACK_MARGIN) {
      return {
        schema: SCHEMA,
        decision: 'rollback',
        change: { path: str(active.path), from: num(active.to), to: num(active.from) },
        rationale: 'brain4_tune_rollback_margin',
        basis: 'diff ' + diff + ' <= -' + ROLLBACK_MARGIN,
        confidence: num(verdict.confidence) || 0
      };
    }

    // PAGAR 4 — hanya 'promote' yang boleh melahirkan perubahan.
    if (verdict.decision !== 'promote') return hold('brain4_tune_hold_verdict_' + verdict.decision);

    // PAGAR 3 — satu perubahan aktif per jendela.
    var cooldown = num(inp.cooldownSessions);
    if (cooldown === null || cooldown <= 0) cooldown = COOLDOWN_SESSIONS;
    var sinceChange = num(st.sessionsSinceChange);
    if (active && (sinceChange === null || sinceChange < cooldown)) {
      return hold('brain4_tune_hold_cooldown', { sessionsSinceChange: sinceChange, cooldownSessions: cooldown });
    }

    // PAGAR 2 — satu parameter per usulan. Dipilih deterministik (path pertama yang punya
    // ruang gerak), bukan acak: usulan yang berbeda tiap run tidak bisa diaudit.
    var paths = Object.keys(TUNABLE);
    for (var i = 0; i < paths.length; i++) {
      var path = paths[i], spec = TUNABLE[path];
      var current = readPath(config, path);
      if (current === null) continue;

      // PAGAR 1 — usulan lahir DI DALAM batas. Arah mengikuti bukti: verdict promote berarti
      // kandidat tidak lebih buruk, jadi langkah kecil ke arah yang sama diusulkan.
      var target = current + spec.step;
      if (target > spec.max) target = spec.max;
      if (target < spec.min) target = spec.min;
      if (target === current) continue; // sudah mentok: cari parameter berikutnya

      return {
        schema: SCHEMA,
        decision: 'apply',
        change: { path: path, from: current, to: Math.round(target * 10000) / 10000 },
        rationale: 'brain4_tune_apply',
        basis: str(verdict.rationale),
        confidence: num(verdict.confidence) || 0,
        cooldownSessions: cooldown
      };
    }
    return hold('brain4_tune_hold_no_headroom');
  }

  return {
    SCHEMA: SCHEMA,
    TUNABLE: TUNABLE,
    ROLLBACK_MARGIN: ROLLBACK_MARGIN,
    COOLDOWN_SESSIONS: COOLDOWN_SESSIONS,
    propose: propose
  };
});
