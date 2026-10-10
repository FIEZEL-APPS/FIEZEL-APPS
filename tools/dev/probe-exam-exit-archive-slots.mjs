import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

const mimeMap = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png'
};

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/') reqPath = '/index.html';
  const filePath = path.join(rootDir, reqPath);
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': mimeMap[ext] || 'text/plain' });
    res.end(fs.readFileSync(filePath));
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

await new Promise(r => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const localUrl = `http://127.0.0.1:${port}/index.html`;

console.log(`[PROBE-EXAM-EXIT-ARCHIVE] Server listening at ${localUrl}`);

const browser = await chromium.launch({
  headless: true,
  args: [
    '--use-fake-ui-for-media-stream',
    '--use-fake-device-for-media-stream'
  ]
});
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

const consoleLogs = [];
page.on('console', msg => consoleLogs.push(msg.text()));

try {
  await page.goto(localUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  const evaluation = await page.evaluate(async () => {
    const logs = [];
    const Hub = window.FiezelClassHub;
    const TS = window.FiezelTeacherStore;
    const Bank = window.FiezelReviewBank;

    logs.push(`Hub loaded: ${!!Hub}`);
    logs.push(`TS loaded: ${!!TS}`);

    // Mount Hub
    let container = document.getElementById('class-hub-root');
    if (!container) {
      container = document.createElement('div');
      container.id = 'class-hub-root';
      document.body.appendChild(container);
    }

    Hub.mountStudent(container, {
      toast: (msg) => logs.push(`TOAST: ${msg}`),
      go: () => {},
      afterRender: () => {}
    });

    // Setup assignment
    const ids = Bank.pick('past_tense', 3, 5).map(x => x.id);
    const assignPayload = {
      v: 1,
      t: 'assign',
      id: 'ujian-probe-1',
      title: 'Ujian Akhir Semester',
      skills: ['past_tense'],
      itemIds: ids,
      minutes: 10,
      from: 'Guru Budi',
      cls: 'FZ-PROBE99',
      mode: 'ujian',
      faceGuard: true,
      timer: 10
    };
    TS.acceptAssignmentPayload(assignPayload);

    // Open assignment
    Hub.openAssignment('ujian-probe-1');

    // Check 1: Preflight / Runner exit button is 'Keluar ujian'
    const exitBtn = container.querySelector('[data-testid="class-exit-exam"]');
    const simpanBtn = container.querySelector('[data-ch="close-runner"]');
    logs.push(`Exit exam button present: ${!!exitBtn}`);
    logs.push(`Simpan keluar button absent: ${!simpanBtn}`);

    // Check 2: Click 'Keluar ujian' triggers confirmation modal
    if (exitBtn) exitBtn.click();
    const modalBefore = container.querySelector('[data-testid="class-exit-exam-modal"]');
    logs.push(`Confirmation modal popped up: ${!!modalBefore}`);

    // Click cancel in modal
    const cancelBtn = container.querySelector('[data-testid="class-cancel-exit-exam"]');
    if (cancelBtn) cancelBtn.click();
    const modalAfterCancel = container.querySelector('[data-testid="class-exit-exam-modal"]');
    logs.push(`Modal dismissed after cancel: ${!modalAfterCancel}`);

    // Check 3: Proceed with preflight to exam runner
    const bypassBtn = container.querySelector('[data-testid="btn-bypass-face"]');
    if (bypassBtn) {
      bypassBtn.click();
    } else {
      const u = Hub._studentUi();
      if (u && u.runner) {
        u.runner.faceVerified = true;
        u.facePreflight = null;
      }
      Hub.renderStudent();
    }

    // Now in exam runner: Verify proctor banner has dedicated slots
    const u = Hub._studentUi();
    if (u && u.focus) {
      u.focus.n = 2;
      u.focus.ms = 12000;
      u.focus.faceN = 1;
      u.focus.faceMs = 15000;
      u.faceWarn = true;
      Hub.renderStudent();
    }

    const leaveSlot = container.querySelector('[data-testid="class-proctor-leave-slot"]');
    const absentSlot = container.querySelector('[data-testid="class-proctor-absent-slot"]');
    const faceWarnSlot = container.querySelector('[data-testid="class-proctor-face-warn"]');

    logs.push(`Leave slot present: ${!!leaveSlot} (${leaveSlot ? leaveSlot.textContent.trim() : ''})`);
    logs.push(`Absent slot present: ${!!absentSlot} (${absentSlot ? absentSlot.textContent.trim() : ''})`);
    logs.push(`Face warn slot present: ${!!faceWarnSlot} (${faceWarnSlot ? faceWarnSlot.textContent.trim() : ''})`);

    // Check 4: Confirm Exit Exam finishes permanently
    const exitBtnRunner = container.querySelector('[data-testid="class-exit-exam"]');
    if (exitBtnRunner) exitBtnRunner.click();
    const confirmBtn = container.querySelector('[data-testid="class-confirm-exit-exam"]');
    if (confirmBtn) confirmBtn.click();

    const isFinished = u && u.runner && u.runner.finished;
    const resultCard = container.querySelector('[data-testid="class-result"]');
    const resultArchiveBtn = container.querySelector('[data-testid="class-result-archive"]');

    logs.push(`Exam permanently finished: ${isFinished}`);
    logs.push(`Result screen shown: ${!!resultCard}`);
    logs.push(`Archive button on result screen: ${!!resultArchiveBtn}`);

    // Check 5: Archiving from result screen
    if (resultArchiveBtn) resultArchiveBtn.click();

    // Verify task is moved to archive and absent from Selesai
    const segSelesai = container.querySelector('[data-ch="seg"][data-seg="selesai"]');
    if (segSelesai) segSelesai.click();
    const doneItem = container.querySelector('[data-testid="class-done-ujian-probe-1"]');
    logs.push(`Item absent from Selesai tab after archive: ${!doneItem}`);

    // Open archive and verify
    const openArsipBtn = container.querySelector('[data-ch="buka-arsip"]');
    if (openArsipBtn) openArsipBtn.click();
    const archiveView = container.querySelector('[data-testid="class-archive"]');
    const unarchiveBtn = container.querySelector('[data-testid="class-unarchive-ujian-probe-1"]');
    logs.push(`Archive view opened: ${!!archiveView}`);
    logs.push(`Unarchive button present in archive: ${!!unarchiveBtn}`);

    // Click unarchive
    if (unarchiveBtn) unarchiveBtn.click();
    const closeArsipBtn = container.querySelector('[data-ch="tutup-arsip"]');
    if (closeArsipBtn) closeArsipBtn.click();

    const doneRestored = container.querySelector('[data-testid="class-done-ujian-probe-1"]');
    logs.push(`Item successfully restored to Selesai tab: ${!!doneRestored}`);

    return { ok: true, logs };
  });

  console.log('[PROBE RESULTS]:');
  evaluation.logs.forEach(l => console.log('  *', l));

  // Assertions
  const logs = evaluation.logs;
  const asserts = [
    logs.some(l => l.includes('Exit exam button present: true')),
    logs.some(l => l.includes('Simpan keluar button absent: true')),
    logs.some(l => l.includes('Confirmation modal popped up: true')),
    logs.some(l => l.includes('Modal dismissed after cancel: true')),
    logs.some(l => l.includes('Leave slot present: true')),
    logs.some(l => l.includes('Absent slot present: true')),
    logs.some(l => l.includes('Face warn slot present: true')),
    logs.some(l => l.includes('Exam permanently finished: true')),
    logs.some(l => l.includes('Archive button on result screen: true')),
    logs.some(l => l.includes('Item absent from Selesai tab after archive: true')),
    logs.some(l => l.includes('Archive view opened: true')),
    logs.some(l => l.includes('Unarchive button present in archive: true')),
    logs.some(l => l.includes('Item successfully restored to Selesai tab: true'))
  ];

  if (asserts.every(Boolean)) {
    console.log('\n[PROBE SUCCESS]: All 13 empirical assertions PASSED in real Chromium Playwright session!');
  } else {
    console.error('\n[PROBE FAILURE]: Some assertions did not pass!');
    process.exit(1);
  }
} catch (err) {
  console.error('[PROBE ERROR]:', err);
  process.exit(1);
} finally {
  await browser.close();
  server.close();
}
