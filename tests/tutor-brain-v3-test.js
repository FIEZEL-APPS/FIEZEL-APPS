/**
 * FIEZEL gate — Tutor Brain v3 (m025-118).
 *
 * OWNER: "otakcore adaptive belum sempurna, belum sepenuhnya adaptive terhadap user, belum
 * bisa berinteraksi realtime, belum seperti guru atau tutor sungguhan."
 *
 * Lapisan mengajar bahkan lebih mudah dipalsukan daripada lapisan merencanakan: sebuah fungsi
 * bernama `decideMove` yang selalu mengembalikan 'continue' akan lulus setiap tes yang hanya
 * memeriksa "apakah fungsinya ada". Karena itu gate ini tidak pernah memeriksa keberadaan.
 * Yang diperiksa adalah KEPUTUSANNYA, pada kasus yang jawabannya tidak bisa diperdebatkan
 * oleh guru mana pun:
 *
 *   - dua murid yang sama-sama salah, tetapi salah karena sebab BERBEDA, tidak boleh
 *     menerima tindakan yang sama;
 *   - jawaban benar yang ditebak dalam sedetik tidak boleh terbaca sebagai penguasaan;
 *   - kesalahan PERTAMA tidak boleh dijawab dengan membuka jawaban, betapapun lemah muridnya;
 *   - miskonsepsi yang sama dua kali harus mengubah tindakan, bukan sekadar menambah hitungan;
 *   - setelah mengajar ulang, soal berikutnya harus konsep yang barusan diajarkan;
 *   - murid yang lelah harus dihentikan, bukan dimudahkan;
 *   - dan tidak satu baris pun naskah tutor boleh keluar dalam bahasa Inggris.
 */
const assert = require('assert');
const fs = require('fs');
const T = require('../features/brain/fiezel-tutor-brain.js');

let failures = 0;
function test(name, fn) {
  try { fn(); console.log('ok - ' + name); }
  catch (e) { failures++; console.error('FAIL - ' + name + '\n    ' + e.message); }
}

const NOW = Date.parse('2026-08-23T09:00:00Z');
/** Peta pilihan -> nama miskonsepsi, bentuk yang sama dengan yang dikirim app.js. */
const MAP = {
  'prepares': 'habitual-aspect overgeneralization',
  'has prepared': 'confusing in-progress with completed result',
  'prepare': 'missing subject-verb agreement'
};
function session(opts) { return T.createSession(Object.assign({ now: NOW, baselineMs: 8000 }, opts || {})); }
function answer(s, over) {
  return T.record(s, Object.assign({
    correct: false, chosenOption: 'prepares', optionMisconceptions: MAP,
    skill: 'present_simple_vs_continuous', concept: 'present_simple_vs_continuous',
    ms: 8000, now: NOW
  }, over || {}));
}

// ---------------------------------------------------------------------------------------
// A. DIAGNOSIS — sebabnya, bukan skornya
// ---------------------------------------------------------------------------------------
test('salah pada distraktor berbeda menghasilkan diagnosis berbeda, bukan sama-sama "salah"', () => {
  const a = T.diagnose({ correct: false, chosenOption: 'prepares', optionMisconceptions: MAP, skill: 's' });
  const b = T.diagnose({ correct: false, chosenOption: 'prepare', optionMisconceptions: MAP, skill: 's' });
  assert.notStrictEqual(a.misconception, b.misconception, 'dua sebab berbeda terbaca sama');
  assert.strictEqual(a.misconception, MAP.prepares);
  assert.strictEqual(a.precision, 'misconception');
});

test('soal tanpa peta miskonsepsi tetap terdiagnosis, tetapi mengakui presisinya lebih kasar', () => {
  const d = T.diagnose({ correct: false, chosenOption: 'x', optionMisconceptions: null, skill: 'reading_detail' });
  assert.strictEqual(d.precision, 'skill', 'presisi kasar harus dinyatakan, bukan disembunyikan');
  assert.ok(d.misconception.indexOf('reading_detail') >= 0, 'diagnosis kasar tetap harus menyebut skill');
});

test('benar tetapi tersendat ditandai rapuh — penguasaan dan perhitungan ulang bukan hal yang sama', () => {
  const solid = T.diagnose({ correct: true, timing: 'retrieved', skill: 's' });
  const shaky = T.diagnose({ correct: true, timing: 'struggled', skill: 's' });
  assert.strictEqual(solid.fragile, false);
  assert.strictEqual(shaky.fragile, true);
});

// ---------------------------------------------------------------------------------------
// B. WAKTU JAWAB — relatif terhadap murid itu sendiri
// ---------------------------------------------------------------------------------------
test('jawaban satu detik terbaca menebak, bukan mengingat', () => {
  assert.strictEqual(T.classifyTiming(900, 8000), 'guess');
  assert.strictEqual(T.classifyTiming(1799, 8000), 'guess');
});

test('ambangnya ikut kebiasaan murid: 5 detik cepat bagi pembaca lambat, wajar bagi yang cepat', () => {
  assert.strictEqual(T.classifyTiming(5000, 20000), 'retrieved');
  assert.strictEqual(T.classifyTiming(5000, 6000), 'reasoned');
  assert.strictEqual(T.classifyTiming(30000, 6000), 'struggled');
});

test('baseline memakai median, jadi satu jeda panjang tidak menggeser seluruh sesi', () => {
  assert.strictEqual(T.median([5000, 6000, 7000, 600000]), 6500);
  assert.strictEqual(T.median([]), 0, 'tanpa data tidak boleh mengarang baseline');
});

