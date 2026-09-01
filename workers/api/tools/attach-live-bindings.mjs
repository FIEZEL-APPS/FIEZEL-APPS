#!/usr/bin/env node
/**
 * FIEZEL — tempel ID binding D1/KV asli ke wrangler.toml SEBELUM `wrangler deploy`
 * manual pertama kali (mis. setelah `fiezel-evidence` baru dibuat).
 *
 * KENAPA berkas ini ada, bukan tempel UUID langsung dari tangan:
 *  - `wrangler d1 list` mengembalikan `fiezel-core`, `fiezel-stats`, DAN JUGA
 *    `fiezel-core-staging`, `fiezel-stats-staging`. Kalau UUID staging tersalin
 *    ke binding produksi (CORE_DB/STATS_DB), gateway yang dipakai MURID akan
 *    menulis identitas dan sesi ke database staging — TANPA error, tanpa
 *    peringatan, deploy tetap "sukses". Pencocokan nama di `attach-live-bindings-core.mjs`
 *    memakai `===` (nama persis), bukan substring, sehingga "fiezel-core-staging"
 *    tidak akan pernah cocok dengan permintaan "fiezel-core". Diuji langsung di
 *    `attach-live-bindings-test.js` (root repo).
 *  - Placeholder yang tidak ada di akun (mis. EVIDENCE_DB sebelum dibuat) harus
 *    LEPAS bloknya, bukan gagal — aturan yang identik dengan
 *    `.github/workflows/deploy-api-worker.yml` (dan diuji bersama di
 *    `deploy-api-binding-guard-test.js`), supaya CI dan penempelan manual
 *    pertama tidak punya dua kebijakan berbeda.
 *  - Berkas ini TIDAK PERNAH commit `wrangler.toml` yang sudah terisi: ia
 *    menulis lalu MENCETAK PENGINGAT untuk mengembalikannya. `wrangler.toml`
 *    di repo sengaja template — lihat catatan di kepala berkas itu sendiri.
 *  - Logika substitusi/pelepasan blok TIDAK hidup di sini: ia ada di
 *    `attach-live-bindings-core.mjs` sebagai fungsi murni (tanpa exec/fs), supaya
 *    bisa diuji dengan data akun tiruan tanpa memanggil wrangler sungguhan.
 *    Berkas ini hanya I/O: panggil wrangler, baca/tulis wrangler.toml, cetak pesan.
 *
 * CARA PAKAI (dari folder workers/api, sesudah `npx wrangler@3 login`):
 *   cp wrangler.toml /tmp/wrangler.toml.asli
 *   node tools/attach-live-bindings.mjs
 *   # periksa dulu (grep di bawah TIDAK BOLEH mencetak apa pun):
 *   grep -n 'staging' wrangler.toml
 *   npx wrangler@3 deploy
 *   cp /tmp/wrangler.toml.asli wrangler.toml   # WAJIB — kembalikan ke template
 *   git status                                  # harus bersih
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { computeAttachedToml, AttachError } from './attach-live-bindings-core.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const TOML_PATH = join(here, '..', 'wrangler.toml');

function run(cmd, args) {
  return execFileSync(cmd, args, { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
}

function fail(msg) {
  console.error(`\nSTOP: ${msg}\n`);
  process.exit(1);
}

if (!existsSync(TOML_PATH)) fail(`wrangler.toml tidak ditemukan di ${TOML_PATH} — jalankan dari folder workers/api`);

console.log('Membaca daftar database D1 dari akun Cloudflare Anda (npx wrangler@3 d1 list)...');
let d1List;
try {
  d1List = JSON.parse(run('npx', ['wrangler@3', 'd1', 'list', '--json']));
} catch (e) {
  fail(
    "gagal menjalankan 'wrangler d1 list'. Kemungkinan belum login: jalankan dulu 'npx wrangler@3 login'.\n" +
    `Detail: ${e.message}`
  );
}

console.log('Membaca daftar KV namespace dari akun Cloudflare Anda (npx wrangler@3 kv namespace list)...');
let kvList;
try {
  kvList = JSON.parse(run('npx', ['wrangler@3', 'kv', 'namespace', 'list']));
} catch (e) {
  fail(`gagal menjalankan 'wrangler kv namespace list'. Detail: ${e.message}`);
}

const toml = readFileSync(TOML_PATH, 'utf8');
let result;
try {
  result = computeAttachedToml(toml, d1List, kvList);
} catch (e) {
  if (e instanceof AttachError) fail(e.message);
  throw e;
}

writeFileSync(TOML_PATH, result.toml);

console.log('\nSelesai. Yang diisi/dilepas:');
for (const line of result.applied) console.log('  ' + line);
console.log(
  '\nLANGKAH WAJIB SELANJUTNYA (jangan lewati):\n' +
  '  1. Periksa dulu:  grep -n "staging" wrangler.toml   -> HARUS TIDAK mencetak apa pun\n' +
  '  2. Deploy:         npx wrangler@3 deploy\n' +
  '  3. Kembalikan:     cp /tmp/wrangler.toml.asli wrangler.toml\n' +
  '  4. Pastikan bersih: git status   -> wrangler.toml TIDAK BOLEH muncul sebagai berubah\n'
);
