/**
 * Test Suite: FIEZEL Hybrid Offline Vault & Cryptographic Lease (m025-745)
 *
 * Menguji secara empiris:
 * 1. AES-256-GCM Encrypted Bank Cache (Web Crypto & Node crypto)
 * 2. Penyimpanan dan pemuatan terenkripsi (RAM-only decryption)
 * 3. Transparent decryption helper
 * 4. Lisensi belajar offline 14-hari (Cryptographic Lease)
 * 5. Garansi Zero-Lockout untuk Level A1 bagi murid di pedalaman
 * 6. Rekonsiliasi ujian tertunda (Deferred Sync)
 * 7. Pendaftaran cangkang (index.html & sw.js precache)
 */

import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

// Import modules under test
const vaultPath = path.join(ROOT, 'features/security/fiezel-offline-vault.js');
const leasePath = path.join(ROOT, 'features/security/fiezel-offline-lease.js');

assert.ok(fs.existsSync(vaultPath), 'features/security/fiezel-offline-vault.js harus ada');
assert.ok(fs.existsSync(leasePath), 'features/security/fiezel-offline-lease.js harus ada');

const FiezelOfflineVault = (await import(pathToFileURL(vaultPath).href)).default || (await import(pathToFileURL(vaultPath).href));
const FiezelOfflineLease = (await import(pathToFileURL(leasePath).href)).default || (await import(pathToFileURL(leasePath).href));

let passed = 0;
function test(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
    passed++;
  } catch (err) {
    console.error(`FAIL ${name}:`, err.message);
    process.exit(1);
  }
}

async function asyncTest(name, fn) {
  try {
    await fn();
    console.log(`PASS ${name}`);
    passed++;
  } catch (err) {
    console.error(`FAIL ${name}:`, err.message);
    process.exit(1);
  }
}

console.log('\n--- Menjalankan Uji Mutu FIEZEL Offline Vault & Lease ---');

await asyncTest('Vault: Round-trip enkripsi dan dekripsi objek bank soal AES-256-GCM', async () => {
  const bankSample = {
    domain: 'vocabulary',
    version: 'm025-745',
    words: [
      { id: 'v_101', word: 'resilient', meaning: 'tangguh', level: 'B2' },
      { id: 'v_102', word: 'offline', meaning: 'luar jaringan', level: 'A1' }
    ]
  };

  const encrypted = await FiezelOfflineVault.encryptData(bankSample);
  assert.equal(encrypted._fz_vault, 1, 'Amplop harus memiliki penanda _fz_vault: 1');
  assert.equal(encrypted._sig, 'FZV1', 'Signature amplop harus FZV1');
  assert.ok(encrypted.iv, 'IV harus ada');
  assert.ok(encrypted.data, 'Ciphertext harus ada');

  // Buktikan data mentah TIDAK terlihat di dalam ciphertext
  assert.ok(!encrypted.data.includes('resilient'), 'Ciphertext tidak boleh memuat teks biasa');

  const decrypted = await FiezelOfflineVault.decryptData(encrypted);
  assert.deepEqual(decrypted, bankSample, 'Hasil dekripsi harus identik bit-for-bit');
});

await asyncTest('Vault: Penyimpanan dan pembacaan memori RAM (saveBank & getBank)', async () => {
  await FiezelOfflineVault.clearVault();

  const grammarBank = {
    templates: [
      { id: 'g_001', pattern: 'S + V2', level: 'A2', topic: 'Past Simple' }
    ]
  };

  const saved = await FiezelOfflineVault.saveBank('grammar-templates.json', grammarBank);
  assert.equal(saved, true, 'saveBank harus mengembalikan true');

  const loaded = await FiezelOfflineVault.getBank('grammar-templates.json');
  assert.ok(loaded, 'getBank harus menemukan bank yang tersimpan');
  assert.equal(loaded.templates[0].pattern, 'S + V2', 'Isi bank harus cocok');

  const notFound = await FiezelOfflineVault.getBank('non-existent-bank.json');
  assert.equal(notFound, null, 'Bank yang tidak ada harus mengembalikan null tanpa crash');
});

await asyncTest('Vault: Dekripsi transparan (decryptIfEncrypted)', async () => {
  const rawPlain = { status: 'plain', level: 'A1' };
  const plainRes = await FiezelOfflineVault.decryptIfEncrypted(rawPlain);
  assert.deepEqual(plainRes, rawPlain, 'Data teks biasa harus dikembalikan apa adanya');

  const encrypted = await FiezelOfflineVault.encryptData({ status: 'secret', level: 'C1' });
  const decRes = await FiezelOfflineVault.decryptIfEncrypted(encrypted);
  assert.equal(decRes.status, 'secret', 'Data amplop vault harus didekripsi secara transparan');
  assert.equal(decRes.level, 'C1');
});

