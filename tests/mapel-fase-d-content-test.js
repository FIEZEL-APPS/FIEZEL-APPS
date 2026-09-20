#!/usr/bin/env node
/**
 * tests/mapel-fase-d-content-test.js — GERBANG: ASAL-USUL & ISI BANK MAPEL FASE D
 *
 * KENAPA GERBANG INI DITULIS ULANG
 * --------------------------------
 * Versi sebelumnya menuntut bank mapel Fase D PUNYA ISI: 27 kompetensi, 324 butir, naik
 * menjadi 81 bab / 972 butir. Tuntutan itu dipenuhi — oleh agen AI yang MENGARANG seluruh
 * butirnya. Tidak satu pun berasal dari bank soal resmi Kemendikbudristek, dan tidak ada
 * satu pun berkas sumber resmi di repo ini yang bisa dirujuk.
 *
 * Lebih buruk dari butirnya: tiap kompetensi mencantumkan
 *
 *     "cpRef": "Kepmendikbudristek/BSKAP No. 032/H/KR/2024 — Buku Siswa IPA Kelas 7 Bab 1"
 *
 * Nomor kepmen itu tidak pernah diverifikasi terhadap dokumen aslinya. Gerbang lama
 * menuntut `cpRef` sepanjang >= 10 karakter — jadi kutipan yang TERDENGAR resmi lolos,
 * sementara kutipan yang benar-benar resmi tidak dibedakan sama sekali. Panjang string
 * bukan bukti keabsahan. Gerbang yang mengukur panjang mengajari penulis berikutnya untuk
 * menulis string yang panjang, bukan string yang benar.
 *
 * Guru memakai materi ini di kelas. Kutipan resmi palsu lebih berbahaya daripada tanpa
 * kutipan sama sekali, karena guru mempercayainya dan tidak punya alasan memeriksanya.
 *
 * APA YANG GERBANG INI TEGAKKAN SEKARANG
 * --------------------------------------
 *  A. NOL BANK = HIJAU. Keadaan hari ini: seluruh berkas bank dicabut. Jalur 17 mapel
 *     hidup dari template lama dan tidak boleh ikut mati. Gerbang ini TIDAK menuntut isi.
 *     Bank kosong bukan utang yang harus ditambal cepat-cepat; ia keadaan jujur sampai
 *     sumber resminya ada.
 *
 *  B. BANK YANG ADA WAJIB MEMBAWA ASAL-USULNYA. Begitu satu berkas bank muncul, ia harus
 *     punya blok `provenance` yang menyebut dokumen, penerbit, tahun, ISBN, dan dari mana
 *     berkas itu diperoleh — plus `penyusunButir` yang menyatakan SIAPA yang menulis
 *     butirnya. Bank yang butirnya disusun AI dan belum divalidasi guru DITOLAK. Ini
 *     aturan yang membuat kesalahan kemarin tidak bisa terulang tanpa terlihat.
 *
 *  C. BANK YANG ADA WAJIB UTUH. Bentuk kode bab, jumlah butir, sebaran kesulitan, bentuk
 *     tiap butir, nol rujukan posisi pilihan, paritas sidecar Thai termasuk kesamaan
 *     himpunan angka di dalam opsi, dan penyaringan runtime mapel -> kelas -> kompetensi.
 *
 *  D. FAIL-QUIET SELALU. Bank absen => perilaku lama, nol lemparan, 17 mapel utuh.
 *
 * Print-only: tidak menulis berkas apa pun; exit 1 bila ada FAIL.
 * ENV: FIEZEL_ROOT -> root repo (default __fzRoot).
 */
'use strict';
const __fzRoot = require('path').join(__dirname, '..');

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = process.env.FIEZEL_ROOT || __fzRoot;

const SUBJECTS = [
  { id: 'MAT', file: 'mapel-mat-d.json' },
  { id: 'IPA', file: 'mapel-ipa-d.json' },
  { id: 'ENG', file: 'mapel-eng-d.json' },
  { id: 'IND', file: 'mapel-ind-d.json' },
  { id: 'IPS', file: 'mapel-ips-d.json' }
];
const GRADES = [7, 8, 9];
const MIN_BUTIR = 12;
const BIDANG_TERJEMAH = ['name', 'materi'];

