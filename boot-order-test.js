/**
 * FIEZEL gate — urutan boot.
 *
 * OWNER melaporkan dua hal tentang lima detik pertama aplikasi: "Terlalu banyak script
 * terpisah (30+ file JS) dimuat sinkron di <head>/<body> tanpa bundling/lazy-load" dan
 * "Ketergantungan ke js.puter.com ... kalau Puter down/lambat, splash/loading ikut ketahan".
 *
 * Perbaikannya kecil di permukaan (async, defer, type="fiezel/lazy") tetapi menyentuh
 * invarian yang kalau patah tidak akan terlihat sebagai galat, melainkan sebagai layar
 * kosong. Gate ini menahan invarian itu:
 *
 *  1. js.puter.com TIDAK BOLEH parser-blocking lagi, dan tidak boleh berubah jadi `defer`
 *     diam-diam: `defer` mempertahankan urutan antar-skrip, jadi satu berkas pihak ketiga
 *     yang lambat akan MENAHAN seluruh berkas ber-defer di belakangnya - persis penyakit
 *     yang sedang diobati, hanya berpindah tempat.
 *  2. TIDAK BOLEH ada blok <script> inline di antara berkas-berkas ber-defer. Blok inline
 *     tidak ikut ditunda: ia berjalan SEBELUM app.js dan akan membaca fungsi yang belum
 *     ada. Satu-satunya inline yang sah adalah skrip boot splash cat-pertama, yang memang
 *     harus berjalan lebih dulu dan tidak menyentuh apa pun dari app.js.
 *  3. Grup malas harus tetap punya urutan tulis yang benar (beberapa berkas suara adalah
 *     tambalan yang membungkus tetangganya) dan Classroom harus bergantung pada grup suara.
 *  4. Semua berkas baru harus ikut di-precache service worker, atau peluncuran offline
 *     akan kehilangan bagian yang justru dipindahkan ke jalur malas.
 */
const assert = require('assert');
const fs = require('fs');

let failures = 0;
function test(name, fn) {
  try { fn(); console.log('ok - ' + name); }
  catch (e) { failures++; console.error('FAIL - ' + name + '\n    ' + (e && e.message)); }
}

const html = fs.readFileSync('./index.html', 'utf8');
const sw = fs.readFileSync('./sw.js', 'utf8');
const app = fs.readFileSync('./app.js', 'utf8');

// Komentar dibuang dulu: komentar di index.html memang membicarakan <script> dan nama
// berkas, dan tanpa ini gate ini akan menghitung kalimat sebagai tag. Panjangnya dijaga
// tetap sama (diganti spasi) supaya offset yang dipakai perbandingan posisi tidak bergeser.
const scanHtml = html.replace(/<!--[\s\S]*?-->/g, c => ' '.repeat(c.length));
// Semua tag <script> dalam urutan dokumen, beserta atribut yang menentukan kapan ia jalan.
const scripts = [];
const scriptRe = /<script\b([^>]*)>/g;
let m;
while ((m = scriptRe.exec(scanHtml)) !== null) {
  const attrs = m[1];
  const src = (/\ssrc="([^"]+)"/.exec(attrs) || [])[1] || '';
  scripts.push({
    at: m.index,
    src,
    inline: !src,
    async: /\sasync(\s|=|$)/.test(attrs),
    defer: /\sdefer(\s|=|$)/.test(attrs),
    type: (/\stype="([^"]+)"/.exec(attrs) || [])[1] || '',
    group: (/\sdata-fiezel-lazy="([^"]+)"/.exec(attrs) || [])[1] || '',
    when: (/\sdata-fiezel-lazy-when="([^"]+)"/.exec(attrs) || [])[1] || '',
    needs: (/\sdata-fiezel-lazy-needs="([^"]+)"/.exec(attrs) || [])[1] || ''
  });
}

const lazy = scripts.filter(s => s.type === 'fiezel/lazy');
const eager = scripts.filter(s => s.src && s.type !== 'fiezel/lazy');
const inline = scripts.filter(s => s.inline);

test('js.puter.com async - bukan blocking, dan bukan defer', () => {
  const puter = scripts.filter(s => /js\.puter\.com/.test(s.src));
  assert.strictEqual(puter.length, 1, 'SDK Puter harus dimuat tepat sekali');
  assert.ok(puter[0].async, 'SDK pihak ketiga harus async supaya tidak menahan pengurai');
  assert.ok(!puter[0].defer,
    'defer TIDAK cukup: ia mempertahankan urutan, jadi Puter yang lambat tetap menahan seluruh berkas di belakangnya');
  assert.ok(/id="fiezelPuterSdk"/.test(html),
    'tag-nya perlu id supaya ./fiezel-puter-ready.js bisa mendengar load/error-nya');
});

