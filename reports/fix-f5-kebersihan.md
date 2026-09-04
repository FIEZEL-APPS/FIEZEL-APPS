# F5 — Utang kebersihan dari audit kepatuhan, ditutup

Sumber tugas: `reports/add-a10-kepatuhan.md` (§2.3, §5.1, §5.3, KB-6, R9).
Branch: `fix/f5house`. Build id **tidak** disentuh (`SW_REV='m025-172-jembatan-edge-api-20260827'` tetap).
Tidak ada push.

Ringkasnya: lima utang ditutup, satu cacat pra-ada ikut ketemu dan ikut ditutup karena ia
membuat salah satu gerbang verifikasi merah sejak sebelum pekerjaan ini dimulai. Di bawah ini
apa yang dihapus, didaftarkan, diberi bukti, dan dilabeli ulang — plus apa yang **tidak**
selesai dan kenapa.

---

## 1. Gerbang ada di repo tapi tidak terdaftar CI

Audit melaporkan "2 gerbang". Saya tidak percaya angkanya dan menghitung sendiri: daftar
`*-test.js` / `*-audit.js` / `*-selftest.js` dari `git ls-files` dibandingkan dengan setiap
`node X` di `.github/workflows/quality.yml`, setelah komentar YAML dibuang (supaya nama
gerbang yang cuma disebut di prosa tidak dihitung sebagai pendaftaran).

Hasilnya **tiga** kandidat, bukan dua. Semuanya dijalankan dulu, tidak ada yang didaftarkan
diam-diam:

| Berkas | Hasil dijalankan | Tindakan |
|---|---|---|
| `bank-soal-audit-test.js` | exit 0 | **DIDAFTARKAN**, tepat setelah `node content-integrity-gate-test.js` |
| `app-report-control-path-test.js` | exit 0 | **DIDAFTARKAN**, tepat setelah `node remote-push-test.js` |
| `audit/bank-audit.js` | exit 0 — tapi **selalu** exit 0 | **TIDAK didaftarkan**, masuk daftar pengecualian |

Kenapa `audit/bank-audit.js` tidak didaftarkan: ia bukan gerbang, ia penghasil laporan. Nol
assert, nol `process.exitCode`, menulis `audit/BANK-SOAL-AUDIT.json` lalu keluar 0 apa pun
yang ia temukan — dan temuannya hari ini pun tidak nol. Mendaftarkannya berarti menambah satu
langkah yang hijau selamanya, yaitu tepat jenis langkah yang membuat hitungan "gerbang hijau"
berbohong. Sisi bank soal yang **harus** bisa merah sudah dijaga `bank-soal-audit-test.js`.

Tidak ada gerbang yang gagal saat dijalankan, jadi tidak ada cacat produk maupun gerbang basi
yang perlu dilaporkan di sini.

### Gerbang meta: `gate-registry-test.js` (baru, 382 baris, 10 assert, exit 0)

Ia membuat kondisi di atas mustahil terulang tanpa terlihat:

- Setiap berkas gerbang di repo harus terdaftar di `quality.yml` **atau** ada di `EXCLUSIONS`.
- Setiap entri `EXCLUSIONS` wajib punya `class` (hanya `alat-pelaporan` atau
  `self-test-dipanggil-gerbang-lain`) dan `reason` ≥120 karakter. Entri tanpa alasan = merah.
- Entri pengecualian yang berkasnya sudah tidak ada = merah (daftar tidak boleh basi).
- Ia meng-assert dirinya sendiri terdaftar.
- Ia meng-assert **gerbang live tidak dihitung sebagai bukti** (lihat item 5).

Angka saat ini: 147 berkas gerbang di repo, 151 pemanggilan `node` di workflow,
**149 gerbang bukti**, 2 gerbang live (bukan bukti), 1 pengecualian.

Sudah diuji merah dua kali: menghapus satu pendaftaran → FAIL; mengganti nama langkah live
supaya tidak lagi menyebut SKIP → FAIL. Keduanya dipulihkan.

---

## 2. Berkas mati

