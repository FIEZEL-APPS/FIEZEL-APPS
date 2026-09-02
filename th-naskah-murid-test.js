// m025-236 — gerbang MENYELURUH: naskah murid berbahasa Indonesia yang tidak lewat i18n.
//
// Kenapa berkas ini ada, dan kenapa ia berbeda dari tiga gerbang th yang sudah ada.
//
// Gerbang yang sudah ada semuanya bertanya tentang BANK SOAL:
//   th-bank-purity-test.js   — isi sidecar bank bersih?
//   scan-th-bank-leak.js     — idem, metode daftar kata
//   th-content/exam-overlay  — isi sidecar bank SAMPAI ke penyaji?
//
// Semuanya hijau, dan owner tetap menemukan bahasa Indonesia. Sebabnya: ada naskah murid
// DI LUAR bank soal yang tidak diperiksa siapa pun. Contoh yang memicu berkas ini:
// features/quota/quota-copy.js memuat 45 kalimat untuk murid ("Jatah suara hari ini hampir
// habis"), tidak memanggil lapisan i18n sama sekali, dan copy-th-quota.js punya NOL kunci
// quota.* — jadi setiap pemberitahuan kuota tampil dalam bahasa Indonesia untuk murid Thai.
// Tidak ada satu pun gerbang yang bisa melihat itu, karena kuota bukan bank soal.
//
// Maka gerbang ini membalik cakupannya: ia memindai SELURUH berkas yang dimuat index.html,
// mencari string berbahasa Indonesia yang terlihat seperti kalimat untuk murid dan TIDAK
// lewat FiezelI18n.t(). Setiap temuan wajib salah satu dari tiga: dipindah ke copy map,
// atau didaftarkan sebagai bukan-naskah-murid di DIKECUALIKAN dengan alasan tertulis.
//
// PENTING soal presisi. Pemindaian versi awal saya penuh positif palsu (komentar HTML di
// dalam template literal, prosa Indonesia di komentar blok) dan karena itu juga pasti punya
// negatif palsu. Jadi urutan pembersihannya di bawah dibuat eksplisit dan berlapis, dan
// tiap lapis diberi alasan — kalau ada yang menambah lapis baru, ia harus tahu kenapa.
'use strict';
const fs = require('fs');
const path = require('path');

const root = __dirname;
const checks = [];
let failed = false;
const check = (name, ok, details) => {
  checks.push({ name, ok, details });
  if (!ok) failed = true;
};

/* Kata Indonesia yang praktis tidak pernah muncul di teks Inggris maupun Thai. Sengaja
   TIDAK memuat kata yang juga kata Inggris (mis. "mode", "no", "in") supaya ambangnya
   tetap "ini pasti Indonesia", bukan "mungkin Indonesia". */
const KATA_ID = new RegExp('(^|[^A-Za-z])(' + [
  'yang', 'dan', 'untuk', 'dengan', 'tidak', 'adalah', 'dari', 'pada', 'kamu', 'anda',
  'jawaban', 'jawabanmu', 'pilih', 'pilihan', 'dengarkan', 'benar', 'salah', 'soal',
  'ulangi', 'lagi', 'sudah', 'belum', 'lanjut', 'selesai', 'mulai', 'putar', 'diputar',
  'rekam', 'skor', 'nilai', 'hasil', 'latihan', 'tulis', 'tuliskan', 'suara', 'tekan',
  'silakan', 'harus', 'bisa', 'akan', 'masih', 'hanya', 'atau', 'karena', 'jika', 'kalau',
  'setelah', 'sebelum', 'semua', 'setiap', 'sangat', 'kembali', 'simpan', 'batal', 'tutup',
  'buka', 'halaman', 'kata', 'kalimat', 'bahasa', 'pelajaran', 'belajar', 'materi',
  'tingkat', 'waktu', 'menit', 'detik', 'hari', 'jumlah', 'bagian', 'berikut', 'tersebut',
  'sesuai', 'tepat', 'kurang', 'lebih', 'banyak', 'sedikit', 'coba', 'periksa', 'lihat',
  'baca', 'dengar', 'ucapkan', 'kerjakan', 'kirim', 'lanjutkan', 'berhasil', 'gagal',
  'kosong', 'penuh', 'baru', 'lama', 'siap', 'sedang', 'nanti', 'sekarang', 'jatah',
  'habis', 'tersisa', 'berjalan', 'keluar', 'muncul', 'terjadi', 'butuh', 'perlu',
].join('|') + ')([^A-Za-z]|$)', 'i');

/* Berkas yang memang bukan jalur murid. Tiap entri WAJIB punya alasan: daftar tanpa alasan
   adalah cara paling cepat membuat gerbang ini kehilangan gigi tanpa ada yang sadar. */
