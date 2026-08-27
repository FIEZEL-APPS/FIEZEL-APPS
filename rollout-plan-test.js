// rollout-plan-test.js — gerbang untuk `docs/CF-ROLLOUT-PLAN.md` + `tools/flag-plan-check.mjs`.
//
// KENAPA GERBANG INI ADA. Rencana rollout adalah dokumen yang paling mudah membusuk menjadi
// prosa yang enak dibaca tapi tidak bisa dieksekusi: "kalau bermasalah, batalkan" terbaca
// meyakinkan dan tidak berarti apa pun pada jam 11 malam. Jadi yang dijaga di sini bukan gaya
// bahasa, tapi empat hal yang bisa diperiksa mesin:
//
//   (1) TIAP langkah rilis (R1..R7) punya ambang batal berupa ANGKA + SATUAN, bukan kata sifat.
//   (2) Ada prosedur pembatalan yang menyebut batas waktu < 60 detik dan perintah nyatanya.
//   (3) Ada daftar PRASYARAT BELUM TERPENUHI yang menyebut item-item yang benar-benar belum
//       ada di repo hari ini (bukan daftar kosong yang lulus secara hampa).
//   (4) `tools/flag-plan-check.mjs` BENAR-BENAR mendeteksi tiga kombinasi berbahaya — diuji
//       dengan fixture yang dijalankan, bukan dengan mencocokkan teks — dan TIDAK PERNAH
//       menyentuh jaringan.
//
// ANTI-VAKUM. Butir (4) ikut menguji arah sebaliknya: keadaan repo hari ini (semua flag `off`)
// harus menghasilkan NOL temuan dan exit 0. Detektor yang selalu berbunyi sama tidak
// berbunyinya dengan detektor yang mati.
//
// NOL JARINGAN, NOL DEPENDENCY. Berkas ini tidak me-require modul socket, tidak memanggil
// `fetch`, dan tidak menjalankan alat jaringan apa pun. Ia hanya membaca berkas repo dan
// menjalankan `node tools/flag-plan-check.mjs` sebagai proses anak dengan stdin sintetis.
// Fixture ditulis ke direktori temporer OS (bukan ke working tree) dan dibersihkan sendiri.
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const root = __dirname;
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

const checks = [];
let failed = false;
const check = (name, ok, details) => {
  checks.push({ name, status: ok ? 'PASS' : 'FAIL', details: String(details) });
  if (!ok) failed = true;
};

const PLAN_PATH = 'docs/CF-ROLLOUT-PLAN.md';
const TOOL_REL = 'tools/flag-plan-check.mjs';

check('Rencana rollout ada di ' + PLAN_PATH, fs.existsSync(path.join(root, PLAN_PATH)), PLAN_PATH);
check('Alat kalkulator flag ada di ' + TOOL_REL, fs.existsSync(path.join(root, TOOL_REL)), TOOL_REL);
if (failed) {
  console.error('FIEZEL rollout-plan gate: FAIL (berkas wajib tidak ada)');
  process.exit(1);
}

const plan = read(PLAN_PATH);
const tool = read(TOOL_REL);
const workflow = read('.github/workflows/quality.yml');
const coreConfig = read('core-config.js');

check('Gerbang ini terdaftar di quality.yml', workflow.includes('node rollout-plan-test.js'), 'quality.yml');

/* =======================================================================================
 * 1. Urutan langkah: satu rilis per endpoint, tujuh endpoint, urut dari paling aman
 * ===================================================================================== */
// Ketujuh nama ini adalah kunci `FIEZEL_CF_CONFIG.endpoints` yang benar-benar ada di
// core-config.js; urutannya adalah urutan risiko yang diklaim rencana. Kalau seseorang
// menambah endpoint kedelapan ke core-config.js tanpa menambahkannya ke rencana, assert
// terakhir di blok ini yang menangkapnya.
const STEPS = [
  { id: 'R1', endpoint: 'health' },
  { id: 'R2', endpoint: 'config' },
  { id: 'R3', endpoint: 'usage' },
  { id: 'R4', endpoint: 'quota' },
  { id: 'R5', endpoint: 'auth' },
  { id: 'R6', endpoint: 'tts' },
  { id: 'R7', endpoint: 'ai' }
];

