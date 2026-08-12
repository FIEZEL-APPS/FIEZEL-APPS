/*
 * FIEZEL Creator Hub Worker
 * Centralized, authenticated learning-report collector for Puter Workers.
 * No API key or shared secret is accepted from the browser.
 */

const REPORT_PREFIX='fiezel:report:';
const CONFIG_LEARNER='fiezel:config:learner';
const MAX_BODY_BYTES=24576;
const CREATOR_IDENTIFIERS=['__FIEZEL_CREATOR_ID__'];

function jsonError(message,status){
  return new Response(JSON.stringify({ok:false,error:message}),{
    status,
    headers:{'Content-Type':'application/json'}
  });
}

function short(value,max=120){
  return String(value==null?'':value).replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,max);
}

function boundedNumber(value,min,max,fallback=null){
  const n=Number(value);
  return Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback;
}

function safeDomain(value){
  const x=value&&typeof value==='object'?value:{};
  return {
    attempts:boundedNumber(x.attempts,0,100000,0),
    accuracy:boundedNumber(x.accuracy,0,100,null),
    recentAccuracy:boundedNumber(x.recentAccuracy,0,100,null),
    measured:boundedNumber(x.measured,0,100000,0),
    mastered:boundedNumber(x.mastered,0,100000,0),
    average:boundedNumber(x.average,0,100,0)
  };
}

function sanitizeReport(raw,caller){
  if(!raw||raw.schema!=='fiezel-creator-report-v1'||raw.consent!==true)return null;
  const s=raw.summary&&typeof raw.summary==='object'?raw.summary:{};
  const latest=raw.latestSession&&typeof raw.latestSession==='object'?raw.latestSession:null;
  return {
    id:short(raw.id,96),
    schema:'fiezel-creator-report-v1',
    receivedAt:new Date().toISOString(),
    createdAt:short(raw.createdAt,40),
    appVersion:short(raw.appVersion,24),
    reason:short(raw.reason,40),
    consent:true,
    learnerLabel:short(raw.learnerLabel||'Jahran',40),
    caller:{id:short(caller.id,120),username:short(caller.username,80)},
    summary:{
      estimatedLevel:/^(A1|A2|B1|B2|C1|C2)$/.test(String(s.estimatedLevel))?String(s.estimatedLevel):'A1',
      placementCompleted:!!s.placementCompleted,
      adaptiveReady:!!s.adaptiveReady,
      totalAttempts:boundedNumber(s.totalAttempts,0,100000,0),
      totalAccuracy:boundedNumber(s.totalAccuracy,0,100,null),
      streakDays:boundedNumber(s.streakDays,0,10000,0),
      dueReviews:boundedNumber(s.dueReviews,0,100000,0),
      todayAttempts:boundedNumber(s.todayAttempts,0,100000,0),
      domains:{
        vocabulary:safeDomain(s.domains&&s.domains.vocabulary),
        grammar:safeDomain(s.domains&&s.domains.grammar),
        reading:safeDomain(s.domains&&s.domains.reading)
      },
      weakSkills:Array.isArray(s.weakSkills)?s.weakSkills.slice(0,5).map(function(x){
        return {
          skill:short(x&&x.skill,80),
          attempts:boundedNumber(x&&x.attempts,0,100000,0),
          errors:boundedNumber(x&&x.errors,0,100000,0),
          priority:boundedNumber(x&&x.priority,0,100,0)
        };
      }):[],
      confidence:Array.isArray(s.confidence)?s.confidence.slice(0,3).map(function(x){
        return {
          level:boundedNumber(x&&x.level,1,3,1),
          evidence:boundedNumber(x&&x.evidence,0,100000,0),
          accuracy:boundedNumber(x&&x.accuracy,0,100,null),
          gap:boundedNumber(x&&x.gap,0,100,null)
        };
      }):[]
    },
    latestSession:latest?{
      at:short(latest.at,40),
      type:short(latest.type,40),
      score:boundedNumber(latest.score,0,10000,0),
      total:boundedNumber(latest.total,0,10000,0),
      accuracy:boundedNumber(latest.accuracy,0,100,0)
    }:null
  };
}

