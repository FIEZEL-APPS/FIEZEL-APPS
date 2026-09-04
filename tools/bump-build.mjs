#!/usr/bin/env node
/* bump-build.mjs — ARBITER NOMOR BUILD.
 *
 * MASALAH YANG DITUTUP DI SINI, dengan bukti dari lapangan 28 Agu 2026: dalam satu malam
 * dua jalur kerja bertabrakan LIMA KALI karena masing-masing MENGETIK nomor build sendiri
 * ke sw.js, core-config.js, dan fiezel-diag-panel.js. Keduanya memilih m025-173, lalu
 * keduanya memilih m025-174. Akibatnya bukan cuma repot merge: satu revisi service worker
 * memayungi DUA daftar precache berbeda, jadi sebagian murid memegang shell cache campur.
 *
 * AGENTS-COORDINATION.md sudah melarang tabrakan sejak v1.2, dan tabrakan tetap terjadi.
 * Aturan yang tidak ditegakkan alat bukan aturan. Jadi nomor build sekarang punya satu
 * sumber (coordination/BUILD-VERSION.json) dan satu pintu (berkas ini).
 *
 * KENAPA INI MENYELESAIKAN TABRAKAN, bukan cuma memindahkannya: dua sesi yang menaikkan
 * versi bersamaan tetap bertabrakan - tetapi konfliknya jatuh di berkas JSON delapan baris
 * yang isinya cuma nomor dan pemilik. Itu konflik yang bisa dibaca dan diselesaikan dalam
 * satu menit, bukan konflik di sw.js/style.css/app.js yang harus dibaca ratusan baris dan
 * bisa membuang pekerjaan orang lain kalau salah pilih sisi.
 *
 * Pakai: node tools/bump-build.mjs "alasan singkat"        (naikkan dari origin/main)
 *        node tools/bump-build.mjs --check                  (hanya periksa keselarasan)
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SUMBER = path.join(ROOT, 'coordination/BUILD-VERSION.json');

const TITIK = [
  { berkas: 'sw.js', pola: /(const SW_REV=')(m025-\d+)([^']*)(')/, gantiKe: 2 },
  { berkas: 'core-config.js', pola: /(self\.FIEZEL_PAGE_BUILD=')(m025-\d+)(')/, gantiKe: 2 },
  { berkas: 'features/neural-voice/fiezel-diag-panel.js', pola: /(var DIAG_BUILD = ')(m025-\d+)(')/, gantiKe: 2 }
];

const baca = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const nomor = (v) => Number(String(v).replace(/^m025-/, ''));

function versiTerpasang() {
  const hasil = {};
  for (const t of TITIK) {
    const m = baca(t.berkas).match(t.pola);
    hasil[t.berkas] = m ? m[t.gantiKe] : null;
  }
  return hasil;
}

function versiSumber() {
  return JSON.parse(fs.readFileSync(SUMBER, 'utf8')).version;
}

/* SIAPA yang memegang nomor ini. Sebelum m025-249 alat ini menulis version/claimedAt/reason
 * tapi TIDAK PERNAH menulis claimedBy, jadi field itu membawa nama pengklaim LAMA selamanya:
 * m025-249 tercatat atas nama sesi yang sebenarnya mengklaim m025-248. coordination-guard-test
 * hanya memeriksa field itu ADA, bukan benar - jadi kebohongannya hijau, dan sesi berikutnya
 * yang mencari "siapa yang sedang memegang nomor ini" diarahkan ke branch yang salah.
 *
 * Namanya diambil dari cabang git karena itu satu-satunya identitas yang benar-benar dimiliki
 * pemanggilnya tanpa harus diketik (dan diketik berarti kadang tidak diketik). FIEZEL_BUILD_CLAIMER
 * menimpanya untuk pemanggil yang punya nama lebih berarti daripada nama cabang. */
function pengklaim() {
  if (process.env.FIEZEL_BUILD_CLAIMER) return String(process.env.FIEZEL_BUILD_CLAIMER).trim();
  try {
    const cabang = execSync('git rev-parse --abbrev-ref HEAD', {
      cwd: ROOT, encoding: 'utf8', timeout: 15000, stdio: ['ignore', 'pipe', 'ignore']
    }).trim();
    if (cabang && cabang !== 'HEAD') return 'branch ' + cabang;
  } catch { /* di luar git: jatuh ke bawah */ }
  return 'tidak tercatat (jalankan ulang di dalam git, atau set FIEZEL_BUILD_CLAIMER)';
}

/* Versi di origin/main. Kalau git tidak bisa dihubungi (mode luring, sandbox tanpa remote),
 * JANGAN diam-diam memakai versi lokal sebagai dasar: itu justru cara tabrakan lahir.
 * Kembalikan null dan katakan terus terang bahwa dasarnya tidak terverifikasi. */
