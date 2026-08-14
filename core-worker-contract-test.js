const fs=require('fs'),path=require('path'),vm=require('vm');
const source=fs.readFileSync(path.join(__dirname,'fiezel-core-worker.js'),'utf8');
const routes={GET:new Map(),POST:new Map()},store=new Map();
const router={get:(p,f)=>routes.GET.set(p,f),post:(p,f)=>routes.POST.set(p,f)};
const kv={
  get:async k=>store.get(k),
  set:async(k,v)=>{store.set(k,v);return true},
  list:async({pattern='',returnValues=false}={})=>{const prefix=pattern.replace('*','');return[...store.entries()].filter(([k])=>k.startsWith(prefix)).map(([key,value])=>returnValues?{key,value}:{key})}
};
const me={puter:{kv,auth:{getUser:async()=>({uuid:'owner-uuid',username:'owner'})}}};
const context={router,me,Response,Intl,Date,Math,console,crypto:require('crypto').webcrypto,TextEncoder,TextDecoder};
vm.createContext(context);vm.runInContext(source,context,{filename:'fiezel-core-worker.js'});
const assert=(v,m)=>{if(!v)throw new Error(m)};
const req=(body={},headers={})=>({json:async()=>body,headers:{get:k=>headers[k.toLowerCase()]||headers[k]||''}});
(async()=>{
  const health=await routes.GET.get('/health')({request:req()});
  assert(health.status==='ok'&&health.protocol==='1.7'&&health.aiGateway==='core-only'&&health.capabilities.includes('learner-evidence-v1')&&health.capabilities.includes('adaptive-policy-v1')&&health.capabilities.includes('policy-outcome-v1')&&health.capabilities.includes('context-coach-v1')&&health.capabilities.includes('content-qa-v1')&&health.capabilities.includes('guarded-content-patch-v1')&&health.capabilities.includes('content-self-refine-v1')&&health.capabilities.includes('evolution-config-v1')&&health.capabilities.includes('alrs'),'health/core-only protocol 1.7 capabilities failed');

  const unauth=await routes.POST.get('/api/ai/chat')({request:req({prompt:'hi'}),user:null});
  assert(unauth instanceof Response&&unauth.status===401,'unauthenticated AI was not rejected');

  let modelSeen='';
  const user={puter:{auth:{getUser:async()=>({uuid:'jahran-uuid',username:'Jahran'})},ai:{chat:async(msgs,opt)=>{modelSeen=opt.model;return{message:{content:'aman'}}}}}};
  const ai=await routes.POST.get('/api/ai/chat')({request:req({prompt:'jelaskan present perfect',model:'untrusted-model'}),user});
  assert(ai.text==='aman'&&modelSeen==='gpt-5.4-nano'&&ai.model==='gpt-5.4-nano'&&ai.protocol==='1.7','server-side AI model ownership failed');
  const coach=await routes.POST.get('/api/coach/context')({request:req({snapshot:{adaptiveReady:true,totalAttempts:80,estimatedLevel:'B1',domains:{grammar:{attempts:30,accuracy:45}}},evidence:{behavior:{consistency14d:60},memory:{},skills:{weakest:[{skill:'present_perfect',type:'grammar',attempts:10,accuracy:40,errorRate:60,recurringErrors:3}]}},outcomes:[]}),user});
  assert(coach.text==='aman'&&coach.protocol==='1.7'&&coach.via==='fiezel-core-worker-context-coach','context-aware coach endpoint failed');
  let ownerPromptSeen='';
  const ownerUser={puter:{auth:{getUser:async()=>({uuid:'owner-uuid',username:'owner'})},ai:{chat:async(msgs,opt)=>{modelSeen=opt.model;ownerPromptSeen=JSON.stringify(msgs);const asks=JSON.stringify(msgs);return{message:{content:asks.includes('guarded content patch candidate')||asks.includes('self-refinement content patch candidate')?JSON.stringify({replacement:{meaning:'hampir',example:"It's almost midnight, so we should leave soon.",meanings:[{id:'meaning_00208_01',meaning:'hampir'}],examples:[{en:"It's almost midnight, so we should leave soon.",id:'Sekarang hampir tengah malam.'}],synonyms:['nearly'],antonyms:[],collocations:['almost done'],topic:'general',status:'complete',needsReviewReason:[]},rationale:'Expand context without changing sense.'}):'review-aman'}}}}}};
  const learnerQa=await routes.POST.get('/api/content/qa/review')({request:req({candidate:{schema:'fiezel-content-qa-v1',domain:'grammar',itemId:'TA-001',category:'repetition',severity:'review',message:'candidate'}}),user});
  assert(learnerQa instanceof Response&&learnerQa.status===403,'non-owner content QA review was not rejected');
  const qa=await routes.POST.get('/api/content/qa/review')({request:req({candidate:{schema:'fiezel-content-qa-v1',domain:'grammar',itemId:'TA-001',category:'weak_explanation',severity:'review',message:'Rule explanation needs review',sample:{stem:'Choose the best form.',options:['a','b','c','d'],answer:'b',explanation:'short'},rawHistory:['SHOULD_NOT_SURVIVE'],learnerEvidence:{selectedAnswer:'SHOULD_NOT_SURVIVE'}}}),user:ownerUser});
  assert(qa.text==='review-aman'&&qa.protocol==='1.7'&&qa.schema==='fiezel-content-qa-v1'&&qa.authority==='advisory-only'&&qa.via==='fiezel-core-worker-content-qa','content QA owner review endpoint failed');
  assert(!ownerPromptSeen.includes('SHOULD_NOT_SURVIVE'),'content QA sanitizer leaked unbounded/raw fields to AI');
  const learnerPatch=await routes.POST.get('/api/content/patch/candidate')({request:req({finding:{schema:'fiezel-content-qa-v1',domain:'vocabulary',itemId:'vocab_00006',category:'context_thin',severity:'review',message:'thin'},source:{domain:'vocabulary',itemId:'vocab_00006',sourceVersion:'5.17.0',sourceSha256:'a'.repeat(64),item:{id:'vocab_00006',word:'almost',level:'A1'}}}),user});
  assert(learnerPatch instanceof Response&&learnerPatch.status===403,'non-owner patch generation was not rejected');
  const patch=await routes.POST.get('/api/content/patch/candidate')({request:req({finding:{schema:'fiezel-content-qa-v1',domain:'vocabulary',itemId:'vocab_00006',category:'context_thin',severity:'review',message:'Vocabulary example is too thin'},source:{domain:'vocabulary',itemId:'vocab_00006',sourceVersion:'5.17.0',sourceSha256:'a'.repeat(64),item:{id:'vocab_00006',word:'almost',level:'A1',partOfSpeech:'adverb',meaning:'hampir',example:"It's almost midnight."}}}),user:ownerUser});
  assert(patch.candidate?.schema==='fiezel-content-patch-v1'&&patch.protocol==='1.7'&&patch.authority==='candidate-only'&&patch.gateStatus==='UNVERIFIED_LOCAL_GATES_REQUIRED'&&patch.candidate.target.sourceSha256==='a'.repeat(64),'guarded patch candidate endpoint failed');
  assert(!routes.POST.has('/api/content/patch/apply')&&!routes.POST.has('/api/content/patch/publish'),'mutation/publish endpoint must not exist');
  const badQa=await routes.POST.get('/api/content/qa/review')({request:req({candidate:{schema:'wrong',domain:'grammar'}}),user:ownerUser});
  assert(badQa instanceof Response&&badQa.status===400,'invalid content QA candidate was accepted');

  const ac=require('./fiezel-autonomy-config.js');
  const pl=require('./fiezel-prompt-library.js');
  const PARITY=[
    {autonomyLevel:'advisory'},
    {autonomyLevel:'bogus'},
    {autonomyLevel:'canary',autoCanonicalAdoption:true},
    {autonomyLevel:'full'},
    {autonomyLevel:'full',ownerApproved:true,ownerRef:'0c8af70c-4d1d-4e4b-b187-abcc42acda8d',approvedAt:'2026-08-14T00:00:00Z',autoCanonicalAdoption:true},
    {autonomyLevel:'full',ownerApproved:true,ownerRef:'not-a-uuid',approvedAt:'2026-08-14T00:00:00Z'},
    {autonomyLevel:'full',halt:true,ownerApproved:true,ownerRef:'0c8af70c-4d1d-4e4b-b187-abcc42acda8d',approvedAt:'2026-08-14T00:00:00Z'},
    {autonomyLevel:'canary',thresholds:{minCanaryAccuracy:99,maxCanaryRegressionPp:-5}}
  ];
  for(const input of PARITY){
    const expected=ac.sanitizeConfig(input),actual=context.evolutionSanitizeConfig(input);
    assert(JSON.stringify(actual)===JSON.stringify(expected),'evolution config parity failed for '+JSON.stringify(input));
  }
  assert(context.evolutionEffectiveLevel({autonomyLevel:'full',halt:true})==='halt'&&ac.effectiveLevel({autonomyLevel:'full',halt:true})==='halt','evolution effective level parity failed');
  const libraryJson=JSON.parse(fs.readFileSync(path.join(__dirname,'fiezel-prompt-library.json'),'utf8'));
  assert(JSON.stringify(context.evolutionEmbeddedLibrary())===JSON.stringify(libraryJson),'embedded prompt library drifted from fiezel-prompt-library.json');
  const rp=context.evolutionRenderPrompt(context.evolutionEmbeddedLibrary(),'vocabulary','expand_context',{word:'develop',cefr:'B1',example:'The app helps you develop new skills.'});
  const rp2=pl.renderPrompt(libraryJson,'vocabulary','expand_context',{word:'develop',cefr:'B1',example:'The app helps you develop new skills.'});
  assert(rp.ok&&rp.prompt===rp2.prompt,'evolution render parity failed');

  const nonOwnerEvo=await routes.POST.get('/api/evolution/config')({request:req({autonomyLevel:'advisory'}),user});
  assert(nonOwnerEvo instanceof Response&&nonOwnerEvo.status===403,'non-owner evolution config was not rejected');
  const badEvoCfg=await routes.POST.get('/api/evolution/config')({request:req({autonomyLevel:'otonom'}),user:ownerUser});
  assert(badEvoCfg instanceof Response&&badEvoCfg.status===400,'invalid evolution config was accepted');
  const evoCfg=await routes.POST.get('/api/evolution/config')({request:req({autonomyLevel:'full',ownerApproved:true,ownerRef:'0c8af70c-4d1d-4e4b-b187-abcc42acda8d',approvedAt:'2026-08-14T00:00:00Z',autoCanonicalAdoption:true}),user:ownerUser});
  assert(evoCfg.stored===true&&evoCfg.autonomyLevel==='full'&&evoCfg.protocol==='1.7','evolution config store failed');

  const nonOwnerRefine=await routes.POST.get('/api/content/self-refine')({request:req({insight:{},source:{}}),user});
  assert(nonOwnerRefine instanceof Response&&nonOwnerRefine.status===403,'non-owner self-refine was not rejected');

  store.delete('fiezel_push_v1_ai_rate_owner-uuid');
  const refine=await routes.POST.get('/api/content/self-refine')({request:req({insight:{schema:'fiezel-meta-insight-v1',id:'ins-001',domain:'vocabulary',itemId:'vocab_00006',category:'context_thin',finding:'Vocabulary example is too thin',templateId:'expand_context'},source:{domain:'vocabulary',itemId:'vocab_00006',sourceVersion:'5.17.0',sourceSha256:'a'.repeat(64),item:{id:'vocab_00006',word:'almost',level:'A1',partOfSpeech:'adverb',cefr:'A1',meaning:'hampir',example:"It's almost midnight."}}}),user:ownerUser});
  assert(refine.candidate?.schema==='fiezel-content-patch-v1'&&refine.candidate.patchId.startsWith('sr-')&&refine.authority==='candidate-only'&&refine.gateStatus==='UNVERIFIED_LOCAL_GATES_REQUIRED'&&refine.autonomyLevel==='full'&&refine.via==='fiezel-core-worker-content-self-refine'&&refine.protocol==='1.7','self-refine candidate endpoint failed');
  assert(refine.ledgerSeq===1,'self-refine ledger append failed');

  const status=await routes.GET.get('/api/evolution/status')({request:req(),user:ownerUser});
  assert(status.configured===true&&status.autonomyLevel==='full'&&status.ledger.count===1&&status.ledger.chainOk===true&&status.protocol==='1.7','evolution status failed');
  const tamper=store.get('fiezel_push_v1_evolution_ledger');tamper.entries[0].decision='promote';
  const tamperedStatus=await routes.GET.get('/api/evolution/status')({request:req(),user:ownerUser});
  assert(tamperedStatus.ledger.chainOk===false&&tamperedStatus.ledger.count===1,'ledger tamper not detected');

  const holdCfg=await routes.POST.get('/api/evolution/config')({request:req({autonomyLevel:'advisory'}),user:ownerUser});
  assert(holdCfg.stored===true&&holdCfg.autonomyLevel==='advisory','advisory config store failed');
  store.delete('fiezel_push_v1_ai_rate_owner-uuid');
  const holdRefine=await routes.POST.get('/api/content/self-refine')({request:req({insight:{schema:'fiezel-meta-insight-v1',id:'ins-002',domain:'vocabulary',itemId:'vocab_00006',category:'context_thin',finding:'x',templateId:'expand_context'},source:{domain:'vocabulary',itemId:'vocab_00006',sourceVersion:'5.17.0',sourceSha256:'a'.repeat(64),item:{id:'vocab_00006',cefr:'A1',meaning:'hampir',example:"It's almost midnight."}}}),user:ownerUser});
  assert(holdRefine.hold===true&&holdRefine.reason==='advisory_mode_no_refine'&&holdRefine.authority==='advisory-only','advisory self-refine did not hold: '+JSON.stringify(holdRefine));

  const haltCfg=await routes.POST.get('/api/evolution/config')({request:req({autonomyLevel:'full',halt:true,ownerApproved:true,ownerRef:'0c8af70c-4d1d-4e4b-b187-abcc42acda8d',approvedAt:'2026-08-14T00:00:00Z'}),user:ownerUser});
  assert(haltCfg.stored===true&&haltCfg.halt===true,'halt config store failed');
  store.delete('fiezel_push_v1_ai_rate_owner-uuid');
  const haltRefine=await routes.POST.get('/api/content/self-refine')({request:req({insight:{},source:{}}),user:ownerUser});
  assert(haltRefine instanceof Response&&haltRefine.status===503,'halt config did not block self-refine');

  for(let i=2;i<40;i++){
    const r=await routes.POST.get('/api/ai/chat')({request:req({prompt:'x'}),user});
    assert(r.text==='aman','rate limit fired too early');
  }
  const limited=await routes.POST.get('/api/ai/chat')({request:req({prompt:'x'}),user});
  assert(limited instanceof Response&&limited.status===429,'AI rate limit did not fire');

  const badCfg=await routes.POST.get('/api/admin/configure')({request:req({vapidPublicKey:'bad',cronToken:'x'}),user});
  assert(badCfg instanceof Response&&[400,403].includes(badCfg.status),'invalid owner config was accepted');

  const sub={endpoint:'https://push.example.test/sub',keys:{p256dh:'p256',auth:'auth'}};
  const subscribed=await routes.POST.get('/api/push/subscribe')({request:req({subscription:sub}),user});
  assert(subscribed.subscribed===true,'push subscription setup failed');

  const maliciousEvidence={
    generatedAt:new Date().toISOString(),
    behavior:{activeDays14:99,consistency14d:999,abandonmentRate:999,medianResponseMs:9999999,preferredStudyWindow:'malam'.repeat(30)},
    memory:{dueReviews:3,maxForgettingRisk:999,highRiskCount:7},
    skills:{measured:2,recurringErrorSkills:1,weakest:[{skill:'present_perfect'.repeat(20),type:'grammar',attempts:8,accuracy:40,errorRate:60,recurringErrors:3}]},
    privacy:{rawAnswersIncluded:true,rawHistoryIncluded:true},
    selectedAnswer:'SHOULD_NOT_SURVIVE'
  };
  const activity=await routes.POST.get('/api/activity')({
    request:req({activity:{lastStudyAt:Date.now(),activityDay:'2026-08-12',totalAnswered:999999999,todayAttempts:9,streakDays:7,dueReviews:3,evidence:maliciousEvidence}}),
    user
  });
  assert(activity.synced===true&&activity.protocol==='1.7'&&activity.evidenceSchema==='fiezel-learner-evidence-v1','activity/evidence protocol failed');
  const saved=store.get('fiezel_push_v1_user_jahran-uuid');
  assert(saved.activity.totalAnswered===1e7&&saved.activity.evidence.behavior.activeDays14===14&&saved.activity.evidence.memory.maxForgettingRisk===100,'bounded learner evidence clamps failed');
  assert(saved.activity.evidence.privacy.rawAnswersIncluded===false&&saved.activity.evidence.privacy.rawHistoryIncluded===false&&!JSON.stringify(saved.activity.evidence).includes('SHOULD_NOT_SURVIVE'),'raw/private learner evidence leaked to backend');


  const rawOutcome={schema:'fiezel-policy-outcome-v1',outcomeId:'out-1',policyId:'p-1',evaluatedAt:new Date().toISOString(),policyMode:'repair',targetSkill:'present_perfect',primaryDomain:'grammar',completed:true,abandoned:false,planned:6,answered:6,completionRate:100,accuracy:40,targetAttempts:6,targetAccuracy:40,targetAdherence:100,score:35,status:'negative',recommendation:'reduce_load',privacy:{rawAnswersIncluded:true},selectedAnswer:'SHOULD_NOT_SURVIVE'};
  const outcomeStored=await routes.POST.get('/api/policy/outcome')({request:req({outcome:rawOutcome}),user});
  assert(outcomeStored.stored===true&&outcomeStored.protocol==='1.7'&&outcomeStored.outcomeSchema==='fiezel-policy-outcome-v1','policy outcome store failed');
  const storedOutcome=store.get('fiezel_push_v1_outcomes_jahran-uuid');
  assert(storedOutcome.history.length===1&&!JSON.stringify(storedOutcome).includes('SHOULD_NOT_SURVIVE')&&storedOutcome.history[0].privacy.rawAnswersIncluded===false,'policy outcome privacy/bounding failed');

  const policyRes=await routes.POST.get('/api/policy/next')({request:req({snapshot:{adaptiveReady:true,totalAttempts:80,estimatedLevel:'B1',dueReviews:4,domains:{grammar:{attempts:30,accuracy:45,recentAccuracy:40},vocabulary:{attempts:20,accuracy:75},reading:{attempts:20,accuracy:70}}},evidence:{behavior:{consistency14d:50,abandonmentRate:10,medianResponseMs:6000},confidence:{evidence:20,gap:10},memory:{dueReviews:4,maxForgettingRisk:82,highRiskCount:3},skills:{measured:5,recurringErrorSkills:1,weakest:[{skill:'present_perfect',type:'grammar',attempts:10,accuracy:40,errorRate:60,recurringErrors:3}]}}}),user});
  assert(policyRes.protocol==='1.7'&&policyRes.policy?.schema==='fiezel-adaptive-policy-v1'&&policyRes.policy.mode==='review'&&policyRes.policy.primaryDomain==='grammar'&&policyRes.policy.targetSkill==='present_perfect'&&policyRes.policy.rationaleCodes.includes('recent_policy_outcome_negative'),'adaptive policy endpoint failed');
  const unauthPolicy=await routes.POST.get('/api/policy/next')({request:req({snapshot:{},evidence:{}}),user:null});
  assert(unauthPolicy instanceof Response&&unauthPolicy.status===401,'unauthenticated policy request was not rejected');

  const at19=Date.parse('2026-08-12T12:00:00Z');
  const inactive=context.reminderFor({activity:{totalAnswered:50,lastStudyAt:at19-Math.floor(2.2*86400000),activityDay:'2026-08-12',todayAttempts:0,streakDays:0,evidence:context.boundedEvidence({generatedAt:new Date(at19).toISOString()})}},at19);
  assert(inactive?.kind==='inactivity_2','remote ALRS 2-day escalation failed');

  const at17=Date.parse('2026-08-12T10:00:00Z');
  const legacyDue=context.reminderFor({activity:{totalAnswered:50,lastStudyAt:at17-3600000,activityDay:'2026-08-12',todayAttempts:5,streakDays:0,dueReviews:3,evidence:context.boundedEvidence({})}},at17);
  assert(legacyDue?.kind==='due_review'&&legacyDue?.meta?.trigger==='legacy_due_review','5.7 due-review compatibility failed');

  const quiet=Date.parse('2026-08-11T19:00:00Z');
  assert(context.reminderFor({activity:{totalAnswered:50,lastStudyAt:quiet-8*86400000,evidence:context.boundedEvidence({generatedAt:new Date(quiet).toISOString()})}},quiet)===null,'remote ALRS quiet hours failed');

  console.log('FIEZEL core worker contract: PASS');
  console.log(JSON.stringify({protocol:'1.7',coreOnlyAI:true,serverModel:'gpt-5.4-nano',rateLimit:40,unauthRejected:true,learnerEvidenceBounded:true,adaptivePolicy:true,policyOutcome:true,contextCoach:true,contentQa:true,guardedContentPatch:true,remoteALRS:true,legacyDueReviewCompatible:true}));
})().catch(e=>{console.error('FIEZEL core worker contract: FAIL\n'+e.stack);process.exit(1)});
