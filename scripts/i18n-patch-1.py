#!/usr/bin/env python3
"""One-off, assertion-checked localization patch for app.js (each old fragment must occur exactly once)."""
import sys
p='/app/app.js';s=open(p,encoding='utf-8').read()
R=[]
def rep(old,new):R.append((old,new))

# ── bootstrap ──
rep("const ALRS_EVIDENCE_LOG_LIMIT=30;",
"const ALRS_EVIDENCE_LOG_LIMIT=30;\nconst I18N=self.FiezelI18n;const tr=(key,params)=>I18N.t(key,params);const isThai=()=>I18N.locale()==='th';\nlet VOCAB_TH_MEANINGS={};")

# ── home greeting / labels ──
rep("function greetingForNow(){const h=new Date().getHours();return h<11?'Pagi, bro. Otak masih fresh 👀':h<15?'Siang, bro. Gas dikit.':h<18?'Sore, bro. Jangan kabur dulu 😭':'Malam, bro. Satu sesi terakhir?'}",
"function greetingForNow(){const h=new Date().getHours();return tr(h<11?'home.greeting.morning':h<15?'home.greeting.noon':h<18?'home.greeting.afternoon':'home.greeting.evening')}")
rep("new Intl.DateTimeFormat('id-ID',{weekday:'long',day:'numeric',month:'long'})","new Intl.DateTimeFormat(I18N.intlLocale(),{weekday:'long',day:'numeric',month:'long'})")
rep("${esc(LEARNER_STAGE.gradeLabel)} · Semester ${LEARNER_STAGE.semester} · Tahun Ajaran ${esc(LEARNER_STAGE.schoolYear)}",
"${esc(tr('home.stage',{grade:tr('home.gradeLabel'),semester:LEARNER_STAGE.semester,year:LEARNER_STAGE.schoolYear}))}")

# ── adaptive policy labels ──
rep("const labels={diagnostic:['Bangun bukti dulu, bro','FIEZEL butuh bukti lintas skill sebelum ngatur latihan secara presisi.','Bangun profil kemampuan'],recovery:['Comeback pendek dulu','Ritme lagi rapuh, jadi Core Brain sengaja bikin sesi lebih pendek biar gampang dituntaskan.','Mulai comeback'],review:['Review dulu sebelum nambah','Ada materi yang mulai rawan lupa. Core Brain tahan materi baru dan prioritaskan recall.','Mulai Smart Review'],repair:['Benerin titik bocor dulu','Ada pola salah yang berulang. Sesi berikutnya difokuskan ke skill itu sebelum pindah jauh.','Perbaiki skill ini'],balance:['Naik level dengan ritme aman','Bukti belajar cukup stabil. Core Brain menyeimbangkan fokus lemah, review, dan transfer lintas skill.','Mulai rencana Core']},label=labels[mode];",
"const label=[tr(`policy.${mode}.title`),tr(`policy.${mode}.summary`),tr(`policy.${mode}.cta`)];")
rep("steps=[];if(mode==='review')steps.push(`Mulai dari review berisiko tinggi (${Math.round(reviewShare*100)}% sesi).`);else if(mode==='repair')steps.push(`Fokus utama: ${targetLabel}.`);else if(mode==='recovery')steps.push('Sesi pendek dulu supaya selesai tanpa bikin beban terasa gede.');else if(mode==='diagnostic')steps.push('Kumpulkan bukti vocabulary, grammar, dan reading secara seimbang.');else steps.push(`Prioritaskan ${targetLabel}, lalu jaga variasi lintas skill.`);steps.push(`Target ${sessionSize} soal · difficulty ${difficultyBand} · pace ${pace}.`);if(confidenceCheck)steps.push('Aktifkan cek keyakinan karena rasa yakin dan hasil nyata masih cukup berjauhan.');else steps.push(avoidNewContent?'Tahan materi baru sampai area prioritas lebih stabil.':'Boleh sisipkan sedikit transfer atau materi baru bila pool aman.');",
"steps=[];if(mode==='review')steps.push(tr('policy.step.review',{share:Math.round(reviewShare*100)}));else if(mode==='repair')steps.push(tr('policy.step.repair',{target:targetLabel}));else if(mode==='recovery')steps.push(tr('policy.step.recovery'));else if(mode==='diagnostic')steps.push(tr('policy.step.diagnostic'));else steps.push(tr('policy.step.balance',{target:targetLabel}));steps.push(tr('policy.step.target',{n:sessionSize,band:difficultyBand,pace}));if(confidenceCheck)steps.push(tr('policy.step.confidence'));else steps.push(tr(avoidNewContent?'policy.step.holdNew':'policy.step.allowNew'));")
rep("text:`${p.summary} Fokus: ${focus}. ${p.sessionSize} soal, sekitar ${p.estimatedMinutes} menit.`","text:tr('coach.focus',{summary:p.summary,focus,n:p.sessionSize,min:p.estimatedMinutes})")
rep("weak:weak||'Belum ada pola',goal:state.adaptiveReady?'12 soal adaptif':'Mulai diagnostik'","weak:weak||tr('coach.noPattern'),goal:tr(state.adaptiveReady?'coach.goal.adaptive':'coach.goal.diagnostic')")

