import { chromium } from 'playwright';
import path from 'path';
import http from 'http';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');
const PORT = 4539;

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/' || reqPath === '') reqPath = '/index.html';
  const filePath = path.join(ROOT, reqPath.replace(/^\//, ''));
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    const mime = {
      '.html': 'text/html; charset=utf-8',
      '.js': 'text/javascript; charset=utf-8',
      '.mjs': 'text/javascript; charset=utf-8',
      '.json': 'application/json; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.svg': 'image/svg+xml',
      '.png': 'image/png'
    }[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime, 'Access-Control-Allow-Origin': '*' });
    res.end(fs.readFileSync(filePath));
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(0, '127.0.0.1', async () => {
  const actualPort = server.address().port;
  console.log(`[ProbeNavLifecycle] Server running at http://127.0.0.1:${actualPort}`);
  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      args: [
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
        '--no-sandbox',
        '--disable-setuid-sandbox'
      ]
    });

    const context = await browser.newContext({
      viewport: { width: 412, height: 915 },
      permissions: ['microphone']
    });

    await context.addInitScript(() => {
      localStorage.setItem('fz_user_name', 'Rian Pratama');
      localStorage.setItem('fiezel_course', 'ja');
      localStorage.setItem('fiezel_target_lang', 'ja');
      localStorage.setItem('fz_target_course', 'ja');
      localStorage.setItem('fz_onboarding_done', '1');
      localStorage.setItem('fz_auth_skip', '1');
      localStorage.setItem('fiezel-auth-v1', JSON.stringify({ v: 1, signedIn: true, at: Date.now(), role: 'murid', via: 'akun' }));
      localStorage.setItem('fiezel-onboarding-v1', JSON.stringify({ done: true, at: Date.now(), via: 'finish', locale: 'id', name: 'Rian Pratama', goal: 'general', level: 'N5', role: 'murid', course: 'ja' }));
      localStorage.setItem('fiezel-tour-v1', 'finish');
      sessionStorage.setItem('fiezel_boot_count', '2');
      setInterval(() => {
        document.querySelectorAll('.fz-tour, .fz-tour-scrim, #fzPrasasti, #fzRitual, .fz-auth').forEach(e => e.remove());
        document.documentElement.classList.remove('fz-booting');
        document.body.classList.remove('fz-auth-open');
      }, 50);
    });

    const page = await context.newPage();
    page.on('pageerror', err => console.log('[PAGE ERROR]', err.message, err.stack));
    page.on('console', msg => {
      const txt = msg.text();
      if (txt.includes('Error') || txt.includes('warn') || txt.includes('[Fiezel]')) {
        console.log('[PAGE]', txt);
      }
    });

    console.log('\n=== TAHAP 1: Buka Aplikasi & Verifikasi Layar Awal Home ===');
    await page.goto(`http://127.0.0.1:${actualPort}/index.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof window.go === 'function' && typeof window.FiezelInteractiveChat !== 'undefined', null, { timeout: 15000 });
    await page.waitForTimeout(600);

    await page.evaluate(() => {
      document.getElementById('fiezelBootSplash')?.remove();
      document.documentElement.classList.remove('fz-booting');
      document.querySelector('.fiezel-ob')?.remove();
      document.getElementById('authGate')?.remove();
      document.getElementById('fzRitual')?.remove();
    });

    // Pastikan di Home
    await page.evaluate(() => window.go('home'));
    await page.waitForTimeout(400);

    const getView = () => window.__fiezelAudit?.liveState()?.view || (typeof state !== 'undefined' ? state?.view : null);

    const initialHomeState = await page.evaluate(() => {
      const bn = document.querySelector('.bottomnav');
      const bnStyle = bn ? window.getComputedStyle(bn) : null;
      const activeTab = document.querySelector('.bottomnav .nav.active');
      const currentView = window.__fiezelAudit?.liveState()?.view || (typeof state !== 'undefined' ? state?.view : null);
      return {
        view: currentView,
        bottomnavExists: !!bn,
        bottomnavDisplay: bnStyle?.display,
        bottomnavVisibility: bnStyle?.visibility,
        bottomnavInlineDisplay: bn?.style?.display || '',
        activeTab: activeTab?.getAttribute('data-view')
      };
    });

    console.log('Status Layar Awal Home:', initialHomeState);
    if (initialHomeState.view !== 'home') throw new Error(`Harus di home, tetapi view=${initialHomeState.view}`);
    if (initialHomeState.bottomnavDisplay === 'none') throw new Error('Bottomnav tidak tampak di Home!');
    console.log('✓ Home aktif dan bottomnav tampak normal.');

    console.log('\n=== TAHAP 2: Klik Kartu Kawan Bicara di Home -> Masuk Chat ===');
    const hasKawanCard = await page.evaluate(() => {
      return !!document.querySelector('[data-testid="kawan-bicara-home-card"]') ||
             !!document.querySelector('.fz-kawan-card');
    });
    console.log('Kartu Kawan Bicara ditemukan di Home:', hasKawanCard);
    if (!hasKawanCard) throw new Error('Kartu Kawan Bicara tidak ditemukan di Home!');

    // Klik nyata murid pada tombol CTA kartu
    await page.click('[data-testid="kawan-bicara-cta"], [data-testid="kawan-bicara-home-card"], .fz-kawan-card');
    await page.waitForSelector('.fzc-feed', { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(400);

    const chatViewState = await page.evaluate(() => {
      const bn = document.querySelector('.bottomnav');
      const bnStyle = bn ? window.getComputedStyle(bn) : null;
      const currentView = window.__fiezelAudit?.liveState()?.view || (typeof state !== 'undefined' ? state?.view : null);
      return {
        view: currentView,
        hasFeed: !!document.querySelector('.fzc-feed'),
        htmlClassChat: document.documentElement.classList.contains('fz-view-chat'),
        bodyClassChat: document.body.classList.contains('fz-view-chat'),
        bottomnavDisplay: bnStyle?.display,
        bottomnavInlineDisplay: bn?.style?.display || ''
      };
    });
    console.log('Status View Chat:', chatViewState);
    if (chatViewState.view !== 'chat') throw new Error(`Gagal masuk ke view chat! view=${chatViewState.view}`);
    if (!chatViewState.hasFeed) throw new Error('Markup feed kawan bicara tidak terpasang di DOM!');
    console.log('✓ Masuk ke view chat berhasil.');

    console.log('\n=== TAHAP 3: Klik Tombol Kembali (Back) dari Chat -> Kembali ke Home ===');
    const backBtnSelector = await page.evaluate(() => {
      const fzcBtn = document.getElementById('fzcBtnBack');
      if (fzcBtn && window.getComputedStyle(fzcBtn).display !== 'none' && window.getComputedStyle(fzcBtn).visibility !== 'hidden') {
        return '#fzcBtnBack';
      }
      const topBtn = document.getElementById('topContextBackBtn');
      if (topBtn && window.getComputedStyle(topBtn).display !== 'none' && window.getComputedStyle(topBtn).visibility !== 'hidden') {
        return '#topContextBackBtn';
      }
      return null;
    });

    console.log('Tombol Kembali terdeteksi di chat view:', backBtnSelector);
    if (!backBtnSelector) throw new Error('Tidak ada tombol kembali yang tampak di view chat!');

    // Simulasikan klik tombol Kembali oleh murid
    await page.click(backBtnSelector);
    await page.waitForTimeout(600);

    const afterBackState = await page.evaluate(() => {
      const bn = document.querySelector('.bottomnav');
      const bnStyle = bn ? window.getComputedStyle(bn) : null;
      const currentView = window.__fiezelAudit?.liveState()?.view || (typeof state !== 'undefined' ? state?.view : null);
      return {
        view: currentView,
        bottomnavDisplay: bnStyle?.display,
        bottomnavInlineDisplay: bn?.style?.display || '',
        htmlClassChat: document.documentElement.classList.contains('fz-view-chat'),
        bodyClassChat: document.body.classList.contains('fz-view-chat')
      };
    });
    console.log('Status setelah klik tombol Kembali:', afterBackState);

    // Verifikasi apakah kembali ke Home
    if (afterBackState.view !== 'home') {
      console.error(`[BUG DETECTED] Setelah klik Kembali dari chat, view adalah '${afterBackState.view}' (diharapkan 'home')!`);
      throw new Error(`Navigasi kembali dari chat gagal mendarat di 'home', mendarat di '${afterBackState.view}'`);
    }

    // Verifikasi apakah bottomnav KEMBALI MUNCUL
    if (afterBackState.bottomnavDisplay === 'none' || afterBackState.bottomnavInlineDisplay === 'none') {
      console.error(`[BUG DETECTED] Bottomnav lenyap setelah keluar dari chat! display: ${afterBackState.bottomnavDisplay}, inline: ${afterBackState.bottomnavInlineDisplay}`);
      throw new Error('Bottomnav lenyap/tersembunyi setelah kembali dari chat!');
    }
    console.log('✓ Berhasil kembali ke Home dan bottomnav tampak.');

    console.log('\n=== TAHAP 3B: Uji Tombol Back In-Chat Header (#fzcBtnBack) ===');
    await page.evaluate(() => window.go('chat'));
    await page.waitForSelector('#fzcBtnBack', { timeout: 5000 });
    await page.waitForTimeout(300);
    await page.click('#fzcBtnBack');
    await page.waitForTimeout(500);
    const afterInChatBack = await page.evaluate(() => {
      const bn = document.querySelector('.bottomnav');
      const bnStyle = bn ? window.getComputedStyle(bn) : null;
      const currentView = window.__fiezelAudit?.liveState()?.view || (typeof state !== 'undefined' ? state?.view : null);
      return {
        view: currentView,
        bottomnavDisplay: bnStyle?.display,
        bottomnavInlineDisplay: bn?.style?.display || ''
      };
    });
    console.log('Status setelah klik tombol in-chat Back (#fzcBtnBack):', afterInChatBack);
    if (afterInChatBack.view !== 'home') throw new Error(`Klik #fzcBtnBack gagal mendarat di 'home', mendarat di '${afterInChatBack.view}'`);
    if (afterInChatBack.bottomnavDisplay === 'none') throw new Error('Bottomnav tidak muncul setelah klik #fzcBtnBack!');
    console.log('✓ Tombol Back In-Chat (#fzcBtnBack) berhasil mengembalikan user ke Home dengan bottomnav aktif.');

    console.log('\n=== TAHAP 4: Uji Bottomnav DAPAT DIKLIK (Latihan & Game) ===');
    // Klik tab Latihan di bottomnav
    await page.click('.bottomnav [data-view="latihan"]');
    await page.waitForTimeout(400);
    const viewLatihan = await page.evaluate(() => window.__fiezelAudit?.liveState()?.view || (typeof state !== 'undefined' ? state?.view : null));
    console.log('Status view setelah klik tab Latihan:', viewLatihan);
    if (viewLatihan !== 'latihan') throw new Error(`Klik tab latihan gagal, view=${viewLatihan}`);

    // Klik tab Game di bottomnav
    await page.click('.bottomnav [data-view="game"]');
    await page.waitForTimeout(400);
    const viewGame = await page.evaluate(() => window.__fiezelAudit?.liveState()?.view || (typeof state !== 'undefined' ? state?.view : null));
    console.log('Status view setelah klik tab Game:', viewGame);
    if (viewGame !== 'game') throw new Error(`Klik tab game gagal, view=${viewGame}`);

    // Kembali ke Home
    await page.click('.bottomnav [data-view="home"]');
    await page.waitForTimeout(400);
    const viewHomeAgain = await page.evaluate(() => window.__fiezelAudit?.liveState()?.view || (typeof state !== 'undefined' ? state?.view : null));
    console.log('Status view setelah klik tab Home:', viewHomeAgain);
    if (viewHomeAgain !== 'home') throw new Error(`Klik tab home gagal, view=${viewHomeAgain}`);
    console.log('✓ Bottomnav terbukti interaktif dan dapat diklik.');

    console.log('\n=== TAHAP 5: Uji Transisi Masuk Chat & Browser Popstate / Back Button ===');
    // Masuk chat lagi dari Home
    await page.click('[data-testid="kawan-bicara-cta"], [data-testid="kawan-bicara-home-card"], .fz-kawan-card');
    await page.waitForTimeout(500);
    const inChatAgain = await page.evaluate(() => window.__fiezelAudit?.liveState()?.view || (typeof state !== 'undefined' ? state?.view : null));
    console.log('Masuk chat kedua kali:', inChatAgain);
    if (inChatAgain !== 'chat') throw new Error('Gagal masuk chat pada uji popstate');

    // Simulasikan browser back button / popstate
    console.log('Memanggil browser popstate (history.back / page.goBack)...');
    await page.evaluate(() => window.history.back());
    await page.waitForTimeout(600);

    const afterPopstateState = await page.evaluate(() => {
      const bn = document.querySelector('.bottomnav');
      const bnStyle = bn ? window.getComputedStyle(bn) : null;
      const currentView = window.__fiezelAudit?.liveState()?.view || (typeof state !== 'undefined' ? state?.view : null);
      return {
        view: currentView,
        bottomnavDisplay: bnStyle?.display,
        bottomnavInlineDisplay: bn?.style?.display || '',
        htmlClassChat: document.documentElement.classList.contains('fz-view-chat'),
        bodyClassChat: document.body.classList.contains('fz-view-chat')
      };
    });
    console.log('Status setelah browser popstate:', afterPopstateState);

    if (afterPopstateState.view !== 'home') {
      console.error(`[BUG DETECTED] Setelah popstate, view adalah '${afterPopstateState.view}' (diharapkan 'home')!`);
      throw new Error(`Browser back dari chat tidak kembali ke 'home', melainkan '${afterPopstateState.view}'`);
    }

    if (afterPopstateState.bottomnavDisplay === 'none' || afterPopstateState.bottomnavInlineDisplay === 'none') {
      console.error(`[BUG DETECTED] Bottomnav lenyap setelah popstate dari chat! display: ${afterPopstateState.bottomnavDisplay}`);
      throw new Error('Bottomnav lenyap setelah browser popstate dari chat!');
    }

    if (afterPopstateState.htmlClassChat || afterPopstateState.bodyClassChat) {
      console.error(`[BUG DETECTED] Kelas fz-view-chat masih menempel di DOM setelah popstate!`);
      throw new Error('Kelas fz-view-chat bocor di DOM setelah popstate');
    }

    // Klik tab Latihan lagi untuk memastikan bottomnav aktif
    await page.click('.bottomnav [data-view="latihan"]');
    await page.waitForTimeout(400);
    const finalView = await page.evaluate(() => window.__fiezelAudit?.liveState()?.view || (typeof state !== 'undefined' ? state?.view : null));
    if (finalView !== 'latihan') throw new Error('Bottomnav tidak dapat diklik setelah popstate!');

    console.log('\n>>> SEMUA TAHAP PENGUJIAN LIFECYCLE NAVIGASI KAWAN BICARA LULUS 100% <<<');
    process.exitCode = 0;
  } catch (err) {
    console.error('\n❌ PROBE GAGAL:', err.message);
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
    server.close();
    process.exit(process.exitCode ?? 0);
  }
});