test('setiap skrip lokal ber-defer - tidak ada lagi yang menahan pengurai', () => {
  const blocking = eager.filter(s => !/^https?:/.test(s.src) && !s.defer && !s.async);
  assert.deepStrictEqual(blocking.map(s => s.src), [],
    'skrip lokal berikut masih parser-blocking: ' + blocking.map(s => s.src).join(', '));
});

test('hanya skrip boot splash yang boleh inline - inline tidak ikut ditunda', () => {
  assert.strictEqual(inline.length, 1,
    'ada ' + inline.length + ' blok inline; blok inline berjalan SEBELUM app.js dan akan melempar ReferenceError');
  const splashAt = html.indexOf('id="fiezelBootSplash"');
  assert.ok(splashAt > 0 && inline[0].at > splashAt && inline[0].at < html.indexOf('id="globalSky"'),
    'satu-satunya inline yang sah adalah skrip pembuang splash cat-pertama, tepat di bawah markup splash');
  const inlineBody = scanHtml.slice(inline[0].at, scanHtml.indexOf('</script>', inline[0].at));
  assert.ok(!/flushReportQueue|openSettings|FiezelLazy|state\./.test(inlineBody),
    'skrip boot splash tidak boleh menyentuh apa pun milik app.js - ia berjalan jauh sebelum app.js ada');
});

