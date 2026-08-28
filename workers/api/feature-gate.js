/**
 * workers/api/feature-gate.js — SATU tempat membaca flag runtime, DUA kebijakan
 * memakainya.
 *
 * ==========================================================================
 * CACAT YANG BERKAS INI TUTUP (terukur hidup, 28 Agu 2026)
 * ==========================================================================
 * `cfAiEnabled` ada di `schema.js` (CLIENT_FLAG_DEFAULTS) dan dikirim ke klien
 * oleh `route-config.js`. Itu SATU-SATUNYA hal yang pernah dilakukannya. NOL
 * referensi di jalur permintaan: `grep -n cfAiEnabled workers/api/index.js
 * workers/api/route-wiring.js` tidak menghasilkan apa pun. Komentar di
 * `route-config.js` menulis "penegakannya tetap di server (klien tidak
 * dipercaya)" — dan itu tidak benar sampai berkas ini ada.
 *
 * Konsekuensi biayanya bukan teoretis: `POST /api/auth/anon` menerbitkan sesi
 * TANPA syarat apa pun, jadi siapa pun di internet bisa menerbitkan sesi lalu
 * memanggil `POST /api/ai/task` dan membelanjakan neuron akun owner. Kuota
 * per-pengguna (25/hari) tidak menolong: penyerang menerbitkan 100 sesi anon
 * dan mendapat 2.500 panggilan. Flag yang hanya DILAPORKAN adalah pintu yang
 * gambarnya bertuliskan "terkunci".
 *
 * ==========================================================================
 * KENAPA DUA KEBIJAKAN ATAS SATU BACAAN
 * ==========================================================================
 * `readServerFlags()` mengembalikan `{ ok, reason, flags, enabled }`. `ok:false`
 * berarti "kami TIDAK TAHU isi flag" (binding KV absen, KV melempar, nilainya
 * bukan objek).
 *
 *   `GET /api/config` (pelaporan)  -> `ok:false` dipakai apa adanya: balas
 *       default (semua off). Ia hanya MEMBERI TAHU klien; menjawab 503 di sana
 *       akan membuat klien tidak tahu apa pun dan mengulang tanpa henti.
 *   `POST /api/ai/task` (penegakan) -> `ok:false` = TOLAK. Fail-closed.
 *       Membuka jalur berbayar karena pembacaan flag gagal adalah gagal ke arah
 *       mahal, dan itu justru kelas cacat yang sedang ditutup.
 *
 * Keduanya membaca kunci KV yang SAMA lewat fungsi yang SAMA. Itu bukan
 * kerapian: begitu pelaporan dan penegakan punya dua pembaca, mereka akan
 * berbeda, dan yang dilihat owner di `/api/config` bukan lagi yang berlaku di
 * server.
 *
 * ==========================================================================
 * TIGA SAKELAR HARUS SEPAKAT (AND, bukan OR)
 * ==========================================================================
 *   1. `env.FEATURE_AI === 'on'`  — sakelar waktu-deploy di `wrangler.toml`.
 *      Butuh `wrangler deploy`; ini yang paling lambat dan paling sulit
 *      dinyalakan karena kecelakaan.
 *   2. KV `cfg:flags`.`enabled.ai === true` — kill switch server. Bisa
 *      dimatikan owner dalam detik tanpa deploy (itu sebabnya endpoint config
 *      ada, lihat kepala `route-config.js`).
 *   3. KV `cfg:flags`.`flags.cfAiEnabled === true` — flag yang DILAPORKAN ke
 *      klien. Ia masuk syarat supaya "yang dilihat murid" dan "yang diizinkan
 *      server" tidak pernah berbeda arah: kalau klien diberi tahu AI mati,
 *      server juga wajib menolaknya, termasuk untuk klien yang tidak mematuhi
 *      flag itu (yaitu penyerang).
 *
 * AND, bukan OR: satu sakelar mati = tolak. Tidak ada urutan "yang menang".
 *
 * BIAYA: satu baca KV per permintaan AI, dengan `cacheTtl: 60` — baca yang
 * ter-cache di edge tidak dihitung operasi baru selama TTL, jadi ini tetap
 * hemat di PLAN GRATIS (batas tulis 1.000/hari tidak tersentuh: NOL tulis di
 * jalur ini). Bandingkan dengan biaya yang dicegahnya: satu permintaan
 * `tutor_turn` = 60 neuron.
 */

import { CLIENT_FLAG_DEFAULTS, KILL_SWITCH_DEFAULTS } from './schema.js';

export const FLAGS_KV_KEY = 'cfg:flags';
export const FLAGS_KV_CACHE_TTL_S = 60;

