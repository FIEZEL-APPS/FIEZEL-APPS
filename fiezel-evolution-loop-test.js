const path=require('path');
const loop=require('./fiezel-evolution-loop.js');
const config=require('./fiezel-autonomy-config.js');
const library=require('./fiezel-prompt-library.js');
const patchGate=require('./content-patch-gate.js');
const promotion=require('./content-promotion.js');
const meta=require('./fiezel-meta-learning.js');
const ledger=require('./fiezel-evolution-ledger.js');
const LIB=library.loadLibrary(path.join(__dirname,'fiezel-prompt-library.json'));
const OWNER='123e4567-e89b-12d3-a456-426614174000';
const AT='2026-08-14T00:00:00Z';
const T='2026-08-14T00:00:00Z';
const canonical=patchGate.loadCanonical();
const V0=canonical.vocabulary[0];
let pass=0,fail=0;
function check(name,ok,details){if(ok){pass++}else{fail++;console.error(`FAIL ${name}: ${details}`)}}
const LEADERBOARD={schema:'fiezel-meta-leaderboard-v1',version:'5.18.0',generatedAt:T,payload:{vocabulary:[{id:V0.id,domain:'vocabulary',attempts:12,accuracy:58,winRate:62,exposureSessions:4,correct:7}],grammar:[],reading:[]}};
const AI_OUTPUT=(()=>{const base=V0.example.replace(/[.!?]+$/,'');const example=`${base}, which gives the sentence clearer context.`;return{text:'ok',model:'fake',generatedAt:T,meaning:V0.meaning,example,meanings:V0.meanings,examples:V0.examples.map((x,i)=>i===0?{en:example,id:x.id}:x),synonyms:V0.synonyms,antonyms:V0.antonyms,collocations:V0.collocations,topic:V0.topic,status:V0.status,needsReviewReason:V0.needsReviewReason,rationale:'expand context'}})();
const m=meta.analyze(LEADERBOARD);
const insights=m.ok?m.insights:[];
{
  const r=loop.runLoop({config:{autonomyLevel:'advisory'},insights,library:LIB,patchGate,promotion});
  check('advisory loop still records observations',r.ok&&r.insightCount===0,JSON.stringify(r));
}
{
  const insight=insights.find(i=>i.domain==='vocabulary')||{id:'ins-001',domain:'vocabulary',itemId:V0.id,category:'weak_accuracy',finding:'accuracy below threshold',templateId:'expand_context'};
  const r=loop.runLoop({config:{autonomyLevel:'canary'},insights:[insight],library:LIB,patchGate,promotion,aiOutputs:{[insight.id]:AI_OUTPUT},timestamp:T});
  check('loop runs end to end',r.ok&&r.insightCount===1,JSON.stringify(r).slice(0,200));
  check('chain integrity holds',r.chainIntegrity===true,JSON.stringify(r.ledgerTail));
  check('ledger tail has gate_result event',r.ledgerTail[r.ledgerTail.length-1]?.event==='gate_result',JSON.stringify(r.ledgerTail));
  check('no adoption in canary mode',r.adoptionReadyCount===0,JSON.stringify(r.adoptionReadyCount));
}
{
  const r=loop.runLoop({config:{autonomyLevel:'full',ownerApproved:true,ownerRef:OWNER,approvedAt:AT,autoCanonicalAdoption:true},insights:[{id:'ins-001',domain:'vocabulary',itemId:V0.id,category:'weak_accuracy',finding:'weak',templateId:'expand_context'}],library:LIB,patchGate,promotion,aiOutputs:{'ins-001':AI_OUTPUT},timestamp:T});
  check('full mode routes through promote path',r.ok&&typeof r.adoptionReadyCount==='number',JSON.stringify(r).slice(0,150));
}
{
  const r=loop.runLoop({config:{autonomyLevel:'bogus'},insights,library:LIB,patchGate,promotion});
  check('invalid config halts loop',!r.ok&&r.reason==='invalid_config',JSON.stringify(r));
  const r2=loop.runLoop({config:{autonomyLevel:'full',halt:true,ownerApproved:true,ownerRef:OWNER,approvedAt:AT},insights,library:LIB,patchGate,promotion});
  check('halt blocks loop',!r2.ok&&r2.reason==='halted_by_owner',JSON.stringify(r2));
}
{
  const r=loop.runLoop({config:{autonomyLevel:'canary'},insights:Array.from({length:10},(_,i)=>({id:`ins-${String(i).padStart(3,'0')}`,domain:'vocabulary',itemId:V0.id,category:'weak_accuracy',finding:'weak',templateId:'expand_context'})),library:LIB,patchGate,promotion,aiOutputs:Object.fromEntries(Array.from({length:10},(_,i)=>[`ins-${String(i).padStart(3,'0')}`,AI_OUTPUT])),timestamp:T});
  check('bounded to 8 insights',r.ok&&r.insightCount===8,JSON.stringify(r.insightCount));
  check('chain verifies after many appends',r.chainIntegrity,JSON.stringify(r.chainIntegrity));
}
console.log(`FIEZEL Evolution Loop: ${pass} PASS / ${fail} FAIL`);
process.exitCode=fail?1:0;