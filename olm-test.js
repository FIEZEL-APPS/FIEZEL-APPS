/**
 * FIEZEL gate — Open Learner Model v1 (olm-test).
 *
 * OLM adalah cermin untuk murid, dan cermin paling mudah berbohong dengan cara halus:
 * angka tunggal yang menyembunyikan ketidakpastian, tuduhan overconfidence dari sampel
 * kecil, atau klaim penguasaan dari dua jawaban. Gate ini tidak memeriksa "apakah ada
 * tampilannya", melainkan APAKAH CERMINNYA JUJUR:
 *
 *   (a) Brier dan ARAH bias harus benar pada fixture sintetis yang jawabannya bisa
 *       dihitung tangan;
 *   (b) di bawah 20 pasangan kalibrasi -> insufficient_data TANPA pesan;
 *   (c) klaim penguasaan di bawah ambang bukti keluar sebagai 'belum cukup data',
 *       bukan angka yang berlagak tahu;
 *   (d) tidak ada satu pun angka penguasaan/retrievability tanpa interval
 *       ketidakpastian yang menyertainya;
 *   (e) input null/kosong aman — cermin tidak boleh pecah hanya karena datanya belum ada.
 *
 * GATE v3 — NEGOTIATED LEARNER MODEL (council C9 opus): sanggahan murid bukan tombol
 * keluhan, melainkan bukti bahwa model dan realitas berbeda — obatnya pengukuran ulang,
 * bukan debat. Gate baru memeriksa:
 *   (n-a) claimId stabil (dua summarize identik) & unik dalam satu ringkasan;
 *   (n-b) dispute klaim mastery/miskonsepsi -> instruksi remeasure dengan targetSkill benar;
 *   (n-c) dispute klaim memori -> instruksi discount_evidence dengan target benar;
 *   (n-d) dispute ganda pada klaim sama dalam 7 hari -> noop (anti spam remeasure);
 *   (n-e) summarize menandai klaim pending 'sedang diukur ulang' + canDispute:false,
 *         dan resolveDispute membukanya kembali;
 *   (n-f) state negosiasi korup tidak pernah melempar — disanitasi, bukan dipercaya.
 */
const assert = require('assert');
const olm = require('./features/brain/fiezel-olm.js');

let failures = 0;
function test(name, fn) {
  try { fn(); console.log('ok - ' + name); }
  catch (e) { failures++; console.error('FAIL - ' + name + '\n    ' + e.message); }
}

const NOW = Date.parse('2026-08-22T12:00:00Z');
const DAY = 86400000;

/** Fixture kalibrasi deterministik: n pasangan, semua confidence c, fraksi benar acc. */
function calibPairs(n, c, acc) {
  const correctCount = Math.round(n * acc);
  const out = [];
  for (let i = 0; i < n; i++) out.push({ confidence: c, correct: i < correctCount });
  return out;
}

/* ---------------- (a) Brier & arah bias pada fixture sintetis ---------------- */

test('(a) Brier dihitung benar: c=0.9 konstan, 60% benar dari 25 -> B = 0.33', () => {
  // Hitung tangan: 15 benar -> (0.9-1)^2 = 0.01; 10 salah -> (0.9-0)^2 = 0.81
  // B = (15*0.01 + 10*0.81)/25 = 0.33
  const out = olm.summarize({ calibration: calibPairs(25, 0.9, 0.6) }, NOW);
  assert.strictEqual(out.calibration.status, 'ok');
  assert.ok(Math.abs(out.calibration.brier - 0.33) < 1e-9, 'brier=' + out.calibration.brier);
});

test('(a) bias positif besar -> overconfidence, dengan pesan spesifik X% vs Y%', () => {
  const out = olm.summarize({ calibration: calibPairs(25, 0.9, 0.6) }, NOW);
  const c = out.calibration;
  assert.ok(Math.abs(c.bias - 0.3) < 1e-9, 'bias=' + c.bias);
  assert.strictEqual(c.tone, 'overconfidence');
  assert.strictEqual(c.rationale, 'brain3_olm_calibration_overconfidence');
  // Pesan harus SPESIFIK dengan angka murid ini, bukan nasihat generik.
  assert.ok(c.message.indexOf('memprediksi benar 90%') !== -1, c.message);
  assert.ok(c.message.indexOf('aktual 60%') !== -1, c.message);
});

