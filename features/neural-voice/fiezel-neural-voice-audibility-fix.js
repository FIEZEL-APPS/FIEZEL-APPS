(function(root){
  'use strict';

  const runtime=root.FiezelVoiceRuntime;
  if(!runtime||runtime.__audibilityPatched)return;

  const DIAG_LIMIT=200;
  const READINESS_PATCH='m025-13-readiness-v1';
  const UX_PATCH='m025-18-persisted-ready-ux-v1';
  let backgroundReadyPromise=null;
  let automaticReadyAttempted=false;
  let uxObserver=null;

  function diag(entry){
    try{
      const key='fiezel-neural-voice-diagnostics-v1';
      const list=JSON.parse(root.localStorage?.getItem(key)||'[]');
      list.push({t:Date.now(),v:String(root.FIEZEL_VERSION||''),patch:'audibility-v1',...entry});
      root.localStorage?.setItem(key,JSON.stringify(list.slice(-DIAG_LIMIT)));
    }catch{}
  }

  function warmWebAudio(){
    try{
      const player=root.FiezelWebAudioPlayer?.createPlayer?.(root);
      player?.warm?.();
    }catch{}
  }

  function readinessErrorCode(error){
    const value=String(error?.message||error?.name||error||'').toLowerCase();
    if(value.includes('assets are not prepared'))return'assets_not_prepared';
    if(value.includes('cache verification failed'))return'cache_verification_failed';
    if(value.includes('initialization is still running'))return'init_still_running';
    if(value.includes('init timed out')||value.includes('initialization timed out'))return'init_timeout';
    if(value.includes('neural_circuit_open'))return'circuit_open';
    return'other';
  }

  async function ensureReady(){
    // Keep the user-gesture-sensitive WebAudio resume in the synchronous click turn,
    // before any CacheStorage await. m025-12 awaited refresh in the probe first.
    warmWebAudio();
    const before=runtime.status?.()||{};
    diag({patch:READINESS_PATCH,phase:'ensure_ready_enter',prepared:!!before.prepared,ready:!!before.ready});
    try{
      if(typeof runtime.refreshPreparedFlag==='function'){
        diag({patch:READINESS_PATCH,phase:'ensure_ready_refresh_enter'});
        const refreshed=await runtime.refreshPreparedFlag();
        const afterRefresh=runtime.status?.()||{};
        diag({patch:READINESS_PATCH,phase:'ensure_ready_refresh_ready',prepared:!!afterRefresh.prepared,refreshed:!!refreshed});
      }
      diag({patch:READINESS_PATCH,phase:'ensure_ready_base_enter'});
      const result=await runtime.ensureReady();
      const after=runtime.status?.()||{};
      diag({patch:READINESS_PATCH,phase:'ensure_ready_ready',prepared:!!after.prepared,ready:!!after.ready});
      return result;
    }catch(error){
      const after=runtime.status?.()||{};
      diag({patch:READINESS_PATCH,phase:'ensure_ready_error',code:readinessErrorCode(error),prepared:!!after.prepared,ready:!!after.ready});
      throw error;
    }
  }

  // m025-232: pickVoice() dan browserSpeakImmediate() DIHAPUS. Keduanya adalah keseluruhan
  // jembatan TTS peramban di berkas ini - pemilih suara perangkat, utterance, penjaga waktu
  // 12 detik, dan cancel-nya. Lapisan itu (L4) tidak ada lagi: di bawah L3 neural hanya ada
  // L5 teks senyap. Yang TIDAK ikut dihapus adalah showFallbackNotice() di bawah - lihat
  // catatannya di sana; ia sekarang menandai "giliran ini tidak bersuara", bukan "giliran ini
  // pindah ke suara perangkat".

  function currentRenderKey(node){
    if(!node)return'';
    try{return String(node.dataset?.fiezelNeuralUxKey||node.getAttribute?.('data-fiezel-neural-ux-key')||'')}catch{return''}
  }
  function setRenderKey(node,key){
    if(!node)return;
    try{
      if(node.dataset)node.dataset.fiezelNeuralUxKey=key;
      else node.setAttribute?.('data-fiezel-neural-ux-key',key);
    }catch{}
  }
  function setHtml(node,key,value){
    if(!node||currentRenderKey(node)===key)return;
    setRenderKey(node,key);
    node.innerHTML=value;
  }
  function setText(node,value){if(node&&String(node.textContent||'')!==value)node.textContent=value}
  function setDisabled(node,value){if(node&&node.disabled!==!!value)node.disabled=!!value}
  // m025-232: fungsi ini DIPERTAHANKAN, dan event 'fiezel-neural-voice-degraded' yang ia
  // kirim justru menjadi lebih penting sesudah L4 hilang. fiezel-speech-bridge.js mendengarkan
  // event itu untuk MEMATIKAN animasi mulut maskot; tanpa event ini mulut Pau akan terus
  // bergerak di atas keheningan L5 - persis kesan "aplikasinya menggantung" yang mahal.
  // Yang berubah hanya isi pesannya: `provider` dulu berbunyi 'browser-speech-synthesis' dan
  // itu sekarang bohong, dan salinan untuk murid dulu menjanjikan "audio sementara memakai
  // suara perangkat" - juga bohong. Kebenarannya: giliran ini tidak bersuara, teksnya tetap
  // terbaca.
  function showFallbackNotice(reason){
    const detail=String(reason||'neural_unavailable');
    diag({phase:'fallback_notice',reason:detail});
    try{
      const hint=root.document?.getElementById?.('neuralVoiceProgress');
      if(hint)setText(hint,'Suara neural sedang bermasalah. Bagian ini tampil sebagai teks tanpa suara; coba lagi setelah mesin neural siap.');
      root.dispatchEvent?.(new CustomEvent('fiezel-neural-voice-degraded',{detail:{reason:detail,provider:'silent-text',audible:false}}));
    }catch{}
  }

  function syncPersistedReadyUi(){
    try{
      const doc=root.document;
      if(!doc||typeof doc.getElementById!=='function')return;
      const prepareButton=doc.getElementById('prepareNeuralVoice');
      if(!prepareButton)return;
      const testButton=doc.getElementById('testNeuralVoice');
      const hint=doc.getElementById('neuralVoiceProgress');
      const state=runtime.status?.()||{};
      if(!state.prepared){
        // Verification is authoritative. If a stale marker is invalidated, return
        // the UI to the real one-time download state instead of pretending the
        // cached activation path still exists.
        setDisabled(prepareButton,false);
        setHtml(prepareButton,'unprepared','<i data-lucide="download"></i> Siapkan suara offline');
        setDisabled(testButton,true);
        setText(hint,'Aset suara offline belum lengkap. Siapkan sekali untuk mengunduh dan memverifikasi model lokal.');
        return;
      }
      if(state.ready){
        setDisabled(prepareButton,true);
        setHtml(prepareButton,'ready','<i data-lucide="badge-check"></i> Suara neural aktif');
        setDisabled(testButton,false);
        if(hint&&/Model tersimpan|Aset suara offline|Mengaktifkan mesin neural/i.test(String(hint.textContent||'')))setText(hint,'Aset suara offline tersimpan. Mesin neural aktif dan siap dipakai.');
      }else if(backgroundReadyPromise){
        setDisabled(prepareButton,true);
        setHtml(prepareButton,'warming','<i data-lucide="loader-circle"></i> Mengaktifkan neural…');
        setDisabled(testButton,true);
        if(hint&&/Model tersimpan|Aset suara offline|Mengaktifkan mesin neural|Mengunduh aset suara|Menyiapkan mesin suara/i.test(String(hint.textContent||'')))setText(hint,'Aset suara offline sudah tersimpan. Mesin neural sedang diaktifkan di latar; selama pemanasan latihan Listening tampil sebagai teks tanpa suara.');
      }else{
        setDisabled(prepareButton,false);
        setHtml(prepareButton,'cached-cold','<i data-lucide="zap"></i> Aktifkan suara neural');
        setDisabled(testButton,true);
        if(hint&&/Model tersimpan|Mengunduh aset suara|Menyiapkan mesin suara|Aset suara offline/i.test(String(hint.textContent||'')))setText(hint,'Aset suara offline sudah tersimpan. Aktifkan mesin neural tanpa mengunduh ulang aset.');
      }
    }catch{}
  }

  function primeBackgroundReady(options={}){
    const automatic=options.automatic===true;
    const state=runtime.status?.()||{};
    if(!state.prepared||state.ready||typeof runtime.ensureReady!=='function')return Promise.resolve(state);
    if(backgroundReadyPromise)return backgroundReadyPromise;
    if(automatic&&automaticReadyAttempted)return Promise.resolve(state);
    if(automatic)automaticReadyAttempted=true;
    diag({patch:UX_PATCH,phase:'background_ready_start',prepared:true,automatic});
    backgroundReadyPromise=ensureReady().then(result=>{
      const after=runtime.status?.()||{};
      diag({patch:UX_PATCH,phase:'background_ready',prepared:!!after.prepared,ready:!!after.ready,automatic});
      return result;
    }).catch(error=>{
      const after=runtime.status?.()||{};
      diag({patch:UX_PATCH,phase:'background_ready_error',code:readinessErrorCode(error),prepared:!!after.prepared,ready:!!after.ready,automatic});
      throw error;
    }).finally(()=>{
      backgroundReadyPromise=null;
      syncPersistedReadyUi();
    });
    // m025-232: pemanasan latar tetap tidak boleh menjadi unhandled rejection. Dulu alasannya
    // "audio biasa sudah selesai lewat jembatan peramban"; jembatan itu sudah dihapus, tapi
    // alasannya masih berlaku dalam bentuk lain - primeBackgroundReady() dipanggil juga dari
    // MutationObserver dan dari klik tombol yang penolakannya sudah ditangani di tempat lain.
    backgroundReadyPromise.catch(()=>{});
    return backgroundReadyPromise;
  }

  function installPersistedReadyUx(){
    const doc=root.document;
    if(!doc||typeof doc.addEventListener!=='function')return;
    const refresh=()=>{
      const state=runtime.status?.()||{};
      // One automatic attempt belongs to one continuous prepared+cold epoch. A
      // verified unprepared state or a successfully ready state closes that epoch.
      // A failure that remains prepared+cold deliberately keeps the latch set so
      // MutationObserver/Lucide DOM activity cannot re-arm hidden init attempts.
      if(!state.prepared||state.ready)automaticReadyAttempted=false;
      syncPersistedReadyUi();
      const prepareButton=typeof doc.getElementById==='function'?doc.getElementById('prepareNeuralVoice'):null;
      if(prepareButton&&state.prepared&&!state.ready&&!backgroundReadyPromise&&!automaticReadyAttempted){
        primeBackgroundReady({automatic:true}).catch(()=>{});
        syncPersistedReadyUi();
      }
    };
    doc.addEventListener('click',event=>{
      let button=null;
      try{button=event?.target?.closest?.('#prepareNeuralVoice')||null}catch{}
      if(!button)return;
      const state=runtime.status?.()||{};
      if(!state.prepared||state.ready)return;
      // Cached assets already exist. Do not allow the legacy app handler to send
      // this user back through the download/prepare ritual. An explicit click may
      // retry a failed automatic activation, but still never calls runtime.prepare().
      try{event.preventDefault?.();event.stopImmediatePropagation?.()}catch{}
      diag({patch:UX_PATCH,phase:'prepared_activation_click'});
      const warming=primeBackgroundReady({automatic:false});
      syncPersistedReadyUi();
      warming.catch(()=>{});
    },true);
    if(typeof root.MutationObserver==='function'){
      try{
        uxObserver=new root.MutationObserver(refresh);
        uxObserver.observe(doc.documentElement||doc.body,{childList:true,subtree:true});
      }catch{}
    }
    if(String(doc.readyState||'')==='loading')root.addEventListener?.('DOMContentLoaded',refresh,{once:true});
    else refresh();
  }

  // m025-232: kelima cabang yang dulu berakhir di browserSpeakImmediate() kini berakhir sama:
  // neural berbunyi, atau penolakan naik ke pemanggil. Perbedaan `neuralOnly` (allowFallback
  // === false) ikut hilang karena ia hanya pernah berarti "jangan pakai TTS peramban" - sesuatu
  // yang sekarang berlaku untuk SEMUA pemanggil, jadi menyimpannya berarti menyimpan dua nama
  // untuk satu perilaku. allowFallback:false tetap diteruskan ke runtime supaya kontraknya
  // tersurat di titik panggil.
  async function speak(text,options={}){
    warmWebAudio();
    const state=runtime.status?.()||{};
    if(state.circuitOpen){
      const reason=String(state.lastFallbackReason||state.error||'previous_failure');
      diag({phase:'circuit_open',reason});
      // runtime.speak() sendiri yang melempar `neural_circuit_open:...` berikut sebabnya;
      // meneruskan lemparan itu apa adanya lebih berguna daripada galat baru buatan sini.
      return runtime.speak(text,{...options,allowFallback:false});
    }
    if(!state.ready){
      diag({phase:'audibility_first',prepared:!!state.prepared});
      if(state.prepared&&typeof runtime.ensureReady==='function'){
        // A user-requested utterance is explicit intent and may retry even when the
        // background automatic attempt for this prepared+cold epoch already failed.
        const warming=primeBackgroundReady({automatic:false});
        // m025-232 TITIK PALING RAWAN DI BERKAS INI. Dulu cabang ini menjawab SEKETIKA dengan
        // TTS peramban sementara mesin neural memanas di latar - murid mendapat bunyi tanpa
        // menunggu. Sesudah L4 dihapus tidak ada lagi yang bisa mengisi jeda itu, jadi satu-
        // satunya jawaban jujur adalah MENUNGGU pemanasan lalu bicara neural, atau melempar.
        // Yang dilarang keras di sini: resolve true tanpa audio. Pemanggil akan menganggap
        // giliran ini berbunyi, subtitle L5 tidak pernah muncul, dan mulut maskot bergerak di
        // atas keheningan.
        diag({patch:UX_PATCH,phase:'cold_wait_neural',prepared:true});
        try{
          await warming;
        }catch(error){
          const reason=String(error?.message||error);
          diag({phase:'neural_resume_error',error:reason});
          showFallbackNotice(reason);
          throw error;
        }
        const warmed=runtime.status?.()||{};
        if(warmed.ready){
          try{return await runtime.speak(text,{...options,allowFallback:false})}
          catch(error){
            const reason=String(error?.message||error);
            diag({phase:'neural_throw_fallback',error:reason});
            showFallbackNotice(reason);
            throw error;
          }
        }
      }
      // Pemanasan selesai tanpa membuat mesin siap, atau aset memang belum prepared: runtime
      // yang memutuskan galatnya (`assets are not prepared`, `cache verification failed`, ...)
      // supaya pemanggil dan diagnostik melihat sebab yang sama.
      return runtime.speak(text,{...options,allowFallback:false});
    }
    try{return await runtime.speak(text,{...options,allowFallback:false})}
    catch(error){
      const reason=String(error?.message||error);
      diag({phase:'neural_throw_fallback',error:reason});
      showFallbackNotice(reason);
      throw error;
    }
  }

  // m025-232: yang perlu dihentikan tinggal mesin neural. Blok pembatalan antrean bicara
  // peramban di sini menjadi kode mati begitu browserSpeakImmediate() dihapus - tidak ada lagi
  // yang pernah menyalakan penandanya.
  function stop(){
    const state=runtime.status?.()||{};
    if(state.ready){try{runtime.stop?.()}catch{}}
  }

  function status(){
    const base=runtime.status?.()||{};
    const wasmPolicy=String(root.__fiezelNeuralWasmPolicy||base.wasmPolicy||'default');
    return Object.freeze({...base,wasmPolicy,audibilityPatch:'v1',persistedReadyUxPatch:'m025-18'});
  }

  // m025-232: penanda __fiezelTtsUnlocked ikut hilang bersama pemanasan volume-0 di bootstrap
  // yang dulu ia tahan, dan browserSpeakImmediate tidak lagi diekspor - permukaan publik berkas
  // ini sekarang murni neural.
  root.FiezelVoiceRuntime=Object.freeze({...runtime,status,ensureReady,speak,stop,__audibilityPatched:true});
  installPersistedReadyUx();
  diag({phase:'audibility_patch_loaded'});
})(typeof globalThis!=='undefined'?globalThis:this);