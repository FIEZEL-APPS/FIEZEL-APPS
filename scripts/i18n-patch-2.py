#!/usr/bin/env python3
import sys
p='/app/app.js';s=open(p,encoding='utf-8').read()
R=[]
def rep(old,new):R.append((old,new))

rep("showToast('Notifikasi belajar aktif.')}else lockAppForNotifications(permission)","showToast(tr('gate.toast.active'))}else lockAppForNotifications(permission)")
rep("showToast(ok?'Musik fokus aktif':'Ketuk sekali lagi kalau audio masih diblokir browser')}else{stopSoundtrack();showToast('Musik fokus dimatikan')}",
"showToast(tr(ok?'toast.musicOn':'toast.musicBlocked'))}else{stopSoundtrack();showToast(tr('toast.musicOff'))}")
rep("function go(v){if(!VALID_VIEWS.has(v)){showToast('Halaman tujuan tidak tersedia.');return false}","function go(v){if(!VALID_VIEWS.has(v)){showToast(tr('toast.viewUnavailable'));return false}")

# home
rep("<span>FIEZEL PERSONAL · ${esc(todayLabel())}</span>","<span>${esc(tr('home.brandMeta'))} · ${esc(todayLabel())}</span>")
rep("${state.adaptiveReady?esc(policy.cta):'Bangun profil kemampuan'} <i data-lucide=\"arrow-up-right\"></i></button><button class=\"ghost-dark\" onclick=\"askCoachAI()\"><i data-lucide=\"sparkles\"></i> Analisis skill dengan AI</button>",
"${state.adaptiveReady?esc(policy.cta):esc(tr('home.buildProfile'))} <i data-lucide=\"arrow-up-right\"></i></button><button class=\"ghost-dark\" onclick=\"askCoachAI()\" data-testid=\"home-ai-coach-button\"><i data-lucide=\"sparkles\"></i> ${esc(tr('home.analyzeAI'))}</button>")
rep("<small>FIEZEL AI COACH</small><b>${state.adaptiveReady?'Profil aktif':'Mengumpulkan bukti'}</b>","<small>${esc(tr('home.coach.kicker'))}</small><b>${esc(tr(state.adaptiveReady?'home.coach.active':'home.coach.collecting'))}</b>")
rep("<span>${state.adaptiveReady?'CORE PLAN · '+esc(policy.mode.toUpperCase()):'Estimated level'}</span><strong>${state.adaptiveReady?policy.sessionSize+' soal':esc(level)}</strong>",
"<span>${state.adaptiveReady?esc(tr('home.coach.corePlan',{mode:policy.mode.toUpperCase()})):esc(tr('home.coach.estimatedLevel'))}</span><strong>${state.adaptiveReady?esc(tr('home.coach.questions',{n:policy.sessionSize})):esc(level)}</strong>")
rep("<button class=\"coach-link\" onclick=\"askCoachAI()\">Buka analisis personal <i data-lucide=\"arrow-right\"></i></button>","<button class=\"coach-link\" onclick=\"askCoachAI()\">${esc(tr('home.coach.open'))} <i data-lucide=\"arrow-right\"></i></button>")
rep("<div><h3>${state.daily?.meaningful?'Target bermakna tercapai':'Selesaikan ritme hari ini'}</h3><p>${review?`${review} materi menunggu review. `:''}${state.daily?.meaningful?'Latihan hari ini sudah cukup untuk menjaga streak.':'Lima jawaban bermakna menjaga progres tetap terukur.'}</p></div>",
"<div><h3>${esc(tr(state.daily?.meaningful?'home.mission.done':'home.mission.todo'))}</h3><p>${review?esc(tr('home.mission.review',{n:review})):''}${esc(tr(state.daily?.meaningful?'home.mission.doneLead':'home.mission.todoLead'))}</p></div>")
rep("<div class=\"home-stats\"><div>${stat('Level',level)}</div><div>${stat('Akurasi',acc+'%')}</div><div>${stat('Dikuasai',mastered)}</div><div>${stat('Runtun',state.streak+' hari')}</div></div>",
"<div class=\"home-stats\" data-testid=\"home-stats\"><div>${stat(esc(tr('home.stat.level')),level)}</div><div>${stat(esc(tr('home.stat.accuracy')),acc+'%')}</div><div>${stat(esc(tr('home.stat.mastered')),mastered)}</div><div>${stat(esc(tr('home.stat.streak')),esc(tr('home.days',{n:state.streak})))}</div></div>")
rep("<div class=\"home-section-head\"><div><h2>Pilih fokus hari ini</h2></div><button class=\"text-button\" onclick=\"go('progress')\">Lihat peta belajar <i data-lucide=\"arrow-right\"></i></button></div>",
"<div class=\"home-section-head\"><div><h2>${esc(tr('home.focusTitle'))}</h2></div><button class=\"text-button\" onclick=\"go('progress')\">${esc(tr('home.viewMap'))} <i data-lucide=\"arrow-right\"></i></button></div>")
rep("<span><small>${V.length.toLocaleString()} kata</small><b>Vocabulary</b></span>","<span><small>${esc(tr('home.launch.words',{n:V.length.toLocaleString()}))}</small><b>${esc(tr('home.launch.vocab'))}</b></span>")
rep("<span><small>${Object.keys(G).length} skill</small><b>Grammar</b></span>","<span><small>${esc(tr('home.launch.skills',{n:Object.keys(G).length}))}</small><b>${esc(tr('home.launch.grammar'))}</b></span>")
rep("<span><small>${R.length} bacaan</small><b>Reading</b></span>","<span><small>${esc(tr('home.launch.passages',{n:R.length}))}</small><b>${esc(tr('home.launch.reading'))}</b></span>")
# Library + Classroom carry authored Indonesian subtitle/translation content, so they stay Indonesian-only.
rep("  <button class=\"launch-card library-launch\" onclick=\"go('library')\"><span class=\"launch-icon\"><i data-lucide=\"library-big\"></i></span><span><small>9 buku · audiobook · terjemahan sekali ketuk</small><b>Perpustakaan FIEZEL</b></span><i data-lucide=\"arrow-up-right\"></i></button><button class=\"launch-card classroom-launch\" onclick=\"go('classroom')\"><span class=\"launch-icon\"><i data-lucide=\"presentation\"></i></span><span><small>Pilih materi · suara Inggris + subtitle Indonesia</small><b>FIEZEL Classroom</b></span><i data-lucide=\"arrow-up-right\"></i></button>\n",
"  ${indonesianContentLaunchers()}\n")
rep("<span><small>72 latihan · A1–C2</small><b>Speaking + Listening</b></span>","<span><small>${esc(tr('home.launch.skillsLab.sub'))}</small><b>${esc(tr('home.launch.skillsLab'))}</b></span>")
rep("function neuralVoiceCatalog(){","function indonesianContentLaunchers(){if(isThai())return '';return `<button class=\"launch-card library-launch\" onclick=\"go('library')\"><span class=\"launch-icon\"><i data-lucide=\"library-big\"></i></span><span><small>${esc(tr('home.launch.library.sub'))}</small><b>${esc(tr('home.launch.library'))}</b></span><i data-lucide=\"arrow-up-right\"></i></button><button class=\"launch-card classroom-launch\" onclick=\"go('classroom')\"><span class=\"launch-icon\"><i data-lucide=\"presentation\"></i></span><span><small>${esc(tr('home.launch.classroom.sub'))}</small><b>${esc(tr('home.launch.classroom'))}</b></span><i data-lucide=\"arrow-up-right\"></i></button>`}\nfunction neuralVoiceCatalog(){")

