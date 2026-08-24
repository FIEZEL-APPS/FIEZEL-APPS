(function(root,factory){
  const deps={
    meta:(typeof module==='object'&&module.exports)?require('./fiezel-meta-learning.js'):root?.FIEZEL_META_LEARNING,
    ledger:(typeof module==='object'&&module.exports)?require('./fiezel-evolution-ledger.js'):null,
    config:(typeof module==='object'&&module.exports)?require('./fiezel-autonomy-config.js'):root?.FIEZEL_AUTONOMY_CONFIG,
    library:(typeof module==='object'&&module.exports)?require('./fiezel-prompt-library.js'):root?.FIEZEL_PROMPT_LIBRARY,
    refine:(typeof module==='object'&&module.exports)?require('./fiezel-self-refine.js'):root?.FIEZEL_SELF_REFINE,
    patchGate:(typeof module==='object'&&module.exports)?require('./content-patch-gate.js'):null,
    promotion:(typeof module==='object'&&module.exports)?require('./content-promotion.js'):root?.FIEZEL_CONTENT_PROMOTION
  };
  const api=factory(deps);
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.FIEZEL_EVOLUTION_LOOP=api;
})(typeof self!=='undefined'?self:globalThis,function(d){
  'use strict';
  const LOOP_SCHEMA='fiezel-evolution-loop-v1';
  const text=v=>String(v??'').trim();
  /**
   * Menyeragamkan bentuk insight dari dua sumber yang berbeda bahasa.
   *
   * Meta-learning menghasilkan insight `weak_skill` yang menyebut SUBSKILL (mis.
   * present_perfect), sedangkan self-refine bekerja pada SATU ITEM konkret. Jembatannya
   * adalah `opts.skillTargets`, peta subskill -> item.
   *
   * Yang TIDAK boleh terjadi: insight tanpa peta itu hilang diam-diam. Justru
   * `weak_skill` adalah temuan utama meta-learning, dan membuangnya tanpa suara membuat
   * insightCount menyusut tanpa satu pun galat - kegagalan yang tidak akan pernah
   * dilaporkan siapa pun. Karena itu insight yang belum punya sasaran item tetap
   * dikembalikan, ditandai `incomplete`, dan dicatat runLoop sebagai `hold` beralasan.
   */
  function normalizeInsight(raw,opts){
    const x=raw&&typeof raw==='object'?raw:{},target=opts?.skillTargets?.[x.subskill]||opts?.skillTargets?.[x.id]||{};
    const id=text(x.id||x.insightId),itemId=text(x.itemId||target.itemId),domain=text(x.domain||target.domain),category=text(x.category||x.evidence?.category||target.category||'difficulty_mismatch');
    if(!id||!domain)return null;
    const templateId=text(x.templateId||target.templateId||(category==='repetition'?'rewrite_repetition':'fix_weak_skill'));
    const finding=text(x.finding||target.finding||(x.type==='weak_skill'?`Weak skill ${x.subskill}: accuracy ${x.evidence?.accuracy}% after ${x.evidence?.attempts} attempts.`:`QA review: ${category}`));
    const out={...x,id,insightId:id,itemId,domain,category,templateId,finding};
    if(!itemId)out.incomplete='missing_item_target';
    return out;
  }
  function discoverInsights(memory,opts){
    const raw=opts?.leaderboard||opts?.metaInput||null;
    if(raw&&d.meta){
      const analyze=d.meta.analyze||d.meta.run;
      const m=typeof analyze==='function'?analyze(raw,opts?.reviewQueue||[]):null;
      if(m&&(m.ok===true||m.status==='PASS'))return (m.insights||[]).map(x=>normalizeInsight(x,opts)).filter(Boolean);
    }
    return (memory||[]).map(x=>normalizeInsight(x,opts)).filter(Boolean);
  }
  function runLoop(opts){
    const errors=[];
    if(!opts||!d.meta||!d.refine||!d.ledger)return{ok:false,schema:LOOP_SCHEMA,reason:'loop_dependencies_unavailable',errors:['loop_dependencies_unavailable']};
    const cfgRaw=opts.config||{autonomyLevel:'advisory'};
    const cfg=d.config?.sanitizeConfig?.(cfgRaw);
    if(!cfg||cfg.halt)return{ok:false,schema:LOOP_SCHEMA,stage:'config',reason:cfg?.halt?'halted_by_owner':'invalid_config',decision:'halt',errors:[cfg?.halt?'halted_by_owner':'invalid_config']};
    const insights=discoverInsights(opts.insights,opts);
    const results=[];
    let ledger=Array.isArray(opts.ledgerState)?opts.ledgerState:[];
    if(!ledger.length)ledger=[d.ledger.genesis()];
    for(const insight of (insights||[]).slice(0,8)){
      // Insight tanpa sasaran item tidak bisa digerbangi, tetapi ia tetap dihitung dan
      // dilaporkan - "tidak tahu item mana" adalah temuan, bukan alasan untuk diam.
      if(insight.incomplete){
        results.push({insightId:text(insight.id,80),patchId:'',stage:'insight',decision:'hold',promotionStatus:'hold',adoptionReady:false,gateOk:false,errors:[insight.incomplete]});
        continue;
      }
      const r=d.refine.run({config:cfgRaw,patchGate:opts.patchGate||d.patchGate,library:opts.library||d.library,promotion:opts.promotion||d.promotion,insight,aiOutput:opts.aiOutputs?.[insight.id],aiGenerate:opts.aiGenerate,evidence:opts.evidence?.[insight.id],promptVars:opts.promptVars?.[insight.id]});
      const appended=d.ledger.append(ledger,{event:'gate_result',patchId:r.patchId||'',insightId:text(insight.id,80),target:text(insight.itemId,160),decision:r.decision||'hold',metrics:{gatePassed:r.gate?.ok===true?1:0,promotionStatus:r.promotionStatus||'hold'},timestamp:opts.timestamp||undefined},{maxEntries:opts.maxLedgerEntries||5000});
      ledger=appended.ok?appended.entries:ledger;
      results.push({insightId:text(insight.id,80),patchId:r.patchId||'',stage:r.stage||'',decision:r.decision||'hold',promotionStatus:r.promotionStatus||'hold',adoptionReady:r.adoptionReady===true,gateOk:r.gate?.ok===true,errors:r.errors||[]});
    }
    const chainOk=d.ledger.verifyChain(ledger).ok;
    return{ok:true,schema:LOOP_SCHEMA,autonomyLevel:cfg.autonomyLevel,insightCount:results.length,adoptionReadyCount:results.filter(x=>x.adoptionReady).length,chainIntegrity:chainOk,results,ledgerTail:ledger.slice(-3).map(e=>({seq:e.seq,event:e.event,patchId:e.patchId,decision:e.decision,entryHash:e.entryHash}))};
  }
  return{LOOP_SCHEMA,normalizeInsight,discoverInsights,runLoop};
});
