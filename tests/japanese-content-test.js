// tests/japanese-content-test.js — bank soal Jepang tidak boleh mendarat setengah jadi.
//
// KENAPA GERBANG INI ADA
// ----------------------
// Bank soal Inggris tumbuh selama bertahun-tahun dengan gerbangnya sendiri. Bank Jepang
// lahir dari nol, dan kalau ia lahir tanpa gerbang, ia akan lahir dengan cacat yang tidak
// terlihat — bukan cacat yang membuat aplikasi error, melainkan cacat yang membuat aplikasi
// MENGAJAR DENGAN KELIRU sambil tetap menyala.
//
// Tiga cacat itu, masing-masing dengan alasannya sendiri:
//
// 1. MARKER NON-ASCII. `conceptOf()` di features/brain/fiezel-question-memory.js membuang
//    setiap karakter non-ASCII dari marker. Marker `は` atau `て形` menjadi null, dan
//    pembatas kebaruan konsep di allocator menerima `concept: null` untuk SELURUH butir
//    Jepang — jadi ia berhenti membatasi pengulangan. Tanpa error, tanpa gejala, soal tetap
//    keluar. Dua puluh soal yang menguji lima konsep yang sama lolos sebagai "dua puluh
//    konsep berbeda". Gerbang ini TIDAK menebak: ia memanggil conceptOf() yang sebenarnya
//    dan menuntut hasilnya bukan null.
//
// 2. PENGECOH TANPA MISKONSEPSI BERNAMA. Pengecoh yang salah karena "kedengaran aneh" tidak
//    bisa dibaca sebagai diagnosis. Murid yang memilihnya tidak memberi tahu apa pun tentang
//    apa yang ia salah pahami, dan bukti Braincore yang dibangun di atasnya adalah angka
//    tanpa makna.
//
// 3. PENGECOH YANG SEBENARNYA BENAR. Pengecoh yang sama dengan kunci — atau yang sama
//    dengan pengecoh lain — membuat murid dihukum untuk jawaban yang benar. Ini satu-satunya
//    cacat di daftar ini yang murid rasakan langsung, dan justru yang paling mudah lolos
//    dari mata manusia di bank berisi ratusan butir.
//
// Gerbang ini dijalankan atas SETIAP bank Jepang yang ada. Hari ini yang ada baru sepuluh
// contoh di docs/japanese/; saat content/ja/ lahir, ia ikut terperiksa tanpa daftar yang
// perlu disunting.

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const __fzRoot = path.join(__dirname, '..');
const memory = require(path.join(__fzRoot, 'features', 'brain', 'fiezel-question-memory.js'));

let pass = 0;
const failures = [];
function test(name, fn) {
  try { fn(); pass++; } catch (err) { failures.push(name + ' — ' + err.message); }
}

const JP_SCRIPT = /[぀-ヿ㐀-䶿一-鿿]/;
const ASCII_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const CEFR = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const JLPT = ['N5', 'N4', 'N3', 'N2', 'N1'];

const WAJIB_BUTIR = [
  'id', 'family', 'skill', 'subskill', 'cefr', 'jlpt', 'marker', 'questionType',
  'pedagogicalObjective', 'pedagogicalObjectiveId',
  'misconceptionTargeted', 'misconceptionTargetedId',
  'reasoningOperation', 'reasoningOperationId',
  'stem', 'stemKana', 'options', 'correctIndex', 'distractors', 'explanation'
];
const WAJIB_PENJELASAN = [
  'whyCorrect', 'whyCorrectId', 'rule', 'ruleId', 'whyOthersFail', 'whyOthersFailId',
  'howToAvoid', 'howToAvoidId', 'memoryCue', 'memoryCueId'
];
const WAJIB_PENGECOH = ['option', 'misconception', 'misconceptionId', 'whyFails', 'whyFailsId'];

/** Semua bank Jepang yang ada, ditemukan dari isi direktori — bukan dari daftar. */
function bankJepang() {
  const keluar = [];
  const dirs = [path.join(__fzRoot, 'docs', 'japanese'), path.join(__fzRoot, 'content', 'ja')];
  dirs.forEach((dir) => {
    if (!fs.existsSync(dir)) return;
    fs.readdirSync(dir).filter((f) => f.endsWith('.json')).forEach((f) => {
      const doc = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
      const kunciArray = Object.keys(doc).find((k) => Array.isArray(doc[k]) && doc[k].length
        && doc[k][0] && typeof doc[k][0] === 'object' && doc[k][0].stem);
      if (kunciArray) keluar.push({ berkas: path.relative(__fzRoot, path.join(dir, f)), butir: doc[kunciArray] });
    });
  });
  return keluar;
}