test('retry bantuan tidak dihitung sebagai jawaban ujian atau baseline waktu baru', () => {
  const s = session();
  answer(s);
  const answered = s.answered;
  const correct = s.correct;
  const timings = s.responseTimes.length;
  const retry = answer(s, { correct: true, chosenOption: 'is preparing', ms: 1000, scored: false });
  assert.strictEqual(retry.scored, false);
  assert.strictEqual(retry.breakthrough, true, 'retry benar tetap harus menyelesaikan miskonsepsi');
  assert.strictEqual(s.answered, answered, 'retry menggelembungkan denominator akurasi');
  assert.strictEqual(s.correct, correct, 'retry menggelembungkan jumlah benar');
  assert.strictEqual(s.responseTimes.length, timings, 'retry menggeser baseline waktu');
});

// ---------------------------------------------------------------------------------------
// C. TANGGA SCAFFOLDING — bantuan paling sedikit dulu
// ---------------------------------------------------------------------------------------
test('kesalahan pertama tidak pernah membuka jawaban, bahkan untuk murid berpenguasaan nol', () => {
  const level = T.scaffoldLevel({ priorMisses: 0, mastery: 0, misconceptionRepeats: 1 });
  assert.strictEqual(level, 'hint', 'percobaan pertama harus berhenti di dorongan');
  assert.notStrictEqual(level, 'tell');
});

test('bantuan naik hanya setelah gagal lagi, dan akhirnya sampai ke jawaban', () => {
  const seq = [0, 1, 2, 3].map(n => T.scaffoldLevel({ priorMisses: n, mastery: 10, misconceptionRepeats: 1 }));
  assert.deepStrictEqual(seq, ['hint', 'worked', 'tell', 'tell']);
  const idx = seq.map(x => T.LADDER.indexOf(x));
  for (let i = 1; i < idx.length; i++) assert.ok(idx[i] >= idx[i - 1], 'bantuan tidak boleh turun');
});

test('murid yang sudah menguasai mulai dari pertanyaan menggiring, bukan dari petunjuk', () => {
  assert.strictEqual(T.scaffoldLevel({ priorMisses: 0, mastery: 80, misconceptionRepeats: 1 }), 'probe');
});

test('miskonsepsi berulang mempercepat tangga — mengulang cara yang sama bukan mengajar', () => {
  const once = T.scaffoldLevel({ priorMisses: 1, mastery: 10, misconceptionRepeats: 1 });
  const twice = T.scaffoldLevel({ priorMisses: 1, mastery: 10, misconceptionRepeats: 2 });
  assert.ok(T.LADDER.indexOf(twice) > T.LADDER.indexOf(once), 'pengulangan harus menaikkan bantuan');
});

test('tangga dihitung dari KEGAGALAN, bukan dari berapa kali konsepnya keluar', () => {
  const s = session();
  // Satu lesson grammar berisi belasan soal dengan konsep yang sama. Lima jawaban benar tidak
  // boleh membuat kekeliruan pertama diperlakukan seperti kekeliruan keenam.
  for (let i = 0; i < 5; i++) answer(s, { correct: true, chosenOption: 'is preparing' });
  const d = answer(s);
  assert.strictEqual(d.priorMisses, 0, 'paparan terhitung sebagai kegagalan');
  assert.strictEqual(T.scaffoldLevel({ priorMisses: d.priorMisses, mastery: 0, misconceptionRepeats: d.repeats }), 'hint');
});

test('hitungan kegagalan nol lagi setelah konsepnya berhasil dilewati', () => {
  const s = session();
  answer(s); answer(s);
  assert.strictEqual(answer(s, { correct: true, chosenOption: 'is preparing' }).priorMisses, 0);
  assert.strictEqual(answer(s).priorMisses, 0, 'episode baru harus mulai dari kesalahan pertama lagi');
});

test('kegagalan beruntun pada konsep yang sama menaikkan bantuan satu per satu', () => {
  const s = session();
  const rungs = [0, 1, 2].map(() => {
    const d = answer(s);
    return T.scaffoldLevel({ priorMisses: d.priorMisses, mastery: 0, misconceptionRepeats: 0 });
  });
  assert.deepStrictEqual(rungs, ['hint', 'worked', 'tell']);
});

// ---------------------------------------------------------------------------------------
// D. KEPUTUSAN PER-JAWABAN — inti "realtime"-nya
// ---------------------------------------------------------------------------------------
test('miskonsepsi yang sama dua kali mengubah tindakan menjadi mengajar ulang', () => {
  const s = session();
  const first = T.decideMove(s, answer(s), { remaining: 8 });
  assert.strictEqual(first.move, 'hint', 'salah pertama cukup dengan pijakan');
  const second = T.decideMove(s, answer(s), { remaining: 7 });
  assert.strictEqual(second.move, 'reteach');
  assert.strictEqual(second.reason, 'persistent_misconception');
  assert.strictEqual(second.misconception, MAP.prepares, 'yang diajar ulang harus disebut namanya');
});

test('salah karena sebab yang berbeda-beda tidak dianggap pola — tetapi tiga beruntun tetap dihentikan', () => {
  const s = session();
  const opts = ['prepares', 'has prepared', 'prepare'];
  const moves = opts.map((chosenOption, i) =>
    T.decideMove(s, answer(s, { chosenOption }), { remaining: 8 - i }).move);
  assert.deepStrictEqual(moves.slice(0, 2), ['hint', 'hint'], 'sebab berbeda belum jadi pola');
  assert.strictEqual(moves[2], 'reteach', 'tiga salah beruntun harus berhenti menguji');
});

test('menjawab benar setelah pernah keliru pada konsep itu terbaca sebagai terobosan', () => {
  const s = session();
  answer(s);
  const win = answer(s, { correct: true, chosenOption: 'is preparing' });
  assert.strictEqual(win.breakthrough, true, 'terobosan tidak terdeteksi');
  assert.strictEqual(T.decideMove(s, win, { remaining: 5 }).move, 'celebrate');
});

