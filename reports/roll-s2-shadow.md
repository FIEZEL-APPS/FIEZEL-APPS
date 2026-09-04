# S2 — Telemetri bayangan CF (branch `roll/s2shadow`)

**Ringkasan satu paragraf.** Mode `shadow` yang di-merge di W1 hanya menulis satu baris
`console.debug` per permintaan. Itu bukti yang hilang begitu tab ditutup, jadi tidak bisa dipakai
memutuskan endpoint mana yang dinyalakan lebih dulu. Yang ditambahkan di sini adalah PENGUMPUL
di perangkat: agregat ringkas per endpoint (hitungan per status, rata-rata latensi Puter vs CF,
apakah BENTUK jawaban cocok, dan kunci mana yang beda), plus tabel bacaannya di panel diagnostik
dan tombol copy. Perilaku murid tidak berubah sama sekali: jawaban tetap dari Puter, tidak pernah
ditunda, hasil CF tidak pernah ditampilkan. Dan karena semua flag CF masih `off`, hari ini modul
ini idle — nol permintaan bayangan, nol tulisan ke penyimpanan.

## Yang berubah (3 berkas diubah + 2 berkas baru)

| Berkas | Perubahan |
|---|---|
| `features/cf-shadow/fiezel-shadow-ledger.js` | **BARU** (~485 baris). Ledger agregat: `record`, `observe`, `read`, `summary`, `exportText`, `reset`, `sanitizeInput`, `shapeOf`, `compareShapes`. Allowlist field, allowlist endpoint, batas bita tegas + pemangkasan. |
| `cf-shadow-ledger-test.js` | **BARU** — gerbang node murni, **83 assert**, tujuh bagian (a)–(g). Tanpa dependensi, tanpa jaringan (lolos `no-network-test.js`). |
| `app.js` | HANYA di dalam blok `CF-TRANSPORT-BEGIN/END`: pembatas laju + pagar daya + pemanggil ledger. Di luar blok: nol baris. |
| `features/neural-voice/fiezel-diag-panel.js` | Tabel ringkasan bayangan per endpoint + tombol **Copy bayangan CF**. `DIAG_BUILD` tetap `m025-172`. |
| `.github/workflows/quality.yml` | `node cf-shadow-ledger-test.js` didaftarkan tepat sesudah `node cf-shadow-mode-test.js`. |

Tidak ada bump invarian build (`SW_REV`, `DIAG_BUILD`, `FIEZEL_PAGE_BUILD` tetap `m025-172`) —
itu wewenang MASTER saat merge. `*-REPORT.json` yang berubah sudah di-restore;
`CF-SHADOW-LEDGER-REPORT.json` sengaja **tidak** di-commit (regenerable, presedennya
`CF-SHADOW-MODE-REPORT.json` dari W1).

## 1. Privasi: allowlist, bukan blacklist — dan mengapa itu bukan formalitas

Larangannya ditulis utuh sebagai komentar kepala di modul: dilarang menyimpan atau mengirim isi
prompt, jawaban AI, teks murid, nama, email, uuid, IP, cookie, URL lengkap, dan body respons.
Yang menegakkannya bukan daftar larangan itu, tetapi penyaring positif:

```
FIELD_ALLOWLIST = ['endpoint','puterStatus','cfStatus','puterMs','cfMs','shapeMatch','diffKeys']
```

`sanitizeInput()` membuat objek BARU dan menyalin hanya tujuh field itu. Field lain tidak
di-skip satu-satu, ia memang tidak punya jalan masuk. Alasan memilih allowlist: blacklist hanya
menahan nama yang sudah kita bayangkan hari ini. Begitu ada yang menambah `q.sourceText` atau
`payloadPreview` enam bulan lagi, blacklist lolos dan allowlist menolak tanpa perlu diperbarui.

Tiga lapis lanjutan, karena allowlist saja masih bisa dibobol lewat NILAI dan lewat NAMA KUNCI:

