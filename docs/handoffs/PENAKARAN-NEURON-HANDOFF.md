# HANDOFF — Penakaran neuron rute warisan, dan tabrakan dua PR (m025-309)

**Status:** SELESAI untuk cakupan di bawah; tiga keputusan OWNER masih terbuka.
**Otoritas:** OWNER. Tidak ada satu pun butir "terbuka" di bawah yang boleh diputuskan
agen tanpa persetujuan OWNER — semuanya menyangkut biaya nyata atau penghapusan aset.

---

## 1. Apa yang diperbaiki, dan kenapa itu penting

`workers/api/route-legacy.js` mengeja `ctx.env.AI.run(...)` langsung di lima tempat,
memintas titik cekik `ai/model-call-gate.js`. Akibatnya sebagian rute `/api/ai/*`
membelanjakan neuron **tanpa dihitung** terhadap plafon akun — sementara plafon
10.000 neuron/hari ditanggung bersama SELURUH murid. Yang memakan jatah tanpa
tercatat membuat jatah habis lebih cepat daripada yang diketahui siapa pun, lalu AI
mati untuk murid sungguhan.

Kelima rute itu: `/api/ai/chat`, `/api/ai/translate`, `/api/coach/context`,
`/api/content/qa/review`, `/api/content/patch/candidate`. Tiga yang pertama **masih
dipakai klien** (dua dari `app.js`, satu dari modul subtitle), jadi mematikannya
bukan pilihan.

## 2. Tabrakan dengan PR #409 — dan kenapa versi ini mengalah

PR #409 mendarat di `main` saat PR #410 berjalan, mengerjakan pekerjaan yang SAMA.
Merge bertabrakan di enam berkas. Penyelesaiannya dinilai per berkas, bukan
"pertahankan milik sendiri":

| Berkas | Putusan | Alasan |
|---|---|---|
| 5 gerbang basi | **ambil #409** | #409 melacak tiap kontrak pensiun ke PENERUSNYA (`readBoundedJson()`, `ownerGate()`, `validReportEndpoint()`). Pendekatan #410 adalah penjaga terbalik yang menunggu berkas terhapus kembali — ia menjaga kontrak yang mungkin tidak pernah kembali, sedangkan #409 menguji perilaku yang hidup sekarang. |
| `route-wiring.js` | **buang milik #410** | `reserveNeuronsForEnv()` + `callModelMetered()` menjadi kode mati begitu `route-legacy.js` memakai perakitan #409. |
| `route-legacy.js` | **dasar #409 + 3 tempelan** | lihat bagian 3. |

## 3. Tiga perbaikan yang hanya ada di sini

1. **Maskot.** Sapaan cadangan `/api/ai/chat` masih berbunyi *"Halo! Saya Nusa & Mira"*.
   Penggantian maskot m025-307 hanya menjangkau berkas klien; kalimat ini hidup di
   Worker dan tertinggal. Ia bukan naskah mati — inilah yang dibaca murid setiap kali
   AI tidak tersedia. Kini PAW.

2. **Galat mentah ke murid.** `catch` rute chat menulis `AI response fallback: ${e.message}`.
   Sebelum penakaran, cabang itu hampir tak pernah kena. **Penakaran #409 sendiri yang
   mempersenjatainya**: penolakan plafon kini lewat jalur yang sama, jadi murid akan
   membaca `AI response fallback: ai_account_cap:...`. Sapaan yang bisa dibaca kini
   dipertahankan.

3. **Penanda tata kelola rute owner.** `authority` dan `gateStatus` hanya hidup di
   komentar kontrak, tidak pernah di satu pun objek respons. Tiga akibatnya:
   konsumen kehilangan peringatan "belum terverifikasi";
   `features/brain/fiezel-content-chain.js` memindahkan `gateStatus` dari nilai yang
   tidak pernah dikirim worker; dan `product-audit.js` — yang meng-assert sumber Worker
   memuat `authority:'candidate-only'` dan `UNVERIFIED_LOCAL_GATES_REQUIRED` sebagai
   bukti mutasi kanonik tetap tertutup — **lolos berkat komentar**. Audit itu kini
   menguji keluaran sungguhan.

