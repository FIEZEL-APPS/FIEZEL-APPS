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

## 5. KEEMPAT BUTIR ITU SUDAH DIKERJAKAN (m025-310)

Bagian ini dulu berisi empat butir terbuka. OWNER meminta semuanya dilanjutkan; berikut
hasilnya, termasuk yang TIDAK selesai.

### 5.1 Titik buta gerbang cap — SELESAI
Penemuan C1-C5 hanya mengenali modul ber-`registerXxxRoutes(`. Modul ber-`export const
ROUTES` — seperti `route-legacy.js` — lolos sepenuhnya, padahal ia memanggil model di lima
rutenya. C3b kini menemukannya PER-RUTE: dari 22 rute, hanya 5 yang sumbernya menyentuh
jalur model yang masuk daftar fixture. Kelimanya diverifikasi runtime (reservasi terjadi
sebelum panggilan model, penghitung bergerak).

Dua arahnya dibuktikan, bukan diklaim: menyisipkan panggilan model ke `/api/activity`
(tanpa fixture) memerahkan C4 dengan pesan yang menyebut rutenya; membatalkannya
menghijaukannya lagi.

### 5.2 Perakitan tanda terima terduplikasi — SELESAI
`workers/api/ai/neuron-reservation.js` kini satu-satunya perakit, dipakai
`route-wiring.js` dan `route-legacy.js`. Resolver `umd()` yang tadinya disalin ikut
tinggal satu. `const ModelCallGate` di route-wiring dihapus (kode mati); IMPOR-nya tidak,
karena load-bearing untuk urutan evaluasi.

Refactor ini langsung memerahkan C3b yang baru dibuat — pendeteksinya buta terhadap satu
lapis indireksi. Itu justru bukti penjaga non-kehampaan bekerja. Pendeteksi kini menyemai
nama yang diimpor dari modul yang mencapai chokepoint lalu menutupnya transitif.

### 5.3 Aset maskot 39 MB — SELESAI SEBAGIAN, sisanya keputusan OWNER
`assets/characters/` (39 MB) + `assets/motion/` (9,1 MB) berhenti diunggah ke produksi.
Dibuktikan tidak dipakai: nol di ASSETS sw.js, nol tautan dari halaman terkirim, dan
assert F gerbang deploy memindai seluruh sumber aplikasi untuk tiap direktori terkecuali.

**DIKECUALIKAN, BUKAN DIHAPUS.** `remotion/src/Scene.jsx` masih merender video darinya.
Menghapus 48 MB itu tetap keputusan OWNER — belum diambil.

**MIRA di `landing.html` TIDAK disentuh.** Ia SVG inline dengan animasi sendiri
(`miraBreathe`, `miraBlink`), bukan rujukan ke direktori itu. Menggantinya dengan PAW
adalah pekerjaan desain pada halaman pemasaran, bukan penggantian mekanis — dan
mengerjakannya asal-asalan membuat halaman itu lebih buruk, bukan lebih baik. Menunggu
arahan OWNER.

### 5.4 Utang naskah Thai sisi Worker — SELESAI SEBAGIAN
Tiga kalimat yang sampai ke murid kini dikirim sebagai `copyKey` + `text`, dengan
pasangan `copy-id-worker.js` / `copy-th-worker.js`. Klien memakai kuncinya lewat
`workerCopy()` dan jatuh ke `text` bila kunci kosong atau belum bernaskah.

**SISA UTANG, bertanggal 2026-09-13:** judul notifikasi push
(`'Waktunya Belajar FIEZEL! ✨'`) masih Indonesia saja. Penghalangnya BUKAN
terjemahannya — itu bisa ditulis — melainkan `sw.js` tidak punya runtime i18n sama sekali
dan tidak tahu locale murid saat notifikasi tiba. Itu rancangan tersendiri, bukan
tambalan, dan sengaja tidak dikebut di sini.

## 6. YANG MASIH MENUNGGU OWNER