const RE_THAI = /[฀-๿]/;
const RE_PLACEHOLDER = /\{[a-zA-Z0-9_]+\}/g;
const RE_KODE = /^KOMP-(MAT|IPA|ENG|IND|IPS)-D-([789])-BAB(\d{1,2})-\d{2}$/;

/* Siapa yang menulis butirnya. Hanya dua nilai yang boleh TERBIT. `ai-belum-divalidasi`
   sengaja disediakan supaya draf AI bisa disimpan tanpa berbohong tentang dirinya — dan
   sengaja DITOLAK gerbang, supaya draf itu tidak pernah diam-diam menjadi materi kelas. */
const PENYUSUN_SAH = ['resmi-terverifikasi', 'guru-tervalidasi'];
const PENYUSUN_DITOLAK = ['ai-belum-divalidasi'];
const PROVENANCE_WAJIB = ['dokumen', 'penerbit', 'tahun', 'isbn', 'diperolehDari', 'penyusunButir'];

const POLA_POSISI = [
  /(pilihan|opsi|jawaban)\s+(pertama|kedua|ketiga|keempat|terakhir|teratas|paling atas)/i,
  /(pilihan|opsi|jawaban|huruf)\s+[ABCD](?![a-zA-Z0-9])/,
  /(pilihan|opsi)\s+(nomor\s+)?\d/i,
  /jawaban\s+di\s+atas/i,
  /ตัวเลือก(แรก|สุดท้าย|ที่\s*\d)/,
  /ตัวเลือก\s*[ABCDกขคง]/,
  /ข้อ\s*[กขคง](?![฀-๿])/,
  /(first|second|third|fourth|last)\s+(option|choice|answer)/i,
  /(option|choice)\s+[ABCD](?![a-zA-Z0-9])/
];

const checks = [];
let failed = false;
function check(name, ok, details) {
  checks.push({ name, ok: !!ok, details: String(details == null ? '' : details) });
  if (!ok) failed = true;
}

function bacaJson(rel) {
  try { return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8')); } catch (_) { return null; }
}

function loadShell(withBankAccess) {
  const code = fs.readFileSync(path.join(ROOT, 'features/teacher/fiezel-teacher-shell.js'), 'utf8');
  const sandbox = {
    console: console,
    Date: Date, Math: Math, JSON: JSON, String: String, Array: Array, Number: Number, Object: Object,
    localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
    sessionStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
    document: {
      addEventListener() {},
      createElement() { return { setAttribute() {}, style: {} }; },
      head: { appendChild() {} },
      body: { classList: { add() {}, remove() {} } }
    },
    location: { hostname: 'localhost', search: '' }
  };
  if (withBankAccess) {
    sandbox.require = require;
    sandbox.__dirname = path.join(ROOT, 'features/teacher');
  }
  sandbox.window = sandbox;
  sandbox.self = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox);
  return sandbox.FiezelTeacherShell;
}

/* ===================== A · BANK MANA YANG ADA (NOL PUN SAH) ========================== */

const banks = {};
const banksTh = {};
const adaBank = [];
for (const s of SUBJECTS) {
  const bank = bacaJson('content/mapel/' + s.file);
  const bankTh = bacaJson('content/mapel/' + s.file.replace(/\.json$/, '-th.json'));
  banks[s.id] = bank;
  banksTh[s.id] = bankTh;
  if (bank) adaBank.push(s);
}

check('asal-usul: bank yang ADA selalu berpasangan dengan sidecar Thai-nya',
  adaBank.every((s) => !!banksTh[s.id]),
  adaBank.map((s) => s.id + (banksTh[s.id] ? '' : ' [sidecar hilang]')).join(', ') || 'nol bank');

/* Bank yang berkas Indonesia-nya ada tetapi sidecar Thai-nya belum — berkas id ter-commit,
   kembarannya lupa — SUDAH dilaporkan gagal tepat di atas. Pemeriksaan keutuhan di bawah
   membaca `banksTh[s.id].competencies`, jadi melanjutkannya untuk mapel itu berarti
   menyentuh null dan melempar TypeError: proses mati sebelum satu baris check() pun
   tercetak. Itu persis "merah yang meledak" yang penulisan ulang gerbang ini ada untuk
   melenyapkannya — dan ia sempat lolos ke dalam gerbangnya sendiri. */
