# FIEZEL m025-182 — Splash SFX Zero-Gesture-First — HANDOFF

Tanggal: 2026-08-28 (WIB) · Build: m025-182 · Branch: `fix/splash-sfx-zero-gesture` · PR: #236

## STATUS

SELESAI DI SISI MESIN, MENUNGGU VERIFIKASI FISIK PASCA-DEPLOY. Seluruh gate lokal hijau
(splash-first-paint 31 ok termasuk 7 test zero-gesture baru, splash-choreography,
boot-order, onboarding, pwa-cache, audio-asset-pipeline, ui-structure, paw-mascot,
regression, install-health, pwa-release-coherence, classroom 20/20). Branch sudah
memuat merge `origin/main` m025-181 (PAW Character System) dan bump build resmi
lewat `tools/bump-build.mjs` ke m025-182 (SW_REV, FIEZEL_PAGE_BUILD, DIAG_BUILD,
BUILD-VERSION.json — keempatnya selaras, `--check` PASS).

## OTORITAS

OWNER (pilnarefa@gmail.com) memerintahkan secara eksplisit pada sesi Perplexity
Computer 2026-08-28 ±19:21 WIB: lanjutkan sampai selesai — commit, push, merge, dan
deploy agar perubahan langsung dirasakan pengguna. Atas perintah itu, penanda
`FIEZEL_PHYSICAL_ACCEPTANCE: WAIVED_BY_OWNER` dan `FIEZEL_OWNER_RELEASE: AUTHORIZED`
dicantumkan di badan PR #236. Waiver dipilih (bukan ACCEPTED) karena uji fisik di
perangkat BELUM dilakukan — tidak ada klaim palsu; uji fisiknya menjadi langkah
pasca-deploy di bawah.

## APA YANG BERUBAH DAN KENAPA

Akar masalah (audit 4-model 2026-08-28): `splash_intro` tidak pernah diminta ke mesin
audio di boot nyata. Ketukan t=0 selalu dibuang penjaga basi `SKIP_STALE_MS=120`
karena jam koreografi mulai pada `startOffset ≈ waktu boot` (load() mengunduh ~2,7 MB
JSON dulu), dan jalur cadangan disyaratkan `!motion` yang false di semua peramban.
Bunyi "setelah dua ketukan" yang selama ini terdengar adalah `paw_greet` dari cap PAW,
bukan `splash_intro`. Bahkan PWA terpasang Android — yang DIIZINKAN autoplay bersuara
oleh Chrome — tetap senyap.

Perbaikan (aditif):
- `features/audio/fiezel-ui-sfx.js`: `prepare()` (konteks + dekode dini; izin ≠
  persiapan), `playOnce()` (zero-gesture dicoba DULU; bila terblokir disiagakan
  berkunci nama dengan tenggat, berbunyi pada resume()/statechange/gestur asli
  pertama), jatah dicatat setelah start() terkonfirmasi, fase intro terekspos di
  `diagnostics().faseIntroSplash`.
- `features/brand/fiezel-splash.js`: satu titik masuk `requestIntro()` per tayangan,
  lepas dari startOffset; ketukan splash_intro tinggal sebagai metadata visual.
- `app.js`: `prepare('splash_intro')` sebelum `load()`.
- `tests/splash-first-paint-test.js`: kontrak lama "adopsi terlambat = senyap" (bagian dari
  bug) diganti kontrak baru + 7 test zero-gesture.

Invarian dijaga: satu tayangan = maksimal satu bunyi; preferensi `feedbackSounds`
berkuasa penuh; TANPA gestur sintetis; rendering splash tidak bergantung audio;
`paw_greet`/koreografi/pawstamp/SFX navigasi/sw.js ASSETS tidak disentuh (konvensi:
tanpa `.mp3` di precache shell).

## LANGKAH BERIKUTNYA (pemegang handoff selanjutnya / OWNER)

1. PASCA-DEPLOY WAJIB: uji fisik di PWA terpasang Android — cold launch, TANPA
   menyentuh layar, `splash_intro` harus berbunyi tepat satu kali. Cek
   `FiezelUiSfx.diagnostics().faseIntroSplash` = `PLAYED`.
2. Chrome tab profil baru: fase harus `AUTOPLAY_BLOCKED`, lalu ketukan asli pertama
   memutar `splash_intro` (bukan paw_greet) tepat satu kali.
3. iOS Safari + Home Screen: tetap butuh satu ketukan (batas WebKit, bukan bug);
   pastikan tidak ada bunyi ganda dan tidak ada bunyi liar setelah splash tertutup.
4. Bila ditemukan bunyi ganda/liar: pagar yang harus dicurigai berurutan —
   `ctl.introRequested` (splash), `onceGate` (fasad), tenggat `pending.expiresAt`,
   `cancelPending()` di `close()`.
5. Klien iOS offline pertama-kali masih mengambil `splash_intro.mp3` dari jaringan
   (mp3 sengaja di luar precache shell). Kalau OWNER mau menutup celah ini, itu
   keputusan konvensi precache terpisah — jangan selipkan diam-diam.