test('(a) bias negatif besar -> underconfidence; nadanya memuji tindakan, bukan orangnya', () => {
  const out = olm.summarize({ calibration: calibPairs(30, 0.3, 0.7) }, NOW);
  const c = out.calibration;
  assert.ok(c.bias < -0.15, 'bias=' + c.bias);
  assert.strictEqual(c.tone, 'underconfidence');
  assert.ok(c.message.indexOf('memprediksi benar 30%') !== -1, c.message);
  assert.ok(c.message.indexOf('aktual 70%') !== -1, c.message);
  // "kamu pintar/hebat/jenius" = pujian pada orang -> dilarang; pujian harus ke tindakan.
  assert.ok(!/kamu (pintar|hebat|jenius|cerdas)/i.test(c.message), c.message);
});

test('(a) bias kecil -> nada netral tanpa tuduhan arah', () => {
  const out = olm.summarize({ calibration: calibPairs(40, 0.7, 0.7) }, NOW);
  const c = out.calibration;
  assert.ok(Math.abs(c.bias) <= 0.15, 'bias=' + c.bias);
  assert.strictEqual(c.tone, 'netral');
  assert.strictEqual(c.rationale, 'brain3_olm_calibration_neutral');
});

/* ---------------- (b) < 20 pasangan -> insufficient_data ---------------- */

test('(b) 19 pasangan -> status insufficient_data dan TANPA pesan/angka agregat', () => {
  const out = olm.summarize({ calibration: calibPairs(19, 0.9, 0.5) }, NOW);
  const c = out.calibration;
  assert.strictEqual(c.status, 'insufficient_data');
  assert.strictEqual(c.pairs, 19);
  // Tuduhan dari sampel kecil dilarang: tidak boleh ada message, tone, brier, atau bias.
  assert.ok(!('message' in c), 'tidak boleh ada message');
  assert.ok(!('tone' in c), 'tidak boleh ada tone');
  assert.ok(!('brier' in c), 'tidak boleh ada brier');
  assert.ok(!('bias' in c), 'tidak boleh ada bias');
});

test('(b) pasangan tidak valid (confidence di luar 0..1, correct bukan bool) tidak dihitung', () => {
  const pairs = calibPairs(19, 0.8, 0.5)
    .concat([{ confidence: 1.5, correct: true }, { confidence: 0.5, correct: 'ya' }, null]);
  const out = olm.summarize({ calibration: pairs }, NOW);
  assert.strictEqual(out.calibration.status, 'insufficient_data');
  assert.strictEqual(out.calibration.pairs, 19);
});

/* ---------------- (c) klaim tanpa bukti -> 'belum cukup data' ---------------- */

test("(c) BKT dengan n < 3 -> status 'belum cukup data' dan mean/interval null", () => {
  const out = olm.summarize({
    bkt: { lessons: {
      tipis: { L: 0.95, n: 1, family: 'tense' },
      cukup: { L: 0.7, n: 12, family: 'tense' }
    } }
  }, NOW);
  const tipis = out.mastery.entries.find((e) => e.lesson === 'tipis');
  const cukup = out.mastery.entries.find((e) => e.lesson === 'cukup');
  // Dua jawaban benar BUKAN penguasaan 95% — itu keberuntungan yang belum teruji.
  assert.strictEqual(tipis.status, 'belum cukup data');
  assert.strictEqual(tipis.mean, null);
  assert.strictEqual(tipis.low, null);
  assert.strictEqual(tipis.high, null);
  assert.strictEqual(cukup.status, 'ok');
  assert.strictEqual(out.mastery.insufficientCount, 1);
});