const adaBankUtuh = adaBank.filter((s) => !!banksTh[s.id]);

/* Berkas precache service worker tidak boleh menyebut bank yang berkasnya tidak ada:
   addAll() menolak SELURUH precache bila satu alamat gagal, dan service worker gagal
   pasang. Ini pernah nyaris terjadi saat bank dicabut. */
const swSrc = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
const swBankRefs = (swSrc.match(/\.\/content\/mapel\/mapel-[a-z]+-d\.json/g) || []);
const swHantu = swBankRefs.filter((r) => !fs.existsSync(path.join(ROOT, r.replace('./', ''))));
check('precache: sw.js tidak menyebut satu pun berkas bank yang tidak ada',
  swHantu.length === 0, swHantu.join(', ') || swBankRefs.length + ' rujukan, semuanya ada');

if (adaBank.length === 0) {
  check('keadaan: NOL bank mapel — gerbang tidak menuntut isi, dan itu memang keadaan jujur',
    true, 'isi menunggu sumber resmi Kemendikbudristek; lihat docs/handoffs/BUKU-SISWA-BAB-HANDOFF.md');
}

/* =================== B · BANK YANG ADA WAJIB MEMBAWA ASAL-USULNYA ==================== */

for (const s of adaBank) {
  const b = banks[s.id];
  check('bank ' + s.id + ': berskema fiezel-mapel-bank-v1 untuk mapel & fase yang benar',
    b.schema === 'fiezel-mapel-bank-v1' && b.subjectId === s.id && b.phase === 'fase_d',
    b.schema + ' / ' + b.subjectId + ' / ' + b.phase);

  const p = b.provenance;
  const medanKurang = PROVENANCE_WAJIB.filter((f) => !p || typeof p[f] !== 'string' || !p[f].trim());
  check('asal-usul ' + s.id + ': blok provenance lengkap (' + PROVENANCE_WAJIB.join(', ') + ')',
    medanKurang.length === 0, medanKurang.length ? 'kurang: ' + medanKurang.join(', ') : p.dokumen);

  const penyusun = p && String(p.penyusunButir || '');
  check('asal-usul ' + s.id + ': penyusunButir bernilai ' + PENYUSUN_SAH.join(' atau '),
    PENYUSUN_SAH.indexOf(penyusun) >= 0,
    penyusun + (PENYUSUN_DITOLAK.indexOf(penyusun) >= 0
      ? ' — draf AI yang belum divalidasi guru TIDAK BOLEH terbit sebagai materi kelas'
      : ''));

  /* cpRef tidak lagi diukur dari panjangnya. Ia harus menunjuk halaman/bab pada dokumen
     yang SAMA dengan yang disebut provenance.dokumen — kutipan yang tidak bisa ditelusuri
     ke dokumen yang dipegang bank ini bukan kutipan, melainkan hiasan. */
  const dok = (p && String(p.dokumen || '')) || '\u0000';
  const cpLiar = (b.competencies || []).filter((c) => String(c.cpRef || '').indexOf(dok) < 0);
  check('asal-usul ' + s.id + ': setiap cpRef menunjuk dokumen yang sama dengan provenance.dokumen',
    cpLiar.length === 0, cpLiar.slice(0, 4).map((c) => c.code).join(', '));
}

/* ========================= C · BANK YANG ADA WAJIB UTUH ============================== */

