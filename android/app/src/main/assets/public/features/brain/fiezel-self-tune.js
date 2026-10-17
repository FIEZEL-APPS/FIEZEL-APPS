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
 *
 * m025-376 — UKURANNYA DIGANTI SEBELUM DISAMBUNG (audit braincore A3, keputusan OWNER 2026-09-27)
 * -----------------------------------------------------------------------------------------
 * propose() di bawah menaikkan difficulty.targetSuccess (soal LEBIH MUDAH) setiap verdict
 * 'promote' yang diukur dari AKURASI sesi. Akurasi adalah angka yang langsung dinaikkan oleh
 * perubahan itu sendiri: soal lebih mudah -> lebih banyak benar -> 'promote' -> lebih mudah
 * lagi. Itu kelas cacat yang sama dengan penyetel tanpa pagar yang dimatikan owner (A1).
 * propose() dipertahankan apa adanya untuk kompatibilitas gerbang lamanya, tetapi app.js
 * TIDAK memakainya lagi. Jalur yang disambung adalah experiment():
 *
 *   - SATU percobaan pada satu waktu: kontrol = nilai berlaku, kandidat = nilai +/- satu
 *     langkah. Pemanggil membagi LESSON (bukan soal) ke dua lengan secara deterministik
 *     (FiezelNof1.assign), sehingga satu lesson selalu dilatih di bawah satu nilai.
 *   - UKURANNYA RETENSI TERTUNDA: hasil probe retensi 3/7/21 hari (FiezelPostTest) pada
 *     lesson yang dikuasai SESUDAH percobaan dimulai - "masih ingat beberapa hari kemudian",
 *     bukan "berapa yang benar hari ini". Memudahkan soal tidak bisa memenangkan ukuran ini.
 *   - DUA ARAH, tidak simetris. Percobaan pertama mencoba LEBIH SULIT (temuan censoring
 *     Wave F1: murid ditahan terlalu lama di zona nyaman). Arah sulit diterima bila retensi
 *     tidak memburuk (non-inferioritas, margin 5pp); arah MUDAH hanya diterima bila retensi
 *     terbukti LEBIH BAIK (superioritas). Setelah ditolak, arah dibalik.
 *   - PENJAGA PREDIKSI: kandidat yang membuat tebakan Braincore jelas lebih meleset (Brier
 *     probe naik > 0.05) ditolak walau retensinya lolos.
 *   - Percobaan yang tidak pernah mencapai bukti cukup dalam 120 hari dihentikan tanpa
 *     perubahan (kadaluwarsa), dan arahnya dibalik.
 * Pagar lama tetap berlaku: batas TUNABLE sejak lahir, satu parameter, kill switch, fail-closed.
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

  /* ---- m025-376: percobaan retensi (lihat header) ------------------------------------ */
  var EXPERIMENT_PATH = 'difficulty.targetSuccess';
  var EXPERIMENT_DEFAULT = 0.80;          // nilai berlaku bila belum pernah ada yang diterima
  var HARDER_MARGIN = 0.05;               // non-inferioritas: arah sulit boleh "tidak lebih buruk"
  var EASIER_MARGIN = 0.0001;             // ~superioritas: arah mudah harus terbukti lebih baik
  var PREDICTION_GUARD = 0.05;            // kenaikan Brier kandidat di atas ini = ditolak
  var EXPERIMENT_MAX_DAYS = 120;
  var DAY_MS = 86400000;

  function round4(v) { return Math.round(v * 10000) / 10000; }

  /** Nilai berlaku sebuah parameter percobaan, dijepit ke batas TUNABLE. */
  function baselineOf(state, path) {
    var spec = TUNABLE[path];
    var b = state && state.baseline && typeof state.baseline === 'object' ? num(state.baseline[path]) : null;
    var v = b === null ? EXPERIMENT_DEFAULT : b;
    return round4(Math.min(spec.max, Math.max(spec.min, v)));
  }

  /** Margin verdict untuk arah percobaan: sulit = non-inferioritas, mudah = superioritas. */
  function marginFor(direction) { return direction < 0 ? HARDER_MARGIN : EASIER_MARGIN; }

  function copyState(st) {
    var out = {};
    for (var k in st) if (Object.prototype.hasOwnProperty.call(st, k)) out[k] = st[k];
    out.baseline = {};
    if (st.baseline && typeof st.baseline === 'object') {
      for (var b in st.baseline) if (Object.prototype.hasOwnProperty.call(st.baseline, b)) out.baseline[b] = st.baseline[b];
    }
    return out;
  }

  /**
   * experiment(state, input, nowMs) -> {decision, state, change, rationale}
   *
   * state: {baseline?, experiment?, nextDirection?, halt?}  (tidak dimutasi)
   * input: {verdict?: keluaran FiezelPolicyVerdict atas lengan RETENSI (margin dari marginFor),
   *         brier?: {control, candidate}}
   * decision: 'start' | 'hold' | 'promote' | 'reject' | 'expire'
   */
  function experiment(state, input, nowMs) {
    var st = state && typeof state === 'object' ? state : {};
    var now = num(nowMs);
    function out(decision, next, change, rationale) {
      return { schema: SCHEMA, decision: decision, state: next, change: change || null, rationale: rationale };
    }
    if (st.halt === true) return out('hold', st, null, 'brain4_tune_halted');
    if (now === null) return out('hold', st, null, 'brain4_tune_hold_no_clock');
    var path = EXPERIMENT_PATH, spec = TUNABLE[path];
    var current = baselineOf(st, path);
    var exp = st.experiment && typeof st.experiment === 'object' ? st.experiment : null;

    if (!exp) {
      var dir = st.nextDirection === 1 ? 1 : -1;
      var cand = round4(current + dir * spec.step);
      if (cand < spec.min || cand > spec.max) { dir = -dir; cand = round4(current + dir * spec.step); }
      if (cand < spec.min || cand > spec.max) return out('hold', st, null, 'brain4_tune_hold_no_headroom');
      var started = copyState(st);
      started.experiment = { id: 'tune-' + path + '-' + Math.floor(now), path: path, control: current,
        candidate: cand, direction: dir, startedAt: Math.floor(now) };
      return out('start', started, { path: path, from: current, to: cand, direction: dir }, 'brain4_tune_experiment_start');
    }

    var inp = input && typeof input === 'object' ? input : {};
    var verdict = inp.verdict && typeof inp.verdict.decision === 'string' ? inp.verdict : null;
    var closed = copyState(st);
    closed.experiment = null;
    if (verdict && verdict.decision === 'promote') {
      var br = inp.brier && typeof inp.brier === 'object' ? inp.brier : null;
      var bc = br ? num(br.control) : null, bk = br ? num(br.candidate) : null;
      if (bc !== null && bk !== null && bk - bc > PREDICTION_GUARD) {
        closed.nextDirection = -exp.direction;
        return out('reject', closed, { path: exp.path, from: exp.candidate, to: exp.control },
          'brain4_tune_reject_prediction_worse');
      }
      closed.baseline[exp.path] = exp.candidate;
      closed.nextDirection = exp.direction;
      return out('promote', closed, { path: exp.path, from: exp.control, to: exp.candidate }, 'brain4_tune_promote_retention');
    }
    if (verdict && verdict.decision === 'reject') {
      closed.nextDirection = -exp.direction;
      return out('reject', closed, { path: exp.path, from: exp.candidate, to: exp.control }, 'brain4_tune_reject_retention');
    }
    if (now - num(exp.startedAt, now) > EXPERIMENT_MAX_DAYS * DAY_MS) {
      closed.nextDirection = -exp.direction;
      return out('expire', closed, { path: exp.path, from: exp.candidate, to: exp.control }, 'brain4_tune_experiment_expired');
    }
    return out('hold', st, null, verdict ? 'brain4_tune_hold_verdict_' + verdict.decision : 'brain4_tune_hold_collecting');
  }

  return {
    SCHEMA: SCHEMA,
    TUNABLE: TUNABLE,
    ROLLBACK_MARGIN: ROLLBACK_MARGIN,
    COOLDOWN_SESSIONS: COOLDOWN_SESSIONS,
    propose: propose,
    EXPERIMENT_PATH: EXPERIMENT_PATH,
    EXPERIMENT_MAX_DAYS: EXPERIMENT_MAX_DAYS,
    PREDICTION_GUARD: PREDICTION_GUARD,
    baselineOf: baselineOf,
    marginFor: marginFor,
    experiment: experiment
  };
});
