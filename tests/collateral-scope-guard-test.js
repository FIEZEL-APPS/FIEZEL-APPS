'use strict';
/**
 * tests/collateral-scope-guard-test.js
 *
 * GERBANG UJI PENJAGA ANTI-SENGGOL LINTAS-DOMAIN (A10 Collateral Scope Guard)
 *
 * Membuktikan secara deterministik (positif DAN negatif) bahwa `tools/fiezel-guardians.mjs a10`:
 *  1. MELOLOSKAN PR fitur biasa (mis. `fix(grammar): ...`) beserta bump-build standar
 *     (`SW_REV`, `BUILD-VERSION.json`, `core-config.js`, `fiezel-diag-panel.js`, `call.html`,
 *     serta pendaftaran tes baru di `quality.yml`).
 *  2. MEMBLOKIR KERAS (exit != 0) PR `fix(grammar): ...` yang diam-diam menyentuh fungsi
 *     `authGateNeeded` / `isLocalTestServer` di `app.js` atau `features/auth/*`.
 *  3. MEMBLOKIR KERAS PR `feat(quiz): ...` yang menyentuh `website/manifest.json` atau `manifest.json`.
 *  4. MEMBLOKIR KERAS PR `fix(vocab): ...` yang menghapus gerbang tes dari `quality.yml` atau
 *     mengubah workflow penjaga CI tanpa otorisasi `ci` / `[ALLOW-PROTECTED: ci]`.
 *  5. TIDAK TERTIPU oleh kata "auth" atau "pwa" di dalam teks deskripsi PR (prose), tetapi
 *     menerima scope resmi `fix(auth): ...` atau token eksplisit `[ALLOW-PROTECTED: auth]`.
 *  6. MEMBLOKIR penghapusan massal (> 500 baris runtime) tanpa scope `refactor`/`cleanup` atau `[ALLOW-MASS-DELETE]`.
 */
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const GUARDIAN = path.join(ROOT, 'tools', 'fiezel-guardians.mjs');

let passed = 0;
let failed = 0;

function runA10Fixture({ title, body = '', commits = '', files, diff }) {
  const tmpFile = path.join(os.tmpdir(), `fz-a10-fixture-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}.diff`);
  fs.writeFileSync(tmpFile, diff, 'utf8');
  try {
    return spawnSync(process.execPath, [GUARDIAN, 'a10'], {
      cwd: ROOT,
      encoding: 'utf8',
      env: {
        ...process.env,
        PR_TITLE: title,
        PR_BODY: body,
        FIEZEL_GUARD_COMMITS: commits || title,
        FIEZEL_GUARD_FILES: files.join('\n'),
        FIEZEL_GUARD_DIFF_FILE: tmpFile
      }
    });
  } finally {
    try { fs.unlinkSync(tmpFile); } catch (_) {}
  }
}

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`[PASS] ${name}`);
  } catch (err) {
    failed++;
    console.error(`[FAIL] ${name}: ${err.message}`);
  }
}

test('G1 PR grammar + bump-build standar + pendaftaran tes baru di quality.yml -> LULUS (exit 0)', () => {
  const res = runA10Fixture({
    title: 'fix(grammar): perbaiki penjelasan partikel wa vs ga (m025-728)',
    body: 'Sudah diverifikasi auth dan PWA tetap aman.',
    files: [
      'app.js',
      'tests/grammar-wa-ga-test.js',
      '.github/workflows/quality.yml',
      'coordination/BUILD-VERSION.json',
      'sw.js',
      'core-config.js',
      'features/neural-voice/fiezel-diag-panel.js',
      'call.html'
    ],
    diff: [
      'diff --git a/app.js b/app.js',
      '--- a/app.js',
      '+++ b/app.js',
      '@@ -6200,1 +6200,2 @@ function buildGrammarLessonQuestions(skill){',
      '-  const tip = "";',
      '+  const tip = skill.ruleSummary || "";',
      'diff --git a/sw.js b/sw.js',
      '--- a/sw.js',
      '+++ b/sw.js',
      '@@ -1,1 +1,1 @@',
      "-const SW_REV='m025-727-shell';",
      "+const SW_REV='m025-728-shell';",
      'diff --git a/.github/workflows/quality.yml b/.github/workflows/quality.yml',
      '--- a/.github/workflows/quality.yml',
      '+++ b/.github/workflows/quality.yml',
      '@@ -618,0 +619,1 @@',
      '+          node tests/grammar-wa-ga-test.js'
    ].join('\n')
  });
  assert.strictEqual(res.status, 0, `Seharusnya exit 0, keluar ${res.status}:\n${res.stdout}\n${res.stderr}`);
});

test('G2 PR grammar yang diam-diam menyentuh authGateNeeded di app.js -> DIBLOKIR (exit 1)', () => {
  const res = runA10Fixture({
    title: 'fix(grammar): perbaiki latihan tata bahasa G-02',
    body: 'Sekalian bypass auth supaya mudah dites.',
    files: ['app.js', 'tests/grammar-test.js'],
    diff: [
      'diff --git a/app.js b/app.js',
      '--- a/app.js',
      '+++ b/app.js',
      '@@ -9376,2 +9376,2 @@ function authGateNeeded(){',
      '-  if(teacherPreviewActive())return false;',
      '+  return false;'
    ].join('\n')
  });
  assert.strictEqual(res.status, 1, 'Harus memblokir sentuhan gelap ke authGateNeeded');
  assert.ok(res.stdout.includes('COLLATERAL_AUTH_TOUCH'), `Pesan harus menyebut COLLATERAL_AUTH_TOUCH:\n${res.stdout}`);
});

