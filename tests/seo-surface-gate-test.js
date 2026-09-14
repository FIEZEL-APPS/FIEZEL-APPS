#!/usr/bin/env node
/**
 * tests/seo-surface-gate-test.js — GERBANG PERMUKAAN SEO: ALAMAT YANG DIJANJIKAN HALAMAN
 * HARUS ALAMAT TEMPAT HALAMAN ITU BENAR-BENAR TERBIT.
 *
 * ==========================================================================
 * KENAPA BERKAS INI ADA
 * ==========================================================================
 * Repo ini punya DUA permukaan terbit, dan itu bukan detail administratif:
 *
 *   akar repo  --rsync-->  ~/public_html/app/   =>  https://fiezel.my.id/app/...
 *   website/   --rsync-->  ~/public_html/       =>  https://fiezel.my.id/...
 *
 * (Sumbernya .cpanel.yml dan .github/workflows/deploy-site.yml; `website/` ikut ada di
 * deploy/site-exclude.txt supaya ia TIDAK ikut gelombang /app/.)
 *
 * Pada commit c4e506d + 7587cf9 seluruh pekerjaan SEO dikerjakan di AKAR repo dengan
 * anggapan akar = root domain. Akibatnya bisa dihitung satu per satu, dan tidak satu pun
 * dari 278 gerbang yang ada bisa melihatnya:
 *
 *   - `tentang.html` — halaman yang dibuat khusus untuk dirangkum Google — terbit di
 *     /app/tentang.html sementara kanoniknya menjanjikan /tentang.html, alamat yang 404.
 *     Kanonik ke 404 tidak membuat Google memilih alamat lain; ia membuang halamannya.
 *   - `robots.txt` akar diubah dari `Disallow: /` ke `Allow: /` dan disebut "fix kritis
 *     Googlebot diblokir". Berkas itu terbit di /app/robots.txt; crawler tidak pernah
 *     membaca robots.txt dari subdirektori. Yang mengikat sejak dulu adalah
 *     website/robots.txt, dan ia SUDAH `Allow: /`. Nol perilaku berubah.
 *   - `sitemap.xml` akar berisi 13 URL root domain tetapi terbit di /app/sitemap.xml.
 *     Sitemap terikat jalurnya sendiri: sitemap di /app/ tidak boleh mendaftarkan URL di
 *     luar /app/.
 *   - hreflang id dan th di ketiga halaman menunjuk URL yang SAMA PERSIS. Itu bukan
 *     "hreflang minimal"; pasangan yang bertentangan dengan dirinya sendiri dibuang
 *     Google tanpa satu pun pesan galat di Search Console.
 *
 * Kelas cacatnya satu: TIDAK ADA yang membandingkan alamat yang DIKLAIM berkas dengan
 * alamat tempat berkas itu benar-benar mendarat. Gerbang ini adalah perbandingan itu.
 *
 * ==========================================================================
 * YANG DIPERIKSA
 * ==========================================================================
 *   (A) Setiap <loc> di website/sitemap.xml punya berkas nyata yang benar-benar terbit
 *       di alamat itu. Sitemap yang mendaftarkan 404 memboroskan anggaran crawl dan
 *       menurunkan kepercayaan seluruh sitemap, bukan hanya baris itu.
 *   (B) Kanonik & og:url setiap halaman = URL terbit halaman itu sendiri.
 *   (C) Dalam satu halaman, dua hreflang berbeda tidak pernah menunjuk URL yang sama,
 *       dan setiap target hreflang ada berkasnya.
 *   (D) hreflang timbal balik: kalau A bilang th -> B, maka B wajib bilang id -> A.
 *   (E) Satu @id schema.org tidak pernah dipakai dengan dua @type berbeda di dua halaman.
 *       Dua halaman BOLEH melengkapi satu simpul; yang merusak konsolidasi entitas adalah
 *       @type yang bertabrakan.
 *   (F) robots.txt (keduanya) tidak pernah memblokir .js/.css/.json — /app/ adalah SPA
 *       yang seluruh isinya dirender JavaScript; memblokirnya berarti meminta Googlebot
 *       merender halaman tanpa berkas yang membuat halaman itu ada. website/robots.txt
 *       juga wajib punya `Allow: /` dan satu baris `Sitemap:`.
 *   (G) Halaman yang didaftarkan di sitemap tidak boleh `noindex`.
 *   (H) Setiap blok <script type="application/ld+json"> adalah JSON yang sah. Satu koma
 *       nyasar membuat SELURUH blok dibuang parser Google, diam-diam.
 *
 * Nol jaringan: semuanya dibaca dari berkas di repo.
 * Print-only: tidak menulis berkas apa pun; exit 1 bila ada FAIL.
 */
'use strict';
const __fzRoot = require('path').join(__dirname, '..');

