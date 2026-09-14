# Audit UI/UX FIEZEL — sumbu bahasa (m025-314)

Pemicu: laporan OWNER, 14 September 2026 — *"masih banyak bug dan konten yang tidak sesuai,
seperti i18n Thai, UI DAN UX Bahasa Jepang masih memuat konten bahasa Inggris, seharusnya
tampilan UI dan UX-nya ikut berubah."*

Audit ini membaca `app.js` + `features/**` terhadap DUA sumbu yang gampang tertukar:

| Sumbu | Nilai | Yang diatur |
|---|---|---|
| `learnerLocale` | `id` / `th` | bahasa LAYAR (naskah antarmuka) |
| `targetLang` | `en` / `ja` | bahasa yang DIPELAJARI (kursus mana yang dibuka) |

Temuan dikelompokkan per sumbu, lalu per keparahan. Setiap temuan menyebut berkas dan baris
pada `main` saat audit ditulis, dan menyatakan apakah ia DIPERBAIKI di PR ini atau DICATAT
sebagai utang.

---

## Ringkasan

| # | Temuan | Sumbu | Keparahan | Status |
|---|---|---|---|---|
| A1 | Tiga pintu masuk ke latihan dengar/bicara TIDAK dijaga bahasa target | ja | **P0** | diperbaiki |
| A2 | Seluruh prompt tutor AI dipaku "Bahasa Inggris" | ja | **P0** | diperbaiki |
| A3 | Tombol dengar di flashcard membaca kata Jepang dengan suara en-US | ja | **P1** | diperbaiki |
| A4 | Kartu "Lanjutkan Terakhir" menampilkan topik Inggris yang dikarang | ja + th | **P0** | diperbaiki |
| A5 | Kartu "AI Booster" menampilkan angka akurasi yang dikarang | ja + th | **P0** | diperbaiki |
| A6 | Label kartu latihan & skill hub ditulis Inggris langsung di `app.js` | th | **P1** | diperbaiki |
| A7 | Naskah beranda ditulis Indonesia langsung di `app.js` | th | **P1** | diperbaiki |
| B1 | Progres TIDAK dipisah per bahasa — janji di pemilih bahasa tidak ditepati | ja | **P0** | dicatat |
| B2 | Level aktif dibagi dua kursus; bank Jepang kosong di B1+ | ja | **P1** | dicatat |
| B3 | Bank cloze Inggris menyusup ke sesi Jepang | ja | **P1** | dicatat |
| B4 | Set ujian membaca (IELTS/TOEFL, teks Inggris) ditawarkan di kursus Jepang | ja | **P1** | dicatat |
| B5 | Murid Thai di kursus Jepang membaca penjelasan berbahasa Indonesia | th + ja | **P1** | dicatat |
| B6 | `adjective-na` dan `phrase` jatuh ke label jenis kata cadangan | ja | **P2** | dicatat |
| B7 | Peringatan pemilih bahasa bilang "baru A1", banknya sudah A2 | ja | **P2** | dicatat |
| C1 | `th-ui-leak-test` buta terhadap naskah di luar 40 kata dalam daftarnya | th | **P1** | dicatat |
| C2 | Tidak ada gerbang untuk literal INGGRIS di jalur render | th + ja | **P1** | diperbaiki |
| C3 | 35 kalimat Indonesia lain, terlihat begitu C1 diperbaiki | th | **P1** | dicatat |

---

## A. Diperbaiki di PR ini

### A1 — Tiga pintu masuk ke dengar/bicara tidak dijaga bahasa target (P0)

`tests/japanese-surface-honesty-test.js` ada justru untuk mencegah ini, dan ia hijau. Yang
dijaganya hanya DUA tempat: `latihanCards()` dan `todayPlanBlocks()`. Rute yang sama dibuka
dari tiga tempat lain yang tidak diperiksa siapa pun:

