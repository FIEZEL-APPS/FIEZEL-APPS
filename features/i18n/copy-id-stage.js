/**
 * FIEZEL · features/i18n/copy-id-stage.js — COPY-MAP INDONESIA (domain: stage).
 *
 * NASKAH PANGGUNG SUARA LIVE (SLOT 13). Kunci di bawah dipanggil dua tempat:
 *   - app.js, lewat pembungkus `fzStageT(kunci, cadangan)` untuk laci layar penuh;
 *   - features/speaking-listening/fiezel-panggung-suara.js dan fiezel-webrtc-stage.js,
 *     lewat pembungkus `t(kunci, cadangan)` yang sama polanya (fiezel-class-hub.js).
 *
 * MENGAPA DOMAIN SENDIRI, bukan menumpang copy-id-redesign.js: kalimat gelombang ini lahir
 * bersama fitur baru (SLOT 13) dan jumlahnya besar, jadi ia dibaca sebagai satu blok saat
 * meninjau naskah — persis alasan copy-id-redesign.js dipisah di m025-246. Karena
 * features/i18n/copy-id-stage.js ada, pendaftaran domain OTOMATIS di
 * tests/th-coverage-test.js langsung menuntut copy-th-stage.js sebagai kembarannya; berkas
 * itu dibuat di gelombang yang sama supaya murid Thai tidak membaca bahasa Indonesia di
 * layar panggung.
 *
 * SATU-SATUNYA KUNCI DI SINI YANG JUGA DIPAKAI index.html adalah `stage.drawer-aria`
 * (atribut data-i18n-aria-label pada #fzStageDrawer). Sisa kunci lahir dari app.js/modul.
 *
 * NASKAH: seluruh nilai sengaja TANPA tanda hubung (aturan naskah naskah FIEZEL); kata
 * ulang ditulis dengan spasi, bukan tanda hubung.
 */
(function () {
  'use strict';
  var I18N = (typeof self !== 'undefined' ? self : this).FiezelI18n;
  if (!I18N || typeof I18N.registerCopy !== 'function') return; // urutan script salah

  I18N.registerCopy('id', {
    /* ── Kerangka laci & atribut index.html ─────────────────────────────────── */
    'stage.drawer-aria': 'Panggung Suara Live',
    'stage.judul': 'Panggung Suara Live',
    'stage.tutup-aria': 'Tutup panggung suara',

    /* ── Identitas ruang ─────────────────────────────────────────────────────── */
    'stage.live': 'LIVE',
    'stage.ruang': 'Ruang',
    'stage.room-belum-ada': 'Belum ada ruang',
    'stage.skor': 'Skor',
    'stage.buat-ruangan-dulu': 'Buat ruangan dulu supaya temanmu bisa masuk lewat tautan undangan.',
    'stage.system-sender': 'Panggung Suara',
    'stage.judge-sender': 'Juri Fiezel',
    'stage.default-room-title': 'Sarang Suara',

    /* ── Panggung pembicara & kartu permainan ────────────────────────────────── */
    'stage.rekan': 'Rekan duet',
    'stage.penonton': 'Penonton',
    'stage.kartu-rahasia': 'Kartu rahasia',
    'stage.siap': 'Siap',
    'stage.tekan-mulai': 'Tekan Mulai Ronde',
    'stage.belum-ada-kartu': 'Belum ada kartu aktif',
    'stage.kata-terlarang': 'Kata terlarang',
    'stage.jelaskan-tanpa-kata-tabu': 'Jelaskan tanpa menyebut kata terlarang.',
    'stage.benar': 'Benar',
    'stage.ganti': 'Ganti kartu',
    'stage.mulai-ronde': 'Mulai ronde',
    'stage.hentikan-ronde': 'Hentikan ronde',

    /* ── Obrolan juri & sistem ───────────────────────────────────────────────── */
    'stage.juri': 'Juri Fiezel',
    'stage.sambut': 'Selamat bermain. Jelaskan kartunya, jangan sampai keceplosan.',
    'stage.keceplosan': 'Keceplosan! Kata terlarang terdeteksi, poin dipotong.',
    'stage.chat-benar': 'Jawaban benar: ',
    'stage.chat-benar-akhir': '! Berhasil!',

    /* ── Reaksi, suara, mikrofon ─────────────────────────────────────────────── */
    'stage.tepuk': 'Tepuk tangan',
    'stage.semangat': 'Semangat',
    'stage.tawa': 'Tawa',
    'stage.mikrofon': 'Hidup atau matikan mikrofon',
    'stage.mikrofon-mati': 'Mikrofon dimatikan.',
    'stage.mikrofon-hidup': 'Mikrofon menyala.',
    'stage.reaksi': 'Mengirim reaksi',
    'stage.sfx-ding': 'Lonceng',
    'stage.sfx-buzzer': 'Buzzer',
    'stage.sfx-alarm': 'Alarm',
    'stage.sfx-cheer': 'Sorak',

    /* ── Undangan & kehadiran rekan ──────────────────────────────────────────── */
    'stage.undang-wa': 'Bagikan undangan lewat WhatsApp',
    'stage.undangan-teks': 'Ayo main Sarang Tabu di Panggung Suara FIEZEL. Kode ruang {kode}.',
    'stage.teman': 'Teman',
    'stage.teman-masuk': '{nama} masuk ke panggung.',
    'stage.teman-keluar': '{nama} keluar dari panggung.',
    'stage.undangan-terkirim': 'Undangan dibuka di WhatsApp. Tautannya juga disalin.',
    'stage.undangan-gagal': 'Tidak bisa membuka WhatsApp. Salin tautannya: {tautan}',

    /* ── Keadaan gagal & penjelasan jujur ────────────────────────────────────── */
    'stage.modul-belum-siap': 'Fitur panggung suara belum siap di perangkat ini.',
    'stage.offline': 'Kamu sedang offline. Panggung suara butuh sambungan untuk menyusun ruangan.',
    'stage.belum-aktif': 'Fitur panggung suara belum aktif untuk akunmu.',
    'stage.ruang-gagal': 'Ruang tidak ditemukan atau sudah berakhir.',
    'stage.ruang-gagal-buat': 'Ruang tidak bisa dibuat sekarang.',
    'stage.tepat': 'Tepat! Kartu berikutnya menyusul.',
    'stage.catatan-footer': 'Suara berjalan dua arah lewat P2P. Saling bicara bergantian supaya tidak saling memotong.'
  });
}());
