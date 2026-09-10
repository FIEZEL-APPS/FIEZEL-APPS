#!/usr/bin/env node
/* tests/build-number-uniqueness-test.js — GERBANG KEUNIKAN NOMOR BUILD.
 *
 * MASALAH YANG DITUTUP DI SINI, dengan bukti dari lapangan 29-30 Agu 2026: dua jalur kerja
 * bercabang dari m025-195 dan berjalan berhari-hari tanpa saling melihat. Masing-masing
 * memanggil tools/bump-build.mjs dengan benar, masing-masing membaca origin/main = m025-195,
 * dan masing-masing menghasilkan m025-196. Lalu 197. Lalu 198. Lalu 199. Ketika keduanya
 * akhirnya di-MERGE (bukan di-rebase), delapan commit masuk riwayat main dengan empat nomor
 * yang masing-masing dipakai dua kali untuk isi yang berbeda.
 *
 * Kenapa bump-build.mjs tidak menangkapnya: arbiter itu menjawab pertanyaan "berapa nomor
 * berikutnya?" pada SATU titik waktu. Ia tidak bisa melihat sesi lain yang sedang mencetak
 * nomor yang sama pada detik yang sama, dan komentarnya sendiri mengakui jalan keluarnya
 * adalah "konfliknya jatuh di berkas JSON delapan baris". Itu benar - TAPI hanya kalau yang
 * menyelesaikan konflik itu MENOMORI ULANG. Merge biasa menyimpan kedua sisi, dan tidak ada
 * satu pun gerbang yang protes.
 *
 * Jadi gerbang ini menjawab pertanyaan yang berbeda, dan menjawabnya SEBELUM merge:
 * "apakah nomor build yang saya bawa sudah pernah diklaim di origin/main oleh commit yang
 * bukan leluhur saya?" Kalau ya, dua isi berbeda akan memakai satu SW_REV, sebagian murid
 * memegang shell cache campur, dan riwayat build berbohong tentang apa yang terpasang.
 *
 * Yang SENGAJA tidak diperiksa: nomor-nomor yang sudah terlanjur bertabrakan di riwayat
 * (m025-196..199, lihat reports/BUILD-NUMBER-COLLISION-2026-08-30.md). Memeriksa seluruh riwayat
 * akan membuat gerbang ini merah selamanya di main tanpa ada yang bisa diperbuat - riwayat
 * publik tidak ditulis ulang. Gerbang hanya menjaga nomor yang SEDANG dibawa.
 *
 * Pakai: node tests/build-number-uniqueness-test.js            (toleran: dasar tak terverifikasi -> lulus dengan peringatan)
 *        node tests/build-number-uniqueness-test.js --strict   (mengikat: dasar tak terverifikasi -> MERAH; dipakai CI)
 */

'use strict';
const __fzRoot = require('path').join(__dirname, '..'); /* m025-254: berkas ini pindah dari root ke tests/. __dirname dulu BERARTI root repo, dan puluhan gerbang memakainya untuk menunjuk berkas produksi - alias ini menjaga makna itu tetap benar tanpa menyunting setiap pemakaian. */

const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

const ROOT = __fzRoot;
const SUMBER = path.join(ROOT, 'coordination/BUILD-VERSION.json');
const STRICT = process.argv.includes('--strict');

let gagal = 0;
const ok = (m) => console.log('ok - ' + m);
const salah = (m) => { gagal++; console.error('GAGAL - ' + m); };

function git(cmd, opts) {
  return execSync(cmd, {
    cwd: ROOT, encoding: 'utf8', timeout: 60000,
    stdio: ['ignore', 'pipe', 'ignore'], ...(opts || {})
  });
}

function coba(cmd) {
  try { return { ok: true, out: git(cmd) }; } catch (e) { return { ok: false, out: '' }; }
}

/* Ketersediaan origin/main tidak boleh diasumsikan: CI memakai actions/checkout dengan
 * fetch-depth default 1, jadi ref-nya sering belum ada. Gerbang mengambil riwayatnya
 * SENDIRI supaya tidak menuntut perubahan konfigurasi checkout yang dipakai banyak PR. */
function siapkanHulu() {
  if (coba('git rev-parse --verify origin/main').ok) return true;
  if (coba('git fetch origin main --depth=200 --quiet').ok) {
    return coba('git rev-parse --verify FETCH_HEAD').ok;
  }
  return false;
}

function refHulu() {
  return coba('git rev-parse --verify origin/main').ok ? 'origin/main' : 'FETCH_HEAD';
}

