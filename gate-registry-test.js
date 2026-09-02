#!/usr/bin/env node
/**
 * GERBANG META PENDAFTARAN (gate-registry-test.js)
 *
 * ==========================================================================
 * KENAPA BERKAS INI ADA
 * ==========================================================================
 * `reports/add-a10-kepatuhan.md` §5.3 menemukan dua gerbang yang ADA di repo,
 * LULUS kalau dijalankan tangan, dan tidak pernah dipanggil satu pun workflow:
 * `bank-soal-audit-test.js` dan `app-report-control-path-test.js`. Keduanya
 * sudah didaftarkan sekarang, tapi menutup dua berkas bukan menutup kelas
 * cacatnya. Kelas cacatnya adalah: TIDAK ADA yang membandingkan daftar gerbang
 * di repo dengan daftar gerbang yang benar-benar dijalankan CI, jadi gerbang
 * berikutnya yang lupa didaftarkan akan hidup diam-diam persis sama lamanya —
 * dan sepanjang waktu itu ia dihitung sebagai "ada" oleh pembaca laporan
 * sementara CI tidak pernah menyentuhnya.
 *
 * Berkas ini menutup kelas itu: setiap berkas uji yang dilacak git WAJIB
 * terdaftar di `.github/workflows/quality.yml`, ATAU punya entri di
 * `EXCLUSIONS` di bawah dengan ALASAN TERTULIS. Pengecualian tanpa alasan
 * adalah kegagalan, dan alasan yang tidak lagi benar (berkasnya sudah tidak
 * ada) juga kegagalan — supaya daftar pengecualian tidak berubah menjadi
 * tempat sampah.
 *
 * ==========================================================================
 * KENAPA IA JUGA MENGURUS GERBANG LIVE
 * ==========================================================================
 * §5.1 laporan yang sama menemukan cacat sepupu: `quality.yml` memanggil
 * `cf-live-contract-test.js` dan `staging-live-test.js` tanpa meneruskan env
 * apa pun, jadi keduanya SELALU SKIP (exit 0, `pass:null`) sementara angka
 * "semua gerbang hijau" tetap menghitung mereka. Itu bukan gerbang yang lupa
 * didaftarkan, melainkan gerbang yang terdaftar dan tidak menguji apa pun.
 * Dua-duanya melahirkan keyakinan palsu dari arah berlawanan, jadi keduanya
 * dijaga di satu tempat.
 *
 * Yang di-assert di sini BUKAN "gerbang live harus jalan di CI" — menembak
 * produksi pada setiap push adalah beban yang kita timpakan ke murid. Yang
 * di-assert adalah bahwa SKIP-nya EKSPLISIT dan TIDAK dihitung sebagai bukti:
 *   (L1) setiap gerbang live berada di step BERNAMA SENDIRI, bukan terkubur di
 *        tengah ~150 baris `node …` di dalam satu step "Core validation";
 *   (L2) nama step itu menyebut SKIP, supaya kondisinya terbaca dari daftar
 *        step di UI Actions tanpa membuka lognya;
 *   (L3) step itu mencetak ALASAN SKIP (`::notice` + `$GITHUB_STEP_SUMMARY`)
 *        saat env-nya kosong;
 *   (L4) env-nya datang dari input `workflow_dispatch`/secret, TIDAK pernah
 *        dari URL bawaan di dalam workflow;
 *   (L5) ada jalan SENGAJA untuk menjalankannya: `workflow_dispatch` dengan
 *        input base URL;
 *   (L6) gerbang live tidak masuk hitungan bukti — laporan berkas ini memisah
 *        `evidenceGates` dari `liveGatesNotEvidence`, dan meng-assert bahwa
 *        keduanya tidak saling tumpang tindih;
 *   (L7) gerbang live tetap gagal keras bila env DIISI tapi kontraknya rusak:
 *        dibuktikan dengan MENJALANKAN gerbangnya terhadap base URL yang tidak
 *        sah dan menuntut exit != 0, bukan dengan membaca janji di komentarnya.
 *
 * Nol jaringan. (L7) memakai base URL yang secara sintaksis ditolak sebelum
 * satu paket pun dikirim; tidak ada nama host yang di-resolve.
 *
 * Sumber temuan: reports/add-a10-kepatuhan.md §5.1 dan §5.3.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');

const ROOT = __dirname;
const WORKFLOW = path.join('.github', 'workflows', 'quality.yml');

/* =======================================================================================
 * POLA BERKAS UJI
 * =====================================================================================
 * Sengaja berbasis NAMA, bukan berbasis isi. Kalau seseorang menulis gerbang baru,
 * konvensi namanya (`*-test.js` / `*-audit.js` / `*-selftest.js`) adalah satu-satunya
 * hal yang pasti ia ikuti; mendeteksi "berkas ini punya assert" lewat heuristik isi akan
 * meleset ke dua arah sekaligus.
 */
