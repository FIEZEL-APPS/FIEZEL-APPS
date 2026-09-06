# PAW ARENA — Handoff (m025-276)

Owner menyerahkan keempat keputusan §10 ke agen ("Aku serahkan semuanya padamu…
dengan melihat repo main sekarang"). Berikut keputusan yang diambil, alasannya, apa yang
sudah dikerjakan, batasannya, dan langkah berikutnya.

## Keputusan (§10)

### 1. Tiga permainan
- **STORY CHAIN** (`story`) — dikunci owner. Kerja sama membangun cerita; bahasa Inggris =
  harga tiket (lolos tantangan bahasa → sambung satu kalimat dari kartu). Ronde berakhir
  dengan artefak cerita yang bisa disimpan.
- **SINYAL** (`signal`) — rancangan agen. Beri-petunjuk & tebak: satu kata rahasia, pemberi
  petunjuk memilih 2–3 kartu petunjuk (definisi/sinonim/kalimat rumpang) dari bank, lawan
  menebak dari 4 pilihan. Melatih kedalaman kosakata (sinonim/definisi/register). **Tanpa
  ketik bebas** — petunjuk dari kartu (aman moderasi §6.7).
- **TARUHAN** (`stakes`) — rancangan agen. Pasang taruhan (kecil/sedang/besar) SEBELUM
  menjawab; benar = menang pot, salah = hangus. Melatih kalibrasi keyakinan atas apa yang
  benar-benar dikuasai. Tak bisa menang tanpa jawaban benar (lolos §6.3).

Ketiganya: bisa solo lawan bot Braincore offline (§3.1.1), nol server (giliran lewat
kode/tautan, §3.1.2), 3–7 menit (§3.1.4), tanpa ketik bebas (§3.1.5), rasa berbeda —
kerja sama vs deduksi-komunikasi vs risiko-kecepatan (§3.1.6).

### 2. Nasib duel lama (`Laga Cepat`)
**Diganti.** Kuis-bertimer polos persis yang dikeluhkan owner. Semangatnya (duel cepat)
diserap ke **TARUHAN**. **Jalur `?duel=KODE` lama TETAP HIDUP**: arena membaca kode duel
lama lewat `FiezelDuel.decode` (`readLegacyDuelCode`), jadi tautan WA murid tidak patah.
`features/learner-flow/fiezel-duel.js` belum dihapus (lihat "Belum dikerjakan").

### 3. Navigasi (§4)
**Opsi (a).** PAW ARENA jadi **view sendiri** (`arena`), dicapai dari kartu Home + Profil,
**tanpa tab baru** — hormati `m025-246 EMPAT TAB`. Bottom nav tidak disentuh.

### 4. Bentuk kartu aturan (§3.3)
**Kartu penuh sebelum ronde, SETIAP kali masuk** + tombol `?` di tengah ronde. Isi minimal:
satu kalimat tujuan, 2–3 langkah, satu tombol Mulai (fokus awal). Contoh Story Chain:
> Tujuan: "Bangun satu cerita bersama — tiap kalimat harus kamu 'beli' dengan menjawab satu
> tantangan." · Langkah: 1) Jawab satu tantangan. 2) Pilih satu kalimat lanjutan. 3) Cerita
> tumbuh sampai ronde selesai — simpan sebagai artefak. · [ Mulai ] [ Lewati ]

## Sudah dikerjakan (kode)
- `features/brain/fiezel-arena-bot.js` — bot Braincore **murni** (seed→langkah deterministik;
  nol Date.now/Math.random/DOM/storage/jaringan). Tiga persona (Bumi hati-hati, Kira gegabah,
  Pak Rusa bijak) yang kadang ragu/salah. Didaftarkan di manifest (authority `active`),
  dimuat `index.html`, di-precache `sw.js`.
- `features/learner-flow/fiezel-paw-arena.js` — orkestrator: sesi, **kartu aturan per-sesi**
  (SELALU lahir fase `rules`; `USES_TOUR=false`; **tidak** memakai `fiezel-tour`), jalur
  keluar tunggal `dismissRules()` (m025-88 "tidak pernah mengurung"), `openHelp/closeHelp`
  yang tidak menyentuh ronde/giliran, `readLegacyDuelCode` untuk `?duel=` lama.
- `features/i18n/copy-id-pawarena.js` + `copy-th-pawarena.js` — naskah dwibahasa (th DRAFT
  AI, tandai review). Didaftarkan di `fiezel-th-loader.js` + `locale-assets-th.json`.
- `tests/paw-arena-rules-card-test.js` — gerbang yang **dibuktikan bisa MERAH**: menilai
  modul asli (harus hijau) DAN dua stub rusak M1/M2 (harus merah). Terdaftar di
  `.github/workflows/quality.yml`.
- Build dinaikkan +1 ke **m025-276** di keempat tempat via `tools/bump-build.mjs`.

## Mutasi yang diuji (bukti gerbang bisa merah)
- **M1** newSession kedua tidak lahir `rules` (once-per-lifetime) → gerbang MERAH.
- **M2** openHelp mengubah ronde/giliran (petunjuk menghanguskan giliran) → gerbang MERAH.
- **M3** modul memakai `FiezelTour` untuk kartu aturan → assert sumber MERAH.

## Sengaja BELUM dikerjakan (langkah berikutnya)
- **Wiring view-render di `app.js`**: menambah `'arena'` ke `VALID_VIEWS`, cabang render
  view, kartu masuk di Home + Profil. Sengaja ditunda dari perubahan ini supaya bisa
  ditinjau terpisah dan tidak menyentuh pipeline render `app.js` (13k baris) tanpa gerbang
  UI (view-reachability, ui-render-audit) yang butuh Chromium — dijalankan di CI, bukan
  sandbox ini.
- **UI ronde Signal & Stakes**: engine + keputusan bot sudah ada; renderer kartu-petunjuk
  (Signal) dan panel-taruhan (Stakes) menyusul (`paw-round-slot`).
- **Aset SFX/animasi khusus**: memakai ulang `uiSfx('nav'/'start'/...)` + `pawReact` yang
  ada. Tidak ada SFX baru → tidak ada aset yang diklaim palsu (§6.4).
- **Penghapusan `fiezel-duel.js`**: ditahan sampai view arena + Story/Signal/Stakes UI
  lengkap, agar `?duel=` dan papan skor lama tidak putus di masa transisi.
- **Coach-mark kali-pertama** (opsional, §3.3) sebagai TAMBAHAN kartu per-sesi — boleh
  memakai modul tur; belum dibuat.

## Verifikasi lokal (sandbox Node 20; CI pakai 22)
Hijau: `node --check` semua berkas baru; `tests/paw-arena-rules-card-test.js`;
`tests/braincore-purity-test.js`; `tests/brain-manifest-test.js`; `tests/th-coverage-test.js`.
Suite penuh (259 gerbang, ~24 mnt, butuh Python/Chromium/jaringan) dijalankan di CI —
`cf-live-selftest` merah-diketahui bukan milik perubahan ini.
