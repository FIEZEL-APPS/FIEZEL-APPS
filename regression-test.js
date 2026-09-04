const fs=require('fs'),path=require('path'),vm=require('vm');
const root=__dirname;
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'style.css'),'utf8');
const VERSION=JSON.parse(fs.readFileSync(path.join(root,'VERSION.json'),'utf8')).version;
const V=JSON.parse(fs.readFileSync(path.join(root,'vocabulary-master.json'),'utf8'));
const grammarRuntime=gm=>{const out={};for(const t of (gm.templates||[])){const opts=t.options||[];const reasons=opts.map((o,i)=>i===t.correctIndex?'Correct':((t.distractors||[]).find(d=>d.option===o)?.whyFails||'Distractor invalid'));(out[t.subskill]??=[]).push([t.stem,opts,t.correctIndex,t.explanation?.rule||t.pedagogicalObjective,reasons,t.cefr]);}return out};
const CURRICULUM=JSON.parse(fs.readFileSync(path.join(root,'grammar-curriculum-v1.json'),'utf8'));const GM=JSON.parse(fs.readFileSync(path.join(root,'grammar-templates.json'),'utf8'));const G=grammarRuntime(GM);const R=JSON.parse(fs.readFileSync(path.join(root,'reading-bank.json'),'utf8'));
const GRAMMAR_DECLARED_COUNT=JSON.parse(fs.readFileSync('./grammar-templates.json','utf8')).count;
const assert=(ok,msg)=>{if(!ok)throw new Error(msg)};