const bank = bankJepang();

test('setidaknya satu bank Jepang ditemukan (gerbang tidak boleh hijau karena kosong)', () => {
  assert.ok(bank.length >= 1, 'tidak ada bank Jepang yang ditemukan sama sekali');
  const total = bank.reduce((n, b) => n + b.butir.length, 0);
  assert.ok(total >= 10, 'butir Jepang terlalu sedikit untuk diperiksa: ' + total);
});

test('setiap butir punya SELURUH medan skema, tanpa satu pun yang kosong', () => {
  const kurang = [];
  bank.forEach((b) => b.butir.forEach((t, i) => {
    WAJIB_BUTIR.forEach((m) => {
      const v = t[m];
      const kosong = v == null || (typeof v === 'string' && !v.trim())
        || (Array.isArray(v) && !v.length);
      if (kosong && m !== 'correctIndex') kurang.push(b.berkas + '#' + (t.id || i) + ':' + m);
    });
    if (typeof t.correctIndex !== 'number') kurang.push(b.berkas + '#' + (t.id || i) + ':correctIndex');
  }));
  assert.deepStrictEqual(kurang.slice(0, 10), [], kurang.length + ' medan kurang: ' + kurang.slice(0, 10).join(', '));
});

test('penjelasan lengkap dengan KEMBARAN INDONESIA untuk tiap bagian', () => {
  const kurang = [];
  bank.forEach((b) => b.butir.forEach((t) => {
    const e = t.explanation || {};
    WAJIB_PENJELASAN.forEach((m) => {
      if (!e[m] || !String(e[m]).trim()) kurang.push(b.berkas + '#' + t.id + ':explanation.' + m);
    });
  }));
  assert.deepStrictEqual(kurang.slice(0, 10), [], kurang.length + ' bagian penjelasan kurang: ' + kurang.slice(0, 10).join(', '));
});

test('MARKER MENGHASILKAN CONCEPT YANG SAH di mesin yang sebenarnya', () => {
  const rusak = [];
  bank.forEach((b) => b.butir.forEach((t) => {
    if (!ASCII_SLUG.test(String(t.marker || ''))) {
      rusak.push(b.berkas + '#' + t.id + ': marker "' + t.marker + '" bukan slug ASCII');
      return;
    }
    // conceptOf menerima OBJEK BUTIR dan membaca item.skill — bukan (family, marker).
    // Butir tanpa `skill` tetap menghasilkan concept, tetapi dengan awalan cadangan 'x',
    // sehingga SELURUH keluarga Jepang berbagi satu ruang nama. Dua keluarga yang kebetulan
    // memakai marker sama akan terbaca sebagai satu konsep, dan pembatas kebaruan berhenti
    // membedakannya — tanpa error, karena concept-nya memang bukan null.
    const concept = memory.conceptOf(t);
    if (!concept) {
      rusak.push(b.berkas + '#' + t.id + ': conceptOf() = null');
    } else if (concept.indexOf('x|') === 0) {
      rusak.push(b.berkas + '#' + t.id + ': concept "' + concept + '" memakai awalan cadangan — butir tidak punya `skill`');
    }
  }));
  assert.deepStrictEqual(rusak.slice(0, 10), [],
    rusak.length + ' marker mematikan pembatas kebaruan konsep: ' + rusak.slice(0, 10).join(' | '));
});

test('setiap pengecoh punya miskonsepsi BERNAMA, sebab gagal, dan kembaran Indonesia', () => {
  const kurang = [];
  bank.forEach((b) => b.butir.forEach((t) => {
    const ds = Array.isArray(t.distractors) ? t.distractors : [];
    if (!ds.length) { kurang.push(b.berkas + '#' + t.id + ': nol pengecoh'); return; }
    ds.forEach((d, j) => WAJIB_PENGECOH.forEach((m) => {
      if (!d || !d[m] || !String(d[m]).trim()) kurang.push(b.berkas + '#' + t.id + ':distractors[' + j + '].' + m);
    }));
  }));
  assert.deepStrictEqual(kurang.slice(0, 10), [], kurang.length + ' medan pengecoh kurang: ' + kurang.slice(0, 10).join(', '));
});