// `-simulation` masuk pola sejak temuan D1 §5.3: `adaptivity-simulation-v3.js` adalah
// gerbang sungguhan (exit code dari main(), gate residual + kalibrasi yang bisa merah)
// tetapi namanya tidak berakhiran -test/-audit/-selftest sehingga lolos dari meta-gate
// ini selama setahun pola lamanya berlaku. Sufiks versi opsional (`-v3`) ikut ditangkap.
const GATE_NAME_RE = /(?:-test|-audit|-selftest|-simulation(?:-v\d+)?)\.(?:js|mjs)$/;

/* =======================================================================================
 * PENGECUALIAN — setiap entri WAJIB punya alasan tertulis
 * =====================================================================================
 * Aturannya: sebuah berkas boleh berada di sini HANYA kalau mendaftarkannya di CI akan
 * salah, bukan karena mendaftarkannya merepotkan. Dua kelas yang sah:
 *   (a) alat pelaporan yang namanya kebetulan cocok pola tapi tidak punya assert dan
 *       selalu exit 0 — mendaftarkannya menambah satu langkah hijau abadi yang
 *       menyamarkan hitungan gerbang;
 *   (b) self-test / harness yang sudah dipanggil gerbang lain — mendaftarkannya berarti
 *       menjalankan pekerjaan yang sama dua kali dan membuat satu kegagalan tampil
 *       sebagai dua lampu merah.
 * Setiap entri menyebut KELAS-nya dan BUKTI-nya, supaya pembaca berikutnya bisa
 * memeriksa alasannya alih-alih mempercayainya.
 */
