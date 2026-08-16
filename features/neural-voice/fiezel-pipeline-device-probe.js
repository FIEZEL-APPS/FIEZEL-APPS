(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.FiezelPipelineDeviceProbe=api;
  if(root.document)api.install(root);
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  const PROBE_SENTENCES=Object.freeze([
    'Learning English becomes easier when practice is regular, focused, and connected to real goals, because a student can build confidence by reading useful passages, noticing new vocabulary, checking how grammar works inside complete sentences, and speaking aloud even when every word is not perfect, while small sessions repeated across the week often become more valuable than one long session followed by several days without practice because memory improves when ideas are recalled before they are forgotten.',
    'For this diagnostic test, FIEZEL is intentionally reading a longer passage so the local neural voice must process more than one chunk, and the first part should begin playing normally while the application prepares the next chunk in the background without starting a second model inference at the same time, then the second part must wait until the first playback finishes and continue in order without repeating words, skipping text, switching to browser speech, or producing overlapping audio, on the same Apple device today.'
  ]);
  const PROBE_TEXT=PROBE_SENTENCES.join(' ');
  const PROBE_WORD_COUNT=PROBE_TEXT.trim().split(/\s+/).length;
  const BUTTON_ID='fiezelPipelineProbe';

  async function run(env){
    const runtime=env&&env.FiezelVoiceRuntime;
    if(!runtime||typeof runtime.speak!=='function')throw new Error('neural_runtime_unavailable');
    if(typeof runtime.ensureReady==='function')await runtime.ensureReady();
    return runtime.speak(PROBE_TEXT,{voice:'af_heart',lang:'en-US',speed:.92,allowFallback:false});
  }

  function mount(env){
    const bar=env.document&&env.document.getElementById('fiezelDiagBar');
    if(!bar||env.document.getElementById(BUTTON_ID))return false;
    const button=env.document.createElement('button');
    button.id=BUTTON_ID;
    button.type='button';
    button.textContent='Tes pipeline';
    button.setAttribute('aria-label','Tes pipeline neural dua chunk');
    button.addEventListener('click',async function(){
      if(button.disabled)return;
      const original=button.textContent;
      button.disabled=true;
      button.textContent='Tes pipeline…';
      try{
        const result=await run(env);
        button.textContent=result&&Number(result.chunks)>=2?'Pipeline selesai':'Probe tidak multi-chunk';
      }catch(error){
        button.textContent='Pipeline gagal';
      }finally{
        env.setTimeout(function(){button.textContent=original;button.disabled=false;},2600);
      }
    });
    bar.insertBefore(button,bar.firstChild||null);
    return true;
  }

  function install(env){
    function ready(){
      if(mount(env))return;
      if(!env.MutationObserver||!env.document.body)return;
      const observer=new env.MutationObserver(function(){if(mount(env))observer.disconnect()});
      observer.observe(env.document.body,{childList:true,subtree:true});
    }
    if(env.document.readyState==='loading')env.document.addEventListener('DOMContentLoaded',ready,{once:true});
    else ready();
  }

  return Object.freeze({PROBE_TEXT,PROBE_WORD_COUNT,run,install});
});
