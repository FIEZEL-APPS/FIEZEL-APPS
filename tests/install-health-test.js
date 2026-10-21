/**
 * FIEZEL R6 gate — install/update health check.
 *
 * Nilai pemeriksaan ini terletak pada satu kasus: build baru sudah diterima perangkat, tetapi
 * yang berjalan masih shell lama, sehingga perbaikan apa pun terlihat "tidak berpengaruh".
 * Itu persis situasi yang pernah membuat rilis m025-51 sulit dinilai. Gate ini memastikan
 * kasus itu terdeteksi dan disebut namanya, bukan lewat begitu saja.
 */
const assert = require('assert');
const health = require('../features/health/fiezel-install-health.js');

let failures = 0;
const tests = [];
function test(name, fn) { tests.push([name, fn]); }

const NOW = Date.parse('2026-08-20T09:00:00Z');
const MB = 1048576;

function evaluate(over) {
  return health.evaluateHealth(Object.assign({
    diagBuild: 'm025-60', swRev: 'm025-60-backup-restore-ui-20260820-1',
    swState: 'activated', waitingWorker: false, controlled: true,
    storageQuota: 500 * MB, storageUsage: 100 * MB,
    shellCaches: ['fiezel-shell-m025-60-backup-restore-ui-20260820-1', 'fiezel-v5.23.0'],
    notificationPermission: 'granted', now: NOW
  }, over || {}));
}
function byId(report, id) { return report.findings.find(f => f.id === id); }

test('now wajib diisi', () => {
  assert.throws(() => health.evaluateHealth({ diagBuild: 'm025-60' }), /now wajib diisi/);
});

test('instalasi sehat dilaporkan sehat, tanpa peringatan karangan', () => {
  const report = evaluate();
  assert.strictEqual(report.schema, 'fiezel-install-health-v1');
  assert.strictEqual(report.status, 'healthy');
  assert.strictEqual(report.worstSeverity, 'ok');
  assert.ok(report.findings.every(f => f.severity === 'ok'));
});

test('shell lama yang masih dipakai adalah blocker, bukan catatan kecil', () => {
  // Kasus inti: halaman sudah m025-60, service worker masih memegang shell m025-57. Tanpa ini,
  // perbaikan yang sudah dirilis akan terlihat gagal padahal belum pernah benar-benar berjalan.
  const report = evaluate({ swRev: 'm025-57-academic-readiness-20260820-1' });
  const f = byId(report, 'shell_stale');
  assert.ok(f, 'shell basi harus terdeteksi');
  assert.strictEqual(f.severity, 'blocker');
  assert.strictEqual(report.status, 'blocked');
  assert.ok(/m025-60/.test(f.detail) && /m025-57/.test(f.detail), 'kedua nomor disebut');
  assert.ok(/tutup fiezel/i.test(f.remedy), 'ada langkah nyata, bukan hanya keluhan');
});

test('shell lebih baru dari halaman ditangani berbeda dari shell basi', () => {
  const report = evaluate({ swRev: 'm025-61-sesuatu-20260820-1' });
  assert.ok(byId(report, 'shell_ahead'));
  assert.strictEqual(byId(report, 'shell_ahead').severity, 'warn');
  assert.strictEqual(byId(report, 'shell_stale'), undefined);
});

test('penanda build yang tidak terbaca dilaporkan, bukan dianggap cocok', () => {
  const report = evaluate({ swRev: 'revisi-tanpa-format' });
  assert.ok(byId(report, 'build_unreadable'));
  assert.strictEqual(byId(report, 'build_current'), undefined);
  assert.strictEqual(health.buildNumber('m025-60'), 60);
  assert.strictEqual(health.buildNumber('tanpa-nomor'), null);
});

test('pembaruan yang tertahan disebut, karena pengguna tidak bisa menebaknya', () => {
  const report = evaluate({ waitingWorker: true });
  const f = byId(report, 'update_waiting');
  assert.ok(f);
  assert.strictEqual(f.severity, 'warn');
  assert.ok(/tutup fiezel/i.test(f.remedy));
});