/** Alasan penolakan — daftar TERTUTUP, dieja sebagai nilai supaya bisa di-assert dan dicatat. */
export const GATE_REASONS = Object.freeze({
  featureVarOff: 'ai_feature_var_off',   // FEATURE_AI != 'on' di wrangler.toml
  flagsUnreadable: 'ai_flags_unreadable', // binding KV absen / KV melempar / nilai bukan objek
  killSwitch: 'ai_kill_switch',           // enabled.ai = false
  flagOff: 'ai_flag_off'                  // flags.cfAiEnabled = false
});

/**
 * Gabung nilai dari KV ke default. Hanya kunci yang SUDAH dikenal yang dipakai,
 * dan hanya bertipe boolean: satu nilai sampah di KV tidak boleh bisa
 * menyuntikkan flag baru yang tidak pernah didesain klien.
 *
 * (Fungsi ini pindah dari `route-config.js` ke sini bersama pembaca KV-nya.
 * `route-config.js` mengimpornya kembali dan mengekspornya ulang supaya
 * pemanggil lama — termasuk gerbang — tidak berubah.)
 */
export function mergeFlags(defaults, override) {
  const out = {};
  for (const [key, value] of Object.entries(defaults)) {
    const candidate = override && typeof override === 'object' ? override[key] : undefined;
    out[key] = typeof candidate === 'boolean' ? candidate : value;
  }
  return out;
}

/**
 * Baca flag runtime dari KV. TIDAK pernah melempar: pemanggil memutuskan arti
 * `ok:false` menurut kebijakannya masing-masing (lihat kepala berkas).
 *
 * @param {object} env
 * @param {{clientDefaults:object, killDefaults:object}} defaults
 * @returns {Promise<{ok:boolean, reason:string, flags:object, enabled:object}>}
 */
export async function readServerFlags(env, defaults) {
  const clientDefaults = (defaults && defaults.clientDefaults) || CLIENT_FLAG_DEFAULTS;
  const killDefaults = (defaults && defaults.killDefaults) || KILL_SWITCH_DEFAULTS;
  const empty = {
    flags: mergeFlags(clientDefaults, null),
    enabled: mergeFlags(killDefaults, null)
  };

  const kv = env && env.CFG;
  if (!kv || typeof kv.get !== 'function') {
    return { ok: false, reason: 'kv_binding_missing', flags: empty.flags, enabled: empty.enabled };
  }
  let stored = null;
  try {
    stored = await kv.get(FLAGS_KV_KEY, { type: 'json', cacheTtl: FLAGS_KV_CACHE_TTL_S });
  } catch {
    // KV gagal = kami tidak tahu isi flag. Pelaporan memakai default (off);
    // penegakan menolak. Yang dilarang di KEDUA jalur: menyalakan fitur karena
    // pembacaannya gagal.
    return { ok: false, reason: 'kv_error', flags: empty.flags, enabled: empty.enabled };
  }
  if (stored === null || typeof stored !== 'object') {
    // Kunci belum pernah ditulis owner. Untuk pelaporan itu berarti "semua off"
    // (benar). Untuk penegakan itu berarti "belum ada izin tertulis" — dan
    // tanpa izin tertulis, jawabannya bukan.
    return { ok: false, reason: 'kv_key_absent', flags: empty.flags, enabled: empty.enabled };
  }
  return {
    ok: true,
    reason: '',
    flags: mergeFlags(clientDefaults, stored.flags),
    enabled: mergeFlags(killDefaults, stored.enabled)
  };
}

/**
 * Kebijakan PENEGAKAN untuk jalur AI berbayar. Sinkron, murni, bisa diuji tanpa
 * KV: bagian yang mahal (baca KV) sudah selesai di `readServerFlags`.
 *
 * @param {object} env
 * @param {{ok:boolean, flags:object, enabled:object}} snapshot
 * @returns {{allowed:boolean, reason:string}}
 */
export function aiAllowedFrom(env, snapshot) {
  if (String((env && env.FEATURE_AI) || '') !== 'on') {
    return { allowed: false, reason: GATE_REASONS.featureVarOff };
  }
  if (!snapshot || snapshot.ok !== true) {
    return { allowed: false, reason: GATE_REASONS.flagsUnreadable };
  }
  if (snapshot.enabled.ai !== true) return { allowed: false, reason: GATE_REASONS.killSwitch };
  if (snapshot.flags.cfAiEnabled !== true) return { allowed: false, reason: GATE_REASONS.flagOff };
  return { allowed: true, reason: '' };
}

/**
 * Satu panggilan untuk jalur permintaan: baca + putuskan. Dipakai
 * `route-wiring.js` sebelum body permintaan dibaca — penolakan flag harus
 * SEMURAH mungkin, karena ia bagian dari pertahanan biaya.
 *
 * @returns {Promise<{allowed:boolean, reason:string, flagsOk:boolean}>}
 */
export async function checkAiEnabled(env) {
  const snapshot = await readServerFlags(env);
  const verdict = aiAllowedFrom(env, snapshot);
  return { allowed: verdict.allowed, reason: verdict.reason, flagsOk: snapshot.ok === true };
}