test('terobosan dicocokkan lewat konsep, bukan lewat teks nama miskonsepsi', () => {
  const s = session();
  answer(s);
  const other = answer(s, { correct: true, chosenOption: 'ok', concept: 'articles', skill: 'articles' });
  assert.strictEqual(other.breakthrough, false, 'benar di konsep lain bukan terobosan konsep ini');
});

test('benar tetapi lambat dimantapkan dulu, tidak langsung dinaikkan', () => {
  const s = session();
  const slow = answer(s, { correct: true, chosenOption: 'is preparing', ms: 30000 });
  assert.strictEqual(slow.timing, 'struggled');
  assert.strictEqual(T.decideMove(s, slow, { remaining: 5 }).move, 'consolidate');
});

test('beruntun benar dan cepat dinaikkan — soal di bawah kemampuan membuang giliran', () => {
  // Gate ini DIPERBARUI mengikuti temuan council (gpt_5_6_sol §4.2): baseline waktu jawab
  // kini median BERGULIR, bukan beku di sampel pertama. Karena itu "cepat" harus dibuktikan
  // relatif terhadap kebiasaan yang sudah terbentuk di sesi ini - tiga jawaban wajar dulu,
  // baru rentetan cepat; murid yang SELALU 3 detik memang bukan murid yang sedang mengingat.
  const s = session();
  for (let i = 0; i < 3; i++) answer(s, { correct: true, chosenOption: 'is preparing', ms: 8000 });
  let d;
  for (let i = 0; i < 4; i++) d = answer(s, { correct: true, chosenOption: 'is preparing', ms: 2000 });
  assert.strictEqual(d.timing, 'retrieved');
  assert.strictEqual(T.decideMove(s, d, { remaining: 5 }).move, 'stretch');
});

test('empat tebakan benar TIDAK menaikkan kesulitan — tebakan bukan penguasaan', () => {
  // Temuan council terverifikasi (gpt_5_6_sol §4.2): decideMove lama menganggap `retrieved`
  // ATAU `guess` sebagai alasan stretch setelah streak empat, jadi empat tebakan benar
  // (peluang seperempat per soal) bisa menaikkan kesulitan. Gate lama ikut mengizinkannya.
  // Sekarang: tebakan cepat beruntun terus berjalan sambil polanya dinamai, bukan di-stretch.
  const s = session();
  let d;
  for (let i = 0; i < 4; i++) d = answer(s, { correct: true, chosenOption: 'is preparing', ms: 1000 });
  assert.strictEqual(d.timing, 'guess');
  const move = T.decideMove(s, d, { remaining: 5 });
  assert.strictEqual(move.move, 'continue', 'tebakan beruntun tidak boleh menaikkan kesulitan');
  assert.strictEqual(move.reason, 'streak_but_guessing');
});

test('baseline waktu jawab bergulir mengikuti sesi, tidak beku di sampel pertama', () => {
  // Temuan council (gpt_5_6_sol §4.2): baseline lama diisi sekali lalu tidak pernah
  // diperbarui karena `if (!s.baselineMs)`. Murid yang ternyata lambat di sesi ini harus
  // membuat baselinenya ikut melambat - sehingga 9 detik terbaca CEPAT baginya, bukan wajar.
  const s = session(); // seed 8000 dari sesi lalu
  for (let i = 0; i < 3; i++) answer(s, { correct: true, chosenOption: 'is preparing', ms: 20000 });
  assert.strictEqual(s.baselineMs, 20000, 'baseline tidak mengikuti median sesi berjalan');
  const d = answer(s, { correct: true, chosenOption: 'is preparing', ms: 9000 });
  assert.strictEqual(d.timing, 'retrieved', 'baseline beku membuat 9 detik terbaca wajar, padahal muridnya lambat');
});

test('murid lelah dihentikan, bukan dimudahkan — dan itu mengalahkan tindakan lain', () => {
  const s = session();
  for (let i = 0; i < 6; i++) answer(s, { correct: true, chosenOption: 'is preparing' });
  const d = answer(s);
  const move = T.decideMove(s, d, { remaining: 8, fatigue: 'fatigued' });
  assert.strictEqual(move.move, 'breathe');
  assert.strictEqual(move.urgency, 'high');
});

test('lelah di awal sesi belum menghentikan apa pun — dua jawaban bukan bukti kelelahan', () => {
  const s = session();
  const d = answer(s, { correct: true, chosenOption: 'is preparing' });
  assert.notStrictEqual(T.decideMove(s, d, { remaining: 8, fatigue: 'fatigued' }).move, 'breathe');
});

test('soal habis ditutup, tidak dibiarkan menggantung', () => {
  const s = session();
  const d = answer(s, { correct: true, chosenOption: 'is preparing' });
  assert.strictEqual(T.decideMove(s, d, { remaining: 0 }).move, 'wrapup');
});

test('nama miskonsepsi yang sama di konsep berbeda tidak saling menimpa', () => {
  // Temuan council (gpt_5_6_sol §4.1): kunci state dulu nama-saja, jadi miskonsepsi bernama
  // sama pada dua konsep saling menimpa dan salah satu kali di tiap konsep sudah terbaca
  // "dua kali". Kuncinya kini pasangan konsep::miskonsepsi.
  const s = session();
  answer(s, { concept: 'articles', skill: 'articles' });
  const d2 = answer(s);
  assert.strictEqual(d2.repeats, 1, 'hitungan dari konsep lain bocor ke konsep ini');
  assert.strictEqual(T.decideMove(s, d2, { remaining: 8 }).move, 'hint', 'satu kali per konsep belum pola');
  // Benar di satu konsep hanya menyelesaikan pasangan konsep itu, bukan semua yang senama.
  const win = answer(s, { correct: true, chosenOption: 'is preparing', concept: 'articles', skill: 'articles' });
  assert.strictEqual(win.breakthrough, true);
  const d3 = answer(s);
  assert.strictEqual(d3.repeats, 2, 'hitungan konsep ini ikut terhapus oleh terobosan konsep lain');
});