## 4. Biaya per permintaan

`@cf/meta/llama-3.1-8b-instruct` tidak punya angka terukur sendiri di `ai/ai-tasks.js`.
Saudara terdekatnya varian `-fp8` adalah 12,5 neuron/permintaan dan non-fp8 tidak lebih
murah, jadi dibulatkan KE ATAS — arah yang sama yang dipilih `accountNeuronsFor()`:
memesan kelebihan aman untuk dompet, memesan kekurangan tidak.

---

## 5. LANGKAH BERIKUTNYA — terbuka, menunggu OWNER

1. **Titik buta gerbang cap.** Assert C1-C5 di `tests/ai-account-cap-gate-test.js` hanya
   menemukan modul yang mendefinisikan `registerXxxRoutes(`. Modul berbentuk
   `export const ROUTES` — seperti `route-legacy.js` — lolos dari tuntutan fixture
   sepenuhnya. Melebarkannya menuntut lima fixture baru.

2. **Perakitan tanda terima terduplikasi.** `route-legacy.js` kini memanggil
   `ModelCallGate.makeReservation()` sendiri dan menyalin resolver `umd()` dari
   `route-wiring.js`. `model-call-gate.js` secara eksplisit memperingatkan agar bentuk
   tanda terima tidak diketik di dua tempat yang bisa menyimpang. Menyatukannya adalah
   refactor tersendiri.

3. **Maskot & aset.** MIRA sisi guru di `landing.html` belum diputuskan, dan direktori
   `assets/characters/` 39 MB masih dikonsumsi `remotion/src/Scene.jsx`,
   `design/redesign-v2/`, serta `character-preview.html`.

4. **Utang naskah dua bahasa.** Naskah sisi Worker (`route-legacy.js`) seluruhnya
   Indonesia saja, di luar sistem `FiezelI18n`. Murid Thai membacanya sebagai layar
   campur. Memindahkannya ke pasangan copy-id/copy-th menuntut i18n sisi server yang
   belum ada. Dicatat sebagai utang bertanggal 2026-09-13.

---

## 6. LANJUTAN m025-310 — plafon akun ada, tetapi jatah MURID dan tombol mati belum

Penakaran m025-309 di atas menutup pertanyaan **"berapa tagihannya"**. Ia TIDAK menutup dua
pertanyaan lain, dan keduanya ditemukan saat OWNER bertanya "apakah sistemnya sudah menerapkan
jatah AI per akun murid?" — pertanyaan yang jawabannya ternyata *belum*, di jalur yang justru
paling dipakai.

### Apa yang bolong

Kuota harian per murid (`quota/quota-config.js`: 25 ai/hari, 15 di antaranya terjemahan) dan
gerbang flag `cfAiEnabled` **keduanya dipasang pada PIPA**, bukan pada rute: P3 membungkus rute
yang keluar dari `registerAiRoutes`, S3 menambahkannya untuk TTS. SLOT 5 disebar mentah di
`route-slots.js` (`...LEGACY_ROUTES`) — ia tidak pernah lewat `wrapMetered`, jadi tidak pernah
lewat keduanya. Akibatnya, pada rute yang benar-benar dipakai aplikasi:

| | `/api/ai/task` | `/api/ai/chat` (dipakai app.js:coreWorkerExec) |
|---|---|---|
| wajib login | ya | ya |
| plafon neuron akun | ya | ya (m025-309) |
| **kuota harian per murid** | ya | **tidak** |
| **flag `cfAiEnabled`** | ya | **tidak** |

Dua akibatnya berbeda sifat, dan keduanya nyata:

1. **Plafon akun menjaga TAGIHAN, bukan KEADILAN.** Satu murid rajin — atau satu skrip dengan
   satu sesi sah — bisa menghabiskan kolam 8.000 neuron milik seluruh murid dalam sehari.
   Tagihannya tetap aman; yang hilang adalah AI bagi murid lain.
2. **"Matikan AI" tidak mematikan jalur utama.** Itu lubang P3/S3 yang KEMBALI lewat jalur
   ketiga — bukan varian baru.

### Apa yang dikerjakan

`aiSpendGate(bucket, handler)` diekspor dari `route-wiring.js` dan dipakai `route-legacy.js`
lewat tabel `AI_SPEND_ROUTES`. Ia memakai `enforceQuota` dan `checkAiEnabled` **yang itu juga** —
bukan salinan: dua mekanisme untuk satu maksud adalah cara celah keempat lahir. Urutannya sama
dengan P3/S3: identitas (401) → flag (403) → store kuota ada (503) → reserve (429) → handler →
commit/rollback.

Bucket: `ai` untuk chat dan coach, `aiTranslate` untuk terjemahan (SUB-kuota — satu terjemahan
menaikkan keduanya, jadi subtitle tidak bisa memakan jatah penjelasan tutor), dan `null` untuk
dua rute OWNER: menagih jatah MURID di sana berarti sesi QA owner memakan 25/hari miliknya
sebagai murid, sedangkan yang perlu dijaga di sana adalah tagihan — sudah dijaga plafon akun.
Flag tetap berlaku untuk rute owner, karena neuronnya dari kolam yang sama.

`allowAiRequest` (pembatas laju in-memory, 40/jam) **dihapus, bukan dilonggarkan**: Map-nya hidup
di memori satu isolate sehingga hitungannya nol lagi setiap isolate baru, angkanya 40/jam =
960/hari (38× plafon 25/hari yang dipilih OWNER), dan ia hanya dipasang di satu dari lima rute.

### Titik buta nomor 1 di bagian 5: sebagian TERTUTUP

Butir 5.1 di atas benar — `tests/ai-account-cap-gate-test.js` hanya menemukan modul berbentuk
`registerXxxRoutes(`, jadi modul `export const ROUTES` lolos. `tests/ai-legacy-spend-gate-test.js`
tidak menunggu lima fixture itu: ia MEMBACA `route-legacy.js`, mencari setiap rute yang badan
handlernya memanggil `runLegacyModel(`, lalu menuntut rute itu terdaftar di `AI_SPEND_ROUTES`.
Rute keenam yang kelak memanggil model akan memerahkan gerbang walau tidak ada yang ingat
memperbarui daftarnya. Perilakunya diuji terhadap SQL kuota SUNGGUHAN (`node:sqlite` + migrasi
`0001_quota.sql`), bukan terhadap tiruan: jatah habis → 429 tanpa menyentuh model, tanpa D1 →
503 fail-closed, terjemahan menaikkan kedua penghitung. Empat mutasi diuji dan keempatnya
memerahkannya.

Yang MASIH terbuka dari 5.1: gerbang cap untuk modul `export const ROUTES` **lain** (kalau kelak
ada) tetap tidak menuntut fixture. Yang ditutup di sini khusus SLOT 5.

### Kesalahan rancangan yang tertangkap gerbang repo, dan pelajarannya

Versi pertama `aiSpendGate()` menaruh gerbang flag **paling depan** supaya rute owner — yang
tidak punya sesi murid — tidak terbentur 401. Itu melanggar aturan yang sudah tertulis di
komentar P3: penolakan flag diletakkan SESUDAH identitas "supaya keadaan otentikasi tidak
boleh terbaca dari perbedaan ini". Konsekuensinya bukan kosmetik: dengan 403 di depan, siapa
pun di internet bisa membedakan token yang sah dari yang tidak hanya dari selisih kode
jawaban, tanpa pernah punya kredensial.

