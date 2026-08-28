// no-network-test.js — gerbang mutu tidak boleh bergantung pada jaringan sungguhan.
//
// Ia memindai SELURUH berkas `*-test.js` / `*-audit.js` di akar repo dan mencari pola
// jaringan nyata (`fetch(`, `http.request`, `net.connect`, `tls.connect`, `new WebSocket`,
// spawn `curl`/`wget`) DI LUAR allowlist.
//
// SADAR-SHADOW, DAN ITU BUKAN HIASAN. Sepuluh gerbang existing menyuntikkan `fetch` ke
// dalam konteks `vm` — tetapi `fetch` di sana adalah MOCK LOKAL yang membaca berkas repo,
// bukan `fetch` global Node:
//
//   regression-test.js:70   const fetch=async url=>{ … fs.existsSync(file) … }   ← definisi mock
//   regression-test.js:77   const ctx={…,fetch,…}                                ← memakai mock itu
//
// Klaim cf-a9 (temuan #5 / R3) bahwa `regression-test.js:77` membocorkan `fetch` asli
// **SALAH**, dan sudah dikoreksi oleh reports/cf-b7-testing-strategy.md §5.0 lalu
// dikuatkan reports/cf-c1-konsistensi.md. Karena itu baris 77 TIDAK boleh "diperbaiki":
// gerbang ini yang harus cukup pintar untuk mengenalinya aman. Pemindai naif yang
// menghukum 10 berkas itu akan merah pada hari pertama, lalu dimatikan orang — dan gerbang
// yang dimatikan tidak melindungi apa pun.
//
// Sepuluh berkas dengan pola mock-lokal yang sah (semua terverifikasi oleh gerbang ini
// sendiri, bukan didaftar putih): regression-test.js, ai-integration-test.js,
// lesson-experience-test.js, notification-reminder-test.js, grammar-quality-audit.js,
// adaptive-policy-test.js, content-audit.js, learner-evidence-test.js,
// alrs-behavior-test.js, policy-outcome-test.js.
//
// Nol dependency, nol jaringan, nol berkas temporer.
'use strict';

const fs = require('fs');
const path = require('path');

const root = __dirname;

// ---------------------------------------------------------------------------------------
// Allowlist berkomentar. DUA berkas, bukan satu (koreksi cf-b7 §5.0 atas cf-a9):
//   http-smoke-test.js        - menyalakan server loopback untuk memeriksa aset HTTP nyata
//   e2e-level-grammar-test.js - :12 require('http'), :37 server.listen(0,'127.0.0.1'),
//                               :82 WebSocket ke CDP Chromium lokal
//   cf-live-selftest.js       - :41 require('node:http'), server.listen(0,'127.0.0.1'):
//                               ia menyalakan Worker `fiezel-api` TIRUAN untuk membuktikan
//                               `cf-live-contract-test.js` benar-benar bisa merah (21
//                               skenario: satu benar, 20 salah). Server tiruan HARUS server
//                               HTTP sungguhan; kalau tidak, jalur yang diuji bukan lagi
//                               jalur HTTP gerbang itu. Port 0 = dipilih kernel, tanpa DNS,
//                               tanpa keluar mesin.
//   e2e-bridge-selftest.js    - :require('node:https'), server.listen(0,'127.0.0.1'):
//                               ia menyalakan APLIKASI TIRUAN + JEMBATAN TIRUAN untuk
//                               membuktikan `tools/fiezel-e2e-bridge.mjs` (gerbang E2E
//                               browser) benar-benar bisa merah: 21 skenario, satu benar
//                               dan 20 salah. Servernya HARUS HTTPS sungguhan - browser
//                               hanya menyimpan cookie `Secure` dari konteks aman, dan
//                               seluruh bukti gerbang itu adalah soal cookie. Semua nama
//                               host uji dipetakan ke 127.0.0.1 lewat
//                               --host-resolver-rules Chromium: tanpa DNS, tanpa egress.
// Keempatnya loopback tanpa DNS eksternal, dan gerbang ini MEMBUKTIKAN sifat loopback itu
// (bukan mempercayainya). Menambah nama ke daftar ini adalah keputusan arsitektur, jadi
// jumlahnya ikut di-assert.
//
// CATATAN CAKUPAN: pemindaian di bawah diperluas ke berkas `*-selftest.js`. Tanpa itu,
// `cf-live-selftest.js` lolos hanya karena namanya tidak berakhiran `-test.js` — dan
// "lolos karena nama berkas" adalah kebalikan dari daftar yang disengaja.
const SOCKET_ALLOWLIST = new Set(['http-smoke-test.js', 'e2e-level-grammar-test.js', 'cf-live-selftest.js', 'e2e-bridge-selftest.js']);

// Kelas kedua yang berbeda secara MAKNA, bukan sekadar pengecualian kedua:
//   prerender-dryrun-test.js - :33-38 require('https')/require('http') SEMATA-MATA untuk
//                              menimpa `request`/`get` dengan jerat yang MELEMPAR. Berkas
//                              ini tidak membuka socket; ia menutup socket. Menghukumnya
//                              berarti menghukum pertahanan yang sepihak dengan gerbang ini.
// Syaratnya diperiksa, bukan dipercaya: berkas harus benar-benar MENUGASKAN jerat ke
// `request`/`get`, dan larangan MEMANGGIL socket tetap berlaku penuh (penugasan
// `https.request = trap(...)` bukan panggilan, jadi detektor panggilan tidak dilonggarkan).
const TRAP_ONLY_ALLOWLIST = new Set(['prerender-dryrun-test.js']);
const RE_TRAP_INSTALL = /\b(?:https?|net|tls)\s*\.\s*(?:request|get|connect)\s*=/;

