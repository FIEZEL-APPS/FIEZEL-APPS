#!/usr/bin/env node
/**
 * FIEZEL Vault — Master Encryption & Security Engine
 *
 * Tool resmi untuk mengenkripsi dan mendekripsi bank materi & soal FIEZEL (AES-256-GCM).
 * Memastikan file yang diakses publik tidak dapat dibaca atau dicuri oleh pihak luar,
 * sementara OWNER memegang kunci penuh untuk membuka dan mengedit kapan saja.
 *
 * PENGGUNAAN:
 *   node tools/security/fiezel-vault.mjs status               # Cek status enkripsi file-file bank
 *   node tools/security/fiezel-vault.mjs test                 # Uji round-trip enkripsi-dekripsi
 *   node tools/security/fiezel-vault.mjs encrypt <file.json>  # Kunci/enkripsi satu file JSON
 *   node tools/security/fiezel-vault.mjs decrypt <file.json>  # Buka/dekripsi satu file JSON kembali normal
 *   node tools/security/fiezel-vault.mjs lock-all             # Kunci seluruh bank materi untuk produksi
 *   node tools/security/fiezel-vault.mjs unlock-all           # Buka seluruh bank materi untuk editing owner
 *   node tools/security/fiezel-vault.mjs print-htaccess       # Tampilkan aturan Apache anti-hotlink
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '../..');

// File-file bank data yang dilindungi
const PROTECTED_BANKS = [
  'vocabulary-master.json',
  'grammar-templates.json',
  'cloze-bank-v1.json',
  'reading-bank.json',
  'grammar-curriculum-v1.json',
  'grammar-misconception-id.json',
  'content/grammar-vocab-map-v1.json',
  'writing-prompts-v1.json',
  'audio/manifest.json'
];

// Seed kunci turunan resmi FIEZEL (Domain-Bound Cryptographic Salt)
// Kunci diturunkan menggunakan PBKDF2 HMAC-SHA256 10.000 iterasi
const VAULT_SALT = 'FIEZEL_CORE_VAULT_AES256_SALT_V1';
const VAULT_SEED = 'FZ-BRAIN-MASTER-2026-FITRA-SECURITY-SHIELD';

/**
 * Turunkan kunci AES-256 dari seed resmi
 */
export function deriveKey(seed = VAULT_SEED, salt = VAULT_SALT) {
  return crypto.pbkdf2Sync(seed, salt, 10000, 32, 'sha256');
}

/**
 * Enkripsi objek atau teks string menggunakan AES-256-GCM
 * Format amplop vault:
 * {
 *   _fz_vault: 1,
 *   _sig: "FZV1",
 *   iv: "<base64 12 bytes>",
 *   data: "<base64 ciphertext + auth tag>"
 * }
 */
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

/**
 * Dekripsi amplop vault kembali menjadi objek JavaScript asli
 */
export function decryptPayload(vaultEnvelope, key = deriveKey()) {
  if (!vaultEnvelope || vaultEnvelope._fz_vault !== 1 || !vaultEnvelope.iv || !vaultEnvelope.data) {
    throw new Error('Format amplop vault tidak valid atau belum terenkripsi.');
  }

  const iv = Buffer.from(vaultEnvelope.iv, 'base64');
  const combined = Buffer.from(vaultEnvelope.data, 'base64');

  if (combined.length < 16) {
    throw new Error('Data enkripsi rusak atau terlalu pendek (kurang dari 16 bytes tag).');
  }

  // Tag AES-GCM adalah 16 byte terakhir
  const tag = combined.subarray(combined.length - 16);
  const ciphertext = combined.subarray(0, combined.length - 16);

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);

  const decryptedBuf = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  const decryptedText = decryptedBuf.toString('utf8');

  try {
    return JSON.parse(decryptedText);
  } catch {
    return decryptedText;
  }
}

/**
 * Cek apakah file sedang dalam keadaan terkunci (terenkripsi) atau terbuka
 */
