const crypto=require('crypto');
const {analyze,INSIGHT_SCHEMA}=require('./fiezel-meta-learning.js');
const sha=v=>crypto.createHash('sha256').update(String(v)).digest('hex');
const text=v=>String(v??'').trim();
let pass=0,fail=0;
function check(name,ok,details){if(ok){pass++}else{fail++;console.error(`FAIL ${name}: ${details}`)}}
function outcome(subskill,domain,cefr,attempts,correct,trend,days){return{subskill,domain,cefr,attempts,correct,trendDelta:trend,daysSinceLast:days}}
const base={schema:'fiezel-policy-outcome-v1',privacy:{rawAnswersIncluded:false,rawHistoryIncluded:false}};
{
  const r=analyze({...base,bySubskill:[outcome('past_simple_vs_present_perfect','grammar','B1',20,10,-8,1),outcome('phrasal_verbs','vocabulary','B2',12,12,0,5),outcome('scanning','reading','A2',8,5,-4,2)]},[]);
  check('status PASS',r.status==='PASS',JSON.stringify(r));
  check('weak skill detected',r.insights.some(i=>i.type==='weak_skill'&&i.subskill==='past_simple_vs_present_perfect'&&i.recommendation==='candidate_request'),JSON.stringify(r.insights));
  check('healthy skill not flagged',!r.insights.some(i=>i.subskill==='phrasal_verbs'),JSON.stringify(r.insights));
  check('priority sorted desc',r.insights.every((v,i,a)=>i===0||a[i-1].priority>=v.priority),JSON.stringify(r.insights.map(i=>i.priority)));
}
{
  const weak={...base,bySubskill:[outcome('weak_a1','grammar','A1',30,10,-10,1)]};
  const strong={...base,bySubskill:[outcome('weak_a1','grammar','A1',30,28,5,1)]};
  const a=analyze(weak,[]),b=analyze(strong,[]);
  check('trend matters',a.insights.length===1&&b.insights.length===0,`a=${a.insights.length} b=${b.insights.length}`);
  const lowAttempts={...base,bySubskill:[outcome('few','grammar','A1',5,2,-6,1)]};
  check('attempt floor enforced',analyze(lowAttempts,[]).insights.length===0,JSON.stringify(analyze(lowAttempts,[])));
}
{
  const queue=[{itemId:'vocab_00006',domain:'vocabulary',category:'context_thin',severity:'review'},{itemId:'r0001#1',domain:'reading',category:'weak_distractor',severity:'review'},{itemId:'r0001#2',domain:'reading',category:'blocker',severity:'blocker'}];
  const r=analyze({...base,bySubskill:[]},queue);
  check('review items become insights',r.insights.filter(i=>i.type==='stale_review_item').length===2,JSON.stringify(r.insights));
  check('blocker excluded from review insights',!r.insights.some(i=>i.type==='stale_review_item'&&i.itemId==='r0001#2'),JSON.stringify(r.insights));
}
{
  const many=[];for(let i=0;i<120;i++)many.push(outcome(`sub_${i}`,'grammar','A1',20,8,-10,1));
  const r=analyze({...base,bySubskill:many},[]);
  check('insights bounded at 20',r.insights.length<=20,`count=${r.insights.length}`);
}
{
  const r=analyze({...base,privacy:{rawAnswersIncluded:true},bySubskill:[]},[]);
  check('privacy violation fail-closed',r.status==='FAIL'&&r.insights.length===0,JSON.stringify(r));
  const bad=analyze({schema:'wrong',bySubskill:[]},[]);
  check('wrong schema rejected',bad.status==='FAIL',JSON.stringify(bad));
  const weird=analyze({...base,bySubskill:[{subskill:'x',domain:'y',attempts:'abc',correct:'def'}]},[]);
  check('garbage input clamped',weird.status==='PASS'&&weird.insights.length===0,JSON.stringify(weird));
}
{
  const a=analyze({...base,bySubskill:[outcome('det','grammar','B1',20,10,-8,1)]},[]);
  const b=analyze({...base,bySubskill:[outcome('det','grammar','B1',20,10,-8,1)]},[]);
  check('deterministic',JSON.stringify(a)===JSON.stringify(b),'non-deterministic');
}
{
  const empty=analyze({...base,bySubskill:[]},[]);
  check('empty input ok',empty.status==='PASS'&&empty.count===0,JSON.stringify(empty));
}
console.log(`FIEZEL Meta-Learning: ${pass} PASS / ${fail} FAIL`);
process.exitCode=fail?1:0;