| Pintu | Berkas | Rute |
|---|---|---|
| kartu skill hub di Beranda | `app.js:7216-7217` (`skillHubModel`) | `go('listening')`, `go('speaking')` |
| chip "Dengar · Audio pendek" di Beranda | `app.js:7511` (`quickChips`) | `go('skills')` |
| rute itu sendiri | `app.js:6701` (`go`) / `app.js:6363` (`renderInner`) | ketiganya |

Chip "Dengar" berdiri **tepat di bawah** `targetLangChipMarkup()` — chip yang mengantar murid
ke Bahasa Jepang. Murid menekan yang atas untuk pindah ke Jepang, lalu menekan yang bawah dan
mendengar bahasa Inggris. Akar masalahnya arsitektural: **penjaga dipasang di kartu, bukan di
rute**, jadi setiap permukaan baru yang menunjuk rute itu lahir tanpa penjaga.

Perbaikan: satu fungsi `targetLangSurfaceBlocked(view)` menjadi sumber kebenaran, dipanggil
`go()` dan `renderInner()` (rute tertutup, dengan toast yang menjelaskan), dan dipakai ketiga
daftar kartu untuk menyembunyikan pintunya. Gerbang baru
`tests/target-lang-surface-guard-test.js` menuntut setiap penulisan `go('skills'|'listening'|
'speaking')` di jalur render berada di bawah penjaga itu.

### A2 — Seluruh prompt tutor AI dipaku "Bahasa Inggris" (P0)

Lima tempat merakit prompt, dan kelimanya menyebut kursusnya Inggris tanpa membaca
`activeTargetLang()`:

| Berkas | Kalimat pembuka prompt |
|---|---|
| `app.js:6315` (`askAI`) | `Kamu tutor Bahasa Inggris untuk siswa SMA Indonesia…` |
| `app.js:6390` (`coachSystemPrompt`) | `Kamu FIEZEL, pembimbing belajar Bahasa Inggris…` |
| `app.js:8976` (umpan balik menulis) | `Kamu penilai menulis Bahasa Inggris…` |
| `app.js:12497` (`explainWithAI`) | `Kamu tutor Bahasa Inggris untuk siswa Indonesia level…` |
| `app.js:12498` (`explainWordWithAI`) | `Kamu tutor kosakata Bahasa Inggris…` |

Dua di antaranya bukan sekadar salah label. `askAI` menutup promptnya dengan *"Kalau
pertanyaannya di luar topik Bahasa Inggris, katakan terus terang dan arahkan kembali"* — murid
Jepang yang bertanya soal partikel は justru ditolak dan disuruh kembali ke topik. Dan
`explainWordWithAI` meminta model *"Berikan satu contoh kalimat Inggris baru"* untuk kata yang
sedang dilihat murid dalam bahasa Jepang.

Yang memperparah: kartu menulis dan bank kosakata Jepang SENGAJA dihidupkan (m025-312), jadi
kedua permukaan yang paling sering memanggil AI adalah persis permukaan yang sudah berbahasa
Jepang.

Perbaikan: `courseLanguageLabel()` membaca `activeTargetLang()` dan mengembalikan nama kursus
dari copy-map (id/th), lalu kelima prompt menamai kursus yang sedang aktif.

### A3 — Tombol dengar flashcard memakai suara en-US untuk kata Jepang (P1)

`app.js:9450` memasang `speakWord` / `speakSentence` tanpa locale; seluruh tumpukan suara
dipaku `en-US` (`features/neural-voice/fiezel-neural-voice-config.js:38`,
`features/neural-voice/fiezel-voice-say.js:153`). Di kursus Jepang isi `v.word` adalah `青い`
dan `v.example` adalah `空が青いですね。` — dibacakan mesin Inggris.

Ini kelas bug yang SAMA dengan yang membuat kartu dengar/bicara disembunyikan di m025-312,
hanya di permukaan yang terlewat. Perbaikannya pun sama dan sudah jadi pola rumah: sembunyikan
tombolnya selama pakunya belum dicabut, jangan tawarkan bunyi yang salah.

