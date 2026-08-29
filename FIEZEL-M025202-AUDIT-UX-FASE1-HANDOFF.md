# FIEZEL — Audit UI/UX Senior + Perbaikan Fase 1 (m025-202)

Tanggal: 2026-08-29 WIB
Lane: desain / UX
Release: `FIEZEL_PAGE_BUILD=m025-202`, `DIAG_BUILD=m025-202`, `SW_REV=m025-202-ux-audit-fase1-20260829`
Otoritas: **OWNER** memutuskan; agen ini mengaudit, memperbaiki cacat, dan mengusulkan. Tidak ada
kemampuan produk yang dicabut tanpa OWNER. Satu perubahan naskah murid di bawah **MENUNGGU
KONFIRMASI OWNER** sebelum merge.
Dokumen lengkap: `design/ux-2026/` (11 berkas + `evidence/`)

## STATUS

| Bagian | Status |
|---|---|
| Audit 15 rute, terukur di peramban nyata | **SELESAI** |
| P0 judul layar tak terlihat | **SELESAI + bergerbang** |
| P1 eyebrow kuis, umpan balik, rubrik Writing, bagian kosong Peta Belajar | **SELESAI** |
| P2 sasaran sentuh chip tujuan | **SELESAI** |
| Fase 2 (Grammar Hub, overlay Home, zero-state Peta Belajar, konsolidasi kontrol level) | **BELUM — terurut di `design/ux-2026/09-IMPLEMENTATION.md`** |
| Fase 3 (lantai 12px, Library, Skills, Classroom) | **BELUM** |
| Fase 4 (pengatur ukuran teks dalam aplikasi) | **BELUM — utang aksesibilitas yang dijanjikan `index.html`** |
| Naskah murid berubah (1 string) | **MENUNGGU OWNER** |

## KENAPA INI ADA

Permintaan: audit UI/UX menyeluruh dan sederhanakan antarmuka tanpa menyederhanakan produk.
Metodenya sengaja bukan membaca kode lalu berpendapat: seluruh 15 rute dijalankan di Chromium
nyata pada 390×844 sebagai murid A2 ber-seed, lalu diukur di DOM — tinggi gulir, wadah berkotak,
kontrol, karakter terlihat, kontras dan ukuran huruf tiap simpul teks, kotak tiap kontrol.
Harness-nya ikut di-commit (`design/ux-2026/evidence/`) supaya angkanya bisa diulang.

**Temuan terpentingnya bukan yang dicari.** Kartu soal ternyata permukaan paling sehat di produk;
kesesakan hidup di hub dan dasbor di sekitarnya. Dan di bawahnya ada satu P0 sungguhan.

## P0 — JUDUL LAYAR TIDAK TERLIHAT 13 JAM SEHARI

`features/tutor-classroom/tutor-v3.css` memaku `.section-head h1{color:#f8faff}` untuk
`body.scene-dusk` dan `body.scene-night`. Itu benar ketika tanah halaman ikut menggelap.
**m025-115 mencabut aturan "langit malam menjadi tanah"** (alasannya masih tertulis di `style.css`,
blok *"1. Tanah halaman ikut fase langit"*) — tetapi hanya separuh tanahnya yang dicabut.
Tintanya yatim.

Sejak itu `#f8faff` duduk di atas krem `#FFF9EE`: **1,00:1** pada malam, **1,02:1** pada senja.
`getCelestialState()` menaruh senja 16.00–19.00 dan malam 19.00–05.00 — **13 dari 24 jam**, tepat
pada jam belajar sepulang sekolah. Terkena: Grammar Hub, Vocabulary Hub, Ruang Reading, Skills Lab,
Tes Kemampuan Dasar, Peta Belajar & Lab, Perpustakaan.

**Kenapa tidak ada gerbang yang menangkapnya.** `contrast-test.js` mengeja `.section-head h1`
sebagai `var(--ambient-text)` — token **siang** — jadi ia memeriksa nilai yang tidak pernah dipakai
peramban saat malam. Penimpaan ber-scope fase tidak pernah ikut dibaca.

**Perbaikannya** mencabut separuh aturan yang yatim. `.topbar` di baris yang sama TETAP:
`--ui-chrome-dusk` memang krem terang, jadi ia tidak pernah salah. Sesudahnya judul kembali ke
`--ambient-text` = **16,3:1**, terukur di peramban pada keempat fase dengan jam disetel
(`design/ux-2026/evidence/phases.js`).

**Gerbangnya ditutup di tempat celahnya hidup, bukan di berkas baru**: invarian
*"tidak ada tinta terang yang dipaku pada blok fase bertanah terang"* di `contrast-test.js`.
Ia membaca `--sky-bottom` milik tiap blok `.scene-*`, jadi ia mengikuti tanah dan bukan daftar
nama — kalau suatu fase memang digelapkan lagi, tinta terang untuk fase itu lolos sendiri.
Dibuktikan MERAH dulu terhadap CSS lama, baru diterima.

## P1/P2 YANG IKUT DIPERBAIKI

1. **Eyebrow kuis.** Kartu soal memimpin tiga baris KAPITAL berisi judul lesson yang baru dibaca
   murid satu ketuk sebelumnya. Akarnya bukan "eyebrow jelek": ia dicetak tanpa peduli sesinya
   satu skill atau banyak. `quizLoop` sekarang menghitung faktanya dari kolam soal — satu skill →
   hanya band yang tercetak, teks penuh pindah ke `aria-label` (pembaca layar tidak kehilangan
   apa pun). Sesi campur (adaptive/placement/ujian) tidak berubah sama sekali; kolam dinamis tidak
   pernah dianggap satu-skill.