test('(c) ledger absen / memory kosong -> seksi keluar sebagai belum cukup data, bukan klaim', () => {
  const out = olm.summarize({ bkt: null, ledger: null, memory: [] }, NOW);
  assert.strictEqual(out.misconceptions.status, 'belum cukup data');
  assert.deepStrictEqual(out.misconceptions.active, []);
  assert.strictEqual(out.review.status, 'belum cukup data');
  assert.deepStrictEqual(out.review.top, []);
});

/* ---------------- (d) tidak ada angka tanpa ketidakpastian ---------------- */

test('(d) setiap penguasaan ber-status ok punya interval low <= mean <= high dengan lebar > 0', () => {
  const out = olm.summarize({
    bkt: { lessons: {
      a: { L: 0.5, n: 10 },
      b: { L: 0.99, n: 200 },   // bukti banyak sekalipun: bar tidak boleh menyusut jadi titik
      c: 0.4                     // mastery mentah -> estimasi kasar
    } }
  }, NOW);
  out.mastery.entries.forEach((e) => {
    assert.strictEqual(e.status, 'ok', e.lesson);
    assert.ok(typeof e.mean === 'number', e.lesson + ' mean');
    assert.ok(typeof e.low === 'number' && typeof e.high === 'number', e.lesson + ' interval');
    assert.ok(e.low <= e.mean && e.mean <= e.high, e.lesson + ' urutan interval');
    assert.ok(e.high - e.low > 0, e.lesson + ' lebar interval harus > 0');
  });
});

test("(d) mastery mentah diberi label 'estimasi kasar' dan interval lebih lebar dari BKT padat", () => {
  const out = olm.summarize({ bkt: { lessons: { raw: 0.6, bkt: { L: 0.6, n: 50 } } } }, NOW);
  const raw = out.mastery.entries.find((e) => e.lesson === 'raw');
  const viaBkt = out.mastery.entries.find((e) => e.lesson === 'bkt');
  assert.strictEqual(raw.label, 'estimasi kasar');
  assert.strictEqual(raw.source, 'raw');
  assert.ok((raw.high - raw.low) > (viaBkt.high - viaBkt.low),
    'estimasi kasar harus lebih kabur daripada BKT dengan 50 bukti');
});

test('(d) retrievability di jadwal review juga membawa pita low..high, bukan titik', () => {
  const memory = [
    { id: 'lama', stability: 5, lastReviewMs: NOW - 20 * DAY, reps: 2 },
    { id: 'baru', stability: 30, lastReviewMs: NOW - 1 * DAY, reps: 6 },
    { id: 'genting', stability: 2, lastReviewMs: NOW - 30 * DAY, reps: 1 }
  ];
  const out = olm.summarize({ memory }, NOW);
  assert.strictEqual(out.review.status, 'ok');
  out.review.top.forEach((it) => {
    const r = it.retrievability;
    assert.ok(r && typeof r.mean === 'number', it.id + ' mean');
    assert.ok(r.low <= r.mean && r.mean <= r.high, it.id + ' urutan pita');
    assert.ok(r.high - r.low > 0, it.id + ' pita harus > 0');
  });
  // Paling genting harus tampil pertama (retrievability terendah).
  assert.strictEqual(out.review.top[0].id, 'genting');
  // 'lama' (R = 2^-4) dan 'genting' (R = 2^-15) berisiko; 'baru' (R ~ 0.977) tidak.
  assert.strictEqual(out.review.atRiskCount, 2);
});

test('(d) maksimal 3 item review ditampilkan walau item lebih banyak', () => {
  const memory = [];
  for (let i = 0; i < 8; i++) memory.push({ id: 'it' + i, stability: 3, lastReviewMs: NOW - (i + 1) * DAY });
  const out = olm.summarize({ memory }, NOW);
  assert.strictEqual(out.review.top.length, 3);
});

/* ---------------- (e) input null aman ---------------- */