test('NOL pengecoh sama dengan kunci, dan nol pilihan kembar', () => {
  const salah = [];
  bank.forEach((b) => b.butir.forEach((t) => {
    const opts = Array.isArray(t.options) ? t.options.map((o) => String(o).trim()) : [];
    if (!(t.correctIndex >= 0 && t.correctIndex < opts.length)) {
      salah.push(b.berkas + '#' + t.id + ': correctIndex ' + t.correctIndex + ' di luar ' + opts.length + ' pilihan');
      return;
    }
    const kunci = opts[t.correctIndex];
    if (new Set(opts).size !== opts.length) salah.push(b.berkas + '#' + t.id + ': ada pilihan kembar');
    (t.distractors || []).forEach((d, j) => {
      if (String(d.option).trim() === kunci) {
        salah.push(b.berkas + '#' + t.id + ':distractors[' + j + '] SAMA DENGAN KUNCI — murid dihukum untuk jawaban benar');
      }
    });
  }));
  assert.deepStrictEqual(salah.slice(0, 10), [], salah.length + ' masalah pilihan: ' + salah.slice(0, 10).join(' | '));
});

test('setiap stem punya rumpang yang harus diisi', () => {
  const tanpa = [];
  bank.forEach((b) => b.butir.forEach((t) => {
    const s = String(t.stem || '');
    if (!/_{2,}|＿{2,}|\{\s*\}|（\s*）|\(\s*\)/.test(s)) tanpa.push(b.berkas + '#' + t.id);
  }));
  assert.deepStrictEqual(tanpa.slice(0, 10), [], tanpa.length + ' stem tanpa rumpang: ' + tanpa.slice(0, 10).join(', '));
});

test('stem dan pilihan benar-benar beraksara Jepang, bukan romaji', () => {
  const bukan = [];
  bank.forEach((b) => b.butir.forEach((t) => {
    if (!JP_SCRIPT.test(String(t.stemKana || ''))) bukan.push(b.berkas + '#' + t.id + ':stemKana');
    (t.options || []).forEach((o, j) => {
      if (!JP_SCRIPT.test(String(o))) bukan.push(b.berkas + '#' + t.id + ':options[' + j + ']');
    });
  }));
  assert.deepStrictEqual(bukan.slice(0, 10), [], bukan.length + ' medan tanpa aksara Jepang: ' + bukan.slice(0, 10).join(', '));
});

test('tingkat CEFR dan JLPT berasal dari daftar tertutup', () => {
  const salah = [];
  bank.forEach((b) => b.butir.forEach((t) => {
    if (CEFR.indexOf(t.cefr) < 0) salah.push(b.berkas + '#' + t.id + ': cefr "' + t.cefr + '"');
    if (JLPT.indexOf(t.jlpt) < 0) salah.push(b.berkas + '#' + t.id + ': jlpt "' + t.jlpt + '"');
  }));
  assert.deepStrictEqual(salah.slice(0, 10), [], salah.join(' | '));
});

test('setiap family butir dikenal graf keluarga Jepang', () => {
  const grafBerkas = path.join(__fzRoot, 'docs', 'japanese', 'n5-a1-family-graph.json');
  assert.ok(fs.existsSync(grafBerkas), 'graf keluarga Jepang tidak ada');
  const graf = JSON.parse(fs.readFileSync(grafBerkas, 'utf8')).families || {};
  const asing = [];
  bank.forEach((b) => b.butir.forEach((t) => {
    if (!Object.prototype.hasOwnProperty.call(graf, t.family)) {
      asing.push(b.berkas + '#' + t.id + ': family "' + t.family + '" tidak ada di graf');
    }
  }));
  assert.deepStrictEqual(asing.slice(0, 10), [], asing.length + ' family asing: ' + asing.slice(0, 10).join(' | '));
});

test('id butir unik di seluruh bank', () => {
  const lihat = new Map();
  const kembar = [];
  bank.forEach((b) => b.butir.forEach((t) => {
    if (lihat.has(t.id)) kembar.push(t.id + ' (' + lihat.get(t.id) + ' & ' + b.berkas + ')');
    else lihat.set(t.id, b.berkas);
  }));
  assert.deepStrictEqual(kembar, [], 'id kembar: ' + kembar.join(', '));
});

test('gerbang ini terdaftar di .github/workflows/quality.yml', () => {
  const wf = fs.readFileSync(path.join(__fzRoot, '.github', 'workflows', 'quality.yml'), 'utf8');
  assert.ok(wf.includes('japanese-content-test.js'), 'gerbang belum terdaftar di quality.yml');
});

const total = pass + failures.length;
if (failures.length) {
  failures.forEach((f) => console.error('FAIL: ' + f));
  console.error('japanese-content-test GAGAL: ' + failures.length + ' assert merah');
  console.log('japanese-content-test: ' + pass + '/' + total + ' assert PASS');
  process.exit(1);
}
console.log('japanese-content-test: ' + pass + '/' + total + ' assert PASS'
  + ' (' + bank.length + ' bank, ' + bank.reduce((n, b) => n + b.butir.length, 0) + ' butir)');
