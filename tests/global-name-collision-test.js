#!/usr/bin/env node
/**
 * GERBANG NAMA GLOBAL (tests/global-name-collision-test.js) — T-031
 *
 * ==========================================================================
 * KENAPA BERKAS INI ADA
 * ==========================================================================
 * `features/ui/fiezel-ab-testing.js` memasang objek A/B testing sebagai
 * `window.FiezelAnalytics` — nama yang dimiliki modul analytics
 * privasi-maksimal `features/analytics/fiezel-analytics-client.js`. Karena
 * berkas A/B dimuat `<script defer>` dari index.html, nama itu SELALU sudah
 * terisi sebelum pemuat analytics di app.js berjalan di idle. Pemuat lama
 * mempercayai nama yang sudah ada, menerima objek A/B, gagal cek bentuk, dan
 * modul analytics ASLI tidak pernah diunduh. Hasil terukur di produksi:
 * `stats()` = {loaded:false,started:true,lastError:'module_shape',gateOpen:true},
 * nol permintaan ke /api/usage, dan NOL galat merah di konsol — analytics murid
 * mati total dan senyap sementara semua flag hijau.
 *
 * Kelas cacatnya BUKAN "satu berkas memakai satu nama salah". Kelas cacatnya
 * adalah: DUA subsistem berbeda boleh berbagi satu nama global dan tidak ada
 * alat yang menolaknya. Karena itu gerbang ini tidak memeriksa satu berkas; ia
 * MEMINDAI SELURUH SUMBER yang dilacak git dan menuntut satu pemilik per nama.
 *
 * ==========================================================================
 * KENAPA PEMINDAIAN, BUKAN DAFTAR TANGAN
 * ==========================================================================
 * Daftar tangan basi begitu berkas baru lahir — pola yang sudah tiga kali
 * menyakiti repo ini dalam satu hari (gerbang lupa didaftarkan, pemanggil lupa
 * ditandai, nama global lupa dipisah). Yang dipindai di sini adalah PENUGASAN
 * (`window.X=`, `self.X=`, `globalThis.X=`, `root.X=`, `var X=`, `X=` di lingkup
 * global), ditemukan dari isi berkas, bukan dari daftar nama berkas. Berkas baru
 * yang merebut nama akan merah pada commit pertamanya.
 *
 * PENGECUALIAN dibuat berbasis POLA, bukan nama berkas: berkas gerbang
 * (`*-test.js`/`*-audit.js`/`*-selftest.js`) memang SENGAJA memasang objek asing
 * ke nama global untuk menyimulasikan tabrakan; melarangnya berarti melarang
 * pembuktian. Dokumen (.md) juga bukan sumber yang dieksekusi.
 *
 * ==========================================================================
 * YANG DI-ASSERT
 * ==========================================================================
 *  (N1) NOL berkas sumber selain modul analytics menugaskan `FiezelAnalytics`.
 *  (N2) Modul analytics MEMANG menugaskannya (anti-vakum: pemindai yang tidak
 *       menemukan apa pun akan hijau selamanya, dan itu bukan bukti).
 *  (N3) Pemindainya terbukti hidup: string sintetis yang berisi penugasan
 *       tertangkap, dan sebutan non-penugasan (`window.FiezelAnalytics?.track`)
 *       TIDAK tertangkap.
 *  (N4) Modul A/B memakai nama sendiri (`FiezelABAnalytics`) dan pemiliknya
 *       tunggal.
 *  (N5) `features/ui/fiezel-ui-manager.js` memanggil nama BARU, dan nol
 *       sebutan nama lama.
 *  (N6) Kunci penyimpanan A/B (`fiezel_ab_events`) TIDAK berganti nama —
 *       pergantian nama global tidak boleh membuang event murid yang sudah ada.
 *  (N7) Pemuat app.js tidak lagi memakai pola "percayai global apa adanya",
 *       memeriksa bentuk, dan LANJUT memuat saat bentuk salah.
 *  (N8) Gerbang ini terdaftar di quality.yml.
 *
 * Nol jaringan, nol dependency, nol berkas temporer selain laporannya sendiri.
 */
