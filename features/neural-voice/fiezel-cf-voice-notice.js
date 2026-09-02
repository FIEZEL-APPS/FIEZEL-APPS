/**
 * S6 — naskah pemberitahuan kuota suara (sisi klien).
 *
 * SERVER MENGIRIM FAKTA + `copyKey`, BUKAN KALIMAT. Itu kontrak yang sudah berlaku di
 * `workers/api/quota/route-quota.js:19,36-50`: tidak ada satu pun prosa Indonesia di respons
 * Worker, hanya kode mesin dan penunjuk naskah. Berkas ini adalah ujung klien dari kontrak
 * itu untuk jalur suara: satu peta `copyKey → kalimat`, dan tidak ada logika kuota sama
 * sekali. Menaruh kalimatnya di server berarti mengubah naskah butuh deploy Worker; menaruh
 * kuotanya di klien berarti kuota bisa dikarang. Keduanya dihindari dengan pemisahan ini.
 *
 * CATATAN KEJUJURAN TENTANG SUMBER NASKAH. Brief S6 menunjuk `reports/cf-b8-ux-quota.md`.
 * Berkas itu TIDAK ADA di cabang ini (yang ada: `reports/exec-e3-quota.md` untuk kontrak
 * kuota dan `reports/exec-e5-ai-tts.md` untuk rute TTS). Jadi naskah di bawah TIDAK
 * dikarang bebas: ia disusun dari tiga sumber yang benar-benar ada di repo, dan setiap
 * kalimat menyebut asalnya —
 *   - peta `COPY_KEY` di `route-quota.js:36-50` (nama kunci, satu-satu, tanpa tambahan);
 *   - peta `POLITE` di `workers/api/tts/route-tts.js:79-88` (isi pesan yang sudah disetujui
 *     untuk kuota habis, breaker, dan audio tak tersedia);
 *   - naskah `noteNoAudio()` di `features/speaking-listening/fiezel-speaking-listening-addon.js`
 *     ("Suaranya sedang bermasalah, bukan kamu.") untuk NADA-nya: menyebut apa yang terjadi,
 *     menyatakan item tidak dinilai dan tidak dikunci, lalu memberi jalan terus.
 * Kalau cf-b8 kelak mendarat dan kalimatnya berbeda, YANG BERUBAH HANYA PETA DI BAWAH.
 *
 * DUA VARIAN UNTUK SETIAP KEADAAN, dan itu inti berkas ini:
 *   spoken:true  → murid TETAP mendengar sesuatu (Puter atau neural di perangkat yang
 *                  menyahut; m025-231 menghapus cadangan peramban, jadi ia bukan lagi
 *                  salah satu penyahut). Naskahnya menyebut penurunan mutu, bukan kegagalan.
 *   spoken:false → tidak ada suara sama sekali. Naskahnya JUJUR: mengatakan audionya tidak
 *                  ada, mengatakan teksnya tetap bisa dibaca, dan mengatakan kapan ia
 *                  kembali. Menampilkan kalimat "sedang menyiapkan suara" pada keadaan tanpa
 *                  suara adalah kebohongan kecil yang membuat murid menunggu selamanya.
 *
 * YANG TIDAK DILAKUKAN BERKAS INI, dan tidak boleh pernah dilakukan: mengunci item,
 * menaikkan/menurunkan hitungan replay, menonaktifkan tombol, menulis progres, atau
 * menyentuh state pelajaran apa pun. Bug m025-170 lahir dari kegagalan suara yang
 * MENGUBAH state pelajaran; pemberitahuan adalah pemberitahuan, titik.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(root);
  else root.FiezelCfVoiceNotice = factory(root);
}(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  'use strict';

  var SCHEMA = 'fiezel-cf-voice-notice-v1';
  var EVENT_NAME = 'fiezel-voice-notice';

  /**
   * Peta naskah. Kunci = `copyKey` dari server, apa adanya. Kunci yang tidak dikenal jatuh ke
   * `service.unknown` (nilai bawaan `denyEnvelope` di route-quota.js:129), bukan ke string
   * kosong: pemberitahuan yang hilang membuat kebisuan terasa seperti aplikasi rusak.
   */
  var COPY = Object.freeze({
    'quota.tts.exhausted': Object.freeze({
      title: 'Jatah suara hari ini sudah habis',
      spoken: 'Aku pakai suara perangkat dulu untuk sisa sesi ini. Bunyinya beda, pelajarannya tetap jalan.',
      silent: 'Perangkat ini juga belum punya suara cadangan, jadi kalimat ini belum bisa dibunyikan. Teksnya tetap bisa kamu baca, dan jatahnya kembali setelah tengah malam.',
      tone: 'quota'
    }),
    'quota.exhausted': Object.freeze({
      title: 'Jatah hari ini sudah habis',
      spoken: 'Aku pakai suara perangkat dulu. Pelajarannya tidak berhenti.',
      silent: 'Suaranya belum bisa dibunyikan sekarang. Teksnya tetap ada, dan jatahnya kembali setelah tengah malam.',
      tone: 'quota'
    }),
    'quota.low': Object.freeze({
      title: 'Jatah suara hari ini hampir habis',
      spoken: 'Masih berbunyi seperti biasa. Kalau nanti habis, aku pindah ke suara perangkat.',
      silent: 'Suaranya belum berbunyi untuk kalimat ini. Teksnya tetap bisa kamu baca.',
      tone: 'quota'
    }),
    'quota.rate.slowdown': Object.freeze({
      title: 'Terlalu cepat berurutan',
      spoken: 'Aku pakai suara perangkat untuk kalimat ini. Tunggu sebentar sebelum menekan lagi.',
      silent: 'Kalimat ini belum bisa dibunyikan. Tunggu beberapa detik lalu coba lagi — teksnya tetap ada.',
      tone: 'rate'
    }),
    'service.degraded': Object.freeze({
      title: 'Layanan suara sedang istirahat sebentar',
      spoken: 'Suara dari perangkat dulu, ya. Ini bukan kesalahanmu dan tidak ada yang hilang.',
      silent: 'Aku belum berhasil membunyikan kalimat ini. Bukan kamu yang salah — teksnya tetap bisa dibaca, dan suaranya biasanya kembali dalam beberapa menit.',
      tone: 'service'
    }),
    'service.providerError': Object.freeze({
      title: 'Suara gagal disiapkan',
      spoken: 'Aku pakai suara perangkat untuk kalimat ini.',
      silent: 'Aku belum berhasil membunyikan kalimat ini. Teksnya tetap bisa kamu baca, dan kamu boleh mencoba lagi sekarang.',
      tone: 'service'
    }),
    'service.unknown': Object.freeze({
      title: 'Suara belum tersedia untuk kalimat ini',
      spoken: 'Aku pakai suara perangkat dulu.',
      silent: 'Aku belum berhasil membunyikan kalimat ini. Teksnya tetap bisa kamu baca, dan kamu boleh menekan Dengarkan lagi.',
      tone: 'service'
    })
  });

  /** Nada yang sama dengan `noteNoAudio()`: sebut penyebabnya, jangan tuduh murid. */
  var REASSURANCE = 'Item ini tidak dinilai dan tidak dikunci.';

  function entry(copyKey) {
    var key = String(copyKey || '').trim();
    return COPY[key] || COPY['service.unknown'];
  }

  function jakartaResetLabel(resetAt) {
    var ms = Number(resetAt || 0);
    if (!ms) return '';
    try {
      // Kuota murid reset 00:00 Asia/Jakarta (exec-e3-quota.md §3 butir 4). Labelnya dibaca
      // dari `resetAt` server, BUKAN dihitung dari jam perangkat: jam perangkat adalah lubang
      // manipulasi termurah yang sudah ditutup di sisi kuota, dan menghitungnya ulang di sini
      // akan membukanya kembali lewat pintu belakang tampilan.
      return new Date(ms).toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' });
    } catch (_) { return ''; }
  }

  /**
   * Menyusun pemberitahuan. Fungsi MURNI — tanpa DOM, tanpa jam, tanpa efek samping — supaya
   * gerbang bisa memeriksa naskahnya tanpa peramban.
   *
   * @param {string} copyKey kunci naskah dari server
   * @param {object} [options] `{spoken, layer, resetAt, retryAfter}`
   */
  function build(copyKey, options) {
    var opts = options || {};
    var e = entry(copyKey);
    var spoken = opts.spoken === true;
    var reset = jakartaResetLabel(opts.resetAt);
    var body = spoken ? e.spoken : e.silent;
    if (!spoken && reset && e.tone === 'quota') {
      body = body + ' Jatah berikutnya mulai jam ' + reset + ' WIB.';
    }
    return Object.freeze({
      schema: SCHEMA,
      copyKey: String(copyKey || 'service.unknown'),
      resolvedKey: COPY[String(copyKey || '').trim()] ? String(copyKey).trim() : 'service.unknown',
      tone: e.tone,
      spoken: spoken,
      // Lapisan yang akhirnya bersuara, untuk diagnostik: '' berarti tidak ada bunyi sama
      // sekali, selain itu nama lapisan yang dikirim pemanggil ('puter' | 'neural' |
      // 'fallback'). m025-231: nilai 'browser' DICORET dari kosakata ini bersama lapisan
      // speechSynthesis-nya. Tidak ada satu pun kode yang bisa memproduksinya lagi, dan
      // membiarkannya berdiri di daftar membuat pembaca diagnostik berikutnya percaya
      // masih ada cadangan peramban di bawah L3 — padahal di bawah L3 tinggal teks senyap.
      layer: String(opts.layer || ''),
      title: e.title,
      body: body,
      reassurance: REASSURANCE,
      // Selalu ada, dan selalu 'advisory'. Ia menandai bahwa pemberitahuan ini TIDAK BOLEH
      // mengubah state pelajaran: tidak mengunci item, tidak menghitung replay.
      severity: 'advisory',
      locksItem: false,
      countsReplay: false
    });
  }

  /**
   * Menyerahkan pemberitahuan ke UI yang ada. Tiga jalur, dari yang paling spesifik:
   *   1. `root.FiezelVoiceNoticeHost.show(notice)` — bila layar menyediakan tempatnya;
   *   2. CustomEvent `fiezel-voice-notice` — supaya app.js/addon bisa menangkapnya tanpa
   *      berkas ini perlu tahu apa pun tentang DOM mereka;
   *   3. `console.debug` — di gerbang dan di lingkungan tanpa DOM.
   * Selalu mengembalikan objek pemberitahuannya, dan TIDAK PERNAH melempar: sebuah
   * pemberitahuan yang gagal tampil tidak boleh mematikan kalimat yang sedang berbunyi.
   */
  function emit(copyKey, options) {
    var notice = build(copyKey, options);
    var host = root.FiezelVoiceNoticeHost;
    if (host && typeof host.show === 'function') {
      try { host.show(notice); return notice; } catch (_) {}
    }
    try {
      if (typeof root.CustomEvent === 'function' && root.dispatchEvent) {
        root.dispatchEvent(new root.CustomEvent(EVENT_NAME, { detail: notice }));
        return notice;
      }
    } catch (_) {}
    try { console.debug('[voice-notice]', notice.copyKey, notice.title, notice.body); } catch (_) {}
    return notice;
  }

  return Object.freeze({
    SCHEMA: SCHEMA,
    EVENT_NAME: EVENT_NAME,
    COPY_KEYS: Object.freeze(Object.keys(COPY)),
    REASSURANCE: REASSURANCE,
    build: build,
    emit: emit
  });
}));
