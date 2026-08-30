/**
 * FIEZEL gerbang — KETERJELASAN KEPUTUSAN (Fase 2 / Phase F).
 *
 * PERTANYAANNYA. Fase C membuktikan keadaan Braincore bergerak, Fase D membuktikan lima pola
 * belajar berakhir berbeda, Fase E membuktikan perbedaan itu datang dari BUKTI. Semuanya
 * menjawab "apakah mesinnya bereaksi". Tidak satu pun menjawab pertanyaan yang akan ditanyakan
 * pembeli, penguji, dan — kelak — orang tua murid: "kenapa keputusannya begitu?"
 *
 * TEMUAN YANG MELAHIRKAN FASE INI. Sebelum berkas ini ada, jawabannya untuk kasus yang PALING
 * SERING terjadi adalah: tidak ada jawaban. Diukur, bukan dikira:
 *
 *     jawaban benar biasa  -> reasonCodes []
 *     jawaban salah biasa  -> reasonCodes []
 *     tebakan cepat        -> reasonCodes ["brain3_evidence_discounted_guess"]
 *
 * Hanya bukti yang DIDISKON yang menghasilkan penjelasan. Dua kejadian paling umum di seluruh
 * produk — benar dan salah — tercatat tanpa satu pun alasan. Mesin yang hanya bisa menjelaskan
 * kasus istimewanya belum bisa disebut bisa menjelaskan.
 *
 * DAN INI BUKAN KARENA ALASANNYA TIDAK ADA. Kodenya sudah dihitung di sepanjang pipeline, lalu
 * dibuang sebelum sampai ke trace (rationale ingatan, afek, kalibrasi, prior, ledger — lima
 * sumber). Karena itu Fase F tidak menambah kecerdasan apa pun; ia menyambung yang sudah bicara
 * ke pencatat yang tidak mendengarkan.
 *
 * GODAAN YANG DITOLAK, dan kenapa gerbang §0 ada. Cara tercepat mencapai cakupan 100% adalah
 * menempeli alasan tutor ('on_track') dengan awalan menjadi 'brain3_tutor_on_track'. Di trace,
 * kode tempelan itu terlihat PERSIS seperti kode asli, dan tidak ada pemeriksa dari luar yang
 * bisa membedakannya. §0 menutup pintu itu secara mekanis: setiap kode yang keluar dari pipeline
 * harus bisa ditemukan sebagai literal di dalam sumber features/brain/. Kode karangan gagal.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const P = require('./braincore-pipeline.js');
const Trace = require('./features/brain/fiezel-decision-trace.js');
const ItemPrior = require('./features/brain/fiezel-item-prior.js');

let failures = 0;
function test(name, fn) {
  try { fn(); console.log('ok - ' + name); }
  catch (e) { failures++; console.error('FAIL - ' + name + '\n    ' + e.message); }
}

const BRAIN_DIR = path.join(__dirname, 'features', 'brain');
const brainSource = fs.readdirSync(BRAIN_DIR).filter((f) => f.endsWith('.js'))
  .map((f) => fs.readFileSync(path.join(BRAIN_DIR, f), 'utf8')).join('\n');
const tutorSource = fs.readFileSync(path.join(BRAIN_DIR, 'fiezel-tutor-brain.js'), 'utf8');

const T0 = 1_700_000_000_000;
const DAY = 86_400_000;
const Q = {
  id: 'g-past-simple-1', concept: 'past-simple', lesson: 'past-simple',
  level: 'A2', domain: 'grammar', mode: 'complete_sentence', stemLength: 40
};

/**
 * Satu sesi belajar yang SENGAJA bergelombang: benar, salah, tebakan, rentetan salah, lalu
 * pulih. Tujuannya menyentuh sebanyak mungkin cabang decideMove dalam satu jalan, supaya
 * cakupan alasan diuji pada keputusan yang beragam — bukan pada satu keputusan yang diulang.
 */
