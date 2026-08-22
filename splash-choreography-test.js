/**
 * FIEZEL m025-86 — gerak dan bunyi berbagi SATU jam.
 *
 * OWNER: "yang aku inginkan adalah sfx nya mengikuti ritme animasi ... animasinya harus
 * lebih eksklusif dan harus selaras dengan ritme animasinya."
 *
 * Sebelum rilis ini ritmenya ditulis dua kali - sebagai jeda animasi di style.css dan
 * sebagai waktu nada di fiezel-ui-sfx.js - tanpa apa pun yang menjaga keduanya tetap sama.
 * Pengukuran pada m025-84 menemukan lima dari delapan ketukan visual berjalan tanpa bunyi
 * sama sekali, dan 950 milidetik terakhir pembukaan sepenuhnya senyap.
 *
 * Berkas ini menutup celah itu secara struktural, bukan dengan mencocokkan angka sekali:
 *
 *   1. Tabel ketukan hidup di features/brand/fiezel-choreography.js dan HANYA di sana.
 *   2. style.css membaca jeda animasinya lewat var(--fz-bN) - bukan angka.
 *   3. index.html menyalin nilainya sebagai default (splash frame-pertama bergerak sebelum
 *      JavaScript jalan), dan salinan itu dibandingkan di sini.
 *   4. Setiap ketukan yang menggerakkan sesuatu wajib punya nada, dan bunyinya wajib masih
 *      hidup saat gerakan terakhir selesai.
 *
 * Kalau salah satu bergeser sendiri, berkas ini gagal dan menyebut ketukan mana.
 */
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = __dirname;
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');
const choreo = require('./features/brand/fiezel-choreography.js');
const sfx = require('./features/audio/fiezel-ui-sfx.js');
const splash = require('./features/brand/fiezel-splash.js');

let failures = 0;
function test(name, fn) {
  try { fn(); console.log('ok - ' + name); }
  catch (e) { failures++; console.error('FAIL - ' + name + '\n    ' + (e && e.message)); }
}
const squeeze = s => String(s).replace(/\s+/g, '');

/* ---------------- satu jam ---------------- */

test('setiap ketukan yang menggerakkan sesuatu punya jeda, durasi, dan penjelasan', () => {
  assert.ok(choreo.BEATS.length >= 8, 'pembukaan harus punya minimal delapan ketukan');
  const seen = new Set();
  let last = -1;
  for (const b of choreo.BEATS) {
    assert.ok(/^--fz-b\d+$/.test(b.css), b.id + ': nama custom property tidak sesuai pola');
    assert.ok(Number.isFinite(b.at) && b.at >= 0, b.id + ': jeda harus angka');
    assert.ok(Number.isFinite(b.dur) && b.dur > 0, b.id + ': durasi harus angka positif');
    assert.ok(b.moves && b.moves.length > 8, b.id + ': setiap ketukan harus menyebut APA yang bergerak');
    assert.ok(b.at > last, b.id + ': ketukan harus urut menaik');
    assert.ok(!seen.has(b.css), b.css + ' dipakai dua kali');
    seen.add(b.css);
    last = b.at;
  }
});

test('jarak antarketukan TIMPANG, bukan rata - jarak rata terdengar seperti bip', () => {
  const gaps = choreo.BEATS.slice(1).map((b, i) => b.at - choreo.BEATS[i].at);
  assert.ok(new Set(gaps).size >= gaps.length - 1,
    'hampir semua jarak sama; ritmenya jadi metronom, bukan gerakan: ' + gaps.join(','));
});

