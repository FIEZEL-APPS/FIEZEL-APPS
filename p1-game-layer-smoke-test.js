/**
 * FIEZEL gerbang — p1-game-layer-smoke-test.js · smoke runtime tiga fitur P1 (audit §14).
 *
 * Menjalankan app.js yang ASLI di vm dengan DOM tiruan seukuran kebutuhan (pola
 * regression-test.js), lalu memeriksa perilaku yang benar-benar tampil:
 *   1. JALUR LESSON BERSIMPUL — go('grammar') merender .lesson-path: node aktif ditandai,
 *      node terkunci disabled + alasan prasyarat, node ujian emas di ujung, tap node =
 *      openGrammarLesson; toggle tampilan daftar tetap tersedia (aksesibilitas P1-1).
 *   2. PRASASTI — bukti (sesi grammar + runtun 7) mengukir tepat 2 lencana, kartu momen
 *      tampil, tersimpan di state, dan TIDAK terukir dua kali.
 *   3. RITUAL PEMBUKA — kunjungan Home pertama hari itu menampilkan kartu rencana dengan
 *      CTA Mulai; kunjungan kedua di hari yang sama TIDAK menampilkannya lagi.
 */
const fs=require('fs'),path=require('path'),vm=require('vm');
const root=__dirname;
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
const prasasti=fs.readFileSync(path.join(root,'features/prasasti/fiezel-prasasti-core.js'),'utf8');
const gems=fs.readFileSync(path.join(root,'features/speaking-listening/gems-core.js'),'utf8');
const grammarRuntime=gm=>{const out={};for(const t of (gm.templates||[])){const opts=t.options||[];const reasons=opts.map((o,i)=>i===t.correctIndex?'Correct':((t.distractors||[]).find(d=>d.option===o)?.whyFails||'Distractor invalid'));(out[t.subskill]??=[]).push([t.stem,opts,t.correctIndex,t.explanation?.rule||t.pedagogicalObjective,reasons,t.cefr]);}return out};
const elements={};
const bodyChildren=[];
function fakeEl(tag){const el={tagName:String(tag||'div').toUpperCase(),id:'',className:'',innerHTML:'',textContent:'',style:{setProperty(){}},disabled:false,onclick:null,children:[],classList:{add(){},remove(){},toggle(){}},setAttribute(){},appendChild(c){el.children.push(c)},append(){},remove(){const i=bodyChildren.indexOf(el);if(i>=0)bodyChildren.splice(i,1)},addEventListener(){},querySelector(){return null},focus(){}};return el}
function element(id){return elements[id] ||= {...fakeEl('div'),id};}
const document={baseURI:'http://localhost/',body:{classList:{add(){},remove(){},toggle(){}},appendChild(el){bodyChildren.push(el)}},getElementById:id=>{
  if(id==='fzRitual'||id==='fzPrasasti')return bodyChildren.find(e=>e.id===id)||null;
  return element(id);
},querySelector(){return null},querySelectorAll(){return []},createElement:t=>fakeEl(t),addEventListener(){},startViewTransition:undefined};
const store={};
const localStorage={getItem:k=>store[k]||null,setItem:(k,v)=>store[k]=v,removeItem:k=>delete store[k]};
const fetch=async url=>{const raw=String(url);const rel=(raw.includes('://')?raw.slice(raw.indexOf('://')+3).replace(/^[^/]*/,''):raw).replace(/^\.?\//,'').split('?')[0];const file=path.join(root,rel);if(!rel||!fs.existsSync(file))return{ok:false,status:404,json:async()=>({})};return{ok:true,status:200,json:async()=>JSON.parse(fs.readFileSync(file,'utf8'))}};
const ctx={console,self:null,document,localStorage,fetch,location:{href:'http://localhost/'},window:{},Date,Math,URL,setTimeout,clearTimeout,Notification:function(){},matchMedia:()=>({matches:false,addEventListener(){}}) };
ctx.Notification.permission='granted';ctx.Notification.requestPermission=async()=>'granted';
ctx.window=ctx;ctx.self=ctx;ctx.window.scrollTo=()=>{};ctx.window.speechSynthesis={cancel(){},speak(){}};ctx.window.SpeechSynthesisUtterance=function(t){this.text=t};
vm.createContext(ctx);
// AI-20 F06 (W1-TESTPLAN 2b): harness i18n KONDISIONAL — index.html memuat fiezel-i18n.js +
// copy-id-*.js SEBELUM modul fitur dan app.js. Begitu naskah ritual/home (mis. 'RENCANA HARI
// INI') pindah ke copy-map, render memanggil FiezelI18n.t(); tanpa preload ini vm meledak.
// existsSync = hijau dua arah. Asersi teks id di bawah TETAP byte-identik (id-golden-snapshot).
const i18nDir=path.join(root,'features','i18n');
if(fs.existsSync(path.join(i18nDir,'fiezel-i18n.js'))){
  vm.runInContext(fs.readFileSync(path.join(i18nDir,'fiezel-i18n.js'),'utf8'),ctx,{filename:'fiezel-i18n.js'});
  for(const f of fs.readdirSync(i18nDir).filter(n=>/^copy-id-.*\.js$/.test(n)).sort())
    vm.runInContext(fs.readFileSync(path.join(i18nDir,f),'utf8'),ctx,{filename:f});
}
vm.runInContext(gems,ctx,{filename:'gems-core.js'});
vm.runInContext(prasasti,ctx,{filename:'fiezel-prasasti-core.js'});
vm.runInContext(app,ctx,{filename:'app.js'});
setTimeout(()=>{
 try{
  const assert=(ok,m)=>{if(!ok)throw new Error(m)};
  const st=ctx.__getFiezelState();
  // Boot Home sudah memicu ritual harian (perilaku yang benar) — tutup dulu supaya
  // pemeriksaan prasasti dan ritual di bawah berjalan dari keadaan bersih.
  ctx.dismissDailyRitual();
  // remove() dijadwalkan 280ms oleh animasi pamit — bersihkan langsung untuk smoke.
  for(let i=bodyChildren.length-1;i>=0;i--)if(bodyChildren[i].id==='fzRitual')bodyChildren.splice(i,1);
  // 1) JALUR: grammar hub renders the node path
  ctx.go('grammar');
  const hub=elements.app.innerHTML;
  assert(/lesson-path/.test(hub),'lesson-path tidak dirender');
  assert(/path-step is-available is-current|is-current/.test(hub),'node aktif tidak ditandai');
  assert(/path-node-exam/.test(hub),'node ujian emas tidak ada');
  assert(/disabled aria-disabled="true"/.test(hub),'node terkunci tidak disabled');
  assert(/lesson-lock-note/.test(hub),'alasan prasyarat tidak tampil');
  assert(/openGrammarLesson\('/.test(hub),'tap node tidak membuka lesson');
  // toggle daftar
  ctx.toggleGrammarHubView();
  assert(/grammar-grid/.test(elements.app.innerHTML),'tampilan daftar tidak tersedia');
  ctx.toggleGrammarHubView();
  // 2) PRASASTI: settle from evidence
  st.streak=7;
  st.sessionHistory.push({at:Date.now(),type:'grammar',score:20,total:25,accuracy:80});
  const fresh=ctx.checkPrasasti('smoke');
  assert(fresh.length===2,'harus 2 prasasti (lesson pertama + runtun 7), dapat: '+fresh.map(b=>b.id));
  assert(bodyChildren.some(e=>e.id==='fzPrasasti'),'kartu momen prasasti tidak tampil');
  assert(st.prasasti.earned.lesson_pertama>0&&st.prasasti.earned.runtun_7>0,'prasasti tidak tersimpan di state');
  const again=ctx.checkPrasasti('smoke');
  assert(again.length===0,'prasasti terukir dua kali');
  ctx.dismissPrasastiMoment();
  // gallery in progress view
  ctx.go('progress');
  assert(/prasasti-grid/.test(elements.app.innerHTML)&&/is-earned/.test(elements.app.innerHTML)&&/is-locked/.test(elements.app.innerHTML),'galeri prasasti tidak tampil di Peta Belajar');
  // 3) RITUAL: first home visit of the day
  st.ritualMeta={lastDay:''};
  ctx.go('home');
  const shown=ctx.maybeShowDailyRitual();
  assert(shown===true,'ritual tidak tampil pada kunjungan pertama');
  const ritual=bodyChildren.find(e=>e.id==='fzRitual');
  assert(ritual&&/RENCANA HARI INI/.test(ritual.innerHTML),'kartu ritual tanpa rencana');
  assert(/startFromRitual\(\)/.test(ritual.innerHTML),'CTA Mulai tidak ada');
  const secondTime=ctx.maybeShowDailyRitual();
  assert(secondTime===false,'ritual tampil dua kali di hari yang sama');
  ctx.dismissDailyRitual();
  assert(st.ritualMeta&&st.ritualMeta.lastDay,'ritualMeta.lastDay tidak tersimpan');
  console.log('P1 SMOKE: PASS');
  process.exit(0);
 }catch(e){console.error('P1 SMOKE FAIL:',e.message);process.exit(1)}
},600);
