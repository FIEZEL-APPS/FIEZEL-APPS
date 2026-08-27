/**
 * FIEZEL · features/quota/quota-copy.js — NASKAH MURID + ATURAN AKSESIBILITAS untuk seluruh
 * pemberitahuan jatah/suara/jembatan (A8).
 *
 * MENGAPA BERKAS INI ADA, DAN MENGAPA DI SINI. `workers/api/quota/route-quota.js:19-21`
 * sudah menyatakan aturannya: "Server mengirim FAKTA + `copyKey`, bukan kalimat … naskah
 * tinggal di `features/quota/quota-copy.js` (rekomendasi F7 cf-a12) supaya bisa diuji
 * seperti `GEMS_COPY`." Sampai commit ini berkas itu TIDAK PERNAH DIBUAT — jadi separuh
 * naskah murid untuk keadaan gagal masih hidup sebagai kalimat di dalam Worker
 * (`workers/api/tts/route-tts.js` peta `POLITE`, `workers/api/ai/route-ai.js` peta `POLITE`)
 * dan separuh lain sebagai string HTML di `app.js`. Berkas ini adalah rumah yang dijanjikan.
 *
 * CATATAN KEJUJURAN TENTANG SUMBER. Brief A8 menunjuk `reports/cf-b8-ux-quota.md` (naskah UX
 * kuota, 9 permukaan). BERKAS ITU TIDAK ADA di cabang mana pun di repo ini — sudah dicari di
 * seluruh cabang (`git ls-tree -r <branch>`), yang ada hanya `reports/exec-e3-quota.md`
 * (kontrak jatah) dan `reports/exec-e5-ai-tts.md` (rute suara). Modul saudara
 * `features/neural-voice/fiezel-cf-voice-notice.js` juga BELUM mendarat di cabang ini (ia
 * hidup di `roll/s6tts`). Maka naskah di bawah TIDAK dikarang dari dokumen hantu: setiap
 * kunci diambil apa adanya dari peta `COPY_KEY` di `route-quota.js:36-50`, dan nadanya
 * mengikuti satu-satunya naskah kegagalan yang sudah disetujui dan sudah dipakai murid —
 * `noteNoAudio()` di `features/speaking-listening/fiezel-speaking-listening-addon.js:689-695`
 * ("Suaranya sedang bermasalah, bukan kamu." + item nggak dinilai + satu jalan terus).
 * Kalau cf-b8 kelak mendarat dengan kalimat berbeda, YANG BERUBAH HANYA PETA DI BAWAH.
 *
 * KANON BAHASA yang ditegakkan `quota-notice-a11y-test.js` atas seluruh nilai di berkas ini:
 *   - bahasa Indonesia sehari-hari, sudut pandang "kamu"/"aku";
 *   - "nggak", bukan "tidak";
 *   - tanpa istilah teknis: quota, endpoint, server, worker, 429, Puter, Cloudflare,
 *     cache, token — murid nggak pernah membaca nama mesin;
 *   - tanpa janji hasil ("pasti lancar", "dijamin naik") dan tanpa menyalahkan murid;
 *   - tanpa permukaan bayar: `paymentEnabled=false` ditegakkan sebagai KETIADAAN elemen
 *     `<a>`/`<button>`, bukan tombol nonaktif. Tombol nonaktif tetap mengiklankan sesuatu
 *     yang nggak ada dan tetap mengajari murid bahwa ada pintu berbayar.
 *
 * DUA VARIAN UNTUK SETIAP KEADAAN — dan ini inti kejujurannya:
 *   spoken:true  → murid MASIH mendengar sesuatu (suara perangkat menyahut). Naskahnya
 *                  menyebut bunyinya berubah, bukan gagal.
 *   spoken:false → BENAR-BENAR TANPA SUARA. Naskahnya mengaku audionya nggak keluar,
 *                  menunjuk teks yang tetap bisa dibaca, dan menyebut kapan bisa dicoba
 *                  lagi. Menampilkan "sedang menyiapkan suara" pada keadaan tanpa suara
 *                  adalah bohong kecil yang membuat murid menunggu selamanya.
 *
 * BERKAS INI TIDAK PUNYA LOGIKA JATAH SAMA SEKALI, dan nggak boleh punya: angka jatah yang
 * dihitung di klien adalah angka yang bisa dikarang. Ia juga nggak pernah mengunci item,
 * menambah/mengurangi hitungan ulang, menonaktifkan tombol, atau menulis progres.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(root);
  else root.FiezelQuotaCopy = factory(root);
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var SCHEMA = 'fiezel-quota-copy-v1';

  /* ===================================================== 1 · NASKAH ==================== */

  /**
   * Kunci = `copyKey` dari server, apa adanya (route-quota.js:36-50), ditambah tiga keadaan
   * yang hanya diketahui klien: `network.offline` (perangkat lepas internet),
   * `session.expired` (murid perlu masuk lagi), dan `quota.unavailable` (penghitung jatah
   * sendiri yang sedang rusak — lihat §4 TEMUAN BOHONG).
   */
  var COPY = Object.freeze({
    'quota.ok': Object.freeze({
      title: 'Jatah hari ini masih ada',
      spoken: 'Semua masih berjalan seperti biasa.',
      silent: 'Semua masih berjalan seperti biasa. Kalau suaranya belum keluar, teksnya tetap bisa kamu baca.',
      urgency: 'advisory', surface: 'inline'
    }),
    'quota.low': Object.freeze({
      title: 'Jatah suara hari ini hampir habis',
      spoken: 'Masih berbunyi seperti biasa. Kalau nanti habis, aku pindah ke suara perangkatmu.',
      silent: 'Kalimat ini belum berbunyi di perangkatmu. Teksnya tetap bisa kamu baca, dan kamu boleh menekan Dengarkan lagi.',
      urgency: 'advisory', surface: 'inline'
    }),
    'quota.exhausted': Object.freeze({
      title: 'Jatah hari ini sudah habis',
      spoken: 'Aku pakai suara perangkatmu dulu. Pelajarannya nggak berhenti.',
      silent: 'Suaranya nggak bisa dibunyikan sekarang. Teksnya tetap ada, dan jatahnya kembali sesudah tengah malam.',
      urgency: 'advisory', surface: 'panel'
    }),
    'quota.tts.exhausted': Object.freeze({
      title: 'Jatah suara hari ini sudah habis',
      spoken: 'Aku pakai suara perangkatmu dulu untuk sisa sesi ini. Bunyinya beda, pelajarannya tetap jalan.',
      silent: 'Perangkat ini belum punya suara cadangan, jadi kalimat ini nggak bisa dibunyikan. Teksnya tetap bisa kamu baca, dan jatahnya kembali sesudah tengah malam.',
      urgency: 'advisory', surface: 'panel'
    }),
    'quota.ai.exhausted': Object.freeze({
      title: 'Jatah tanya-jawab hari ini sudah habis',
      spoken: 'Penjelasan dari materi tetap muncul, dan itu nggak pakai jatah. Latihanmu jalan terus.',
      silent: 'Penjelasan dari materi tetap muncul, dan itu nggak pakai jatah. Suaranya belum keluar sekarang, jadi bacalah teksnya dulu.',
      urgency: 'advisory', surface: 'panel'
    }),
    'quota.aiTranslate.exhausted': Object.freeze({
      title: 'Jatah terjemahan hari ini sudah habis',
      spoken: 'Arti kata dari kamus di perangkat ini tetap bisa kamu buka. Sesi dengarmu nggak terpengaruh.',
      silent: 'Arti kata dari kamus di perangkat ini tetap bisa kamu buka. Suaranya belum keluar sekarang, jadi bacalah teksnya dulu.',
      urgency: 'advisory', surface: 'panel'
    }),
    'quota.rate.slowdown': Object.freeze({
      title: 'Kecepatan menekannya perlu diberi jeda',
      spoken: 'Aku pakai suara perangkatmu untuk kalimat ini. Tunggu sebentar sebelum menekan lagi.',
      silent: 'Kalimat ini belum bisa dibunyikan. Tunggu beberapa detik lalu coba lagi — teksnya tetap ada.',
      urgency: 'advisory', surface: 'inline'
    }),
    'quota.concurrency.wait': Object.freeze({
      title: 'Masih menyiapkan kalimat sebelumnya',
      spoken: 'Aku selesaikan yang tadi dulu, sebentar saja.',
      silent: 'Yang tadi belum selesai disiapkan, jadi kalimat ini belum berbunyi. Teksnya tetap bisa kamu baca sambil menunggu.',
      urgency: 'advisory', surface: 'inline'
    }),
    'quota.payload.tooLong': Object.freeze({
      title: 'Kalimatnya kepanjangan untuk sekali baca',
      spoken: 'Aku bacakan sebagian dulu. Potong jadi dua bagian kalau mau utuh.',
      silent: 'Kalimatnya kepanjangan untuk sekali dibunyikan, jadi belum ada suaranya. Teksnya tetap bisa kamu baca \u2014 potong jadi dua bagian lalu coba lagi.',
      urgency: 'advisory', surface: 'inline'
    }),
    'service.degraded': Object.freeze({
      title: 'Layanan suara sedang istirahat sebentar',
      spoken: 'Suara dari perangkatmu dulu, ya. Ini bukan kesalahanmu dan nggak ada yang hilang.',
      silent: 'Aku belum berhasil membunyikan kalimat ini. Bukan kamu yang salah — teksnya tetap bisa dibaca, dan suaranya biasanya kembali beberapa menit lagi.',
      urgency: 'advisory', surface: 'panel'
    }),
    'service.providerError': Object.freeze({
      title: 'Suara gagal disiapkan',
      spoken: 'Aku pakai suara perangkatmu untuk kalimat ini.',
      silent: 'Aku belum berhasil membunyikan kalimat ini. Teksnya tetap bisa kamu baca, dan kamu boleh mencoba lagi sekarang.',
      urgency: 'advisory', surface: 'panel'
    }),
    'service.unknown': Object.freeze({
      title: 'Suara belum tersedia untuk kalimat ini',
      spoken: 'Aku pakai suara perangkatmu dulu.',
      silent: 'Aku belum berhasil membunyikan kalimat ini. Teksnya tetap bisa kamu baca, dan kamu boleh menekan Dengarkan lagi.',
      urgency: 'advisory', surface: 'panel'
    }),
    /* Penghitung jatahnya sendiri yang rusak. Naskahnya WAJIB beda dari "jatah habis":
       murid yang belum memakai apa pun nggak boleh dituduh sudah menghabiskan jatahnya. */
    'quota.unavailable': Object.freeze({
      title: 'Aku belum bisa membaca sisa jatahmu',
      spoken: 'Jatahmu kemungkinan besar masih utuh — yang bermasalah catatannya, bukan kamu. Aku pakai suara perangkatmu sementara ini.',
      silent: 'Jatahmu kemungkinan besar masih utuh — yang bermasalah catatannya, bukan kamu. Kalimat ini belum bisa dibunyikan; teksnya tetap ada, dan coba lagi sebentar lagi.',
      urgency: 'advisory', surface: 'panel'
    }),
    /* Perangkat lepas internet. Ini keadaan yang PALING sering disalahnaskahi sebagai
       "jatah habis": keduanya kelihatan sama dari dalam kode (panggilan gagal), padahal
       yang satu berarti "besok lagi" dan yang satu berarti "nyalakan datamu". */
    'network.offline': Object.freeze({
      title: 'Perangkatmu sedang lepas dari internet',
      spoken: 'Suara dari perangkatmu tetap jalan, dan latihan yang sudah tersimpan tetap bisa kamu kerjakan.',
      silent: 'Kalimat ini butuh internet supaya bisa dibunyikan, jadi sekarang belum ada suaranya. Teksnya tetap bisa kamu baca, dan jatahmu nggak terpakai sama sekali.',
      urgency: 'advisory', surface: 'panel'
    }),
    /* SATU-SATUNYA keadaan mendesak: kalau murid nggak masuk lagi, hasil yang dikerjakan
       sesudah ini bisa nggak tercatat. Itu memang perlu menyerobot perhatian. */
    'session.expired': Object.freeze({
      title: 'Kamu perlu masuk lagi supaya hasilmu tercatat',
      spoken: 'Masuk lagi sebentar, ya. Yang sudah selesai tetap aman.',
      silent: 'Masuk lagi sebentar, ya. Yang sudah selesai tetap aman, dan latihan berikutnya baru tercatat sesudah kamu masuk.',
      urgency: 'urgent', surface: 'panel'
    })
  });

  /** Nada yang sama dengan `noteNoAudio()`: sebut penyebabnya, jangan tuduh murid. */
  var REASSURANCE = 'Item ini nggak dinilai dan nggak dikunci.';

  var FALLBACK_KEY = 'service.unknown';

  /* ============================================ 2 · KEJUJURAN KEADAAN ================== */

  /**
   * Menentukan kunci naskah yang JUJUR dari keadaan nyata perangkat, bukan dari kode gagal
   * pertama yang kebetulan terbaca. Urutannya sengaja: keadaan yang paling sering
   * disalahnaskahi diperiksa PALING DULU.
   *
   *  1. `online === false` → SELALU `network.offline`, apa pun kata kode gagal. Panggilan
   *     yang nggak pernah keluar dari perangkat nggak mungkin membuktikan jatah habis.
   *  2. `reason === 'quota_unavailable'` (penghitung jatah rusak) → `quota.unavailable`,
   *     BUKAN `quota.exhausted`. Lihat §4 laporan A8.
   *  3. `sessionExpired === true` → `session.expired`.
   *  4. sisanya: `copyKey` dari server kalau dikenal, kalau nggak → `service.unknown`.
   */
  function resolveKey(facts) {
    var f = facts || {};
    if (f.online === false) return 'network.offline';
    if (String(f.reason || '') === 'quota_unavailable') return 'quota.unavailable';
    if (f.sessionExpired === true) return 'session.expired';
    var key = String(f.copyKey || '').trim();
    return COPY[key] ? key : FALLBACK_KEY;
  }

  /* ============================================ 3 · ATURAN AKSESIBILITAS ============== */

  /**
   * Kelas pesan yang BOLEH memakai `role="alert"`. Daftar ini sengaja berisi satu kunci.
   * `role="alert"` memotong apa pun yang sedang dibaca pembaca layar; memakainya untuk
   * "jatah suara habis" berarti menyerobot kalimat soal demi kabar yang bisa menunggu.
   */
  var URGENT_KEYS = Object.freeze(['session.expired']);

  /** Permukaan yang DILARANG untuk pemberitahuan jatah/suara. */
  var FORBIDDEN_SURFACES = Object.freeze(['toast']);

  /**
   * `showToast()` di `app.js:2521` menyembunyikan dirinya sesudah 2.600 ms. Itu cukup untuk
   * "Terkirim, terima kasih!" dan nggak cukup untuk kalimat yang menjelaskan apa yang rusak
   * dan apa yang harus dilakukan. Pemberitahuan di berkas ini menetap sampai murid
   * menutupnya sendiri.
   */
  var FORBIDDEN_TOAST_MS = 2600;
  var MIN_VISIBLE_MS = 0;          // 0 = nggak pernah hilang sendiri
  var PERSIST_UNTIL_DISMISSED = true;

  /**
   * Warna. Tinta gelap di atas bidang krem — dua-duanya token yang sudah ada di style.css
   * (--ink #241A11, --cream-deep #FFF3DC). Rasionya dihitung ulang oleh gerbang, jadi
   * mengubah salah satu hex di sini akan memerahkan CI kalau jatuh di bawah 4,5:1.
   */
  var COLORS = Object.freeze({ fg: '#241A11', bg: '#FFF3DC', border: '#E6A800' });
  var MIN_TOUCH_PX = 44;

  /**
   * ATURAN SENYAP SAAT SESI DENGAR BERJALAN (butir 3 brief A8).
   *
   * Ini yang paling mudah terlewat, dan paling merusak. Murid sedang menyimak soal
   * listening; pembaca layar sedang membacakan — atau justru sedang DIAM supaya audionya
   * kedengaran. Satu wilayah `aria-live` yang tiba-tiba mengumumkan "Jatah suara hari ini
   * sudah habis" di tengah kalimat soal akan:
   *   - menimpa audio soal di perangkat yang mencampur suara pembaca layar dengan media;
   *   - membuat murid kehilangan potongan kalimat yang nggak boleh diulang gratis;
   *   - artinya: mengubah nilai ujian karena kabar tentang mesin.
   *
   * Aturannya: selama `listeningActive === true`, pemberitahuan TETAP DIRENDER (murid yang
   * melihat layar butuh tahu kenapa sunyi) tetapi wilayahnya `aria-live="off"` dan
   * `role=""` — nggak ada yang diumumkan. Ia diantrikan dan diumumkan sesudah sesi bubar.
   * Presedennya sudah ada dan terbukti: pemberitahuan kredit di `app.js`
   * (`maybePresentPuterCreditNotice`) memang hanya dipanggil di `onSessionEnd` addon
   * listening (m026-02) justru karena alasan yang sama.
   *
   * PENGECUALIAN: NGGAK ADA. Bahkan `session.expired` menunggu — sesi dengar paling lama
   * beberapa menit, dan hasil yang belum tercatat lebih baik diselamatkan sesudah murid
   * selesai menyimak daripada ujiannya dirusak di tengah jalan.
   */
  function announcement(key, options) {
    var opts = options || {};
    var resolved = COPY[key] ? key : FALLBACK_KEY;
    var urgent = URGENT_KEYS.indexOf(resolved) !== -1;
    if (opts.listeningActive === true) {
      return Object.freeze({
        role: '', ariaLive: 'off', ariaAtomic: 'true',
        announce: false, deferUntilSessionEnd: true, stealsFocus: false
      });
    }
    return Object.freeze({
      role: urgent ? 'alert' : 'status',
      ariaLive: urgent ? 'assertive' : 'polite',
      ariaAtomic: 'true',
      announce: true, deferUntilSessionEnd: false,
      // Fokus NGGAK PERNAH dirampas. Murid yang sedang mengisi jawaban akan kehilangan
      // tempatnya — dan pada papan tombol layar, kursornya melompat keluar dari kolom.
      stealsFocus: false
    });
  }

  /* ============================================ 4 · PENYUSUN PEMBERITAHUAN ============ */

  function jakartaResetLabel(resetAt) {
    var ms = Number(resetAt || 0);
    if (!ms) return '';
    try {
      // Jatah murid mulai lagi 00:00 Asia/Jakarta (exec-e3-quota.md §3 butir 4). Labelnya
      // dibaca dari `resetAt` kiriman server, BUKAN dihitung dari jam perangkat: jam
      // perangkat adalah lubang manipulasi termurah, dan sudah ditutup di sisi jatah.
      return new Date(ms).toLocaleTimeString('id-ID', {
        timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit'
      });
    } catch (_) { return ''; }
  }

  /**
   * Menyusun satu pemberitahuan. FUNGSI MURNI — tanpa DOM, tanpa jam sistem, tanpa efek
   * samping — supaya gerbang bisa memeriksa seluruh naskahnya tanpa peramban.
   *
   * @param {object} facts `{copyKey, reason, online, sessionExpired, spoken, resetAt,
   *                         listeningActive}`
   */
  function build(facts) {
    var f = facts || {};
    var key = resolveKey(f);
    var e = COPY[key];
    var spoken = f.spoken === true;
    var body = spoken ? e.spoken : e.silent;
    var reset = jakartaResetLabel(f.resetAt);
    if (!spoken && reset && key.indexOf('quota.') === 0 && key !== 'quota.unavailable') {
      // Kalau naskahnya sudah menyebut waktu kembalinya secara kasar ("sesudah tengah
      // malam"), jam pastinya MENGGANTI frasa itu, bukan menempel sesudahnya. Menempel
      // menghasilkan dua kalimat waktu berturut-turut, dan murid membaca yang kedua sebagai
      // aturan lain.
      body = /sesudah tengah malam/.test(body)
        ? body.replace('sesudah tengah malam', 'jam ' + reset + ' WIB')
        : body + ' Jatah berikutnya mulai jam ' + reset + ' WIB.';
    }
    var a11y = announcement(key, { listeningActive: f.listeningActive === true });
    return Object.freeze({
      schema: SCHEMA,
      key: key,
      requestedCopyKey: String(f.copyKey || ''),
      title: e.title,
      body: body,
      reassurance: REASSURANCE,
      spoken: spoken,
      urgency: e.urgency,
      surface: e.surface,
      role: a11y.role,
      ariaLive: a11y.ariaLive,
      announce: a11y.announce,
      deferUntilSessionEnd: a11y.deferUntilSessionEnd,
      stealsFocus: false,
      persistUntilDismissed: PERSIST_UNTIL_DISMISSED,
      autoHideMs: MIN_VISIBLE_MS,
      // Pemberitahuan adalah pemberitahuan. Ia nggak mengunci item, nggak menghitung ulang.
      locksItem: false,
      countsReplay: false
    });
  }

  /* ============================================ 5 · MARKUP ============================ */

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /**
   * Panel pemberitahuan. URUTAN BACA disusun untuk pembaca layar, bukan untuk mata:
   * judul → penjelasan → penenteram → tombol tutup. Tombol tutup diletakkan PALING AKHIR
   * supaya pembaca layar nggak menawarkan "Tutup" sebelum murid tahu apa yang ditutup.
   *
   * Nggak ada `autofocus`, nggak ada `.focus()`, nggak ada `tabindex` positif: murid yang
   * sedang mengerjakan soal tetap berada di kolom jawabannya.
   */
  function panelMarkup(notice) {
    var n = notice || build({});
    var roleAttr = n.role ? ' role="' + esc(n.role) + '"' : '';
    return '<section class="fz-notice fz-notice-' + esc(n.urgency) + '" data-fz-notice="' + esc(n.key) + '"' +
      roleAttr + ' aria-live="' + esc(n.ariaLive) + '" aria-atomic="true">' +
      '<h2 class="fz-notice-title">' + esc(n.title) + '</h2>' +
      '<p class="fz-notice-body">' + esc(n.body) + '</p>' +
      '<p class="fz-notice-note">' + esc(n.reassurance) + '</p>' +
      '<div class="fz-notice-actions">' +
      '<button type="button" class="fz-notice-btn" data-fz-notice-dismiss>Oke, lanjut belajar</button>' +
      '</div></section>';
  }

  /* ============================================ 6 · PANEL JATAH (TANPA BAYAR) ========= */

  /**
   * Panel "jatahmu hari ini". Selama `paymentEnabled` false — dan
   * `workers/api/quota/quota-config.js:90` menyatakan ia false — panel ini tidak memuat
   * SATU PUN elemen `<a>` atau `<button>`. Bukan tombol nonaktif, bukan tautan "pelajari
   * opsi": KETIADAAN elemen. Tombol nonaktif tetap memberi tahu murid bahwa ada pintu
   * berbayar dan tetap bisa dinyalakan kembali oleh satu baris CSS yang salah.
   *
   * Kalau suatu hari `paymentEnabled` benar-benar dinyalakan, fungsi ini MELEMPAR. Itu
   * disengaja: menyalakan pembayaran wajib melewati keputusan owner dan naskah baru, bukan
   * lewat satu bendera yang kebetulan berubah nilai.
   */
  function planPanelMarkup(facts) {
    var f = facts || {};
    if (f.paymentEnabled === true) {
      throw new Error('quota-copy: paymentEnabled=true belum punya naskah yang disetujui');
    }
    var used = Number(f.used || 0);
    var limit = Number(f.limit || 0);
    var reset = jakartaResetLabel(f.resetAt);
    return '<section class="fz-plan" data-fz-plan aria-labelledby="fzPlanTitle">' +
      '<h2 class="fz-plan-title" id="fzPlanTitle">Jatah belajarmu hari ini</h2>' +
      '<p class="fz-plan-line">Terpakai ' + esc(used) + ' dari ' + esc(limit) + '.</p>' +
      '<p class="fz-plan-line">FIEZEL gratis dan nggak dijual. Jatah ini cuma penjaga supaya' +
      ' semua murid kebagian, dan ia mulai lagi sendiri' + (reset ? ' jam ' + esc(reset) + ' WIB' : ' sesudah tengah malam') + '.</p>' +
      '<p class="fz-plan-line">Kalau jatahnya habis, latihan, materi, dan progresmu tetap jalan seperti biasa.</p>' +
      '</section>';
  }

  return Object.freeze({
    SCHEMA: SCHEMA,
    COPY: COPY,
    REASSURANCE: REASSURANCE,
    FALLBACK_KEY: FALLBACK_KEY,
    URGENT_KEYS: URGENT_KEYS,
    FORBIDDEN_SURFACES: FORBIDDEN_SURFACES,
    FORBIDDEN_TOAST_MS: FORBIDDEN_TOAST_MS,
    PERSIST_UNTIL_DISMISSED: PERSIST_UNTIL_DISMISSED,
    COLORS: COLORS,
    MIN_TOUCH_PX: MIN_TOUCH_PX,
    resolveKey: resolveKey,
    announcement: announcement,
    build: build,
    panelMarkup: panelMarkup,
    planPanelMarkup: planPanelMarkup
  });
}));
