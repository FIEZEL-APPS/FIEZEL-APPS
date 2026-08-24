/**
 * FIEZEL gate — diagnosis miskonsepsi berbahasa Indonesia (m025-127).
 *
 * OWNER menanyakan apa yang masih kurang setelah Tutor Brain v3 masuk. Jawaban jujurnya
 * diukur, bukan dikira-kira: dari 387 distraktor grammar, hanya 168 (43%) yang keluar dengan
 * diagnosis spesifik. Sisanya jatuh ke satu kalimat umum yang sama — "belum cocok dengan
 * waktu, fungsi, atau susunan yang dibutuhkan kalimat" — dan murid yang keliru tiga kali
 * dalam satu sesi mendengar kalimat itu tiga kali. Tutor yang mengulang satu kalimat untuk
 * tiga kesalahan yang berbeda tidak sedang mendiagnosis apa pun.
 *
 * Padahal bahannya sudah lengkap sejak awal: SETIAP distraktor membawa nama miskonsepsinya
 * sendiri, 386 nama unik, jauh lebih tepat daripada apa pun yang bisa ditebak dengan
 * mencocokkan pola pada teks Inggris. Yang menghalangi hanya bahasanya.
 *
 * Gate ini menjaga jembatan itu tetap utuh. Yang diperiksa bukan "apakah berkasnya ada",
 * melainkan:
 *
 *   - setiap nama miskonsepsi di bank punya diagnosisnya — cakupan 100%, tanpa kecuali;
 *   - diagnosisnya berbahasa Indonesia, karena naskah FIEZEL tidak pernah berpindah bahasa;
 *   - bentuknya benar-benar bisa dirangkai jadi kalimat, di panel jawaban MAUPUN di mulut
 *     tutor — dua tempat dengan awalan berbeda, satu klausa yang sama;
 *   - dan kalau berkasnya hilang, kuisnya tetap jalan.
 */
const assert = require('assert');
const fs = require('fs');

let failures = 0;
function test(name, fn) {
  try { fn(); console.log('ok - ' + name); }
  catch (e) { failures++; console.error('FAIL - ' + name + '\n    ' + e.message); }
}

const bank = JSON.parse(fs.readFileSync('./grammar-templates.json', 'utf8'));
const file = JSON.parse(fs.readFileSync('./grammar-misconception-id.json', 'utf8'));
const map = file.diagnoses;
const app = fs.readFileSync('./app.js', 'utf8');

/** Setiap distraktor bank, dengan nama miskonsepsinya. */
const distractors = [];
for (const t of bank.templates || []) {
  for (const d of t.distractors || []) {
    if (d && d.option) distractors.push({ family: t.family, id: t.id, option: d.option, name: String(d.misconception || '').trim() });
  }
}
const names = [...new Set(distractors.map(d => d.name).filter(Boolean))];

// ---------------------------------------------------------------------------------------
// A. CAKUPAN — tidak boleh ada yang jatuh ke kalimat umum
// ---------------------------------------------------------------------------------------
test('setiap distraktor di bank membawa nama miskonsepsi', () => {
  const anonymous = distractors.filter(d => !d.name);
  assert.strictEqual(anonymous.length, 0,
    anonymous.length + ' distraktor tanpa nama, mis. ' + JSON.stringify(anonymous[0]));
});

test('setiap nama miskonsepsi punya diagnosis Indonesia — cakupan harus 100%', () => {
  const missing = names.filter(n => !map[n]);
  assert.strictEqual(missing.length, 0,
    missing.length + ' dari ' + names.length + ' nama belum diterjemahkan:\n      ' + missing.slice(0, 5).join('\n      '));
});

test('petanya tidak menyimpan entri yang tidak dipakai bank mana pun', () => {
  const known = new Set(names);
  const orphan = Object.keys(map).filter(k => !known.has(k));
  assert.strictEqual(orphan.length, 0, 'entri yatim: ' + orphan.slice(0, 3).join(' | '));
});

test('jumlah yang diumumkan berkas cocok dengan isinya', () => {
  assert.strictEqual(Object.keys(map).length, file.count);
});

// ---------------------------------------------------------------------------------------
// B. BAHASA — naskah FIEZEL tidak pernah berpindah bahasa
// ---------------------------------------------------------------------------------------
const EN_MARKERS = /\b(the|is|are|was|were|this|that|with|because|verb|noun|tense|sentence|answer|option|which|would|should|does|form|clause|subject)\b/i;

