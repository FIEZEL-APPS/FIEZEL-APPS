const fs=require('fs'),path=require('path'),crypto=require('crypto');
const canary=require('./content-canary.js'),promotion=require('./content-promotion.js');
const ATTESTATION_SCHEMA='fiezel-adoption-evidence-attestation-v1';
const ATTESTATION_GATE_VERSION='adoption-evidence-attestation-v1';
const MAX_ATTEMPTS=10000,MAX_ROLLBACKS=1000,MAX_LEDGER_ENTRIES=20;
const text=v=>String(v??'').trim();
const sha=v=>crypto.createHash('sha256').update(v).digest('hex');
const canonicalize=v=>Array.isArray(v)?v.map(canonicalize):(v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonicalize(v[k])])):v);
const canonicalJson=v=>JSON.stringify(canonicalize(v));
const payloadDigest=v=>sha(canonicalJson(v));
const candidateDigest=v=>sha(JSON.stringify(v));
const allowed=(obj,keys,label)=>{if(!obj||typeof obj!=='object'||Array.isArray(obj))throw new Error(`${label}_object_required`);const bad=Object.keys(obj).filter(k=>!keys.includes(k));if(bad.length)throw new Error(`${label}_unknown_field:${bad[0]}`);};
const int=(v,min,max,label)=>{if(!Number.isInteger(v)||v<min||v>max)throw new Error(`${label}_out_of_bounds`);return v;};
const iso=(v,label,allowEmpty=false)=>{const s=text(v);if(allowEmpty&&!s)return'';if(s.length>40||!Number.isFinite(Date.parse(s)))throw new Error(`${label}_invalid_timestamp`);return s;};
const EVIDENCE_KEYS=['schema','canaryId','exposureSessions','targetAttempts','targetCorrect','targetIncorrect','controlAttempts','controlCorrect','controlIncorrect','canaryAttempts','canaryCorrect','canaryIncorrect','promotedAttempts','promotedCorrect','promotedIncorrect','promotionLedger','lastExposureAt','lastOutcomeAt','rollbackCount','lastRollbackReason','privacy'];
const LEDGER_KEYS=['at','status','reason','patchId','controlAttempts','controlAccuracy','canaryAttempts','canaryAccuracy','promotedAttempts','promotedAccuracy'];
function validateEvidence(raw,canaryId){
  allowed(raw,EVIDENCE_KEYS,'evidence');
  if(raw.schema!==canary.EVIDENCE_SCHEMA||text(raw.canaryId)!==text(canaryId))throw new Error('evidence_identity_mismatch');
  allowed(raw.privacy||{},['rawAnswersIncluded','rawHistoryIncluded'],'evidence_privacy');
  if(raw.privacy?.rawAnswersIncluded!==false||raw.privacy?.rawHistoryIncluded!==false)throw new Error('privacy_violation');
  int(raw.exposureSessions,0,canary.MAX_EXPOSURE_SESSIONS,'exposureSessions');
  for(const k of ['targetAttempts','targetCorrect','targetIncorrect','controlAttempts','controlCorrect','controlIncorrect','canaryAttempts','canaryCorrect','canaryIncorrect','promotedAttempts','promotedCorrect','promotedIncorrect'])int(raw[k],0,MAX_ATTEMPTS,k);
  int(raw.rollbackCount,0,MAX_ROLLBACKS,'rollbackCount');
  if(raw.controlCorrect+raw.controlIncorrect!==raw.controlAttempts)throw new Error('control_count_inconsistent');
  if(raw.canaryCorrect+raw.canaryIncorrect!==raw.canaryAttempts)throw new Error('canary_count_inconsistent');
  if(raw.promotedCorrect+raw.promotedIncorrect!==raw.promotedAttempts)throw new Error('promoted_count_inconsistent');
  if(raw.targetAttempts!==raw.canaryAttempts+raw.promotedAttempts||raw.targetCorrect!==raw.canaryCorrect+raw.promotedCorrect||raw.targetIncorrect!==raw.canaryIncorrect+raw.promotedIncorrect)throw new Error('target_count_inconsistent');
  if(!Array.isArray(raw.promotionLedger)||raw.promotionLedger.length>MAX_LEDGER_ENTRIES)throw new Error('promotion_ledger_out_of_bounds');
  for(const entry of raw.promotionLedger){allowed(entry,LEDGER_KEYS,'promotion_ledger_entry');iso(entry.at,'promotion_ledger_at',true);if(!['hold','promote','rollback'].includes(text(entry.status)))throw new Error('promotion_ledger_status_invalid');if(text(entry.reason).length>100||text(entry.patchId).length>160)throw new Error('promotion_ledger_text_out_of_bounds');for(const k of ['controlAttempts','canaryAttempts','promotedAttempts'])int(entry[k],0,MAX_ATTEMPTS,`ledger_${k}`);for(const k of ['controlAccuracy','canaryAccuracy','promotedAccuracy'])if(entry[k]!==null)int(entry[k],0,100,`ledger_${k}`);}
  iso(raw.lastExposureAt,'lastExposureAt',true);iso(raw.lastOutcomeAt,'lastOutcomeAt',true);if(text(raw.lastRollbackReason).length>160)throw new Error('lastRollbackReason_out_of_bounds');
  return canary.sanitizeEvidence(raw,canaryId);
}
function validateObservation(raw){allowed(raw||{},['startedAt','endedAt'],'observation');const startedAt=iso(raw.startedAt,'observation_startedAt'),endedAt=iso(raw.endedAt,'observation_endedAt');if(Date.parse(endedAt)<=Date.parse(startedAt))throw new Error('observation_window_invalid');return{startedAt,endedAt};}
function promotionSummary(config,evidence,observation){const d=promotion.evaluate(config,evidence,Date.parse(observation.endedAt));return{schema:d.schema,status:d.status,reason:d.reason,canaryId:d.canaryId,patchId:d.patchId,sourceVersion:d.sourceVersion,metrics:d.metrics,thresholds:d.thresholds,privacy:d.privacy};}
function basePayload(raw){
  const candidate=raw?.candidate,config=canary.sanitizeConfig(raw?.canaryConfig);if(!candidate||!config||!config.enabled||config.mode!=='canary')throw new Error('valid_canary_config_required');
  const digest=candidateDigest(candidate);if(config.gateProof?.candidateSha256!==digest||candidateDigest(config.candidate)!==digest)throw new Error('candidate_config_digest_mismatch');
  const sourceVersion=text(raw.sourceVersion||candidate?.target?.sourceVersion);if(!sourceVersion||sourceVersion!==text(candidate?.target?.sourceVersion))throw new Error('source_version_mismatch');
  const evidence=validateEvidence(raw.evidence,config.canaryId),observation=validateObservation(raw.observation),promo=promotionSummary(config,evidence,observation);
  return{schema:ATTESTATION_SCHEMA,gateVersion:ATTESTATION_GATE_VERSION,sourceVersion,candidateSha256:digest,sourceItemSha256:text(candidate?.target?.sourceSha256),canaryConfigSha256:payloadDigest(config),patchId:text(candidate.patchId).slice(0,160),domain:text(candidate.domain),itemId:text(candidate?.target?.itemId).slice(0,160),canaryId:config.canaryId,evidence,observation,promotion:promo,privacy:{whitelistOnly:true,aggregateOnly:true,rawAnswersIncluded:false,rawHistoryIncluded:false},bounds:{maxExposureSessions:canary.MAX_EXPOSURE_SESSIONS,maxAttemptsPerPhase:MAX_ATTEMPTS,maxPromotionLedgerEntries:MAX_LEDGER_ENTRIES,maxRollbackCount:MAX_ROLLBACKS},authority:{ownerApprovalIncluded:false,ownerApprovalRequiredSeparately:true},deterministic:true};
}
function buildAttestation(raw){const payload=basePayload(raw);return{...payload,integrity:{algorithm:'sha256',canonicalization:'json-key-sort-v1',payloadSha256:payloadDigest(payload)}};}
function verifyAttestation(bundle,context={}){
  try{
    allowed(bundle||{},['schema','gateVersion','sourceVersion','candidateSha256','sourceItemSha256','canaryConfigSha256','patchId','domain','itemId','canaryId','evidence','observation','promotion','privacy','bounds','authority','deterministic','integrity'],'attestation');
    if(bundle.schema!==ATTESTATION_SCHEMA||bundle.gateVersion!==ATTESTATION_GATE_VERSION)throw new Error('invalid_attestation_contract');
    allowed(bundle.integrity||{},['algorithm','canonicalization','payloadSha256'],'integrity');if(bundle.integrity.algorithm!=='sha256'||bundle.integrity.canonicalization!=='json-key-sort-v1'||!/^[a-f0-9]{64}$/.test(text(bundle.integrity.payloadSha256)))throw new Error('invalid_integrity_contract');
    const payload={...bundle};delete payload.integrity;if(payloadDigest(payload)!==bundle.integrity.payloadSha256)throw new Error('attestation_digest_mismatch');
    if(bundle.privacy?.whitelistOnly!==true||bundle.privacy?.aggregateOnly!==true||bundle.privacy?.rawAnswersIncluded!==false||bundle.privacy?.rawHistoryIncluded!==false)throw new Error('privacy_violation');
    if(bundle.authority?.ownerApprovalIncluded!==false||bundle.authority?.ownerApprovalRequiredSeparately!==true)throw new Error('owner_boundary_invalid');
    const candidate=context.candidate,config=canary.sanitizeConfig(context.canaryConfig);if(!candidate||!config)throw new Error('verification_context_required');
    const digest=candidateDigest(candidate);if(bundle.candidateSha256!==digest||config.gateProof?.candidateSha256!==digest||candidateDigest(config.candidate)!==digest)throw new Error('candidate_digest_mismatch');
    if(bundle.sourceVersion!==text(context.sourceVersion||candidate?.target?.sourceVersion)||bundle.sourceVersion!==text(candidate?.target?.sourceVersion))throw new Error('source_version_mismatch');
    if(bundle.sourceItemSha256!==text(candidate?.target?.sourceSha256)||bundle.canaryConfigSha256!==payloadDigest(config)||bundle.canaryId!==config.canaryId||bundle.patchId!==text(candidate.patchId)||bundle.domain!==text(candidate.domain)||bundle.itemId!==text(candidate?.target?.itemId))throw new Error('attestation_identity_mismatch');
    const evidence=validateEvidence(bundle.evidence,config.canaryId),observation=validateObservation(bundle.observation),promo=promotionSummary(config,evidence,observation);
    if(canonicalJson(bundle.promotion)!==canonicalJson(promo))throw new Error('promotion_summary_mismatch');
    if(context.evidence&&canonicalJson(validateEvidence(context.evidence,config.canaryId))!==canonicalJson(evidence))throw new Error('evidence_context_mismatch');
    if(context.observation&&canonicalJson(validateObservation(context.observation))!==canonicalJson(observation))throw new Error('observation_context_mismatch');
    return{ok:true,evidence,observation,promotion:promo,candidateSha256:digest,attestationSha256:bundle.integrity.payloadSha256};
  }catch(e){return{ok:false,reason:e.message};}
}
function writeAttestation(file,bundle){const target=path.resolve(file),tmp=`${target}.tmp`;fs.writeFileSync(tmp,JSON.stringify(bundle,null,2)+'\n',{flag:'wx'});fs.renameSync(tmp,target);}
function cli(){const args=process.argv.slice(2),reqI=args.indexOf('--request'),outI=args.indexOf('--out'),attI=args.indexOf('--attestation');if(reqI>=0&&outI>=0){const req=JSON.parse(fs.readFileSync(path.resolve(args[reqI+1]),'utf8')),bundle=buildAttestation(req);writeAttestation(path.resolve(args[outI+1]),bundle);console.log(JSON.stringify(bundle,null,2));return;}if(attI>=0&&reqI>=0){const req=JSON.parse(fs.readFileSync(path.resolve(args[reqI+1]),'utf8')),bundle=JSON.parse(fs.readFileSync(path.resolve(args[attI+1]),'utf8')),v=verifyAttestation(bundle,req);console.log(JSON.stringify(v,null,2));process.exit(v.ok?0:1);}throw new Error('usage: --request <json> --out <attestation.json> OR --attestation <json> --request <json>');}
if(require.main===module){try{cli()}catch(e){console.error(`FIEZEL adoption evidence attestation: FAIL\n${e.stack}`);process.exit(1)}}
module.exports={ATTESTATION_SCHEMA,ATTESTATION_GATE_VERSION,MAX_ATTEMPTS,MAX_ROLLBACKS,MAX_LEDGER_ENTRIES,canonicalJson,payloadDigest,candidateDigest,validateEvidence,validateObservation,buildAttestation,verifyAttestation,writeAttestation};
