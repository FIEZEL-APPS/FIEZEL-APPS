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

  // i18n (AI-02 F01): naskah murid modul ini pindah ke features/i18n/copy-id-feat-a.js.
  // Di browser, fiezel-i18n.js + copy-map dimuat lebih dulu lewat urutan <script defer>
  // di index.html (AI-01 F02), jadi FiezelI18n dipakai langsung tanpa guard. Di Node
  // (tes print-only me-require modul ini), copy-map dimuat lewat require supaya nilai
  // 'id' tetap SATU sumber yang byte-identik dengan naskah beku gerbang emas.
  var I18N = (typeof FiezelI18n !== 'undefined') ? FiezelI18n
    : ((typeof module === 'object' && module.exports) ? require('../i18n/copy-id-feat-a.js') : null);
  function t(key, params) { return I18N.t(key, params); }

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
      findings.push(finding('build_unreadable', 'warn', t('health.build-unreadable-title'),
        t('health.build-unreadable-detail'),
        t('health.build-unreadable-remedy')));
    } else if (diag === shell) {
      findings.push(finding('build_current', 'ok', t('health.build-current-title'),
        t('health.build-current-detail', { build: diag }), ''));
    } else if (shell < diag) {
      // Inilah bentuk kegagalan yang paling menyesatkan: pengguna sudah menerima rilis baru,
      // tetapi yang tampil masih shell lama, sehingga perbaikan terlihat "tidak berpengaruh".
      findings.push(finding('shell_stale', 'blocker', t('health.shell-stale-title'),
        t('health.shell-stale-detail', { page: diag, shell: shell }),
        t('health.shell-stale-remedy')));
    } else {
      findings.push(finding('shell_ahead', 'warn', t('health.shell-ahead-title'),
        t('health.shell-ahead-detail', { shell: shell, page: diag }),
        t('health.shell-ahead-remedy')));
    }

    // 2. Keadaan service worker.
    var state = String(options.swState || '');
    if (!state) {
      findings.push(finding('sw_absent', 'warn', t('health.sw-absent-title'),
        t('health.sw-absent-detail'),
        t('health.sw-absent-remedy')));
    } else if (state !== 'activated') {
      findings.push(finding('sw_not_active', 'warn', t('health.sw-not-active-title'),
        t('health.sw-not-active-detail', { state: state }), t('health.sw-not-active-remedy')));
    } else if (options.controlled === false) {
      findings.push(finding('sw_uncontrolled', 'info', t('health.sw-uncontrolled-title'),
        t('health.sw-uncontrolled-detail'), t('health.sw-uncontrolled-remedy')));
    } else {
      findings.push(finding('sw_active', 'ok', t('health.sw-active-title'), t('health.sw-active-detail'), ''));
    }

    // 3. Pembaruan yang sudah diunduh tetapi tertahan.
    if (options.waitingWorker === true) {
      findings.push(finding('update_waiting', 'warn', t('health.update-waiting-title'),
        t('health.update-waiting-detail'),
        t('health.update-waiting-remedy')));
    }

    // 4. Ruang penyimpanan.
    var quota = Number(options.storageQuota);
    var usage = Number(options.storageUsage);
    if (isFinite(quota) && quota > 0 && isFinite(usage)) {
      var free = Math.max(0, quota - usage);
      var label = t('health.storage-free-label', { mb: Math.round(free / 1048576) });
      if (free <= CRITICAL_STORAGE_BYTES) {
        findings.push(finding('storage_critical', 'blocker', t('health.storage-critical-title'), label,
          t('health.storage-critical-remedy')));
      } else if (free <= LOW_STORAGE_BYTES) {
        findings.push(finding('storage_low', 'warn', t('health.storage-low-title'), label,
          t('health.storage-low-remedy')));
      } else {
        findings.push(finding('storage_ok', 'ok', t('health.storage-ok-title'), label, ''));
      }
    } else {
      findings.push(finding('storage_unknown', 'info', t('health.storage-unknown-title'),
        t('health.storage-unknown-detail'), ''));
    }

    // 5. Cache shell yang menumpuk dari rilis lama.
    var caches = Array.isArray(options.shellCaches) ? options.shellCaches : null;
    if (caches) {
      var shells = caches.filter(function (name) { return /^fiezel-shell-/.test(String(name)); });
      if (shells.length > 2) {
        findings.push(finding('shell_cache_buildup', 'warn', t('health.shell-cache-buildup-title'),
          t('health.shell-cache-buildup-detail', { count: shells.length }),
          t('health.shell-cache-buildup-remedy')));
      } else {
        findings.push(finding('shell_cache_ok', 'ok', t('health.shell-cache-ok-title'), t('health.shell-cache-ok-detail', { count: shells.length }), ''));
      }
    }

    // 6. Notifikasi - syarat pemakaian produk ini, jadi statusnya bagian dari kesehatan instalasi.
    var permission = String(options.notificationPermission || '');
    if (permission === 'granted') {
      findings.push(finding('notifications_ok', 'ok', t('health.notifications-ok-title'), t('health.notifications-ok-detail'), ''));
    } else if (permission === 'denied') {
      findings.push(finding('notifications_denied', 'blocker', t('health.notifications-denied-title'),
        t('health.notifications-denied-detail'),
        t('health.notifications-denied-remedy')));
    } else if (permission) {
      findings.push(finding('notifications_pending', 'warn', t('health.notifications-pending-title'),
        t('health.notifications-pending-detail', { permission: permission }), t('health.notifications-pending-remedy')));
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