test('miskonsepsi persisten dari ledger langsung terdeteksi pada kemunculan pertama sesi ini', () => {
  // Perbaikan (5): createSession menerima options.priorMisconceptions dari ledger persisten
  // dan men-seed hitungan 1 - guru tidak melupakan kekeliruan minggu lalu hanya karena hari
  // berganti. Kemunculan pertama di sesi ini adalah bukti KEDUA, langsung persisten.
  const s = T.createSession({
    now: NOW, baselineMs: 8000,
    priorMisconceptions: [{ concept: 'present_simple_vs_continuous', misconception: MAP.prepares }]
  });
  const d = answer(s);
  assert.strictEqual(d.repeats, 2, 'seed dari ledger tidak terhitung');
  const move = T.decideMove(s, d, { remaining: 8 });
  assert.strictEqual(move.move, 'reteach');
  assert.strictEqual(move.reason, 'persistent_misconception');
  assert.strictEqual(move.misconception, MAP.prepares);
});

// ---------------------------------------------------------------------------------------
// E. PEMILIHAN SOAL HIDUP — bukan kolam yang dikunci di awal
// ---------------------------------------------------------------------------------------
const POOL = [
  { id: 'a', concept: 'present_simple_vs_continuous', difficulty: 2 },
  { id: 'b', concept: 'articles', difficulty: 2 },
  { id: 'c', concept: 'conditionals', difficulty: 6 }
];

test('setelah mengajar ulang, soal berikutnya adalah konsep yang barusan diajarkan', () => {
  const s = session();
  const picked = T.selectNext(POOL, s, { forceConcept: 'present_simple_vs_continuous' });
  assert.strictEqual(picked.id, 'a', 'mengajar lalu menguji hal lain membuang pengajarannya');
});

test('konsep yang baru saja dikuasai dihindari — dua soal beruntun membuang giliran', () => {
  const s = session();
  const picked = T.selectNext(POOL, s, { avoidConcept: 'present_simple_vs_continuous' });
  assert.notStrictEqual(picked.id, 'a');
});

test('soal yang terlalu sulit dihukum lebih keras daripada yang terlalu mudah', () => {
  const s = session();
  const predict = item => (item.difficulty >= 6 ? 0.2 : 0.95);
  const picked = T.selectNext(POOL, s, { predict, targetSuccess: 0.8 });
  assert.notStrictEqual(picked.id, 'c', 'frustrasi lebih mahal daripada bosan');
});

test('konsep yang sudah sering keluar turun peringkat, jadi sesi tidak terjebak di satu materi', () => {
  const s = session();
  s.attemptsOnConcept = { present_simple_vs_continuous: 5 };
  const picked = T.selectNext(POOL, s, {});
  assert.notStrictEqual(picked.id, 'a');
});

test('target keberhasilan bawaan tetap delapan puluh persen', () => {
  const s = session();
  const predict = item => item.id === 'a' ? 0.6 : item.id === 'b' ? 0.8 : 0.95;
  assert.strictEqual(T.selectNext(POOL, s, { predict }).id, 'b');
});

test('kolam kosong mengembalikan null, tidak mengarang soal', () => {
  assert.strictEqual(T.selectNext([], session(), {}), null);
  assert.strictEqual(T.selectNext(null, session(), {}), null);
});

// ---------------------------------------------------------------------------------------
// F. NASKAH TUTOR — spesifik, tidak menyodorkan jawaban, dan berbahasa Indonesia
// ---------------------------------------------------------------------------------------
const EN_ONLY = /\b(the|is|are|was|were|verb|tense|sentence|answer|because|which|should|would)\b/i;
function allText(turn) { return [turn.say, turn.ask].join(' ').trim(); }

test('naskah tidak membuka jawaban sebelum tangga sampai di tell', () => {
  ['probe', 'hint', 'worked'].forEach(level => {
    const turn = T.composeTurn({ move: 'hint', scaffold: level, whyFails: 'belum cocok dengan konteks', explanation: {} });
    assert.strictEqual(turn.reveal, false, 'jawaban terbuka terlalu cepat di tangga ' + level);
  });
  const told = T.composeTurn({ move: 'hint', scaffold: 'tell', whyFails: 'belum cocok', explanation: { whyCorrect: 'Karena penanda waktunya sekarang.' } });
  assert.strictEqual(told.reveal, true, 'di tangga terakhir jawaban harus benar-benar dibuka');
});

test('naskah menyebut kesalahannya, bukan sekadar "belum tepat"', () => {
  const turn = T.composeTurn({ move: 'hint', scaffold: 'hint', whyFails: 'menganggap penanda waktu sebagai hiasan', explanation: {} });
  assert.ok(turn.say.indexOf('penanda waktu') >= 0, 'diagnosis spesifik hilang dari naskah');
});

test('jawaban terlalu cepat ditegur soal caranya, bukan soal pilihannya', () => {
  const turn = T.composeTurn({ move: 'hint', scaffold: 'hint', timing: 'guess', whyFails: 'apa pun', explanation: {} });
  assert.ok(/baca ulang/i.test(turn.say), 'menebak harus dijawab dengan mengubah caranya');
});

