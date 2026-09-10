/**
 * tools/redact-live-cookies.mjs — redaksi berjejak untuk artefak uji E2E terhadap jembatan
 * PRODUKSI, dijalankan atas berkas yang disebut di argumen:
 *
 *   node tools/redact-live-cookies.mjs reports/fix-f7-data/e2e-after.json ...
 *
 * KENAPA ADA (dan kenapa bukan allowlist). Laporan `tools/fiezel-e2e-bridge.mjs` memuat
 * header `Cookie` yang BENAR-BENAR dikirim di kabel — itu justru inti buktinya (assert
 * `cookie-replayed`). Konsekuensinya artefak itu memuat nilai `fz_id` SUNGGUHAN (token sesi)
 * dan cookie AWS ALB apa adanya. Itu kredensial, bukan fixture, jadi memasukkannya ke
 * allowlist `tests/secret-scan-test.js` akan salah: yang benar adalah menghapus nilainya.
 *
 * Pendahulunya `tools/redact-a5-live-cookies.mjs` melakukan hal yang sama untuk SATU berkas
 * yang alamatnya ditulis keras di dalam kode. Berkas ini generik karena masalahnya berulang
 * setiap kali gerbang E2E dijalankan terhadap jembatan hidup dan hasilnya disimpan sebagai
 * bukti — dan alat sekali-pakai per berkas adalah undangan untuk lupa.
 *
 * YANG DIGANTI:
 *   1. nilai cookie `NAMA=NILAI` (>= 20 karakter, berbentuk token) → `<REDAKSI len=N sha256=…>`.
 *      Nama cookie, jumlah, panjang, dan sidik jarinya TETAP ADA, jadi bukti "cookie mana
 *      terkirim ke host mana" masih bisa diperiksa; yang hilang hanya nilai yang bisa dipakai
 *      orang lain.
 *   2. jalur URL tantangan Cloudflare (`challenges.cloudflare.com/cdn-cgi/challenge-platform/…`)
 *      → `<REDAKSI-JALUR len=N sha256=…>`. Ini bukan kredensial kita, tetapi ia token sesi
 *      pihak ketiga yang berentropi tinggi; yang penting bagi bukti hanyalah HOST-nya pernah
 *      disentuh, bukan isi jalurnya.
 *
 * YANG TIDAK DISELESAIKAN: riwayat git tetap memuat nilai asli untuk berkas yang sudah
 * pernah ter-commit. Token yang pernah ter-commit harus dianggap bocor dan dirotasi owner.
 */
import fs from 'node:fs';
import crypto from 'node:crypto';

const files = process.argv.slice(2);
if (!files.length) {
  console.error('pakai: node tools/redact-live-cookies.mjs <berkas.json> [berkas.json ...]');
  process.exit(1);
}

const sha = s => crypto.createHash('sha256').update(s).digest('hex').slice(0, 12);
const MIN_LEN = 20;
// Nilai cookie: `NAMA=NILAI` sampai `;` atau akhir string. Hanya nilai panjang berbentuk
// token yang diganti; `enabled=false` dan sejenisnya aman.
const COOKIE = /([A-Za-z0-9_.-]+)=([A-Za-z0-9+/_=.-]{20,})/g;
// Subdomainnya berubah-ubah (`challenges.cloudflare.com`, `brunhild.challenges.cloudflare.com`,
// dan seterusnya), jadi pola ini SENGAJA menerima label di depannya. Versi pertama tidak, dan
// akibatnya separuh URL tantangan lolos dari redaksi — ketahuan lewat tests/secret-scan-test.js.
const CF_CHALLENGE = /(https:\/\/(?:[a-z0-9-]+\.)*challenges\.cloudflare\.com\/cdn-cgi\/challenge-platform\/)([^"'\s]+)/g;

let redacted = 0;
function scrub(str) {
  let out = String(str).replace(CF_CHALLENGE, (m, prefix, rest) => {
    redacted += 1;
    return `${prefix}<REDAKSI-JALUR len=${rest.length} sha256=${sha(rest)}>`;
  });
  out = out.replace(COOKIE, (m, name, value) => {
    if (value.length < MIN_LEN) return m;
    redacted += 1;
    return `${name}=<REDAKSI len=${value.length} sha256=${sha(value)}>`;
  });
  return out;
}

function walk(node) {
  if (typeof node === 'string') return scrub(node);
  if (Array.isArray(node)) return node.map(walk);
  if (node && typeof node === 'object') {
    const out = {};
    for (const [key, value] of Object.entries(node)) out[key] = walk(value);
    return out;
  }
  return node;
}

const CATATAN = 'Nilai cookie sesi (fz_id, AWSALB, AWSALBCORS) dan jalur tantangan Cloudflare '
  + 'diredaksi oleh tools/redact-live-cookies.mjs. Nama cookie, panjang, dan sha256 12-karakter '
  + 'dipertahankan supaya bukti "cookie mana ke host mana" tetap bisa diperiksa. Riwayat git '
  + 'MASIH memuat nilai asli untuk berkas yang sudah pernah ter-commit; token itu harus '
  + 'dianggap bocor dan dirotasi owner.';

for (const file of files) {
  const before = redacted;
  const doc = JSON.parse(fs.readFileSync(file, 'utf8'));
  const cleaned = walk(doc);
  cleaned.catatanRedaksi = CATATAN;
  fs.writeFileSync(file, `${JSON.stringify(cleaned, null, 2)}\n`);
  console.log(`${file}: ${redacted - before} nilai diredaksi`);
}
console.log(`total ${redacted} nilai diredaksi di ${files.length} berkas`);
