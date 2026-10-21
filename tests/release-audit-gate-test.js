// tests/release-audit-gate-test.js — gerbang yang MENJALANKAN `release-audit.py`.
//
// Kenapa berkas ini ada. Bab 32 mewajibkan `release-audit.py` tetap lulus, tetapi temuan
// yang dikonfirmasi tiga laporan (cf-a9 §8 Konflik 1, cf-b6:731-733, dan putusan
// reports/cf-c1-konsistensi.md K13) berbunyi: **ia tidak pernah dijalankan CI.**
// Buktinya bukan tafsiran — `.github/workflows/quality.yml` menyiapkan
// `actions/setup-python@v5` dengan `python-version: '3.12'` lalu tidak memakai satu step
// Python pun. Toolchain disiapkan, lalu ditinggalkan. Berkas ini menutup lubang itu dari
// sisi gerbang, dan `quality.yml` menutupnya dari sisi CI dengan step `python3 release-audit.py`
// yang berdiri sendiri (lihat reports/exec-e7-tests.md untuk alasan pemisahan step itu).
//
// KEJUJURAN YANG DIPAKSAKAN: kalau `python3` tidak ada di runner, gerbang ini **SKIP dengan
// pesan jujur** dan exit 0 — TAPI ia mencatat `skipped:true` di laporannya dan mencetak
// peringatan yang tidak bisa disalahartikan sebagai lulus. Yang dilarang keras adalah
// diam-diam hijau: gerbang yang bilang "PASS" padahal tidak menjalankan apa pun adalah
// kebohongan yang lebih mahal daripada gerbang merah (`tests/puter-popup-once-test.js:68-76`).
//
// Nol dependency, nol jaringan.
// KEADAAN SAAT GERBANG INI DITULIS (v5.19.0, branch exec/tests) — BACA SEBELUM MENGELUH:
// `release-audit.py` dijalankan sungguhan di worktree ini dan hasilnya **NOT READY**:
// 335 PASS, 3 FAIL. Ketiganya sudah ada SEBELUM gerbang ini, dan justru itu isi temuan K13 —
// audit rilis diwajibkan bab 32 tetapi tidak pernah dijalankan CI, jadi utangnya menumpuk
// tanpa terlihat. Blocker yang ada:
//   1. `Reading type diversity` (types=18)
//   2. `Reading template reuse` (max_reuse=23, ambang 5)
//   3. `Dedicated grammar quality audit` — SEBAB SUDAH DIPASTIKAN: `release-audit.py:249`
//      mengunci `runtimeQuestions==3225` sebagai angka mati, sementara bank grammar kini
//      punya 139 lesson × 25 mode = 3475. Audit grammar-nya sendiri hijau (28 PASS, 0 FAIL,
//      0 focusLeak, 0 duplikat lintas-lesson). Jadi yang salah adalah ekspektasinya, bukan
//      kontennya: angka itu harus DITURUNKAN dari jumlah lesson, bukan ditulis tangan.
//      Perbaikannya ada di release-audit.py — di luar lingkup paket kerja ini (hanya berkas
//      baru + satu perubahan workflow), jadi ia dilaporkan, bukan ditambal diam-diam.
// Artinya: begitu gerbang ini DAN step `python3 release-audit.py` terdaftar, pipeline menjadi
// MERAH sampai ketiga blocker itu dibereskan. Itu bukan kerusakan yang dibawa gerbang ini;
// itu kenyataan yang selama ini tidak terlihat. Jangan "perbaiki" dengan melunakkan ambang
// di sini — perbaiki kontennya, atau ambil keputusan sadar untuk menunda registrasi.
'use strict';
const __fzRoot = require('path').join(__dirname, '..'); /* m025-254: berkas ini pindah dari root ke tests/. __dirname dulu BERARTI root repo, dan puluhan gerbang memakainya untuk menunjuk berkas produksi - alias ini menjaga makna itu tetap benar tanpa menyunting setiap pemakaian. */

const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const crypto = require('crypto');

const root = __fzRoot;
const AUDIT = 'release-audit.py';
const AUDIT_REPORT = 'FINAL-AUDIT-REPORT.json';

const checks = [];
let failed = false;
let skipped = false;
const check = (name, ok, details) => {
  checks.push({ name, status: ok ? 'PASS' : 'FAIL', details: String(details) });
  if (!ok) failed = true;
};
const skip = (name, details) => { checks.push({ name, status: 'SKIP', details: String(details) }); skipped = true; };

/* ---------------------------------------------------------------------------------------
 * 1. Prasyarat statis — dicek TANPA python, jadi tetap punya gigi walau runner kosong
 * ------------------------------------------------------------------------------------- */
check(`${AUDIT} ada di repo`, fs.existsSync(path.join(root, AUDIT)), AUDIT);

