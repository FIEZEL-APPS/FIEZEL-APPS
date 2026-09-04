/**
 * health-probe-test.js — GERBANG untuk `tools/fiezel-health-probe.mjs`.
 *
 * Node murni, nol dependency, nol jaringan luar. Gerbang ini menjalankan probe
 * SUNGGUHAN dalam mode `--selftest` (server HTTP loopback + fixture TLS/DNS), bukan
 * menguji salinan logikanya.
 *
 * ==========================================================================
 * APA YANG DIJAGA, DAN KENAPA
 * ==========================================================================
 * (a) Probe TIDAK memuat rahasia dan tidak menyebut alamat internal Cloudflare.
 *     Skrip pemantauan adalah tempat rahasia paling mudah bocor: ia dijalankan cron,
 *     keluarannya ditempel ke tiket, dan orang menambah "satu header saja" supaya
 *     `/health` langsung ke Worker. Karena itu daftar host di dalam probe di-assert
 *     sebagai HIMPUNAN TERTUTUP: hanya `api.fiezel.my.id`, `fiezel.my.id`,
 *     `fiezel-api.fitrajft.workers.dev` (satu-satunya alamat internal yang memang
 *     harus diuji 403), dan loopback untuk selftest.
 * (b) `workers.dev` yang menjawab 200 diperlakukan KRITIS, bukan OK. Arah ini MUDAH
 *     TERBALIK — "200 = hidup = hijau" adalah refleks monitor pada umumnya, padahal
 *     di sini 200 berarti penjaga edge mati dan siapa pun bisa `POST /api/auth/anon`
 *     langsung, menulis D1, dan menguras kuota gratis (deploy/edge/README.md §3).
 *     Dijaga dari DUA arah: 200 harus KRITIS, dan 403 harus OK.
 * (c) Exit code: non-nol saat ada KRITIS, NOL saat hanya PERINGATAN. Monitor yang
 *     memerah pada peringatan akan dimatikan orang; monitor yang hijau pada kegagalan
 *     kritis lebih buruk lagi.
 * (d) Mode `--selftest` TIDAK menembak jaringan. Bukan janji di komentar: setiap
 *     laporan selftest melaporkan `jaringan.nonLoopbackAttempts` dan daftar target,
 *     dan gerbang ini memeriksa SEMUA target adalah loopback/fixture.
 * (e) `quality.yml` HANYA memanggil probe dalam mode selftest. Satu baris tanpa
 *     `--selftest` akan mengubah setiap push menjadi tembakan ke produksi.
 * (f) Angka acuan latensi di probe benar-benar berasal dari angka terukur yang sudah
 *     tercatat (deploy/edge/README.md §5), bukan dikarang di tempat.
 *
 * Gagal memuat sumber = FAIL, bukan SKIP (aturan gerbang repo).
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = __dirname;
const PROBE_REL = 'tools/fiezel-health-probe.mjs';
const DOC_REL = 'tools/fiezel-health-probe.md';
const PROBE_ABS = path.join(root, PROBE_REL);

const checks = [];
let failed = false;
const check = (name, ok, details) => {
  checks.push({ name, status: ok ? 'PASS' : 'FAIL', details: String(details) });
  if (!ok) failed = true;
};

function mustRead(rel) {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) throw new Error('berkas wajib tidak ada: ' + rel);
  return fs.readFileSync(abs, 'utf8');
}

// Buang komentar sebelum memindai kode (pola audio-asset-pipeline-test.js:290-292),
// supaya penjelasan panjang tidak ikut dinilai sebagai kode.
const stripComments = src => src
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|[^:\\])\/\/[^\n]*/g, '$1 ');

const probeRaw = mustRead(PROBE_REL);
const probeCode = stripComments(probeRaw);
const docRaw = mustRead(DOC_REL);
const workflow = mustRead('.github/workflows/quality.yml');
const edgeReadme = mustRead('deploy/edge/README.md');

/* =======================================================================================
 * 1. Bentuk dasar: Node murni, tanpa dependency
 * ===================================================================================== */
