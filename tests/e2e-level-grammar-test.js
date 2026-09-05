const __fzRoot = require('path').join(__dirname, '..'); /* m025-254: berkas ini pindah dari root ke tests/. __dirname dulu BERARTI root repo, dan puluhan gerbang memakainya untuk menunjuk berkas produksi - alias ini menjaga makna itu tetap benar tanpa menyunting setiap pemakaian. */
// m025-144 — gate untuk B-12: alur level dan Grammar dijalankan di browser sungguhan.
//
// 88 gate sebelumnya membaca sumber atau menjalankan fungsi di dalam vm. Tidak satu pun
// pernah membuka index.html, menekan tombolnya, memuat ulang halaman, dan memeriksa apakah
// progres murid masih ada. Perbedaan itu bukan teori: m025-140 menemukan satu baris `let`
// yang menghapus SELURUH riwayat murid saat dimuat, dan tidak satu pun gate teks bisa
// melihatnya - yang menangkapnya adalah menjalankan berkasnya.
//
// Chromium dijalankan lewat CDP langsung, tanpa dependensi npm baru.
const fs = require('fs');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');

const root = __fzRoot;
const checks = [];
let failed = false;
const check = (name, ok, details) => {
  checks.push({ name, status: ok ? 'PASS' : 'FAIL', details });
  if (!ok) failed = true;
};

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.wasm': 'application/wasm' };

function startServer() {
  const server = http.createServer((request, response) => {
    const pathname = new URL(request.url, 'http://127.0.0.1').pathname;
    const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
    const target = path.resolve(root, relative);
    if (!target.startsWith(`${root}${path.sep}`)) { response.writeHead(403); return response.end('Forbidden'); }
    fs.readFile(target, (error, content) => {
      if (error) { response.writeHead(404); return response.end('Not found'); }
      response.writeHead(200, { 'Content-Type': MIME[path.extname(target)] || 'application/octet-stream' });
      response.end(content);
    });
  });
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port })));
}

function findBrowser() {
  const candidates = [
    process.env.FIEZEL_E2E_CHROME,
    process.env.CHROME_PATH,
    '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    '/opt/pw-browsers/chromium/chrome-linux/chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium'
  ].filter(Boolean);
  for (const candidate of candidates) { try { if (fs.statSync(candidate).isFile()) return candidate; } catch { /* lanjut */ } }
  const base = '/opt/pw-browsers';
  try {
    for (const entry of fs.readdirSync(base)) {
      if (!entry.startsWith('chromium')) continue;
      const guess = path.join(base, entry, 'chrome-linux', 'chrome');
      if (fs.existsSync(guess)) return guess;
    }
  } catch { /* tidak ada */ }
  return '';
}

function launch(binary) {
  return new Promise((resolve, reject) => {
    const child = spawn(binary, [
      '--headless=new', '--remote-debugging-port=0', '--no-sandbox', '--disable-gpu',
      '--disable-dev-shm-usage', '--no-first-run', '--no-default-browser-check',
      '--user-data-dir=' + fs.mkdtempSync('/tmp/fiezel-e2e-')
    ], { stdio: ['ignore', 'pipe', 'pipe'] });
    let buffer = '';
    const timer = setTimeout(() => reject(new Error('browser tidak mengumumkan endpoint DevTools dalam 30 detik')), 30000);
    child.stderr.on('data', chunk => {
      buffer += String(chunk);
      const match = buffer.match(/ws:\/\/[^\s]+/);
      if (match) { clearTimeout(timer); resolve({ child, wsUrl: match[0] }); }
    });
    child.on('exit', code => { clearTimeout(timer); reject(new Error(`browser keluar lebih awal (${code})`)); });
  });
}