const workflowPath = path.join(root, '.github/workflows/quality.yml');
const workflow = fs.readFileSync(workflowPath, 'utf8');
check('Gerbang ini terdaftar di quality.yml', workflow.includes('node tests/release-audit-gate-test.js'), 'quality.yml');
// K13 menuntut audit Python benar-benar berjalan di CI, bukan hanya lewat gerbang node ini:
// kalau gerbang ini kelak dilewati, step Python yang berdiri sendiri masih menahan.
check('quality.yml menjalankan release-audit.py sebagai step Python tersendiri (K13)',
  /python3?\s+release-audit\.py/.test(workflow), 'cari "python3 release-audit.py" di quality.yml');
check('quality.yml masih menyiapkan Python (setup-python), jadi step itu punya toolchain',
  /setup-python/.test(workflow), 'actions/setup-python');

/* ---------------------------------------------------------------------------------------
 * 2. Apakah python3 ada? Kalau tidak: SKIP jujur, bukan lulus palsu
 * ------------------------------------------------------------------------------------- */
function pythonBinary() {
  for (const candidate of ['python3', 'python']) {
    const probe = cp.spawnSync(candidate, ['-c', 'import sys;print(sys.version_info[0])'], { encoding: 'utf8' });
    if (probe.status === 0 && String(probe.stdout).trim() === '3') return candidate;
  }
  return null;
}
const python = pythonBinary();

const report = {
  schema: 'fiezel-release-audit-gate-v1',
  pass: false,
  skipped: false,
  python: python || null,
  audit: null,
  blockers: null,
  counts: { pass: 0, fail: 0, skip: 0 },
  checks
};