const BERKAS_DIKECUALIKAN = {
  'features/i18n/': 'peta copy itu sendiri - justru di sinilah naskah Indonesia SEHARUSNYA berada',
  'grammar-labels-id.js': 'judul sumber Indonesia; jalur th-nya lewat kunci grammar.title.* yang sudah 180/180',
  'features/diagnostics/': 'panel diagnostik hanya untuk pemilik, tidak pernah dibuka murid',
  'fiezel-diag-panel.js': 'panel diagnostik pemilik, sama seperti di atas',
  'features/brain/': 'mesin penalaran: keluarannya lewat copy map, string internalnya tidak dirender',
  'content-canary': 'perkakas rilis, bukan layar murid',
  'content-promotion': 'perkakas rilis, bukan layar murid',
  'report-config': 'konfigurasi laporan pemilik',
  'version.js': 'penanda versi',
  'fiezel-onboarding.js': 'pemilih bahasa berdiri SEBELUM locale dipilih, jadi ia memang sengaja menampilkan ketiga bahasa sekaligus',
  /* quota-copy.js memang MASIH memuat kalimat Indonesia, dan itu disengaja: peta COPY
     di sana adalah cadangan terakhir kalau lapisan i18n belum ada (boot paling awal,
     harness, uji unit). Naskah aktifnya sudah lewat kunci quota.*. Pengecualian ini
     TIDAK melemahkan gerbang, karena diganti pemeriksa yang lebih ketat di bawah:
     tiap bidang COPY wajib punya kunci di KEDUA locale. */
  'features/quota/quota-copy.js': 'peta COPY adalah cadangan terakhir; cakupan naskah aktifnya dijaga pemeriksa khusus di bawah',
  'fiezel-cf-voice-notice.js': 'sama seperti quota-copy: peta COPY adalah cadangan terakhir, cakupannya dijaga pemeriksa di bawah',
};

function dikecualikan(berkas) {
  for (const [pola, alasan] of Object.entries(BERKAS_DIKECUALIKAN)) {
    if (berkas.includes(pola)) return alasan;
  }
  return null;
}

/* Kalimat yang SUDAH ditinjau dan memang bukan naskah murid, tetapi berada di berkas yang
   jalur murid. Dicatat per-kalimat, bukan per-berkas, supaya pengecualiannya sesempit
   mungkin: berkasnya tetap dijaga untuk kalimat berikutnya yang masuk. */
const KALIMAT_DITINJAU = new Set([]);