'use strict';
const __fzRoot = require('path').join(__dirname, '..'); /* m025-254: berkas ini pindah dari root ke tests/. __dirname dulu BERARTI root repo, dan puluhan gerbang memakainya untuk menunjuk berkas produksi - alias ini menjaga makna itu tetap benar tanpa menyunting setiap pemakaian. */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __fzRoot;
const ANALYTICS_MODULE = 'features/analytics/fiezel-analytics-client.js';
const AB_MODULE = 'features/ui/fiezel-ab-testing.js';
const UI_MANAGER = 'features/ui/fiezel-ui-manager.js';

const checks = [];
let failed = false;
const check = (name, ok, details) => {
  checks.push({ name, status: ok ? 'PASS' : 'FAIL', details: String(details === undefined ? '' : details) });
  if (!ok) failed = true;
};

const stripComments = src => src
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|[^:\\])\/\/[^\n]*/g, '$1 ')
  .replace(/<!--[\s\S]*?-->/g, ' ');

/* =======================================================================================
 * POLA PENUGASAN — inti gerbang ini
 * =====================================================================================
 * Yang dicari: nama global BERADA DI SISI KIRI sebuah penugasan. Bentuk yang dihitung:
 *   window.X = / self.X = / globalThis.X = / root.X = / this.X =
 *   window['X'] = (dan varian kutip tunggal/ganda)
 *   var|let|const X =            (deklarasi di berkas non-modul = properti global)
 *   X = ...                      (penugasan telanjang di lingkup global)
 * Yang TIDAK dihitung (dan diuji di N3 supaya tetap begitu): pembacaan/pemanggilan
 * (`window.X.track(...)`, `X?.foo()`), perbandingan (`=== X`, `X ==`), dan `X =>`.
 */
function assignmentPattern(name) {
  const n = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(
    '(?:'
    + `(?:window|self|globalThis|root|this)\\s*\\.\\s*${n}\\s*=(?!=)`
    + '|'
    + `(?:window|self|globalThis|root|this)\\s*\\[\\s*['"\`]${n}['"\`]\\s*\\]\\s*=(?!=)`
    + '|'
    + `\\b(?:var|let|const)\\s+${n}\\b\\s*=(?!=)`
    + '|'
    + `(?:^|[;{}\\n])\\s*${n}\\s*=(?!=|>)`
    + ')',
    'm'
  );
}

function assignmentHits(name, src) {
  const re = assignmentPattern(name);
  const hits = [];
  const lines = stripComments(src).split('\n');
  for (let i = 0; i < lines.length; i++) {
    // Cocokkan per baris supaya nomor barisnya bisa dilaporkan; pola `^` per baris
    // dijaga oleh flag 'm' di atas.
    if (re.test(lines[i])) hits.push(`${i + 1}: ${lines[i].trim().slice(0, 120)}`);
  }
  return hits;
}

/* Berkas gerbang SENGAJA menyimulasikan tabrakan; dokumen tidak dieksekusi.
 * Pengecualian berbasis POLA, bukan daftar nama. */
const GATE_FILE_RE = /(?:-test|-audit|-selftest|-simulation(?:-v\d+)?)\.(?:js|mjs|cjs)$/;
const SOURCE_RE = /\.(?:js|mjs|cjs|html)$/;
const SKIP_DIR_RE = /^(?:vendor|node_modules|ecohero-quest|website|deploy|audit|docs|analysis|reports|tools|coordination)\//;

const tracked = execFileSync('git', ['ls-files'], { cwd: ROOT, encoding: 'utf8' })
  .split('\n').map(s => s.trim()).filter(Boolean);

const sourceFiles = tracked
  .filter(f => SOURCE_RE.test(f))
  .filter(f => !GATE_FILE_RE.test(f))
  .filter(f => !SKIP_DIR_RE.test(f))
  .sort();

check('Ada sumber yang dipindai (pemindaian tidak vakum)', sourceFiles.length > 20, String(sourceFiles.length));

/* =======================================================================================
 * (N1)+(N2) SATU PEMILIK PER NAMA GLOBAL
 * ===================================================================================== */
