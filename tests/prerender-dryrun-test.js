const __fzRoot = require('path').join(__dirname, '..'); /* m025-254: berkas ini pindah dari root ke tests/. __dirname dulu BERARTI root repo, dan puluhan gerbang memakainya untuk menunjuk berkas produksi - alias ini menjaga makna itu tetap benar tanpa menyunting setiap pemakaian. */
// E5 — gerbang pipeline pra-render (tools/prerender-tts.mjs + audio-prerender-cf.yml).
//
// Dua hal dijaga di sini, dan keduanya soal uang nyata.
//
// PERTAMA, angka korpus. Seluruh keputusan pra-render bersandar pada satu bilangan: 605.071
// karakter kanonik ⇒ US$9,07 sekali bayar untuk menghapus ~99% biaya TTS runtime. cf-b4 dan
// cf-a10 mewarisi angka lama 591.898 dari draf awal; cf-c1 §K1 mengoreksinya. Kalau angka itu
// bergeser tanpa ada yang sadar, keputusan "bayar sekali" dibuat di atas anggaran yang salah.
// Gerbang ini menghitungnya ulang dari bank, bukan mengutip laporan.
//
// KEDUA, dry-run yang benar-benar kering. Rencana dijalankan di CI pada setiap dispatch,
// termasuk oleh orang yang hanya ingin melihat ongkosnya. Kalau ia bisa memanggil jaringan,
// "dry-run" adalah tagihan.
const fs = require('fs');
const path = require('path');

const root = __fzRoot;
const checks = [];
let failed = false;
const check = (name, ok, details) => {
  checks.push({ name, status: ok ? 'PASS' : 'FAIL', details: String(details == null ? '' : details) });
  if (!ok) failed = true;
};

// Jaring jaringan dipasang SEBELUM modul diimpor: satu fetch pada saat impor pun tertangkap.
const netCalls = [];
const trap = (label) => (...args) => {
  netCalls.push(label + ' ' + String(args[0]).slice(0, 120));
  throw new Error('prerender dry-run menyentuh jaringan: ' + label);
};
globalThis.fetch = trap('fetch');
try {
  const https = require('https');
  const http = require('http');
  https.request = trap('https.request');
  https.get = trap('https.get');
  http.request = trap('http.request');
  http.get = trap('http.get');
} catch (_) { /* modul inti selalu ada; kalaupun tidak, fetch sudah dijerat */ }

