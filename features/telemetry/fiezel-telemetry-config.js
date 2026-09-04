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
    domains: Object.freeze(['grammar']),
    /* Lane KETIGA: bukti belajar Braincore (fiezel-braincore-evidence-v1).
     * Saklarnya SENDIRI, bukan menumpang `mode` di atas, karena lane ini
     * membawa pengenal (cohort acak berotasi) yang tidak dibawa lane learning —
     * menyalakan dua lane dengan satu saklar berarti orang yang menyalakan lane
     * learning tidak sadar ia juga menyalakan pengenal.
     *
     * mode: 'off'    - tidak ada event dibangun, tidak ada tulisan antrean;
     *       'local'  - dibangun + antre LOKAL saja (verifikasi skema di
     *                  perangkat nyata tanpa jaringan);
     *       'on'     - antre + upload ke `endpoint`.
     * Default 'off' dan endpoint KOSONG: lane ini baru boleh menyala setelah
     * migrasi 0008_evidence.sql diterapkan dan EVIDENCE_ENABLED dinyalakan. */
    evidence: Object.freeze({
      schema: 'fiezel-braincore-evidence-v1',
      mode: 'on',
      endpoint: 'https://api.fiezel.my.id/api/braincore/evidence',
      // Interval minimum antar-emisi snapshot: SEKALI SEHARI. Lebih sering
      // tidak menambah informasi (bucketnya kasar) tapi menambah permukaan
      // korelasi hari-ke-hari untuk cohort yang sama.
      minIntervalMs: 86400000
    }),
    /* Lane KEEMPAT: bukti belajar PER-MURID (`fiezel-braincore-learner-evidence-v1`).
     *
     * SAKELARNYA SENDIRI LAGI, dan kali ini jaraknya dari lane di atas paling
     * jauh: lane `evidence` membawa pengenal ACAK yang dipurge 14 hari; lane ini
     * membawa identitas AKUN yang diturunkan SERVER dari cookie fz_id dan
     * disimpan 180 hari. Menyalakan satu tidak boleh pernah menyalakan yang lain.
     *
     * TIGA SYARAT, bukan satu:
     *   1. `mode: 'on'` di sini (rilis);
     *   2. gerbang server (FEATURE_LEARNER_EVIDENCE + KV cfg:flags, fail-closed);
     *   3. PERSETUJUAN murid di Pengaturan (preferences.learnerEvidenceConsent),
     *      yang dikirim ke `consentEndpoint` dan disimpan server per-`sub`.
     * Tanpa (3), lane yang menyala pun menulis NOL baris — dan klien tidak
     * mengantre apa pun sejak awal.
     *
     * Default 'off' + endpoint terisi: endpoint boleh diketahui klien sebelum
     * lane dinyalakan, karena tanpa mode 'on' tidak ada yang pernah memanggilnya. */
    identityEvidence: Object.freeze({
      schema: 'fiezel-braincore-learner-evidence-v1',
      mode: 'on',
      endpoint: 'https://api.fiezel.my.id/api/braincore/learner-evidence',
      consentEndpoint: 'https://api.fiezel.my.id/api/braincore/learner-evidence/consent',
      anonEndpoint: 'https://api.fiezel.my.id/api/auth/anon',
      // Nama panggilan dari perkenalan. Endpoint-nya hidup di blok yang SAMA
      // dengan lane ini, dan itu disengaja: nama adalah identitas TAMPILAN yang
      // membuat lane ini berguna bagi owner, jadi keduanya menyala dan mati
      // bersama. Sebelum lane ini 'on', nama murid tidak pernah meninggalkan
      // perangkat sama sekali.
      nameEndpoint: 'https://api.fiezel.my.id/api/learner/name',
      // Sama dengan lane agregat: sekali sehari sudah memuat seluruh informasi
      // yang bucket sekasar ini bisa bawa.
      minIntervalMs: 86400000
    })
  });
  return Object.freeze({ CONFIG: CONFIG, SCHEMA: CONFIG.schema });
});