const OWNERS = [
  { name: 'FiezelAnalytics', owner: ANALYTICS_MODULE, arti: 'modul analytics privasi-maksimal' },
  { name: 'FiezelABAnalytics', owner: AB_MODULE, arti: 'pipa eksperimen A/B UI' }
];

for (const { name, owner, arti } of OWNERS) {
  const penugas = [];
  for (const f of sourceFiles) {
    const src = fs.readFileSync(path.join(ROOT, f), 'utf8');
    const hits = assignmentHits(name, src);
    if (hits.length) penugas.push({ file: f, hits });
  }
  const luar = penugas.filter(p => p.file !== owner);
  check(
    `(N1) NOL berkas selain \`${owner}\` menugaskan \`${name}\` (${arti})`,
    luar.length === 0,
    luar.map(p => `${p.file} -> ${p.hits.join(' | ')}`).join(' ;; ') || 'nol'
  );
  check(
    `(N2) Pemiliknya MEMANG menugaskan \`${name}\` (anti-vakum)`,
    penugas.some(p => p.file === owner),
    penugas.map(p => p.file).join(',') || 'nol'
  );
}

/* =======================================================================================
 * (N3) PEMINDAI TERBUKTI HIDUP DAN TIDAK ASAL TANGKAP
 * ===================================================================================== */
{
  const harusKena = [
    "window.FiezelAnalytics = new FiezelABAnalytics();",
    "self.FiezelAnalytics=api;",
    "globalThis.FiezelAnalytics = {};",
    "window['FiezelAnalytics'] = x;",
    "  FiezelAnalytics = buatSesuatu();",
    "var FiezelAnalytics = require('x');"
  ];
  const harusLolos = [
    "window.FiezelAnalytics?.track(payload);",
    "if (self.FiezelAnalytics) return resolve(self.FiezelAnalytics);",
    "check('x', sandbox.FiezelAnalytics === FiezelAnalytics);",
    "const ok = typeof FiezelAnalytics.createClient === 'function';",
    "const f = FiezelAnalytics => FiezelAnalytics;"
  ];
  const kenaSemua = harusKena.filter(s => assignmentHits('FiezelAnalytics', s).length === 0);
  const lolosSemua = harusLolos.filter(s => assignmentHits('FiezelAnalytics', s).length > 0);
  check('(N3) Pemindai menangkap setiap bentuk penugasan sintetis', kenaSemua.length === 0, kenaSemua.join(' | '));
  check('(N3) Pemindai TIDAK menangkap pembacaan/perbandingan', lolosSemua.length === 0, lolosSemua.join(' | '));
}