1. **Nilai dipaksa jadi angka/boolean.** `endpoint` dicocokkan ke `ENDPOINT_ALLOWLIST`
   (`health, config, auth, quota, ai, tts, usage`) dan apa pun di luar itu jadi `'unmapped'` —
   jadi tidak ada string bebas yang tersimpan sebagai nama endpoint. Status dikurung 0..599,
   latensi 0..120000.
2. **Nama kunci disaring.** `diffKeys` bisa berisi nama kunci dari respons server, dan nama kunci
   adalah tempat teks bebas paling mudah menyelundup. Polanya sengaja sempit:
   `^[A-Za-z_][A-Za-z0-9_]{0,31}$`. Kunci API nyata (`ok`, `protocol`, `used_today`) muat; email,
   uuid, kalimat, dan nama orang tidak, dan jatuh ke satu ember `(kunci-tidak-baku)`.
   Ini diperketat SETELAH gerbangnya sendiri membuktikan pola pertama (`[A-Za-z0-9_.-]{1,32}`)
   masih meloloskan string seperti `TEKS-MURID-RAHASIA-XYZ`.
3. **Penyaringan diulang saat MEMBACA.** `sanitizeLedger()`/`sanitizeRow()` mencuci ulang isi
   penyimpanan setiap kali dimuat. Kalau ada yang menyunting `localStorage` dengan tangan dan
   menempelkan teks murid ke dalamnya, teks itu tidak hidup kembali ke dalam tabel maupun ekspor,
   dan tulisan berikutnya menimpanya dengan versi bersih.

Yang tercatat sebagai bukti penyaring bekerja hanyalah ANGKA: `dropped` = berapa field ditolak.
Namanya tidak disimpan, karena nama field yang ditolak bisa saja mengandung isinya.

## 2. Perbandingan BENTUK, bukan isi

`shapeOf()` mengambil kunci tingkat atas JSON dan tipe nilainya saja
(`{ok:'boolean', protocol:'string', used:'number'}`), lalu `compareShapes()` mengembalikan
`{match, diffKeys}` — daftar NAMA kunci yang hilang di satu sisi atau tipenya beda. Nilainya tidak
pernah keluar dari fungsi ini. Bukti di gerbang: dua jawaban dengan isi yang beda jauh dinilai
`match:true`, dan pada jalur nyata (jawaban AI palsu yang panjang lewat) tidak ada satu pun
substring nilai yang muncul di penyimpanan maupun ekspor.

Kenapa pembandingnya di modul dan BUKAN di blok transport: `cf-shadow-mode-test.js` melarang token
`.json()`, `.text()`, `.arrayBuffer()`, `document`, `innerHTML`, dan `localStorage` di dalam blok
sentinel. Itu pagar yang benar dan tidak saya lemahkan. Blok transport hanya meneruskan objek
respons; yang membaca body adalah ledger, dan HANYA lewat `response.clone().json()`. Respons yang
tidak punya `clone` (mis. objek Puter yang bukan `Response`) dicatat sebagai bentuk **tidak
diketahui**, bukan dipaksa dibaca — kalau body aslinya sampai habis, murid kehilangan jawabannya.
Gerbang mengunci ini: body asli jawaban Puter dicek belum tersentuh saat dikembalikan ke pemanggil
DAN masih belum habis sesudah bayangan selesai.

## 3. Agregat, bukan riwayat — dan pagarnya ada dua lapis

Baris per endpoint: `n`, `shapeMatch/shapeDiff/shapeUnknown`, `puterFail/cfFail`,
`puterMsSum/cfMsSum/deltaMsSum`, `statusPuter{}`, `statusCf{}`, `diffKeys{}`. Rata-rata dihitung
saat dibaca, bukan disimpan. Tidak ada satu pun entri per-permintaan, jadi tidak ada garis waktu
yang bisa dipakai merekonstruksi sesi seorang murid.