test('pujian mengarah ke yang DILAKUKAN, tidak pernah ke orangnya', () => {
  const praise = ['celebrate', 'stretch'].map(move => T.composeTurn({ move, scaffold: 'hint', explanation: {} }).say).join(' ');
  assert.ok(!/kamu (pintar|hebat|jenius|cerdas)/i.test(praise), 'memuji orangnya membuat kesalahan berikutnya terasa kehilangan identitas');
});

test('ajakan berhenti menyebutnya capek, bukan tidak mampu', () => {
  const turn = T.composeTurn({ move: 'breathe', scaffold: 'hint', explanation: {} });
  assert.ok(/capek/i.test(turn.say));
  assert.ok(!/tidak bisa\.|bodoh|menyerah/i.test(turn.say.replace(/bukan tanda kamu tidak bisa/i, '')));
});

test('tidak satu pun naskah tutor keluar dalam bahasa Inggris', () => {
  const moves = ['hint', 'reteach', 'celebrate', 'consolidate', 'stretch', 'breathe', 'wrapup'];
  moves.forEach(move => T.LADDER.forEach(scaffold => {
    const text = allText(T.composeTurn({ move, scaffold, whyFails: 'belum cocok dengan konteks kalimat', explanation: {} }));
    assert.ok(!EN_ONLY.test(text), 'naskah berbahasa Inggris pada ' + move + '/' + scaffold + ': ' + text);
  }));
});

// Bahan penjelasan yang dipakai gate rotasi "jangan ulangi yang gagal" di bawah ini.
const EXPLAIN_INPUT = {
  move: 'hint', scaffold: 'hint', concept: 'present_simple_vs_continuous',
  conceptLabel: 'bentuk sedang berlangsung',
  whyFails: 'menganggap penanda waktu sebagai hiasan',
  explanation: { rule: 'Kejadian yang sedang berlangsung memakai bentuk sedang', memoryCue: 'Lihat penanda waktunya dulu' },
  chosenOption: 'prepares', correctAnswer: 'is preparing'
};

test('penjelasan yang gagal tidak pernah diulang dengan frasa yang sama', () => {
  // Temuan council (gpt_5_6_sol §4.3): `explanationsUsed` dulu dibuat tetapi tidak pernah
  // dibaca atau diperbarui - janji "tidak mengulang penjelasan yang gagal" kosong. Sekarang:
  // record() mencatat kunci konsep::tangga yang GAGAL (murid tetap salah setelahnya), dan
  // composeTurn(input, session) memilih variasi frasa berbeda setiap kali.
  const s = session();
  answer(s);
  const turn1 = T.composeTurn(EXPLAIN_INPUT, s);
  answer(s); // masih salah -> penjelasan turn1 resmi GAGAL
  assert.strictEqual(s.explanationsUsed['present_simple_vs_continuous::hint'], 1,
    'kegagalan penjelasan tidak tercatat');
  const turn2 = T.composeTurn(EXPLAIN_INPUT, s);
  assert.notStrictEqual(turn2.ask, turn1.ask, 'penjelasan yang gagal diulang persis sama');
  answer(s); // salah lagi -> turn2 juga gagal, frasa harus berputar lagi
  const turn3 = T.composeTurn(EXPLAIN_INPUT, s);
  assert.notStrictEqual(turn3.ask, turn2.ask, 'rotasi berhenti setelah satu variasi');
  answer(s); // gagal ketiga -> giliran bentuk kontras jawaban murid vs bentuk benar
  const turn4 = T.composeTurn(EXPLAIN_INPUT, s);
  assert.ok(turn4.ask.indexOf('jawabanmu "prepares"') >= 0 && turn4.ask.indexOf('is preparing') >= 0,
    'bentuk kontras jawabanmu-vs-bentuk-benar tidak pernah muncul: ' + turn4.ask);
});

test('penjelasan yang BERHASIL tidak dicap gagal', () => {
  const s = session();
  answer(s);
  T.composeTurn(EXPLAIN_INPUT, s);
  answer(s, { correct: true, chosenOption: 'is preparing' });
  assert.ok(!s.explanationsUsed['present_simple_vs_continuous::hint'],
    'penjelasan yang bekerja ikut masuk daftar hindaran');
});

test('level worked benar-benar berisi contoh yang dikerjakan, bukan sekadar mengutip aturan', () => {
  // Temuan council (gpt_5_6_sol §4.4): dulu `worked` berkata "aku kerjakan satu yang mirip"
  // tetapi hanya menyodorkan ex.rule - label tidak cocok dengan isinya. Sekarang langkahnya
  // disusun sungguhan: aturan, kalimat contoh, lalu bentuk yang benar - dan payload-nya
  // berbeda dari `tell`.
  const input = {
    move: 'hint', scaffold: 'worked', whyFails: 'belum cocok dengan konteks kalimat',
    explanation: { rule: 'Kejadian yang sedang berlangsung memakai bentuk sedang', whyCorrect: 'Penanda waktunya menunjuk kejadian sekarang' },
    sentence: 'Look! She ___ dinner', correctAnswer: 'is preparing'
  };
  const worked = T.composeTurn(input);
  const told = T.composeTurn(Object.assign({}, input, { scaffold: 'tell' }));
  ['Langkah 1', 'Langkah 2', 'Langkah 3'].forEach(step =>
    assert.ok(worked.ask.indexOf(step) >= 0, step + ' hilang dari contoh yang dikerjakan: ' + worked.ask));
  assert.ok(worked.ask.indexOf('Look! She ___ dinner') >= 0, 'kalimat contohnya tidak ikut dikerjakan');
  assert.ok(worked.ask.indexOf('is preparing') >= 0, 'langkah terakhir tidak menunjukkan bentuk yang keluar');
  assert.notStrictEqual(worked.ask, told.ask, 'worked dan tell menyodorkan payload yang sama');
  assert.strictEqual(worked.reveal, false, 'worked bukan tangga pembuka jawaban');
});

