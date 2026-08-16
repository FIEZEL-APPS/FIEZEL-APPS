const fs=require('fs'),path=require('path');
const app=fs.readFileSync(path.join(__dirname,'app.js'),'utf8');
const failures=[];
const check=(condition,message)=>{if(!condition)failures.push(message)};

// #48 regression: a generic document capture listener must never start Creator Report
// delivery before the clicked feature receives its own target-phase user gesture.
const capture=app.match(/document\.addEventListener\?\.\('click',e=>\{([\s\S]*?)\},\{capture:true\}\);/);
check(!!capture,'Global capture click handler not found');
if(capture){
  let flushCalls=0;
  const state={reportMeta:{queue:[{id:'queued-report'}]}};
  const fakeDate={now:()=>6001};
  const target={closest:()=>({disabled:false,classList:{contains:()=>false}})};
  try{
    const run=new Function('state','Date','haptic','flushReportQueue','e',`let reportGestureRetryAt=0;${capture[1]}`);
    run(state,fakeDate,()=>{},()=>{flushCalls++},{target});
    check(flushCalls===0,'Generic capture-phase click must not flush Creator Report before feature target handlers');
  }catch(error){
    failures.push('Capture-phase ordering harness failed: '+error.message);
  }
}

// Team invariant from A2/A3/A4/A5: every automatic report path is non-interactive.
// Missing restored auth must defer work instead of allowing workers.exec() to trigger sign-in.
check(/function\s+creatorReportAuthReadyForAutomatic\s*\(/.test(app),'Missing non-interactive Creator Report auth predicate');
check(/puter\.authToken/.test(app),'Automatic Creator Report auth predicate must require an existing Puter auth token');
check(/async function flushReportQueue\(\{allowInteractiveAuth=false\}=\{\}\)/.test(app),'flushReportQueue must default to non-interactive auth');
check(/async function maybeSendAccessReport\(\{allowInteractiveAuth=false\}=\{\}\)/.test(app),'maybeSendAccessReport must default to non-interactive auth');
check(/sendCreatorReport\('session_complete',false,\{allowInteractiveAuth:false\}\)/.test(app),'Session-complete automatic report must be explicitly non-interactive');

const unlock=app.match(/function unlockAppAfterNotification\(\)\{([\s\S]*?)\n\}/);
check(!!unlock,'unlockAppAfterNotification not found');
if(unlock){
  check(/flushReportQueue\(\{allowInteractiveAuth:false\}\)/.test(unlock[1]),'Post-unlock queue flush must be non-interactive');
  check(/maybeSendAccessReport\(\{allowInteractiveAuth:false\}\)/.test(unlock[1]),'Post-unlock daily report must be non-interactive');
}

if(failures.length){
  console.error('FIEZEL app report control path: FAIL');
  failures.forEach(x=>console.error('- '+x));
  process.exit(1);
}
console.log('FIEZEL app report control path: PASS');
console.log(JSON.stringify({captureGestureIsolated:true,automaticReportNonInteractive:true,postUnlockNonInteractive:true}));
