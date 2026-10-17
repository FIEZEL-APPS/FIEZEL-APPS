#!/usr/bin/env node
/**
 * tools/sync-android-assets.mjs
 *
 * FIEZEL Offline Shell & Asset Bundler for Android WebViewAssetLoader.
 *
 * Synchronizes the core web shell (index.html, kurikulum.html, misi.html, style.css,
 * core-config.js, lucide.min.js, assets/brand, assets/fonts, features, content, etc.)
 * into `android/app/src/main/assets/public/` while enforcing strict size limits,
 * excluding oversized video and promo files, and verifying asset integrity.
 *
 * Usage:
 *   node tools/sync-android-assets.mjs              # Sync assets to android/app/src/main/assets/public
 *   node tools/sync-android-assets.mjs --clean      # Clean destination before syncing
 *   node tools/sync-android-assets.mjs --dry-run    # Preview files to copy without writing
 *   node tools/sync-android-assets.mjs --verify     # Verify integrity of existing bundle
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

// Default target is android/app/src/main/assets/public/
const DEFAULT_TARGET = path.join(ROOT, 'android', 'app', 'src', 'main', 'assets', 'public');

// CLI options
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run') || args.includes('--check');
const isClean = args.includes('--clean');
const isVerifyOnly = args.includes('--verify');

// Allow custom target via --target <dir>
let targetDir = DEFAULT_TARGET;
const targetIdx = args.indexOf('--target');
if (targetIdx !== -1 && args[targetIdx + 1]) {
  targetDir = path.resolve(ROOT, args[targetIdx + 1]);
}

// Strict file size limit: 5 MB per file
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

// Banned video & promo extensions
const BANNED_EXTENSIONS = new Set([
  '.mp4',
  '.mov',
  '.avi',
  '.mkv',
  '.webm',
  '.py',
  '.pyc',
  '.bat',
  '.sh',
  '.ps1',
  '.log',
  '.tmp',
  '.bak',
  '.raw'
]);

// Banned filename patterns
const BANNED_FILE_PREFIXES = [
  'test_',
  'probe_',
  'showcase_',
  'refined-phase',
  'reality-audit-',
  'audit_'
];

// Banned directories
const BANNED_DIRS = new Set([
  '.git',
  '.github',
  '.agents',
  '.emergent',
  '.claude',
  '.pytest_cache',
  '.reading-new',
  '.stitch',
  '__pycache__',
  'node_modules',
  'remotion',
  'mockups',
  'brag-output',
  'mochi-motion-v2',
  'reports',
  'audit',
  'tools',
  'tests',
  'test_reports',
  'docs',
  'scratch',
  'website',
  'deploy',
  'backend',
  'workers',
  'analysis',
  'memory',
  'cyber-bot-game',
  'ecohero-quest',
  'promo-vo',
  'promo-vo-60s',
  'stitch-export'
]);

// 1. Core top-level web shell files
const CORE_ROOT_FILES = [
  'index.html',
  'kurikulum.html',
  'misi.html',
  'undercover.html',
  '404.html',
  'style.css',
  'fiezel-2.css',
  'app.js',
  'core-config.js',
  'version.js',
  'report-config.js',
  'fiezel-ux-flags.js',
  'fiezel-lazy-loader.js',
  'content-canary.js',
  'content-promotion.js',
  'content-canary-config.js',
  'lucide.min.js',
  'validator.js',
  'manifest.json',
  'sw.js',
  'th-purity-lexicon.js',
  'vocabulary-master.json',
  'vocabulary-th.json',
  'reading-bank.json',
  'reading-exam-v1.json',
  'grammar-templates.json',
  'grammar-labels-id.js',
  'grammar-curriculum-v1.json',
  'grammar-misconception-id.json',
  'writing-prompts-v1.json',
  'misconception-taxonomy-v1.json',
  'cloze-bank-v1.json',
  'favicon-64.png',
  'apple-touch-icon.png',
  'instagram.svg',
  'VERSION.json'
];

function sha256File(filePath) {
  const hash = crypto.createHash('sha256');
  const buffer = fs.readFileSync(filePath);
  hash.update(buffer);
  return hash.digest('hex');
}

function shouldSkipFile(relPath, size) {
  const baseName = path.basename(relPath);
  const ext = path.extname(baseName).toLowerCase();

  if (BANNED_EXTENSIONS.has(ext)) {
    return `Excluded extension: ${ext}`;
  }

  for (const prefix of BANNED_FILE_PREFIXES) {
    if (baseName.startsWith(prefix)) {
      return `Excluded test/audit file prefix: ${prefix}`;
    }
  }

  if (baseName.endsWith('-REPORT.json') || baseName === 'TASKS-LEDGER.json' || baseName === 'CLAIMS.json') {
    return `Excluded report ledger: ${baseName}`;
  }

  if (size > MAX_FILE_SIZE_BYTES) {
    return `File exceeds 5MB limit (${(size / (1024 * 1024)).toFixed(2)} MB)`;
  }

  return null;
}

/**
 * Recursively collect files from directory
 */
