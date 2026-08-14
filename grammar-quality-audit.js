const fs=require('fs');
const path=require('path');
const vm=require('vm');

const root=__dirname;
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
const grammar=JSON.parse(fs.readFileSync(path.join(root,'grammar-templates.json'),'utf8'));
const expectedVersion=JSON.parse(fs.readFileSync(path.join(root,'VERSION.json'),'utf8')).version;
const expectedModes=[
  'apply_form','complete_sentence','justify_correct','recognize_rule','recognize_objective',
  'sequence_reasoning','identify_misconception','recall_memory_cue','choose_avoidance',
  'diagnose_distractor_1','diagnose_distractor_2','diagnose_distractor_3',
  'label_misconception_1','label_misconception_2','label_misconception_3',
  'repair_distractor_1','repair_distractor_2','repair_distractor_3',
  'contrast_distractor_1','contrast_distractor_2','contrast_distractor_3',
  'classify_family','locate_decision_cue','teach_back','mastery_check'
];
const checks=[];
let pass=true;
const check=(name,ok,details)=>{checks.push({name,status:ok?'PASS':'FAIL',details});if(!ok)pass=false};
const norm=value=>String(value??'').toLowerCase().replace(/[^a-z0-9 ]+/g,' ').replace(/\s+/g,' ').trim();
const signature=q=>`${norm(q.question)}||${q.options.map(norm).sort().join('|')}`;
const requiredTemplateStrings=['id','family','subskill','cefr','questionType','pedagogicalObjective','misconceptionTargeted','reasoningOperation','stem'];
const requiredExplanationStrings=['whyCorrect','rule','whyOthersFail','howToAvoid','memoryCue'];

check('Grammar data version',grammar.version===expectedVersion&&grammar.schemaVersion==='2.0.0'&&grammar.practiceBlueprintVersion==='focused-25-v1',`version=${grammar.version} schema=${grammar.schemaVersion} blueprint=${grammar.practiceBlueprintVersion}`);
check('Grammar lesson inventory',grammar.count===129&&grammar.templates.length===129,`declared=${grammar.count} actual=${grammar.templates.length}`);
const ids=grammar.templates.map(x=>x.id),skills=grammar.templates.map(x=>x.subskill);
check('Unique lesson identities',new Set(ids).size===129&&new Set(skills).size===129,`ids=${new Set(ids).size} subskills=${new Set(skills).size}`);

const malformed=[],generic=[],badDistractors=[],badOptions=[],badCefr=[],unconstrainedAmbiguity=[];
const bannedGeneric=/Each distractor conflicts|Check the subject, time reference|Match form to function and context|identify grammatical cue\s*->\s*select form/i;
for(const item of grammar.templates){
  if(requiredTemplateStrings.some(key=>!String(item[key]||'').trim())||requiredExplanationStrings.some(key=>!String(item.explanation?.[key]||'').trim()))malformed.push(item.id);
  if(!['A1','A2','B1','B2','C1','C2'].includes(item.cefr))badCefr.push(item.id);
  if(!Array.isArray(item.options)||item.options.length!==4||new Set(item.options.map(norm)).size!==4||!Number.isInteger(item.correctIndex)||item.correctIndex<0||item.correctIndex>3)badOptions.push(item.id);
  const wrong=(item.options||[]).filter((_,index)=>index!==item.correctIndex),mapped=(item.distractors||[]).map(x=>norm(x.option));
  if(!Array.isArray(item.distractors)||item.distractors.length!==3||wrong.some(option=>!mapped.includes(norm(option)))||item.distractors.some(x=>!String(x.misconception||'').trim()||!String(x.whyFails||'').trim()))badDistractors.push(item.id);
  if(bannedGeneric.test([item.reasoningOperation,...requiredExplanationStrings.map(key=>item.explanation?.[key])].join(' ')))generic.push(item.id);
  const admitsAlternative=(item.distractors||[]).some(x=>/grammatically (?:valid|possible|correct)|not incorrect|acceptable(?:\s+but)?/i.test(String(x.whyFails||'')));
  if(admitsAlternative&&!/(reduced|most formal|most explicitly|best completes|target (?:form|structure)|explicitly asks)/i.test(item.stem))unconstrainedAmbiguity.push(item.id);
}
check('Template field completeness',malformed.length===0,`malformed=${malformed.length}${malformed.length?` ids=${malformed.join(',')}`:''}`);
check('Four-option answer integrity',badOptions.length===0,`invalid=${badOptions.length}`);
check('Per-distractor diagnosis integrity',badDistractors.length===0,`invalid=${badDistractors.length}`);
check('CEFR labels',badCefr.length===0,`invalid=${badCefr.length}`);
check('No generic explanation placeholders',generic.length===0,`generic=${generic.length}${generic.length?` ids=${generic.join(',')}`:''}`);
check('Potentially valid distractors are explicitly constrained',unconstrainedAmbiguity.length===0,`unconstrained=${unconstrainedAmbiguity.length}${unconstrainedAmbiguity.length?` ids=${unconstrainedAmbiguity.join(',')}`:''}`);