**DIHAPUS:** `features/neural-voice/fiezel-pipeline-device-probe.js` (62 baris).

Diverifikasi sendiri sebelum dihapus: nol rujukan di `index.html`, `sw.js` (daftar ASSETS),
`manifest.json`, seluruh `.github/workflows/**`, dan seluruh `*.js`/`*.mjs`/`*.html`. Satu-satunya
penyebutan di repo adalah audit yang melaporkannya (`reports/add-a10-kepatuhan.md:147,195`).

### Berkas lain berujuk-nol — DILAPORKAN, TIDAK dihapus

Nol rujukan *kode*, tapi masing-masing adalah alat operator / skrip sekali-pakai yang
terdokumentasi. Menghapusnya bukan keputusan saya, jadi ini daftarnya untuk owner:

`analysis/vchunk-baseline.js`, `audit/repair-listening-bank.js`, `audit/repair-reading-bank.js`,
`audit/repair-reading-stem-unique.js`, `audit/translate-listening-full.js`,
`fiezel-evolution-loop-demo.js`, `repair-content-integrity.js`, `tools/run-core-batch.js`,
`adaptivity-simulation.js`, `grammar-provenance-verify.js`, `m02526-*.mjs`,
`tools/reading-bank-*.mjs`, `design/redesign-v1/**`.

Positif palsu yang sempat muncul dan sengaja dibiarkan:
`features/speaking-listening/listening-scenarios-a2..c2.js` terlihat berujuk-nol oleh grep
statis tapi di-`require()` secara dinamis dari `listening-lint.js:20` dan
`rebuild-speaking-listening-data.js:63,81`.

---

## 3. Bukti WER yang hilang

Angka `0.038` dan `0.018` (`tools/prerender-tts.mjs:87,96`, di-assert
`prerender-plan-test.js:146`) memang tidak punya bukti di repo. Artefak mentahnya **ADA** di
`/home/user/workspace/tts-pilot/` dan sudah dipindahkan ke `reports/evidence/tts-wer/`
(total 20 KB):

- `pilot-quality.json` — 12 baris hasil: 3 model × 4 kalimat
- `whisper-raw-response-c1-sample.json` — respons Whisper apa adanya untuk satu kalimat
- `melotts-error-attempt-1.json`, `melotts-error-attempt-2.json` — dua kegagalan `code: 3043`

`reports/evidence/tts-wer/README.md` menjelaskan cara hitungnya (jarak sunting tingkat kata
dibagi jumlah kata rujukan, buta huruf besar-kecil dan tanda baca), alatnya (Workers AI
Whisper `@cf/openai/whisper-large-v3-turbo`), jumlah kalimatnya (4: A1/A2/B1/C1), dan enam
batasnya.

Dua hal yang README sebut dengan jujur, bukan dirapikan:
- rekonstruksi per kalimat memberi rata-rata **0,03850** dan **0,01775**; kode menulis `0.038`
  (dipotong) dan `0.018` (dibulatkan ke atas). Pembulatannya tidak konsisten. Angka di kode
  **tidak** saya ubah.
- n=4, satu kali jalan, kalimat dipilih tangan, tanpa uji dengar manusia. Angka sekelas ini
  tidak boleh dipakai untuk klaim mutu absolut.

**1,71 MB audio (22 berkas) sengaja TIDAK dibawa masuk** supaya repo tidak bengkak; README
menyebut di mana asalnya.

---

## 4. Dua metrik suara yang dirangkai keliru (KB-6) — dilabeli ulang, nol angka dihapus

Yang benar, dan sekarang tertulis di setiap tempat yang mengutipnya:

