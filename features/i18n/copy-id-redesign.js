/**
 * FIEZEL · features/i18n/copy-id-redesign.js — COPY-MAP PENYEDERHANAAN PENGALAMAN (id)
 *
 * MENGAPA BERKAS TERPISAH, dengan alasan yang sama persis dengan
 * copy-id-settings-locale.js: seluruh copy-id-* lain berisi kalimat yang DIPINDAH
 * byte-identik dari app.js (kontrak id-golden-snapshot-test: pemindahan = hijau,
 * perubahan kata = merah). Kalimat di bawah semuanya BARU — ia lahir bersama
 * gelombang m025-246 (navigasi 4 tab, Home "Hari ini", ringkasan akhir sesi, tema
 * malam, keadaan gagal audio) dan belum pernah ada di baseline emas. Mengisolasinya
 * di berkas sendiri membuat regenerasi baseline untuk gelombang ini bisa dibaca
 * sebagai satu blok, bukan tercampur dengan ribuan literal pindahan.
 *
 * KONVENSI: <domain>.<slug>, sama dengan copy-map lain. Padanan `th` TIDAK dibuat di
 * gelombang ini; FiezelI18n.t() jatuh ke `id` untuk kunci yang belum ada di `th`
 * (fiezel-i18n.js:114) dan lubangnya tercatat di coverageReport() — itu jalur yang
 * memang disediakan untuk naskah baru, bukan kelalaian.
 */
