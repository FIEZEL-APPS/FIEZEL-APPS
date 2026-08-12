const fs=require('fs'),path=require('path'),crypto=require('crypto');
const ROOT=__dirname;
const CONTENT_QA_SCHEMA='fiezel-content-qa-v1';
const REVIEW_QUEUE_LIMIT=200;
const LEVELS=['A1','A2','B1','B2','C1','C2'];
const text=v=>String(v??'').trim();
const norm=v=>text(v).toLowerCase().normalize('NFKC').replace(/[“”‘’]/g,"'").replace(/[^a-z0-9']+/g,' ').replace(/\s+/g,' ').trim();
const words=v=>norm(v).split(' ').filter(Boolean);
const sha=v=>crypto.createHash('sha256').update(v).digest('hex');
const fileSha=f=>sha(fs.readFileSync(path.join(ROOT,f)));
function jaccard(a,b){const A=new Set(words(a)),B=new Set(words(b));if(!A.size&&!B.size)return 1;let inter=0;for(const x of A)if(B.has(x))inter++;return inter/(A.size+B.size-inter||1)}
function questionShape(v){return norm(text(v).replace(/Target:\s*[“"].*?[”"]\.?/gi,' Target').replace(/In the case at [^,]+,/gi,'In the case,'))}
function finding(domain,itemId,category,severity,message,evidence={}){return{domain,itemId:text(itemId).slice(0,120),category,severity,message,evidence}}
function auditContent(input){
  const grammar=input.grammar||{},vocabulary=Array.isArray(input.vocabulary)?input.vocabulary:[],reading=Array.isArray(input.reading)?input.reading:[],findings=[];
  const add=(...args)=>findings.push(finding(...args));
  const lessons=Array.isArray(grammar.templates)?grammar.templates:[];
  const seenGrammarIds=new Set(),seenSubskills=new Set();
  for(const g of lessons){
    const id=text(g.id)||'(missing-id)',opts=Array.isArray(g.options)?g.options:[],correct=Number(g.correctIndex),correctValue=opts[correct],wrong=opts.filter((_,i)=>i!==correct).map(norm);
    if(!id||seenGrammarIds.has(id))add('grammar',id,'ambiguity','blocker','Grammar lesson ID must be non-empty and unique.'); else seenGrammarIds.add(id);
    if(!text(g.subskill)||seenSubskills.has(text(g.subskill)))add('grammar',id,'focus_identity','blocker','Grammar subskill must be non-empty and unique.',{subskill:text(g.subskill)}); else seenSubskills.add(text(g.subskill));
    if(opts.length!==4||new Set(opts.map(norm)).size!==4||!Number.isInteger(correct)||correct<0||correct>=4)add('grammar',id,'ambiguity','blocker','Grammar item must have four unique options and one valid correctIndex.',{options:opts.length,correctIndex:g.correctIndex});
    const distractors=Array.isArray(g.distractors)?g.distractors:[];
    if(distractors.length!==3)add('grammar',id,'weak_distractor','blocker','Grammar item must diagnose exactly three distractors.',{count:distractors.length});
    for(const d of distractors){if(!wrong.includes(norm(d?.option))||text(d?.whyFails).length<18||text(d?.misconception).length<6)add('grammar',id,'evidence_mismatch','blocker','Distractor diagnosis must map to a wrong option and explain the specific failure.',{option:text(d?.option)});}
    const ex=g.explanation||{};
    for(const key of ['whyCorrect','rule','whyOthersFail','howToAvoid','memoryCue'])if(text(ex[key]).length<12)add('grammar',id,'weak_explanation','review',`Grammar explanation field ${key} is too thin for reliable coaching.`,{length:text(ex[key]).length});
    if(text(g.stem).length<12)add('grammar',id,'context_thin','review','Grammar stem may not provide enough context to disambiguate the target decision.',{stem:text(g.stem)});
    if(!correctValue)add('grammar',id,'answer_integrity','blocker','Grammar correct answer is empty.');
  }
  for(let i=0;i<lessons.length;i++)for(let j=i+1;j<lessons.length;j++)if(jaccard(lessons[i].stem,lessons[j].stem)>=0.86)add('grammar',`${lessons[i].id} ~ ${lessons[j].id}`,'repetition','review','Grammar stems are near-duplicates and should be checked for cosmetic rather than pedagogical variation.',{similarity:Number(jaccard(lessons[i].stem,lessons[j].stem).toFixed(3))});

  const vocabSeen=new Map(),vocabTriples=new Map();
  for(const v of vocabulary){
    const id=text(v.id)||'(missing-id)',word=norm(v.word),triple=`${word}|${text(v.level)}|${norm(v.partOfSpeech)}`;
    if(!word||vocabSeen.has(word))add('vocabulary',id,'ambiguity','blocker','Vocabulary canonical word must be non-empty and unique.',{word:text(v.word),other:vocabSeen.get(word)||''}); else vocabSeen.set(word,id);
    if(vocabTriples.has(triple))add('vocabulary',id,'repetition','blocker','Duplicate word + CEFR + part-of-speech tuple.',{other:vocabTriples.get(triple)}); else vocabTriples.set(triple,id);
    for(const key of ['level','partOfSpeech','phonetic','meaning','example','status'])if(!text(v[key]))add('vocabulary',id,'completeness','blocker',`Vocabulary field ${key} is missing.`);
    const exampleWords=words(v.example);if(exampleWords.length&&exampleWords.length<4)add('vocabulary',id,'context_thin','review','Vocabulary example is unusually short and may not establish the intended sense.',{words:exampleWords.length});
  }

  const passageIds=new Set(),passageNorm=new Map(),questionNorm=new Map(),shapeGroups=new Map(),wrongOptionFreq=new Map(),levelMetrics=Object.fromEntries(LEVELS.map(x=>[x,[]]));
  for(const r of reading){
    const id=text(r.id)||'(missing-id)',pNorm=norm(r.text),level=text(r.level);if(passageIds.has(id)||!id)add('reading',id,'identity','blocker','Reading passage ID must be non-empty and unique.'); else passageIds.add(id);
    if(passageNorm.has(pNorm))add('reading',id,'repetition','blocker','Exact normalized reading passage duplicate.',{other:passageNorm.get(pNorm)}); else passageNorm.set(pNorm,id);
    const wc=words(r.text).length,sentences=text(r.text).split(/[.!?]+/).filter(x=>x.trim()).length||1; if(levelMetrics[level])levelMetrics[level].push({id,words:wc,sentenceAvg:wc/sentences});
    const qs=Array.isArray(r.qs)?r.qs:[];if(qs.length!==5)add('reading',id,'inventory','blocker','Reading passage must contain exactly five questions.',{questions:qs.length});
    qs.forEach((q,qi)=>{
      const qid=`${id}#${qi+1}`,stem=text(q?.[0]),opts=Array.isArray(q?.[1])?q[1]:[],answer=Number(q?.[2]),meta=q?.[3]||{},qn=norm(stem);
      if(questionNorm.has(qn))add('reading',qid,'repetition','blocker','Exact normalized reading question duplicate.',{other:questionNorm.get(qn)}); else questionNorm.set(qn,qid);
      if(opts.length!==4||new Set(opts.map(norm)).size!==4||!Number.isInteger(answer)||answer<0||answer>=4)add('reading',qid,'ambiguity','blocker','Reading question must have four unique options and one valid answer index.',{options:opts.length,answer:q?.[2]});
      if(text(meta.answer)&&norm(meta.answer)!==norm(opts[answer]))add('reading',qid,'evidence_mismatch','blocker','Reading metadata answer does not match the indexed answer option.',{metadata:text(meta.answer),indexed:text(opts[answer])});
      if(text(meta.evidence)&&!pNorm.includes(norm(meta.evidence)))add('reading',qid,'evidence_mismatch','blocker','Reading evidence is not grounded verbatim in the passage.',{evidence:text(meta.evidence).slice(0,180)});
      if(!text(meta.type)||!text(meta.evidence))add('reading',qid,'evidence_mismatch','blocker','Reading question requires a type and specific passage evidence.');
      const shape=questionShape(stem);if(!shapeGroups.has(shape))shapeGroups.set(shape,[]);shapeGroups.get(shape).push(qid);
      opts.forEach((o,oi)=>{if(oi===answer)return;const k=norm(o);if(!k)return;const rec=wrongOptionFreq.get(k)||{count:0,samples:[]};rec.count++;if(rec.samples.length<5)rec.samples.push(qid);wrongOptionFreq.set(k,rec)});
    });
  }
  for(const [shape,ids] of shapeGroups)if(ids.length>=12)add('reading',ids[0],'repetition','review','Reading question wording template is reused heavily; review for mechanical practice.',{count:ids.length,samples:ids.slice(0,5),shape:shape.slice(0,180)});
  for(const [option,rec] of wrongOptionFreq)if(rec.count>=20)add('reading',rec.samples[0]||'', 'weak_distractor','review','The same reading distractor is reused frequently and may become guessable by pattern.',{count:rec.count,samples:rec.samples,option:option.slice(0,180)});
  const med=a=>{const x=[...a].sort((m,n)=>m-n);return x.length?x[Math.floor(x.length/2)]:0};
  const difficulty={};for(const level of LEVELS){const rows=levelMetrics[level],mw=med(rows.map(x=>x.words)),ms=med(rows.map(x=>x.sentenceAvg));difficulty[level]={passages:rows.length,medianWords:mw,medianSentenceWords:Number(ms.toFixed(1))}}
  const medians=LEVELS.map(x=>difficulty[x].medianWords).filter(Boolean);if(medians.length>=4&&Math.max(...medians)-Math.min(...medians)<18)add('reading','CEFR-distribution','difficulty_mismatch','review','Reading passage length barely separates A1–C2; verify that higher CEFR levels are genuinely harder rather than relabeled.',{difficulty});
  for(let i=1;i<LEVELS.length;i++){const prev=difficulty[LEVELS[i-1]],cur=difficulty[LEVELS[i]];if(prev.passages&&cur.passages&&cur.medianSentenceWords+1<prev.medianSentenceWords)add('reading',`${LEVELS[i-1]}→${LEVELS[i]}`,'difficulty_mismatch','review','Median sentence complexity decreases at a higher CEFR band.',{previous:prev,current:cur});}

  const blockers=findings.filter(x=>x.severity==='blocker'),reviews=findings.filter(x=>x.severity==='review');
  const byCategory={},byDomain={};for(const f of findings){byCategory[f.category]=(byCategory[f.category]||0)+1;byDomain[f.domain]=(byDomain[f.domain]||0)+1}
  return{schema:CONTENT_QA_SCHEMA,version:text(input.version),generatedAt:new Date().toISOString(),status:blockers.length?'FAIL':'PASS',mode:'deterministic-read-only',authority:'report-only',counts:{grammar:lessons.length,vocabulary:vocabulary.length,readingPassages:reading.length,readingQuestions:reading.reduce((n,r)=>n+(Array.isArray(r.qs)?r.qs.length:0),0),blockers:blockers.length,review:reviews.length,queued:Math.min(reviews.length,REVIEW_QUEUE_LIMIT)},byCategory,byDomain,difficulty,blockingFindings:blockers.slice(0,REVIEW_QUEUE_LIMIT),reviewQueue:reviews.slice(0,REVIEW_QUEUE_LIMIT)}
}
function loadCanonical(){return{version:JSON.parse(fs.readFileSync(path.join(ROOT,'VERSION.json'),'utf8')).version,grammar:JSON.parse(fs.readFileSync(path.join(ROOT,'grammar-templates.json'),'utf8')),vocabulary:JSON.parse(fs.readFileSync(path.join(ROOT,'vocabulary-master.json'),'utf8')),reading:JSON.parse(fs.readFileSync(path.join(ROOT,'reading-bank.json'),'utf8'))}}
function runCli(){const files=['grammar-templates.json','vocabulary-master.json','reading-bank.json'],before=Object.fromEntries(files.map(f=>[f,fileSha(f)])),report=auditContent(loadCanonical()),after=Object.fromEntries(files.map(f=>[f,fileSha(f)]));report.readOnlyVerified=files.every(f=>before[f]===after[f]);report.sourceSha256=before;fs.writeFileSync(path.join(ROOT,'CONTENT-QA-REPORT.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({schema:report.schema,version:report.version,status:report.status,readOnlyVerified:report.readOnlyVerified,counts:report.counts,byCategory:report.byCategory,difficulty:report.difficulty},null,2));process.exitCode=report.status==='PASS'&&report.readOnlyVerified?0:1}
if(require.main===module)runCli();
module.exports={CONTENT_QA_SCHEMA,REVIEW_QUEUE_LIMIT,auditContent,questionShape,norm};
