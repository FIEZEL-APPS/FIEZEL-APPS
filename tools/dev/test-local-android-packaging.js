/**
 * Developer Verification Script: Local Windows Android Packaging Scripts
 *
 * Verifies existence and correctness of:
 * - tools/build-android-apk.ps1
 * - tools/build-android-apk.bat
 * - tools/sync-android-assets.mjs
 *
 * Verifies that -CheckOnly mode validates prerequisites and outputs required winget instructions.
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..', '..');
const psScriptPath = path.join(rootDir, 'tools', 'build-android-apk.ps1');
const batScriptPath = path.join(rootDir, 'tools', 'build-android-apk.bat');
const syncScriptPath = path.join(rootDir, 'tools', 'sync-android-assets.mjs');

console.log('🧪 Testing Windows Android packaging scripts contract...');

// 1. Assert files exist
if (!fs.existsSync(psScriptPath)) {
  console.error('❌ FAIL: tools/build-android-apk.ps1 is missing.');
  process.exit(1);
}
console.log('  ✅ tools/build-android-apk.ps1 exists');

if (!fs.existsSync(batScriptPath)) {
  console.error('❌ FAIL: tools/build-android-apk.bat is missing.');
  process.exit(1);
}
console.log('  ✅ tools/build-android-apk.bat exists');

if (!fs.existsSync(syncScriptPath)) {
  console.error('❌ FAIL: tools/sync-android-assets.mjs is missing.');
  process.exit(1);
}
console.log('  ✅ tools/sync-android-assets.mjs exists');

// 2. Read PS1 script and verify critical string contracts
const psContent = fs.readFileSync(psScriptPath, 'utf8');

const requiredKeywords = [
  'winget install Microsoft.OpenJDK.17',
  'winget install EclipseAdoptium.Temurin.17.JDK',
  'winget install Google.AndroidStudio',
  'ANDROID_HOME',
  'JAVA_HOME',
  'gradlew.bat',
  'assembleDebug',
  'fiezel-debug.apk',
  'adb install -r',
  'CheckOnly'
];

for (const kw of requiredKeywords) {
  if (!psContent.includes(kw)) {
    console.error(`❌ FAIL: tools/build-android-apk.ps1 does not contain required keyword: "${kw}"`);
    process.exit(1);
  }
}
console.log('  ✅ tools/build-android-apk.ps1 contains all required guidance & keywords');

// 3. Test sync-android-assets.mjs --check execution
try {
  const syncOutput = execFileSync('node', [syncScriptPath, '--check'], {
    cwd: rootDir,
    encoding: 'utf8',
    timeout: 30000
  });
  if (!syncOutput.includes('Dry Run') && !syncOutput.includes('Check-Only') && !syncOutput.includes('Total Assets Selected')) {
    console.error('❌ FAIL: sync-android-assets.mjs did not output expected check summary.');
    console.error(syncOutput);
    process.exit(1);
  }
  console.log('  ✅ tools/sync-android-assets.mjs --check executed successfully');
} catch (err) {
  console.error('❌ FAIL: executing sync-android-assets.mjs failed:', err.message);
  process.exit(1);
}

// 4. Test powershell execution in -CheckOnly mode if on Windows
if (process.platform === 'win32') {
  try {
    const psOutput = execFileSync(
      'powershell.exe',
      ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', psScriptPath, '-CheckOnly'],
      {
        cwd: rootDir,
        encoding: 'utf8',
        timeout: 30000
      }
    );
    if (!psOutput.includes('TOOLCHAIN ENVIRONMENT SUMMARY') || !psOutput.includes('id.my.fiezel.app')) {
      console.error('❌ FAIL: build-android-apk.ps1 -CheckOnly output missing expected markers.');
      console.error(psOutput);
      process.exit(1);
    }
    console.log('  ✅ tools/build-android-apk.ps1 -CheckOnly executed cleanly on Windows');
  } catch (err) {
    console.error('❌ FAIL: executing build-android-apk.ps1 -CheckOnly failed:', err.message);
    process.exit(1);
  }
}

console.log('🎉 PASS: All Local Windows Build & Packaging script assertions succeeded!');
process.exit(0);