### A4 — Kartu "Lanjutkan Terakhir" mengarang topiknya (P0)

`app.js:7279-7289`, dicat di tab Latihan lewat `latihan()` (`app.js:7305`). Seluruh isinya
literal, tidak satu pun dibaca dari state murid:

```
<small>Lanjutkan Terakhir · Level ${esc(activeLevel)}</small>
<b>Present Simple vs Continuous</b>
<small>Selesaikan materi untuk memperkuat bukti kemahiran</small>
```

Tiga kesalahan sekaligus: (1) judulnya kalimat Inggris yang dipaku, jadi murid Jepang membaca
topik tata bahasa Inggris; (2) kalimat Indonesianya tidak lewat `FiezelI18n`, jadi murid Thai
membacanya dalam bahasa Indonesia; (3) — yang terburuk — kartunya **berbohong**: ia mengaku
melanjutkan sesuatu yang terakhir dikerjakan murid, padahal isinya sama untuk setiap murid di
setiap keadaan, termasuk murid yang belum pernah membuka Grammar sekali pun.

### A5 — Kartu "AI Booster" mengarang angkanya (P0)

`app.js:7291-7299`, dicat di layar yang sama:

```
<b>Irregular Verbs (Past Tense)</b>
<small>Akurasi 58% · Direkomendasikan latihan 5 menit</small>
```

`58%` bukan hasil pengukuran apa pun — ia diketik. Aplikasi yang menyajikan angka karangan
sebagai hasil diagnosis adalah kelas cacat yang berbeda dari salah terjemahan, dan bertentangan
langsung dengan prinsip yang dipakai di seluruh panel Braincore ("belum cukup bukti" saat bukti
memang belum ada).

Perbaikan A4 + A5: kedua kartu kini dibangun dari bukti yang benar-benar ada
(`buildLearnerEvidenceModel()` untuk skill terlemah, riwayat sesi untuk "terakhir dikerjakan"),
dan **tidak dicat sama sekali** saat buktinya belum ada — bukan diganti angka lain.

### A6 / A7 — Naskah ditulis langsung di `app.js` (P1)

Melanggar aturan rumah di `CLAUDE.md` ("jangan pernah menulis kalimat langsung di `app.js`").
Yang ditemukan di jalur render Beranda + Latihan:

Inggris (sampai ke murid id MAUPUN th):
`Vocabulary`, `Grammar`, `Reading`, `Writing` (`latihanCards`, `app.js:7241-7275`);
`Listening`, `Speaking`, `Reading`, `Writing` (`skillHubModel`, `app.js:7216-7219`);
`Listening · Speaking · Reading · Writing` (`app.js:7318`); `Coming Soon`, `Classroom`
(`app.js:7595`); `Writing` dua kali di `writing()` (`app.js:8921`, `8923`).

Indonesia (sampai ke murid th):
`Runtun {n} hari! Mantap sekali, {nama}…` (`app.js:7474` — hanya cabang runtun > 0; cabang
runtun = 0 tepat di bawahnya SUDAH lewat i18n, jadi bugnya cuma terlihat pada murid yang punya
runtun); `Maskot PAW`, `Kata PAW` (`app.js:7479-7480`); `Ritme Harian`, `({n}/10 soal)`
(`app.js:7489`); `Latihan Singkat 3 Menit` (`app.js:7497`); `Kosakata`, `10 kartu cepat`,
`Pola kalimat`, `Dengar`, `Audio pendek` (`app.js:7503-7512`).

Semuanya dipindahkan ke pasangan `copy-id-*` / `copy-th-*` yang baru.

---

## B. Dicatat sebagai utang (TIDAK diperbaiki di PR ini)

### B1 — Progres tidak dipisah per bahasa (P0, utang terbesar)