// ANGKA + SATUAN. Kata sifat ("terlalu tinggi", "kalau bermasalah") tidak cocok dengan pola ini,
// dan itu memang tujuannya. Satuan yang diterima ditulis lengkap supaya penambahan satuan baru
// menjadi keputusan sadar, bukan kelonggaran yang menyelinap.
const NUMBER_WITH_UNIT = /(?:\d[\d.,]*)\s*(?:%|ms|s\b|detik|menit|jam|hari|kali\b|byte|karakter|neuron|pasang|permintaan|sampel|klip|sesi|murid|baris|reservasi|panggilan|boot|tulis\/hari|request\/hari)/i;
const NUMBER_WITH_UNIT_G = new RegExp(NUMBER_WITH_UNIT.source, 'gi');

const stepSections = {};
for (let i = 0; i < STEPS.length; i += 1) {
  const step = STEPS[i];
  const startMarker = new RegExp(`^###\\s+${step.id}\\s+—`, 'm');
  const startMatch = startMarker.exec(plan);
  let section = '';
  if (startMatch) {
    const from = startMatch.index;
    // Batas bawah: heading `###` berikutnya, atau akhir dokumen.
    const rest = plan.slice(from + startMatch[0].length);
    const nextHeading = rest.search(/^###\s/m);
    section = nextHeading >= 0 ? rest.slice(0, nextHeading) : rest;
  }
  stepSections[step.id] = section;

  check(`${step.id}: bagian langkah ada di rencana`, Boolean(section), `panjang=${section.length}`);
  check(`${step.id}: menyebut endpoint yang dinyalakan (\`${step.endpoint}\`)`,
    section.includes(step.endpoint), step.endpoint);
  check(`${step.id}: menyebut SIAPA yang terkena`, /Siapa yang terkena/.test(section), 'Siapa yang terkena');
  check(`${step.id}: menyebut apa yang DIUKUR untuk memutuskan lanjut/batal`,
    /Yang diukur/.test(section), 'Yang diukur');

  const abortRow = (section.match(/\*\*Ambang BATAL[\s\S]*?(?=\n\| \*\*|\n\n|$)/) || [''])[0];
  check(`${step.id}: ada baris "Ambang BATAL"`, abortRow.length > 0, `panjang=${abortRow.length}`);
  const numbers = abortRow.match(NUMBER_WITH_UNIT_G) || [];
  // Tiga, bukan satu: satu ambang tunggal berarti satu cara gagal yang terpikirkan, dan
  // endpoint mana pun di sini punya lebih dari satu cara gagal (status, latensi, biaya).
  check(`${step.id}: ambang batal memuat ≥ 3 angka bersatuan (bukan kata sifat)`,
    numbers.length >= 3, `${numbers.length}: ${numbers.slice(0, 6).join(' | ')}`);
  check(`${step.id}: ambang batal tidak memakai frasa kabur`,
    !/kalau bermasalah|kalau ada masalah|jika terasa|sekiranya|terlalu (?:tinggi|banyak|lambat)(?!\s*\()/i.test(abortRow),
    abortRow.slice(0, 80));

  check(`${step.id}: ada prosedur pembatalan yang menyebut batas < 60 detik`,
    /Batal < 60 detik/.test(section) || /<\s*60\s*detik/.test(section), 'Batal < 60 detik');
  check(`${step.id}: pembatalannya menunjuk prosedur B-1/B-2 (satu perintah, tanpa deploy)`,
    /\bB-[12]\b/.test(section), (section.match(/\bB-[123]\b/g) || []).join(','));
}

// Urutan risiko harus benar-benar naik di dalam dokumen, bukan hanya diklaim di ringkasan.
const positions = STEPS.map(s => plan.indexOf(`### ${s.id} —`));
check('Urutan R1..R7 muncul menaik di dokumen (paling aman lebih dulu)',
  positions.every((p, i) => p > 0 && (i === 0 || p > positions[i - 1])), positions.join(','));
check('Ringkasan urutan menyebut ketujuh endpoint dalam satu baris',
  /R1 `?health`?[\s\S]{0,120}R7 `?ai`?/.test(plan), 'ringkasan urutan');

// Setiap kunci endpoint yang benar-benar ada di core-config.js harus punya langkahnya sendiri.
const endpointKeys = (coreConfig.match(/endpoints:Object\.freeze\(\{([^}]*)\}/) || ['', ''])[1]
  .split(',').map(pair => pair.split(':')[0].trim()).filter(Boolean);
check('core-config.js memuat tujuh kunci endpoint yang dikenal rencana',
  endpointKeys.length === STEPS.length && endpointKeys.every(k => STEPS.some(s => s.endpoint === k)),
  endpointKeys.join(','));

/* =======================================================================================
 * 2. Prosedur pembatalan < 60 detik, dengan perintah yang nyata
 * ===================================================================================== */
check('Ada prosedur B-1 (batalkan satu endpoint) dengan target < 60 detik',
  /\*\*B-1[\s\S]{0,400}?60 detik/.test(plan), 'B-1');
check('Ada prosedur B-2 (matikan SEMUA jalur CF) dengan target < 60 detik',
  /\*\*B-2[\s\S]{0,400}?60 detik/.test(plan), 'B-2');
check('Prosedur pembatalan memakai KV cfg:flags (bisa dibatalkan tanpa deploy ulang)',
  /kv key put[\s\S]{0,80}cfg:flags/.test(plan), 'wrangler kv key put cfg:flags');
check('Bentuk nilai KV yang benar ditulis apa adanya (flags + enabled)',
  /"flags"\s*:\s*\{/.test(plan) && /"enabled"\s*:\s*\{/.test(plan), 'flags/enabled');
check('Pembatalan diverifikasi dengan tools/flag-plan-check.mjs, bukan dengan asumsi',
  /flag-plan-check\.mjs/.test(plan), 'verifikasi');
check('Batas propagasi 60 detik dijelaskan berasal dari cacheTtl KV',
  /cacheTtl[\s\S]{0,120}60/.test(plan) || /60 s[\s\S]{0,80}cacheTtl/.test(plan), 'cacheTtl 60 s');

/* =======================================================================================
 * 3. Tahap bayangan: apa yang dibandingkan, berapa lama, berapa sampel, apa yang DILARANG
 * ===================================================================================== */
const shadowSection = (() => {
  const from = plan.indexOf('## 2. Tahap bayangan');
  if (from < 0) return '';
  const rest = plan.slice(from);
  const next = rest.slice(3).search(/^##\s/m);
  return next >= 0 ? rest.slice(0, next + 3) : rest;
})();
check('Ada bagian tahap bayangan', shadowSection.length > 500, `panjang=${shadowSection.length}`);
check('Bayangan: membandingkan STATUS HTTP', /[Ss]tatus HTTP/.test(shadowSection), 'status');
check('Bayangan: membandingkan BENTUK jawaban (bukan isinya)',
  /[Bb]entuk jawaban/.test(shadowSection) && /bukan isinya/i.test(shadowSection), 'bentuk');
check('Bayangan: membandingkan LATENSI dengan p95', /[Ll]atensi/.test(shadowSection) && /p95/.test(shadowSection), 'latensi p95');
check('Bayangan: durasi minimum dinyatakan dalam angka + satuan waktu',
  /\d+\s*(?:jam|hari)/.test(shadowSection), (shadowSection.match(/\d+\s*(?:jam|hari)/g) || []).slice(0, 5).join(','));
check('Bayangan: jumlah sampel minimum dinyatakan dalam angka',
  /\d[\d.,]*\s*pasang/.test(shadowSection), (shadowSection.match(/\d[\d.,]*\s*pasang/g) || []).slice(0, 5).join(','));
check('Bayangan: kesimpulan tidak sah sebelum durasi DAN sampel terpenuhi',
  /tidak sah/.test(shadowSection), 'kesimpulan tidak sah');
check('Bayangan: DILARANG membandingkan isi jawaban AI (nondeterministik = alarm palsu)',
  /TIDAK BOLEH DIBANDINGKAN|tidak boleh dibandingkan/.test(shadowSection)
  && /tidak deterministik|nondeterministik/i.test(shadowSection)
  && /alarm palsu/i.test(shadowSection), 'larangan isi AI');
check('Bayangan: byte audio TTS juga dikecualikan, yang dibandingkan kunci cache',
  /[Bb]yte audio/.test(shadowSection) && /kunci cache/.test(shadowSection), 'byte audio TTS');
check('Bayangan: stempel waktu/id server dikecualikan',
  /serverTime|[Ss]tempel waktu/.test(shadowSection), 'stempel waktu');
check('Bayangan: ambang lulus per hal yang dibandingkan berupa angka',
  (shadowSection.match(/[Aa]mbang lulus[^\n]*?\d/g) || []).length >= 3,
  String((shadowSection.match(/[Aa]mbang lulus[^\n]*?\d/g) || []).length));

/* =======================================================================================
 * 4. Prasyarat yang BELUM terpenuhi — daftar jujur, bukan daftar kosong
 * ===================================================================================== */
const prereqSection = (() => {
  const from = plan.indexOf('## 3. Prasyarat yang BELUM dipenuhi');
  if (from < 0) return '';
  const rest = plan.slice(from);
  const next = rest.slice(3).search(/^##\s/m);
  return next >= 0 ? rest.slice(0, next + 3) : rest;
})();
check('Ada bagian prasyarat yang BELUM dipenuhi', prereqSection.length > 500, `panjang=${prereqSection.length}`);

// Enam item yang WAJIB muncul karena keadaan repo hari ini memang begitu. Tiap pola diikuti
// pemeriksaan repo yang membuktikan item itu masih benar — kalau suatu hari prasyaratnya
// SELESAI, gerbang ini yang memaksa dokumennya diperbarui alih-alih membiarkannya berbohong.
const PREREQS = [
  {
    label: 'kuota 25/26 belum diuji di runtime nyata',
    pattern: /[Kk]uota 25\/26 belum diuji|25\/26 belum diuji/,
    stillTrue: () => read('workers/api/wrangler.toml').includes('AI_LIMIT_PER_DAY')
  },
  {
    label: 'cache TTS belum diuji di runtime nyata',
    pattern: /[Cc]ache TTS belum diuji/,
    stillTrue: () => fs.existsSync(path.join(root, 'workers/api/tts/route-tts.js'))
  },
  {
    label: 'cron belum terbukti berjalan',
    pattern: /cron belum terbukti|[Kk]edua cron belum/,
    stillTrue: () => read('workers/api/wrangler.toml').includes('[triggers]')
  },
  {
    label: 'Analytics Engine belum diaktifkan',
    pattern: /Analytics Engine belum diaktifkan/,
    stillTrue: () => /ANALYTICS_ENABLED\s*=\s*"off"/.test(read('workers/api/wrangler.toml'))
  },
  {
    label: 'workers/owner/wrangler.toml masih memuat blok route custom_domain',
    pattern: /workers\/owner\/wrangler\.toml[\s\S]{0,160}custom_domain/,
    stillTrue: () => /custom_domain\s*=\s*true/.test(read('workers/owner/wrangler.toml'))
  },
  {
    label: 'klien belum memuat modul telemetri bayangan di index.html/sw.js',
    pattern: /telemetri bayangan/,
    stillTrue: () => !/shadow/i.test(read('index.html')) && !/shadow/i.test(read('sw.js'))
  }
];
for (const item of PREREQS) {
  check(`Prasyarat disebut: ${item.label}`, item.pattern.test(prereqSection), item.label);
  check(`Prasyarat itu masih benar di repo (dokumen tidak basi): ${item.label}`, item.stillTrue() === true, 'verifikasi repo');
}
check('Setiap prasyarat menyebut langkah mana yang DIBLOKIRNYA',
  (prereqSection.match(/\bR[1-7]\b/g) || []).length >= 7, String((prereqSection.match(/\bR[1-7]\b/g) || []).length));

/* =======================================================================================
 * 5. Aturan yang mengikat: penyalaan lewat KV, bukan lewat core-config.js
 * ===================================================================================== */
check('Aturan: main auto-deploy tiap 5 menit disebut sebagai alasan aturannya',
  /auto-deploy[\s\S]{0,60}5 menit|tiap 5 menit/.test(plan), 'auto-deploy 5 menit');
check('Aturan: DILARANG menyalakan/mematikan dengan mengedit core-config.js',
  /DILARANG[\s\S]{0,120}core-config\.js/.test(plan), 'larangan core-config.js');
check('Aturan: alasannya cache-first di service worker disebut',
  /cache-first/.test(plan) && /precache/.test(plan), 'cache-first precache');
check('Aturan: server hanya bisa MEMATIKAN, tidak bisa MENYALAKAN',
  /hanya bisa MEMATIKAN/.test(plan), 'server hanya mematikan');
check('Aturan: satu rilis satu endpoint',
  /[Ss]atu rilis,? satu endpoint/.test(plan), 'satu rilis satu endpoint');
check('core-config.js repo masih SEMUA off (rencana belum dieksekusi diam-diam)',
  /enabled:false/.test(coreConfig) && /base:''/.test(coreConfig)
  && !/(?:health|config|auth|quota|ai|tts|usage):'(?:on|shadow)'/.test(coreConfig),
  'FIEZEL_CF_CONFIG');

/* =======================================================================================
 * 6. Kriteria BERHENTI TOTAL, termasuk yang menyangkut murid
 * ===================================================================================== */
const stopSection = (() => {
  const from = plan.indexOf('## 5. Kriteria BERHENTI TOTAL');
  if (from < 0) return '';
  const rest = plan.slice(from);
  const next = rest.slice(3).search(/^##\s/m);
  return next >= 0 ? rest.slice(0, next + 3) : rest;
})();
check('Ada bagian kriteria BERHENTI TOTAL', stopSection.length > 400, `panjang=${stopSection.length}`);
check('BERHENTI TOTAL: progres murid tampak hilang', /[Pp]rogres tampak hilang/.test(stopSection), 'progres hilang');
check('BERHENTI TOTAL: suara senyap total', /[Ss]uara senyap total/.test(stopSection), 'senyap total');
check('BERHENTI TOTAL: soal tidak bisa dijawab', /[Ss]oal tidak bisa dijawab/.test(stopSection), 'soal tidak terjawab');
check('BERHENTI TOTAL: kondisi murid bertoleransi nol (satu kejadian cukup)',
  /nol toleransi|satu kejadian sudah cukup/i.test(stopSection), 'nol toleransi');
check('BERHENTI TOTAL: memuat kondisi teknis berangka',
  (stopSection.match(NUMBER_WITH_UNIT_G) || []).length >= 5,
  String((stopSection.match(NUMBER_WITH_UNIT_G) || []).length));
check('BERHENTI TOTAL: Puter dikembalikan penuh dan disebut masih hidup',
  /Puter[\s\S]{0,120}masih hidup penuh/.test(stopSection), 'Puter masih hidup');
check('BERHENTI TOTAL: tindakannya adalah B-2 (satu perintah)',
  /\bB-2\b/.test(stopSection), 'B-2');

/* =======================================================================================
 * 7. `tools/flag-plan-check.mjs` — nol jaringan (dibuktikan dari sumbernya)
 * ===================================================================================== */
const stripComments = src => src
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|[^:\\])\/\/[^\n]*/g, '$1 ');
const toolCode = stripComments(tool);
const NETWORK_PATTERNS = [
  { name: 'import modul socket', re: /from\s*['"](?:node:)?(?:https?|net|tls|dgram|dns)['"]/ },
  { name: 'require modul socket', re: /require\(\s*['"](?:node:)?(?:https?|net|tls|dgram|dns)['"]\s*\)/ },
  { name: 'panggilan fetch', re: /\bfetch\s*\(/ },
  { name: 'XMLHttpRequest/WebSocket', re: /\bnew\s+(?:WebSocket|XMLHttpRequest)\s*\(/ },
  { name: 'spawn alat jaringan', re: /child_process|execSync|spawnSync/ },
  { name: 'URL http literal', re: /['"`]https?:\/\//i }
];
for (const pattern of NETWORK_PATTERNS) {
  check(`flag-plan-check.mjs tidak memuat ${pattern.name}`, !pattern.re.test(toolCode),
    (toolCode.match(new RegExp(pattern.re.source, 'i')) || ['0'])[0]);
}
check('flag-plan-check.mjs hanya mengimpor modul lokal Node yang aman',
  (toolCode.match(/from\s*['"]node:([a-z:]+)['"]/g) || [])
    .every(line => /node:(?:fs|path|vm|url)/.test(line)),
  (toolCode.match(/from\s*['"]node:[a-z:]+['"]/g) || []).join(','));
check('flag-plan-check.mjs membaca /api/config dari STDIN, bukan dari jaringan',
  /readFileSync\(0/.test(toolCode), 'readFileSync(0)');
check('flag-plan-check.mjs tidak menulis berkas apa pun',
  !/writeFileSync|appendFileSync|createWriteStream|mkdirSync/.test(toolCode), 'nol tulis');

/* =======================================================================================
 * 8. `tools/flag-plan-check.mjs` benar-benar MENDETEKSI kombinasi berbahaya
 * ===================================================================================== */
// Fixture dijalankan, bukan dibaca. Direktori temporer OS supaya working tree tidak kotor.
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fiezel-flag-plan-'));
const cleanup = () => { try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* abaikan */ } };

const makeStatic = endpoints => {
  const body = Object.entries({ health: 'off', config: 'off', auth: 'off', quota: 'off', ai: 'off', tts: 'off', usage: 'off', ...endpoints })
    .map(([k, v]) => `${k}:'${v}'`).join(',');
  return `self.FIEZEL_CF_CONFIG=Object.freeze({enabled:true,base:'https://api.example.invalid',endpoints:Object.freeze({${body}})});\n`;
};
const makeServer = (flags, kill) => JSON.stringify({
  protocol: '1.7',
  flags: {
    cfApiEnabled: false, cfAiEnabled: false, cfTtsEnabled: false,
    cfQuotaEnabled: false, cfAnalyticsEnabled: false, cfIdentityEnabled: false, ...flags
  },
  enabled: { ai: false, tts: false, coach: false, analytics: false, ...kill },
  limits: { aiPerDay: 25, ttsCharsPerDay: 12000 }
});

let fixtureSeq = 0;
function runTool(staticSource, serverJson) {
  fixtureSeq += 1;
  const configPath = path.join(tmpDir, `core-config-${fixtureSeq}.js`);
  fs.writeFileSync(configPath, staticSource);
  const result = spawnSync(process.execPath, [path.join(root, TOOL_REL), '--config', configPath, '--json'], {
    input: serverJson === null ? '' : serverJson,
    encoding: 'utf8',
    timeout: 20000
  });
  let parsed = null;
  try { parsed = JSON.parse(result.stdout || 'null'); } catch { parsed = null; }
  return {
    status: result.status,
    json: parsed,
    codes: parsed ? parsed.findings.map(f => f.code) : [],
    dangers: parsed ? parsed.findings.filter(f => f.severity === 'DANGER').map(f => f.code) : [],
    effective: parsed ? Object.fromEntries(parsed.endpoints.map(e => [e.endpoint, e.effective])) : {},
    stderr: String(result.stderr || '').slice(0, 200)
  };
}

// ---- BAHAYA 1: `ai` hidup sementara `auth` mati -----------------------------------------
const bahaya1 = runTool(
  makeStatic({ health: 'on', config: 'on', quota: 'on', ai: 'on' }),
  makeServer({ cfApiEnabled: true, cfQuotaEnabled: true, cfAiEnabled: true }, { ai: true })
);
check('BAHAYA 1 terdeteksi: ai on tetapi auth off (AI_TANPA_AUTH)',
  bahaya1.dangers.includes('AI_TANPA_AUTH'), bahaya1.codes.join(',') || `(kosong) stderr=${bahaya1.stderr}`);
check('BAHAYA 1: exit code 3 (bukan 0) supaya otomasi bisa berhenti',
  bahaya1.status === 3, `status=${bahaya1.status}`);

// ---- BAHAYA 2: `quota` mati sementara `ai` hidup = biaya tak terbatas --------------------
const bahaya2 = runTool(
  makeStatic({ health: 'on', config: 'on', auth: 'shadow', ai: 'on' }),
  makeServer({ cfApiEnabled: true, cfIdentityEnabled: true, cfAiEnabled: true }, { ai: true })
);
check('BAHAYA 2 terdeteksi: quota off sementara ai on (AI_TANPA_KUOTA)',
  bahaya2.dangers.includes('AI_TANPA_KUOTA'), bahaya2.codes.join(',') || `(kosong) stderr=${bahaya2.stderr}`);
check('BAHAYA 2: pesannya menyebut biaya tak terbatas, bukan hanya nama kode',
  /BIAYA TAK TERBATAS/i.test(JSON.stringify(bahaya2.json && bahaya2.json.findings)),
  'pesan biaya');
check('BAHAYA 2: exit code 3', bahaya2.status === 3, `status=${bahaya2.status}`);

// ---- BAHAYA 3: kill switch tidak terbaca klien -------------------------------------------
const bahaya3 = runTool(
  makeStatic({ health: 'on', usage: 'on' }),
  makeServer({ cfApiEnabled: true, cfAnalyticsEnabled: true }, { analytics: true })
);
check('BAHAYA 3 terdeteksi: endpoint hidup sementara config off (KILL_SWITCH_TAK_TERBACA)',
  bahaya3.dangers.includes('KILL_SWITCH_TAK_TERBACA'), bahaya3.codes.join(',') || `(kosong) stderr=${bahaya3.stderr}`);
check('BAHAYA 3: exit code 3', bahaya3.status === 3, `status=${bahaya3.status}`);

// ---- BAHAYA 4 (bonus, aturan "satu rilis satu endpoint") ---------------------------------
const bahaya4 = runTool(
  makeStatic({ health: 'on', config: 'on', quota: 'on', auth: 'on', tts: 'on', ai: 'on' }),
  makeServer({ cfApiEnabled: true, cfQuotaEnabled: true, cfIdentityEnabled: true, cfTtsEnabled: true, cfAiEnabled: true }, { ai: true, tts: true })
);
check('BAHAYA 4 terdeteksi: auth+tts+ai on sekaligus (BANYAK_RISIKO_SEKALIGUS)',
  bahaya4.dangers.includes('BANYAK_RISIKO_SEKALIGUS'), bahaya4.codes.join(',') || '(kosong)');

// ---- ANTI-VAKUM 1: keadaan repo hari ini harus BERSIH ------------------------------------
const hariIni = runTool(coreConfig, makeServer({}, {}));
check('ANTI-VAKUM: keadaan core-config.js repo hari ini = NOL temuan',
  hariIni.codes.length === 0, hariIni.codes.join(',') || '0');
check('ANTI-VAKUM: keadaan repo hari ini exit 0', hariIni.status === 0, `status=${hariIni.status}`);
check('ANTI-VAKUM: ketujuh endpoint dilaporkan OFF pada keadaan repo',
  Object.values(hariIni.effective).length === 7 && Object.values(hariIni.effective).every(v => v === 'off'),
  JSON.stringify(hariIni.effective));

// ---- ANTI-VAKUM 2: kombinasi aman TIDAK boleh dilaporkan bahaya --------------------------
const aman = runTool(
  makeStatic({ health: 'on', config: 'on', auth: 'on', quota: 'on' }),
  makeServer({ cfApiEnabled: true, cfIdentityEnabled: true, cfQuotaEnabled: true }, {})
);
check('ANTI-VAKUM: urutan sah (health+config+auth+quota on, ai/tts off) = nol DANGER',
  aman.dangers.length === 0, aman.dangers.join(',') || '0');
check('ANTI-VAKUM: urutan sah exit 0', aman.status === 0, `status=${aman.status}`);

/* ---- Aturan arah: server hanya bisa MEMATIKAN ------------------------------------------ */
const serverMematikan = runTool(
  makeStatic({ health: 'on', config: 'on', auth: 'on', quota: 'on', ai: 'on' }),
  makeServer({ cfApiEnabled: true, cfIdentityEnabled: true, cfQuotaEnabled: true, cfAiEnabled: false }, { ai: true })
);
check('Server MEMATIKAN: cfAiEnabled=false ⇒ ai efektif off walau statis on',
  serverMematikan.effective.ai === 'off', JSON.stringify(serverMematikan.effective));
const serverTidakMenyalakan = runTool(
  makeStatic({ health: 'on', config: 'on', usage: 'shadow' }),
  makeServer({ cfApiEnabled: true, cfAnalyticsEnabled: true }, { analytics: true })
);
check('Server TIDAK MENYALAKAN: statis shadow tetap shadow walau server true',
  serverTidakMenyalakan.effective.usage === 'shadow', JSON.stringify(serverTidakMenyalakan.effective));
const stdinKosong = runTool(makeStatic({ health: 'on', config: 'on' }), null);
check('/api/config tidak terbaca ⇒ semua off (gagal ke arah aman)',
  Object.values(stdinKosong.effective).every(v => v === 'off'), JSON.stringify(stdinKosong.effective));
const killSwitchTutup = runTool(
  makeStatic({ health: 'on', config: 'on', auth: 'on', quota: 'on', tts: 'on' }),
  makeServer({ cfApiEnabled: true, cfIdentityEnabled: true, cfQuotaEnabled: true, cfTtsEnabled: true }, { tts: false })
);
check('Kill switch enabled.tts=false ⇒ tts efektif off walau flag klien true',
  killSwitchTutup.effective.tts === 'off', JSON.stringify(killSwitchTutup.effective));

cleanup();
check('Fixture tidak mengotori working tree', !fs.existsSync(tmpDir), tmpDir);

/* ===================================================================================== */
const report = {
  schema: 'fiezel-rollout-plan-v1',
  pass: !failed,
  counts: {
    pass: checks.filter(c => c.status === 'PASS').length,
    fail: checks.filter(c => c.status === 'FAIL').length
  },
  checks
};
fs.writeFileSync(path.join(root, 'ROLLOUT-PLAN-REPORT.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (failed) {
  console.log(`FIEZEL rollout-plan gate: FAIL (${report.counts.fail} assert merah)`);
  process.exitCode = 1;
} else {
  console.log(`FIEZEL rollout-plan gate: PASS (${report.counts.pass} assert)`);
}
