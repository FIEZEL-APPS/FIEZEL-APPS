# FIEZEL Audio Lane — Prefetch Starvation Release Handoff

Tanggal: 2026-08-20 WIB
Lane: audio (neural voice), dipegang MASTER atas penyerahan OWNER
Release: `DIAG_BUILD=m025-66`, `SW_REV=m025-66-prefetch-starvation-release-20260820-1`
Base: `main@739a0b5`
Otoritas: OWNER memerintahkan MASTER memperbaiki dan mengeksekusi rilis ini.

## KENAPA DOKUMEN INI ADA

Perubahan kodenya sendiri sudah masuk `main` lewat PR #105 ("Fix audiobook neural voice prefetch starvation"). PR itu di-merge dengan **lima gate merah**: A7 (release safety), A11 (release readiness), A12 (evidence gatekeeper), A13 (handoff keeper), A14 (autonomous review). Gate-nya bekerja dengan benar; yang terjadi adalah merge dilakukan menembus gate.

Rilis ini memperbaiki akibatnya, bukan kodenya.

## PENILAIAN ATAS KODE PR #105: BENAR, DIPERTAHANKAN

Perubahannya menghapus satu penjaga di `features/neural-voice/fiezel-m0281-prebootstrap-hotfix.js`:

```js
if (pending > 0 || typeof inner.prefetch !== 'function') return Promise.resolve(false);
```

menjadi

```js
if (typeof inner.prefetch !== 'function') return Promise.resolve(false);
```

Saya verifikasi klaimnya langsung ke sumber, bukan ke prosa PR-nya. `features/neural-voice/fiezel-neural-voice.js` memang sudah menserialisasi setiap `adapter.generate` lewat satu antrean mesin, dan komentarnya sendiri menyatakan alasannya:

> m025-45: every adapter.generate goes through this queue. The engine is single-flight, so a warm request issued while a sentence is playing must WAIT for the live generation rather than race it into a busy error — and waiting is free, because playback is what fills that time.

Artinya penjaga `pending > 0` di lapisan luar bukan hanya berlebihan, tetapi merugikan: ia memblokir warm-up SELAMA seluruh durasi pemutaran, sehingga kalimat berikutnya baru mulai dirender setelah kalimat sekarang selesai. Itu persis mekanisme dead-air yang diukur `HELPER:APEX` di perangkat: jeda 2,3–3,4 detik antar kalimat yang besarnya setara durasi generate kalimat berikutnya, dibandingkan 21 ms antar chunk di dalam satu panggilan `speak()`.

Membuang kode yang benar juga sebuah kesalahan. Kode itu dipertahankan.

## APA YANG DIPERBAIKI DI RILIS INI

1. **Penanda rilis dinaikkan** ke m025-66 (`DIAG_BUILD`, `SW_REV`, `FIEZEL_PAGE_BUILD`). Tanpa ini perbaikannya bisa tidak pernah sampai ke perangkat: service worker akan terus menyajikan shell m025-65, dan pengguna tidak punya cara mengetahuinya. Produk ini sudah kehilangan tiga rilis karena ambiguitas yang sama.
2. **Handoff ini ada** — tuntutan A13 yang sebelumnya tidak dipenuhi.
3. **Jejak evidence dicatat** — tuntutan A12 — termasuk pengakuan terbuka bahwa PR #105 di-merge menembus gate.

## DAMPAK KE UJI FISIK YANG SEDANG MENUNGGU

Instrumen A/B m025-64 (Normal / WAV REF / RAW / CONDITIONED) di-deploy supaya hasil uji fisik berikutnya bisa ditafsirkan. Perubahan prefetch ini mengubah **kapan** kalimat berikutnya dirender, bukan **bagaimana** PCM diputar — jalur pemutaran tidak disentuh sama sekali.

Konsekuensi untuk penguji:

- Arm **WAV REF** tetap menjadi pembanding yang sah: ia melewati AudioContext, worklet, penjadwalan, dan fade, jadi kesimpulan "model vs pemutaran" tidak terpengaruh.
- Yang bisa berubah adalah **jeda antar kalimat** pada arm Normal. Kalau jeda itu hilang atau mengecil, itu efek m025-66, dan harus dilaporkan terpisah dari penilaian pecah/bersih.

Karena itu laporan fisik wajib menyertakan `DIAG_BUILD` yang tertera di Diagnostics. Tanpa nomor itu, hasilnya tidak bisa dipertanggungjawabkan ke build mana pun.

## YANG TIDAK DIUBAH

Tidak ada perilaku pemutaran yang diubah di rilis ini. Aturan lane audio tetap berlaku: tidak ada tambalan kualitas audio sebelum A/B fisik kembali dengan bukti.

## LANJUTAN

1. OWNER menjalankan A/B fisik pada m025-66, dengan kartu Kesehatan Instalasi sebagai langkah 0.
2. Kalau WAV REF bersih dan Normal pecah → bongkar jalur pemutaran (worklet enqueue, seam antar-chunk, fade, underrun).
3. Kalau keduanya pecah → sumber PCM, resampling perangkat, atau output OS.
4. Laporkan jeda antar kalimat secara terpisah, karena itu yang diperbaiki m025-66.
