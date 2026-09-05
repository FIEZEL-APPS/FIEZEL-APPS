#!/usr/bin/env python3
import sys,re
p='/app/app.js';s=open(p,encoding='utf-8').read()
R=[]
def rep(old,new):R.append((old,new))

rep("if(questions.length<GRAMMAR_SESSION_SIZE)return showToast(`Lesson ini baru memiliki ${questions.length} soal valid.`);","if(questions.length<GRAMMAR_SESSION_SIZE)return showToast(tr('grammar.notEnough',{n:questions.length}));")
rep("distractors=marked.map(x=>({option:x.x,reason:x.ok?`“${x.x}” tepat karena sesuai dengan fokus ${focus}.`:grammarOptionReason(x.x,false,x.reason)}));","distractors=marked.map(x=>({option:x.x,reason:x.ok?tr('grammar.q.correctFocus',{option:x.x,focus}):grammarOptionReason(x.x,false,x.reason)}));")
rep("explain:{why:exercise.correctWhy,rule:`${rule} Fokus khusus: ${focus}.`,avoid:'Mulai dari makna kalimat, lalu ikuti petunjuk keputusan yang dijelaskan dalam lesson sebelum memilih bentuk.',memory:`Ingat fokus ${focus}; bedakan fungsi jawaban benar dari miskonsepsi pada setiap distraktor.`,distractors,distractor:'Setiap pilihan salah membawa miskonsepsi yang berbeda; cek alasan per pilihan, bukan hanya bentuk yang tampak familier.'}}}",
"explain:{why:exercise.correctWhy,rule:tr('grammar.q.rule',{rule,focus}),avoid:tr('grammar.q.avoid'),memory:tr('grammar.q.memory',{focus}),distractors,distractor:tr('grammar.q.distractor')}}}")
# reading hub
rep("shell('Ruang Reading',`${R.length} bacaan · ${total} soal.`,`<div class=\"toolbar\"><button class=\"primary\" onclick=\"startReadingAdaptive()\"><i data-lucide=\"zap\"></i> Reading adaptif</button><button onclick=\"startReadingRandom()\"><i data-lucide=\"shuffle\"></i> Bacaan acak</button></div><div class=\"grid\">${LEVELS.map(l=>{const a=R.filter(r=>r.level===l);return card(`<button class=\"level-card\" onclick=\"openReadingLevel('${l}')\"><div class=\"row\"><b>${l}</b><span>${a.length} bacaan</span></div><p class=\"muted\">${a.length?'Ketuk untuk berlatih di level ini.':'Belum tersedia.'}</p></button>`)}).join('')}</div>`)}",
"shell(tr('reading.title'),tr('reading.subtitle',{n:R.length,q:total}),`<div class=\"toolbar\"><button class=\"primary\" onclick=\"startReadingAdaptive()\" data-testid=\"reading-adaptive\"><i data-lucide=\"zap\"></i> ${esc(tr('reading.adaptive'))}</button><button onclick=\"startReadingRandom()\" data-testid=\"reading-random\"><i data-lucide=\"shuffle\"></i> ${esc(tr('reading.random'))}</button></div><div class=\"grid\">${LEVELS.map(l=>{const a=R.filter(r=>r.level===l);return card(`<button class=\"level-card\" onclick=\"openReadingLevel('${l}')\" data-testid=\"reading-level-${l}\"><div class=\"row\"><b>${l}</b><span>${esc(tr('reading.passages',{n:a.length}))}</span></div><p class=\"muted\">${esc(tr(a.length?'reading.tapLevel':'reading.unavailable'))}</p></button>`)}).join('')}</div>`)}")
rep("if(r)readingSession(r);else showToast(`Reading ${l} belum tersedia.`)}","if(r)readingSession(r);else showToast(tr('reading.levelUnavailable',{level:l}))}")
rep("if(R.length)readingSession(pick(R));else showToast('Reading belum tersedia.')}","if(R.length)readingSession(pick(R));else showToast(tr('reading.noneAvailable'))}")
rep("if(!state.adaptiveReady){showToast('Adaptive Reading terbuka setelah diagnosis FIEZEL selesai.');return}","if(!state.adaptiveReady){showToast(tr('reading.adaptiveLocked'));return}")
rep("if(r)readingSession(r);else showToast('Belum ada area reading yang perlu diadaptasikan.')}","if(r)readingSession(r);else showToast(tr('reading.noAdaptiveArea'))}")
rep("  const stem=pick(stems[type])||stems.detail[0];","  const stem=pick(readingStems(type))||readingStems('detail')[0];")
rep("  const title=r.title||'bacaan ini';\n  const contextualStem=`Berdasarkan “${title}”, ${stem.charAt(0).toLowerCase()+stem.slice(1)}`;",
"  const title=r.title||tr('reading.passageDefault');\n  const contextualStem=tr('reading.contextual',{title,stem:stem.charAt(0).toLowerCase()+stem.slice(1)});")
rep("passage:{id:r.id,title:r.title||'Bacaan',text:r.text||''},question:contextualStem,options:shuffled.map(x=>x.x),answerIndex,explain:{evidence,why:evidence?`Bagian yang paling mendukung jawaban ini adalah: “${evidence}”`:`Jawaban yang aman harus punya bukti yang benar-benar ada di bacaan.`,rule:`Fokus soal ini adalah ${focus}. Cari bagian teks yang langsung menjawab fokus tersebut.`,avoid:'Baca pertanyaannya dulu, cari bagian teks yang relevan, lalu cocokkan setiap pilihan dengan bukti. Jangan memilih hanya karena katanya terlihat sama.',memory:`Cara cepat: cari bukti dulu, baru pilih jawaban.`,distractor:'Pilihan lain tidak punya dukungan yang cukup, terlalu luas, atau hanya mengulang kata dari pertanyaan tanpa benar-benar menjawabnya.'}}",
"passage:{id:r.id,title:r.title||tr('reading.titleDefault'),text:r.text||''},question:contextualStem,options:shuffled.map(x=>x.x),answerIndex,explain:{evidence,why:evidence?tr('reading.why.evidence',{evidence}):tr('reading.why.default'),rule:tr('reading.rule',{focus}),avoid:tr('reading.avoid'),memory:tr('reading.memory'),distractor:tr('reading.distractor')}}")
rep("function readingFocusLabel(type){return(","function readingStems(type){const list=I18N.list(`reading.stem.${type}`);return list.length?list:I18N.list('reading.stem.detail')}\nfunction readingFocusLabel(type){return(")

for old,new in R:
    n=s.count(old)
    if n!=1:
        print('FAIL',n,old[:100]);sys.exit(1)
    s=s.replace(old,new)
# drop the inline Indonesian stems table (now in the catalogue)
m=re.search(r"\n  const stems=\{main_idea:\[.*?\]\};\n",s,re.S)
assert m and m.group(0).count('\n')==2,'stems line'
s=s.replace(m.group(0),"\n",1)
open(p,'w',encoding='utf-8').write(s)
print('ok',len(R)+1)