/* Apakah nenek moyang HEAD benar-benar bisa ditelusuri?
 *
 * Ini bukan detail: pada checkout dangkal (actions/checkout fetch-depth 1) HEAD TIDAK punya
 * induk secara lokal, sehingga `git merge-base --is-ancestor X HEAD` mengembalikan "bukan
 * leluhur" untuk commit yang sebenarnya leluhur — riwayatnya cuma tidak ada. Versi pertama
 * gerbang ini tidak membedakan keduanya dan menuduh commit 0d82037 sebagai penabrak padahal
 * ia induk dari merge yang sedang berdiri di HEAD (PR #261, 2026-08-30). Menuduh salah lebih
 * merusak daripada diam: sekali gerbang berbohong, orang berhenti percaya kepadanya.
 *
 * Jadi: coba perdalam dulu; kalau tetap dangkal, jangan keluarkan vonis ancestry sama sekali. */
function riwayatPenuh() {
  const dangkal = () => (coba('git rev-parse --is-shallow-repository').out || '').trim() === 'true';
  if (!dangkal()) return true;
  /* Cadangan `--deepen=500` di baris ini pernah MATI TOTAL. Bentuk lamanya adalah
   *
   *     coba('git fetch --unshallow --quiet') || coba('git fetch --deepen=500 --quiet');
   *
   * dan `coba()` mengembalikan OBJEK `{ ok, out }` pada kedua cabangnya — termasuk saat
   * gagal. Objek selalu truthy, jadi `||` selalu memutus dan cabang kanan tidak pernah
   * sekali pun dieksekusi sejak gerbang ini ditulis. Yang tersisa hanyalah `--unshallow`:
   * satu-satunya jalan, tanpa jaring pengaman, mengunduh SELURUH riwayat (pack repo ini
   * 497 MiB) tepat di gerbang TERAKHIR `Core validation`. Persis kelas cacat yang sudah
   * dicatat di kepala berkas ini sendiri — perintah yang rusak menghasilkan hijau palsu —
   * hanya saja kali ini korbannya bukan hasil, melainkan cadangan yang disangka ada.
   *
   * Yang diperbaiki hanya itu: cadangannya dibuat bisa dijangkau. Urutannya sengaja TIDAK
   * dibalik. `--deepen` tidak pernah melepas status dangkal, jadi mendahulukannya akan
   * membuat `riwayatPenuh()` selalu mengembalikan false dan gerbang selamanya menahan
   * vonis ancestry-nya — menukar operasi yang mahal dengan gerbang yang tidak menjaga. */
  if (!coba('git fetch --unshallow --quiet').ok) coba('git fetch --deepen=500 --quiet');
  return !dangkal();
}

const versiLokal = JSON.parse(fs.readFileSync(SUMBER, 'utf8')).version;

if (!/^m025-\d+$/.test(String(versiLokal))) {
  salah('coordination/BUILD-VERSION.json tidak membawa versi berbentuk m025-N: ' + versiLokal);
} else {
  ok('versi lokal terbaca: ' + versiLokal);
}

const adaHulu = siapkanHulu();