const normalizedStems=grammar.templates.map(x=>norm(x.stem)),normalizedObjectives=grammar.templates.map(x=>norm(x.pedagogicalObjective));
check('Unique authored stems',new Set(normalizedStems).size===normalizedStems.length,`unique=${new Set(normalizedStems).size}/${normalizedStems.length}`);
check('Unique pedagogical objectives',new Set(normalizedObjectives).size===normalizedObjectives.length,`unique=${new Set(normalizedObjectives).size}/${normalizedObjectives.length}`);

const collisionFamilies={
  zero_vs_first:skills.filter(x=>/zero.*first|first.*zero/.test(x)),
  one_time_past_ability:skills.filter(x=>/ability_past_could_vs_was_able_to|ability_general_vs_specific_achievement/.test(x)),
  reported_time_shift:skills.filter(x=>/time_and_place_reference_shift|reporting_time_expression_shift/.test(x)),
  it_cleft:skills.filter(x=>/^cleft_sentences_it_|^cleft_emphasis$/.test(x)),
  negative_adverbial_inversion:skills.filter(x=>/negative_adverbial_inversion|inversion_after_negative/.test(x)),
  basic_past_modal_deduction:skills.filter(x=>/deduction_past_must_have_vs_cant_have|^advanced_modal_deduction$/.test(x))
};
const collisions=Object.entries(collisionFamilies).filter(([,matches])=>matches.length>1);
check('Known pedagogical collision regressions absent',collisions.length===0,collisions.length?collisions:Object.fromEntries(Object.entries(collisionFamilies).map(([key,value])=>[key,value.length])));

const stop=new Set('a an and or the to of in on for from with vs is are be being been use uses used using choose select distinguish identify recognize determine check apply form forms correct sentence match matching appropriate based when where whether which that this it its into over not without after before as by whose who what why how learner learners grammatical grammar required requiring requires then meaning means'.split(' '));
const tokens=text=>new Set((String(text).toLowerCase().replace(/_/g,' ').match(/[a-z]+/g)||[]).filter(x=>x.length>2&&!stop.has(x)));
const semanticPairs=[];
for(let i=0;i<grammar.templates.length;i++){
  const a=grammar.templates[i],at=tokens(`${a.subskill} ${a.pedagogicalObjective} ${a.reasoningOperation}`),as=tokens(a.subskill);
  for(let j=i+1;j<grammar.templates.length;j++){
    const b=grammar.templates[j],bt=tokens(`${b.subskill} ${b.pedagogicalObjective} ${b.reasoningOperation}`),bs=tokens(b.subskill);
    const jac=(x,y)=>{const union=new Set([...x,...y]);return union.size?[...x].filter(v=>y.has(v)).length/union.size:0};
    const score=.62*jac(at,bt)+.38*jac(as,bs);
    if(score>=.60)semanticPairs.push({a:a.id,b:b.id,score:Number(score.toFixed(3))});
  }
}
check('High-confidence semantic lesson duplicates',semanticPairs.length===0,semanticPairs.length?semanticPairs:'none at composite Jaccard >= 0.60');