test('CSS membaca jeda dari jam bersama, bukan dari angka yang ditulis ulang', () => {
  for (const b of choreo.BEATS) {
    if (b.id === 'b8') continue; // tagline dirujuk lewat rise, diperiksa terpisah di bawah
    assert.ok(new RegExp('var\\(' + b.css + '\\b').test(css),
      b.css + ' tidak pernah dipakai di style.css - jeda ketukan ini pasti masih berupa angka');
  }
  assert.ok(/var\(--fz-b8\b/.test(css), '--fz-b8 harus dipakai untuk tagline');
  // Tidak boleh ada lagi jeda animasi berupa angka pada elemen splash.
  // Hanya aturan yang BERANIMASI yang dinilai; .fz-f/.fz-bar juga dipakai untuk
  // transform-box dan tidak punya jeda apa pun untuk digeser.
  const splashRules = (css.match(/\.fiezel-logo \.fz-[a-z0-9]+\{[^}]*\}/g) || [])
    .filter(r => /animation:/.test(r));
  assert.strictEqual(splashRules.length, 5, 'harus ada lima bagian logo yang beranimasi');
  for (const rule of splashRules) {
    assert.ok(/var\(--fz-b/.test(rule),
      'jeda masih ditulis sebagai angka, jadi bisa bergeser lepas dari bunyinya: ' + rule.slice(0, 90));
  }
});

test('durasi animasi di CSS sama dengan durasi di jam bersama', () => {
  const want = Object.fromEntries(choreo.BEATS.map(b => [b.css, b.dur]));
  const rules = css.match(/[^{}]+\{[^}]*var\(--fz-b\d+[^}]*\}/g) || [];
  assert.ok(rules.length >= 6, 'aturan beranimasi yang memakai ketukan tidak ditemukan');
  for (const rule of rules) {
    const beat = rule.match(/var\((--fz-b\d+)/)[1];
    const dur = rule.match(/animation:[^;}]*?\s(\.?\d+(?:\.\d+)?)s\s/);
    assert.ok(dur, beat + ': durasi animasi tidak terbaca');
    const ms = Math.round(parseFloat(dur[1]) * 1000);
    assert.strictEqual(ms, want[beat],
      `${beat}: durasi CSS ${ms}ms tidak sama dengan jam bersama ${want[beat]}ms`);
  }
});

test('salinan ketukan di index.html tidak menyimpang dari jam bersama', () => {
  const block = /<style id="fiezelBootCritical">([\s\S]*?)<\/style>/.exec(html);
  assert.ok(block, 'CSS kritis splash harus ada di <head>');
  assert.ok(squeeze(block[1]).includes(squeeze('#fiezelBootSplash{' + choreo.cssDefaults() + '}')),
    'default ketukan di index.html berbeda dari features/brand/fiezel-choreography.js.\n' +
    '    Harus: #fiezelBootSplash{' + choreo.cssDefaults() + '}');
});

/* ---------------- bunyi mengikuti gerak ---------------- */

test('AKAR KELUHAN: tidak ada lagi ketukan visual yang berjalan tanpa bunyi', () => {
  const audioAt = new Set(sfx.MOTIF.map(n => Math.round(n[1] * 1000)));
  const silent = choreo.BEATS.filter(b => b.pitch !== null && !audioAt.has(b.at));
  assert.deepStrictEqual(silent.map(b => `${b.id}@${b.at}ms (${b.moves})`), [],
    'ketukan berikut bergerak tanpa dibunyikan');
});

test('bunyi masih hidup saat gerakan terakhir selesai - tidak ada ekor senyap', () => {
  const endsAt = choreo.motionEndsAt() / 1000;
  const soundEndsAt = Math.max(...sfx.MOTIF.map(n => n[1] + n[2]));
  assert.ok(soundEndsAt >= endsAt,
    `bunyi berhenti di ${(soundEndsAt * 1000).toFixed(0)}ms padahal gerak baru selesai di ` +
    `${(endsAt * 1000).toFixed(0)}ms - itulah jeda senyap yang dilaporkan owner`);
});

test('motif adalah akor F mayor add9 yang diurai naik, bukan melodi lepas', () => {
  const freqs = sfx.MOTIF.map(n => n[0]);
  for (let i = 1; i < freqs.length; i++) {
    assert.ok(freqs[i] > freqs[i - 1], 'motif harus naik terus; nada ke-' + i + ' turun');
  }
  const P = choreo.PITCH;
  assert.deepStrictEqual(freqs, [P.F2, P.F3, P.C4, P.F4, P.A4, P.C5, P.G5]);
});

test('terts besar jatuh TEPAT saat batang emas naik - warna layar dan warna akor bertemu', () => {
  const gold = choreo.BEATS.find(b => /emas kedua/.test(b.moves));
  assert.ok(gold, 'ketukan batang emas kedua harus ada');
  assert.strictEqual(gold.pitch, choreo.PITCH.A4, 'batang emas kedua harus membawa terts besar');
  assert.strictEqual(gold.role, 'colour');
});

