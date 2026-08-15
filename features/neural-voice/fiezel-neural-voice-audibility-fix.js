(function(root){
  'use strict';

  const runtime=root.FiezelVoiceRuntime;
  if(!runtime||runtime.__audibilityPatched)return;

  const BROWSER_TTS_TIMEOUT_MS=Number(root.FIEZEL_BROWSER_TTS_TIMEOUT_MS)||12000;
  let browserActive=false;
  let activeUtterance=null;

  function diag(entry){
    try{
      const key='fiezel-neural-voice-diagnostics-v1';
      const list=JSON.parse(root.localStorage?.getItem(key)||'[]');
      list.push({t:Date.now(),v:String(root.FIEZEL_VERSION||''),patch:'audibility-v1',...entry});
      root.localStorage?.setItem(key,JSON.stringify(list.slice(-200)));
    }catch{}
  }

  function warmWebAudio(){
    try{
      const player=root.FiezelWebAudioPlayer?.createPlayer?.(root);
      player?.warm?.();
    }catch{}
  }

  function pickVoice(lang){
    try{
      const voices=root.speechSynthesis?.getVoices?.()||[];
      const wanted=String(lang||'en-US').toLowerCase();
      return voices.find(v=>String(v.lang||'').toLowerCase()===wanted)
        ||voices.find(v=>String(v.lang||'').toLowerCase().startsWith(wanted.split('-')[0]))
        ||null;
    }catch{return null}
  }

  function browserSpeakImmediate(text,options={}){
    if(!root.speechSynthesis||!root.SpeechSynthesisUtterance){
      diag({phase:'browser_unavailable'});
      return Promise.reject(new Error('Browser TTS unavailable'));
    }
    warmWebAudio();
    return new Promise((resolve,reject)=>{
      let done=false,started=false,timer=null;
      const finish=(ok,value)=>{
        if(done)return;
        done=true;
        if(timer)clearTimeout(timer);
        browserActive=false;
        activeUtterance=null;
        try{root.__fiezelActiveUtterance=null}catch{}
        if(ok)resolve(value);else reject(value);
      };
      let utterance;
      try{utterance=new root.SpeechSynthesisUtterance(String(text||''))}catch(error){finish(false,error);return}
      activeUtterance=utterance;
      root.__fiezelActiveUtterance=utterance;
      browserActive=true;
      utterance.lang=options.lang||'en-US';
      utterance.rate=Number(options.speed||options.rate||.88);
      const voice=pickVoice(utterance.lang);
      if(voice)utterance.voice=voice;
      utterance.onstart=()=>{started=true;diag({phase:'browser_start',lang:utterance.lang})};
      utterance.onend=()=>{diag({phase:'browser_end'});finish(true,{provider:'browser-speech-synthesis',started:true})};
      utterance.onerror=event=>{
        const reason=String(event?.error||'error');
        diag({phase:'browser_error',reason});
        finish(false,new Error(`browser_tts_${reason}`));
      };
      timer=setTimeout(()=>{
        const reason=started?'browser_tts_timeout':'browser_tts_not_started';
        diag({phase:'browser_timeout',reason});
        try{root.speechSynthesis.cancel()}catch{}
        finish(false,new Error(reason));
      },BROWSER_TTS_TIMEOUT_MS);
      try{
        if(root.speechSynthesis.paused&&typeof root.speechSynthesis.resume==='function')root.speechSynthesis.resume();
        root.speechSynthesis.speak(utterance);
        diag({phase:'browser_enqueued',lang:utterance.lang});
      }catch(error){finish(false,error)}
    });
  }

  async function speak(text,options={}){
    warmWebAudio();
    const state=runtime.status?.()||{};
    if(!state.ready){
      diag({phase:'audibility_first',prepared:!!state.prepared});
      const audible=browserSpeakImmediate(text,options);
      if(state.prepared&&typeof runtime.prepare==='function'){
        audible.finally(()=>{
          setTimeout(()=>{
            runtime.prepare().then(()=>diag({phase:'neural_warm_ready'})).catch(error=>diag({phase:'neural_warm_error',error:String(error?.message||error)}));
          },0);
        }).catch(()=>{});
      }
      return audible;
    }
    try{return await runtime.speak(text,options)}
    catch(error){
      diag({phase:'neural_throw_fallback',error:String(error?.message||error)});
      return browserSpeakImmediate(text,options);
    }
  }

  function stop(){
    const state=runtime.status?.()||{};
    if(browserActive){
      try{root.speechSynthesis?.cancel?.()}catch{}
      browserActive=false;
      activeUtterance=null;
      try{root.__fiezelActiveUtterance=null}catch{}
    }
    if(state.ready){try{runtime.stop?.()}catch{}}
  }

  function status(){return Object.freeze({...runtime.status?.(),audibilityPatch:'v1'})}

  // Prevent the bootstrap's zero-volume speech warmup from occupying Safari's speech queue.
  root.__fiezelTtsUnlocked=true;
  root.FiezelVoiceRuntime=Object.freeze({...runtime,status,speak,stop,browserSpeakImmediate,__audibilityPatched:true});
  diag({phase:'audibility_patch_loaded'});
})(typeof globalThis!=='undefined'?globalThis:this);
