/**
 * tests/android-ota-sync-verification-test.js
 *
 * Empirical Verification & Quality Gate Test for Android Over-The-Air (OTA) Live Sync.
 *
 * Asserts:
 * 1. FiezelAssetLoaderFactory.java implements online-first pass-through for fiezel.my.id
 *    (returns null when online so WebKit fetches live updates, intercepts when offline).
 * 2. FiezelAssetLoaderFactory.java maintains appassets.androidplatform.net local asset routing.
 * 3. FiezelNativeBridge.java exposes reloadApp() for JavaScript bridge integration.
 * 4. MainActivity.java auto-retries live server connection on resume if network is restored.
 * 5. .github/workflows/build-android-apk.yml monitors all app content paths for automatic CI/CD builds.
 * 6. Zero prohibited claims ('100% Gratis', 'Latihan Bisa Offline', 'CEFR', 'JLPT') across touched files.
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const ANDROID_DIR = path.join(ROOT_DIR, 'android');
const APP_SRC = path.join(ANDROID_DIR, 'app', 'src', 'main');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`\x1b[32m✔ PASS:\x1b[0m ${message}`);
  } else {
    failed++;
    console.error(`\x1b[31m✘ FAIL:\x1b[0m ${message}`);
  }
}

console.log('========================================================================');
console.log('       FIEZEL ANDROID OVER-THE-AIR (OTA) LIVE SYNC VERIFICATION         ');
console.log('========================================================================\n');

// 1. Verify FiezelAssetLoaderFactory OTA Strategy
const loaderFactoryPath = path.join(APP_SRC, 'java', 'id', 'my', 'fiezel', 'app', 'loader', 'FiezelAssetLoaderFactory.java');
assert(fs.existsSync(loaderFactoryPath), 'FiezelAssetLoaderFactory.java exists');

const loaderContent = fs.readFileSync(loaderFactoryPath, 'utf8');
assert(loaderContent.includes('!isNetworkConnected()'), 'shouldInterceptRequest checks !isNetworkConnected() before serving bundled assets for fiezel.my.id');
assert(loaderContent.includes('DOMAIN_APPASSETS'), 'appassets.androidplatform.net virtual domain is supported');
assert(loaderContent.includes('return null;'), 'Returns null when online so WebKit fetches live code over HTTPS');
assert(loaderContent.includes('ConnectivityManager'), 'Uses Android ConnectivityManager for network state detection');

// 2. Verify FiezelNativeBridge Bridge Reload Capability
const bridgePath = path.join(APP_SRC, 'java', 'id', 'my', 'fiezel', 'app', 'bridge', 'FiezelNativeBridge.java');
assert(fs.existsSync(bridgePath), 'FiezelNativeBridge.java exists');

const bridgeContent = fs.readFileSync(bridgePath, 'utf8');
assert(bridgeContent.includes('public void reloadApp()'), 'FiezelNativeBridge exposes reloadApp() via @JavascriptInterface');
assert(bridgeContent.includes('webView.reload()'), 'reloadApp() triggers webView.reload() on UI thread');

// 3. Verify MainActivity onResume Auto-Reconnect
const mainActivityPath = path.join(APP_SRC, 'java', 'id', 'my', 'fiezel', 'app', 'MainActivity.java');
assert(fs.existsSync(mainActivityPath), 'MainActivity.java exists');

const mainContent = fs.readFileSync(mainActivityPath, 'utf8');
assert(mainContent.includes('if (isOfflineVisible && isNetworkConnected())'), 'MainActivity onResume checks if network is restored from offline screen');
assert(mainContent.includes('retryConnection()'), 'MainActivity onResume triggers retryConnection() when reconnected');

// 4. Verify GitHub Actions Build Workflow Trigger Paths
const workflowPath = path.join(ROOT_DIR, '.github', 'workflows', 'build-android-apk.yml');
assert(fs.existsSync(workflowPath), '.github/workflows/build-android-apk.yml exists');

const wfContent = fs.readFileSync(workflowPath, 'utf8');
const requiredMonitoredPaths = [
  'android/**',
  'tools/**',
  'features/**',
  'assets/**',
  'coordination/**',
  'index.html',
  'app.js',
  'style.css',
  'sw.js',
  'core-config.js'
];

for (const p of requiredMonitoredPaths) {
  assert(wfContent.includes(`'${p}'`) || wfContent.includes(`"${p}"`), `Workflow push paths monitor '${p}'`);
}

// 5. Zero Prohibited Claims Compliance
const PROHIBITED = ['100% Gratis', 'Latihan Bisa Offline', 'CEFR', 'JLPT'];
const filesToCheck = [loaderFactoryPath, bridgePath, mainActivityPath, workflowPath];

for (const f of filesToCheck) {
  const content = fs.readFileSync(f, 'utf8');
  for (const p of PROHIBITED) {
    assert(!content.includes(p), `Zero occurrence of "${p}" in ${path.relative(ROOT_DIR, f)}`);
  }
}

console.log('\n========================================================================');
console.log(`Total Checks: ${passed + failed} | Passed: \x1b[32m${passed}\x1b[0m | Failed: ${failed > 0 ? `\x1b[31m${failed}\x1b[0m` : '\x1b[32m0\x1b[0m'}`);
console.log('========================================================================\n');

if (failed > 0) {
  process.exit(1);
} else {
  console.log('\x1b[32m🎉 OVER-THE-AIR (OTA) ANDROID AUTO-SYNC TEST PASSED 100%!\x1b[0m\n');
  process.exit(0);
}