`features/brain/fiezel-target-language.js` ada, lengkap, murni, dan diuji
(`tests/target-language-axis-test.js`, 10/10 hijau). **Tetapi `app.js` tidak pernah
memanggilnya untuk membentuk satu pun kunci penyimpanan.** Dua satu-satunya penyebutan
`FiezelTargetLanguage` di `app.js` (baris 11827, 11832) memakai `normalize()` saja.

Penamaan kunci sisi dikerjakan `sideStateKey()` (`app.js:3030`), dan ia hanya mengenal UUID
akun:

```js
function sideStateKey(base){return activeAccountUuid?base+':'+activeAccountUuid:base}
```

Akibatnya BKT, matriks konfusi, ledger miskonsepsi, kalibrasi item, jadwal ingatan, dan state
murid utama dipakai bersama oleh kursus Inggris dan Jepang. Gerbang sumbu bahasa tidak
menangkapnya karena ia menguji MODULNYA, bukan pemakaiannya.

Yang membuat ini P0 dan bukan sekadar rapi-rapi: kalimat yang dibaca murid di pemilih bahasa
berbunyi *"Progres tiap bahasa berdiri sendiri. Berganti tidak menghapus apa pun."*
(`copy-id-bahasa.js`, `bahasa.penjelasan`). Paruh keduanya benar; paruh pertamanya tidak.
Aplikasi menjanjikan pemisahan yang belum ada.

Jalan keluar yang disarankan: `sideStateKey()` memanggil
`FiezelTargetLanguage.key(base, activeTargetLang())` — kunci Inggris tetap identik byte per
byte (itu janji modulnya), jadi murid Inggris yang sudah ada tidak membayar apa pun. Perlu
PR sendiri karena menyentuh setiap pembaca state dan butuh gerbang migrasi.

### B2 — Level aktif dibagi dua kursus (P1)

`getActiveLevel()` (`app.js:1207`) membaca `state.preferences.activeLevel` yang juga tidak
bersumbu bahasa. Cakupan bank Jepang hari ini:

| Bank | A1 | A2 | B1 | B2 | C1 |
|---|---|---|---|---|---|
| tata bahasa | 242 | 180 | 0 | 0 | 0 |
| menulis | 24 | 30 | 0 | 0 | 0 |
| kosakata | 1000 | 327 | 278 | 202 | 77 |
| bacaan | 30 | 30 | 30 | 30 | 30 |

Murid B1 di kursus Inggris yang mencoba Jepang mendarat di B1 dan menemukan Grammar serta
Writing kosong — tanpa satu kalimat pun yang menjelaskan kenapa. Turunan langsung dari B1;
perbaikannya adalah menjepit level ke cakupan bank yang aktif, atau memisahkan level per
bahasa bersamaan dengan B1.

### B3 — Bank cloze Inggris menyusup ke sesi Jepang (P1)

`ensureClozeBank()` (`app.js:3598`) selalu menarik `cloze-bank-v1.json` (279 butir, kalimat
Inggris). `clozeAdaptivePicks()` (`app.js:3636`) menyaring dengan `level` + `clozeSkillReady()`,
dan `clozeSkillReady()` (`app.js:3631`) hanya menanyakan penguasaan BKT ≥ 0,6 — pada state BKT
yang dibagi bersama (B1). Murid yang pernah menguasai `present_simple_vs_continuous` di kursus
Inggris karena itu bisa menerima butir *"Look! The chef ___ a new dish right now"* di tengah
sesi Jepang. Tidak ada berkas `content/ja/cloze-bank-ja.json`.

### B4 — Set ujian membaca berbahasa Inggris di kursus Jepang (P1)

`READING_EXAM` dimuat tanpa cabang bahasa (`app.js:4277`), dan Ruang Reading mencetak kartu
"Latihan berformat ujian" tanpa memeriksa `activeTargetLang()` (`app.js:9889`). Isinya delapan
teks Inggris dalam format `ielts_academic_reading` / `toefl_reading` — mis. *"The Return of the
Urban Tram"*. Bank bacaan Jepang (`content/ja/reading-bank-ja.json`) memang menggantikan bacaan
biasa, tetapi set ujiannya tidak punya padanan dan tidak disembunyikan.