test('G3 PR quiz yang diam-diam mengubah features/auth/fiezel-auth-screen.js -> DIBLOKIR (exit 1)', () => {
  const res = runA10Fixture({
    title: 'feat(quiz): animasi kartu jawaban benar',
    files: ['features/auth/fiezel-auth-screen.js', 'tests/quiz-anim-test.js'],
    diff: [
      'diff --git a/features/auth/fiezel-auth-screen.js b/features/auth/fiezel-auth-screen.js',
      '--- a/features/auth/fiezel-auth-screen.js',
      '+++ b/features/auth/fiezel-auth-screen.js',
      '@@ -10,1 +10,1 @@',
      '+  // sentuhan tidak sah'
    ].join('\n')
  });
  assert.strictEqual(res.status, 1);
  assert.ok(res.stdout.includes('COLLATERAL_AUTH_TOUCH'));
});

test('G4 PR vocab yang diam-diam mengubah website/manifest.json atau logika sw.js -> DIBLOKIR (exit 1)', () => {
  const res = runA10Fixture({
    title: 'fix(vocab): jarak tombol audio kartu kosa kata',
    files: ['website/manifest.json', 'tests/vocab-card-test.js'],
    diff: [
      'diff --git a/website/manifest.json b/website/manifest.json',
      '--- a/website/manifest.json',
      '+++ b/website/manifest.json',
      '@@ -4,1 +4,1 @@',
      '-  "display": "standalone",',
      '+  "display": "browser",'
    ].join('\n')
  });
  assert.strictEqual(res.status, 1);
  assert.ok(res.stdout.includes('COLLATERAL_PWA_TOUCH'));
});

test('G5 PR kana yang menghapus gerbang tes dari quality.yml -> DIBLOKIR (exit 1)', () => {
  const res = runA10Fixture({
    title: 'fix(kana): urutan goresan hiragana',
    files: ['.github/workflows/quality.yml'],
    diff: [
      'diff --git a/.github/workflows/quality.yml b/.github/workflows/quality.yml',
      '--- a/.github/workflows/quality.yml',
      '+++ b/.github/workflows/quality.yml',
      '@@ -208,1 +208,0 @@',
      '-          node tests/auth-screen-test.js'
    ].join('\n')
  });
  assert.strictEqual(res.status, 1);
  assert.ok(res.stdout.includes('COLLATERAL_CI_GOVERNANCE_TOUCH'));
});

test('G6 PR dengan scope resmi fix(auth): atau token [ALLOW-PROTECTED: auth] -> LULUS (exit 0)', () => {
  const res1 = runA10Fixture({
    title: 'fix(auth): perketat validasi sesi akun kedaluwarsa',
    files: ['features/auth/fiezel-auth-screen.js', 'tests/auth-screen-test.js'],
    diff: [
      'diff --git a/features/auth/fiezel-auth-screen.js b/features/auth/fiezel-auth-screen.js',
      '--- a/features/auth/fiezel-auth-screen.js',
      '+++ b/features/auth/fiezel-auth-screen.js',
      '@@ -20,1 +20,1 @@',
      '+  // perbaikan resmi auth'
    ].join('\n')
  });
  assert.strictEqual(res1.status, 0);

  const res2 = runA10Fixture({
    title: 'fix(quiz): sinkronisasi sesi saat kuis berakhir',
    body: 'Atas instruksi eksplisit owner: [ALLOW-PROTECTED: auth]',
    files: ['features/auth/fiezel-auth-screen.js', 'tests/auth-screen-test.js'],
    diff: [
      'diff --git a/features/auth/fiezel-auth-screen.js b/features/auth/fiezel-auth-screen.js',
      '--- a/features/auth/fiezel-auth-screen.js',
      '+++ b/features/auth/fiezel-auth-screen.js',
      '@@ -20,1 +20,1 @@',
      '+  // disetujui eksplisit'
    ].join('\n')
  });
  assert.strictEqual(res2.status, 0);
});

test('G7 PR fitur biasa yang menghapus > 500 baris runtime inti -> DIBLOKIR (exit 1)', () => {
  const removed = Array.from({ length: 520 }, (_, i) => `-  const line${i} = ${i};`).join('\n');
  const res = runA10Fixture({
    title: 'fix(grammar): rapikan sedikit latihan grammar',
    files: ['app.js', 'tests/grammar-test.js'],
    diff: `diff --git a/app.js b/app.js\n--- a/app.js\n+++ b/app.js\n@@ -100,520 +100,1 @@ function grammar(){\n${removed}\n+  const ok = true;`
  });
  assert.strictEqual(res.status, 1);
  assert.ok(res.stdout.includes('MASS_RUNTIME_DELETION'));
});

test('G8 Gerbang ini terdaftar di quality.yml dan guardian self-test lulus', () => {
  const st = spawnSync(process.execPath, [GUARDIAN, 'self-test'], { cwd: ROOT, encoding: 'utf8' });
  assert.strictEqual(st.status, 0, st.stderr || st.stdout);
  const q = fs.readFileSync(path.join(ROOT, '.github/workflows/quality.yml'), 'utf8');
  assert.ok(q.includes('node tests/collateral-scope-guard-test.js'), 'Belum terdaftar di quality.yml');
});

console.log(`\ncollateral-scope-guard-test: ${passed} PASS, ${failed} FAIL`);
process.exit(failed ? 1 : 0);
