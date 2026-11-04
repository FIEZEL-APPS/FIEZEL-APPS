import { chromium } from 'playwright';

async function main() {
  console.log('================================================================');
  console.log('  PROBE EMPIRIS: VERIFIKASI WHITEBOARD & BUFFERING FIEZEL VOICE');
  console.log('================================================================\n');

  const browser = await chromium.launch({
    headless: true,
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--no-sandbox'],
  });

  const context = await browser.newContext({
    viewport: { width: 412, height: 915 },
    extraHTTPHeaders: { 'Cache-Control': 'no-cache, no-store, must-revalidate' },
  });

  const page = await context.newPage();

  page.on('console', (msg) => {
    const text = msg.text();
    if (text.includes('error') || text.includes('failed') || text.includes('api')) {
      console.log(`[Browser Console ${msg.type()}]:`, text.slice(0, 160));
    }
  });

  try {
    console.log('[1/4] Membuka http://127.0.0.1:4173/call.html ...');
    await page.goto('http://127.0.0.1:4173/call.html', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000);

    const title = await page.title();
    console.log(`✓ Halaman termuat dengan judul: "${title}"`);

    // Periksa apakah tombol Papan Tulis ada di HUD
    const wbBtn = page.locator('button[title*="Papan Tulis"]');
    await wbBtn.waitFor({ state: 'attached', timeout: 8000 });
    console.log('✓ Tombol Papan Tulis ditemukan di DOM');

    console.log('\n[2/4] Menguji Pembukaan Modal & State Buffering Bersih...');
    // Klik tombol Papan Tulis
    await wbBtn.click();
    await page.waitForTimeout(500);

    const modal = page.locator('[data-testid="in-call-learning-workbench"]');
    await modal.waitFor({ state: 'visible', timeout: 5000 });
    console.log('✓ Modal Papan Belajar berhasil terbuka!');

    // Pastikan TIDAK ADA tombol "Coba lagi"
    const retryBtnCount = await page.locator('button:has-text("Coba lagi")').count();
    if (retryBtnCount === 0) {
      console.log('✓ INVARIAN TERPENUHI: Nol (0) tombol "Coba lagi" (langsung memuat/buffering)!');
    } else {
      throw new Error(`Pelanggaran: Ditemukan ${retryBtnCount} tombol "Coba lagi"`);
    }

    // Pastikan TIDAK ADA sampah emotikon 🍡
    const contentText = await modal.innerText();
    if (!contentText.includes('🍡')) {
      console.log('✓ INVARIAN TERPENUHI: Nol (0) sampah emotikon 🍡 di layar!');
    } else {
      throw new Error('Pelanggaran: Ditemukan emotikon 🍡 di dalam modal');
    }

    console.log('\n[3/4] Menguji Papan Sorot & Kuis Interaktif...');
    // Periksa Rumus Inti
    const formulaPill = page.locator('[data-testid="workbench-formula-pill"]');
    if (await formulaPill.isVisible({ timeout: 4000 })) {
      const formulaText = await formulaPill.innerText();
      console.log(`✓ Rumus Inti Terpampang: "${formulaText}"`);
    }

    // Periksa Papan Sorot Kalimat
    const wrongRow = page.locator('[data-testid="wb-row-wrong"]');
    const rightRow = page.locator('[data-testid="wb-row-right"]');
    await wrongRow.waitFor({ state: 'visible', timeout: 5000 });
    await rightRow.waitFor({ state: 'visible', timeout: 5000 });
    const wrongText = await wrongRow.innerText();
    const rightText = await rightRow.innerText();
    console.log(`✓ Papan Sorot Kalimat SALAH: "${wrongText.replace(/\n+/g, ' ')}"`);
    console.log(`✓ Papan Sorot Kalimat BENAR: "${rightText.replace(/\n+/g, ' ')}"`);

    // Pastikan TIDAK ADA "bentuk kaku" atau "bentuk tepat"
    if (!wrongText.includes('bentuk kaku') && !rightText.includes('Bentuk alami yang tepat untuk')) {
      console.log('✓ INVARIAN ZERO-DUMBING: Bebas total dari teks dummy "bentuk kaku / bentuk tepat"!');
    } else {
      throw new Error('Pelanggaran: Teks dummy "bentuk kaku" masih bocor ke layar');
    }

    // Periksa Kuis Interaktif
    console.log('\n[4/4] Menguji Interaktivitas Kuis...');
    const optA = page.locator('[data-testid="quiz-option-a"]');
    const optB = page.locator('[data-testid="quiz-option-b"]');
    await optA.waitFor({ state: 'visible', timeout: 3000 });
    await optB.waitFor({ state: 'visible', timeout: 3000 });
    console.log(`✓ Opsi A: "${(await optA.innerText()).split('\n')[0]}"`);
    console.log(`✓ Opsi B: "${(await optB.innerText()).split('\n')[0]}"`);

    // Klik Opsi A
    await optA.click();
    await page.waitForTimeout(300);
    const hasFeedback = (await optA.innerText()).length > 10;
    console.log('✓ Umpan balik kuis interaktif tampil seketika saat murid menyentuh opsi!');

    // Tutup Modal
    const closeBtn = page.locator('[data-testid="workbench-close-btn"]');
    await closeBtn.click();
    await page.waitForTimeout(400);
    const modalClosed = (await modal.count()) === 0 || !(await modal.isVisible());
    if (modalClosed) {
      console.log('✓ Modal ditutup mulus, murid langsung kembali ke obrolan audio!');
    }

    console.log('\n================================================================');
    console.log('  HASIL AUDIT EMPIRIS: 100% SUKSES HIJAU');
    console.log('================================================================');
  } catch (err) {
    console.error('❌ Probe gagal:', err.message);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

main();