const fs = require('fs');
const path = require('path');

const ROOT = __fzRoot;
const ORIGIN = 'https://fiezel.my.id';

const checks = [];
let failed = false;
function check(name, ok, details) {
  if (!ok) failed = true;
  checks.push({ name, ok: !!ok, details: details == null ? '' : String(details) });
}

const baca = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const ada = (rel) => fs.existsSync(path.join(ROOT, rel));

/* =======================================================================================
 * PETA TERBIT — satu-satunya tempat pemetaan dua permukaan itu ditulis.
 * =====================================================================================*/

/** URL publik -> jalur berkas di repo, atau null kalau URL itu tidak diterbitkan repo ini. */
function berkasUntukUrl(url) {
  if (!url.startsWith(ORIGIN)) return null;
  let p = url.slice(ORIGIN.length) || '/';
  p = p.split('#')[0].split('?')[0];
  if (!p.startsWith('/')) p = '/' + p;

  // /app/... datang dari AKAR repo.
  if (p === '/app/' || p === '/app') return 'index.html';
  if (p.startsWith('/app/')) {
    const sisa = p.slice('/app/'.length);
    return sisa.endsWith('/') ? sisa + 'index.html' : sisa;
  }

  // sisanya datang dari website/.
  const sisa = p === '/' ? 'index.html' : (p.endsWith('/') ? p.slice(1) + 'index.html' : p.slice(1));
  return 'website/' + sisa;
}

/** Jalur berkas di repo -> URL publiknya (kebalikan berkasUntukUrl, untuk cek kanonik). */
function urlUntukBerkas(rel) {
  let p;
  if (rel.startsWith('website/')) {
    p = '/' + rel.slice('website/'.length);
  } else {
    p = '/app/' + rel;
  }
  if (p.endsWith('/index.html')) p = p.slice(0, -'index.html'.length);
  return ORIGIN + p;
}

/* =======================================================================================
 * PEMBACA HTML SEDERHANA
 * =====================================================================================*/

const ambilSatu = (html, re) => { const m = html.match(re); return m ? m[1] : null; };