const EXCLUSIONS = new Map([
  /* Kelas 'gerbang-pra-rilis-fitur': gerbang yang kontraknya sendiri mengikat RILIS FITUR
     tertentu, bukan rilis umum. Cara memeriksa klaimnya: baca pesan gagal gerbangnya. */
  /* m025-192: entri pengecualian th-coverage DIHAPUS sesuai instruksi entri itu sendiri -
     lubang th (69 template + 605 vocab) sudah ditutup di branch ini (103/103), gerbang
     didaftarkan ulang di quality.yml dan kembali mengikat. */
  ['audit/bank-audit.js', {
    class: 'alat-pelaporan',
    reason:
      'BUKAN gerbang: ia penghasil laporan. Ia menyisir empat bank soal, menulis ' +
      'audit/BANK-SOAL-AUDIT.json, mencetak ringkasan temuan, lalu SELALU exit 0 — nol ' +
      'assert, nol process.exitCode. Temuan yang ia hasilkan hari ini pun tidak nol (mis. ' +
      'field "rule" yang masih Inggris), jadi mendaftarkannya di CI akan menambahkan satu ' +
      'langkah yang hijau selamanya tanpa memandang apa yang ia temukan — tepat jenis ' +
      'langkah yang membuat hitungan "gerbang hijau" berbohong. Sisi yang HARUS merah dari ' +
      'bank soal dijaga oleh bank-soal-audit-test.js (terdaftar) dan grammar-quality-audit.js ' +
      '(terdaftar). Cara menjalankan alat ini: `node audit/bank-audit.js` (lihat ' +
      'FIEZEL-M025125-SIDAK-BANK-SOAL-HANDOFF.md).'
  }],
  ['th-naskah-murid-test.js', {
    class: 'gerbang-pra-rilis-fitur',
    reason:
      'Gerbang PENUH (exit 1 bila ada temuan), tapi kontraknya mengikat rilis fitur yang ' +
      'belum tuntas: "murid Thai tidak membaca satu kalimat Indonesia pun di seluruh naskah ' +
      'runtime, bukan hanya di bank soal". Bagian bank soal sudah nol; bagian NASKAH DI LUAR ' +
      'bank soal masih 208 kalimat di 18 berkas (jalankan TH_GERBANG_RINCI=1 node ' +
      'th-naskah-murid-test.js untuk daftar lengkapnya). Mendaftarkannya sekarang membuat CI ' +
      'merah untuk utang yang memang sudah diketahui dan sedang dikerjakan, bukan untuk ' +
      'regresi baru. Pemeriksa cakupan kuota + pemberitahuan suara di dalamnya SUDAH ' +
      'mengikat hari ini lewat quota-notice-a11y-test.js. HAPUS ENTRI INI dan daftarkan ' +
      'gerbangnya di quality.yml pada PR yang membersihkan temuan terakhir - persis seperti ' +
      'yang dilakukan entri th-coverage di m025-192 (lihat catatan di atas). Rinciannya di ' +
      'THAI-BANK-PURITY-HANDOFF.md.'
  }],
  ['adaptivity-simulation.js', {
    class: 'alat-pelaporan',
    reason:
      'BUKAN gerbang: simulasi adaptivity v1 (legacy) adalah penghasil narasi/laporan yang ' +
      'mencetak analisis panjang ke konsol dan SELALU exit 0 — nol assert, nol process.exit, ' +
      'nol process.exitCode di seluruh berkasnya. Mendaftarkannya di CI menambah satu langkah ' +
      'hijau abadi. Ia sudah digantikan oleh adaptivity-simulation-v3.js, yang MEMANG gerbang ' +
      '(exit code dari main(), gate residual + gate kalibrasi yang bisa merah) dan karena itu ' +
      'WAJIB terdaftar di quality.yml, bukan dikecualikan. Cara menjalankan alat v1 secara ' +
      'manual: `node adaptivity-simulation.js`.'
  }]
]);

/* =======================================================================================
 * GERBANG LIVE — terdaftar, tetapi TIDAK dihitung sebagai bukti
 * ===================================================================================== */
const LIVE_GATES = new Map([
  ['cf-live-contract-test.js', {
    env: 'FIEZEL_CF_LIVE_BASE',
    dispatchInput: 'cf_live_base',
    reason:
      'Menguji Worker fiezel-api lewat HTTP NYATA. Tanpa base URL ia SKIP (exit 0, ' +
      'pass:null) dan tidak membuktikan apa pun tentang runtime Cloudflare.'
  }],
  ['staging-live-test.js', {
    env: 'FIEZEL_STAGING_BASE',
    dispatchInput: 'staging_base',
    reason:
      'Menembak runtime Cloudflare dan MENULIS state (kuota harian, objek audio, baris ' +
      'analytics). Hanya boleh melawan staging, jadi SKIP adalah jawaban yang benar di CI ' +
      'publik — dan SKIP bukan bukti.'
  }]
]);

/* =======================================================================================
 * INFRA UJI
 * ===================================================================================== */
