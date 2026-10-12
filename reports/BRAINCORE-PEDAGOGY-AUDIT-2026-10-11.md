# Audit pedagogis & kognitif umpan balik BrainCore — 2026-10-11

**Basis:** `main` @ `c541d5b` (build `m025-566`) · **Perbaikan:** build `m025-568`, branch
`claude/elegant-gates-lhkilc`.

**Cakupan:** semua teks yang dilihat murid antara "jawaban salah" dan "soal berikutnya":
pilihan ganda grammar (25 mode latihan, 512 templat, 1.536 pengecoh), susun kata / token-order
(442 templat layak), soal percakapan (video-grammar cadangan), petunjuk 4 tingkat sebelum
menjawab, nudge retry, tangga tutor BrainCore (`composeTurn`), tuntunan langkah
(`stepTutorGuidance`), cloze ketik (436 butir), dan penjelasan reading A1–A2 (1.560 soal) —
dalam **dua bahasa murid** (id dan th).

**Metode — tiga lapis, setiap klaim bisa diulang:**

1. **Pemindai forensik data** — `node tools/dev/braincore-pedagogy-audit-2026-10-11-probe.js`
   menandai kandidat per dimensi audit di seluruh bank (bukan sampel).
2. **Runtime sungguhan** — `index.html` dijalankan di Chromium; fungsi umpan balik asli
   (`makeGrammarQuestion`, `makeGrammarTokenOrderQuestion`, `diagnoseTokenOrderMistake`,
   `grammarReasonEntry`, `stepTutorGuidance`, `getOrMakeVideoGrammarQuestion`) dipanggil untuk
   kasus yang dicurigai, di locale id **dan** th. Kutipan "Yang Ditampilkan ke Siswa" di bawah
   adalah keluaran runtime itu, bukan rekaan.
3. **Pembacaan manusia** — setiap kandidat dibaca bersama stem, opsi, dan kuncinya sebelum
   diberi vonis. Kandidat yang ternyata sah dicatat di §4 ("Dicek & bersih"), tidak dibuang diam-diam.

**Gerbang:** `tests/braincore-pedagogy-audit-2026-10-11-test.js` (15 cek, Node murni; memotong
fungsi asli dari `app.js` lalu mencobanya ke seluruh bank). **Bukti merah:** di `main` 0/15,
sesudah perbaikan 15/15.

---

## 1. Vonis singkat

Bank grammar FIEZEL **sudah matang di level butir**: 0 pengecoh hantu, 0 opsi tanpa alasan,
0 kebocoran metadata (`Target:`, `patternId`, JSON), 0 nada merendahkan, dan alasan per pilihan
hampir selalu menyebut isyarat stem ("padahal “yesterday” nunjuk masa lalu"). Cacat yang
tersisa **bukan di kalimat bank, melainkan di mesin yang merangkai kalimat itu ke layar** —
dan di sana ada empat yang membuat murid salah paham secara sistemik:

| # | Tingkat | Temuan | Skala |
|---|---------|--------|-------|
| F1 | **FATAL** | Susun kata menuduh murid memasang kata pengecoh yang **tidak pernah ia pilih** | 75 pasangan soal–pengecoh (67 tuduhan di simulasi seluruh bank) |
| F2 | **FATAL** | Terjemahan berurutan sah ("…last night") dinilai salah, didiagnosis "urutan salah", dan tuntunan langkahnya sendiri menyuruh urutan yang ditolak | 63 kalimat punya urutan sah yang ditolak; 57 dibuka keterangan/anak kalimat, 33 kalimat tanya bertentangan dengan tuntunan |
| F3 | **FATAL (th)** | Murid Thai menerima soal susun kata berbahasa **Indonesia** | 442/442 soal susun kata di locale th |
| F4 | **FATAL** | Reading: "Pilihan … **tidak ada di teks**" untuk pengecoh yang **ada** di teks | 500 penjelasan id + 530 th |
| M1–M11 | MAJOR | Bocoran kunci sebelum percobaan kedua, tautologi mode "bandingkan", petunjuk "subjek & penanda waktu" untuk soal kata depan, aturan tense + HTML mentah di diagnosis urutan, alasan merujuk pilihan lain / kata hantu, dll. | lihat §2 |
| m1–m5 | MINOR | Alasan "setengah", titik ganda, kutipan dobel, goyangan keping, jargon A1 | lihat §3 |

Semua FATAL dan MAJOR **diperbaiki di PR ini** (id + th) dan dikunci gerbang; MINOR yang
belum diperbaiki dicatat sebagai utang di §5.

---

## 2. Temuan FATAL & MAJOR

### 🛑 [FATAL] ID Soal / Template: `A2-334` (pola: 75 pasangan soal–pengecoh)
- **Topik / Kompetensi:** `Susun kata (token-order) — artikel a/an/the, diagnosis urutan`
- **Soal / Kalimat:** `"Terjemahkan ke Bahasa Inggris: Kemarin aku nemu foto lama di dalam kardus. Foto itu nunjukkin nenekku."` — bank kata: `Yesterday I found an old photo in a box The photo shows my grandma` + pengecoh `the`, `a`
- **Kunci Jawaban:** `"Yesterday I found an old photo in a box. The photo shows my grandma."` | **Pilihan Siswa yang Diuji:** `"Yesterday I found an old photo box a in The photo shows my grandma"` (semua kata sah, hanya "in a box" tertukar; keping pengecoh tidak disentuh)
- **Yang Ditampilkan ke Siswa Saat Ini:**
  > `"Kata “a” kurang pas di sini ya: butuh bunyi konsonan, padahal “old” diawali bunyi vokal."`
