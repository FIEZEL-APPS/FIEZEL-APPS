/**
 * FIEZEL · features/i18n/copy-id-gems.js — COPY-MAP INDONESIA, naskah GEMS_COPY (W2-INT)
 *
 * MENGAPA BERKAS INI ADA. gems-core.js terkunci sha256 (AI-02 F01), jadi overlay konsumen
 * (gemsI18nOverlay di fiezel-speaking-listening-addon.js + ternary di app.js) mengambil teks
 * lewat FiezelI18n.t('gems.<slug>') HANYA saat locale bukan 'id' — jalur id tetap membaca
 * FiezelGems.GEMS_COPY asli byte-identik (desain W2-FEAT-B §2). Tetapi kunci gems.* itu
 * belum terdaftar di locale mana pun, sedangkan saklar bahasa (W2-STATE) sudah bisa memilih
 * th SEBELUM copy-th-gems.js (Wave 3) mendarat: murid th akan melihat kunci mentah
 * 'gems.settings-title' alih-alih kalimat. Berkas ini menambal lubang itu lewat fallback
 * resmi runtime (locale aktif → id → kunci mentah): nilai id terdaftar = murid th melihat
 * kalimat Indonesia yang benar sampai Wave 3, bukan kunci mentah.
 *
 * HUKUM BESI #1: setiap nilai di bawah DISALIN VERBATIM dari GEMS_COPY gems-core.js —
 * duplikat byte-identik, bukan kalimat baru, jadi himpunan literal baseline emas tidak
 * berubah. JANGAN menyunting nilai di sini tanpa menyunting gems-core.js (yang terkunci).
 *
 * SENGAJA TIDAK DIDAFTARKAN: gems.chip-aria ({saldo}) dan gems.streak-toast ({s},{n}) —
 * padanan id-nya adalah FUNGSI (chipAria/streakToast) yang merakit kalimat, bukan literal,
 * sehingga templat ber-placeholder akan menjadi kalimat id BARU di mata gerbang emas.
 * Keduanya jalur th-murni dan wajib didaftarkan Wave 3 di copy-th-gems.js.
 */
(function () {
  'use strict';
  var I18N = (typeof self !== 'undefined' ? self : this).FiezelI18n;
  if (!I18N) return; // urutan script salah — fiezel-i18n.js wajib dimuat lebih dulu

  I18N.registerCopy('id', {
    // gems-core.js GEMS_COPY.name
    'gems.name': 'Gem Terjemahan',
    // gems-core.js GEMS_COPY.toastStreak
    'gems.toast-streak': 'Streak 5! +2 Gem Terjemahan buat kamu — simpan atau langsung pakai, bebas.',
    // gems-core.js GEMS_COPY.toggleLabel
    'gems.toggle-label': 'Terjemahan Indonesia',
    // gems-core.js GEMS_COPY.emptyTitle
    'gems.empty-title': 'Gem kamu lagi kosong',
    // gems-core.js GEMS_COPY.emptyBody
    'gems.empty-body': 'Tenang, ini bukan tembok bayar — Gem Terjemahan memang nggak dijual, dan nggak akan pernah. Cara dapatnya cuma satu: belajar. Kumpulin streak jawaban benar, dan gem-nya ngalir sendiri. PAW yakin nggak butuh lama, kok.',
    // gems-core.js GEMS_COPY.settingsTitle
    'gems.settings-title': 'Gem Terjemahan',
    // gems-core.js GEMS_COPY.settingsBody
    'gems.settings-body': 'Gem Terjemahan adalah mata uang belajarmu: kamu dapat gratis tiap streak jawaban benar, dan dipakai buat membuka terjemahan otomatis di sesi Listening (1 gem per sesi, butuh jaringan). Gem nggak dijual dan nggak bisa dibeli — satu-satunya jalan mendapatkannya ya belajar.',
    // gems-core.js GEMS_COPY.unavailable
    'gems.unavailable': 'Terjemahan belum bisa diambil — butuh jaringan dan jatah AI masih terbatas. Gem kamu nggak terpakai.',
    // gems-core.js GEMS_COPY.autoNote
    'gems.auto-note': 'terjemahan otomatis'
  });
}());