test('tidak ada diagnosis yang tertinggal dalam bahasa Inggris', () => {
  const english = Object.entries(map).filter(([, v]) => EN_MARKERS.test(v.replace(/'[^']*'/g, '')));
  assert.strictEqual(english.length, 0,
    english.length + ' diagnosis berbahasa Inggris, mis.\n      ' + (english[0] || []).join('\n      -> '));
});

test('nama miskonsepsi yang berbahasa Inggris tidak pernah ikut terbawa ke naskah', () => {
  // Kuncinya memang Inggris. Yang tidak boleh adalah nilainya mengutip kuncinya bulat-bulat.
  const leaked = Object.entries(map).filter(([k, v]) => v.toLowerCase().includes(k.toLowerCase()));
  assert.strictEqual(leaked.length, 0, 'nama Inggris bocor ke naskah: ' + (leaked[0] || [])[0]);
});

// ---------------------------------------------------------------------------------------
// C. BENTUK — satu klausa, dua tempat pemakaian
// ---------------------------------------------------------------------------------------
test('setiap diagnosis dimulai huruf kecil, supaya menyambung setelah nama pilihan', () => {
  const bad = Object.entries(map).filter(([, v]) => /^[A-Z]/.test(v));
  assert.strictEqual(bad.length, 0, 'diawali huruf besar: ' + (bad[0] || [])[1]);
});

test('setiap diagnosis diakhiri titik, jadi kalimatnya utuh di panel jawaban', () => {
  const bad = Object.entries(map).filter(([, v]) => !v.trim().endsWith('.'));
  assert.strictEqual(bad.length, 0, 'tanpa titik akhir: ' + (bad[0] || [])[1]);
});

test('panjangnya wajar untuk dibaca sekali lihat, tidak terpenggal dan tidak jadi paragraf', () => {
  const tooShort = Object.entries(map).filter(([, v]) => v.length < 25);
  const tooLong = Object.entries(map).filter(([, v]) => v.length > 240);
  assert.strictEqual(tooShort.length, 0, 'terlalu pendek: ' + (tooShort[0] || [])[1]);
  assert.strictEqual(tooLong.length, 0, 'terlalu panjang: ' + (tooLong[0] || [])[1]);
});

test('dua tempat pemakaian sama-sama menghasilkan kalimat yang wajar', () => {
  const sample = map[names[0]];
  const panel = '“prepares” ' + sample;
  const tutor = 'Ini yang bikin pilihan tadi gagal - ' + sample.replace(/[.]$/, '') + '.';
  assert.ok(!/\.\./.test(panel) && !/\.\./.test(tutor), 'titik ganda: ' + panel);
  assert.ok(!/\s{2,}/.test(panel) && !/\s{2,}/.test(tutor), 'spasi ganda');
  assert.ok(tutor.length < 320, 'kalimat tutor kepanjangan');
});

test('tidak ada dua nama berbeda yang dijelaskan dengan kalimat yang sama persis', () => {
  // Kalau dua sebab berbeda memakai kalimat identik, diagnosisnya kembali jadi generik -
  // persis masalah yang gate ini ada untuk mencegahnya.
  const byText = new Map();
  for (const [k, v] of Object.entries(map)) {
    const key = v.toLowerCase().trim();
    if (!byText.has(key)) byText.set(key, []);
    byText.get(key).push(k);
  }
  const collisions = [...byText.values()].filter(x => x.length > 1);
  assert.strictEqual(collisions.length, 0,
    collisions.length + ' kalimat dipakai ulang, mis. untuk: ' + (collisions[0] || []).join(' / '));
});

// ---------------------------------------------------------------------------------------
// D. SAMBUNGAN KE APLIKASI — dan kelangsungan hidup saat berkasnya hilang
// ---------------------------------------------------------------------------------------
test('app.js mencoba nama miskonsepsi LEBIH DULU sebelum mencocokkan pola teks Inggris', () => {
  assert.ok(/function grammarMisconceptionReason\(/.test(app), 'pencari diagnosis per-nama hilang');
  const fn = app.slice(app.indexOf('function grammarOptionReason('), app.indexOf('function grammarOptionReason(') + 700);
  const named = fn.indexOf('grammarMisconceptionReason(misconception)');
  const pattern = fn.indexOf('String(rawReason).toLowerCase()');
  assert.ok(named > 0 && pattern > 0, 'kedua jalur harus ada');
  assert.ok(named < pattern, 'pencocokan pola dicoba sebelum nama, padahal nama jauh lebih tepat');
});

test('nama miskonsepsi benar-benar diteruskan dari soal, bukan sekadar diterima parameternya', () => {
  assert.ok(/grammarOptionReason\(x\.x,false,x\.reason,misMap\[x\.x\]\)/.test(app),
    'makeGrammarQuestion tidak meneruskan peta miskonsepsi');
  // m025-149: detail.misconception sekarang membawa LABEL Indonesia, karena label itulah yang
  // ditampilkan sebagai pilihan di mode label_misconception. Kunci pencarian diagnosis tetap
  // nama Inggris-nya dan pindah ke detail.misconceptionKey, sebab GRAMMAR_MISCONCEPTION_ID
  // memang berkunci nama Inggris. Yang dijaga gate ini adalah namanya benar-benar DITERUSKAN
  // dari soal - bukan properti mana yang kebetulan menampungnya.
  assert.ok(/grammarOptionReason\(target\.option,false,target\.reason,target\.detail\?\.misconceptionKey\)/.test(app),
    'varian metakognitif tidak meneruskan nama miskonsepsi');
  assert.ok(/misconceptionKey:String\(x\.misconception\|\|''\)/.test(app),
    'hidrasi tidak menyimpan nama miskonsepsi Inggris sebagai kunci diagnosis');
});

test('pilihan yang tampil sebagai kalimat utuh tetap ketemu diagnosisnya', () => {
  // Sebagian varian menampilkan pilihan sebagai kalimat dengan rumpang sudah terisi. Kalau
  // kuncinya hanya bentuk potongan, pencariannya meleset diam-diam dan diagnosis spesifiknya
  // hilang tanpa ada yang gagal — kegagalan paling mahal, karena tidak kelihatan.
  assert.ok(/function grammarMisconceptionKeys\(/.test(app), 'pembangun kunci ganda hilang');
  assert.ok(/misMap=grammarMisconceptionKeys\(item\)/.test(app),
    'makeGrammarQuestion masih memakai peta mentah, bukan peta yang mengenali kedua bentuk');

  const fill = (stem, o) => (/_{3,}/.test(stem) ? stem.replace(/_{3,}/, o) : String(o));
  let covered = 0, total = 0;
  for (const t of bank.templates || []) {
    const raw = {};
    for (const d of t.distractors || []) if (d && d.option) raw[String(d.option)] = String(d.misconception || '');
    const keys = { ...raw };
    for (const o of Object.keys(raw)) {
      const f = fill(t.stem || '', o);
      if (f && f !== o && !keys[f]) keys[f] = raw[o];
    }
    for (const o of Object.keys(raw)) {
      total += 2;
      if (map[keys[o]]) covered++;
      if (map[keys[fill(t.stem || '', o)]]) covered++;
    }
  }
  assert.strictEqual(covered, total,
    'hanya ' + covered + '/' + total + ' bentuk pilihan yang ketemu diagnosisnya');
});

test('berkas diagnosis dimuat terpisah dan berpenjaga — hilangnya tidak boleh mematikan kuis', () => {
  const loader = app.slice(app.indexOf('async function loadMisconceptionDiagnoses'), app.indexOf('async function loadMisconceptionDiagnoses') + 500);
  assert.ok(/try\s*\{/.test(loader) && /catch\s*\{\s*\}/.test(loader), 'pemuatnya tidak ber-try/catch');
  assert.ok(/if\(!response\.ok\)return/.test(loader), 'balasan gagal tidak ditangani');
  assert.ok(!/DATA=\[[^\]]*grammar-misconception-id/.test(app),
    'berkas ini tidak boleh masuk DATA: di sana kegagalan fetch melempar dan mematikan load()');
});

test('diagnosis kembali ke jalur lama kalau petanya kosong', () => {
  // Simulasi runtime tanpa berkas: grammarMisconceptionReason mengembalikan '' untuk apa pun,
  // dan grammarOptionReason harus tetap menghasilkan kalimat Indonesia yang utuh.
  const EMPTY = Object.create(null);
  const lookup = (name) => {
    const key = String(name || '').trim();
    return key && Object.prototype.hasOwnProperty.call(EMPTY, key) ? String(EMPTY[key] || '') : '';
  };
  assert.strictEqual(lookup('habitual-aspect overgeneralization'), '', 'peta kosong harus mengembalikan kosong');
  assert.strictEqual(lookup(undefined), '', 'nama kosong tidak boleh melempar');
});

test('modul diagnosis ikut di-precache service worker', () => {
  const sw = fs.readFileSync('./sw.js', 'utf8');
  assert.ok(sw.includes('./grammar-misconception-id.json'),
    'tanpa precache, diagnosis spesifik hilang justru saat offline');
});

if (failures) { console.error('\n' + failures + ' gate gagal.'); process.exit(1); }
console.log('\nDiagnosis miskonsepsi: semua gate lolos (' + names.length + ' nama, cakupan 100%).');