test('(e) summarize(null) dan summarize({}) tidak melempar dan semua seksi berstatus jujur', () => {
  [null, undefined, {}, { bkt: null, ledger: null, memory: null, calibration: null }].forEach((input) => {
    const out = olm.summarize(input, NOW);
    assert.strictEqual(out.schema, 'fiezel-olm-v1');
    assert.strictEqual(out.mastery.status, 'belum cukup data');
    assert.strictEqual(out.misconceptions.status, 'belum cukup data');
    assert.strictEqual(out.review.status, 'belum cukup data');
    assert.strictEqual(out.calibration.status, 'insufficient_data');
  });
});

test('(e) item memory cacat (tanpa stability / tanpa waktu) dilewati tanpa error', () => {
  const out = olm.summarize({
    memory: [
      { id: 'utuh', stability: 4, lastReviewMs: NOW - 3 * DAY },
      { id: 'tanpa-stability', lastReviewMs: NOW - 3 * DAY },
      { id: 'tanpa-waktu', stability: 4 },
      null, 42
    ]
  }, NOW);
  assert.strictEqual(out.review.top.length, 1);
  assert.strictEqual(out.review.top[0].id, 'utuh');
});

/* ---------------- kontrak presentasi: dispute & nada bahasa ---------------- */

test('setiap entri (mastery, miskonsepsi, review, kalibrasi) membawa canDispute:true + disputeHint global', () => {
  const out = olm.summarize({
    bkt: { lessons: { a: { L: 0.6, n: 9 } } },
    ledger: {
      active: [{ concept: 'past_perfect', misconception: 'has went', canonical: 'had gone', belief: 0.8, evidenceCount: 4 }],
      resolved: [{ concept: 'articles', misconception: 'a apple' }],
      total: 2
    },
    memory: [{ id: 'x', stability: 3, lastReviewMs: NOW - 10 * DAY }],
    calibration: calibPairs(25, 0.9, 0.6)
  }, NOW);
  assert.strictEqual(out.disputeHint.label, 'menurutku ini salah');
  assert.strictEqual(out.disputeHint.ownedBy, 'app'); // aksinya milik app, bukan modul ini
  out.mastery.entries.forEach((e) => assert.strictEqual(e.canDispute, true));
  out.misconceptions.active.forEach((e) => assert.strictEqual(e.canDispute, true));
  out.misconceptions.resolved.forEach((e) => assert.strictEqual(e.canDispute, true));
  out.review.top.forEach((e) => assert.strictEqual(e.canDispute, true));
  assert.strictEqual(out.calibration.canDispute, true);
});

test('naskah miskonsepsi berbahasa Indonesia tentang PERILAKU, tidak pernah menyerang orangnya', () => {
  const out = olm.summarize({
    ledger: {
      active: [{ concept: 'third_conditional', misconception: 'would went', canonical: 'would have gone', belief: 0.85, evidenceCount: 5 }],
      resolved: [],
      total: 1
    }
  }, NOW);
  const t = out.misconceptions.active[0].text;
  assert.ok(t.indexOf('jawaban') !== -1, 'naskah harus tentang jawaban/perilaku: ' + t);
  assert.ok(t.indexOf('would went') !== -1 && t.indexOf('would have gone') !== -1, t);
  // Larangan menyebut/menghakimi orangnya.
  assert.ok(!/kamu (salah paham|bodoh|lemah|gagal)/i.test(t), t);
});

test('modul murni: summarize tidak bergantung Date.now (hasil identik untuk nowMs sama)', () => {
  const input = {
    bkt: { lessons: { a: { L: 0.5, n: 10 } } },
    memory: [{ id: 'x', stability: 3, lastReviewMs: NOW - 5 * DAY }],
    calibration: calibPairs(25, 0.9, 0.6)
  };
  const a = JSON.stringify(olm.summarize(input, NOW));
  const b = JSON.stringify(olm.summarize(input, NOW));
  assert.strictEqual(a, b);
  assert.strictEqual(olm.summarize(input, NOW).generatedAt, NOW);
});

/* ================= GATE v3 — negotiated learner model ================= */

