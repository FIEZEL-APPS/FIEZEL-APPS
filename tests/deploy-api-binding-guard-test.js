const __fzRoot = require('path').join(__dirname, '..'); /* m025-254: berkas ini pindah dari root ke tests/. __dirname dulu BERARTI root repo, dan puluhan gerbang memakainya untuk menunjuk berkas produksi - alias ini menjaga makna itu tetap benar tanpa menyunting setiap pemakaian. */
/**
 * FIEZEL gerbang — SUBSTITUSI BINDING saat deploy `fiezel-api`.
 *
 * Kenapa berkas ini ada. `.github/workflows/deploy-api-worker.yml` menyimpan satu
 * skrip Node sebaris (heredoc `node <<'JS'`) yang menukar placeholder
 * `<isi setelah: ...>` di `workers/api/wrangler.toml` dengan ID binding dari worker
 * `fiezel-api` yang SEDANG live, lalu menutup dengan penjaga keras:
 *
 *     if (toml.includes('<isi setelah')) { ...; process.exit(1); }
 *
 * Penjaga itu benar, tetapi ia hanya berbunyi SAAT DEPLOY — di jalur di mana satu-
 * satunya korbannya adalah gateway yang dipakai murid. Setiap kali seseorang menambah
 * blok binding baru ber-placeholder ke `wrangler.toml` tanpa menambah cabangnya di
 * workflow, deploy fiezel-api berikutnya jatuh, dan barulah orang tahu. Persis itu
 * yang terjadi pada `EVIDENCE_DB` (PR #304).
 *
 * Gerbang ini memindahkan bunyi itu ke CI. Ia MENJALANKAN skrip yang sama —
 * diekstrak apa adanya dari workflow, bukan disalin — di atas `wrangler.toml` yang
 * sama, dengan `fs`/`process` tiruan, lalu membuktikan:
 *
 *  A. LENGKAP    — dengan HANYA tiga binding wajib yang live (skenario akun baru),
 *                  skrip tetap sukses: setiap placeholder opsional punya cabangnya.
 *                  Inilah cacat #304, dan bab ini membuatnya mustahil terulang diam.
 *  B. WAJIB      — CORE_DB/STATS_DB/CFG absen = exit 1. Fail-closed tetap fail-closed.
 *  C. SUBSTITUSI — saat binding live ADA, ID-nya benar-benar masuk ke toml.
 *  D. PELEPASAN  — saat binding opsional TIDAK ada, hanya bloknya yang lepas; blok
 *                  tetangga (dan binding wajib) utuh.
 *  E. ROUTES     — blok routes selalu dilepas (token CI tanpa izin zona).
 *  F. PENJAGA    — penjaga placeholder itu sendiri masih hidup: toml yang menyisakan
 *                  placeholder tak dikenal HARUS exit 1, bukan lolos.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = __fzRoot;
const WORKFLOW = path.join(root, '.github', 'workflows', 'deploy-api-worker.yml');
const TOML = path.join(root, 'workers', 'api', 'wrangler.toml');

let failed = false;
function check(name, ok, detail) {
  if (ok) console.log(`ok - ${name}`);
  else { failed = true; console.error(`FAIL - ${name} :: ${String(detail ?? '')}`); }
}

/* ==========================================================================
 * Ekstraksi skrip dari workflow (bukan salinan: kalau workflow berubah, uji
 * ini ikut berubah, dan itu memang yang diinginkan)
 * ========================================================================== */
function extractScript() {
  const lines = fs.readFileSync(WORKFLOW, 'utf8').split('\n');
  const start = lines.findIndex(l => l.includes("node <<'JS'"));
  if (start < 0) throw new Error("heredoc `node <<'JS'` tidak ditemukan di deploy-api-worker.yml");
  const body = [];
  for (let i = start + 1; i < lines.length; i++) {
    if (lines[i].trim() === 'JS') return body.join('\n');
    body.push(lines[i]);
  }
  throw new Error('penutup heredoc JS tidak ditemukan');
}

const SCRIPT = extractScript();

/**
 * Jalankan skrip dengan fs/process tiruan.
 * bindings: daftar binding "worker live". toml: isi wrangler.toml masukan.
 * Mengembalikan { exit, out, err, log } — `out` = toml yang ditulis (null bila exit).
 */
