#!/usr/bin/env node
/**
 * m025-128 gerbang maskot PAW.
 *
 * OWNER memilih arah 02 dari lima arah yang dieksplorasi, lalu meminta dua hal:
 * "animasinya buatkan lebih eksklusif lagi, dan authentic" dan "animasinya berubah
 * tergantung user masuk ke menu bagian apa".
 *
 * Yang dijaga di sini bukan selera - selera bukan urusan tes. Yang dijaga adalah
 * keputusan-keputusan yang kalau dilanggar, dilanggarnya diam-diam:
 *
 *   1. SATU sumber bentuk. Brief A.6 memintanya eksplisit: "dapat diproduksi sebagai
 *      aset tunggal yang dipakai identik di seluruh halaman aplikasi - bukan digambar
 *      ulang berbeda-beda di tiap halaman". Dua salinan yang menyimpang adalah cara
 *      paling umum sebuah maskot berhenti terlihat sama di mana-mana.
 *   2. Tidak ada emoji sebagai bentuk final (larangan A.5).
 *   3. Gerak yang benar-benar berbeda per halaman, bukan satu animasi untuk semua.
 *   4. Gerak yang tetap TERKENDALI - amplitudo kecil, durasi panjang. Inilah satu-satunya
 *      bagian "eksklusif" yang bisa diukur mesin, dan justru bagian yang paling gampang
 *      hilang saat seseorang menaikkan angka supaya "lebih kelihatan".
 *   5. Halaman tes tetap diam. Ini keputusan produk, bukan detail gaya.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const read = (f) => fs.readFileSync(path.join(__dirname, f), 'utf8');
const ICONS = read('features/ui/fiezel-icons.js');
const BUBBLE = read('features/ui/fiezel-coach-bubble.js');
const CSS = read('style.css');
const ASSET = read('assets/brand/fiezel-paw.svg');
const RIG = read('features/mascot/fiezel-mascot.js');

/**
 * Potongan definisi ikon paw saja.
 *
 * Dulu batas akhirnya adalah teks komentar tab bar. Itu rapuh, dan terbukti: begitu
 * komentarnya ditulis ulang, indexOf mengembalikan -1, potongannya membentang ke seluruh
 * berkas, dan tesnya melaporkan dua belas balok pada ikon yang punya empat. Batasnya kini
 * definisi ikon BERIKUTNYA, apa pun namanya.
 */
function pawBlock() {
  const start = ICONS.indexOf('paw:');
  const rest = ICONS.slice(start + 4);
  const next = /\n    [a-z][A-Za-z]*:\s/.exec(rest);
  return ICONS.slice(start, next ? start + 4 + next.index : ICONS.length);
}

let pass = 0;
const failures = [];
function test(name, fn) {
  try { fn(); pass++; console.log('ok - ' + name); }
  catch (e) { failures.push(name); console.log('FAIL - ' + name + ': ' + e.message); }
}

/** Koordinat bentuk, dinormalkan supaya dua berkas bisa dibandingkan apa adanya. */
function shapeOf(source) {
  const bars = (source.match(/x="[\d.]+" y="[\d.]+" width="[\d.]+" height="[\d.]+" rx="[\d.]+"/g) || []);
  const pad = /d="(M12\.6 14[^"]*)"/.exec(source);
  return { bars: bars.map((b) => b.replace(/\s+/g, ' ')), pad: pad ? pad[1].replace(/\s+/g, ' ') : '' };
}