test('SFX transisi semuanya nada dari akor pembuka yang sama', () => {
  const chord = new Set(Object.values(choreo.PITCH));
  for (const name of sfx.names()) {
    for (const note of sfx.VOICES[name]) {
      assert.ok(chord.has(note[0]),
        `${name} memakai ${note[0]} Hz yang bukan nada akor pembuka - bunyinya jadi produk lain`);
    }
  }
});

test('nada penutup adalah kesembilan, bukan tonika - sapaan yang menggantung', () => {
  const last = sfx.MOTIF[sfx.MOTIF.length - 1];
  assert.strictEqual(last[0], choreo.PITCH.G5);
  assert.strictEqual(last[3], 'add9');
});

/* ---------------- kurangi-gerak tidak berarti bisu ---------------- */

test('AKAR KELUHAN iOS: SFX transisi TIDAK lagi dibisukan oleh kurangi-gerak', () => {
  const src = fs.readFileSync(path.join(root, 'features/audio/fiezel-ui-sfx.js'), 'utf8');
  const ready = /function ready\(env[^)]*\)\s*\{([\s\S]*?)\n  \}/.exec(src);
  assert.ok(ready, 'fungsi ready() tidak ditemukan');
  assert.ok(!/reducedMotion/.test(ready[1]),
    'ready() masih membisukan bunyi saat kurangi-gerak aktif.\n' +
    '    prefers-reduced-motion adalah permintaan tentang GERAKAN, bukan pendengaran.\n' +
    '    Di iOS ia lumrah dinyalakan - dan ikut menyala sendiri di Mode Daya Rendah -\n' +
    '    sehingga murid kehilangan seluruh umpan balik bunyi tanpa pernah memintanya.');
});

test('bunyi hanya tunduk pada sakelar murid dan izin browser', () => {
  const src = fs.readFileSync(path.join(root, 'features/audio/fiezel-ui-sfx.js'), 'utf8');
  const ready = /function ready\(env[^)]*\)\s*\{([\s\S]*?)\n  \}/.exec(src)[1];
  assert.ok(/preferencesAllow/.test(ready), 'sakelar "Suara jawaban" murid harus tetap berkuasa');
  assert.ok(/ensureContext/.test(ready), 'izin audio browser harus tetap jadi syarat');
});