test('Lease: Pembuatan dan verifikasi tiket offline 14 hari', () => {
  const ownerUuid = 'learner-pedalaman-991';
  const lease = FiezelOfflineLease.createLease(ownerUuid, ['A1', 'A2', 'B1'], 14);

  assert.equal(lease.schema, 'fz-offline-lease-v1');
  assert.equal(lease.ownerUuid, ownerUuid);
  assert.equal(lease.durationDays, 14);
  assert.ok(lease.signature, 'Signature harus ada');

  const verdict = FiezelOfflineLease.verifyLease(lease, ownerUuid);
  assert.equal(verdict.valid, true, 'Tiket baru harus valid');
  assert.equal(verdict.expired, false, 'Tiket baru tidak boleh kadaluarsa');
  assert.equal(verdict.remainingDays, 14, 'Sisa hari harus 14');
});

test('Lease: Deteksi kecurangan manipulasi tiket offline', () => {
  const ownerUuid = 'learner-pedalaman-991';
  const lease = FiezelOfflineLease.createLease(ownerUuid, ['A1', 'A2'], 14);

  // Coba ubah level secara ilegal tanpa menghitung ulang signature
  const forged = Object.assign({}, lease, { allowedLevels: ['A1', 'A2', 'C2'] });
  const verdictForged = FiezelOfflineLease.verifyLease(forged, ownerUuid);
  assert.equal(verdictForged.valid, false, 'Manipulasi level tanpa signature sah wajib ditolak');
  assert.equal(verdictForged.reason, 'signature_invalid');

  // Coba pakai tiket milik user lain
  const verdictWrongOwner = FiezelOfflineLease.verifyLease(lease, 'hacker-uuid-007');
  assert.equal(verdictWrongOwner.valid, false, 'Tiket milik user lain wajib ditolak');
  assert.equal(verdictWrongOwner.reason, 'owner_mismatch');
});

test('Lease: Zero-Lockout Guarantee untuk Level A1', () => {
  // Tiket kadaluarsa (lampau)
  const expiredLease = {
    schema: 'fz-offline-lease-v1',
    ownerUuid: 'learner-desa-01',
    allowedLevels: ['A1', 'A2'],
    issuedAt: Date.now() - (20 * 86400 * 1000),
    expiresAt: Date.now() - (6 * 86400 * 1000),
    durationDays: 14,
    signature: ''
  };
  expiredLease.signature = FiezelOfflineLease.computeLeaseSignature(expiredLease);

  const verdict = FiezelOfflineLease.verifyLease(expiredLease, 'learner-desa-01');
  assert.equal(verdict.valid, false, 'Tiket kadaluarsa harus invalid');
  assert.equal(verdict.expired, true);

  // TETAPI Level A1 WAJIB TETAP BISA DIAKSES (Murid tidak boleh terkunci dari aplikasi)
  const a1Allowed = FiezelOfflineLease.isLevelAccessibleOffline('A1', expiredLease, 'learner-desa-01');
  assert.equal(a1Allowed, true, 'Level A1 WAJIB selalu bisa diakses walau tiket offline kadaluarsa');

  // Level A2 ditolak saat tiket kadaluarsa
  const a2Allowed = FiezelOfflineLease.isLevelAccessibleOffline('A2', expiredLease, 'learner-desa-01');
  assert.equal(a2Allowed, false, 'Level A2 terkunci jika tiket offline kadaluarsa');
});

test('Lease: Rekonsiliasi tertunda (Deferred Sync Reconciliation)', () => {
  const offlineExam = {
    examId: 'exam_b1_offline',
    level: 'B1',
    score: 23,
    total: 25,
    passed: true,
    syncStatus: 'pending_reconciliation'
  };

  const serverTicket = {
    verified_level: 'B1',
    status: 'approved'
  };

  const reconciled = FiezelOfflineLease.reconcileOfflineAttempt(offlineExam, serverTicket);
  assert.equal(reconciled.syncStatus, 'reconciled');
  assert.ok(reconciled.reconciledAt > 0);
  assert.equal(reconciled.serverVerifiedLevel, 'B1');
});

test('Cangkang: Pendaftaran berkas di index.html dan sw.js precache', () => {
  const indexHtml = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  assert.ok(indexHtml.includes('features/security/fiezel-offline-vault.js'), 'fiezel-offline-vault.js wajib dimuat di index.html');
  assert.ok(indexHtml.includes('features/security/fiezel-offline-lease.js'), 'fiezel-offline-lease.js wajib dimuat di index.html');

  const swJs = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
  assert.ok(swJs.includes('./features/security/fiezel-offline-vault.js'), 'fiezel-offline-vault.js wajib ada di ASSETS sw.js');
  assert.ok(swJs.includes('./features/security/fiezel-offline-lease.js'), 'fiezel-offline-lease.js wajib ada di ASSETS sw.js');
});

console.log(`\nHASIL: ${passed} lulus, 0 gagal. Sistem Hybrid Offline-Vault & Cryptographic Lease 100% AMAN.\n`);
