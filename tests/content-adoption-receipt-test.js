/**
 * FIEZEL R5 gate — Adoption Receipt dan replay protection.
 *
 * Yang diuji di sini bukan "apakah receipt terbentuk", melainkan apakah ia menolak hal-hal
 * yang justru terlihat sah: payload adopsi lama yang diputar ulang, patch yang sama diadopsi
 * dua kali ke versi berbeda, dan ledger yang entrinya dihapus di tengah.
 */
const assert = require('assert');
const receipts = require('../content-adoption-receipt.js');

let failures = 0;
function test(name, fn) {
  try { fn(); console.log('ok - ' + name); }
  catch (e) { failures++; console.error('FAIL - ' + name + '\n    ' + e.message); }
}

const NOW = Date.parse('2026-08-20T06:00:00Z');

function adoption(over) {
  return Object.assign({
    status: 'adopt', gateVersion: 'canonical-adoption-v1',
    patchId: 'patch-001', domain: 'grammar', itemId: 'g-12',
    sourceVersion: '5.21.0', targetVersion: '5.21.1',
    canonicalBefore: 'a'.repeat(64), canonicalAfter: 'b'.repeat(64)
  }, over || {});
}

const issued = receipts.issueReceipt({ adoption: adoption(), now: NOW });

test('receipt hanya terbit untuk adopsi yang benar-benar lolos gate', () => {
  assert.strictEqual(issued.ok, true);
  for (const status of ['hold', 'reject', '', undefined]) {
    const r = receipts.issueReceipt({ adoption: adoption({ status }), now: NOW });
    assert.strictEqual(r.ok, false, `status ${status} tidak boleh menghasilkan receipt`);
    assert.strictEqual(r.reason, 'adoption_not_adopted');
  }
});

test('now wajib diisi', () => {
  assert.throws(() => receipts.issueReceipt({ adoption: adoption() }), /now wajib diisi/);
});

test('receiptId stabil terhadap urutan properti, berubah terhadap isi', () => {
  const lagi = receipts.issueReceipt({ adoption: adoption(), now: NOW + 5000 });
  assert.strictEqual(lagi.receipt.receiptId, issued.receipt.receiptId, 'waktu terbit bukan bagian identitas');
  const beda = receipts.issueReceipt({ adoption: adoption({ targetVersion: '5.22.0' }), now: NOW });
  assert.notStrictEqual(beda.receipt.receiptId, issued.receipt.receiptId);
  // Urutan kunci pada objek sumber tidak boleh mengubah hash.
  const terbalik = receipts.issueReceipt({
    adoption: { canonicalAfter: 'b'.repeat(64), canonicalBefore: 'a'.repeat(64), targetVersion: '5.21.1', sourceVersion: '5.21.0', itemId: 'g-12', domain: 'grammar', patchId: 'patch-001', gateVersion: 'canonical-adoption-v1', status: 'adopt' },
    now: NOW
  });
  assert.strictEqual(terbalik.receipt.receiptId, issued.receipt.receiptId);
});

test('adopsi yang tidak mengubah apa pun tidak mendapat bukti perubahan', () => {
  const sama = receipts.issueReceipt({ adoption: adoption({ canonicalAfter: 'a'.repeat(64) }), now: NOW });
  assert.strictEqual(sama.ok, false);
  assert.strictEqual(sama.reason, 'canonical_unchanged');
});

test('subject tidak lengkap ditolak, bukan diisi kosong', () => {
  for (const key of ['patchId', 'domain', 'sourceVersion', 'targetVersion', 'canonicalBefore', 'canonicalAfter']) {
    const r = receipts.issueReceipt({ adoption: adoption({ [key]: '' }), now: NOW });
    assert.strictEqual(r.ok, false, `${key} kosong harus ditolak`);
    assert.ok(r.reason.startsWith('incomplete_subject'));
  }
});

test('receipt yang diubah setelah terbit terdeteksi', () => {
  assert.strictEqual(receipts.verifyReceipt(issued.receipt).ok, true);
  const dipalsu = JSON.parse(JSON.stringify(issued.receipt));
  dipalsu.subject.targetVersion = '9.9.9';
  assert.strictEqual(receipts.verifyReceipt(dipalsu).reason, 'receipt_tampered');
  const salahSchema = Object.assign({}, issued.receipt, { schema: 'lain' });
  assert.strictEqual(receipts.verifyReceipt(salahSchema).reason, 'invalid_contract');
});

