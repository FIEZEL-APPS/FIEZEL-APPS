// cf-transport-test.js — kontrak transport untuk migrasi Cloudflare.
//
// Empat kebenaran yang dijaga berkas ini:
//   (1) Sakelar CF baru di `core-config.js` (`self.FIEZEL_CF_CONFIG`) ada, berbentuk benar,
//       dan SELURUH nilainya default OFF. Main auto-deploy ke fiezel.my.id tiap ≤5 menit
//       tanpa gerbang CI di antaranya (putusan K12 reports/cf-c1-konsistensi.md), jadi flag
//       yang default ON berarti murid mendapat fitur setengah jadi dalam lima menit.
//   (2) `workerUrl` LAMA tidak diubah. `remote-push-test.js:6` mengunci field itu ke regex
//       `^https://[a-z0-9-]+\.puter\.work$`; mengarahkannya ke domain Cloudflare akan
//       membuat gerbang push merah dan memutus jalur pengingat yang sudah jalan. Sakelar CF
//       WAJIB memakai field BARU (`baseUrl`), bukan menimpa yang lama.
//   (3) Tidak ada URL Cloudflare hardcode di `app.js`. Satu-satunya sumber alamat CF adalah
//       `FIEZEL_CF_CONFIG.baseUrl` — kalau alamat tersebar di kode produk, mematikan CF
//       tidak lagi bisa dilakukan dengan satu sakelar.
//   (4) Ada jalur rollback yang bisa ditunjuk (`fallbackToPuter`), bukan sekadar niat.
//
// STATUS HARI INI DAN CARA MENGAKTIFKANNYA (untuk MASTER saat merge):
// Sakelar `FIEZEL_CF_CONFIG` ditulis oleh paket kerja LAIN (cf-b1 §5.3, PHASE C). Selama ia
// belum ada di `core-config.js`, blok (1) dan (4) berstatus **SKIP** dan gerbang ini
// **exit 0** — dengan pesan "belum terpasang" yang eksplisit, bukan hijau yang menyesatkan.
// Blok (2) dan (3) berjalan penuh HARI INI karena tidak bergantung pada flag baru.
// >>> MASTER: setelah paket flag CF di-merge, ubah `REQUIRE_CF_FLAGS` di bawah menjadi
// >>> `true`. Sejak saat itu ketiadaan flag = FAIL, dan gerbang ini menjadi pagar penuh.
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = __dirname;
// MASTER: jadikan `true` sesudah paket flag CF di-merge (lihat header).
const REQUIRE_CF_FLAGS = false;

const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const checks = [];
let failed = false;
let skipped = false;
const check = (name, ok, details) => {
  checks.push({ name, status: ok ? 'PASS' : 'FAIL', details: String(details) });
  if (!ok) failed = true;
};
const skip = (name, details) => { checks.push({ name, status: 'SKIP', details: String(details) }); skipped = true; };
// Buang komentar sebelum memindai (pola audio-asset-pipeline-test.js:290-292), supaya
// penjelasan di dalam kode tidak ikut dihukum.
const stripComments = src => src
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|[^:\\])\/\/[^\n]*/g, '$1 ');

const config = read('core-config.js');
const app = read('app.js');
const appCode = stripComments(app);
const remotePush = read('remote-push-test.js');
const workflow = read('.github/workflows/quality.yml');

check('Gerbang ini terdaftar di quality.yml', workflow.includes('node cf-transport-test.js'), 'quality.yml');

/* =======================================================================================
 * (2) `workerUrl` lama TIDAK boleh berubah — invarian remote-push-test.js:6
 * ===================================================================================== */
// Regex-nya DIAMBIL DARI SUMBER gerbang tetangga, bukan ditulis ulang di sini. Kalau
// remote-push-test.js suatu hari mengubah polanya, gerbang ini ikut berubah — bukan
// menyimpan salinan basi yang lolos sendirian.
const lockedPatternText = (remotePush.match(/\/\^https:\\\/\\\/\[[^\]]*\]\+\\\.puter\\\.work\$\/i/) || [])[0];
check('Regex kunci `*.puter.work` bisa diekstrak dari remote-push-test.js (bukan disalin)',
  Boolean(lockedPatternText), lockedPatternText || 'tidak ditemukan');

const workerUrl = (config.match(/workerUrl:'([^']*)'/) || [])[1];
const deploymentState = (config.match(/deploymentState:'([^']*)'/) || [])[1];
check('core-config.js masih punya field workerUrl dan deploymentState', workerUrl !== undefined && deploymentState !== undefined,
  `workerUrl=${workerUrl} deploymentState=${deploymentState}`);

