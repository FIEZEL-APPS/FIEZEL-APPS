const fs=require('fs'),path=require('path'),crypto=require('crypto');
const gate=require('./content-patch-gate.js'),canary=require('./content-canary.js'),promotion=require('./content-promotion.js'),attestation=require('./content-adoption-evidence.js'),origin=require('./content-evidence-origin.js');
const ADOPTION_SCHEMA='fiezel-content-adoption-v1';
const ROLLBACK_SCHEMA='fiezel-content-adoption-rollback-v1';
const ADOPTION_GATE_VERSION='canonical-adoption-v1';
const MIN_EXPOSURE_SESSIONS=10;
const MIN_CONTROL_ATTEMPTS=30;
const MIN_CANARY_ATTEMPTS=30;
const MIN_PROMOTED_ATTEMPTS=20;
const MIN_PROMOTED_ACCURACY=75;
const MAX_PROMOTED_REGRESSION_PP=3;
const MIN_OBSERVATION_DAYS=7;
const MIN_RELEASE_AUDIT_PASS=111;
const MIN_PRODUCT_AUDIT_PASS=44;
const clone=v=>JSON.parse(JSON.stringify(v));
const text=v=>String(v??'').trim();
const stable=v=>JSON.stringify(v);
const sha=v=>crypto.createHash('sha256').update(v).digest('hex');
const itemSha=v=>sha(stable(v));
const fileMap={grammar:'grammar-templates.json',vocabulary:'vocabulary-master.json',reading:'reading-bank.json'};
const pct=(correct,attempts)=>attempts>0?Math.round((Number(correct)||0)/(Number(attempts)||1)*100):null;
function thresholds(){return{minExposureSessions:MIN_EXPOSURE_SESSIONS,minControlAttempts:MIN_CONTROL_ATTEMPTS,minCanaryAttempts:MIN_CANARY_ATTEMPTS,minPromotedAttempts:MIN_PROMOTED_ATTEMPTS,minPromotedAccuracy:MIN_PROMOTED_ACCURACY,maxPromotedRegressionPp:MAX_PROMOTED_REGRESSION_PP,minObservationDays:MIN_OBSERVATION_DAYS,minReleaseAuditPass:MIN_RELEASE_AUDIT_PASS,minProductAuditPass:MIN_PRODUCT_AUDIT_PASS};}
function canonicalHashes(input){return{grammar:sha(stable(input.grammar)),vocabulary:sha(stable(input.vocabulary)),reading:sha(stable(input.reading))};}
function candidateDigest(candidate){return sha(stable(candidate));}
function result(status,reason,request,metrics={},extra={}){return{schema:ADOPTION_SCHEMA,gateVersion:ADOPTION_GATE_VERSION,status,reason,sourceVersion:text(request?.sourceVersion),targetVersion:text(request?.targetVersion),patchId:text(request?.candidate?.patchId).slice(0,160),domain:text(request?.candidate?.domain),itemId:text(request?.candidate?.target?.itemId).slice(0,160),metrics,thresholds:thresholds(),releaseTimeOnly:true,canonicalMutationAtRuntime:false,privacy:{rawAnswersIncluded:false,rawHistoryIncluded:false},...extra};}
function semver(v){const m=/^(\d+)\.(\d+)\.(\d+)$/.exec(text(v));return m?m.slice(1).map(Number):null;}
function versionAfter(a,b){const x=semver(a),y=semver(b);if(!x||!y)return false;for(let i=0;i<3;i++){if(y[i]>x[i])return true;if(y[i]<x[i])return false;}return false;}
function evaluate(raw,input=gate.loadCanonical(),now=Date.now(),securityContext={}){
  const r=raw||{};
  if(r.schema!==ADOPTION_SCHEMA||r.gateVersion!==ADOPTION_GATE_VERSION)return result('reject','invalid_contract',r);
  if(text(r.sourceVersion)!==text(input.version))return result('reject','source_version_mismatch',r);
  if(!versionAfter(r.sourceVersion,r.targetVersion))return result('reject','target_version_must_advance',r);
  if(r.privacy?.rawAnswersIncluded===true||r.privacy?.rawHistoryIncluded===true)return result('reject','privacy_violation',r);
  if(r.candidate?.provenance?.generator==='local-proof-fixture')return result('reject','proof_fixture_not_adoptable',r);
  const gated=gate.validateCandidate(r.candidate,input);if(!gated.ok)return result('reject','guarded_patch_gate_failed',r,{}, {errors:gated.errors});
  const config=canary.sanitizeConfig(r.canaryConfig);if(!config||!config.enabled||config.mode!=='canary')return result('reject','invalid_canary_config',r);
  const gatedDigest=candidateDigest(gated.candidate);if(config.candidate.patchId!==gated.candidate.patchId||candidateDigest(config.candidate)!==gatedDigest||config.gateProof?.candidateSha256!==gatedDigest)return result('reject','candidate_config_mismatch',r);
  if(!r.evidenceAttestation)return result('reject','evidence_attestation_required',r);
  const attested=attestation.verifyAttestation(r.evidenceAttestation,{sourceVersion:r.sourceVersion,candidate:gated.candidate,canaryConfig:config});if(!attested.ok)return result('reject','evidence_attestation_invalid',r,{}, {attestationReason:attested.reason});
  if(!r.evidenceOriginEnvelope)return result('reject','evidence_origin_required',r);
  if(!securityContext.originTrustPolicy)return result('reject','origin_trust_policy_required',r);
  const originVerified=origin.verifyOrigin(r.evidenceOriginEnvelope,r.evidenceAttestation,securityContext.originTrustPolicy,{sourceVersion:r.sourceVersion,candidate:gated.candidate,canaryConfig:config},now);if(!originVerified.ok)return result('reject','evidence_origin_invalid',r,{}, {originReason:originVerified.reason});
  const evidence=attested.evidence,observation=attested.observation;
  if(evidence.rollbackCount>0)return result('reject','prior_runtime_rollback',r,{rollbackCount:evidence.rollbackCount});
  const promo=promotion.evaluate(config,evidence,now);if(promo.status!=='promote'||promo.reason!=='post_promotion_stable')return result('hold','promotion_not_stably_observed',r,promo.metrics||{});
  const controlAccuracy=pct(evidence.controlCorrect,evidence.controlAttempts),canaryAccuracy=pct(evidence.canaryCorrect,evidence.canaryAttempts),promotedAccuracy=pct(evidence.promotedCorrect,evidence.promotedAttempts);
  const metrics={exposureSessions:evidence.exposureSessions,controlAttempts:evidence.controlAttempts,controlAccuracy,canaryAttempts:evidence.canaryAttempts,canaryAccuracy,promotedAttempts:evidence.promotedAttempts,promotedAccuracy,rollbackCount:evidence.rollbackCount};
  if(metrics.exposureSessions<MIN_EXPOSURE_SESSIONS)return result('hold','insufficient_extended_exposure',r,metrics);
  if(metrics.controlAttempts<MIN_CONTROL_ATTEMPTS)return result('hold','insufficient_extended_control',r,metrics);
  if(metrics.canaryAttempts<MIN_CANARY_ATTEMPTS)return result('hold','insufficient_extended_canary',r,metrics);
  if(metrics.promotedAttempts<MIN_PROMOTED_ATTEMPTS)return result('hold','insufficient_promoted_evidence',r,metrics);
  const requiredPromoted=Math.max(MIN_PROMOTED_ACCURACY,(controlAccuracy??MIN_PROMOTED_ACCURACY)-MAX_PROMOTED_REGRESSION_PP);
  if(promotedAccuracy===null||promotedAccuracy<requiredPromoted)return result('reject','extended_learning_regression',r,{...metrics,requiredPromotedAccuracy:requiredPromoted});
  const started=Date.parse(text(observation?.startedAt)),ended=Date.parse(text(observation?.endedAt));
  if(!Number.isFinite(started)||!Number.isFinite(ended)||ended<=started)return result('reject','invalid_observation_window',r,{...metrics,requiredPromotedAccuracy:requiredPromoted});
  const observationDays=(ended-started)/(24*60*60*1000);if(observationDays<MIN_OBSERVATION_DAYS)return result('hold','observation_window_too_short',r,{...metrics,requiredPromotedAccuracy:requiredPromoted,observationDays});
  if(ended>now+5*60*1000)return result('reject','observation_window_in_future',r,{...metrics,observationDays});
  const approval=r.approval||{};if(approval.authority!=='owner-release'||approval.approved!==true||!/^[A-Za-z0-9._:-]{6,120}$/.test(text(approval.reviewId)))return result('reject','owner_release_approval_required',r,{...metrics,observationDays});
  const audit=r.auditProof||{},digest=candidateDigest(gated.candidate);
  if(audit.status!=='PASS'||audit.canonicalImmutable!==true||audit.candidateSha256!==digest||Number(audit.releaseAuditFail)!==0||Number(audit.releaseAuditPass)<MIN_RELEASE_AUDIT_PASS||Number(audit.productAuditFail)!==0||Number(audit.productAuditPass)<MIN_PRODUCT_AUDIT_PASS||Number(audit.contentQaBlockers)!==0)return result('reject','release_audit_boundary_failed',r,{...metrics,observationDays});
  return result('eligible','canonical_adoption_gate_pass',r,{...metrics,requiredPromotedAccuracy:requiredPromoted,observationDays},{candidate:gated.candidate,canonicalImmutable:true,candidateSha256:digest,approval:{authority:'owner-release',approved:true,reviewId:text(approval.reviewId)},auditProof:{status:'PASS',releaseAuditPass:Number(audit.releaseAuditPass),releaseAuditFail:0,productAuditPass:Number(audit.productAuditPass),productAuditFail:0,contentQaBlockers:0,canonicalImmutable:true,candidateSha256:digest},evidenceAttestationSha256:attested.attestationSha256,evidenceOriginVerificationSha256:originVerified.originEnvelopeSha256,evidenceOriginId:originVerified.originId,evidenceOriginKeyId:originVerified.keyId,evidenceOriginTrustPolicySha256:originVerified.trustPolicySha256,evidenceOriginTrustPolicyId:originVerified.trustPolicyId,productionEvidenceOriginVerified:true});
}
function buildBundle(raw,input=gate.loadCanonical(),now=Date.now(),securityContext={}){
  const decision=evaluate(raw,input,now,securityContext);if(decision.status!=='eligible')return{ok:false,decision};
  const before=clone(input),candidate=decision.candidate,locBefore=gate.locate(before,candidate.domain,candidate.target.itemId),patched=gate.applyCandidate(before,candidate);
  patched.version=text(raw.targetVersion);if(patched.grammar&&typeof patched.grammar==='object')patched.grammar.version=text(raw.targetVersion);
  const locAfter=gate.locate(patched,candidate.domain,candidate.target.itemId),beforeHashes=canonicalHashes(before),afterHashes=canonicalHashes(patched);
  const rollback={schema:ROLLBACK_SCHEMA,gateVersion:ADOPTION_GATE_VERSION,sourceVersion:text(raw.sourceVersion),targetVersion:text(raw.targetVersion),patchId:candidate.patchId,domain:candidate.domain,itemId:candidate.target.itemId,originalItem:clone(locBefore.item),originalItemSha256:itemSha(locBefore.item),adoptedItemSha256:itemSha(locAfter.item),sourceCanonicalSha256:beforeHashes,targetCanonicalSha256:afterHashes,privacy:{learnerDataIncluded:false,rawAnswersIncluded:false,rawHistoryIncluded:false}};
  const manifest={schema:ADOPTION_SCHEMA,gateVersion:ADOPTION_GATE_VERSION,status:'STAGED',sourceVersion:text(raw.sourceVersion),targetVersion:text(raw.targetVersion),patchId:candidate.patchId,domain:candidate.domain,itemId:candidate.target.itemId,candidateSha256:decision.candidateSha256,sourceCanonicalSha256:beforeHashes,targetCanonicalSha256:afterHashes,originalItemSha256:rollback.originalItemSha256,adoptedItemSha256:rollback.adoptedItemSha256,ownerReviewId:decision.approval.reviewId,evidenceAttestationSha256:decision.evidenceAttestationSha256,evidenceOriginVerificationSha256:decision.evidenceOriginVerificationSha256,evidenceOriginId:decision.evidenceOriginId,evidenceOriginKeyId:decision.evidenceOriginKeyId,evidenceOriginTrustPolicySha256:decision.evidenceOriginTrustPolicySha256,evidenceOriginTrustPolicyId:decision.evidenceOriginTrustPolicyId,productionEvidenceOriginVerified:true,releaseTimeOnly:true,deterministicRebuild:true,rollbackArtifact:true,canonicalSourceMutated:false};
  return{ok:true,decision,staged:patched,rollback,manifest};
}
function restoreBundle(bundle){
  if(!bundle?.ok||bundle.rollback?.schema!==ROLLBACK_SCHEMA)throw new Error('valid adoption bundle required');
  const out=clone(bundle.staged),rb=bundle.rollback,loc=gate.locate(out,rb.domain,rb.itemId);if(!loc||itemSha(loc.item)!==rb.adoptedItemSha256)throw new Error('staged target hash mismatch');
  if(rb.domain==='vocabulary')out.vocabulary[loc.index]=clone(rb.originalItem);else if(rb.domain==='grammar')out.grammar.templates[loc.index]=clone(rb.originalItem);else out.reading[loc.passageIndex].qs[loc.questionIndex]=clone(rb.originalItem);
  out.version=rb.sourceVersion;if(out.grammar&&typeof out.grammar==='object')out.grammar.version=rb.sourceVersion;
  const hashes=canonicalHashes(out);if(stable(hashes)!==stable(rb.sourceCanonicalSha256))throw new Error('rollback canonical hash mismatch');return out;
}
function writeBundle(outDir,bundle){
  if(!bundle?.ok)throw new Error('eligible bundle required');const resolved=path.resolve(outDir),sourceRoot=path.resolve(__dirname);if(resolved===sourceRoot)throw new Error('refusing to write adoption bundle into canonical source root');for(const f of ['grammar-templates.json','vocabulary-master.json','reading-bank.json','VERSION.json']){if(fs.existsSync(path.join(resolved,f)))throw new Error('staging directory must not contain canonical files');}fs.mkdirSync(resolved,{recursive:true});outDir=resolved;
  fs.writeFileSync(path.join(outDir,'grammar-templates.json'),JSON.stringify(bundle.staged.grammar,null,2)+'\n');
  fs.writeFileSync(path.join(outDir,'vocabulary-master.json'),JSON.stringify(bundle.staged.vocabulary,null,2)+'\n');
  fs.writeFileSync(path.join(outDir,'reading-bank.json'),JSON.stringify(bundle.staged.reading,null,2)+'\n');
  fs.writeFileSync(path.join(outDir,'VERSION.json'),JSON.stringify({version:bundle.manifest.targetVersion})+'\n');
  fs.writeFileSync(path.join(outDir,'CONTENT-ADOPTION-MANIFEST.json'),JSON.stringify(bundle.manifest,null,2)+'\n');
  fs.writeFileSync(path.join(outDir,'CONTENT-ADOPTION-ROLLBACK.json'),JSON.stringify(bundle.rollback,null,2)+'\n');
}
function cli(){const args=process.argv.slice(2),idx=args.indexOf('--request'),outIdx=args.indexOf('--out'),trustIdx=args.indexOf('--origin-trust-policy');if(idx<0||!args[idx+1]||outIdx<0||!args[outIdx+1]||trustIdx<0||!args[trustIdx+1])throw new Error('usage: node content-adoption.js --request <json> --origin-trust-policy <json> --out <staging-dir>');const request=JSON.parse(fs.readFileSync(path.resolve(args[idx+1]),'utf8')),originTrustPolicy=JSON.parse(fs.readFileSync(path.resolve(args[trustIdx+1]),'utf8')),bundle=buildBundle(request,gate.loadCanonical(),Date.now(),{originTrustPolicy});if(!bundle.ok){console.error(JSON.stringify(bundle.decision,null,2));process.exit(1);}writeBundle(path.resolve(args[outIdx+1]),bundle);console.log(JSON.stringify(bundle.manifest,null,2));}
if(require.main===module){try{cli()}catch(e){console.error(`FIEZEL canonical adoption: FAIL\n${e.stack}`);process.exit(1)}}
module.exports={ADOPTION_SCHEMA,ROLLBACK_SCHEMA,ADOPTION_GATE_VERSION,MIN_EXPOSURE_SESSIONS,MIN_CONTROL_ATTEMPTS,MIN_CANARY_ATTEMPTS,MIN_PROMOTED_ATTEMPTS,MIN_PROMOTED_ACCURACY,MAX_PROMOTED_REGRESSION_PP,MIN_OBSERVATION_DAYS,MIN_RELEASE_AUDIT_PASS,MIN_PRODUCT_AUDIT_PASS,candidateDigest,canonicalHashes,evaluate,buildBundle,restoreBundle,writeBundle};