// KELAS KETIGA — dan ia ada karena kejujuran, bukan karena pemindai menuntutnya.
//   cf-live-contract-test.js - satu-satunya gerbang yang SENGAJA menembak host
//                              non-loopback: ia menguji Worker `fiezel-api` yang hidup
//                              lewat HTTP nyata (batas kejujuran reports/exec-wiring.md §6).
// Berkas itu TIDAK terdeteksi pemindai di bawah: ia tidak me-`require` modul socket dan
// URL-nya datang dari `process.env`, bukan dari literal. Artinya ia akan lolos DIAM-DIAM,
// dan itu justru yang tidak boleh terjadi — gerbang ini akan tampak melindungi sesuatu
// yang sudah bocor. Jadi namanya didaftarkan di sini dengan syarat yang DIPERIKSA, bukan
// dipercaya: harus membaca env gerbangnya, harus exit 0 tanpa env itu, dan tidak boleh
// punya URL remote bawaan (satu `|| 'https://api...'` akan membuat CI publik menembak
// produksi pada setiap push).
//   staging-live-test.js      - anggota KEDUA kelas ini, dan ia menembak lebih jauh:
//                              selain membaca, ia MENULIS state nyata (kuota harian,
//                              objek audio, baris analytics) di Worker
//                              `fiezel-api-staging`. Karena itu env gerbangnya
//                              berbeda (`FIEZEL_STAGING_BASE`) dan syaratnya sama
//                              kerasnya: baca env, SKIP bersih tanpa env, tanpa URL
//                              bawaan. Ia juga butuh rahasia header edge yang TIDAK
//                              BOLEH ada di CI publik — satu alasan tambahan kenapa
//                              SKIP-nya harus terbukti, bukan dijanjikan.
// Env-nya PER BERKAS, bukan satu konstanta global: `cf-live-contract-test.js` dan
// `staging-live-test.js` menembak dua lingkungan berbeda, dan menyamakan nama env
// keduanya akan membuat satu variabel menyalakan gerbang yang tidak dimaksud.
const ENV_GATED_LIVE_ALLOWLIST = new Map([
  ['cf-live-contract-test.js', 'FIEZEL_CF_LIVE_BASE'],
  ['staging-live-test.js', 'FIEZEL_STAGING_BASE']
]);
const LIVE_ENV_VAR = 'FIEZEL_CF_LIVE_BASE';
const STAGING_ENV_VAR = 'FIEZEL_STAGING_BASE';

const checks = [];
const notes = [];
let failed = false;
const check = (name, ok, details) => {
  checks.push({ name, status: ok ? 'PASS' : 'FAIL', details: String(details) });
  if (!ok) failed = true;
};

// Buang komentar SEBELUM memindai — pola yang sudah dipakai audio-asset-pipeline-test.js:290-292
// — supaya penjelasan panjang seperti header berkas ini tidak ikut dihukum.
const stripComments = src => src
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|[^:\\])\/\/[^\n]*/g, '$1 ');

/* =======================================================================================
 * Detektor sadar-shadow (satu fungsi, dipakai untuk repo NYATA dan untuk fixture sintetis)
 * ===================================================================================== */
