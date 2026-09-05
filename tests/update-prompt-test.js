/**
 * FIEZEL gate — KABAR PEMBARUAN HARUS TERLIHAT MURID.
 *
 * Kelas bug yang ditutup di sini bukan "kode salah", melainkan "kode benar yang tidak
 * pernah terlihat": sebelum m025-212 pembaruan dipasang diam-diam lalu halaman memuat
 * ulang dirinya sendiri. Di PWA terpasang itu terbaca sebagai kedipan tanpa sebab, dan
 * kalau perpindahan controller tidak pernah terjadi, murid memegang versi basi tanpa satu
 * pun tanda di layar - keadaan yang mustahil diadukan karena tidak ada yang bisa dilihat.
 *
 * Karena itu tiga hal berikut adalah kontrak rilis, bukan selera:
 *   1. kartu pembaruan ADA di index.html sebagai markup statis (bukan disuntik JS, supaya
 *      ia tetap ada meski sebagian skrip gagal dimuat) dan punya tombol pasang + tunda;
 *   2. sw.js punya SATU pintu skipWaiting yang hanya terbuka oleh pesan dari halaman -
 *      install/activate tetap tidak boleh memaksa perpindahan generasi sendiri;
 *   3. logikanya tinggal di ./features/ui/fiezel-update-prompt.js - BUKAN di app.js, yang
 *      dilayani cache-first dari shell lama dan karena itu tidak pernah sampai ke PWA yang
 *      sudah terpasang - dan muat ulang hanya terjadi sesudah murid menekan tombolnya.
 */
const assert = require('assert');
const fs = require('fs');

let failures = 0;
const tests = [];
function test(name, fn) { tests.push([name, fn]); }

const html = fs.readFileSync('./index.html', 'utf8');
const sw = fs.readFileSync('./sw.js', 'utf8');
const app = fs.readFileSync('./app.js', 'utf8');
const prompt = fs.readFileSync('./features/ui/fiezel-update-prompt.js', 'utf8');
const swAssets = (sw.match(/const ASSETS=\[[\s\S]*?\];/) || [''])[0];
const css = fs.readFileSync('./style.css', 'utf8');

test('kartu pembaruan ada di markup statis, bukan disuntik JS', () => {
  assert.ok(/id="updateBanner"/.test(html), 'index.html kehilangan #updateBanner');
  assert.ok(/id="updateBannerApply"/.test(html), 'tombol pasang hilang');
  assert.ok(/id="updateBannerLater"/.test(html), 'tombol tunda hilang');
});

test('kartu mengumumkan diri ke pembaca layar dan punya judul terkait', () => {
  const card = html.slice(html.indexOf('id="updateBanner"'));
  assert.ok(/role="alertdialog"/.test(card.slice(0, 400)), 'kartu wajib beri tahu pembaca layar');
  assert.ok(/aria-labelledby="updateBannerTitle"/.test(card.slice(0, 400)));
  assert.ok(/id="updateBannerTitle"/.test(card.slice(0, 2000)));
});

test('kartu membawa instruksi, bukan hanya kata "update"', () => {
  const body = (html.match(/id="updateBannerBody"[^>]*>([\s\S]*?)<\/p>/) || [])[1] || '';
  assert.ok(body.length > 60, 'badan kartu terlalu pendek untuk sebuah instruksi');
  assert.ok(/Perbarui sekarang/.test(body), 'instruksi wajib menyebut nama tombolnya');
});

test('tombol kartu cukup besar untuk jempol (>=44px)', () => {
  const rule = (css.match(/\.update-banner-apply,\.update-banner-later\{[^}]*\}/) || [])[0] || '';
  const min = Number((rule.match(/min-height:(\d+)px/) || [])[1] || 0);
  assert.ok(min >= 44, `target sentuh tombol pembaruan ${min}px, minimum 44px`);
});

