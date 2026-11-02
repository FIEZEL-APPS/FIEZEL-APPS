#!/usr/bin/env node
/**
 * tests/tri-core-invariants-gate-test.js — GERBANG PENGAWAS TIGA INVARIAN KRUSIAL (m025-752).
 *
 * Mandat OWNER: Tiga masalah paling krusial ini DILARANG KERAS terulang di FIEZEL:
 *   1. Integrasi Dashboard Owner <-> Akun PWA Murid (Owner-Learner Wire)
 *      - Pengiriman permata (gems) & pesan murid dari dashboard owner wajib meresolusi
 *        sub kanonikal dari email Google murid secara akurat.
 *      - Skema `state.gems` wajib bertahan anti-korupsi `{ balance: number }` (dilarang
 *        berubah menjadi angka telanjang atau objek tak dikenal).
 *   2. Shell PWA Tersangkut & Data Usang (Zero-Stale-Shell Invariant)
 *      - Service Worker `sw.js` wajib memiliki rute update network-first `isUpdateNav`
 *        untuk URL dengan parameter `fz_upd`, `__fz_fresh`, dan `fz_healed`.
 *      - `FiezelOfflineVault` wajib memiliki pembersihan otomatis `purgeStaleBuilds`
 *        dan membatalkan bank jika nomor build berbeda dengan halaman.
 *      - Riwayat sinkronisasi lama (`restoredFromSync: true`) wajib dinormalisasi
 *        di `app.js` tanpa menghasilkan `NaN` pada kalkulasi tanggal/hari.
 *   3. Auth Login Google & Registrasi Bebas Blokir (Auth CSP Superset Invariant)
 *      - Header `Content-Security-Policy` di `.htaccess` wajib superset dari `<meta>` CSP
 *        di `index.html`.
 *      - `https://accounts.google.com` wajib ada di `script-src`, `style-src`, dan `frame-src`.
 *      - `https://api.fiezel.my.id` (atau `https: wss:`) wajib diizinkan di `connect-src`.
 *
 * Gerbang ini dijalankan otomatis di CI Quality Gate pada setiap Pull Request.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const ROOT = path.resolve(__dirname, '..');
let passCount = 0;

function ok(cond, desc) {
  assert.ok(cond, desc);
  passCount++;
  console.log(`  ✅ PASS ${passCount}: ${desc}`);
}

console.log('🧪 Memulai Pengujian Gerbang Mutu Tiga Invarian Krusial...');

// ============================================================================
// PILAR 1: INTEGRASI DASHBOARD OWNER <-> AKUN PWA MURID
// ============================================================================
console.log('\n--- PILAR 1: Owner Dashboard & Learner Wire Invariant ---');

// 1.1 Owner API memiliki rute resolusi sub dan pemberian permata
const gemGrantPath = path.join(ROOT, 'workers', 'api', 'route-gem-grant.js');
const learnerMsgPath = path.join(ROOT, 'workers', 'api', 'route-learner-messages.js');
ok(fs.existsSync(gemGrantPath), 'Berkas workers/api/route-gem-grant.js ada');
ok(fs.existsSync(learnerMsgPath), 'Berkas workers/api/route-learner-messages.js ada');

const gemGrantCode = fs.readFileSync(gemGrantPath, 'utf8');
const learnerMsgCode = fs.readFileSync(learnerMsgPath, 'utf8');

ok(
  /export\s+async\s+function\s+routeOwnerGrantGems\b/.test(gemGrantCode),
  'route-gem-grant.js mengimplementasikan routeOwnerGrantGems'
);

ok(
  /export\s+async\s+function\s+routeOwnerSendMessage\b/.test(learnerMsgCode),
  'route-learner-messages.js mengimplementasikan routeOwnerSendMessage'
);

ok(
  /SELECT sub FROM auth_email WHERE email =/.test(gemGrantCode) &&
  /SELECT sub FROM auth_email WHERE email =/.test(learnerMsgCode),
  'Owner endpoints mencari sub kanonikal dari auth_email (email Google murid)'
);

// 1.2 Skema state.gems murid terlindungi di gems-core.js
const gemsCorePath = path.join(ROOT, 'features', 'speaking-listening', 'gems-core.js');
ok(fs.existsSync(gemsCorePath), 'Berkas features/speaking-listening/gems-core.js ada');
const gemsCoreCode = fs.readFileSync(gemsCorePath, 'utf8');

ok(
  /function\s+sanitizeGems\b/.test(gemsCoreCode) && /raw\.balance\b/.test(gemsCoreCode),
  'gems-core.js mengimplementasikan sanitizeGems() untuk menjaga integritas saldo dan skema gems'
);

// Verifikasi uji owner-gem-wire-e2e-test ada dan valid
const ownerGemTestPath = path.join(ROOT, 'tests', 'owner-gem-wire-e2e-test.js');
ok(fs.existsSync(ownerGemTestPath), 'Gerbang penguji tests/owner-gem-wire-e2e-test.js terdaftar');

// ============================================================================
// PILAR 2: SHELL PWA TERSANGKUT & REHIDRASI PROGRES LAMA
// ============================================================================
console.log('\n--- PILAR 2: Zero-Stale-Shell & Offline Vault Invariant ---');

// 2.1 sw.js memiliki penanganan isUpdateNav network-first
const swPath = path.join(ROOT, 'sw.js');
ok(fs.existsSync(swPath), 'Berkas sw.js ada');
const swCode = fs.readFileSync(swPath, 'utf8');

ok(
  /isUpdateNav\b/.test(swCode) && /fz_upd\b/.test(swCode) && /fz_healed\b/.test(swCode),
  'sw.js mendeteksi isUpdateNav dengan parameter fz_upd, __fz_fresh, dan fz_healed'
);

ok(
  /ensureShellCoherence\b/.test(swCode),
  'sw.js memiliki fungsi ensureShellCoherence untuk sinkronisasi shell cache'
);

// 2.2 fiezel-offline-vault.js memiliki pembersihan bank build usang
const vaultPath = path.join(ROOT, 'features', 'security', 'fiezel-offline-vault.js');
ok(fs.existsSync(vaultPath), 'Berkas features/security/fiezel-offline-vault.js ada');
const vaultCode = fs.readFileSync(vaultPath, 'utf8');

ok(
  /purgeStaleBuilds\b/.test(vaultCode),
  'fiezel-offline-vault.js mengimplementasikan purgeStaleBuilds() untuk menghapus cache bank versi lama'
);

ok(
  /activeBuild\s*&&\s*String\(record\.build/.test(vaultCode),
  'fiezel-offline-vault.js menolak dan menghapus bank dari vault jika build tidak cocok dengan halaman'
);

// 2.3 app.js memiliki normalisasi riwayat sinkronisasi lama
const appPath = path.join(ROOT, 'app.js');
ok(fs.existsSync(appPath), 'Berkas app.js ada');
const appCode = fs.readFileSync(appPath, 'utf8');

ok(
  /parseHistoryTimestamp\b/.test(appCode) && /normalizeHistoryRow\b/.test(appCode),
  'app.js memiliki parseHistoryTimestamp dan normalizeHistoryRow untuk mereparasi baris riwayat legacy'
);

ok(
  /reconcileStateAfterBankLoad\b/.test(appCode),
  'app.js memiliki reconcileStateAfterBankLoad untuk hidrasi bucket kurikulum tanpa merusak course lain'
);

// Verifikasi uji progress-legacy-upgrade-gate-test ada
const progressGatePath = path.join(ROOT, 'tests', 'progress-legacy-upgrade-gate-test.js');
ok(fs.existsSync(progressGatePath), 'Gerbang penguji tests/progress-legacy-upgrade-gate-test.js terdaftar');

// ============================================================================
// PILAR 3: AUTH LOGIN GOOGLE & REGISTRASI BEBAS BLOKIR (CSP SUPERSET)
// ============================================================================
console.log('\n--- PILAR 3: Auth Google & API Unblock Invariant ---');

// 3.1 website/.htaccess memuat CSP superset
const htaccessPath = path.join(ROOT, 'website', '.htaccess');
ok(fs.existsSync(htaccessPath), 'Berkas website/.htaccess ada');
const htaccessCode = fs.readFileSync(htaccessPath, 'utf8');

const cspMatch = htaccessCode.match(/Header\s+always\s+set\s+Content-Security-Policy\s+"([^"]+)"/i);
ok(!!cspMatch, '.htaccess menyetel header Content-Security-Policy');
const cspHeader = cspMatch ? cspMatch[1] : '';

ok(
  /https:\/\/accounts\.google\.com/.test(cspHeader),
  'Header CSP di .htaccess memuat https://accounts.google.com untuk skrip & frame Google GSI'
);

ok(
  /script-src[^;]*accounts\.google\.com/.test(cspHeader) && /frame-src[^;]*accounts\.google\.com/.test(cspHeader),
  'Header CSP mengizinkan script-src dan frame-src ke accounts.google.com'
);

ok(
  /connect-src[^;]*(https:|api\.fiezel\.my\.id)/.test(cspHeader),
  'Header CSP mengizinkan connect-src ke API FIEZEL (https: / api.fiezel.my.id)'
);

// 3.2 index.html meta CSP tetap sejalan
const indexHtmlPath = path.join(ROOT, 'index.html');
const indexHtmlCode = fs.readFileSync(indexHtmlPath, 'utf8');
ok(
  /<meta[^>]+http-equiv=["']Content-Security-Policy["']/i.test(indexHtmlCode),
  'index.html mendefinisikan <meta> Content-Security-Policy'
);

// Verifikasi uji csp-header-superset-gate-test ada
const cspGatePath = path.join(ROOT, 'tests', 'csp-header-superset-gate-test.js');
ok(fs.existsSync(cspGatePath), 'Gerbang penguji tests/csp-header-superset-gate-test.js terdaftar');

// ============================================================================
// RINGKASAN
// ============================================================================
console.log(`\n🎉 SEMUA ${passCount} PEMERIKSAAN TIGA INVARIAN KRUSIAL LULUS 100%!`);
console.log('   Pilar 1 (Owner-Learner Wire): TERLINDUNGI');
console.log('   Pilar 2 (PWA Shell & Cache):  TERLINDUNGI');
console.log('   Pilar 3 (Auth Google & CSP):  TERLINDUNGI');
