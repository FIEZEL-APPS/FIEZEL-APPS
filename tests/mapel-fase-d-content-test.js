#!/usr/bin/env node
/**
 * tests/mapel-fase-d-content-test.js — GERBANG: ISI MAPEL FASE D (MAT / IPA / ENG)
 *
 * KENAPA GERBANG INI ADA
 * ----------------------
 * Sampai m025-339, `synthesizeMapelQuestions()` menerima `compCode` dan `compTitle` lalu
 * MEMBUANG keduanya sebagai saringan — dipakai hanya sebagai metadata. Kolam soalnya
 * satu per mapel:
 *
 *     var baseList = templates[subjectId] || templates.MAT || [];
 *
 * Akibatnya terukur, bukan dugaan: guru Matematika kelas 9 yang menerbitkan "Statistika &
 * Peluang" mengirim kolam yang PERSIS SAMA dengan guru kelas 7 yang menerbitkan "Bilangan
 * Bulat" — irisan 15 dari 15. Murid kelas 9 mengerjakan operasi bilangan bulat kelas 7 dan
 * tidak ada satu pun gerbang yang bersuara.
 *
 * Dua cacat lain menempel di situ:
 *   - seluruh naskah soal lahir sebagai literal Indonesia di dalam .js, jadi NOL sensus
 *     bahasa yang dimiliki repo ini pernah melihatnya (`i18n-kunci-hantu-test` melewatkan
 *     kunci tanpa titik, `th-coverage-test` hanya menjangkau empat permukaan yang ia sebut);
 *   - opsi diacak saat terbit oleh `shuffleOptions()`, jadi pembahasan yang berbunyi
 *     "pilihan pertama yang benar" berbohong 3 dari 4 kali.
 *
 * APA YANG GERBANG INI TEGAKKAN
 * -----------------------------
 *  1. Tiap mapel punya >= 3 kompetensi untuk MASING-MASING kelas 7, 8, dan 9.
 *  2. Tiap kompetensi punya >= 12 butir (UI guru menawarkan sampai 10 soal; 12 membuat
 *     tugas 10-soal tidak mengulang dan masih menyisakan rotasi antar-tugas).
 *  3. Kompetensi berbeda menghasilkan kolam berbeda — irisan NOL, kebalikan persis dari
 *     cacat yang diukur di atas.
 *  4. Kelas berbeda menghasilkan kolam berbeda.
 *  5. Saringan yang MENGHABISKAN kolamnya mengembalikan kekurangan itu sebagai KOSONG:
 *     minta 20 dari kompetensi berisi 12 menghasilkan 12, dan NOL butir dari kompetensi
 *     lain. Penambalan senyap dari kolam mapel adalah cacat, bukan kemurahan hati.
 *  6. Tiap butir: 4 opsi berbeda, kunci menunjuk indeks sah, pembahasan kunci terisi.
 *  7. NOL pembahasan yang menyebut POSISI pilihan (id maupun th).
 *  8. Paritas sidecar Thai: tiap `code` dan `id` punya kembaran, nilai th ber-aksara Thai
 *     (atau identik dengan padanan id-nya untuk isi yang memang netral bahasa — angka,
 *     notasi matematika, dan batang soal Bahasa Inggris yang memang materinya), dan
 *     himpunan {placeholder} sama persis.
 *  9. Fail-quiet: bank absen => perilaku lama, nol lemparan. 14 mapel lain hidup di jalur
 *     itu setiap hari dan tidak boleh ikut berubah.
 *
 * Print-only: tidak menulis berkas apa pun; exit 1 bila ada FAIL.
 * ENV: FIEZEL_ROOT -> root repo (default __fzRoot). Dipakai uji mutasi merah-dulu supaya
 * kerusakan yang disengaja terjadi di salinan, bukan di pohon kerja.
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
const MIN_KOMP_PER_KELAS = 3;
const MIN_BUTIR = 12;
const BIDANG_TERJEMAH = ['name', 'materi'];

const RE_THAI = /[฀-๿]/;
const RE_PLACEHOLDER = /\{[a-zA-Z0-9_]+\}/g;
/* Kode kompetensi mengikat pada BAB Buku Siswa, bukan pada singkatan topik buatan sendiri:
   guru mencari "Bab 3", bukan "TEK". Bentuknya KOMP-<MAPEL>-D-<kelas>-BAB<n>-<NN>. */