test('dua blok inline lama sekarang jadi berkas ber-defer SESUDAH app.js', () => {
  // Keduanya membaca global yang baru ada setelah app.js dieksekusi. Sebagai inline mereka
  // akan berjalan lebih dulu; sebagai berkas ber-defer urutannya kembali benar.
  const appAt = html.indexOf('<script defer src="./app.js"></script>');
  assert.ok(appAt > 0, 'app.js harus tetap skrip klasik ber-defer');
  for (const file of ['./features/ui/fiezel-report-gesture-isolation.js', './features/ui/fiezel-boot-tail.js']) {
    const tag = '<script defer src="' + file + '"></script>';
    assert.ok(html.indexOf(tag) > appAt, file + ' harus dimuat setelah app.js');
    assert.ok(fs.existsSync(file.replace('./', '')), file + ' harus benar-benar ada');
  }
  const tail = fs.readFileSync('./features/ui/fiezel-boot-tail.js', 'utf8');
  assert.ok(/serviceWorker/.test(tail) && /settingDarkMode/.test(tail),
    'ekor boot harus tetap memegang pendaftaran service worker dan baris Mode gelap');
  assert.ok(/\(function \(\)/.test(tail),
    'isinya harus dibungkus IIFE: `const` global yang sama dua kali adalah SyntaxError yang mematikan boot');
});

test('tumpukan berat ditandai malas, dan tidak diambil browser saat mengurai', () => {
  assert.ok(lazy.length >= 20, 'grup malas terlalu kecil, ada ' + lazy.length + ' berkas');
  for (const s of lazy) {
    assert.strictEqual(s.type, 'fiezel/lazy', s.src + ' kehilangan tipe yang membuatnya diabaikan browser');
    assert.ok(!s.defer && !s.async, s.src + ' tidak boleh punya defer/async - ia bukan skrip sungguhan di dokumen');
    assert.ok(s.group, s.src + ' harus menyebut grupnya');
  }
  const groups = [...new Set(lazy.map(s => s.group))];
  assert.deepStrictEqual(groups, ['voice', 'classroom'], 'grup malas: ' + groups.join(', '));
});

test('urutan di dalam grup suara adalah kontrak, bukan selera', () => {
  const voice = lazy.filter(s => s.group === 'voice').map(s => s.src);
  const at = name => voice.findIndex(src => src.endsWith(name));
  assert.ok(at('fiezel-m0281-prebootstrap-hotfix.js') > -1 && at('fiezel-neural-voice-bootstrap.js') > -1);
  assert.ok(at('fiezel-m0281-prebootstrap-hotfix.js') < at('fiezel-neural-voice-bootstrap.js'),
    'tambalan pra-bootstrap harus mendahului bootstrap');
  // m025-95: penjaga runtime M028.2 dihapus - seluruh isinya adalah verifikasi suara
  // Indonesia, dan sisanya tidak pernah dipanggil siapa pun.
  assert.strictEqual(at('fiezel-m0281-runtime-guard.js'), -1,
    'penjaga runtime yang sudah dihapus tidak boleh dimuat lagi');
  assert.ok(at('fiezel-voice-diagnostics.js') < at('fiezel-neural-voice.js'),
    'diagnostik suara harus siap sebelum runtime yang menulis ke dalamnya');
});

test('Classroom menunggu grup suara, walaupun murid membukanya lebih dulu', () => {
  const classroom = lazy.filter(s => s.group === 'classroom');
  assert.ok(classroom.length >= 4, 'tumpukan tutor/Classroom tidak lengkap');
  assert.strictEqual(classroom[0].needs, 'voice',
    'tutor v3 menimpa runtime suara; tanpa ketergantungan ini penjaga runtime bisa merekam runtime yang belum utuh');
  const order = classroom.map(s => s.src);
  // m025-95: tambalan suara Indonesia dihapus bersama mesinnya, jadi urutannya pun hilang.
  assert.ok(order.findIndex(x => x.endsWith('fiezel-tutor-dialog.js')) <
    order.findIndex(x => x.endsWith('fiezel-tutor-voice-chat.js')),
    'mesin dialog harus ada sebelum lapisan bicara memanggilnya');
});

test('Diagnostics TIDAK ikut malas - nilainya justru ada lebih dulu', () => {
  const diagAt = html.indexOf('<script defer src="./features/neural-voice/fiezel-diag-panel.js">');
  const appAt = html.indexOf('<script defer src="./app.js">');
  assert.ok(diagAt > 0 && diagAt < appAt,
    'panel Diagnostics harus tetap dimuat sungguhan sebelum app.js: kalau app.js melempar, tombolnya harus tetap ada');
});

test('pemuat malas dan penunggu Puter dimuat sebelum yang membutuhkannya', () => {
  const idx = src => html.indexOf('<script defer src="' + src + '"></script>');
  assert.ok(idx('./fiezel-puter-ready.js') > 0);
  assert.ok(idx('./fiezel-lazy-loader.js') > 0);
  assert.ok(idx('./fiezel-lazy-loader.js') < html.indexOf('<script defer src="./app.js">'),
    'app.js memanggil FiezelLazy.load(); pemuatnya harus sudah ada');
});

test('berkas baru ikut di-precache service worker - peluncuran offline tetap utuh', () => {
  for (const file of ['./fiezel-puter-ready.js', './fiezel-lazy-loader.js',
    './features/ui/fiezel-report-gesture-isolation.js', './features/ui/fiezel-boot-tail.js']) {
    assert.ok(sw.includes("'" + file + "'"), file + ' belum ada di ASSETS');
  }
  for (const s of lazy) {
    assert.ok(sw.includes("'" + s.src + "'"), s.src + ' malas tetapi tidak di-precache: offline akan kehilangan suara/Classroom');
  }
});

test('splash cat-pertama tetap yang pertama diurai', () => {
  const splashAt = html.indexOf('id="fiezelBootSplash"');
  const firstScriptAt = html.indexOf('<script');
  assert.ok(splashAt > 0 && splashAt < firstScriptAt,
    'splash harus diurai sebelum <script> pertama - itu satu-satunya alasan ia tercat lebih dulu');
});

// --- perilaku pemuat, bukan sekadar bentuk dokumen -------------------------------------

function fakeDom(tags) {
  const executed = [];
  const inserted = [];
  const nodes = tags.map(t => ({
    attrs: t,
    getAttribute(k) { return Object.prototype.hasOwnProperty.call(t, k) ? t[k] : null; },
    setAttribute(k, v) { t[k] = v; }
  }));
  // Meniru kontrak browser yang sesungguhnya: skrip yang disisipkan skrip diunduh paralel
  // dan SELESAI dalam urutan acak, tetapi dijalankan sesuai urutan penyisipan SELAMA
  // el.async === false. Kalau pemuat lupa memasang async=false, fake ini menjalankannya
  // sesuai urutan unduh yang acak - dan tesnya gagal, persis seperti di browser.
  let cursor = 0;
  function drain() {
    while (cursor < inserted.length && inserted[cursor].done) {
      const el = inserted[cursor++];
      executed.push(el.src);
      el.onload();
    }
  }
  const head = {
    appendChild(el) {
      const ordered = el.async === false;
      const slot = { src: el.src, onload: el.onload, done: false, async: el.async };
      inserted.push(slot);
      setTimeout(() => {
        slot.done = true;
        if (ordered) drain();
        else { executed.push(slot.src); slot.onload(); }
      }, 1 + ((inserted.length * 7) % 5));
    }
  };
  const doc = {
    readyState: 'interactive',
    head,
    querySelectorAll() { return nodes; },
    createElement() { return { onload: null, onerror: null, setAttribute() {} }; },
    dispatchEvent() { return true; },
    addEventListener() {}
  };
  return { doc, executed, inserted, nodes };
}

test('pemuat menghormati ketergantungan antar-grup, bukan hanya urutan tulis', async () => {
  const loader = require('./fiezel-lazy-loader.js');
  const { doc, executed, inserted } = fakeDom([
    { 'data-fiezel-lazy': 'voice', src: 'a-voice-1.js', 'data-fiezel-lazy-when': 'idle' },
    { 'data-fiezel-lazy': 'voice', src: 'a-voice-2.js' },
    { 'data-fiezel-lazy': 'classroom', src: 'b-class-1.js', 'data-fiezel-lazy-needs': 'voice' }
  ]);
  const target = {
    document: doc,
    setTimeout: (fn, ms) => setTimeout(fn, ms),
    CustomEvent: function (name, init) { return { type: name, detail: init && init.detail }; }
  };
  const api = loader.install(target);
  assert.deepStrictEqual(api.groups(), ['voice', 'classroom']);
  // Classroom diminta LEBIH DULU: grup suara tetap harus dieksekusi sebelumnya.
  return api.load('classroom').then(() => {
    assert.deepStrictEqual(executed, ['a-voice-1.js', 'a-voice-2.js', 'b-class-1.js'],
      'urutan eksekusi salah: ' + executed.join(', '));
    assert.ok(inserted.every(x => x.async === false),
      'setiap skrip sisipan harus async=false, atau urutannya ditentukan kecepatan jaringan');
  });
});

test('gelombang malas berangkat SETELAH layar utama tergambar, bukan sebelumnya', () => {
  const src = fs.readFileSync('./fiezel-lazy-loader.js', 'utf8');
  assert.ok(!/addEventListener\('load'/.test(src),
    "gelombang malas tidak boleh digantungkan pada event 'load': event itu menunggu js.puter.com juga");
  assert.ok(/requestIdleCallback\(fn, \{ timeout: \d+ \}\)/.test(src),
    'panggilan idle harus punya batas waktu, karena sebagian browser menunda idle pertama sampai setelah load');
  // Diukur, bukan ditebak: gelombang yang berangkat begitu DOM siap merebut pita dari
  // app.js dan ~2,7 MB JSON kontennya, dan seluruh penghematannya hilang. Pemicunya harus
  // openApp(), tepat sesudah render().
  assert.ok(/try\{self\.FiezelLazy\?\.start\?\.\(\)\}catch\{\}/.test(app),
    'openApp() harus yang memulai gelombang malas');
  assert.ok(app.indexOf('self.FiezelLazy?.start?.()') > app.indexOf('notifyAppUpdateIfNew();render();'),
    'pemicunya harus SESUDAH render(), bukan sebelum');
  assert.ok(/FALLBACK_DELAY_MS/.test(src) && /doc\.addEventListener\('DOMContentLoaded', arm/.test(src),
    'harus ada jaring pengaman: app.js yang melempar sebelum openApp() tidak boleh membuat suara/Classroom tidak pernah terambil');
});

test('pemakai Puter menunggu kesiapan, tidak menyimpulkan dari ketiadaan', () => {
  assert.ok(/async function awaitPuter\(/.test(app), 'harus ada satu tempat untuk menunggu SDK');
  assert.ok(/const sdk=await awaitPuter\(\);if\(sdk\?\.workers\?\.exec\)/.test(app),
    'coreWorkerExec harus menunggu SDK sebelum melempar puter_workers_unavailable');
  assert.ok(/function armPuterAuthGate\(\)/.test(app) && /FiezelPuterReady\?\.ready\?\.\(\)/.test(app),
    'gerbang akun harus dipasang lewat penantian, bukan lewat tebakan sesaat');
  assert.ok(/if\(!puterAuthAvailable\(\)\)\{\s*\n?\s*setAuthGateState\('pending'\);/.test(app),
    'tombol login harus berpindah ke pending dan menunggu, bukan gagal diam-diam');
});

(async () => {
  // Satu tes memakai Promise; beri kesempatan selesai sebelum menghitung.
  await new Promise(r => setTimeout(r, 120));
  console.log('');
  if (failures) { console.error('FIEZEL boot order: FAIL (' + failures + ')'); process.exit(1); }
  console.log('FIEZEL boot order: PASS');
})();