if (lockedPatternText && workerUrl !== undefined) {
  // eslint-disable-next-line no-new-func -- regex literal dari sumber, bukan input luar
  const lockedPattern = vm.runInNewContext(lockedPatternText);
  const valid = (workerUrl === '' && deploymentState === 'unconfigured')
    || (lockedPattern.test(workerUrl) && deploymentState === 'validated');
  check('workerUrl lama tetap lolos kunci remote-push-test.js:6 (tidak dialihkan ke Cloudflare)',
    valid, `workerUrl=${workerUrl} deploymentState=${deploymentState}`);
  check('workerUrl tidak menunjuk domain Cloudflare',
    !/workers\.dev|pages\.dev|cloudflare|r2\.cloudflarestorage/i.test(String(workerUrl)), String(workerUrl));
}

/* =======================================================================================
 * (3) Tidak ada URL Cloudflare hardcode di app.js
 * ===================================================================================== */
const CF_HARDCODE = [
  /https?:\/\/[a-z0-9-]+\.workers\.dev/gi,
  /https?:\/\/[a-z0-9-]+\.pages\.dev/gi,
  /https?:\/\/[a-z0-9-]+\.r2\.cloudflarestorage\.com/gi,
  /https?:\/\/api\.fiezel\.my\.id/gi,
  /https?:\/\/[a-z0-9.-]*cloudflare[a-z0-9.-]*/gi
];
const hardcoded = [];
for (const pattern of CF_HARDCODE) {
  const found = appCode.match(pattern);
  if (found) hardcoded.push(...found);
}
check('Tidak ada URL Cloudflare hardcode di app.js (alamat hanya boleh dari FIEZEL_CF_CONFIG.baseUrl)',
  hardcoded.length === 0, hardcoded.join(', ') || '0');
// Berkas produk lain di jalur transport ikut dijaga: sekali satu alamat lolos ke sw.js,
// mematikan CF dari core-config.js tidak lagi cukup.
const swCode = stripComments(read('sw.js'));
const swHardcoded = CF_HARDCODE.flatMap(p => swCode.match(p) || []);
check('Tidak ada URL Cloudflare hardcode di sw.js', swHardcoded.length === 0, swHardcoded.join(', ') || '0');

/* =======================================================================================
 * (1) + (4) Sakelar CF baru: struktur, default OFF, dan jalur rollback
 * ===================================================================================== */
const hasCfFlags = /self\.FIEZEL_CF_CONFIG\s*=/.test(config);