const RE_KODE = /^KOMP-(MAT|IPA|ENG|IND|IPS)-D-([789])-BAB(\d{1,2})-\d{2}$/;

/* Pembahasan yang menyebut letak, bukan konsep. Sengaja SEMPIT: "data di atas" di dalam
   pembahasan merujuk tabel di batang soal dan itu sah, jadi ia tidak masuk daftar. Yang
   masuk hanya rujukan yang benar-benar menunjuk posisi opsi. */
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

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
}

/* Cangkang dimuat di dalam vm dengan `require` dan `__dirname` yang DISUNTIKKAN, supaya
   bank yang dibacanya adalah bank di ROOT — termasuk saat ROOT adalah salinan mutasi. */
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

/* ========================= 0 · BERKAS BANK ADA DAN TERBACA ============================= */

const banks = {};
const banksTh = {};
for (const s of SUBJECTS) {
  let bank = null, bankTh = null;
  try { bank = readJson('content/mapel/' + s.file); } catch (e) { bank = null; }
  try { bankTh = readJson('content/mapel/' + s.file.replace(/\.json$/, '-th.json')); } catch (e) { bankTh = null; }
  check('bank ' + s.id + ': content/mapel/' + s.file + ' terbaca & berskema fiezel-mapel-bank-v1',
    !!bank && bank.schema === 'fiezel-mapel-bank-v1' && bank.subjectId === s.id && bank.phase === 'fase_d',
    bank ? bank.schema + ' / ' + bank.subjectId + ' / ' + bank.phase : 'tidak terbaca');
  check('bank ' + s.id + ': sidecar Thai ' + s.file.replace(/\.json$/, '-th.json') + ' terbaca',
    !!bankTh && Array.isArray(bankTh.competencies), bankTh ? 'ok' : 'tidak terbaca');
  banks[s.id] = bank;
  banksTh[s.id] = bankTh;
}

/* Tanpa bank, sisa gerbang ini tidak punya apa pun untuk diperiksa. Dilaporkan sebagai
   gagal di atas, lalu berhenti — bukan hijau palsu karena nol pemeriksaan berjalan. */
const bankLengkap = SUBJECTS.every((s) => banks[s.id] && banksTh[s.id]);

