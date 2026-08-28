/**
 * workers/api/ai/ai-account-budget.js — PAGAR NEURON TINGKAT AKUN.
 *
 * ==========================================================================
 * KENAPA PAGAR KEDUA, PADAHAL SUDAH ADA KUOTA PER-MURID
 * ==========================================================================
 * `quota_daily` menjawab "apakah MURID INI masih punya jatah". Ia tidak pernah
 * bisa menjawab "apakah AKUN masih punya jatah", dan yang menagih Cloudflare
 * adalah yang kedua. Jatah gratis Workers AI 10.000 neuron/hari adalah kolam
 * SATU AKUN: 250 murid x 25 permintaan x 60 neuron (`tutor_turn`) = 375.000
 * neuron, tiga puluh tujuh kali plafon. Jadi kuota per-murid yang sempurna pun
 * tetap membiarkan tagihan lewat.
 *
 * `GLOBAL_NEURON_CAP="8000"` sudah ada di `wrangler.toml` sejak fase CF dan
 * tidak pernah mengikat apa pun (lihat kepala `migrations/0005_ai_account_budget.sql`
 * untuk buktinya). Berkas ini yang membuatnya mengikat, dan sekaligus yang
 * akhirnya mengisi `neuronsUsedToday` — dep yang `pickModel()` tunggu sejak
 * awal supaya degradasi model bisa menyala.
 *
 * ==========================================================================
 * TIGA KEPUTUSAN YANG SENGAJA BERBEDA DARI KUOTA MURID
 * ==========================================================================
 * 1. DIHITUNG SEBELUM PANGGILAN, TIDAK DIKEMBALIKAN SESUDAH GAGAL.
 *    Kuota murid di-rollback ketika provider gagal — benar, murid tidak boleh
 *    dihukum atas kegagalan kami. Penghitung AKUN TIDAK di-rollback: neuron yang
 *    sudah dibelanjakan ke Workers AI tetap terbelanja walau jawabannya kosong,
 *    ditolak kontrak mutu, atau timeout sesudah model bekerja. Membatalkan
 *    hitungannya berarti berbohong ke arah yang mahal. Arah salah yang dipilih
 *    di sini adalah MENGHITUNG LEBIH BANYAK daripada kenyataan, bukan lebih
 *    sedikit.
 * 2. FAIL-CLOSED. Tanpa binding D1, tanpa tabel (`0005` belum diterapkan), atau
 *    saat D1 melempar: TOLAK. Pipa biaya yang tidak bisa diukur tidak boleh
 *    dibuka. Murid tetap mendapat jawaban deterministik, jadi harga fail-closed
 *    di sini adalah "jawaban dari materi", bukan layar kosong.
 * 3. HARINYA UTC. Jatah vendor berganti menurut UTC; reset jatah murid tetap
 *    Asia/Jakarta. Dua jam berbeda karena dua hal berbeda.
 *
 * BIAYA D1: 2 pernyataan per permintaan AI (satu INSERT idempoten + satu UPDATE
 * terjaga), dan keduanya menyentuh SATU baris per hari. Bandingkan dengan
 * latensi panggilan model (0,5-10 detik): tulis ini tidak terasa. Ia tidak
 * dipakai di jalur TTS dan tidak menyentuh permintaan yang ditolak flag,
 * breaker, atau validasi — semua penolakan itu terjadi lebih dulu.
 */

import { QUOTA_CONFIG } from '../quota/quota-config.js';

// Plafon KERAS: jatah gratis akun Workers AI. `GLOBAL_NEURON_CAP` di wrangler.toml
// hanya boleh LEBIH KECIL dari ini (lihat `accountCapNeurons()`).
const ACCOUNT_DAILY_NEURON_BUDGET = QUOTA_CONFIG.ACCOUNT_DAILY_NEURON_BUDGET;

/** Semua SQL tabel ini tinggal di satu tempat, supaya `d1-schema-contract-test.js`
 *  bisa mencocokkan kolom dan indeks yang benar-benar dipakai. */
