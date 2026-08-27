/**
 * FIEZEL Evidence Credibility (Braincore v3 — C6, model-council-claude_opus_5_0.md).
 *
 * KENAPA MODUL INI ADA
 * --------------------
 * Semua model murid (BKT, memory, ledger miskonsepsi) berdiri di atas satu asumsi diam:
 * bahwa setiap jawaban adalah bukti kemampuan materi. Asumsi itu salah pada tiga kelas
 * kejadian yang justru sering terjadi di FIEZEL:
 *
 *   1. TEBAKAN. Jawaban di bawah 1,8 detik pada soal 4 opsi hampir tidak mengandung
 *      informasi kemampuan — murid belum sempat membaca stem-nya. Hari ini tebakan sudah
 *      terdeteksi (`timing === 'guess'`) tetapi tetap masuk model dengan bobot penuh.
 *   2. BEBAN BAHASA INSTRUKSI. Murid A1 yang salah pada soal yang stem dan opsinya
 *      seluruhnya bahasa Inggris mungkin tidak gagal pada MATERI-nya; ia gagal MEMBACA
 *      SOALNYA. Ada 842 soal listening berbahasa Inggris penuh yang hari ini dihitung
 *      sebagai bukti materi murni. Kesalahan "tidak paham soal" yang dilabeli "tidak tahu
 *      materi" adalah bukti yang salah label, dan tidak ada model yang bisa memperbaiki
 *      bukti yang salah label.
 *   3. ITEM CACAT. Item yang ditandai `evidence_mismatch` oleh contentIntegrityGate tidak
 *      punya jawaban benar yang bisa dipertanggungjawabkan. Bukti darinya harus DIBUANG
 *      (bobot 0), bukan sekadar didiskon — mendiskon item cacat masih meracuni model,
 *      hanya lebih pelan.
 *
 * Tambahan dari C10 (listening): benar setelah >=3 kali replay bukan bukti kemampuan yang
 * sama dengan benar sekali putar. Replay tidak membatalkan bukti (murid tetap akhirnya
 * paham), tetapi menurunkan nilainya.
 *
 * APA YANG DILAKUKAN
 * ------------------
 * `weigh()` memberi setiap respons bobot kredibilitas kappa di (0..1] sebagai HASIL KALI
 * empat komponen independen:
 *
 *     kappa = kappa_timing * kappa_lang * kappa_integrity * kappa_replay
 *
 * Perkalian (bukan minimum, bukan rata-rata) karena setiap sumber kontaminasi berdiri
 * sendiri: tebakan pada soal berbahasa Inggris penuh lebih tidak informatif daripada
 * masing-masing sendirian, dan bukti dari item cacat harus nol APA PUN kondisi lainnya —
 * hanya perkalian yang memberi kedua sifat itu sekaligus.
 *
 * Pemanggil (A3 di app.js, lewat availability-check) mengalikan LANGKAH PEMBARUAN model
 * dengan kappa; modul ini sendiri tidak menyentuh model apa pun.
 *
 * `classifyLangLoad()` adalah heuristik runtime untuk menentukan beban bahasa sebuah item
 * ('id' | 'assisted' | 'full_en') dari teks stem + opsi, dipakai saat field offline
 * `langLoad` belum tersedia di bank soal.
 *
 * BATAS YANG DIJAGA
 * -----------------
 * - MURNI: tanpa DOM, tanpa jaringan, tanpa storage, tanpa waktu implisit. Angka masuk,
 *   angka keluar; seluruh perilaku bisa ditabelkan di gate.
 * - BUKAN KEPUTUSAN PEDAGOGIS: ini higienitas pengukuran, jadi tidak ada confidence gate.
 *   Tetapi setiap diskon WAJIB membawa kode alasan `brain3_evidence_*` di `reasons[]`
 *   supaya bisa diaudit — bobot yang tidak bisa dijelaskan sama buruknya dengan bobot
 *   yang salah.
 * - INPUT KOSONG AMAN: tanpa informasi kontaminasi, bukti dianggap bersih (kappa = 1).
 *   Modul higiene yang menghukum ketidaktahuan dirinya sendiri akan mendistorsi model
 *   lebih parah daripada tidak ada modul sama sekali.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FiezelEvidenceCredibility = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var SCHEMA = 'fiezel-evidence-credibility-v1';

  /**
   * Konstanta diskon — dipusatkan supaya gate bisa menguji nilai persisnya dan supaya
   * perubahan kalibrasi di masa depan terjadi di SATU tempat, bukan tersebar di cabang if.
   */
  var KAPPA = Object.freeze({
    GUESS: 0.3,          // < 1.800 ms pada 4 opsi: nyaris nol informasi kemampuan (C6).
    LANG_FULL_EN_LOW: 0.45,  // A1/A2 pada soal Inggris penuh: separuh lebih kegagalan adalah kegagalan membaca soal.
    LANG_FULL_EN_HIGH: 0.85, // B1+ pada soal Inggris penuh: beban bahasa ada tetapi kecil.
    LANG_ASSISTED: 0.8,  // Campuran EN dengan dukungan Indonesia: diskon ringan.
    REPLAY: 0.6,         // Listening benar setelah >=3 replay: paham, tetapi bukan bukti setara sekali putar (C10).
    REJECTED: 0          // evidence_mismatch: bukti dibuang, bukan didiskon.
  });

  var GUESS_MS = 1800;     // Ambang tebakan — sama dengan detektor timing yang sudah ada di app.js.
  var REPLAY_LIMIT = 3;    // Mulai replay ke-3, bukti listening didiskon.

  /** Level CEFR yang beban bahasa Inggris penuhnya paling menghukum. */
  var LOW_LEVELS = Object.freeze({ A1: true, A2: true });

  /**
   * Daftar kecil kata fungsi + kata instruksi Indonesia untuk classifyLangLoad.
   * Sengaja KECIL dan berfokus pada kata yang hampir pasti muncul di stem berbahasa
   * Indonesia (kata tugas + kosakata instruksi soal), bukan kamus umum: tujuannya
   * membedakan "soal berdukungan Indonesia" dari "soal Inggris penuh", bukan menjadi
   * detektor bahasa universal. Kata Inggris hampir tidak mungkin bertabrakan dengan
   * daftar ini, sehingga false positive praktis nol.
   */
  var ID_WORDS = Object.freeze([
    'yang', 'dan', 'di', 'ke', 'dari', 'untuk', 'pada', 'dengan', 'ini', 'itu',
    'adalah', 'dalam', 'tidak', 'bukan', 'atau', 'akan', 'sudah', 'belum', 'bisa',
    'harus', 'karena', 'jika', 'kalau', 'saat', 'ketika', 'agar', 'supaya', 'juga',
    'saya', 'kamu', 'dia', 'kita', 'mereka', 'apa', 'mana', 'siapa', 'bagaimana',
    'kata', 'kalimat', 'bentuk', 'kerja', 'pilih', 'pilihlah', 'jawaban', 'benar',
    'tepat', 'paling', 'sesuai', 'berikut', 'lengkapi', 'melengkapi', 'isi', 'isilah',
    'gunakan', 'arti', 'makna', 'terjemahan', 'berarti', 'kosong', 'titik', 'bagian'
  ]);
  var ID_SET = (function () {
    var s = {};
    for (var i = 0; i < ID_WORDS.length; i++) s[ID_WORDS[i]] = true;
    return s;
  })();

  /**
   * Ambang rasio kata Indonesia terhadap total kata:
   * - >= 0.45 : stem+opsi didominasi Indonesia -> 'id' (dukungan penuh).
   * - >= 0.12 : ada dukungan Indonesia yang nyata (mis. stem ID + opsi EN) -> 'assisted'.
   * - <  0.12 : praktis Inggris penuh -> 'full_en'.
   * Angka 0.12 bukan 0 karena satu-dua kata pinjaman ('di', 'aksi') tidak boleh membuat
   * soal Inggris penuh lolos sebagai 'assisted'.
   */
  var TH_ID = 0.45;
  var TH_ASSISTED = 0.12;

  function isFiniteNumber(v) {
    return typeof v === 'number' && isFinite(v);
  }

  /**
   * kappa_timing: 0.3 untuk tebakan, 1.0 lainnya.
   * `timing` boleh berupa label ('guess'|'struggled'|...) seperti yang disimpan riwayat
   * app.js, ATAU angka milidetik mentah — keduanya diterima supaya pemanggil tidak perlu
   * tahu representasi mana yang tersedia di titik panggilnya.
   */
  function timingComponent(timing) {
    if (timing === 'guess') return KAPPA.GUESS;
    if (isFiniteNumber(timing) && timing >= 0 && timing < GUESS_MS) return KAPPA.GUESS;
    return 1;
  }

  /**
   * kappa_lang: fungsi beban bahasa item RELATIF terhadap level murid — soal Inggris penuh
   * bukan masalah untuk B2, tetapi masalah besar untuk A1. Karena itu komponen ini butuh
   * DUA input, bukan satu.
   */
  function langComponent(langLoad, learnerLevel) {
    if (langLoad === 'full_en') {
      var lv = typeof learnerLevel === 'string' ? learnerLevel.toUpperCase() : '';
      return LOW_LEVELS[lv] ? KAPPA.LANG_FULL_EN_LOW : KAPPA.LANG_FULL_EN_HIGH;
    }
    if (langLoad === 'assisted') return KAPPA.LANG_ASSISTED;
    // 'id', tidak diketahui, atau tidak diisi: tanpa bukti beban bahasa, jangan mendiskon.
    return 1;
  }

  /**
   * weigh({timing, langLoad, integrity, replayCount, learnerLevel}) -> {kappa, reasons[]}
   *
   * Semua field opsional; field yang absen berarti "tidak ada bukti kontaminasi dari
   * dimensi itu" dan komponennya 1. `reasons` berisi SATU kode per diskon yang aktif,
   * sehingga audit bisa merekonstruksi kappa dari reasons tanpa membaca ulang input.
   */
  function weigh(input) {
    var ev = input || {};
    var reasons = [];

    // Integritas dulu: bukti dari item cacat dibuang apa pun kondisi lainnya. Tetap
    // dilaporkan lewat reasons supaya baris riwayatnya bisa diaudit, bukan hilang diam-diam.
    var kIntegrity = 1;
    if (ev.integrity === 'evidence_mismatch') {
      kIntegrity = KAPPA.REJECTED;
      reasons.push('brain3_evidence_rejected_integrity');
    }

    var kTiming = timingComponent(ev.timing);
    if (kTiming < 1) reasons.push('brain3_evidence_discounted_guess');

    var kLang = langComponent(ev.langLoad, ev.learnerLevel);
    if (kLang < 1) reasons.push('brain3_evidence_discounted_language');

    // Replay: hanya bermakna untuk listening; pemanggil hanya mengisi replayCount pada
    // item listening yang dijawab BENAR (benar setelah 4x putar != benar sekali putar;
    // jawaban salah sudah bukan bukti kemampuan yang perlu didiskon lagi dari sisi ini).
    var kReplay = 1;
    if (isFiniteNumber(ev.replayCount) && ev.replayCount >= REPLAY_LIMIT) {
      kReplay = KAPPA.REPLAY;
      reasons.push('brain3_evidence_discounted_replay');
    }

    return {
      kappa: kTiming * kLang * kIntegrity * kReplay,
      reasons: reasons
    };
  }

  /**
   * classifyLangLoad({stem, options, learnerLevel}) -> 'id' | 'assisted' | 'full_en'
   *
   * Heuristik murni: gabungkan stem + semua opsi, tokenisasi kata, hitung rasio kata yang
   * dikenali sebagai Indonesia (daftar ID_WORDS). Rasio tinggi -> item berdukungan
   * Indonesia; rasio nol/nyaris nol -> Inggris penuh.
   *
   * `learnerLevel` diterima demi kesimetrian API (dan pemanggil yang sudah memegang level
   * tidak perlu memisah objeknya), tetapi TIDAK memengaruhi hasil: beban bahasa adalah
   * properti ITEM. Relativitas terhadap murid ditangani di weigh()/langComponent, bukan
   * di sini — mencampur keduanya membuat field item tidak bisa dihitung offline.
   *
   * Teks kosong dianggap 'id': tanpa teks tidak ada beban bahasa yang bisa dituduhkan,
   * dan default yang tidak mendiskon adalah default yang aman.
   */
  function classifyLangLoad(input) {
    var it = input || {};
    var parts = [];
    if (typeof it.stem === 'string') parts.push(it.stem);
    var opts = it.options;
    if (opts && typeof opts.length === 'number') {
      for (var i = 0; i < opts.length; i++) {
        if (typeof opts[i] === 'string') parts.push(opts[i]);
        else if (opts[i] && typeof opts[i].text === 'string') parts.push(opts[i].text);
      }
    }
    var text = parts.join(' ').toLowerCase();
    // Tokenisasi: hanya huruf (termasuk aksen dasar); angka dan tanda baca bukan bukti bahasa.
    var tokens = text.match(/[a-z\u00c0-\u024f]+/g) || [];
    if (!tokens.length) return 'id';

    var idCount = 0;
    for (var j = 0; j < tokens.length; j++) {
      if (ID_SET[tokens[j]] === true) idCount++;
    }
    var ratio = idCount / tokens.length;
    if (ratio >= TH_ID) return 'id';
    if (ratio >= TH_ASSISTED) return 'assisted';
    return 'full_en';
  }

  return {
    SCHEMA: SCHEMA,
    KAPPA: KAPPA,
    GUESS_MS: GUESS_MS,
    REPLAY_LIMIT: REPLAY_LIMIT,
    weigh: weigh,
    classifyLangLoad: classifyLangLoad
  };
});
