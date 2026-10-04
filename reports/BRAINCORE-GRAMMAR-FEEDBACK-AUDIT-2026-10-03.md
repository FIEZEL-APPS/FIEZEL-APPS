# Audit umpan balik BrainCore saat murid salah menjawab latihan grammar — 2026-10-03

**Basis:** `main` @ `c15dadd` (build `m025-440`) · **Cakupan:** semua yang dilihat murid antara
"jawaban salah" dan "soal berikutnya" di latihan grammar — pilihan ganda (`type:'grammar'`),
susun kata (`token-order`), dan `video-grammar` yang memakai jalur jawaban yang sama:
`answer()` / `reveal()` / `speak()` di `app.js`, jembatan tutor (`tutorCompose`,
`tutorWhyFails`, `diagnoseTokenOrderMistake`), `features/brain/fiezel-tutor-brain.js`
(`scaffoldLevel` / `decideMove` / `composeTurn`), dan `features/grammar/fiezel-grammar-upgrade.js`
(widget susun kata m025-436/437, petunjuk 4 tingkat, `buildFeedbackHTML`).

**Bukti yang bisa diulang:** `node tools/dev/braincore-grammar-feedback-audit-2026-10-03-probe.js`
— menjalankan `index.html` sungguhan di Chromium (Playwright), menjawab dengan **mengklik
tombol seperti murid**, lalu membaca layar dan `state.history`. Kode kuis tidak diubah;
soal aktif hanya *ditangkap* lewat pegangan modul yang memang menerimanya. Setiap klaim di
bawah menunjuk nomor probe (P1–P13). Probe dijalankan tiga kali; angka P8 bergeser
sedikit karena pilihan diacak ulang tiap run (rentangnya ditulis), urutan besarnya stabil.

> **Status:** seluruh temuan G1–G12 sudah diperbaiki di build `m025-442` dan dikunci gerbang
> `tests/grammar-feedback-regression-test.js` — lihat §8. Bagian 1–7 adalah keadaan SEBELUM
> perbaikan (basis `c15dadd`), dibiarkan apa adanya sebagai catatan audit.

Aturan tulis sama seperti laporan Braincore sebelumnya: setiap klaim membawa angka atau baris
kode; yang belum terbukti ditulis sebagai belum terbukti.

---

## 1. Vonis singkat

Otak tutornya (tangga `probe → hint → worked → tell`, diagnosis miskonsepsi, rotasi
penjelasan) **dirancang dengan baik dan teruji di level modul** — tetapi kabel ke layar
memotong sebagian besar isinya, dan tiga cacat langsung merugikan murid:

1. **Susun kata dinilai lebih longgar dari pilihan ganda.** Widget m025-436 menahan
   kiriman salah pertama sebelum `answer()` melihatnya, jadi murid mendapat **3 kesempatan**
   (bukan 2 seperti yang dijanjikan layar), dan *salah-lalu-benar* tercatat sebagai **benar di
   percobaan pertama**: skor, combo, gems, dan mastery naik penuh (P1, P2).
2. **Seperlima alasan "Mengapa kurang tepat?" milik pilihan lain.** Pencocok substring di
   `reveal()` memasangkan alasan opsi yang salah: 1.346–1.380 dari 6.300 pilihan salah,
   dan 469–491 di antaranya justru menampilkan alasan **kunci jawaban** ("“go” bener — …") di
   bawah judul "kenapa pilihanmu salah" (P8).
3. **Murid Thai membaca umpan balik salah dalam bahasa Indonesia** — petunjuk widget susun
   kata 100% Indonesia, dan nudge retry pilihan ganda mencampur dua bahasa dalam satu kalimat
   (P7). Sebagian berasal dari m025-437, yang mengganti panggilan `FiezelI18n.t()` dengan
   literal; gerbang `tests/th-ui-leak-test.js` tetap hijau karena daftar katanya tidak
   mengenali kalimat-kalimat ini.

Selain itu: giliran tutor BrainCore **tidak pernah tampil** pada saat yang dirancang untuknya
(retry), dan sesudah pembahasan dibuka tutor masih menyuruh murid "coba jawab lagi" pada
pilihan yang sudah terkunci (P5, P6b).

---

## 2. Ringkasan temuan

