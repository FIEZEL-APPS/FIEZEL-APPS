#!/usr/bin/env node
/* deploy-site-gate-test.js — PENEGAK keselamatan unggahan situs produksi.
 *
 * KENAPA GERBANG INI ADA. Sampai audit rilis m025-179 (28 Agu 2026), repo ini TIDAK punya
 * satu pun mekanisme yang menerbitkan aplikasi ke `https://fiezel.my.id/app/` — nol scp, nol
 * rsync, nol FTP, nol deploy-pages di seluruh `.github/workflows/`. Yang ada hanya deploy
 * Worker Cloudflare. Padahal `workers/api/wrangler.toml` menulis "main auto-deploy ke produksi
 * tiap 5 menit" sebagai DASAR aturan produksi (fitur baru wajib di belakang flag OFF). Aturan
 * yang menumpu pada mekanisme yang tidak bisa ditunjukkan bukan aturan.
 *
 * `deploy-site.yml` menutup lubang itu. Gerbang ini menjaga agar penutupnya tidak melahirkan
 * lubang yang lebih besar. Tiga bahaya yang dijaga, semuanya BISA membuat murid memegang
 * aplikasi rusak:
 *
 *  (A) URUTAN UNGGAH. `sw.js` memanggil `caches.addAll(ASSETS)` atas 157 berkas. Kalau `sw.js`
 *      mendarat SEBELUM aset-asetnya, service worker generasi BARU mem-precache bita LAMA
 *      (atau 404) di bawah nama revisi baru — persis kondisi "shell tidak sepadan" yang
 *      dilarang audit rilis §22. Jadi `sw.js` WAJIB diunggah paling akhir, terpisah.
 *
 *  (B) KECUALIAN YANG MEMAKAN ASET. Satu pola di `deploy/site-exclude.txt` yang kebetulan
 *      menyapu berkas di dalam `ASSETS` membuat `addAll` GAGAL SELURUHNYA — bukan sebagian.
 *      Gerbang ini menjalankan daftar kecualian itu terhadap 157 entri ASSETS yang sebenarnya.
 *
 *  (C) PENJAGA AKTOR. Workflow ini memegang kredensial hosting. `workflow-actor-gate-test.js`
 *      sudah menuntut penjaga aktor tingkat job, tetapi gerbang itu tidak tahu apa-apa soal
 *      SYARAT MUTU: deploy hanya boleh jalan sesudah Quality Gate HIJAU. Itu diperiksa di sini.
 *
 * Nol jaringan: gerbang ini hanya membaca berkas repo, jadi ia aman di CI publik.
 */

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const baca = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const ada = (f) => fs.existsSync(path.join(ROOT, f));

const checks = [];
let gagal = false;
function check(name, ok, details) {
  checks.push({ name, status: ok ? 'PASS' : 'FAIL', details: details === undefined ? '' : String(details) });
  if (!ok) gagal = true;
}

const WF = '.github/workflows/deploy-site.yml';
const EXCL = 'deploy/site-exclude.txt';
const CPANEL = '.cpanel.yml';
const VERIFY = 'tools/deploy-site-verify.mjs';

/* ---------------------------------------------------------------- berkas ada ------------- */
check('workflow penerbit situs ada', ada(WF), WF);
check('daftar kecualian (satu sumber) ada', ada(EXCL), EXCL);
check('resep cPanel Git ada', ada(CPANEL), CPANEL);
check('pembukti penanda pasca-deploy ada', ada(VERIFY), VERIFY);
if (!ada(WF) || !ada(EXCL)) { selesai(); }

const wf = baca(WF);

/* ---------------------------------------------------------------- (B) kecualian ---------- */
/** Daftar ASSETS sw.js — sumber kebenaran tentang apa yang WAJIB ada di server. */
function assetsSW() {
  const m = /const ASSETS\s*=\s*\[([\s\S]*?)\];/.exec(baca('sw.js'));
  if (!m) return [];
  /* Komentar DI DALAM daftar harus dibuang lebih dulu. Ditemukan nyata: catatan locale
   * Thai di tengah ASSETS memuat kata berkutip ('th', 'voice'), dan ekstraktor naif
   * membacanya sebagai nama berkas lalu menuduh keduanya "tidak ada di repo". Yang salah
   * pemeriksanya, bukan repo-nya - persis kelas kesalahan yang membuat gerbang tidak
   * dipercaya. */
  const bersih = m[1].replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
  return [...bersih.matchAll(/'([^']+)'/g)].map((x) => x[1].replace(/^\.\//, '')).filter((p) => p !== '');
}

/** Terjemahan pola rsync -> penilaian "apakah path ini dibuang?". Sengaja SEDERHANA dan
 *  KONSERVATIF: kalau penilai ini salah, ia salah ke arah "dibuang", sehingga gerbang
 *  memerah lebih dulu daripada produksi rusak. */
