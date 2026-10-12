# FIEZEL HANDOFF: ALASAN SOAL + REKAP KEPUTUSAN (m025-577)

## 1. Keluhan owner

> "Saat ini FIEZEL masih terlihat seperti aplikasi quiz biasa, tidak ada hal yang bisa
> ditonjolkan ... murid hanya melihat dari luarnya tanpa tahu kehebatan FIEZEL yang sebenarnya."

## 2. Diagnosis

Kehebatan FIEZEL nyata, tetapi **tidak terlihat**. Di balik layar soal ada buku besar
miskonsepsi Bayesian, BKT per lesson, jadwal ingatan FSRS-lite, pemilih soal ZPD (target
sukses 0,80), kalibrasi keyakinan, OLM yang bisa disanggah, dan probe retensi. Di layar, murid
melihat soal + empat pilihan + tombol lanjut. Dari luar, itu persis aplikasi kuis.

Masalahnya bukan kurang fitur. Masalahnya **kecerdasan yang tidak pernah bicara di saat ia
bekerja**. Kartu "Kata Braincore Hari Ini" di Home sudah pernah dicoba dan dihapus atas
permintaan owner: kecerdasan yang dipajang sebagai kartu dasbor terbaca sebagai hiasan. Yang
membuat murid percaya adalah kalimat yang tepat di detik yang tepat.

## 3. Strategi: tunjukkan otaknya di tiga detik

| Detik | Yang diucapkan FIEZEL | Status |
|---|---|---|
| **Sebelum menjawab** | Kenapa soal ini muncul ("Waktunya diulang: terakhir kamu latih 5 hari lalu.") | **m025-577 (ini)** |
| **Vonis** | Bayaran janji itu: "Masih ingat dari latihan 5 hari lalu. Ulangan berikutnya sekitar 10 hari lagi." + garis `5 hari lalu │ 10 hari lagi` | **m025-577 (ini): Bukti Ingatan** |
| **Sesudah menjawab** | Ingatan jebakan lintas sesi ("Ketemu lagi. Jebakan di balik 'at' sudah 3 kali menangkapmu...") | m025-565 Stempel Ingatan |
| **Sesudah sesi** | Kemenangan ("Jebakan yang dulu 4 kali menangkapmu kini jinak"), "8 materi waktunya diulang, 7 masih kamu ingat", perkiraan Fiezel vs hasil nyata | **m025-577 (ini)** |

Kuis biasa tidak bisa meniru satu pun dari kalimat itu, karena kuis biasa tidak punya alasan
memilih soal, tidak ingat, dan tidak memperkirakan apa pun. Itulah pembeda yang selama ini
disimpan.

### Kenapa Bukti Ingatan adalah momen aha utamanya

Label "Waktunya diulang" adalah JANJI bahwa Fiezel tahu kapan ingatan murid perlu disegarkan.
Janji tanpa bayaran terbaca sebagai hiasan. Bayarannya hanya bisa diucapkan sesudah menjawab,
dan hanya di popup vonis (satu-satunya layar yang pasti dilihat: jawaban benar menawarkan
"Lanjut" yang melompati pembahasan). Garis dua ruas memperlihatkan spaced repetition tanpa
satu istilah pun: ingat = ruas kanan memanjang (hijau), pudar = ruas kanan memendek (amber).

### Momen aha berikutnya yang diusulkan (belum dikerjakan)

1. **Momen aha pertama, sesudah tes awal.** Semua momen di atas butuh riwayat, jadi murid baru
   belum melihat satu pun sampai sesi adaptif. Layar hasil tes awal sudah menyimpan bukti per
   band (`placementBands`); itu bisa menjadi "Fiezel sekarang mengenalmu": tangga bukti A1 → C2
   yang dibaca sebagai peta, bukan skor. JANGAN menjanjikan "besok Fiezel mengembalikan 6 kata
   yang tadi keliru" sebelum dicek bahwa latihan level pasca-tes benar-benar menyajikan soal
   jatuh tempo (sekarang `startLevelPractice` mengacak bank level, bukan membaca jadwal).