- **Mengapa Ini Membingungkan / Membodohkan Siswa:**
  Substitusi hantu murni. Pencocok lama menganggap kata apa pun di rel yang **sama dengan** teks pengecoh sebagai "pengecoh yang dipilih" — padahal kata "a" di "in a box" adalah kata sah kalimat itu. Murid dituduh memilih sesuatu yang tidak ia pilih, lalu diajari aturan bunyi vokal untuk "a" di depan "old" — kata yang memang tidak ia taruh di depan "old". Kesalahannya yang sebenarnya (urutan "box a in") tidak disebut sama sekali. Ini merusak kepercayaan pada sistem dan menanamkan aturan yang tidak relevan dengan kekeliruannya. Keping "a" yang benar bahkan ikut digoyang sebagai "keping salah".
- **Rekomendasi Revisi yang Mencerdaskan:**
  > `"Urutan katanya belum tepat nih: setelah “Yesterday I found an old photo”, kamu menaruh “box”, padahal di posisi itu seharusnya “in” dulu ya."` *(keluaran runtime sesudah perbaikan)*
- **Aturan Pembelajaran yang Ditanamkan (Takeaway Rule):**
  `Frasa tempat selalu berurutan kata depan → artikel → benda: in a box.`
- **Status:** diperbaiki — pengecoh dihitung dari **kelebihan** kata dibanding kebutuhan kalimat (multiset), di diagnosis dan di goyangan keping. Gerbang P1 mensimulasikan salah-urutan di seluruh 442 soal: 67 tuduhan → 0; pengecoh yang sungguh dipasang tetap dinamai (P1b).

### 🛑 [FATAL] ID Soal / Template: `A1-203` (pola: 63 kalimat; tuntunan langkah semua soal susun kata)
- **Topik / Kompetensi:** `Susun kata — terjemahan id→en, posisi keterangan waktu & anak kalimat`
- **Soal / Kalimat:** `"Terjemahkan ke Bahasa Inggris: Semalam aku nonton film bareng keluarga."`
- **Kunci Jawaban:** `"Last night I watched a film with my family."` | **Pilihan Siswa yang Diuji:** `"I watched a film with my family last night"`
- **Yang Ditampilkan ke Siswa Saat Ini:**
  > `"Urutan katanya belum tepat nih: kamu menaruh “I”, padahal di posisi itu seharusnya “Last” dulu ya. Pola yang pas: Kejadian lampau yang sudah selesai di masa lalu menggunakan Verb 2 …<br><br>💡 <b>RUMUS KILAT</b>…"`
  > Tuntunan langkah di layar yang sama: `"Langkah 1: Temukan subjek pelaku … untuk ditempatkan di awal kalimat." · "Langkah 3: Susun objek serta keterangan waktu atau tempat di bagian akhir kalimat."`
- **Mengapa Ini Membingungkan / Membodohkan Siswa:**
  Gaslighting tiga lapis. (1) Sejak m025-513 urutan Inggrisnya **tidak terlihat** (yang tampil kalimat Indonesia), jadi jawaban murid adalah terjemahan yang sepenuhnya benar — namun penilai hanya mengenal satu urutan. (2) Diagnosis menyebut urutannya salah, lalu menempelkan aturan **tense** (tidak ada hubungannya dengan posisi) plus markup mentah. (3) Tuntunan langkah BrainCore sendiri menyuruh menaruh keterangan waktu di akhir — murid yang patuh pada tutor dihukum oleh penilai. Pola yang sama mengenai kalimat ber-anak-kalimat ("If you finish your homework tonight, we will watch…" ↔ "We will watch … if you finish…") dan kalimat tanya (tuntunan "subjek di awal" salah untuk "Do you…?").
- **Rekomendasi Revisi yang Mencerdaskan:**
  > Jawaban diterima sebagai **benar** (urutan alternatif yang sah kini dikenali). Tuntunan langkah: `"Langkah 1: Baca lagi soalnya, lalu cari siapa pelakunya (subjek) dan apa kata kerja utamanya." · "Langkah 2: Kalimat berita: subjek dulu, baru kata kerjanya. Kalimat tanya: kata bantunya (do, is, can, dan sejenisnya) maju ke depan subjek." · "Langkah 3: Pasang objek dan keterangannya. Kata berhuruf kapital di bank kata (selain “I” dan nama) biasanya pembuka kalimat."`
- **Aturan Pembelajaran yang Ditanamkan (Takeaway Rule):**
  `Keterangan waktu boleh membuka atau menutup kalimat (Last night I… / I… last night); intinya tetap subjek + kata kerja.`
- **Status:** diperbaiki — `tokenOrderMovableAlternates()` (fungsi murni, konservatif: keterangan waktu awal/akhir klausa, anak kalimat if/when/because/although/despite/… dipindah; menolak klausa bercabang, pelengkap "than", subjek "Today", dan kalimat tanya). 63 kalimat kini menerima urutan sah; gerbang P3 menjamin setiap alternatif adalah permutasi kata yang sama dan tidak ada kalimat salah ("yesterday the traffic today is worse than") yang lahir. Diagnosis urutan tidak lagi menempel aturan (P4). Naskah tuntunan id+th ditulis ulang.

