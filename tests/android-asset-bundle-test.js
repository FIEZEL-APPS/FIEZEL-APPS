/**
 * tests/android-asset-bundle-test.js — VERIFIKASI INTEGRITAS BUNDEL ASET ANDROID LURING.
 *
 * Memastikan bahwa bundel aset web luring untuk WebView Android:
 * 1. Tersedia di `android/app/src/main/assets/public/` lengkap dengan `asset-manifest.json`.
 * 2. Memuat seluruh berkas inti cangkang web (index.html, kurikulum.html, misi.html, style.css, app.js, core-config.js).
 * 3. Seluruh rujukan skrip dan gaya lokal di `index.html` benar-benar ada di dalam bundel `public/`.
 * 4. Nol berkas berukuran melebihi batas 5 MB dan nol berkas video/promo terlarang (.mp4, .webm, .mov, dll).
 * 5. Integritas hash SHA-256 seluruh berkas selaras dengan manifest.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const BUNDLE_DIR = path.join(ROOT, 'android', 'app', 'src', 'main', 'assets', 'public');
const MANIFEST_FILE = path.join(BUNDLE_DIR, 'asset-manifest.json');

let passCount = 0;
const failures = [];

function assert(condition, message) {
  if (condition) {
    passCount++;
  } else {
    failures.push(message);
  }
}

function sha256(filePath) {
  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(filePath));
  return hash.digest('hex');
}

console.log('🧪 [Test] Running Android Asset Bundle Integrity Gate...');

// 1. Target directory and manifest existence
assert(fs.existsSync(BUNDLE_DIR), `Direktori bundel tidak ditemukan: ${BUNDLE_DIR}`);
assert(fs.existsSync(MANIFEST_FILE), `Berkas asset-manifest.json tidak ditemukan di: ${MANIFEST_FILE}`);

if (!fs.existsSync(MANIFEST_FILE)) {
  console.error(`❌ GAGAL FATAL: Manifest tidak ada. Jalankan node tools/sync-android-assets.mjs terlebih dahulu.`);
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(MANIFEST_FILE, 'utf8'));

// 2. Critical entrypoints
const CRITICAL_ENTRYPOINTS = [
  'index.html',
  'kurikulum.html',
  'misi.html',
  'undercover.html',
  '404.html',
  'style.css',
  'app.js',
  'core-config.js',
  'lucide.min.js',
  'manifest.json'
];

for (const entry of CRITICAL_ENTRYPOINTS) {
  const p = path.join(BUNDLE_DIR, entry);
  assert(fs.existsSync(p), `Cangkang web kehilangan berkas kritis: ${entry}`);
}

// 3. Brand & Font Assets
const CRITICAL_ASSETS = [
  'assets/brand/fiezel-wordmark.svg',
  'assets/brand/fiezel-paw.svg',
  'assets/brand/fiezel-icon-512.png',
  'assets/fonts/InstrumentSerif-400.woff2',
  'assets/fonts/PlusJakartaSans-400.woff2',
  'assets/fonts/PlusJakartaSans-700.woff2',
  'mochi-mascot/three.module.js',
  'mochi-mascot/fiezel-mochi.js',
  'audio/manifest.json'
];

for (const asset of CRITICAL_ASSETS) {
  const p = path.join(BUNDLE_DIR, asset);
  assert(fs.existsSync(p), `Aset penting cangkang web hilang: ${asset}`);
}

// 4. Verification of HTML relative links in index.html
const indexHtmlContent = fs.readFileSync(path.join(BUNDLE_DIR, 'index.html'), 'utf8');
const relLinkRegex = /(?:src|href)=["']\.\/([^"']+)["']/g;
let match;
const checkedRefs = new Set();

while ((match = relLinkRegex.exec(indexHtmlContent)) !== null) {
  const cleanPath = match[1].split('?')[0].split('#')[0];
  if (checkedRefs.has(cleanPath)) continue;
  checkedRefs.add(cleanPath);

  const fullPath = path.join(BUNDLE_DIR, cleanPath);
  assert(
    fs.existsSync(fullPath),
    `Rujukan lokal di index.html rusak atau tidak ikut ter-bundle: ./${cleanPath}`
  );
}

// 5. Verification of all files in manifest: existence, size limit, and SHA-256
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const BANNED_EXTENSIONS = ['.mp4', '.mov', '.avi', '.webm', '.py', '.bat', '.sh'];

const checksums = manifest.checksums || {};
const fileEntries = Object.entries(checksums);

assert(fileEntries.length > 0, 'asset-manifest.json kosong — tidak ada berkas yang terdaftar!');

for (const [relPath, meta] of fileEntries) {
  const filePath = path.join(BUNDLE_DIR, relPath);
  assert(fs.existsSync(filePath), `Berkas terdaftar di manifest tapi fisik tidak ada: ${relPath}`);

  if (fs.existsSync(filePath)) {
    const stat = fs.statSync(filePath);
    assert(
      stat.size <= MAX_FILE_SIZE,
      `Berkas melanggar batas ukuran 5MB (${(stat.size / 1024 / 1024).toFixed(2)} MB): ${relPath}`
    );

    const ext = path.extname(relPath).toLowerCase();
    assert(
      !BANNED_EXTENSIONS.includes(ext),
      `Berkas terlarang (.mp4/.webm/dll) ditemukan dalam bundel: ${relPath}`
    );

    assert(
      stat.size === meta.size,
      `Ukuran berkas tidak selaras dengan manifest: ${relPath} (fisik: ${stat.size}, manifest: ${meta.size})`
    );

    const fileHash = sha256(filePath);
    assert(
      fileHash === meta.sha256,
      `SHA-256 tidak cocok untuk ${relPath} (terhitung: ${fileHash}, manifest: ${meta.sha256})`
    );
  }
}

// Result reporting
if (failures.length > 0) {
  console.error(`\n❌ MERAH: Android Asset Bundle Integrity Gate (${failures.length} kegagalan):`);
  failures.forEach(f => console.error(`  - ${f}`));
  process.exit(1);
} else {
  console.log(`\n✅ HIJAU: Android Asset Bundle Integrity Gate LULUS.`);
  console.log(`   - Penegasan terpenuhi: ${passCount}`);
  console.log(`   - Total berkas terverifikasi: ${fileEntries.length}`);
  console.log(`   - Ukuran total bundel: ${manifest.totalMB} MB`);
  console.log(`   - Versi build terikat: ${manifest.version}`);
  process.exit(0);
}