function scriptedRun() {
  const script = [
    { correct: true,  ms: 7000, timing: 'normal'    },
    { correct: true,  ms: 7000, timing: 'normal'    },
    { correct: false, ms: 7000, timing: 'normal',   chosenMisconception: 'm_ed_ending' },
    { correct: false, ms: 7000, timing: 'normal',   chosenMisconception: 'm_ed_ending' },
    { correct: false, ms: 7000, timing: 'normal',   chosenMisconception: 'm_ed_ending' },
    { correct: true,  ms: 600,  timing: 'guess'     },
    { correct: true,  ms: 26000, timing: 'struggled' },
    { correct: true,  ms: 900,  timing: 'guess'     },
    { correct: true,  ms: 1000, timing: 'guess'     },
    { correct: true,  ms: 7000, timing: 'normal'    }
  ];
  let learner = P.createLearner({ level: 'A2', now: T0 });
  let t = T0;
  const traces = [];
  for (let i = 0; i < script.length; i++) {
    t += DAY;
    if (i % 3 === 0) learner = P.newSession(learner, t);
    const r = P.answer(learner, { ...Q, id: 'g-past-simple-' + i }, script[i], t);
    learner = r.learner;
    traces.push({ trace: r.trace, move: r.decision, guardErrors: r.guardErrors });
  }
  return traces;
}

const RUN = scriptedRun();

/* ========================================================================================
 * §0 — TIDAK ADA ALASAN YANG DIKARANG
 * Gerbang terpenting berkas ini. Kode alasan hanya sah kalau ia BENAR-BENAR tertulis di dalam
 * modul Braincore. Kalau suatu hari pipeline mulai menyusun kode sendiri — dengan awalan,
 * dengan template, dengan cara apa pun — baris ini merah.
 * ===================================================================================== */
test('§0 setiap kode alasan yang keluar ADA sebagai literal di sumber features/brain/', () => {
  const all = new Set();
  for (const row of RUN) for (const c of row.trace.reasonCodes) all.add(c);
  assert.ok(all.size > 0, 'tidak ada satu pun kode alasan untuk diperiksa');
  const invented = [...all].filter((c) => brainSource.indexOf("'" + c + "'") === -1);
  assert.deepStrictEqual(invented, [],
    'kode ini tidak ada di sumber Braincore mana pun — dikarang pencatat: ' + invented.join(', '));
});

test('§0 kosakata tutor TIDAK dinaikkan diam-diam ke ruang nama brain3_', () => {
  // Alasan tutor ('on_track', 'miss_streak', ...) dicatat verbatim di decisionReason. Kalau
  // salah satunya muncul sebagai brain3_tutor_*, berarti seseorang menempeli awalan.
  const tutorReasons = [...tutorSource.matchAll(/reason: *'([a-z_]+)'/g)].map((m) => m[1]);
  assert.ok(tutorReasons.length >= 10, 'kosakata alasan tutor tidak terbaca dari sumber');
  for (const row of RUN) {
    for (const c of row.trace.reasonCodes) {
      for (const r of tutorReasons) {
        assert.notStrictEqual(c, 'brain3_tutor_' + r, 'kode tempelan ditemukan: ' + c);
        assert.notStrictEqual(c, 'brain3_' + r, 'kode tempelan ditemukan: ' + c);
      }
    }
  }
});

/* ========================================================================================
 * §1 — SETIAP KEPUTUSAN MEMBAWA PENJELASAN
 * ===================================================================================== */
test('§1 SETIAP keputusan membawa sedikitnya satu kode alasan', () => {
  const kosong = RUN.map((r, i) => ({ i, d: r.trace.decision, n: r.trace.reasonCodes.length }))
                    .filter((x) => x.n === 0);
  assert.deepStrictEqual(kosong, [],
    'keputusan tanpa alasan (inilah keadaan sebelum Fase F): ' + JSON.stringify(kosong));
});

test('§1 SETIAP keputusan membawa alasan verbatim dari modul pemutus', () => {
  for (let i = 0; i < RUN.length; i++) {
    const t = RUN[i].trace;
    assert.ok(t.decisionReason && t.decisionReason.length > 0,
      'jawaban #' + i + ' (' + t.decision + ') tidak membawa decisionReason');
    assert.ok(tutorSource.indexOf("'" + t.decisionReason + "'") !== -1,
      'decisionReason "' + t.decisionReason + '" tidak ada di sumber tutor — bukan verbatim');
  }
});

test('§1 jawaban benar biasa DAN salah biasa sama-sama terjelaskan (regresi Fase F)', () => {
  // Persis dua kasus yang dulu kosong. Ditulis terpisah supaya kalau ia kembali kosong,
  // yang merah adalah baris yang menyebut namanya, bukan gerbang umum di atas.
  const l0 = P.createLearner({ level: 'A2', now: T0 });
  const benar = P.answer(l0, Q, { correct: true,  ms: 7000, timing: 'normal' }, T0 + DAY);
  const salah = P.answer(l0, Q, { correct: false, ms: 7000, timing: 'normal' }, T0 + DAY);
  assert.ok(benar.trace.reasonCodes.length > 0, 'jawaban benar biasa: reasonCodes kosong lagi');
  assert.ok(salah.trace.reasonCodes.length > 0, 'jawaban salah biasa: reasonCodes kosong lagi');
});

