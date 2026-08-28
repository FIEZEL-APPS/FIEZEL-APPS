/**
 * FIEZEL gerbang — r2-ux-overhaul-smoke-test.js · smoke runtime UX overhaul ronde 2
 * (IMPLEMENTATION-R2-REPORT.md). Menjalankan app.js ASLI di vm dengan DOM tiruan
 * (pola p1-game-layer-smoke-test.js), lalu memeriksa perilaku yang benar-benar tampil:
 *
 *   1. R2-1 — chip "Ujian Skip Level" tampil di PUNCAK Grammar Hub (tanpa scroll),
 *      node emas di ujung jalur tetap ada.
 *   2. R2-2 — "Lewati materi" ada pada node yang belum selesai (termasuk yang TERKUNCI);
 *      gerbang bukti 5 soal berjalan lewat quizLoop; lulus 5/5 menandai lesson selesai
 *      (mastery >= ambang unlock) dan hasilnya diumumkan di layar hasil.
 *   3. R2-3 — kartu Classroom di Home terkunci Coming Soon, tanpa onclick navigasi.
 *   4. R2-4 — maskot dirender DI ATAS panel soal di layar kuis (quiz-mascot).
 *   5. R2-5 — urutan popup keyakinan: SETELAH menjawab, popup tampil DULU (pembahasan
 *      belum tercat, tombol Lanjut masih mati); baru setelah popup dijawab/dilewati,
 *      analyzing -> pembahasan berjalan. Analyzing tidak pernah berbagi layar dengan popup.
 *   6. R2-6 — Home: hero "Sesi berikutnya · dipilih Paw"; blok "Selesaikan ritme hari ini"
 *      dan "Rencana kamu" hilang dari Home; rencana + cincin misi pindah ke Peta Belajar.
 */