const RE_CANONICAL = /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i;
const RE_OGURL = /<meta[^>]+property=["']og:url["'][^>]+content=["']([^"']+)["']/i;

function hreflangs(html) {
  const out = [];
  const re = /<link[^>]+rel=["']alternate["'][^>]*>/gi;
  let m;
  while ((m = re.exec(html))) {
    const tag = m[0];
    const lang = ambilSatu(tag, /hreflang=["']([^"']+)["']/i);
    const href = ambilSatu(tag, /href=["']([^"']+)["']/i);
    if (lang && href) out.push({ lang, href });
  }
  return out;
}

function blokJsonLd(html) {
  const out = [];
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) out.push(m[1]);
  return out;
}

/** Semua simpul {@id, @type} di dalam sebuah struktur JSON-LD, serapa dalam pun. */
function simpulBerId(node, keluar) {
  if (Array.isArray(node)) { node.forEach((n) => simpulBerId(n, keluar)); return keluar; }
  if (!node || typeof node !== 'object') return keluar;
  if (typeof node['@id'] === 'string' && node['@type']) {
    const tipe = Array.isArray(node['@type']) ? node['@type'].slice().sort().join('+') : String(node['@type']);
    keluar.push({ id: node['@id'], tipe });
  }
  for (const v of Object.values(node)) simpulBerId(v, keluar);
  return keluar;
}

/* =======================================================================================
 * HALAMAN YANG DIAWASI
 * =====================================================================================*/

function htmlDiBawah(dir) {
  const keluar = [];
  const jalan = (d) => {
    for (const e of fs.readdirSync(path.join(ROOT, d), { withFileTypes: true })) {
      const rel = d + '/' + e.name;
      if (e.isDirectory()) jalan(rel);
      else if (e.name.endsWith('.html')) keluar.push(rel);
    }
  };
  jalan(dir);
  return keluar.sort();
}

// google*.html adalah berkas verifikasi Search Console: satu baris token, bukan halaman.
const HALAMAN_SITUS = htmlDiBawah('website').filter((f) => !/\/google[0-9a-f]+\.html$/.test(f));
// Halaman akar yang benar-benar disajikan ke murid di /app/ (misi/kurikulum/404 sengaja
// noindex, jadi kanoniknya bukan urusan gerbang ini).
const HALAMAN_APP = ['index.html', 'landing.html'].filter(ada);
const SEMUA_HALAMAN = [...HALAMAN_SITUS, ...HALAMAN_APP];

check('peta: ada halaman situs dan halaman /app/ yang diperiksa',
  HALAMAN_SITUS.length >= 8 && HALAMAN_APP.length === 2,
  'situs=' + HALAMAN_SITUS.length + ' app=' + HALAMAN_APP.length);

/* ======================================== (A) sitemap menunjuk berkas nyata ============ */

const sitemapRel = 'website/sitemap.xml';
check('(A) sitemap root domain ada di website/, bukan di akar repo',
  ada(sitemapRel) && !ada('sitemap.xml'),
  ada('sitemap.xml') ? 'sitemap.xml akar masih ada — ia terbit di /app/sitemap.xml dan tidak boleh mendaftarkan URL root domain' : sitemapRel);

const sitemap = ada(sitemapRel) ? baca(sitemapRel) : '';
const locs = [...sitemap.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1]);

check('(A) sitemap memuat URL', locs.length >= 10, 'jumlah=' + locs.length);

{
  const hilang = [];
  for (const loc of locs) {
    const berkas = berkasUntukUrl(loc);
    if (!berkas || !ada(berkas)) hilang.push(loc + ' -> ' + (berkas || '(di luar repo)'));
  }
  check('(A) setiap <loc> sitemap punya berkas yang benar-benar terbit di alamat itu',
    hilang.length === 0, hilang.join('\n      → '));
}

{
  const duplikat = locs.filter((l, i) => locs.indexOf(l) !== i);
  check('(A) sitemap tanpa <loc> ganda', duplikat.length === 0, duplikat.join(', '));
}

{
  // <priority> wajib angka desimal utuh 0.0-1.0, bukan "0." atau kosong.
  const buruk = [...sitemap.matchAll(/<priority>\s*([^<]*)\s*<\/priority>/g)]
    .map((m) => m[1].trim())
    .filter((v) => !/^(0(\.\d+)?|1(\.0+)?)$/.test(v));
  check('(A) setiap <priority> adalah angka desimal utuh', buruk.length === 0, buruk.join(', '));
}

/* ======================================== (B) kanonik jujur ============================ */

{
  const salah = [];
  const tanpa = [];
  for (const rel of SEMUA_HALAMAN) {
    const html = baca(rel);
    if (/<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*noindex/i.test(html)) continue; // sengaja noindex
    const seharusnya = urlUntukBerkas(rel);
    const canonical = ambilSatu(html, RE_CANONICAL);
    if (!canonical) { tanpa.push(rel); continue; }
    if (canonical !== seharusnya) salah.push(rel + ': klaim ' + canonical + ' — terbit di ' + seharusnya);
    const ogUrl = ambilSatu(html, RE_OGURL);
    if (ogUrl && ogUrl !== seharusnya) salah.push(rel + ' (og:url): klaim ' + ogUrl + ' — terbit di ' + seharusnya);
  }
  check('(B) setiap halaman yang boleh diindeks punya <link rel="canonical">', tanpa.length === 0, tanpa.join(', '));
  check('(B) kanonik dan og:url = URL terbit berkas itu sendiri', salah.length === 0, salah.join('\n      → '));
}

/* ======================================== (C) hreflang tidak bertentangan ============== */

{
  const bentrok = [];
  const mati = [];
  for (const rel of SEMUA_HALAMAN) {
    const alt = hreflangs(baca(rel));
    const perHref = new Map();
    for (const { lang, href } of alt) {
      // x-default MEMANG menunjuk ulang salah satu bahasa — itu definisinya, bukan bentrok.
      if (lang !== 'x-default') {
        const sebelumnya = perHref.get(href);
        if (sebelumnya && sebelumnya !== lang) bentrok.push(rel + ': hreflang ' + sebelumnya + ' dan ' + lang + ' sama-sama menunjuk ' + href);
        perHref.set(href, lang);
      }
      const berkas = berkasUntukUrl(href);
      if (!berkas || !ada(berkas)) mati.push(rel + ': hreflang ' + lang + ' -> ' + href + ' (tidak ada berkasnya)');
    }
  }
  check('(C) tidak ada dua hreflang berbeda yang menunjuk URL yang sama', bentrok.length === 0, bentrok.join('\n      → '));
  check('(C) setiap target hreflang punya berkas yang terbit', mati.length === 0, mati.join('\n      → '));
}

/* ======================================== (D) hreflang timbal balik ==================== */

{
  const sepihak = [];
  const petaAlt = new Map(); // url halaman -> Map(lang -> href)
  for (const rel of SEMUA_HALAMAN) {
    const m = new Map();
    for (const { lang, href } of hreflangs(baca(rel))) if (lang !== 'x-default') m.set(lang, href);
    petaAlt.set(urlUntukBerkas(rel), m);
  }
  for (const [url, m] of petaAlt) {
    for (const [lang, href] of m) {
      if (href === url) continue; // rujukan diri sendiri selalu sah
      const balasan = petaAlt.get(href);
      if (!balasan) { sepihak.push(url + ' -> ' + href + ' (' + lang + '), halaman tujuan tidak menyatakan hreflang apa pun'); continue; }
      const menunjukBalik = [...balasan.values()].includes(url);
      if (!menunjukBalik) sepihak.push(url + ' -> ' + href + ' (' + lang + '), tapi tujuan tidak menunjuk balik');
    }
  }
  check('(D) setiap pasangan hreflang timbal balik', sepihak.length === 0, sepihak.join('\n      → '));
}

/* ======================================== (E) @id tidak bertabrakan @type ============== */
/* ======================================== (H) JSON-LD sah ============================= */

{
  const rusak = [];
  const tipePerId = new Map(); // @id -> Map(@type -> [berkas])
  for (const rel of SEMUA_HALAMAN) {
    for (const [i, blok] of blokJsonLd(baca(rel)).entries()) {
      let data;
      try { data = JSON.parse(blok); }
      catch (e) { rusak.push(rel + ' blok#' + i + ': ' + e.message); continue; }
      for (const { id, tipe } of simpulBerId(data, [])) {
        if (!tipePerId.has(id)) tipePerId.set(id, new Map());
        const m = tipePerId.get(id);
        if (!m.has(tipe)) m.set(tipe, []);
        m.get(tipe).push(rel);
      }
    }
  }
  check('(H) setiap blok application/ld+json adalah JSON yang sah', rusak.length === 0, rusak.join('\n      → '));

  const tabrakan = [];
  for (const [id, m] of tipePerId) {
    if (m.size > 1) {
      tabrakan.push(id + ' dipakai sebagai ' + [...m.entries()].map(([t, f]) => t + ' (' + f.join(', ') + ')').join(' DAN '));
    }
  }
  check('(E) satu @id schema.org tidak pernah punya dua @type berbeda', tabrakan.length === 0, tabrakan.join('\n      → '));
}

/* ======================================== (F) robots.txt ============================== */

function aturanDisallow(teks) {
  return teks.split(/\r?\n/)
    .map((l) => l.replace(/#.*$/, '').trim())
    .filter((l) => /^disallow:/i.test(l))
    .map((l) => l.replace(/^disallow:\s*/i, '').trim())
    .filter(Boolean);
}

{
  const robotsSitus = 'website/robots.txt';
  check('(F) robots.txt yang mengikat ada di website/ (terbit di root domain)', ada(robotsSitus), robotsSitus);

  const situs = ada(robotsSitus) ? baca(robotsSitus) : '';
  check('(F) website/robots.txt mengizinkan crawl (`Allow: /`)', /^\s*Allow:\s*\/\s*$/mi.test(situs));
  check('(F) website/robots.txt menunjuk sitemap root domain',
    new RegExp('^\\s*Sitemap:\\s*' + ORIGIN.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '/sitemap\\.xml\\s*$', 'mi').test(situs));

  // Pola yang menutup berkas render. `/*.js$` dan kawan-kawannya adalah bentuk yang
  // dipakai commit SEO c4e506d; yang dicari di sini POLANYA, bukan satu ejaan tertentu.
  const RE_RENDER = /\.(js|css|json|mjs)\b/i;
  for (const rel of [robotsSitus, 'robots.txt']) {
    if (!ada(rel)) continue;
    const buruk = aturanDisallow(baca(rel)).filter((r) => RE_RENDER.test(r));
    check('(F) ' + rel + ' tidak memblokir berkas render (.js/.css/.json)',
      buruk.length === 0,
      buruk.map((b) => 'Disallow: ' + b).join(', ') + ' — /app/ adalah SPA; memblokirnya berarti Googlebot merender halaman kosong');
  }
}

/* ======================================== (G) sitemap tidak memuat noindex ============= */

{
  const noindex = [];
  for (const loc of locs) {
    const berkas = berkasUntukUrl(loc);
    if (!berkas || !ada(berkas) || !berkas.endsWith('.html')) continue;
    const html = baca(berkas);
    if (/<meta[^>]+name=["'](robots|googlebot)["'][^>]+content=["'][^"']*noindex/i.test(html)) noindex.push(loc + ' (' + berkas + ')');
  }
  check('(G) tidak ada halaman noindex yang didaftarkan di sitemap', noindex.length === 0, noindex.join('\n      → '));
}

/* ======================================== Laporan ===================================== */

let pass = 0;
for (const c of checks) {
  if (c.ok) pass += 1;
  console.log(`${c.ok ? 'PASS' : 'FAIL'}  ${c.name}${c.ok || !c.details ? '' : `\n      → ${c.details}`}`);
}
console.log(`\nseo-surface-gate-test: ${pass}/${checks.length} PASS${failed ? ' — GAGAL (alamat yang diklaim halaman bukan alamat tempat ia terbit)' : ''}`);
process.exit(failed ? 1 : 0);
