#!/usr/bin/env node
/* tools/deploy-site-verify.mjs — PEMBUKTI bahwa situs hidup benar-benar menyajikan build ini
 * BESERTA kontrak PWA Standalone di permukaan aplikasi (/app/) dan halaman depan (/).
 *
 * KENAPA ALAT INI ADA. Audit rilis m025-179 berhenti pada satu kalimat: "paritas produksi
 * TIDAK TERBUKTI". Bukan karena ada yang salah, tetapi karena tidak ada satu pun langkah yang
 * pernah MEMBACA `https://fiezel.my.id/app/` sesudah menerbitkannya. Dan pada m025-727 ditemukan
 * celah kedua: halaman depan `https://fiezel.my.id/` sempat tidak menyajikan `manifest.json`,
 * sehingga murid yang memasang aplikasi dari beranda hanya mendapatkan bookmark browser biasa.
 *
 * Alat ini menutup kedua celah itu sesudah setiap unggahan:
 *   1. `core-config.js` & `sw.js` cocok dengan nomor build & revisi shell yang baru diterbitkan.
 *   2. `/app/manifest.json` tersaji (HTTP 200) dengan `display: "standalone"`.
 *   3. Bila BASE berakhiran `/app`, akar domain (`https://fiezel.my.id/manifest.json` dan `/`)
 *      ikut diverifikasi menyajikan `display: "standalone"`, `start_url: "/app/"`, `<link rel="manifest"`,
 *      dan penjaga redirect `(display-mode: standalone)`.
 *
 * Ia juga bisa dijalankan tangan kapan saja untuk menjawab "produksi lagi pegang versi apa?":
 *
 *     node tools/deploy-site-verify.mjs --base https://fiezel.my.id/app
 *
 * Tanpa --page/--sw ia hanya MELAPORKAN apa yang disajikan produksi (exit 0), tidak menuntut.
 * Dengan keduanya ia menjadi gerbang: cocok = exit 0, beda = exit 1.
 */

const args = process.argv.slice(2);
const arg = (n, d = '') => {
  const i = args.indexOf('--' + n);
  return i !== -1 && args[i + 1] ? args[i + 1] : d;
};

const BASE = arg('base', process.env.FIEZEL_SITE_BASE || 'https://fiezel.my.id/app').replace(/\/+$/, '');
const ROOT_ORIGIN = /\/app$/i.test(BASE) ? BASE.replace(/\/app$/i, '') : '';
const WANT_PAGE = arg('page', '');
const WANT_SW = arg('sw', '');
const TIMEOUT_MS = Number(arg('timeout', '20000')) || 20000;
/* Cache CDN/origin bisa menyajikan bita lama beberapa detik sesudah unggah. Mencoba ulang
 * beberapa kali JAUH lebih jujur daripada melonggarkan tuntutannya. */
const RETRIES = Number(arg('retries', '6')) || 6;
const RETRY_DELAY_MS = Number(arg('retry-delay', '10000')) || 10000;

const strict = Boolean(WANT_PAGE && WANT_SW);
const tidur = (ms) => new Promise((r) => setTimeout(r, ms));

async function ambil(url) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), TIMEOUT_MS);
  try {
    // `cache: 'no-store'` + parameter pengacak: kita sedang menguji apa yang BARU diunggah,
    // jadi jawaban dari cache mana pun adalah jawaban atas pertanyaan yang salah.
    const r = await fetch(url + (url.includes('?') ? '&' : '?') + '_fz=' + Date.now(),
      { signal: ac.signal, cache: 'no-store', headers: { 'Cache-Control': 'no-cache', 'Referer': BASE + '/' } });
    const body = await r.text();
    return { ok: r.ok, status: r.status, body };
  } catch (e) {
    return { ok: false, status: 0, body: '', error: String(e && e.message || e) };
  } finally {
    clearTimeout(t);
  }
}

