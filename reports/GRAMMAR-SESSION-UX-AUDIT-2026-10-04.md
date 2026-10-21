# Audit UI/UX sesi latihan grammar: dari kursi murid

> **Status m025-463:** U1 sampai U12 dan U14 **diperbaiki** (lihat `docs/handoffs/FIEZEL-M025-458-GRAMMAR-UX-FIXES-HANDOFF.md`, gerbang `tests/grammar-ux-p1-2026-10-04-test.js`). U13, U15, U16, dan U17 diperbaiki di m025-463 (`docs/handoffs/FIEZEL-M025-463-BRAINCORE-WAVE4-UX-POLISH-HANDOFF.md`, gerbang `tests/grammar-ux-p3-2026-10-04-test.js`), bersama temuan probe ulang: dua judul modal yang putih di atas putih, delapan label di bawah 4,5:1, dan **U19** (peredupan opasitas pada chip "Sudah dicoba" dan baris meta jalur terkunci). U18 (mode gelap identik dengan terang) dibiarkan: tema terang memang dipakai di seluruh aplikasi.

**Tanggal:** 2026-10-04
**Basis:** `main` @ `587335cd` (build `m025-450`). Ini sudah memuat redesign latihan grammar
(m025-443/445), perbaikan tur dan badge Thai (m025-449), dan perbaikan panggung suara (m025-450).
**Cara uji:** `tools/dev/grammar-ux-audit-2026-10-04-probe.js` menjalankan `index.html` sungguhan di
Chromium headless, layar HP 390×844, tanpa server dan tanpa jaringan (berkas disajikan lewat
`page.route`). Probe berperan sebagai murid A1 dan menempuh jalurnya sendiri: Latihan → Grammar →
pilih ritme → Buka materi → FIEZEL QUEST (3 tahap, dimainkan sungguhan) → kartu materi → 10 soal.
Di soal pertama probe sengaja salah dua kali, lalu membuka pembahasan, menjawab benar, dan menyelesaikan
sesi sampai layar hasil. Ada tiga putaran: Indonesia terang, Thai, dan HP bermode gelap. Total 38 layar.
Di tiap layar probe memotret dan mengukur kontras WCAG, target sentuh < 44 px, luapan horizontal, dan
teks Indonesia yang bocor ke layar Thai.
**Tangkapan layar** tidak di-commit karena berupa berkas biner. Owner menerimanya langsung di sesi.
Untuk membuatnya ulang: `node tools/dev/grammar-ux-audit-2026-10-04-probe.js <folder>`.

---

## 1. Jawaban singkat: kalau saya murid

**Apakah nyaman?** Layar soal itu sendiri nyaman: bersih, huruf besar, empat pilihan yang jelas, dan
penghitung 1/10. Grid Latihan dua kolom hasil redesign juga rapi. Yang tidak nyaman adalah **jalan menuju
soal pertama**: tur pengenalan muncul **di atas** modal "Pilih ritme", lalu ada hub, lalu modal Misi
Kosakata, tiga tahap FIEZEL QUEST, layar menang, kartu materi, dan baru soal. Totalnya kira-kira
**10 ketukan dan 8 layar** sebelum soal grammar pertama.

**Apakah mudah dimengerti?** Umpan balik salah adalah bagian terbaik. "Mengapa kurang tepat?" menjelaskan
pilihan murid dengan kalimat yang pas (*"he" bentuk subjek, nggak bisa berdiri sesudah kata kerja sebagai
objek*). Yang membingungkan:
- kartu materi hanya berisi satu kalimat aturan abstrak, **tanpa satu contoh pun**;
- di soal video subtitle-nya **tidak terbaca sama sekali**, perintahnya berbahasa Inggris, dan topiknya
  (Present Simple) tidak ada hubungannya dengan pelajaran kata ganti;
- soal susun kata tidak memberi tahu kalimat apa yang dituju, padahal susunan lain yang benar akan dinilai
  salah;
- sesudah salah kedua murid disuruh "coba lagi", padahal kesempatannya sudah habis.

**Apakah warnanya sudah oke?** Paletnya konsisten dan hangat: krem, navy, amber untuk aksi, dan emerald
untuk guru. Kotak petunjuk guru yang baru (hijau muda, teks hijau tua) mudah dibaca. Masalahnya ada di
**kontras di enam tempat**, empat di antaranya **di bawah 1,6:1**, alias praktis tak terlihat (§3).

---

## 2. Yang sudah bagus (pertahankan)

- **Layar soal** (`04-soal`, `13-th-soal`): tidak ada satu pun pelanggaran kontras atau luapan.
  Pilihan jawaban punya target sentuh besar.
