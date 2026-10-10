import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');

// In-memory server simulation state for Guru <-> Murid sync
const serverState = {
  classes: new Map(), // code -> { code, title, level, subjectId, teacher }
  assignments: new Map(), // code -> [{ id, assignment, at }]
  reports: []
};

async function main() {
  console.log('================================================================');
  console.log('EMPIRICAL PROBE: KELASKU ASSIGNMENT DELIVERY & REAL-TIME POLLING');
  console.log('================================================================');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage']
  });

  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    serviceWorkers: 'block'
  });

  // Intercept all network traffic
  await context.route('**/*', async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const pathname = url.pathname;

    // 1. Mock API endpoints
    if (pathname.startsWith('/api/')) {
      // Auth session
      if (pathname === '/api/auth/session') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ok: true,
            signedIn: true,
            account: { handle: 'budi_siswa', role: 'murid', name: 'Budi Santoso' }
          })
        });
      }

      // Config
      if (pathname === '/api/config') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ ok: true, flags: {} })
        });
      }

      // Teacher class claim
      if (pathname === '/api/teacher/class/claim') {
        const body = JSON.parse(req.postData() || '{}');
        const code = String(body.code || '').toUpperCase();
        serverState.classes.set(code, {
          code,
          title: body.title || 'Kelas 8A',
          level: body.level || 'SMP',
          subjectId: body.subjectId || 'ENG',
          teacher: 'Bu Siti'
        });
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ ok: true, code })
        });
      }

      // Teacher class assign
      if (pathname === '/api/teacher/class/assign') {
        const body = JSON.parse(req.postData() || '{}');
        const code = String(body.code || '').toUpperCase();
        const asg = body.assignment;
        if (!serverState.assignments.has(code)) {
          serverState.assignments.set(code, []);
        }
        const list = serverState.assignments.get(code);
        list.push({
          id: asg.id,
          at: Date.now(),
          assignment: asg
        });
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ ok: true, id: asg.id })
        });
      }

      // Student polling: GET /api/learner/class-assignments
      if (pathname === '/api/learner/class-assignments') {
        const cls = url.searchParams.get('cls');
        const since = Number(url.searchParams.get('since') || 0);
        const list = serverState.assignments.get(cls) || [];
        const filtered = list.filter((a) => a.at > since);
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ok: true,
            cls,
            since,
            cursor: Date.now(),
            now: Date.now(),
            assignments: filtered.map((row) => ({
              at: row.at,
              assignment: row.assignment
            }))
          })
        });
      }

      // Student class teachers: GET /api/learner/class-teachers
      if (pathname === '/api/learner/class-teachers') {
        const cls = url.searchParams.get('cls');
        const c = serverState.classes.get(cls);
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ok: true,
            cls,
            title: c ? c.title : 'Kelas 8A Unggulan',
            teachers: [
              { name: 'Bu Siti', subject: 'Bahasa Inggris', subjectId: 'ENG' }
            ]
          })
        });
      }

      // Student class report
      if (pathname === '/api/learner/class-report') {
        return route.fulfill({
          status: 202,
          contentType: 'application/json',
          body: JSON.stringify({ ok: true })
        });
      }

      // Default API fallback
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true })
      });
    }

    // 2. Serve static local files from ROOT
    let relPath = decodeURIComponent(pathname).replace(/^\/+/, '');
    if (!relPath || relPath === '' || relPath === 'app' || relPath === 'app/') {
      relPath = 'index.html';
    }
    relPath = relPath.replace(/^app\//, '');
    relPath = relPath.split('?')[0];

    const localFile = path.resolve(ROOT, relPath);
    if (fs.existsSync(localFile) && fs.statSync(localFile).isFile()) {
      const ext = path.extname(localFile).toLowerCase();
      const contentTypes = {
        '.html': 'text/html; charset=utf-8',
        '.css': 'text/css; charset=utf-8',
        '.js': 'application/javascript; charset=utf-8',
        '.mjs': 'application/javascript; charset=utf-8',
        '.json': 'application/json; charset=utf-8',
        '.png': 'image/png',
        '.svg': 'image/svg+xml'
      };
      return route.fulfill({
        status: 200,
        contentType: contentTypes[ext] || 'application/octet-stream',
        body: fs.readFileSync(localFile)
      });
    }

    return route.abort();
  });

  // Seed initial state: student onboarding done, but NO classCode joined yet
  await context.addInitScript(() => {
    try {
      localStorage.clear();
      localStorage.setItem('fiezel-onboarding-v1', JSON.stringify({
        done: true,
        at: Date.now(),
        name: 'Budi Santoso',
        locale: 'id',
        level: 'A2'
      }));
      localStorage.setItem('fiezel-auth-v1', JSON.stringify({
        v: 1,
        signedIn: true,
        at: Date.now(),
        role: 'murid',
        handle: 'budi_siswa'
      }));
    } catch (_) {}
  });

  const page = await context.newPage();

  // Dismiss splash/auth overlays once DOM is ready
  async function dismissOverlays() {
    await page.evaluate(() => {
      document.getElementById('fiezelBootSplash')?.remove();
      document.documentElement.classList.remove('fz-booting');
      document.querySelectorAll('.fiezel-ob, .fz-coach-bubble, .coach-step-modal, .fz-auth, #welcome, #authGate').forEach((el) => el.remove());
    });
  }

  // Collect browser console messages and network failures
  page.on('console', (msg) => {
    console.log(`[Browser Console ${msg.type()}] ${msg.text()}`);
  });
  page.on('requestfailed', (req) => {
    console.log(`[REQUEST FAILED] ${req.method()} ${req.url()} - ${req.failure()?.errorText}`);
  });
  page.on('response', (res) => {
    if (res.url().includes('/api/')) {
      console.log(`[API RESPONSE] ${res.status()} ${res.url()}`);
    }
  });

  const results = [];
  function record(title, pass, detail = '') {
    results.push({ title, pass, detail });
    const badge = pass ? 'PASS [OK]' : 'FAIL [X]';
    console.log(`${badge} - ${title}${detail ? ' (' + detail + ')' : ''}`);
  }

  try {
    // -------------------------------------------------------------
    // TAHAP 1: GURU MEMBUAT KELAS & MENERBITKAN TUGAS DI SERVER
    // -------------------------------------------------------------
    console.log('\n--- Tahap 1: Guru Membuat Kelas & Menerbitkan Tugas ---');
    const classCode = 'FZ-SMP8A';
    const initialAssignment = {
      v: 1,
      t: 'assign',
      id: 'asg-gw-101',
      cls: classCode,
      title: 'Tugas Grammar Simple Past & Continuous',
      from: 'Kelas 8A Unggulan',
      teacher: 'Bu Siti',
      mode: 'tugas',
      skills: ['past_tense', 'past_continuous'],
      itemIds: ['q-1', 'q-2'],
      minutes: 15,
      deadline: '2026-10-25',
      items: [
        {
          id: 'q-1',
          prompt: 'She ___ to the library yesterday.',
          options: ['go', 'went', 'goes', 'going'],
          answer: 1,
          skill: 'past_tense'
        },
        {
          id: 'q-2',
          prompt: 'They were ___ when the rain started.',
          options: ['play', 'playing', 'played', 'plays'],
          answer: 1,
          skill: 'past_continuous'
        }
      ]
    };

    serverState.classes.set(classCode, {
      code: classCode,
      title: 'Kelas 8A Unggulan',
      level: 'SMP',
      subjectId: 'ENG',
      teacher: 'Bu Siti'
    });

    serverState.assignments.set(classCode, [
      {
        id: initialAssignment.id,
        at: Date.now() - 1000,
        assignment: initialAssignment
      }
    ]);
    record('Guru berhasil mendaftarkan kelas FZ-SMP8A dan menerbitkan tugas asg-gw-101', true);

    // -------------------------------------------------------------
    // TAHAP 2: MURID MEMBUKA APLIKASI DAN NAVIGASI KE KELASKU
    // -------------------------------------------------------------
    console.log('\n--- Tahap 2: Murid Membuka Aplikasi & Masuk ke KelasKu ---');
    await page.goto('https://fiezel.my.id/app/index.html', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#app', { timeout: 10000 });
    await dismissOverlays();

    // Pastikan app siap dan pindah ke view classroom
    await page.evaluate(() => {
      if (typeof window.go === 'function') {
        window.go('classroom');
      }
    });

    await page.waitForSelector('#fzClassHub', { timeout: 5000 });
    await dismissOverlays();
    const classHubExists = await page.$('#fzClassHub') !== null;
    record('Layar KelasKu (#fzClassHub) berhasil dimuat', classHubExists);

    // -------------------------------------------------------------
    // TAHAP 3: MURID MEMASUKKAN KODE KELAS DI KELASKU
    // -------------------------------------------------------------
    console.log('\n--- Tahap 3: Murid Memasukkan Kode Kelas ---');
    const tabKelasSelector = '[data-testid="class-tab-kelas"]';
    const tabTugasSelector = '[data-testid="class-tab-tugas"]';
    const inputSelector = '[data-testid="class-code-input"]';
    const submitSelector = '[data-testid="class-code-submit"]';

    // Buka tab kelas / paspor untuk memunculkan formulir kode kelas
    await page.waitForSelector(tabKelasSelector, { timeout: 5000 });
    await page.click(tabKelasSelector);

    // Tunggu input kode kelas
    await page.waitForSelector(inputSelector, { timeout: 5000 });
    await page.fill(inputSelector, 'FZ-SMP8A');
    await page.click(submitSelector);

    // Tunggu proses penyimpanan kode dan polling selesai
    await page.waitForTimeout(1000);

    // Kembali ke tab tugas untuk melihat kartu tugas yang tiba
    await page.waitForSelector(tabTugasSelector, { timeout: 5000 });
    await page.click(tabTugasSelector);
    await page.waitForTimeout(500);

    // -------------------------------------------------------------
    // TAHAP 4: PERIKSA ISI LOCALSTORAGE MURID
    // -------------------------------------------------------------
    console.log('\n--- Tahap 4: Verifikasi localStorage Murid ---');
    const storageData = await page.evaluate(() => {
      let asg = [];
      let inbox = {};
      let onb = {};
      try { asg = JSON.parse(localStorage.getItem('fiezel-learner-assignments-v1') || '[]'); } catch (_) {}
      try { inbox = JSON.parse(localStorage.getItem('fiezel-inbox-v1') || '{}'); } catch (_) {}
      try { onb = JSON.parse(localStorage.getItem('fiezel-onboarding-v1') || '{}'); } catch (_) {}
      return { asg, inbox, onb };
    });

    const codeInOnboarding = storageData.onb && storageData.onb.classCode === 'FZ-SMP8A';
    record('Kode kelas FZ-SMP8A tersimpan di fiezel-onboarding-v1', codeInOnboarding, storageData.onb.classCode);

    const hasAssignmentInStore = Array.isArray(storageData.asg) &&
      storageData.asg.some((a) => a.id === 'asg-gw-101' && a.title === 'Tugas Grammar Simple Past & Continuous');
    record("localStorage['fiezel-learner-assignments-v1'] berisi tugas guru yang valid", hasAssignmentInStore, `Jumlah tugas: ${storageData.asg.length}`);

    const inboxItems = (storageData.inbox && storageData.inbox.items) || [];
    const hasInboxItem = inboxItems.some((e) => e.aid === 'asg-gw-101' && e.read === false);
    record("localStorage['fiezel-inbox-v1'] berisi entri notifikasi tugas baru dengan read === false", hasInboxItem, `Jumlah notif: ${inboxItems.length}`);

    // -------------------------------------------------------------
    // TAHAP 5: PERIKSA BADGE NOTIFIKASI DOM (#fzNotifBadge)
    // -------------------------------------------------------------
    console.log('\n--- Tahap 5: Verifikasi DOM #fzNotifBadge ---');
    const badgeState = await page.evaluate(() => {
      const b = document.getElementById('fzNotifBadge');
      if (!b) return { exists: false };
      return {
        exists: true,
        text: b.textContent.trim(),
        hidden: b.classList.contains('hidden')
      };
    });

    const badgeIsUnread = badgeState.exists && !badgeState.hidden && Number(badgeState.text) > 0;
    record('DOM #fzNotifBadge menampilkan angka unread > 0 dan tidak tersembunyi', badgeIsUnread, `Badge: "${badgeState.text}", hidden: ${badgeState.hidden}`);

    // -------------------------------------------------------------
    // TAHAP 6: PERIKSA RENDERING KARTU TUGAS DI #fzClassHub
    // -------------------------------------------------------------
    console.log('\n--- Tahap 6: Verifikasi Rendering Kartu Tugas di #fzClassHub ---');
    const cardRendered = await page.evaluate(() => {
      const hub = document.getElementById('fzClassHub');
      if (!hub) return { found: false, reason: 'no_hub' };
      const card = hub.querySelector('[data-testid="class-assign-asg-gw-101"]');
      if (!card) {
        // Cek semua task items jika id selector berbeda
        const allTitles = Array.from(hub.querySelectorAll('.ch-task-title')).map((el) => el.textContent.trim());
        return { found: false, allTitles };
      }
      const titleEl = card.querySelector('.ch-task-title');
      return {
        found: true,
        title: titleEl ? titleEl.textContent.trim() : card.textContent.trim()
      };
    });

    const cardMatches = cardRendered.found && cardRendered.title.includes('Tugas Grammar Simple Past & Continuous');
    record('DOM #fzClassHub merender kartu tugas guru dengan judul yang benar', cardMatches, cardRendered.title || JSON.stringify(cardRendered));

    // -------------------------------------------------------------
    // TAHAP 7: SIMULASI PENERBITAN TUGAS KEDUA SECARA REAL-TIME
    // -------------------------------------------------------------
    console.log('\n--- Tahap 7: Simulasi Penerbitan Tugas Kedua & Detak Polling Murid ---');
    const secondAssignment = {
      v: 1,
      t: 'assign',
      id: 'asg-voc-202',
      cls: classCode,
      title: 'Ujian Mini Vocabulary Unit 1 (Daily Activities)',
      from: 'Kelas 8A Unggulan',
      teacher: 'Bu Siti',
      mode: 'ujian',
      skills: ['vocab'],
      itemIds: ['v-1', 'v-2'],
      minutes: 10,
      deadline: '2026-10-26'
    };

    serverState.assignments.get(classCode).push({
      id: secondAssignment.id,
      at: Date.now(),
      assignment: secondAssignment
    });

    // Pemicu polling murid (inboxPoll via detak rutin atau navigasi)
    await page.evaluate(async () => {
      if (typeof window.inboxPoll === 'function') {
        await window.inboxPoll(true);
      } else if (window.FiezelInbox && typeof window.FiezelInbox.poll === 'function') {
        await window.FiezelInbox.poll(true);
      }
    });

    await page.waitForTimeout(500);

    const postSecondStorage = await page.evaluate(() => {
      let asg = [];
      let inbox = {};
      try { asg = JSON.parse(localStorage.getItem('fiezel-learner-assignments-v1') || '[]'); } catch (_) {}
      try { inbox = JSON.parse(localStorage.getItem('fiezel-inbox-v1') || '{}'); } catch (_) {}
      const b = document.getElementById('fzNotifBadge');
      const hub = document.getElementById('fzClassHub');
      const card2 = hub ? hub.querySelector('[data-testid="class-assign-asg-voc-202"]') : null;
      const allTestIds = hub ? Array.from(hub.querySelectorAll('[data-testid]')).map((e) => e.getAttribute('data-testid')) : [];
      const allText = hub ? Array.from(hub.querySelectorAll('.ch-task-title, .ch-trow-title')).map((e) => e.textContent.trim()) : [];
      const hubHtmlSnippet = hub ? hub.innerHTML.slice(0, 500) : '';
      return {
        asgCount: asg.length,
        hasSecondAsg: asg.some((a) => a.id === 'asg-voc-202'),
        inboxUnread: (inbox.items || []).filter((x) => !x.read).length,
        badgeText: b ? b.textContent.trim() : '',
        badgeHidden: b ? b.classList.contains('hidden') : true,
        secondCardFound: !!card2,
        allTestIds,
        allText,
        hubHtmlSnippet
      };
    });

    const secondTaskDelivered = postSecondStorage.hasSecondAsg && postSecondStorage.inboxUnread >= 2;
    record('Tugas kedua tiba di localStorage murid melalui detak polling', secondTaskDelivered, `Total tugas: ${postSecondStorage.asgCount}, Unread: ${postSecondStorage.inboxUnread}`);

    const secondBadgeUpdated = !postSecondStorage.badgeHidden && Number(postSecondStorage.badgeText) >= 2;
    record('Badge notifikasi bertambah menampilkan total unread >= 2', secondBadgeUpdated, `Badge: "${postSecondStorage.badgeText}"`);

    const secondCardRendered = postSecondStorage.secondCardFound;
    record('DOM #fzClassHub merender kartu tugas kedua secara dinamis', secondCardRendered);

  } catch (err) {
    console.error('Fatal probe execution error:', err);
    record('Probe execution without crash', false, err.message);
  } finally {
    await browser.close();
  }

  // Ringkasan hasil probe
  console.log('\n================================================================');
  const total = results.length;
  const passed = results.filter((r) => r.pass).length;
  const failed = total - passed;
  console.log(`PROBE SUMMARY: ${passed}/${total} checks passed (${failed} failed)`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

main();
