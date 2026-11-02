#!/usr/bin/env node
/**
 * Uji Mutu FIEZEL Security Hardening (Target Skor 85+)
 *
 * Menguji 4 pilar keamanan tinggi:
 * 1. Pre-Encryption di Hulu (tools/security/pre-encrypt-banks.mjs)
 * 2. Dynamic Ephemeral Session Key Exchange & Device-Bound Salt (features/security/fiezel-offline-vault.js)
 * 3. Server-Side Cryptographic Receipt & Reconciliation (features/security/fiezel-exam-verifier.js)
 * 4. Content Security Policy (CSP), HSTS & Permissions-Policy (website/.htaccess)
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

async function runTests() {
  console.log('\n--- Menjalankan Uji Mutu FIEZEL Security Hardening (Rating 85+) ---');

  // Load modules dynamically
  const preEncryptPath = path.join(ROOT, 'tools', 'security', 'pre-encrypt-banks.mjs');
  const vaultPath = path.join(ROOT, 'features', 'security', 'fiezel-offline-vault.js');
  const verifierPath = path.join(ROOT, 'features', 'security', 'fiezel-exam-verifier.js');

  const { encryptPayload, decryptPayload, isEncryptedEnvelope } = await import(pathToFileURL(preEncryptPath).href);
  const vaultModule = await import(pathToFileURL(vaultPath).href);
  const FiezelOfflineVault = vaultModule.default || vaultModule;
  const verifierModule = await import(pathToFileURL(verifierPath).href);
  const FiezelExamVerifier = verifierModule.default || verifierModule;

  // Test 1: Pre-Encryption Round-Trip
  {
    const sampleBank = {
      schema: 'fiezel-test-bank',
      count: 2,
      templates: [
        { id: 't1', prompt: 'Saya makan roti', answer: 'I eat bread' },
        { id: 't2', prompt: 'Dia membaca buku', answer: 'She reads a book' }
      ]
    };

    const envelope = encryptPayload(sampleBank);
    assert.strictEqual(envelope._fz_vault, 1, 'Envelope must declare _fz_vault = 1');
    assert.strictEqual(envelope._sig, 'FZV1', 'Envelope must have signature FZV1');
    assert.ok(isEncryptedEnvelope(envelope), 'Must be recognized as valid vault envelope');

    const decrypted = decryptPayload(envelope);
    assert.deepStrictEqual(decrypted, sampleBank, 'Decrypted bank must match original');
    console.log('PASS 1: Pre-Encryption AES-256-GCM envelope round-trip valid');
  }

  // Test 2: Dynamic Ephemeral Session Key Management
  {
    const tempKey = 'SESSION-KEY-TEMP-TEST-XYZ-123';
    FiezelOfflineVault.setDynamicSessionKey(tempKey, 5000);
    assert.strictEqual(FiezelOfflineVault.getDynamicSessionKey(), tempKey, 'Dynamic session key must be retrievable in RAM');

    FiezelOfflineVault.clearDynamicSessionKey();
    assert.strictEqual(FiezelOfflineVault.getDynamicSessionKey(), null, 'Dynamic session key must be null after clearing');
    console.log('PASS 2: Dynamic Ephemeral Session Key storage & cleanup valid');
  }

  // Test 3: Device-Bound Salt Derivation
  {
    const salt1 = FiezelOfflineVault.getDeviceBoundSalt('learner-uuid-1111');
    const salt2 = FiezelOfflineVault.getDeviceBoundSalt('learner-uuid-2222');
    assert.notStrictEqual(salt1, salt2, 'Different learner UUIDs must produce distinct salts');
    assert.ok(salt1.includes('learner-uuid-111'), 'Salt must contain sanitized UUID prefix');
    console.log('PASS 3: Device-Bound Cryptographic Salt isolation valid');
  }

  // Test 4: Cryptographic Exam Receipt Generation
  {
    const submission = FiezelExamVerifier.createSubmission({
      ownerUuid: 'TEST-USER-UUID',
      level: 'A2',
      score: 18,
      total: 20,
      accuracy: 90
    });

    assert.strictEqual(submission.passed, true, 'Score 18/20 (90%) must pass threshold (80%)');
    assert.strictEqual(submission.level, 'A2', 'Level must match A2');

    const onlineReceipt = FiezelExamVerifier.signReceipt(submission, true);
    assert.strictEqual(onlineReceipt.status, 'verified_server', 'Online exam must yield verified_server receipt');
    assert.ok(onlineReceipt.signature, 'Receipt must carry cryptographic signature');

    const verification = FiezelExamVerifier.verifyReceipt(onlineReceipt, 'TEST-USER-UUID');
    assert.strictEqual(verification.ok, true, 'Valid receipt must verify ok = true');
    assert.strictEqual(verification.verifiedLevel, 'A2', 'Verified level must match A2');
    assert.strictEqual(verification.isServerVerified, true, 'isServerVerified must be true');
    console.log('PASS 4: Cryptographic Exam Receipt generation & verification valid');
  }

  // Test 5: Exam Receipt Tamper Resistance
  {
    const submission = FiezelExamVerifier.createSubmission({
      ownerUuid: 'TEST-USER-UUID',
      level: 'B1',
      score: 19,
      total: 20,
      accuracy: 95
    });

    const receipt = FiezelExamVerifier.signReceipt(submission, true);

    // Tamper 1: change level from B1 to C1
    const tamperedLevel = { ...receipt, level: 'C1' };
    const checkTamperedLevel = FiezelExamVerifier.verifyReceipt(tamperedLevel, 'TEST-USER-UUID');
    assert.strictEqual(checkTamperedLevel.ok, false, 'Tampered level must be rejected');
    assert.strictEqual(checkTamperedLevel.reason, 'tampered_signature', 'Reason must be tampered_signature');

    // Tamper 2: mismatch owner
    const checkTamperedOwner = FiezelExamVerifier.verifyReceipt(receipt, 'ATTACKER-UUID');
    assert.strictEqual(checkTamperedOwner.ok, false, 'Owner mismatch must be rejected');
    assert.strictEqual(checkTamperedOwner.reason, 'owner_mismatch', 'Reason must be owner_mismatch');
    console.log('PASS 5: Anti-Cheat & Tamper Resistance on Level Exam receipts valid');
  }

  // Test 6: Deferred Reconciliation of Provisional Offline Exams
  {
    const submission = FiezelExamVerifier.createSubmission({
      ownerUuid: 'RURAL-STUDENT-OFFLINE',
      level: 'A2',
      score: 19,
      total: 20,
      accuracy: 95
    });

    // Offline student passes exam
    const offlineReceipt = FiezelExamVerifier.signReceipt(submission, false);
    assert.strictEqual(offlineReceipt.status, 'provisional_offline', 'Offline attempt must be marked provisional_offline');

    // When connection is restored, reconcile with server
    const reconciliation = FiezelExamVerifier.reconcileProvisionalReceipt(offlineReceipt);
    assert.strictEqual(reconciliation.ok, true, 'Reconciliation must succeed');
    assert.strictEqual(reconciliation.reconciledReceipt.status, 'verified_server', 'Upgraded receipt must be verified_server');
    console.log('PASS 6: Offline Provisional Exam deferred reconciliation valid');
  }

  // Test 7: Content Security Policy & Security Headers in .htaccess
  {
    const htaccessContent = fs.readFileSync(path.join(ROOT, 'website', '.htaccess'), 'utf8');
    assert.ok(htaccessContent.includes('Content-Security-Policy'), 'Must set Content-Security-Policy header');
    assert.ok(htaccessContent.includes("default-src 'self'"), 'CSP must define default-src');
    assert.ok(htaccessContent.includes("object-src 'none'"), 'CSP must disallow plugins via object-src none');
    assert.ok(htaccessContent.includes('Strict-Transport-Security'), 'Must set Strict-Transport-Security header');
    assert.ok(htaccessContent.includes('Permissions-Policy'), 'Must set Permissions-Policy header');
    console.log('PASS 7: CSP, HSTS & Permissions-Policy headers in .htaccess valid');
  }

  // Test 8: Shell Precache and Registration Integrity
  {
    const indexHtml = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    assert.ok(indexHtml.includes('features/security/fiezel-exam-verifier.js'), 'index.html must register fiezel-exam-verifier.js');

    const swJs = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
    assert.ok(swJs.includes('./features/security/fiezel-exam-verifier.js'), 'sw.js ASSETS must precache fiezel-exam-verifier.js');
    console.log('PASS 8: index.html & sw.js precache registration valid');
  }

  console.log('\nHASIL: 8 lulus, 0 gagal. FIEZEL Security Hardening (Rating 85+) 100% HIJAU!\n');
}

runTests().catch(err => {
  console.error('[TEST ERROR]', err);
  process.exit(1);
});