function classList(){const values=new Set();return{add(...xs){xs.forEach(x=>values.add(x))},remove(...xs){xs.forEach(x=>values.delete(x))},toggle(x,on){if(on===undefined)values.has(x)?values.delete(x):values.add(x);else on?values.add(x):values.delete(x)},contains(x){return values.has(x)}}}
const store={},elements={};
function element(id){return elements[id]||={id,innerHTML:'',textContent:'',className:'',dataset:{},style:{setProperty(){}},classList:classList(),setAttribute(){},addEventListener(){},append(){},focus(){},onclick:null,disabled:false}}
const document={baseURI:'http://localhost/',body:{classList:classList()},visibilityState:'visible',getElementById:element,querySelector(){return null},querySelectorAll(){return[]},createElement(){return{className:'',textContent:'',disabled:false,onclick:null,classList:classList(),append(){},addEventListener(){}}},addEventListener(){}};
const localStorage={getItem:key=>store[key]||null,setItem:(key,value)=>store[key]=String(value),removeItem:key=>delete store[key]};const Notification=function(title,options){this.title=title;this.options=options;this.close=()=>{};};Notification.permission='granted';Notification.requestPermission=async()=>Notification.permission;
const fetch=async url=>{const file=String(url).split('/').pop();return{ok:true,json:async()=>JSON.parse(fs.readFileSync(path.join(root,file),'utf8'))}};
let seed=0x5f3759df;
const seededMath=Object.create(Math);
seededMath.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/0x100000000};
class FakeAudioContext{constructor(){this.currentTime=0;this.state='running';this.destination={}}createGain(){return{gain:{value:0,setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){}}}createOscillator(){return{type:'sine',frequency:{value:0,setValueAtTime(){}},connect(){},start(){},stop(){}}}resume(){this.state='running'}suspend(){this.state='suspended'}close(){this.state='closed'}}
const context={console,Notification,document,localStorage,fetch,window:null,self:null,navigator:{vibrate(){return true}},Date,Intl,Math:seededMath,URL,Error,Promise,setTimeout,clearTimeout,setInterval:()=>({unref(){}}),clearInterval(){},SpeechSynthesisUtterance:function(){},speechSynthesis:{cancel(){},speak(){}},AudioContext:FakeAudioContext};
context.window=context;context.self=context;context.FIEZEL_VERSION='5.19.0';context.window.scrollTo=()=>{};context.window.requestAnimationFrame=fn=>fn();
vm.createContext(context);vm.runInContext(app,context,{filename:'app.js'});

