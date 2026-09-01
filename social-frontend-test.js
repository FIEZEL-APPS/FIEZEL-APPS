/**
 * FIEZEL gerbang — social-frontend-test.js · lapisan online/sosial frontend (SLOT 7).
 *
 * Dua bagian, pola p1-game-layer-smoke-test.js (vm + DOM tiruan, tanpa jaringan nyata):
 *   BAGIAN A — modul inti features/social/fiezel-social.js hermetis:
 *     validasi handle (aturan 3–20 a-z0-9_ + blocklist), hari/pekan WIB, hitung mundur
 *     liga, label enum Indonesia, dan OUTBOX offline-first: antre (jti uuid, enum
 *     disaring, count di-clamp), flush ack=buang, 5xx/offline=simpan (jti SAMA saat
 *     retry), 400=buang racun, dan flag sosial fail-closed.
 *   BAGIAN B — app.js utuh di vm: view 'online' terdaftar, degradasi anggun saat flag
 *     server MATI ("fitur online belum aktif") dan saat OFFLINE ("kamu sedang offline"),
 *     kartu ringkas di Peta Belajar → Ringkasan, pintu masuk Pengaturan, dan
 *     queueSocialEvidence yang meng-antre bukti tanpa pernah melempar.
 */
const fs=require('fs'),path=require('path'),vm=require('vm');
const root=__dirname;
const socialSrc=fs.readFileSync(path.join(root,'features/social/fiezel-social.js'),'utf8');
let pass=0;const assert=(ok,m)=>{if(!ok){console.error('SOCIAL FRONTEND FAIL:',m);process.exit(1)}pass++};

