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

assert.ok(candidate,'m025-5 candidate lock must exist');
assert.equal(candidate.id,'m025-5','candidate identity must remain m025-5');
assert.equal(candidate.bundle.path,'vendor/kokoro-js/kokoro.web.js','candidate bundle path must remain canonical');
assert.equal(candidate.bundle.sha256,'f4329122c16919d170cb88d071b7d22066a4567d4f76feec2d3273412be145ad','candidate SHA must remain the twice-proven deterministic artifact');
assert.equal(candidate.bundle.sizeBytes,2136684,'candidate size must remain the twice-proven deterministic artifact');
assert.ok(candidate.provenance.successfulIndependentBuilds>=2,'candidate requires at least two independent successful builds');
assert.equal(candidate.provenance.byteIdentical,true,'candidate builds must be byte-identical');
assert.equal(lock.dependencies.phonemizerSafariUpstreamFix.baseCommit,lock.dependencies.phonemizerCommit,'Safari fix must remain based on the pinned phonemizer commit');
assert.equal(lock.dependencies.phonemizerSafariUpstreamFix.headCommit,'6cef703722c7e867029665df9c85ccaadc4ef19c','Safari fix head must remain exact');
assert.equal(lock.dependencies.phonemizerSafariUpstreamFix.sourcePath,'src/espeakng.worker.js','Safari fix scope must remain the eSpeak worker only');
assert.equal(lock.dependencies.phonemizerSafariUpstreamFix.sourceBlobGitSha,'3c2cc8ca249d5b8011b67b7c4041567dae184e94','Safari worker blob must remain exact');
assert.ok(boot.includes("root.navigator?.standalone===true?30000:20000"),'Apple standalone generation timeout must remain 30s');
assert.ok(Number.isInteger(diagBuild),'Diagnostics build must remain parseable');
assert.ok(Number.isInteger(swBuild),'SW release build must remain parseable');

const runtimePromoted=candidate.provenance.runtimePromoted===true;
const actualBundle=readBuf(candidate.bundle.path);
const actualSha=sha256(actualBundle);
const actualSize=actualBundle.length;

if(!runtimePromoted){
  assert.equal(candidate.state,'SOURCE_CANDIDATE_PROVEN / PROMOTION_BLOCKED','unpromoted candidate must remain explicitly blocked');
  assert.notEqual(lock.runtime.bundle.sha256,candidate.bundle.sha256,'blocked candidate must not masquerade as the runtime lock');
  assert.notEqual(lock.runtime.bundle.sizeBytes,candidate.bundle.sizeBytes,'blocked candidate size must remain distinct from runtime');
  assert.equal(actualSha,lock.runtime.bundle.sha256,'repository vendor must remain the locked m025-4 runtime while promotion is blocked');
  assert.equal(actualSize,lock.runtime.bundle.sizeBytes,'repository vendor size must remain the locked m025-4 runtime while promotion is blocked');
  assert.ok(boot.includes("vendor/kokoro-js/kokoro.web.js?nv=m025-4"),'blocked state must keep bootstrap on m025-4');
  assert.ok(!boot.includes("vendor/kokoro-js/kokoro.web.js?nv=m025-5"),'blocked state must not expose an m025-5 vendor URL');
  assert.ok(boot.includes("{path:'vendor/kokoro-js/kokoro.web.js?nv=m025-4',bytes:2136409}"),'blocked state must keep m025-4 asset size');
  assert.equal(diagBuild,4,'blocked state must keep m025-4 diagnostics identity');
  assert.ok(sw.includes("./vendor/kokoro-js/kokoro.web.js?nv=m025-4"),'blocked state must keep m025-4 SW vendor precache');
  assert.equal(swBuild,4,'blocked state must keep m025-4 SW revision');
}else{
  assert.notEqual(candidate.state,'SOURCE_CANDIDATE_PROVEN / PROMOTION_BLOCKED','promoted runtime must advance candidate state');
  assert.equal(lock.runtime.bundle.sha256,candidate.bundle.sha256,'promotion must atomically advance runtime SHA to the proven candidate');
  assert.equal(lock.runtime.bundle.sizeBytes,candidate.bundle.sizeBytes,'promotion must atomically advance runtime size to the proven candidate');
  assert.equal(actualSha,candidate.bundle.sha256,'promoted repository vendor must equal the proven candidate bytes');
  assert.equal(actualSize,candidate.bundle.sizeBytes,'promoted repository vendor size must equal the proven candidate size');
  assert.ok(boot.includes("vendor/kokoro-js/kokoro.web.js?nv=m025-5"),'promoted bootstrap must use m025-5 vendor URL');
  assert.ok(!boot.includes("vendor/kokoro-js/kokoro.web.js?nv=m025-4"),'promoted bootstrap must not retain the old versioned vendor URL');
  assert.ok(boot.includes("{path:'vendor/kokoro-js/kokoro.web.js?nv=m025-5',bytes:2136684}"),'promoted bootstrap must use the exact m025-5 asset size');
  assert.ok(diagBuild>=5,'post-promotion Diagnostics must never regress below the m025-5 vendor adoption build');
  if(diagBuild>=16){
    assert.ok(!sw.includes("'./vendor/kokoro-js/kokoro.web.js?nv=m025-5'"),'m025-16+ shell releases must not pre-cache the neural-owned m025-5 runtime URL');
  }else{
    assert.ok(sw.includes("./vendor/kokoro-js/kokoro.web.js?nv=m025-5"),'pre-m025-16 promoted releases must keep the historical m025-5 SW precache contract');
  }
  assert.ok(!sw.includes("./vendor/kokoro-js/kokoro.web.js?nv=m025-4"),'post-promotion SW must not precache the old vendor URL');
  assert.equal(swBuild,diagBuild,'later app deploys may advance beyond m025-5, but SW and Diagnostics build identities must remain coherent');
}

console.log(`FIEZEL m025-5 atomic vendor promotion contract: PASS (${runtimePromoted?'promoted':'blocked'}, deploy=m025-${diagBuild})`);