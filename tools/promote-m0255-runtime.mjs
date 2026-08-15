#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = process.cwd();
const EXPECTED_SHA = 'f4329122c16919d170cb88d071b7d22066a4567d4f76feec2d3273412be145ad';
const EXPECTED_SIZE = 2136684;
const EXPECTED_BLOCKED_STATE = 'SOURCE_CANDIDATE_PROVEN / PROMOTION_BLOCKED';
const PROMOTED_STATE = 'RUNTIME_CANDIDATE_PROMOTED / DEVICE_GATE_PENDING';
const OLD_RUNTIME_SHA = '2551a7e181b2359b6148a2f1b842f75537639ad5f46071b3db48483bb9762d61';
const OLD_RUNTIME_SIZE = 2136409;
const NEW_SW_REV = 'm025-5-safari-phonemizer-compat-20260816-1';

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const artifactArg = args.find(arg => arg !== '--apply');
if (!artifactArg) {
  console.error('Usage: node tools/promote-m0255-runtime.mjs /path/to/kokoro.web.js [--apply]');
  process.exit(2);
}

const abs = p => path.resolve(ROOT, p);
const readText = p => fs.readFileSync(abs(p), 'utf8');
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');

function count(text, needle) {
  return text.split(needle).length - 1;
}
function requireCount(text, needle, expected, label) {
  const actual = count(text, needle);
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected} occurrence(s) of ${JSON.stringify(needle)}, got ${actual}`);
  }
}
function replaceExact(text, from, to, expected, label) {
  requireCount(text, from, expected, label);
  return text.split(from).join(to);
}
function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const artifactPath = path.resolve(artifactArg);
const artifact = fs.readFileSync(artifactPath);
const artifactSha = sha256(artifact);
assert(artifact.length === EXPECTED_SIZE, `artifact size mismatch: expected ${EXPECTED_SIZE}, got ${artifact.length}`);
assert(artifactSha === EXPECTED_SHA, `artifact SHA mismatch: expected ${EXPECTED_SHA}, got ${artifactSha}`);

const artifactText = artifact.toString('utf8');
assert(count(artifactText, 'ReadableStream.prototype[Symbol.asyncIterator]') === 2,
  'artifact is missing the exact m025-5 ReadableStream async-iterator guard count');
assert(count(artifactText, 'releaseLock()') === 1,
  'artifact is missing the exact m025-5 ReadableStream releaseLock() path');
assert(artifactText.includes('ReadableStream.prototype[Symbol.asyncIterator]=async function*()'),
  'artifact is missing the m025-5 async-generator assignment');
assert(artifactText.includes('this.getReader()'),
  'artifact is missing the m025-5 getReader() path');

const lockPath = 'NEURAL-VOICE-SOURCE-LOCK.json';
const vendorPath = 'vendor/kokoro-js/kokoro.web.js';
const bootPath = 'features/neural-voice/fiezel-neural-voice-bootstrap.js';
const diagPath = 'features/neural-voice/fiezel-diag-panel.js';
const swPath = 'sw.js';
const hotfixTestPath = 'neural-voice-device-hotfix-test.js';

const lock = JSON.parse(readText(lockPath));
assert(lock.candidate?.id === 'm025-5', 'source lock candidate id must be m025-5');
assert(lock.candidate?.state === EXPECTED_BLOCKED_STATE, 'candidate must still be blocked before apply');
assert(lock.candidate?.provenance?.runtimePromoted === false, 'runtimePromoted must be false before apply');
assert(lock.candidate?.bundle?.sha256 === EXPECTED_SHA, 'candidate lock SHA drifted');
assert(lock.candidate?.bundle?.sizeBytes === EXPECTED_SIZE, 'candidate lock size drifted');
assert(lock.runtime?.bundle?.sha256 === OLD_RUNTIME_SHA, 'runtime SHA is not the expected m025-4 baseline');
assert(lock.runtime?.bundle?.sizeBytes === OLD_RUNTIME_SIZE, 'runtime size is not the expected m025-4 baseline');

const currentVendor = fs.readFileSync(abs(vendorPath));
assert(sha256(currentVendor) === OLD_RUNTIME_SHA, 'committed vendor bytes do not match the expected m025-4 baseline');
assert(currentVendor.length === OLD_RUNTIME_SIZE, 'committed vendor size does not match the expected m025-4 baseline');

let boot = readText(bootPath);
requireCount(boot, 'vendor/kokoro-js/kokoro.web.js?nv=m025-4', 2, 'bootstrap old vendor URL');
requireCount(boot, 'vendor/kokoro-js/kokoro.web.js?nv=m025-5', 0, 'bootstrap premature m025-5 URL');
boot = boot.split('vendor/kokoro-js/kokoro.web.js?nv=m025-4').join('vendor/kokoro-js/kokoro.web.js?nv=m025-5');
boot = replaceExact(
  boot,
  "{path:'vendor/kokoro-js/kokoro.web.js?nv=m025-5',bytes:2136409}",
  "{path:'vendor/kokoro-js/kokoro.web.js?nv=m025-5',bytes:2136684}",
  1,
  'bootstrap candidate byte count'
);

let diag = readText(diagPath);
diag = replaceExact(diag, "var DIAG_BUILD = 'm025-4';", "var DIAG_BUILD = 'm025-5';", 1, 'Diagnostics build');

let sw = readText(swPath);
sw = replaceExact(sw, './vendor/kokoro-js/kokoro.web.js?nv=m025-4', './vendor/kokoro-js/kokoro.web.js?nv=m025-5', 1, 'SW vendor URL');
sw = replaceExact(
  sw,
  "const SW_REV='m025-4-espeak-phase-probe-20260816-1';",
  `const SW_REV='${NEW_SW_REV}';`,
  1,
  'SW revision'
);

let hotfixTest = readText(hotfixTestPath);
const hotfixOldCount = count(hotfixTest, 'm025-4');
assert(hotfixOldCount > 0, 'focused hotfix test no longer contains m025-4 expectations');
assert(count(hotfixTest, 'm025-5') === 0, 'focused hotfix test already contains m025-5 before promotion helper apply');
hotfixTest = hotfixTest.split('m025-4').join('m025-5');

lock.runtime.bundle = {
  path: lock.candidate.bundle.path,
  sizeBytes: EXPECTED_SIZE,
  sha256: EXPECTED_SHA
};
lock.candidate.state = PROMOTED_STATE;
lock.candidate.provenance.runtimePromoted = true;
if (lock.promotion && typeof lock.promotion === 'object') {
  lock.promotion.sourceAndAssetClosure = 'PASS';
  lock.promotion.realDeviceGate = 'PENDING';
  lock.promotion.productionClaim = false;
}

const planned = [
  vendorPath,
  lockPath,
  bootPath,
  diagPath,
  swPath,
  hotfixTestPath
];

console.log(`m025-5 artifact verified: sha256=${artifactSha} size=${artifact.length}`);
console.log('Safari semantic guard verified: asyncIterator=2 releaseLock=1');
console.log(`Promotion plan is atomic across ${planned.length} files:`);
for (const file of planned) console.log(` - ${file}`);

if (!apply) {
  console.log('DRY RUN ONLY. Re-run with --apply in an authenticated candidate-branch workspace to write the promotion files.');
  process.exit(0);
}

fs.copyFileSync(artifactPath, abs(vendorPath));
fs.writeFileSync(abs(lockPath), JSON.stringify(lock, null, 2) + '\n');
fs.writeFileSync(abs(bootPath), boot);
fs.writeFileSync(abs(diagPath), diag);
fs.writeFileSync(abs(swPath), sw);
fs.writeFileSync(abs(hotfixTestPath), hotfixTest);

const promotedVendor = fs.readFileSync(abs(vendorPath));
assert(sha256(promotedVendor) === EXPECTED_SHA, 'post-write vendor SHA mismatch');
assert(promotedVendor.length === EXPECTED_SIZE, 'post-write vendor size mismatch');

console.log('m025-5 promotion files written. No commit/push was performed.');
console.log('Required next commands:');
console.log('  node neural-voice-m0255-promotion-test.js');
console.log('  node neural-voice-device-hotfix-test.js');
console.log('  node neural-voice-generation-timeout-test.js');
console.log('  node neural-voice-single-flight-test.js');
console.log('Then inspect git diff and run the full repository gates before any commit/merge.');