/* ================================ BAGIAN A — modul inti ================================ */
function freshCore(opts={}){
  const store={};
  // Mock fetch LOKAL (pola no-network-test: nol jaringan nyata di gerbang mana pun) —
  // setiap konteks vm menerima mock ini atau mock milik kasus ujinya sendiri.
  const fetchMock=opts.fetch||(async()=>({ok:false,status:503,json:async()=>({})}));
  const MockDate = class extends Date {
    constructor(...args) {
      if (args.length === 0 && opts.now !== undefined) super(opts.now);
      else super(...args);
    }
    static now() {
      return opts.now !== undefined ? opts.now : Date.now();
    }
  };
  const ctx={
    console,Date:MockDate,Math,JSON,Object,Array,Number,String,Promise,isFinite,parseInt,parseFloat,
    setTimeout,clearTimeout,
    localStorage:{getItem:k=>store[k]??null,setItem:(k,v)=>{store[k]=String(v)},removeItem:k=>{delete store[k]}},
    navigator:{onLine:opts.onLine!==false},
    FIEZEL_CF_CONFIG:opts.base===undefined?{base:'https://api.test'}:{base:opts.base},
    fetch:fetchMock,
    addEventListener(){},document:{addEventListener(){},visibilityState:'visible'}
  };
  ctx.self=ctx;ctx.crypto={randomUUID:()=>'11111111-2222-4333-8444-'+String(Date.now()).slice(-12).padStart(12,'0')};
  vm.createContext(ctx);
  vm.runInContext(socialSrc,ctx,{filename:'fiezel-social.js'});
  return {core:ctx.FiezelSocial,ctx,store};
}
(async()=>{
 // ---- validasi handle: cermin aturan server, alasan berbahasa manusia
 const {core}=freshCore();
 assert(core.validateHandle('belajar_terus').ok===true,'handle sah ditolak');
 assert(core.validateHandle('Belajar_Terus').handle==='belajar_terus','input tidak di-lowercase');
 assert(core.validateHandle('ab').ok===false&&/minimal 3/i.test(core.validateHandle('ab').reason),'handle <3 lolos / alasan tidak jelas');
 assert(core.validateHandle('a'.repeat(21)).ok===false,'handle >20 lolos');
 assert(core.validateHandle('9abc').ok===false,'awalan angka lolos');
 assert(core.validateHandle('a__b').ok===false,'garis bawah ganda lolos');
 assert(core.validateHandle('abc_').ok===false,'akhiran _ lolos');
 assert(core.validateHandle('a123456b').ok===false,'deret 6 digit (pola nomor HP) lolos');
 assert(core.validateHandle('fiezel_official').ok===false,'peniruan brand lolos');
 assert(core.validateHandle('nama.titik').ok===false,'karakter di luar a-z0-9_ lolos');
 // ---- hari & pekan WIB + hitung mundur liga (Senin 00:00 WIB)
 const t=Date.UTC(2026,7,28,18,0,0); // Jumat 28 Agu 18:00 UTC = Sabtu 29 Agu 01:00 WIB
 assert(core.wibDay(t)==='2026-08-29','wibDay salah: '+core.wibDay(t));
 assert(core.wibWeekMonday(t)==='2026-08-24','wibWeekMonday salah: '+core.wibWeekMonday(t));
 const cd=core.leagueCountdown(t);
 assert(cd.days===1&&cd.hours===23&&/hari/.test(cd.label),'hitung mundur liga salah: '+JSON.stringify(cd));
 assert(core.leagueCountdown(Date.UTC(2026,7,30,16,59,59)).ms===1000,'sedetik sebelum Senin 00:00 WIB harus 1000 ms: '+core.leagueCountdown(Date.UTC(2026,7,30,16,59,59)).ms);
 assert(core.leagueCountdown(Date.UTC(2026,7,30,17,0,0)).ms===7*86400000,'tepat Senin 00:00 WIB = pekan baru mulai, mundurnya 7 hari penuh');
 // ---- enum → label Indonesia
 assert(core.STICKERS.length===6&&['clap','fire','gem','target','sunrise','finish'].every(id=>core.stickerMeta(id)),'enum stiker tidak lengkap');
 assert(core.presenceLabel({visible:true,studiedToday:true}).indexOf('Belajar hari ini')===0,'label presence belajar-hari-ini salah');
 assert(core.presenceLabel({visible:true,studiedToday:false})==='Belum belajar hari ini','label presence belum-belajar salah');
 assert(core.presenceLabel({visible:false})==='Progresnya disembunyikan','label presence tersembunyi salah');
 assert(core.milestoneLabel('exam_passed')==='Lulus ujian level','label milestone salah');
 assert(/belum aktif/i.test(core.errorCopy('social_disabled')),'naskah social_disabled tidak jujur');
 assert(/offline/i.test(core.errorCopy('offline')),'naskah offline salah');
 // ---- outbox: antre = enum disaring, count di-clamp, jti uuid, day WIB
 const q=freshCore({now:t});
 const entry=q.core.queueEvidence([
   {kind:'meaningful_day'},{kind:'srs_review',count:99},{kind:'exam_passed',band:'B1'},
   {kind:'hack_pb',count:1},{kind:'lesson_mastered',band:'Z9'}
 ],t);
 assert(entry&&entry.day==='2026-08-29','day antrean bukan hari WIB sesi');
 assert(/^[A-Za-z0-9_-]{8,64}$/.test(entry.jti),'jti di luar kontrak server');
 assert(entry.events.length===4,'kind di luar enum tidak disaring: '+JSON.stringify(entry.events));
 assert(entry.events[1].count===20,'count tidak di-clamp ke 20');
 assert(entry.events[2].band==='B1'&&entry.events[3].band===undefined,'band tidak divalidasi');
 assert(q.core.outboxPending()===1,'antrean tidak tersimpan');
 assert(q.core.queueEvidence([{kind:'bukan_enum'}],t)===null,'batch tanpa event sah ikut antre');
 assert(q.store[q.core._outboxKey].indexOf(entry.jti)>=0,'jti tidak disimpan bersama item (retry tidak idempoten)');
 // ---- flush: 5xx/putus = SIMPAN dengan jti sama; ack = buang; 400 = buang racun
 let calls=[];
 q.ctx.fetch=async(url,opts)=>{calls.push({url:String(url),body:opts&&opts.body?JSON.parse(opts.body):null});return {ok:false,status:503,json:async()=>({error:'unavailable'})}};
 let r=await q.core.flushOutbox(t);
 assert(r.sent===0&&q.core.outboxPending()===1,'batch hilang padahal server 5xx');
 q.ctx.fetch=async(url,opts)=>{calls.push({url:String(url),body:opts&&opts.body?JSON.parse(opts.body):null});return {ok:true,status:200,json:async()=>({accepted:2,pbWeek:12,week:'2026-08-24'})}};
 r=await q.core.flushOutbox(t);
 assert(r.sent===1&&q.core.outboxPending()===0,'ack server tidak membuang item');
 const evidenceCalls=calls.filter(c=>c.url.indexOf('/api/social/rank/evidence')>=0);
 assert(evidenceCalls.length===2&&evidenceCalls[0].body.jti===evidenceCalls[1].body.jti,'retry memakai jti berbeda - replay guard server jadi sia-sia');
 assert(evidenceCalls[1].body.day==='2026-08-29'&&Array.isArray(evidenceCalls[1].body.events),'payload evidence tidak sesuai kontrak');
 r=await q.core.flushOutbox(t);
 assert(r.sent===0&&q.core.outboxPending()===0,'flush antrean kosong tidak boleh mengirim apa pun');
 q.core.queueEvidence([{kind:'meaningful_day'}],t);
 q.ctx.fetch=async()=>({ok:false,status:400,json:async()=>({error:'schema_invalid'})});
 await q.core.flushOutbox(t);
 assert(q.core.outboxPending()===0,'batch beracun (400) menyumbat antrean');
 // ---- offline: flush menolak halus, antrean utuh
 const off=freshCore({now:t,onLine:false,fetch:async()=>{throw new Error('tidak boleh ada jaringan saat offline')}});
 off.core.queueEvidence([{kind:'daily_target'}],t);
 r=await off.core.flushOutbox(t);
 assert(r.reason==='offline'&&off.core.outboxPending()===1,'flush offline tidak menyimpan antrean');
 // ---- item kedaluwarsa (>3 hari) dibuang saat antre berikutnya
 const old=freshCore({now:t});
 old.core.queueEvidence([{kind:'meaningful_day'}],t-4*86400000);
 old.core.queueEvidence([{kind:'daily_target'}],t);
 assert(JSON.parse(old.store[old.core._outboxKey]).length===1,'bukti kedaluwarsa (pasti hangus di server) tidak dibuang');
 // ---- flag sosial: fail-closed di semua arah
 const on=freshCore({fetch:async()=>({ok:true,status:200,json:async()=>({protocol:'1.7',flags:{cfSocialEnabled:true}})})});
 assert(await on.core.probeFlag(true)==='on','flag true tidak terbaca on');
 const offFlag=freshCore({fetch:async()=>({ok:true,status:200,json:async()=>({flags:{cfSocialEnabled:'true'}})})});
 assert(await offFlag.core.probeFlag(true)==='off','flag ambigu (string) harus MATI, bukan hidup');
 const noBase=freshCore({base:''});
 assert(await noBase.core.probeFlag(true)==='off','tanpa base harus off');
 const err=freshCore({fetch:async()=>{throw new Error('down')}});
 assert(await err.core.probeFlag(true)==='off','server tumbang harus off (fail-closed)');
 const offNet=freshCore({onLine:false});
 assert(await offNet.core.probeFlag(true)==='offline','offline harus dilaporkan offline, bukan off');
 // ---- klien API: galat dibaca dari data.error + naskah ramah
 const apiC=freshCore({fetch:async(url)=>String(url).indexOf('/profile/me')>=0?({ok:false,status:404,json:async()=>({error:'profile_required'})}):({ok:true,status:200,json:async()=>({})})});
 const me=await apiC.core.api.profileMe();
 assert(me.ok===false&&me.error==='profile_required'&&/profil/i.test(me.message),'galat profile_required tidak diterjemahkan');
 const rl=freshCore({fetch:async()=>({ok:false,status:429,json:async()=>({error:'rate_limited',retryAfter:120})})});
 const cheer=await rl.core.api.cheer('abc','clap');
 assert(cheer.error==='rate_limited'&&/menit/.test(cheer.message),'429 tidak disampaikan dengan ramah');

 /* ============================== BAGIAN B — app.js utuh ============================== */
 const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
 const gems=fs.readFileSync(path.join(root,'features/speaking-listening/gems-core.js'),'utf8');
 const prasasti=fs.readFileSync(path.join(root,'features/prasasti/fiezel-prasasti-core.js'),'utf8');
 function bootApp(net){
  const elements={};const bodyChildren=[];
  function fakeEl(tag){const el={tagName:String(tag||'div').toUpperCase(),id:'',className:'',innerHTML:'',textContent:'',style:{setProperty(){}},disabled:false,onclick:null,children:[],classList:{add(){},remove(){},toggle(){},contains:()=>false},setAttribute(){},appendChild(c){el.children.push(c)},append(){},remove(){const i=bodyChildren.indexOf(el);if(i>=0)bodyChildren.splice(i,1)},addEventListener(){},querySelector(){return null},focus(){}};return el}
  const element=id=>elements[id]||=({...fakeEl('div'),id});
  const document={baseURI:'http://localhost/',visibilityState:'visible',body:{classList:{add(){},remove(){},toggle(){}},appendChild(el){bodyChildren.push(el)}},getElementById:id=>element(id),querySelector(){return null},querySelectorAll(){return []},createElement:t=>fakeEl(t),addEventListener(){},startViewTransition:undefined};
  const store={};
  const localStorage={getItem:k=>store[k]??null,setItem:(k,v)=>store[k]=String(v),removeItem:k=>delete store[k]};
  const fetch=async(url,opts)=>{
    const raw=String(url);
    if(raw.indexOf('https://api.test')===0){
      net.calls.push({url:raw,body:opts&&opts.body?JSON.parse(opts.body):null});
      return net.handler(raw,opts);
    }
    const rel=(raw.includes('://')?raw.slice(raw.indexOf('://')+3).replace(/^[^/]*/,''):raw).replace(/^\.?\//,'').split('?')[0];
    const file=path.join(root,rel);
    if(!rel||!fs.existsSync(file))return {ok:false,status:404,json:async()=>({})};
    return {ok:true,status:200,json:async()=>JSON.parse(fs.readFileSync(file,'utf8'))};
  };
  const ctx={console,self:null,document,localStorage,fetch,location:{href:'http://localhost/',search:''},window:{},Date,Math,URL,URLSearchParams,setTimeout,clearTimeout,Notification:function(){},matchMedia:()=>({matches:false,addEventListener(){}}),navigator:{onLine:net.onLine!==false},addEventListener(){}};
  ctx.Notification.permission='granted';ctx.Notification.requestPermission=async()=>'granted';
  ctx.window=ctx;ctx.self=ctx;ctx.window.scrollTo=()=>{};ctx.window.speechSynthesis={cancel(){},speak(){}};ctx.window.SpeechSynthesisUtterance=function(t){this.text=t};
  ctx.FIEZEL_CF_CONFIG={base:'https://api.test'};
  vm.createContext(ctx);
  // Pola W1-TESTPLAN 2b (sama dengan regression-test.js/settings-cache-test.js): app.js kini
  // memanggil FiezelI18n.t(...) untuk naskah yang PINDAH ke copy-map (Wave i18n #242), jadi
  // runtime i18n + seluruh copy-id dimuat ke vm SEBELUM app.js — meniru urutan <script defer>
  // index.html. Kalau berkasnya belum ada, harness kosong = perilaku lama.
  const i18nDir=path.join(root,'features/i18n');
  const i18nRuntimePath=path.join(i18nDir,'fiezel-i18n.js');
  if(fs.existsSync(i18nRuntimePath)){
    vm.runInContext(fs.readFileSync(i18nRuntimePath,'utf8'),ctx,{filename:'fiezel-i18n.js'});
    for(const f of fs.readdirSync(i18nDir).filter(f=>/^copy-id-.*\.js$/.test(f)).sort())
      vm.runInContext(fs.readFileSync(path.join(i18nDir,f),'utf8'),ctx,{filename:f});
  }
  vm.runInContext(gems,ctx,{filename:'gems-core.js'});
  vm.runInContext(prasasti,ctx,{filename:'fiezel-prasasti-core.js'});
  vm.runInContext(socialSrc,ctx,{filename:'fiezel-social.js'});
  vm.runInContext(app,ctx,{filename:'app.js'});
  return {ctx,elements,store};
 }
 const sleep=ms=>new Promise(r=>setTimeout(r,ms));
 // ---- B1: flag server MATI → view online tetap berdiri dengan kartu jujur, nol lemparan
 const netOff={onLine:true,calls:[],handler:async(url)=>{
   if(url.indexOf('/api/config')>=0)return {ok:true,status:200,json:async()=>({protocol:'1.7',flags:{cfSocialEnabled:false}})};
   return {ok:false,status:403,json:async()=>({error:'social_disabled'})};
 }};
 const b1=bootApp(netOff);
 await sleep(700); // boot + ritual selesai dulu
 assert(b1.ctx.__fiezelValidViews().includes('online'),"view 'online' tidak terdaftar di VALID_VIEWS");
 assert(b1.ctx.go('online')===true,"go('online') gagal");
 await sleep(120);
 const appHtml1=b1.elements.app.innerHTML+b1.elements.onlineRoot.innerHTML;
 assert(/Online & Teman|Online &amp; Teman/.test(appHtml1),'judul view online tidak dirender');
 assert(/Fitur online belum aktif/.test(b1.elements.onlineRoot.innerHTML),'flag mati tidak menghasilkan kartu "fitur online belum aktif"');
 assert(!/error_system/.test(b1.elements.onlineRoot.innerHTML),'flag mati diperlakukan sebagai error sistem');
 // navigasi keluar-masuk tetap hidup setelah flag mati (aplikasi tidak patah)
 assert(b1.ctx.go('home')===true&&b1.ctx.go('progress')===true,'navigasi patah setelah flag mati');
 assert(/socialSummaryCard/.test(b1.elements.app.innerHTML),'kartu ringkas Online & Teman tidak ada di Peta Belajar → Ringkasan');
 await sleep(120);
 assert(/belum aktif/i.test(b1.elements.socialSummaryCard.innerHTML),'kartu ringkas tidak jujur saat flag mati');
 // pintu masuk Pengaturan + sakelar Mode Privat papan
 b1.ctx.openSettings();
 const settingsHtml=b1.elements.modalPanel.innerHTML;
 assert(/Profil Online/.test(settingsHtml)&&/openOnlineView\(\)/.test(settingsHtml),'pintu masuk Profil Online tidak ada di Pengaturan');
 assert(/Mode privat papan/.test(settingsHtml)&&/settingBoardHidden/.test(settingsHtml),'sakelar opt-out papan tidak ada di Pengaturan');
 assert(/seketika/.test(settingsHtml),'naskah opt-out tidak menjanjikan efek seketika (kontrak spec §4.3)');
 b1.ctx.closeModal();
 // ---- B2: OFFLINE → kartu "kamu sedang offline", nol permintaan sosial
 const netDown={onLine:false,calls:[],handler:async()=>{throw new Error('offline: tidak boleh ada permintaan')}};
 const b2=bootApp(netDown);
 await sleep(700);
 b2.ctx.go('online');
 await sleep(120);
 assert(/offline/i.test(b2.elements.onlineRoot.innerHTML),'offline tidak menghasilkan kartu "kamu sedang offline"');
 assert(netDown.calls.length===0,'ada permintaan sosial padahal offline');
 // ---- B3: queueSocialEvidence — antre tanpa melempar, bukti hari bermakna ikut
 const st=b2.ctx.__getFiezelState();
 st.daily={date:'2026-08-29',attempts:5,count:5,meaningful:true};
 const queued=b2.ctx.queueSocialEvidence([{kind:'exam_passed',band:'B1'}]);
 assert(queued&&queued.events.some(e=>e.kind==='meaningful_day')&&queued.events.some(e=>e.kind==='exam_passed'),'bukti sesi tidak di-antre: '+JSON.stringify(queued));
 assert(b2.ctx.FiezelSocial.outboxPending()===1,'outbox tidak menyimpan batch saat offline');
 assert(b2.ctx.queueSocialEvidence()!==undefined,'queueSocialEvidence tanpa event ekstra melempar');
 // ---- B4: kait finishQuiz & gemsHook benar-benar terpasang di sumber
 assert(/anSessionEnded\(session\);\/\*A1-EMIT\*\/[\s\S]{0,400}queueSocialEvidence\(/.test(app),'kait bukti finishQuiz tidak terpasang setelah sesi tercatat');
 assert(/pawReact\('reward',\{kind:'gems'\}\);[\s\S]{0,300}queueSocialEvidence\(\)/.test(app),'kait bukti gemsHook (momen gem Skills Lab) tidak terpasang');
 assert(/addEventListener&&root\.addEventListener\('online',function\(\)\{flushOutbox\(\)\}\)/.test(socialSrc),'flush saat kembali online tidak terpasang di modul');
 assert(/visibilitychange/.test(socialSrc),'flush saat visibilitychange tidak terpasang di modul');
 // ---- B5: SW shell membawa modul sosial + build naik serempak
 const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
 assert(sw.indexOf("'./features/social/fiezel-social.js'")>=0,'modul sosial tidak masuk ASSETS sw.js');
 const swRev=/const SW_REV='([^']+)'/.exec(sw)[1];
 const pageBuild=/FIEZEL_PAGE_BUILD='([^']+)'/.exec(fs.readFileSync(path.join(root,'core-config.js'),'utf8'))[1];
 const diagBuild=/DIAG_BUILD = '([^']+)'/.exec(fs.readFileSync(path.join(root,'features/neural-voice/fiezel-diag-panel.js'),'utf8'))[1];
 assert(pageBuild===diagBuild&&swRev.indexOf(diagBuild+'-')===0,'SW_REV / DIAG_BUILD / FIEZEL_PAGE_BUILD tidak naik serempak');

 console.log('SOCIAL FRONTEND: PASS ('+pass+' pemeriksaan)');
 process.exit(0);
})().catch(e=>{console.error('SOCIAL FRONTEND FAIL:',e&&e.stack||e);process.exit(1)});