const fs=require('fs'),path=require('path'),vm=require('vm');
const root=__dirname;
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
const gems=fs.readFileSync(path.join(root,'features/speaking-listening/gems-core.js'),'utf8');
const elements={};
const bodyChildren=[];
function fakeEl(tag){const el={tagName:String(tag||'div').toUpperCase(),id:'',className:'',innerHTML:'',textContent:'',style:{setProperty(){}},disabled:false,onclick:null,children:[],classList:{add(){},remove(){},toggle(){},contains(){return false}},setAttribute(){},appendChild(c){el.children.push(c)},append(){},before(){},remove(){const i=bodyChildren.indexOf(el);if(i>=0)bodyChildren.splice(i,1)},addEventListener(){},querySelector(){return null},querySelectorAll(){return[]},focus(){}};return el}
function element(id){return elements[id] ||= {...fakeEl('div'),id};}
const document={baseURI:'http://localhost/',body:{classList:{add(){},remove(){},toggle(){}},appendChild(el){bodyChildren.push(el)}},getElementById:id=>{
  if(id==='fzRitual'||id==='fzPrasasti'||id==='confidencePop')return bodyChildren.find(e=>e.id===id)||null;
  return element(id);
},querySelector(){return null},querySelectorAll(){return []},createElement:t=>fakeEl(t),addEventListener(){},startViewTransition:undefined};
const store={};
const localStorage={getItem:k=>store[k]||null,setItem:(k,v)=>store[k]=v,removeItem:k=>delete store[k]};
const fetch=async url=>{const raw=String(url);const rel=(raw.includes('://')?raw.slice(raw.indexOf('://')+3).replace(/^[^/]*/,''):raw).replace(/^\.?\//,'').split('?')[0];const file=path.join(root,rel);if(!rel||!fs.existsSync(file))return{ok:false,status:404,json:async()=>({})};return{ok:true,status:200,json:async()=>JSON.parse(fs.readFileSync(file,'utf8'))}};
// Math.random DIBEKUKAN ke konstanta: dua panggilan buildGrammarLessonQuestions menghasilkan
// soal + urutan pilihan yang identik, jadi smoke bisa tahu jawaban benarnya tanpa membongkar
// closure quizLoop. Object.create menjaga Math asli host tidak tersentuh.
const frozenMath=Object.assign(Object.create(Math),{random:()=>0.35});
const ctx={console,self:null,document,localStorage,fetch,location:{href:'http://localhost/'},window:{},Date,Math:frozenMath,URL,setTimeout,clearTimeout,Notification:function(){},matchMedia:()=>({matches:false,addEventListener(){}}) };
ctx.Notification.permission='granted';ctx.Notification.requestPermission=async()=>'granted';
ctx.window=ctx;ctx.self=ctx;ctx.window.scrollTo=()=>{};ctx.window.speechSynthesis={cancel(){},speak(){}};ctx.window.SpeechSynthesisUtterance=function(t){this.text=t};
vm.createContext(ctx);
vm.runInContext(gems,ctx,{filename:'gems-core.js'});
vm.runInContext(app,ctx,{filename:'app.js'});
setTimeout(()=>{
 try{
  const assert=(ok,m)=>{if(!ok)throw new Error(m)};
  const st=ctx.__getFiezelState();
  for(let i=bodyChildren.length-1;i>=0;i--)if(bodyChildren[i].id==='fzRitual')bodyChildren.splice(i,1);
  // Animasi antarmuka dimatikan: showCoreAnalyzing memanggil kelanjutannya langsung,
  // jadi urutan popup -> pembahasan bisa diperiksa sinkron.
  st.preferences={...st.preferences,activeLevel:'A1',levelMode:'manual',motion:false};

  // ---- R2-6: Home ----
  // adaptiveReady dihitung ulang oleh save() dari bukti diagnostik, jadi label hero untuk
  // murid siap-adaptif dijaga di level SUMBER; runtime memeriksa struktur yang berlaku
  // untuk semua keadaan (CTA tunggal + panel ramai hilang).
  assert(/Sesi berikutnya · dipilih Paw/.test(app),'label hero "Sesi berikutnya · dipilih Paw" tidak ada di coach-strip');
  ctx.go('home');
  const homeMarkup=elements.app.innerHTML;
  assert(/coach-strip-go/.test(homeMarkup),'CTA utama hero tidak ada');
  assert(!/mission-panel/.test(homeMarkup),'blok "Selesaikan ritme hari ini" masih di Home');
  // Diperiksa lewat kelas panelnya (judul "Rencana kamu" ikut tersebut di komentar markup).
  assert(!/journey-panel/.test(homeMarkup),'blok "Rencana kamu" masih di Home');
  // ---- R2-3: Classroom terkunci ----
  assert(/classroom-launch is-coming-soon/.test(homeMarkup),'kartu Classroom tidak terkunci Coming Soon');
  assert(!/onclick="go\('classroom'\)"/.test(homeMarkup),'kartu Classroom masih bernavigasi');
  // Rencana + cincin misi pindah ke Peta Belajar (dijaga di level sumber karena modul
  // personal-journey tidak dimuat di harness ini).
  assert(/nextSessionPanelMarkup\(\)\}\$\{journeyMarkup\(\)/.test(app),'journeyMarkup tidak dirender di Peta Belajar → Ringkasan');
  assert(/journey-ring-row/.test(app)&&/mission-ring/.test(app),'cincin misi harian hilang sama sekali');

  // ---- R2-1: chip ujian di puncak Grammar Hub ----
  ctx.go('grammar');
  const hub=elements.app.innerHTML;
  assert(/exam-entry-chip/.test(hub),'chip Ujian Skip Level tidak ada di puncak hub');
  assert(hub.indexOf('exam-entry-chip')<hub.indexOf('lesson-path'),'chip ujian tidak berada di atas jalur');
  assert(/path-node-exam/.test(hub),'node emas di ujung jalur hilang');
  // ---- R2-2: tautan lewati materi, termasuk pada node terkunci ----
  assert(/lesson-skip-link/.test(hub),'tautan "Lewati materi" tidak ada');
  assert(/openLessonSkipGate\('articles_a_an_the'\)/.test(hub),'lesson terkunci (kata sandang) tidak punya gerbang lewati');

  // ---- R2-2 + R2-4 + R2-5: gerbang bukti 5 soal dengan urutan popup baru ----
  const skill='articles_a_an_the';
  // m025-177: gerbang kini MENGACAK 5 soal dari seluruh pool valid lesson (perbaikan audit
  // skip — set deterministik lama bisa dihafal lalu diulang). Math.random beku membuat
  // shuffle tetap deterministik di smoke ini, jadi expected dihitung dari builder gerbang
  // yang sama persis dengan yang dipakai startLessonSkipGate.
  const expected=ctx.buildLessonSkipGateQuestions(skill);
  assert(expected.length===5,'gerbang butuh 5 soal valid');
  const captured=[];
  element('options').append=(...btns)=>{captured.length=0;captured.push(...btns)};
  ctx.startLessonSkipGate(skill);
  for(let i=0;i<5;i++){
    const quizMarkup=elements.app.innerHTML;
    assert(/quiz-mascot/.test(quizMarkup),'maskot tidak dirender di atas panel soal (R2-4)');
    assert(captured.length>=2,'pilihan jawaban tidak tercat');
    const q=expected[i];
    assert(quizMarkup.includes('quiz-shell'),'layar kuis tidak tercat');
    // DOM tiruan tidak mengurai atribut markup, jadi "pembahasan belum tercat" dibaca dari
    // isi #feedback yang dikosongkan per soal — reveal() adalah satu-satunya penulisnya.
    element('feedback').innerHTML='';
    // Jawab benar (indeks dari generator deterministik yang sama).
    captured[q.answerIndex].onclick();
    // m025-180 (audit UI/UX 09-001): gerbang lewati materi adalah MODE UKUR. Popup keyakinan,
    // vonis, dan pembahasan TIDAK BOLEH tampil di tengah tes — bocoran jawaban membuat gerbang
    // 5-soal bisa di-farm. Yang tampil hanya tanda terima netral; pembahasan menunggu di hasil.
    assert(!bodyChildren.some(e=>e.id==='confidencePop'),'popup keyakinan bocor di mode ukur — gerbang harus netral');
    assert(/Tersimpan/.test(element('feedback').innerHTML),'tanda terima netral tidak tampil setelah menjawab');
    assert(!/Jawaban yang paling tepat/.test(element('feedback').innerHTML),'pembahasan bocor di tengah gerbang — urutan mode ukur rusak');
    assert(element('quizNext').disabled===false,'tombol Lanjut tidak hidup setelah jawaban tersimpan');
    const h=st.history[st.history.length-1];
    assert(h&&h.ok===true,'jawaban dari generator deterministik ternyata salah — smoke tidak sinkron');
    element('quizNext').onclick();
  }
  const result=elements.app.innerHTML;
  assert(/Gerbang lewati materi selesai/.test(result),'layar hasil gerbang tidak tampil');
  assert(/ditandai selesai/.test(result),'vonis lulus gerbang tidak diumumkan');
  assert((st.grammar[skill]?.mastery||0)>=60,'mastery lesson tidak diangkat ke ambang unlock');
  assert(st.grammar[skill]?.skippedAt>0,'jejak skippedAt tidak tersimpan');
  // Lesson penerus kata sandang kini terbuka lewat lessonUnlockState yang TIDAK berubah:
  ctx.go('grammar');
  const hub2=elements.app.innerHTML;
  assert(!/openLessonSkipGate\('articles_a_an_the'\)/.test(hub2),'lesson yang sudah lulus gerbang masih menawarkan lewati');

  // ---- R2-5 (kontrak popup keyakinan) kini diperiksa di jalur LATIHAN ----
  // m025-180: mode ukur sengaja bisu, jadi urutan popup->analyzing->pembahasan diuji pada
  // kuis latihan (practiceSkill) — jalur yang memang memakai popup. Dipakai lesson PERTAMA
  // kurikulum (tanpa prasyarat, selalu terbuka); lesson yang lulus gerbang lewati tetap
  // terkunci untuk latihan karena prasyaratnya sendiri belum dipenuhi. Generator sama-sama
  // deterministik di bawah Math.random beku, jadi jawaban benarnya bisa dihitung di muka.
  const practiceSkillId='subject_object_pronouns_and_possessives';
  const practiceExpected=ctx.buildGrammarLessonQuestions(practiceSkillId,25);
  assert(practiceExpected.length===25,'pool latihan lesson pertama kurang dari 25 soal valid');
  element('feedback').innerHTML='';
  ctx.practiceSkill(practiceSkillId);
  assert(String((st.activeSession||{}).type||'')==='grammar','kuis latihan tidak dimulai (practiceSkill menolak)');
  const pq=practiceExpected[0];
  assert(captured.length>=2,'pilihan jawaban latihan tidak tercat');
  captured[pq.answerIndex].onclick();
  assert(bodyChildren.some(e=>e.id==='confidencePop'),'popup keyakinan tidak tampil setelah menjawab (latihan)');
  assert(element('feedback').innerHTML==='','pembahasan tercat sebelum popup keyakinan selesai — urutan R2-5 rusak');
  ctx.setConfidence(2);
  ctx.confidencePopNext();
  assert(element('feedback').innerHTML!=='','pembahasan tidak tercat setelah popup selesai');
  assert(element('quizNext').disabled===false,'tombol Lanjut tidak hidup setelah pembahasan');
  const hp=st.history[st.history.length-1];
  assert(hp&&hp.ok===true,'jawaban latihan dari generator deterministik ternyata salah — smoke tidak sinkron');
  assert(hp.confidence===2,'keyakinan tidak tercatat pada jawaban latihan');

  console.log('R2 SMOKE: PASS');
  process.exit(0);
 }catch(e){console.error('R2 SMOKE FAIL:',e.message);process.exit(1)}
},600);
