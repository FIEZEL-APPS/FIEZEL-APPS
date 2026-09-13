/**
 * workers/api/ai/neuron-reservation.js — SATU-SATUNYA PERAKIT TANDA TERIMA RESERVASI.
 *
 * ==========================================================================
 * KENAPA BERKAS INI ADA
 * ==========================================================================
 * `ai/model-call-gate.js` menulis larangannya dengan tegas: "Reservasi TIDAK dibuat di
 * sini. Ia dibuat oleh SATU tempat perakitan", karena perakit yang tahu cara menghitung
 * jatah bisa memberi izin kepada dirinya sendiri, dan itu mengembalikan lubang fail-open
 * satu lapis lebih dalam.
 *
 * Larangan itu sempat dilanggar tanpa ada yang menyadarinya. Dua berkas merakit tanda
 * terima sendiri-sendiri:
 *
 *     route-wiring.js  accountBudgetBridge()  quotaDb + reserve + makeReservation
 *     route-legacy.js  runLegacyModel()       binding pick + reserve + makeReservation
 *
 * dan `route-legacy.js` bahkan MENYALIN resolver `umd()` dari `route-wiring.js` untuk
 * mendapatkan chokepoint-nya. Dua salinan bukan cuma kembar yang rapi: keduanya bebas
 * menyimpang. Satu sisi memperbaiki nama binding, arah pembulatan, atau keputusan
 * fail-closed; sisi lain tidak ikut. Yang menyimpang diam-diam adalah jalur biaya, dan
 * plafon 10.000 neuron/hari itu ditanggung bersama SELURUH murid.
 *
 * Jadi perakitannya dipindah ke sini, dan kedua pemanggil memakai yang ini. Berkas ini
 * TIDAK boleh tumbuh menjadi tempat keputusan kebijakan: ia hanya merakit: ambil binding,
 * panggil buku anggaran, cetak tanda terima lewat chokepoint. Berapa neuron yang dipesan
 * tetap keputusan pemanggil (`accountNeuronsFor()` di route-wiring, `LEGACY_MODEL_NEURONS`
 * di route-legacy), karena itu memang berbeda per jalur.
 */

import { reserveAccountNeurons, releaseAccountNeurons } from './ai-account-budget.js';
import * as modelGateNs from './model-call-gate.js';

/**
 * Resolver UMD. Dulu diketik dua kali (route-wiring.js dan salinannya di route-legacy.js);
 * sekarang sekali, di sini. `model-call-gate.js` bisa hadir sebagai `default` saat esbuild
 * mem-bundle-nya sebagai CJS, atau hanya di `globalThis` saat dijalankan sebagai ESM murni.
 */
function umd(ns, globalName) {
  const g = typeof globalThis !== 'undefined' ? globalThis : {};
  if (ns && ns.default && typeof ns.default === 'object') return ns.default;
  if (g[globalName]) return g[globalName];
  return ns || null;
}
const ModelCallGate = umd(modelGateNs, 'FiezelModelCallGate');

/**
 * Binding buku anggaran. `CORE_DB` di wrangler.toml, `DB` di harness uji - keduanya
 * diterima. Dieja DI SINI saja supaya kedua jalur tidak bisa memilih binding berbeda.
 */
export function budgetDb(env) {
  return (env && (env.CORE_DB || env.DB)) || null;
}

/**
 * Pesan neuron dan cetak tanda terimanya.
 *
 * Mengembalikan TANDA TERIMA sah (lihat `ModelCallGate.isReservation`) kalau plafon
 * mengizinkan, atau objek penolakan `{ allowed:false, reason, usedBefore }` kalau tidak.
 * Penolakan TIDAK dilempar di sini: pemanggil yang tahu cara menjawab penolakan -
 * jembatan kuota mengembalikannya sebagai amplop, rute warisan melemparnya ke cabang
 * cadangannya sendiri.
 */
export async function reserveNeurons(args) {
  const a = args || {};
  const env = a.env || {};
  const db = budgetDb(env);
  const neurons = Math.max(1, Math.ceil(Number(a.neurons) || 1));
  const now = Number(a.now) || Date.now();

  const out = await reserveAccountNeurons({ db, env, neurons, now });
  if (!out || out.allowed !== true) {
    return out || { allowed: false, reason: 'ai_budget_unreadable', usedBefore: 0 };
  }
  return ModelCallGate.makeReservation({
    neurons,
    cap: out.cap,
    usedBefore: out.usedBefore,
    release: () => releaseAccountNeurons({ db, env, neurons, now })
  });
}

/**
 * Siklus penuh: pesan -> lewat chokepoint -> lepas reservasi kalau panggilannya gagal
 * sebelum model bekerja.
 *
 * Urutan tiga langkah itu yang paling gampang salah kalau disalin: melepas reservasi pada
 * timeout (padahal model sudah ditagih) atau lupa melepas sama sekali. Arahnya diputuskan
 * `ModelCallGate.releasableFailure()`, bukan pemanggil.
 *
 * MELEMPAR pada penolakan plafon, dengan penanda `fiezelBudgetDenied` supaya pemanggil
 * bisa memilahnya dari galat penyedia tanpa mencocokkan teks pesan.
 */
export async function runMeteredModel(args) {
  const a = args || {};
  const env = a.env || {};
  const reservation = await reserveNeurons({ env, neurons: a.neurons, now: a.now });

  if (!ModelCallGate.isReservation(reservation)) {
    const err = new Error('ai_account_cap:' + String((reservation && reservation.reason) || 'unreadable'));
    err.fiezelBudgetDenied = true;
    throw err;
  }

  try {
    return await ModelCallGate.runReservedModel({
      env, modelId: a.modelId, input: a.input, options: a.options || {}, reservation
    });
  } catch (err) {
    if (ModelCallGate.releasableFailure(err)) {
      await ModelCallGate.releaseReservation(reservation, String((err && err.message) || 'provider_failed'));
    }
    throw err;
  }
}
