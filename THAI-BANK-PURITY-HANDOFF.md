# Kemurnian bahasa bank soal Thai — status & handoff

Dokumen ini adalah kontrak serah-terima. Siapa pun (manusia atau agen) yang melanjutkan
pekerjaan ini cukup membaca berkas ini, menjalankan satu gerbang, dan meneruskan dari angka
yang dilaporkannya.

## Masalah yang sedang diperbaiki

Murid yang memilih bahasa Thai membaca **bahasa Indonesia** sepanjang sesi belajar. Gerbang
lama `th-coverage-test.js` hijau 143/143 dan tetap tidak melihatnya, karena empat permukaan
yang dihitungnya (copy-map, naskah brain, `grammar-explanations-th`, `vocabulary-th`) bukan
permukaan tempat **soal** berada. Bank soal punya jalur hidrasi sendiri yang tidak pernah
lewat copy-map, jadi tidak ada pemeriksaan yang melihatnya.

Ada dua cacat berbeda, keduanya sudah pernah sampai ke rilis:

1. **Lubang** — string Indonesia sampai ke layar murid th karena sidecar th-nya memang tidak
   ada. Seluruh reading A1/A2, seluruh umpan balik cloze, dan seluruh diagnosis miskonsepsi
   masuk kategori ini.
2. **Kolase** — sidecar th-nya ADA tetapi isinya campuran, hasil generator kata-per-kata:
   `"เขา ไม่ punya pena"` (Thai+Indonesia satu kalimat) dan `"รถบัส นั้น สาย นานเท่าใด?"`
   (Thai kata-per-kata bersepasi, yang bukan cara aksara Thai ditulis). Keduanya terbaca
   sebagai omong kosong bagi penutur Thai tetapi lolos pemeriksaan "apakah ada aksara Thai".

## Gerbang: `th-bank-purity-test.js`

```
node th-bank-purity-test.js
```

Ia menghitung tujuh permukaan bank soal terhadap sumbernya masing-masing dan MERAH pada
lubang pertama. Angka PASS-nya adalah ukuran kemajuan pekerjaan ini.

Detektornya ada di `th-purity-lexicon.js` dan **bukan** daftar kata fungsi. Percobaan pertama
memakai daftar kata fungsi (yang, dan, untuk, tidak…) dan ternyata buta pada frasa pendek yang
justru mendominasi bank soal: `"Tangannya kedinginan"`, `"Sebuah kuas"`, `"Dibawa temannya"` —
tidak satu pun memuat kata fungsi, semuanya Indonesia tulen; 580 dari 1.600 opsi A1/A2 lolos
secara keliru. Penggantinya membangun **leksikon dari korpus repo sendiri**: bidang yang
kontraknya Indonesia vs bidang yang kontraknya Inggris sudah terlabeli oleh struktur repo,
jadi himpunan "kata yang hanya muncul di korpus Indonesia" bisa dihitung. Kata yang muncul di
kedua korpus (data, film, ide, radio) ambigu dan sengaja dibiarkan lolos — gerbang ini harus
bebas positif palsu, karena satu tuduhan keliru membuat orang mematikannya.

Aturan level yang dipakai gerbang: **B1 ke atas boleh berbahasa Inggris.** Bank reading dan
listening memakai perancah bahasa ibu HANYA di A1/A2; mulai B1 pertanyaan dan pilihannya
memang Inggris — itu imersi yang disengaja, sama untuk murid id maupun th, jadi bukan lubang.
Mode `paraphrase` juga dikecualikan: pilihan Inggris memang objek ujinya. Yang tidak pernah sah
di level mana pun adalah bahasa Indonesia.

## Status: SELESAI — gerbang 26/26 PASS

```
node th-bank-purity-test.js      # 26/26 PASS
node th-exam-overlay-test.js     # 13/13 PASS
node th-content-overlay-test.js  # 15/15 PASS
node tools/scan-th-bank-leak.js  # 0 temuan
```

