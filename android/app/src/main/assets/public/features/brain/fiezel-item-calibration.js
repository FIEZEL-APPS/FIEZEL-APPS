/**
 * FIEZEL Item Calibration — Elo dua-sisi SISI ITEM dengan shrinkage keras (Braincore v3, C1).
 *
 * MASALAH YANG DIPERBAIKI (council model-council-claude_opus_5_0.md C1 tahap B)
 * -----------------------------------------------------------------------------
 * FiezelItemPrior (A6) sudah memberi PRIOR kesulitan per item dari fitur konten
 * (level CEFR + biaya kognitif mode). Tetapi prior adalah tebakan editorial:
 * item tertentu bisa jauh lebih mudah atau lebih sulit dari label levelnya untuk
 * murid tertentu. Modul ini menambahkan koreksi ONLINE gaya Elo dua-sisi
 * (Pelánek, CAE-elo): setiap jawaban menggeser kesulitan item berlawanan arah
 * dari kejutan yang sama yang menggeser ability murid:
 *
 *     p     = successProbability 3PL = c + (1-c) * sigmoid(a * (theta - b))
 *     delta -= Kb * kappa * (y - p),   Kb = 0.35 / (1 + 0.08 * n_item)
 *
 * Murid benar lebih sering dari dugaan -> item ternyata lebih mudah -> delta
 * turun (dan sebaliknya). Bentuk peluruhan 1/(1+gamma*n) dipilih karena itulah
 * yang direkomendasikan literatur Elo pendidikan: estimasi MENGENDAP seiring
 * bukti bertambah, bukan berosilasi selamanya mengikuti jawaban terakhir.
 *
 * KENAPA SHRINKAGE |delta| <= 0.6 WAJIB, BUKAN OPSIONAL (risiko divergensi N=1)
 * -----------------------------------------------------------------------------
 * Catatan risiko council (Sonnet §2.3, merujuk "Keeping Elo Alive" soal deflasi/
 * divergensi rating) tegas: kalibrasi item Elo hanya sahih kalau item dijawab
 * BANYAK murid. FIEZEL berjalan per-device dengan SATU murid, sehingga theta
 * murid dan b_i item diestimasi dari pertandingan yang sama — identifiability-nya
 * lemah: model tidak bisa membedakan "murid ini pintar" dari "semua item ini
 * mudah". Tanpa pagar, jawaban satu-arah yang panjang (murid rajin yang selalu
 * benar, atau murid frustrasi yang selalu salah) akan menyeret SELURUH bank soal
 * ke satu arah — kesulitan item terdeflasi/terinflasi secara sistematis dan
 * seleksi soal berbasis difficulty menjadi bohong. Karena itu delta di-clamp
 * KERAS ke +/-0.6 dari prior pada SETIAP update (bukan hanya saat dibaca):
 * prior editorial tetap menjadi jangkar (anchoring ala literatur kalibrasi
 * hierarkis untuk data jarang), dan sinyal online hanya boleh menjadi koreksi
 * lokal yang terbatas, bukan kebenaran baru. Ini pengaman UTAMA modul ini;
 * Kb yang meluruh dan diskon kappa hanya memperlambat, clamp-lah yang menghentikan.
 *
 * GATE PENERAPAN n >= 8
 * ---------------------
 * Di bawah 8 jawaban, delta didominasi derau (guessing floor 0.25 saja sudah
 * membuat satu jawaban benar nyaris tak informatif). effective() karena itu
 * mengembalikan prior apa adanya (applied:false) sampai bukti cukup — kondisi
 * cold-start TIDAK PERNAH lebih buruk dari hari ini karena prior selalu ada.
 *
 * RECENTERING MEDIAN + DEAD ZONE (temuan simulator C6, jilid dua risiko N=1)
 * -----------------------------------------------------------------------------
 * Shrinkage menghentikan DIVERGENSI, tetapi simulator C6 menemukan penyakit
 * kedua yang lebih halus: pada murid yang sedang BERUBAH, taksiran kemampuan
 * selalu tertinggal dari kemampuan sebenarnya, sehingga (y - p) bermean tidak
 * nol dan Elo sisi-item MENYERAP galat model murid itu ke delta SEMUA item —
 * ~86% item yang label-nya sudah benar terseret drift sistematis ~0.22 SATU
 * ARAH (itemBiasRMSE keseluruhan justru naik 0.2694 -> 0.3357 meski item
 * mislabeled membaik). Kuncinya: drift yang DIALAMI BERSAMA seluruh kohort
 * bukan properti item mana pun — itu galat kemampuan; di N=1 hanya deviasi
 * RELATIF sebuah item terhadap kohortnya yang bisa dipercaya sebagai sinyal
 * tentang item itu. Maka effective() memakai delta TERPUSAT:
 *
 *     delta_terpakai = delta_mentah - median(delta semua item dengan n >= 8)
 *
 * Median (bukan mean) supaya beberapa item mislabeled besar tidak menggeser
 * pusatnya sendiri. Recentering hanya aktif bila kohort >= 2 item — kohort
 * satu item tidak membawa informasi drift apa pun (median = delta sendiri
 * hanya akan membatalkan dirinya sendiri), jadi delta dipakai apa adanya.
 *
 * Setelah dipusatkan, DEAD ZONE |delta_terpusat| < 0.3 diperlakukan nol
 * (applied:false): sisa deviasi sekecil itu di N=1 hampir pasti derau, dan
 * mengembalikan item sehat ke prior-nya jauh lebih murah daripada membiarkan
 * ribuan item bergeser sedikit-sedikit tanpa alasan. Angka 0.3 DIKALIBRASI
 * terhadap gate simulator C6 (bukan dipetik dari udara): pada 0.2 dan 0.25
 * itemBiasRMSE keseluruhan masih di atas baseline (0.3059 dan 0.2844 vs
 * 0.2694) karena sebaran drift cukup lebar sehingga banyak item sehat lolos
 * dead zone; pada 0.3 RMSE keseluruhan akhirnya TURUN (0.2622) sementara item
 * yang benar-benar mislabeled (galat label +/-0.8) tetap jauh di atas ambang
 * setelah recentering — koreksi yang memang dibayar bukti tidak hilang
 * (RMSE mislabeled-only 0.7511 -> 0.4960).
 *
 * BATAS YANG DIJAGA
 * -----------------
 * Modul MURNI: tanpa DOM, tanpa jaringan, tanpa storage, tanpa Math.random,
 * waktu SELALU argumen (nowMs). State apa pun yang korup (bukan objek, schema
 * asing, angka rusak) diperlakukan sebagai kosong/disembuhkan — jawab jujur,
 * jangan melempar. Semua fungsi mengembalikan state BARU, masukan tidak diubah.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FiezelItemCalibration = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var SCHEMA = 'fiezel-item-calibration-v1';

  // Parameter 3PL SAMA dengan fiezel-core-brain.js — kalau p yang dipakai untuk
  // menggeser theta dan p yang dipakai untuk menggeser b_i berbeda modelnya,
  // kedua sisi Elo saling membohongi.
  var DISCRIMINATION = 1.5;
  var GUESS_FLOOR = 0.25;

  // Kb = KB_ALPHA / (1 + KB_GAMMA * n): langkah awal 0.35 (item baru boleh
  // belajar cepat dari prior yang mungkin salah), meluruh supaya mengendap.
  var KB_ALPHA = 0.35;
  var KB_GAMMA = 0.08;

  // Pagar utama N=1 (lihat esai di atas): delta TIDAK PERNAH melewati +/-0.6
  // dari prior, di-clamp pada setiap update.
  var SHRINKAGE = 0.6;

  // Delta hanya DITERAPKAN setelah minimal 8 jawaban pada item itu.
  var MIN_N_APPLY = 8;

  // Setelah recentering median, deviasi lebih kecil dari ini diperlakukan nol —
  // di N=1 itu derau, bukan pengetahuan tentang item. Nilai 0.3 dikalibrasi
  // terhadap gate simulator C6 (0.2/0.25 masih kalah baseline; lihat esai atas).
  var DEAD_ZONE = 0.3;

  // Recentering butuh pembanding: kohort minimal 2 item ber-n>=8. Dengan satu
  // item saja median = delta item itu sendiri dan koreksi selalu batal — padahal
  // justru item tunggal yang sudah membayar 8+ jawaban berhak dipakai deltanya.
  var RECENTER_MIN_COHORT = 2;

  // compact(): item dengan bukti terlalu tipis untuk pernah diterapkan (n < 3)
  // dan tidak disentuh 90 hari boleh dibuang — nilainya nol, biayanya nyata
  // (state localStorage tumbuh sebanding jumlah item yang pernah dilihat).
  var COMPACT_MIN_N = 3;
  var COMPACT_IDLE_DAYS = 90;
  var DAY_MS = 86400000;

  function isFiniteNumber(v) { return typeof v === 'number' && isFinite(v); }

  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }

  // 3PL: lantai tebakan 0.25 karena soal FIEZEL berbasis 4 opsi — murid yang
  // tidak tahu apa-apa pun benar 25%, dan model harus tahu itu bukan bukti.
  function successProbability(ability, difficulty) {
    var latent = 1 / (1 + Math.exp(-DISCRIMINATION * (ability - difficulty)));
    return GUESS_FLOOR + (1 - GUESS_FLOOR) * latent;
  }

  /**
   * Menyembuhkan satu entri item dari state yang mungkin korup. Entri yang tidak
   * bisa diselamatkan (bukan objek) menjadi entri baru; angka rusak dinolkan/
   * di-clamp KE DALAM kontrak (|delta|<=0.6, n bilangan bulat >= 0) supaya data
   * korup tidak pernah bocor menjadi keputusan liar.
   */
  function healEntry(raw) {
    var src = (raw && typeof raw === 'object') ? raw : {};
    var n = isFiniteNumber(src.n) && src.n >= 0 ? Math.floor(src.n) : 0;
    var delta = isFiniteNumber(src.delta) ? clamp(src.delta, -SHRINKAGE, SHRINKAGE) : 0;
    var lastAt = isFiniteNumber(src.lastAt) && src.lastAt >= 0 ? src.lastAt : 0;
    return { n: n, delta: delta, lastAt: lastAt };
  }

  /**
   * State selalu {schema, items:{itemId: {n, delta, lastAt}}}. Apa pun yang
   * bukan itu (null, string, schema asing, items bukan objek) diperlakukan
   * sebagai kosong — pembaca lama/rusak tidak boleh meruntuhkan pembelajar.
   */
  function healState(state) {
    var healed = { schema: SCHEMA, items: {} };
    if (!state || typeof state !== 'object' || state.schema !== SCHEMA) return healed;
    var items = state.items;
    if (!items || typeof items !== 'object') return healed;
    for (var id in items) {
      if (Object.prototype.hasOwnProperty.call(items, id)) {
        healed.items[id] = healEntry(items[id]);
      }
    }
    return healed;
  }

  /**
   * Satu jawaban masuk: geser delta item berlawanan arah kejutan.
   *
   * evidence: {itemId, priorDifficulty, ability, ok, kappa}
   *   - kappa (0..1, default 1) MENGALIKAN langkah: bukti berkualitas rendah
   *     (tebakan, beban bahasa) boleh menggeser lebih sedikit, konsisten dengan
   *     perlakuan kappa di estimateAbility.
   * nowMs: waktu SELALU argumen — modul tidak boleh tahu jam berapa sekarang.
   *
   * Bukti yang tidak lengkap/rusak diabaikan (state disembuhkan dikembalikan):
   * lebih baik tidak belajar daripada belajar dari sampah.
   */
  function observe(state, evidence, nowMs) {
    var next = healState(state);
    if (!evidence || typeof evidence !== 'object') return next;
    var itemId = evidence.itemId;
    if (typeof itemId !== 'string' || !itemId) return next;
    if (!isFiniteNumber(evidence.priorDifficulty) || !isFiniteNumber(evidence.ability)) return next;
    if (typeof evidence.ok !== 'boolean') return next;
    var kappa = isFiniteNumber(evidence.kappa) ? clamp(evidence.kappa, 0, 1) : 1;
    var at = isFiniteNumber(nowMs) && nowMs >= 0 ? nowMs : 0;

    var entry = healEntry(next.items[itemId]);
    // p dihitung pada kesulitan EFEKTIF saat ini (prior + delta), bukan prior
    // mentah — Elo selalu mengukur kejutan terhadap taksiran terkini.
    var p = successProbability(evidence.ability, evidence.priorDifficulty + entry.delta);
    var y = evidence.ok ? 1 : 0;
    var kb = KB_ALPHA / (1 + KB_GAMMA * entry.n);
    // Tanda MINUS: murid benar melebihi dugaan (y > p) berarti item LEBIH MUDAH
    // dari taksiran -> delta turun. Kebalikan arah dari update ability.
    var delta = entry.delta - kb * kappa * (y - p);
    // CLAMP SETIAP UPDATE, bukan saat dibaca: pagar yang hanya dipasang di pintu
    // keluar membiarkan state internal kabur tak terbatas (lihat esai N=1).
    entry.delta = clamp(delta, -SHRINKAGE, SHRINKAGE);
    entry.n += 1;
    entry.lastAt = at;
    next.items[itemId] = entry;
    return next;
  }

  /**
   * Median delta kohort item yang sudah matang (n >= 8) — pusat drift bersama.
   * Drift yang dialami SEMUA item sekaligus adalah galat taksiran kemampuan
   * murid, bukan properti item; hanya deviasi relatif terhadap median ini yang
   * boleh diperlakukan sebagai sinyal tentang item (temuan C6, risiko N=1).
   * Dihitung dari state yang sudah disembuhkan; state korup -> kohort kosong.
   */
  function recenter(state) {
    var healed = healState(state);
    var deltas = [];
    for (var id in healed.items) {
      if (!Object.prototype.hasOwnProperty.call(healed.items, id)) continue;
      var entry = healed.items[id];
      if (entry.n >= MIN_N_APPLY) deltas.push(entry.delta);
    }
    deltas.sort(function (a, b) { return a - b; });
    var k = deltas.length;
    var median = 0;
    if (k > 0) {
      // Median standar: nilai tengah, atau rata-rata dua nilai tengah bila genap.
      median = (k % 2 === 1)
        ? deltas[(k - 1) / 2]
        : (deltas[k / 2 - 1] + deltas[k / 2]) / 2;
    }
    return {
      median: median,
      cohortSize: k,
      rationale: 'brain3_item_calibration_recenter'
    };
  }

  /**
   * Kesulitan yang boleh DIPAKAI seleksi soal untuk item ini.
   * Tiga gerbang berlapis, dari yang paling murah:
   *   1. n < 8            -> prior apa adanya (bukti belum cukup);
   *   2. recentering      -> delta dikurangi median kohort (drift bersama =
   *                          galat kemampuan, bukan properti item; hanya bila
   *                          kohort >= 2, lihat RECENTER_MIN_COHORT);
   *   3. dead zone        -> |delta terpusat| < DEAD_ZONE (0.3) diperlakukan nol.
   * Pemanggil tidak perlu tahu aturannya, cukup pakai field difficulty.
   */
  function effective(state, itemId, priorDifficulty) {
    var prior = isFiniteNumber(priorDifficulty) ? priorDifficulty : 0;
    var healed = healState(state);
    var entry = (typeof itemId === 'string' && itemId && healed.items[itemId])
      ? healed.items[itemId] : null;
    if (!entry || entry.n < MIN_N_APPLY) {
      return {
        difficulty: prior,
        n: entry ? entry.n : 0,
        applied: false,
        rationale: 'brain3_item_calibration_prior_only'
      };
    }
    var pusat = recenter(healed);
    var median = pusat.cohortSize >= RECENTER_MIN_COHORT ? pusat.median : 0;
    // Setelah dipusatkan, pagar shrinkage tetap berlaku: koreksi terpakai tidak
    // pernah melewati +/-0.6 dari prior, apa pun kombinasi delta dan median.
    var terpusat = clamp(entry.delta - median, -SHRINKAGE, SHRINKAGE);
    if (Math.abs(terpusat) < DEAD_ZONE) {
      return {
        difficulty: prior,
        n: entry.n,
        applied: false,
        rationale: 'brain3_item_calibration_deadzone'
      };
    }
    return {
      difficulty: prior + terpusat,
      n: entry.n,
      applied: true,
      rationale: 'brain3_item_calibration_applied'
    };
  }

  /**
   * Pangkas state: buang entri yang buktinya terlalu tipis untuk pernah
   * diterapkan (n < 3) DAN sudah tidak disentuh >= 90 hari. Entri dengan bukti
   * bermakna dipertahankan berapa pun umurnya — delta yang sudah dibayar dengan
   * >= 3 jawaban adalah pengetahuan, bukan sampah.
   */
  function compact(state, nowMs) {
    var healed = healState(state);
    var now = isFiniteNumber(nowMs) ? nowMs : 0;
    var kept = { schema: SCHEMA, items: {} };
    for (var id in healed.items) {
      if (!Object.prototype.hasOwnProperty.call(healed.items, id)) continue;
      var entry = healed.items[id];
      var idleMs = now - entry.lastAt;
      var prunable = entry.n < COMPACT_MIN_N && idleMs >= COMPACT_IDLE_DAYS * DAY_MS;
      if (!prunable) kept.items[id] = entry;
    }
    return kept;
  }

  return {
    SCHEMA: SCHEMA,
    KB_ALPHA: KB_ALPHA,
    KB_GAMMA: KB_GAMMA,
    SHRINKAGE: SHRINKAGE,
    MIN_N_APPLY: MIN_N_APPLY,
    DEAD_ZONE: DEAD_ZONE,
    RECENTER_MIN_COHORT: RECENTER_MIN_COHORT,
    COMPACT_MIN_N: COMPACT_MIN_N,
    COMPACT_IDLE_DAYS: COMPACT_IDLE_DAYS,
    DISCRIMINATION: DISCRIMINATION,
    GUESS_FLOOR: GUESS_FLOOR,
    successProbability: successProbability,
    observe: observe,
    recenter: recenter,
    effective: effective,
    compact: compact
  };
});