const ambilPage = (t) => (/FIEZEL_PAGE_BUILD\s*=\s*'([^']+)'/.exec(t) || [])[1] || null;
const ambilSw = (t) => (/SW_REV\s*=\s*'([^']+)'/.exec(t) || [])[1] || null;
const parseJsonAman = (t) => { try { return JSON.parse(t); } catch { return null; } };

async function sekaliJalan() {
  const reqs = [
    ambil(BASE + '/core-config.js'),
    ambil(BASE + '/sw.js'),
    ambil(BASE + '/manifest.json'),
    ambil(BASE + '/coordination/BUILD-VERSION.json')
  ];
  if (ROOT_ORIGIN) {
    reqs.push(ambil(ROOT_ORIGIN + '/manifest.json'));
    reqs.push(ambil(ROOT_ORIGIN + '/'));
  }
  const [cfg, sw, appManifestRes, buildVerRes, rootManifestRes, rootHtmlRes] = await Promise.all(reqs);
  const buildVerJson = buildVerRes && buildVerRes.ok ? parseJsonAman(buildVerRes.body) : null;
  return {
    cfg,
    sw,
    appManifestRes,
    appManifest: appManifestRes && appManifestRes.ok ? parseJsonAman(appManifestRes.body) : null,
    buildVerRes: buildVerRes || null,
    buildVer: buildVerJson && buildVerJson.version ? String(buildVerJson.version) : null,
    rootManifestRes: rootManifestRes || null,
    rootManifest: rootManifestRes && rootManifestRes.ok ? parseJsonAman(rootManifestRes.body) : null,
    rootHtmlRes: rootHtmlRes || null,
    page: cfg.ok ? ambilPage(cfg.body) : null,
    swRev: sw.ok ? ambilSw(sw.body) : null
  };
}

const baris = [];
const catat = (s) => { baris.push(s); console.log(s); };

