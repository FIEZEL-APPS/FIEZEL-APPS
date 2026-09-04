/*
 * FIEZEL Speaking + Listening Sidecar v1
 * Candidate ADD-ONLY runtime. No dependency on FIEZEL canonical state.
 * Speaking score = spoken production / target coverage. It is NOT a pronunciation score.
 */
(function(root,factory){
  const api=factory(root||globalThis);
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.FiezelSLAddon=api;
})(typeof self!=='undefined'?self:this,function(global){
  'use strict';

  // AI-02 F01: naskah murid diambil dari lapisan i18n (copy-id-feat-b.js). Di browser
  // runtime-nya dimuat lebih dulu (index.html); di Node modul memuatnya sendiri supaya
  // keluaran render tetap byte-identik dengan sebelumnya.
  var I18N = (typeof globalThis !== 'undefined' && globalThis.FiezelI18n) || null;
  if (!I18N && typeof require === 'function') {
    try {
      I18N = require('../i18n/fiezel-i18n.js');
      /* m025-202. Dua cacat di jalur Node ini, keduanya membuat T() jatuh ke `String(key)`
       * sehingga render mengeluarkan "fsl.audio-error-title" mentah - memecah gerbang tangga
       * suara DAN membatalkan janji "byte-identik dengan sebelumnya" di komentar di atas.
       *
       * (1) Hanya copy-id-feat-b.js yang dimuat, padahal kunci berkas ini tersebar di beberapa
       *     peta - `fsl.audio-error-*` ada di copy-id-feat-d.js. Sekarang dimuat per-daftar-isi,
       *     bukan per-nama, supaya perpindahan kunci antar-peta tidak diam-diam memutusnya lagi.
       * (2) Setiap peta membuka dengan `(typeof self!=='undefined'?self:this).FiezelI18n` di
       *     dalam IIFE 'use strict'. Di Node `self` tidak ada dan `this` adalah undefined, jadi
       *     baris itu MELEMPAR - bukan gagal lunak seperti yang dimaksudkan `if(!I18N)return`
       *     satu baris di bawahnya. Lemparan itu ditangkap catch di bawah, yang lalu menyetel
       *     I18N=null dan membisukan SEMUA kunci. Disediakan `self` dan `FiezelI18n` di global
       *     lebih dulu supaya peta menemukan yang dicarinya, persis seperti di index.html. */
      const g = globalThis;
      if (typeof g.self === 'undefined') g.self = g;
      if (!g.FiezelI18n) g.FiezelI18n = I18N;
      const i18nPath = require('path');
      const i18nDir = i18nPath.join(__dirname, '..', 'i18n');
      for (const name of require('fs').readdirSync(i18nDir).filter((n) => /^copy-id-.*\.js$/.test(n)).sort()) {
        try { require(i18nPath.join(i18nDir, name)); } catch (_) { /* satu peta rusak tidak boleh membisukan sisanya */ }
      }
    } catch (loadError) { I18N = null; }
  }
  function T(key, params) { return I18N ? I18N.t(key, params) : String(key); }

  /* m025-246: sakelar penyederhanaan pengalaman. Addon ini dimuat malas dan bisa
     dievaluasi sebelum fiezel-ux-flags.js sempat mendarat, dan di Node ia dimuat
     lewat require() tanpa index.html sama sekali - jadi ketiadaan FiezelUX bukan
     kegagalan, ia keadaan yang normal. `uxOn` dipanggil SAAT RENDER (bukan sekali
     saat definisi modul) supaya urutan muat tidak bisa membekukan jawabannya, dan
     jatuh ke daftar bawaan yang sama dengan berkas benderanya. */
  var UX_ADDON_FALLBACK = { skillExams: false, skillsLabDestination: false };
  function uxOn(flag) {
    try {
      var api = (typeof globalThis !== 'undefined' && globalThis.FiezelUX) || null;
      if (api && typeof api.on === 'function') return api.on(flag) === true;
    } catch (_) {}
    if (typeof require === 'function' && typeof module === 'object') {
      try { return require('../../fiezel-ux-flags.js').on(flag) === true; } catch (_) {}
    }
    return UX_ADDON_FALLBACK[flag] === true;
  }

  // m028 fase3 (PATCH-PLAN §3): pemutar latihan dengar.
  //
  // Sampai rilis ini "Dengarkan" hanyalah satu tombol di antara tombol lain, dan tidak ada
  // apa pun di layar yang menandakan bahwa layar ini tentang SUARA. Baris pemutar memberi
  // dua penanda: wajah PAW yang sedang mendengarkan, dan gelombang.
  //
  // Gelombangnya STATIS dan itu disengaja: addon TTS tidak mengekspos buffer audio, jadi
  // visualisasi yang bergerak mengikuti suara akan menjadi kebohongan yang digambar. Ia
  // dekorasi, karena itu aria-hidden dan tidak pernah membawa informasi.
  //
  // Wajah maskot memakai pola fallback yang sama dengan coach-bubble pawFace(): kalau
  // custom element belum siap, ikon paw yang tampil - tidak pernah kotak kosong.
  /* Sembilan batang: cukup untuk terbaca sebagai equalizer di 320px, masih cukup jarang
     untuk tidak jadi bubur di 188px. --i dipakai CSS sebagai jeda animasi per batang. */
  const EQ_BARS=Array.from({length:9},(_,i)=>'<i style="--i:'+i+'"></i>').join('');
  function slPawReady(){try{return !!global.FiezelPaw?.ready?.()}catch(_){return false}}
  /* PANGGUNG DENGAR (permintaan OWNER 2026-08-31, rujukan bahasa visual Duolingo).
     Sebelum ini maskotnya 48px, dipotong bulat, dan berdiri sebaris dengan gelombang -
     jadi ia terbaca sebagai IKON di samping status, bukan sebagai tokoh. Duolingo menaruh
     karakternya sebagai jangkar emosi layar: besar, di tengah, tidak terpotong.
     Tiga perubahan yang membuatnya jadi tokoh, bukan ikon:
       1. Kotaknya TIDAK overflow:hidden dan TIDAK bulat, jadi telinga, ekor, dan bayangan
          lantai ikut terlihat - itulah yang membedakan "tokoh" dari "avatar".
       2. Ukurannya ikut ruang yang tersisa, bukan piksel mati.
       3. SUSUNANNYA MENDATAR (revisi 2026-08-31 setelah owner mengirim rujukan Duolingo):
          maskot di KIRI, gelembung ucap di KANAN, sejajar - bukan bertumpuk di tengah.
          Dua alasan, dan keduanya sama kuat. Pertama, itu memang bahasa visual yang
          diminta: tokoh yang sedang BERBICARA kepada murid, bukan maskot yang dipajang.
          Kedua, ia jauh lebih murah secara tinggi - satu baris mendatar memakai tinggi
          maskot saja, sementara susunan tegak memakai tinggi maskot DITAMBAH gelombang
          DITAMBAH status. Ruang yang dihemat jatuh ke pilihan jawaban, yang justru bagian
          yang harus selalu terlihat.
     EQUALIZER (OWNER 2026-08-31: "buatkan equalizernya hidup ketika audio diputar").
     Batasnya nyata dan tidak berubah: tidak ada createAnalyser di mana pun di repo ini,
     dan FiezelVoiceSay tidak memapar AudioContext-nya - jadi bentuk gelombang SUNGGUHAN
     memang tidak tersedia tanpa membongkar tumpukan neural-voice milik tim lain.
     Karena itu batangnya TIDAK mengaku sebagai bentuk gelombang audio. Ia penanda
     keadaan: bergerak PERSIS selama pemutaran berlangsung, diam sebelum dan sesudahnya.
     Pernyataan yang dibuatnya - "suaranya sedang berjalan sekarang" - benar, dan itulah
     bedanya dengan visualisasi palsu yang dulu sengaja dihindari di sini: yang dilarang
     bukan geraknya, melainkan mengklaim gerak itu berasal dari audio yang tidak dibaca.
     Kelas .is-playing dipasang dan dilepas di handler [data-play] (blok try/finally),
     jadi ia tidak bisa tertinggal menyala kalau pemutaran gagal atau kehabisan waktu.
     Tetap aria-hidden: pembaca layar mendapat kabarnya dari chip [data-replays]. */
  function slPlayerMarkup(){
    const face=slPawReady()
      ?'<fiezel-mascot class="fsl-mascot"></fiezel-mascot>'
      :'<span class="fz-i" data-fz-icon="paw"></span>';
    return '<div class="fsl-player fsl-player-stage" aria-hidden="true">'
      +'<span class="fsl-mascot-slot">'+face+'</span>'
      +'<span class="fsl-bubble">'
        +'<span class="fsl-wave fsl-eq">'+EQ_BARS+'</span>'
        +'<span class="fsl-replays" data-replays>'+T('skillslab.not-played')+'</span>'
      +'</span></div>';
  }
  /* R2-4: sesi speaking dan latihan ujian tidak punya fsl-player (tidak ada audio yang
     dimainkan maskot), tetapi maskotnya tetap harus hadir DI ATAS panel soal seperti di
     semua tipe sesi lain. Strip ini murni dekorasi (aria-hidden) dengan fallback paw yang
     sama; ekspresinya digerakkan host lewat options.onAnswerFeedback -> FiezelPaw. */
  function slMascotStripMarkup(){
    const face=slPawReady()
      ?'<fiezel-mascot class="fsl-mascot"></fiezel-mascot>'
      :'<span class="fz-i" data-fz-icon="paw"></span>';
    return '<div class="fsl-mascot-strip" aria-hidden="true"><span class="fsl-mascot-slot">'+face+'</span></div>';
  }

  /* ---- Gem Terjemahan (reports/recon-listening-gems.md Bagian B) ---------------------
   *
   * Aturan ekonominya TIDAK ditulis di sini. Ia hidup di features/speaking-listening/gems-core.js
   * sebagai fungsi murni supaya gems-test.js bisa mengujinya tanpa DOM, dan supaya app.js
   * (pemegang state kanonik) memakai aturan yang sama persis. Addon hanya menyumbang dua hal
   * yang memang miliknya: penghitung runtun PER SESI dan tempat baris terjemahan dirender.
   *
   * Ketiadaan modul bukan galat: kalau FiezelGems belum termuat, hadiah tidak diberikan dan
   * toggle tidak pernah aktif. Sesi latihan tetap jalan penuh - fitur uang tidak boleh bisa
   * mematikan fitur belajar.
   */
  // `global` di pembungkus UMD ini adalah `self` di peramban, tetapi di Node ia jatuh ke
  // `this` alias module.exports - bukan lingkup global. Tanpa penyelesai ini, gerbang
  // gems-test.js akan lolos secara palsu: gemsApi() selalu null, jadi tidak ada satu pun
  // aturan ekonomi yang benar-benar dijalankan. Lingkup nyata dicari eksplisit.
  function hostScope(){
    if(global&&(global.FiezelGems||global.FiezelSubtitleTranslate))return global;
    if(typeof globalThis!=='undefined')return globalThis;
    if(typeof self!=='undefined')return self;
    return global||{};
  }
  /* AI-02 F01: gems-core.js terkunci sha256, jadi teks multibahasa TIDAK ditaruh di sana.
   * Overlay ini bekerja di lapisan konsumen: locale id memakai objek FiezelGems asli apa
   * adanya (byte-identik, nol perubahan perilaku); locale lain membungkusnya dan hanya
   * mengganti anggota TEKS lewat FiezelI18n ('gems.<slug>'), logika saldo tetap di modul
   * terkunci. Kunci th terdaftar terpisah (copy-th-gems.js, Wave 3). */
  function gemsI18nOverlay(g){
    if(!g||!I18N||typeof I18N.getLocale!=='function'||I18N.getLocale()==='id')return g;
    const kunci=k=>'gems.'+String(k).replace(/([A-Z])/g,'-$1').toLowerCase();
    /* v49-F2 2026-08-29: FiezelGems dibekukan (Object.freeze) \u2014 assignment biasa pada objek
       ber-prototype beku melempar TypeError di 'use strict' dan gemsApi() menelan errornya,
       mematikan ekonomi gem diam-diam untuk locale th. defineProperty tidak terpengaruh
       writable prototype, jadi overlay tetap hidup. */
    const w=Object.create(g);
    const pasang=(k,v)=>{Object.defineProperty(w,k,{value:v,enumerable:true,configurable:true})};
    if(g.GEMS_COPY){
      const peta={};
      Object.keys(g.GEMS_COPY).forEach(k=>{peta[k]=I18N.t(kunci(k))});
      pasang('GEMS_COPY',Object.freeze(peta));
    }
    if(typeof g.chipAria==='function')pasang('chipAria',b=>I18N.t('gems.chip-aria',{saldo:b}));
    if(typeof g.streakToast==='function')pasang('streakToast',(s,n)=>I18N.t('gems.streak-toast',{s:s,n:n}));
    return w;
  }
  function gemsApi(){try{return gemsI18nOverlay(hostScope().FiezelGems||null)}catch(_){return null}}
  function gemsRules(){const g=gemsApi();return g?g.GEMS_RULES:{streakTarget:5,perAward:2,maxAwardsPerSession:2,translationCost:1}}
  function gemsCopy(){const g=gemsApi();return g?g.GEMS_COPY:null}
  function gemsAwardFor(streak,awards){const g=gemsApi();try{return g&&typeof g.gemsAward==='function'?g.gemsAward(streak,awards):0}catch(_){return 0}}

  const ADDON_SCHEMA='fiezel-speaking-listening-addon-v1';
  const STATE_SCHEMA='fiezel-speaking-listening-state-v1';
  const EVIDENCE_SCHEMA='fiezel-speaking-listening-evidence-v1';
  const DEFAULT_CONFIG=Object.freeze({
    enabled:false,
    storageKey:'fiezel-sl-v1-state',
    language:'en-US',
    ttsRate:.86,
    maxListeningReplays:2,
    recognitionMode:'browser-default',
    persistRawAudio:false,
    persistRawTranscript:false,
    aggregateEventLimit:120
  });
  /* m026-BUG1: ambang tunggu audio latihan dengar.
   *
   * Dulu 35.000 ms ditulis langsung di dalam pendengar tombol. Dua hal salah dengan itu:
   * murid menatap tombol mati lebih dari setengah menit sebelum tahu suaranya gagal, dan
   * angkanya tidak bisa dibaca dari mana pun kecuali dari dalam handler. cf-b4 §5.2 dan
   * cf-a10 §6 menyebut 35 s sebagai penahan slot kuota yang kelewat longgar; ia kini
   * sejajar dengan CALL_TIMEOUT_MS jalur suara (fiezel-puter-voice.js).
   */
  const TTS_TIMEOUT_MS=25000;
  const LEVELS=Object.freeze(['A1','A2','B1','B2','C1','C2']);
  const DEFAULT_ACTIVE_LEVEL='A1';
  const hasOwn=(value,key)=>Object.prototype.hasOwnProperty.call(value||{},key);
  /**
   * Normalize the level contract shared by the host application and every skill
   * sidecar. A bad host value must never widen the bank to all levels, so an
   * explicitly supplied but invalid value falls back to the safe A1 track.
   */
  const normalizeLevel=value=>{
    const level=String(value??'').trim().toUpperCase();
    return LEVELS.includes(level)?level:null
  };
  function createLevelContract(options,config){
    const source=options||{},cfg=config||{};
    const getter=typeof source.getActiveLevel==='function'?source.getActiveLevel:
      (typeof cfg.getActiveLevel==='function'?cfg.getActiveLevel:null);
    const explicitlyProvided=hasOwn(source,'activeLevel')||hasOwn(source,'initialLevel')||
      hasOwn(cfg,'activeLevel')||hasOwn(cfg,'initialLevel')||!!getter;
    let candidate;
    try{candidate=getter?getter():source.activeLevel??source.initialLevel??cfg.activeLevel??cfg.initialLevel}catch{}
    return {external:explicitlyProvided, getter, level:normalizeLevel(candidate)||DEFAULT_ACTIVE_LEVEL};
  }
  const now=()=>Date.now();
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,Number(n)||0));
  const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  /**
   * m025-117: bank latihan menyimpan token {name}, bukan nama sungguhan - contoh jawaban
   * "My name is {name}" harus berbunyi nama MURID INI, bukan nama orang lain yang kebetulan
   * ada di kode saat bank ini ditulis. Nama dibaca dari aplikasi lewat pengait opsional,
   * jadi sidecar ini tetap bisa dimuat dan diuji tanpa aplikasi. Tanpa nama, tokennya
   * dibuang beserta spasi berlebihnya sehingga kalimatnya tetap wajar.
   */
  const learnerName=env=>{
    try{const state=env&&typeof env.__getFiezelState==='function'?env.__getFiezelState():null;const stored=String((state&&state.userName)||'').trim();if(stored)return stored}catch(_){}
    // Sapaan cadangan milik app.js selalu terisi, jadi contoh jawaban tidak pernah berakhir
    // menggantung seperti "My name is ." pada jendela sempit sebelum namanya diberikan.
    try{if(env&&typeof env.learnerName==='function')return String(env.learnerName()||'').trim()}catch(_){}
    return ''
  };
  const personalizeText=(value,name)=>String(value??'').replace(/\s*\{name\}/g,name?' '+name:'').replace(/\s{2,}/g,' ').trim();
  const personalizeItems=(env,items)=>{
    const name=learnerName(env);
    return (Array.isArray(items)?items:[]).map(item=>{
      if(!item||typeof item!=='object')return item;
      const out={...item};
      for(const key of ['prompt','script','targetText','sampleAnswer','translation','hint'])
        if(typeof out[key]==='string')out[key]=personalizeText(out[key],name);
      return out
    })
  };
  // R4: kontraksi baku diekspansi di KEDUA sisi sebelum perbandingan token, supaya transkripsi
  // setia yang memakai kontraksi ("I'm ten and I can't swim.") tidak dinilai salah terhadap naskah
  // bentuk penuh ("I am ten and I cannot swim."). Hanya bentuk TAK-AMBIGU yang diekspansi:
  // bentuk 'd (would/had), he's/she's ('s bisa is atau has), ain't, "its" tanpa apostrof (posesif),
  // dan kata nyata seperti were/ill/well/shell/hell/lets/id/wed/shed sengaja TIDAK diekspansi.
  // Bentuk tanpa apostrof (im, cant, dont, ...) ikut diekspansi karena pelajar sering mengetik tanpa apostrof.
  const CONTRACTION_MAP={"i'm":'i am',im:'i am',"can't":'cannot',cant:'cannot',"won't":'will not',wont:'will not',"don't":'do not',dont:'do not',"doesn't":'does not',doesnt:'does not',"didn't":'did not',didnt:'did not',"isn't":'is not',isnt:'is not',"aren't":'are not',arent:'are not',"wasn't":'was not',wasnt:'was not',"weren't":'were not',werent:'were not',"haven't":'have not',havent:'have not',"hasn't":'has not',hasnt:'has not',"hadn't":'had not',hadnt:'had not',"couldn't":'could not',couldnt:'could not',"shouldn't":'should not',shouldnt:'should not',"wouldn't":'would not',wouldnt:'would not',"mustn't":'must not',mustnt:'must not',"needn't":'need not',neednt:'need not',"shan't":'shall not',shant:'shall not',"mightn't":'might not',mightnt:'might not',"oughtn't":'ought not',oughtnt:'ought not',"it's":'it is',"that's":'that is',thats:'that is',"there's":'there is',theres:'there is',"here's":'here is',heres:'here is',"what's":'what is',whats:'what is',"who's":'who is',whos:'who is',"where's":'where is',wheres:'where is',"how's":'how is',hows:'how is',"when's":'when is',whens:'when is',"let's":'let us',"you're":'you are',youre:'you are',"we're":'we are',"they're":'they are',theyre:'they are',"i've":'i have',ive:'i have',"you've":'you have',youve:'you have',"we've":'we have',weve:'we have',"they've":'they have',theyve:'they have',"i'll":'i will',"you'll":'you will',youll:'you will',"he'll":'he will',"she'll":'she will',"it'll":'it will',itll:'it will',"we'll":'we will',"they'll":'they will',theyll:'they will'};
  const CONTRACTION_RE=new RegExp('\\b(?:'+Object.keys(CONTRACTION_MAP).sort((a,b)=>b.length-a.length).join('|').replace(/'/g,"'")+')\\b','g');
  const normalizeText=s=>String(s||'').toLowerCase().normalize('NFKD').replace(/’/g,"'").replace(CONTRACTION_RE,m=>CONTRACTION_MAP[m]).replace(/'/g,'').replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();
  const tokens=s=>normalizeText(s).split(' ').filter(Boolean);
  const median=xs=>{const a=xs.map(Number).filter(Number.isFinite).sort((x,y)=>x-y);if(!a.length)return null;const m=Math.floor(a.length/2);return a.length%2?a[m]:Math.round((a[m-1]+a[m])/2)};
  function tokenF1(actual,expected){
    const a=tokens(actual),e=tokens(expected);if(!a.length||!e.length)return 0;
    const need=new Map();e.forEach(t=>need.set(t,(need.get(t)||0)+1));let match=0;
    a.forEach(t=>{const n=need.get(t)||0;if(n>0){match++;need.set(t,n-1)}});
    const precision=match/a.length,recall=match/e.length;
    return precision+recall?2*precision*recall/(precision+recall):0;
  }
  function keywordCoverage(actual,keywords){
    const text=` ${normalizeText(actual)} `,ks=(keywords||[]).map(normalizeText).filter(Boolean);if(!ks.length)return 0;
    return ks.filter(k=>text.includes(` ${k} `)||tokens(k).every(t=>text.includes(` ${t} `))).length/ks.length;
  }
  function conceptCoverage(actual,groups){
    const text=` ${normalizeText(actual)} `,rows=(Array.isArray(groups)?groups:[]).map(group=>(Array.isArray(group)?group:[group]).map(normalizeText).filter(Boolean)).filter(group=>group.length);
    if(!rows.length)return 0;
    const matched=rows.filter(group=>group.some(alias=>text.includes(` ${alias} `))).length;
    return matched/rows.length;
  }
  function scoreSpeaking(item,transcript){
    if(!item||!transcript)return{score:0,passed:false,metric:'none',claim:'spoken_production_coverage_not_pronunciation'};
    const metric=item.scoring?.metric||'target_concept_coverage';
    let raw=0,conceptsMatched=null,conceptsTotal=null;
    if(metric==='token_f1')raw=tokenF1(transcript,item.targetText||item.sampleAnswer);
    else{
      const groups=Array.isArray(item.targetConcepts)&&item.targetConcepts.length?item.targetConcepts:(item.requiredKeywords||[]).map(value=>[value]);
      const coverage=conceptCoverage(transcript,groups),minimumWords=Math.max(2,Number(item.scoring?.minimumWords)||4),lengthCoverage=Math.min(1,tokens(transcript).length/minimumWords);
      raw=coverage*.85+lengthCoverage*.15;conceptsTotal=groups.length;conceptsMatched=Math.round(coverage*groups.length);
    }
    const threshold=clamp(item.scoring?.threshold??.7,0,1);
    return{score:Math.round(raw*100),passed:raw>=threshold,metric,threshold:Math.round(threshold*100),conceptsMatched,conceptsTotal,claim:'spoken_production_coverage_not_pronunciation'};
  }
  function scoreListening(item,response){
    if(item?.mode==='dictation'){
      const raw=tokenF1(response,item.answerText||item.script||'');const threshold=clamp(item.scoring?.threshold??.75,0,1);
      return{score:Math.round(raw*100),passed:raw>=threshold,metric:'token_f1',threshold:Math.round(threshold*100)};
    }
    const selected=Number(response),ok=Number.isInteger(selected)&&selected===Number(item?.answerIndex);
    return{score:ok?100:0,passed:ok,metric:'exact_choice',threshold:100};
  }
  // m025-146: penilaian jawaban ujian Listening. Murni, jadi bisa diuji tanpa DOM maupun audio.
  //
  // Isian dinilai dengan DAFTAR jawaban yang diterima, bukan kemiripan token: di ujian aslinya
  // marking key memang berbentuk daftar varian ("42" / "forty-two"), dan kemiripan parsial
  // hanya akan memberi nilai untuk jawaban yang di ujian sungguhan dihitung salah.
  function scoreListeningExamAnswer(question,response){
    if(!question)return{correct:false,given:''};
    if(question.answerType==='choice'){
      // R4: jawaban kosong bukan jawaban. Number('')===0, jadi tanpa penjagaan ini respons
      // kosong akan dihitung benar untuk soal yang kuncinya di posisi 0.
      const selected=(response==null||String(response).trim()==='')?NaN:Number(response);
      return{correct:Number.isInteger(selected)&&selected===Number(question.answerIndex),
        given:Number.isInteger(selected)?String(question.options?.[selected]??''):''};
    }
    const given=normalizeText(response);
    const accepted=(Array.isArray(question.accept)?question.accept:[]).map(normalizeText).filter(Boolean);
    // R4 (lx-s1-4): jawaban isian berupa DERETAN DIGIT (nomor telepon dsb.) dibandingkan tanpa
    // spasi/tanda hubung, karena pengelompokan "07911 340 628" sama benarnya dengan "079 11 340 628".
    // Terbatas pada kunci yang seluruhnya digit; jawaban alfanumerik tetap dibandingkan apa adanya.
    const digitKey=v=>/^[0-9][0-9\s]*$/.test(v)?v.replace(/\s+/g,''):null;
    const givenDigits=digitKey(given);
    const correct=!!given&&(accepted.includes(given)||(givenDigits!==null&&accepted.some(a=>digitKey(a)===givenDigits)));
    return{correct,given:String(response||'').trim()};
  }
  function scoreListeningExamSet(set,responses){
    const questions=Array.isArray(set&&set.questions)?set.questions:[];
    const rows=questions.map((question,index)=>({
      id:String(question.id||index),
      ...scoreListeningExamAnswer(question,Array.isArray(responses)?responses[index]:undefined)
    }));
    const correct=rows.filter(x=>x.correct).length,total=questions.length||1;
    const score=Math.round(correct/total*100);
    // Ambang kelulusan latihan, BUKAN konversi band. IELTS dan TOEFL memakai tabel konversi
    // yang berbeda tiap sesi ujian, dan menirunya di sini akan mengarang angka.
    return{score,passed:score>=70,metric:'exam_answer_key',threshold:70,correct,total,rows};
  }
  function capabilities(){
    const Recognition=global.SpeechRecognition||global.webkitSpeechRecognition;
    return Object.freeze({
      // m025-28: kemampuan audio berarti PINTU BICARA BERSAMA bisa dipakai, bukan
      // "perangkat ini punya mesin suara". Yang diperiksa memang FiezelVoiceSay.say,
      // karena hanya dia yang tahu lapisan mana yang sanggup berbunyi hari ini.
      // m025-232: dulu di sini ada catatan bahwa keberadaan suara peramban tidak
      // relevan; sekarang lapisan itu sudah dihapus dari aplikasi, jadi tidak ada
      // lagi kemampuan kedua yang bisa keliru dihitung — di bawah pintu ini tinggal
      // R2/ElevenLabs, Cloudflare, Puter, neural di perangkat, lalu teks senyap.
      tts:!!(global.FiezelVoiceSay&&typeof global.FiezelVoiceSay.say==='function'),
      neuralVoice:global.FiezelPuterVoice?.status?.().ready===true,
      speechRecognition:typeof Recognition==='function',
      mediaRecorder:typeof global.MediaRecorder==='function'&&!!global.navigator?.mediaDevices?.getUserMedia,
      secureContext:global.isSecureContext!==false,
      online:global.navigator?.onLine!==false
    });
  }

  function freshState(){return{schema:STATE_SCHEMA,version:1,updatedAt:0,events:[],listening:{attempts:0,passed:0,scoreSum:0},speaking:{attempts:0,passed:0,scoreSum:0},capabilityEvents:{}}}
  function sanitizeState(raw,limit){
    const s=freshState();if(!raw||raw.schema!==STATE_SCHEMA)return s;
    const cleanEvents=(Array.isArray(raw.events)?raw.events:[]).slice(-limit).map(e=>({
      id:String(e.id||'').slice(0,80),at:Number(e.at||0),domain:e.domain==='speaking'?'speaking':'listening',itemId:String(e.itemId||'').slice(0,80),level:LEVELS.includes(e.level)?e.level:'A1',mode:String(e.mode||'').slice(0,40),score:clamp(e.score,0,100),passed:!!e.passed,responseMs:clamp(e.responseMs,0,600000),metric:String(e.metric||'').slice(0,40),replays:clamp(e.replays,0,20),rawAudioStored:false,rawTranscriptStored:false
    }));
    s.events=cleanEvents;s.updatedAt=Number(raw.updatedAt||0);s.capabilityEvents={};
    const capabilityRows=raw.capabilityEvents&&typeof raw.capabilityEvents==='object'?Object.entries(raw.capabilityEvents).slice(-12):[];
    for(const [name,value] of capabilityRows){const key=String(name||'').slice(0,40);if(!key)continue;s.capabilityEvents[key]={status:String(value?.status||'').slice(0,40),at:clamp(value?.at,0,Number.MAX_SAFE_INTEGER)}}
    for(const d of ['listening','speaking']){const es=cleanEvents.filter(e=>e.domain===d);s[d]={attempts:es.length,passed:es.filter(e=>e.passed).length,scoreSum:es.reduce((n,e)=>n+e.score,0)}}
    return s;
  }
  class StateStore{
    constructor(config){this.config=config;this.storage=global.localStorage||null;this.state=this.load()}
    load(){try{return sanitizeState(JSON.parse(this.storage?.getItem(this.config.storageKey)||'null'),this.config.aggregateEventLimit)}catch{return freshState()}}
    save(){this.state.updatedAt=now();try{this.storage?.setItem(this.config.storageKey,JSON.stringify(this.state))}catch{}return this.state}
    record(domain,item,result,responseMs,replays){
      if(!['listening','speaking'].includes(domain))throw new Error('invalid_domain');
      const event={id:`sl-${now()}-${Math.random().toString(36).slice(2,8)}`,at:now(),domain,itemId:String(item.id||'').slice(0,80),level:LEVELS.includes(item.level)?item.level:'A1',mode:String(item.mode||'').slice(0,40),score:clamp(result.score,0,100),passed:!!result.passed,responseMs:clamp(responseMs,0,600000),metric:String(result.metric||'').slice(0,40),replays:clamp(replays,0,20),rawAudioStored:false,rawTranscriptStored:false};
      this.state.events=[...(this.state.events||[]),event].slice(-this.config.aggregateEventLimit);
      const es=this.state.events.filter(e=>e.domain===domain);this.state[domain]={attempts:es.length,passed:es.filter(e=>e.passed).length,scoreSum:es.reduce((n,e)=>n+e.score,0)};this.save();return event
    }
    noteCapability(name,status){const key=String(name||'').slice(0,40);if(!key)return;const next={...(this.state.capabilityEvents||{}),[key]:{status:String(status||'').slice(0,40),at:now()}};this.state.capabilityEvents=Object.fromEntries(Object.entries(next).slice(-12));this.save()}
    evidence(){
      const events=this.state.events||[],summarize=domain=>{const es=events.filter(e=>e.domain===domain),scores=es.map(e=>e.score),times=es.map(e=>e.responseMs).filter(Boolean),replayRows=es.map(e=>Number(e.replays)).filter(n=>Number.isFinite(n));const byMode={};for(const e of es){const b=byMode[e.mode]||{attempts:0,passed:0,scoreSum:0};b.attempts++;if(e.passed)b.passed++;b.scoreSum+=e.score;byMode[e.mode]=b}return{attempts:es.length,replays:replayRows.length?replayRows.reduce((a,b)=>a+b,0):null,replayRate:replayRows.length?Math.round(replayRows.reduce((a,b)=>a+b,0)/replayRows.length*10)/10:null,passRate:es.length?Math.round(es.filter(e=>e.passed).length/es.length*100):null,averageScore:scores.length?Math.round(scores.reduce((a,b)=>a+b,0)/scores.length):null,medianResponseMs:median(times),byMode:Object.fromEntries(Object.entries(byMode).map(([k,b])=>[k,{attempts:b.attempts,passRate:b.attempts?Math.round(b.passed/b.attempts*100):null,averageScore:b.attempts?Math.round(b.scoreSum/b.attempts):null}]))}}
      return{schema:EVIDENCE_SCHEMA,generatedAt:new Date().toISOString(),privacy:{rawAudioIncluded:false,rawTranscriptIncluded:false,rawAnswerTextIncluded:false},domains:{listening:summarize('listening'),speaking:summarize('speaking')},capabilities:capabilities()}
    }
    reset(){this.state=freshState();try{this.storage?.removeItem(this.config.storageKey)}catch{}return this.state}
  }

  /** Bilangan acak 0..n-1. Memakai crypto bila ada, Math.random bila tidak. */
  function randomBelow(n){
    try{
      const c=global.crypto;
      if(c&&typeof c.getRandomValues==='function'){
        const buf=new Uint32Array(1);
        // Nilai di ekor terakhir dibuang supaya sisa pembagian tidak memihak indeks awal.
        const limit=Math.floor(0xFFFFFFFF/n)*n;
        let v;do{c.getRandomValues(buf);v=buf[0]}while(v>=limit);
        return v%n;
      }
    }catch{}
    return Math.floor(Math.random()*n);
  }
  /** Fisher-Yates pada SALINAN: bank soal tidak boleh ikut teracak di tempatnya. */
  function shuffle(list){
    const out=list.slice();
    for(let i=out.length-1;i>0;i--){const j=randomBelow(i+1);const t=out[i];out[i]=out[j];out[j]=t}
    return out;
  }

  class DataRepository{
    constructor(baseUrl){this.baseUrl=String(baseUrl||'./').replace(/\/?$/,'/');this.listening=[];this.speaking=[];this.speakingExam=[];this.examFormats={};this.examRubric=null;this.examHonesty='';this.listeningExam=[];this.listeningFormats={};this.listeningHonesty='';this.listeningAudioSource=null}
    async load(){if(typeof global.fetch!=='function')throw new Error('fetch_unavailable');const [l,s]=await Promise.all([global.fetch(this.baseUrl+'listening-bank-v1.json'),global.fetch(this.baseUrl+'speaking-bank-v1.json')]);if(!l.ok||!s.ok)throw new Error('sidecar_data_load_failed');const lj=await l.json(),sj=await s.json();if(lj.schema!=='fiezel-listening-bank-v1'||sj.schema!=='fiezel-speaking-bank-v1')throw new Error('sidecar_schema_mismatch');if(lj.count!==lj.items?.length||sj.count!==sj.items?.length||new Set(lj.items?.map(x=>x.id)).size!==lj.count||new Set(sj.items?.map(x=>x.id)).size!==sj.count)throw new Error('sidecar_data_integrity_failed');await this.loadExam();await this.loadListeningExam();this.listening=lj.items||[];this.speaking=sj.items||[];return this}
    // m025-145: bank Speaking berformat ujian dimuat TERPISAH dan kegagalannya tidak fatal.
    // Skills Lab harian tidak boleh mati hanya karena berkas latihan ujian belum ada di origin
    // - itu menukar satu fitur baru dengan seluruh fitur lama.
    async loadExam(){
      try{
        const response=await global.fetch(this.baseUrl+'speaking-exam-v1.json');
        if(!response.ok)return false;
        const data=await response.json();
        if(data.schema!=='fiezel-speaking-exam-v1')return false;
        if(Number(data.count)!==(data.items||[]).length)return false;
        this.speakingExam=data.items||[];this.examFormats=data.examFormats||{};
        this.examRubric=data.rubric||null;this.examHonesty=String(data.honesty||'');
        return true;
      }catch(_){return false}
    }
    // m025-146: bank Listening berformat ujian, dimuat terpisah dan kegagalannya tidak fatal -
    // aturan yang sama dengan bank Speaking: satu berkas baru yang belum ada di origin tidak
    // boleh mematikan Skills Lab harian.
    async loadListeningExam(){
      try{
        const response=await global.fetch(this.baseUrl+'listening-exam-v1.json');
        if(!response.ok)return false;
        const data=await response.json();
        if(data.schema!=='fiezel-listening-exam-v1')return false;
        if(Number(data.count)!==(data.sets||[]).length)return false;
        this.listeningExam=data.sets||[];this.listeningFormats=data.examFormats||{};
        this.listeningHonesty=String(data.honesty||'');this.listeningAudioSource=data.audioSource||null;
        return true;
      }catch(_){return false}
    }
    /* m025-231: sidecar th untuk bank ujian Listening. Overlay set-id yang lama TIDAK
       pernah kena sasaran - id set adalah lx-* sementara listening-bank-th.json hanya
       berisi kunci listen_sc_*, jadi seluruh sesi ujian (judul, penjelasan tiap soal,
       catatan format, dan paragraf honesty) selalu jatuh ke teks Indonesia untuk murid th.
       Tiga permukaan itu butuh kait sendiri: judul+soal lewat listeningExamFor, catatan
       format lewat listeningFormat, dan honesty lewat listeningHonestyText. */
    thExam(){
      const isTh=(I18N&&I18N.getLocale()==='th')||(global.FiezelThLoader&&global.FiezelThLoader.isThActive&&global.FiezelThLoader.isThActive());
      if(!isTh)return null;
      const d=global.FiezelThData;
      return d&&d.listeningExam?d.listeningExam:null;
    }
    listeningFormat(set){
      const key=String(set&&set.exam||'');
      const meta=key?this.listeningFormats[key]:null;
      if(!meta)return null;
      const th=this.thExam();
      const thMeta=th&&th.examFormats?th.examFormats[key]:null;
      return thMeta?{id:key,...meta,...thMeta}:{id:key,...meta};
    }
    listeningHonestyText(){
      const th=this.thExam();
      return String((th&&th.honesty)||this.listeningHonesty||'');
    }
    listeningExamLevels(){return [...new Set(this.listeningExam.map(x=>x.level))].filter(Boolean).sort()}
    listeningExamFor(level){
      const target=normalizeLevel(level);
      let rows=this.listeningExam.filter(x=>x.level===target);
      const thData=global.FiezelThData;
      const isTh=(I18N&&I18N.getLocale()==='th')||(global.FiezelThLoader&&global.FiezelThLoader.isThActive&&global.FiezelThLoader.isThActive());
      if(isTh&&thData?.listening){
        rows=rows.map(set=>{
          const thSet=thData.listening[set.id];
          return thSet?{...set,...thSet}:set;
        });
      }
      const thEx=this.thExam();
      if(thEx&&thEx.sets){
        rows=rows.map(set=>{
          const thSet=thEx.sets[set.id];
          if(!thSet)return set;
          const merged={...set,...thSet};
          /* questions adalah LARIK di sumber tapi PETA-per-id di sidecar: gabung per id,
             jangan menyalin petanya mentah-mentah. Urutan dan answerIndex milik sumber
             harus utuh - satu soal yang bergeser diam-diam mengubah kunci jawaban. */
          if(Array.isArray(set.questions)){
            merged.questions=set.questions.map(q=>{
              const thQ=thSet.questions&&thSet.questions[q.id];
              return thQ?{...q,...thQ}:q;
            });
          }
          return merged;
        });
      }
      return rows;
    }

    thSpeakingExam(){
      const isTh=(I18N&&I18N.getLocale()==='th')||(global.FiezelThLoader&&global.FiezelThLoader.isThActive&&global.FiezelThLoader.isThActive());
      if(!isTh)return null;
      const d=global.FiezelThData;
      return d&&d.speakingExam?d.speakingExam:null;
    }
    examFormat(item){
      const key=String(item&&item.exam||'');
      const meta=key?this.examFormats[key]:null;
      if(!meta)return null;
      const th=this.thSpeakingExam();
      const thMeta=th&&th.examFormats?th.examFormats[key]:null;
      return thMeta?{id:key,...meta,...thMeta}:{id:key,...meta};
    }
    examHonestyText(){
      const th=this.thSpeakingExam();
      return String((th&&th.honesty)||this.examHonesty||'');
    }
    examLevels(){return [...new Set(this.speakingExam.map(x=>x.level))].filter(Boolean).sort()}
    examFor(level){
      const target=normalizeLevel(level);
      const rows=this.speakingExam.filter(x=>x.level===target);
      const thData=global.FiezelThData;
      const isTh=(I18N&&I18N.getLocale()==='th')||(global.FiezelThLoader&&global.FiezelThLoader.isThActive&&global.FiezelThLoader.isThActive());
      if(isTh&&thData?.speaking){
        return rows.map(item=>{
          const thItem=thData.speaking[item.id];
          return thItem?{...item,...thItem}:item;
        });
      }
      return rows;
    }

    /**
     * m025-110: OWNER meminta urutan soal berubah setiap kali sesi dibuka, dan tidak bisa
     * ditebak. Pengacakan dilakukan DI SINI - saat sesi dimulai - bukan di bank soalnya:
     * berkas bank harus tetap identik setiap rebuild, dan tes idempotensi akan langsung
     * merah kalau urutannya digoyang di sumbernya.
     *
     * Fisher-Yates dengan crypto bila tersedia. Math.random cukup untuk keperluan ini,
     * tetapi sumber acak yang lebih baik memang gratis di browser modern - dan urutan
     * yang bisa diprediksi persis itulah yang OWNER keluhkan.
     */
    for(domain,level){
      const rows=domain==='speaking'?this.speaking:this.listening;
      const active=normalizeLevel(level)||DEFAULT_ACTIVE_LEVEL;
      const thData=global.FiezelThData;
      const isTh=(I18N&&I18N.getLocale()==='th')||(global.FiezelThLoader&&global.FiezelThLoader.isThActive&&global.FiezelThLoader.isThActive());
      if(isTh&&thData){
        const mapObj=domain==='speaking'?thData.speaking:thData.listening;
        if(mapObj)return shuffle(rows.filter(x=>x.level===active).map(i=>mapObj[i.id]?{...i,...mapObj[i.id]}:i));
      }
      return shuffle(rows.filter(x=>x.level===active));
    }
  }

  class TTSService{
    constructor(config){this.config=config}
    // m025-232: baris ini dulu memanggil `speechSynthesis.cancel()` sesudah stop()
    // pintu bicara, karena pernah ada lapisan suara peramban dengan antrean sendiri
    // DI LUAR pintu itu — satu-satunya bunyi yang tidak bisa dihentikan FiezelVoiceSay.
    // Lapisan itu dihapus, jadi pembatal keduanya ikut dibuang: menyisakannya berarti
    // memelihara kepercayaan bahwa masih ada jalur bunyi kedua yang perlu diredam.
    // Satu pintu untuk berbunyi = satu pintu untuk berhenti.
    stop(){try{global.FiezelVoiceSay?.stop?.()}catch{}}
    // m025-28: listening dulu memanggil mesin suara peramban langsung, jadi ia tidak
    // pernah menyentuh runtime neural sama sekali - setiap item listening dibacakan
    // suara peramban karena bentuk kodenya memang begitu. Itu pula sebab naskah
    // panjang gagal: naskah B2 ~155 karakter melawan A1 ~40, dan jalur peramban di
    // iOS rutin macet pada yang panjang, memicu timeout internal lalu MENGUNCI item.
    // PELAJARANNYA tetap berlaku dan justru makin keras: listening wajib lewat pintu
    // bicara bersama, tidak pernah lewat jalur bunyi sendiri.
    // m025-232: jalur peramban itu sendiri sudah dihapus dari seluruh aplikasi, jadi
    // "jangan diganti TTS peramban" bukan lagi godaan yang tersedia - kalau pintu
    // bersama diam, yang benar adalah diam plus teks yang tetap terbaca, bukan
    // mencari sumber bunyi lain di belakang pintu.
    // m025-100: jalur ini ikut pintu bicara bersama. Sebelumnya ia memanggil mesin
    // lokal langsung dan MENOLAK berbunyi bila modelnya belum diunduh - pemeriksaan
    // yang benar ketika suara memang harus diunduh, dan penghalang murni sesudah
    // suara pindah ke server. Itu kelas bug yang sama dengan tombol Dengar di Library.
    play(text,options={}){
      const say=global.FiezelVoiceSay;
      if(!say||typeof say.say!=='function')return Promise.reject(new Error('voice_door_unavailable'));
      this.stop();
      const rate=clamp(options.rate??this.config.ttsRate,.55,1.3);
      return say.say(String(text||''),{speed:rate})
        .then(ok=>{ if(ok===false)throw new Error('voice_playback_failed'); return {provider:'puter-txt2speech'}; });
    }
    /* V6 (reports/voice-v5-prefetch.md §3 baris 3): menghangatkan naskah item BERIKUTNYA.
       Ia hanya pipa - siapa yang boleh dihangatkan diputuskan Controller.prefetchNextScript(),
       karena keputusan itu soal KEBOCORAN UJIAN, bukan soal suara.

       Tiga pagar: tidak ada prepare()/ensureReady() (kontrak v5 menjawab false dengan tenang
       selama aset belum prepared); tidak memanggil this.stop() - menghangatkan tidak boleh
       memotong bunyi yang sedang jalan; dan galat apa pun ditelan menjadi false. */
    prefetch(text,options={}){
      const say=global.FiezelVoiceSay;
      const script=String(text||'').trim();
      if(!script||!say||typeof say.prefetch!=='function')return false;
      const rate=clamp(options.rate??this.config.ttsRate,.55,1.3);
      try{Promise.resolve(say.prefetch(script,{speed:rate})).catch(()=>false)}catch{return false}
      return true;
    }
  }

  class RecognitionService{
    constructor(config){this.config=config;this.active=null}
    stop(){try{this.active?.abort?.()}catch{}this.active=null}
    listen(timeoutMs=12000){
      const R=global.SpeechRecognition||global.webkitSpeechRecognition;if(typeof R!=='function')return Promise.reject(new Error('speech_recognition_unavailable'));
      this.stop();return new Promise((resolve,reject)=>{let done=false,timer;const finish=(fn,v)=>{if(done)return;done=true;clearTimeout(timer);this.active=null;fn(v)};try{const r=new R();this.active=r;r.lang=this.config.language;r.interimResults=false;r.maxAlternatives=1;r.continuous=false;r.onresult=e=>{const alt=e?.results?.[0]?.[0];finish(resolve,{transcript:String(alt?.transcript||''),confidence:Number.isFinite(Number(alt?.confidence))?Number(alt.confidence):null,rawPersisted:false})};r.onerror=e=>finish(reject,new Error(`speech_recognition_${String(e?.error||'error')}`));r.onend=()=>{if(!done)finish(reject,new Error('speech_recognition_no_result'))};timer=setTimeout(()=>{try{r.abort()}catch{}finish(reject,new Error('speech_recognition_timeout'))},timeoutMs);r.start()}catch(e){finish(reject,e)}})
    }
  }

  class RecorderService{
    constructor(){this.stream=null;this.recorder=null;this.chunks=[];this.url=''}
    revoke(){if(this.url){try{global.URL?.revokeObjectURL?.(this.url)}catch{}this.url=''}}
    async start(){if(!capabilities().mediaRecorder)throw new Error('media_recorder_unavailable');this.stopTracks();this.revoke();this.stream=await global.navigator.mediaDevices.getUserMedia({audio:true});this.chunks=[];this.recorder=new global.MediaRecorder(this.stream);this.recorder.ondataavailable=e=>{if(e.data?.size)this.chunks.push(e.data)};this.recorder.start();return true}
    stop(){return new Promise((resolve,reject)=>{const r=this.recorder;if(!r||r.state==='inactive'){this.stopTracks();return resolve(null)};r.onerror=()=>{this.stopTracks();reject(new Error('media_recorder_failed'))};r.onstop=()=>{try{const blob=new global.Blob(this.chunks,{type:r.mimeType||'audio/webm'});this.revoke();this.url=global.URL.createObjectURL(blob);this.stopTracks();resolve({url:this.url,size:blob.size,persisted:false})}catch(e){this.stopTracks();reject(e)}};r.stop()})}
    stopTracks(){try{this.stream?.getTracks?.().forEach(t=>t.stop())}catch{}this.stream=null;this.recorder=null}
    destroy(){this.stopTracks();this.revoke();this.chunks=[]}
  }

  function mergeConfig(input){const cfg={...DEFAULT_CONFIG,...(global.FIEZEL_SPEAKING_LISTENING_CONFIG||{}),...(input||{})};cfg.persistRawAudio=false;cfg.persistRawTranscript=false;cfg.aggregateEventLimit=Math.max(20,Math.min(300,Number(cfg.aggregateEventLimit)||120));return cfg}

  class Controller{
    constructor(options){this.options=options||{};this.config=mergeConfig(this.options.config);this.levelContract=createLevelContract(this.options,this.config);this.root=this.options.root||null;this.repo=new DataRepository(this.options.baseUrl||'./features/speaking-listening/');this.store=new StateStore(this.config);this.tts=this.options.tts&&typeof this.options.tts.play==='function'&&typeof this.options.tts.stop==='function'?this.options.tts:new TTSService(this.config);this.recognition=new RecognitionService(this.config);this.recorder=new RecorderService();this.domain='listening';this.activeLevel=this.levelContract.level;this.level=this.activeLevel;this.items=[];this.index=0;this.startedAt=0;this.replays=0;this.ephemeralTranscript='';this.noAudio=false;this.noAudioItems=[];this.prefetchGeneration=0;this.resetGemSession()}
    /* =============================== V6 anti-kebocoran ===============================
       Menghangatkan naskah item BERIKUTNYA supaya murid tidak membayar ~4,5 detik generasi
       tiap kali menekan Dengarkan (reports/voice-v1-audit.md §1, voice-v5-prefetch.md §3
       baris 3). Item berikutnya memang sudah diketahui: this.items[this.index+1].

       YANG TIDAK BOLEH: jalur UJIAN. Di `listening_exam` audio diputar SEKALI dan naskah
       item yang belum tampil adalah materi ujian; menghangatkannya lebih awal berarti
       menggenerasi materi yang belum boleh dilihat/didengar murid, dan pada mesin neural
       single-flight ia juga bisa membuat pemutaran ujian ditolak dengan `superseded`
       (fiezel-neural-voice.js). Karena itu pagarnya bentuk daftar-putih: HANYA domain
       'listening'. Menambah domain baru ke sini harus jadi keputusan sadar, bukan efek
       samping - dan voice-callsite-prefetch-test.js mengunci itu.
       ================================================================================= */
    prefetchNextScript(){
      if(this.domain!=='listening')return false;
      if(typeof this.tts?.prefetch!=='function')return false;
      const next=this.items[this.index+1];
      const script=next&&next.script?String(next.script):'';
      if(!script)return false;
      /* Ditunda satu task: item yang SEDANG diputar harus memesan mesin single-flight lebih
         dulu (inversi antrean m025-47). Generation dibatalkan oleh exit()/destroy()/open(). */
      const generation=++this.prefetchGeneration;
      const run=()=>{if(generation!==this.prefetchGeneration)return;try{this.tts.prefetch(script,{rate:this.config.ttsRate})}catch(_){}};
      if(typeof global.setTimeout==='function')global.setTimeout(run,0);else run();
      return true;
    }
    cancelPrefetch(){this.prefetchGeneration++;return this.prefetchGeneration}
    /* Runtun sesi & status toggle adalah milik SESI, bukan milik penyimpanan. Sengaja tidak
       ikut StateStore: runtun yang selamat dari reload adalah celah farming (rekon §A.3). */
    resetGemSession(){this.sessionStreak=0;this.sessionAwards=0;this.translationOn=false;this.translationCharged=false;this.answeredItemId='';return this}
    gemsBalance(){try{const n=Number(this.options.gems?.balance?.());return Number.isFinite(n)&&n>0?Math.floor(n):0}catch(_){return 0}}
    async init(){await this.repo.load();return this}
    mount(root){this.root=root||this.root;if(!this.root)throw new Error('mount_root_required');this.renderHub();return this}
    readActiveLevel(){let candidate;try{candidate=this.levelContract.getter?this.levelContract.getter():null}catch{}const next=normalizeLevel(candidate);if(next&&next!==this.activeLevel){this.activeLevel=next;this.items=[];this.index=0;this.startedAt=0;this.replays=0;this.ephemeralTranscript=''}this.level=this.activeLevel;return this.activeLevel}
    setActiveLevel(level,options={}){const next=normalizeLevel(level);if(!next)throw new Error('invalid_level');this.activeLevel=next;this.level=next;this.levelContract.level=next;this.levelContract.external=true;this.levelContract.getter=null;this.items=[];this.index=0;this.startedAt=0;this.replays=0;this.ephemeralTranscript='';if(options.render!==false&&this.root)this.renderHub();return this.activeLevel}
    getActiveLevel(){return this.readActiveLevel()}
    open(domain,level){if(!['listening','speaking','speaking_exam','listening_exam'].includes(domain))throw new Error('invalid_domain');/* V6: pindah domain adalah penghenti. Pengajuan hangat dari sesi listening biasa tidak boleh menyala di dalam sesi ujian. */this.cancelPrefetch();this.domain=domain;const active=this.readActiveLevel();const requested=this.levelContract.external?active:(normalizeLevel(level)||active);this.activeLevel=requested;this.level=requested;this.items=domain==='speaking_exam'?this.repo.examFor(requested):domain==='listening_exam'?this.repo.listeningExamFor(requested):this.repo.for(domain,requested);this.index=0;this.startedAt=now();this.replays=0;this.ephemeralTranscript='';this.noAudio=false;this.noAudioItems=[];this.resetGemSession();this.renderSession();return this}
    /* m026-02: satu kait "sesi dengar sudah selesai" untuk app.js. Ia dipanggil di DUA
       tempat saja - exit() dan renderComplete() - karena hanya itu dua cara sebuah sesi
       berakhir. Pemberitahuan apa pun yang menunggu (mis. kredit Puter habis) ditampilkan
       di sini, di luar sesi, bukan di tengah item yang sedang diputar. Gagalnya diam:
       kait milik host tidak boleh bisa merusak sesi latihan. */
    notifySessionEnd(reason){try{if(typeof this.options.onSessionEnd==='function')this.options.onSessionEnd({reason:String(reason||''),domain:this.domain})}catch(_){}return true}
    /* q19-P2b 2026-08-29: keluar dari sesi dengan >=1 item terjawab lewat konfirmasi \u2014 paritas dengan shell utama (m025-182). exit() asli tidak berubah (literal dipin voice-callsite-prefetch). */
    confirmExit(){
      if(this.index<1||!this.root){this.exit();return}
      if(this.root.querySelector('[data-fsl-confirm]'))return;
      const wrap=document.createElement('div');
      wrap.setAttribute('data-fsl-confirm','');
      wrap.style.cssText='position:fixed;inset:0;z-index:120;display:flex;align-items:center;justify-content:center;background:var(--fsl-scrim,rgba(27,20,24,.45))';
      wrap.innerHTML='<div role="dialog" aria-modal="true" aria-label="' + T('fsl.exit-confirm-aria', 'Konfirmasi keluar') + '" style="background:var(--panel,#fffdf6);border-radius:var(--radius-md,16px);padding:20px;max-width:320px;margin:16px;box-shadow:var(--shadow-lg,0 12px 32px rgba(27,20,24,.25))"><h3 style="margin:0 0 8px;font-size:1.05rem">' + T('fsl.exit-confirm-title', 'Yakin mau keluar?') + '</h3><p style="margin:0 0 14px;font-size:.9rem;color:var(--muted,#6b5a60)">' + T('fsl.exit-confirm-body', 'Sesi ini berhenti di item {current}/{total}. Kemajuan item yang sudah dinilai tetap tersimpan.', {current: (this.index+1), total: Math.max(1,this.items.length)}) + '</p><div style="display:flex;gap:8px;justify-content:flex-end"><button data-fsl-confirm-yes>' + T('fsl.exit-confirm-yes', 'Tetap keluar') + '</button><button class="fsl-primary" data-fsl-confirm-no>' + T('fsl.exit-confirm-no', 'Lanjut belajar') + '</button></div></div>';
      this.root.appendChild(wrap);
      const yes=wrap.querySelector('[data-fsl-confirm-yes]'),no=wrap.querySelector('[data-fsl-confirm-no]');
      yes.addEventListener('click',()=>{try{wrap.remove()}catch{}this.exit()});
      no.addEventListener('click',()=>{try{wrap.remove()}catch{}});
      try{no.focus()}catch{}
    }
    exit(){this.cancelPrefetch();this.setSessionStage(false);this.tts.stop();this.recognition.stop();this.recorder.destroy();this.ephemeralTranscript='';this.notifySessionEnd('exit');if(typeof this.options.onExit==='function')this.options.onExit();else this.renderHub()}
    emitEvidence(){const evidence=this.store.evidence();if(typeof this.options.onAggregateEvidence==='function')this.options.onAggregateEvidence(evidence);return evidence}
    renderHub(){this.setSessionStage(false);if(!this.root)return;const c=capabilities(),ev=this.store.evidence(),active=this.readActiveLevel();this.root.innerHTML=`<section class="fsl-shell"><div class="fsl-head"><div><span class="fsl-kicker">${esc(T('latihan.bicara-dengar'))}</span><h1>${esc(T('latihan.bicara-dengar'))}</h1><p>${T('fsl.privacy-intro', 'Latihan suara dengan data terisolasi. Speaking mengukur target-language coverage, bukan pronunciation.')}</p><p class="fsl-level-state">${T('fsl.active-level', 'Level aktif: {level}', {level: esc(active)})}${this.levelContract.external?esc(T('fsl.level-follows-main')):''}</p></div></div><div class="fsl-grid"><article class="fsl-card"><span class="fsl-kicker">Listening</span><h2>${T('fsl.listening-title', 'Dengar lalu pahami')}</h2><p>${T('fsl.listening-desc', 'Gist, detail, dan dictation. Jawaban baru aktif setelah audio berhasil diputar dan raw dictation tidak disimpan.')}</p><div class="fsl-actions"><button class="fsl-primary" data-open="listening">${T('fsl.listening-start-btn', 'Mulai Listening')}</button></div></article>${uxOn('skillExams')?`${this.repo.listeningExamFor(active).length?`<article class="fsl-card"><span class="fsl-kicker">${T('fsl.listening-exam-kicker', 'Listening berformat ujian')}</span><h2>IELTS &amp; TOEFL Listening</h2><p>${T('fsl.listening-exam-desc', '{count} set untuk level {level}. Audio diputar SEKALI, persis seperti ujiannya.', {count: this.repo.listeningExamFor(active).length, level: esc(active)})}</p><p class="fsl-privacy">${esc(this.repo.listeningHonestyText())}</p><div class="fsl-actions"><button class="fsl-primary" data-open="listening_exam">${T('fsl.listening-exam-start-btn', 'Mulai latihan ujian')}</button></div></article>`:`<article class="fsl-card"><span class="fsl-kicker">${T('fsl.listening-exam-kicker', 'Listening berformat ujian')}</span><h2>IELTS &amp; TOEFL Listening</h2><p>${T('fsl.listening-exam-empty', 'Belum ada set untuk level {level}. Yang sudah tersedia: {available}.', {level: esc(active), available: esc(this.repo.listeningExamLevels().join(', ')||'-')})}</p></article>`}`:''}<article class="fsl-card"><span class="fsl-kicker">Speaking</span><h2>${T('fsl.speaking-title', 'Ucapkan dan respons')}</h2><p>${c.speechRecognition?T('fsl.speaking-sr-available', 'Speech recognition tersedia untuk target-language coverage.'):T('fsl.speaking-sr-unavailable', 'Speech recognition tidak tersedia; mode rekam-dengar mandiri tetap dapat dipakai jika microphone recording tersedia.')}</p><div class="fsl-actions"><button class="fsl-primary" data-open="speaking">${T('fsl.speaking-start-btn', 'Mulai Speaking')}</button></div></article>${uxOn('skillExams')?`${this.repo.examFor(active).length?`<article class="fsl-card"><span class="fsl-kicker">${T('fsl.speaking-exam-kicker', 'Latihan berformat ujian')}</span><h2>IELTS &amp; TOEFL Speaking</h2><p>${T('fsl.speaking-exam-desc', '{count} set untuk level {level}, lengkap dengan waktu menyiapkan dan waktu bicara seperti ujian aslinya.', {count: this.repo.examFor(active).length, level: esc(active)})}</p><p class="fsl-privacy">${esc(this.repo.examHonestyText())}</p><div class="fsl-actions"><button class="fsl-primary" data-open="speaking_exam">${T('fsl.speaking-exam-start-btn', 'Mulai latihan ujian')}</button></div></article>`:`<article class="fsl-card"><span class="fsl-kicker">${T('fsl.speaking-exam-kicker', 'Latihan berformat ujian')}</span><h2>IELTS &amp; TOEFL Speaking</h2><p>${T('fsl.speaking-exam-empty', 'Belum ada set untuk level {level}.', {level: esc(active)})}</p></article>`}`:''}</div><article class="fsl-card"><span class="fsl-kicker">Capability gate</span><div class="fsl-status">Audio output: <b>${c.neuralVoice?T('fsl.audio-neural-ready', 'neural ready'):T('fsl.audio-neural-pending', 'neural belum diunduh')}</b> · Speech recognition: <b>${c.speechRecognition?'ready':'unavailable'}</b> · Recorder: <b>${c.mediaRecorder?'ready':'unavailable'}</b> · Secure context: <b>${c.secureContext?'yes':'no'}</b></div><p class="fsl-privacy">${T('fsl.browser-privacy', 'Browser speech recognition dapat melibatkan layanan pengenal milik browser. FIEZEL tidak menyimpan raw audio, transcript, atau jawaban dictation.')}</p></article><article class="fsl-card"><span class="fsl-kicker">Evidence lokal</span><p>Listening: <b>${ev.domains.listening.attempts}</b> attempt · average ${ev.domains.listening.averageScore??'-'}%. Speaking: <b>${ev.domains.speaking.attempts}</b> attempt · average ${ev.domains.speaking.averageScore??'-'}%.</p></article></section>`;
      this.root.querySelectorAll?.('[data-open]').forEach(b=>b.addEventListener('click',()=>this.levelContract.external?this.open(b.getAttribute('data-open')):this.renderLevelPicker(b.getAttribute('data-open'))))
    }
    renderLevelPicker(domain){if(this.levelContract.external){return this.open(domain)}if(!this.root)return;this.root.innerHTML=`<section class="fsl-shell"><article class="fsl-card"><span class="fsl-kicker">${esc(domain)}</span><h2>${T('fsl.level-select-title', 'Pilih level')}</h2><div class="fsl-levels">${LEVELS.map(l=>`<button data-level="${l}" aria-pressed="${String(l===this.level)}">${l}</button>`).join('')}</div><div class="fsl-actions"><button data-back>${T('skillslab.btn-back')}</button></div></article></section>`;this.root.querySelectorAll?.('[data-level]').forEach(b=>b.addEventListener('click',()=>this.open(domain,b.getAttribute('data-level'))));this.root.querySelector?.('[data-back]')?.addEventListener('click',()=>this.renderHub())}
    current(){return this.items[this.index]||null}
    /* I9 2026-08-28 (O5 §5.3, O1-001): panggung sesi Skills Lab. Selama item aktif tampil,
       body diberi kelas `fsl-session-active` supaya CSS addon menyembunyikan .topbar dan
       .bottomnav — sesi latihan harus bebas distraksi seperti kuis (fz-stage-quiz).
       Dijaga pemeriksaan document + try/catch: gerbang Node (gems-test, voice-fallback)
       menjalankan renderSession tanpa DOM dan itu bukan kesalahan. */
    setSessionStage(on){try{const doc=typeof document!=='undefined'?document:(hostScope().document||null);if(doc&&doc.body&&doc.body.classList)doc.body.classList.toggle('fsl-session-active',!!on)}catch(_){}return !!on}
    renderSession(){if(!this.root)return;const item=this.current();if(!item){this.renderComplete();return}this.setSessionStage(true);this.startedAt=now();this.replays=0;this.ephemeralTranscript='';this.noAudio=false;const progress=Math.round(this.index/Math.max(1,this.items.length)*100);if(this.domain==='listening_exam')this.renderListeningExam(item,progress);else if(this.domain==='listening')this.renderListening(item,progress);else if(this.domain==='speaking_exam')this.renderSpeakingExam(item,progress);else this.renderSpeaking(item,progress)}
    /* I9 2026-08-28 (O5 §5.3, O1-002): urutan baca sesi dengar = soal › pemutar › jawaban.
       2026-08-31 (permintaan OWNER): kicker "Listening · A1 · inference" DIHAPUS dari kartu.
       Ia mengulang apa yang sudah diketahui murid (ia baru saja menekan Listening) dan
       membocorkan kosakata internal - "inference" adalah nama mode di listening-generate.js,
       bukan kata yang dipakai anak SMA. Levelnya tidak hilang, ia pindah ke panel bantuan
       "?" di pojok kanan atas bersama disclaimer lain (app.js openSkillHelp).
       Paragraf fsl.script-privacy ikut pindah ke sana dengan alasan yang sama: ia disclaimer,
       bukan instruksi, dan ia berdiri tepat di antara soal dan pemutar. Keadaan terkunci
       tetap terbaca di layar lewat baris "Terkunci — putar audio dulu" (fsl-locked-note),
       jadi tidak ada informasi yang benar-benar hilang dari alur.
       Ekonomi gem TIDAK boleh berdiri di antara soal dan pemutar — gemBarMarkup()
       turun ke kaki kartu di dalam .fsl-gem-footer. Markup-nya sendiri TETAP byte-identik
       (kontrak gems-test.js + tur: #fslGemChip, #fslTranslateToggle); hanya POSISI panggilan
       yang pindah, dan ia tetap satu baris sumber dengan kicker karena gems-test.js G8
       menjangkarkan keduanya pada baris yang sama. */
    renderListening(item,progress){const isDict=item.mode==='dictation';this.root.innerHTML=`<section class="fsl-shell"><div class="fsl-progress"><span style="width:${progress}%"></span></div><article class="fsl-card fsl-card-listening"><h2>${esc(item.question)}</h2>${slPlayerMarkup()}<div class="fsl-actions fsl-audio-actions"><button class="fsl-primary fsl-play-hero" data-play>${T('fsl.play-btn', 'Dengarkan')}</button><button data-exit>${T('fsl.exit-btn', 'Keluar')}</button></div><fieldset class="fsl-work" data-work disabled>${isDict?`<input class="fsl-input" data-dictation autocomplete="off" spellcheck="false" placeholder="${T('fsl.dictation-placeholder', 'Ketik yang kamu dengar…')}"><div class="fsl-actions"><button class="fsl-primary" data-submit>${T('fsl.submit-btn', 'Nilai jawaban')}</button></div>`:`<div class="fsl-options">${item.options.map((o,i)=>`<button class="fsl-option" data-choice="${i}">${esc(o)}</button>`).join('')}</div>`}</fieldset><div data-feedback></div><div class="fsl-gem-footer">${this.gemBarMarkup()}</div></article></section>`;
      this.root.querySelector('[data-play]').addEventListener('click',async event=>{
        const limit=Number(item.maxReplays||this.config.maxListeningReplays);
        if(this.replays>=limit){this.setFeedback(T('skillslab.replay-limit'));return}
        const button=event.currentTarget;
        button.disabled=true;this.replays++;
        const stage=this.root.querySelector('.fsl-player');
        if(stage&&stage.classList&&stage.classList.add)stage.classList.add('is-playing');
        try{
          const playing=this.tts.play(item.script,{voice:item.voice,rate:this.config.ttsRate,suppressSubtitles:true});
          this.prefetchNextScript();
          const result=await Promise.race([playing,new Promise((_,reject)=>setTimeout(()=>reject(new Error('tts_timeout')),TTS_TIMEOUT_MS))]);
          if(result===false||result==null)throw new Error('tts_silent');
          this.noAudio=false;
          this.root.querySelector('[data-work]').disabled=false;
          this.store.noteCapability('tts',String(result?.provider||'ok'));
          const chip=this.root.querySelector('[data-replays]');if(chip)chip.textContent=T('fsl.replays-count',{count:this.replays});
          this.setFeedback(T('fsl.replay-status',{current:this.replays,limit:limit}));
        }catch(_){
          /* m026-BUG1 (cf-b4 §5.2, CF-MIGRATION §Ringkasan). Kegagalan pemutaran BUKAN
             pemakaian replay. Sebelum baris ini, this.replays++ dijalankan di luar try dan
             tidak pernah dikembalikan: DUA kegagalan TTS berturut-turut membuat
             this.replays mencapai batas, tombol Dengarkan menolak selamanya, dan
             [data-work] tetap disabled - item listening itu MATI di layar, permanen, tanpa
             jalan keluar selain keluar dari sesi. Jalur ujian di renderListeningExam()
             sudah melakukan hal yang benar sejak awal (this.replays-- di catch); ini
             menirunya persis. */
          this.replays--;
          this.store.noteCapability('tts','unavailable');
          this.noteNoAudio(item);
        /* Penutup handler ditulis rapat (`}finally{...}});`) karena gems-test.js:420
           mengambil seluruh penangan tombol Dengarkan dengan pola itu untuk membuktikan ia
           tidak menyentuh terjemahan. Merapikannya menjadi baris terpisah membuat gerbang
           itu kehilangan handler-nya dan gagal tanpa sebab yang terlihat. */
        }finally{button.disabled=false;if(stage&&stage.classList&&stage.classList.remove)stage.classList.remove('is-playing')}});
      this.root.querySelector('[data-exit]').addEventListener('click',()=>this.confirmExit());
      if(isDict)this.root.querySelector('[data-submit]').addEventListener('click',()=>{const input=this.root.querySelector('[data-dictation]'),value=input.value;const result=scoreListening(item,value);input.value='';this.finishItem(item,result)});else this.root.querySelectorAll('[data-choice]').forEach(b=>b.addEventListener('click',()=>this.finishItem(item,scoreListening(item,Number(b.getAttribute('data-choice'))))));
      this.bindGemBar(item);
    }

    /* ---- Gem Terjemahan: chip saldo + toggle -----------------------------------------
     *
     * Chip dan toggle duduk di HEADER kartu sesi, bukan di pojok layar: murid harus melihat
     * harga di tempat yang sama dengan barangnya. Chip tetap tampil saat saldo 0 - kemajuan
     * menuju hadiah ("Runtun 3/5") justru paling berguna ketika belum punya gem.
     *
     * #fslTranslateToggle adalah id KONTRAK BERSAMA (dipakai tur fitur & tes browser).
     * Jangan diganti tanpa memperbarui gems-test.js dan tur.
     */
    gemBarMarkup(){
      const g=gemsApi();if(!g)return '';
      const balance=this.gemsBalance(),rules=gemsRules(),copy=g.GEMS_COPY;
      const on=!!this.translationOn;
      return `<div class="fsl-gem-bar">`
        +`<span class="fsl-gem-chip" id="fslGemChip" data-gem-chip role="status" aria-label="${esc(g.chipAria(balance))}"><svg class="fsl-gem-mark" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 4h10l4 6-9 10L3 10z"/><path d="M3 10h18"/><path d="M12 4 8 10l4 10 4-10z"/></svg><b data-gem-count>${esc(g.chipLabel(balance))}</b><small data-gem-streak>${esc(g.streakLabel(this.sessionStreak,this.sessionAwards,rules))}</small></span>`
        +`<button type="button" class="fsl-gem-toggle" id="fslTranslateToggle" data-translate-toggle aria-pressed="${String(on)}"><span class="fsl-gem-toggle-label">${esc(copy.toggleLabel)}</span><small data-gem-price>${esc(g.priceHint(balance))}</small></button>`
        +`<div class="fsl-gem-empty" data-gem-empty hidden><b>${esc(copy.emptyTitle)}</b><p>${esc(copy.emptyBody)}</p></div>`
        +`</div>`;
    }
    bindGemBar(item){
      const toggle=this.root?.querySelector?.('[data-translate-toggle]');
      if(!toggle)return;
      toggle.addEventListener('click',()=>{
        if(this.translationOn){
          // Mematikan tidak mengembalikan gem yang SUDAH terpakai, dan tidak menagih lagi
          // kalau dinyalakan ulang di sesi yang sama. Satu sesi = maksimal satu tagihan.
          this.translationOn=false;this.hideTranslationLine();this.syncGemBar();return;
        }
        const cost=Math.max(1,Number(gemsRules().translationCost)||1);
        if(!this.translationCharged&&this.gemsBalance()<cost){this.showGemEmpty(true);this.syncGemBar();return}
        this.translationOn=true;this.showGemEmpty(false);this.syncGemBar();
        if(this.answeredItemId&&this.answeredItemId===String(item.id||''))this.renderTranslationLine(item);
      });
    }
    showGemEmpty(show){const box=this.root?.querySelector?.('[data-gem-empty]');if(box)box.hidden=!show}
    syncGemBar(){
      const g=gemsApi();if(!g||!this.root)return;
      const balance=this.gemsBalance(),rules=gemsRules();
      const count=this.root.querySelector?.('[data-gem-count]');if(count)count.textContent=g.chipLabel(balance);
      const price=this.root.querySelector?.('[data-gem-price]');if(price)price.textContent=g.priceHint(balance);
      const streak=this.root.querySelector?.('[data-gem-streak]');if(streak)streak.textContent=g.streakLabel(this.sessionStreak,this.sessionAwards,rules);
      const chip=this.root.querySelector?.('[data-gem-chip]');if(chip&&chip.setAttribute)chip.setAttribute('aria-label',g.chipAria(balance));
      const toggle=this.root.querySelector?.('[data-translate-toggle]');if(toggle&&toggle.setAttribute)toggle.setAttribute('aria-pressed',String(!!this.translationOn));
    }
    hideTranslationLine(){const host=this.root?.querySelector?.('[data-translation]');if(host){host.hidden=true;host.innerHTML=''}}
    /**
     * TAGIHAN JUJUR: gem baru dipotong saat terjemahan BENAR-BENAR tampil.
     *
     * FiezelSubtitleTranslate berjalan lewat Worker AI online dengan jatah 40 permintaan/jam
     * dan gagal secara senyap dengan string kosong (recon-audiobook.md §b). Menagih saat
     * toggle ditekan berarti menjual barang yang kadang tidak dikirim. Karena itu urutannya:
     * ambil dulu, baru bayar - dan kalau kosong, katakan apa adanya bahwa gem tidak terpakai.
     *
     * Satu permintaan menanggung skrip DAN pilihan jawaban sekaligus (dipisah baris baru),
     * karena jatah AI dihitung per permintaan, bukan per kalimat.
     */
    async renderTranslationLine(item){
      const host=this.root?.querySelector?.('[data-translation]');if(!host)return false;
      const g=gemsApi();if(!g)return false;
      const copy=g.GEMS_COPY;
      const options=Array.isArray(item.options)?item.options.map(o=>String(o||'')):[];
      const payload=[String(item.script||''),...options].filter(Boolean).join('\n');
      let raw='';
      try{const T=hostScope().FiezelSubtitleTranslate;raw=T&&typeof T.translate==='function'?String(await T.translate(payload)||''):''}catch(_){raw=''}
      if(!this.translationOn){this.hideTranslationLine();return false}
      if(!raw.trim()){
        host.hidden=false;host.innerHTML=`<p class="fsl-translation-miss">${esc(copy.unavailable)}</p>`;
        return false;
      }
      if(!this.translationCharged){
        const cost=Math.max(1,Number(gemsRules().translationCost)||1);
        let ok=false;try{ok=this.options.gems?.spend?.(cost,'translation_session')===true}catch(_){ok=false}
        if(!ok){
          this.translationOn=false;this.showGemEmpty(true);this.syncGemBar();
          host.hidden=false;host.innerHTML=`<p class="fsl-translation-miss">${esc(copy.emptyTitle)}. ${esc(copy.emptyBody)}</p>`;
          return false;
        }
        this.translationCharged=true;
      }
      const lines=raw.split('\n').map(s=>s.trim()).filter(Boolean);
      const scriptLine=lines[0]||raw.trim();
      const optionLines=options.length&&lines.length===options.length+1?lines.slice(1):[];
      host.hidden=false;
      host.innerHTML=`<div class="fsl-translation" data-translation-body><p><b>${esc(T('fsl.translation-label'))}</b> ${esc(scriptLine)}</p>`
        +(optionLines.length?`<ul class="fsl-translation-options">${optionLines.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:'')
        +`<small class="fsl-privacy">${esc(copy.autoNote)}${esc(T('fsl.translation-disclaimer'))}</small></div>`;
      this.syncGemBar();
      return true;
    }
    // m025-145: latihan berformat ujian. Yang membedakannya dari latihan harian bukan isinya
    // melainkan KONTRAKNYA - waktu menyiapkan, waktu bicara, dan butir yang wajib disentuh.
    // Menyembunyikan angka itu berarti melatih murid pada soal ujian tanpa tekanan ujiannya.
    // m025-146: sesi Listening berformat ujian. Tiga hal yang membedakannya dari latihan harian,
    // dan ketiganya berasal dari aturan ujian, bukan dari selera desain:
    //
    // 1. Audio diputar SEKALI. IELTS dan TOEFL tidak pernah mengulang. Bank harian memberi
    //    maxReplays 2, dan latihan yang mengizinkan pengulangan melatih kebiasaan yang justru
    //    menghancurkan skor di ruang ujian.
    // 2. IELTS memperlihatkan soal SELAMA audio berjalan; TOEFL tidak - soalnya baru muncul
    //    setelah audio habis, jadi mencatat bukan pilihan melainkan keharusan.
    // 3. Satu audio membawa banyak soal, dan seluruhnya dinilai sekaligus di akhir.
    renderListeningExam(set,progress){
      const format=this.repo.listeningFormat(set)||{replays:1,questionsVisibleDuringAudio:true};
      const allowedReplays=Math.max(1,Number(format.replays)||1);
      const visibleDuringAudio=format.questionsVisibleDuringAudio!==false;
      const questions=Array.isArray(set.questions)?set.questions:[];
      const questionMarkup=questions.map((question,index)=>{
        const body=question.answerType==='choice'
          ? `<div class="fsl-options">${(question.options||[]).map((option,choice)=>`<button type="button" class="fsl-option" data-q="${index}" data-choice="${choice}">${esc(option)}</button>`).join('')}</div>`
          : `<input class="fsl-input" data-q="${index}" autocomplete="off" spellcheck="false" placeholder="${esc(T('fsl.freeform-placeholder'))}">`;
        return `<li class="fsl-exam-q" data-question="${index}"><p><b>${index+1}.</b> ${esc(question.prompt)}</p>${body}<div class="fsl-q-feedback" data-q-feedback="${index}"></div></li>`;
      }).join('');
      this.root.innerHTML=`${T('skillslab.practice-ujian-audio-diputar-saja',{progress:progress,level:esc(set.level),slMascotStripMarkup:slMascotStripMarkup(),label:esc(format.label||''),allowedReplays:allowedReplays,length:questions.length,note:esc(format.note||''),title:esc(set.title||''),listeningHonesty:esc(this.repo.listeningHonestyText()),label2:visibleDuringAudio?'':'<label class="fsl-notes-label">'+esc(T('fsl.notes-label'))+'<textarea class="fsl-notes" data-notes rows="5" placeholder="'+esc(T('fsl.notes-placeholder'))+'"></textarea></label>',hidden:visibleDuringAudio?'':' hidden',questionMarkup:questionMarkup})}`;

      const responses=new Array(questions.length).fill(undefined);
      const work=this.root.querySelector('[data-work]');
      const status=this.root.querySelector('[data-rec-status]');
      this.root.querySelector('[data-exit]').addEventListener('click',()=>this.confirmExit());
      this.root.querySelectorAll('[data-choice]').forEach(button=>button.addEventListener('click',event=>{
        const target=event.currentTarget,index=Number(target.getAttribute('data-q'));
        this.root.querySelectorAll(`[data-choice][data-q="${index}"]`).forEach(x=>x.classList.remove('is-picked'));
        target.classList.add('is-picked');
        responses[index]=Number(target.getAttribute('data-choice'));
      }));
      this.root.querySelectorAll('input[data-q]').forEach(input=>input.addEventListener('input',event=>{
        responses[Number(event.currentTarget.getAttribute('data-q'))]=event.currentTarget.value;
      }));

      const play=this.root.querySelector('[data-play]');
      play.addEventListener('click',async event=>{
        const button=event.currentTarget;
        if(this.replays>=allowedReplays){status.textContent=T('skillslab.exam-audio-once');return}
        button.disabled=true;this.replays++;
        status.textContent=T('fsl.playing-status');
        try{
          /* Sama seperti jalur harian: false berarti tidak ada suara, dan di ujian itu lebih
             berbahaya lagi - soal terbuka tanpa pernah berbunyi dan nilainya dianggap sah. */
          const played=await this.tts.play(set.script,{voice:set.voice,lang:set.voiceLang||'en-US',suppressSubtitles:true});
          if(played===false||played==null)throw new Error('tts_silent');
          status.textContent=this.replays>=allowedReplays?T('skillslab.audio-done-exam'):T('skillslab.audio-done');
          this.store.noteCapability('tts','ok');
        }catch(error){
          // Audio gagal berarti soalnya TIDAK boleh terbuka: menjawab tanpa mendengar bukan latihan.
          this.replays--;button.disabled=false;
          status.textContent=`${T('skillslab.audio-tidak-can-diputar-item',{message:esc(error.message||error)})}`;
          this.store.noteCapability('tts','unavailable');
          return;
        }
        work.hidden=false;work.disabled=false;
        if(this.replays>=allowedReplays)button.disabled=true;else button.disabled=false;
      });

      this.root.querySelector('[data-submit]').addEventListener('click',()=>{
        const result=scoreListeningExamSet(set,responses);
        const detail=`${T('skillslab.from-right-this-skor-practice',{correct:result.correct,total:result.total})}`;
        questions.forEach((question,index)=>{
          const row=result.rows[index],host=this.root.querySelector(`[data-q-feedback="${index}"]`);
          if(!host)return;
          const key=question.answerType==='choice'?String(question.options?.[question.answerIndex]??''):(question.accept||[])[0]||'';
          host.className=`fsl-q-feedback is-${row.correct?'ok':'wrong'}`;
          host.innerHTML=`<span>${row.correct?esc(T('fsl.answer-correct')):esc(T('fsl.answer-key-prefix'))+esc(key)}</span><small>${esc(question.explain||'')}</small>`;
        });
        this.root.querySelector('[data-work]').disabled=true;
        this.finishItem(set,result,`${detail}<details class="fsl-script"><summary>${T('fsl.show-script', 'Lihat skrip audio')}</summary><pre>${esc(set.script)}</pre></details>`);
      });
    }
    renderSpeakingExam(item,progress){
      const c=capabilities(),format=this.repo.examFormat(item);
      const bullets=Array.isArray(item.cueCard)&&item.cueCard.length?`<ul class="fsl-cue">${item.cueCard.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:'';
      const questions=Array.isArray(item.questions)&&item.questions.length?`<ol class="fsl-cue">${item.questions.map(x=>`<li>${esc(x)}</li>`).join('')}</ol>`:'';
      const followUps=Array.isArray(item.followUps)&&item.followUps.length?`<ol class="fsl-cue">${item.followUps.map(x=>`<li>${esc(x)}</li>`).join('')}</ol>`:'';
      const source=item.sourceText?`<pre class="fsl-source">${esc(item.sourceText)}</pre>`:'';
      const adapted=item.sourceNote?`<p class="fsl-adapted">${esc(item.sourceNote)}</p>`:'';
      const timing=format?`<p class="fsl-timing"><b>${esc(format.label)}</b><span>${T('fsl.prep-timing', 'Menyiapkan {prep} detik · bicara {speak} detik', {prep: format.prepSeconds, speak: format.speakSeconds})}</span><small>${esc(format.note)}</small></p>`:'';
      this.root.innerHTML=`${T('skillslab.practice-ujian-penilaian-otomatis-hanya',{progress:progress,level:esc(item.level),slMascotStripMarkup:slMascotStripMarkup(),timing:timing,instruction:esc(item.instruction),questions:questions,bullets:bullets,source:source,adapted:adapted,followUps:followUps,button:c.speechRecognition?`<button class="fsl-primary" data-recognize>${T('fsl.start-speaking-btn', 'Mulai bicara')}</button>`:'',button2:c.mediaRecorder?`<button data-record>${T('fsl.record-btn', 'Rekam untuk dengar ulang')}</button>`:'',mandiri:c.speechRecognition?T('fsl.ready-to-listen', 'Siap mendengar respons.'):T('fsl.sr-unavailable-record', 'Speech recognition tidak tersedia; gunakan rekam-dengar mandiri.')})}`;
      this.bindSpeakingControls(item);
    }
    renderSpeaking(item,progress){const c=capabilities();this.root.innerHTML=`<section class="fsl-shell"><div class="fsl-progress"><span style="width:${progress}%"></span></div><article class="fsl-card"><span class="fsl-kicker">Speaking · ${esc(item.level)} · ${esc(item.mode)}</span>${slMascotStripMarkup()}<h2>${esc(item.instruction)}</h2>${item.targetText?`<p class="fsl-prompt">${esc(item.targetText)}</p>`:''}<p class="fsl-privacy">${T('fsl.scoring-disclaimer', 'Penilaian otomatis hanya spoken production / target coverage. Ini bukan pengukuran phoneme/pronunciation.')}</p><div class="fsl-actions">${c.speechRecognition?`<button class="fsl-primary" data-recognize>${T('fsl.start-speaking-btn', 'Mulai bicara')}</button>`:''}${c.mediaRecorder?`<button data-record>${T('fsl.record-btn', 'Rekam untuk dengar ulang')}</button>`:''}<button data-exit>${T('fsl.exit-btn', 'Keluar')}</button></div><div data-rec-status class="fsl-status">${c.speechRecognition?T('fsl.ready-to-listen', 'Siap mendengar respons.'):T('fsl.sr-unavailable-record-no-score', 'Speech recognition tidak tersedia; gunakan rekam-dengar mandiri tanpa skor otomatis.')}</div><div data-feedback></div><div data-playback></div></article></section>`;
      this.bindSpeakingControls(item);
    }
    // m025-145: pengikatan kontrol suara dipakai bersama oleh latihan harian dan latihan
    // berformat ujian. Menyalinnya dua kali berarti perbaikan privasi atau penanganan galat
    // hanya akan sampai ke salah satunya.
    bindSpeakingControls(item){
      this.root.querySelector('[data-exit]').addEventListener('click',()=>this.confirmExit());
      this.root.querySelector('[data-recognize]')?.addEventListener('click',async e=>{e.currentTarget.disabled=true;this.root.querySelector('[data-rec-status]').textContent=T('skillslab.rec-listening');try{const r=await this.recognition.listen();this.ephemeralTranscript=r.transcript;const result=scoreSpeaking(item,r.transcript);this.store.noteCapability('speechRecognition','ok');this.root.querySelector('[data-rec-status]').textContent=T('skillslab.rec-received');this.finishItem(item,result,`<div class="fsl-transcript">${esc(r.transcript)}</div>`)}catch(err){this.store.noteCapability('speechRecognition','unavailable');this.root.querySelector('[data-rec-status]').textContent=T('fsl.auto-score-error', 'Tidak dapat menilai otomatis: {error}.', {error: esc(err.message)});e.currentTarget.disabled=false}});
      this.root.querySelector('[data-record]')?.addEventListener('click',async e=>{const btn=e.currentTarget;if(btn.dataset.active==='1'){btn.disabled=true;try{const clip=await this.recorder.stop();btn.dataset.active='0';btn.textContent=T('fsl.record-btn', 'Rekam untuk dengar ulang');btn.disabled=false;if(clip?.url)this.root.querySelector('[data-playback]').innerHTML=`${T('skillslab.audio-hanya-berada-di-memory',{url:esc(clip.url)})}`}catch{btn.disabled=false}}else{try{await this.recorder.start();btn.dataset.active='1';btn.textContent=T('fsl.stop-recording', 'Stop rekaman');this.store.noteCapability('mediaRecorder','ok')}catch{this.store.noteCapability('mediaRecorder','unavailable');this.setFeedback(T('skillslab.mic-unavailable'))}}})
    }
    /**
     * m026-BUG1: keadaan "tidak ada suara" adalah keadaan SAH, bukan kunci.
     *
     * Empat janji sekaligus, dan tiga di antaranya justru soal apa yang TIDAK terjadi:
     *   - item tidak dinilai: store.record() tidak dipanggil, jadi tidak ada skor 0 karangan
     *     untuk soal yang tidak pernah didengar murid, dan tidak ada baris evidence;
     *   - item tidak dikunci: replay sudah dikembalikan di catch, tombol Dengarkan hidup lagi;
     *   - skrip tetap tertutup: memperbaiki bug suara dengan membocorkan naskah akan
     *     mengubah latihan dengar menjadi latihan baca (cf-b4 §5.2 butir 3);
     *   - murid diberi tahu apa adanya, dan diberi satu tombol untuk terus berjalan.
     */
    noteNoAudio(item){
      this.noAudio=true;
      const id=String(item?.id||'');
      if(!Array.isArray(this.noAudioItems))this.noAudioItems=[];
      if(id&&!this.noAudioItems.includes(id))this.noAudioItems.push(id);
      const host=this.root?.querySelector?.('[data-feedback]');
      /* m025-246 — TIGA JALAN KELUAR, BUKAN SATU.
         OWNER: "Listening gagal audio: tampilkan state gagal dengan opsi coba lagi /
         suara peramban / lewati tanpa penalti."

         Sebelum ini keadaan gagal hanya menawarkan "Lanjut ke item lain". Badannya
         memang menyebut bahwa murid boleh menekan Dengarkan lagi, tetapi tombol
         Dengarkan berada DI ATAS blok ini, di luar lipatan pada 390 px - persis
         layar yang baru saja di-scrollIntoView menjauh darinya. Jadi satu-satunya
         jalan keluar yang benar-benar terlihat adalah menyerah.

         Sekarang ketiganya berdiri berdampingan di tempat kegagalannya terjadi:
           coba lagi        -> menekan ulang [data-play] yang sudah ada. Tetap satu
                               gestur murid, jadi kebijakan autoplay tidak dilanggar
                               (tidak ada satu pun jalur di berkas ini yang memutar
                               audio tanpa klik).
           suara peramban   -> speechSynthesis bawaan perangkat. Ia tidak butuh
                               jaringan dan tidak butuh model 152 MB, jadi ia justru
                               jalan keluar yang paling mungkin berhasil ketika mesin
                               neural-lah yang gagal. Hanya ditawarkan bila API-nya
                               benar-benar ada.
           lewati           -> skipNoAudio(), yang sengaja BUKAN finishItem(): tidak
                               ada store.record(), jadi tidak ada skor yang tersimpan
                               untuk soal yang audionya tidak pernah berbunyi. Itulah
                               arti "tanpa penalti", dan sekarang kalimatnya dikatakan
                               kepada murid, bukan hanya benar di dalam kode. */
      var punyaSuaraPeramban=false;
      try{punyaSuaraPeramban=typeof global!=='undefined'&&!!global.speechSynthesis&&typeof global.SpeechSynthesisUtterance==='function'}catch(_){punyaSuaraPeramban=false}
      if(host)host.innerHTML=`<div class="fsl-feedback" data-no-audio role="status"><strong>${T('fsl.audio-error-title', 'Suaranya sedang bermasalah, bukan kamu.')}</strong><span>${T('listening.gagal-body')}</span><span class="fsl-privacy">${T('fsl.audio-error-script-note', 'Skripnya tetap aku tutup: membacanya akan mengubah latihan dengar menjadi latihan baca.')}</span><div class="fsl-actions"><button class="fsl-primary" data-retry-audio>${T('listening.gagal-coba-lagi')}</button>${punyaSuaraPeramban?`<button data-browser-voice>${T('listening.gagal-peramban')}</button>`:''}<button data-skip-no-audio>${T('listening.gagal-lewati')}</button></div><span class="fsl-privacy">${T('listening.gagal-tanpa-penalti')}</span></div>`;
      this.root?.querySelector?.('[data-skip-no-audio]')?.addEventListener('click',()=>this.skipNoAudio());
      /* "Coba lagi" meneruskan klik ke tombol Dengarkan yang sudah ada, alih-alih
         menyalin logika pemutarannya. Menyalinnya berarti dua tempat yang harus
         sepakat tentang batas replay, penanda .is-playing, dan penghitungan ulang
         kegagalan - dan dua tempat seperti itu selalu berakhir tidak sepakat. */
      this.root?.querySelector?.('[data-retry-audio]')?.addEventListener('click',()=>{
        const play=this.root?.querySelector?.('[data-play]');
        if(!play)return;
        try{play.disabled=false}catch(_){}
        play.click();
      });
      this.root?.querySelector?.('[data-browser-voice]')?.addEventListener('click',()=>this.playWithBrowserVoice(item));
      /* Di 390 px, blok ini lahir DI BAWAH lipatan: yang terlihat hanya tombol hitamnya di
         dekat dok, dan murid diminta memutuskan sesuatu tanpa membaca alasannya. Pesan jujur
         yang tidak terbaca sama saja dengan tidak ada. Gagalnya diam - lingkungan tanpa
         layout (gerbang node) tidak punya scrollIntoView dan itu bukan kesalahan. */
      try{host?.querySelector?.('[data-no-audio]')?.scrollIntoView?.({block:'center',behavior:'smooth'})}catch(_){}
      return {state:'no_audio',itemId:id,scored:false,locked:false};
    }
    /* m025-246 — JATUH-BALIK SUARA PERAMBAN.
       speechSynthesis adalah mesin bawaan perangkat: nol byte unduhan, nol jaringan,
       dan ia hidup justru pada perangkat kelas bawah tempat mesin neural paling
       sering gagal. Karena itu ia jalan keluar, bukan hiasan.

       DUA HAL YANG SENGAJA TIDAK DILAKUKAN DI SINI:
       (1) Tidak pernah dipanggil sendiri. Ia hanya berjalan dari klik murid pada
           tombolnya - kontrak "tombol Putar adalah gestur, tidak pernah autoplay".
       (2) Tidak menaikkan this.replays. Batas replay adalah aturan latihan dengar
           (dengar sekali, seperti ujian); kegagalan mesin bukan pemakaian jatah
           murid, dan alasan yang sama sudah tertulis di handler [data-play]. */
    playWithBrowserVoice(item){
      var api=null,Utter=null;
      try{api=global.speechSynthesis;Utter=global.SpeechSynthesisUtterance}catch(_){api=null}
      if(!api||typeof Utter!=='function')return false;
      try{
        this.tts.stop();
        api.cancel();
        var u=new Utter(String(item&&item.script||''));
        u.lang='en-US';
        u.rate=Number(this.config.ttsRate)||1;
        /* Kerja dibuka BEGITU ucapan benar-benar mulai, bukan saat perintah dikirim:
           `speak()` yang gagal senyap (suara sistem belum termuat) tidak boleh membuka
           kolom jawaban untuk audio yang tidak pernah berbunyi. */
        u.onstart=()=>{
          this.noAudio=false;
          var work=this.root&&this.root.querySelector&&this.root.querySelector('[data-work]');
          if(work)work.disabled=false;
          try{this.store.noteCapability('tts','browser-speech-synthesis')}catch(_){}
        };
        api.speak(u);
        return true;
      }catch(_){return false}
    }
    /* Jalan keluar untuk keadaan no_audio: maju satu item TANPA menilai dan TANPA menulis
       evidence. Sengaja bukan finishItem(), karena finishItem() selalu memanggil
       store.record() - memakainya di sini akan menyimpan skor untuk soal yang audionya
       tidak pernah berbunyi. */
    skipNoAudio(){this.tts.stop();this.noAudio=false;this.ephemeralTranscript='';
      /* m025-246: skip rate. Dilaporkan lewat kait host (pola yang sama dengan
         onAnswerFeedback/onSessionEnd) dan BUKAN dengan memanggil analytics langsung:
         gerbang persetujuan analytics hidup di app.js, dan addon yang menembaknya
         sendiri berarti gerbang kedua yang bisa menyimpang dari yang pertama.
         Gagal-diam: telemetri yang bermasalah tidak boleh menahan murid di soal yang
         audionya memang tidak berbunyi. */
      try{if(typeof this.options.onSkip==='function')this.options.onSkip({domain:this.domain,level:this.activeLevel,reason:'audio_failed'})}catch(_){}
      this.index++;this.renderSession();return true}
    setFeedback(text){const el=this.root?.querySelector?.('[data-feedback]');if(el)el.innerHTML=`<div class="fsl-feedback">${esc(text)}</div>`}
    finishItem(item,result,prefix=''){
      const ms=now()-this.startedAt;this.store.record(this.domain,item,result,ms,this.replays);this.emitEvidence();const label=result.passed?T('skillslab.target-pass'):T('skillslab.target-fail');
      /* m025-246 — SKOR SPEAKING BERHENTI JADI ANGKA.
         OWNER: "Skor speaking: label 'Cakupan kata', satu kalimat penjelasan, tanpa
         angka nilai pengucapan."

         Baris lama berbunyi "Skor 62% hanya mengukur target concept coverage; bukan
         pronunciation." Kalimat itu benar dan tetap tidak menolong: yang pertama
         dibaca murid tetap sebuah PERSEN, dan persen di layar bicara akan dibaca
         sebagai nilai pengucapan berapa kali pun kalimat di sebelahnya menyangkalnya.
         Yang ditampilkan sekarang adalah hitungan yang benar-benar diukur mesinnya -
         berapa kata target yang terdengar dari berapa - plus satu kalimat penjelasan.

         Angkanya TIDAK hilang dari data: result.score tetap disimpan store.record()
         dan tetap memberi makan bukti adaptif. Yang berubah hanya apa yang dibaca
         murid. Metrik token_f1 tidak punya conceptsMatched/conceptsTotal, jadi di sana
         hanya kalimat penjelasannya yang tampil - lebih baik daripada memalsukan
         hitungan kata yang tidak pernah dihitung. */
      var cakupan='';
      if(this.domain==='speaking'&&result.conceptsTotal!=null&&result.conceptsMatched!=null){
        cakupan=T('speaking.cakupan-nilai',{terdengar:result.conceptsMatched,total:result.conceptsTotal});
      }
      const note=this.domain==='speaking'
        ? (cakupan?(cakupan+' — '+T('speaking.cakupan-penjelasan')):T('speaking.cakupan-penjelasan'))
        : (I18N && I18N.getLocale() === 'th' ? ('คะแนน ' + result.score + '%.') : ('Skor ' + result.score + '%.'));
      const fb=this.root.querySelector('[data-feedback]');if(fb)fb.innerHTML=`${prefix}<div class="fsl-feedback"><strong>${label}</strong>${this.domain==='speaking'?`<b class="fsl-coverage-label">${esc(T('speaking.cakupan-judul'))}</b>`:''}<span>${esc(note)}</span>${this.domain==='listening'?`<p><b>${esc(T('fsl.script-label'))}</b> ${esc(item.script)}</p><div data-translation hidden></div>`:`<p><b>${T('fsl.sample-response', 'Contoh respons:')}</b> ${esc(item.sampleAnswer||item.targetText||'')}</p>`}<div class="fsl-actions"><button class="fsl-primary" data-next>${T('fsl.next-btn', 'Lanjut')}</button></div></div>`;
      /* R2-4: kabar benar/salah untuk maskot dikirim lewat kait host, BUKAN langsung ke
         FiezelPaw - host yang memegang gerbang reduced-motion/preferensi animasi
         (pawReact), dan addon tidak boleh punya gerbang kedua yang bisa menyimpang.
         Gagal-diam: maskot yang bermasalah tidak boleh merusak penilaian. */
      try{if(typeof this.options.onAnswerFeedback==='function')this.options.onAnswerFeedback(!!result.passed)}catch(_){}
      /* Toggle terjemahan DIKECUALIKAN dari pemadaman tombol: blok feedback adalah satu-satunya
         fase di mana terjemahan boleh tampil, jadi mematikannya di sana harus tetap mungkin. */
      this.root.querySelectorAll('button').forEach(b=>{if(!b.hasAttribute('data-next')&&!b.hasAttribute('data-exit')&&!b.hasAttribute('data-translate-toggle'))b.disabled=true});this.root.querySelector('[data-next]')?.addEventListener('click',()=>{this.ephemeralTranscript='';this.index++;this.renderSession()});
      /* ---- Gem Terjemahan: runtun sesi & hadiah ----------------------------------------
         Dijaga this.domain==='listening' supaya kontrak owner ("runtun dalam sesi listening")
         tidak diam-diam melebar ke speaking dan latihan ujian. Kait host gagal-diam: dompet
         yang bermasalah tidak boleh merusak sesi latihan. */
      if(this.domain==='listening'){
        this.sessionStreak=result.passed?this.sessionStreak+1:0;
        this.answeredItemId=String(item.id||'');
        const won=gemsAwardFor(this.sessionStreak,this.sessionAwards);
        if(won>0){this.sessionAwards++;try{this.options.gems?.award?.(won,'listening_streak_5',{level:this.activeLevel,streak:this.sessionStreak})}catch(_){}}
        this.syncGemBar();
        if(this.translationOn)this.renderTranslationLine(item);
      }
    }
    renderComplete(){this.setSessionStage(false);const ev=this.store.evidence(),d=ev.domains[this.domain];this.root.innerHTML=`${T('skillslab.session-complete-selesai-evidence-sidecar',{Speaking:this.domain==='listening'?'Listening':'Speaking',attempts:d.attempts,averageScore:d.averageScore??'-',passRate:d.passRate??'-'})}`;this.root.querySelector('[data-home]').addEventListener('click',()=>this.renderHub());this.notifySessionEnd('complete')}
    destroy(){this.cancelPrefetch();this.setSessionStage(false);this.tts.stop();this.recognition.stop();this.recorder.destroy();this.ephemeralTranscript='';if(this.root)this.root.innerHTML=''}
  }

  async function create(options){const c=new Controller(options);await c.init();return c}
  return Object.freeze({
    schema:ADDON_SCHEMA,
    version:1,
    create,
    capabilities,
    scoreSpeaking,
    scoreListening,
    normalizeText,
    getDefaultConfig:()=>({...DEFAULT_CONFIG}),
    LEVELS,
    normalizeLevel,
    __test:Object.freeze({tokenF1,keywordCoverage,conceptCoverage,sanitizeState,freshState,mergeConfig,StateStore,DataRepository,Controller,shuffle,randomBelow,createLevelContract})
  });
});