assert(/const APP_VERSION=self\.FIEZEL_VERSION/.test(app)&&fs.readFileSync(path.join(root,'version.js'),'utf8').includes(`'${VERSION}'`),'runtime version matches VERSION.json');
assert(html.indexOf('https://js.puter.com/v2/')>=0&&html.indexOf('https://js.puter.com/v2/')<html.indexOf('./version.js'),'Puter.js must load before FIEZEL runtime scripts');
assert(/async function askFiezelAI/.test(app)&&/coreWorkerExec\('\/api\/ai\/chat'/.test(app)&&!/puter\.ai\.chat\(/.test(app),'Core-only Puter AI gateway missing or direct bypass present');
assert(/function openAILoading/.test(app)&&/function renderAIResult/.test(app)&&/function renderAIError/.test(app),'AI modal states missing');
assert(/id="aiExplainBtn"/.test(app)&&/id="aiWord"/.test(app),'AI entry buttons missing');
assert(/window\.explainWithAI=explainWithAI/.test(app)&&/window\.explainWordWithAI=explainWordWithAI/.test(app),'AI handlers are not exposed');
// m025-93: pemeriksaan ini dulu memaku BENTUK implementasinya - literal
// esc(text).replace(...) - bukan sifat yang dijaganya. Ketika teks AI mulai
// diterjemahkan dari Markdown, bentuk itu berubah walau keamanannya justru naik.
// Yang diperiksa sekarang adalah sifatnya: teks model TIDAK PERNAH disisipkan mentah,
// dan penerjemahnya meng-esc SETIAP baris sebelum menyentuh satu penanda pun.
assert(/\$\{renderMarkdown\(text\)\}/.test(app)&&/const line=esc\(raw\)/.test(app)&&/esc\(aiErrorMessage\(err\)\)/.test(app),'AI response or error is not escaped');
assert(/FIEZEL_AI_TIMEOUT_MS=30000/.test(app)&&/currentAIRequest\(id,epoch\)/.test(app)&&/id="aiRetry"/.test(app),'AI resilience guards are missing');
assert(/q\.explain\?\.avoid/.test(app)&&/q\.explain\?\.memory/.test(app)&&/distractor-breakdown/.test(app),'natural feedback dropped explanation fields');
assert(/\.ai-btn/.test(css)&&/@keyframes aiBounce/.test(css),'AI visual states missing');
assert(/adaptiveReady/.test(app),'adaptive readiness state missing');
assert(/nextReview&&x\.nextReview<=Date\.now\(\)/.test(app),'review due must be driven by the next review timestamp');
assert(/function markMastered/.test(app)&&/b\.nextReview=Date\.now\(\)\+Math\.max\(30,b\.stability\)/.test(app),'mastered cards keep a maintenance review schedule');
assert(/baseLapseBurden/.test(app)&&/lastSchedule=\{at:attemptAt/.test(app),'mastery scheduling keeps one attempt snapshot for confidence recalibration');
assert(/function bindSwipe/.test(app)&&/touchstart/.test(app)&&/touchend/.test(app),'swipe controller missing');
assert(/flash-inner/.test(app)&&/rotateY/.test(css),'3D flip implementation missing');
assert(!/id="previous"/.test(app)&&!/id="next"/.test(app.split('function flashcards')[1]?.split('function reviewVocab')[0]||''),'flashcards still expose previous/next buttons');
assert(/function getDiagnosticProfile/.test(app)&&/weakTargets/.test(app),'adaptive diagnostic profile missing');
assert(/function setConfidence/.test(app)&&/confidenceHistory/.test(app),'confidence calibration missing');
assert(/ACCOUNT_STATE_PREFIX/.test(app)&&/activateAccountStateFromPuter/.test(app)&&/LEGACY_STATE_OWNER_KEY/.test(app)&&/localStorage\.removeItem\(LEGACY_STATE_KEY\)/.test(app),'per-account state isolation and one-time legacy migration missing');
assert(/timeZone:studyTimeZone\(\)/.test(app)&&/function validTimeZone/.test(app),'learner timezone is not propagated to remote activity');
assert(/sessionAttempts:coreBrainSessionAttempts\(\)/.test(app)&&/state\.activeSession\?\.startedAt/.test(app),'session fatigue must use the active session, not global history');
// m025-46: the brief is pinned by what renders it, not by a shouting copy string.
// The all-caps kicker was removed as a design decision; the ring, the target and the
// function are the feature. This is a stricter marker than the label it replaces.
assert(/function dailyBrief/.test(app)&&/mission-ring/.test(app)&&/MEANINGFUL_ATTEMPTS/.test(app),'daily learning brief missing');
// AI-20 F06 (W1-TESTPLAN 2a): naskah murid boleh PINDAH byte-identik dari app.js ke copy-map
// features/i18n/copy-id-*.js (himpunan literal dijaga id-golden-snapshot-test.js), jadi HANYA
// baris peta-belajar ini mencari di UNION app.js + copy-id — glob kosong = perilaku lama.
// Semua invarian keamanan lain di berkas ini tetap memeriksa app.js langsung (DO-NOT-TOUCH).
const i18nDir=path.join(root,'features','i18n');
const copyIdUnion=fs.existsSync(i18nDir)?fs.readdirSync(i18nDir).filter(f=>/^copy-id-.*\.js$/.test(f)).sort().map(f=>fs.readFileSync(path.join(i18nDir,f),'utf8')).join('\n'):'';
const appCopyUnion=app+'\n'+copyIdUnion;
assert(/Peta Belajar & Lab/.test(appCopyUnion)&&/Lab Kesalahan/.test(appCopyUnion)&&/Linimasa Kelemahan/.test(appCopyUnion),'learning map/labs missing');
// W2-INT (teknik union yang sama dengan baris peta-belajar di atas): kedua judul peta ini
// PINDAH byte-identik ke features/i18n/copy-id-app-d.js (W2-APP-D) — himpunan literal tetap
// dijaga id-golden-snapshot-test.js, jadi pencariannya ikut UNION app.js + copy-id.
assert(/Jaringan Kekeliruan Kosakata/.test(appCopyUnion)&&/Peta Skill Reading/.test(appCopyUnion),'skill/confusion maps missing');
// W2-INT: 'Laporan Diagnostik' juga PINDAH byte-identik ke copy-id-app-d.js (union sama).
// Kredit pembuat tetap dicek di app.js langsung — ia bukan naskah murid yang boleh pindah.
assert(/Laporan Diagnostik/.test(appCopyUnion)&&(/Dibuat oleh Fitrarustqi/.test(appCopyUnion)||/Dibuat oleh Fitrarustqi/.test(app)),'diagnostic/creator product surface missing');
assert(/GRAMMAR_SESSION_SIZE=25/.test(app)&&/buildGrammarLessonQuestions/.test(app),'25-question grammar lesson contract missing');
assert(/getCelestialState/.test(app)&&/playFeedbackSound/.test(app)&&/showAnswerBurst/.test(app),'realtime sky or answer feedback system missing');
assert(/if\(!state\.adaptiveReady\)return \[\]/.test(app),'adaptive pool must be locked before diagnosis');
assert(/passage:\{id:r\.id/.test(app),'reading questions do not carry their passage');
// W2-INT (teknik union): eyebrow 'TEKS BACAAN' PINDAH byte-identik ke copy-id-app-d.js
// ('quiz.teks-bacaan'). Struktur renderer tetap dicek di app.js: kartu passage harus tetap
// dirender — kini lewat t('quiz.teks-bacaan') — dan nilainya tetap verbatim di copy-map.
// 2026-08-30: assert ini dulu memaku NAMA KUNCI i18n ('quiz.teks-bacaan') dan jadi merah di
// m025-202 ketika kunci itu diganti nama jadi 'quiz.reading-eyebrow' — padahal kartu bacaan
// tetap dirender dan naskahnya tetap 'TEKS BACAAN'. Yang perlu dijaga adalah KONTRAKNYA
// (soal reading selalu ditemani passage-nya, ber-eyebrow berbahasa Indonesia yang benar),
// bukan ejaan kunci yang boleh berubah kapan saja. Jadi kuncinya sekarang DIBACA dari
// renderer, lalu nilainya diverifikasi di copy-map — rename lolos, kartu yang hilang tidak.
const passageEyebrow=/q\.passage\?card\(`<div class="passage passage-reading"><div class="eyebrow">\$\{([^}]+)\}/.exec(app);
const eyebrowKey=passageEyebrow&&/FiezelI18n\.t\('([^']+)'\)/.exec(passageEyebrow[1]);
assert(!!passageEyebrow&&(/TEKS BACAAN/.test(passageEyebrow[1])||(!!eyebrowKey&&new RegExp("'"+eyebrowKey[1].replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+"'\\s*:\\s*'TEKS BACAAN'").test(copyIdUnion))),'quiz renderer does not show passage with reading question');
assert(/const readiness=diagnosticReadinessMap\(state\)/.test(app)&&/state\.adaptiveReady=!!readiness\[getActiveLevel\(state\)\]/.test(app),'adaptive readiness must be evidence-based, per active level');
assert(/window\.__getFiezelState/.test(app),'test state hook missing');
/* Braincore v3 P0 (umpan balik cloze berbahasa Indonesia). DUA sifat dijaga bersama, karena
   memperbaiki satu tanpa yang lain menghasilkan cacat yang berbeda:
     (a) yang DITAMPILKAN ke murid mengutamakan label Indonesia. Sebelum ini slot itu diisi
         `matchedDistractor.misconception` — tag Inggris kanonik seperti
         "habitual-aspect overgeneralization" — jadi murid SMP Indonesia yang mengetik
         distraktor berlabel membaca istilah linguistik berbahasa Inggris.
     (b) yang DICATAT ke ledger tetap tag Inggris kanonik. Ia kunci agregasi bukti lintas
         sesi; menggantinya dengan teks Indonesia memecah seluruh riwayat miskonsepsi
         sekaligus membuat dua label lokal yang sama maknanya terhitung sebagai dua masalah. */
assert(/matchedDistractor\.misconceptionId\|\|res\.matchedDistractor\.whyFailsId\|\|res\.matchedDistractor\.misconception/.test(app),
  'umpan balik distraktor cloze tidak mengutamakan label Indonesia (murid membaca tag Inggris)');
assert(/misconceptionLedgerRecord\(session,q,\{misconception:String\(res\.matchedDistractor\.misconception\)/.test(app),
  'ledger miskonsepsi tidak lagi memakai tag kanonik Inggris - agregasi lintas sesi pecah');
/* m025-188: kontrak inventori DIPERKETAT dari angka mati ke properti — lantai baseline
   (tidak boleh menyusut), keunikan id penuh, dan SEMUA record wajib complete (dulu cek
   kesetaraan dengan angka yang sama diam-diam membiarkan record incomplete masuk asal
   totalnya pas). Preseden pola: a11abc3 (mastery-bkt dinamis). */
assert(V.length>=1765,'active vocabulary master shrank below baseline 1765');
assert(new Set(V.map(v=>v.id)).size===V.length,'vocabulary ids are not unique');
assert(V.filter(v=>v.status==='complete').length===V.length,'active vocabulary contains incomplete records');
assert(V.some(v=>v.level==='C2'&&v.status==='complete'),'C2 vocabulary is missing');
/* m025-192: wave-2 memperkenalkan MULTI-ITEM per subskill (69 varian latihan untuk subskill
   lama), jadi skill runtime != jumlah template. Kontrak dipisah dua-duanya diperketat:
   (a) jumlah template == count deklaratif && >= lantai 153, id unik;
   (b) subskill runtime >= lantai 179 (153 basis + 26 gen2) dan tiap subskill punya >=1 item. */
assert(GM.templates.length===GRAMMAR_DECLARED_COUNT&&GM.templates.length>=153&&new Set(GM.templates.map(t=>t.id)).size===GM.templates.length,'grammar templates out of declared-count contract (m025-192)');
assert(Object.keys(G).length>=179&&Object.values(G).every(a=>a.length>=1),'grammar runtime subskills below floor 179 or empty subskill (m025-192)');
assert(R.length>=300&&new Set(R.map(r=>r.id)).size===R.length,'reading bank shrank below baseline 300 or has duplicate ids (m025-188)');
for(const r of R)for(const q of r.qs||[]){assert(Array.isArray(q[1])&&q[1].length>=2,'reading question has too few options');const opts=q[1].map(x=>String(x).trim().toLowerCase());assert(new Set(opts).size===opts.length,`duplicate reading options in ${r.id}`);assert(Number.isInteger(q[2])&&q[2]>=0&&q[2]<q[1].length,`invalid reading answer in ${r.id}`)}

const elements={};
function element(id){return elements[id] ||= {id,innerHTML:'',textContent:'',onclick:null,disabled:false,classList:{add(){},remove(){},toggle(){}},addEventListener(){},querySelector(){return null},focus(){}};}
const document={baseURI:'http://localhost/',getElementById:element,querySelector(){return null},querySelectorAll(){return []},createElement(){return {className:'',textContent:'',disabled:false,onclick:null,classList:{add(){},remove(){},toggle(){}},append(){},addEventListener(){}}}};
const store={};
const localStorage={getItem:k=>store[k]||null,setItem:(k,v)=>store[k]=v,removeItem:k=>delete store[k]};const Notification=function(title,options){this.title=title;this.options=options;this.close=()=>{};};Notification.permission='granted';Notification.requestPermission=async()=>Notification.permission;
// m025-114: stub ini dulu memangkas path menjadi nama berkas saja, jadi bank listening di
// features/speaking-listening/ tidak akan pernah ditemukan dan tes ikut lulus tanpa pernah
// memeriksa soal listening. Sekarang seluruh path dipertahankan. app.js memanggil fetch
// dengan dua bentuk - URL absolut hasil new URL(f, baseURI) dan path relatif './x' - jadi
// keduanya harus dinormalkan ke path yang sama di dalam repo.
const fetch=async url=>{
  const raw=String(url);
  const rel=(raw.includes('://')?raw.slice(raw.indexOf('://')+3).replace(/^[^/]*/,''):raw).replace(/^\.?\//,'').split('?')[0];
  const file=path.join(root,rel);
  if(!rel||!fs.existsSync(file))return{ok:false,status:404,json:async()=>({})};
  return{ok:true,status:200,json:async()=>JSON.parse(fs.readFileSync(file,'utf8'))};
};
const ctx={console,Notification,self:null,document,localStorage,fetch,location:{href:'http://localhost/'},window:{},Date,Math,URL,setTimeout,clearTimeout};
ctx.window=ctx;ctx.self=ctx;ctx.window.scrollTo=()=>{};ctx.window.speechSynthesis={cancel(){},speak(){}};ctx.window.SpeechSynthesisUtterance=function(text){this.text=text};
// W2-INT (pola W1-TESTPLAN 2b, harness kondisional — sama dengan settings-cache-test.js):
// app.js kini memanggil FiezelI18n.t(...) untuk naskah yang PINDAH byte-identik ke copy-map
// (Wave 2), jadi runtime i18n + seluruh copy-id dimuat ke vm SEBELUM app.js — meniru urutan
// <script defer> index.html. Kalau berkasnya belum ada, harness kosong = perilaku lama.
vm.createContext(ctx);
const i18nRuntimePath=path.join(i18nDir,'fiezel-i18n.js');
if(fs.existsSync(i18nRuntimePath)){
  vm.runInContext(fs.readFileSync(i18nRuntimePath,'utf8'),ctx,{filename:'fiezel-i18n.js'});
  for(const f of fs.readdirSync(i18nDir).filter(f=>/^copy-id-.*\.js$/.test(f)).sort())
    vm.runInContext(fs.readFileSync(path.join(i18nDir,f),'utf8'),ctx,{filename:f});
}
vm.runInContext(app,ctx,{filename:'app.js'});
setTimeout(async()=>{
 try{
  const st=ctx.__getFiezelState();
  assert(st.totalAnswered===0&&!st.adaptiveReady,'new user is not cleanly initialized');
  assert(Object.keys(st.vocab).length===0,'new user has seeded vocabulary mastery/review');
  ctx.go('vocab'); assert(/(Review Due|Ulang) \(0\)/.test(elements.app.innerHTML),'new user should have zero Review Due');

  const v=V.find(x=>x.level==='A1'&&x.status==='complete')||V.find(x=>x.status==='complete');
  st.vocab[v.id]={correct:0,total:0,streak:0,mastery:0,nextReview:0};
  ctx.updateMastery('vocab',v.id,true);
  assert(st.vocab[v.id].mastery<80&&st.vocab[v.id].nextReview>Date.now(),'a single correct answer must not instantly mark a new card mastered');
  st.vocab[v.id].nextReview=Date.now()-1000;
  assert(Object.values(st.vocab).filter(x=>x.nextReview<=Date.now()&&x.mastery<80).length===1,'due review setup failed');
  ctx.markMastered('vocab',v.id);
  assert(st.vocab[v.id].mastery===100&&st.vocab[v.id].nextReview>Date.now()&&st.vocab[v.id].stability>=30,'mastering a card must schedule maintenance review');
  st.vocab[v.id].nextReview=Date.now()-1;
  assert(ctx.__fiezelDueReviews()>=1,'mastered cards should re-enter Review Due when maintenance is due');
  st.vocab[v.id].nextReview=Date.now()+30*86400000;

  // Keyakinan adalah sinyal kalibrasi, bukan jawaban kedua. Mengulang jawaban yang sama
  // dengan nilai keyakinan boleh mengubah intervalnya, tetapi tidak boleh menambah lapse
  // kedua atau menggeser titik waktu jawabannya.
  const attemptAt=Date.now()-5000;
  st.vocab[v.id]={correct:1,total:1,streak:1,mastery:20,nextReview:0,stability:2,lapses:0,lapseBurden:0,lastSeen:attemptAt,lastWrong:0};
  st.history.push({id:'regression-confidence',type:'vocab',skill:'vocabulary_meaning',target:v.id,reviewBucket:'vocab',reviewKey:v.id,ok:false,ms:6000,confidence:null,at:attemptAt});
  ctx.updateMastery('vocab',v.id,false,6000,null,attemptAt);
  const afterAnswer=st.vocab[v.id];
  assert(afterAnswer.lapses===1&&afterAnswer.lastSchedule?.at===attemptAt,'a failed attempt must schedule exactly one lapse');
  ctx.setConfidence(1);
  assert(st.vocab[v.id].lapses===1&&st.vocab[v.id].lastSchedule?.at===attemptAt,'confidence must not double-count the lapse');

  // Before diagnosis: no adaptive questions.
  st.adaptiveReady=false; assert(ctx.buildAdaptivePool(12).length===0,'adaptive questions appeared before diagnosis');
  // Simulate a diagnosis/profile with weaknesses across vocabulary, grammar and reading.
  const vv=V.find(x=>x.level==='A1'&&x.status==='complete')||v;
  // m025-140: bukti harus datang dari level yang SEDANG aktif (A1 di sini). Sebelum B-01
  // ditutup, fixture ini lolos memakai grammar dan reading level apa pun - dan itulah persis
  // celahnya: 24 jawaban B1 membuka latihan adaptif untuk murid yang memilih A1.
  // Catatan: binding `let` di dalam vm TIDAK muncul sebagai properti context, jadi daftar
  // level harus dibaca dari berkas kurikulum, bukan dari ctx.GRAMMAR_ITEMS (yang selalu kosong
  // dilihat dari luar dan diam-diam menjatuhkan fixture ke skill level lain).
  const a1Skills=CURRICULUM.lessons.filter(l=>l.level==='A1').map(l=>l.lessonId).filter(x=>G[x]);
  assert(a1Skills.length>=3,'fixture needs at least three A1 grammar lessons');
  const skills=a1Skills.slice(0,3); const rrs=R.filter(x=>x.level==='A1').slice(0,3); const skill=skills[0]; const rr=rrs[0];
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
  const placement=await ctx.buildPlacement();
  assert(placement.length===25,`placement runtime produced ${placement.length}/25 questions`);
  const difficulty=placement.reduce((m,q)=>{m[q.difficulty]=(m[q.difficulty]||0)+1;return m},{});
  assert([6,5,4,4,3,3].every((n,i)=>difficulty[i+1]===n),`placement weighting is wrong: ${JSON.stringify(difficulty)}`);
  const types=placement.reduce((m,q)=>{m[q.type]=(m[q.type]||0)+1;return m},{});
  assert(types.vocab>0&&types.grammar>0&&types.listening>0,'placement blueprint lost a core content type');
  assert(!types.reading,'placement must contain no reading questions');
  assert(new Set(placement.map(q=>q.id||q.question)).size===25,'placement contains duplicate question ids');
  for(const q of placement){
    assert(q.options?.length>=2&&q.answerIndex>=0&&q.answerIndex<q.options.length,'placement answer synchronization failed');
    // Naskah listening harus tetap hanya di q.script. Begitu ia bocor ke q.question, soalnya
    // bisa dijawab dengan membaca dan tes ini berhenti mengukur listening.
    if(q.type==='listening'){assert(q.script,'listening question lost its script');assert(!q.question.includes(q.script),'listening script leaked into the visible question');}
  }

  const levelCounts={};
  for(const level of ['A1','A2','B1','B2','C1','C2']){const source=ctx.makeLevelSource(level).map(x=>x.q).filter(Boolean);levelCounts[level]=source.length;assert(source.length>0,`level ${level} has no practice content`);for(const q of source.slice(0,10)){assert(q.options?.length>=2&&q.answerIndex>=0&&q.answerIndex<q.options.length,`level ${level} answer synchronization failed`);if(q.type==='reading')assert(q.passage?.text,`level ${level} reading question missing passage`)}}

  const readingGenerated=[];for(const r of R)for(let i=0;i<(r.qs||[]).length;i++)readingGenerated.push(ctx.makeReadingQuestion(r,r.qs[i],i));
  assert(new Set(readingGenerated.map(q=>JSON.stringify([q.question,q.options]))).size===readingGenerated.length,'runtime reading questions still collide');
  assert(readingGenerated.every(q=>q.passage?.text),'some generated reading questions lack passage text');
  console.log('FIEZEL regression checks: PASS');
  console.log(JSON.stringify({adaptive:adaptive.length,placement:placement.length,placementDifficulty:difficulty,levelSourceCounts:levelCounts,newUserReviewDue:0,adaptiveLockedBeforeDiagnosis:true,readingPassageAttached:true}));
  process.exit(0);
 }catch(e){console.error('FIEZEL regression checks: FAIL\n'+e.stack);process.exit(1)}
},180);
