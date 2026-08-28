const fs=require('fs'),vm=require('vm'),path=require('path');
const root=__dirname;
const store={};const els={};
function el(id){return els[id]||(els[id]={id,innerHTML:'',textContent:'',classList:{add(){},remove(){},toggle(){}},style:{},append(){},appendChild(){},addEventListener(){},focus(){},onclick:null});}
/* m025-182: `baseURI` WAJIB ada di mock ini.
 *
 * `app.js` load() membaca `const root=document.baseURI` lalu memanggil `new URL(f, root)`.
 * Tanpa baseURI, `root` undefined, `new URL()` MELEMPAR, load() gagal diam-diam, dan SELURUH
 * bank konten (V, R, GRAMMAR_ITEMS) tetap kosong. Akibatnya `contentLevelFor()` mengembalikan
 * string kosong untuk apa pun, `dueItems()` membuang semua materi karena levelnya tidak sama
 * dengan level aktif, dan kartu "Ulangan Pintar" jatuh ke keadaan kosong - gerbang MERAH
 * tanpa ada yang rusak di produk.
 *
 * Kegagalan ini sulit terbaca karena sebagian besar pemeriksaan lain di gerbang ini LULUS:
 * mereka membaca `state.history` langsung dan tidak butuh bank sama sekali. Yang gagal hanya
 * satu-satunya pemeriksaan yang benar-benar bergantung pada bank. */
const document={baseURI:'http://localhost/',getElementById:el,querySelectorAll:()=>[],querySelector:()=>null,createElement:tag=>({tagName:tag, className:'',textContent:'',disabled:false,onclick:null,classList:{add(){},remove(){}},appendChild(){},addEventListener(){}})};
const localStorage={getItem:k=>Object.prototype.hasOwnProperty.call(store,k)?store[k]:null,setItem:(k,v)=>store[k]=String(v),removeItem:k=>delete store[k]};
const context={console,document,localStorage,location:{href:'http://localhost/',},navigator:{serviceWorker:{register:()=>Promise.resolve()}},window:null,/* Nama berkas diambil dari segmen terakhir, sama seperti mock di gerbang lain repo ini
   (mis. adaptive-policy-test.js): bentuk `new URL(url).pathname` menuntut URL absolut dan
   pecah untuk jalur relatif. */
  fetch:async url=>({ok:true,json:async()=>JSON.parse(fs.readFileSync(path.join(root,String(url).split('/').pop()),'utf8'))}),setTimeout,clearTimeout,Date,Math,URL,Error,Promise,SpeechSynthesisUtterance:function(){},speechSynthesis:{cancel(){},speak(){}},confirm:()=>true};
const runtimeVersion=JSON.parse(fs.readFileSync(path.join(root,'VERSION.json'),'utf8')).version;
context.window=context;context.self=context;context.FIEZEL_VERSION=runtimeVersion;context.window.scrollTo=()=>{};context.window.AudioContext=undefined;context.window.webkitAudioContext=undefined;
/* m025-182: skill grammar fixture ini dipindah `present_simple` -> `present_simple_basics`.
 *
 * Bank grammar tumbuh dan skill-nya berganti nama; `present_simple` sudah tidak ada di
 * `grammar-templates.json`. Akibatnya `contentLevelFor('grammar','present_simple')`
 * mengembalikan string kosong, `dueItems()` membuangnya karena levelnya tidak sama dengan
 * level aktif, kartu "Ulangan Pintar" jatuh ke keadaan kosong, dan gerbang ini MERAH di
 * `main` — tanpa ada yang rusak di produk.
 *
 * Yang diuji tidak berubah: satu materi grammar yang JATUH TEMPO pada level aktif murid.
 * `present_simple_basics` adalah A1 (kurikulum lesson A1-003), sama dengan level aktif
 * fixture ini (placementDone:false, tanpa preferensi -> getActiveLevel() = 'A1'), jadi ia
 * benar-benar lolos filter level alih-alih lolos karena filternya dilonggarkan. */
