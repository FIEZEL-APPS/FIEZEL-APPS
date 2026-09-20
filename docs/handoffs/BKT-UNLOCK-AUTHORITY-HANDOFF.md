# BKT: parameter tetap beku, otoritas unlock dibuka (m025-337)

Wewenang: OWNER. Permintaan persis: *"BKT nya jangan di bekukan."* Status: **selesai** —
`bktUnlock` naik dari `shadow` ke `active` di `FiezelBrainManifest`, dibuktikan gate.

## Dua hal berbeda yang kebetulan sama-sama disebut "dibekukan"

Sebelum sesi ini, "BKT dibekukan" sebenarnya menunjuk ke DUA keputusan terpisah yang
kebetulan sama-sama menyandang kata itu:

1. **Parameter** `L0=0.2, T=0.15, slip=0.1, guess=0.25` (`Object.freeze` di
   `features/brain/fiezel-mastery-bkt.js:70`) — dibekukan sampai N > 1.000 murid, karena
   presisi hasil fit berskala 1/√n dan FIEZEL di-hard-cap 250 pengguna
   (`docs/BRAIN-EVOLUTION-DECISIONS.md` §5). **Keputusan ini TIDAK diubah** — owner memilih
   opsi "kasih BKT otoritas nyata" saat ditanya, bukan opsi refit parameter dari data lokal.
2. **Otoritas** (`bktUnlock` di `features/brain/fiezel-brain-manifest.js`) — BKT menghitung
   posterior mastery per lesson tapi hasilnya cuma tampil di panel diagnostik
   (`bktShadowMarkup`); keputusan buka-kunci lesson tetap 100% di heuristik v2 lama
   (`accuracy × min(1, total/5)`). **Ini yang diubah sesi ini.**

Klarifikasi ini penting karena solusinya beda total: (1) butuh data murid yang belum ada,
(2) hanya butuh menyambungkan kode yang sudah ditulis dan diuji.

## Apa yang sebenarnya berubah

`lessonUnlockState(skill, sourceState, bktMastered)` (`app.js`) punya parameter ketiga baru:
Set skill yang lolos `FiezelMasteryBKT.masteryGate()` (L ≥ 0,95 **dan** n ≥ 5 — gerbang
kepercayaan bukti, bukan sekadar posterior tinggi). Sebuah prasyarat dianggap terpenuhi kalau
salah satu dari tiga hal benar: akurasi mentah v2 ≥ 60, `skippedAt` (lulus gate skip), atau ada
di Set BKT ini.

`bktMasteredSkills()` (helper baru di `app.js`, dekat `bktRecord`) membangun Set itu dari
`bktRead()` + `masteryGate()` — nol modul baru, nol perubahan pada
`features/brain/fiezel-mastery-bkt.js` itu sendiri. Lima pemanggil disambungkan: `grammar()`
(hub), `openGrammarLesson()`, `renderGrammarLesson()`, `practiceSkill()`,
`buildGrammarQuickQuestions()`.

## Aturan yang dijaga: satu arah saja

**BKT hanya bisa MEMBUKA, tidak pernah MENGUNCI.** `bktMastered` yang null/undefined/kosong
membuat `lessonUnlockState()` berperilaku identik dengan sebelum perubahan ini — modul absen
(atau tanpa bukti) = perilaku hari ini, konvensi yang sama dipakai di seluruh
`features/brain/`. Konsekuensinya:

- Murid yang mastery mentahnya sudah di atas ambang tetap terbuka seperti biasa (BKT tidak
  ikut campur di jalur ini sama sekali).
- Murid yang akurasi mentahnya BELUM sampai ambang tapi BKT sudah yakin (≥95% posterior,
  ≥5 bukti — memperhitungkan slip/guess, bukan rasio mentah) sekarang bisa lanjut lebih awal.
- Tidak ada skenario di mana lesson yang sudah terbuka heuristik lama menjadi terkunci lagi
  gara-gara BKT — itu akan melanggar janji "lesson berikutnya tetap terbuka" yang sudah
  ditegakkan sejak m025-177 untuk jalur skip.

## Bukti

- `tests/mastery-bkt-test.js` — **tidak disentuh**, tetap 14/14 PASS (modul BKT sendiri tidak
  berubah, hanya pemanggilnya).
- `tests/grammar-unlock-test.js` — 4 check baru, semua red-then-green terhadap
  `lessonUnlockState()` yang ASLI dijalankan di vm (bukan regex): BKT membuka prasyarat
  berakurasi-mentah-0, BKT parsial tetap mengunci, Set kosong = argumen absen (bukti nol
  regresi), BKT tidak bisa membuka lesson lewat skill yang bukan prasyaratnya. 19/19 PASS.