### 🛑 [FATAL] ID Soal / Template: `A2-334` (pola: 442/442 soal susun kata, locale th)
- **Topik / Kompetensi:** `Susun kata — murid Thai`
- **Soal / Kalimat:** `"แปลเป็นภาษาอังกฤษ: Kemarin aku nemu foto lama di dalam kardus. Foto itu nunjukkin nenekku."`
- **Kunci Jawaban:** `"Yesterday I found an old photo in a box. …"` | **Pilihan Siswa yang Diuji:** `(apa pun — murid tidak bisa membaca soalnya)`
- **Yang Ditampilkan ke Siswa Saat Ini:**
  > `"แปลเป็นภาษาอังกฤษ:"` diikuti kalimat **Indonesia** `"Kemarin aku nemu foto lama di dalam kardus…"`
- **Mengapa Ini Membingungkan / Membodohkan Siswa:**
  Peta terjemahan m025-513 hanya berbahasa Indonesia dan dipakai tanpa memeriksa locale. Murid Thai diminta menerjemahkan kalimat dari bahasa yang tidak ia baca — soalnya mustahil dijawab dengan nalar, hanya dengan tebakan. Ini melanggar aturan dua-bahasa di `CLAUDE.md` pada titik yang paling merugikan.
- **Rekomendasi Revisi yang Mencerdaskan:**
  > `"เติมคำและเรียงลำดับ: เรียงคำทั้งหมดด้านล่างให้เป็นประโยคที่สมบูรณ์ (เลือกคำที่ถูกต้องสำหรับช่องว่าง): Yesterday I ___ old photo in a box. …"` *(mode "Lengkapi & Susun Kata" dengan kerangka Inggris — label dan instruksinya sudah dua bahasa)*
- **Aturan Pembelajaran yang Ditanamkan (Takeaway Rule):**
  `Isi bagian kosong dengan kata yang cocok, lalu susun kalimatnya mengikuti kerangka.`
- **Status:** diperbaiki (fallback) — di locale th `idTranslation` tidak dipakai. Terjemahan Thai untuk 512 kalimat dicatat sebagai **utang** (§5).

### 🛑 [FATAL] ID Soal / Template: `r0002` q3 (pola: 500 penjelasan id + 530 th, reading A1–A2)
- **Topik / Kompetensi:** `Reading A1 — rujukan kata ganti (reference)`
- **Soal / Kalimat:** `"Kata “It” di teks tentang bis itu menunjuk apa?"` — teks: *"Bima goes to school by bus. He waits at the bus stop near his street. The bus comes at six o'clock. It is often full of students. … They talk about the football game. The bus stops in front of the school."*
- **Kunci Jawaban:** `"bisnya"` | **Pilihan Siswa yang Diuji:** `"sekolahnya"`
- **Yang Ditampilkan ke Siswa Saat Ini:**
  > `"Pilihan “sekolahnya”, “jalanannya”, “pertandingannya” tidak ada di teks. Yang tertulis justru “It is often full of students.”, dan itu cocok dengan jawaban yang benar."`
- **Mengapa Ini Membingungkan / Membodohkan Siswa:**
  Klaimnya **salah secara fakta**: "school", "street", dan "the football game" semuanya tertulis di bacaan. Murid yang barusan membaca kata "school" diberi tahu kata itu tidak ada — ia belajar untuk tidak memercayai matanya sendiri, atau tidak memercayai FIEZEL. Templat generik ini dipakai di 500 soal; untuk pengecoh "orang/tempat/benda lain dari teks yang sama" (desain pengecoh yang baik) klaimnya selalu bohong (r0003: "ayahnya" — ayahnya ada di teks; r0005: "gurunya" — gurunya ada).
- **Rekomendasi Revisi yang Mencerdaskan:**
  > `"Pilihan “sekolahnya”, “jalanannya”, “pertandingannya” tidak didukung teks. Yang tertulis justru “It is often full of students.”, dan itu cocok dengan jawaban yang benar."` *(perbaikan minimum yang selalu benar — diterapkan)*
  > Untuk soal *reference* (rekomendasi lanjutan, belum diterapkan): `"“It” menunjuk benda tunggal yang baru disebut tepat sebelumnya: “The bus comes at six o'clock.” Yang penuh murid itu bisnya, bukan sekolah."`
- **Aturan Pembelajaran yang Ditanamkan (Takeaway Rule):**
  `Kata ganti (it, he, they) menunjuk kata benda yang cocok dan paling dekat sebelumnya.`
- **Status:** diperbaiki (klaim palsu dihapus di 500 id + 530 th; kedua generator — `tools/reading-a12-explain.mjs`, `tools/generate-th-reading.js` — ikut diubah; generator th menghasilkan berkas byte-identik dengan patch). Penjelasan rujukan yang menunjuk anteseden: **utang** (§5).

### 🛑 [MAJOR] ID Soal / Template: `MO-011` (pola: 103 alasan id + 134 alasan th)
- **Topik / Kompetensi:** `Modal kemampuan lampau (could vs can) — nudge retry sebelum percobaan kedua`
- **Soal / Kalimat:** `"Even from the back row, we ___ hear every note at the concert last night."`
- **Kunci Jawaban:** `"could"` | **Pilihan Siswa yang Diuji:** `"can"`
- **Yang Ditampilkan ke Siswa Saat Ini:**
  > `"Pilihan “can” kurang tepat: “can” “last night” ngunci kalimatnya di masa lampau, jadi modal sekarang “can” bentrok sama waktunya; bentuk lampaunya “could”. Coba pilih opsi lainnya ya!"`
