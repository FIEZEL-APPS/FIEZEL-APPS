const __fzRoot = require('path').join(__dirname, '..'); /* m025-254: berkas ini pindah dari root ke tests/. __dirname dulu BERARTI root repo, dan puluhan gerbang memakainya untuk menunjuk berkas produksi - alias ini menjaga makna itu tetap benar tanpa menyunting setiap pemakaian. */
const fs=require('fs'),path=require('path'),vm=require('vm');
const root=__fzRoot,app=fs.readFileSync(path.join(root,'app.js'),'utf8'),html=fs.readFileSync(path.join(root,'index.html'),'utf8'),css=fs.readFileSync(path.join(root,'style.css'),'utf8');
const assert=(ok,msg)=>{if(!ok)throw new Error(msg)},elements={},store={};
function element(id){return elements[id]||=({id,innerHTML:'',textContent:'',onclick:null,onkeydown:null,disabled:false,classList:{add(){},remove(){},toggle(){}},addEventListener(){},append(){},focus(){}})}
const document={baseURI:'http://localhost/',getElementById:element,querySelector(){return null},querySelectorAll(){return[]},createElement(){return{className:'',textContent:'',disabled:false,onclick:null,classList:{add(){},remove(){},toggle(){}},append(){},addEventListener(){}}}};
const localStorage={getItem:k=>store[k]||null,setItem:(k,v)=>store[k]=String(v),removeItem:k=>delete store[k]};const Notification=function(title,options){this.title=title;this.options=options;this.close=()=>{}};Notification.permission='granted';Notification.requestPermission=async()=>Notification.permission;
const fetch=async url=>{if(String(url).includes('/health'))return{ok:true,json:async()=>({status:'ok',protocol:'1.7'})};const file=String(url).split('/').pop();return{ok:true,json:async()=>JSON.parse(fs.readFileSync(path.join(root,file),'utf8'))}};
const context={console,Notification,document,localStorage,fetch,window:null,self:null,Date,Math,URL,Error,Promise,setTimeout,clearTimeout,SpeechSynthesisUtterance:function(){},speechSynthesis:{cancel(){},speak(){}}};
context.window=context;context.self=context;context.FIEZEL_VERSION=JSON.parse(fs.readFileSync(path.join(root,'VERSION.json'),'utf8')).version;context.FIEZEL_CORE_CONFIG={workerUrl:'https://fiezel-core-test.puter.work',protocolVersion:'1.7',aiGateway:'core-only',remotePushRequired:true};context.window.scrollTo=()=>{};
vm.createContext(context);
// HARNESS i18n kondisional (AI-20 F06 kategori 2b): meniru urutan <script defer> index.html —
// fiezel-i18n.js lalu copy-id-*.js dimuat SEBELUM app.js, supaya app.js hasil ekstraksi copy
// (yang memanggil FiezelI18n.t) tetap bisa boot di vm ini. existsSync = hijau dua arah:
// tanpa berkas i18n, perilaku tes identik dengan sebelumnya. Asersi teks id di bawah TIDAK
// diubah satu byte pun — keluaran id wajib tetap byte-identik (dijaga id-golden-snapshot).
const i18nRuntime=path.join(root,'features','i18n','fiezel-i18n.js');
if(fs.existsSync(i18nRuntime)){
  vm.runInContext(fs.readFileSync(i18nRuntime,'utf8'),context,{filename:'features/i18n/fiezel-i18n.js'});
  for(const name of fs.readdirSync(path.join(root,'features','i18n')).filter(n=>/^copy-id-.*\.js$/.test(n)).sort()){
    vm.runInContext(fs.readFileSync(path.join(root,'features','i18n',name),'utf8'),context,{filename:'features/i18n/'+name});
  }
}
vm.runInContext(app,context,{filename:'app.js'});
const response=text=>({ok:true,status:200,json:async()=>({text,model:'gpt-5.4-nano',via:'fiezel-core-worker',protocol:'1.7'})});
setTimeout(async()=>{try{
  assert(html.indexOf('https://js.puter.com/v2/')>=0&&html.indexOf('https://js.puter.com/v2/')<html.indexOf('./version.js'),'Puter.js script order is invalid');
  assert(html.indexOf('./core-config.js')>0&&html.indexOf('./core-config.js')<html.indexOf('./app.js'),'Core config script order is invalid');
  assert(css.includes('.ai-btn')&&css.includes('@keyframes aiBounce'),'AI styles are missing');
  let prompt='',requestPayload=null,coachPayload=null;context.puter={workers:{exec:async(url,opts)=>{const body=JSON.parse(opts.body||'{}');prompt=body.prompt||'';requestPayload=body;if(String(url).includes('/api/coach/context'))coachPayload=body;return response(String(url).includes('/api/coach/context')?'Coach aman.':'Jawaban AI aman.')}}};
  assert(await context.askFiezelAI('uji')==='Jawaban AI aman.','Core worker response is not supported');
  assert(prompt==='uji'&&requestPayload?.task==='question'&&requestPayload?.profile?.goalProfile==='general'&&requestPayload?.profile?.timeZone,'AI prompt/profile contract was not sent to Core Brain');
  context.openAILoading=()=>0; context.renderCoachResult=text=>{elements.coachCapture={text}}; await context.askCoachAI(); assert(elements.coachCapture?.text==='Coach aman.','Context-Aware AI Coach did not use dedicated Core endpoint');
  assert(coachPayload?.profile?.goalProfile==='general'&&coachPayload?.profile?.timeZone,'Context Coach profile contract missing');
  assert(!app.includes('puter.ai.chat('),'client still contains a direct Puter AI bypass');
  assert(app.includes("CORE_AI_GATEWAY!=='core-only'"),'core-only AI policy gate missing');
  context.renderAIResult('<img src=x>','<script>alert(1)</script>\nAman');
  assert(!elements.modalPanel.innerHTML.includes('<script>')&&elements.modalPanel.innerHTML.includes('&lt;script&gt;')&&/diproses oleh Core AI/.test(elements.modalPanel.innerHTML),'AI result can inject HTML or omits privacy disclosure');
  // m025-93 (brief redesign Bab 2, bug kritis #1): teks model datang dalam Markdown dan dulu
  // dicetak apa adanya - murid membaca "**tebal**" sebagai tanda baca. Yang dijaga di sini
  // bukan hanya bahwa penandanya diterjemahkan, melainkan URUTANNYA: esc() dulu, baru penanda
  // jadi tag. Pemeriksaan XSS di atas dan yang di bawah memakai jalur yang sama persis, jadi
  // membalik urutan itu akan langsung terlihat sebagai lubang, bukan sebagai gaya tulisan.
  context.renderAIResult('Uji',['**tebal** dan *miring*','- butir satu','- butir dua','','1. urut satu'].join(String.fromCharCode(10)));
  const md=elements.modalPanel.innerHTML;
  assert(md.includes('<strong>tebal</strong>'),'markdown tebal masih dicetak sebagai tanda bintang');
  assert(md.includes('<em>miring</em>'),'markdown miring tidak diterjemahkan');
  assert(md.includes('<ul>')&&(md.match(/<li>/g)||[]).length>=3,'daftar markdown masih jadi baris teks bertanda hubung');
  assert(md.includes('<ol>'),'daftar bernomor tidak diterjemahkan');
  assert(!md.includes('**'),'masih ada penanda markdown mentah yang lolos ke layar');
  context.renderAIResult('Uji','**<img src=x onerror=alert(1)>**');
  assert(!elements.modalPanel.innerHTML.includes('<img')&&elements.modalPanel.innerHTML.includes('&lt;img'),
    'markdown tidak boleh membuka jalan bagi markup dari model');
  context.renderAIError('<svg onload=x>',{message:'<img src=x onerror=x>'});
  // A8 menaikkan syaratnya. Dulu yang dijaga: pesan galat provider di-escape sebelum dicetak
  // (karena itu assert lama mencari '&lt;img'). Sekarang pesan provider TIDAK DICETAK SAMA
  // SEKALI - murid membaca kalimat yang ditulis untuknya, dan galat aslinya berhenti di
  // console. Jadi yang dijaga: markup dari provider nggak muncul dalam bentuk apa pun (mentah
  // maupun ter-escape), judulnya tetap di-escape, dan naskah murid tetap ada.
  assert(!elements.modalPanel.innerHTML.includes('<img')&&!elements.modalPanel.innerHTML.includes('&lt;img')
    &&!elements.modalPanel.innerHTML.includes('<svg')&&elements.modalPanel.innerHTML.includes('&lt;svg')
    &&/belum bisa dimuat/.test(elements.modalPanel.innerHTML),'AI error can inject HTML or leaks provider text');
  context.renderAIError('Login',{error:'popup_blocked',msg:'blocked'},()=>{});
  assert(elements.modalPanel.innerHTML.includes('diblokir peramban')&&typeof elements.aiRetry.onclick==='function','structured auth error or retry action is not handled');
  context.puter.workers.exec=async(url,opts)=>{prompt=JSON.parse(opts.body).prompt;return response('Penjelasan kuis aman.')};
  await context.explainWithAI({question:'She ___ daily.',options:['go','goes'],answerIndex:1,difficulty:1,explain:{rule:'Simple present.'}},0);
  assert(prompt.includes('Jawaban siswa: go')&&prompt.includes('Jawaban benar: goes'),'quiz AI prompt lost answer context');
  await context.explainWordWithAI({word:'careful',meaning:'hati-hati',example:'Be careful.',level:'A1'});
  assert(prompt.includes('Kata: "careful"')&&prompt.includes('Contoh yang sudah ada'),'vocabulary AI prompt lost word context');
  assert(prompt.includes('Hindari gaya buku teks')&&prompt.includes('kalimat pendek'),'vocabulary AI prompt lost natural Indonesian style contract');
  let lateResolve;context.puter.workers.exec=()=>new Promise(resolve=>lateResolve=resolve);const late=context.explainWithAI({question:'Late?',options:['No','Yes'],answerIndex:1,difficulty:1,explain:{rule:'Test.'}},0);context.openModal('<p>Modal yang lebih baru</p>');lateResolve(response('Respons lama'));await late;assert(elements.modalPanel.innerHTML.includes('Modal yang lebih baru')&&!elements.modalPanel.innerHTML.includes('Respons lama'),'stale AI response overwrote a newer modal');
  const realSetTimeout=context.setTimeout;context.setTimeout=(fn,ms)=>realSetTimeout(fn,Math.min(ms,5));context.puter.workers.exec=()=>new Promise(()=>{});let timedOut=false;try{await context.askFiezelAI('uji timeout')}catch(e){timedOut=/nggak datang dalam waktu yang wajar/.test(context.aiErrorMessage(e))}finally{context.setTimeout=realSetTimeout}assert(timedOut,'AI request timeout is not enforced');
  context.flashcards('A1');assert(elements.app.innerHTML.includes('id="aiWord"')&&typeof elements.aiWord.onclick==='function','flashcard AI button is not wired');
  context.FIEZEL_CORE_CONFIG.workerUrl='';delete context.puter;let failed=false;try{await context.askFiezelAI('uji gagal')}catch(e){failed=/AI belum siap|Core Brain/.test(e.message)}assert(failed,'missing Core/Puter error is not handled');
  console.log(JSON.stringify({status:'PASS',checks:{scriptOrder:true,coreOnlyGateway:true,serverModelOwnership:true,htmlEscaping:true,structuredAuthError:true,retryAction:true,quizPrompt:true,vocabularyPrompt:true,staleResponseGuard:true,requestTimeout:true,flashcardButton:true,errorFallback:true}},null,2));
}catch(e){console.error('FIEZEL AI integration checks: FAIL\n'+e.stack);process.exitCode=1}},250);