`tests/cf-api-contract-test.js` yang menangkapnya — ia mengirim badan kecil tanpa identitas ke
ketiga rute dan menuntut 401, lalu menerima 403. **Tesnya benar dan pagarnya salah.**

Yang benar bukan memilih salah satu melainkan memisahkan dua jenis rute: rute BERJATAH
menuntut identitas dulu (401 → 403, kanon P3 pulih), rute OWNER tidak menuntut identitas
murid sama sekali sehingga pertanyaan urutannya tidak lahir. Sifat itu sekarang dipaku di
DUA tempat — tes kontrak dan `tests/ai-legacy-spend-gate-test.js` butir (b2), yang menjelaskan
alasannya di tempat — dan mutasi "flag dikembalikan ke depan" memerahkan keduanya.

Pelajaran yang layak dibawa: pagar baru yang dipasang demi satu kasus khusus (rute owner tanpa
sesi murid) bisa mematahkan sifat keamanan yang sudah dimenangkan di tempat lain. Yang
menyelamatkannya adalah gerbang yang menguji URUTAN penolakan, bukan hanya hasil akhirnya.

### Masih terbuka sesudah ini

- **Batas 12.000 char di `/api/ai/chat`** tidak diselaraskan dengan `FREE_MAX_PROMPT_CHARS`
  (4.000) milik jalur berkuota. Menurunkannya mengubah perilaku permukaan yang hidup, jadi ia
  KEPUTUSAN OWNER, bukan perapian. Dicatat 2026-09-13.
- **Kuota `ai` ditagih walau model gagal** dan rute menjawab teks cadangan **200**:
  `enforceQuota` meng-commit karena handler mengembalikan tanpa melempar. Konservatif ke arah
  melindungi kolam, tetapi tidak adil bagi murid yang tidak mendapat jawaban. Memperbaikinya
  menuntut rute melaporkan "tidak terlayani" ke gerbang — perubahan kontrak, bukan tambalan.
  **Hanya kasus 200 ini yang masih terbuka**; lihat butir di bawah untuk yang sudah ditutup.

### Ditutup sesudah review: jatah ditagih untuk permintaan yang ditolak SEBELUM model

Review bot menemukan kasus yang BERBEDA dari utang di atas, dan pengukurannya membenarkannya:
handler SLOT 5 menolak sebagian permintaan sebelum model pernah dipanggil
(`prompt_too_long`, `text_too_long` → 400) dan penolakan itu **di-return, bukan dilempar** —
sedangkan `enforceQuota` meng-commit setiap kali `next()` kembali tanpa melempar dan sengaja
tidak memeriksa status jawaban. Diukur pada handler yang sungguhan: **400, nol panggilan
model, `ai_used` tetap naik 1**. Murid yang menempelkan teks terlalu panjang kehilangan satu
dari 25 jatah hariannya untuk permintaan yang ditolak server.

Bedanya dengan utang di atas menentukan: di sana model sudah disentuh (tagihan sudah terjadi),
di sini belum pernah.

Ditutup dengan kanal yang MEMANG dirancang, bukan mekanisme baru: `commitD1` menerima `actual`
per-bucket, di-clamp ke yang direservasi dan minimal 0, jadi `actual:{<bucket>:0}` menagih nol
sekaligus melepas `held` — dan `enforceQuota` membacanya dari `result.actual`. Hasil handler
dibungkus lalu dibuka kembali daripada menempelkan `.actual` ke objek `Response`: yang
belakangan bekerja di Node hari ini tetapi mengandalkan objek bawaan runtime tetap bisa
ditambahi properti, asumsi yang tidak perlu diambil.

Dijaga empat assert di `tests/ai-legacy-spend-gate-test.js` butir (d2) — termasuk assert
KEBALIKANNYA ("yang dilayani tetap ditagih"), supaya "jangan tagih yang gagal" tidak diam-diam
menjadi "jangan tagih apa pun" — dan tiga mutasi yang ketiganya memerahkannya.