/** Fixture ringkasan lengkap: mastery + miskonsepsi + memori + kalibrasi. */
function fullInput(extra) {
  const base = {
    bkt: { lessons: {
      tense_aspect: { L: 0.8, n: 12, family: 'tense' },
      articles: { L: 0.5, n: 9 }
    } },
    ledger: {
      active: [{ concept: 'third_conditional', misconception: 'would went', canonical: 'would have gone', belief: 0.85, evidenceCount: 5 }],
      resolved: [{ concept: 'articles', misconception: 'a apple' }],
      total: 2
    },
    memory: [{ id: 'grammar:skill', stability: 3, lastReviewMs: NOW - 10 * DAY, reps: 2 }],
    calibration: calibPairs(25, 0.9, 0.6)
  };
  return Object.assign(base, extra || {});
}

/** Kumpulkan semua claimId dari satu ringkasan. */
function allClaimIds(out) {
  const ids = [];
  out.mastery.entries.forEach((e) => ids.push(e.claimId));
  out.misconceptions.active.forEach((e) => ids.push(e.claimId));
  out.misconceptions.resolved.forEach((e) => ids.push(e.claimId));
  out.review.top.forEach((e) => ids.push(e.claimId));
  ids.push(out.calibration.claimId);
  return ids;
}

test('(n-a) setiap klaim membawa claimId string dengan format terdokumentasi', () => {
  const out = olm.summarize(fullInput(), NOW);
  const ids = allClaimIds(out);
  ids.forEach((id) => assert.ok(typeof id === 'string' && id.length > 0, 'claimId kosong: ' + id));
  assert.ok(ids.indexOf('mastery:tense_aspect') !== -1, ids.join(','));
  assert.ok(ids.indexOf('misconception:third_conditional::would went') !== -1, ids.join(','));
  assert.ok(ids.indexOf('memory:grammar:skill') !== -1, ids.join(','));
});

test('(n-a) claimId STABIL antar pemanggilan dan UNIK dalam satu ringkasan', () => {
  const a = allClaimIds(olm.summarize(fullInput(), NOW));
  const b = allClaimIds(olm.summarize(fullInput(), NOW));
  // Stabil: identitas klaim tidak boleh berganti antar render, kalau tidak dispute
  // yang tercatat kemarin tidak akan pernah cocok dengan klaim yang tampil hari ini.
  assert.deepStrictEqual(a, b);
  // Unik: dua klaim dengan claimId sama berarti satu tombol membantah dua hal.
  assert.strictEqual(new Set(a).size, a.length, 'claimId duplikat: ' + a.join(','));
});

test('(n-b) dispute klaim mastery -> remeasure dengan targetSkill benar dan probeCount 3', () => {
  const r = olm.negotiate(null, { claimId: 'mastery:tense_aspect', action: 'dispute' }, NOW);
  assert.strictEqual(r.instruction.type, 'remeasure');
  assert.strictEqual(r.instruction.targetSkill, 'tense_aspect');
  assert.strictEqual(r.instruction.probeCount, 3);
  assert.strictEqual(r.instruction.rationale, 'brain3_olm_dispute_remeasure');
  // Sanggahan tercatat {claimId, at} di state baru yang serializable.
  assert.strictEqual(r.state.schema, 'fiezel-olm-negotiation-v1');
  assert.deepStrictEqual(r.state.disputes, [{ claimId: 'mastery:tense_aspect', at: NOW }]);
  assert.strictEqual(JSON.stringify(r.state), JSON.stringify(JSON.parse(JSON.stringify(r.state))));
});

test('(n-b) dispute klaim miskonsepsi -> remeasure menarget KONSEPNYA (bagian sebelum ::)', () => {
  const r = olm.negotiate(null, { claimId: 'misconception:third_conditional::would went', action: 'dispute' }, NOW);
  assert.strictEqual(r.instruction.type, 'remeasure');
  assert.strictEqual(r.instruction.targetSkill, 'third_conditional');
  assert.strictEqual(r.instruction.probeCount, 3);
});

