#!/usr/bin/env node
/* ================================================================================================
   BUKTI MERAH paket D2q — kueri dashboard owner vs skema D1 yang benar-benar ada.

   Gerbang yang tidak pernah dibuktikan bisa merah adalah dekorasi. Berkas ini menyuntikkan cacat
   SATU PER SATU ke berkas nyata, menjalankan gerbang, memastikan ia GAGAL, lalu memulihkan berkas
   dan memverifikasi sha256-nya kembali persis seperti sebelum disentuh.

   Cacat yang disuntikkan adalah cacat yang BENAR-BENAR terjadi di paket sebelumnya (kueri untuk
   tabel yang tidak ada), bukan cacat karangan yang mudah ditangkap.

   Jalankan: node tools/d2-queries-red-proof.js
   Tanpa jaringan. Tidak menulis apa pun secara permanen selain laporan JSON.
   ============================================================================================== */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const REPO = path.resolve(__dirname, '..');
const QUERIES = path.join(REPO, 'workers', 'owner', 'queries.js');
const INDEX = path.join(REPO, 'workers', 'owner', 'index.js');

const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');

function runGate(gate) {
  const r = spawnSync(process.execPath, [path.join(REPO, gate)], { cwd: REPO, encoding: 'utf8' });
  return { code: r.status, out: ((r.stdout || '') + (r.stderr || '')) };
}

// Setiap kasus: satu suntikan, satu gerbang yang HARUS merah, dan alasan mengapa cacat itu nyata.
const CASES = [
  {
    id: 'tabel_tidak_ada',
    file: QUERIES,
    from: 'FROM retention_daily\n',
    to: 'FROM retention_cohort\n',
    gate: 'd1-schema-contract-test.js',
    expect: 'owner_queries_tabel_ada_di_ddl',
    why: 'Ini CACAT ASLI paket sebelumnya: kueri menunjuk `retention_cohort`, tabel yang tidak '
      + 'pernah dibuat. Selama semua tabel kosong cacat ini tidak terlihat.'
  },
  {
    id: 'kolom_tidak_ada',
    file: QUERIES,
    from: 'SELECT COUNT(*) AS days_broken FROM metrics_daily',
    to: 'SELECT COUNT(*) AS days_broken, metric_name FROM metrics_daily',
    gate: 'd1-schema-contract-test.js',
    expect: 'owner_queries_kolom_ada_di_ddl',
    why: 'Kolom yang tidak ada di DDL hanya melempar SETELAH tabel berisi data.'
  },
  {
    id: 'tabel_terlarang',
    file: QUERIES,
    from: 'FROM usage_daily\n',
    to: 'FROM dau_dedup\n',
    gate: 'd1-schema-contract-test.js',
    expect: 'owner_queries_nol_tabel_di_luar_tiga_agregat',
    why: '`dau_dedup` ADA di database yang sama dan memuat token per-perangkat. Tanpa larangan '
      + 'eksplisit, membacanya tidak melanggar skema apa pun — hanya melanggar privasi.'
  },
  {
    id: 'metrik_tanpa_penulis',
    file: QUERIES,
    from: "const SERIES_METRICS = Object.freeze([\n  'dau',",
    to: "const SERIES_METRICS = Object.freeze([\n  'visitors',\n  'dau',",
    gate: 'd1-schema-contract-test.js',
    expect: 'setiap_metrik_owner_ditulis_jalur_server',
    why: 'Bentuk PANJANG menerima nama metrik APA PUN, jadi salah nama tidak pernah menghasilkan '
      + 'galat SQL. `visitors` adalah metrik yang dipakai queries.js versi lama dan tidak pernah '
      + 'ditulis siapa pun di workers/api/ — panelnya akan kosong selamanya tanpa satu pun galat.'
  },
  {
    id: 'sql_disambung',
    file: QUERIES,
    from: '  LATEST_DAY: \'SELECT MAX(day) AS day FROM metrics_daily\',',
    to: '  LATEST_DAY: \'SELECT MAX(day) AS day \'\n    + \'FROM metrics_daily\',',
    gate: 'd1-schema-contract-test.js',
    expect: 'owner_queries_tanpa_sambung_string',
    why: 'SQL yang dirakit dari potongan string membuat pemindai token hanya melihat pecahannya '
      + 'dan bisa mengaku hijau atas kueri yang tidak pernah ia baca utuh.'
  },
  {
    id: 'keadaan_dari_nilai',
    file: INDEX,
    from: 'const daysTotal = Number(start && start.days_total);',
    to: 'const daysTotal = Number(totals && totals.events_total);',
    gate: 'owner-dashboard-test.js',
    expect: 'belum ada pengukuran',
    why: 'Inti aturan #3: keadaan HARUS diputuskan dari jumlah hari terrollup. Memutuskannya dari '
      + 'nilai metrik membuat "nol terukur" tidak bisa dibedakan dari "belum ada pengukuran", '
      + 'karena COALESCE(...,0) mengirim keduanya sebagai angka identik.'
  },
  {
    id: 'empat_keadaan_jadi_tiga',
    file: INDEX,
    from: 'else if (!Number.isFinite(daysCounted) || daysCounted <= 0) state = STATE_NO_DATA_IN_PERIOD;',
    to: 'else if (!Number.isFinite(daysCounted) || daysCounted < 0) state = STATE_NO_DATA_IN_PERIOD;',
    gate: 'owner-dashboard-test.js',
    expect: 'belum ada pengukuran',
    why: 'Menghapus keadaan `no-data-in-period` membuat periode yang memang belum punya hari '
      + 'terrollup tampil sebagai TERUKUR dengan angka nol. Owner akan menyimpulkan pemakaian '
      + 'nol padahal yang benar adalah "kami belum mengukur apa-apa di rentang ini".'
  },
];

