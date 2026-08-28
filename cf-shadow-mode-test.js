// cf-shadow-mode-test.js — gerbang PERILAKU untuk sakelar transport Cloudflare.
//
// Bedanya dengan `cf-transport-test.js`: berkas itu menjaga BENTUK (flag ada, default off,
// tidak ada URL hardcode). Berkas ini MENJALANKAN jalur transport `app.js` di dalam `vm` dan
// menjaga PERILAKUNYA pada tiga mode, karena bentuk yang benar masih bisa berperilaku salah.
//
// Lima kebenaran yang dijaga (semua diuji dengan menjalankan kode, bukan mencocokkan teks):
//   (a) mode 'off' menghasilkan jalur pemanggilan yang IDENTIK dengan kode hari ini:
//       tepat satu `puter.workers.exec(CORE_WORKER_URL+path, options)` dengan objek options
//       yang SAMA (bukan salinan), dan NOL fetch tambahan.
//   (b) mode 'shadow' tidak pernah memakai jawaban CF sebagai jawaban murid: yang dikembalikan
//       adalah objek respons Puter itu sendiri, dan body respons CF tidak pernah dibaca.
//   (c) mode 'shadow' tidak menggandakan efek samping: satu panggilan Puter (bukan dua), satu
//       permintaan bayangan (tanpa retry), permintaan bayangan membawa penanda dry-run, dan
//       transport tidak menulis apa pun di klien (localStorage/state/DOM).
//   (d) `enabled:false` MENGALAHKAN semua nilai 'on' — rollback satu nilai yang nyata.
//   (e) tidak ada URL Cloudflare hardcode di `app.js` (alamat hanya dari FIEZEL_CF_CONFIG.base).
//
// KONTEKS YANG MEMBUAT GERBANG INI PERLU: Worker `fiezel-api` sudah hidup, tetapi
// `api.fiezel.my.id` BELUM aktif dan workers.dev sengaja dimatikan. Yang di-merge hari ini
// adalah SAKELARNYA DALAM KEADAAN MATI. Gerbang yang hanya memeriksa "semua flag off" akan
// tetap hijau seandainya jalur 'on'/'shadow' salah tulis — dan kesalahan itu baru terlihat
// pada hari flag dinyalakan, yaitu hari paling buruk untuk menemukannya. Karena itu mode
// 'shadow' dan 'on' di sini dijalankan dengan flag SINTETIS di dalam vm; berkas repo tetap
// semuanya 'off' (dan itu ikut di-assert).
//
// Nol dependency, nol jaringan, nol berkas temporer. `fetch` di dalam vm adalah MOCK LOKAL
// (`fetchMock`, didefinisikan sebelum disuntikkan) — pola yang dikenali no-network-test.js.
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = __dirname;
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

const checks = [];
let failed = false;
const check = (name, ok, details) => {
  checks.push({ name, status: ok ? 'PASS' : 'FAIL', details: String(details) });
  if (!ok) failed = true;
};
// Buang komentar sebelum memindai (pola audio-asset-pipeline-test.js:290-292).
const stripComments = src => src
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|[^:\\])\/\/[^\n]*/g, '$1 ');

const app = read('app.js');
const appCode = stripComments(app);
const config = read('core-config.js');
const workflow = read('.github/workflows/quality.yml');

check('Gerbang ini terdaftar di quality.yml', workflow.includes('node cf-shadow-mode-test.js'), 'quality.yml');

/* =======================================================================================
 * 0. Ambil blok transport dari app.js APA ADANYA (bukan salinan yang bisa basi)
 * ===================================================================================== */
// Sentinelnya ada di app.js supaya potongan ini deterministik dan supaya orang yang mengubah
// transport tahu bahwa ada gerbang yang menjalankan blok itu.
const BEGIN = '/* CF-TRANSPORT-BEGIN';
const END = '/* CF-TRANSPORT-END */';
const beginAt = app.indexOf(BEGIN);
const endAt = app.indexOf(END);
check('Blok transport CF bisa dipotong dari app.js lewat sentinel CF-TRANSPORT-BEGIN/END',
  beginAt >= 0 && endAt > beginAt, `begin=${beginAt} end=${endAt}`);