test('PAW ada, dan bentuknya arah 02 — empat balok, satu bantalan', () => {
  if (!/paw:\s*'/.test(ICONS)) throw new Error('ikon paw tidak ada di fiezel-icons.js');
  const shape = shapeOf(pawBlock());
  if (shape.bars.length !== 4) throw new Error('balok berjumlah ' + shape.bars.length + ', arah 02 punya empat');
  if (!shape.pad) throw new Error('bantalan tidak ditemukan');
  // Tinggi keempat balok harus BERBEDA - itu yang membedakannya dari empat jari bulat
  // generik, dan yang membuatnya terbaca sebagai balok wordmark FIEZEL.
  const heights = shape.bars.map((b) => Number(/height="([\d.]+)"/.exec(b)[1]));
  if (new Set(heights).size !== 4) {
    throw new Error('tinggi balok tidak semuanya berbeda (' + heights.join(', ')
      + ') — balok seragam adalah equalizer, bukan bentuk yang diambil dari wordmark');
  }
});

test('hanya ada SATU sumber bentuk PAW, dan keduanya identik', () => {
  // Brief A.6: aset tunggal, dipakai identik di seluruh halaman.
  const inline = shapeOf(pawBlock());
  const asset = shapeOf(ASSET);
  if (asset.bars.length !== 4) throw new Error('assets/brand/fiezel-paw.svg bukan bentuk arah 02');
  for (let i = 0; i < 4; i++) {
    if (inline.bars[i] !== asset.bars[i]) {
      throw new Error('balok ' + (i + 1) + ' menyimpang antara ikon dan berkas aset:\n      ikon  '
        + inline.bars[i] + '\n      aset  ' + asset.bars[i]);
    }
  }
  if (inline.pad !== asset.pad) throw new Error('bantalan menyimpang antara ikon dan berkas aset');
});

/**
 * Potongan grup emblem dada di dalam rig maskot penuh (fiezel-mascot.js).
 *
 * Rig punya rect lain yang lolos regex balok (kaki 48x22, headphone) — jadi yang
 * diiris HANYA grup fz-pawprint, dari pembukanya sampai penutup grup pertama.
 */
function rigEmblemBlock() {
  const start = RIG.indexOf('id="fz-pawprint');
  if (start === -1) throw new Error('grup fz-pawprint tidak ada di rig maskot');
  const end = RIG.indexOf('</g>', start);
  return RIG.slice(start, end);
}

test('emblem dada maskot = glyph fiezel-paw.svg, koordinat APA ADANYA', () => {
  // Keputusan OWNER (proof sheet v2): glyph paw hanya di dada, dan wujudnya
  // instansi PERSIS dari aset kanonik — bukan gambar ulang yang mirip.
  const emblem = shapeOf(rigEmblemBlock());
  const asset = shapeOf(ASSET);
  if (emblem.bars.length !== 4) {
    throw new Error('emblem dada punya ' + emblem.bars.length + ' balok, glyph kanonik punya empat');
  }
  for (let i = 0; i < 4; i++) {
    if (emblem.bars[i] !== asset.bars[i]) {
      throw new Error('balok ' + (i + 1) + ' emblem dada menyimpang dari aset:\n      rig   '
        + emblem.bars[i] + '\n      aset  ' + asset.bars[i]);
    }
  }
  if (emblem.pad !== asset.pad) throw new Error('bantalan emblem dada menyimpang dari aset');
});

test('glyph paw di rig hanya SATU: di dada — tangan polos', () => {
  // Aturan chest-only. Dua instansi glyph di badan berarti seseorang mengembalikan
  // bantalan tangan (fz-pads) yang sudah dipensiunkan OWNER.
  const n = (RIG.match(/M12\.6 14/g) || []).length;
  if (n !== 1) throw new Error('jalur bantalan glyph muncul ' + n + ' kali di rig, harusnya tepat satu (dada)');
  if (/class="[^"]*fz-pads/.test(RIG)) {
    throw new Error('kelas fz-pads masih ada di rig; bantalan tangan sudah pensiun');
  }
  // Aproksimasi emblem lama (elips rx=10 ry=8) tidak boleh kembali menggantikan glyph asli.
  if (/rx="10" ry="8"/.test(RIG)) {
    throw new Error('aproksimasi emblem lama (rx="10" ry="8") masih ada di rig');
  }
});

test('tidak ada emoji sebagai bentuk PAW', () => {
  // Larangan brief A.5. Emoji hanya boleh jadi placeholder eksplorasi.
  const face = /icon\('([a-z]+)'\)/g;
  let m, used = [];
  while ((m = face.exec(BUBBLE))) used.push(m[1]);
  if (!used.length || used.some((n) => n !== 'paw')) {
    throw new Error('wajah pembimbing memakai ' + [...new Set(used)].join(', ') + ', bukan paw');
  }
  if (/[\u{1F300}-\u{1FAFF}]/u.test(BUBBLE.replace(/^\s*[*/].*$/gm, ''))) {
    throw new Error('ada emoji di jalur render pembimbing');
  }
});

test('gerak benar-benar berganti mengikuti halaman', () => {
  const scenes = [...CSS.matchAll(/\[data-fz-scene="([a-z]+)"\]/g)].map((m) => m[1]);
  const unique = [...new Set(scenes)];
  if (unique.length < 6) {
    throw new Error('hanya ' + unique.length + ' karakter gerak (' + unique.join(', ')
      + ') — OWNER meminta geraknya berubah tergantung menu, bukan satu animasi untuk semua');
  }
  if (!/PAGE_SCENES\s*=/.test(BUBBLE)) throw new Error('tidak ada peta halaman ke karakter gerak');
  // Dibatasi ke blok PAGE_SCENES saja; membaca lebih jauh akan menyeret string lain di
  // berkas ini dan melaporkan karakter gerak yang tidak pernah ada.
  const scenesBlock = BUBBLE.slice(BUBBLE.indexOf('PAGE_SCENES'), BUBBLE.indexOf('PAGE_LINES'));
  const mapped = [...scenesBlock.matchAll(/:\s*'([a-z]+)'/g)].map((m) => m[1]);
  const missing = [...new Set(mapped)].filter((s) => !unique.includes(s));
  if (missing.length) {
    throw new Error('halaman dipetakan ke karakter yang tidak punya gerak di CSS: ' + missing.join(', '));
  }
});

test('setiap halaman punya karakter gerak, tidak ada yang mati diam-diam', () => {
  const valid = ['home', 'vocab', 'grammar', 'reading', 'skills', 'listening', 'speaking',
    'writing', 'test', 'progress', 'classroom', 'library', 'ask', 'search'];
  const block = BUBBLE.slice(BUBBLE.indexOf('PAGE_SCENES'), BUBBLE.indexOf('PAGE_LINES'));
  const missing = valid.filter((v) => !new RegExp('(^|[\\s{,])' + v + '\\s*:').test(block));
  if (missing.length) {
    throw new Error('halaman tanpa karakter gerak: ' + missing.join(', ')
      + ' — halaman yang tidak terdaftar jatuh ke default, dan default yang tidak disengaja '
      + 'adalah cara maskot ini kehilangan pendapatnya satu per satu');
  }
});