OWNER memegang keputusan rilis; MASTER/A14 hanya mereviu. Gerbang di atas wajib hijau
sebelum konten Thai apa pun dianggap selesai.

Keenam bank soal yang dibaca murid Thai kini bersih, dan ketiganya yang baru sudah
tersambung ke runtime. Rincian per bank:

| Bank | Sidecar | Cakupan |
|---|---|---|
| listening | `features/i18n/listening-bank-th.json` | 1.407 butir, 6.654 bidang — 884 bidang **diperbaiki** dari kolase kata-per-kata |
| reading A1/A2 | `features/i18n/reading-bank-th.json` | 106 bacaan, 2.650 bidang (2.351 string unik) |
| cloze | `features/i18n/cloze-bank-th.json` | 210 butir, 2.092 bidang (1.948 string unik) |
| misconception | `features/i18n/misconception-th.json` | 644 diagnosis + 49 kode taksonomi |
| reading-exam | `features/i18n/reading-exam-th.json` | format + penjelasan tiap soal, 196 bidang |
| writing | `features/i18n/writing-prompts-th.json` | prompt + examTask + rubrik, 131 bidang |
| listening-exam | `features/i18n/listening-exam-th.json` | 8 set, 57 penjelasan, 6 catatan format, honesty + audioSource |
| speaking-exam | `features/i18n/speaking-exam-th.json` | 7 catatan format, honesty, rubrik 4 kriteria |

B1+ **sengaja tidak** punya sidecar: mulai B1 pertanyaan dan pilihannya memang berbahasa
Inggris — imersi yang disengaja dan sama untuk murid id maupun th. Yang tidak pernah sah di
level mana pun adalah bahasa Indonesia.

### JEBAKAN KEDUA: gerbang memeriksa ISI, bukan SAMPAI-nya (SUDAH TIGA KALI)

Ditemukan m025-232, setelah owner melapor sesi listening Thai masih bercampur padahal
kedua pemindai hijau. Keduanya benar — dan keduanya buta pada hal yang sama.

Bank ujian Listening (8 set, 57 soal) **tidak punya sidecar th sama sekali**. Overlay-nya
ada sejak lama, tapi mencocokkan id set `lx-ielts-s1` ke `listening-bank-th.json` yang
seluruh 1.407 kuncinya berbentuk `listen_sc_*`. Pencocokan itu tidak pernah kena sasaran
satu kali pun. Setiap gerbang purity memeriksa ISI sidecar; bank tanpa sidecar tidak punya
isi untuk diperiksa, jadi ia lolos **dengan diam** — mode kegagalan yang sama persis dengan
pencemaran korpus di atas: gerbang hijau, murid tetap membaca bahasa Indonesia.

Bersamaan itu, sebelas kalimat di jalur render `fiezel-speaking-listening-addon.js` tidak
pernah memanggil `T()` sama sekali, dan **sepuluh di antaranya sudah punya terjemahan Thai
yang menganggur** di `copy-th-feat-d.js`. Kuncinya diekstrak, tempat pemanggilannya tidak
ikut dipindah. Yang paling sering terlihat: chip pemutar menulis ulang dirinya jadi
`Diputar 1x` setiap kali audio diputar.

**Penjaganya sekarang** — `th-exam-overlay-test.js`, dan ia sengaja memeriksa hal yang
berbeda dari kedua pemindai: bukan datanya, melainkan JALUR BACANYA. Fixture sintetis
berawalan `TH-` ditanam ke `FiezelThData`, lalu diperiksa bahwa nilai itu benar-benar
keluar dari `listeningExamFor` / `listeningFormat` / `listeningHonestyText`. Kalau
pencocokan id meleset, nilai `TH-` tidak akan pernah muncul dan tesnya merah.

Ia juga menjaga dua arah lain yang mudah rusak diam-diam: murid Indonesia tidak boleh
kebocoran teks Thai lewat jalur baca yang sama, dan sidecar yang belum terunduh
(offline parsial) harus gagal-lunak, bukan melempar.