function finish(summaryLine) {
  report.pass = !failed;
  report.skipped = skipped;
  report.counts = {
    pass: checks.filter(c => c.status === 'PASS').length,
    fail: checks.filter(c => c.status === 'FAIL').length,
    skip: checks.filter(c => c.status === 'SKIP').length
  };
  fs.writeFileSync(path.join(root, 'RELEASE-AUDIT-GATE-REPORT.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
  console.log(summaryLine);
  if (failed) process.exitCode = 1;
}

if (!python) {
  skip('Menjalankan release-audit.py',
    'python3 TIDAK ADA di runner ini. Audit rilis TIDAK dijalankan, jadi tidak ada yang bisa disebut lulus.');
  finish('FIEZEL release-audit gate: SKIP — python3 tidak tersedia di runner. '
    + 'Gerbang ini TIDAK memverifikasi apa pun tentang isi audit rilis; jangan bacakan sebagai PASS. '
    + 'Pasang Python (quality.yml sudah punya setup-python@v5, python-version 3.12) lalu jalankan ulang.');
  // process.exit() dan bukan `return`: berkas ini juga harus lolos `node --check` sebagai
  // script biasa (step Syntax di quality.yml), dan return di tingkat atas ilegal di sana
  // (pola tests/placement-accuracy-test.js:96-98).
  process.exit(failed ? 1 : 0);
}

/* ---------------------------------------------------------------------------------------
 * 3. Pakai ulang laporan yang MEMBUKTIKAN dirinya segar, kalau ada
 * ------------------------------------------------------------------------------------- */
// `release-audit.py` memanggil belasan gerbang node sebagai subproses, jadi ia butuh menit.
// Di CI ia sudah dijalankan step `Release audit (Python)` sebelum blok Core validation, dan
// menjalankannya dua kali dalam satu job adalah pemborosan tanpa tambahan kebenaran. Tetapi
// "sudah dijalankan" TIDAK dipercaya dari sebuah env var saja: yang dipercaya adalah bukti
// isi. `release-audit.py` menulis `sha256` app.js ke dalam laporannya, jadi laporan yang
// cocok dengan app.js DAN VERSION.json saat ini memang lahir dari sumber yang sama. Kalau
// tidak cocok, gerbang ini menjalankan auditnya sendiri — tanpa bertanya.
function freshExistingReport() {
  if (process.env.FIEZEL_RELEASE_AUDIT_REPORT_FRESH !== '1') return null;
  try {
    const existing = JSON.parse(fs.readFileSync(path.join(root, AUDIT_REPORT), 'utf8'));
    const appSha = crypto.createHash('sha256').update(fs.readFileSync(path.join(root, 'app.js'))).digest('hex');
    const version = JSON.parse(fs.readFileSync(path.join(root, 'VERSION.json'), 'utf8')).version;
    if (existing.sha256 === appSha && existing.version === version) return existing;
    return null;
  } catch { return null; }
}

/* ---------------------------------------------------------------------------------------
 * 4. Jalankan auditnya sungguhan
 * ------------------------------------------------------------------------------------- */
// release-audit.py memanggil banyak gerbang node sebagai subproses, jadi ia lambat
// (menit, bukan detik). Batas waktu dipasang eksplisit supaya CI tidak menggantung
// selamanya, dan habisnya waktu dihitung GAGAL — bukan SKIP: audit yang tidak selesai
// pada anggaran waktunya adalah masalah nyata, bukan ketiadaan alat.
const TIMEOUT_MS = 30 * 60 * 1000;
const reused = freshExistingReport();
const started = Date.now();
const run = reused
  ? { status: reused.status === 'PASS' ? 0 : 1, stdout: JSON.stringify(reused), stderr: '', error: null }
  : cp.spawnSync(python, [path.join(root, AUDIT)], {
    cwd: root,
    encoding: 'utf8',
    timeout: TIMEOUT_MS,
    maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
  });
const durationMs = Date.now() - started;
report.reusedFreshReport = Boolean(reused);
check(reused
  ? 'Laporan audit dipakai ulang karena sha256 app.js + version cocok (audit dijalankan step Python di job yang sama)'
  : 'Audit rilis dijalankan sungguhan oleh gerbang ini', true, reused ? 'reuse terverifikasi isi' : python);

if (run.error && run.error.code === 'ETIMEDOUT') {
  check(`${AUDIT} selesai dalam ${TIMEOUT_MS / 60000} menit`, false, 'ETIMEDOUT setelah ' + durationMs + ' ms');
  finish('FIEZEL release-audit gate: FAIL — audit rilis tidak selesai pada batas waktu.');
  process.exit(1);
}
if (run.error) {
  check(`${AUDIT} bisa dijalankan`, false, String(run.error.message));
  finish('FIEZEL release-audit gate: FAIL — audit rilis tidak bisa dijalankan.');
  process.exit(1);
}

const stdout = String(run.stdout || '');
const stderr = String(run.stderr || '');
check(`${AUDIT} tidak crash (traceback = kegagalan alat, bukan temuan)`,
  !/Traceback \(most recent call last\)/.test(stderr), stderr.trim().slice(-600) || 'stderr kosong');

/* ---------------------------------------------------------------------------------------
 * 4. Blockers = jumlah check FAIL di dalam laporan audit. > 0 → gerbang merah.
 * ------------------------------------------------------------------------------------- */
// Angka dibaca dari SUMBER (laporan yang baru saja ditulis auditnya sendiri), bukan
// ditebak dari exit code saja — supaya nama setiap blocker ikut terbawa ke laporan gerbang
// dan fixer tidak perlu menjalankan ulang audit lima menit hanya untuk tahu apa yang merah.
let audit = null;
try { audit = JSON.parse(fs.readFileSync(path.join(root, AUDIT_REPORT), 'utf8')); }
catch (error) {
  try { audit = JSON.parse(stdout.slice(stdout.indexOf('{'))); } catch { audit = null; }
}
check(`${AUDIT_REPORT} terbaca setelah audit dijalankan`, audit !== null, audit ? 'ok' : 'tidak bisa di-parse');

if (audit) {
  const auditChecks = Array.isArray(audit.checks) ? audit.checks : [];
  const blockers = auditChecks.filter(c => c.status !== 'PASS');
  report.audit = { version: audit.version, status: audit.status, counts: audit.counts };
  report.blockers = blockers.map(b => ({ name: b.name, details: typeof b.details === 'string' ? b.details.slice(0, 400) : b.details }));

  check('Audit rilis melaporkan check dalam jumlah wajar (bukan laporan kosong)',
    auditChecks.length >= 50, `checks=${auditChecks.length}`);
  check('Blockers audit rilis = 0', blockers.length === 0,
    blockers.length ? blockers.slice(0, 12).map(b => b.name).join(' | ') + (blockers.length > 12 ? ` (+${blockers.length - 12} lagi)` : '') : '0');
  check('Status audit rilis = PASS', audit.status === 'PASS', `status=${audit.status}`);
  // Exit code dan isi laporan harus SEPAKAT. Kalau tidak, salah satunya bohong dan itu
  // sendiri adalah temuan.
  check('Exit code audit sepakat dengan isi laporannya',
    (run.status === 0) === (blockers.length === 0), `exit=${run.status} blockers=${blockers.length}`);
} else {
  check('Blockers audit rilis = 0', false, 'laporan tidak terbaca, jadi jumlah blocker tidak diketahui');
}

check(`${AUDIT} exit 0`, run.status === 0, `exit=${run.status}`);
report.durationMs = durationMs;

finish(failed
  ? `FIEZEL release-audit gate: FAIL (${checks.filter(c => c.status === 'FAIL').length} assert merah, ${Math.round(durationMs / 1000)} s)`
  : `FIEZEL release-audit gate: PASS (audit rilis dijalankan sungguhan, 0 blocker, ${Math.round(durationMs / 1000)} s)`);