if (!adaHulu) {
  const pesan = 'origin/main tidak bisa dibaca (luring / tanpa remote), jadi keunikan '
    + versiLokal + ' TIDAK TERVERIFIKASI.';
  if (STRICT) {
    salah(pesan + ' Mode --strict: ini merah, karena gerbang yang diam saat tidak bisa '
      + 'memeriksa adalah gerbang yang tidak menjaga apa pun.');
  } else {
    console.warn('PERINGATAN - ' + pesan);
    console.warn('PERINGATAN - jalankan ulang setelah `git fetch origin main` berhasil, '
      + 'atau percayakan pada CI yang memakai --strict.');
  }
} else {
  const ref = refHulu();

  /* SATU panggilan git untuk kedua pemeriksaan, dan sengaja TANPA `-S<string>`: di Windows
   * execSync lewat cmd.exe, yang tidak mengenal kutip tunggal, sehingga pola -S berkutip
   * pecah menjadi argumen harfiah dan pencarian selalu mengembalikan nol hasil - lolos
   * secara PALSU. Gerbang yang hijau karena perintahnya rusak lebih berbahaya daripada
   * tidak ada gerbang. Jadi patch-nya diurai sendiri: kumpulkan commit + versi yang
   * DITAMBAHKAN (baris '+') pada berkas sumber. */
  const patch = coba('git log ' + ref + ' -p --format=%H -- coordination/BUILD-VERSION.json').out;

  const klaim = []; // [{ commit, versi }]
  let commitKini = null;
  for (const baris of patch.split('\n')) {
    const h = baris.match(/^([0-9a-f]{40})\s*$/);
    if (h) { commitKini = h[1]; continue; }
    const v = baris.match(/^\+\s*"version":\s*"(m025-\d+)"/);
    if (v && commitKini) klaim.push({ commit: commitKini, versi: v[1] });
  }

  const pencetak = [...new Set(klaim.filter((k) => k.versi === versiLokal).map((k) => k.commit))];

  if (pencetak.length === 0) {
    ok(versiLokal + ' belum pernah diklaim di ' + ref + ' - nomor ini bebas.');
  } else {
    /* Diklaim di hulu itu WAJAR kalau yang mengklaim adalah leluhur kita sendiri: artinya
     * pekerjaan kita sudah ter-merge dan kita sedang berdiri di atasnya. Yang berbahaya
     * adalah pengklaim yang BUKAN leluhur - itu jalur lain yang mencetak nomor yang sama. */
    const bisaTelusuriLeluhur = riwayatPenuh();
    const asing = !bisaTelusuriLeluhur ? []
      : pencetak.filter((c) => !coba('git merge-base --is-ancestor ' + c + ' HEAD').ok);

    if (!bisaTelusuriLeluhur) {
      /* Sengaja BUKAN kegagalan, bahkan di --strict: pemeriksaan monotonik di bawah tetap
       * berjalan dan tetap mengikat, jadi gerbang ini masih menjaga sesuatu yang nyata.
       * Yang hilang hanya kemampuan membedakan "jalur lain mencetak nomor ini" dari
       * "pekerjaanku sendiri yang sudah ter-merge", dan menebak di antara keduanya adalah
       * cara gerbang kehilangan kepercayaan. */
      console.warn('PERINGATAN - ' + versiLokal + ' diklaim di ' + ref + ' oleh ' + pencetak.length
        + ' commit, tetapi riwayat HEAD dangkal dan tidak bisa diperdalam, jadi ancestry TIDAK '
        + 'bisa dinilai. Vonis tabrakan ditahan; pemeriksaan monotonik di bawah tetap mengikat.');
    } else if (asing.length === 0) {
      ok(versiLokal + ' diklaim di ' + ref + ' hanya oleh leluhur sendiri (' + pencetak.length
        + ' commit) - bukan tabrakan.');
    } else {
      salah('TABRAKAN NOMOR BUILD: ' + versiLokal + ' sudah diklaim di ' + ref + ' oleh '
        + asing.length + ' commit yang BUKAN leluhur HEAD:');
      for (const c of asing) {
        const judul = coba('git log -1 --format="%h %s" ' + c).out.trim();
        console.error('        ' + (judul || c));
      }
      console.error('  Akibatnya kalau ini di-merge apa adanya: satu SW_REV memayungi DUA');
      console.error('  daftar precache berbeda, sebagian murid memegang shell cache campur,');
      console.error('  dan riwayat build berbohong tentang apa yang terpasang.');
      console.error('  Perbaikan: jalankan `node tools/bump-build.mjs "<alasan>"` lagi setelah');
      console.error('  `git fetch origin main` - arbiter sekarang melompati nomor yang sudah diklaim.');
    }
  }

  /* Pemeriksaan kedua, menutup celah yang tidak terlihat oleh yang pertama: pada cabang yang
   * baru dipotong dari main, SELURUH riwayat adalah leluhur kita - jadi memakai ulang nomor
   * lama (mis. mundur ke m025-198) akan lolos sebagai "diklaim oleh leluhur sendiri". Nomor
   * build hanya berguna kalau ia naik secara monoton, jadi tuntut itu secara eksplisit. */
  const angka = klaim.map((k) => Number(k.versi.replace(/^m025-/, '')));
  const tertinggi = angka.length ? Math.max(...angka) : null;
  const kita = Number(String(versiLokal).replace(/^m025-/, ''));

  if (tertinggi === null) {
    ok('riwayat hulu belum punya klaim versi apa pun - tidak ada yang bisa dilanggar.');
  } else if (kita > tertinggi) {
    ok('versi naik melewati klaim tertinggi di hulu (m025-' + tertinggi + ' -> ' + versiLokal + ').');
  } else if (kita === tertinggi) {
    ok('versi sama dengan klaim tertinggi di hulu (m025-' + tertinggi + ') - berdiri di atas '
      + 'pekerjaan sendiri yang sudah ter-merge, bukan mencetak ulang.');
  } else {
    salah('MUNDUR: versi lokal ' + versiLokal + ' lebih rendah dari klaim tertinggi di hulu '
      + '(m025-' + tertinggi + '). Nomor build hanya berarti kalau naik monoton; memakai ulang '
      + 'nomor lama membuat riwayat build berbohong. Jalankan `node tools/bump-build.mjs "<alasan>"`.');
  }
}

if (gagal > 0) {
  console.error('\nGerbang keunikan nomor build: GAGAL (' + gagal + ').');
  process.exit(1);
}
console.log('\nGerbang keunikan nomor build: PASS.');
