# Handoff m025-225 — Braincore v3 P0/P1: gerbang hijau, dekontaminasi bacaan, kemurnian brain

**Kewenangan: OWNER.** Dikerjakan dari mega-prompt "BRAINCORE FIEZEL v3 — FULL PRODUCTION
BUILD" (P0 → test → P1 → test → P2). Dokumen ini mencatat apa yang berubah, apa yang
sengaja TIDAK diubah, dan apa yang tersisa — supaya sesi berikutnya tidak menebak.

## Status

**P0 SELESAI. P1 sebagian, P2 sebagian.** Rinciannya di §6 (yang tersisa), ditulis sebagai utang terbuka,
bukan sebagai klaim selesai.

## Sentuhan pada `features/neural-voice/`

**Hanya nomor build** (`DIAG_BUILD` m025-224 → m025-225 lewat `tools/bump-build.mjs`).
**Nol baris logika suara neural berubah.** Kunci T-026 tidak disentuh.

Bump-nya wajib, bukan kosmetik: `reading-bank.json` dan `cloze-bank-v1.json` ikut ter-precache
shell service worker. Tanpa `SW_REV` naik, PWA yang sudah terpasang tetap menyajikan bank
lama — murid tidak akan pernah melihat stem berbahasa Indonesia maupun pembahasan cloze baru.

## 1. Garis dasar yang jujur lebih dulu

220 gerbang `quality.yml` dijalankan pada `origin/main` SEBELUM menyentuh apa pun:
**214 PASS / 6 FAIL**. Enam itu ditelusuri satu per satu, dan hasilnya **tidak seragam** —
tiga cacat nyata, tiga artefak cara menjalankannya. Keduanya dicatat, karena melaporkan enam
kegagalan sebagai enam cacat sama menyesatkannya dengan menyembunyikannya.

| Gerbang | Vonis | Akar |
|---|---|---|
| `tests/p1-game-layer-smoke-test.js` | cacat | `classList` tiruan no-op → `openDialogLayers()` mati sebagai `TypeError` |
| `tests/voice-fallback-chain-test.js` | cacat | sebab sekelas: node tiruan tanpa `classList` |
| `tests/social-frontend-test.js` | cacat | **bom waktu** — `outboxPending()` memanggil `Date.now()` sendiri |
| `tools/fiezel-health-probe.mjs` | artefak | CI memanggilnya `--selftest`; ekstraktor daftar saya menjatuhkan flagnya |
| `tests/release-audit-gate-test.js` | artefak | butuh `FIEZEL_RELEASE_AUDIT_REPORT_FRESH=1` + laporan segar |
| `tests/id-golden-snapshot-test.js` | artefak | `git checkout --` saya sendiri berjalan bersamaan dengan validasi |

`tests/social-frontend-test.js` layak dibaca ulang oleh siapa pun yang menulis gerbang: jam bekunya
`t` = 28 Agu 18:00Z dan `OUTBOX_MAX_AGE_MS` = 3 hari, jadi ia **hijau saat ditulis dan berubah
merah pada 31 Agu tanpa satu baris kode pun berubah**. Yang diperbaiki karena itu modulnya
(jam jadi argumen, seperti tiga fungsi outbox lain), bukan angkanya di gerbang.

## 2. Dekontaminasi konten (P0)

530 stem soal bacaan A1/A2 + 2.120 opsinya dialihkan ke bahasa Indonesia, mengikuti konvensi
yang **sudah berlaku** di bank listening (skrip Inggris, pertanyaan & opsi Indonesia).

Stem dan opsi diterjemahkan **bersamaan**, sesuai peringatan eksplisit
`WAVE-D-RELEASE-NOTES.md` §3.2: item yang stemnya sudah Indonesia tapi opsinya masih Inggris
pindah ke kelas diskon-kecil (κ=0,8) padahal gagal membaca opsi sama fatalnya —
"jangan dibiarkan setengah-setengah".

Yang **tidak** disentuh, karena itu konten target belajar: teks bacaan dan `meta.evidence`.
Dijaga dan diperiksa: `correctIndex` tidak bergeser, `meta.answer` disinkronkan, tidak ada
opsi kembar, B1–C2 nol byte berubah.

## 3. Cakupan `whyFailsId` (P0)

Bank grammar sudah 747/747. Yang bocor ada di **jalur konversi**: `tools/build-cloze-bank.js`
hanya menyalin `{text, misconception}`, jadi 626 pengecoh cloze tidak punya satu kalimat pun
untuk murid yang salah — padahal 249 template sumbernya lengkap. 87 dari 210 item cloze
bahkan tampil tanpa pembahasan apa pun.

Sesudah: **210/210 item dan 626/626 pengecoh** punya penjelasan Indonesia.

Gerbangnya ikut dikencangkan. Syarat lama `if (d.whyFails && !d.whyFailsId)` punya lubang
diam: pengecoh yang lahir **tanpa** `whyFails` sama sekali lolos hijau — padahal itu justru
kasus terburuknya.

## 4. Gerbang baru

| Berkas | Yang dijaga | Bukti ia bisa MERAH |
|---|---|---|
| `tests/braincore-purity-test.js` | nol `Math.random`/`Date.now`/DOM/storage/jaringan di 21 modul `features/brain/` | sempat merah pada `fiezel-core-brain.js` (jamnya `opts.now`, bukan `nowMs`) |
| `tests/save-path-perf-test.js` | biaya jalur `save()` diukur, bukan di-grep | bentuk pra-perbaikan = **3.006** konstruksi `Intl.DateTimeFormat`, ambang 60 |

