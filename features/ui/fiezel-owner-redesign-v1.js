/* FIEZEL Owner Redesign v1 — post-app learner shell and Classroom contract */
(function(root){
  'use strict';
  if(!root || !root.document) return;

  const original={
    render:root.render,
    home:root.home,
    classroom:root.classroom,
    renderClassroom:root.renderClassroom,
    wireClassroom:root.wireClassroom,
    classroomSpeak:root.classroomSpeak,
    progress:root.progress
  };
  const primaryMap={home:'home',learn:'learn',vocab:'learn',grammar:'learn',reading:'learn',test:'learn',classroom:'classroom',skills:'practice',practice:'practice',progress:'progress'};
  const allowed=new Set(['home','learn','vocab','grammar','reading','test','classroom','practice','skills','progress']);

  function activePrimary(){
    const target=primaryMap[state.view]||'home';
    document.querySelectorAll('.nav').forEach(btn=>{
      const active=btn.dataset.view===target;
      btn.classList.toggle('active',active);
      if(active) btn.setAttribute('aria-current','page'); else btn.removeAttribute('aria-current');
    });
  }
  function refreshIcons(){ try{ root.lucide?.createIcons?.(); }catch(_){} }
  function page(html){ setApp(`<section class="fade owner-page">${html}</section>`); activePrimary(); enhanceUI(); refreshIcons(); window.scrollTo(0,0); }
  function metric(label,value,detail=''){ return `<div class="owner-metric"><span>${label}</span><strong>${value}</strong>${detail?`<small>${detail}</small>`:''}</div>`; }
  function destination(view,icon,kicker,title,copy,meta=''){
    return `<button class="owner-destination" onclick="go('${view}')"><span class="owner-destination-icon"><i data-lucide="${icon}"></i></span><span><small>${kicker}</small><b>${title}</b><em>${copy}</em>${meta?`<i class="owner-meta">${meta}</i>`:''}</span><i data-lucide="arrow-up-right"></i></button>`;
  }

  function ownerHome(){
    const snapshot=buildLearningSnapshot(),policy=buildAdaptivePolicy(),level=state.placementDone?(snapshot.estimatedLevel||'A1'):'Belum dipetakan';
    const review=snapshot.dueReviews||0, attempts=state.daily?.attempts||0, target=Math.max(1,MEANINGFUL_ATTEMPTS||5);
    page(`<div class="owner-hero">
      <div><span class="owner-eyebrow">TODAY · PERSONAL ENGLISH OS</span><h1>${esc(greetingForNow())}, ${esc(USER_NAME)}.</h1><p>Satu layar untuk tahu apa yang perlu dipelajari, dilatih, dan diperbaiki hari ini.</p>
      <div class="owner-actions"><button class="primary owner-primary" onclick="${state.adaptiveReady?'startAdaptive()':"go('test')"}">${state.adaptiveReady?esc(policy.cta):'Petakan kemampuan'} <i data-lucide="arrow-right"></i></button><button onclick="go('classroom')"><i data-lucide="presentation"></i> Masuk Classroom</button></div></div>
      <aside class="owner-focus"><span>Fokus hari ini</span><strong>${review?`${review} review menunggu`:'Bangun ritme belajar'}</strong><p>${state.daily?.meaningful?'Target bermakna hari ini sudah tercapai.':'Selesaikan sesi pendek yang benar-benar mengukur kemampuan.'}</p></aside>
    </div>
    <div class="owner-metrics">${metric('Level',esc(level),'estimasi aktif')}${metric('Akurasi',`${snapshot.totalAccuracy??0}%`,'seluruh domain')}${metric('Ritme',`${Math.min(attempts,target)}/${target}`,'jawaban bermakna')}${metric('Streak',`${state.streak||0} hari`,'konsistensi')}</div>
    <div class="owner-section-title"><div><span class="owner-eyebrow">WORKSPACES</span><h2>Pilih cara belajar, bukan daftar fitur</h2></div></div>
    <div class="owner-destination-grid">${destination('learn','library','KNOWLEDGE','Learn','Vocabulary, grammar, reading, dan placement berada dalam satu ruang belajar.',`${V.length.toLocaleString()} kata`)}${destination('classroom','presentation','TUTOR','Classroom','Fiezel mengajar dengan suara neural Indonesia, materi target tetap English.','Tutor + quiz')}${destination('practice','audio-waveform','PERFORMANCE','Practice','Speaking dan Listening untuk mengubah pengetahuan menjadi performa.','Speaking + Listening')}${destination('progress','route','EVIDENCE','Journey','Lihat progres, review yang jatuh tempo, dan pola kemampuan.','Progress map')}</div>`);
  }

  function learnHub(){
    page(`<div class="owner-section-title owner-section-lead"><div><span class="owner-eyebrow">LEARN</span><h1>Bangun fondasi English.</h1><p>Pilih domain. Semua materi lama tetap ada, sekarang dikelompokkan supaya fokus lebih jelas.</p></div></div>
    <div class="learning-hub-grid">${destination('vocab','book-a','WORDS','Vocabulary','Recall, makna, nuansa, dan penggunaan.',`${V.length.toLocaleString()} kata`)}${destination('grammar','braces','PATTERNS','Grammar','Pahami pola kalimat dan alasan di balik jawaban.',`${Object.keys(G).length} skill`)}${destination('reading','book-open-text','COMPREHENSION','Reading','Main idea, detail, inferensi, dan tujuan teks.',`${R.length} bacaan`)}${destination('test','scan-search','CALIBRATION','Placement','Kalibrasi level agar rekomendasi berikutnya tetap relevan.','CEFR')}</div>`);
  }

  function practiceHub(){
    const english=self.FiezelVoiceRuntime?.status?.()||{};
    const indo=self.FiezelIndonesianVoice?.status?.()||{};
    page(`<div class="owner-section-title owner-section-lead"><div><span class="owner-eyebrow">PRACTICE</span><h1>Ubah pengetahuan menjadi performa.</h1><p>Speaking dan Listening memakai jalur neural yang eksplisit. Tidak ada browser-TTS yang disamarkan sebagai neural.</p></div></div>
    <div class="practice-status-grid"><div><span>English neural</span><strong>${english.ready?'Ready':english.prepared?'Prepared':'Not prepared'}</strong><small>${english.ready?'Siap latihan.':'Kelola dari pengaturan suara.'}</small></div><div><span>Tutor Indonesia</span><strong>${indo.ready?'Ready':indo.prepared?'Prepared':'Not prepared'}</strong><small>${indo.prepared?'Bundle tersimpan.':'Diperlukan untuk narasi Classroom.'}</small></div></div>
    <div class="practice-launch">${destination('skills','audio-lines','SPEAK + LISTEN','Speaking & Listening','Dengar, respons, dan ukur evidence performa A1–C2.','72 latihan')}</div>`);
  }

  function ownerGo(v){
    if(!allowed.has(v)){ showToast('Halaman tujuan tidak tersedia.'); return false; }
    const swap=()=>{ state.view=v; save(); ownerRender(); };
    if(document.startViewTransition&&state.preferences?.motion!==false) document.startViewTransition(swap); else swap();
    return true;
  }

  function ownerRender(){
    speakingListeningMountToken++;
    if(speakingListeningController){ speakingListeningController.destroy(); speakingListeningController=null; }
    document.querySelectorAll('.nav').forEach(x=>{x.classList.remove('active');x.removeAttribute('aria-current')});
    setApp('');
    if(state.view==='home') ownerHome();
    else if(state.view==='learn') learnHub();
    else if(state.view==='practice') practiceHub();
    else if(state.view==='classroom') original.classroom();
    else if(state.view==='progress') { original.progress(); activePrimary(); }
    else { original.render(); activePrimary(); }
    refreshIcons();
  }

  async function ownerClassroomSpeak(en,id){
    const rt=root.FiezelIndonesianVoice;
    const note=$('classroomVoiceNote');
    const transcript=$('classroomTutorTranscript');
    if(transcript) transcript.textContent=id||'';
    if(!rt?.speak){ if(note) note.textContent='Modul tutor Indonesia tidak tersedia pada build ini.'; return; }
    if(rt.status?.().prepared!==true){ if(note) note.textContent='Unduh Suara Tutor Indonesia untuk mendengar penjelasan Fiezel.'; return; }
    if(classroomSpeaking) return;
    classroomSpeaking=true;
    try{
      if(note) note.textContent='Fiezel sedang menjelaskan…';
      await rt.speak(id||'',{speed:selectedNeuralRate(),lang:'id-ID',allowFallback:false});
      if(note) note.textContent='Tutor neural Indonesia siap.';
    }catch(e){ if(note) note.textContent=`Suara tutor belum siap: ${String(e?.message||e)}.`; }
    finally{ classroomSpeaking=false; }
  }

  function voiceRail(){
    const rt=root.FiezelIndonesianVoice, st=rt?.status?.()||{};
    const ready=st.prepared===true;
    return `<aside class="tutor-rail"><div class="tutor-orb"><i data-lucide="sparkles"></i></div><div><span class="owner-eyebrow">FIEZEL TUTOR · ID</span><strong>${ready?'Tutor siap':'Suara tutor perlu diunduh'}</strong><p id="indonesianVoiceStatus">${ready?'Neural Indonesia tersimpan dan siap dipakai.':'Classroom tetap bisa dibaca, tetapi suara tutor tidak diganti browser TTS.'}</p></div>${ready?'<span class="tutor-ready"><i data-lucide="badge-check"></i> Neural ready</span>':'<button id="prepareIndonesianVoice" class="primary"><i data-lucide="download"></i> Unduh suara tutor</button>'}</aside>`;
  }

  function ownerRenderClassroom(){
    const s=classroomSession,snap=s.snapshot();
    let content='';
    const progress=snap.phase==='teach'?Math.round(((snap.segmentIndex+1)/Math.max(1,snap.segmentCount))*100):snap.phase==='quiz'?Math.round(((snap.questionIndex+1)/Math.max(1,snap.questionCount))*100):snap.phase==='summary'?100:0;
    if(snap.phase==='category'){
      content=`<div class="classroom-intro"><div><span class="owner-eyebrow">PILIH DOMAIN</span><h2>Mau Fiezel ngajarin apa?</h2><p>Materi English, penjelasan tutor dalam bahasa Indonesia.</p></div></div><div class="classroom-grid">${s.categories().map(c=>`<button class="classroom-cat" data-cat="${esc(c.id)}"><i data-lucide="${esc(c.icon)}"></i><b>${esc(c.label)}</b><small>${esc(c.hint)}</small></button>`).join('')}</div>`;
    }else if(snap.phase==='topic'){
      const list=s.lessonsIn(snap.categoryId);
      content=`<div class="classroom-intro"><div><span class="owner-eyebrow">TOPIK</span><h2>Pilih pelajaran.</h2></div></div><div class="classroom-grid">${list.map(l=>`<button class="classroom-cat" data-lesson="${esc(l.id)}"><b>${esc(l.topic)}</b><small>${esc(l.level)}</small></button>`).join('')}</div><div class="classroom-actions"><button data-back="category"><i data-lucide="arrow-left"></i> Semua domain</button></div>`;
    }else if(snap.phase==='teach'){
      const seg=s.currentSegment();
      content=`<div class="classroom-workspace"><article class="classroom-board"><span class="owner-eyebrow">WHITEBOARD · ${esc((snap.categoryId||'').toUpperCase())}</span><h2>${esc(snap.board.title)}</h2><p class="classroom-formula">${esc(snap.board.formula)}</p><div class="board-examples">${snap.board.examples.map(x=>`<span>${esc(x)}</span>`).join('')}</div></article><article class="tutor-panel"><span class="owner-eyebrow">TARGET ENGLISH</span><p class="classroom-en">${esc(seg?.en||'')}</p><span class="owner-eyebrow">PENJELASAN FIEZEL</span><p id="classroomTutorTranscript" class="classroom-id">${esc(seg?.id||'')}</p><p id="classroomVoiceNote" class="muted"></p><div class="classroom-actions"><button data-replay="1"><i data-lucide="volume-2"></i> Ulangi tutor</button><button class="primary" data-next="1">${snap.segmentIndex<snap.segmentCount-1?'Lanjut':'Mulai latihan'} <i data-lucide="arrow-right"></i></button></div></article></div>`;
    }else if(snap.phase==='quiz'){
      const q=s.currentQuestion();
      content=`<div class="classroom-workspace"><article class="classroom-board"><span class="owner-eyebrow">CHECKPOINT · ${esc(snap.topic||'')}</span><h2>${esc(q.prompt)}</h2><div class="classroom-options">${q.options.map((o,i)=>`<button class="classroom-option" data-opt="${i}">${esc(o)}</button>`).join('')}</div></article><article class="tutor-panel"><span class="owner-eyebrow">FEEDBACK TUTOR</span><p id="classroomFeedbackEn" class="classroom-en"></p><p id="classroomTutorTranscript" class="classroom-id">Pilih jawaban. Fiezel akan menjelaskan alasanmu benar atau perlu diperbaiki.</p><p id="classroomVoiceNote" class="muted"></p></article></div>`;
    }else{
      content=`<div class="classroom-summary"><span class="owner-eyebrow">LESSON COMPLETE</span><strong>${snap.scorePercent}%</strong><h2>${esc(snap.topic||'Pelajaran selesai')}</h2><p>${snap.correct} benar dari ${snap.questionCount} soal. Gunakan hasil ini sebagai evidence, bukan sekadar skor.</p><button class="primary" data-restart="1">Pilih topik lain</button></div>`;
    }
    setApp(`<section class="fade owner-page classroom-page">${voiceRail()}<div class="classroom-topline"><div><span class="owner-eyebrow">CLASSROOM</span><h1>Tutor neural Indonesia. Materi tetap English.</h1><p>Fiezel mengajar, menulis konsep, menguji, lalu melakukan remediasi tanpa browser-TTS fallback.</p></div><div class="classroom-progress"><span>${esc(snap.phase)}</span><div><i style="width:${progress}%"></i></div><b>${progress}%</b></div></div>${content}</section>`);
    ownerWireClassroom(); activePrimary(); enhanceUI(); refreshIcons();
  }

  function ownerWireClassroom(){
    const s=classroomSession;
    document.querySelectorAll('[data-cat]').forEach(b=>b.addEventListener('click',()=>{s.chooseCategory(b.dataset.cat);ownerRenderClassroom()}));
    document.querySelectorAll('[data-lesson]').forEach(b=>b.addEventListener('click',()=>{s.chooseLesson(b.dataset.lesson);ownerRenderClassroom();const seg=s.currentSegment();if(seg)ownerClassroomSpeak(seg.en,seg.id)}));
    document.querySelector('[data-back="category"]')?.addEventListener('click',()=>{s.reset();ownerRenderClassroom()});
    document.querySelector('[data-replay]')?.addEventListener('click',()=>{const seg=s.currentSegment();if(seg)ownerClassroomSpeak(seg.en,seg.id)});
    document.querySelector('[data-next]')?.addEventListener('click',()=>{s.nextSegment();ownerRenderClassroom();const seg=s.currentSegment();if(seg)ownerClassroomSpeak(seg.en,seg.id)});
    document.querySelector('[data-restart]')?.addEventListener('click',()=>{s.reset();ownerRenderClassroom()});
    document.querySelector('#prepareIndonesianVoice')?.addEventListener('click',async()=>{await prepareIndonesianVoice();ownerRenderClassroom();const seg=s.currentSegment();if(seg)ownerClassroomSpeak(seg.en,seg.id)});
    document.querySelectorAll('[data-opt]').forEach(b=>b.addEventListener('click',()=>{
      const {result}=s.answer(Number(b.dataset.opt));
      const en=$('classroomFeedbackEn'); if(en) en.textContent=result.feedback.en||'';
      const tr=$('classroomTutorTranscript'); if(tr) tr.textContent=result.feedback.id||'';
      ownerClassroomSpeak(result.feedback.en,result.feedback.id);
      b.classList.add(result.correct?'is-correct':'is-wrong');
      document.querySelectorAll('[data-opt]').forEach(x=>{x.disabled=true});
      setTimeout(ownerRenderClassroom,1450);
    }));
  }

  root.go=ownerGo;
  root.render=ownerRender;
  root.renderClassroom=ownerRenderClassroom;
  root.wireClassroom=ownerWireClassroom;
  root.classroomSpeak=ownerClassroomSpeak;
  root.FiezelOwnerRedesign=Object.freeze({version:'v1',render:ownerRender,go:ownerGo});

  // Re-render the already-unlocked app so the new shell is visible immediately.
  if(typeof appUnlocked!=='undefined' && appUnlocked) ownerRender();
  else activePrimary();
})(typeof globalThis!=='undefined'?globalThis:window);