- **"Mengapa kurang tepat?"** di pembahasan menjelaskan pilihan murid, bukan hanya kunci. Penjelasannya
  dua bahasa: versi Thai di `14-th-pembahasan` sepenuhnya Thai.
- **Lembar jawaban benar** (`09-benar`) ringkas dan menyenangkan.
- **Grid Latihan dua kolom** (`01-latihan`) rapi, tidak ada judul terpotong lagi.
- **Kotak petunjuk guru** di soal sesudah salah pertama: hijau muda dengan teks hijau tua, kontras baik.
- **Tur dan badge materi untuk murid Thai** sudah berbahasa Thai sejak m025-449 (`แท็บฝึกฝน`,
  `ไวยากรณ์ · A1`). Kebocoran yang saya temukan di redesign m025-443 sudah tertutup.

---

## 3. Temuan, diurutkan dari yang paling merugikan murid

Kolom *Layar* merujuk ke nama tangkapan layar probe. Rasio kontras diukur probe, dengan ambang 4,5:1
untuk teks biasa dan 3:1 untuk teks besar.

### Prioritas 1: murid tidak bisa membaca, salah paham, atau dirugikan nilainya

| # | Yang dialami murid | Layar | Bukti | Penyebab | Usulan |
|---|---|---|---|---|---|
| U1 | **Subtitle soal video tak terlihat.** Ada dua pil putih kosong. Teks *"I usually drink coffee in the morning."* tertulis putih di atas putih. | `08-jenis-video-grammar` | 1,05:1 (subtitle), 1,0:1 ("A:", "B:") | `features/grammar/fiezel-grammar-video.js:191`: gaya inline `background:var(--panel, #0F172A)`. Di tema aplikasi `--panel` kini putih, sementara warna teks mewarisi teks terang kartu gelap. | Beri warna teks eksplisit, atau pakai latar gelap yang pasti. **Hati-hati:** begitu terbaca, subtitle itu **memuat jawabannya** (soalnya *"Complete the subtitle: I usually ___ coffee"*). Kalimat yang ditanyakan harus disembunyikan atau dirumpangkan di dialog. |
| U2 | **Soal video tidak nyambung dan berbahasa Inggris.** Pelajaran kata ganti tiba-tiba memunculkan "Present Simple" dengan perintah *"Complete the subtitle:"* dan teks *"Video tidak tersedia, beralih ke teks."* | `08-jenis-video-grammar` | soal ke-6 dari 10, sesi `subject_object_pronouns_and_possessives` | `content/video-grammar-bank-v1.json:26,87,148`: `question` berbahasa Inggris. Sesi grammar menyisipkan item video tanpa mencocokkan topik pelajaran. | Sisipkan item video hanya bila `grammarPoint` cocok dengan skill pelajaran. Pindahkan perintahnya ke kunci i18n id/th. Sembunyikan kalimat "Video tidak tersedia" karena murid tidak perlu tahu. |
| U3 | **Prasasti di layar hasil: judul dan isinya tak terbaca**, dan modal itu menutupi skor sesi (90%) begitu sesi selesai. | `10-hasil` | judul "Langkah Pertama" dan deskripsi: teks cokelat tua `rgb(36,26,17)` di atas kartu `rgb(10,10,14)` | `style.css:4537`: `.fz-prasasti-card{background:var(--bg)}`. Token `--bg` kini hampir hitam, padahal warna teks di `style.css:4542-4543` masih ditulis mati untuk latar terang. Deskripsinya juga masih memuat tanda pisah em-dash (*"selesai —"*), padahal m025-443 berjanji menghapusnya. | Ganti `var(--bg)` dengan warna latar terang yang pasti, atau samakan warna teksnya. Tampilkan prasasti **sesudah** murid melihat skor, misalnya saat ketuk "Kembali". |
| U4 | **Petunjuk "Pegangan ingatan" membocorkan jawaban** pada salah pertama, dan nyaris tak terlihat. Untuk soal *"Where is Tom? I can't see ___."* petunjuknya berbunyi *"Kunci ingatannya: 'I see him', tapi 'he sees me'."* Kesempatan kedua jadi hampir gratis dan tetap dihitung benar. | `05-salah-pertama`, `13-th-salah` | 1,19:1 (teks kuning pucat di kartu kuning pucat), ditambah tertutup bar mengambang (U7) | Kunci `brain-tutor.hint-cue` (`features/i18n/copy-id-feat-a.js:319`) mengisi `{cue}` dengan contoh yang memuat pasangan kata kerja dan kunci yang sama. | Pada salah pertama, beri petunjuk tentang **posisi** (*"kata sesudah kata kerja"*), bukan contoh berisi kunci. Simpan contoh untuk pembahasan. Naikkan kontras kartu. |
| U5 | **Soal susun kata tidak menyebut kalimat tujuannya**, sementara susunan lain yang sama benarnya dinilai salah. Keping: *he, him, Tom, I, Where, is, can't, his, see*. *"Where is he? I can't see Tom."* benar secara tata bahasa, tetapi ditolak. | `08-jenis-token-order` | grader `features/grammar/fiezel-grammar-upgrade.js:283-288` hanya menerima `tokens`, `options[0]`, dan `alternates`. Pembuat soal `app.js:12787` hanya mengisi `alternates` untuk kalimat ber-*", but"*. | Soal ini diturunkan dari soal rumpang. Pengecoh *he/his* adalah kata ganti, jadi dapat ditukar dengan *Tom*. | Tampilkan arti kalimat yang dituju (id/th) sebagai perintah, atau jangan pakai pengecoh yang dapat menggantikan kata benda di kalimat. Label "Daftar kata tersedia" juga 1,48:1. |
| U6 | **Murid Thai menerima arti kosakata dalam bahasa Indonesia** di Misi Kosakata dan FIEZEL QUEST: *nama, tas, sekolah, guru, saudara laki-laki*. Rekap kemenangan menulis *"name (nama)"*. | `11-th-quest-1`, `11-th-buka-materi` | probe tidak menandainya sebagai bocor karena kata-kata itu tidak berisi kata fungsi Indonesia, jadi saya memeriksanya dengan mata | `content/grammar-vocab-map-v1.json`: `vocabDetails[].meaning` hanya berbahasa Indonesia. `grammar-vocab-bridge.js:253` tidak mencari arti Thai. | Ambil arti Thai dari bank kosakata (`meanings` th) kalau locale `th`. Kalau belum ada, catat sebagai utang bertanggal di gerbang th. |
| U7 | **Tur pengenalan menumpuk di atas modal "Pilih ritme"**, dan judul tur tak terlihat (teks navy di kartu navy). Murid melihat dua jendela sekaligus dan tidak tahu harus mengetuk yang mana. | `11-th-tur` (sama di id) | judul `แท็บฝึกฝน` 1,02:1 | tur (`features/onboarding/fiezel-tour.js`) dan modal intensitas sama-sama terpicu oleh kunjungan pertama ke Grammar. Warna judul tur tidak mengikuti latar gelap kartunya. | Tunda tur sampai modal ritme ditutup, atau sebaliknya. Beri judul tur warna terang. |