function collectDirFiles(srcDir, subPath = '') {
  const currentDir = path.join(srcDir, subPath);
  if (!fs.existsSync(currentDir)) return [];

  const results = [];
  const entries = fs.readdirSync(currentDir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (BANNED_DIRS.has(entry.name)) continue;
      const childSub = path.join(subPath, entry.name);
      results.push(...collectDirFiles(srcDir, childSub));
    } else if (entry.isFile()) {
      const relPath = path.join(subPath, entry.name).replace(/\\/g, '/');
      const fullPath = path.join(currentDir, entry.name);
      const stat = fs.statSync(fullPath);

      const skipReason = shouldSkipFile(relPath, stat.size);
      if (skipReason) {
        continue;
      }

      results.push({
        relPath,
        fullPath,
        size: stat.size
      });
    }
  }

  return results;
}

/**
 * Main Asset Synchronization Logic
 */
async function syncAssets() {
  console.log('====================================================');
  console.log('📦 FIEZEL Android Web Shell & Asset Bundler');
  console.log('====================================================');
  console.log(`📁 Source:      ${ROOT}`);
  console.log(`🎯 Destination: ${targetDir}`);
  console.log(`⚙️  Mode:        ${isDryRun ? 'DRY RUN (no changes)' : 'SYNCHRONIZE'}`);
  console.log('----------------------------------------------------');

  // Load build version
  let buildVersion = 'unknown';
  try {
    const buildVerJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'coordination', 'BUILD-VERSION.json'), 'utf8'));
    buildVersion = buildVerJson.version || 'unknown';
  } catch (_) {
    try {
      const coreCfg = fs.readFileSync(path.join(ROOT, 'core-config.js'), 'utf8');
      const m = coreCfg.match(/FIEZEL_PAGE_BUILD\s*=\s*['"]([^'"]+)['"]/);
      if (m) buildVersion = m[1];
    } catch (_) {}
  }
  console.log(`🏷️  Build Version: ${buildVersion}`);

  // Collect files to sync
  const filesToSync = [];

  // 1. Root core files
  for (const file of CORE_ROOT_FILES) {
    const fullSrc = path.join(ROOT, file);
    if (!fs.existsSync(fullSrc)) {
      console.warn(`⚠️ Warning: Core file missing in source root: ${file}`);
      continue;
    }
    const stat = fs.statSync(fullSrc);
    const skipReason = shouldSkipFile(file, stat.size);
    if (skipReason) {
      console.warn(`⚠️ Skipping core file ${file}: ${skipReason}`);
      continue;
    }
    filesToSync.push({
      relPath: file,
      srcPath: fullSrc,
      size: stat.size
    });
  }

  // 2. assets/brand/ (icons, wordmark, 100 paw outfits)
  const brandFiles = collectDirFiles(path.join(ROOT, 'assets', 'brand'));
  for (const f of brandFiles) {
    filesToSync.push({
      relPath: `assets/brand/${f.relPath}`,
      srcPath: f.fullPath,
      size: f.size
    });
  }

  // 3. assets/fonts/ (woff2 web fonts)
  const fontFiles = collectDirFiles(path.join(ROOT, 'assets', 'fonts'));
  for (const f of fontFiles) {
    filesToSync.push({
      relPath: `assets/fonts/${f.relPath}`,
      srcPath: f.fullPath,
      size: f.size
    });
  }

  // 4. assets/audio/sfx/ (sound effects: ogg + mp3)
  const sfxFiles = collectDirFiles(path.join(ROOT, 'assets', 'audio', 'sfx'));
  for (const f of sfxFiles) {
    filesToSync.push({
      relPath: `assets/audio/sfx/${f.relPath}`,
      srcPath: f.fullPath,
      size: f.size
    });
  }

  // 5. audio/manifest.json
  const audioManifest = path.join(ROOT, 'audio', 'manifest.json');
  if (fs.existsSync(audioManifest)) {
    const stat = fs.statSync(audioManifest);
    filesToSync.push({
      relPath: 'audio/manifest.json',
      srcPath: audioManifest,
      size: stat.size
    });
  }

  // 6. mochi-mascot runtime files (three.module.js, fiezel-mochi.js)
  const mochiRuntimeFiles = ['three.module.js', 'fiezel-mochi.js'];
  for (const file of mochiRuntimeFiles) {
    const fullSrc = path.join(ROOT, 'mochi-mascot', file);
    if (fs.existsSync(fullSrc)) {
      const stat = fs.statSync(fullSrc);
      filesToSync.push({
        relPath: `mochi-mascot/${file}`,
        srcPath: fullSrc,
        size: stat.size
      });
    }
  }

  // 7. features/ directory (all JavaScript, CSS, and JSON modules)
  const featureFiles = collectDirFiles(path.join(ROOT, 'features'));
  for (const f of featureFiles) {
    filesToSync.push({
      relPath: `features/${f.relPath}`,
      srcPath: f.fullPath,
      size: f.size
    });
  }

  // 8. content/ directory (ja, mapel, buku, dictionaries, video grammar JSONs/posters)
  const contentFiles = collectDirFiles(path.join(ROOT, 'content'));
  for (const f of contentFiles) {
    filesToSync.push({
      relPath: `content/${f.relPath}`,
      srcPath: f.fullPath,
      size: f.size
    });
  }

  // Deduplicate files by relPath
  const uniqueMap = new Map();
  for (const item of filesToSync) {
    const normalized = item.relPath.replace(/\\/g, '/');
    uniqueMap.set(normalized, { ...item, relPath: normalized });
  }
  const finalFiles = Array.from(uniqueMap.values()).sort((a, b) => a.relPath.localeCompare(b.relPath));

  // Compute total size
  const totalBytes = finalFiles.reduce((sum, f) => sum + f.size, 0);
  const totalMB = (totalBytes / (1024 * 1024)).toFixed(2);

  console.log(`📋 Total Assets Selected: ${finalFiles.length} files (${totalMB} MB)`);

  if (isDryRun) {
    console.log('✨ [Dry Run] Completed. No files were written.');
    return { count: finalFiles.length, bytes: totalBytes };
  }

  // Clean if requested
  if (isClean && fs.existsSync(targetDir)) {
    console.log(`🧹 Cleaning target directory: ${targetDir}`);
    fs.rmSync(targetDir, { recursive: true, force: true });
  }

  // Ensure target directory exists
  fs.mkdirSync(targetDir, { recursive: true });

  // Perform file copying and hash calculation
  const manifestChecksums = {};
  let copiedCount = 0;

  const TEXT_EXTS = new Set(['.js', '.mjs', '.css', '.html', '.json', '.xml', '.txt', '.md']);
  for (const f of finalFiles) {
    const destPath = path.join(targetDir, f.relPath);
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    const ext = path.extname(f.srcPath).toLowerCase();
    if (TEXT_EXTS.has(ext)) {
      const raw = fs.readFileSync(f.srcPath, 'utf8');
      const cleaned = raw.replace(/\r\n/g, '\n').split('\n').map(l => l.trimEnd()).join('\n').trimEnd() + '\n';
      fs.writeFileSync(destPath, cleaned, 'utf8');
    } else {
      fs.copyFileSync(f.srcPath, destPath);
    }

    const actualStat = fs.statSync(destPath);
    const hash = sha256File(destPath);
    manifestChecksums[f.relPath] = {
      size: actualStat.size,
      sha256: hash
    };
    copiedCount++;
  }

  // Generate asset-manifest.json
  const assetManifest = {
    bundle: 'fiezel-android-offline-shell',
    version: buildVersion,
    generatedAt: new Date().toISOString(),
    totalFiles: copiedCount,
    totalBytes: totalBytes,
    totalMB: totalMB,
    checksums: manifestChecksums
  };

  const manifestPath = path.join(targetDir, 'asset-manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(assetManifest, null, 2), 'utf8');

  console.log(`✅ [Success] Bundled ${copiedCount} assets (${totalMB} MB) into:`);
  console.log(`   ${targetDir}`);
  console.log(`📄 Generated asset manifest: ${manifestPath}`);

  // Run integrity verification
  console.log('----------------------------------------------------');
  console.log('🔍 Running automated bundle integrity verification...');
  const verifyResult = verifyBundle(targetDir, finalFiles);
  if (!verifyResult.ok) {
    console.error('❌ Bundle verification FAILED:', verifyResult.errors);
    process.exit(1);
  }
  console.log('🎉 Bundle integrity certified 100% PASS.');
  console.log('====================================================');

  return { count: copiedCount, bytes: totalBytes, version: buildVersion };
}