**Aturan turunannya, dan ini yang penting untuk pekerjaan berikutnya:** setiap kali ada
sidecar th BARU, tanyakan dua hal terpisah — (1) isinya bersih? (pemindai), dan
(2) isinya sampai ke layar? (tes overlay). Gerbang yang hanya menjawab (1) akan hijau
selamanya pada bank yang overlay-nya salah sasaran.

**Kutipan skrip audio TETAP Inggris.** Penjelasan soal ujian mengutip rekamannya verbatim;
kutipan itu bukti jawabannya. Menerjemahkannya berarti murid membaca kalimat yang tidak
pernah terdengar di audio, dan soalnya jadi tidak bisa dijawab dari rekaman. Gerbang pasal 8
memeriksa kontrak ini terpisah, jadi kutipan yang diam-diam diterjemahkan tetap ketahuan.

#### Kemunculan ketiga (m025-234): terjemahan terkirim lalu menganggur

Owner melapor lagi bahwa masih banyak bahasa Indonesia tercampur, padahal kedua pemindai
hijau DAN th-exam-overlay-test hijau. Laporannya benar untuk ketiga kalinya, dan kali ini
sebabnya paling halus: terjemahannya **sudah ada, sudah dikirim ke perangkat murid, lalu
menganggur**. `applyContentLocale()` menyalin sebagian bidang saja.

| Sidecar | Overlay menyalin | Yang menganggur |
|---|---|---|
| `writing-prompts-th.json` | `honesty`, `rubric.criteria` | 45 prompt (`hint` + `focus`) + 5 catatan tugas ujian |
| `reading-exam-th.json` | `honesty`, `formats` | 8 set / 96 soal (`why` + `whyOthersFail`) |

Jadi seluruh layar Writing dan seluruh umpan balik soal reading-exam berbahasa Indonesia
untuk murid Thai — sekitar 287 bidang yang padanan Thainya sudah ikut terunduh.

Satu jebakan nama bidang yang mudah terulang: penyaji membaca `prompt.id_hint`, sedangkan
sidecar menyediakan `hint`. Overlay WAJIB menulis ke slot `id_hint`; menamai ulang bidang
sumber akan memutus jalur `id` yang byte-identik dan memerahkan baseline emas.

**Penjaganya** — `th-content-overlay-test.js`, saudara kandung `th-exam-overlay-test.js`
untuk bank konten di `app.js`. Ia menjalankan `applyContentLocale()` yang ASLI lewat `vm`
atas fixture berawalan `TH-`. Dua mutasi (cabut overlay writing, cabut overlay reading-exam)
keduanya tertangkap.

**Cara memakainya waktu menambah sidecar berikutnya.** Sebelum menyatakan sidecar baru
selesai, jawab dua pertanyaan yang TERPISAH:

1. Isinya bersih? → `th-bank-purity-test.js` + `tools/scan-th-bank-leak.js`
2. Isinya sampai ke layar? → tambahkan pemeriksa di `th-content-overlay-test.js`
   (bank di `app.js`) atau `th-exam-overlay-test.js` (bank di addon)

Gerbang yang hanya menjawab (1) akan hijau selamanya sambil murid membaca bahasa Indonesia.
Itu sudah terjadi tiga kali; anggap ia mode kegagalan default, bukan kebetulan.

**Cara cepat menemukan bidang yang menganggur:** untuk tiap sidecar, bandingkan kunci
tingkat-atas yang ia sediakan dengan yang benar-benar disebut di `applyContentLocale()`.
Selisihnya adalah terjemahan yang tidak pernah dipakai. JANGAN mengandalkan pencarian nama
bidang di seluruh berkas — nama seperti `focus` atau `hint` muncul juga di jalur sumber,
jadi pencarian itu memberi rasa aman palsu (saya sempat tertipu olehnya).

**Yang sudah diperiksa dan BERSIH** (jangan cari ulang di sini):
cakupan kunci i18n 2518 kunci `id` semuanya ada di `th` (nol hilang), dan 180 kunci
`grammar.title.*` menutup seluruh judul di `grammar-labels-id.js`.