### Prioritas 2: membingungkan atau tidak nyaman

| # | Yang dialami murid | Layar | Penyebab / bukti | Usulan |
|---|---|---|---|---|
| U8 | **Bar "coba lagi" mengambang menutupi kartu pegangan ingatan**. Kini ada **dua tombol** ke tempat yang sama: "Buka Pembahasan" di bar dan "Buntu? Buka pembahasan lengkap" di bawahnya. | `05b-salah-pertama-full` | `#quizFloatingBar` (`features/ui/fiezel-tactile-clay.css:4722`, `features/ui/mobile-edge-fit.css:2560`) melayang di atas isi kartu guru. | Jadikan bar bagian dari alur kartu (tidak `fixed`), atau beri ruang bawah setinggi bar. Pilih satu tombol pembahasan. |
| U9 | **Pesan bertentangan sesudah salah kedua.** Toast merah "Hampir!" ditambah *"Belum tepat. Nggak apa-apa, coba lagi."*, padahal satu-satunya tombol adalah "Lihat pembahasan" karena kesempatan sudah habis. | `06-keyakinan` | `quiz.burst-miss` (`copy-id-app-b.js:170`), `quiz.vonis-salah` (`copy-id-student.js:219`) | Pada salah terakhir pakai kalimat penutup, misalnya *"Belum tepat. Yuk lihat pembahasannya."* Jangan tampilkan "Hampir!". |
| U10 | **Pembahasan padat.** Ada enam blok berturut-turut: jawabanmu, mengapa, tuntunan langkah, intinya, aturannya, dan bandingkan. "Tuntunan langkah" ditutup dengan *"…apa jawabanmu?"*, padahal jawaban sudah dibuka. Kartu "Trik Cepat Ingat" terakhir tertutup tombol "Lanjut". | `07-pembahasan`, `07b-pembahasan-full`, `14-th-pembahasan` | Trik 1,56:1 di bawah tombol mengambang | Sesudah jawaban dibuka, tampilkan cukup *mengapa* + *intinya* + satu contoh. Lipat sisanya. Hapus pertanyaan penutup tuntunan di mode pembahasan. Beri ruang bawah untuk "Lanjut". |
| U11 | **FIEZEL QUEST:** judulnya kunci mentah **`subject_object_pronouns_…`**, tombol tutup X terpotong di tepi kanan, statistik **"KESIAPAN BKT 100%"** adalah jargon, dan **"5 kosakata dikuasai"** muncul sesudah satu ronde mencocokkan. | `02-quest-1`, `02-quest-v` | `grammar-vocab-bridge.js:1164` (`esc(g.skill)`), `:1133` (`scaffold.metric-ready`) | Pakai `friendlySkillName(g.skill)`. Ganti "Kesiapan BKT" dengan "Siap latihan". Ganti "dikuasai" dengan "dikenali". Pastikan `.modal-close-corner` berada di dalam kartu. |
| U12 | **Kartu materi terlalu tipis.** Isinya satu kalimat aturan abstrak berwarna abu, tanpa contoh kalimat. Ada dua tombol "Kembali" (atas dan bawah). Badge 2,86:1. | `02-materi`, `11-th-materi` | `app.js:12655` (`renderGrammarLesson`): redesign m025-443 membuang kotak CONTOH | Kembalikan **satu** contoh pendek dengan kata kuncinya ditebalkan. Ini paling membantu murid A1. Hapus tombol kembali di bawah. |
| U13 | **Soal ke-6 tanpa kaitan pelajaran** (lihat U2), ditambah toast "Setengah jalan!" yang menutupi bagian bawah layar. | `08-jenis-video-grammar` | | Lihat U2. |

