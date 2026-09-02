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

## Status: SELESAI — gerbang 20/20 PASS

```
node th-bank-purity-test.js      # 20/20 PASS
```

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

B1+ **sengaja tidak** punya sidecar: mulai B1 pertanyaan dan pilihannya memang berbahasa
Inggris — imersi yang disengaja dan sama untuk murid id maupun th. Yang tidak pernah sah di
level mana pun adalah bahasa Indonesia.

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
  Menangkap 1.266 string. Percobaan daftar-kata-fungsi buta pada frasa pendek yang justru
  mendominasi bank (`"Tangannya kedinginan"`, `"Sebuah kuas"`): 580 dari 1.600 opsi A1/A2
  lolos secara keliru.
- **`thaiKataPerKata`** — jejak penerjemah token (rentetan Thai bersepasi). Menangkap 320,
  di antaranya **77 yang tidak tertangkap pemeriksaan lain** — itulah nilai marginalnya.

Total 1.343 tangkapan, dan angka itu **tidak berubah** melewati seluruh perbaikan presisi
di bawah. Kalau Anda menyentuh detektor, ukur ulang angka ini sebelum dan sesudah.

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
5. **Ritual bump versi** — `core-config.js` `FIEZEL_PAGE_BUILD`, `fiezel-diag-panel.js`
   `DIAG_BUILD`, `sw.js` `SW_REV` dinaikkan bertiga ke `m025-230`.

## Kalau menambah konten Thai baru

1. Tambahkan pasangan **kalimat utuh** ke berkas peta di `tools/th-strings/`.
2. Jalankan generatornya (ia gagal keras dan mencetak yang belum terpeta).
3. `node th-bank-purity-test.js` harus tetap 20/20.
4. Jalankan daftar tes di `.github/workflows/quality.yml`. Kegagalan lama yang tidak
   berhubungan (tes hash-lock `vendor/kokoro-js/kokoro.web.js`, merah bahkan di `main` bersih
   pada lingkungan ini) tidak memblokir — pastikan dulu lewat `git diff main -- <path>` bahwa
   berkasnya memang tidak tersentuh.
5. Naikkan trio build bertiga, +1 dari `m025-N` saat ini.
