/**
 * workers/api/route-config.js — `GET /api/config` (kill switch server-side).
 *
 * KENAPA ENDPOINT INI PENTING, dan bukan kemewahan:
 * `core-config.js` masuk daftar precache service worker (`sw.js` ASSETS), jadi
 * nilai flag di dalamnya BEKU di perangkat murid sampai `SW_REV` baru menyebar.
 * Kalau kill switch hanya hidup di berkas itu, "matikan AI sekarang" butuh
 * commit + bump invarian tiga titik + auto-deploy 5 menit + pembaruan SW di
 * setiap perangkat. Terlalu lambat untuk sesuatu yang menagih dompet.
 *
 * Karena itu: `core-config.js` = DEFAULT PEMASANGAN (semua `off`),
 * `GET /api/config` = KEBENARAN RUNTIME, `Cache-Control: no-store`.
 * Aturan klien (dicatat di README): kegagalan memuat /api/config berarti
 * memakai default `off` — gagal ke arah aman, bukan ke arah mahal.
 *
 * PLAN GRATIS: 1 baca KV dengan `cacheTtl` 60 s. Baca KV yang ter-cache di
 * edge tidak dihitung sebagai operasi baru selama TTL, jadi endpoint ini murah
 * walau dipanggil setiap boot. NOL tulis KV di jalur ini — batas 1.000 tulis/hari
 * hanya boleh dipakai jalur owner (`PUT /api/owner/flags`).
 */

import { PROTOCOL, CLIENT_FLAG_DEFAULTS, KILL_SWITCH_DEFAULTS } from './schema.js';
import { jsonResponse } from './errors.js';
// P3: pembaca KV + `mergeFlags` PINDAH ke `feature-gate.js` supaya endpoint yang
// MELAPORKAN flag dan jalur permintaan yang MENEGAKKANNYA membaca kunci yang sama
// lewat kode yang sama. Selama tiga paket kerja, komentar di bawah ("penegakannya
// tetap di server") adalah satu-satunya penegakan yang pernah ada — yaitu tidak
// ada. Dua pembaca terpisah adalah cara cacat itu kembali tanpa terlihat.
import { readServerFlags, mergeFlags, FLAGS_KV_CACHE_TTL_S } from './feature-gate.js';

const KV_CACHE_TTL_S = FLAGS_KV_CACHE_TTL_S;

// Re-ekspor: pemanggil lama (termasuk gerbang) mengimpor `mergeFlags` dari sini.
export { mergeFlags };

export async function routeConfig(ctx) {
  // KEBIJAKAN PELAPORAN: `ok:false` (KV mati, kunci belum ada, binding absen)
  // dipakai apa adanya = semua flag off. Endpoint ini hanya MEMBERI TAHU; yang
  // MENOLAK permintaan berbayar adalah `feature-gate.js` di jalur AI, dan di
  // sana `ok:false` berarti TOLAK (fail-closed). Dua arti berbeda untuk satu
  // bacaan, keduanya sengaja, keduanya tertulis.
  const snapshot = await readServerFlags(ctx.env, {
    clientDefaults: CLIENT_FLAG_DEFAULTS,
    killDefaults: KILL_SWITCH_DEFAULTS
  });
  const flags = snapshot.flags;
  const kill = snapshot.enabled;

  return jsonResponse(
    {
      protocol: PROTOCOL,
      // Flag klien: nama-nama ini adalah field BARU. JANGAN menimpa
      // `workerUrl` di core-config.js — `remote-push-test.js:6` mengunci field
      // itu ke regex `*.puter.work`.
      flags,
      // Kill switch tingkat server: klien boleh memakainya untuk menyembunyikan
      // tombol, tapi penegakannya tetap di server (klien tidak dipercaya).
      // PENEGAKAN NYATANYA: `feature-gate.js:aiAllowedFrom()` dipanggil
      // `route-wiring.js` untuk setiap `POST /api/ai/task`. Sebelum P3 kalimat
      // ini tidak punya kode di belakangnya.
      enabled: kill,
      // Angka yang boleh diketahui klien untuk merakit naskah UX kuota
      // (bab 12: pesan jujur + jalur alternatif), bukan untuk menegakkan kuota.
      limits: {
        aiPerDay: Number(ctx.env.AI_LIMIT_PER_DAY || 0),
        ttsCharsPerDay: Number(ctx.env.TTS_CHARS_PER_DAY || 0)
      },
      ttlSeconds: KV_CACHE_TTL_S,
      serverTime: new Date(ctx.now).toISOString()
    },
    {
      headers: {
        ...ctx.corsHeaders,
        // Eksplisit walau `jsonResponse` sudah memasang no-store: berkas inilah
        // alasan aturan itu ada, jadi ia ditulis di tempat yang terbaca.
        'cache-control': 'no-store'
      }
    }
  );
}
