#!/usr/bin/env node
/* coordination-guard-test.js — PENEGAK protokol koordinasi.
 *
 * KENAPA GERBANG INI ADA. `AGENTS-COORDINATION.md` sudah melarang tabrakan sejak v1.2, dan
 * pada 28 Agu 2026 dua jalur kerja tetap bertabrakan LIMA KALI dalam satu malam soal nomor
 * build (keduanya memilih m025-173, lalu keduanya m025-174). Akibatnya bukan cuma repot merge:
 * satu revisi service worker memayungi dua daftar precache berbeda, jadi sebagian murid
 * memegang shell cache campur. Pelajarannya: aturan yang tidak ditegakkan alat bukan aturan.
 *
 * Gerbang ini nol jaringan dan hanya membaca berkas repo, jadi ia bisa jalan di CI publik.
 *
 * YANG DIJAGA:
 *  (A) Tiga penanda build selaras dengan coordination/BUILD-VERSION.json.
 *  (B) Nomor build tidak pernah diketik langsung: arbiter tools/bump-build.mjs ada dan
 *      menyebut ketiga titiknya, sehingga "satu pintu" bukan cuma imbauan di dokumen.
 *  (C) CLAIMS.json sah bentuknya, dan NOL path bertumpang-tindih antar sesi berbeda di `active`.
 *  (D) Tidak ada klaim serakah (`.`, `/`, `*`) yang setara dengan tidak berkoordinasi.
 *  (E) NOL penanda konflik merge di berkas yang dilacak git. Malam ini penanda konflik sempat
 *      TER-COMMIT ke app.js, sw.js, dan satu berkas uji karena penyelesaian union otomatis.
 *  (F) Siaran master ada, menyebut prosedur P10, dan menyebut arbiter versi.
 *  (G) Artefak *-REPORT.json tidak dilacak git (ia regenerable dan jadi sumber konflik palsu).
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = __dirname;
const baca = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const ada = (f) => fs.existsSync(path.join(ROOT, f));

const checks = [];
let gagal = false;
function check(name, ok, details) {
  checks.push({ name, status: ok ? 'PASS' : 'FAIL', details: details === undefined ? '' : String(details) });
  if (!ok) gagal = true;
}

/* ---------------------------------------------------------------- (A) versi selaras ------ */
const SUMBER = 'coordination/BUILD-VERSION.json';
check('A sumber tunggal nomor build ada', ada(SUMBER), SUMBER);

let versiSumber = null;
if (ada(SUMBER)) {
  try {
    const j = JSON.parse(baca(SUMBER));
    versiSumber = j.version || null;
    check('A sumber tunggal menyebut versi berbentuk m025-<angka>',
      /^m025-\d+$/.test(String(versiSumber)), String(versiSumber));
    check('A sumber tunggal menyebut pemilik klaim dan alasannya',
      Boolean(j.claimedBy) && Boolean(j.reason) && String(j.reason).length >= 30,
      'claimedBy=' + String(j.claimedBy) + ' panjangAlasan=' + String(j.reason || '').length);
  } catch (e) {
    check('A sumber tunggal adalah JSON sah', false, e.message);
  }
}