function dibuang(pola, relPath) {
  const p = pola.trim();
  if (!p || p.startsWith('#')) return false;
  if (p.endsWith('/')) {                       // direktori, rekursif
    const dir = p.slice(0, -1);
    return relPath === dir || relPath.startsWith(dir + '/');
  }
  if (p.includes('*')) {                       // glob pada nama berkas, di kedalaman mana pun
    const rx = new RegExp('^' + p.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*') + '$');
    return relPath.split('/').some((seg) => rx.test(seg));
  }
  return relPath === p || relPath.split('/').includes(p);
}

const polaKecuali = baca(EXCL).split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
check('daftar kecualian tidak kosong', polaKecuali.length > 0, polaKecuali.length + ' pola');

const ASSETS = assetsSW();
check('daftar ASSETS sw.js terbaca dan besar', ASSETS.length >= 100, ASSETS.length + ' entri');

const dimakan = ASSETS.filter((a) => polaKecuali.some((p) => dibuang(p, a)));
check('B NOL entri ASSETS sw.js dibuang daftar kecualian (addAll gagal SELURUHNYA kalau satu 404)',
  dimakan.length === 0,
  dimakan.length ? dimakan.slice(0, 8).join(', ') : ASSETS.length + ' entri diperiksa terhadap ' + polaKecuali.length + ' pola');

const hilang = ASSETS.filter((a) => !ada(a));
check('B setiap entri ASSETS benar-benar ada di repo (kalau tidak, tidak akan pernah terunggah)',
  hilang.length === 0, hilang.slice(0, 8).join(', ') || ASSETS.length + ' entri ada');

/* Unggahan memakai `rsync --delete`. Berkas yang dikecualikan DILINDUNGI dari penghapusan,
 * jadi daftar kecualian merangkap daftar "jangan sentuh milik server". Kalau `.htaccess`
 * hilang dari daftar ini, deploy pertama menghapus aturan rewrite yang dipasang owner di
 * cPanel dan aplikasi berhenti melayani rute — tanpa satu pun gerbang lain bisa melihatnya. */
const MILIK_SERVER = ['.htaccess', '.well-known/x', 'cgi-bin/x', 'error_log'];
const tidakTerlindungi = MILIK_SERVER.filter((f) => !polaKecuali.some((p) => dibuang(p, f)));
check('B berkas milik server terlindungi dari rsync --delete (.htaccess dll)',
  tidakTerlindungi.length === 0,
  tidakTerlindungi.join(', ') || MILIK_SERVER.join(', ') + ' terlindungi');

/* Bita model neural (`vendor/`) TIDAK ada di ASSETS sw.js — ia punya lapisan cache sendiri —
 * sehingga cek ASSETS di atas BUTA terhadapnya. Padahal `fiezel-neural-voice-config.js`
 * memuatnya dari `./vendor/supertonic-3/`, jadi satu pola yang menyapunya membuat suara
 * neural mati di produksi tanpa satu pun gerbang lain menyadarinya. Ditemukan nyata: pola
 * telanjang `LICENSE` ikut membuang `vendor/supertonic-3/LICENSE`, yaitu menyajikan model
 * pihak ketiga tanpa lisensinya. */
const vendorFiles = require('child_process')
  .execSync('git ls-files vendor', { cwd: ROOT, encoding: 'utf8' })
  .trim().split('\n').filter(Boolean);
const vendorTerbuang = vendorFiles.filter((f) => polaKecuali.some((p) => dibuang(p, f)));
check('B NOL berkas vendor/ terbuang (model neural + lisensinya wajib ikut ke server)',
  vendorTerbuang.length === 0,
  vendorTerbuang.join(', ') || vendorFiles.length + ' berkas vendor diperiksa');

check('B validator.js TIDAK ikut terbuang walau namanya mirip gerbang',
  !polaKecuali.some((p) => dibuang(p, 'validator.js')),
  'ia ada di ASSETS sw.js dan benar-benar dimuat aplikasi');
check('B berkas gerbang uji MEMANG terbuang (kalau tidak, ratusan berkas CI ikut ke server murid)',
  polaKecuali.some((p) => dibuang(p, 'deploy-site-gate-test.js')) &&
  polaKecuali.some((p) => dibuang(p, 'reports/production-release-command-report.md')),
  'pola *-test.js dan reports/');

/* ---------------------------------------------------------------- (F) kecualian vs rujukan */
/* Cek ASSETS di atas hanya melihat 157 berkas precache. Aplikasi juga memuat berkas LAIN
 * secara malas (`design/` dipakai fiezel-splash.js dan fiezel-ui-sfx.js), dan berkas seperti
 * itu tidak akan pernah terlihat oleh cek ASSETS. Jadi cek ini melihat dari arah sebaliknya:
 * untuk SETIAP path teratas yang dikecualikan, apakah sumber aplikasi yang benar-benar
 * dikirim masih MERUJUKNYA sebagai string (fetch/src/href/import)? Kalau ya, kecualiannya
 * salah dan produksi akan 404 diam-diam.
 *
 * Rujukan di dalam KOMENTAR sengaja tidak dihitung: `app.js:359` menyebut "harness audit/dump
 * di node" sebagai prosa, bukan pemuatan. Yang dihitung hanya path di dalam tanda kutip. */
function sumberAplikasi() {
  /* Permukaan yang dipindai = apa yang aplikasi BENAR-BENAR muat untuk murid: entri ASSETS
   * service worker (berkas kode/konfigurasi), ditambah seluruh `features/`. Sengaja BUKAN
   * "semua berkas di repo": `design/redesign-v1/index.html` adalah mockup mandiri yang
   * menautkan dokumen pengembangan, dan artefak seperti `GATE-REGISTRY-REPORT.json` bahkan
   * tidak dilacak git. Keduanya bukan jalur yang pernah dilalui murid, dan memasukkannya
   * membuat gerbang ini berteriak pada hal yang tidak bisa merusak produksi. */
  const dariAssets = ASSETS.filter((a) => /\.(js|html|css|json)$/.test(a) && ada(a));
  const fitur = [];
  const sapu = (dir, depth) => {
    if (depth > 4 || !fs.existsSync(path.join(ROOT, dir))) return;
    for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
      const rel = dir + '/' + e.name;
      if (e.isDirectory()) sapu(rel, depth + 1);
      else if (/\.(js|css|json)$/.test(e.name)) fitur.push(rel);
    }
  };
  sapu('features', 0);
  return Array.from(new Set(dariAssets.concat(fitur)));
}
const SUMBER = sumberAplikasi();
check('F sumber aplikasi terbaca untuk pemindaian rujukan', SUMBER.length > 50, SUMBER.length + ' berkas');