/* ========================================================================================
 * §2 — ENUM KEPUTUSAN MENUTUP SELURUH KOSAKATA TUTOR
 * Sebelum Fase F, lima dari delapan gerakan tutor (breathe, consolidate, celebrate, stretch,
 * wrapup) tercatat 'unknown'. Trace mengaku tidak tahu pada keputusan yang tutornya sebut
 * dengan jelas. Gerbang ini membaca literal gerakan LANGSUNG dari sumber tutor, jadi gerakan
 * kesembilan yang lahir besok membuatnya merah — bukan diam-diam menjadi 'unknown' lagi.
 * ===================================================================================== */
test('§2 SEMUA gerakan yang diterbitkan tutor terpetakan — tidak ada yang jatuh ke unknown', () => {
  const moves = [...new Set([...tutorSource.matchAll(/move: *'([a-z_]+)'/g)].map((m) => m[1]))];
  assert.ok(moves.length >= 8, 'kosakata gerakan tutor tidak terbaca dari sumber: ' + moves.length);
  const takTerpetakan = moves.filter((m) => P.normalizeDecision({ move: m }) === 'unknown');
  assert.deepStrictEqual(takTerpetakan, [],
    'gerakan tutor yang tercatat "unknown": ' + takTerpetakan.join(', '));
  for (const m of moves) {
    assert.ok(Trace.DECISIONS.indexOf(P.normalizeDecision({ move: m })) !== -1,
      'gerakan "' + m + '" dipetakan ke luar enum tertutup');
  }
});

test('§2 gerakan yang benar-benar asing TETAP unknown — pemetaan tidak menebak', () => {
  assert.strictEqual(P.normalizeDecision({ move: 'levitate' }), 'unknown');
  assert.strictEqual(P.normalizeDecision(null), 'unknown');
});

test('§2 pemetaan TIDAK menghilangkan bukti: decisionRaw memulihkan kata asli tutor', () => {
  for (const row of RUN) {
    const t = row.trace;
    assert.strictEqual(t.decisionRaw, String(row.move && row.move.move || ''),
      'decisionRaw bukan kata asli tutor');
    assert.strictEqual(P.normalizeDecision({ move: t.decisionRaw }), t.decision,
      'decisionRaw tidak memetakan balik ke decision — pemetaannya tidak konsisten');
  }
  // Dan pemetaannya memang MENGHILANGKAN sesuatu: itulah kenapa decisionRaw wajib ada.
  assert.strictEqual(P.normalizeDecision({ move: 'celebrate' }), P.normalizeDecision({ move: 'continue' }),
    'celebrate dan continue seharusnya menyatu di enum — kalau tidak, catatan ini usang');
  assert.notStrictEqual('celebrate', 'continue');
});

/* ========================================================================================
 * §3 — PENJELASANNYA BERUBAH KARENA BUKTI
 * Alasan yang selalu sama untuk semua keputusan bukan penjelasan, itu hiasan.
 * ===================================================================================== */
test('§3 kode alasan BERBEDA antara jawaban benar dan jawaban salah', () => {
  const l0 = P.createLearner({ level: 'A2', now: T0 });
  const benar = P.answer(l0, Q, { correct: true,  ms: 7000, timing: 'normal' }, T0 + DAY).trace.reasonCodes;
  const salah = P.answer(l0, Q, { correct: false, ms: 7000, timing: 'normal' }, T0 + DAY).trace.reasonCodes;
  assert.notDeepStrictEqual(benar, salah,
    'penjelasan identik untuk benar dan salah — ia tidak menjelaskan apa pun');
});

test('§3 satu sesi bergelombang menghasilkan lebih dari satu bentuk penjelasan', () => {
  const bentuk = new Set(RUN.map((r) => r.trace.reasonCodes.join('|')));
  assert.ok(bentuk.size >= 3,
    'hanya ' + bentuk.size + ' bentuk penjelasan untuk 10 jawaban yang sangat berbeda');
  const alasan = new Set(RUN.map((r) => r.trace.decisionReason));
  assert.ok(alasan.size >= 3, 'hanya ' + alasan.size + ' alasan keputusan yang berbeda');
});