if (!hasCfFlags) {
  const message = 'FIEZEL_CF_CONFIG BELUM TERPASANG di core-config.js. '
    + 'Sakelar CF ditulis paket kerja lain (cf-b1 §5.3, PHASE C); gerbang ini tidak memverifikasi '
    + 'struktur flag, nilai default, maupun jalur rollback. Jangan bacakan sebagai bukti bahwa flag CF aman.';
  skip('Struktur FIEZEL_CF_CONFIG', message);
  skip('Semua nilai flag CF default OFF', message);
  skip('Jalur rollback CF ada dan hidup', message);
} else {
  // Sakelar dievaluasi SUNGGUHAN di dalam vm (pola core-worker-contract-test.js:12) agar
  // yang di-assert adalah NILAI, bukan teks yang kebetulan cocok regex.
  const sandbox = { self: {}, Object, console };
  sandbox.self.self = sandbox.self;
  let cf = null;
  try {
    vm.createContext(sandbox);
    vm.runInContext(config, sandbox, { filename: 'core-config.js' });
    cf = sandbox.self.FIEZEL_CF_CONFIG || null;
  } catch (error) {
    check('core-config.js bisa dievaluasi di vm', false, error.message);
  }
  // Gagal ekstraksi = FAIL, bukan SKIP (puter-popup-once-test.js:68-76): flag yang ada
  // tapi tidak bisa dibaca adalah keadaan paling berbahaya dari ketiganya.
  check('FIEZEL_CF_CONFIG bisa dibaca sebagai objek', cf !== null && typeof cf === 'object', typeof cf);

  if (cf && typeof cf === 'object') {
    check('FIEZEL_CF_CONFIG dibekukan (Object.freeze) seperti FIEZEL_CORE_CONFIG',
      Object.isFrozen(cf), String(Object.isFrozen(cf)));
    check('FIEZEL_CF_CONFIG punya field yang dijanjikan cf-b1 §5.3',
      ['baseUrl', 'routes', 'fallbackToPuter'].every(k => k in cf), Object.keys(cf).join(', '));
    check('FIEZEL_CF_CONFIG memakai field BARU dan tidak menyentuh workerUrl',
      !('workerUrl' in cf), Object.keys(cf).join(', '));

    const routes = cf.routes && typeof cf.routes === 'object' ? cf.routes : {};
    const routeEntries = Object.entries(routes);
    const enabledRoutes = routeEntries.filter(([, mode]) => String(mode) !== 'puter');
    const sampleRate = Number(cf.shadowSampleRate || 0);
    const booleansOn = Object.entries(cf).filter(([key, value]) =>
      value === true && !/^fallback/i.test(key));

    check('routes berisi peta endpoint (bukan kosong)', routeEntries.length > 0, `routes=${routeEntries.length}`);
    check('SEMUA route default "puter" — nol endpoint dialihkan ke CF',
      enabledRoutes.length === 0, enabledRoutes.map(([k, v]) => `${k}=${v}`).join(', ') || '0');
    check('shadowSampleRate default 0 (mode bayangan pun mati)', sampleRate === 0, String(cf.shadowSampleRate));
    check('Tidak ada bendera boolean lain yang default true selain jalur rollback',
      booleansOn.length === 0, booleansOn.map(([k]) => k).join(', ') || '0');
    check('baseUrl kosong ATAU seluruh route masih "puter" (CF tidak bisa hidup diam-diam)',
      String(cf.baseUrl || '') === '' || enabledRoutes.length === 0, `baseUrl=${cf.baseUrl}`);
    check('baseUrl, kalau diisi, https dan di bawah fiezel.my.id',
      String(cf.baseUrl || '') === '' || /^https:\/\/[a-z0-9-]+\.fiezel\.my\.id$/i.test(String(cf.baseUrl)), String(cf.baseUrl));

    /* ---- (4) rollback ---------------------------------------------------------------- */
    // `fallbackToPuter:true` adalah jalur rollback per-request (cf-b1 §5.4): kegagalan CF
    // jatuh kembali ke Puter tanpa deploy. Ia HARUS true, dan app.js harus benar-benar
    // membacanya — flag rollback yang tidak dibaca siapa pun bukan rollback.
    check('Jalur rollback: fallbackToPuter === true', cf.fallbackToPuter === true, String(cf.fallbackToPuter));
    check('Jalur rollback dibaca app.js (bukan flag mati)',
      /fallbackToPuter/.test(appCode), 'cari fallbackToPuter di app.js');
    check('app.js membaca alamat CF hanya dari FIEZEL_CF_CONFIG',
      !/FIEZEL_CF_CONFIG/.test(appCode) ? false : /FIEZEL_CF_CONFIG[\s\S]{0,200}?baseUrl/.test(appCode),
      'cari FIEZEL_CF_CONFIG…baseUrl di app.js');
    // Sakelar statis di core-config.js di-cache service worker (`sw.js`), jadi ia BUKAN kill
    // switch instan — putusan cf-b6:16-20. Assert ini menjaga agar kenyataan itu tercatat di
    // repo, bukan hanya di laporan yang tidak dibaca saat insiden.
    check('Batas sakelar statis didokumentasikan di core-config.js (bukan diklaim kill switch instan)',
      /kill switch|bukan kill switch|cache service worker|sw\.js/i.test(config), 'komentar di core-config.js');
  }
}

/* ===================================================================================== */
const report = {
  schema: 'fiezel-cf-transport-v1',
  pass: !failed,
  skipped,
  cfFlagsInstalled: hasCfFlags,
  requireCfFlags: REQUIRE_CF_FLAGS,
  counts: {
    pass: checks.filter(c => c.status === 'PASS').length,
    fail: checks.filter(c => c.status === 'FAIL').length,
    skip: checks.filter(c => c.status === 'SKIP').length
  },
  checks
};

// Kalau MASTER sudah menyalakan REQUIRE_CF_FLAGS, ketiadaan flag berhenti menjadi SKIP dan
// menjadi kegagalan — itu satu-satunya perbedaan perilakunya.
if (REQUIRE_CF_FLAGS && !hasCfFlags) {
  report.pass = false;
  report.checks.push({ name: 'FIEZEL_CF_CONFIG wajib ada (REQUIRE_CF_FLAGS aktif)', status: 'FAIL', details: 'core-config.js' });
  report.counts.fail += 1;
  failed = true;
}

fs.writeFileSync(path.join(root, 'CF-TRANSPORT-REPORT.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (failed) {
  console.log(`FIEZEL cf-transport gate: FAIL (${report.counts.fail} assert merah)`);
  process.exitCode = 1;
} else if (skipped) {
  console.log(`FIEZEL cf-transport gate: SKIP SEBAGIAN — ${report.counts.pass} assert lolos, `
    + `${report.counts.skip} di-SKIP karena FIEZEL_CF_CONFIG belum terpasang di core-config.js. `
    + 'Kunci workerUrl dan larangan URL Cloudflare hardcode SUDAH ditegakkan; struktur flag dan '
    + 'rollback BELUM diverifikasi. MASTER: nyalakan REQUIRE_CF_FLAGS setelah paket flag CF di-merge.');
} else {
  console.log(`FIEZEL cf-transport gate: PASS (${report.counts.pass} assert)`);
}