### B5 — Murid Thai di kursus Jepang membaca bahasa Indonesia (P1)

Bank Jepang membawa medan `*Id` (Indonesia) dan `*` (Inggris), tanpa medan Thai. Overlay Thai
untuk tata bahasa (`grammarItemForTh`, `app.js:1031`) menyambung lewat **id template**; id
Jepang berbentuk `JP-AD-101` sementara `grammar-explanations-th.json` hanya memuat id kursus
Inggris, jadi `if(!x)return item` selalu terpilih. `features/i18n/fiezel-th-loader.js` juga
tidak menarik satu pun aset `content/ja/`. Kombinasi layar Thai + kursus Jepang karena itu
menyajikan seluruh penjelasan, arti kosakata, dan terjemahan contoh dalam bahasa Indonesia.

### B6 — Jenis kata Jepang jatuh ke label cadangan (P2)

`PART_OF_SPEECH_ID` (`app.js:844`) tidak mengenal `adjective-na` (27 kata) dan `phrase`
(78 kata), jadi flashcard menampilkan label cadangan. Yang hilang justru pembedaan yang
diajarkan bank tata bahasanya sendiri (keluarga `i_adjective_before_noun_no_na`): kartu
menghapus perbedaan -i/-na tepat di kursus yang sedang mengajarkannya.

Di berkas yang sama, `vocabWordForms()` (`app.js:851`) menebak infleksi dengan aturan morfologi
Inggris (`+s`, `+ed`, `+ing`) dan `rxEsc` membuang setiap karakter di luar `[A-Za-z0-9_ ]` —
keduanya tidak punya arti untuk `青い`.

### B7 — Peringatan pemilih bahasa sudah tidak akurat (P2)

`bahasa.ja-peringatan` berbunyi *"baru tingkat A1"*. Bank hari ini memuat 180 butir tata
bahasa A2, 30 prompt menulis A2, dan bacaan sampai C1. Arah salahnya berlawanan dengan biasanya
— aplikasi MERENDAHKAN isinya — tetapi tetap membuat murid melewatkan latihan yang ada.
`tests/japanese-surface-honesty-test.js` sudah menjaga arah sebaliknya untuk menulis; assert
yang setara untuk klaim tingkat belum ada.

---

## C. Tentang gerbangnya sendiri

### C1 — `th-ui-leak-test` buta di luar daftar katanya (P1)

Gerbang itu hijau sepanjang audit ini, dengan anggaran `app.js: 1`. Ia mendeteksi lewat satu
regex daftar kata (`ID_WORDS`, ±40 kata) di `tests/th-ui-leak-test.js:110`. Setiap kalimat A7
lolos karena tak satu pun katanya ada di daftar — `Selesaikan` bukan `Selesai`, `Lanjutkan`
bukan `Lanjut`, dan `Ritme Harian`, `Akurasi`, `Kosakata`, `Dengar` tidak terdaftar sama
sekali.

Ini bukan alasan membuang gerbangnya: ia memang menangkap ±200 kebocoran saat lahir. Tetapi
angkanya harus dibaca sebagai *"kebocoran yang cocok dengan 40 kata ini"*, bukan *"kebocoran"*.
PR ini menambah kata yang tertangkap audit ke `ID_WORDS` supaya kalimat yang sama tidak bisa
lahir kembali diam-diam.

### C2 — Tidak ada gerbang untuk literal INGGRIS (diperbaiki)

Tidak ada satu pun gerbang yang melihat `Vocabulary`, `Grammar`, `Writing`, `Coming Soon`, atau
`Present Simple vs Continuous` di jalur render — untuk murid Thai kalimat Inggris sama tidak
terbacanya dengan kalimat Indonesia, dan untuk murid Jepang ia lebih buruk lagi karena
menamai kursus yang salah. `tests/target-lang-surface-guard-test.js` kini menutup dua celah
sekaligus: penjaga rute (A1) dan literal berbahasa Inggris di daftar kartu Beranda/Latihan.

