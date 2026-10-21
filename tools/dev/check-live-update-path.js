/**
 * check-live-update-path.js — Apakah perangkat murid BISA menerima build baru?
 *
 * Dua hal yang menentukan:
 *   1. penanda build di produksi -> dipakai kartu "Versi baru" (fiezel-update-prompt.js).
 *      SINYAL UTAMA-nya coordination/BUILD-VERSION.json (m025-492); VERSION.json semver
 *      hanya cadangan karena di produksi ia TIDAK PERNAH maju.
 *   2. Semua entri precache shell harus 200. SATU 404 = cache.addAll() GAGAL TOTAL =
 *      service worker baru TIDAK PERNAH terpasang = perangkat murid terjebak selamanya
 *      di build lama, walau server sudah menyajikan yang baru.
 */
const https = require('https');

function get(url) {
  return new Promise((resolve) => {
    https.get(url, { headers: { 'user-agent': 'FIEZEL-update-check/1' } }, r => {
      let b = '';
      r.on('data', c => b += c);
      r.on('end', () => resolve({ status: r.statusCode, body: b }));
    }).on('error', e => resolve({ status: 0, body: '', err: e.message }));
  });
}

const BASE = 'https://fiezel.my.id/app/';

// Ekstrak ASSETS dari sw.js produksi
(async () => {
  const sw = await get(BASE + 'sw.js');
  console.log('sw.js status      :', sw.status);
  const rev = (sw.body.match(/SW_REV\s*=\s*'([^']+)'/) || [])[1];
  console.log('SW_REV            :', rev);
  const ver = (sw.body.match(/self\.FIEZEL_VERSION\s*=\s*'([^']+)'/) || [])[1];
  console.log('FIEZEL_VERSION    :', ver);

  const vjson = await get(BASE + 'VERSION.json');
  console.log('VERSION.json      :', vjson.status, vjson.body.slice(0, 120));

  const bjson = await get(BASE + 'coordination/BUILD-VERSION.json');
  const bver = (bjson.body.match(/"version"\s*:\s*"([^"]+)"/) || [])[1];
  console.log('BUILD-VERSION.json:', bjson.status, bver || bjson.body.slice(0, 80));

  const cfgs = await get(BASE + 'core-config.js');
  console.log('core-config page  :', (cfgs.body.match(/FIEZEL_PAGE_BUILD='([^']+)'/) || [])[1]);
  if (rev && cfgs.body) {
    const page = (cfgs.body.match(/FIEZEL_PAGE_BUILD='(m025-\d+)'/) || [])[1];
    if (page && bver && page === bver) console.log('SELARAS: halaman & penanda build live cocok (' + page + ').');
    else if (page && bver) console.log('BEDA: halaman ' + page + ' vs live ' + bver + ' -> kartu pembaruan AKAN muncul (benar bila rilis memang lebih baru).');
  }

  // Ambil array ASSETS (dari 'const ASSETS=[' sampai '];' pertama)
  const m = /const ASSETS=\[([\s\S]*?)\];/.exec(sw.body);
  if (!m) { console.log('ASSETS array tidak ditemukan di sw.js (mungkin multi-baris/dipecah)'); return; }
  const list = [...m[1].matchAll(/'\.\/([^']*)'/g)].map(x => x[1]);
  console.log('Jumlah entri precache:', list.length);

  // Cek SEMUA secara terbatas (concurrent 8)
  let idx = 0, bad = [];
  async function worker() {
    while (idx < list.length) {
      const rel = list[idx++];
      const url = BASE + rel;
      const r = await get(url);
      if (r.status !== 200) bad.push({ rel, status: r.status, err: r.err });
    }
  }
  await Promise.all(Array.from({ length: 8 }, worker));

  if (bad.length === 0) console.log('\nSEMUA entri precache = 200. Service worker baru BISA terpasang.');
  else {
    console.log('\n!!! ENTRI PRECACHE GAGAL -> SW BARU TIDAK AKAN PERNAH TERPASANG !!!');
    bad.forEach(b => console.log('   ', b.status, b.rel, b.err || ''));
  }
})().catch(e => { console.error(e); process.exit(1); });