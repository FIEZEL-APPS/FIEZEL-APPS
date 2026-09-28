# m025-380 — Klaim jujur untuk uji tuntas (due diligence) Braincore

Owner sedang menjual FIEZEL Braincore lewat Acquire.com. Audit pra-uji-tuntas (2026-09-28) menemukan
klaim yang tidak bisa dipertahankan di depan CTO pembeli, audio contoh resmi JLPT yang diputar langsung dari
jlpt.jp, dan satu cacat penaksir yang nyata. Owner: "aku ingin kamu bereskan semua dan perbaiki semuanya."
Rilis ini membereskan bagian yang ada di repo. Dokumen jualan (listing, dossier, P&L) ada di luar repo dan
diperbaiki terpisah.

## Yang berubah

| Area | Sebelum | Sesudah |
| --- | --- | --- |
| Audio JLPT | 30 soal listening memutar audio contoh resmi JLPT 2018 dari `jlpt.jp` (tombol "📻 JEES"), dan bank menyebut dirinya "resmi dan terstandarisasi" | Hanya audio suara AI (`audio-jlpt/`). Tombol JEES dihapus, `audioUrl`/`audioTrack` resmi dibuang dari bank dan generatornya, sumber ditulis jujur ("bukan materi resmi, tidak berafiliasi") |
| Teks JLPT di layar | "🎧 RESMI JAPAN FOUNDATION & JEES", "Simulasi Ujian Asli JLPT", "30 Item Interaktif + Audio JEES" (dua terakhir tertulis langsung di `app.js` dan `fiezel-ja-ui.js`) | "🎧 LATIHAN FORMAT JLPT", "Latihan listening dengan format soal JLPT N5 & N4", "30 soal dengan audio". Semuanya lewat kunci i18n baru, Indonesia + Thai |
| Kemampuan awal murid | `analyze()` dipanggil tanpa `priorAbility`: semua murid mulai dari 1,5. Murid C1 masih terbaca B1 setelah 50 jawaban | `coreBrainPriorAbility()`: A2 = 2 … C2 = 6, tidak pernah di bawah 1,5 (murid A1 tidak berubah). Bias di bawah 0,1 sejak 20 jawaban bila levelnya tepat, di bawah 0,15 bila kemampuannya persis di batas dua level |
| `round()` di 7 modul otak | Meluap jadi ±Infinity bila \|x\| > 1,8e305 (22 dari 308 kasus uji ekstrem) | Penjaga 1e15; 308/308 lulus |
| Ketajaman soal `a` | Diterima apa adanya: negatif membalik kurva, nyaris 0 melempar kesulitan ke miliaran | Dijepit 0,2..4 (0 = bawaan 1,5) |
| `backend/braincore.py` | `OverflowError` bila \|θ − b\| > 473; `bkt_update(nan)` = 0,99 ("dikuasai"); komentar "paritas kanonik dengan client" | Tanpa luapan, NaN kembali ke nilai awal, angka normal identik bit demi bit; komentar menyebut konstantanya berbeda |
| Gerbang e2e | Invarian 1 menulis sendiri keputusan "continue"; invarian 8 hanya menjebak `fetch`; invarian 9 menyebut rantai "cryptographic" | Invarian 1 mengambil langkah dari otak tutor; invarian 8 menjebak fetch, XHR, WebSocket, http/https/net/tls/dns dan child_process lalu memuat ulang modul di dalam jebakan (terbukti merah bila ada panggilan jaringan); invarian 9 "integrity checksum chain" |
| Dokumen | `BRAINCORE-CAPABILITY-MATRIX.md`: "0ms" 32 kali, "Cryptographic Hash Chain", "Differential Privacy & K-Anonymity", "Federated … Ledger" | Latensi terukur (p50 0,18 ms), "rantai checksum", "supresi kelompok kecil", tanpa "federated" |

## Gerbang baru

| Gerbang | Mengunci | Bukti merah |
| --- | --- | --- |
| `tests/brain-prior-seed-test.js` | prior dari level diteruskan ke `analyze()`; pemetaan level; bias & cakupan ±2 sd | R3: dengan prior lama, murid C1 meleset > 1 level setelah 50 jawaban |
| `tests/braincore-py-guards-test.js` | tanpa luapan, tanpa NaN, angka normal identik, `a` dijepit | Pada `braincore.py` lama: G1, G2, G4, G5 gagal |
| `tests/brain-extreme-inputs-test.js` | ±1e308 hingga, `a` dijepit, angka normal identik, penjaga di tiap `round()` | Pada modul lama: E1, E2, E4 gagal |

## Yang sengaja tidak diubah

- **Naskah 30 soal listening JLPT.** Tiap soal semula dipetakan ke trek audio contoh resmi JLPT 2018, jadi
  keaslian naskahnya belum bisa dijamin. Audio resminya sudah dilepas; naskahnya perlu ditinjau atau ditulis
  ulang sebelum bank ini ikut dijual. Sampai saat itu bank ini masuk daftar aset yang dikecualikan. Menghapus
  fitur dari murid adalah keputusan owner.
- **Tautan PDF contoh soal di panel listening.** Itu tautan keluar ke situs resmi JLPT, bukan salinan; labelnya
  kini "Contoh soal dari situs resmi JLPT".
- **Konstanta BKT backend Python.** Mengubahnya menggeser status MASTERED di dasbor guru. Yang diperbaiki
  hanya klaim "paritas"-nya.
- **Penaksir grid-EAP** dari audit. Prior dari level sudah menutup bias awal; EAP tetap usulan terbuka.
- **Laporan lama di `reports/`** tetap apa adanya sebagai catatan sejarah.

## Build

`FIEZEL_PAGE_BUILD` / `DIAG_BUILD` = `m025-380`, `SW_REV` = `m025-380-klaim-jujur-dd-20260928`
(lewat `tools/bump-build.mjs`).
