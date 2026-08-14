(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.FIEZEL_META_LEARNING=api;
})(typeof self!=='undefined'?self:globalThis,function(){
  'use strict';
  const INSIGHT_SCHEMA='fiezel-meta-insight-v1';
  const INPUT_SCHEMA='fiezel-policy-outcome-v1';
  const MAX_INSIGHTS=20;
  const WEAK_ACCURACY=70;
  const MIN_ATTEMPTS=8;
  const MIN_TREND_DELTA=-3;
  const CEFR_BONUS={A1:10,A2:8,B1:6,B2:4,C1:2,C2:0};
  const text=v=>String(v??'').trim();
  const num=(v,min,max)=>Math.max(min,Math.min(max,Number(v)||0));
  const pct=(correct,attempts)=>attempts>0?Math.round((Number(correct)||0)/(Number(attempts)||1)*100):null;
  const clampString=(v,max)=>text(v).slice(0,max);
  const stable=v=>JSON.stringify(v);
  const itemIdOf=(s)=>clampString(s,160);
  function sanitizeOutcomes(raw){
    if(!raw||raw.schema!==INPUT_SCHEMA)return null;
    const bySubskill=Array.isArray(raw.bySubskill)?raw.bySubskill.slice(0,200):[];
    const out=[];
    for(const r of bySubskill){
      if(!r||typeof r!=='object'||Array.isArray(r))continue;
      const subskill=clampString(r.subskill,120),domain=clampString(r.domain,40),cefr=clampString(r.cefr,4);
      if(!subskill||!domain)continue;
      const attempts=Math.round(num(r.attempts,0,10000)),correct=Math.round(num(r.correct,0,10000));
      out.push({schema:INPUT_SCHEMA,subskill,domain,cefr:CEFR_BONUS[cefr]!==undefined?cefr:'',attempts,correct,accuracy:pct(correct,attempts),trendDelta:num(r.trendDelta,-100,100),daysSinceLast:Math.round(num(r.daysSinceLast,0,365))});
    }
    return out;
  }
  function sanitizeReviewQueue(raw){
    if(!Array.isArray(raw))return [];
    return raw.slice(0,200).map(r=>({itemId:itemIdOf(r?.itemId),domain:clampString(r?.domain,40),category:clampString(r?.category,80),severity:clampString(r?.severity,40)})).filter(r=>r.itemId&&r.domain);
  }
  function deriveInsights(rawOutcomes,rawReviewQueue){
    const outcomes=sanitizeOutcomes(rawOutcomes)||[],reviewQueue=sanitizeReviewQueue(rawReviewQueue);
    const insights=[];
    for(const o of outcomes){
      if(!o.cefr)continue;
      const accuracy=o.accuracy;
      if(accuracy===null)continue;
      const gap=100-accuracy;
      if(accuracy<=WEAK_ACCURACY&&o.attempts>=MIN_ATTEMPTS&&o.trendDelta<=MIN_TREND_DELTA){
        const priority=gap+Math.max(0,-o.trendDelta)*2+Math.min(o.attempts,50)/5+(CEFR_BONUS[o.cefr]??0);
        insights.push({insightId:`weak-${o.domain}-${o.subskill}`,type:'weak_skill',domain:o.domain,subskill:o.subskill,cefr:o.cefr,evidence:{accuracy,attempts:o.attempts,trendDelta:o.trendDelta,daysSinceLast:o.daysSinceLast},priority:Math.round(priority*10)/10,recommendation:'candidate_request'});
      }
    }
    for(const r of reviewQueue){
      if(r.severity!=='review'||!['context_thin','repetition','weak_distractor','difficulty_mismatch'].includes(r.category))continue;
      insights.push({insightId:`review-${r.domain}-${r.itemId}`,type:'stale_review_item',domain:r.domain,itemId:r.itemId,cefr:'',evidence:{category:r.category},priority:5,recommendation:'candidate_request'});
    }
    insights.sort((a,b)=>b.priority-a.priority);
    return insights.slice(0,MAX_INSIGHTS);
  }
  function analyze(rawOutcomes,rawReviewQueue){
    if(!rawOutcomes||rawOutcomes.schema!==INPUT_SCHEMA)return{schema:INSIGHT_SCHEMA,status:'FAIL',reason:'invalid_outcome_schema',insights:[]};
    if(rawOutcomes?.privacy?.rawAnswersIncluded===true||rawOutcomes?.privacy?.rawHistoryIncluded===true)return{schema:INSIGHT_SCHEMA,status:'FAIL',reason:'privacy_violation',insights:[]};
    const insights=deriveInsights(rawOutcomes,rawReviewQueue);
    return{schema:INSIGHT_SCHEMA,status:'PASS',count:insights.length,insights};
  }
  return{INSIGHT_SCHEMA,INPUT_SCHEMA,MAX_INSIGHTS,WEAK_ACCURACY,MIN_ATTEMPTS,MIN_TREND_DELTA,sanitizeOutcomes,sanitizeReviewQueue,deriveInsights,analyze,stable};
});