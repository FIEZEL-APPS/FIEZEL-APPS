const fs=require('fs');
const path=require('path');
const assert=require('assert');
const crypto=require('crypto');

const read=p=>fs.readFileSync(path.join(__dirname,p),'utf8');
const readBuf=p=>fs.readFileSync(path.join(__dirname,p));
const sha256=value=>crypto.createHash('sha256').update(value).digest('hex');

const lock=JSON.parse(read('NEURAL-VOICE-SOURCE-LOCK.json'));
const boot=read('features/neural-voice/fiezel-neural-voice-bootstrap.js');
const diag=read('features/neural-voice/fiezel-diag-panel.js');
const sw=read('sw.js');
const candidate=lock.candidate;
const diagBuildMatch=diag.match(/var DIAG_BUILD = 'm025-(\d+)'/);
const swBuildMatch=sw.match(/const SW_REV='m025-(\d+)-/);
const diagBuild=diagBuildMatch?Number(diagBuildMatch[1]):null;
const swBuild=swBuildMatch?Number(swBuildMatch[1]):null;

assert.ok(candidate,'neural vendor candidate lock must exist');
assert.equal(candidate.id,'m025-22','current source-locked candidate must be m025-22');
assert.equal(candidate.state,'MACHINE_VERIFIED / PHYSICAL_PENDING','m025-22 must not claim physical release before Apple acceptance');
assert.equal(candidate.bundle.path,'vendor/kokoro-js/kokoro.web.js','candidate bundle path must remain canonical');
assert.equal(candidate.bundle.sha256,'91d849dc97a2e43edab1e576721792211bc240da4d086591d42b5356959dc32f','candidate SHA must equal the independently reproduced m025-22 artifact');
assert.equal(candidate.bundle.sizeBytes,2136728,'candidate size must equal the independently reproduced m025-22 artifact');
assert.ok(candidate.provenance.successfulIndependentBuilds>=2,'candidate requires at least two independent successful builds');
assert.equal(candidate.provenance.byteIdentical,true,'candidate builds must be byte-identical');
assert.equal(candidate.provenance.runtimePromoted,true,'m025-22 candidate bytes must be atomically promoted in this branch');
assert.equal(candidate.provenance.browserWasmEnvReadBack,true,'m025-22 requires actual-browser WASM env readback proof');

// Preserve the m025-5 Safari phonemizer provenance that originally justified this gate.
assert.equal(lock.dependencies.phonemizerSafariUpstreamFix.baseCommit,lock.dependencies.phonemizerCommit,'Safari fix must remain based on the pinned phonemizer commit');
assert.equal(lock.dependencies.phonemizerSafariUpstreamFix.headCommit,'6cef703722c7e867029665df9c85ccaadc4ef19c','Safari fix head must remain exact');
assert.equal(lock.dependencies.phonemizerSafariUpstreamFix.sourcePath,'src/espeakng.worker.js','Safari fix scope must remain the eSpeak worker only');
assert.equal(lock.dependencies.phonemizerSafariUpstreamFix.sourceBlobGitSha,'3c2cc8ca249d5b8011b67b7c4041567dae184e94','Safari worker blob must remain exact');

const integrationPatch=lock.provider.sourcePatches.find(x=>x.name==='fiezel-integration');
assert.ok(integrationPatch,'FIEZEL integration source patch must remain locked');
assert.equal(integrationPatch.sha256,'a8a8163ecde6216685a09a52861e373d33b8be67031d675be31f9c50390f3444','m025-22 integration patch SHA must remain exact');
assert.equal(sha256(readBuf(integrationPatch.path)),integrationPatch.sha256,'committed integration patch bytes must equal source lock');

assert.ok(boot.includes("root.navigator?.standalone===true?30000:20000"),'Apple standalone generation timeout must remain 30s');
assert.ok(Number.isInteger(diagBuild),'Diagnostics build must remain parseable');
assert.ok(Number.isInteger(swBuild),'SW release build must remain parseable');

const actualBundle=readBuf(candidate.bundle.path);
const actualSha=sha256(actualBundle);
const actualSize=actualBundle.length;
assert.equal(lock.runtime.bundle.sha256,candidate.bundle.sha256,'runtime SHA must atomically equal the proven candidate');
assert.equal(lock.runtime.bundle.sizeBytes,candidate.bundle.sizeBytes,'runtime size must atomically equal the proven candidate');
assert.equal(actualSha,candidate.bundle.sha256,'repository vendor must equal the proven candidate bytes');
assert.equal(actualSize,candidate.bundle.sizeBytes,'repository vendor size must equal the proven candidate size');
// m025-26: Kokoro is no longer the active engine, so the bootstrap no longer declares
// its runtime URL. The Kokoro source-lock integrity checks above still apply to the
// vendored bytes; what moves here is only which engine the bootstrap actually loads.
assert.ok(!boot.includes("vendor/kokoro-js/kokoro.web.js?nv=m025-5"),'bootstrap must not retain the old m025-5 vendor URL');
assert.ok(boot.includes("vendor/sherpa-vits/sherpa-onnx-wasm-main-tts.data"),'bootstrap must declare the active sherpa engine runtime');
assert.ok(!sw.includes("'./vendor/kokoro-js/kokoro.web.js?nv=m025-22'"),'m025-16+ shell releases must not pre-cache the neural-owned runtime URL');
assert.ok(!sw.includes("'./vendor/sherpa-vits/sherpa-onnx-wasm-main-tts.data'"),'shell releases must not pre-cache the neural-owned engine payload');
assert.equal(swBuild,diagBuild,'SW and Diagnostics build identities must remain coherent');

assert.equal(lock.promotion.sourceAndAssetClosure,'PASS','m025-22 source/asset closure must be machine-proven');
assert.equal(lock.promotion.realDeviceGate,'PENDING','m025-22 physical Apple gate must remain pending before owner acceptance');
assert.equal(lock.promotion.productionClaim,false,'source lock must not claim m025-22 physical production success prematurely');
assert.ok(lock.promotion.historicalPhysicalBaselineM0255,'historical m025-5 physical evidence must remain preserved separately');

console.log(`FIEZEL atomic neural vendor promotion contract: PASS (candidate=${candidate.id}, deploy=m025-${diagBuild}, physical=${lock.promotion.realDeviceGate})`);