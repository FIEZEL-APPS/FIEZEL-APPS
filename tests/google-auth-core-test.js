'use strict';
const __fzRoot = require('path').join(__dirname, '..'); /* m025-254: berkas ini pindah dari root ke tests/. */
/**
 * tests/google-auth-core-test.js — GERBANG VERIFIKASI ID TOKEN GOOGLE.
 *
 * Gerbang ini TIDAK memakai mock tanda tangan. Ia membangkitkan pasangan kunci
 * RSA sungguhan lewat WebCrypto, menandatangani token sungguhan, lalu menyerang
 * verifier dengan token yang setiap kali cacat pada SATU sumbu saja. Verifier
 * yang lulus di sini benar-benar memeriksa, bukan sekadar mengurai.
 *
 * Kenapa serangannya satu sumbu per kasus: verifier yang menolak SEMUA token
 * juga akan "lulus" uji negatif yang menumpuk banyak cacat sekaligus. Setiap
 * kasus di bawah karena itu dipasangkan dengan kasus positif yang identik
 * kecuali satu bidang.
 */
const assert = require('assert');
const path = require('path');
const { webcrypto } = require('crypto');
if (!globalThis.crypto) globalThis.crypto = webcrypto;
if (typeof globalThis.atob !== 'function') {
  globalThis.atob = (s) => Buffer.from(s, 'base64').toString('binary');
}

const tests = [];
const test = (name, fn) => tests.push([name, fn]);

const CLIENT_ID = '1084250087-hvfdttommi8gnkguc5rlqidpkiptopf0.apps.googleusercontent.com';
const NOW_MS = 1_788_600_000_000;
const NOW_S = Math.floor(NOW_MS / 1000);

function b64url(bytes) {
  return Buffer.from(bytes).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
const b64urlJson = (o) => b64url(Buffer.from(JSON.stringify(o), 'utf8'));

let KEYPAIR = null; let JWK = null;

async function setup() {
  KEYPAIR = await webcrypto.subtle.generateKey(
    { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
    true, ['sign', 'verify']
  );
  const pub = await webcrypto.subtle.exportKey('jwk', KEYPAIR.publicKey);
  JWK = { kid: 'test-kid-1', kty: 'RSA', n: pub.n, e: pub.e, alg: 'RS256', use: 'sig' };
}

/** Terbitkan token sungguhan yang DITANDATANGANI kunci uji. */
async function issue(overrides, headerOverrides) {
  const header = Object.assign({ alg: 'RS256', kid: 'test-kid-1', typ: 'JWT' }, headerOverrides || {});
  const payload = Object.assign({
    iss: 'https://accounts.google.com',
    aud: CLIENT_ID,
    sub: '110000000000000000001',
    email: 'Murid@Example.com',
    email_verified: true,
    iat: NOW_S - 10,
    exp: NOW_S + 3000
  }, overrides || {});
  const signingInput = b64urlJson(header) + '.' + b64urlJson(payload);
  const sig = await webcrypto.subtle.sign(
    'RSASSA-PKCS1-v1_5', KEYPAIR.privateKey, Buffer.from(signingInput, 'utf8')
  );
  return signingInput + '.' + b64url(new Uint8Array(sig));
}

let G = null;
const verify = (token, extra) => G.verifyGoogleIdToken(token, Object.assign(
  { clientId: CLIENT_ID, nowMs: NOW_MS, keys: [JWK] }, extra || {}
));

/* ---------------------------------------------------------------- POSITIF -- */

test('token sah diterima, dan mengembalikan sub + email ternormalisasi', async () => {
  const r = await verify(await issue());
  assert.strictEqual(r.ok, true, 'token sah harus diterima: ' + JSON.stringify(r));
  assert.strictEqual(r.sub, '110000000000000000001');
  assert.strictEqual(r.email, 'murid@example.com', 'email dinormalkan ke huruf kecil');
  assert.strictEqual(r.emailVerified, true);
});

test('issuer tanpa https juga sah — Google menerbitkan dua bentuk', async () => {
  const r = await verify(await issue({ iss: 'accounts.google.com' }));
  assert.strictEqual(r.ok, true);
});

test('token tanpa email tetap diterima (akun Google tanpa scope email)', async () => {
  const r = await verify(await issue({ email: undefined, email_verified: undefined }));
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.email, null);
  assert.strictEqual(r.emailVerified, false);
});

test('nonce cocok diterima', async () => {
  const r = await verify(await issue({ nonce: 'n-abc123' }), { nonce: 'n-abc123' });
  assert.strictEqual(r.ok, true);
});

/* ---------------------------------------------------------------- NEGATIF -- */

test('TANDA TANGAN dipalsukan -> ditolak', async () => {
  const token = await issue();
  const parts = token.split('.');
  const bad = parts[0] + '.' + parts[1] + '.' + 'A'.repeat(parts[2].length);
  const r = await verify(bad);
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.error, G.GOOGLE_ERR.SIGNATURE);
});

test('PAYLOAD diubah sesudah ditandatangani -> ditolak', async () => {
  const token = await issue();
  const parts = token.split('.');
  const jahat = b64urlJson({
    iss: 'https://accounts.google.com', aud: CLIENT_ID, sub: 'PENYERANG',
    email: 'penyerang@example.com', email_verified: true, iat: NOW_S - 10, exp: NOW_S + 3000
  });
  const r = await verify(parts[0] + '.' + jahat + '.' + parts[2]);
  assert.strictEqual(r.ok, false, 'payload yang diganti TIDAK boleh lolos');
  assert.strictEqual(r.error, G.GOOGLE_ERR.SIGNATURE);
});