- `tests/brain-manifest-test.js` — `bktUnlock` naik ke `active`, `bundleVersion` naik ke
  `3.9.0` (perubahan versi bundle adalah keputusan sadar yang dipatok literal, bukan pola
  semver longgar — supaya tidak lolos tanpa disadari). Gate independen "otoritas off
  DITURUNKAN dari permukaan aplikasi" (yang membaca app.js langsung, bukan menghafal klaim)
  tetap PASS tanpa disunting. 14/14 PASS.
- `tests/id-golden-snapshot-test.js` — dua literal panel diagnostik diubah sadar (baris
  "bayangan - tanpa otoritas unlock" sudah tidak jujur), baseline di-regenerate di commit
  yang sama.
- `tests/th-coverage-test.js` — 233/233 PASS, pasangan `copy-id-app-d.js` /
  `copy-th-app-d.js` diedit bersamaan (kunci sama, `{tracked}` sama, nilai th ber-aksara
  Thai).

## Yang TIDAK berubah, ditulis eksplisit supaya tidak ditemukan-ulang

- Parameter BKT tetap beku (`docs/BRAIN-EVOLUTION-DECISIONS.md` §5 tidak dicabut).
- `features/brain/fiezel-mastery-bkt.js` nol baris berubah — modulnya sudah lengkap sejak
  awal, cuma tidak ada yang memanggil `masteryGate()` di luar panel bacaan.
- Panel diagnostik (`bktShadowMarkup`) tetap tampilan-saja untuk frontier/root-cause; yang
  berubah cuma judulnya (tidak lagi mengklaim "tanpa otoritas").
- Modul lain yang masih `shadow` di `AUTHORITY_MAP` (confusionMap, olmInsight,
  listeningPolicy, retentionProbe, learningMetrics, dst.) — **tidak disentuh**. Ini murni
  permintaan owner soal BKT, bukan sapuan umum menaikkan semua modul shadow.

## Langkah berikutnya (tidak dikerjakan sesi ini, dicatat supaya tidak hilang)

- Domain lain (Vocabulary, Reading, Listening, Speaking) belum punya BKT per-item/per-skill
  — otoritas yang baru dibuka ini murni jalur Grammar (satu-satunya domain dengan graf
  prasyarat lesson-ke-lesson hari ini).

---

# Gelombang kedua (m025-337): tiga modul bayangan ikut memutuskan

Permintaan owner sesudah gelombang pertama: *"apakah kamu bisa tingkatkan braincorenya
lebih powerful lagi?"* — dijawab dengan pilihan tertulis (tiga modul bayangan), owner
memilih **semuanya**. Bundle manifest naik `3.9.0` → `3.10.0`.

Arah yang TIDAK diambil, dan alasannya tetap berlaku: model AI besar (DKT/transformer/LLM
tutor), refit parameter dari data lokal, dan belajar lintas-murid semuanya sudah ditolak
tertulis di `docs/BRAIN-EVOLUTION-DECISIONS.md` dengan argumen kuantitatif (N≈250 pengguna).
"Lebih powerful" di sini karena itu berarti **menyalakan kecerdasan yang sudah dibayar tapi
belum pernah dipakai**, bukan menambah mesin baru.

| Modul | Sebelum | Sesudah |
|---|---|---|
| `confusionMap` | matriks dicatat tiap jawaban salah, hanya dipajang panel diagnostik | `confusionRemediationTarget()` memilih isi **kartu AI Booster**: pasangan lesson yang tertukar terarah menggantikan kartu akurasi-mentah |
| `olmInsight` | vonis kalibrasi dihitung lengkap dengan kalimat dwibahasanya, hanya di panel teknis | `olmCalibrationNudge()` memunculkan **blok nasihat di ringkasan akhir sesi** saat nadanya overconfidence/underconfidence |
| `bktUnlock` (frontier) | `frontier()` ZPD dihitung, hanya dipajang | `zpdFrontierPick()` **memilih simpul aktif jalur Grammar** di antara lesson yang sudah terbuka |

## Tiga pagar yang dipasang sengaja

1. **Tidak ada yang memperluas kandidat.** `zpdFrontierPick()` hanya boleh memilih dari
   `openRows` yang penentu bukanya tetap `lessonUnlockState()`; ia tidak pernah membuka
   simpul terkunci. Kartu remediasi hanya menautkan ke lesson yang memang ada namanya.
2. **Ambang bukti di tiap pintu.** Kebingungan butuh ≥3 bukti per sel (ambang modul)
   **dan** share ≥ 0,34 — salah yang menyebar rata berarti "belum paham lesson ini",
   bukan "tertukar dengan lesson itu". Kalibrasi memakai ambang bukti modul sendiri, dan
   nada `netral` sengaja TIDAK memunculkan nasihat: nasihat tanpa masalah membuat nasihat
   berikutnya ikut diabaikan.