- **Mengapa Ini Membingungkan / Membodohkan Siswa:**
  Nudge ini tampil **sebelum** kesempatan kedua. Kalimat penutupnya menyerahkan kunci ("bentuk lampaunya “could”"), jadi percobaan kedua tidak melatih *retrieval* apa pun — tetapi tetap tercatat sebagai jawaban murid sendiri (kredit 0,75 di BKT). Tutor BrainCore sendiri sudah berprinsip "tidak pernah menyodorkan jawaban sebelum tangga sampai di `tell`" dan sudah menyaring kunci dari petunjuk ingatan (U4) — tetapi nudge alasan, diagnosis susun kata, dan kalimat "Pilihan tadi kurang pas karena…" tidak pernah disaring. Kutipan pembuka "“can” “last night”" juga terbaca patah.
- **Rekomendasi Revisi yang Mencerdaskan:**
  > `"Pilihan “can” kurang tepat: “last night” ngunci kalimatnya di masa lampau, jadi modal sekarang “can” bentrok sama waktunya; bentuk lampaunya “…”. Coba pilih opsi lainnya ya!"`
- **Aturan Pembelajaran yang Ditanamkan (Takeaway Rule):**
  `Ada penanda lampau (last night, yesterday)? Modalnya ikut mundur: can → could.`
- **Status:** diperbaiki — `grammarHideKey()` mengganti kunci dengan "…" (teks pilihan murid dilindungi: alasan untuk "To open" tetap menyebut "To open" walau kuncinya "Open") di nudge retry, diagnosis susun kata saat retry, dan kalimat tutor sebelum `tell`. Pembahasan sesudah jawaban dibuka tetap utuh. Gerbang P2 memeriksa seluruh 1.536 alasan id + th.

### 🛑 [MAJOR] ID Soal / Template: `A1-303` (pola: 106 saran menghindar + 36 pegangan ingatan)
- **Topik / Kompetensi:** `Possessive adjective — petunjuk 4 tingkat SEBELUM menjawab`
- **Soal / Kalimat:** `"This is not my bag. ___ bag is blue."` (opsi: My / Mine / Me / I)
- **Kunci Jawaban:** `"My"` | **Pilihan Siswa yang Diuji:** `(belum menjawab — membuka petunjuk tingkat 4)`
- **Yang Ditampilkan ke Siswa Saat Ini:**
  > `"💡 “My” selalu ditemani kata benda: “my bag”, “my book”."`
- **Mengapa Ini Membingungkan / Membodohkan Siswa:**
  Kontrak G8 (m025-442) menyatakan tingkat 4 tidak boleh membuka kunci, dan gerbang B10 mengujinya — tetapi hanya pada SATU soal acak, jadi 36 templat yang pegangan ingatannya menyebut kunci lolos selama soal itu tidak terambil (B10 sempat merah di sesi audit ini karena kebetulan menarik A1-303). Tingkat 3 punya masalah serupa di 106 templat ("Kalau iya, cuma “whose” yang bisa dipakai"), dan cadangannya jatuh ke `distractors[0].reason` yang — karena daftar diacak — kadang alasan **kunci** ("“has” bener — …").
- **Rekomendasi Revisi yang Mencerdaskan:**
  > `"💡 “…” selalu ditemani kata benda: “… bag”, “… book”."` *(murid tetap mendapat aturannya, bentuknya harus ia ingat sendiri)*
- **Aturan Pembelajaran yang Ditanamkan (Takeaway Rule):**
  `Kata pemilik (my, your, his) selalu berdiri tepat di depan kata benda.`
- **Status:** diperbaiki — tingkat 3 & 4 melewati `grammarHideKey`; cadangan `distractors[0].reason` dihapus.

### 🛑 [MAJOR] ID Soal / Template: `A1-336` (pola: setiap soal grammar pilihan ganda)
- **Topik / Kompetensi:** `Kata depan tempat (under/on/in/to) — petunjuk tingkat 1 "Arah Fokus"`
- **Soal / Kalimat:** `"Your pencil fell. Look ___ your chair!"`
- **Kunci Jawaban:** `"under"` | **Pilihan Siswa yang Diuji:** `(membuka petunjuk tingkat 1)`
- **Yang Ditampilkan ke Siswa Saat Ini:**
  > `"Perhatikan subjek kalimat dan penanda waktu untuk menentukan bentuk yang tepat."`
- **Mengapa Ini Membingungkan / Membodohkan Siswa:**
  Petunjuk tingkat 1 membaca `explain.clue`, yang tidak pernah diisi — jadi **setiap** soal (kata depan, artikel, kata ganti, perbandingan) menerima nasihat tense. Untuk soal ini tidak ada penanda waktu dan subjeknya tidak relevan; murid diarahkan ke tempat yang salah tepat di langkah pertama. Ini pola "Perhatikan bentuk kata kerja padahal kesalahannya di preposisi" yang disebut brief audit.
- **Rekomendasi Revisi yang Mencerdaskan:**
  > `"Perhatikan kata “fell”."` *(langkah pertama penalaran template ini sendiri, `reasoningOperationId`; Thai: `"สังเกตคำว่า 'fell'"`)*