function run(bindings, toml) {
  const EXIT = Symbol('exit');
  const res = { exit: 0, out: null, err: [], log: [] };
  const fakeFs = {
    readFileSync(p) {
      if (String(p).endsWith('settings.json')) return JSON.stringify({ result: { bindings } });
      if (String(p).endsWith('wrangler.toml')) return toml;
      throw new Error(`baca tak terduga: ${p}`);
    },
    writeFileSync(p, data) {
      if (!String(p).endsWith('wrangler.toml')) throw new Error(`tulis tak terduga: ${p}`);
      res.out = data;
    },
  };
  const ctx = {
    require: name => {
      if (name === 'fs') return fakeFs;
      throw new Error(`require tak terduga: ${name}`);
    },
    console: { log: (...a) => res.log.push(a.join(' ')), error: (...a) => res.err.push(a.join(' ')) },
    process: { exit: code => { res.exit = code; throw EXIT; } },
  };
  try {
    vm.runInNewContext(SCRIPT, vm.createContext(ctx), { filename: 'deploy-api-worker.yml:JS' });
  } catch (e) {
    if (e !== EXIT) throw e;
  }
  return res;
}

const d1 = (name, id) => ({ name, type: 'd1', database_id: id });
const kv = (name, id) => ({ name, type: 'kv_namespace', namespace_id: id });

const WAJIB = [d1('CORE_DB', 'core-1111'), d1('STATS_DB', 'stats-2222'), kv('CFG', 'cfg-3333')];
const OPSIONAL = [d1('LEARNING_DB', 'learn-4444'), d1('EVIDENCE_DB', 'evi-5555')];

const tomlRepo = fs.readFileSync(TOML, 'utf8');

/* ==========================================================================
 * A. LENGKAP — akun baru: hanya binding wajib yang live
 * ========================================================================== */
{
  const r = run(WAJIB.slice(), tomlRepo);
  check(
    'A · hanya binding wajib live -> deploy TIDAK jatuh (setiap placeholder opsional punya cabang)',
    r.exit === 0 && r.out !== null,
    `exit=${r.exit} err=${r.err.join(' | ')}`,
  );
  check(
    'A · tidak ada placeholder tersisa saat semua binding opsional absen',
    r.out !== null && !r.out.includes('<isi setelah'),
    r.out && r.out.split('\n').filter(l => l.includes('<isi setelah')).join(' | '),
  );
  // Daftar placeholder yang benar-benar ada di repo hari ini, satu per satu:
  // ini yang membuat penambahan blok baru tanpa cabang langsung MEMERAH di sini.
  const placeholders = [...tomlRepo.matchAll(/<isi setelah:[^>]*>/g)].map(m => m[0]);
  check('A · wrangler.toml memang memakai placeholder (uji tidak kosong)', placeholders.length >= 5, placeholders.length);
  for (const ph of placeholders) {
    check(
      `A · placeholder tertangani tanpa binding live: ${ph}`,
      r.out !== null && !r.out.includes(ph),
      'skrip deploy tidak punya cabang untuk placeholder ini',
    );
  }
}

/* ==========================================================================
 * B. WAJIB — fail-closed
 * ========================================================================== */
for (const hilang of ['CORE_DB', 'STATS_DB', 'CFG']) {
  const bindings = WAJIB.concat(OPSIONAL).filter(b => b.name !== hilang);
  const r = run(bindings, tomlRepo);
  check(
    `B · binding wajib ${hilang} absen -> exit 1 (bukan deploy setengah jadi)`,
    r.exit === 1 && r.out === null && r.err.join(' ').includes(hilang),
    `exit=${r.exit} out=${r.out === null ? 'null' : 'ditulis'} err=${r.err.join(' | ')}`,
  );
}

/* ==========================================================================
 * C. SUBSTITUSI — ID live benar-benar masuk
 * ========================================================================== */
{
  const r = run(WAJIB.concat(OPSIONAL), tomlRepo);
  check('C · semua binding live -> sukses', r.exit === 0 && r.out !== null, `exit=${r.exit} err=${r.err.join(' | ')}`);
  for (const b of WAJIB.concat(OPSIONAL)) {
    const idv = b.database_id || b.namespace_id;
    check(`C · ID live ${b.name} masuk ke wrangler.toml`, r.out !== null && r.out.includes(`"${idv}"`), idv);
  }
  check('C · tidak ada placeholder tersisa saat semua binding live', r.out !== null && !r.out.includes('<isi setelah'));
  check(
    'C · semua blok d1_databases utuh saat semua binding live',
    r.out !== null && (r.out.match(/\[\[d1_databases\]\]/g) || []).length === (tomlRepo.match(/\[\[d1_databases\]\]/g) || []).length,
  );
}

/* ==========================================================================
 * D. PELEPASAN — hanya blok yang absen yang lepas
 * ========================================================================== */
