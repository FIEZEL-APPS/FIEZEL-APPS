#!/usr/bin/env node
/**
 * tests/interactive-chat-correction-test.js
 * Ngobrol AI — saklar koreksi, ajakan koreksi, riwayat percakapan, dan kejujuran sumber balasan
 * (reports/audit-ngobrol-ai-2026-10-17.md, keputusan owner 17 Okt 2026).
 *
 * Yang dikunci:
 *  1. Koreksi MATI secara bawaan: tidak ada kartu koreksi/tips di layar walau detektor menemukan
 *     kesalahan, dan task yang dipanggil `conversation_turn`.
 *  2. Kesalahan yang menumpuk saat koreksi mati memunculkan ajakan (popup) SEKALI; ditolak = diam 24 jam.
 *  3. Koreksi HIDUP memanggil `conversation_correct` dan menampilkan versi benar dengan sorotan.
 *  4. AI menerima riwayat percakapan (teman yang ingat), bukan hanya pesan terakhir.
 *  5. Balasan dari naskah (AI gagal / jatah habis) ditandai jujur, dan sapaan fallback server
 *     tidak pernah tampil sebagai balasan teman.
 *  6. Ucapan sama yang diulang di panggilan suara tidak hilang; riwayat disimpan sekali per kursus.
 */
'use strict';
const assert = require('assert');
const path = require('path');

const store = {};
global.localStorage = {
  getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; },
  clear: () => { Object.keys(store).forEach((k) => delete store[k]); }
};
global.FiezelI18n = { getCourse: () => 'en', getLocale: () => 'id', t: (k) => k };
global.activeTargetLang = () => 'en';
global.getActiveLevel = () => 'A2';

const chat = require(path.join(__dirname, '..', 'features', 'interactive-chat', 'fiezel-interactive-chat.js'));
const tick = () => new Promise((r) => setTimeout(r, 0));

let calls = [];
let nextResult = null;
global.askFiezelAIResult = (prompt, task, ctx) => {
  calls.push({ prompt, task, ctx });
  const r = typeof nextResult === 'function' ? nextResult(task, ctx) : nextResult;
  return r instanceof Error ? Promise.reject(r) : Promise.resolve(r);
};

function aiTurn(reply, extra) {
  return { text: reply, degraded: false, transport: 'cf', turn: Object.assign({ reply, translation: 'arti: ' + reply, correction: null, correctionChecked: false, mistakeSignal: false }, extra || {}) };
}

async function send(text) {
  chat.sendMessage(text);
  await tick(); await tick();
}