check('Probe ada di ' + PROBE_REL, fs.existsSync(PROBE_ABS), PROBE_REL);
check('Probe lolos `node --check`',
  spawnSync(process.execPath, ['--check', PROBE_ABS], { encoding: 'utf8' }).status === 0, 'node --check');

const imports = [...probeCode.matchAll(/(?:^|\n)\s*import\s[^;]*?from\s*['"]([^'"]+)['"]/g)].map(m => m[1]);
const dynamicImports = [...probeCode.matchAll(/import\(\s*['"]([^'"]+)['"]\s*\)/g)].map(m => m[1]);
const allImports = [...imports, ...dynamicImports];
const nonBuiltin = allImports.filter(s => !s.startsWith('node:'));
check('Probe hanya mengimpor modul bawaan `node:` (nol dependency)', nonBuiltin.length === 0,
  allImports.join(', ') + (nonBuiltin.length ? ' | bukan bawaan: ' + nonBuiltin.join(', ') : ''));
check('Probe tidak memakai require() dari paket npm', !/require\(\s*['"][^n]/.test(probeCode.replace(/require\(\s*['"]node:/g, 'require("node:')), 'tanpa require paket');

/* =======================================================================================
 * 2. (a) Nol rahasia, nol alamat internal Cloudflare selain workers.dev yang diuji
 * ===================================================================================== */
// Dua kelas pola, dan pembagiannya penting:
//   NAMA/mekanisme (nama env secret, header edge, token akun) dipindai pada KODE saja —
//   penjelasan di komentar memang perlu menyebut header edge untuk menerangkan kenapa probe
//   TIDAK mengirimnya, dan menghukum komentar akan mendorong orang menghapus penjelasannya,
//   bukan memperbaiki kodenya.
//   NILAI (kunci privat, token panjang, kata sandi) dipindai pada SUMBER MENTAH, komentar
//   ikut — secret yang "hanya ditempel di komentar" tetap secret yang bocor.
const POLA_NAMA_RAHASIA = [
  ['EDGE_SHARED_SECRET', /EDGE_SHARED_SECRET/],
  ['header X-Fiezel-Edge', /X-Fiezel-Edge/i],
  ['token API Cloudflare', /CLOUDFLARE_API_TOKEN|CF_API_TOKEN|CF_ACCOUNT_ID|account_id/i],
  ['Authorization/Bearer', /Authorization|Bearer\s+[A-Za-z0-9_\-.]/],
  ['wrangler secret', /wrangler[^\n]{0,20}secret/i]
];
const POLA_NILAI_RAHASIA = [
  ['kredensial (password/kunci privat)', /(?:password\s*[:=]|passwd\s*[:=]|sshpass|private_key|BEGIN [A-Z ]*PRIVATE KEY)/i],
  ['nilai acak panjang (kemungkinan secret tertempel)', /['"][A-Za-z0-9_\-]{40,}['"]/]
];
const temuanNama = POLA_NAMA_RAHASIA.filter(([, re]) => re.test(probeCode)).map(([label]) => label);
const temuanNilai = POLA_NILAI_RAHASIA.filter(([, re]) => re.test(probeRaw)).map(([label]) => label);
check('Kode probe tidak menyentuh nama/mekanisme rahasia (secret, header edge, token akun)',
  temuanNama.length === 0, temuanNama.join(', ') || '0 temuan');
check('Sumber mentah probe (komentar ikut) tidak memuat NILAI rahasia apa pun',
  temuanNilai.length === 0, temuanNilai.join(', ') || '0 temuan');

// ANTI-VAKUM: pemindai yang hijau karena polanya mati adalah kebohongan termurah.
// Dua fixture sintetis membuktikan kedua kelas pola di atas benar-benar bisa MERAH.
const FIXTURE_BOCOR_NAMA = "const secret = env.EDGE_SHARED_SECRET; headers['X-Fiezel-Edge'] = secret;";
const FIXTURE_BOCOR_NILAI = '// catatan: nilainya "' + 'k'.repeat(43) + '" jangan hilang';
check('Pemindai nama rahasia terbukti bisa merah (fixture bocor tertangkap)',
  POLA_NAMA_RAHASIA.some(([, re]) => re.test(FIXTURE_BOCOR_NAMA)), 'fixture nama tertangkap');
check('Pemindai nilai rahasia terbukti bisa merah (fixture bocor di komentar tertangkap)',
  POLA_NILAI_RAHASIA.some(([, re]) => re.test(FIXTURE_BOCOR_NILAI)), 'fixture nilai tertangkap');

// Ia juga tidak boleh MEMBACA env: monitor yang membaca env adalah tempat pertama
// orang menyuntikkan secret "supaya /health bisa dipanggil langsung".
check('Probe tidak membaca process.env sama sekali (hanya argv)',
  !/process\.env/.test(probeCode) && /process\.argv/.test(probeCode), 'process.env absen, argv dipakai');

// Himpunan host TERTUTUP.
const HOST_DIIZINKAN = new Set(['api.fiezel.my.id', 'fiezel.my.id', 'fiezel-api.fitrajft.workers.dev', '127.0.0.1']);
const hostDitemukan = [...new Set([...probeCode.matchAll(/https?:\/\/([A-Za-z0-9._\-]+)/g)].map(m => m[1]))];
const hostAsing = hostDitemukan.filter(h => !HOST_DIIZINKAN.has(h));
check('Semua host di dalam probe berada di himpunan yang diizinkan', hostAsing.length === 0,
  'ditemukan: ' + hostDitemukan.join(', ') + (hostAsing.length ? ' | asing: ' + hostAsing.join(', ') : ''));

const POLA_INTERNAL_CF = [
  ['API/dashboard Cloudflare', /(?:api|dash)\.cloudflare\.com/i],
  ['endpoint R2 privat', /r2\.cloudflarestorage\.com/i],
  ['host D1/KV internal', /(?:d1|kv)\.[a-z0-9-]*\.workers\.dev/i]
];
const temuanInternal = POLA_INTERNAL_CF.filter(([, re]) => re.test(probeCode)).map(([l]) => l);
check('Probe tidak menyebut alamat internal Cloudflare selain workers.dev yang diuji 403',
  temuanInternal.length === 0, temuanInternal.join(', ') || '0 temuan');

// Satu-satunya alasan workers.dev boleh disebut: pemeriksaan 403.
check('workers.dev disebut PERSIS untuk pemeriksaan penjaga (403), bukan sebagai jalur data',
  /workersDev/.test(probeCode) && /statusDiharapkan:\s*403/.test(probeCode), 'targets.workersDev + statusDiharapkan 403');

// `/health` harus diperiksa LEWAT jembatan (yang menyisipkan header di origin).
check('`/health` diperiksa lewat jembatan api.fiezel.my.id, bukan langsung ke Worker',
  /targets\.bridge\s*\+\s*'\/health'/.test(probeCode) && /targets\.workersDev\s*\+\s*'\/health'/.test(probeCode),
  'bridge+/health untuk payload, workersDev+/health hanya untuk 403');
check('`/healthz` dipakai sebagai jalur bebas-header',
  /targets\.bridge\s*\+\s*'\/healthz'/.test(probeCode), 'bridge+/healthz');

/* =======================================================================================
 * 3. Menjalankan probe: selftest agregat
 * ===================================================================================== */
function jalankanProbe(args, timeout = 90000) {
  return spawnSync(process.execPath, [PROBE_ABS, ...args], { cwd: root, encoding: 'utf8', timeout });
}
function jsonDari(hasil) {
  try { return JSON.parse(String(hasil.stdout || '')); } catch { return null; }
}

const agregat = jalankanProbe(['--selftest', '--json']);
const agregatJson = jsonDari(agregat);
check('Selftest agregat exit 0 dan seluruh skenario PASS',
  agregat.status === 0 && agregatJson && agregatJson.pass === true && agregatJson.gagal === 0,
  agregatJson ? `exit=${agregat.status} total=${agregatJson.total} gagal=${agregatJson.gagal}` : `exit=${agregat.status} stderr=${String(agregat.stderr).slice(0, 200)}`);
check('Selftest agregat menguji minimal 10 skenario (satu skenario bukan bukti)',
  !!agregatJson && agregatJson.total >= 10, agregatJson ? String(agregatJson.total) : 'tanpa JSON');

/* =======================================================================================
 * 4. (d) Mode selftest tidak menembak jaringan — diperiksa, bukan dipercaya
 * ===================================================================================== */
check('Selftest agregat nol percobaan ke host non-loopback',
  !!agregatJson && agregatJson.nonLoopbackAttempts === 0,
  agregatJson ? String(agregatJson.nonLoopbackAttempts) : 'tanpa JSON');
check('Probe memasang penolakan host non-loopback di lapis I/O selftest',
  /nonLoopbackAllowed:\s*false/.test(probeCode) && /menolak host non-loopback/.test(probeRaw)
  && /isLoopback\(/.test(probeCode), 'penjaga isLoopback + pelanggaran dicatat');
check('Lapis selftest memakai server HTTP loopback sungguhan (port 0, 127.0.0.1)',
  /createServer\(/.test(probeCode) && /listen\(0,\s*'127\.0\.0\.1'/.test(probeCode), "listen(0,'127.0.0.1')");
check('Modul socket hanya dipakai lewat impor bawaan node: (tls untuk sertifikat, http hanya untuk selftest)',
  allImports.includes('node:tls') && dynamicImports.includes('node:http'),
  'impor: ' + allImports.join(', '));

/* =======================================================================================
 * 5. (b) workers.dev 200 = KRITIS, 403 = OK. Dijaga dari dua arah.
 * ===================================================================================== */
function skenario(nama) {
  const hasil = jalankanProbe(['--selftest', '--scenario=' + nama, '--json']);
  return { hasil, laporan: jsonDari(hasil) };
}
const cariCheck = (laporan, id) => (laporan && laporan.checks || []).find(c => c.id === id) || null;
const targetSemuaLoopback = laporan => {
  const daftar = (laporan && laporan.jaringan && laporan.jaringan.targets) || [];
  return daftar.length > 0 && daftar.every(t => /^(?:https?:\/\/127\.0\.0\.1(?::\d+)?\/|tls:\/\/|dns:\/\/)/.test(t));
};

const sehat = skenario('sehat');
const terbuka = skenario('workers_dev_terbuka');

check('Skenario `sehat`: workers.dev 403 dinilai OK (arah tidak terbalik)',
  !!cariCheck(sehat.laporan, 'penjaga_workers_dev') && cariCheck(sehat.laporan, 'penjaga_workers_dev').status === 'OK',
  cariCheck(sehat.laporan, 'penjaga_workers_dev') ? cariCheck(sehat.laporan, 'penjaga_workers_dev').status : 'tanpa laporan');
check('Skenario `workers_dev_terbuka`: 200 dinilai KRITIS (BUKAN OK)',
  !!cariCheck(terbuka.laporan, 'penjaga_workers_dev') && cariCheck(terbuka.laporan, 'penjaga_workers_dev').status === 'KRITIS',
  cariCheck(terbuka.laporan, 'penjaga_workers_dev') ? cariCheck(terbuka.laporan, 'penjaga_workers_dev').status : 'tanpa laporan');
check('Skenario `workers_dev_terbuka`: exit non-nol dan `penjaga_workers_dev` terdaftar di kritis',
  terbuka.hasil.status !== 0 && !!terbuka.laporan && terbuka.laporan.kritis.includes('penjaga_workers_dev'),
  `exit=${terbuka.hasil.status} kritis=${terbuka.laporan ? terbuka.laporan.kritis.join(',') : '-'}`);
check('Pesan 200 pada workers.dev menyebut celahnya, bukan hanya kode status',
  !!cariCheck(terbuka.laporan, 'penjaga_workers_dev') && /PENJAGA EDGE MATI/.test(cariCheck(terbuka.laporan, 'penjaga_workers_dev').pesan),
  cariCheck(terbuka.laporan, 'penjaga_workers_dev') ? cariCheck(terbuka.laporan, 'penjaga_workers_dev').pesan.slice(0, 80) : '-');
check('Skenario `workers_dev_terbuka` tetap nol jaringan luar',
  !!terbuka.laporan && terbuka.laporan.jaringan.nonLoopbackAttempts === 0 && targetSemuaLoopback(terbuka.laporan),
  terbuka.laporan ? (terbuka.laporan.jaringan.targets || []).join(' ') : '-');

/* =======================================================================================
 * 6. (c) Exit code: KRITIS => non-nol, PERINGATAN saja => nol
 * ===================================================================================== */
check('Skenario `sehat`: exit 0, nol kritis, nol peringatan',
  sehat.hasil.status === 0 && !!sehat.laporan && sehat.laporan.counts.KRITIS === 0 && sehat.laporan.counts.PERINGATAN === 0,
  sehat.laporan ? `exit=${sehat.hasil.status} kritis=${sehat.laporan.counts.KRITIS} peringatan=${sehat.laporan.counts.PERINGATAN}` : `exit=${sehat.hasil.status}`);
check('Skenario `sehat` tetap nol jaringan luar dan semua target loopback/fixture',
  !!sehat.laporan && sehat.laporan.jaringan.nonLoopbackAttempts === 0 && targetSemuaLoopback(sehat.laporan),
  sehat.laporan ? (sehat.laporan.jaringan.targets || []).join(' ') : '-');

const KRITIS_HARUS_MERAH = ['penjaga_off', 'protokol_tidak_cocok', 'situs_mati', 'api_mati', 'sertifikat_kedaluwarsa', 'mx_hilang'];
const HANYA_PERINGATAN = ['latensi_tinggi', 'sertifikat_mendekat', 'spf_hilang', 'workers_dev_404'];

const masalahKritis = [];
for (const nama of KRITIS_HARUS_MERAH) {
  const { hasil, laporan } = skenario(nama);
  if (hasil.status === 0) masalahKritis.push(nama + ' exit 0 padahal kritis');
  if (!laporan || laporan.counts.KRITIS < 1) masalahKritis.push(nama + ' tidak melaporkan KRITIS');
  if (laporan && laporan.pass !== false) masalahKritis.push(nama + ' pass!==false');
  if (laporan && laporan.jaringan.nonLoopbackAttempts !== 0) masalahKritis.push(nama + ' menembak jaringan luar');
}
check('Setiap kegagalan KRITIS membuat exit non-nol (' + KRITIS_HARUS_MERAH.length + ' skenario)',
  masalahKritis.length === 0, masalahKritis.join(' | ') || KRITIS_HARUS_MERAH.join(', '));

const masalahPeringatan = [];
for (const nama of HANYA_PERINGATAN) {
  const { hasil, laporan } = skenario(nama);
  if (hasil.status !== 0) masalahPeringatan.push(nama + ' exit ' + hasil.status + ' padahal hanya peringatan');
  if (!laporan || laporan.counts.PERINGATAN < 1) masalahPeringatan.push(nama + ' tidak melaporkan PERINGATAN');
  if (laporan && laporan.counts.KRITIS !== 0) masalahPeringatan.push(nama + ' salah menaikkan derajat ke KRITIS');
  if (laporan && laporan.jaringan.nonLoopbackAttempts !== 0) masalahPeringatan.push(nama + ' menembak jaringan luar');
}
check('PERINGATAN saja TIDAK memerahkan exit code (' + HANYA_PERINGATAN.length + ' skenario)',
  masalahPeringatan.length === 0, masalahPeringatan.join(' | ') || HANYA_PERINGATAN.join(', '));

/* =======================================================================================
 * 7. Keluaran: ringkasan Bahasa Indonesia + JSON, dan kontrak isinya
 * ===================================================================================== */
const sehatManusia = jalankanProbe(['--selftest', '--scenario=sehat']);
check('Mode bawaan mencetak ringkasan manusia (Bahasa Indonesia) DAN blok JSON',
  sehatManusia.status === 0
  && /KRITIS \d+ \| PERINGATAN \d+/.test(sehatManusia.stdout)
  && /HASIL: TIDAK ADA KEGAGALAN KRITIS/.test(sehatManusia.stdout)
  && sehatManusia.stdout.includes('----- JSON -----'),
  'exit=' + sehatManusia.status);
check('`--json` mencetak JSON murni yang bisa diurai alat lain',
  !!sehat.laporan && sehat.laporan.schema === 'fiezel-health-probe-v1', sehat.laporan ? sehat.laporan.schema : 'gagal urai');

const ID_WAJIB = ['situs_utama', 'situs_aplikasi', 'jembatan_health', 'jembatan_healthz', 'penjaga_workers_dev', 'sertifikat_api', 'dns_mx', 'dns_spf'];
const idAda = (sehat.laporan && sehat.laporan.checks || []).map(c => c.id);
check('Delapan pemeriksaan yang diminta semuanya ada di laporan',
  ID_WAJIB.every(id => idAda.includes(id)), idAda.join(', '));
check('Setiap pemeriksaan melaporkan latensinya sendiri',
  (sehat.laporan && sehat.laporan.checks || []).filter(c => c.id !== 'batas_plan_gratis').every(c => typeof c.ms === 'number'),
  'ms numerik di semua pemeriksaan');
check('Setiap kegagalan membawa TINDAKAN (runbook per gejala), bukan hanya status',
  (terbuka.laporan && terbuka.laporan.checks || []).filter(c => c.status === 'KRITIS' || c.status === 'PERINGATAN').every(c => typeof c.tindakan === 'string' && c.tindakan.length > 20),
  'tindakan terisi');
check('`/health` diperiksa sampai isi payload: protocol 1.7 + edgeGuard on',
  /protocol !== PROTOCOL/.test(probeCode) && /edgeGuard !== 'on'/.test(probeCode) && /const PROTOCOL = '1\.7'/.test(probeCode),
  'protocol + edgeGuard di-assert');
check('Batas plan gratis dilaporkan sebagai INFO yang jujur (tidak diukur tanpa token)',
  !!cariCheck(sehat.laporan, 'batas_plan_gratis') && cariCheck(sehat.laporan, 'batas_plan_gratis').status === 'INFO'
  && /10\.000 neuron/.test(probeRaw) && /1\.000 tulis\/hari/.test(probeRaw) && /CPU 10 ms/.test(probeRaw),
  'INFO + tiga ambang plan gratis');

/* =======================================================================================
 * 8. (f) Acuan latensi berasal dari angka terukur yang sudah tercatat
 * ===================================================================================== */
check('Acuan latensi probe cocok dengan angka terukur di deploy/edge/README.md §5',
  /warmMs:\s*1163/.test(probeCode) && /coldMs:\s*2214/.test(probeCode)
  && /2\.214 ms/.test(edgeReadme) && /1\.163 ms/.test(edgeReadme),
  'hangat 1163 ms / dingin 2214 ms');
check('Ambang PERINGATAN latensi = 2x acuan hangat',
  /LATENCY_FACTOR = 2\b/.test(probeCode) && /baselineMs \* LATENCY_FACTOR/.test(probeCode), 'faktor 2x');
check('Sertifikat: ambang peringatan 21 hari, kedaluwarsa = KRITIS',
  /CERT_WARN_DAYS = 21/.test(probeCode) && /sisaHari <= 0/.test(probeCode), '21 hari / <=0 kritis');

/* =======================================================================================
 * 9. (e) Registrasi CI: HANYA mode selftest
 * ===================================================================================== */
check('Gerbang ini terdaftar di quality.yml', workflow.includes('node health-probe-test.js'), 'quality.yml');
check('quality.yml memanggil probe dalam mode selftest',
  new RegExp('node\\s+' + PROBE_REL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s+--selftest').test(workflow), 'quality.yml');
const barisProbe = workflow.split('\n').filter(l => l.includes(PROBE_REL) && !l.trim().startsWith('#'));
check('TIDAK ada pemanggilan probe tanpa --selftest di CI (kalau ada, setiap push menembak produksi)',
  barisProbe.length > 0 && barisProbe.every(l => l.includes('--selftest')),
  barisProbe.map(l => l.trim()).join(' | ') || '(tidak ada baris)');

/* =======================================================================================
 * 10. Dokumen runbook mini ada dan benar-benar berisi
 * ===================================================================================== */
check('Dokumen ' + DOC_REL + ' ada', docRaw.length > 1500, docRaw.length + ' byte');
check('Dokumen menjelaskan cara menjalankan (produksi + selftest)',
  docRaw.includes('node tools/fiezel-health-probe.mjs') && docRaw.includes('--selftest'), 'perintah tercantum');
check('Dokumen menjelaskan arti tiap status (OK/PERINGATAN/KRITIS/INFO) dan exit code',
  ['KRITIS', 'PERINGATAN', 'OK', 'INFO', 'exit 0', 'exit 1'].every(k => docRaw.includes(k)), 'semua status dijelaskan');
const idTanpaRunbook = ID_WAJIB.filter(id => !docRaw.includes(id));
check('Dokumen punya runbook per gejala untuk kedelapan pemeriksaan',
  idTanpaRunbook.length === 0, idTanpaRunbook.join(', ') || 'lengkap');
check('Dokumen menegaskan aturan "nol rahasia" dan alasan /healthz',
  /nol rahasia|tanpa rahasia|TIDAK memuat rahasia/i.test(docRaw) && /healthz/.test(docRaw), 'aturan rahasia + /healthz');

/* =======================================================================================
 * 11. Batas kejujuran gerbang ini, dicatat bukan disembunyikan
 * ===================================================================================== */
// `no-network-test.js` hanya memindai berkas `*-test.js` / `*-audit.js` / `*-selftest.js`
// di AKAR repo, jadi `tools/fiezel-health-probe.mjs` tidak pernah masuk pemindaiannya —
// sama seperti `tools/cf-test-harness.js`. Karena itu probe TIDAK perlu (dan tidak boleh)
// didaftarkan ke allowlist mana pun di sana: allowlist itu bicara tentang gerbang, bukan
// alat. Yang menjaga CI tetap bebas jaringan adalah assert §9 di atas (hanya --selftest)
// plus penolakan host non-loopback di dalam probe (§4). Ini dicatat supaya tidak ada yang
// menyangka pemindai teks itu ikut menjaga berkas ini.
const noNetwork = mustRead('no-network-test.js');
check('Pemindai no-network memang tidak mencakup tools/ (jadi §4+§9 yang menjaga, dan itu dicatat)',
  /readdirSync\(root\)/.test(noNetwork) && /-\(test\|audit\|selftest\)\\\.js\$/.test(noNetwork),
  'cakupan: berkas gerbang di akar repo');
check('Gerbang ini sendiri tidak menembak jaringan (hanya spawn probe dalam selftest)',
  !/require\(\s*['"](?:node:)?(?:https?|net|tls|dgram|dns)['"]\s*\)/.test(stripComments(fs.readFileSync(__filename, 'utf8')))
  && !new RegExp('fetch\\(\\s*[\'"`]https?://').test(stripComments(fs.readFileSync(__filename, 'utf8'))),
  'tanpa socket, tanpa fetch remote');

/* ===================================================================================== */
const report = {
  schema: 'fiezel-health-probe-gate-v1',
  pass: !failed,
  probe: PROBE_REL,
  doc: DOC_REL,
  selftestScenarios: agregatJson ? agregatJson.total : null,
  counts: { pass: checks.filter(c => c.status === 'PASS').length, fail: checks.filter(c => c.status === 'FAIL').length },
  checks
};
fs.writeFileSync(path.join(root, 'HEALTH-PROBE-GATE-REPORT.json'), JSON.stringify(report, null, 2) + '\n');
for (const c of checks) console.log((c.status === 'PASS' ? '[PASS] ' : '[FAIL] ') + c.name + ' — ' + c.details);
console.log(failed
  ? `FIEZEL health-probe gate: FAIL (${report.counts.fail} dari ${report.counts.pass + report.counts.fail})`
  : `FIEZEL health-probe gate: PASS (${report.counts.pass} assert, ${report.selftestScenarios} skenario selftest)`);
if (failed) process.exitCode = 1;