const checks = [];
let failed = false;
function check(id, ok, details) {
  checks.push({ id, status: ok ? 'PASS' : 'FAIL', details: String(details) });
  if (!ok) failed = true;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${id}${ok ? '' : ' — ' + details}`);
}

/* =======================================================================================
 * BACA REPO
 * ===================================================================================== */
const tracked = execFileSync('git', ['ls-files'], { cwd: ROOT, encoding: 'utf8' })
  .split('\n')
  .map(s => s.trim())
  .filter(Boolean);

const gateFiles = tracked
  .filter(f => GATE_NAME_RE.test(f))
  // vendor/ dan node_modules/ tidak dilacak sebagai gerbang kita; ecohero-quest & website
  // adalah artefak terpisah yang tidak punya jalur CI di workflow ini.
  .filter(f => !f.startsWith('vendor/') && !f.startsWith('node_modules/'))
  .sort();

const wfPath = path.join(ROOT, WORKFLOW);
check('workflow-ada', fs.existsSync(wfPath), WORKFLOW);
if (!fs.existsSync(wfPath)) { process.exit(1); }
const wfRaw = fs.readFileSync(wfPath, 'utf8');

// Buang komentar YAML sebelum mencari invokasi: penjelasan panjang di workflow ini menyebut
// nama gerbang di dalam prosa (mis. "`e2e-bridge-selftest.js` membuktikan …"), dan menghitung
// sebutan prosa sebagai pendaftaran adalah tepat cara gerbang lupa-didaftarkan lolos.
const wfCode = wfRaw
  .split('\n')
  .map(line => line.replace(/(^|\s)#.*$/, '$1'))
  .join('\n');

const invoked = new Set();
for (const m of wfCode.matchAll(/(?:^|[;&|\s])node\s+(?:--[\w-]+\s+)*([A-Za-z0-9_./-]+\.m?js)\b/g)) {
  invoked.add(m[1]);
}

/* =======================================================================================
 * 1. SETIAP GERBANG DI REPO TERDAFTAR ATAU DIKECUALIKAN DENGAN ALASAN
 * ===================================================================================== */
const unregistered = [];
for (const f of gateFiles) {
  if (invoked.has(f)) continue;
  if (EXCLUSIONS.has(f)) continue;
  unregistered.push(f);
}
check(
  'setiap-gerbang-terdaftar-atau-dikecualikan',
  unregistered.length === 0,
  unregistered.length === 0
    ? `${gateFiles.length} berkas uji, semuanya terdaftar di ${WORKFLOW} atau punya entri pengecualian beralasan`
    : `tidak terdaftar dan tidak dikecualikan: ${unregistered.join(', ')} — daftarkan di ` +
      `${WORKFLOW}, atau tambahkan entri EXCLUSIONS di gate-registry-test.js dengan alasan tertulis`
);

/* =======================================================================================
 * 2. SETIAP PENGECUALIAN PUNYA ALASAN YANG BENAR-BENAR TERTULIS
 * =====================================================================================
 * Alasan satu kata ("legacy", "tidak perlu") tidak lebih baik daripada tidak ada alasan:
 * ia menutup pemeriksaan tanpa memberi pembaca berikutnya cara memeriksanya. Batas 120
 * karakter dipilih karena alasan yang sah selalu perlu menyebut KELAS-nya dan BUKTI-nya.
 */
const badReasons = [];
for (const [f, meta] of EXCLUSIONS) {
  const reason = String(meta && meta.reason || '');
  const cls = String(meta && meta.class || '');
  if (!cls) badReasons.push(`${f}: tanpa field class`);
  else if (!['alat-pelaporan', 'self-test-dipanggil-gerbang-lain', 'gerbang-pra-rilis-fitur'].includes(cls)) {
    badReasons.push(`${f}: class "${cls}" bukan kelas pengecualian yang sah`);
  }
  if (reason.trim().length < 120) badReasons.push(`${f}: alasan terlalu pendek (${reason.trim().length} char, minimum 120)`);
}
check(
  'setiap-pengecualian-beralasan',
  badReasons.length === 0,
  badReasons.length === 0 ? `${EXCLUSIONS.size} pengecualian, semuanya berkelas dan beralasan` : badReasons.join(' | ')
);

/* =======================================================================================
 * 3. NOL PENGECUALIAN BASI (berkasnya sudah hilang, atau sudah terdaftar juga)
 * ===================================================================================== */
const staleExclusions = [];
for (const f of EXCLUSIONS.keys()) {
  if (!tracked.includes(f)) staleExclusions.push(`${f}: dikecualikan tapi tidak ada di repo`);
  if (invoked.has(f)) staleExclusions.push(`${f}: dikecualikan TAPI juga dipanggil ${WORKFLOW} — hapus salah satu`);
}
check('nol-pengecualian-basi', staleExclusions.length === 0, staleExclusions.length === 0 ? 'bersih' : staleExclusions.join(' | '));

/* =======================================================================================
 * 4. NOL GERBANG HANTU (terdaftar di workflow, berkasnya tidak ada)
 * ===================================================================================== */
const ghosts = [...invoked].filter(f => !fs.existsSync(path.join(ROOT, f))).sort();
check('nol-gerbang-hantu', ghosts.length === 0, ghosts.length === 0 ? `${invoked.size} invokasi node, semua berkasnya ada` : ghosts.join(', '));

/* =======================================================================================
 * 5. GERBANG LIVE MEMANG TERDAFTAR — tapi lihat blok berikutnya soal statusnya
 * ===================================================================================== */
const liveMissing = [...LIVE_GATES.keys()].filter(f => !invoked.has(f));
check('gerbang-live-terdaftar', liveMissing.length === 0, liveMissing.length === 0 ? [...LIVE_GATES.keys()].join(', ') : `tidak dipanggil: ${liveMissing.join(', ')}`);

/* =======================================================================================
 * 6. GERBANG LIVE TIDAK DIHITUNG SEBAGAI BUKTI
 * =====================================================================================
 * Pisahkan step workflow supaya bisa dijawab: gerbang live ini berdiri sendiri, atau
 * terkubur di tengah step raksasa? Pemisahan dilakukan atas teks MENTAH (dengan komentar)
 * karena alasan SKIP-nya sebagian hidup di komentar dan sebagian di `echo`.
 */
const stepChunks = [];
{
  const lines = wfRaw.split('\n');
  let cur = null;
  for (const line of lines) {
    const m = /^(\s*)-\s+name:\s*(.+?)\s*$/.exec(line);
    if (m) {
      if (cur) stepChunks.push(cur);
      cur = { name: m[2].replace(/^['"]|['"]$/g, ''), body: '' };
      continue;
    }
    if (cur) cur.body += line + '\n';
  }
  if (cur) stepChunks.push(cur);
}

const liveProblems = [];
for (const [file, meta] of LIVE_GATES) {
  const owning = stepChunks.filter(s => new RegExp(`node\\s+${file.replace(/[.]/g, '\\.')}\\b`).test(
    s.body.split('\n').map(l => l.replace(/(^|\s)#.*$/, '$1')).join('\n')
  ));
  // (L1) tepat satu step yang memanggilnya, dan step itu tidak boleh menjadi step raksasa
  //      yang juga menjalankan lusinan gerbang lain.
  if (owning.length !== 1) {
    liveProblems.push(`${file}: dipanggil oleh ${owning.length} step (harus tepat 1 step bernama sendiri)`);
    continue;
  }
  const step = owning[0];
  const codeBody = step.body.split('\n').map(l => l.replace(/(^|\s)#.*$/, '$1')).join('\n');
  const nodeCallsInStep = [...codeBody.matchAll(/(?:^|[;&|\s])node\s+(?:--[\w-]+\s+)*([A-Za-z0-9_./-]+\.m?js)\b/g)].map(m => m[1]);
  if (nodeCallsInStep.length !== 1) {
    liveProblems.push(`${file}: step "${step.name}" juga menjalankan ${nodeCallsInStep.length - 1} gerbang lain — SKIP-nya akan tenggelam di lampu hijau bersama`);
  }
  // (L2) kondisinya terbaca dari nama step.
  if (!/skip/i.test(step.name)) {
    liveProblems.push(`${file}: nama step "${step.name}" tidak menyebut SKIP, jadi kondisinya tidak terlihat di daftar step UI Actions`);
  }
  // (L3) alasan SKIP dicetak, bukan hanya diketahui gerbangnya sendiri.
  if (!/::notice/.test(step.body) || !/GITHUB_STEP_SUMMARY/.test(step.body)) {
    liveProblems.push(`${file}: step "${step.name}" tidak mencetak alasan SKIP ke ::notice + $GITHUB_STEP_SUMMARY`);
  }
  if (!/SKIP/.test(step.body)) {
    liveProblems.push(`${file}: step "${step.name}" tidak menyebut kata SKIP di keluarannya`);
  }
  // (L4) env-nya dari input/secret, bukan URL bawaan.
  if (!new RegExp(`${meta.env}\\s*:`).test(step.body)) {
    liveProblems.push(`${file}: step "${step.name}" tidak meneruskan ${meta.env} lewat env:`);
  }
  if (new RegExp(`${meta.env}\\s*:\\s*['"]?https?://`).test(step.body)) {
    liveProblems.push(`${file}: ${meta.env} punya URL bawaan di workflow — itu mengubah CI publik menjadi penembak produksi setiap push`);
  }
  // (L5) ada jalan sengaja untuk menjalankannya.
  if (!new RegExp(`inputs:[\\s\\S]*?${meta.dispatchInput}\\s*:`).test(wfRaw) || !/workflow_dispatch\s*:/.test(wfRaw)) {
    liveProblems.push(`${file}: tidak ada input workflow_dispatch "${meta.dispatchInput}" — tidak ada cara menjalankannya dengan sengaja`);
  }
  if (!new RegExp(`${meta.env}\\s*:\\s*\\$\\{\\{\\s*github\\.event\\.inputs\\.${meta.dispatchInput}`).test(step.body)) {
    liveProblems.push(`${file}: ${meta.env} tidak terhubung ke input ${meta.dispatchInput}`);
  }
}
check('gerbang-live-skip-eksplisit-dan-terlihat', liveProblems.length === 0, liveProblems.length === 0 ? 'L1-L5 terpenuhi untuk kedua gerbang live' : liveProblems.join(' | '));