const TITIK = [
  ['sw.js', /const SW_REV='(m025-\d+)/],
  ['core-config.js', /self\.FIEZEL_PAGE_BUILD='(m025-\d+)'/],
  ['features/neural-voice/fiezel-diag-panel.js', /var DIAG_BUILD = '(m025-\d+)'/]
];
const terpasang = {};
for (const [berkas, pola] of TITIK) {
  const m = ada(berkas) ? baca(berkas).match(pola) : null;
  terpasang[berkas] = m ? m[1] : null;
}
const nilai = Object.values(terpasang);
check('A tiga penanda build saling sama',
  nilai.every((v) => v && v === nilai[0]), JSON.stringify(terpasang));
check('A tiga penanda build sama dengan sumber tunggal',
  versiSumber !== null && nilai.every((v) => v === versiSumber),
  'sumber=' + String(versiSumber) + ' terpasang=' + JSON.stringify(terpasang));

/* ---------------------------------------------------------------- (B) arbiter ada -------- */
const ARB = 'tools/bump-build.mjs';
check('B arbiter nomor build ada', ada(ARB), ARB);
if (ada(ARB)) {
  const arb = baca(ARB);
  const menyebutSemua = TITIK.every(([berkas]) => arb.includes(berkas));
  check('B arbiter menulis KETIGA titik versi (bukan sebagian)', menyebutSemua,
    TITIK.map(([b]) => b + '=' + arb.includes(b)).join(' '));
  check('B arbiter mengambil dasar dari origin/main, bukan dari berkas lokal saja',
    /origin\/main/.test(arb) && /git fetch/.test(arb),
    'ini yang membuat dua sesi tidak memilih nomor yang sama');
  check('B arbiter menolak jalan tanpa alasan tertulis',
    /Alasan wajib/.test(arb), 'alasan masuk ke BUILD-VERSION.json supaya sesi lain tahu');
}

/* ---------------------------------------------------------------- (C)(D) klaim ----------- */
const KLAIM = 'coordination/CLAIMS.json';
check('C daftar klaim ada', ada(KLAIM), KLAIM);

function normal(p) {
  return String(p).replace(/^\.\//, '').replace(/^\/+/, '');
}
/* Dua path bertumpang-tindih kalau salah satunya prefiks direktori dari yang lain. */
function tumpang(a, b) {
  const x = normal(a);
  const y = normal(b);
  if (x === y) return true;
  if (x.endsWith('/') && y.startsWith(x)) return true;
  if (y.endsWith('/') && x.startsWith(y)) return true;
  return false;
}

if (ada(KLAIM)) {
  let j = null;
  try {
    j = JSON.parse(baca(KLAIM));
    check('C daftar klaim adalah JSON sah', true, 'ok');
  } catch (e) {
    check('C daftar klaim adalah JSON sah', false, e.message);
  }
  if (j) {
    const active = Array.isArray(j.active) ? j.active : null;
    check('C daftar klaim punya array `active`', active !== null, typeof j.active);

    if (active) {
      const bentukOk = active.every((e) =>
        e && typeof e.sesi === 'string' && e.sesi.length > 0 &&
        Array.isArray(e.paths) && e.paths.length > 0 &&
        typeof e.catatan === 'string' && e.catatan.length >= 10);
      check('C setiap klaim aktif punya sesi, paths, dan catatan yang berisi', bentukOk,
        active.map((e) => String(e && e.sesi) + ':' + ((e && e.paths) || []).length).join(' | '));

      /* (D) klaim serakah */
      const serakah = [];
      for (const e of active) {
        for (const p of (e.paths || [])) {
          const n = normal(p);
          if (n === '' || n === '.' || n === '/' || n === '*' || n === './') serakah.push(e.sesi + ' -> ' + p);
        }
      }
      check('D nol klaim serakah (mengklaim seluruh repo = tidak berkoordinasi)',
        serakah.length === 0, serakah.join(', ') || 'nol');

      /* (C) tumpang-tindih antar SESI BERBEDA */
      const bentrok = [];
      for (let i = 0; i < active.length; i++) {
        for (let k = i + 1; k < active.length; k++) {
          if (active[i].sesi === active[k].sesi) continue;
          for (const a of (active[i].paths || [])) {
            for (const b of (active[k].paths || [])) {
              if (tumpang(a, b)) bentrok.push(active[i].sesi + ' x ' + active[k].sesi + ' pada ' + a + ' / ' + b);
            }
          }
        }
      }
      check('C nol path diklaim dua sesi berbeda sekaligus', bentrok.length === 0,
        bentrok.join(' | ') || 'nol bentrok di ' + active.length + ' klaim aktif');

      /* Anti-vakum: mekanisme deteksinya sendiri harus terbukti bekerja, bukan hijau karena
       * daftarnya kebetulan pendek. Dua klaim palsu di bawah WAJIB terdeteksi bentrok. */
      const palsuA = { sesi: 'uji-A', paths: ['workers/api/'] };
      const palsuB = { sesi: 'uji-B', paths: ['workers/api/route-ai.js'] };
      const terdeteksi = palsuA.paths.some((a) => palsuB.paths.some((b) => tumpang(a, b)));
      check('C anti-vakum: pendeteksi tumpang-tindih benar-benar mendeteksi', terdeteksi,
        'workers/api/ vs workers/api/route-ai.js harus dinilai bentrok');
      const bukanBentrok = tumpang('workers/api/', 'features/quota/quota-copy.js');
      check('C anti-vakum: pendeteksi tidak menuduh path yang memang berbeda', !bukanBentrok,
        'workers/api/ vs features/quota/quota-copy.js harus dinilai aman');
    }
  }
}

/* ---------------------------------------------------------------- (E) penanda konflik ---- */
let dilacak = [];
try {
  dilacak = execSync('git ls-files', { cwd: ROOT, encoding: 'utf8', timeout: 60000 })
    .split('\n').map((s) => s.trim()).filter(Boolean);
} catch (e) {
  check('E daftar berkas terlacak bisa dibaca', false, e.message);
}

const EKST = /\.(js|mjs|cjs|json|yml|yaml|md|css|html|php|py|sql)$/i;
const berpenanda = [];
for (const f of dilacak) {
  if (!EKST.test(f)) continue;
  // Berkas ini sendiri MEMUAT pola penanda sebagai literal untuk mendeteksinya; kalau ia
  // memeriksa dirinya sendiri, gerbang akan menuduh diri sendiri. Itu satu-satunya pengecualian.
  if (f === 'coordination-guard-test.js') continue;
  let isi;
  try {
    isi = fs.readFileSync(path.join(ROOT, f), 'utf8');
  } catch {
    continue;
  }
  const kepala = '<<<<' + '<<<';
  const kaki = '>>>>' + '>>>';
  if (new RegExp('^' + kepala + ' ', 'm').test(isi) || new RegExp('^' + kaki + ' ', 'm').test(isi)) {
    berpenanda.push(f);
  }
}
check('E nol penanda konflik merge di berkas terlacak', berpenanda.length === 0,
  berpenanda.join(', ') || (dilacak.length + ' berkas terlacak dipindai'));

/* ---------------------------------------------------------------- (F) siaran ------------- */
const SIARAN = 'MASTER-BROADCAST.md';
check('F siaran master ada', ada(SIARAN), SIARAN);
if (ada(SIARAN)) {
  const s = baca(SIARAN);
  check('F siaran menyebut prosedur P10 untuk tabrakan', /P10/.test(s), 'kata kunci P10');
  check('F siaran menyebut arbiter versi, bukan cuma melarang', /tools\/bump-build\.mjs/.test(s), ARB);
  check('F siaran menyebut langkah Python release-audit yang pernah lolos ke CI',
    /release-audit\.py/.test(s),
    'gerbang node saja tidak menangkap langkah Python; itu yang memerahkan CI 28 Agu');
  check('F siaran tidak memaku nomor build (angka pasti jadi basi)',
    !/m025-1\d\d/.test(s.replace(/`[^`]*`/g, '')),
    'nomor build harus dibaca dari BUILD-VERSION.json');
}

/* ---------------------------------------------------------------- (G) artefak ------------ */
const artefakTerlacak = dilacak.filter((f) => /-REPORT\.json$/.test(f));
check('G artefak *-REPORT.json tidak dilacak git',
  artefakTerlacak.length === 0,
  artefakTerlacak.length ? artefakTerlacak.slice(0, 8).join(', ') + (artefakTerlacak.length > 8 ? ' (+' + (artefakTerlacak.length - 8) + ')' : '') : 'nol');

/* ---------------------------------------------------------------- laporan ---------------- */
const laporan = {
  gate: 'coordination-guard-test',
  status: gagal ? 'FAIL' : 'PASS',
  versi: { sumber: versiSumber, terpasang },
  jumlah: { total: checks.length, pass: checks.filter((c) => c.status === 'PASS').length },
  checks
};
fs.writeFileSync(path.join(ROOT, 'COORDINATION-GUARD-REPORT.json'), JSON.stringify(laporan, null, 2) + '\n');

for (const c of checks) if (c.status === 'FAIL') console.log('  MERAH ' + c.name + ' — ' + c.details);
console.log('coordination-guard-test: ' + laporan.jumlah.pass + '/' + laporan.jumlah.total + ' assert PASS');
if (gagal) {
  console.error('coordination-guard-test GAGAL — baca MASTER-BROADCAST.md, khususnya prosedur P10.');
  process.exit(1);
}