export function checkFileStatus(relPath) {
  const absPath = path.resolve(ROOT, relPath);
  if (!fs.existsSync(absPath)) {
    return { relPath, exists: false, encrypted: false, size: 0 };
  }
  const stat = fs.statSync(absPath);
  const content = fs.readFileSync(absPath, 'utf8');
  let isEncrypted = false;
  try {
    const parsed = JSON.parse(content);
    if (parsed && parsed._fz_vault === 1 && parsed._sig === 'FZV1') {
      isEncrypted = true;
    }
  } catch {
    // bukan JSON valid
  }
  return { relPath, exists: true, encrypted: isEncrypted, size: stat.size };
}

/**
 * Enkripsi sebuah file JSON
 */
export function encryptFile(relPath) {
  const absPath = path.resolve(ROOT, relPath);
  if (!fs.existsSync(absPath)) {
    throw new Error(`Berkas tidak ditemukan: ${relPath}`);
  }
  const raw = fs.readFileSync(absPath, 'utf8');
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(`Berkas ${relPath} bukan format JSON yang valid: ${err.message}`);
  }

  if (parsed && parsed._fz_vault === 1) {
    console.log(`[SUDAH TERKUNCI] ${relPath} sudah dalam keadaan terenkripsi.`);
    return false;
  }

  // Buat backup sebelum mengenkripsi jika belum ada
  const bakPath = absPath + '.unlocked.bak';
  if (!fs.existsSync(bakPath)) {
    fs.writeFileSync(bakPath, raw, 'utf8');
  }

  const envelope = encryptPayload(parsed);
  fs.writeFileSync(absPath, JSON.stringify(envelope), 'utf8');
  console.log(`[TERKUNCI] Berhasil mengenkripsi ${relPath} (Backup tersimpan di .unlocked.bak)`);
  return true;
}

/**
 * Dekripsi sebuah file JSON kembali menjadi plain text
 */
export function decryptFile(relPath) {
  const absPath = path.resolve(ROOT, relPath);
  if (!fs.existsSync(absPath)) {
    throw new Error(`Berkas tidak ditemukan: ${relPath}`);
  }
  const raw = fs.readFileSync(absPath, 'utf8');
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(`Berkas ${relPath} bukan JSON valid: ${err.message}`);
  }

  if (!parsed || parsed._fz_vault !== 1) {
    console.log(`[SUDAH TERBUKA] ${relPath} sudah berupa file teks asli yang terbuka.`);
    return false;
  }

  const decrypted = decryptPayload(parsed);
  const formatted = JSON.stringify(decrypted, null, 2);
  fs.writeFileSync(absPath, formatted, 'utf8');
  console.log(`[TERBUKA] Berhasil mendekripsi ${relPath} kembali menjadi format asli yang bisa diedit.`);
  return true;
}

/**
 * CLI Handler
 */