const idButirGlobal = new Set();
for (const s of adaBankUtuh) {
  const comps = banks[s.id].competencies || [];
  const promptSubjek = new Set();
  let butirCacat = [], posisiHit = [], promptKembar = [];

  const kodeSalah = comps.filter((c) => !RE_KODE.test(String(c.code)));
  check('kompetensi ' + s.id + ': semua kode berbentuk KOMP-' + s.id + '-D-<kelas>-BAB<n>-<NN>',
    kodeSalah.length === 0, kodeSalah.map((c) => c.code).join(', '));

  const kodeBedaKelas = comps.filter((c) => {
    const m = RE_KODE.exec(String(c.code));
    return m && Number(m[2]) !== Number(c.grade);
  });
  check('kompetensi ' + s.id + ': kelas di dalam kode sama dengan medan grade',
    kodeBedaKelas.length === 0, kodeBedaKelas.map((c) => c.code).join(', '));

  check('kompetensi ' + s.id + ': kode unik, dan nol kompetensi di luar kelas 7-9',
    new Set(comps.map((c) => c.code)).size === comps.length &&
    comps.every((c) => GRADES.indexOf(Number(c.grade)) >= 0), comps.length + ' kompetensi');

  function pindai(teks, jejak) {
    if (typeof teks !== 'string') return;
    for (const re of POLA_POSISI) if (re.test(teks)) { posisiHit.push(jejak); return; }
  }

  for (const c of comps) {
    const items = c.items || [];
    check('butir ' + c.code + ': >= ' + MIN_BUTIR + ' butir soal', items.length >= MIN_BUTIR,
      items.length + ' butir');
    const hitung = { dasar: 0, sedang: 0, tinggi: 0 };
    for (const it of items) {
      const jejak = s.id + '/' + c.code + '/' + it.id;
      const opsi = it.options;
      const opsiSah = Array.isArray(opsi) && opsi.length === 4 && new Set(opsi).size === 4;
      const whyKunci = it.why && it.why[String(it.answer)];
      const whySah = typeof whyKunci === 'string' && whyKunci.trim().length > 10;
      const dwSah = !!it.distractorWhy && [1, 2, 3].every((k) => {
        const v = it.distractorWhy[String(k)];
        return typeof v === 'string' && v.trim().length > 10;
      });
      if (!opsiSah || it.answer !== 0 || !whySah || !dwSah) butirCacat.push(jejak);
      if (idButirGlobal.has(it.id)) butirCacat.push(jejak + ' [id ganda]');
      idButirGlobal.add(it.id);
      if (promptSubjek.has(it.prompt)) promptKembar.push(jejak);
      promptSubjek.add(it.prompt);
      if (Object.prototype.hasOwnProperty.call(hitung, it.difficulty)) hitung[it.difficulty]++;
      else butirCacat.push(jejak + ' [difficulty ' + it.difficulty + ']');
      pindai(whyKunci, 'id ' + jejak + '.why');
      for (const k of Object.keys(it.distractorWhy || {})) pindai(it.distractorWhy[k], 'id ' + jejak + '.dw' + k);
    }
    check('sebaran ' + c.code + ': ketiga tingkat terwakili (>=3 dasar, >=3 sedang, >=2 tinggi)',
      hitung.dasar >= 3 && hitung.sedang >= 3 && hitung.tinggi >= 2,
      'dasar=' + hitung.dasar + ' sedang=' + hitung.sedang + ' tinggi=' + hitung.tinggi);
  }

  for (const c of (banksTh[s.id].competencies || [])) {
    for (const it of (c.items || [])) {
      pindai(it.why && it.why[String(it.answer)], 'th ' + c.code + '/' + it.id + '.why');
      for (const k of Object.keys(it.distractorWhy || {})) pindai(it.distractorWhy[k], 'th ' + c.code + '/' + it.id + '.dw' + k);
    }
  }

  check('butir ' + s.id + ': 4 opsi berbeda, kunci di indeks 0, pembahasan & peta miskonsepsi terisi',
    butirCacat.length === 0, butirCacat.slice(0, 6).join(' | '));
  check('butir ' + s.id + ': nol prompt kembar dalam satu mapel', promptKembar.length === 0,
    promptKembar.slice(0, 6).join(', '));
  check('pembahasan ' + s.id + ': NOL rujukan posisi pilihan (id + th)', posisiHit.length === 0,
    posisiHit.slice(0, 5).join(' | '));

  /* ---------------------------- paritas sidecar Thai -------------------------------- */
  function placeholderSet(v) { return (String(v == null ? '' : v).match(RE_PLACEHOLDER) || []).sort().join(','); }
  function samakanDesimal(v) { return String(v).replace(/(\d),(\d)/g, '$1.$2'); }
  function nilaiThSah(th, id) {
    if (typeof th !== 'string' || th.trim() === '') return false;
    if (RE_THAI.test(th)) return true;
    return th === id || samakanDesimal(th) === samakanDesimal(id);
  }
  const angkaDi = (v) => (samakanDesimal(v).match(/\d+(?:\.\d+)?/g) || []).sort().join(',');

  const kompTh = banksTh[s.id].competencies || [];
  check('paritas ' + s.id + ': kode kompetensi id vs th sama persis dan berurutan sama',
    comps.map((c) => c.code).join('|') === kompTh.map((c) => c.code).join('|'),
    'id=' + comps.length + ' th=' + kompTh.length);

  const petaTh = {};
  for (const c of kompTh) petaTh[c.code] = c;
  const idHilang = [], thTanpaAksara = [], placeholderBeda = [], angkaBeda = [];
  for (const c of comps) {
    const ct = petaTh[c.code];
    if (!ct) { idHilang.push(c.code); continue; }
    for (const f of BIDANG_TERJEMAH) {
      if (!nilaiThSah(ct[f], c[f])) thTanpaAksara.push(c.code + '.' + f);
      if (placeholderSet(ct[f]) !== placeholderSet(c[f])) placeholderBeda.push(c.code + '.' + f);
    }
    const itemsTh = {};
    for (const it of (ct.items || [])) itemsTh[it.id] = it;
    for (const it of (c.items || [])) {
      const itTh = itemsTh[it.id];
      if (!itTh) { idHilang.push(it.id); continue; }
      const pasangan = [['prompt', it.prompt, itTh.prompt]];
      (it.options || []).forEach((o, i) => pasangan.push(['options[' + i + ']', o, (itTh.options || [])[i]]));
      pasangan.push(['why', it.why && it.why[String(it.answer)], itTh.why && itTh.why[String(it.answer)]]);
      for (const k of Object.keys(it.distractorWhy || {})) {
        pasangan.push(['distractorWhy[' + k + ']', it.distractorWhy[k], (itTh.distractorWhy || {})[k]]);
      }
      for (const [nama, vId, vTh] of pasangan) {
        if (!nilaiThSah(vTh, vId)) thTanpaAksara.push(it.id + '.' + nama);
        if (placeholderSet(vTh) !== placeholderSet(vId)) placeholderBeda.push(it.id + '.' + nama);
      }
      if (itTh.answer !== it.answer) idHilang.push(it.id + ' [answer beda]');
      (it.options || []).forEach((o, i) => {
        if (angkaDi(o) !== angkaDi((itTh.options || [])[i])) angkaBeda.push(it.id + '.options[' + i + ']');
      });
    }
  }
  check('paritas ' + s.id + ': setiap code & id punya kembaran di sidecar th', idHilang.length === 0,
    idHilang.slice(0, 6).join(', '));
  check('paritas ' + s.id + ': nilai th ber-aksara Thai (atau identik untuk isi netral bahasa)',
    thTanpaAksara.length === 0, thTanpaAksara.slice(0, 5).join(' | '));
  check('paritas ' + s.id + ': himpunan {placeholder} id vs th sama persis', placeholderBeda.length === 0,
    placeholderBeda.slice(0, 6).join(', '));
  check('paritas ' + s.id + ': angka di dalam opsi id vs th sama persis', angkaBeda.length === 0,
    angkaBeda.slice(0, 5).join(' | '));
}

