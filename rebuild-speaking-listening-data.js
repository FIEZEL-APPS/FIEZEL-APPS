'use strict';
const fs=require('fs');
const path=require('path');
const root=__dirname;
const feature=path.join(root,'features','speaking-listening');
const listeningPath=path.join(feature,'listening-bank-v1.json');
const speakingPath=path.join(feature,'speaking-bank-v1.json');
const listening=JSON.parse(fs.readFileSync(listeningPath,'utf8'));
const speaking=JSON.parse(fs.readFileSync(speakingPath,'utf8'));
const voices=['af_nicole','am_michael','bf_emma','bm_george'];
const minimumWords={A1:4,A2:6,B1:8,B2:10,C1:12,C2:14};
const concepts={
  speak_0003:[['like','love','enjoy','favorite'],['because','since']],
  speak_0004:[['name','called','im','i am'],['student','school','study']],
  speak_0005:[['water'],['please','could i','can i','may i']],
  speak_0006:[['where'],['from','come from']],
  speak_0009:[['usually','normally','often','after school'],['homework','rest','study','play','practice','help','eat','sleep']],
  speak_0010:[['going to','plan','planning','will'],['weekend','saturday','sunday']],
  speak_0011:[['repeat','say that again','explain again'],['please','could you','can you']],
  speak_0012:[['appointment','available','opening'],['tomorrow'],['morning','a m']],
  speak_0015:[['want to','need to','would like to'],['because','since'],['review','practice','study','routine']],
  speak_0016:[['difficult','hard','challenging'],['but','however','although'],['finished','completed','managed']],
  speak_0017:[['cannot','cant','unable','not able'],['because','need to','have to'],['tomorrow','another time','later']],
  speak_0018:[['explain','tell me'],['why','reason'],['chose','choose','choice','decision']],
  speak_0021:[['while','whereas','compared with','but'],['prefer','better for me','more suitable'],['because','since','helps me']],
  speak_0022:[['risk','problem','danger'],['verify','check','confirm'],['source','sources','reference','references']],
  speak_0023:[['technical','computer','internet','system'],['submit','send','upload'],['extension','more time','extra time']],
  speak_0024:[['but','however','although'],['concerned','worry','concern'],['risk','problem','issue']],
  speak_0027:[['correlation'],['causation','cause and effect','causal'],['factor','variable','confounder']],
  speak_0028:[['allow','permit'],['if','provided that','as long as'],['verify','check','explain','reasoning']],
  speak_0029:[['concern','limitation','point'],['assumption'],['test','tested','verify','validation'],['analysis','sensitivity','robustness']],
  speak_0030:[['clarify','confirm','tell me'],['scholarship','funding','grant'],['living','housing','expenses'],['tuition','course fees','fees']],
  speak_0033:[['persuasive','rhetorical'],['evidence','evidential','evidentially','support'],['data','sources','claims']],
  speak_0034:[['average','mean'],['subgroup','subgroups','groups','distribution'],['robust','sensitivity','alternative']],
  speak_0035:[['plausible','reasonable'],['evidence','support'],['certainty','certain','confidence'],['claim','conclusion']],
  speak_0036:[['urgency','urgent','quickly','prompt'],['prove','certain','certainty'],['solution','approach'],['evidence','information']]
};
const sampleRepairs={
  speak_0010:'This weekend, I am going to practice coding and meet my friends.',
  speak_0021:'Studying alone helps me focus, while studying with friends is useful for discussion. I prefer studying alone because I concentrate better on difficult topics.'
};
listening.version=2;
listening.status='reviewed_release_seed';
listening.items=listening.items.map((item,index)=>({...item,voice:voices[index%voices.length],audioProfile:'listening'}));
speaking.version=2;
speaking.status='reviewed_release_seed';
speaking.items=speaking.items.map(item=>{
  if(item.mode==='repeat_target')return item;
  const targetConcepts=concepts[item.id];
  if(!targetConcepts)throw new Error(`Missing target concepts for ${item.id}`);
  return{...item,sampleAnswer:sampleRepairs[item.id]||item.sampleAnswer,targetConcepts,scoring:{...item.scoring,metric:'target_concept_coverage',minimumWords:minimumWords[item.level]}};
});
listening.count=listening.items.length;
speaking.count=speaking.items.length;
fs.writeFileSync(listeningPath,JSON.stringify(listening,null,2)+'\n');
fs.writeFileSync(speakingPath,JSON.stringify(speaking,null,2)+'\n');
console.log(JSON.stringify({listening:listening.count,speaking:speaking.count,voices,conceptItems:Object.keys(concepts).length,status:'rebuilt'}));