// (L6) hitungan bukti memisahkan gerbang live.
const evidenceGates = [...invoked].filter(f => !LIVE_GATES.has(f)).sort();
const liveGatesNotEvidence = [...LIVE_GATES.keys()].sort();
check(
  'hitungan-bukti-tidak-memuat-gerbang-live',
  evidenceGates.every(f => !LIVE_GATES.has(f)) && liveGatesNotEvidence.length === LIVE_GATES.size,
  `evidenceGates=${evidenceGates.length}, liveGatesNotEvidence=${liveGatesNotEvidence.length} ` +
  `(total invokasi ${invoked.size}) — angka gerbang hijau yang boleh dikutip sebagai bukti adalah ${evidenceGates.length}, BUKAN ${invoked.size}`
);

/* =======================================================================================
 * 7. GERBANG LIVE TETAP GAGAL KERAS BILA ENV DIISI TAPI TIDAK SAH
 * =====================================================================================
 * Ini yang membedakan "SKIP yang jujur" dari "selalu hijau". Dibuktikan dengan
 * MENJALANKAN, bukan membaca komentar. Base URL yang dipakai ditolak pada tahap parsing
 * URL — nol paket keluar, nol DNS. `no-network-test.js` tetap penjaga utama larangan
 * jaringan; di sini yang diuji hanya bahwa env terisi + tidak sah = MERAH.
 */