| Metrik | Pola | Angka | Bukti mentah |
|---|---|---|---|
| **Jeda TERDENGAR** (`meanAudibleGapMs`), V5 | pintu suara per kalimat | 4.510,7 → 797,2 ms | `reports/voice-v5-data/door-measurements.json` |
| **Jeda PENJADWALAN** (`meanSchedulingGapMs`), V6 | satu kalimat per panggilan (classroom, tutor, flashcards, kuis) | 3.750,6 → 449,1 ms; porsi sunyi 47,69% → 9,69% | `reports/voice-v6-data/caller-measurements.json` |
| **Konfigurasi yang BENAR-BENAR dikirim** — narasi Library, blok bertangga (`LEAD_BLOCK_CHARS` 80, `RAMP_COVER_FACTOR` 1,15) | blok | jeda penjadwalan **560,6 ms**, jeda terdengar 1.286,0 ms, porsi sunyi 12,6%, suara pertama 2.816,8 ms | `reports/voice-v6-data/block-measurements.json` |

Jadi dua kesalahan berbeda, dan keduanya diperbaiki: merangkai "4.510 → 797" dengan
"3.750 → 449" sebagai satu tren, dan mengutip "449 ms" sebagai angka Library.

Tiga tempat diperbaiki:

1. **`app.js` ~4014–4041** — blok komentar "V6 SISI PEMANGGIL" mengutip jeda terdengar V5 di
   bawah judul V6 tanpa menyebut metriknya. Sekarang setiap angka membawa nama metrik, cara
   ukur, pola pemanggilan, dan status produksinya; ditambah kalimat tegas bahwa 449 ms bukan
   angka Library.
2. **`voice-callsite-prefetch-test.js` header** — sama, plus alinea khusus "angka mana untuk
   pekerjaan mana" dan "angka mana yang berlaku untuk produksi".
3. **`voice-callsite-prefetch-test.js` blok laporan** — dulu memancarkan
   `jedaTerdengarSebelumMs: 4510.7` / `jedaTerdengarSesudahMs: 797.2` seolah itu hasil ukur
   gerbang V6 ini. Diganti objek `metrics` dengan tiga cabang bernama
   (`v5MesinPrefetch`, `v6SisiPemanggil`, `v6NarasiLibraryTerkirim`), masing-masing membawa
   `metrik`, `diukurBagaimana`, `data`, `pola`, dan `berlakuUntukProduksi`.
   `VOICE-CALLSITE-PREFETCH-REPORT.json` diregenerasi dengan menjalankan gerbangnya (exit 0).
   Nilai `porsiSunyi` sekaligus diselaraskan ke angka mentah (0,4769 / 0,0969, bukan
   0,477 / 0,097 yang dibulatkan).

`reports/voice-v6-callers.md` sudah jujur sejak awal (§4 dan §5 memisahkan kedua metrik dan
menyebut konfigurasi terkirim) — dibiarkan apa adanya. Tidak ada tempat lain di repo yang
merangkai kedua angka; `RELEASE-NOTES.md` dan CHANGELOG tidak menyebutnya sama sekali.

**Tidak bisa diperbaiki:** pesan commit `868da28` merangkai "3.750 → 449" dengan
"47,7% → 9,7%". Riwayat git tidak disentuh.

---

## 5. Gerbang cf-live yang SKIP diam-diam di CI

Sebelumnya `node cf-live-contract-test.js` dan `node staging-live-test.js` ikut dijalankan di
dalam blok besar "Core validation" **tanpa env apa pun**, jadi keduanya SKIP dalam senyap dan
ikut terhitung ke dalam "146 hijau". CI tidak boleh menembak produksi setiap push, jadi
solusinya bukan mengaktifkannya, melainkan membuat SKIP-nya jujur dan menyediakan jalur
sengaja:

- Keduanya **dikeluarkan** dari blok Core validation (diganti komentar penunjuk).
- Masing-masing jadi **langkah bernama sendiri** yang menyebut SKIP di namanya:
  `CF live contract gate (SKIP kecuali workflow_dispatch dengan cf_live_base)` dan padanan
  staging-nya. Kalau env kosong, langkahnya mencetak alasan SKIP ke `::notice` **dan** ke
  `$GITHUB_STEP_SUMMARY`, jadi terlihat di ringkasan run, bukan terkubur di log.
