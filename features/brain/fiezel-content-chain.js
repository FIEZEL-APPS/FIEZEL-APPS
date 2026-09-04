/**
 * FIEZEL Content Chain — di mana sebuah kandidat konten berdiri, dan apa yang menahannya.
 *
 * LINK YANG HILANG DI LANGKAH 6, DAN KENAPA IA BUKAN "TINGGAL SAMBUNG"
 * -------------------------------------------------------------------
 * Keempat modul rantai konten sudah ada dan masing-masing benar: content-patch-gate
 * memvalidasi kandidat terhadap kanonik, content-canary membatasi paparan, content-promotion
 * memutuskan lewat FiezelStatGate, content-adoption-receipt merantai resi. Yang TIDAK ada
 * adalah yang menjawab pertanyaan operator: kandidat ini sampai mana, dan apa yang menahannya.
 *
 * Akibatnya nyata dan bisa ditunjuk: `gateStatus:'UNVERIFIED_LOCAL_GATES_REQUIRED'` yang
 * dikembalikan worker TIDAK PERNAH BERPINDAH. Worker tidak bisa memindahkannya — ia tidak
 * punya berkas kanonik dan memang tidak boleh punya. Jadi statusnya menggantung selamanya,
 * dan "rantai konten" adalah empat modul yang tidak pernah jadi rantai.
 *
 * URUTAN ADALAH SELURUH ISI MODUL INI
 * -----------------------------------
 * Bukti tahap belakang TIDAK PERNAH dihitung selama tahap depan belum terpenuhi. Kandidat
 * yang gerbang lokalnya MERAH tetapi angka canary-nya bagus harus terbaca "tertahan di
 * gerbang lokal" — bukan "hampir siap". Menghitung penghalang secara independen lalu
 * menjumlahkannya terasa lebih sederhana dan justru itu cacatnya: ia membuat bukti dari
 * paparan ke murid menutupi kegagalan validasi yang seharusnya mencegah paparan itu terjadi.
 *
 * TAHAP TERAKHIR ADALAH `owner_decision`, DAN TIDAK ADA TAHAP SESUDAHNYA
 * ----------------------------------------------------------------------
 * Bukan karena belum ditulis — karena penerbitan bukan wewenang otak. MASTER-ONLY-GOVERNANCE
 * §4–§5 melarang promosi otomatis terpicu ambang. Modul ini menghormatinya dengan cara yang
 * tidak bisa dilanggar dari luar: `ownerDecisionRequired` adalah literal `true`, tidak dihitung
 * dari masukan mana pun, dan kosakata STAGES tidak punya kata untuk "terbit". Yang bisa
 * dilaporkan modul ini paling jauh adalah: semua yang bisa dibuktikan mesin sudah terbukti,
 * sisanya tanda tangan manusia.
 *
 * Modul MURNI: tanpa DOM, jaringan, penyimpanan, sumber acak, atau jam internal. Ia menerima
 * LAPORAN yang sudah dihitung modul lain, bukan berkas — supaya seluruh perilakunya, termasuk
 * tiap penghalang, bisa diuji tanpa menyentuh bank soal.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FiezelContentChain = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var SCHEMA = 'fiezel-content-chain-v1';

  /* Kosakata TERTUTUP, berurutan, dan sengaja berhenti di keputusan manusia.
     Tidak ada 'published' / 'adopted' di sini, dan gerbangnya menuntut itu tetap begitu. */
  var STAGES = ['candidate', 'local_gate', 'canary', 'verdict', 'owner_decision'];

  function str(v) { return typeof v === 'string' ? v.trim() : ''; }
  function obj(v) { return v && typeof v === 'object' && !Array.isArray(v) ? v : null; }

  /** Laporan mana pun yang membawa jawaban/riwayat mentah menghentikan rantai, di tahap mana pun. */
  function bocor(report) {
    var p = obj(report) && obj(report.privacy);
    return !!p && (p.rawAnswersIncluded === true || p.rawHistoryIncluded === true);
  }

  /**
   * assess(input, nowMs) -> {schema, stage, blockers, ownerDecisionRequired, ready, chain}
   *
   * input: {
   *   candidate,             // kandidat patch (dari worker atau lokal)
   *   localGate,             // laporan content-patch-gate.validateCandidate
   *   canaryConfig, canaryEvidence,
   *   verdict,               // hasil content-promotion.evaluate
   *   receiptLedger          // hasil content-adoption-receipt.verifyLedger
   * }
   *
   * `stage` adalah tahap TERJAUH yang benar-benar tercapai. `blockers` menjelaskan kenapa ia
   * tidak lebih jauh — kosong hanya bila tahapnya sudah owner_decision.
   */
  function assess(input, nowMs) {
    var inp = obj(input);
    var out = {
      schema: SCHEMA,
      stage: 'candidate',
      blockers: [],
      /* Literal, bukan hasil hitungan. Tidak ada masukan yang bisa membuatnya false. */
      ownerDecisionRequired: true,
      ready: false,
      at: typeof nowMs === 'number' && isFinite(nowMs) ? Math.floor(nowMs) : null,
      chain: { candidate: null, localGate: null, canary: null, verdict: null, receipt: null }
    };
    if (!inp) { out.blockers.push('chain_no_input'); return out; }

    // ---- Tahap 1: kandidat ----------------------------------------------------------
    var cand = obj(inp.candidate);
    var patchId = cand ? str(cand.patchId) : '';
    out.chain.candidate = patchId || null;
    if (!cand || !patchId) { out.blockers.push('chain_no_candidate'); return out; }
    if (bocor(cand)) { out.blockers.push('chain_privacy_violation'); return out; }

    // ---- Tahap 2: gerbang lokal -----------------------------------------------------
    // Inilah yang memindahkan gateStatus dari UNVERIFIED_LOCAL_GATES_REQUIRED. Laporan
    // ABSEN bukan laporan lulus: fail-closed, karena "belum diperiksa" dan "sudah diperiksa
    // dan aman" adalah dua keadaan yang justru paling berbahaya untuk disamakan.
    var lg = obj(inp.localGate);
    if (!lg) { out.blockers.push('chain_local_gate_not_run'); return out; }
    out.chain.localGate = { ok: lg.ok === true, patchId: str(lg.patchId) || null };
    if (str(lg.patchId) && str(lg.patchId) !== patchId) {
      // Laporan milik kandidat LAIN. Ini bukan detail administratif: menerimanya berarti
      // meloloskan kandidat yang tidak pernah divalidasi, memakai bukti milik kandidat lain.
      out.blockers.push('chain_local_gate_patch_mismatch');
      return out;
    }
    if (lg.ok !== true) { out.blockers.push('chain_local_gate_failed'); return out; }
    if (lg.canonicalImmutable === false) { out.blockers.push('chain_canonical_mutated'); return out; }
    out.stage = 'local_gate';

    // ---- Tahap 3: canary ------------------------------------------------------------
    var cfg = obj(inp.canaryConfig), ev = obj(inp.canaryEvidence);
    if (!cfg) { out.blockers.push('chain_canary_not_configured'); return out; }
    if (!ev) { out.blockers.push('chain_canary_no_evidence'); return out; }
    if (bocor(ev)) { out.blockers.push('chain_privacy_violation'); return out; }
    out.chain.canary = {
      canaryId: str(cfg.canaryId) || null,
      exposureSessions: Number(ev.exposureSessions || 0)
    };
    out.stage = 'canary';

    // ---- Tahap 4: verdict statistik -------------------------------------------------
    var v = obj(inp.verdict);
    if (!v || !str(v.status)) { out.blockers.push('chain_verdict_absent'); return out; }
    out.chain.verdict = { status: str(v.status), reason: str(v.reason) || null };
    if (str(v.status) === 'rollback') { out.blockers.push('chain_verdict_rollback'); return out; }
    if (str(v.status) !== 'promote') {
      /* 'hold' tanpa batas waktu adalah hasil SAH, bukan kegagalan — kontrak yang sama
         dengan header content-promotion.js. Ia penghalang, bukan galat, dan memaksanya
         selesai adalah persis bug yang gate statistik itu ada untuk mencegah. */
      out.blockers.push('chain_verdict_hold');
      return out;
    }

    // ---- Tahap 5: rantai resi harus utuh SEBELUM keputusan manusia diminta ----------
    // Meminta OWNER memutuskan di atas rantai bukti yang tidak terverifikasi berarti
    // meminta tanda tangan pada dokumen yang isinya tidak dijamin.
    var rl = obj(inp.receiptLedger);
    if (!rl) { out.blockers.push('chain_receipt_ledger_absent'); return out; }
    out.chain.receipt = { ok: rl.ok === true, length: Number(rl.length || 0) };
    if (rl.ok !== true) { out.blockers.push('chain_receipt_ledger_broken'); return out; }

    out.stage = 'owner_decision';
    out.ready = true; // siap DIPUTUSKAN manusia — bukan siap terbit.
    return out;
  }

  return { SCHEMA: SCHEMA, STAGES: STAGES, assess: assess };
});
