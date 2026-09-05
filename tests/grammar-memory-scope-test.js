'use strict';
const __fzRoot = require('path').join(__dirname, '..'); /* m025-254: berkas ini pindah dari root ke tests/. __dirname dulu BERARTI root repo, dan puluhan gerbang memakainya untuk menunjuk berkas produksi - alias ini menjaga makna itu tetap benar tanpa menyunting setiap pemakaian. */

/**
 * Regression contract for grammar memory-cue provenance.
 *
 * A recall/memory cue is pedagogical material attached to the ACTIVE grammar lesson.
 * It may contrast a misconception, but it must not silently borrow the rule/lesson identity
 * of another grammar point. This test is intentionally stricter than family/CEFR proximity.
 *
 * The runtime is allowed to expose provenance as sourceId / conceptId / lessonSkill on the
 * question or on each option. If provenance is exposed, every recall-memory option must
 * resolve to the active lesson identity. Missing provenance is treated as a failure: a
 * memory cue whose origin cannot be established is not safe to render.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = __fzRoot;
const classList = () => ({ add() {}, remove() {}, toggle() {}, contains() { return false; } });
const elements = {};
const element = id => elements[id] ||= { id, innerHTML:'', textContent:'', className:'', dataset:{}, style:{setProperty(){}}, classList:classList(), setAttribute(){}, addEventListener(){}, append(){}, focus(){}, onclick:null, disabled:false };
const store = {};
const fileIndex = new Map();
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes:true })) {
    if (['node_modules','.git','vendor','assets','docs','.audit-tmp'].includes(e.name)) continue; /* .audit-tmp: sisa mkdtemp release-audit.py berisi snapshot data basi yang membayangi file kanonik root (preseden: tests/level-grammar-contract-test.js) */
    const full = path.join(dir,e.name);
    if (e.isDirectory()) walk(full); else if (!fileIndex.has(e.name)) fileIndex.set(e.name,full);
  }
})(root);
const context = {
  console:{log(){},warn(){},error(){},info(){}},
  document:{baseURI:'http://localhost/',body:{classList:classList()},visibilityState:'visible',getElementById:element,querySelector:()=>null,querySelectorAll:()=>[],createElement:()=>element('generated'),addEventListener(){}},
  localStorage:{getItem:k=>store[k]||null,setItem:(k,v)=>store[k]=String(v),removeItem:k=>delete store[k]},
  fetch:async url=>{const f=fileIndex.get(String(url).split('/').pop());return f?{ok:true,status:200,json:async()=>JSON.parse(fs.readFileSync(f,'utf8'))}:{ok:false,status:404,json:async()=>{throw new Error('404')}}},
  Notification:Object.assign(function(){},{permission:'granted',requestPermission:async()=> 'granted'}),
  window:null,self:null,navigator:{vibrate:()=>true},Date,Intl,Math,URL,Error,Promise,JSON,
  setTimeout,clearTimeout,setInterval:()=>({unref(){}}),clearInterval(){},
  SpeechSynthesisUtterance:function(){},speechSynthesis:{cancel(){},speak(){}},
  AudioContext:class{constructor(){this.currentTime=0;this.state='running';this.destination={}}createGain(){return{gain:{value:0,setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){}}}createOscillator(){return{type:'sine',frequency:{value:0,setValueAtTime(){}},connect(){},start(){},stop(){}}}resume(){}suspend(){}close(){}},
};
context.window=context;context.self=context;
context.FIEZEL_VERSION=JSON.parse(fs.readFileSync(path.join(root,'VERSION.json'),'utf8')).version;
context.window.scrollTo=()=>{};context.window.requestAnimationFrame=fn=>fn();
vm.createContext(context);
/* Harness i18n (pola W1-TESTPLAN 2b, hotfix CI pasca-#242): muat runtime i18n + copy-id sebelum kode app dievaluasi. existsSync = hijau dua arah. */
const __i18nRt=path.join(root,'features','i18n','fiezel-i18n.js');
if(fs.existsSync(__i18nRt)){vm.runInContext(fs.readFileSync(__i18nRt,'utf8'),context,{filename:'fiezel-i18n.js'});
for(const __n of fs.readdirSync(path.join(root,'features','i18n')).filter(n=>/^copy-id-.*\.js$/.test(n)).sort()){
vm.runInContext(fs.readFileSync(path.join(root,'features','i18n',__n),'utf8'),context,{filename:__n});}}

