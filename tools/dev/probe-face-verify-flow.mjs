import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '../..');

async function runProbe() {
  console.log('[PROBE] Meluncurkan Chromium Playwright dengan izin kamera virtual...');
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream'
    ]
  });

  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    permissions: ['camera']
  });

  const page = await context.newPage();

  const consoleLogs = [];
  page.on('console', msg => consoleLogs.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => console.error('[PAGE-ERR]', err));

  // Buka file index.html lokal
  const indexPath = 'file:///' + path.join(ROOT, 'index.html').replace(/\\/g, '/');
  console.log('[PROBE] Memuat:', indexPath);
  await page.goto(indexPath, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  // Jalankan skenario di dalam context peramban
  const result = await page.evaluate(async () => {
    const Hub = window.FiezelClassHub;
    const TS = window.FiezelTeacherStore;
    const Bank = window.FiezelReviewBank;
    const FaceG = window.FiezelFaceGuard;

    if (!Hub || !TS || !Bank || !FaceG) {
      return { ok: false, error: 'Modul tidak lengkap: Hub=' + !!Hub + ' TS=' + !!TS + ' Bank=' + !!Bank + ' FaceG=' + !!FaceG };
    }

    // 1. Buat tugas ujian mini dengan faceGuard = true
    const qIds = Bank.pick('past_tense', 3, 5).map(q => q.id);
    const assignId = 'probe-exam-' + Date.now();
    TS.acceptAssignmentPayload({
      v: 1,
      t: 'assign',
      id: assignId,
      title: 'Ulangan Harian Grammar',
      skills: ['past_tense'],
      itemIds: qIds,
      minutes: 10,
      from: 'Guru Rian Pratama',
      cls: 'FZ-PRB123',
      mode: 'ujian',
      faceGuard: true,
      timer: 10
    });

    // 2. Pasang elemen penampung murid
    let container = document.getElementById('test-probe-hub');
    if (!container) {
      container = document.createElement('div');
      container.id = 'test-probe-hub';
      document.body.appendChild(container);
    }

    Hub.mountStudent(container, {
      toast: (msg) => console.log('[STUDENT-TOAST]', msg),
      go: () => {},
      afterRender: () => {}
    });

    // 3. Buka tugas ujian
    Hub.openAssignment(assignId);

    const step1PreflightVisible = Boolean(container.querySelector('[data-testid="class-face-preflight"]'));
    const step1BtnVerifyVisible = Boolean(container.querySelector('[data-testid="btn-verify-face"]'));
    const step1QuestionLeaked = Boolean(container.querySelector('.ch-question'));

    // 4. Klik tombol verifikasi wajah
    const btnVerify = container.querySelector('[data-testid="btn-verify-face"]');
    if (!btnVerify) {
      return { ok: false, error: 'Tombol btn-verify-face tidak ditemukan di DOM' };
    }
    btnVerify.click();

    // Tunggu proses kamera getUserMedia & deteksi frame
    await new Promise(r => setTimeout(r, 600));

    const u = Hub._studentUi();
    const preflightStatus = u.facePreflight ? u.facePreflight.status : null;
    const step2BtnProceedVisible = Boolean(container.querySelector('[data-testid="btn-proceed-exam"]'));

    // 5. Klik tombol Mulai Kerjakan Ujian
    const btnProceed = container.querySelector('[data-testid="btn-proceed-exam"]');
    if (btnProceed) {
      btnProceed.click();
    }

    await new Promise(r => setTimeout(r, 300));

    const step3QuestionVisible = Boolean(container.querySelector('.ch-question'));
    const step3CameraPillVisible = Boolean(container.querySelector('[data-testid="class-camera-pill"]'));
    const step3TimerRunning = u.runner && u.runner.timerEnd > 0;
    const step3FaceActive = FaceG.isActive();

    return {
      ok: true,
      faceGuardSupported: FaceG.isSupported(),
      step1PreflightVisible,
      step1BtnVerifyVisible,
      step1QuestionLeaked,
      preflightStatus,
      step2BtnProceedVisible,
      step3QuestionVisible,
      step3CameraPillVisible,
      step3TimerRunning,
      step3FaceActive
    };
  });

  console.log('[PROBE] Hasil inspeksi empirical headless Playwright:', JSON.stringify(result, null, 2));

  await browser.close();

  if (!result.ok || !result.step1PreflightVisible || !result.step3QuestionVisible || !result.step3CameraPillVisible) {
    console.error('[PROBE] GAGAL: verifikasi tahapan tidak memenuhi invariant!');
    process.exit(1);
  }

  console.log('[PROBE] SUKSES: Seluruh tahapan verifikasi wajah pra-ujian berjalan mulus di Chromium Playwright.');
}

runProbe().catch(err => {
  console.error('[PROBE-FATAL]', err);
  process.exit(1);
});