/**
 * Verify Bundled Assets Integrity
 */
export function verifyBundle(targetDirectory, expectedFiles = null) {
  const errors = [];
  const manifestPath = path.join(targetDirectory, 'asset-manifest.json');

  if (!fs.existsSync(manifestPath)) {
    return { ok: false, errors: ['asset-manifest.json does not exist in target directory'] };
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const checksums = manifest.checksums || {};

  // 1. Verify primary entrance files
  const requiredEntrypoints = ['index.html', 'kurikulum.html', 'misi.html', 'style.css', 'app.js', 'core-config.js'];
  for (const entry of requiredEntrypoints) {
    const p = path.join(targetDirectory, entry);
    if (!fs.existsSync(p)) {
      errors.push(`Missing critical entrypoint: ${entry}`);
    }
  }

  // 2. Verify all manifest items exist on disk with valid sha256
  for (const [relPath, meta] of Object.entries(checksums)) {
    const diskPath = path.join(targetDirectory, relPath);
    if (!fs.existsSync(diskPath)) {
      errors.push(`Manifest file missing on disk: ${relPath}`);
      continue;
    }
    const stat = fs.statSync(diskPath);
    if (stat.size !== meta.size) {
      errors.push(`Size mismatch for ${relPath}: expected ${meta.size}, got ${stat.size}`);
    }
    const diskHash = sha256File(diskPath);
    if (diskHash !== meta.sha256) {
      errors.push(`SHA-256 mismatch for ${relPath}`);
    }
  }

  // 3. Verify HTML relative path dependencies in index.html
  const indexHtmlPath = path.join(targetDirectory, 'index.html');
  if (fs.existsSync(indexHtmlPath)) {
    const indexContent = fs.readFileSync(indexHtmlPath, 'utf8');
    const pathRegex = /(?:src|href)=["']\.\/([^"']+)["']/g;
    let match;
    const checked = new Set();
    while ((match = pathRegex.exec(indexContent)) !== null) {
      const cleanRel = match[1].split('?')[0].split('#')[0];
      if (checked.has(cleanRel)) continue;
      checked.add(cleanRel);

      const targetPath = path.join(targetDirectory, cleanRel);
      if (!fs.existsSync(targetPath)) {
        errors.push(`Broken relative reference in index.html: ./${cleanRel}`);
      }
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    totalVerified: Object.keys(checksums).length,
    manifest
  };
}

// Execution entry point
if (isVerifyOnly) {
  console.log(`🔍 Verifying asset bundle at ${targetDir}...`);
  const res = verifyBundle(targetDir);
  if (!res.ok) {
    console.error('❌ Verification failed:');
    res.errors.forEach(e => console.error(`  - ${e}`));
    process.exit(1);
  } else {
    console.log(`✅ Asset bundle is healthy and complete (${res.totalVerified} verified files).`);
    process.exit(0);
  }
} else {
  syncAssets().catch(err => {
    console.error('❌ Fatal error during sync:', err);
    process.exit(1);
  });
}
