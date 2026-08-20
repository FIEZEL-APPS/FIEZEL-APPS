/**
 * FIEZEL R6 — Install and update health check.
 *
 * Menjawab satu pertanyaan yang selama ini hanya bisa ditebak: apakah aplikasi yang sedang
 * dijalankan benar-benar versi yang sudah dirilis, atau shell lama yang masih dipegang
 * service worker.
 *
 * Ini bukan pertanyaan teoretis di produk ini. Rilis m025-51 pernah dinyatakan gagal oleh
 * pengguna, dan pertanyaan pertama yang harus dijawab saat itu adalah "apakah build barunya
 * benar-benar aktif di perangkat itu" - tanpa pemeriksaan seperti ini, jawabannya tebakan.
 *
 * PURE dan DETERMINISTIC: seluruh keadaan lingkungan masuk lewat parameter. Pembacaan
 * lingkungan yang sebenarnya (service worker, storage) dipisah ke fungsi async tersendiri
 * supaya penilaiannya bisa diuji tanpa browser.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FiezelInstallHealth = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var SCHEMA = 'fiezel-install-health-v1';
  // Di bawah ambang ini, aset neural dan bank soal bisa gagal tersimpan tanpa pesan yang jelas.
  var LOW_STORAGE_BYTES = 60 * 1024 * 1024;
  var CRITICAL_STORAGE_BYTES = 20 * 1024 * 1024;

  var SEVERITY_ORDER = { ok: 0, info: 1, warn: 2, blocker: 3 };

  function finding(id, severity, label, detail, remedy) {
    return { id: id, severity: severity, label: label, detail: detail, remedy: remedy || '' };
  }

  function buildNumber(marker) {
    var match = /m025-(\d+)/.exec(String(marker || ''));
    return match ? Number(match[1]) : null;
  }

  /**
   * Penilaian kesehatan instalasi.
   *
   * @param {{diagBuild?:string, swRev?:string, swState?:string, waitingWorker?:boolean,
   *          controlled?:boolean, storageQuota?:number, storageUsage?:number,
   *          shellCaches?:string[], notificationPermission?:string, now:number}} input
   */
  function evaluateHealth(input) {
    var options = input || {};
    var now = Number(options.now);
    if (!isFinite(now)) throw new Error('evaluateHealth: now wajib diisi (deterministic)');

    var findings = [];
    var diag = buildNumber(options.diagBuild);
    var shell = buildNumber(options.swRev);

    // 1. Build yang berjalan vs shell yang dipegang service worker.
    if (diag == null || shell == null) {
      findings.push(finding('build_unreadable', 'warn', 'Penanda build tidak terbaca',
        'Salah satu dari Diagnostics build atau revisi service worker tidak mengikuti format m025-N.',
        'Buka Diagnostics dan salin ringkasannya saat melapor.'));
    } else if (diag === shell) {
      findings.push(finding('build_current', 'ok', 'Build aktif dan shell cocok',
        'Aplikasi berjalan pada m025-' + diag + ', dan service worker memegang shell yang sama.', ''));
    } else if (shell < diag) {
      // Inilah bentuk kegagalan yang paling menyesatkan: pengguna sudah menerima rilis baru,
      // tetapi yang tampil masih shell lama, sehingga perbaikan terlihat "tidak berpengaruh".
      findings.push(finding('shell_stale', 'blocker', 'Shell lama masih dipakai',
        'Aplikasi memuat m025-' + diag + ', tetapi service worker masih memegang shell m025-' + shell + '.',
        'Tutup FIEZEL sepenuhnya lalu buka lagi. Kalau masih sama, jalankan pembaruan dari Diagnostics.'));
    } else {
      findings.push(finding('shell_ahead', 'warn', 'Shell lebih baru dari halaman',
        'Service worker memegang m025-' + shell + ' sementara halaman ini masih m025-' + diag + '.',
        'Muat ulang halaman untuk memakai versi terbaru.'));
    }

    // 2. Keadaan service worker.
    var state = String(options.swState || '');
    if (!state) {
      findings.push(finding('sw_absent', 'warn', 'Service worker tidak terdaftar',
        'Mode offline dan pembaruan otomatis tidak aktif tanpa service worker.',
        'Pasang FIEZEL ke layar utama, lalu buka dari sana.'));
    } else if (state !== 'activated') {
      findings.push(finding('sw_not_active', 'warn', 'Service worker belum aktif',
        'Statusnya sekarang "' + state + '".', 'Tunggu beberapa detik lalu muat ulang.'));
    } else if (options.controlled === false) {
      findings.push(finding('sw_uncontrolled', 'info', 'Halaman belum dikendalikan service worker',
        'Ini normal pada pemuatan pertama setelah pemasangan.', 'Muat ulang sekali untuk mengaktifkan mode offline.'));
    } else {
      findings.push(finding('sw_active', 'ok', 'Service worker aktif', 'Mode offline dan pembaruan berjalan.', ''));
    }

    // 3. Pembaruan yang sudah diunduh tetapi tertahan.
    if (options.waitingWorker === true) {
      findings.push(finding('update_waiting', 'warn', 'Pembaruan siap tetapi tertahan',
        'Versi baru sudah diunduh dan menunggu semua tab FIEZEL ditutup.',
        'Tutup FIEZEL sepenuhnya, lalu buka lagi.'));
    }

    // 4. Ruang penyimpanan.
    var quota = Number(options.storageQuota);
    var usage = Number(options.storageUsage);
    if (isFinite(quota) && quota > 0 && isFinite(usage)) {
      var free = Math.max(0, quota - usage);
      var label = Math.round(free / 1048576) + ' MB tersisa';
      if (free <= CRITICAL_STORAGE_BYTES) {
        findings.push(finding('storage_critical', 'blocker', 'Ruang penyimpanan hampir habis', label,
          'Hapus aset suara dari Diagnostics atau kosongkan ruang di perangkat sebelum melanjutkan.'));
      } else if (free <= LOW_STORAGE_BYTES) {
        findings.push(finding('storage_low', 'warn', 'Ruang penyimpanan menipis', label,
          'Aset suara berukuran besar bisa gagal tersimpan. Kosongkan sebagian ruang.'));
      } else {
        findings.push(finding('storage_ok', 'ok', 'Ruang penyimpanan cukup', label, ''));
      }
    } else {
      findings.push(finding('storage_unknown', 'info', 'Ruang penyimpanan tidak terbaca',
        'Perangkat ini tidak melaporkan kuota penyimpanan.', ''));
    }

    // 5. Cache shell yang menumpuk dari rilis lama.
    var caches = Array.isArray(options.shellCaches) ? options.shellCaches : null;
    if (caches) {
      var shells = caches.filter(function (name) { return /^fiezel-shell-/.test(String(name)); });
      if (shells.length > 2) {
        findings.push(finding('shell_cache_buildup', 'warn', 'Cache shell lama menumpuk',
          shells.length + ' shell tersimpan sekaligus.',
          'Jalankan pembaruan dari Diagnostics supaya shell lama dibersihkan.'));
      } else {
        findings.push(finding('shell_cache_ok', 'ok', 'Cache shell rapi', shells.length + ' shell tersimpan.', ''));
      }
    }

    // 6. Notifikasi - syarat pemakaian produk ini, jadi statusnya bagian dari kesehatan instalasi.
    var permission = String(options.notificationPermission || '');
    if (permission === 'granted') {
      findings.push(finding('notifications_ok', 'ok', 'Notifikasi aktif', 'Pengingat belajar dapat berjalan.', ''));
    } else if (permission === 'denied') {
      findings.push(finding('notifications_denied', 'blocker', 'Notifikasi ditolak',
        'FIEZEL mewajibkan notifikasi, dan izinnya sedang ditolak.',
        'Aktifkan notifikasi untuk FIEZEL di pengaturan perangkat.'));
    } else if (permission) {
      findings.push(finding('notifications_pending', 'warn', 'Notifikasi belum diizinkan',
        'Izin notifikasi masih "' + permission + '".', 'Izinkan notifikasi saat diminta.'));
    }

    var worst = findings.reduce(function (acc, f) {
      return SEVERITY_ORDER[f.severity] > SEVERITY_ORDER[acc] ? f.severity : acc;
    }, 'ok');

    return {
      schema: SCHEMA,
      generatedAt: new Date(now).toISOString(),
      status: worst === 'ok' ? 'healthy' : worst === 'info' ? 'healthy' : worst === 'warn' ? 'degraded' : 'blocked',
      worstSeverity: worst,
      diagBuild: options.diagBuild ? String(options.diagBuild) : null,
      swRev: options.swRev ? String(options.swRev) : null,
      findings: findings,
      // Observability tanpa riwayat jawaban: laporan ini hanya memuat keadaan instalasi.
      privacy: { rawAnswersIncluded: false, rawHistoryIncluded: false, learningContentIncluded: false }
    };
  }

  /**
   * Membaca keadaan lingkungan sebenarnya. Setiap pembacaan dibungkus supaya satu API yang
   * tidak tersedia tidak menggagalkan seluruh pemeriksaan.
   */
  async function readEnvironment(env, expected) {
    var target = env || (typeof globalThis !== 'undefined' ? globalThis : {});
    var out = {
      diagBuild: (expected && expected.diagBuild) || null,
      swRev: (expected && expected.swRev) || null,
      swState: '', waitingWorker: false, controlled: false,
      storageQuota: null, storageUsage: null, shellCaches: null,
      notificationPermission: ''
    };
    try {
      var container = target.navigator && target.navigator.serviceWorker;
      if (container) {
        out.controlled = !!container.controller;
        var registration = await container.getRegistration();
        if (registration) {
          out.swState = String((registration.active && registration.active.state) || '');
          out.waitingWorker = !!registration.waiting;
        }
      }
    } catch (_) { /* dibiarkan kosong: ketiadaan API bukan kegagalan pemeriksaan */ }
    try {
      var manager = target.navigator && target.navigator.storage;
      if (manager && typeof manager.estimate === 'function') {
        var estimate = await manager.estimate();
        out.storageQuota = Number(estimate && estimate.quota) || null;
        out.storageUsage = Number(estimate && estimate.usage) || null;
      }
    } catch (_) { /* sama */ }
    try {
      if (target.caches && typeof target.caches.keys === 'function') out.shellCaches = await target.caches.keys();
    } catch (_) { /* sama */ }
    try {
      out.notificationPermission = String((target.Notification && target.Notification.permission) || '');
    } catch (_) { /* sama */ }
    return out;
  }

  return {
    SCHEMA: SCHEMA,
    LOW_STORAGE_BYTES: LOW_STORAGE_BYTES,
    CRITICAL_STORAGE_BYTES: CRITICAL_STORAGE_BYTES,
    buildNumber: buildNumber,
    evaluateHealth: evaluateHealth,
    readEnvironment: readEnvironment
  };
});
