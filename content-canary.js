(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.FIEZEL_CONTENT_CANARY=api;
})(typeof self!=='undefined'?self:globalThis,function(){
  'use strict';
  const CANARY_SCHEMA='fiezel-content-canary-v1';
  const EVIDENCE_SCHEMA='fiezel-content-canary-evidence-v1';
  const PATCH_SCHEMA='fiezel-content-patch-v1';
  const REQUIRED_GATE_VERSION='guarded-patch-v1';
  const MAX_EXPOSURE_PERCENT=10;
  const MAX_EXPOSURE_SESSIONS=20;
  const MAX_CANARY_WINDOW_MS=30*24*60*60*1000;
  const DOMAINS=new Set(['grammar','vocabulary','reading']);
  const clone=v=>JSON.parse(JSON.stringify(v));
  const text=v=>String(v??'').trim();
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,Number(v)||0));
  function locate(input,domain,itemId){
    if(domain==='grammar'){const index=(input.grammar?.templates||[]).findIndex(x=>x.id===itemId);return index<0?null:{kind:'grammar',index,item:input.grammar.templates[index]};}
    if(domain==='vocabulary'){const index=(input.vocabulary||[]).findIndex(x=>x.id===itemId);return index<0?null:{kind:'vocabulary',index,item:input.vocabulary[index]};}
    const m=/^(.+)#([1-5])$/.exec(itemId);if(!m)return null;
    const passageIndex=(input.reading||[]).findIndex(x=>x.id===m[1]),questionIndex=Number(m[2])-1;
    if(passageIndex<0)return null;const q=input.reading[passageIndex]?.qs?.[questionIndex];
    return q?{kind:'reading',passageIndex,questionIndex,item:q,passage:input.reading[passageIndex]}:null;
  }
  async function sha256Hex(value){
    const bytes=new TextEncoder().encode(String(value));
    const subtle=globalThis.crypto?.subtle;
    if(subtle){const out=await subtle.digest('SHA-256',bytes);return Array.from(new Uint8Array(out)).map(b=>b.toString(16).padStart(2,'0')).join('');}
    if(typeof require==='function')return require('crypto').createHash('sha256').update(bytes).digest('hex');
    throw new Error('sha256 unavailable');
  }
  function candidateBasic(raw){
    if(!raw||raw.schema!==PATCH_SCHEMA||!DOMAINS.has(text(raw.domain)))return null;
    if(!/^[A-Za-z0-9._:-]{8,160}$/.test(text(raw.patchId)))return null;
    if(!/^[A-Za-z0-9._:#-]{2,160}$/.test(text(raw.target?.itemId)))return null;
    if(!/^\d+\.\d+\.\d+$/.test(text(raw.target?.sourceVersion)))return null;
    if(!/^[a-f0-9]{64}$/.test(text(raw.target?.sourceSha256)))return null;
    if(!raw.replacement||typeof raw.replacement!=='object'||Array.isArray(raw.replacement))return null;
    return clone(raw);
  }
  function sanitizeConfig(raw){
    if(!raw||raw.schema!==CANARY_SCHEMA)return null;
    const mode=text(raw.mode).toLowerCase();if(!['off','shadow','canary'].includes(mode))return null;
    const enabled=raw.enabled===true;
    if(!enabled||mode==='off')return{schema:CANARY_SCHEMA,enabled:false,mode:'off',canaryId:text(raw.canaryId).slice(0,120)};
    const canaryId=text(raw.canaryId);if(!/^[A-Za-z0-9._:-]{8,120}$/.test(canaryId))return null;
    const exposurePercent=clamp(raw.exposurePercent,0,MAX_EXPOSURE_PERCENT);
    const maxExposureSessions=Math.floor(clamp(raw.maxExposureSessions,1,MAX_EXPOSURE_SESSIONS));
    if(mode==='canary'&&exposurePercent<=0)return null;
    const candidate=candidateBasic(raw.candidate);if(!candidate)return null;
    const gate=raw.gateProof||{};
    if(gate.status!=='PASS'||text(gate.gateVersion)!==REQUIRED_GATE_VERSION||text(gate.patchId)!==candidate.patchId||!gate.canonicalImmutable)return null;
    if(!/^[a-f0-9]{64}$/.test(text(gate.candidateSha256)))return null;
    const expiresAt=text(raw.expiresAt).slice(0,40),targetLearnerKey=text(raw.targetLearnerKey).slice(0,80);
    return{schema:CANARY_SCHEMA,enabled:true,mode,canaryId,exposurePercent,maxExposureSessions,expiresAt,targetLearnerKey,candidate,gateProof:{status:'PASS',gateVersion:REQUIRED_GATE_VERSION,patchId:candidate.patchId,candidateSha256:text(gate.candidateSha256),canonicalImmutable:true}};
  }
  function bucket(learnerKey,canaryId){
    const s=`${text(canaryId)}|${text(learnerKey)||'anonymous'}`;let h=2166136261;
    for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)>>>0;}
    return h%10000;
  }
  function initialEvidence(canaryId=''){return{schema:EVIDENCE_SCHEMA,canaryId:text(canaryId).slice(0,120),exposureSessions:0,targetAttempts:0,targetCorrect:0,targetIncorrect:0,controlAttempts:0,controlCorrect:0,controlIncorrect:0,canaryAttempts:0,canaryCorrect:0,canaryIncorrect:0,promotedAttempts:0,promotedCorrect:0,promotedIncorrect:0,promotionLedger:[],lastExposureAt:'',lastOutcomeAt:'',rollbackCount:0,lastRollbackReason:'',privacy:{rawAnswersIncluded:false,rawHistoryIncluded:false}};}
  function sanitizeEvidence(raw,canaryId){
    const base=initialEvidence(canaryId);if(!raw||raw.schema!==EVIDENCE_SCHEMA||text(raw.canaryId)!==text(canaryId))return base;
    const legacyAttempts=Math.floor(clamp(raw.targetAttempts,0,10000)),legacyCorrect=Math.floor(clamp(raw.targetCorrect,0,10000)),legacyIncorrect=Math.floor(clamp(raw.targetIncorrect,0,10000));
    const explicitCanary=raw.canaryAttempts!=null||raw.canaryCorrect!=null||raw.canaryIncorrect!=null;
    const canaryAttempts=Math.floor(clamp(explicitCanary?raw.canaryAttempts:legacyAttempts,0,10000)),canaryCorrect=Math.floor(clamp(explicitCanary?raw.canaryCorrect:legacyCorrect,0,10000)),canaryIncorrect=Math.floor(clamp(explicitCanary?raw.canaryIncorrect:legacyIncorrect,0,10000));
    const ledger=(Array.isArray(raw.promotionLedger)?raw.promotionLedger:[]).slice(-20).map(x=>({at:text(x?.at).slice(0,40),status:['hold','promote','rollback'].includes(text(x?.status))?text(x.status):'hold',reason:text(x?.reason).slice(0,100),patchId:text(x?.patchId).slice(0,160),controlAttempts:Math.floor(clamp(x?.controlAttempts,0,10000)),controlAccuracy:x?.controlAccuracy==null?null:Math.floor(clamp(x.controlAccuracy,0,100)),canaryAttempts:Math.floor(clamp(x?.canaryAttempts,0,10000)),canaryAccuracy:x?.canaryAccuracy==null?null:Math.floor(clamp(x.canaryAccuracy,0,100)),promotedAttempts:Math.floor(clamp(x?.promotedAttempts,0,10000)),promotedAccuracy:x?.promotedAccuracy==null?null:Math.floor(clamp(x.promotedAccuracy,0,100))}));
    return{...base,exposureSessions:Math.floor(clamp(raw.exposureSessions,0,MAX_EXPOSURE_SESSIONS)),targetAttempts:canaryAttempts+Math.floor(clamp(raw.promotedAttempts,0,10000)),targetCorrect:canaryCorrect+Math.floor(clamp(raw.promotedCorrect,0,10000)),targetIncorrect:canaryIncorrect+Math.floor(clamp(raw.promotedIncorrect,0,10000)),controlAttempts:Math.floor(clamp(raw.controlAttempts,0,10000)),controlCorrect:Math.floor(clamp(raw.controlCorrect,0,10000)),controlIncorrect:Math.floor(clamp(raw.controlIncorrect,0,10000)),canaryAttempts,canaryCorrect,canaryIncorrect,promotedAttempts:Math.floor(clamp(raw.promotedAttempts,0,10000)),promotedCorrect:Math.floor(clamp(raw.promotedCorrect,0,10000)),promotedIncorrect:Math.floor(clamp(raw.promotedIncorrect,0,10000)),promotionLedger:ledger,lastExposureAt:text(raw.lastExposureAt).slice(0,40),lastOutcomeAt:text(raw.lastOutcomeAt).slice(0,40),rollbackCount:Math.floor(clamp(raw.rollbackCount,0,1000)),lastRollbackReason:text(raw.lastRollbackReason).slice(0,160),privacy:{rawAnswersIncluded:false,rawHistoryIncluded:false}};
  }
  function recordEvidence(raw,canaryId,event={}){
    const out=sanitizeEvidence(raw,canaryId),now=text(event.at)||new Date().toISOString();
    if(event.type==='exposure'){out.exposureSessions=Math.min(MAX_EXPOSURE_SESSIONS,out.exposureSessions+1);out.lastExposureAt=now;}
    if(event.type==='outcome'){const phase=['control','canary','promoted'].includes(text(event.phase))?text(event.phase):'canary',attemptKey=`${phase}Attempts`,correctKey=`${phase}Correct`,incorrectKey=`${phase}Incorrect`;out[attemptKey]=Math.min(10000,Number(out[attemptKey]||0)+1);if(event.correct===true)out[correctKey]=Math.min(10000,Number(out[correctKey]||0)+1);else out[incorrectKey]=Math.min(10000,Number(out[incorrectKey]||0)+1);out.targetAttempts=Math.min(10000,out.canaryAttempts+out.promotedAttempts);out.targetCorrect=Math.min(10000,out.canaryCorrect+out.promotedCorrect);out.targetIncorrect=Math.min(10000,out.canaryIncorrect+out.promotedIncorrect);out.lastOutcomeAt=now;}
    if(event.type==='rollback'){out.rollbackCount=Math.min(1000,out.rollbackCount+1);out.lastRollbackReason=text(event.reason).slice(0,160);}
    return out;
  }
  function markTarget(input,candidate,meta,phase='control'){
    const out=clone(input),loc=locate(out,candidate.domain,candidate.target.itemId);if(!loc)throw new Error('target missing');const mark={schema:CANARY_SCHEMA,canaryId:meta.canaryId,patchId:candidate.patchId,domain:candidate.domain,itemId:candidate.target.itemId,phase};
    if(candidate.domain==='vocabulary'){out.vocabulary[loc.index]={...loc.item,__fiezelCanary:mark};return out;}
    if(candidate.domain==='grammar'){out.grammar.templates[loc.index]={...loc.item,__fiezelCanary:mark};return out;}
    const q=clone(loc.item),meta0=q[3]&&typeof q[3]==='object'&&!Array.isArray(q[3])?q[3]:{};q[3]={...meta0,__fiezelCanary:mark};out.reading[loc.passageIndex].qs[loc.questionIndex]=q;return out;
  }
  function recordPromotionDecision(raw,canaryId,decision,at=new Date().toISOString()){
    const out=sanitizeEvidence(raw,canaryId);if(!text(canaryId)||!decision||!['hold','promote','rollback'].includes(text(decision.status)))return out;
    const m=decision.metrics||{},entry={at:text(at).slice(0,40),status:text(decision.status),reason:text(decision.reason).slice(0,100),patchId:text(decision.patchId).slice(0,160),controlAttempts:Math.floor(clamp(m.controlAttempts,0,10000)),controlAccuracy:m.controlAccuracy==null?null:Math.floor(clamp(m.controlAccuracy,0,100)),canaryAttempts:Math.floor(clamp(m.canaryAttempts,0,10000)),canaryAccuracy:m.canaryAccuracy==null?null:Math.floor(clamp(m.canaryAccuracy,0,100)),promotedAttempts:Math.floor(clamp(m.promotedAttempts,0,10000)),promotedAccuracy:m.promotedAccuracy==null?null:Math.floor(clamp(m.promotedAccuracy,0,100))};
    const last=out.promotionLedger[out.promotionLedger.length-1],same=last&&last.status===entry.status&&last.reason===entry.reason&&last.patchId===entry.patchId&&last.controlAttempts===entry.controlAttempts&&last.controlAccuracy===entry.controlAccuracy&&last.canaryAttempts===entry.canaryAttempts&&last.canaryAccuracy===entry.canaryAccuracy&&last.promotedAttempts===entry.promotedAttempts&&last.promotedAccuracy===entry.promotedAccuracy;
    if(!same)out.promotionLedger=[...out.promotionLedger,entry].slice(-20);return out;
  }
  function applyCandidate(input,candidate,meta,phase='canary'){
    const out=clone(input),loc=locate(out,candidate.domain,candidate.target.itemId);if(!loc)throw new Error('target missing');const r=clone(candidate.replacement),mark={schema:CANARY_SCHEMA,canaryId:meta.canaryId,patchId:candidate.patchId,domain:candidate.domain,itemId:candidate.target.itemId,phase};
    if(candidate.domain==='vocabulary'){out.vocabulary[loc.index]={...loc.item,...r,__fiezelCanary:mark};return out;}
    if(candidate.domain==='grammar'){const c=loc.item;out.grammar.templates[loc.index]={id:c.id,family:c.family,subskill:c.subskill,cefr:c.cefr,questionType:c.questionType,...r,__fiezelCanary:mark};return out;}
    const q=[r.stem,clone(r.options),r.correctIndex,{...clone(r.meta),__fiezelCanary:mark}];out.reading[loc.passageIndex].qs[loc.questionIndex]=q;return out;
  }
  async function prepare(input,rawConfig,learnerKey,evidenceRaw,now=Date.now(),promotionDecision=null){
    const config=sanitizeConfig(rawConfig);if(!config)return{status:'rollback',reason:'invalid_config',dataset:input,config:null,evidence:sanitizeEvidence(evidenceRaw,'')};
    if(!config.enabled){const evidenceId=config.canaryId||text(evidenceRaw?.canaryId);return{status:'baseline',reason:'disabled',dataset:input,config,evidence:sanitizeEvidence(evidenceRaw,evidenceId)};}
    if(config.expiresAt){const exp=Date.parse(config.expiresAt);if(!Number.isFinite(exp)||exp<=now)return{status:'rollback',reason:'expired',dataset:input,config,evidence:recordEvidence(evidenceRaw,config.canaryId,{type:'rollback',reason:'expired'})};if(exp-now>MAX_CANARY_WINDOW_MS)return{status:'rollback',reason:'expiry_window_exceeded',dataset:input,config,evidence:recordEvidence(evidenceRaw,config.canaryId,{type:'rollback',reason:'expiry_window_exceeded'})};}else return{status:'rollback',reason:'expiry_required',dataset:input,config,evidence:recordEvidence(evidenceRaw,config.canaryId,{type:'rollback',reason:'expiry_required'})};
    const candidateDigest=await sha256Hex(JSON.stringify(config.candidate));if(candidateDigest!==config.gateProof.candidateSha256)return{status:'rollback',reason:'candidate_digest_mismatch',dataset:input,config,evidence:recordEvidence(evidenceRaw,config.canaryId,{type:'rollback',reason:'candidate_digest_mismatch'})};
    if(text(config.candidate.target.sourceVersion)!==text(input.version))return{status:'rollback',reason:'source_version_mismatch',dataset:input,config,evidence:recordEvidence(evidenceRaw,config.canaryId,{type:'rollback',reason:'source_version_mismatch'})};
    const loc=locate(input,config.candidate.domain,config.candidate.target.itemId);if(!loc)return{status:'rollback',reason:'target_missing',dataset:input,config,evidence:recordEvidence(evidenceRaw,config.canaryId,{type:'rollback',reason:'target_missing'})};
    const sourceDigest=await sha256Hex(JSON.stringify(loc.item));if(sourceDigest!==config.candidate.target.sourceSha256)return{status:'rollback',reason:'source_hash_mismatch',dataset:input,config,evidence:recordEvidence(evidenceRaw,config.canaryId,{type:'rollback',reason:'source_hash_mismatch'})};
    const evidence=sanitizeEvidence(evidenceRaw,config.canaryId),patched=applyCandidate(input,config.candidate,{canaryId:config.canaryId},'canary'),control=markTarget(input,config.candidate,{canaryId:config.canaryId},'control');
    if(promotionDecision?.status==='rollback')return{status:'rollback',reason:`promotion_${text(promotionDecision.reason)||'rollback'}`,dataset:input,config,evidence:recordEvidence(evidence,config.canaryId,{type:'rollback',reason:`promotion_${text(promotionDecision.reason)||'rollback'}`}),promotionDecision};
    if(promotionDecision?.status==='promote'&&text(promotionDecision.canaryId)===config.canaryId&&text(promotionDecision.patchId)===config.candidate.patchId)return{status:'promoted',reason:text(promotionDecision.reason)||'promotion_pass',dataset:applyCandidate(input,config.candidate,{canaryId:config.canaryId},'promoted'),config,evidence,promotionDecision};
    if(config.mode==='shadow')return{status:'shadow',reason:'shadow_no_learner_exposure',dataset:control,shadowDataset:patched,config,evidence};
    if(evidence.exposureSessions>=config.maxExposureSessions)return{status:'rollback',reason:'exposure_limit_reached',dataset:input,config,evidence:recordEvidence(evidence,config.canaryId,{type:'rollback',reason:'exposure_limit_reached'})};
    const assigned=config.targetLearnerKey?text(learnerKey)===config.targetLearnerKey:bucket(learnerKey,config.canaryId)<Math.round(config.exposurePercent*100);
    if(!assigned)return{status:'baseline',reason:'cohort_not_assigned',dataset:control,config,evidence};
    return{status:'canary',reason:'assigned',dataset:patched,config,evidence:recordEvidence(evidence,config.canaryId,{type:'exposure'}),assignmentBucket:bucket(learnerKey,config.canaryId)};
  }
  return{CANARY_SCHEMA,EVIDENCE_SCHEMA,PATCH_SCHEMA,REQUIRED_GATE_VERSION,MAX_EXPOSURE_PERCENT,MAX_EXPOSURE_SESSIONS,MAX_CANARY_WINDOW_MS,sha256Hex,bucket,initialEvidence,sanitizeEvidence,recordEvidence,recordPromotionDecision,sanitizeConfig,locate,markTarget,applyCandidate,prepare};
});