test('(n-c) dispute klaim memori -> discount_evidence dengan target benar (id boleh mengandung :)', () => {
  const r = olm.negotiate(null, { claimId: 'memory:grammar:skill', action: 'dispute' }, NOW);
  assert.strictEqual(r.instruction.type, 'discount_evidence');
  assert.strictEqual(r.instruction.target, 'grammar:skill');
  assert.strictEqual(r.instruction.rationale, 'brain3_olm_dispute_discount');
  assert.deepStrictEqual(r.state.disputes, [{ claimId: 'memory:grammar:skill', at: NOW }]);
});

test('(n-d) dispute GANDA pada klaim sama dalam 7 hari -> noop pending, state tidak menumpuk', () => {
  const first = olm.negotiate(null, { claimId: 'mastery:articles', action: 'dispute' }, NOW);
  const again = olm.negotiate(first.state, { claimId: 'mastery:articles', action: 'dispute' }, NOW + 6 * DAY);
  assert.strictEqual(again.instruction.type, 'noop');
  assert.strictEqual(again.instruction.rationale, 'brain3_olm_dispute_pending');
  assert.strictEqual(again.state.disputes.length, 1);
  assert.strictEqual(again.state.disputes[0].at, NOW); // catatan lama utuh, tidak di-reset
  // Setelah 7 hari sanggahan kedaluwarsa: boleh dibantah lagi, instruksi terbit ulang.
  const later = olm.negotiate(first.state, { claimId: 'mastery:articles', action: 'dispute' }, NOW + 8 * DAY);
  assert.strictEqual(later.instruction.type, 'remeasure');
  assert.strictEqual(later.state.disputes.length, 1);
  assert.strictEqual(later.state.disputes[0].at, NOW + 8 * DAY);
});

test('(n-d) negotiate IMMUTABLE: state masukan tidak pernah dimutasi', () => {
  const first = olm.negotiate(null, { claimId: 'mastery:articles', action: 'dispute' }, NOW);
  const frozen = Object.freeze({ schema: first.state.schema, disputes: Object.freeze([Object.freeze(first.state.disputes[0])]) });
  const before = JSON.stringify(frozen);
  const r = olm.negotiate(frozen, { claimId: 'memory:grammar:skill', action: 'dispute' }, NOW + 1 * DAY);
  assert.strictEqual(JSON.stringify(frozen), before);
  assert.strictEqual(r.state.disputes.length, 2);
  assert.notStrictEqual(r.state, frozen);
});

test("(n-e) summarize menandai klaim pending: label 'sedang diukur ulang' + canDispute:false", () => {
  const d1 = olm.negotiate(null, { claimId: 'mastery:tense_aspect', action: 'dispute' }, NOW - 1 * DAY);
  const d2 = olm.negotiate(d1.state, { claimId: 'memory:grammar:skill', action: 'dispute' }, NOW - 1 * DAY);
  const out = olm.summarize(fullInput({ negotiation: d2.state }), NOW);
  const disputed = out.mastery.entries.find((e) => e.lesson === 'tense_aspect');
  assert.strictEqual(disputed.label, 'sedang diukur ulang');
  assert.strictEqual(disputed.canDispute, false);
  assert.strictEqual(disputed.disputed, true);
  const mem = out.review.top.find((e) => e.id === 'grammar:skill');
  assert.strictEqual(mem.label, 'sedang diukur ulang');
  assert.strictEqual(mem.canDispute, false);
  // Klaim LAIN tidak ikut terkunci.
  const other = out.mastery.entries.find((e) => e.lesson === 'articles');
  assert.strictEqual(other.canDispute, true);
  assert.ok(!other.disputed);
  // Sanggahan kedaluwarsa (>7 hari) tidak lagi menandai apa pun.
  const stale = olm.summarize(fullInput({ negotiation: d2.state }), NOW + 8 * DAY);
  assert.strictEqual(stale.mastery.entries.find((e) => e.lesson === 'tense_aspect').canDispute, true);
});