| ID | Tingkat | Area | Temuan | Bukti |
|----|---------|------|--------|-------|
| G1 | **Tinggi** | widget susun kata + `answer()` | Dua lapis scaffold bertumpuk: 3 kesempatan, salah-lalu-benar dinilai benar penuh | P1, P2 |
| G2 | **Tinggi** | `reveal()`, `tutorWhyFails()` | "Mengapa kurang tepat?" memakai alasan pilihan lain (±21–22%), termasuk alasan kunci (±7,5%) | P8, P12 |
| G3 | **Tinggi** | widget + `answer()` + i18n | Umpan balik salah sampai ke murid Thai dalam bahasa Indonesia; 17 literal tanpa `t()` | P7a, P7c, P11 |
| G4 | Sedang | `answer()` mistake vault | Lencana "2x keliru" muncul setelah SATU kesalahan | P4 |
| G5 | Sedang | `speak()` | Giliran tutor BrainCore (tangga scaffold) disembunyikan saat retry | P5, P12 |
| G6 | Sedang | `reveal()` → `tutorCompose` | Sesudah pembahasan dibuka, tutor menyuruh "coba jawab lagi"; alasan diulang dua kali | P6, P6b |
| G7 | Sedang | `tutorCompose` → `composeTurn` | Dipanggil tanpa `session`/`chosenOption`/`correctAnswer`/`sentence`: rotasi penjelasan mati, contoh-dikerjakan tinggal langkah 1 | P10, P10b |
| G8 | Sedang | petunjuk 4 tingkat | Tingkat 4 (sebelum menjawab) menyebut kunci di ±78% soal; pemakaian petunjuk tidak dicatat | P13 |
| G9 | Rendah | susun kata → AI | "Jelaskan lebih sederhana" mengirim jawaban murid sebagai "-" | P3 |
| G10 | Rendah | `record()` + pil telemetri | Susun kata & video-grammar tidak masuk BKT, tetapi pembahasannya memajang "BKT x%" | P12 |
| G11 | Rendah | naskah tutor | Kalimat cadangan probe/hint selalu soal "penanda waktu", dipakai untuk konsep apa pun | P10b |
| G12 | Rendah | `buildFeedbackHTML` | Tombol "Simpan Rumus ke Catatan" tidak menyimpan apa pun; AI inline memakai `q`/`j` yang tidak ada — **kode mati** di PWA hari ini | P12 |
| — | Dicek | overlay th | Alasan pengecoh susun kata di locale th: 1.536/1.536 sudah Thai, tidak tertutup `whyFailsId` | P9 |

---

## 3. Temuan tinggi

### G1 — Susun kata: dua scaffold bertumpuk, salah-lalu-benar dinilai benar penuh

**Di mana.**
- `features/grammar/fiezel-grammar-upgrade.js:276-305` — pada kiriman salah pertama widget
  memasang `q.__scaffoldAttempt = true`, menampilkan kotak "PETUNJUK · 1 KESEMPATAN LAGI",
  lalu `return` **tanpa memanggil `onComplete`**.
- `app.js:13305` — kiriman berikutnya baru masuk ke `answer()`.
- `app.js:13722` — `firstTry = answer.retryOf !== q.id`; karena `answer()` belum pernah melihat
  soal ini, kiriman kedua dihitung **percobaan pertama**, dan bila salah, cabang retry app
  (`app.js:13859` dst.) memberi satu kesempatan lagi.

**Yang terukur (P1)** — kalimat "The meeting is on Monday morning." dikirim terbalik terus:

| Kiriman | Baris riwayat baru | Yang tampil |
|---|---|---|
| 1 | 0 | widget: "PETUNJUK · 1 KESEMPATAN LAGI — Coba periksa sekali lagi" |
| 2 | 1 (`ok:false`) | app: "Belum tepat, tapi kamu masih punya satu kesempatan lagi nih!" |
| 3 | 0 | popup vonis → pembahasan |

Layar menjanjikan "1 kesempatan lagi" **dua kali berturut-turut**.

**Salah lalu benar (P2):** kiriman salah → 0 baris riwayat; kiriman benar → 1 baris
`{ok:true, selectedIndex:0}`; mastery `state.grammar[skill]` **0 → 20**; vonis "Bagus sekali!
Kamu berhasil memperbaikinya sendiri! 🌟". Karena masuk cabang `firstTry`, ikut naik juga
`score++`, combo, gems (`awardQuizGems`), dan `mistakeVault` dikurangi.