const puncakKecuali = polaKecuali
  .filter((p) => p.endsWith('/') && !p.startsWith('.git') && p !== 'node_modules/')
  .map((p) => p.slice(0, -1))
  .filter((p) => !['deploy', 'coordination', 'tools', 'workers', 'reports'].includes(p));
const dirujuk = [];
for (const dir of puncakKecuali) {
  const rx = new RegExp('[\'"`]\\.?/?' + dir.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '/');
  const kena = SUMBER.filter((f) => rx.test(baca(f)));
  if (kena.length) dirujuk.push(dir + ' <- ' + kena.slice(0, 3).join(', '));
}
check('F NOL direktori terkecuali yang masih dirujuk sumber aplikasi (404 senyap di produksi)',
  dirujuk.length === 0, dirujuk.join(' | ') || puncakKecuali.join(', ') + ' diperiksa');
check('F design/ TIDAK dikecualikan — ia benar-benar dimuat splash dan SFX',
  !polaKecuali.some((p) => dibuang(p, 'design/x.png')),
  'pembeda antara "perkakas" dan "aset yang dipakai murid"');

/* ---------------------------------------------------------------- (A) urutan unggah ------ */
const iAset = wf.search(/FIEZEL_DEPLOY_STEP_ASSETS/);
const iSW = wf.search(/FIEZEL_DEPLOY_STEP_SW_LAST/);
check('A langkah unggah aset dan langkah unggah sw.js dua-duanya bernama penanda',
  iAset !== -1 && iSW !== -1, 'aset@' + iAset + ' sw@' + iSW);
check('A sw.js diunggah SESUDAH seluruh aset (urutan di berkas = urutan eksekusi)',
  iAset !== -1 && iSW !== -1 && iSW > iAset,
  'kalau terbalik, service worker baru mem-precache bita lama di bawah revisi baru');
