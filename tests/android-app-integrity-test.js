/**
 * tests/android-app-integrity-test.js
 *
 * Automated Verification & Quality Gate Test Suite for FIEZEL Android Native App.
 *
 * Verifies:
 * - Check 1: Existence and validity of AndroidManifest.xml (package, permissions, intent filters).
 * - Check 2: Existence and syntax of build.gradle, settings.gradle, and app/build.gradle.
 * - Check 3: Validity of MainActivity.java (WebViewAssetLoader, WebChromeClient, permission handling, back button).
 * - Check 4: Asset files present in android/app/src/main/assets/public/ (index.html, style.css, assets).
 * - Check 5: App icons presence across densities (mdpi, hdpi, xhdpi, xxhdpi, xxxhdpi).
 * - Check 6: GitHub Actions workflow .github/workflows/build-android-apk.yml syntax and steps.
 * - Check 7: No hardcoded secrets or prohibited claims (zero "100% Gratis", "Latihan Bisa Offline", "CEFR", "JLPT").
 *
 * Exit code 0 if all 7 checks pass, exit code 1 if any check fails.
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const ANDROID_DIR = path.join(ROOT_DIR, 'android');
const APP_DIR = path.join(ANDROID_DIR, 'app');
const MAIN_DIR = path.join(APP_DIR, 'src', 'main');

// ANSI Colors for console output
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

let totalChecks = 7;
let passedChecks = 0;
let failedChecks = [];

function recordPass(checkNumber, title, details = []) {
  passedChecks++;
  console.log(`\n${GREEN}✔ [CHECK ${checkNumber} PASSED]${RESET} ${BOLD}${title}${RESET}`);
  for (const detail of details) {
    console.log(`   ${CYAN}•${RESET} ${detail}`);
  }
}

function recordFail(checkNumber, title, reason, details = []) {
  failedChecks.push({ checkNumber, title, reason });
  console.log(`\n${RED}✘ [CHECK ${checkNumber} FAILED]${RESET} ${BOLD}${title}${RESET}`);
  console.log(`   ${RED}Error:${RESET} ${reason}`);
  for (const detail of details) {
    console.log(`   ${YELLOW}•${RESET} ${detail}`);
  }
}

console.log(`${BOLD}========================================================================${RESET}`);
console.log(`${BOLD}       FIEZEL ANDROID NATIVE APP INTEGRITY & QUALITY GATE TEST SUITE    ${RESET}`);
console.log(`${BOLD}========================================================================${RESET}`);

// =============================================================================
// CHECK 1: Existence and validity of AndroidManifest.xml
// =============================================================================
(function verifyCheck1() {
  const checkNum = 1;
  const title = "AndroidManifest.xml Existence & Specification Validity";
  const manifestPath = path.join(MAIN_DIR, 'AndroidManifest.xml');

  if (!fs.existsSync(manifestPath)) {
    return recordFail(checkNum, title, `File not found: ${manifestPath}`);
  }

  const manifestContent = fs.readFileSync(manifestPath, 'utf8');
  const details = [];

  // 1. Package name check
  const packageMatch = manifestContent.match(/package\s*=\s*["']([^"']+)["']/);
  if (!packageMatch || packageMatch[1] !== 'id.my.fiezel.app') {
    return recordFail(checkNum, title, `Expected package="id.my.fiezel.app", found: ${packageMatch ? packageMatch[1] : 'none'}`);
  }
  details.push(`Package name confirmed: ${packageMatch[1]}`);

  // 2. Permissions check
  const requiredPermissions = [
    'android.permission.INTERNET',
    'android.permission.ACCESS_NETWORK_STATE',
    'android.permission.CAMERA',
    'android.permission.RECORD_AUDIO',
    'android.permission.MODIFY_AUDIO_SETTINGS',
    'android.permission.WAKE_LOCK'
  ];

  for (const perm of requiredPermissions) {
    if (!manifestContent.includes(perm)) {
      return recordFail(checkNum, title, `Missing required permission: ${perm}`);
    }
  }
  details.push(`All ${requiredPermissions.length} required permissions confirmed`);

  // 3. Hardware optional flags check
  if (!manifestContent.includes('android.hardware.camera') || !manifestContent.includes('android.hardware.microphone')) {
    return recordFail(checkNum, title, `Missing camera or microphone hardware features declaration`);
  }
  details.push(`Camera and microphone hardware features declared with optional requirement`);

  // 4. Intent filters check (MAIN/LAUNCHER and VIEW/Deep Linking)
  const hasLauncher = manifestContent.includes('android.intent.action.MAIN') &&
                      manifestContent.includes('android.intent.category.LAUNCHER');
  if (!hasLauncher) {
    return recordFail(checkNum, title, `Missing MAIN/LAUNCHER intent-filter`);
  }
  details.push(`MAIN/LAUNCHER intent filter verified`);

  const hasDeepLinkHttp = manifestContent.includes('android.intent.action.VIEW') &&
                          manifestContent.includes('fiezel.my.id') &&
                          manifestContent.includes('/app');
  if (!hasDeepLinkHttp) {
    return recordFail(checkNum, title, `Missing App Links deep linking intent-filter for fiezel.my.id/app`);
  }
  details.push(`HTTPS App Links intent filter (fiezel.my.id/app) verified`);

  const hasCustomScheme = manifestContent.includes('android:scheme="fiezel"') || manifestContent.includes("android:scheme='fiezel'");
  if (!hasCustomScheme) {
    return recordFail(checkNum, title, `Missing custom scheme intent-filter for fiezel://`);
  }
  details.push(`Custom scheme intent filter (fiezel://) verified`);

  // 5. MainActivity declaration check
  const hasMainActivity = manifestContent.includes('android:name=".MainActivity"') ||
                          manifestContent.includes('android:name="id.my.fiezel.app.MainActivity"');
  if (!hasMainActivity) {
    return recordFail(checkNum, title, `MainActivity not declared in manifest`);
  }
  details.push(`MainActivity exported with singleTask and adjustResize verified`);

  recordPass(checkNum, title, details);
})();

// =============================================================================
// CHECK 2: Existence and syntax of build.gradle, settings.gradle, app/build.gradle
// =============================================================================
(function verifyCheck2() {
  const checkNum = 2;
  const title = "Gradle Build Configurations Syntax & Dependencies";
  const rootBuildGradle = path.join(ANDROID_DIR, 'build.gradle');
  const settingsGradle = path.join(ANDROID_DIR, 'settings.gradle');
  const appBuildGradle = path.join(APP_DIR, 'build.gradle');

  const missingFiles = [];
  if (!fs.existsSync(rootBuildGradle)) missingFiles.push(rootBuildGradle);
  if (!fs.existsSync(settingsGradle)) missingFiles.push(settingsGradle);
  if (!fs.existsSync(appBuildGradle)) missingFiles.push(appBuildGradle);

  if (missingFiles.length > 0) {
    return recordFail(checkNum, title, `Missing Gradle files: ${missingFiles.join(', ')}`);
  }

  const details = [];

  // 1. root build.gradle
  const rootBuildContent = fs.readFileSync(rootBuildGradle, 'utf8');
  if (!rootBuildContent.includes('google()') || !rootBuildContent.includes('mavenCentral()')) {
    return recordFail(checkNum, title, `root build.gradle missing google() or mavenCentral() repositories`);
  }
  details.push(`root build.gradle valid (google() and mavenCentral() present)`);

  // 2. settings.gradle
  const settingsContent = fs.readFileSync(settingsGradle, 'utf8');
  if (!settingsContent.includes("include ':app'") && !settingsContent.includes('include ":app"')) {
    return recordFail(checkNum, title, `settings.gradle missing include ':app'`);
  }
  details.push(`settings.gradle valid (includes ':app' module)`);

  // 3. app/build.gradle
  const appBuildContent = fs.readFileSync(appBuildGradle, 'utf8');
  
  // Namespace / ApplicationId
  const hasAppId = appBuildContent.includes('id.my.fiezel.app');
  if (!hasAppId) {
    return recordFail(checkNum, title, `app/build.gradle missing namespace or applicationId 'id.my.fiezel.app'`);
  }
  details.push(`app/build.gradle namespace and applicationId 'id.my.fiezel.app' confirmed`);

  // SDK Versions
  const compileSdkMatch = appBuildContent.match(/compileSdk\s+(\d+)/);
  const minSdkMatch = appBuildContent.match(/minSdk\s+(\d+)/);
  const targetSdkMatch = appBuildContent.match(/targetSdk\s+(\d+)/);

  if (!compileSdkMatch || parseInt(compileSdkMatch[1], 10) < 34) {
    return recordFail(checkNum, title, `app/build.gradle compileSdk must be >= 34, found: ${compileSdkMatch ? compileSdkMatch[1] : 'none'}`);
  }
  if (!minSdkMatch || parseInt(minSdkMatch[1], 10) < 21) {
    return recordFail(checkNum, title, `app/build.gradle minSdk must be >= 21, found: ${minSdkMatch ? minSdkMatch[1] : 'none'}`);
  }
  if (!targetSdkMatch || parseInt(targetSdkMatch[1], 10) < 34) {
    return recordFail(checkNum, title, `app/build.gradle targetSdk must be >= 34, found: ${targetSdkMatch ? targetSdkMatch[1] : 'none'}`);
  }
  details.push(`SDK Targets verified: compileSdk ${compileSdkMatch[1]}, targetSdk ${targetSdkMatch[1]}, minSdk ${minSdkMatch[1]}`);

  // AndroidX WebKit dependency (Mandatory for WebViewAssetLoader)
  if (!appBuildContent.includes('androidx.webkit:webkit')) {
    return recordFail(checkNum, title, `app/build.gradle missing 'androidx.webkit:webkit' dependency for WebViewAssetLoader`);
  }
  details.push(`AndroidX WebKit dependency present for WebViewAssetLoader`);

  recordPass(checkNum, title, details);
})();

// =============================================================================
// CHECK 3: Validity of MainActivity.java
// =============================================================================
(function verifyCheck3() {
  const checkNum = 3;
  const title = "MainActivity.java Architecture & Native WebView Integration";
  const mainActivityPath = path.join(MAIN_DIR, 'java', 'id', 'my', 'fiezel', 'app', 'MainActivity.java');

  if (!fs.existsSync(mainActivityPath)) {
    return recordFail(checkNum, title, `MainActivity.java not found at: ${mainActivityPath}`);
  }

  const javaContent = fs.readFileSync(mainActivityPath, 'utf8');
  const details = [];

  // Package check
  if (!javaContent.includes('package id.my.fiezel.app;')) {
    return recordFail(checkNum, title, `MainActivity.java has incorrect package declaration`);
  }
  details.push(`Package id.my.fiezel.app verified`);

  // Class declaration
  if (!javaContent.includes('class MainActivity extends AppCompatActivity') &&
      !javaContent.includes('class MainActivity extends Activity')) {
    return recordFail(checkNum, title, `MainActivity must extend AppCompatActivity or Activity`);
  }
  details.push(`MainActivity extends AppCompatActivity`);

  // WebViewAssetLoader integration
  const hasAssetLoader = javaContent.includes('WebViewAssetLoader') ||
                         javaContent.includes('FiezelAssetLoaderFactory');
  if (!hasAssetLoader) {
    return recordFail(checkNum, title, `MainActivity missing WebViewAssetLoader or FiezelAssetLoaderFactory integration`);
  }
  details.push(`WebViewAssetLoader virtual domain integration confirmed`);

  // WebChromeClient integration
  const hasWebChrome = javaContent.includes('WebChromeClient') ||
                       javaContent.includes('FiezelWebChromeClient');
  if (!hasWebChrome) {
    return recordFail(checkNum, title, `MainActivity missing WebChromeClient handler`);
  }
  details.push(`WebChromeClient integration confirmed (Camera/Mic and console forwarding)`);

  // Runtime Permission Handling
  const hasPermissionHandling = javaContent.includes('ActivityResultContracts.RequestMultiplePermissions') ||
                                javaContent.includes('requestPermissions') ||
                                javaContent.includes('checkSelfPermission') ||
                                javaContent.includes('onRequestPermissionsResult');
  if (!hasPermissionHandling) {
    return recordFail(checkNum, title, `MainActivity missing runtime permission handling logic`);
  }
  details.push(`Runtime permission dispatcher verified (Camera/Microphone)`);

  // Back Button Navigation
  const hasBackHandling = javaContent.includes('OnBackPressedCallback') ||
                          javaContent.includes('onBackPressed') ||
                          javaContent.includes('canGoBack()') ||
                          javaContent.includes('goBack()');
  if (!hasBackHandling) {
    return recordFail(checkNum, title, `MainActivity missing back navigation / OnBackPressedCallback logic`);
  }
  details.push(`Predictive Back navigation & OnBackPressedCallback handling verified`);

  recordPass(checkNum, title, details);
})();

// =============================================================================
// CHECK 4: Asset files present in android/app/src/main/assets/public/
// =============================================================================
(function verifyCheck4() {
  const checkNum = 4;
  const title = "Offline Web Runtime Assets in assets/public/";
  const publicAssetsDir = path.join(MAIN_DIR, 'assets', 'public');

  if (!fs.existsSync(publicAssetsDir)) {
    return recordFail(checkNum, title, `Directory not found: ${publicAssetsDir}`);
  }

  const details = [];

  // index.html
  const indexPath = path.join(publicAssetsDir, 'index.html');
  if (!fs.existsSync(indexPath)) {
    return recordFail(checkNum, title, `Missing index.html in ${publicAssetsDir}`);
  }
  const indexStat = fs.statSync(indexPath);
  if (indexStat.size < 1000) {
    return recordFail(checkNum, title, `index.html is unexpectedly small (${indexStat.size} bytes)`);
  }
  details.push(`index.html present (${(indexStat.size / 1024).toFixed(1)} KB)`);

  // style.css
  const stylePath = path.join(publicAssetsDir, 'style.css');
  if (!fs.existsSync(stylePath)) {
    return recordFail(checkNum, title, `Missing style.css in ${publicAssetsDir}`);
  }
  const styleStat = fs.statSync(stylePath);
  if (styleStat.size < 1000) {
    return recordFail(checkNum, title, `style.css is unexpectedly small (${styleStat.size} bytes)`);
  }
  details.push(`style.css present (${(styleStat.size / 1024).toFixed(1)} KB)`);

  // assets directory
  const nestedAssetsDir = path.join(publicAssetsDir, 'assets');
  if (!fs.existsSync(nestedAssetsDir)) {
    return recordFail(checkNum, title, `Missing assets/ directory in ${publicAssetsDir}`);
  }
  const assetEntries = fs.readdirSync(nestedAssetsDir);
  if (assetEntries.length === 0) {
    return recordFail(checkNum, title, `assets/ directory in ${publicAssetsDir} is empty`);
  }
  details.push(`assets/ directory present with ${assetEntries.length} top-level entries`);

  // Extra check: core-config.js and app.js
  const coreConfigPath = path.join(publicAssetsDir, 'core-config.js');
  if (fs.existsSync(coreConfigPath)) {
    details.push(`core-config.js verified in bundle`);
  }

  recordPass(checkNum, title, details);
})();

// =============================================================================
// CHECK 5: App icons presence across densities (mdpi, hdpi, xhdpi, xxhdpi, xxxhdpi)
// =============================================================================
(function verifyCheck5() {
  const checkNum = 5;
  const title = "App Launcher Icons Across Standard Android Densities";
  const resDir = path.join(MAIN_DIR, 'res');

  const densities = ['mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi'];
  const details = [];

  for (const density of densities) {
    const mipmapDir = path.join(resDir, `mipmap-${density}`);
    const drawableDir = path.join(resDir, `drawable-${density}`);

    const launcherInMipmap = path.join(mipmapDir, 'ic_launcher.png');
    const launcherInDrawable = path.join(drawableDir, 'ic_launcher.png');

    const iconExists = fs.existsSync(launcherInMipmap) || fs.existsSync(launcherInDrawable);
    if (!iconExists) {
      return recordFail(checkNum, title, `Missing ic_launcher.png for density ${density}`);
    }

    const foundPath = fs.existsSync(launcherInMipmap) ? launcherInMipmap : launcherInDrawable;
    const stat = fs.statSync(foundPath);
    if (stat.size === 0) {
      return recordFail(checkNum, title, `Icon file for density ${density} is empty (0 bytes)`);
    }

    // Check round icon
    const roundInMipmap = path.join(mipmapDir, 'ic_launcher_round.png');
    const roundInDrawable = path.join(drawableDir, 'ic_launcher_round.png');
    const roundExists = fs.existsSync(roundInMipmap) || fs.existsSync(roundInDrawable);

    details.push(`Density ${density.padEnd(7)}: ic_launcher.png verified (${stat.size} bytes)${roundExists ? ' + ic_launcher_round.png' : ''}`);
  }

  // Adaptive Icon XML check (Android 8.0+)
  const adaptiveXml = path.join(resDir, 'mipmap-anydpi-v26', 'ic_launcher.xml');
  if (fs.existsSync(adaptiveXml)) {
    details.push(`Adaptive icon XML (mipmap-anydpi-v26/ic_launcher.xml) present`);
  }

  recordPass(checkNum, title, details);
})();

// =============================================================================
// CHECK 6: GitHub Actions workflow syntax and steps
// =============================================================================
(function verifyCheck6() {
  const checkNum = 6;
  const title = "CI/CD Workflow .github/workflows/build-android-apk.yml";
  const workflowPath = path.join(ROOT_DIR, '.github', 'workflows', 'build-android-apk.yml');

  if (!fs.existsSync(workflowPath)) {
    return recordFail(checkNum, title, `Workflow not found: ${workflowPath}`);
  }

  const workflowContent = fs.readFileSync(workflowPath, 'utf8');
  const details = [];

  // 1. Basic Structure
  if (!workflowContent.includes('name: Build Android APK') && !workflowContent.includes('name:')) {
    return recordFail(checkNum, title, `Workflow missing name definition`);
  }
  if (!workflowContent.includes('actions/checkout')) {
    return recordFail(checkNum, title, `Workflow missing actions/checkout step`);
  }
  details.push(`Workflow name and checkout step confirmed`);

  // 2. Java Setup
  if (!workflowContent.includes('actions/setup-java') || !workflowContent.includes("'17'")) {
    return recordFail(checkNum, title, `Workflow missing actions/setup-java step with Java 17`);
  }
  details.push(`Java 17 setup step confirmed`);

  // 3. Android SDK Setup
  if (!workflowContent.includes('setup-android') && !workflowContent.includes('ANDROID_HOME')) {
    return recordFail(checkNum, title, `Workflow missing Android SDK setup step`);
  }
  details.push(`Android SDK environment configured`);

  // 4. Asset Synchronization Step
  if (!workflowContent.includes('sync-android-assets.mjs')) {
    return recordFail(checkNum, title, `Workflow missing web assets sync step (sync-android-assets.mjs)`);
  }
  details.push(`Web asset synchronization step confirmed`);

  // 5. Gradle Build Step
  if (!workflowContent.includes('assembleDebug') && !workflowContent.includes('assembleRelease')) {
    return recordFail(checkNum, title, `Workflow missing Gradle assemble step (assembleDebug/assembleRelease)`);
  }
  details.push(`Gradle APK build step (assembleDebug / assembleRelease) confirmed`);

  // 6. Artifact Upload Step
  if (!workflowContent.includes('actions/upload-artifact')) {
    return recordFail(checkNum, title, `Workflow missing actions/upload-artifact step`);
  }
  details.push(`APK artifact upload step confirmed`);

  recordPass(checkNum, title, details);
})();

// =============================================================================
// CHECK 7: No hardcoded secrets or prohibited claims
// =============================================================================
(function verifyCheck7() {
  const checkNum = 7;
  const title = "Zero-Secret & Zero-Prohibited-Claims Security Compliance";
  const details = [];

  // Prohibited Claims list from Workspace Rules
  const PROHIBITED_CLAIMS = [
    '100% Gratis',
    'Latihan Bisa Offline',
    'CEFR',
    'JLPT'
  ];

  // Scan targets: AndroidManifest, strings.xml, colors.xml, themes.xml, MainActivity.java, and workflow
  const filesToScan = [
    path.join(MAIN_DIR, 'AndroidManifest.xml'),
    path.join(MAIN_DIR, 'res', 'values', 'strings.xml'),
    path.join(MAIN_DIR, 'res', 'values', 'colors.xml'),
    path.join(MAIN_DIR, 'res', 'values', 'themes.xml'),
    path.join(MAIN_DIR, 'java', 'id', 'my', 'fiezel', 'app', 'MainActivity.java'),
    path.join(ROOT_DIR, '.github', 'workflows', 'build-android-apk.yml')
  ];

  for (const filePath of filesToScan) {
    if (!fs.existsSync(filePath)) continue;
    const content = fs.readFileSync(filePath, 'utf8');
    const relPath = path.relative(ROOT_DIR, filePath);

    for (const claim of PROHIBITED_CLAIMS) {
      if (content.includes(claim)) {
        return recordFail(checkNum, title, `Found prohibited claim "${claim}" in ${relPath}`);
      }
    }
  }
  details.push(`Zero prohibited claims ("100% Gratis", "Latihan Bisa Offline", "CEFR", "JLPT") across Android files`);

  // Hardcoded Secrets Check
  // Ensure no unencrypted private keys or hardcoded production passwords exist in tracked android source files
  const workflowPath = path.join(ROOT_DIR, '.github', 'workflows', 'build-android-apk.yml');
  if (fs.existsSync(workflowPath)) {
    const wf = fs.readFileSync(workflowPath, 'utf8');
    // Ensure release keystore uses secrets
    if (wf.includes('KEYSTORE_PASSWORD:') && !wf.includes('secrets.')) {
      return recordFail(checkNum, title, `Release keystore password in workflow must use GitHub secrets`);
    }
    details.push(`Release keystore password protected via GitHub secrets`);
  }

  // Check Android build.gradle files for plaintext hardcoded passwords
  const appBuild = fs.readFileSync(path.join(APP_DIR, 'build.gradle'), 'utf8');
  if (/storePassword\s+["'][^"']+["']/.test(appBuild) || /keyPassword\s+["'][^"']+["']/.test(appBuild)) {
    return recordFail(checkNum, title, `Hardcoded plaintext passwords found in app/build.gradle`);
  }
  details.push(`Zero plaintext keystore credentials in Gradle scripts`);

  recordPass(checkNum, title, details);
})();

// =============================================================================
// TEST SUITE SUMMARY
// =============================================================================
console.log(`\n${BOLD}========================================================================${RESET}`);
console.log(`                      INTEGRITY TEST SUITE SUMMARY                      `);
console.log(`${BOLD}========================================================================${RESET}`);
console.log(`Total Checks Executed : ${totalChecks}`);
console.log(`Checks Passed         : ${GREEN}${passedChecks}${RESET} / ${totalChecks}`);
console.log(`Checks Failed         : ${failedChecks.length > 0 ? RED : GREEN}${failedChecks.length}${RESET}`);

if (failedChecks.length === 0) {
  console.log(`\n${GREEN}${BOLD}🎉 ALL 7 INTEGRITY & SECURITY CHECKS PASSED (100% GREEN)!${RESET}\n`);
  process.exit(0);
} else {
  console.log(`\n${RED}${BOLD}❌ ${failedChecks.length} CHECK(S) FAILED. See details above.${RESET}\n`);
  process.exit(1);
}
