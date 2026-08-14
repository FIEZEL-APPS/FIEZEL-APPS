const path=require('path');
const fs=require('fs');
const {validateLibrary,renderPrompt,loadLibrary}=require('./fiezel-prompt-library.js');
const LIB=loadLibrary(path.join(__dirname,'fiezel-prompt-library.json'));
const expectedVersion=JSON.parse(fs.readFileSync(path.join(__dirname,'VERSION.json'),'utf8')).version;
let pass=0,fail=0;
function check(name,ok,details){if(ok){pass++}else{fail++;console.error(`FAIL ${name}: ${details}`)}}
{
  check('library loads',LIB!==null,JSON.stringify(LIB)?.slice(0,80));
  const v=validateLibrary(LIB);
  check('library valid',v.ok,JSON.stringify(v.errors));
  check('all domains present',['grammar','vocabulary','reading','listening','speaking'].every(d=>LIB.prompts[d]),Object.keys(LIB.prompts).join(','));
  check('schema pinned',LIB.schema==='fiezel-prompt-library-v1'&&LIB.version===expectedVersion,LIB.schema);
}
{
  const r=renderPrompt(LIB,'vocabulary','expand_context',{word:'develop',cefr:'B1',example:'The app helps you develop new skills.'});
  check('render ok',r.ok&&typeof r.prompt==='string',JSON.stringify(r));
  check('render injects vars',r.ok&&r.prompt.includes('develop')&&r.prompt.includes('B1'),r.prompt?.slice(0,120));
  check('rendered prompt has no leftover slots',r.ok&&!/\{\{/.test(r.prompt),r.prompt);
}
{
  const r=renderPrompt(LIB,'vocabulary','expand_context',{word:'develop'});
  check('missing slot fails',!r.ok&&r.reason.startsWith('missing_slot'),JSON.stringify(r));
  const r2=renderPrompt(LIB,'grammar','nonexistent',{});
  check('unknown template fails',!r2.ok&&r2.reason==='template_not_found',JSON.stringify(r2));
  const r3=renderPrompt(LIB,'math','expand_context',{word:'x'});
  check('unknown domain fails',!r3.ok&&r3.reason==='template_not_found',JSON.stringify(r3));
}
{
  const r=renderPrompt(LIB,'grammar','fix_weak_skill',{subskill:'past',cefr:'B1',itemJson:'{}',finding:'weak distractor'});
  check('grammar render ok',r.ok,r.prompt?.slice(0,80));
  const r2=renderPrompt(LIB,'reading','rewrite_repetition',{finding:'x',passageText:'passage text here'});
  check('reading render ok',r2.ok,r2.prompt?.slice(0,80));
  const r3=renderPrompt(LIB,'listening','review_item',{itemId:'l1',cefr:'A1',transcript:'hi'});
  check('listening render ok',r3.ok,r3.prompt?.slice(0,80));
}
{
  const r=renderPrompt(LIB,'vocabulary','expand_context',{word:'develop',cefr:'B1',example:'sk-1234567890ABCDEFGHIJKLMNOP'});
  check('secret in slot rejected',!r.ok&&r.reason.startsWith('secret_in_slot'),JSON.stringify(r));
  const r2=renderPrompt(LIB,'vocabulary','expand_context',{word:'develop',cefr:'B1',example:'x'.repeat(50000)});
  check('huge var bounded',r2.ok&&r2.prompt.length<=8000,`len=${r2.prompt?.length}`);
}
{
  const bad={schema:'fiezel-prompt-library-v1',prompts:{grammar:{a:{template:'no constraints listed'}}}};
  const v=validateLibrary(bad);
  check('minimal library valid',v.ok,JSON.stringify(v.errors));
  const v2=validateLibrary({schema:'wrong',prompts:{}});
  check('wrong schema rejected',!v2.ok,JSON.stringify(v2.errors));
  const v3=validateLibrary({schema:'fiezel-prompt-library-v1',prompts:{grammar:{a:{template:'x {{a}} y {{a}}'}}}});
  check('duplicate slot deduped',v3.ok&&v3.slotCount===1,JSON.stringify(v3));
  const v4=validateLibrary({schema:'fiezel-prompt-library-v1',prompts:{grammar:{a:{template:'Bearer ABCDEFGHIJKLMNOPQRSTUVWXYZ012345'}}}});
  check('secret pattern rejected',!v4.ok,JSON.stringify(v4.errors));
  const v5=validateLibrary({schema:'fiezel-prompt-library-v1',prompts:{newdomain:{a:{template:'x'}}}});
  check('unknown domain rejected',!v5.ok,JSON.stringify(v5.errors));
}
{
  const v=validateLibrary(LIB);
  check('no secrets in canonical library',v.ok,JSON.stringify(v.errors));
}
console.log(`FIEZEL Prompt Library: ${pass} PASS / ${fail} FAIL`);
process.exitCode=fail?1:0;