function connect(wsUrl) {
  const socket = new WebSocket(wsUrl);
  let nextId = 1;
  const pending = new Map();
  const ready = new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  socket.onmessage = event => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) { pending.get(message.id)(message); pending.delete(message.id); }
  };
  const send = async (method, params, sessionId) => {
    await ready;
    const id = nextId++;
    return new Promise(resolve => {
      pending.set(id, resolve);
      socket.send(JSON.stringify({ id, method, params: params || {}, sessionId }));
    });
  };
  return { send, close: () => socket.close(), ready };
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  const binary = findBrowser();
  if (!binary) {
    const report = { status: 'SKIPPED', reason: 'tidak ada Chromium/Chrome yang bisa dipakai di mesin ini', checks: [] };
    fs.writeFileSync(path.join(root, 'E2E-LEVEL-GRAMMAR-REPORT.json'), `${JSON.stringify(report, null, 2)}\n`);
    console.log(JSON.stringify(report, null, 2));
    console.log('E2E dilewati: browser tidak tersedia. Ini BUKAN bukti aplikasi sehat.');
    return;
  }

  const { server, port } = await startServer();
  const origin = `http://127.0.0.1:${port}/`;
  let browser = null;
  try {
    browser = await launch(binary);
    const cdp = connect(browser.wsUrl);
    const target = await cdp.send('Target.createTarget', { url: 'about:blank' });
    const attached = await cdp.send('Target.attachToTarget', { targetId: target.result.targetId, flatten: true });
    const session = attached.result.sessionId;
    await cdp.send('Page.enable', {}, session);
    await cdp.send('Runtime.enable', {}, session);

    const evaluate = async (expression, awaitPromise = false) => {
      const result = await cdp.send('Runtime.evaluate', { expression, awaitPromise, returnByValue: true }, session);
      if (result.result?.exceptionDetails) throw new Error(result.result.exceptionDetails.exception?.description || 'evaluate gagal');
      return result.result?.result?.value;
    };
    const waitFor = async (expression, label, timeoutMs = 25000) => {
      const deadline = Date.now() + timeoutMs;
      while (Date.now() < deadline) {
        try { if (await evaluate(expression)) return true; } catch { /* halaman belum siap */ }
        await sleep(200);
      }
      throw new Error(`menunggu ${label} melewati batas waktu`);
    };

    // Perkenalan lima langkah adalah perilaku yang BENAR untuk murid baru: sampai ia selesai,
    // #app memang kosong. Gate ini menguji alur belajarnya, jadi perkenalannya ditandai sudah
    // selesai sebelum halaman dimuat - lewat kunci penyimpanan yang sama dengan yang dipakai
    // aplikasi, bukan dengan menyuntik jalan pintas yang hanya ada di tes.
    await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
      source: `try{localStorage.setItem('fiezel-onboarding-v1',JSON.stringify({done:true,at:Date.now(),via:'e2e',name:'Murid Uji',goal:'',level:''}))}catch(e){}`
    }, session);

    await cdp.send('Page.navigate', { url: origin }, session);
    await waitFor('!!window.__getFiezelState', 'aplikasi termuat');
    await waitFor('typeof getActiveLevel==="function" && (window.__fiezelGrammarCount?true:true)', 'kontrak level tersedia');
    await waitFor('document.getElementById("app") && document.getElementById("app").innerHTML.length>200', 'halaman pertama tergambar');

    check('The real page boots and exposes the level contract',
      await evaluate('typeof getActiveLevel==="function" && typeof setActiveLevel==="function"'), 'index.html sungguhan, bukan modul di dalam vm');

    // --- Grammar Hub terurut dan terkunci --------------------------------------------------
    await evaluate('setActiveLevel("A1"), go("grammar"), true');
    // m025-173: Grammar Hub default kini jalur bersimpul (.lesson-path .path-step); tampilan
    // kartu lama tetap ada di balik toggle. Kontraknya SAMA (urut, terkunci beralasan, lesson
    // pertama terbuka) - gerbang ini menguji kontrak itu pada tampilan mana pun yang tergambar.
    // Catatan alasan kunci: di jalur, kalimat prasyarat penuh sengaja hanya di gerbang tertutup
    // PERTAMA (kebisingan), node terkunci lain membawanya lewat title/aria pada tombolnya.
    await waitFor('document.querySelectorAll(".grammar-grid .card, .lesson-path .path-step:not(.path-step-exam)").length>0', 'kartu Grammar tergambar');
    const hub = await evaluate(`(() => {
      const cards=[...document.querySelectorAll('.grammar-grid .card')];
      if(cards.length){
        const numbers=cards.map(c=>parseInt((c.querySelector('.row b')||{}).textContent||'0',10));
        const locked=cards.filter(c=>c.querySelector('button[disabled]'));
        return {
          count: cards.length,
          ordered: numbers.every((n,i)=>n===i+1),
          lockedCount: locked.length,
          lockedHaveReason: locked.every(c=>!!c.querySelector('.lesson-lock-note')),
          firstOpen: !cards[0].querySelector('button[disabled]')
        };
      }
      const steps=[...document.querySelectorAll('.lesson-path .path-step:not(.path-step-exam)')];
      const numbers=steps.map(s=>parseInt(((s.querySelector('.path-label b')||{}).textContent||'0'),10));
      const locked=steps.filter(s=>s.querySelector('button.path-node[disabled]'));
      return {
        count: steps.length,
        ordered: numbers.every((n,i)=>n===i+1),
        lockedCount: locked.length,
        lockedHaveReason: locked.every(s=>!!s.querySelector('.lesson-lock-note')||!!(s.querySelector('button.path-node[disabled]')||{}).title),
        firstOpen: !steps[0].querySelector('button.path-node[disabled]')
      };
    })()`);
    check('Grammar Hub renders the curriculum in order', hub.count > 0 && hub.ordered, hub);
    check('Locked lessons are really disabled in the DOM and say why', hub.lockedCount > 0 && hub.lockedHaveReason, `terkunci=${hub.lockedCount}`);
    check('The first lesson of the level is always open', hub.firstOpen, 'murid baru harus punya pintu masuk');

    const forced = await evaluate(`(() => {
      const skill=GRAMMAR_ITEMS.filter(x=>x.level===getActiveLevel()).map(x=>x.skill).find(s=>lessonUnlockState(s).locked);
      if(!skill)return {skipped:true};
      const before=document.getElementById('app').innerHTML;
      practiceSkill(skill);
      openGrammarLesson(skill);
      return {skipped:false, skill, unchanged: document.getElementById('app').innerHTML===before};
    })()`);
    check('A locked lesson refuses a direct function call, not just a click',
      forced.skipped || forced.unchanged === true, forced);

    // --- Ganti level dari UI ---------------------------------------------------------------
    await evaluate('setActiveLevel("B1"), go("grammar"), true');
    await waitFor('document.querySelectorAll(".grammar-grid .card, .lesson-path .path-step:not(.path-step-exam)").length>0', 'Grammar B1 tergambar');
    const afterSwitch = await evaluate(`({level:getActiveLevel(), note:(document.querySelector('.grammar-level-note b')||{}).textContent||'', cards:document.querySelectorAll('.grammar-grid .card, .lesson-path .path-step:not(.path-step-exam)').length})`);
    check('Switching level switches the panel with it', afterSwitch.level === 'B1' && afterSwitch.note.includes('B1'), afterSwitch);

    // --- Progres bertahan lintas pindah level dan muat ulang -------------------------------
    const marker = await evaluate(`(() => {
      setActiveLevel('A1');
      const st=window.__getFiezelState();
      const skill=GRAMMAR_ITEMS.filter(x=>x.level==='A1').map(x=>x.skill)[0];
      st.grammar[skill]={correct:9,total:10,streak:3,mastery:90,lastSeen:Date.now()};
      st.history=[...(st.history||[]),{at:Date.now(),ok:true,ms:4000,level:'A1',type:'grammar',skill:skill,target:skill}];
      // totalAnswered wajib ikut naik: sanitizeState() SENGAJA membersihkan progres turunan
      // ketika belum ada satu jawaban pun tercatat, supaya state yang rusak tidak menghidupkan
      // penguasaan palsu. Fixture yang lupa ini menuduh aplikasi menghapus progres.
      st.totalAnswered=(st.totalAnswered||0)+1; st.totalCorrect=(st.totalCorrect||0)+1;
      save();
      return {skill, mastery: st.grammar[skill].mastery, history: st.history.length};
    })()`);
    await evaluate('setActiveLevel("B1"), true');
    await evaluate('setActiveLevel("A1"), true');
    const roundTrip = await evaluate(`(() => { const st=window.__getFiezelState(); return {level:getActiveLevel(), mastery:(st.grammar[${JSON.stringify(marker.skill)}]||{}).mastery, history:(st.history||[]).length}; })()`);
    check('A1 -> B1 -> A1 keeps every piece of evidence',
      roundTrip.level === 'A1' && roundTrip.mastery === marker.mastery && roundTrip.history === marker.history, roundTrip);

    await cdp.send('Page.navigate', { url: origin }, session);
    await waitFor('!!window.__getFiezelState', 'aplikasi termuat ulang');
    await waitFor('document.getElementById("app") && document.getElementById("app").innerHTML.length>200', 'halaman tergambar setelah muat ulang');
    const afterReload = await evaluate(`(() => { const st=window.__getFiezelState(); return {level:getActiveLevel(), mastery:(st.grammar[${JSON.stringify(marker.skill)}]||{}).mastery, history:(st.history||[]).length}; })()`);
    check('A reload does not quietly wipe the learner state',
      afterReload.mastery === marker.mastery && afterReload.history >= marker.history && afterReload.level === 'A1', afterReload);

    // --- Service worker benar-benar terdaftar ----------------------------------------------
    const sw = await evaluate('navigator.serviceWorker.getRegistration().then(r=>!!r).catch(()=>false)', true);
    check('The service worker registers on a real origin', sw === true, `registered=${sw}`);

    cdp.close();
  } catch (error) {
    check('E2E run completed', false, String(error && error.message || error));
  } finally {
    if (browser?.child) { try { browser.child.kill('SIGKILL'); } catch { /* sudah mati */ } }
    server.close();
  }

  const report = {
    status: failed ? 'NOT READY' : 'PASS',
    browser: binary,
    counts: { pass: checks.filter(i => i.status === 'PASS').length, fail: checks.filter(i => i.status === 'FAIL').length },
    checks
  };
  fs.writeFileSync(path.join(root, 'E2E-LEVEL-GRAMMAR-REPORT.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  if (failed) process.exitCode = 1;
})().catch(error => { console.error(error); process.exitCode = 1; });
