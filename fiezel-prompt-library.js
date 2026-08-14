(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.FIEZEL_PROMPT_LIBRARY=api;
})(typeof self!=='undefined'?self:globalThis,function(){
  'use strict';
  const fs=typeof require==='function'?require('fs'):null;
  const path=typeof require==='function'?require('path'):null;
  const LIBRARY_SCHEMA='fiezel-prompt-library-v1';
  const DOMAINS=new Set(['grammar','vocabulary','reading','listening','speaking']);
  const MAX_SLOTS=12,MAX_VAR_LEN=4000,MAX_PROMPT_LEN=8000;
  const text=v=>String(v??'').trim();
  const bound=(v,max)=>text(v).slice(0,max);
  const slotNames=(tpl)=>{const m=[...tpl.matchAll(/\{\{([A-Za-z0-9_]+)\}\}/g)];return[...new Set(m.map(x=>x[1]))]};
  const SECRET=/AIza[0-9A-Za-z_-]{20,}|sk-[0-9A-Za-z_-]{20,}|Bearer\s+[A-Za-z0-9._-]{20,}|-----BEGIN [A-Z ]*PRIVATE KEY-----|PUTER_AUTH_TOKEN|VAPID_PRIVATE_KEY|javascript:|<\/?script\b/i;
  function validateLibrary(lib){
    if(!lib||lib.schema!==LIBRARY_SCHEMA||!lib.prompts||typeof lib.prompts!=='object'||Array.isArray(lib.prompts))return{ok:false,errors:['library schema invalid']};
    const errors=[];
    const seen={};
    for(const domain of Object.keys(lib.prompts)){
      if(!DOMAINS.has(domain)){errors.push(`unknown domain ${domain}`);continue}
      const group=lib.prompts[domain];
      if(!group||typeof group!=='object'||Array.isArray(group)){errors.push(`group ${domain} invalid`);continue}
      for(const id of Object.keys(group)){
        const p=group[id];
        if(!p||!p.template||typeof p.template!=='string'){errors.push(`${domain}/${id} missing template`);continue}
        if(p.template.length>MAX_PROMPT_LEN)errors.push(`${domain}/${id} template too long`);
        if(SECRET.test(p.template))errors.push(`${domain}/${id} secret pattern`);
        const slots=slotNames(p.template);
        if(slots.length>MAX_SLOTS)errors.push(`${domain}/${id} too many slots`);
        for(const s of slots)seen[`${domain}/${id}/${s}`]=1;
      }
    }
    return{ok:errors.length===0,errors,slotCount:Object.keys(seen).length};
  }
  function renderPrompt(lib,domain,templateId,vars){
    const v=validateLibrary(lib);
    if(!v.ok)return{ok:false,reason:'invalid_library',prompt:null};
    if(!DOMAINS.has(domain)||!lib.prompts[domain]||!lib.prompts[domain][templateId])return{ok:false,reason:'template_not_found',prompt:null};
    const tpl=lib.prompts[domain][templateId].template;
    const slots=slotNames(tpl);
    const varsObj=vars&&typeof vars==='object'&&!Array.isArray(vars)?vars:{};
    const missing=slots.filter(s=>!(s in varsObj));
    if(missing.length)return{ok:false,reason:`missing_slot_${missing.join('_')}`,prompt:null};
    let out=tpl;
    for(const s of slots){
      let val=bound(varsObj[s],MAX_VAR_LEN);
      if(s==='itemJson'||s==='passageText')val=bound(varsObj[s],MAX_VAR_LEN).slice(0,3000);
      if(SECRET.test(val))return{ok:false,reason:`secret_in_slot_${s}`,prompt:null};
      out=out.replace(new RegExp(`\\{\\{${s}\\}\\}`,'g'),val);
    }
    if(out.length>MAX_PROMPT_LEN)return{ok:false,reason:'prompt_too_long',prompt:null};
    return{ok:true,prompt:out};
  }
  function loadLibrary(file){
    if(!fs||!path)return null;
    try{return JSON.parse(fs.readFileSync(file,'utf8'))}catch{return null}
  }
  return{LIBRARY_SCHEMA,DOMAINS,validateLibrary,renderPrompt,loadLibrary,slotNames};
});