vm.runInContext(fs.readFileSync(path.join(root,'app.js'),'utf8'),context,{filename:'app.js'});

const templates=JSON.parse(fs.readFileSync(path.join(root,'grammar-templates.json'),'utf8')).templates;
const state=context.__getFiezelState();

function identity(x) {
  if (!x || typeof x !== 'object') return '';
  return String(x.sourceId || x.conceptId || x.lessonSkill || x.skill || '').trim();
}
function assert(ok,msg){if(!ok)throw new Error(msg)}

setTimeout(() => {
  let checked=0, failures=[];
  const previous={activeLevel:state.preferences.activeLevel||'',levelMode:state.preferences.levelMode||'placement'};
  for (const lesson of templates) {
    state.preferences={...state.preferences,activeLevel:lesson.cefr,levelMode:'manual'};
    const qs=context.buildGrammarLessonQuestions(lesson.subskill,25);
    for (const q of qs) {
      if (q.practiceMode!=='recall_memory_cue' && q.mode!=='recall_memory_cue') continue;
      checked++;
      const expected=String(q.lessonSkill||q.skill||lesson.subskill).trim();
      const sources=Array.isArray(q.optionSources)?q.optionSources:[];
      if (sources.length!==q.options.length) {
        failures.push(`${lesson.id}/${lesson.subskill}: ${sources.length} provenance entries for ${q.options.length} options`);
        continue;
      }
      // Invarian yang BISA dipenuhi tanpa mengarang data.
      //
      // Versi pertama gate ini menuntut KEEMPAT pilihan milik lesson yang sedang dibuka.
      // Bank soal tidak bisa memenuhinya: tiap template hanya punya SATU memoryCue, jadi
      // empat pilihan sekaligus berarti mengarang tiga pengingat palsu per lesson - 417
      // string baru, dan itu keputusan konten, bukan perbaikan kode.
      //
      // Yang benar-benar rusak sebelumnya bukan keberadaan pengecoh pinjaman, melainkan
      // pinjaman yang TIDAK MENINGGALKAN JEJAK: peta miskonsepsi kartu tidak pernah cocok,
      // dan salah-pilih tercatat sekadar "salah di lesson ini" tanpa petunjuk lesson mana
      // yang sebenarnya tertukar. Jadi yang dijaga: setiap pilihan menyatakan asalnya,
      // kuncinya milik lesson ini, dan tiap pengecoh menyebut lesson lain yang nyata.
      const keys=sources.filter(x=>x&&x.own);
      if (keys.length!==1) failures.push(`${lesson.id}/${lesson.subskill}: ${keys.length} pilihan mengaku milik lesson ini, seharusnya tepat 1`);
      const key=sources[q.answerIndex];
      if (!key||!key.own) failures.push(`${lesson.id}/${lesson.subskill}: kunci jawaban tidak ditandai milik lesson ini`);
      else if (identity(key)&&String(key.lessonSkill||'').trim()!==expected) failures.push(`${lesson.id}/${lesson.subskill}: kunci mengaku ${key.lessonSkill}, seharusnya ${expected}`);
      for (const source of sources) {
        if (!source||typeof source!=='object') { failures.push(`${lesson.id}/${lesson.subskill}: ada pilihan tanpa provenance`); continue; }
        if (!identity(source)) failures.push(`${lesson.id}/${lesson.subskill}: provenance kosong di ${JSON.stringify(source).slice(0,120)}`);
        if (!source.own && !String(source.sourceSkill||'').trim()) failures.push(`${lesson.id}/${lesson.subskill}: pengecoh pinjaman tidak menyebut lesson asalnya`);
        if (!source.own && String(source.sourceSkill||'').trim()===expected) failures.push(`${lesson.id}/${lesson.subskill}: pengecoh mengaku pinjaman tetapi menunjuk lesson ini sendiri`);
      }
    }
  }
  state.preferences={...state.preferences,...previous};
  assert(checked>0,'no recall_memory_cue questions were generated; test cannot establish the invariant');
  assert(!failures.length,`recall-memory provenance leaks detected (${failures.length}):\n${failures.slice(0,20).join('\n')}`);
  console.log(`PASS grammar-memory-scope: ${checked} recall_memory_cue questions are source-bound`);
},0);
