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

const KV_KEY = 'cfg:flags';
const KV_CACHE_TTL_S = 60;

/**
 * Gabung nilai dari KV ke default. Hanya kunci yang SUDAH dikenal yang dipakai,
 * dan hanya bertipe boolean: satu nilai sampah di KV tidak boleh bisa
 * menyuntikkan flag baru yang tidak pernah didesain klien.
 */
export function mergeFlags(defaults, override) {
  const out = {};
  for (const [key, value] of Object.entries(defaults)) {
    const candidate = override && typeof override === 'object' ? override[key] : undefined;
    out[key] = typeof candidate === 'boolean' ? candidate : value;
  }
  return out;
}

export async function routeConfig(ctx) {
  let stored = null;
  if (ctx.env.CFG) {
    try {
      stored = await ctx.env.CFG.get(KV_KEY, { type: 'json', cacheTtl: KV_CACHE_TTL_S });
    } catch {
      // KV gagal = pakai default (semua off). Diam-diam menyalakan fitur karena
      // KV error adalah kegagalan ke arah mahal; dilarang.
      stored = null;
    }
  }
  const flags = mergeFlags(CLIENT_FLAG_DEFAULTS, stored && stored.flags);
  const kill = mergeFlags(KILL_SWITCH_DEFAULTS, stored && stored.enabled);

  return jsonResponse(
    {
      protocol: PROTOCOL,
      // Flag klien: nama-nama ini adalah field BARU. JANGAN menimpa
      // `workerUrl` di core-config.js — `remote-push-test.js:6` mengunci field
      // itu ke regex `*.puter.work`.
      flags,
      // Kill switch tingkat server: klien boleh memakainya untuk menyembunyikan
      // tombol, tapi penegakannya tetap di server (klien tidak dipercaya).
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