/* =======================================================================================
 * (N4)+(N5)+(N6) MODUL A/B DAN PEMAKAINYA
 * ===================================================================================== */
{
  const ab = fs.readFileSync(path.join(ROOT, AB_MODULE), 'utf8');
  const abCode = stripComments(ab);
  check('(N4) Modul A/B memasang `window.FiezelABAnalytics`',
    /window\.FiezelABAnalytics\s*=/.test(abCode), 'ab');
  check('(N4) Modul A/B nol sebutan `FiezelAnalytics` di kode (hanya boleh di komentar)',
    !/\bFiezelAnalytics\b/.test(abCode), (abCode.match(/\bFiezelAnalytics\b/g) || []).join(','));
  check('(N6) Kunci penyimpanan A/B `fiezel_ab_events` tidak berganti nama (data murid utuh)',
    abCode.includes("'fiezel_ab_events'"), 'EVENTS_LOG');
  check('(N4) Modul A/B punya `track()` (pemanggil UI tidak lagi memanggil metode hantu)',
    /\btrack\s*\(/.test(abCode) && /^\s{2}track\s*\(/m.test(abCode), 'track');

  const ui = fs.readFileSync(path.join(ROOT, UI_MANAGER), 'utf8');
  const uiCode = stripComments(ui);
  check('(N5) `fiezel-ui-manager.js` memanggil `FiezelABAnalytics`',
    /window\.FiezelABAnalytics\b/.test(uiCode), 'ui-manager');
  check('(N5) `fiezel-ui-manager.js` NOL sebutan `FiezelAnalytics` di kode',
    !/\bFiezelAnalytics\b/.test(uiCode), (uiCode.match(/\bFiezelAnalytics\b/g) || []).join(','));
  check('(N5) Pemanggil memeriksa bentuk sebelum memakai global',
    /typeof\s+ab\.track\s*===\s*'function'/.test(uiCode), 'shape-check');
}

/* =======================================================================================
 * (N7) PEMUAT app.js TIDAK MEMPERCAYAI GLOBAL
 * ===================================================================================== */
{
  const appSrc = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
  const appCode = stripComments(appSrc);
  check('(N7) Pola lama "percayai global apa adanya" sudah tidak ada',
    !/if\s*\(\s*self\.FiezelAnalytics\s*\)\s*return\s+resolve\s*\(\s*self\.FiezelAnalytics\s*\)/.test(appCode),
    'pola lama');
  check('(N7) Pemuat memeriksa bentuk lewat penjaga khusus (`anIsModule`)',
    /function\s+anIsModule\s*\(/.test(appCode) && /typeof\s+o\.createClient\s*===\s*'function'/.test(appCode),
    'anIsModule');
  check('(N7) Pemuat memakai slot patok khas miliknya sendiri',
    /const\s+AN_PINNED\s*=\s*'__fiezelAnalyticsModule'/.test(appCode), 'AN_PINNED');
  check('(N7) Kode galat dibedakan per sebab (nol pemakaian `module_shape` lama)',
    appCode.includes('global_name_conflict') && appCode.includes('module_shape_invalid')
    && appCode.includes('client_shape_invalid') && !/'module_shape'/.test(appCode),
    'kode galat');
  check('(N7) `stats()` melaporkan `nameConflict` (tabrakan yang sudah dipulihkan tetap terlihat)',
    /nameConflict\s*:\s*anNameConflict/.test(appCode), 'stats');
  // Blok dipotong dari sumber MENTAH (penanda BEGIN/END adalah komentar, jadi memotongnya
  // dari sumber yang sudah dibuang komentarnya akan memotong seluruh berkas).
  const iAwal = appSrc.indexOf('/* A1-ANALYTICS-EMITTER-BEGIN');
  const iAkhir = appSrc.indexOf('/* A1-ANALYTICS-EMITTER-END */');
  check('(N7) Blok pemancar ditemukan lewat penanda BEGIN/END', iAwal > 0 && iAkhir > iAwal, `${iAwal}/${iAkhir}`);
  const blokKode = stripComments(appSrc.slice(Math.max(iAwal, 0), iAkhir > iAwal ? iAkhir : appSrc.length));
  check('(N7) Pemuat tetap nol `await` (fire-and-forget tidak berubah)',
    iAkhir > iAwal && !/\bawait\b/.test(blokKode), 'nol await');
}

/* =======================================================================================
 * (N8) TERDAFTAR DI CI
 * ===================================================================================== */
{
  const wf = fs.readFileSync(path.join(ROOT, '.github', 'workflows', 'quality.yml'), 'utf8');
  check('(N8) Gerbang ini terdaftar di quality.yml',
    wf.includes('node tests/global-name-collision-test.js'), 'quality.yml');
}

/* ===================================================================================== */
const summary = {
  gate: 'global-name-collision-test',
  scannedFiles: sourceFiles.length,
  owners: OWNERS.map(o => ({ name: o.name, owner: o.owner })),
  generatedAt: '2026-08-28T00:00:00.000Z',
  total: checks.length,
  passed: checks.filter(c => c.status === 'PASS').length,
  failed: checks.filter(c => c.status === 'FAIL').length,
  pass: !failed,
  checks
};
fs.writeFileSync(path.join(ROOT, 'GLOBAL-NAME-COLLISION-REPORT.json'), JSON.stringify(summary, null, 2) + '\n');
for (const c of checks) {
  if (c.status === 'PASS') console.log(`PASS  ${c.name}`);
  else console.log(`FAIL  ${c.name} — ${c.details}`);
}
console.log(`\n${summary.passed}/${summary.total} PASS · GLOBAL-NAME-COLLISION-REPORT.json`);
process.exit(failed ? 1 : 0);
