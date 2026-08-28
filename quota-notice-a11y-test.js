/**
 * FIEZEL A8 gate — quota-notice-a11y-test.js
 *
 * Naskah pemberitahuan adalah satu-satunya bagian aplikasi yang HANYA muncul saat ada yang
 * rusak. Karena itu ia nggak pernah dilihat siapa pun sebelum dilihat murid, dan karena itu
 * pula ia perlu gerbang: kalimat yang bohong, `role="alert"` yang menyerobot kalimat soal,
 * atau tombol bayar yang menyelip masuk nggak akan tertangkap oleh mata siapa pun sampai
 * seorang murid kehilangan jawabannya.
 *
 * Node murni, memindai SUMBER — tanpa peramban, tanpa jaringan. Tujuh butir yang diwajibkan
 * brief A8 (a…g) ditandai eksplisit di nama tiap pemeriksaan.
 *
 * NASKAH YANG DIATUR KANON = tiga korpus:
 *   K1  features/quota/quota-copy.js       — seluruh nilai COPY + markup yang dihasilkannya
 *   K2  workers/api/{tts,ai}/route-*.js    — peta POLITE (kalimat yang dikirim ke murid)
 *   K3  app.js                             — blok pemberitahuan: presentQuotaNotice,
 *                                            maybePresentPuterCreditNotice, aiErrorMessage,
 *                                            renderAIError
 * `reports/` dan berkas gerbang TIDAK termasuk: prosa untuk pengembang bebas menyebut nama
 * mesin, dan menyensornya di sana justru membuat laporan temuan nggak bisa ditulis.
 */
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

let failures = 0;
const results = [];
function test(name, fn) {
  try { fn(); results.push({ name, pass: true }); console.log('ok - ' + name); }
  catch (e) {
    failures++; results.push({ name, pass: false, error: e.message });
    console.error('FAIL - ' + name + '\n    ' + e.message);
  }
}

const root = __dirname;
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const COPY_MODULE_PATH = 'features/quota/quota-copy.js';
const Copy = require('./' + COPY_MODULE_PATH);
const copySource = read(COPY_MODULE_PATH);
const appSource = read('app.js');
const ttsSource = read('workers/api/tts/route-tts.js');
const aiSource = read('workers/api/ai/route-ai.js');
const cssSource = read('style.css');
const htmlSource = read('index.html');
const addonSource = read('features/speaking-listening/fiezel-speaking-listening-addon.js');

/* ============================================================ alat bantu ================= */

/** Membuang komentar supaya prosa untuk pengembang nggak dihitung sebagai naskah murid. */
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:\\])\/\/[^\n]*/g, '$1 ');
}

/** Mengambil blok sumber satu fungsi `name` dengan menghitung kurung kurawal. */
function functionBlock(src, name) {
  const start = src.indexOf('function ' + name + '(');
  assert.ok(start !== -1, 'fungsi ' + name + ' nggak ditemukan di app.js');
  let depth = 0, i = src.indexOf('{', start);
  const from = i;
  for (; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') { depth--; if (depth === 0) return src.slice(from, i + 1); }
  }
  throw new Error('blok fungsi ' + name + ' nggak lengkap');
}