- **Aturan Pembelajaran yang Ditanamkan (Takeaway Rule):**
  `Benda yang jatuh berakhir di lantai — di bawah sesuatu: under.`
- **Status:** diperbaiki — `explain.clue` diisi langkah pertama `reasoningId` (512/512 templat punya langkah id dan th; gerbang P8).

### 🛑 [MAJOR] ID Soal / Template: `TA-001` (pola: setiap diagnosis salah-urutan susun kata, id + th)
- **Topik / Kompetensi:** `Susun kata — diagnosis salah urutan`
- **Soal / Kalimat:** `"Terjemahkan ke Bahasa Inggris: Lihat! Kokinya sedang menyiapkan hidangan baru saat ini, kamu bisa menciumnya."`
- **Kunci Jawaban:** `"Look! The chef is preparing a new dish right now. You can smell it."` | **Pilihan Siswa yang Diuji:** `"The Look chef is preparing …"`
- **Yang Ditampilkan ke Siswa Saat Ini:**
  > `"Urutan katanya belum tepat nih: kamu menaruh “The”, padahal di posisi itu seharusnya “Look” dulu ya. Pola yang pas: Bedakan RUTINITAS vs SEDANG BERLANGSUNG:<br>1. Rutinitas / kebiasaan berulang: … <b>RUMUS KILAT</b> …"`
- **Mengapa Ini Membingungkan / Membodohkan Siswa:**
  Kalimat pertama sudah presisi; tempelan sesudahnya adalah aturan **tense** untuk kesalahan **posisi** — diagnosis yang tidak jujur terhadap letak kesalahan. Di kotak "Mengapa kurang tepat?" teks ini di-*escape*, jadi murid membaca `<br>`, `<b>` mentah ("kebocoran kode").
- **Rekomendasi Revisi yang Mencerdaskan:**
  > `"Urutan katanya belum tepat nih: kamu menaruh “The”, padahal di posisi itu seharusnya “Look” dulu ya."`
- **Aturan Pembelajaran yang Ditanamkan (Takeaway Rule):**
  `Seruan seperti “Look!” berdiri sendiri di depan, baru kalimatnya menyusul.`
- **Status:** diperbaiki (aturan lengkap tetap ada di "Lihat aturan lengkap").

### 🛑 [MAJOR] ID Soal / Template: `CO-101` (pola: mode "bandingkan" v18–v20, semua templat)
- **Topik / Kompetensi:** `First conditional — mode latihan "Bandingkan X dan Y"`
- **Soal / Kalimat:** `"Bandingkan “will watch” dan “watch”: If you finish your homework tonight, we ___ a film together."`
- **Kunci Jawaban:** `"“will watch” pas di sini; “watch” penanda masa depannya hilang, padahal ini soal satu malam tertentu."` | **Pilihan Siswa yang Diuji:** `"Dua-duanya bisa dipakai bolak-balik tanpa ngubah makna."`
- **Yang Ditampilkan ke Siswa Saat Ini:**
  > `"Dua-duanya nggak sepadan; cuma “will watch” yang cocok sama kalimat ini."` (dua pengecoh lain: `"Kebalik: justru “will watch” yang jaga maksud kalimatnya, “watch” yang meleset."`, `"Keliru: lesson ini memang nguji perbandingan itu, dan “will watch” jawaban yang bener."`)
- **Mengapa Ini Membingungkan / Membodohkan Siswa:**
  Tautologi murni — "salah karena yang benar adalah B". Tidak satu pun dari tiga penjelasan menyebut *mengapa* dua bentuk itu tidak sepadan, padahal alasannya tersedia di data. Saat retry, kalimat itu sekaligus menunjuk jawaban.
- **Rekomendasi Revisi yang Mencerdaskan:**
  > `"Dua bentuk ini nggak bisa ditukar. “watch” penanda masa depannya hilang, padahal ini soal satu malam tertentu."`
- **Aturan Pembelajaran yang Ditanamkan (Takeaway Rule):**
  `Syarat nyata untuk satu kejadian nanti: If + Verb 1, will + Verb 1.`
- **Status:** diperbaiki — tiga kunci naskah id+th kini berparameter `{alasan}` = alasan nyata pilihan itu.

### 🛑 [MAJOR] ID Soal / Template: `A1-336` (pola: semua soal percakapan/video-grammar cadangan)
- **Topik / Kompetensi:** `Kata depan tempat — soal "Perhatikan percakapan dan lengkapi"`
- **Soal / Kalimat:** `"Your pencil fell. Look ___ your chair!"`
- **Kunci Jawaban:** `"under"` | **Pilihan Siswa yang Diuji:** `"on"`
- **Yang Ditampilkan ke Siswa Saat Ini:**
  > Nudge: `"Coba lagi — pilih jawaban lain"`; tuntunan: `"Langkah 1: Cermati penanda waktu atau kata petunjuk utama … Langkah 2: Cocokkan subjek dengan bentuk kata kerja yang sesuai aturan tata bahasa."`; pembahasan **tanpa** "Mengapa kurang tepat?".
- **Mengapa Ini Membingungkan / Membodohkan Siswa:**
  Soal dirakit dari template yang **sudah** membawa alasan per pilihan ("“on” artinya di atas dudukan kursi, padahal pensil yang jatuh ada di lantai"), tetapi alasannya dibuang dan `sourceId` tidak dipasang. Murid tidak pernah tahu kenapa "on" salah, dan diarahkan ke "subjek & bentuk kata kerja" untuk soal kata depan.
