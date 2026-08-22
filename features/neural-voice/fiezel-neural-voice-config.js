/**
 * m025-100 konfigurasi suara, setelah mesin lokal dihapus.
 *
 * Berkas ini dulu memuat seluruh perjanjian mesin di perangkat: jalur vendor, versi
 * runtime ONNX, dtype, kebijakan nol-biaya, dan batas potongan. Semua itu hilang bersama
 * modelnya - suara kini dirender di server dan tidak ada satu bita pun yang diunduh.
 *
 * Yang tersisa hanyalah bagian yang masih benar-benar dibaca: katalog suara, yang dipakai
 * app.js untuk menamai suara dan diagnostik untuk melaporkannya. Menyimpan sisanya berarti
 * memelihara dokumen yang menjanjikan perilaku yang sudah tidak ada - persis bahan bakar
 * kesalahpahaman yang membuat kartu pengaturan sempat menjual unduhan 119 MB yang tidak
 * pernah lagi terjadi.
 *
 * Kalau mesin lokal suatu saat dikembalikan, VOICE-RECOVERY.md menjelaskan cara memulihkan
 * berkas ini beserta lapisannya dari riwayat git.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.FiezelNeuralVoiceConfig = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const config = Object.freeze({
    schema: 'fiezel-neural-voice-v3',
    provider: 'puter-txt2speech',
    engine: 'generative',
    lang: 'en-US',
    requiresDownload: false,
    voices: Object.freeze({
      fiezelPrimary: 'default',
      catalog: Object.freeze([
        Object.freeze({ id: 'default', label: 'FIEZEL', locale: 'en-US' })
      ])
    }),
    // Cadangan terakhir saat jaringan hilang. Suaranya kalah jauh, tetapi bacaan yang
    // dibuka tanpa sinyal akan diam sepenuhnya tanpa ini.
    fallback: Object.freeze({
      browserSpeechSynthesis: true,
      reason: 'Dipakai hanya bila render server tidak dapat dicapai.'
    })
  });

  return config;
});