(async () => {
  const mod = await import('../tools/prerender-tts.mjs');
  const TtsKey = require(path.join(root, 'workers/api/tts/tts-key.js'));

  // --- 1. ANGKA KANONIK 605.071 -------------------------------------------------------
  const CANON = mod.CANONICAL;
  check('Konstanta korpus kanonik = 645.330 karakter', CANON.totalChars === 645330, String(CANON.totalChars));

  const census = mod.censusCorpus({ content: 'all' });
  const drift = Math.abs(census.totalChars - 645330) / 645330;
  check('Korpus terukur dari bank cocok 645.330 ±1%',
    drift <= 0.01, `${census.totalChars} karakter (selisih ${(drift * 100).toFixed(3)}%)`);
  check('Korpus terukur cocok EKSAK dengan konstanta (bukan sekadar dalam toleransi)',
    census.totalChars === CANON.totalChars, `${census.totalChars} vs ${CANON.totalChars}`);

  const DOMAINS = { listening: 414888, book: 101749, vocabulary_word: 18065, vocabulary_example: 110628 };
  for (const [domain, expected] of Object.entries(DOMAINS)) {
    const got = (census.byDomain[domain] || {}).chars || 0;
    check(`Domain ${domain} = ${expected} karakter ±1%`,
      Math.abs(got - expected) / expected <= 0.01, `${got} karakter`);
  }
  check('Empat domain berjumlah tepat total (tidak ada konten yang hilang dihitung)',
    Object.values(census.byDomain).reduce((a, d) => a + d.chars, 0) === census.totalChars &&
    Object.keys(census.byDomain).length === 4,
    Object.keys(census.byDomain).join(','));
  check('Angka 591.898 yang salah dari cf-b4/cf-a10 tidak dipakai lagi',
    census.totalChars !== 591898 && CANON.totalChars !== 591898, 'cf-c1 §K1 yang berlaku');

  // --- 2. BIAYA DAN JATAH GRATIS ------------------------------------------------------
  const cost = census.totalChars * 0.015 / 1000;
  check('Biaya sekali render ≈US$9,68 (bukan US$9,07 dari korpus lama)',
    Math.abs(census.costUsd - cost) < 0.01 && Math.abs(census.costUsd - 9.68) < 0.05,
    'US$' + census.costUsd.toFixed(2));
  check('Ukuran R2 diestimasi dan masih di dalam free tier 10 GB',
    census.estimatedBytes / 1e9 < 10, (census.estimatedBytes / 1e9).toFixed(2) + ' GB');

  // Jatah gratis Workers AI 10.000 neuron/hari berlaku untuk SELURUH akun, bukan per fitur.
  // Pra-render korpus butuh ~825.000 neuron; itu puluhan hari kalau menunggu jatah. Fakta ini
  // harus muncul di angka, bukan di catatan kaki.
  check('Jatah 10.000 neuron/hari dipaku dan dilaporkan',
    CANON.freeNeuronsPerDay === 10000, String(CANON.freeNeuronsPerDay));
  check('Kebutuhan neuron pra-render dihitung dan jauh melampaui satu hari gratis',
    census.estimatedNeurons > 100000 && census.freeDaysNeeded > 30,
    `${Math.round(census.estimatedNeurons)} neuron = ${census.freeDaysNeeded} hari jatah gratis`);

  // --- 3. NOL JARINGAN ----------------------------------------------------------------
  const plan = mod.buildPlan({ content: 'all' });
  const corpus = mod.collectCorpus({ content: 'all' });
  mod.censusCorpus({ content: 'listening' });
  mod.collectCorpus({ content: 'vocabulary' });
  check('Rencana penuh dijalankan tanpa satu permintaan jaringan',
    netCalls.length === 0, netCalls.length ? netCalls.join(' | ') : 'nol panggilan');

  const src = fs.readFileSync(path.join(root, 'tools/prerender-tts.mjs'), 'utf8');
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  // Batas fungsi = kurung tutup di kolom 0. Memotong sampai `export` berikutnya akan menyeret
  // helper R2 yang berada di antaranya dan membuat gerbang ini menuduh fungsi yang bersih.
  const fnBody = (name) => {
    const at = code.indexOf('export function ' + name);
    if (at < 0) return '';
    const slice = code.slice(at);
    const m = slice.match(/\r?\n\}\r?\n/);
    return m ? slice.slice(0, m.index + m[0].length) : slice;
  };
  const planFns = ['collectCorpus', 'censusCorpus', 'buildPlan', 'loadManifest'];
  check('Fungsi jalur rencana tidak memuat satu pun fetch/R2/AI di kodenya',
    planFns.every((fn) => fnBody(fn).length > 40 && !/\bfetch\(/.test(fnBody(fn))),
    planFns.join(','));
  const fetchSites = (code.match(/\bfetch\(/g) || []).length;
  check('fetch hanya hidup di helper R2/AI, dan helper itu hanya dipanggil di belakang --apply',
    fetchSites > 0 && /options\.apply|apply\b/.test(code) &&
    !/\bfetch\(/.test(fnBody('buildPlan')), fetchSites + ' titik fetch di luar jalur rencana');
  check('Modul aman diimpor (main tidak jalan sendiri saat di-require)',
    /process\.argv\[1\]/.test(code), 'main dijaga argv[1]');

  // --- 4. RENCANA: kunci v2, dedup, kepatuhan anggaran --------------------------------
  check('Setiap aset yang direncanakan punya kunci 64-hex + nama objek yang sah',
    plan.pending.length > 1000 &&
    plan.pending.every((r) => /^[0-9a-f]{64}$/.test(r.audioKey) && TtsKey.isValidObjectName(r.objectName)),
    String(plan.pending.length) + ' aset');
  check('Kunci rencana dihitung dengan modul kunci v2 yang sama dengan runtime',
    (() => {
      const row = plan.pending.find((r) => r.domain === 'book') || plan.pending[0];
      return TtsKey.build({
        text: row.text, locale: mod.ENGINE.locale, voiceId: mod.ENGINE.voiceId,
        engineId: mod.ENGINE.id, engineVersion: mod.ENGINE.engineVersion,
        contentType: row.contentType, settings: mod.ENGINE.settings
      }).audioKey === row.audioKey;
    })(), 'satu implementasi, bukan dua');

  check('Teks identik antar-domain dibayar SEKALI (dedup nyata, bukan niat)',
    plan.uniqueKeys < plan.rows && plan.duplicates > 0 && plan.rows === corpus.length,
    `${plan.rows} baris ⇒ ${plan.uniqueKeys} objek berbayar (${plan.duplicates} duplikat dihapus)`);
  check('Biaya rencana dihitung dari kunci unik yang BELUM ada, bukan dari total korpus',
    plan.plannedCostUsd <= census.costUsd + 0.001, `US$${plan.plannedCostUsd.toFixed(2)} ≤ US$${census.costUsd.toFixed(2)}`);

  const limited = mod.buildPlan({ content: 'all', limit: 50 });
  check('limit menahan jumlah aset sekali jalan (bertahap, bukan sembilan dolar sekali tekan)',
    limited.pending.length === 50, String(limited.pending.length));
  const bookRows = corpus.filter((r) => r.domain === 'book');
  const someBookId = (corpus.find((r) => r.domain === 'book') || {}).bookId;
  const oneBook = mod.buildPlan({ content: 'book', bookId: someBookId });
  check('book_id menyempitkan rencana ke satu buku',
    oneBook.rows > 0 && oneBook.rows < bookRows.length, `${oneBook.rows} kalimat dari ${bookRows.length}`);
  const perDomain = mod.collectCorpus({ content: 'listening' });
  check('content menyaring domain',
    perDomain.length > 0 && perDomain.every((r) => r.domain === 'listening'), 'listening saja');

  // --- 5. MANIFEST --------------------------------------------------------------------
  check('Manifest pra-render TERPISAH dari audio/manifest.json milik pipeline ElevenLabs',
    /audio[\/\\]manifest-tts-v2\.json$/.test(mod.MANIFEST_PATH) &&
    !/audio[\/\\]manifest\.json$/.test(mod.MANIFEST_PATH), path.basename(mod.MANIFEST_PATH));
  check('Manifest ElevenLabs lama tidak dijadikan target tulis',
    !fs.readFileSync(path.join(root, 'tools/prerender-tts.mjs'), 'utf8').includes("'audio/manifest.json'"),
    'dua katalog terpisah');
  check('Kunci yang sudah ada dilewati, bukan dirender ulang',
    plan.ready + plan.pending.length === plan.uniqueKeys,
    `${plan.ready} siap + ${plan.pending.length} belum ada = ${plan.uniqueKeys}`);

  // --- 6. WORKFLOW: gate aktor, APPLY, dry-run bawaan ---------------------------------
  const wfPath = path.join(root, '.github/workflows/audio-prerender-cf.yml');
  check('Workflow pra-render ada', fs.existsSync(wfPath), wfPath);
  const wf = fs.readFileSync(wfPath, 'utf8');
  check('Hanya workflow_dispatch (tidak ada push/schedule yang bisa membelanjakan uang sendiri)',
    /^on:\s*$/m.test(wf) && /workflow_dispatch:/.test(wf) && !/^\s{2}(push|schedule|pull_request):/m.test(wf),
    'hanya manual');
  check('Gate aktor github.actor == FIEZEL-APPS terpasang',
    /github\.actor\s*==\s*'FIEZEL-APPS'/.test(wf), 'owner saja');
  check('Input apply bawaan KOSONG (dry-run adalah keadaan bawaan)',
    /apply:[\s\S]{0,220}default:\s*''/.test(wf), "default ''");
  check('Produksi hanya jalan bila apply == APPLY',
    /if:\s*\$\{\{\s*inputs\.apply\s*==\s*'APPLY'\s*\}\}/.test(wf), "inputs.apply == 'APPLY'");
  check('Langkah rencana berjalan TANPA rahasia apa pun',
    (() => {
      const planStep = wf.slice(wf.indexOf('name: Rencana'), wf.indexOf('name: Produksi'));
      return !/secrets\./.test(planStep);
    })(), 'nol secrets di langkah rencana');
  check('Anggaran dolar per jalan dieja sebagai input',
    /budget_usd:/.test(wf) && /--budget-usd/.test(wf), 'budget_usd');
  check('Input pengguna lewat env, tidak ditanam ke dalam run (celah injeksi shell)',
    /CONTENT: \$\{\{ inputs\.content \}\}/.test(wf) && !/--content=\$\{\{/.test(wf), 'env, bukan interpolasi');
  check('Concurrency mencegah dua jalan membayar objek yang sama',
    /concurrency:/.test(wf) && /cancel-in-progress:\s*false/.test(wf), 'group tunggal');
  check('Gerbang kunci dijalankan sebelum apply',
    /node tests\/tts-key-test\.js/.test(wf), 'tts-key-test');
  check('audio-asset-pipeline-test dijalankan sebelum commit manifest',
    wf.indexOf('tests/audio-asset-pipeline-test.js') > 0 &&
    wf.indexOf('tests/audio-asset-pipeline-test.js') < wf.indexOf('git commit'), 'pemeriksaan rahasia dulu');
  check('Hanya manifest yang di-commit (biner tinggal di R2)',
    /git add audio\/manifest-tts-v2\.json/.test(wf) && !/git add -A/.test(wf), 'satu berkas');
  check('Workflow tidak menyentuh wrangler.toml maupun worker audio',
    !/wrangler\.toml/.test(wf) && !/fiezel-audio-worker/.test(wf), 'batas paket kerja dihormati');

  // --- 7. BATAS: berkas milik pipeline lama tidak disentuh ----------------------------
  for (const guarded of ['workers/fiezel-audio-worker.js', 'workers/wrangler.toml', 'tools/audio-batch-generate.mjs', '.github/workflows/audio-generate.yml']) {
    check(`${guarded} tetap ada dan tidak diganti`, fs.existsSync(path.join(root, guarded)), 'utuh');
  }
  check('Anggaran bawaan konservatif (US$1,00, bukan seluruh korpus sekali tekan)',
    /budget_usd:[\s\S]{0,220}default:\s*'1\.00'/.test(wf), "default '1.00'");

  const report = {
    status: failed ? 'NOT READY' : 'PASS',
    gate: 'prerender-dryrun-test',
    corpus: {
      totalChars: census.totalChars, byDomain: census.byDomain,
      costUsd: Number(census.costUsd.toFixed(2)),
      neurons: Math.round(census.estimatedNeurons), freeDaysNeeded: census.freeDaysNeeded,
      uniqueObjects: plan.uniqueKeys, duplicatesRemoved: plan.duplicates,
      plannedCostUsd: Number(plan.plannedCostUsd.toFixed(2))
    },
    network: { calls: netCalls.length },
    counts: { pass: checks.filter((c) => c.status === 'PASS').length, fail: checks.filter((c) => c.status === 'FAIL').length },
    checks
  };
  console.log(JSON.stringify(report, null, 2));
  if (failed) process.exitCode = 1;
})().catch((error) => { console.error(error); process.exitCode = 1; });