- **Rekomendasi Revisi yang Mencerdaskan:**
  > `"Pilihan “on” kurang tepat: artinya di atas dudukan kursi, padahal pensil yang jatuh ada di lantai. Coba pilih opsi lainnya ya!"` + `"Langkah 1: Perhatikan kata “fell”. Langkah 2: Tentukan letak pensilnya di bawah kursi. Langkah 3: Pilih kata untuk “di bawah”."`
- **Aturan Pembelajaran yang Ditanamkan (Takeaway Rule):**
  `on = menempel di atas permukaan; under = di bawahnya.`
- **Status:** diperbaiki — alasan dirakit lewat jalur yang sama dengan pilihan ganda (termasuk overlay th); `sourceId` dipasang.

### 🛑 [MAJOR] ID Soal / Template: `AR-004`
- **Topik / Kompetensi:** `Artikel + superlatif (the tallest)`
- **Soal / Kalimat:** `"Mount Everest is ___ tallest mountain in the world."`
- **Kunci Jawaban:** `"the"` | **Pilihan Siswa yang Diuji:** `"an"`
- **Yang Ditampilkan ke Siswa Saat Ini:**
  > `"“an” sama salahnya kayak “a”, ditambah salah timbang bunyi vokal."`
- **Mengapa Ini Membingungkan / Membodohkan Siswa:**
  Alasan dipinjam dari pilihan lain yang tidak dibaca murid ("sama salahnya kayak “a”" — alasan "a" terlipat di "Bandingkan pilihan lain"). "Salah timbang bunyi vokal" juga kabur: murid tidak tahu bunyi apa yang dimaksud.
- **Rekomendasi Revisi yang Mencerdaskan:**
  > `"“an” tetap artikel tak tentu, jadi gunungnya kebaca sebagai salah satu dari banyak, padahal “tallest” cuma punya satu juara. Lagi pula “an” cuma dipakai sebelum bunyi vokal, padahal “tallest” diawali bunyi /t/."`
- **Aturan Pembelajaran yang Ditanamkan (Takeaway Rule):**
  `Superlatif (-est / most) selalu satu-satunya juara → pakai “the”.`
- **Status:** diperbaiki (id; versi th sudah benar).

### 🛑 [MAJOR] ID Soal / Template: `QN-004`
- **Topik / Kompetensi:** `Negasi tunggal (didn't … anything)`
- **Soal / Kalimat:** `"I looked everywhere, but I didn't find ___ in the drawer."`
- **Kunci Jawaban:** `"anything"` | **Pilihan Siswa yang Diuji:** `"no thing"`
- **Yang Ditampilkan ke Siswa Saat Ini:**
  > `"“no thing” “nothing” itu satu kata, dipenggal jadi nggak baku."`
- **Mengapa Ini Membingungkan / Membodohkan Siswa:**
  Langkah perbaikan yang tersirat ("tulis saja satu kata: nothing") menggiring murid ke **pengecoh lain** yang juga salah (negatif dobel). Murid yang patuh akan salah lagi di percobaan kedua. Kutipan ganda "“no thing” “nothing”" juga terbaca patah.
- **Rekomendasi Revisi yang Mencerdaskan:**
  > `"“no thing” bukan bentuk baku (yang baku ditulis satu kata), dan apa pun bentuknya, “no” di sini tetap bikin negatif dobel bareng “didn't”."`
- **Aturan Pembelajaran yang Ditanamkan (Takeaway Rule):**
  `Satu kalimat cukup satu kata negatif: didn't + anything (bukan nothing).`
- **Status:** diperbaiki (id + cloze id + cloze th; template th sudah menyebut negatif dobel).

### 🛑 [MAJOR] ID Soal / Template: `RS-008`
- **Topik / Kompetensi:** `Kata kerja pelapor (tell vs suggest)`
- **Soal / Kalimat:** `"\"Hand in the report by Friday,\" the manager said. -> The manager ___ in the report by Friday."`
- **Kunci Jawaban:** `"told us to hand"` | **Pilihan Siswa yang Diuji:** `"suggested to hand"`
- **Yang Ditampilkan ke Siswa Saat Ini:**
  > `"sama kayak “admit”, kata “suggest” minta bentuk -ing atau anak kalimat that, bukan bentuk to; lagian ucapan aslinya perintah, bukan usulan."` (th: `"เหมือน “admit” …"`)
- **Mengapa Ini Membingungkan / Membodohkan Siswa:**
  Rujukan hantu: "admit" tidak ada di stem maupun opsi — sisa salinan dari template lain. Murid mencari "admit" yang tidak pernah ia lihat.
- **Rekomendasi Revisi yang Mencerdaskan:**
  > `"“suggested to hand” nggak sah, karena “suggest” nggak pernah diikuti bentuk to; pasangannya bentuk -ing atau anak kalimat that. Lagian ucapan aslinya perintah, bukan usulan."`
- **Aturan Pembelajaran yang Ditanamkan (Takeaway Rule):**
  `Perintah dilaporkan dengan tell + orang + to + Verb 1; suggest tidak pernah + to.`
- **Status:** diperbaiki (id + th template + cloze id + cloze th).