Keduanya memakai lexer/harness yang membuang komentar & string lebih dulu, dan
`tests/braincore-purity-test.js` **membuktikan lexernya sendiri** dengan kasus uji bawaan — tanpa
itu, lexer yang rusak membuat semua modul tampak murni dan gerbangnya jadi hijau permanen
yang tidak menguji apa pun.

## 5. Performa & PWA (P1)

- **`validTimeZone` di-memo.** Perbaikan D4 #1 ternyata BELUM selesai: `studyDayKey` memo
  hasilnya, tetapi kunci memonya dibangun dari `studyTimeZone()` → `validTimeZone()`, yang
  membangun satu `Intl.DateTimeFormat` pada **setiap** panggilan termasuk memo hit. Terukur:
  **96 ms → 0,08 ms** per 1.000 baris riwayat (±289 ms → 0,2 ms per jawaban).
- **Formatter UI di-cache** (`uiFormatter`): `getCelestialState` dipanggil tiap 30 detik
  selama sesi hidup dan membangun formatter baru setiap kali.
- **`save()` tidak di-debounce 500 ms, dan itu disengaja.** Koalesensi microtask yang sudah
  ada memberi hasil yang diminta (satu penulisan per task, bukan tiga per jawaban) **tanpa**
  jendela kehilangan data saat unload. Timer 500 ms akan menukar durabilitas dengan biaya
  yang sekarang sudah 0,2 ms. Diukur, bukan diperdebatkan.
- **Halaman luring disintesis di `sw.js`.** Batas lama (luring + belum punya cangkang) dijawab
  penolakan mentah = halaman galat peramban berbahasa Inggris. Sekarang murid dapat halaman
  Indonesia + tombol coba lagi. Keberatan asli tetap dihormati: yang dilarang adalah
  menyajikan CANGKANG KOSONG, dan halaman ini bukan cangkang — ia disintesis (tidak butuh
  cache, jadi tetap ada justru saat cache kosong) dan berstatus 503.

## 6. Yang SENGAJA tidak dikerjakan, dan alasannya

1. **Pinch-zoom tetap dikunci.** Mega-prompt meminta `user-scalable=no` dicabut. Repo mencatat
   ini sebagai keputusan OWNER 29 Agu 2026 yang diambil **sesudah biayanya disampaikan**
   (`fiezel-zoom-lock.js` menulis korbannya terang-terangan: murid low-vision kehilangan
   kemampuan memperbesar). Ditanyakan ulang ke OWNER dalam sesi ini; **jawabannya: pertahankan
   kunci zoom**. Utang yang belum dibayar tetap sama dan tetap tercatat di modul itu: pengatur
   ukuran teks DI DALAM aplikasi.
2. **`app.js` belum dipecah.** Target `<150 KB` initial bundle tidak tercapai: `app.js` 854 KB
   dari 2.514 KB skrip eager (27 berkas / 503 KB sudah lazy). Memecahnya mengubah kontrak boot
   yang di-assert ~10 gerbang. Keputusan OWNER: **perluas mekanisme lazy-load yang sudah ada**,
   bukan bedah arsitektur boot.
3. **Item a11y lain sudah terpasang sebelum sesi ini** dan tetap hijau: cincin fokus, fokus
   pindah saat ganti layar (`setApp`), `aria-live` per-wilayah (bukan seluruh `#app`), tap
   target ≥44 px, kontras. Tidak diklaim sebagai pekerjaan baru.

## Lanjutan (roadmap sesi berikutnya)

1. `fiezel-library-ui.js` (43 KB) SUDAH dipindah ke grup lazy ketiga di rilis ini.
   Dua kandidat lain ditolak berikut alasannya, dan alasan itu ditulis di
   `tests/boot-order-test.js` supaya tidak perlu diselidiki ulang: `fiezel-tutor-brain.js`
   butuh pola `coreBrainAvailable` di 8 titik panggil app.js lebih dulu (kalau tidak,
   memalaskannya = ReferenceError di jalur tutor), dan `fiezel-diag-panel.js` ditolak
   gerbang boot-order sendiri. Hasil terukur: eager 2.514 KB -> 2.470 KB (-44 KB, 1,7%);
   target <150 KB TIDAK tercapai dan tidak akan tercapai tanpa memecah `app.js` (854 KB).
2. P2: penelusuran end-to-end menemukan satu cacat nyata dan sudah ditutup di rilis ini —
   umpan balik distraktor cloze menampilkan tag Inggris (`habitual-aspect
   overgeneralization`) ke murid SMP Indonesia; datanya sudah ada di bank, yang kurang
   jalannya di app.js. Yang BELUM: verifikasi ketiga fitur (OLM panel, Cloze, Step-tutor)
   di perangkat sungguhan, bukan hanya lewat gerbang.
3. Lighthouse (Performance ≥90, Accessibility ≥95) belum diukur di sesi ini — butuh browser.
4. Coverage engine inti ≥90% belum diukur; belum ada alat coverage terpasang di repo.

## Verifikasi

- `python3 release-audit.py` → **602 PASS / 0 FAIL**
- 209 gerbang CI dijalankan lokal → hijau, termasuk enam yang merah di garis dasar
- `tests/gate-registry-test.js` PASS (220 invokasi; dua gerbang baru terdaftar di `quality.yml`)