# neural voice labels
rep("?.label||'Otomatis';showToast(`Voice neural: ${label}`)","?.label||tr('voice.autoShort');showToast(tr('voice.toast.selected',{label}))")
rep("function neuralRateLabel(v){return v<0.9?`${v.toFixed(2)}x · lebih pelan`:v>1.1?`${v.toFixed(2)}x · lebih cepat`:`${v.toFixed(2)}x · natural`}",
"function neuralRateLabel(v){return tr(v<0.9?'voice.rate.slower':v>1.1?'voice.rate.faster':'voice.rate.natural',{v:v.toFixed(2)})}")
rep("if(!rt)return 'Modul suara Indonesia tidak tersedia pada build ini.';const st=rt.status();const mb=Math.round(Number(st.totalBytes||0)/1000000);return st.prepared?'Suara Indonesia siap dipakai offline.':`Ikut dalam paket suara utama (~${mb} MB). Sekali unduh untuk Indonesia dan Inggris.`}",
"if(!rt)return tr('voice.id.missing');const st=rt.status();const mb=Math.round(Number(st.totalBytes||0)/1000000);return st.prepared?tr('voice.id.ready'):tr('voice.id.bundled',{mb})}")
rep("label=status.circuitOpen?'Neural dihentikan setelah timeout':status.ready?'Suara neural lokal siap':status.prepared?'Aset tersimpan, inisialisasi belum aktif':'Belum disiapkan',",
"label=tr(status.circuitOpen?'voice.status.circuit':status.ready?'voice.status.ready':status.prepared?'voice.status.prepared':'voice.status.none'),")
rep(">Otomatis · variasi latihan</option>",">${esc(tr('voice.auto'))}</option>")
rep("${status.prepared?'Model tersimpan untuk pemakaian offline setelah inisialisasi.':`Unduh satu kali sekitar ${size} MB melalui koneksi ini. Inferensi berjalan lokal tanpa API key atau biaya runtime.`}",
"${esc(status.prepared?tr('voice.stored'):tr('voice.download',{size}))}")
rep("<p class=\"muted\">Status: ${esc(status.error)} · isolated=${status.crossOriginIsolated?'ya':'tidak'} · tts browser=${status.speechSynthesis?'ada':'tidak'}</p>",
"<p class=\"muted\">${esc(tr('voice.statusLine',{error:status.error,isolated:tr(status.crossOriginIsolated?'voice.yes':'voice.no'),tts:tr(status.speechSynthesis?'voice.available':'voice.unavailable')}))}</p>")
rep("<span>Model suara</span><select id=\"neuralVoiceSelect\" ${runtime?'':'disabled'}>${options}</select><small>Pilih suara tetap, atau gunakan variasi suara bawaan pada latihan Listening.</small>",
"<span>${esc(tr('voice.model'))}</span><select id=\"neuralVoiceSelect\" ${runtime?'':'disabled'}>${options}</select><small>${esc(tr('voice.modelHint'))}</small>")

for old,new in R:
    n=s.count(old)
    if n!=1:
        print('FAIL',n,old[:100]);sys.exit(1)
    s=s.replace(old,new)
open(p,'w',encoding='utf-8').write(s)
print('ok',len(R))