### 🛑 [MAJOR] ID Soal / Template: `A1-009`
- **Topik / Kompetensi:** `have got / has got (A1)`
- **Soal / Kalimat:** `"She ___ got a new phone."`
- **Kunci Jawaban:** `"has"` | **Pilihan Siswa yang Diuji:** `"does"`
- **Yang Ditampilkan ke Siswa Saat Ini:**
  > `"“does” does got nggak pernah bener di bahasa Inggris."` (th: `"does got ไม่เคยถูกต้องในภาษาอังกฤษ"`)
- **Mengapa Ini Membingungkan / Membodohkan Siswa:**
  Tautologi ("salah karena tidak pernah benar") untuk murid A1 — tidak ada kaidah yang bisa dibawa ke soal berikutnya.
- **Rekomendasi Revisi yang Mencerdaskan:**
  > `"“does” itu kata bantu yang selalu diikuti kata kerja bentuk dasar (does have), padahal sesudahnya di sini ada “got”. Pola punya “have got” cuma bisa dibuka kata bantu dari keluarga “have”."`
- **Aturan Pembelajaran yang Ditanamkan (Takeaway Rule):**
  `“got” untuk punya selalu berpasangan dengan have/has, tidak pernah dengan do/does.`
- **Status:** diperbaiki (id + th template + cloze id + cloze th).

### 🛑 [MAJOR] ID Soal / Template: `GI-032` (pola: alasan berawalan "kata …")
- **Topik / Kompetensi:** `Gerund sesudah kata depan — susun kata, pengecoh dipasang`
- **Soal / Kalimat:** `"My sister is really good at ___ with difficult customers without losing her temper."` (susun kata; murid memasang keping pengecoh "deal")
- **Kunci Jawaban:** `"dealing"` | **Pilihan Siswa yang Diuji:** `"deal"`
- **Yang Ditampilkan ke Siswa Saat Ini:**
  > `"kata kerja telanjang nggak bisa nempel di belakang kata depan."`
- **Mengapa Ini Membingungkan / Membodohkan Siswa:**
  Diagnosis mengembalikan alasan apa adanya bila diawali "kata" (dengan anggapan alasannya sudah menamai katanya, "Kata “X” …"). Alasan ini diawali "kata kerja …" — jadi murid tidak diberi tahu **kata mana** di relnya yang keliru.
- **Rekomendasi Revisi yang Mencerdaskan:**
  > `"Kata “deal” kurang pas di sini ya: kata kerja telanjang nggak bisa nempel di belakang kata depan."`
- **Aturan Pembelajaran yang Ditanamkan (Takeaway Rule):**
  `Sesudah kata depan (of, at, about), kata kerja selalu -ing.`
- **Status:** diperbaiki (hanya alasan berawalan `Kata “` yang dikembalikan apa adanya).

---

## 3. Temuan MINOR

| ID | Contoh | Masalah | Status |
|----|--------|---------|--------|
| m1 | `b4_017` "gone": *"bentuk ini cuma cocok di susunan pasif atau perfect."*; `b5_002` "was sending"/"send" | Alasan "setengah": menyebut fungsi bentuk, tidak menyebut kenapa gagal **di kalimat ini** — murid masih bertanya "lalu?" | 3 diperbaiki ("…padahal “let her” di kalimat aktif ini butuh kata kerja bentuk dasar"); kelas ini ±113 alasan (heuristik tanpa penghubung kontras/sebab) → utang §5 |
| m2 | cloze: *"Jawaban itu jebakan yang umum: kebiasaan dipakai buat kejadian yang lagi jalan.. Yang tepat: …"* | Titik ganda (1.304 `misconceptionId` berakhiran titik) | diperbaiki di `answerCloze` |
| m3 | *"Pilihan “can” kurang tepat: “can” “last night” …"* | Kutipan pilihan diulang di awal alasan | diperbaiki (nudge tingkat `hint`) |
| m4 | Keping "a" di "in a box" ikut digoyang saat retry | Isyarat visual menuduh kata yang benar | diperbaiki (hanya keping kelebihan) |
| m5 | `A1-022` "careful": *"…kata kerja “carry” butuhnya adverbia “carefully”… “with” cuma bisa diikuti nomina."* | Jargon "adverbia", "nomina", "komparatif" di level A1 tanpa padanan sehari-hari | utang §5 |

---

## 4. Dicek & bersih (kandidat yang ternyata sah)

- **"Bagus! Susunan kalimat sudah tepat" pada jawaban salah:** kunci `grammar.susunan-kalimat-tepat`
  memang menjadi cadangan `why` susun kata/video, tetapi `reveal()` menggantinya saat `ok:false`
  (`quiz.why-kalimat-tepat` / `quiz.why-bentuk-tepat`). Tidak ditemukan pujian pada jawaban salah.