3. **Fail-quiet, bukan fail-loud.** Modul absen, bukti tipis, state rusak, atau model
   kemampuan belum terbaca → layar persis seperti sebelum m025-337. Tiap arah itu punya
   assert-nya sendiri.

## Bukti

`tests/brain-authority-wave2-test.js` (15 assert, terdaftar di `quality.yml`) menjalankan
fungsi produksi yang SUNGGUHAN di dalam `vm` di atas modul otak yang sungguhan
(`require` dari `features/brain/`), bukan mencocokkan regex. Empat mutasi dibuktikan MERAH
lebih dulu, lalu dipulihkan:

| Mutasi | Assert yang merah |
|---|---|
| ambang share dilumpuhkan ke 0 | kebingungan yang menyebar rata tidak boleh menyalakan remediasi |
| `aiBoosterCard` mengabaikan kebingungan | kartu harus menyebut KEDUA lesson |
| `olmCalibrationNudge` menerima nada netral | kalibrasi sehat tidak boleh menambah blok |
| `zpdFrontierPick` memilih kandidat pertama membabi buta | prediksi di luar jendela ZPD + jatuh ke urutan lama |

## Catatan jujur: titik sambung frontier BUKAN yang semula saya sebut

Saat menawarkan pilihan ini saya menulis frontier akan disambungkan ke `buildAdaptivePool`.
Setelah membaca fungsinya, itu **salah tempat**: `buildAdaptivePool` melewati setiap materi
yang `!b?.total` — ia kolam ULANGAN untuk yang sudah pernah disentuh, dan tidak pernah
memperkenalkan lesson baru sama sekali. Yang benar-benar memutuskan "lesson mana
berikutnya" adalah simpul aktif di hub Grammar, dan di situlah frontier dipasang.

## 43 kunci hantu yang membuat `main` merah — dan apa yang sebenarnya dilihat guru

`quality` merah saat PR ini berjalan, tetapi bukan karena PR ini: gerbang
`i18n-kunci-hantu-test` menemukan **43 kunci `t('...')` yang dipanggil tanpa pernah
didaftarkan**, semuanya dari gelombang kurikulum/KelasKu yang baru mendarat
(`fiezel-teacher-shell.js` 41, `teacher-console.js` 2). Dibuktikan dengan menjalankan
gerbang itu pada checkout `origin/main` yang bersih (`git worktree`): **merah juga di sana**,
tanpa satu baris pun dari PR ini.

### Kenapa ini bukan cacat kosmetik

Setiap pemanggilnya berbentuk `t('guru.pilih-mapel', 'Pilih Mata Pelajaran')` — penulisnya
jelas mengira argumen kedua adalah teks cadangan. **Bukan.** Di
`features/i18n/fiezel-i18n.js` parameter kedua `t(key, params)` adalah objek substitusi
`{placeholder}`, dan kunci yang tidak ditemukan berakhir di baris:

```js
if (s === undefined) { misses[key] = (misses[key] || 0) + 1; s = key; }
```

Artinya layar Ruang Guru menampilkan **nama kuncinya sendiri** — `guru.pilih-mapel`,
`guru.semai-soal`, `guru.kode-kompetensi` — bukan kalimat. Argumen kedua itu tidak pernah
menyelamatkan apa pun; ia hanya membuat cacatnya tidak terlihat saat membaca kode.

### Cara memperbaikinya tanpa mengarang

Naskah Indonesia TIDAK ditulis ulang: ia diekstrak **persis** dari argumen kedua di tiap
pemanggil (43/43 terekstrak terprogram, bukan diketik ulang), sehingga layar menampilkan
tepat kalimat yang dimaksud penulisnya. Yang benar-benar baru hanya sisi Thai-nya, dengan
`{topik}` dipertahankan di dua kunci yang memakainya. Ditempatkan mengikuti domainnya:
`guru.*` → `copy-{id,th}-feat-d.js`, `kurikulum.*` → `copy-{id,th}-kurikulum.js`.

Dikerjakan di PR ini atas permintaan owner ("lanjutkan perbaikan yang merah"), sesudah
sebelumnya dicatat sebagai bukan-milik-PR-ini di komentar PR.

## Satu berkas asing yang ikut didaftarkan

`tests/kelasku-17mapel-assignment-test.js` mendarat lewat merge `main` **tanpa pernah
didaftarkan** di `quality.yml`, sehingga `gate-registry-test` merah di `main` sendiri dan
tes itu tertulis tanpa pernah dijalankan CI. Ia didaftarkan di commit ini (23 assert, hijau
saat didaftarkan) — bukan pelebaran ruang lingkup, melainkan syarat agar PR mana pun bisa
hijau, dan efek sampingnya tes itu akhirnya benar-benar menjadi bukti.