check('A langkah aset MENGECUALIKAN sw.js secara eksplisit',
  /--exclude=(['"]?)(\.\/)?sw\.js\1/.test(wf) || /exclude[^\n]*\bsw\.js\b/.test(wf),
  'tanpa ini sw.js ikut gelombang pertama dan urutannya batal');

/* ---------------------------------------------------------------- (C) syarat mutu -------- */
check('C deploy hanya berjalan sesudah Quality Gate HIJAU',
  /workflow_run/.test(wf) && /conclusion\s*==\s*'success'/.test(wf),
  "workflow_run + conclusion == 'success'");
check('C workflow yang dipantau adalah gerbang mutu, bukan workflow sembarang',
  /workflows:\s*\[?\s*["']FIEZEL Quality Gate["']/.test(wf), 'FIEZEL Quality Gate');
check('C penjaga aktor owner terpasang tingkat job',
  /github\.actor\s*==\s*'FIEZEL-APPS'/.test(wf), 'sinkron dengan workflow-actor-gate-test.js');
check('C hanya cabang main yang diterbitkan',
  /branches:\s*\[?\s*main/.test(wf) || /head_branch\s*==\s*'main'/.test(wf), 'main saja');

/* ---------------------------------------------------------------- rahasia & SKIP jujur --- */
check('D kredensial HANYA datang dari secrets, tidak pernah dari berkas repo',
  !/(DEPLOY_SSH_KEY|FTP_PASS|DEPLOY_HOST)\s*[:=]\s*['"][^'"$]{3,}/.test(wf),
  'nol nilai literal di workflow');
check('D tanpa secret, workflow SKIP dengan alasan tertulis (bukan gagal, bukan diam)',
  /SKIP/.test(wf) && /GITHUB_STEP_SUMMARY/.test(wf),
  'pola yang sama dengan gerbang live quality.yml');
check('D pembuktian penanda dijalankan SESUDAH unggah, dan kegagalannya memerahkan deploy',
  wf.search(/deploy-site-verify\.mjs/) > iSW,
  'unggah yang tidak terbukti sampai bukan unggah yang selesai');

/* Sejak m025-195 ada jalur penerbitan KEDUA: `.cpanel.yml` dijalankan cPanel di hosting,
 * di luar GitHub Actions. Cek D di atas hanya menjaga jalur SSH — jalur yang, sampai owner
 * memasang empat secret, tidak pernah berjalan. Kalau tidak ada yang menjaga jalur cPanel,
 * repo kembali persis ke keadaan yang membuat audit m025-179 gagal membuktikan paritas:
 * bita berpindah, dan nol pihak membacanya kembali. */
const iTanpaKredensial = wf.search(/steps\.creds\.outputs\.ready\s*!=\s*'true'/);
const blokTanpaKredensial = iTanpaKredensial === -1 ? '' : wf.slice(iTanpaKredensial);
check('D2 produksi tetap DIBACA walau secret hosting belum ada (jalur cPanel terbit di luar workflow ini)',
  iTanpaKredensial !== -1 && /deploy-site-verify\.mjs/.test(blokTanpaKredensial),
  'penerbitan yang tidak pernah dibaca kembali bukan penerbitan yang terbukti');
check('D3 pembacaan tanpa-kredensial MENUNTUT bukti saat dijalankan tangan (Run workflow = gerbang)',
  /TUNTUT:\s*\$\{\{\s*github\.event_name\s*==\s*'workflow_dispatch'/.test(blokTanpaKredensial) &&
  /--page/.test(blokTanpaKredensial) && /--sw\b/.test(blokTanpaKredensial),
  'tombol yang hanya melapor tidak bisa dipakai sebagai bukti rilis');
check('D4 pada jalan otomatis ia melapor, tidak menuntut (merah yang tidak menunjuk cacat mengajari orang mengabaikan lampu)',
  /GITHUB_STEP_SUMMARY/.test(blokTanpaKredensial) && /exit 0/.test(blokTanpaKredensial),
  'laporan wajib tertulis, bukan senyap');

/* ---------------------------------------------------------------- cPanel sejalan --------- */
if (ada(CPANEL)) {
  const cp = baca(CPANEL);
  const cAset = cp.search(/FIEZEL_DEPLOY_STEP_ASSETS/);
  const cSW = cp.search(/FIEZEL_DEPLOY_STEP_SW_LAST/);
  check('E resep cPanel memakai URUTAN yang sama (aset dulu, sw.js terakhir)',
    cAset !== -1 && cSW !== -1 && cSW > cAset, 'aset@' + cAset + ' sw@' + cSW);
  check('E resep cPanel membaca daftar kecualian yang SAMA, bukan daftar kedua',
    cp.includes('site-exclude.txt'), EXCL);
}

selesai();

function selesai() {
  const pass = checks.filter((c) => c.status === 'PASS').length;
  fs.writeFileSync(path.join(ROOT, 'DEPLOY-SITE-GATE-REPORT.json'),
    JSON.stringify({ generatedAt: new Date().toISOString(), pass, fail: checks.length - pass, checks }, null, 2) + '\n');
  for (const c of checks) if (c.status === 'FAIL') console.log('  FAIL ' + c.name + ' :: ' + c.details);
  console.log('deploy-site-gate-test: ' + pass + '/' + checks.length + ' assert ' + (gagal ? 'ADA YANG FAIL' : 'PASS'));
  process.exit(gagal ? 1 : 0);
}