test('geraknya terkendali: amplitudo kecil, durasi panjang', () => {
  // Bagian "eksklusif" yang bisa diukur. Yang dijaga bukan angka spesifik, melainkan
  // bahwa tidak ada yang menaikkannya diam-diam supaya "lebih kelihatan".
  const paw = CSS.slice(CSS.indexOf('PAW — gerak per halaman'));
  const loud = [];
  // Kelahiran sekali-jalan sengaja DIKECUALIKAN. Ia memang harus melompat dari nol -
  // yang dijaga aturan ini adalah gerak yang berulang selamanya di depan mata murid,
  // dan menyamakan keduanya akan memaksa ledakannya jadi tidak terlihat.
  const LOOPLESS = /^(fzPawSpark|fzPawForm|fzPawSettle)$/;
  for (const m of paw.matchAll(/@keyframes\s+(fzPaw\w+)\{([^@]*?)\}\s*\n/g)) {
    if (LOOPLESS.test(m[1])) continue;
    for (const s of m[2].matchAll(/scale[XY]?\(([\d.]+)\)/g)) {
      if (Math.abs(Number(s[1]) - 1) > 0.25) loud.push('scale ' + s[1]);
    }
    for (const t of m[2].matchAll(/translateY\((-?[\d.]+)px\)/g)) {
      if (Math.abs(Number(t[1])) > 1.6) loud.push('translateY ' + t[1] + 'px');
    }
  }
  if (loud.length) throw new Error('amplitudo terlalu besar: ' + loud.join(', '));

  const fast = [...paw.matchAll(/animation:\s*(fzPaw\w+)\s+([\d.]+)s/g)]
    .filter((m) => !LOOPLESS.test(m[1]))
    .map((m) => Number(m[2])).filter((d) => d < 2.5 && d > 0.9);
  if (fast.length) throw new Error('durasi terlalu pendek: ' + fast.join('s, ') + 's — gerak cepat menarik perhatian ke dirinya sendiri');
});

test('halaman tes sengaja nyaris diam', () => {
  if (!/\[data-fz-scene="test"\]\s*\.fz-paw-bar\{animation:none\}/.test(CSS)) {
    throw new Error('balok masih bergerak di halaman tes; saat murid diukur, maskot yang bergerak adalah gangguan');
  }
});

