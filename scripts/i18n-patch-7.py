#!/usr/bin/env python3
import sys,re
p='/app/app.js';s=open(p,encoding='utf-8').read()
R=[]
def rep(old,new):R.append((old,new))

# reading focus labels → catalogue
L=s.index("function readingFocusLabel(type){return(");E=s.index("\n",L)
s=s[:L]+"function readingFocusLabel(type){const key=`reading.focus.${type}`;return I18N.has(key)?tr(key):tr('reading.focusDefault')}"+s[E:]
rep("function friendlySkillName(skill){const s=String(skill||'grammar').replace(/_/g,' ').replace(/\\bvs\\b/gi,'dan').replace(/\\bwith\\b/gi,'dengan').replace(/\\bwithout\\b/gi,'tanpa');return s.charAt(0).toUpperCase()+s.slice(1)}",
"function friendlySkillName(skill){const s=String(skill||'grammar').replace(/_/g,' ').replace(/\\bvs\\b/gi,tr('grammar.skill.vs')).replace(/\\bwith\\b/gi,tr('grammar.skill.with')).replace(/\\bwithout\\b/gi,tr('grammar.skill.without'));return s.charAt(0).toUpperCase()+s.slice(1)}")
rep("function grammarFamilyLabel(item){return GRAMMAR_FAMILY_LABELS[item?.[6]]||'pola grammar'}\nfunction grammarRuleIndonesian(item){return GRAMMAR_FAMILY_RULES[item?.[6]]||GRAMMAR_FAMILY_RULES.core_grammar}",
"function grammarFamilyLabel(item){const key=`grammar.family.${item?.[6]}`;return I18N.has(key)?tr(key):tr('grammar.familyDefault')}\n// Rule explanation in the UI language (name kept for compatibility with the audit suite).\nfunction grammarRuleIndonesian(item){const key=`grammar.rule.${item?.[6]}`;return I18N.has(key)?tr(key):tr('grammar.rule.core_grammar')}")
rep("return hit?`Petunjuk pentingnya adalah “${hit}”.`:'Petunjuknya ada pada hubungan makna, subjek, dan bentuk kata kerja dalam satu kalimat penuh.'}","return hit?tr('grammar.clue.hit',{hit}):tr('grammar.clue.default')}")
L=s.index("function grammarOptionReason(option,isCorrect,rawReason=''){");E=s.index("\n",L)
s=s[:L]+"""function grammarOptionReason(option,isCorrect,rawReason=''){if(isCorrect)return tr('grammar.reason.correct',{option});const raw=String(rawReason).toLowerCase();const rules=[[/specific|definite past|dated past|finished point/,'past'],[/habit|routine|general truth/,'habit'],[/permission/,'permission'],[/obligation|requirement|rule/,'obligation'],[/prohibition/,'prohibition'],[/singular|plural|agreement/,'agreement'],[/superlative/,'superlative'],[/comparative/,'comparative'],[/word order|order/,'order'],[/infinitive/,'infinitive'],[/gerund/,'gerund'],[/passive|agent/,'passive'],[/article|identif/,'article'],[/auxiliary/,'auxiliary']];const hit=rules.find(([re])=>re.test(raw));return tr(`grammar.reason.${hit?hit[1]:'default'}`,{option})}"""+s[E:]
rep("const fallback=['Aturan ini tidak bergantung pada makna kalimat.','Semua bentuk dapat dipakai tanpa melihat konteks.','Urutan kata dan penanda waktu tidak memengaruhi jawaban.'];","const fallback=[tr('grammar.alt.1'),tr('grammar.alt.2'),tr('grammar.alt.3')];")
# grammar exercise prompts
rep("if(variant===0)return direct(base,meta.options,meta.correctIndex,`“${correct}” menerapkan pola ${title.toLowerCase()} secara tepat.`,reasons);","const lower=title.toLowerCase();if(variant===0)return direct(base,meta.options,meta.correctIndex,tr('grammar.ex.v0.why',{correct,title:lower}),reasons);")
rep("if(variant===1)return direct(`Pilih versi lengkap yang benar menurut pola ${title.toLowerCase()}:\\n${base}`,meta.options.map(option=>completeGrammarStem(base,option)),meta.correctIndex,`Versi dengan “${correct}” mempertahankan bentuk dan makna yang diminta.`,reasons);",
"if(variant===1)return direct(tr('grammar.ex.v1.q',{title:lower,base}),meta.options.map(option=>completeGrammarStem(base,option)),meta.correctIndex,tr('grammar.ex.v1.why',{correct}),reasons);")
rep("if(variant===2)return direct(`Mengapa “${correct}” merupakan jawaban yang paling tepat untuk contoh ini?\\n${base}`,[meta.whyCorrect,...wrong.map(x=>String(x.reason||x.detail.whyFails||''))],0,'Alasan tersebut menghubungkan jawaban dengan konteks dan aturan yang benar.');",
"if(variant===2)return direct(tr('grammar.ex.v2.q',{correct,base}),[meta.whyCorrect,...wrong.map(x=>String(x.reason||x.detail.whyFails||''))],0,tr('grammar.ex.v2.why'));")
for v,field in [(3,'rule'),(4,'objective'),(5,'reasoning'),(7,'memory')]:
    pass
