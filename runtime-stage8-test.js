const fs=require('fs'),vm=require('vm'),path=require('path');
const root=__dirname;
const store={};const els={};
function el(id){return els[id]||(els[id]={id,innerHTML:'',textContent:'',classList:{add(){},remove(){},toggle(){}},style:{},append(){},appendChild(){},addEventListener(){},focus(){},onclick:null});}
const document={getElementById:el,querySelectorAll:()=>[],querySelector:()=>null,createElement:tag=>({tagName:tag, className:'',textContent:'',disabled:false,onclick:null,classList:{add(){},remove(){}},appendChild(){},addEventListener(){}})};
const localStorage={getItem:k=>Object.prototype.hasOwnProperty.call(store,k)?store[k]:null,setItem:(k,v)=>store[k]=String(v),removeItem:k=>delete store[k]};
const context={console,document,localStorage,location:{href:'http://localhost/',},navigator:{serviceWorker:{register:()=>Promise.resolve()}},window:null,fetch:async url=>({ok:true,json:async()=>JSON.parse(fs.readFileSync(path.join(root,new URL(url).pathname.replace(/^\//,'')),'utf8'))}),setTimeout,clearTimeout,Date,Math,URL,Error,Promise,SpeechSynthesisUtterance:function(){},speechSynthesis:{cancel(){},speak(){}},confirm:()=>true};
const runtimeVersion=JSON.parse(fs.readFileSync(path.join(root,'VERSION.json'),'utf8')).version;
context.window=context;context.self=context;context.FIEZEL_VERSION=runtimeVersion;context.window.scrollTo=()=>{};context.window.AudioContext=undefined;context.window.webkitAudioContext=undefined;
const now=Date.now(),day=86400000;const hist=[];
for(let i=0;i<40;i++){const types=[['grammar','present_simple'],['reading','reading_inference'],['vocab','vocab_00003']];const [type,skill]=types[i%3];hist.push({id:'h'+i,type,skill,target:skill,difficulty:2,ok:i%4!==0,ms:3000+i*100,confidence:(i%3)+1,selectedAnswer:i%4===0?'wrong-option':null,correctAnswer:'right',errorTag:skill,at:now-(39-i)*day});}
for(let i=0;i<5;i++)hist.push({id:'today'+i,type:'grammar',skill:'present_simple',target:'present_simple',difficulty:2,ok:i!==0,ms:4000,confidence:2,selectedAnswer:i===0?'go':'goes',correctAnswer:'goes',errorTag:'subject_verb_agreement',at:now});
const seeded={version:runtimeVersion,userName:'Jahran',view:'progress',level:3,placementDone:false,totalAnswered:hist.length,totalCorrect:hist.filter(x=>x.ok).length,totalTimeMs:200000,history:hist,wrongAnswers:hist.filter(x=>!x.ok),vocab:{vocab_00003:{total:4,correct:2,mastery:50,nextReview:now-day,stability:1,lastSeen:now-3*day,lapses:1}},grammar:{present_simple:{total:8,correct:4,mastery:50,nextReview:now-day,stability:2,lastSeen:now-4*day,lapses:2}},reading:{reading_00001:{total:4,correct:1,mastery:25,nextReview:now-day,stability:1,lastSeen:now-5*day,lapses:2}},daily:{date:'',count:0,attempts:0,meaningful:false},streak:0,adaptiveReady:false,confidenceHistory:hist.map(h=>({confidence:h.confidence,ok:h.ok,at:h.at,skill:h.skill,type:h.type,errorTag:h.errorTag})),learningDays:[],sessionHistory:[]};
localStorage.setItem('fiezel-v4-state',JSON.stringify(seeded));
const code=fs.readFileSync(path.join(root,'app.js'),'utf8');vm.runInNewContext(code,context,{filename:'app.js'});
setTimeout(()=>{
  context.go('progress');const html=els.app.innerHTML;
  const checks={
    learningMap:html.includes('Peta Belajar'),timeline:html.includes('Linimasa Kelemahan')&&html.includes(new Date(now).toISOString().slice(0,10)),smartReview:html.includes('Ulangan Pintar')&&html.includes('risiko lupa'),confidence:html.includes('Kalibrasi Keyakinan'),errorPatterns:html.includes('Pola Kesalahan')&&html.includes('Subject verb agreement'),confusionNetwork:html.includes('Jaringan Kekeliruan Kosakata'),readingMap:html.includes('Peta Skill Reading'),diagnostic:html.includes('Laporan Diagnostik'),creator:html.includes('instagram.svg')&&html.includes('@fitrarustqi'),
    adaptiveReady:context.__getFiezelState().adaptiveReady===true,meaningfulStreak:context.__getFiezelState().streak>=1,reviewDue:context.__getFiezelState().grammar.present_simple.nextReview<=Date.now()&&context.__getFiezelState().grammar.present_simple.mastery<80
  };
  console.log(JSON.stringify({checks,state:{adaptiveReady:context.__getFiezelState().adaptiveReady,streak:context.__getFiezelState().streak,daily:context.__getFiezelState().daily},snippet:html.slice(html.indexOf('Pola Kesalahan'),html.indexOf('Jaringan Kekeliruan Kosakata'))},null,2));
  process.exit(Object.values(checks).every(Boolean)?0:1);
},1000);