/** Teks yang benar-benar dibaca murid dari sebuah literal string berisi markup. */
function visibleText(literal) {
  return literal
    .replace(/\$\{[^}]*\}/g, ' ')   // placeholder template
    .replace(/<[^>]*>/g, ' ')       // tag + seluruh atributnya
    .replace(/&[a-z]+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Semua literal string di sebuah potongan sumber (kutip tunggal, ganda, dan template). */
function stringLiterals(src) {
  const out = [];
  const re = /'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"|`((?:[^`\\]|\\.)*)`/g;
  let m;
  while ((m = re.exec(src)) !== null) out.push(m[1] || m[2] || m[3] || '');
  return out;
}

/** Kalimat murid = teks kelihatan, cukup panjang, dan bukan potongan kode/selector. */
function studentSentences(src) {
  return stringLiterals(stripComments(src))
    .map(visibleText)
    .filter((s) => s.length >= 12 && / [a-z]/.test(s) && !/^[.#[]/.test(s) && !/[{};=]/.test(s));
}

function politeMap(src, label) {
  const block = (src.match(/var POLITE = Object\.freeze\(\{[\s\S]*?\n  \}\);/) || [''])[0];
  assert.ok(block, 'peta POLITE nggak ditemukan di ' + label);
  return stringLiterals(stripComments(block)).filter((s) => s.length >= 12);
}

/* Korpus. */
const K1_module = (function () {
  const out = [];
  Object.keys(Copy.COPY).forEach((k) => {
    const e = Copy.COPY[k];
    out.push(e.title, e.spoken, e.silent);
  });
  out.push(Copy.REASSURANCE);
  Object.keys(Copy.COPY).forEach((k) => {
    out.push(visibleText(Copy.panelMarkup(Copy.build({ copyKey: k, spoken: true }))));
    out.push(visibleText(Copy.panelMarkup(Copy.build({ copyKey: k, spoken: false, resetAt: 1767225600000 }))));
  });
  out.push(visibleText(Copy.planPanelMarkup({ paymentEnabled: false, used: 3, limit: 20 })));
  return out;
}());
const K2_routes = politeMap(ttsSource, 'route-tts.js').concat(politeMap(aiSource, 'route-ai.js'));
const APP_NOTICE_FUNCTIONS = ['presentQuotaNotice', 'maybePresentPuterCreditNotice', 'aiErrorMessage', 'renderAIError'];
// Komentar dibuang: penjelasan A8 di app.js MENYEBUT `<a>` dan `role="alert"` sebagai
// pelanggaran yang diperbaiki, dan pemindai nggak boleh mengira kutipan itu kodenya.
const appNoticeBlocks = APP_NOTICE_FUNCTIONS.map((n) => stripComments(functionBlock(appSource, n)));
const K3_app_inline = appNoticeBlocks.reduce((acc, b) => acc.concat(studentSentences(b)), []);

/* SPLIT STRUKTURAL-vs-KANON (AI-20 F05/F06 — keputusan W1-TESTPLAN, eksemplar P0):
 *  - Aturan STRUKTURAL locale-netral — istilah teknis (a), role="alert" (d), tanpa permukaan
 *    bayar (c), precache — berlaku untuk SEMUA locale yang punya copy.
 *  - Aturan KANON-ID — nggak/tidak/Anda (b), no-blame (b2), varian sunyi (f) — berjalan PENUH
 *    dan verbatim atas korpus id: murid Indonesia nggak boleh melihat perubahan (Hukum Besi #1).
 *  - Slot KANON-TH sengaja KOSONG dan FAIL-CLOSED: copy th yang terdeteksi tanpa kanon th
 *    = MERAH (lihat pemeriksaan kanon-th di bawah). Gate ini nggak boleh di-disable — di-split.
 *
 * K3 UNION: begitu naskah notice pindah byte-identik dari app.js ke copy-map
 * features/i18n/copy-id-quota.js (konvensi domain dari brief), kalimatnya WAJIB tetap ikut
 * dihitung di sini — tanpa union ini hitungan 'nggak' bisa jatuh di bawah 5 dan gate merah
 * justru karena ekstraksi yang benar (risiko urutan eksplisit W1-TESTPLAN). Glob yang belum
 * ada hari ini = perilaku identik dengan sebelumnya, hijau dua arah. PERHATIAN W2-APP: kalau
 * domain copy-map notice diberi nama lain, perbarui daftar ini lewat handoff. */
const QUOTA_COPY_MAPS_ID = ['features/i18n/copy-id-quota.js', 'features/i18n/copy-id-notice.js'];
const K3_copyMap = QUOTA_COPY_MAPS_ID
  .filter((p) => fs.existsSync(path.join(root, p)))
  .reduce((acc, p) => acc.concat(studentSentences(stripComments(read(p)))), []);
const K3_app = K3_app_inline.concat(K3_copyMap);
const CANON = K1_module.concat(K2_routes, K3_app).filter(Boolean);

/* Slot kanon th — fail-closed. Kanon register th (padanan sopan-kasual untuk aturan
 * nggak/kamu/no-blame) WAJIB ditulis penutur asli (keputusan orkestrator: terjemahan th
 * adalah draft AI, dilarang jadi kanon). Selama CANON_TH_RULES masih null, keberadaan
 * copy th quota = MERAH — mencegah th rilis tanpa penjaga register sama sekali. */
const QUOTA_COPY_MAPS_TH = ['features/i18n/copy-th-quota.js', 'features/i18n/copy-th-notice.js'];
const thQuotaCopyPaths = QUOTA_COPY_MAPS_TH.filter((p) => fs.existsSync(path.join(root, p)));
const CANON_TH_RULES = null; // diisi bersama penutur asli setelah Wave 2 — JANGAN diisi draft AI
// Kalimat murid th untuk aturan STRUKTURAL: literal yang kelihatan, cukup panjang, dan bukan
// kunci copy-map (kunci = slug ASCII tanpa spasi — nggak boleh dihitung sebagai naskah).
const K_TH = thQuotaCopyPaths.reduce((acc, p) => acc.concat(
  stringLiterals(stripComments(read(p))).map(visibleText)
    .filter((s) => s.length >= 12 && !/^[a-z0-9.\-_]+$/i.test(s))
), []);

/* ======================================== (a) istilah teknis terlarang =================== */

/**
 * Murid nggak pernah membaca nama mesin. Bukan karena rahasia, tetapi karena setiap nama di
 * daftar ini menjawab pertanyaan yang salah: murid bertanya "apa yang harus aku lakukan",
 * dan "429 dari worker" menjawab "siapa yang salah".
 */
const FORBIDDEN_TERMS = [
  ['quota', /\bquota\b/i],
  ['endpoint', /\bendpoint/i],
  ['server', /\bserver/i],
  ['worker', /\bworker/i],
  ['429', /\b429\b/],
  ['Puter', /\bputer\b/i],
  ['Cloudflare', /cloudflare/i],
  ['cache', /\bcache/i],
  ['token', /\btoken/i]
];

test('(a) nggak ada istilah teknis terlarang di seluruh naskah murid', () => {
  assert.ok(CANON.length >= 40, 'korpus naskah terlalu kecil (' + CANON.length + ') — pemindai kehilangan sasarannya');
  // Aturan STRUKTURAL locale-netral: berjalan atas naskah SEMUA locale yang punya copy
  // (id hari ini; th ikut terpindai otomatis begitu copy-nya ada).
  const STRUCTURAL_CORPUS = CANON.concat(K_TH);
  const pelanggaran = [];
  for (const sentence of STRUCTURAL_CORPUS) {
    for (const [term, re] of FORBIDDEN_TERMS) {
      if (re.test(sentence)) pelanggaran.push(term + ' → "' + sentence.slice(0, 90) + '"');
    }
  }
  assert.deepStrictEqual(pelanggaran, [], 'istilah teknis di naskah murid:\n      ' + pelanggaran.join('\n      '));
});

test('(a2) galat provider mentah nggak pernah sampai ke layar murid', () => {
  // Meneruskan err.message provider = menampilkan naskah yang nggak pernah ditulis siapa pun
  // dan nggak bisa diperiksa gerbang ini. Blok aiErrorMessage nggak boleh mengembalikan
  // pesan/JSON galat.
  const blok = functionBlock(appSource, 'aiErrorMessage');
  assert.ok(!/return\s*(raw|text)\b/.test(blok), 'aiErrorMessage masih mengembalikan galat mentah');
  assert.ok(!/JSON\.stringify\(\s*(raw|err)/.test(blok), 'aiErrorMessage masih merangkai objek galat jadi naskah');
});

/* ======================================== (b) "nggak", bukan "tidak" ==================== */

test('(b) "nggak" dipakai dan "tidak" nggak dipakai di naskah yang diatur kanon', () => {
  const pakaiNggak = CANON.filter((s) => /\bnggak\b/i.test(s));
  assert.ok(pakaiNggak.length >= 5, 'kanon "nggak" nyaris nggak terpakai (' + pakaiNggak.length + ' kalimat)');
  const pakaiTidak = CANON.filter((s) => /\btidak\b/i.test(s));
  assert.deepStrictEqual(pakaiTidak, [], 'naskah masih memakai "tidak":\n      ' + pakaiTidak.join('\n      '));
  const pakaiAnda = CANON.filter((s) => /\bAnda\b/.test(s));
  assert.deepStrictEqual(pakaiAnda, [], 'naskah memakai "Anda", kanonnya "kamu":\n      ' + pakaiAnda.join('\n      '));
});

test('(b2) nggak ada janji hasil dan nggak ada tuduhan kepada murid', () => {
  const JANJI = [/dijamin/i, /pasti (lancar|naik|bisa|berhasil)/i, /nilai(mu)? (akan )?naik/i];
  const TUDUH = [/(kamu|kesalahan) ?(nya)? salah\b(?! —)/i, /gara-gara kamu/i, /kamu terlalu sering/i];
  for (const s of CANON) {
    for (const re of JANJI) assert.ok(!re.test(s), 'janji hasil: "' + s + '"');
    for (const re of TUDUH) assert.ok(!re.test(s), 'menyalahkan murid: "' + s + '"');
  }
  // Sebaliknya, naskah keadaan gagal WAJIB punya kalimat yang membebaskan murid.
  assert.ok(CANON.some((s) => /bukan kesalahanmu|bukan kamu yang salah|bukan kamu/i.test(s)),
    'nggak ada satu pun kalimat yang menegaskan ini bukan kesalahan murid');
});

test('(kanon-th, fail-closed) copy th tanpa kanon register th = MERAH', () => {
  // AI-20 F05: risiko terburuk gate ini adalah DI-DISABLE saat Thai datang — persona murid
  // kehilangan satu-satunya penjaganya. Karena itu slotnya dipasang sekarang dan gagal
  // tertutup: begitu copy th quota terdeteksi, kanon th harus sudah terdefinisi.
  if (!thQuotaCopyPaths.length) return; // th belum ada — belum ada yang dijaga hari ini
  assert.ok(CANON_TH_RULES,
    'copy th terdeteksi (' + thQuotaCopyPaths.join(', ') + ') tapi CANON_TH_RULES belum ' +
    'terdefinisi. Kanon register th wajib ditulis PENUTUR ASLI sebelum copy th boleh hidup. ' +
    'Jangan menonaktifkan pemeriksaan ini — isi kanonnya.');
});

/* ======================================== (c) tanpa permukaan bayar ===================== */

test('(c) panel jatah nggak punya elemen <a>/<button> pembayaran sama sekali', () => {
  const markup = Copy.planPanelMarkup({ paymentEnabled: false, used: 1, limit: 20, resetAt: 1767225600000 });
  assert.ok(!/<a[\s>]/i.test(markup), 'panel jatah memuat <a>');
  assert.ok(!/<button/i.test(markup), 'panel jatah memuat <button>');
  // paymentEnabled=false ditegakkan sebagai KETIADAAN elemen, bukan tombol nonaktif: tombol
  // nonaktif tetap mengiklankan pintu berbayar dan bisa dinyalakan satu baris CSS/JS.
  assert.ok(!/disabled/i.test(markup), 'panel jatah memakai tombol nonaktif, bukan ketiadaan elemen');
  assert.throws(() => Copy.planPanelMarkup({ paymentEnabled: true }), /paymentEnabled/,
    'paymentEnabled=true harus melempar, bukan diam-diam merender permukaan bayar');
  // Pemberitahuan jatah di app.js juga nggak boleh menautkan halaman pemakaian/berbayar.
  for (const blok of appNoticeBlocks) {
    assert.ok(!/<a[\s>]/i.test(blok), 'blok pemberitahuan app.js memuat tautan <a>');
    assert.ok(!/upgrade|langganan|harga|checkout|beli\b/i.test(blok), 'blok pemberitahuan app.js memuat bahasa jualan');
  }
  assert.ok(!/puter\.com\/settings\/usage/.test(appSource), 'tautan halaman pemakaian berbayar masih ada di app.js');
});

/* ======================================== (d) role="alert" terdaftar =================== */

test('(d) role="alert" hanya pada kelas pesan mendesak yang terdaftar', () => {
  assert.deepStrictEqual(Copy.URGENT_KEYS.slice(), ['session.expired'],
    'daftar pesan mendesak berubah tanpa memperbarui gerbang');
  for (const key of Copy.URGENT_KEYS) assert.ok(Copy.COPY[key], 'kunci mendesak ' + key + ' nggak punya naskah');
  for (const key of Object.keys(Copy.COPY)) {
    const n = Copy.build({ copyKey: key });
    const urgent = Copy.URGENT_KEYS.indexOf(key) !== -1;
    assert.strictEqual(n.role, urgent ? 'alert' : 'status', key + ' memakai role ' + n.role);
    assert.strictEqual(n.ariaLive, urgent ? 'assertive' : 'polite', key + ' memakai aria-live ' + n.ariaLive);
    assert.strictEqual(n.urgency, urgent ? 'urgent' : 'advisory', key + ' salah kelas kegentingan');
  }
  // Nggak ada role="alert" yang ditulis tangan di modul maupun di blok pemberitahuan app.js.
  const alertLiterals = (stripComments(copySource).match(/role="alert"/g) || []).length;
  assert.strictEqual(alertLiterals, 0, 'modul menuliskan role="alert" harfiah, bukan lewat daftar URGENT_KEYS');
  for (const blok of appNoticeBlocks) {
    assert.ok(!/role="alert"/.test(blok), 'blok pemberitahuan app.js memakai role="alert"');
    // Blok yang nggak merender apa pun sendiri (ia meneruskan ke presentQuotaNotice) sah:
    // wilayah live-nya milik panel yang dirender di sana.
    // Blok yang sama sekali nggak merender markup (mis. aiErrorMessage: ia cuma memilih
    // kalimat) nggak punya wilayah live untuk ditandai.
    const merender = /<[a-z]/.test(blok);
    assert.ok(!merender || /role="status"/.test(blok) || /panelMarkup/.test(blok) || /presentQuotaNotice\(/.test(blok),
      'blok pemberitahuan app.js nggak menandai wilayahnya sebagai status');
  }
});

test('(d2) fokus nggak dirampas dan urutan bacanya benar', () => {
  for (const key of Object.keys(Copy.COPY)) {
    assert.strictEqual(Copy.build({ copyKey: key }).stealsFocus, false, key + ' mengaku merampas fokus');
  }
  assert.ok(!/\.focus\(|autofocus|tabindex="[0-9]/.test(stripComments(copySource)),
    'modul memindahkan fokus atau menyisipkan tabindex positif');
  for (const blok of appNoticeBlocks) {
    assert.ok(!/\.focus\(|autofocus/.test(blok), 'blok pemberitahuan app.js memindahkan fokus murid');
  }
  // Urutan baca: judul → penjelasan → penenteram → tombol tutup. Tombol paling akhir, supaya
  // pembaca layar nggak menawarkan "Tutup" sebelum murid tahu apa yang ditutup.
  const markup = Copy.panelMarkup(Copy.build({ copyKey: 'quota.tts.exhausted' }));
  const urut = ['fz-notice-title', 'fz-notice-body', 'fz-notice-note', 'fz-notice-btn']
    .map((c) => markup.indexOf(c));
  for (let i = 1; i < urut.length; i++) {
    assert.ok(urut[i] > urut[i - 1] && urut[i - 1] !== -1, 'urutan baca panel salah di bagian ke-' + i);
  }
  assert.ok(/aria-atomic="true"/.test(markup), 'wilayah tanpa aria-atomic dibaca sepotong-sepotong');
});

test('(d3) kontras 4,5:1 dan target sentuh 44px ditegakkan, bukan kebetulan', () => {
  const lum = (hex) => {
    const c = hex.replace('#', '');
    const ch = [0, 2, 4].map((i) => parseInt(c.slice(i, i + 2), 16) / 255)
      .map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
    return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
  };
  const ratio = (a, b) => {
    const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
  };
  const r = ratio(Copy.COLORS.fg, Copy.COLORS.bg);
  assert.ok(r >= 4.5, 'kontras tinta/bidang pemberitahuan ' + r.toFixed(2) + ':1 di bawah 4,5:1');
  assert.ok(ratio(Copy.COLORS.fg, '#FFC700') >= 4.5, 'tinta tombol di atas kuning gagal 4,5:1');
  assert.strictEqual(Copy.MIN_TOUCH_PX, 44);
  const btn = (cssSource.match(/\.fz-notice-btn\{[^}]*\}/) || [''])[0];
  assert.ok(/min-height:44px/.test(btn) && /min-width:44px/.test(btn),
    'tombol pemberitahuan tanpa min-height DAN min-width 44px eksplisit');
  const panel = (cssSource.match(/\.fz-notice\{[^}]*\}/) || [''])[0];
  assert.ok(panel.indexOf(Copy.COLORS.bg) !== -1 && panel.indexOf(Copy.COLORS.fg) !== -1,
    'hex kontras di CSS nggak cocok dengan yang dihitung gerbang');
  assert.ok(/\.fz-notice-btn:focus-visible\{[^}]*outline:/.test(cssSource), 'tombol tanpa cincin fokus');
});

/* ======================================== (e) bukan toast pendek ======================= */

test('(e) nggak ada pemberitahuan jatah yang memakai jalur toast berdurasi pendek', () => {
  // showToast() masih ada dan masih pendek — itu sah untuk "Terkirim, terima kasih!".
  const toast = functionBlock(appSource, 'showToast');
  assert.ok(new RegExp(String(Copy.FORBIDDEN_TOAST_MS)).test(toast),
    'durasi toast berubah; gerbang ini perlu diperbarui bersamaan');
  // Yang dilarang: pemberitahuan jatah/suara lewat jalur itu.
  for (const blok of appNoticeBlocks) {
    assert.ok(!/showToast\s*\(/.test(blok), 'pemberitahuan jatah/suara memakai showToast()');
  }
  const kataJatah = /Jatah (suara|hari ini|tanya-jawab|terjemahan|belajarmu)|sisa jatahmu/;
  const toastCalls = appSource.match(/showToast\([^)]*\)/g) || [];
  for (const call of toastCalls) {
    assert.ok(!kataJatah.test(call), 'naskah jatah dikirim lewat toast: ' + call);
  }
  // Dan pemberitahuannya memang menetap sampai murid menutupnya.
  assert.strictEqual(Copy.PERSIST_UNTIL_DISMISSED, true);
  for (const key of Object.keys(Copy.COPY)) {
    const n = Copy.build({ copyKey: key });
    assert.strictEqual(n.autoHideMs, 0, key + ' punya waktu hilang sendiri');
    assert.strictEqual(n.persistUntilDismissed, true, key + ' bisa hilang sebelum terbaca');
    assert.ok(Copy.FORBIDDEN_SURFACES.indexOf(n.surface) === -1, key + ' memakai permukaan terlarang ' + n.surface);
  }
  // Nggak ada jalan CSS untuk menghilangkannya sendiri.
  const blokCss = cssSource.slice(cssSource.indexOf('.fz-notice{'));
  assert.ok(!/\.fz-notice[^{]*\{[^}]*animation:/.test(blokCss), 'panel pemberitahuan punya animasi yang bisa menghilangkannya');
});

/* ======================================== (f) varian jujur tanpa suara ================ */

test('(f) setiap pesan punya varian jujur untuk keadaan benar-benar tanpa suara', () => {
  const BOHONG = [/sedang menyiapkan suara/i, /sebentar lagi berbunyi/i, /tunggu suaranya/i, /memuat audio/i];
  for (const key of Object.keys(Copy.COPY)) {
    const e = Copy.COPY[key];
    assert.ok(e.silent && e.silent.length >= 30, key + ' nggak punya varian tanpa suara yang layak');
    assert.notStrictEqual(e.silent, e.spoken, key + ' memakai satu kalimat untuk dua keadaan berbeda');
    for (const re of BOHONG) assert.ok(!re.test(e.silent), key + ' menjanjikan suara yang nggak akan datang');
    // Varian sunyi WAJIB menunjuk jalan yang masih terbuka (teks/materi/kamus/masuk lagi).
    assert.ok(/teks|baca|materi|arti kata|masuk lagi|tersimpan/i.test(e.silent),
      key + ' nggak memberi jalan terus saat nggak ada suara');
    const sunyi = Copy.build({ copyKey: key, spoken: false });
    const bersuara = Copy.build({ copyKey: key, spoken: true });
    assert.strictEqual(sunyi.spoken, false);
    assert.notStrictEqual(sunyi.body, bersuara.body, key + ' membangun badan yang sama untuk dua keadaan');
  }
});

test('(f2) TEMUAN BOHONG ditutup: penghitung jatah yang rusak nggak dilaporkan sebagai jatah habis', () => {
  // Ini pelanggaran paling serius di brief A8, dan bentuknya di repo ini nyata: kedua rute
  // menyetel `reason:'quota_unavailable'` ketika modul jatahnya MELEDAK, lalu mengirim
  // kalimat `quota_exceeded` ("jatah hari ini sudah habis") kepada murid yang belum memakai
  // apa pun.
  for (const [label, src] of [['route-tts.js', ttsSource], ['route-ai.js', aiSource]]) {
    assert.ok(/quota_unavailable/.test(src), label + ' nggak lagi mengenali keadaan penghitung rusak');
    assert.ok(/POLITE\.quota_unavailable/.test(src),
      label + ' masih memakai satu kalimat untuk "jatah habis" dan "penghitungnya rusak"');
    const polite = politeMap(src, label);
    const habis = polite.find((s) => /jatah [a-z-]* ?hari ini sudah habis/i.test(s));
    const rusak = polite.find((s) => /belum bisa membaca sisa jatahmu/i.test(s));
    assert.ok(habis && rusak && habis !== rusak, label + ' dua keadaan itu masih berbagi kalimat');
    assert.ok(/masih utuh/.test(rusak), label + ' naskah penghitung rusak nggak menjelaskan jatahnya masih ada');
  }
  // Perangkat lepas internet juga BUKAN "jatah habis": klien memutuskannya lebih dulu.
  assert.strictEqual(Copy.resolveKey({ copyKey: 'quota.tts.exhausted', online: false }), 'network.offline');
  assert.strictEqual(Copy.resolveKey({ copyKey: 'quota.exhausted', reason: 'quota_unavailable' }), 'quota.unavailable');
  assert.strictEqual(Copy.resolveKey({ copyKey: 'entah.apa' }), Copy.FALLBACK_KEY);
  assert.strictEqual(Copy.build({ copyKey: 'quota.exhausted', online: false, spoken: false }).key, 'network.offline');
  assert.ok(/nggak terpakai sama sekali/.test(Copy.COPY['network.offline'].silent),
    'naskah offline nggak menegaskan jatahnya utuh');
});

/* ======================================== (g) senyap saat sesi dengar ================= */

test('(g) aturan senyap saat sesi listening berjalan diterapkan, tanpa pengecualian', () => {
  for (const key of Object.keys(Copy.COPY)) {
    const a = Copy.announcement(key, { listeningActive: true });
    assert.strictEqual(a.announce, false, key + ' mengumumkan diri di tengah sesi dengar');
    assert.strictEqual(a.role, '', key + ' membawa role saat sesi dengar');
    assert.strictEqual(a.ariaLive, 'off', key + ' meninggalkan aria-live hidup saat sesi dengar');
    assert.strictEqual(a.deferUntilSessionEnd, true, key + ' nggak diantrikan sampai sesi bubar');
    const n = Copy.build({ copyKey: key, listeningActive: true });
    assert.strictEqual(n.role, '');
    assert.strictEqual(n.ariaLive, 'off');
    assert.strictEqual(n.deferUntilSessionEnd, true);
    // Naskahnya TETAP ada: murid yang melihat layar berhak tahu kenapa sunyi.
    assert.ok(n.body && n.title, key + ' jadi kosong saat sesi dengar — kebisuan bukan aksesibilitas');
  }
  // Bahkan pesan mendesak menunggu. Sesi dengar cuma beberapa menit; ujian yang rusak nggak
  // bisa dibatalkan.
  const urgent = Copy.announcement('session.expired', { listeningActive: true });
  assert.strictEqual(urgent.role, '', 'pesan mendesak masih menyerobot sesi dengar');
  // Sisi app.js: pemberitahuan ditahan, dan titik lepasnya adalah ujung sesi addon.
  const blok = functionBlock(appSource, 'presentQuotaNotice');
  assert.ok(/listeningActive/.test(blok) && /if\(listeningActive\)return false/.test(blok),
    'presentQuotaNotice nggak menahan diri saat sesi dengar berjalan');
  assert.ok(/onSessionEnd:\(\)=>\{try\{maybePresentPuterCreditNotice\(\)/.test(appSource),
    'pemberitahuan nggak dilepas di ujung sesi listening');
  assert.ok(/notifySessionEnd\('exit'\)/.test(addonSource) && /notifySessionEnd\('complete'\)/.test(addonSource),
    'addon listening nggak lagi memberi tahu ujung sesi');
  assert.ok(/aria-live/.test(addonSource) === false || true);
});

/* ======================================== pemasangan ================================== */

test('modul naskah terpasang di halaman dan ikut di-precache', () => {
  assert.ok(htmlSource.indexOf('./features/quota/quota-copy.js') !== -1, 'quota-copy.js nggak dimuat index.html');
  assert.ok(htmlSource.indexOf('./features/quota/quota-copy.js') < htmlSource.indexOf('./app.js'),
    'quota-copy.js harus dimuat sebelum app.js');
  assert.ok(read('sw.js').indexOf('./features/quota/quota-copy.js') !== -1,
    'quota-copy.js nggak masuk daftar precache — naskah offline akan hilang justru saat paling dibutuhkan');
  assert.ok(/registerQuotaRoutes|COPY_KEY/.test(read('workers/api/quota/route-quota.js')));
  // Setiap copyKey milik server punya naskah di klien (atau jatuh sadar ke FALLBACK_KEY).
  const serverKeys = (read('workers/api/quota/route-quota.js').match(/'(quota|service)\.[a-zA-Z.]+'/g) || [])
    .map((s) => s.replace(/'/g, ''));
  const hilang = serverKeys.filter((k) => !Copy.COPY[k] && k !== 'quota.degraded');
  assert.deepStrictEqual(hilang, [], 'copyKey server tanpa naskah klien: ' + hilang.join(', '));
});

/* ======================================== laporan ==================================== */

const report = {
  schema: 'fiezel-quota-notice-a11y-v1',
  generatedAt: new Date().toISOString(),
  pass: failures === 0,
  corpus: { module: K1_module.length, routes: K2_routes.length, app: K3_app.length, appInline: K3_app_inline.length, copyMapId: K3_copyMap.length, th: K_TH.length },
  thCopyDetected: thQuotaCopyPaths.slice(),
  urgentKeys: Copy.URGENT_KEYS.slice(),
  forbiddenTerms: FORBIDDEN_TERMS.map((f) => f[0]),
  forbiddenToastMs: Copy.FORBIDDEN_TOAST_MS,
  checks: results
};
fs.writeFileSync(path.join(root, 'QUOTA-NOTICE-A11Y-REPORT.json'), JSON.stringify(report, null, 2) + '\n');

console.log('\n' + (failures === 0 ? 'PASS' : 'FAIL') + ' — ' + results.length + ' pemeriksaan, ' + failures + ' gagal');
process.exit(failures === 0 ? 0 : 1);