async function actorIdentity(actor){
  if(!actor||!actor.puter)return null;
  let info=actor;
  try{
    if(actor.puter.auth&&actor.puter.auth.getUser)info=Object.assign({},actor,await actor.puter.auth.getUser());
  }catch{}
  const identifiers=[info.uuid,info.id,info.username,actor.uuid,actor.id,actor.username].filter(Boolean).map(String);
  const unique=[...new Set(identifiers)];
  const id=unique[0];
  if(!id)return null;
  return {id:String(id),username:String(info.username||actor.username||''),identifiers:unique};
}

async function isOwner(user){
  const caller=await actorIdentity(user);
  if(!caller)return false;
  const configured=CREATOR_IDENTIFIERS.filter(function(x){return x&&x!=='__FIEZEL_CREATOR_ID__'}).map(String);
  if(configured.length)return caller.identifiers.some(function(x){return configured.includes(x)});
  const owner=await actorIdentity(me);
  return !!(owner&&caller.identifiers.some(function(x){return owner.identifiers.includes(x)}));
}

router.get('/api/health',async function(){
  return {ok:true,service:'fiezel-creator-hub',version:'1.0.0'};
});

router.post('/api/report',async function(ctx){
  const caller=await actorIdentity(ctx.user);
  if(!caller)return jsonError('Puter authentication required.',401);
  const text=await ctx.request.text();
  if(new TextEncoder().encode(text).length>MAX_BODY_BYTES)return jsonError('Report payload too large.',413);
  let raw;
  try{raw=JSON.parse(text)}catch{return jsonError('Invalid JSON.',400)}
  const report=sanitizeReport(raw,caller);
  if(!report||!report.id)return jsonError('Invalid or unconsented report.',400);

  const bound=await me.puter.kv.get(CONFIG_LEARNER);
  const boundIds=bound?(bound.identifiers||[bound.id]).filter(Boolean).map(String):[];
  if(bound&&!caller.identifiers.some(function(x){return boundIds.includes(x)}))return jsonError('This Creator Hub is bound to another learner account.',403);
  if(!bound)await me.puter.kv.set(CONFIG_LEARNER,{id:caller.id,username:caller.username,identifiers:caller.identifiers,boundAt:new Date().toISOString()},{disableSharing:true});

  const rateKey='fiezel:rate:'+caller.id+':'+new Date().toISOString().slice(0,10);
  const dailyCount=Number(await me.puter.kv.get(rateKey)||0)+1;
  if(dailyCount>200)return jsonError('Daily report limit reached.',429);
  await me.puter.kv.set(rateKey,dailyCount,{disableSharing:true});

  const timestamp=Date.parse(report.createdAt)||Date.now();
  const key=REPORT_PREFIX+short(caller.id,80)+':'+timestamp+':'+report.id;
  await me.puter.kv.set(key,report,{disableSharing:true});
  return {ok:true,receipt:report.id,receivedAt:report.receivedAt};
});

router.get('/api/reports',async function(ctx){
  if(!await isOwner(ctx.user))return jsonError('Creator account required.',403);
  const page=await me.puter.kv.list({pattern:REPORT_PREFIX+'*',returnValues:true,limit:200,includeTotal:true,fetchUntilFull:true});
  const rows=Array.isArray(page)?page:(page.items||[]);
  const reports=rows.map(function(x){return x.value}).filter(Boolean).sort(function(a,b){
    return String(b.receivedAt||'').localeCompare(String(a.receivedAt||''));
  });
  const learner=await me.puter.kv.get(CONFIG_LEARNER);
  return {ok:true,total:page.total==null?reports.length:page.total,reports:reports,learner:learner||null,cursor:page.cursor||null};
});

router.get('/api/config',async function(ctx){
  if(!await isOwner(ctx.user))return jsonError('Creator account required.',403);
  return {ok:true,learner:await me.puter.kv.get(CONFIG_LEARNER)||null};
});