1. Menghapus (bukan sekadar berhenti mengirim) 48 MB `assets/characters/` +
   `assets/motion/` — `remotion/` masih memakainya.
2. Mengganti MIRA di `landing.html` dengan PAW — pekerjaan desain.
3. i18n untuk judul notifikasi push di service worker.

---

## 7. LANJUTAN m025-311 — plafon akun ada, tetapi jatah MURID dan tombol mati belum

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

### 7.1 Ditutup sesudah review: jatah ditagih untuk permintaan yang ditolak SEBELUM model

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

### 7.2 Tabrakan dengan #412, dan satu lubang yang ia bongkar

#412 mendarat saat cabang ini berjalan dan mengambil **m025-310 yang sama**; build ini jadi
**m025-311**. Penyelesaiannya dinilai per berkas, bukan "pertahankan milik sendiri":

| Berkas | Putusan | Alasan |
|---|---|---|
| `route-legacy.js` impor | **gabungan** | refactor #412 (`ai/neuron-reservation.js`) lebih baik — ia menutup §5.2, satu perakit untuk dua jalur. Impor `aiSpendGate` milik cabang ini dipertahankan di sampingnya; sisi #412 tidak tahu-menahu soal gerbang belanja. |
| handoff §5 | **ambil #412** | ia memperbarui 5.2–5.4 jadi SELESAI dengan bukti; bagian cabang ini digeser jadi §7. |
| artefak `reports/` | **ambil #412** | ditulis ulang gerbangnya sendiri. |

**Perubahan cabang ini MEMBUTAKAN gerbang #412, dan penjaganya menangkapnya.** `AI_SPEND_ROUTES`
membuat `export const ROUTES` berhenti menjadi literal array (`RAW_ROUTES.map(...)`, dan
`RAW_ROUTES` sengaja tidak diekspor supaya tidak ada jalan memasang SLOT 5 tanpa gerbangnya).
Pendeteksi C3b mencari `export const ROUTES = [`, jadi `route-legacy.js` keluar dari daftar
modul yang dipindai: **C3c memerah dengan `index.js:0/6`** — kelima rute berbayar tidak
terlihat sama sekali. Penjaga non-kehampaan itu bekerja tepat seperti yang dirancang.

Perbaikannya menggeneralisasi pendeteksi, bukan melemahkan struktur gerbang belanja: satu
penolong `routeTableAt()` membaca tabel di tempat ia DIDEKLARASIKAN, dan ia dipakai **dua
tempat** — filter `arrayModules` dan pemindai entri. Generalisasi separuh (hanya pemindainya)
sempat dicoba dan modulnya tetap tidak masuk daftar: ia membuat pendeteksi buta dengan cara
yang lebih sulit dilihat.

**Lubang yang ikut terbongkar, dan ditutup di sini.** C3b dan C3c keduanya dibuka dengan
`arrayModules.length === 0 ||`, jadi keduanya LULUS kalau daftarnya kosong. Diuji dengan
memaksa `routeTableAt()` mengembalikan `-1`: gerbang **HIJAU** padahal tidak melihat satu pun
rute berbayar — persis keadaan yang komentar C3c sebut "lebih berbahaya daripada tidak ada
gerbang", lewat pintu yang ia sendiri tidak jaga. Ditutup assert **C3a** (daftar modul array
tidak boleh kosong), dan mutasi yang sama kini memerahkannya.

**Assert cabang ini sendiri juga basi karena refactor #412** dan diperbaiki, bukan dihapus: ia
menuntut `reserveAccountNeurons(` ada DI `route-legacy.js` — memakukan TEMPAT, bukan
perlindungan, sehingga memerah atas refactor yang justru benar. Sekarang ia mengikuti
indireksinya: rute memanggil perakit bersama, DAN perakit itu memesan serta gagal-tertutup.
Mutasi "perakit berhenti memesan neuron" memerahkannya.
