# FIEZEL HANDOFF: STEMPEL INGATAN (m025-565)

## 1. Kenapa

BrainCore sudah lama mengingat setiap jebakan murid lintas sesi lewat buku besar miskonsepsi
(`features/brain/fiezel-misconception-ledger.js`): berapa kali, di sesi mana, kapan pertama.
Ingatan itu hanya menggerakkan tutor diam-diam. Murid tidak pernah mendengarnya pada detik
setelah ia menjawab, jadi FIEZEL terbaca sebagai "kuis pilihan ganda biasa".

Stempel Ingatan menampilkan ingatan itu sebagai **satu baris meta** di kotak umpan balik yang
sudah ada. Visualnya sengaja datar (12px, abu muted, tanpa ikon/bar/animasi). Yang dibuat
kuat adalah ketepatan kalimatnya.

## 2. Perilaku

| Jenis | Kapan | Contoh (id) |
|---|---|---|
| `pertama` | salah, jebakan bernama baru pertama kali | Fiezel mencatat jebakan di balik “at”. Kalau muncul lagi, Fiezel akan ingat. |
| `sesi-ini` | salah, berulang tapi semuanya di sesi ini | Jebakan di balik “at” sudah 2 kali menangkapmu di sesi ini. |
| `lagi` | salah, pernah menangkap di sesi lain | Ketemu lagi. Jebakan di balik “at” sudah 3 kali menangkapmu, pertama kali hari Jumat. |
| `lagi-polos` | sama, tapi waktu sesi pertama tak terbaca | … di 2 sesi berbeda. |
| `lolos` | benar, pengecoh jebakan (≥2 kali) tampil di layar; sekali per jebakan per sesi | Jebakan di balik “at” sudah 3 kali menangkapmu. Kali ini kamu tidak terpancing. |
| `jinak` | benar, dan jawaban ini menurunkan jebakan yang pernah aktif ke ≤0,3 | Menurut catatan Fiezel, jebakan yang dulu 3 kali menangkapmu di materi ini kini sudah jinak. |

"Kapan pertama" dihitung dalam hari belajar murid (zona waktunya sendiri): `tadi, di sesi
sebelumnya` / `kemarin` / `hari Senin` (< 7 hari) / `tanggal 21 Sep`. Locale th memakai Intl
`th-TH` (วันจันทร์, 21 ก.ย.).

Stempel **selalu menyebut teks pilihannya**. Pembahasan yang terbuka sesudah percobaan kedua
membahas pilihan kedua, sedangkan stempel selalu tentang percobaan pertama (satu-satunya yang
masuk ledger). Tanpa nama pilihan, "jebakan ini" akan menunjuk pilihan yang salah. Probe
browser menemukan ini, dan kalimatnya diubah karenanya.

## 3. Aturan kejujuran

- Hanya miskonsepsi bernama (`precision === 'misconception'`). `unclassified:*` tidak pernah
  disebut "jebakan yang sama".
- Semua angka diambil dari entri ledger (`hits`, `sessions`). Tidak ada persentase dan tidak ada
  statistik murid lain.
- Tebakan (< 1800 ms) tidak distempel. Tutor sudah menegurnya (`brain-tutor.timing-guess`), dan
  benar karena menebak bukan kemenangan.
- Hanya latihan mandiri (`memoryStampAllowed`). Mati di `MEASURE` (tes penempatan, Ujian Skip
  Level, gerbang lewati materi), `noHints`, set berformat ujian (`examKind`), dan setiap kunci
  ujian aktif, termasuk tugas guru (`kind: 'assignment'`). Gerbang ditanya dua kali: saat
  stempel dihitung dan saat dirender.
- Sakelar produk: `memoryStamp` di `fiezel-ux-flags.js` (bawaan `true`). Bisa dimatikan per rilis
  tanpa revert, atau per perangkat lewat override QA `fiezel-ux-flags-override-v1`.

## 4. Berkas

- `app.js`: blok `memoryStampAllowed` / `memoryStampShownOptions` / `memoryStampDecide` /
  `memoryStampWhen` / `memoryStampText` / `memoryStampForAnswer` (sesudah
  `misconceptionLedgerRecord`). Kabel di percobaan pertama quizLoop (potret ledger sebelum
  `tutorObserve`), render `<div class="feedback-stamp">` tepat di bawah `.feedback-title`.
  Bendera di `UX_FALLBACK_FLAGS`.
- `features/i18n/copy-id-redesign.js` + `copy-th-redesign.js`: 10 kunci `stempel.*`.
- `style.css` (aturan dasar) + `features/ui/fiezel-tactile-clay.css` (pemenang kaskade di lembar
  umpan balik gelap): 12px (13px untuk th), `#94A3B8`.
- `fiezel-ux-flags.js`, `tests/ux-flags-test.js`: bendera `memoryStamp`.
- `tests/memory-stamp-test.js` (baru, terdaftar di `quality.yml`): 22 uji. Mencakup keputusan
  dengan ledger + Tutor Brain asli, gerbang mode, naskah dua bahasa lewat FiezelI18n asli,
  kabel, dan CSS.
- Trio build dinaikkan lewat `node tools/bump-build.mjs` ke `m025-565`.

## 5. Verifikasi

- `node tests/memory-stamp-test.js`: 22/22. Diuji mutasi: menghapus gerbang kunci ujian, filter
  tebakan, filter `unclassified`, pagar "lolos sesudah jinak", atau posisi render, masing-masing
  memerahkan gerbang.
- Probe Chromium nyata (390×844): stempel tampil di latihan mandiri id dan th, 12px/13px,
  `rgb(148,163,184)`, animasi `none`. Pada Ujian Skip Level kotak hanya berisi "Tersimpan." tanpa
  stempel. Tangkapan layar tidak masuk repo (`*.png` diabaikan `.gitignore`); harness probe-nya
  memakai pola `tools/dev/probe-grammar-retry-screenshot.js`: ledger diisi dua bukti dari dua
  sesi lampau, lalu jawaban salah di `quizLoop({type:'quick'})` dan `{type:'level-exam'}`.

## 6. Belum dikerjakan (sengaja)

- **A/B 50/50.** `features/ui/fiezel-ab-testing.js` adalah pipa telemetri UI, bukan alat
  eksperimen hasil belajar, dan memotong separuh murid adalah keputusan produk. Yang ada sekarang
  sakelar per rilis + override per perangkat.
- **Metrik.** Survei mikro "FIEZEL ngerti kelemahanku" dan laju jebakan aktif yang menjadi jinak
  belum diinstrumentasi.
- **Julukan jebakan** (mis. "Si -ing Rakus") untuk 49 kode kanonik. Stempel memakai teks pilihan
  sebagai identitas.
- **Tinjauan penutur Thai** untuk 10 nilai th (draf, sama seperti naskah th lain).
