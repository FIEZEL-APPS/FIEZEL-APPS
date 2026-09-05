const __fzRoot = require('path').join(__dirname, '..'); /* m025-254: berkas ini pindah dari root ke tests/. __dirname dulu BERARTI root repo, dan puluhan gerbang memakainya untuk menunjuk berkas produksi - alias ini menjaga makna itu tetap benar tanpa menyunting setiap pemakaian. */
/**
 * FIEZEL gerbang — `workers/api/tools/attach-live-bindings-core.mjs`, skrip yang
 * dijalankan Owner MANUAL SEKALI (bukan CI) untuk menempel ID D1/KV live ke
 * `workers/api/wrangler.toml` sebelum `wrangler deploy` pertama, mis. sesudah
 * `fiezel-evidence` baru dibuat di akun.
 *
 * Yang dibuktikan:
 *  A. ANTI-STAGING — pencocokan nama EKSAK: `fiezel-core-staging` di akun tidak
 *     pernah tersubstitusi ke binding `CORE_DB` walau nama itu berbeda satu
 *     akhiran dan berdekatan di listing. Kalau ini gagal, gateway murid bisa
 *     menulis identitas ke database staging tanpa satu pun error.
 *  B. WAJIB — CORE_DB/STATS_DB absen di akun -> lempar, tidak menulis apa pun.
 *  C. OPSIONAL — LEARNING_DB/EVIDENCE_DB absen -> blok dilepas, binding lain utuh.
 *  D. CFG AMBIGU — nol atau lebih dari satu kandidat KV "*CFG*" -> lempar,
 *     bukan menebak salah satu.
 *  E. PENJAGA — placeholder yang tersisa (skenario `wrangler.toml` berubah
 *     bentuk) tetap melempar, bukan lolos diam.
 */
const path = require('path');
const { execSync } = require('child_process');

let failed = false;
function check(name, ok, detail) {
  if (ok) console.log(`ok - ${name}`);
  else { failed = true; console.error(`FAIL - ${name} :: ${String(detail ?? '')}`); }
}

const TOML = require('fs').readFileSync(path.join(__fzRoot, 'workers', 'api', 'wrangler.toml'), 'utf8');

// Modul ESM: jalankan lewat --input-type=module supaya gerbang ini tetap CJS
// seperti gerbang lain di root repo, tanpa mengubah package.json.
function loadCore() {
  const script = `
    import { computeAttachedToml, AttachError } from ${JSON.stringify(path.join(__fzRoot, 'workers', 'api', 'tools', 'attach-live-bindings-core.mjs'))};
    globalThis.__attach = { computeAttachedToml, AttachError };
  `;
  // vm ESM dynamic import via data: URL, dieksekusi di proses ini lewat top-level await.
  return import(path.join(__fzRoot, 'workers', 'api', 'tools', 'attach-live-bindings-core.mjs'));
}