### C3 — 35 kalimat Indonesia yang baru terlihat setelah C1 diperbaiki (P1, dicatat)

Memperlebar `ID_WORDS` (C1) langsung menerangi **35 kalimat Indonesia lain** di jalur render
yang selama ini tidak terlihat gerbang mana pun. Tak satu pun lahir di PR ini; yang berubah
hanya mata gerbangnya. Semuanya kini dinyatakan sebagai anggaran bertanggal di
`tests/th-ui-leak-test.js`, bukan disembunyikan dengan mempersempit daftarnya kembali.

Yang paling perlu diketahui owner: sebagian besar bukan layar guru, melainkan **naskah yang
dibaca murid setiap sesi**.

| Berkas | Jml | Contoh | Siapa yang membaca |
|---|---|---|---|
| `features/brain/fiezel-tutor-brain.js` | +1 (3→4) | *"Belum ada jawaban di sesi ini."* | murid, tiap kuis |
| `features/brain/fiezel-listening-adaptive.js` | 3 | *"Akurasi di bawah target dan replay sudah penuh…"* | murid, sesi menyimak |
| `features/brain/fiezel-step-tutor.js` | 1 | *"Sekarang gabungkan langkah-langkah tadi"* | murid, tutor langkah |
| `features/learner-flow/fiezel-learner-flow.js` | 1 | *"…jadi pola ini akan diulang lagi besok."* | murid, transisi sesi |
| `features/learner-flow/fiezel-review-bank.js` | 1 | *"Sekarang buka."* | murid, kartu ulangan |
| `features/class-hub/fiezel-braincore-review.js` | 2 | *"Latihan membaca terpandu"* | murid, kartu ulasan |
| `features/class-hub/fiezel-class-hub.js` | +4 (1→5) | *"Tugas disimpan sebagai…"* | murid, KelasKu |
| `features/prasasti/fiezel-prasasti-core.js` | +2 (3→5) | *"Kolektor Runtun"*, *"Belajar bermakna 7 hari beruntun."* | murid, prasasti |
| `app.js` | +2 (1→3) | *"Selesaikan ritme hari ini"*, *"Latihan"* | murid, Beranda |
| `features/teacher/fiezel-teacher-shell.js` | 4 | *"📖 Kosakata Kunci:"* | guru |
| `features/teacher/fiezel-teacher-store.js` | 3 | *"• Akurasi keseluruhan:"* | guru |
| `features/tutor-action-center/fiezel-tutor-action-center.js` | 3 | *"Latihan terkirim"* | tutor |
| `features/tutor-classroom/fiezel-tutor-v3.js` | 1 | *"…subjek, have atau has, lalu bentuk ketiga kata kerja"* | **murid** |
| `features/curriculum/learning-mission.js` | +1 (19→20) | *"Masuk dengan Google"* | murid (Kurikulum Merdeka) |

Baris terakhir yang bertanda tebal salah **dua kali**: ia berbahasa Indonesia untuk murid
Thai, DAN isinya tata bahasa Inggris (*present perfect*) yang disajikan tanpa memeriksa
bahasa target — jadi murid Jepang pun membacanya. Ia masuk kelas temuan yang sama dengan A4.

`features/prasasti/fiezel-prasasti-core.js` tidak boleh disentuh lewat sapuan mekanis: sha-nya
dikunci `id-golden-snapshot` dan ia punya protokol Thai sendiri (`CANON_TH_RULES`). Jalurnya
copy-map, bukan suntingan langsung.

---

## Cara memverifikasi ulang

```
node tests/target-lang-surface-guard-test.js
node tests/japanese-surface-honesty-test.js
node tests/th-ui-leak-test.js
node tests/th-coverage-test.js
node tests/i18n-kunci-hantu-test.js
```