if (bankLengkap) {
  /* ======================= 1 · >= 3 KOMPETENSI PER KELAS 7/8/9 ========================= */

  let totalKomp = 0;
  let totalButir = 0;
  for (const s of SUBJECTS) {
    const comps = banks[s.id].competencies || [];
    totalKomp += comps.length;
    for (const g of GRADES) {
      const perKelas = comps.filter((c) => Number(c.grade) === g);
      check('kompetensi ' + s.id + ' kelas ' + g + ': >= ' + MIN_KOMP_PER_KELAS + ' kompetensi',
        perKelas.length >= MIN_KOMP_PER_KELAS, perKelas.length + ' kompetensi');
    }
    const luarFaseD = comps.filter((c) => GRADES.indexOf(Number(c.grade)) < 0);
    check('kompetensi ' + s.id + ': nol kompetensi di luar kelas 7-9 (Fase D)',
      luarFaseD.length === 0, luarFaseD.map((c) => c.code + '=kelas' + c.grade).join(', '));

    const kodeSalahBentuk = comps.filter((c) => !RE_KODE.test(String(c.code)));
    check('kompetensi ' + s.id + ': semua kode berbentuk KOMP-' + s.id + '-D-<kelas>-BAB<n>-<NN>',
      kodeSalahBentuk.length === 0, kodeSalahBentuk.map((c) => c.code).join(', '));

    const kodeBedaKelas = comps.filter((c) => {
      const m = RE_KODE.exec(String(c.code));
      return m && Number(m[2]) !== Number(c.grade);
    });
    check('kompetensi ' + s.id + ': kelas di dalam kode sama dengan medan grade',
      kodeBedaKelas.length === 0, kodeBedaKelas.map((c) => c.code).join(', '));

    const kodeUnik = new Set(comps.map((c) => c.code));
    check('kompetensi ' + s.id + ': kode kompetensi unik', kodeUnik.size === comps.length,
      kodeUnik.size + ' unik dari ' + comps.length);

    const tanpaCp = comps.filter((c) => typeof c.cpRef !== 'string' || c.cpRef.trim().length < 10);
    check('kompetensi ' + s.id + ': setiap kompetensi mencantumkan cpRef yang bisa ditelusuri',
      tanpaCp.length === 0, tanpaCp.map((c) => c.code).join(', '));

    /* ===================== 2 · >= 12 BUTIR PER KOMPETENSI ============================== */

    for (const c of comps) {
      const items = c.items || [];
      totalButir += items.length;
      check('butir ' + c.code + ': >= ' + MIN_BUTIR + ' butir soal',
        items.length >= MIN_BUTIR, items.length + ' butir');
    }
  }
  /* 81 bab Buku Siswa: IPA 19, MAT 18, IND 17, ENG 15, IPS 12. Angka ini bukan target
     bulat buatan gerbang — ia jumlah bab yang benar-benar tercetak di Daftar Isi kelima
     Buku Siswa Kemendikbudristek untuk Fase D. */
  check('sensus: 81 kompetensi Fase D (satu per bab Buku Siswa, 5 mapel)', totalKomp >= 81, totalKomp + ' kompetensi');
  check('sensus: >= 972 butir soal Indonesia', totalButir >= 972, totalButir + ' butir');

  /* ===================== 6 · BENTUK TIAP BUTIR + 7 · NOL RUJUKAN POSISI ================ */

  const idButirGlobal = new Set();
  let butirCacat = [];
  let promptKembar = [];
  let posisiHit = [];
  let difficultyCacat = [];

  function pindaiPosisi(teks, jejak) {
    if (typeof teks !== 'string') return;
    for (const re of POLA_POSISI) {
      if (re.test(teks)) { posisiHit.push(jejak + ' :: "' + teks.slice(0, 70) + '"'); return; }
    }
  }

  for (const s of SUBJECTS) {
    const promptSubjek = new Set();
    for (const c of banks[s.id].competencies || []) {
      const hitung = { dasar: 0, sedang: 0, tinggi: 0 };
      for (const it of c.items || []) {
        const jejak = s.id + '/' + c.code + '/' + it.id;
        const opsi = it.options;
        const opsiSah = Array.isArray(opsi) && opsi.length === 4 && new Set(opsi).size === 4;
        const kunciSah = it.answer === 0; /* sumber selalu 0; pengacakan terjadi saat terbit */
        const whyKunci = it.why && it.why[String(it.answer)];
        const whySah = typeof whyKunci === 'string' && whyKunci.trim().length > 10;
        const dwSah = !!it.distractorWhy && [1, 2, 3].every((k) => {
          const v = it.distractorWhy[String(k)];
          return typeof v === 'string' && v.trim().length > 10;
        });
        if (!opsiSah || !kunciSah || !whySah || !dwSah) {
          butirCacat.push(jejak + (opsiSah ? '' : ' [opsi]') + (kunciSah ? '' : ' [kunci]') +
            (whySah ? '' : ' [why]') + (dwSah ? '' : ' [distractorWhy]'));
        }
        if (idButirGlobal.has(it.id)) butirCacat.push(jejak + ' [id ganda]');
        idButirGlobal.add(it.id);
        if (promptSubjek.has(it.prompt)) promptKembar.push(jejak);
        promptSubjek.add(it.prompt);
        if (Object.prototype.hasOwnProperty.call(hitung, it.difficulty)) hitung[it.difficulty]++;
        else difficultyCacat.push(jejak + ' = ' + it.difficulty);

        pindaiPosisi(whyKunci, 'id ' + jejak + '.why');
        for (const k of Object.keys(it.distractorWhy || {})) pindaiPosisi(it.distractorWhy[k], 'id ' + jejak + '.distractorWhy[' + k + ']');
      }
      /* Sebaran kesulitan: sasarannya 4 dasar / 5 sedang / 3 tinggi. Diperiksa sebagai
         pita, bukan angka mati — yang dijaga adalah ketiga tingkat benar-benar hadir. */
      check('sebaran ' + c.code + ': ketiga tingkat kesulitan terwakili (>=3 dasar, >=3 sedang, >=2 tinggi)',
        hitung.dasar >= 3 && hitung.sedang >= 3 && hitung.tinggi >= 2,
        'dasar=' + hitung.dasar + ' sedang=' + hitung.sedang + ' tinggi=' + hitung.tinggi);
    }
  }

  /* Sidecar Thai ikut dipindai: pembahasan yang menyebut posisi tetap bohong dalam bahasa
     apa pun. */
  for (const s of SUBJECTS) {
    for (const c of (banksTh[s.id].competencies || [])) {
      for (const it of c.items || []) {
        const jejak = s.id + '/' + c.code + '/' + it.id;
        pindaiPosisi(it.why && it.why[String(it.answer)], 'th ' + jejak + '.why');
        for (const k of Object.keys(it.distractorWhy || {})) pindaiPosisi(it.distractorWhy[k], 'th ' + jejak + '.distractorWhy[' + k + ']');
      }
    }
  }

  check('butir: 4 opsi berbeda, kunci di indeks 0 pada sumber, pembahasan kunci & peta miskonsepsi terisi',
    butirCacat.length === 0, butirCacat.slice(0, 8).join(' | '));
  check('butir: nol prompt kembar dalam satu mapel', promptKembar.length === 0, promptKembar.slice(0, 8).join(', '));
  check('butir: setiap difficulty bernilai dasar/sedang/tinggi', difficultyCacat.length === 0, difficultyCacat.slice(0, 8).join(', '));
  check('pembahasan: NOL rujukan posisi pilihan di seluruh why & distractorWhy (id + th)',
    posisiHit.length === 0, posisiHit.slice(0, 6).join(' | '));

  /* ========================= 8 · PARITAS SIDECAR THAI ================================= */

  function placeholderSet(v) {
    return (String(v == null ? '' : v).match(RE_PLACEHOLDER) || []).sort().join(',');
  }
  /* Nilai th lolos bila ber-aksara Thai, ATAU identik dengan padanan id-nya. Jalur kedua
     itu bukan kelonggaran: batang soal Bahasa Inggris MEMANG materinya (menerjemahkannya
     merusak soalnya), dan "56 cm²" tidak punya bentuk Thai yang berbeda.

     Satu-satunya perbedaan penulisan yang ikut dimaafkan adalah pemisah desimal: Indonesia
     menulis "2,5" sementara Thai menulis "2.5". Memaksa th memakai koma berarti memaksakan
     ejaan angka Indonesia kepada pembaca Thai. Pemaafan ini SENGAJA sesempit mungkin — ia
     hanya menyamakan koma dengan titik DI ANTARA DIGIT, jadi angka yang benar-benar berbeda
     ("25" vs "2.5", "52" vs "25") tetap tertangkap. Mutasi M18 membuktikan itu. */
  function samakanDesimal(v) {
    return String(v).replace(/(\d),(\d)/g, '$1.$2');
  }
  function nilaiThSah(th, id) {
    if (typeof th !== 'string' || th.trim() === '') return false;
    if (RE_THAI.test(th)) return true;
    return th === id || samakanDesimal(th) === samakanDesimal(id);
  }

  for (const s of SUBJECTS) {
    const kompId = (banks[s.id].competencies || []);
    const kompTh = (banksTh[s.id].competencies || []);
    const kodeId = kompId.map((c) => c.code);
    const kodeTh = kompTh.map((c) => c.code);
    check('paritas ' + s.id + ': kode kompetensi id vs th sama persis dan berurutan sama',
      kodeId.length === kodeTh.length && kodeId.join('|') === kodeTh.join('|'),
      'id=' + kodeId.length + ' th=' + kodeTh.length);

    const petaTh = {};
    for (const c of kompTh) petaTh[c.code] = c;

    const idHilang = [];
    const thTanpaAksara = [];
    const placeholderBeda = [];
    for (const c of kompId) {
      const ct = petaTh[c.code];
      if (!ct) { idHilang.push(c.code); continue; }
      for (const f of BIDANG_TERJEMAH) {
        if (!nilaiThSah(ct[f], c[f])) thTanpaAksara.push(c.code + '.' + f + ' = "' + String(ct[f]).slice(0, 40) + '"');
        if (placeholderSet(ct[f]) !== placeholderSet(c[f])) placeholderBeda.push(c.code + '.' + f);
      }
      const itemsTh = {};
      for (const it of (ct.items || [])) itemsTh[it.id] = it;
      for (const it of (c.items || [])) {
        const itTh = itemsTh[it.id];
        if (!itTh) { idHilang.push(it.id); continue; }
        const pasangan = [['prompt', it.prompt, itTh.prompt]];
        (it.options || []).forEach((opt, i) => pasangan.push(['options[' + i + ']', opt, (itTh.options || [])[i]]));
        pasangan.push(['why', it.why && it.why[String(it.answer)], itTh.why && itTh.why[String(it.answer)]]);
        for (const k of Object.keys(it.distractorWhy || {})) {
          pasangan.push(['distractorWhy[' + k + ']', it.distractorWhy[k], (itTh.distractorWhy || {})[k]]);
        }
        for (const [nama, vId, vTh] of pasangan) {
          if (!nilaiThSah(vTh, vId)) thTanpaAksara.push(it.id + '.' + nama + ' = "' + String(vTh).slice(0, 40) + '"');
          if (placeholderSet(vTh) !== placeholderSet(vId)) placeholderBeda.push(it.id + '.' + nama);
        }
        if (itTh.answer !== it.answer) idHilang.push(it.id + ' [answer beda]');
        if ((itTh.options || []).length !== (it.options || []).length) idHilang.push(it.id + ' [jumlah opsi beda]');
      }
    }
    check('paritas ' + s.id + ': setiap code & id punya kembaran di sidecar th',
      idHilang.length === 0, idHilang.slice(0, 8).join(', '));
    check('paritas ' + s.id + ': nilai th ber-aksara Thai (atau identik untuk isi netral bahasa)',
      thTanpaAksara.length === 0, thTanpaAksara.slice(0, 6).join(' | '));
    check('paritas ' + s.id + ': himpunan {placeholder} id vs th sama persis',
      placeholderBeda.length === 0, placeholderBeda.slice(0, 8).join(', '));

    /* Aksara Thai saja tidak membuktikan opsinya masih soal yang sama: "25 cm³" yang
       diterjemahkan menjadi "52 cm³" tetap lolos aturan aksara, dan murid Thai mengerjakan
       soal dengan kunci yang berbeda dari murid Indonesia. Karena itu ANGKA di dalam opsi
       dibandingkan sebagai himpunan.

       Sengaja hanya OPSI, bukan prosa: penjelasan yang di Indonesia menulis "lima siswa"
       dan di Thai menulis "5 คน" berbeda angkanya karena bahasanya, bukan karena salah —
       diukur, bukan ditebak: 31 selisih semacam itu di prosa, NOL di 1.296 opsi. */
    const angkaBeda = [];
    const angkaDi = (v) => (samakanDesimal(v).match(/\d+(?:\.\d+)?/g) || []).sort().join(',');
    for (const c of kompId) {
      const ct = petaTh[c.code];
      if (!ct) continue;
      const itemsTh = {};
      for (const it of (ct.items || [])) itemsTh[it.id] = it;
      for (const it of (c.items || [])) {
        const itTh = itemsTh[it.id];
        if (!itTh) continue;
        (it.options || []).forEach((opt, i) => {
          const optTh = (itTh.options || [])[i];
          if (angkaDi(opt) !== angkaDi(optTh)) angkaBeda.push(it.id + '.options[' + i + '] id="' + opt + '" th="' + optTh + '"');
        });
      }
    }
    check('paritas ' + s.id + ': angka di dalam opsi id vs th sama persis',
      angkaBeda.length === 0, angkaBeda.slice(0, 5).join(' | '));
  }

  /* ============== 3,4,5 · PENYARIPAN SAAT RUNTIME (mapel -> kelas -> kompetensi) ======= */

  const Shell = loadShell(true);
  check('runtime: FiezelTeacherShell termuat dengan akses bank', !!Shell && typeof Shell._synthesizeMapelQuestions === 'function', '');

  if (Shell && typeof Shell._synthesizeMapelQuestions === 'function') {
    const promptSet = (subjectId, code, n) =>
      new Set(Shell._synthesizeMapelQuestions(subjectId, code, 'uji', n).map((q) => q.prompt));

    for (const s of SUBJECTS) {
      const comps = banks[s.id].competencies || [];

      /* Bank yang berkasnya ada tetapi belum berisi kompetensi: sensus di atas SUDAH
         mencatatnya sebagai gagal. Lanjut ke pemeriksaan runtime di bawah hanya akan
         melempar pada comps[0] yang undefined, dan lemparan itu membunuh proses sebelum
         laporan check() sempat tercetak — pengembang melihat stack trace, bukan daftar
         gerbang yang merah. Merah yang terbaca lebih berguna daripada merah yang meledak. */
      if (comps.length === 0) continue;

      /* 3 · kompetensi berbeda -> kolam berbeda. Diperiksa untuk SEMUA pasangan dalam satu
         mapel, bukan sampel: satu pasang yang bocor sudah cukup untuk mengirim bab yang
         salah ke satu kelas. */
      const kolam = comps.map((c) => ({ code: c.code, grade: Number(c.grade), set: promptSet(s.id, c.code, MIN_BUTIR) }));
      const bocor = [];
      for (let i = 0; i < kolam.length; i++) {
        for (let j = i + 1; j < kolam.length; j++) {
          const irisan = [...kolam[i].set].filter((p) => kolam[j].set.has(p));
          if (irisan.length) bocor.push(kolam[i].code + ' x ' + kolam[j].code + ' = ' + irisan.length);
        }
      }
      check('saring ' + s.id + ': kompetensi berbeda menghasilkan kolam berbeda (irisan 0 untuk semua pasangan)',
        bocor.length === 0, bocor.slice(0, 5).join(' | '));

      /* 4 · kelas berbeda -> kolam berbeda. */
      const bocorKelas = [];
      for (let i = 0; i < kolam.length; i++) {
        for (let j = 0; j < kolam.length; j++) {
          if (kolam[i].grade === kolam[j].grade) continue;
          const irisan = [...kolam[i].set].filter((p) => kolam[j].set.has(p));
          if (irisan.length) bocorKelas.push('kelas' + kolam[i].grade + ' x kelas' + kolam[j].grade);
        }
      }
      check('saring ' + s.id + ': kelas berbeda menghasilkan kolam berbeda',
        bocorKelas.length === 0, bocorKelas.slice(0, 5).join(' | '));

      /* Kolam kompetensi tetap melayani permintaan yang muat: 5 soal dari 12 tetap 5. */
      const c0 = comps[0];
      const lima = Shell._synthesizeMapelQuestions(s.id, c0.code, 'uji', 5);
      const promptC0 = new Set((c0.items || []).map((it) => it.prompt));
      check('saring ' + s.id + ': minta 5 dari kompetensi berisi ' + (c0.items || []).length + ' butir -> tepat 5, semuanya milik kompetensi itu',
        lima.length === 5 && lima.every((q) => promptC0.has(q.prompt)),
        lima.length + ' butir');

      /* 5 · KOLAM HABIS -> KEKURANGANNYA KOSONG, BUKAN DITAMBAL DARI KOLAM MAPEL.
         Diuji pada kompetensi TERKECIL dan pada permintaan terbesar yang diterima UI (20),
         lalu dipastikan pemotongannya memang terjadi — assert yang tidak pernah bisa
         terpicu bukan gerbang. */
      const kecil = comps.slice().sort((a, b) => (a.items || []).length - (b.items || []).length)[0];
      const isiKecil = (kecil.items || []).length;
      const promptKecil = new Set((kecil.items || []).map((it) => it.prompt));
      const diminta = 20;
      const lebih = Shell._synthesizeMapelQuestions(s.id, kecil.code, 'uji', diminta);
      const asing = lebih.filter((q) => !promptKecil.has(q.prompt));
      check('saring ' + s.id + ': pemotongan benar-benar teruji — kompetensi terkecil (' + isiKecil + ' butir) lebih kecil dari permintaan maksimum ' + diminta,
        isiKecil < diminta, kecil.code + ' = ' + isiKecil + ' butir');
      check('saring ' + s.id + ': minta ' + diminta + ' dari ' + kecil.code + ' berisi ' + isiKecil + ' -> dipotong jujur ke ' + isiKecil + ', NOL tambalan dari kolam mapel',
        lebih.length === Math.min(isiKecil, diminta) && asing.length === 0,
        'dapat=' + lebih.length + ' asing=' + asing.length);

      /* Peta miskonsepsi harus ikut berpindah saat opsi diacak: penjelasan pengecoh yang
         menempel di posisi yang isinya sudah berganti adalah diagnosis yang menunjuk
         jawaban yang salah. */
      const petaSalah = [];
      for (const q of Shell._synthesizeMapelQuestions(s.id, c0.code, 'uji', 5)) {
        const asal = (c0.items || []).filter((it) => it.prompt === q.prompt)[0];
        if (!asal || !asal.distractorWhy || !q.distractorWhy) { petaSalah.push(q.prompt.slice(0, 30)); continue; }
        q.options.forEach((opt, i) => {
          const asalIdx = asal.options.indexOf(opt);
          const harus = i === q.answer ? undefined : asal.distractorWhy[String(asalIdx)];
          if (q.distractorWhy[i] !== harus) petaSalah.push(q.prompt.slice(0, 30) + ' opsi' + i);
        });
      }
      check('saring ' + s.id + ': peta miskonsepsi ikut berpindah mengikuti opsi yang diacak',
        petaSalah.length === 0, petaSalah.slice(0, 4).join(', '));
    }

    /* Kode yang tidak dikenal bukan saringan: ia ketiadaan saringan, dan kolamnya seluruh
       mapel. Inilah yang menjaga kontrak lama (tests/kelasku-17mapel-assignment-test.js)
       tetap hijau untuk kode sintetis seperti KOMP-MAT-D-01. */
    for (const s of SUBJECTS) {
      const generik = Shell._synthesizeMapelQuestions(s.id, 'KOMP-' + s.id + '-D-01', 'uji', 10);
      check('saring ' + s.id + ': kode tak dikenal dilayani dari kolam mapel (tepat 10)',
        generik.length === 10, generik.length + ' butir');
    }

    /* Katalog kompetensi guru mengikuti bank: dropdown tidak boleh menawarkan kompetensi
       yang banknya tidak punya soalnya, dan tidak boleh menyisakan kompetensi fase lain. */
    for (const s of SUBJECTS) {
      const cat = (Shell._MAPEL_CATALOG[s.id] || {}).competencies || [];
      const kodeBank = (banks[s.id].competencies || []).map((c) => c.code).join('|');
      check('katalog ' + s.id + ': daftar kompetensi guru bersumber dari bank Fase D',
        cat.map((c) => c.code).join('|') === kodeBank, cat.length + ' kompetensi');
    }
  }

  /* ========================= 9 · FAIL-QUIET: BANK ABSEN =============================== */

  let quietShell = null;
  let quietError = '';
  try { quietShell = loadShell(false); } catch (e) { quietError = String(e && e.message); }
  check('fail-quiet: cangkang tetap termuat tanpa akses bank (nol lemparan)', !!quietShell, quietError);
  if (quietShell) {
    let hasil = null, err = '';
    try { hasil = quietShell._synthesizeMapelQuestions('MAT', 'KOMP-MAT-D-7-BIL-01', 'uji', 5); } catch (e) { err = String(e && e.message); }
    check('fail-quiet: bank absen => synthesizeMapelQuestions tetap melayani 5 butir, nol lemparan',
      !!hasil && hasil.length === 5 && !err, err || (hasil ? hasil.length + ' butir' : 'null'));
    const catQuiet = (quietShell._MAPEL_CATALOG.MAT || {}).competencies || [];
    check('fail-quiet: bank absen => katalog jatuh ke daftar bawaan lama (>= 3 kompetensi)',
      catQuiet.length >= 3, catQuiet.length + ' kompetensi');
    check('fail-quiet: 17 mapel tetap utuh tanpa bank', quietShell._MAPEL_LIST.length === 17, quietShell._MAPEL_LIST.length + ' mapel');
    let lainErr = '';
    let lainOk = true;
    for (const mid of ['IND', 'IPS', 'INF', 'PPK', 'AGM', 'FIS', 'KIM', 'BIO', 'EKO', 'GEO', 'SOS', 'SEJ', 'PJK', 'SNB']) {
      try {
        const q = quietShell._synthesizeMapelQuestions(mid, 'KOMP-' + mid + '-D-01', 'uji', 5);
        if (!q || q.length !== 5) { lainOk = false; lainErr += mid + '=' + (q ? q.length : 'null') + ' '; }
      } catch (e) { lainOk = false; lainErr += mid + '=throw '; }
    }
    check('fail-quiet: 14 mapel tanpa bank tetap melayani 5 butir seperti sebelumnya', lainOk, lainErr);
  }
}

/* =============================== LAPORAN ============================================= */

console.log('tests/mapel-fase-d-content-test.js — gerbang isi mapel Fase D (MAT/IPA/ENG)');
console.log('ROOT: ' + ROOT);
for (const c of checks) {
  console.log((c.ok ? '  OK  : ' : '  FAIL: ') + c.name + (c.details ? '  — ' + c.details : ''));
}
const lulus = checks.filter((c) => c.ok).length;
console.log('\nHasil: ' + lulus + ' lulus, ' + (checks.length - lulus) + ' gagal, dari ' + checks.length + ' pemeriksaan.');
if (failed) process.exit(1);
