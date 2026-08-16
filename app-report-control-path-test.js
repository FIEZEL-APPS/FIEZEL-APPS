const fs=require('fs'),path=require('path'),vm=require('vm');
const app=fs.readFileSync(path.join(__dirname,'app.js'),'utf8');
const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
const failures=[];
const check=(condition,message)=>{if(!condition)failures.push(message)};

const capture=app.match(/document\.addEventListener\?\.\('click',e=>\{([\s\S]*?)\},\{capture:true\}\);/);
const postUnlock=app.match(/const reports=setTimeout\(async\(\)=>\{([\s\S]*?)\},1200\);/);
const shimMatch=html.match(/\/\* FIEZEL_REPORT_GESTURE_ISOLATION_START \*\/([\s\S]*?)\/\* FIEZEL_REPORT_GESTURE_ISOLATION_END \*\//);
check(!!capture,'Global capture click handler not found');
check(!!postUnlock,'Post-unlock automatic report timer not found');
check(!!shimMatch,'Creator Report gesture-isolation shim not found after app.js');

function harness(authReady,{queue=true}={}){
  const timers=[];
  let flushCalls=0,sendCalls=0,accessCalls=0,queued=0;
  const state={
    totalAnswered:10,
    preferences:{reportConsent:true,reportEndpoint:'https://creator.puter.work'},
    reportMeta:{queue:queue?[{id:'queued-report'}]:[],lastSentAnswered:0,lastAccessReportDay:''}
  };
  const ctx={
    URL,Promise,
    console:{log(){},warn(){},error(){}},
    Date:{now:()=>6001},
    state,
    haptic:()=>{},
    setTimeout(fn){timers.push(fn);return timers.length},
    puter:{workers:{exec:()=>{}},authToken:authReady?'restored-token':'',auth:{isSignedIn:()=>authReady}},
    validReportEndpoint:value=>String(value||'').startsWith('https://')&&String(value||'').endsWith('.puter.work'),
    __getFiezelState:()=>state,
    buildCreatorReport:reason=>({id:'report-'+reason,reason}),
    queueCreatorReport:()=>{queued++},
    flushReportQueue:async()=>{flushCalls++;return true},
    sendCreatorReport:async()=>{sendCalls++;return true},
    maybeSendAccessReport:async()=>{accessCalls++;return true}
  };
  ctx.window=ctx;ctx.globalThis=ctx;
  vm.createContext(ctx);
  if(capture)vm.runInContext(`let reportGestureRetryAt=0;this.captureHandler=(e)=>{${capture[1]}};`,ctx);
  if(shimMatch)vm.runInContext(shimMatch[1],ctx);
  if(postUnlock)vm.runInContext(`this.runPostUnlock=async()=>{${postUnlock[1]}};`,ctx);
  return{ctx,timers,state,get flushCalls(){return flushCalls},get sendCalls(){return sendCalls},get accessCalls(){return accessCalls},get queued(){return queued}};
}

const fakeEvent={target:{closest:()=>({disabled:false,classList:{contains:()=>false}})}};

async function settleUntil(predicate,turns=8){
  for(let i=0;i<turns&&!predicate();i++)await Promise.resolve();
}

async function main(){
  if(capture&&shimMatch){
    const ready=harness(true);
    ready.ctx.captureHandler(fakeEvent);
    check(ready.flushCalls===0,'Healthy-auth capture click must not deliver Creator Report before target-phase handlers');
    check(ready.timers.length===1,'Healthy-auth capture retry must be deferred to a later task');
    ready.timers.shift()?.();
    check(ready.flushCalls===1,'Deferred healthy-auth retry should remain deliverable after the click turn');

    const missing=harness(false);
    missing.ctx.captureHandler(fakeEvent);
    check(missing.flushCalls===0,'Missing-auth capture click must not call Creator Report worker');
    check(missing.timers.length===0,'Missing-auth automatic retry must remain queued without scheduling worker delivery');
    missing.ctx.sendCreatorReport('session_complete',false,{allowInteractiveAuth:false});
    check(missing.sendCalls===0,'Automatic session report must not invoke base sender without restored auth');
    check(missing.queued===1,'Automatic session report must remain queued when restored auth is unavailable');
    missing.ctx.maybeSendAccessReport({allowInteractiveAuth:false});
    check(missing.accessCalls===0,'Automatic daily-access report must defer without restored auth');

    const explicit=harness(false);
    explicit.ctx.sendCreatorReport('consent_enabled',true,{allowInteractiveAuth:true});
    check(explicit.sendCalls===1,'Explicit consent-enabled report may preserve interactive delivery semantics');
  }

  if(postUnlock&&shimMatch){
    // Exercise the actual 1200 ms callback body independently, with queue initially
    // empty and the daily report still due. Missing auth must leave the daily marker
    // untouched so a later authenticated automatic attempt can retry it.
    const postMissing=harness(false,{queue:false});
    await postMissing.ctx.runPostUnlock();
    check(postMissing.flushCalls===0,'Post-unlock empty-queue path must not invoke base flush without restored auth');
    check(postMissing.accessCalls===0,'Post-unlock daily-due path must not invoke base daily sender without restored auth');
    check(postMissing.state.reportMeta.lastAccessReportDay==='','Deferred daily report must remain due when restored auth is unavailable');
    check(postMissing.timers.length===0,'Post-unlock missing-auth path must not schedule worker delivery');

    // With restored auth, the same real callback body may proceed, but both automatic
    // operations must begin only from deferred tasks outside the unlock/click turn.
    const postReady=harness(true,{queue:false});
    const postPromise=postReady.ctx.runPostUnlock();
    check(postReady.flushCalls===0,'Post-unlock authenticated flush must not start in the originating turn');
    check(postReady.timers.length===1,'Post-unlock authenticated flush must schedule exactly one deferred task first');
    postReady.timers.shift()?.();
    await settleUntil(()=>postReady.timers.length>0);
    check(postReady.flushCalls===1,'Deferred post-unlock flush must remain deliverable with restored auth');
    check(postReady.accessCalls===0,'Daily access send must wait until the deferred flush completes');
    check(postReady.timers.length===1,'Daily access send must receive its own deferred task');
    postReady.timers.shift()?.();
    await postPromise;
    check(postReady.accessCalls===1,'Deferred post-unlock daily report must remain deliverable with restored auth');
  }

  check(/<script src="\.\/app\.js"><\/script>[\s\S]*FIEZEL_REPORT_GESTURE_ISOLATION_START/.test(html),'Gesture isolation must load after classic app.js');
  check(/creatorReportAuthReadyForAutomatic/.test(html)&&/puter\?\.authToken/.test(html),'Automatic report guard must require an existing Puter auth token');
  check(/allowInteractiveAuth/.test(html),'Automatic/manual report policy flag missing');

  if(failures.length){
    console.error('FIEZEL app report control path: FAIL');
    failures.forEach(x=>console.error('- '+x));
    process.exit(1);
  }
  console.log('FIEZEL app report control path: PASS');
  console.log(JSON.stringify({captureGestureIsolated:true,postUnlockPathCovered:true,automaticReportNonInteractive:true,sessionReportQueuedWithoutAuth:true,dailyReportRemainsDueWithoutAuth:true,explicitConsentPreserved:true}));
}

main().catch(error=>{
  console.error('FIEZEL app report control path: FAIL');
  console.error('- Async harness failed: '+error.message);
  process.exit(1);
});