test('gerak mati sepenuhnya bila murid memintanya', () => {
  if (!/prefers-reduced-motion:reduce\)\{\s*\.fz-paw,\.fz-paw-bar\{animation:none !important\}/.test(CSS)) {
    throw new Error('prefers-reduced-motion tidak dihormati');
  }
  // Dan tidak boleh ada state yang HANYA bisa dibedakan lewat gerak.
  if (!/\.fz-coach-dot\{/.test(CSS)) throw new Error('titik notifikasi hilang; tanpa itu notifikasi hanya terbaca lewat gerak');
});

test('tiap balok berputar dari alasnya sendiri', () => {
  // Tanpa transform-box:fill-box, transform-origin dihitung terhadap viewBox dan keempat
  // balok bergerak seperti satu papan - persis yang membuat animasi SVG terlihat kaku.
  if (!/\.fz-paw-bar\{transform-box:fill-box;transform-origin:50% 100%\}/.test(CSS)) {
    throw new Error('balok tidak berputar dari alasnya; geraknya akan terbaca sebagai satu papan');
  }
});

test('warna PAW tidak dipaku di dalam ikon', () => {
  const block = pawBlock();
  if (/#[0-9a-f]{3,6}/i.test(block)) throw new Error('ada warna mati di dalam ikon paw; mode gelap tidak akan mengikutinya');
  if (!/\.fz-paw-bar,\.fz-i \.fz-paw-pad\{fill:var\(--fz-i-line/.test(CSS)) {
    throw new Error('PAW tidak mengambil warna dari --fz-i-line');
  }
});

test('PAW lahir dari partikel, dan partikelnya berkumpul — bukan berhamburan', () => {
  // OWNER: "seperti effect particle burst, kemudian dari partikel itu terbentuk pawnya
  // baru di lanjutkan oleh motion."
  const sparks = (ICONS.match(/class="fz-paw-spark"/g) || []).length;
  if (sparks < 8) throw new Error('hanya ' + sparks + ' partikel; ledakan butuh cukup pecahan untuk terbaca');

  // Yang paling gampang salah: menganimasikan partikel dari posisi acak MENUJU bentuk.
  // Arah itu meleset satu-dua piksel pada tiap partikel dan terbaca sebagai kotoran.
  // Di sini partikelnya sudah berdiri di simpul bentuknya, dan yang dianimasikan adalah
  // perjalanan menjauh lalu KEMBALI ke nol - karena itu bingkai terakhirnya translate(0,0).
  const frames = /@keyframes fzPawSpark\{([\s\S]*?)\n  \}/.exec(CSS);
  if (!frames) throw new Error('keyframes ledakan tidak ditemukan');
  if (!/74%\s*\{transform:translate\(0,0\)/.test(frames[1])) {
    throw new Error('partikel tidak kembali ke titik bentuknya; ia berhamburan, bukan membentuk');
  }
  if (!/28%\s*\{transform:translate\(var\(--sx[^)]*\),var\(--sy[^)]*\)\)/.test(frames[1])) {
    throw new Error('tidak ada fase melesat keluar; tanpa itu tidak ada ledakan');
  }
});

test('marka muncul SEBELUM partikelnya padam', () => {
  // Dua kejadian yang tidak bertumpuk terbaca sebagai dua kejadian: "partikel hilang,
  // lalu marka datang". Yang diminta OWNER adalah partikel yang MENJADI marka.
  const form = /@keyframes fzPawForm\{([\s\S]*?)\n  \}/.exec(CSS);
  if (!form) throw new Error('keyframes pembentukan marka tidak ditemukan');
  const start = /(\d+)%\{transform:scale\(\.62\)/.exec(form[1]);
  if (!start) throw new Error('titik mulai marka tidak terbaca');
  if (Number(start[1]) >= 74) {
    throw new Error('marka baru mulai pada ' + start[1] + '%, sementara partikel sudah mengunci pada 74% — keduanya tidak bertumpuk');
  }
});

test('kelahiran hanya saat marka benar-benar baru terlihat', () => {
  // Meledakkan ulang tiap pindah menu mengubah kelahiran jadi tik yang berisik - persis
  // kebalikan dari "eksklusif" yang diminta sebelumnya.
  const setScene = /function setScene\(view\) \{[\s\S]*?\n    \}/.exec(BUBBLE);
  if (!setScene) throw new Error('setScene tidak ditemukan');
  if (/born\(/.test(setScene[0])) {
    throw new Error('kelahiran dipicu saat pindah halaman; di sana yang benar adalah gerak masuk yang pendek');
  }
  if (!/born\(bubble\)/.test(BUBBLE)) throw new Error('kelahiran tidak pernah dijalankan saat gelembung dipasang');
});

test('ikon tab bar berbobot, bukan garis tipis', () => {
  // OWNER: "icon taskbarnya terlalu jadul kurang modern dan eye catching."
  const tab = ICONS.slice(ICONS.indexOf('/* Tab bar.'), ICONS.indexOf('/* Streak'));
  for (const name of ['home', 'vocab', 'grammar', 'reading', 'map']) {
    const glyph = new RegExp(name + ":\\s*([\\s\\S]*?),\\r?\\n\\s*(?:[a-z_]+:|\\/\\*)").exec(tab);
    if (!glyph) throw new Error('ikon ' + name + ' hilang dari tab bar');
    if (!/class="fz-fill"/.test(glyph[1])) {
      throw new Error('ikon ' + name + ' tanpa bidang; garis tipis saja adalah bahasa yang dikeluhkan OWNER');
    }
  }
  if (!/\.nav \.fz-i \.fz-line\{stroke-width:2\}/.test(CSS)) {
    throw new Error('garis ikon tab bar masih setipis 1,7');
  }
});

test('tab aktif tidak hanya berubah warna', () => {
  // Perubahan warna adalah sinyal terlemah yang dimiliki antarmuka: tidak punya berat,
  // tidak punya gerak, dan pada layar terang nyaris tidak terbaca.
  if (!/\.nav\.active\{[^}]*transform:translateY\(-3px\)/.test(CSS)) throw new Error('tab aktif tidak naik');
  if (!/\.nav\.active::after\{/.test(CSS)) throw new Error('tidak ada penanda yang bekerja tanpa warna');
  if (!/fzNavPop/.test(CSS)) throw new Error('tab aktif tidak memantul saat dipilih');
});

test('logo topbar lahir dengan cara yang sama persis dengan PAW', () => {
  // OWNER: "untuk logo fiezel di topbar buatkan animasi persis seperti animasi PAW."
  const HTML = read('index.html');
  const mark = /id="fzTopMark"[\s\S]*?<\/svg>/.exec(HTML);
  if (!mark) throw new Error('wordmark topbar tidak punya penanda; kelahirannya tidak bisa dipicu');
  const sparks = (mark[0].match(/class="fzw-spark"/g) || []).length;
  if (sparks < 12) throw new Error('hanya ' + sparks + ' partikel di wordmark');
  // Aturan yang sama seperti PAW, dan alasannya sama: partikel yang lahir acak lalu
  // dituntun ke posisinya akan meleset dan terbaca sebagai kotoran.
  const frames = /@keyframes fzwSpark\{([\s\S]*?)\n  \}/.exec(CSS);
  if (!frames) throw new Error('keyframes ledakan wordmark tidak ditemukan');
  if (!/76%\{transform:translate\(0,0\)/.test(frames[1])) {
    throw new Error('partikel wordmark tidak kembali ke titik hurufnya');
  }
  const form = /@keyframes fzwForm\{([\s\S]*?)\n  \}/.exec(CSS);
  if (!form) throw new Error('keyframes pembentukan wordmark tidak ditemukan');
  const start = /(\d+)%\{transform:scale\(\.72\)/.exec(form[1]);
  if (!start || Number(start[1]) >= 76) {
    throw new Error('wordmark baru muncul setelah partikelnya mengunci; keduanya tidak bertumpuk');
  }
});

test('kelahiran logo jalan sekali per pemuatan, bukan tiap pindah menu', () => {
  // Keputusan OWNER di papan edit: "Sekali saja waktu aplikasi pertama dibuka."
  const boot = read('features/ui/fiezel-boot-tail.js');
  if (!/classList\.add\('is-mark-born'\)/.test(boot)) throw new Error('tidak ada yang memicu kelahiran wordmark');
  if (!/classList\.remove\('is-mark-born'\)/.test(boot)) {
    throw new Error('kelasnya tidak pernah dilepas; animasi menggantung ke rilis berikutnya');
  }
  const app = read('app.js');
  if (/is-mark-born/.test(app)) {
    throw new Error('app.js ikut memicu kelahiran wordmark; itu jalur pindah halaman');
  }
});

test('Home berhenti memakai huruf display dan paragraf', () => {
  // OWNER, sambil menunjukkan layarnya: "masih terlihat seperti bacaan article."
  const app = read('app.js');
  if (/class="login-message"/.test(app)) throw new Error('judul display serif masih dirender di Home');
  if (/class="launcher-lead"/.test(app)) throw new Error('paragraf pengantar masih dirender di Home');
  if (/class="coach-body"/.test(app)) throw new Error('paragraf Coach masih dirender; panelnya harus satu kalimat');
  if (!/class="hero-line"/.test(app)) throw new Error('sapaan satu baris tidak ada');
  if (!/coach-strip-go/.test(app)) throw new Error('tombol besar di strip Coach tidak ada');
});

test('kelahiran logo menunggu splash pergi, bukan menunggu jam', () => {
  // BUG m025-131, dan bentuknya patut diingat: animasinya berjalan sempurna tetapi
  // dipicu 60 ms setelah DOM siap, sementara splash boot menutupi layar 3.400 ms.
  // Tidak ada yang gagal - yang salah cuma waktunya, dan waktu tidak terlihat oleh tes
  // statis mana pun. Yang bisa dijaga: pemicunya tidak boleh kembali jadi jam pendek.
  const boot = read('features/ui/fiezel-boot-tail.js');
  if (!/fz-booting/.test(boot) || !/fiezelBootSplash/.test(boot)) {
    throw new Error('kelahiran logo tidak menunggu splash; ia akan terjadi di balik tirai lagi');
  }
  if (!/MutationObserver/.test(boot)) throw new Error('tidak ada yang mengamati kepergian splash');
  // Tenggat wajib ada: kalau splash memang tidak pernah muncul, tidak ada mutasi yang datang.
  if (!/birth\(\);\s*\}, \d{4}\)/.test(boot)) {
    throw new Error('tidak ada tenggat; pada boot tanpa splash kelahirannya tidak akan pernah jalan');
  }
});

/* 2026-08-31 — PERTANYAAN KEYAKINAN DIHAPUS ATAS PERMINTAAN OWNER.
   Dua pemeriksaan yang berdiri di sini sebelumnya ("pertanyaan yakin muncul sebagai popup,
   dan membawa tombol Lanjutnya sendiri" + "popup keyakinan bukan kurungan") menjaga
   permintaan owner yang LEBIH LAMA: popup keyakinan harus punya tombol Lanjut sendiri, dan
   tombol itu tidak boleh ada sebelum murid memilih. Owner membalikkan keputusan itu:
   "popup keyakinan dihapus semua di semua sesi, itu sangat mengganggu".
   Invarian lama tidak dilonggarkan - ia SUDAH TIDAK ADA, karena fiturnya tidak ada. Yang
   menggantikannya di bawah adalah aturan baru, plus satu penjaga yang JUSTRU LEBIH KERAS
   daripada sebelumnya: penjadwalan ulangan tidak boleh ikut mati. setConfidence() ternyata
   satu-satunya pemanggil scheduleNext() di jalur jawaban; menghapus popupnya tanpa
   menyelamatkan bagian itu akan membuat "Review Due" berhenti terisi diam-diam. */
test('pertanyaan keyakinan tidak pernah muncul lagi di jalur jawaban', () => {
  const app = read('app.js');
  const open = /function openConfidencePop\(ok\)\{[\s\S]*?\n\}/.exec(app);
  if (!open) throw new Error('openConfidencePop tidak terbaca');
  if (/confidence-scale/.test(open[0])) {
    throw new Error('skala keyakinan 1/2/3 kembali muncul di popup vonis');
  }
  if (/setConfidence\(1\)|setConfidence\(2\)|setConfidence\(3\)/.test(open[0])) {
    throw new Error('tombol yang menanyakan keyakinan kembali dipasang');
  }
  if (!/confidence-go/.test(open[0])) {
    throw new Error('popup vonis tidak punya jalan maju ke pembahasan');
  }
});

test('penjadwalan ulangan tetap berjalan tanpa pertanyaan keyakinan', () => {
  // Ini penjaga terpenting dari perubahan itu. Kalau seseorang kelak merapikan
  // openConfidencePop dan ikut membuang panggilan ini, kartu berhenti dijadwalkan dan
  // tidak ada satu pun galat yang muncul - murid hanya kehilangan review-nya, perlahan.
  const app = read('app.js');
  if (!/function settleReviewScheduleSilently\(\)/.test(app)) {
    throw new Error('settleReviewScheduleSilently hilang');
  }
  if (!/settleReviewScheduleSilently\(\)/.test((/function openConfidencePop\(ok\)\{[\s\S]*?\n\}/.exec(app) || [''])[0])) {
    throw new Error('penjadwalan ulangan tidak lagi diselesaikan saat vonis tampil');
  }
  const body = (/function settleReviewScheduleSilently\(\)\{[\s\S]*?\n\}/.exec(app) || [''])[0];
  if (!/scheduleNext\(/.test(body)) throw new Error('scheduleNext tidak dipanggil - review berhenti dijadwalkan');
  // Data kalibrasi TIDAK boleh dikarang: kita berhenti bertanya, jadi berhenti mencatat.
  if (/confidenceHistory\.push/.test(body)) {
    throw new Error('keyakinan yang tidak pernah diucapkan murid dicatat sebagai penilaiannya');
  }
  if (/srlCaptureConfidence/.test(body)) {
    throw new Error('prediksi SRL dikarang dari keyakinan yang tidak pernah ditanyakan');
  }
});

test('popup yang tersisa di kuis tetap punya jalan keluar', () => {
  // Batas yang dipegang seluruh aplikasi sejak m025-126: "layar yang menahan alur tanpa
  // jalan keluar adalah kurungan, bukan pelajaran".
  // 2026-08-31: pemeriksaan ini DULU mencari literal 'confidence-skip' untuk membuktikan
  // popup KEYAKINAN bisa dilewati. Pertanyaan keyakinannya sudah dihapus, dan literal itu
  // kini hanya tersisa di popup TUJUAN SRL - jadi pemeriksaan lama tetap hijau sambil
  // menguji elemen yang sama sekali berbeda dari yang disebut namanya. Lolos palsu.
  // Diganti dengan dua hal yang benar-benar ada sekarang.
  const app = read('app.js');
  const open = /function openConfidencePop\(ok\)\{[\s\S]*?\n\}/.exec(app);
  if (!open || !/confidencePopNext\(\)/.test(open[0])) {
    throw new Error('popup vonis tidak punya jalan maju - itu kurungan');
  }
  const srl = /pop\.id='srlGoalPop'[\s\S]*?document\.body\.appendChild\(pop\)/.exec(app);
  if (srl && !/srlGoalDismiss\(\)/.test(srl[0])) {
    throw new Error('popup tujuan SRL tidak bisa dilewati tanpa memilih');
  }
});

/**
 * [i8 rig-repair 2026-08-28] Perluasan kontrak: mekanisme pivot tunggal.
 *
 * KRONOLOGI: 27/49 aset rig (13/16 pose, 11/14 ekspresi, level-up & milestone)
 * tampil cacat di produksi — _applyTuple menulis ATRIBUT transform dengan pivot
 * dibake (rotate(a cx cy)) sementara fiezel-motion.css memasang transform-box
 * (:123 fill-box global, :131-137 view-box) + transform-origin pada elemen yang
 * sama, sehingga pivot terpasang DUA KALI (audit O3 §4: armR pose thinking
 * terlempar ke x=542 pada viewBox 320). Perbaikannya: kanal rotasi/skala tuple
 * kini gaya CSS inline (helper styleAt: transform-box:view-box +
 * transform-origin=pivot + fungsi transform polos) — satu model origin dengan
 * sistem keyframe. Tiga assert statis di bawah menjaga mekanismenya supaya
 * tidak diam-diam kembali ke atribut berpivot bake. Verifikasi RENDER penuh
 * (bbox per bagian, paritas A/B dengan/tanpa motion.css) ada di
 * features/mascot/qa/bbox-probe.mjs — butuh browser, jalankan manual pada
 * setiap perubahan fiezel-mascot.js / fiezel-motion.css.
 */

test('kanal rotasi/skala tuple memakai gaya CSS ber-origin (styleAt), bukan atribut berpivot bake', () => {
  if (!/el\.style\.transformBox = "view-box"/.test(RIG)
    || !/el\.style\.transformOrigin = `\$\{p\[0\]\}px \$\{p\[1\]\}px`/.test(RIG)) {
    throw new Error('helper styleAt (transform-box:view-box + transform-origin=pivot) hilang dari rig');
  }
  // Kanal rotasi (lengan/telinga/ekor) tidak boleh kembali ke setT+rotAt — itu
  // persis pola yang berpivot ganda di bawah origin CSS fiezel-motion.css.
  if (/setT\("\.fz-(arm|ear|tail)[^"]*",\s*rotAt/.test(RIG)) {
    throw new Error('kanal rotasi tuple kembali ditulis sebagai atribut berpivot bake (setT+rotAt)');
  }
  // Kanal skala (dada/blush/mata/kaki/bayangan/fz-all) juga tidak boleh kembali
  // ke atribut scaleAt — fill-box global :123 membuatnya berpivot ganda juga.
  if (/setAttribute\("transform",\s*scaleAt/.test(RIG) || /setT\("[^"]*",\s*scaleAt/.test(RIG)) {
    throw new Error('kanal skala tuple kembali ditulis sebagai atribut scaleAt berpivot bake');
  }
});

test('reset rig membersihkan gaya transform inline yang dipasang styleAt', () => {
  // Tanpa pembersihan ini, origin/transform inline pose lama menempel ke state
  // berikutnya — bentuk kebocoran yang tidak terlihat di frame pertama.
  const n = (RIG.match(/el\.style\.transform = ""; el\.style\.transformOrigin = ""; el\.style\.transformBox = "";/g) || []).length;
  if (n < 2) {
    throw new Error('pembersihan gaya transform inline hanya ' + n + ' situs; _rigReset dan _costumeReset dua-duanya wajib membersihkan');
  }
});

test('probe render bbox tersedia untuk QA', () => {
  if (!fs.existsSync(path.join(__dirname, 'features/mascot/qa/bbox-probe.mjs'))) {
    throw new Error('features/mascot/qa/bbox-probe.mjs hilang — satu-satunya verifikasi RENDER anatomi rig');
  }
});

/* ============================================================
   LAPISAN OUTFIT (G5') — dijalankan sungguhan, bukan diregex.
   Berkasnya adalah IIFE yang menempel ke `window`, jadi cukup diberi
   dokumen palsu: resolver `outfitFor` lalu bisa dipanggil langsung dan
   yang diuji adalah PERILAKUNYA, bukan penampakan sumbernya.

   Kenapa perlu gerbang: keputusan OWNER 2026-08-31 ("mascot pakai topi
   tidur hilangkan sepenuhnya dari aplikasi tanpa terkecuali", dan tiap
   sesi memakai item tertentu) tidak dijaga apa pun sebelum ini. OF-08
   sendiri dulu terpasang lewat DUA cabang - state 'sleepy' dan idle di
   jam malam - jadi mencabut satu baris saja tidak cukup, dan tidak ada
   yang akan memberi tahu kalau salah satunya kembali.
   ============================================================ */
function loadOutfitLayer() {
  const doc = {
    readyState: 'complete', body: {}, documentElement: {},
    querySelectorAll: () => [], addEventListener: () => {}
  };
  const win = { document: doc };
  const before = global.window;
  global.window = win;
  try {
    delete require.cache[require.resolve('./features/mascot/fiezel-paw-outfit.js')];
    require('./features/mascot/fiezel-paw-outfit.js');
  } finally {
    if (before === undefined) delete global.window; else global.window = before;
  }
  if (!win.FiezelPawOutfit) throw new Error('lapisan outfit tidak menempel ke window');
  return win.FiezelPawOutfit;
}

const OUTFIT = loadOutfitLayer();
/* Semua layar nyata app.js (VALID_VIEWS) + semua state komponen yang bisa
   dilihat resolver. Sapuan penuh, bukan contoh yang dipilih-pilih. */
const VIEWS = ['home', 'vocab', 'grammar', 'reading', 'skills', 'listening', 'speaking',
  'writing', 'test', 'progress', 'classroom', 'library', 'ask', 'search', 'online', ''];
const STATES = ['idle', 'sleepy', 'listening', 'lesson-start', 'welcome-back', 'level-up',
  'milestone', 'celebrating', 'completion', 'curious', 'proud', 'sad'];

test('topi tidur OF-08 tidak punya SATU pun jalan tersisa di aplikasi', () => {
  // Sapuan penuh layar x state x 24 jam. Cabang jam-malam itulah yang dulu
  // membuat OWNER melihat topi tidur di hampir tiap layar (ia belajar 01.50-02.17),
  // jadi jamnya ikut disapu - bukan hanya siang hari yang kebetulan lolos.
  if (OUTFIT.registry['OF-08']) throw new Error('OF-08 masih ada barisnya di registry');
  const bocor = [];
  for (const v of VIEWS) for (const st of STATES) for (let jam = 0; jam < 24; jam++) {
    const id = OUTFIT.outfitFor(st, v, jam);
    for (const one of (Array.isArray(id) ? id : [id])) {
      if (one === 'OF-08') bocor.push(st + '/' + (v || '(kosong)') + '/' + jam);
    }
  }
  if (bocor.length) throw new Error('topi tidur masih muncul di ' + bocor.length + ' kombinasi, mis. ' + bocor[0]);
});

test('resolver tidak pernah memulangkan item yang tidak ada barisnya', () => {
  // Registry TERTUTUP (19 §1.2): id yang tidak terdaftar berarti PAW telanjang
  // secara diam-diam, bukan error - persis kelas bug yang bikin maskot "hilang".
  for (const v of VIEWS) for (const st of STATES) for (const jam of [3, 9, 15, 22]) {
    const id = OUTFIT.outfitFor(st, v, jam);
    if (id === null) continue;
    for (const one of (Array.isArray(id) ? id : [id])) {
      if (!OUTFIT.registry[one]) throw new Error('outfitFor(' + st + ',' + v + ',' + jam + ') -> ' + one + ' yang tidak ada di registry');
    }
  }
});

test('tiap sesi memakai outfit yang diminta OWNER, dan tidak berubah menurut jam', () => {
  // Kalimat OWNER 2026-08-31, harfiah: test = ransel + bunga, grammar = pensil,
  // reading = syal, writing = topi. "Tidak berubah menurut jam" bagian penting:
  // sebelum ini pakaian bisa berganti sendiri di malam hari.
  const minta = { test: ['OF-01', 'OF-03'], grammar: 'OF-07', reading: 'OF-04', writing: 'OF-02' };
  for (const [layar, harap] of Object.entries(minta)) {
    for (const jam of [0, 6, 13, 21, 23]) {
      const dapat = OUTFIT.outfitFor('idle', layar, jam);
      const a = JSON.stringify(Array.isArray(harap) ? harap : [harap]);
      const b = JSON.stringify(Array.isArray(dapat) ? dapat : [dapat]);
      if (a !== b) throw new Error('layar ' + layar + ' jam ' + jam + ': harap ' + a + ' dapat ' + b);
    }
  }
});

test('kombo sesi Tes tidak menabrakkan dua item di slot yang sama', () => {
  // 19 SS6.2: hard max dua, dan tidak pernah dua penghuni slot yang sama -
  // kalau tabrakan, item kedua menimpa item pertama dan salah satunya lenyap.
  const dipakai = {};
  for (const id of OUTFIT.outfitFor('idle', 'test', 12)) {
    const slot = OUTFIT.registry[id].slot;
    for (const nama of ['head', 'front', 'back']) {
      if (!slot[nama]) continue;
      if (dipakai[nama]) throw new Error('slot ' + nama + ' diperebutkan ' + dipakai[nama] + ' dan ' + id);
      dipakai[nama] = id;
    }
  }
});

test('state listening tidak pernah dapat outfit — headset penghuni slot kepala', () => {
  // OWNER: "LISTENING SUDAH BENAR PAKAI HEADSET, JANGAN DIUBAH LAGI".
  //
  // Aturan 19 SS6.2 yang sebenarnya: tidak boleh dua penghuni slot KEPALA, dan
  // headphone (fz-acc) ikut dihitung penghuni kepala. Headphone hanya hidup
  // selama STATE 'listening' - bukan selama layar Listening terbuka - jadi
  // gerbangnya pun terikat state, di SEMUA layar, bukan hanya dua layar itu.
  // (Menuntut layar Listening telanjang total justru salah sasaran: ransel
  // duduk di slot back+front dan tidak pernah bisa menimpa headset.)
  const bocor = [];
  for (const v of VIEWS) for (const jam of [2, 14, 22]) {
    const id = OUTFIT.outfitFor('listening', v, jam);
    if (id !== null) bocor.push(v + '/' + jam + ' -> ' + JSON.stringify(id));
  }
  if (bocor.length) throw new Error('slot kepala direbut dari headset: ' + bocor[0] + ' (total ' + bocor.length + ')');
});

test('peta layar sendiri tidak pernah menaruh item kepala di listening/speaking', () => {
  // Cabang terpisah dari yang di atas: kalau suatu saat seseorang menambahkan
  // baris listening/speaking ke peta LAYAR, tes di atas masih bisa lolos lewat
  // state tertentu. Ini menagih petanya langsung.
  const src = read('features/mascot/fiezel-paw-outfit.js');
  const peta = /var LAYAR = \{([\s\S]*?)\n  \};/.exec(src);
  if (!peta) throw new Error('peta LAYAR tidak ditemukan — struktur resolver berubah, gerbang ini buta');
  if (/\b(listening|speaking)\s*:/.test(peta[1])) {
    throw new Error('listening/speaking masuk peta LAYAR; OWNER menyuruh layar itu tidak diubah lagi');
  }
});

test('maks dua item, dan hanya sesi Tes yang memakai dua', () => {
  for (const v of VIEWS) for (const st of STATES) for (const jam of [4, 11, 20]) {
    const id = OUTFIT.outfitFor(st, v, jam);
    const n = Array.isArray(id) ? id.length : (id ? 1 : 0);
    if (n > 2) throw new Error('layar ' + v + ' state ' + st + ' memakai ' + n + ' item (cap 19 SS6.2 = 2)');
    if (n === 2 && v !== 'test') throw new Error('kombo dua item bocor ke layar ' + v);
  }
});

test('milestone tetap mengalahkan peta layar — toga tidak boleh tertutup pakaian sesi', () => {
  // Anti-inflasi 13: toga hanya muncul di milestone nyata. Kalau peta layar
  // menang, toga tidak akan pernah terlihat lagi karena tiap sesi punya pakaian.
  for (const v of VIEWS) for (const st of ['level-up', 'milestone']) {
    if (OUTFIT.outfitFor(st, v, 12) !== 'OF-05') throw new Error('toga kalah oleh peta layar di ' + v + '/' + st);
  }
});

console.log('');
if (failures.length) {
  console.log('FIEZEL maskot PAW: FAIL (' + failures.length + ')');
  process.exit(1);
}
console.log('FIEZEL maskot PAW: PASS ' + pass);