## Generator — jangan sunting sidecar dengan tangan

Setiap sidecar dirakit ulang dari peta terjemahan **kalimat utuh** di `tools/th-strings/`:

```
node tools/generate-th-reading.js        # reading-bank-th.json
node tools/generate-th-cloze.js          # cloze-bank-th.json
node tools/generate-th-misconception.js  # misconception-th.json
node tools/generate-th-exam-writing.js   # reading-exam-th.json + writing-prompts-th.json
```

Semuanya idempoten dan **gagal keras** pada string yang belum terpeta (mencetak daftarnya).
Petanya berkunci **kalimat utuh**, bukan token — inilah yang secara struktural mencegah cacat
kolase lahir kembali. **Jangan pernah membuat peta token/kata.**

Kunci yang tidak boleh meleset satu byte:
- **cloze `distractors`** — kuncinya teks pilihan persis (urutan pilihan diacak saat
  disajikan, jadi indeks tidak stabil). Meleset = umpan balik tak ditemukan runtime dan murid
  melihat kalimat umum, bukan koreksi atas kekeliruannya.
- **misconception `diagnoses`** — kuncinya berbahasa **Inggris** (nama miskonsepsi yang
  dipakai bank untuk menjodohkan); hanya **nilainya** yang diterjemahkan.
- **reading `options`** — panjangnya wajib sama dengan sumber. Satu pilihan hilang menggeser
  indeks jawaban diam-diam dan murid dinilai salah atas jawaban yang benar; gerbang
  memeriksanya per-soal.

## Detektor: kenapa bentuknya begitu

`th-purity-lexicon.js` punya dua pemeriksaan, dan keduanya sudah diukur terhadap bank
listening rusak pra-perbaikan (3.227 string Thai) — bukan ditebak:

- **`residuIndonesia`** — leksikon dari korpus repo sendiri, bukan daftar kata fungsi.
  Menangkap 1.335 string. Percobaan daftar-kata-fungsi buta pada frasa pendek yang justru
  mendominasi bank (`"Tangannya kedinginan"`, `"Sebuah kuas"`): 580 dari 1.600 opsi A1/A2
  lolos secara keliru.
- **`thaiKataPerKata`** — jejak penerjemah token (rentetan Thai bersepasi). Menangkap 320,
  di antaranya **51 yang tidak tertangkap pemeriksaan lain** — itulah nilai marginalnya.

Total **1.386** tangkapan (1.343 sebelum kontrak korpus diperbaiki). Kalau Anda menyentuh detektor, ukur ulang angka ini sebelum dan sesudah.

### JEBAKAN PALING BERBAHAYA: pencemaran korpus Inggris

Leksikon dibangun dari **selisih ID − EN**. Konsekuensinya tajam dan tidak intuitif: setiap
kata Indonesia yang keliru masuk sisi **EN** akan **terhapus dari leksikon**, dan detektor
menjadi buta terhadap kata itu **di seluruh permukaan** — bukan hanya di berkas yang salah
label.

Ini sudah terjadi, dan akibatnya gerbang melaporkan **20/20 sementara 75 kebocoran nyata
masih duduk di sidecar th**, termasuk 15 di bank listening yang sudah dinyatakan bersih
(`"มีแนวโน้มว่า จะ dilakukan Bayu?"`). Tiga sumbernya:

1. **`reading-exam-v1.json` `stem` + `options` dilabeli Inggris, padahal Indonesia**
   (`"Paragraf mana yang memuat perbandingan..."`). Satu salah label ini sendirian
   menyuntikkan delapan kata Indonesia **paling umum** — `dan`, `yang`, `adalah`, `untuk`,
   `tidak`, `dulu`, `jalan`, `kembali` — ke korpus Inggris.
