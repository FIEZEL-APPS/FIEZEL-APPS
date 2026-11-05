#!/usr/bin/env node
/**
 * Test Suite: FIEZEL Vault Encryption & Runtime Decryption Interoperability
 */

const assert = require('assert');
const path = require('path');

async function runTests() {
  console.log('--- TEST FIEZEL VAULT ENGINE ---');

  // 1. Load Node.js tool module
  const vaultModule = await import('../tools/security/fiezel-vault.mjs');
  const { encryptPayload, decryptPayload } = vaultModule;

  // 2. Load runtime module
  const runtime = require('../tools/security/fiezel-vault-runtime.js');

  const testData = {
    testId: 'fz_vault_001',
    word: 'perseverance',
    translation: 'kegigihan',
    distractors: ['kemalasan', 'keraguan', 'kegagalan'],
    masteryScore: 0.88,
    nested: {
      tags: ['jlpt-n3', 'academic'],
      active: true
    }
  };

  // TEST 1: Plain data passthrough in runtime
  console.log('Test 1: Passthrough data tidak terenkripsi...');
  const passRes = await runtime.unpack(testData);
  assert.deepStrictEqual(passRes, testData, 'Runtime harus mengembalikan data asli tanpa perubahan jika belum terenkripsi');
  assert.strictEqual(runtime.isVault(testData), false);
  console.log('  -> PASS');

  // TEST 2: Enkripsi dengan tools/security/fiezel-vault.mjs
  console.log('Test 2: Enkripsi amplop AES-256-GCM...');
  const encrypted = encryptPayload(testData);
  assert.strictEqual(encrypted._fz_vault, 1);
  assert.strictEqual(encrypted._sig, 'FZV1');
  assert(typeof encrypted.iv === 'string');
  assert(typeof encrypted.data === 'string');
  assert.strictEqual(runtime.isVault(encrypted), true);
  console.log('  -> PASS');

  // TEST 3: Dekripsi dengan tools/security/fiezel-vault.mjs
  console.log('Test 3: Dekripsi dengan Node CLI tool...');
  const decryptedNode = decryptPayload(encrypted);
  assert.deepStrictEqual(decryptedNode, testData, 'Data hasil dekripsi Node harus sama persis dengan aslinya');
  console.log('  -> PASS');

  // TEST 4: Dekripsi dengan runtime peramban (WebCrypto)
  console.log('Test 4: Dekripsi dengan runtime browser (WebCrypto API)...');
  const decryptedRuntime = await runtime.unpack(encrypted);
  assert.deepStrictEqual(decryptedRuntime, testData, 'Data hasil dekripsi WebCrypto harus sama persis dengan aslinya');
  console.log('  -> PASS');

  // TEST 5: Deteksi manipulasi data (Anti-Tamper GCM Auth Tag)
  console.log('Test 5: Integritas manipulasi data (Tamper detection)...');
  const tampered = JSON.parse(JSON.stringify(encrypted));
  // Rusak satu karakter di data biner (selalu ubah karakter, jangan ganti dengan karakter yang sama)
  const flipChar = tampered.data[10] === 'X' ? 'Y' : 'X';
  tampered.data = tampered.data.substring(0, 10) + flipChar + tampered.data.substring(11);
  let failed = false;
  try {
    await runtime.unpack(tampered);
  } catch (err) {
    failed = true;
  }
  assert.strictEqual(failed, true, 'Manipulasi ciphertext harus ditolak oleh verifikasi tag AES-GCM');
  console.log('  -> PASS');

  console.log('\n✅ SEMUA 5 TES FIEZEL VAULT BERHASIL (100% HIJAU)!\n');
}

runTests().catch(err => {
  console.error('❌ TES FIEZEL VAULT GAGAL:', err);
  process.exit(1);
});
