/**
 * m025-121 konfigurasi suara: satu jalur server, satu jalur perangkat.
 *
 * SEJARAH SINGKAT, karena berkas ini sudah dua kali ditulis ulang. Sampai m025-100 isinya
 * seluruh perjanjian mesin di perangkat. m025-100 menghapus mesin itu dan menyisakan
 * kontrak Puter saja - alasannya benar waktu itu: murid dipaksa mengunduh ratusan megabita
 * sebelum aplikasi bisa bicara, dan kartu pengaturan menjual unduhan yang tidak pernah
 * terjadi.
 *
 * m025-121 mengembalikan mesin perangkat, tetapi dengan peran yang BERBEDA dan itulah
 * kenapa keberatan lama tidak berlaku lagi:
 *
 *   - Puter tetap suara utama. Tidak ada satu murid pun yang menunggu unduhan sebelum
 *     mendengar kalimat pertama. Kartu pengaturan tidak menjual apa pun.
 *   - Mesin perangkat adalah CADANGAN, diunduh diam-diam di latar setelah murid login,
 *     dan baru terdengar pada hari jatah Puter habis. Sebelum hari itu ia tidak pernah
 *     menampakkan diri.
 *
 * Mesinnya supertonic-3, bukan kokoro. Ini keputusan keselamatan, bukan selera: catatan
 * m025-26 di bootstrap mencatat kokoro MEMBUNUH content process iOS karena panggilan WASM
 * panjangnya berjalan di main thread. supertonic-3 menjalankan seluruh model di dalam
 * Worker tersendiri. Murid FIEZEL memakai iPhone (PWA dari Safari), jadi jalur yang
 * pernah membunuh prosesnya tidak boleh dihidupkan kembali sebagai cadangan.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.FiezelNeuralVoiceConfig = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const config = Object.freeze({
    schema: 'fiezel-neural-voice-v4',

    /* ---- jalur utama: render di server, nol unduhan ---- */
    provider: 'puter-txt2speech',
    engine: 'generative',
    lang: 'en-US',
    requiresDownload: false,

    /* ---- jalur cadangan: mesin di perangkat ---- */
    // requiresDownload di atas tetap false dan itu disengaja: unduhan cadangan tidak
    // pernah menghalangi murid bicara, jadi tidak ada satu pun layar yang boleh
    // membacanya sebagai syarat.
    local: Object.freeze({
      enabled: true,
      role: 'fallback',
      engineId: 'supertonic-3-int8-2026-05-11',
      basePath: './vendor/supertonic-3/',
      // Alasan mesin ini, bukan kokoro. Lihat catatan kepala berkas.
      chosenBecause: 'model berjalan di Worker; kokoro menjalankan WASM panjang di main thread dan membunuh content process iOS'
    }),

    modelId: 'supertonic-3',
    dtype: 'int8',
    device: 'wasm',

    voices: Object.freeze({
      fiezelPrimary: 'default',
      catalog: Object.freeze([
        Object.freeze({ id: 'default', label: 'FIEZEL', locale: 'en-US' })
      ])
    }),

    limits: Object.freeze({
      maxInputChars: 3600,
      targetChunkWords: 140,
      hardChunkWords: 190,
      maxQueueItems: 12
    }),

    // m025-48 delivery settings. Satu tempat, karena bootstrap dan shim membangun mesin
    // terpisah di atas model yang sama dan setiap selisih langsung terdengar sebagai dua
    // suara berbeda.
    speech: Object.freeze({
      streamSentences: true,
      streamMaxWords: 26,
      silenceScale: 0.4
    }),

    fallback: Object.freeze({
      browserSpeechSynthesis: true,
      reason: 'Cadangan terakhir bila render server dan mesin perangkat sama-sama tidak tersedia.'
    })
  });

  return config;
});
