# FIEZEL × Braincore: Tiga Konsep Radikal, Satu Dibangun Sekarang

FIEZEL berhenti terlihat seperti kuis. Braincore (IRT, BKT, FSRS, ledger miskonsepsi) ditarik ke permukaan layar sebagai lawan yang bertaruh, kembaran yang meniru salahmu, dan gema suaramu yang memudar.
Fase 1 membangun konsep pertama, **NUJUM**, langsung di dalam PWA FIEZEL yang ada, memakai modul Braincore asli dan suara sebagai input utama.

## Untuk siapa

- Murid remaja/dewasa Indonesia (dan Thai) yang belajar Inggris sendiri di HP, bosan dengan format kuis.
- Founder saat demo 30 detik ke investor: butuh satu layar yang langsung menjelaskan "ini bukan Duolingo" tanpa slide.
- Braincore itu sendiri: konsep-konsep ini adalah cara mesin menampakkan diri, bukan fitur tambahan di atasnya.

## Tiga konsep

### Konsep 1 — NUJUM: Mesin yang Bertaruh Melawanmu *(dibangun di Fase 1)*

1. **Hook.** Aplikasi tidak bertanya "mana yang benar?". Aplikasi *bersuara* dan berkata: "Aku bertaruh 78% kamu akan salah di kalimat ini, dan salahmu akan «don't», bukan «doesn't»." Lalu kamu membuktikan mesin salah. Premisnya membalik relasi: bukan murid yang diuji, tetapi model yang mempertaruhkan reputasinya di depan murid. Tidak ada aplikasi bahasa yang berani menulis prediksinya di layar *sebelum* murid menjawab, karena kalau prediksinya buruk, produknya kelihatan bodoh. FIEZEL berani karena prediksinya terkalibrasi.
2. **Loop interaksi.** Layar menampilkan satu kalimat berlubang dan satu taruhan (persentase + kesalahan yang diprediksi). Murid **mengucapkan** kalimat lengkap dengan suaranya. Tidak ada tombol pilihan; tidak ada kotak teks. Setelah suara dikenali: mesin mengaku kalah atau menang, dan *terlihat* mengubah pikirannya ("taksiranmu naik 0.41 → 0.66"). Murid bisa berkata "sanggah" pada klaim apa pun → mesin wajib membuktikan dengan 3 soal kilat. Satu sesi = 8 taruhan, ditutup dengan skor duel: "Mesin 5 – Kamu 3. Klaim yang kamu patahkan: …".
3. **Braincore kasatmata.** Persentase taruhan = P(benar) dari 3PL IRT (θ murid vs a/b/c butir yang dikalibrasi Empirical Bayes). Kesalahan yang diprediksi = entri ledger miskonsepsi dengan belief tertinggi pada konsep itu. Pemilihan soal = butir dengan informasi Fisher maksimal (mesin memilih soal yang *dia sendiri paling tidak yakin*, dan mengatakannya: "yang ini aku belum tahu tentangmu"). Perubahan pikiran = pembaruan BKT yang diperlihatkan sebagai angka bergerak, dengan lebar interval (sesuai OLM: tidak ada angka tanpa ketidakpastian). "Sanggah" = jalur `negotiate` OLM yang sudah ada: 3 probe pengukuran ulang, klaim ditandai "sedang diukur ulang".
4. **Aha 30 detik.** Detik 0–5: layar gelap, suara mesin: "Aku sudah membaca 212 jawabanmu. Aku bertaruh kamu akan salah di sini." Detik 5–15: kalimat muncul, investor melihat prediksi kesalahan yang *spesifik* («don't»), murid bicara, dan murid memang mengucapkan «don't». Detik 15–30: mesin menyebut kode miskonsepsinya dengan bahasa manusia, memilih soal berikutnya yang menargetkan pola itu, dan taruhannya naik ke 84%. Investor paham: produk ini memodelkan *cara berpikir salah* seseorang, bukan menghitung skor.
5. **Penghalang.** Menulis prediksi di layar hanya mungkin jika (a) tiap butir punya parameter IRT yang terkalibrasi dari data, (b) tiap distraktor ditandai kode miskonsepsi dalam taksonomi, dan (c) ada mekanisme negosiasi yang mengubah model saat murid membantah. Duolingo punya (a) sebagian, tidak punya (b) pada level distraktor, dan tidak punya (c). Membangun taksonomi miskonsepsi berlabel per pilihan untuk ratusan lesson bukan pekerjaan dua sprint; itu pekerjaan bertahun konten.

### Konsep 2 — KEMBARAN: Lawan Bicaramu Adalah Salinan Salahmu *(Fase 2)*

1. **Hook.** Kamu ngobrol lewat suara dengan seorang "orang" berbahasa Inggris yang berbicara *persis dengan kesalahan-kesalahanmu sendiri minggu ini*. Tugasmu bukan menjawab soal, melainkan **menangkap dan mengoreksi** dia. Memperbaiki kembaranmu = memperbaiki dirimu, dan kamu tidak pernah merasa sedang dinilai.
2. **Loop interaksi.** Percakapan suara dua arah, topik sehari-hari. Kembaran berbicara (TTS). Saat murid mendengar sesuatu yang janggal, ia menyela dengan suara: "Bukan 'she go', tapi 'she goes'". Kalau koreksinya tepat, kembaran mengulang dengan benar dan *berhenti membuat kesalahan itu*. Kalau murid melewatkan kesalahan, percakapan berlanjut dan kesalahan itu muncul lagi nanti dengan konteks lain.
3. **Braincore kasatmata.** Kembaran dibangkitkan dari ledger miskonsepsi murid (bot arena yang ada, di-seed dengan belief per kode). Frekuensi tiap kesalahan di mulut kembaran sebanding dengan belief ledger; kesalahan yang murid tangkap dengan benar menurunkan belief, dan kembaran secara harfiah "sembuh" seiring murid membaik. BKT menentukan kesalahan mana yang *tidak* boleh dimunculkan (konsep yang belum diajarkan).
4. **Aha 30 detik.** Investor mendengar bot berbahasa Inggris yang salah dengan pola tertentu; founder berkata: "Setiap kesalahan yang dia buat adalah kesalahan murid ini dalam 7 hari terakhir. Coba perhatikan." Murid menyela dan mengoreksi; bot mengulang dengan benar. Investor sadar: ini cermin yang bicara.
5. **Penghalang.** Butuh taksonomi miskonsepsi yang *generatif* (tiap kode punya template untuk menghasilkan kalimat salah yang natural), bukan sekadar label. ELSA fokus pelafalan, Duolingo tidak punya model kesalahan per murid yang cukup granular untuk membangkitkan persona.

### Konsep 3 — GEMA: Suaramu Sendiri yang Memudar *(Fase 3)*

1. **Hook.** Setiap kalimat yang kamu ucapkan dengan benar direkam. Beberapa hari kemudian FIEZEL memutar *suaramu sendiri* — tetapi terdegradasi (teredam, terputus, pecah) persis sebesar peluang lupa yang dihitung model. Kamu menyelamatkan ingatan itu dengan mengucapkannya kembali sebelum benar-benar hilang. Bukan "review due", melainkan mendengar dirimu sendiri memudar.
2. **Loop interaksi.** Buka aplikasi → langsung terdengar potongan suara sendiri dari hari sebelumnya, kejernihan 43%. Murid mengucapkan kalimat itu kembali. Berhasil: suara menjadi jernih kembali dan digeser jauh ke masa depan. Gagal: kalimat ditampilkan, murid mengulang, dan mesin menyetel ulang paruh-waktunya.
3. **Braincore kasatmata.** Kejernihan audio = retrievability R = 2^(-t/stabilitas) dari memori FSRS per butir. Interval ketidakpastian OLM dipakai sebagai "getaran" pada audio (makin sedikit repetisi, makin tidak stabil putarannya). Probe retensi 3/7/21 hari yang sudah ada menjadi momen putar ulang.
4. **Aha 30 detik.** Founder membuka aplikasi murid dan investor mendengar suara si murid dari hari Selasa, pecah-pecah. Founder: "Tingkat pecahnya adalah prediksi model tentang seberapa dia sudah lupa. Sekarang lihat dia menyelamatkannya." Murid berbicara, suara menjadi jernih.
5. **Penghalang.** Membutuhkan model memori *per butir* yang paruh-waktunya disetel dari probe retensi sungguhan, plus rekaman suara murid per butir. SRS pesaing bekerja per skill/kartu dengan jadwal tetap, bukan retrievability kontinu per butir yang dikalibrasi dari data.

## Fitur inti dan pengalaman Fase 1 (NUJUM)

- Mode baru di dalam PWA FIEZEL, dibuka dari Home dan lewat tautan demo khusus untuk presentasi.
- Mesin bersuara (TTS yang sudah ada) dan menulis taruhannya: persentase, kesalahan yang diprediksi, dan alasan singkat dalam bahasa manusia.
- Jawaban lewat suara (pengenalan ucapan browser). Bila mikrofon tidak tersedia atau ditolak, tersedia jalur sentuh pada kata yang hilang; taruhan tetap ditampilkan.
- Kartu "mesin mengubah pikiran": angka BKT bergerak langsung dengan pita ketidakpastian, bukan titik.
- "Sanggah" dengan suara atau tombol → 3 soal kilat pengukuran ulang; hasilnya dinyatakan jujur ("kamu benar, aku salah" / "aku tetap pada klaimku, ini buktinya").
- Papan duel akhir sesi: skor Mesin vs Kamu, daftar klaim yang dipatahkan, satu pola salah yang paling sering muncul, tanpa skor poin, tanpa streak, tanpa maskot.
- Mode demo: satu tautan menyiapkan murid contoh dengan riwayat jawaban realistis sehingga taruhan bermakna sejak detik pertama.
- Murid baru sungguhan: 5 taruhan pertama dilabeli "aku belum kenal kamu, taruhan kecil" dengan interval lebar; mesin mengaku ketidakpastiannya alih-alih berpura-pura tahu.

## Alur pengguna

1. Buka FIEZEL → Home menampilkan kartu NUJUM sebagai pintu utama ("Mesin sudah membaca N jawabanmu. Berani ditantang?").
2. Layar gelap, mesin bicara dan menulis taruhannya. Kalimat berlubang muncul.
3. Murid menekan-tahan / berkata; gelombang suara terlihat; teks hasil pengenalan muncul.
4. Verdict: mesin menang atau kalah. Angka taksiran bergerak. Kalau mesin menang, kode miskonsepsi dijelaskan satu kalimat dan soal berikutnya menargetkan pola itu.
5. Kapan pun murid bisa berkata "sanggah" → 3 soal kilat → klaim direvisi atau dipertahankan dengan bukti.
6. Setelah 8 taruhan: papan duel, lalu pilihan "lanjut 8 lagi" atau kembali ke Home. Semua hasil tercatat ke Braincore yang sama dengan latihan biasa, sehingga mode lama ikut cerdas.

## Nuansa UI/UX

- Bahasa visual berbeda dari sisa aplikasi: permukaan tinta gelap pekat, satu aksen maroon FIEZEL, tipografi besar untuk angka taruhan, tanpa kartu-kartu kecil, tanpa ilustrasi kartun.
- Suara adalah aktor utama: mesin punya suara, gelombang suara murid terlihat, transisi mengikuti ritme bicara.
- Semua angka digambar sebagai pita berlebar (ketidakpastian), bukan titik atau progress bar.
- Nada teks: mesin berbicara tentang *pola jawaban*, bukan tentang pribadi murid; mesin mengaku salah dengan kalimat yang sama tegasnya seperti saat mengklaim benar.
- Micro-motion pada setiap perubahan pikiran mesin: angka bergeser, pita menyempit/melebar.
- Berjalan di layar HP 390px sebagai target utama; desktop menyesuaikan.

## Fase implementasi

**Fase 1 — NUJUM (dibangun sekarang).** Mode taruhan lengkap di PWA yang ada: prediksi IRT + miskonsepsi di layar, jawaban suara dengan fallback sentuh, pembaruan BKT kasatmata, Sanggah dengan 3 probe, papan duel, mode demo untuk investor, penanganan murid baru. Kursus Inggris A1–A2 (bank grammar dengan tag miskonsepsi paling lengkap).

**Fase 2 — KEMBARAN.** Bot percakapan suara yang di-seed dari ledger miskonsepsi murid; interupsi koreksi dengan suara; kembaran "sembuh" mengikuti ledger. Perluasan cakupan level ke B1.

**Fase 3 — GEMA.** Perekaman suara murid per butir, putar ulang terdegradasi sesuai retrievability, penyelamatan lewat ucapan, dan integrasi ke probe retensi 3/7/21 hari.

## Asumsi

- Repo FIEZEL (publik) diambil dari cabang `main` GitHub ke ruang kerja ini; hasil kerja dikembalikan lewat Save to GitHub sebagai PR. Aplikasi FIEZEL lama tetap berfungsi; NUJUM bersifat tambahan, tidak mengganti alur latihan yang ada.
- "Braincore asli" berarti modul Braincore yang berjalan di dalam PWA (BKT, kalibrasi butir IRT, ledger miskonsepsi, OLM/negosiasi, probe retensi). Worker `api.fiezel.my.id` tetap menerima telemetri lewat jalur yang sudah ada; tidak ada API baru, tidak ada kredensial baru yang dibutuhkan.
- Hanya Konsep 1 yang dibangun di Fase 1. Konsep 2 dan 3 diserahkan sebagai spesifikasi di dokumen ini.
- Pengenalan ucapan memakai Web Speech API browser (Chrome Android penuh; iOS Safari terbatas, jadi fallback sentuh wajib ada). Suara mesin memakai pipeline TTS yang sudah ada di aplikasi.
- Cakupan konten Fase 1: kursus Bahasa Inggris level A1–A2 saja. Kursus Jepang tidak disentuh.
- Naskah antarmuka dalam bahasa Indonesia dengan padanan Thai, mengikuti aturan dua bahasa di repo.
- Tidak ada skor poin, streak, badge, atau maskot di dalam mode NUJUM.
- Mode demo investor memakai murid contoh dengan riwayat yang disintesis dari bank soal asli; murid contoh ini terpisah dari data murid sungguhan dan bisa direset.
- Sesi default 8 taruhan; "Sanggah" memicu 3 soal kilat dan satu klaim hanya bisa disanggah sekali per 7 hari (mengikuti aturan OLM yang ada).
- Perubahan pada aplikasi mengikuti disiplin rilis repo (gerbang mutu dan penanda build) agar PR bisa digabung tanpa memerahkan CI.
