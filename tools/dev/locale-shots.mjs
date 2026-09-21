// Harness lokal (bukan gerbang): potret layar aplikasi dalam locale tertentu untuk
// screenshot situs marketing. Pakai: node shots-th.mjs <locale> <outdir>
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire('/opt/node22/lib/node_modules/playwright/');
const pw = require('/opt/node22/lib/node_modules/playwright');
const ROOT = '/home/user/FIEZEL-APPS';
const LOCALE = process.argv[2] || 'th';
const OUT = process.argv[3] || '/tmp/fz-shots-th';
fs.mkdirSync(OUT, { recursive: true });
const MIME = { '.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2','.ogg':'audio/ogg','.mp3':'audio/mpeg' };

const server = http.createServer((req,res)=>{
  let p = decodeURIComponent((req.url||'/').split('?')[0]); if(p.endsWith('/')) p+='index.html';
  const f = path.normalize(path.join(ROOT,p));
  fs.stat(f,(err,st)=>{ if(err||!st.isFile()){res.writeHead(404);return res.end();}
    res.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream','Cache-Control':'no-store'});
    fs.createReadStream(f).pipe(res); });
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const port = server.address().port;
const BASE = `http://127.0.0.1:${port}/index.html`;
const browser = await pw.chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox','--disable-dev-shm-usage'] });

const seed = (loc) => {
  try{
    localStorage.clear();
    localStorage.setItem('fiezel-onboarding-v1', JSON.stringify({done:true,at:Date.now(),via:'finish',locale:loc,name:loc==='th'?'ปิติ':'Rani'}));
    localStorage.setItem('fiezel-reminder-invite-v1', JSON.stringify({offers:9,decided:true}));
    localStorage.setItem('fiezel-puter-auth-skipped','1');
    localStorage.setItem('fiezel-tour-v1','finish');
    localStorage.setItem('fiezel-v4-state', JSON.stringify({preferences:{learnerLocale:loc}}));
  }catch(_){}
};

// Dimensi TERIKAT ke atribut width/height yang ditulis halaman marketing. Mengubahnya
// tanpa mengubah halaman membuat browser melakukan layout shift (CLS) di Core Web Vitals.
const SHOTS = [
  { name:'latihan-mobile',  view:'latihan', w:390,  h:844, dsf:2 },
  { name:'grammar-mobile',  view:'grammar', w:390,  h:844, dsf:2 },
  { name:'reading-mobile',  view:'reading', w:390,  h:844, dsf:2 },
  { name:'extra-mobile',    view:'vocab',   w:390,  h:844, dsf:2 },
  { name:'latihan-desktop', view:'latihan', w:1280, h:800, dsf:2 },
  { name:'teacher-desktop', view:'teacher', w:1440, h:900, dsf:1 },
];

for (const s of SHOTS){
  const ctx = await browser.newContext({ viewport:{width:s.w,height:s.h}, deviceScaleFactor:s.dsf, locale: LOCALE==='th'?'th-TH':'id-ID' });
  await ctx.route('**/*', r => r.request().url().startsWith(`http://127.0.0.1:${port}/`) ? r.continue() : r.abort());
  const page = await ctx.newPage();
  await page.addInitScript(seed, LOCALE);
  if (s.view==='teacher') await page.addInitScript(()=>{ try{
    localStorage.setItem('fz_teacher_mode','1');
    sessionStorage.setItem('fz-teacher-preview','1');
    sessionStorage.setItem('fiezel-teacher-v1-preview','1');
  }catch(_){}} );
  await page.goto(BASE,{waitUntil:'load',timeout:60000});
  await page.waitForFunction(()=>typeof window.go==='function',null,{timeout:45000}).catch(()=>{});
  await page.waitForTimeout(4000);
  await page.evaluate(()=>{ document.getElementById('fiezelBootSplash')?.remove();
    document.documentElement.classList.remove('fz-booting');
    document.querySelector('.fiezel-ob')?.remove(); document.getElementById('fzRitual')?.remove(); });
  if (s.view==='teacher'){
    await page.evaluate(()=>{ try{ window.FiezelTeacherShell?.open?.(); }catch(_){}
      try{ window.go('tutor'); }catch(_){} });
    await page.waitForTimeout(2600);
  } else if (s.view!=='home'){ await page.evaluate(v=>window.go(v), s.view); await page.waitForTimeout(1800); }
  // Gelembung coach adalah OVERLAY mengambang, bukan isi layar, dan copy-nya masih
  // berbahasa Indonesia walau locale th (utang i18n, lihat handoff rebrand). Ia dibuang
  // dari potret supaya screenshot marketing tidak memamerkan kebocoran bahasa.
  await page.evaluate(()=>{ document.querySelectorAll(
    '.fz-coach, .fz-coach-bubble, .fz-coach-dock, .fz-coach-mascot, .fz-coach-msg, [class*="fz-coach"]'
  ).forEach(n=>n.remove()); });
  await page.waitForTimeout(600);
  const loc = await page.evaluate(()=>({ t: document.body.innerText.slice(0,160),
    i18n: (window.FiezelI18n&&window.FiezelI18n.getLocale)?window.FiezelI18n.getLocale():'?' }));
  console.log(`[${s.name}] locale=${loc.i18n} :: ${loc.t.replace(/\s+/g,' ').slice(0,90)}`);
  await page.screenshot({ path: path.join(OUT, `${s.name}.png`) });
  await ctx.close();
}
await browser.close(); server.close();
console.log('DONE ->', OUT);