2. **Prosa Inggris yang MENGUTIP bahasa Indonesia** di dalam tanda kutip:
   `"mirroring the Indonesian order 'minum selalu'"`. Ada di `grammar-templates.json`, kunci
   `grammar-misconception-id.json`, dan `misconception` distraktor cloze. Ditangani helper
   `addENKutip` yang membuang isi `'...'` sebelum menambahkan ke korpus Inggris.
3. **Pertanyaan listening mode `dictation`** adalah instruksi antarmuka berbahasa Indonesia
   (`"Ketik kalimat yang kamu dengar..."`), bukan soal Inggris — 134 butir di B1+.

**Kalau Anda menambah sumber ke `buildLexicon`, verifikasi labelnya dengan membaca isinya,
jangan menebak dari nama berkasnya.** Cara cepat memeriksa kesehatan leksikon:

```js
const {buildLexicon} = require('./th-purity-lexicon.js');
const L = buildLexicon(__dirname);
['dan','yang','adalah','untuk','tidak','dulu','kembali','minum','mau'].forEach(w =>
  console.log(w, L.has(w) ? 'ok' : '*** BUTA — korpus EN tercemar ***'));
```

Semua kata itu **wajib** ada di leksikon. Kalau salah satu hilang, ada sumber EN yang
tercemar dan seluruh gerbang tidak bisa dipercaya sampai itu diperbaiki.

### Pemindai kedua: `tools/scan-th-bank-leak.js`

Pemindai berbasis daftar kata (dari jalur PR ini) punya titik buta yang **berbeda** dari
leksikon korpus, dan justru itulah gunanya: ia yang menemukan delapan kebocoran yang gerbang
korpus lewatkan. Jalankan **keduanya**; keduanya harus bersih.

```
node th-bank-purity-test.js      # 20/20 PASS
node tools/scan-th-bank-leak.js  # 0 temuan
```

### Ambang kata-per-kata sengaja tidak dilonggarkan

Daftar Thai yang sah (`"ภาพวาด หนังสือ ความคิด"` = lukisan, buku, gagasan) berbentuk **identik**
dengan omong kosong keluaran token (`"เขา โกรธ โจทย์ เงิน"`): sama-sama tiga gugus Thai pendek.
Yang membedakan hanya **makna**, jadi tidak ada aturan mekanis yang memisahkannya.

Pelonggaran ambang sudah diukur dan **ditolak**: menaikkan tier-1 dari ≥3 ke ≥4 gugus
menjatuhkan daya tangkap marginal 77 → 37; ke ≥5 gugus jatuh ke 8. Menukar separuh daya
tangkap demi belasan kalimat adalah tukar yang buruk. Karena itu ambangnya dibiarkan setajam
aslinya dan ke-14 kalimat yang sah dicatat satu per satu di `KATA_PER_KATA_DITINJAU` —
terlihat di diff, bisa ditinjau ulang, bukan pelemahan diam-diam. **Kalau Anda menambah konten
Thai baru dan gerbang menuduhnya, tambahkan ke daftar itu; jangan menurunkan ambangnya.**

### Tiga kekeliruan presisi yang sudah diperbaiki (gratis — nol kehilangan daya tangkap)

1. **Apostrof tipografis** memecah kata: `TOKEN` hanya mengenal apostrof kurus, jadi `mustn’t`
   pecah jadi `mustn` + `t`, dan `mustn` jatuh ke selisih "Indonesia-saja". 31 bidang cloze
   tertuduh karena ini.
2. **`vocabulary-master.json` tidak pernah dibaca** — 2.440 entri kosakata Inggris, korpus
   Inggris murni terbesar di repo. Tanpanya kata yang hanya pernah **dikutip** di dalam teks
   Indonesia (`excited`) dianggap Indonesia.
3. **Gugus Thai ≥16 aksara** di dalam rentetan bersepasi: tidak ada kata Thai sepanjang itu,
   jadi rentetannya pasti bukan keluaran kata-per-kata. Diukur: pada 77 string keluaran token,
   gugus terpanjang adalah 12 aksara — ambang 16 gratis.