test('kurangi-gerak menyisakan sapaan yang memudar, bukan layar yang langsung jadi', () => {
  // Sebelumnya seluruh animasi splash di-set animation:none, sehingga logo langsung utuh
  // dan tidak ada apa pun yang tersusun - persis yang dilaporkan sebagai "terlalu cepat".
  assert.ok(/@keyframes\s+fz-fade-in\s*\{/.test(css), 'harus ada keyframe memudar untuk modus kurangi-gerak');
  const still = css.match(/\.fiezel-splash-still[^{]*\{[^}]*\}/g) || [];
  const logo = still.find(r => /\.fz-f,/.test(r) || /\.fz-f\b/.test(r));
  assert.ok(logo, 'aturan kurangi-gerak untuk bagian logo tidak ditemukan');
  assert.ok(/animation-name:fz-fade-in/.test(logo),
    'bagian logo harus tetap muncul dengan memudar pada ketukan yang sama, bukan dimatikan');
  assert.ok(/transform:none/.test(logo), 'yang dibuang adalah gerakannya, bukan kemunculannya');
});

test('modul melaporkan keadaannya sendiri, supaya perangkat tidak perlu ditebak lagi', () => {
  const d = sfx.diagnostics({});
  for (const k of ['enabled', 'preferensiSuara', 'kurangiGerak', 'pernahDisentuh', 'konteks',
                   'webAudioTersedia', 'saklarSenyapIOS']) {
    assert.ok(k in d, 'diagnostics() harus melaporkan ' + k);
  }
  assert.match(String(d.saklarSenyapIOS), /tidak dapat dideteksi/,
    'titik buta harus ditulis eksplisit, bukan dihilangkan seolah sudah diperiksa');
});

/* ---------------- palet bunyi harus benar-benar tersambung ---------------- */

test('AKAR KELUHAN: setiap bunyi yang dirancang benar-benar dipanggil dari antarmuka', () => {
  // Kelas bug yang menghabiskan dua putaran penuh: mesin bunyinya benar, nadanya benar,
  // izin audionya benar - tapi tiga dari enam bunyi tidak pernah dipanggil dari mana pun.
  // "Tekan tombol apapun di menu" karena itu memang menghasilkan senyap. Tes ini menolak
  // penambahan bunyi yang tidak punya pemanggil.
  const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  const yatim = sfx.names().filter(n => !new RegExp("uiSfx\\(['\"]" + n + "['\"]").test(app));
  assert.deepStrictEqual(yatim, [],
    'bunyi berikut didefinisikan tapi tidak pernah dipanggil dari antarmuka');
});

test('tombol biasa berbunyi lewat delegasi, bukan lewat kabel satu per satu', () => {
  const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  assert.ok(/function bindUiSfxDelegation\(\)/.test(app), 'harus ada delegasi bunyi ketuk');
  assert.ok(/bindUiSfxDelegation\(\);/.test(app), 'delegasi harus dipasang saat boot');
  assert.ok(/addEventListener\('click'/.test(app) && /addEventListener\('change'/.test(app),
    'ketukan dan perubahan sakelar keduanya harus terjaring');
});

test('satu ketukan tidak boleh menghasilkan dua bunyi bertumpuk', () => {
  const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  assert.ok(/SFX_CLAIM_MS/.test(app), 'harus ada pagar waktu klaim');
  assert.ok(/Date\.now\(\)-lastSfxAt\s*<\s*SFX_CLAIM_MS/.test(app),
    'bunyi ketuk harus MENGALAH kalau ketukan itu sudah dibunyikan hal yang lebih bermakna');
  assert.ok(/lastSfxAt\s*=\s*Date\.now\(\)/.test(app),
    'klaim harus dicatat walau pemutarannya gagal, supaya kegagalan tidak memicu bunyi kedua');
});

test('keadaan bunyi bisa dibaca pemiliknya di perangkat, bukan hanya dari kode', () => {
  // m025-88 menambahkan diagnostics() lalu memintanya dibacakan - padahal fungsi itu tidak
  // tersambung ke layar mana pun. Diagnostik yang tidak bisa dibaca bukan diagnostik.
  const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  assert.ok(/id="audioDiagText"/.test(app), 'Pengaturan harus punya baris status bunyi');
  assert.ok(/function audioDiagnosticsText\(\)/.test(app), 'harus ada penerjemah keadaan ke kalimat');
  assert.ok(/refreshAudioDiagnostics/.test(app), 'baris itu harus diisi saat Pengaturan dibuka');
  assert.ok(/saklar senyap/i.test(app),
    'titik buta yang tidak bisa dideteksi dari web harus disebutkan kepada pembacanya');
});

/* ---------------- tipografi ---------------- */

test('wajah bulat pensiun dari chrome aplikasi', () => {
  assert.ok(!/Fredoka/.test(css), 'style.css masih merujuk Fredoka');
  assert.ok(!/Fredoka/.test(html), 'index.html masih merujuk Fredoka');
  assert.ok(!fs.existsSync(path.join(root, 'assets/fonts/Fredoka-700.woff2')),
    'berkas Fredoka masih ada; ia akan ikut ter-precache tanpa dirujuk siapa pun');
});

test('serif display dipakai di ukuran besar saja, dengan berat yang benar-benar ada', () => {
  assert.ok(/--fz-display:'FZ Instrument Serif'/.test(css), 'token display harus ada');
  assert.ok(fs.existsSync(path.join(root, 'assets/fonts/InstrumentSerif-400.woff2')), 'berkas font display harus ada');
  const rule = /\.section-head h1,\.welcome-panel h2,[^{]*\{([^}]*)\}/.exec(css);
  assert.ok(rule, 'aturan display tidak ditemukan');
  assert.ok(/font-weight:400/.test(rule[1]),
    'berkasnya hanya punya berat 400; meminta berat lain membuat browser menebalkannya sendiri');
  assert.ok(!/var\(--fz-display\)[^}]*font-weight:[5-9]00/.test(css), 'ada pemakaian display dengan berat palsu');
});

test('font display ikut ter-precache dan di-preload, jadi wordmark tidak berkedip', () => {
  const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
  assert.ok(sw.includes("'./assets/fonts/InstrumentSerif-400.woff2'"), 'font display harus masuk precache');
  assert.ok(!sw.includes('Fredoka'), 'sw.js masih memprecache font yang sudah dilepas');
  assert.ok(/rel="preload"[^>]*InstrumentSerif-400\.woff2/.test(html), 'font display harus di-preload');
});

test('modul koreografi dimuat sebelum yang membacanya', () => {
  const c = html.indexOf('./features/brand/fiezel-choreography.js');
  const s = html.indexOf('./features/audio/fiezel-ui-sfx.js');
  const b = html.indexOf('./features/brand/fiezel-splash.js');
  assert.ok(c > 0 && s > 0 && b > 0, 'ketiga modul harus dimuat');
  assert.ok(c < s && c < b, 'koreografi harus dimuat lebih dulu; kalau tidak, keduanya jatuh ke fallback');
  const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
  assert.ok(sw.includes("'./features/brand/fiezel-choreography.js'"), 'koreografi harus masuk precache');
});

/* ---------------- wordmark dipakai di seluruh aplikasi ---------------- */

test('wordmark dipakai di splash DAN di topbar, bukan teks lagi', () => {
  // OWNER: "aku mau yang Hero itu dipakai di mana saja."
  assert.ok(/class="brand"><svg class="fiezel-wordmark"/.test(html),
    'topbar harus memakai wordmark, bukan teks FIE/ZEL');
  assert.ok(/fiezel-splash-word"><svg class="fiezel-wordmark"/.test(splash.markup()),
    'splash harus memakai wordmark, bukan teks');
  assert.ok(!/>FIE<span>ZEL<\/span></.test(html), 'sisa wordmark berupa teks harus hilang');
});

test('wordmark di kode identik dengan berkas SVG yang dihasilkan generator', () => {
  // Dua salinan hanya aman selama ada yang menjaganya tetap sama.
  const file = fs.readFileSync(path.join(root, 'assets/brand/fiezel-wordmark.svg'), 'utf8');
  const rects = x => (x.match(/<rect[^>]*>/g) || []);
  const a = rects(splash.wordmarkMarkup('x')), b = rects(file);
  assert.strictEqual(a.length, b.length, 'jumlah bentuk berbeda dari berkas SVG');
  const drift = a.filter((r, i) => r !== b[i]);
  assert.deepStrictEqual(drift, [], 'bentuk berikut menyimpang dari assets/brand/fiezel-wordmark.svg');
});

test('id gradien diberi awalan per pemakaian, supaya dua salinan tidak saling menimpa', () => {
  const a = splash.wordmarkMarkup('aa'), b = splash.wordmarkMarkup('bb');
  assert.ok(/id="aaIv"/.test(a) && /id="bbIv"/.test(b), 'awalan id harus benar-benar dipakai');
  assert.ok(!/id="aaIv"/.test(b), 'dua pemakaian tidak boleh berbagi id gradien');
  // Halaman memuat wordmark dua kali (splash frame-pertama dan topbar): id-nya harus beda.
  const ids = (html.match(/<linearGradient id="([^"]+)"/g) || []).map(m => m.slice(22, -1));
  assert.strictEqual(new Set(ids).size, ids.length, 'ada id gradien kembar di index.html: ' + ids.join(','));
});

test('dua batang emas cukup lebar untuk bertahan sampai ukuran topbar', () => {
  // Batang 16 dengan celah 10 hanya bertahan di ukuran besar; pada 96px keduanya lumer.
  // Diuji dengan merender, lalu dilebarkan ke 26 dan 22.
  const bars = /<g fill="url\(#xGo\)">(.*?)<\/g>/.exec(splash.wordmarkMarkup('x'));
  assert.ok(bars, 'batang emas tidak ditemukan');
  const widths = [...bars[1].matchAll(/\swidth="(\d+)"/g)].map(m => Number(m[1]));
  assert.deepStrictEqual(widths, [26, 26], 'lebar batang emas harus 26; di bawah itu ia lumer di topbar');
  const xs = [...bars[1].matchAll(/\sx="(\d+)"/g)].map(m => Number(m[1]));
  assert.strictEqual(xs[1] - xs[0] - 26, 22, 'celah antarbatang harus 22');
});

process.on('exit', () => {
  if (failures) {
    console.error('FIEZEL m025-86 koreografi splash: FAIL (' + failures + ')');
    process.exitCode = 1;
  } else {
    console.log('FIEZEL m025-86 koreografi splash: PASS');
  }
});