/* ========================================================================================
 * §4 — KESETIAAN PADA PRODUKSI
 * Ditemukan SAAT mengerjakan §1: pipeline mengirim mode 'mcq', yang bukan anggota MODE_COST
 * sama sekali, jadi prior selalu jatuh ke basis dan setiap trace membawa
 * brain3_item_prior_mode_unknown. Kodenya benar — yang salah masukannya. Fase C/D/E berjalan
 * dengan kesulitan yang meleset (2,00 alih-alih 2,35); kesimpulannya bertahan karena
 * selisihnya konstan di semua cabang, tetapi angkanya tidak setia pada produksi.
 * ===================================================================================== */
test('§4 mode soal yang dipakai harness ADALAH mode produksi (anggota MODE_COST)', () => {
  assert.ok(Object.prototype.hasOwnProperty.call(ItemPrior.MODE_COST, Q.mode),
    'mode "' + Q.mode + '" tidak dikenal ItemPrior — prior akan diam-diam jatuh ke basis');
  const appSrc = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');
  assert.ok(appSrc.indexOf("mode:'" + Q.mode + "'") !== -1,
    'mode "' + Q.mode + '" tidak dipakai app.js — harness menyimpang dari produksi');
});

test('§4 tidak ada trace yang membawa brain3_item_prior_mode_unknown', () => {
  const buta = RUN.filter((r) => r.trace.reasonCodes.indexOf('brain3_item_prior_mode_unknown') !== -1);
  assert.strictEqual(buta.length, 0,
    buta.length + ' trace masih melaporkan mode tak dikenal — prior tidak benar-benar dipakai');
});

/* ========================================================================================
 * §5 — PENJELASAN TIDAK BOLEH MENJADI KANAL KEBOCORAN
 * decisionReason adalah field string baru yang datang dari modul lain. Field string yang
 * bebas isi adalah tempat identitas murid akhirnya menyelinap.
 * ===================================================================================== */
test('§5 decisionReason terkunci ke slug pendek — teks bebas DITOLAK, bukan dipotong', () => {
  assert.throws(() => Trace.build({ decision: 'continue', decisionReason: 'murid Budi lambat' }),
    /bukan slug pendek/, 'teks bebas lolos ke dalam trace');
  assert.throws(() => Trace.build({ decision: 'continue', decisionRaw: 'a@b.com' }),
    /bukan slug pendek/, 'alamat surel lolos ke dalam trace');
  assert.strictEqual(Trace.build({ decision: 'continue' }).decisionReason, null,
    'kosong seharusnya menjadi null, bukan string kosong');
});

test('§5 seluruh trace hasil lari nyata bebas kunci identitas', () => {
  for (const row of RUN) {
    const s = JSON.stringify(row.trace);
    for (const k of ['userId', 'installId', 'deviceId', 'email', 'token', 'answerText']) {
      assert.ok(s.indexOf('"' + k + '"') === -1, 'kunci identitas "' + k + '" ada di trace');
    }
  }
});

/* ========================================================================================
 * §6 — PENJAGA TIDAK SENYAP, DAN HASILNYA TERULANG
 * ===================================================================================== */
test('§6 tidak satu pun langkah menelan galat selama lari nyata', () => {
  const galat = RUN.flatMap((r, i) => r.guardErrors.map((e) => '#' + i + ' ' + e));
  assert.deepStrictEqual(galat, [], 'galat yang tertangkap penjaga: ' + galat.join(' | '));
});

test('§6 REPRODUSIBEL: lari kedua memberi penjelasan yang identik', () => {
  const a = JSON.stringify(RUN.map((r) => [r.trace.decision, r.trace.decisionRaw, r.trace.decisionReason, r.trace.reasonCodes]));
  const b = JSON.stringify(scriptedRun().map((r) => [r.trace.decision, r.trace.decisionRaw, r.trace.decisionReason, r.trace.reasonCodes]));
  assert.strictEqual(a, b, 'penjelasan tidak deterministik');
});

/* ========================================================================================
 * §7 — SETIAP GERAKAN DICAPAI SUNGGUHAN, BUKAN HANYA DIPETAKAN
 * §2 membuktikan PETANYA lengkap. Itu belum membuktikan pipeline bisa SAMPAI ke sana: peta
 * yang lengkap ke jalan yang tidak bisa dilalui tetap tidak mengukur apa pun. Bagian ini
 * menjalankan delapan skenario nyata sampai kedelapan gerakan tutor benar-benar terbit lewat
 * answer(), lalu memeriksa setiap satunya membawa penjelasan.
 *
 * Empat dari delapan dulu MUSTAHIL dicapai karena harness memanggil decideMove dengan konteks
 * yang lebih miskin daripada app.js:2808 (tanpa remaining nyata, tanpa lelah, tanpa afek).
 * Kalau seseorang memiskinkan konteks itu lagi, bagian ini merah — bukan diam-diam mengukur
 * mesin pada separuh jalurnya.
 * ===================================================================================== */
