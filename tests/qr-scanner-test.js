const __fzRoot = require('path').join(__dirname, '..');
/**
 * tests/qr-scanner-test.js — Gerbang otomatis unit & kontrak untuk Scanner QR & Polling Teman.
 * Memverifikasi:
 * 1. Parser handle QR (parseFriendHandleFromQr) terhadap regex resmi, penolakan email/url acak.
 * 2. Throttle permintaan teman sisi klien (FRIEND_REQ_MIN_GAP_MS = 60s).
 * 3. Token generasi kamera & penghentian track saat modal ditutup.
 * 4. Atribusi lisensi Apache-2.0 jsQR & pembersihan dependensi.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = __fzRoot;
let pass = 0;
function check(ok, desc) {
  if (!ok) {
    console.error('FAIL:', desc);
    process.exit(1);
  }
  pass++;
}

// 1. Ekstraksi fungsi parseFriendHandleFromQr dari app.js
const appSrc = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const parseMatch = appSrc.match(/function parseFriendHandleFromQr\([\s\S]*?\n\}/);
assert.ok(parseMatch, 'parseFriendHandleFromQr harus ditemukan di app.js');
const parseFriendHandleFromQr = new Function(parseMatch[0] + '; return parseFriendHandleFromQr;')();

// Test 1: Parser menerima format resmi
check(parseFriendHandleFromQr('https://fiezel.my.id/app/?friend=rian_guru') === 'rian_guru', 'URL query friend=rian_guru sah');
check(parseFriendHandleFromQr('https://fiezel.my.id/app/#friend/siti_pintar') === 'siti_pintar', 'URL hash #friend/siti_pintar sah');
check(parseFriendHandleFromQr('@dian_pertiwi') === 'dian_pertiwi', 'Prefix @dian_pertiwi sah');
check(parseFriendHandleFromQr('budi_123') === 'budi_123', 'Plain handle budi_123 sah');

// Test 2: Parser menolak email, query google, dan input invalid
check(!parseFriendHandleFromQr('budi@gmail.com'), 'Email budi@gmail.com wajib ditolak');
check(!parseFriendHandleFromQr('https://google.com/search?q=@test'), 'URL asing dengan @ wajib ditolak');
check(!parseFriendHandleFromQr('ab'), 'Handle < 3 karakter wajib ditolak');
check(!parseFriendHandleFromQr('a'.repeat(25)), 'Handle > 20 karakter wajib ditolak');
check(!parseFriendHandleFromQr('budi-santoso'), 'Karakter minus (-) wajib ditolak');

// Test 3: Verifikasi keberadaan token generasi kamera _qrScanGen di app.js
check(appSrc.includes('_qrScanGen++'), 'app.js harus menaikkan _qrScanGen pada stopQrScanner');
check(appSrc.includes('stream.getTracks().forEach(t=>t.stop())'), 'app.js harus menghentikan track saat modal ditutup');
check(appSrc.includes("document.visibilityState==='hidden'"), 'app.js harus menghentikan kamera saat visibility hidden');

// Test 4: Verifikasi throttle polling pertemanan
check(appSrc.includes('FRIEND_REQ_MIN_GAP_MS=60000') || appSrc.includes('FRIEND_REQ_MIN_GAP_MS = 60000'), 'app.js harus memiliki throttle 60 detik');
check(appSrc.includes('!force&&(now-_lastFriendReqPollAt<FRIEND_REQ_MIN_GAP_MS)'), 'app.js harus menahan fetch jika belum 60 detik');

// Test 5: Verifikasi pembersihan audio feedback & debounce pada loop invalid
check(appSrc.includes('raw===_qrLastScannedText') && appSrc.includes('3000'), 'app.js harus melakukan debounce 3000ms pada teks QR kembar');

// Test 6: Verifikasi atribusi lisensi Apache-2.0 jsQR
const jsqrSrc = fs.readFileSync(path.join(root, 'features/social/jsqr.js'), 'utf8');
check(jsqrSrc.includes('Licensed under the Apache License, Version 2.0'), 'features/social/jsqr.js harus memiliki header lisensi Apache-2.0');

const licensesSrc = fs.readFileSync(path.join(root, 'THIRD-PARTY-LICENSES.md'), 'utf8');
check(licensesSrc.includes('jsQR 1.4.0') && licensesSrc.includes('Apache-2.0'), 'THIRD-PARTY-LICENSES.md harus mencantumkan jsQR Apache-2.0');

const pkgSrc = fs.readFileSync(path.join(root, 'package.json'), 'utf8');
check(!pkgSrc.includes('"jsqr"'), 'package.json tidak boleh memuat dependensi jsqr yang tidak terpakai');

// Test 7: Verifikasi lazy loading pada index.html
const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
check(indexHtml.includes('type="fiezel/lazy"') && indexHtml.includes('data-fiezel-lazy="qr"'), 'index.html harus memuat jsqr.js via lazy loader');

// Test 8: Verifikasi pengikatan FiezelLazy pada ensureQrDecoderLoaded
check(appSrc.includes('ensureQrDecoderLoaded') && appSrc.includes('FiezelLazy'), 'ensureQrDecoderLoaded harus memeriksa FiezelLazy');

console.log(`qr-scanner-test: ${pass}/${pass} assert PASS`);