(async () => {
  // Persiapan: kursus en, skenario bebas, suara otomatis mati supaya uji tidak menyentuh audio.
  chat.initScenario('free');
  const st = chat.getState();
  st.course = 'en';
  chat.resetCurrentScenario();
  st.autoVoice = false;

  console.log('--- 1. Koreksi mati secara bawaan ---');
  assert.strictEqual(st.correctionMode, false, 'koreksi wajib mati secara bawaan');
  assert.ok(/id="fzcToggleCorrection" aria-pressed="false"/.test(chat.renderMarkup()), 'saklar koreksi tampil dalam keadaan mati');
  nextResult = aiTurn('Oh nice, the beach! Which beach did you go to?', { mistakeSignal: true });
  await send('Yesterday i go to the beach');
  assert.strictEqual(calls[0].task, 'conversation_turn', 'koreksi mati = task tanpa koreksi');
  assert.strictEqual(calls[0].ctx.course, 'en');
  assert.strictEqual(calls[0].ctx.scenarioId, 'free');
  const userMsg = st.messages[st.messages.length - 2];
  assert.ok(userMsg.hint, 'detektor lokal tetap mendeteksi diam-diam');
  let html = chat.renderMarkup();
  assert.ok(!/fzc-correction/.test(html), 'tidak ada kartu koreksi/tips saat koreksi mati');
  assert.ok(!/fzc-grammar-note/.test(html), 'catatan tata bahasa disembunyikan saat koreksi mati');
  const lastAsst = st.messages[st.messages.length - 1];
  assert.strictEqual(lastAsst.text, 'Oh nice, the beach! Which beach did you go to?');
  assert.strictEqual(lastAsst.translation, 'arti: Oh nice, the beach! Which beach did you go to?', 'arti datang dari AI, bukan placeholder');
  assert.deepStrictEqual(lastAsst.suggestions, [], 'chip saran pembuka tidak ditempel ke balasan AI');
  assert.strictEqual(st.replySource, 'ai');
  console.log('✓ koreksi mati: obrolan tanpa umpan balik');

  console.log('--- 2. AI menerima riwayat percakapan ---');
  nextResult = aiTurn('Cool! Did you swim?', { mistakeSignal: true });
  await send('I swim very long time');
  const hist = calls[1].ctx.history;
  assert.ok(Array.isArray(hist) && hist.length >= 3, 'riwayat ikut terkirim');
  assert.ok(hist.some((h) => h === 'u: Yesterday i go to the beach'), 'pesan murid sebelumnya ada di riwayat');
  assert.ok(hist.some((h) => /^a: Oh nice, the beach!/.test(h)), 'balasan teman sebelumnya ada di riwayat');
  assert.ok(!hist.some((h) => h === 'u: I swim very long time'), 'pesan yang sedang dikirim tidak digandakan ke riwayat');
  assert.ok(hist.length <= 8, 'riwayat maksimal 8 giliran');
  console.log('✓ riwayat percakapan terkirim');

  console.log('--- 3. Ajakan menyalakan koreksi saat kesalahan menumpuk ---');
  assert.strictEqual(st.nudgeOpen, false, 'dua kesalahan belum cukup untuk ajakan');
  nextResult = aiTurn('Haha, me too! What else did you do?', { mistakeSignal: true });
  await send('He like ice cream so much');
  assert.strictEqual(st.nudgeOpen, true, 'tiga kesalahan dari lima giliran terakhir = ajakan muncul');
  html = chat.renderMarkup();
  assert.ok(/role="dialog" aria-modal="true"/.test(html) && /fzcNudgeOn/.test(html) && /fzcNudgeLater/.test(html), 'popup ajakan berupa dialog dengan dua pilihan');
  console.log('✓ ajakan muncul');

  console.log('--- 4. Menyalakan koreksi ---');
  chat.setCorrectionMode(true);
  assert.strictEqual(st.correctionMode, true);
  assert.strictEqual(st.nudgeOpen, false, 'ajakan tertutup setelah koreksi dinyalakan');
  assert.ok(!/fzc-correction/.test(chat.renderMarkup()), 'pesan lama (dikirim saat koreksi mati) tetap tanpa umpan balik');
  nextResult = aiTurn('Nice! Which flavor?', {
    correction: { corrected: 'She likes chocolate.', note: 'Sesudah she, kata kerja pakai s.' },
    correctionChecked: true, mistakeSignal: true
  });
  await send('She like chocolate.');
  assert.strictEqual(calls[calls.length - 1].task, 'conversation_correct', 'koreksi hidup = task koreksi');
  html = chat.renderMarkup();
  assert.ok(/class="fzc-correction"/.test(html), 'kartu koreksi tampil');
  assert.ok(/<mark class="fzc-fix-mark">likes<\/mark>/.test(html), 'bagian yang diperbaiki disorot');
  assert.ok(/Sesudah she, kata kerja pakai s\./.test(html), 'alasan koreksi tampil');
  nextResult = aiTurn('Great choice! Do you like vanilla too?', { correctionChecked: true, mistakeSignal: false });
  await send('I like chocolate a lot.');
  assert.ok(/fzc-correction-ok/.test(chat.renderMarkup()), 'kalimat benar mendapat tanda "sudah pas"');
  console.log('✓ koreksi hidup: versi benar + sorotan + alasan');

  console.log('--- 5. Kejujuran sumber balasan ---');
  nextResult = { text: 'Mode hemat', degraded: true };
  await send('Do you like pizza?');
  assert.strictEqual(st.replySource, 'offline', 'balasan degradasi = naskah offline');
  assert.ok(/fzc-source-note/.test(chat.renderMarkup()), 'penanda mode hemat tampil');
  const quotaErr = new Error('quota'); quotaErr.code = 'quota_exhausted';
  nextResult = quotaErr;
  await send('Tell me more');
  assert.strictEqual(st.replySource, 'quota', 'jatah habis ditandai sebagai kuota');
  nextResult = { text: 'Halo! Saya PAW, asisten belajar FIEZEL.', degraded: false, transport: 'puter' };
  await send('What do you think?');
  assert.notStrictEqual(st.messages[st.messages.length - 1].text, 'Halo! Saya PAW, asisten belajar FIEZEL.', 'sapaan fallback server tidak tampil sebagai balasan teman');
  assert.strictEqual(st.replySource, 'offline');
  nextResult = { text: 'REPLY: Sure, I love it!\nMEANING: Tentu, aku suka!\nCHECK: OK', degraded: false, transport: 'puter' };
  await send('Do you like music?');
  const puterMsg = st.messages[st.messages.length - 1];
  assert.strictEqual(puterMsg.text, 'Sure, I love it!', 'jalur Puter: format bertag diurai');
  assert.strictEqual(puterMsg.translation, 'Tentu, aku suka!');
  assert.strictEqual(st.messages[st.messages.length - 2].correction, null, 'jalur Puter tidak pernah membawa koreksi (model tak dikenal)');
  console.log('✓ sumber balasan jujur');

  console.log('--- 6. Ajakan yang ditolak diam 24 jam ---');
  st.correctionMode = false;
  st.nudgeDismissedAt = Date.now();
  const mistakes = [1, 2, 3, 4, 5].map((i) => ({ role: 'user', text: 'x' + i, mistakeSignal: true }));
  assert.strictEqual(chat.shouldNudgeCorrection(mistakes, Date.now() + 1000), false, 'ditolak baru saja = tidak muncul lagi');
  assert.strictEqual(chat.shouldNudgeCorrection(mistakes, Date.now() + 25 * 3600 * 1000), true, 'sesudah 24 jam boleh muncul lagi');
  assert.strictEqual(chat.shouldNudgeCorrection(mistakes.slice(0, 2), Date.now() + 25 * 3600 * 1000), false, 'kurang dari tiga giliran = tidak muncul');
  console.log('✓ jeda ajakan dihormati');

  console.log('--- 7. Panggilan suara & penyimpanan ---');
  const before = st.messages.length;
  chat.syncVoiceCallTurns([
    { userText: 'Yes', reply: { text: 'Great!' }, timestamp: 1001 },
    { userText: 'Yes', reply: { text: 'Awesome!' }, timestamp: 1002 }
  ], 'free');
  assert.strictEqual(st.messages.length, before + 4, 'ucapan sama di dua giliran tetap dua giliran');
  chat.syncVoiceCallTurns([{ userText: 'Yes', reply: { text: 'Great!' }, timestamp: 1001 }], 'free');
  assert.strictEqual(st.messages.length, before + 4, 'giliran yang sama tidak disalin dua kali');
  const saved = JSON.parse(store['fiezel-interactive-chat-v1']);
  assert.ok(Object.keys(saved.scenarioHistories).every((k) => /^(ja|en)_/.test(k)), 'riwayat disimpan sekali, di kunci berawalan kursus');
  assert.strictEqual(saved.correctionMode, false, 'pilihan koreksi tersimpan');
  console.log('✓ panggilan suara & penyimpanan');

  console.log('--- 8. Sorotan perbedaan ---');
  const diffEn = chat.diffMarkup('Yesterday i go to beach', 'Yesterday I went to the beach', 'en');
  assert.ok(/<mark class="fzc-fix-mark">went<\/mark>/.test(diffEn) && /<mark class="fzc-fix-mark">the<\/mark>/.test(diffEn), diffEn);
  assert.ok(!/<mark class="fzc-fix-mark">I<\/mark>/.test(diffEn), 'beda huruf besar saja tidak disorot');
  const diffJa = chat.diffMarkup('わたしわ学生です', 'わたしは学生です', 'ja');
  assert.ok(/<mark class="fzc-fix-mark">は<\/mark>/.test(diffJa), diffJa);
  assert.ok(!/<script/.test(chat.diffMarkup('a', '<script>x</script>', 'en')), 'koreksi di-escape');
  console.log('✓ sorotan perbedaan');

  console.log('ALL INTERACTIVE CHAT CORRECTION TESTS PASSED (8/8).');
})().catch((e) => { console.error(e); process.exit(1); });