test('service worker tidak aktif atau tidak ada dibedakan', () => {
  assert.strictEqual(byId(evaluate({ swState: '' }), 'sw_absent').severity, 'warn');
  assert.strictEqual(byId(evaluate({ swState: 'installing' }), 'sw_not_active').severity, 'warn');
  assert.strictEqual(byId(evaluate({ controlled: false }), 'sw_uncontrolled').severity, 'info',
    'pemuatan pertama bukan kerusakan');
});

test('ruang penyimpanan menipis dan hampir habis dibedakan', () => {
  const menipis = evaluate({ storageQuota: 500 * MB, storageUsage: 460 * MB });
  assert.strictEqual(byId(menipis, 'storage_low').severity, 'warn');
  assert.strictEqual(menipis.status, 'degraded');
  const habis = evaluate({ storageQuota: 500 * MB, storageUsage: 495 * MB });
  assert.strictEqual(byId(habis, 'storage_critical').severity, 'blocker');
  assert.ok(/hapus aset suara/i.test(byId(habis, 'storage_critical').remedy));
});

test('kuota yang tidak terbaca tidak dilaporkan sebagai masalah', () => {
  const report = evaluate({ storageQuota: null, storageUsage: null });
  assert.strictEqual(byId(report, 'storage_unknown').severity, 'info');
  assert.strictEqual(report.status, 'healthy', 'ketiadaan API bukan kerusakan instalasi');
});

test('cache shell yang menumpuk terdeteksi', () => {
  const report = evaluate({
    shellCaches: ['fiezel-shell-m025-57-x', 'fiezel-shell-m025-58-x', 'fiezel-shell-m025-59-x', 'fiezel-shell-m025-60-x', 'fiezel-v5.23.0']
  });
  const f = byId(report, 'shell_cache_buildup');
  assert.ok(f);
  assert.ok(/4 shell/.test(f.detail), 'cache runtime tidak ikut dihitung sebagai shell');
});

test('notifikasi yang ditolak adalah blocker, karena produk ini mewajibkannya', () => {
  const report = evaluate({ notificationPermission: 'denied' });
  assert.strictEqual(byId(report, 'notifications_denied').severity, 'blocker');
  assert.strictEqual(report.status, 'blocked');
  assert.strictEqual(byId(evaluate({ notificationPermission: 'default' }), 'notifications_pending').severity, 'warn');
});

test('setiap temuan yang bukan ok membawa langkah yang bisa dikerjakan', () => {
  const laporan = [
    evaluate({ swRev: 'm025-57-x' }), evaluate({ waitingWorker: true }),
    evaluate({ storageQuota: 500 * MB, storageUsage: 495 * MB }), evaluate({ notificationPermission: 'denied' }),
    evaluate({ swState: '' })
  ];
  for (const report of laporan) {
    for (const f of report.findings) {
      if (f.severity === 'ok' || f.severity === 'info') continue;
      assert.ok(f.remedy && f.remedy.length > 10, `${f.id} tidak menyebutkan apa yang harus dilakukan`);
    }
  }
});

test('laporan tidak memuat riwayat jawaban atau isi belajar', () => {
  const dump = JSON.stringify(evaluate());
  assert.ok(!/selectedAnswer|history|vocab|grammar|reading/i.test(dump.replace(/rawHistoryIncluded/g, '')));
  const report = evaluate();
  assert.strictEqual(report.privacy.rawAnswersIncluded, false);
  assert.strictEqual(report.privacy.learningContentIncluded, false);
});

