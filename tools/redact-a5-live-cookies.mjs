/**
 * SEKALI PAKAI (F5 kebersihan) - redaksi nilai cookie sesi NYATA yang ikut ter-commit ke
 * reports/add-a5-data/e2e-bridge-live-2026-08-28.json pada commit c1ee32e.
 *
 * Kenapa: artefak itu hasil uji E2E terhadap jembatan PRODUKSI, dan ia menyimpan nilai
 * `fz_id` (token sesi pengguna 8d6a635e-...) plus cookie AWS ALB apa adanya.
 * `secret-scan-test.js` sudah MERAH karena itu sebelum pekerjaan F5 dimulai - jadi ini
 * cacat yang ada, bukan yang saya buat. Memasukkannya ke allowlist akan salah: ini bukan
 * fixture, ini kredensial sungguhan.
 *
 * Yang dilakukan: setiap nilai cookie diganti `<REDAKSI len=N sha256=xxxxxxxxxxxx>`.
 * NAMA cookie, jumlahnya, panjangnya, dan sidik jarinya tetap ada, jadi asert bukti di
 * reports/add-a5-e2e.md ("cookie mana yang terkirim ke host mana") tetap bisa diperiksa;
 * yang hilang hanya nilai yang bisa dipakai orang lain.
 *
 * TIDAK menyelesaikan: riwayat git masih memuat nilai aslinya. Token itu harus dianggap
 * bocor dan dirotasi oleh owner. Lihat reports/fix-f5-kebersihan.md.
 */
import fs from 'node:fs';
import crypto from 'node:crypto';

const FILE = 'reports/add-a5-data/e2e-bridge-live-2026-08-28.json';
const raw = fs.readFileSync(FILE, 'utf8');
const doc = JSON.parse(raw);

const sha = (s) => crypto.createHash('sha256').update(s).digest('hex').slice(0, 12);
const MIN_LEN = 20;
let redacted = 0;

// Nilai cookie: `NAMA=NILAI` sampai `;` atau akhir string. Hanya nilai panjang yang
// berbentuk token (base64/base64url/hex) yang diganti; `enabled=false` dan sejenisnya aman.
const COOKIE = /([A-Za-z0-9_.-]+)=([A-Za-z0-9+/_=.-]{20,})/g;

function scrub(str) {
  return str.replace(COOKIE, (m, name, val) => {
    if (val.length < MIN_LEN) return m;
    redacted += 1;
    return `${name}=<REDAKSI len=${val.length} sha256=${sha(val)}>`;
  });
}

function walk(node) {
  if (typeof node === 'string') return scrub(node);
  if (Array.isArray(node)) return node.map(walk);
  if (node && typeof node === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(node)) out[k] = walk(v);
    return out;
  }
  return node;
}

const cleaned = walk(doc);
cleaned.catatanRedaksi =
  'Nilai cookie sesi (fz_id, AWSALB, AWSALBCORS) diredaksi oleh tools/redact-a5-live-cookies.mjs ' +
  'pada pekerjaan F5 kebersihan. Nama cookie, panjang, dan sha256 12-karakter dipertahankan agar ' +
  'bukti "cookie mana ke host mana" tetap bisa diperiksa. Riwayat git MASIH memuat nilai aslinya; ' +
  'token itu harus dianggap bocor dan dirotasi. Lihat reports/fix-f5-kebersihan.md.';

fs.writeFileSync(FILE, JSON.stringify(cleaned, null, 2) + '\n');
console.log(`redaksi selesai: ${redacted} nilai cookie di ${FILE}`);