const results = [];
let allOk = true;

for (const c of CASES) {
  const before = sha(c.file);
  const src = fs.readFileSync(c.file, 'utf8');
  const hits = src.split(c.from).length - 1;
  if (hits < 1) {
    results.push({ id: c.id, status: 'GAGAL', sebab: 'pola suntikan tidak ditemukan: ' + c.from.slice(0, 60) });
    allOk = false;
    continue;
  }
  fs.writeFileSync(c.file, src.replace(c.from, c.to));
  const red = runGate(c.gate);
  fs.writeFileSync(c.file, src);
  const after = sha(c.file);

  const menjadiMerah = red.code !== 0;
  const alasanMuncul = red.out.includes(c.expect);
  const pulih = before === after;
  const ok = menjadiMerah && alasanMuncul && pulih;
  if (!ok) allOk = false;
  results.push({
    id: c.id,
    berkas: path.relative(REPO, c.file),
    gerbang: c.gate,
    exit_saat_disuntik: red.code,
    menjadi_merah: menjadiMerah,
    alasan_benar_muncul: alasanMuncul,
    penanda_dicari: c.expect,
    sha256_pulih: pulih,
    sha256: before,
    status: ok ? 'LULUS' : 'GAGAL',
    mengapa_cacat_ini_nyata: c.why,
  });
  console.error((ok ? 'MERAH OK  ' : 'BERMASALAH') + '  ' + c.id + '  → ' + c.gate
    + ' exit=' + red.code + (pulih ? ' (pulih)' : ' (TIDAK PULIH)'));
}

// Setelah semua pemulihan, gerbang WAJIB hijau kembali. Tanpa pemeriksaan ini, "pulih" hanya
// berarti berkasnya sama, bukan bahwa sistemnya sehat.
const hijauLagi = {};
for (const gate of ['d1-schema-contract-test.js', 'owner-dashboard-test.js']) {
  const r = runGate(gate);
  hijauLagi[gate] = r.code;
  if (r.code !== 0) allOk = false;
}

const report = {
  schema: 'fiezel-d2-queries-red-proof-v1',
  generated_at: new Date().toISOString(),
  total: results.length,
  lulus: results.filter((r) => r.status === 'LULUS').length,
  status: allOk ? 'PASS' : 'FAIL',
  hijau_setelah_pulih: hijauLagi,
  kasus: results,
};
fs.writeFileSync(path.join(REPO, 'reports', 'd2-queries-red-proof.json'), JSON.stringify(report, null, 2) + '\n');
console.error('\nd2-queries-red-proof: ' + report.status + ' ' + report.lulus + '/' + report.total);
if (!allOk) process.exitCode = 1;