for (const [absen, hadir] of [['EVIDENCE_DB', 'LEARNING_DB'], ['LEARNING_DB', 'EVIDENCE_DB']]) {
  const bindings = WAJIB.concat(OPSIONAL.filter(b => b.name !== absen));
  const r = run(bindings, tomlRepo);
  const jumlahAwal = (tomlRepo.match(/\[\[d1_databases\]\]/g) || []).length;
  check(`D · ${absen} absen -> sukses`, r.exit === 0 && r.out !== null, `exit=${r.exit} err=${r.err.join(' | ')}`);
  check(
    `D · ${absen} absen -> binding ${absen} lepas dari toml`,
    r.out !== null && !r.out.includes(`binding       = "${absen}"`) && !r.out.includes(`binding      = "${absen}"`),
  );
  check(
    `D · ${absen} absen -> blok tetangga ${hadir} TETAP ada dengan ID live-nya`,
    r.out !== null && r.out.includes(`"${hadir}"`) && r.out.includes(`"${OPSIONAL.find(b => b.name === hadir).database_id}"`),
  );
  check(
    `D · ${absen} absen -> binding wajib (CORE_DB/STATS_DB) tidak ikut terlepas`,
    r.out !== null && r.out.includes('"CORE_DB"') && r.out.includes('"STATS_DB"'),
  );
  check(
    `D · ${absen} absen -> tepat SATU blok d1_databases yang lepas`,
    r.out !== null && (r.out.match(/\[\[d1_databases\]\]/g) || []).length === jumlahAwal - 1,
  );
  check(
    `D · ${absen} absen -> alasannya tercatat sebagai komentar di toml hasil`,
    r.out !== null && new RegExp(`^# \\(blok ${absen} dilepas saat deploy`, 'm').test(r.out),
  );
  check(
    `D · ${absen} absen -> log deploy menyebutkan lane tetap mati (fail-closed)`,
    r.log.some(l => l.includes(absen) && l.includes('fail-closed')),
    r.log.join(' | '),
  );
}

/* ==========================================================================
 * D2. Kedua lane opsional absen sekaligus — dua pelepasan tidak saling makan
 * ========================================================================== */
{
  const r = run(WAJIB.slice(), tomlRepo);
  const jumlahAwal = (tomlRepo.match(/\[\[d1_databases\]\]/g) || []).length;
  check(
    'D2 · LEARNING_DB + EVIDENCE_DB absen -> tepat DUA blok yang lepas, wajib utuh',
    r.exit === 0 && r.out !== null &&
      (r.out.match(/\[\[d1_databases\]\]/g) || []).length === jumlahAwal - 2 &&
      r.out.includes('"CORE_DB"') && r.out.includes('"STATS_DB"') && r.out.includes('"cfg-3333"'),
    `exit=${r.exit}`,
  );
}

/* ==========================================================================
 * E. ROUTES selalu dilepas
 * ========================================================================== */
{
  const r = run(WAJIB.concat(OPSIONAL), tomlRepo);
  check(
    'E · blok routes dilepas (token CI tanpa izin Zone->Workers Routes)',
    r.out !== null && !/^routes\s*=/m.test(r.out) && r.out.includes('blok routes dilepas saat deploy'),
  );
  check(
    'E · wrangler.toml di repo memang masih punya blok routes (uji tidak kosong)',
    /^routes\s*=/m.test(tomlRepo),
  );
}

/* ==========================================================================
 * F. PENJAGA placeholder masih hidup
 * ========================================================================== */
{
  const toml = tomlRepo + '\n[[d1_databases]]\nbinding       = "FUTURE_DB"\ndatabase_name = "fiezel-future"\ndatabase_id   = "<isi setelah: wrangler d1 create fiezel-future>"\n';
  const r = run(WAJIB.concat(OPSIONAL), toml);
  check(
    'F · placeholder tak dikenal -> exit 1 (penjaga tidak boleh pernah dilunakkan)',
    r.exit === 1 && r.out === null && r.err.join(' ').includes('placeholder'),
    `exit=${r.exit} err=${r.err.join(' | ')}`,
  );
}

/* ==========================================================================
 * F2. Blok opsional yang hilang dari toml tetap gagal keras (regex pelepasan
 *     tidak boleh diam-diam no-op saat seseorang mengubah bentuk blok)
 * ========================================================================== */
for (const nama of ['LEARNING_DB', 'EVIDENCE_DB']) {
  const toml = tomlRepo.replace(new RegExp(`binding\\s*=\\s*"${nama}"`), 'binding       = "SOMETHING_ELSE"');
  const bindings = WAJIB.concat(OPSIONAL.filter(b => b.name !== nama));
  const r = run(bindings, toml);
  check(
    `F2 · blok ${nama} tak berbentuk seperti yang diharapkan -> exit 1, bukan lolos diam`,
    r.exit === 1 && r.out === null,
    `exit=${r.exit} err=${r.err.join(' | ')}`,
  );
}

console.log(failed ? 'deploy-api-binding-guard-test: FAIL' : 'deploy-api-binding-guard-test: PASS');
process.exit(failed ? 1 : 0);
