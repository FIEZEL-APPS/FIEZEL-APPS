/**
 * FIEZEL N-of-1 — eksperimen di dalam SATU murid, bukan antar murid.
 *
 * KENAPA BENTUK INI, DAN KENAPA A/B BIASA SUDAH DIBUNUH DENGAN ANGKA
 * ------------------------------------------------------------------
 * A/B antar-murid DIBATALKAN dan keputusannya tertulis di BRAIN-EVOLUTION-DECISIONS.md §1,
 * bulat 4/4 model council. Aritmetikanya tidak bisa ditawar: mendeteksi efek Cohen's d = 0,2
 * pada alpha 0,05 / power 0,80 butuh ~392 murid PER LENGAN, sementara kapasitas aplikasi
 * di-hard-cap 250 (MAX_USERS di fiezel-core-worker.js). Menambah SOAL per murid tidak
 * menolong: attempt ter-cluster di dalam murid, jadi attempt efektif ber-asimtot di ~1/ICC —
 * pada rho=0,1 seorang murid menyumbang ~10 attempt efektif entah ia menjawab 100 atau 1.000.
 * Hanya penambahan MURID yang membeli power, dan plafonnya 250.
 *
 * Yang sah pada N=1 adalah evaluasi INTERLEAVED WITHIN-SUBJECT: dua kebijakan berselang-seling
 * di aliran item yang sama, pada murid yang sama, dibandingkan dengan dirinya sendiri.
 *
 * KENAPA INTERLEAVED, BUKAN BLOK
 * ------------------------------
 * Menjalankan kebijakan A selama seminggu lalu B minggu berikutnya memasukkan SELURUH tren
 * waktu ke dalam selisih lengan: murid membaik karena belajar, lelah di minggu ujian, libur
 * sekolah. Tidak satu pun bisa dipisahkan dari efek kebijakan. Berselang-seling di aliran yang
 * sama membuat kedua lengan berbagi kondisi yang sama persis.
 *
 * KENAPA ASSIGNMENT HARUS DETERMINISTIK DAN TANPA STATE
 * ----------------------------------------------------
 * assign() adalah fungsi MURNI dari (itemId, experimentId) lewat FNV-1a. Tanpa jam, tanpa
 * acak, tanpa penyimpanan. Konsekuensinya: item yang sama selalu jatuh ke lengan yang sama —
 * termasuk setelah reinstall, di perangkat kedua, atau saat aliran bukti diputar ulang dari
 * hasil sinkron. Eksperimen yang assignment-nya bisa berubah adalah eksperimen yang hasilnya
 * tidak bisa diaudit ulang, dan hasil yang tidak bisa diaudit ulang bukan bukti.
 *
 * BATAS YANG DIJAGA: modul ini TIDAK memutuskan promote/reject. Ia membagi lengan dan
 * menghitung. Keputusan milik FiezelPolicyVerdict, yang mengambilnya dari interval.
 *
 * Modul MURNI: tanpa DOM, jaringan, penyimpanan, sumber acak, atau jam internal.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FiezelNof1 = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var SCHEMA = 'fiezel-nof1-v1';
  var ARMS = ['control', 'candidate'];
  /* Minimum per lengan sebelum tally pantas disebut siap. Bukan ambang keputusan — keputusan
     tetap milik verdict, yang punya ambangnya sendiri dari interval. Ini lantai kewarasan
     supaya pemanggil tidak menyodorkan dua-tiga jawaban sebagai "hasil". */
  var MIN_PER_ARM = 12;

  function str(v) { return typeof v === 'string' ? v.trim() : ''; }

  /** FNV-1a 32-bit. Hash yang sama dipakai jitter probe retensi. */
  function fnv1a(s) {
    var h = 0x811c9dc5;
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h >>> 0;
  }

  /**
   * fmix32 — finalizer murmur3. WAJIB, dan alasannya ditemukan lewat pengukuran, bukan teori.
   *
   * FNV-1a mengalikan dengan bilangan ganjil, jadi BIT TERENDAHNYA praktis adalah paritas
   * byte masukan. Mengambil `% 2` langsung dari FNV berarti mengambil bit yang paling tidak
   * acak. Diukur pada 10.000 id berurutan (item-0..item-9999):
   *
   *   - lengan berselang-seling sempurna 0,1,0,1,0 — bukan pembagian, melainkan alternasi
   *     yang terikat karakter terakhir id, sehingga lengan berkorelasi dengan URUTAN item;
   *   - mengganti experimentId membalik 10.000 dari 10.000 item, artinya dua eksperimen
   *     adalah KOMPLEMEN PERSIS satu sama lain, bukan dua partisi independen.
   *
   * Keduanya membuat sebaran terlihat sempurna (5000/5000, skew 0,0000) sambil merusak
   * seluruh eksperimen — bentuk kegagalan yang paling berbahaya, karena metrik kesehatannya
   * justru terlihat ideal.
   *
   * Setelah fmix32 menyebar entropi ke seluruh bit: sebaran 5086/4914 (skew 0,0172), dua
   * eksperimen berbeda pada 5041 dari 10.000 item, dan run terpanjang 12 alih-alih 1.
   */
  function fmix32(h) {
    h ^= h >>> 16;
    h = Math.imul(h, 0x85ebca6b) >>> 0;
    h ^= h >>> 13;
    h = Math.imul(h, 0xc2b2ae35) >>> 0;
    h ^= h >>> 16;
    return h >>> 0;
  }

  /**
   * assign(itemId, experimentId) -> 'control' | 'candidate' | null
   *
   * null saat masukan tidak sah: item tanpa identitas TIDAK boleh dipaksa masuk lengan mana
   * pun. Memaksanya berarti menaruh bukti di lengan yang berubah-ubah antar run.
   */
  function assign(itemId, experimentId) {
    var item = str(itemId), exp = str(experimentId);
    if (!item || !exp) return null;
    // Pemisah '::' dilarang di dalam pola pengenal konten, jadi ('ab','c') dan ('a','bc')
    // tidak pernah bisa menghasilkan masukan hash yang sama.
    return ARMS[fmix32(fnv1a(exp + '::' + item)) % 2];
  }

  /**
   * tally(history, experiment) -> {control:{n,ok}, candidate:{n,ok}, ...}
   *
   * Hanya baris SETELAH experiment.startedAt yang dihitung: bukti dari sebelum eksperimen
   * dimulai bukan bukti tentang eksperimen itu. Baris tanpa item ter-assign dilewat, dan
   * jumlahnya DILAPORKAN — bukti yang diam-diam dibuang adalah bukti yang hilang.
   */
  function tally(history, experiment) {
    var out = {
      schema: SCHEMA,
      control: { n: 0, ok: 0 },
      candidate: { n: 0, ok: 0 },
      skipped: 0,
      spanMs: 0,
      ready: false,
      rationale: 'brain4_nof1_tally'
    };
    var exp = experiment && typeof experiment === 'object' ? experiment : null;
    var id = exp ? str(exp.id) : '';
    var startedAt = exp && typeof exp.startedAt === 'number' && isFinite(exp.startedAt) ? exp.startedAt : null;
    if (!id || startedAt === null) { out.rationale = 'brain4_nof1_tally_invalid_experiment'; return out; }

    var rows = Array.isArray(history) ? history : [];
    var first = null, last = null;
    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      if (!row || typeof row !== 'object') { out.skipped++; continue; }
      var at = typeof row.at === 'number' && isFinite(row.at) ? row.at : null;
      if (at === null || at < startedAt) { out.skipped++; continue; }
      var item = str(row.item) || str(row.target) || str(row.id);
      var armName = assign(item, id);
      if (!armName) { out.skipped++; continue; }
      out[armName].n++;
      if (row.ok === true) out[armName].ok++;
      if (first === null || at < first) first = at;
      if (last === null || at > last) last = at;
    }
    out.spanMs = first !== null && last !== null ? last - first : 0;
    var min = typeof exp.minPerArm === 'number' && exp.minPerArm > 0 ? Math.floor(exp.minPerArm) : MIN_PER_ARM;
    out.minPerArm = min;
    out.ready = out.control.n >= min && out.candidate.n >= min;
    return out;
  }

  /**
   * balance(itemIds, experimentId) -> sebaran lengan pada satu himpunan item.
   * Hash yang berat sebelah membuat SELURUH eksperimen bohong, jadi keseimbangannya diukur,
   * bukan diasumsikan.
   */
  function balance(itemIds, experimentId) {
    var n = { control: 0, candidate: 0 };
    var ids = Array.isArray(itemIds) ? itemIds : [];
    for (var i = 0; i < ids.length; i++) {
      var a = assign(ids[i], experimentId);
      if (a) n[a]++;
    }
    var total = n.control + n.candidate;
    return {
      schema: SCHEMA,
      control: n.control,
      candidate: n.candidate,
      total: total,
      skew: total ? Math.abs(n.control - n.candidate) / total : 0,
      rationale: 'brain4_nof1_balance'
    };
  }

  return {
    SCHEMA: SCHEMA,
    ARMS: ARMS,
    MIN_PER_ARM: MIN_PER_ARM,
    assign: assign,
    tally: tally,
    balance: balance
  };
});