2. **Momen naik level dengan bukti.** Saat BKT membuka lesson berikutnya, ucapkan buktinya
   ("5 jawaban terakhir di Present Simple benar tanpa petunjuk, jadi Past Simple terbuka"),
   bukan sekadar toast "terbuka".
3. **Sanggahan yang ditepati.** Murid yang menekan "Menurutku ini salah" di OLM sekarang melihat
   label "ukur ulang" di soalnya; momen penutupnya belum ada: "Pengukuran ulang selesai:
   penilaian Fiezel naik dari ... ke ...".
4. **Permukaan di luar aplikasi.** Situs (`website/`) menjual "PWA belajar bahasa adaptif".
   Kalimat yang kini bisa dibuktikan layar lebih kuat: "Bukan kuis. Tutor yang ingat
   kesalahanmu, tahu kapan kamu akan lupa, dan bilang kenapa soal ini untukmu." Tangkapan layar
   label + Bukti Ingatan + rekap adalah buktinya.
5. **Kartu bagikan.** Rekap sesi cukup pendek untuk dijadikan gambar yang bisa dibagikan murid,
   alat pemasaran yang jujur karena angkanya milik murid sendiri.

## 4. Perilaku m025-577

### Label di atas soal (`.quiz-alasan`)

Hanya sesi `adaptive`. Satu alasan per soal, urutan = kekuatan sebab-akibatnya:

| Jenis | Kapan (cabang kode yang benar-benar memilih soal) | Contoh (id) |
|---|---|---|
| `ukur-ulang` | soal konsep yang sedang diukur ulang karena murid menyanggah OLM (antrean probe, `draw()`) | Kamu menyanggah penilaian Fiezel di materi ini. Soal ini mengukurnya ulang. |
| `produksi` | soal cloze di sesi adaptif (hanya lewat `clozeAdaptivePicks`, gerbang BKT L >= 0,6) | Naik tingkat: kamu sudah stabil memilih jawaban di materi ini. Sekarang tulis sendiri. |
| `lupa` | ember ingatan jatuh tempo (`nextReview <= now`, kunci sama dengan `record()`) | Waktunya diulang: terakhir kamu latih 5 hari lalu. / ...kemarin. / ...jadwal ingatmu jatuh hari ini. |
| `fokus` | lesson sasaran rencana adaptif (`policy.targetSkill`, aturan cocok sama dengan skor +14 kolam); **sekali per sesi** | Fokus hari ini: Artikel a, an, dan the. Fiezel memilihnya dari jawaban-jawabanmu. |

"Hari lalu" dihitung dalam hari belajar murid (`studyDayKey`), bukan selisih jam.

### Bukti Ingatan di popup vonis (`.cp-ingatan`)

Hanya untuk soal yang tadi berlabel `lupa`, disisipkan di bawah vonis tepat SESUDAH
`openConfidencePop` (di dalamnya `settleReviewScheduleSilently` menulis jadwal final):

| Jenis | Kapan | Contoh (id) |
|---|---|---|
| `masih` | percobaan pertama benar | Masih ingat dari latihan 5 hari lalu. Ulangan berikutnya sekitar 10 hari lagi. `[5 hari lalu │ 10 hari lagi]` |
| `pudar` | percobaan pertama salah (dipikirkan, >= 1800 ms) | Mulai pudar sejak latihan 2 hari lalu, jadi Fiezel memajukan ulangannya: nanti hari ini. `[2 hari lalu │ hari ini]` |

Jarak berikutnya dibaca dari `nextReview` yang sudah ditulis, dalam hari belajar murid. Salah
yang ditebak (< 1800 ms, ambang Tutor Brain) diam; benar yang cepat tetap "masih ingat" (kata
yang dikenal memang dijawab cepat). Bendera `buktiIngatan` (bergantung pada `alasanSoal`:
bayaran hanya untuk janji yang pernah diucapkan).

### Rekap layar hasil (`.result-alasan`)

