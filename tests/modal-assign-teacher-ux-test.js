const fs = require('fs');
const path = require('path');
const vm = require('vm');

let pass = 0;
let fail = 0;

function assert(cond, msg) {
  if (cond) {
    pass++;
    console.log('  OK: ' + msg);
  } else {
    fail++;
    console.error('  FAIL: ' + msg);
  }
}

console.log('Memulai modal-assign-teacher-ux-test...');

const shellPath = path.join(__dirname, '..', 'features/teacher/fiezel-teacher-shell.js');
const shellCode = fs.readFileSync(shellPath, 'utf8');

// 1. Static assertions
assert(shellCode.includes('data-testid="tg-assign-comp-code"') && shellCode.includes('type="hidden" name="comp_code"'), 'Kode database comp_code disembunyikan sebagai input hidden (bebas dari kebingungan guru)');
assert(shellCode.includes('data-testid="tg-assign-comp-title"') && shellCode.includes('type="hidden" name="comp_title"'), 'Judul materi comp_title disembunyikan sebagai input hidden');
assert(shellCode.includes('class="tg-topic-summary-card"'), 'Kartu ringkasan materi tg-topic-summary-card terpasang di modal');
assert(shellCode.includes('class="tg-brief-accordion" data-testid="tg-mapel-brief"'), 'Panduan mengajar guru dibungkus accordion collapsible data-testid="tg-mapel-brief"');
assert(shellCode.includes('class="tg-qbank-section" data-testid="tg-mapel-preview"'), 'Bank soal interaktif tg-qbank-section data-testid="tg-mapel-preview" terpasang');
assert(shellCode.includes('data-tg="quick-count" data-count="5"'), 'Tombol pilih 5 soal cepat terpasang');
assert(shellCode.includes('data-tg="quick-count" data-count="10"'), 'Tombol pilih 10 soal ulangan terpasang');
assert(shellCode.includes('data-tg-check="q-select"'), 'Checkbox kurasi butir soal per kartu terpasang');
assert(shellCode.includes('class="tg-correct-pill"'), 'Badge hijau kunci jawaban terpasang');
assert(shellCode.includes('class="tg-q-explanation"'), 'Akordeon pembahasan & miskonsepsi siswa terpasang');

// 2. Runtime assertions using VM sandbox
const storePath = path.join(__dirname, '..', 'features/teacher/fiezel-teacher-store.js');
const storeCode = fs.readFileSync(storePath, 'utf8');

const docMock = {
  createElement() {
    return {
      setAttribute() {},
      appendChild() {},
      style: {},
      addEventListener() {}
    };
  },
  body: { appendChild() {} },
  head: { appendChild() {} }
};

const sandbox = {
  window: {},
  document: docMock,
  localStorage: {
    _data: {},
    getItem(k) { return this._data[k] || null; },
    setItem(k, v) { this._data[k] = String(v); },
    removeItem(k) { delete this._data[k]; }
  },
  sessionStorage: {
    _data: {},
    getItem(k) { return this._data[k] || null; },
    setItem(k, v) { this._data[k] = String(v); }
  },
  console,
  require,
  __dirname: path.join(__dirname, '..', 'features', 'teacher'),
  Date,
  Math,
  String,
  Number,
  Object,
  Array,
  JSON,
  setTimeout,
  clearTimeout
};
sandbox.window = sandbox;
sandbox.self = sandbox;

vm.createContext(sandbox);
vm.runInContext(storeCode, sandbox);
vm.runInContext(shellCode, sandbox);

const Shell = sandbox.FiezelTeacherShell;
assert(!!Shell, 'FiezelTeacherShell terdefinisi di sandbox');
assert(typeof Shell._synthesizeMapelQuestions === 'function', 'Fungsi generator butir mapel tersedia');

// Test question generation across subjects
['MAT', 'IPA', 'ENG', 'IPS', 'INF'].forEach((subj) => {
  const qs = Shell._synthesizeMapelQuestions(subj, 'KOMP-' + subj + '-TEST', 'Uji ' + subj, 5);
  assert(qs.length === 5, 'Mapel ' + subj + ' menghasilkan 5 soal');
  assert(qs.every(q => q.prompt && q.options.length === 4 && typeof q.answer === 'number'), 'Semua soal ' + subj + ' memiliki prompt, 4 opsi, dan kunci jawaban');
});

console.log(`\nHasil: ${pass} assert PASS, ${fail} assert FAIL`);
if (fail > 0) process.exit(1);
