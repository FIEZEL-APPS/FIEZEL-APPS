# m025-154 — Kebenaran pedagogis: soal yang MENGAJARKAN hal salah

**Status: SEDANG BERJALAN. Dokumen ini supaya agent berikutnya tidak mulai dari nol.**

OWNER melaporkan hal yang mengubah prioritas seluruh pekerjaan ini:

> "sudah ada user melaporkan nilai mereka di sekolah turun setelah belajar di fiezel,
> karena fiezel mengajarnya salah"

Itu keluhan yang berbeda dari insiden m025-149. Insiden itu soal konten RUSAK (teks
teraduk, kunci hilang, instruksi internal bocor). Yang ini soal konten yang **tampak
rapi tetapi mengajarkan yang keliru** — dan itu justru lebih berbahaya, karena tidak
ada satu pun gerbang yang menangkapnya.

---

## 1. Celah yang baru ditemukan, dan ini yang penting

Seluruh gerbang yang sudah ada — `content-integrity-audit.js`, `contentIntegrityGate()`,
`content-qa-agent`, `grammar-quality-audit` — memeriksa **struktur dan relasi**:
apakah kunci ada, apakah pilihan unik, apakah bukti ada di bacaan, apakah bahasanya
konsisten.

**Tidak satu pun memeriksa apakah kuncinya BENAR secara tata bahasa.**

Sebuah soal bisa lolos semua gerbang dengan sempurna dan tetap mengajarkan bahwa
"reject" salah untuk "decline". Murid menulis Bahasa Inggris yang benar, ditandai
salah, lalu membawa keyakinan keliru itu ke ulangan di sekolah. Itulah mekanisme
turunnya nilai.

Bentuk kerusakan yang harus dicari — urut dari yang paling merusak:

| Jenis | Kenapa merusak |
|---|---|
| **Pengecoh juga benar** | Murid menjawab benar, dinyatakan salah, lalu "memperbaiki" pengetahuan yang sudah benar |
| **Kunci salah** | Murid menghafal bentuk yang keliru |
| **Stem salah** | Murid membaca contoh Inggris yang tidak baku |
| **Penjelasan keliru** | Murid menghafal aturan yang tidak berlaku |

## 2. Yang SUDAH diperbaiki di m025-154

### Grammar — 4 soal (dari 139 yang ditelaah satu per satu)

| ID | Masalah | Perbaikan |
|---|---|---|
| `CM-002` | Stem "This laptop is ___ the one I had before, so I don't need an upgrade" — **"faster than" sama benarnya** secara tata bahasa DAN logika. Kunci "as fast as" bukan satu-satunya jawaban. | Stem diganti jadi "— both take exactly ten seconds to start up", sehingga hanya kesetaraan yang cocok |
| `b4_001` | Kunci "will have been working"; tetapi **"will have worked ... for over two decades" adalah Inggris baku yang benar** | Dijadikan soal PEMBEDA ("Which completion emphasizes the duration accumulating...") |
| `b5_005` | Kunci "weren't"; tetapi **"hadn't been" adalah third conditional baku yang benar** | Dijadikan soal PEMBEDA ("Which completion presents his fear as an ongoing trait...") |
| `b5_012` | **Stem-nya sendiri bukan Inggris baku**: "I have exactly two closest friends" | → "two close friends" |

Pola perbaikan untuk kasus "pengecoh juga benar": **jangan mengganti pengecohnya** —
ubah soal menjadi soal pembeda dengan kriteria eksplisit di stem. Bank ini memang sudah
memakai pola itu (`MO-002`, `MO-004`, `GI-004`, `b4_004`, `b4_005`, `b5_003`, `b5_016`,
`b5_022`), jadi konsisten dengan gaya rumah.

### Kosakata — perbaikan di AKAR, bukan per-kata

Dua cacat terukur, keduanya sudah nol sesudah perbaikan:

**(a) Soal sinonim dua-jawaban-benar — 5 kata.** `makeVocabQuestion` hanya menyingkirkan
KUNCI dari kolam pengecoh, sehingga sinonim LAIN milik kata target tetap bisa terpilih:

```
decline  [sinonim: refuse, reject]   kunci="refuse"   pengecoh="reject"   <- keduanya benar
applaud  [clap, praise]              kunci="clap"     pengecoh="praise"
arrange  [organize, plan]            kunci="organize" pengecoh="plan"
assure   [reassure, guarantee]       kunci="reassure" pengecoh="guarantee"
beautify [decorate, adorn]           kunci="decorate" pengecoh="adorn"
```

Diperbaiki di `app.js`: pengecoh kini menyingkirkan **seluruh** sinonim kata target,
kata targetnya sendiri, dan kata mana pun yang artinya sama persis.

**(b) Soal arti berbagi padanan.** Arti di bank kerap berisi beberapa padanan dipisah
titik koma ("pasti; jelas"). Pengecoh yang berbagi salah satu padanan sama-sama bisa
dibela. Kini pengecoh disaring per-padanan, bukan hanya per-teks-utuh.

Verifikasi sesudah perbaikan: `sinonim dua-jawaban-benar: 0` (sebelumnya 5),
`arti berbagi padanan: 0`, `soal arti kurang pilihan: 0` (tidak ada efek samping).

## 3. YANG BELUM DIKERJAKAN — mulai dari sini

### 3a. Arti kosakata yang salah jenis kata (BELUM diperbaiki, sudah teridentifikasi)

Tujuh pasang kata berbagi arti Indonesia identik di level sama. Lima wajar (memang
sinonim), **dua adalah kesalahan nyata**:

```
damage (merusak)     vs destructive (merusak)     <- destructive itu KATA SIFAT,
                                                     artinya "yang bersifat merusak"
definite (pasti; jelas) vs definitely (pasti; jelas) <- definitely itu KATA KETERANGAN,
                                                     artinya "tentu saja; pastinya"
```

Yang wajar dan TIDAK perlu diubah: `anybody`/`anyone`, `bring`/`carry`,
`boldly`/`bravely`, `bold`/`courageous`, `fastidious`/`meticulous`.

Cara menemukan lagi: bandingkan `partOfSpeech` dengan bentuk arti Indonesianya —
kata sifat seharusnya tidak diglos sebagai kata kerja.

### 3b. Telaah ahli 139 soal grammar — SELESAI, 13 cacat diperbaiki

Tiga peninjau independen menelaah ulang seluruh 139 template sebagai mata kedua atas
telaahku. Mereka menemukan **9 cacat tambahan** yang kulewatkan. Seluruhnya sudah
diperbaiki. Daftar lengkap 13 perbaikan ada di bagian 2.

Yang paling berbahaya dari temuan mereka:

- **`RC-002` mengajarkan kaidah yang SALAH.** rule-nya berbunyi "klausa relatif aktif
  dengan who/which sebagai subjek direduksi jadi present participle". Itu tidak berlaku
  untuk past simple. Menurut kaidah itu murid akan menulis "The man breaking the window
  ran away" untuk "The man who broke the window ran away". Kaidahnya kini dibatasi ke
  makna berlangsung/simultan dan keadaan umum, dan stem-nya diubah agar memang berlatar
  berlangsung.
- **`PR-002` menghukum Inggris Britania yang benar.** Pengecoh "at / in" menghasilkan
  "the hotel is in Baker Street" — itu baku BrE, dan Baker Street justru jalan di London.
  Pengecoh diganti "at / to", dan kaidah yang menyatakan "in + nama jalan" keliru sudah
  dicabut.
- **`PA-005` mengajarkan bentuk yang tidak ada.** rule-nya menulis "It + is/are + past
  participle"; subjek semu "it" tidak pernah berpasangan dengan "are".
- **`A1-003`** satu-satunya soal A1 yang kuncinya tidak tunggal ("drank" juga benar untuk
  kebiasaan lampau). A1 dipakai pemula, jadi paling merusak. Stem diberi jangkar "These days".

### 3c. Reading — BELUM ditelaah untuk kebenaran pedagogis sama sekali

1.500 soal reading belum pernah diperiksa dengan pertanyaan "apakah buktinya
benar-benar mendukung kuncinya?". Gerbang yang ada hanya memastikan `meta.evidence`
ADA di dalam teks — bukan bahwa ia **membuktikan** jawabannya. Ini celah besar
yang masih terbuka.