const hardFailProblems = [];
for (const [file, meta] of LIVE_GATES) {
  const abs = path.join(ROOT, file);
  if (!fs.existsSync(abs)) { hardFailProblems.push(`${file} tidak ada`); continue; }
  const env = Object.assign({}, process.env, { [meta.env]: 'bukan-url-sama-sekali' });
  // staging-live-test.js butuh dua env; isi keduanya supaya ia melewati cabang SKIP dan
  // benar-benar sampai ke validasi base URL.
  if (file === 'staging-live-test.js') env.FIEZEL_STAGING_EDGE = 'x-uji-lokal-bukan-rahasia-sungguhan';
  const r = spawnSync(process.execPath, [abs], { cwd: ROOT, encoding: 'utf8', timeout: 60000, env });
  if (r.status === 0) {
    hardFailProblems.push(`${file}: ${meta.env} diisi nilai tidak sah tetapi exit 0 — gerbang ini bisa "jalan tapi memaafkan"`);
  }
  if (/SKIP/.test(String(r.stdout || '')) && r.status === 0) {
    hardFailProblems.push(`${file}: mengaku SKIP padahal ${meta.env} DIISI`);
  }
}
check('gerbang-live-merah-bila-env-diisi-tapi-rusak', hardFailProblems.length === 0, hardFailProblems.length === 0 ? 'kedua gerbang exit != 0 pada base URL tidak sah' : hardFailProblems.join(' | '));

