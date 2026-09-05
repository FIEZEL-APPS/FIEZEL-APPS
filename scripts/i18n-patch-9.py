#!/usr/bin/env python3
import sys
p='/app/app.js';s=open(p,encoding='utf-8').read()
R=[]
def rep(old,new):R.append((old,new))

rep("let grammarMaster;[V,R,grammarMaster]=await Promise.all(DATA.map(get));",
"const getOptional=async f=>{try{const r=await fetch(new URL(f,root));return r.ok?await r.json():{}}catch{return{}}};let grammarMaster;[V,R,grammarMaster,VOCAB_TH_MEANINGS]=await Promise.all([...DATA.map(get),getOptional('vocabulary-th.json')]);if(!VOCAB_TH_MEANINGS||typeof VOCAB_TH_MEANINGS!=='object')VOCAB_TH_MEANINGS={};")
rep("else if(REMOTE_PUSH_REQUIRED)showToast('Core Brain aktif, tetapi remote push belum tersambung.')","else if(REMOTE_PUSH_REQUIRED)showToast(tr('toast.corePushMissing'))")
rep("function startWelcomeExperience(){\n  const permission=notificationPermission();",
"""function showLanguageGate(){const gate=$('languageGate');if(!gate)return false;gate.classList.remove('hidden');gate.querySelectorAll('[data-locale]').forEach(b=>b.setAttribute('aria-pressed',String(I18N.hasStoredLocale()&&I18N.locale()===b.getAttribute('data-locale'))));document.body?.classList?.add?.('notification-locked');refreshIcons();return true}
function hideLanguageGate(){$('languageGate')?.classList.add('hidden')}
// Locale picker (first launch + settings). Existing learners are migrated to Indonesian inside FiezelI18n.
function chooseLocale(code){const wasPending=I18N.needsSelection();I18N.setLocale(code);I18N.applyStatic();hideLanguageGate();if(wasPending){startWelcomeExperience();return true}if(appUnlocked){render();showToast(tr('lang.changed'))}else setNotificationGateState(notificationPermission());return true}
I18N.onChange(()=>{try{I18N.applyStatic()}catch{}});
function startWelcomeExperience(){
  I18N.applyStatic();if(I18N.needsSelection())return showLanguageGate();const permission=notificationPermission();""")

for old,new in R:
    n=s.count(old)
    if n!=1:
        print('FAIL',n,old[:100]);sys.exit(1)
    s=s.replace(old,new)
open(p,'w',encoding='utf-8').write(s)

p2='/app/features/i18n/fiezel-i18n-strings.js';c=open(p2,encoding='utf-8').read()
old="    ['toast.coreActive','Core Brain + push aktif.','Core Brain และการแจ้งเตือนพุชพร้อมใช้งาน'],"
assert c.count(old)==1
c=c.replace(old,old+"\n    ['toast.corePushMissing','Core Brain aktif, tetapi remote push belum tersambung.','Core Brain ทำงานแล้ว แต่ยังเชื่อมต่อการแจ้งเตือนระยะไกลไม่ได้'],")
old2="    ['ai.style','Gunakan Bahasa Indonesia yang jernih"
assert c.count(old2)==1
i=c.index(old2);j=c.index("',",i+len("    ['ai.style','"))
c=c[:i]+"    ['ai.style',null"+c[j+1:]
open(p2,'w',encoding='utf-8').write(c)
print('ok')