2. **Umpan balik salah-jawab.** Paragraf keduanya mengulang judul lesson lagi. Itu template generik
   berisi `{focus}`, bukan naskah per-lesson, jadi perbaikan kode. 35 kata → 14.
3. **Rubrik Writing.** 5 kriteria + penafian IELTS (~120 kata) terbuka permanen sebelum murid
   menulis satu huruf. Dilipat memakai `.home-fold`, tidak dibuang: 1553px → 1117px (−28%).
4. **Peta Belajar.** Bagian kosong memakai kartu penuh untuk mengumumkan kekosongan. `foldCard()`
   membuatnya satu baris 44px, dan kembali jadi kartu penuh **sendiri** begitu berisi.
5. **`.journey-goal-chip`.** Memaku `min-height:36px` menimpa `button{min-height:44px}`, dan beda
   dari `.lesson-skip-link` ia tidak punya perluasan hit-area `::before` yang menambalnya. → 44px.

**NOL komponen baru** — semuanya memakai ulang pola `.home-fold` yang sudah ada.
**NOL kemampuan dibuang** — tiap kata yang dilipat tetap satu ketuk dari tempatnya semula.

## YANG SENGAJA DICATAT SEBAGAI BUKAN TEMUAN

Supaya pass berikutnya tidak "merapikan" hal yang sudah benar:

1. **Kartu soal** sudah memenuhi prinsip satu-aksi-utama. Ia hanya perlu eyebrow-nya dibetulkan.
2. **Model umpan balik retry-instead-of-reveal** — kunci jawaban tidak dibuka, miskonsepsinya yang
   dinamai — itu keputusan pedagogis yang bagus dan tidak boleh "disederhanakan" jadi membuka kunci.
3. **`.lesson-skip-link` 24px** SUDAH punya perluasan hit-area `::before` ke 44px. Sapuan awal
   audit salah menandainya; yang diukur kotak catnya, bukan kotak sentuhnya.

## MENUNGGU KEPUTUSAN OWNER

Satu naskah murid berubah — kalimat pegangan pada umpan balik salah-jawab:

> ~~`Inget fokus {judul lesson}, ya. Cek kenapa tiap jebakan beda dari jawaban benar.`~~
> `Cek kenapa tiap jebakan beda dari jawaban benar.`

`id-golden-baseline.json` diregenerasi dengan `--write-baseline` di commit yang sama, seperti
diminta gerbangnya; sisi Thai ikut bergerak supaya `th-coverage-test.js` tetap hijau. Gerbang itu
meminta perubahan naskah **disengaja dan sudah direview** — jadi ini satu-satunya bagian yang bukan
murni perbaikan cacat, dan ia menunggu OWNER.

## GERBANG

201/205 hijau. Empat merah **PRA-ADA dan terverifikasi merah di `origin/main` bersih** (diuji di
worktree terpisah): `voice-fallback-chain-test.js`, `listening-subtitle-suppression-test.js`,
`speaking-exam-test.js`, `listening-exam-test.js`. Keempatnya menuntut literal Indonesia yang sudah
pindah ke peta naskah pada gelombang i18n — harness-nya yang basi, bukan naskahnya yang hilang
(kunci `fsl.audio-error-*` ada dan teratasi benar di aplikasi nyata). **Di luar lingkup m025-202,
tetapi artinya `main` sedang merah dan itu perlu diketahui.**

Nomor build lewat `tools/bump-build.mjs`, bukan diketik. Arbiternya mendeteksi hulu sudah di
m025-201 dan menaikkan ke m025-202 — persis tabrakan yang alat itu ada untuk mencegah.

## LANJUTAN — FASE BERIKUTNYA

Urutannya lengkap di `design/ux-2026/09-IMPLEMENTATION.md`. Ringkasnya:

**Fase 2 (satu perubahan satu commit, masing-masing dengan pass gerbangnya sendiri):**
- **2b Grammar Hub** — P1 terbesar yang tersisa: 4118px, 4,9 layar, 62 kontrol, 29 lesson tergelar
  rata. Jadi berjangkar-posisi: lesson berjalan sebagai kartu penuh, 2–3 berikutnya sebagai baris
  ringkas, `Selesai (n)` dan `Terkunci (n)` sebagai dua lipatan. **Risiko tertinggi** — menyentuh
  markup yang dijaga `grammar-unlock-test.js`, `prerequisite-graph-test.js`,
  `lesson-experience-test.js`. **Kerjakan sendirian.**
- **2a Home** — `#fzRitual` menutupi Home penuh layar tiap kali dimuat; jadikan hero inline.
- **2c Layar intro lesson** — berhenti jadi halaman dokumentasi (~110 kata → ~25 sebelum CTA).
- **2d Zero-state Peta Belajar** — lima ubin nol, `Rencana kamu` bersarang, kartu sosial (hati-hati:
  ia menyegarkan badannya sendiri lewat `refreshSocialSummaryCard`).
- **2e** Konsolidasi `Level belajar · Ganti` yang kini muncul di tujuh layar.
- **2f** Naskah gelombang A (kosakata internal: toast `Core Brain`, metadata intro, baris hero Home).
- **2g** Audit rantai boot — enam interupsi sebelum murid melihat produknya.

**Fase 3:** lantai 12px (8 kelompok pelanggaran), Library, Skills Lab, Classroom, afordans gulir
baris chip, slot maskot 390px.

**Fase 4:** **pengatur ukuran teks di dalam aplikasi.** `index.html` mencatat keputusan OWNER
mematikan zoom halaman (`user-scalable=no`), penyimpangan sadar dari WCAG 1.4.4/1.4.10, dan menamai
mitigasinya. Mitigasi itu belum ada. Ia satu-satunya jalan mengembalikan keterbacaan bagi murid
low-vision tanpa membatalkan keputusan OWNER, dan dibawa di sini supaya tidak hilang.