test('sw.js membuka skipWaiting HANYA lewat pesan halaman', () => {
  assert.ok(/FIEZEL_SKIP_WAITING/.test(sw), 'sw.js tidak punya pintu skipWaiting');
  const install = (sw.match(/addEventListener\('install'[\s\S]{0,400}/) || [''])[0];
  assert.ok(!/skipWaiting\(\)/.test(install), 'install tidak boleh memaksa skipWaiting');
  const activate = (sw.match(/addEventListener\('activate'[\s\S]{0,600}/) || [''])[0];
  assert.ok(!/skipWaiting\(\)/.test(activate), 'activate tidak boleh memaksa skipWaiting');
});

test('kartu dimunculkan dari worker yang menunggu', () => {
  assert.ok(/function show\(worker/.test(prompt));
  assert.ok(/reg\.waiting/.test(prompt), 'worker yang menunggu tidak diperiksa');
  assert.ok(/'updatefound'/.test(prompt), 'updatefound tidak didengarkan');
});

/* Inti pertanyaan "apakah PWA lama ikut menerimanya": app.js dilayani cache-first dari shell
 * generasi lama, jadi kode di dalamnya TIDAK sampai ke instalasi lama sampai worker barunya
 * aktif. Berkas terpisah dengan nama baru adalah cache miss di shell lama -> diambil dari
 * jaringan -> kartunya muncul di instalasi lama juga. Tiga syaratnya dikunci di sini. */
test('logika kartu ada di berkas terpisah, bukan di app.js', () => {
  assert.ok(/FiezelUpdatePrompt/.test(prompt), 'berkas kartu tidak mengekspor dirinya');
  assert.ok(/FiezelUpdatePrompt/.test(app), 'app.js tidak mendelegasi ke berkas kartu');
  assert.ok(!/function showUpdatePrompt\(/.test(app),
    'logika kartu kembali masuk app.js - instalasi lama tidak akan menerimanya');
});

test('berkas kartu di-precache DAN dimuat halaman', () => {
  assert.ok(/fiezel-update-prompt\.js/.test(swAssets),
    'berkas kartu wajib ada di ASSETS sw.js: itu yang menempatkannya di jalur shell');
  assert.ok(/<script defer src="\.\/features\/ui\/fiezel-update-prompt\.js"><\/script>/.test(html),
    'halaman tidak memuat berkas kartu (harus defer)');
});

test('berkas kartu berdiri sendiri - tidak menumpang global app.js', () => {
  assert.ok(/\(function \(\)/.test(prompt), 'wajib IIFE: berkas lepas bisa termuat dua kali');
  assert.ok(/self\.FIEZEL_VERSION/.test(prompt),
    'versi wajib dibaca dari self.FIEZEL_VERSION (version.js), bukan dari global app.js');
  for (const global of ['state.', 'showToast(', 'openModal(', 'save()']) {
    assert.ok(!prompt.includes(global),
      'berkas kartu menyentuh ' + global + ' milik app.js; di instalasi lama global itu bisa belum ada');
  }
});

test('perpindahan generasi hanya dipicu tombol murid', () => {
  assert.ok(/FIEZEL_SKIP_WAITING/.test(prompt), 'halaman tidak pernah meminta skipWaiting');
  const applyAt = prompt.indexOf('function apply()');
  const applyBody = applyAt < 0 ? '' : prompt.slice(applyAt, prompt.indexOf('\n  }', applyAt));
  assert.ok(/FIEZEL_SKIP_WAITING/.test(applyBody), 'permintaan skipWaiting wajib di dalam jalur tombol');
  assert.ok(/updateBannerApply/.test(prompt) && /addEventListener\('click', apply\)/.test(prompt),
    'tombol pasang tidak terikat ke jalur pemasangan');
});

test('tidak ada lagi muat ulang otomatis tanpa kartu', () => {
  assert.ok(!/applySilentUpdate/.test(app), 'jalur pembaruan diam-diam masih ada di app.js');
  // Penanda persetujuan dipasang di jalur tombol dan diperiksa di DUA tempat: pendengar
  // controllerchange dan jaring pengaman waktu habis. Keduanya wajib ada - satu saja berarti
  // ada jalur muat ulang yang tidak menanyakan apakah murid memang menyetujuinya.
  const reloads = prompt.match(/location\.reload\(\)/g) || [];
  assert.strictEqual(reloads.length, 1, 'muat ulang wajib punya SATU jalur saja');
  const guardAt = prompt.indexOf('function reloadIfApproved()');
  const guard = guardAt < 0 ? '' : prompt.slice(guardAt, prompt.indexOf('\n  }', guardAt));
  assert.ok(/sess\('fiezel-apply-update'\) !== '1'\) return;/.test(guard),
    'satu-satunya jalur muat ulang wajib dijaga penanda persetujuan murid');
  assert.ok(/location\.reload\(\)/.test(guard), 'penjaga itu wajib yang memegang muat ulangnya');
});

test('penundaan murid tidak abadi: hanya sepanjang sesi tab', () => {
  assert.ok(/setSess\('fiezel-update-later', '1'\)/.test(prompt) && /sessionStorage\.setItem/.test(prompt),
    'penundaan wajib memakai sessionStorage, bukan localStorage');
  assert.ok(!/localStorage/.test(prompt), 'penundaan tidak boleh permanen');
});

for (const [name, fn] of tests) {
  try { fn(); console.log(`  ok  ${name}`); }
  catch (e) { failures++; console.log(`FAIL  ${name}\n      ${e.message}`); }
}
console.log(`\n${tests.length - failures}/${tests.length} lulus`);
process.exit(failures ? 1 : 0);
