const assert=require('assert'),fs=require('fs'),path=require('path'),os=require('os'),crypto=require('crypto');
const gate=require('./content-patch-gate.js'),builder=require('./content-canary-config-builder.js'),att=require('./content-adoption-evidence.js');
const clone=v=>JSON.parse(JSON.stringify(v));
const shaFile=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
(()=>{
  const input=gate.loadCanonical(),proof=gate.proofCandidate(input),candidate=clone(proof);
  candidate.patchId=`attestation-test-${proof.target.itemId}-${input.version}`;candidate.provenance={generator:'human',model:'none',generatedAt:'2026-08-01T00:00:00Z'};
  const config=builder.buildConfig(candidate,{mode:'canary',canaryId:'attestation-test-5.17.0',exposurePercent:10,maxExposureSessions:20,expiresAt:'2026-09-01T00:00:00Z',targetLearnerKey:'Jahran'}).config;
  const evidence={schema:'fiezel-content-canary-evidence-v1',canaryId:config.canaryId,exposureSessions:10,targetAttempts:50,targetCorrect:42,targetIncorrect:8,controlAttempts:30,controlCorrect:24,controlIncorrect:6,canaryAttempts:30,canaryCorrect:24,canaryIncorrect:6,promotedAttempts:20,promotedCorrect:18,promotedIncorrect:2,promotionLedger:[{at:'2026-08-12T00:00:00Z',status:'promote',reason:'post_promotion_stable',patchId:candidate.patchId,controlAttempts:30,controlAccuracy:80,canaryAttempts:30,canaryAccuracy:80,promotedAttempts:20,promotedAccuracy:90}],lastExposureAt:'2026-08-12T00:00:00Z',lastOutcomeAt:'2026-08-12T00:00:00Z',rollbackCount:0,lastRollbackReason:'',privacy:{rawAnswersIncluded:false,rawHistoryIncluded:false}};
  const observation={startedAt:'2026-08-01T00:00:00Z',endedAt:'2026-08-12T00:00:00Z'},raw={sourceVersion:input.version,candidate,canaryConfig:config,evidence,observation};
  const sourceFiles=['grammar-templates.json','vocabulary-master.json','reading-bank.json'],before=Object.fromEntries(sourceFiles.map(f=>[f,shaFile(path.join(__dirname,f))]));
  const a1=att.buildAttestation(raw),a2=att.buildAttestation(raw);assert.deepStrictEqual(a1,a2,'attestation export must be deterministic');
  assert(a1.schema===att.ATTESTATION_SCHEMA&&a1.privacy.aggregateOnly===true&&a1.authority.ownerApprovalIncluded===false,'attestation contract must be aggregate-only and not embed owner approval');
  const verified=att.verifyAttestation(a1,raw);assert(verified.ok&&verified.promotion.status==='promote'&&verified.promotion.reason==='post_promotion_stable','valid aggregate attestation must verify');
  const tamper=clone(a1);tamper.evidence.promotedCorrect=17;assert(att.verifyAttestation(tamper,raw).reason==='attestation_digest_mismatch','payload tampering must fail digest verification');
  const wrongSource=clone(raw);wrongSource.sourceVersion='5.14.0';assert(att.verifyAttestation(a1,wrongSource).reason==='source_version_mismatch','source version lock must fail closed');
  const wrongCandidate=clone(raw);wrongCandidate.candidate.patchId+='-x';assert(att.verifyAttestation(a1,wrongCandidate).reason==='candidate_digest_mismatch','candidate hash lock must fail closed');
  const rawPrivate=clone(raw);rawPrivate.evidence.rawAnswers=['forbidden'];assert.throws(()=>att.buildAttestation(rawPrivate),/evidence_unknown_field/,'unwhitelisted learner evidence must fail closed');
  const privacy=clone(raw);privacy.evidence.privacy.rawHistoryIncluded=true;assert.throws(()=>att.buildAttestation(privacy),/privacy_violation/,'raw learner history must fail closed');
  const inconsistent=clone(raw);inconsistent.evidence.controlCorrect=23;assert.throws(()=>att.buildAttestation(inconsistent),/control_count_inconsistent/,'aggregate counts must be internally consistent');
  const overflow=clone(raw);overflow.evidence.promotedAttempts=10001;overflow.evidence.targetAttempts=10031;assert.throws(()=>att.buildAttestation(overflow),/out_of_bounds/,'numeric evidence must remain bounded');
  const approvalInjection=clone(a1);approvalInjection.approval={authority:'owner-release',approved:true};approvalInjection.integrity.payloadSha256='0'.repeat(64);assert(att.verifyAttestation(approvalInjection,raw).reason.startsWith('attestation_unknown_field'),'attestation must not carry owner approval authority');
  const tmp=path.join(os.tmpdir(),`FIEZEL-ADOPTION-EVIDENCE-${process.pid}.json`);try{att.writeAttestation(tmp,a1);const imported=JSON.parse(fs.readFileSync(tmp,'utf8'));assert(att.verifyAttestation(imported,raw).ok,'exported attestation must import and verify');}finally{try{fs.unlinkSync(tmp)}catch{}}
  const after=Object.fromEntries(sourceFiles.map(f=>[f,shaFile(path.join(__dirname,f))]));assert.deepStrictEqual(after,before,'attestation tooling must not mutate canonical source');
  const report={schema:att.ATTESTATION_SCHEMA,gateVersion:att.ATTESTATION_GATE_VERSION,version:input.version,status:'PASS',deterministicExport:true,importVerification:true,sourceVersionLocked:true,candidateHashLocked:true,canaryConfigLocked:true,aggregateOnly:true,privacyWhitelist:true,boundedEvidence:true,countConsistency:true,tamperRejected:true,ownerApprovalSeparate:true,canonicalImmutable:true,productionAuthenticityClaimed:false};
  fs.writeFileSync(path.join(__dirname,'CONTENT-ADOPTION-EVIDENCE-PROOF.json'),JSON.stringify(report,null,2)+'\n');console.log('FIEZEL adoption evidence attestation: PASS');console.log(JSON.stringify(report));
})()