**Kenapa ini penting.** Komentar di `answer()` sendiri menyatakan prinsipnya: "PENILAIAN HANYA
PADA PERCOBAAN PERTAMA … menghitungnya sebagai benar membuat penguasaan yang dilaporkan lebih
tinggi daripada yang sebenarnya." Pilihan ganda yang salah-lalu-benar tercatat `ok:false` +
kredit 0,75; susun kata yang sama tercatat `ok:true` + kredit penuh. Kesalahan pertama juga
tidak pernah sampai ke `tutorObserve` — tutor, afek, decision trace, dan buku besar
miskonsepsi buta terhadapnya.

**Bonus kualitas:** petunjuk widget untuk kesalahan urutan murni berbunyi "Perhatikan bentuk
kata kerja dan subjek kalimatmu" (P1) — diagnosis yang keliru, padahal BrainCore sudah punya
`diagnoseTokenOrderMistake()` yang menunjuk kata persis yang salah posisi.

**Rekomendasi.** Hapus blok scaffold internal widget (`:276-305`) sehingga setiap kiriman
langsung ke `onComplete` → `answer()`; animasi goyang boleh dipertahankan. Retry dan
diagnosisnya sudah ditangani `answer()` + `diagnoseTokenOrderMistake()` dengan benar.

### G2 — "Mengapa kurang tepat?" memakai alasan pilihan lain

**Di mana.**
- `app.js:13594` (`reveal`): `xNorm===pNorm || (pNorm.includes(xNorm) || xNorm.includes(pNorm))`
  dalam satu `find()` — elemen pertama yang cocok **secara substring** menang, padahal daftar
  `q.explain.distractors` berisi **semua** pilihan termasuk kunci, dalam urutan acak.
- `app.js:5370` (`tutorWhyFails`, dipakai kalimat "Pilihan tadi kurang pas karena …" milik
  tutor dan kartu reteach): `oNorm===cNorm || cNorm.includes(oNorm)`.
- Bandingkan `app.js:13895` (nudge retry): pencocokan **eksak**. Jadi untuk pilihan yang
  sama, nudge retry dan pembahasan bisa memberi alasan yang berbeda.

**Yang terukur (P8)** — 2.100 soal pilihan ganda dari semua level, 6.300 pilihan salah:

| Jalur | Alasan salah alamat | …dan alamatnya kunci jawaban |
|---|---|---|
| `reveal()` "Mengapa kurang tepat?" | 1.346–1.380 (±21–22%) | 469–491 (±7,4–7,8%) |
| `tutorWhyFails()` (kalimat tutor) | 773–805 (±12–13%) | 261–283 (±4–4,5%) |

Contoh nyata (present_simple_basics): murid memilih **"going"**, kotak "Mengapa kurang
tepat?" menulis **"“go” bener — “We” itu jamak, jadi kata kerjanya tetap bentuk dasar: we go."**
Alasan miliknya sendiri ("“going” butuh “are” di depannya…") ada di data, tetapi kalah urutan.
Pola yang sama: plays→play, playing→play, watch→watches.

**Rekomendasi.** Satu pencocok bersama: cari eksak di seluruh daftar dulu; substring hanya
sebagai cadangan, hanya di antara pilihan **salah**, dan tidak pernah mengembalikan entri kunci.

### G3 — Umpan balik salah sampai ke murid Thai dalam bahasa Indonesia

**Yang terukur (locale `th`):**
- **P7a** — petunjuk widget susun kata setelah memasang pengecoh "in":
  "💡 PETUNJUK · 1 KESEMPATAN LAGI · Cek kata “in” · Kata “in” mungkin belum sesuai dengan
  konteks kalimat. Coba ganti dengan bentuk lain di bank kata." — **0 aksara Thai**. Tombol
  "📖 Intip arti kata" juga Indonesia, dan kamus gloss (`'dia (pr)'`, `'minum (+s)'`, …) hanya
  Indonesia.
- **P7c** — nudge retry pilihan ganda: "Pilihan “my” kurang tepat: “my” ต้องมีคำนามตามหลัง …
  Coba pilih opsi lainnya ya!" — bingkai Indonesia, isi Thai, dalam satu kalimat.
