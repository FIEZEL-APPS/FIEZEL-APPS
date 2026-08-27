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
//       WAJIB memakai field BARU (`base`), bukan menimpa yang lama.
//   (3) Tidak ada URL Cloudflare hardcode di `app.js`. Satu-satunya sumber alamat CF adalah
//       `FIEZEL_CF_CONFIG.base` — kalau alamat tersebar di kode produk, mematikan CF
//       tidak lagi bisa dilakukan dengan satu sakelar.
//   (4) Ada jalur rollback yang bisa ditunjuk (`enabled:false` mematikan SELURUH jalur CF),
//       bukan sekadar niat.
//
// STATUS: PAGAR PENUH (W1, paket flag CF sudah terpasang).
// `REQUIRE_CF_FLAGS` sekarang `true`: ketiadaan `self.FIEZEL_CF_CONFIG` = FAIL, dan tiga
// assert yang dulu berstatus SKIP (`Struktur FIEZEL_CF_CONFIG`, `Semua nilai flag CF default
// OFF`, `Jalur rollback CF ada dan hidup`) BERJALAN SUNGGUHAN atas nilai hasil evaluasi vm.
//
// BENTUK FLAG YANG DIJAGA — dan mengapa berbeda dari draf cf-b1 §5.3: draf itu menulis
// `{baseUrl, routes:{path:'puter'|'cf'|'cf-shadow'}, fallbackToPuter, shadowSampleRate}`.
// Yang mengikat sekarang adalah kosakata `'off'|'shadow'|'on'` per ENDPOINT dari
// `reports/cf-b6-migration-plan.md` (pola P1) + `docs/CF-MIGRATION-RUNBOOK.md` (Bagian 4.6,
// tabel tiga status dan kill switch `GET /api/config`), yaitu:
//   `{enabled:false, base:'', endpoints:{health,config,auth,quota,ai,tts,usage}}`.
// Jaminan yang dijaga TIDAK dilonggarkan — hanya nama fieldnya yang mengikuti kosakata yang
// dipakai runbook operasional, supaya orang yang memutar flag saat insiden membaca kata yang
// sama di repo, di runbook, dan di `GET /api/config`.
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = __dirname;
// AKTIF sejak paket flag CF (W1) terpasang: ketiadaan flag = FAIL, bukan SKIP.
const REQUIRE_CF_FLAGS = true;

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
check('Tidak ada URL Cloudflare hardcode di app.js (alamat hanya boleh dari FIEZEL_CF_CONFIG.base)',
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
    const MODES = new Set(['off', 'shadow', 'on']);
    const REQUIRED_ENDPOINTS = ['health', 'config', 'auth', 'quota', 'ai', 'tts', 'usage'];
    const endpoints = cf.endpoints && typeof cf.endpoints === 'object' ? cf.endpoints : {};
    const endpointEntries = Object.entries(endpoints);
    const missingEndpoints = REQUIRED_ENDPOINTS.filter(k => !(k in endpoints));
    const badModes = endpointEntries.filter(([, mode]) => !MODES.has(String(mode)));
    const liveEndpoints = endpointEntries.filter(([, mode]) => String(mode) !== 'off');
    const booleansOn = Object.entries(cf).filter(([, value]) => value === true);

    /* ---- (1a) STRUKTUR — assert yang dulu SKIP, kini berjalan atas NILAI -------------- */
    const strukturDetail = `keys=${Object.keys(cf).join('|')} endpoints=${endpointEntries.map(([k, v]) => k + '=' + v).join(',')}`;
    const strukturOk = ['enabled', 'base', 'endpoints'].every(k => k in cf)
      && typeof cf.enabled === 'boolean'
      && typeof cf.base === 'string'
      && !('workerUrl' in cf)
      && Object.isFrozen(cf)
      && Object.isFrozen(endpoints)
      && missingEndpoints.length === 0
      && badModes.length === 0;
    check('Struktur FIEZEL_CF_CONFIG', strukturOk, strukturDetail);
    // Pecahan di bawah bukan pengulangan: kalau assert gabungan di atas merah, inilah yang
    // memberi tahu bagian MANA yang salah tanpa harus membaca kode gerbang.
    check('FIEZEL_CF_CONFIG dibekukan (Object.freeze) seperti FIEZEL_CORE_CONFIG',
      Object.isFrozen(cf) && Object.isFrozen(endpoints),
      `cf=${Object.isFrozen(cf)} endpoints=${Object.isFrozen(endpoints)}`);
    check('FIEZEL_CF_CONFIG memakai field BARU dan tidak menyentuh workerUrl',
      !('workerUrl' in cf), Object.keys(cf).join(', '));
    check('endpoints memuat tujuh sakelar yang dijanjikan (health/config/auth/quota/ai/tts/usage)',
      missingEndpoints.length === 0, missingEndpoints.join(', ') || 'lengkap');
    check('setiap endpoint bernilai "off" | "shadow" | "on" (kosakata cf-b6 P1)',
      badModes.length === 0, badModes.map(([k, v]) => `${k}=${v}`).join(', ') || '0');

    /* ---- (1b) DEFAULT OFF — assert yang dulu SKIP ------------------------------------- */
    // main auto-deploy ke fiezel.my.id tiap ≤5 menit tanpa gerbang di antaranya (K12), jadi
    // "default off" bukan gaya penulisan: ia yang membuat push ini aman untuk murid.
    const defaultOff = cf.enabled === false
      && String(cf.base || '') === ''
      && liveEndpoints.length === 0
      && booleansOn.length === 0;
    check('Semua nilai flag CF default OFF', defaultOff,
      `enabled=${cf.enabled} base="${cf.base}" hidup=${liveEndpoints.map(([k, v]) => k + '=' + v).join(',') || '0'}`);
    check('enabled === false (sakelar induk mati)', cf.enabled === false, String(cf.enabled));
    check('base kosong — alamat CF belum diaktifkan (api.fiezel.my.id menunggu nameserver)',
      String(cf.base || '') === '', `base="${cf.base}"`);
    check('NOL endpoint bernilai shadow/on', liveEndpoints.length === 0,
      liveEndpoints.map(([k, v]) => `${k}=${v}`).join(', ') || '0');
    check('Tidak ada bendera boolean yang default true', booleansOn.length === 0,
      booleansOn.map(([k]) => k).join(', ') || '0');
    check('base, kalau diisi, https dan di bawah fiezel.my.id (bukan workers.dev)',
      String(cf.base || '') === '' || /^https:\/\/[a-z0-9-]+\.fiezel\.my\.id$/i.test(String(cf.base)), String(cf.base));

    /* ---- (4) ROLLBACK — assert yang dulu SKIP ----------------------------------------- */
    // Rollback klien = SATU nilai: `enabled:false` mematikan seluruh jalur CF walau setiap
    // endpoint bernilai 'on'. Ia hanya nyata kalau app.js benar-benar membacanya sebagai
    // syarat WAJIB, bukan sebagai catatan. Buktinya perilaku diuji cf-shadow-mode-test.js (d);
    // di sini yang dijaga adalah keberadaan syarat itu di sumber produk.
    const readsEnabled = /CF_CONFIG\.enabled\s*===\s*true/.test(appCode);
    const gateBeforeMode = /CF_ENABLED[\s\S]{0,200}?return\s*'off'/.test(appCode);
    check('Jalur rollback CF ada dan hidup', readsEnabled && gateBeforeMode,
      `enabled dibaca app.js=${readsEnabled} gerbang mode=${gateBeforeMode}`);
    check('Rollback satu nilai dibaca app.js (bukan flag mati)', readsEnabled,
      'cari CF_CONFIG.enabled===true di app.js');
    check('Mode endpoint dikunci di belakang sakelar induk (enabled:false ⇒ selalu off)',
      gateBeforeMode, 'cari CF_ENABLED … return \'off\' di app.js');
    check('Gerbang perilaku shadow/off terdaftar di quality.yml (bukan hanya pemeriksaan teks)',
      workflow.includes('node cf-shadow-mode-test.js'), 'quality.yml');
    check('app.js membaca alamat CF hanya dari FIEZEL_CF_CONFIG',
      !/FIEZEL_CF_CONFIG/.test(appCode) ? false : /FIEZEL_CF_CONFIG[\s\S]{0,200}?\.base\b/.test(appCode),
      'cari FIEZEL_CF_CONFIG…base di app.js');
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