test('naskah tidak pernah keluar dengan titik ganda', () => {
  const turn = T.composeTurn({
    move: 'hint', scaffold: 'hint', whyFails: 'belum cocok dengan konteks kalimat.',
    explanation: { memoryCue: 'Ingat fokus tenses.' }
  });
  assert.ok(!/\.\./.test(allText(turn)), 'titik ganda: ' + allText(turn));
});

// ---------------------------------------------------------------------------------------
// G. RINGKASAN — bahasa guru, bukan bahasa penilai
// ---------------------------------------------------------------------------------------
test('ringkasan melaporkan apa yang BERUBAH, bukan hanya berapa yang benar', () => {
  const s = session();
  answer(s);
  answer(s, { correct: true, chosenOption: 'is preparing' });
  const out = T.summarize(s);
  assert.deepStrictEqual(out.resolvedMisconceptions, [MAP.prepares]);
  assert.ok(out.headline.indexOf('lewati') >= 0, 'ringkasan harus bisa dibacakan apa adanya: ' + out.headline);
  assert.strictEqual(out.answered, 2);
});

test('pola yang masih mengganjal disebut sebagai sasaran berikutnya, bukan sebagai kegagalan', () => {
  const s = session();
  answer(s); answer(s);
  const out = T.summarize(s);
  assert.deepStrictEqual(out.persistentMisconceptions, [MAP.prepares]);
  assert.ok(/sesi berikutnya/i.test(out.headline), out.headline);
});

test('sesi kosong tidak mengarang akurasi', () => {
  const out = T.summarize(session());
  assert.strictEqual(out.accuracy, null);
  assert.ok(/belum ada jawaban/i.test(out.headline));
});