### 3d. Penulisan ulang bacaan reading (terpisah, sudah jalan sebagian)

276 dari 300 bacaan adalah kembaran template. Penulisan ulang sedang berjalan:

- **A2 dan B1 SELESAI** 50/50, lolos validator, sudah di-commit
- **A1** tinggal batch terakhir (r0041-r0050); batch 1-4 ada di `.reading-new/parts/`
- **B2** 20/50 (r0151-r0170) — perlu 30 lagi, dan ada satu stem kembar r0169#0 vs r0151#0
- **C1, C2** belum mulai

Alat: `tools/reading-bank-validate.mjs <berkas> <LEVEL>` (per level) dan
`tools/reading-bank-assemble.mjs` (gabung + cek gradasi CEFR).

Temuan penting yang sekalian diperbaiki penulisan ulang ini: **keenam level CEFR
panjangnya identik** (median 57 kata, A1 sampai C2 sama saja). Target baru:
A1 45-65, A2 70-95, B1 105-135, B2 150-190, C1 200-250, C2 265-330.

### 3e. Gerbang otomatis untuk "pengecoh juga benar" — BELUM ADA

Ini yang paling berharga untuk dibangun berikutnya. Cacat ini **tidak bisa** ditangkap
struktur; ia butuh penilaian bahasa. Usulan: gerbang yang menandai soal non-pembeda
yang punya lebih dari satu pilihan gramatikal, untuk ditelaah manusia/LLM — bukan
ditolak otomatis.

## 4. Peringatan untuk agent berikutnya

1. **Ada agent lain bekerja paralel di repo ini.** Main sudah bergerak 48 commit dalam
   satu sesi. SELALU `git fetch` dan merge main sebelum menilai apa pun, kalau tidak
   kamu menelaah kode basi.
2. **Jangan percaya gerbang hijau sebagai bukti kebenaran.** 96/96 hijau dan auditor
   0 CRITICAL, sementara `decline`/`reject` tetap mengajarkan yang salah. Gerbang
   memeriksa bentuk, bukan kebenaran.
3. **Jangan "memperbaiki" soal yang tidak rusak.** Aku sempat menandai TA-006/TA-004
   dan CO-003/CO-002 sebagai cacat label; setelah diperiksa, label Indonesianya memang
   sama karena miskonsepsi Inggrisnya memang sama. Yang keliru gerbangku, bukan datanya.
   Periksa dulu sebelum mengubah.
4. **Soal berframing "Which completion..." memang boleh punya beberapa pilihan
   gramatikal.** Itu soal pembeda, bukan cacat. Jangan laporkan sebagai temuan.
5. **Ritual build** naik bersama di `core-config.js`, `fiezel-diag-panel.js`, `sw.js`.
   Main sudah di m025-153; branch ini m025-154. A11 menuntut tepat +1 dari base.

## 5. Cara memverifikasi

```bash
node content-integrity-audit.js          # 0 CRITICAL wajib
node content-integrity-gate-test.js      # gerbang runtime + kontrol positif
node grammar-memory-scope-test.js        # provenance pilihan grammar
node grammar-quality-audit.js
node bank-soal-audit-test.js
node lesson-experience-test.js           # 139 lesson x 25 mode tetap terisi penuh
```

Seluruh suite `.github/workflows/quality.yml` harus hijau sebelum apa pun dianggap
selesai. Terakhir diperiksa: 96/96 hijau, auditor 0 CRITICAL.

## 6. Jujur soal batasnya

Aku menelaah 139 soal grammar satu per satu dan menemukan 4 yang cacat. Itu **bukan**
jaminan tidak ada yang kelima. Telaah manual satu orang punya batas, dan itulah
sebabnya tiga peninjau independen dijalankan sebagai mata kedua.

Untuk kosakata (1.765 kata) dan reading (1.500 soal), telaah setara **belum dilakukan**.
Yang sudah dilakukan hanya pemeriksaan yang bisa diotomatiskan. Klaim "tidak ada
kesalahan sama sekali" tidak bisa kubuat dengan jujur hari ini, dan agent berikutnya
sebaiknya juga tidak membuatnya sebelum 3c dan 3a tuntas.
