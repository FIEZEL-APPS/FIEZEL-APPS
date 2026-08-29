#!/usr/bin/env node
/* tools/deploy-site-verify.mjs — PEMBUKTI bahwa situs hidup benar-benar menyajikan build ini.
 *
 * KENAPA ALAT INI ADA. Audit rilis m025-179 berhenti pada satu kalimat: "paritas produksi
 * TIDAK TERBUKTI". Bukan karena ada yang salah, tetapi karena tidak ada satu pun langkah yang
 * pernah MEMBACA `https://fiezel.my.id/app/` sesudah menerbitkannya. Pembacaan produksi
 * independen terakhir saat itu `m025-172`, tujuh build di belakang repo. Selama celah itu ada,
 * setiap nomor build adalah janji.
 *
 * Alat ini menutupnya dengan cara yang paling murah: sesudah unggah, TARIK berkas yang baru
 * diunggah dari alamat yang benar-benar dipakai murid, lalu tuntut penandanya cocok. Kalau
 * tidak cocok, deploy MERAH — bukan hijau dengan catatan kecil.
 *
 * Ia juga bisa dijalankan tangan kapan saja untuk menjawab "produksi lagi pegang versi apa?":
 *
 *     node tools/deploy-site-verify.mjs --base https://fiezel.my.id/app
 *
 * Tanpa --page/--sw ia hanya MELAPORKAN apa yang disajikan produksi (exit 0), tidak menuntut.
 * Dengan keduanya ia menjadi gerbang: cocok = exit 0, beda = exit 1.
 *
 * BATAS YANG DITULIS TERBUKA: alat ini membuktikan BITA YANG DISAJIKAN, bukan bahwa aplikasi
 * berjalan benar di perangkat murid. Yang terakhir itu tugas gerbang E2E browser.
 */

const args = process.argv.slice(2);
const arg = (n, d = '') => {
  const i = args.indexOf('--' + n);
  return i !== -1 && args[i + 1] ? args[i + 1] : d;
};

const BASE = arg('base', process.env.FIEZEL_SITE_BASE || 'https://fiezel.my.id/app').replace(/\/+$/, '');
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
      { signal: ac.signal, cache: 'no-store', headers: { 'Cache-Control': 'no-cache' } });
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

async function sekaliJalan() {
  const [cfg, sw] = await Promise.all([ambil(BASE + '/core-config.js'), ambil(BASE + '/sw.js')]);
  return {
    cfg, sw,
    page: cfg.ok ? ambilPage(cfg.body) : null,
    swRev: sw.ok ? ambilSw(sw.body) : null
  };
}

const baris = [];
const catat = (s) => { baris.push(s); console.log(s); };

let hasil = null;
for (let i = 1; i <= (strict ? RETRIES : 1); i++) {
  hasil = await sekaliJalan();
  const cocok = strict && hasil.page === WANT_PAGE && hasil.swRev === WANT_SW;
  if (!strict || cocok) break;
  if (i < RETRIES) {
    console.log(`percobaan ${i}/${RETRIES}: produksi masih menyajikan page=${hasil.page} sw=${hasil.swRev}` +
      ` (diharapkan page=${WANT_PAGE} sw=${WANT_SW}) — menunggu ${RETRY_DELAY_MS / 1000}s`);
    await tidur(RETRY_DELAY_MS);
  }
}

catat('FIEZEL deploy-site-verify');
catat('  base            : ' + BASE);
catat('  /core-config.js : HTTP ' + hasil.cfg.status + (hasil.cfg.error ? ' (' + hasil.cfg.error + ')' : ''));
catat('  /sw.js          : HTTP ' + hasil.sw.status + (hasil.sw.error ? ' (' + hasil.sw.error + ')' : ''));
catat('  FIEZEL_PAGE_BUILD disajikan : ' + (hasil.page || 'TIDAK TERBACA'));
catat('  SW_REV disajikan            : ' + (hasil.swRev || 'TIDAK TERBACA'));

if (!strict) {
  catat('  mode: LAPOR SAJA (tanpa --page dan --sw, alat ini tidak menuntut apa pun)');
  process.exit(0);
}

catat('  FIEZEL_PAGE_BUILD diharapkan : ' + WANT_PAGE);
catat('  SW_REV diharapkan            : ' + WANT_SW);

const masalah = [];
if (!hasil.cfg.ok) masalah.push(`core-config.js tidak terambil (HTTP ${hasil.cfg.status}${hasil.cfg.error ? ' ' + hasil.cfg.error : ''})`);
if (!hasil.sw.ok) masalah.push(`sw.js tidak terambil (HTTP ${hasil.sw.status}${hasil.sw.error ? ' ' + hasil.sw.error : ''})`);
if (hasil.cfg.ok && hasil.page !== WANT_PAGE) masalah.push(`build halaman produksi '${hasil.page}' != '${WANT_PAGE}' yang baru diterbitkan`);
if (hasil.sw.ok && hasil.swRev !== WANT_SW) masalah.push(`revisi shell produksi '${hasil.swRev}' != '${WANT_SW}' yang baru diterbitkan`);
/* Invarian rilis repo: SW_REV berawalan build halaman. Kalau produksi menyajikan pasangan
 * yang tidak sepadan, murid bisa memegang shell dan halaman dari dua generasi berbeda. */
if (hasil.page && hasil.swRev && !String(hasil.swRev).startsWith(String(hasil.page))) {
  masalah.push(`produksi menyajikan pasangan TIDAK SEPADAN: page='${hasil.page}' tetapi shell='${hasil.swRev}'`);
}

if (masalah.length) {
  console.error('\nGAGAL — unggahan tidak terbukti sampai:');
  for (const m of masalah) console.error('  - ' + m);
  console.error('\nSelama ini merah, nomor build di repo BUKAN fakta produksi.');
  process.exit(1);
}

catat('\nTERBUKTI: situs hidup menyajikan build dan shell yang baru diterbitkan, dan keduanya sepadan.');
process.exit(0);