rep("if(variant===3)return metaChoice(`Aturan mana yang secara khusus menjelaskan jawaban pada contoh ini?\\n${base}`,'rule','Aturan ini menjelaskan bentuk yang diuji tanpa mengubah konteks lesson.');","if(variant===3)return metaChoice(tr('grammar.ex.v3.q',{base}),'rule',tr('grammar.ex.v3.why'));")
rep("if(variant===4)return metaChoice(`Tujuan belajar mana yang paling sesuai dengan soal berikut?\\n${base}`,'objective','Tujuan ini tepat menggambarkan kemampuan yang sedang diuji.');","if(variant===4)return metaChoice(tr('grammar.ex.v4.q',{base}),'objective',tr('grammar.ex.v4.why'));")
rep("if(variant===5)return metaChoice(`Urutan penalaran mana yang paling aman sebelum memilih jawaban?\\n${base}`,'reasoning','Urutan ini membawa siswa dari petunjuk konteks menuju bentuk grammar yang tepat.');","if(variant===5)return metaChoice(tr('grammar.ex.v5.q',{base}),'reasoning',tr('grammar.ex.v5.why'));")
rep("if(variant===6)return metaChoice(`Kesalahan berpikir apa yang memang dirancang untuk dicegah oleh lesson ${title}?`,'misconception','Inilah miskonsepsi inti yang menjadi sasaran lesson, bukan sekadar salah eja.');","if(variant===6)return metaChoice(tr('grammar.ex.v6.q',{title}),'misconception',tr('grammar.ex.v6.why'));")
rep("if(variant===7)return metaChoice(`Pengingat singkat mana yang paling relevan untuk contoh ini?\\n${base}`,'memory','Pengingat ini langsung menautkan petunjuk soal dengan pola yang benar.');","if(variant===7)return metaChoice(tr('grammar.ex.v7.q',{base}),'memory',tr('grammar.ex.v7.why'));")
rep("if(variant===8)return metaChoice(`Strategi mana yang paling membantu agar kesalahan yang sama tidak terulang?`,'avoid','Strategi ini memeriksa makna dan bentuk pada titik yang paling sering menyesatkan.');","if(variant===8)return metaChoice(tr('grammar.ex.v8.q'),'avoid',tr('grammar.ex.v8.why'));")
rep("return direct(`Seorang siswa memilih “${target.option}”. Alasan mana yang paling tepat menjelaskan mengapa pilihan itu gagal?\\n${base}`,[target.reason,","return direct(tr('grammar.ex.v9.q',{option:target.option,base}),[target.reason,")
rep("return direct(`Label miskonsepsi mana yang paling tepat untuk pilihan “${target.option}”?\\n${base}`,[String(target.detail.misconception||target.reason),'jawaban benar tanpa miskonsepsi',...labels],0,`Label tersebut menjelaskan pola kesalahan di balik pilihan “${target.option}”.`);}",
"return direct(tr('grammar.ex.v12.q',{option:target.option,base}),[String(target.detail.misconception||target.reason),tr('grammar.ex.v12.none'),...labels],0,tr('grammar.ex.v12.why',{option:target.option}));}")
rep("return direct(`Jawaban “${target.option}” belum tepat. Pilih perbaikan yang mempertahankan maksud kalimat berikut:\\n${base}`,meta.options,meta.correctIndex,`Perbaikannya adalah “${correct}”; bentuk itu cocok dengan konteks semula.`,reasons);}",
"return direct(tr('grammar.ex.v15.q',{option:target.option,base}),meta.options,meta.correctIndex,tr('grammar.ex.v15.why',{correct}),reasons);}")
rep("return direct(`Perbandingan mana yang akurat antara “${correct}” dan “${target.option}”?\\n${base}`,[`“${correct}” tepat; ${failure}`,`“${target.option}” tepat, sedangkan “${correct}” mengubah maksud kalimat.`,`Keduanya selalu dapat saling menggantikan tanpa perubahan makna.`,`Keduanya salah karena lesson ini tidak menguji pilihan tersebut.`],0,`Perbandingan pertama menjaga jawaban benar sekaligus mendiagnosis kesalahan spesifik pada “${target.option}”.`);}",
"return direct(tr('grammar.ex.v18.q',{correct,option:target.option,base}),[tr('grammar.ex.v18.o1',{correct,failure}),tr('grammar.ex.v18.o2',{option:target.option,correct}),tr('grammar.ex.v18.o3'),tr('grammar.ex.v18.o4')],0,tr('grammar.ex.v18.why',{option:target.option}));}")
rep("if(variant===21){const labels=Object.entries(GRAMMAR_FAMILY_LABELS).filter(([key])=>key!==meta.family).map(([,label])=>label);const start=stableGrammarHash(meta.id)%labels.length;return direct(`Contoh ini terutama termasuk keluarga grammar yang mana?\\n${base}`,[grammarFamilyLabel(item),labels[start],labels[(start+5)%labels.length],labels[(start+9)%labels.length]],0,`Fokus ${title.toLowerCase()} berada dalam keluarga ${grammarFamilyLabel(item)}.`);}",
"if(variant===21){const labels=Object.keys(GRAMMAR_FAMILY_LABELS).filter(key=>key!==meta.family).map(key=>tr(`grammar.family.${key}`));const start=stableGrammarHash(meta.id)%labels.length;return direct(tr('grammar.ex.v21.q',{base}),[grammarFamilyLabel(item),labels[start],labels[(start+5)%labels.length],labels[(start+9)%labels.length]],0,tr('grammar.ex.v21.why',{title:lower,family:grammarFamilyLabel(item)}));}")
rep("if(variant===22)return metaChoice(`Petunjuk keputusan mana yang perlu ditemukan terlebih dahulu pada contoh ini?\\n${base}`,'reasoning','Petunjuk ini menentukan hubungan antara konteks, fungsi, dan bentuk jawaban.');","if(variant===22)return metaChoice(tr('grammar.ex.v22.q',{base}),'reasoning',tr('grammar.ex.v22.why'));")
rep("return direct(`Ringkasan ajar mana yang paling tepat untuk menjelaskan lesson ${title} kepada siswa lain?`,[correctSummary,...alternatives],0,'Ringkasan tersebut menyatukan tujuan lesson dan aturan yang benar.');}","return direct(tr('grammar.ex.v23.q',{title}),[correctSummary,...alternatives],0,tr('grammar.ex.v23.why'));}")
rep("return direct(`Rencana cek mandiri mana yang paling tepat sebelum menuntaskan lesson ${title}?`,[correctPlan,...avoid.map((x,i)=>`${x} ${memory[i]}`.trim())],0,'Rencana ini menggabungkan pencegahan kesalahan dan pengingat yang khusus untuk lesson aktif.');","return direct(tr('grammar.ex.v24.q',{title}),[correctPlan,...avoid.map((x,i)=>`${x} ${memory[i]}`.trim())],0,tr('grammar.ex.v24.why'));")

for old,new in R:
    n=s.count(old)
    if n!=1:
        print('FAIL',n,old[:100]);sys.exit(1)
    s=s.replace(old,new)
open(p,'w',encoding='utf-8').write(s)
print('ok',len(R)+2)