function versiHulu() {
  try {
    execSync('git fetch origin main --quiet', { cwd: ROOT, stdio: 'ignore', timeout: 60000 });
    // stderr dibungkam: kalau berkas ini belum ada di hulu, git mencetak "fatal:" yang
    // terlihat seperti kerusakan padahal itu keadaan normal saat protokol baru mendarat.
    const isi = execSync('git show origin/main:coordination/BUILD-VERSION.json', {
      cwd: ROOT, encoding: 'utf8', timeout: 30000, stdio: ['ignore', 'pipe', 'ignore']
    });
    return JSON.parse(isi).version;
  } catch {
    try {
      const sw = execSync('git show origin/main:sw.js', {
        cwd: ROOT, encoding: 'utf8', timeout: 30000, stdio: ['ignore', 'pipe', 'ignore']
      });
      const m = sw.match(/const SW_REV='(m025-\d+)/);
      return m ? m[1] : null;
    } catch {
      return null;
    }
  }
}

function periksa() {
  const terpasang = versiTerpasang();
  const sumber = versiSumber();
  const nilai = Object.values(terpasang);
  const selaras = nilai.every((v) => v && v === sumber);
  return { terpasang, sumber, selaras };
}

const argv = process.argv.slice(2);

if (argv[0] === '--check') {
  const { terpasang, sumber, selaras } = periksa();
  console.log(JSON.stringify({ sumber, terpasang, selaras }, null, 2));
  if (!selaras) {
    console.error('TIDAK SELARAS: tiga penanda build harus sama dengan coordination/BUILD-VERSION.json.');
    console.error('Perbaiki dengan: node tools/bump-build.mjs "<alasan>"  (atau selaraskan manual lalu jelaskan).');
    process.exit(1);
  }
  console.log('Selaras.');
  process.exit(0);
}

/* --adopt: CATAT versi yang sudah terpasang sebagai sumber kebenaran, tanpa menaikkan apa pun.
 *
 * Kasusnya nyata dan sering: sesi lain menaikkan versi lewat jalurnya sendiri, ketiga penanda
 * di tree tetap konsisten, tetapi coordination/BUILD-VERSION.json milik kita ketinggalan. Kalau
 * satu-satunya jalan adalah `bump`, kita akan menaikkan versi TANPA ALASAN produk hanya untuk
 * menyenangkan gerbang - dan setiap kenaikan SW_REV memaksa seluruh murid mengunduh ulang shell
 * cache. Jadi ada dua operasi berbeda: `bump` (versi memang harus naik) dan `--adopt` (versi
 * sudah benar, catatannya yang perlu menyusul).
 *
 * Sengaja menolak jalan kalau ketiga penanda TIDAK konsisten: kalau tree-nya sendiri campur,
 * mengadopsi salah satunya berarti mengarang. */
if (argv[0] === '--adopt') {
  const alasanAdopt = argv.slice(1).join(' ').trim();
  if (!alasanAdopt) {
    console.error('Alasan wajib. Pakai: node tools/bump-build.mjs --adopt "kenapa versi ini diadopsi"');
    process.exit(1);
  }
  const t = versiTerpasang();
  const v = Object.values(t);
  if (!v.every((x) => x && x === v[0])) {
    console.error('Tiga penanda build TIDAK konsisten: ' + JSON.stringify(t));
    console.error('Adopsi ditolak - mengadopsi salah satu dari tree yang campur berarti mengarang.');
    console.error('Selaraskan dulu, atau jalankan `bump` kalau memang versinya harus naik.');
    process.exit(1);
  }
  const sumberLama = versiSumber();
  const j = JSON.parse(fs.readFileSync(SUMBER, 'utf8'));
  j.version = v[0];
  j.claimedAt = new Date().toISOString();
  j.reason = alasanAdopt;
  j.claimedBy = pengklaim();
  fs.writeFileSync(SUMBER, JSON.stringify(j, null, 2) + '\n');
  console.log('Diadopsi: ' + sumberLama + ' -> ' + v[0] + ' (' + alasanAdopt + ')');
  console.log('Tidak ada penanda build yang diubah, jadi nol murid mengunduh ulang shell cache.');
  process.exit(0);
}

const alasan = argv.join(' ').trim();
if (!alasan) {
  console.error('Alasan wajib. Pakai: node tools/bump-build.mjs "alasan singkat"');
  console.error('Alasan itu masuk ke coordination/BUILD-VERSION.json supaya sesi lain tahu nomor ini dipakai untuk apa.');
  process.exit(1);
}

/* Sudahkah nomor ini pernah DIKLAIM di origin/main oleh siapa pun?
 *
 * Menaikkan satu dari hulu TIDAK cukup, dan lapangan membuktikannya 29-30 Agu 2026: dua jalur
 * bercabang dari m025-195, keduanya membaca hulu = 195 pada hari yang berbeda, keduanya
 * mencetak 196, lalu 197, 198, 199. Tidak satu pun panggilan bump yang salah pada saat ia
 * dijalankan - yang salah adalah asumsi bahwa "hulu saat ini + 1" belum dipakai orang lain.
 * Setelah kedua jalur di-merge, empat nomor memayungi dua isi berbeda.
 *
 * Jadi sebelum mencetak, tanyakan pada riwayat: apakah ada commit di hulu yang pernah
 * menuliskan nomor ini ke berkas sumber? Kalau ada, lompati - dan katakan kenapa.
 *
 * Sengaja TANPA `-S<string>`: di Windows execSync berjalan lewat cmd.exe, yang tidak mengenal
 * kutip tunggal, sehingga pola -S berkutip pecah jadi argumen harfiah dan pencarian selalu
 * mengembalikan nol - "aman" secara palsu, persis kegagalan yang alat ini seharusnya cegah.
 * Jadi patch-nya diurai sendiri, satu kali, lalu dipakai untuk semua kandidat. */
function versiYangPernahDiklaimDiHulu() {
  try {
    const patch = execSync(
      'git log origin/main -p --format=%H -- coordination/BUILD-VERSION.json',
      { cwd: ROOT, encoding: 'utf8', timeout: 60000, stdio: ['ignore', 'pipe', 'ignore'] }
    );
    const set = new Set();
    for (const baris of patch.split('\n')) {
      const m = baris.match(/^\+\s*"version":\s*"(m025-\d+)"/);
      if (m) set.add(m[1]);
    }
    return set;
  } catch {
    return null; // hulu tak terbaca; peringatan soal itu sudah dicetak di bawah
  }
}

const hulu = versiHulu();
const lokal = versiSumber();
const dasar = hulu && nomor(hulu) >= nomor(lokal) ? hulu : lokal;

const diklaim = versiYangPernahDiklaimDiHulu();
let kandidat = nomor(dasar) + 1;
const dilompati = [];
while (diklaim && diklaim.has('m025-' + kandidat) && dilompati.length < 50) {
  dilompati.push('m025-' + kandidat);
  kandidat += 1;
}
const versiBaru = 'm025-' + kandidat;

if (dilompati.length > 0) {
  console.warn('DILOMPATI: ' + dilompati.join(', ') + ' sudah diklaim di origin/main oleh jalur lain.');
  console.warn('Nomor ini naik ke ' + versiBaru + ' supaya satu SW_REV tidak memayungi dua isi berbeda.');
}

if (!hulu) {
  console.warn('PERINGATAN: versi origin/main tidak bisa dibaca, jadi dasar diambil dari berkas lokal.');
  console.warn('Nomor ini BELUM terbukti bebas tabrakan. Jalankan ulang setelah `git fetch` berhasil.');
} else if (nomor(hulu) > nomor(lokal)) {
  console.log('Hulu lebih tinggi (' + hulu + ' > ' + lokal + '): dasar diambil dari hulu. Ini mencegah tabrakan.');
}

for (const t of TITIK) {
  const p = path.join(ROOT, t.berkas);
  const isi = fs.readFileSync(p, 'utf8');
  const m = isi.match(t.pola);
  if (!m) {
    console.error('Penanda build tidak ditemukan di ' + t.berkas + '. Bentuk kodenya berubah; perbarui TITIK di berkas ini.');
    process.exit(1);
  }
  const baru = isi.replace(t.pola, (_all, a, _lama, ...sisa) => a + versiBaru + sisa.slice(0, sisa.length - 2).join(''));
  fs.writeFileSync(p, baru);
  console.log(t.berkas + ': ' + m[t.gantiKe] + ' -> ' + versiBaru);
}

const sumber = JSON.parse(fs.readFileSync(SUMBER, 'utf8'));
sumber.version = versiBaru;
sumber.claimedAt = new Date().toISOString();
sumber.reason = alasan;
sumber.claimedBy = pengklaim();
fs.writeFileSync(SUMBER, JSON.stringify(sumber, null, 2) + '\n');
console.log('coordination/BUILD-VERSION.json: ' + versiBaru + ' (' + alasan + ')');

const akhir = periksa();
if (!akhir.selaras) {
  console.error('Gagal menyelaraskan. Jangan commit; periksa manual.');
  process.exit(1);
}
console.log('Selaras. Commit keempat berkas bersama-sama.');