Di luar lipatan "Lihat rincian sesi", di bawah peek P2-4. Paling banyak tiga baris:

1. **Kemenangan** (bila ada, maks. satu): dari Stempel Ingatan yang SUDAH diucapkan sesudah
   menjawab, `jinak` didahulukan atas `lolos`. "Jebakan yang dulu 4 kali menangkapmu kini
   jinak" / "Kamu lolos dari 2 jebakan yang pernah menangkapmu".
2. **Yang diatur** (urutan sebab, sampai dua baris total bersama kemenangan): "8 materi waktunya
   diulang, 7 masih kamu ingat" (varian "semuanya masih kamu ingat" / "mulai pudar, jadi Fiezel
   memajukan jadwalnya"), fokus, produksi, ukur ulang.
3. **Perkiraan**: "Perkiraan Fiezel: sekitar 7 dari 12 soal benar di percobaan pertama. Kamu 9,
   di atas perkiraan."

## 5. Aturan kejujuran

- **Sebab, bukan tafsiran.** Tiap jenis adalah cabang nyata pemilih soal. Karena itu hanya sesi
  adaptif: di latihan level soal jatuh tempo bisa muncul karena acak. Kalimatnya tetap benar
  sebagai fakta, tetapi label yang menjawab "kenapa soal ini muncul" menunjuk sebab yang tidak
  dipakai pemilih soal.
- **Probe retensi DIAM.** `retentionProbeDueLessons` menulis kontraknya sendiri: murid yang tahu
  sedang diukur retensinya mengubah perilakunya. Lesson ber-probe (jatuh tempo maupun rapuh)
  tidak diberi label apa pun, juga tidak "lupa"/"fokus", dan tidak dihitung di rekap.
- **Jebakan lama DIAM sebelum menjawab.** "Materi ini sudah 3 kali menjebakmu" sebelum menjawab
  adalah petunjuk: murid waspada, menjawab benar karena diperingatkan, dan ledger mencatatnya
  sebagai bukti jebakan itu jinak. Ingatan jebakan tetap diucapkan, sesudah menjawab, oleh
  Stempel Ingatan.
- **Bukan "tepat waktu".** Materi yang lewat jadwal berminggu-minggu (murid lama absen) tidak
  diulang tepat waktu dan mungkin sudah terlupa. "Waktunya diulang" dan "sesuai jadwal
  ingatanmu" benar di kedua kasus.
- **Tanpa persentase per soal.** "Peluang benarmu 62%" sebelum menjawab mengubah keyakinan yang
  sedang diukur SRL.
- **Perkiraan menyebut "percobaan pertama".** Skor besar layar hasil memberi kredit 0,75 untuk
  benar di percobaan kedua; prediksi Core Brain adalah peluang benar langsung. Tanpa kata itu,
  "Kamu 5" di bawah "5.75 dari 12" terbaca sebagai angka yang bertentangan.
- **Gerbang mode** sama dengan Stempel: mati di MEASURE, `placement`, `noHints`, `examKind`, kunci
  ujian aktif, dan bendera `alasanSoal` (bawaan `true`, override QA per perangkat lewat
  `fiezel-ux-flags-override-v1`). Gerbang ditanya saat menghitung DAN saat merender.

## 6. Berkas

- `app.js`: blok `/* ---- ALASAN SOAL + REKAP KEPUTUSAN` tepat sebelum `function quizLoop`.
  Kabel: `alasanSoalServe` di `draw()` sesudah soal dipilih dan sebelum `olmProbeConsume`;
  `alasanSoalTag` di kedua posisi stem; `alasanRekapMarkup` di `finishQuiz` (luar lipatan).
  Blok `/* ---- BUKTI INGATAN` menyusul tepat sesudahnya; `buktiIngatanAttach` dipanggil sesudah
  `openConfidencePop(ok)` di jalur jawaban pilihan. Kedua bendera di `UX_FALLBACK_FLAGS`.
