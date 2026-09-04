'use strict';
/**
 * GERBANG: SETIAP jawaban rute WAJIB membawa `Access-Control-Allow-Origin` untuk origin
 * yang diizinkan — dan NOL rute boleh membawanya untuk origin yang tidak diizinkan.
 *
 * KENAPA GERBANG INI ADA, dan kenapa bentuknya begini.
 *
 * `wrapAnalytics` di `route-wiring.js` tidak pernah menempelkan `ctx.corsHeaders`, sementara
 * pembungkus lain menempelkannya. Akibatnya jawaban handler analytics keluar TANPA header itu
 * dan peramban murid memblokir pembacaannya. Analytics mati total, seumur sesi, dan senyap.
 *
 * Yang membuat cacat itu MAHAL ditemukan adalah bentuk gejalanya. Empat lapis pemeriksaan
 * lulus sementara fiturnya mati:
 *   1. preflight `OPTIONS` menjawab dengan CORS lengkap (204 + allow-origin + allow-methods);
 *   2. `curl` melihat 200/202 yang sehat, karena curl tidak menegakkan CORS sama sekali;
 *   3. modul klien melaporkan dirinya `loaded:true` tanpa galat, karena yang gagal adalah
 *      PEMBACAAN jawaban, bukan pemuatan modul;
 *   4. gerbang luring yang membaca sumber tidak melihat apa pun yang salah.
 * Karena itu gerbang ini menguji HEADER PADA JAWABAN NYATA dari Worker yang benar-benar
 * di-boot — bukan preflight, bukan sumber, bukan tiruan handler.
 *
 * PENEMUAN PATH BERSIFAT PROGRAMATIK dari sumber pendaftaran rute, supaya rute BARU otomatis
 * ikut diuji. Daftar path yang diketik tangan akan basi begitu rute baru lahir, dan rute baru
 * yang lupa CORS adalah persis cacat yang baru saja terjadi.
 */

const fs = require('fs');
const path = require('path');

const root = __dirname;
const boot = require(path.join(root, 'tools/cf-worker-boot.js'));

let pass = 0;
const fails = [];

function check(nama, kondisi, detail) {
  if (kondisi) { pass += 1; return; }
  fails.push({ nama, detail: detail === undefined ? null : String(detail) });
}

const ORIGIN_SAH = 'https://fiezel.my.id';
const ORIGIN_ASING = 'https://penyerang.example';