# ── notification gate ──
rep("stateText.textContent='Notifikasi aktif. Membuka ruang belajar…';stateText.className='notification-status success';button.disabled=true;button.innerHTML='<i data-lucide=\"circle-check-big\"></i> Notifikasi aktif';help.textContent='Izin tersimpan di browser ini.';",
"stateText.textContent=tr('gate.granted.status');stateText.className='notification-status success';button.disabled=true;button.innerHTML=`<i data-lucide=\"circle-check-big\"></i> ${esc(tr('gate.granted.button'))}`;help.textContent=tr('gate.granted.help');")
rep("stateText.textContent='Izin notifikasi ditolak. FIEZEL tetap terkunci.';stateText.className='notification-status error';button.disabled=false;button.innerHTML='Cek izin lagi <i data-lucide=\"refresh-cw\"></i>';body.textContent='Notifikasi adalah syarat masuk FIEZEL. Aktifkan kembali izin untuk situs ini dari Site settings / ikon gembok browser, lalu kembali ke halaman ini.';help.innerHTML='Setelah mengubah izin menjadi <b>Allow / Izinkan</b>, kembali ke FIEZEL. Aplikasi akan mengecek ulang otomatis.';",
"stateText.textContent=tr('gate.denied.status');stateText.className='notification-status error';button.disabled=false;button.innerHTML=`${esc(tr('gate.denied.button'))} <i data-lucide=\"refresh-cw\"></i>`;body.textContent=tr('gate.denied.body');help.innerHTML=tr('gate.denied.help');")
rep("stateText.textContent='Browser ini tidak menyediakan Notification API yang dibutuhkan.';stateText.className='notification-status error';button.disabled=true;button.textContent='Notifikasi tidak didukung';body.textContent='FIEZEL versi ini mewajibkan notifikasi. Gunakan browser/PWA yang mendukung Web Notifications agar aplikasi dapat dibuka.';help.textContent='Coba browser terbaru atau instal FIEZEL sebagai PWA pada perangkat yang mendukung notifikasi web.';",
"stateText.textContent=tr('gate.unsupported.status');stateText.className='notification-status error';button.disabled=true;button.textContent=tr('gate.unsupported.button');body.textContent=tr('gate.unsupported.body');help.textContent=tr('gate.unsupported.help');")
rep("stateText.textContent='Izin notifikasi belum diberikan.';stateText.className='notification-status';button.disabled=false;button.innerHTML='Aktifkan notifikasi <i data-lucide=\"bell-ring\"></i>';help.innerHTML='Browser akan menampilkan permintaan izin. Pilih <b>Allow / Izinkan</b> untuk melanjutkan.';",
"stateText.textContent=tr('gate.default.status');stateText.className='notification-status';button.disabled=false;button.innerHTML=`${esc(tr('gate.button'))} <i data-lucide=\"bell-ring\"></i>`;help.innerHTML=tr('gate.help');")
rep("if(REMOTE_PUSH_REQUIRED)showToast('Core Brain belum tersambung dengan benar.');return}return ensureRemotePushSubscription().then(result=>{if(result.ok){syncRemoteLearningActivity();showToast('Core Brain + push aktif.')}",
"if(REMOTE_PUSH_REQUIRED)showToast(tr('toast.coreOffline'));return}return ensureRemotePushSubscription().then(result=>{if(result.ok){syncRemoteLearningActivity();showToast(tr('toast.coreActive'))}")

# ── reminders + login messages: register Indonesian source, read via catalogue ──
rep("const pool=REMINDER_MESSAGES[decision.kind]||REMINDER_MESSAGES.starter,","const pool=reminderMessages(decision.kind),")
rep("const titles=REMINDER_TITLES[kind]||REMINDER_TITLES.starter;","const titles=reminderTitles(kind);")
rep("function selectLoginMessage(){","function reminderMessages(kind){const pool=I18N.list(`reminder.messages.${kind}`);return pool.length?pool:I18N.list('reminder.messages.starter')}\nfunction reminderTitles(kind){const pool=I18N.list(`reminder.titles.${kind}`);return pool.length?pool:I18N.list('reminder.titles.starter')}\nfunction registerIndonesianRuntimeStrings(){const entries={'home.loginMessages':LOGIN_MESSAGES};for(const [kind,list] of Object.entries(REMINDER_TITLES))entries[`reminder.titles.${kind}`]=list;for(const [kind,list] of Object.entries(REMINDER_MESSAGES))entries[`reminder.messages.${kind}`]=list;I18N.extend('id',entries)}\nregisterIndonesianRuntimeStrings();\nfunction selectLoginMessage(){")

open(p,'w',encoding='utf-8').write(s) if False else None
for old,new in R:
    n=s.count(old)
    if n!=1:
        print('FAIL',n,old[:90]);sys.exit(1)
    s=s.replace(old,new)
open(p,'w',encoding='utf-8').write(s)
print('ok',len(R))