// ---------------------------------------------------------------------------------------
// H. BATAS MODUL — murni, dan tidak mematikan kuis kalau hilang
// ---------------------------------------------------------------------------------------
test('modul tetap murni: tanpa DOM, tanpa jaringan, tanpa jam sendiri', () => {
  const src = fs.readFileSync('./features/brain/fiezel-tutor-brain.js', 'utf8');
  [/\bdocument\./, /\blocalStorage\b/, /\bfetch\s*\(/, /\bDate\.now\s*\(/, /\bnew Date\b/].forEach(re => {
    assert.ok(!re.test(src), 'modul menyentuh dunia luar: ' + re);
  });
});

test('app.js memakai lapisan tutor lewat penjaga, bukan memanggilnya langsung', () => {
  const app = fs.readFileSync('./app.js', 'utf8');
  assert.ok(/function tutorAvailable\(\)/.test(app), 'penjaga ketersediaan hilang');
  ['tutorPick', 'tutorObserve', 'tutorCompose', 'tutorSummary'].forEach(fn => {
    assert.ok(new RegExp('function ' + fn + '\\b').test(app), 'jembatan ' + fn + ' hilang');
  });
  assert.ok(/self\.FiezelTutorBrain/.test(app), 'app.js tidak menyentuh modul tutor sama sekali');
});

test('app.js tidak pernah menyuapkan penjelasan mentah bank soal ke naskah tutor', () => {
  const app = fs.readFileSync('./app.js', 'utf8');
  assert.ok(!/explanation:\s*q\?\.source/.test(app), 'penjelasan berbahasa Inggris dari bank soal bocor ke tutor');
  assert.ok(/function tutorIndonesian\(/.test(app), 'penjaga bahasa naskah tutor hilang');
  assert.ok(/function tutorWhyFails\(/.test(app), 'penyaring alasan per-pilihan hilang');
  assert.ok(/priorMisses:Number\(diagnosis\.priorMisses/.test(app),
    'tangga bantuan disuapi jumlah paparan, bukan jumlah kegagalan');
});

test('modul tutor ikut dimuat halaman dan ikut di-precache service worker', () => {
  const html = fs.readFileSync('./index.html', 'utf8');
  const sw = fs.readFileSync('./sw.js', 'utf8');
  assert.ok(html.indexOf('features/brain/fiezel-tutor-brain.js') >= 0, 'index.html tidak memuat modul tutor');
  assert.ok(sw.indexOf('features/brain/fiezel-tutor-brain.js') >= 0, 'sw.js tidak mem-precache modul tutor');
  // Dicocokkan ke TAG-nya, bukan ke teks 'app.js' yang juga muncul di komentar penjelasan.
  const app = html.indexOf('src="./app.js"'), tutor = html.indexOf('src="./features/brain/fiezel-tutor-brain.js"');
  assert.ok(app > 0 && tutor > 0, 'tag skrip tidak ditemukan di index.html');
  assert.ok(tutor < app, 'modul tutor harus dimuat sebelum app.js');
});

// ---------------------------------------------------------------------------------------
// I. FASE 2 — AFEK: empat keadaan, empat tindakan berbeda, dan keselamatan tetap menang
// ---------------------------------------------------------------------------------------
test('empat keadaan afek menghasilkan empat intervensi BERBEDA, netral tidak mengubah apa pun', () => {
  // Kontrak Fase 2: frustrated->breathe, bored->stretch, gaming->continue+suggestModeSwitch,
  // fatigued->wrapup. Sebuah decideMove yang menjawab semuanya dengan 'continue' akan lulus
  // tes keberadaan - karena itu yang diuji adalah PERBEDAAN keputusannya.
  const s = session();
  const d = answer(s, { correct: true, chosenOption: 'is preparing' });
  const mk = state => T.decideMove(s, d, { remaining: 8, affect: { state } });
  const frustrated = mk('frustrated'), bored = mk('bored'), gaming = mk('gaming'), fatigued = mk('fatigued');
  assert.strictEqual(frustrated.move, 'breathe');
  assert.strictEqual(frustrated.reason, 'affect_frustrated');
  assert.strictEqual(bored.move, 'stretch');
  assert.strictEqual(bored.reason, 'affect_bored');
  assert.strictEqual(gaming.move, 'continue');
  assert.strictEqual(gaming.reason, 'affect_gaming');
  assert.strictEqual(gaming.suggestModeSwitch, true, 'gaming harus menyarankan ganti mode soal');
  assert.strictEqual(fatigued.move, 'wrapup');
  assert.strictEqual(fatigued.reason, 'affect_fatigued');
  const distinct = new Set([frustrated, bored, gaming, fatigued].map(m => m.move + ':' + (m.suggestModeSwitch === true)));
  assert.strictEqual(distinct.size, 4, 'empat keadaan harus menghasilkan empat intervensi berbeda');
  // Netral dan absen identik dengan perilaku lama - tanpa flag apa pun.
  const neutral = mk('neutral'), absent = T.decideMove(s, d, { remaining: 8 });
  assert.deepStrictEqual(neutral, absent, 'neutral harus identik dengan tanpa affect');
  assert.strictEqual(neutral.move, 'continue');
  assert.strictEqual(neutral.reason, 'on_track');
  assert.ok(!('suggestModeSwitch' in neutral), 'flag gaming bocor ke keadaan netral');
});

test('afek fatigued hanya menutup sesi bila sisa soal masih panjang (remaining>2)', () => {
  const s = session();
  const d = answer(s, { correct: true, chosenOption: 'is preparing' });
  assert.strictEqual(T.decideMove(s, d, { remaining: 3, affect: { state: 'fatigued' } }).move, 'wrapup');
  const short = T.decideMove(s, d, { remaining: 2, affect: { state: 'fatigued' } });
  assert.notStrictEqual(short.move, 'wrapup', 'dua soal terakhir lebih baik diselesaikan daripada dipotong');
  assert.strictEqual(short.reason, 'on_track', 'sisa pendek harus jatuh ke perilaku lama tanpa perubahan');
});

test('aturan keselamatan tetap menang atas afek: miskonsepsi persisten, rentetan salah, lelah kognitif', () => {
  // Murid yang bosan TAPI mengulang miskonsepsi yang sama tetap diajar ulang - mood tidak
  // boleh membatalkan keselamatan. Ketiga aturan lama diuji satu per satu melawan afek.
  const s1 = session();
  answer(s1);
  const d1 = answer(s1);
  const m1 = T.decideMove(s1, d1, { remaining: 8, affect: { state: 'bored' } });
  assert.strictEqual(m1.move, 'reteach');
  assert.strictEqual(m1.reason, 'persistent_misconception');
  const s2 = session();
  const opts = ['prepares', 'has prepared', 'prepare'];
  let d2; opts.forEach(chosenOption => { d2 = answer(s2, { chosenOption }); });
  const m2 = T.decideMove(s2, d2, { remaining: 8, affect: { state: 'gaming' } });
  assert.strictEqual(m2.move, 'reteach');
  assert.strictEqual(m2.reason, 'miss_streak');
  assert.ok(!m2.suggestModeSwitch, 'flag gaming tidak boleh menempel pada keputusan keselamatan');
  const s3 = session();
  for (let i = 0; i < 6; i++) answer(s3, { correct: true, chosenOption: 'is preparing' });
  const d3 = answer(s3);
  const m3 = T.decideMove(s3, d3, { remaining: 8, fatigue: 'fatigued', affect: { state: 'bored' } });
  assert.strictEqual(m3.move, 'breathe');
  assert.strictEqual(m3.reason, 'cognitive_load_high');
});

// ---------------------------------------------------------------------------------------
// J. FASE 2 — SCAFFOLD FADING: tangga bukan eskalator satu arah
// ---------------------------------------------------------------------------------------
test('dua keberhasilan mandiri berturut menurunkan titik mulai tangga satu anak tangga', () => {
  // Temuan Opus §3.4: tangga lama hanya bisa naik. Murid mastery rendah selamanya mulai dari
  // `hint` betapapun ia sudah membuktikan diri. Dua sukses mandiri (dinilai, tanpa bantuan
  // tutor sebelumnya) kini menurunkan titik mulai ke `probe` - dan tidak pernah lebih rendah.
  const s = session();
  let d = answer(s, { correct: true, chosenOption: 'is preparing' });
  assert.strictEqual(d.fadeCredit, 0, 'satu sukses belum boleh memudarkan bantuan');
  d = answer(s, { correct: true, chosenOption: 'is preparing' });
  assert.strictEqual(d.fadeCredit, 1, 'dua sukses mandiri berturut harus memberi kredit fading');
  assert.strictEqual(d.scaffoldRationale, 'scaffold_faded', 'rationale scaffold_faded hilang');
  assert.strictEqual(
    T.scaffoldLevel({ priorMisses: 0, mastery: 10, misconceptionRepeats: 0, fadeCredit: d.fadeCredit }),
    'probe', 'titik mulai murid mastery rendah harus turun dari hint ke probe');
  // Tidak pernah di bawah probe: kredit menumpuk tidak menghasilkan "tanpa bantuan sama sekali".
  assert.strictEqual(
    T.scaffoldLevel({ priorMisses: 0, mastery: 80, misconceptionRepeats: 0, fadeCredit: 3 }),
    'probe', 'fading tidak boleh turun melewati probe');
});

test('kegagalan menghapus kredit fading — kepercayaan dibangun ulang dari nol', () => {
  const s = session();
  answer(s, { correct: true, chosenOption: 'is preparing' });
  assert.strictEqual(answer(s, { correct: true, chosenOption: 'is preparing' }).fadeCredit, 1);
  const miss = answer(s);
  assert.strictEqual(miss.fadeCredit, 0, 'kegagalan harus menghapus kredit, bukan menyisakannya');
  assert.ok(!miss.scaffoldRationale, 'rationale fading tidak boleh menempel setelah kredit hangus');
  assert.strictEqual(
    T.scaffoldLevel({ priorMisses: 0, mastery: 10, misconceptionRepeats: 0, fadeCredit: miss.fadeCredit }),
    'hint', 'titik mulai harus kembali ke semula setelah gagal');
  // Dan satu sukses SETELAH gagal belum cukup - butuh dua bukti baru.
  assert.strictEqual(answer(s, { correct: true, chosenOption: 'is preparing' }).fadeCredit, 0);
});

test('sukses yang tidak mandiri tidak dihitung: retry tanpa nilai dan jawaban tepat setelah bantuan', () => {
  // Retry (scored:false) membuktikan bantuannya bekerja, bukan muridnya mandiri; dan sukses
  // persis setelah composeTurn memberi penjelasan pada konsep itu adalah sukses berdua.
  const s1 = session();
  answer(s1, { correct: true, chosenOption: 'is preparing', scored: false });
  const d1 = answer(s1, { correct: true, chosenOption: 'is preparing', scored: false });
  assert.strictEqual(d1.fadeCredit, 0, 'retry tanpa nilai ikut terhitung sebagai bukti mandiri');
  const s2 = session();
  answer(s2);
  T.composeTurn(EXPLAIN_INPUT, s2); // tutor baru saja membantu konsep ini
  answer(s2, { correct: true, chosenOption: 'is preparing' }); // sukses berbantuan
  const d2 = answer(s2, { correct: true, chosenOption: 'is preparing' }); // baru satu bukti mandiri
  assert.strictEqual(d2.fadeCredit, 0, 'sukses berbantuan ikut terhitung sebagai bukti mandiri');
});

test('kredit fading dihitung per konsep, tidak bocor ke konsep lain', () => {
  const s = session();
  answer(s, { correct: true, chosenOption: 'is preparing' });
  answer(s, { correct: true, chosenOption: 'is preparing' });
  const other = answer(s, { correct: true, chosenOption: 'ok', concept: 'articles', skill: 'articles' });
  assert.strictEqual(other.fadeCredit, 0, 'kredit konsep lain bocor ke konsep ini');
});

// ---------------------------------------------------------------------------------------
// K. FASE 2 — PEMILIHAN BERSEED: variasi yang bisa diulang, bukan lotre
// ---------------------------------------------------------------------------------------
// Kolam seragam: tanpa predict semua kandidat berskor sama, jadi softmax-nya rata dan hanya
// seed yang menentukan - tempat paling telanjang untuk menguji determinisme dan variasinya.
const UNIFORM_POOL = [
  { id: 'u1', concept: 'k1' }, { id: 'u2', concept: 'k2' },
  { id: 'u3', concept: 'k3' }, { id: 'u4', concept: 'k4' }
];

test('seed yang sama selalu memilih soal yang sama — deterministik, bisa diuji ulang', () => {
  for (let seed = 0; seed < 10; seed++) {
    const a = T.selectNext(UNIFORM_POOL, session(), { seed });
    const b = T.selectNext(UNIFORM_POOL, session(), { seed });
    assert.strictEqual(a.id, b.id, 'seed ' + seed + ' menghasilkan pilihan berbeda pada dua panggilan');
  }
});

test('seed berbeda pada kolam seragam bisa memilih soal berbeda — argmax murni adalah rel', () => {
  const picks = new Set();
  for (let seed = 1; seed <= 32; seed++) picks.add(T.selectNext(UNIFORM_POOL, session(), { seed }).id);
  assert.ok(picks.size > 1, 'seluruh seed memilih soal yang sama - samplingnya tidak hidup');
});

test('tanpa seed perilakunya tetap argmax lama, dan seed tidak pernah mengalahkan skor yang jauh unggul', () => {
  // Tanpa seed: kandidat berskor tertinggi, titik. Persis jalur lama.
  const predict = item => (item.id === 'u2' ? 0.8 : 0.4);
  assert.strictEqual(T.selectNext(UNIFORM_POOL, session(), { predict }).id, 'u2');
  // Dengan seed, forceConcept (+6 skor) tetap menang praktis selalu: suhu 0.35 membuat
  // selisih sebesar itu ~e^17 kali lebih mungkin - sampling menambah variasi di antara yang
  // SETARA, bukan mengacak keputusan pedagogis.
  for (let seed = 0; seed < 20; seed++) {
    const picked = T.selectNext(UNIFORM_POOL, session(), { seed, forceConcept: 'k3' });
    assert.strictEqual(picked.id, 'u3', 'seed ' + seed + ' mengalahkan forceConcept');
  }
});

test('sampling berseed tidak pernah keluar dari empat kandidat teratas', () => {
  // Kolam delapan soal, empat terbawah dibuat jelas buruk (peluang sukses jauh dari target).
  const pool = [];
  for (let i = 1; i <= 8; i++) pool.push({ id: 'p' + i, concept: 'c' + i });
  const predict = item => (Number(item.id.slice(1)) <= 4 ? 0.8 : 0.1);
  for (let seed = 0; seed < 40; seed++) {
    const picked = T.selectNext(pool, session(), { seed, predict });
    assert.ok(Number(picked.id.slice(1)) <= 4, 'seed ' + seed + ' memilih kandidat di luar empat teratas: ' + picked.id);
  }
});

if (failures) { console.error('\n' + failures + ' gate gagal.'); process.exit(1); }
console.log('\nTutor Brain v3: PASS');