### Prioritas 3: polesan

| # | Temuan | Layar | Bukti |
|---|---|---|---|
| U14 | Tombol "Buka materi" berteks putih di atas amber. Teks pelajaran terkunci abu muda. | `02-grammar-hub` | 2,6:1 dan 2,45:1 |
| U15 | Simpul jalur di hub berupa kotak putih kosong tanpa nomor atau ikon. Ada ruang ikon kosong di pil "Ujian Naik Level". | `02-grammar-hub` | visual |
| U16 | Chip "Sudah dicoba" pada pilihan yang sudah dicoba | `05-salah-pertama` | 2,24:1 |
| U17 | Petunjuk tahap 2 QUEST "Ketuk keping di bawah…" | `02-quest-2` | 2,45:1 |
| U18 | HP bermode gelap menghasilkan layar yang identik dengan mode terang. Ini tampaknya sengaja; sebutkan di desain kalau memang begitu. | `15-gelap-*` | hub dan kartu materi 0 piksel berbeda dari versi terang; soal tetap bertema terang |
| U19 | **Peredupan opasitas menyembunyikan kontras rendah.** Chip "Sudah dicoba" di dalam `.option:disabled{opacity:.78}` terender 4,3:1, dan baris meta kartu terkunci `"pola grammar dasar · Dikuasai 0%"` di dalam `.path-label{opacity:.82}` terender 3,3:1; keduanya lolos kalau opasitas diabaikan. | `05-salah-pertama`, `02-grammar-hub` | 7,63:1 → 4,31:1 dan 4,62:1 → 3,26:1 setelah opasitas |

---

## 4. Catatan pengukuran

- Probe melaporkan judul modal "Pilih Ritme Belajarmu" 1,03:1. Itu **positif palsu**: judulnya putih di
  kartu navy dan terbaca jelas di tangkapan layar. Pengukur mengambil latar dari elemen di belakang
  modal.
- Angka kontras di `10-hasil` (skor 90%, "+2", "9x Combo!") rendah karena kartu hasil berada di bawah
  tirai modal prasasti. Masalahnya ada di U3 (prasasti menutupi hasil), bukan di warna kartu hasil.
- Tangkapan layar "seluruh halaman" (`*-full`) memperlihatkan header 1/10 di tengah halaman. Itu efek
  header `sticky` saat difoto penuh, bukan kerusakan.
- Target sentuh kecil yang dilaporkan di hub (6–7) kebanyakan berasal dari tombol tersembunyi
  "Diagnostics" (4×44) dan pil "Ganti" level. Tidak ada target kecil di layar soal.

## 5. Urutan perbaikan yang saya sarankan

1. **U1 + U2 + U3**: teks tak terlihat di layar yang pasti dilewati murid. Masing-masing perbaikan CSS
   satu-dua baris (untuk U1, sekaligus rumpangkan subtitle-nya).
2. **U4 + U5**: keduanya memengaruhi **nilai**. Petunjuk yang membocorkan jawaban membuat skor terlalu
   tinggi, sedangkan susun kata yang menolak jawaban benar membuat skor terlalu rendah.
3. **U6 + U7**: murid Thai.
4. **U8–U12**: merapikan alur salah → pembahasan dan kartu materi.
5. Sisanya polesan.

Setiap perbaikan teks wajib lewat pasangan `copy-id-*` / `copy-th-*` (lihat CLAUDE.md).