export const ACCOUNT_SQL = Object.freeze({
  // Dibuat kalau belum ada. `DO NOTHING` supaya dua permintaan bersamaan di hari
  // baru tidak saling melempar constraint.
  ensureDay:
    'INSERT INTO ai_account_day (day, neurons, requests, touched_at) VALUES (?1, 0, 0, ?2) ' +
    'ON CONFLICT(day) DO NOTHING',
  // PENAMBAHAN TERJAGA, bukan read-then-write. Syarat plafon ada DI DALAM WHERE,
  // jadi dua permintaan bersamaan tidak bisa dua-duanya lolos di batas terakhir:
  // yang kedua tidak mendapat baris (`changes:0`) dan ditolak. Pola yang sama
  // dipakai `quota-store-d1.js`; ia sudah terbukti, jadi tidak ditemukan ulang.
  reserve:
    'UPDATE ai_account_day SET neurons = neurons + ?2, requests = requests + 1, touched_at = ?3 ' +
    'WHERE day = ?1 AND neurons + ?2 <= ?4 RETURNING neurons',
  // Hanya untuk laporan owner/gerbang. TIDAK dipakai jalur keputusan (keputusan
  // memakai `reserve` yang atomik).
  read: 'SELECT neurons, requests FROM ai_account_day WHERE day = ?1'
});

/** 'YYYY-MM-DD' UTC. Jam DISUNTIKKAN; tidak ada `Date.now()` di jalur keputusan. */
export function dayKeyUtc(ms) {
  const d = new Date(Number.isFinite(ms) ? ms : 0);
  const p = (n) => String(n).padStart(2, '0');
  return d.getUTCFullYear() + '-' + p(d.getUTCMonth() + 1) + '-' + p(d.getUTCDate());
}

/**
 * Plafon efektif. `GLOBAL_NEURON_CAP` (var deploy) DIJEPIT oleh
 * `ACCOUNT_DAILY_NEURON_BUDGET` (konstanta kode): var yang salah tulis — nol,
 * kosong, "80000" — tidak boleh bisa membuka plafon di atas jatah akun. Nilai
 * yang tidak terbaca jatuh ke konstanta kode, bukan ke tanpa-batas.
 */
export function accountCapNeurons(env) {
  const raw = Number((env && env.GLOBAL_NEURON_CAP) || NaN);
  const hard = Number(ACCOUNT_DAILY_NEURON_BUDGET);
  if (!Number.isFinite(raw) || raw <= 0) return hard;
  return Math.min(Math.floor(raw), hard);
}

/** Alasan penolakan — daftar tertutup, dieja sebagai nilai. */
export const BUDGET_REASONS = Object.freeze({
  store: 'ai_budget_store_missing',   // binding D1 absen
  unreadable: 'ai_budget_unreadable', // D1 melempar / tabel belum ada (0005 belum diterapkan)
  capReached: 'ai_account_cap'        // plafon akun hari ini sudah penuh
});

/**
 * Pesan satu permintaan sebesar `neurons` dari jatah akun hari ini.
 *
 * @param {{db:object, env:object, neurons:number, now:number}} args
 * @returns {Promise<{allowed:boolean, reason:string, usedBefore:number, cap:number}>}
 *   `usedBefore` = neuron yang sudah terpakai SEBELUM permintaan ini. Itulah nilai
 *   yang `pickModel()` butuhkan sebagai `neuronsUsedToday`.
 */
export async function reserveAccountNeurons(args) {
  const a = args || {};
  const db = a.db || null;
  const cap = accountCapNeurons(a.env);
  const want = Math.max(1, Math.ceil(Number(a.neurons) || 1));
  const at = Number(a.now) || 0;
  const day = dayKeyUtc(at);

  if (!db || typeof db.prepare !== 'function') {
    return { allowed: false, reason: BUDGET_REASONS.store, usedBefore: 0, cap: cap };
  }
  try {
    await db.prepare(ACCOUNT_SQL.ensureDay).bind(day, at).run();
    const row = await db.prepare(ACCOUNT_SQL.reserve).bind(day, want, at, cap).first();
    if (!row) {
      // Baris ada tetapi syarat plafon tidak terpenuhi = jatah akun habis.
      return { allowed: false, reason: BUDGET_REASONS.capReached, usedBefore: cap, cap: cap };
    }
    const after = Number(row.neurons) || want;
    return { allowed: true, reason: '', usedBefore: Math.max(0, after - want), cap: cap };
  } catch (_) {
    // Tabel belum ada, D1 mati, SQL ditolak: kami tidak tahu berapa yang sudah
    // dibelanjakan. Tanpa hitungan, jalur berbayar tidak dibuka.
    return { allowed: false, reason: BUDGET_REASONS.unreadable, usedBefore: 0, cap: cap };
  }
}

/** Bacaan laporan (owner/gerbang). Tidak dipakai jalur keputusan. */
export async function readAccountDay(db, now) {
  if (!db || typeof db.prepare !== 'function') return null;
  try {
    const row = await db.prepare(ACCOUNT_SQL.read).bind(dayKeyUtc(now)).first();
    if (!row) return { neurons: 0, requests: 0 };
    return { neurons: Number(row.neurons) || 0, requests: Number(row.requests) || 0 };
  } catch (_) {
    return null;
  }
}
