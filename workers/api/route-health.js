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
      // Waktu SERVER. Klien tidak boleh menghitung reset kuota dari jamnya
      // sendiri (cf-b2 §5): itu yang membuat cooldown 24 jam hari ini bisa
      // dihapus hanya dengan membersihkan localStorage.
      time: new Date(ctx.now).toISOString()
    },
    { headers: ctx.corsHeaders }
  );
}
