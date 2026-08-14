const path=require('path');
const {run,domainOf,buildCandidate,buildCanaryConfig,sanitizeAi}=require('./fiezel-self-refine.js');
const config=require('./fiezel-autonomy-config.js');
const library=require('./fiezel-prompt-library.js');
const patchGate=require('./content-patch-gate.js');
const promotion=require('./content-promotion.js');
const LIB=library.loadLibrary(path.join(__dirname,'fiezel-prompt-library.json'));
const OWNER='123e4567-e89b-12d3-a456-426614174000';
const AT='2026-08-14T00:00:00Z';
const canonical=patchGate.loadCanonical();
let pass=0,fail=0;
function check(name,ok,details){if(ok){pass++}else{fail++;console.error(`FAIL ${name}: ${details}`)}}
const INSIGHT={id:'ins-001',domain:'vocabulary',itemId:canonical.vocabulary[0].id,category:'context_thin',finding:'Vocabulary example is unusually short and may not establish the intended sense.',templateId:'expand_context'};
const V0=canonical.vocabulary[0];
const AI_OUTPUT=(()=>{const base=V0.example.replace(/[.!?]+$/,'');const example=`${base}, which gives the sentence clearer context.`;return{text:'dummy',model:'test-model',generatedAt:'2026-08-14T00:00:00Z',meaning:V0.meaning,example,meanings:V0.meanings,examples:V0.examples.map((x,i)=>i===0?{en:example,id:x.id}:x),synonyms:V0.synonyms,antonyms:V0.antonyms,collocations:V0.collocations,topic:V0.topic,status:V0.status,needsReviewReason:V0.needsReviewReason,rationale:'expand context'}})();
const PATCH_ID=`sr-ins-001-${patchGate.itemSha(INSIGHT.itemId).slice(0,8)}`;
const EVIDENCE={schema:'fiezel-content-canary-evidence-v1',canaryId:PATCH_ID,exposureSessions:5,controlAttempts:10,controlCorrect:9,canaryAttempts:10,canaryCorrect:9,privacy:{rawAnswersIncluded:false,rawHistoryIncluded:false}};
{
  const r=run({config:{autonomyLevel:'advisory'},patchGate,library:LIB,promotion,insight:INSIGHT,aiOutput:AI_OUTPUT});
  check('advisory holds before refine',!r.ok&&r.decision==='hold'&&r.reason==='advisory_mode_no_refine',JSON.stringify(r));
}
{
  const r=run({config:{autonomyLevel:'bogus'},patchGate,library:LIB,promotion,insight:INSIGHT,aiOutput:AI_OUTPUT});
  check('invalid config halts',r.decision==='halt'&&r.reason==='invalid_config',JSON.stringify(r));
  const r2=run({config:{autonomyLevel:'full',halt:true,ownerApproved:true,ownerRef:OWNER,approvedAt:AT},patchGate,library:LIB,promotion,insight:INSIGHT,aiOutput:AI_OUTPUT});
  check('halt flag blocks',r2.decision==='halt'&&r2.reason==='halted_by_owner',JSON.stringify(r2));
}
{
  const r=run({config:{autonomyLevel:'canary'},patchGate,library:LIB,promotion,insight:{id:'x'},aiOutput:AI_OUTPUT});
  check('invalid insight holds',r.decision==='hold'&&r.errors.includes('insight_invalid'),JSON.stringify(r));
}
{
  const r=run({config:{autonomyLevel:'canary'},patchGate,library:LIB,promotion,insight:INSIGHT});
  check('missing ai output holds',r.decision==='hold'&&r.reason==='ai_output_required',JSON.stringify(r));
  const r2=run({config:{autonomyLevel:'canary'},patchGate,library:LIB,promotion,insight:INSIGHT,aiOutput:{text:''}});
  check('empty ai output holds',r2.decision==='hold'&&r2.reason==='ai_output_required',JSON.stringify(r2));
}
{
  const calls=[];
  const aiGenerate=({prompt})=>{calls.push(prompt);return{ok:true,output:{text:'ok',model:'fake',generatedAt:'2026-08-14T00:00:00Z',...AI_OUTPUT}}};
  const r=run({config:{autonomyLevel:'canary'},patchGate,library:LIB,promotion,insight:INSIGHT,aiGenerate});
  check('aiGenerate path works',r.ok===true,calls.length?JSON.stringify(r).slice(0,120):'no call');
  check('prompt rendered with slots filled',calls.length===1&&!calls[0].includes('{{')&&calls[0].includes(INSIGHT.itemId),calls[0]?.slice(0,100));
  check('gate passed and candidate no-op',r.gate.ok&&r.gate.errors.length===0,JSON.stringify(r.gate?.errors));
  check('promotion evaluated',r.promotion!==null&&typeof r.promotion.status==='string',JSON.stringify(r.promotion));
  check('canonical immutable',r.gate.canonicalImmutable===true,JSON.stringify(r.gate));
  check('adoption gated off',r.adoptionReady===false,JSON.stringify(r.adoptionReady));
  check('privacy flags false',r.privacy.rawAnswersIncluded===false&&r.privacy.rawHistoryIncluded===false,JSON.stringify(r.privacy));
}
{
  const r=run({config:{autonomyLevel:'full',ownerApproved:true,ownerRef:OWNER,approvedAt:AT,autoCanonicalAdoption:true},patchGate,library:LIB,promotion,insight:INSIGHT,aiOutput:AI_OUTPUT,evidence:EVIDENCE});
  check('full auto-adopt ready with evidence',r.adoptionReady===true,JSON.stringify({promotion:r.promotion,ready:r.adoptionReady}));
  const r2=run({config:{autonomyLevel:'full',ownerApproved:true,ownerRef:OWNER,approvedAt:AT,autoCanonicalAdoption:true},patchGate,library:LIB,promotion,insight:INSIGHT,aiOutput:AI_OUTPUT});
  check('full holds without evidence',r2.adoptionReady===false&&r2.promotion?.status==='hold',JSON.stringify({promotion:r2.promotion,ready:r2.adoptionReady}));
}
{
  const r=run({config:{autonomyLevel:'canary'},patchGate,library:LIB,promotion,insight:INSIGHT,aiOutput:AI_OUTPUT});
  check('deterministic output shape',typeof r.patchId==='string'&&r.patchId.startsWith('sr-'),r.patchId);
  check('candidate carries provenance',r.candidate.provenance.generator==='ai'&&r.candidate.provenance.model==='test-model',JSON.stringify(r.candidate?.provenance));
}
{
  const ai=sanitizeAi({text:'a'.repeat(99999),model:'m',generatedAt:'2026-08-14T00:00:00Z'});
  check('ai text bounded',ai.text.length<=6000,ai.text.length);
  check('ai text with secret rejected at render level',library.renderPrompt(LIB,'vocabulary','expand_context',{word:'w',cefr:'B1',example:'sk-1234567890ABCDEFGHIJKLMNOP'}).ok===false,'x');
}
console.log(`FIEZEL Self-Refine: ${pass} PASS / ${fail} FAIL`);
process.exitCode=fail?1:0;