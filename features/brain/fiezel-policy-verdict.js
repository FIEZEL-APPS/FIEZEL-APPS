/**
 * FIEZEL Policy Verdict — otak menilai kebijakannya sendiri dengan INTERVAL, bukan ambang.
 *
 * MASALAH YANG DITUTUP
 * --------------------
 * app.js menilai kebijakan belajarnya sendiri lewat skor komposit bobot-tangan
 * (0,30·completion + 0,35·accuracy + 0,15·adherence + 0,10·kalibrasi + 0,10·improvement)
 * lalu memutus dengan ambang: score < 45 -> 'negative', score >= 72 -> 'positive'. Bobot itu
 * tidak pernah divalidasi, dan ambangnya tidak membawa ketidakpastian sama sekali.
 *
 * Itu kelas cacat yang SAMA dengan gerbang promosi 8-attempt yang dibuktikan council lewat
 * 200.000 trial Monte Carlo: kandidat identik dengan kontrol dipromosikan 53,9%, kandidat
 * 15pp lebih buruk masih lolos 27,5%. Akarnya satu kalimat — lebar-setengah CI proporsi pada
 * n=8 adalah ±30pp, jadi ambang 5pp pada pengukuran ±30pp tidak mengukur apa pun selain
 * derau. Yang membedakan gerbang konten dari otak hanyalah bahwa konten sudah diperbaiki
 * (content-promotion.js memakai FiezelStatGate) sementara otak belum.
 *
 * KENAPA MODUL INI TIPIS, DAN ITU DISENGAJA
 * -----------------------------------------
 * Matematikanya SUDAH ADA dan sudah diuji: Wilson, Newcombe, non-inferioritas, fail-safe ke
 * 'hold', semuanya di fiezel-stat-gate.js. Menulis ulang berarti dua implementasi yang bisa
 * menyimpang, dan yang menyimpang diam-diam adalah yang tidak dipakai gerbang mana pun.
 * Modul ini ADAPTER: ia menerjemahkan dunia policy-outcome (yang berbicara 'n' dan 'ok')
 * ke dunia stat-gate (yang berbicara 'n' dan 'successes'), lalu menerjemahkan verdictnya
 * kembali menjadi keputusan yang app.js pahami.
 *
 * 'HOLD' ADALAH JAWABAN YANG SAH, DAN TIDAK BERBATAS WAKTU
 * -------------------------------------------------------
 * Saat bukti belum bisa membedakan sinyal dari derau, keputusan yang benar adalah TIDAK
 * memutuskan: kebijakan lama dipertahankan, bukti terus dikumpulkan. Pemanggil TIDAK boleh
 * memperlakukan 'hold' berkepanjangan sebagai kegagalan yang harus "dipaksa selesai" —
 * memaksa keputusan biner dari data bisu adalah persis bug yang modul ini ada untuk menutup.
 *
 * Modul MURNI: tanpa DOM, jaringan, penyimpanan, sumber acak tak berseed, atau jam internal.
 */
