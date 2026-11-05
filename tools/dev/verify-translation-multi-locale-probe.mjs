import { chromium } from 'playwright';

(async () => {
  console.log('--- PROBE EMPIRIS: MULTI-LOCALE LIVE TRANSLATION (ID, TH, JA) ---');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Test across ID, TH, JA
  const testLocales = [
    { locale: 'id', expectedSnippet: 'latihan' },
    { locale: 'th', expectedSnippet: 'ฝึก' },
    { locale: 'ja', expectedSnippet: '学' },
  ];

  for (const item of testLocales) {
    console.log(`\n[Uji Locale: ${item.locale.toUpperCase()}]`);
    const res = await page.evaluate(async (loc) => {
      try {
        const response = await fetch('http://localhost:4173/api/voice/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: 'I am so excited to practice English with you today!',
            targetLocale: loc,
            sourceLocale: 'en'
          })
        });
        const data = await response.json();
        return { status: response.status, data };
      } catch (err) {
        return { status: 0, error: err.message };
      }
    }, item.locale);

    console.log(`✓ Status: ${res.status}`);
    console.log(`✓ Hasil Terjemahan: "${res.data?.translatedText}" (Model: ${res.data?.model})`);
    if (res.status !== 200 || !res.data?.ok || !res.data?.translatedText) {
      console.error(`❌ GAGAL pada locale ${item.locale}`);
      process.exit(1);
    }
  }

  await browser.close();
  console.log('\n================================================================');
  console.log('  HASIL AUDIT TRANSLASI MULTI-LOCALE: 100% SUKSES HIJAU');
  console.log('================================================================');
})();
