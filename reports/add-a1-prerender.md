# A1 — Pra-render TTS: skrip siap jalan + laporan biaya yang bisa dipercaya

Cabang `add/a1pre`. Tidak ada satu pun permintaan ke Workers AI, R2, atau jaringan mana pun selama
pekerjaan ini: seluruh angka di bawah dihitung dari bank di repo oleh gerbang node murni. Versi
build TIDAK dinaikkan, tidak ada push.

## 1. Angka yang berlaku, dan mengapa dua bilangan berbeda dilaporkan bersamaan

| Bilangan | Nilai | Artinya |
|---|---|---|
| Korpus kanonik | **604.962 karakter** (6.640 kalimat) | ukuran katalog; angka lama 591.898 salah dan sudah tidak muncul di mana pun |
| Sesudah dedup kunci v2 | **5.657 objek unik / 286.851 karakter** | yang benar-benar akan dibayar pada jalan pertama |
| Duplikat dihapus | 983 baris | kalimat sama di dua bank berbagi satu objek — penghematan, bukan galat |

Keduanya dipaku sebagai konstanta (`CANONICAL.totalChars`, `CANONICAL.uniqueObjectsPending`,
`CANONICAL.pendingChars`) dan dihitung ulang dari bank oleh gerbang, jadi pergeseran konten akan
memerahkan CI alih-alih diam-diam mengubah anggaran. Yang muncul di tagihan adalah 286.851, bukan
604.962; laporan yang hanya menyebut satu di antaranya selalu salah untuk salah satu pertanyaan
owner ("berapa isi katalog?" vs "berapa yang harus saya bayar sekarang?").

## 2. Biaya jujur — dua model berdampingan

Harga dari API Cloudflare: `@cf/deepgram/aura-1` US$0,015 per 1.000 karakter;
`@cf/deepgram/aura-2-en` US$0,030 — persis dua kali.

| | aura-1 | aura-2-en |
|---|---|---|
| Seluruh korpus 604.962 char | **US$9,07** | **US$18,15** |
| Batch pertama 286.851 char | **US$4,30** | **US$8,61** |
| Uji nyata 84 char | 961 ms / 25.704 byte | 2.510 ms / 32.688 byte |
| WER (transkripsi ulang Whisper) | 0,038 | **0,018** |
| Estimasi render berurutan (korpus) | ±1,9 jam | ±5,0 jam |

Campuran yang dipakai bawaan: aura-1 untuk korpus + aura-2-en TERARAH pada item berisiko. Dry-run
mencetak ketiga angka (aura-1 saja, aura-2-en saja, campuran terpakai) supaya keputusan model tidak
perlu dihitung tangan.

- **Durasi audio**: korpus ±11,6 jam, batch ±5,5 jam. Ini **estimasi** (14,5 karakter/detik ≈ 175
  kata/menit), dan dilabeli demikian di keluaran — ia bukan hasil pengukuran seperti angka harga.
- **Penyimpanan R2**: ±0,56 GB memakai kalibrasi 925 byte/karakter dari 273 aset nyata (dipakai
  sebagai **batas atas**); probe Workers AI memberi 306 B/char (aura-1) dan 389 B/char (aura-2-en)
  ⇒ ±0,19–0,24 GB. Ketiganya jauh di dalam free tier R2 10 GB.
- **Jatah gratis TIDAK CUKUP**: Workers AI Free = 10.000 neuron/hari untuk SELURUH akun; korpus
  butuh ±825.000 neuron = 83 hari kalau ditunggu. Pra-render **wajib dibayar sekali** (US$9,07 di
  aura-1). Peringatan ini dicetak di setiap dry-run, bukan disimpan di catatan kaki.
- **`@cf/myshell-ai/melotts` DITOLAK** dan ditulis sebagai data (`REJECTED_MODELS`), bukan komentar:
  gagal HTTP 500 pada 3 dari 4 kalimat walau 3× coba, dan keluarannya WAV base64 — bukan MP3 yang
  dilayani worker audio. `--model` maupun override per-item **melempar** bila memilihnya, dan
  penjagaan itu berulang tepat sebelum satu-satunya panggilan berbayar (`workersAiTts`), karena
  override bisa datang dari berkas JSON yang tidak lewat `parseArgs`.

## 3. Frasa berisiko: "On balance" terdengar "Unbalanced"

aura-1 melebur frasa itu sampai Whisper menuliskannya sebagai satu kata dengan arti **berlawanan**;
aura-2-en membacanya benar. Deteksinya otomatis atas bank (bukan daftar id tangan yang akan menua
tanpa suara), pencocokan tidak sensitif huruf besar dan menuntut batas kata — "the balance in her
account" tidak ikut tertangkap.

Hasil ukur hari ini: **36 kemunculan "On balance" di `reading-bank.json` pada 31 soal** — 35 stem
soal + 1 teks bacaan (r0127), semuanya level C1. Catatan tugas menyebut 29 stem; angka terukur 35
stem (18 stem unik) pada 30 soal + 1 teks. Yang dilaporkan di sini dan di gerbang adalah hasil
hitung, bukan angka yang diwariskan.

**Nol kemunculan di korpus TTS** (listening/book/vocabulary). Itu temuan, bukan kelegaan: stem
reading belum ikut pra-render hari ini, jadi tidak ada dolar yang salah dibelanjakan sekarang —
tetapi begitu stem soal dibunyikan (tombol baca-nyaring), 36 item itu **wajib** lewat aura-2-en atau
diverifikasi manual. Karena itu temuan reading-bank dilaporkan dengan tindakan
`render_with_@cf/deepgram/aura-2-en_or_manual_verify`, bukan disembunyikan karena "belum relevan".

