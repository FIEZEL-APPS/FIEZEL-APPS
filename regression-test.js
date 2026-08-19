const fs=require('fs'),path=require('path'),vm=require('vm');
const root=__dirname;
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'style.css'),'utf8');
const VERSION=JSON.parse(fs.readFileSync(path.join(root,'VERSION.json'),'utf8')).version;
const V=JSON.parse(fs.readFileSync(path.join(root,'vocabulary-master.json'),'utf8'));
const grammarRuntime=gm=>{const out={};for(const t of (gm.templates||[])){const opts=t.options||[];const reasons=opts.map((o,i)=>i===t.correctIndex?'Correct':((t.distractors||[]).find(d=>d.option===o)?.whyFails||'Distractor invalid'));(out[t.subskill]??=[]).push([t.stem,opts,t.correctIndex,t.explanation?.rule||t.pedagogicalObjective,reasons,t.cefr]);}return out};
const GM=JSON.parse(fs.readFileSync(path.join(root,'grammar-templates.json'),'utf8'));const G=grammarRuntime(GM);const R=JSON.parse(fs.readFileSync(path.join(root,'reading-bank.json'),'utf8'));
const assert=(ok,msg)=>{if(!ok)throw new Error(msg)};

assert(/const APP_VERSION=self\.FIEZEL_VERSION/.test(app)&&fs.readFileSync(path.join(root,'version.js'),'utf8').includes(`'${VERSION}'`),'runtime version matches VERSION.json');
assert(html.indexOf('https://js.puter.com/v2/')>=0&&html.indexOf('https://js.puter.com/v2/')<html.indexOf('./version.js'),'Puter.js must load before FIEZEL runtime scripts');
assert(/async function askFiezelAI/.test(app)&&/coreWorkerExec\('\/api\/ai\/chat'/.test(app)&&!/puter\.ai\.chat\(/.test(app),'Core-only Puter AI gateway missing or direct bypass present');
assert(/function openAILoading/.test(app)&&/function renderAIResult/.test(app)&&/function renderAIError/.test(app),'AI modal states missing');
assert(/id="aiExplainBtn"/.test(app)&&/id="aiWord"/.test(app),'AI entry buttons missing');
assert(/window\.explainWithAI=explainWithAI/.test(app)&&/window\.explainWordWithAI=explainWordWithAI/.test(app),'AI handlers are not exposed');
assert(/esc\(text\)\.replace/.test(app)&&/esc\(aiErrorMessage\(err\)\)/.test(app),'AI response or error is not escaped');
assert(/FIEZEL_AI_TIMEOUT_MS=30000/.test(app)&&/currentAIRequest\(id,epoch\)/.test(app)&&/id="aiRetry"/.test(app),'AI resilience guards are missing');
assert(/q\.explain\?\.avoid/.test(app)&&/q\.explain\?\.memory/.test(app)&&/distractor-breakdown/.test(app),'natural feedback dropped explanation fields');
assert(/\.ai-btn/.test(css)&&/@keyframes aiBounce/.test(css),'AI visual states missing');
assert(/adaptiveReady/.test(app),'adaptive readiness state missing');
assert(/nextReview&&x\.nextReview<=Date\.now\(\)&&x\.mastery<80/.test(app),'review due must exclude mastered cards');
assert(/function markMastered/.test(app)&&/b\.nextReview=0/.test(app),'mastered cards do not clear review schedule');
assert(/function bindSwipe/.test(app)&&/touchstart/.test(app)&&/touchend/.test(app),'swipe controller missing');
assert(/flash-inner/.test(app)&&/rotateY/.test(css),'3D flip implementation missing');
assert(!/id="previous"/.test(app)&&!/id="next"/.test(app.split('function flashcards')[1]?.split('function reviewVocab')[0]||''),'flashcards still expose previous/next buttons');
assert(/function getDiagnosticProfile/.test(app)&&/weakTargets/.test(app),'adaptive diagnostic profile missing');
assert(/function setConfidence/.test(app)&&/confidenceHistory/.test(app),'confidence calibration missing');
// m025-46: the brief is pinned by what renders it, not by a shouting copy string.
// The all-caps kicker was removed as a design decision; the ring, the target and the
// function are the feature. This is a stricter marker than the label it replaces.
assert(/function dailyBrief/.test(app)&&/mission-ring/.test(app)&&/MEANINGFUL_ATTEMPTS/.test(app),'daily learning brief missing');
assert(/Peta Belajar & Lab/.test(app)&&/Lab Kesalahan/.test(app)&&/Linimasa Kelemahan/.test(app),'learning map/labs missing');
assert(/Jaringan Kekeliruan Kosakata/.test(app)&&/Peta Skill Reading/.test(app),'skill/confusion maps missing');
assert(/Laporan Diagnostik/.test(app)&&/Dibuat oleh Fitrarustqi/.test(app),'diagnostic/creator product surface missing');
assert(/GRAMMAR_SESSION_SIZE=25/.test(app)&&/buildGrammarLessonQuestions/.test(app),'25-question grammar lesson contract missing');
assert(/getCelestialState/.test(app)&&/playFeedbackSound/.test(app)&&/showAnswerBurst/.test(app),'realtime sky or answer feedback system missing');
assert(/if\(!state\.adaptiveReady\)return \[\]/.test(app),'adaptive pool must be locked before diagnosis');
assert(/passage:\{id:r\.id/.test(app),'reading questions do not carry their passage');
assert(/q\.passage\?card\(.*TEKS BACAAN/s.test(app),'quiz renderer does not show passage with reading question');
assert(/state\.adaptiveReady=diagnosticEvidenceReady\(state\)/.test(app),'adaptive readiness must be evidence-based');
assert(/window\.__getFiezelState/.test(app),'test state hook missing');
assert(V.length===1765,'active vocabulary master count changed unexpectedly');
assert(V.filter(v=>v.status==='complete').length===1765,'active vocabulary contains incomplete records');
assert(V.some(v=>v.level==='C2'&&v.status==='complete'),'C2 vocabulary is missing');
assert(Object.keys(G).length===129,'grammar skills changed unexpectedly');
assert(R.length===300,'reading bank unexpectedly reduced');
for(const r of R)for(const q of r.qs||[]){assert(Array.isArray(q[1])&&q[1].length>=2,'reading question has too few options');const opts=q[1].map(x=>String(x).trim().toLowerCase());assert(new Set(opts).size===opts.length,`duplicate reading options in ${r.id}`);assert(Number.isInteger(q[2])&&q[2]>=0&&q[2]<q[1].length,`invalid reading answer in ${r.id}`)}

const elements={};
function element(id){return elements[id] ||= {id,innerHTML:'',textContent:'',onclick:null,disabled:false,classList:{add(){},remove(){},toggle(){}},addEventListener(){},focus(){}};}
const document={baseURI:'http://localhost/',getElementById:element,querySelector(){return null},querySelectorAll(){return []},createElement(){return {className:'',textContent:'',disabled:false,onclick:null,classList:{add(){},remove(){},toggle(){}},append(){},addEventListener(){}}}};
const store={};
const localStorage={getItem:k=>store[k]||null,setItem:(k,v)=>store[k]=v,removeItem:k=>delete store[k]};const Notification=function(title,options){this.title=title;this.options=options;this.close=()=>{};};Notification.permission='granted';Notification.requestPermission=async()=>Notification.permission;
const fetch=async url=>{const file=String(url).split('/').pop();return {ok:true,json:async()=>JSON.parse(fs.readFileSync(path.join(root,file),'utf8'))}};
const ctx={console,Notification,self:null,document,localStorage,fetch,location:{href:'http://localhost/'},window:{},Date,Math,URL,setTimeout,clearTimeout};
ctx.window=ctx;ctx.self=ctx;ctx.window.scrollTo=()=>{};ctx.window.speechSynthesis={cancel(){},speak(){}};ctx.window.SpeechSynthesisUtterance=function(text){this.text=text};
vm.createContext(ctx);vm.runInContext(app,ctx,{filename:'app.js'});
setTimeout(()=>{
 try{
  const st=ctx.__getFiezelState();
  assert(st.totalAnswered===0&&!st.adaptiveReady,'new user is not cleanly initialized');
  assert(Object.keys(st.vocab).length===0,'new user has seeded vocabulary mastery/review');
  ctx.go('vocab'); assert(/Review Due \(0\)/.test(elements.app.innerHTML),'new user should have zero Review Due');

  const v=V.find(x=>x.status==='complete');
  st.vocab[v.id]={correct:0,total:0,streak:0,mastery:0,nextReview:0};
  ctx.updateMastery('vocab',v.id,true);
  assert(st.vocab[v.id].mastery<80&&st.vocab[v.id].nextReview>Date.now(),'a single correct answer must not instantly mark a new card mastered');
  st.vocab[v.id].nextReview=Date.now()-1000;
  assert(Object.values(st.vocab).filter(x=>x.nextReview<=Date.now()&&x.mastery<80).length===1,'due review setup failed');
  ctx.markMastered('vocab',v.id);
  assert(st.vocab[v.id].mastery===100&&st.vocab[v.id].nextReview===0,'mastering a card must remove it from Review Due');

  // Before diagnosis: no adaptive questions.
  st.adaptiveReady=false; assert(ctx.buildAdaptivePool(12).length===0,'adaptive questions appeared before diagnosis');
  // Simulate a diagnosis/profile with weaknesses across vocabulary, grammar and reading.
  const vv=V.find(x=>x.level==='A1'&&x.status==='complete')||v;
  const skills=Object.keys(G).slice(0,3); const rrs=R.slice(0,3); const skill=skills[0]; const rr=rrs[0];
  st.vocab[vv.id]={correct:1,total:4,streak:0,mastery:25,nextReview:Date.now()+1000};
  for(const sk of skills)st.grammar[sk]={correct:1,total:4,streak:0,mastery:25,nextReview:Date.now()+1000};
  for(const r of rrs)st.reading[r.id]={correct:1,total:4,streak:0,mastery:25,nextReview:Date.now()+1000};
  st.history=[];for(let i=0;i<24;i++){const t=i%3===0?'vocab':i%3===1?'grammar':'reading';st.history.push({type:t,skill:t==='vocab'?'vocabulary_meaning':t==='grammar'?skill:'reading_detail',target:t==='vocab'?vv.id:t==='grammar'?skill:rr.id,ok:i%4!==0,ms:3000,at:Date.now()-i*1000})}
  st.totalAnswered=24;st.totalCorrect=18;st.placementDone=true;st.adaptiveReady=false;ctx.go('home');
  assert(st.adaptiveReady===true,'adaptive should unlock after sufficient multi-skill evidence');
  const adaptive=ctx.buildAdaptivePool(12);
  assert(adaptive.length===12,`adaptive runtime produced ${adaptive.length}/12 questions after diagnosis`);
  assert(adaptive.some(q=>q.type==='reading'&&q.passage?.text),'adaptive reading question is missing its passage');
  for(const q of adaptive)assert(q.options?.length>=2&&q.answerIndex>=0&&q.answerIndex<q.options.length,'adaptive answer synchronization failed');

  const placement=ctx.buildPlacement();
  assert(placement.length===150,`placement runtime produced ${placement.length}/150 questions`);
  const difficulty=placement.reduce((m,q)=>{m[q.difficulty]=(m[q.difficulty]||0)+1;return m},{});
  assert([1,2,3,4,5,6].every(n=>difficulty[n]===25),'placement is not balanced 25 questions per level');
  const types=placement.reduce((m,q)=>{m[q.type]=(m[q.type]||0)+1;return m},{});
  assert(types.vocab>0&&types.grammar>0&&types.reading>0,'placement blueprint lost a core content type');
  assert(new Set(placement.map(q=>q.id||q.question)).size===150,'placement contains duplicate question ids');
  for(const q of placement){assert(q.options?.length>=2&&q.answerIndex>=0&&q.answerIndex<q.options.length,'placement answer synchronization failed');if(q.type==='reading')assert(q.passage?.text,'placement reading question is missing its passage');}

  const levelCounts={};
  for(const level of ['A1','A2','B1','B2','C1','C2']){const source=ctx.makeLevelSource(level).map(x=>x.q).filter(Boolean);levelCounts[level]=source.length;assert(source.length>0,`level ${level} has no practice content`);for(const q of source.slice(0,10)){assert(q.options?.length>=2&&q.answerIndex>=0&&q.answerIndex<q.options.length,`level ${level} answer synchronization failed`);if(q.type==='reading')assert(q.passage?.text,`level ${level} reading question missing passage`)}}

  const readingGenerated=[];for(const r of R)for(let i=0;i<(r.qs||[]).length;i++)readingGenerated.push(ctx.makeReadingQuestion(r,r.qs[i],i));
  assert(new Set(readingGenerated.map(q=>JSON.stringify([q.question,q.options]))).size===readingGenerated.length,'runtime reading questions still collide');
  assert(readingGenerated.every(q=>q.passage?.text),'some generated reading questions lack passage text');
  console.log('FIEZEL regression checks: PASS');
  console.log(JSON.stringify({adaptive:adaptive.length,placement:placement.length,placementDifficulty:difficulty,levelSourceCounts:levelCounts,newUserReviewDue:0,adaptiveLockedBeforeDiagnosis:true,readingPassageAttached:true}));
 }catch(e){console.error('FIEZEL regression checks: FAIL\n'+e.stack);process.exitCode=1}
},180);
