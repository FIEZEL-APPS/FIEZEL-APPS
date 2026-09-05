/**
 * workers/api/route-health.js — `GET /health`.
 *
 * BERKAS INI TIDAK BOLEH DIANGGAP KOSMETIK. Tiga jalur frontend melempar
 * `*_protocol_mismatch` kalau `protocol !== '1.7'`:
 *   - app.js:2038  (probe kesehatan Worker)
 *   - app.js:1589  (`policy_protocol_mismatch`)
 *   - app.js:5276  (`coach_protocol_mismatch`)
 * Artinya: satu typo di sini mematikan pembimbing adaptif dan coach di produksi,
 * bukan sekadar membuat halaman status jelek. Menaikkan ke '1.8' adalah
 * perubahan breaking yang wajib serentak dengan bump FIEZEL_PAGE_BUILD oleh
 * MASTER — bukan oleh berkas ini.
 *
 * PLAN GRATIS: nol baca D1, nol baca KV, nol tulis. `/health` dipanggil setiap
 * boot aplikasi; menaruh satu baca KV di sini berarti satu baca KV per boot
 * murid, dan itu anggaran yang lebih baik dipakai `/api/config`.
 */

import { PROTOCOL, CAPABILITIES } from './schema.js';
import { edgeGuardStatus, edgeGuardPath } from './mw-edge.js';
import { jsonResponse } from './errors.js';

export function routeHealth(ctx) {
  return jsonResponse(
    {
      status: 'ok',
      service: ctx.env.SERVICE_NAME || 'fiezel-api',
      protocol: PROTOCOL,
      version: ctx.env.API_VERSION || 'cf-api-1',
      aiGateway: ctx.env.AI_GATEWAY_MODE || 'core-only',
      capabilities: CAPABILITIES.slice(),
      plan: 'free-tier',
      // `on` = alamat `*.workers.dev` tertutup untuk pemanggil yang tidak lewat
      // jembatan `api.fiezel.my.id`. `off` = secret `EDGE_SHARED_SECRET` belum
      // dipasang dan alamat itu MASIH TERBUKA; itu keadaan transisi, bukan
      // konfigurasi yang sah untuk dibiarkan. Lihat `mw-edge.js`.
      // Aman diumumkan di sini justru karena `/health` sendiri ikut dilindungi
      // gerbang: pembacanya sudah lewat jembatan.
      edgeGuard: edgeGuardStatus(ctx.env),
      // JALUR yang benar-benar dipakai permintaan ini untuk lolos gerbang edge:
      //   'custom-domain' = tiba di hostname tepercaya (`api.fiezel.my.id`)
      //                     TANPA header — jalur UTAMA sesudah zona Cloudflare
      //                     aktif dan custom domain menggantikan jembatan PHP;
      //   'header'        = tiba lewat proxy PHP dengan `X-Fiezel-Edge` sah —
      //                     jalur CADANGAN selama cache DNS lama masih ada;
      //   'off'           = mode transisi eksplisit (tidak ada penegakan).
      // Dipisah dari `edgeGuard` dengan sengaja: `edgeGuard` adalah kontrak
      // on/off yang sudah dibaca `tools/fiezel-health-probe.mjs` dan
      // `tests/staging-live-test.js`, sedangkan field ini menjawab pertanyaan yang
      // berbeda — "lewat mana permintaan ini masuk" — supaya keadaan nyata
      // terbaca dan pembongkaran jembatan tidak perlu ditebak. Aman diumumkan
      // di sini karena `/health` sendiri ikut dilindungi gerbang.
      edgeGuardPath: edgeGuardPath(ctx),
      // Waktu SERVER. Klien tidak boleh menghitung reset kuota dari jamnya
      // sendiri (cf-b2 §5): itu yang membuat cooldown 24 jam hari ini bisa
      // dihapus hanya dengan membersihkan localStorage.
      time: new Date(ctx.now).toISOString()
    },
    { headers: ctx.corsHeaders }
  );
}

/**
 * `GET /healthz` — probe monitor eksternal, SATU-SATUNYA rute yang boleh diakses
 * tanpa header jembatan `X-Fiezel-Edge` (`mw-edge.EDGE_FREE_PATHS`).
 *
 * KENAPA RUTE KEDUA, BUKAN MEMBEBASKAN `/health`:
 * `/health` mengumumkan `capabilities`, `aiGateway`, `version`, `service`,
 * `plan`, `edgeGuard`, dan waktu server. Untuk monitor, semua itu tidak
 * berguna; untuk penyerang, `capabilities` adalah peta fitur mana yang hidup
 * tanpa perlu menebak. Membebaskan `/health` = membocorkan peta itu ke publik
 * selamanya, sedangkan yang dibutuhkan monitor hanya satu bit hidup/mati.
 *
 * Yang BOLEH ada di sini, dan tidak lebih:
 *   - `ok` — satu bit yang dicari monitor.
 *   - `protocol` — monitor yang berguna harus bisa melihat protokol yang salah,
 *     dan '1.7' sudah publik di klien (app.js), jadi bukan kebocoran baru.
 * Yang DILARANG ditambahkan ke sini, sekarang atau nanti: `capabilities`, nama
 *   layanan, versi, mode gateway, status `edgeGuard`, waktu server, angka kuota,
 *   atau apa pun yang berubah menurut konfigurasi. `tests/edge-guard-test.js` butir (f)
 *   memindai badan respons ini dan akan MERAH kalau ada yang menyelinap.
 *
 * Nol baca D1, nol baca KV, nol tulis — rute ini dipanggil monitor setiap menit,
 * selamanya.
 */
export function routeHealthz(ctx) {
  return jsonResponse({ ok: true, protocol: PROTOCOL }, { headers: ctx.corsHeaders });
}