/* ===================== C-lanjut · PENYARINGAN SAAT RUNTIME =========================== */

const Shell = loadShell(true);
check('runtime: FiezelTeacherShell termuat dengan akses bank',
  !!Shell && typeof Shell._synthesizeMapelQuestions === 'function', '');

if (Shell && typeof Shell._synthesizeMapelQuestions === 'function') {
  const promptSet = (id, code, n) =>
    new Set(Shell._synthesizeMapelQuestions(id, code, 'uji', n).map((q) => q.prompt));

  for (const s of adaBank) {
    const comps = banks[s.id].competencies || [];
    if (comps.length === 0) continue;

    const kolam = comps.map((c) => ({ code: c.code, grade: Number(c.grade), set: promptSet(s.id, c.code, MIN_BUTIR) }));
    const bocor = [];
    for (let i = 0; i < kolam.length; i++) {
      for (let j = i + 1; j < kolam.length; j++) {
        if ([...kolam[i].set].some((p) => kolam[j].set.has(p))) bocor.push(kolam[i].code + ' x ' + kolam[j].code);
      }
    }
    check('saring ' + s.id + ': kompetensi berbeda menghasilkan kolam berbeda (irisan 0)',
      bocor.length === 0, bocor.slice(0, 4).join(' | '));

    const kecil = comps.slice().sort((a, b) => (a.items || []).length - (b.items || []).length)[0];
    const isiKecil = (kecil.items || []).length;
    const promptKecil = new Set((kecil.items || []).map((it) => it.prompt));
    const lebih = Shell._synthesizeMapelQuestions(s.id, kecil.code, 'uji', 20);
    check('saring ' + s.id + ': minta 20 dari ' + kecil.code + ' (' + isiKecil + ' butir) -> dipotong jujur, NOL tambalan',
      lebih.length === Math.min(isiKecil, 20) && lebih.every((q) => promptKecil.has(q.prompt)),
      'dapat=' + lebih.length);
  }
}