async function main() {
  let hasil = null;
  for (let i = 1; i <= (strict ? RETRIES : 1); i++) {
    hasil = await sekaliJalan();
    const cocok = strict && hasil.page === WANT_PAGE && hasil.swRev === WANT_SW && hasil.buildVer === WANT_PAGE;
    if (!strict || cocok) break;
    if (i < RETRIES) {
      console.log(`percobaan ${i}/${RETRIES}: produksi masih menyajikan page=${hasil.page} sw=${hasil.swRev} buildVer=${hasil.buildVer}` +
        ` (diharapkan page=${WANT_PAGE} sw=${WANT_SW}) — menunggu ${RETRY_DELAY_MS / 1000}s`);
      await tidur(RETRY_DELAY_MS);
    }
  }

  catat('FIEZEL deploy-site-verify');
  catat('  base               : ' + BASE);
  catat('  /core-config.js    : HTTP ' + hasil.cfg.status + (hasil.cfg.error ? ' (' + hasil.cfg.error + ')' : ''));
  catat('  /sw.js             : HTTP ' + hasil.sw.status + (hasil.sw.error ? ' (' + hasil.sw.error + ')' : ''));
  catat('  /BUILD-VERSION.json: HTTP ' + (hasil.buildVerRes?.status ?? 0) + ' version=' + (hasil.buildVer || 'TIDAK TERBACA'));
  catat('  /app/manifest.json : HTTP ' + hasil.appManifestRes.status + ' display=' + (hasil.appManifest?.display || 'TIDAK TERBACA'));
  if (ROOT_ORIGIN && hasil.rootManifestRes && hasil.rootHtmlRes) {
    catat('  root /manifest.json: HTTP ' + hasil.rootManifestRes.status +
      ' display=' + (hasil.rootManifest?.display || 'TIDAK TERBACA') +
      ' start_url=' + (hasil.rootManifest?.start_url || 'TIDAK TERBACA'));
    const hasGuard = hasil.rootHtmlRes.ok && hasil.rootHtmlRes.body.includes('(display-mode: standalone)');
    catat('  root landing /     : HTTP ' + hasil.rootHtmlRes.status + ' standalone-guard=' + (hasGuard ? 'ADA' : 'HILANG'));
  }
  catat('  FIEZEL_PAGE_BUILD disajikan : ' + (hasil.page || 'TIDAK TERBACA'));
  catat('  SW_REV disajikan            : ' + (hasil.swRev || 'TIDAK TERBACA'));

  if (!strict) {
    catat('  mode: LAPOR SAJA (tanpa --page dan --sw, alat ini tidak menuntut apa pun)');
    process.exitCode = 0;
    return;
  }

  catat('  FIEZEL_PAGE_BUILD diharapkan : ' + WANT_PAGE);
  catat('  SW_REV diharapkan            : ' + WANT_SW);

  const masalah = [];
  if (!hasil.cfg.ok) masalah.push(`core-config.js tidak terambil (HTTP ${hasil.cfg.status}${hasil.cfg.error ? ' ' + hasil.cfg.error : ''})`);
  if (!hasil.sw.ok) masalah.push(`sw.js tidak terambil (HTTP ${hasil.sw.status}${hasil.sw.error ? ' ' + hasil.sw.error : ''})`);
  if (hasil.cfg.ok && hasil.page !== WANT_PAGE) masalah.push(`build halaman produksi '${hasil.page}' != '${WANT_PAGE}' yang baru diterbitkan`);
  if (hasil.sw.ok && hasil.swRev !== WANT_SW) masalah.push(`revisi shell produksi '${hasil.swRev}' != '${WANT_SW}' yang baru diterbitkan`);
  if (!hasil.buildVerRes?.ok || hasil.buildVer !== WANT_PAGE) {
    masalah.push(`coordination/BUILD-VERSION.json produksi '${hasil.buildVer}' != '${WANT_PAGE}' (HTTP ${hasil.buildVerRes?.status ?? 0}) — deteksi update iOS PWA akan tertahan`);
  }
  /* Invarian rilis repo: SW_REV berawalan build halaman. Kalau produksi menyajikan pasangan
   * yang tidak sepadan, murid bisa memegang shell dan halaman dari dua generasi berbeda. */
  if (hasil.page && hasil.swRev && !String(hasil.swRev).startsWith(String(hasil.page))) {
    masalah.push(`produksi menyajikan pasangan TIDAK SEPADAN: page='${hasil.page}' tetapi shell='${hasil.swRev}'`);
  }
  if (!hasil.appManifestRes.ok || hasil.appManifest?.display !== 'standalone') {
    masalah.push(`/app/manifest.json tidak menyajikan display:standalone (HTTP ${hasil.appManifestRes.status})`);
  }
  if (ROOT_ORIGIN && hasil.rootManifestRes && hasil.rootHtmlRes) {
    if (!hasil.rootManifestRes.ok || hasil.rootManifest?.display !== 'standalone' || hasil.rootManifest?.start_url !== '/app/') {
      masalah.push(`root ${ROOT_ORIGIN}/manifest.json rusak (HTTP ${hasil.rootManifestRes.status}, display=${hasil.rootManifest?.display}, start_url=${hasil.rootManifest?.start_url})`);
    }
    if (!hasil.rootHtmlRes.ok || !/<link[^>]*rel=["']manifest["']/i.test(hasil.rootHtmlRes.body) || !hasil.rootHtmlRes.body.includes('(display-mode: standalone)')) {
      masalah.push(`root landing ${ROOT_ORIGIN}/ kehilangan link manifest atau standalone redirect guard`);
    }
  }

  if (masalah.length) {
    console.error('\nGAGAL — unggahan atau kontrak PWA Standalone produksi tidak terbukti:');
    for (const m of masalah) console.error('  - ' + m);
    console.error('\nSelama ini merah, nomor build di repo BUKAN fakta produksi yang sehat.');
    process.exitCode = 1;
    return;
  }

  catat('\nTERBUKTI: situs hidup menyajikan build, shell, dan kontrak PWA Standalone yang utuh.');
  process.exitCode = 0;
}

main().catch((err) => {
  console.error('\nGAGAL — deploy-site-verify error:', err);
  process.exitCode = 1;
});
