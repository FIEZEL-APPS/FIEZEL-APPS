// Smoke test NUJUM engine di Node (tanpa DOM): naskah, selector, prediksi, ribbon, duel logic.
const fs = require('fs');
const assert = require('assert');
const store = {};
global.window = global;
global.localStorage = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
global.sessionStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
global.requestAnimationFrame = () => 0; global.cancelAnimationFrame = () => {};
// fake BKT module mirroring FiezelMasteryBKT.update contract
global.FiezelMasteryBKT = { SCHEMA: 'bkt', update(st, obs) { const n = { schema: 'bkt', lessons: Object.assign({}, st.lessons) }; const p = n.lessons[obs.lesson] || { L: 0.2, n: 0 }; const L = obs.correct ? Math.min(0.99, p.L + 0.15) : Math.max(0.01, p.L - 0.1); n.lessons[obs.lesson] = { L, n: p.n + 1, lastAt: Date.now() }; return n; } };
let bkt = { schema: 'bkt', lessons: {} };
global.__fiezelNujumBridge = { getActiveLevel: () => 'B1', learnerName: () => 'Fitra', showToast: () => {}, bktRead: () => bkt, bktWrite: s => { bkt = s; } };

eval(fs.readFileSync(__dirname + '/features/nujum/fiezel-nujum.js', 'utf8'));
const N = global.FiezelNujum;

// 1. bank naskah
const ids = N.SCRIPTS.map(s => s.id);
assert.strictEqual(new Set(ids).size, ids.length, 'id unik');
const count = sec => N.SCRIPTS.filter(s => s.sec === sec).length;
assert(count('pre_bet') >= 10 && count('machine_wins') >= 15 && count('student_wins') >= 10 && count('dispute_open') >= 5);
assert.strictEqual(count('give_up'), 5); assert.strictEqual(count('teleport_out') + count('teleport_back'), 5); assert.strictEqual(count('level_roast'), 5);

// 2. selector: kondisi spesifik menang
for (let i = 0; i < 20; i++) {
  const s = N.selectScript('pre_bet', { pct_band: 'high', pct: 93, distractor: 'is leaving', occurrences: 4 });
  assert(['PB-12'].includes(s.id) || s.id.startsWith('PB-'), s.id);
  assert(!/\{pct\}/.test(s.text), 'placeholder terisi');
}
const mw = N.selectScript('machine_wins', { misconception: 'TENSE_CONT_FOR_HABIT', misconception_family: 'tense_aspect', latency: 7, distractor: 'is getting' });
assert(['MW-A-01', 'MW-A-03', 'MW-D-04', 'MW-D-06'].includes(mw.id), mw.id);
const dl = N.selectScript('dispute_lost', { dispute_score: 2 }); assert(['DL-01', 'DL-02'].includes(dl.id));

// 3. prediksi & ribbon
const item = { skill: 'present-simple-habits', level: 'A1', options: ['gets', 'is getting', 'get', 'got'], correct: 0, mis: { 'is getting': 'tense_aspect.habitual_overgeneralized' }, targeted: '' };
const p = N.predict(item);
assert(p.pct >= 7 && p.pct <= 96 && item.options.includes(p.distractor) && p.distractor !== 'gets', JSON.stringify(p));
const r0 = N.ribbon('present-simple-habits'); assert(r0.low <= r0.mean && r0.mean <= r0.high);

// 4. duel via DOM palsu minimal — tangkap handler klik dan kirim event palsu
let handler = null;
const host = { innerHTML: '', classList: { add() {} }, addEventListener: (t, fn) => { handler = fn; }, removeEventListener() {}, querySelector: () => null };
const act = (action, attrs) => handler({ target: { closest: () => ({ getAttribute: k => k === 'data-nujum-action' ? action : (attrs || {})[k] == null ? null : String((attrs || {})[k]) }) } });
N.mount(host);
let D = N.__state();
assert.strictEqual(D.phase, 'intro'); assert.strictEqual(D.items.length, 8);
assert(/nujum-start-button/.test(host.innerHTML));
act('start'); D = N.__state();
assert.strictEqual(D.phase, 'bet'); assert(/nujum-bet-pct/.test(host.innerHTML) && D.pred);
// ronde 1: jawab distraktor yang diprediksi -> mesin menang, tombol SANGGAH muncul
const it1 = D.items[0]; const wrongIdx = it1.options.indexOf(D.pred.distractor);
act('answer', { 'data-i': wrongIdx }); D = N.__state();
assert.strictEqual(D.phase, 'reveal'); assert.strictEqual(D.machine, 1); assert(/nujum-dispute-button/.test(host.innerHTML), 'sanggah tersedia');
console.log('R1 line:', D.lineId, '→', D.line.slice(0, 80));
// sanggahan: jawab 3 soal kilat semuanya benar -> label dihapus, skor dikoreksi
act('dispute'); D = N.__state(); assert.strictEqual(D.phase, 'dispute'); console.log('DS:', D.lineId);
for (let k = 0; k < 3; k++) { const di = D.dispute.items[D.dispute.i]; act('dispute-answer', { 'data-i': di.correct }); D = N.__state(); }
assert.strictEqual(D.phase, 'reveal'); assert(D.lineId.startsWith('DW-'), D.lineId); assert.strictEqual(D.machine, 0); assert.strictEqual(D.student, 1);
// ronde 2: jawab benar -> murid menang
act('next'); D = N.__state(); assert.strictEqual(D.phase, 'bet');
act('answer', { 'data-i': D.items[1].correct }); D = N.__state(); assert(D.lineId.startsWith('SW-'), D.lineId); assert.strictEqual(D.student, 2);
// ronde 3: "aku tidak tahu" -> echo redemption -> skip (tanpa mic)
act('next'); act('giveup'); D = N.__state(); assert.strictEqual(D.phase, 'echo'); assert(D.lineId.startsWith('GV-'));
act('echo-skip'); D = N.__state(); assert.strictEqual(D.lineId, 'GV-OK'); assert.strictEqual(D.phase, 'reveal');
// sisa ronde: selang-seling sampai papan
while (D.phase !== 'board') { act('next'); D = N.__state(); if (D.phase === 'bet') { act('answer', { 'data-i': D.round % 2 ? D.items[D.round].correct : (D.items[D.round].correct + 1) % 4 }); D = N.__state(); } }
assert(/nujum-board/.test(host.innerHTML) && D.lineId.startsWith('FS-'), D.lineId);
console.log('BOARD:', D.machine, 'vs', D.student, '|', D.lineId, '| broken:', D.broken.length, '| bkt lessons:', Object.keys(bkt.lessons).length);
// hero markup memakai store & BKT yang baru saja bergeser
const hero = N.heroMarkup(); assert(/nujum-hero-card/.test(hero) && /nujum-hero-last-board/.test(hero));
// LV roast: murid B1 salah di item A1 (fondasi) harus bisa memicu level_roast
const lv = N.selectScript('level_roast', { level: 'B1', item_level: 'A1', distractor: 'is getting' }); assert(lv.id.startsWith('LV-') && /B1/.test(lv.text));
console.log('OK — scripts:', N.SCRIPTS.length, '| pred:', p);