- **P7b** (pembanding) — diagnosis susun kata dari BrainCore di percobaan berikutnya sudah
  Thai penuh. Jadi dalam satu soal yang sama murid Thai berpindah bahasa dua kali.

**Daftar literal (P11), 17 baris:** `fiezel-grammar-upgrade.js:116` (kamus gloss), `:147`,
`:218`, `:243`, `:284-292`, `:297`, `:635`, `:641`; `app.js:11890` ("Kata “X” bukan bentuk
yang tepat."), `app.js:13608` ("Kalimat yang tepat: …" / "Bentuk yang tepat: …"),
`app.js:13909`, `app.js:13911`.

**Akar.** m025-437 (`88309c9`, "register-clean i18n keys") justru **mencabut** panggilan
`FiezelI18n.t('grammar.hint-*', …)`, `t('grammar.intip-arti')`, `t('grammar.pin-formula')`,
`t('grammar.contrast-title')` dan menggantinya dengan literal, alih-alih mendaftarkan kuncinya
di pasangan `copy-id-*`/`copy-th-*`. Itu kebalikan dari aturan di `CLAUDE.md`.
`tests/th-ui-leak-test.js` tetap **PASS** di `main` (dijalankan ulang untuk audit ini) karena
pemindainya heuristik daftar kata.

**Rekomendasi.** Daftarkan kunci di satu pasangan domain (mis. `copy-id-grammar-coach.js` +
`copy-th-grammar-coach.js`, ditemukan otomatis oleh `tests/th-coverage-test.js`) dengan
placeholder `{word}` / `{pilihan}` / `{alasan}`; ganti ke-17 literal dengan `FiezelI18n.t()`.
Kamus gloss butuh padanan Thai atau tombolnya disembunyikan di `th` sampai tersedia (dicatat
sebagai utang bertanggal). Pertimbangkan menambah kata-kata ini ke `ID_WORDS` gerbang supaya
regresi serupa merah.

---

## 4. Temuan sedang

### G4 — Lencana "2x keliru" setelah satu kesalahan

`app.js:13771`: `state.mistakeVault[mk] = Math.max(2, n + 1)` — kesalahan pertama langsung
menulis 2, dan `app.js:13648` menampilkan lencana bila `>= 2`. **P4:** riwayat berisi tepat
1 kesalahan pada skill itu, vault = 2, pil pembahasan: "BKT 19% · I, Me, My: Tiga Wujud Kata
Ganti · **2x keliru** · Review 1h". Murid dihakimi "berulang" pada kesalahan pertamanya.
**Rekomendasi:** hitung apa adanya (`n + 1`); bila "lulus dua sesi" memang tujuannya, simpan
di bidang terpisah, jangan menumpang di hitungan. (Catatan kecil pada pil yang sama:
"Review 1h" — `quiz.review-in-days` = `'Review {days}h'` — terbaca "1 jam", dan "BKT 19%"
adalah jargon mesin di layar murid.)

### G5 — Tangga scaffold BrainCore disembunyikan saat retry

`app.js:13396`: `showSayAndAsk = !retry || !q.__diagnosticClue`. Pada retry, `__diagnosticClue`
**selalu** terisi — pilihan ganda punya cadangan generik (`app.js:13915-13917`), susun kata
selalu mengembalikan diagnosis (`app.js:13884`) — jadi `say`/`ask` tutor tidak pernah tampil.
**P5:** `composeTurn` menghasilkan tangga `hint` "Kunci ingatannya: “Brother” jadi “he”,
“sister” jadi “she”. Sekarang coba jawab lagi ya." — yang tampil di kotak tutor hanya nudge
alasan + tuntunan langkah. Satu-satunya momen yang dirancang untuk tangga probe/hint/worked
membuang hasilnya. **Rekomendasi:** tampilkan nudge sebagai `say` dan tetap tampilkan
`turn.ask` (keduanya saling melengkapi: *kenapa salah* + *pijakan berikutnya*).

### G6 — Sesudah pembahasan dibuka, tutor menyuruh "coba jawab lagi"

`app.js:13574`: `reveal()` memanggil `tutorCompose(q, j, ok, answer.scaffold || 'tell', …)`.
Tangga `hint`/`probe` di `composeTurn` ditutup kalimat "Sekarang coba jawab lagi ya" / "Yuk
coba lagi". **P6b:** salah sekali → tombol "Buka Pembahasan" → semua pilihan terkunci, kotak
tutor: "…Kunci ingatannya: “My” selalu ditemani kata benda… **Sekarang coba jawab lagi ya.**"
**P6** (salah dua kali, tangga `worked`): kotak tutor mengulang kalimat yang **sama persis**
dengan "Mengapa kurang tepat?" di kotak pembahasan tepat di atasnya ("…karena Di kalimat ini,
“She” bentuk subjek…", termasuk huruf kapital di tengah kalimat), lalu "Aku contohkan satu
yang mirip dulu ya" — yang tidak pernah datang (lihat G7). **Rekomendasi:** di `reveal()`
pakai frasa pasca-buka (tangga `tell`, atau kunci naskah baru tanpa ajakan mencoba), dan
jangan ulangi `whyFails` bila kotak pembahasan sudah menampilkannya.

### G7 — `composeTurn` dipanggil setengah input

`tutorCompose` (`app.js:5378-5397`) mengirim `move/scaffold/explanation/whyFails/conceptLabel/
timing` saja — **tanpa** argumen `session`, dan tanpa `concept`, `chosenOption`,
`correctAnswer`, `sentence`. **P10:** keempat giliran sesi tercatat `sessionPassed:false,
chosenOptionPassed:false, correctAnswerPassed:false, sentencePassed:false`. Akibatnya:
- rotasi "jangan ulangi penjelasan yang terbukti gagal" (`explanationsUsed`,
  `lastExplanation`) tidak pernah jalan di produksi — hanya hidup di tes modul;
- varian kontras "jawabanmu X vs bentuk tepat Y" tidak pernah terbentuk;
- contoh-dikerjakan tinggal **Langkah 1** (P10b: input ala app → hanya aturan; input lengkap →
  Langkah 1-2-3 dengan kalimat soal dan jawaban), padahal pengantarnya menjanjikan contoh.

Catatan pelaksanaan: `tutorCompose` berada di bentang yang dibekukan byte-per-byte gerbang
id-golden (lihat komentar `app.js:4691-4700`); perbaikannya perlu pembaruan baseline yang
disengaja, atau dekorator di batas app seperti pola `brainNaskahTh`.

### G8 — Petunjuk tingkat 4 membuka kunci sebelum menjawab, tanpa jejak

Popover petunjuk (`fiezel-grammar-upgrade.js:486-507`) tingkat 4 menampilkan `explain.why`
apa adanya. **P13:** pada 1.635 dari 2.100 soal pilihan ganda (±78%) teks itu menyebut
**kunci dan hanya kunci** — "“at” pas di sini — “7:45” itu jam yang persis". Pemakaian
petunjuk tidak dicatat di mana pun (tidak ada `hintUsed`/`__hintLevel`), jadi jawaban yang
dibuka petunjuk masuk sebagai benar-mandiri ke skor, BKT (dengan kappa penuh), mastery, dan
gems. Ini di luar momen "salah", tetapi mencemari bukti yang dipakai BrainCore untuk memilih
umpan balik berikutnya. **Rekomendasi:** catat tingkat petunjuk tertinggi di soal, teruskan ke
`record()` sebagai kredibilitas lebih rendah (pola yang sama dengan retry), atau tahan tingkat
4 sampai sesudah percobaan pertama.

---

## 5. Temuan rendah

- **G9 — AI explain susun kata kehilangan jawaban murid.** `answer(q, -1, …)` (`app.js:13305`)
  → `explainWithAI(q, -1)` → prompt "Jawaban siswa: -", `ctx.stage.selected = ''` (P3), padahal
  `q.__userTokenAnswer` tersedia. Pakai itu untuk `token-order`.
- **G10 — Pil "BKT x%" untuk jawaban yang tidak masuk BKT.** `record()` hanya memanggil
  `bktRecord` untuk `q.type === 'grammar'` (`app.js:2689`); susun kata dan video-grammar tidak
  masuk BKT, kalibrasi item, maupun confusion matrix, tetapi pembahasannya tetap memajang
  persentase BKT skill itu. Perlu keputusan: masukkan (dengan bobot sendiri) atau sembunyikan
  pilnya untuk tipe itu.
- **G11 — Kalimat cadangan tutor selalu soal waktu.** `brain-tutor.hint-default` ("Petunjuknya
  ada di kata yang menunjukkan kapan kejadiannya") dan `brain-tutor.probe-default` ("…kata
  penunjuk waktu…") dipakai untuk konsep apa pun bila `memoryCue`/`howToAvoid` kosong (P10b).
  Untuk pilihan ganda jarang terpicu (`avoid` selalu punya cadangan), tetapi `explain` susun
  kata tidak punya `avoid`.
- **G12 — `buildFeedbackHTML` (m025-436) belum tersambung, dan rusak bila disambung.** Fungsi
  ini hanya dipanggil `renderVideoExercise`, yang hanya dipakai `mockups/` (P12: tidak ada
  pemanggil di `app.js`). Di dalamnya: tombol "🔖 Simpan Rumus ke Catatan" memanggil
  `gxPinFormula` yang tidak didefinisikan di mana pun — tombol hanya berganti kelas `pinned`
  (terlihat tersimpan, tidak menyimpan apa pun); `onclick="explainWithAI(q, j)"` merujuk
  variabel global yang tidak ada; kartu "Beda dengan Bahasa Indonesia" literal. Hapus atau
  perbaiki sebelum disambung.

---

## 6. Yang dicek dan bersih

- **P9** — overlay th untuk alasan pengecoh susun kata: 1.536/1.536 entri `item[17]` sudah
  Thai dan tidak tertutup `whyFailsId` Indonesia. Dugaan awal audit ini **tidak terbukti**.
- **P7b** — diagnosis susun kata dari BrainCore (`diagnoseTokenOrderMistake`) di locale th:
  358 aksara Thai, nol penanda Indonesia.
- Nudge retry pilihan ganda mencocokkan alasan secara **eksak** (`app.js:13895`) — G2 hanya
  terjadi di `reveal()` dan kalimat tutor.
- Naskah tutor-brain th memang tersuntik lewat dekorator `brainNaskahTh('tutor')`
  (`app.js:4701-4706`).

Belum diuji di audit ini: mode ukur (placement / ujian level) dan Ujian Skip Level
(`cfg.noHints`) — keduanya punya cabang sendiri di `answer()`/`reveal()`.

---

## 7. Urutan perbaikan yang disarankan

1. **G1** — hapus scaffold internal widget (satu blok, satu berkas). Memulihkan integritas
   nilai dan membuat kesalahan pertama terlihat oleh BrainCore.
2. **G2** — satu pencocok alasan eksak-dulu, tanpa kunci, dipakai `reveal()` dan
   `tutorWhyFails()`.
3. **G3** — pasangan copy id/th untuk ke-17 literal + kata gerbang.
4. **G4** — satu baris.
5. **G5 + G6 + G7** — satu pekerjaan kabel tutor (menyentuh bentang id-golden, perlu baseline).
6. **G8**, lalu G9–G12.

Setiap perbaikan G1–G4 sebaiknya membawa gerbang yang memakai skenario probe ini (klik
sungguhan di Chromium), karena keempatnya lolos dari 300+ gerbang yang ada.

---

## 8. Status perbaikan (build `m025-442`)

Semua temuan G1–G12 diperbaiki di PR yang sama, dalam dua gelombang: Fase 1 (G1–G4, G6, G12,
kontraksi cloze) dan Fase 2 (G5, G7–G11, disetujui owner 2026-10-04).

| ID | Status | Yang berubah |
|----|--------|--------------|
| G1 | **Diperbaiki** | Widget susun kata tidak lagi menahan kiriman salah; setiap kiriman sampai ke `answer()`. Dua kesempatan, salah-lalu-benar tercatat salah di percobaan pertama (sama dengan pilihan ganda). Bonus: di mode ukur (placement/ujian) widget dulu juga menahan kiriman salah pertama — kini satu kiriman = satu jawaban. |
| G2 | **Diperbaiki** | Satu pencocok `grammarReasonEntry()` untuk `reveal()`, nudge retry, dan `tutorWhyFails()`: eksak dulu; cadangan substring per kata utuh, hanya di antara pilihan salah, hanya bila tepat satu, tidak pernah kunci. Salah alamat di 2.100 soal: **0**. |
| G3 | **Diperbaiki** | 17 literal pindah ke pasangan `copy-id/th-app-e` + `copy-id/th-grammar-labels`. Gloss susun kata juga dari bank kosakata ber-overlay locale (th hanya arti beraksara Thai); tombol gloss disembunyikan bila tidak ada arti. `tests/th-ui-leak-test.js` kini juga mengenali *Kesempatan/KESEMPATAN/Intip*. |
| G4 | **Diperbaiki** | Lencana "Nx keliru" menghitung jawaban salah sungguhan dari riwayat. "Review {days}h" → "Review {days} hari". |
| G5 | **Diperbaiki** | Retry grammar menampilkan alasan pilihan salah + SATU anak tangga BrainCore berlabel dua bahasa: *Pertanyaan penuntun* (probe), *Pegangan ingatan* (hint), *Contoh mirip dari soal lain* (worked). Tuntunan langkah soal ini hanya cadangan (`worked` tanpa contoh mirip, atau murid frustrasi). Tipe non-grammar tidak berubah. |
| G6 | **Diperbaiki** | Sesudah pembahasan jawaban salah dibuka, kotak tutor tidak mengulang alasan dan tidak menyuruh "coba jawab lagi"; tutor hanya bicara bila ada sinyal "terlalu cepat". |
| G7 | **Diperbaiki** | Retry mengirim sesi tutor + id konsep ke `composeTurn`, jadi rotasi "jangan ulangi penjelasan yang gagal" dan pemudaran bantuan (`assisted`) hidup di produksi. Anak tangga `worked` memakai contoh dari soal LAIN di lesson yang sama (`grammarSimilarExample`), dengan jawaban yang tidak sama dengan pilihan/kata mana pun di soal ini: tersedia di 1.445/2.100 soal, kebocoran kunci 0. `chosenOption`/`correctAnswer` sengaja tidak dikirim (varian kontras modul akan menyebut kunci sebelum `tell`). |
| G8 | **Diperbaiki** | Tingkat petunjuk tertinggi yang dilihat dicatat di soal dan di baris riwayat (`hintLevel`); jawaban BENAR sesudah petunjuk menjadi bukti lebih ringan untuk BKT/kalibrasi (kappa × 0,85/0,7/0,5/0,35 untuk tingkat 1–4; jawaban salah tidak diringankan). Tingkat 4 sebelum menjawab hanya pegangan ingatan, tidak lagi `explain.why`. |
| G9 | **Diperbaiki** | "Jelaskan lebih sederhana" di susun kata mengirim kalimat yang disusun murid. |
| G10 | **Diperbaiki** | Pil "BKT x%" menjadi "Penguasaan x%" (id/th). Untuk susun kata/video-grammar, angkanya dari mastery skill yang memang diperbarui jawaban itu, bukan BKT yang tidak tersentuh. |
| G11 | **Diperbaiki** | Kalimat cadangan probe/hint di naskah tutor (id + th) tidak lagi soal penanda waktu; `explain` susun kata kini punya `avoid` sendiri. |
| G12 | **Diperbaiki** | Tombol palsu "Simpan Rumus" dihapus; tombol AI dipasang lewat JS; judul kartu kontras lewat i18n. |
| — | **Baru** | Grader cloze menyetarakan kontraksi tak-ambigu (can't = cannot = can not, won't = will not, isn't = is not, I'm = I am, should've = should have …); `'s`/`'d` sengaja tidak. 0 bentrok dengan pengecoh di 436 item. |

**Gerbang.** `tests/grammar-feedback-regression-test.js` (22 cek; bagian browser SKIP tanpa
Playwright, tanpa socket — berkas disajikan lewat `page.route`). Fase 1: merah 14/14 pada kode
sebelum perbaikan. Fase 2: 9 cek baru merah pada kode Fase 1. Hijau 22/22 sesudahnya. Baseline
id-golden ditulis ulang dengan sengaja (literal dipindah ke copy-map / naskah tutor diubah).

### Temuan baru selama perbaikan (di luar G1–G12)

- **G13 — Penjelasan video-grammar berbahasa Inggris.** `content/video-grammar-bank-v1.json`
  (20 entri) menyimpan `explain.why`/`rule` dalam bahasa Inggris dan tidak punya overlay id/th;
  `reveal()` menampilkannya apa adanya untuk murid Indonesia maupun Thai. Butuh penulisan konten
  (±20 × 2 bahasa), belum dikerjakan di PR ini.
- **Utang kebocoran Thai yang ikut terlihat.** Saat mencoba memperlebar `ID_WORDS`, kata
  *Petunjuk* menerangi literal Indonesia di jalur murid `features/grammar/grammar-vocab-bridge.js:1391`
  dan `features/learner-flow/fiezel-review-bank.js` (3 baris), *Perhatikan* di
  `features/nujum/fiezel-nujum.js:383`, `features/speaking-listening/fiezel-jlpt-listening.js:500`,
  `features/tutor-classroom/fiezel-tutor-v3.js:232`. Di luar jalur umpan balik grammar; dicatat,
  tidak disembunyikan.

---

## 9. Peta jalan: supaya kehebatan BrainCore benar-benar terasa

Temuan terpenting audit ini: **isinya sudah kaya, yang kurang adalah jalannya ke layar.**
512 template grammar punya penjelasan dwibahasa 100% (aturan, alasan benar, alasan tiap
pengecoh, cara menghindari, pegangan ingatan); 1.536 alasan per pengecoh terisi; 436 item
cloze lengkap penjelasannya. Menambah konten sebelum kabelnya benar hanya menambah teks yang
salah alamat. Urutan yang disarankan:

**Fase 2 — Tangga bantuan yang terlihat (G5 + G7). — SELESAI, lihat §8.** Saat retry tampilkan tangga BrainCore
apa adanya: `probe` = satu pertanyaan penggiring (howToAvoid), `hint` = pegangan ingatan,
`worked` = contoh yang dikerjakan **dari soal lain dengan subskill yang sama** (bukan soal ini
— itu membocorkan jawaban sebelum `tell`), `tell` = buka. Kirim `session` ke `composeTurn`
supaya rotasi "jangan ulangi penjelasan yang gagal" hidup. Ini mengubah isi layar retry
(sekarang selalu tuntunan langkah), jadi perlu satu keputusan owner.

**Fase 2b — Diagnosis jawaban ketik (cloze).** Grader kini adil terhadap kontraksi, tetapi
jawaban salah yang bukan pengecoh hanya mendapat "Yang tepat: …". Simulasi: pada **56 dari 89**
item yang jawabannya diawali kata bantu, murid yang menghilangkan kata bantunya ("preparing"
untuk "is preparing") — kesalahan transfer bahasa ibu paling umum bagi murid Indonesia maupun
Thai — tidak mendapat diagnosis apa pun. Tambahkan jenis kesalahan murni di grader:
`missing_auxiliary`, `word_order`, `extra_context_words` (murid menyalin kata di sekitar
celah), `overregularization` (goed/taked), masing-masing dengan kalimat dwibahasa.

**Fase 3 — Kontras bahasa ibu per keluarga, bukan per soal.** Sebagian besar kesalahan murid
Indonesia dan Thai datang dari hal yang tidak ada di bahasa mereka: perubahan bentuk kata kerja
(tense, -s orang ketiga), to-be, artikel, jamak -s. Satu catatan kontras per keluarga (21
keluarga × id/th, bukan 512 × 2) yang ditampilkan di pembahasan saat miskonsepsi berbau
transfer — kartu kontrasnya sudah ada di `buildFeedbackHTML`, tinggal disambung ke `reveal()`.

**Fase 4 — Bukti yang jujur (G8, G9–G11). — SELESAI, lihat §8.** Catat tingkat petunjuk yang dipakai dan teruskan ke
`record()` sebagai kredibilitas lebih rendah; jawaban murid susun kata ke AI explain; putuskan
apakah susun kata/video-grammar masuk BKT.

**Fase 5 — Ukur kebingungan, lalu perbaiki konten yang paling membingungkan dulu.** Sinyalnya
sudah mengalir di decision trace: ketukan "Jelaskan lebih sederhana", "Buka Pembahasan",
dan keberhasilan percobaan kedua sesudah petunjuk. Agregasikan per template; template yang
penjelasannya tidak menolong naik ke antrean penulisan ulang. Dengan begitu peningkatan
konten berikutnya diarahkan oleh data murid, bukan tebakan.