(function () {
  'use strict';
  if (typeof FiezelI18n === 'undefined' || !FiezelI18n || typeof FiezelI18n.registerCopy !== 'function') return;
  FiezelI18n.registerCopy('id', {
    /* ── Navigasi 4 tab legacy & 5 tab utama ────────────────────────────────── */
    'nav.hari-ini': 'Hari ini',
    'nav.hari-ini-aria': 'Hari ini',
    'nav.latihan': 'Latihan',
    'nav.latihan-aria': 'Latihan',
    'nav.progres': 'Progres',
    'nav.progres-aria': 'Progres',
    'nav.pengaturan': 'Pengaturan',
    'nav.pengaturan-aria': 'Buka pengaturan',
    'nav.practice': 'Latihan',
    'nav.practice-aria': 'Latihan mandiri dan skill',
    'nav.school': '<span class="kelasku-wordmark">KelasKu</span>',
    'nav.school-aria': 'Ruang KelasKu dan tugas sekolah',
    'nav.home-primary': 'Hari ini',
    'nav.home-primary-aria': 'Hari ini, fokus harian',
    'nav.progress': 'Progres',
    'nav.progress-aria': 'Peta CEFR dan kemahiran',
    'nav.profile': 'Profil',
    'nav.profile-aria': 'Profil murid dan teman',
    'nav.game': 'Game',
    'nav.game-aria': 'Arena permainan dan tantangan',

    /* ── Home "Hari ini" ────────────────────────────────────────────────────── */
    'today.eyebrow': 'Hari ini',
    /* AUDIT-2026-09-21 T1: CTA memakai {menit} dari todaySessionShape(), bukan angka paku. */
    'today.cta': 'Mulai {menit} menit',
    'today.cta-lanjut': 'Lanjutkan sesi',
    'today.cta-kenalan': 'Cari level kamu dulu',
    'today.cta-tes-awal': 'Mulai tes awal · ±{menit} menit',
    'today.isi-judul': 'Isi sesi',
    'today.ringkas': '{soal} soal · sekitar {menit} menit',
    'today.streak': 'Runtun {days} hari',
    'today.streak-kosong': 'Belum ada runtun',
    'today.selesai-judul': 'Sesi hari ini sudah beres',
    'today.selesai-body': 'Kamu boleh berhenti di sini. Kalau masih mau, satu sesi tambahan tidak apa-apa.',
    'today.selesai-cta': 'Latihan tambahan',
    'today.belum-kenal': 'FIEZEL belum tahu levelmu. Delapan sampai dua belas soal singkat sudah cukup.',
    'today.blok-kosong': 'Sesi pertamamu: kata dan tata bahasa dasar.',
    'today.judul-sapaan': 'Halo, {nama}',
    'today.aria-kartu': 'Sesi hari ini',

    /* ── Tab Latihan ────────────────────────────────────────────────────────── */
    'latihan.judul': 'Latihan',
    'latihan.lead': 'Pilih sendiri yang mau kamu latih.',
    'latihan.bicara-dengar': 'Latihan bicara & dengar',
    'latihan.bicara-dengar-note': 'Menyimak dan mengucap',
    'latihan.vocab-note': 'Kata dan artinya',
    'latihan.grammar-note': 'Susunan kalimat',
    'latihan.reading-note': 'Paham bacaan',
    'latihan.writing-note': 'Menulis kalimat',
    'latihan.library-note': 'Bacaan bebas',
    /* SLOT 13: kartu pintu masuk Panggung Suara Live di tab Latihan. Label sengaja
       TANPA tanda hubung, sesuai naskah naskah app lain. */
    'latihan.panggung': 'Panggung Suara Live',
    'latihan.panggung-note': 'Bicara dua arah dan permainan kata',

    /* ── Ringkasan akhir sesi ───────────────────────────────────────────────── */
    'ringkas.judul': 'Ringkasan sesi',
    'ringkas.naik': 'Yang naik hari ini',
    'ringkas.naik-kosong': 'Belum ada yang naik cukup jauh untuk dicatat. Itu wajar untuk satu sesi.',
    'ringkas.besok': 'Jatuh tempo besok',
    'ringkas.kalibrasi': 'Seberapa pas rasa yakinmu',
    'ringkas.besok-kosong': 'Tidak ada yang jatuh tempo besok.',
    'ringkas.besok-item': '{jumlah} materi menunggu diulang',
    'ringkas.baris-naik': '{skill} naik {delta} poin',
    'ringkas.tutup': 'Selesai',
    'ringkas.aria': 'Ringkasan akhir sesi',

    /* ── Tema (Tema Malam, m025-246) ────────────────────────────────────────── */
    'settings.tema-judul': 'Tampilan',
    'settings.tema-catatan': 'Terang, malam, atau ikut setelan perangkat.',
    'settings.tema-opsi-system': 'Ikut perangkat',
    'settings.tema-opsi-light': 'Terang',
    'settings.tema-opsi-dark': 'Malam',
    'settings.tema-toast': 'Tampilan tersimpan.',

    /* ── Skor speaking ──────────────────────────────────────────────────────── */
    'speaking.cakupan-judul': 'Cakupan kata',
    'speaking.cakupan-penjelasan': 'Ini menghitung berapa banyak kata target yang terdengar, bukan seberapa bagus pengucapanmu.',
    'speaking.cakupan-nilai': '{terdengar} dari {total} kata terdengar',

    /* ── Listening: audio gagal ─────────────────────────────────────────────── */
    'listening.gagal-judul': 'Audio belum bisa diputar',
    'listening.gagal-body': 'Bisa jadi jaringannya sedang berat. Pilih salah satu:',
    'listening.gagal-coba-lagi': 'Coba lagi',
    'listening.gagal-lewati': 'Lewati soal ini',
    'listening.gagal-tanpa-penalti': 'Soal yang dilewati karena audio gagal tidak dinilai, dan sesimu tidak dikunci.',
    'listening.gagal-dilewati': 'Soal dilewati. Nilaimu tidak terpengaruh.',

    /* 'suara.tawaran-*' DICABUT bersama sakelar paket suaranya (OWNER 4 Sep 2026:
       "unduhan suaranya biarkan diunduh secara diam-diam di background, jangan kamu
       sentuh"). Unduhan latar memang tidak punya naskah — itu intinya. */

    /* ── Edge case iOS: penyimpanan bisa hilang setelah 7 hari ──────────────── */
    'settings.cadangan-judul': 'Progres belum dicadangkan',
    'settings.cadangan-body': 'Di iPhone dan iPad, Safari bisa menghapus data aplikasi web yang tidak dibuka selama 7 hari. Masuk akun supaya progresmu tetap ada.',
    'settings.cadangan-aksi': 'Masuk akun',
    'settings.cadangan-aman': 'Progres tercadangkan di akun.',

    /* ── Penempatan: jumlah soal jadi parameter ─────────────────────────────────
       Naskah lama memaku angka 25 di empat kalimat ('placement.start-item' dst).
       Dengan placement-lite jumlahnya bisa 12, dan kalimat yang mengumumkan 25 lalu
       menyajikan 12 adalah kebohongan kecil yang merusak kepercayaan tepat di layar
       pertama. Kunci di bawah menerima {jumlah}; kunci lama dibiarkan hidup supaya
       murid pada build lama tidak melihat kunci mentah. */
    'placement.lite-lead': '{jumlah} soal untuk memetakan kemampuan dari A1 sampai C2.',
    'placement.lite-hero': '{jumlah} soal, sekitar {menit} menit.',
    'placement.lite-mulai': 'Mulai {jumlah} soal',
    'placement.lite-isi': 'Isinya grammar dan vocabulary dari bentuk paling dasar di tiap level A1 sampai C2, dan urutannya diacak setiap kali kamu masuk. Setelah selesai, FIEZEL memakai hasilnya sebagai titik awal — bukan vonis: levelmu terus dikoreksi dari sesi berikutnya.',

    /* ── Edge case: gerbang akun saat offline ───────────────────────────────── */
    'account.offline-lanjut': 'Lanjut tanpa akun',
    'account.offline-catatan': 'Tidak ada jaringan. Kamu bisa langsung belajar; akun bisa disambungkan nanti.',

    /* ── SUMBU BAHASA: naskah yang dulu ditulis langsung di app.js (m025-314) ───
       Audit reports/AUDIT-UI-UX-BAHASA-2026-09-14.md menemukan naskah beranda dan tab
       Latihan ditulis sebagai literal di app.js — sebagian Inggris, sebagian Indonesia.
       Yang Inggris sampai ke murid id MAUPUN th; yang Indonesia sampai ke murid th.
       tests/th-ui-leak-test.js tidak melihatnya karena kata-katanya di luar daftar
       ID_WORDS-nya; itu blind spot gerbang, bukan izin. */

    /* Nama skill. Dipakai kartu tab Latihan, kartu skill hub, chip cepat, dan judul
       halaman Writing — SATU sumber, supaya nama yang sama tidak lahir empat kali. */
    'skill.vocab': 'Kosakata',
    'skill.grammar': 'Tata Bahasa',
    'skill.reading': 'Membaca',
    'skill.writing': 'Menulis',
    'skill.listening': 'Menyimak',
    'skill.speaking': 'Berbicara',

    /* Beranda: sapaan maskot, ritme harian, chip latihan singkat. */
    /* AUDIT-2026-09-21 T1+T3+T9: "10 menit" dipaku diganti {menit} dari todaySessionShape();
       balon tidak lagi menyapa nama (kartu "Halo, {nama}" yang menyapa); kunci selesai baru
       untuk apresiasi-bukan-ajakan saat sesi tuntas. */
    'home.sapaan-runtun-aktif': 'Runtun {hari} hari! Siap lanjut {menit} menit hari ini?',
    'home.sapaan-selesai': 'Runtun {hari} hari! Sesi hari ini sudah beres. Keren, {nama}.',
    'home.sapaan-selesai-baru': 'Sesi hari ini sudah beres. Keren, {nama}!',
    'home.paw-avatar-aria': 'Maskot Mochi',
    'home.paw-bubble-title': 'Kata Mochi',
    'home.ritme-harian': 'Ritme Harian',
    'home.ritme-harian-hitung': '({selesai}/{target} soal)',
    'home.latihan-singkat': 'Latihan Singkat',
    'home.chip-vocab-sub': '10 kartu cepat',
    'home.chip-grammar-sub': 'Pola kalimat',
    'home.chip-dengar': 'Dengar',
    'home.chip-dengar-sub': 'Audio pendek',
    'home.classroom-eyebrow': 'Segera hadir',
    'home.classroom-card': 'KelasKu',

    /* Tab Latihan: dua kartu yang dulu mengarang isinya (lihat §A4/A5 di laporan audit).
       Judul materinya kini dibaca dari riwayat murid, jadi yang tersisa di sini hanya
       bingkainya — dan bingkai itu tidak boleh menjanjikan angka apa pun sendiri. */
    'latihan.lanjut-eyebrow': 'Lanjutkan terakhir · Level {level}',
    'latihan.lanjut-sub': 'Selesaikan materi untuk memperkuat bukti kemahiran',
    'latihan.booster-tag': 'AI Booster',
    'latihan.booster-sub': 'Akurasi {akurasi}% · Disarankan latihan {menit} menit',
    'latihan.booster-tag-tertukar': 'Sering Tertukar',
    'latihan.booster-sub-tertukar': '{persen}% kekeliruanmu di sini memakai aturan {lawan}. Latih bedanya.',
    'latihan.booster-cta': 'Latih',

    /* Flashcard: tombol dengar disembunyikan saat kursusnya belum punya suara sendiri,
       dan alasannya dikatakan — tombol yang hilang tanpa penjelasan terbaca sebagai bug. */
    'flash.suara-belum-ada': 'Suara untuk {bahasa} belum tersedia, jadi tombol dengar disembunyikan supaya kamu tidak menirukan pelafalan yang salah.',
    'today.quiz_suffix': 'Soal',
    'today.start_practice_btn': 'Mulai Latihan Sekarang ➔',
    'today.vocab_suffix': 'Kosakata',
    'splash.tagline_for_teacher': 'untuk Guru',
    /* m025-375 (OWNER 2026-09-26): panel Home saat hasil latihan masih mengumpulkan jawaban. */
    'home.bukti-judul': 'Hasil latihanmu belum bisa dinilai',
    'home.bukti-isi': 'Kerjakan {sisa} soal lagi supaya FIEZEL bisa menilai hasil latihanmu dengan akurat.',
    'home.bukti-hitung': '{n}/{target} jawaban terkumpul',
    'home.bukti-cta': 'Lanjut latihan',
    'home.bukti-aria': 'Kemajuan pengumpulan jawaban untuk penilaian latihan',
    /* Audit UI/UX Home 2026-09-27 (m025-376): teks kartu Home dipindah dari app.js; angkanya kini dihitung. */
    'home.sapa': 'Hi {nama}!',
    'home.motivasi-kembali': 'Kemana aja nih, kok baru kelihatan lagi! Yuk latihan sekarang biar ritmemu tetap terjaga. 🔥',
    'home.motivasi-2': 'Belajar sedikit tiap hari jauh lebih ampuh daripada banyak sekaligus seminggu sekali. Yuk mulai! 💪',
    'home.motivasi-3': '10 menit latihan hari ini menjaga ritme belajarmu tetap prima. Jangan tunda lagi ya! 🚀',
    'home.motivasi-4': 'Konsistensi kecil hari ini adalah lompatan besar esok hari. Let\'s do this! ⭐',
    'home.motivasi-5': 'Setiap kata baru yang kamu kuasai membuka peluang baru di masa depan. Semangat! 🌟',
    'home.motivasi-6': 'Perjalanan ribuan mil selalu dimulai dari satu langkah kecil hari ini. Terus melangkah! 🌸',
    'home.kartu-level': 'LEVEL {level}',
    'home.kartu1-kicker': '📖 KATA HARI INI',
    'home.kartu1-soal': '{n} SOAL',
    'home.kartu1-menit': '± {n} MENIT',
    'home.kartu1-cta-tes': 'MULAI TES LEVEL SEKARANG',
    'home.hero-cta-mulai': 'Mulai Belajar Sekarang',
    'home.hero-cta-lanjut': 'Lanjutkan Misi',
    'home.hero-cta-sub': '{soal} soal · ±{menit} menit · langsung latihan',
    'home.aurora-target-title': 'Target Latihan Multi-Topik',
    'home.aurora-target-desc': 'Latihan adaptif gabungan Tata Bahasa, Membaca &amp; Kosakata.',
    'home.soal-selesai': 'Soal Selesai',
    'home.latihan-soal-title': 'Latihan Soal',
    'home.latihan-soal-sub': 'Semua Modul',
    'kelasku.strip-tugas-aktif': 'Tugas Aktif',
    'kelasku.strip-latihan-materi': 'Latihan &amp; Materi Kelas',
    'kelasku.strip-sinkron-guru': 'Sinkronisasi Kurikulum &amp; Guru',
    'home.kartu2-kicker': '📖 FLASHCARD & REPETISI',
    'home.kartu2-judul': 'Kosakata Harian',
    'home.kartu2-isi-baru': 'Latih kosakata level {level} dengan kartu berulang (SRS) supaya lebih lama diingat.',
    'home.kartu2-isi': '{n} kata level {level} sudah kamu latih. Kata yang hampir lupa muncul lebih dulu.',
    'home.kartu2-kata': '{n} KATA DILATIH',
    'home.kartu2-jatuh-tempo': 'PERLU DIULANG HARI INI',
    'home.kartu2-cta': 'BUKA KOSAKATA HARIAN',
    'home.kartu3-kicker': '📊 PROGRES BELAJAR',
    'home.kartu3-judul': 'Perkembangan Minggu Ini',
    'home.kartu3-isi-naik': 'Akurasimu naik {delta} poin dibanding minggu lalu. Pertahankan ritmenya!',
    'home.kartu3-isi-turun': 'Akurasimu turun {delta} poin dibanding minggu lalu. Latihan singkat hari ini membantu mengembalikannya.',
    'home.kartu3-isi-stabil': 'Akurasimu stabil dibanding minggu lalu. Terus latihan supaya naik level.',
    'home.kartu3-isi-kurang': 'Jawab minimal {min} soal minggu ini dan minggu depan supaya perkembanganmu bisa dibandingkan.',
    'home.kartu3-akurasi': '{n}% AKURASI',
    'home.kartu3-akurasi-kosong': 'AKURASI —',
    'home.kartu3-perubahan': 'POIN VS MINGGU LALU',
    'home.kartu3-runtun': '🔥 {n} HARI',
    'home.kartu3-cta': 'LIHAT DETAIL PERKEMBANGAN',
    'home.bukti-materi': 'Materi: {materi}',
    /* ── Dynamic Habit-Forming Hero (id) ── */
    'home.sapaan-fajar': 'Selamat pagi, {nama}! Awali hari dengan fokus {menit} menit.',
    'home.sapaan-siang': 'Selamat siang, {nama}! Waktu ideal untuk asah ketangkasanmu.',
    'home.sapaan-senja': 'Selamat sore, {nama}! Pertahankan ritme belajarmu hari ini.',
    'home.sapaan-malam': 'Selamat malam, {nama}! Tutup harimu dengan review materi santai.',
    'home.mood-fajar': 'Fajar Semangat',
    'home.mood-siang': 'Fokus Siang',
    'home.mood-senja': 'Ritme Senja',
    'home.mood-malam': 'Review Tenang',
    'home.streak-badge-aktif': '🔥 {hari} Hari Berturut-turut',
    'home.streak-badge-baru': '🔥 Mulai Runtun Hari Ini',
    'home.misi-adaptif-rekomendasi': 'Misi Adaptif Berikutnya',
    'home.misi-adaptif-sub': 'Latihan konsep kunci pilihan • Estimasi {menit} Menit',
    'home.ritual-anchor-title': 'Jangkar Ritual Hari Ini',
    'home.ritual-target-1': 'Buka materi & sapa tutor',
    'home.ritual-target-2': 'Tuntaskan {target} butir soal ({selesai}/{target})',
    'home.ritual-target-3': 'Kuasai kata "{kata}" ({due} perlu diulang)',
    'home.percaya-diri-quote': 'Kamu sudah selangkah lebih dekat menguasai konsep ini.',
    /* ── FIEZEL NUJUM (The Ruthless Mentor) ────────────────────────────────── */
    'nujum.status_broken': 'Status: Broken claim dicatat ke ledger kemenanganmu.',
    'nujum.next_duel': 'Lanjut Duel Berikutnya →',
    'nujum.dispute_claim': '⚡ SANGGAH KLAIM (Buktikan 3 Soal)',
    'nujum.accept_next': 'Terima & Lanjut Ronde →',
    'nujum.teleport_practice': 'Latih Materi Ini Sekarang (Modul Latihan) →',
    'nujum.next_round': 'Lanjut Ronde Duel Berikutnya →',
    'nujum.cancel_dispute': 'Batal Sanggah',
    'nujum.start_dispute': 'Mulai Pembuktian 3 Soal →',
    'nujum.dispute_status_revoked': 'Status: Label miskonsepsi DICABUT dari ledgermu.',
    'nujum.dispute_status_failed': 'Status: Tuduhan mesin tetap berlaku. Masuk ke ruang latihan dan latih polanya.',
    'nujum.surrender_unclear': 'Belum paham?',
    'nujum.surrender_learn': 'Menyerah & Pelajari',
    'nujum.speech_unsupported': 'Mikrofon Web Speech API tidak didukung di peramban ini. Silakan gunakan tombol kata di bawah.',
    'nujum.empty_victories': 'Belum ada taruhan yang dipatahkan di sesi ini.',
    'nujum.return_home': 'Kembali ke Beranda',
    'nujum.home_cta': 'Masuk Arena Taruhan Suara →',
    /* ── BUG × Sarang (id) ── */
    'bug.hp': 'HP {hp}%',
    'bug.mengincar': 'mengincar',
    'bug.belum-ketahuan': 'belum ketahuan',
    'bug.whisper-pulih': '{nama} pulih +{hp} HP selagi kamu absen',
    'bug.whisper-siaga': 'Bug pulih secepat kamu lupa. Buru sebelum mereka gemuk.',
    'bug.whisper-kosong': 'Jawab 5 soal — bug pertamamu bakal ketahuan.',
    'bug.sub': '{n} bug tinggal di kepalamu',
    'bug.sub-kosong': 'Kepalamu belum terpetakan',
    'bug.sarang': 'SARANG',
    'bug.fosil-n': '{n} fosil',
    'bug.cta': 'BURU 5 BUG HARI INI',
    'bug.cta-sub': '· 5 RONDE · 8 DETIK · {nama} MENGINCAR',
    'bug.cta-sub-kosong': '· 5 RONDE · TEMUKAN BUG PERTAMAMU',
    'bug.memuat': 'Mengendus bug…',
    'bug.kosong': 'Bank soal belum termuat. Coba lagi sebentar.',
    'bug.kembali': 'KEMBALI KE SARANG',
    'bug.beat-who': 'BUG MENGINCAR',
    'bug.beat-lock': 'mengunci target…',
    'bug.beat-hint': 'peluang kamu kegigit menurut {nama}',
    'bug.kegigit': 'kegigit',
    'bug.ronde': 'RONDE {n}',
    'bug.umpan': 'UMPAN 2×',
    'bug.detik': 'detik',
    'bug.paw-bantu': 'Mochi, bantu!',
    'bug.umpan-aktif': 'UMPAN AKTIF · DAMPAK 2×',
    'bug.benar': 'BENAR',
    'bug.kamu': 'KAMU',
    'bug.hp-nama': 'HP {nama}',
    'bug.paw-tag': 'MOCHI TURUN TANGAN · TANPA ROASTING',
    'bug.jawabannya': 'Jawabannya',
    'bug.pecah-tag': 'BUG PECAH · TEBAKAN {bet}% MELESET',
    'bug.umpan-berhasil': 'UMPAN 2× BERHASIL',
    'bug.digigit-tag': 'DIGIGIT · {nama} MENANG TARUHAN',
    'bug.berikutnya': 'BUG BERIKUTNYA →',
    'bug.lihat-laporan': 'LIHAT LAPORAN PERBURUAN →',
    'bug.v-sempurna': 'SEMPURNA',
    'bug.v-pemburu': 'PEMBURU',
    'bug.v-bertahan': 'BERTAHAN',
    'bug.v-habis': 'DIGIGIT HABIS',
    'bug.laporan': 'LAPORAN PERBURUAN',
    'bug.sarang-nama': 'Sarang {nama}',
    'bug.rekap': '{p} bug pecah · {g} lolos',
    'bug.rekap-bantu': '{n} dibantu Mochi',
    'bug.akurasi': 'AKURASI',
    'bug.pecah': 'PECAH',
    'bug.gigitan': 'GIGITAN',
    'bug.menggigit': 'MENGGIGIT',
    'bug.dibantu': 'DIBANTU MOCHI',
    'bug.bagikan': 'BAGIKAN KE WHATSAPP',
    'bug.share-teks': 'Sarang gue hari ini: {p} bug pecah, {g} lolos. Berani buru bug lo sendiri? fiezel.my.id #BuruBug',
    'bug.tersimpan': 'Gambar laporan tersimpan — kirim ke grup kelas!',
    // m025-454 Gelombang 1 audit kabel BrainCore: bahasa murid, tanpa istilah mesin, tanpa tanda pisah.
    'bc.aria': 'Saran Braincore untuk hari ini',
    'bc.judul': 'Kata Braincore Hari Ini',
    'bc.arah-naik': 'Langkahmu makin lancar! Hari ini kita rapikan: {fokus}',
    'bc.arah-datar': 'Kamu sudah stabil. Hari ini kita dorong lagi: {fokus}',
    'bc.arah-turun': 'Pelan-pelan saja. Hari ini kita kuatkan lagi: {fokus}',
    'bc.arah-baru': 'Yuk mulai! Hari ini kita latih: {fokus}',
    'bc.pudar-kata': '{n} kata ini mulai memudar di ingatanmu: {daftar}',
    'bc.segarkan': 'Segarkan Sekarang',
    'bc.tertukar': 'Sering tertukar: {a} vs {b}',
    'bc.perbaiki': 'Perbaiki Dasarnya',
    'bc.bukti-judul': 'Bukti kamu makin pintar',
    'bc.bukti-cepat': 'Kamu {kali}x lebih cepat menjawab dibanding minggu lalu',
    'bc.bukti-stabil': 'Kecepatan menjawabmu stabil dibanding minggu lalu',
    'bc.bukti-melekat': '{persen}% kata yang dipelajari masih melekat kuat',
    'bc.bukti-naik': 'Ketepatanmu naik {poin} poin sejak awal latihan',
    'bc.bukti-kosong': 'Selesaikan beberapa sesi lagi. Buktinya akan muncul di sini.',
    'bc.fokus-pasangan': 'Fokus saat ini: membedakan {a} dan {b}',
    'bc.fokus-materi': 'Fokus saat ini: {materi}',

    /* ── Game Hub Arcade ────────────────────────────────────────────────────── */
    'game.title': 'Arcade & Game',
    'game.subtitle': 'Tantang kemampuan bahasa lewat arena interaktif',
    'game.streak-label': 'Streak Game',
    'game.days-unit': 'Hari',
    'game.trophy-label': 'Trophy Arena',
    'game.mastery-label': 'Level Mahir',
    'game.arena-kicker': 'Mode Duel Seru',
    'game.arena-live': 'Pemain Siap',
    'game.paw-arena-title': 'FIEZEL ARENA',
    'game.paw-arena-desc': 'Tantang bot atau teman: adu tebak arti, sambung kata, dan rebut trophy!',
    'game.paw-arena-cta': 'Mulai Duel Arena',
    'game.mode-story': 'Story Chain',
    'game.mode-signal': 'Sinyal Presisi',
    'game.mode-stakes': 'Taruhan Poin',
    'game.section-title': 'Pilihan Arena Tantangan',
    'game.section-sub': 'Pilih mode permainan favoritmu untuk latihan seru',
    'game.bubble-badge': 'Kecepatan',
    'game.bubble-title': 'Mochi Crunch',
    'game.bubble-desc': 'Cocokkan kosakata kilat dengan animasi kenyal ala mochi.',
    'game.play-cta': 'Mainkan Sekarang',
    'game.puzzle-badge': 'Sintaksis',
    'game.puzzle-title': 'Sentence Puzzle',
    'game.puzzle-desc': 'Susun potongan kata menjadi kalimat sempurna tanpa celah.',
    'game.puzzle-cta': 'Susun Kalimat',
    'game.voice-badge': 'Intonasi',
    'game.voice-title': 'Panggung Suara Live',
    'game.voice-desc': 'Uji pelafalan dan ritme bicara langsung di panggung vokal.',
    'game.stage-cta': 'Buka Panggung',
    'game.nujum-badge': 'Mentor Keras',
    'game.nujum-title': 'NUJUM',
    'game.nujum-desc': 'Bicara dengan mentor galak yang siap mengoreksi kesalahanmu.',
    'game.nujum-cta': 'Hadapi NUJUM'
  });
}());