/** Kumpulkan path rute dari SUMBER pendaftaran, bukan dari daftar tangan. */
function temukanPath() {
  const dir = path.join(root, 'workers', 'api');
  const keluar = new Set();
  const antre = [dir];
  while (antre.length) {
    const d = antre.pop();
    for (const nama of fs.readdirSync(d)) {
      const p = path.join(d, nama);
      const st = fs.statSync(p);
      if (st.isDirectory()) { antre.push(p); continue; }
      if (!nama.endsWith('.js')) continue;
      const isi = fs.readFileSync(p, 'utf8');
      // Bentuk yang benar-benar dipakai repo ini: add('POST','/api/x'), router.get('/api/x'),
      // dan tabel { method:'GET', path:'/api/x' }.
      const pola = /['"](\/(?:api\/[a-z0-9/_-]+|health|healthz))['"]/gi;
      let m;
      while ((m = pola.exec(isi)) !== null) keluar.add(m[1]);
    }
  }
  return [...keluar].sort();
}

async function main() {
  const workerMod = await boot.loadWorker();
  const kandidat = temukanPath();

  check('(a) path ditemukan programatik dari sumber, bukan daftar tangan',
    kandidat.length >= 8, `ditemukan=${kandidat.length}`);

  const booted = boot.bootWorker(workerMod, {});
  let diuji = 0;
  const dilewati = [];

  for (const p of kandidat) {
    let res = null;
    try {
      res = await booted.call('GET', p, { headers: { origin: ORIGIN_SAH } });
    } catch (e) {
      check(`(b) GET ${p} tidak melempar`, false, e && e.message);
      continue;
    }
    // 404 = bukan rute (string kebetulan cocok pola). Dilewati, tapi DICATAT supaya
    // gerbang tidak bisa lulus dengan cara melewati semuanya.
    if (res.status === 404) { dilewati.push(p); continue; }
    diuji += 1;
    // Status apa pun sah: 400/403/405/503 semuanya jawaban nyata. Yang TIDAK sah adalah
    // jawaban tanpa izin CORS, karena peramban murid tidak akan bisa membacanya.
    check(`(b) GET ${p} membawa allow-origin untuk origin sah (status ${res.status})`,
      res.headers.get('access-control-allow-origin') === ORIGIN_SAH,
      `allow-origin=${res.headers.get('access-control-allow-origin')}`);
  }

  check('(c) cukup banyak rute nyata benar-benar diuji (anti-vakum)',
    diuji >= 6, `diuji=${diuji} dilewati404=${dilewati.length}`);

  // Rute analytics WAJIB ikut teruji. Inilah rute yang cacatnya terjadi, jadi ketiadaannya
  // dari himpunan uji harus merah, bukan lolos diam-diam.
  const wajib = ['/api/usage/pepper', '/api/config'];
  for (const w of wajib) {
    check(`(d) ${w} termasuk yang diuji, bukan terlewat`,
      kandidat.includes(w) && !dilewati.includes(w),
      `kandidat=${kandidat.includes(w)} dilewati=${dilewati.includes(w)}`);
  }

  // Arah kebalikan: izin tidak boleh pernah muncul untuk origin asing. Tanpa assert ini,
  // "perbaikan" bisa berbentuk menempelkan allow-origin ke semua orang.
  //
  // Worker dipanggil LANGSUNG di sini, bukan lewat `booted.call`, karena helper itu memaksa
  // header `origin` ke origin yang sah. Lewat helper, assert ini akan SELALU hijau tanpa
  // pernah menguji apa pun — vakum yang tampak seperti bukti. Ini ditemukan saat menulis
  // gerbang ini: bentuk pertamanya lulus 19/21 dengan dua merah yang ternyata artefak
  // harness, bukan cacat produksi.
  for (const p of ['/api/usage/pepper', '/api/config']) {
    const req = new Request(`https://api.fiezel.my.id${p}`, {
      headers: { origin: ORIGIN_ASING }
    });
    const res = await workerMod.fetch(req, booted.env, boot.harness.fakeExecutionContext());
    const nilai = res.headers.get('access-control-allow-origin');
    check(`(e) GET ${p} TIDAK memberi izin ke origin asing`,
      nilai !== ORIGIN_ASING,
      `allow-origin=${nilai}`);
  }

  // Satu nilai, bukan dua digabung koma. Penempelan ganda adalah cara paling mudah
  // "memperbaiki" ini sambil merusaknya: peramban menolak nilai berkoma.
  {
    const res = await booted.call('GET', '/api/config', { headers: { origin: ORIGIN_SAH } });
    const nilai = res.headers.get('access-control-allow-origin');
    check('(f) allow-origin bernilai tunggal, bukan gabungan berkoma',
      typeof nilai === 'string' && !nilai.includes(','), `nilai=${nilai}`);
  }

  const total = pass + fails.length;
  for (const f of fails) console.log(`FAIL  ${f.nama}${f.detail ? ` :: ${f.detail}` : ''}`);
  console.log(`\nFIEZEL cors-envelope gate: ${pass}/${total} assert PASS · diuji=${diuji} dilewati404=${dilewati.length}`);
  if (fails.length) { console.log(`${fails.length} assert MERAH`); process.exit(1); }
  process.exit(0);
}

main().catch((e) => {
  console.log('cors-envelope gate MELEDAK:', e && e.stack ? e.stack : e);
  process.exit(1);
});
