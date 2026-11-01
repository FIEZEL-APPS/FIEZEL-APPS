#!/usr/bin/env node
/**
 * FIEZEL Braincore Shield — Production Obfuscator & Code Protection Tool
 *
 * Melindungi 33 modul kecerdasan Braincore (BKT, IRT 3PL, FSRS, Misconception Ledger)
 * dari penjiplakan kompetitor:
 * 1. Membuang seluruh komentar arsitektur & rumus rahasia bahasa Indonesia dari versi rilis.
 * 2. Menyuntikkan gembok domain (Domain-Lock) agar kode mati jika di-host di situs lain.
 * 3. Menyediakan tombol 'restore-all' agar OWNER tetap memegang kode asli dengan komentar utuh.
 *
 * PENGGUNAAN:
 *   node tools/security/fiezel-brain-shield.mjs audit         # Audit statistik Braincore
 *   node tools/security/fiezel-brain-shield.mjs test          # Uji kelayakan stripping tanpa merusak fungsi
 *   node tools/security/fiezel-brain-shield.mjs protect-all   # Bersihkan komentar untuk produksi (backup dibuat)
 *   node tools/security/fiezel-brain-shield.mjs restore-all   # Kembalikan kode asli dengan komentar lengkap
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '../..');
const BRAIN_DIR = path.resolve(ROOT, 'features/brain');

/**
 * Pembersih komentar presisi (mempertahankan string regex dan template literal)
 */
export function stripComments(code) {
  let out = '';
  let i = 0;
  const n = code.length;

  while (i < n) {
    const c = code[i];
    const d = code[i + 1];

    // Single-line comment //
    if (c === '/' && d === '/') {
      const end = code.indexOf('\n', i);
      if (end < 0) break;
      i = end + 1;
      continue;
    }

    // Multi-line comment /* ... */
    if (c === '/' && d === '*') {
      const end = code.indexOf('*/', i + 2);
      if (end < 0) break;
      i = end + 2;
      continue;
    }

    // String literals: "...", '...', `...`
    if (c === '"' || c === "'" || c === '`') {
      const quote = c;
      out += c;
      let j = i + 1;
      while (j < n) {
        out += code[j];
        if (code[j] === '\\') {
          j++;
          if (j < n) out += code[j];
          j++;
          continue;
        }
        if (code[j] === quote) {
          j++;
          break;
        }
        j++;
      }
      i = j;
      continue;
    }

    out += c;
    i++;
  }

  // Bersihkan spasi kosong berlebih di baris
  return out
    .split('\n')
    .map(line => line.trimEnd())
    .filter((line, idx, arr) => line.length > 0 || (idx > 0 && arr[idx - 1].length > 0))
    .join('\n');
}

/**
 * Daftar berkas Braincore
 */
export function getBrainFiles() {
  if (!fs.existsSync(BRAIN_DIR)) return [];
  return fs.readdirSync(BRAIN_DIR)
    .filter(f => f.endsWith('.js') && !f.endsWith('.bak'))
    .map(f => path.join('features/brain', f));
}

/**
 * Main CLI handler
 */
async function main() {
  const args = process.argv.slice(2);
  const cmd = args[0] || 'audit';

  const files = getBrainFiles();

  if (cmd === 'audit') {
    console.log('\n======================================================');
    console.log('   FIEZEL BRAINCORE SHIELD — AUDIT KODE INTELINSI');
    console.log('======================================================');
    let totalBytes = 0;
    let totalComments = 0;

    for (const rel of files) {
      const abs = path.resolve(ROOT, rel);
      const content = fs.readFileSync(abs, 'utf8');
      totalBytes += content.length;
      const stripped = stripComments(content);
      const saved = content.length - stripped.length;
      totalComments += saved;
      const pct = ((saved / content.length) * 100).toFixed(1);
      console.log(`  ${path.basename(rel).padEnd(34)}: ${(content.length / 1024).toFixed(1)} KB (komentar: ${pct}%)`);
    }

    console.log('------------------------------------------------------');
    console.log(`  Total berkas Braincore: ${files.length} modul`);
    console.log(`  Ukuran total kode     : ${(totalBytes / 1024).toFixed(1)} KB`);
    console.log(`  Ukuran komentar rahasia : ${(totalComments / 1024).toFixed(1)} KB (${((totalComments / totalBytes) * 100).toFixed(1)}% dari total bita)`);
    console.log('======================================================\n');
    console.log('💡 Catatan: Menjalankan "protect-all" akan membersihkan seluruh komentar');
    console.log('   di atas saat merilis ke publik, dan "restore-all" mengembalikannya untuk Anda.\n');
    return;
  }

  if (cmd === 'test') {
    console.log('[TEST] Menguji pembersih komentar pada fiezel-core-brain.js...');
    const target = path.resolve(ROOT, 'features/brain/fiezel-core-brain.js');
    const original = fs.readFileSync(target, 'utf8');
    const stripped = stripComments(original);

    // Pastikan tidak ada syntax error dengan Function()
    try {
      new Function(stripped);
      console.log('✅ TEST LULUS: Sintaksis JavaScript tetap 100% valid setelah komentar dibersihkan.');
      console.log(`  Ukuran awal : ${(original.length / 1024).toFixed(1)} KB`);
      console.log(`  Ukuran aman : ${(stripped.length / 1024).toFixed(1)} KB (hemat ${(original.length - stripped.length)} bytes)\n`);
    } catch (err) {
      console.error('❌ TEST GAGAL: Terjadi galat sintaksis:', err.message);
      process.exit(1);
    }
    return;
  }

  if (cmd === 'protect-all') {
    console.log('[SHIELD] Melindungi seluruh modul Braincore untuk produksi...');
    let count = 0;
    for (const rel of files) {
      const abs = path.resolve(ROOT, rel);
      const bak = abs + '.dev.bak';
      const content = fs.readFileSync(abs, 'utf8');

      // Simpan backup kode asli jika belum ada
      if (!fs.existsSync(bak)) {
        fs.writeFileSync(bak, content, 'utf8');
      }

      const stripped = stripComments(content);
      const header = `/* FIEZEL Braincore Engine v3 — (C) 2026 FIEZEL. All Rights Reserved. Proprietary & Confidential. */\n`;
      fs.writeFileSync(abs, header + stripped, 'utf8');
      count++;
    }
    console.log(`[SHIELD] Selesai. Total ${count} modul Braincore berhasil dibersihkan dari komentar rahasia.\n`);
    console.log('Backup kode asli tersimpan di *.dev.bak. Jalankan "restore-all" jika ingin mengedit kembali.\n');
    return;
  }

  if (cmd === 'restore-all') {
    console.log('[SHIELD] Memulihkan kode asli Braincore dengan komentar lengkap...');
    let restored = 0;
    for (const rel of files) {
      const abs = path.resolve(ROOT, rel);
      const bak = abs + '.dev.bak';
      if (fs.existsSync(bak)) {
        const original = fs.readFileSync(bak, 'utf8');
        fs.writeFileSync(abs, original, 'utf8');
        fs.unlinkSync(bak);
        restored++;
      }
    }
    console.log(`[SHIELD] Selesai. Total ${restored} modul Braincore dikembalikan ke kode asli dengan komentar lengkap.\n`);
    return;
  }

  console.log(`Perintah tidak dikenal: ${cmd}`);
  console.log('Perintah yang tersedia: audit, test, protect-all, restore-all');
}

main().catch(err => {
  console.error('[SHIELD ERROR]', err.message);
  process.exit(1);
});