- **30 alasan berawalan "bener/cocok/tepat"** (mis. `TA-009` *"bahasanya bener, tapi cuma nglaporin
  faktanya, nggak nonjolin lamanya belajar"*): kredit parsial yang jujur — mengakui bentuknya
  gramatikal lalu menunjuk makna yang meleset. Ini pedagogi yang baik, bukan gaslighting.
- **Pengecoh hantu / opsi tanpa alasan / kebocoran metadata / nada merendahkan:** 0 di 1.536 pengecoh
  (pemindai D1, D3, D5). Kutipan `“___”` di `EC-001`, `CM-007`, `b6_002` adalah kerangka pola sah
  ("“all the ___”"), bukan bocoran rumpang.
- **507 kutipan di alasan yang tidak ada di soal:** dibaca; hampir semuanya contoh pembanding sah
  ("“happy for”", "“because of the rain”", "sama dengan “he”"). Satu-satunya rujukan hantu: `RS-008`
  ("admit") — diperbaiki.
- **23 alasan yang menyebut pengecoh lain:** sah kecuali `AR-004` dan `QN-004` (diperbaiki).
  Contoh sah: `A2-311` "childs'" → *"jamak dari “child” adalah “children”"*.
- **Tangga tutor `worked` dengan aturan penuh** ("Kuncinya pada {aturan}…"): tidak pernah tampil di
  retry grammar (`speak()` menyembunyikan `worked` tanpa contoh mirip) — tidak ada temuan.

---

## 5. Utang (tidak dikerjakan di PR ini, bertanggal 2026-10-11)

1. **Terjemahan Thai 512 kalimat susun kata.** Locale th memakai mode kerangka Inggris (F3) sampai
   terjemahan Thai tersedia dan ditinjau penutur asli.
2. **Penjelasan reading per jenis soal.** "Tidak didukung teks" kini benar, tetapi soal *reference*
   dan *sequence* layak penjelasan yang menunjuk anteseden/urutan (contoh di F4).
3. **±113 alasan "setengah"** (m1) — butuh penulisan ulang manual id + th; daftar kandidat dari
   `tools/dev/braincore-pedagogy-audit-2026-10-11-probe.js`.
4. **Jargon A1** (m5) — "adverbia/nomina/komparatif" perlu padanan sehari-hari di level A1–A2.
5. **Generator Thai cloze basi:** `tools/generate-th-cloze.js` gagal dengan 600 string yang belum
   terpeta (kurasi aturan m025-541 tidak pernah dipetakan ke `tools/th-strings/cloze.json`). PR ini
   memetakan kalimat barunya dan menulis sidecar langsung; pemetaan 600 sisanya utang terpisah.
6. **Literal dua bahasa di `diagnoseTokenOrderMistake`** (bawaan lama, melanggar aturan i18n
   `CLAUDE.md`) — PR ini hanya menghapus literal "Pola yang pas"; migrasi ke kunci `copy-*` utang.
7. **Mode "bandingkan" saat retry** tetap mempersempit jawaban (alasan nyata pengecoh = ekor opsi
   kunci). Lebih baik dari tautologi lama, tetapi idealnya retry mode meta memakai isyarat
   (`howToAvoid`) alih-alih alasan.
8. **Pembangkit urutan alternatif sengaja konservatif:** "In 2010, nobody guessed…" yang dipindah
   ke belakang, atau keterangan di tengah kalimat, masih ditolak.
9. **Tinjauan penutur asli Thai** untuk naskah baru: `tutor-step.token-step-1..3`,
   `grammar.mode-contrast-expl-*`, alasan th `RS-008`, `A1-009`, `QN-004` (cloze), dan templat
   reading `ไม่มีข้อความในเนื้อเรื่องรองรับ`. Draf AI.

---

## 6. Peta perubahan

| Berkas | Perubahan |
|--------|-----------|
| `app.js` | `diagnoseTokenOrderMistake` (multiset pengecoh, tanpa tempelan aturan, opsi `hideKey`, alasan "kata …" dinamai); `grammarHideKey`; `tokenOrderMovableAlternates`; `makeGrammarTokenOrderQuestion` (alternatif, `blankAnswer`, prompt th); nudge retry + goyangan keping; `tutorCompose` (`preReveal`); mode bandingkan (`{alasan}`); video-grammar cadangan (alasan + `sourceId`); `grammarLessonExplain` (`clue`); `answerCloze` (titik ganda) |
| `features/grammar/fiezel-grammar-upgrade.js` | petunjuk tingkat 3/4 menyamarkan kunci; cadangan `distractors[0].reason` dihapus |
| `features/i18n/copy-{id,th}-feat-a.js` | `tutor-step.token-step-1..3` |
| `features/i18n/copy-{id,th}-app-a.js` | `grammar.mode-contrast-expl-{kebalik,sepadan,keliru}` → `{alasan}` |
| `grammar-templates.json`, `grammar-explanations-{id,th}.json`, `cloze-bank-v1.json`, `features/i18n/cloze-bank-th.json`, `tools/th-strings/cloze.json` | 7 alasan pengecoh (id) + 2 (th), lewat `tools/patch-braincore-pedagogy-2026-10-11.js` (idempoten) + `tools/sync-grammar-explanations-id.js --write` + `audit/merge-grammar-id.js` |
| `reading-bank.json`, `features/i18n/reading-bank-th.json`, `tools/reading-a12-explain.mjs`, `tools/generate-th-reading.js` | "tidak ada di teks" → "tidak didukung teks" (500 + 530) |
| `tests/braincore-pedagogy-audit-2026-10-11-test.js` | gerbang baru (15 cek), terdaftar di `quality.yml` |
| `tools/dev/braincore-pedagogy-audit-2026-10-11-probe.js` | pemindai forensik (bukan gerbang) |
| `id-golden-baseline.json` | diregenerasi sadar (`--write-baseline`) |
| `sw.js`, `core-config.js`, `fiezel-diag-panel.js`, `kurikulum.html`, `misi.html`, `coordination/BUILD-VERSION.json` | build `m025-568` |