- `features/i18n/copy-id-redesign.js` + `copy-th-redesign.js`: 32 kunci `alasan.*` / `rekap.*` /
  `ingat.*`, id + th.
- `style.css`: `.quiz-alasan` (12px/13px th), `.result-alasan`, `.cp-ingatan` (latar solid: kartu
  vonis sedikit tembus pandang). Teks label sengaja simpul teks
  telanjang, bukan `<span>`: `mobile-edge-fit.css` mengunci `.card p > span` ke `#5B6472` dengan
  selektor ber-`:not(#id)`, jadi span di gelembung soal gelap terbaca ~3:1.
- `fiezel-ux-flags.js`, `tests/ux-flags-test.js`: bendera `alasanSoal` dan `buktiIngatan`.
- `tests/alasan-soal-test.js` (baru, terdaftar di `quality.yml`): 30 uji.
- Trio build lewat `node tools/bump-build.mjs` ke `m025-577`.

## 7. Verifikasi

- `node tests/alasan-soal-test.js`: 30/30. Diuji mutasi: membuang pagar probe retensi, kunci
  ujian, pagar "fokus sekali", pagar ranah, ambang 5 prediksi, kabel sebelum `olmProbeConsume`,
  melebarkan jenis sesi ke `level`, membuang pagar tebakan / pencocokan `__attemptId` / jadwal
  basi Bukti Ingatan, memasangnya sebelum popup, membalik prioritas jinak > lolos, atau
  melepas batas tiga baris rekap: masing-masing memerahkan gerbang.
- Bukti Ingatan di Chromium nyata (id + th): soal "alone" berlabel "Waktunya diulang: terakhir
  kamu latih 5 hari lalu" dijawab benar -> popup "Masih ingat dari latihan 5 hari lalu. Ulangan
  berikutnya sekitar 10 hari lagi." dengan garis `5 hari lalu │ 10 hari lagi` (hijau). Jawaban
  salah yang dipikirkan 2,3 dtk lalu benar di percobaan kedua -> "Mulai pudar sejak latihan 2 hari
  lalu, jadi Fiezel memajukan ulangannya: nanti hari ini." (amber). Jawaban salah < 1,8 dtk dari
  probe yang sama tidak diberi bukti apa pun (pagar tebakan bekerja). Rekap sesi yang sama: "8
  materi waktunya diulang, 7 masih kamu ingat".
- Probe Chromium nyata (390x844, id dan th): sesi adaptif dengan 8 kata jatuh tempo menampilkan
  "Waktunya diulang: terakhir kamu latih 5 hari lalu." di gelembung soal (`#CBD5E1` di atas
  `#181824`, ikon Pau emas); layar hasil menampilkan rekap di luar lipatan.
- Tinggi layar hasil di 390x844, diukur dengan bendera mati vs hidup (rekap dua baris): tepi bawah
  kartu 779px -> 836px, tombol terakhir ("Kembali ke Home") 634px -> 739px. Kartu masih di dalam
  layar; rekap tiga baris akan mendorong tepi bawah kartu ~40px melewati lipatan (tombolnya tetap
  terlihat). Dokumen sudah bisa digulir sedikit sebelum perubahan ini (scrollHeight 863px). Di
  locale th (baris lebih tinggi) tepi bawah kartu jatuh di 845px, 1px melewati layar 844px.
- Harness probe ada di scratchpad sesi, polanya `tools/dev/probe-grammar-retry-screenshot.js`:
  seed 8 kata A1 jatuh tempo + riwayat, `startAdaptive()`, jawab semua soal, baca label dan rekap.

## 8. Temuan di luar cakupan (belum disentuh)

- `quiz.result-score` berbunyi "{score} dari {total} soal kamu jawab **benar langsung**", padahal
  `score` memuat kredit 0,75 untuk benar di percobaan kedua ("5.75 dari 12 ... benar langsung").
- Peek kenaikan mastery di layar hasil menulis id kosakata mentah ("Vocab 00052 +15%") karena
  `friendlySkillName` dipanggil dengan kunci ember `vocab`.