- Lapis 1, **batas per kunci**: maks 8 ember status dan 12 nama kunci per baris; kelebihannya
  DILIPAT ke ember `other`, tidak dibuang, supaya hitungan tetap menjumlah ke `n`. Gerbang
  memeriksa penjumlahan itu, bukan hanya jumlah kuncinya.
- Lapis 2, **pagar bita** `MAX_BYTES = 6000`: `fit()` memangkas berurutan — nama kunci beda dulu,
  lalu ember kunci dikosongkan, terakhir baris ber-`n` terkecil dibuang — dan menaikkan `pruned`
  supaya pemangkasan terlihat, bukan senyap.

Bukti bahwa ini benar-benar agregat: 50 permintaan = 2721 B, 500 = 3335 B, 5000 = 3539 B. Yang
tumbuh dari 500 ke 5000 hanyalah jumlah digit angkanya. Riwayat mentah akan tumbuh seratus kali.

Pagar bita mudah jadi hiasan yang tidak pernah dijalankan karena lapis 1 biasanya sudah cukup.
Karena itu gerbang membangun keadaan yang LOLOS semua batas per-kunci tetapi tetap melewati 6000 B
(delapan baris penuh dengan nama kunci sepanjang batas), lalu membuktikan `pruned > 0`.

## 4. Bayangan tidak boleh menyakiti murid

Empat pagar, semuanya dievaluasi SEBELUM `fetch` bayangan dipanggil, dan semuanya melaporkan
alasan lewat `console.debug` (bukan berhenti diam-diam):

| Pagar | Nilai bawaan | Sumber |
|---|---|---|
| Jeda minimum | 1 per 3000 ms | `FIEZEL_CF_CONFIG.shadow.minGapMs`, dikurung 50..600000 |
| Batas sesi | berhenti TOTAL setelah 40 | `FIEZEL_CF_CONFIG.shadow.maxPerSession`, dikurung 1..10000 |
| Offline | `navigator.onLine === false` → nol bayangan | — |
| Baterai lemah | `level <= 0.2` **dan** `charging === false` | `navigator.getBattery()` / `navigator.battery` |

Nilai bawaan berlaku kalau `CF_CONFIG.shadow` tidak ada — dan hari ini memang tidak ada di
`core-config.js`, karena berkas itu di luar lingkup tugas ini. Jadi yang berlaku sekarang adalah
1 per 3 detik / 40 per sesi. Counter-nya variabel modul, bukan penyimpanan: `sessionStorage`
dilarang di blok transport, dan pembatas laju per-sesi tidak perlu selamat dari reload.

Dua keputusan yang perlu disorot karena keduanya bisa jadi vakum:

- Baterai lemah **sambil mengisi** tetap boleh. Pagar yang berbunyi "baterai rendah → selalu mati"
  akan mematikan bayangan pada perangkat yang dipakai di meja sambil di-charge, yaitu justru
  kondisi paling aman. Gerbang menguji kedua arah.
- Perangkat tanpa Battery API (iOS/Safari, yaitu sebagian besar) **tidak** diblokir. Syarat yang
  tidak bisa dijawab tidak boleh diperlakukan sebagai jawaban "tidak aman", kalau tidak fitur ini
  mati di platform terbesarnya tanpa alasan yang bisa diukur.

Jawaban murid tidak pernah menunggu bayangan: `Promise.all([...])` hanya dipakai untuk MENGUKUR
latensi kedua sisi, dan berjalan setelah `answer` sudah dikembalikan. Gerbang membuktikannya dengan
CF yang sengaja dibuat lambat 120 ms.

## 5. Panel diagnostik + ekspor

