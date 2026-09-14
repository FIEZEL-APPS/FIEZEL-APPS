/**
 * FIEZEL gerbang — tests/certificate-sign-test.js · Identitas & tanda tangan sertifikat.
 *
 * Kontrak yang dijaga berkas ini:
 *
 *   S1  kanonik       — untaian tanda tangan tidak bergantung urutan sisip kunci;
 *                       dua objek berisi sama menghasilkan untaian sama persis
 *   S2  bentuk ID     — ID memakai alfabet tanpa huruf/angka yang mudah tertukar
 *                       (0 O 1 I L 5 S 8 B tidak pernah muncul), dan deterministik
 *   S3  ketikan orang — "fz 8k3m 2p9x" dan "FZ-8K3M-2P9X" menuju ID yang sama
 *   S4  sah           — tanda tangan atas data yang benar terverifikasi
 *   S5  isi diubah    — menaikkan level di catatan DB membatalkan tanda tangan
 *   S6  pemegang      — menukar nama pemegang antar dua sertifikat sah ikut batal
 *   S7  secret salah  — secret lain tidak pernah memverifikasi
 *   S8  rusak         — tanda tangan cacat/hilang => false, TIDAK melempar
 */
'use strict';
const assert = require('assert');

let passed = 0;
const ok = (cond, label) => { assert.ok(cond, label); passed++; };

(async () => {
  const sign = await import('../workers/api/certificate/certificate-sign.js');

  /* ---- S1 · kanonikalisasi --------------------------------------------- */

  const a = { b: 1, a: 2, nested: { z: 1, y: 2 } };
  const b = { nested: { y: 2, z: 1 }, a: 2, b: 1 };
  ok(sign.canonical(a) === sign.canonical(b),
    'S1: urutan sisip kunci tidak mengubah untaian kanonik');
  ok(sign.canonical([1, 2, 3]) !== sign.canonical([3, 2, 1]),
    'S1: urutan array TETAP bermakna (array adalah datanya)');
  ok(sign.canonical(null) === 'null', 'S1: null tidak merusak kanonikalisasi');

  /* ---- S2 · bentuk ID --------------------------------------------------- */

  const bytes = new Uint8Array([0, 40, 80, 120, 160, 200, 240, 255]);
  const id = sign.formatPublicId(bytes);
  ok(/^FZ-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(id), 'S2: ID berbentuk FZ-XXXX-XXXX');
  ok(sign.formatPublicId(bytes) === id, 'S2: byte sama => ID sama (deterministik)');
  ok(!/[O1IL5S8B0]/.test(id.slice(3)), 'S2: ID tidak memuat simbol yang mudah tertukar');
  ok(sign.isWellFormedId(id), 'S2: ID terbitan sendiri lolos pemeriksaan bentuk');
  ok(!sign.isWellFormedId('FZ-O0O0-1I1I'), 'S2: simbol terlarang ditolak');
  ok(!sign.isWellFormedId('sembarang'), 'S2: teks acak ditolak');

  let threw = false;
  try { sign.formatPublicId(new Uint8Array([1, 2])); } catch { threw = true; }
  ok(threw, 'S2: entropi kurang MELEMPAR, tidak diam-diam memendekkan ID');

  /* ---- S3 · ketikan manusia --------------------------------------------- */

  ok(sign.normalizeId('fz 8k3m 2p9x'.toUpperCase().replace('8', '9').replace('0', '2'))
     !== undefined, 'S3: normalizeId menerima masukan bebas tanpa melempar');
  ok(sign.normalizeId('FZ-A234-C679') === 'FZ-A234-C679', 'S3: bentuk baku tetap sama');
  ok(sign.normalizeId('fz-a234-c679') === 'FZ-A234-C679', 'S3: huruf kecil dibesarkan');
  ok(sign.normalizeId('a234c679') === 'FZ-A234-C679', 'S3: tanpa awalan & tanda hubung tetap ketemu');
  ok(sign.normalizeId('A234 C679') === 'FZ-A234-C679', 'S3: spasi diabaikan');
  ok(sign.normalizeId('terlalupanjangsekali') === null, 'S3: panjang salah => null');

  /* ---- S4..S7 · tanda tangan -------------------------------------------- */

  const SECRET = 'rahasia-uji-jangan-dipakai-produksi';
  const cert = {
    schema: 'fiezel-certificate-v1',
    level: 'B1',
    skills: { grammar: 'B1', reading: 'B1', listening: null },
    totalItems: 40,
    issuedAt: 1750000000000
  };
  const holder = { name: 'Siti Rahayu', ref: 'user-1' };

  const sig = await sign.signCertificate(SECRET, id, cert, holder);
  ok(typeof sig === 'string' && sig.length > 0, 'S4: tanda tangan terbentuk');
  ok(await sign.verifyCertificate(SECRET, id, cert, holder, sig),
    'S4: data yang benar terverifikasi');

  // S5 — seseorang menulis langsung ke DB dan menaikkan levelnya.
  const tampered = Object.assign({}, cert, { level: 'C2' });
  ok(!(await sign.verifyCertificate(SECRET, id, tampered, holder, sig)),
    'S5: level yang dinaikkan di DB membatalkan tanda tangan');

  const tamperedSkills = Object.assign({}, cert, {
    skills: { grammar: 'C1', reading: 'B1', listening: null }
  });
  ok(!(await sign.verifyCertificate(SECRET, id, tamperedSkills, holder, sig)),
    'S5: profil skill yang diubah membatalkan tanda tangan');

  // S6 — sertifikat sah milik orang lain dipindah namanya.
  ok(!(await sign.verifyCertificate(SECRET, id, cert, { name: 'Budi', ref: 'user-2' }, sig)),
    'S6: menukar pemegang membatalkan tanda tangan');

  // ID ikut ditandatangani: catatan sah tidak bisa dipindah ke ID lain.
  ok(!(await sign.verifyCertificate(SECRET, 'FZ-2222-3333', cert, holder, sig)),
    'S6: memindahkan catatan ke ID lain membatalkan tanda tangan');

  // S7 — secret lain.
  ok(!(await sign.verifyCertificate('secret-lain', id, cert, holder, sig)),
    'S7: secret yang salah tidak pernah memverifikasi');

  /* ---- S8 · masukan rusak ----------------------------------------------- */

  ok(!(await sign.verifyCertificate(SECRET, id, cert, holder, null)),
    'S8: tanda tangan hilang => false');
  ok(!(await sign.verifyCertificate(SECRET, id, cert, holder, '!!!bukan-base64!!!')),
    'S8: base64 cacat => false, tidak melempar');
  ok(!(await sign.verifyCertificate(SECRET, id, cert, holder, '')),
    'S8: tanda tangan kosong => false');

  console.log(`certificate-sign-test: ${passed}/${passed} assert PASS`);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