setTimeout(()=>{
  try{
    const invalidRuntime=[],shortLessons=[],focusLeak=[],modeFailures=[],withinDuplicates=[],genericRuntime=[];
    const crossSignatures=new Map(),sourceOwners=new Map(),modeCounts={},samples={};
    let totalQuestions=0;
    for(const template of grammar.templates){
      const questions=context.buildGrammarLessonQuestions(template.subskill,25);
      totalQuestions+=questions.length;
      if(questions.length!==25)shortLessons.push({skill:template.subskill,count:questions.length});
      const sigs=questions.map(signature),questionTexts=questions.map(q=>norm(q.question)),modes=questions.map(q=>q.practiceMode);
      if(new Set(sigs).size!==questions.length||new Set(questionTexts).size!==questions.length)withinDuplicates.push(template.subskill);
      if(new Set(modes).size!==expectedModes.length||expectedModes.some(mode=>!modes.includes(mode)))modeFailures.push(template.subskill);
      for(const q of questions){
        modeCounts[q.practiceMode]=(modeCounts[q.practiceMode]||0)+1;
        if(!context.__fiezelAudit.validateQuestion(q).ok)invalidRuntime.push(q.id);
        if(q.skill!==template.subskill||q.lessonSkill!==template.subskill||q.sourceId!==template.id||q.conceptId!==template.id)focusLeak.push({lesson:template.subskill,question:q.id,source:q.sourceId});
        const sig=signature(q);if(!crossSignatures.has(sig))crossSignatures.set(sig,new Set());crossSignatures.get(sig).add(template.subskill);
        if(!sourceOwners.has(q.sourceId))sourceOwners.set(q.sourceId,new Set());sourceOwners.get(q.sourceId).add(template.subskill);
        if(/Correct:|This form matches|does not satisfy|placeholder|lorem ipsum/i.test(JSON.stringify(q.explain)))genericRuntime.push(q.id);
      }
      if(Object.keys(samples).length<3)samples[template.id]=questions.slice(0,3).map(q=>({mode:q.practiceMode,question:q.question,answer:q.options[q.answerIndex]}));
    }
    const crossLessonDuplicates=[...crossSignatures.entries()].filter(([,owners])=>owners.size>1);
    const sourceReuse=[...sourceOwners.entries()].filter(([,owners])=>owners.size>1);
    check('Runtime question inventory',totalQuestions===3225,`generated=${totalQuestions} expected=3225`);
    check('Twenty-five questions per lesson',shortLessons.length===0,shortLessons.length?shortLessons:'129/129 lessons complete');
    check('Twenty-five distinct pedagogical modes',modeFailures.length===0,modeFailures.length?modeFailures:`${expectedModes.length} modes x 129 lessons`);
    check('Within-lesson question uniqueness',withinDuplicates.length===0,withinDuplicates.length?withinDuplicates:'no repeated question or option signature');
    check('Lesson focus purity',focusLeak.length===0,focusLeak.length?focusLeak.slice(0,10):'all 3,225 questions use the active lesson concept');
    check('No source concept leaks across lessons',sourceReuse.length===0,sourceReuse.length?sourceReuse.slice(0,10):'each source concept belongs to exactly one lesson suite');
    check('No exact runtime duplicates across lessons',crossLessonDuplicates.length===0,`duplicates=${crossLessonDuplicates.length}`);
    check('Runtime integrity validator',invalidRuntime.length===0,`invalid=${invalidRuntime.length}`);
    check('Runtime explanations are production-ready',genericRuntime.length===0,`generic_or_placeholder=${genericRuntime.length}${genericRuntime.length?` ids=${genericRuntime.slice(0,10).join(',')}`:''}`);
    check('Balanced mode coverage',expectedModes.every(mode=>modeCounts[mode]===129),Object.fromEntries(expectedModes.map(mode=>[mode,modeCounts[mode]||0])));
    check('Legacy peer-mixing generator removed',!app.includes('familyPeers=')&&!app.includes('levelPeers=')&&!app.includes('others=shuffle(GRAMMAR_ITEMS.filter'), 'lesson builder no longer imports peer concepts');

    const report={version:grammar.version,status:pass?'PASS':'NOT READY',counts:{pass:checks.filter(x=>x.status==='PASS').length,fail:checks.filter(x=>x.status==='FAIL').length,lessons:grammar.templates.length,runtimeQuestions:totalQuestions,practiceModes:expectedModes.length,crossLessonDuplicates:crossLessonDuplicates.length,focusLeaks:focusLeak.length},checks,samples};
    fs.writeFileSync(path.join(root,'GRAMMAR-QUALITY-REPORT.json'),`${JSON.stringify(report,null,2)}\n`);
    console.log(JSON.stringify(report,null,2));
    if(!pass)process.exitCode=1;
  }catch(error){console.error(error.stack);process.exitCode=1}
},350);