const RE = {
  socketRequire: /require\(\s*['"](?:node:)?(https?|net|tls|dgram|dns)['"]\s*\)/g,
  socketCall: /\b(?:https?|net|tls|dns)\s*\.\s*(?:request|get|connect|createConnection|lookup|resolve\w*)\s*\(/g,
  webSocket: /\bnew\s+WebSocket\s*\(/g,
  // fetch( ke URL literal non-loopback = panggilan jaringan nyata, apa pun shadow-nya.
  literalRemoteFetch: /\bfetch\(\s*['"`]https?:\/\/(?!127\.0\.0\.1|localhost|\[?::1\]?|0\.0\.0\.0)/g,
  netTool: /['"](?:\/usr\/bin\/)?(?:curl|wget|nc|ncat|ssh|scp|telnet)['"]/g,
  // Definisi mock lokal: `const fetch=…`, `function fetch(…)`, atau properti `fetch(url){…}`
  fetchDefinition: /(?:const|let|var)\s+fetch\s*=|(?:async\s+)?function\s+fetch\s*\(|globalThis\.fetch\s*=/g,
  // Penyuntikan ke konteks vm dalam bentuk shorthand `{…, fetch, …}` atau `fetch: X`
  vmInjectionShorthand: /[{,]\s*fetch\s*(?=[,}])/g,
  vmInjectionExplicit: /\bfetch\s*:\s*/g,
  vmUsage: /\bvm\s*\.\s*(?:createContext|runInContext|runInNewContext|runInThisContext|Script)\b/,
  // Mock yang MENERUSKAN ke fetch asli bukan mock — itu kebocoran berkedok.
  delegatesToReal: /(?:globalThis|global)\s*\.\s*fetch\s*(?:\.\s*(?:call|apply|bind)\s*)?\(/
};

function matchesWithIndex(code, regex) {
  const out = [];
  const re = new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : regex.flags + 'g');
  let m;
  while ((m = re.exec(code)) !== null) { out.push({ text: m[0], index: m.index, groups: m.slice(1) }); if (m.index === re.lastIndex) re.lastIndex += 1; }
  return out;
}
const lineOf = (code, index) => code.slice(0, index).split('\n').length;

function analyzeSource(file, rawCode, { allowSocket = false, trapOnly = false } = {}) {
  const code = stripComments(rawCode);
  const findings = [];
  const add = (kind, index, detail) => findings.push({ kind, file, line: lineOf(code, index), detail });

  const trapInstalled = RE_TRAP_INSTALL.test(code);
  const requireAllowed = allowSocket || (trapOnly && trapInstalled);
  for (const hit of matchesWithIndex(code, RE.socketRequire)) if (!requireAllowed) add('socketRequire', hit.index, hit.text);
  for (const hit of matchesWithIndex(code, RE.socketCall)) if (!allowSocket) add('socketCall', hit.index, hit.text);
  for (const hit of matchesWithIndex(code, RE.webSocket)) if (!allowSocket) add('webSocket', hit.index, hit.text);
  for (const hit of matchesWithIndex(code, RE.literalRemoteFetch)) if (!allowSocket) add('literalRemoteFetch', hit.index, hit.text);
  for (const hit of matchesWithIndex(code, RE.netTool)) if (!allowSocket) add('netTool', hit.index, hit.text);

  // ---- inti sadar-shadow -------------------------------------------------------------
  // Sebuah penyuntikan `fetch` ke konteks vm hanya kebocoran kalau TIDAK ada definisi mock
  // lokal yang mendahuluinya secara posisi. Urutan itu penting: definisi SESUDAH pemakaian
  // (mis. `var fetch` yang di-hoist tapi baru diisi belakangan) tidak boleh dianggap aman
  // secara membabi buta, jadi yang dibandingkan adalah indeks karakternya.
  const definitions = matchesWithIndex(code, RE.fetchDefinition);
  const usesVm = RE.vmUsage.test(code);
  const injections = [
    ...matchesWithIndex(code, RE.vmInjectionShorthand).map(h => ({ index: h.index, form: 'shorthand', rhs: 'fetch' })),
    ...matchesWithIndex(code, RE.vmInjectionExplicit).map(h => ({
      index: h.index,
      form: 'explicit',
      rhs: code.slice(h.index + h.text.length, h.index + h.text.length + 60).trim()
    }))
  ].sort((a, b) => a.index - b.index);

  for (const injection of injections) {
    const rhs = injection.rhs;
    // (a) Nilai INLINE (`fetch: async url => …`, `fetch: function(){…}`, `fetch: () => …`)
    //     mustahil menjadi fetch global: ia fungsi baru yang ditulis di tempat.
    //     Sebelas gerbang existing memakai bentuk ini (runtime-stage8-test.js:7,
    //     puter-auth-coop-test.js:24, backup-ui-test.js:37 lewat pengenal, dst).
    if (injection.form === 'explicit' && /^(?:async\s*)?(?:function\b|\(|[A-Za-z_$][\w$]*\s*=>)/.test(rhs)) continue;
    // (b) `fetch: globalThis.fetch` = kebocoran tanpa perlu diskusi.
    if (/^(?:globalThis|global)\s*\.\s*fetch\b/.test(rhs)) { add('vmFetchLeak', injection.index, 'menyuntik ' + rhs.slice(0, 24)); continue; }
    // (c) `fetch: namaLain` aman kalau `namaLain` didefinisikan lokal SEBELUM titik ini
    //     (pola `fetchMock` di observability-privacy-test.js:67-69).
    if (injection.form === 'explicit') {
      const identifier = (rhs.match(/^([A-Za-z_$][\w$]*)/) || [])[1];
      if (identifier && identifier !== 'fetch') {
        const declaration = new RegExp(`(?:const|let|var)\\s+${identifier}\\s*=|function\\s+${identifier}\\s*\\(`);
        const found = code.search(declaration);
        if (found >= 0 && found < injection.index) continue;
        add('vmFetchLeak', injection.index, 'menyuntik `' + identifier + '` yang tidak didefinisikan lokal lebih dulu');
        continue;
      }
    }
    // (d) `{…, fetch, …}` atau `fetch: fetch` — butuh mock lokal bernama `fetch` yang
    //     mendahului secara POSISI (pola regression-test.js:70 → :77).
    const shadowedBefore = definitions.some(d => d.index < injection.index);
    if (!shadowedBefore && usesVm) add('vmFetchLeak', injection.index, 'menyuntik `fetch` tanpa mock lokal yang mendahului');
    if (!shadowedBefore && !usesVm) add('bareFetchAlias', injection.index, 'meneruskan `fetch` global sebagai nilai');
  }
  // Mock yang meneruskan ke fetch asli = kebocoran berkedok mock.
  if (definitions.length && RE.delegatesToReal.test(code)) {
    add('mockDelegatesToReal', code.search(RE.delegatesToReal), 'mock fetch meneruskan panggilan ke fetch global');
  }

  return {
    findings,
    hasLocalFetchMock: definitions.length > 0,
    injects: injections.length > 0,
    usesVm,
    loopbackProven: /127\.0\.0\.1|localhost|::1/.test(code),
    trapInstalled
  };
}

/* =======================================================================================
 * 1. Anti-vakum: buktikan detektornya hidup SEBELUM dipercaya atas repo
 * ===================================================================================== */
// Gerbang yang hijau karena pemindainya mati adalah kebohongan yang paling mahal. Empat
// fixture sintetis di bawah menguji kedua arah sekaligus: yang aman harus lolos, yang
// bocor harus tertangkap.
const FIXTURES = {
  bocorTanpaMock: `const vm=require('vm');const ctx={console,fetch};vm.createContext(ctx);`,
  amanDenganMockLokal: `const vm=require('vm');
    const fetch=async url=>{const f=path.join(root,String(url));return fs.existsSync(f)?{ok:true,status:200}:{ok:false,status:404};};
    const ctx={console,fetch};vm.createContext(ctx);`,
  bocorMockMeneruskan: `const realFetch=globalThis.fetch;
    const fetch=async url=>globalThis.fetch(url);
    const vm=require('vm');const ctx={fetch};vm.createContext(ctx);`,
  bocorUrlLiteral: `(async()=>{const r=await fetch('https://fiezel.my.id/manifest.json');})();`,
  amanUrlLoopback: `(async()=>{const r=await fetch('http://127.0.0.1:8080/manifest.json');})();`,
  bocorHttpRequest: `const h=require('https');h.request({hostname:'example.com'});`,
  amanMockInline: `const vm=require('vm');
    const ctx={console,fetch:async url=>({ok:true,json:async()=>({})})};vm.createContext(ctx);`,
  amanMockBernamaLain: `const vm=require('vm');
    const fetchMock = async u => ({ ok: true, json: async () => ({}) });
    const ctx={console,fetch:fetchMock};vm.createContext(ctx);`,
  bocorPengenalTakDikenal: `const vm=require('vm');const ctx={console,fetch:fetchDariMana};vm.createContext(ctx);`,
  bocorEksplisitGlobal: `const vm=require('vm');const ctx={console,fetch:globalThis.fetch};vm.createContext(ctx);`,
  amanJeratSaja: `const https=require('https');https.request = trap('x'); https.get = trap('y');`,
  bocorJeratTapiMemanggil: `const https=require('https');https.request = trap('x'); https.request({hostname:'example.com'});`,
  amanKomentarSaja: `// dulu kami memakai fetch('https://example.com/x') lalu menghapusnya
    /* net.connect(80,'example.com') hanya dikutip di komentar */
    const kosong=1;`
};
const kinds = source => analyzeSource('fixture', source).findings.map(f => f.kind).sort().join(',');
check('Detektor menangkap penyuntikan `fetch` tanpa mock lokal', kinds(FIXTURES.bocorTanpaMock).includes('vmFetchLeak'), kinds(FIXTURES.bocorTanpaMock) || '(kosong)');
check('Detektor MEMBEBASKAN mock lokal yang mendahului (pola regression-test.js:70-77)', kinds(FIXTURES.amanDenganMockLokal) === '', kinds(FIXTURES.amanDenganMockLokal) || '(kosong)');
check('Detektor menangkap mock yang meneruskan ke fetch global (kebocoran berkedok)', kinds(FIXTURES.bocorMockMeneruskan).includes('mockDelegatesToReal'), kinds(FIXTURES.bocorMockMeneruskan) || '(kosong)');
check('Detektor menangkap fetch( ke URL literal non-loopback', kinds(FIXTURES.bocorUrlLiteral) === 'literalRemoteFetch', kinds(FIXTURES.bocorUrlLiteral) || '(kosong)');
check('Detektor MEMBEBASKAN fetch( ke loopback', kinds(FIXTURES.amanUrlLoopback) === '', kinds(FIXTURES.amanUrlLoopback) || '(kosong)');
check('Detektor menangkap require(https)+request', kinds(FIXTURES.bocorHttpRequest).split(',').includes('socketRequire'), kinds(FIXTURES.bocorHttpRequest) || '(kosong)');
check('Detektor tidak menghukum komentar', kinds(FIXTURES.amanKomentarSaja) === '', kinds(FIXTURES.amanKomentarSaja) || '(kosong)');
check('Detektor MEMBEBASKAN mock inline `fetch: async url => …` (pola runtime-stage8-test.js:7)', kinds(FIXTURES.amanMockInline) === '', kinds(FIXTURES.amanMockInline) || '(kosong)');
check('Detektor MEMBEBASKAN mock bernama lain yang didefinisikan lebih dulu (pola observability-privacy-test.js:67)', kinds(FIXTURES.amanMockBernamaLain) === '', kinds(FIXTURES.amanMockBernamaLain) || '(kosong)');
check('Detektor menangkap pengenal yang tidak didefinisikan lokal', kinds(FIXTURES.bocorPengenalTakDikenal).includes('vmFetchLeak'), kinds(FIXTURES.bocorPengenalTakDikenal) || '(kosong)');
// Nama assert ini sengaja TIDAK menuliskan pola `fetch<titik dua>globalThis.fetch` apa
// adanya: berkas ini memindai dirinya sendiri, jadi label yang memuat polanya akan
// menghukum dirinya sendiri. Fixture-nya yang memuat pola itu, bukan labelnya.
const trapKinds = (source) => analyzeSource('fixture', source, { trapOnly: true }).findings.map(f => f.kind).sort().join(',');
check('Detektor MEMBEBASKAN require socket yang hanya memasang jerat', trapKinds(FIXTURES.amanJeratSaja) === '', trapKinds(FIXTURES.amanJeratSaja) || '(kosong)');
check('Detektor tetap menangkap PANGGILAN socket walau jerat dipasang', trapKinds(FIXTURES.bocorJeratTapiMemanggil).includes('socketCall'), trapKinds(FIXTURES.bocorJeratTapiMemanggil) || '(kosong)');
check('Kelonggaran jerat TIDAK berlaku tanpa penugasan jerat', kinds(FIXTURES.bocorHttpRequest).includes('socketRequire'), kinds(FIXTURES.bocorHttpRequest) || '(kosong)');

check('Detektor menangkap penyuntikan eksplisit dari globalThis', kinds(FIXTURES.bocorEksplisitGlobal).includes('vmFetchLeak'), kinds(FIXTURES.bocorEksplisitGlobal) || '(kosong)');

/* =======================================================================================
 * 2. Pemindaian repo yang sesungguhnya
 * ===================================================================================== */
const SELF = path.basename(__filename);
const files = fs.readdirSync(root).filter(f => /-(test|audit|selftest)\.js$/.test(f)).sort();
check('Pemindaian menemukan seluruh gerbang (kalau nol, pemindainya rusak)', files.length >= 100, `files=${files.length}`);

// Berkas ini SENDIRI memuat contoh pelanggaran di dalam FIXTURES — itu memang tugasnya.
// Alih-alih memberi dirinya pengecualian buta, ia memindai dirinya sendiri dengan blok
// FIXTURES dipotong lebih dulu: kalau suatu hari ada `fetch(` nyata di luar fixture,
// gerbang ini menghukum dirinya sendiri.
const selfSource = fs.readFileSync(__filename, 'utf8');
const fixturesStart = selfSource.indexOf('const FIXTURES = {');
const fixturesEnd = selfSource.indexOf('\n};', fixturesStart);
check('Blok FIXTURES gerbang ini bisa dipotong untuk pemindaian-diri', fixturesStart > 0 && fixturesEnd > fixturesStart, `start=${fixturesStart} end=${fixturesEnd}`);
const selfWithoutFixtures = fixturesStart > 0 && fixturesEnd > fixturesStart
  ? selfSource.slice(0, fixturesStart) + selfSource.slice(fixturesEnd)
  : selfSource;
const selfFindings = analyzeSource(SELF, selfWithoutFixtures).findings;
check('Gerbang ini sendiri tidak menyentuh jaringan di luar fixture-nya', selfFindings.length === 0,
  selfFindings.map(f => `${f.kind}@${f.line}`).join(', ') || '0');

const offenders = [];
const shadowSafe = [];
const allowlistProblems = [];
for (const file of files) {
  if (file === SELF) continue; // sudah diperiksa di atas, dengan fixture dipotong
  const allowSocket = SOCKET_ALLOWLIST.has(file);
  const trapOnly = TRAP_ONLY_ALLOWLIST.has(file);
  const raw = fs.readFileSync(path.join(root, file), 'utf8');
  const result = analyzeSource(file, raw, { allowSocket, trapOnly });
  if (trapOnly && !result.trapInstalled) allowlistProblems.push(file + ' ada di daftar jerat tetapi tidak memasang jerat request/get');
  offenders.push(...result.findings);
  if (result.injects && result.hasLocalFetchMock && result.findings.length === 0) shadowSafe.push(file);
  if (allowSocket && !result.loopbackProven) allowlistProblems.push(file + ' tidak membuktikan loopback');
  if (allowSocket && !/require\(\s*['"](?:node:)?(?:https?|net|tls)['"]\s*\)/.test(stripComments(raw))) {
    allowlistProblems.push(file + ' ada di allowlist tetapi tidak lagi butuh socket — keluarkan dari daftar');
  }
}
const byKind = kind => offenders.filter(o => o.kind === kind).map(o => `${o.file}:${o.line} ${o.detail}`);

check('Tak ada gerbang non-allowlist yang me-require socket', byKind('socketRequire').length === 0, byKind('socketRequire').join(' | ') || '0');
check('Tak ada gerbang non-allowlist yang memanggil http.request/net.connect/tls.connect', byKind('socketCall').length === 0, byKind('socketCall').join(' | ') || '0');
check('Tak ada gerbang non-allowlist yang membuka WebSocket', byKind('webSocket').length === 0, byKind('webSocket').join(' | ') || '0');
check('Tak ada fetch( ke URL literal non-loopback', byKind('literalRemoteFetch').length === 0, byKind('literalRemoteFetch').join(' | ') || '0');
check('Tak ada gerbang yang men-spawn alat jaringan (curl/wget/nc/ssh)', byKind('netTool').length === 0, byKind('netTool').join(' | ') || '0');
check('Tak ada `fetch` global asli yang disuntikkan ke konteks vm', byKind('vmFetchLeak').length === 0, byKind('vmFetchLeak').join(' | ') || '0');
check('Tak ada mock `fetch` yang meneruskan ke fetch global', byKind('mockDelegatesToReal').length === 0, byKind('mockDelegatesToReal').join(' | ') || '0');
check('Tak ada gerbang yang meneruskan `fetch` global sebagai nilai di luar vm', byKind('bareFetchAlias').length === 0, byKind('bareFetchAlias').join(' | ') || '0');

// Pola mock-lokal harus tetap TERPAKAI, bukan hanya diizinkan. Kalau angka ini jatuh ke 0,
// artinya seseorang mengganti mock repo-file dengan sesuatu yang lain dan gerbang ini
// kehilangan alasan hidupnya — jadi ia harus bicara, bukan diam.
check('Pola mock-lokal masih dipakai gerbang existing (≥8 berkas, koreksi cf-b7 §5.0)',
  shadowSafe.length >= 8, `${shadowSafe.length} berkas: ${shadowSafe.join(', ')}`);
check('Setiap berkas allowlist benar-benar loopback dan masih benar-benar butuh socket',
  allowlistProblems.length === 0, allowlistProblems.join(' | ') || '0');
// Jumlahnya di-assert supaya penambahan nama tidak bisa menyelinap: 4 = tiga nama lama
// ditambah `e2e-bridge-selftest.js` (paket A5, alasannya di header berkas ini). Menaikkan
// angka ini tanpa menulis alasannya di header adalah pelonggaran, bukan keputusan.
check('Allowlist tetap empat nama dan semuanya ada di repo',
  SOCKET_ALLOWLIST.size === 4 && [...SOCKET_ALLOWLIST].every(f => fs.existsSync(path.join(root, f))),
  [...SOCKET_ALLOWLIST].join(', '));
// Cakupan pemindaian ikut di-assert: kalau pola berkas dipersempit lagi, berkas
// `*-selftest.js` akan kembali lolos karena namanya, dan allowlist di atas menjadi hiasan.
check('Pemindaian mencakup berkas *-selftest.js (bukan hanya *-test.js/*-audit.js)',
  files.includes('cf-live-selftest.js') && files.includes('e2e-bridge-selftest.js'),
  files.filter(f => /-selftest\.js$/.test(f)).join(', ') || '(tidak ada)');
check('Daftar jerat tetap satu nama, ada di repo, dan tidak tumpang-tindih dengan allowlist socket',
  TRAP_ONLY_ALLOWLIST.size === 1
  && [...TRAP_ONLY_ALLOWLIST].every(f => fs.existsSync(path.join(root, f)))
  && [...TRAP_ONLY_ALLOWLIST].every(f => !SOCKET_ALLOWLIST.has(f)),
  [...TRAP_ONLY_ALLOWLIST].join(', '));

/* =======================================================================================
 * 2b. Kelas gerbang "live" ber-env: syaratnya diperiksa, bukan dipercaya
 * ===================================================================================== */
const liveProblems = [];
for (const [file, envVar] of ENV_GATED_LIVE_ALLOWLIST) {
  const abs = path.join(root, file);
  if (!fs.existsSync(abs)) { liveProblems.push(file + ' terdaftar tapi tidak ada di repo'); continue; }
  const raw = fs.readFileSync(abs, 'utf8');
  const code = stripComments(raw);
  if (!code.includes(envVar)) liveProblems.push(file + ' tidak membaca ' + envVar);
  // URL remote sebagai NILAI BAWAAN (`env.X || 'https://…'`) dilarang: itu yang mengubah
  // "SKIP di CI" menjadi "tembak produksi di setiap push".
  if (/\|\|\s*['"`]https?:\/\//.test(code)) liveProblems.push(file + ' punya URL remote sebagai nilai bawaan');
  if (SOCKET_ALLOWLIST.has(file) || TRAP_ONLY_ALLOWLIST.has(file)) {
    liveProblems.push(file + ' tidak boleh berada di dua kelas allowlist sekaligus');
  }
  // Ia harus benar-benar exit 0 tanpa env — dan itu diperiksa dengan MENJALANKANNYA,
  // bukan dengan membaca janji di komentarnya. `cf-live-selftest.js` menguji hal yang
  // sama lebih dalam; di sini cukup satu bukti murah supaya klaim "tidak memerahkan CI"
  // tidak hanya tertulis.
  const probe = require('child_process').spawnSync(process.execPath, [abs], {
    cwd: root,
    encoding: 'utf8',
    timeout: 30000,
    env: Object.assign({}, process.env, { [envVar]: '' })
  });
  if (probe.status !== 0) liveProblems.push(file + ' tidak exit 0 tanpa ' + envVar + ' (exit=' + probe.status + ')');
  if (!/SKIP/.test(String(probe.stdout || ''))) liveProblems.push(file + ' tidak mencetak label SKIP tanpa ' + envVar);
}
check('Gerbang live ber-env memenuhi syaratnya (baca env, SKIP bersih, tanpa URL bawaan)',
  liveProblems.length === 0, liveProblems.join(' | ') || '0');
check('Kelas live ber-env tetap dua nama dan terdaftar di quality.yml sebagai langkah SKIP',
  ENV_GATED_LIVE_ALLOWLIST.size === 2, [...ENV_GATED_LIVE_ALLOWLIST].map(([f, e]) => f + ' (' + e + ')').join(', '));
// Catatan jujur, bukan assert: pemindai teks di berkas ini TIDAK bisa membedakan
// `fetch(variabel)` yang menembak produksi dari yang menembak loopback. Kelas di atas
// menutup celah itu dengan pendaftaran eksplisit + probe SKIP, bukan dengan deteksi.
// Deteksi sungguhan tetap menunggu lapis 3 (lihat catatan di bawah).
notes.push('Kelas ENV_GATED_LIVE_ALLOWLIST ada karena pemindai teks tidak bisa melihat '
  + '`fetch(<variabel>)`; anggotanya didaftarkan dan diprobe, bukan dideteksi.');

/* =======================================================================================
 * 2c. Gerbang E2E browser di tools/ — TIDAK dipindai berkasnya, jadi diperiksa perilakunya
 * =====================================================================================
 * `tools/fiezel-e2e-bridge.mjs` menembak jembatan HIDUP dengan Chromium sungguhan. Ia lolos
 * seluruh pemindaian di atas karena dua alasan yang sama-sama kebetulan: ia ada di `tools/`
 * (bukan akar repo) dan berakhiran `.mjs` (bukan `-test.js`). "Lolos karena lokasi dan
 * ekstensi" adalah kebalikan dari daftar yang disengaja, jadi berkas itu diperiksa di sini
 * dengan syarat yang DIJALANKAN, bukan dipercaya.
 */
const E2E_GATE = 'tools/fiezel-e2e-bridge.mjs';
const E2E_ENV_VAR = 'FIEZEL_E2E_BRIDGE_BASE';
const E2E_SELFTEST = 'e2e-bridge-selftest.js';
const e2eProblems = [];
{
  const abs = path.join(root, E2E_GATE);
  if (!fs.existsSync(abs)) {
    e2eProblems.push(E2E_GATE + ' tidak ada di repo');
  } else {
    const code = stripComments(fs.readFileSync(abs, 'utf8'));
    if (!code.includes(E2E_ENV_VAR)) e2eProblems.push(E2E_GATE + ' tidak membaca ' + E2E_ENV_VAR);
    // Satu URL remote bawaan sudah cukup mengubah "SKIP di CI" menjadi "tembak produksi".
    if (/\|\|\s*['"`]https?:\/\//.test(code)) e2eProblems.push(E2E_GATE + ' punya URL remote sebagai nilai bawaan');
    const probe = require('child_process').spawnSync(process.execPath, [abs], {
      cwd: root,
      encoding: 'utf8',
      timeout: 60000,
      env: Object.assign({}, process.env, { [E2E_ENV_VAR]: '' })
    });
    if (probe.status !== 0) e2eProblems.push(E2E_GATE + ' tidak exit 0 tanpa ' + E2E_ENV_VAR + ' (exit=' + probe.status + ')');
    if (!/SKIP/.test(String(probe.stdout || ''))) e2eProblems.push(E2E_GATE + ' tidak mencetak label SKIP tanpa ' + E2E_ENV_VAR);
  }
}
check('Gerbang E2E browser memenuhi syarat env-gated (baca env, SKIP bersih, tanpa URL bawaan)',
  e2eProblems.length === 0, e2eProblems.join(' | ') || '0');

/* =======================================================================================
 * 2d. Pembukti AI live di tools/ — sama kelasnya dengan 2c, dan LEBIH mahal
 * =====================================================================================
 * `tools/ai-live-verify.mjs` menembak `POST /api/ai/task` di Worker HIDUP dan setiap tipe
 * task adalah SATU panggilan model sungguhan. Ia lolos seluruh pemindaian di atas karena
 * alasan kebetulan yang sama dengan 2c (ada di `tools/`, berakhiran `.mjs`), jadi ia juga
 * diperiksa dengan syarat yang DIJALANKAN.
 *
 * Bedanya dari 2c bukan gaya, tapi akibat: kalau berkas ini bocor ke jalur per-push, setiap
 * commit siapa pun membelanjakan jatah neuron AKUN Cloudflare (10.000/hari untuk SELURUH
 * akun) dan menghabiskan kuota harian sebuah identitas murid. Karena itu dua hal di-assert
 * bersamaan di bawah: ia SKIP bersih tanpa env, DAN di `quality.yml` ia hanya ada sebagai
 * langkah `workflow_dispatch` bergerbang aktor.
 */
const AI_LIVE_GATE = 'tools/ai-live-verify.mjs';
const AI_LIVE_ENV_VAR = 'FIEZEL_AI_LIVE_BASE';
const aiLiveProblems = [];
{
  const abs = path.join(root, AI_LIVE_GATE);
  if (!fs.existsSync(abs)) {
    aiLiveProblems.push(AI_LIVE_GATE + ' tidak ada di repo');
  } else {
    const code = stripComments(fs.readFileSync(abs, 'utf8'));
    if (!code.includes(AI_LIVE_ENV_VAR)) aiLiveProblems.push(AI_LIVE_GATE + ' tidak membaca ' + AI_LIVE_ENV_VAR);
    if (/\|\|\s*['"`]https?:\/\//.test(code)) aiLiveProblems.push(AI_LIVE_GATE + ' punya URL remote sebagai nilai bawaan');
    const probe = require('child_process').spawnSync(process.execPath, [abs], {
      cwd: root,
      encoding: 'utf8',
      timeout: 30000,
      env: Object.assign({}, process.env, { [AI_LIVE_ENV_VAR]: '' })
    });
    if (probe.status !== 0) aiLiveProblems.push(AI_LIVE_GATE + ' tidak exit 0 tanpa ' + AI_LIVE_ENV_VAR + ' (exit=' + probe.status + ')');
    if (!/SKIP/.test(String(probe.stdout || ''))) aiLiveProblems.push(AI_LIVE_GATE + ' tidak mencetak label SKIP tanpa ' + AI_LIVE_ENV_VAR);
    // SKIP wajib jujur: exit 0 dengan `pass:null`, bukan `pass:true`. Alat berbayar yang
    // melaporkan dirinya LULUS tanpa pernah memanggil apa pun adalah cara termudah
    // membangun kepercayaan palsu pada "AI sudah terbukti hidup".
    if (/"pass"\s*:\s*true/.test(String(probe.stdout || ''))) {
      aiLiveProblems.push(AI_LIVE_GATE + ' mengaku pass saat SKIP');
    }
  }
}
check('Pembukti AI live memenuhi syarat env-gated (baca env, SKIP bersih, tanpa URL bawaan)',
  aiLiveProblems.length === 0, aiLiveProblems.join(' | ') || '0');

// Catatan jujur: pemindaian berkas di atas tidak menjangkau `tools/**`. Blok 2c dan 2d
// menutup DUA berkas di sana yang memang menembak jaringan atas kehendak sendiri.
/* =======================================================================================
 * 3. Gerbang ini terdaftar di CI
 * ===================================================================================== */
const workflow = fs.readFileSync(path.join(root, '.github/workflows/quality.yml'), 'utf8');
check('Gerbang ini terdaftar di quality.yml', workflow.includes('node no-network-test.js'), 'quality.yml');
// Pilihan yang disengaja dan karena itu di-assert dua arah: self-test-nya WAJIB ada di CI
// (kalau tidak, gerbang E2E-nya tidak pernah dibuktikan bisa merah), dan gerbang E2E-nya
// WAJIB TIDAK ada di CI (kalau ada, setiap push menembak jembatan produksi dengan browser).
check('Self-test E2E browser terdaftar di quality.yml, gerbang live browser-nya TIDAK',
  workflow.includes('node ' + E2E_SELFTEST) && !workflow.includes('node ' + E2E_GATE),
  'selftest=' + workflow.includes('node ' + E2E_SELFTEST) + ' gerbangLive=' + workflow.includes('node ' + E2E_GATE));
check('Gerbang live dan self-test-nya terdaftar di quality.yml',
  workflow.includes('node cf-live-contract-test.js') && workflow.includes('node cf-live-selftest.js'),
  'quality.yml');
// Pembukti AI live BOLEH ada di quality.yml, tapi HANYA di dalam langkah bergerbang aktor +
// `workflow_dispatch`. Diperiksa di sumber: potongan langkah yang memanggilnya wajib membawa
// `if:` itu. `workflow-actor-gate-test.js` cek (H) memeriksa hal yang sama dari sisi lain,
// jadi mencabut gerbangnya memerahkan dua gerbang, bukan satu.
{
  const langkah = workflow.split(/^      - name: /m).slice(1)
    .filter((blok) => blok.includes('node ' + AI_LIVE_GATE));
  const bergerbang = langkah.filter((blok) =>
    /if:\s*github\.event_name\s*==\s*'workflow_dispatch'\s*&&\s*github\.actor\s*==/.test(blok));
  check('Pembukti AI live hanya jalan lewat workflow_dispatch bergerbang aktor (bukan tiap push)',
    langkah.length === 1 && bergerbang.length === 1,
    'langkah=' + langkah.length + ' bergerbang=' + bergerbang.length);
}
// F5: dua assert di bawah ini DULU memeriksa kalimat komentar literal ("SKIP sampai owner
// menyetel base URL") sebagai bukti bahwa langkah live mati secara bawaan. Itu proksi yang
// lemah dari dua arah: komentar bisa benar sementara mekanismenya salah (dan memang begitu
// keadaannya — `quality.yml` tidak meneruskan env-nya sama sekali, temuan
// reports/add-a10-kepatuhan.md §5.1), dan mekanismenya bisa benar sementara kalimatnya
// diubah. Sekarang yang di-assert adalah MEKANISMENYA: env live datang dari input
// `workflow_dispatch` (yang pada push/PR bernilai kosong = SKIP) dan TIDAK PERNAH dari URL
// yang dipaku di dalam workflow. Bentuk step-nya sendiri (nama menyebut SKIP, alasan
// dicetak, gerbang live tidak dihitung sebagai bukti) dijaga `gate-registry-test.js`.
for (const [label, envVar, inputName] of [
  ['live', LIVE_ENV_VAR, 'cf_live_base'],
  ['staging', STAGING_ENV_VAR, 'staging_base']
]) {
  const problems = [];
  if (!new RegExp(`${envVar}\\s*:`).test(workflow)) problems.push(`${envVar} tidak diteruskan lewat env: di quality.yml`);
  if (new RegExp(`${envVar}\\s*:\\s*['"\`]?https?://`).test(workflow)) {
    problems.push(`${envVar} punya URL remote yang dipaku di workflow — itu mengubah CI publik menjadi penembak produksi setiap push`);
  }
  if (!/workflow_dispatch\s*:/.test(workflow)) problems.push('quality.yml tidak punya workflow_dispatch, jadi tidak ada cara SENGAJA menjalankan gerbang live');
  if (!new RegExp(`${envVar}\\s*:\\s*\\$\\{\\{\\s*github\\.event\\.inputs\\.${inputName}\\s*\\}\\}`).test(workflow)) {
    problems.push(`${envVar} tidak terikat ke input workflow_dispatch \`${inputName}\` — tanpa itu "SKIP secara bawaan" tidak punya mekanisme, hanya janji`);
  }
  check(`Env gerbang ${label} datang dari input workflow_dispatch, bukan URL yang dipaku (SKIP secara bawaan pada push/PR)`,
    problems.length === 0, problems.join(' | ') || `${envVar} <- github.event.inputs.${inputName}`);
}
check('Gerbang staging live terdaftar di quality.yml', workflow.includes('node staging-live-test.js'), 'quality.yml');

// CATATAN JUJUR, bukan assert: lapis 1 (berkas ini) hanya membaca TEKS. Panggilan jaringan
// yang dibangun secara dinamis lolos darinya. Penahan sesungguhnya adalah lapis 3 —
// `tools/no-net-preload.js` dipasang lewat `NODE_OPTIONS: --require` pada step Core
// validation (cf-b7 §5.3). Berkas preload itu BELUM dibuat pada paket kerja ini dan
// memasangnya mengubah perilaku 101 gerbang sekaligus, jadi ia tidak boleh diselundupkan
// ke sini. Statusnya dilaporkan apa adanya supaya tidak ada yang menyangka lapis 3 aktif.
const layer3Installed = fs.existsSync(path.join(root, 'tools/no-net-preload.js'))
  && /NODE_OPTIONS:\s*--require\s+\.\/tools\/no-net-preload\.js/.test(workflow);
notes.push(layer3Installed
  ? 'Lapis 3 (tools/no-net-preload.js via NODE_OPTIONS) AKTIF.'
  : 'Lapis 3 (tools/no-net-preload.js via NODE_OPTIONS) BELUM dipasang — gerbang ini hanya memindai teks. Lihat cf-b7 §5.3.');

/* ===================================================================================== */
const report = {
  schema: 'fiezel-no-network-v1',
  pass: !failed,
  scanned: files.length,
  allowlist: [...SOCKET_ALLOWLIST],
  shadowSafeGates: shadowSafe,
  layer3Installed,
  notes,
  counts: { pass: checks.filter(c => c.status === 'PASS').length, fail: checks.filter(c => c.status === 'FAIL').length },
  checks
};
fs.writeFileSync(path.join(root, 'NO-NETWORK-REPORT.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
console.log(failed
  ? `FIEZEL no-network gate: FAIL (${report.counts.fail} dari ${report.counts.pass + report.counts.fail})`
  : `FIEZEL no-network gate: PASS (${report.counts.pass} assert, ${files.length} gerbang dipindai)`);
if (failed) process.exitCode = 1;
