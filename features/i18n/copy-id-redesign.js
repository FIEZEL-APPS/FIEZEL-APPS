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
    'nav.home-primary-aria': 'Beranda dan fokus harian',
    'nav.progress': 'Progres',
    'nav.progress-aria': 'Peta CEFR dan kemahiran',
    'nav.profile': 'Profil',
    'nav.profile-aria': 'Profil murid dan teman',

    /* ── Home "Hari ini" ────────────────────────────────────────────────────── */
    'today.eyebrow': 'Hari ini',
    'today.cta': 'Mulai 10 menit',
    'today.cta-lanjut': 'Lanjutkan sesi',
    'today.cta-kenalan': 'Cari level kamu dulu',
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
    'home.sapaan-runtun-aktif': 'Runtun {hari} hari! Mantap sekali, {nama}. Siap lanjut 10 menit hari ini?',
    'home.paw-avatar-aria': 'Maskot PAW',
    'home.paw-bubble-title': 'Kata PAW',
    'home.ritme-harian': 'Ritme Harian',
    'home.ritme-harian-hitung': '({selesai}/{target} soal)',
    'home.latihan-singkat': 'Latihan Singkat 3 Menit',
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
    'flash.suara-belum-ada': 'Suara untuk {bahasa} belum tersedia, jadi tombol dengar disembunyikan supaya kamu tidak menirukan pelafalan yang salah.'
  });
}());
