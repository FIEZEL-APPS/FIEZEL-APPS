/* FIEZEL — konfigurasi lane telemetri pembelajaran (fiezel-learning-event-v1).
 *
 * POLA: meniru content-canary-config.js — saklar BEKU yang hanya berubah lewat
 * release train (commit + gates + MASTER + bump build), bukan lewat server.
 *
 * KENAPA default OFF: kontrak dua-lane council (BRAIN-TELEMETRY-SCHEMA.md,
 * BRAIN-DATA-PRIVACY.md) menuntut consent eksplisit + endpoint server yang
 * sudah diverifikasi idempoten SEBELUM satu event pun keluar dari perangkat.
 * Sampai kedua syarat itu terbukti, lane ini mati dan antrean tidak menulis.
 *
 * mode: 'off'    — tidak ada event dibangun, tidak ada tulisan antrean.
 *       'local'  — event dibangun + antre LOKAL saja (tidak pernah upload);
 *                  untuk verifikasi skema di perangkat nyata tanpa jaringan.
 *       'shadow' — antre + upload ke endpoint, respons diabaikan (pola
 *                  cf-shadow-mode). Baru boleh setelah endpoint live.
 *       'on'     — lane penuh. Butuh consent tercatat + endpoint live.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.FiezelTelemetryConfig = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var CONFIG = Object.freeze({
    schema: 'fiezel-telemetry-config-v1',
    enabled: false,
    mode: 'off',
    // Endpoint SENGAJA kosong: diisi lewat release saat lane server terbukti.
    endpoint: '',
    // Batas antrean disalin dari kontrak fiezel-learning-queue.js.
    queue: Object.freeze({ maxEvents: 2000, maxBytes: 2 * 1024 * 1024, maxAgeDays: 45 }),
    // Scope domain: grammar-only sesuai keputusan council (BRAIN-EVOLUTION-DECISIONS.md).
    domains: Object.freeze(['grammar'])
  });
  return Object.freeze({ CONFIG: CONFIG, SCHEMA: CONFIG.schema });
});
