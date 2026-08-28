/**
 * workers/api/ai/model-call-gate.js — SATU-SATUNYA PINTU KE MODEL.
 *
 * ==========================================================================
 * KENAPA BERKAS INI ADA (S2, celah yang dilaporkan S1 §6)
 * ==========================================================================
 * Sebelum berkas ini, penegakan plafon neuron tingkat AKUN bersifat OPSIONAL
 * per pemanggil: `route-ai.js` hanya memasang pagar kalau
 * `typeof deps.accountBudget === 'function'`. Pemanggil yang lupa menyuntikkan
 * dep itu melewati plafon TANPA SATU PUN GALAT — fail-open karena kelalaian,
 * dan tidak ada gerbang yang menjaga penyambungannya. Batas per-IP (15/jam di
 * `rate-anon.js`) tidak menutup serangan dari banyak IP; plafon akun adalah
 * satu-satunya yang menahan penyerang tersebar menghabiskan 8.000 neuron/hari
 * dan mematikan AI untuk murid sungguhan. Plafon yang bisa hilang lewat satu
 * suntingan yang kelihatan tidak berbahaya bukan lapisan pertahanan.
 *
 * ==========================================================================
 * RANCANGANNYA: CHOKEPOINT FISIK, BUKAN DISIPLIN
 * ==========================================================================
 * `env.AI.run(...)` hanya dieja DI BERKAS INI, di satu fungsi, dan fungsi itu
 * MENOLAK dipanggil tanpa RESERVASI yang sah. Akibatnya:
 *
 *   - rute baru yang ingin memanggil model HARUS lewat sini, karena tidak ada
 *     tempat lain di repo yang menyentuh binding AI (di-assert secara
 *     PROGRAMATIK oleh `ai-account-cap-gate-test.js`, dengan memindai sumber —
 *     bukan dari daftar rute yang diketik tangan, karena daftar tangan basi
 *     begitu rute baru lahir, dan itu persis cara celah S1 muncul);
 *   - rute baru yang lupa memesan neuron tidak diam-diam gratis: ia MELEMPAR
 *     `model_call_unreserved` sebelum satu byte dikirim ke Workers AI. Lupa =
 *     merah, bukan murah.
 *
 * Reservasi TIDAK dibuat di sini. Ia dibuat oleh SATU tempat perakitan
 * (`route-wiring.js` -> `ai-account-budget.js` -> D1 `ai_account_day`), lalu
 * dibawa ke sini sebagai tanda terima. Berkas ini sengaja tidak tahu cara
 * menghitung jatah: kalau ia tahu, ia bisa memberi izin sendiri, dan itu
 * mengembalikan lubang yang sama satu lapis lebih dalam.
 *
 * `assertReservation()` BUKAN pertahanan terhadap penyerang (kode server bisa
 * mengarang objek apa pun). Ia pertahanan terhadap KELALAIAN: ia mengubah
 * "lupa menyambung" dari keadaan senyap menjadi keadaan yang melempar.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.FiezelModelCallGate = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  /** Cap tanda terima reservasi. Dieja di SATU tempat supaya tidak bisa menyimpang. */
  var RESERVATION_BRAND = 'fiezel-neuron-reservation-v1';

  /**
   * Tanda terima yang sah = reservasi yang benar-benar terjadi:
   *   - `allowed === true`   : plafon mengizinkan (bukan sekadar "diperiksa");
   *   - `neurons >= 1`       : ada angka yang dipesan, bukan nol simbolis;
   *   - `cap >= 1`           : plafonnya nyata (bukan "tanpa batas" yang dieja 0);
   *   - `release` fungsi     : reservasinya BISA dilepas kalau panggilan gagal.
   * Salah satu tidak terpenuhi = bukan tanda terima.
   */
  function isReservation(value) {
    if (!value || typeof value !== 'object') return false;
    if (value.brand !== RESERVATION_BRAND) return false;
    if (value.allowed !== true) return false;
    if (!Number.isFinite(Number(value.neurons)) || Number(value.neurons) < 1) return false;
    if (!Number.isFinite(Number(value.cap)) || Number(value.cap) < 1) return false;
    if (typeof value.release !== 'function') return false;
    return true;
  }

  /**
   * Satu-satunya pabrik tanda terima. Dipakai perakit nyata (`route-wiring.js`)
   * DAN gerbang uji, supaya bentuk tanda terima tidak pernah diketik dua kali di
   * dua tempat yang bisa menyimpang.
   */
  function makeReservation(args) {
    var a = args || {};
    var neurons = Math.max(1, Math.ceil(Number(a.neurons) || 1));
    var cap = Math.max(1, Math.floor(Number(a.cap) || 1));
    var release = typeof a.release === 'function' ? a.release : null;
    if (!release) throw new Error('reservation_needs_release');
    return {
      brand: RESERVATION_BRAND,
      allowed: true,
      neurons: neurons,
      cap: cap,
      usedBefore: Math.max(0, Number(a.usedBefore) || 0),
      day: String(a.day || ''),
      release: release
    };
  }

  function unreservedError(detail) {
    var e = new Error('model_call_unreserved');
    e.fiezelUnreserved = true;
    e.detail = String(detail || '');
    return e;
  }

  function assertReservation(value) {
    if (!isReservation(value)) throw unreservedError(typeof value);
    return value;
  }

  /**
   * SATU-SATUNYA pemanggil binding Workers AI di seluruh repo.
   *
   * Urutan di dalamnya bukan selera: tanda terima diperiksa SEBELUM binding
   * disentuh, jadi permintaan tanpa reservasi tidak pernah menjadi tagihan —
   * bahkan tidak menjadi permintaan.
   */
  async function runReservedModel(args) {
    var a = args || {};
    var env = a.env || {};
    assertReservation(a.reservation);
    if (!env.AI || typeof env.AI.run !== 'function') {
      var e = new Error('ai_binding_missing');
      e.fiezelBinding = true;
      throw e;
    }
    return env.AI.run(a.modelId, a.input, a.options || {});
  }

  /**
   * Lepas kembali reservasi ketika PANGGILAN MODEL GAGAL sebelum model bekerja.
   *
   * Arah salah yang dipilih, dan alasannya: timeout TIDAK dilepas (lihat
   * `releasableFailure()`), karena model yang sudah mulai bekerja tetap ditagih
   * walau kami berhenti menunggu. Melepas reservasi timeout berarti berbohong ke
   * arah yang mahal — kami akan menghitung LEBIH SEDIKIT daripada tagihan nyata,
   * dan plafon 8.000 berhenti melindungi apa pun.
   */
  async function releaseReservation(reservation, reason) {
    if (!isReservation(reservation)) return false;
    try {
      var out = reservation.release(String(reason || ''));
      if (out && typeof out.then === 'function') out = await out;
      return out !== false;
    } catch (_) {
      // Pelepasan yang gagal tidak boleh menggagalkan jawaban murid; ia juga tidak
      // boleh dilaporkan sebagai pelepasan yang berhasil.
      return false;
    }
  }

  /**
   * Apakah kegagalan ini boleh melepas reservasi.
   * TIDAK boleh: timeout/abort (model mungkin sudah jalan dan tetap ditagih),
   * dan jawaban kosong / jawaban yang ditolak kontrak mutu (model BEKERJA —
   * neuronnya sudah terbelanja walau hasilnya tidak dipakai).
   * BOLEH: panggilan yang MELEMPAR bukan karena waktu — binding hilang, ditolak
   * provider, galat jaringan sebelum model dijalankan.
   */
  function releasableFailure(error) {
    if (!error) return false;
    if (error.fiezelTimeout === true) return false;
    if (error.name === 'TimeoutError' || error.name === 'AbortError') return false;
    return true;
  }

  return Object.freeze({
    RESERVATION_BRAND: RESERVATION_BRAND,
    isReservation: isReservation,
    makeReservation: makeReservation,
    assertReservation: assertReservation,
    runReservedModel: runReservedModel,
    releaseReservation: releaseReservation,
    releasableFailure: releasableFailure
  });
}));