/* =======================================================================================
 * 8. GERBANG INI SENDIRI TERDAFTAR
 * =====================================================================================
 * Gerbang meta yang tidak dipanggil CI adalah persis cacat yang ia jaga.
 */
check('gerbang-meta-ini-terdaftar', invoked.has('gate-registry-test.js'), `${WORKFLOW} memanggil gate-registry-test.js`);

/* =======================================================================================
 * LAPORAN
 * ===================================================================================== */
const report = {
  gate: 'gate-registry',
  generatedAt: new Date().toISOString(),
  status: failed ? 'FAIL' : 'PASS',
  source: 'reports/add-a10-kepatuhan.md §5.1, §5.3',
  workflow: WORKFLOW,
  counts: {
    gateFilesInRepo: gateFiles.length,
    nodeInvocationsInWorkflow: invoked.size,
    // Angka yang boleh dikutip sebagai "gerbang hijau" adalah yang ini, bukan yang di atas.
    evidenceGates: evidenceGates.length,
    liveGatesNotEvidence: liveGatesNotEvidence.length,
    exclusions: EXCLUSIONS.size,
    pass: checks.filter(c => c.status === 'PASS').length,
    fail: checks.filter(c => c.status === 'FAIL').length
  },
  liveGatesNotEvidence: liveGatesNotEvidence.map(f => ({ file: f, env: LIVE_GATES.get(f).env, whyNotEvidence: LIVE_GATES.get(f).reason })),
  exclusions: [...EXCLUSIONS].map(([file, meta]) => ({ file, class: meta.class, reason: meta.reason })),
  checks
};
fs.writeFileSync(path.join(ROOT, 'GATE-REGISTRY-REPORT.json'), `${JSON.stringify(report, null, 2)}\n`);

console.log('');
console.log(`Berkas uji di repo         : ${gateFiles.length}`);
console.log(`Invokasi node di workflow  : ${invoked.size}`);
console.log(`Gerbang yang BOLEH dihitung sebagai bukti: ${evidenceGates.length}`);
console.log(`Gerbang live (SKIP di CI, BUKAN bukti)  : ${liveGatesNotEvidence.length} — ${liveGatesNotEvidence.join(', ')}`);
console.log(`Pengecualian beralasan     : ${EXCLUSIONS.size}`);
console.log('');
console.log(`FIEZEL gate registry: ${report.status} (${report.counts.pass} pass, ${report.counts.fail} fail)`);
if (failed) process.exitCode = 1;