/* =========================== D · FAIL-QUIET SELALU =================================== */

let quietShell = null, quietError = '';
try { quietShell = loadShell(false); } catch (e) { quietError = String(e && e.message); }
check('fail-quiet: cangkang tetap termuat tanpa akses bank (nol lemparan)', !!quietShell, quietError);

if (quietShell) {
  let lainOk = true, lainErr = '';
  const SEMUA_17 = ['MAT', 'IPA', 'ENG', 'IND', 'IPS', 'INF', 'PPK', 'AGM', 'FIS', 'KIM',
                    'BIO', 'EKO', 'GEO', 'SOS', 'SEJ', 'PJK', 'SNB'];
  for (const mid of SEMUA_17) {
    try {
      const q = quietShell._synthesizeMapelQuestions(mid, 'KOMP-' + mid + '-D-01', 'uji', 5);
      if (!q || q.length !== 5) { lainOk = false; lainErr += mid + '=' + (q ? q.length : 'null') + ' '; }
    } catch (e) { lainOk = false; lainErr += mid + '=throw '; }
  }
  check('fail-quiet: KETUJUH BELAS mapel tetap melayani 5 butir tanpa bank — pencabutan bank ' +
        'tidak boleh mematikan satu pun jalur guru', lainOk, lainErr);
  check('fail-quiet: 17 mapel tetap utuh', quietShell._MAPEL_LIST.length === 17,
    quietShell._MAPEL_LIST.length + ' mapel');
  const catQuiet = (quietShell._MAPEL_CATALOG.MAT || {}).competencies || [];
  check('fail-quiet: katalog jatuh ke daftar bawaan lama', catQuiet.length >= 3, catQuiet.length + ' kompetensi');
}

/* Cangkang DENGAN akses berkas pun harus melayani, karena hari ini tidak ada bank sama
   sekali: inilah jalur yang benar-benar dipakai guru sekarang. */
if (Shell) {
  let hidup = true, jejak = '';
  for (const s of SUBJECTS) {
    try {
      const q = Shell._synthesizeMapelQuestions(s.id, 'KOMP-' + s.id + '-D-7-BAB1-01', 'uji', 5);
      if (!q || q.length !== 5) { hidup = false; jejak += s.id + '=' + (q ? q.length : 'null') + ' '; }
    } catch (e) { hidup = false; jejak += s.id + '=throw '; }
  }
  check('runtime: kelima mapel inti tetap melayani 5 butir pada keadaan bank sekarang', hidup, jejak);
}

/* =============================== LAPORAN ============================================= */

console.log('tests/mapel-fase-d-content-test.js — gerbang asal-usul & isi bank mapel Fase D');
console.log('ROOT: ' + ROOT);
console.log('Bank yang ada: ' + (adaBank.map((s) => s.id).join(', ') || 'NOL (isi menunggu sumber resmi)'));
for (const c of checks) {
  console.log((c.ok ? '  OK  : ' : '  FAIL: ') + c.name + (c.details ? '  — ' + c.details : ''));
}
const lulus = checks.filter((c) => c.ok).length;
console.log('\nHasil: ' + lulus + ' lulus, ' + (checks.length - lulus) + ' gagal, dari ' + checks.length + ' pemeriksaan.');
if (failed) process.exit(1);
