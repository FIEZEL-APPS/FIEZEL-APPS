/**
 * tests/android-signing-and-oauth-audit-test.js
 *
 * Verifies the integrity of:
 * 1. Permanent deterministic release keystore configuration
 * 2. V1 (JAR) and V2/V3 APK signature scheme enablement
 * 3. Suppression of X-Requested-With header to eliminate Google OAuth 403 disallowed_useragent
 * 4. Broadened Google TLD routing in WebViewClient & WebChromeClient popup
 * 5. Delayed popup dismissal for complete OAuth postMessage token delivery
 * 6. Zero prohibited claims compliance
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const ROOT_DIR = path.resolve(__dirname, '..');
const WORKFLOW_PATH = path.join(ROOT_DIR, '.github', 'workflows', 'build-android-apk.yml');
const BUILD_GRADLE_PATH = path.join(ROOT_DIR, 'android', 'app', 'build.gradle');
const MAIN_ACTIVITY_PATH = path.join(ROOT_DIR, 'android', 'app', 'src', 'main', 'java', 'id', 'my', 'fiezel', 'app', 'MainActivity.java');
const WEBVIEW_CLIENT_PATH = path.join(ROOT_DIR, 'android', 'app', 'src', 'main', 'java', 'id', 'my', 'fiezel', 'app', 'client', 'FiezelWebViewClient.java');
const KEYSTORE_PATH = path.join(ROOT_DIR, 'android', 'keystore', 'fiezel-release.jks');

const PROHIBITED_CLAIMS = [
  '100% Gratis',
  'Latihan Bisa Offline',
  'CEFR',
  'JLPT'
];

let passes = 0;
let fails = 0;

function check(desc, fn) {
  try {
    fn();
    console.log(`✔ PASS: ${desc}`);
    passes++;
  } catch (err) {
    console.error(`✘ FAIL: ${desc}\n  Reason: ${err.message}`);
    fails++;
  }
}

console.log('========================================================================');
console.log('       FIEZEL ANDROID SIGNING & GOOGLE OAUTH AUDIT SUITE                ');
console.log('========================================================================\n');

// 1. Keystore file existence and size
check('Permanent release keystore exists in android/keystore/fiezel-release.jks', () => {
  assert.ok(fs.existsSync(KEYSTORE_PATH), 'Keystore file not found');
  const stat = fs.statSync(KEYSTORE_PATH);
  assert.ok(stat.size > 1000, `Keystore size unexpectedly small: ${stat.size} bytes`);
});

// 2. build.gradle version bump
check('app/build.gradle contains bumped versionCode >= 51901 and versionName >= 5.19.1', () => {
  const content = fs.readFileSync(BUILD_GRADLE_PATH, 'utf8');
  const codeMatch = content.match(/versionCode\s+(\d+)/);
  assert.ok(codeMatch, 'versionCode not found in build.gradle');
  assert.ok(parseInt(codeMatch[1], 10) >= 51901, `versionCode must be >= 51901, got ${codeMatch[1]}`);

  const nameMatch = content.match(/versionName\s+"([^"]+)"/);
  assert.ok(nameMatch, 'versionName not found in build.gradle');
  assert.ok(nameMatch[1].startsWith('5.19.'), `versionName must be 5.19.x, got ${nameMatch[1]}`);
});

// 3. Workflow V1, V2, V3 Signing Schemes
check('Workflow enables --v1-signing-enabled true for maximum device compatibility', () => {
  const wf = fs.readFileSync(WORKFLOW_PATH, 'utf8');
  assert.ok(wf.includes('--v1-signing-enabled true'), 'Missing --v1-signing-enabled true in workflow');
  assert.ok(wf.includes('--v2-signing-enabled true'), 'Missing --v2-signing-enabled true in workflow');
  assert.ok(wf.includes('--v3-signing-enabled true'), 'Missing --v3-signing-enabled true in workflow');
});

check('Workflow references permanent repository keystore android/keystore/fiezel-release.jks', () => {
  const wf = fs.readFileSync(WORKFLOW_PATH, 'utf8');
  assert.ok(wf.includes('android/keystore/fiezel-release.jks'), 'Missing fiezel-release.jks path in workflow');
  assert.ok(wf.includes('--ks-key-alias fiezel'), 'Missing --ks-key-alias fiezel in workflow');
});

// 4. Suppress X-Requested-With header in MainActivity
check('MainActivity configures REQUESTED_WITH_HEADER_ALLOW_LIST to eliminate 403 disallowed_useragent', () => {
  const src = fs.readFileSync(MAIN_ACTIVITY_PATH, 'utf8');
  assert.ok(src.includes('REQUESTED_WITH_HEADER_ALLOW_LIST'), 'Missing REQUESTED_WITH_HEADER_ALLOW_LIST feature check');
  assert.ok(src.includes('setRequestedWithHeaderOriginAllowList'), 'Missing setRequestedWithHeaderOriginAllowList call');
  assert.ok(src.includes('Collections.emptySet()'), 'Must pass Collections.emptySet() to suppress header');
});

// 5. Popup OAuth WebView handling
check('MainActivity popupWebView suppresses X-Requested-With and handles delayed dismissal', () => {
  const src = fs.readFileSync(MAIN_ACTIVITY_PATH, 'utf8');
  assert.ok(src.includes('setRequestedWithHeaderOriginAllowList(popupSettings'), 'Popup must also suppress X-Requested-With');
  assert.ok(src.includes('postDelayed'), 'Popup onPageFinished must use postDelayed before dialog dismissal');
});

// 6. Broadened Google domain matching
check('FiezelWebViewClient keeps all Google OAuth domains inside the WebView', () => {
  const src = fs.readFileSync(WEBVIEW_CLIENT_PATH, 'utf8');
  assert.ok(src.includes('google.') || src.includes('accounts.google.com'), 'Must match Google domains');
  assert.ok(src.includes('gstatic.com'), 'Must match gstatic.com');
  assert.ok(src.includes('googleusercontent.com'), 'Must match googleusercontent.com');
});

// 7. Prohibited Claims Check
const filesToScan = [
  WORKFLOW_PATH,
  BUILD_GRADLE_PATH,
  MAIN_ACTIVITY_PATH,
  WEBVIEW_CLIENT_PATH
];

for (const file of filesToScan) {
  const content = fs.readFileSync(file, 'utf8');
  const rel = path.relative(ROOT_DIR, file);
  for (const claim of PROHIBITED_CLAIMS) {
    check(`Zero occurrence of "${claim}" in ${rel}`, () => {
      assert.strictEqual(content.includes(claim), false, `Found prohibited claim "${claim}" in ${rel}`);
    });
  }
}

console.log('\n========================================================================');
console.log(`Total Checks: ${passes + fails} | Passed: ${passes} | Failed: ${fails}`);
console.log('========================================================================');

if (fails > 0) {
  process.exit(1);
} else {
  console.log('\n🎉 ALL ANDROID SIGNING & OAUTH CHECKS CERTIFIED 100% PASS!');
}