const ledger1 = receipts.appendToLedger(receipts.freshLedger(), issued.receipt, '5.21.0');

test('entri pertama menyambung ke genesis dan rantainya sah', () => {
  assert.strictEqual(ledger1.ok, true);
  assert.strictEqual(ledger1.idempotent, false);
  assert.strictEqual(ledger1.ledger.entries.length, 1);
  assert.strictEqual(ledger1.ledger.entries[0].previousHash, receipts.GENESIS_HASH);
  assert.strictEqual(receipts.verifyLedger(ledger1.ledger).ok, true);
});

test('replay persis ditolak, dan penolakannya idempotent', () => {
  const cek = receipts.checkReplay(issued.receipt, ledger1.ledger, '5.21.0');
  assert.strictEqual(cek.ok, false);
  assert.strictEqual(cek.reason, 'replay_exact');
  // Menambahkan receipt yang sama tidak menggandakan ledger dan tidak dianggap kegagalan.
  const lagi = receipts.appendToLedger(ledger1.ledger, issued.receipt, '5.21.0');
  assert.strictEqual(lagi.ok, true);
  assert.strictEqual(lagi.idempotent, true);
  assert.strictEqual(lagi.ledger.entries.length, 1);
});

test('patch yang sama tidak bisa diadopsi ulang ke versi target lain', () => {
  // Inilah bentuk replay yang paling halus: payload terlihat baru karena versinya berbeda,
  // padahal patch-nya sudah pernah dipakai.
  const ulang = receipts.issueReceipt({
    adoption: adoption({ sourceVersion: '5.21.1', targetVersion: '5.21.2', canonicalBefore: 'b'.repeat(64), canonicalAfter: 'c'.repeat(64) }),
    now: NOW + 86400000
  });
  const cek = receipts.checkReplay(ulang.receipt, ledger1.ledger, '5.21.1');
  assert.strictEqual(cek.ok, false);
  assert.strictEqual(cek.reason, 'replay_stale_patch');
  assert.strictEqual(cek.adoptedTargetVersion, '5.21.1');
});

test('receipt dari versi sumber yang sudah usang ditolak', () => {
  const lain = receipts.issueReceipt({
    adoption: adoption({ patchId: 'patch-002', sourceVersion: '5.20.0', targetVersion: '5.20.1', canonicalBefore: 'b'.repeat(64), canonicalAfter: 'd'.repeat(64) }),
    now: NOW + 1000
  });
  const cek = receipts.checkReplay(lain.receipt, ledger1.ledger, '5.21.1');
  assert.strictEqual(cek.ok, false);
  assert.strictEqual(cek.reason, 'replay_out_of_order');
  assert.strictEqual(cek.expectedSourceVersion, '5.21.1');
});

test('adopsi berikutnya harus menyambung ke keadaan kanonik terakhir', () => {
  const bercabang = receipts.issueReceipt({
    adoption: adoption({ patchId: 'patch-003', sourceVersion: '5.21.1', targetVersion: '5.21.2', canonicalBefore: 'z'.repeat(64), canonicalAfter: 'e'.repeat(64) }),
    now: NOW + 2000
  });
  const cek = receipts.checkReplay(bercabang.receipt, ledger1.ledger, '5.21.1');
  assert.strictEqual(cek.ok, false);
  assert.strictEqual(cek.reason, 'canonical_not_contiguous');
  assert.strictEqual(cek.expectedBefore, 'b'.repeat(64));

  const menyambung = receipts.issueReceipt({
    adoption: adoption({ patchId: 'patch-003', sourceVersion: '5.21.1', targetVersion: '5.21.2', canonicalBefore: 'b'.repeat(64), canonicalAfter: 'e'.repeat(64) }),
    now: NOW + 3000
  });
  const hasil = receipts.appendToLedger(ledger1.ledger, menyambung.receipt, '5.21.1');
  assert.strictEqual(hasil.ok, true);
  assert.strictEqual(hasil.ledger.entries.length, 2);
  assert.strictEqual(receipts.verifyLedger(hasil.ledger).ok, true);
});

