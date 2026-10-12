/**
 * FIEZEL — gerbang "menu utama dulu, baru layar masuk" saat boot (m025-576).
 *
 * OWNER: "SAAT PERTAMA KALI USER MENGINSTAL PWA DI DEVICE MASING MASING, SETELAH SPLASH BUKAN
 * LANGSUNG MUNCUL ONBOARDING, MALAH DI ALIHKAN KE MENU UTAMA SEKITAR 5-7 DETIK".
 * Rinciannya (Android): "SEMACAM MENU UTAMA TAPI SELURUH LAYARNYA WARNA CREAM DAN BOTTOM BARNYA
 * MUNCUL ... SETELAH ITU BERKEDIP DAN MUNCUL AUTH LOGIN".
 *
 * Direproduksi di Chromium (profil Android, CPU 4x, API tiruan berjeda):
 *   - Penanda lokal "sudah masuk" (sisa kunjungan di browser, akun/Google yang diingat)
 *     meloloskan authGateNeeded(). Aplikasi dibuka, lalu verifyAuthSession() baru bertanya ke
 *     server 1,5 detik kemudian. Server menjawab "belum masuk" beberapa detik sesudahnya, dan
 *     barulah layar masuk muncul.
 *   - Di celah itu topbar dan tab bawah (markup statis index.html) sudah tampil di atas latar
 *     krem walau belum ada layar yang digambar.
 *
 * Gerbang ini menjaga:
 *   A. bootFiezel() memancing jawaban server (primeBootAuthVerdict) SEBELUM load(), sejajar
 *      dengan unduhan konten dan splash.
 *   B. proceed() di startWelcomeExperience() memakai jawabannya SESUDAH authGateNeeded() dan
 *      SEBELUM showOnboarding(): "belum masuk" -> layar masuk; masih di jalan -> tunggu paling
 *      lama BOOT_AUTH_WAIT_MS; showAuthGate() menandai jawaban boot sudah terpakai.
 *   C. Perilaku primeBootAuthVerdict/bootAuthVerdict/followUpAuthCheck di atas env tiruan:
 *      - hanya jawaban TEGAS signedIn:false yang mencabut;
 *      - tanpa penanda lokal, offline, atau demo guru: tidak ada permintaan;
 *      - jawaban terlambat dipakai begitu tiba, tanpa pertanyaan kedua.
 *   D. Selubung cangkang: render() memasang html.fz-app-open, dan CSS menyembunyikan topbar +
 *      tab bawah sebelum itu.
 *   E. Bukti negatif: tiap pemeriksaan MERAH pada stub yang melanggar.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const APP = read('app.js');
const CLAY = read('features/ui/fiezel-tactile-clay.css');

let passCount = 0;
const failures = [];
async function check(name, fn) {
  try { await fn(); passCount++; console.log('  ok   ' + name); }
  catch (err) { failures.push({ name, error: err.message }); console.error('  FAIL ' + name + ': ' + err.message); }
}

function fnBody(src, header) {
  // Fungsi tingkat atas app.js berakhir sebelum deklarasi tingkat atas berikutnya.
  const i = src.indexOf(header);
  assert.ok(i >= 0, 'tidak ditemukan: ' + header);
  const rest = src.slice(i + header.length);
  const m = rest.search(/\n(?:async function |function |const |let |\/\*|\/\/)/);
  return src.slice(i, m < 0 ? src.length : i + header.length + m);
}

function assertPrimedEarly(app) {
  const boot = fnBody(app, 'function bootFiezel(){');
  const prime = boot.indexOf('primeBootAuthVerdict()');
  const load = boot.indexOf('load()');
  assert.ok(prime > 0 && load > prime, 'bootFiezel() harus memanggil primeBootAuthVerdict() sebelum load()');
}

function assertProceedUsesVerdict(app) {
  const w = fnBody(app, 'function startWelcomeExperience(){');
  const gate = w.indexOf('if(authGateNeeded()){showAuthGate(at,proceed);return null}');
  const verdict = w.indexOf('bootAuthVerdict()');
  const out = w.indexOf("if(bootAuth==='signed-out'){forgetLocalAuth();showAuthGate(at,proceed);return null}");
  const ob = w.indexOf('showOnboarding(at)');
  assert.ok(gate > 0 && verdict > gate && out > verdict && ob > out,
    'proceed(): authGateNeeded -> bootAuthVerdict -> "belum masuk" ke layar masuk -> baru perkenalan');
  assert.ok(/bootAuth==='pending'&&!bootAuthWaited[\s\S]*?Promise\.race\(\[bootAuthVerdictPromise,new Promise\(r=>setTimeout\(r,BOOT_AUTH_WAIT_MS\)\)\]\)\.then\(proceed,proceed\)/.test(w),
    'jawaban yang belum tiba ditunggu paling lama BOOT_AUTH_WAIT_MS, sekali saja');
  const wait = (app.match(/const BOOT_AUTH_WAIT_MS=(\d+);/) || [])[1];
  assert.ok(wait && +wait > 0 && +wait <= 2500, 'BOOT_AUTH_WAIT_MS harus 1..2500 ms (ditemukan ' + wait + ')');
  const g = fnBody(app, 'function showAuthGate(at,next){');
  assert.ok(/bootAuthVerdictUsed=true;/.test(g), 'showAuthGate() harus menandai jawaban boot sudah terpakai');
}

function harness(app, env) {
  const start = app.indexOf('const BOOT_AUTH_WAIT_MS=');
  const end = app.indexOf('/** Penanda lokal hanya tampilan; server yang tahu.', start);
  assert.ok(start > 0 && end > start, 'blok jawaban boot tidak ditemukan');
  const ctx = Object.assign({
    setTimeout: (fn) => { env.timers.push(fn); return 0; },
    Promise,
    navigator: { onLine: env.online !== false },
    teacherPreviewActive: () => !!env.preview,
    deactivateAccountState: () => { env.log.push('deactivate'); },
    showAuthGate: () => { env.log.push('gate'); },
    verifyAuthSession: () => { env.log.push('verify'); },
    render: () => {},
  }, {});
  ctx.self = {
    FiezelAuthScreen: {
      readSession: () => env.marker ? { v: 1 } : null,
      clearSession: () => { env.marker = false; env.log.push('clear'); },
      checkServer: () => { env.log.push('fetch'); return env.answer; },
    },
    FiezelAccount: { signedIn: () => !!env.account },
    FiezelGoogle: { rememberedEmail: () => env.google ? 'x@y' : '', forget: () => env.log.push('forget-google') },
  };
  vm.runInNewContext(app.slice(start, end) + '\n;this.__api={primeBootAuthVerdict,bootAuthVerdict,followUpAuthCheck,forgetLocalAuth,used:()=>bootAuthVerdictUsed,setUsed:(v)=>{bootAuthVerdictUsed=v}};', ctx);
  return ctx.__api;
}

const tick = () => new Promise((r) => setImmediate(r));

async function assertBehaviour(app) {
  // 1. penanda lokal + server "belum masuk" -> pending lalu signed-out
  {
    const env = { marker: true, log: [], timers: [], answer: Promise.resolve({ ok: true, signedIn: false }) };
    const api = harness(app, env);
    api.primeBootAuthVerdict();
    assert.strictEqual(api.bootAuthVerdict(), 'pending', 'sebelum jawaban tiba: pending');
    await tick(); await tick();
    assert.strictEqual(api.bootAuthVerdict(), 'signed-out', 'server tegas "belum masuk" -> signed-out');
    assert.deepStrictEqual(env.log.filter((x) => x === 'fetch').length, 1, 'satu permintaan saja');
  }
  // 2. server "sudah masuk" -> none, dan tidak ada pertanyaan ulang sesudahnya
  {
    const env = { marker: true, log: [], timers: [], answer: Promise.resolve({ ok: true, signedIn: true }) };
    const api = harness(app, env);
    api.primeBootAuthVerdict(); await tick(); await tick();
    assert.strictEqual(api.bootAuthVerdict(), 'none', 'server "sudah masuk" -> lanjut');
    api.followUpAuthCheck('none');
    assert.strictEqual(env.timers.length, 0, 'jawaban "sudah masuk" tidak ditanyakan ulang');
  }
  // 3. galat/server lama (null) -> none, tetap dicek ulang nanti
  {
    const env = { marker: true, log: [], timers: [], answer: Promise.resolve(null) };
    const api = harness(app, env);
    api.primeBootAuthVerdict(); await tick(); await tick();
    assert.strictEqual(api.bootAuthVerdict(), 'none', 'jawaban tidak pasti tidak mencabut penanda');
    api.followUpAuthCheck('none');
    assert.strictEqual(env.timers.length, 1, 'jawaban tidak pasti dicek ulang lewat verifyAuthSession');
  }
  // 4. tanpa penanda / offline / demo guru -> tidak ada permintaan
  for (const [label, env] of [
    ['tanpa penanda', { log: [], timers: [], answer: Promise.resolve({ ok: true, signedIn: false }) }],
    ['offline', { marker: true, online: false, log: [], timers: [], answer: Promise.resolve({ ok: true, signedIn: false }) }],
    ['demo guru', { marker: true, preview: true, log: [], timers: [], answer: Promise.resolve({ ok: true, signedIn: false }) }],
  ]) {
    const api = harness(app, env);
    assert.strictEqual(api.primeBootAuthVerdict(), null, label + ': tidak memancing');
    assert.strictEqual(api.bootAuthVerdict(), 'none', label + ': lanjut');
    assert.ok(!env.log.includes('fetch'), label + ': tidak ada permintaan ke server');
  }
  // 5. akun / Google yang diingat juga dihitung sebagai penanda lokal
  for (const key of ['account', 'google']) {
    const env = { [key]: true, log: [], timers: [], answer: Promise.resolve({ ok: true, signedIn: false }) };
    const api = harness(app, env);
    assert.ok(api.primeBootAuthVerdict(), key + ' yang diingat memancing jawaban server');
  }
  // 6. jawaban terlambat dipakai begitu tiba, tanpa pertanyaan kedua
  {
    let resolve;
    const env = { marker: true, log: [], timers: [], answer: new Promise((r) => { resolve = r; }) };
    const api = harness(app, env);
    api.primeBootAuthVerdict();
    assert.strictEqual(api.bootAuthVerdict(), 'pending');
    api.setUsed(true);
    api.followUpAuthCheck('pending');
    resolve({ ok: true, signedIn: false }); await tick(); await tick(); await tick();
    assert.ok(env.log.includes('clear') && env.log.includes('gate'), 'jawaban terlambat "belum masuk" -> penanda dicabut + layar masuk');
    assert.strictEqual(env.log.filter((x) => x === 'fetch').length, 1, 'tanpa pertanyaan kedua ke server');
    assert.strictEqual(env.timers.length, 0, 'tidak menjadwalkan verifyAuthSession lagi');
  }
  // 7. sesudah terpakai, jawaban boot tidak dipakai lagi (mis. proceed() sesudah masuk)
  {
    const env = { marker: true, log: [], timers: [], answer: Promise.resolve({ ok: true, signedIn: false }) };
    const api = harness(app, env);
    api.primeBootAuthVerdict(); await tick(); await tick();
    api.setUsed(true);
    assert.strictEqual(api.bootAuthVerdict(), 'none', 'jawaban boot basi tidak menghadang murid yang baru masuk');
  }
}

function assertShellVeil(app, css) {
  assert.ok(/function render\(\)\{const __renderStartedAt=Date\.now\(\);try\{document\.documentElement\.classList\.add\('fz-app-open'\)\}catch\(_\)\{\}try\{const __r=renderInner\(\);/.test(app),
    'render() harus memasang html.fz-app-open sebelum renderInner()');
  const i = css.indexOf('16. SELUBUNG CANGKANG SAAT BOOT');
  assert.ok(i >= 0, 'Section 16 selubung cangkang tidak ditemukan');
  const s = css.slice(i);
  assert.ok(/html:not\(\.fz-app-open\) body nav\.bottomnav,\s*html:not\(\.fz-app-open\) body header\.topbar \{\s*visibility:\s*hidden !important;/.test(s),
    'topbar dan tab bawah harus tersembunyi sebelum layar pertama digambar');
  assert.ok(!/html:not\(\.fz-app-open\)[^{]*#app/.test(s), '#app tidak boleh diselubungi (layar galat boot ada di sana)');
}

(async () => {
  console.log('FIEZEL Boot Auth Verdict Gate:');
  await check('A. jawaban server dipancing di awal boot, sebelum load()', () => assertPrimedEarly(APP));
  await check('B. proceed(): gerbang -> jawaban boot -> layar masuk -> baru perkenalan', () => assertProceedUsesVerdict(APP));
  await check('C. perilaku jawaban boot di env tiruan', () => assertBehaviour(APP));
  await check('D. selubung cangkang sampai render() pertama', () => assertShellVeil(APP, CLAY));
  await check('E. bukti negatif: gerbang MERAH pada stub yang melanggar', async () => {
    const mustThrow = async (label, fn) => {
      let threw = false;
      try { await fn(); } catch (_) { threw = true; }
      assert.ok(threw, 'stub "' + label + '" seharusnya merah');
    };
    await mustThrow('dipancing sesudah load', () => assertPrimedEarly(APP.replace('try{primeBootAuthVerdict()}catch(_){}\n', '')));
    await mustThrow('jawaban boot diabaikan', () => assertProceedUsesVerdict(APP.replace("if(bootAuth==='signed-out'){forgetLocalAuth();showAuthGate(at,proceed);return null}", '')));
    await mustThrow('tunggu tanpa batas', () => assertProceedUsesVerdict(APP.replace('const BOOT_AUTH_WAIT_MS=1500;', 'const BOOT_AUTH_WAIT_MS=8000;')));
    await mustThrow('gerbang tidak menandai', () => assertProceedUsesVerdict(APP.replace('  bootAuthVerdictUsed=true;\n  const A=self.FiezelAuthScreen;', '  const A=self.FiezelAuthScreen;')));
    await mustThrow('null mencabut penanda', () => assertBehaviour(APP.replace("return bootAuthVerdictValue.ok===true&&bootAuthVerdictValue.signedIn===false?'signed-out':'none';", "return bootAuthVerdictValue.signedIn!==true?'signed-out':'none';")));
    await mustThrow('selubung dicabut', () => assertShellVeil(APP, CLAY.replace('visibility: hidden !important;\n}', 'visibility: visible;\n}')));
  });

  if (failures.length) {
    console.error('\nFAIL: ' + failures.length + ' invarian boot dilanggar:');
    failures.forEach((f) => console.error('  - ' + f.name + ': ' + f.error));
    process.exit(1);
  }
  console.log('\nHIJAU: ' + passCount + ' invarian boot terjaga.\n');
  process.exit(0);
})();