function bersihkan(sumber) {
  let s = sumber;
  // 1. komentar blok - prosa Indonesia di sini bukan naskah murid, dan repo ini penuh
  //    komentar panjang berbahasa Indonesia yang kalau ikut terhitung akan menenggelamkan
  //    temuan sungguhan.
  s = s.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
  // 2. komentar HTML DI DALAM template literal - ini yang dulu membuat layar Home saya kira
  //    bocor padahal isinya komentar.
  s = s.replace(/<!--[\s\S]*?-->/g, (m) => m.replace(/[^\n]/g, ' '));
  // 3. komentar baris, hanya kalau // berada di luar string
  s = s.split('\n').map((l) => {
    const i = l.indexOf('//');
    if (i < 0) return l;
    const sebelum = l.slice(0, i);
    const kutip = (sebelum.match(/["'`]/g) || []).length;
    return kutip % 2 === 0 ? sebelum : l;
  }).join('\n');
  // 4. argumen t()/T(): argumen pertama adalah KUNCI, argumen kedua (kalau string) adalah
  //    fallback Indonesia yang memang seharusnya Indonesia.
  s = s.replace(/\b(?:FiezelI18n\s*[?.]*\s*)?\.?\b[tT]\(\s*(["'])[A-Za-z][\w.-]*\1\s*,\s*(["'])(?:\\.|(?!\2)[^\\])*\2/g, ' KUNCI_FALLBACK ');
  s = s.replace(/\b(?:FiezelI18n\s*[?.]*\s*)?\.?\b[tT]\(\s*(["'])[A-Za-z][\w.-]*\1/g, ' KUNCI ');
  // 5. definisi peta copy: 'kunci': 'nilai'
  s = s.replace(/(["'])[A-Za-z][\w.-]*\1\s*:\s*(["'])(?:\\.|(?!\2)[^\\])*\2/g, ' DEFINISI_COPY ');
  // 6. baris console/throw: pesan mesin untuk pengembang, bukan untuk murid
  s = s.split('\n').map((l) => (/\b(console\.(log|warn|error|info|debug)|throw new (Error|TypeError))\b/.test(l) ? '' : l)).join('\n');
  return s;
}

/* --- cakupan naskah kuota ------------------------------------------------------- */
{
  const qc = fs.readFileSync(path.join(root, 'features/quota/quota-copy.js'), 'utf8');
  const i = qc.indexOf('var COPY = Object.freeze({');
  const j = qc.indexOf('\n  });', i);
  const blok = i < 0 ? '' : qc.slice(i, j);
  const butuh = [];
  for (const m of blok.matchAll(/[\x27"]([a-z][\w.]*)[\x27"]:\s*Object\.freeze\(\{([\s\S]*?)\}\)/g)) {
    for (const f of m[2].matchAll(/\b(title|spoken|silent|extra|plusNote|cta)\s*:/g)) butuh.push(m[1] + '.' + f[1]);
  }
  // Empat kunci tambahan yang bukan bagian COPY tapi tetap naskah murid: penanda waktu
  // reset (tiga bagian) dan kalimat penenang.
  butuh.push('quota.reset.marker', 'quota.reset.at', 'quota.reset.next', 'quota.reassurance.text');

  function kunciDi(berkas) {
    const t = fs.readFileSync(path.join(root, berkas), 'utf8');
    return new Set([...t.matchAll(/[\x27"]([a-z][\w.]*)[\x27"]\s*:/g)].map((m) => m[1]));
  }
  const kId = kunciDi('features/i18n/copy-id-quota.js');
  const kTh = kunciDi('features/i18n/copy-th-quota.js');
  const hilangId = butuh.filter((k) => !kId.has(k));
  const hilangTh = butuh.filter((k) => !kTh.has(k));

  check('naskah kuota: seluruh bidang punya kunci id (' + butuh.length + ' bidang)',
    hilangId.length === 0, hilangId.slice(0, 6).join(', '));
  check('naskah kuota: seluruh bidang punya kunci th',
    hilangTh.length === 0, hilangTh.slice(0, 6).join(', '));
  /* Penanda waktu reset punya jebakan sendiri: kalau penandanya dibiarkan literal
     Indonesia, badan naskah Thai tidak pernah cocok dan kalimat Indonesia justru
     DITEMPELKAN di ekor teks Thai. Jadi pemakaian literalnya dijaga di sini. */
  check('naskah kuota: penanda waktu reset tidak lagi literal di kode',
    !/\/sesudah tengah malam\/\.test/.test(qc), 'regex literal masih ada di quota-copy.js');
}

/* --- cakupan naskah pemberitahuan suara ------------------------------------------- */
{
  const vn = fs.readFileSync(path.join(root, 'features/neural-voice/fiezel-cf-voice-notice.js'), 'utf8');
  const i = vn.indexOf('var COPY = Object.freeze({');
  const j = vn.indexOf('\n  });', i);
  const blok = i < 0 ? '' : vn.slice(i, j);
  const butuh = [];
  for (const m of blok.matchAll(/[\x27"]([a-z][\w.]*)[\x27"]:\s*Object\.freeze\(\{([\s\S]*?)\}\)/g)) {
    for (const f of m[2].matchAll(/\b(title|spoken|silent)\s*:/g)) butuh.push('voicenotice.' + m[1] + '.' + f[1]);
  }
  /* Kalimat penenangnya SENGAJA memakai kunci kuota, bukan kunci voicenotice sendiri:
     naskah id-nya identik makna dengan quota.reassurance.text, dan kanon id mewajibkan
     'nggak' - dua salinan berarti dua peluang salah satunya melenceng dari kanon. Kunci
     yang dituntut di sini DIBACA dari kodenya, supaya pemeriksa ini ikut pindah kalau
     suatu hari kuncinya diganti, alih-alih menuntut kunci yang sudah tidak dipakai. */
  const mRe = vn.match(/reassurance:\s*naskahPenuh\(\s*[\x27"]([\w.]+)[\x27"]/);
  check('naskah pemberitahuan suara: kalimat penenang dipanggil lewat kunci i18n',
    !!mRe, 'reassurance: masih literal di fiezel-cf-voice-notice.js');
  butuh.push(mRe ? mRe[1] : 'voicenotice.reassurance.text', 'voicenotice.reset.next');
  function kunciDi(berkas) {
    const t = fs.readFileSync(path.join(root, berkas), 'utf8');
    return new Set([...t.matchAll(/[\x27"]([a-z][\w.]*)[\x27"]\s*:/g)].map((m) => m[1]));
  }
  const kId = kunciDi('features/i18n/copy-id-quota.js');
  const kTh = kunciDi('features/i18n/copy-th-quota.js');
  check('naskah pemberitahuan suara: seluruh bidang punya kunci id (' + butuh.length + ' bidang)',
    butuh.every((k) => kId.has(k)), butuh.filter((k) => !kId.has(k)).slice(0, 6).join(', '));
  check('naskah pemberitahuan suara: seluruh bidang punya kunci th',
    butuh.every((k) => kTh.has(k)), butuh.filter((k) => !kTh.has(k)).slice(0, 6).join(', '));
}

const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const berkasRuntime = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)]
  .map((m) => m[1])
  .filter((x) => !/^https?:/.test(x))
  .map((x) => x.replace(/^\.\//, ''))
  .concat(['app.js']);

check('daftar berkas runtime terbaca dari index.html', berkasRuntime.length > 20, berkasRuntime.length + ' berkas');

const temuan = [];
let diperiksa = 0;
for (const berkas of berkasRuntime) {
  if (dikecualikan(berkas)) continue;
  let sumber;
  try { sumber = fs.readFileSync(path.join(root, berkas), 'utf8'); } catch (_) { continue; }
  diperiksa += 1;
  const kode = bersihkan(sumber);
  kode.split('\n').forEach((baris, i) => {
    const strs = baris.match(/(["'`])(?:\\.|(?!\1)[^\\])*\1/g) || [];
    for (const raw of strs) {
      const isi = raw.slice(1, -1).trim();
      // Ambang "terlihat seperti kalimat": cukup panjang DAN punya spasi. Label satu kata
      // dan id internal tidak lolos, dan itu memang niatnya - yang dicari kalimat murid.
      if (isi.length < 12 || !isi.includes(' ')) continue;
      if (!KATA_ID.test(isi)) continue;
      /* Selektor CSS dan atribut markup: 'Buka pengaturan' di dalam [aria-label="..."]
         adalah PENCOCOK ke elemen yang naskahnya sudah di-i18n-kan di tempat lain.
         Menerjemahkannya justru memutus pencocokan dan mematikan tur. */
      if (/\[[a-z-]+[~^|*$]?=|^[.#][a-zA-Z][\w-]*[\s.#\[>]/.test(isi)) continue;
      /* Fragmen markup tanpa teks murid: hanya tag dan atribut. */
      if (/^<[a-z]/i.test(isi) && !/>[^<>]*[A-Za-zก-๙]{4}/.test(isi)) continue;
      /* Ekspresi template murni (`${...}` saja) - teks aslinya ada di tempat lain. */
      if (/^\$\{[\s\S]*\}$/.test(isi)) continue;
      if (KALIMAT_DITINJAU.has(isi)) continue;
      temuan.push({ berkas, baris: i + 1, isi: isi.slice(0, 90) });
    }
  });
}

check('ada berkas runtime yang benar-benar diperiksa', diperiksa > 10, diperiksa + ' berkas diperiksa');

const perBerkas = {};
for (const t of temuan) (perBerkas[t.berkas] ??= []).push(t);
const ringkas = Object.entries(perBerkas)
  .sort((a, b) => b[1].length - a[1].length)
  .map(([f, v]) => f + ' (' + v.length + ')')
  .join(', ');

check('nol naskah murid berbahasa Indonesia di luar lapisan i18n',
  temuan.length === 0,
  temuan.length + ' kalimat di ' + Object.keys(perBerkas).length + ' berkas: ' + ringkas);

if (temuan.length) {
  /* Ringkas secara bawaan supaya log CI tetap terbaca; TH_GERBANG_RINCI=1 mencetak
     SEMUA temuan, yang dibutuhkan siapa pun yang sedang mengerjakan sisa daftarnya. */
  const rinci = process.env.TH_GERBANG_RINCI === '1';
  console.log('\n--- rincian temuan (' + (rinci ? 'lengkap' : 'maks 3 per berkas; TH_GERBANG_RINCI=1 untuk semua') + ') ---');
  for (const [f, v] of Object.entries(perBerkas)) {
    console.log('  ' + f);
    (rinci ? v : v.slice(0, 3)).forEach((t) => console.log('    :' + t.baris + '  ' + t.isi));
  }
  console.log('\nTiap temuan wajib salah satu dari:');
  console.log('  (a) dipindah ke features/i18n/copy-id-*.js + copy-th-*.js lalu dipanggil lewat t()');
  console.log('  (b) didaftarkan di BERKAS_DIKECUALIKAN / KALIMAT_DITINJAU dengan alasan tertulis\n');
}

let pass = 0;
for (const c of checks) {
  if (c.ok) pass += 1;
  console.log(`${c.ok ? 'PASS' : 'FAIL'}  ${c.name}${c.ok || !c.details ? '' : `\n      → ${c.details}`}`);
}
console.log(`\nth-naskah-murid-test: ${pass}/${checks.length} PASS${failed ? ' — GAGAL (murid Thai membaca bahasa Indonesia di luar bank soal)' : ''}`);
process.exit(failed ? 1 : 0);
