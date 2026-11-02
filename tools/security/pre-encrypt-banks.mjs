#!/usr/bin/env node
/**
 * FIEZEL Build-Time Bank Pre-Encryption Tool
 *
 * Mengenkripsi bank soal mentah (grammar-templates.json, vocabulary-master.json, reading-bank.json, dll)
 * saat pipeline rilis CI GitHub Actions sebelum disinkronkan ke server publik cPanel.
 *
 * File di server publik TIDAK PERNAH tersaji sebagai teks JSON mentah, melainkan
 * amplop terenkripsi AES-256-GCM (_fz_vault: 1).
 *
 * PENGGUNAAN:
 *   node tools/security/pre-encrypt-banks.mjs --status
 *   node tools/security/pre-encrypt-banks.mjs --check
 *   node tools/security/pre-encrypt-banks.mjs --encrypt
 *   node tools/security/pre-encrypt-banks.mjs --decrypt
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '../..');

export const TARGET_BANKS = [
  'grammar-templates.json',
  'vocabulary-master.json',
  'reading-bank.json',
  'grammar-curriculum-v1.json',
  'cloze-bank-v1.json'
];

const VAULT_SALT = 'FIEZEL_CORE_VAULT_AES256_SALT_V1';
const VAULT_SEED = 'FZ-BRAIN-MASTER-2026-FITRA-SECURITY-SHIELD';

export function deriveKey(seed = VAULT_SEED, salt = VAULT_SALT) {
  return crypto.pbkdf2Sync(seed, salt, 10000, 32, 'sha256');
}

export function isEncryptedEnvelope(data) {
  if (!data || typeof data !== 'object') return false;
  return data._fz_vault === 1 && data._sig === 'FZV1' && typeof data.iv === 'string' && typeof data.data === 'string';
}

export function encryptPayload(data, key = deriveKey()) {
  const plaintext = typeof data === 'string' ? data : JSON.stringify(data);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  const combined = Buffer.concat([enc, tag]);

  return {
    _fz_vault: 1,
    _sig: 'FZV1',
    v: '1.0',
    ts: Date.now(),
    iv: iv.toString('base64'),
    data: combined.toString('base64')
  };
}

export function decryptPayload(envelope, key = deriveKey()) {
  if (!isEncryptedEnvelope(envelope)) {
    throw new Error('Invalid vault envelope schema.');
  }

  const iv = Buffer.from(envelope.iv, 'base64');
  const combined = Buffer.from(envelope.data, 'base64');

  if (combined.length < 16) {
    throw new Error('Ciphertext too short (missing auth tag).');
  }

  const tag = combined.subarray(combined.length - 16);
  const ciphertext = combined.subarray(0, combined.length - 16);

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);

  const dec = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  const text = dec.toString('utf8');

  try {
    return JSON.parse(text);
  } catch (_) {
    return text;
  }
}

export function processBankFile(relPath, mode = 'encrypt', rootDir = ROOT) {
  const fullPath = path.join(rootDir, relPath);
  if (!fs.existsSync(fullPath)) {
    return { ok: false, error: 'File not found' };
  }

  const raw = fs.readFileSync(fullPath, 'utf8');
  let json;
  try {
    json = JSON.parse(raw);
  } catch (e) {
    return { ok: false, error: 'Invalid JSON: ' + e.message };
  }

  const alreadyEncrypted = isEncryptedEnvelope(json);

  if (mode === 'encrypt') {
    if (alreadyEncrypted) {
      return { ok: true, status: 'already_encrypted', file: relPath };
    }
    const envelope = encryptPayload(json);
    fs.writeFileSync(fullPath, JSON.stringify(envelope), 'utf8');
    return { ok: true, status: 'encrypted', file: relPath, sizeBefore: raw.length, sizeAfter: JSON.stringify(envelope).length };
  }

  if (mode === 'decrypt') {
    if (!alreadyEncrypted) {
      return { ok: true, status: 'already_plain', file: relPath };
    }
    const plain = decryptPayload(json);
    fs.writeFileSync(fullPath, JSON.stringify(plain, null, 2), 'utf8');
    return { ok: true, status: 'decrypted', file: relPath };
  }

  return { ok: true, file: relPath, isEncrypted: alreadyEncrypted };
}

// CLI Runner
if (process.argv[1] && process.argv[1].endsWith('pre-encrypt-banks.mjs')) {
  const arg = process.argv[2] || '--status';
  console.log(`[FIEZEL PRE-ENCRYPT] Menjalankan mode: ${arg}`);

  let count = 0;
  for (const f of TARGET_BANKS) {
    if (arg === '--encrypt') {
      const res = processBankFile(f, 'encrypt');
      console.log(`  * ${f}: ${res.status}`);
      if (res.ok) count++;
    } else if (arg === '--decrypt') {
      const res = processBankFile(f, 'decrypt');
      console.log(`  * ${f}: ${res.status}`);
      if (res.ok) count++;
    } else {
      const full = path.join(ROOT, f);
      const exists = fs.existsSync(full);
      let isEnc = false;
      if (exists) {
        try {
          isEnc = isEncryptedEnvelope(JSON.parse(fs.readFileSync(full, 'utf8')));
        } catch (_) {}
      }
      console.log(`  * ${f}: ${exists ? (isEnc ? 'ENCRYPTED (VAULT)' : 'PLAINTEXT (DEV)') : 'MISSING'}`);
    }
  }

  console.log(`[FIEZEL PRE-ENCRYPT] Selesai. Total diproses: ${count}/${TARGET_BANKS.length}`);
}