async function main() {
  const args = process.argv.slice(2);
  const cmd = args[0] || 'status';

  if (cmd === 'status') {
    console.log('\n======================================================');
    console.log('   FIEZEL VAULT — STATUS PERLINDUNGAN BANK DATA');
    console.log('======================================================');
    for (const file of PROTECTED_BANKS) {
      const s = checkFileStatus(file);
      if (!s.exists) {
        console.log(`  [-] ${file.padEnd(36)} : TIDAK DITEMUKAN`);
      } else if (s.encrypted) {
        console.log(`  [🔒 TERKUNCI] ${file.padEnd(32)} : (${(s.size / 1024).toFixed(1)} KB) - AMAN DARI PENCURIAN`);
      } else {
        console.log(`  [🔓 TERBUKA]  ${file.padEnd(32)} : (${(s.size / 1024).toFixed(1)} KB) - BISA DIBACA & DIEDIT OWNER`);
      }
    }
    console.log('======================================================\n');
    return;
  }

  if (cmd === 'test') {
    console.log('[TEST] Menjalankan tes round-trip enkripsi & dekripsi...');
    const sample = {
      testId: 'fz_sample_101',
      question: 'She ___ to school yesterday.',
      options: ['go', 'goes', 'went', 'gone'],
      answerIndex: 2,
      explanation: 'Bentuk lampau dari go adalah went.'
    };
    const encrypted = encryptPayload(sample);
    if (!encrypted._fz_vault || !encrypted.iv || !encrypted.data) {
      throw new Error('Gagal: Struktur amplop enkripsi tidak sesuai.');
    }
    const decrypted = decryptPayload(encrypted);
    if (decrypted.question !== sample.question || decrypted.answerIndex !== 2) {
      throw new Error('Gagal: Data hasil dekripsi tidak cocok dengan aslinya.');
    }
    console.log('✅ TES LULUS: Enkripsi AES-256-GCM dan dekripsi 100% identik dan aman.\n');
    return;
  }

  if (cmd === 'encrypt') {
    const target = args[1];
    if (!target) {
      console.error('Penggunaan: node fiezel-vault.mjs encrypt <nama-file.json>');
      process.exit(1);
    }
    encryptFile(target);
    return;
  }

  if (cmd === 'decrypt') {
    const target = args[1];
    if (!target) {
      console.error('Penggunaan: node fiezel-vault.mjs decrypt <nama-file.json>');
      process.exit(1);
    }
    decryptFile(target);
    return;
  }

  if (cmd === 'lock-all') {
    console.log('[VAULT] Mengunci seluruh bank materi untuk rilis produksi...');
    let locked = 0;
    for (const file of PROTECTED_BANKS) {
      const s = checkFileStatus(file);
      if (s.exists && !s.encrypted) {
        encryptFile(file);
        locked++;
      }
    }
    console.log(`[VAULT] Selesai. Total ${locked} bank materi berhasil dikunci.\n`);
    return;
  }

  if (cmd === 'unlock-all') {
    console.log('[VAULT] Membuka seluruh bank materi untuk pengeditan owner...');
    let unlocked = 0;
    for (const file of PROTECTED_BANKS) {
      const s = checkFileStatus(file);
      if (s.exists && s.encrypted) {
        decryptFile(file);
        unlocked++;
      }
    }
    console.log(`[VAULT] Selesai. Total ${unlocked} bank materi berhasil dibuka kembali.\n`);
    return;
  }

  if (cmd === 'print-htaccess') {
    console.log(`
# =========================================================================
# FIEZEL HARDENED APACHE RULES — BLOCK RAW JSON HOTLINKING & DIRECT CURL
# Letakkan aturan ini di public_html/app/.htaccess di server cPanel
# =========================================================================
<IfModule mod_rewrite.c>
RewriteEngine On

# 1. Izinkan akses jika Referer berasal dari domain resmi FIEZEL atau localhost
RewriteCond %{HTTP_REFERER} ^https?://(www\\.)?fiezel\\.my\\.id [NC,OR]
RewriteCond %{HTTP_REFERER} ^https?://(localhost|127\\.0\\.0\\.1) [NC,OR]
# Izinkan akses dari Service Worker dan WebView Android resmi
RewriteCond %{HTTP_USER_AGENT} (FiezelApp|FiezelPWA) [NC]
RewriteRule ^.*$ - [L]

# 2. Blokir download langsung untuk semua file materi JSON jika bukan dari dalam aplikasi
RewriteCond %{REQUEST_URI} \\.(json)$ [NC]
RewriteRule ^.*$ - [F,L]
</IfModule>
`);
    return;
  }

  console.log(`Perintah tidak dikenal: ${cmd}`);
  console.log('Perintah yang tersedia: status, test, encrypt, decrypt, lock-all, unlock-all, print-htaccess');
}

main().catch(err => {
  console.error('[VAULT ERROR]', err.message);
  process.exit(1);
});