test('alg:none -> ditolak SEBELUM kunci disentuh', async () => {
  const header = b64urlJson({ alg: 'none', kid: 'test-kid-1' });
  const payload = b64urlJson({
    iss: 'https://accounts.google.com', aud: CLIENT_ID, sub: '1', iat: NOW_S - 10, exp: NOW_S + 3000
  });
  const r = await verify(header + '.' + payload + '.');
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.error, G.GOOGLE_ERR.ALG, 'algorithm confusion harus mati di gerbang alg');
});

test('alg:HS256 -> ditolak', async () => {
  const r = await verify(await issue({}, { alg: 'HS256' }));
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.error, G.GOOGLE_ERR.ALG);
});

test('kid tak dikenal -> ditolak', async () => {
  const r = await verify(await issue({}, { kid: 'kid-asing' }));
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.error, G.GOOGLE_ERR.KEY);
});

test('AUD aplikasi lain -> ditolak (ini yang mencegah token app lain dipakai masuk)', async () => {
  const r = await verify(await issue({ aud: '999-aplikasi-lain.apps.googleusercontent.com' }));
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.error, G.GOOGLE_ERR.AUDIENCE);
});

test('ISS bukan Google -> ditolak', async () => {
  const r = await verify(await issue({ iss: 'https://evil.example.com' }));
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.error, G.GOOGLE_ERR.ISSUER);
});

test('token kedaluwarsa -> ditolak', async () => {
  const r = await verify(await issue({ iat: NOW_S - 4000, exp: NOW_S - 1 }));
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.error, G.GOOGLE_ERR.EXPIRED);
});

test('iat di masa depan -> ditolak', async () => {
  const r = await verify(await issue({ iat: NOW_S + 600, exp: NOW_S + 4000 }));
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.error, G.GOOGLE_ERR.NOT_YET);
});

test('token berumur sangat panjang -> ditolak meski tanda tangan sah', async () => {
  const r = await verify(await issue({ iat: NOW_S - 90000, exp: NOW_S + 90000 }));
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.error, G.GOOGLE_ERR.TOO_OLD, 'token bocor tidak boleh jadi kunci permanen');
});

test('nonce tidak cocok -> ditolak', async () => {
  const r = await verify(await issue({ nonce: 'n-benar' }), { nonce: 'n-lain' });
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.error, G.GOOGLE_ERR.NONCE);
});

test('nonce diminta tapi token tidak membawanya -> ditolak', async () => {
  const r = await verify(await issue(), { nonce: 'n-benar' });
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.error, G.GOOGLE_ERR.NONCE);
});

test('email BELUM diverifikasi Google -> ditolak', async () => {
  const r = await verify(await issue({ email_verified: false }));
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.error, G.GOOGLE_ERR.EMAIL_UNVERIFIED);
});

test('bentuk rusak -> ditolak tanpa melempar', async () => {
  for (const bad of ['', null, undefined, 'a.b', 'a.b.c.d', 'bukan-jwt', '...']) {
    const r = await verify(bad);
    assert.strictEqual(r.ok, false, 'harus ditolak: ' + String(bad));
  }
});

/* ------------------------------------------------------------- KONTRAK PII -- */

test('verifier TIDAK mengembalikan nama/foto meski token membawanya', async () => {
  const r = await verify(await issue({
    name: 'Nama Lengkap Murid', picture: 'https://lh3.googleusercontent.com/x',
    given_name: 'Nama', family_name: 'Murid', locale: 'id'
  }));
  assert.strictEqual(r.ok, true);
  assert.deepStrictEqual(Object.keys(r).sort(), ['email', 'emailVerified', 'ok', 'sub'],
    'hanya sub + email yang keluar; nama/foto tidak pernah ikut');
});

test('normalizeEmail menolak bentuk yang bukan alamat', async () => {
  for (const bad of ['', 'a', 'tanpa-at', 'a@b', 'a@@b.c', 'a b@c.d', 'x'.repeat(300) + '@a.co']) {
    assert.strictEqual(G.normalizeEmail(bad), null, 'harus ditolak: ' + bad.slice(0, 20));
  }
  assert.strictEqual(G.normalizeEmail('  Orang.Tua+fz@Sekolah.SCH.ID '), 'orang.tua+fz@sekolah.sch.id');
});

test('decodeGoogleToken TIDAK memverifikasi apa pun (dan komentarnya mengatakan itu)', async () => {
  const src = require('fs').readFileSync(
    path.join(__fzRoot, 'workers', 'api', 'auth', 'google-core.js'), 'utf8');
  assert.ok(/TIDAK BOLEH dipakai rute untuk membaca klaim/.test(src),
    'bahaya decode-tanpa-verifikasi tertulis di tempatnya');
  const d = G.decodeGoogleToken(await issue({ sub: 'apa-saja' }));
  assert.strictEqual(d.payload.sub, 'apa-saja');
});

(async () => {
  await setup();
  G = await import('file://' + path.join(__fzRoot, 'workers', 'api', 'auth', 'google-core.js'));
  let fail = 0;
  for (const [name, fn] of tests) {
    try { await fn(); console.log('ok   - ' + name); }
    catch (e) { fail += 1; console.log('FAIL - ' + name + '\n  ' + (e && e.message || e)); }
  }
  console.log('\n' + (tests.length - fail) + '/' + tests.length + ' PASS · tests/google-auth-core-test.js');
  process.exit(fail ? 1 : 0);
})();