const now=Date.now(),day=86400000;const hist=[];
for(let i=0;i<40;i++){const types=[['grammar','present_simple_basics'],['reading','reading_inference'],['vocab','vocab_00003']];const [type,skill]=types[i%3];hist.push({id:'h'+i,type,skill,target:skill,difficulty:2,ok:i%4!==0,ms:3000+i*100,confidence:(i%3)+1,selectedAnswer:i%4===0?'wrong-option':null,correctAnswer:'right',errorTag:skill,at:now-(39-i)*day});}
for(let i=0;i<5;i++)hist.push({id:'today'+i,type:'grammar',skill:'present_simple_basics',target:'present_simple_basics',difficulty:2,ok:i!==0,ms:4000,confidence:2,selectedAnswer:i===0?'go':'goes',correctAnswer:'goes',errorTag:'subject_verb_agreement',at:now});
const seeded={version:runtimeVersion,userName:'Jahran',view:'progress',level:3,placementDone:false,totalAnswered:hist.length,totalCorrect:hist.filter(x=>x.ok).length,totalTimeMs:200000,history:hist,wrongAnswers:hist.filter(x=>!x.ok),vocab:{vocab_00003:{total:4,correct:2,mastery:50,nextReview:now-day,stability:1,lastSeen:now-3*day,lapses:1}},grammar:{present_simple_basics:{total:8,correct:4,mastery:50,nextReview:now-day,stability:2,lastSeen:now-4*day,lapses:2}},reading:{reading_00001:{total:4,correct:1,mastery:25,nextReview:now-day,stability:1,lastSeen:now-5*day,lapses:2}},daily:{date:'',count:0,attempts:0,meaningful:false},streak:0,adaptiveReady:false,confidenceHistory:hist.map(h=>({confidence:h.confidence,ok:h.ok,at:h.at,skill:h.skill,type:h.type,errorTag:h.errorTag})),learningDays:[],sessionHistory:[]};
localStorage.setItem('fiezel-v4-state',JSON.stringify(seeded));
const code=fs.readFileSync(path.join(root,'app.js'),'utf8');vm.runInNewContext(code,context,{filename:'app.js'});
setTimeout(()=>{
  // m025-85: Peta Belajar is now tabbed (Ringkasan/Analisis/Adaptive Engine/Kesiapan
  // & Skills) instead of one long scroll, so the sections this test checks are spread
  // across tabs rather than all present in a single render. Concatenate every tab's
  // HTML to keep checking the same underlying data/content.
  context.go('progress');
  const html=['overview','analysis','adaptive','readiness'].map(tab=>{context.switchProgressTab(tab);return els.app.innerHTML}).join('\n');
  const checks={
    learningMap:html.includes('Peta Belajar'),timeline:html.includes('Linimasa Kelemahan')&&html.includes(new Date(now).toISOString().slice(0,10)),smartReview:html.includes('Ulangan Pintar')&&html.includes('risiko lupa'),confidence:html.includes('Kalibrasi Keyakinan'),errorPatterns:html.includes('Pola Kesalahan')&&html.includes('Subject verb agreement'),confusionNetwork:html.includes('Jaringan Kekeliruan Kosakata'),readingMap:html.includes('Peta Skill Reading'),diagnostic:html.includes('Laporan Diagnostik'),creator:html.includes('instagram.svg')&&html.includes('@fitrarustqi'),
    adaptiveReady:context.__getFiezelState().adaptiveReady===true,meaningfulStreak:context.__getFiezelState().streak>=1,reviewDue:context.__getFiezelState().grammar.present_simple_basics.nextReview<=Date.now()&&context.__getFiezelState().grammar.present_simple_basics.mastery<80
  };
  console.log(JSON.stringify({checks,state:{adaptiveReady:context.__getFiezelState().adaptiveReady,streak:context.__getFiezelState().streak,daily:context.__getFiezelState().daily},snippet:html.slice(html.indexOf('Pola Kesalahan'),html.indexOf('Jaringan Kekeliruan Kosakata'))},null,2));
  process.exit(Object.values(checks).every(Boolean)?0:1);
},1000);