Frasa sejenis yang dijaga dengan sebab yang sama (preposisi satu suku kata melebur ke kata
berikutnya sampai terdengar satu kata berarti lain): `On going`/Ongoing, `On set`/Onset,
`On line`/Online, `On board`/Onboard, `In depth`, `In balance`. "On balance" ditandai `confirmed`
(ada bukti transkripsi); sisanya `suspected` — dibedakan supaya tidak ada dugaan yang menyamar
sebagai pengukuran.

## 4. Override model per-item

Empat sumber, urutan menang dari yang paling eksplisit:

1. `--override=<domain>:<sourceId>=<modelId>` (bisa diulang) atau `--overrides-file=x.json`;
2. kunci teks kanonik (`text:<teks>`) — kalimat sama di dua bank ikut pindah bersama, kalau tidak
   satu kalimat itu dibayar dua kali dengan dua kunci;
3. deteksi frasa berisiko — **hidup secara bawaan**, dimatikan hanya secara sadar
   (`--no-risk-override`);
4. `--model` global, lalu bawaan aura-1.

Model diselesaikan **sebelum** kunci dihitung, karena `engineId`/`engineVersion` masuk hash: item
yang dipindah ke aura-2-en memang objek berbeda dan memang berbayar sendiri. Anggaran dihitung
dengan harga model **item itu** — menghitungnya dengan tarif bawaan akan melewati `--budget-usd`
tanpa peringatan justru pada jalan yang dipilih owner karena ia mau model yang lebih akurat.
Manifest menyimpan `engineId`/`engineVersion`/`voiceId` per aset plus `riskOverride: 'risky_phrase'`,
supaya "kenapa objek-objek ini aura-2-en?" terjawab dari katalog, bukan dari log CI yang sudah
kedaluwarsa.

## 5. Yang berubah

- `tools/prerender-tts.mjs` — `MODELS` (harga + probe nyata + WER), `REJECTED_MODELS` + `modelOf()`
  yang melempar, `RISKY_PHRASES` + `scanRiskyPhrases()`, `resolveModelFor()`, biaya/durasi/
  penyimpanan per model di `censusCorpus`/`buildPlan`, laporan dry-run diperluas, anggaran dan
  manifest per-model. Kunci **tetap** diambil dari `workers/api/tts/tts-key.js` — nol duplikasi
  logika kunci (diperiksa gerbang: tanpa `sha256`, tanpa `canonicalText`, tanpa literal skema).
  Jalur rencana tetap **nol jaringan**; `fetch` hanya hidup di helper R2/AI di belakang `--apply`,
  HEAD-sebelum-provider dan HEAD-verifikasi-sesudah-PUT tetap seperti sebelumnya.
- `tests/prerender-plan-test.js` — gerbang baru, node murni, nol jaringan: **63 assert PASS**.
- `.github/workflows/audio-prerender-cf.yml` — gate aktor kini memakai pola repo huruf demi huruf
  (`github.event_name == 'workflow_dispatch' && github.actor == 'fitrajft-ux'`, sama seperti
  `deploy-core-worker.yml:17`). Syarat `event_name` bukan hiasan meski `on:` hari ini hanya
  workflow_dispatch: begitu seseorang menambah `schedule` untuk "melanjutkan batch", gate berbasis
  aktor sendirian akan lolos untuk jalan yang tidak pernah ditekan siapa pun. Gerbang rencana baru
  dijalankan sebelum langkah Produksi. Input APPLY (bawaan kosong), `budget_usd` (bawaan 1.00), dan
  dry-run bawaan tetap sebagaimana adanya.
- `.github/workflows/quality.yml` — `node tests/prerender-plan-test.js` terdaftar sesudah
  `tests/prerender-dryrun-test.js`.
- `NO-NETWORK-REPORT.json` — hasil regenerasi gerbang (127 → 128 berkas dipindai).

Catatan sengaja: gerbang baru hanya menjerat `fetch`, tidak me-`require` http/https/net/dns.
`tests/no-network-test.js` menjaga daftar "jerat saja"-nya tetap satu nama; menambah nama kedua akan
melemahkan gerbang itu demi kenyamanan gerbang ini. Sebagai gantinya dipasang pemeriksaan teks:
skrip pra-render dilarang memuat http/https/net/tls/dns/child_process sama sekali, jadi satu-satunya
pintu jaringannya memang `fetch` yang dijerat.

## 6. Verifikasi (semua exit 0, dijalankan lokal)

```
node tests/prerender-plan-test.js      # 63 PASS, 0 FAIL, network.calls = 0
node tests/prerender-dryrun-test.js    # 45 PASS, 0 FAIL
node tests/tts-key-test.js
node tests/no-network-test.js          # 35 PASS (128 berkas dipindai)
node tests/regression-test.js
node tests/install-health-test.js
node tests/workflow-actor-gate-test.js
node tests/audio-asset-pipeline-test.js
node tools/prerender-tts.mjs                      # dry-run bawaan, exit 0, nol jaringan
node tools/prerender-tts.mjs --model=@cf/myshell-ai/melotts   # exit 1, model DITOLAK
```

Yang **belum** dilakukan dan memang bukan wewenang paket kerja ini: menjalankan `--apply`. Itu
membelanjakan uang owner (US$4,30 untuk batch pertama di aura-1) dan hanya bisa ditekan owner lewat
workflow_dispatch dengan `apply=APPLY` serta `budget_usd` yang dinaikkan secara sadar dari 1,00.