test('pembacaan lingkungan tidak pernah melempar meski API tidak ada', async () => {
  const kosong = await health.readEnvironment({}, { diagBuild: 'm025-60', swRev: 'm025-60-x' });
  assert.strictEqual(kosong.swState, '');
  assert.strictEqual(kosong.storageQuota, null);
  assert.strictEqual(kosong.diagBuild, 'm025-60');
  const rusak = await health.readEnvironment({
    navigator: {
      serviceWorker: { get controller() { throw new Error('ditolak'); }, getRegistration() { throw new Error('ditolak'); } },
      storage: { estimate() { return Promise.reject(new Error('ditolak')); } }
    },
    caches: { keys() { return Promise.reject(new Error('ditolak')); } },
    Notification: { get permission() { throw new Error('ditolak'); } }
  }, {});
  assert.strictEqual(rusak.shellCaches, null);
  assert.strictEqual(rusak.notificationPermission, '');
});

test('lingkungan yang sehat terbaca apa adanya', async () => {
  const env = {
    navigator: {
      serviceWorker: { controller: {}, getRegistration: async () => ({ active: { state: 'activated' }, waiting: null }) },
      storage: { estimate: async () => ({ quota: 400 * MB, usage: 120 * MB }) }
    },
    caches: { keys: async () => ['fiezel-shell-m025-60-x'] },
    Notification: { permission: 'granted' }
  };
  const read = await health.readEnvironment(env, { diagBuild: 'm025-60', swRev: 'm025-60-x' });
  assert.strictEqual(read.swState, 'activated');
  assert.strictEqual(read.controlled, true);
  assert.strictEqual(read.storageQuota, 400 * MB);
  assert.deepStrictEqual(read.shellCaches, ['fiezel-shell-m025-60-x']);
  const report = health.evaluateHealth(Object.assign({}, read, { now: NOW }));
  assert.strictEqual(report.status, 'healthy');
});

test('penanda build halaman tidak boleh basi terhadap DIAG_BUILD', () => {
  // Health check membandingkan build halaman dengan shell yang dipegang service worker.
  // Kalau penanda halaman ini tertinggal, pemeriksaannya akan melaporkan shell basi yang
  // sebenarnya tidak ada - peringatan palsu lebih buruk daripada tidak ada peringatan.
  const fs = require('fs');
  const config = fs.readFileSync('./core-config.js', 'utf8');
  const diag = fs.readFileSync('./features/neural-voice/fiezel-diag-panel.js', 'utf8');
  const pageBuild = /FIEZEL_PAGE_BUILD\s*=\s*'([^']+)'/.exec(config);
  const diagBuild = /DIAG_BUILD\s*=\s*'([^']+)'/.exec(diag);
  assert.ok(pageBuild && diagBuild, 'kedua penanda harus tetap terbaca');
  assert.strictEqual(pageBuild[1], diagBuild[1],
    `core-config menyebut ${pageBuild && pageBuild[1]}, diag panel menyebut ${diagBuild && diagBuild[1]}`);
});

test('service worker menjawab revisi shell-nya sendiri', () => {
  // Menebak revisi dari nama cache tidak cukup: cache lama bisa tertinggal, sedangkan jawaban
  // ini datang dari worker yang benar-benar melayani halaman.
  const sw = require('fs').readFileSync('./sw.js', 'utf8');
  assert.ok(/FIEZEL_HEALTH_PING/.test(sw), 'service worker harus menerima ping health check');
  assert.ok(/FIEZEL_HEALTH_PONG/.test(sw));
  assert.ok(/event\.ports\s*&&\s*event\.ports\[0\]/.test(sw), 'balasan lewat port yang dikirim halaman');
  const swRev = /const SW_REV='([^']+)'/.exec(sw);
  const diagBuild = /DIAG_BUILD\s*=\s*'([^']+)'/.exec(require('fs').readFileSync('./features/neural-voice/fiezel-diag-panel.js', 'utf8'));
  assert.ok(swRev[1].startsWith(diagBuild[1] + '-'), 'SW_REV membawa build yang sama dengan halaman');
});

(async () => {
  for (const [name, fn] of tests) {
    try { await fn(); console.log('ok - ' + name); }
    catch (e) { failures++; console.error('FAIL - ' + name + '\n    ' + e.message); }
  }
  console.log('');
  if (failures) { console.error('FIEZEL install health: FAIL (' + failures + ')'); process.exit(1); }
  console.log('FIEZEL install health: PASS');
})();