const block = beginAt >= 0 && endAt > beginAt ? app.slice(beginAt, endAt) : '';
check('Blok transport memuat coreWorkerExec dan jalur Puter hari ini',
  /async function coreWorkerExec\(/.test(block) && /const sdk=await awaitPuter\(\);if\(sdk\?\.workers\?\.exec\)/.test(block),
  `panjang=${block.length}`);

// Jaminan struktural yang tidak butuh dijalankan: transport TIDAK BOLEH menulis state murid.
// Kalau suatu hari ada `save()`/`localStorage`/`document` di blok ini, (c) bisa bocor lewat
// jalur yang tidak dilewati skenario mana pun di bawah.
const blockCode = stripComments(block);
const forbiddenWriters = ['localStorage', 'sessionStorage', 'save(', 'document', 'render(', 'alert(', 'innerHTML']
  .filter(token => blockCode.includes(token));
check('Blok transport tidak menyentuh penyimpanan/DOM sama sekali (efek samping klien = nol)',
  forbiddenWriters.length === 0, forbiddenWriters.join(', ') || '0');
check('Pembacaan body respons CF tidak ada di blok transport (hasil shadow mustahil dipakai)',
  !/\.json\(\)|\.text\(\)|\.arrayBuffer\(\)/.test(blockCode), 'cari .json()/.text() di blok transport');

/* =======================================================================================
 * 1. Harness: jalankan blok itu dengan flag sintetis
 * ===================================================================================== */
const PUTER_URL = 'https://fiezel-core.puter.work';
const CF_BASE_SYNTHETIC = 'https://api.fiezel.my.id';
const ALL_ON = { health: 'on', config: 'on', auth: 'on', quota: 'on', ai: 'on', tts: 'on', usage: 'on' };

// MOCK LOKAL, didefinisikan SEBELUM disuntikkan ke konteks vm. Ia tidak pernah meneruskan ke
// fetch global: seluruh jawabannya dibuat di sini.
// m031-killswitch: `cfEndpointMode` sekarang meminta izin lapis SERVER lewat
// `self.FiezelCfKillSwitch.allows(key)` (blok CF-KILLSWITCH di app.js) dan gagal ke arah
// MATI kalau jawabannya bukan `true`. Harness ini menyuntikkan stub yang mengizinkan semua,
// supaya berkas ini tetap menguji apa yang memang tugasnya: perilaku tiga mode transport.
// Perilaku kill switch itu sendiri diuji `cf-config-killswitch-test.js`, dan sifat
// fail-closed-nya ikut di-assert di bawah dengan stub yang DIHILANGKAN.
function makeHarness(cfConfig, killSwitch = { allows: () => true }) {
  const log = { cfCalls: [], puter: [], debug: [], storage: [], bodyReads: [] };
  const cfResponse = {
    ok: true, status: 200, __from: 'cloudflare',
    json: async () => { log.bodyReads.push('cf.json'); return { protocol: '1.7', text: 'JAWABAN-CF' }; },
    text: async () => { log.bodyReads.push('cf.text'); return 'JAWABAN-CF'; }
  };
  const puterResponse = {
    ok: true, status: 200, __from: 'puter',
    json: async () => { log.bodyReads.push('puter.json'); return { protocol: '1.7', text: 'JAWABAN-PUTER' }; }
  };
  const fetchMock = async (url, options) => {
    log.cfCalls.push({ url: String(url), options: options || {} });
    return cfResponse;
  };
  const puter = {
    workers: {
      exec: (url, options) => {
        log.puter.push({ url: String(url), options, sameOptionsObject: null });
        return Promise.resolve(puterResponse);
      }
    }
  };
  const storage = {
    setItem: (k, v) => log.storage.push(`set:${k}`),
    getItem: () => null,
    removeItem: k => log.storage.push(`remove:${k}`)
  };
  const sandbox = {
    Object, Promise, String, Number, Boolean, Math, JSON, Error, Array, Set, Map,
    console: { debug: (...a) => log.debug.push(a.map(String).join(' ')), log: () => {}, warn: () => {}, error: () => {} },
    fetch: fetchMock,
    localStorage: storage,
    CORE_WORKER_URL: PUTER_URL,
    awaitPuter: async () => puter
  };
  sandbox.self = sandbox;
  sandbox.globalThis = sandbox;
  sandbox.puter = puter;
  if (killSwitch) sandbox.FiezelCfKillSwitch = killSwitch;
  sandbox.FIEZEL_CF_CONFIG = cfConfig ? Object.freeze({ ...cfConfig, endpoints: Object.freeze({ ...cfConfig.endpoints }) }) : undefined;
  vm.createContext(sandbox);
  // `const` di puncak skrip tidak menempel ke global vm; deklarasi fungsi menempel. Ekspor
  // eksplisit di bawah supaya harness tidak bergantung pada detail itu.
  vm.runInContext(block + '\n;globalThis.__cf={coreWorkerExec,cfEndpointMode,cfWorkerFetch};',
    sandbox, { filename: 'app.js#cf-transport' });
  return { api: sandbox.__cf, log, puterResponse, cfResponse };
}

const tick = () => new Promise(resolve => setTimeout(resolve, 20));
const results = {};

(async () => {
  /* ===================================================================================
   * (a) mode 'off' = jalur hari ini, tanpa satu pun fetch tambahan
   * ================================================================================= */
  // Flag yang dipakai di sini adalah flag NYATA dari core-config.js repo, bukan sintetis:
  // yang diuji adalah apa yang benar-benar akan dijalankan murid hari ini.
  const realCf = (() => {
    const box = { self: {}, Object, console };
    box.self.self = box.self;
    vm.createContext(box);
    vm.runInContext(config, box, { filename: 'core-config.js' });
    return box.self.FIEZEL_CF_CONFIG || null;
  })();
  /* A6 (28 Agu 2026): bentuk lama assert ini menuntut SEMUA mode repo masih 'off'. Sejak
   * penyalaan bertahap tahap 1 (analytics saja), yang benar adalah: yang hidup HANYA
   * config+usage, dan lima sisanya — termasuk dua yang membelanjakan neuron — wajib off.
   * Rinciannya di reports/work-a6-client-switch.md. */
  const HIDUP_SAH_A6 = ['config', 'usage'];
  const modeRepo = Object.entries(realCf?.endpoints || {});
  check('core-config.js repo: FIEZEL_CF_CONFIG terbaca dan yang hidup HANYA config+usage (A6 tahap 1)',
    Boolean(realCf) && typeof realCf.enabled === 'boolean'
      && modeRepo.length === 7
      && modeRepo.filter(([, v]) => v !== 'off').every(([k]) => HIDUP_SAH_A6.includes(k))
      && realCf.endpoints.ai === 'off' && realCf.endpoints.tts === 'off',
    JSON.stringify(realCf));

  /* Skenario (a) menguji SEMANTIK mode 'off', jadi flagnya ditulis eksplisit di sini.
   * Sebelum A6 ia meminjam flag repo karena repo memang seluruhnya off; setelah A6 pinjaman
   * itu akan menguji hal lain (usage sudah on) dan assertnya jadi bohong. */
  const ALL_OFF = { health: 'off', config: 'off', auth: 'off', quota: 'off', ai: 'off', tts: 'off', usage: 'off' };
  const off = makeHarness({ enabled: false, base: '', endpoints: ALL_OFF });
  const options = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"a":1}' };
  const offAnswer = await off.api.coreWorkerExec('/api/feedback', options);

  // Jalur pemanggilan yang DIHARAPKAN ditulis lengkap di sini (bukan disimpulkan dari kode
  // yang sedang diuji), supaya assert ini tetap bermakna kalau kodenya berubah.
  const expectedCallPath = [`puter.workers.exec ${PUTER_URL}/api/feedback`];
  const actualCallPath = off.log.puter.map(c => `puter.workers.exec ${c.url}`);
  check('(a) mode off: jalur pemanggilan identik dengan kode hari ini',
    JSON.stringify(actualCallPath) === JSON.stringify(expectedCallPath),
    JSON.stringify(actualCallPath));
  check('(a) mode off: NOL fetch tambahan', off.log.cfCalls.length === 0, `fetch=${off.log.cfCalls.length}`);
  check('(a) mode off: options diteruskan sebagai objek yang SAMA (tidak disalin/diubah)',
    off.log.puter[0]?.options === options, String(off.log.puter[0]?.options === options));
  check('(a) mode off: jawaban berasal dari Puter', offAnswer === off.puterResponse, String(offAnswer?.__from));
  check('(a) mode off: nol tulisan penyimpanan', off.log.storage.length === 0, off.log.storage.join(',') || '0');
  // Anti-vakum: path yang TIDAK terpetakan (push/subscribe) juga harus off, apa pun flagnya.
  const offUnmapped = makeHarness({ enabled: true, base: CF_BASE_SYNTHETIC, endpoints: ALL_ON });
  await offUnmapped.api.coreWorkerExec('/api/push/subscribe', { method: 'POST' });
  check('(a) path tak terpetakan (/api/push/subscribe) tetap ke Puter walau semua flag on',
    offUnmapped.log.cfCalls.length === 0 && offUnmapped.log.puter.length === 1,
    `fetch=${offUnmapped.log.cfCalls.length} puter=${offUnmapped.log.puter.length}`);

  /* ===================================================================================
   * (b) mode 'shadow' — jawaban murid TETAP Puter
   * ================================================================================= */
  const shadow = makeHarness({ enabled: true, base: CF_BASE_SYNTHETIC, endpoints: { ...ALL_ON, usage: 'shadow' } });
  const shadowOptions = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"outcome":1}' };
  const shadowAnswer = await shadow.api.coreWorkerExec('/api/usage/event', shadowOptions);
  await tick();

  check('(b) mode shadow: jawaban yang dikembalikan adalah objek respons PUTER, bukan CF',
    shadowAnswer === shadow.puterResponse && shadowAnswer !== shadow.cfResponse, String(shadowAnswer?.__from));
  check('(b) mode shadow: body respons CF tidak pernah dibaca (hasilnya benar-benar dibuang)',
    shadow.log.bodyReads.filter(x => x.startsWith('cf.')).length === 0, shadow.log.bodyReads.join(',') || '0');
  check('(b) mode shadow: salinan permintaan memang terkirim ke CF (bayangan bukan omong kosong)',
    shadow.log.cfCalls.length === 1 && shadow.log.cfCalls[0].url === `${CF_BASE_SYNTHETIC}/api/usage/event`,
    shadow.log.cfCalls.map(f => f.url).join(', ') || '0');
  check('(b) mode shadow: perbandingan hanya dicatat ke konsol diagnostik',
    shadow.log.debug.some(line => line.includes('[cf-shadow]') && line.includes('/api/usage/event')),
    shadow.log.debug.join(' | ') || '(kosong)');

  /* ===================================================================================
   * (c) mode 'shadow' tidak menggandakan efek samping
   * ================================================================================= */
  const shadowHeaders = shadow.log.cfCalls[0]?.options?.headers || {};
  check('(c) mode shadow: TEPAT satu panggilan Puter (efek samping tidak digandakan di jalur lama)',
    shadow.log.puter.length === 1, `puter=${shadow.log.puter.length}`);
  check('(c) mode shadow: TEPAT satu permintaan bayangan, tanpa retry',
    shadow.log.cfCalls.length === 1, `fetch=${shadow.log.cfCalls.length}`);
  check('(c) mode shadow: salinan membawa penanda dry-run X-Fiezel-Shadow (kontrak read-only Worker)',
    String(shadowHeaders['X-Fiezel-Shadow'] || '') === '1', JSON.stringify(shadowHeaders));
  check('(c) mode shadow: header asli tetap utuh di salinan (yang dibandingkan permintaan yang sama)',
    String(shadowHeaders['Content-Type'] || '') === 'application/json', JSON.stringify(shadowHeaders));
  check('(c) mode shadow: body salinan sama dengan body asli',
    shadow.log.cfCalls[0]?.options?.body === shadowOptions.body, String(shadow.log.cfCalls[0]?.options?.body));
  check('(c) mode shadow: options ASLI tidak dimutasi (pemanggil tidak ikut membawa penanda shadow)',
    !('X-Fiezel-Shadow' in shadowOptions.headers), JSON.stringify(shadowOptions.headers));
  check('(c) mode shadow: nol tulisan penyimpanan dari jalur transport',
    shadow.log.storage.length === 0, shadow.log.storage.join(',') || '0');

  /* ===================================================================================
   * mode 'on' — harus benar-benar bekerja, kalau tidak (a)-(d) menguji ruang kosong
   * ================================================================================= */
  const on = makeHarness({ enabled: true, base: CF_BASE_SYNTHETIC, endpoints: { ...ALL_ON } });
  const onAnswer = await on.api.coreWorkerExec('/api/ai/chat', { method: 'POST', body: '{}' });
  check("mode on: jawaban berasal dari CF (anti-vakum: cabang 'on' hidup)",
    onAnswer === on.cfResponse, String(onAnswer?.__from));
  check('mode on: NOL panggilan Puter (bukan dua jalur sekaligus)', on.log.puter.length === 0, `puter=${on.log.puter.length}`);
  check("mode on: permintaan CF memakai credentials:'include' (cookie sesi lintas-subdomain)",
    on.log.cfCalls[0]?.options?.credentials === 'include', String(on.log.cfCalls[0]?.options?.credentials));
  check('mode on: alamat dibentuk dari base + path, bukan URL lain',
    on.log.cfCalls[0]?.url === `${CF_BASE_SYNTHETIC}/api/ai/chat`, String(on.log.cfCalls[0]?.url));

  /* ===================================================================================
   * (d) enabled:false MENGALAHKAN semua 'on'
   * ================================================================================= */
  const killed = makeHarness({ enabled: false, base: CF_BASE_SYNTHETIC, endpoints: { ...ALL_ON } });
  const PATHS = ['/health', '/api/config', '/api/auth/session', '/api/quota/state', '/api/ai/chat', '/api/tts/say', '/api/usage/event', '/api/feedback', '/api/activity', '/api/policy/next'];
  const modes = PATHS.map(p => `${p}=${killed.api.cfEndpointMode(p)}`);
  check('(d) enabled:false ⇒ cfEndpointMode() = off untuk SEMUA path walau tiap endpoint on',
    modes.every(m => m.endsWith('=off')), modes.join(', '));
  for (const p of PATHS) await killed.api.coreWorkerExec(p, { method: 'POST' });
  check('(d) enabled:false ⇒ nol fetch ke CF untuk sepuluh path', killed.log.cfCalls.length === 0, `fetch=${killed.log.cfCalls.length}`);
  check('(d) enabled:false ⇒ semua sepuluh path dilayani Puter', killed.log.puter.length === PATHS.length,
    `puter=${killed.log.puter.length}/${PATHS.length}`);
  // Alamat kosong = mati total juga, walau enabled:true (tidak ada tujuan = tidak ada CF).
  const noBase = makeHarness({ enabled: true, base: '', endpoints: { ...ALL_ON } });
  await noBase.api.coreWorkerExec('/api/ai/chat', { method: 'POST' });
  check("(d) base:'' ⇒ jalur CF mati walau enabled:true dan endpoint on",
    noBase.log.cfCalls.length === 0 && noBase.log.puter.length === 1,
    `fetch=${noBase.log.cfCalls.length} puter=${noBase.log.puter.length}`);
  // Nilai asing harus berarti AMAN, bukan hidup.
  const weird = makeHarness({ enabled: true, base: CF_BASE_SYNTHETIC, endpoints: { ...ALL_ON, ai: 'ON', usage: 'cf', tts: 'true' } });
  check('(d) nilai mode yang tidak dikenali jatuh ke off, bukan ke on',
    ['/api/ai/chat', '/api/usage/event', '/api/tts/say'].every(p => weird.api.cfEndpointMode(p) === 'off'),
    ['/api/ai/chat', '/api/usage/event', '/api/tts/say'].map(p => `${p}=${weird.api.cfEndpointMode(p)}`).join(', '));

  /* ===================================================================================
   * (d-bis) kill switch server sebagai gerbang WAJIB, gagal ke arah mati
   * ================================================================================= */
  // Tanpa modul kill switch di bundel, jalur CF harus MATI walau semua flag statis 'on':
  // sebuah jalur CF yang hidup tanpa pengawas server adalah persis keadaan yang paket kerja
  // ini ada untuk menghapus.
  const noGate = makeHarness({ enabled: true, base: CF_BASE_SYNTHETIC, endpoints: { ...ALL_ON } }, null);
  await noGate.api.coreWorkerExec('/api/ai/chat', { method: 'POST', body: '{}' });
  check('(d) tanpa FiezelCfKillSwitch di bundel, jalur CF MATI (gagal ke arah aman, bukan ke arah mahal)',
    noGate.log.cfCalls.length === 0 && noGate.log.puter.length === 1 && noGate.api.cfEndpointMode('/api/ai/chat') === 'off',
    `fetch=${noGate.log.cfCalls.length} puter=${noGate.log.puter.length} mode=${noGate.api.cfEndpointMode('/api/ai/chat')}`);
  // Dan izin server yang ditolak juga mematikan, walau statisnya 'on'.
  const denied = makeHarness({ enabled: true, base: CF_BASE_SYNTHETIC, endpoints: { ...ALL_ON } }, { allows: () => false });
  await denied.api.coreWorkerExec('/api/tts/say', { method: 'POST' });
  check('(d) izin server false ⇒ endpoint statis on tetap dilayani Puter',
    denied.log.cfCalls.length === 0 && denied.log.puter.length === 1,
    `fetch=${denied.log.cfCalls.length} puter=${denied.log.puter.length}`);

  /* ===================================================================================
   * (e) tidak ada URL Cloudflare hardcode di app.js
   * ================================================================================= */
  const CF_HARDCODE = [
    /https?:\/\/[a-z0-9-]+\.workers\.dev/gi,
    /https?:\/\/[a-z0-9-]+\.pages\.dev/gi,
    /https?:\/\/[a-z0-9-]+\.r2\.cloudflarestorage\.com/gi,
    /https?:\/\/api\.fiezel\.my\.id/gi,
    /https?:\/\/[a-z0-9.-]*cloudflare[a-z0-9.-]*/gi
  ];
  const hardcoded = CF_HARDCODE.flatMap(p => appCode.match(p) || []);
  check('(e) tidak ada URL Cloudflare hardcode di app.js', hardcoded.length === 0, hardcoded.join(', ') || '0');
  check('(e) alamat CF di app.js hanya berasal dari FIEZEL_CF_CONFIG.base',
    /FIEZEL_CF_CONFIG[\s\S]{0,200}?\.base\b/.test(appCode) && !/CF_BASE\s*=\s*['"]/.test(appCode),
    'cari FIEZEL_CF_CONFIG…base di app.js');

  /* ===================================================================================
   * protocol 1.7 tidak dilonggarkan (tiga jalur pemeriksaan tetap ada)
   * ================================================================================= */
  const protocolGuards = ['policy_protocol_mismatch', 'coach_protocol_mismatch', "reason:'protocol_mismatch'"]
    .filter(token => appCode.includes(token));
  check('protocol 1.7: tiga pemeriksaan *_protocol_mismatch masih ada di app.js',
    protocolGuards.length === 3, protocolGuards.join(', '));
  check('protocol 1.7: transport tidak menyentuh pemeriksaan protokol sama sekali',
    !/protocol/i.test(blockCode), 'blok transport tidak boleh memutuskan soal protokol');

  /* ================================================================================= */
  const report = {
    schema: 'fiezel-cf-shadow-mode-v1',
    pass: !failed,
    counts: {
      pass: checks.filter(c => c.status === 'PASS').length,
      fail: checks.filter(c => c.status === 'FAIL').length
    },
    checks
  };
  fs.writeFileSync(path.join(root, 'CF-SHADOW-MODE-REPORT.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
  if (failed) {
    console.log(`FIEZEL cf-shadow-mode gate: FAIL (${report.counts.fail} assert merah)`);
    process.exitCode = 1;
  } else {
    console.log(`FIEZEL cf-shadow-mode gate: PASS (${report.counts.pass} assert)`);
  }
  results.done = true;
})().catch(error => {
  console.error('FIEZEL cf-shadow-mode gate: FAIL (harness melempar)');
  console.error(error);
  process.exitCode = 1;
});