test('entri yang dihapus atau disisipkan di tengah memutus rantai', () => {
  const kedua = receipts.issueReceipt({
    adoption: adoption({ patchId: 'patch-004', sourceVersion: '5.21.1', targetVersion: '5.21.2', canonicalBefore: 'b'.repeat(64), canonicalAfter: 'f'.repeat(64) }),
    now: NOW + 4000
  });
  const dua = receipts.appendToLedger(ledger1.ledger, kedua.receipt, '5.21.1').ledger;
  const ketiga = receipts.issueReceipt({
    adoption: adoption({ patchId: 'patch-005', sourceVersion: '5.21.2', targetVersion: '5.21.3', canonicalBefore: 'f'.repeat(64), canonicalAfter: 'g'.repeat(64) }),
    now: NOW + 5000
  });
  const tiga = receipts.appendToLedger(dua, ketiga.receipt, '5.21.2').ledger;
  assert.strictEqual(receipts.verifyLedger(tiga).ok, true);

  // Hapus entri tengah: entri terakhir tidak lagi menyambung ke pendahulunya.
  const dipotong = { schema: tiga.schema, entries: [tiga.entries[0], tiga.entries[2]] };
  const rusak = receipts.verifyLedger(dipotong);
  assert.strictEqual(rusak.ok, false);
  assert.strictEqual(rusak.reason, 'chain_broken');
  assert.strictEqual(rusak.index, 1);

  // Ubah isi entri pertama: hash entri itu sendiri tidak lagi cocok.
  const diubah = JSON.parse(JSON.stringify(tiga));
  diubah.entries[0].receipt.issuedAt = new Date(NOW + 999999).toISOString();
  const cacat = receipts.verifyLedger(diubah);
  assert.strictEqual(cacat.ok, false);
  assert.strictEqual(cacat.index, 0);
});

test('ledger rusak menolak adopsi baru, bukan menerimanya diam-diam', () => {
  const diubah = JSON.parse(JSON.stringify(ledger1.ledger));
  diubah.entries[0].hash = 'f'.repeat(64);
  const baru = receipts.issueReceipt({
    adoption: adoption({ patchId: 'patch-006', sourceVersion: '5.21.1', targetVersion: '5.21.2', canonicalBefore: 'b'.repeat(64), canonicalAfter: 'h'.repeat(64) }),
    now: NOW + 6000
  });
  const cek = receipts.checkReplay(baru.receipt, diubah, '5.21.1');
  assert.strictEqual(cek.ok, false);
  assert.ok(cek.reason.startsWith('ledger_'), 'alasannya menyebut ledger, bukan receipt');
});

test('ledger asing atau rusak dipulihkan ke bentuk kosong, bukan melempar', () => {
  for (const bad of [null, undefined, {}, { schema: 'lain', entries: [] }, { schema: receipts.LEDGER_SCHEMA, entries: 'bukan array' }]) {
    const l = receipts.sanitizeLedger(bad);
    assert.strictEqual(l.schema, receipts.LEDGER_SCHEMA);
    assert.deepStrictEqual(l.entries, []);
  }
  assert.strictEqual(receipts.verifyLedger(null).ok, true, 'ledger kosong sah');
});

test('ledger dibatasi dan tidak menyimpan jawaban mentah', () => {
  assert.ok(receipts.LEDGER_LIMIT > 0 && receipts.LEDGER_LIMIT <= 1000);
  // Receipt hanya boleh berisi identitas dan hash, tidak pernah isi konten atau jawaban.
  // Flag privasi itu sendiri memang menyebut "raw", jadi yang diperiksa adalah bidangnya.
  const subject = ledger1.ledger.entries[0].receipt.subject;
  assert.deepStrictEqual(Object.keys(subject).sort(),
    ['canonicalAfter', 'canonicalBefore', 'domain', 'gateVersion', 'itemId', 'patchId', 'sourceVersion', 'targetVersion']);
  for (const value of Object.values(subject)) assert.strictEqual(typeof value, 'string');
  assert.ok(!/selectedAnswer|stem|options|explanation/i.test(JSON.stringify(subject)),
    'isi soal tidak pernah ikut ke receipt');
  assert.strictEqual(issued.receipt.privacy.rawAnswersIncluded, false);
  assert.strictEqual(issued.receipt.privacy.rawHistoryIncluded, false);
});

console.log('');
if (failures) { console.error('FIEZEL adoption receipt: FAIL (' + failures + ')'); process.exit(1); }
console.log('FIEZEL adoption receipt: PASS');