Panel menampilkan tabel per endpoint: `n`, cocok, beda, `?` (tidak diketahui), gagal Puter/CF,
rata-rata ms Puter, rata-rata ms CF, selisih, dan kunci yang beda. Itulah yang dipakai memutuskan:
endpoint dengan `beda = 0`, `gagal = 0`, dan selisih latensi wajar adalah kandidat pertama untuk
dinyalakan; endpoint dengan `diffKeys` terisi berarti kontrak jawabannya belum sama dan harus
diperbaiki di Worker dulu.

Tombol **Copy bayangan CF** menyalin ringkasan sebagai teks. Ekspor dibangun dari agregat yang
sudah tersaring, jadi jaminan privasinya sama dengan butir 1 — gerbang tetap mengujinya terpisah
dengan menyuntikkan penanda PII di semua jalur lalu memastikan tidak satu pun muncul di teks
ekspor. Kalau modul ledger belum dimuat, panel menulis `(modul cf-shadow belum dimuat)` dan dump
JSON-nya tetap valid (`diag-panel-test.js` mem-`JSON.parse` dump itu).

## 6. Verifikasi

Semua exit 0:

| Gerbang | Hasil |
|---|---|
| `cf-shadow-ledger-test.js` (BARU) | PASS — 83 assert |
| `cf-shadow-mode-test.js` | PASS — 36 assert |
| `cf-transport-test.js` | PASS — 25 assert |
| `observability-privacy-test.js` | PASS (tidak dilemahkan, tidak disentuh) |
| `analytics-privacy-test.js` | PASS |
| `diag-panel-test.js` | PASS |
| `regression-test.js` | PASS |
| `ui-structure-test.js` | PASS |
| `install-health-test.js` | PASS |
| `no-network-test.js` | PASS — 35 assert, 128 gerbang dipindai |
| `boot-order-test.js`, `validator.js` | PASS |

Cakupan gerbang baru: (a) allowlist field — prompt/jawaban/teks murid/nama/email/uuid/IP/cookie
disuntikkan dan dibuktikan tersaring, dengan `dropped = 16`; (b) deteksi kunci hilang/tipe beda
tanpa menyimpan nilai; (c) batas ukuran dan dua lapis pemangkasan; (d) pembatas laju, batas sesi,
offline, baterai; (e) jawaban CF tidak pernah jadi jawaban murid dan tidak pernah menunda;
(f) ekspor bebas PII; (g) agregat selamat reload dan penyimpanan yang dirusak tangan disaring ulang.

## Yang MASIH belum ada (wewenang OWNER/MASTER)

1. **Modul belum dimuat di runtime.** `features/cf-shadow/fiezel-shadow-ledger.js` belum punya
   tag `<script>` di `index.html` dan belum masuk daftar precache `sw.js`. Kedua berkas itu di luar
   lingkup tugas ini dan menyentuhnya berarti menyentuh invarian build. Sampai itu dilakukan, panel
   akan menulis `(modul cf-shadow belum dimuat)` dan blok transport akan lewat begitu saja
   (`if (!ledger) return`) — aman, tapi tidak mengumpulkan apa pun.
2. **Semua flag CF masih `off`.** Jadi mode `shadow` belum pernah berjalan di perangkat nyata sama
   sekali. Semua bukti di atas berasal dari gerbang, bukan dari lapangan. Jangan bacakan tabel
   panel sebagai data produksi sampai minimal satu endpoint diputar ke `shadow`.
3. **`CF_CONFIG.shadow` belum ada di `core-config.js`.** Batas laju hanya bisa diubah dengan
   menambahkan blok itu. Kalau MASTER mau membaca hasil lebih cepat saat uji lapangan,
   `minGapMs` lebih kecil harus diputar dari sana, bukan dengan mengedit `app.js`.
4. **Yang belum diukur sama sekali:** kebenaran ISI jawaban CF. Ledger ini hanya bilang bentuknya
   sama; ia tidak dan tidak akan bisa bilang jawabannya benar. Keputusan menyalakan endpoint `ai`
   tidak boleh diambil dari tabel ini saja.
