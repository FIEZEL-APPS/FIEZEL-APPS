const fs=require('fs'),path=require('path'),vm=require('vm');
const root=__dirname;
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
const css=fs.readFileSync(path.join(root,'style.css'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const grammar=JSON.parse(fs.readFileSync(path.join(root,'grammar-templates.json'),'utf8'));
const assert=(ok,message)=>{if(!ok)throw new Error(message)};
const store={},elements={};
function classList(){const values=new Set();return{add(...xs){xs.forEach(x=>values.add(x))},remove(...xs){xs.forEach(x=>values.delete(x))},toggle(x,on){if(on===undefined)values.has(x)?values.delete(x):values.add(x);else on?values.add(x):values.delete(x)},contains(x){return values.has(x)}}}
function element(id){return elements[id]||=( {id,innerHTML:'',textContent:'',className:'',dataset:{},style:{setProperty(){}},classList:classList(),setAttribute(){},addEventListener(){},append(){},focus(){},onclick:null,disabled:false} )}
const document={baseURI:'http://localhost/',body:{classList:classList()},visibilityState:'visible',getElementById:element,querySelector(){return null},querySelectorAll(){return[]},createElement(){return{className:'',textContent:'',disabled:false,onclick:null,classList:classList(),append(){},addEventListener(){}}},addEventListener(){}};
const localStorage={getItem:k=>store[k]||null,setItem:(k,v)=>store[k]=String(v),removeItem:k=>delete store[k]};const Notification=function(title,options){this.title=title;this.options=options;this.close=()=>{};};Notification.permission='granted';Notification.requestPermission=async()=>Notification.permission;
const fetch=async url=>{const file=String(url).split('/').pop();return{ok:true,json:async()=>JSON.parse(fs.readFileSync(path.join(root,file),'utf8'))}};
let oscillatorStarts=0;
class FakeAudioContext{constructor(){this.currentTime=0;this.state='running';this.destination={}}createGain(){return{gain:{value:0,setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){}}}createOscillator(){return{type:'sine',frequency:{value:0,setValueAtTime(){}},connect(){},start(){oscillatorStarts++},stop(){}}}resume(){this.state='running'}suspend(){this.state='suspended'}close(){this.state='closed'}}
const context={console,Notification,document,localStorage,fetch,window:null,self:null,navigator:{vibrate(){return true}},Date,Intl,Math,URL,Error,Promise,setTimeout,clearTimeout,setInterval:()=>({unref(){}}),clearInterval(){},SpeechSynthesisUtterance:function(){},speechSynthesis:{cancel(){},speak(){}},AudioContext:FakeAudioContext};
context.window=context;context.self=context;context.FIEZEL_VERSION=JSON.parse(fs.readFileSync(path.join(root,'VERSION.json'),'utf8')).version;context.window.scrollTo=()=>{};context.window.requestAnimationFrame=fn=>fn();
vm.createContext(context);vm.runInContext(app,context,{filename:'app.js'});
const signature=q=>String(q.question).toLowerCase().replace(/\s+/g,' ').trim()+'||'+q.options.map(x=>String(x).toLowerCase()).sort().join('|');

setTimeout(()=>{try{
  const skills=grammar.templates.map(x=>x.subskill);
  assert(new Set(skills).size===129,'grammar skill fixture changed unexpectedly');
  const expectedModes=['apply_form','complete_sentence','justify_correct','recognize_rule','recognize_objective','sequence_reasoning','identify_misconception','recall_memory_cue','choose_avoidance','diagnose_distractor_1','diagnose_distractor_2','diagnose_distractor_3','label_misconception_1','label_misconception_2','label_misconception_3','repair_distractor_1','repair_distractor_2','repair_distractor_3','contrast_distractor_1','contrast_distractor_2','contrast_distractor_3','classify_family','locate_decision_cue','teach_back','mastery_check'];
  const globalSignatures=new Map(),sourceOwners=new Map();
  let generated=0;
  for(const template of grammar.templates){
    const skill=template.subskill;
    const questions=context.buildGrammarLessonQuestions(skill,25);
    assert(questions.length===25,`${skill} generated ${questions.length}/25 questions`);
    assert(new Set(questions.map(signature)).size===25,`${skill} contains duplicate runtime questions`);
    assert(new Set(questions.map(q=>q.question)).size===25,`${skill} repeats question wording across practice modes`);
    assert(questions.every(q=>context.__fiezelAudit.validateQuestion(q).ok),`${skill} contains an invalid question`);
    assert(questions.every(q=>q.lessonSkill===skill),`${skill} lost its lesson identity`);
    assert(questions.every(q=>q.skill===skill&&q.sourceId===template.id&&q.conceptId===template.id),`${skill} leaks a peer concept into the lesson`);
    assert(new Set(questions.map(q=>q.practiceMode)).size===25&&expectedModes.every(mode=>questions.some(q=>q.practiceMode===mode)),`${skill} does not cover all 25 pedagogical modes`);
    for(const q of questions){
      const sig=signature(q);assert(!globalSignatures.has(sig),`${skill} repeats a runtime question from ${globalSignatures.get(sig)}`);globalSignatures.set(sig,skill);
      const owner=sourceOwners.get(q.sourceId);assert(!owner||owner===skill,`${skill} reuses source concept ${q.sourceId} from ${owner}`);sourceOwners.set(q.sourceId,skill);
    }
    const explanation=questions.map(q=>JSON.stringify(q.explain)).join(' ');
    assert(!/Correct:|This form matches|does not satisfy|Evidence from the passage|Reading focus:/i.test(explanation),`${skill} still exposes raw English explanation text`);
    generated+=questions.length;
  }

  const at=(hour,minute=0)=>context.getCelestialState(new Date(2026,7,12,hour,minute,0));
  const sunrise=at(6),noon=at(12),sunset=at(17,59),moonrise=at(18),midnight=at(0);
  assert(sunrise.body==='sun'&&sunrise.x<10&&sunrise.y>70,'sunrise position is incorrect');
  assert(noon.body==='sun'&&Math.abs(noon.x-50)<1&&noon.y<20,'midday sun position is incorrect');
  assert(sunset.body==='sun'&&sunset.x>90&&sunset.y>70,'sunset position is incorrect');
  assert(moonrise.body==='moon'&&moonrise.x<10&&moonrise.y>70,'moonrise position is incorrect');
  assert(midnight.body==='moon'&&Math.abs(midnight.x-50)<1&&midnight.y<20,'midnight moon position is incorrect');
  assert(noon.palette.top!==midnight.palette.top&&noon.palette.bottom!==midnight.palette.bottom,'screen palette does not change from day to night');
  assert(/^rgba\(/.test(noon.light)&&/^rgba\(/.test(midnight.light),'sun/moon light color is missing');

  assert(context.playFeedbackSound('success')===true,'correct-answer sound did not start');
  assert(context.playFeedbackSound('error')===true,'wrong-answer sound did not start');
  assert(oscillatorStarts===5,`feedback sound produced ${oscillatorStarts}/5 expected tones`);
  assert(html.includes('id="answerBurst"')&&css.includes('.answer-burst.show'),'answer popup surface is missing');
  assert(html.includes('id="globalSky"')&&html.includes('id="globalCelestial"'),'full-screen celestial layer is missing');
  assert(css.includes('.global-sky')&&css.includes('.sky-light')&&css.includes('.scene-night'),'day/night full-screen visual phases are incomplete');
  assert(app.includes('Hindari gaya buku teks')&&app.includes('Gunakan Bahasa Indonesia yang jernih'),'AI natural-language contract is missing');
  console.log('FIEZEL lesson experience: PASS');
  console.log(JSON.stringify({grammarLessons:skills.length,questionsPerLesson:25,practiceModesPerLesson:25,generatedQuestionsChecked:generated,crossLessonDuplicates:0,focusLeaks:0,correctWrongTones:oscillatorStarts,realtimeCycle:['sunrise','noon','sunset','moonrise','midnight'],naturalIndonesian:true}));
}catch(error){console.error('FIEZEL lesson experience: FAIL\n'+error.stack);process.exitCode=1}},260);