async function main() {
  const { computeAttachedToml, AttachError } = await loadCore();

  const d1Full = [
    { name: 'fiezel-core', uuid: 'core-live-1111' },
    { name: 'fiezel-stats', uuid: 'stats-live-2222' },
    { name: 'fiezel-core-staging', uuid: 'core-STAGING-9999' },
    { name: 'fiezel-stats-staging', uuid: 'stats-STAGING-8888' },
    { name: 'fiezel-learning', uuid: 'learn-live-3333' },
    { name: 'fiezel-evidence', uuid: 'evi-live-4444' },
  ];
  const kvFull = [{ title: 'fiezel-api-CFG', id: 'cfg-live-5555' }];

  /* ===================== A. ANTI-STAGING ===================== */
  {
    const { toml } = computeAttachedToml(TOML, d1Full, kvFull);
    check('A · CORE_DB terisi ID produksi', toml.includes('"core-live-1111"'));
    check('A · CORE_DB TIDAK terisi ID staging', !toml.includes('"core-STAGING-9999"'));
    check('A · STATS_DB terisi ID produksi', toml.includes('"stats-live-2222"'));
    check('A · STATS_DB TIDAK terisi ID staging', !toml.includes('"stats-STAGING-8888"'));
    check('A · UUID staging tidak muncul sama sekali di hasil', !toml.includes('STAGING'));
  }

  /* ===================== A2. staging didaftar LEBIH DULU di listing — urutan tidak boleh menang atas nama persis */
  {
    const d1Reordered = [
      { name: 'fiezel-core-staging', uuid: 'core-STAGING-9999' },
      { name: 'fiezel-core', uuid: 'core-live-1111' },
      { name: 'fiezel-stats-staging', uuid: 'stats-STAGING-8888' },
      { name: 'fiezel-stats', uuid: 'stats-live-2222' },
      { name: 'fiezel-learning', uuid: 'learn-live-3333' },
      { name: 'fiezel-evidence', uuid: 'evi-live-4444' },
    ];
    const { toml } = computeAttachedToml(TOML, d1Reordered, kvFull);
    check('A2 · urutan listing tidak memengaruhi hasil: tetap ID produksi', toml.includes('"core-live-1111"') && toml.includes('"stats-live-2222"'));
    check('A2 · staging tetap tidak lolos walau didaftar lebih dulu', !toml.includes('STAGING'));
  }

  /* ===================== B. WAJIB ===================== */
  for (const hilang of ['fiezel-core', 'fiezel-stats']) {
    const d1 = d1Full.filter((d) => d.name !== hilang);
    let threw = null;
    try { computeAttachedToml(TOML, d1, kvFull); } catch (e) { threw = e; }
    check(`B · ${hilang} absen -> melempar AttachError`, threw instanceof AttachError, threw);
    check(`B · pesan error menyebut nama database`, threw && threw.message.includes(hilang));
  }

  /* ===================== C. OPSIONAL ===================== */
  for (const [absen, tetangga] of [['fiezel-evidence', 'fiezel-learning'], ['fiezel-learning', 'fiezel-evidence']]) {
    const d1 = d1Full.filter((d) => d.name !== absen);
    const { toml, applied } = computeAttachedToml(TOML, d1, kvFull);
    check(`C · ${absen} absen -> sukses tanpa melempar`, typeof toml === 'string');
    check(`C · ${absen} absen -> blok binding-nya lepas`, !new RegExp(`binding\\s*=\\s*"${absen === 'fiezel-evidence' ? 'EVIDENCE_DB' : 'LEARNING_DB'}"`).test(toml));
    const idTetangga = d1Full.find((d) => d.name === tetangga).uuid;
    check(`C · ${absen} absen -> tetangga ${tetangga} tetap terisi`, toml.includes(`"${idTetangga}"`));
    check(`C · ${absen} absen -> binding wajib tetap utuh`, toml.includes('"core-live-1111"') && toml.includes('"stats-live-2222"'));
    check(`C · ${absen} absen -> log menyebut lane tetap mati`, applied.some((l) => l.includes('fail-closed')));
  }

  /* ===================== D. CFG AMBIGU ===================== */
  {
    let threw = null;
    try { computeAttachedToml(TOML, d1Full, []); } catch (e) { threw = e; }
    check('D · nol kandidat CFG -> melempar (bukan menulis toml rusak)', threw instanceof AttachError, threw);
  }
  {
    // Dua kandidat yang SAMA-SAMA bukan staging -> tetap ambigu, tetap melempar.
    const kvDobel = [{ title: 'fiezel-api-CFG', id: 'a' }, { title: 'fiezel-web-CFG', id: 'b' }];
    let threw = null;
    try { computeAttachedToml(TOML, d1Full, kvDobel); } catch (e) { threw = e; }
    check('D · dua kandidat produksi CFG -> melempar (tidak menebak salah satu)', threw instanceof AttachError, threw);
  }
  {
    // Skenario nyata yang dialami Owner: `fiezel-CFG` + `fiezel-CFG-staging` di akun
    // yang sama. Staging disingkirkan otomatis, hanya produksi yang tersisa -> sukses.
    const kvStagingBerdampingan = [{ title: 'fiezel-CFG', id: 'cfg-prod-9999' }, { title: 'fiezel-CFG-staging', id: 'cfg-STAGING-8888' }];
    const { toml } = computeAttachedToml(TOML, d1Full, kvStagingBerdampingan);
    check('D2 · fiezel-CFG + fiezel-CFG-staging -> otomatis pilih yang produksi', toml.includes('"cfg-prod-9999"'));
    check('D2 · UUID staging tidak pernah masuk ke hasil', !toml.includes('cfg-STAGING-8888'));
  }

  /* ===================== E. PENJAGA placeholder tersisa ===================== */
  {
    const tomlRusak = TOML + '\n[[d1_databases]]\nbinding       = "FUTURE_DB"\ndatabase_name = "fiezel-future"\ndatabase_id   = "<isi setelah: wrangler d1 create fiezel-future>"\n';
    let threw = null;
    try { computeAttachedToml(tomlRusak, d1Full, kvFull); } catch (e) { threw = e; }
    check('E · placeholder tak dikenal -> melempar, bukan lolos diam', threw instanceof AttachError, threw);
  }

  console.log(failed ? 'attach-live-bindings-test: FAIL' : 'attach-live-bindings-test: PASS');
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