test('(n-e) resolveDispute menutup sanggahan: klaim kembali normal dan bisa dibantah lagi', () => {
  const d = olm.negotiate(null, { claimId: 'mastery:tense_aspect', action: 'dispute' }, NOW);
  const resolved = olm.resolveDispute(d.state, 'mastery:tense_aspect', NOW + 1 * DAY);
  assert.deepStrictEqual(resolved.disputes, []);
  const out = olm.summarize(fullInput({ negotiation: resolved }), NOW + 1 * DAY);
  const e = out.mastery.entries.find((x) => x.lesson === 'tense_aspect');
  assert.strictEqual(e.canDispute, true);
  assert.ok(!e.disputed);
  assert.strictEqual(e.label, 'dari model BKT'); // label lama pulih, bukan 'sedang diukur ulang'
  // Setelah resolve, dispute baru pada klaim sama sah kembali (bukan noop pending).
  const again = olm.negotiate(resolved, { claimId: 'mastery:tense_aspect', action: 'dispute' }, NOW + 2 * DAY);
  assert.strictEqual(again.instruction.type, 'remeasure');
});

test('(n-f) state negosiasi korup aman: disanitasi tanpa melempar, entri cacat dibuang', () => {
  const corrupt = [
    null, undefined, 42, 'rusak', [],
    { disputes: 'bukan array' },
    { schema: 'salah', disputes: [{ claimId: '', at: NOW }, { claimId: 'mastery:x' }, { at: NOW }, null, 7,
      { claimId: 'mastery:tense_aspect', at: NOW - 1 * DAY }] }
  ];
  corrupt.forEach((st) => {
    const r = olm.negotiate(st, { claimId: 'mastery:baru', action: 'dispute' }, NOW);
    assert.strictEqual(r.instruction.type, 'remeasure');
    assert.strictEqual(r.state.schema, 'fiezel-olm-negotiation-v1');
    assert.ok(Array.isArray(r.state.disputes));
    const rd = olm.resolveDispute(st, 'mastery:baru', NOW);
    assert.ok(Array.isArray(rd.disputes));
    // summarize dengan negotiation korup juga tidak boleh melempar.
    const out = olm.summarize(fullInput({ negotiation: st }), NOW);
    assert.strictEqual(out.schema, 'fiezel-olm-v1');
  });
  // Entri valid di tengah sampah tetap terbaca: klaim itu pending.
  const mixed = corrupt[6];
  const out = olm.summarize(fullInput({ negotiation: mixed }), NOW);
  assert.strictEqual(out.mastery.entries.find((e) => e.lesson === 'tense_aspect').canDispute, false);
});

test('(n-f) permintaan cacat -> noop invalid: tanpa claimId, action asing, klaim tak dikenal, nowMs bukan angka', () => {
  assert.strictEqual(olm.negotiate(null, null, NOW).instruction.type, 'noop');
  assert.strictEqual(olm.negotiate(null, { action: 'dispute' }, NOW).instruction.type, 'noop');
  assert.strictEqual(olm.negotiate(null, { claimId: 'mastery:x', action: 'setuju' }, NOW).instruction.type, 'noop');
  assert.strictEqual(olm.negotiate(null, { claimId: 'mastery:x', action: 'dispute' }, 'besok').instruction.type, 'noop');
  const unknown = olm.negotiate(null, { claimId: 'calibration:overall', action: 'dispute' }, NOW);
  assert.strictEqual(unknown.instruction.type, 'noop');
  assert.deepStrictEqual(unknown.state.disputes, []); // tidak ada instruksi -> tidak ada catatan
});

test('API lama utuh: summarize TANPA field negotiation berperilaku persis seperti sebelumnya', () => {
  const out = olm.summarize(fullInput(), NOW);
  out.mastery.entries.forEach((e) => assert.strictEqual(e.canDispute, true));
  out.review.top.forEach((e) => assert.strictEqual(e.canDispute, true));
  assert.ok(!out.mastery.entries.some((e) => e.disputed), 'tanpa negotiation tidak ada yang disputed');
});

if (failures > 0) {
  console.error(failures + ' kegagalan');
  process.exit(1);
}
console.log('FiezelOLM v1: PASS');