`ALLOWLIST` memuat kata Inggris dan nama tempat yang di repo ini hanya pernah muncul di dalam
teks Indonesia (`farther`, `republic`, `malang`), sehingga selisih korpus salah
menggolongkannya.

## Penyambungan runtime — SUDAH DIKERJAKAN

1. `features/i18n/fiezel-th-loader.js` — fetch ketiga sidecar baru ke `window.FiezelThData`.
2. `app.js` `applyContentLocale()` — overlay reading (hanya A1/A2, panjang options dijaga) dan
   diagnosis miskonsepsi. Overlay cloze dipisah ke **`applyClozeLocale()`** karena banknya
   dimuat **malas** dan bisa mendarat jauh sesudah `applyContentLocale()` terakhir; ia
   dipanggil dari dua sisi (perubahan locale, dan saat bank cloze mendarat).
3. `features/i18n/locale-assets-th.json` — tiga path baru, `contentRev` 2 → 3.
4. `sw.js` — matcher `isLocaleThAsset` diperluas ke pola `/features/i18n/*-th.json`. Ini
   sekalian menutup celah **yang sudah ada sebelumnya**: empat sidecar bank yang terdaftar di
   manifest sejak W3 (speaking, listening, writing, reading-exam) tidak pernah tercakup
   matcher, jadi murid th offline kehilangan bank soalnya tanpa suara. Kini 29 aset tercakup.
5. **Ritual bump versi** — dinaikkan ke `m025-230`. **Tempatnya EMPAT, bukan tiga**, dan
   nomornya tidak boleh diketik dengan tangan:

   ```
   node tools/bump-build.mjs "<alasan singkat>"
   ```

   Ia mengambil versi dari `origin/main`, menaikkan satu, lalu menulis `sw.js`,
   `core-config.js`, `fiezel-diag-panel.js` **dan** `coordination/BUILD-VERSION.json`
   sekaligus. Berkas keempat itu sumber tunggalnya; `coordination-guard-test.js` merah kalau
   ketiga penanda tidak sama dengannya. Menaikkan tiga berkas dengan tangan lolos A7 di CI
   (A7 hanya memeriksa +1) tetapi tetap merah di gerbang koordinasi — persis yang terjadi di
   PR ini.

## Penjelasan L1: adaptasi, jangan terjemahkan

Sembilan penjelasan di `grammar-explanations-th.json` dulu mengajari murid Thai soal
interferensi bahasa **Indonesia** (`"mau"`, `"minum selalu"`, `"yang"`) — hasil terjemahan
literal dari versi id. Itu tidak mengajari murid Thai apa pun. Kini diadaptasi ke padanan L1
Thai yang benar: `"อยาก"`, `"ดื่มชาเสมอ"`, `"ที่/ซึ่ง"`. **Contoh interferensi bahasa ibu harus
diadaptasi ke bahasa ibu pembacanya, bukan diterjemahkan.**

## Kalau menambah konten Thai baru

1. Tambahkan pasangan **kalimat utuh** ke berkas peta di `tools/th-strings/`.
2. Jalankan generatornya (ia gagal keras dan mencetak yang belum terpeta).
3. `node th-bank-purity-test.js` harus tetap 26/26, `node th-exam-overlay-test.js` 13/13,
   **dan** `node tools/scan-th-bank-leak.js` 0 temuan.
4. Jalankan daftar tes di `.github/workflows/quality.yml`. Kegagalan lama yang tidak
   berhubungan (tes hash-lock `vendor/kokoro-js/kokoro.web.js`, merah bahkan di `main` bersih
   pada lingkungan ini) tidak memblokir — pastikan dulu lewat `git diff main -- <path>` bahwa
   berkasnya memang tidak tersentuh.
5. Naikkan build lewat `node tools/bump-build.mjs "<alasan>"` — jangan mengetik nomornya
   dengan tangan, dan jangan lupa berkas keempat (`coordination/BUILD-VERSION.json`).