function drive(script, label) {
  let learner = P.createLearner({ level: 'A2', now: T0 });
  let t = T0;
  const rows = [];
  for (const a of script) {
    t += 60_000;
    const r = P.answer(learner, Q, a, t);
    learner = r.learner;
    rows.push({ move: String(r.decision && r.decision.move || ''), trace: r.trace, label });
  }
  return rows;
}
const ok = (ms) => ({ correct: true, ms });
const no = (ms) => ({ correct: false, ms });
const REACHED = [].concat(
  drive([ok(7000), ok(7000), ok(7000)], 'lanjut biasa'),
  drive([no(7000), no(7000), no(7000), no(7000)], 'rentetan salah'),
  drive([ok(7000), ok(7000), ok(7000), ok(7000), ok(40000)], 'benar tapi lambat'),
  drive([ok(12000), ok(12000), ok(12000), ok(12000), ok(5000), ok(5000)], 'jadi cepat mengingat'),
  drive([ok(7000), ok(7000), ok(7000), ok(7000), ok(7000), ok(7000),
         no(40000), no(40000), no(40000), no(40000)], 'melambat dan meleset'),
  drive([ok(7000), { correct: true, ms: 7000, remaining: 0 }], 'soal habis'),
  RUN.map((r) => ({ move: String(r.move && r.move.move || ''), trace: r.trace, label: 'sesi bergelombang' }))
);

test('§7 KEDELAPAN gerakan tutor benar-benar terbit lewat pipeline', () => {
  const moves = [...new Set([...tutorSource.matchAll(/move: *'([a-z_]+)'/g)].map((m) => m[1]))].sort();
  const tercapai = [...new Set(REACHED.map((r) => r.move))].sort();
  const takTercapai = moves.filter((m) => tercapai.indexOf(m) === -1);
  assert.deepStrictEqual(takTercapai, [],
    'gerakan yang tidak pernah bisa dicapai harness: ' + takTercapai.join(', '));
});

test('§7 setiap gerakan yang tercapai membawa penjelasan, bukan hanya yang umum', () => {
  const perMove = {};
  for (const r of REACHED) {
    if (!perMove[r.move]) perMove[r.move] = [];
    perMove[r.move].push(r.trace);
  }
  const buta = [];
  for (const m of Object.keys(perMove)) {
    for (const t of perMove[m]) {
      if (!t.reasonCodes.length || !t.decisionReason) buta.push(m);
    }
  }
  assert.deepStrictEqual([...new Set(buta)], [], 'gerakan tanpa penjelasan: ' + buta.join(', '));
});

test('§7 konteks decideMove sama BENTUKNYA dengan app.js:2808', () => {
  const appSrc = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');
  const site = appSrc.split('\n').find((l) => l.indexOf('decideMove(session,diagnosis,{') !== -1);
  assert.ok(site, 'titik sambung decideMove di app.js tidak ditemukan — nomor barisnya bergeser?');
  const pipeSrc = fs.readFileSync(path.join(__dirname, 'braincore-pipeline.js'), 'utf8');
  for (const key of ['remaining', 'fatigue', 'affect']) {
    assert.ok(site.indexOf(key) !== -1, 'app.js tidak lagi mengirim "' + key + '" — catatan ini usang');
    assert.ok(pipeSrc.indexOf(key + ':') !== -1, 'pipeline tidak mengirim "' + key + '" ke decideMove');
  }
});

/* ---- ringkasan yang bisa dibaca manusia, dan dibaca laporan pembeli (Fase Q) ---- */
const ringkas = RUN.map((r, i) =>
  '  #' + i + ' ' + r.trace.decision + '(' + r.trace.decisionRaw + ') :' +
  r.trace.decisionReason + ' -> ' + r.trace.reasonCodes.join(','));
console.log('     cakupan alasan: ' + RUN.filter((r) => r.trace.reasonCodes.length > 0).length +
            '/' + RUN.length + ' keputusan terjelaskan');
console.log(ringkas.join('\n'));

console.log(failures === 0 ? 'Explainability: PASS' : 'Explainability: FAIL (' + failures + ')');
process.exit(failures === 0 ? 0 : 1);
