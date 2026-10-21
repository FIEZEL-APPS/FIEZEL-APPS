(function(root,factory){
  const deps={
    config:(typeof module==='object'&&module.exports)?require('./fiezel-autonomy-config.js'):root?.FIEZEL_AUTONOMY_CONFIG,
    library:(typeof module==='object'&&module.exports)?require('./fiezel-prompt-library.js'):root?.FIEZEL_PROMPT_LIBRARY,
    patchGate:(typeof module==='object'&&module.exports)?require('./content-patch-gate.js'):null,
    promotion:(typeof module==='object'&&module.exports)?require('./content-promotion.js'):root?.FIEZEL_CONTENT_PROMOTION,
    meta:(typeof module==='object'&&module.exports)?require('./fiezel-meta-learning.js'):root?.FIEZEL_META_LEARNING
  };
  const api=factory(deps);
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.FIEZEL_SELF_REFINE=api;
})(typeof self!=='undefined'?self:globalThis,function(d){
  'use strict';
  const SELF_REFINE_SCHEMA='fiezel-self-refine-v1';
  const text=v=>String(v??'').trim();
  const bound=(v,max)=>text(v).slice(0,max);
  const clone=v=>JSON.parse(JSON.stringify(v));
  const id=(s)=>s.replace(/[^A-Za-z0-9._:-]/g,'_').slice(0,80);
  const ISO_RE=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;
  function domainOf(insight){
    const dom=text(insight?.domain||'');
    return d.library?.DOMAINS?.has?.(dom)?dom:null;
  }
  function sanitizeAi(raw){
    if(!raw||typeof raw!=='object'||!text(raw.text))return null;
    const out={text:bound(raw.text,6000),model:bound(raw.model,120)||'synthetic',generatedAt:bound(raw.generatedAt,40)||''};
    const keep=['meaning','example','stem','options','correctIndex','distractors','explanation','rationale','pedagogicalObjective','misconceptionTargeted','reasoningOperation','meanings','examples','synonyms','antonyms','collocations','topic','status','needsReviewReason'];
    for(const k of keep){if(raw[k]!==undefined&&raw[k]!==null)out[k]=raw[k]}
    return out;
  }
  function buildCandidate(insight,rendered,ai,canonical,patchGate){
    const domain=domainOf(insight);
    const itemSha=patchGate?.itemSha||(x=>d.patchGate.itemSha(x));
    const patchId=`sr-${id(insight.id)}-${itemSha(String(insight.itemId)).slice(0,8)}`;
    if(domain==='grammar'){
      const item=canonical?.grammar?.templates?.find?.(x=>x.id===insight.itemId);
      if(!item)return{ok:false,reason:'insight_item_missing'};
      const pre=bound(item.pedagogicalObjective||item.misconceptionTargeted||'',1000);
      const replacement={pedagogicalObjective:bound(ai.pedagogicalObjective||pre,1000),misconceptionTargeted:bound(ai.misconceptionTargeted||item.misconceptionTargeted||'',1000),reasoningOperation:bound(ai.reasoningOperation||item.reasoningOperation||'',800),stem:bound(ai.stem,1200),options:(ai.options||[]).slice(0,4).map(v=>bound(v,500)),correctIndex:Number(ai.correctIndex),distractors:(ai.distractors||[]).slice(0,3).map(x=>({option:bound(x?.option,500),misconception:bound(x?.misconception,500),whyFails:bound(x?.whyFails,1200)})),explanation:{whyCorrect:bound(ai.explanation?.whyCorrect,1600),rule:bound(ai.explanation?.rule,1600),whyOthersFail:bound(ai.explanation?.whyOthersFail,2000),howToAvoid:bound(ai.explanation?.howToAvoid,1200),memoryCue:bound(ai.explanation?.memoryCue,800)}};
      if(!replacement.stem||replacement.options.length!==4||!Number.isInteger(replacement.correctIndex)||replacement.distractors.length!==3)return{ok:false,reason:'grammar_replacement_incomplete'};
      return{ok:true,candidate:{schema:'fiezel-content-patch-v1',patchId,domain,target:{itemId:insight.itemId,sourceVersion:canonical.version,sourceSha256:itemSha(item)},finding:{schema:'fiezel-content-qa-v1',category:bound(insight.category,80)||'review',severity:'review',message:bound(insight.finding||'auto review',800)},replacement,rationale:bound(ai.rationale||`auto-refine from insight ${insight.id}`,1600),provenance:{generator:'ai',model:ai.model,generatedAt:ai.generatedAt}}};
    }
    if(domain==='vocabulary'){
      const item=canonical?.vocabulary?.find?.(x=>x.id===insight.itemId);
      if(!item)return{ok:false,reason:'insight_item_missing'};
      const replacement={meaning:bound(ai.meaning||item.meaning,500),example:bound(ai.example||item.example,800),meanings:(ai.meanings||item.meanings||[]).slice(0,8).map(x=>({id:bound(x?.id,80),meaning:bound(x?.meaning,500)})),examples:(ai.examples||item.examples||[]).slice(0,8).map(x=>({en:bound(x?.en,800),id:bound(x?.id,800)})),synonyms:(ai.synonyms||item.synonyms||[]).slice(0,20).map(v=>bound(v,120)),antonyms:(ai.antonyms||item.antonyms||[]).slice(0,20).map(v=>bound(v,120)),collocations:(ai.collocations||item.collocations||[]).slice(0,30).map(v=>bound(v,160)),topic:bound(ai.topic||item.topic||'',120),status:bound(ai.status||item.status,40),needsReviewReason:(ai.needsReviewReason||item.needsReviewReason||[]).slice(0,20).map(v=>bound(v,240))};
      if(!replacement.example||replacement.example.split(/\s+/).filter(Boolean).length<4)return{ok:false,reason:'vocabulary_example_too_thin'};
      return{ok:true,candidate:{schema:'fiezel-content-patch-v1',patchId,domain,target:{itemId:insight.itemId,sourceVersion:canonical.version,sourceSha256:itemSha(item)},finding:{schema:'fiezel-content-qa-v1',category:bound(insight.category,80)||'review',severity:'review',message:bound(insight.finding||'auto review',800)},replacement,rationale:bound(ai.rationale||`auto-refine from insight ${insight.id}`,1600),provenance:{generator:'ai',model:ai.model,generatedAt:ai.generatedAt}}};
    }
    return{ok:false,reason:'unsupported_domain'};
  }
  function buildCanaryConfig(candidate,cfg,insight,patchGate){
    const now=Date.now(),exp=new Date(now+30*86400000).toISOString();
    const candidateSha256=patchGate?.itemSha?.(JSON.stringify(candidate))||'0'.repeat(64);
    return{schema:'fiezel-content-canary-v1',enabled:true,mode:'canary',canaryId:candidate.patchId,exposurePercent:10,maxExposureSessions:20,expiresAt:exp,targetLearnerKey:'',candidate:{schema:'fiezel-content-patch-v1',patchId:candidate.patchId,domain:candidate.domain,target:candidate.target,replacement:candidate.replacement},gateProof:{status:'PASS',gateVersion:patchGate?.PATCH_GATE_VERSION||'guarded-patch-v1',patchId:candidate.patchId,candidateSha256,canonicalImmutable:true},insightId:bound(insight?.id,120)};
  }
  function run(opts){
    const errors=[];
    if(!opts||typeof opts!=='object')return{ok:false,schema:SELF_REFINE_SCHEMA,stage:'input',reason:'opts_required',decision:'halt',errors:['opts_required']};
    if(!opts.patchGate||!opts.patchGate.validateCandidate||!opts.patchGate.itemSha)return{ok:false,schema:SELF_REFINE_SCHEMA,stage:'input',reason:'patch_gate_unavailable',decision:'halt',errors:['patch_gate_unavailable']};
    if(!opts.promotion||!opts.promotion.evaluate)return{ok:false,schema:SELF_REFINE_SCHEMA,stage:'input',reason:'promotion_unavailable',decision:'halt',errors:['promotion_unavailable']};
    const cfg=d.config?.sanitizeConfig?.(opts.config);
    if(!cfg)return{ok:false,schema:SELF_REFINE_SCHEMA,stage:'config',reason:'invalid_config',decision:'halt',errors:['invalid_config']};
    if(cfg.halt)return{ok:false,schema:SELF_REFINE_SCHEMA,stage:'config',reason:'halted_by_owner',decision:'halt',errors:['halted_by_owner']};
    if(cfg.autonomyLevel==='advisory')return{ok:false,schema:SELF_REFINE_SCHEMA,stage:'config',reason:'advisory_mode_no_refine',decision:'hold',errors:[]};
    const insight=opts.insight||{};
    if(!/^[A-Za-z0-9._:-]{2,80}$/.test(text(insight.id))||!/^[A-Za-z0-9._:#-]{2,160}$/.test(text(insight.itemId)))return{ok:false,schema:SELF_REFINE_SCHEMA,stage:'insight',reason:'insight_invalid',decision:'hold',errors:['insight_invalid']};
    if(!d.library)return{ok:false,schema:SELF_REFINE_SCHEMA,stage:'library',reason:'library_unavailable',decision:'hold',errors:['library_unavailable']};
    const lv=d.library.validateLibrary?.(opts.library);
    if(!lv?.ok)return{ok:false,schema:SELF_REFINE_SCHEMA,stage:'library',reason:'library_invalid',decision:'hold',errors:lv?.errors||['library_invalid']};
    let canonical=null;
    try{canonical=opts.patchGate.loadCanonical?.()||opts.canonical}catch{canonical=opts.canonical||null}
    if(!canonical)return{ok:false,schema:SELF_REFINE_SCHEMA,stage:'canonical',reason:'canonical_unavailable',decision:'hold',errors:['canonical_unavailable']};
    const found=locateCanonical(canonical,domainOf(insight),text(insight.itemId));
    const autoVars={};
    if(found?.item){
      const it=found.item;
      if(domainOf(insight)==='grammar'){autoVars.subskill=it.subskill;autoVars.cefr=it.cefr;autoVars.itemJson=JSON.stringify(it);autoVars.finding=text(insight.finding)}
      if(domainOf(insight)==='vocabulary'){autoVars.word=it.id;autoVars.cefr=it.cefr;autoVars.meaning=it.meaning;autoVars.example=it.example;autoVars.finding=text(insight.finding)}
      if(domainOf(insight)==='reading'){autoVars.passageId=found.passage?.id;autoVars.cefr=found.passage?.cefr;autoVars.itemJson=JSON.stringify(it);autoVars.passageText=found.passage?.text||'';autoVars.finding=text(insight.finding)}
    }
    const vars={...autoVars,...(opts.promptVars&&typeof opts.promptVars==='object'?opts.promptVars:{})};
    const rendered=d.library.renderPrompt(opts.library,domainOf(insight),text(insight.templateId)||'fix_weak_skill',vars);
    if(!rendered.ok)return{ok:false,schema:SELF_REFINE_SCHEMA,stage:'prompt',reason:rendered.reason,decision:'hold',errors:[rendered.reason]};
    let ai=null;
    if(typeof opts.aiGenerate==='function'){
      const out=opts.aiGenerate({prompt:rendered.prompt,maxTokens:opts.maxTokens??2000,temperature:opts.temperature??0.2});
      if(!out?.ok){return{ok:false,schema:SELF_REFINE_SCHEMA,stage:'ai',reason:'ai_generation_failed',decision:'hold',errors:[String(out?.reason||'ai_generation_failed')]}}
      ai=sanitizeAi(out.output);
    }else{
      ai=sanitizeAi(opts.aiOutput);
      if(!ai)return{ok:false,schema:SELF_REFINE_SCHEMA,stage:'ai',reason:'ai_output_required',decision:'hold',errors:['ai_output_required']};
    }
    const built=buildCandidate(insight,rendered,ai,canonical,opts.patchGate);
    if(!built.ok)return{ok:false,schema:SELF_REFINE_SCHEMA,stage:'candidate',reason:built.reason,decision:'hold',errors:[built.reason]};
    const gate=opts.patchGate.validateCandidate(built.candidate,canonical);
    const decision=gate.ok?'pending':'hold';
    const promotionEval=(gate.ok&&cfg.autonomyLevel!=='advisory')?opts.promotion.evaluate(buildCanaryConfig(built.candidate,cfg,insight,opts.patchGate),opts.evidence||{}):null;
    const promotionStatus=promotionEval?.status||'hold';
    const adoptionReady=cfg.autoCanonicalAdoption===true&&promotionStatus==='promote';
    const metrics={domain:built.candidate.domain,gateBlockers:(gate.errors||[]).length,gatePassed:gate.ok,promotionStatus};
    return{ok:true,schema:SELF_REFINE_SCHEMA,stage:'complete',decision,promotionStatus,adoptionReady,patchId:built.candidate.patchId,insightId:bound(text(insight.id),80),itemId:bound(text(insight.itemId),160),domain:built.candidate.domain,gate:{ok:gate.ok,errors:gate.errors||[],baselineQa:gate.baselineQa,patchedQa:gate.patchedQa,canonicalImmutable:gate.canonicalImmutable},promotion:promotionEval?{status:promotionEval.status,reason:promotionEval.reason,metrics:promotionEval.metrics}:null,candidate:built.candidate,metrics,privacy:{rawAnswersIncluded:false,rawHistoryIncluded:false}};
  }
  function locateCanonical(canonical,domain,itemId){
    if(!canonical)return null;
    if(domain==='grammar'){const i=(canonical.grammar?.templates||[]).find(x=>x.id===itemId);return i?{item:i}:null}
    if(domain==='vocabulary'){const i=(canonical.vocabulary||[]).find(x=>x.id===itemId);return i?{item:i}:null}
    if(domain==='reading'){const p=(canonical.reading||[]).find(x=>x.qs?.some?.(q=>q[3]?.answer===itemId||q[3]?.patternId===itemId));return p?{passage:p,item:p.qs[0]}:null}
    return null;
  }
  return{SELF_REFINE_SCHEMA,domainOf,buildCandidate,buildCanaryConfig,sanitizeAi,run,locateCanonical};
});