(function (root, factory) {
  var statGate = (typeof module === 'object' && module.exports)
    ? require('./fiezel-stat-gate.js')
    : (root ? root.FiezelStatGate : null);
  var api = factory(statGate);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FiezelPolicyVerdict = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (StatGate) {
  'use strict';

  var SCHEMA = 'fiezel-policy-verdict-v1';
  /* Margin non-inferioritas dalam PROPORSI. 5pp adalah angka yang sama dipakai gerbang
     konten; menyamakannya disengaja supaya "tidak lebih buruk" berarti hal yang sama di
     kedua jalur, dan harganya (±905 attempt per lengan) juga sama jujurnya. */
  var DEFAULT_MARGIN = 0.05;

  function count(v) { return typeof v === 'number' && isFinite(v) && v >= 0 ? Math.floor(v) : null; }

  /** Lengan dari dunia app ({n, ok}) ke dunia stat-gate ({n, successes}). */
  function arm(raw) {
    if (!raw || typeof raw !== 'object') return null;
    var n = count(raw.n), ok = count(raw.ok !== undefined ? raw.ok : raw.successes);
    if (n === null || ok === null || n < 1 || ok > n) return null;
    return { n: n, successes: ok };
  }

  function hold(code, extra) {
    var out = { schema: SCHEMA, decision: 'hold', rationale: code, confidence: 0 };
    if (extra) for (var k in extra) if (Object.prototype.hasOwnProperty.call(extra, k)) out[k] = extra[k];
    return out;
  }

  /**
   * verdict({control, candidate, margin}) -> keputusan yang membawa intervalnya.
   *
   * Fail-safe: masukan rusak, modul stat-gate absen, atau lengan tak sah -> 'hold'. Tidak
   * pernah melempar; jalur ini dipanggil di tengah sesi belajar murid.
   */
  function verdict(input) {
    if (!StatGate || typeof StatGate.verdict !== 'function') {
      return hold('brain4_verdict_hold_no_statgate');
    }
    if (!input || typeof input !== 'object') return hold('brain4_verdict_hold_invalid_input');
    var control = arm(input.control), candidate = arm(input.candidate);
    if (!control || !candidate) return hold('brain4_verdict_hold_invalid_arms');

    var margin = (typeof input.margin === 'number' && input.margin > 0 && input.margin < 1)
      ? input.margin : DEFAULT_MARGIN;

    var g;
    try {
      g = StatGate.verdict({ control: control, candidate: candidate, marginPp: margin });
    } catch (e) {
      return hold('brain4_verdict_hold_statgate_error');
    }
    if (!g || typeof g !== 'object') return hold('brain4_verdict_hold_statgate_empty');

    var decision = g.decision === 'promote' || g.decision === 'reject' ? g.decision : 'hold';
    var out = {
      schema: SCHEMA,
      decision: decision,
      // Kode alasan stat-gate DIBAWA APA ADANYA di `basis`: menghapusnya berarti membuang
      // satu-satunya penjelasan kenapa keputusan ini diambil.
      rationale: 'brain4_verdict_' + decision,
      basis: typeof g.rationale === 'string' ? g.rationale : '',
      confidence: typeof g.confidence === 'number' ? g.confidence : 0,
      margin: margin,
      n: { control: control.n, candidate: candidate.n }
    };
    /* Interval hidup di g.test.ciLo/ciHi, bukan di g.ci. Membacanya salah berarti keputusan
       terkirim TANPA intervalnya — dan keputusan tanpa interval adalah ambang lagi, hanya
       berganti nama. Gerbang V4 ada persis untuk menangkap itu, dan memang menangkapnya. */
    if (g.test && typeof g.test === 'object') {
      out.diff = typeof g.test.diff === 'number' ? g.test.diff : null;
      out.p = { control: g.test.pA, candidate: g.test.pB };
      if (typeof g.test.ciLo === 'number' && typeof g.test.ciHi === 'number') {
        out.ci = { lo: g.test.ciLo, hi: g.test.ciHi };
      }
      if (typeof g.test.pValue === 'number') out.pValue = g.test.pValue;
    }
    return out;
  }

  /**
   * harga(baseline, margin) -> berapa attempt per lengan yang DIBUTUHKAN klaim itu.
   * Dilaporkan supaya pemanggil tahu ongkos sebenarnya dari "tidak lebih buruk dari 5pp",
   * bukan supaya ia memaksakan keputusan lebih awal.
   */
  function requiredPerArm(baseline, margin) {
    if (!StatGate || typeof StatGate.sampleSizeForProportion !== 'function') return null;
    try {
      var b = typeof baseline === 'number' && baseline > 0 && baseline < 1 ? baseline : 0.8;
      var m = typeof margin === 'number' && margin > 0 && margin < 1 ? margin : DEFAULT_MARGIN;
      return StatGate.sampleSizeForProportion(b, m);
    } catch (e) { return null; }
  }

  return {
    SCHEMA: SCHEMA,
    DEFAULT_MARGIN: DEFAULT_MARGIN,
    verdict: verdict,
    requiredPerArm: requiredPerArm
  };
});