- Jalur sengaja: `workflow_dispatch` dengan input `cf_live_base` dan `staging_base`, keduanya
  default kosong. Env diambil dari input itu (`FIEZEL_CF_LIVE_BASE`, `FIEZEL_STAGING_BASE`,
  plus `FIEZEL_STAGING_EDGE` dari secret). **Tidak ada URL bawaan** di workflow.
- `gate-registry-test.js` meng-assert tujuh sifat (L1–L7), termasuk: langkahnya punya nama
  sendiri, namanya menyebut SKIP, alasannya dicetak ke `::notice` + step summary, env-nya
  datang dari input dispatch dan bukan URL yang dipaku, input dispatch-nya benar ada,
  **gerbang live tidak dihitung ke `evidenceGates`**, dan gerbang live tetap **gagal keras**
  (exit ≠ 0) kalau env-nya diisi nilai rusak — diuji dengan `bukan-url-sama-sekali`.

### Efek samping yang harus disebut: `no-network-test.js` ikut diperbaiki

Dua assert di `no-network-test.js` dulu memeriksa **kalimat komentar literal** ("SKIP sampai
owner menyetel base URL") sebagai bukti bahwa langkah live mati secara bawaan. Itu proksi
lemah dari dua arah, dan justru terbukti: komentarnya lolos hijau padahal mekanismenya tidak
ada sama sekali. Sekarang yang di-assert adalah mekanismenya — env live terikat ke input
`workflow_dispatch`, `workflow_dispatch` ada, dan tidak ada `https://` yang dipaku ke env
live. Gerbangnya jadi 39 assert, exit 0.

---

## 6. Di luar lingkup, tapi ikut ditutup: kredensial sesi nyata ter-commit

`secret-scan-test.js` sudah **MERAH sebelum** pekerjaan ini dimulai (diverifikasi dengan
menjalankannya pada HEAD bersih lewat `git stash -u`). Penyebabnya:
`reports/add-a5-data/e2e-bridge-live-2026-08-28.json`, artefak uji E2E terhadap jembatan
**produksi** yang ikut menyimpan nilai cookie apa adanya — token sesi `fz_id` (JWT lengkap
milik pengguna `8d6a635e-…`) plus cookie AWS ALB.

Karena ia ada di daftar verifikasi tugas ini, saya tidak bisa melaporkannya hijau tanpa
menyentuhnya. Memasukkannya ke allowlist akan salah: ini bukan fixture, ini kredensial
sungguhan. Yang dilakukan (`tools/redact-a5-live-cookies.mjs`, sekali pakai, disimpan supaya
keputusannya bisa diaudit): 11 nilai cookie diganti `<REDAKSI len=N sha256=xxxxxxxxxxxx>`.
Nama cookie, jumlah, panjang, dan sidik jarinya tetap ada, jadi bukti "cookie mana terkirim ke
host mana" di `reports/add-a5-e2e.md` masih bisa diperiksa. Format berkas dipertahankan
(indent 2) supaya diff-nya 19 baris, bukan 1.300.

**Yang ini TIDAK menyelesaikan:** riwayat git masih memuat nilai aslinya. Token `fz_id` itu
harus dianggap **bocor** dan dirotasi oleh owner. Itu keputusan owner, bukan saya, dan tidak
bisa diselesaikan dari branch ini.

---

## Verifikasi

Semua exit 0, dijalankan di `/home/user/workspace/wt-f5house`:

`gate-registry-test.js`, `bank-soal-audit-test.js`, `app-report-control-path-test.js`,
`voice-callsite-prefetch-test.js`, `no-network-test.js`, `regression-test.js`,
`install-health-test.js`, `secret-scan-test.js`, `pwa-cache-test.js`, `sw-corp-test.js`,
`boot-order-test.js`.

Tidak ada bump versi (`VERSION.json`, `version.js`, `sw.js` `SW_REV` tidak berubah — cek
`git diff --cached` bersih untuk ketiganya). Tidak ada push.

Catatan lingkungan, bukan kegagalan: `e2e-level-grammar-test.js` mencetak SKIPPED karena tidak
ada Chromium di sandbox, dan `release-audit-gate-test.js` butuh ~339 detik kalau dijalankan.
